import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimeline } from '../js/timeline.js';
import { normalize } from '../js/config.js';
import { cuePlan, vibeFor, HUM_MAX_LEVEL } from '../js/cues.js';
import box from '../configs/box.js';
import bhramari from '../configs/bhramari.js';
import kapalabhati from '../configs/kapalabhati.js';

const forecastOf = (raw, horizonMs = 60_000) => {
  const tl = createTimeline(normalize(raw).sequence);
  tl.start(0);
  return tl.forecast(0, { horizonMs });
};

const plan = (raw, opts = {}) => cuePlan({
  title: raw.title,
  forecast: forecastOf(raw),
  vibration: true,
  style: 'taps',
  curve: 'even',
  usage: 'alarm',
  sound: null,
  ...opts,
});

test('taps: each phase plays its own pattern, listed once', () => {
  const p = plan(box);
  assert.deepEqual(p.names, ['Inhale', 'Hold', 'Exhale']);
  assert.deepEqual(p.patterns, [[0, 120], [0, 30, 60, 30]]);
  assert.deepEqual(p.phases.slice(0, 4), [
    [0, 0, 4000, 0, 0, 0],
    [1, 4000, 4000, 1, 1, 0],
    [2, 8000, 4000, 2, 0, 0],
    [3, 12000, 4000, 1, 1, 0],
  ]);
});

test('continuous: inhale ramps up, exhale ramps down, holds are silent', () => {
  const p = plan(box, { style: 'continuous' });
  assert.deepEqual(p.phases.slice(0, 4).map(r => r[4]), [-2, -1, -3, -1]);
  assert.deepEqual(p.patterns, []);
});

test('continuous keeps taps on fast phases', () => {
  const f = forecastOf(kapalabhati);
  const fast = f.phases.find(x => x.durMs < 1500 && x.phase.vibrate);
  assert.ok(fast, 'kapalabhati has fast phases');
  assert.equal(vibeFor(fast, 'continuous'), 'taps');
});

test('vibration off sends no vibration; hum follows the sound setting', () => {
  const quiet = plan(bhramari, { vibration: false });
  assert.ok(quiet.phases.every(r => r[4] === -1));
  assert.ok(quiet.phases.every(r => r[5] === 0), 'no sound, no hum');
  const humming = plan(bhramari, { sound: { tone: 130, volume: 0.5 } });
  assert.deepEqual(humming.phases.slice(0, 2).map(r => r[5]), [0, 1]);
  assert.deepEqual(humming.sound, { tone: 130, level: HUM_MAX_LEVEL * 0.5 });
});
