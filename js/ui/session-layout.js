import { el } from '../dom.js';
import { readSettings, onSettingsChange } from '../settings.js';
import { LiquidSim } from '../fluid/liquid-sim.js';
import { slopeFor } from '../fluid/vessel.js';
import { createMotion } from '../controls/motion.js';

// Session layouts (#128, #137), chosen in Settings → Session layout. The shape keeps
// its full size and proportions (it is never squashed); what changes is how the text
// and controls under it behave when they don't fit:
//   shrink  (default) the shape stays at the top; scrolling down shrinks it in
//           proportion, down to SHRINK_MIN, and the text rises with its bottom edge.
//           Past that, the text passes behind it through a soft fade in the shape's
//           own outline (the halo). Back at the top it is full size again.
//   fill    the whole screen fills and empties with the breath, as a liquid: its
//           surface is the same simulation as the Vessel's, sloshed level with the
//           real floor by tilt (on a computer, the mouse) and by shakes, with bubbles
//           rising through it (the particles, in this layout). Anything the liquid
//           covers flips to the on-fill colour so it stays readable (#138)
// ('sticky', full size with the text sliding under it, was retired in #137.)

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

// Pure: the liquid as a CSS clip-path on a full-screen layer: the surface at levelY
// (px from the top) plus the simulation's heights across the width, down to the
// bottom. With no simulation (reduced motion) the surface is flat.
export function liquidClip(sim, levelY, width) {
  if (!sim) return `polygon(0% ${levelY.toFixed(1)}px,100% ${levelY.toFixed(1)}px,100% 100%,0% 100%)`;
  let points = '';
  for (let i = 0; i < sim.count; i++) points += `${((sim.x(i) / width) * 100).toFixed(2)}% ${(levelY + sim.h[i]).toFixed(1)}px,`;
  return `polygon(${points}100% 100%,0% 100%)`;
}

// Pure: the surface's height (px, + = down) above a point x on the screen.
export function surfaceAt(sim, x) {
  if (!sim) return 0;
  const i = Math.min(sim.count - 1, Math.max(0, Math.round(x / sim.spacing)));
  return sim.h[i];
}

const BUBBLES = 18;

// The parts that flip colour in Fill, each as one block.
const FLIP = [
  '.topbar__back', '.topbar__title', '.topbar__actions > *',
  '.shape-label:not(.shape-label--on-fill)',
  '.cycles__count', '.cycles__grid', '.cycles__length',
  '.labels', '.hint', '.stage__controls .button', '.pace__value',
  '.bracket',
].join(', ');
// Parts that move every frame, so they're measured every frame: the closure marker.
const MOVERS = '.field[data-marker] .dot';
const REMEASURE_MS = 500;

// stage: the .stage element; visual: the .stage__visual wrapper round the field(s).
export function createSessionLayout({ stage, visual, cfg }) {
  const fill = el('div', 'breath-fill');
  fill.setAttribute('aria-hidden', 'true');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Bubbles rising through the liquid: the particles, in Fill. Each has its own size,
  // place, speed and sway; the liquid's clip-path hides them above the surface.
  if (!reduceMotion) {
    for (let i = 0; i < BUBBLES; i++) {
      const b = el('span', 'bubble');
      b.style.setProperty('--x', `${(Math.random() * 96 + 2).toFixed(1)}%`);
      b.style.setProperty('--size', `${(3 + Math.random() * 7).toFixed(1)}px`);
      b.style.setProperty('--rise', `${(7 + Math.random() * 9).toFixed(1)}s`);
      b.style.setProperty('--delay', `${(-Math.random() * 16).toFixed(1)}s`);
      b.style.setProperty('--sway', `${(6 + Math.random() * 14).toFixed(0)}px`);
      fill.append(b);
    }
  }
  // The liquid surface: built while Fill is on.
  let sim = null;
  let simWidth = 0;
  let motion = null;
  let lastTick = 0;
  let wobble = readSettings().membraneWobble;
  function startLiquid() {
    if (motion || reduceMotion) return;
    motion = createMotion({
      onShake: ({ strength, x }) => sim?.shove(Math.sign(x) || 1, strength * simWidth * 0.8 * (wobble / 3)),
    });
  }
  function stopLiquid() {
    motion?.destroy();
    motion = null;
    sim = null;
    fill.style.clipPath = '';
  }
  function ensureSim() {
    if (reduceMotion) return;
    const w = window.innerWidth;
    if (sim && simWidth === w) return;
    simWidth = w;
    sim = new LiquidSim(w, { waveSpeed: w * 1.1, friction: 1.3, settlePull: 6, maxRise: w * 0.18, maxDepth: w * 0.18 });
  }
  stage.prepend(fill);
  // A halo behind each shape, in its outline: page colour with a soft edge, so text
  // scrolling behind the shrunk shape fades out round it instead of under a band.
  const halos = [...visual.querySelectorAll('.field')].map((field) => {
    const halo = el('div', 'field__halo');
    halo.setAttribute('aria-hidden', 'true');
    field.prepend(halo);
    return halo;
  });

  let mode = readSettings().sessionLayout;
  let visualHeight = 0;
  let items = [];
  let rects = [];
  let movers = [];
  let measuredAt = -Infinity;

  // The shape's own height, without the Shrink transform.
  const measureVisual = () => {
    const shape = visual.querySelector(':scope > .field, :scope > .split');
    visualHeight = shape ? shape.offsetHeight : 0;
    stage.style.setProperty('--visual-height', `${visualHeight}px`);
  };
  const measureItems = (now) => {
    items = [...stage.querySelectorAll(FLIP)];
    movers = [...stage.querySelectorAll(MOVERS)];
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
    if (mode === 'fill') startLiquid();
    else { clearFlips(); stopLiquid(); }
    onResize();
  }

  stage.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  const stopListening = onSettingsChange((settings) => {
    wobble = settings.membraneWobble;
    if (settings.sessionLayout !== mode) apply(settings.sessionLayout);
  });
  apply(mode);

  return {
    // Every frame: in Fill, the level and which parts sit under it.
    update(snap) {
      if (mode !== 'fill') return;
      const level = fillLevel(snap.scale, cfg.minScale, cfg.maxScale);
      const now = performance.now();
      const levelY = window.innerHeight * (1 - level);
      ensureSim();
      if (sim) {
        const dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 1 / 60;
        if (motion?.available) sim.setSlope(slopeFor(motion.gravity));
        sim.step(dt);
      }
      lastTick = now;
      fill.style.clipPath = liquidClip(sim, levelY, simWidth || window.innerWidth);
      if (now - measuredAt > REMEASURE_MS) measureItems(now);
      items.forEach((item, i) => {
        const r = rects[i];
        const covered = isCovered(r, levelY + surfaceAt(sim, (r.left + r.right) / 2));
        if (covered !== item.hasAttribute('data-on-fill')) item.toggleAttribute('data-on-fill', covered);
      });
      for (const item of movers) {
        const r = item.getBoundingClientRect();
        const covered = isCovered(r, levelY + surfaceAt(sim, (r.left + r.right) / 2));
        if (covered !== item.hasAttribute('data-on-fill')) item.toggleAttribute('data-on-fill', covered);
      }
    },
    destroy() {
      stage.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      stopListening();
      stopLiquid();
      fill.remove();
      for (const halo of halos) halo.remove();
    },
  };
}
