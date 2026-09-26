"""Checks for the parts where a wrong number would mislead the owner:
report detection, re-import safety, FIFO stock/cost, and the profit maths."""
from __future__ import annotations

import importlib
from datetime import timedelta

import openpyxl
import pytest


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "t.db"))
    monkeypatch.setenv("SKU_FILTER_REGEX", "")
    from app import config, db
    importlib.reload(config)
    importlib.reload(db)
    for mod in ("app.inventory", "app.metrics", "app.ingest.common", "app.ingest.files"):
        importlib.reload(importlib.import_module(mod))
    db.init_db()
    c = db.connect()
    yield c
    c.close()


def _write(path, text):
    path.write_text(text, encoding="utf-8")
    return path


def test_amazon_orders_tsv_detect_and_reimport(conn, tmp_path):
    from app.ingest import files
    f = _write(tmp_path / "orders.txt",
               "amazon-order-id\tmerchant-order-id\tpurchase-date\tlast-updated-date\torder-status\tproduct-name\tsku\tasin\titem-status\tquantity\tcurrency\titem-price\n"
               "403-1111111-1111111\t\t2026-09-20T18:45:00+00:00\t2026-09-21T10:00:00+00:00\tShipped\tSea Buckthorn\tPN-SBJ-500ML-P2\tB0X\tShipped\t1\tINR\t461.00\n"
               "403-2222222-2222222\t\t2026-09-21T04:00:00+00:00\t2026-09-21T10:00:00+00:00\tCancelled\tGluta\tPN-GLUTA-30C\tB0Y\tCancelled\t1\tINR\t497.00\n")
    res = files.import_file(conn, f)
    assert res[0].kind == "Amazon orders" and res[0].rows == 2
    files.import_file(conn, f)  # same file again must not double count
    rows = conn.execute("SELECT * FROM orders ORDER BY order_id").fetchall()
    assert len(rows) == 2
    # 18:45 UTC on the 20th is 00:15 IST on the 21st
    assert rows[0]["order_date"] == "2026-09-21"
    assert rows[0]["status"] == "shipped" and rows[1]["status"] == "cancelled"


def test_status_never_goes_backwards(conn, tmp_path):
    from app.ingest.common import save_order
    kw = dict(platform="meesho", order_id="1", item_id="1", order_date="2026-09-01", platform_sku="A", qty=1, sale_amount=300)
    save_order(conn, status="rto", **kw)
    save_order(conn, status="shipped", **kw)  # an older export arriving late
    assert conn.execute("SELECT status FROM orders").fetchone()["status"] == "rto"


def test_meesho_payments_xlsx_with_title_rows(conn, tmp_path):
    from app.ingest import files
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Order Payments"
    ws.append(["Order Related Details", None, None, "Settlement Details"])  # grouped title row above the header
    ws.append(["Sub Order No", "Order Date", "Dispatch Date", "Product Name", "Supplier SKU", "Live Order Status",
               "Quantity", "Transaction ID", "Payment Date", "Final Settlement Amount", "Total Sale Amount (Incl. Shipping & GST)",
               "Total Sale Return Amount (Incl. Shipping & GST)", "Meesho Commission (Incl. GST)", "Fixed Fee (Incl. GST)",
               "Shipping Charge (Incl. GST)", "Return Shipping Charge (Incl. GST)", "TCS", "TDS"])
    ws.append(["S1", "2026-09-01", "2026-09-02", "Juice", "PN-SBJ", "Delivered", 1, "T1", "2026-09-10", 300, 400, 0, 0, -10, -80, 0, -5, -5])
    ws.append(["S2", "2026-09-01", "2026-09-02", "Juice", "PN-SBJ", "RTO Complete", 1, "T1", "2026-09-10", -60, 400, -400, 0, 0, 0, -60, 0, 0])
    p = tmp_path / "meesho.xlsx"
    wb.save(p)
    res = files.import_file(conn, p)
    assert res and res[0].kind == "Meesho payments"
    statuses = dict(conn.execute("SELECT order_id, status FROM orders").fetchall())
    assert statuses == {"S1": "delivered", "S2": "rto"}
    payout = conn.execute("SELECT amount, bank_date FROM payouts").fetchone()
    assert payout["amount"] == 240 and payout["bank_date"] == "2026-09-10"
    fin = dict(conn.execute("SELECT category, SUM(amount) FROM finance_entries WHERE order_id='S1' GROUP BY category").fetchall())
    # 400 sale -> 300 settled: fee 10, shipping 80, tax 10 = 100
    assert fin == {"fee": 10, "shipping": 80, "tax": 10}
    fin2 = dict(conn.execute("SELECT category, SUM(amount) FROM finance_entries WHERE order_id='S2' GROUP BY category").fetchall())
    assert fin2 == {"shipping": 60}


