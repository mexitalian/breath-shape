import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMS, FORM_OF_PAGE, withForm, formComponents, pathPoints, pointAlong, formMask, SHAPE_MODES } from '../js/forms.js';
import { normalize } from '../js/config.js';
import { TECHNIQUES } from '../js/techniques.js';
import { readSettings } from '../js/settings.js';

const configs = async () => Promise.all(Object.entries(TECHNIQUES).map(async ([page, file]) => [page, normalize((await import(`../configs/${file}`)).default)]));

test('every shape named by a config exists, and Home knows the same shapes (#159)', async () => {
  for (const [page, cfg] of await configs()) {
    if (cfg.form) assert.ok(FORMS[cfg.form], `${page}: unknown shape ${cfg.form}`);
    assert.equal(FORM_OF_PAGE[page] ?? null, cfg.form, `${page}: Home and the config agree`);
  }
});

test('a shape with sides has one per phase, in phase order', async () => {
  for (const [page, cfg] of await configs()) {
    const sides = cfg.form && FORMS[cfg.form].sides;
    if (!sides) continue;
    assert.equal(sides.length, cfg.sequence.steps[0].phases.length, page);
    for (let i = 1; i < sides.length; i++) {
      const end = pathPoints(sides[i - 1]).at(-1), start = pathPoints(sides[i])[0];
      assert.ok(Math.hypot(end[0] - start[0], end[1] - start[1]) < 0.5, `${page}: side ${i} starts where side ${i - 1} ends`);
    }
  }
});

test('4-7-8 is a true 4 : 7 : 8 triangle', () => {
  const [inn, hold, out] = FORMS['478'].sides.map(d => pathPoints(d)).map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  assert.ok(Math.abs(hold / inn - 7 / 4) < 0.02 && Math.abs(out / inn - 8 / 4) < 0.02, `${inn} ${hold} ${out}`);
});

test('the marker rides a curve, not the chord', () => {
  const pts = pathPoints('M36,96 Q4,50 36,4');
  const [x, y] = pointAlong(pts, 0.5);
  assert.ok(x < 25 && Math.abs(y - 50) < 2, `mid-curve at ${x},${y}`);
  assert.deepEqual(pointAlong(pts, 0), [36, 96]);
});

test('shapes replace the outline and marker but keep the rest; Original keeps everything', () => {
  assert.deepEqual(formComponents(['ring', 'ripple', 'glow', 'hum', 'heat', 'particles', 'core'], 'hum'), ['ripple', 'hum', 'heat', 'particles', 'form', 'core', 'formMarker']);
  assert.deepEqual(formComponents(['ring', 'glow', 'particles', 'core'], 'spikes'), ['particles', 'form', 'core'], 'no sides, no marker');
  const cfg = { form: 'egg', components: ['ring', 'core'] };
  assert.equal(withForm(cfg, 'original').formKey, null);
  assert.deepEqual(withForm(cfg, 'original').components, ['ring', 'core']);
  assert.equal(withForm(cfg, 'shapes').formKey, 'egg');
  assert.equal(withForm({ form: null, components: ['core'] }, 'shapes').formKey, null, 'Resonance keeps its circle');
});

test('counting lights the Energise pictures through the round', () => {
  const lit = (inner) => (inner.match(/fill-opacity="1"/g) ?? []).length;
  assert.equal(lit(FORMS.spikes.count({ counter: 'Pump', rep: 12 })), 12);
  assert.equal(lit(FORMS.spikes.count({ counter: null })), 30, 'resting: all lit');
  const strokes = (inner) => (inner.match(/stroke-opacity="1"/g) ?? []).length;
  assert.equal(strokes(FORMS.charge.count({ counter: 'Power breath', rep: 20 })), 20);
  assert.notEqual(FORMS.flame.count({ counter: 'x', rep: 5, repeat: 20 }), FORMS.flame.count({ counter: 'x', rep: 15, repeat: 20 }));
  assert.match(formMask(FORMS.egg.fill()), /^url\("data:image\/svg\+xml,/);
});

test('Breath shapes defaults to the new shapes, with the originals one tap away', () => {
  assert.deepEqual(SHAPE_MODES, ['original', 'shapes', 'counted']);
  assert.equal(readSettings(null).shapes, 'shapes');
});
