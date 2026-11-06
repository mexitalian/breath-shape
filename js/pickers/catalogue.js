import { FORM_OF_PAGE } from '../forms.js';

// Ways to pick a breath on Home (#151): Swipe cards, Guided questions and the Colour
// spectrum, next to today's list. Settings → Choose a breath picks one; it's there for
// trying them out. The words and colours come from Home's own list (index.html), so
// nothing is said twice; this file adds what the pickers need on top.

// The outcome groups, named after what you want to feel (#151 naming A).
export const OUTCOMES = [
  { key: 'down', group: 'calm-and-sleep', label: 'Wind down', sub: 'Settle, slow down, get ready for sleep', hue: 240, shape: 'circle' },
  { key: 'balance', group: 'focus-and-balance', label: 'Balance', sub: 'Clear and steady, for focus', hue: 145, shape: 'box' },
  { key: 'up', group: 'energise', label: 'Wake up', sub: 'Energy and warmth. Sit or lie down', hue: 30, shape: 'circle' },
  { key: 'measure', group: 'measure-and-train', label: 'Measure', sub: 'Check your heart rate, or train your breath', hue: 330, shape: 'circle' },
];
export const outcomeOf = (group) => OUTCOMES.find(o => o.group === group) ?? null;

// Per technique (by page):
//   at      — where it sits from sleep (0) to wide awake (1), for the spectrum
//   minutes — a typical session, [shortest, longest]
//   places  — where it suits: in bed, sitting, out and about
//   shape   — the shape it's drawn as
//   why     — why it fits, for the guided questions' best fit
export const CATALOGUE = {
  '478-breathing.html': { at: 0, minutes: [3, 10], places: ['bed', 'sit'], shape: 'circle', why: 'The long out-breath is made for sleep' },
  'extended-exhale.html': { at: 0.08, minutes: [5, 10], places: ['bed', 'sit'], shape: 'circle', why: 'Breathing out twice as long as in slows everything down' },
  'resonance-breathing.html': { at: 0.18, minutes: [5, 20], places: ['bed', 'sit'], shape: 'circle', why: 'Even, slow breathing settles your heart rhythm' },
  'bhramari.html': { at: 0.24, minutes: [3, 10], places: ['sit', 'bed'], shape: 'circle', why: 'The hum on the out-breath quiets a busy mind' },
  'pursed-lip-breathing.html': { at: 0.3, minutes: [2, 5], places: ['sit', 'out', 'bed'], shape: 'circle', why: 'Slowing the out-breath eases breathlessness' },
  'physiological-sigh.html': { at: 0.34, minutes: [1, 3], places: ['sit', 'out', 'bed'], shape: 'circle', why: 'It takes the edge off stress in a few breaths' },
  'alternate-nostril.html': { at: 0.42, minutes: [5, 10], places: ['sit'], shape: 'circle', why: 'Breathing one side at a time is calming and balancing' },
  'triangle-breathing.html': { at: 0.5, minutes: [3, 10], places: ['sit', 'out'], shape: 'triangle', why: 'A gentle, even pattern for a clear head' },
  'box-breathing.html': { at: 0.56, minutes: [3, 10], places: ['sit', 'out'], shape: 'box', why: 'Four equal sides keep you steady under pressure' },
  'kapalabhati.html': { at: 0.7, minutes: [4, 4], places: ['sit'], shape: 'circle', why: 'Short belly pumps wake you up fast' },
  'bhastrika.html': { at: 0.78, minutes: [4, 4], places: ['sit'], shape: 'circle', why: 'Bellows breathing fans up energy' },
  'wim-hof.html': { at: 0.86, minutes: [10, 15], places: ['sit', 'bed'], shape: 'circle', why: 'Power breaths and long holds, for a big lift' },
  'tummo.html': { at: 0.93, minutes: [10, 15], places: ['sit'], shape: 'circle', why: 'Held, squeezed breaths build heat' },
  'connected-breathing.html': { at: 1, minutes: [15, 30], places: ['bed', 'sit'], shape: 'circle', why: 'Fast breathing with no pauses, the strongest of all' },
  'heart-rate.html': { minutes: [1, 1], places: ['sit', 'bed'], shape: 'circle', why: 'See your heart rate and HRV, before and after a session' },
  'buteyko.html': { minutes: [4, 4], places: ['sit'], shape: 'circle', why: 'Light breathing, and a measure of how long you can pause' },
};

