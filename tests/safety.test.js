import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAFETY_POINTS, safetyPoints, hasAcknowledged, rememberAcknowledged, safetyKey } from '../js/ui/safety.js';
import { normalize } from '../js/config.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

const throwingStorage = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
};

test('safety points can be extended per technique', () => {
  assert.deepEqual(safetyPoints(true), SAFETY_POINTS);
  assert.deepEqual(safetyPoints({ extra: ['Do not hold past discomfort.'] }).at(-1), 'Do not hold past discomfort.');
});

test('acknowledgement is remembered per technique id', () => {
  const s = memoryStorage();
  assert.equal(hasAcknowledged(s, 'wim-hof'), false);
  assert.equal(rememberAcknowledged(s, 'wim-hof'), true);
  assert.equal(hasAcknowledged(s, 'wim-hof'), true);
  assert.equal(hasAcknowledged(s, 'tummo'), false);
  assert.equal(s.getItem(safetyKey('wim-hof')), '1');
});

test('unavailable storage fails safe: always show the screen', () => {
  assert.equal(hasAcknowledged(null, 'x'), false);
  assert.equal(hasAcknowledged(throwingStorage, 'x'), false);
  assert.equal(rememberAcknowledged(throwingStorage, 'x'), false);
});

test('config gets a stable id and safety flag', () => {
  const cfg = normalize({ title: 'Wim Hof Method', safety: true, phases: [{ name: 'In', dur: 1, scale: 1 }] });
  assert.equal(cfg.id, 'wim-hof-method');
  assert.equal(cfg.safety, true);
  assert.equal(normalize({ title: 'Box', phases: [{ name: 'In', dur: 1, scale: 1 }] }).safety, false);
});
