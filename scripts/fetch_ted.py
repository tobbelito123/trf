#!/usr/bin/env python3
import requests, json, os

URL = "https://api.ted.europa.eu/v3/notices/search"

body = {
    "query": "buyer-country=SE",
    "limit": 5
}

r = requests.post(URL, json=body, timeout=60)

# Om fel, printa svaret från TED
if not r.ok:
    print("Status:", r.status_code, r.reason)
    print("Response text:", r.text[:1000])
    r.raise_for_status()

data = r.json()

os.makedirs("data", exist_ok=True)
with open("data/ted.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Fetched total:", data.get("total"), "returned:", len(data.get("results", [])))
