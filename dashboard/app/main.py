"""Web server: login, JSON API for the dashboard, file uploads, and the /api/agent/* endpoints n8n uses."""
from __future__ import annotations

import hmac
import logging
import shutil
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from . import alerts, audit, config, db, demo, extract, metrics
from .ingest import files
from .ingest.common import parse_date
from .inventory import compute as compute_inventory

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")
STATIC = config.BASE_DIR / "static"


def startup() -> None:
    """Runs once per process: local uvicorn (lifespan) or cPanel Passenger (passenger_wsgi.py)."""
    db.init_db()
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if config.DEMO_MODE:
        with db.session() as conn:
            if db.kv_get(conn, "demo_data") != "1" and not demo.has_real_data(conn):
                demo.load(conn)
    with db.session() as conn:
        alerts.evaluate(conn)


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup()
    yield


app = FastAPI(title="PureNutrix Dashboard", lifespan=lifespan, docs_url=None, redoc_url=None)

# ---------------------------------------------------------------------------
# Auth (one password for the business)
# ---------------------------------------------------------------------------
_attempts = defaultdict(list)
OPEN_PATHS = ("/login", "/static/", "/healthz", "/manifest.webmanifest")


@app.middleware("http")
async def require_login(request: Request, call_next):
    path = request.url.path
    token_ok = bool(config.AUDIT_TOKEN) and path.startswith("/api/agent/") and hmac.compare_digest(
        request.headers.get("authorization", "").encode(), f"Bearer {config.AUDIT_TOKEN}".encode())
    if any(path == p or path.startswith(p) for p in OPEN_PATHS) or token_ok or request.session.get("ok"):
        response = await call_next(request)
        if path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-cache"  # always pick up a new version after deploy
        return response
    if path.startswith("/api/"):
        return JSONResponse({"detail": "login required"}, status_code=401)
    return RedirectResponse("/login", status_code=303)


app.add_middleware(SessionMiddleware, secret_key=config.SECRET_KEY, max_age=30 * 24 * 3600,
                   same_site="lax", https_only=config.env_bool("COOKIE_SECURE", False))


def _login_page(msg: str = "") -> HTMLResponse:
    html = (STATIC / "login.html").read_text(encoding="utf-8")
    if not config.DASHBOARD_PASSWORD:
        msg = "Setup baaki hai: server par DASHBOARD_PASSWORD set karo."
    return HTMLResponse(html.replace("{{MESSAGE}}", msg))


@app.get("/login")
def login_form():
    return _login_page()


@app.post("/login")
def login(request: Request, password: str = Form(...)):
    ip = request.client.host if request.client else "?"
    now = time.time()
    _attempts[ip] = [t for t in _attempts[ip] if now - t < 900]
    if len(_attempts[ip]) >= 10:
        return _login_page("Bahut galat try ho gaye. 15 minute baad try karo.")
    if config.DASHBOARD_PASSWORD and hmac.compare_digest(password.encode(), config.DASHBOARD_PASSWORD.encode()):
        request.session["ok"] = True
        _attempts.pop(ip, None)
        return RedirectResponse("/", status_code=303)
    _attempts[ip].append(now)
    return _login_page("Password galat hai.")


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


@app.get("/healthz")
def health():
    return {"ok": True}


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html", headers={"Cache-Control": "no-cache"})


app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")

# ---------------------------------------------------------------------------
# Dashboard API
# ---------------------------------------------------------------------------


def _per(period: str, start: Optional[str], end: Optional[str]) -> dict:
    return metrics.period(period, start, end)


@app.get("/api/summary")
def api_summary(period: str = "today", start: Optional[str] = None, end: Optional[str] = None):
    with db.session() as conn:
        data = metrics.summary(conn, period, start, end)
        data["alerts"] = alerts.recent(conn)
        return data


@app.get("/api/trend")
def api_trend(days: int = 30):
    with db.session() as conn:
        return metrics.trend(conn, max(7, min(days, 180)))


