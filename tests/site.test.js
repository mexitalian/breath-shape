import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalize } from '../js/config.js';

const root = new URL('..', import.meta.url).pathname;
const pages = readdirSync(root).filter(f => f.endsWith('.html') && !['index.html', 'styleguide.html', 'diagnostics.html'].includes(f) && !f.startsWith('_tmp-'));
const index = readFileSync(join(root, 'index.html'), 'utf8');
const readme = readFileSync(join(root, 'README.md'), 'utf8');

test('every config normalizes', async () => {
  for (const file of readdirSync(join(root, 'configs'))) {
    const { default: cfg } = await import(`../configs/${file}`);
    assert.doesNotThrow(() => normalize(cfg), file);
  }
});

test('every practice page loads an existing config and is listed on the index and README', () => {
  assert.ok(pages.length >= 4);
  for (const page of pages) {
    const html = readFileSync(join(root, page), 'utf8');
    const match = html.match(/from '\.\/configs\/([\w-]+\.js)'/);
    assert.ok(match, `${page} imports a config`);
    assert.ok(existsSync(join(root, 'configs', match[1])), `${page} config exists`);
    assert.ok(index.includes(`href="${page}"`), `${page} linked from index.html`);
    assert.ok(readme.includes(`\`${page}\``), `${page} listed in README`);
  }
});

test('index rows only use orb animations that exist', () => {
  const css = readFileSync(join(root, 'css/components/technique-list.css'), 'utf8');
  for (const [, name] of index.matchAll(/--orb-anim: ([\w-]+)/g)) {
    assert.ok(css.includes(`@keyframes ${name} `), `${name} defined`);
  }
});
