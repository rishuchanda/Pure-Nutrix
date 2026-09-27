"""Shared helpers that turn messy marketplace values into clean, comparable ones.

Every connector (API or file upload) ends up calling the `save_*` functions
here, so the database always has one shape no matter where data came from.
"""
from __future__ import annotations

import re
import sqlite3
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Optional

from .. import db

IST = timezone(timedelta(hours=5, minutes=30))

_DATE_FORMATS = (
    "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y",
    "%d-%b-%Y", "%d %b %Y", "%b %d, %Y", "%d-%b-%y", "%d/%m/%y",
    "%d %B %Y", "%B %d, %Y", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d-%m-%Y %H:%M", "%Y-%m-%d %H:%M",
    "%d.%m.%Y %H:%M:%S", "%b %d, %Y %I:%M %p", "%d-%b-%Y %H:%M:%S",
)


def parse_date(value) -> Optional[str]:
    """Return YYYY-MM-DD in Indian time, or None. Handles ISO timestamps, Excel dates, dd-mm-yyyy..."""
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value if value.tzinfo is None else value.astimezone(IST)
        return dt.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (int, float)) and 20000 < float(value) < 80000:  # Excel serial date
        return (date(1899, 12, 30) + timedelta(days=int(value))).isoformat()
    s = str(value).strip()
    if not s or s.lower() in ("na", "n/a", "-", "none", "null"):
        return None
    # ISO 8601 with time zone (APIs): convert to IST so a 11:30pm UTC order lands on the right day
    iso = s.replace("Z", "+00:00")
    if "T" in iso:
        try:
            dt = datetime.fromisoformat(iso)
            if dt.tzinfo is not None:
                dt = dt.astimezone(IST)
            return dt.date().isoformat()
        except ValueError:
            pass
    # Strip trailing timezone words like "IST" / "UTC" / "+05:30"
    cleaned = re.sub(r"\s*(IST|UTC|GMT|PDT|PST)$", "", s, flags=re.I)
    cleaned = re.sub(r"\s*[+-]\d{2}:?\d{2}$", "", cleaned)
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None


def parse_money(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s or s in ("-", "NA", "N/A"):
        return 0.0
    negative = s.startswith("(") and s.endswith(")")
    s = re.sub(r"[^\d.\-]", "", s)
    if s in ("", "-", ".", "-."):
        return 0.0
    try:
        n = float(s)
    except ValueError:
        return 0.0
    return -abs(n) if negative else n


def parse_int(value, default: int = 1) -> int:
    n = parse_money(value)
    return int(round(n)) if n else default


def normalize_status(raw) -> str:
    """Map any marketplace status text to: pending|shipped|delivered|cancelled|returned|rto."""
    s = str(raw or "").strip().lower().replace("-", "_").replace(" ", "_")
    if not s:
        return "pending"
    if ("rto" in s or "courier_return" in s or "return_to_origin" in s or "undeliver" in s
            or "returning_to_seller" in s or "rejected_by_buyer" in s or "return_to_seller" in s):
        return "rto"
    if "cancel" in s:
        return "cancelled"
    if "return" in s or "refund" in s:
        return "returned"
    if "deliver" in s or s in ("completed", "complete"):
        return "delivered"
    if any(k in s for k in ("ship", "dispatch", "transit", "out_for", "picked", "handover", "invoiced")):
        return "shipped"
    return "pending"


def clean_sku(value) -> str:
    s = re.sub(r"\s+", " ", str(value or "")).strip().strip('"').strip()
    return re.sub(r"^SKU:\s*", "", s, flags=re.I)  # Flipkart writes '"""SKU:PN-..."""' 


def resolve_sku(conn: sqlite3.Connection, platform: str, platform_sku: str) -> str:
    """Platform SKU -> your master SKU. Unknown SKUs pass through unchanged."""
    if not platform_sku:
        return ""
    row = conn.execute(
        "SELECT sku FROM sku_aliases WHERE platform = ? AND lower(platform_sku) = lower(?)",
        (platform, platform_sku),
    ).fetchone()
    return row["sku"] if row else platform_sku


@dataclass
class ImportResult:
    kind: str
    platform: str
    rows: int = 0
    skipped: int = 0
    notes: list = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"kind": self.kind, "platform": self.platform, "rows": self.rows,
                "skipped": self.skipped, "notes": self.notes[:10]}


