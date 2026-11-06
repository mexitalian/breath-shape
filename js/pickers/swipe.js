import { el } from '../dom.js';
import { icon } from '../ui/icons.js';
import { OUTCOMES, deckFor, timeLabel } from './catalogue.js';
import { hued, shapeArt, outcomePills, startLink } from './parts.js';

// Swipe cards (#151, concept A): one technique per card. Swipe right (or tap Breathe)
// to get ready to breathe, left (or tap Another) for the next. The pills narrow the
// deck to one outcome.
const THRESHOLD = 90;   // px of drag that counts as a swipe

export function createSwipePicker(root, techniques, { onBrowse }) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let outcome = null;
  let deck = deckFor(techniques, outcome);
  let index = 0;

  const wrap = el('div', 'swipe');
  const pills = outcomePills(outcome, (key) => { outcome = key; deck = deckFor(techniques, outcome); index = 0; renderDeck(); });
  const stack = el('div', 'swipe__stack');
  const actions = el('div', 'swipe__actions');
  const skip = el('button', 'swipe__button', { type: 'button' });
  skip.append(icon('close'), el('span', 'swipe__button-label', { textContent: 'Another' }));
  skip.setAttribute('aria-label', 'Another');
  const go = el('button', 'swipe__button swipe__button--go', { type: 'button' });
  go.append(el('span', 'swipe__play'), el('span', 'swipe__button-label', { textContent: 'Breathe' }));
  go.setAttribute('aria-label', 'Breathe this one');
  actions.append(skip, go);
  const hint = el('p', 'pick-note', { textContent: 'Swipe right to breathe, left for another.' });
  const browse = el('button', 'pick-link', { type: 'button', textContent: 'Or browse everything →' });
  browse.addEventListener('click', onBrowse);
  wrap.append(pills, stack, actions, hint, browse);
  root.replaceChildren(wrap);

  function card(t, { top = false } = {}) {
    const c = hued(el('article', 'swipe-card'), t.hue);
    const o = OUTCOMES.find(x => x.key === t.outcome);
    const head = el('div', 'swipe-card__head');
    head.append(el('span', 'chip swipe-card__tag', { textContent: o?.label ?? '' }), el('span', 'swipe-card__time', { textContent: timeLabel(t.minutes) }));
    c.append(
      head,
      shapeArt(t.shape, 'min(26vw, 6.5rem)'),
      el('h2', 'swipe-card__name', { textContent: t.name }),
      el('p', 'swipe-card__pattern', { textContent: t.pattern }),
      el('p', 'swipe-card__use', { textContent: t.use }),
    );
    if (t.safety) c.append(el('p', 'swipe-card__safety', { textContent: 'Sit or lie down for this one.' }));
    if (top) {
      const stamp = el('span', 'swipe-card__stamp', { textContent: 'Breathe' });
      stamp.setAttribute('aria-hidden', 'true');
      c.append(stamp);
      c.tabIndex = -1;
      drag(c);
    }
    return c;
  }

  function renderDeck() {
    wrap.classList.remove('swipe--ready');
    actions.hidden = false;
    hint.hidden = false;
    if (index >= deck.length) {
      const done = el('div', 'swipe__done');
      const again = el('button', 'button button--ghost', { type: 'button', textContent: 'Start again' });
      again.addEventListener('click', () => { index = 0; renderDeck(); });
      done.append(el('p', 'pick-note', { textContent: "That's every one." }), again);
      stack.replaceChildren(done);
      actions.hidden = true;
      return;
    }
    const cards = [];
    if (deck[index + 1]) cards.push(card(deck[index + 1]));
    cards.push(card(deck[index], { top: true }));
    cards[0].classList.toggle('swipe-card--next', cards.length > 1);
    stack.replaceChildren(...cards);
  }

  function topCard() { return stack.querySelector('.swipe-card:not(.swipe-card--next)'); }

  function fling(dir) {
    const c = topCard();
    if (!c) return;
    const done = () => (dir > 0 ? ready(deck[index]) : (index++, renderDeck()));
    if (reduce) { done(); return; }
    c.style.transition = 'transform 240ms ease-in, opacity 240ms ease-in';
    c.style.transform = `translateX(${dir * 120}%) rotate(${dir * 18}deg)`;
    c.style.opacity = '0';
    setTimeout(done, 230);
  }

  function drag(c) {
    let startX = null;
    let dx = 0;
    c.addEventListener('pointerdown', (e) => {
      startX = e.clientX; dx = 0;
      c.setPointerCapture(e.pointerId);
      c.style.transition = 'none';
    });
    c.addEventListener('pointermove', (e) => {
      if (startX == null) return;
      dx = e.clientX - startX;
      c.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      c.style.setProperty('--stamp', String(Math.max(0, Math.min(1, dx / THRESHOLD))));
    });
    const end = () => {
      if (startX == null) return;
      startX = null;
      if (dx > THRESHOLD) fling(1);
      else if (dx < -THRESHOLD) fling(-1);
      else {
        c.style.transition = 'transform 200ms ease-out';
        c.style.transform = '';
        c.style.setProperty('--stamp', '0');
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  function ready(t) {
    wrap.classList.add('swipe--ready');
    actions.hidden = true;
    hint.hidden = true;
    const o = OUTCOMES.find(x => x.key === t.outcome);
    const view = hued(el('div', 'pick-ready'), t.hue);
    const keep = el('button', 'button button--ghost', { type: 'button', textContent: 'Keep swiping' });
    keep.addEventListener('click', () => { index++; renderDeck(); });
    view.append(
      el('div', 'eyebrow', { textContent: `${o?.label ?? ''} · ${timeLabel(t.minutes)}` }),
      shapeArt(t.shape, 'min(36vw, 9rem)'),
      el('h2', 'pick-ready__name', { textContent: t.name }),
      el('p', 'pick-ready__use', { textContent: t.use }),
      startLink(t),
      keep,
    );
    stack.replaceChildren(view);
    view.querySelector('.pick-start').focus({ preventScroll: true });
  }

  skip.addEventListener('click', () => fling(-1));
  go.addEventListener('click', () => fling(1));
  renderDeck();
  return { destroy() { root.replaceChildren(); } };
}
