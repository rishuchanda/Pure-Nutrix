"""Stock and purchase-money pool, calculated purely from real data.

    stock now        = units bought - units sold + sellable units that came back
    bika maal (COGS) = purchase cost of each unit sold, first-in-first-out
    bacha maal       = purchase money still sitting in unsold stock

Nothing here is typed in by hand except the purchase bills themselves; every
sale pulled from Amazon / Flipkart / Meesho automatically eats into the pool.
"""
from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, Tuple

from . import config, db

OrderKey = Tuple[str, str, str]


@dataclass
class SkuStock:
    sku: str
    name: str = ""
    purchased_units: int = 0
    purchased_value: float = 0.0
    sold_units: int = 0
    returned_units: int = 0
    stock: int = 0
    pool_remaining: float = 0.0
    units_without_cost: int = 0
    sold_14d: int = 0
    low_stock_units: int = 20
    gst_rate: float = 0.0
    fallback_cost: float = 0.0
    last_purchase: str = ""

    @property
    def cogs_value(self) -> float:
        return self.purchased_value - self.pool_remaining

    @property
    def per_day(self) -> float:
        return self.sold_14d / 14.0

    @property
    def days_left(self):
        if self.per_day <= 0:
            return None
        return max(0.0, self.stock / self.per_day)

    @property
    def level(self) -> str:
        """good / watch / bad for the colour of the stock card."""
        if not self.purchased_units:
            return "unknown"  # no purchase bill entered yet - stock can't be known
        d = self.days_left
        if self.stock <= 0 or (d is not None and d < config.LOW_STOCK_DAYS / 2):
            return "bad"
        if self.stock <= self.low_stock_units or (d is not None and d < config.LOW_STOCK_DAYS):
            return "watch"
        return "good"

    def as_dict(self) -> dict:
        return {
            "sku": self.sku, "name": self.name or self.sku, "stock": self.stock,
            "purchased_units": self.purchased_units, "purchased_value": round(self.purchased_value, 2),
            "sold_units": self.sold_units, "returned_units": self.returned_units,
            "cogs_value": round(self.cogs_value, 2), "pool_remaining": round(self.pool_remaining, 2),
            "per_day": round(self.per_day, 1),
            "days_left": None if self.days_left is None else round(self.days_left, 1),
            "level": self.level, "units_without_cost": self.units_without_cost,
            "low_stock_units": self.low_stock_units, "gst_rate": self.gst_rate,
            "unit_cost": self.fallback_cost, "last_purchase": self.last_purchase,
        }


@dataclass
class InventoryResult:
    skus: Dict[str, SkuStock] = field(default_factory=dict)
    unit_cost: Dict[OrderKey, float] = field(default_factory=dict)   # cost per unit for each order line

    def totals(self) -> dict:
        s = list(self.skus.values())
        return {
            "purchased_value": round(sum(x.purchased_value for x in s), 2),
            "cogs_value": round(sum(x.cogs_value for x in s), 2),
            "pool_remaining": round(sum(x.pool_remaining for x in s), 2),
            "stock_units": sum(max(0, x.stock) for x in s),
            "units_without_cost": sum(x.units_without_cost for x in s),
        }


def compute(conn) -> InventoryResult:
    res = InventoryResult()
    flt = db.sku_filter_sql("sku")
    products = {r["sku"]: r for r in conn.execute(f"SELECT * FROM products WHERE {flt}")}

    def get(sku: str) -> SkuStock:
        if sku not in res.skus:
            p = products.get(sku)
            res.skus[sku] = SkuStock(
                sku=sku, name=(p["name"] if p else "") or "",
                low_stock_units=(p["low_stock_units"] if p and p["low_stock_units"] is not None else 20),
                gst_rate=(p["gst_rate"] if p and p["gst_rate"] is not None else config.DEFAULT_GST_RATE),
                fallback_cost=(p["unit_cost"] if p and p["unit_cost"] else 0.0),
            )
        return res.skus[sku]

    for sku, p in products.items():
        if p["active"]:
            get(sku)

    # Events per SKU: (date, order, kind, qty, payload). Purchases sort first on the same day.
    events = defaultdict(list)
    for r in conn.execute(f"SELECT * FROM purchases WHERE {flt}"):
        events[r["sku"]].append((r["purchase_date"], 0, "buy", r["qty"], r["unit_cost"]))
    for r in conn.execute(
        f"""SELECT platform, order_id, item_id, order_date, sku, qty FROM orders
            WHERE status != 'cancelled' AND sku IS NOT NULL AND sku != '' AND {flt}"""):
        events[r["sku"]].append((r["order_date"], 1, "sell", r["qty"], (r["platform"], r["order_id"], r["item_id"])))
    for r in conn.execute(
        f"""SELECT v.platform, v.order_id, v.item_id, v.return_date, v.sku, v.qty, v.restock
            FROM v_returns v WHERE v.sku IS NOT NULL AND v.sku != '' AND {db.sku_filter_sql('v.sku')}"""):
        events[r["sku"]].append((r["return_date"], 2, "return", r["qty"],
                                 (r["platform"], r["order_id"], r["item_id"], r["restock"])))

    cutoff = (date.today() - timedelta(days=14)).isoformat()
    for sku, evs in events.items():
        st = get(sku)
        lots: deque = deque()   # [qty, unit_cost]
        last_cost = st.fallback_cost
        sold_cost: Dict[OrderKey, float] = {}
        order_lines = {}
        for day, _, kind, qty, payload in sorted(evs, key=lambda e: (e[0], e[1])):
            if kind == "buy":
                lots.append([qty, payload])
                st.purchased_units += qty
                st.purchased_value += qty * payload
                last_cost = payload
                st.last_purchase = day
            elif kind == "sell":
                remaining, cost = qty, 0.0
                while remaining and lots:
                    take = min(remaining, lots[0][0])
                    cost += take * lots[0][1]
                    lots[0][0] -= take
                    remaining -= take
                    if lots[0][0] == 0:
                        lots.popleft()
                if remaining:  # sold more than we have bills for
                    st.units_without_cost += remaining
                    cost += remaining * (last_cost or st.fallback_cost)
                per_unit = cost / qty if qty else 0.0
                sold_cost[payload] = per_unit
                order_lines[payload] = qty
                st.sold_units += qty
                if day >= cutoff:
                    st.sold_14d += qty
            else:  # return
                platform, order_id, item_id, restock = payload
                key = (platform, order_id, item_id)
                if key not in sold_cost:  # return row without item id - match any line of that order
                    key = next((k for k in sold_cost if k[0] == platform and k[1] == order_id), None)
                if key is None:
                    continue
                st.returned_units += qty
                if day >= cutoff:
                    st.sold_14d -= qty
                if restock:
                    lots.appendleft([qty, sold_cost[key]])
        st.sold_14d = max(0, st.sold_14d)
        # Stock = what's left in the lots. Units sold with no purchase bill show up as
        # negative stock, so a missing purchase entry is noticed instead of hidden.
        st.stock = sum(q for q, _ in lots) - st.units_without_cost
        st.pool_remaining = sum(q * c for q, c in lots)
        res.unit_cost.update(sold_cost)
    return res
