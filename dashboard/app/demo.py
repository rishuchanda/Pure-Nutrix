"""Realistic sample data so the dashboard can be seen before any account is connected.

Clearly marked as DEMO on screen. `python -m app.cli demo --clear` removes it all.
"""
from __future__ import annotations

import random
from datetime import timedelta

from . import db, metrics
from .ingest.common import save_ad_day, save_finance, save_order, save_payout, save_return

PRODUCTS = [
    # sku, name, unit cost, price, gst%, relative popularity
    ("PN-SBJ-500ML-P2", "Sea Buckthorn Juice 500ml (Pack of 2)", 175, 461, 12, 1.0),
    ("PN-GLUTA-30C", "Glutathione 30 Capsules", 118, 497, 18, 0.7),
    ("PN-ACnB-P2", "ACV & Beetroot Juice (Pack of 2)", 190, 589, 12, 0.5),
    ("PN-HAIR-30C", "Hair Care Rainbow 30 Capsules", 88, 353, 18, 0.45),
    ("PN-MAG-60", "Magnesium Glycinate 60 Tablets", 140, 449, 18, 0.35),
    ("PN-COLL-200G", "Collagen Powder 200g", 230, 699, 18, 0.25),
]
# platform: (orders/day, cancel%, customer return%, rto%, fee%, shipping%)
PLATFORMS = {
    "amazon": (9, 0.05, 0.06, 0.05, 0.14, 0.09),
    "flipkart": (7, 0.08, 0.07, 0.14, 0.02, 0.22),
    "meesho": (6, 0.06, 0.06, 0.11, 0.03, 0.14),
}


def has_real_data(conn) -> bool:
    return bool(conn.execute("SELECT 1 FROM orders WHERE source != 'demo' LIMIT 1").fetchone()
                or conn.execute("SELECT 1 FROM purchases WHERE COALESCE(supplier,'') != 'Demo Supplier' LIMIT 1").fetchone())


def clear(conn) -> None:
    """Remove ONLY demo rows - anything you uploaded or typed in stays."""
    for t in ("orders", "returns", "finance_entries", "payouts", "ad_spend"):
        conn.execute(f"DELETE FROM {t} WHERE source = 'demo'")
    conn.execute("DELETE FROM purchases WHERE supplier = 'Demo Supplier'")
    demo_labels = [w[2] for w in WATCHED]
    ids = [r["id"] for r in conn.execute(
        f"SELECT id FROM listings WHERE COALESCE(url,'') = '' AND label IN ({','.join('?' * len(demo_labels))})",
        demo_labels)]
    for lid in ids:
        conn.execute("DELETE FROM listing_snapshots WHERE listing_id = ?", (lid,))
        conn.execute("DELETE FROM listings WHERE id = ?", (lid,))
    conn.execute("DELETE FROM sync_runs WHERE message = 'demo'")
    conn.execute("DELETE FROM alerts")  # re-created from real data on the next check
    for sku, *_ in PRODUCTS:
        in_use = conn.execute("SELECT 1 FROM orders WHERE sku = ? UNION SELECT 1 FROM purchases WHERE sku = ?",
                              (sku, sku)).fetchone()
        if not in_use:
            conn.execute("DELETE FROM products WHERE sku = ?", (sku,))
    db.kv_set(conn, "demo_data", "0")


WATCHED = [
    ("own", "amazon", "Sea Buckthorn Juice – Amazon", "PN-SBJ-500ML-P2", 4.3, 212, None),
    ("own", "flipkart", "Sea Buckthorn Juice – Flipkart", "PN-SBJ-500ML-P2", 4.1, 96, None),
    ("own", "amazon", "Glutathione – Amazon", "PN-GLUTA-30C", 4.2, 58, None),
    ("competitor", "amazon", "Competitor A – Sea Buckthorn 500ml x2", "PN-SBJ-500ML-P2", None, None, 499),
    ("competitor", "flipkart", "Competitor B – Sea Buckthorn Juice", "PN-SBJ-500ML-P2", None, None, 449),
    ("competitor", "amazon", "Competitor C – Glutathione 60 caps", "PN-GLUTA-30C", None, None, 649),
]


