#!/usr/bin/env python3
import json, os, sys, time
import requests

URL = "https://api.ted.europa.eu/v3/notices/search"

# ← EXACTLY the same expert query you ran in Swagger
QUERY = 'buyer-country="SWE" AND PD>=today(-365)'

BODY = {
    "query": QUERY,
    "fields": ["ND", "TI", "PD"],  # RI often carries links
    "limit": 10,         # pull more per page if you want
    "page": 1,
    "scope": "ALL",
    "checkQuerySyntax": False
}

HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
}

def fetch_page(page):
    BODY["page"] = page
    r = requests.post(URL, headers=HEADERS, json=BODY, timeout=40)
    # If something goes wrong, show what the API replied (helps a ton)
    if not r.ok:
        print("Status:", r.status_code)
        try:
            print("Response text:", r.text)
        except Exception:
            pass
    r.raise_for_status()
    return r.json()

def main():
    os.makedirs("data", exist_ok=True)
    all_notices = []
    page = 1

    while True:
        data = fetch_page(page)
        notices = data.get("notices") or []
        all_notices.extend(notices)
        # stop when we got fewer than requested (no more pages)
        if len(notices) < BODY["limit"]:
            break
        page += 1
        time.sleep(0.5)  # be polite

    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "query": QUERY,
        "count": len(all_notices),
        "notices": all_notices,
    }

    with open("data/ted.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"OK: saved {len(all_notices)} notices to data/ted.json")

if __name__ == "__main__":
    main()