@app.get("/api/returns")
def api_returns(period: str = "30d", start: Optional[str] = None, end: Optional[str] = None):
    per = _per(period, start, end)
    with db.session() as conn:
        reasons = [dict(r) for r in conn.execute(
            f"""SELECT platform, COALESCE(NULLIF(reason,''),'(reason nahi diya)') reason, return_type, COUNT(*) n
                FROM returns WHERE return_date BETWEEN ? AND ? AND {db.sku_filter_sql('sku')}
                GROUP BY 1,2,3 ORDER BY n DESC LIMIT 12""", (per["start"], per["end"]))]
        by_sku = [dict(r) for r in conn.execute(
            f"""SELECT v.sku, COALESCE(p.name, v.sku) name, COUNT(*) n,
                       SUM(v.return_type='rto') rto, SUM(v.return_type='customer') customer
                FROM v_returns v LEFT JOIN products p ON p.sku = v.sku
                WHERE v.return_date BETWEEN ? AND ? AND {db.sku_filter_sql('v.sku')}
                GROUP BY v.sku ORDER BY n DESC LIMIT 10""", (per["start"], per["end"]))]
        return {"period": per, "stats": metrics.returns_stats(conn, per["start"], per["end"]),
                "spikes": metrics.return_spikes(conn), "reasons": reasons, "by_sku": by_sku}


@app.get("/api/finance")
def api_finance(period: str = "30d", start: Optional[str] = None, end: Optional[str] = None):
    per = _per(period, start, end)
    with db.session() as conn:
        return {"period": per, "finance": metrics.finance(conn, per["start"], per["end"])}


@app.get("/api/stock")
def api_stock():
    with db.session() as conn:
        inv = compute_inventory(conn)
        skus = sorted((s.as_dict() for s in inv.skus.values()),
                      key=lambda s: ({"bad": 0, "watch": 1, "unknown": 2, "good": 3}[s["level"]], s["name"]))
        purchases = [dict(r) for r in conn.execute(
            "SELECT p.*, COALESCE(pr.name, p.sku) name FROM purchases p LEFT JOIN products pr ON pr.sku = p.sku "
            "ORDER BY purchase_date DESC, id DESC LIMIT 100")]
        return {"skus": skus, "totals": inv.totals(), "purchases": purchases}


@app.post("/api/purchases")
def add_purchase(data: dict = Body(...)):
    day = parse_date(data.get("purchase_date")) or metrics.today().isoformat()
    sku = str(data.get("sku") or "").strip()
    try:
        qty = int(data.get("qty") or 0)
        total = float(data.get("total_cost") or 0)
        unit = float(data.get("unit_cost") or 0) or (total / qty if qty else 0)
    except (TypeError, ValueError):
        raise HTTPException(400, "Qty aur cost number hone chahiye")
    if not sku or qty <= 0 or unit <= 0:
        raise HTTPException(400, "Product, quantity aur cost bharo")
    with db.session() as conn:
        conn.execute("INSERT INTO purchases(purchase_date, sku, qty, unit_cost, supplier, note) VALUES(?,?,?,?,?,?)",
                     (day, sku, qty, round(unit, 2), data.get("supplier") or "", data.get("note") or ""))
        conn.execute("INSERT INTO products(sku) VALUES(?) ON CONFLICT(sku) DO NOTHING", (sku,))
    return {"ok": True}


@app.delete("/api/purchases/{pid}")
def delete_purchase(pid: int):
    with db.session() as conn:
        conn.execute("DELETE FROM purchases WHERE id = ?", (pid,))
    return {"ok": True}


@app.put("/api/products/{sku}")
def update_product(sku: str, data: dict = Body(...)):
    allowed = {"name": str, "unit_cost": float, "gst_rate": float, "low_stock_units": int, "active": int}
    sets, vals = [], []
    for k, typ in allowed.items():
        if k in data:
            v = data[k]
            try:
                v = None if v in ("", None) else typ(v)
            except (TypeError, ValueError):
                raise HTTPException(400, f"{k} galat hai")
            sets.append(f"{k} = ?")
            vals.append(v)
    if not sets:
        return {"ok": True}
    with db.session() as conn:
        conn.execute("INSERT INTO products(sku) VALUES(?) ON CONFLICT(sku) DO NOTHING", (sku,))
        conn.execute(f"UPDATE products SET {', '.join(sets)} WHERE sku = ?", (*vals, sku))
    return {"ok": True}


