"""
Tests para el módulo classifier: extracción de .ics y conversión de RRULE.

Las llamadas a Gemini se mockean para no incurrir en costes ni latencia.
"""
from unittest.mock import patch, MagicMock

from src.ai.classifier import (
    extract_event_from_ics,
    _rrule_to_pattern,
    classify_email,
    VALID_CATEGORIES,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_ics(
    summary: str = "Reunión de equipo",
    dtstart: str = "20260325T090000",
    location: str = "",
    description: str = "",
    rrule: str = "",
) -> bytes:
    """Genera un .ics mínimo válido para usar en tests."""
    rrule_line = f"RRULE:{rrule}\r\n" if rrule else ""
    location_line = f"LOCATION:{location}\r\n" if location else ""
    description_line = f"DESCRIPTION:{description}\r\n" if description else ""
    return (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "BEGIN:VEVENT\r\n"
        f"SUMMARY:{summary}\r\n"
        f"DTSTART:{dtstart}\r\n"
        f"DTEND:{dtstart}\r\n"
        f"{rrule_line}"
        f"{location_line}"
        f"{description_line}"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    ).encode()


def _make_allday_ics(summary: str = "Día completo") -> bytes:
    """Genera un .ics de evento de día completo (sin hora)."""
    return (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "BEGIN:VEVENT\r\n"
        f"SUMMARY:{summary}\r\n"
        "DTSTART;VALUE=DATE:20260325\r\n"
        "DTEND;VALUE=DATE:20260326\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    ).encode()


# ── Tests de extract_event_from_ics ──────────────────────────────────────────

def test_extract_event_from_ics_no_attachments():
    """Lista vacía devuelve None."""
    assert extract_event_from_ics([]) is None


def test_extract_event_from_ics_attachment_without_ics():
    """Adjunto que no es .ics devuelve None."""
    result = extract_event_from_ics([{"filename": "doc.pdf", "data": b"not ics"}])
    assert result is None


def test_extract_event_from_ics_invalid_data():
    """Datos corruptos no lanzan excepción y devuelven None."""
    result = extract_event_from_ics([{"filename": "invite.ics", "data": b"INVALID DATA"}])
    assert result is None


def test_extract_event_from_ics_basic_event():
    """Extrae título, fecha y hora de un .ics con DTSTART datetime."""
    data = _make_ics(summary="Standup", dtstart="20260325T090000")
    result = extract_event_from_ics([{"filename": "invite.ics", "data": data}])

    assert result is not None
    assert result["title"] == "Standup"
    assert result["date"] == "2026-03-25"
    assert result["time"] == "09:00"
    assert result["recurrence"] is None


def test_extract_event_from_ics_allday_event():
    """Evento de día completo: tiene date pero no time."""
    data = _make_allday_ics(summary="Día libre")
    result = extract_event_from_ics([{"filename": "invite.ics", "data": data}])

    assert result is not None
    assert result["date"] == "2026-03-25"
    assert result["time"] is None


def test_extract_event_from_ics_with_location_and_description():
    """Extrae location y description correctamente."""
    data = _make_ics(
        summary="Reunión",
        dtstart="20260325T100000",
        location="https://meet.google.com/abc",
        description="Revisión semanal",
    )
    result = extract_event_from_ics([{"filename": "invite.ics", "data": data}])

    assert result["location"] == "https://meet.google.com/abc"
    assert result["description"] == "Revisión semanal"


def test_extract_event_from_ics_with_weekly_rrule():
    """Extrae recurrencia WEEKLY correctamente."""
    data = _make_ics(dtstart="20260325T090000", rrule="FREQ=WEEKLY;BYDAY=MO,WE,FR")
    result = extract_event_from_ics([{"filename": "invite.ics", "data": data}])

    assert result["recurrence"] == "WEEKLY:MO,WE,FR"


def test_extract_event_from_ics_with_daily_rrule():
    """Extrae recurrencia DAILY correctamente."""
    data = _make_ics(dtstart="20260325T090000", rrule="FREQ=DAILY")
    result = extract_event_from_ics([{"filename": "invite.ics", "data": data}])

    assert result["recurrence"] == "DAILY"


def test_extract_event_from_ics_with_monthly_rrule():
    """Extrae recurrencia MONTHLY correctamente."""
    data = _make_ics(dtstart="20260325T090000", rrule="FREQ=MONTHLY;BYMONTHDAY=25")
    result = extract_event_from_ics([{"filename": "invite.ics", "data": data}])

    assert result["recurrence"] == "MONTHLY:25"


def test_extract_event_from_ics_uses_first_attachment():
    """Usa el primer adjunto .ics si hay varios."""
    data1 = _make_ics(summary="Primero", dtstart="20260325T090000")
    data2 = _make_ics(summary="Segundo", dtstart="20260326T100000")
    attachments = [
        {"filename": "first.ics", "data": data1},
        {"filename": "second.ics", "data": data2},
    ]
    result = extract_event_from_ics(attachments)
    assert result["title"] == "Primero"


# ── Tests de _rrule_to_pattern ────────────────────────────────────────────────

def test_rrule_to_pattern_none():
    """None devuelve None."""
    assert _rrule_to_pattern(None) is None


def test_rrule_to_pattern_daily():
    """FREQ=DAILY → 'DAILY'."""
    from icalendar import vRecur
    rrule = vRecur.from_ical("FREQ=DAILY")
    assert _rrule_to_pattern(rrule) == "DAILY"


def test_rrule_to_pattern_weekly_single():
    """FREQ=WEEKLY;BYDAY=MO → 'WEEKLY:MO'."""
    from icalendar import vRecur
    rrule = vRecur.from_ical("FREQ=WEEKLY;BYDAY=MO")
    assert _rrule_to_pattern(rrule) == "WEEKLY:MO"


def test_rrule_to_pattern_weekly_multiple():
    """FREQ=WEEKLY;BYDAY=MO,WE,FR → 'WEEKLY:MO,WE,FR'."""
    from icalendar import vRecur
    rrule = vRecur.from_ical("FREQ=WEEKLY;BYDAY=MO,WE,FR")
    result = _rrule_to_pattern(rrule)
    assert result is not None
    assert result.startswith("WEEKLY:")
    assert "MO" in result
    assert "WE" in result
    assert "FR" in result


def test_rrule_to_pattern_monthly():
    """FREQ=MONTHLY;BYMONTHDAY=15 → 'MONTHLY:15'."""
    from icalendar import vRecur
    rrule = vRecur.from_ical("FREQ=MONTHLY;BYMONTHDAY=15")
    assert _rrule_to_pattern(rrule) == "MONTHLY:15"


def test_rrule_to_pattern_unknown_freq():
    """FREQ desconocida devuelve None."""
    from icalendar import vRecur
    rrule = vRecur.from_ical("FREQ=YEARLY")
    assert _rrule_to_pattern(rrule) is None


# ── Test de classify_email con .ics (integración con mock) ───────────────────

@patch("src.ai.classifier.client")
def test_classify_email_ics_forces_reunion_category(mock_genai_client):
    """Si hay .ics válido, la categoría se fuerza a 'reunion' aunque Gemini diga otra cosa."""
    # Gemini clasifica como "promocion" (como puede pasar con asuntos tipo "Daily X")
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "promocion", "summary": "Newsletter diaria.", "event_data": null}'
    )
    ics_data = _make_ics(summary="Daily Meeting", dtstart="20260325T090000")
    email = {
        "id": "test-force",
        "sender": "organizer@empresa.com",
        "subject": "Daily PyCantes M-X-V",
        "body": "Invitación de calendario adjunta.",
        "attachments": [{"filename": "invite.ics", "data": ics_data}],
    }
    result = classify_email(email)
    # El .ics confirma que es reunión — la categoría debe ser "reunion", no "promocion"
    assert result["category"] == "reunion"
    assert result["event_data"]["title"] == "Daily Meeting"


