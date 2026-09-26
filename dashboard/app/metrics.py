"""Every number the dashboard shows is calculated here, from the database.

Profit for an order line:
    net sale (what the customer paid, if not returned)
  - GST inside that price (goes to the government)
  - marketplace fees, shipping, other deductions (actual from payment reports;
    estimated from your own recent history until the payment report arrives)
  - purchase cost of the unit (first-in-first-out, from inventory.py)
  - ad spend (per platform; shared across SKUs by their sales)
TCS/TDS is shown but NOT subtracted - it comes back as a tax credit.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

from . import config, db
from .ingest.common import IST
from .inventory import InventoryResult, compute as compute_inventory

COST_CATS = ("fee", "shipping", "other")
PLATFORM_NAMES = {"amazon": "Amazon", "flipkart": "Flipkart", "meesho": "Meesho"}


def today() -> date:
    return datetime.now(IST).date()


def period(key: str, start: Optional[str] = None, end: Optional[str] = None) -> dict:
    t = today()
    if key == "custom" and start and end:
        s, e = date.fromisoformat(start), date.fromisoformat(end)
        label = f"{s:%d %b} – {e:%d %b}"
    elif key == "yesterday":
        s = e = t - timedelta(days=1)
        label = "Kal (Yesterday)"
    elif key == "7d":
        s, e = t - timedelta(days=6), t
        label = "Pichhle 7 din"
    elif key == "30d":
        s, e = t - timedelta(days=29), t
        label = "Pichhle 30 din"
    elif key == "mtd":
        s, e = t.replace(day=1), t
        label = "Is mahine"
    elif key == "lastmonth":
        e = t.replace(day=1) - timedelta(days=1)
        s = e.replace(day=1)
        label = f"{s:%B %Y}"
    else:
        key = "today"
        s = e = t
        label = "Aaj (Today)"
    span = (e - s).days + 1
    ps, pe = s - timedelta(days=span), s - timedelta(days=1)
    return {"key": key, "start": s.isoformat(), "end": e.isoformat(), "label": label, "days": span,
            "prev_start": ps.isoformat(), "prev_end": pe.isoformat()}


# ---------------------------------------------------------------------------
# Line-level economics
# ---------------------------------------------------------------------------

def _fee_lookup(conn) -> Dict[Tuple[str, str], Dict[str, float]]:
    out: Dict[Tuple[str, str], Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in conn.execute(
            "SELECT platform, order_id, category, SUM(amount) a FROM finance_entries "
            "WHERE order_id != '' GROUP BY platform, order_id, category"):
        out[(r["platform"], r["order_id"])][r["category"]] += r["a"]
    return out


def _estimate_rates(conn, fees) -> Dict[str, Dict[str, float]]:
    """Deduction as a share of sale value, learned from recent orders that are already settled."""
    since = (today() - timedelta(days=120)).isoformat()
    sums = defaultdict(lambda: defaultdict(float))
    for r in conn.execute(
            "SELECT platform, order_id, SUM(sale_amount) s FROM orders WHERE order_date >= ? "
            "AND status != 'cancelled' GROUP BY platform, order_id", (since,)):
        f = fees.get((r["platform"], r["order_id"]))
        if not f or not r["s"]:
            continue
        sums[r["platform"]]["_sale"] += r["s"]
        for c in COST_CATS:
            sums[r["platform"]][c] += f.get(c, 0.0)
    rates = {}
    for p, d in sums.items():
        if d["_sale"] >= 2000:  # need a little history before trusting it
            rates[p] = {c: d[c] / d["_sale"] for c in COST_CATS}
    return rates


def _lines(conn, start: str, end: str, inv: InventoryResult, fees=None, rates=None) -> List[dict]:
    fees = fees if fees is not None else _fee_lookup(conn)
    rates = rates if rates is not None else _estimate_rates(conn, fees)
    restock = {(r["platform"], r["order_id"]): r["restock"]
               for r in conn.execute("SELECT platform, order_id, MIN(restock) restock FROM returns GROUP BY 1, 2")}
    gst = {sku: s.gst_rate for sku, s in inv.skus.items()}
    flt = db.sku_filter_sql("o.sku")
    rows = conn.execute(
        f"""SELECT o.* FROM orders o WHERE o.order_date BETWEEN ? AND ? AND o.status != 'cancelled' AND {flt}""",
        (start, end)).fetchall()
    # Split an order's actual fees across its lines by value.
    order_totals = defaultdict(float)
    for r in rows:
        order_totals[(r["platform"], r["order_id"])] += r["sale_amount"] or 0
    out = []
    for r in rows:
        key = (r["platform"], r["order_id"])
        returned = r["status"] in ("returned", "rto")
        sale = r["sale_amount"] or 0.0
        share = sale / order_totals[key] if order_totals[key] else 1.0
        actual = fees.get(key)
        line = {"platform": r["platform"], "order_id": r["order_id"], "sku": r["sku"] or "(no sku)",
                "name": r["product_name"] or "", "date": r["order_date"], "qty": r["qty"],
                "gross": sale, "returned": returned, "rto": r["status"] == "rto",
                "net_sale": 0.0 if returned else sale, "estimated": False}
        rate = gst.get(r["sku"], config.DEFAULT_GST_RATE)
        line["gst"] = line["net_sale"] * rate / (100 + rate)
        if actual:
            for c in COST_CATS:
                line[c] = actual.get(c, 0.0) * share
            line["tax_credit"] = actual.get("tax", 0.0) * share
        else:
            pr = rates.get(r["platform"])
            line["estimated"] = True
            line["no_history"] = pr is None
            for c in COST_CATS:
                line[c] = sale * pr[c] if pr else 0.0
            line["tax_credit"] = 0.0
        unit_cost = inv.unit_cost.get((r["platform"], r["order_id"], r["item_id"]), 0.0)
        came_back = returned and restock.get(key, 1) == 1
        line["cogs"] = 0.0 if came_back else unit_cost * r["qty"]
        line["profit_before_ads"] = line["net_sale"] - line["gst"] - sum(line[c] for c in COST_CATS) - line["cogs"]
        out.append(line)
    return out


def _unlinked_costs(conn, start: str, end: str) -> Dict[str, Dict[str, float]]:
    """Deductions not tied to an order we know (storage fees, subscriptions, very old orders)."""
    out = defaultdict(lambda: defaultdict(float))
    for r in conn.execute(
            f"""SELECT f.platform, f.category, SUM(f.amount) a FROM finance_entries f
                WHERE f.entry_date BETWEEN ? AND ?
                  AND (f.order_id = '' OR NOT EXISTS (
                        SELECT 1 FROM orders o WHERE o.platform = f.platform AND o.order_id = f.order_id))
                  AND (f.sku = '' OR {db.sku_filter_sql('f.sku')})
                GROUP BY f.platform, f.category""", (start, end)):
        out[r["platform"]][r["category"]] += r["a"]
    return out


def _ads(conn, start: str, end: str) -> Dict[str, Dict[str, float]]:
    out = {}
    for r in conn.execute("SELECT platform, SUM(spend) spend, SUM(sales) sales, SUM(clicks) clicks "
                          "FROM ad_spend WHERE day BETWEEN ? AND ? GROUP BY platform", (start, end)):
        out[r["platform"]] = {"spend": r["spend"] or 0, "sales": r["sales"] or 0, "clicks": r["clicks"] or 0}
    return out


def _blank() -> dict:
    return {"orders": 0, "units": 0, "gross": 0.0, "returned_value": 0.0, "net_sale": 0.0, "gst": 0.0,
            "fee": 0.0, "shipping": 0.0, "other": 0.0, "cogs": 0.0, "ads": 0.0, "tax_credit": 0.0,
            "profit": 0.0, "estimated_lines": 0, "no_fee_history": False, "_orders": set()}


def _finish(d: dict) -> dict:
    d["orders"] = len(d.pop("_orders"))
    d["deductions"] = d["fee"] + d["shipping"] + d["other"]
    d["margin_pct"] = round(100 * d["profit"] / d["net_sale"], 1) if d["net_sale"] else None
    for k, v in list(d.items()):
        if isinstance(v, float):
            d[k] = round(v, 2)
    return d


def finance(conn, start: str, end: str, inv: Optional[InventoryResult] = None, fees=None, rates=None) -> dict:
    inv = inv or compute_inventory(conn)
    lines = _lines(conn, start, end, inv, fees, rates)
    unlinked = _unlinked_costs(conn, start, end)
    ads = _ads(conn, start, end)
    per = {p: _blank() for p in config.PLATFORMS}
    for ln in lines:
        d = per.setdefault(ln["platform"], _blank())
        d["_orders"].add(ln["order_id"])
        d["units"] += ln["qty"]
        d["gross"] += ln["gross"]
        d["returned_value"] += ln["gross"] - ln["net_sale"]
        for k in ("net_sale", "gst", "fee", "shipping", "other", "cogs", "tax_credit"):
            d[k] += ln[k]
        d["profit"] += ln["profit_before_ads"]
        if ln["estimated"]:
            d["estimated_lines"] += 1
            d["no_fee_history"] = d["no_fee_history"] or ln.get("no_history", False)
    for p, cats in unlinked.items():
        d = per.setdefault(p, _blank())
        for c, a in cats.items():
            if c in COST_CATS:
                d[c] += a
                d["profit"] -= a
            elif c == "tax":
                d["tax_credit"] += a
    for p, a in ads.items():
        d = per.setdefault(p, _blank())
        d["ads"] += a["spend"]
        d["profit"] -= a["spend"]
    total = _blank()
    for d in per.values():
        total["_orders"] |= {(id(d), o) for o in d["_orders"]}
        for k, v in d.items():
            if k != "_orders" and isinstance(v, (int, float)) and not isinstance(v, bool):
                total[k] += v
        total["no_fee_history"] = total["no_fee_history"] or d["no_fee_history"]
    return {"platforms": {p: _finish(d) for p, d in per.items()}, "total": _finish(total)}


# ---------------------------------------------------------------------------
# Screens
# ---------------------------------------------------------------------------

def _pct_change(now: float, before: float) -> Optional[float]:
    if not before:
        return None
    return round(100 * (now - before) / abs(before), 1)


def returns_stats(conn, start: str, end: str) -> dict:
    flt = db.sku_filter_sql("sku")
    out = {}
    for p in config.PLATFORMS:
        n = conn.execute(f"SELECT COUNT(*) c FROM orders WHERE platform=? AND order_date BETWEEN ? AND ? "
                         f"AND status != 'cancelled' AND {flt}", (p, start, end)).fetchone()["c"]
        cancelled = conn.execute(f"SELECT COUNT(*) c FROM orders WHERE platform=? AND order_date BETWEEN ? AND ? "
                                 f"AND status = 'cancelled' AND {flt}", (p, start, end)).fetchone()["c"]
        rr = conn.execute(f"SELECT return_type, COUNT(*) c FROM v_returns WHERE platform=? "
                          f"AND return_date BETWEEN ? AND ? AND {flt} GROUP BY return_type", (p, start, end)).fetchall()
        by = {r["return_type"]: r["c"] for r in rr}
        cust, rto = by.get("customer", 0), by.get("rto", 0)
        out[p] = {"orders": n, "cancelled": cancelled, "customer": cust, "rto": rto, "total": cust + rto,
                  "rate": round(100 * (cust + rto) / n, 1) if n else None}
    tot_orders = sum(v["orders"] for v in out.values())
    tot = sum(v["total"] for v in out.values())
    out["all"] = {"orders": tot_orders, "total": tot,
                  "customer": sum(v["customer"] for v in out.values()),
                  "rto": sum(v["rto"] for v in out.values()),
                  "cancelled": sum(v["cancelled"] for v in out.values()),
                  "rate": round(100 * tot / tot_orders, 1) if tot_orders else None}
    return out


def return_spikes(conn) -> Dict[str, dict]:
    """Last 7 days return rate vs the 30 days before that ('normal')."""
    t = today()
    recent = returns_stats(conn, (t - timedelta(days=6)).isoformat(), t.isoformat())
    normal = returns_stats(conn, (t - timedelta(days=36)).isoformat(), (t - timedelta(days=7)).isoformat())
    out = {}
    for p in list(config.PLATFORMS) + ["all"]:
        r, n = recent[p]["rate"], normal[p]["rate"]
        spike = r is not None and recent[p]["orders"] >= 10 and (
            r >= config.RETURN_RATE_MAX or (n is not None and n > 0 and r >= n * config.RETURN_SPIKE_FACTOR and r - n >= 5))
        trend = None if r is None or n is None else ("up" if r > n + 2 else "down" if r < n - 2 else "flat")
        out[p] = {"recent": r, "normal": n, "trend": trend, "spike": spike}
    return out


def trend(conn, days: int = 30) -> dict:
    t = today()
    start = (t - timedelta(days=days - 1)).isoformat()
    flt = db.sku_filter_sql("sku")
    series = {p: defaultdict(lambda: {"orders": 0, "units": 0, "sales": 0.0}) for p in config.PLATFORMS}
    for r in conn.execute(
            f"""SELECT platform, order_date d, COUNT(DISTINCT order_id) n, SUM(qty) u,
                       SUM(CASE WHEN status IN ('returned','rto') THEN 0 ELSE sale_amount END) s
                FROM orders WHERE order_date >= ? AND status != 'cancelled' AND {flt}
                GROUP BY platform, order_date""", (start,)):
        if r["platform"] in series:
            series[r["platform"]][r["d"]] = {"orders": r["n"], "units": r["u"], "sales": round(r["s"] or 0, 2)}
    days_list = [(t - timedelta(days=days - 1 - i)).isoformat() for i in range(days)]
    return {"days": days_list,
            "platforms": {p: [series[p][d] if d in series[p] else {"orders": 0, "units": 0, "sales": 0}
                              for d in days_list] for p in config.PLATFORMS}}


def ads_stats(conn, start: str, end: str, fin: dict) -> dict:
    ads = _ads(conn, start, end)
    out = {}
    for p in config.PLATFORMS:
        a = ads.get(p, {"spend": 0, "sales": 0, "clicks": 0})
        total_sales = fin["platforms"].get(p, {}).get("gross", 0)
        out[p] = {"spend": round(a["spend"], 2), "ad_sales": round(a["sales"], 2), "clicks": a["clicks"],
                  "roas": round(a["sales"] / a["spend"], 2) if a["spend"] else None,
                  "acos": round(100 * a["spend"] / a["sales"], 1) if a["sales"] else None,
                  "tacos": round(100 * a["spend"] / total_sales, 1) if total_sales else None,
                  "total_sales": round(total_sales, 2)}
    daily = defaultdict(lambda: defaultdict(float))
    for r in conn.execute("SELECT platform, day, SUM(spend) s, SUM(sales) v FROM ad_spend WHERE day BETWEEN ? AND ? "
                          "GROUP BY platform, day ORDER BY day", (start, end)):
        daily[r["day"]][r["platform"]] = round(r["s"], 2)
    campaigns = [dict(r) for r in conn.execute(
        "SELECT platform, campaign, ROUND(SUM(spend),2) spend, ROUND(SUM(sales),2) sales FROM ad_spend "
        "WHERE day BETWEEN ? AND ? GROUP BY platform, campaign ORDER BY spend DESC LIMIT 15", (start, end))]
    summaries = {r["platform"]: dict(r) for r in conn.execute(
        "SELECT * FROM ad_summaries a WHERE captured_on = (SELECT MAX(captured_on) FROM ad_summaries b "
        "WHERE b.platform = a.platform)")}
    return {"platforms": out, "daily": dict(daily), "campaigns": campaigns, "panel_summaries": summaries}


def listings_view(conn, kind: str) -> List[dict]:
    t = today()
    week_ago = (t - timedelta(days=7)).isoformat()
    out = []
    for l in conn.execute("SELECT * FROM listings WHERE kind=? AND active=1 ORDER BY label", (kind,)):
        snaps = [dict(r) for r in conn.execute(
            "SELECT day, price, rating, review_count, source FROM listing_snapshots WHERE listing_id=? "
            "ORDER BY day DESC LIMIT 60", (l["id"],))]
        latest = snaps[0] if snaps else None
        older = next((s for s in snaps if s["day"] <= week_ago), snaps[-1] if snaps else None)
        item = dict(l)
        item.update({"latest": latest, "week_ago": older, "history": list(reversed(snaps[:30]))})
        if latest and older and latest is not older:
            if latest.get("rating") is not None and older.get("rating") is not None:
                item["rating_change"] = round(latest["rating"] - older["rating"], 2)
            if latest.get("review_count") is not None and older.get("review_count") is not None:
                item["new_reviews"] = latest["review_count"] - older["review_count"]
            if latest.get("price") and older.get("price"):
                item["price_change"] = round(latest["price"] - older["price"], 2)
        if kind == "competitor" and l["sku"]:
            r = conn.execute("SELECT SUM(sale_amount)/SUM(qty) p FROM orders WHERE sku=? AND platform=COALESCE(?, platform) "
                             "AND status != 'cancelled' AND order_date >= ?",
                             (l["sku"], l["platform"], (t - timedelta(days=30)).isoformat())).fetchone()
            item["our_price"] = round(r["p"], 0) if r and r["p"] else None
        item["stale"] = not latest or latest["day"] < (t - timedelta(days=3)).isoformat()
        out.append(item)
    return out


def sku_ranking(conn, start: str, end: str, inv: Optional[InventoryResult] = None) -> List[dict]:
    inv = inv or compute_inventory(conn)
    lines = _lines(conn, start, end, inv)
    ads = _ads(conn, start, end)
    unlinked = _unlinked_costs(conn, start, end)
    plat_net = defaultdict(float)
    for ln in lines:
        plat_net[ln["platform"]] += ln["net_sale"]
    by = defaultdict(lambda: {"units": 0, "gross": 0.0, "net_sale": 0.0, "returns": 0, "gst": 0.0, "fees": 0.0,
                              "cogs": 0.0, "ads": 0.0, "profit": 0.0, "platforms": defaultdict(float), "name": ""})
    for ln in lines:
        d = by[ln["sku"]]
        d["name"] = d["name"] or ln["name"]
        d["units"] += ln["qty"]
        d["gross"] += ln["gross"]
        d["net_sale"] += ln["net_sale"]
        d["returns"] += 1 if ln["returned"] else 0
        d["gst"] += ln["gst"]
        d["fees"] += sum(ln[c] for c in COST_CATS)
        d["cogs"] += ln["cogs"]
        share_costs = 0.0
        if plat_net[ln["platform"]]:
            share = ln["net_sale"] / plat_net[ln["platform"]]
            share_costs = share * (ads.get(ln["platform"], {}).get("spend", 0)
                                   + sum(unlinked.get(ln["platform"], {}).get(c, 0) for c in COST_CATS))
        d["ads"] += share_costs
        d["profit"] += ln["profit_before_ads"] - share_costs
        d["platforms"][ln["platform"]] += ln["net_sale"]
    out = []
    for sku, d in by.items():
        name = inv.skus[sku].name if sku in inv.skus and inv.skus[sku].name else d["name"]
        net_units = d["units"] - d["returns"]
        out.append({"sku": sku, "name": name or sku, "units": d["units"], "returns": d["returns"],
                    "net_sale": round(d["net_sale"], 2), "gst": round(d["gst"], 2), "fees": round(d["fees"], 2),
                    "cogs": round(d["cogs"], 2), "ads": round(d["ads"], 2), "profit": round(d["profit"], 2),
                    "margin_pct": round(100 * d["profit"] / d["net_sale"], 1) if d["net_sale"] else None,
                    "profit_per_unit": round(d["profit"] / net_units, 2) if net_units > 0 else None,
                    "return_pct": round(100 * d["returns"] / d["units"], 1) if d["units"] else None,
                    "platforms": {p: round(v, 2) for p, v in d["platforms"].items()}})
    out.sort(key=lambda x: x["profit"], reverse=True)
    return out


def cashflow(conn, inv: Optional[InventoryResult] = None) -> dict:
    t = today()
    since = (t - timedelta(days=90)).isoformat()
    payouts = [dict(r) for r in conn.execute(
        "SELECT * FROM payouts WHERE COALESCE(bank_date, credited_date) >= ? "
        "ORDER BY COALESCE(bank_date, credited_date) DESC", (since,))]
    for p in payouts:
        if p["credited_date"] and p["bank_date"]:
            p["gap_days"] = (date.fromisoformat(p["bank_date"]) - date.fromisoformat(p["credited_date"])).days
    by_month = defaultdict(lambda: defaultdict(float))
    for p in payouts:
        d = p["bank_date"] or p["credited_date"]
        by_month[d[:7]][p["platform"]] += p["amount"]
    # Money earned but not paid yet: orders with no settlement line yet (estimated).
    inv = inv or compute_inventory(conn)
    fees = _fee_lookup(conn)
    rates = _estimate_rates(conn, fees)
    lines = _lines(conn, (t - timedelta(days=45)).isoformat(), t.isoformat(), inv, fees, rates)
    pending = defaultdict(lambda: {"orders": 0, "amount": 0.0, "oldest": None})
    for ln in lines:
        if not ln["estimated"] or ln["returned"]:
            continue
        d = pending[ln["platform"]]
        d["orders"] += 1
        d["amount"] += ln["net_sale"] - sum(ln[c] for c in COST_CATS)
        d["oldest"] = min(d["oldest"] or ln["date"], ln["date"])
    return {"payouts": payouts[:60],
            "by_month": {m: {p: round(v, 2) for p, v in d.items()} for m, d in sorted(by_month.items(), reverse=True)},
            "pending": {p: {**v, "amount": round(v["amount"], 2)} for p, v in pending.items()},
            "last_30_received": round(sum(p["amount"] for p in payouts
                                          if (p["bank_date"] or p["credited_date"]) >= (t - timedelta(days=29)).isoformat()), 2)}


def freshness(conn) -> Dict[str, dict]:
    out = {}
    for p in list(config.PLATFORMS) + ["listings"]:
        ok = conn.execute("SELECT finished_at, job FROM sync_runs WHERE platform=? AND status='ok' "
                          "ORDER BY finished_at DESC LIMIT 1", (p,)).fetchone()
        last = conn.execute("SELECT status, message, finished_at, job FROM sync_runs WHERE platform=? "
                            "ORDER BY id DESC LIMIT 1", (p,)).fetchone()
        latest_order = conn.execute("SELECT MAX(order_date) d FROM orders WHERE platform=?", (p,)).fetchone()["d"] \
            if p != "listings" else None
        hours = None
        if ok and ok["finished_at"]:
            hours = (datetime.now(IST) - datetime.fromisoformat(ok["finished_at"]).astimezone(IST)).total_seconds() / 3600
        out[p] = {"last_ok": ok["finished_at"] if ok else None, "last_ok_job": ok["job"] if ok else None,
                  "hours_since_ok": None if hours is None else round(hours, 1),
                  "last_status": last["status"] if last else None,
                  "last_message": last["message"] if last else None,
                  "latest_order_date": latest_order,
                  "stale": hours is None or hours > config.STALE_HOURS}
    return out


def summary(conn, pkey: str, start: Optional[str] = None, end: Optional[str] = None) -> dict:
    per = period(pkey, start, end)
    inv = compute_inventory(conn)
    fees = _fee_lookup(conn)
    rates = _estimate_rates(conn, fees)
    fin = finance(conn, per["start"], per["end"], inv, fees, rates)
    prev = finance(conn, per["prev_start"], per["prev_end"], inv, fees, rates)
    ret = returns_stats(conn, per["start"], per["end"])
    t = fin["total"]
    p = prev["total"]
    low = [s.as_dict() for s in inv.skus.values() if s.level in ("watch", "bad")]
    low.sort(key=lambda s: (s["level"] != "bad", s["days_left"] if s["days_left"] is not None else 999))
    return {
        "period": per,
        "finance": fin,
        "returns": ret,
        "spikes": return_spikes(conn),
        "compare": {"orders": _pct_change(t["orders"], p["orders"]),
                    "net_sale": _pct_change(t["net_sale"], p["net_sale"]),
                    "profit": _pct_change(t["profit"], p["profit"]),
                    "prev": {"orders": p["orders"], "net_sale": p["net_sale"], "profit": p["profit"]}},
        "stock_alerts": low[:8],
        "inventory_totals": inv.totals(),
        "freshness": freshness(conn),
        "demo": config.DEMO_MODE or db.kv_get(conn, "demo_data") == "1",
    }


# ---------------------------------------------------------------------------
# Plain-language weekly / monthly report
# ---------------------------------------------------------------------------

def _rs(x: float) -> str:
    """Indian-style rupee formatting: 1,23,456."""
    neg = x < 0
    n = str(int(round(abs(x))))
    if len(n) > 3:
        head, tail = n[:-3], n[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        n = ",".join(parts) + "," + tail
    return ("-₹" if neg else "₹") + n


def _dir(change: Optional[float], good_when_up: bool = True) -> str:
    if change is None:
        return ""
    if abs(change) < 3:
        return "lagbhag same raha"
    up = change > 0
    word = f"{abs(change):.0f}% {'badha' if up else 'ghata'}"
    return word + (" 👍" if up == good_when_up else " ⚠️")


def report(conn, kind: str = "week") -> dict:
    t = today()
    if kind == "month":
        end = t.replace(day=1) - timedelta(days=1)
        start = end.replace(day=1)
        pend = start - timedelta(days=1)
        pstart = pend.replace(day=1)
        title = f"{start:%B %Y} ki report"
        this_name, prev_name = "is mahine", "pichhle mahine"
    else:
        end = t - timedelta(days=t.weekday() + 1)        # last Sunday
        start = end - timedelta(days=6)
        pstart, pend = start - timedelta(days=7), start - timedelta(days=1)
        title = f"Hafta: {start:%d %b} – {end:%d %b}"
        this_name, prev_name = "is hafte", "pichhle hafte"
    inv = compute_inventory(conn)
    fees = _fee_lookup(conn)
    rates = _estimate_rates(conn, fees)
    cur = finance(conn, start.isoformat(), end.isoformat(), inv, fees, rates)
    prv = finance(conn, pstart.isoformat(), pend.isoformat(), inv, fees, rates)
    rc = returns_stats(conn, start.isoformat(), end.isoformat())["all"]
    rp = returns_stats(conn, pstart.isoformat(), pend.isoformat())["all"]
    ranking = sku_ranking(conn, start.isoformat(), end.isoformat(), inv)
    c, p = cur["total"], prv["total"]
    lines = []
    lines.append(f"📦 {this_name.capitalize()} {c['orders']} order aaye ({prev_name}: {p['orders']}) — "
                 f"{_dir(_pct_change(c['orders'], p['orders']))}.")
    lines.append(f"💰 Bikri (return ke baad): {_rs(c['net_sale'])} — {_dir(_pct_change(c['net_sale'], p['net_sale']))}.")
    lines.append(f"✅ Asli munafa: {_rs(c['profit'])}"
                 + (f" ({c['margin_pct']}% margin)" if c['margin_pct'] is not None else "")
                 + f" — {prev_name} {_rs(p['profit'])} tha.")
    if rc["rate"] is not None:
        diff = "" if rp["rate"] is None else (f" ({prev_name}: {rp['rate']}%)")
        lines.append(f"↩️ Return + RTO: {rc['rate']}%{diff}.")
    best = max(cur["platforms"].items(), key=lambda kv: kv[1]["net_sale"])
    if best[1]["net_sale"]:
        share = 100 * best[1]["net_sale"] / c["net_sale"] if c["net_sale"] else 0
        lines.append(f"🏆 Sabse zyada bikri: {PLATFORM_NAMES[best[0]]} ({share:.0f}% of total).")
    if ranking:
        top = ranking[0]
        lines.append(f"⭐ Sabse zyada kamai wala product: {top['name']} — {_rs(top['profit'])}.")
        losers = [r for r in ranking if r["profit"] < 0]
        if losers:
            names = ", ".join(r["name"] for r in losers[:3])
            lines.append(f"🔴 In products par nuksaan hua: {names}. Price / ads / returns check karo.")
    if c["ads"]:
        lines.append(f"📣 Ads par kharch: {_rs(c['ads'])} ({prev_name}: {_rs(p['ads'])}).")
    low = [s for s in inv.skus.values() if s.level == "bad" and (s.purchased_units or s.sold_units)]
    if low:
        lines.append("📉 Stock khatam hone wala: " + ", ".join((s.name or s.sku) for s in low[:4]) + ".")
    if c["no_fee_history"]:
        lines.append("ℹ️ Kuch platform ka fee data nahi hai, isliye profit thoda zyada dikh sakta hai — payment report upload karo.")
    return {"title": title, "kind": kind, "start": start.isoformat(), "end": end.isoformat(),
            "lines": lines, "current": c, "previous": p}
