import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiquidSim } from '../js/fluid/liquid-sim.js';

const params = { waveSpeed: 400, friction: 1.5, settlePull: 8, maxRise: 60, maxDepth: 60 };
const run = (sim, seconds, fps = 60) => { for (let n = Math.round(seconds * fps); n > 0; n--) sim.step(1 / fps); };

test('a splash travels, then the surface settles flat', () => {
  const sim = new LiquidSim(360, params);
  sim.impulse(90, 40, 600);
  run(sim, 0.4); // 400 px/s: far enough to pass the middle
  assert.ok(Math.abs(sim.h[Math.round(sim.count * 0.6)]) > 0.1, 'the wave reached the far side');
  run(sim, 12);
  assert.ok(sim.isSettled, 'comes to rest');
});

test('tilting the phone slopes the surface, and it settles on the slope', () => {
  const sim = new LiquidSim(360, params);
  sim.setSlope(0.3);
  run(sim, 15);
  assert.ok(sim.isSettled);
  assert.ok(Math.abs(sim.h[sim.count - 1] - 0.3 * 180) < 1, `right side sits lower: ${sim.h[sim.count - 1]}`);
  assert.ok(Math.abs(sim.h[0] + 0.3 * 180) < 1, 'left side higher');
});

test('the same motion at 60 Hz and 120 Hz', () => {
  const a = new LiquidSim(360, params);
  const b = new LiquidSim(360, params);
  a.impulse(180, 60, 500);
  b.impulse(180, 60, 500);
  run(a, 0.5, 60);
  run(b, 0.5, 120);
  for (let i = 0; i < a.count; i += 10) assert.ok(Math.abs(a.h[i] - b.h[i]) < 1, `point ${i}`);
});

test('a hold presses the surface and it never passes the limits', () => {
  const sim = new LiquidSim(360, params);
  sim.hold(180, 80, 500);
  run(sim, 1);
  const mid = Math.round((sim.count - 1) / 2);
  // The settle spring holds it a little short of the target.
  assert.ok(sim.h[mid] > params.maxDepth - 4 && sim.h[mid] <= params.maxDepth, `pressed to the limit: ${sim.h[mid]}`);
  sim.release();
  run(sim, 15);
  assert.ok(sim.isSettled);
});
