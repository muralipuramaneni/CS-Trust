from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import School, Teacher, User
from app.services.auth import sponsor_school_ids, to_auth_user
from app.utils.security import TokenError, get_subject

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        user_id = get_subject(credentials.credentials)
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: str) -> Callable:
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _dep


require_admin = require_roles("admin")
require_teacher = require_roles("teacher")
require_sponsor = require_roles("sponsor")
require_admin_or_teacher = require_roles("admin", "teacher")
require_any_auth = require_roles("admin", "teacher", "sponsor")


def get_teacher_for_user(db: Session, user: User) -> Teacher | None:
    if user.role != "teacher":
        return None
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if teacher:
        return teacher
    # Fallback: match by email and link the account
    teacher = db.query(Teacher).filter(Teacher.email == user.email).first()
    if teacher:
        if not teacher.user_id:
            teacher.user_id = user.id
        if user.school_id != teacher.school_id:
            user.school_id = teacher.school_id
        db.commit()
        db.refresh(teacher)
    return teacher


def teacher_school_id(db: Session, user: User) -> str | None:
    if user.role != "teacher":
        return user.school_id
    teacher = get_teacher_for_user(db, user)
    return (teacher.school_id if teacher else None) or user.school_id


def assert_school_access(db: Session, user: User, school_id: str) -> None:
    if user.role == "admin":
        return
    if user.role == "teacher":
        assigned = teacher_school_id(db, user)
        if not assigned or assigned != school_id:
            raise HTTPException(status_code=403, detail="Teachers can only access their assigned school")
        return
    if user.role == "sponsor":
        allowed = sponsor_school_ids(db, user.id)
        if school_id not in allowed:
            raise HTTPException(status_code=403, detail="Sponsors can only access assigned schools")
        return
    raise HTTPException(status_code=403, detail="Access denied")


def accessible_school_ids(db: Session, user: User) -> list[str] | None:
    """None means all schools (admin)."""
    if user.role == "admin":
        return None
    if user.role == "teacher":
        sid = teacher_school_id(db, user)
        return [sid] if sid else []
    if user.role == "sponsor":
        return sponsor_school_ids(db, user.id)
    return []
