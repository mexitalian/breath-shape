import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pulses, impactStyleFor, isNativeApp, nativePlugin } from '../js/native.js';

test('vibration patterns become timed pulses', () => {
  assert.deepEqual(pulses([120]), [{ at: 0, duration: 120 }]);
  assert.deepEqual(pulses([30, 60, 30]), [{ at: 0, duration: 30 }, { at: 90, duration: 30 }]);
  assert.deepEqual(pulses(200), [{ at: 0, duration: 200 }]);
  assert.equal(pulses(Array.from({ length: 160 }, (_, i) => (i % 2 ? 40 : 60))).length, 80);
});

test('pulse length maps to an iOS tap strength', () => {
  assert.equal(impactStyleFor(25), 'LIGHT');
  assert.equal(impactStyleFor(60), 'MEDIUM');
  assert.equal(impactStyleFor(120), 'HEAVY');
});

test('outside the app there is no native bridge', () => {
  assert.equal(isNativeApp, false);
  assert.equal(nativePlugin('Haptics'), null);
});
