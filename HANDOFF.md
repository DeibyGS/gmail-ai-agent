# HANDOFF — gmail-ai-agent
> Archivo de traspaso para Claude. Actualizado automáticamente por `day-wrap` al cerrar cada jornada.

---

## Ubicación del proyecto
`/Users/db/Documents/github/gmail-ai-agent`

## Stack
- **Backend:** Python 3.11+ · FastAPI · uvicorn · APScheduler
- **AI:** Google Gemini API
- **Google APIs:** Gmail API · Google Calendar API (OAuth2)
- **Frontend:** React + TypeScript · Vite (en desarrollo)
- **Tests:** pytest · pytest-asyncio · httpx

---

## Estado actual
- **Progreso:** 87% (7 de 8 fases completadas)
- **Fase activa:** Fase 8 — Frontend React + TypeScript
- **Rama git:** `main` (último merge: PR #5 — FastAPI REST endpoints)
- **Último commit:** `4afd13c feat(api): add FastAPI REST endpoints`

---

## Empezar aquí (próxima sesión)

1. `git -C /Users/db/Documents/github/gmail-ai-agent checkout main`
2. `git -C /Users/db/Documents/github/gmail-ai-agent checkout -b feat/frontend-react`
3. Inicializar proyecto Vite en `/frontend`: `npm create vite@latest . -- --template react-ts`
4. Instalar dependencias base: `npm install`
5. Implementar vista principal con lista de correos clasificados → `GET /api/emails`

---

## Tareas pendientes (priorizadas)

| Prioridad | Tarea | Endpoint |
|-----------|-------|----------|
| Alta | Lista de correos clasificados | `GET /api/emails` |
| Alta | Vista de estadísticas por categoría | `GET /api/emails/stats` |
| Alta | Vista de próximos eventos del calendario | `GET /api/calendar/events` |
| Media | Botón "Procesar ahora" | `POST /api/process` |
| Baja | Formulario crear eventos | `POST /api/calendar/events` |
| Baja | Limpiar ramas locales mergeadas | — |

---

## Endpoints disponibles (backend ya funcional)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/emails` | Correos no leídos clasificados |
| GET | `/api/emails/stats` | Conteo por categoría |
| GET | `/api/calendar/events` | Próximos 50 eventos (30 días) |
| POST | `/api/calendar/events` | Crear evento manual |
| POST | `/api/process` | Forzar ciclo de procesamiento |

**Backend corre en:** `http://0.0.0.0:8000`
**CORS configurado para:** `http://localhost:5173`

---

## Notas técnicas clave

- Credenciales OAuth2 fuera del repo (`credentials.json`, `token.json` en `/backend/`)
- Scheduler omite ejecuciones entre 00:00 y 07:59 (quiet hours)
- Gemini clasifica en: `reunion`, `urgente`, `informativo`, `otro`
- Variable de entorno `CHECK_INTERVAL_MINUTES` controla el scheduler

---

*Última actualización: 2026-03-20*
