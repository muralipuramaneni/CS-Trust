from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, assert_school_access, get_teacher_for_user, require_admin_or_teacher, require_any_auth
from app.models import TeachingLog, User
from app.schemas.teaching_log import TeachingLogCreate, TeachingLogOut, TeachingLogUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/teaching-logs", tags=["teaching-logs"])


@router.get("", response_model=list[TeachingLogOut])
def list_logs(
    school_id: str | None = Query(None, alias="schoolId"),
    teacher_id: str | None = Query(None, alias="teacherId"),
    date: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(TeachingLog)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(TeachingLog.school_id.in_(allowed or ["__none__"]))
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if teacher:
            q = q.filter(TeachingLog.teacher_id == teacher.id)
    if school_id:
        q = q.filter(TeachingLog.school_id == school_id)
    if teacher_id:
        q = q.filter(TeachingLog.teacher_id == teacher_id)
    if date:
        q = q.filter(TeachingLog.date == date)
    return q.order_by(TeachingLog.date.desc(), TeachingLog.period.asc()).all()


@router.get("/{log_id}", response_model=TeachingLogOut)
def get_log(log_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    row = db.query(TeachingLog).filter(TeachingLog.id == log_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Teaching log not found")
    assert_school_access(db, user, row.school_id)
    return row


@router.post("", response_model=TeachingLogOut, status_code=201)
def create_log(
    payload: TeachingLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    data = payload.model_dump()
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher:
            raise HTTPException(status_code=400, detail="Teacher profile not found")
        data["teacher_id"] = teacher.id
        data["school_id"] = teacher.school_id
    assert_school_access(db, user, data["school_id"])
    row = TeachingLog(id=next_sequential_id(db, TeachingLog, "tl"), **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{log_id}", response_model=TeachingLogOut)
def update_log(
    log_id: str,
    payload: TeachingLogUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    row = db.query(TeachingLog).filter(TeachingLog.id == log_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Teaching log not found")
    assert_school_access(db, user, row.school_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{log_id}", status_code=204)
def delete_log(log_id: str, db: Session = Depends(get_db), user: User = Depends(require_admin_or_teacher)):
    row = db.query(TeachingLog).filter(TeachingLog.id == log_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Teaching log not found")
    assert_school_access(db, user, row.school_id)
    db.delete(row)
    db.commit()
