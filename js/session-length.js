import { formatClock } from './ui/labels.js';

// Session length for techniques that otherwise run until you leave (#116). A config
// lists `lengths: { minutes: [5, 10] }` or `lengths: { cycles: [4, 8] }`; "No limit"
// always comes first. The chip under the cycle counter steps through them while the
// session runs, and the last choice is remembered per technique.

const KEY = (id) => `breathing:length:${id}`;
export const NO_LIMIT = { key: 'none', label: 'No limit' };

// Pure: a config's lengths as options, or null when it has none.
export function lengthOptions(lengths) {
  if (!lengths) return null;
  const minutes = (lengths.minutes ?? []).map(m => ({ key: `${m}m`, label: `${m} min`, minutes: m }));
  const cycles = (lengths.cycles ?? []).map(n => ({ key: `${n}c`, label: `${n} cycles`, cycles: n }));
  return [NO_LIMIT, ...minutes, ...cycles];
}

export function loadLength(storage, id, options) {
  let key = null;
  try { key = storage?.getItem(KEY(id)); } catch { /* no storage */ }
  return options.find(o => o.key === key) ?? options[0];
}

export function saveLength(storage, id, option) {
  try { storage?.setItem(KEY(id), option.key); } catch { /* best-effort */ }
}

// Pure: the option after this one, wrapping round to No limit.
export function nextLength(options, option) {
  return options[(options.indexOf(option) + 1) % options.length];
}

// Puts the option on a timeline.
export function applyLength(timeline, option) {
  timeline.setSessionMs(option.minutes ? option.minutes * 60_000 : null);
  timeline.setSessionCycles(option.cycles ?? null);
}

// Pure: the chip's text for an option at this point of the session.
export function lengthLabel(option, snap) {
  if (option.minutes) {
    const left = Math.max(0, option.minutes * 60_000 - (snap?.sessionElapsed ?? 0));
    return `${option.label} · ${formatClock(left)} left`;
  }
  if (option.cycles) {
    const left = Math.max(0, option.cycles - ((snap?.round ?? 1) - 1));
    return `${option.label} · ${left} left`;
  }
  return option.label;
}
