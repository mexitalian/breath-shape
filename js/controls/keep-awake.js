import { nativePlugin } from '../native.js';

// Keeps the screen on while a session runs: the KeepAwake plugin in the app, the
// Screen Wake Lock API on the website (where supported). Best-effort everywhere.
export function createKeepAwake() {
  const plugin = nativePlugin('KeepAwake');
  let wanted = false;
  let lock = null;

  async function requestWebLock() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch { /* denied or unsupported; the screen may dim */ }
  }

  // The web lock is dropped whenever the page is hidden; take it again on return.
  const onVisible = () => {
    if (wanted && !lock && !plugin) requestWebLock();
  };
  document.addEventListener('visibilitychange', onVisible);

  return {
    acquire() {
      if (wanted) return;
      wanted = true;
      if (plugin) plugin.keepAwake().catch(() => {});
      else requestWebLock();
    },
    release() {
      if (!wanted) return;
      wanted = false;
      if (plugin) plugin.allowSleep().catch(() => {});
      else lock?.release().catch(() => {});
      lock = null;
    },
    destroy() {
      this.release();
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}
