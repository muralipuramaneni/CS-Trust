# CS Trust

Monorepo for **Chaitanya Saradhi Trust**: React frontend + FastAPI backend.

## Structure

```
├── src/                 # Frontend (React + Vite)
├── backend/             # FastAPI + PostgreSQL API
├── package.json
└── README.md
```

## Stack

**Frontend:** React 19, TypeScript, Vite, React Router, Tailwind CSS v4  
**Backend:** FastAPI, SQLAlchemy, PostgreSQL (Supabase or Docker)

## Prerequisites

1. Node.js 20+
2. Python 3.11+
3. PostgreSQL (Docker Compose in `backend/` or Supabase)

## Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate          # Windows
# source .venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
copy .env.example .env            # then set DATABASE_URL / SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

## Frontend

```bash
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` → `http://127.0.0.1:8000`.

Optional: set `VITE_API_BASE_URL` in `.env` (default `/api/v1`). See `.env.example`.

## Auth

| Route | Feature |
|-------|---------|
| `/login` | Email + password (JWT) |
| `/change-password` | Required after admin-issued temp password |
| `/forgot-password` | Contact admin to reset |

### Demo credentials

Password for seed accounts: **`demo1234`**

| Role | Email |
|------|-------|
| Admin | admin@chaitanyasaradhi.org |
| Teacher | teacher@chaitanyasaradhi.org |
| Sponsor | sponsor@chaitanyasaradhi.org |

## Project structure (frontend)

```
src/
  api/           # HTTP client + resource helpers
  components/    # UI + layout
  features/      # auth, admin, teacher, sponsor
  types/
  utils/
```
