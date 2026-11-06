import { el } from '../dom.js';
import { nearest } from './catalogue.js';
import { hued, shapeArt, startLink } from './parts.js';

// Colour spectrum (#151, concept C): slide from Sleep to Wake up. The shape and its
// colour follow your thumb, and the closest techniques list underneath.
const KEY = 'breathing:spectrum';

export function createSpectrumPicker(root, techniques, { onBrowse }) {
  const onScale = techniques.filter(t => Number.isFinite(t.at)).sort((a, b) => a.at - b.at);
  let at = 0.2;
  try { const saved = Number(sessionStorage.getItem(KEY)); if (saved >= 0 && saved <= 1 && sessionStorage.getItem(KEY) != null) at = saved; } catch { /* default */ }

  const wrap = el('div', 'spectrum');
  const preview = el('div', 'spectrum__preview');
  const slider = el('input', 'spectrum__range', { type: 'range', min: '0', max: '1000', step: '1', value: String(Math.round(at * 1000)) });
  slider.setAttribute('aria-label', 'Where do you want to be, from sleep to wide awake');
  // The track runs through every technique's colour, in order.
  slider.style.setProperty('--track', `linear-gradient(90deg, ${onScale.map(t => `hsl(${t.hue} var(--sat-vivid) var(--tone-fill)) ${(t.at * 100).toFixed(1)}%`).join(', ')})`);
  const ends = el('div', 'spectrum__ends');
  ends.append(el('span', '', { textContent: 'Sleep' }), el('span', '', { textContent: 'Balance' }), el('span', '', { textContent: 'Wake up' }));
  const list = el('ul', 'pick-rows');
  const note = el('p', 'pick-best__safety', { textContent: 'Sit or lie down for these. Not in water or while driving.' });
  const browse = el('button', 'pick-link', { type: 'button', textContent: 'Or browse everything →' });
  browse.addEventListener('click', onBrowse);
  wrap.append(el('h2', 'questions__title', { textContent: 'Where do you want to be?' }), preview, slider, ends, el('div', 'eyebrow', { textContent: 'Closest' }), list, note, browse);
  root.replaceChildren(wrap);

  let shownFor = null;
  function update() {
    at = Number(slider.value) / 1000;
    const close = nearest(onScale, at);
    const best = close[0];
    hued(slider, best.hue);
    slider.setAttribute('aria-valuetext', best.name);
    if (shownFor !== best.href) {
      shownFor = best.href;
      hued(preview, best.hue);
      preview.replaceChildren(shapeArt(best.shape, 'min(44vw, 11rem)', best.name), startLink(best, `Start ${best.name}`));
    }
    list.replaceChildren(...close.map((t, i) => {
      const a = hued(el('a', `pick-row${i === 0 ? ' pick-row--closest' : ''}`, { href: t.href }), t.hue);
      const text = el('span', 'pick-row__text');
      text.append(el('strong', 'pick-row__name', { textContent: t.name }), el('span', 'pick-row__use', { textContent: t.use }));
      a.append(el('span', 'pick-row__orb'), text, el('span', 'pick-row__arrow', { textContent: '→' }));
      const li = el('li');
      li.append(a);
      return li;
    }));
    note.hidden = !close.some(t => t.safety);
    try { sessionStorage.setItem(KEY, String(at)); } catch { /* best-effort */ }
  }
  slider.addEventListener('input', update);
  update();
  return { destroy() { root.replaceChildren(); } };
}
