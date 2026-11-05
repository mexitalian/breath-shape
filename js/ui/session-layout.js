import { el } from '../dom.js';
import { readSettings, onSettingsChange } from '../settings.js';

// Session layouts (#128), chosen in Settings → Session layout. In all three the
// shape keeps its full size and proportions (it is never squashed); what changes is
// how the text and controls under it behave when they don't fit:
//   sticky  the shape stays at the top like a sticky header; the rest scrolls under it
//   shrink  scrolling down shrinks the shape in proportion, so it stays on screen;
//           back at the top it is full size again
//   fill    the whole screen fills and empties with the breath; anything the fill
//           covers flips to the on-fill colour so it stays readable
// Dragging scrolls everywhere except on the shape while Fluid shapes are on (the
// liquid takes that touch).

export const SHRINK_MIN = 0.35;

// Pure: the shape's scale in Shrink at a scroll position. It shrinks as fast as the
// content scrolls, so the content's top edge follows the shape's bottom edge.
export function shrinkScale(scrollTop, visualHeight, min = SHRINK_MIN) {
  if (!(visualHeight > 0)) return 1;
  return Math.min(1, Math.max(min, 1 - Math.max(0, scrollTop) / visualHeight));
}

// Pure: how full the screen is in Fill (0–1), from the breath scale.
export function fillLevel(scale, minScale, maxScale) {
  const span = maxScale - minScale;
  if (!(span > 0)) return 1;
  return Math.min(1, Math.max(0, (scale - minScale) / span));
}

// Pure: is an element under the fill? It flips when the fill passes its middle.
export function isCovered(rect, lineY) {
  return (rect.top + rect.bottom) / 2 >= lineY;
}

// The parts that flip colour in Fill, each as one block.
const FLIP = [
  '.topbar__back', '.topbar__title', '.topbar__actions > *',
  '.shape-label:not(.shape-label--on-fill)',
  '.cycles__count', '.cycles__grid', '.cycles__length',
  '.labels', '.hint', '.stage__controls .button', '.pace__value',
].join(', ');
const REMEASURE_MS = 500;

// stage: the .stage element; visual: the .stage__visual wrapper round the field(s).
export function createSessionLayout({ stage, visual, cfg }) {
  const fill = el('div', 'breath-fill');
  fill.setAttribute('aria-hidden', 'true');
  const backdrop = el('div', 'stage__backdrop');
  backdrop.setAttribute('aria-hidden', 'true');
  stage.prepend(fill);
  visual.prepend(backdrop);

  let mode = readSettings().sessionLayout;
  let visualHeight = 0;
  let items = [];
  let rects = [];
  let measuredAt = -Infinity;

  // The shape's own height, without the Shrink transform.
  const measureVisual = () => {
    const shape = visual.querySelector(':scope > .field, :scope > .split');
    visualHeight = shape ? shape.offsetHeight : 0;
    stage.style.setProperty('--visual-height', `${visualHeight}px`);
  };
  const measureItems = (now) => {
    items = [...stage.querySelectorAll(FLIP)];
    rects = items.map(e => e.getBoundingClientRect());
    measuredAt = now;
  };

  function onScroll() {
    stage.toggleAttribute('data-scrolled', stage.scrollTop > 0);
    const k = mode === 'shrink' ? shrinkScale(stage.scrollTop, visualHeight) : 1;
    stage.style.setProperty('--shrink', k.toFixed(4));
    measuredAt = -Infinity;
  }
  function onResize() {
    measureVisual();
    onScroll();
  }

  function clearFlips() {
    for (const e of stage.querySelectorAll('[data-on-fill]')) e.removeAttribute('data-on-fill');
  }

  function apply(next) {
    mode = next;
    if (mode !== 'fill') clearFlips();
    onResize();
  }

  stage.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  const stopListening = onSettingsChange((settings) => {
    if (settings.sessionLayout !== mode) apply(settings.sessionLayout);
  });
  apply(mode);

  return {
    // Every frame: in Fill, the level and which parts sit under it.
    update(snap) {
      if (mode !== 'fill') return;
      const level = fillLevel(snap.scale, cfg.minScale, cfg.maxScale);
      stage.style.setProperty('--breath-level', level.toFixed(4));
      const now = performance.now();
      if (now - measuredAt > REMEASURE_MS) measureItems(now);
      const line = window.innerHeight * (1 - level);
      items.forEach((item, i) => {
        const covered = isCovered(rects[i], line);
        if (covered !== item.hasAttribute('data-on-fill')) item.toggleAttribute('data-on-fill', covered);
      });
    },
    destroy() {
      stage.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      stopListening();
      fill.remove();
      backdrop.remove();
    },
  };
}
