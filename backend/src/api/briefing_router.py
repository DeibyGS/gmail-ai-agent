"""
Endpoint de briefing diario: GET /api/briefing

Consulta los correos procesados hoy en SQLite y los envía a Gemini
para generar un resumen narrativo ejecutivo estructurado.

El briefing incluye:
- Resumen general del día (narrativo)
- Correos urgentes que requieren acción
- Reuniones pendientes de agendar
- Estadísticas del día (total, distribución por categoría)
- Recomendaciones del agente
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from google import genai

from config.settings import GEMINI_API_KEY
from src.database.init_db import get_db
from src.database.repository import get_processed_today, get_processed_history

router = APIRouter()

_gemini = genai.Client(api_key=GEMINI_API_KEY)


@router.get("/api/briefing")
def get_briefing(
    date: Optional[str] = Query(None, description="Fecha YYYY-MM-DD (defecto: hoy)")
) -> dict:
    """
    Genera un briefing ejecutivo de los correos procesados en una fecha dada.

    Si no se indica fecha, usa hoy. Llama a Gemini con un resumen de todos
    los correos del día para obtener un análisis narrativo estructurado.
    """
    target_date = date or datetime.now().strftime("%Y-%m-%d")

    db = get_db()
    try:
        if date:
            # Historial filtrado por fecha específica
            emails = get_processed_history(db, since_day=date, limit=200)
            emails = [e for e in emails if e["day"] == date]
        else:
            emails = get_processed_today(db)
    finally:
        db.close()

    # Si no hay correos, devolver briefing vacío sin llamar a Gemini
    if not emails:
        return {
            "date":             target_date,
            "total":            0,
            "summary":          "No hay correos procesados para este día.",
            "urgent_emails":    [],
            "pending_meetings": [],
            "by_category":      {},
            "recommendations":  ["Procesa tus correos pulsando 'Procesar ahora' en el dashboard."],
            "generated_at":     datetime.now().isoformat(),
        }

    # Calcular estadísticas básicas para incluirlas en el briefing
    by_category: dict[str, int] = {}
    for e in emails:
        cat = e.get("category", "otro")
        by_category[cat] = by_category.get(cat, 0) + 1

    # Construir prompt para Gemini
    prompt = _build_briefing_prompt(emails, target_date, by_category)

    try:
        response = _gemini.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        briefing = _parse_briefing_response(response.text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al generar briefing con Gemini: {e}")

    return {
        "date":             target_date,
        "total":            len(emails),
        "by_category":      by_category,
        "generated_at":     datetime.now().isoformat(),
        **briefing,
    }


def _build_briefing_prompt(emails: list[dict], date: str, by_category: dict) -> str:
    """
    Construye el prompt para que Gemini genere el briefing ejecutivo.

    Se le pasa un resumen compacto de cada correo (asunto + remitente + resumen + categoría)
    para no exceder el límite de tokens.
    """
    email_lines = []
    for i, e in enumerate(emails[:50], 1):  # máximo 50 correos en el prompt
        email_lines.append(
            f"{i}. [{e['category'].upper()}] De: {e['sender'][:40]} | "
            f"Asunto: {e['subject'][:60]} | Resumen: {e['summary'][:120]}"
        )

    emails_text = "\n".join(email_lines)
    stats_text = " · ".join(f"{k}: {v}" for k, v in sorted(by_category.items(), key=lambda x: -x[1]))

    return f"""Eres un asistente ejecutivo que analiza la actividad de correo electrónico de un profesional.
Hoy es {date}. Se han procesado {len(emails)} correos con la siguiente distribución: {stats_text}.

CORREOS DEL DÍA:
{emails_text}

Genera un briefing ejecutivo en español respondiendo SOLO con un JSON válido, sin texto adicional:

{{
  "summary": "Párrafo de 3-4 líneas describiendo el día: volumen de correos, temas principales, tono general. Menciona lo más destacado.",
  "urgent_emails": [
    {{
      "subject": "asunto exacto del correo urgente",
      "sender": "remitente",
      "action": "qué debe hacer el usuario con este correo (1 frase)"
    }}
  ],
  "pending_meetings": [
    {{
      "subject": "asunto de la reunión",
      "sender": "remitente",
      "note": "detalle relevante de la reunión (fecha, hora, contexto)"
    }}
  ],
  "recommendations": [
    "recomendación práctica 1",
    "recomendación práctica 2"
  ]
}}

Reglas:
- urgent_emails: incluye TODOS los correos de categoría 'urgente'. Máximo 5.
- pending_meetings: incluye TODOS los correos de categoría 'reunion'. Máximo 5.
- Si no hay urgentes o reuniones, devuelve lista vacía [].
- recommendations: 2-3 sugerencias concretas basadas en el análisis del día.
- No inventes información que no esté en los correos listados.
"""


def _parse_briefing_response(text: str) -> dict:
    """
    Parsea la respuesta JSON de Gemini y la normaliza.
    Maneja el caso donde Gemini añade bloques de código markdown.
    """
    clean = text.strip()
    if clean.startswith("```"):
        clean = "\n".join(clean.split("\n")[1:-1])

    try:
        data = json.loads(clean)
    except json.JSONDecodeError:
        return {
            "summary":          "No se pudo generar el resumen automático.",
            "urgent_emails":    [],
            "pending_meetings": [],
            "recommendations":  [],
        }

    return {
        "summary":          data.get("summary", ""),
        "urgent_emails":    data.get("urgent_emails", []),
        "pending_meetings": data.get("pending_meetings", []),
        "recommendations":  data.get("recommendations", []),
    }
