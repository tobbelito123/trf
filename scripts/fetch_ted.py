#!/usr/bin/env python3
import requests, json, os

URL = "https://api.ted.europa.eu/v3/notices/search"

# Expert query: CY = country (SE = Sverige)
body = {
    "query": "CY=SE",
    "fields": ["ND","TI","PD","DD","CY","AA","OC","TD"],
    "limit": 20,
    "sort": ["-PD"]  # senaste först (PD = publicationDate)
}

r = requests.post(URL, json=body, timeout=60)
if not r.ok:
    print("Status:", r.status_code, r.reason)
    print("Response text:", r.text[:1500])
    r.raise_for_status()

data = r.json()
os.makedirs("data", exist_ok=True)
with open("data/ted.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Fetched total:", data.get("total"), "returned:", len(data.get("results", [])))