@patch("src.ai.classifier.client")
def test_classify_email_ics_overrides_gemini_event_data(mock_genai_client):
    """Si hay .ics, event_data del .ics sobreescribe el de Gemini."""
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "reunion", "summary": "Reunión de equipo", "event_data": {"title": "Gemini title", "date": "2026-01-01", "time": null, "location": null, "description": null, "recurrence": null}}'
    )

    ics_data = _make_ics(summary="ICS Title", dtstart="20260325T090000")
    email = {
        "id": "test-1",
        "sender": "test@example.com",
        "subject": "Reunión",
        "body": "Invitación a reunión",
        "attachments": [{"filename": "invite.ics", "data": ics_data}],
    }

    result = classify_email(email)

    # El .ics sobreescribe: título y fecha vienen del .ics, no de Gemini
    assert result["event_data"]["title"] == "ICS Title"
    assert result["event_data"]["date"] == "2026-03-25"


@patch("src.ai.classifier.client")
def test_classify_email_uses_gemini_when_no_ics(mock_genai_client):
    """Sin .ics, event_data viene de Gemini."""
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "reunion", "summary": "Reunión", "event_data": {"title": "Gemini title", "date": "2026-03-25", "time": "10:00", "location": null, "description": null, "recurrence": null}}'
    )

    email = {
        "id": "test-2",
        "sender": "test@example.com",
        "subject": "Reunión",
        "body": "Invitación",
        "attachments": [],
    }

    result = classify_email(email)
    assert result["event_data"]["title"] == "Gemini title"


