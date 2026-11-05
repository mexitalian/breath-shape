import { formatClock } from './ui/labels.js';

// "Jump back in" (#117). Leaving a running session stays instant; the app notes where
// you were, and Home offers one tap back into the same session for a while.
const KEY = 'breathing:resume';
export const RESUME_MS = 30 * 60_000;

function defaultStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function saveResume(record, storage = defaultStorage()) {
  try { storage?.setItem(KEY, JSON.stringify(record)); } catch { /* best-effort */ }
}

export function clearResume(storage = defaultStorage()) {
  try { storage?.removeItem(KEY); } catch { /* best-effort */ }
}

// The session to offer, or null when there is none or it is too old.
export function readResume(now = Date.now(), storage = defaultStorage()) {
  let rec = null;
  try { rec = JSON.parse(storage?.getItem(KEY) ?? 'null'); } catch { return null; }
  if (!rec || typeof rec.page !== 'string' || !Number.isFinite(rec.savedAt)) return null;
  if (now - rec.savedAt > RESUME_MS || now < rec.savedAt) return null;
  return rec;
}

// Pure: "2:41 · 3 cycles", what the Home card says you had done.
export function resumeSummary(rec) {
  const parts = [formatClock(rec.activeMs ?? 0)];
  if (rec.cycles > 0) parts.push(`${rec.cycles} ${rec.cycles === 1 ? 'cycle' : 'cycles'}`);
  return parts.join(' · ');
}
