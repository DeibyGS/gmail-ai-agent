"""
Tests para la capa de base de datos SQLite.

Usamos una DB en memoria (:memory:) para que los tests sean rápidos,
independientes y no dejen archivos en disco.
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from src.database.models import Base
from src.database.repository import (
    save_emails,
    get_stats_by_category,
    get_daily_volume,
    get_top_senders,
    get_processed_today,
    get_processed_history,
)


# ── Fixture: DB en memoria para cada test ─────────────────────────────────────

@pytest.fixture
def db() -> Session:
    """Crea una base de datos SQLite en memoria limpia para cada test.

    Incluye la tabla virtual FTS5 'emails_fts' que save_emails() necesita
    para indexar los correos en tiempo real.
    """
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    # Crear tabla FTS5 (no es un modelo SQLAlchemy, requiere SQL crudo)
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
                email_id UNINDEXED,
                subject,
                sender,
                summary,
                tokenize='unicode61'
            )
        """))
        conn.commit()
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


# ── Datos de prueba ───────────────────────────────────────────────────────────

SAMPLE_EMAILS = [
    {"id": "e1", "subject": "Reunión mañana",  "sender": "jefe@empresa.com",      "category": "reunion",    "summary": "Reunión el lunes"},
    {"id": "e2", "subject": "Oferta especial", "sender": "promo@tienda.com",      "category": "promocion",  "summary": "Descuento 50%"},
    {"id": "e3", "subject": "Urgente: revisar","sender": "jefe@empresa.com",      "category": "urgente",    "summary": "Revisar contrato"},
    {"id": "e4", "subject": "Newsletter",       "sender": "noticias@servicio.com", "category": "promocion",  "summary": "Novedades del mes"},
]


# ── Tests de save_emails ──────────────────────────────────────────────────────

class TestSaveEmails:

    def test_saves_all_emails(self, db):
        """Debe guardar todos los correos de la lista."""
        saved = save_emails(db, SAMPLE_EMAILS)
        assert saved == 4

    def test_avoids_duplicates(self, db):
        """Si se guarda el mismo correo dos veces, la segunda vez no se inserta."""
        save_emails(db, SAMPLE_EMAILS)
        saved_again = save_emails(db, SAMPLE_EMAILS)
        assert saved_again == 0

    def test_saves_partial_new(self, db):
        """Solo guarda los correos que no existen todavía."""
        save_emails(db, SAMPLE_EMAILS[:2])
        # Los dos primeros ya existen, los dos últimos son nuevos
        saved = save_emails(db, SAMPLE_EMAILS)
        assert saved == 2


# ── Tests de get_stats_by_category ───────────────────────────────────────────

class TestStatsByCategory:

    def test_returns_correct_totals(self, db):
        save_emails(db, SAMPLE_EMAILS)
        stats = get_stats_by_category(db)
        assert stats["total"] == 4
        assert stats["by_category"]["promocion"] == 2
        assert stats["by_category"]["reunion"] == 1
        assert stats["by_category"]["urgente"] == 1

    def test_empty_db_returns_zero(self, db):
        stats = get_stats_by_category(db)
        assert stats["total"] == 0
        assert stats["by_category"] == {}


# ── Tests de get_daily_volume ─────────────────────────────────────────────────

class TestDailyVolume:

    def test_returns_list(self, db):
        save_emails(db, SAMPLE_EMAILS)
        result = get_daily_volume(db)
        assert isinstance(result, list)
        # Todos los emails tienen el mismo día (hoy)
        assert len(result) == 1
        assert result[0]["total"] == 4

    def test_empty_db_returns_empty_list(self, db):
        result = get_daily_volume(db)
        assert result == []


# ── Tests de get_top_senders ──────────────────────────────────────────────────

class TestTopSenders:

    def test_orders_by_count_descending(self, db):
        save_emails(db, SAMPLE_EMAILS)
        result = get_top_senders(db)
        # jefe@empresa.com tiene 2, los demás tienen 1
        assert result[0]["sender"] == "jefe@empresa.com"
        assert result[0]["count"] == 2

    def test_respects_limit(self, db):
        save_emails(db, SAMPLE_EMAILS)
        result = get_top_senders(db, limit=2)
        assert len(result) <= 2

    def test_empty_db_returns_empty_list(self, db):
        result = get_top_senders(db)
        assert result == []


# ── Tests de get_processed_today ──────────────────────────────────────────────

class TestGetProcessedToday:

    def test_returns_todays_emails(self, db):
        """Debe devolver los correos procesados hoy."""
        save_emails(db, SAMPLE_EMAILS)
        result = get_processed_today(db)
        assert len(result) == 4

    def test_includes_summary(self, db):
        """Los correos deben incluir el campo summary."""
        save_emails(db, SAMPLE_EMAILS)
        result = get_processed_today(db)
        assert all("summary" in e for e in result)
        subjects = [e["summary"] for e in result]
        assert "Reunión el lunes" in subjects

    def test_ordered_most_recent_first(self, db):
        """Los correos deben venir del más reciente al más antiguo."""
        save_emails(db, SAMPLE_EMAILS)
        result = get_processed_today(db)
        times = [e["processed_at"] for e in result]
        assert times == sorted(times, reverse=True)

    def test_empty_db_returns_empty(self, db):
        assert get_processed_today(db) == []


# ── Tests de get_processed_history ───────────────────────────────────────────

class TestGetProcessedHistory:

    def test_returns_all_without_filters(self, db):
        save_emails(db, SAMPLE_EMAILS)
        result = get_processed_history(db)
        assert len(result) == 4

    def test_filter_by_category(self, db):
        save_emails(db, SAMPLE_EMAILS)
        result = get_processed_history(db, category="promocion")
        assert len(result) == 2
        assert all(e["category"] == "promocion" for e in result)

    def test_respects_limit(self, db):
        save_emails(db, SAMPLE_EMAILS)
        result = get_processed_history(db, limit=2)
        assert len(result) == 2

    def test_empty_db_returns_empty(self, db):
        assert get_processed_history(db) == []
