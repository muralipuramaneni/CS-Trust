from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, assert_school_access, require_admin, require_any_auth
from app.models import School, User
from app.schemas.school import SchoolCreate, SchoolOut, SchoolUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/schools", tags=["schools"])


@router.get("", response_model=list[SchoolOut])
def list_schools(
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(School)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(School.id.in_(allowed or ["__none__"]))
    if status:
        q = q.filter(School.status == status)
    return q.order_by(School.name).all()


@router.get("/{school_id}", response_model=SchoolOut)
def get_school(school_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    assert_school_access(db, user, school_id)
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school


@router.post("", response_model=SchoolOut, status_code=201)
def create_school(payload: SchoolCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    school = School(id=next_sequential_id(db, School, "sch"), **payload.model_dump())
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


@router.patch("/{school_id}", response_model=SchoolOut)
def update_school(
    school_id: str,
    payload: SchoolUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(school, key, value)
    db.commit()
    db.refresh(school)
    return school


@router.delete("/{school_id}", status_code=204)
def delete_school(school_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    db.delete(school)
    db.commit()
