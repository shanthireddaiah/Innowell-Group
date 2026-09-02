# pyrefly: ignore [missing-import]
import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth, ai_agent, agentic_services

router = APIRouter(prefix="/api/chatbot", tags=["Innowell Chatbot"])

# Helper to generate dynamic upcoming date examples for chatbot prompts
def get_dynamic_date_examples() -> tuple[str, str, str, str]:
    today = datetime.now().date()
    
    # Calculate upcoming weekday start date example
    if today.weekday() == 5: # Saturday
        start_dt = today + timedelta(days=2) # Monday
    elif today.weekday() == 6: # Sunday
        start_dt = today + timedelta(days=1) # Monday
    else:
        # Weekday: pick next weekday (or next Monday if today is Friday)
        if today.weekday() == 4: # Friday
            start_dt = today + timedelta(days=3) # Monday
        else:
            start_dt = today + timedelta(days=1)
            
    # Calculate end date example (2 days after start date, ensuring weekday)
    end_dt = start_dt + timedelta(days=2)
    if end_dt.weekday() == 5: # Saturday -> move to Monday
        end_dt += timedelta(days=2)
    elif end_dt.weekday() == 6: # Sunday -> move to Monday
        end_dt += timedelta(days=1)

    start_str = start_dt.strftime("%B %d").replace(" 0", " ")
    end_str = end_dt.strftime("%B %d").replace(" 0", " ")
    single_date_str = start_dt.strftime("%B %d").replace(" 0", " ")
    today_str = today.strftime("%B %d").replace(" 0", " ")
    
    return start_str, end_str, single_date_str, today_str


