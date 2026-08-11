from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class School(Base):
    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[str] = mapped_column(String(128), nullable=False)
    mandal: Mapped[str] = mapped_column(String(128), nullable=False)
    village: Mapped[str] = mapped_column(String(128), nullable=False)
    principal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(20), nullable=False)
    student_count: Mapped[int] = mapped_column(Integer, default=0)
    computer_count: Mapped[int] = mapped_column(Integer, default=0)
    teacher_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="active")
    syllabus_completion: Mapped[float] = mapped_column(Float, default=0)
    sponsor_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    teachers = relationship("Teacher", back_populates="school")
    students = relationship("Student", back_populates="school")
