import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heartRateLink, returnTarget, readingBefore, changeText, BEFORE_WINDOW_MS } from '../js/heart-rate-return.js';

test('the summary link carries the technique, and the page reads it back', () => {
  const link = heartRateLink({ page: 'box-breathing.html', title: 'Box Breathing', startedAt: 1_000 });
  assert.equal(link, 'heart-rate.html?from=box-breathing.html&title=Box+Breathing&since=1000');
  assert.deepEqual(returnTarget(link.split('?')[1]), { page: 'box-breathing.html', title: 'Box Breathing', since: 1000 });
});

test('only the app\'s own technique pages can be a way back', () => {
  for (const from of ['https://evil.example/x.html', '//evil.example', 'javascript:alert(1)', '../x.html', 'heart-rate.html', 'index.html', '']) {
    assert.equal(returnTarget(`from=${encodeURIComponent(from)}`), null, from);
  }
});

test('the reading to compare with is the latest one up to 30 minutes before the session', () => {
  const since = 10_000_000;
  const hr = (startedAt, heartRate, hrv = null) => ({ kind: 'heart-rate', startedAt, heartRate, hrv });
  const history = [
    hr(since - BEFORE_WINDOW_MS - 1, 90),       // too early
    hr(since - 20 * 60_000, 76),
    hr(since - 5 * 60_000, 72, 38),             // the one
    { kind: 'session', startedAt: since - 60_000 },
    hr(since + 60_000, 60),                     // after the session started
  ];
  assert.equal(readingBefore(history, since).heartRate, 72);
  assert.equal(readingBefore(history, null), null);
  assert.equal(readingBefore([], since), null);
});

test('the change reads plainly, with HRV when both readings have it', () => {
  assert.equal(changeText({ heartRate: 72, hrv: 38 }, { heartRate: 64, hrv: 45 }), 'Before the session: 72 → 64 bpm (−8) · HRV 38 → 45 ms (+7)');
  assert.equal(changeText({ heartRate: 64, hrv: null }, { heartRate: 64, hrv: 50 }), 'Before the session: 64 → 64 bpm (±0)');
});
