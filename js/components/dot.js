import { el } from '../dom.js';

// Marker that walks the shape's path, one side per phase, arriving slightly early
// so it visibly settles at each corner. It is a small copy of the shape itself.
const ARRIVE_AT = 0.96;

export function dot({ field, cfg }) {
  const path = cfg.path;
  if (!path) throw new Error(`Shape "${cfg.shape}" has no path for the dot to trace`);
  const node = el('div', 'dot');
  if (cfg.coreClip) node.style.setProperty('--core-clip', cfg.coreClip);
  field.append(node);

  function update(snap) {
    const i = snap.phaseIndex % path.length;
    const [ax, ay] = path[i];
    const [bx, by] = path[(i + 1) % path.length];
    const t = snap.progress == null ? 1 : Math.min(1, snap.progress / ARRIVE_AT);
    node.style.setProperty('--dot-x', ((ax + (bx - ax) * t) / 100).toFixed(4));
    node.style.setProperty('--dot-y', ((ay + (by - ay) * t) / 100).toFixed(4));
  }

  return { update };
}
