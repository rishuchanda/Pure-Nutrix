#!/bin/bash
# Stops the dashboard, panel-reader and n8n started by start-all.sh.
for port in 8765 3100 5678; do
  pid=$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null)
  [ -n "$pid" ] && kill $pid && echo "stopped :$port"
done
