import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counterMode, cycleState, cycleFill, scaleRange } from '../js/ui/cycle-counter.js';
import { normalize } from '../js/config.js';
import box from '../configs/box.js';
import sigh from '../configs/sigh.js';

test('open-ended patterns count up, round-based ones have a target, single rounds have none', () => {
  assert.deepEqual(counterMode({ rounds: Infinity }), { mode: 'up', total: null });
  assert.deepEqual(counterMode({ rounds: 3 }), { mode: 'target', total: 3 });
  assert.equal(counterMode({ rounds: 1 }), null);
});

test('cycles before the current one are done, the current one is active, the rest wait', () => {
  const snap = { round: 2, finished: false };
  assert.deepEqual([0, 1, 2].map(i => cycleState(i, snap)), ['done', 'active', 'upcoming']);
});

test('when the session finishes, the last cycle is done too', () => {
  const snap = { round: 3, finished: true };
  assert.deepEqual([0, 1, 2].map(i => cycleState(i, snap)), ['done', 'done', 'done']);
});

test('a mini shape fills as you breathe in and stays full (#147)', () => {
  const range = scaleRange(normalize(box));
  assert.deepEqual(range, { lo: 0.72, hi: 1 });
  assert.equal(cycleFill(0.72, range), 0, 'empty at the start of the in-breath');
  assert.ok(Math.abs(cycleFill(0.86, range) - 0.5) < 1e-9, 'half way in');
  assert.equal(cycleFill(1, range), 1, 'full once the breath is in');
  // The engine passes the peak so far, so breathing out leaves it full.
  assert.equal(cycleFill(Math.max(1, 0.72), range), 1);
});

test('a two-step in-breath fills in two steps', () => {
  const range = scaleRange(normalize(sigh));
  assert.ok(cycleFill(0.82, range) > 0.5 && cycleFill(0.82, range) < 1, 'after the first inhale');
  assert.equal(cycleFill(1, range), 1, 'full after the sip');
});