# ── Tests de VALID_CATEGORIES (9 categorías) ─────────────────────────────────

def test_valid_categories_count():
    """Debe haber exactamente 9 categorías válidas."""
    assert len(VALID_CATEGORIES) == 9


def test_valid_categories_contains_all_expected():
    """Todas las categorías originales y nuevas deben estar presentes."""
    expected = {
        # Originales
        "promocion", "reunion", "recordatorio", "personal", "otro",
        # Nuevas
        "factura", "soporte", "notificacion", "urgente",
    }
    assert VALID_CATEGORIES == expected


@patch("src.ai.classifier.client")
def test_classify_email_new_category_factura(mock_genai_client):
    """Gemini puede devolver 'factura' como categoría válida."""
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "factura", "summary": "Factura de servicio por 49.99€.", "event_data": null}'
    )
    email = {
        "id": "test-factura",
        "sender": "billing@empresa.com",
        "subject": "Tu factura de marzo",
        "body": "Adjuntamos tu factura por 49.99€.",
        "attachments": [],
    }
    result = classify_email(email)
    assert result["category"] == "factura"
    assert result["event_data"] is None


@patch("src.ai.classifier.client")
def test_classify_email_new_category_soporte(mock_genai_client):
    """Gemini puede devolver 'soporte' como categoría válida."""
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "soporte", "summary": "Ticket #4521 abierto por error 500.", "event_data": null}'
    )
    email = {
        "id": "test-soporte",
        "sender": "noreply@helpdesk.io",
        "subject": "Ticket #4521 creado",
        "body": "Tu ticket de soporte ha sido creado.",
        "attachments": [],
    }
    result = classify_email(email)
    assert result["category"] == "soporte"


@patch("src.ai.classifier.client")
def test_classify_email_new_category_notificacion(mock_genai_client):
    """Gemini puede devolver 'notificacion' como categoría válida."""
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "notificacion", "summary": "GitHub notifica un nuevo PR en el repositorio.", "event_data": null}'
    )
    email = {
        "id": "test-notif",
        "sender": "noreply@github.com",
        "subject": "[GitHub] New pull request opened",
        "body": "A new pull request was opened by user123.",
        "attachments": [],
    }
    result = classify_email(email)
    assert result["category"] == "notificacion"


@patch("src.ai.classifier.client")
def test_classify_email_new_category_urgente(mock_genai_client):
    """Gemini puede devolver 'urgente' como categoría válida."""
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "urgente", "summary": "Requiere acción inmediata: cuenta bloqueada.", "event_data": null}'
    )
    email = {
        "id": "test-urgente",
        "sender": "security@banco.com",
        "subject": "URGENTE: Tu cuenta ha sido bloqueada",
        "body": "Debes verificar tu identidad en las próximas 2 horas.",
        "attachments": [],
    }
    result = classify_email(email)
    assert result["category"] == "urgente"


@patch("src.ai.classifier.client")
def test_classify_email_invalid_category_falls_back_to_otro(mock_genai_client):
    """Si Gemini devuelve una categoría no válida, se usa 'otro' como fallback."""
    mock_genai_client.models.generate_content.return_value = MagicMock(
        text='{"category": "desconocida", "summary": "Correo sin clasificar.", "event_data": null}'
    )
    email = {
        "id": "test-fallback",
        "sender": "test@test.com",
        "subject": "Asunto cualquiera",
        "body": "Cuerpo del correo.",
        "attachments": [],
    }
    result = classify_email(email)
    assert result["category"] == "otro"
