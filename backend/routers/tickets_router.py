# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, schemas, auth, ai_agent

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

@router.post("", response_model=schemas.TicketOut)
def create_ticket(
    payload: schemas.TicketCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Gemini AI Triage & 1-Line Formal Statement Generation
    triage = ai_agent.triage_ticket_description(payload.description, current_user.name)
    category = triage.get("category", "IT Support")
    formal_description = ai_agent.draft_formal_ticket_statement_ai(payload.description, current_user.name, category)

    ticket = models.Ticket(
        raised_by=current_user.id,
        category=category,
        severity=triage.get("severity", models.TicketSeverityEnum.MEDIUM),
        description=formal_description,
        attachment_url=payload.attachment_url,
        attachment_name=payload.attachment_name,
        ai_summary=triage.get("ai_summary", ""),
        ai_explanation=triage.get("ai_explanation", ""),
        status=models.TicketStatusEnum.OPEN
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return schemas.TicketOut(
        id=ticket.id,
        raised_by=ticket.raised_by,
        raised_by_name=current_user.name,
        category=ticket.category,
        severity=ticket.severity,
        description=ticket.description,
        attachment_url=ticket.attachment_url,
        attachment_name=ticket.attachment_name,
        ai_summary=ticket.ai_summary,
        ai_explanation=ticket.ai_explanation,
        resolution_remarks=ticket.resolution_remarks,
        status=ticket.status,
        assigned_to=ticket.assigned_to,
        assigned_to_name=None,
        created_at=ticket.created_at
    )

@router.get("", response_model=List[schemas.TicketOut])
def list_tickets(
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Ticket)
    
    # Strict RBAC Isolation: Employee sees only their own tickets
    if current_user.role == models.RoleEnum.EMPLOYEE:
        query = query.filter(models.Ticket.raised_by == current_user.id)

    if status_filter:
        query = query.filter(models.Ticket.status == status_filter)

    tickets = query.order_by(models.Ticket.created_at.desc()).all()
    results = []
    
    for t in tickets:
        author = db.query(models.User).filter(models.User.id == t.raised_by).first()
        assignee = db.query(models.User).filter(models.User.id == t.assigned_to).first() if t.assigned_to else None
        
        results.append(schemas.TicketOut(
            id=t.id,
            raised_by=t.raised_by,
            raised_by_name=author.name if author else "Unknown User",
            category=t.category,
            severity=t.severity,
            description=t.description,
            attachment_url=t.attachment_url,
            attachment_name=t.attachment_name,
            ai_summary=t.ai_summary,
            ai_explanation=t.ai_explanation,
            resolution_remarks=t.resolution_remarks,
            status=t.status,
            assigned_to=t.assigned_to,
            assigned_to_name=assignee.name if assignee else None,
            created_at=t.created_at
        ))
    return results

@router.put("/{ticket_id}/status", response_model=schemas.TicketOut)
def update_ticket_status(
    ticket_id: int,
    payload: schemas.TicketStatusUpdate,
    current_user: models.User = Depends(auth.require_role([models.RoleEnum.HR, models.RoleEnum.ADMIN, models.RoleEnum.MANAGER, models.RoleEnum.DIRECTOR])),
    db: Session = Depends(get_db)
):
    t = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    t.status = payload.status
    if payload.assigned_to is not None:
        t.assigned_to = payload.assigned_to
    if payload.resolution_remarks is not None:
        t.resolution_remarks = payload.resolution_remarks

    db.commit()
    db.refresh(t)

    author = db.query(models.User).filter(models.User.id == t.raised_by).first()
    assignee = db.query(models.User).filter(models.User.id == t.assigned_to).first() if t.assigned_to else None

    return schemas.TicketOut(
        id=t.id,
        raised_by=t.raised_by,
        raised_by_name=author.name if author else "Unknown",
        category=t.category,
        severity=t.severity,
        description=t.description,
        attachment_url=t.attachment_url,
        attachment_name=t.attachment_name,
        ai_summary=t.ai_summary,
        ai_explanation=t.ai_explanation,
        resolution_remarks=t.resolution_remarks,
        status=t.status,
        assigned_to=t.assigned_to,
        assigned_to_name=assignee.name if assignee else None,
        created_at=t.created_at
    )
