import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOGUE, OUTCOMES, rankFor, whyFor, nearest, deckFor, fitsTime, timeLabel } from '../js/pickers/catalogue.js';
import { closestLength } from '../js/pickers/parts.js';
import { readSettings, PICKERS } from '../js/settings.js';

// The techniques as Home lists them: page, group, hue, from index.html.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sections = [...html.matchAll(/data-group="([a-z-]+)"[\s\S]*?<\/section>/g)];
const techniques = sections.flatMap(([block, group]) =>
  [...block.matchAll(/href="([a-z0-9-]+\.html)" data-hue style="--hue: (\d+)"[\s\S]*?technique__name">([^<]+)</g)]
    .map(([, href, hue, name]) => ({ href, name, hue: Number(hue), group, outcome: OUTCOMES.find(o => o.group === group).key, safety: false, ...CATALOGUE[href] })));

test('every technique on Home has picker details, and every detail has a technique (#151)', () => {
  assert.deepEqual(Object.keys(CATALOGUE).sort(), techniques.map(t => t.href).sort());
  for (const t of techniques) {
    assert.ok(t.minutes && t.places?.length && t.shape && t.why, t.href);
    if (t.outcome !== 'measure') assert.ok(t.at >= 0 && t.at <= 1, `${t.href} sits on the spectrum`);
  }
});

test('the spectrum runs from sleep to wide awake in the colour order of the groups', () => {
  const max = (k) => Math.max(...techniques.filter(t => t.outcome === k).map(t => t.at));
  const min = (k) => Math.min(...techniques.filter(t => t.outcome === k).map(t => t.at));
  assert.ok(max('down') < min('balance') && max('balance') < min('up'));
  assert.equal(nearest(techniques, 0)[0].href, '478-breathing.html');
  assert.equal(nearest(techniques, 1)[0].href, 'connected-breathing.html');
  assert.equal(nearest(techniques, 0.5, 5).filter(t => t.outcome === 'measure').length, 0, 'measuring has no place on the scale');
});

test('the questions put the best fit first: time and place both count', () => {
  const sleepy = rankFor(techniques, { outcome: 'down', time: 'mid', place: 'bed' });
  assert.ok(sleepy.every(t => t.outcome === 'down'));
  assert.ok(sleepy[0].places.includes('bed') && fitsTime(sleepy[0], 'mid'));
  assert.equal(sleepy[0].href, '478-breathing.html', 'in bed, the sleepiest that fits');
  const quick = rankFor(techniques, { outcome: 'down', time: 'short', place: 'out' });
  assert.equal(quick[0].href, 'physiological-sigh.html');
  assert.ok(rankFor(techniques, { outcome: 'balance', place: 'out' }).slice(0, 2).every(t => t.places.includes('out')));
  assert.equal(rankFor(techniques, { outcome: 'measure' })[0].href, 'heart-rate.html');
});

test('the best fit says why', () => {
  const t = techniques.find(x => x.href === '478-breathing.html');
  assert.equal(whyFor(t, { time: 'mid', place: 'bed' }), 'The long out-breath is made for sleep, and you can do it lying down, and it fits about 5 min.');
  assert.equal(whyFor(t), 'The long out-breath is made for sleep.');
});

test('the swipe deck starts with one of each outcome, and the pills narrow it', () => {
  const deck = deckFor(techniques);
  assert.equal(deck.length, techniques.length);
  assert.deepEqual(deck.slice(0, 4).map(t => t.outcome), ['down', 'balance', 'up', 'measure']);
  assert.ok(deckFor(techniques, 'up').every(t => t.outcome === 'up'));
});

test('times read naturally and map to the nearest session length', () => {
  assert.equal(timeLabel([4, 4]), 'about 4 min');
  assert.equal(timeLabel([5, 20]), '5–20 min');
  assert.equal(closestLength([3, 5, 10], 2), 3);
  assert.equal(closestLength([5, 10, 20], 10), 10);
  assert.equal(closestLength(undefined, 5), null);
});

test('the picker setting defaults to the list and ignores unknown values', () => {
  assert.deepEqual(PICKERS, ['list', 'swipe', 'questions', 'spectrum']);
  assert.equal(readSettings(null).picker, 'list');
  const store = { getItem: () => JSON.stringify({ picker: 'tarot' }) };
  assert.equal(readSettings(store).picker, 'list');
});
