"""Import any report file downloaded from Amazon / Flipkart / Meesho seller panels.

The owner just drops the file in. We work out WHICH report it is by looking at
the column names, find the header row (Meesho/Flipkart often put titles above
it), and map columns by a list of known aliases. If a marketplace renames a
column, add the new name to the alias list below - nothing else changes.
"""
from __future__ import annotations

import csv
import io
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

from .common import (
    ImportResult, clean_sku, ensure_products, normalize_status, parse_date, parse_int,
    parse_money, save_ad_day, save_finance, save_order, save_payout, save_return,
)


def norm(h) -> str:
    return re.sub(r"[^a-z0-9]", "", str(h or "").lower())


# ---------------------------------------------------------------------------
# Reading files
# ---------------------------------------------------------------------------

def read_sheets(path: Path) -> List[Tuple[str, List[List]]]:
    """Return [(sheet_name, rows)] for csv / tsv / txt / xlsx."""
    suffix = path.suffix.lower()
    if suffix in (".xlsx", ".xlsm"):
        import openpyxl

        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        out = []
        for ws in wb.worksheets:
            rows = [list(r) for r in ws.iter_rows(values_only=True)]
            out.append((ws.title, rows))
        wb.close()
        return out
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    first = text.split("\n", 1)[0]
    delim = "\t" if first.count("\t") > first.count(",") else ","
    rows = list(csv.reader(io.StringIO(text), delimiter=delim))
    return [(path.name, rows)]


# ---------------------------------------------------------------------------
# Report definitions
# ---------------------------------------------------------------------------

@dataclass
class Report:
    key: str
    platform: str            # amazon|flipkart|meesho|any
    label: str
    fields: Dict[str, List[str]]
    required: List[str]
    handler: Callable
    bonus: Tuple[str, ...] = ()   # distinctive columns that make this a stronger match

    def normalized_fields(self):
        return {k: [norm(a) for a in v] for k, v in self.fields.items()}


def _match_columns(header: List, report: Report) -> Dict[str, int]:
    heads = [norm(h) for h in header]
    # Same headers without bracketed units, e.g. "TCS (Rs.)" -> "tcs"
    bare = [norm(re.sub(r"\(.*?\)", "", str(h or ""))) for h in header]
    colmap: Dict[str, int] = {}
    used = set()
    for field_name, aliases in report.normalized_fields().items():
        idx = None
        for alias in aliases:  # exact match first, in alias priority order
            for candidates in (heads, bare):
                if alias in candidates and candidates.index(alias) not in used:
                    idx = candidates.index(alias)
                    break
            if idx is not None:
                break
        if idx is None:
            for alias in aliases:  # then "column starts with alias" for long Flipkart headers
                if len(alias) < 6:
                    continue
                for i, h in enumerate(heads):
                    if i not in used and h.startswith(alias):
                        idx = i
                        break
                if idx is not None:
                    break
        if idx is not None:
            colmap[field_name] = idx
            used.add(idx)
    return colmap


def _find_header(rows: List[List], report: Report) -> Tuple[int, Dict[str, int], int]:
    best = (-1, {}, -1)
    for i, row in enumerate(rows[:25]):
        if not row or sum(1 for c in row if c not in (None, "")) < 2:
            continue
        colmap = _match_columns(row, report)
        if not all(r in colmap for r in report.required):
            continue
        score = len(colmap) + 3 * sum(1 for b in report.bonus if b in colmap)
        if score > best[2]:
            best = (i, colmap, score)
    return best


class Rows:
    """Iterate data rows as dict-like accessors by logical field name."""

    def __init__(self, rows, header_idx, colmap):
        self.rows = rows[header_idx + 1:]
        self.colmap = colmap

    def __iter__(self):
        for r in self.rows:
            if not r or all(c in (None, "") for c in r):
                continue
            yield _Row(r, self.colmap)


