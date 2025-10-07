const listEl   = document.getElementById('list');
const countEl  = document.getElementById('count');
const updEl    = document.getElementById('updated');
const onlySvEl = document.getElementById('onlySv');
const qEl      = document.getElementById('q');
const pills    = Array.from(document.querySelectorAll('.chip'));

let items = [];
let view  = [];
let activeCity = 'ALLA';

function fmtDate(pd) {
  if (!pd) return "okänt datum";
  if (/^\d{4}-\d{2}-\d{2}/.test(pd)) return pd.slice(0,10);
  try { return new Date(pd).toLocaleDateString('sv-SE', {year:'numeric', month:'short', day:'2-digit'}); }
  catch { return pd; }
}
// ADD: normalize PD → milliseconds (handles "YYYY-MM-DD+HH:MM" too)
function pdToMillis(pd){
  if (!pd) return 0;
  if (/^\d{4}-\d{2}-\d{2}T/.test(pd)) return Date.parse(pd);                 // ISO
  if (/^\d{4}-\d{2}-\d{2}\+\d{2}:\d{2}$/.test(pd)) {                         // "2025-07-08+02:00"
    const [d, off] = pd.split('+');
    return Date.parse(`${d}T00:00:00+${off}`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(pd)) return Date.parse(`${pd}T00:00:00Z`);  // date only
  const t = Date.parse(pd);
  return isNaN(t) ? 0 : t;
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

function fmtSEK(x) {
  try { return new Intl.NumberFormat('sv-SE', { style:'currency', currency:'SEK', maximumFractionDigits: 0 }).format(x); }
  catch { return `${Math.round(x).toLocaleString('sv-SE')} kr`; }
}

function applyFilters() {
  const onlySv = onlySvEl.checked;
  const q = (qEl.value || "").trim().toLowerCase();
  view = items.filter(x =>
    (!onlySv || x.has_sv) &&
    (activeCity === 'ALLA' || (x.city || '').toLowerCase() === activeCity.toLowerCase()) &&
    (!q || x.title.toLowerCase().includes(q))
  );
}

function render() {
  applyFilters();
  view.sort((a, b) => pdToMillis(b.pd) - pdToMillis(a.pd));
  countEl.textContent = `${view.length} upphandlingar ${onlySvEl.checked ? "(svensk titel)" : ""}`;
  listEl.innerHTML = "";
  for (const n of view) {
    const amountHtml = n.amount
      ? (n.ccy === 'SEK'
          ? `<span class="amount">${fmtSEK(n.amount)}</span>`
          : `<span class="amount">${n.amount.toLocaleString('sv-SE')} <span class="ccy">${n.ccy || ''}</span></span>`)
      : '';

    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h3 class="title">${escapeHtml(n.title)} ${n.has_sv ? '' : '<span class="badge">ej sv</span>'}</h3>
      <div class="row">
        <div class="meta">
  <span><strong>Datum:</strong> ${fmtDate(n.pd)}</span>
  ${n.nd ? `<span><strong>ND:</strong> ${escapeHtml(n.nd)}</span>` : ''}
  ${n.city ? `<span><strong>Ort:</strong> ${escapeHtml(n.city)}</span>` : ''}
  ${n.deadline ? `<span><strong>Sista svarsdag:</strong> ${fmtDate(n.deadline)}</span>` : ''}
  ${n.amountText ? `<span>${n.amountText}</span>` : ''}
</div>
        ${amountHtml}
      </div>
      <div class="links">
        ${n.html_url ? `<a href="${n.html_url}" target="_blank" rel="noopener">🌐 HTML</a>` : ""}
        ${n.pdf_url  ? `<a href="${n.pdf_url}"  target="_blank" rel="noopener">📄 PDF</a>`  : ""}
      </div>
    `;
    listEl.appendChild(card);
  }
}

async function init() {
  try {
    const r = await fetch('./data/ted.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();

    updEl.textContent = (data.generated_at || data.generated_at_utc)
      ? `• Uppdaterad: ${data.generated_at || data.generated_at_utc}`
      : "";

    const notices = data.notices || data.items || [];
    items = notices.map(n => {
      const TI = n.TI || n.ti || {};
      const titleSv = TI.swe || TI.sv;
      const anyTitle = titleSv || TI.eng || TI.en || Object.values(TI)[0] || "(saknar titel)";
      const { html_url, pdf_url } = pickLinks(n);
      const amt = pickAmount(n);
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
        deadline: pickDeadline(n),
        html_url, pdf_url,
        amount: amt?.amount || null,
        ccy: amt?.ccy || null,
        deadline: pickDeadline(n)
      };
    });

    render();
  } catch (e) {
    countEl.textContent = "Fel: Kunde inte läsa data/ted.json";
    console.error(e);
  }
}

// UI handlers
onlySvEl.addEventListener('change', render);
qEl.addEventListener('input', render);
pills.forEach(btn => btn.addEventListener('click', () => {
  pills.forEach(b => b.setAttribute('aria-pressed', 'false'));
  btn.setAttribute('aria-pressed', 'true');
  activeCity = btn.dataset.city || 'ALLA';
  render();
}));
init();
