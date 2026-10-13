const listEl   = document.getElementById('list');
const countEl  = document.getElementById('count');
const updEl    = document.getElementById('updated');
const onlySvEl = document.getElementById('onlySv');
const qEl      = document.getElementById('q');
const pills    = Array.from(document.querySelectorAll('.chip'));
const cpvEl    = document.getElementById('cpvFilter');
const sortEl   = document.getElementById('sortOrder');
const resetBtn = document.getElementById('resetFilters');
const emptyEl  = document.getElementById('emptyState');
const emptyResetBtn = document.getElementById('emptyReset');

let items = [];
let view  = [];
let activeCity = 'ALLA';
let activeCpv  = 'ALL';
let sortMode   = 'published';

// ********** NYTT TILLSTÅND FÖR "LADDA FLER" **********
const ITEMS_PER_LOAD = 50; // Antal kort som visas per laddning
let loadedCount = ITEMS_PER_LOAD; // Börja med att visa en full laddning
// *******************************************************


function fmtDate(pd) {
  if (!pd) return "okänt datum";
  if (/^\d{4}-\d{2}-\d{2}/.test(pd)) return pd.slice(0,10);
  try { return new Date(pd).toLocaleDateString('sv-SE', {year:'numeric', month:'short', day:'2-digit'}); }
  catch { return pd; }
}
// ADD: normalize PD → milliseconds (handles "YYYY-MM-DD+HH:MM" too)
function pdToMillis(pd){
  if (!pd) return 0;
  if (/^\d{4}-\d{2}-\d{2}T/.test(pd)) return Date.parse(pd);             // ISO
  if (/^\d{4}-\d{2}-\d{2}\+\d{2}:\d{2}$/.test(pd)) {                    // "2025-07-08+02:00"
    const [d, off] = pd.split('+');
    return Date.parse(`${d}T00:00:00+${off}`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(pd)) return Date.parse(`${pd}T00:00:00Z`);  // date only
  const t = Date.parse(pd);
  return isNaN(t) ? 0 : t;
}
// Deadline-strängar kan se ut som "2026-05-15 00:00:00+02:00" eller sakna tid helt.
// Saknad deadline sorteras sist när vi sorterar "snarast först".
// TED skickar datum och tid som listor med tidszon, så strängen blir t.ex. "2026-08-30Z 21:59:59Z"
// eller "2026-09-03Z,2026-09-03Z 21:59:59Z,21:59:59Z". Första datumet och första tiden gäller.
function deadlineToMillis(dl){
  if (!dl) return Infinity;
  const [datePart, timePart = ''] = String(dl).split(' ');
  const d = datePart.match(/\d{4}-\d{2}-\d{2}/);
  if (!d) return Infinity;
  const tm = timePart.match(/(\d{2}:\d{2}(?::\d{2})?)(Z|[+-]\d{2}:\d{2})?/);
  const zone = (tm && tm[2]) || (datePart.match(/(Z|[+-]\d{2}:\d{2})/) || [])[1] || '+01:00';
  const t = Date.parse(`${d[0]}T${tm ? tm[1] : '23:59:59'}${zone}`);
  return isNaN(t) ? Infinity : t;
}
  function escapeHtml(s){
  return (s||"").replace(/[&<>"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
  }[c]));
}

// Hämta länkar: försök från 'links', annars bygg från ND (svenska versionen)
function pickLinks(n) {
  const nd = n.ND || n.nd || "";
  let html = null, pdf = null;

  const L = n.links;
  if (Array.isArray(L)) {
    for (const x of L) {
      const u = x?.url || x?.href || "";
      if (!u) continue;
      if (!html && (/html/i.test(u) || /\/html(\?|$)/i.test(u))) html = u;
      if (!pdf  && (/\.pdf(\?|$)/i.test(u) || /\/pdf(\?|$)/i.test(u)))  pdf  = u;
    }
  } else if (L && typeof L === 'object') {
    // försök htmlDirect → ENG/SWE → valfritt språk
    const hd = L.htmlDirect || {};
    html = hd.SWE || hd.ENG || Object.values(hd)[0] || html;
    const pdfs = L.pdf || {};
    pdf  = pdfs.SWE || pdfs.ENG || Object.values(pdfs)[0] || pdf;
  }

  // Fallback från ND (svenska)
  const htmlFromND = nd ? `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:SV:HTML` : null;
  const pdfFromND  = nd ? `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:SV:PDF`  : null;

  return { html_url: html || htmlFromND, pdf_url: pdf || pdfFromND };
}

