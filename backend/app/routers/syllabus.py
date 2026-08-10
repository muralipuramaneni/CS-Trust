from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import (
    accessible_school_ids,
    assert_school_access,
    get_teacher_for_user,
    require_admin_or_teacher,
    require_any_auth,
)
from app.models import School, SyllabusProgress, User
from app.schemas.syllabus import SyllabusCreate, SyllabusOut, SyllabusUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/syllabus", tags=["syllabus"])


def _resolve_school_name(db: Session, school_id: str, school_name: str | None = None) -> str:
    name = (school_name or "").strip()
    if name:
        return name
    school = db.query(School).filter(School.id == school_id).first()
    return school.name if school else school_id


@router.get("", response_model=list[SyllabusOut])
def list_syllabus(
    school_id: str | None = Query(None, alias="schoolId"),
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(SyllabusProgress)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(SyllabusProgress.school_id.in_(allowed or ["__none__"]))
    if school_id:
        q = q.filter(SyllabusProgress.school_id == school_id)
    rows = q.order_by(SyllabusProgress.school_name, SyllabusProgress.class_label).all()

    # Backfill blank school names for older rows
    dirty = False
    for row in rows:
        if not (row.school_name or "").strip():
            row.school_name = _resolve_school_name(db, row.school_id)
            dirty = True
    if dirty:
        db.commit()
        for row in rows:
            db.refresh(row)
    return rows


@router.get("/{row_id}", response_model=SyllabusOut)
def get_syllabus(row_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    row = db.query(SyllabusProgress).filter(SyllabusProgress.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Syllabus row not found")
    assert_school_access(db, user, row.school_id)
    if not (row.school_name or "").strip():
        row.school_name = _resolve_school_name(db, row.school_id)
        db.commit()
        db.refresh(row)
    return row


@router.post("", response_model=SyllabusOut, status_code=201)
def create_syllabus(
    payload: SyllabusCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    data = payload.model_dump()
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher:
            raise HTTPException(status_code=400, detail="Teacher profile not found for this account")
        data["school_id"] = teacher.school_id
        data["teacher_id"] = teacher.id
        data["teacher_name"] = teacher.name
    assert_school_access(db, user, data["school_id"])
    data["school_name"] = _resolve_school_name(db, data["school_id"], data.get("school_name"))
    row = SyllabusProgress(id=next_sequential_id(db, SyllabusProgress, "syl"), **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{row_id}", response_model=SyllabusOut)
def update_syllabus(
    row_id: str,
    payload: SyllabusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    row = db.query(SyllabusProgress).filter(SyllabusProgress.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Syllabus row not found")
    assert_school_access(db, user, row.school_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=204)
def delete_syllabus(row_id: str, db: Session = Depends(get_db), user: User = Depends(require_admin_or_teacher)):
    row = db.query(SyllabusProgress).filter(SyllabusProgress.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Syllabus row not found")
    assert_school_access(db, user, row.school_id)
    db.delete(row)
    db.commit()
