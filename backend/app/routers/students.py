from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, assert_school_access, require_admin_or_teacher, require_any_auth
from app.models import Student, User
from app.schemas.student import StudentCreate, StudentOut, StudentUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=list[StudentOut])
def list_students(
    school_id: str | None = Query(None, alias="schoolId"),
    class_grade: str | None = Query(None, alias="classGrade"),
    section: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(Student)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(Student.school_id.in_(allowed or ["__none__"]))
    if school_id:
        q = q.filter(Student.school_id == school_id)
    if class_grade:
        q = q.filter(Student.class_grade == class_grade)
    if section:
        q = q.filter(Student.section == section)
    return q.order_by(Student.name).all()


@router.get("/{student_id}", response_model=StudentOut)
def get_student(student_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    assert_school_access(db, user, student.school_id)
    return student


@router.post("", response_model=StudentOut, status_code=201)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    assert_school_access(db, user, payload.school_id)
    student = Student(id=next_sequential_id(db, Student, "stu"), **payload.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: str,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    assert_school_access(db, user, student.school_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, key, value)
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    assert_school_access(db, user, student.school_id)
    db.delete(student)
    db.commit()
