#!/bin/bash
# =============================================================================
# start.sh — Levanta el backend y el frontend del gmail-ai-agent
#
# Uso:
#   chmod +x start.sh   (solo la primera vez)
#   ./start.sh
#
# Para detener ambos servicios: Ctrl+C
# =============================================================================

# Directorio raíz del proyecto (donde está este script)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colores para los mensajes en terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo ""
echo "=================================================="
echo "  Gmail AI Agent — Iniciando servicios..."
echo "=================================================="
echo ""

# ── Verificar que el entorno virtual del backend existe ───────────────────────
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${YELLOW}[!] Entorno virtual no encontrado. Creándolo...${NC}"
    python3 -m venv "$BACKEND_DIR/.venv"
    source "$BACKEND_DIR/.venv/bin/activate"
    pip install -r "$BACKEND_DIR/requirements.txt" -q
    echo -e "${GREEN}[✓] Dependencias del backend instaladas.${NC}"
fi

# ── Verificar que node_modules del frontend existe ────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}[!] node_modules no encontrado. Instalando dependencias...${NC}"
    cd "$FRONTEND_DIR" && npm install -q
    echo -e "${GREEN}[✓] Dependencias del frontend instaladas.${NC}"
fi

# ── Iniciar el backend ────────────────────────────────────────────────────────
echo -e "${GREEN}[1/2] Iniciando backend (FastAPI + uvicorn)...${NC}"
source "$BACKEND_DIR/.venv/bin/activate"
cd "$BACKEND_DIR" && python main.py &
BACKEND_PID=$!

# Esperar a que el backend arranque
sleep 3

# ── Iniciar el frontend ───────────────────────────────────────────────────────
echo -e "${GREEN}[2/2] Iniciando frontend (React + Vite)...${NC}"
cd "$FRONTEND_DIR" && npm run dev -- --port 5173 &
FRONTEND_PID=$!

sleep 2

# ── Información de acceso ─────────────────────────────────────────────────────
echo ""
echo "=================================================="
echo -e "${GREEN}  Servicios activos:${NC}"
echo ""
echo -e "  Frontend  →  ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend   →  ${GREEN}http://localhost:8000${NC}"
echo -e "  API docs  →  ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo "  Presiona Ctrl+C para detener todo."
echo "=================================================="
echo ""

# ── Esperar y limpiar al salir ────────────────────────────────────────────────
# trap captura la señal Ctrl+C y mata ambos procesos limpiamente
trap "echo ''; echo 'Deteniendo servicios...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Mantener el script vivo mientras los procesos corren
wait $BACKEND_PID $FRONTEND_PID
