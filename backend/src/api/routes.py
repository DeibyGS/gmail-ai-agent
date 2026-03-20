"""
API REST con FastAPI para el gmail-ai-agent.

Expone los datos del sistema al frontend React (Vite en localhost:5173).

Endpoints:
- GET  /api/emails                → correos no leídos clasificados y resumidos
- GET  /api/emails/stats          → estadísticas en tiempo real (no leídos)
- GET  /api/stats/categories      → distribución histórica por categoría (SQLite)
- GET  /api/stats/daily           → volumen diario últimos 30 días (SQLite)
- GET  /api/stats/senders         → top 10 remitentes (SQLite)
- GET  /api/calendar/events       → próximos eventos del calendario (30 días)
- POST /api/calendar/events       → crear evento manualmente
- POST /api/process               → forzar ciclo de procesamiento inmediato
"""

from datetime import datetime
from typing import Optional

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.gmail.client import get_unread_emails, mark_as_read
from src.ai.classifier import classify_emails
from src.calendar.client import create_event_from_email, get_upcoming_events
from src.scheduler.job import run_processing_cycle
from src.database.init_db import get_db, init_db
from src.database.repository import (
    get_stats_by_category, get_daily_volume, get_top_senders,
    get_processed_today, get_processed_history,
)


# ── Modelos Pydantic para validar el body de las peticiones POST ───────────────

class CreateEventRequest(BaseModel):
    """Datos requeridos para crear un evento manualmente en Google Calendar."""
    title: str
    date: str                       # Formato: "YYYY-MM-DD"
    time: Optional[str] = None      # Formato: "HH:MM" (opcional → evento de día completo)
    location: Optional[str] = None
    description: Optional[str] = None


# ── Inicialización de la app FastAPI ──────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa SQLite al arrancar (crea tablas si no existen)."""
    init_db()
    yield

app = FastAPI(
    title="Gmail AI Agent API",
    description="API REST para el sistema de procesamiento inteligente de correos",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: permite que el frontend React en Vite (puerto 5173) llame a esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Origen del dev server de Vite
    allow_credentials=True,
    allow_methods=["*"],   # GET, POST, PUT, DELETE, OPTIONS, etc.
    allow_headers=["*"],   # Content-Type, Authorization, etc.
)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/emails")
def get_emails() -> dict:
    """
    Obtiene y clasifica en tiempo real los correos no leídos de Gmail.

    Llama a get_unread_emails() y luego classify_emails() para devolver
    cada correo con su categoría, resumen y event_data si aplica.

    Devuelve:
        {
            "emails": [...],
            "total": int,
            "fetched_at": "ISO datetime"
        }
    """
    try:
        emails = get_unread_emails()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener correos de Gmail: {e}")

    if not emails:
        return {"emails": [], "total": 0, "fetched_at": datetime.now().isoformat()}

    try:
        classified = classify_emails(emails)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al clasificar correos con Gemini: {e}")

    return {
        "emails": classified,
        "total": len(classified),
        "fetched_at": datetime.now().isoformat(),
    }


@app.get("/api/emails/stats")
def get_email_stats() -> dict:
    """
    Devuelve estadísticas de los correos no leídos actuales.

    Agrupa los correos por categoría (reunion, urgente, informativo, otro)
    y devuelve los conteos.

    Devuelve:
        {
            "total": int,
            "by_category": {"reunion": int, "urgente": int, ...},
            "fetched_at": "ISO datetime"
        }
    """
    try:
        emails = get_unread_emails()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener correos de Gmail: {e}")

    if not emails:
        return {
            "total": 0,
            "by_category": {},
            "fetched_at": datetime.now().isoformat(),
        }

    try:
        classified = classify_emails(emails)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al clasificar correos con Gemini: {e}")

    # Contamos cuántos correos hay por cada categoría
    by_category: dict[str, int] = {}
    for email in classified:
        category = email.get("category", "otro")
        by_category[category] = by_category.get(category, 0) + 1

    return {
        "total": len(classified),
        "by_category": by_category,
        "fetched_at": datetime.now().isoformat(),
    }


@app.get("/api/calendar/events")
def list_calendar_events() -> dict:
    """
    Devuelve los próximos eventos del calendario (próximos 30 días).

    Llama a get_upcoming_events() del cliente de Google Calendar.

    Devuelve:
        {
            "events": [...],
            "total": int,
            "fetched_at": "ISO datetime"
        }
    """
    try:
        events = get_upcoming_events(max_results=50)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener eventos de Google Calendar: {e}")

    return {
        "events": events,
        "total": len(events),
        "fetched_at": datetime.now().isoformat(),
    }


