#!/bin/bash
# Builds dist/purenutrix-dashboard-deploy.zip for cPanel "Setup Python App".
# Contains the app, your current data, and a production .env (secrets!) - never share this zip.
cd "$(dirname "$0")/.." || exit 1
set -e
rm -rf dist/pkg && mkdir -p dist/pkg/data
cp -R app static passenger_wsgi.py requirements.txt requirements-server.txt dist/pkg/
find dist/pkg -name "__pycache__" -type d -prune -exec rm -rf {} +
# consistent copy of the live database
.venv/bin/python -c "import sqlite3; s=sqlite3.connect('data/purenutrix.db'); d=sqlite3.connect('dist/pkg/data/purenutrix.db'); s.backup(d); d.close()"
grep -v -E '^(DEMO_MODE|COOKIE_SECURE|DATABASE_PATH|DASHBOARD_URL|ANTHROPIC_API_KEY)=' .env > dist/pkg/.env
printf "\nDEMO_MODE=0\nCOOKIE_SECURE=1\nDATABASE_PATH=data/purenutrix.db\n" >> dist/pkg/.env
(cd dist/pkg && zip -qr ../purenutrix-dashboard-deploy.zip . -x '.DS_Store')
echo "✓ dist/purenutrix-dashboard-deploy.zip ($(du -h dist/purenutrix-dashboard-deploy.zip | cut -f1))"
