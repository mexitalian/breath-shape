// Compares a Penpot design-token export with css/tokens.css, and can write the
// differences back (#112). Penpot's token names mirror the CSS: space.md is
// --space-md, text.lg is --text-lg, and so on. Penpot works in px; the CSS uses rem
// for most sizes (16 px = 1 rem), so values are converted on the way back.
//
//   node scripts/penpot-tokens.mjs check <export.json>          list differences
//   node scripts/penpot-tokens.mjs check <export.json> --write  and update tokens.css
//
// Colours are left alone: the CSS works them out from each page's hue, so Penpot
// only holds the results. A colour change is made in the CSS formula instead.
import { readFileSync, writeFileSync } from 'node:fs';

const REM = 16;
const round = (n) => Math.round(n * 1000) / 1000;
const rem = (px) => `${round(px / REM)}rem`;
const px = (n) => `${round(n)}px`;
const num = (n) => String(round(n));

// Penpot token name -> [CSS custom property, how to write the value]. Groups map
// by prefix; sizes are listed one by one because their CSS names differ.
const GROUPS = [
  ['space.', '--space-', rem],
  ['text.', '--text-', rem],
  ['radius.', '--radius-', px],
  ['alpha.', '--alpha-', num],
  ['weight.', '--weight-', num],
  ['leading.', '--leading-', num],
  ['tracking.', '--tracking-', (n) => `${round(n)}em`],
];
const SINGLES = {
  'border.hair': ['--border-hair', px],
  'opacity.disabled': ['--opacity-disabled', num],
  'size.icon-button': ['--icon-button-size', rem],
  'size.icon': ['--icon-size', rem],
  'size.orb': ['--orb-size', rem],
  'size.cycle': ['--cycle-size', rem],
  'size.dot': ['--dot-size', px],
  'size.check': ['--check-size', rem],
  'size.step-button': ['--step-button-size', rem],
  'size.thumb': ['--thumb-size', rem],
  'size.hr-trace-height': ['--hr-trace-height', rem],
  'size.topbar-height': ['--topbar-height', rem],
  'size.width-panel': ['--width-panel', rem],
  'size.width-page': ['--width-page', rem],
};

// Pure: every token in a Penpot (DTCG) export, as { name: value }. Penpot nests
// tokens by name inside each set ({ space: { md: { $value: "16" } } }); sets and
// the $themes / $metadata keys sit at the top. The first set that names a token wins.
export function flattenExport(json) {
  const out = {};
  const walk = (node, path) => {
    if (node && typeof node === 'object' && '$value' in node) {
      if (!(path in out)) out[path] = node.$value;
      return;
    }
    for (const [key, child] of Object.entries(node ?? {})) {
      if (key.startsWith('$')) continue;
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  for (const [set, tokens] of Object.entries(json)) if (!set.startsWith('$')) walk(tokens, '');
  return out;
}

// Pure: which CSS property a Penpot token maps to, and its value written for CSS.
export function cssFor(name, value) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  if (SINGLES[name]) { const [prop, fmt] = SINGLES[name]; return { prop, value: fmt(n) }; }
  for (const [prefix, cssPrefix, fmt] of GROUPS) {
    if (name.startsWith(prefix)) return { prop: cssPrefix + name.slice(prefix.length), value: fmt(n) };
  }
  return null;
}

// Pure: the value a property has in the CSS (its first declaration), or null.
export function cssValue(css, prop) {
  const m = css.match(new RegExp(`${prop.replace(/[-]/g, '\\-')}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

// Values that only differ in writing (1.0rem vs 1rem, .07 vs 0.07) count as equal.
function same(a, b) {
  const unit = (s) => s.replace(/^[-\d.]+/, '');
  return unit(a) === unit(b) && Math.abs(Number.parseFloat(a) - Number.parseFloat(b)) < 0.0005;
}

// Pure: the differences between an export and the CSS. Tokens with no CSS
// counterpart (colours, composite type styles, shadows, values the CSS works out
// with min() or clamp()) are listed as skipped.
export function compare(tokens, css) {
  const changes = [];
  const skipped = [];
  for (const [name, value] of Object.entries(tokens)) {
    const target = cssFor(name, value);
    const current = target && cssValue(css, target.prop);
    if (!target || current == null || /[(]/.test(current)) { skipped.push(name); continue; }
    if (!same(current, target.value)) changes.push({ name, prop: target.prop, from: current, to: target.value });
  }
  return { changes, skipped };
}

// Pure: the CSS with each change written into its first declaration.
export function applyChanges(css, changes) {
  let out = css;
  for (const { prop, to } of changes) {
    out = out.replace(new RegExp(`(${prop.replace(/[-]/g, '\\-')}\\s*:\\s*)([^;]+);`), `$1${to};`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, file, flag] = process.argv.slice(2);
  if (cmd !== 'check' || !file) {
    console.error('Usage: node scripts/penpot-tokens.mjs check <penpot-export.json> [--write]');
    process.exit(2);
  }
  const cssPath = new URL('../css/tokens.css', import.meta.url);
  const css = readFileSync(cssPath, 'utf8');
  const { changes, skipped } = compare(flattenExport(JSON.parse(readFileSync(file, 'utf8'))), css);
  if (!changes.length) console.log('tokens.css already matches Penpot.');
  for (const c of changes) console.log(`${c.prop}: ${c.from} -> ${c.to}  (${c.name})`);
  console.log(`${skipped.length} tokens have no direct CSS value (colours, type styles, shadows) and were skipped.`);
  if (flag === '--write' && changes.length) {
    writeFileSync(cssPath, applyChanges(css, changes));
    console.log(`Wrote ${changes.length} change(s) to css/tokens.css.`);
  }
}