// Plocka belopp + valuta från olika fält (prioritetsordning)
function pickAmount(n) {
  const normCcy = (x) => {
    if (!x) return null;
    if (Array.isArray(x)) x = x[0];
    return typeof x === 'string' ? x.toUpperCase() : null;
  };



  const tv  = n["total-value"];
  const tvc = normCcy(n["total-value-cur"]);
  if (isFinite(tv)) return { amount: Number(tv), ccy: tvc, source: "total" };

  const rvn  = n["result-value-notice"];
  const rvnc = normCcy(n["result-value-cur-notice"]);
  if (isFinite(rvn)) return { amount: Number(rvn), ccy: rvnc, source: "result" };

  const evg  = n["estimated-value-glo"];
  const evgc = normCcy(n["estimated-value-cur-glo"]);
  if (isFinite(evg)) return { amount: Number(evg), ccy: evgc, source: "estimate" };

  return null;
}
function firstString(x){
  if (!x) return null;
  if (typeof x === 'string') return x;
  if (Array.isArray(x)) return x[0] || null;
  return null;
}
function pickDeadline(n) {
  // 1) Vanlig anbuds-deadline
  const d1 = n["deadline-receipt-tender-date-lot"];
  const t1 = n["deadline-receipt-tender-time-lot"];
  if (d1) return t1 ? `${d1} ${t1}` : d1;

  // 2) Generell deadline (kan förekomma)
  const d2 = n["deadline-date-lot"];
  const t2 = n["deadline-time-lot"];
  if (d2) return t2 ? `${d2} ${t2}` : d2;

  // 3) Sista dag för frågor/svar (fallback)
  const d3 = n["deadline-receipt-answers-date-lot"];
  const t3 = n["deadline-receipt-answers-time-lot"];
  if (d3) return t3 ? `${d3} ${t3}` : d3;

  // 4) Begäran om deltagande (begränsade förfaranden)
  const d4 = n["deadline-receipt-request-date-lot"];
  const t4 = n["deadline-receipt-request-time-lot"];
  if (d4) return t4 ? `${d4} ${t4}` : d4;

  return null;
}

// Formatera deadline till svensk text
function fmtDeadline(deadlineStr) {
  if (!deadlineStr) return "okänt";
  try {
    const d = new Date(deadlineStr.replace(' ', 'T'));
    return d.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return deadlineStr;
  }
}

// TED-titlar ser ut som "Sverige – Kategori – Själva titeln". Landet är alltid Sverige här, så det
// skalas bort och kategorin visas som en liten etikett ovanför titeln.
function splitTitle(t) {
  const parts = (t || '').split(' – ');
  if (parts.length >= 2 && /^sverige$/i.test(parts[0].trim())) parts.shift();
  if (parts.length >= 2) {
    const cat = parts.shift().split(':')[0].trim();
    return { cat, title: parts.join(' – ') };
  }
  return { cat: null, title: parts.join(' – ') };
}

// "GÖTEBORG" -> "Göteborg"
function niceCity(s) {
  if (!s) return s;
  return s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s;
}

const MS_DAY = 86400000;
// "2026-10-13+02:00" -> "13 okt." (med år om det inte är i år)
function fmtShortDate(pd) {
  const t = pdToMillis(pd);
  if (!t) return fmtDate(pd);
  const d = new Date(t);
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('sv-SE', opts);
}
function dueBadge(deadline) {
  const t = deadlineToMillis(deadline);
  if (!isFinite(t)) return '';
  const days = Math.ceil((t - Date.now()) / MS_DAY);
  if (t < Date.now()) return '<div class="due none">Svarstiden har gått ut</div>';
  const date = new Date(t).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' });
  const cls = days <= 3 ? 'urgent' : days <= 10 ? 'soon' : '';
  const left = days === 0 ? 'sista dagen i dag' : days === 1 ? '1 dag kvar' : `${days} dagar kvar`;
  return `<div class="due ${cls}">Sista svarsdag <strong>${date}</strong> ${left}</div>`;
}

// "2026-10-13T14:05:32Z" -> "i dag kl. 16:05" / "i går kl. 16:05" / "13 okt. kl. 16:05"
function fmtUpdated(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const day = (x) => x.toLocaleDateString('sv-SE');
  const now = new Date(), y = new Date(now - MS_DAY);
  if (day(d) === day(now)) return `i dag kl. ${time}`;
  if (day(d) === day(y)) return `i går kl. ${time}`;
  return `${d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} kl. ${time}`;
}

function fmtSEK(x) {
  try { return new Intl.NumberFormat('sv-SE', { style:'currency', currency:'SEK', maximumFractionDigits: 0 }).format(x); }
  catch { return `${Math.round(x).toLocaleString('sv-SE')} kr`; }
}