def test_flipkart_settlement_and_amazon_settlement(conn, tmp_path):
    from app.ingest import files
    f = _write(tmp_path / "fk.csv",
               "NEFT ID,NEFT Type,Payment Date,Bank Settlement Value (Rs.),Order ID,Order item ID,Sale Amount (Rs.),"
               "Marketplace Fee (Rs.),Taxes (Rs.),Shipping Fee (Rs.),Reverse Shipping Fee (Rs.),TCS (Rs.),TDS (Rs.),Seller SKU\n"
               "N1,Prepaid,2026-09-15,349,OD1,OI1,461,-107,-5,-102,0,-3,-2,PN-SBJ\n")
    assert files.import_file(conn, f)[0].kind == "Flipkart settled payments"
    fin = dict(conn.execute("SELECT category, amount FROM finance_entries").fetchall())
    assert fin == {"fee": 5, "shipping": 102, "tax": 5}
    a = _write(tmp_path / "settle.txt",
               "settlement-id\tsettlement-start-date\tsettlement-end-date\tdeposit-date\ttotal-amount\tcurrency\ttransaction-type\torder-id\tmerchant-order-id\tadjustment-id\tshipment-id\tmarketplace-name\tamount-type\tamount-description\tamount\tfulfillment-id\tposted-date\tposted-date-time\torder-item-code\tmerchant-order-item-id\tmerchant-adjustment-item-id\tsku\tquantity-purchased\tpromotion-id\n"
               "999\t2026-09-01\t2026-09-14\t2026-09-17\t1000.50\tINR\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\n"
               "999\t\t\t\t\t\tOrder\t403-1\t\t\t\tAmazon.in\tItemPrice\tPrincipal\t461\tMFN\t2026-09-05\t\t\t\t\tPN-SBJ\t1\t\n"
               "999\t\t\t\t\t\tOrder\t403-1\t\t\t\tAmazon.in\tItemFees\tCommission\t-40\tMFN\t2026-09-05\t\t\t\t\tPN-SBJ\t1\t\n"
               "999\t\t\t\t\t\tOrder\t403-1\t\t\t\tAmazon.in\tItemFees\tShippingChargeback\t-60\tMFN\t2026-09-05\t\t\t\t\tPN-SBJ\t1\t\n"
               "999\t\t\t\t\t\tOrder\t403-1\t\t\t\tAmazon.in\tItemWithheldTax\tTCS-IGST\t-4\tMFN\t2026-09-05\t\t\t\t\tPN-SBJ\t1\t\n")
    assert files.import_file(conn, a)[0].kind == "Amazon settlement (payments)"
    amz = dict(conn.execute("SELECT category, SUM(amount) FROM finance_entries WHERE platform='amazon' GROUP BY category").fetchall())
    assert amz == {"fee": 40, "shipping": 60, "tax": 4}
    p = conn.execute("SELECT * FROM payouts WHERE platform='amazon'").fetchone()
    assert p["amount"] == 1000.5 and p["credited_date"] == "2026-09-14" and p["bank_date"] == "2026-09-17"


