"""
Tests para el módulo scheduler/job.py

Usamos mocks (unittest.mock) para evitar llamadas reales a:
- Gmail API
- Gemini API
- Google Calendar API

Esto permite que los tests sean rápidos, deterministas y no requieran credenciales.
"""

import pytest
from unittest.mock import patch, MagicMock, call
from datetime import datetime


# ── Helpers de fixtures ────────────────────────────────────────────────────────

def make_email(email_id: str, category: str, event_data=None) -> dict:
    """Crea un correo clasificado de ejemplo para usar en los tests."""
    return {
        "id": email_id,
        "sender": "remitente@ejemplo.com",
        "subject": f"Correo de prueba {email_id}",
        "body": "Contenido del correo",
        "category": category,
        "summary": "Resumen de prueba",
        "event_data": event_data,
    }


# ── Tests de is_quiet_hours ────────────────────────────────────────────────────

class TestIsQuietHours:
    """Verifica que is_quiet_hours detecte correctamente el horario de descanso."""

    def test_hora_dentro_del_horario_descanso(self):
        """Las horas entre 00:00 y 07:59 deben retornar True."""
        from src.scheduler.job import is_quiet_hours

        # Probamos horas representativas del bloqueo (0, 3, 7)
        horas_bloqueadas = [0, 1, 3, 5, 7]
        for hora in horas_bloqueadas:
            mock_now = datetime(2026, 3, 20, hora, 30)
            with patch("src.scheduler.job.datetime") as mock_dt:
                mock_dt.now.return_value = mock_now
                assert is_quiet_hours() is True, f"Hora {hora}:30 debería ser horario de descanso"

    def test_hora_fuera_del_horario_descanso(self):
        """Las horas desde las 08:00 en adelante deben retornar False."""
        from src.scheduler.job import is_quiet_hours

        horas_activas = [8, 10, 14, 18, 23]
        for hora in horas_activas:
            mock_now = datetime(2026, 3, 20, hora, 0)
            with patch("src.scheduler.job.datetime") as mock_dt:
                mock_dt.now.return_value = mock_now
                assert is_quiet_hours() is False, f"Hora {hora}:00 NO debería ser horario de descanso"

    def test_limite_exacto_08_00(self):
        """Las 08:00 exactas deben estar fuera del horario de descanso."""
        from src.scheduler.job import is_quiet_hours

        mock_now = datetime(2026, 3, 20, 8, 0)
        with patch("src.scheduler.job.datetime") as mock_dt:
            mock_dt.now.return_value = mock_now
            assert is_quiet_hours() is False


# ── Tests de run_processing_cycle ─────────────────────────────────────────────

