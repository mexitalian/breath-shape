import { el } from '../dom.js';
import { loadConfig } from '../techniques.js';
import { normalize } from '../config.js';
import { OUTCOMES } from './catalogue.js';
import { FORMS, formMask } from '../forms.js';

// Small building blocks shared by the pickers (#151).

// A colour scope: the element and everything in it take this hue's colours.
export function hued(node, hue) {
  node.dataset.hue = '';
  node.style.setProperty('--hue', String(hue));
  return node;
}

// The technique's shape in its fill colour, on a soft disc. size: CSS length.
export function shapeArt(shape, size, label = '', form = null) {
  const wrap = el('div', 'pick-art');
  wrap.style.setProperty('--art-size', size);
  const s = el('span', 'pick-shape');
  s.dataset.shape = shape;
  // Breath shapes (#159): the technique's own shape, unless Settings says Original.
  if (form && FORMS[form]) { s.dataset.form = form; s.style.setProperty('--form-mask', formMask(FORMS[form].fill())); }
  wrap.append(s);
  if (label) wrap.append(el('span', 'pick-art__label', { textContent: label }));
  wrap.setAttribute('aria-hidden', 'true');
  return wrap;
}

export function chip(label, { pressed = null, hue = null, onClick = null } = {}) {
  const b = el('button', 'chip chip--link', { type: 'button', textContent: label });
  if (pressed != null) b.setAttribute('aria-pressed', String(pressed));
  if (hue != null) hued(b, hue);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

// Outcome pills: Any, then each outcome in its colour. onPick(key or null).
export function outcomePills(current, onPick, { any = true } = {}) {
  const nav = el('div', 'group-nav pick-pills');
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Outcome');
  const items = [...(any ? [{ key: null, label: 'Any', hue: null }] : []), ...OUTCOMES];
  const buttons = items.map(o => chip(o.label, {
    pressed: o.key === current,
    hue: o.hue,
    onClick: () => {
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(items[i].key === o.key)));
      onPick(o.key);
    },
  }));
  nav.append(...buttons);
  return nav;
}

export function startLink(t, label = 'Start', { minutes = null } = {}) {
  const a = el('a', 'button button--primary pick-start', { href: t.href, textContent: label });
  // A time picked in the questions becomes the session's length, where it has one.
  if (minutes) a.addEventListener('click', (event) => {
    event.preventDefault();
    presetLength(t.href, minutes).finally(() => { location.href = t.href; });
  });
  return a;
}

// Pure: the closest of a technique's lengths to the time wanted.
export function closestLength(options, minutes) {
  if (!options?.length) return null;
  return options.reduce((a, b) => (Math.abs(b - minutes) < Math.abs(a - minutes) ? b : a));
}

async function presetLength(href, minutes) {
  try {
    const raw = await loadConfig(href);
    if (!raw) return;
    const cfg = normalize(raw);
    const m = closestLength(cfg.lengths?.minutes, minutes);
    if (m) localStorage.setItem(`breathing:length:${cfg.id}`, `${m}m`);
  } catch { /* best-effort: the session opens with its last length */ }
}
