"""Entry point for cPanel "Setup Python App" (Phusion Passenger speaks WSGI; the app is ASGI)."""
import os
import sys
import threading
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)

try:
    from a2wsgi import ASGIMiddleware

    from app.main import app, startup

    startup()  # Passenger doesn't send ASGI lifespan events, so run start-up work here
    _error = None
except Exception:  # make the reason visible in stderr.log and in the browser instead of a blank 500
    _error = traceback.format_exc()
    sys.stderr.write("PureNutrix dashboard failed to start:\n" + _error)

# Passenger loads this file once and then FORKS worker processes. a2wsgi runs its event loop in a
# background thread, and threads don't survive a fork - an adapter built here would hang every
# request. So each worker process builds its own adapter on its first request.
_adapter = None
_adapter_pid = None
_lock = threading.Lock()


def application(environ, start_response):
    global _adapter, _adapter_pid
    if _error:
        start_response("500 Internal Server Error", [("Content-Type", "text/plain; charset=utf-8")])
        return [("Dashboard start nahi hua. Wajah:\n\n" + _error).encode()]
    if _adapter is None or _adapter_pid != os.getpid():
        with _lock:
            if _adapter is None or _adapter_pid != os.getpid():
                _adapter, _adapter_pid = ASGIMiddleware(app), os.getpid()
    return _adapter(environ, start_response)
