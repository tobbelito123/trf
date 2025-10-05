#!/usr/bin/env python3
import requests, json, os

URL = "https://api.ted.europa.eu/v3/notices/search"

# Minimal valid query that returns recent notices
body = {
    "query": "ND>0",   # just asks for any notice ID > 0
    "fields": ["ND", "TI", "PD"],
    "limit": 5
}

r = requests.post(URL, json=body, timeout=60)
print("Status:", r.status_code)
if not r.ok:
    print("Response text:", r.text[:1000])
    r.raise_for_status()

data = r.json()

os.makedirs("data", exist_ok=True)
with open("data/ted.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Fetched:", len(data.get("results", [])), "records")
