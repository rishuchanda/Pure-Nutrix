"""Code updates pushed from the owner's Mac (scripts/deploy.sh), so fixes don't need a cPanel login.

Guard rails:
- only DEPLOY_TOKEN may call it (checked in main.py; separate from the n8n token)
- only code paths can be written: app/**, static/**, passenger_wsgi.py, requirements*.txt
  (never .env, data/, or anything outside the app folder)
- every .py file is compiled first; any error aborts before a single file is replaced
- the current code is zipped to data/backups/ before it is overwritten
- Passenger picks the new code up on the next request (tmp/restart.txt)
"""
from __future__ import annotations

import io
import py_compile
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from . import config

ROOT = config.BASE_DIR
MAX_BYTES = 10 * 1024 * 1024
ALLOWED_TOP = ("app/", "static/")
ALLOWED_FILES = ("passenger_wsgi.py", "requirements.txt", "requirements-server.txt", "VERSION")


class UpdateError(ValueError):
    pass


def _allowed(name: str) -> bool:
    if name.startswith("/") or "\\" in name or any(part in ("..", "") for part in name.rstrip("/").split("/")):
        return False
    if name.endswith("/"):
        return name.startswith(ALLOWED_TOP)
    return name.startswith(ALLOWED_TOP) or name in ALLOWED_FILES


def _backup() -> Path:
    backups = config.DATABASE_PATH.parent / "backups"
    backups.mkdir(parents=True, exist_ok=True)
    dest = backups / f"code-{datetime.now():%Y%m%d-%H%M%S}.zip"
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for top in ("app", "static"):
            for f in (ROOT / top).rglob("*"):
                if f.is_file() and "__pycache__" not in f.parts:
                    z.write(f, f.relative_to(ROOT).as_posix())
        for name in ALLOWED_FILES:
            if (ROOT / name).exists():
                z.write(ROOT / name, name)
    for old in sorted(backups.glob("code-*.zip"))[:-10]:  # keep the last 10
        old.unlink()
    return dest


def apply_update(blob: bytes) -> dict:
    if len(blob) > MAX_BYTES:
        raise UpdateError("package too large")
    try:
        z = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile as e:
        raise UpdateError("not a zip file") from e
    names = [n for n in z.namelist() if not n.endswith("/")]
    bad = [n for n in names if not _allowed(n)]
    if bad:
        raise UpdateError(f"not allowed in an update: {', '.join(bad[:5])}")
    if not any(n.startswith("app/") for n in names):
        raise UpdateError("package has no app/ code")

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        z.extractall(tmpdir)
        for py in tmpdir.rglob("*.py"):  # refuse broken code before touching the live app
            try:
                py_compile.compile(str(py), doraise=True)
            except py_compile.PyCompileError as e:
                raise UpdateError(f"code does not compile: {py.relative_to(tmpdir)}: {e.msg[:200]}") from e
        backup = _backup()
        for top in ("app", "static"):
            if (tmpdir / top).exists():
                shutil.rmtree(ROOT / top, ignore_errors=True)
                shutil.copytree(tmpdir / top, ROOT / top)
        for name in ALLOWED_FILES:
            if (tmpdir / name).exists():
                shutil.copy2(tmpdir / name, ROOT / name)
    (ROOT / "tmp").mkdir(exist_ok=True)
    (ROOT / "tmp" / "restart.txt").write_text(datetime.now().isoformat())
    version = (ROOT / "VERSION").read_text().strip() if (ROOT / "VERSION").exists() else ""
    return {"ok": True, "files": len(names), "backup": backup.name, "version": version}


def current_version() -> str:
    f = ROOT / "VERSION"
    return f.read_text().strip() if f.exists() else ""
