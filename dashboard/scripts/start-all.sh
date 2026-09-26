#!/bin/bash
# Starts everything on this Mac (safe to run again - skips what is already running):
#   dashboard     http://127.0.0.1:8765  (also on the home Wi-Fi: http://<mac-ip>:8765 - password protected)
#   panel-reader  http://127.0.0.1:3100   (reads seller panels in the PureNutrix Chrome)
#   n8n           http://127.0.0.1:5678
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
mkdir -p data/logs

running() { lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

if running 8765; then echo "✓ dashboard already running"; else
  nohup "$ROOT/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8765 >> data/logs/dashboard.log 2>&1 &
  echo "▶ dashboard started"; fi

if running 3100; then echo "✓ panel-reader already running"; else
  nohup node panel-reader/server.mjs >> data/logs/panel-reader.log 2>&1 &
  echo "▶ panel-reader started"; fi

if running 5678; then echo "✓ n8n already running"; else
  GENERIC_TIMEZONE=Asia/Kolkata TZ=Asia/Kolkata N8N_HOST=127.0.0.1 N8N_LISTEN_ADDRESS=127.0.0.1 N8N_PORT=5678 \
  N8N_DIAGNOSTICS_ENABLED=false N8N_PERSONALIZATION_ENABLED=false \
    nohup "$ROOT/n8n/runtime/node_modules/.bin/n8n" start >> data/logs/n8n.log 2>&1 &
  echo "▶ n8n started (first start takes ~30s)"; fi

echo
echo "Dashboard: http://127.0.0.1:8765    n8n: http://127.0.0.1:5678"
