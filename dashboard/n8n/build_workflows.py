"""Generates the importable n8n workflow files in this folder.

    python3 n8n/build_workflows.py

Edit PAGES below (or the "Pages ki list" node inside n8n) when a panel URL changes.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

HERE = Path(__file__).parent
import os
# Dashboard address: the online one once deployed (PN_DASHBOARD_URL=https://dashboard.purenutrix.in python3 n8n/build_workflows.py)
DASH = os.environ.get("PN_DASHBOARD_URL", "http://127.0.0.1:8765").rstrip("/")
READER = "http://127.0.0.1:3100"    # panel-reader on this Mac
DASH_CRED = {"httpHeaderAuth": {"id": "pnDashboardTok1", "name": "PureNutrix Dashboard"}}
TG_CRED = {"telegramApi": {"id": "pnTelegramBot01", "name": "PureNutrix Telegram Bot"}}
CHAT_ID = "APNA_TELEGRAM_CHAT_ID"
LOGIN_IDS = {"Amazon login": "pnAmazonLogin01", "Flipkart login": "pnFlipkartLogin", "Meesho login": "pnMeeshoLogin01"}

# Read-only pages n8n opens every morning (in the PureNutrix Chrome profile).
PAGES = {  # checked in the logged-in panels on 26 Sep 2026
    "amazon": [
        {"page_kind": "orders", "url": "https://sellercentral.amazon.in/orders-v3/mfn/pending/easyship?page=1"},
        {"page_kind": "orders", "url": "https://sellercentral.amazon.in/orders-v3/mfn/unshipped/easyship?page=1"},
        {"page_kind": "orders", "url": "https://sellercentral.amazon.in/orders-v3/mfn/shipped/easyship/handover-ready?page=1"},
        {"page_kind": "orders", "url": "https://sellercentral.amazon.in/orders-v3/mfn/shipped/easyship/handover-done?page=1"},
        {"page_kind": "orders", "url": "https://sellercentral.amazon.in/orders-v3/mfn/shipped/easyship/handover-done?page=2"},
        {"page_kind": "orders", "url": "https://sellercentral.amazon.in/orders-v3/mfn/canceled/easyship?page=1"},
        {"page_kind": "returns", "url": "https://sellercentral.amazon.in/gp/returns/list/v2"},
        {"page_kind": "payments", "url": "https://sellercentral.amazon.in/payments/dashboard/index.html"},
    ],
    "flipkart": [
        {"page_kind": "orders", "url": "https://seller.flipkart.com/index.html#dashboard/active-orders?query=%7B%22activeShipmentTile%22%3A%22inTransit%22%7D"},
        {"page_kind": "returns", "url": "https://seller.flipkart.com/index.html#dashboard/returns"},
        {"page_kind": "ads", "url": "https://seller.flipkart.com/index.html#dashboard/ads/campaigns"},
    ],
    "meesho": [  # "jpsyo" = your Meesho supplier id in the panel address
        {"page_kind": "orders", "url": "https://supplier.meesho.com/panel/v3/new/fulfillment/jpsyo/orders/pending"},
        {"page_kind": "orders", "url": "https://supplier.meesho.com/panel/v3/new/fulfillment/jpsyo/orders/ready-to-ship"},
        {"page_kind": "orders", "url": "https://supplier.meesho.com/panel/v3/new/fulfillment/jpsyo/orders/shipped"},
        {"page_kind": "orders", "url": "https://supplier.meesho.com/panel/v3/new/fulfillment/jpsyo/orders/cancelled"},
        {"page_kind": "returns", "url": "https://supplier.meesho.com/panel/v3/new/fulfillment/jpsyo/returns/overview"},
        {"page_kind": "returns", "url": "https://supplier.meesho.com/panel/v3/new/fulfillment/jpsyo/returns/returnTracking-intransit"},
        {"page_kind": "payments", "url": "https://supplier.meesho.com/panel/v3/new/payouts/jpsyo/payments"},
    ],
}

_x = 0


def node(name, ntype, version, params, **extra):
    global _x
    _x += 240
    n = {"id": str(uuid.uuid5(uuid.NAMESPACE_URL, "purenutrix/" + name)), "name": name, "type": ntype,
         "typeVersion": version, "position": [_x, 300], "parameters": params}
    n.update(extra)
    return n


def http(name, method, url, body_expr=None, cred=None, **extra):
    p = {"method": method, "url": ("=" + url) if "{{" in url else url, "options": {"timeout": 600000}}
    if cred == "dash":
        p.update({"authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth"})
        extra["credentials"] = DASH_CRED
    elif cred:
        p.update({"authentication": "genericCredentialType", "genericAuthType": "httpCustomAuth"})
        extra["credentials"] = {"httpCustomAuth": {"id": LOGIN_IDS[cred], "name": cred}}
    if body_expr:
        p.update({"sendBody": True, "specifyBody": "json", "jsonBody": body_expr})
    return node(name, "n8n-nodes-base.httpRequest", 4.2, p, **extra)


def code(name, js, **extra):
    return node(name, "n8n-nodes-base.code", 2, {"jsCode": js}, **extra)


def schedule(name, cron):
    return node(name, "n8n-nodes-base.scheduleTrigger", 1.2,
                {"rule": {"interval": [{"field": "cronExpression", "expression": cron}]}})


TELEGRAM_NODES = set()


def telegram(name, text_expr, **extra):
    TELEGRAM_NODES.add(name)
    # Error output goes nowhere: a failed send leaves the alerts "unsent", so the next run retries them.
    extra.setdefault("onError", "continueErrorOutput")
    return node(name, "n8n-nodes-base.telegram", 1.2,
                {"chatId": CHAT_ID, "text": text_expr, "additionalFields": {"appendAttribution": False}},
                credentials=TG_CRED, **extra)


def chain(*names):
    # Telegram nodes have [success, error] outputs; only the success output continues.
    return {a: {"main": [[{"node": b, "type": "main", "index": 0}]] + ([[]] if a in TELEGRAM_NODES else [])}
            for a, b in zip(names, names[1:])}


def workflow(wid, name, nodes, connections):
    return {"id": wid, "name": name, "nodes": nodes, "connections": connections, "active": False,
            "settings": {"executionOrder": "v1", "timezone": "Asia/Kolkata", "saveManualExecutions": True},
            "pinData": {}}


def daily():
    global _x
    _x = 0
    pages_js = f"""// Kal ka din (IST) aur har platform ke pages. URL badle to yahan theek karo.
