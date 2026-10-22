import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveSession, readHistory, removeSession, clearHistory, groupByDay, weekTotals, sessionResult, formatDuration, dayLabel } from '../js/history.js';

const memory = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
};
const DAY = 86_400_000;
const now = new Date(2026, 9, 22, 18, 0).getTime();
const entry = (id, startedAt, extra = {}) => ({ id, page: 'box-breathing.html', title: 'Box Breathing', startedAt, durationMs: 300_000, ...extra });

test('sessions are saved, updated in place, removed and cleared', () => {
  const s = memory();
  saveSession(entry('a', now - 1000), s);
  saveSession(entry('a', now - 1000, { durationMs: 600_000 }), s);
  saveSession(entry('b', now), s);
  assert.equal(readHistory(s).length, 2);
  assert.equal(readHistory(s)[0].durationMs, 600_000, 'same id updates');
  removeSession('a', s);
  assert.deepEqual(readHistory(s).map(e => e.id), ['b']);
  clearHistory(s);
  assert.deepEqual(readHistory(s), []);
});

test('broken or missing storage reads as empty', () => {
  assert.deepEqual(readHistory(null), []);
  assert.deepEqual(readHistory({ getItem: () => '{not json' }), []);
  assert.doesNotThrow(() => saveSession(entry('x', now), { getItem: () => null, setItem() { throw new Error('quota'); } }));
});

test('grouped newest first by day, like a watch history', () => {
  const groups = groupByDay([entry('old', now - 3 * DAY), entry('y', now - DAY), entry('t1', now - 3600_000), entry('t2', now - 60_000)], now);
  assert.deepEqual(groups.map(g => g.label).slice(0, 2), ['Today', 'Yesterday']);
  assert.deepEqual(groups[0].entries.map(e => e.id), ['t2', 't1']);
  assert.equal(groups.length, 3);
  assert.equal(dayLabel(now, now), 'Today');
});

test('weekly totals only count the last 7 days', () => {
  const t = weekTotals([entry('a', now - DAY), entry('b', now - 2 * DAY), entry('old', now - 10 * DAY)], now);
  assert.deepEqual(t, { sessions: 2, minutes: 10 });
});

test('result line summarises how the session went', () => {
  assert.equal(sessionResult({ records: [{ label: 'Retention', ms: 45_000 }, { label: 'Retention', ms: 123_000 }], rounds: 3, round: 3, completed: true }), 'Best hold 2:03 · 3 rounds');
  assert.equal(sessionResult({ records: [{ label: 'Control pause · before', ms: 18_000 }, { label: 'Control pause · after', ms: 21_000 }], completed: true }), 'Control pause 0:18 → 0:21 · Completed');
  assert.equal(sessionResult({ rounds: 3, round: 2, completed: false, records: [] }), 'Stopped in round 2 of 3');
  assert.equal(sessionResult({ bpm: 5.5, records: [] }), '5.5 breaths/min');
  assert.equal(sessionResult({ variant: 'With holds', records: [] }), 'With holds');
  assert.equal(formatDuration(65_000), '1 min 5 s');
  assert.equal(formatDuration(40_000), '40 s');
});

test('heart rate checks show their bpm and are left out of practice totals', () => {
  const now = Date.UTC(2026, 9, 22, 12);
  const check = { id: 'hr', kind: 'heart-rate', startedAt: now - 1000, durationMs: 40_000, heartRate: 64 };
  assert.equal(sessionResult(check), '64 bpm');
  assert.deepEqual(weekTotals([check], now), { sessions: 0, minutes: 0 });
});
