import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lengthOptions, loadLength, saveLength, nextLength, lengthLabel, applyLength } from '../js/session-length.js';
import { normalize } from '../js/config.js';
import { readdirSync } from 'node:fs';

function memoryStorage() {
  const store = new Map();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
}

test('options start with No limit, then minutes, then cycles', () => {
  assert.deepEqual(lengthOptions({ minutes: [5, 10] }).map(o => o.label), ['No limit', '5 min', '10 min']);
  assert.deepEqual(lengthOptions({ cycles: [4] }).map(o => o.key), ['none', '4c']);
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

test('tapping steps through the lengths and wraps back to No limit', () => {
  const opts = lengthOptions({ minutes: [3, 5] });
  assert.equal(nextLength(opts, opts[0]).key, '3m');
  assert.equal(nextLength(opts, opts[2]).key, 'none');
});

test('the chip shows what is left', () => {
  const [none, five] = lengthOptions({ minutes: [5] });
  assert.equal(lengthLabel(none, { sessionElapsed: 1000 }), 'No limit');
  assert.equal(lengthLabel(five, { sessionElapsed: 108_000 }), '5 min · 3:12 left');
  const [, four] = lengthOptions({ cycles: [4] });
  assert.equal(lengthLabel(four, { round: 2 }), '4 cycles · 3 left');
});

test('applying an option sets one limit and clears the other', () => {
  const calls = [];
  const tl = { setSessionMs: (v) => calls.push(['ms', v]), setSessionCycles: (v) => calls.push(['cycles', v]) };
  applyLength(tl, { key: '5m', minutes: 5 });
  applyLength(tl, { key: '4c', cycles: 4 });
  assert.deepEqual(calls, [['ms', 300_000], ['cycles', null], ['ms', null], ['cycles', 4]]);
});

test('every technique that never ends on its own offers a length', async () => {
  for (const f of readdirSync(new URL('../configs', import.meta.url))) {
    const cfg = normalize((await import(`../configs/${f}`)).default);
    const ends = cfg.sessionMinutes || cfg.sessionChoices || Number.isFinite(cfg.sequence.rounds) || cfg.variants?.some(v => Number.isFinite(v.sequence.rounds));
    if (!ends) assert.ok(cfg.lengths, `${f} runs forever without a length chip`);
  }
});
