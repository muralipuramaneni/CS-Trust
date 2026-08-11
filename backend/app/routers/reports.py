from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, require_any_auth
from app.models import Asset, LeaveRequest, School, Student, SupportTicket, Teacher, TeacherAttendance, User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
def report_summary(
    school_id: str | None = Query(None, alias="schoolId"),
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    allowed = accessible_school_ids(db, user)
    schools_q = db.query(School)
    if allowed is not None:
        schools_q = schools_q.filter(School.id.in_(allowed or ["__none__"]))
    if school_id:
        if allowed is not None and school_id not in allowed:
            raise HTTPException(status_code=403, detail="Access denied")
        schools_q = schools_q.filter(School.id == school_id)

    schools = schools_q.all()
    school_ids = [s.id for s in schools]

    return {
        "schools": len(schools),
        "teachers": db.query(Teacher).filter(Teacher.school_id.in_(school_ids or ["__none__"])).count(),
        "students": db.query(Student).filter(Student.school_id.in_(school_ids or ["__none__"])).count(),
        "assets": db.query(Asset).filter(Asset.school_id.in_(school_ids or ["__none__"])).count(),
        "openTickets": db.query(SupportTicket)
        .filter(
            SupportTicket.school_id.in_(school_ids or ["__none__"]),
            SupportTicket.status.in_(["Open", "Assigned", "In Progress"]),
        )
        .count(),
        "pendingLeaves": db.query(LeaveRequest).filter(LeaveRequest.status == "Pending").count(),
        "attendanceRecords": db.query(TeacherAttendance)
        .filter(TeacherAttendance.school_id.in_(school_ids or ["__none__"]))
        .count(),
        "avgSyllabusCompletion": round(
            sum(s.syllabus_completion for s in schools) / len(schools), 1
        )
        if schools
        else 0,
    }


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    format: str = Query("json"),
    user: User = Depends(require_any_auth),
):
    """PDF/Excel export stubs — return JSON summary or 501 for binary formats."""
    _ = user
    if format.lower() in {"pdf", "xlsx", "excel"}:
        raise HTTPException(status_code=501, detail=f"{format.upper()} export not implemented yet")
    return {
        "reportType": report_type,
        "format": "json",
        "message": "Use /reports/summary for JSON report data. PDF/Excel coming later.",
    }
