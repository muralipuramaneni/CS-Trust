# CS Trust

Frontend for **Chaitanya Saradhi Trust**.

## Stack

- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS v4

## Getting started

```bash
npm install
npm run dev
```

Open the app at the local URL Vite prints (default `http://localhost:5173`).

## Auth (Phase 1 — frontend only)

| Route | Feature |
|-------|---------|
| `/login` | Email + password sign in |
| `/signup` | Create account (name, email, phone, password) |
| `/forgot-password` | Phone OTP → reset password |

No backend yet — users and sessions are stored in browser `localStorage`.

### Demo credentials

Password for all demo accounts: **`demo123`**

| Role | Email | Phone |
|------|-------|-------|
| Super Admin | superadmin@chaitanyasaradhi.org | 9876543210 |
| Admin | admin@chaitanyasaradhi.org | 9876543211 |
| User | user@chaitanyasaradhi.org | 9876543212 |

**Demo OTP (forgot password):** `123456`

## Project structure

```
src/
  components/ui + layout
  features/auth/
  pages/
  routes/
  types/
  utils/
```
