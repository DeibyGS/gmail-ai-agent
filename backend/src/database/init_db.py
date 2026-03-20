"""
Inicialización de la base de datos SQLite.

Este módulo crea el engine (conexión) y la sesión de SQLAlchemy.
Se llama una vez al arrancar la aplicación para asegurar que las tablas existen.
"""

from pathlib import Path
from sqlalchemy import create_engine
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
    Seguro de llamar múltiples veces (no borra datos existentes).
    """
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """
    Devuelve una sesión de base de datos lista para usar.
    Recuerda cerrarla con db.close() al terminar.
    """
    return SessionLocal()
