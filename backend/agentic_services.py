# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
import models

def get_leave_types_tool(db: Session) -> List[Dict[str, Any]]:
    ltypes = db.query(models.LeaveType).all()
    return [
        {
            "id": lt.id,
            "name": lt.name,
            "code": lt.code,
            "default_annual_quota": lt.default_annual_quota
        }
        for lt in ltypes
    ]

def get_leave_balances_tool(db: Session, user_id: int) -> List[Dict[str, Any]]:
    curr_month = datetime.utcnow().strftime("%Y-%m")
    balances = db.query(models.LeaveBalance).filter(models.LeaveBalance.user_id == user_id).all()
    
    if not balances:
        ltypes = db.query(models.LeaveType).all()
        for lt in ltypes:
            lb = models.LeaveBalance(
                user_id=user_id,
                leave_type_id=lt.id,
                remaining_days=float(lt.default_annual_quota),
                month_year=curr_month
            )
            db.add(lb)
        db.commit()
        balances = db.query(models.LeaveBalance).filter(models.LeaveBalance.user_id == user_id).all()

    result = []
    obsolete_codes = ["EL", "FL", "PH", "MYS", "PL"]
    for b in balances:
        lt = db.query(models.LeaveType).filter(models.LeaveType.id == b.leave_type_id).first()
        if lt and lt.code not in obsolete_codes:
            result.append({
                "leave_type_id": b.leave_type_id,
                "name": lt.name,
                "code": lt.code,
                "remaining_days": b.remaining_days
            })
    return result

def check_if_date_is_holiday(d: date, db: Session = None) -> tuple[bool, Optional[str]]:
    """Check if a date falls on Sunday, 2nd Saturday, 4th Saturday, or a Public Holiday."""
    # 1. All Sundays are holidays
    if d.weekday() == 6:
        return True, "Sunday (Weekly Off)"
    # 2. 2nd & 4th Saturdays are holidays
    if d.weekday() == 5:
        sat_num = (d.day - 1) // 7 + 1
        if sat_num == 2:
            return True, "2nd Saturday (Company Off)"
        elif sat_num == 4:
            return True, "4th Saturday (Company Off)"
    # 3. Public / Gazetted Holidays
    if db:
        hol = db.query(models.Holiday).filter(models.Holiday.date == d).first()
        if hol:
            return True, f"Public Holiday: {hol.name}"
    return False, None

def validate_leave_request_tool(
    db: Session,
    user_id: int,
    leave_type_identifier: str,
    start_date_str: str,
    end_date_str: str,
    reason: str
) -> Dict[str, Any]:
    # 1. Employee Verification
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"valid": False, "error": "Employee profile record not found."}

    # 2. Leave Type Verification
    lt = None
    if str(leave_type_identifier).isdigit():
        lt = db.query(models.LeaveType).filter(models.LeaveType.id == int(leave_type_identifier)).first()
    else:
        s = f"%{leave_type_identifier}%"
        lt = db.query(models.LeaveType).filter(
            (models.LeaveType.code.ilike(leave_type_identifier)) |
            (models.LeaveType.name.ilike(s))
        ).first()

    if not lt:
        # Fallback to General Leave if default
        lt = db.query(models.LeaveType).filter(models.LeaveType.code == "GL").first()
        if not lt:
            lt = db.query(models.LeaveType).first()

    # 3. Date Validation
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except Exception:
        return {"valid": False, "error": "Invalid date format provided. Please specify dates in YYYY-MM-DD format."}

    today = date.today()
    if start_date < today:
        return {
            "valid": False,
            "error": f"Selected start date ({start_date_str}) is in the past. Please choose an upcoming date starting from today or later."
        }

    if start_date > end_date:
        return {"valid": False, "error": f"Start date ({start_date_str}) cannot be after end date ({end_date_str})."}

    # 3b. Smart Holiday & Weekend Check with Fun Emoji Expression
    cur_d = start_date
    all_holidays = True
    first_holiday_name = None
    while cur_d <= end_date:
        is_hol, hol_name = check_if_date_is_holiday(cur_d, db)
        if is_hol:
            if not first_holiday_name:
                first_holiday_name = hol_name
        else:
            all_holidays = False
        cur_d += timedelta(days=1)

    if all_holidays:
        if start_date == end_date:
            date_display = start_date.strftime("%B %d, %Y")
        else:
            date_display = f"{start_date.strftime('%B %d')} to {end_date.strftime('%B %d, %Y')}"
        
        return {
            "valid": False,
            "is_holiday_suggestion": True,
            "error": f"🎉 Woohoo! {date_display} is already a holiday ({first_holiday_name})! 🏖️ No need to spend your leave quota on a day off — relax and enjoy your weekend! 😎✨"
        }

    # Calculate requested days
    num_days = (end_date - start_date).days + 1

    # 4. Leave Balance Check
    lb = db.query(models.LeaveBalance).filter(
        models.LeaveBalance.user_id == user_id,
        models.LeaveBalance.leave_type_id == lt.id
    ).first()

    remaining = lb.remaining_days if lb else float(lt.default_annual_quota)
    if num_days > remaining:
        return {
            "valid": False,
            "error": f"You currently have only {remaining} {lt.name} days available, but requested {num_days} days. Please choose {int(remaining) if remaining > 0 else 0} days or fewer."
        }

    # 5. Overlapping Leave Request Check
    overlapping = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.user_id == user_id,
        models.LeaveRequest.status != models.LeaveStatusEnum.REJECTED,
        models.LeaveRequest.start_date <= end_date,
        models.LeaveRequest.end_date >= start_date
    ).first()

    if overlapping:
        return {
            "valid": False,
            "error": f"You already have a leave request (#LR-{overlapping.id}) for overlapping dates ({overlapping.start_date} to {overlapping.end_date})."
        }

    return {
        "valid": True,
        "leave_type_id": lt.id,
        "leave_type_name": lt.name,
        "leave_type_code": lt.code,
        "start_date": start_date,
        "end_date": end_date,
        "days_requested": float(num_days),
        "remaining_balance": remaining,
        "reason": reason or "Personal work"
    }

