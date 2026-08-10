from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class EventBase(BaseModel):
    model_config = API_MODEL_CONFIG

    school_id: str
    name: str
    date: str
    description: str = ""


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    school_id: str | None = None
    name: str | None = None
    date: str | None = None
    description: str | None = None


class EventOut(EventBase):
    id: str