# ---------------------------------------------------------------------------
# Writers — all idempotent (re-importing the same file never double counts)
# ---------------------------------------------------------------------------

_STATUS_RANK = {"pending": 0, "shipped": 1, "delivered": 2, "cancelled": 3, "returned": 3, "rto": 3}


def save_order(conn, *, platform, order_id, item_id, order_date, platform_sku, qty,
               sale_amount, status, product_name="", source="", platform_item_id=None) -> None:
    sku = resolve_sku(conn, platform, platform_sku)
    if source.startswith("file:"):
        # Official reports are the source of truth: drop rows that were only read off a panel page
        # for this order (they used a different line id and sometimes a dispatch date).
        conn.execute("DELETE FROM orders WHERE platform=? AND order_id=? AND item_id != ? "
                     "AND source IN ('n8n', 'claude-audit')", (platform, str(order_id), str(item_id or order_id)))
    existing = conn.execute(
        "SELECT status, sale_amount FROM orders WHERE platform=? AND order_id=? AND item_id=?",
        (platform, order_id, item_id),
    ).fetchone()
    if existing:
        # Never move an order "backwards" (e.g. an older file saying 'shipped' after we know 'rto').
        if _STATUS_RANK.get(status, 0) < _STATUS_RANK.get(existing["status"], 0):
            status = existing["status"]
        if not sale_amount:
            sale_amount = existing["sale_amount"]
    conn.execute(
        """INSERT INTO orders(platform, order_id, item_id, order_date, sku, platform_sku, product_name,
                              qty, sale_amount, status, source, updated_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(platform, order_id, item_id) DO UPDATE SET
              order_date=excluded.order_date, sku=excluded.sku, platform_sku=excluded.platform_sku,
              product_name=COALESCE(NULLIF(excluded.product_name,''), orders.product_name),
              qty=excluded.qty, sale_amount=excluded.sale_amount, status=excluded.status,
              source=excluded.source, updated_at=excluded.updated_at,
              price_estimated=CASE WHEN excluded.sale_amount > 0 AND excluded.sale_amount != orders.sale_amount
                                   THEN 0 ELSE orders.price_estimated END""",
        (platform, str(order_id), str(item_id or order_id), order_date, sku, platform_sku,
         product_name, qty, round(sale_amount, 2), status, source, db.now_iso()),
    )
    if platform_item_id:
        conn.execute("UPDATE orders SET platform_item_id=? WHERE platform=? AND order_id=? AND item_id=?",
                     (platform_item_id, platform, str(order_id), str(item_id or order_id)))


def save_return(conn, *, platform, order_id, item_id, return_date, platform_sku, qty,
                return_type, reason="", restock=True, source="") -> None:
    sku = resolve_sku(conn, platform, platform_sku) if platform_sku else None
    if not sku:
        row = conn.execute(
            "SELECT sku FROM orders WHERE platform=? AND order_id=? LIMIT 1", (platform, order_id)
        ).fetchone()
        sku = row["sku"] if row else ""
    conn.execute(
        """INSERT INTO returns(platform, order_id, item_id, return_date, sku, qty, return_type, reason, restock, source)
           VALUES(?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(platform, order_id, item_id, return_type) DO UPDATE SET
              return_date=excluded.return_date, sku=excluded.sku, qty=excluded.qty,
              reason=excluded.reason, restock=excluded.restock, source=excluded.source""",
        (platform, str(order_id), str(item_id or ""), return_date, sku, qty, return_type,
         reason, 1 if restock else 0, source),
    )
    # Keep the order's status in step, so returns are visible everywhere.
    conn.execute(
        """UPDATE orders SET status=?, updated_at=? WHERE platform=? AND order_id=?
           AND (?='' OR item_id=?) AND status NOT IN ('cancelled')""",
        ("rto" if return_type == "rto" else "returned", db.now_iso(), platform, str(order_id),
         str(item_id or ""), str(item_id or "")),
    )


