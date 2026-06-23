// Populates GALLERY · MARKET with the latest Singapore real-estate news.
// Reads data/news.json — refreshed by .github/workflows/refresh-news.yml.

const FALLBACK = 'data/news.json';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function formatUpdated(iso) {
  if (!iso) return 'moments ago';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'moments ago';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 5)   return 'just now';
  if (diffMin < 60)  return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7)   return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return formatDate(iso);
}

async function loadNews() {
  const updatedEl = document.querySelector('[data-news="updated"]');
  const list      = document.querySelector('[data-news="items"]');
  if (!list) return;

  try {
    const res = await fetch(FALLBACK, { cache: 'no-cache' });
    if (!res.ok) throw new Error('news fetch failed: ' + res.status);
    const data = await res.json();

    if (updatedEl) updatedEl.textContent = formatUpdated(data.updated);

    if (!Array.isArray(data.items) || data.items.length === 0) {
      list.innerHTML = '<li class="news-empty">No headlines yet — first refresh runs at the next scheduled tick.</li>';
      return;
    }

    list.innerHTML = data.items.slice(0, 12).map(it => `
      <li>
        <span class="src">${esc(it.source)}</span>
        <h3><a href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">${esc(it.title)}</a></h3>
        <span class="date">${esc(formatDate(it.date))}</span>
      </li>
    `).join('');
  } catch (e) {
    console.warn('[news] load failed', e);
    list.innerHTML = '<li class="news-empty">Feed temporarily unavailable.</li>';
  }
}

loadNews();
