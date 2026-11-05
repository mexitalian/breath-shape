import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shrinkScale, fillLevel, isCovered, SHRINK_MIN } from '../js/ui/session-layout.js';
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

test('Session layout setting: Sticky by default, unknown values fall back', () => {
  assert.equal(readSettings(store({})).sessionLayout, 'sticky');
  assert.equal(readSettings(store({ sessionLayout: 'fill' })).sessionLayout, 'fill');
  assert.equal(readSettings(store({ sessionLayout: 'squash' })).sessionLayout, 'sticky');
});
