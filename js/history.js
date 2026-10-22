// Passive session history, stored on the device (localStorage).
// Entries are plain JSON so they can later be exported or synced (e.g. to Health).
import { formatClock } from './ui/labels.js';

const KEY = 'breathing:history';
const MAX_ENTRIES = 1000;
export const MIN_SESSION_MS = 30_000;

function defaultStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function readHistory(storage = defaultStorage()) {
  try {
    const list = JSON.parse(storage?.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list, storage) {
  try { storage?.setItem(KEY, JSON.stringify(list.slice(-MAX_ENTRIES))); } catch { /* best-effort */ }
}

// Adds or updates an entry by id (sessions are saved while running and again when they end).
export function saveSession(entry, storage = defaultStorage()) {
  const list = readHistory(storage).filter(e => e.id !== entry.id);
  list.push(entry);
  list.sort((a, b) => a.startedAt - b.startedAt);
  write(list, storage);
}

export function removeSession(id, storage = defaultStorage()) {
  write(readHistory(storage).filter(e => e.id !== id), storage);
}

export function clearHistory(storage = defaultStorage()) {
  try { storage?.removeItem(KEY); } catch { /* best-effort */ }
}

const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export function dayLabel(ms, now = Date.now()) {
  if (dayKey(ms) === dayKey(now)) return 'Today';
  if (dayKey(ms) === dayKey(now - 86_400_000)) return 'Yesterday';
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

// Newest first, grouped by calendar day: [{ label, entries }]
export function groupByDay(list, now = Date.now()) {
  const groups = [];
  for (const entry of [...list].sort((a, b) => b.startedAt - a.startedAt)) {
    const label = dayLabel(entry.startedAt, now);
    const last = groups.at(-1);
    if (last?.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }
  return groups;
}

export function weekTotals(list, now = Date.now()) {
  const since = now - 7 * 86_400_000;
  const recent = list.filter(e => e.startedAt >= since);
  return { sessions: recent.length, minutes: Math.round(recent.reduce((sum, e) => sum + e.durationMs, 0) / 60_000) };
}

export function formatDuration(ms) {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  if (minutes === 0) return `${seconds} s`;
  return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

// One line describing how the session went.
export function sessionResult(e) {
  const parts = [];
  if (e.records?.length) {
    if (e.records.every(r => r.label.startsWith('Control pause'))) {
      parts.push(`Control pause ${e.records.map(r => formatClock(r.ms)).join(' → ')}`);
    } else {
      parts.push(`Best hold ${formatClock(Math.max(...e.records.map(r => r.ms)))}`);
    }
  }
  if (e.rounds) {
    parts.push(e.completed ? `${e.rounds} rounds` : `Stopped in round ${e.round} of ${e.rounds}`);
  } else if (e.completed) {
    parts.push('Completed');
  }
  if (e.bpm) parts.push(`${e.bpm} breaths/min`);
  if (e.variant) parts.push(e.variant);
  return parts.join(' · ');
}
