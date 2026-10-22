import { el } from '../dom.js';

// On phases marked heat: true, warmth builds from the centre of the core
// over BUILD_MS and fades quickly when the phase ends.
const BUILD_MS = 20000;
const FADE_PER_FRAME = 0.06;

export function heat({ field }) {
  const node = el('div', 'heat');
  field.append(node);
  let level = 0;

  function update(snap) {
    const target = snap.phase.heat && !snap.finished
      ? Math.min(1, 0.15 + snap.elapsed / BUILD_MS)
      : 0;
    level = target >= level ? target : Math.max(target, level - FADE_PER_FRAME);
    node.style.setProperty('--heat', level.toFixed(4));
  }

  return { update };
}
