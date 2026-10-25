import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelFor, surfaceClip, slopeFor } from '../js/fluid/vessel.js';
import { LiquidSim } from '../js/fluid/liquid-sim.js';

test('the breath sets the level: empty-ish when out, nearly full when in', () => {
  assert.ok(Math.abs(levelFor(0.72, 0.72, 1) - 0.88) < 1e-9, 'breathed out: surface low (88% down)');
  assert.ok(Math.abs(levelFor(1, 0.72, 1) - 0.1) < 1e-9, 'breathed in: surface high (10% down)');
  assert.equal(levelFor(5, 0.72, 1), levelFor(1, 0.72, 1), 'clamped');
});

test('the clip follows the surface and closes along the bottom', () => {
  const sim = new LiquidSim(300, { waveSpeed: 300, friction: 1, settlePull: 6, maxRise: 60, maxDepth: 60 });
  const clip = surfaceClip(sim, 150, 300);
  assert.ok(clip.startsWith('polygon(0.00% 50.00%,'), clip.slice(0, 40));
  assert.ok(clip.endsWith('100% 100%,0% 100%)'));
});

test('tilt slopes the surface level with the floor, easing off when the phone lies flat', () => {
  assert.equal(slopeFor({ x: 0, y: 1 }), 0, 'upright: level');
  assert.ok(slopeFor({ x: 0.5, y: 0.85 }) < 0, 'down points down-right: the surface rises to the right (y down)');
  assert.ok(Math.abs(slopeFor({ x: 0.05, y: 0.02 })) < 0.2, 'flat: a weak reading barely tilts');
  assert.equal(slopeFor({ x: 1, y: 0 }), -1, 'clamped');
});
