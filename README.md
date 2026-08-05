# Jobly — AI Job Application Assistant

A two-app project: a FastAPI backend and a Next.js frontend that helps you generate personalized job application emails, track resumes, and manage target companies.

## Setup

Two processes, in separate terminals.

### Backend (FastAPI, port 8000)

```
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # fill in ANTHROPIC_KEY, JWT_SECRET, and SMTP_* (for password reset emails)
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

The frontend calls the backend at the URL in `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). The backend reads `FRONTEND_ORIGIN` for CORS, and it must match where the frontend is actually served — if they don't match, the browser silently drops the auth cookie and every authenticated request 401s.

There is no test suite or linter configured.

## Architecture

- **`backend/`** — FastAPI service with three responsibilities:
  1. **Auth** — signup/signin/signout/me, plus forgot-password/reset-password, backed by SQLite via SQLAlchemy. Passwords are hashed with bcrypt.
  2. **Session management** — JWTs issued on signup/signin, stored in an httpOnly cookie (`jobly_session`, path `/`, samesite=lax). The frontend never sees the raw token.
  3. **`/generate`** — authenticated endpoint that turns job details into a personalized application email. It tries LLM providers in order — **Anthropic → OpenRouter → Hugging Face → Groq → local Ollama** — falling through to the next on any error (missing key, HTTP error, timeout, connection refused). Whichever provider responds, its output is normalized back into a consistent response shape before returning, so the frontend's parsing doesn't need to know which provider actually served the request.

- **`frontend/`** — Next.js 14 App Router app (JavaScript). Pages:
  - `/` — landing hero + 4-step application form. Requires auth; redirects to `/signin` if not signed in.
  - `/signin` / `/signup` — auth pages.
  - `/forgot-password` — request a password reset email.
  - `/reset-password?token=...` — set a new password using the emailed token.
  - `/resumes` — manage saved resumes.
  - `/companies` — manage target companies.

- **`legacy/`** — the original Express + single-file `index.html` app, kept for reference only. Not wired up; don't run it.

## Password reset flow

- `POST /auth/forgot-password` always returns `204`, whether or not the email is registered (avoids account enumeration). If the account exists, it creates a row in `password_reset_tokens` (a random token, expiring after `RESET_TOKEN_EXPIRE_MINUTES`, default 30) and emails a reset link to `{FRONTEND_ORIGIN}/reset-password?token=...`.
- `POST /auth/reset-password` validates the token (exists, unused, unexpired), updates the password, and marks the token used. Tokens are single-use.
- Email is sent over real SMTP (STARTTLS) — requires `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` in `backend/.env`. Without them, `/auth/forgot-password` returns a `500` for existing accounts. This is the only place in the app that sends real email — the job-application "Send Email" button (below) is unrelated and stays client-side.

## Known gotchas

- **Model ID is hardcoded** in the frontend's email-generation call (currently `claude-sonnet-4-6`). It only controls the Anthropic call — it's ignored when the backend falls through to OpenRouter or Ollama, whose models are set separately via `OPENROUTER_MODEL` and `OLLAMA_MODEL` in `backend/.env`.
- **Provider fallback is silent**: `/generate` doesn't report which provider actually answered. Output quality/latency can vary a lot depending on which one responds. A provider is skipped (not a hard failure) if its key/host isn't configured; `/generate` only returns `502` if all five fail.
- **Strict JSON contract**: the model is prompted to return a JSON array with keys `company, to, subject, body`. The frontend strips ` ```json ` fences then parses it — changing the prompt needs to preserve that contract.
- **CORS + cookies**: changing the frontend or backend port requires updating `FRONTEND_ORIGIN` in `backend/.env` *and* `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to match.
- **Cookie security in prod**: set `COOKIE_SECURE=true` in `backend/.env` when serving over HTTPS, otherwise the browser refuses the cookie.
- **Email sending for applications is still client-side**: the "Send Email" button opens a Gmail compose URL in a new tab — there's no SMTP path for it. (This is separate from the password-reset email flow above, which does use real SMTP.)
