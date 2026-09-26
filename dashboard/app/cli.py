"""Command line helpers.

    python -m app.cli import FILE [--platform meesho]
    python -m app.cli report week|month    # print the plain-language report
    python -m app.cli demo [--clear]
    python -m app.cli check                # evaluate alerts (n8n sends them)
    python -m app.cli agent snapshot [--day YYYY-MM-DD]   # what the dashboard knows for a day
    python -m app.cli agent ingest FILE.json [--dry-run]  # apply audit findings
    python -m app.cli agent queue                         # pages n8n collected, waiting for the Claude app
    python -m app.cli agent rules                         # how to read a page (rules + JSON schema)
    python -m app.cli agent apply PAGE_ID FILE.json       # save what was read from one queued page
    python -m app.cli agent finish                        # close the day's run -> audit record + alerts
"""
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from pathlib import Path

from . import alerts, audit, config, db, demo, extract, metrics
from .ingest import files


def _remote(method: str, path: str, body=None):
    """Call the online dashboard (DASHBOARD_URL) with the n8n token."""
    req = urllib.request.Request(config.DASHBOARD_URL + path, method=method,
                                 data=None if body is None else json.dumps(body).encode(),
                                 headers={"Authorization": f"Bearer {config.AUDIT_TOKEN}",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"dashboard error {e.code}: {e.read().decode()[:400]}")


def _agent_remote(args, ap) -> bool:
    if not config.DASHBOARD_URL:
        return False
    a = args.action
    if a == "snapshot":
        out = _remote("GET", "/api/agent/snapshot" + (f"?day={args.day}" if args.day else ""))
    elif a == "queue":
        out = _remote("GET", "/api/agent/queue")["items"]
    elif a == "rules":
        r = _remote("GET", "/api/agent/rules")
        print(r["rules"] + "\n\nJSON schema:\n" + json.dumps(r["schema"], indent=1))
        return True
    elif a == "apply":
        if not (args.file and args.file2):
            ap.error("agent apply PAGE_ID FILE.json")
        out = _remote("POST", f"/api/agent/apply/{int(args.file)}", json.loads(Path(args.file2).read_text(encoding="utf-8")))
    elif a == "finish":
        out = _remote("POST", "/api/agent/finish", {"day": args.day} if args.day else {})
        print(json.dumps({k: out.get(k) for k in ("audit_run_id", "summary")}, ensure_ascii=False))
        print(out["alerts"]["text"])
        return True
    elif a == "ingest":
        out = _remote("POST", "/api/agent/ingest" + ("?dry_run=true" if args.dry_run else ""),
                      json.loads(Path(args.file).read_text(encoding="utf-8")))
    else:
        return False
    print(json.dumps(out, indent=1, ensure_ascii=False))
    return True


def main() -> None:
    ap = argparse.ArgumentParser(prog="app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    p = sub.add_parser("import")
    p.add_argument("file")
    p.add_argument("--platform", choices=["amazon", "flipkart", "meesho", "purchases"])
    p.add_argument("--report", choices=list(files.REPORTS_BY_KEY))
    p = sub.add_parser("report")
    p.add_argument("kind", choices=["week", "month"])
    p = sub.add_parser("demo")
    p.add_argument("--clear", action="store_true")
    p = sub.add_parser("agent")
    p.add_argument("action", choices=["snapshot", "ingest", "queue", "rules", "apply", "finish"])
    p.add_argument("file", nargs="?")
    p.add_argument("file2", nargs="?")
    p.add_argument("--day")
    p.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    db.init_db()
    if args.cmd == "check":
        with db.session() as conn:
            print("new alerts:", alerts.evaluate(conn))
            print(alerts.pending_message(conn)["text"])
    elif args.cmd == "import":
        with db.session() as conn:
            for r in files.import_file(conn, Path(args.file), args.platform, args.report):
                print(r.as_dict())
    elif args.cmd == "report":
        with db.session() as conn:
            rep = metrics.report(conn, args.kind)
        print(rep["title"])
        print("\n".join(rep["lines"]))
    elif args.cmd == "agent":
        if _agent_remote(args, ap):
            return
        if args.action == "snapshot":
            with db.session() as conn:
                print(json.dumps(audit.snapshot(conn, args.day), indent=1, ensure_ascii=False, default=str))
        elif args.action == "queue":
            with db.session() as conn:
                print(json.dumps(extract.queued_pages(conn), indent=1, ensure_ascii=False))
        elif args.action == "rules":
            print(extract.SYSTEM)
            print("\nJSON schema:\n" + json.dumps(extract.SCHEMA, indent=1))
        elif args.action == "apply":
            if not (args.file and args.file2):
                ap.error("agent apply PAGE_ID FILE.json")
            data = json.loads(Path(args.file2).read_text(encoding="utf-8"))
            with db.session() as conn:
                print(json.dumps(extract.apply_queued(conn, int(args.file), data), indent=1, ensure_ascii=False))
        elif args.action == "finish":
            with db.session() as conn:
                out = extract.finish_run(conn, args.day)
            print(json.dumps({k: out[k] for k in ("audit_run_id", "summary")}, ensure_ascii=False))
            print(out["alerts"]["text"])
        else:
            if not args.file:
                ap.error("agent ingest needs a JSON file")
            payload = json.loads(Path(args.file).read_text(encoding="utf-8"))
            conn = db.connect()
            try:
                result = audit.ingest(conn, payload)
                if args.dry_run:
                    conn.rollback()
                    result["dry_run"] = True
                else:
                    conn.commit()
            finally:
                conn.close()
            print(json.dumps(result, indent=1, ensure_ascii=False))
    elif args.cmd == "demo":
        with db.session() as conn:
            if args.clear:
                demo.clear(conn)
                print("demo data removed")
            else:
                demo.load(conn)
                print("demo data loaded")


if __name__ == "__main__":
    main()
