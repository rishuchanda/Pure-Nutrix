"""Flipkart Marketplace Seller API (v3) connector.

Needs a "self access" application: Seller Hub -> Manage Profile -> Developer
Access -> create app -> copy App ID + App Secret into the environment.
Flipkart only approves API access for some sellers; if you don't have it,
leave these empty and upload the Seller Hub report files instead - the
dashboard works the same either way.

Endpoints follow https://seller.flipkart.com/api-docs/FMSAPI.html (checked Sep 2026).
Fees and payouts are NOT in the orders API - they come from the "Settled
Transactions" report upload.
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from typing import Iterator, Optional

import httpx

from .. import config
from .common import clean_sku, ensure_products, normalize_status, parse_date, parse_money, save_order, save_return


class FlipkartError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(config.FLIPKART_APP_ID and config.FLIPKART_APP_SECRET)


# Shipment filter "type" -> states we ask for. Anything Flipkart adds later still
# maps through normalize_status().
_FILTERS = {
    "preDispatch": ["APPROVED", "PACKING_IN_PROGRESS", "PACKED", "FORM_FAILED", "READY_TO_DISPATCH"],
    "postDispatch": ["SHIPPED", "DELIVERED"],
    "cancelled": ["CANCELLED"],
}


class FlipkartClient:
    def __init__(self):
        self.base = config.FLIPKART_API_BASE.rstrip("/")
        self.http = httpx.Client(timeout=60)
        self._token: Optional[str] = None
        self._token_expiry = 0.0

    def token(self) -> str:
        if self._token and time.time() < self._token_expiry - 120:
            return self._token
        r = self.http.get(f"{self.base}/oauth-service/oauth/token",
                          params={"grant_type": "client_credentials", "scope": "Seller_Api"},
                          auth=(config.FLIPKART_APP_ID, config.FLIPKART_APP_SECRET))
        if r.status_code != 200:
            raise FlipkartError(f"Flipkart login failed ({r.status_code}): {r.text[:200]}")
        data = r.json()
        self._token = data["access_token"]
        self._token_expiry = time.time() + int(data.get("expires_in", 3600))
        return self._token

    def request(self, method: str, url: str, **kw) -> dict:
        if url.startswith("/"):
            url = self.base + url
        for attempt in range(4):
            r = self.http.request(method, url, headers={"Authorization": f"Bearer {self.token()}"}, **kw)
            if r.status_code == 429:
                time.sleep(10 * (attempt + 1))
                continue
            if r.status_code >= 400:
                raise FlipkartError(f"{method} {url} -> {r.status_code}: {r.text[:300]}")
            return r.json() if r.content else {}
        raise FlipkartError("Flipkart kept throttling requests")

    def shipments(self, ftype: str, start: datetime, end: datetime) -> Iterator[dict]:
        body = {"filter": {"type": ftype, "states": _FILTERS[ftype],
                           "orderDate": {"from": start.isoformat(), "to": end.isoformat()}},
                "pagination": {"pageSize": 20}}
        page = self.request("POST", "/sellers/v3/shipments/filter", json=body)
        while True:
            for s in page.get("shipments", []):
                yield s
            nxt = page.get("nextPageUrl")
            if not page.get("hasMore") or not nxt:
                break
            page = self.request("GET", "/sellers" + nxt if nxt.startswith("/v3") else nxt)

    def returns(self, source: str, start: datetime, end: datetime) -> Iterator[dict]:
        params = {"source": source, "createdAfter": start.isoformat(), "createdBefore": end.isoformat()}
        page = self.request("GET", "/sellers/v2/returns", params=params)
        while True:
            for item in page.get("returnItems", page.get("returns", [])):
                yield item
            nxt = page.get("nextUrl") or page.get("nextPageUrl")
            if not page.get("hasMore") or not nxt:
                break
            page = self.request("GET", "/sellers" + nxt if nxt.startswith("/v2") else nxt)


def sync(conn, days: int = 7) -> dict:
    client = FlipkartClient()
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    n_orders, n_returns, seen, errors = 0, 0, [], []
    for ftype in _FILTERS:
        try:
            for shipment in client.shipments(ftype, start, end):
                for item in shipment.get("orderItems", []):
                    price = item.get("priceComponents") or {}
                    amount = parse_money(price.get("totalPrice") or price.get("customerPrice")
                                         or price.get("sellingPrice"))
                    psku = clean_sku(item.get("sku"))
                    save_order(conn, platform="flipkart", order_id=str(item.get("orderId")),
                               item_id=str(item.get("orderItemId") or item.get("orderId")),
                               order_date=parse_date(item.get("orderDate")) or end.date().isoformat(),
                               platform_sku=psku, qty=int(item.get("quantity") or 1), sale_amount=amount,
                               status=normalize_status(item.get("status") or ftype),
                               product_name=str(item.get("title") or ""), source="api")
                    seen.append((psku, item.get("title")))
                    n_orders += 1
        except FlipkartError as e:
            errors.append(f"{ftype}: {e}")
    for source in ("customer_return", "courier_return"):
        try:
            for ret in client.returns(source, start, end):
                save_return(conn, platform="flipkart", order_id=str(ret.get("orderId")),
                            item_id=str(ret.get("orderItemId") or ""),
                            return_date=parse_date(ret.get("createdDate") or ret.get("returnRequestDate"))
                            or end.date().isoformat(),
                            platform_sku=clean_sku(ret.get("sku")), qty=int(ret.get("quantity") or 1),
                            return_type="rto" if source == "courier_return" else "customer",
                            reason=str(ret.get("reason") or "")[:200], source="api")
                n_returns += 1
        except FlipkartError as e:
            errors.append(f"{source}: {e}")
    ensure_products(conn, seen)
    if errors and not n_orders:
        raise FlipkartError("; ".join(errors))
    return {"orders": n_orders, "returns": n_returns, "warnings": errors}