@app.post("/api/calendar/events", status_code=201)
def create_calendar_event(body: CreateEventRequest) -> dict:
    """
    Crea un evento manualmente en Google Calendar.

    Body esperado (JSON):
        {
            "title": "Reunión con cliente",
            "date": "2026-04-01",
            "time": "10:00",           (opcional)
            "location": "Sala A",      (opcional)
            "description": "..."       (opcional)
        }

    Devuelve el evento creado con su ID y enlace a Google Calendar.
    """
    # Construimos el event_data en el formato que espera create_event_from_email
    event_data = {
        "title": body.title,
        "date": body.date,
        "time": body.time,
        "location": body.location,
        "description": body.description,
    }

    try:
        created_event = create_event_from_email(event_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al crear evento en Google Calendar: {e}")

    if not created_event:
        # create_event_from_email devuelve None si faltan título o fecha
        raise HTTPException(
            status_code=422,
            detail="No se pudo crear el evento. Verifica que 'title' y 'date' sean válidos."
        )

    return {
        "message": "Evento creado correctamente",
        "event": created_event,
        "created_at": datetime.now().isoformat(),
    }


@app.post("/api/process")
def trigger_processing_cycle() -> dict:
    """
    Fuerza un ciclo de procesamiento inmediato (sin esperar al scheduler).

    Útil para que el frontend pueda solicitar una actualización manual.
    Llama directamente a run_processing_cycle().

    Devuelve confirmación con timestamp de ejecución.
    """
    try:
        run_processing_cycle()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante el ciclo de procesamiento: {e}")

    return {
        "message": "Ciclo de procesamiento ejecutado correctamente",
        "executed_at": datetime.now().isoformat(),
    }


# ── Endpoint de bandeja de procesados (SQLite) ────────────────────────────────

@app.get("/api/emails/processed")
def get_processed_emails(
    view: str = Query("today", description="'today' o 'history'"),
    since: Optional[str] = Query(None, description="Fecha mínima YYYY-MM-DD (solo history)"),
    category: Optional[str] = Query(None, description="Filtrar por categoría (solo history)"),
) -> dict:
    """
    Devuelve correos ya procesados desde la base de datos local.

    view=today   → correos procesados hoy (tab "Procesados hoy")
    view=history → historial completo filtrable (tab "Historial")
    """
    db = get_db()
    try:
        if view == "today":
            emails = get_processed_today(db)
        else:
            emails = get_processed_history(db, since_day=since, category=category)
    finally:
        db.close()

    return {
        "emails": emails,
        "total": len(emails),
        "view": view,
        "fetched_at": datetime.now().isoformat(),
    }


# ── Endpoints de estadísticas históricas (SQLite) ─────────────────────────────

@app.get("/api/stats/categories")
def stats_by_category(since: Optional[str] = Query(None, description="Fecha mínima YYYY-MM-DD")) -> dict:
    """
    Distribución histórica de correos por categoría.
    Parámetro opcional: since=YYYY-MM-DD para filtrar desde una fecha.
    """
    db = get_db()
    try:
        result = get_stats_by_category(db, since_day=since)
    finally:
        db.close()
    return {**result, "fetched_at": datetime.now().isoformat()}


@app.get("/api/stats/daily")
def stats_daily_volume(days: int = Query(30, description="Número de días a mostrar")) -> dict:
    """
    Volumen de correos agrupado por día (últimos N días).
    Útil para el gráfico de barras + línea de tendencia.
    """
    db = get_db()
    try:
        result = get_daily_volume(db, last_days=days)
    finally:
        db.close()
    return {"daily": result, "fetched_at": datetime.now().isoformat()}


@app.get("/api/stats/senders")
def stats_top_senders(
    limit: int = Query(10, description="Número de remitentes a devolver"),
    since: Optional[str] = Query(None, description="Fecha mínima YYYY-MM-DD"),
) -> dict:
    """
    Top remitentes que más correos han enviado.
    Útil para decidir darse de baja de newsletters o servicios.
    """
    db = get_db()
    try:
        result = get_top_senders(db, limit=limit, since_day=since)
    finally:
        db.close()
    return {"senders": result, "fetched_at": datetime.now().isoformat()}