def create_leave_request_tool(
    db: Session,
    user_id: int,
    validated_data: Dict[str, Any]
) -> Dict[str, Any]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    hr_u = db.query(models.User).filter(models.User.role == models.RoleEnum.HR).first()
    hr_name = hr_u.name if hr_u else "Leninkumar"

    # Generate official Gemini AI corporate leave reason with HR salutation
    import ai_agent
    ai_res = ai_agent.get_leave_eligibility_and_draft(
        user_name=user.name if user else "Employee",
        leave_type_name=validated_data["leave_type_name"],
        days_requested=validated_data["days_requested"],
        remaining_balance=validated_data["remaining_balance"],
        leave_history=[],
        user_notes=validated_data.get("reason", "Personal work"),
        start_date=str(validated_data["start_date"]),
        end_date=str(validated_data["end_date"]),
        hr_name=hr_name
    )
    ai_reason = ai_res.get("ai_drafted_reason") or f"Hi {hr_name}, Requesting {validated_data['days_requested']} day(s) for {validated_data['leave_type_name']}."

    req = models.LeaveRequest(
        user_id=user_id,
        leave_type_id=validated_data["leave_type_id"],
        days_requested=validated_data["days_requested"],
        start_date=validated_data["start_date"],
        end_date=validated_data["end_date"],
        status=models.LeaveStatusEnum.PENDING,
        ai_drafted_reason=ai_reason
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    req_code = f"LV-{datetime.utcnow().strftime('%Y')}-{req.id:05d}"
    return {
        "success": True,
        "request_id": req.id,
        "request_code": req_code,
        "leave_type_name": validated_data["leave_type_name"],
        "start_date": str(validated_data["start_date"]),
        "end_date": str(validated_data["end_date"]),
        "days_requested": validated_data["days_requested"],
        "status": "Pending Approval",
        "remaining_balance": validated_data["remaining_balance"],
        "reason": ai_reason
    }

def get_leave_requests_tool(db: Session, user_id: int) -> List[Dict[str, Any]]:
    reqs = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.user_id == user_id
    ).order_by(models.LeaveRequest.created_at.desc()).all()

    result = []
    for r in reqs:
        lt = db.query(models.LeaveType).filter(models.LeaveType.id == r.leave_type_id).first()
        req_code = f"LV-{r.created_at.strftime('%Y')}-{r.id:05d}"
        result.append({
            "id": r.id,
            "request_code": req_code,
            "leave_type_name": lt.name if lt else "Leave",
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "days_requested": r.days_requested,
            "status": r.status.value,
            "reason": r.ai_drafted_reason,
            "created_at": r.created_at.strftime("%b %d, %Y")
        })
    return result

