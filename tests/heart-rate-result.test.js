import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signalState, stageText, usualOf, compareToUsual, beforeAfterRows } from '../js/heart-rate-result.js';

const hr = (startedAt, heartRate, hrv = null) => ({ kind: 'heart-rate', startedAt, heartRate, hrv });

test('the signal check: no finger, hold still, press lighter, good (#156)', () => {
  assert.equal(signalState({ finger: false }), 'none');
  assert.equal(signalState({ finger: true, settled: false }), 'settling');
  assert.equal(signalState({ finger: true, settled: true, steady: false }), 'press');
  assert.equal(signalState({ finger: true, settled: true, steady: true }), 'good');
});

test('the ring has two stages: heart rate, then HRV', () => {
  assert.equal(stageText(12), 'Heart rate in 18 s');
  assert.equal(stageText(31, { hasBpm: false }), 'Heart rate in 1 s', 'waits for a steady pulse');
  assert.equal(stageText(40.2, { hasBpm: true }), 'Heart rate ✓ · HRV in 20 s');
});

test('your usual is the median of your recent readings, once there are three', () => {
  const history = [hr(1, 70, 40), hr(2, 66, 30), hr(3, 80, null), hr(4, 64, 50), { kind: 'session', startedAt: 5 }];
  assert.equal(usualOf(history, 'heartRate'), 68);
  assert.equal(usualOf(history, 'hrv'), 40);
  assert.equal(usualOf(history, 'heartRate', { before: 3 }), null, 'only two before that');
  assert.equal(usualOf(history, 'heartRate', { count: 2 }), null, 'needs three');
});

test('a reading against your usual, in words', () => {
  assert.deepEqual(compareToUsual(62, 70, 'heartRate', 'bpm'), { text: '8 lower than your usual (70 bpm)', dir: 'calmer' });
  assert.deepEqual(compareToUsual(30, 40, 'hrv', 'ms'), { text: '10 lower than your usual (40 ms)', dir: 'tenser' });
  assert.deepEqual(compareToUsual(71, 70, 'heartRate', 'bpm'), { text: 'About your usual (70 bpm)', dir: 'same' });
  assert.equal(compareToUsual(64, null, 'heartRate', 'bpm').text, 'Your usual shows after 3 readings');
  assert.equal(compareToUsual(null, 40, 'hrv', 'ms'), null);
});

test('before and after: each change marked, calmer either way', () => {
  assert.deepEqual(beforeAfterRows({ heartRate: 72, hrv: 38 }, { heartRate: 64, hrv: 45 }), [
    { label: 'Heart rate', before: '72', after: '64', unit: 'bpm', change: '↓ 8 bpm', dir: 'calmer' },
    { label: 'HRV', before: '38', after: '45', unit: 'ms', change: '↑ 7 ms', dir: 'calmer' },
  ]);
  assert.equal(beforeAfterRows({ heartRate: 64, hrv: null }, { heartRate: 64, hrv: 40 }).length, 1, 'HRV only when both have it');
  assert.equal(beforeAfterRows({ heartRate: 64 }, { heartRate: 64 })[0].change, 'no change');
});
