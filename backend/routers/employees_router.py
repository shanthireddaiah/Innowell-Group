from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/api/employees", tags=["Employees"])

@router.get("/search", response_model=List[schemas.UserOut])
@router.get("", response_model=List[schemas.UserOut])
def list_employees(
    q: Optional[str] = None,
    search: Optional[str] = None,
    domain: Optional[str] = None,
    employment_type: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.User)

    search_term = q or search
    if search_term:
        s = f"%{search_term}%"
        query = query.filter((models.User.name.ilike(s)) | (models.User.email.ilike(s)))

    users = query.all()
    results = []
    
    for u in users:
        p = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == u.id).first()
        if domain and p and p.domain != domain:
            continue
        if employment_type and p and p.employment_type.value != employment_type:
            continue

        mgr_name = None
        if p and p.manager_id:
            mgr = db.query(models.User).filter(models.User.id == p.manager_id).first()
            if mgr:
                mgr_name = mgr.name

        results.append(schemas.UserOut(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            phone=u.phone,
            address=u.address,
            is_profile_completed=u.is_profile_completed,
            created_at=u.created_at,
            assigned_project=p.assigned_project if p else "Unassigned",
            manager_id=p.manager_id if p else None,
            manager_name=mgr_name,
            tenure_start_date=p.tenure_start_date if p else None,
            previous_experience=p.previous_experience if p else None,
            education=p.education if p else None,
            domain=p.domain if p else None,
            employment_type=p.employment_type if p else models.EmploymentTypeEnum.FULL_TIME
        ))
        
    return results

@router.put("/me", response_model=schemas.UserOut)
def update_own_profile(
    payload: schemas.EmployeeProfileUpdateSelf,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Self-service edit on own row
    if payload.name:
        current_user.name = payload.name
    if payload.phone:
        current_user.phone = payload.phone
    if payload.address:
        current_user.address = payload.address
    if payload.is_profile_completed is not None:
        current_user.is_profile_completed = payload.is_profile_completed

    profile = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == current_user.id).first()
    if not profile:
        profile = models.EmployeeProfile(user_id=current_user.id)
        db.add(profile)

    if payload.education is not None:
        profile.education = payload.education
    if payload.previous_experience is not None:
        profile.previous_experience = payload.previous_experience
    if payload.domain is not None:
        profile.domain = payload.domain

    db.commit()
    db.refresh(current_user)
    db.refresh(profile)

    mgr_name = None
    if profile and profile.manager_id:
        mgr = db.query(models.User).filter(models.User.id == profile.manager_id).first()
        if mgr:
            mgr_name = mgr.name

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
        manager_name=mgr_name,
        tenure_start_date=profile.tenure_start_date if profile else None,
        previous_experience=profile.previous_experience if profile else None,
        education=profile.education if profile else None,
        domain=profile.domain if profile else None,
        employment_type=profile.employment_type if profile else models.EmploymentTypeEnum.FULL_TIME
    )

@router.put("/{user_id}", response_model=schemas.UserOut)
def update_employee_hr(
    user_id: int,
    payload: schemas.EmployeeProfileUpdateHR,
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.HR, models.RoleEnum.ADMIN, models.RoleEnum.MANAGER])),
    db: Session = Depends(get_db)
):
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if payload.role:
        target_user.role = payload.role

    profile = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == user_id).first()
    if not profile:
        profile = models.EmployeeProfile(user_id=user_id)
        db.add(profile)

    if payload.assigned_project is not None:
        profile.assigned_project = payload.assigned_project
    if payload.manager_id is not None:
        profile.manager_id = payload.manager_id
    if payload.tenure_start_date is not None:
        profile.tenure_start_date = payload.tenure_start_date
    if payload.previous_experience is not None:
        profile.previous_experience = payload.previous_experience
    if payload.education is not None:
        profile.education = payload.education
    if payload.domain is not None:
        profile.domain = payload.domain
    if payload.employment_type is not None:
        profile.employment_type = payload.employment_type

    db.commit()
    db.refresh(target_user)
    db.refresh(profile)

    mgr_name = None
    if profile.manager_id:
        mgr = db.query(models.User).filter(models.User.id == profile.manager_id).first()
        if mgr:
            mgr_name = mgr.name

    return schemas.UserOut(
        id=target_user.id,
        name=target_user.name,
        email=target_user.email,
        role=target_user.role,
        phone=target_user.phone,
        address=target_user.address,
        is_profile_completed=target_user.is_profile_completed,
        created_at=target_user.created_at,
        assigned_project=profile.assigned_project,
        manager_id=profile.manager_id,
        manager_name=mgr_name,
        tenure_start_date=profile.tenure_start_date,
        previous_experience=profile.previous_experience,
        education=profile.education,
        domain=profile.domain,
        employment_type=profile.employment_type
    )
