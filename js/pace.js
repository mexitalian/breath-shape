// Adjustable pace in breaths per minute. Scales every timed phase proportionally.

export function normalizePace(pace, steps) {
  if (!pace) return null;
  const cycle = steps[0].phases.reduce((sum, p) => sum + (p.dur ?? 0), 0);
  if (!(cycle > 0)) throw new Error('pace needs a first step with timed phases');
  const { min, max, step = 0.5 } = pace;
  if (!(min > 0 && max >= min)) throw new Error('pace needs 0 < min <= max');
  const baseBpm = 60 / cycle;
  return { min, max, step, baseBpm, default: clampPace({ min, max, step }, pace.default ?? baseBpm) };
}

export function clampPace({ min, max, step }, bpm) {
  const snapped = min + Math.round((bpm - min) / step) * step;
  return +Math.min(max, Math.max(min, snapped)).toFixed(2);
}

// Multiplier applied to phase durations for a given pace.
export const durationScaleFor = (pace, bpm) => pace.baseBpm / bpm;

export const formatBpm = (bpm) => (Number.isInteger(bpm) ? String(bpm) : bpm.toFixed(1));

const paceKey = (id) => `breathing:pace:${id}`;

export function loadPace(storage, id, pace) {
  try {
    const saved = parseFloat(storage?.getItem(paceKey(id)));
    if (Number.isFinite(saved)) return clampPace(pace, saved);
  } catch { /* fall back to the default */ }
  return pace.default;
}

export function savePace(storage, id, bpm) {
  try { storage?.setItem(paceKey(id), String(bpm)); } catch { /* best-effort */ }
}
