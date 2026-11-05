import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flattenExport, cssFor, compare, applyChanges, cssValue } from '../scripts/penpot-tokens.mjs';

const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

test('a Penpot export flattens to dotted names, skipping $themes and $metadata', () => {
  const json = {
    core: { space: { md: { $value: '16', $type: 'spacing' } }, size: { orb: { $value: '52', $type: 'sizing' } } },
    'mode/light': { color: { bg: { $value: '#f1f4f8', $type: 'color' } } },
    $themes: [{ name: 'Light' }],
    $metadata: { tokenSetOrder: ['core'] },
  };
  assert.deepEqual(flattenExport(json), { 'space.md': '16', 'size.orb': '52', 'color.bg': '#f1f4f8' });
});

test('names map to the CSS, in rem where the CSS uses rem', () => {
  assert.deepEqual(cssFor('space.md', '16'), { prop: '--space-md', value: '1rem' });
  assert.deepEqual(cssFor('radius.md', '14'), { prop: '--radius-md', value: '14px' });
  assert.deepEqual(cssFor('size.orb', '52'), { prop: '--orb-size', value: '3.25rem' });
  assert.deepEqual(cssFor('tracking.label', '0.07'), { prop: '--tracking-label', value: '0.07em' });
  assert.equal(cssFor('color.bg', '#f1f4f8'), null, 'colours stay in the CSS formula');
});

test('the tokens as built in Penpot match tokens.css', () => {
  const tokens = { 'space.md': '16', 'space.sm': '11.2', 'text.lg': '16.8', 'radius.pill': '999', 'alpha.edge': '0.35', 'weight.medium': '500', 'size.icon-button': '44', 'border.hair': '1' };
  assert.deepEqual(compare(tokens, css).changes, []);
});

test('the whole core set from the Penpot file matches tokens.css', () => {
  const json = JSON.parse(readFileSync(new URL('../docs/design/penpot/tokens-core.penpot.json', import.meta.url), 'utf8'));
  assert.deepEqual(compare(flattenExport(json), css).changes, []);
});

test('a changed token is reported and written into tokens.css', () => {
  const { changes } = compare({ 'space.md': '18', 'text.display': '32' }, css);
  assert.deepEqual(changes, [{ name: 'space.md', prop: '--space-md', from: '1rem', to: '1.125rem' }]);
  const next = applyChanges(css, changes);
  assert.equal(cssValue(next, '--space-md'), '1.125rem');
  assert.equal(cssValue(next, '--space-lg'), cssValue(css, '--space-lg'), 'nothing else changes');
});
