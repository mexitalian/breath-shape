// Deterministic hash-based value noise, smoothstep interpolated.
export function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function noise1D(x) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i);
  const b = hash(i + 1);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}
