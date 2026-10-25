import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gravityFromReading } from '../js/controls/motion.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test('upright phone: down is down the screen', () => {
  const [x, y] = gravityFromReading({ x: 0, y: 9.81, z: 0 });
  close(x, 0);
  close(y, 1);
});

test('tilted onto its right edge: down is to the right', () => {
  // Resting on the right edge, the phone pushes against the floor along -x.
  const [x, y] = gravityFromReading({ x: -9.81, y: 0, z: 0 });
  close(x, 1);
  close(y, 0);
});

test('lying flat: almost no down on the screen', () => {
  const [x, y] = gravityFromReading({ x: 0, y: 0, z: 9.81 });
  close(Math.hypot(x, y), 0);
});

test('landscape (screen turned 90°): upright-in-landscape still reads as down', () => {
  // Turned 90° counter-clockwise, the device's right edge (+x) points up, so the
  // sensor reads +x (away from the floor); on the rotated screen that's down.
  const [x, y] = gravityFromReading({ x: 9.81, y: 0, z: 0 }, 90);
  close(x, 0);
  close(y, 1);
});
