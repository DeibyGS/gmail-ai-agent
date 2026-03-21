"""
Tests unitarios para el módulo de Google Calendar.

Se usan mocks para no hacer llamadas reales a la API de Google durante los tests.
Un mock es un objeto falso que simula el comportamiento del objeto real.
"""
from unittest.mock import patch, MagicMock, Mock
from googleapiclient.errors import HttpError

from src.calendar.client import (
    create_event_from_email,
    get_upcoming_events,
    delete_event,
    _build_event_body,
    _parse_event,
    _parse_recurrence,
)


# ========================
# TESTS DE _parse_recurrence
# ========================

def test_parse_recurrence_none():
    """None o string vacío devuelve None."""
    assert _parse_recurrence(None) is None
    assert _parse_recurrence("") is None


def test_parse_recurrence_daily():
    """Patrón diario se convierte a RRULE:FREQ=DAILY."""
    result = _parse_recurrence("DAILY")
    assert result == ["RRULE:FREQ=DAILY"]


def test_parse_recurrence_weekly_single_day():
    """Patrón semanal con un día se convierte correctamente."""
    result = _parse_recurrence("WEEKLY:MO")
    assert result == ["RRULE:FREQ=WEEKLY;BYDAY=MO"]


def test_parse_recurrence_weekly_multiple_days():
    """Patrón semanal con múltiples días se convierte correctamente."""
    result = _parse_recurrence("WEEKLY:MO,WE,FR")
    assert result == ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"]


def test_parse_recurrence_monthly():
    """Patrón mensual se convierte con el día del mes correcto."""
    result = _parse_recurrence("MONTHLY:15")
    assert result == ["RRULE:FREQ=MONTHLY;BYMONTHDAY=15"]


def test_parse_recurrence_case_insensitive():
    """El patrón se normaliza a mayúsculas antes de procesar."""
    result = _parse_recurrence("weekly:mo")
    assert result == ["RRULE:FREQ=WEEKLY;BYDAY=MO"]


def test_parse_recurrence_invalid_day():
    """Días inválidos devuelven None."""
    assert _parse_recurrence("WEEKLY:XX") is None


def test_parse_recurrence_invalid_monthly_day():
    """Día del mes fuera de rango (0 o >31) devuelve None."""
    assert _parse_recurrence("MONTHLY:0") is None
    assert _parse_recurrence("MONTHLY:32") is None


def test_parse_recurrence_unknown_pattern():
    """Patrón desconocido devuelve None."""
    assert _parse_recurrence("YEARLY:01-01") is None


# ========================
# TESTS DE _build_event_body
# ========================

def test_build_event_body_with_time():
    """Verifica que se construye correctamente un evento con hora específica."""
    event_data = {
        "title": "Reunión de equipo",
        "date": "2026-04-01",
        "time": "10:00",
        "location": "https://meet.google.com/abc",
        "description": "Revisión semanal"
    }
    body = _build_event_body(event_data)

    assert body["summary"] == "Reunión de equipo"
    assert "dateTime" in body["start"]
    assert body["location"] == "https://meet.google.com/abc"
    assert body["description"] == "Revisión semanal"
    assert "recurrence" not in body


def test_build_event_body_all_day():
    """Verifica que se construye un evento de día completo cuando no hay hora."""
    event_data = {
        "title": "Entrega de proyecto",
        "date": "2026-04-15",
        "time": None,
        "location": None,
        "description": ""
    }
    body = _build_event_body(event_data)

    assert body["summary"] == "Entrega de proyecto"
    assert "date" in body["start"]
    assert "dateTime" not in body["start"]
    assert "location" not in body
    assert "description" not in body


def test_build_event_body_default_title():
    """Verifica que se usa un título por defecto si no hay título."""
    event_data = {"title": None, "date": "2026-04-01", "time": None}
    body = _build_event_body(event_data)
    assert body["summary"] == "Evento sin título"


def test_build_event_body_with_recurrence():
    """Verifica que se incluye RRULE cuando hay patrón de recurrencia."""
    event_data = {
        "title": "Standup diario",
        "date": "2026-04-01",
        "time": "09:00",
        "recurrence": "WEEKLY:MO,TU,WE,TH,FR"
    }
    body = _build_event_body(event_data)

    assert "recurrence" in body
    assert body["recurrence"] == ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]


def test_build_event_body_invalid_recurrence_omitted():
    """Un patrón de recurrencia inválido no incluye el campo recurrence."""
    event_data = {
        "title": "Evento",
        "date": "2026-04-01",
        "time": "10:00",
        "recurrence": "INVALID_PATTERN"
    }
    body = _build_event_body(event_data)
    assert "recurrence" not in body


# ========================
# TESTS DE _parse_event
# ========================

def test_parse_event_with_datetime():
    """Verifica el parseo de un evento con fecha y hora."""
    raw_event = {
        "id": "abc123",
        "summary": "Reunión",
        "start": {"dateTime": "2026-04-01T10:00:00"},
        "end": {"dateTime": "2026-04-01T11:00:00"},
        "location": "Sala A",
        "description": "Descripción",
        "htmlLink": "https://calendar.google.com/event/abc123"
    }
    parsed = _parse_event(raw_event)

    assert parsed["id"] == "abc123"
    assert parsed["title"] == "Reunión"
    assert parsed["start"] == "2026-04-01T10:00:00"
    assert parsed["location"] == "Sala A"
    assert parsed["recurrence"] is None


def test_parse_event_all_day():
    """Verifica el parseo de un evento de día completo."""
    raw_event = {
        "id": "xyz789",
        "summary": "Festivo",
        "start": {"date": "2026-04-05"},
        "end": {"date": "2026-04-05"},
    }
    parsed = _parse_event(raw_event)

    assert parsed["start"] == "2026-04-05"
    assert parsed["location"] is None


