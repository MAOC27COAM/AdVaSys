#!/usr/bin/env bash
# =============================================================================
# INSTALAR / ACTUALIZAR - DESPLIEGUE BETA (Linux / Ubuntu / VM OCI)
# =============================================================================
# Equivalente a install-or-update.ps1 pero para la VM de Oracle Cloud.
#
# Uso en la VM OCI (desde la carpeta deploy/):
#   ./install-or-update.sh
#
# Crea deploy/.env si no existe, prepara la carpeta persistente
# (RUNTIME_DIR, por defecto ./runtime o /data/runtime si se define en .env),
# construye las imágenes y levanta los servicios db + backend + web.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.beta.yml"

# 1. Crear .env si no existe
if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "[deploy] Se creo deploy/.env a partir de .env.example."
  echo "[deploy] IMPORTANTE: revisa las credenciales antes de usar el sistema en produccion."
fi

# 2. Determinar carpeta persistente (RUNTIME_DIR)
#    Prioridad: variable del entorno del script > valor en .env > ./runtime
RUNTIME_DIR="${RUNTIME_DIR:-}"
if [ -z "$RUNTIME_DIR" ] && [ -f "$ENV_FILE" ]; then
  RUNTIME_DIR="$(grep -E '^RUNTIME_DIR=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
fi
RUNTIME_DIR="${RUNTIME_DIR:-$SCRIPT_DIR/runtime}"

# 3. Crear estructura persistente
mkdir -p \
  "$RUNTIME_DIR/postgres-data" \
  "$RUNTIME_DIR/uploads" \
  "$RUNTIME_DIR/tmp" \
  "$RUNTIME_DIR/backups"

echo "[deploy] Datos persistentes en: $RUNTIME_DIR"

# 4. Verificar Docker + Compose
if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] ERROR: Docker no esta instalado. Ejecuta antes:"
  echo "          curl -fsSL https://get.docker.com | sh"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] ERROR: Docker Compose no esta disponible. Instala el plugin de compose."
  exit 1
fi

# 5. Levantar el stack
cd "$SCRIPT_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

# 6. Mostrar URLs
APP_PORT="$(grep -E '^APP_PORT=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
APP_PORT="${APP_PORT:-8080}"

echo ""
echo "[deploy] Despliegue beta completado."
echo "[deploy] URL local principal: http://localhost:${APP_PORT}"
if command -v hostname >/dev/null 2>&1; then
  for IP in $(hostname -I 2>/dev/null || true); do
    case "$IP" in
      127.*|169.254.*) : ;;
      *) echo "[deploy] URL en red: http://${IP}:${APP_PORT}" ;;
    esac
  done
fi
echo ""
echo "[deploy] Para detener el sistema:   deploy/stop-beta.sh (o docker compose down)"
echo "[deploy] Para generar backup BD:    deploy/backup-beta.sh"