class _Row:
    def __init__(self, raw, colmap):
        self.raw, self.colmap = raw, colmap

    def get(self, key, default=None):
        idx = self.colmap.get(key)
        if idx is None or idx >= len(self.raw):
            return default
        v = self.raw[idx]
        if isinstance(v, str):
            v = v.strip()
        return default if v in (None, "") else v

    def has(self, key):
        return key in self.colmap

    def money(self, key):
        return parse_money(self.get(key))


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def _orders_handler(platform: str):
    def handle(conn, rows: Rows, res: ImportResult, source: str):
        seen = []
        for r in rows:
            order_id = r.get("order_id")
            day = parse_date(r.get("date"))
            if not order_id or not day:
                res.skipped += 1
                continue
            psku = clean_sku(r.get("sku"))
            status_raw = r.get("status") or ""
            if r.has("item_status") and "cancel" in str(r.get("item_status", "")).lower():
                status_raw = "cancelled"
            event = str(r.get("event_type") or "").lower()
            if event:
                status_raw = {"sale": status_raw or "shipped", "return": "returned",
                              "cancellation": "cancelled"}.get(event, status_raw)
            qty = abs(parse_int(r.get("qty"), 1))
            amount = abs(r.money("amount"))
            if event and event != "sale":
                amount = 0  # keep the original sale value
            item_id = str(r.get("item_id") or f"{order_id}:{psku}")
            save_order(conn, platform=platform, order_id=str(order_id), item_id=item_id,
                       order_date=day, platform_sku=psku, qty=qty, sale_amount=amount,
                       status=normalize_status(status_raw), product_name=str(r.get("name") or ""),
                       source=source)
            seen.append((psku, r.get("name")))
            res.rows += 1
        ensure_products(conn, seen)
    return handle


def _returns_handler(platform: str):
    def handle(conn, rows: Rows, res: ImportResult, source: str):
        for r in rows:
            order_id = r.get("order_id")
            day = parse_date(r.get("date"))
            if not order_id or not day:
                res.skipped += 1
                continue
            rtype_raw = f"{r.get('return_type') or ''} {r.get('reason') or ''}".lower()
            is_rto = any(k in rtype_raw for k in ("rto", "courier", "undeliver", "logistics"))
            disposition = str(r.get("disposition") or "").lower()
            restock = not any(k in disposition for k in ("damaged", "defective", "unsellable", "disposed"))
            save_return(conn, platform=platform, order_id=str(order_id),
                        item_id=str(r.get("item_id") or ""), return_date=day,
                        platform_sku=clean_sku(r.get("sku")), qty=abs(parse_int(r.get("qty"), 1)),
                        return_type="rto" if is_rto else "customer",
                        reason=str(r.get("reason") or "")[:200], restock=restock, source=source)
            res.rows += 1
    return handle


def _amazon_settlement(conn, rows: Rows, res: ImportResult, source: str):
    for i, r in enumerate(rows):
        sid = r.get("settlement_id")
        if not sid:
            continue
        if r.get("total_amount") not in (None, "") and not r.get("amount_type"):
            save_payout(conn, platform="amazon", payout_id=str(sid), amount=r.money("total_amount"),
                        credited_date=parse_date(r.get("settlement_end")),
                        bank_date=parse_date(r.get("deposit_date")), status="settled", source=source)
            res.rows += 1
            continue
        amount_type = str(r.get("amount_type") or "")
        desc = str(r.get("description") or "")
        amt = r.money("amount")
        day = parse_date(r.get("posted_date")) or parse_date(r.get("settlement_end"))
        if not day or not amt:
            continue
        d, t = desc.lower(), amount_type.lower()
        if t == "itemprice" or d in ("principal", "tax", "shipping", "shippingtax", "giftwrap", "giftwraptax"):
            continue  # sale value itself / customer refunds - handled via orders & returns
        if "tcs" in d or "tds" in d or "withheld" in t:
            cat = "tax"
        elif "advertis" in d:
            cat = "ads"
        elif "ship" in d or "weight" in d or "handling" in d or "pick" in d:
            cat = "shipping"
        elif t in ("itemfees", "itemfee") or "fee" in d or "commission" in d:
            cat = "fee"
        elif t == "promotion" or "promo" in d:
            continue  # promotions reduce the sale price; already in item price for India
        else:
            cat = "other"
        save_finance(conn, ext_key=f"amazon:{sid}:{i}", platform="amazon", entry_date=day,
                     category=cat, amount=-amt, order_id=str(r.get("order_id") or ""),
                     platform_sku=clean_sku(r.get("sku")), description=desc or amount_type, source=source)
        res.rows += 1


