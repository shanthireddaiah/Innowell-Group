# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
import models, schemas, auth, ai_agent, agentic_services
from datetime import datetime, date, timedelta

router = APIRouter(prefix="/api/leaves", tags=["Leaves"])

@router.get("/types", response_model=List[schemas.LeaveTypeOut])
def get_leave_types(db: Session = Depends(get_db)):
    return db.query(models.LeaveType).all()

@router.get("/holidays", response_model=List[schemas.HolidayOut])
def get_holidays(
    upcoming_only: bool = False,
    db: Session = Depends(get_db)
):
    today = date.today()
    query = db.query(models.Holiday)
    if upcoming_only:
        query = query.filter(models.Holiday.date >= today)
    holidays = query.order_by(models.Holiday.date.asc()).all()

    results = []
    for h in holidays:
        results.append(schemas.HolidayOut(
            id=h.id,
            name=h.name,
            date=h.date,
            holiday_type=h.holiday_type,
            day_name=h.date.strftime("%A"),
            is_upcoming=h.date >= today
        ))
    return results

@router.get("/balances", response_model=List[schemas.LeaveBalanceOut])
def get_leave_balances(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    curr_month = datetime.utcnow().strftime("%Y-%m")
    balances = db.query(models.LeaveBalance).filter(
        models.LeaveBalance.user_id == current_user.id
    ).all()

    # If balances empty, auto-create defaults
    if not balances:
        ltypes = db.query(models.LeaveType).all()
        for lt in ltypes:
            lb = models.LeaveBalance(
                user_id=current_user.id,
                leave_type_id=lt.id,
                remaining_days=float(lt.default_annual_quota),
                month_year=curr_month
            )
            db.add(lb)
        db.commit()
        balances = db.query(models.LeaveBalance).filter(models.LeaveBalance.user_id == current_user.id).all()

    result = []
    for b in balances:
        lt = db.query(models.LeaveType).filter(models.LeaveType.id == b.leave_type_id).first()
        result.append(schemas.LeaveBalanceOut(
            leave_type_id=b.leave_type_id,
            leave_type_name=lt.name if lt else "Unknown",
            leave_type_code=lt.code if lt else "N/A",
            remaining_days=b.remaining_days,
            month_year=b.month_year
        ))
    return result

@router.post("/ai-eligibility-draft")
def check_ai_eligibility(
    payload: schemas.LeaveDraftRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Check if dates fall on 2nd/4th Saturday, Sunday, or Public Holiday
    if payload.start_date and payload.end_date:
        cur_d = payload.start_date
        all_hols = True
        first_hol = None
        while cur_d <= payload.end_date:
            is_h, h_name = agentic_services.check_if_date_is_holiday(cur_d, db)
            if is_h:
                if not first_hol:
                    first_hol = h_name
            else:
                all_hols = False
            cur_d += timedelta(days=1)
        
        if all_hols:
            date_disp = payload.start_date.strftime("%B %d, %Y") if payload.start_date == payload.end_date else f"{payload.start_date.strftime('%B %d')} to {payload.end_date.strftime('%B %d, %Y')}"
            return {
                "eligible": False,
                "is_holiday_suggestion": True,
                "holiday_name": first_hol,
                "eligibility_reason": f"🎉 Woohoo! {date_disp} is already an official holiday ({first_hol})! 🏖️ No need to spend your leave quota on a day off — relax and enjoy your weekend! 😎✨",
                "ai_drafted_reason": f"Date is already a holiday ({first_hol}).",
                "leave_type_name": "Holiday",
                "days_requested": payload.days_requested,
                "start_date": payload.start_date,
                "end_date": payload.end_date,
                "remaining_balance": 0
            }

    lt = db.query(models.LeaveType).filter(models.LeaveType.id == payload.leave_type_id).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    lb = db.query(models.LeaveBalance).filter(
        models.LeaveBalance.user_id == current_user.id,
        models.LeaveBalance.leave_type_id == payload.leave_type_id
    ).first()
    
    remaining = lb.remaining_days if lb else float(lt.default_annual_quota)

    # Fetch recent history
    history_reqs = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.user_id == current_user.id
    ).order_by(models.LeaveRequest.created_at.desc()).limit(5).all()
    
    history_list = [
        {"leave_type_id": r.leave_type_id, "days": r.days_requested, "status": r.status.value}
        for r in history_reqs
    ]

    ai_result = ai_agent.get_leave_eligibility_and_draft(
        user_name=current_user.name,
        leave_type_name=lt.name,
        days_requested=payload.days_requested,
        remaining_balance=remaining,
        leave_history=history_list,
        user_notes=payload.user_notes or "",
        start_date=str(payload.start_date) if payload.start_date else None,
        end_date=str(payload.end_date) if payload.end_date else None
    )

    return {
        "eligible": ai_result.get("eligible", True),
        "eligibility_reason": ai_result.get("eligibility_reason", ""),
        "ai_drafted_reason": ai_result.get("ai_drafted_reason", ""),
        "leave_type_name": lt.name,
        "days_requested": payload.days_requested,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "remaining_balance": remaining
    }

@router.post("/agentic-auto-apply")
def agentic_auto_apply(
    payload: schemas.LeaveDraftRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Autonomous Agentic AI Leave Application:
    Employee provides leave_type_id, start_date, end_date, and days_requested.
    Gemini Agentic AI evaluates monthly eligibility, generates official reason, and automatically applies into database.
    """
    # Check if dates fall on 2nd/4th Saturday, Sunday, or Public Holiday
    if payload.start_date and payload.end_date:
        cur_d = payload.start_date
        all_hols = True
        first_hol = None
        while cur_d <= payload.end_date:
            is_h, h_name = agentic_services.check_if_date_is_holiday(cur_d, db)
            if is_h:
                if not first_hol:
                    first_hol = h_name
            else:
                all_hols = False
            cur_d += timedelta(days=1)
        
        if all_hols:
            date_disp = payload.start_date.strftime("%B %d, %Y") if payload.start_date == payload.end_date else f"{payload.start_date.strftime('%B %d')} to {payload.end_date.strftime('%B %d, %Y')}"
            raise HTTPException(
                status_code=400,
                detail=f"🎉 Woohoo! {date_disp} is already an official holiday ({first_hol})! 🏖️ No need to apply for leave — relax and enjoy your day off! 😎✨"
            )
    lt = db.query(models.LeaveType).filter(models.LeaveType.id == payload.leave_type_id).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    lb = db.query(models.LeaveBalance).filter(
        models.LeaveBalance.user_id == current_user.id,
        models.LeaveBalance.leave_type_id == payload.leave_type_id
    ).first()
    
    remaining = lb.remaining_days if lb else float(lt.default_annual_quota)

    history_reqs = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.user_id == current_user.id
    ).order_by(models.LeaveRequest.created_at.desc()).limit(5).all()
    
    history_list = [
        {"leave_type_id": r.leave_type_id, "days": r.days_requested, "status": r.status.value}
        for r in history_reqs
    ]

    # Run Gemini Agentic AI
    ai_result = ai_agent.get_leave_eligibility_and_draft(
        user_name=current_user.name,
        leave_type_name=lt.name,
        days_requested=payload.days_requested,
        remaining_balance=remaining,
        leave_history=history_list,
        user_notes=payload.user_notes or "Agentic auto-apply based on employee input",
        start_date=str(payload.start_date) if payload.start_date else None,
        end_date=str(payload.end_date) if payload.end_date else None
    )

    is_eligible = ai_result.get("eligible", True)
    ai_reason = ai_result.get("ai_drafted_reason", f"Requesting {payload.days_requested} day(s) for {lt.name}.")

    if not is_eligible:
        raise HTTPException(
            status_code=400,
            detail=f"Ineligible for leave: {ai_result.get('eligibility_reason', 'Requested days exceed available quota.')}"
        )

    # Automatically create the leave request
    req = models.LeaveRequest(
        user_id=current_user.id,
        leave_type_id=payload.leave_type_id,
        days_requested=payload.days_requested,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=models.LeaveStatusEnum.PENDING,
        ai_drafted_reason=ai_reason
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return {
        "success": True,
        "message": f"Successfully applied for {payload.days_requested} day(s) of {lt.name} via Agentic AI!",
        "request_id": req.id,
        "eligibility_summary": ai_result.get("eligibility_reason"),
        "ai_drafted_reason": ai_reason,
        "remaining_balance": remaining
    }

@router.post("/apply", response_model=schemas.LeaveRequestOut)
def apply_leave(
    payload: schemas.LeaveRequestCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    lt = db.query(models.LeaveType).filter(models.LeaveType.id == payload.leave_type_id).first()
    if not lt:
        raise HTTPException(status_code=404, detail="Leave type not found")

    req = models.LeaveRequest(
        user_id=current_user.id,
        leave_type_id=payload.leave_type_id,
        days_requested=payload.days_requested,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=models.LeaveStatusEnum.PENDING,
        ai_drafted_reason=payload.ai_drafted_reason
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return schemas.LeaveRequestOut(
        id=req.id,
        user_id=req.user_id,
        user_name=current_user.name,
        user_email=current_user.email,
        leave_type_id=req.leave_type_id,
        leave_type_name=lt.name,
        days_requested=req.days_requested,
        start_date=req.start_date,
        end_date=req.end_date,
        status=req.status,
        ai_drafted_reason=req.ai_drafted_reason,
        hr_reason=req.hr_reason,
        created_at=req.created_at
    )

@router.get("/requests", response_model=List[schemas.LeaveRequestOut])
def list_leave_requests(
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.LeaveRequest)
    
    # Strict RBAC Row Isolation: Employee only sees own; HR/Manager/Admin sees all
    if current_user.role == models.RoleEnum.EMPLOYEE:
        query = query.filter(models.LeaveRequest.user_id == current_user.id)

    if status_filter:
        query = query.filter(models.LeaveRequest.status == status_filter)

    requests = query.order_by(models.LeaveRequest.created_at.desc()).all()
    results = []
    for r in requests:
        u = db.query(models.User).filter(models.User.id == r.user_id).first()
        lt = db.query(models.LeaveType).filter(models.LeaveType.id == r.leave_type_id).first()
        results.append(schemas.LeaveRequestOut(
            id=r.id,
            user_id=r.user_id,
            user_name=u.name if u else "Unknown User",
            user_email=u.email if u else "N/A",
            leave_type_id=r.leave_type_id,
            leave_type_name=lt.name if lt else "Leave",
            days_requested=r.days_requested,
            start_date=r.start_date,
            end_date=r.end_date,
            status=r.status,
            ai_drafted_reason=r.ai_drafted_reason,
            hr_reason=r.hr_reason,
            created_at=r.created_at
        ))
    return results

@router.post("/{req_id}/ai-suggest-hr-reason")
def suggest_hr_reason(
    req_id: int,
    decision: str = "approved",
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.HR, models.RoleEnum.ADMIN, models.RoleEnum.MANAGER, models.RoleEnum.DIRECTOR])),
    db: Session = Depends(get_db)
):
    req = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    u = db.query(models.User).filter(models.User.id == req.user_id).first()
    lt = db.query(models.LeaveType).filter(models.LeaveType.id == req.leave_type_id).first()
    lb = db.query(models.LeaveBalance).filter(
        models.LeaveBalance.user_id == req.user_id,
        models.LeaveBalance.leave_type_id == req.leave_type_id
    ).first()

    suggested = ai_agent.suggest_hr_response_reason(
        employee_name=u.name if u else "Employee",
        leave_type=lt.name if lt else "Leave",
        days=req.days_requested,
        status_decision=decision,
        ai_drafted_reason=req.ai_drafted_reason or "",
        remaining_balance=lb.remaining_days if lb else 0.0
    )
    return {"suggested_reason": suggested}

@router.put("/{req_id}/review", response_model=schemas.LeaveRequestOut)
def review_leave_request(
    req_id: int,
    payload: schemas.LeaveStatusUpdate,
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.HR, models.RoleEnum.ADMIN, models.RoleEnum.MANAGER, models.RoleEnum.DIRECTOR])),
    db: Session = Depends(get_db)
):
    req = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    old_status = req.status
    req.status = payload.status
    req.hr_reason = payload.hr_reason
    req.reviewed_by = current_user.id

    # If approving, deduct from balance
    if payload.status == models.LeaveStatusEnum.APPROVED and old_status != models.LeaveStatusEnum.APPROVED:
        lb = db.query(models.LeaveBalance).filter(
            models.LeaveBalance.user_id == req.user_id,
            models.LeaveBalance.leave_type_id == req.leave_type_id
        ).first()
        if lb:
            lb.remaining_days = max(0.0, lb.remaining_days - req.days_requested)

    db.commit()
    db.refresh(req)

    u = db.query(models.User).filter(models.User.id == req.user_id).first()
    lt = db.query(models.LeaveType).filter(models.LeaveType.id == req.leave_type_id).first()

    return schemas.LeaveRequestOut(
        id=req.id,
        user_id=req.user_id,
        user_name=u.name if u else "User",
        user_email=u.email if u else "N/A",
        leave_type_id=req.leave_type_id,
        leave_type_name=lt.name if lt else "Leave",
        days_requested=req.days_requested,
        start_date=req.start_date,
        end_date=req.end_date,
        status=req.status,
        ai_drafted_reason=req.ai_drafted_reason,
        hr_reason=req.hr_reason,
        created_at=req.created_at
    )