def save_finance(conn, *, ext_key, platform, entry_date, category, amount, order_id="",
                 platform_sku="", description="", source="") -> None:
    if not amount:
        return
    sku = resolve_sku(conn, platform, platform_sku) if platform_sku else ""
    conn.execute(
        """INSERT INTO finance_entries(ext_key, platform, entry_date, order_id, sku, category, description, amount, source)
           VALUES(?,?,?,?,?,?,?,?,?)
           ON CONFLICT(ext_key) DO UPDATE SET entry_date=excluded.entry_date, sku=excluded.sku,
              category=excluded.category, description=excluded.description, amount=excluded.amount""",
        (ext_key, platform, entry_date, str(order_id or ""), sku, category, description,
         round(amount, 2), source),
    )


def save_payout(conn, *, platform, payout_id, amount, credited_date=None, bank_date=None,
                status="", source="") -> None:
    conn.execute(
        """INSERT INTO payouts(platform, payout_id, credited_date, bank_date, amount, status, source)
           VALUES(?,?,?,?,?,?,?)
           ON CONFLICT(platform, payout_id) DO UPDATE SET
              credited_date=COALESCE(excluded.credited_date, payouts.credited_date),
              bank_date=COALESCE(excluded.bank_date, payouts.bank_date),
              amount=excluded.amount, status=excluded.status""",
        (platform, str(payout_id), credited_date, bank_date, round(amount, 2), status, source),
    )


def save_ad_day(conn, *, platform, day, campaign, spend, sales, clicks=0, impressions=0, source="") -> None:
    conn.execute(
        """INSERT INTO ad_spend(platform, day, campaign, spend, sales, clicks, impressions, source)
           VALUES(?,?,?,?,?,?,?,?)
           ON CONFLICT(platform, day, campaign) DO UPDATE SET spend=excluded.spend, sales=excluded.sales,
              clicks=excluded.clicks, impressions=excluded.impressions""",
        (platform, day, campaign or "", round(spend, 2), round(sales, 2), clicks, impressions, source),
    )


def ensure_products(conn, rows: Iterable[tuple]) -> None:
    """Make sure every SKU we see exists in the product list (name filled in if we know it)."""
    for sku, name in rows:
        if not sku:
            continue
        conn.execute(
            """INSERT INTO products(sku, name) VALUES(?, ?)
               ON CONFLICT(sku) DO UPDATE SET name=COALESCE(products.name, excluded.name)""",
            (sku, name or None),
        )


def fill_missing_prices(conn, platform: str) -> int:
    """Give order lines without a price (Flipkart's Orders report has none; its Sales report lags 3 days)
    the SKU's average recent price, flagged as an estimate until the real price arrives."""
    rows = conn.execute(
        "SELECT order_id, item_id, sku, qty, order_date FROM orders WHERE platform=? AND sale_amount=0 "
        "AND status NOT IN ('cancelled')", (platform,)).fetchall()
    n = 0
    for r in rows:
        avg = conn.execute(
            "SELECT SUM(sale_amount)/SUM(qty) FROM orders WHERE platform=? AND sku=? AND sale_amount>0 "
            "AND price_estimated=0 AND order_date >= date(?, '-60 days')", (platform, r["sku"], r["order_date"])).fetchone()[0]
        if avg:
            conn.execute("UPDATE orders SET sale_amount=?, price_estimated=1 WHERE platform=? AND order_id=? AND item_id=?",
                         (round(avg * r["qty"], 2), platform, r["order_id"], r["item_id"]))
            n += 1
    return n
