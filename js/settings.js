// App settings, kept on this device: theme, particles, vibration.
// They apply straight away on every open page (the 'breathing:settings' event)
// and before first paint on the next one (js/settings-boot.js reads the same key).
export const SETTINGS_KEY = 'breathing:settings';
export const DEFAULTS = { theme: 'system', particles: 'on', vibration: true };
export const THEMES = ['system', 'light', 'dark'];
export const PARTICLES = ['on', 'off'];

function defaultStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function readSettings(storage = defaultStorage()) {
  let saved = {};
  try { saved = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? '{}') ?? {}; } catch { /* defaults */ }
  return {
    theme: THEMES.includes(saved.theme) ? saved.theme : DEFAULTS.theme,
    particles: PARTICLES.includes(saved.particles) ? saved.particles : DEFAULTS.particles,
    vibration: typeof saved.vibration === 'boolean' ? saved.vibration : DEFAULTS.vibration,
  };
}

// Theme and particles live on <html> so CSS can follow them.
export function applySettings(settings, root = document.documentElement) {
  if (settings.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  root.dataset.particles = settings.particles;
}

export function saveSettings(changes, storage = defaultStorage()) {
  const next = { ...readSettings(storage), ...changes };
  try { storage?.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* best-effort */ }
  if (typeof document !== 'undefined') {
    applySettings(next);
    window.dispatchEvent(new CustomEvent('breathing:settings', { detail: next }));
  }
  return next;
}

export function onSettingsChange(fn) {
  const listener = (e) => fn(e.detail);
  window.addEventListener('breathing:settings', listener);
  return () => window.removeEventListener('breathing:settings', listener);
}
