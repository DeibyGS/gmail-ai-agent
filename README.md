# Gmail AI Agent

<!-- AUTO-GENERATED -->
Agente de IA que procesa emails de Gmail, los clasifica automáticamente usando Google Gemini,
crea eventos en Google Calendar para reuniones, y expone todo a través de un dashboard web en React.
<!-- /AUTO-GENERATED -->

---

<!-- AUTO-GENERATED -->
## Stack tecnológico

### Backend
- Python 3.11+ · FastAPI · uvicorn
- Google Gemini API (`google-genai`) — clasificación y resumen de correos
- Gmail API + Google Calendar API (OAuth2)
- SQLite + SQLAlchemy — historial local de correos procesados
- pytest · httpx — testing

### Frontend
- React 18 + TypeScript · Vite
- react-big-calendar + date-fns — calendario interactivo
- Recharts — gráficos de estadísticas (donut, barras, línea)
- Axios — comunicación con el backend
- Vitest + React Testing Library + @vitest/coverage-v8 — tests de componentes
- **Design system centralizado** (`src/theme.ts`) — paleta AI Futuristic Glow con dark theme, glassmorphism y animaciones
- Google Fonts: Space Grotesk (headings) · Inter (body) · IBM Plex Mono (AI outputs)
- **Sonner** — toast notifications (crear/editar/eliminar eventos)

### Deploy
- Docker + GitHub Actions (CI/CD)
<!-- /AUTO-GENERATED -->

---

<!-- AUTO-GENERATED -->
## Features implementadas

- **Procesamiento manual de correos**: botón "Procesar ahora" en el dashboard
- **Clasificación IA**: Gemini clasifica cada correo con categoría (reunion, urgente, promocion, informativo, otro) y genera un resumen
- **Auto-agendado de reuniones**: correos clasificados como `reunion` se crean automáticamente en Google Calendar, incluyendo **recurrencias** (diaria, semanal por días, mensual). Si el email incluye un adjunto `.ics` (iCalendar), los datos del evento se extraen directamente del archivo (fecha, hora, recurrencia, ubicación) sin depender de IA. Si no hay `.ics`, Gemini extrae los datos del cuerpo del correo.
- **Filtro por fecha**: solo procesa correos llegados después de `GMAIL_FILTER_AFTER_DATE` (por defecto `2026/03/20`)
- **Límite configurable**: hasta 100 correos por ciclo (`MAX_EMAILS_PER_RUN`)
- **Historial SQLite**: todos los correos procesados se guardan localmente con categoría, resumen y timestamp
- **Dashboard de correos** con 3 pestañas: Pendientes · Procesados hoy · Historial filtrable
- **Dashboard de estadísticas**: donut por categoría · barras+línea de volumen diario · top remitentes
- **Calendario interactivo**: dos pestañas (lista de cards + grid mes/semana/día) · crear · editar · eliminar eventos · acciones inline en cards · etiquetas con color
- **Script de arranque**: `emaildgs` inicia backend + frontend y abre el navegador automáticamente
- **UI "AI Futuristic Glow"**: dark theme con fondo `#0B0F19`, glassmorphism en navbar, glow en botones IA, animación "AI thinking..." al procesar, overrides de react-big-calendar para dark mode
- **Hover effects profesionales**: glow pulsante en botones primarios, borde iluminado en secundarios, glow rojo en danger
- **Empty state glassmorphism**: bandeja vacía con card animada en lugar de texto plano
- **Toast notifications**: feedback visual al crear, editar y eliminar eventos del calendario
- **Fix bug NaN**: eventos de calendario recién creados ya muestran fecha correcta (normalización de respuesta de Google Calendar API)
<!-- /AUTO-GENERATED -->

---

<!-- AUTO-GENERATED -->
## Instalación y uso

### Requisitos previos
- Python 3.11+
- Node.js 18+
- Credenciales de Google Cloud (Gmail API + Calendar API habilitadas)
- API Key de Google Gemini

### 1. Clonar el repositorio

```bash
git clone https://github.com/DeibyGS/gmail-ai-agent.git
cd gmail-ai-agent
```

### 2. Configurar el backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Copiar el archivo de ejemplo y completar las variables:

```bash
cp .env.example .env
# Editar .env con tu API key de Gemini y configuración de Google OAuth2
```

### 3. Configurar el frontend

```bash
cd frontend
npm install
```

### 4. Arrancar el proyecto

Desde la raíz del proyecto:

```bash
./emaildgs
```

Esto inicia el backend (puerto 8000), el frontend (puerto 5173) y abre el navegador automáticamente.

Para detener: `Ctrl+C`

### Arranque manual

```bash
# Terminal 1 — Backend
cd backend && source .venv/bin/activate && python main.py

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Arranque con Docker

```bash
# Requisito: tener backend/credentials.json y backend/token.json generados (OAuth2)
docker-compose up --build
```

Servicios disponibles:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

### Tests

```bash
# Backend
cd backend && source .venv/bin/activate && pytest tests/ --ignore=tests/test_scheduler.py -v

# Frontend
cd frontend && npm test              # modo watch
cd frontend && npm run test:coverage # con reporte de cobertura
```
<!-- /AUTO-GENERATED -->

---

<!-- AUTO-GENERATED -->
## Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y completar:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GEMINI_API_KEY` | API Key de Google Gemini | `AIza...` |
| `GMAIL_FILTER_AFTER_DATE` | Solo procesar correos después de esta fecha | `2026/03/20` |
| `MAX_EMAILS_PER_RUN` | Máximo de correos por ciclo | `100` |

Las credenciales OAuth2 de Google se guardan en `backend/credentials.json` y `backend/token.json` (no se suben al repositorio).
<!-- /AUTO-GENERATED -->

---

<!-- AUTO-GENERATED -->
## Estructura del proyecto

```
gmail-ai-agent/
├── backend/
│   ├── config/settings.py          # Variables de entorno y credenciales
│   ├── src/
│   │   ├── gmail/client.py         # Cliente Gmail API
│   │   ├── ai/classifier.py        # Clasificador Gemini
│   │   ├── calendar/client.py      # Cliente Calendar API
│   │   ├── scheduler/job.py        # Pipeline de procesamiento
│   │   ├── database/
│   │   │   ├── models.py           # Modelos SQLAlchemy
│   │   │   ├── repository.py       # Acceso a datos
│   │   │   └── init_db.py          # Inicialización SQLite
│   │   └── api/
│   │       ├── routes.py           # Endpoints principales
│   │       └── calendar_router.py  # Endpoints de calendario
│   ├── tests/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/             # Navbar, EmailCard, modales
│       ├── pages/                  # EmailsPage · StatsPage · CalendarPage
│       ├── services/api.ts         # Llamadas al backend
│       └── types/index.ts          # Interfaces TypeScript
├── docs/API.md                     # Referencia completa de la API REST
├── docker-compose.yml              # Orquestación backend + frontend
├── .github/workflows/ci.yml        # CI: pytest · ruff · vitest · docker build
├── emaildgs                        # Script de arranque rápido (local)
└── HANDOFF.md                      # Estado del proyecto entre sesiones
```
<!-- /AUTO-GENERATED -->

---

<!-- AUTO-GENERATED -->
## API

Ver referencia completa en [`docs/API.md`](docs/API.md).

Base URL local: `http://localhost:8000`
<!-- /AUTO-GENERATED -->
