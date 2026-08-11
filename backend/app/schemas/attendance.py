from pydantic import BaseModel, Field

from app.schemas.common import API_MODEL_CONFIG


class TeacherAttendanceBase(BaseModel):
    model_config = API_MODEL_CONFIG

    teacher_id: str
    teacher_name: str
    school_id: str
    school_name: str
    date: str
    clock_in: str = ""
    in_location: str = ""
    clock_out: str = ""
    out_location: str = ""
    hours: str = ""
    device: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class TeacherAttendanceCreate(TeacherAttendanceBase):
    pass


class TeacherAttendanceUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    teacher_id: str | None = None
    teacher_name: str | None = None
    school_id: str | None = None
    school_name: str | None = None
    date: str | None = None
    clock_in: str | None = None
    in_location: str | None = None
    clock_out: str | None = None
    out_location: str | None = None
    hours: str | None = None
    device: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class TeacherAttendanceOut(TeacherAttendanceBase):
    id: str


class StudentMarkIn(BaseModel):
    model_config = API_MODEL_CONFIG

    student_id: str
    status: str  # P | A


class StudentAttendanceSessionCreate(BaseModel):
    model_config = API_MODEL_CONFIG

    school_id: str
    class_grade: str
    section: str
    date: str
    teacher_id: str | None = None
    teacher_name: str | None = None
    marks: list[StudentMarkIn] = Field(default_factory=list)


class StudentAttendanceMarkOut(BaseModel):
    model_config = API_MODEL_CONFIG

    id: str
    session_id: str
    student_id: str
    status: str


class StudentAttendanceSessionOut(BaseModel):
    model_config = API_MODEL_CONFIG

    id: str
    school_id: str
    class_grade: str
    section: str
    date: str
    teacher_id: str | None = None
    teacher_name: str | None = None
    marks: list[StudentAttendanceMarkOut] = Field(default_factory=list)
