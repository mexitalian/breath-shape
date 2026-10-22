import { test } from 'node:test';
import assert from 'node:assert/strict';
import { counterMode, cycleState } from '../js/ui/cycle-counter.js';

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