def _flipkart_settlement(conn, rows: Rows, res: ImportResult, source: str):
    payouts = defaultdict(lambda: [0.0, None])
    for r in rows:
        neft = r.get("neft_id")
        day = parse_date(r.get("payment_date"))
        order_item = str(r.get("item_id") or r.get("order_id") or "")
        if not neft or not day or not order_item:
            continue
        payouts[neft][0] += r.money("bank_value")
        payouts[neft][1] = day
        shipping = -(r.money("shipping_fee") + r.money("reverse_shipping_fee"))
        fee = -r.money("marketplace_fee") - shipping
        tax = -(r.money("tcs") + r.money("tds")) if (r.has("tcs") or r.has("tds")) else -r.money("taxes")
        key = f"flipkart:{neft}:{order_item}"
        psku = clean_sku(r.get("sku"))
        common = dict(platform="flipkart", entry_date=day, order_id=str(r.get("order_id") or ""),
                      platform_sku=psku, source=source)
        save_finance(conn, ext_key=key + ":fee", category="fee", amount=fee, description="Marketplace fee", **common)
        save_finance(conn, ext_key=key + ":ship", category="shipping", amount=shipping, description="Shipping", **common)
        save_finance(conn, ext_key=key + ":tax", category="tax", amount=tax, description="TCS/TDS", **common)
        res.rows += 1
    for neft, (amount, day) in payouts.items():
        save_payout(conn, platform="flipkart", payout_id=str(neft), amount=amount,
                    credited_date=day, bank_date=day, status="settled", source=source)


_MEESHO_FEE_KEYS = ("commission", "fixed_fee", "platform_fee", "warehousing_fee", "other_charges", "return_premium")


def _meesho_payments(conn, rows: Rows, res: ImportResult, source: str):
    payouts = defaultdict(lambda: [0.0, None])
    seen = []
    for r in rows:
        sub = r.get("order_id")
        if not sub:
            continue
        pay_day = parse_date(r.get("payment_date"))
        order_day = parse_date(r.get("date")) or pay_day
        psku = clean_sku(r.get("sku"))
        sale = r.money("sale_amount")
        ret = r.money("return_amount")
        settle = r.money("settlement")
        if order_day and sale > 0:
            save_order(conn, platform="meesho", order_id=str(sub), item_id=str(sub), order_date=order_day,
                       platform_sku=psku, qty=abs(parse_int(r.get("qty"), 1)), sale_amount=sale,
                       status=normalize_status(r.get("status")), product_name=str(r.get("name") or ""),
                       source=source)
            seen.append((psku, r.get("name")))
        if r.get("txn_id") and pay_day:
            payouts[r.get("txn_id")][0] += settle
            payouts[r.get("txn_id")][1] = pay_day
        day = pay_day or order_day
        if not day:
            continue
        fee = -sum(r.money(k) for k in _MEESHO_FEE_KEYS)
        shipping = -(r.money("shipping") + r.money("return_shipping"))
        tax = -(r.money("tcs") + r.money("tds"))
        # Whatever else Meesho kept (or paid back as compensation) that we didn't name.
        other = (sale + ret) - settle - fee - shipping - tax
        base = f"meesho:{sub}:{r.get('txn_id') or pay_day}"
        common = dict(platform="meesho", entry_date=day, order_id=str(sub), platform_sku=psku, source=source)
        save_finance(conn, ext_key=base + ":fee", category="fee", amount=fee, description="Meesho fees", **common)
        save_finance(conn, ext_key=base + ":ship", category="shipping", amount=shipping, description="Shipping", **common)
        save_finance(conn, ext_key=base + ":tax", category="tax", amount=tax, description="TCS/TDS", **common)
        if abs(other) >= 1 and (sale or ret):
            save_finance(conn, ext_key=base + ":other", category="other", amount=other,
                         description="Other deductions / claims", **common)
        res.rows += 1
    for txn, (amount, day) in payouts.items():
        save_payout(conn, platform="meesho", payout_id=str(txn), amount=amount,
                    credited_date=day, bank_date=day, status="settled", source=source)
    ensure_products(conn, seen)


