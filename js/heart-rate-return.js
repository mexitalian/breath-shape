// Heart rate after a session (#118): the session summary's "Check heart rate" link
// says where you came from, so the page can lead back there and compare the new
// reading with one taken shortly before the session.
import { HEART_RATE } from './history.js';

export const BEFORE_WINDOW_MS = 30 * 60_000;

// Pure: the summary's link to Heart rate for a session.
export function heartRateLink({ page, title, startedAt }) {
  const q = new URLSearchParams({ from: page, title, since: String(startedAt) });
  return `heart-rate.html?${q}`;
}

// Pure: where to go back to, from the page's query string, or null. Only the app's own
// technique pages count, so the link can't be pointed anywhere else.
export function returnTarget(search) {
  const q = new URLSearchParams(search);
  const page = q.get('from');
  if (!page || !/^[a-z0-9-]+\.html$/.test(page) || page === 'heart-rate.html' || page === 'index.html') return null;
  const since = Number(q.get('since'));
  return { page, title: (q.get('title') || 'the technique').slice(0, 60), since: Number.isFinite(since) && since > 0 ? since : null };
}

// Pure: the latest heart-rate reading from up to 30 minutes before the session.
export function readingBefore(history, since) {
  if (!since) return null;
  return history
    .filter(e => e.kind === HEART_RATE && Number.isFinite(e.heartRate) && e.startedAt <= since && since - e.startedAt <= BEFORE_WINDOW_MS)
    .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
}

const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');

// Pure: "Before the session: 72 → 64 bpm (−8) · HRV 38 → 45 ms (+7)".
export function changeText(before, after) {
  const parts = [`Before the session: ${before.heartRate} → ${after.heartRate} bpm (${signed(after.heartRate - before.heartRate)})`];
  if (before.hrv != null && after.hrv != null) parts.push(`HRV ${before.hrv} → ${after.hrv} ms (${signed(after.hrv - before.hrv)})`);
  return parts.join(' · ');
}
