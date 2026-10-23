import { waveform } from './native.js';

// Phases shorter than this keep short taps in the continuous style: a ramp that
// short blurs into one buzz.
export const MIN_RAMP_MS = 1500;
// Below about this much change in size, a phase counts as a hold (no ramp).
const HOLD_EPSILON = 0.01;
// The hum's loudest level at full volume, as on the website (js/controls/sound.js).
export const HUM_MAX_LEVEL = 0.13;

const VIBE_NONE = -1;
const VIBE_UP = -2;
const VIBE_DOWN = -3;

// How a phase vibrates: a ramp up (breathing in), a ramp down (breathing out), the
// phase's own tap pattern, or nothing (holds in the continuous style).
export function vibeFor({ phase, durMs, fromScale }, style) {
  const taps = phase.vibrate ? 'taps' : 'none';
  if (style !== 'continuous') return taps;
  if (durMs != null && durMs < MIN_RAMP_MS) return taps;
  const change = phase.scale - fromScale;
  if (change > HOLD_EPSILON) return 'up';
  if (change < -HOLD_EPSILON) return 'down';
  return 'none';
}

// The plan handed to the app's BreathSession service: what to vibrate and hum, and
// when, from a timeline forecast. Compact, as it's re-sent on every phase change:
// names and tap patterns are listed once and each phase is
// [serial, start ms, duration ms (-1 = until tapped), name index, vibe, hum 0/1],
// vibe = -1 none, -2 ramp up, -3 ramp down, n = tap pattern n.
export function cuePlan({ title, forecast, vibration, style, curve, usage, sound }) {
  const names = [];
  const patterns = [];
  const nameIndex = new Map();
  const patternIndex = new Map();
  const nameOf = (name) => {
    if (!nameIndex.has(name)) nameIndex.set(name, names.push(name) - 1);
    return nameIndex.get(name);
  };
  const patternOf = (pattern) => {
    const key = JSON.stringify(pattern);
    if (!patternIndex.has(key)) patternIndex.set(key, patterns.push(waveform(pattern)) - 1);
    return patternIndex.get(key);
  };
  const vibeOf = (p) => {
    if (!vibration) return VIBE_NONE;
    const kind = vibeFor(p, style);
    if (kind === 'up') return VIBE_UP;
    if (kind === 'down') return VIBE_DOWN;
    if (kind === 'taps') return patternOf(p.phase.vibrate);
    return VIBE_NONE;
  };
  const phases = forecast.phases.map(p => [
    p.serial,
    Math.round(p.start),
    p.durMs == null ? -1 : Math.round(p.durMs),
    nameOf(p.phase.name),
    vibeOf(p),
    sound && p.phase.hum ? 1 : 0,
  ]);
  return {
    title,
    usage,
    curve,
    vibration: !!vibration,
    sound: sound ? { tone: sound.tone, level: HUM_MAX_LEVEL * sound.volume } : null,
    ends: forecast.ends,
    names,
    patterns,
    phases,
  };
}
