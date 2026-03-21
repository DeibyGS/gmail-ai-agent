"""
Router de Google Calendar para el gmail-ai-agent.

Endpoints:
- GET    /api/calendar/events       → próximos eventos (30 días)
- POST   /api/calendar/events       → crear evento manualmente
- DELETE /api/calendar/events/{id}  → eliminar evento por ID
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.calendar.client import create_event_from_email, get_upcoming_events, delete_event

router = APIRouter(prefix="/api/calendar")


class CreateEventRequest(BaseModel):
    """Datos requeridos para crear un evento manualmente en Google Calendar."""
    title: str
    date: str                       # Formato: "YYYY-MM-DD"
    time: Optional[str] = None      # Formato: "HH:MM" (opcional → evento de día completo)
    location: Optional[str] = None
    description: Optional[str] = None


@router.get("/events")
def list_calendar_events() -> dict:
    """Devuelve los próximos eventos del calendario (próximos 30 días)."""
    try:
        events = get_upcoming_events(max_results=50)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al obtener eventos de Google Calendar: {e}")

    return {
        "events": events,
        "total": len(events),
        "fetched_at": datetime.now().isoformat(),
    }


@router.post("/events", status_code=201)
def create_calendar_event(body: CreateEventRequest) -> dict:
    """
    Crea un evento manualmente en Google Calendar.

    Body: title (str), date (YYYY-MM-DD), time? (HH:MM), location?, description?
    Devuelve el evento creado con su ID.
    """
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
        raise HTTPException(
            status_code=422,
            detail="No se pudo crear el evento. Verifica que 'title' y 'date' sean válidos."
        )

    return {
        "message": "Evento creado correctamente",
        "event": created_event,
        "created_at": datetime.now().isoformat(),
    }


@router.delete("/events/{event_id}", status_code=204)
def remove_calendar_event(event_id: str) -> None:
    """
    Elimina un evento de Google Calendar por su ID.

    Devuelve 204 No Content si se eliminó.
    Devuelve 404 si el evento no existe o ya fue eliminado.
    """
    try:
        found = delete_event(event_id)
    except Exception as e:
        # El mensaje ya viene descriptivo desde delete_event (tipo + detalle)
        raise HTTPException(status_code=502, detail=f"Error al eliminar evento en Google Calendar: {e}")

    if not found:
        raise HTTPException(status_code=404, detail="Evento no encontrado o ya eliminado en Google Calendar.")
