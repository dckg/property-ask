// Produces a single self-contained index-bundled.html with all CSS,
// JS, JSON data, and local photos inlined. Wikimedia URLs are kept
// as remote references (already CDN-hosted).
//
// Usage: node scripts/bundle.mjs
// Output: dist/index.html

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

async function read(rel) { return await readFile(ROOT + rel, 'utf8'); }
async function readBin(rel) { return await readFile(ROOT + rel); }

function mime(ext) {
  return { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
}

async function toDataUri(rel) {
  const buf = await readBin(rel);
  return `data:${mime(extname(rel))};base64,${buf.toString('base64')}`;
}

let html        = await read('index.html');
const css       = await read('styles.css');
const newsJs    = await read('news.js');
const listJs    = await read('listings.js');
const newsJson  = JSON.parse(await read('data/news.json'));
const listJson  = JSON.parse(await read('data/listings.json'));

// --- Inline CSS ---
html = html.replace(
  /<link rel="stylesheet" href="\.\/styles\.css"[^>]*\/?>/,
  `<style>\n${css}\n</style>`
);

// --- Inline local photos as data URIs ---
const photoMap = new Map();
const photoMatches = [...html.matchAll(/(["'])(photos\/[^"']+)\1/g)];
for (const m of photoMatches) {
  if (!photoMap.has(m[2])) photoMap.set(m[2], await toDataUri(m[2]));
}
// Also bake in the listing photos that appear inside listings.js JSON
for (const it of listJson.items) {
  if (it.photo?.startsWith('photos/') && !photoMap.has(it.photo)) {
    photoMap.set(it.photo, await toDataUri(it.photo));
  }
}
for (const [path, dataUri] of photoMap) {
  html = html.replaceAll(path, dataUri);
}

// --- Convert JSON-fetching JS into self-contained versions ---
// Each module currently fetches its data file. Replace the fetch with an inline constant.
let newsJsInline = newsJs.replace(
  /const\s+SOURCE\s*=\s*['"][^'"]+['"]\s*;[\s\S]*?async function loadNews/,
  `const __DATA__ = ${JSON.stringify(newsJson)};\nasync function loadNews`
).replace(
  /const res = await fetch\(SOURCE[^)]*\);[\s\S]*?const data = await res\.json\(\);/,
  `const data = __DATA__;`
);

// Swap in the inlined listing data + bake the cta-card fallback path through the photo map too.
let listJsInline = listJs.replace(
  /const\s+SOURCE\s*=\s*['"][^'"]+['"]\s*;[\s\S]*?async function loadListings/,
  `const __DATA__ = ${JSON.stringify(listJson)};\nasync function loadListings`
).replace(
  /const res = await fetch\(SOURCE[^)]*\);[\s\S]*?const data = await res\.json\(\);/,
  `const data = __DATA__;`
);
// Replace any remaining photos/ paths inside the listings JS (cta-card src)
for (const [path, dataUri] of photoMap) {
  listJsInline = listJsInline.replaceAll(path, dataUri);
}

// --- Inline the JS at the bottom (replace the two <script src> tags) ---
html = html.replace(
  /<script src="\.\/news\.js" type="module"><\/script>\s*<script src="\.\/listings\.js" type="module"><\/script>/,
  `<script type="module">\n${newsJsInline}\n</script>\n<script type="module">\n${listJsInline}\n</script>`
);

await mkdir(ROOT + 'dist', { recursive: true });
await writeFile(ROOT + 'dist/index.html', html);

const bytes = Buffer.byteLength(html, 'utf8');
console.log(`Wrote dist/index.html — ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Inlined ${photoMap.size} local photo(s) as data URIs.`);
