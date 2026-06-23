// Render current listings from data/listings.json into the .listings section.
// Data is curated — each card deep-links to the source listing on PropertyGuru.

const SOURCE = 'data/listings.json';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function intentLabel(intent) {
  return intent === 'rent' ? 'For rent' : 'For sale';
}

function fmtListed(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function cardHTML(it) {
  const sqftLine = it.floor_sqft
    ? `${it.sqft.toLocaleString()} ${esc(it.sqft_label || 'sqft')} · ${it.floor_sqft.toLocaleString()} floor`
    : `${it.sqft.toLocaleString()} ${esc(it.sqft_label || 'sqft')}`;
  const psfLine = it.psf ? `<span class="ls-psf">${esc(it.psf)}</span>` : '';
  const metaLine = [it.tenure, it.top].filter(Boolean).map(esc).join(' · ');

  return `
    <article class="ls-card ls-${esc(it.intent)}">
      <header class="ls-head">
        <span class="ls-intent">${esc(intentLabel(it.intent))}</span>
        <span class="ls-district">${esc(it.district)}</span>
      </header>
      <div class="ls-title-wrap">
        <h3 class="ls-title">${esc(it.title)}</h3>
        <p class="ls-address">${esc(it.address)}</p>
      </div>
      <ul class="ls-specs">
        <li><span class="k">Bed</span><span class="v">${it.beds}</span></li>
        <li><span class="k">Bath</span><span class="v">${it.baths}</span></li>
        <li><span class="k">Size</span><span class="v">${sqftLine}</span></li>
        <li><span class="k">Type</span><span class="v">${esc(it.type)}</span></li>
      </ul>
      <div class="ls-price-row">
        <div class="ls-price-main">
          <span class="ls-price">${esc(it.price)}</span>
          ${it.price_meta ? `<span class="ls-price-meta">${esc(it.price_meta)}</span>` : ''}
        </div>
        ${psfLine}
      </div>
      ${it.tagline ? `<p class="ls-tagline">${esc(it.tagline)}</p>` : ''}
      ${metaLine ? `<p class="ls-meta">${metaLine}</p>` : ''}
      ${it.near ? `<p class="ls-near">${esc(it.near)}</p>` : ''}
      <footer class="ls-foot">
        <a class="ls-cta" href="${esc(it.url)}" target="_blank" rel="noopener">
          View on PropertyGuru <span aria-hidden="true">→</span>
        </a>
        <span class="ls-listed">Listed ${esc(fmtListed(it.listed))} · ID ${esc(it.id)}</span>
      </footer>
    </article>
  `;
}

async function loadListings() {
  const list = document.querySelector('[data-listings="items"]');
  const count = document.querySelector('[data-listings="count"]');
  const updated = document.querySelector('[data-listings="updated"]');
  if (!list) return;

  try {
    const res = await fetch(SOURCE, { cache: 'no-cache' });
    if (!res.ok) throw new Error('listings fetch failed: ' + res.status);
    const data = await res.json();

    if (count)   count.textContent = String(data.items?.length ?? 0);
    if (updated && data.updated) {
      const d = new Date(data.updated);
      if (!Number.isNaN(d.getTime())) {
        updated.textContent = d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      list.innerHTML = '<p class="ls-empty">No active listings right now — see Chee How\'s full PropertyGuru profile for past sales and rentals.</p>';
      return;
    }

    list.innerHTML = data.items.map(cardHTML).join('');
  } catch (e) {
    console.warn('[listings] load failed', e);
    list.innerHTML = '<p class="ls-empty">Listings unavailable. <a href="https://www.propertyguru.com.sg/agent/chua-chee-how-901578302" target="_blank" rel="noopener">View on PropertyGuru directly →</a></p>';
  }
}

loadListings();