# Date Parser Helper for IST / Asia/Kolkata
def parse_natural_dates(text: str) -> Dict[str, Optional[str]]:
    msg = text.lower()
    today = datetime.now().date()
    
    start_dt = None
    end_dt = None

    # Strip time phrases so "3:00 PM" or "11 am" are not mistaken for day numbers
    clean_msg = re.sub(r'\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b', '', msg)
    clean_msg = re.sub(r'\b\d{1,2}:\d{2}\b', '', clean_msg)

    # 1. First check explicit ISO or standard date formats (e.g. 2026-08-24 or 24/08/2026 or 24-08-2026)
    iso_match = re.search(r'\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b', clean_msg)
    if iso_match:
        try:
            start_dt = date(int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3)))
            end_dt = start_dt
        except Exception:
            pass

    dmy_match = re.search(r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b', clean_msg)
    if not start_dt and dmy_match:
        try:
            p1, p2, yr = int(dmy_match.group(1)), int(dmy_match.group(2)), int(dmy_match.group(3))
            start_dt = date(yr, p2, p1)
            end_dt = start_dt
        except Exception:
            pass

    # Normalize ordinal number suffixes: e.g. "23th", "23rd", "24th", "1st", "2nd", "3rd" -> "23", "24", "1"
    clean_msg = re.sub(r'\b(\d{1,2})(?:st|nd|rd|th)\b', r'\1', clean_msg)

    # Determine month number from message text
    month_num = today.month
    has_explicit_month = False
    months_map = {
        "january": 1, "jan": 1,
        "february": 2, "feb": 2,
        "march": 3, "mar": 3,
        "april": 4, "apr": 4,
        "may": 5,
        "june": 6, "jun": 6,
        "july": 7, "jul": 7,
        "august": 8, "aug": 8,
        "september": 9, "sep": 9, "sept": 9,
        "october": 10, "oct": 10,
        "november": 11, "nov": 11,
        "december": 12, "dec": 12
    }
    for m_str, m_val in months_map.items():
        if re.search(r'\b' + m_str + r'\b', clean_msg):
            month_num = m_val
            has_explicit_month = True
            break

    target_year = today.year
    if has_explicit_month and month_num < today.month:
        target_year = today.year + 1

    if "2 saturday" in clean_msg or "2nd saturday" in clean_msg or "second saturday" in clean_msg:
        for d in range(8, 15):
            try:
                test_dt = date(target_year, month_num, d)
                if test_dt.weekday() == 5:
                    start_dt = test_dt
                    end_dt = test_dt
                    break
            except Exception:
                pass
    elif "4 saturday" in clean_msg or "4th saturday" in clean_msg or "fourth saturday" in clean_msg:
        for d in range(22, 29):
            try:
                test_dt = date(target_year, month_num, d)
                if test_dt.weekday() == 5:
                    start_dt = test_dt
                    end_dt = test_dt
                    break
            except Exception:
                pass

    # Extract day numbers from message text (e.g. "24 to 26" or "August 24 to August 26")
    if not start_dt:
        nums = [int(n) for n in re.findall(r'\b\d{1,2}\b', clean_msg) if 1 <= int(n) <= 31]
        if len(nums) >= 2:
            d1, d2 = nums[0], nums[1]
            try:
                start_dt = date(target_year, month_num, d1)
                end_dt = date(target_year, month_num, d2)
            except Exception:
                pass
        elif len(nums) == 1:
            d1 = nums[0]
            try:
                start_dt = date(target_year, month_num, d1)
                end_dt = start_dt
            except Exception:
                pass

    if not start_dt:
        if "day after tomorrow" in clean_msg:
            start_dt = today + timedelta(days=2)
            end_dt = start_dt
        elif "tomorrow" in clean_msg:
            start_dt = today + timedelta(days=1)
            end_dt = start_dt
        elif "today" in clean_msg:
            start_dt = today
            end_dt = today
        else:
            weekdays_map = {
                "monday": 0, "mon": 0,
                "tuesday": 1, "tue": 1, "tues": 1,
                "wednesday": 2, "wed": 2,
                "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
                "friday": 4, "fri": 4,
                "saturday": 5, "sat": 5,
                "sunday": 6, "sun": 6
            }
            for w_name, w_idx in weekdays_map.items():
                if re.search(r'\b' + w_name + r'\b', clean_msg):
                    days_ahead = (w_idx - today.weekday()) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                    if "next" in clean_msg:
                        if today.weekday() != w_idx:
                            days_ahead += 7
                    start_dt = today + timedelta(days=days_ahead)
                    end_dt = start_dt
                    break

    # Check number of days phrase (e.g. "for 3 days")
    days_match = re.search(r'for\s*(\d+)\s*days?', clean_msg)
    if days_match and start_dt:
        dur = int(days_match.group(1))
        end_dt = start_dt + timedelta(days=dur - 1)

    return {
        "start_date": str(start_dt) if start_dt else None,
        "end_date": str(end_dt) if end_dt else None
    }


@router.post("/message")
def chat_with_assistant(
    payload: schemas.ChatRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    msg_raw = payload.message.strip()
    msg_lower = msg_raw.lower()
    clean_msg = msg_lower.strip(" .!?")
    conv_state = payload.state or {}
    action_confirmed = payload.action_confirmed or False

    # Check for logout / signout request
    if clean_msg in ["logout", "log out", "logoug", "signout", "sign out", "exit", "log off", "logoff", "disconnect"]:
        return {
            "response": f"Goodbye {current_user.name}! Logging you out of the Innowell HRMS Portal now...",
            "intent": "logout",
            "logout": True,
            "state": {}
        }

    # Check for cancellation
    if msg_lower in ["cancel", "stop", "reset", "abort", "start over"]:
        return {
            "response": "Current operation cancelled. How else can I assist you today?",
            "intent": "general_qa",
            "state": {}
        }

    # ---------------------------------------------------------------
    # INTENT CLASSIFICATION & MACHINE
    # ---------------------------------------------------------------
    fresh_intent = None

    # Only evaluate fresh_intent if the user is NOT confirming an active confirmation card
    if not action_confirmed:
        if ("leave balance" in msg_lower) or ("leaves do i have" in msg_lower) or ("how many leaves" in msg_lower) or ("leave quota" in msg_lower) or ("my leave balance" in msg_lower):
            fresh_intent = "leave_balance"
        elif ("my tickets" in msg_lower) or ("show my tickets" in msg_lower) or ("where is my ticket" in msg_lower) or ("check my tickets" in msg_lower) or ("check my it requests" in msg_lower):
            fresh_intent = "get_tickets"
        elif ("cancel my leave" in msg_lower) or ("cancel leave request" in msg_lower):
            fresh_intent = "cancel_leave"
        elif ("attendance" in msg_lower) or ("check in" in msg_lower) or ("check-in" in msg_lower) or ("working hours" in msg_lower):
            fresh_intent = "get_attendance"
        elif ("payslip" in msg_lower) or ("salary" in msg_lower) or ("pay slip" in msg_lower) or ("download payslip" in msg_lower):
            fresh_intent = "get_payslip"
        elif ("holiday" in msg_lower) or ("holidays" in msg_lower) or ("public holidays" in msg_lower) or ("festival" in msg_lower and "day" in msg_lower) or ("diwali" in msg_lower) or ("onam" in msg_lower) or ("dussehra" in msg_lower) or ("eid" in msg_lower) or ("gandhi jayanti" in msg_lower) or ("is august 15 a holiday" in msg_lower):
            fresh_intent = "get_holidays"
        elif ("schedule a meeting" in msg_lower) or ("schedule meeting" in msg_lower) or ("book meeting" in msg_lower):
            fresh_intent = "schedule_meeting"
        elif clean_msg in ["raise ticket", "support ticket", "i want to raise a ticket", "i want to raise a support ticket", "i want to raise ticket", "raise it ticket", "create support ticket"] or (clean_msg in ["create ticket", "create"] and not conv_state.get("slots", {}).get("description")):
            fresh_intent = "create_ticket"
        elif ("leave" in msg_lower) and not ("leave balance" in msg_lower or "cancel" in msg_lower or "balances" in msg_lower or "how many leaves" in msg_lower or "leaves do i have" in msg_lower):
            fresh_intent = "apply_leave"

    # If a fresh intent is triggered and action is not confirmed, override active state
    if fresh_intent:
        current_intent = fresh_intent
        conv_state = {"intent": fresh_intent, "slots": {}}
    else:
        current_intent = conv_state.get("intent")

    # ===============================================================
    # 1. READ-ONLY INTENT HANDLERS (Execute immediately)
    # ===============================================================

    # --- Leave Balance ---
    if current_intent == "leave_balance":
        balances = agentic_services.get_leave_balances_tool(db, current_user.id)
        return {
            "response": f"Here is your current live leave balance, {current_user.name} (General & Sick leaves accrue at 1 leave per month, 12 days/year total):",
            "intent": "leave_balance",
            "state": {},
            "data_type": "leave_balance",
            "data": balances
        }

    # --- Get Tickets ---
    if current_intent == "get_tickets":
        tickets = agentic_services.get_tickets_tool(db, current_user.id)
        if not tickets:
            return {
                "response": "You currently have no active or historical support tickets.",
                "intent": "get_tickets",
                "state": {}
            }
        return {
            "response": f"Here are your raised support tickets ({len(tickets)} total):",
            "intent": "get_tickets",
            "state": {},
            "data_type": "tickets_list",
            "data": tickets
        }

    # --- Attendance ---
    if current_intent == "get_attendance":
        att_data = agentic_services.get_attendance_tool(db, current_user.id)
        return {
            "response": f"Here is your recent attendance log, {current_user.name}:",
            "intent": "get_attendance",
            "state": {},
            "data_type": "attendance",
            "data": att_data
        }

    # --- Payslip ---
    if current_intent == "get_payslip":
        ps_data = agentic_services.get_payslip_tool(db, current_user.id)
        return {
            "response": f"Here is your latest salary payslip breakdown ({ps_data['pay_period']}):",
            "intent": "get_payslip",
            "state": {},
            "data_type": "payslip",
            "data": ps_data
        }

    # --- Holidays ---
    if current_intent == "get_holidays":
        is_upcoming_query = ("upcoming" in msg_lower) or ("next" in msg_lower) or ("sep" in msg_lower) or ("september" in msg_lower) or ("future" in msg_lower)
        hols = agentic_services.get_holidays_tool(db, upcoming_only=False)
        upcoming_count = len([h for h in hols if h.get("is_upcoming")])
        return {
            "response": f"Here is the official Indian Government Gazetted & Festival Holiday Calendar ({upcoming_count} upcoming holidays from September 2nd onwards):",
            "intent": "get_holidays",
            "state": {},
            "data_type": "holidays",
            "data": hols
        }

    # ===============================================================
    # 2. DATA MUTATION AGENTS WITH STEP-BY-STEP & CONFIRMATION CARDS
    # ===============================================================

    # --- A. LEAVE APPLICATION AGENT ---
    if current_intent == "apply_leave":
        slots = conv_state.get("slots", {})

        # Extract slots from natural language
        if not slots.get("leave_type"):
            if "general" in msg_lower or " gl" in msg_lower or msg_lower == "gl":
                slots["leave_type"] = "General Leave"
            elif "sick" in msg_lower or " sl" in msg_lower or msg_lower == "sl":
                slots["leave_type"] = "Sick Leave"
            elif "maternity" in msg_lower or " ml" in msg_lower:
                slots["leave_type"] = "Maternity Leave"
            elif "without pay" in msg_lower or "lwp" in msg_lower:
                slots["leave_type"] = "Leave Without Pay"

        # Dates extraction
        parsed_dates = parse_natural_dates(msg_raw)
        if parsed_dates["start_date"]:
            slots["start_date"] = parsed_dates["start_date"]
        if parsed_dates["end_date"]:
            slots["end_date"] = parsed_dates["end_date"]

        # STEP 0: Check immediately if requested date(s) are already holidays!
        if slots.get("start_date") and slots.get("end_date"):
            try:
                s_dt = datetime.strptime(slots["start_date"], "%Y-%m-%d").date()
                e_dt = datetime.strptime(slots["end_date"], "%Y-%m-%d").date()
                cur_d = s_dt
                all_hols = True
                first_hol_name = None
                while cur_d <= e_dt:
                    is_h, h_name = agentic_services.check_if_date_is_holiday(cur_d, db)
                    if is_h:
                        if not first_hol_name:
                            first_hol_name = h_name
                    else:
                        all_hols = False
                    cur_d += timedelta(days=1)

                if all_hols:
                    date_disp = s_dt.strftime("%B %d, %Y") if s_dt == e_dt else f"{s_dt.strftime('%B %d')} to {e_dt.strftime('%B %d, %Y')}"
                    holiday_msg = f"🎉 Woohoo! {date_disp} is already an official holiday ({first_hol_name})! 🏖️ No need to spend your leave quota on a day off — relax and enjoy your weekend! 😎✨"
                    return {
                        "response": holiday_msg,
                        "intent": "general_qa",
                        "state": {},
                        "error_card": {
                            "title": "Date is Already an Official Holiday",
                            "details": holiday_msg
                        }
                    }
            except Exception:
                pass

        # Reason extraction
        if not slots.get("reason"):
            if "personal" in msg_lower:
                slots["reason"] = "Personal work"
            elif "family" in msg_lower or "function" in msg_lower:
                slots["reason"] = "Family function"
            elif "medical" in msg_lower or "health" in msg_lower or "fever" in msg_lower or "doctor" in msg_lower:
                slots["reason"] = "Medical / Health reasons"
            elif "vacation" in msg_lower or "travel" in msg_lower:
                slots["reason"] = "Vacation / Travel"
            elif slots.get("leave_type") and slots.get("start_date") and slots.get("end_date") and not parsed_dates.get("start_date"):
                slots["reason"] = msg_raw

        # STEP 1: Ask Leave Type if missing
        if not slots.get("leave_type"):
            balances = agentic_services.get_leave_balances_tool(db, current_user.id)
            options = []
            for b in balances:
                options.append({
                    "label": f"{b['name']} ({b['code']})",
                    "value": b["name"],
                    "balance": f"{b['remaining_days']} days available"
                })
            return {
                "response": "Sure! Which type of leave would you like to apply for?",
                "intent": "apply_leave",
                "state": {"intent": "apply_leave", "slots": slots},
                "options_type": "leave_types",
                "options": options
            }

        # STEP 2: Ask Dates if missing
        if not slots.get("start_date") or not slots.get("end_date"):
            ex_start, ex_end, _, _ = get_dynamic_date_examples()
            return {
                "response": f"Got it, **{slots['leave_type']}**. Please specify your upcoming start and end dates (e.g. '{ex_start} to {ex_end}' or 'Tomorrow').",
                "intent": "apply_leave",
                "state": {"intent": "apply_leave", "slots": slots}
            }

        # STEP 2b: Immediately check if requested date(s) are already holidays!
        if slots.get("start_date") and slots.get("end_date"):
            try:
                s_dt = datetime.strptime(slots["start_date"], "%Y-%m-%d").date()
                e_dt = datetime.strptime(slots["end_date"], "%Y-%m-%d").date()
                cur_d = s_dt
                all_hols = True
                first_hol_name = None
                while cur_d <= e_dt:
                    is_h, h_name = agentic_services.check_if_date_is_holiday(cur_d, db)
                    if is_h:
                        if not first_hol_name:
                            first_hol_name = h_name
                    else:
                        all_hols = False
                    cur_d += timedelta(days=1)

                if all_hols:
                    date_disp = s_dt.strftime("%B %d, %Y") if s_dt == e_dt else f"{s_dt.strftime('%B %d')} to {e_dt.strftime('%B %d, %Y')}"
                    holiday_msg = f"🎉 Woohoo! {date_disp} is already an official holiday ({first_hol_name})! 🏖️ No need to spend your leave quota on a day off — relax and enjoy your weekend! 😎✨"
                    return {
                        "response": holiday_msg,
                        "intent": "general_qa",
                        "state": {},
                        "error_card": {
                            "title": "Date is Already an Official Holiday",
                            "details": holiday_msg
                        }
                    }
            except Exception:
                pass

        # STEP 3: Ask Reason if missing
        if not slots.get("reason"):
            return {
                "response": f"Noted: **{slots['leave_type']}** from **{slots['start_date']}** to **{slots['end_date']}**. What is the reason for your leave request?",
                "intent": "apply_leave",
                "state": {"intent": "apply_leave", "slots": slots}
            }

        # STEP 4: All slots collected -> Validate
        val_res = agentic_services.validate_leave_request_tool(
            db,
            user_id=current_user.id,
            leave_type_identifier=slots["leave_type"],
            start_date_str=slots["start_date"],
            end_date_str=slots["end_date"],
            reason=slots["reason"]
        )

        if not val_res["valid"]:
            return {
                "response": f"⚠️ **Validation Failed:** {val_res['error']}",
                "intent": "apply_leave",
                "state": {"intent": "apply_leave", "slots": slots},
                "error_card": {
                    "title": "Leave Request Notice",
                    "details": val_res["error"]
                }
            }

        # STEP 5: If confirmed by user -> Execute DB creation!
        if action_confirmed or msg_lower in ["confirm", "confirm & apply leave", "confirm & apply", "yes"]:
            created_res = agentic_services.create_leave_request_tool(
                db,
                user_id=current_user.id,
                validated_data=val_res
            )
            return {
                "response": f"✓ **Leave Request Submitted Successfully!**\n\nRequest ID: `{created_res['request_code']}` has been logged and sent to your manager for approval.",
                "intent": "general_qa",
                "state": {},
                "success_card": {
                    "title": "Leave Applied Successfully",
                    "request_code": created_res["request_code"],
                    "leave_type": created_res["leave_type_name"],
                    "dates": f"{created_res['start_date']} – {created_res['end_date']}",
                    "days": f"{created_res['days_requested']} days",
                    "status": "Pending Approval",
                    "remaining_balance": f"{created_res['remaining_balance']} days"
                }
            }

        # STEP 6: Show Confirmation Card
        s_dt_obj = datetime.strptime(slots["start_date"], "%Y-%m-%d")
        e_dt_obj = datetime.strptime(slots["end_date"], "%Y-%m-%d")
        num_days = (e_dt_obj - s_dt_obj).days + 1

        return {
            "response": "Please review and confirm your leave application details below:",
            "intent": "apply_leave",
            "state": {"intent": "apply_leave", "slots": slots},
            "confirmation_card": {
                "title": "Confirm Leave Application",
                "action_type": "apply_leave",
                "fields": [
                    {"label": "Leave Type", "value": val_res["leave_type_name"]},
                    {"label": "From", "value": s_dt_obj.strftime("%b %d, %Y")},
                    {"label": "To", "value": e_dt_obj.strftime("%b %d, %Y")},
                    {"label": "Duration", "value": f"{num_days} day(s)"},
                    {"label": "Reason", "value": slots["reason"]}
                ],
                "confirm_button": "Confirm & Apply Leave",
                "cancel_button": "Change Details"
            }
        }

    # --- B. TICKET CREATION AGENT ---
    if current_intent == "create_ticket":
        slots = conv_state.get("slots", {})

        # Generic ticket trigger phrases that are NOT specific issue descriptions
        generic_triggers = [
            "raise ticket", "create ticket", "i want to raise a ticket", "i want to raise a support ticket",
            "raise it ticket", "support ticket", "ticket", "raise a ticket", "log a ticket", "i want to raise ticket",
            "log support ticket", "help desk ticket", "open ticket", "create support ticket", "support"
        ]

        clean_msg = msg_lower.strip(" .!?")

        # Handle 'change details' request
        if clean_msg in ["change details", "change detail", "change", "edit"]:
            slots["description"] = None
            slots["attachment_prompted"] = False
            slots["attachment_url"] = None
            slots["attachment_name"] = None

        # Check if attachment is passed in payload
        if payload.attachment_url:
            slots["attachment_url"] = payload.attachment_url
            slots["attachment_name"] = payload.attachment_name or "attachment.png"
            slots["attachment_prompted"] = True

        # Handle Skip Attachment or user responses to attachment prompt
        skip_attachment_triggers = [
            "skip", "skip attachment", "skip screenshot", "no", "no attachment",
            "skip it", "without attachment", "none", "without screenshot", "continue", "proceed", "no thanks"
        ]
        if clean_msg in skip_attachment_triggers or msg_raw.strip() == "Skip Attachment":
            slots["attachment_prompted"] = True
            slots["attachment_url"] = None
            slots["attachment_name"] = None

        # Update description if clean_msg is NOT a generic trigger phrase and not a change request and not a skip command
        if clean_msg not in generic_triggers and clean_msg not in ["change details", "change detail", "change", "edit"] and clean_msg not in skip_attachment_triggers and not slots.get("description"):
            raw_input = msg_raw
            # Detect category automatically via AI Triage
            triage_res = ai_agent.triage_ticket_description(raw_input, current_user.name)
            slots["category"] = triage_res.get("category", "IT Support")

            # Auto-draft formal statement using Gemini AI
            if not raw_input.lower().startswith("hi ") and len(raw_input.split()) <= 15:
                slots["description"] = ai_agent.draft_formal_ticket_statement_ai(raw_input, current_user.name, slots["category"])
            else:
                slots["description"] = raw_input

        # STEP 1: If description is missing -> Ask user to describe issue
        if not slots.get("description"):
            return {
                "response": "I can help you log a support ticket for any workplace issue (e.g. 'laptop issue', 'login issue', 'password forgot', 'project assigned issue', 'payment issue', 'leave issue', or 'WiFi disconnecting'). Please describe the issue you are facing:",
                "intent": "create_ticket",
                "state": {"intent": "create_ticket", "slots": slots}
            }

        # Ensure category & severity are populated
        triage_res = ai_agent.triage_ticket_description(slots["description"], current_user.name)
        if not slots.get("category"):
            slots["category"] = triage_res.get("category", "IT Support")

        # Set internal severity quietly without prompting or mentioning to user
        slots["priority"] = triage_res.get("severity", "medium").capitalize()

        # STEP 2: Ask for optional Screenshot / Document (PNG, JPG, PDF) if not yet prompted or handled
        if not slots.get("attachment_prompted"):
            return {
                "response": f"I have analyzed your issue under **{slots['category']}**.\n\nWould you like to attach an optional **screenshot or document (PDF or PNG/JPG format)** for technical reference?",
                "intent": "create_ticket",
                "state": {"intent": "create_ticket", "slots": {**slots, "attachment_prompted": True}},
                "attachment_request": {
                    "title": "Optional Attachment (PDF or PNG)",
                    "formats": ["PNG", "JPG", "JPEG", "PDF"],
                    "skip_label": "Skip Attachment",
                    "continue_label": "Attach & Proceed"
                },
                "options": [
                    {"label": "Skip Attachment", "value": "Skip Attachment"}
                ]
            }

        # STEP 3: Execute DB creation if confirmed
        if action_confirmed or msg_lower in ["confirm", "create ticket", "yes", "create", "confirm ticket", "confirm & create ticket"]:
            t_res = agentic_services.create_ticket_tool(
                db,
                user_id=current_user.id,
                description=slots["description"],
                category=slots["category"],
                severity_str=slots["priority"],
                attachment_url=slots.get("attachment_url"),
                attachment_name=slots.get("attachment_name")
            )
            extra_msg = ""
            if "password" in slots["description"].lower() or "login" in slots["description"].lower():
                extra_msg = "\n\n💡 *Tip: You can also reset your password directly via the 'Forgot Password' link on the Login screen.*"

            att_info = f"\n📎 **Attachment:** {slots.get('attachment_name')}" if slots.get("attachment_name") else ""

            return {
                "response": f"✓ **Support Ticket Created Successfully!**\n\nTicket ID: `{t_res['ticket_code']}` has been logged and assigned to the support team.{att_info}{extra_msg}",
                "intent": "general_qa",
                "state": {},
                "success_card": {
                    "title": "Ticket Created Successfully",
                    "ticket_code": t_res["ticket_code"],
                    "category": t_res["category"],
                    "issue": slots["description"],
                    "attachment": slots.get("attachment_name") or "None",
                    "attachment_url": slots.get("attachment_url"),
                    "status": "Open",
                    "ai_explanation": t_res["ai_explanation"]
                }
            }

        # STEP 4: Present Confirmation Card with attachment status
        att_display_value = slots.get("attachment_name") if slots.get("attachment_name") else "None (Skipped)"

        return {
            "response": f"I have prepared your support ticket under **{slots['category']}**.\n\n**AI Diagnosis & Triage:** {triage_res.get('ai_explanation', '')}\n\nPlease review and confirm your support ticket below:",
            "intent": "create_ticket",
            "state": {"intent": "create_ticket", "slots": slots},
            "confirmation_card": {
                "title": "Confirm Support Ticket",
                "action_type": "create_ticket",
                "fields": [
                    {"label": "Category", "value": slots["category"]},
                    {"label": "Issue Description", "value": slots["description"]},
                    {"label": "Attachment", "value": att_display_value}
                ],
                "confirm_button": "Create Ticket",
                "cancel_button": "Change Details"
            }
        }

    # --- C. MEETING SCHEDULER AGENT ---
    if current_intent == "schedule_meeting":
        slots = conv_state.get("slots", {})

        # Extract attendee name if present in user message
        if not slots.get("attendee_name"):
            m_with = re.search(r'with\s+([a-zA-Z]+)', msg_lower)
            if m_with:
                slots["attendee_name"] = m_with.group(1).capitalize()
            else:
                for word in ["shanthi", "kannan", "janani", "leninkumar", "priya", "ravi", "teja", "suchi", "admin", "hr", "manager"]:
                    if word in msg_lower:
                        slots["attendee_name"] = word.capitalize()
                        break

        # STEP 1: Ask attendee name if missing
        if not slots.get("attendee_name"):
            return {
                "response": "I can help you schedule a Teams meeting. Who would you like to meet with? (e.g. 'Shanthi', 'Kannan', 'Janani', 'Leninkumar', 'Priya', 'Ravi', 'Teja', or 'Suchi').",
                "intent": "schedule_meeting",
                "state": {"intent": "schedule_meeting", "slots": slots}
            }

        # Search employee database if full name/email not resolved
        if not slots.get("attendee_email"):
            emp_results = agentic_services.search_employee_tool(db, slots["attendee_name"])
            if not emp_results:
                return {
                    "response": f"Could not find any colleague matching '{slots['attendee_name']}'. Please enter another colleague's name.",
                    "intent": "schedule_meeting",
                    "state": {"intent": "schedule_meeting", "slots": {}}
                }
            sel_emp = emp_results[0]
            slots["attendee_email"] = sel_emp["email"]
            slots["attendee_full_name"] = sel_emp["name"]
            slots["attendee_id"] = sel_emp.get("id")

        # Extract Date if present
        parsed_d = parse_natural_dates(msg_raw)
        if not slots.get("date"):
            if parsed_d.get("start_date"):
                slots["date"] = parsed_d["start_date"]

        # STEP 2: Ask Date if missing
        if not slots.get("date"):
            ex_start, _, _, _ = get_dynamic_date_examples()
            return {
                "response": f"Got it, meeting with **{slots['attendee_full_name']}**. Which upcoming date would you like to schedule the meeting for? (e.g. 'Tomorrow', '{ex_start}', or 'Next Monday').",
                "intent": "schedule_meeting",
                "state": {"intent": "schedule_meeting", "slots": slots}
            }

        # Extract Time if present (e.g. "3:00 PM", "3pm", "11:00 AM", "14:00", "2 pm")
        if not slots.get("start_time"):
            m_time = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)', msg_lower) or re.search(r'(\d{1,2}):(\d{2})', msg_lower)
            if m_time:
                hrs = int(m_time.group(1))
                mins = m_time.group(2) if (len(m_time.groups()) >= 2 and m_time.group(2)) else "00"
                ampm = (m_time.group(3) if (len(m_time.groups()) >= 3 and m_time.group(3)) else "").upper()
                if not ampm and hrs < 8: ampm = "PM"
                elif not ampm and hrs >= 8 and hrs <= 12: ampm = "AM"
                slots["start_time"] = f"{hrs:02d}:{mins} {ampm}".strip()
            elif slots.get("date") and not slots.get("start_time"):
                m_simple = re.search(r'\b(\d{1,2})\b', msg_lower)
                if m_simple and not parsed_d.get("start_date"):
                    hrs = int(m_simple.group(1))
                    ampm = "PM" if hrs < 8 else "AM"
                    slots["start_time"] = f"{hrs:02d}:00 {ampm}"

        # STEP 3: Ask Time if missing
        if not slots.get("start_time"):
            return {
                "response": f"Noted for **{slots['date']}**. What time would you like to hold the meeting? (e.g. '03:00 PM' or '11:00 AM').",
                "intent": "schedule_meeting",
                "state": {"intent": "schedule_meeting", "slots": slots}
            }

        # Extract Subject if present
        if not slots.get("subject"):
            if not any(k in msg_lower for k in ["tomorrow", "today", "monday", "friday", "august", "sep", "oct", "pm", "am", "with"]) and len(msg_raw.split()) > 0:
                slots["subject"] = msg_raw

        # STEP 4: Ask Subject if missing
        if not slots.get("subject"):
            return {
                "response": f"Got it: **{slots['start_time']} on {slots['date']}**. What is the subject or purpose of this meeting?",
                "intent": "schedule_meeting",
                "state": {"intent": "schedule_meeting", "slots": slots}
            }

        # STEP 5: Confirm & Book
        if action_confirmed or msg_lower in ["confirm", "confirm meeting", "confirm & book teams meeting", "yes"]:
            mtg = models.Meeting(
                title=slots["subject"],
                subject=slots["subject"],
                parsed_datetime=datetime.now(),
                organizer_id=current_user.id,
                attendee_id=slots.get("attendee_id"),
                attendee_email=slots["attendee_email"],
                date=datetime.strptime(slots["date"], "%Y-%m-%d").date(),
                start_time=slots["start_time"],
                end_time="03:30 PM",
                duration_minutes=30,
                status="scheduled",
                teams_join_url=f"https://teams.microsoft.com/l/meetup-join/innowell-meeting-{current_user.id}"
            )
            db.add(mtg)
            db.commit()

            creds = agentic_services.generate_teams_credentials(mtg.id) if hasattr(agentic_services, 'generate_teams_credentials') else {"meeting_id_code": f"248 {((mtg.id or 1) * 314 + 100) % 800 + 100} {((mtg.id or 1) * 527 + 200) % 800 + 100} {((mtg.id or 1) * 819 + 300) % 800 + 100}", "passcode": f"8Fk{((mtg.id or 1) * 17) % 80 + 10}p"}

            return {
                "response": f"✓ **Microsoft Teams Meeting Scheduled!**\n\nMeeting link generated and calendar invite sent to {slots['attendee_full_name']}.\n\n📌 **Meeting ID:** `{creds['meeting_id_code']}`\n🔑 **Passcode:** `{creds['passcode']}`",
                "intent": "general_qa",
                "state": {},
                "success_card": {
                    "title": "Teams Meeting Booked Successfully",
                    "meeting_title": slots["subject"],
                    "attendee": slots["attendee_full_name"],
                    "date": slots["date"],
                    "time": f"{slots['start_time']} (IST)",
                    "teams_url": mtg.teams_join_url,
                    "meeting_id_code": creds["meeting_id_code"],
                    "passcode": creds["passcode"]
                }
            }

        # STEP 6: Show Confirmation Card
        return {
            "response": "Please review and confirm your meeting details:",
            "intent": "schedule_meeting",
            "state": {"intent": "schedule_meeting", "slots": slots},
            "confirmation_card": {
                "title": "Confirm Teams Meeting",
                "action_type": "schedule_meeting",
                "fields": [
                    {"label": "Colleague", "value": slots["attendee_full_name"]},
                    {"label": "Subject", "value": slots["subject"]},
                    {"label": "Date", "value": slots["date"]},
                    {"label": "Time", "value": f"{slots['start_time']} (IST)"},
                    {"label": "Duration", "value": "30 minutes"}
                ],
                "confirm_button": "Confirm & Book Teams Meeting",
                "cancel_button": "Cancel"
            }
        }

    # ===============================================================
    # 3. FALLBACK GENERAL CONVERSATIONAL AI (Gemini)
    # ===============================================================
    profile = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == current_user.id).first()
    user_context = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "assigned_project": profile.assigned_project if profile else "Innowell Cloud Platform"
    }

    reply = ai_agent.run_innowell_chatbot(
        user_context=user_context,
        user_message=payload.message,
        history=payload.conversation_history
    )

    return {
        "response": reply,
        "intent": "general_qa",
        "state": {}
    }
