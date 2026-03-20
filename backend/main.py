"""
Punto de entrada de la aplicación gmail-ai-agent.

Al ejecutar este archivo:
1. Se lanza un ciclo inmediato de procesamiento de correos
2. Se inicia el scheduler que repite el ciclo cada CHECK_INTERVAL_MINUTES
3. La aplicación se mantiene viva hasta recibir Ctrl+C
"""

import time
import sys

from src.scheduler.job import run_processing_cycle, start_scheduler


def main() -> None:
    """Inicia la aplicación: ciclo inmediato + scheduler periódico."""

    print("=" * 50)
    print("  Gmail AI Agent — iniciando...")
    print("=" * 50)

    # ── Ciclo inmediato al arrancar ────────────────────────────────────────────
    # Ejecutamos un ciclo ahora mismo para no esperar el primer intervalo
    print("\nEjecutando ciclo inicial...")
    run_processing_cycle()

    # ── Iniciar el scheduler en segundo plano ──────────────────────────────────
    scheduler = start_scheduler()

    # ── Mantener la aplicación viva ────────────────────────────────────────────
    print("Presiona Ctrl+C para detener la aplicación.\n")
    try:
        while True:
            # Dormimos en intervalos cortos para poder capturar Ctrl+C rápido
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nDeteniendo el scheduler...")
        scheduler.shutdown()
        print("Aplicación detenida. ¡Hasta luego!")
        sys.exit(0)


if __name__ == "__main__":
    main()
