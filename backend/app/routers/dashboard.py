from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, require_any_auth
from app.models import Activity, LeaveRequest, School, Sponsor, Student, SupportTicket, Teacher, User
from app.schemas.activity import ActivityOut
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    allowed = accessible_school_ids(db, user)

    schools_q = db.query(School)
    teachers_q = db.query(Teacher)
    students_q = db.query(Student)
    tickets_q = db.query(SupportTicket).filter(SupportTicket.status.in_(["Open", "Assigned", "In Progress"]))

    if allowed is not None:
        ids = allowed or ["__none__"]
        schools_q = schools_q.filter(School.id.in_(ids))
        teachers_q = teachers_q.filter(Teacher.school_id.in_(ids))
        students_q = students_q.filter(Student.school_id.in_(ids))
        tickets_q = tickets_q.filter(SupportTicket.school_id.in_(ids))

    school_count = schools_q.count()
    active_school_count = schools_q.filter(School.status == "active").count()
    avg = schools_q.with_entities(func.coalesce(func.avg(School.syllabus_completion), 0)).scalar() or 0

    pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == "Pending")
    if user.role == "teacher":
        from app.deps import get_teacher_for_user

        teacher = get_teacher_for_user(db, user)
        if teacher:
            pending_leaves = pending_leaves.filter(LeaveRequest.teacher_id == teacher.id)
        else:
            pending_leaves = pending_leaves.filter(False)
    elif user.role == "sponsor":
        pending_leaves = pending_leaves.filter(False)

    sponsor_count = db.query(Sponsor).count() if user.role == "admin" else 0
    activities = db.query(Activity).order_by(Activity.created_at.desc()).limit(10).all()

    return DashboardSummary(
        school_count=school_count,
        active_school_count=active_school_count,
        teacher_count=teachers_q.count(),
        student_count=students_q.count(),
        sponsor_count=sponsor_count,
        open_ticket_count=tickets_q.count(),
        pending_leave_count=pending_leaves.count(),
        avg_syllabus_completion=round(float(avg), 1),
        recent_activities=[ActivityOut.model_validate(a) for a in activities],
    )