def test_fifo_stock_and_profit(conn):
    from app import inventory, metrics
    from app.ingest.common import save_order, save_return, save_finance
    d0 = metrics.today() - timedelta(days=5)
    day = lambda n: (d0 + timedelta(days=n)).isoformat()
    conn.execute("INSERT INTO products(sku, name, gst_rate) VALUES('A', 'Juice', 0)")
    conn.execute("INSERT INTO purchases(purchase_date, sku, qty, unit_cost) VALUES(?, 'A', 2, 100)", (day(0),))
    conn.execute("INSERT INTO purchases(purchase_date, sku, qty, unit_cost) VALUES(?, 'A', 5, 150)", (day(1),))
    common = dict(platform="amazon", platform_sku="A", qty=1, sale_amount=500, status="delivered")
    for i in range(3):
        save_order(conn, order_id=f"O{i}", item_id=f"O{i}", order_date=day(2), **common)
    save_order(conn, order_id="C1", item_id="C1", order_date=day(2), **{**common, "status": "cancelled"})
    save_return(conn, platform="amazon", order_id="O2", item_id="O2", return_date=day(3), platform_sku="A",
                qty=1, return_type="rto", restock=True)
    inv = inventory.compute(conn)
    s = inv.skus["A"]
    # bought 7, sold 3 (cancel ignored), 1 came back -> 5 in stock
    assert s.stock == 5
    # FIFO: first two units cost 100, third 150; the returned one (150) goes back to the pool
    assert s.cogs_value == 200
    assert s.pool_remaining == 750
    save_finance(conn, ext_key="f0", platform="amazon", entry_date=day(4), category="fee", amount=50, order_id="O0")
    save_finance(conn, ext_key="f1", platform="amazon", entry_date=day(4), category="fee", amount=50, order_id="O1")
    save_finance(conn, ext_key="f2", platform="amazon", entry_date=day(4), category="shipping", amount=80, order_id="O2")
    fin = metrics.finance(conn, day(0), day(5))["platforms"]["amazon"]
    assert fin["orders"] == 3
    assert fin["net_sale"] == 1000        # O2 was returned
    assert fin["fee"] == 100 and fin["shipping"] == 80
    assert fin["cogs"] == 200             # O2's unit came back, so no cost
    assert fin["profit"] == 1000 - 100 - 80 - 200
    assert fin["estimated_lines"] == 0


def test_fee_estimate_for_unsettled_orders(conn):
    from app import metrics
    from app.ingest.common import save_order, save_finance
    t = metrics.today()
    for i in range(10):  # settled history: fees are 10% of sale
        d = (t - timedelta(days=30 + i)).isoformat()
        save_order(conn, platform="flipkart", order_id=f"H{i}", item_id=f"H{i}", order_date=d, platform_sku="A",
                   qty=1, sale_amount=500, status="delivered")
        save_finance(conn, ext_key=f"h{i}", platform="flipkart", entry_date=d, category="fee", amount=50, order_id=f"H{i}")
    save_order(conn, platform="flipkart", order_id="NEW", item_id="NEW", order_date=t.isoformat(), platform_sku="A",
               qty=1, sale_amount=1000, status="pending")
    f = metrics.finance(conn, t.isoformat(), t.isoformat())["platforms"]["flipkart"]
    assert f["estimated_lines"] == 1 and f["fee"] == 100


def test_detects_meesho_orders_and_returns_csv(conn, tmp_path):
    from app.ingest import files
    o = _write(tmp_path / "mo.csv",
               "Reason for Credit Entry,Sub Order No,Order Date,Customer State,Product Name,SKU,Size,Quantity,"
               "Supplier Listed Price (Incl. GST + Commission),Supplier Discounted Price (Incl GST and Commision),Packet Id\n"
               "DELIVERED,111_1,2026-09-01,Delhi,Juice,PN-SBJ,Free,1,470,461,P1\n"
               "RTO_COMPLETE,222_1,2026-09-02,Delhi,Juice,PN-SBJ,Free,1,470,461,P2\n")
    assert files.import_file(conn, o)[0].kind == "Meesho orders"
    r = _write(tmp_path / "mr.csv",
               "Product Name,SKU,Variation,Qty,Category,Suborder Number,Dispatch Date,Return Created Date,Type of Return,Return Reason\n"
               "Juice,PN-SBJ,Free,1,Juice,111_1,2026-09-02,2026-09-06,Customer Return,Bad taste\n")
    assert files.import_file(conn, r)[0].kind == "Meesho returns / RTO"
    assert conn.execute("SELECT status FROM orders WHERE order_id='111_1'").fetchone()["status"] == "returned"
    # the RTO order (status only) and the customer return are both counted exactly once
    assert conn.execute("SELECT COUNT(*) FROM v_returns").fetchone()[0] == 2


def test_demo_clear_keeps_real_data(conn):
    from app import demo
    from app.ingest.common import save_order
    demo.load(conn)
    save_order(conn, platform="amazon", order_id="REAL", item_id="REAL", order_date="2026-09-01",
               platform_sku="PN-SBJ-500ML-P2", qty=1, sale_amount=461, status="delivered", source="file:x")
    demo.clear(conn)
    assert [r[0] for r in conn.execute("SELECT order_id FROM orders")] == ["REAL"]
    with pytest.raises(ValueError):
        demo.load(conn)