def _ads_handler(platform: str):
    def handle(conn, rows: Rows, res: ImportResult, source: str):
        agg = defaultdict(lambda: [0.0, 0.0, 0, 0])
        for r in rows:
            day = parse_date(r.get("date"))
            if not day:
                res.skipped += 1
                continue
            a = agg[(day, str(r.get("campaign") or ""))]
            a[0] += r.money("spend")
            a[1] += r.money("sales")
            a[2] += int(r.money("clicks"))
            a[3] += int(r.money("impressions"))
        for (day, campaign), (spend, sales, clicks, imps) in agg.items():
            save_ad_day(conn, platform=platform, day=day, campaign=campaign, spend=spend, sales=sales,
                        clicks=clicks, impressions=imps, source=source)
            res.rows += 1
    return handle


def _purchases(conn, rows: Rows, res: ImportResult, source: str):
    for r in rows:
        day = parse_date(r.get("date"))
        sku = clean_sku(r.get("sku"))
        qty = parse_int(r.get("qty"), 0)
        if not day or not sku or qty <= 0:
            res.skipped += 1
            continue
        unit = r.money("unit_cost") or (r.money("total_cost") / qty if qty else 0)
        conn.execute("INSERT INTO purchases(purchase_date, sku, qty, unit_cost, supplier, note) VALUES(?,?,?,?,?,?)",
                     (day, sku, qty, round(unit, 2), str(r.get("supplier") or ""), f"import:{source}"))
        ensure_products(conn, [(sku, None)])
        res.rows += 1


