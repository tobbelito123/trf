#!/usr/bin/env python3
import requests, json, os, time
from datetime import datetime, timezone

API_URL = "https://api.ted.europa.eu/v3/notices/search"

# Expert query: svenska upphandlingar, senaste 365 dagarna
QUERY = 'buyer-country="SWE" AND PD>=today(-365)'

# Fält vi vill få hem (lägg gärna till fler senare vid behov)
FIELDS = ["ND", "TI", "PD", "links", "LG"]

PAGE_SIZE = 250            # max 250 enligt docs
MAX_PAGES = 60             # säkerhetsstopp (60*250=15 000 ≈ API-limit i pagination mode)

def pick_link(links, prefer_pdf=True):
    """Plocka ut vettiga länkar (pdf/html) ur 'links'-fältet."""
    pdf_url, html_url = None, None
    if isinstance(links, list):
        for l in links:
            url = l.get("url") or l.get("href") or ""
            name = (l.get("name") or l.get("type") or "").lower()
            if not url:
                continue
            if prefer_pdf and (url.lower().endswith(".pdf") or "pdf" in name) and not pdf_url:
                pdf_url = url
            if not html_url and url.lower().startswith("http"):
                html_url = url
    return pdf_url, html_url

def fetch_page(page):
    body = {
        "query": QUERY,
        "fields": FIELDS,
        "limit": PAGE_SIZE,
        "page": page,
        "scope": "ALL",
        "paginationMode": "PAGE_NUMBER",
        "checkQuerySyntax": False
    }
    r = requests.post(API_URL, json=body, timeout=60)
    # Om API:t returnerar fel, skriv ut texten för enklare felsökning
    if not r.ok:
        print("Status:", r.status_code)
        print("Response text:", r.text)
    r.raise_for_status()
    return r.json()

def normalize_item(n):
    # Titlarna kommer som språkobjekt, ex: {"swe": "...", "eng": "..."}
    ti = n.get("TI") or {}
    title_sv = ti.get("swe")
    title_fallback = (
        title_sv
        or ti.get("eng")
        or (list(ti.values())[0] if isinstance(ti, dict) and ti else None)
        or "(titel saknas)"
    )
    pdf_url, html_url = pick_link(n.get("links", []))
    return {
        "nd": n.get("ND"),
        "pd": n.get("PD"),               # publiceringsdatum (ISO)
        "title": title_fallback,         # visar svensk titel om den finns
        "has_sv": bool(title_sv),
        "pdf_url": pdf_url,
        "html_url": html_url
    }

def main():
    all_items = []
    for page in range(1, MAX_PAGES + 1):
        data = fetch_page(page)
        notices = data.get("notices") or []
        if not notices:
            break
        # Filtrera: behåll helst poster med svensk titel,
        # men inkludera även andra som fallback.
        for n in notices:
            item = normalize_item(n)
            all_items.append(item)
        # Lite snäll delay mot API:et
        time.sleep(0.2)

    out = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "query": QUERY,
        "count": len(all_items),
        "items": all_items
    }

    os.makedirs("data", exist_ok=True)
    with open("data/ted.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"OK: sparade {len(all_items)} poster till data/ted.json")

if __name__ == "__main__":
    main()
