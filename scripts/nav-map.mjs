// Builds the app's navigation map from the code (#114): every page, the screens a
// technique page moves through, every way between them, and the problems that
// shows: dead ends, places that lose a session, sessions with no ending.
//
//   node scripts/nav-map.mjs           print docs/NAVIGATION.md
//   node scripts/nav-map.mjs --write   write it
//
// Sources: links in each page's HTML; for technique pages, the page's config
// (safety screen, start screen, does the session end) and the engine's screens
// (js/engine.js); the top bar's back button (js/ui/stage.js); Android's back
// button (js/app.js); the history rows (history.html).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

const HOME = 'index.html';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&rarr;/g, '→').replace(/&larr;/g, '←');
const pageName = (href) => (href === './' || href === '' ? HOME : href);

// Pure: a technique config's navigation facts.
export function techniqueFacts(cfg) {
  const ends = !!(cfg.sessionMinutes || cfg.sessionChoices || cfg.sequence || cfg.variants?.some(v => v.sequence));
  return { safety: !!cfg.safety, start: !!cfg.startScreen, ends };
}

// Pure: links in a page's HTML, as [{ to, label }]. Only links to the app's own pages.
export function htmlLinks(html) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href="([^"#:]*?)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = m[1];
    if (href !== './' && !href.endsWith('.html')) continue;
    const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const name = m[0].match(/technique__name">([^<]+)/)?.[1];
    out.push({ to: pageName(href), label: decode(name ?? label) });
  }
  return out;
}

// Pure: the whole graph. pages: [{ file, html, cfg? }], cfg only for technique pages.
// Nodes are "file" for a page, "file#screen" for a technique's screens.
export function buildGraph(pages) {
  const nodes = new Map();
  const edges = [];
  const node = (id, label, kind) => { if (!nodes.has(id)) nodes.set(id, { id, label, kind }); };
  const edge = (from, to, label, kind) => edges.push({ from, to, label, kind });

  node(HOME, 'Home', 'hub');
  node('exit', 'Leaves the app', 'exit');
  edge(HOME, 'exit', 'Android back', 'leave');
  node(`${HOME}#settings`, 'Settings', 'overlay');
  edge(HOME, `${HOME}#settings`, 'Gear', 'overlay');
  edge(`${HOME}#settings`, HOME, 'Done / tap outside / Esc', 'close');

  for (const { file, html, cfg, title } of pages) {
    if (file === HOME) {
      for (const l of htmlLinks(html)) if (l.to !== HOME) edge(HOME, l.to, l.label, 'forward');
      continue;
    }
    if (!cfg) {
      node(file, title, 'page');
      for (const l of htmlLinks(html)) edge(file, l.to, l.label, l.to === HOME ? 'back' : 'forward');
      if (file === 'history.html') edge(file, 'technique', 'A saved session (opens its technique)', 'forward');
      edge(file, HOME, 'Android back', 'back');
      continue;
    }
    // Technique page: entry → [safety] → [start] → session → [summary]
    const f = techniqueFacts(cfg);
    node(file, title, 'technique');
    const s = (id) => `${file}#${id}`;
    node(s('session'), 'Session', 'screen');
    let entry = s('session');
    if (f.start) { node(s('start'), 'Start screen', 'screen'); entry = s('start'); edge(s('start'), s('session'), cfg.variants ? 'A variant' : cfg.sessionChoices ? 'A length' : 'Start', 'forward'); }
    if (f.safety) {
      node(s('safety'), 'Safety screen (until "don\'t show again")', 'screen');
      edge(file, s('safety'), 'Opens on (first visits)', 'forward');
      edge(s('safety'), entry, 'I understand, continue', 'forward');
      edge(s('safety'), HOME, 'All techniques', 'back');
    }
    edge(file, entry, f.safety ? 'Opens on (once acknowledged)' : 'Opens on', 'forward');
    if (f.ends) {
      node(s('summary'), 'Summary', 'screen');
      edge(s('session'), s('summary'), 'Session ends', 'forward');
      edge(s('summary'), s('session'), 'Go again', 'forward');
      edge(s('summary'), 'heart-rate.html', 'Check heart rate', 'forward');
      edge(s('summary'), HOME, 'All techniques', 'back');
    }
    edge(s('session'), s('settings'), 'Gear', 'overlay');
    node(s('settings'), 'Settings', 'overlay');
    edge(s('settings'), s('session'), 'Done / tap outside / Esc', 'close');
    for (const screen of new Set([entry, s('session'), ...(f.ends ? [s('summary')] : [])])) {
      edge(screen, HOME, 'Back (top bar) / Android back', screen === s('session') ? 'loses' : 'back');
    }
  }
  return { nodes: [...nodes.values()], edges };
}

// Pure: the problems the graph shows.
export function findProblems({ nodes, edges }) {
  const out = (id) => edges.filter(e => e.from === id);
  const problems = [];
  for (const n of nodes) {
    if (n.kind !== 'page') continue;
    const onward = out(n.id).filter(e => e.to !== HOME);
    if (!onward.length) problems.push({ kind: 'dead end', node: n.id, note: `${n.label} only leads back to Home.` });
  }
  // Heart rate is offered after a session, but can't return to it.
  const fromSummary = edges.filter(e => e.to === 'heart-rate.html' && e.from.endsWith('#summary'));
  if (fromSummary.length && !out('heart-rate.html').some(e => e.to !== HOME)) {
    problems.push({ kind: 'no way back', node: 'heart-rate.html', note: `Offered from ${fromSummary.length} session summaries ("Check heart rate"), but it can only go to Home, not back to the technique.` });
  }
  const losing = edges.filter(e => e.kind === 'loses');
  if (losing.length) problems.push({ kind: 'loses a session', node: '*#session', note: `On all ${new Set(losing.map(e => e.from)).size} technique pages, Back or Android back during a session goes straight to Home with no "stop?" prompt.` });
  const open = nodes.filter(n => n.id.endsWith('#session') && !edges.some(e => e.from === n.id && e.to.endsWith('#summary')));
  if (open.length) problems.push({ kind: 'no ending', node: '*#session', note: `${open.length} techniques run until you leave: no summary, no "Check heart rate".` });
  return problems;
}

