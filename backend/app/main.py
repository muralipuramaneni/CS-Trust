from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
import app.models  # noqa: F401 — register models
from app.routers import (
    activities,
    assets,
    attendance,
    auth,
    dashboard,
    events,
    leaves,
    reports,
    schools,
    sponsors,
    students,
    syllabus,
    teachers,
    teaching_logs,
    tickets,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    from sqlalchemy import text
    from sqlalchemy.exc import ProgrammingError

    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except ProgrammingError as exc:
        if "already exists" not in str(exc).lower():
            raise

    # create_all does not alter existing tables — ensure critical indexes/columns.
    ensure_sql = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE teaching_logs ADD COLUMN IF NOT EXISTS period INTEGER NOT NULL DEFAULT 0",
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_attendance_teacher_date
        ON teacher_attendance (teacher_id, date)
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_student_attendance_school_class_section_date
        ON student_attendance_sessions (school_id, class_grade, section, date)
        """,
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_student_attendance_mark_session_student
        ON student_attendance_marks (session_id, student_id)
        """,
    ]
    with engine.begin() as conn:
        for stmt in ensure_sql:
            try:
                conn.execute(text(stmt))
            except Exception:
                # Index may fail if duplicate rows already exist — app still has request-level checks.
                pass
    yield


app = FastAPI(
    title="CS-Trust API",
    description="School management backend for Chaitanya Saradhi Trust",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    schools.router,
    teachers.router,
    sponsors.router,
    students.router,
    attendance.router,
    leaves.router,
    syllabus.router,
    teaching_logs.router,
    assets.router,
    tickets.router,
    events.router,
    dashboard.router,
    activities.router,
    reports.router,
):
    app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
