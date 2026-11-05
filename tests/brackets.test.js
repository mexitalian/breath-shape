import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bracketPoints } from '../js/components/brackets.js';
import { SHAPES } from '../js/shapes.js';

const close = (a, b) => a.every((p, i) => Math.abs(p[0] - b[i][0]) < 1e-9 && Math.abs(p[1] - b[i][1]) < 1e-9);

test('a box bracket runs from the corner as far as the marker reaches along each side (#148)', () => {
  // Top-left corner of a 360 px box with an 18 px marker.
  const pts = bracketPoints(SHAPES.box.path, 1, 360, 18);
  assert.ok(close(pts, [[0, 18], [0, 0], [18, 0]]), JSON.stringify(pts));
});

test('a triangle bracket follows both sloping sides, the marker\'s edges at that corner', () => {
  const size = 360, marker = 18;
  const [a, v, b] = bracketPoints(SHAPES.triangle.path, 1, size, marker);
  assert.ok(close([v], [[0, 0.067 * size]]), 'the corner itself');
  // Each arm is the marker's edge: marker/size of the full side.
  const side = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const top = side([0, 0.067 * size], [size, 0.067 * size]);
  assert.ok(Math.abs(side(v, b) - top * marker / size) < 1e-9);
  assert.ok(Math.abs(side(v, a) - side([0, 0.067 * size], [size / 2, 0.933 * size]) * marker / size) < 1e-9);
});
