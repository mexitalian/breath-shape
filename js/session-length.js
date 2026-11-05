import { formatClock } from './ui/labels.js';

// Session length for techniques that otherwise run until you leave (#116, #147). A
// config lists `lengths: { minutes: [3, 5, 10] }`; "No limit" always comes first. A
// toggle under the cycle counter shows every option and can be changed while the
// session runs; the last choice is remembered per technique. Lengths are time only:
// the toggle says how many cycles the time holds at the current pace.

const KEY = (id) => `breathing:length:${id}`;
export const NO_LIMIT = { key: 'none', label: 'No limit' };

// Pure: a config's lengths as options, or null when it has none.
export function lengthOptions(lengths) {
  if (!lengths?.minutes?.length) return null;
  return [NO_LIMIT, ...lengths.minutes.map(m => ({ key: `${m}m`, label: `${m} min`, minutes: m }))];
}

export function loadLength(storage, id, options) {
  let key = null;
  try { key = storage?.getItem(KEY(id)); } catch { /* no storage */ }
  return options.find(o => o.key === key) ?? options[0];
}

export function saveLength(storage, id, option) {
  try { storage?.setItem(KEY(id), option.key); } catch { /* best-effort */ }
}

// Puts the option on a timeline.
export function applyLength(timeline, option) {
  timeline.setSessionMs(option.minutes ? option.minutes * 60_000 : null);
  timeline.setSessionCycles(null);
}

// Pure: how many cycles a session of `sessionMs` runs. A session only ends at the end
// of a cycle, so a part cycle counts as a whole one. round: the cycle under way
// (1-based); cycleStartMs: how far into the session it began.
export function totalCycles({ sessionMs, cycleMs, round = 1, cycleStartMs = 0, finished = false }) {
  if (sessionMs == null || !(cycleMs > 0)) return null;
  if (finished) return round;
  return round - 1 + Math.max(1, Math.ceil((sessionMs - cycleStartMs) / cycleMs - 1e-9));
}

// Pure: the counter's line. Cycles and time together: time so far with No limit,
// time left with a length.
export function cycleStatus(snap, total) {
  if (total == null) return `Cycle ${snap.round} · ${formatClock(snap.sessionElapsed)}`;
  const left = Math.max(0, snap.sessionMs - snap.sessionElapsed);
  return `Cycle ${Math.min(snap.round, total)} of ${total} · ${formatClock(Math.ceil(left / 1000) * 1000)} left`;
}
