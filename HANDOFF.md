# HANDOFF — gmail-ai-agent
> Archivo de traspaso para Claude. Actualizado automáticamente al cerrar cada jornada.

---

## Ubicación del proyecto
`/Users/db/Documents/GitHub/gmail-ai-agent`

## Stack
- **Backend:** Python 3.11+ · FastAPI · uvicorn (reload=True) · APScheduler
- **AI:** Google Gemini API (gemini-2.5-flash)
- **Google APIs:** Gmail API · Google Calendar API (OAuth2)
- **Frontend:** React + TypeScript · Vite
- **Tests:** pytest · httpx (backend) · Vitest + React Testing Library (frontend)
- **Infra:** Docker · docker-compose · GitHub Actions CI

---

## Estado actual
- **Rama activa:** `feature/briefing-and-fts-search`
- **PR abierto:** #22 — `feat: daily briefing with Gemini + FTS5 full-text search`
- **PR pendiente de merge:** #21 — `feat: manual meeting scheduling + settings panel`
- **Tests:** 85 backend ✅ · 93 frontend ✅ (178 total)

---

## Empezar aquí (próxima sesión)

1. `git checkout main && git pull origin main` — arrancar desde main limpio
2. Mergear PR #21 y PR #22 si están aprobados
3. `cd backend && source .venv/bin/activate && pytest tests/ -q` — confirmar 85 tests verdes
4. Elegir próxima tarea de la tabla de pendientes
5. Activar pipeline con `/dev <tarea>`

---

## Tareas pendientes (priorizadas)

| Prioridad | Tarea | Área |
|-----------|-------|------|
| Alta | Mergear PR #21 (manual scheduling + settings) | GitHub |
| Alta | Mergear PR #22 (briefing + FTS5 search) | GitHub |
| Media | Tests para BriefingPage (0% cobertura) | `frontend/src/test/` |
| Baja | Tests para `briefing_router.py` y `search_emails_fts()` | `backend/tests/` |

---

## Endpoints disponibles (backend)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/emails` | Correos no leídos clasificados (9 categorías) |
| GET | `/api/emails/stats` | Conteo por categoría en tiempo real |
| GET | `/api/emails/processed` | Historial SQLite (`?view=today\|history`) |
| GET | `/api/emails/search` | Búsqueda FTS5 (`?q=texto&category=&since=&until=`) |
| GET | `/api/stats/categories` | Distribución histórica por categoría |
| GET | `/api/stats/daily` | Volumen diario últimos N días |
| GET | `/api/stats/senders` | Top remitentes |
| POST | `/api/process` | Forzar ciclo de procesamiento |
| GET | `/api/briefing` | Briefing ejecutivo Gemini (`?date=YYYY-MM-DD`) |
| GET/PATCH | `/api/config` | Ver y actualizar configuración operativa |
| GET | `/api/calendar/events` | Próximos eventos (30 días) |
| POST | `/api/calendar/events` | Crear evento manual |
| PATCH | `/api/calendar/events/{id}` | Editar evento |
| DELETE | `/api/calendar/events/{id}` | Eliminar evento |

---

## Notas técnicas clave

- **FTS5:** tabla virtual `emails_fts` creada en `init_db.py`. Se reconstruye (DELETE + repopulate) en cada arranque para mantenerse sincronizada. En tests, el fixture `db` de `test_database.py` crea la tabla con SQL crudo.
- **Briefing:** `briefing_router.py` usa máximo 50 correos en el prompt de Gemini para no exceder tokens. Si no hay correos del día, devuelve respuesta vacía sin llamar a Gemini.
- **Highlight FTS5:** el componente `<Highlight>` en EmailsPage usa un regex case-insensitive para marcar coincidencias con `<mark>`.
- **CI GEMINI_API_KEY:** usa `dummy-key-for-ci-tests` en el step de pytest. Funciona porque los tests mockean Gemini.
- **Docker:** `docker-compose up --build` arranca todo. Requiere `backend/credentials.json` y `backend/token.json` montados como volúmenes.
- **Hot-reload activo:** `uvicorn.run("src.api.routes:app", reload=True)` — requiere string, no objeto app.

---

*Última actualización: 2026-03-23*
