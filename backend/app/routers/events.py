from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, assert_school_access, require_admin_or_teacher, require_any_auth
from app.models import Event, User
from app.schemas.event import EventCreate, EventOut, EventUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventOut])
def list_events(
    school_id: str | None = Query(None, alias="schoolId"),
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(Event)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(Event.school_id.in_(allowed or ["__none__"]))
    if school_id:
        q = q.filter(Event.school_id == school_id)
    return q.order_by(Event.date.desc()).all()


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    assert_school_access(db, user, event.school_id)
    return event


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    assert_school_access(db, user, payload.school_id)
    event = Event(id=next_sequential_id(db, Event, "evt"), **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: str,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    assert_school_access(db, user, event.school_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    assert_school_access(db, user, event.school_id)
    db.delete(event)
    db.commit()