const d = new Date(Date.now() + 5.5 * 3600 * 1000 - 24 * 3600 * 1000);
const day = d.toISOString().slice(0, 10);
const PAGES = {json.dumps(PAGES, indent=2)};
const out = {{ day }};
for (const [platform, pages] of Object.entries(PAGES)) {{
  out[platform] = {{ platform, day, wait_ms: 3000, pages }};
}}
return [{{ json: out }}];"""
    listings_js = """// Apni listing (rating) aur competitor (price) ke URL dashboard se aate hain.
const snap = $input.first().json;
const cfg = $('Pages ki list').first().json;
const pages = (snap.listings || []).filter(l => l.url).map(l => ({ page_kind: 'listing', url: l.url, listing_id: l.id }));
return [{ json: { ...cfg, listings: { platform: 'listings', day: cfg.day, wait_ms: 2000, pages } } }];"""
    collect_js = """// Chaaron readers ke pages ek list me. Reader fail hua to har page ke liye error bhejo.
const cfg = $('Listings jodo').first().json;
const readers = { amazon: 'Amazon padho', flipkart: 'Flipkart padho', meesho: 'Meesho padho', listings: 'Listings padho' };
const items = [];
for (const [platform, nodeName] of Object.entries(readers)) {
  let res;
  try { res = $(nodeName).first().json; } catch (e) { res = { error: 'reader did not run' }; }
  if (res && Array.isArray(res.pages)) {
    for (const p of res.pages) items.push({ json: p });
  } else {
    const msg = (res && (res.error && (res.error.message || res.error))) || 'panel-reader not reachable';
    for (const p of cfg[platform].pages) items.push({ json: { ...p, platform, day: cfg.day, error: String(msg).slice(0, 300) } });
  }
}
return items;"""
    message_js = """const r = $input.first().json;
