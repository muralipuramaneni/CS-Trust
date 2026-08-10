from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class TicketBase(BaseModel):
    model_config = API_MODEL_CONFIG

    type: str
    status: Literal["Open", "Assigned", "In Progress", "Resolved", "Closed"] = "Open"
    school_id: str
    raised_by: str
    description: str
    photo_url: str | None = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    type: str | None = None
    status: Literal["Open", "Assigned", "In Progress", "Resolved", "Closed"] | None = None
    school_id: str | None = None
    raised_by: str | None = None
    description: str | None = None
    photo_url: str | None = None


class TicketOut(TicketBase):
    id: str
    created_at: datetime | None = None
