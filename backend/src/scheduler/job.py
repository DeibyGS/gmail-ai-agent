"""
Scheduler: módulo que une todos los componentes del pipeline y los ejecuta.

Flujo de cada ciclo:
1. Obtiene correos no leídos de Gmail
2. Los clasifica y resume con Gemini
3. Guarda los resultados en SQLite (histórico persistente)
4. Marca cada correo procesado como leído
5. Imprime un resumen del ciclo

Nota: el agendado de eventos en Calendar es MANUAL.
El usuario selecciona los correos de reunión y los agenda desde el dashboard.
"""

from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from src.gmail.client import get_unread_emails, mark_as_read
from src.ai.classifier import classify_emails
from src.database.init_db import get_db
from src.database.repository import save_emails
from config.settings import CHECK_INTERVAL_MINUTES, QUIET_HOURS_START, QUIET_HOURS_END


def is_quiet_hours() -> bool:
    """
    Retorna True si la hora actual está en el horario de descanso configurado.
    Los límites se leen de QUIET_HOURS_START y QUIET_HOURS_END en settings.
    """
    hour = datetime.now().hour
    return QUIET_HOURS_START <= hour < QUIET_HOURS_END


def run_processing_cycle() -> None:
    """
    Ejecuta un ciclo completo del pipeline de procesamiento de correos.

    1. Obtener correos no leídos
    2. Clasificarlos con Gemini
    3. Guardar en SQLite para histórico
    4. Marcar todos los correos procesados como leídos
    5. Imprimir el resumen del ciclo

    El agendado de Calendar es manual: el usuario usa el botón
    "Agendar" en el dashboard para cada correo de reunión.
    """
    if is_quiet_hours():
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Ciclo omitido — horario de descanso (00:00–07:59).")
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

    # ── Paso 3: Guardar en SQLite ──────────────────────────────────────────────
    # Persistimos antes de marcar como leídos para no perder datos si algo falla
    db = get_db()
    try:
        saved = save_emails(db, classified_emails)
        print(f"Correos guardados en DB: {saved} nuevos")
    finally:
        db.close()

    # ── Paso 4: Marcar correos como leídos ────────────────────────────────────
    for email in classified_emails:
        try:
            mark_as_read(email["id"])
        except Exception as e:
            print(f"  Error al marcar correo '{email.get('subject', '')}' como leído: {e}")

    # ── Paso 5: Resumen del ciclo ──────────────────────────────────────────────
    print("\n--- Resumen del ciclo ---")
    print(f"  Correos procesados : {len(classified_emails)}")
    print(f"  Reuniones detectadas para agendar manualmente: "
          f"{sum(1 for e in classified_emails if e.get('category') == 'reunion')}")
    print(f"{'='*50}\n")


def start_scheduler() -> BackgroundScheduler:
    """
    Crea, configura e inicia el BackgroundScheduler de APScheduler.

    Registra run_processing_cycle como job periódico con el intervalo
    definido en CHECK_INTERVAL_MINUTES y devuelve la instancia activa.
    """
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_processing_cycle,
        trigger="interval",
        minutes=CHECK_INTERVAL_MINUTES,
    )
    scheduler.start()
    return scheduler
