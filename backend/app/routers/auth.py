from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.auth import (
    AuthUserOut,
    ChangePasswordRequest,
    LoginRequest,
    MessageOut,
    SignupRequest,
    TokenResponse,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    return auth_service.issue_token_for_user(db, user)


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    user = auth_service.signup_sponsor(db, payload.name, payload.email, payload.phone, payload.password)
    return auth_service.issue_token_for_user(db, user)


@router.get("/me", response_model=AuthUserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return auth_service.to_auth_user(db, user)


@router.post("/logout", response_model=MessageOut)
def logout():
    return MessageOut(message="Logged out")


@router.post("/change-password", response_model=MessageOut)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auth_service.change_password(
        db,
        user,
        new_password=payload.new_password,
        current_password=payload.current_password,
    )
    return MessageOut(message="Password updated successfully.")