REPORTS: List[Report] = [
    Report("amazon_orders", "amazon", "Amazon orders", {
        "order_id": ["amazon-order-id", "order-id", "Order ID"],
        "date": ["purchase-date", "Order Date", "purchase date"],
        "sku": ["sku", "seller-sku", "Merchant SKU"],
        "qty": ["quantity", "quantity-purchased", "quantity-shipped"],
        "amount": ["item-price", "Item Price"],
        "status": ["order-status"],
        "item_status": ["item-status"],
        "name": ["product-name"],
    }, ["order_id", "date", "sku", "status"], _orders_handler("amazon"), bonus=("item_status",)),

    Report("amazon_returns", "amazon", "Amazon returns", {
        "order_id": ["Order ID", "order-id"],
        "item_id": ["Order Item ID"],
        "date": ["Return request date", "return-date", "Return Date"],
        "sku": ["Merchant SKU", "sku"],
        "qty": ["Return quantity", "quantity"],
        "reason": ["Return Reason", "reason"],
        "return_type": ["Return type", "Label type"],
        "disposition": ["detailed-disposition", "Resolution"],
    }, ["order_id", "date"], _returns_handler("amazon"), bonus=("reason", "qty")),

    Report("amazon_settlement", "amazon", "Amazon settlement (payments)", {
        "settlement_id": ["settlement-id"],
        "settlement_end": ["settlement-end-date"],
        "deposit_date": ["deposit-date"],
        "total_amount": ["total-amount"],
        "amount_type": ["amount-type"],
        "description": ["amount-description"],
        "amount": ["amount"],
        "order_id": ["order-id"],
        "sku": ["sku"],
        "posted_date": ["posted-date", "posted-date-time"],
    }, ["settlement_id", "amount_type", "amount"], _amazon_settlement),

    Report("amazon_ads", "amazon", "Amazon Ads", {
        "date": ["Date", "Start Date"],
        "campaign": ["Campaign Name"],
        "spend": ["Spend", "Cost"],
        "sales": ["7 Day Total Sales", "14 Day Total Sales", "Total Sales", "Sales"],
        "clicks": ["Clicks"],
        "impressions": ["Impressions"],
    }, ["date", "spend", "sales"], _ads_handler("amazon"), bonus=("impressions",)),

    Report("flipkart_orders", "flipkart", "Flipkart orders / sales", {
        "order_id": ["order_id", "Order ID", "Order Id"],
        "item_id": ["order_item_id", "Order Item ID", "Order Item Id"],
        "date": ["order_date", "Order Date"],
        "sku": ["sku", "SKU", "Seller SKU"],
        "qty": ["quantity", "Item Quantity", "Quantity"],
        "amount": ["Final Invoice Amount", "Invoice Amount", "Selling Price", "Price after discount"],
        "status": ["order_item_status", "Order State", "Order Status", "Status"],
        "event_type": ["Event Type"],
        "name": ["product_title", "Product Title", "Product Title/Description"],
    }, ["order_id", "date", "sku"], _orders_handler("flipkart"), bonus=("item_id",)),

    Report("flipkart_returns", "flipkart", "Flipkart returns", {
        "order_id": ["order_id", "Order ID", "Order Id"],
        "item_id": ["order_item_id", "Order Item ID", "Order Item Id"],
        "date": ["return_requested_date", "Return Requested Date", "Return Created Date", "return_date", "Return Date"],
        "sku": ["sku", "SKU"],
        "qty": ["quantity", "Quantity"],
        "reason": ["return_reason", "Return Reason"],
        "return_type": ["return_type", "Return Type"],
        "disposition": ["return_status", "Return Status", "Return Completion Type"],
    }, ["order_id", "date", "return_type"], _returns_handler("flipkart"), bonus=("return_type",)),

    Report("flipkart_settlement", "flipkart", "Flipkart settled payments", {
        "neft_id": ["NEFT ID", "Settlement Ref No", "Payment ID"],
        "payment_date": ["Payment Date", "Date", "Settlement Date"],
        "bank_value": ["Bank Settlement Value", "Settlement Value"],
        "order_id": ["Order ID"],
        "item_id": ["Order item ID"],
        "marketplace_fee": ["Marketplace Fee"],
        "shipping_fee": ["Shipping Fee"],
        "reverse_shipping_fee": ["Reverse Shipping Fee"],
        "taxes": ["Taxes"],
        "tcs": ["TCS"],
        "tds": ["TDS"],
        "sku": ["Seller SKU", "SKU"],
    }, ["neft_id", "bank_value", "order_id"], _flipkart_settlement, bonus=("marketplace_fee",)),

    Report("flipkart_ads", "flipkart", "Flipkart Ads", {
        "date": ["Date"],
        "campaign": ["Campaign Name"],
        "spend": ["Ad Spend"],
        "sales": ["Total Revenue", "Direct Revenue", "Revenue"],
        "clicks": ["Clicks"],
        "impressions": ["Views", "Impressions"],
    }, ["date", "spend", "sales"], _ads_handler("flipkart"), bonus=("impressions",)),

    Report("meesho_orders", "meesho", "Meesho orders", {
        "order_id": ["Sub Order No", "Sub Order Number", "Suborder Number"],
        "date": ["Order Date"],
        "sku": ["SKU", "Supplier SKU"],
        "qty": ["Quantity", "Qty"],
        "amount": ["Supplier Discounted Price", "Supplier Listed Price", "Selling Price"],
        "status": ["Reason for Credit Entry", "Order Status", "Live Order Status", "Status"],
        "name": ["Product Name"],
    }, ["order_id", "date", "status"], _orders_handler("meesho"), bonus=("amount",)),

    Report("meesho_payments", "meesho", "Meesho payments", {
        "order_id": ["Sub Order No", "Sub Order Number"],
        "date": ["Order Date"],
        "name": ["Product Name"],
        "sku": ["Supplier SKU", "SKU"],
        "status": ["Live Order Status"],
        "qty": ["Quantity"],
        "txn_id": ["Transaction ID"],
        "payment_date": ["Payment Date"],
        "settlement": ["Final Settlement Amount"],
        "sale_amount": ["Total Sale Amount"],
        "return_amount": ["Total Sale Return Amount"],
        "commission": ["Meesho Commission (Incl. GST)", "Meesho Commission"],
        "fixed_fee": ["Fixed Fee"],
        "platform_fee": ["Meesho gold platform fee", "Meesho mall platform fee", "Platform Fee"],
        "warehousing_fee": ["Warehousing fee"],
        "return_premium": ["Return premium (incl GST)"],
        "other_charges": ["Net Other Support Service Charges", "Other Support Service Charges"],
        "shipping": ["Shipping Charge"],
        "return_shipping": ["Return Shipping Charge"],
        "tcs": ["TCS"],
        "tds": ["TDS"],
    }, ["order_id", "settlement"], _meesho_payments, bonus=("txn_id", "payment_date")),

    Report("meesho_returns", "meesho", "Meesho returns / RTO", {
        "order_id": ["Suborder Number", "Sub Order No", "Sub Order Number"],
        "date": ["Return Created Date", "Return Requested Date", "Return Date", "Created Date", "Dispatch Date"],
        "sku": ["SKU", "Supplier SKU"],
        "qty": ["Qty", "Quantity"],
        "reason": ["Detailed Return Reason", "Return Reason"],
        "return_type": ["Type of Return", "Return Type"],
        "disposition": ["Return Status", "QC Status"],
    }, ["order_id", "date", "return_type"], _returns_handler("meesho"), bonus=("return_type",)),

    Report("purchases", "any", "Stock purchases", {
        "date": ["Purchase Date", "Date", "Bill Date", "Invoice Date"],
        "sku": ["SKU", "Product SKU"],
        "qty": ["Qty", "Quantity", "Units"],
        "unit_cost": ["Unit Cost", "Cost per unit", "Rate", "Cost"],
        "total_cost": ["Total Cost", "Amount", "Total"],
        "supplier": ["Supplier", "Vendor"],
    }, ["date", "sku", "qty"], _purchases),
]

