"""
Tests para el cliente de Gmail.

Usamos unittest.mock para simular la API de Gmail sin hacer llamadas reales.
Esto permite testear la lógica del cliente de forma aislada y rápida.
"""

from unittest.mock import MagicMock, patch
import pytest

from src.gmail.client import get_unread_emails, mark_as_read


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_message(msg_id: str, subject: str, sender: str) -> dict:
    """Construye un mensaje ficticio con la estructura que devuelve Gmail API."""
    return {
        "id": msg_id,
        "payload": {
            "headers": [
                {"name": "Subject", "value": subject},
                {"name": "From", "value": sender},
            ],
            "body": {"data": "SGVsbG8gV29ybGQ="},  # "Hello World" en base64
        },
    }


# ── Tests de get_unread_emails ────────────────────────────────────────────────

class TestGetUnreadEmails:

    @patch("src.gmail.client.get_gmail_service")
    @patch("src.gmail.client.GMAIL_FILTER_AFTER_DATE", "2026/03/20")
    def test_query_includes_after_date_filter(self, mock_get_service):
        """La query enviada a Gmail debe incluir el filtro after: con la fecha configurada."""
        mock_service = MagicMock()
        mock_get_service.return_value = mock_service

        # Simulamos que no hay mensajes (solo nos interesa verificar la query)
        mock_service.users().messages().list().execute.return_value = {"messages": []}

        get_unread_emails()

        # Verificamos que la llamada a list() usó la query correcta
        call_kwargs = mock_service.users().messages().list.call_args.kwargs
        assert "after:2026/03/20" in call_kwargs["q"]
        assert "is:unread" in call_kwargs["q"]
        assert "in:inbox" in call_kwargs["q"]

    @patch("src.gmail.client.get_gmail_service")
    def test_returns_empty_list_when_no_messages(self, mock_get_service):
        """Debe devolver lista vacía si Gmail no tiene correos no leídos."""
        mock_service = MagicMock()
        mock_get_service.return_value = mock_service
        mock_service.users().messages().list().execute.return_value = {}

        result = get_unread_emails()

        assert result == []

    @patch("src.gmail.client.get_gmail_service")
    def test_returns_parsed_emails(self, mock_get_service):
        """Debe devolver correos parseados con id, sender, subject y body."""
        mock_service = MagicMock()
        mock_get_service.return_value = mock_service

        mock_service.users().messages().list().execute.return_value = {
            "messages": [{"id": "abc123"}]
        }
        mock_service.users().messages().get().execute.return_value = (
            _make_message("abc123", "Asunto de prueba", "remitente@ejemplo.com")
        )

        result = get_unread_emails()

        assert len(result) == 1
        assert result[0]["id"] == "abc123"
        assert result[0]["subject"] == "Asunto de prueba"
        assert result[0]["sender"] == "remitente@ejemplo.com"
        assert result[0]["attachments"] == []  # sin adjuntos .ics en este mensaje


# ── Tests de mark_as_read ─────────────────────────────────────────────────────

class TestMarkAsRead:

    @patch("src.gmail.client.get_gmail_service")
    def test_removes_unread_label(self, mock_get_service):
        """Debe llamar a Gmail API para eliminar la etiqueta UNREAD del correo."""
        mock_service = MagicMock()
        mock_get_service.return_value = mock_service

        mark_as_read("abc123")

        mock_service.users().messages().modify.assert_called_once_with(
            userId="me",
            id="abc123",
            body={"removeLabelIds": ["UNREAD"]},
        )
