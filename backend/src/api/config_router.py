"""
Router de configuración — expone y persiste los parámetros operativos del agente.

Endpoints:
- GET  /api/config   → devuelve la configuración actual
- PATCH /api/config  → actualiza uno o varios campos y los persiste en .env
"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import config.settings as settings

router = APIRouter()

# Ruta del archivo .env del backend
ENV_FILE = Path(__file__).parent.parent.parent / ".env"


# ── Modelos Pydantic ──────────────────────────────────────────────────────────

class AppConfig(BaseModel):
    """Configuración operativa del agente — todos los campos son opcionales en PATCH."""
    max_emails_per_run:      int = Field(..., ge=1,  le=500,  description="Máximo de correos por ciclo")
    check_interval_minutes:  int = Field(..., ge=1,  le=1440, description="Intervalo del scheduler en minutos")
    gmail_filter_after_date: str = Field(...,                  description="Fecha de corte Gmail (YYYY/MM/DD)")
    quiet_hours_start:       int = Field(..., ge=0,  le=23,   description="Hora de inicio del descanso (0-23)")
    quiet_hours_end:         int = Field(..., ge=0,  le=24,   description="Hora de fin del descanso (0-24)")


class AppConfigPatch(BaseModel):
    """Campos opcionales para PATCH /api/config."""
    max_emails_per_run:      Optional[int] = Field(None, ge=1,  le=500)
    check_interval_minutes:  Optional[int] = Field(None, ge=1,  le=1440)
    gmail_filter_after_date: Optional[str] = None
    quiet_hours_start:       Optional[int] = Field(None, ge=0,  le=23)
    quiet_hours_end:         Optional[int] = Field(None, ge=0,  le=24)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_env() -> dict[str, str]:
    """Lee el archivo .env y devuelve un dict clave→valor."""
    if not ENV_FILE.exists():
        return {}
    result: dict[str, str] = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            result[key.strip()] = value.strip()
    return result


def _write_env(data: dict[str, str]) -> None:
    """Escribe el dict como archivo .env, preservando comentarios existentes."""
    lines: list[str] = []
    existing_keys: set[str] = set()

    # Preservar líneas existentes, actualizando las que cambian
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and "=" in stripped:
                key = stripped.partition("=")[0].strip()
                existing_keys.add(key)
                if key in data:
                    lines.append(f"{key}={data[key]}")
                else:
                    lines.append(line)
            else:
                lines.append(line)

    # Añadir claves nuevas que no estaban en el archivo
    for key, value in data.items():
        if key not in existing_keys:
            lines.append(f"{key}={value}")

    ENV_FILE.write_text("\n".join(lines) + "\n")


def _reload_settings(updates: dict[str, str]) -> None:
    """
    Actualiza los atributos del módulo settings en memoria
    para que los cambios sean efectivos sin reiniciar.
    """
    mapping = {
        "MAX_EMAILS_PER_RUN":      ("MAX_EMAILS_PER_RUN",      int),
        "CHECK_INTERVAL_MINUTES":  ("CHECK_INTERVAL_MINUTES",  int),
        "GMAIL_FILTER_AFTER_DATE": ("GMAIL_FILTER_AFTER_DATE", str),
        "QUIET_HOURS_START":       ("QUIET_HOURS_START",       int),
        "QUIET_HOURS_END":         ("QUIET_HOURS_END",         int),
    }
    for env_key, (attr, cast) in mapping.items():
        if env_key in updates:
            setattr(settings, attr, cast(updates[env_key]))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/api/config", response_model=AppConfig)
def get_config() -> AppConfig:
    """Devuelve la configuración operativa actual del agente."""
    return AppConfig(
        max_emails_per_run=settings.MAX_EMAILS_PER_RUN,
        check_interval_minutes=settings.CHECK_INTERVAL_MINUTES,
        gmail_filter_after_date=settings.GMAIL_FILTER_AFTER_DATE,
        quiet_hours_start=settings.QUIET_HOURS_START,
        quiet_hours_end=settings.QUIET_HOURS_END,
    )


@router.patch("/api/config", response_model=AppConfig)
def update_config(patch: AppConfigPatch) -> AppConfig:
    """
    Actualiza uno o varios campos de configuración.
    Los cambios se persisten en .env y se aplican en memoria inmediatamente.
    """
    updates: dict[str, str] = {}

    if patch.max_emails_per_run is not None:
        updates["MAX_EMAILS_PER_RUN"] = str(patch.max_emails_per_run)
    if patch.check_interval_minutes is not None:
        updates["CHECK_INTERVAL_MINUTES"] = str(patch.check_interval_minutes)
    if patch.gmail_filter_after_date is not None:
        updates["GMAIL_FILTER_AFTER_DATE"] = patch.gmail_filter_after_date
    if patch.quiet_hours_start is not None:
        updates["QUIET_HOURS_START"] = str(patch.quiet_hours_start)
    if patch.quiet_hours_end is not None:
        updates["QUIET_HOURS_END"] = str(patch.quiet_hours_end)

    if not updates:
        raise HTTPException(status_code=400, detail="No se proporcionó ningún campo para actualizar.")

    # Validar que quiet_hours_start < quiet_hours_end
    new_start = int(updates.get("QUIET_HOURS_START", settings.QUIET_HOURS_START))
    new_end   = int(updates.get("QUIET_HOURS_END",   settings.QUIET_HOURS_END))
    if new_start >= new_end:
        raise HTTPException(
            status_code=422,
            detail="quiet_hours_start debe ser menor que quiet_hours_end.",
        )

    try:
        _write_env(updates)
        _reload_settings(updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar configuración: {e}")

    return get_config()