function applyFilters() {
  const onlySv = !!(onlySvEl && onlySvEl.checked);
  const q = ((qEl && qEl.value) || "").trim().toLowerCase();
  view = items.filter(x =>
  (!onlySv || x.has_sv) &&
  (activeCity === 'ALLA' || (x.city || '').toLowerCase() === activeCity.toLowerCase()) &&
  (activeCpv === 'ALL' || (x.cpv2 && x.cpv2.includes(activeCpv))) &&
  (!q || x.title.toLowerCase().includes(q))
);
}

function render(resetLoadedCount = true) { // ********** Lade till flagga **********
  applyFilters();

  if (sortMode === 'deadline') {
    // Snarast först bland dem som fortfarande går att svara på; passerade och saknade sist.
    const now = Date.now();
    const key = (x) => { const t = deadlineToMillis(x.deadline); return t < now ? Infinity : t; };
    view.sort((a, b) => key(a) - key(b));
  } else {
    view.sort((a, b) => pdToMillis(b.pd) - pdToMillis(a.pd));
  }

  // ********** Återställ räknaren vid ny filtrering **********
  if (resetLoadedCount) {
    loadedCount = ITEMS_PER_LOAD;
  }

  const totalInView = view.length;
  const itemsToRender = view.slice(0, loadedCount); // Begränsa antalet som ritas
  // ************************************************************

  countEl.textContent = `${totalInView.toLocaleString("sv-SE")} ${totalInView === 1 ? "upphandling" : "upphandlingar"}${onlySvEl && onlySvEl.checked ? " med svensk titel" : ""}`;
  listEl.innerHTML = "";

  if (emptyEl) emptyEl.style.display = totalInView === 0 ? "" : "none";

  // RENDER: Loopar bara igenom de objekt som ska visas (itemsToRender)
  for (const n of itemsToRender) {
    const amountHtml = n.amount
      ? `<span class="amt">${n.ccy === 'SEK' ? fmtSEK(n.amount) : `${n.amount.toLocaleString('sv-SE')} ${n.ccy || ''}`}</span>`
      : '';
    const { cat, title } = splitTitle(n.title);

    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-top">
        <div>
          ${cat ? `<span class="cat">${escapeHtml(cat)}</span>` : ''}
          <h3 class="title">${escapeHtml(title)}${n.has_sv ? '' : '<span class="badge">engelsk titel</span>'}</h3>
        </div>
        ${dueBadge(n.deadline)}
      </div>
      <div class="meta">
        ${n.buyer ? `<span class="buyer">${escapeHtml(n.buyer)}</span>` : ''}
        ${n.city ? `<span>${escapeHtml(niceCity(n.city))}</span>` : ''}
        <span>Publicerad ${fmtShortDate(n.pd)}</span>
        ${amountHtml}
      </div>
      <div class="links">
        ${n.submission_url ? `<a class="primary" href="${n.submission_url}" target="_blank" rel="noopener">Lämna anbud</a>` : ""}
        ${n.document_url ? `<a href="${n.document_url}" target="_blank" rel="noopener">Upphandlingsdokument</a>` : ""}
        ${n.pdf_url  ? `<a href="${n.pdf_url}"  target="_blank" rel="noopener">Annons (PDF)</a>`  : ""}
      </div>
    `;
    listEl.appendChild(card);
  }

  // ********** Lägg till "Ladda fler"-knapp **********
  if (totalInView > loadedCount) {
    const remaining = totalInView - loadedCount;
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'load-more-btn';
    loadMoreBtn.className = 'load-more';
    loadMoreBtn.textContent = `Visa fler (${remaining.toLocaleString('sv-SE')} till)`;
    loadMoreBtn.addEventListener('click', loadMore);
    listEl.appendChild(loadMoreBtn);
  }
  // ******************************************************

  updateItemListSchema();
}

// ********** NY FUNKTION FÖR ATT LADDA FLER **********
function loadMore() {
  // Öka antalet visade kort med ITEMS_PER_LOAD
  loadedCount += ITEMS_PER_LOAD;
  // Återrita vyn utan att nollställa loadedCount (skickar 'false')
  render(false);
}
// ******************************************************

function resetFilters() {
  activeCity = 'ALLA';
  activeCpv = 'ALL';
  sortMode = 'published';
  if (qEl) qEl.value = '';
  if (onlySvEl) onlySvEl.checked = false;
  if (cpvEl) cpvEl.value = 'ALL';
  if (sortEl) sortEl.value = 'published';
  pills.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.city === 'ALLA')));
  render();
}


async function init() {
  try {
    const r = await fetch('./data/ted.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();

    const gen = data.generated_at || data.generated_at_utc;
    updEl.textContent = "";
    const heroStat = document.getElementById('heroStat');
    const total = (data.notices || data.items || []).length;
    if (heroStat && total) heroStat.textContent = `${total.toLocaleString('sv-SE')} upphandlingar${gen ? `, uppdaterad ${fmtUpdated(gen)}` : ''}`;

    const notices = data.notices || data.items || [];
    items = notices.map(n => {
      const TI = n.TI || n.ti || {};
      const titleSv = TI.swe || TI.sv;
      const anyTitle = titleSv || TI.eng || TI.en || Object.values(TI)[0] || "(saknar titel)";
      const { html_url, pdf_url } = pickLinks(n);
      const amt = pickAmount(n);
      // --- CPV: normalisera till tvåsiffrig sektorkod (”division”), ex "45", "72"
      const rawCpv = n["classification-cpv"] || n["main-classification-lot"] || null;
      // rawCpv kan vara string eller array
      const cpvList = Array.isArray(rawCpv) ? rawCpv : (typeof rawCpv === 'string' ? [rawCpv] : []);
      const cpv2 = cpvList
        .map(c => (c || '').toString().replace(/\D/g,''))
        .filter(Boolean)
        .map(c => c.slice(0,2)); // två första siffrorna
      return {
        title: anyTitle,
        has_sv: !!titleSv,
        pd: n.PD || n.pd || "",
        nd: n.ND || n.nd || "",
        city: (() => {
          const raw = n["buyer-city"] || n["buyer_city"] || null;
          if (!raw) return null;
          if (typeof raw === 'string') return raw;
          if (Array.isArray(raw)) return raw[0] || null;
          if (typeof raw === 'object') {
            // ta första språk-nyckeln och första värdet
            const firstKey = Object.keys(raw)[0];
            const val = raw[firstKey];
            if (typeof val === 'string') return val;
            if (Array.isArray(val)) return val[0] || null;
          }
          return null;
        })(),
        buyer: (() => {
          const raw = n["organisation-name-buyer"];
          if (!raw) return null;
          if (typeof raw === 'string') return raw;
          if (Array.isArray(raw)) return raw[0] || null;
          if (typeof raw === 'object') {
            const firstKey = Object.keys(raw)[0];
            const val = raw[firstKey];
            if (typeof val === 'string') return val;
            if (Array.isArray(val)) return val[0] || null;
          }
          return null;
        })(),
        html_url, pdf_url,
        document_url: firstString(n['document-url-lot']),
        submission_url: firstString(n['submission-url-lot']),
        amount: amt?.amount || null,
        ccy: amt?.ccy || null,

        deadline: pickDeadline(n),
        cpv2
      };
    });

    render();
  } catch (e) {
    countEl.textContent = "Fel: Kunde inte läsa data/ted.json";
    console.error(e);
  }
}

// UI handlers – körs bara om respektive element finns på sidan (app.js laddas även på icke-listsidor)
if (onlySvEl) onlySvEl.addEventListener('change', () => render());
if (qEl) qEl.addEventListener('input', () => render());
if (cpvEl) cpvEl.addEventListener('change', () => {
  activeCpv = cpvEl.value || 'ALL';
  render();
});
if (sortEl) sortEl.addEventListener('change', () => {
  sortMode = sortEl.value || 'published';
  render();
});
if (resetBtn) resetBtn.addEventListener('click', resetFilters);
if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetFilters);
pills.forEach(btn => btn.addEventListener('click', () => {
  pills.forEach(b => b.setAttribute('aria-pressed', 'false'));
  btn.setAttribute('aria-pressed', 'true');
  activeCity = btn.dataset.city || 'ALLA';
  render();
}));
if (listEl) init();

function updateItemListSchema() {
  try {
    // ta topp 20 i nuvarande vy
    const top = (view || []).slice(0, 20);
    const itemListElement = top.map((it, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": it.pdf_url || it.html_url || ("https://ted.europa.eu/udl?uri=TED:NOTICE:" + encodeURIComponent(it.nd) + ":TEXT:SV:PDF"),
      "name": it.title
    }));

    const data = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListOrder": "https://schema.org/ItemListOrderDescending",
      "numberOfItems": itemListElement.length,
      "itemListElement": itemListElement
    };

    let tag = document.getElementById('schema-itemlist');
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = 'schema-itemlist';
      document.body.appendChild(tag);
    }
    tag.textContent = JSON.stringify(data);
  } catch(e) { /* no-op */ }
}
