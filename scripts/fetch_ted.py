#!/usr/bin/env python3
import json, os, time
import requests

URL = "https://api.ted.europa.eu/v3/notices/search"
QUERY = 'buyer-country="SWE" AND PD>=today(-365)'

BODY = {
    "query": QUERY,
    "fields": ["ND", "TI", "PD"],  # ta gärna med OJ/RI för länkar
    "limit": 250,                 # ↑ var 10
    "page": 1,
    "scope": "ALL",               # byt ev. till "ACTIVE" för färre resultat
    "checkQuerySyntax": False
}
HEADERS = {"Accept": "application/json", "Content-Type": "application/json"}

def fetch_page(page):
    body = dict(BODY); body["page"] = page
    r = requests.post(URL, headers=HEADERS, json=body, timeout=60)
    if not r.ok:
        print("Status:", r.status_code); print("Response text:", r.text)
    r.raise_for_status()
    return r.json()

def main():
    os.makedirs("data", exist_ok=True)
    all_notices, page = [], 1
    while True:
        data = fetch_page(page)
        notices = data.get("notices") or []
        all_notices.extend(notices)
        if len(notices) < BODY["limit"]:
            break
        page += 1   # ingen sleep
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