def test_agent_ingest_validates_and_logs(conn):
    from app import audit, metrics
    y = (metrics.today() - timedelta(days=1)).isoformat()
    conn.execute("INSERT INTO listings(kind, label) VALUES('own', 'SBJ Amazon')")
    payload = {
        "orders": [
            {"platform": "meesho", "order_id": "M1", "order_date": y, "sku": "PN-SBJ", "qty": 1, "sale_amount": 461, "status": "Pending"},
            {"platform": "meesho", "order_id": "M2", "order_date": y, "sku": "PN-SBJ", "status": "Pending"},   # new order, no amount
            {"platform": "ebay", "order_id": "X", "order_date": y, "sku": "A", "sale_amount": 1},             # bad platform
        ],
        "returns": [{"platform": "meesho", "order_id": "M1", "return_date": y, "return_type": "rto"}],
        "ad_days": [{"platform": "amazon", "day": y, "spend": 500, "sales": 1500}],
        "listing_snapshots": [{"listing_id": 1, "rating": 4.3, "review_count": 120}, {"listing_id": 1, "rating": 7}],
        "audit": {"day": y, "summary": "Meesho ka 1 order missing tha", "checks": [
            {"platform": "meesho", "item": "orders", "panel": 1, "dashboard": 0, "status": "fixed"},
            {"platform": "flipkart", "item": "login", "status": "unreadable", "note": "login expired"},
        ]},
    }
    res = audit.ingest(conn, payload)
    assert res["saved"] == {"orders": 1, "returns": 1, "ad_days": 1, "listing_snapshots": 1, "payouts": 0, "ads_summaries": 0}
    assert len(res["errors"]) == 3
    assert conn.execute("SELECT status, source FROM orders WHERE order_id='M1'").fetchone()[:] == ("rto", "n8n")
    run = audit.recent(conn)[0]
    assert run["status"] == "problem" and len(run["checks"]) == 2
    fr = metrics.freshness(conn)
    assert fr["meesho"]["last_status"] == "ok" and fr["flipkart"]["last_status"] == "error"
    snap = audit.snapshot(conn, y)
    assert snap["platforms"]["meesho"]["returns_rto"] == 1 and snap["platforms"]["amazon"]["ad_spend"] == 500
    # A later status-only update for a known order needs no amount and keeps the original value.
    audit.ingest(conn, {"orders": [{"platform": "meesho", "order_id": "M1", "order_date": y, "status": "delivered"}]})
    assert conn.execute("SELECT sale_amount, status FROM orders WHERE order_id='M1'").fetchone()[:] == (461, "rto")


def _fake_claude(result):
    def run(context, text):
        run.context = context
        return result
    return run


def test_n8n_page_flow(conn):
    from app import audit, extract, metrics
    y = (metrics.today() - timedelta(days=1)).isoformat()
    from app.ingest.common import save_order
    save_order(conn, platform="meesho", order_id="OLD1", item_id="OLD1", order_date=y, platform_sku="PN-SBJ",
               qty=1, sale_amount=461, status="pending")
    fake = _fake_claude({
        "page_status": "ok", "note": "", "panel_counts": {"orders": 3, "cancelled": None, "returns": None},
        "orders": [
            {"order_id": "OLD1", "item_id": None, "order_date": y, "sku": "PN-SBJ", "qty": 1, "sale_amount": None,
             "status": "shipped", "product_name": None},
            {"order_id": "NEW1", "item_id": None, "order_date": y, "sku": "PN-GLUTA", "qty": 1, "sale_amount": 497,
             "status": "pending", "product_name": "Gluta"},
            {"order_id": "NEW2", "item_id": None, "order_date": y, "sku": "PN-GLUTA", "qty": 1, "sale_amount": None,
             "status": "pending", "product_name": None},   # no amount -> must be skipped, not saved as ₹0
        ],
        "returns": [], "ad_days": [], "payouts": [], "listing": None})
    res = extract.handle_page(conn, {"platform": "meesho", "page_kind": "orders", "day": y, "text": "..."}, extractor=fake)
    assert res["saved"]["orders"] == 2 and len(res["errors"]) == 1
    assert fake.context["dashboard_already_has_orders_for_day"] == ["OLD1"]
    assert conn.execute("SELECT sale_amount, status FROM orders WHERE order_id='OLD1'").fetchone()[:] == (461, "shipped")
    # a page n8n could not open
    extract.handle_page(conn, {"platform": "flipkart", "page_kind": "orders", "day": y, "error": "Login failed: OTP asked"})
    out = extract.finish_run(conn, y)
    by = {(c["platform"], c["item"]): c for c in out["checks"]}
    assert by[("meesho", "orders")]["status"] == "mismatch"          # panel says 3, dashboard now has 2
    assert by[("flipkart", "orders")]["status"] == "unreadable"
    assert "Login" in by[("flipkart", "orders")]["note"]
    assert audit.recent(conn)[0]["status"] == "problem"
    assert out["alerts"]["count"] >= 1 and "PureNutrix" in out["alerts"]["text"]
    # pages are rolled up only once
    assert extract.finish_run(conn, y)["checks"] == []


