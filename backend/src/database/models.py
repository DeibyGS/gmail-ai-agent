"""
Modelos SQLAlchemy para la base de datos local SQLite.

SQLAlchemy es un ORM (Object-Relational Mapper): permite trabajar con la base
de datos usando clases Python en lugar de escribir SQL crudo.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Clase base de la que heredan todos los modelos."""
    pass


class ProcessedEmail(Base):
    """
    Representa un correo procesado y guardado en la base de datos.

    Cada fila = un correo clasificado por Gemini durante un ciclo de procesamiento.
    Se guarda al llamar a POST /api/process, nunca se borra.
    Esto permite acumular histórico para estadísticas y tendencias.
    """
    __tablename__ = "emails_processed"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    email_id     = Column(String, nullable=False)   # ID único de Gmail
    subject      = Column(String, default="")       # Asunto del correo
    sender       = Column(String, default="")       # Remitente (email o nombre)
    category     = Column(String, nullable=False)   # Clasificación de Gemini
    processed_at = Column(DateTime, default=datetime.now)  # Momento exacto del procesamiento
    day          = Column(String, nullable=False)   # "YYYY-MM-DD" para agrupar por día fácilmente
