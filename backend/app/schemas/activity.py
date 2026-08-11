from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class ActivityBase(BaseModel):
    model_config = API_MODEL_CONFIG

    text: str
    time: str


class ActivityCreate(ActivityBase):
    pass


class ActivityOut(ActivityBase):
    id: str
    created_at: datetime | None = None
