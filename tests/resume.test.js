import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveResume, readResume, clearResume, resumeSummary, RESUME_MS } from '../js/resume.js';
import { createTimeline } from '../js/timeline.js';
import { normalize } from '../js/config.js';
import box from '../configs/box.js';

function memoryStorage() {
  const store = new Map();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
}

const rec = { page: 'box-breathing.html', title: 'Box Breathing', hue: 185, savedAt: 1_000_000, activeMs: 161_000, cycles: 3 };

test('the session you left is offered for 30 minutes, then forgotten', () => {
  const storage = memoryStorage();
  saveResume(rec, storage);
  assert.equal(readResume(rec.savedAt + 60_000, storage)?.title, 'Box Breathing');
  assert.equal(readResume(rec.savedAt + RESUME_MS + 1, storage), null);
  clearResume(storage);
  assert.equal(readResume(rec.savedAt, storage), null);
});

test('broken or missing records are ignored', () => {
  const storage = memoryStorage();
  storage.setItem('breathing:resume', '{oops');
  assert.equal(readResume(0, storage), null);
  assert.equal(readResume(0, null), null);
});

test('the card says how long you breathed and the cycles done', () => {
  assert.equal(resumeSummary(rec), '2:41 · 3 cycles');
  assert.equal(resumeSummary({ activeMs: 20_000, cycles: 1 }), '0:20 · 1 cycle');
  assert.equal(resumeSummary({ activeMs: 12_000, cycles: 0 }), '0:12');
});

test('jumping back in carries on from the start of the cycle you were in', () => {
  const tl = createTimeline(normalize(box).sequence, { sessionMs: 3 * 60_000 });
  // Left during cycle 4 (index 3), which began 48 s in (box cycles are 16 s).
  tl.start(500_000, { round: 3, elapsedMs: 48_000, records: [] });
  const snap = tl.tick(500_000);
  assert.equal(snap.round, 4, 'cycle 4 again');
  assert.equal(snap.phase.name, 'Inhale', 'from its first breath');
  assert.equal(snap.sessionElapsed, 48_000, 'the time already done still counts');
  // 3 min ends with the breath under way: 48 s + 9 cycles of 16 s = 3:12.
  assert.equal(tl.tick(500_000 + (192_000 - 48_000) - 1).finished, false);
  assert.equal(tl.tick(500_000 + (192_000 - 48_000)).finished, true, 'and the 3 minutes end on time');
});
