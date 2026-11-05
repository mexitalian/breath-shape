import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TECHNIQUES } from '../js/techniques.js';

// docs/COLOURS.md: each technique's hue says what it's for. Home's rows carry the
// same hue as the configs, so the list and the session never disagree.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Home shows each technique in its config\'s colour', async () => {
  for (const [page, file] of Object.entries(TECHNIQUES)) {
    const cfg = (await import(`../configs/${file}`)).default;
    const row = html.match(new RegExp(`href="${page.replace('.', '\\.')}" data-hue style="--hue: (\\d+)"`));
    assert.ok(row, `${page} row on Home`);
    assert.equal(Number(row[1]), cfg.hue, `${page}: Home ${row[1]}, config ${cfg.hue}`);
  }
});

test('colours follow purpose: calm is cool, balance is green, energise is warm', async () => {
  const hue = async (file) => (await import(`../configs/${file}`)).default.hue;
  for (const f of ['478.js', 'extended-exhale.js', 'resonance.js', 'sigh.js', 'bhramari.js', 'pursed-lip.js']) {
    const h = await hue(f); assert.ok(h >= 190 && h <= 280, `${f} ${h} should be blue to violet`);
  }
  for (const f of ['box.js', 'triangle.js', 'alternate-nostril.js']) {
    const h = await hue(f); assert.ok(h >= 110 && h <= 170, `${f} ${h} should be green`);
  }
  for (const f of ['bhastrika.js', 'kapalabhati.js', 'wim-hof.js', 'tummo.js', 'holotropic.js']) {
    const h = await hue(f); assert.ok(h <= 60, `${f} ${h} should be yellow to red`);
  }
});
