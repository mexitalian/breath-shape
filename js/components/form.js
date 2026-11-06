import { el } from '../dom.js';
import { FORMS, VIEW, formMask, pathPoints, pointAlong, toPercent } from '../forms.js';

const SVG = 'http://www.w3.org/2000/svg';

// Breath shapes (#159): the technique's own shape. Draws its outline behind the core
// and shapes the core with a mask (css/components/field.css, [data-form]), so the
// phase text still reads as a negative inside it. With Breath shapes → Shapes + count,
// the Energise pictures redraw as the round goes on.
export function form({ field, cfg }) {
  const key = cfg.formKey;
  const shape = FORMS[key];
  field.dataset.form = key;
  field.style.setProperty('--form-mask', formMask(shape.fill()));
  if (shape.label) {
    field.style.setProperty('--label-dx', `${(toPercent(shape.label[0]) - 50).toFixed(2)}cqw`);
    field.style.setProperty('--label-dy', `${(toPercent(shape.label[1]) - 50).toFixed(2)}cqh`);
  }
  if (shape.track) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'outline form-track');
    svg.setAttribute('viewBox', VIEW);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', shape.track);
    svg.append(path);
    field.append(svg);
  }

  const counting = cfg.formMode === 'counted' && shape.count;
  if (counting) field.dataset.formCount = '';
  let last = '';
  function update(snap) {
    if (!counting) return;
    const inner = shape.count(snap);
    if (inner === last) return;
    last = inner;
    field.style.setProperty('--form-mask', formMask(inner));
  }
  return { update };
}

// The marker for shapes with sides: a dot riding the outline, one side per phase,
// arriving just before the phase ends (like js/components/dot.js).
const ARRIVE_AT = 0.96;
export function formMarker({ field, cfg }) {
  const sides = FORMS[cfg.formKey].sides.map(d => pathPoints(d));
  const node = el('div', 'form-marker');
  node.setAttribute('aria-hidden', 'true');
  field.append(node);
  function update(snap) {
    const side = sides[snap.phaseIndex % sides.length];
    const t = snap.progress == null ? 1 : Math.min(1, snap.progress / ARRIVE_AT);
    const [x, y] = pointAlong(side, t);
    node.style.left = `${toPercent(x).toFixed(2)}%`;
    node.style.top = `${toPercent(y).toFixed(2)}%`;
  }
  return { update };
}
