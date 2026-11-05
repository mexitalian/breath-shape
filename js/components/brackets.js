import { el } from '../dom.js';

const SVG = 'http://www.w3.org/2000/svg';

// Closure (#148): in the Fill layout, Box and Triangle are implied by their corners.
// A hairline bracket sits at each corner of the path, nothing between them. Each arm
// is as long as the marker's own edge there, so when the marker (a small copy of the
// shape, css/components/dot.css) reaches a corner, bracket and marker make one small
// shape. Shown only in Fill (css/components/session-layout.css).

// Pure: a bracket's three points, in px, for corner i of `path` (percent of the field)
// on a field `size` px square with a marker `marker` px across. The arms run from the
// corner towards its two neighbours, as far as the marker's edges reach.
export function bracketPoints(path, i, size, marker) {
  const px = ([x, y]) => [(x / 100) * size, (y / 100) * size];
  const v = px(path[i]);
  const prev = px(path[(i + path.length - 1) % path.length]);
  const next = px(path[(i + 1) % path.length]);
  const k = marker / size;
  const toward = (p) => [v[0] + (p[0] - v[0]) * k, v[1] + (p[1] - v[1]) * k];
  return [toward(prev), v, toward(next)];
}

export function brackets({ field, cfg }) {
  if (!cfg.path) throw new Error(`Shape "${cfg.shape}" has no path for brackets`);
  const root = el('div', 'brackets');
  root.setAttribute('aria-hidden', 'true');
  // One element per corner, so each flips colour on its own when the liquid covers it.
  const corners = cfg.path.map(() => {
    const node = el('div', 'bracket');
    const svg = document.createElementNS(SVG, 'svg');
    const line = document.createElementNS(SVG, 'polyline');
    svg.append(line);
    node.append(svg);
    root.append(node);
    return { node, svg, line };
  });
  field.append(root);

  let lastSize = 0;
  function layout() {
    const size = field.clientWidth;
    if (!size || size === lastSize) return;
    lastSize = size;
    const marker = parseFloat(getComputedStyle(field).getPropertyValue('--dot-size')) || 18;
    corners.forEach(({ node, svg, line }, i) => {
      const pts = bracketPoints(cfg.path, i, size, marker);
      // A little room round the points so the hairline isn't clipped.
      const pad = 1;
      const minX = Math.min(...pts.map(p => p[0])) - pad;
      const minY = Math.min(...pts.map(p => p[1])) - pad;
      const w = Math.max(...pts.map(p => p[0])) - minX + pad;
      const h = Math.max(...pts.map(p => p[1])) - minY + pad;
      Object.assign(node.style, { left: `${minX}px`, top: `${minY}px`, width: `${w}px`, height: `${h}px` });
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      line.setAttribute('points', pts.map(([x, y]) => `${(x - minX).toFixed(2)},${(y - minY).toFixed(2)}`).join(' '));
    });
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null;
  observer?.observe(field);
  layout();

  return {};
}
