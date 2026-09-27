#!/bin/bash
# Code-only update for the cPanel app: no .env, no data - safe to extract over the live app.
cd "$(dirname "$0")/.." || exit 1
set -e
rm -rf dist/code && mkdir -p dist/code
cp -R app static passenger_wsgi.py requirements.txt requirements-server.txt dist/code/
find dist/code -name "__pycache__" -type d -prune -exec rm -rf {} +
rm -f dist/purenutrix-dashboard-code.zip
(cd dist/code && zip -qr ../purenutrix-dashboard-code.zip . -x '.DS_Store')
echo "✓ dist/purenutrix-dashboard-code.zip ($(du -h dist/purenutrix-dashboard-code.zip | cut -f1))"
