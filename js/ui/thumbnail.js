import { el } from '../dom.js';
import { normalize } from '../config.js';
import { createTimeline } from '../timeline.js';
import { COMPONENTS } from '../components/index.js';

// Components too busy to read at thumbnail size.
const SKIP = new Set(['particles', 'hum', 'ripple']);
// Thumbnails don't wait for a tap: open-ended holds move on after this long.
const HOLD_MS = 2500;

// A small, live version of a technique's own field (or split halves),
// breathing at the technique's real pace in its own colour.
export function createThumbnail(rawConfig) {
  const cfg = normalize(rawConfig);
  const root = el('div', 'thumb');
  root.dataset.hue = '';
  root.style.setProperty('--hue', cfg.hue);
  if (cfg.layout === 'split') root.dataset.layout = 'split';

  const sides = cfg.layout === 'split' ? ['left', 'right'] : [null];
  const fields = sides.map((side) => {
    const field = el('div', 'field');
    field.dataset.shape = cfg.shape;
    if (side) field.dataset.side = side;
    root.append(field);
    const parts = cfg.components
      .filter(name => !SKIP.has(name))
      .map(name => COMPONENTS[name]({ field, cfg }));
    return { side, field, parts };
  });

  const span = cfg.maxScale - cfg.minScale;
  const glowFor = (scale) => {
    const t = span ? (scale - cfg.minScale) / span : 1;
    return cfg.opacity.min + t * (cfg.opacity.max - cfg.opacity.min);
  };

  let timeline = createTimeline(cfg.sequence);
  timeline.start(performance.now());

  function update(now) {
    let snap = timeline.tick(now);
    if (snap.openEnded && snap.elapsed > HOLD_MS) {
      timeline.advance(now);
      snap = timeline.tick(now);
    }
    if (snap.finished) {
      timeline = createTimeline(cfg.sequence);
      timeline.start(now);
      snap = timeline.tick(now);
    }
    for (const f of fields) {
      const active = !f.side || !snap.phase.side || snap.phase.side === 'both' || snap.phase.side === f.side;
      f.field.toggleAttribute('data-active', active);
      f.field.style.setProperty('--breath-scale', snap.scale.toFixed(4));
      f.field.style.setProperty('--breath-glow', glowFor(snap.scale).toFixed(4));
      for (const p of f.parts) p.update?.(snap);
    }
  }

  return { root, update };
}
