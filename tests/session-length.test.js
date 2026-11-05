import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lengthOptions, loadLength, saveLength, applyLength, totalCycles, cycleStatus } from '../js/session-length.js';
import { normalize } from '../js/config.js';
import { readdirSync } from 'node:fs';

function memoryStorage() {
  const store = new Map();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
}

test('options are No limit, then minutes; lengths are time only (#147)', () => {
  assert.deepEqual(lengthOptions({ minutes: [5, 10] }).map(o => o.label), ['No limit', '5 min', '10 min']);
  assert.equal(lengthOptions({ cycles: [4] }), null, 'cycle counts are no longer lengths');
  assert.equal(lengthOptions(null), null);
});

test('No limit by default; the last choice is remembered per technique', () => {
  const storage = memoryStorage();
  const opts = lengthOptions({ minutes: [5, 10] });
  assert.equal(loadLength(storage, 'box', opts).key, 'none');
  saveLength(storage, 'box', opts[2]);
  assert.equal(loadLength(storage, 'box', opts).key, '10m');
  assert.equal(loadLength(storage, 'resonance', opts).key, 'none');
  assert.equal(loadLength(null, 'box', opts).key, 'none', 'no storage: No limit');
});

test('applying an option sets the time and clears any cycle limit', () => {
  const calls = [];
  const tl = { setSessionMs: (v) => calls.push(['ms', v]), setSessionCycles: (v) => calls.push(['cycles', v]) };
  applyLength(tl, { key: '5m', minutes: 5 });
  applyLength(tl, { key: 'none' });
  assert.deepEqual(calls, [['ms', 300_000], ['cycles', null], ['ms', null], ['cycles', null]]);
});

test('a length holds whole cycles: a part cycle at the end counts as one', () => {
  assert.equal(totalCycles({ sessionMs: 300_000, cycleMs: 12_000 }), 25);
  assert.equal(totalCycles({ sessionMs: 180_000, cycleMs: 16_000 }), 12, '11.25 cycles run to 12');
  assert.equal(totalCycles({ sessionMs: null, cycleMs: 16_000 }), null, 'No limit');
  assert.equal(totalCycles({ sessionMs: 180_000, cycleMs: null }), null, 'open-ended hold');
  // Partway through: cycles done, plus what fits in the time left from this cycle's start.
  assert.equal(totalCycles({ sessionMs: 300_000, cycleMs: 12_000, round: 4, cycleStartMs: 36_000 }), 25);
  assert.equal(totalCycles({ sessionMs: 300_000, cycleMs: 24_000, round: 4, cycleStartMs: 36_000 }), 14, 'a slower pace mid-session');
  assert.equal(totalCycles({ sessionMs: 300_000, cycleMs: 12_000, round: 26, finished: true }), 26);
});

test('the counter shows cycles and time together', () => {
  assert.equal(cycleStatus({ round: 4, sessionElapsed: 41_000 }, null), 'Cycle 4 · 0:41');
  assert.equal(cycleStatus({ round: 4, sessionElapsed: 41_200, sessionMs: 300_000 }, 25), 'Cycle 4 of 25 · 4:19 left');
});

test('every technique that never ends on its own offers a length', async () => {
  for (const f of readdirSync(new URL('../configs', import.meta.url))) {
    const cfg = normalize((await import(`../configs/${f}`)).default);
    const ends = cfg.sessionMinutes || cfg.sessionChoices || Number.isFinite(cfg.sequence.rounds) || cfg.variants?.some(v => Number.isFinite(v.sequence.rounds));
    if (!ends) assert.ok(cfg.lengths?.minutes?.length, `${f} runs forever without a length in minutes`);
  }
});
