# Jobly - AI Job Application Assistant

A two-app project: a FastAPI backend and a Next.js frontend.

## Setup

### Backend (FastAPI, port 8000)

```
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # fill in ANTHROPIC_KEY and JWT_SECRET
```

From the repo root:

```
uvicorn backend.main:app --reload --port 8000
```

On first run, `jobly.db` (SQLite) is created automatically.

### Frontend (Next.js, port 3000)

```
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Open http://localhost:3000.

## Auth

- Sign up at `/signup`, sign in at `/signin`.
- Sessions are JWTs stored in an httpOnly cookie (`jobly_session`). The frontend never sees the raw token.
- The main app at `/` redirects to `/signin` when no valid session exists.

## Legacy

The original Express + single-file HTML app lives in `legacy/` for reference. It is not wired up.
