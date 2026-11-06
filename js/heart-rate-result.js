// Heart rate screen (#156): the live signal check, and how a reading compares with
// your own usual and with the one before a session. Pure, so the words are tested.
import { HEART_RATE } from './history.js';

// What the signal check says while a reading runs.
//   none     — no fingertip on the camera
//   settling — finger on, the camera's exposure is still settling
//   press    — finger on but no steady pulse yet: usually pressing too hard or moving
//   good     — a steady pulse
export const SIGNAL_TEXT = {
  none: 'No finger',
  settling: 'Hold still',
  press: 'Press lighter',
  good: 'Good signal',
};

export function signalState({ finger, settled, steady }) {
  if (!finger) return 'none';
  if (!settled) return 'settling';
  return steady ? 'good' : 'press';
}

// The two stages of a reading: heart rate first, then HRV. contactS: seconds of
// contact so far. Returns the line under the dial.
export function stageText(contactS, { hrS = 30, hrvS = 60, hasBpm = false } = {}) {
  if (contactS < hrS || !hasBpm) return `Heart rate in ${Math.max(1, Math.ceil(hrS - contactS))} s`;
  return `Heart rate ✓ · HRV in ${Math.max(1, Math.ceil(hrvS - contactS))} s`;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

// Your usual: the median of your last `count` readings before `before` (ms), or null
// until there are at least `min` of them.
export function usualOf(history, field, { before = Infinity, count = 10, min = 3 } = {}) {
  const values = history
    .filter(e => e.kind === HEART_RATE && Number.isFinite(e[field]) && e.startedAt < before)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, count)
    .map(e => e[field]);
  return values.length >= min ? median(values) : null;
}

// A reading against your usual, in words. Within 5% counts as "about your usual".
// For heart rate lower is calmer; for HRV higher is calmer. dir: 'calmer',
// 'tenser' or 'same', for the colour of the arrow.
export function compareToUsual(value, usual, field, unit) {
  if (value == null) return null;
  if (usual == null) return { text: 'Your usual shows after 3 readings', dir: 'same' };
  const diff = value - usual;
  if (Math.abs(diff) <= Math.max(1, usual * 0.05)) return { text: `About your usual (${usual} ${unit})`, dir: 'same' };
  const calmer = field === 'hrv' ? diff > 0 : diff < 0;
  return { text: `${Math.abs(diff)} ${diff < 0 ? 'lower' : 'higher'} than your usual (${usual} ${unit})`, dir: calmer ? 'calmer' : 'tenser' };
}

// Before and after a session, as rows for the card: [label, before, after, change, dir].
export function beforeAfterRows(before, after) {
  const row = (label, field, unit) => {
    const a = before[field], b = after[field];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const d = b - a;
    const calmer = field === 'hrv' ? d > 0 : d < 0;
    const change = d === 0 ? 'no change' : `${d < 0 ? '↓' : '↑'} ${Math.abs(d)} ${unit}`;
    return { label, before: `${a}`, after: `${b}`, unit, change, dir: d === 0 ? 'same' : calmer ? 'calmer' : 'tenser' };
  };
  return [row('Heart rate', 'heartRate', 'bpm'), row('HRV', 'hrv', 'ms')].filter(Boolean);
}
