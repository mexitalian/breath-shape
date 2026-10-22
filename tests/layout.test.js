import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../js/config.js';
import { createTimeline } from '../js/timeline.js';
import alternate from '../configs/alternate-nostril.js';

test('alternate nostril: split layout with two variants', () => {
  const cfg = normalize(alternate);
  assert.equal(cfg.layout, 'split');
  assert.deepEqual(cfg.split, { hueOffset: 25, labels: ['Left', 'Right'] });
  assert.deepEqual(cfg.variants.map(v => v.label), ['Without holds', 'With holds']);
  assert.equal(cfg.sequence, cfg.variants[0].sequence, 'first variant is the default');
});

test('sides alternate in order, holds light both', () => {
  const cfg = normalize(alternate);
  const sides = (seq) => {
    const tl = createTimeline(seq);
    tl.start(0);
    return seq.steps[0].phases.map((_, i) => tl.tick(i * 4000 + 100).phase.side);
  };
  assert.deepEqual(sides(cfg.variants[0].sequence), ['left', 'right', 'right', 'left']);
  assert.deepEqual(sides(cfg.variants[1].sequence), ['left', 'both', 'right', 'right', 'both', 'left']);
});

test('layout and side are validated', () => {
  const base = { title: 'x', phases: [{ name: 'In', dur: 1, scale: 1 }] };
  assert.equal(normalize(base).layout, 'single');
  assert.throws(() => normalize({ ...base, layout: 'grid' }), /Unknown layout/);
  assert.throws(() => normalize({ title: 'x', phases: [{ name: 'In', dur: 1, scale: 1, side: 'middle' }] }), /unknown side/);
});
