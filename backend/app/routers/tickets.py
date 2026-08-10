from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, assert_school_access, require_admin_or_teacher, require_any_auth
from app.models import SupportTicket, User
from app.schemas.ticket import TicketCreate, TicketOut, TicketUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=list[TicketOut])
def list_tickets(
    school_id: str | None = Query(None, alias="schoolId"),
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(SupportTicket)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(SupportTicket.school_id.in_(allowed or ["__none__"]))
    if school_id:
        q = q.filter(SupportTicket.school_id == school_id)
    if status:
        q = q.filter(SupportTicket.status == status)
    return q.order_by(SupportTicket.created_at.desc()).all()


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    assert_school_access(db, user, ticket.school_id)
    return ticket


@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    assert_school_access(db, user, payload.school_id)
    ticket = SupportTicket(id=next_sequential_id(db, SupportTicket, "tkt"), **payload.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.patch("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    assert_school_access(db, user, ticket.school_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(ticket, key, value)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    assert_school_access(db, user, ticket.school_id)
    db.delete(ticket)
    db.commit()
