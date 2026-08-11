from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import School, Sponsor, Teacher, User
from app.schemas.auth import AuthUserOut
from app.utils.ids import generate_id, generate_temp_password
from app.utils.security import create_access_token, hash_password, verify_password


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


def sponsor_school_ids(db: Session, sponsor_id: str) -> list[str]:
    rows = db.query(School.id).filter(School.sponsor_id == sponsor_id).all()
    return [r[0] for r in rows]


def to_auth_user(db: Session, user: User) -> AuthUserOut:
    school_id = user.school_id
    school_ids: list[str] | None = None
    if user.role == "sponsor":
        school_ids = sponsor_school_ids(db, user.id)
    elif user.role == "teacher":
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        if not teacher:
            teacher = db.query(Teacher).filter(Teacher.email == user.email).first()
            if teacher and not teacher.user_id:
                teacher.user_id = user.id
        if teacher:
            school_id = teacher.school_id or school_id
            if user.school_id != school_id:
                user.school_id = school_id
                db.add(user)
                db.commit()
                db.refresh(user)
    return AuthUserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,  # type: ignore[arg-type]
        school_id=school_id,
        school_ids=school_ids,
        must_change_password=bool(getattr(user, "must_change_password", False)),
    )


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == normalize_email(email)).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    _ensure_profile_active(db, user)
    return user


def _ensure_profile_active(db: Session, user: User) -> None:
    if user.role == "teacher":
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        if not teacher:
            teacher = db.query(Teacher).filter(Teacher.email == user.email).first()
        if teacher is not None and not teacher.active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This teacher account is inactive. Contact your administrator.",
            )
    elif user.role == "sponsor":
        sponsor = db.query(Sponsor).filter(Sponsor.user_id == user.id).first()
        if not sponsor:
            sponsor = db.query(Sponsor).filter(Sponsor.email == user.email).first()
        if sponsor is not None and not sponsor.active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This sponsor account is inactive. Contact your administrator.",
            )


def issue_token_for_user(db: Session, user: User) -> dict:
    token = create_access_token(user.id, {"role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": to_auth_user(db, user),
    }


def change_password(
    db: Session,
    user: User,
    new_password: str,
    current_password: str | None = None,
) -> None:
    if not current_password:
        raise HTTPException(status_code=400, detail="Current password is required.")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not any(ch for ch in new_password if not ch.isalnum()):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one special character (!@#$…).",
        )
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the current password.")
    if verify_password(new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from the current password.")

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.add(user)
    db.commit()


def set_temporary_password(db: Session, user: User, password: str | None = None) -> str:
    temp_password = password or generate_temp_password()
    if len(temp_password) < 8:
        raise HTTPException(status_code=400, detail="Temporary password must be at least 8 characters.")
    user.password_hash = hash_password(temp_password)
    user.must_change_password = True
    db.add(user)
    db.commit()
    return temp_password


def signup_sponsor(db: Session, name: str, email: str, phone: str, password: str) -> User:
    email_n = normalize_email(email)
    phone_n = normalize_phone(phone)
    if len(phone_n) != 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit Indian mobile number.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if db.query(User).filter(User.email == email_n).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if db.query(User).filter(User.phone == phone_n).first():
        raise HTTPException(status_code=400, detail="An account with this phone number already exists.")

    user_id = generate_id("usr")
    user = User(
        id=user_id,
        name=name.strip(),
        email=email_n,
        phone=phone_n,
        password_hash=hash_password(password),
        role="sponsor",
        must_change_password=False,
    )
    sponsor = Sponsor(
        id=user_id,
        name=user.name,
        email=email_n,
        phone=phone_n,
        organization="",
        address="",
        active=True,
        user_id=user_id,
    )
    db.add(user)
    db.add(sponsor)
    db.commit()
    db.refresh(user)
    return user


def create_teacher_with_user(db: Session, data: dict, password: str | None = None) -> tuple[Teacher, str]:
    temp_password = password or generate_temp_password()
    email = normalize_email(data["email"])
    phone = normalize_phone(data["mobile"])
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already in use.")
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(status_code=400, detail="Phone already in use.")

    user_id = generate_id("usr")
    teacher_id = data.get("id") or generate_id("tch", 2)
    user = User(
        id=user_id,
        name=data["name"],
        email=email,
        phone=phone,
        password_hash=hash_password(temp_password),
        role="teacher",
        school_id=data["school_id"],
        must_change_password=True,
    )
    teacher = Teacher(
        id=teacher_id,
        employee_id=data["employee_id"],
        name=data["name"],
        mobile=phone,
        email=email,
        qualification=data.get("qualification") or "",
        joining_date=data["joining_date"],
        school_id=data["school_id"],
        assigned_classes=data.get("assigned_classes") or [],
        active=data.get("active", True),
        photo_url=data.get("photo_url"),
        user_id=user_id,
    )
    db.add(user)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher, temp_password


def create_sponsor_with_user(db: Session, data: dict, password: str | None = None) -> tuple[Sponsor, str]:
    temp_password = password or generate_temp_password()
    email = normalize_email(data["email"])
    phone = normalize_phone(data["phone"])
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already in use.")
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(status_code=400, detail="Phone already in use.")

    user_id = data.get("id") or generate_id("usr")
    user = User(
        id=user_id,
        name=data["name"],
        email=email,
        phone=phone,
        password_hash=hash_password(temp_password),
        role="sponsor",
        must_change_password=True,
    )
    sponsor = Sponsor(
        id=user_id,
        name=data["name"],
        email=email,
        phone=phone,
        organization=data.get("organization") or "",
        address=data.get("address") or "",
        active=data.get("active", True),
        user_id=user_id,
    )
    db.add(user)
    db.add(sponsor)

    school_ids = data.get("school_ids") or []
    if school_ids:
        db.query(School).filter(School.id.in_(school_ids)).update(
            {School.sponsor_id: user_id}, synchronize_session=False
        )
    db.commit()
    db.refresh(sponsor)
    return sponsor, temp_password
