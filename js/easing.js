const CURVES = {
  'linear':      [0, 0, 1, 1],
  'ease':        [0.25, 0.1, 0.25, 1],
  'ease-in':     [0.42, 0, 1, 1],
  'ease-out':    [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

export function cubicBezier(x1, y1, x2, y2) {
  const bez = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      t = (lo + hi) / 2;
      if (bez(x1, x2, t) < x) lo = t; else hi = t;
    }
    return bez(y1, y2, t);
  };
}

const cache = new Map();

export function easing(name = 'ease-in-out') {
  if (typeof name === 'function') return name;
  if (!cache.has(name)) {
    const curve = CURVES[name];
    if (!curve) throw new Error(`Unknown easing "${name}"`);
    cache.set(name, cubicBezier(...curve));
  }
  return cache.get(name);
}
