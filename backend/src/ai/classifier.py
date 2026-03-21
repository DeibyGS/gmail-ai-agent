import json
from datetime import datetime
from google import genai
from icalendar import Calendar
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

    # Si hay adjunto .ics, sus datos son más fiables que los de Gemini
    ics_event_data = extract_event_from_ics(email.get("attachments", []))
    if ics_event_data:
        result["event_data"] = ics_event_data

    # Combinamos el correo original con el resultado de Gemini
    return {**email, **result}


def _build_prompt(email: dict) -> str:
    """
    Construye el prompt que le enviamos a Gemini.

    Un buen prompt es específico sobre el formato de respuesta esperado.
    Pedimos JSON directamente para no tener que parsear texto libre.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    return f"""
Analiza el siguiente correo electrónico y responde ÚNICAMENTE con un JSON válido, sin texto adicional.

Fecha actual: {today}

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
   - Para la fecha, usa el año de "Fecha actual" si el correo no especifica año o si la fecha resultante sería en el pasado.
   - Si la fecha es claramente en el pasado y no tiene sentido crearla hoy, pon null en date.

4. Si el evento es recurrente (se repite), indica el patrón con este formato exacto:
   - Solo semanal con días específicos: "WEEKLY:MO", "WEEKLY:MO,WE", "WEEKLY:TU,TH,FR"
   - Diario: "DAILY"
   - Mensual con día del mes: "MONTHLY:15" (donde 15 es el día del mes)
   - Si NO se repite o no hay suficiente información: null

   Códigos de días: MO=lunes, TU=martes, WE=miércoles, TH=jueves, FR=viernes, SA=sábado, SU=domingo

FORMATO DE RESPUESTA (solo el JSON, sin markdown):
{{
  "category": "una de las 5 categorías",
  "summary": "resumen breve en español",
  "event_data": {{
    "title": "título del evento",
    "date": "fecha en formato YYYY-MM-DD o null si no se menciona",
    "time": "hora en formato HH:MM o null si no se menciona",
    "location": "lugar o enlace de videollamada o null si no se menciona",
    "description": "descripción adicional del evento",
    "recurrence": "patrón de recurrencia según instrucción 4, o null si no se repite"
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


def extract_event_from_ics(attachments: list[dict]) -> dict | None:
    """
    Parsea adjuntos .ics y extrae los datos del primer VEVENT encontrado.

    El formato iCalendar (RFC 5545) es más preciso que la extracción por IA:
    las fechas, horas y recurrencias vienen ya estructuradas.

    Devuelve un dict con los campos de event_data, o None si no hay .ics.
    """
    for att in attachments:
        try:
            cal = Calendar.from_ical(att["data"])
            for component in cal.walk():
                if component.name != "VEVENT":
                    continue

                title = str(component.get("SUMMARY", "")).strip() or None
                location = str(component.get("LOCATION", "")).strip() or None
                description = str(component.get("DESCRIPTION", "")).strip() or None

                date_str: str | None = None
                time_str: str | None = None
                dtstart = component.get("DTSTART")
                if dtstart:
                    dt = dtstart.dt
                    if hasattr(dt, "hour"):  # datetime con hora
                        date_str = dt.strftime("%Y-%m-%d")
                        time_str = dt.strftime("%H:%M")
                    else:                     # date sin hora (evento de día completo)
                        date_str = dt.strftime("%Y-%m-%d")

                recurrence = _rrule_to_pattern(component.get("RRULE"))

                return {
                    "title": title,
                    "date": date_str,
                    "time": time_str,
                    "location": location,
                    "description": description,
                    "recurrence": recurrence,
                }
        except Exception as e:
            print(f"  Error parseando adjunto .ics: {e}")

    return None


def _rrule_to_pattern(rrule) -> str | None:
    """
    Convierte un objeto RRULE de icalendar al formato interno del proyecto.

    Formatos de salida:
      "DAILY"         — evento diario
      "WEEKLY:MO,WE"  — semanal con días específicos
      "MONTHLY:15"    — mensual por día del mes
    """
    if not rrule:
        return None

    freq_list = rrule.get("FREQ", [])
    if not freq_list:
        return None

    freq = str(freq_list[0]).upper()

    if freq == "DAILY":
        return "DAILY"

    if freq == "WEEKLY":
        byday = rrule.get("BYDAY", [])
        if byday:
            days = ",".join(str(d) for d in byday)
            return f"WEEKLY:{days}"
        return None

    if freq == "MONTHLY":
        bymonthday = rrule.get("BYMONTHDAY", [])
        if bymonthday:
            return f"MONTHLY:{bymonthday[0]}"
        return None

    return None


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
