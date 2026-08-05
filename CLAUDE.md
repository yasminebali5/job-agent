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
copy .env.example .env            # then fill in ANTHROPIC_KEY, JWT_SECRET, and SMTP_* (for password reset emails)
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
  1. User auth (signup/signin/signout/me, forgot-password/reset-password) backed by SQLite via SQLAlchemy. Passwords hashed with bcrypt.
  2. JWT session management. Tokens are issued on signup/signin and stored in an **httpOnly cookie** named `jobly_session` (path `/`, samesite=lax). The frontend never sees the raw token.
  3. `/generate` — authenticated endpoint (`backend/routers/generate.py`). The frontend always sends an Anthropic Messages API-shaped body (`model`, `max_tokens`, `messages`). The backend tries providers in order — **Anthropic → OpenRouter → Hugging Face → Groq → local Ollama** — falling through to the next on any error (missing key, HTTP error, timeout, connection refused). Whichever provider responds, its output is normalized back into the Anthropic response shape (`{content: [{type: "text", text: ...}]}`) before returning, so the frontend's parsing never needs to know which provider actually served the request. This route requires a valid session cookie.
- **`frontend/`** — Next.js 14 App Router app (JavaScript, not TypeScript). Pages:
  - `/` — landing hero + 4-step form (`JobForm.js`). Requires auth; redirects to `/signin` if `/auth/me` returns 401.
  - `/signin` and `/signup` — auth pages sharing `AuthForm.js`.
  - `/forgot-password` — request a password reset email (`ForgotPasswordForm.js`).
  - `/reset-password?token=...` — set a new password using the emailed token (`ResetPasswordForm.js`).
- **`legacy/`** — the original Express + single-file `index.html` app, kept for reference only. Do not modify or run it.

### Password reset flow

- `POST /auth/forgot-password` always returns `204` regardless of whether the email is registered (avoids account enumeration). If the user exists, it creates a row in `password_reset_tokens` (random `secrets.token_urlsafe(32)`, expires after `RESET_TOKEN_EXPIRE_MINUTES`, default 30) and emails a link `{FRONTEND_ORIGIN}/reset-password?token=...` via `backend/email_utils.py`.
- `POST /auth/reset-password` validates the token (exists, unused, unexpired), updates `password_hash`, and marks the token used. Tokens are single-use.
- Email is sent over real SMTP (`smtplib`, STARTTLS) — requires `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` set in `backend/.env`. Without them, `/auth/forgot-password` returns a `500` for existing accounts (see `email_utils.send_password_reset_email`). This is the one place in the app that sends real email; the job-application "Send Email" flow described below is unrelated and stays client-side.

The Next.js client uses `credentials: 'include'` on every fetch (see `frontend/app/lib/api.js`) so the httpOnly cookie travels on cross-origin calls. The backend's CORS middleware enables `allow_credentials=True` for `FRONTEND_ORIGIN`.

## Things that bite

- **Model ID is hardcoded** in `frontend/app/components/JobForm.js` inside `generateEmails()` (currently `claude-sonnet-4-6`) — but this only controls the Anthropic call. It's ignored when the backend falls through to OpenRouter or Ollama, whose models are set separately via `OPENROUTER_MODEL` and `OLLAMA_MODEL` in `backend/.env`.
- **Provider fallback is silent by design**: `/generate` doesn't tell the frontend which provider actually answered. If Anthropic is down/misconfigured, requests silently degrade to OpenRouter, then Hugging Face, then Groq, then local Ollama (`OLLAMA_URL`, default `http://localhost:11434`) — output quality/latency can vary a lot between them. A provider is skipped (not treated as a hard failure) if its key/host isn't configured; `/generate` only returns `502` if all five fail.
- **Prompt expects strict JSON output**: the model is asked to return a JSON array with keys `company, to, subject, body`. The frontend strips ` ```json ` fences then `JSON.parse`s. If you change the prompt, preserve that contract or `generateEmails()` will throw. This applies regardless of which provider answers, since all responses are normalized to the same shape.
- **Language enforcement** uses the `LANG_CONFIG` map in `frontend/app/components/JobForm.js` — each language has an `instruction`, `flag`, and `greeting` injected into the prompt. Add new languages there, not in the `<select>` alone.
- **CORS + cookies**: changing the frontend or backend port requires updating `FRONTEND_ORIGIN` in `backend/.env` AND `NEXT_PUBLIC_API_URL` in `frontend/.env.local`. If they don't match, the browser silently drops the auth cookie and every authenticated call 401s.
- **Cookie security in prod**: set `COOKIE_SECURE=true` in `backend/.env` when serving over HTTPS, otherwise the browser will refuse the cookie on HTTPS pages.
- **Email sending is still client-side**: `nodemailer` is not used anywhere. The "Send Email" button opens a Gmail compose URL (`mail.google.com/mail/?view=cm&...`) in a new tab — there is no SMTP path.
