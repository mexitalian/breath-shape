import { el } from '../dom.js';

const SVG = 'http://www.w3.org/2000/svg';

// Which counter a snapshot gets. The timeline's `round` is the cycle number for every
// technique: simple patterns loop one cycle per round, round-based ones count rounds.
//   target — a set number of rounds (Wim Hof, Tummo…): outlines fill in left to right
//   up     — no set end (box, resonance, timed sessions): counts up, left to right
//   null   — a single round (Buteyko): nothing to count
export function counterMode(snap) {
  if (!Number.isFinite(snap.rounds)) return { mode: 'up', total: null };
  if (snap.rounds > 1) return { mode: 'target', total: snap.rounds };
  return null;
}

// State of the cycle at `index` (0-based, in cycle order) for the current snapshot.
export function cycleState(index, snap) {
  const current = snap.round - 1;
  if (index < current || (snap.finished && index === current)) return 'done';
  if (index === current) return 'active';
  return 'upcoming';
}

// A mini copy of the technique's shape: an outline plus a fill that breathes.
function miniShape(cfg) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('cycle');
  const make = (cls) => {
    const shape = cfg.path
      ? document.createElementNS(SVG, 'polygon')
      : document.createElementNS(SVG, 'circle');
    if (cfg.path) shape.setAttribute('points', cfg.path.map(([x, y]) => `${x},${y}`).join(' '));
    else { shape.setAttribute('cx', '50'); shape.setAttribute('cy', '50'); shape.setAttribute('r', '48'); }
    shape.classList.add(cls);
    svg.append(shape);
    return shape;
  };
  make('cycle__fill');
  make('cycle__outline');
  return svg;
}

// Pure: the range of the breath scale over one cycle, from the config's phases.
export function scaleRange(cfg) {
  const scales = cfg.sequence.steps.flatMap(st => st.phases.map(ph => ph.scale)).filter(Number.isFinite);
  return { lo: Math.min(...scales), hi: Math.max(...scales) };
}

// Pure: how full the current mini shape is (0–1). It fills as you breathe in and stays
// full (#147): `peak` is the largest breath scale reached so far in this cycle.
export function cycleFill(peak, { lo, hi }) {
  if (!(hi > lo)) return 1;
  return Math.min(1, Math.max(0, (peak - lo) / (hi - lo)));
}

// Pattern: cycle counter between the shape and the text. A status line (cycles and
// time), then mini shapes, one per cycle.
//   up     — each fills as you breathe in and stays full; the next waits for the next
//            in-breath. With a session length (total) every outline shows up front.
//   target — a set number of rounds: the current one breathes with the main shape.
export function createCycleCounter(mount, cfg) {
  const root = el('div', 'cycles');
  root.hidden = true;
  const count = el('div', 'cycles__count');
  const grid = el('div', 'cycles__grid');
  root.append(count, grid);
  mount.append(root);

  const range = scaleRange(cfg);
  let mode = null;
  let items = [];      // in cycle order
  let lastText = '';
  let peakRound = 0;
  let peak = range.lo;
  let lastActive = -1;

  function reset() {
    mode = null;
    items = [];
    grid.replaceChildren();
    root.hidden = true;
    peakRound = 0;
    lastActive = -1;
  }

  // Exactly n mini shapes, left to right.
  function ensureItems(n) {
    while (items.length < n) {
      const item = miniShape(cfg);
      items.push(item);
      grid.append(item);
    }
    while (items.length > n) items.pop().remove();
  }

  // extra: { total, status } — total cycles when a length is picked, and the status
  // line (cycles and time) from the engine.
  function update(snap, { total = null, status = null } = {}) {
    if (!mode) {
      mode = counterMode(snap);
      if (!mode) return;
      root.hidden = false;
      root.dataset.mode = mode.mode;
    }
    const up = mode.mode === 'up';
    ensureItems(up ? (total ?? snap.round) : mode.total);
    root.toggleAttribute('data-total', up && total != null);

    if (snap.round !== peakRound) { peakRound = snap.round; peak = snap.scale; }
    peak = Math.max(peak, snap.scale);
    const fill = up ? cycleFill(peak, range) : snap.scale;

    // Only the active cycle changes from frame to frame.
    items.forEach((item, i) => {
      const state = cycleState(i, snap);
      if (item.dataset.state !== state) item.dataset.state = state;
      if (state === 'active') item.style.setProperty('--cycle-scale', fill.toFixed(4));
    });

    // Keep the cycle under way in view when the outlines scroll.
    const active = Math.min(snap.round, items.length) - 1;
    if (up && active !== lastActive && items[active]) {
      lastActive = active;
      const it = items[active];
      if (it.offsetTop + it.offsetHeight > grid.scrollTop + grid.clientHeight || it.offsetTop < grid.scrollTop) {
        grid.scrollTop = it.offsetTop;
      }
    }

    const text = up ? (status ?? `Cycle ${snap.round}`) : '';
    if (text !== lastText) {
      lastText = text;
      count.textContent = text;
      count.hidden = !text;
    }
  }

  return { root, update, reset };
}
