# gmail-ai-agent — Project Instructions

Personal Gmail AI agent that processes emails on demand and surfaces them via a dashboard.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI 0.135, SQLAlchemy 2.0, SQLite, uvicorn |
| AI | Google Gemini (google-genai 1.68 / google-generativeai 0.8) |
| Gmail API | google-api-python-client, google-auth-oauthlib |
| Frontend | React 19, TypeScript 5.9, Vite 8, Axios, react-big-calendar, recharts |
| Testing | pytest (backend), Vitest + Testing Library (frontend) |

## Commands

```bash
# Backend
cd backend && source .venv/bin/activate
python main.py                    # start API on http://localhost:8000
pytest tests/ -q                  # run tests
ruff check src/                   # lint

# Frontend
cd frontend
npm run dev                       # dev server
npm run build                     # tsc + vite build
npm test                          # vitest

# Global start
email-agent                       # symlink at /usr/local/bin/email-agent
```

## Architecture

Monorepo: `backend/` (FastAPI, routers in `src/api/`, models in `src/database/`) and `frontend/` (React SPA).
Email processing is **manual-only** — triggered by POST `/api/process`, never on a scheduler.

## Critical Gotchas

1. **OAuth `invalid_grant`**: delete `backend/token.json`, restart server, re-authenticate in browser.
2. **CI Gemini key**: CI uses `dummy-key-for-ci-tests` — all Gemini calls mocked in tests.
3. **FTS5 table `emails_fts`**: rebuilt on every server start (`src/database/init_db.py`). Do not persist FTS data externally.
4. **No automatic scheduler**: APScheduler listed but automatic mode intentionally removed. Processing only via user click.
5. **Never commit** `token.json` or `credentials.json` — both in `.gitignore`.

## Current State

24/24 PRs merged, 178 tests green — maintenance mode.
Pending: tests for `BriefingPage` and `briefing_router.py` / `search_emails_fts()`.
