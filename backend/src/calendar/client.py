from datetime import datetime, timedelta, timezone

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config.settings import get_google_credentials


def get_calendar_service():
    """Crea y devuelve el cliente de la API de Google Calendar."""
    creds = get_google_credentials()
    return build("calendar", "v3", credentials=creds)


# ── Creación de eventos ────────────────────────────────────────────────────────

def create_event(
    title: str,
    date: str,
    time: str | None = None,
    location: str | None = None,
    description: str | None = None,
) -> dict:
    """
    Crea un evento en Google Calendar a partir de datos estructurados (creación manual).

    Parámetros:
        title       — Título del evento (obligatorio)
        date        — Fecha en formato "YYYY-MM-DD" (obligatorio)
        time        — Hora en formato "HH:MM" (opcional → evento de día completo)
        location    — Ubicación o enlace (opcional)
        description — Descripción (opcional)

    Devuelve el evento creado normalizado por _parse_event.
    Lanza ValueError si faltan campos obligatorios.
    """
    if not title or not date:
        raise ValueError("'title' y 'date' son obligatorios para crear un evento.")

    event_data = {
        "title": title,
        "date": date,
        "time": time,
        "location": location,
        "description": description,
    }

    event_body = _build_event_body(event_data)
    service = get_calendar_service()

    created = service.events().insert(
        calendarId="primary",
        body=event_body,
    ).execute()

    print(f"Evento creado: {created.get('summary')} (id={created.get('id')}) → {created.get('htmlLink')}")
    # Normalizar antes de devolver: el frontend espera start/end como ISO strings planos.
    return _parse_event(created)


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

    Devuelve el evento creado normalizado o None si no hay suficientes datos.
    """
    if not event_data:
        return None

    if not event_data.get("title"):
        return None

    # Si no hay fecha pero sí recurrencia, usar hoy como inicio de la serie
    if not event_data.get("date"):
        if event_data.get("recurrence"):
            event_data = {**event_data, "date": datetime.now().strftime("%Y-%m-%d")}
        else:
            return None

    # Descartar eventos con fecha en el pasado (Gemini puede extraer fechas de emails viejos)
    try:
        event_date = datetime.strptime(event_data["date"], "%Y-%m-%d").date()
        if event_date < datetime.now().date():
            print(f"Evento descartado: fecha en el pasado ({event_data['date']}) — '{event_data.get('title')}'")
            return None
    except ValueError:
        pass  # Si la fecha tiene formato inválido, dejamos que _build_event_body lo maneje

    event_body = _build_event_body(event_data)
    service = get_calendar_service()

    created = service.events().insert(
        calendarId="primary",
        body=event_body,
    ).execute()

    print(f"Evento creado desde email: {created.get('summary')} → {created.get('htmlLink')}")
    return _parse_event(created)


def _build_event_body(event_data: dict) -> dict:
    """
    Construye el cuerpo del evento en el formato que espera la API de Google Calendar.

    Sin hora → evento de día completo (allDay). El end.date es el día siguiente
    (Google Calendar usa extremo exclusivo para fechas).
    Con hora → evento de 1 hora de duración con timezone Europe/Madrid.
    Con recurrence → añade RRULE al cuerpo del evento.
    """
    title = event_data.get("title") or "Evento sin título"
    date_str = event_data.get("date")
    time_str = event_data.get("time")
    location = event_data.get("location")
    description = event_data.get("description", "")
    recurrence_pattern = event_data.get("recurrence")

    if time_str:
        start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)
        start = {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Madrid"}
        end = {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Madrid"}
    else:
        next_day = (datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
        start = {"date": date_str}
        end = {"date": next_day}

    event_body: dict = {"summary": title, "start": start, "end": end}

    if location:
        event_body["location"] = location
    if description:
        event_body["description"] = description

    rrule = _parse_recurrence(recurrence_pattern)
    if rrule:
        event_body["recurrence"] = rrule

    return event_body


def _parse_recurrence(pattern: str | None) -> list[str] | None:
    """
    Convierte el patrón de recurrencia extraído por Gemini a formato RRULE (RFC 5545).

    Patrones soportados:
      "DAILY"           → RRULE:FREQ=DAILY
      "WEEKLY:MO"       → RRULE:FREQ=WEEKLY;BYDAY=MO
      "WEEKLY:MO,WE"    → RRULE:FREQ=WEEKLY;BYDAY=MO,WE
      "MONTHLY:15"      → RRULE:FREQ=MONTHLY;BYMONTHDAY=15

    Devuelve una lista con el RRULE string (formato que exige Google Calendar API),
    o None si el patrón es inválido o está vacío.
    """
    if not pattern:
        return None

    pattern = pattern.strip().upper()

    if pattern == "DAILY":
        return ["RRULE:FREQ=DAILY"]

    if pattern.startswith("WEEKLY:"):
        days = pattern.split(":", 1)[1]
        valid_days = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}
        day_list = [d.strip() for d in days.split(",")]
        if all(d in valid_days for d in day_list) and day_list:
            return [f"RRULE:FREQ=WEEKLY;BYDAY={','.join(day_list)}"]

    if pattern.startswith("MONTHLY:"):
        day_of_month = pattern.split(":", 1)[1].strip()
        if day_of_month.isdigit() and 1 <= int(day_of_month) <= 31:
            return [f"RRULE:FREQ=MONTHLY;BYMONTHDAY={day_of_month}"]

    return None


# ── Eliminación de eventos ─────────────────────────────────────────────────────

def delete_event(event_id: str) -> bool:
    """
    Elimina un evento de Google Calendar por su ID.

    Devuelve True si se eliminó correctamente.
    Devuelve False si no existe (404) o ya fue eliminado (410).
    Lanza RuntimeError con mensaje descriptivo para cualquier otro error de API.
    """
    service = get_calendar_service()

    # ── Paso 1: verificar que el evento existe antes de intentar borrar ──────
    try:
        service.events().get(calendarId="primary", eventId=event_id).execute()
    except HttpError as get_err:
        if get_err.resp.status in (404, 410):
            return False  # El evento no existe en el calendario primario
        raise RuntimeError(
            f"No se pudo verificar el evento antes de eliminarlo "
            f"(HTTP {get_err.resp.status}): {get_err.reason}"
        ) from get_err

    # ── Paso 2: eliminar ──────────────────────────────────────────────────────
    try:
        service.events().delete(
            calendarId="primary",
            eventId=event_id,
            sendUpdates="none",   # evita errores de permiso de notificaciones
        ).execute()
        return True
    except HttpError as e:
        if e.resp.status in (404, 410):
            return False
        raise RuntimeError(f"Error de Google Calendar (HTTP {e.resp.status}): {e.reason}") from e
    except Exception as e:
        raise RuntimeError(f"{type(e).__name__}: {e}") from e


# ── Listado de eventos ─────────────────────────────────────────────────────────

def get_upcoming_events(max_results: int = 10) -> list[dict]:
    """
    Obtiene los próximos eventos del calendario del usuario.

    Devuelve eventos desde ahora hasta los próximos 30 días, normalizados.
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
        orderBy="startTime",
    ).execute()

    events = result.get("items", [])
    return [_parse_event(e) for e in events]


# ── Normalización ──────────────────────────────────────────────────────────────

def _parse_event(event: dict) -> dict:
    """
    Normaliza un evento de Google Calendar a un diccionario simple.

    Los eventos pueden tener 'dateTime' (con hora) o 'date' (día completo).
    Garantiza que 'start' y 'end' siempre sean strings (nunca None ni objetos).
    """
    start_obj = event.get("start") or {}
    end_obj = event.get("end") or {}

    return {
        "id": event.get("id") or "",
        "title": event.get("summary") or "Sin título",
        "start": start_obj.get("dateTime") or start_obj.get("date") or "",
        "end": end_obj.get("dateTime") or end_obj.get("date") or "",
        "location": event.get("location"),
        "description": event.get("description"),
        "link": event.get("htmlLink"),
        "recurrence": event.get("recurrence"),  # lista de RRULE strings o None
    }
