from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    qualification: Mapped[str] = mapped_column(String(255), default="")
    joining_date: Mapped[str] = mapped_column(String(32), nullable=False)
    school_id: Mapped[str] = mapped_column(String(64), ForeignKey("schools.id"), nullable=False)
    assigned_classes: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)

    school = relationship("School", back_populates="teachers")
    user = relationship("User", back_populates="teacher_profile", foreign_keys=[user_id])
