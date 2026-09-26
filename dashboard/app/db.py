"""SQLite storage. One file, no server to manage.

Every marketplace's data is normalised into the same tables, so the dashboard
never needs to know where a row came from.
"""
from __future__ import annotations

import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator

from . import config

SCHEMA = """
PRAGMA journal_mode = WAL;

-- Master product list. `sku` is YOUR sku; platform-specific skus map here via sku_aliases.
CREATE TABLE IF NOT EXISTS products (
    sku             TEXT PRIMARY KEY,
    name            TEXT,
    unit_cost       REAL,               -- fallback cost if no purchase record exists
    gst_rate        REAL,               -- % GST on the sale price (NULL = DEFAULT_GST_RATE)
    low_stock_units INTEGER DEFAULT 20,
    active          INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sku_aliases (
    platform     TEXT NOT NULL,
    platform_sku TEXT NOT NULL,
    sku          TEXT NOT NULL,
    PRIMARY KEY (platform, platform_sku)
);

-- One row per order line. status: pending|shipped|delivered|cancelled|returned|rto
CREATE TABLE IF NOT EXISTS orders (
    platform     TEXT NOT NULL,
    order_id     TEXT NOT NULL,
    item_id      TEXT NOT NULL,
    order_date   TEXT NOT NULL,          -- YYYY-MM-DD (IST)
    sku          TEXT,
    platform_sku TEXT,
    product_name TEXT,
    qty          INTEGER NOT NULL DEFAULT 1,
    sale_amount  REAL NOT NULL DEFAULT 0, -- what the customer paid for this line, incl. GST
    status       TEXT NOT NULL DEFAULT 'pending',
    source       TEXT,
    updated_at   TEXT,
    PRIMARY KEY (platform, order_id, item_id)
);
CREATE INDEX IF NOT EXISTS ix_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS ix_orders_sku ON orders(sku);

-- return_type: customer (customer sent it back) | rto (courier couldn't deliver)
CREATE TABLE IF NOT EXISTS returns (
    platform    TEXT NOT NULL,
    order_id    TEXT NOT NULL,
    item_id     TEXT NOT NULL DEFAULT '',
    return_date TEXT NOT NULL,
    sku         TEXT,
    qty         INTEGER NOT NULL DEFAULT 1,
    return_type TEXT NOT NULL DEFAULT 'customer',
    reason      TEXT,
    restock     INTEGER NOT NULL DEFAULT 1,  -- 1 = unit came back sellable
    source      TEXT,
    PRIMARY KEY (platform, order_id, item_id, return_type)
);

-- Money the marketplace kept. amount is POSITIVE = deducted from you.
-- category: fee|shipping|tax|ads|other
CREATE TABLE IF NOT EXISTS finance_entries (
    ext_key     TEXT PRIMARY KEY,         -- stable id so re-imports don't double count
    platform    TEXT NOT NULL,
    entry_date  TEXT NOT NULL,
    order_id    TEXT,
    sku         TEXT,
    category    TEXT NOT NULL,
    description TEXT,
    amount      REAL NOT NULL,
    source      TEXT
);
CREATE INDEX IF NOT EXISTS ix_fin_date ON finance_entries(entry_date);

-- Marketplace payouts: credited_date = marketplace marked it paid, bank_date = hit your bank.
CREATE TABLE IF NOT EXISTS payouts (
    platform      TEXT NOT NULL,
    payout_id     TEXT NOT NULL,
    credited_date TEXT,
    bank_date     TEXT,
    amount        REAL NOT NULL,
    status        TEXT,
    source        TEXT,
    PRIMARY KEY (platform, payout_id)
);

CREATE TABLE IF NOT EXISTS ad_spend (
    platform    TEXT NOT NULL,
    day         TEXT NOT NULL,
    campaign    TEXT NOT NULL DEFAULT '',
    spend       REAL NOT NULL DEFAULT 0,
    sales       REAL NOT NULL DEFAULT 0,
    clicks      INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    source      TEXT,
    PRIMARY KEY (platform, day, campaign)
);

-- Ads totals exactly as the panel shows them for a multi-day window (e.g. Flipkart's "last 7 days").
CREATE TABLE IF NOT EXISTS ad_summaries (
    platform     TEXT NOT NULL,
    captured_on  TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end   TEXT NOT NULL,
    spend        REAL NOT NULL,
    revenue      REAL,
    units        INTEGER,
    roi          REAL,
    clicks       INTEGER,
    views        INTEGER,
    source       TEXT,
    PRIMARY KEY (platform, captured_on)
);

-- Stock you bought. Remaining value is CALCULATED from sales, never typed in by hand.
CREATE TABLE IF NOT EXISTS purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_date TEXT NOT NULL,
    sku           TEXT NOT NULL,
    qty           INTEGER NOT NULL,
    unit_cost     REAL NOT NULL,
    supplier      TEXT,
    note          TEXT
);

-- Listing URLs to watch: kind = own (your listing: rating/reviews) | competitor (price)
CREATE TABLE IF NOT EXISTS listings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    kind      TEXT NOT NULL,
    platform  TEXT,
    label     TEXT NOT NULL,
    url       TEXT,
    sku       TEXT,
    active    INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS listing_snapshots (
    listing_id   INTEGER NOT NULL,
    day          TEXT NOT NULL,
    price        REAL,
    rating       REAL,
    review_count INTEGER,
    source       TEXT,               -- auto | manual
    PRIMARY KEY (listing_id, day)
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    platform    TEXT NOT NULL,
    job         TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    status      TEXT NOT NULL,        -- running|ok|error|skipped
    rows        INTEGER DEFAULT 0,
    message     TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    kind       TEXT NOT NULL,
    dedup_key  TEXT NOT NULL,
    severity   TEXT NOT NULL,          -- critical|warning
    title      TEXT NOT NULL,
    message    TEXT,
    sent       INTEGER DEFAULT 0,
    resolved   INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_alerts_key ON alerts(dedup_key, created_at);

-- One row per Claude audit: what was checked on the seller panels and what was fixed.
CREATE TABLE IF NOT EXISTS audit_runs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    day        TEXT NOT NULL,           -- the business day that was audited
    status     TEXT NOT NULL,           -- ok | fixed | problem
    summary    TEXT,
    checks     TEXT,                    -- JSON list of {platform, item, panel, dashboard, status, note}
    saved      TEXT                     -- JSON counts of rows added/updated
);

-- One row per page n8n sent in (before it is rolled up into an audit_runs row).
CREATE TABLE IF NOT EXISTS agent_pages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT NOT NULL,
    day          TEXT NOT NULL,
    platform     TEXT NOT NULL,
    page_kind    TEXT NOT NULL,
    url          TEXT,
    status       TEXT NOT NULL,        -- ok | empty | login_required | unreadable
    note         TEXT,
    saved        TEXT,
    panel_counts TEXT,
    listing_id   INTEGER,
    finished     INTEGER NOT NULL DEFAULT 0,
    text         TEXT                  -- page text waiting for Claude (status = queued)
);

CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- Every return, whether it came from a returns report or only shows up as an
-- order status (e.g. a Meesho order marked RTO_COMPLETE).
DROP VIEW IF EXISTS v_returns;
CREATE VIEW v_returns AS
    SELECT platform, order_id, item_id, return_date, sku, qty, return_type, restock
    FROM returns
    UNION ALL
    SELECT o.platform, o.order_id, o.item_id, o.order_date, o.sku, o.qty,
           CASE o.status WHEN 'rto' THEN 'rto' ELSE 'customer' END, 1
    FROM orders o
    WHERE o.status IN ('returned', 'rto')
      AND NOT EXISTS (SELECT 1 FROM returns r
                      WHERE r.platform = o.platform AND r.order_id = o.order_id
                        AND (r.item_id = o.item_id OR r.item_id = ''));
"""


def _regexp(pattern: str, value) -> bool:
    if value is None:
        return False
    return re.search(pattern, str(value)) is not None


def connect() -> sqlite3.Connection:
    config.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(config.DATABASE_PATH), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.create_function("REGEXP", 2, _regexp)
    return conn


@contextmanager
def session() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with session() as conn:
        conn.executescript(SCHEMA)
        # Small forward-only migrations for databases created by older versions.
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(agent_pages)")}
        if "text" not in cols:
            conn.execute("ALTER TABLE agent_pages ADD COLUMN text TEXT")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def kv_get(conn: sqlite3.Connection, key: str, default: str = "") -> str:
    row = conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def kv_set(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


def sku_filter_sql(column: str = "sku") -> str:
    """SQL fragment that keeps only your brand's SKUs (see SKU_FILTER_REGEX)."""
    if not config.SKU_FILTER_REGEX:
        return "1=1"
    # Pattern is from the owner's own config, but still pass it as a literal safely.
    pattern = config.SKU_FILTER_REGEX.replace("'", "''")
    return f"({column} REGEXP '{pattern}')"
