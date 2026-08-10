from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class TeachingLogBase(BaseModel):
    model_config = API_MODEL_CONFIG

    teacher_id: str
    school_id: str
    class_grade: str
    section: str
    subject: str
    topic: str
    duration_minutes: int = 0
    remarks: str = ""
    date: str


class TeachingLogCreate(TeachingLogBase):
    pass


class TeachingLogUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    teacher_id: str | None = None
    school_id: str | None = None
    class_grade: str | None = None
    section: str | None = None
    subject: str | None = None
    topic: str | None = None
    duration_minutes: int | None = None
    remarks: str | None = None
    date: str | None = None


class TeachingLogOut(TeachingLogBase):
    id: str
    created_at: datetime | None = None
