// Re-renders the Penpot reference (docs/design/penpot/reference) from today's app, so
// the Penpot file can be checked against what the code really draws (#145).
//
//   node scripts/penpot-reference.mjs            # everything
//   node scripts/penpot-reference.mjs home nav   # just some groups: home, sessions, nav, text, tokens
//
// Pages are drawn as the Android app draws them: Pixel 6a size (412 × 915 CSS px) at 2×,
// with Capacitor faked as Android (so Android-only rows show) and the font forced to
// Roboto. Roboto comes from @fontsource/roboto, fetched once with `npm pack`
// (or pass --fonts <dir with roboto-latin-*-normal.woff2>). Needs Playwright and Chromium.
//
// Writes WebP images, plus app-text.json (every visible string, per screen) and
// tokens.json (every design token, resolved per theme).

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/design/penpot/reference');
const W = 412;
const H = 915;
const WEIGHTS = [300, 400, 500, 600, 700];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

const args = process.argv.slice(2);
const fontsFlag = args.indexOf('--fonts');
const groups = args.filter((a, i) => !a.startsWith('--') && i !== fontsFlag + 1);
const want = (g) => !groups.length || groups.includes(g);

function fontDir() {
  if (fontsFlag >= 0) return args[fontsFlag + 1];
  const dir = path.join(os.tmpdir(), 'breath-shape-roboto');
  const files = path.join(dir, 'package/files');
  if (!fs.existsSync(path.join(files, 'roboto-latin-400-normal.woff2'))) {
    fs.mkdirSync(dir, { recursive: true });
    const tgz = execFileSync('npm', ['pack', '@fontsource/roboto', '--silent'], { cwd: dir }).toString().trim().split('\n').pop();
    execFileSync('tar', ['xzf', tgz], { cwd: dir });
  }
  return files;
}

