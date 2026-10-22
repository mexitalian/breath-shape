import { el } from '../dom.js';
import { easing } from '../easing.js';

// On phases marked ripple: true, a ring expands past the field edge and fades;
// otherwise it rests at the smallest breath size.
const PEAK_SCALE = 1.05;
const REST_OPACITY = 0.6;

export function ripple({ field, cfg }) {
  const node = el('div', 'ripple');
  field.append(node);

  function update(snap) {
    let scale = cfg.minScale;
    let opacity = REST_OPACITY;
    if (snap.phase.ripple && !snap.finished) {
      const e = easing(snap.phase.easing)(snap.scaleProgress);
      scale = cfg.minScale + (PEAK_SCALE - cfg.minScale) * e;
      opacity = REST_OPACITY * (1 - e);
    }
    node.style.setProperty('--ripple-scale', scale.toFixed(4));
    node.style.setProperty('--ripple-opacity', opacity.toFixed(4));
  }

  return { update };
}
