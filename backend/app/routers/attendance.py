from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import (
    accessible_school_ids,
    assert_school_access,
    get_teacher_for_user,
    require_admin,
    require_admin_or_teacher,
    require_any_auth,
)
from app.models import School, Student, StudentAttendanceMark, StudentAttendanceSession, TeacherAttendance, User
from app.schemas.attendance import (
    StudentAttendanceSessionCreate,
    StudentAttendanceSessionOut,
    StudentAttendanceMarkOut,
    TeacherAttendanceCreate,
    TeacherAttendanceOut,
    TeacherAttendanceUpdate,
)
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _parse_clock_minutes(value: str) -> int | None:
    text = (value or "").strip()
    if not text or text == "—":
        return None
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M:%S %p"):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.hour * 60 + parsed.minute
        except ValueError:
            continue
    return None


def compute_working_hours(clock_in: str, clock_out: str) -> str:
    start = _parse_clock_minutes(clock_in)
    end = _parse_clock_minutes(clock_out)
    if start is None or end is None:
        return "—"
    delta = end - start
    if delta < 0:
        delta += 24 * 60
    hours, minutes = divmod(delta, 60)
    if hours and minutes:
        return f"{hours}h {minutes}m"
    if hours:
        return f"{hours}h"
    return f"{minutes}m"


