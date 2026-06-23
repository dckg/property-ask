// Plan-zoom navigation: clicking a room transforms the canvas group so
// that room fills the viewport. CSS transition handles the animation —
// reliable even when the tab is backgrounded (which pauses rAF).

const plan    = document.getElementById('plan');
const canvas  = plan.querySelector('.canvas');
const backBtn = document.getElementById('back');
const tbSheet = document.getElementById('tb-sheet');
const panels  = document.querySelectorAll('.panel');

const VB = { w: 1000, h: 600 };
const PAD = 40;

const ROOM_SHEETS = {
  foyer:   'A1.01',
  study:   'A1.02',
  gallery: 'A1.03',
  lounge:  'A1.04',
  hearth:  'A1.05',
};

let activeRoom = null;

function roomRect(name) {
  const r = plan.querySelector(`.room[data-room="${name}"] rect`);
  return {
    x: +r.getAttribute('x') - PAD,
    y: +r.getAttribute('y') - PAD,
    w: +r.getAttribute('width')  + PAD * 2,
    h: +r.getAttribute('height') + PAD * 2,
  };
}

function transformFor(name) {
  if (!name) return 'translate(0px, 0px) scale(1)';
  const { x, y, w, h } = roomRect(name);
  const s = Math.min(VB.w / w, VB.h / h);
  const tx = -x * s + (VB.w - w * s) / 2;
  const ty = -y * s + (VB.h - h * s) / 2;
  return `translate(${tx}px, ${ty}px) scale(${s})`;
}

function zoomToRoom(name) {
  if (activeRoom === name) return;
  activeRoom = name;

  panels.forEach(p => {
    p.removeAttribute('data-active');
    p.setAttribute('aria-hidden', 'true');
    if (p.dataset.panel !== name) p.hidden = true;
  });

  canvas.style.transform = transformFor(name);
  document.body.classList.add('is-zoomed');
  backBtn.hidden = false;

  const panel = document.querySelector(`.panel[data-panel="${name}"]`);
  if (panel) {
    panel.hidden = false;
    void panel.offsetWidth; // force reflow so the next attribute change transitions
    panel.setAttribute('data-active', '');
    panel.setAttribute('aria-hidden', 'false');
  }

  if (tbSheet) tbSheet.textContent = ROOM_SHEETS[name] ?? 'A1';
}

function zoomHome() {
  activeRoom = null;
  panels.forEach(p => {
    p.removeAttribute('data-active');
    p.setAttribute('aria-hidden', 'true');
  });
  setTimeout(() => panels.forEach(p => p.hidden = true), 350);

  canvas.style.transform = transformFor(null);
  document.body.classList.remove('is-zoomed');
  backBtn.hidden = true;
  if (tbSheet) tbSheet.textContent = 'A1';
}

plan.addEventListener('click', e => {
  const room = e.target.closest('.room');
  if (room) zoomToRoom(room.dataset.room);
});

plan.addEventListener('keydown', e => {
  const room = e.target.closest('.room');
  if (room && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    zoomToRoom(room.dataset.room);
  }
});

backBtn.addEventListener('click', zoomHome);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeRoom) zoomHome();
});