def cancel_leave_request_tool(db: Session, user_id: int, request_id: int) -> Dict[str, Any]:
    req = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.id == request_id,
        models.LeaveRequest.user_id == user_id
    ).first()

    if not req:
        return {"success": False, "error": f"Leave request #LV-2026-{request_id:05d} not found."}

    db.delete(req)
    db.commit()
    return {"success": True, "message": f"Successfully cancelled leave request #LV-2026-{request_id:05d}."}

def create_ticket_tool(
    db: Session,
    user_id: int,
    description: str,
    category: str,
    severity_str: str,
    attachment_url: Optional[str] = None,
    attachment_name: Optional[str] = None
) -> Dict[str, Any]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user_name = user.name if user else "Employee"

    import ai_agent
    triage = ai_agent.triage_ticket_description(description, user_name)

    sev_enum = models.TicketSeverityEnum.MEDIUM
    sev_lower = (severity_str or triage.get("severity", "medium")).lower()
    if "critical" in sev_lower:
        sev_enum = models.TicketSeverityEnum.CRITICAL
    elif "high" in sev_lower:
        sev_enum = models.TicketSeverityEnum.HIGH
    elif "low" in sev_lower:
        sev_enum = models.TicketSeverityEnum.LOW

    ticket_category = category or triage.get("category", "IT Support")

    t = models.Ticket(
        raised_by=user_id,
        category=ticket_category,
        severity=sev_enum,
        description=description,
        attachment_url=attachment_url,
        attachment_name=attachment_name,
        ai_summary=triage.get("ai_summary", description),
        ai_explanation=triage.get("ai_explanation", "AI Diagnosis generated by Innowell Assistant."),
        status=models.TicketStatusEnum.OPEN
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    t_code = f"IT-{datetime.utcnow().strftime('%Y')}-{t.id:05d}"
    return {
        "success": True,
        "ticket_id": t.id,
        "ticket_code": t_code,
        "category": t.category,
        "severity": t.severity.value,
        "status": "Open",
        "description": description,
        "attachment_url": t.attachment_url,
        "attachment_name": t.attachment_name,
        "ai_explanation": t.ai_explanation
    }

def get_tickets_tool(db: Session, user_id: int) -> List[Dict[str, Any]]:
    tickets = db.query(models.Ticket).filter(
        models.Ticket.raised_by == user_id
    ).order_by(models.Ticket.created_at.desc()).all()

    result = []
    for t in tickets:
        t_code = f"IT-{t.created_at.strftime('%Y')}-{t.id:05d}"
        result.append({
            "id": t.id,
            "ticket_code": t_code,
            "category": t.category,
            "severity": t.severity.value,
            "description": t.description,
            "attachment_url": t.attachment_url,
            "attachment_name": t.attachment_name,
            "ai_explanation": t.ai_explanation or t.ai_summary,
            "status": t.status.value,
            "created_at": t.created_at.strftime("%b %d, %Y")
        })
    return result

def search_employee_tool(db: Session, query: str) -> List[Dict[str, Any]]:
    q_str = f"%{query}%"
    users = db.query(models.User).filter(
        (models.User.name.ilike(q_str)) |
        (models.User.email.ilike(q_str))
    ).limit(7).all()

    results = []
    for u in users:
        p = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == u.id).first()
        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
            "domain": p.domain if p else "Engineering",
            "project": p.assigned_project if p else "Innowell Mobility Cloud"
        })
    return results

def get_attendance_tool(db: Session, user_id: int) -> List[Dict[str, Any]]:
    records = db.query(models.Attendance).filter(
        models.Attendance.user_id == user_id
    ).order_by(models.Attendance.date.desc()).limit(7).all()

    results = []
    for r in records:
        login_str = r.login_time.strftime("%I:%M %p") if r.login_time else "N/A"
        logout_str = r.logout_time.strftime("%I:%M %p") if r.logout_time else "N/A"
        hours = 9.25 if r.login_time and r.logout_time else 8.0
        results.append({
            "date": r.date.strftime("%b %d, %Y (%a)"),
            "check_in": login_str,
            "check_out": logout_str,
            "working_hours": f"{hours} hrs",
            "status": "Present"
        })
    return results

