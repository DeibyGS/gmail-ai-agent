"""
Punto de entrada de la aplicación gmail-ai-agent.

Al ejecutar este archivo:
1. Se lanza un ciclo inmediato de procesamiento de correos
2. Se inicia el scheduler que repite el ciclo cada CHECK_INTERVAL_MINUTES
3. Se levanta la API FastAPI con uvicorn para que el frontend React la consuma
4. La aplicación se mantiene viva hasta recibir Ctrl+C
"""

import sys

import uvicorn

from src.scheduler.job import run_processing_cycle, start_scheduler
from src.api.routes import app  # app es la instancia FastAPI con todos los endpoints


def main() -> None:
    """Inicia la aplicación: ciclo inmediato + scheduler periódico + servidor FastAPI."""

    print("=" * 50)
    print("  Gmail AI Agent — iniciando...")
    print("=" * 50)

    # ── Ciclo inmediato al arrancar ────────────────────────────────────────────
    # Ejecutamos un ciclo ahora mismo para no esperar el primer intervalo
    print("\nEjecutando ciclo inicial...")
    run_processing_cycle()

    # ── Iniciar el scheduler en segundo plano ──────────────────────────────────
    # El scheduler corre en un hilo separado, por eso podemos levantar uvicorn después
    scheduler = start_scheduler()

    # ── Levantar la API FastAPI con uvicorn ────────────────────────────────────
    # uvicorn bloquea el hilo principal; el scheduler sigue corriendo en paralelo
    # host="0.0.0.0" permite conexiones desde cualquier interfaz (necesario para Docker)
    print("\nAPI disponible en http://localhost:8000")
    print("Presiona Ctrl+C para detener la aplicación.\n")

    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
        )
    except KeyboardInterrupt:
        pass
    finally:
        print("\nDeteniendo el scheduler...")
        scheduler.shutdown()
        print("Aplicación detenida. ¡Hasta luego!")
        sys.exit(0)


if __name__ == "__main__":
    main()
