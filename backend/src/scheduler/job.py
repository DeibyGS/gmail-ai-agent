"""
Scheduler: módulo que une todos los componentes del pipeline y los ejecuta.

Flujo de cada ciclo:
1. Obtiene correos no leídos de Gmail
2. Los clasifica y resume con Gemini
3. Guarda los resultados en SQLite (histórico persistente)
4. Crea eventos en Calendar para correos tipo "reunion"
5. Marca cada correo procesado como leído
6. Imprime un resumen del ciclo
"""

from datetime import datetime

from src.gmail.client import get_unread_emails, mark_as_read
from src.ai.classifier import classify_emails
from src.calendar.client import create_event_from_email
from src.database.init_db import get_db
from src.database.repository import save_emails


def run_processing_cycle() -> None:
    """
    Ejecuta un ciclo completo del pipeline de procesamiento de correos.

    1. Obtener correos no leídos
    2. Clasificarlos con Gemini
    3. Guardar en SQLite para histórico
    4. Crear eventos en Calendar para reuniones con datos válidos
    5. Marcar todos los correos procesados como leídos
    6. Imprimir el resumen del ciclo
    """
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

    # ── Paso 4 y 5: Procesar cada correo ──────────────────────────────────────
    events_created = 0

    for email in classified_emails:
        category = email.get("category", "otro")
        event_data = email.get("event_data")

        if category == "reunion" and event_data:
            result = create_event_from_email(event_data)
            if result:
                events_created += 1

        try:
            mark_as_read(email["id"])
        except Exception as e:
            print(f"  Error al marcar correo '{email.get('subject', '')}' como leído: {e}")

    # ── Paso 6: Resumen del ciclo ──────────────────────────────────────────────
    print(f"\n--- Resumen del ciclo ---")
    print(f"  Correos procesados : {len(classified_emails)}")
    print(f"  Eventos creados    : {events_created}")
    print(f"{'='*50}\n")
