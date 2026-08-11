from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SyllabusProgress(Base):
    __tablename__ = "syllabus_progress"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    school_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    school_name: Mapped[str] = mapped_column(String(255), nullable=False)
    teacher_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    teacher_name: Mapped[str] = mapped_column(String(255), nullable=False)
    class_label: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(128), nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    completed_pct: Mapped[float] = mapped_column(Float, default=0)
    topics_done: Mapped[int] = mapped_column(Integer, default=0)
    topics_total: Mapped[int] = mapped_column(Integer, default=0)
