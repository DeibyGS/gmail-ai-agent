"""
Repositorio: capa de acceso a datos para emails_processed.

Centraliza todas las operaciones de lectura/escritura sobre la DB.
Los demás módulos llaman estas funciones en lugar de escribir SQL directamente.
"""

from datetime import datetime, date
from collections import defaultdict
from sqlalchemy.orm import Session
from src.database.models import ProcessedEmail


def save_emails(db: Session, emails: list[dict]) -> int:
    """
    Guarda una lista de correos clasificados en la base de datos.

    Evita duplicados comprobando el email_id antes de insertar.
    Devuelve el número de correos nuevos guardados.
    """
    today = date.today().isoformat()
    saved = 0

    for email in emails:
        email_id = email.get("id", "")

        # Saltar si este correo ya fue guardado en una sesión anterior
        already_exists = db.query(ProcessedEmail).filter(
            ProcessedEmail.email_id == email_id
        ).first()

        if already_exists:
            continue

        record = ProcessedEmail(
            email_id     = email_id,
            subject      = email.get("subject", ""),
            sender       = email.get("sender", ""),
            category     = email.get("category", "otro"),
            processed_at = datetime.now(),
            day          = today,
        )
        db.add(record)
        saved += 1

    db.commit()
    return saved


def get_stats_by_category(db: Session, since_day: str | None = None) -> dict:
    """
    Devuelve el conteo de correos por categoría.

    since_day: filtro opcional en formato "YYYY-MM-DD".
    Si se omite, devuelve el histórico completo.
    """
    query = db.query(ProcessedEmail)
    if since_day:
        query = query.filter(ProcessedEmail.day >= since_day)

    emails = query.all()
    by_category: dict[str, int] = defaultdict(int)

    for email in emails:
        by_category[email.category] += 1

    return {
        "total": len(emails),
        "by_category": dict(by_category),
    }


def get_daily_volume(db: Session, last_days: int = 30) -> list[dict]:
    """
    Devuelve el volumen de correos agrupado por día para los últimos N días.

    Cada elemento: {"day": "YYYY-MM-DD", "total": int, "by_category": {...}}
    Ordenado del más antiguo al más reciente (útil para gráficas de tendencia).
    """
    emails = db.query(ProcessedEmail).order_by(ProcessedEmail.day).all()

    # Agrupar por día
    days: dict[str, dict] = defaultdict(lambda: {"total": 0, "by_category": defaultdict(int)})
    for email in emails:
        days[email.day]["total"] += 1
        days[email.day]["by_category"][email.category] += 1

    # Tomar solo los últimos N días
    sorted_days = sorted(days.keys())[-last_days:]

    return [
        {
            "day": day,
            "total": days[day]["total"],
            "by_category": dict(days[day]["by_category"]),
        }
        for day in sorted_days
    ]


def get_top_senders(db: Session, limit: int = 10, since_day: str | None = None) -> list[dict]:
    """
    Devuelve los remitentes que más correos han enviado.

    Útil para decidir darse de baja de servicios o newsletters.
    Devuelve lista ordenada de mayor a menor: [{"sender": str, "count": int}]
    """
    query = db.query(ProcessedEmail)
    if since_day:
        query = query.filter(ProcessedEmail.day >= since_day)

    emails = query.all()
    sender_counts: dict[str, int] = defaultdict(int)

    for email in emails:
        # Normalizamos el remitente: extraemos solo el email si viene con nombre
        # Ej: "Nombre Empresa <email@example.com>" → "email@example.com"
        sender = email.sender
        if "<" in sender and ">" in sender:
            sender = sender.split("<")[1].rstrip(">").strip()
        sender_counts[sender] += 1

    sorted_senders = sorted(sender_counts.items(), key=lambda x: x[1], reverse=True)

    return [
        {"sender": sender, "count": count}
        for sender, count in sorted_senders[:limit]
    ]
