// Native bridge when running inside the Capacitor app; null/false on the website.
// Capacitor exposes registered native plugins on window.Capacitor.Plugins, so no
// bundler or plugin JS import is needed.
const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;

export const isNativeApp = !!cap?.isNativePlatform?.();
export const platform = isNativeApp ? cap.getPlatform() : 'web';

export function nativePlugin(name) {
  return isNativeApp ? cap.Plugins?.[name] ?? null : null;
}

// Vibration patterns are [on, off, on, off, ...] in ms (the web Vibration API format).
// Returns each pulse with its start time, for playing patterns one pulse at a time.
export function pulses(pattern) {
  const list = Array.isArray(pattern) ? pattern : [pattern];
  const out = [];
  let at = 0;
  list.forEach((ms, i) => {
    if (i % 2 === 0 && ms > 0) out.push({ at, duration: ms });
    at += ms;
  });
  return out;
}

// iOS haptics are taps, not timed buzzes: map a pulse length to a tap strength.
export function impactStyleFor(duration) {
  if (duration < 50) return 'LIGHT';
  if (duration < 100) return 'MEDIUM';
  return 'HEAVY';
}
