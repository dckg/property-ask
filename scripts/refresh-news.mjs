// Fetches Singapore real-estate headlines via Google News RSS and writes
// data/news.json. Multiple queries → dedupe by title → keep newest 10.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const OUT = 'data/news.json';
const MAX_ITEMS = 10;

const QUERIES = [
  'singapore property market',
  'singapore HDB resale',
  'singapore condominium new launch',
  'singapore real estate',
];

const GNEWS = q =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:7d')}` +
  `&hl=en-SG&gl=SG&ceid=SG:en`;

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

const stripTags  = (s) => s.replace(/<[^>]+>/g, '').trim();
const unwrapCDATA = (s) => {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s;
};

function parseItems(xml) {
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const get = (tag) => {
      const tm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return tm ? unwrapCDATA(tm[1]).trim() : '';
    };
    let title = decodeEntities(stripTags(get('title')));
    const link = get('link');
    const date = get('pubDate');
    const srcM = block.match(/<source[^>]*>([^<]+)<\/source>/);
    let source = srcM ? decodeEntities(srcM[1].trim()) : 'News';

    // Google News appends " - SourceName" to the title — strip it
    if (source && title.endsWith(' - ' + source)) {
      title = title.slice(0, -(source.length + 3));
    }
    if (!title || !link) continue;

    out.push({
      title,
      link,
      date: date ? new Date(date).toISOString() : null,
      source: source.replace(/\.com$/i, '').toUpperCase(),
    });
  }
  return out;
}

async function fetchQuery(q) {
  try {
    const res = await fetch(GNEWS(q), {
      headers: { 'User-Agent': 'Mozilla/5.0 (property-ask news bot)' },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const xml = await res.text();
    return parseItems(xml);
  } catch (e) {
    console.warn(`[news] feed failed for "${q}":`, e.message);
    return [];
  }
}

const all = (await Promise.all(QUERIES.map(fetchQuery))).flat();

// Brand-blocklist: drop any item that mentions a brand we don't surface.
const BLOCKLIST = /\bpropnex\b/i;

const seen = new Set();
const unique = [];
for (const it of all) {
  if (BLOCKLIST.test(it.title) || BLOCKLIST.test(it.source)) continue;
  const key = it.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(it);
}

unique.sort((a, b) => (Date.parse(b.date ?? 0) || 0) - (Date.parse(a.date ?? 0) || 0));
const top = unique.slice(0, MAX_ITEMS);

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({
  updated: new Date().toISOString(),
  items: top,
}, null, 2) + '\n');

console.log(`[news] wrote ${top.length} items to ${OUT}`);
if (top.length === 0) {
  console.error('[news] no items found — feeds may be down');
  process.exitCode = 1;
}
