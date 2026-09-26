"""Watch listing pages: your own (rating + review count) and competitors' (price).

This is best-effort. Amazon and Flipkart often block automated page reads, so
every value can also be typed in by hand from the dashboard. A failed read never
breaks anything - it just means "no new number today".
"""
from __future__ import annotations

import json
import re
from datetime import date
from typing import Optional

import httpx

from ..ingest.common import parse_money

_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/128.0 Safari/537.36"),
    "Accept-Language": "en-IN,en;q=0.9",
}


def _from_jsonld(html: str) -> dict:
    out = {}
    for block in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, re.S | re.I):
        try:
            data = json.loads(block.strip())
        except ValueError:
            continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            if not isinstance(it, dict):
                continue
            offers = it.get("offers")
            if isinstance(offers, list) and offers:
                offers = offers[0]
            if isinstance(offers, dict) and "price" not in out and offers.get("price"):
                out["price"] = parse_money(offers.get("price"))
            agg = it.get("aggregateRating")
            if isinstance(agg, dict):
                if agg.get("ratingValue"):
                    out.setdefault("rating", float(parse_money(agg["ratingValue"])))
                cnt = agg.get("reviewCount") or agg.get("ratingCount")
                if cnt:
                    out.setdefault("review_count", int(parse_money(cnt)))
    return out


def parse_listing(html: str) -> dict:
    out = _from_jsonld(html)
    if "price" not in out:
        m = (re.search(r'<meta[^>]+(?:product:price:amount|og:price:amount)[^>]+content="([\d.,]+)"', html)
             or re.search(r'class="a-price-whole">([\d,]+)', html)            # Amazon
             or re.search(r'"sellingPrice"\s*:\s*\{?[^}]*?"value"\s*:\s*([\d.]+)', html)  # Flipkart state
             or re.search(r'₹\s?([\d,]{2,7})', html))
        if m:
            out["price"] = parse_money(m.group(1))
    if "rating" not in out:
        m = re.search(r'([0-5]\.\d) out of 5 stars', html) or re.search(r'"averageRating"\s*:\s*([0-5](?:\.\d+)?)', html)
        if m:
            out["rating"] = float(m.group(1))
    if "review_count" not in out:
        m = re.search(r'([\d,]+) (?:global )?ratings', html) or re.search(r'"ratingCount"\s*:\s*(\d+)', html)
        if m:
            out["review_count"] = int(parse_money(m.group(1)))
    return out


def fetch(url: str) -> Optional[dict]:
    try:
        r = httpx.get(url, headers=_HEADERS, timeout=25, follow_redirects=True)
    except httpx.HTTPError:
        return None
    if r.status_code != 200 or "captcha" in r.text[:5000].lower():
        return None
    data = parse_listing(r.text)
    return data or None


def refresh_all(conn) -> dict:
    ok, failed = 0, 0
    today = date.today().isoformat()
    for row in conn.execute("SELECT id, url FROM listings WHERE active = 1 AND url IS NOT NULL AND url != ''").fetchall():
        data = fetch(row["url"])
        if not data:
            failed += 1
            continue
        conn.execute(
            """INSERT INTO listing_snapshots(listing_id, day, price, rating, review_count, source)
               VALUES(?,?,?,?,?,'auto')
               ON CONFLICT(listing_id, day) DO UPDATE SET
                 price=COALESCE(excluded.price, listing_snapshots.price),
                 rating=COALESCE(excluded.rating, listing_snapshots.rating),
                 review_count=COALESCE(excluded.review_count, listing_snapshots.review_count)
               WHERE listing_snapshots.source != 'manual'""",
            (row["id"], today, data.get("price"), data.get("rating"), data.get("review_count")),
        )
        ok += 1
    return {"updated": ok, "blocked_or_failed": failed}
