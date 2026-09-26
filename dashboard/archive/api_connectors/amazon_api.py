"""Amazon Selling Partner API (India) connector.

We use the Reports API for everything: it returns the same flat files you can
download by hand from Seller Central, so the exact same parsers handle both
automatic pulls and manual uploads. (It also avoids the Orders API v0, which
Amazon removes on 27 Mar 2027.)

Needs a private "self-authorised" SP-API app:
  Seller Central -> Apps and Services -> Develop Apps -> add app -> authorise
  -> copy LWA client id / secret + refresh token into the environment.
Since Oct 2023 SP-API no longer needs AWS IAM signing - just the LWA token.
"""
from __future__ import annotations

import gzip
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import httpx

from .. import config, db
from . import files

REPORTS_BASE = "/reports/2021-06-30"


class AmazonError(RuntimeError):
    pass


def is_configured() -> bool:
    return bool(config.AMAZON_LWA_CLIENT_ID and config.AMAZON_LWA_CLIENT_SECRET and config.AMAZON_REFRESH_TOKEN)


class AmazonClient:
    def __init__(self):
        self.http = httpx.Client(base_url=config.AMAZON_ENDPOINT, timeout=60)
        self._token: Optional[str] = None
        self._token_expiry = 0.0

    def token(self) -> str:
        if self._token and time.time() < self._token_expiry - 60:
            return self._token
        r = httpx.post("https://api.amazon.com/auth/o2/token", data={
            "grant_type": "refresh_token",
            "refresh_token": config.AMAZON_REFRESH_TOKEN,
            "client_id": config.AMAZON_LWA_CLIENT_ID,
            "client_secret": config.AMAZON_LWA_CLIENT_SECRET,
        }, timeout=30)
        if r.status_code != 200:
            raise AmazonError(f"Amazon login failed ({r.status_code}): {r.text[:200]}. "
                              "Refresh token may have expired - re-authorise the app in Seller Central.")
        data = r.json()
        self._token = data["access_token"]
        self._token_expiry = time.time() + int(data.get("expires_in", 3600))
        return self._token

    def request(self, method: str, path: str, **kw) -> dict:
        for attempt in range(5):
            r = self.http.request(method, path, headers={"x-amz-access-token": self.token()}, **kw)
            if r.status_code == 429:  # throttled - back off and retry
                time.sleep(min(60, 5 * (attempt + 1) ** 2))
                continue
            if r.status_code >= 400:
                raise AmazonError(f"{method} {path} -> {r.status_code}: {r.text[:300]}")
            return r.json() if r.content else {}
        raise AmazonError(f"{method} {path} kept getting throttled by Amazon")

    # --- reports ------------------------------------------------------------
    def create_report(self, report_type: str, start: datetime, end: Optional[datetime] = None) -> str:
        body = {"reportType": report_type, "marketplaceIds": [config.AMAZON_MARKETPLACE_ID],
                "dataStartTime": start.isoformat()}
        if end:
            body["dataEndTime"] = end.isoformat()
        return self.request("POST", f"{REPORTS_BASE}/reports", json=body)["reportId"]

    def wait_report(self, report_id: str, timeout_s: int = 900) -> Optional[str]:
        """Returns the document id, or None if Amazon says there is no data."""
        deadline = time.time() + timeout_s
        while time.time() < deadline:
            rep = self.request("GET", f"{REPORTS_BASE}/reports/{report_id}")
            status = rep.get("processingStatus")
            if status == "DONE":
                return rep["reportDocumentId"]
            if status == "CANCELLED":  # Amazon's way of saying "no rows for this period"
                return None
            if status == "FATAL":
                raise AmazonError(f"Amazon could not build report {rep.get('reportType')}")
            time.sleep(20)
        raise AmazonError("Timed out waiting for Amazon report")

    def download(self, document_id: str, suffix: str = ".tsv") -> Path:
        doc = self.request("GET", f"{REPORTS_BASE}/documents/{document_id}")
        r = httpx.get(doc["url"], timeout=120)
        r.raise_for_status()
        content = r.content
        if doc.get("compressionAlgorithm") == "GZIP":
            content = gzip.decompress(content)
        tmp = Path(tempfile.mkstemp(prefix="amazon_", suffix=suffix)[1])
        tmp.write_bytes(content)
        return tmp

    def list_reports(self, report_type: str, created_since: datetime) -> list:
        params = {"reportTypes": report_type, "processingStatuses": "DONE",
                  "createdSince": created_since.isoformat(), "pageSize": 100}
        return self.request("GET", f"{REPORTS_BASE}/reports", params=params).get("reports", [])


def _import_report(conn, client: AmazonClient, report_type: str, report_key: str,
                   start: datetime, end: Optional[datetime] = None) -> int:
    doc = client.wait_report(client.create_report(report_type, start, end))
    if not doc:
        return 0
    path = client.download(doc)
    try:
        return sum(r.rows for r in files.import_file(conn, path, report_key=report_key))
    finally:
        path.unlink(missing_ok=True)


def sync(conn, days: int = 3) -> dict:
    """Pull the last few days (updates to older orders show up via last-update date)."""
    client = AmazonClient()
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    counts = {}
    counts["orders"] = _import_report(conn, client, "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_LAST_UPDATE_GENERAL",
                                      "amazon_orders", start)
    counts["returns"] = _import_report(conn, client, "GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE",
                                       "amazon_returns", now - timedelta(days=max(days, 7)))
    if config.env_bool("AMAZON_FBA"):
        counts["fba_returns"] = _import_report(conn, client, "GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA",
                                               "amazon_returns", now - timedelta(days=max(days, 7)))
    # Settlement reports are created by Amazon itself every ~2 weeks; import any we haven't seen.
    done = set(filter(None, db.kv_get(conn, "amazon_settlements_done").split(",")))
    n = 0
    for rep in client.list_reports("GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2", now - timedelta(days=60)):
        if rep["reportId"] in done:
            continue
        path = client.download(rep["reportDocumentId"])
        try:
            n += sum(r.rows for r in files.import_file(conn, path, report_key="amazon_settlement"))
        finally:
            path.unlink(missing_ok=True)
        done.add(rep["reportId"])
    db.kv_set(conn, "amazon_settlements_done", ",".join(sorted(done)[-200:]))
    counts["settlement_rows"] = n
    return counts
