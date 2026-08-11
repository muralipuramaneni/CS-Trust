from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import API_MODEL_CONFIG


class SponsorBase(BaseModel):
    model_config = API_MODEL_CONFIG

    name: str
    email: EmailStr
    phone: str
    organization: str = ""
    address: str = ""
    active: bool = True
    school_ids: list[str] = Field(default_factory=list)


class SponsorCreate(SponsorBase):
    password: str | None = None


class SponsorUpdate(BaseModel):
    model_config = API_MODEL_CONFIG

    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    organization: str | None = None
    address: str | None = None
    active: bool | None = None
    school_ids: list[str] | None = None


class SponsorOut(SponsorBase):
    id: str
    user_id: str | None = None


class SponsorCreateResponse(BaseModel):
    model_config = API_MODEL_CONFIG

    sponsor: SponsorOut
    temp_password: str
