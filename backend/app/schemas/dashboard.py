from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG
from app.schemas.activity import ActivityOut


class DashboardSummary(BaseModel):
    model_config = API_MODEL_CONFIG

    school_count: int = 0
    active_school_count: int = 0
    teacher_count: int = 0
    student_count: int = 0
    sponsor_count: int = 0
    open_ticket_count: int = 0
    pending_leave_count: int = 0
    avg_syllabus_completion: float = 0
    recent_activities: list[ActivityOut] = []
