import { el } from '../dom.js';

export function formatClock(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function metaText(snap) {
  const parts = [];
  if (Number.isFinite(snap.rounds) && snap.rounds > 1) parts.push(`Round ${snap.round} of ${snap.rounds}`);
  if (snap.repeat > 1) parts.push(`${snap.counter ?? 'Breath'} ${snap.rep} / ${snap.repeat}`);
  if (snap.sessionMs != null) parts.push(`${formatClock(Math.max(0, snap.sessionMs - snap.sessionElapsed))} left`);
  return parts.join(' · ');
}

export function createLabels() {
  const root = el('div', 'labels');
  const meta = el('div', 'meta', { hidden: true });
  const phase = el('div', 'phase');
  const count = el('div', 'count');
  root.append(meta, phase, count);

  const last = {};
  const set = (node, key, text) => {
    if (last[key] === text) return;
    node.textContent = text;
    last[key] = text;
  };

  function update(snap) {
    set(phase, 'phase', snap.phase.name);
    if (snap.openEnded) {
      count.dataset.mode = 'stopwatch';
      set(count, 'count', formatClock(snap.elapsed));
    } else {
      delete count.dataset.mode;
      set(count, 'count', String(Math.max(1, Math.ceil(snap.remaining / 1000))));
    }
    const text = metaText(snap);
    set(meta, 'meta', text);
    meta.hidden = !text;
  }

  return { root, update };
}
