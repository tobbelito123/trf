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
 function escapeHtml(s){
  return (s||"").replace(/[&<>"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
  }[c]));
}            

// Hämta länkar: försök från 'links', annars bygg från ND (svenska versionen)
function pickLinks(n) {
  const nd = n.ND || n.nd || "";
  const htmlFromND = nd ? `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:SV:HTML` : null;
  const pdfFromND  = nd ? `https://ted.europa.eu/udl?uri=TED:NOTICE:${nd}:TEXT:SV:PDF`  : null;

  let html=null, pdf=null;
  if (Array.isArray(n.links)) {
    for (const L of n.links) {
      const u = L.url || L.href || "";
      if (!u) continue;
      if (!html && /html/i.test(u)) html = u;
      if (!pdf  && /\.pdf($|\?)/i.test(u)) pdf  = u;
    }
  }
  return { html_url: html || htmlFromND, pdf_url: pdf || pdfFromND };
}

// Plocka belopp + valuta från olika fält (prioritetsordning)
function pickAmount(n) {
  const tv  = n["total-value"];
  const tvc = n["total-value-cur"];
  if (isFinite(tv)) return { amount: Number(tv), ccy: (tvc||"").toUpperCase() || null, source: "total" };

  const rvn  = n["result-value-notice"];
  const rvnc = n["result-value-cur-notice"];
  if (isFinite(rvn)) return { amount: Number(rvn), ccy: (rvnc||"").toUpperCase() || null, source: "result" };

  const evg  = n["estimated-value-glo"];
  const evgc = n["estimated-value-cur-glo"];
  if (isFinite(evg)) return { amount: Number(evg), ccy: (evgc||"").toUpperCase() || null, source: "estimate" };

  return null;
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
          ${n.nd ? `<span><strong>ND:</strong> ${escapeHtml(n.nd)}</span>` : ""}
          ${n.city ? `<span><strong>Ort:</strong> ${escapeHtml(n.city)}</span>` : ""}
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
        city: n["buyer-city"] || n["buyer_city"] || null,
        html_url, pdf_url,
        amount: amt?.amount || null,
        ccy: amt?.ccy || null
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