const titleOf = (html) => html.match(/<title>([^<·|]+)/)?.[1].replace(/&amp;/g, '&').trim() ?? '';

// Pure: the Markdown document.
export function renderDoc(graph, problems, techniques) {
  const lines = [];
  lines.push('# Navigation map', '');
  lines.push('Generated from the code by `node scripts/nav-map.mjs --write` (#114). Do not edit by hand: change the code, then regenerate. A test fails when this file is out of date.', '');
  lines.push('## Problems', '');
  for (const p of problems) lines.push(`- **${p.kind}** · ${p.note}`);
  lines.push('', '## The shape of the app', '');
  lines.push('Home is the only hub. Technique pages follow one of these patterns:', '');
  lines.push('| Technique | Safety screen | Start screen | Ends with a summary |', '|---|---|---|---|');
  for (const t of techniques) lines.push(`| ${t.title} (\`${t.file}\`) | ${t.safety ? 'yes, until acknowledged' : '·'} | ${t.start ? 'yes' : '·'} | ${t.ends ? 'yes' : 'no, runs until you leave'} |`);
  lines.push('', '```mermaid', 'flowchart LR');
  const pageNodes = graph.nodes.filter(n => !n.id.includes('#') && n.kind !== 'technique');
  const id = (s) => s.replace(/[^a-z0-9]/gi, '_');
  for (const n of pageNodes) lines.push(`  ${id(n.id)}${n.kind === 'exit' ? `((${n.label}))` : `["${n.label}"]`}`);
  lines.push('  T["Technique page"]', '  T_safety["Safety screen<br/>(energise, first visits)"]', '  T_start["Start screen"]', '  T_session["Session"]', '  T_summary["Summary<br/>(sessions that end)"]', '  SET{{"Settings overlay"}}');
  lines.push(`  ${id(HOME)} -->|"tap a technique"| T`);
  for (const e of graph.edges.filter(e => !e.from.includes('#') && !e.to.includes('#') && graph.nodes.find(n => n.id === e.from)?.kind !== 'technique' && graph.nodes.find(n => n.id === e.to)?.kind !== 'technique' && e.to !== 'technique')) {
    const arrow = e.kind === 'back' || e.kind === 'close' ? '-.->' : '-->';
    lines.push(`  ${id(e.from)} ${arrow}|"${e.label.replace(/"/g, "'")}"| ${id(e.to)}`);
  }
  lines.push(`  ${id('history.html')} -->|"a saved session"| T`);
  lines.push('  T -->|"first visits"| T_safety', '  T_safety -->|"I understand"| T_start', '  T_safety -.->|"All techniques"| index_html', '  T -->|"opens on"| T_start', '  T -->|"looping techniques"| T_session', '  T_start -->|"Start / variant / length"| T_session', '  T_session -->|"ends"| T_summary', '  T_summary -->|"Go again"| T_session', '  T_summary -->|"Check heart rate"| heart_rate_html', '  T_summary -.->|"All techniques"| index_html', '  T_session -. "Back / Android back: session lost" .-> index_html', '  T_session -->|"gear"| SET', `  ${id(HOME)} -->|"gear"| SET`, '  SET -.->|"Done"| T_session');
  lines.push('```', '');
  lines.push('Solid arrows go forward, dotted ones go back or close.', '');
  lines.push('## Every way between screens', '');
  lines.push('| From | Action | To | Kind |', '|---|---|---|---|');
  const label = (nid) => { const n = graph.nodes.find(x => x.id === nid); const page = nid.split('#')[0]; const p = graph.nodes.find(x => x.id === page); return n && nid.includes('#') ? `${p?.label ?? page} · ${n.label}` : (n?.label ?? nid); };
  for (const e of graph.edges) lines.push(`| ${label(e.from)} | ${e.label} | ${e.to === 'technique' ? 'Its technique page' : label(e.to)} | ${e.kind} |`);
  lines.push('');
  return lines.join('\n');
}

export async function generate() {
  const files = readdirSync(new URL('.', ROOT)).filter(f => f.endsWith('.html') && !f.startsWith('_tmp-')).sort();
  const pages = [];
  const techniques = [];
  for (const file of files) {
    const html = read(file);
    const cfgPath = html.match(/import config from '\.\/(configs\/[^']+)'/)?.[1];
    const cfg = cfgPath ? (await import(new URL(cfgPath, ROOT))).default : null;
    const title = file === HOME ? 'Home' : (cfg?.title ?? titleOf(html));
    pages.push({ file, html, cfg, title });
    if (cfg) techniques.push({ file, title, ...techniqueFacts(cfg) });
  }
  const graph = buildGraph(pages);
  return renderDoc(graph, findProblems(graph), techniques);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = await generate();
  if (process.argv.includes('--write')) {
    writeFileSync(new URL('docs/NAVIGATION.md', ROOT), doc);
    console.log('Wrote docs/NAVIGATION.md');
  } else {
    process.stdout.write(doc);
  }
}
