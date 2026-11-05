import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, techniqueFacts, htmlLinks, buildGraph, findProblems } from '../scripts/nav-map.mjs';

test('docs/NAVIGATION.md is up to date with the code (run: node scripts/nav-map.mjs --write)', async () => {
  const committed = readFileSync(new URL('../docs/NAVIGATION.md', import.meta.url), 'utf8');
  assert.equal(committed, await generate());
});

test('a technique config says whether it has a safety screen, a start screen and an ending', () => {
  assert.deepEqual(techniqueFacts({ safety: true, startScreen: true, sequence: { rounds: 3 } }), { safety: true, start: true, ends: true });
  assert.deepEqual(techniqueFacts({ phases: [] }), { safety: false, start: false, ends: false });
  assert.equal(techniqueFacts({ sessionMinutes: 5 }).ends, true);
});

test('links are read from the HTML, with technique names as labels', () => {
  const html = '<a class="technique" href="box-breathing.html"><strong class="technique__name">Box Breathing</strong></a><a href="./">← All</a><a href="https://x.dev">x</a>';
  assert.deepEqual(htmlLinks(html), [{ to: 'box-breathing.html', label: 'Box Breathing' }, { to: 'index.html', label: '← All' }]);
});

test('a page that only leads home is a dead end; a session with no summary has no ending', () => {
  const pages = [
    { file: 'index.html', html: '<a href="about.html">About</a><a href="loop.html">Loop</a>' },
    { file: 'about.html', html: '<a href="./">Back</a>', title: 'About' },
    { file: 'loop.html', html: '', cfg: { title: 'Loop' }, title: 'Loop' },
  ];
  const kinds = findProblems(buildGraph(pages)).map(p => p.kind);
  assert.ok(kinds.includes('dead end'));
  assert.ok(kinds.includes('no ending'));
  assert.ok(kinds.includes('loses a session'));
});