const lines = ['🤖 PureNutrix — roz ki jaanch', r.summary || ''];
if (r.alerts && r.alerts.count) lines.push('', r.alerts.text);
return [{ json: { text: lines.join('\\n').slice(0, 4000), ids: (r.alerts && r.alerts.ids) || [] } }];"""
    reader_body = lambda p: "={{ JSON.stringify({ config: $('Listings jodo').first().json." + p + " }) }}"
    once = {"executeOnce": True}
    tolerant = {"executeOnce": True, "onError": "continueRegularOutput", "alwaysOutputData": True}
    nodes = [
        schedule("Roz subah 6:30", "30 6 * * *"),
        code("Pages ki list", pages_js),
        http("Dashboard: kya pehle se hai", "GET", DASH + "/api/agent/snapshot?day={{ $json.day }}", cred="dash", **once),
        code("Listings jodo", listings_js),
        http("Amazon padho", "POST", READER + "/read", reader_body("amazon"), cred="Amazon login", **tolerant),
        http("Flipkart padho", "POST", READER + "/read", reader_body("flipkart"), cred="Flipkart login", **tolerant),
        http("Meesho padho", "POST", READER + "/read", reader_body("meesho"), cred="Meesho login", **tolerant),
        http("Listings padho", "POST", READER + "/read", reader_body("listings"), **tolerant),
        code("Sab pages ek list me", collect_js),
        http("Dashboard ko page bhejo", "POST", DASH + "/api/agent/page", "={{ JSON.stringify($json) }}", cred="dash",
             onError="continueRegularOutput", alwaysOutputData=True),
        http("Jaanch khatam", "POST", DASH + "/api/agent/finish",
             "={{ JSON.stringify({ day: $('Pages ki list').first().json.day }) }}", cred="dash", **once),
        code("Message banao", message_js),
        telegram("Telegram bhejo", "={{ $json.text }}"),
        http("Alerts bhej diye", "POST", DASH + "/api/agent/alerts/sent",
             "={{ JSON.stringify({ ids: $('Message banao').first().json.ids }) }}", cred="dash", **once),
    ]
    names = [n["name"] for n in nodes]
    manual = node("Abhi chalao (test)", "n8n-nodes-base.manualTrigger", 1, {})
    manual["position"] = [240, 520]
    nodes.append(manual)
    conns = chain(*names)
    conns["Abhi chalao (test)"] = {"main": [[{"node": "Pages ki list", "type": "main", "index": 0}]]}
    return workflow("pnDailyPanelRun1", "PureNutrix — roz subah panel se data", nodes, conns)


def alerts_reports():
    global _x
    _x = 0
    only_if_any = """const a = $input.first().json;
if (!a.count) return [];           // koi naya alert nahi -> kuch mat bhejo
return [{ json: a }];"""
    nodes = [
        schedule("Har 3 ghante", "15 */3 * * *"),
        http("Naye alerts", "GET", DASH + "/api/agent/alerts", cred="dash"),
        code("Koi alert hai?", only_if_any),
        telegram("Alert bhejo", "={{ $json.text }}"),
        http("Alerts bhej diye", "POST", DASH + "/api/agent/alerts/sent", "={{ JSON.stringify({ ids: $('Koi alert hai?').first().json.ids }) }}",
             cred="dash", executeOnce=True),
        schedule("Somvaar subah 9", "0 9 * * 1"),
        http("Hafte ki report", "GET", DASH + "/api/agent/report?kind=week", cred="dash"),
        telegram("Hafte ki report bhejo", "={{ $json.text }}"),
        schedule("Mahine ki 1 tareekh", "30 9 1 * *"),
        http("Mahine ki report", "GET", DASH + "/api/agent/report?kind=month", cred="dash"),
        telegram("Mahine ki report bhejo", "={{ $json.text }}"),
    ]
    for i, n in enumerate(nodes):  # lay out the three flows as rows
        row = 0 if i < 5 else 1 if i < 8 else 2
        col = i if i < 5 else i - 5 if i < 8 else i - 8
        n["position"] = [240 + 260 * col, 200 + 220 * row]
    conns = {}
    conns.update(chain("Har 3 ghante", "Naye alerts", "Koi alert hai?", "Alert bhejo", "Alerts bhej diye"))
    conns.update(chain("Somvaar subah 9", "Hafte ki report", "Hafte ki report bhejo"))
    conns.update(chain("Mahine ki 1 tareekh", "Mahine ki report", "Mahine ki report bhejo"))
    return workflow("pnAlertsReports1", "PureNutrix — alerts aur reports", nodes, conns)


if __name__ == "__main__":
    for fname, wf in (("purenutrix-daily.json", daily()), ("purenutrix-alerts-reports.json", alerts_reports())):
        (HERE / fname).write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("wrote", fname, len(wf["nodes"]), "nodes")
