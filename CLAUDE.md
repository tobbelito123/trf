# vembudar.se — content automation pipeline

This file drives the automated content-page generator. It runs unattended and pushes straight
to `main` (GitHub Pages deploys automatically from the repo root, `CNAME` sets the custom
domain `www.vembudar.se`, no build step), so there is no human review step. Follow this
exactly — don't improvise structure, and don't invent legal facts.

## What vembudar.se is

A free, no-login Swedish service listing current public-procurement tenders (upphandlingar),
pulled once a day from TED (the EU's official procurement database). Visitors filter by city,
CPV code (industry), and free text, see the deadline and value, and link straight to the tender
documents and portal. Plain static HTML site, no build step, no framework. Full product
context is in `llms.txt` at the repo root.

## Language — required

**All content must be written in Swedish.** Site language, nav, meta tags — everything. This
is a hard requirement, not a default to override per page.

## The task, each run

1. Read `content-topics.md`. Take the topmost item with `status: pending`.
2. Write one new page at `<slug>.html` in the **repo root**, using the template below.
3. Add a `<url>` entry to `sitemap.xml` (`lastmod` = today, `priority` 0.6-0.7, `changefreq`
   monthly), matching the existing entries — add it under a new `<!-- Anbudsguider (leverantörsperspektiv) -->`
   comment section if that doesn't exist yet, otherwise under it.
4. Add a line under a `## Anbudsguider` heading in `llms.txt` (create that heading, after
   `## Innehåll på siten`, if it's the first run adding one) — one line per page, matching the
   existing bullet format there.
5. **Internal linking, both directions** (inline in the prose, not just the "Läs vidare" list):
   - **Forward:** add 1-2 contextual links from the new page to genuinely related *existing*
     pages (the reference pages like `/kunskap.html`, `/ordlista.html`, `/cpv-koder.html`, or
     other already-published guides from this pipeline).
   - **Backward:** also edit 1 existing page (prefer `/kunskap.html`'s "Läs vidare" list, or
     another pipeline-written guide once more exist) to add a link *to* the new page, so it's
     reachable from somewhere other than the sitemap alone.
6. Flip that topic's status in `content-topics.md` to `published: YYYY-MM-DD`.
7. **Självväxande backlogg:** if fewer than 5 `pending` topics remain in `content-topics.md`
   after this run, add 5-8 more before finishing, following the existing format and the
   leverantörsperspektiv/"how to actually win" angle described at the top of that file. Never
   let the queue run dry.
8. Commit all of it in one commit, push to `origin main`.

## Page template

Copy the structure of `kunskap.html` exactly: same `<head>` boilerplate (CSS custom properties
block, light/dark via `prefers-color-scheme`, same header/nav-bar/hamburger-menu pattern, same
`footer`), same `<main role="article">` wrapper. The sidebar table of contents (`.toc`) is
optional — use it for longer guides (500+ words with 3+ sections), skip it for shorter,
single-topic pages. Only change per page:

- `<title>` and `<meta name="description">` — specific to the topic, description natural
  length (~150-160 chars), reads like a person wrote it.
- `<link rel="canonical">` and `og:url` — `https://vembudar.se/<slug>.html`.
- `og:title` / `og:description`.
- Body content (see style rules below), plus the internal links from step 5.
- The "Läs vidare" list at the end, pointing to genuinely related existing pages.
- Leave the `nav-links` in the header exactly as-is (don't add new items there — this
  pipeline's pages are discoverable via internal links and the sitemap, not the main nav).

## Writing style — required

This content must not read as AI-written. Concretely:

- Write in Swedish, matching the existing pages' register: direct, practical, aimed at a
  business owner or bid coordinator who wants to actually win contracts, not a bureaucratic or
  academic tone despite the legal-adjacent subject matter.
- No em dashes as clause connectors. Use periods, commas, or restructure the sentence.
- No AI-cliché phrasing translated into Swedish ("lås upp", "dyk ner i", "i dagens
  snabbrörliga värld", "det handlar inte bara om X, det handlar om Y").
- Vary sentence length and rhythm. Don't default to three-item lists everywhere.
- **Do not invent or state specific legal thresholds, deadlines, paragraph numbers, SEK
  amounts, or procedural time limits** (e.g. direktupphandlingsgränsen, överprövningsfrister,
  avtalsspärrens längd) — these change over time and get it wrong is actively harmful advice
  to someone bidding on real contracts. Where a specific figure would normally go, say the
  rule exists and point the reader to check the current figure with Upphandlingsmyndigheten
  or a legal advisor, the same way `content-topics.md`'s topic entries already flag this where
  it matters.
- Ground every practical tip in general, well-established procurement practice (read the
  kravspecifikation methodically, don't miss skallkrav, price against the actual evaluation
  model, keep a paper trail) rather than specific legal citations.
- Length: roughly 500-700 words per page, matching `kunskap.html`'s register (can run longer
  for genuinely deep topics with a TOC).

## Git

Commit message: short, describes the topic, e.g. `Add guide: skriva kvalitetsdel i anbud`.
Push directly to `main` — this is expected and intentional, that's what triggers the GitHub
Pages deploy. No PR, no branch.

## Do not touch

Don't modify `index.html`, `faq.html`, `ordlista.html`, `cpv-koder.html`,
`direktupphandling.html`, `ramavtal.html`, `jamfor-upphandlingstjanster.html`, `kontakt.html`,
`studieteknik-lou.html`, `prov-offentlig-upphandling.html`, anything under `data/`, `scripts/`,
`quiz/`, `cad/`, or `viking/`, or the site's core TED-fetching logic, as part of this pipeline.
The one exception is the single backward-link edit to `kunskap.html`'s "Läs vidare" list (or
another pipeline-written guide) described in step 5. This automation adds one new HTML file per
run at the repo root and updates `sitemap.xml`, `llms.txt`, and `content-topics.md`.