class TestRunProcessingCycle:
    """Tests del ciclo principal de procesamiento."""

    def test_omite_ciclo_en_horario_descanso(self, capsys):
        """Si es horario de descanso, el ciclo debe salir sin hacer nada."""
        from src.scheduler.job import run_processing_cycle

        with patch("src.scheduler.job.is_quiet_hours", return_value=True), \
             patch("src.scheduler.job.get_unread_emails") as mock_gmail:

            run_processing_cycle()

            # Gmail NO debe ser llamado si estamos en horario de descanso
            mock_gmail.assert_not_called()

        captured = capsys.readouterr()
        assert "omitido" in captured.out.lower()

    def test_no_hace_nada_si_no_hay_correos(self, capsys):
        """Si Gmail devuelve lista vacía, no debe clasificar correos."""
        from src.scheduler.job import run_processing_cycle

        with patch("src.scheduler.job.is_quiet_hours", return_value=False), \
             patch("src.scheduler.job.get_unread_emails", return_value=[]), \
             patch("src.scheduler.job.classify_emails") as mock_classify:

            run_processing_cycle()

            mock_classify.assert_not_called()

    def test_ciclo_completo_con_correo_reunion(self):
        """
        Con un correo de categoría 'reunion':
        - NO debe llamar a create_event_from_email (agendado es manual)
        - debe marcar el correo como leído
        """
        from src.scheduler.job import run_processing_cycle

        event_data = {
            "title": "Reunión de equipo",
            "date": "2026-03-25",
            "time": "10:00",
            "location": None,
            "description": "Revisión semanal"
        }
        email = make_email("abc123", "reunion", event_data=event_data)

        with patch("src.scheduler.job.is_quiet_hours", return_value=False), \
             patch("src.scheduler.job.get_unread_emails", return_value=[email]), \
             patch("src.scheduler.job.classify_emails", return_value=[email]), \
             patch("src.scheduler.job.mark_as_read") as mock_mark:

            run_processing_cycle()

            # El correo debe marcarse como leído
            mock_mark.assert_called_once_with("abc123")

    def test_ciclo_con_correo_no_reunion(self):
        """
        Con un correo de categoría distinta a 'reunion':
        - debe marcar el correo como leído
        """
        from src.scheduler.job import run_processing_cycle

        email = make_email("xyz789", "promocion", event_data=None)

        with patch("src.scheduler.job.is_quiet_hours", return_value=False), \
             patch("src.scheduler.job.get_unread_emails", return_value=[email]), \
             patch("src.scheduler.job.classify_emails", return_value=[email]), \
             patch("src.scheduler.job.mark_as_read") as mock_mark:

            run_processing_cycle()

            mock_mark.assert_called_once_with("xyz789")

    def test_ciclo_con_reunion_sin_event_data(self):
        """
        Un correo de categoría 'reunion' con event_data=None:
        - debe marcar como leído (el agendado es responsabilidad del usuario)
        """
        from src.scheduler.job import run_processing_cycle

        email = make_email("zzz000", "reunion", event_data=None)

        with patch("src.scheduler.job.is_quiet_hours", return_value=False), \
             patch("src.scheduler.job.get_unread_emails", return_value=[email]), \
             patch("src.scheduler.job.classify_emails", return_value=[email]), \
             patch("src.scheduler.job.mark_as_read") as mock_mark:

            run_processing_cycle()

            mock_mark.assert_called_once_with("zzz000")

    def test_ciclo_procesa_multiples_correos(self):
        """
        Con múltiples correos de distintas categorías:
        - Marca todos como leídos (sin auto-agendado)
        """
        from src.scheduler.job import run_processing_cycle

        event_data = {"title": "Call", "date": "2026-04-01", "time": "09:00",
                      "location": None, "description": ""}
        emails = [
            make_email("id1", "reunion", event_data=event_data),
            make_email("id2", "promocion", event_data=None),
            make_email("id3", "recordatorio", event_data=None),
            make_email("id4", "reunion", event_data=None),
        ]

        with patch("src.scheduler.job.is_quiet_hours", return_value=False), \
             patch("src.scheduler.job.get_unread_emails", return_value=emails), \
             patch("src.scheduler.job.classify_emails", return_value=emails), \
             patch("src.scheduler.job.mark_as_read") as mock_mark:

            run_processing_cycle()

            # Los 4 correos deben marcarse como leídos
            assert mock_mark.call_count == 4
            mock_mark.assert_any_call("id1")
            mock_mark.assert_any_call("id2")
            mock_mark.assert_any_call("id3")
            mock_mark.assert_any_call("id4")

    def test_error_al_marcar_como_leido_no_interrumpe_ciclo(self, capsys):
        """
        Si mark_as_read lanza una excepción para un correo,
        el ciclo debe continuar procesando los correos restantes.
        """
        from src.scheduler.job import run_processing_cycle

        email1 = make_email("fail_id", "otro", event_data=None)
        email2 = make_email("ok_id", "otro", event_data=None)

        def mark_side_effect(email_id):
            if email_id == "fail_id":
                raise Exception("Error de red simulado")

        with patch("src.scheduler.job.is_quiet_hours", return_value=False), \
             patch("src.scheduler.job.get_unread_emails", return_value=[email1, email2]), \
             patch("src.scheduler.job.classify_emails", return_value=[email1, email2]), \
             patch("src.scheduler.job.mark_as_read", side_effect=mark_side_effect) as mock_mark:

            # No debe lanzar excepción aunque uno falle
            run_processing_cycle()

            # Ambos correos deben haberse intentado marcar
            assert mock_mark.call_count == 2

    def test_resumen_imprime_contadores_correctos(self, capsys):
        """El resumen al final del ciclo debe mostrar los contadores correctos."""
        from src.scheduler.job import run_processing_cycle

        event_data = {"title": "Demo", "date": "2026-05-01",
                      "time": "15:00", "location": None, "description": ""}
        emails = [
            make_email("e1", "reunion", event_data=event_data),
            make_email("e2", "otro", event_data=None),
        ]

        with patch("src.scheduler.job.is_quiet_hours", return_value=False), \
             patch("src.scheduler.job.get_unread_emails", return_value=emails), \
             patch("src.scheduler.job.classify_emails", return_value=emails), \
             patch("src.scheduler.job.mark_as_read"):

            run_processing_cycle()

        captured = capsys.readouterr()
        assert "2" in captured.out   # 2 correos procesados
        assert "1" in captured.out   # 1 reunión detectada para agendar manualmente


# ── Tests de start_scheduler ──────────────────────────────────────────────────

class TestStartScheduler:
    """Tests de la configuración del scheduler de APScheduler."""

    def test_start_scheduler_registra_job_y_arranca(self):
        """start_scheduler debe registrar el job y llamar a scheduler.start()."""
        from src.scheduler.job import start_scheduler

        mock_scheduler_instance = MagicMock()
        mock_scheduler_class = MagicMock(return_value=mock_scheduler_instance)

        # BackgroundScheduler está importado a nivel de módulo en job.py,
        # así que el mock debe apuntar a src.scheduler.job.BackgroundScheduler
        with patch("src.scheduler.job.BackgroundScheduler", mock_scheduler_class):
            result = start_scheduler()

        # Debe haber añadido exactamente un job
        mock_scheduler_instance.add_job.assert_called_once()

        # El scheduler debe haberse iniciado
        mock_scheduler_instance.start.assert_called_once()

        # Debe devolver el objeto scheduler (la instancia)
        assert result is mock_scheduler_instance

    def test_start_scheduler_usa_check_interval_minutes(self):
        """El intervalo del job debe coincidir con CHECK_INTERVAL_MINUTES."""
        from src.scheduler.job import start_scheduler
        from config.settings import CHECK_INTERVAL_MINUTES

        mock_scheduler_instance = MagicMock()
        mock_scheduler_class = MagicMock(return_value=mock_scheduler_instance)

        with patch("src.scheduler.job.BackgroundScheduler", mock_scheduler_class):
            start_scheduler()

        call_kwargs = mock_scheduler_instance.add_job.call_args
        kwargs = call_kwargs.kwargs if call_kwargs.kwargs else call_kwargs[1]
        assert kwargs.get("minutes") == CHECK_INTERVAL_MINUTES
