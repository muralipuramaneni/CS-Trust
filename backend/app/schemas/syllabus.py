from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class SyllabusBase(BaseModel):
    model_config = API_MODEL_CONFIG

    school_id: str
    school_name: str
    teacher_id: str | None = None
    teacher_name: str
    class_label: str
    subject: str
    topic: str
    completed_pct: float = 0
    topics_done: int = 0
    topics_total: int = 0


class SyllabusCreate(SyllabusBase):
    pass


class SyllabusUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    school_id: str | None = None
    school_name: str | None = None
    teacher_id: str | None = None
    teacher_name: str | None = None
    class_label: str | None = None
    subject: str | None = None
    topic: str | None = None
    completed_pct: float | None = None
    topics_done: int | None = None
    topics_total: int | None = None


class SyllabusOut(SyllabusBase):
    id: str
