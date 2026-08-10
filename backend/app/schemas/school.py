from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import API_MODEL_CONFIG


class SchoolBase(BaseModel):
    model_config = API_MODEL_CONFIG

    name: str
    district: str
    mandal: str
    village: str
    principal_name: str
    contact_number: str
    student_count: int = 0
    computer_count: int = 0
    teacher_count: int = 0
    status: Literal["active", "disabled"] = "active"
    syllabus_completion: float = 0
    sponsor_id: str | None = None


class SchoolCreate(SchoolBase):
    pass


class SchoolUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    name: str | None = None
    district: str | None = None
    mandal: str | None = None
    village: str | None = None
    principal_name: str | None = None
    contact_number: str | None = None
    student_count: int | None = None
    computer_count: int | None = None
    teacher_count: int | None = None
    status: Literal["active", "disabled"] | None = None
    syllabus_completion: float | None = None
    sponsor_id: str | None = None


class SchoolOut(SchoolBase):
    id: str
