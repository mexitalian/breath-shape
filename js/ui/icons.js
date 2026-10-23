// Inline SVG icons (24×24, stroke uses currentColor). Constant markup only.
const SVG_NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  back: ['M15 5l-7 7 7 7'],
  vibrate: ['M9 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M4 9v6', 'M20 9v6', 'M1.5 10.5v3', 'M22.5 10.5v3'],
  sound: ['M4 10v4h4l5 4V6L8 10H4z', 'M16.5 9a4 4 0 0 1 0 6', 'M19 6.5a7.5 7.5 0 0 1 0 11'],
  settings: ['M19.09 13.24L21.22 14.28L20.14 16.91L17.89 16.14A7.2 7.2 0 0 1 16.14 17.89L16.14 17.89L16.91 20.14L14.28 21.22L13.24 19.09A7.2 7.2 0 0 1 10.76 19.09L10.76 19.09L9.72 21.22L7.09 20.14L7.86 17.89A7.2 7.2 0 0 1 6.11 16.14L6.11 16.14L3.86 16.91L2.78 14.28L4.91 13.24A7.2 7.2 0 0 1 4.91 10.76L4.91 10.76L2.78 9.72L3.86 7.09L6.11 7.86A7.2 7.2 0 0 1 7.86 6.11L7.86 6.11L7.09 3.86L9.72 2.78L10.76 4.91A7.2 7.2 0 0 1 13.24 4.91L13.24 4.91L14.28 2.78L16.91 3.86L16.14 6.11A7.2 7.2 0 0 1 17.89 7.86L17.89 7.86L20.14 7.09L21.22 9.72L19.09 10.76A7.2 7.2 0 0 1 19.09 13.24Z', 'M15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0'],
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
