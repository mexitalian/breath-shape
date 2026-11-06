import { el } from '../dom.js';
import { OUTCOMES, TIMES, PLACES, rankFor, whyFor } from './catalogue.js';
import { hued, shapeArt, chip, startLink } from './parts.js';

// Guided questions (#151, concept B): how you want to feel, then how long and where
// (both skippable), then a best fit that says why, and two more that would work.
const MINUTES = { short: 2, mid: 5, long: 10 };

export function createQuestionsPicker(root, techniques, { onBrowse }) {
  let answers = { outcome: null, time: null, place: null };
  const wrap = el('div', 'questions');
  root.replaceChildren(wrap);

  const heading = (step, text) => {
    const h = el('div', 'questions__head');
    if (step) h.append(el('div', 'eyebrow', { textContent: `${step} of 3` }));
    h.append(el('h2', 'questions__title', { textContent: text }));
    return h;
  };
  const link = (text, onClick) => {
    const b = el('button', 'pick-link', { type: 'button', textContent: text });
    b.addEventListener('click', onClick);
    return b;
  };
  const show = (...nodes) => {
    wrap.replaceChildren(...nodes);
    wrap.querySelector('h2')?.focus?.({ preventScroll: true });
  };

  function stepFeel() {
    const list = el('div', 'questions__options');
    for (const o of OUTCOMES) {
      const b = hued(el('button', 'pick-option', { type: 'button' }), o.hue);
      const text = el('span', 'pick-option__text');
      text.append(el('span', 'pick-option__label', { textContent: o.label }), el('span', 'pick-option__sub', { textContent: o.sub }));
      b.append(shapeArt(o.shape, '2.5rem'), text);
      b.addEventListener('click', () => {
        answers = { outcome: o.key, time: null, place: null };
        if (o.key === 'measure') result(); else stepTimePlace();
      });
      list.append(b);
    }
    show(heading(1, 'How do you want to feel?'), list, link('Or browse everything →', onBrowse));
  }

  function stepTimePlace() {
    const o = OUTCOMES.find(x => x.key === answers.outcome);
    const crumbs = el('div', 'group-nav pick-pills');
    crumbs.append(chip(`${o.label} ✓`, { hue: o.hue, onClick: stepFeel }));
    const times = el('div', 'group-nav pick-pills');
    const timeButtons = TIMES.map(t => chip(t.label, {
      pressed: answers.time === t.key,
      hue: o.hue,
      onClick: () => {
        answers.time = answers.time === t.key ? null : t.key;
        timeButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(TIMES[i].key === answers.time)));
      },
    }));
    times.append(...timeButtons);
    const places = el('div', 'questions__options');
    for (const p of PLACES) {
      const b = el('button', 'pick-option pick-option--plain', { type: 'button' });
      const text = el('span', 'pick-option__text');
      text.append(el('span', 'pick-option__label', { textContent: p.label }), el('span', 'pick-option__sub', { textContent: p.sub }));
      b.append(text);
      b.addEventListener('click', () => { answers.place = p.key; result(); });
      places.append(b);
    }
    show(
      el('div', 'eyebrow', { textContent: '2 of 3' }),
      crumbs,
      el('h2', 'questions__title', { textContent: 'How long have you got?' }),
      times,
      el('h2', 'questions__title', { textContent: 'Where are you?' }),
      places,
      link('Skip this question', () => { answers.place = null; result(); }),
    );
  }

  function result() {
    const o = OUTCOMES.find(x => x.key === answers.outcome);
    const ranked = rankFor(techniques, answers);
    const [best, ...rest] = ranked;
    if (!best) { stepFeel(); return; }
    const crumbs = el('div', 'group-nav pick-pills');
    crumbs.append(chip(o.label, { hue: o.hue, onClick: stepFeel }));
    if (answers.time) crumbs.append(chip(TIMES.find(t => t.key === answers.time).label, { hue: o.hue, onClick: stepTimePlace }));
    if (answers.place) crumbs.append(chip(PLACES.find(p => p.key === answers.place).label, { hue: o.hue, onClick: stepTimePlace }));

    const card = hued(el('article', 'pick-best'), best.hue);
    const minutes = answers.time ? MINUTES[answers.time] : null;
    card.append(
      shapeArt(best.shape, 'min(34vw, 8rem)'),
      el('h3', 'pick-best__name', { textContent: best.name }),
      el('p', 'pick-best__pattern', { textContent: best.pattern }),
      el('p', 'pick-best__why', { textContent: `Why: ${whyFor(best, answers)}` }),
      startLink(best, minutes ? `Start · ${minutes} min` : 'Start', { minutes }),
    );
    if (best.safety) card.append(el('p', 'pick-best__safety', { textContent: 'Sit or lie down for this one. Not in water or while driving.' }));

    const also = el('ul', 'pick-rows');
    for (const t of rest.slice(0, 2)) {
      const a = hued(el('a', 'pick-row', { href: t.href }), t.hue);
      const text = el('span', 'pick-row__text');
      text.append(el('strong', 'pick-row__name', { textContent: t.name }), el('span', 'pick-row__use', { textContent: t.use }));
      a.append(el('span', 'pick-row__orb'), text, el('span', 'pick-row__arrow', { textContent: '→' }));
      const li = el('li');
      li.append(a);
      also.append(li);
    }
    show(
      crumbs,
      el('div', 'eyebrow', { textContent: 'Best fit' }),
      card,
      ...(also.children.length ? [el('div', 'eyebrow', { textContent: 'Also good' }), also] : []),
      link('Start over', stepFeel),
    );
  }

  stepFeel();
  return { destroy() { root.replaceChildren(); } };
}
