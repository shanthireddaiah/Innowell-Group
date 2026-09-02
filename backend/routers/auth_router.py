# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models, schemas, auth
from datetime import datetime, date

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/signup", response_model=schemas.TokenResponse)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip()
    existing = db.query(models.User).filter(func.lower(models.User.email) == email_clean.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    email_lower = email_clean.lower()
    if email_lower in ["shanthi@innowell.com", "shanthireddaiahnimmakayala@innowell.com", "admin@innowell.com"]:
        assigned_role = models.RoleEnum.ADMIN
    elif email_lower in ["leninkumar@innowell.com", "janani@innowell.com", "hr@innowell.com"]:
        assigned_role = models.RoleEnum.HR
    elif email_lower in ["kannan@innowell.com", "manager@innowell.com"]:
        assigned_role = models.RoleEnum.MANAGER
    else:
        assigned_role = models.RoleEnum.EMPLOYEE

    user = models.User(
        name=payload.name,
        email=email_clean,
        password_hash=auth.get_password_hash(payload.password),
        role=assigned_role,
        phone=payload.phone,
        address=payload.address,
        is_profile_completed=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create associated profile
    profile = models.EmployeeProfile(
        user_id=user.id,
        assigned_project="Innowell Cloud Platform",
        tenure_start_date=date.today(),
        employment_type=models.EmploymentTypeEnum.FULL_TIME,
        domain="Engineering"
    )
    db.add(profile)
    db.commit()

    # Seed initial leave balances for new user
    leave_types = db.query(models.LeaveType).all()
    curr_month = datetime.utcnow().strftime("%Y-%m")
    for lt in leave_types:
        lb = models.LeaveBalance(
            user_id=user.id,
            leave_type_id=lt.id,
            remaining_days=float(lt.default_annual_quota),
            month_year=curr_month
        )
        db.add(lb)

    # Seed initial payroll record for new user
    base_sal = 95000.0 if user.role == models.RoleEnum.EMPLOYEE else 145000.0
    pr = models.Payroll(
        user_id=user.id,
        base_salary=base_sal,
        allowances=12500.0,
        deductions=8200.0,
        net_pay=base_sal + 12500.0 - 8200.0,
        pay_period=datetime.utcnow().strftime("%B %Y")
    )
    db.add(pr)
    db.commit()

    access_token = auth.create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "is_profile_completed": user.is_profile_completed
        }
    }

@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip()
    user = db.query(models.User).filter(func.lower(models.User.email) == email_clean.lower()).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # Record attendance log on login safely
    try:
        today = date.today()
        att = db.query(models.Attendance).filter(
            models.Attendance.user_id == user.id,
            models.Attendance.date == today
        ).first()
        if not att:
            att = models.Attendance(
                user_id=user.id,
                login_time=datetime.utcnow(),
                date=today
            )
            db.add(att)
            db.commit()
    except Exception as e:
        print(f"[Attendance Warning] Could not log attendance: {e}")
        db.rollback()

    access_token = auth.create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "is_profile_completed": user.is_profile_completed
        }
    }

@router.get("/me", response_model=schemas.UserOut)
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == current_user.id).first()
    manager_name = None
    if profile and profile.manager_id:
        mgr = db.query(models.User).filter(models.User.id == profile.manager_id).first()
        if mgr:
            manager_name = mgr.name

    return schemas.UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
        address=current_user.address,
        is_profile_completed=current_user.is_profile_completed,
        created_at=current_user.created_at,
        assigned_project=profile.assigned_project if profile else "Unassigned",
        manager_id=profile.manager_id if profile else None,
        manager_name=manager_name,
        tenure_start_date=profile.tenure_start_date if profile else None,
        previous_experience=profile.previous_experience if profile else None,
        education=profile.education if profile else None,
        domain=profile.domain if profile else None,
        employment_type=profile.employment_type if profile else models.EmploymentTypeEnum.FULL_TIME
    )

@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Corporate email address not found in system")
    return {"message": f"Verified corporate account for {payload.email}. Proceed to set a new password."}

@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Corporate email address not found")
    
    user.password_hash = auth.get_password_hash(payload.new_password)
    db.commit()
    db.refresh(user)
    return {"message": "Password reset successfully. You may now log in with your new password."}
