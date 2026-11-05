import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampHz, bandFor, isochronicGain, hapticPattern, timingStats, BLOCK_MS, PRESETS } from '../js/entrainment/pulses.js';

test('rates step in 0.5 Hz between 0.5 and 40', () => {
  assert.equal(clampHz(6.3), 6.5);
  assert.equal(clampHz(0), 0.5);
  assert.equal(clampHz(99), 40);
  assert.equal(clampHz('x'), 6);
});

test('presets sit inside their own bands', () => {
  for (const p of PRESETS) assert.equal(bandFor(p.hz), p.key, p.key);
});

test('an isochronic pulse is silent outside its on-time and fades in and out without a click', () => {
  assert.equal(isochronicGain(0, 0.5, 0.1), 0);
  assert.equal(isochronicGain(0.25, 0.5, 0.1), 1);
  assert.ok(Math.abs(isochronicGain(0.05, 0.5, 0.1) - 0.5) < 1e-9, 'halfway up the fade-in');
  assert.equal(isochronicGain(0.7, 0.5, 0.1), 0);
  assert.equal(isochronicGain(1.25, 0.5, 0.1), 1, 'the next beat');
});

test('a vibration block is exactly 2 seconds and never drifts, at any rate', () => {
  for (let hz = 0.5; hz <= 40; hz += 0.5) {
    const p = hapticPattern(hz);
    assert.equal(p.durations.reduce((s, d) => s + d, 0), BLOCK_MS, `${hz} Hz`);
    assert.equal(p.beats, Math.round(hz * 2));
  }
});

test('slow beats are distinct pulses; very fast ones merge into a buzz like the motor would', () => {
  const six = hapticPattern(6, { duty: 0.5 });
  assert.equal(six.durations.length, 24, '12 beats, each on then off');
  assert.ok(six.amplitudes[0] > 0 && six.amplitudes[1] === 0);
  const fast = hapticPattern(40, { duty: 0.5, minOnMs: 30 });
  assert.deepEqual(fast.durations, [BLOCK_MS], 'one long buzz');
});

test('timing stats show how far gaps strayed from the beat', () => {
  const s = timingStats([0, 100, 205, 300], 100);
  assert.equal(s.count, 3);
  assert.equal(s.maxErrorMs, 5);
  assert.ok(Math.abs(s.avgErrorMs - 10 / 3) < 1e-9);
  assert.equal(timingStats([5], 100).count, 0);
});
