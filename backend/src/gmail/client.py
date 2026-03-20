import base64
from googleapiclient.discovery import build
from config.settings import get_google_credentials, MAX_EMAILS_PER_RUN


def get_gmail_service():
    """Crea y devuelve el cliente de la API de Gmail."""
    creds = get_google_credentials()
    return build("gmail", "v1", credentials=creds)


def get_unread_emails() -> list[dict]:
    """
    Obtiene los correos no leídos de la bandeja de entrada.

    Devuelve una lista de diccionarios con:
    - id: identificador único del correo en Gmail
    - sender: quien envió el correo
    - subject: asunto del correo
    - body: contenido del correo (texto plano)
    """
    service = get_gmail_service()

    # Busca correos no leídos en la bandeja de entrada
    # 'is:unread in:inbox' es la misma búsqueda que harías en Gmail
    result = service.users().messages().list(
        userId="me",
        q="is:unread in:inbox",
        maxResults=MAX_EMAILS_PER_RUN
    ).execute()

    messages = result.get("messages", [])

    if not messages:
        return []

    emails = []
    for msg in messages:
        # Primero obtenemos solo el ID, luego pedimos el detalle completo
        detail = service.users().messages().get(
            userId="me",
            id=msg["id"],
            format="full"
        ).execute()

        email = _parse_email(detail)
        emails.append(email)

    return emails


def _parse_email(message: dict) -> dict:
    """
    Extrae los campos relevantes de un mensaje crudo de Gmail.

    Gmail devuelve los correos en un formato anidado y codificado,
    esta función lo convierte en un diccionario simple.
    """
    headers = message["payload"]["headers"]

    # Los headers son una lista de {name, value}, los convertimos a diccionario
    headers_dict = {h["name"]: h["value"] for h in headers}

    return {
        "id": message["id"],
        "sender": headers_dict.get("From", "Desconocido"),
        "subject": headers_dict.get("Subject", "Sin asunto"),
        "body": _extract_body(message["payload"]),
    }


def _extract_body(payload: dict) -> str:
    """
    Extrae el texto del cuerpo del correo.

    Los correos pueden tener varias partes (HTML, texto plano, adjuntos).
    Priorizamos el texto plano porque es más fácil de procesar con IA.
    El cuerpo viene codificado en base64 desde la API de Gmail.
    """
    # Caso simple: el cuerpo está directamente en el payload
    if "body" in payload and payload["body"].get("data"):
        return _decode_base64(payload["body"]["data"])

    # Caso multipart: el correo tiene varias partes (ej: texto + HTML)
    if "parts" in payload:
        for part in payload["parts"]:
            # Buscamos primero texto plano
            if part["mimeType"] == "text/plain" and part["body"].get("data"):
                return _decode_base64(part["body"]["data"])

        # Si no hay texto plano, usamos HTML como fallback
        for part in payload["parts"]:
            if part["mimeType"] == "text/html" and part["body"].get("data"):
                return _decode_base64(part["body"]["data"])

    return ""


def _decode_base64(data: str) -> str:
    """
    Decodifica el contenido base64 que devuelve Gmail.

    Gmail usa base64 con URL-safe encoding (reemplaza + por - y / por _).
    El parámetro altchars=b"-_" le indica a Python cómo decodificarlo.
    """
    decoded_bytes = base64.urlsafe_b64decode(data + "==")
    return decoded_bytes.decode("utf-8", errors="ignore")


def mark_as_read(email_id: str) -> None:
    """
    Marca un correo como leído para no procesarlo dos veces.

    'removeLabelIds': ['UNREAD'] elimina la etiqueta UNREAD del correo,
    que es exactamente lo que hace Gmail cuando abres un mensaje.
    """
    service = get_gmail_service()
    service.users().messages().modify(
        userId="me",
        id=email_id,
        body={"removeLabelIds": ["UNREAD"]}
    ).execute()
