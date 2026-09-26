"""Alert rules. n8n picks up unsent alerts and delivers them (Telegram/WhatsApp).

Rules: return-rate spike, low stock, rating drop, competitor undercutting,
and - most important - any data pull that failed or went stale, so the owner
never trusts old numbers without knowing.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from . import config, db, metrics
from .inventory import compute as compute_inventory

log = logging.getLogger("alerts")
NAMES = metrics.PLATFORM_NAMES


def _raise(conn, kind: str, key: str, severity: str, title: str, message: str) -> bool:
    """Record an alert unless the same one was raised in the last 24 hours."""
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    if conn.execute("SELECT 1 FROM alerts WHERE dedup_key=? AND created_at >= ?", (key, since)).fetchone():
        return False
    conn.execute("INSERT INTO alerts(created_at, kind, dedup_key, severity, title, message) VALUES(?,?,?,?,?,?)",
                 (db.now_iso(), kind, key, severity, title, message))
    return True


def _auto_resolve(conn, fresh) -> None:
    """Data problems that have fixed themselves should not keep showing."""
    for p, f in fresh.items():
        if not f["stale"] and f["last_status"] != "error":
            conn.execute("UPDATE alerts SET resolved=1 WHERE resolved=0 AND kind IN ('stale','sync') "
                         "AND (dedup_key LIKE ? OR dedup_key LIKE ?)", (f"stale-{p}-%", f"sync-error-{p}-%"))


def evaluate(conn) -> int:
    new = 0
    _auto_resolve(conn, metrics.freshness(conn))
    # 1. Data pulls
    for p, f in metrics.freshness(conn).items():
        if p == "listings":
            continue
        has_any = conn.execute("SELECT 1 FROM orders WHERE platform=? LIMIT 1", (p,)).fetchone()
        if f["last_status"] == "error":
            new += _raise(conn, "sync", f"sync-error-{p}-{datetime.now(timezone.utc):%Y%m%d}", "critical",
                          f"{NAMES[p]} ka data nahi aaya",
                          f"Aaj {NAMES[p]} se data lene me dikkat hui: {(f['last_message'] or '')[:180]}. "
                          "Dashboard par iske number purane ho sakte hain.")
        elif has_any and f["stale"]:
            hrs = f["hours_since_ok"]
            new += _raise(conn, "stale", f"stale-{p}-{datetime.now(timezone.utc):%Y%m%d}", "warning",
                          f"{NAMES[p]} ka data purana hai",
                          (f"{int(hrs)} ghante se naya data nahi aaya." if hrs else "Abhi tak koi data nahi aaya.")
                          + " Nayi report upload karo ya connection check karo.")
    # 1b. Pages n8n collected but the Claude app has not read yet
    old = conn.execute("SELECT COUNT(*) c FROM agent_pages WHERE status = 'queued' AND created_at < ?",
                       ((datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),)).fetchone()["c"]
    if old:
        new += _raise(conn, "queue", f"queue-{datetime.now(timezone.utc):%Y%m%d}", "critical",
                      "Aaj ka data dashboard me nahi chadha",
                      f"n8n ne {old} page le liye par Claude app ne unhe nahi padha (shayad app band tha). "
                      "Claude app kholo — agli baar apne aap ho jayega.")
    # 2. Return spikes
    for p, s in metrics.return_spikes(conn).items():
        if p == "all" or not s["spike"]:
            continue
        normal = f"normal {s['normal']}%" if s["normal"] is not None else "pehle se zyada"
        new += _raise(conn, "returns", f"returns-{p}", "warning", f"{NAMES[p]} par return badh gaye",
                      f"Pichhle 7 din me return/RTO {s['recent']}% ({normal}). Reason check karo.")
    # 3. Stock
    for s in compute_inventory(conn).skus.values():
        if not s.purchased_units or s.level in ("good", "unknown"):  # no bill yet -> nothing to alert on
            continue
        d = s.as_dict()
        if s.stock <= 0:
            msg = f"{d['name']} ka stock KHATAM ({s.stock} units)."
            sev = "critical"
        else:
            left = f", lagbhag {d['days_left']:.0f} din ka bacha" if d["days_left"] is not None else ""
            msg = f"{d['name']}: sirf {s.stock} units{left}."
            sev = "critical" if s.level == "bad" else "warning"
        new += _raise(conn, "stock", f"stock-{s.sku}-{s.level}", sev, "Stock kam hai", msg + " Naya maal mangwao.")
    # 4. Ratings & competitor prices
    for item in metrics.listings_view(conn, "own"):
        ch = item.get("rating_change")
        if ch is not None and ch <= -config.RATING_DROP:
            new += _raise(conn, "rating", f"rating-{item['id']}", "warning", "Rating gir gayi",
                          f"{item['label']}: rating {item['week_ago']['rating']} se {item['latest']['rating']} ho gayi (7 din me).")
    for item in metrics.listings_view(conn, "competitor"):
        ours, theirs = item.get("our_price"), (item.get("latest") or {}).get("price")
        ch = item.get("price_change")
        if theirs and ch and ch <= -0.05 * (theirs - ch):
            new += _raise(conn, "competitor", f"comp-{item['id']}-{theirs}", "warning", "Competitor ne price ghataya",
                          f"{item['label']}: ₹{theirs - ch:.0f} se ₹{theirs:.0f}"
                          + (f" (aapka ~₹{ours:.0f})" if ours else "") + ".")
    return new


def pending_message(conn) -> dict:
    """Unsent alerts as one ready-to-send message for n8n. Call mark_sent() after delivery."""
    rows = conn.execute("SELECT * FROM alerts WHERE sent=0 AND resolved=0 "
                        "ORDER BY severity='critical' DESC, id").fetchall()
    if not rows:
        return {"ids": [], "count": 0, "text": ""}
    lines: List[str] = ["🔔 PureNutrix Dashboard"]
    for r in rows:
        icon = "🔴" if r["severity"] == "critical" else "🟡"
        lines.append(f"\n{icon} {r['title']}\n{r['message']}")
    return {"ids": [r["id"] for r in rows], "count": len(rows), "text": "\n".join(lines)[:4000]}


def mark_sent(conn, ids) -> int:
    ids = [int(i) for i in ids or []]
    if not ids:
        return 0
    conn.execute(f"UPDATE alerts SET sent=1 WHERE id IN ({','.join('?' * len(ids))})", ids)
    return len(ids)


def recent(conn, days: int = 7) -> list:
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    return [dict(r) for r in conn.execute(
        "SELECT * FROM alerts WHERE created_at >= ? AND resolved=0 ORDER BY severity='critical' DESC, id DESC LIMIT 30", (since,))]
