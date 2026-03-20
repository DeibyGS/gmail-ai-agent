"""
Scheduler: módulo que une todos los componentes del pipeline y los ejecuta periódicamente.

Flujo de cada ciclo:
1. Obtiene correos no leídos de Gmail
2. Los clasifica y resume con Gemini
3. Crea eventos en Calendar para los correos de categoría "reunion"
4. Marca cada correo procesado como leído
5. Imprime un resumen del ciclo
"""

from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from config.settings import CHECK_INTERVAL_MINUTES
from src.gmail.client import get_unread_emails, mark_as_read
from src.ai.classifier import classify_emails
from src.calendar.client import create_event_from_email


def is_quiet_hours() -> bool:
    """
    Devuelve True si la hora actual está dentro del horario de descanso (00:00 - 08:00).

    El scheduler no ejecuta ciclos durante estas horas para no generar
    actividad innecesaria de noche.
    """
    current_hour = datetime.now().hour
    # Hora 0 (medianoche) hasta hora 7 (07:59) inclusive → horario de descanso
    return 0 <= current_hour < 8


def run_processing_cycle() -> None:
    """
    Ejecuta un ciclo completo del pipeline de procesamiento de correos.

    Un ciclo consiste en:
    1. Verificar que no sea horario de descanso
    2. Obtener correos no leídos
    3. Clasificarlos con Gemini
    4. Crear eventos en Calendar para reuniones con datos válidos
    5. Marcar todos los correos procesados como leídos
    6. Imprimir el resumen del ciclo
    """
    # Verificación del horario de descanso
    if is_quiet_hours():
        print(f"[{datetime.now().strftime('%H:%M')}] Horario de descanso — ciclo omitido.")
        return

    print(f"\n{'='*50}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Iniciando ciclo de procesamiento...")
    print(f"{'='*50}")

    # ── Paso 1: Obtener correos no leídos ──────────────────────────────────────
    emails = get_unread_emails()

    if not emails:
        print("No hay correos nuevos. Ciclo finalizado.")
        return

    print(f"Correos obtenidos: {len(emails)}")

    # ── Paso 2: Clasificar con Gemini ──────────────────────────────────────────
    classified_emails = classify_emails(emails)

    # ── Paso 3 y 4: Procesar cada correo ──────────────────────────────────────
    events_created = 0

    for email in classified_emails:
        category = email.get("category", "otro")
        event_data = email.get("event_data")

        # Crear evento en Calendar solo si es "reunion" y tiene event_data válido
        if category == "reunion" and event_data:
            result = create_event_from_email(event_data)
            if result:
                events_created += 1

        # Marcar como leído independientemente de la categoría
        try:
            mark_as_read(email["id"])
        except Exception as e:
            print(f"  Error al marcar correo '{email.get('subject', '')}' como leído: {e}")

    # ── Paso 5: Resumen del ciclo ──────────────────────────────────────────────
    print(f"\n--- Resumen del ciclo ---")
    print(f"  Correos procesados : {len(classified_emails)}")
    print(f"  Eventos creados    : {events_created}")
    print(f"{'='*50}\n")


def start_scheduler() -> None:
    """
    Configura e inicia el BackgroundScheduler de APScheduler.

    - Ejecuta run_processing_cycle cada CHECK_INTERVAL_MINUTES minutos
    - El scheduler corre en segundo plano (hilo separado)
    - Devuelve el objeto scheduler para que main.py pueda detenerlo si es necesario
    """
    sched = BackgroundScheduler()

    # Registra el job: se ejecutará cada CHECK_INTERVAL_MINUTES minutos
    sched.add_job(
        func=run_processing_cycle,
        trigger="interval",
        minutes=CHECK_INTERVAL_MINUTES,
        id="email_processing_job",
        name=f"Procesamiento de correos cada {CHECK_INTERVAL_MINUTES} min",
    )

    sched.start()
    print(f"Scheduler iniciado — intervalo: {CHECK_INTERVAL_MINUTES} minutos.")
    return sched