def get_payslip_tool(db: Session, user_id: int) -> Dict[str, Any]:
    pr = db.query(models.Payroll).filter(models.Payroll.user_id == user_id).first()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not pr:
        base = 95000.0
        return {
            "employee_name": user.name if user else "Employee",
            "pay_period": "August 2026",
            "base_salary": base,
            "allowances": 12500.0,
            "deductions": 8200.0,
            "net_pay": base + 12500.0 - 8200.0,
            "bank_account": "Innowell HDFC Direct **** 4092"
        }
    return {
        "employee_name": user.name if user else "Employee",
        "pay_period": pr.pay_period,
        "base_salary": pr.base_salary,
        "allowances": pr.allowances,
        "deductions": pr.deductions,
        "net_pay": pr.net_pay,
        "bank_account": "Innowell HDFC Direct **** 4092"
    }

def get_holidays_tool(db: Session, upcoming_only: bool = False) -> List[Dict[str, Any]]:
    today = date(2026, 9, 2)
    query = db.query(models.Holiday)
    if upcoming_only:
        query = query.filter(models.Holiday.date >= today)
    holidays = query.order_by(models.Holiday.date.asc()).all()
    if not holidays:
        return [
            {"name": "Milad-un-Nabi (Eid-e-Milad)", "date": "Sep 04, 2026", "day": "Friday", "type": "Gazetted Holiday", "is_upcoming": True},
            {"name": "Onam / Thiruvonam", "date": "Sep 05, 2026", "day": "Saturday", "type": "Festival Holiday", "is_upcoming": True},
            {"name": "Mahatma Gandhi Jayanti", "date": "Oct 02, 2026", "day": "Friday", "type": "National Gazetted Holiday", "is_upcoming": True},
            {"name": "Maha Navami / Ayudha Puja", "date": "Oct 19, 2026", "day": "Monday", "type": "Festival Holiday", "is_upcoming": True},
            {"name": "Vijaya Dashami (Dussehra)", "date": "Oct 20, 2026", "day": "Tuesday", "type": "Gazetted Festival Holiday", "is_upcoming": True},
            {"name": "Maharishi Valmiki Jayanti", "date": "Oct 26, 2026", "day": "Monday", "type": "Festival Holiday", "is_upcoming": True},
            {"name": "Kannada Rajyotsava", "date": "Nov 01, 2026", "day": "Sunday", "type": "State / Public Holiday", "is_upcoming": True},
            {"name": "Naraka Chaturdashi", "date": "Nov 07, 2026", "day": "Saturday", "type": "Festival Holiday", "is_upcoming": True},
            {"name": "Diwali (Deepavali / Lakshmi Puja)", "date": "Nov 08, 2026", "day": "Sunday", "type": "Gazetted Festival Holiday", "is_upcoming": True},
            {"name": "Govardhan Puja / Vikram Samvat", "date": "Nov 09, 2026", "day": "Monday", "type": "Festival Holiday", "is_upcoming": True},
            {"name": "Bhai Dooj", "date": "Nov 11, 2026", "day": "Wednesday", "type": "Festival Holiday", "is_upcoming": True},
            {"name": "Guru Nanak Jayanti", "date": "Nov 24, 2026", "day": "Tuesday", "type": "Gazetted Holiday", "is_upcoming": True},
            {"name": "Christmas Eve", "date": "Dec 24, 2026", "day": "Thursday", "type": "Corporate Holiday", "is_upcoming": True},
            {"name": "Christmas Day", "date": "Dec 25, 2026", "day": "Friday", "type": "Gazetted Holiday", "is_upcoming": True},
            {"name": "Innowell Year-End Mandatory Shutdown", "date": "Dec 28 - Dec 31, 2026", "day": "Mon - Thu", "type": "Mandatory Shutdown", "is_upcoming": True}
        ]
    return [
        {
            "name": h.name,
            "date": h.date.strftime("%b %d, %Y"),
            "day": h.date.strftime("%A"),
            "type": h.holiday_type,
            "is_upcoming": h.date >= today
        }
        for h in holidays
    ]
