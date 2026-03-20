"""
Tests para main.py — verifica que el modo de arranque es correcto.
"""

from unittest.mock import patch, MagicMock
import importlib


class TestMainStartup:

    @patch("uvicorn.run")
    def test_does_not_start_scheduler(self, mock_uvicorn):
        """Al arrancar, NO debe iniciarse el scheduler automático."""
        with patch("src.scheduler.job.start_scheduler") as mock_scheduler:
            import main
            importlib.reload(main)
            main.main()
            mock_scheduler.assert_not_called()

    @patch("uvicorn.run")
    def test_does_not_run_initial_cycle(self, mock_uvicorn):
        """Al arrancar, NO debe ejecutarse ningún ciclo de procesamiento automático."""
        with patch("src.scheduler.job.run_processing_cycle") as mock_cycle:
            import main
            importlib.reload(main)
            main.main()
            mock_cycle.assert_not_called()

    @patch("uvicorn.run")
    def test_starts_uvicorn_on_port_8000(self, mock_uvicorn):
        """Debe levantar uvicorn en el puerto 8000."""
        import main
        importlib.reload(main)
        main.main()
        mock_uvicorn.assert_called_once()
        call_kwargs = mock_uvicorn.call_args.kwargs
        assert call_kwargs["port"] == 8000
        assert call_kwargs["host"] == "0.0.0.0"
