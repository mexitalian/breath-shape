import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerPresent, pulseWave, findBeats, estimateBpm } from '../js/heart-rate.js';

// Simulated camera brightness: a sharp dip at each beat on a drifting baseline,
// with frame noise and a slightly uneven 30 fps frame clock.
function simulate({ bpm, seconds = 15, fps = 30, noise = 0.4, drift = 6, seed = 1 }) {
  let state = seed;
  const rand = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
  const samples = [];
  const period = 60 / bpm;
  for (let t = 0; t < seconds; t += (1 / fps) * (0.9 + rand() * 0.2)) {
    const phase = (t % period) / period;
    const pulse = phase < 0.15 ? Math.sin((phase / 0.15) * Math.PI) : 0;
    const v = 200 + drift * Math.sin(t * 0.4) - 3 * pulse + (rand() - 0.5) * noise * 2;
    samples.push({ t, v });
  }
  return samples;
}

for (const bpm of [48, 62, 75, 96, 130]) {
  test(`a steady ${bpm} bpm pulse reads within 2 bpm`, () => {
    const result = estimateBpm(findBeats(pulseWave(simulate({ bpm }))));
    assert.ok(result != null && Math.abs(result - bpm) <= 2, `got ${result}`);
  });
}

test('pure noise gives no reading', () => {
  let state = 7;
  const rand = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
  const samples = Array.from({ length: 450 }, (_, i) => ({ t: i / 30, v: 200 + (rand() - 0.5) * 6 }));
  assert.equal(estimateBpm(findBeats(pulseWave(samples))), null);
});

test('too few beats gives no reading', () => {
  assert.equal(estimateBpm([0, 0.8, 1.6]), null);
  assert.equal(estimateBpm([]), null);
});

test('a lit fingertip is detected, an open camera is not', () => {
  assert.equal(fingerPresent({ r: 210, g: 40, b: 30 }), true);
  assert.equal(fingerPresent({ r: 120, g: 110, b: 100 }), false);
  assert.equal(fingerPresent({ r: 40, g: 5, b: 5 }), false);
});
