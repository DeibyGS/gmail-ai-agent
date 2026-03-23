"""
Inicialización de la base de datos SQLite.

Este módulo crea el engine (conexión) y la sesión de SQLAlchemy.
Se llama una vez al arrancar la aplicación para asegurar que las tablas existen.
"""

from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from src.database.models import Base

# Ruta al archivo .db — vive en backend/data/ y nunca se commitea al repo
DB_PATH = Path(__file__).parent.parent.parent / "data" / "emails.db"
DB_URL = f"sqlite:///{DB_PATH}"

# Engine: representa la conexión a la base de datos
# check_same_thread=False es necesario porque FastAPI usa múltiples hilos
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

# SessionLocal: fábrica de sesiones — cada operación usa una sesión propia
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db() -> None:
    """
    Crea todas las tablas definidas en models.py si no existen.
    También crea/sincroniza la tabla FTS5 para búsqueda de texto completo.
    Seguro de llamar múltiples veces (no borra datos existentes).
    """
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _init_fts()


def _init_fts() -> None:
    """
    Crea la tabla virtual FTS5 'emails_fts' y la sincroniza con emails_processed.

    FTS5 (Full-Text Search 5) es una extensión de SQLite que permite buscar texto
    de forma eficiente en múltiples columnas simultáneamente.

    La tabla se reconstruye en cada arranque para mantenerla sincronizada
    con los datos reales (es solo un índice de búsqueda, no una fuente de verdad).
    """
    with engine.connect() as conn:
        # Crear tabla virtual FTS5 si no existe aún
        conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
                email_id UNINDEXED,
                subject,
                sender,
                summary,
                tokenize='unicode61'
            )
        """))
        # Sincronizar: limpiar y repoblar desde la tabla principal
        conn.execute(text("DELETE FROM emails_fts"))
        conn.execute(text("""
            INSERT INTO emails_fts(rowid, email_id, subject, sender, summary)
            SELECT id, email_id, subject, sender, summary FROM emails_processed
        """))
        conn.commit()


def get_db() -> Session:
    """
    Devuelve una sesión de base de datos lista para usar.
    Recuerda cerrarla con db.close() al terminar.
    """
    return SessionLocal()
