import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerPresent, pulseWave, findBeats, estimateBpm, estimateHrv } from '../js/heart-rate.js';

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

// A minute of beats with breathing-driven variation (RSA) and beat-to-beat jitter,
// rendered as camera brightness at ~30 fps. Returns the samples and the true RMSSD.
function simulateRr({ meanMs = 950, rsaMs = 40, jitterMs = 20, seconds = 60, fps = 30, noise = 0.4, seed = 3 }) {
  let state = seed;
  const rand = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
  const beats = [];
  for (let t = 0.5; t < seconds; ) {
    beats.push(t);
    t += (meanMs + rsaMs * Math.sin((2 * Math.PI * t) / 10) + (rand() - 0.5) * 2 * jitterMs) / 1000;
  }
  const rr = beats.slice(1).map((t, i) => (t - beats[i]) * 1000);
  const diffs = rr.slice(1).map((v, i) => v - rr[i]);
  const truth = Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / diffs.length);
  const samples = [];
  let b = 0;
  for (let t = 0; t < seconds; t += (1 / fps) * (0.95 + rand() * 0.1)) {
    while (b < beats.length - 1 && beats[b + 1] <= t) b++;
    const since = t - beats[b];
    const pulse = since >= 0 && since < 0.15 ? Math.sin((since / 0.15) * Math.PI) : 0;
    samples.push({ t, v: 200 + 4 * Math.sin(t * 0.4) - 3 * pulse + (rand() - 0.5) * noise * 2 });
  }
  return { samples, truth };
}

for (const [label, opts] of [['calm', { rsaMs: 25, jitterMs: 10 }], ['typical', {}], ['high HRV', { rsaMs: 70, jitterMs: 35, meanMs: 1050 }]]) {
  test(`HRV (RMSSD) of a ${label} minute reads close to the truth`, () => {
    const { samples, truth } = simulateRr(opts);
    const hrv = estimateHrv(findBeats(pulseWave(samples)));
    assert.ok(hrv != null, 'got a reading');
    assert.ok(Math.abs(hrv - truth) <= Math.max(5, truth * 0.15), `got ${hrv} ms, truth ${truth.toFixed(1)} ms`);
  });
}

test('a noisy minute gives heart rate but no HRV', () => {
  const { samples } = simulateRr({ noise: 2.2 });
  const beats = findBeats(pulseWave(samples));
  assert.equal(estimateHrv(beats), null);
});

test('too short a reading gives no HRV', () => {
  const { samples } = simulateRr({ seconds: 20 });
  assert.equal(estimateHrv(findBeats(pulseWave(samples))), null);
});

test('one movement spike does not hide the beats around it', () => {
  const { samples, truth } = simulateRr({});
  for (const s of samples) if (s.t > 30 && s.t < 30.4) s.v -= 40;
  const hrv = estimateHrv(findBeats(pulseWave(samples)));
  assert.ok(hrv != null && Math.abs(hrv - truth) <= Math.max(6, truth * 0.2), `got ${hrv}, truth ${truth.toFixed(1)}`);
});
