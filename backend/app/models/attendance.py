from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TeacherAttendance(Base):
    __tablename__ = "teacher_attendance"
    __table_args__ = (
        UniqueConstraint("teacher_id", "date", name="uq_teacher_attendance_teacher_date"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    teacher_id: Mapped[str] = mapped_column(String(64), ForeignKey("teachers.id"), nullable=False, index=True)
    teacher_name: Mapped[str] = mapped_column(String(255), nullable=False)
    school_id: Mapped[str] = mapped_column(String(64), ForeignKey("schools.id"), nullable=False, index=True)
    school_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    clock_in: Mapped[str] = mapped_column(String(32), default="")
    in_location: Mapped[str] = mapped_column(String(255), default="")
    clock_out: Mapped[str] = mapped_column(String(32), default="")
    out_location: Mapped[str] = mapped_column(String(255), default="")
    hours: Mapped[str] = mapped_column(String(64), default="")
    device: Mapped[str | None] = mapped_column(String(128), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)


class StudentAttendanceSession(Base):
    __tablename__ = "student_attendance_sessions"
    __table_args__ = (
        UniqueConstraint(
            "school_id",
            "class_grade",
            "section",
            "date",
            name="uq_student_attendance_school_class_section_date",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    school_id: Mapped[str] = mapped_column(String(64), ForeignKey("schools.id"), nullable=False, index=True)
    class_grade: Mapped[str] = mapped_column(String(16), nullable=False)
    section: Mapped[str] = mapped_column(String(16), nullable=False)
    date: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    teacher_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    teacher_name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class StudentAttendanceMark(Base):
    __tablename__ = "student_attendance_marks"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_student_attendance_mark_session_student"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("student_attendance_sessions.id"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(String(64), ForeignKey("students.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(8), nullable=False)  # P | A
