// Static outline drawn from the shape's path, for shapes a CSS border can't draw.
const SVG = 'http://www.w3.org/2000/svg';

export function outline({ field, cfg }) {
  if (!cfg.path) throw new Error(`Shape "${cfg.shape}" has no path to outline`);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'outline');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const polygon = document.createElementNS(SVG, 'polygon');
  polygon.setAttribute('points', cfg.path.map(([x, y]) => `${x},${y}`).join(' '));
  svg.append(polygon);
  field.append(svg);
  return {};
}
