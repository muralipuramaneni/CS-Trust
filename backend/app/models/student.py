from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[str] = mapped_column(String(32), nullable=False)
    class_grade: Mapped[str] = mapped_column(String(16), nullable=False)
    section: Mapped[str] = mapped_column(String(16), nullable=False)
    parent_name: Mapped[str] = mapped_column(String(255), default="")
    parent_phone: Mapped[str] = mapped_column(String(20), default="")
    school_id: Mapped[str] = mapped_column(String(64), ForeignKey("schools.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active")

    school = relationship("School", back_populates="students")
