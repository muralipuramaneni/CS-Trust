from typing import Literal

from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class StudentBase(BaseModel):
    model_config = API_MODEL_CONFIG

    student_id: str
    name: str
    gender: Literal["Male", "Female", "Other"]
    class_grade: str
    section: str
    parent_name: str = ""
    parent_phone: str = ""
    school_id: str
    status: Literal["active", "inactive", "transferred"] = "active"


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    student_id: str | None = None
    name: str | None = None
    gender: Literal["Male", "Female", "Other"] | None = None
    class_grade: str | None = None
    section: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    school_id: str | None = None
    status: Literal["active", "inactive", "transferred"] | None = None


class StudentOut(StudentBase):
    id: str
