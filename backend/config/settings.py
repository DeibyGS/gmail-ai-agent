import os
from pathlib import Path
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

# Carga las variables del archivo .env
load_dotenv()

# ========================
# RUTAS BASE
# ========================
# Path(__file__) es la ruta de este archivo (settings.py)
# .parent sube un nivel → carpeta config/
# .parent de nuevo → carpeta backend/
BASE_DIR = Path(__file__).parent.parent

CREDENTIALS_FILE = BASE_DIR / "credentials.json"  # Descargado de Google Cloud
TOKEN_FILE = BASE_DIR / "token.json"               # Se genera al autenticarse por primera vez

# ========================
# PERMISOS QUE PEDIMOS A GOOGLE
# ========================
# Estos "scopes" definen exactamente a qué puede acceder la app
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",        # Leer correos
    "https://www.googleapis.com/auth/gmail.modify",          # Marcar como leído
    "https://www.googleapis.com/auth/calendar",              # Leer y crear eventos
]

# ========================
# VARIABLES DE ENTORNO
# ========================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CHECK_INTERVAL_MINUTES = int(os.getenv("CHECK_INTERVAL_MINUTES", 30))
MAX_EMAILS_PER_RUN = int(os.getenv("MAX_EMAILS_PER_RUN", 10))


def get_google_credentials() -> Credentials:
    """
    Gestiona la autenticación OAuth2 con Google.

    - Si ya existe token.json válido → lo reutiliza (sin abrir el navegador)
    - Si el token expiró → lo renueva automáticamente
    - Si no existe token.json → abre el navegador para que el usuario autorice
    """
    creds = None

    # Intenta cargar el token guardado de sesiones anteriores
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    # Si no hay token válido, obtiene uno nuevo
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            # El token expiró pero se puede renovar sin abrir el navegador
            creds.refresh(Request())
        else:
            # Primera vez: abre el navegador para que el usuario autorice
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES
            )
            creds = flow.run_local_server(port=0)

        # Guarda el token para no pedir autorización la próxima vez
        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

    return creds
