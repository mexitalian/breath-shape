import { createIconToggle } from '../ui/icon-toggle.js';
import { nativePlugin, platform, pulses, impactStyleFor, waveform, vibrationUsage } from '../native.js';
import { logHaptics } from '../haptics-log.js';

// In the app, patterns play natively and start switched on: on Android through the
// app's own BreathVibration plugin, tagged with a usage the phone doesn't silence
// (see Diagnostics); on iPhone as Haptics taps, since iOS has no web vibration. On the website, the Vibration API is used and the user
// turns it on with a tap, because browsers require a gesture first.
export function initVibration(container, notify) {
  const android = platform === 'android' ? nativePlugin('BreathVibration') : null;
  const haptics = android ?? nativePlugin('Haptics');
  const webSupported = 'vibrate' in navigator;
  const supported = !!haptics || webSupported;
  let armed = !!haptics;
  let timers = [];

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

  const toggle = createIconToggle({
    name: 'vibrate',
    label: supported ? 'Vibration' : 'Vibration not supported on this device',
    disabled: !supported,
    onClick: () => {
      if (armed) {
        armed = false;
        notify('Vibration off');
      } else if (haptics) {
        armed = true;
        playNative([120]);
        notify('Vibration on: you’ll feel each phase change');
      } else {
        armed = !!navigator.vibrate(200);
        notify(armed ? 'Vibration on: you’ll feel each phase change' : 'This browser blocked vibration');
      }
      toggle.set(armed);
    },
  });
  toggle.set(armed);
  logHaptics({ via: 'init', options: { platform, native: android ? 'BreathVibration' : haptics ? 'Haptics' : null, usage: android ? vibrationUsage() : undefined, webVibrate: webSupported, armed }, ok: true });

  container.append(toggle.button);

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
      toggle.button.remove();
    },
  };
}

