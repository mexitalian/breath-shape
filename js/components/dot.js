import { el } from '../dom.js';

// Marker that walks the shape's path, one side per phase, arriving slightly early
// so it visibly settles at each corner. It is a small copy of the shape in the fill
// colour; where it overlaps the fill it becomes a hole through it (css/components/dot.css).
const ARRIVE_AT = 0.96;

// The shape as a mask image, used to cut the marker and the fill out of each other.
export function shapeMask(path) {
  const points = path.map(([x, y]) => `${x},${y}`).join(' ');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><polygon points='${points}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function dot({ field, cfg }) {
  const path = cfg.path;
  if (!path) throw new Error(`Shape "${cfg.shape}" has no path for the dot to trace`);
  const node = el('div', 'dot');
  field.dataset.marker = '';
  field.style.setProperty('--shape-mask', shapeMask(path));
  field.append(node);

  function update(snap) {
    const i = snap.phaseIndex % path.length;
    const [ax, ay] = path[i];
    const [bx, by] = path[(i + 1) % path.length];
    const t = snap.progress == null ? 1 : Math.min(1, snap.progress / ARRIVE_AT);
    // On the field, so the fill can cut the matching hole.
    field.style.setProperty('--dot-x', ((ax + (bx - ax) * t) / 100).toFixed(4));
    field.style.setProperty('--dot-y', ((ay + (by - ay) * t) / 100).toFixed(4));
  }

  return { update };
}
