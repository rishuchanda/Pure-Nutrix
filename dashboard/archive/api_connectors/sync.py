"""Daily data pull: every connected marketplace, then listings, then alerts.

Run by the built-in scheduler every morning, or by hand:
    python -m app.cli sync
"""
from __future__ import annotations

import json
import logging
import traceback
from typing import Callable

from . import alerts, db, metrics
from .ingest import amazon_api, flipkart_api, listings

log = logging.getLogger("sync")


def record(conn, platform: str, job: str, fn: Callable) -> dict:
    cur = conn.execute("INSERT INTO sync_runs(platform, job, started_at, status) VALUES(?,?,?, 'running')",
                       (platform, job, db.now_iso()))
    run_id = cur.lastrowid
    conn.commit()
    try:
        result = fn(conn) or {}
        rows = sum(v for v in result.values() if isinstance(v, int))
        conn.execute("UPDATE sync_runs SET finished_at=?, status='ok', rows=?, message=? WHERE id=?",
                     (db.now_iso(), rows, json.dumps(result, default=str)[:900], run_id))
        conn.commit()
        return {"platform": platform, "status": "ok", **result}
    except Exception as e:  # any failure is recorded and alerted, never silently swallowed
        conn.rollback()
        log.error("%s %s failed: %s", platform, job, traceback.format_exc())
        conn.execute("UPDATE sync_runs SET finished_at=?, status='error', message=? WHERE id=?",
                     (db.now_iso(), str(e)[:900], run_id))
        conn.commit()
        return {"platform": platform, "status": "error", "error": str(e)}


def run_all(send_alerts: bool = True) -> list:
    results = []
    with db.session() as conn:
        if amazon_api.is_configured():
            results.append(record(conn, "amazon", "api", amazon_api.sync))
        if flipkart_api.is_configured():
            results.append(record(conn, "flipkart", "api", flipkart_api.sync))
        if conn.execute("SELECT 1 FROM listings WHERE active=1 AND url != '' LIMIT 1").fetchone():
            results.append(record(conn, "listings", "scrape", listings.refresh_all))
        alerts.evaluate(conn)
        if send_alerts:
            alerts.deliver_pending(conn)
    return results


def send_report(kind: str = "week") -> bool:
    with db.session() as conn:
        rep = metrics.report(conn, kind)
    return alerts.send_telegram(f"📊 {rep['title']}\n\n" + "\n".join(rep["lines"]))
