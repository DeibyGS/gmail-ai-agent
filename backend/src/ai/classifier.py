import json
from google import genai
from config.settings import GEMINI_API_KEY

# Crea el cliente de Gemini con la API key
client = genai.Client(api_key=GEMINI_API_KEY)

# Categorías válidas que puede devolver Gemini
VALID_CATEGORIES = {"promocion", "reunion", "recordatorio", "personal", "otro"}


def classify_email(email: dict) -> dict:
    """
    Analiza un correo con Gemini y devuelve su clasificación y resumen.

    Recibe un diccionario con: id, sender, subject, body
    Devuelve el mismo diccionario enriquecido con:
    - category: categoría del correo
    - summary: resumen breve
    - event_data: datos del evento si es reunión (o None)
    """
    prompt = _build_prompt(email)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        # Gemini devuelve texto, lo parseamos como JSON
        result = _parse_response(response.text)
    except Exception as e:
        # Si Gemini falla, devolvemos valores por defecto para no romper el flujo
        print(f"Error al clasificar correo '{email['subject']}': {e}")
        result = {
            "category": "otro",
            "summary": "No se pudo generar un resumen.",
            "event_data": None
        }

    # Combinamos el correo original con el resultado de Gemini
    return {**email, **result}


def _build_prompt(email: dict) -> str:
    """
    Construye el prompt que le enviamos a Gemini.

    Un buen prompt es específico sobre el formato de respuesta esperado.
    Pedimos JSON directamente para no tener que parsear texto libre.
    """
    return f"""
Analiza el siguiente correo electrónico y responde ÚNICAMENTE con un JSON válido, sin texto adicional.

CORREO:
De: {email['sender']}
Asunto: {email['subject']}
Cuerpo: {email['body'][:2000]}

INSTRUCCIONES:
1. Clasifica el correo en UNA de estas categorías:
   - "promocion": ofertas, marketing, newsletters, publicidad
   - "reunion": invitaciones a reuniones, videollamadas, entrevistas, citas
   - "recordatorio": vencimientos, plazos, confirmaciones
   - "personal": correos de personas conocidas, familia, amigos
   - "otro": cualquier cosa que no encaje en las anteriores

2. Resume el correo en máximo 2 líneas en español.

3. Si la categoría es "reunion", extrae los datos del evento. Si no, pon null.

FORMATO DE RESPUESTA (solo el JSON, sin markdown):
{{
  "category": "una de las 5 categorías",
  "summary": "resumen breve en español",
  "event_data": {{
    "title": "título del evento",
    "date": "fecha en formato YYYY-MM-DD o null si no se menciona",
    "time": "hora en formato HH:MM o null si no se menciona",
    "location": "lugar o enlace de videollamada o null si no se menciona",
    "description": "descripción adicional del evento"
  }}
}}

Si NO es una reunión, el campo event_data debe ser null.
"""


def _parse_response(text: str) -> dict:
    """
    Parsea la respuesta de Gemini a un diccionario Python.

    A veces Gemini añade bloques de código markdown (```json ... ```)
    aunque le pidamos que no lo haga, así que los limpiamos antes de parsear.
    """
    # Limpia posibles bloques de código markdown
    clean = text.strip()
    if clean.startswith("```"):
        # Elimina la primera línea (```json) y la última (```)
        clean = "\n".join(clean.split("\n")[1:-1])

    data = json.loads(clean)

    # Validamos que la categoría sea una de las permitidas
    if data.get("category") not in VALID_CATEGORIES:
        data["category"] = "otro"

    return data


def classify_emails(emails: list[dict]) -> list[dict]:
    """
    Clasifica una lista de correos, uno por uno.

    Devuelve la lista completa con cada correo enriquecido
    con su categoría, resumen y datos de evento si aplica.
    """
    results = []
    for email in emails:
        print(f"Clasificando: {email['subject'][:50]}...")
        classified = classify_email(email)
        results.append(classified)
    return results
