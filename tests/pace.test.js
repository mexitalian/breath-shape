import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampPace, durationScaleFor, formatBpm, loadPace, savePace } from '../js/pace.js';
import { normalize } from '../js/config.js';
import { createTimeline } from '../js/timeline.js';
import resonance from '../configs/resonance.js';

test('resonance pace defaults to 5 bpm from its 12s cycle', () => {
  const { pace } = normalize(resonance);
  assert.equal(pace.baseBpm, 5);
  assert.equal(pace.default, 5);
  assert.equal(durationScaleFor(pace, 5), 1);
  assert.ok(Math.abs(durationScaleFor(pace, 6) - 5 / 6) < 1e-9);
});

test('pace snaps to steps and stays in range', () => {
  const p = { min: 4.5, max: 6.5, step: 0.5 };
  assert.equal(clampPace(p, 5.2), 5);
  assert.equal(clampPace(p, 5.3), 5.5);
  assert.equal(clampPace(p, 2), 4.5);
  assert.equal(clampPace(p, 9), 6.5);
  assert.equal(formatBpm(5), '5');
  assert.equal(formatBpm(5.5), '5.5');
});

test('saved pace is restored, clamped, and storage failures fall back', () => {
  const { pace } = normalize(resonance);
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  assert.equal(loadPace(storage, 'resonance', pace), 5);
  savePace(storage, 'resonance', 6);
  assert.equal(loadPace(storage, 'resonance', pace), 6);
  data.set('breathing:pace:resonance', '42');
  assert.equal(loadPace(storage, 'resonance', pace), 6.5);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadPace(broken, 'resonance', pace), 5);
  assert.doesNotThrow(() => savePace(broken, 'resonance', 6));
});

test('pace change waits for the next breath, then rescales phases', () => {
  const cfg = normalize(resonance);
  const tl = createTimeline(cfg.sequence);
  tl.start(0);
  tl.setDurationScale(0.5);
  assert.equal(tl.tick(3000).phase.name, 'Inhale', 'current breath keeps its old length');
  assert.equal(tl.tick(6000).phase.name, 'Exhale');
  assert.equal(tl.tick(12000).phase.name, 'Inhale', 'new breath starts on schedule');
  assert.equal(tl.tick(14999).phase.name, 'Inhale');
  assert.equal(tl.tick(15000).phase.name, 'Exhale', 'new breath is half as long');
  assert.equal(tl.tick(18000).phase.name, 'Inhale');
});

test('immediate scale before start applies from the first breath', () => {
  const cfg = normalize(resonance);
  const tl = createTimeline(cfg.sequence);
  tl.setDurationScale(2, { immediate: true });
  tl.start(0);
  assert.equal(tl.tick(11999).phase.name, 'Inhale');
  assert.equal(tl.tick(12000).phase.name, 'Exhale');
});
