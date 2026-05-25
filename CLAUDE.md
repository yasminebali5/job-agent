# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Run

Two processes, in separate terminals.

**Backend** (FastAPI, port 8000):

```
cd backend
python -m venv .venv
.venv\Scripts\activate            # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env            # then fill in ANTHROPIC_KEY and JWT_SECRET
uvicorn backend.main:app --reload --port 8000   # run from repo root
```

**Frontend** (Next.js, port 3000):

```
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

The Next.js app calls the FastAPI backend at the URL in `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). The backend reads `FRONTEND_ORIGIN` for CORS and must match where Next.js is served from.

There is no test suite or linter configured.

## Architecture

Two top-level apps:

- **`backend/`** — FastAPI service. Three responsibilities:
  1. User auth (signup/signin/signout/me) backed by SQLite via SQLAlchemy. Passwords hashed with bcrypt.
  2. JWT session management. Tokens are issued on signup/signin and stored in an **httpOnly cookie** named `jobly_session` (path `/`, samesite=lax). The frontend never sees the raw token.
  3. `/generate` — authenticated proxy that forwards the full Anthropic Messages API body to `https://api.anthropic.com/v1/messages`. This route requires a valid session cookie.
- **`frontend/`** — Next.js 14 App Router app (JavaScript, not TypeScript). Pages:
  - `/` — landing hero + 4-step form (`JobForm.js`). Requires auth; redirects to `/signin` if `/auth/me` returns 401.
  - `/signin` and `/signup` — auth pages sharing `AuthForm.js`.
- **`legacy/`** — the original Express + single-file `index.html` app, kept for reference only. Do not modify or run it.

The Next.js client uses `credentials: 'include'` on every fetch (see `frontend/app/lib/api.js`) so the httpOnly cookie travels on cross-origin calls. The backend's CORS middleware enables `allow_credentials=True` for `FRONTEND_ORIGIN`.

## Things that bite

- **Model ID is hardcoded** in `frontend/app/components/JobForm.js` inside `generateEmails()` (currently `claude-sonnet-4-6`). Update there, not in the backend — the backend forwards the body verbatim.
- **Prompt expects strict JSON output**: the model is asked to return a JSON array with keys `company, to, subject, body`. The frontend strips ` ```json ` fences then `JSON.parse`s. If you change the prompt, preserve that contract or `generateEmails()` will throw.
- **Language enforcement** uses the `LANG_CONFIG` map in `frontend/app/components/JobForm.js` — each language has an `instruction`, `flag`, and `greeting` injected into the prompt. Add new languages there, not in the `<select>` alone.
- **CORS + cookies**: changing the frontend or backend port requires updating `FRONTEND_ORIGIN` in `backend/.env` AND `NEXT_PUBLIC_API_URL` in `frontend/.env.local`. If they don't match, the browser silently drops the auth cookie and every authenticated call 401s.
- **Cookie security in prod**: set `COOKIE_SECURE=true` in `backend/.env` when serving over HTTPS, otherwise the browser will refuse the cookie on HTTPS pages.
- **Email sending is still client-side**: `nodemailer` is not used anywhere. The "Send Email" button opens a Gmail compose URL (`mail.google.com/mail/?view=cm&...`) in a new tab — there is no SMTP path.
