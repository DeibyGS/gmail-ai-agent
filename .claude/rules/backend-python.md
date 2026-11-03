---
paths:
  - "backend/**/*.py"
---

# Backend — Python / FastAPI Rules

## FastAPI Patterns
- Routers with `APIRouter`; mounted in `src/api/routes.py`
- Pydantic v2 models for all request/response bodies — never return raw dicts
- `HTTPException` with appropriate status codes; do not swallow exceptions

## SQLAlchemy Conventions
- Models in `src/database/models.py`; repository logic in `src/database/repository.py`
- SQLAlchemy 2.0 style (`Session.execute(select(...))`) — avoid legacy Query API
- Keep transactions short; do not hold sessions across async boundaries

## Google API Gotchas
- OAuth token in `backend/token.json` — delete and re-auth on `invalid_grant`
- Gemini API key from environment (`GEMINI_API_KEY`). CI uses `dummy-key-for-ci-tests`
- Mock all Gemini calls in tests — never make real network calls

## FTS5
- `emails_fts` is a virtual FTS5 table rebuilt on every server start
- Query with raw SQL via `session.execute(text(...))` — not ORM

## Testing
- Tests in `backend/tests/`. Run with `pytest tests/ -q`
- Mock external calls (Gmail API, Gemini) with `unittest.mock.patch`
