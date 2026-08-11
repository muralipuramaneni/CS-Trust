# CS Trust

Monorepo for **Chaitanya Saradhi Trust** with separate frontend and backend folders.

## Structure

```
CS-Trust/
├── frontend/     # React 19 + Vite + Tailwind
├── backend/      # FastAPI + PostgreSQL
├── scripts/      # layout migration helper
├── package.json  # root shortcuts (npm run dev)
└── README.md
```

After `git pull`, run once from the repo root:

```bash
npm run setup
```

This rearranges any leftover files from the older root-level frontend layout into `frontend/`.

## Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate          # Windows
# source .venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
# create backend/.env with DATABASE_URL (do not commit)
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Or from repo root:

```bash
npm run setup
npm run dev
```

App: http://localhost:5173 (Vite proxies `/api` → `http://127.0.0.1:8000`)

## Demo login

Password: **`demo1234`**

| Role | Email |
|------|-------|
| Admin | admin@chaitanyasaradhi.org |
| Teacher | teacher@chaitanyasaradhi.org |
| Sponsor | sponsor@chaitanyasaradhi.org |

## Auth routes

| Route | Feature |
|-------|---------|
| `/login` | Email + password (JWT) |
| `/change-password` | Required after admin-issued temp password |
| `/forgot-password` | Contact admin to reset |
