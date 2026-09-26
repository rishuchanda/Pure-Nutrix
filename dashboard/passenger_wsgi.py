"""Entry point for cPanel "Setup Python App" (Phusion Passenger speaks WSGI; the app is ASGI)."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from a2wsgi import ASGIMiddleware  # noqa: E402

from app.main import app, startup  # noqa: E402

startup()  # Passenger doesn't send ASGI lifespan events, so run start-up work here
application = ASGIMiddleware(app)
