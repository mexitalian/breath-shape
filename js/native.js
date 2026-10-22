// Native bridge when running inside the Capacitor app; null/false on the website.
const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;

export const isNativeApp = !!cap?.isNativePlatform?.();
export const platform = isNativeApp ? cap.getPlatform() : 'web';

// Capacitor's injected bridge only fills Capacitor.Plugins when a plugin's JS calls
// registerPlugin(), which needs a bundler. Instead, read the plugin list the native
// side announces (PluginHeaders) and call methods through nativePromise directly.
export function pluginFromBridge(bridge, name) {
  if (!bridge?.isNativePlatform?.()) return null;
  if (bridge.Plugins?.[name]) return bridge.Plugins[name];
  const header = bridge.PluginHeaders?.find((h) => h.name === name);
  if (!header || typeof bridge.nativePromise !== 'function') return null;
  return Object.fromEntries(
    header.methods.map((m) => [m.name, (options = {}) => bridge.nativePromise(name, m.name, options)]),
  );
}

export function nativePlugin(name) {
  return pluginFromBridge(cap, name);
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
