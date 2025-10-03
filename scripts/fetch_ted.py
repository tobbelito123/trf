#!/usr/bin/env python3
import requests, json, os

URL = "https://api.ted.europa.eu/v3/notices/search"

# Expert query: CY = country (SE = Sverige)
body = {
    "query": "CY=SE",
    "limit": 20,  # hur många poster du vill hämta
    "fields": [
        "ND",  # Notice ID
        "TI",  # Title
        "PD",  # Publication Date
        "DD",  # Deadline Date
        "CY",  # Country
        "AA",  # Contracting authority
        "TD",  # Short description (Text Description)
        "OC",  # Main CPV
        "RP"   # Procedure type (om tillgängligt)
    ],
    "paginationMode": "ITERATION",
    "order": "desc",
    "sortedBy": "PD"  # sortera på publiceringsdatum
}

r = requests.post(URL, json=body, timeout=60)

# Visa tydligt fel från API:t om något blir fel
if not r.ok:
    print("Status:", r.status_code, r.reason)
    print("Response text:", r.text[:1500])
    r.raise_for_status()

data = r.json()

os.makedirs("data", exist_ok=True)
with open("data/ted.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Fetched total:", data.get("total"), "returned:", len(data.get("results", [])))
