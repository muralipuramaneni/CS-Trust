from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_any_auth
from app.models import Activity, User
from app.schemas.activity import ActivityCreate, ActivityOut
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=list[ActivityOut])
def list_activities(db: Session = Depends(get_db), _: User = Depends(require_any_auth)):
    return db.query(Activity).order_by(Activity.created_at.desc()).limit(50).all()


@router.post("", response_model=ActivityOut, status_code=201)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    activity = Activity(id=next_sequential_id(db, Activity, "act"), **payload.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(activity)
    db.commit()
