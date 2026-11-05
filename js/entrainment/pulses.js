// Entrainment lab (#143): the maths shared by the web and native engines.
// Beats are isochronic: a tone (and/or a vibration) switched on and off at the beat
// rate. Rates step in 0.5 Hz so a 2-second block always holds a whole number of
// beats, which lets a vibration pattern loop for ever without drifting.

export const MIN_HZ = 0.5;
export const MAX_HZ = 40;
export const STEP_HZ = 0.5;
export const BLOCK_MS = 2000;

// The usual bands, each with a rate in its middle. Labels describe what the band is
// associated with in the literature, not a promised effect.
export const PRESETS = [
  { key: 'delta', label: 'Delta', hz: 2, note: 'deep sleep' },
  { key: 'theta', label: 'Theta', hz: 6, note: 'drowsy, meditative' },
  { key: 'alpha', label: 'Alpha', hz: 10, note: 'relaxed, awake' },
  { key: 'beta', label: 'Beta', hz: 18, note: 'alert, focused' },
  { key: 'gamma', label: 'Gamma', hz: 40, note: 'very fast; sound only' },
];

export function clampHz(hz) {
  const n = Number(hz);
  if (!Number.isFinite(n)) return PRESETS[1].hz;
  return Math.min(MAX_HZ, Math.max(MIN_HZ, Math.round(n / STEP_HZ) * STEP_HZ));
}

// Pure: the band a rate falls in.
export function bandFor(hz) {
  if (hz < 4) return 'delta';
  if (hz < 8) return 'theta';
  if (hz < 13) return 'alpha';
  if (hz < 30) return 'beta';
  return 'gamma';
}

// Pure: an isochronic pulse's loudness at a point in the beat (phase 0–1): on for
// `duty` of the beat, with raised-cosine edges `edge` long (a fraction of the beat)
// so it doesn't click. Mirrored in EntrainmentPlayer.java.
export function isochronicGain(phase, duty = 0.5, edge = 0.1) {
  const p = ((phase % 1) + 1) % 1;
  if (p >= duty) return 0;
  const e = Math.min(edge, duty / 2);
  if (e <= 0) return 1;
  if (p < e) return 0.5 - 0.5 * Math.cos((Math.PI * p) / e);
  if (p > duty - e) return 0.5 - 0.5 * Math.cos((Math.PI * (duty - p)) / e);
  return 1;
}

// Pure: one block of vibration, [on, off, on, off, ...] ms, exactly BLOCK_MS long.
// Each beat's start is rounded from its exact time, so rounding never adds up, and
// the block can repeat with no drift. Too fast for a gap (on would fill the beat):
// the beats merge into one buzz, which is what the motor would do anyway.
// strength: 1–255. Returns durations, amplitudes (strength / 0) and the beat count.
export function hapticPattern(hz, { duty = 0.5, minOnMs = 12, strength = 255 } = {}) {
  const rate = clampHz(hz);
  const beats = Math.round((rate * BLOCK_MS) / 1000);
  const durations = [];
  const amplitudes = [];
  for (let i = 0; i < beats; i++) {
    const start = Math.round((i * BLOCK_MS) / beats);
    const next = Math.round(((i + 1) * BLOCK_MS) / beats);
    const span = next - start;
    const on = Math.min(span, Math.max(minOnMs, Math.round(span * duty)));
    durations.push(on, span - on);
    amplitudes.push(strength, 0);
  }
  // Merge zero-length gaps into a continuous buzz.
  const d = [];
  const a = [];
  durations.forEach((ms, i) => {
    if (ms === 0) return;
    if (a.length && a[a.length - 1] === amplitudes[i]) d[d.length - 1] += ms;
    else { d.push(ms); a.push(amplitudes[i]); }
  });
  return { durations: d, amplitudes: a, beats, blockMs: BLOCK_MS };
}

// Pure: how steady a series of times was, against the gap it should have had.
// times: ms; returns the count of gaps, their mean, and the average and worst error.
export function timingStats(times, expectedMs) {
  const gaps = [];
  for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
  if (!gaps.length) return { count: 0, meanMs: null, avgErrorMs: null, maxErrorMs: null };
  const errors = gaps.map(g => Math.abs(g - expectedMs));
  return {
    count: gaps.length,
    meanMs: gaps.reduce((s, g) => s + g, 0) / gaps.length,
    avgErrorMs: errors.reduce((s, e) => s + e, 0) / errors.length,
    maxErrorMs: Math.max(...errors),
  };
}
