from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import API_MODEL_CONFIG


class TeacherBase(BaseModel):
    model_config = API_MODEL_CONFIG

    employee_id: str
    name: str
    mobile: str
    email: EmailStr
    qualification: str = ""
    joining_date: str
    school_id: str
    assigned_classes: list[str] = Field(default_factory=list)
    active: bool = True
    photo_url: str | None = None


class TeacherCreate(TeacherBase):
    password: str | None = None


class TeacherUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    employee_id: str | None = None
    name: str | None = None
    mobile: str | None = None
    email: EmailStr | None = None
    qualification: str | None = None
    joining_date: str | None = None
    school_id: str | None = None
    assigned_classes: list[str] | None = None
    active: bool | None = None
    photo_url: str | None = None


class TeacherOut(TeacherBase):
    id: str
    user_id: str | None = None


class TeacherCreateResponse(BaseModel):
    model_config = API_MODEL_CONFIG

    teacher: TeacherOut
    temp_password: str
