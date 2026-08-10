from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import API_MODEL_CONFIG

Role = Literal["admin", "teacher", "sponsor"]


class AuthUserOut(BaseModel):
    model_config = API_MODEL_CONFIG

    id: str
    name: str
    email: EmailStr
    phone: str
    role: Role
    school_id: str | None = None
    school_ids: list[str] | None = None
    must_change_password: bool = False


class TokenResponse(BaseModel):
    """OAuth-style token payload keeps snake_case field names."""

    model_config = ConfigDict(populate_by_name=True)

    access_token: str
    token_type: str = "bearer"
    user: AuthUserOut


class LoginRequest(BaseModel):
    model_config = API_MODEL_CONFIG

    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    model_config = API_MODEL_CONFIG

    name: str
    email: EmailStr
    phone: str
    password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    model_config = API_MODEL_CONFIG

    current_password: str | None = None
    new_password: str = Field(min_length=8)


class MessageOut(BaseModel):
    model_config = API_MODEL_CONFIG

    message: str


class TempPasswordOut(BaseModel):
    model_config = API_MODEL_CONFIG

    temp_password: str