@app.get("/api/ads")
def api_ads(period: str = "30d", start: Optional[str] = None, end: Optional[str] = None):
    per = _per(period, start, end)
    with db.session() as conn:
        fin = metrics.finance(conn, per["start"], per["end"])
        return {"period": per, **metrics.ads_stats(conn, per["start"], per["end"], fin)}


@app.get("/api/listings")
def api_listings(kind: str = "own"):
    if kind not in ("own", "competitor"):
        raise HTTPException(400, "kind must be own or competitor")
    with db.session() as conn:
        return {"items": metrics.listings_view(conn, kind)}


@app.post("/api/listings")
def add_listing(data: dict = Body(...)):
    kind = data.get("kind")
    label = str(data.get("label") or "").strip()
    if kind not in ("own", "competitor") or not label:
        raise HTTPException(400, "Naam aur type bharo")
    with db.session() as conn:
        cur = conn.execute("INSERT INTO listings(kind, platform, label, url, sku) VALUES(?,?,?,?,?)",
                           (kind, data.get("platform") or None, label, (data.get("url") or "").strip(),
                            data.get("sku") or None))
        return {"ok": True, "id": cur.lastrowid}


@app.delete("/api/listings/{lid}")
def delete_listing(lid: int):
    with db.session() as conn:
        conn.execute("UPDATE listings SET active = 0 WHERE id = ?", (lid,))
    return {"ok": True}


@app.post("/api/listings/{lid}/snapshot")
def add_snapshot(lid: int, data: dict = Body(...)):
    day = parse_date(data.get("day")) or metrics.today().isoformat()

    def num(k, typ=float):
        v = data.get(k)
        return None if v in (None, "") else typ(v)

    with db.session() as conn:
        conn.execute(
            """INSERT INTO listing_snapshots(listing_id, day, price, rating, review_count, source)
               VALUES(?,?,?,?,?,'manual') ON CONFLICT(listing_id, day) DO UPDATE SET
               price=COALESCE(excluded.price, price), rating=COALESCE(excluded.rating, rating),
               review_count=COALESCE(excluded.review_count, review_count), source='manual'""",
            (lid, day, num("price"), num("rating"), num("review_count", int)))
    return {"ok": True}


@app.get("/api/ranking")
def api_ranking(period: str = "30d", start: Optional[str] = None, end: Optional[str] = None):
    per = _per(period, start, end)
    with db.session() as conn:
        return {"period": per, "items": metrics.sku_ranking(conn, per["start"], per["end"])}


@app.get("/api/cashflow")
def api_cashflow():
    with db.session() as conn:
        return metrics.cashflow(conn)


@app.get("/api/report")
def api_report(kind: str = "week"):
    with db.session() as conn:
        return metrics.report(conn, "month" if kind == "month" else "week")


@app.get("/api/alerts")
def api_alerts():
    with db.session() as conn:
        return {"items": alerts.recent(conn, days=14)}


@app.post("/api/alerts/{aid}/resolve")
def resolve_alert(aid: int):
    with db.session() as conn:
        conn.execute("UPDATE alerts SET resolved = 1 WHERE id = ?", (aid,))
    return {"ok": True}


# ---------------------------------------------------------------------------
# Data: status, uploads, manual sync, SKU mapping, demo
# ---------------------------------------------------------------------------

