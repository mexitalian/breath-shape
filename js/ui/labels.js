import { el } from '../dom.js';

export function formatClock(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// What the shape shows at its centre: the phase name and a count.
//   mode 'stopwatch' — open-ended hold, counts up
//   mode 'counter'   — counted breaths, "6 / 20"
//   mode null        — seconds left in the phase
export function readout(snap) {
  if (snap.openEnded) return { phase: snap.phase.name, count: formatClock(snap.elapsed), mode: 'stopwatch' };
  if (snap.repeat > 1) return { phase: snap.phase.name, count: `${snap.rep} / ${snap.repeat}`, mode: 'counter' };
  return { phase: snap.phase.name, count: String(Math.max(1, Math.ceil(snap.remaining / 1000))), mode: null };
}

export function metaText(snap) {
  const parts = [];
  if (Number.isFinite(snap.rounds) && snap.rounds > 1) parts.push(`Round ${snap.round} of ${snap.rounds}`);
  if (snap.repeat > 1) parts.push(snap.counter ?? 'Breath');
  if (snap.sessionMs != null) parts.push(`${formatClock(Math.max(0, snap.sessionMs - snap.sessionElapsed))} left`);
  return parts.join(' · ');
}

// Status under the shape: rounds / time left, plus room for the hold button.
export function createLabels() {
  const root = el('div', 'labels');
  const meta = el('div', 'meta', { hidden: true });
  root.append(meta);

  let last = null;
  function update(snap) {
    const text = metaText(snap);
    if (text === last) return;
    last = text;
    meta.textContent = text;
    meta.hidden = !text;
  }

  return { root, update };
}
