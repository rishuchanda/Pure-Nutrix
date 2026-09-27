"""All settings come from environment variables (or a local .env file).

Nothing secret is ever hard-coded here. See .env.example for the full list.
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    """Tiny .env loader so we don't need an extra dependency."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.split(" #", 1)[0].strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


_load_dotenv(BASE_DIR / ".env")


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def env_int(name: str, default: int) -> int:
    try:
        return int(env(name, str(default)))
    except ValueError:
        return default


def env_float(name: str, default: float) -> float:
    try:
        return float(env(name, str(default)))
    except ValueError:
        return default


def env_bool(name: str, default: bool = False) -> bool:
    return env(name, "1" if default else "0").lower() in ("1", "true", "yes", "on")


# --- Core -------------------------------------------------------------------
DATABASE_PATH = Path(env("DATABASE_PATH", str(BASE_DIR / "data" / "purenutrix.db")))
if not DATABASE_PATH.is_absolute():  # relative paths are relative to the project, not the server's cwd
    DATABASE_PATH = BASE_DIR / DATABASE_PATH
SQLITE_JOURNAL_MODE = env("SQLITE_JOURNAL_MODE", "DELETE").upper()
if SQLITE_JOURNAL_MODE not in ("DELETE", "WAL", "TRUNCATE", "PERSIST"):
    SQLITE_JOURNAL_MODE = "DELETE"
UPLOAD_DIR = Path(env("UPLOAD_DIR", str(DATABASE_PATH.parent / "uploads")))
DASHBOARD_PASSWORD = env("DASHBOARD_PASSWORD")
# If no key is set, use a random one: safe, but everyone is logged out on each restart.
SECRET_KEY = env("SECRET_KEY") or __import__("secrets").token_hex(32)
TIMEZONE = env("TIMEZONE", "Asia/Kolkata")
DEMO_MODE = env_bool("DEMO_MODE", False)

# Only count SKUs matching this regex (the Amazon account also has other brands).
# Example: ^PN-   (leave empty to count everything)
SKU_FILTER_REGEX = env("SKU_FILTER_REGEX")

# --- Alert rules (n8n delivers them) -------------------------------------------
RETURN_SPIKE_FACTOR = env_float("RETURN_SPIKE_FACTOR", 1.5)   # 7-day rate vs 30-day normal
RETURN_RATE_MAX = env_float("RETURN_RATE_MAX", 40.0)          # % — always alert above this
LOW_STOCK_DAYS = env_int("LOW_STOCK_DAYS", 15)                # alert when < N days of stock left (reorder lead time)
RATING_DROP = env_float("RATING_DROP", 0.2)                   # stars, vs 7 days ago
STALE_HOURS = env_int("STALE_HOURS", 30)                      # no fresh data for this long = alert

# --- n8n -------------------------------------------------------------------
# n8n does all the data collection and sends messages. It talks to /api/agent/*
# with the header "Authorization: Bearer <AUDIT_TOKEN>".
# Claude reads the panel page text that n8n sends and turns it into rows.
EXTRACT_MODEL = env("EXTRACT_MODEL", "claude-opus-5")
EXTRACT_MAX_CHARS = env_int("EXTRACT_MAX_CHARS", 300000)

# GST % included in marketplace sale prices (per-product override on the Stock screen).
DEFAULT_GST_RATE = env_float("DEFAULT_GST_RATE", 18.0)

# Shared secret between n8n and the dashboard (long random string).
AUDIT_TOKEN = env("AUDIT_TOKEN")
# On the Mac only: when set, `app.cli agent ...` talks to the ONLINE dashboard instead of the local database.
DASHBOARD_URL = env("DASHBOARD_URL").rstrip("/")

PLATFORMS = ("amazon", "flipkart", "meesho")
