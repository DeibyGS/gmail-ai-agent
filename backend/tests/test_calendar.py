"""
Tests unitarios para el módulo de Google Calendar.

Se usan mocks para no hacer llamadas reales a la API de Google durante los tests.
Un mock es un objeto falso que simula el comportamiento del objeto real.
"""
from unittest.mock import patch, MagicMock
from src.calendar.client import (
    create_event_from_email,
    get_upcoming_events,
    _build_event_body,
    _parse_event,
)


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
    assert "dateTime" in body["start"]   # Evento con hora, no de día completo
    assert body["location"] == "https://meet.google.com/abc"
    assert body["description"] == "Revisión semanal"


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
    assert "date" in body["start"]       # Evento de día completo
    assert "dateTime" not in body["start"]
    assert "location" not in body        # No se añade si es None
    assert "description" not in body     # No se añade si está vacío


def test_build_event_body_default_title():
    """Verifica que se usa un título por defecto si no hay título."""
    event_data = {"title": None, "date": "2026-04-01", "time": None}
    body = _build_event_body(event_data)
    assert body["summary"] == "Evento sin título"


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
    # Simulamos la respuesta de la API de Google
    mock_events = MagicMock()
    mock_service.return_value.events.return_value = mock_events
    mock_events.insert.return_value.execute.return_value = {
        "summary": "Reunión de equipo",
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
    assert result["summary"] == "Reunión de equipo"
    mock_events.insert.assert_called_once()  # Verifica que se llamó a la API


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
