from typing import Literal

from pydantic import BaseModel

from app.schemas.common import API_MODEL_CONFIG


class AssetBase(BaseModel):
    model_config = API_MODEL_CONFIG

    type: str
    quantity: int = 0
    working_status: Literal["Working", "Needs Repair", "Not Working"]
    purchase_date: str
    warranty: str = ""
    school_id: str


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    type: str | None = None
    quantity: int | None = None
    working_status: Literal["Working", "Needs Repair", "Not Working"] | None = None
    purchase_date: str | None = None
    warranty: str | None = None
    school_id: str | None = None


class AssetOut(AssetBase):
    id: str