REPORTS_BY_KEY = {r.key: r for r in REPORTS}


def detect(rows: List[List], platform_hint: Optional[str] = None) -> Optional[Tuple[Report, int, Dict[str, int]]]:
    best = None
    for rep in REPORTS:
        if rep.platform == "any" and platform_hint != "purchases":
            continue  # purchase sheets are only read when uploaded as purchases
        if platform_hint and platform_hint != "purchases" and rep.platform != platform_hint:
            continue
        if platform_hint == "purchases" and rep.platform != "any":
            continue
        idx, colmap, score = _find_header(rows, rep)
        if idx < 0:
            continue
        if best is None or score > best[3]:
            best = (rep, idx, colmap, score)
    return best[:3] if best else None


def import_file(conn, path: Path, platform_hint: Optional[str] = None,
                report_key: Optional[str] = None) -> List[ImportResult]:
    results: List[ImportResult] = []
    for sheet, rows in read_sheets(path):
        if report_key:
            rep = REPORTS_BY_KEY[report_key]
            idx, colmap, _ = _find_header(rows, rep)
            found = (rep, idx, colmap) if idx >= 0 else None
        else:
            found = detect(rows, platform_hint)
        if not found:
            continue
        rep, idx, colmap = found
        res = ImportResult(kind=rep.label, platform=rep.platform)
        rep.handler(conn, Rows(rows, idx, colmap), res, f"file:{path.name}")
        if sheet != path.name:
            res.notes.append(f"sheet: {sheet}")
        results.append(res)
    return results
