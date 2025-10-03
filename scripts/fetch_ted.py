#!/usr/bin/env python3
import argparse, json, os, sys, time
from datetime import datetime, timedelta, timezone
import requests

"""
Hämtar publicerade notices från TED v3 Search API och sparar till data/ted.json.
Byggt för körning i GitHub Actions (build-time fetch).
"""

API = "https://api.ted.europa.eu/v3/notices/search"

def iso_utc(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

def fetch_page(query, page_num=1, page_size=100):
    body = {
        # Expert query. Landfilter + publiceringsdatum. Justera efter behov.
        "q": query,
        "pageNum": page_num,
        "pageSize": page_size,
        "sort": "publicationDate,desc",
        # "fields": [...]  # låt API:t returnera standardfält
    }
    r = requests.post(API, json=body, timeout=40)
    r.raise_for_status()
    return r.json()

def normalize(item):
    # Plocka vanliga fält defensivt (fält kan variera)
    title = (
        item.get("title", {}).get("text")
        or item.get("title")
        or item.get("TI")
        or "Untitled"
    )
    buyer = (
        (item.get("buyer") or {}).get("name")
        or item.get("buyerName")
        or item.get("BN")
        or "Unknown buyer"
    )
    pub = item.get("publicationDate") or item.get("PD") or ""
    deadline = item.get("deadlineDate") or item.get("DD") or ""
    value = (
        (item.get("estimatedValue") or {}).get("value")
        or item.get("EVV")
        or None
    )
    currency = (
        (item.get("estimatedValue") or {}).get("currency")
        or item.get("EVC")
        or None
    )
    cpv = item.get("cpvCodes") or item.get("CPV") or []
    nuts = item.get("nuts") or item.get("NUTS") or []
    nd = item.get("ND") or item.get("noticeId") or None
    ted_url = (
        item.get("viewUrl")
        or item.get("url")
        or (f"https://ted.europa.eu/en/notice/-/detail/{nd}" if nd else None)
    )

    return {
        "noticeId": nd,
        "title": title,
        "buyer": buyer,
        "publicationDate": pub,
        "deadline": deadline,
        "estimatedValue": value,
        "currency": currency,
        "cpv": cpv,
        "nuts": nuts,
        "tedUrl": ted_url,
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--country", default="SE")
    ap.add_argument("--days", type=int, default=7, help="hur många dagar bakåt")
    ap.add_argument("--max", type=int, default=300, help="max antal notices att hämta")
    ap.add_argument("--out", default="data/ted.json")
    args = ap.parse_args()

    since = datetime.utcnow() - timedelta(days=args.days)
    # TED expert query: land + publicerad efter datum
    q = f'country:{args.country} AND publicationDate>={since.date().isoformat()}'

    results = []
    page = 1
    page_size = 100
    fetched = 0

    while fetched < args.max:
        data = fetch_page(q, page_num=page, page_size=min(page_size, args.max - fetched))
        items = (
            data.get("results")
            or data.get("items")
            or (data if isinstance(data, list) else [])
        )
        if not items:
            break

        for it in items:
            results.append(normalize(it))
        fetched += len(items)
        page += 1
        if len(items) < page_size:
            break
        time.sleep(0.2)  # artig paus

    payload = {
        "fetchedAt": iso_utc(datetime.utcnow()),
        "count": len(results),
        "country": args.country,
        "sinceDate": since.date().isoformat(),
        "notices": results,
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(results)} notices to {args.out}")

if __name__ == "__main__":
    main()