export const TIMES = [
  { key: 'short', label: '1–2 min', range: [0, 3] },
  { key: 'mid', label: 'About 5 min', range: [3, 7] },
  { key: 'long', label: '10 min or more', range: [8, Infinity] },
];
export const PLACES = [
  { key: 'bed', label: 'In bed', sub: 'Lying down, lights low' },
  { key: 'sit', label: 'Sitting', sub: 'At a desk, on the sofa' },
  { key: 'out', label: 'Out and about', sub: 'Standing, walking, on a train' },
];

// The techniques on this Home page, read from its list, with the catalogue added.
// Rows hidden on this device (e.g. no camera flash on the desktop app) are left out.
export function readTechniques(doc = document) {
  return [...doc.querySelectorAll('[data-group] a.technique')]
    .filter(a => getComputedStyle(a.closest('li') ?? a).display !== 'none')
    .map((a) => {
      const href = a.getAttribute('href');
      const group = a.closest('[data-group]').dataset.group;
      return {
        href,
        name: a.querySelector('.technique__name')?.textContent.trim() ?? '',
        pattern: a.querySelector('.technique__pattern')?.textContent.trim() ?? '',
        use: a.querySelector('.technique__use')?.textContent.trim() ?? '',
        hue: Number(a.style.getPropertyValue('--hue')) || 0,
        group,
        outcome: outcomeOf(group)?.key ?? null,
        safety: !!a.querySelector('.chip'),
        form: FORM_OF_PAGE[href] ?? null,
        ...CATALOGUE[href],
      };
    })
    .filter(t => t.minutes);
}

// Pure: "5–10 min", "about 4 min".
export function timeLabel([lo, hi]) {
  if (lo === hi) return `about ${lo} min`;
  return `${lo}–${hi} min`;
}

// Pure: does a technique fit a time choice?
export function fitsTime(t, timeKey) {
  const time = TIMES.find(x => x.key === timeKey);
  if (!time) return true;
  const [lo, hi] = time.range;
  return t.minutes[0] <= hi && t.minutes[1] >= lo;
}

// Pure: the guided questions' answer. Techniques for the outcome, best fit first:
// fitting the time and the place each count, then the list's own order breaks ties.
export function rankFor(techniques, { outcome, time = null, place = null }) {
  const pool = techniques.filter(t => t.outcome === outcome);
  const score = (t) => (time && fitsTime(t, time) ? 2 : 0) + (place && t.places.includes(place) ? 2 : 0)
    // Out and about: something you can do standing matters more than the time.
    + (place && !t.places.includes(place) ? -3 : 0);
  // In bed, among equals, the sleepier the better.
  const lean = (t) => (place === 'bed' && Number.isFinite(t.at) ? t.at : 0);
  return pool
    .map((t, i) => ({ t, s: score(t), i }))
    .sort((a, b) => b.s - a.s || lean(a.t) - lean(b.t) || a.i - b.i)
    .map(x => x.t);
}

// Pure: the best fit's reason, in a sentence or two.
export function whyFor(t, { time = null, place = null } = {}) {
  const bits = [];
  if (place === 'bed' && t.places.includes('bed')) bits.push('you can do it lying down');
  if (place === 'out' && t.places.includes('out')) bits.push('you can do it anywhere, eyes open');
  if (time && fitsTime(t, time)) bits.push(`it fits ${TIMES.find(x => x.key === time).label.toLowerCase()}`);
  const tail = bits.length ? `, and ${bits.join(', and ')}` : '';
  return `${t.why}${tail}.`;
}

// Pure: the spectrum's answer. Techniques on the scale, nearest to `at` (0–1) first.
export function nearest(techniques, at, count = 3) {
  return techniques
    .filter(t => Number.isFinite(t.at))
    .map(t => ({ t, d: Math.abs(t.at - at) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map(x => x.t);
}

// Pure: the swipe deck. One of each outcome in turn, so the first cards show the
// range; within an outcome, the list's order. outcome: narrow to one, or null for any.
export function deckFor(techniques, outcome = null) {
  if (outcome) return techniques.filter(t => t.outcome === outcome);
  const byOutcome = OUTCOMES.map(o => techniques.filter(t => t.outcome === o.key));
  const deck = [];
  for (let i = 0; byOutcome.some(list => i < list.length); i++) {
    for (const list of byOutcome) if (list[i]) deck.push(list[i]);
  }
  return deck;
}
