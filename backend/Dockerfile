FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente (sin credenciales — se montan como volumen)
COPY config/ ./config/
COPY src/ ./src/
COPY main.py .

EXPOSE 8000

# Hot-reload desactivado en producción; usar string para importación correcta
CMD ["uvicorn", "src.api.routes:app", "--host", "0.0.0.0", "--port", "8000"]