@app.get("/api/data/status")
def data_status():
    with db.session() as conn:
        runs = [dict(r) for r in conn.execute("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 25")]
        aliases = [dict(r) for r in conn.execute("SELECT * FROM sku_aliases ORDER BY platform, platform_sku")]
        unmapped = [dict(r) for r in conn.execute(
            """SELECT platform, platform_sku, COUNT(*) n FROM orders
               WHERE sku = platform_sku AND sku NOT IN (SELECT sku FROM purchases)
               GROUP BY platform, platform_sku ORDER BY n DESC LIMIT 30""")]
        products = [dict(r) for r in conn.execute("SELECT * FROM products ORDER BY sku")]
        return {
            "freshness": metrics.freshness(conn),
            "runs": runs,
            "n8n": {"token_set": bool(config.AUDIT_TOKEN), "claude_key_set": bool(config.env("ANTHROPIC_API_KEY")),
                    "last_page": _last_page(conn)},
            "aliases": aliases, "unmapped": unmapped, "products": products,
            "demo": db.kv_get(conn, "demo_data") == "1",
            "reports": [{"key": r.key, "platform": r.platform, "label": r.label} for r in files.REPORTS],
        }


def _last_page(conn):
    r = conn.execute("SELECT created_at, platform, page_kind, status FROM agent_pages ORDER BY id DESC LIMIT 1").fetchone()
    return dict(r) if r else None


@app.post("/api/agent/upload")
@app.post("/api/upload")
async def upload(file: UploadFile = File(...), platform: str = Form(""), report: str = Form("")):
    platform = platform if platform in ("amazon", "flipkart", "meesho", "purchases") else None
    name = Path(file.filename or "upload").name
    if Path(name).suffix.lower() not in (".csv", ".tsv", ".txt", ".xlsx", ".xlsm"):
        raise HTTPException(400, "Sirf CSV / TXT / XLSX file chalegi")
    dest = config.UPLOAD_DIR / f"{datetime.now():%Y%m%d-%H%M%S}-{name}"
    with dest.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    with db.session() as conn:
        try:
            results = files.import_file(conn, dest, platform_hint=platform,
                                        report_key=report if report in files.REPORTS_BY_KEY else None)
        except Exception as e:
            log.exception("upload failed")
            dest.unlink(missing_ok=True)
            raise HTTPException(400, f"File padh nahi paaye: {e}")
        if not results:
            dest.unlink(missing_ok=True)
            raise HTTPException(400, "Ye kaunsi report hai, samajh nahi aaya. Platform chun kar dobara try karo, "
                                     "ya original download ki hui file upload karo.")
        # Report files carry buyer names/addresses: keep only what was imported, never the raw file.
        dest.unlink(missing_ok=True)
        for res in results:
            if res.platform in config.PLATFORMS:
                conn.execute("INSERT INTO sync_runs(platform, job, started_at, finished_at, status, rows, message) "
                             "VALUES(?, 'upload', ?, ?, 'ok', ?, ?)",
                             (res.platform, db.now_iso(), db.now_iso(), res.rows, f"{res.kind}: {name}"))
        alerts.evaluate(conn)
    return {"ok": True, "results": [r.as_dict() for r in results]}


@app.post("/api/aliases")
def add_alias(data: dict = Body(...)):
    platform, psku, sku = data.get("platform"), str(data.get("platform_sku") or "").strip(), \
        str(data.get("sku") or "").strip()
    if platform not in config.PLATFORMS or not psku or not sku:
        raise HTTPException(400, "Platform, platform SKU aur aapka SKU teeno bharo")
    with db.session() as conn:
        conn.execute("INSERT INTO sku_aliases(platform, platform_sku, sku) VALUES(?,?,?) "
                     "ON CONFLICT(platform, platform_sku) DO UPDATE SET sku = excluded.sku", (platform, psku, sku))
        conn.execute("UPDATE orders SET sku = ? WHERE platform = ? AND lower(platform_sku) = lower(?)", (sku, platform, psku))
        conn.execute("UPDATE returns SET sku = ? WHERE platform = ? AND lower(sku) = lower(?)", (sku, platform, psku))
        conn.execute("INSERT INTO products(sku) VALUES(?) ON CONFLICT(sku) DO NOTHING", (sku,))
    return {"ok": True}


@app.get("/api/agent/snapshot")
def agent_snapshot(day: Optional[str] = None):
    with db.session() as conn:
        return audit.snapshot(conn, day)


@app.post("/api/agent/ingest")
def agent_ingest(payload: dict = Body(...), dry_run: bool = False):
    conn = db.connect()
    try:
        result = audit.ingest(conn, payload)
        conn.rollback() if dry_run else conn.commit()
    finally:
        conn.close()
    return {**result, "dry_run": dry_run}


