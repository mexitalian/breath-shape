import { el } from '../dom.js';

// Dot that walks the shape's path, one side per phase, arriving slightly early
// so it visibly settles at each corner.
const ARRIVE_AT = 0.96;

export function dot({ field, cfg }) {
  const path = cfg.path;
  if (!path) throw new Error(`Shape "${cfg.shape}" has no path for the dot to trace`);
  const node = el('div', 'dot');
  field.append(node);

  function update(snap) {
    const i = snap.phaseIndex % path.length;
    const [ax, ay] = path[i];
    const [bx, by] = path[(i + 1) % path.length];
    const t = snap.progress == null ? 1 : Math.min(1, snap.progress / ARRIVE_AT);
    node.style.setProperty('--dot-x', `${ax + (bx - ax) * t}%`);
    node.style.setProperty('--dot-y', `${ay + (by - ay) * t}%`);
  }

  return { update };
}
