import { nativePlugin, platform, isDesktopApp, pulses, impactStyleFor, waveform, vibrationUsage } from '../native.js';
import { logHaptics } from '../haptics-log.js';
import { readSettings, onSettingsChange } from '../settings.js';

// Whether this device can vibrate at all (no motor on a Mac).
export function canVibrate() {
  if (isDesktopApp) return false;
  return !!nativePlugin('BreathVibration') || !!nativePlugin('Haptics') || 'vibrate' in navigator;
}

// Phase-change vibration, on or off from Settings. In the app, patterns play natively:
// on Android through the app's own BreathVibration plugin, tagged with a usage the
// phone doesn't silence (see Diagnostics); on iPhone as Haptics taps, since iOS has no
// web vibration. On the website the Vibration API is used; browsers only allow it
// after the first tap on the page.
export function initVibration(notify) {
  const android = platform === 'android' ? nativePlugin('BreathVibration') : null;
  const haptics = android ?? nativePlugin('Haptics');
  const webSupported = 'vibrate' in navigator;
  let armed = readSettings().vibration;
  let timers = [];
  const stopListening = onSettingsChange((settings) => { armed = settings.vibration; });

  let reportedError = false;

  // Every native call is logged (Diagnostics page) and the first failure is shown.
  function call(method, options) {
    const via = `${android ? 'BreathVibration' : 'Haptics'}.${method}`;
    let result;
    try {
      result = Promise.resolve(haptics[method](options));
    } catch (err) {
      result = Promise.reject(err);
    }
    return result.then(
      () => logHaptics({ via, options, ok: true }),
      (err) => {
        const message = err?.message ?? String(err);
        logHaptics({ via, options, ok: false, error: message });
        if (!reportedError) {
          reportedError = true;
          notify(`Vibration failed: ${message}`);
        }
      },
    );
  }

  function playNative(pattern) {
    for (const t of timers) clearTimeout(t);
    if (android) {
      call('pattern', { timings: waveform(pattern), usage: vibrationUsage() });
      return;
    }
    timers = pulses(pattern).map(({ at, duration }) => setTimeout(() => {
      if (platform === 'ios') call('impact', { style: impactStyleFor(duration) });
      else call('vibrate', { duration });
    }, at));
  }

  logHaptics({ via: 'init', options: { platform, native: android ? 'BreathVibration' : haptics ? 'Haptics' : null, usage: android ? vibrationUsage() : undefined, webVibrate: webSupported, armed }, ok: true });

  return {
    buzz(pattern) {
      if (!armed || !pattern) return;
      if (haptics) {
        playNative(pattern);
        return;
      }
      let ok = false;
      try { ok = navigator.vibrate(pattern); } catch { /* vibration is best-effort */ }
      logHaptics({ via: 'navigator.vibrate', options: pattern, ok });
    },
    destroy() {
      for (const t of timers) clearTimeout(t);
      stopListening();
    },
  };
}

