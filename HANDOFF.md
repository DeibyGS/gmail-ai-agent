# HANDOFF — gmail-ai-agent
> Archivo de traspaso para Claude. Actualizado automáticamente por `day-wrap` al cerrar cada jornada.

---

## Ubicación del proyecto
`/Users/db/Documents/GitHub/gmail-ai-agent`

## Stack
- **Backend:** Python 3.11+ · FastAPI · uvicorn · APScheduler
- **AI:** Google Gemini API
- **Google APIs:** Gmail API · Google Calendar API (OAuth2)
- **Frontend:** React + TypeScript · Vite
- **Tests:** pytest · httpx (backend) · Vitest + React Testing Library (frontend)

---

## Estado actual
- **Progreso:** 97% (13 PRs mergeados)
- **Último PR mergeado:** PR #13 — `test(frontend): Vitest + RTL + coverage`
- **Rama activa al cerrar:** `feature/frontend-tests` (upstream desaparecido — hacer checkout a main)

---

## Empezar aquí (próxima sesión)

1. `git checkout main && git pull origin main` — arrancar desde main limpio
2. Verificar que PR #13 está mergeado en GitHub
3. `cd frontend && npm test` — confirmar que los 44 tests siguen pasando
4. Elegir próxima feature (ver tabla de pendientes abajo)
5. Activar pipeline con `/dev <feature>`

---

## Tareas pendientes (priorizadas)

| Prioridad | Tarea | Archivo/Área |
|-----------|-------|--------------|
| Alta | GitHub Actions CI: correr tests en cada PR | `.github/workflows/` |
| Alta | Docker: docker-compose para backend + frontend | `Dockerfile` · `docker-compose.yml` |
| Media | Tests para EmailsPage y StatsPage (0% coverage actual) | `frontend/src/test/` |
| Baja | Limpiar ramas locales ya mergeadas | git |
| Baja | `git branch --unset-upstream` en feature/frontend-tests | git |

---

## Endpoints disponibles (backend)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/emails` | Correos no leídos clasificados |
| GET | `/api/emails/stats` | Conteo por categoría |
| GET | `/api/emails/history` | Historial SQLite con filtros |
| GET | `/api/emails/stats/history` | Estadísticas históricas |
| GET | `/api/emails/stats/daily` | Volumen diario |
| GET | `/api/emails/stats/senders` | Top remitentes |
| POST | `/api/process` | Forzar ciclo de procesamiento |
| GET | `/api/calendar/events` | Próximos eventos (30 días) |
| POST | `/api/calendar/events` | Crear evento manual |
| DELETE | `/api/calendar/events/{id}` | Eliminar evento |
| GET | `/health` | Health check |

---

## Notas técnicas clave

- **Editar evento:** flujo DELETE + POST (Google Calendar no tiene PATCH nativo)
- **Pipeline optimizado:** `quality.md` fusiona refactor + security (~35% menos tokens por pipeline)
- **Telemetría activa:** `CLAUDE_CODE_ENABLE_TELEMETRY=1` en `~/.claude/settings.json` — muestra tokens en consola
- **Checkpoint Step 8.5:** Scrum Master verifica todos los agentes antes del git — obligatorio
- **Protocolo 3 opciones:** siempre presentar antes de ejecutar cualquier tarea

---

*Última actualización: 2026-03-20*
