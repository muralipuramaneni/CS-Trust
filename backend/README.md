# CS-Trust Backend

FastAPI + PostgreSQL API for the Chaitanya Saradhi Trust school management app.

## Stack

- FastAPI
- SQLAlchemy 2.0 (sync) + psycopg2
- Alembic
- Pydantic v2 (camelCase JSON aliases)
- JWT auth (python-jose)
- passlib[bcrypt]

## Quick start

```bash
# 1. Start Postgres (maps host port 5433 → container 5432)
docker compose up -d

# 2. Create venv and install
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # or cp on Unix

# 3. Seed demo data
python -m app.services.seed

# Re-seed from scratch:
python -m app.services.seed --reset

# 4. Run API
uvicorn app.main:app --reload --port 8000
```

> **Note:** Compose publishes Postgres on **5433** because host `5432` is often already taken by a local install. If `5432` is free, you can change the mapping back to `"5432:5432"` and update `DATABASE_URL`.

Open docs: http://localhost:8000/docs

## Demo accounts

All seed passwords: **`demo1234`**

| Role    | Email                               |
|---------|-------------------------------------|
| Admin   | superadmin@chaitanyasaradhi.org     |
| Admin   | admin@chaitanyasaradhi.org          |
| Teacher | teacher@chaitanyasaradhi.org        |
| Teacher | ravi.kumar@chaitanyasaradhi.org     |
| Sponsor | sponsor@chaitanyasaradhi.org        |
| Sponsor | ananya.mehta@example.org            |
| Sponsor | vikram.reddy@example.org            |

Password-reset demo OTP is always **`123456`**.

## API prefix

All routes are under `/api/v1`.

Examples:

- `POST /api/v1/auth/login`
- `GET /api/v1/schools`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/reports/summary`

## Environment

See `.env.example`:

```
DATABASE_URL=postgresql+psycopg2://cstrust:cstrust@127.0.0.1:5433/cstrust
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=http://localhost:5173
```

## Alembic (optional)

Tables are also created on app startup via `create_all`. For migrations:

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## Notes

- JSON responses use **camelCase** to match the frontend TypeScript types.
- Teachers are scoped to their `schoolId`; sponsors to schools where `sponsorId` matches.
- Creating a teacher/sponsor also creates a linked `User` and returns `tempPassword`.
- PDF/Excel report exports return HTTP 501; JSON summaries are available now.