@app.post("/api/agent/page")
def agent_page(req: dict = Body(...)):
    """n8n sends one panel page's text (or an error); Claude extracts rows; they are validated and saved."""
    conn = db.connect()
    try:
        result = extract.handle_page(conn, req)
        conn.commit()
    except extract.ExtractError as e:
        conn.rollback()
        try:  # still record the failure so the owner sees it in the day's audit
            extract.handle_page(conn, {**req, "text": "", "error": str(e)})
            conn.commit()
        except extract.ExtractError:
            pass
        raise HTTPException(422, str(e))
    finally:
        conn.close()
    return result


@app.get("/api/agent/queue")
def agent_queue():
    with db.session() as conn:
        return {"items": extract.queued_pages(conn)}


@app.get("/api/agent/rules")
def agent_rules():
    return {"rules": extract.SYSTEM, "schema": extract.SCHEMA}


@app.post("/api/agent/apply/{page_id}")
def agent_apply(page_id: int, data: dict = Body(...)):
    conn = db.connect()
    try:
        result = extract.apply_queued(conn, page_id, data)
        conn.commit()
    except extract.ExtractError as e:
        conn.rollback()
        raise HTTPException(422, str(e))
    finally:
        conn.close()
    return result


@app.post("/api/agent/live")
def agent_live(data: dict = Body(...)):
    """Today's running totals read off a panel's home page (see apply_live_today)."""
    platform = str(data.get("platform") or "")
    if platform not in config.PLATFORMS:
        raise HTTPException(400, "platform?")
    day = data.get("day") or metrics.today().isoformat()

    def num(k, typ=float):
        v = data.get(k)
        return None if v in (None, "") else typ(v)

    with db.session() as conn:
        conn.execute(
            """INSERT INTO live_today(platform, day, units, sales, new_orders, returns, captured_at) VALUES(?,?,?,?,?,?,?)
               ON CONFLICT(platform, day) DO UPDATE SET units=excluded.units, sales=excluded.sales,
               new_orders=excluded.new_orders, returns=excluded.returns, captured_at=excluded.captured_at""",
            (platform, day, num("units", int), num("sales"), num("new_orders", int), num("returns", int), db.now_iso()))
        conn.execute("INSERT INTO sync_runs(platform, job, started_at, finished_at, status, rows, message) "
                     "VALUES(?, 'live', ?, ?, 'ok', 0, 'panel home counters')", (platform, db.now_iso(), db.now_iso()))
    return {"ok": True}


@app.post("/api/agent/finish")
def agent_finish(data: dict = Body(default={})):
    """End of the n8n run: writes the audit record, returns the alert message for n8n to send."""
    with db.session() as conn:
        return extract.finish_run(conn, data.get("day"))  # evaluates alerts after the new data is in


@app.get("/api/agent/alerts")
def agent_alerts():
    with db.session() as conn:
        alerts.evaluate(conn)
        return alerts.pending_message(conn)


@app.post("/api/agent/alerts/sent")
def agent_alerts_sent(data: dict = Body(...)):
    with db.session() as conn:
        return {"marked": alerts.mark_sent(conn, data.get("ids"))}


@app.get("/api/agent/report")
def agent_report(kind: str = "week"):
    with db.session() as conn:
        rep = metrics.report(conn, "month" if kind == "month" else "week")
    return {"title": rep["title"], "text": f"📊 {rep['title']}\n\n" + "\n".join(rep["lines"])}


@app.get("/api/audit")
def audit_history():
    with db.session() as conn:
        return {"items": audit.recent(conn, 14)}


@app.post("/api/demo/{action}")
def demo_data(action: str):
    with db.session() as conn:
        if action == "load":
            try:
                demo.load(conn)
            except ValueError as e:
                raise HTTPException(400, str(e))
        elif action == "clear":
            demo.clear(conn)
        else:
            raise HTTPException(404)
        alerts.evaluate(conn)
    return {"ok": True}
