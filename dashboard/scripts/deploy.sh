#!/bin/bash
# Push the current code to https://dashboard.purenutrix.in (no cPanel login needed).
# Only code goes up: app/, static/, passenger_wsgi.py, requirements*.txt. Never .env or data.
cd "$(dirname "$0")/.." || exit 1
set -e
URL=$(grep '^DASHBOARD_URL=' .env | cut -d= -f2)
TOKEN=$(grep '^DEPLOY_TOKEN=' .env | cut -d= -f2)
[ -n "$URL" ] && [ -n "$TOKEN" ] || { echo "DASHBOARD_URL / DEPLOY_TOKEN missing in .env"; exit 1; }
.venv/bin/python -m pytest -q >/dev/null || { echo "tests failed - not deploying"; exit 1; }
VERSION=$(date +%Y%m%d-%H%M%S)
rm -rf dist/code && mkdir -p dist/code
cp -R app static passenger_wsgi.py requirements.txt requirements-server.txt dist/code/
echo "$VERSION" > dist/code/VERSION
find dist/code -name "__pycache__" -type d -prune -exec rm -rf {} +
rm -f dist/update.zip; (cd dist/code && zip -qr ../update.zip . -x '.DS_Store')
echo "Uploading $VERSION ..."
curl -sS --fail-with-body -X POST -H "Authorization: Bearer $TOKEN" --data-binary @dist/update.zip "$URL/api/agent/deploy"; echo
for i in $(seq 1 20); do
  sleep 3
  got=$(curl -s "$URL/healthz" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
  [ "$got" = "$VERSION" ] && { echo "✓ live: $VERSION"; exit 0; }
done
echo "⚠ uploaded, but the site still reports version '$got'"; exit 1