def test_agent_endpoints_need_token(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "api.db"))
    monkeypatch.setenv("AUDIT_TOKEN", "t0k3n")
    monkeypatch.setenv("DASHBOARD_PASSWORD", "pw")
    from app import config
    importlib.reload(config)
    for mod in ("app.db", "app.inventory", "app.metrics", "app.ingest.common", "app.ingest.files",
                "app.alerts", "app.audit", "app.extract", "app.main"):
        importlib.reload(importlib.import_module(mod))
    from fastapi.testclient import TestClient
    from app import main
    with TestClient(main.app) as c:
        assert c.get("/api/agent/snapshot").status_code == 401
        assert c.get("/api/agent/snapshot", headers={"Authorization": "Bearer wrong"}).status_code == 401
        ok = c.get("/api/agent/snapshot", headers={"Authorization": "Bearer t0k3n"})
        assert ok.status_code == 200 and "platforms" in ok.json()
        assert c.get("/api/summary", headers={"Authorization": "Bearer t0k3n"}).status_code == 401  # token only opens /api/agent/*
        r = c.post("/api/agent/finish", json={}, headers={"Authorization": "Bearer t0k3n"})
        assert r.status_code == 200 and "n8n se aaj koi page nahi aaya" in r.json()["summary"]


def test_missing_claude_key_is_a_clear_error(conn, monkeypatch):
    from app import extract
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    with pytest.raises(extract.ExtractError, match="ANTHROPIC_API_KEY"):
        extract._client()


def test_queue_path_without_api_key(conn, monkeypatch):
    from app import audit, extract, metrics
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    y = (metrics.today() - timedelta(days=1)).isoformat()
    r = extract.handle_page(conn, {"platform": "meesho", "page_kind": "orders", "day": y, "url": "u", "text": "Orders ..."})
    assert r["status"] == "queued"
    extract.handle_page(conn, {"platform": "amazon", "page_kind": "orders", "day": y, "error": "Login failed"})
    # n8n's finish must wait while pages are queued
    assert extract.finish_run(conn, y)["audit_run_id"] is None
    q = extract.queued_pages(conn)
    assert len(q) == 1 and q[0]["text"] == "Orders ..." and q[0]["context"]["platform"] == "meesho"
    with pytest.raises(extract.ExtractError):
        extract.apply_queued(conn, q[0]["page_id"], {"page_status": "ok"})      # incomplete result
    data = {"page_status": "ok", "note": "", "panel_counts": {"orders": None, "cancelled": None, "returns": None},
            "orders": [{"order_id": "Q1", "item_id": None, "order_date": y, "sku": "PN-SBJ", "qty": 1, "sale_amount": 461,
                        "status": "pending", "product_name": None}],
            "returns": [], "ad_days": [], "payouts": [], "listing": None}
    res = extract.apply_queued(conn, q[0]["page_id"], data)
    assert res["saved"]["orders"] == 1 and extract.queued_pages(conn) == []
    out = extract.finish_run(conn, y)
    assert out["audit_run_id"] and {c["status"] for c in out["checks"]} == {"fixed", "unreadable"}


def test_ads_summary_saved(conn):
    from app import extract, metrics
    y = (metrics.today() - timedelta(days=1)).isoformat()
    fake = _fake_claude({"page_status": "ok", "note": "", "panel_counts": {"orders": None, "cancelled": None, "returns": None},
                         "orders": [], "returns": [], "ad_days": [], "payouts": [], "listing": None,
                         "ads_summary": {"period_start": "2026-09-20", "period_end": "2026-09-26", "spend": 14030,
                                         "revenue": 58650, "units": 130, "roi": 4.22, "clicks": 1000, "views": 35000}})
    res = extract.handle_page(conn, {"platform": "flipkart", "page_kind": "ads", "day": y, "text": "ads"}, extractor=fake)
    assert res["saved"]["ads_summaries"] == 1
    fin = metrics.finance(conn, y, y)
    s = metrics.ads_stats(conn, y, y, fin)["panel_summaries"]["flipkart"]
    assert s["spend"] == 14030 and s["roi"] == 4.22
