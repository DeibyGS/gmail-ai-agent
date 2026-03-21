import json
from datetime import datetime
from zoneinfo import ZoneInfo
from google import genai
from icalendar import Calendar
from config.settings import GEMINI_API_KEY

# Timezone de referencia para normalizar horas extraídas de .ics
_MADRID_TZ = ZoneInfo("Europe/Madrid")

# Crea el cliente de Gemini con la API key
client = genai.Client(api_key=GEMINI_API_KEY)

# Categorías válidas que puede devolver Gemini
VALID_CATEGORIES = {
    "promocion", "reunion", "recordatorio", "personal", "otro",
    "factura", "soporte", "notificacion", "urgente",
}


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

    # Si hay adjunto .ics, sus datos son más fiables que los de Gemini.
    # Además forzamos category="reunion": la presencia de un .ics válido
    # confirma que es una invitación de calendario, independientemente de
    # lo que haya clasificado Gemini (ej: podría confundirlo con "notificacion").
    ics_event_data = extract_event_from_ics(email.get("attachments", []))
    if ics_event_data:
        result["event_data"] = ics_event_data
        result["category"] = "reunion"

    # Combinamos el correo original con el resultado de Gemini
    return {**email, **result}


def _build_prompt(email: dict) -> str:
    """
    Construye el prompt que le enviamos a Gemini.

    Un buen prompt es específico sobre el formato de respuesta esperado.
    Pedimos JSON directamente para no tener que parsear texto libre.
    """
    today = datetime.now().strftime("%Y-%m-%d")

    # Informar a Gemini si hay adjuntos .ics para que clasifique correctamente
    attachments = email.get("attachments", [])
    ics_filenames = [a["filename"] for a in attachments if a.get("filename", "").lower().endswith(".ics")]
    ics_note = (
        f"\nADJUNTOS DETECTADOS: {', '.join(ics_filenames)} — "
        "Este correo contiene un archivo de invitación de calendario (.ics). "
        "Clasifica como \"reunion\" salvo que el cuerpo indique claramente lo contrario.\n"
        if ics_filenames else ""
    )

    return f"""
Eres un asistente experto en análisis de correos electrónicos. Analiza el siguiente correo y responde ÚNICAMENTE con un JSON válido, sin texto adicional ni bloques de código markdown.

Fecha actual: {today}
{ics_note}
CORREO A ANALIZAR:
De: {email['sender']}
Asunto: {email['subject']}
Cuerpo:
{email['body'][:2000]}

═══════════════════════════════════════
INSTRUCCIÓN 1 — CLASIFICACIÓN
═══════════════════════════════════════
Clasifica el correo en EXACTAMENTE UNA de estas 9 categorías:

  "promocion"    → Ofertas comerciales, descuentos, marketing, newsletters, publicidad, cupones.
  "reunion"      → Invitaciones a reuniones presenciales o virtuales (Zoom, Meet, Teams), entrevistas,
                   citas, eventos con fecha y hora concretas, o correos que mencionan un archivo .ics adjunto.
  "recordatorio" → Avisos de vencimiento, plazos de pago, confirmaciones pendientes, renovaciones,
                   recordatorios de tareas o trámites.
  "factura"      → Facturas, recibos, extractos bancarios, cobros, pagos, comprobantes de transacción.
  "soporte"      → Tickets de soporte técnico, incidencias, atención al cliente, resolución de problemas.
  "notificacion" → Alertas automáticas de sistemas, apps o plataformas (GitHub, Slack, Jira, Google,
                   redes sociales). Mensajes generados automáticamente sin interacción humana directa.
  "urgente"      → Correos que requieren acción inmediata: emergencias, plazos críticos inminentes,
                   solicitudes marcadas como urgentes o con consecuencias graves si no se actúa.
  "personal"     → Correos de personas conocidas (familia, amigos, colegas) con tono personal y directo.
  "otro"         → Cualquier correo que no encaje claramente en las categorías anteriores.

Reglas de clasificación:
  - Si el correo menciona un archivo .ics adjunto o una invitación de calendario, clasifica como "reunion".
  - "urgente" tiene prioridad sobre "recordatorio" si el plazo es crítico o inmediato (mismo día o siguiente).
  - "factura" tiene prioridad sobre "notificacion" si contiene importes o comprobantes de pago.

═══════════════════════════════════════
INSTRUCCIÓN 2 — RESUMEN
═══════════════════════════════════════
Escribe un resumen en español de 2 a 3 líneas que incluya:
  - Qué comunica el correo (lo esencial)
  - La acción requerida al destinatario (si existe): responder, asistir, pagar, revisar, etc.
  - El plazo o fecha relevante (si se menciona)

═══════════════════════════════════════
INSTRUCCIÓN 3 — DATOS DEL EVENTO (solo si es "reunion")
═══════════════════════════════════════
Si la categoría es "reunion", extrae los datos del evento. En cualquier otro caso, pon null.

Reglas para la extracción:
  a) FECHA: Usa formato YYYY-MM-DD.
     - Si el correo no indica el año, asume el año de "Fecha actual" ({today[:4]}).
     - Si la fecha resultante ya pasó (es anterior a {today}), avanza al mismo día del año siguiente.
     - Si no hay fecha concreta pero hay recurrencia (ej: "todos los lunes"), pon null en date.
     - Si no hay ninguna información de fecha, pon null.

  b) HORA: Usa formato HH:MM (24 horas).
     - Convierte horas en formato 12h (AM/PM) a 24h correctamente: 3:00 PM → 15:00.
     - Si la hora viene con zona horaria (ej: "10:00 CET", "9am EST"), conviértela a hora local de España
       (Europe/Madrid, UTC+1 en invierno / UTC+2 en verano). Hoy es {today}.
     - Si no hay hora, pon null.

  c) LOCATION: URL completa de videollamada, nombre de sala física, dirección, o null.

  d) DESCRIPTION: Información adicional relevante del evento (agenda, participantes, notas). Puede ser null.

  e) NOTA IMPORTANTE: Si el correo menciona que tiene un archivo .ics adjunto, indica en description
     "Adjunto .ics disponible" para que el sistema lo procese con más detalle.

═══════════════════════════════════════
INSTRUCCIÓN 4 — RECURRENCIA DEL EVENTO
═══════════════════════════════════════
Si el evento se repite con un patrón regular, indica la recurrencia con este formato exacto:

  "DAILY"          → Se repite todos los días
                     Ej: "daily standup", "reunión diaria", "cada día"

  "WEEKLY:XX"      → Se repite semanalmente en días específicos (XX = códigos de días separados por coma)
                     Ej: "todos los lunes" → "WEEKLY:MO"
                         "lunes y miércoles" → "WEEKLY:MO,WE"
                         "martes, jueves y viernes" → "WEEKLY:TU,TH,FR"

  "MONTHLY:DD"     → Se repite mensualmente el día DD del mes
                     Ej: "el día 15 de cada mes" → "MONTHLY:15"
                         "primer lunes del mes" → no usar este formato, pon null

  null             → No se repite, no hay suficiente información, o el patrón no encaja en los anteriores

Códigos de días: MO=lunes, TU=martes, WE=miércoles, TH=jueves, FR=viernes, SA=sábado, SU=domingo

═══════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════
Responde SOLO con este JSON exacto (sin markdown, sin comentarios, sin texto fuera del JSON):

{{
  "category": "una de las 9 categorías listadas",
  "summary": "resumen de 2-3 líneas con acción requerida y plazo si aplica",
  "event_data": {{
    "title": "título descriptivo del evento",
    "date": "YYYY-MM-DD o null",
    "time": "HH:MM en hora local de España o null",
    "location": "lugar, enlace o null",
    "description": "contexto adicional del evento o null",
    "recurrence": "patrón según instrucción 4, o null"
  }}
}}

Si la categoría NO es "reunion", el campo event_data debe ser exactamente null (no un objeto vacío).
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
                        # Normalizar a Europe/Madrid para que la hora coincida con
                        # el timeZone que usa _build_event_body al crear el evento.
                        # Los .ics de Outlook/Exchange usan "Romance Standard Time"
                        # (nombre Windows) que icalendar puede resolver incorrectamente.
                        if dt.tzinfo is not None:
                            dt = dt.astimezone(_MADRID_TZ)
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
