"""
Tests para la API REST de gmail-ai-agent.

Usa TestClient de FastAPI (basado en httpx) para hacer peticiones HTTP
directamente contra la app sin necesitar levantar un servidor real.

Todos los módulos externos (Gmail, Gemini, Google Calendar, scheduler)
se mockean para que los tests sean rápidos y no requieran credenciales reales.
"""

from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

# Importamos la app FastAPI desde el módulo de rutas
from src.api.routes import app


# ── Fixture: cliente de test ──────────────────────────────────────────────────

@pytest.fixture
def client():
    """
    Crea un TestClient que envuelve la app FastAPI.

    TestClient es síncrono y se puede usar directamente en tests sin async.
    Equivale a hacer peticiones HTTP reales pero sin red ni servidor.
    """
    return TestClient(app)


# ── Datos de prueba ────────────────────────────────────────────────────────────

SAMPLE_EMAILS = [
    {
        "id": "email_001",
        "sender": "boss@empresa.com",
        "subject": "Reunión de equipo mañana",
        "body": "Hola, tenemos reunión mañana a las 10:00 en Sala A.",
        "category": "reunion",
        "summary": "Reunión de equipo mañana a las 10:00 en Sala A.",
        "event_data": {
            "title": "Reunión de equipo",
            "date": "2026-03-21",
            "time": "10:00",
            "location": "Sala A",
            "description": "Revisión del proyecto",
        },
    },
    {
        "id": "email_002",
        "sender": "newsletter@noticias.com",
        "subject": "Novedades de la semana",
        "body": "Esta semana...",
        "category": "informativo",
        "summary": "Boletín semanal de noticias.",
        "event_data": None,
    },
]

SAMPLE_EVENTS = [
    {
        "id": "event_abc",
        "title": "Reunión de equipo",
        "start": "2026-03-21T10:00:00",
        "end": "2026-03-21T11:00:00",
        "location": "Sala A",
        "description": "Revisión del proyecto",
        "link": "https://calendar.google.com/event?eid=abc",
    }
]


# ── Test 1: GET /api/emails — respuesta exitosa ───────────────────────────────

def test_get_emails_success(client):
    """
    Verifica que GET /api/emails devuelve la lista de correos clasificados
    con los campos esperados cuando Gmail y Gemini funcionan correctamente.
    """
    with patch("src.api.routes.get_unread_emails", return_value=SAMPLE_EMAILS[:2]), \
         patch("src.api.routes.classify_emails", return_value=SAMPLE_EMAILS):

        response = client.get("/api/emails")

    assert response.status_code == 200
    data = response.json()

    # Verificamos estructura de la respuesta
    assert "emails" in data
    assert "total" in data
    assert "fetched_at" in data

    # Verificamos que los datos son correctos
    assert data["total"] == 2
    assert len(data["emails"]) == 2
    assert data["emails"][0]["category"] == "reunion"


# ── Test 2: GET /api/emails — bandeja vacía ───────────────────────────────────

def test_get_emails_empty_inbox(client):
    """
    Verifica que GET /api/emails devuelve total=0 y lista vacía
    cuando no hay correos no leídos en Gmail.
    """
    with patch("src.api.routes.get_unread_emails", return_value=[]):
        response = client.get("/api/emails")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["emails"] == []


# ── Test 3: GET /api/emails/stats — estadísticas por categoría ───────────────

def test_get_email_stats(client):
    """
    Verifica que GET /api/emails/stats devuelve el conteo correcto
    agrupado por categoría.
    """
    with patch("src.api.routes.get_unread_emails", return_value=SAMPLE_EMAILS[:2]), \
         patch("src.api.routes.classify_emails", return_value=SAMPLE_EMAILS):

        response = client.get("/api/emails/stats")

    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert "by_category" in data

    # Verificamos los conteos por categoría
    assert data["by_category"]["reunion"] == 1
    assert data["by_category"]["informativo"] == 1


# ── Test 4: GET /api/calendar/events — lista de eventos ──────────────────────

def test_get_calendar_events(client):
    """
    Verifica que GET /api/calendar/events devuelve los próximos eventos
    con los campos correctos.
    """
    with patch("src.api.routes.get_upcoming_events", return_value=SAMPLE_EVENTS):
        response = client.get("/api/calendar/events")

    assert response.status_code == 200
    data = response.json()

    assert "events" in data
    assert "total" in data
    assert data["total"] == 1
    assert data["events"][0]["title"] == "Reunión de equipo"
    assert data["events"][0]["id"] == "event_abc"


# ── Test 5: POST /api/calendar/events — crear evento manualmente ──────────────

def test_create_calendar_event_success(client):
    """
    Verifica que POST /api/calendar/events crea un evento correctamente
    cuando se proporcionan título y fecha válidos.

    El mock de create_event_from_email simula la respuesta de la API de Google.
    """
    mock_created_event = {
        "id": "new_event_xyz",
        "summary": "Demo manual",
        "htmlLink": "https://calendar.google.com/event?eid=xyz",
    }

    event_payload = {
        "title": "Demo manual",
        "date": "2026-04-01",
        "time": "15:00",
        "location": "Sala B",
        "description": "Evento creado desde el frontend",
    }

    with patch("src.api.routes.create_event_from_email", return_value=mock_created_event):
        response = client.post("/api/calendar/events", json=event_payload)

    assert response.status_code == 201
    data = response.json()

    assert data["message"] == "Evento creado correctamente"
    assert "event" in data
    assert data["event"]["id"] == "new_event_xyz"


# ── Test 6: POST /api/calendar/events — validación de campos requeridos ───────

def test_create_calendar_event_missing_fields(client):
    """
    Verifica que POST /api/calendar/events devuelve 422 (Unprocessable Entity)
    cuando faltan campos obligatorios (title y date son requeridos por Pydantic).
    """
    # Enviamos un body sin 'date', que es requerido
    incomplete_payload = {"title": "Solo título, sin fecha"}

    response = client.post("/api/calendar/events", json=incomplete_payload)

    # Pydantic devuelve 422 automáticamente si falta un campo requerido
    assert response.status_code == 422


# ── Test 7: POST /api/process — forzar ciclo de procesamiento ─────────────────

def test_trigger_processing_cycle(client):
    """
    Verifica que POST /api/process llama a run_processing_cycle()
    y devuelve confirmación con timestamp.
    """
    with patch("src.api.routes.run_processing_cycle") as mock_cycle:
        response = client.post("/api/process")

    assert response.status_code == 200
    data = response.json()

    # Verificamos que la función fue llamada exactamente una vez
    mock_cycle.assert_called_once()

    assert "message" in data
    assert "executed_at" in data
    assert "correctamente" in data["message"]


# ── Test 8: Manejo de error — Gmail falla ────────────────────────────────────

def test_get_emails_gmail_error(client):
    """
    Verifica que GET /api/emails devuelve 502 (Bad Gateway)
    cuando la API de Gmail lanza una excepción.

    502 significa que el servidor actuó como gateway y obtuvo una respuesta inválida
    del servicio externo (Gmail en este caso).
    """
    with patch("src.api.routes.get_unread_emails", side_effect=Exception("Gmail API timeout")):
        response = client.get("/api/emails")

    assert response.status_code == 502
    data = response.json()
    assert "detail" in data
    assert "Gmail" in data["detail"]
