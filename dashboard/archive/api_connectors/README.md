# Parked: direct API connectors (not used right now)

The owner chose to run all data collection through n8n (Sep 2026), so these
modules are disconnected from the app. They are kept only so they can be
brought back later:

- amazon_api.py  – Amazon SP-API via Reports API (orders, returns, settlements)
- flipkart_api.py – Flipkart Marketplace API v3 (shipments, returns)
- listings.py    – server-side price/rating page reader
- sync.py        – the old in-app daily scheduler job

To re-enable, move them back under app/ (ingest/ for the first three) and
re-add the scheduler in app/main.py.
