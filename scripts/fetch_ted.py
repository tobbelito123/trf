#!/usr/bin/env python3
import requests, json, os

url = "https://api.ted.europa.eu/v3/notices/search"

# En helt basic query: allt från Sverige, max 5
body = {
    "searchCriteria": {
        "countries": ["SE"]
    },
    "pageSize": 5,
    "pageNum": 1,
    "sortedBy": "publicationDate",
    "order": "desc"
}

r = requests.post(url, json=body, timeout=40)
r.raise_for_status()

data = r.json()

os.makedirs("data", exist_ok=True)
with open("data/ted.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Fetched", data.get("total", "?"), "records")
