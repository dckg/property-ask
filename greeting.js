// Hero signature — cycle a multilingual hello every 2.5s.
// Order maps to Chee How's spoken languages + Singapore's official ones.

const GREETINGS = [
  'Hello',
  '你好',
  'Halo',
  'வணக்கம்',
  'Apa khabar',
  'Hello, lah',
];

const el = document.getElementById('greeting');
if (el && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let i = 0;
  setInterval(() => {
    el.classList.add('is-leaving');
    setTimeout(() => {
      i = (i + 1) % GREETINGS.length;
      el.textContent = GREETINGS[i];
      el.classList.remove('is-leaving');
    }, 280);
  }, 2500);
}
