// Renders flip cards from data/listings.json.
// Front: cover photo + title + price.
// Back: full specs + tagline + CTA. Hover (desktop) or tap (touch)
// flips the card. Keyboard space/enter also flips.

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

  const photoSrc  = esc(it.photo || it.photo_fallback || '');
  const photoFall = esc(it.photo_fallback || '');

  return `
    <article class="ls-card ls-${esc(it.intent)}"
             tabindex="0"
             aria-label="${esc(it.title)} — tap or hover to see details">
      <div class="ls-flip">
        <!-- FRONT: cover photo + headline + price -->
        <div class="ls-face ls-front">
          <img class="ls-photo"
               src="${photoSrc}"
               ${photoFall ? `onerror="this.onerror=null;this.src='${photoFall}';"` : ''}
               alt="${esc(it.title)}"
               loading="lazy" />
          <div class="ls-front-content">
            <header class="ls-front-head">
              <span class="ls-intent">${esc(intentLabel(it.intent))}</span>
              <span class="ls-district">${esc(it.district)}</span>
            </header>
            <div class="ls-front-bottom">
              <h3 class="ls-title">${esc(it.title)}</h3>
              <p class="ls-address">${esc(it.address)}</p>
              <p class="ls-price-row">
                <span class="ls-price">${esc(it.price)}</span>
                ${it.price_meta ? `<span class="ls-price-meta">${esc(it.price_meta)}</span>` : ''}
              </p>
            </div>
            <p class="ls-flip-hint" aria-hidden="true">Hover / tap for details</p>
          </div>
        </div>

        <!-- BACK: specs and details -->
        <div class="ls-face ls-back">
          <header class="ls-back-head">
            <span class="ls-intent">${esc(intentLabel(it.intent))}</span>
            <span class="ls-district">${esc(it.district)}</span>
          </header>
          <h3 class="ls-back-title">${esc(it.title)}</h3>
          <p class="ls-back-address">${esc(it.address)}</p>
          <ul class="ls-specs">
            <li><span class="k">Bed</span><span class="v">${it.beds}</span></li>
            <li><span class="k">Bath</span><span class="v">${it.baths}</span></li>
            <li><span class="k">Size</span><span class="v">${sqftLine}</span></li>
            <li><span class="k">Type</span><span class="v">${esc(it.type)}</span></li>
          </ul>
          <p class="ls-back-price">
            <span class="ls-price">${esc(it.price)}</span>
            ${it.price_meta ? `<span class="ls-price-meta">${esc(it.price_meta)}</span>` : ''}
            ${psfLine}
          </p>
          ${it.tagline ? `<p class="ls-tagline">${esc(it.tagline)}</p>` : ''}
          ${metaLine ? `<p class="ls-meta">${metaLine}</p>` : ''}
          ${it.near ? `<p class="ls-near">${esc(it.near)}</p>` : ''}
          <footer class="ls-foot">
            <a class="ls-cta" href="${esc(it.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation();">
              View on PropertyGuru <span aria-hidden="true">→</span>
            </a>
            <span class="ls-listed">Listed ${esc(fmtListed(it.listed))} · ID ${esc(it.id)}</span>
          </footer>
        </div>
      </div>
    </article>
  `;
}

function wireFlip(root) {
  root.querySelectorAll('.ls-card').forEach(card => {
    const flipTo = (state) => {
      if (state === undefined) card.classList.toggle('is-flipped');
      else card.classList.toggle('is-flipped', !!state);
    };
    // Click / tap toggles
    card.addEventListener('click', e => {
      // Don't flip if the user clicked a link inside the back face
      if (e.target.closest('a')) return;
      flipTo();
    });
    // Keyboard
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flipTo();
      }
    });
  });
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

    const ctaHTML = `
      <a class="ls-card ls-cta-card" href="${esc(data.agent_url)}" target="_blank" rel="noopener" aria-label="View Chee How's full PropertyGuru profile">
        <img class="ls-cta-img"
             src="photos/profile-cta.png"
             onerror="this.onerror=null;this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Detached_houses_along_Jervois_Road%2C_Singapore_-_20060226.jpg/960px-Detached_houses_along_Jervois_Road%2C_Singapore_-_20060226.jpg';"
             alt="" loading="lazy" />
        <div class="ls-cta-content">
          <span class="ls-cta-eyebrow">More from Chee How</span>
          <h3 class="ls-cta-title">See the full set of listings</h3>
          <p class="ls-cta-sub">Photos, floor plans and full specs on PropertyGuru.</p>
          <span class="ls-cta-pill">
            View full PropertyGuru profile
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </a>
    `;
    list.innerHTML = data.items.map(cardHTML).join('') + ctaHTML;
    wireFlip(list);
  } catch (e) {
    console.warn('[listings] load failed', e);
    list.innerHTML = '<p class="ls-empty">Listings unavailable. <a href="https://www.propertyguru.com.sg/agent/chua-chee-how-901578302" target="_blank" rel="noopener">View on PropertyGuru directly →</a></p>';
  }
}

loadListings();
