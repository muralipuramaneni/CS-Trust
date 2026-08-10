# CS Trust

Frontend for **Chaitanya Saradhi Trust**, wired to the FastAPI + PostgreSQL backend in `../CS-Trust-backend`.

## Stack

- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS v4

## Prerequisites

1. Backend API running at `http://127.0.0.1:8000` (see `../CS-Trust-backend/README.md`)
2. PostgreSQL via Docker Compose from the backend folder

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` → `http://127.0.0.1:8000`.

Optional: set `VITE_API_BASE_URL` in `.env` (default `/api/v1`).

## Auth

| Route | Feature |
|-------|---------|
| `/login` | Email + password (JWT) |
| `/forgot-password` | Phone OTP → reset password |

### Demo credentials

Password for all seed accounts: **`demo1234`**

| Role | Email |
|------|-------|
| Admin | admin@chaitanyasaradhi.org |
| Teacher | teacher@chaitanyasaradhi.org |
| Sponsor | sponsor@chaitanyasaradhi.org |

**Demo OTP (forgot password):** `123456`

## Project structure

```
src/
  api/           # HTTP client + resource helpers
  components/    # UI + layout
  features/      # auth, admin, teacher, sponsor
  types/
  utils/
```
