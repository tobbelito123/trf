#!/usr/bin/env python3
import json, os, time
import requests

URL = "https://api.ted.europa.eu/v3/notices/search"

# Byt gärna till stadssökning om du vill:
QUERY = '(buyer-city="Göteborg" OR buyer-city="Stockholm" OR buyer-city="Malmö") AND PD>=today(-90)'
# QUERY = 'buyer-country="SWE" AND PD>=today(-90)'

BODY = {
    "query": QUERY,
    "fields": [
    "ND","TI","PD","links","buyer-city",
    "total-value","total-value-cur",
    "result-value-notice","result-value-cur-notice",
    "estimated-value-glo","estimated-value-cur-glo",

    # --- DEADLINE-fält som faktiskt stöds (på lot-nivå) ---
    "deadline-receipt-tender-date-lot",
    "deadline-receipt-tender-time-lot",
    "deadline-date-lot",
        "organisation-name-buyer",
    "deadline-time-lot",
        "classification-cpv",
"main-classification-lot",
    "deadline-receipt-answers-date-lot",
    "deadline-receipt-answers-time-lot",
    "deadline-receipt-request-date-lot",
    "deadline-receipt-request-time-lot",
        "document-url-lot",
"submission-url-lot"
],
    "limit": 250,
    "page": 1,
    "scope": "ALL",
    "checkQuerySyntax": False,
    "paginationMode": "PAGE_NUMBER"
}
HEADERS = {"Accept": "application/json", "Content-Type": "application/json"}

def fetch_page(page: int):
    body = dict(BODY); body["page"] = page
    r = requests.post(URL, headers=HEADERS, json=body, timeout=60)
    if not r.ok:
        print("Status:", r.status_code)
        print("Response text:", r.text)
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
        if len(notices) < BODY["limit"]:
            break
        page += 1

    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "query": QUERY,
        "count": len(all_notices),
        "notices": all_notices
    }
    with open("data/ted.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"OK: saved {len(all_notices)} notices to data/ted.json")

if __name__ == "__main__":
    main()
