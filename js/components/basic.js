import { el } from '../dom.js';

// Purely presentational parts. Their motion comes from CSS variables the engine
// writes onto the field (--breath-scale, --breath-glow), so they need no update().
const part = (className) => ({ field }) => {
  field.append(el('div', className));
  return {};
};

export const ring = part('ring');
export const track = part('track');
export const glow = part('glow');
