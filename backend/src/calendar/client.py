from datetime import datetime, timedelta, timezone
from googleapiclient.discovery import build
from config.settings import get_google_credentials


def get_calendar_service():
    """Crea y devuelve el cliente de la API de Google Calendar."""
    creds = get_google_credentials()
    return build("calendar", "v3", credentials=creds)


def create_event_from_email(event_data: dict) -> dict | None:
    """
    Crea un evento en Google Calendar a partir de los datos extraídos por Gemini.

    Recibe el campo event_data del correo clasificado:
    {
        "title": "Reunión de equipo",
        "date": "2026-03-25",
        "time": "10:00",
        "location": "https://meet.google.com/...",
        "description": "Revisión semanal del proyecto"
    }

    Devuelve el evento creado o None si no hay suficientes datos.
    """
    if not event_data:
        return None

    # Necesitamos al menos título y fecha para crear un evento
    if not event_data.get("title") or not event_data.get("date"):
        return None

    event_body = _build_event_body(event_data)
    service = get_calendar_service()

    # 'primary' es el calendario principal del usuario
    created = service.events().insert(
        calendarId="primary",
        body=event_body
    ).execute()

    print(f"Evento creado: {created.get('summary')} → {created.get('htmlLink')}")
    # Normalizar antes de retornar: el frontend espera start/end como strings planos,
    # no como objetos {dateTime: ..., timeZone: ...} que devuelve la API de Google.
    return _parse_event(created)


def _build_event_body(event_data: dict) -> dict:
    """
    Construye el cuerpo del evento en el formato que espera la API de Google Calendar.

    Si no hay hora definida → crea un evento de día completo (allDay)
    Si hay hora definida → crea un evento con hora de inicio y fin (1 hora de duración)
    """
    title = event_data.get("title") or "Evento sin título"
    date_str = event_data.get("date")
    time_str = event_data.get("time")
    location = event_data.get("location")
    description = event_data.get("description", "")

    if time_str:
        # Evento con hora específica
        start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)  # Duración por defecto: 1 hora

        start = {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Madrid"}
        end = {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Madrid"}
    else:
        # Evento de día completo (sin hora)
        start = {"date": date_str}
        end = {"date": date_str}

    event_body = {
        "summary": title,
        "start": start,
        "end": end,
    }

    if location:
        event_body["location"] = location

    if description:
        event_body["description"] = description

    return event_body


def delete_event(event_id: str) -> bool:
    """
    Elimina un evento de Google Calendar por su ID.

    Devuelve True si se eliminó correctamente, False si no existe.
    Lanza excepción si hay un error de API inesperado.
    """
    service = get_calendar_service()
    try:
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return True
    except Exception as e:
        # Google Calendar devuelve 410 Gone si el evento ya fue eliminado
        if "410" in str(e) or "404" in str(e):
            return False
        raise


def get_upcoming_events(max_results: int = 10) -> list[dict]:
    """
    Obtiene los próximos eventos del calendario del usuario.

    Usado por el dashboard para mostrar el calendario en el frontend.
    Devuelve eventos desde ahora hasta los próximos 30 días.
    """
    service = get_calendar_service()

    now = datetime.now(timezone.utc).isoformat()
    thirty_days = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    result = service.events().list(
        calendarId="primary",
        timeMin=now,
        timeMax=thirty_days,
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime"
    ).execute()

    events = result.get("items", [])

    # Normalizamos la respuesta para que sea más fácil de usar en el frontend
    return [_parse_event(e) for e in events]


def _parse_event(event: dict) -> dict:
    """
    Normaliza un evento de Google Calendar a un diccionario simple.

    Los eventos pueden tener 'dateTime' (con hora) o 'date' (día completo).
    """
    start = event.get("start", {})
    end = event.get("end", {})

    return {
        "id": event.get("id"),
        "title": event.get("summary", "Sin título"),
        "start": start.get("dateTime") or start.get("date"),
        "end": end.get("dateTime") or end.get("date"),
        "location": event.get("location"),
        "description": event.get("description"),
        "link": event.get("htmlLink"),
    }
