from typing import Literal

from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class LeaveBase(BaseModel):
    model_config = API_MODEL_CONFIG

    teacher_id: str
    teacher_name: str
    type: str
    from_date: str
    to_date: str
    reason: str = ""
    status: Literal["Pending", "Approved", "Rejected"] = "Pending"


class LeaveCreate(LeaveBase):
    pass


class LeaveUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    teacher_id: str | None = None
    teacher_name: str | None = None
    type: str | None = None
    from_date: str | None = None
    to_date: str | None = None
    reason: str | None = None
    status: Literal["Pending", "Approved", "Rejected"] | None = None


class LeaveOut(LeaveBase):
    id: str
