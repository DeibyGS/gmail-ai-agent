"""
API REST con FastAPI para el gmail-ai-agent.

Expone los datos del sistema al frontend React (Vite en localhost:5173).

Endpoints de emails y stats:
- GET  /api/emails                → correos no leídos clasificados y resumidos
- GET  /api/emails/stats          → estadísticas en tiempo real (no leídos)
- GET  /api/emails/processed      → correos procesados (today | history)
- GET  /api/stats/categories      → distribución histórica por categoría (SQLite)
- GET  /api/stats/daily           → volumen diario últimos 30 días (SQLite)
- GET  /api/stats/senders         → top 10 remitentes (SQLite)
- POST /api/process               → forzar ciclo de procesamiento inmediato

Endpoints de calendario → ver src/api/calendar_router.py
"""

from datetime import datetime
from typing import Optional

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from src.gmail.client import get_unread_emails, mark_as_read
from src.ai.classifier import classify_emails
from src.scheduler.job import run_processing_cycle
from src.database.init_db import get_db, init_db
from src.database.repository import (
    get_stats_by_category, get_daily_volume, get_top_senders,
    get_processed_today, get_processed_history,
)
from src.api.calendar_router import router as calendar_router
from src.api.config_router import router as config_router


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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar routers
app.include_router(calendar_router)
app.include_router(config_router)


# ── Endpoints de correos ───────────────────────────────────────────────────────

@app.get("/api/emails")
def get_emails() -> dict:
    """Obtiene y clasifica en tiempo real los correos no leídos de Gmail."""
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
    """Devuelve estadísticas (conteo por categoría) de los correos no leídos actuales."""
    try:
        emails = get_unread_emails()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener correos de Gmail: {e}")

    if not emails:
        return {"total": 0, "by_category": {}, "fetched_at": datetime.now().isoformat()}

    try:
        classified = classify_emails(emails)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al clasificar correos con Gemini: {e}")

    by_category: dict[str, int] = {}
    for email in classified:
        category = email.get("category", "otro")
        by_category[category] = by_category.get(category, 0) + 1

    return {
        "total": len(classified),
        "by_category": by_category,
        "fetched_at": datetime.now().isoformat(),
    }


@app.post("/api/process")
def trigger_processing_cycle() -> dict:
    """
    Fuerza un ciclo de procesamiento inmediato (sin esperar al scheduler).

    Útil para que el frontend pueda solicitar una actualización manual.
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

    view=today   → correos procesados hoy
    view=history → historial completo filtrable por fecha y categoría
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
    """Distribución histórica de correos por categoría desde SQLite."""
    db = get_db()
    try:
        result = get_stats_by_category(db, since_day=since)
    finally:
        db.close()
    return {**result, "fetched_at": datetime.now().isoformat()}


@app.get("/api/stats/daily")
def stats_daily_volume(days: int = Query(30, description="Número de días a mostrar")) -> dict:
    """Volumen de correos agrupado por día (últimos N días)."""
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
    """Top remitentes por número de correos enviados."""
    db = get_db()
    try:
        result = get_top_senders(db, limit=limit, since_day=since)
    finally:
        db.close()
    return {"senders": result, "fetched_at": datetime.now().isoformat()}


# Suprimir warning de unused import (mark_as_read se usa en job.py, no aquí)
__all__ = ["app", "mark_as_read"]
