// Inline SVG icons (24×24, stroke uses currentColor). Constant markup only.
const SVG_NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  back: ['M15 5l-7 7 7 7'],
  vibrate: ['M9 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M4 9v6', 'M20 9v6', 'M1.5 10.5v3', 'M22.5 10.5v3'],
  sound: ['M4 10v4h4l5 4V6L8 10H4z', 'M16.5 9a4 4 0 0 1 0 6', 'M19 6.5a7.5 7.5 0 0 1 0 11'],
};

export function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  for (const d of PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
