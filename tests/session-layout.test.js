import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shrinkScale, fillLevel, isCovered, liquidClip, surfaceAt, SHRINK_MIN } from '../js/ui/session-layout.js';
import { LiquidSim } from '../js/fluid/liquid-sim.js';
import { readSettings } from '../js/settings.js';

const store = (obj) => ({ getItem: () => JSON.stringify(obj), setItem() {} });

test('Shrink: the shape shrinks as fast as the page scrolls, down to a floor, and is full size at the top', () => {
  assert.equal(shrinkScale(0, 412), 1);
  assert.equal(shrinkScale(-20, 412), 1);
  assert.equal(shrinkScale(103, 412), 0.75);
  assert.equal(shrinkScale(4000, 412), SHRINK_MIN);
  assert.equal(shrinkScale(50, 0), 1);
});

test('Fill: the level follows the breath scale between the technique\'s smallest and largest', () => {
  assert.equal(fillLevel(0.4, 0.4, 1), 0);
  assert.ok(Math.abs(fillLevel(0.7, 0.4, 1) - 0.5) < 1e-9);
  assert.equal(fillLevel(1, 0.4, 1), 1);
  assert.equal(fillLevel(1.2, 0.4, 1), 1);
  assert.equal(fillLevel(0.5, 1, 1), 1);
});

test('Fill: a part flips once the fill passes its middle', () => {
  assert.equal(isCovered({ top: 500, bottom: 540 }, 530), false);
  assert.equal(isCovered({ top: 500, bottom: 540 }, 520), true);
});

test('Session layout setting: Shrink by default; the retired Sticky and unknown values read as Shrink', () => {
  assert.equal(readSettings(store({})).sessionLayout, 'shrink');
  assert.equal(readSettings(store({ sessionLayout: 'fill' })).sessionLayout, 'fill');
  assert.equal(readSettings(store({ sessionLayout: 'sticky' })).sessionLayout, 'shrink');
  assert.equal(readSettings(store({ sessionLayout: 'squash' })).sessionLayout, 'shrink');
});

test('Fill: the liquid is the surface at the level plus the waves, down to the bottom of the screen', () => {
  assert.equal(liquidClip(null, 400, 412), 'polygon(0% 400.0px,100% 400.0px,100% 100%,0% 100%)');
  const sim = new LiquidSim(412, { waveSpeed: 450, friction: 1.3, settlePull: 6, maxRise: 70, maxDepth: 70 });
  sim.setSlope(0.5);
  for (let i = 0; i < 300; i++) sim.step(1 / 60);
  const clip = liquidClip(sim, 400, 412);
  assert.ok(clip.startsWith('polygon(0.00% '), clip);
  assert.ok(clip.endsWith('100% 100%,0% 100%)'), clip);
  assert.ok(surfaceAt(sim, 0) < 0 && surfaceAt(sim, 412) > 0, 'tilted: higher on one side, lower on the other');
  assert.equal(surfaceAt(null, 200), 0);
});