@router.get("/teachers", response_model=list[TeacherAttendanceOut])
def list_teacher_attendance(
    school_id: str | None = Query(None, alias="schoolId"),
    teacher_id: str | None = Query(None, alias="teacherId"),
    date: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(TeacherAttendance)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(TeacherAttendance.school_id.in_(allowed or ["__none__"]))
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if teacher:
            q = q.filter(TeacherAttendance.teacher_id == teacher.id)
    if school_id:
        q = q.filter(TeacherAttendance.school_id == school_id)
    if teacher_id:
        q = q.filter(TeacherAttendance.teacher_id == teacher_id)
    if date:
        q = q.filter(TeacherAttendance.date == date)
    return q.order_by(TeacherAttendance.date.desc()).all()


@router.post("/teachers", response_model=TeacherAttendanceOut, status_code=201)
def create_teacher_attendance(
    payload: TeacherAttendanceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    data = payload.model_dump()
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher:
            raise HTTPException(status_code=400, detail="Teacher profile not found for this account")
        data["teacher_id"] = teacher.id
        data["teacher_name"] = teacher.name
        data["school_id"] = teacher.school_id
        if not data.get("school_name"):
            school = db.query(School).filter(School.id == teacher.school_id).first()
            data["school_name"] = school.name if school else teacher.school_id
    assert_school_access(db, user, data["school_id"])
    if not data.get("school_name"):
        school = db.query(School).filter(School.id == data["school_id"]).first()
        data["school_name"] = school.name if school else data["school_id"]
    if data.get("clock_out") and data["clock_out"] not in ("", "—") and data.get("clock_in"):
        data["hours"] = compute_working_hours(data["clock_in"], data["clock_out"])
    elif not data.get("hours"):
        data["hours"] = "In progress"
    row = TeacherAttendance(id=next_sequential_id(db, TeacherAttendance, "ta"), **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/teachers/{record_id}", response_model=TeacherAttendanceOut)
def update_teacher_attendance(
    record_id: str,
    payload: TeacherAttendanceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    row = db.query(TeacherAttendance).filter(TeacherAttendance.id == record_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    assert_school_access(db, user, row.school_id)
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher or teacher.id != row.teacher_id:
            raise HTTPException(status_code=403, detail="Teachers can only update their own attendance")
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(row, key, value)
    clock_out = row.clock_out
    if clock_out and clock_out not in ("", "—") and row.clock_in:
        # Recompute whenever clock times change, or hours still placeholder
        if (
            "clock_in" in updates
            or "clock_out" in updates
            or row.hours in ("", "In progress", "Calculated", "—")
        ):
            row.hours = compute_working_hours(row.clock_in, clock_out)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/teachers/{record_id}", status_code=204)
def delete_teacher_attendance(
    record_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    row = db.query(TeacherAttendance).filter(TeacherAttendance.id == record_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    assert_school_access(db, user, row.school_id)
    db.delete(row)
    db.commit()


def _session_out(db: Session, session: StudentAttendanceSession) -> StudentAttendanceSessionOut:
    marks = db.query(StudentAttendanceMark).filter(StudentAttendanceMark.session_id == session.id).all()
    return StudentAttendanceSessionOut(
        id=session.id,
        school_id=session.school_id,
        class_grade=session.class_grade,
        section=session.section,
        date=session.date,
        teacher_id=session.teacher_id,
        teacher_name=session.teacher_name,
        marks=[StudentAttendanceMarkOut.model_validate(m) for m in marks],
    )


def _find_student_session(
    db: Session,
    *,
    school_id: str,
    class_grade: str,
    section: str,
    date: str,
) -> StudentAttendanceSession | None:
    return (
        db.query(StudentAttendanceSession)
        .filter(
            StudentAttendanceSession.school_id == school_id,
            StudentAttendanceSession.class_grade == class_grade,
            StudentAttendanceSession.section == section,
            StudentAttendanceSession.date == date,
        )
        .first()
    )


@router.get("/students/sessions", response_model=list[StudentAttendanceSessionOut])
def list_student_sessions(
    school_id: str | None = Query(None, alias="schoolId"),
    class_grade: str | None = Query(None, alias="classGrade"),
    section: str | None = None,
    date: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(StudentAttendanceSession)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(StudentAttendanceSession.school_id.in_(allowed or ["__none__"]))
    if school_id:
        q = q.filter(StudentAttendanceSession.school_id == school_id)
    if class_grade:
        q = q.filter(StudentAttendanceSession.class_grade == class_grade)
    if section:
        q = q.filter(StudentAttendanceSession.section == section)
    if date:
        q = q.filter(StudentAttendanceSession.date == date)
    sessions = q.order_by(StudentAttendanceSession.date.desc()).all()
    return [_session_out(db, s) for s in sessions]


@router.post("/students/sessions", response_model=StudentAttendanceSessionOut, status_code=201)
def create_student_session(
    payload: StudentAttendanceSessionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    data = payload.model_dump()
    marks = data.pop("marks", [])

    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher:
            raise HTTPException(status_code=400, detail="Teacher profile not found for this account")
        data["school_id"] = teacher.school_id
        data["teacher_id"] = teacher.id
        data["teacher_name"] = teacher.name

    school_id = data["school_id"]
    class_grade = str(data["class_grade"]).strip()
    section = str(data["section"]).strip()
    date = str(data["date"]).strip()
    data["class_grade"] = class_grade
    data["section"] = section
    data["date"] = date

    assert_school_access(db, user, school_id)

    if not marks:
        raise HTTPException(status_code=400, detail="Mark at least one student present or absent.")

    existing = _find_student_session(
        db,
        school_id=school_id,
        class_grade=class_grade,
        section=section,
        date=date,
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Attendance for class {class_grade}-{section} on {date} is already submitted. "
                "It cannot be submitted again."
            ),
        )

    # Validate students belong to this school/class/section and statuses are P/A
    student_ids = [m["student_id"] for m in marks]
    if len(student_ids) != len(set(student_ids)):
        raise HTTPException(status_code=400, detail="Duplicate student marks are not allowed.")

    students = db.query(Student).filter(Student.id.in_(student_ids), Student.school_id == school_id).all()
    by_id = {s.id: s for s in students}
    for sid in student_ids:
        student = by_id.get(sid)
        if not student or student.status != "active":
            raise HTTPException(
                status_code=400,
                detail="One or more students are invalid for this school.",
            )
        if student.class_grade.strip() != class_grade or student.section.strip().upper() != section.upper():
            raise HTTPException(
                status_code=400,
                detail="One or more students do not belong to this class/section.",
            )

    for mark in marks:
        if mark["status"] not in ("P", "A"):
            raise HTTPException(status_code=400, detail="Attendance status must be P or A.")

    session = StudentAttendanceSession(
        id=next_sequential_id(db, StudentAttendanceSession, "sas"),
        **data,
    )
    db.add(session)
    try:
        db.flush()
        for mark in marks:
            db.add(
                StudentAttendanceMark(
                    id=next_sequential_id(db, StudentAttendanceMark, "sam"),
                    session_id=session.id,
                    student_id=mark["student_id"],
                    status=mark["status"],
                )
            )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                f"Attendance for class {class_grade}-{section} on {date} is already submitted. "
                "It cannot be submitted again."
            ),
        ) from None

    db.refresh(session)
    return _session_out(db, session)


@router.get("/students/sessions/{session_id}", response_model=StudentAttendanceSessionOut)
def get_student_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    session = db.query(StudentAttendanceSession).filter(StudentAttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    assert_school_access(db, user, session.school_id)
    return _session_out(db, session)


@router.delete("/students/sessions/{session_id}", status_code=204)
def delete_student_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    session = db.query(StudentAttendanceSession).filter(StudentAttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    assert_school_access(db, user, session.school_id)
    db.query(StudentAttendanceMark).filter(StudentAttendanceMark.session_id == session.id).delete()
    db.delete(session)
    db.commit()
