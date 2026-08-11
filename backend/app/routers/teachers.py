from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, get_current_user, get_teacher_for_user, require_admin, require_any_auth
from app.models import Teacher, User
from app.schemas.teacher import TeacherCreate, TeacherCreateResponse, TeacherOut, TeacherUpdate
from app.services.auth import create_teacher_with_user
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.get("/me", response_model=TeacherOut)
def my_teacher_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers have a teacher profile")
    teacher = get_teacher_for_user(db, user)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found for this account")
    return teacher


@router.get("", response_model=list[TeacherOut])
def list_teachers(
    school_id: str | None = Query(None, alias="schoolId"),
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(Teacher)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(Teacher.school_id.in_(allowed or ["__none__"]))
    if school_id:
        q = q.filter(Teacher.school_id == school_id)
    return q.order_by(Teacher.name).all()


@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(teacher_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    allowed = accessible_school_ids(db, user)
    if allowed is not None and teacher.school_id not in allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    return teacher


@router.post("", response_model=TeacherCreateResponse, status_code=201)
def create_teacher(payload: TeacherCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    data = payload.model_dump()
    password = data.pop("password", None)
    data["id"] = next_sequential_id(db, Teacher, "tch")
    teacher, temp_password = create_teacher_with_user(db, data, password)
    return TeacherCreateResponse(teacher=TeacherOut.model_validate(teacher), temp_password=temp_password)


@router.patch("/{teacher_id}", response_model=TeacherOut)
def update_teacher(
    teacher_id: str,
    payload: TeacherUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(teacher, key, value)
    if teacher.user_id and ("name" in updates or "email" in updates or "mobile" in updates or "school_id" in updates):
        linked = db.query(User).filter(User.id == teacher.user_id).first()
        if linked:
            if "name" in updates:
                linked.name = updates["name"]
            if "email" in updates:
                linked.email = updates["email"]
            if "mobile" in updates:
                linked.phone = updates["mobile"]
            if "school_id" in updates:
                linked.school_id = updates["school_id"]
    db.commit()
    db.refresh(teacher)
    return teacher


@router.post("/{teacher_id}/reset-password")
def reset_teacher_password(
    teacher_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.services.auth import set_temporary_password

    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if not teacher.user_id:
        raise HTTPException(status_code=400, detail="Teacher has no login account")
    linked = db.query(User).filter(User.id == teacher.user_id).first()
    if not linked:
        raise HTTPException(status_code=400, detail="Teacher login account not found")
    temp_password = set_temporary_password(db, linked)
    return {"tempPassword": temp_password}


@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    user_id = teacher.user_id
    db.delete(teacher)
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
    db.commit()
