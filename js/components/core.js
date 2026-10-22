import { el } from '../dom.js';
import { readout } from '../ui/labels.js';

// The breathing shape: a solid fill that grows to fill the outline at full inhale.
// The phase name and count are drawn twice at the centre: a light copy behind the
// fill and a dark copy inside it (clipped by the fill and counter-scaled), so the
// text reads as a negative wherever the fill covers it.
export function core({ field, cfg }) {
  const light = el('div', 'shape-label');
  const fill = el('div', 'core');
  const dark = el('div', 'shape-label shape-label--on-fill');
  fill.append(dark);
  field.append(light, fill);
  if (cfg.coreClip) fill.style.setProperty('--core-clip', cfg.coreClip);

  const layers = [light, dark].map((root) => {
    const phase = el('div', 'shape-label__phase');
    const count = el('div', 'shape-label__count');
    root.append(phase, count);
    return { root, phase, count };
  });

  let last = '';
  function update(snap) {
    const r = readout(snap);
    const hidden = !!snap.quiet;
    const key = `${hidden}|${r.phase}|${r.count}|${r.mode}`;
    if (key === last) return;
    last = key;
    for (const layer of layers) {
      layer.root.hidden = hidden;
      layer.phase.textContent = r.phase;
      layer.count.textContent = r.count;
      if (r.mode) layer.root.dataset.mode = r.mode;
      else delete layer.root.dataset.mode;
    }
  }

  return { update };
}