function serve() {
  const server = createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const FACES = WEIGHTS.map(w => `@font-face{font-family:RobotoRef;font-weight:${w};src:url(/__fonts/roboto-latin-${w}-normal.woff2) format('woff2')}`).join('')
  + ':root{--font-sans:RobotoRef,sans-serif !important}body,button,input,select{font-family:RobotoRef,sans-serif !important}';

// Pure helper run in the page: every visible string under a selector, in order.
function visibleText(sel) {
  const root = document.querySelector(sel);
  if (!root) return [];
  const out = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const t = n.textContent.replace(/\s+/g, ' ').trim();
    const el = n.parentElement;
    if (!t || el.closest('[hidden]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    out.push(t);
  }
  return out;
}

async function main() {
  const fonts = fontDir();
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const text = {};
  const pngs = [];

  async function open(file, { theme = 'dark', storage = {}, clock = false, scale = 2 } = {}) {
    const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale, colorScheme: theme });
    p.on('pageerror', e => console.warn(`  ${file}: ${e.message}`));
    await p.route('**/__fonts/*', r => r.fulfill({ body: fs.readFileSync(path.join(fonts, r.request().url().split('/').pop())), contentType: 'font/woff2' }));
    await p.addInitScript((storage) => {
      const methods = ['vibrate', 'start', 'stop', 'update', 'keepAwake', 'allowSleep', 'impact', 'playEffect', 'motor', 'info', 'addListener'].map(name => ({ name }));
      const plugins = ['BreathVibration', 'BreathSession', 'BreathEntrainment', 'Haptics', 'KeepAwake', 'App'].map(name => ({ name, methods }));
      window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', PluginHeaders: plugins, Plugins: {}, nativePromise: () => Promise.resolve({}) };
      if (!localStorage.getItem('breathing:settings')) localStorage.setItem('breathing:settings', JSON.stringify({ sound: false }));
      for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }, storage);
    await p.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style'); s.textContent = css; document.head.append(s);
    }), FACES);
    if (clock) await p.clock.install();
    await p.goto(base + file);
    await p.evaluate(async (ws) => { await Promise.all(ws.map(w => document.fonts.load(`${w} 16px RobotoRef`))); await document.fonts.ready; }, WEIGHTS);
    if (!clock) await p.waitForTimeout(500);
    return p;
  }
  async function shot(p, name, opts = {}) {
    const file = path.join(OUT, name + '.png');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, ...opts });
    pngs.push(file);
  }
  const startSession = async (p) => {
    for (let i = 0; i < 2; i++) {
      const b = p.locator('.screen:not([hidden]) .button--primary').first();
      if (await b.count() && await b.isVisible()) await b.click().catch(() => {});
      await p.clock.runFor(400);
    }
  };

  if (want('home')) {
    for (const theme of ['light', 'dark']) {
      const p = await open('index.html', { theme });
      await shot(p, `home-${theme}`);
      await shot(p, `home-${theme}-full`, { fullPage: true });
      if (theme === 'dark') text.home = await p.evaluate(visibleText, 'main');
      await p.click('[data-filter="calm-and-sleep"]');
      await p.waitForTimeout(400);
      await shot(p, `home-${theme}-filter-calm`);
      await p.click('[data-filter="all"]');
      await p.click('[aria-label="Settings"]');
      await p.waitForTimeout(400);
      await shot(p, `home-${theme}-settings`);
      if (theme === 'dark') text.settings = await p.evaluate(visibleText, '.settings');
      const tall = await p.evaluate(() => document.querySelector('.settings').scrollHeight);
      await p.setViewportSize({ width: W, height: Math.max(H, tall) });
      await p.waitForTimeout(300);
      await shot(p, `home-${theme}-settings-full`);
      await p.close();
    }
  }

  if (want('sessions')) {
    const shapes = [['circle', 'resonance-breathing.html'], ['nostril', 'alternate-nostril.html'], ['triangle', 'triangle-breathing.html'], ['box', 'box-breathing.html']];
    for (const theme of ['dark', 'light']) for (const [name, file] of shapes) {
      const p = await open(file, { theme, clock: true });
      await p.clock.runFor(600);
      await shot(p, `sessions/${name}-${theme}-start`);
      await startSession(p);
      await p.clock.runFor(2600);
      await shot(p, `sessions/${name}-${theme}-session`);
      if (theme === 'dark') text[`session-${name}`] = await p.evaluate(visibleText, 'body');
      await p.close();
    }
  }

  if (want('nav')) {
    const simple = [['start', 'buteyko.html'], ['history', 'history.html'], ['privacy', 'privacy.html'], ['diagnostics', 'diagnostics.html'], ['styleguide', 'styleguide.html'], ['entrainment', 'entrainment.html'], ['safety', 'wim-hof.html']];
    for (const [name, file] of simple) {
      const p = await open(file);
      await shot(p, `nav/${name}`);
      text[name] = await p.evaluate(visibleText, 'body');
      await p.close();
    }
    {
      const p = await open(`heart-rate.html?from=resonance-breathing.html&title=Resonance+Breathing&since=${Date.now()}`);
      await shot(p, 'nav/heart-rate');
      text['heart-rate'] = await p.evaluate(visibleText, 'body');
      await p.close();
    }
    {
      // A session a little way in, with its length chip; then Home's Jump back in card.
      const p = await open('resonance-breathing.html', { clock: true, storage: { 'breathing:length:resonance-breathing': '10m' } });
      await startSession(p);
      await p.clock.runFor(14_000);
      await shot(p, 'nav/session');
      await p.clock.runFor(60_000);
      await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      const resume = await p.evaluate(() => localStorage.getItem('breathing:resume'));
      await p.close();
      const h = await open('index.html', { storage: resume ? { 'breathing:resume': { ...JSON.parse(resume), savedAt: Date.now() - 120_000 } } : {} });
      await shot(h, 'nav/home');
      await shot(h, 'nav/home-full', { fullPage: true });
      await h.click('[aria-label="Settings"]');
      await h.waitForTimeout(400);
      await shot(h, 'nav/settings');
      await h.close();
    }
    {
      // The summary at the end of a 5 minute session.
      const p = await open('resonance-breathing.html', { clock: true, storage: { 'breathing:length:resonance-breathing': '5m' } });
      await startSession(p);
      for (let s = 0; s < 31; s++) await p.clock.runFor(10_000);
      await p.waitForTimeout(300);
      await shot(p, 'nav/summary');
      text.summary = await p.evaluate(visibleText, 'body');
      await p.close();
    }
  }

  if (want('text') || want('home') || want('nav') || want('sessions')) {
    const file = path.join(ROOT, 'docs/design/penpot/app-text.json');
    const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    fs.writeFileSync(file, JSON.stringify({ ...old, ...text }, null, 1) + '\n');
  }

  if (want('tokens')) {
    const tokens = {};
    for (const theme of ['light', 'dark']) {
      const p = await open('index.html', { theme, scale: 1 });
      tokens[theme] = await p.evaluate(() => {
        const names = new Set();
        const walk = (rs) => { for (const r of rs) { if (r.cssRules) walk(r.cssRules); if (r.style) for (const n of r.style) if (n.startsWith('--')) names.add(n); } };
        for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
        const probe = document.createElement('div');
        document.body.append(probe);
        const resolve = (hue) => {
          if (hue != null) probe.style.setProperty('--hue', hue);
          probe.setAttribute('data-hue', '');
          const res = {};
          for (const n of [...names].sort()) {
            const raw = getComputedStyle(probe).getPropertyValue(n).trim();
            if (!raw) continue;
            if (n.startsWith('--color')) { probe.style.color = `var(${n})`; res[n] = getComputedStyle(probe).color; probe.style.color = ''; } else res[n] = raw;
          }
          return res;
        };
        return { default: resolve(null), calm: resolve(240), focus: resolve(145), energise: resolve(30), measure: resolve(330) };
      });
      await p.close();
    }
    fs.writeFileSync(path.join(ROOT, 'docs/design/penpot/tokens.json'), JSON.stringify(tokens, null, 1) + '\n');
  }

  // PNG to WebP (Chromium's encoder), so the reference stays small in the repo.
  const enc = await browser.newPage();
  for (const file of pngs) {
    const data = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
    const url = await enc.evaluate(async (data) => {
      const img = new Image(); img.src = data; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', 0.9);
    }, data);
    fs.writeFileSync(file.replace(/\.png$/, '.webp'), Buffer.from(url.split(',')[1], 'base64'));
    fs.unlinkSync(file);
  }
  await browser.close();
  server.close();
  console.log(`${pngs.length} images in ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
