"""
Punto de entrada de la aplicación gmail-ai-agent.

Al ejecutar este archivo:
1. Se levanta la API FastAPI con uvicorn
2. El procesamiento de correos ocurre SOLO cuando el usuario lo solicita
   vía POST /api/process desde el frontend (botón "Procesar ahora")

El scheduler automático fue eliminado intencionalmente:
- El usuario decide cuándo procesar sus correos
- Evita consumo innecesario de la API de Gemini
- Más adecuado para uso personal con bajo volumen de correos
"""

import uvicorn

from src.api.routes import app  # app es la instancia FastAPI con todos los endpoints


def main() -> None:
    """Inicia el servidor FastAPI. El procesamiento es 100% manual."""

    print("=" * 50)
    print("  Gmail AI Agent — iniciando...")
    print("=" * 50)
    print("\nModo: procesamiento manual (usa el botón 'Procesar ahora')")
    print("API disponible en http://localhost:8000")
    print("Presiona Ctrl+C para detener.\n")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )


if __name__ == "__main__":
    main()
