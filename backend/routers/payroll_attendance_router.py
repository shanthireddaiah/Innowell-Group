from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/api", tags=["Payroll & Attendance"])

# ----------------------------------------------------
# Payroll Endpoints (Strict Row-Level Isolation)
# ----------------------------------------------------
@router.get("/payroll", response_model=List[schemas.PayrollOut])
def get_payroll(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-provision payroll record if current_user doesn't have one yet
    existing_p = db.query(models.Payroll).filter(models.Payroll.user_id == current_user.id).first()
    if not existing_p:
        base = 95000.0 if current_user.role == models.RoleEnum.EMPLOYEE else 145000.0
        new_p = models.Payroll(
            user_id=current_user.id,
            base_salary=base,
            allowances=12500.0,
            deductions=8200.0,
            net_pay=base + 12500.0 - 8200.0,
            pay_period="August 2026"
        )
        db.add(new_p)
        db.commit()

    query = db.query(models.Payroll)
    
    # Strict Row-Level Security: Employee strictly sees ONLY their own salary and payslip records
    if current_user.role == models.RoleEnum.EMPLOYEE:
        query = query.filter(models.Payroll.user_id == current_user.id)

    records = query.order_by(models.Payroll.created_at.desc()).all()
    results = []
    for r in records:
        u = db.query(models.User).filter(models.User.id == r.user_id).first()
        results.append(schemas.PayrollOut(
            id=r.id,
            user_id=r.user_id,
            user_name=u.name if u else "Employee",
            base_salary=r.base_salary,
            allowances=r.allowances,
            deductions=r.deductions,
            net_pay=r.net_pay,
            pay_period=r.pay_period,
            created_at=r.created_at
        ))
    return results

# ----------------------------------------------------
# Attendance Endpoints (Strict Row-Level Isolation)
# ----------------------------------------------------
@router.get("/attendance", response_model=List[schemas.AttendanceOut])
def get_attendance(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Attendance)
    
    # Strict Row-Level Isolation in backend query layer
    if current_user.role == models.RoleEnum.EMPLOYEE:
        query = query.filter(models.Attendance.user_id == current_user.id)

    records = query.order_by(models.Attendance.date.desc()).all()
    results = []
    for r in records:
        u = db.query(models.User).filter(models.User.id == r.user_id).first()
        results.append(schemas.AttendanceOut(
            id=r.id,
            user_id=r.user_id,
            user_name=u.name if u else "Employee",
            login_time=r.login_time,
            logout_time=r.logout_time,
            date=r.date
        ))
    return results

@router.post("/attendance/clock-out")
def clock_out(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    att = db.query(models.Attendance).filter(
        models.Attendance.user_id == current_user.id,
        models.Attendance.date == today
    ).first()
    
    if not att:
        att = models.Attendance(
            user_id=current_user.id,
            login_time=datetime.utcnow(),
            logout_time=datetime.utcnow(),
            date=today
        )
        db.add(att)
    else:
        att.logout_time = datetime.utcnow()

    db.commit()
    return {"message": "Clock out logged successfully", "logout_time": datetime.utcnow().isoformat()}
