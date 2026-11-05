import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, techniqueFacts, htmlLinks, buildGraph, findProblems } from '../scripts/nav-map.mjs';

test('docs/NAVIGATION.md is up to date with the code (run: node scripts/nav-map.mjs --write)', async () => {
  const committed = readFileSync(new URL('../docs/NAVIGATION.md', import.meta.url), 'utf8');
  assert.equal(committed, await generate());
});

test('a technique config says whether it has a safety screen, a start screen and an ending', () => {
  assert.deepEqual(techniqueFacts({ safety: true, startScreen: true, sequence: { rounds: 3 } }), { safety: true, start: true, ends: true, lengths: false });
  assert.deepEqual(techniqueFacts({ phases: [] }), { safety: false, start: false, ends: false, lengths: false });
  assert.equal(techniqueFacts({ sessionMinutes: 5 }).ends, true);
  assert.deepEqual(techniqueFacts({ lengths: { minutes: [5] } }), { safety: false, start: false, ends: true, lengths: true });
});

test('links are read from the HTML, with technique names as labels', () => {
  const html = '<a class="technique" href="box-breathing.html"><strong class="technique__name">Box Breathing</strong></a><a href="./">← All</a><a href="https://x.dev">x</a>';
  assert.deepEqual(htmlLinks(html), [{ to: 'box-breathing.html', label: 'Box Breathing' }, { to: 'index.html', label: '← All' }]);
});

test('a page that only leads home is a dead end, unless it is an info page; a session with no summary has no ending', () => {
  const pages = [
    { file: 'index.html', html: '<a href="about.html">About</a><a href="loop.html">Loop</a>' },
    { file: 'about.html', html: '<a href="./">Back</a>', title: 'About' },
    { file: 'privacy.html', html: '<a href="./">Back</a>', title: 'Privacy' },
    { file: 'loop.html', html: '', cfg: { title: 'Loop' }, title: 'Loop' },
  ];
  const problems = findProblems(buildGraph(pages));
  assert.deepEqual(problems.filter(p => p.kind === 'dead end').map(p => p.node), ['about.html']);
  assert.ok(problems.some(p => p.kind === 'no ending'));
});

test('a technique with lengths can end; leaving a session keeps it for Jump back in; heart rate leads back', () => {
  const pages = [
    { file: 'index.html', html: '<a href="loop.html">Loop</a><a href="heart-rate.html">HR</a>' },
    { file: 'heart-rate.html', html: '<a href="./">Done</a>', title: 'Heart rate' },
    { file: 'loop.html', html: '', cfg: { title: 'Loop', lengths: { minutes: [5] } }, title: 'Loop' },
  ];
  const graph = buildGraph(pages);
  assert.deepEqual(findProblems(graph), []);
  assert.ok(graph.edges.some(e => e.from === 'index.html' && e.to === 'technique' && /Jump back in/.test(e.label)));
  assert.ok(graph.edges.some(e => e.from === 'loop.html#session' && e.to === 'index.html' && e.kind === 'back'));
});
