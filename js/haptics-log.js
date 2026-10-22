// Small persistent log of vibration attempts, shown on the Diagnostics page.
const KEY = 'breathing:haptics-log';
const MAX = 40;

function storage() {
  try { return window.localStorage; } catch { return null; }
}

export function readHapticsLog() {
  try { return JSON.parse(storage()?.getItem(KEY) ?? '[]'); } catch { return []; }
}

export function logHaptics(entry) {
  const log = readHapticsLog();
  log.push({ t: new Date().toISOString(), page: location.pathname.split('/').pop() || 'index.html', ...entry });
  try { storage()?.setItem(KEY, JSON.stringify(log.slice(-MAX))); } catch { /* best-effort */ }
}

export function clearHapticsLog() {
  try { storage()?.removeItem(KEY); } catch { /* best-effort */ }
}
