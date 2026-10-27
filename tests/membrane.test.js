import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringGeometry, membraneClip, sagFor, sizeFor } from '../js/fluid/membrane.js';

test('a still circle draws as a circle a little inside its box', () => {
  const g = ringGeometry('circle', 8);
  const clip = membraneClip(g, new Array(8).fill(0), 100);
  // First point straight up: 50% across, 50 − 45 = 5% down.
  assert.ok(clip.startsWith('polygon(50.00% 5.00%,'), clip);
});

test('pushing in moves the edge towards the centre; bulging out moves it away', () => {
  const g = ringGeometry('circle', 4); // up, right, down, left
  const clip = membraneClip(g, [10, 0, -10, 0], 100);
  const [top, , bottom] = clip.slice(8, -1).split(',');
  assert.equal(top, '50.00% 9.50%', 'top pressed in by 10%');
  assert.equal(bottom, '50.00% 99.50%', 'bottom bulging out');
});

test('upright, gravity bulges the bottom and lifts the top', () => {
  const g = ringGeometry('circle', 4);
  const [top, right, bottom] = sagFor(g, { x: 0, y: 1 }, 100);
  assert.ok(bottom < 0 && top > 0 && Math.abs(right) < 1e-9);
});

test('square and triangle edges follow their outlines', () => {
  const box = ringGeometry('box', 8);
  assert.ok(Math.abs(box.radii[1] - Math.SQRT2) < 1e-9, 'corner direction reaches the corner');
  const tri = ringGeometry('triangle', 6);
  assert.ok(tri.outline.centre[1] < 0, 'triangle centred on its own middle');
});

test('the size follows the breath, within the technique\'s range or the one from Settings', () => {
  const cfg = { minScale: 0.6, maxScale: 1 };
  assert.equal(sizeFor(0.6, cfg, null, null), 0.6, 'technique: breathed out');
  assert.equal(sizeFor(1, cfg, null, null), 1, 'technique: breathed in');
  assert.equal(sizeFor(0.6, cfg, 0.2, null), 0.2, 'smaller when breathed out');
  assert.ok(Math.abs(sizeFor(0.8, cfg, 0.2, 0.6) - 0.4) < 1e-9, 'halfway through the breath, halfway through the range');
});
