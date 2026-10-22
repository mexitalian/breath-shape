import { el } from '../dom.js';

const SVG = 'http://www.w3.org/2000/svg';

// Which counter a snapshot gets. The timeline's `round` is the cycle number for every
// technique: simple patterns loop one cycle per round, round-based ones count rounds.
//   target — a set number of rounds (Wim Hof, Tummo…): outlines fill in left to right
//   up     — no set end (box, resonance, timed sessions): counts up, newest first
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

// Pattern: cycle counter between the shape and the text. Mini shapes, one per cycle;
// the current one breathes with the main shape and finished ones are filled in.
export function createCycleCounter(mount, cfg) {
  const root = el('div', 'cycles');
  root.hidden = true;
  const count = el('div', 'cycles__count');
  const grid = el('div', 'cycles__grid');
  root.append(count, grid);
  mount.append(root);

  let mode = null;
  let items = [];      // in cycle order
  let lastText = '';

  function reset() {
    mode = null;
    items = [];
    grid.replaceChildren();
    root.hidden = true;
  }

  function ensureItems(n) {
    while (items.length < n) {
      const item = miniShape(cfg);
      items.push(item);
      // Count-up: the newest cycle goes first (top left) and pushes the rest along.
      if (mode.mode === 'up') grid.prepend(item); else grid.append(item);
    }
  }

  function update(snap) {
    if (!mode) {
      mode = counterMode(snap);
      if (!mode) return;
      root.hidden = false;
      root.dataset.mode = mode.mode;
    }
    ensureItems(mode.mode === 'target' ? mode.total : snap.round);

    // Only the active cycle changes from frame to frame.
    items.forEach((item, i) => {
      const state = cycleState(i, snap);
      if (item.dataset.state !== state) item.dataset.state = state;
      if (state === 'active') item.style.setProperty('--cycle-scale', snap.scale.toFixed(4));
    });

    const text = mode.mode === 'up' ? `Cycle ${snap.round}` : '';
    if (text !== lastText) {
      lastText = text;
      count.textContent = text;
      count.hidden = !text;
    }
  }

  return { root, update, reset };
}