def test_parse_event_with_recurrence():
    """Verifica que el campo recurrence se incluye si el evento es recurrente."""
    raw_event = {
        "id": "rec123",
        "summary": "Standup",
        "start": {"dateTime": "2026-04-01T09:00:00"},
        "end": {"dateTime": "2026-04-01T09:30:00"},
        "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"],
    }
    parsed = _parse_event(raw_event)

    assert parsed["recurrence"] == ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]


# ========================
# TESTS DE create_event_from_email (con mock)
# ========================

def test_create_event_returns_none_if_no_event_data():
    """Si event_data es None, no debe crear ningún evento."""
    result = create_event_from_email(None)
    assert result is None


def test_create_event_returns_none_if_missing_date():
    """Si falta la fecha, no debe crear el evento."""
    result = create_event_from_email({"title": "Reunión", "date": None})
    assert result is None


@patch("src.calendar.client.get_calendar_service")
def test_create_event_calls_api(mock_service):
    """Verifica que se llama a la API de Google Calendar con los datos correctos."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.insert.return_value.execute.return_value = {
        "id": "new-id-123",
        "summary": "Reunión de equipo",
        "start": {"dateTime": "2026-04-01T10:00:00"},
        "end": {"dateTime": "2026-04-01T11:00:00"},
        "htmlLink": "https://calendar.google.com/event/123"
    }

    event_data = {
        "title": "Reunión de equipo",
        "date": "2026-04-01",
        "time": "10:00",
        "location": None,
        "description": "Revisión semanal"
    }

    result = create_event_from_email(event_data)

    assert result is not None
    assert result["title"] == "Reunión de equipo"
    mock_events.insert.assert_called_once()


@patch("src.calendar.client.get_calendar_service")
def test_create_event_with_recurrence(mock_service):
    """Verifica que se crea correctamente un evento recurrente."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.insert.return_value.execute.return_value = {
        "id": "rec-id-456",
        "summary": "Standup diario",
        "start": {"dateTime": "2026-04-01T09:00:00"},
        "end": {"dateTime": "2026-04-01T09:30:00"},
        "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
        "htmlLink": "https://calendar.google.com/event/rec"
    }

    event_data = {
        "title": "Standup diario",
        "date": "2026-04-01",
        "time": "09:00",
        "recurrence": "WEEKLY:MO"
    }

    result = create_event_from_email(event_data)

    assert result is not None
    assert result["recurrence"] == ["RRULE:FREQ=WEEKLY;BYDAY=MO"]
    call_kwargs = mock_events.insert.call_args[1]
    assert call_kwargs["body"]["recurrence"] == ["RRULE:FREQ=WEEKLY;BYDAY=MO"]


# ========================
# TESTS DE get_upcoming_events (con mock)
# ========================

@patch("src.calendar.client.get_calendar_service")
def test_get_upcoming_events_returns_list(mock_service):
    """Verifica que get_upcoming_events devuelve una lista de eventos parseados."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.list.return_value.execute.return_value = {
        "items": [
            {
                "id": "1",
                "summary": "Evento 1",
                "start": {"dateTime": "2026-04-01T10:00:00"},
                "end": {"dateTime": "2026-04-01T11:00:00"},
            }
        ]
    }

    result = get_upcoming_events()

    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["title"] == "Evento 1"


@patch("src.calendar.client.get_calendar_service")
def test_get_upcoming_events_empty(mock_service):
    """Verifica que devuelve lista vacía si no hay eventos."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.list.return_value.execute.return_value = {"items": []}

    result = get_upcoming_events()
    assert result == []


# ========================
# TESTS DE delete_event (con mock)
# ========================

def _make_http_error(status: int) -> HttpError:
    """Helper para crear un HttpError con el status code dado."""
    mock_resp = Mock()
    mock_resp.status = status
    return HttpError(mock_resp, b'{"error": "not found"}')


@patch("src.calendar.client.get_calendar_service")
def test_delete_event_returns_true_on_success(mock_service):
    """Verifica que delete_event devuelve True cuando la API responde correctamente."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    # GET verifica que existe
    mock_events.get.return_value.execute.return_value = {
        "id": "event-id-123", "summary": "Reunión", "status": "confirmed", "organizer": {}
    }
    # DELETE elimina
    mock_events.delete.return_value.execute.return_value = None

    result = delete_event("event-id-123")

    assert result is True
    mock_events.delete.assert_called_once_with(
        calendarId="primary", eventId="event-id-123", sendUpdates="none"
    )


@patch("src.calendar.client.get_calendar_service")
def test_delete_event_returns_false_on_404_at_get(mock_service):
    """Verifica que delete_event devuelve False si el evento no existe (404 en GET)."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.get.return_value.execute.side_effect = _make_http_error(404)

    result = delete_event("evento-inexistente")

    assert result is False
    mock_events.delete.assert_not_called()


@patch("src.calendar.client.get_calendar_service")
def test_delete_event_returns_false_on_410_at_get(mock_service):
    """Verifica que delete_event devuelve False si el evento fue eliminado (410 en GET)."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.get.return_value.execute.side_effect = _make_http_error(410)

    result = delete_event("evento-ya-eliminado")

    assert result is False


@patch("src.calendar.client.get_calendar_service")
def test_delete_event_raises_on_get_server_error(mock_service):
    """Verifica que se lanza RuntimeError si el GET falla con error 5xx."""
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.get.return_value.execute.side_effect = _make_http_error(500)

    import pytest
    with pytest.raises(RuntimeError):
        delete_event("event-id-xyz")