def load(conn, days: int = 75, seed: int = 7) -> None:
    if has_real_data(conn):
        raise ValueError("Real data already exists - demo data is only for an empty dashboard.")
    rnd = random.Random(seed)
    clear(conn)
    today = metrics.today()
    for sku, name, cost, price, gst, _ in PRODUCTS:
        conn.execute("INSERT OR REPLACE INTO products(sku, name, unit_cost, gst_rate, low_stock_units) VALUES(?,?,?,?,?)",
                     (sku, name, cost, gst, 25))
    # Stock bought in lots; the Hair Care SKU is deliberately running low.
    for sku, name, cost, price, gst, pop in PRODUCTS:
        lots = [(days + 5, int(700 * pop) + 60), (35, int(450 * pop) + 40)]
        if sku == "PN-HAIR-30C":
            lots = [(days + 5, 180), (40, 60)]
        for ago, qty in lots:
            conn.execute("INSERT INTO purchases(purchase_date, sku, qty, unit_cost, supplier) VALUES(?,?,?,?,?)",
                         ((today - timedelta(days=ago)).isoformat(), sku, qty,
                          round(cost * rnd.uniform(0.95, 1.05), 2), "Demo Supplier"))

    n = 0
    payout_buckets = {}
    for ago in range(days, -1, -1):
        day = today - timedelta(days=ago)
        weekend = day.weekday() >= 5
        for platform, (per_day, cancel, cust, rto, fee, ship) in PLATFORMS.items():
            spike = platform == "meesho" and ago <= 6       # recent RTO spike -> alert demo
            count = max(0, int(rnd.gauss(per_day * (1.2 if weekend else 1.0) * (1 + (days - ago) / days * 0.3), 2.2)))
            for _ in range(count):
                sku, name, cost, price, gst, pop = rnd.choices(PRODUCTS, weights=[p[5] for p in PRODUCTS])[0]
                qty = 1 if rnd.random() < 0.9 else 2
                sale = price * qty * rnd.uniform(0.94, 1.0)
                n += 1
                oid = f"{platform[:2].upper()}{day:%y%m%d}{n:05d}"
                r = rnd.random()
                rto_p = rto * (2.3 if spike else 1)
                if r < cancel:
                    status = "cancelled"
                elif ago <= 2:
                    status = "pending" if ago == 0 else "shipped"
                elif r < cancel + rto_p:
                    status = "rto"
                elif r < cancel + rto_p + cust and ago > 4:
                    status = "returned"
                elif ago <= 4:
                    status = "shipped"
                else:
                    status = "delivered"
                save_order(conn, platform=platform, order_id=oid, item_id=oid + "-1", order_date=day.isoformat(),
                           platform_sku=sku, qty=qty, sale_amount=sale, status="pending", product_name=name,
                           source="demo")
                if status in ("rto", "returned"):
                    save_return(conn, platform=platform, order_id=oid, item_id=oid + "-1",
                                return_date=(day + timedelta(days=rnd.randint(2, 5))).isoformat()
                                if ago > 5 else day.isoformat(),
                                platform_sku=sku, qty=qty, return_type="rto" if status == "rto" else "customer",
                                reason="Customer not available" if status == "rto" else "Did not like taste",
                                restock=rnd.random() > 0.1, source="demo")
                elif status != "pending":
                    conn.execute("UPDATE orders SET status=? WHERE platform=? AND order_id=?", (status, platform, oid))
                # Settled ~10 days after the order.
                if status != "cancelled" and ago >= 10:
                    settle_day = day + timedelta(days=10 if platform != "meesho" else 8)
                    extra = 1.6 if status in ("rto", "returned") else 1.0
                    save_finance(conn, ext_key=f"demo:{oid}:fee", platform=platform, entry_date=settle_day.isoformat(),
                                 category="fee", amount=sale * fee, order_id=oid, platform_sku=sku, source="demo")
                    save_finance(conn, ext_key=f"demo:{oid}:ship", platform=platform, entry_date=settle_day.isoformat(),
                                 category="shipping", amount=sale * ship * extra, order_id=oid, platform_sku=sku,
                                 source="demo")
                    save_finance(conn, ext_key=f"demo:{oid}:tax", platform=platform, entry_date=settle_day.isoformat(),
                                 category="tax", amount=sale * 0.015, order_id=oid, platform_sku=sku, source="demo")
                    if status not in ("rto", "returned"):
                        week = settle_day - timedelta(days=settle_day.weekday())
                        key = (platform, week)
                        payout_buckets[key] = payout_buckets.get(key, 0) + sale * (1 - fee - ship - 0.015)
        # Ads
        for platform, base in (("amazon", 520), ("flipkart", 380)):
            spend = base * rnd.uniform(0.8, 1.2)
            save_ad_day(conn, platform=platform, day=day.isoformat(), campaign="Sea Buckthorn - Auto",
                        spend=spend * 0.6, sales=spend * 0.6 * rnd.uniform(2.5, 4.5), clicks=int(spend / 6),
                        impressions=int(spend * 12), source="demo")
            save_ad_day(conn, platform=platform, day=day.isoformat(), campaign="Glutathione - Manual",
                        spend=spend * 0.4, sales=spend * 0.4 * rnd.uniform(1.2, 3.0), clicks=int(spend / 9),
                        impressions=int(spend * 8), source="demo")

    for (platform, week), amount in payout_buckets.items():
        credited = week + timedelta(days=2 if platform == "amazon" else 1)
        bank = credited + timedelta(days=3 if platform == "amazon" else 0)
        if bank > today:
            continue
        save_payout(conn, platform=platform, payout_id=f"DEMO-{platform[:2].upper()}-{week:%Y%m%d}",
                    amount=amount, credited_date=credited.isoformat(), bank_date=bank.isoformat(),
                    status="settled", source="demo")

    # Listings: own (ratings) and competitors (prices).
    for kind, platform, label, sku, rating, reviews, cprice in WATCHED:
        cur = conn.execute("INSERT INTO listings(kind, platform, label, url, sku) VALUES(?,?,?,?,?)",
                           (kind, platform, label, "", sku))
        lid = cur.lastrowid
        for ago in range(30, -1, -1):
            d = (today - timedelta(days=ago)).isoformat()
            if kind == "own":
                drop = 0.25 if (label.startswith("Sea Buckthorn Juice – Flipkart") and ago <= 3) else 0
                conn.execute("INSERT INTO listing_snapshots VALUES(?,?,?,?,?, 'manual')",
                             (lid, d, None, round(rating - drop + rnd.uniform(-0.03, 0.03), 2),
                              reviews + (30 - ago) * rnd.randint(0, 2)))
            else:
                p = cprice - (40 if (label.startswith("Competitor B") and ago <= 2) else 0)
                conn.execute("INSERT INTO listing_snapshots VALUES(?,?,?,?,?, 'manual')",
                             (lid, d, p, None, None))

    # Sync history: Amazon & Flipkart fresh, Meesho last upload 2 days ago (shows the stale warning).
    now = db.now_iso()
    conn.execute("INSERT INTO sync_runs(platform, job, started_at, finished_at, status, rows, message) "
                 "VALUES('amazon','api',?,?,'ok',120,'demo')", (now, now))
    conn.execute("INSERT INTO sync_runs(platform, job, started_at, finished_at, status, rows, message) "
                 "VALUES('flipkart','upload',?,?,'ok',80,'demo')", (now, now))
    old = (metrics.datetime.now(metrics.IST) - timedelta(hours=50)).isoformat(timespec="seconds")
    conn.execute("INSERT INTO sync_runs(platform, job, started_at, finished_at, status, rows, message) "
                 "VALUES('meesho','upload',?,?,'ok',60,'demo')", (old, old))
    db.kv_set(conn, "demo_data", "1")
