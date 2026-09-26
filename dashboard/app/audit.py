"""Bridge for n8n (the daily data collector).

`snapshot()` says what the dashboard already has; `ingest()` applies new rows.
Every write is validated, tagged source='n8n', and each daily run is logged in
audit_runs so the owner can see on the dashboard exactly what was checked and
changed. extract.py builds on this for raw page text.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from . import alerts, config, db, metrics
from .ingest.common import (
    clean_sku, ensure_products, normalize_status, parse_date, parse_money, save_ad_day, save_order,
    save_payout, save_return,
)

SOURCE = "n8n"
CHECK_STATUSES = ("ok", "fixed", "mismatch", "unreadable")


def snapshot(conn, day: Optional[str] = None) -> dict:
    """Everything the dashboard currently believes about `day` (default: yesterday, IST)."""
    day = day or (metrics.today() - timedelta(days=1)).isoformat()
    flt = db.sku_filter_sql("sku")
    platforms = {}
    for p in config.PLATFORMS:
        rows = [dict(r) for r in conn.execute(
            f"""SELECT order_id, item_id, sku, qty, sale_amount, status, source FROM orders
                WHERE platform=? AND order_date=? AND {flt} ORDER BY order_id""", (p, day))]
        rets = [dict(r) for r in conn.execute(
            f"SELECT order_id, return_type, qty FROM v_returns WHERE platform=? AND return_date=? AND {flt}", (p, day))]
        ad = conn.execute("SELECT SUM(spend) s, SUM(sales) v FROM ad_spend WHERE platform=? AND day=?", (p, day)).fetchone()
        live = [r for r in rows if r["status"] != "cancelled"]
        platforms[p] = {
            "orders": len({r["order_id"] for r in live}),
            "units": sum(r["qty"] for r in live),
            "cancelled": len({r["order_id"] for r in rows if r["status"] == "cancelled"}),
            "sales": round(sum(r["sale_amount"] for r in live if r["status"] not in ("returned", "rto")), 2),
            "returns_customer": sum(1 for r in rets if r["return_type"] == "customer"),
            "returns_rto": sum(1 for r in rets if r["return_type"] == "rto"),
            "ad_spend": round(ad["s"] or 0, 2), "ad_sales": round(ad["v"] or 0, 2),
            "order_ids": [r["order_id"] for r in rows],
            "open_orders": [r["order_id"] for r in conn.execute(
                "SELECT DISTINCT order_id FROM orders WHERE platform=? AND status IN ('pending','shipped') "
                "AND order_date >= ? ORDER BY order_date", (p, (date.fromisoformat(day) - timedelta(days=20)).isoformat()))],
        }
    listings = []
    for l in conn.execute("SELECT * FROM listings WHERE active=1 ORDER BY kind, label"):
        last = conn.execute("SELECT day, price, rating, review_count FROM listing_snapshots WHERE listing_id=? "
                            "ORDER BY day DESC LIMIT 1", (l["id"],)).fetchone()
        listings.append({"id": l["id"], "kind": l["kind"], "platform": l["platform"], "label": l["label"],
                         "url": l["url"], "sku": l["sku"], "latest": dict(last) if last else None})
    last_audit = conn.execute("SELECT created_at, day, status, summary FROM audit_runs ORDER BY id DESC LIMIT 1").fetchone()
    return {
        "day": day,
        "today": metrics.today().isoformat(),
        "demo_data_present": db.kv_get(conn, "demo_data") == "1",
        "platforms": platforms,
        "listings": listings,
        "products": [dict(r) for r in conn.execute("SELECT sku, name FROM products WHERE active=1 ORDER BY sku")],
        "sku_aliases": [dict(r) for r in conn.execute("SELECT platform, platform_sku, sku FROM sku_aliases")],
        "freshness": metrics.freshness(conn),
        "last_audit": dict(last_audit) if last_audit else None,
    }


class Invalid(ValueError):
    pass


def _platform(v) -> str:
    p = str(v or "").lower().strip()
    if p not in config.PLATFORMS:
        raise Invalid(f"platform must be one of {config.PLATFORMS}")
    return p


def _date(v, field: str) -> str:
    d = parse_date(v)
    if not d:
        raise Invalid(f"{field} is not a date")
    if d > (metrics.today() + timedelta(days=1)).isoformat():
        raise Invalid(f"{field} is in the future")
    return d


def _num(v, field: str, required: bool = True) -> Optional[float]:
    if v in (None, ""):
        if required:
            raise Invalid(f"{field} is required")
        return None
    if isinstance(v, bool):
        raise Invalid(f"{field} must be a number")
    n = parse_money(v)
    if n < 0:
        raise Invalid(f"{field} cannot be negative")
    return n


def ingest(conn, payload: Dict[str, Any]) -> dict:
    """Apply an audit payload. Bad rows are reported and skipped; good rows are saved."""
    saved = {"orders": 0, "returns": 0, "ad_days": 0, "listing_snapshots": 0, "payouts": 0, "ads_summaries": 0}
    errors: List[str] = []
    seen_products = []
    touched = set()

    def each(key):
        items = payload.get(key) or []
        if not isinstance(items, list):
            errors.append(f"{key}: must be a list")
            return []
        return list(enumerate(items))

    for i, o in each("orders"):
        try:
            p = _platform(o.get("platform"))
            oid = str(o.get("order_id") or "").strip()
            if not oid:
                raise Invalid("order_id is required")
            psku = clean_sku(o.get("sku"))
            status = normalize_status(o.get("status"))
            exists = conn.execute("SELECT 1 FROM orders WHERE platform=? AND order_id=?", (p, oid)).fetchone()
            # New orders need a real amount; for known orders the amount may be left out (status update).
            amount = _num(o.get("sale_amount"), "sale_amount", required=not exists) or 0.0
            if not exists and not psku:
                raise Invalid("sku is required for a new order")
            save_order(conn, platform=p, order_id=oid, item_id=str(o.get("item_id") or oid),
                       order_date=_date(o.get("order_date"), "order_date"), platform_sku=psku,
                       qty=int(_num(o.get("qty", 1), "qty") or 1), sale_amount=amount, status=status,
                       product_name=str(o.get("product_name") or ""), source=SOURCE)
            seen_products.append((psku, o.get("product_name")))
            saved["orders"] += 1
            touched.add(p)
        except (Invalid, TypeError, ValueError) as e:
            errors.append(f"orders[{i}]: {e}")

    for i, r in each("returns"):
        try:
            p = _platform(r.get("platform"))
            oid = str(r.get("order_id") or "").strip()
            if not oid:
                raise Invalid("order_id is required")
            rtype = str(r.get("return_type") or "").lower()
            if rtype not in ("customer", "rto"):
                raise Invalid("return_type must be 'customer' or 'rto'")
            save_return(conn, platform=p, order_id=oid, item_id=str(r.get("item_id") or ""),
                        return_date=_date(r.get("return_date"), "return_date"), platform_sku=clean_sku(r.get("sku")),
                        qty=int(_num(r.get("qty", 1), "qty") or 1), return_type=rtype,
                        reason=str(r.get("reason") or "")[:200], restock=bool(r.get("restock", True)), source=SOURCE)
            saved["returns"] += 1
            touched.add(p)
        except (Invalid, TypeError, ValueError) as e:
            errors.append(f"returns[{i}]: {e}")

    for i, a in each("ad_days"):
        try:
            p = _platform(a.get("platform"))
            save_ad_day(conn, platform=p, day=_date(a.get("day"), "day"), campaign=str(a.get("campaign") or "(all campaigns)"),
                        spend=_num(a.get("spend"), "spend"), sales=_num(a.get("sales"), "sales"),
                        clicks=int(_num(a.get("clicks"), "clicks", False) or 0),
                        impressions=int(_num(a.get("impressions"), "impressions", False) or 0), source=SOURCE)
            saved["ad_days"] += 1
        except (Invalid, TypeError, ValueError) as e:
            errors.append(f"ad_days[{i}]: {e}")

    for i, s in each("listing_snapshots"):
        try:
            lid = int(s.get("listing_id"))
            if not conn.execute("SELECT 1 FROM listings WHERE id=?", (lid,)).fetchone():
                raise Invalid(f"listing_id {lid} does not exist")
            rating = _num(s.get("rating"), "rating", False)
            if rating is not None and not 0 <= rating <= 5:
                raise Invalid("rating must be 0-5")
            price = _num(s.get("price"), "price", False)
            reviews = _num(s.get("review_count"), "review_count", False)
            if price is None and rating is None and reviews is None:
                raise Invalid("nothing to save")
            conn.execute(
                """INSERT INTO listing_snapshots(listing_id, day, price, rating, review_count, source)
                   VALUES(?,?,?,?,?,?) ON CONFLICT(listing_id, day) DO UPDATE SET
                   price=COALESCE(excluded.price, price), rating=COALESCE(excluded.rating, rating),
                   review_count=COALESCE(excluded.review_count, review_count), source=excluded.source""",
                (lid, _date(s.get("day") or metrics.today().isoformat(), "day"), price, rating,
                 None if reviews is None else int(reviews), SOURCE))
            saved["listing_snapshots"] += 1
        except (Invalid, TypeError, ValueError) as e:
            errors.append(f"listing_snapshots[{i}]: {e}")

    for i, po in each("payouts"):
        try:
            p = _platform(po.get("platform"))
            pid = str(po.get("payout_id") or "").strip()
            if not pid:
                raise Invalid("payout_id is required")
            credited = _date(po["credited_date"], "credited_date") if po.get("credited_date") else None
            bank = _date(po["bank_date"], "bank_date") if po.get("bank_date") else None
            if not (credited or bank):
                raise Invalid("credited_date or bank_date is required")
            save_payout(conn, platform=p, payout_id=pid, amount=_num(po.get("amount"), "amount"),
                        credited_date=credited, bank_date=bank, status=str(po.get("status") or "settled"), source=SOURCE)
            saved["payouts"] += 1
        except (Invalid, TypeError, ValueError, KeyError) as e:
            errors.append(f"payouts[{i}]: {e}")

    for i, a in each("ads_summaries"):
        try:
            p = _platform(a.get("platform"))
            start, end = _date(a.get("period_start"), "period_start"), _date(a.get("period_end"), "period_end")
            if start > end:
                raise Invalid("period_start is after period_end")
            opt = lambda k, typ=float: None if a.get(k) in (None, "") else typ(_num(a.get(k), k, False))
            conn.execute(
                """INSERT INTO ad_summaries(platform, captured_on, period_start, period_end, spend, revenue, units, roi,
                                            clicks, views, source) VALUES(?,?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(platform, captured_on) DO UPDATE SET period_start=excluded.period_start,
                     period_end=excluded.period_end, spend=excluded.spend, revenue=excluded.revenue, units=excluded.units,
                     roi=excluded.roi, clicks=excluded.clicks, views=excluded.views""",
                (p, metrics.today().isoformat(), start, end, _num(a.get("spend"), "spend"), opt("revenue"),
                 opt("units", int), opt("roi"), opt("clicks", int), opt("views", int), SOURCE))
            saved["ads_summaries"] += 1
        except (Invalid, TypeError, ValueError) as e:
            errors.append(f"ads_summaries[{i}]: {e}")

    ensure_products(conn, seen_products)

    audit = payload.get("audit") or {}
    checks = []
    for c in audit.get("checks") or []:
        st = str(c.get("status") or "").lower()
        if st not in CHECK_STATUSES:
            errors.append(f"audit.checks: status '{st}' must be one of {CHECK_STATUSES}")
            continue
        checks.append({k: c.get(k) for k in ("platform", "item", "panel", "dashboard", "status", "note")})
    run_id = None
    if audit:
        day = parse_date(audit.get("day")) or (metrics.today() - timedelta(days=1)).isoformat()
        problems = [c for c in checks if c["status"] in ("mismatch", "unreadable")]
        status = "problem" if problems or errors else ("fixed" if any(saved.values()) or
                                                      any(c["status"] == "fixed" for c in checks) else "ok")
        cur = conn.execute("INSERT INTO audit_runs(created_at, day, status, summary, checks, saved) VALUES(?,?,?,?,?,?)",
                           (db.now_iso(), day, status, str(audit.get("summary") or "")[:1500],
                            json.dumps(checks, ensure_ascii=False), json.dumps({**saved, "errors": errors[:20]})))
        run_id = cur.lastrowid
        # A platform whose panel Claude read successfully counts as fresh data;
        # one it could not read is recorded as a failed pull (-> red on screen + alert).
        for p in config.PLATFORMS:
            pc = [c for c in checks if c.get("platform") == p]
            if not pc:
                continue
            bad = [c for c in pc if c["status"] == "unreadable"]
            conn.execute("INSERT INTO sync_runs(platform, job, started_at, finished_at, status, rows, message) "
                         "VALUES(?, 'n8n', ?, ?, ?, ?, ?)",
                         (p, db.now_iso(), db.now_iso(), "error" if bad else "ok",
                          saved["orders"] if p in touched else 0,
                          "; ".join(str(c.get("note") or c.get("item")) for c in bad)[:900] if bad else "panel read by n8n"))
        for c in problems:
            if c["status"] == "mismatch":
                alerts._raise(conn, "audit", f"audit-{day}-{c.get('platform')}-{c.get('item')}", "warning",
                              f"Audit: {metrics.PLATFORM_NAMES.get(c.get('platform'), c.get('platform') or '')} me farak",
                              f"{c.get('item')}: panel {c.get('panel')} vs dashboard {c.get('dashboard')}. {c.get('note') or ''}".strip())
        alerts.evaluate(conn)
    return {"ok": not errors, "saved": saved, "errors": errors, "audit_run_id": run_id}


def recent(conn, limit: int = 10) -> list:
    out = []
    for r in conn.execute("SELECT * FROM audit_runs ORDER BY id DESC LIMIT ?", (limit,)):
        d = dict(r)
        d["checks"] = json.loads(d["checks"] or "[]")
        d["saved"] = json.loads(d["saved"] or "{}")
        out.append(d)
    return out
