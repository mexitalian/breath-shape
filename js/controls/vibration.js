import { createIconToggle } from '../ui/icon-toggle.js';
import { nativePlugin, platform, pulses, impactStyleFor } from '../native.js';

// In the app, patterns play through native haptics (iPhones have no web vibration)
// and start switched on. On the website, the Vibration API is used and the user
// turns it on with a tap, because browsers require a gesture first.
export function initVibration(container, notify) {
  const haptics = nativePlugin('Haptics');
  const webSupported = 'vibrate' in navigator;
  const supported = !!haptics || webSupported;
  let armed = !!haptics;
  let timers = [];

  function playNative(pattern) {
    for (const t of timers) clearTimeout(t);
    timers = pulses(pattern).map(({ at, duration }) => setTimeout(() => {
      if (platform === 'ios') haptics.impact({ style: impactStyleFor(duration) });
      else haptics.vibrate({ duration });
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

  container.append(toggle.button);

  return {
    buzz(pattern) {
      if (!armed || !pattern) return;
      if (haptics) {
        playNative(pattern);
        return;
      }
      try { navigator.vibrate(pattern); } catch { /* vibration is best-effort */ }
    },
    destroy() {
      for (const t of timers) clearTimeout(t);
      toggle.button.remove();
    },
  };
}

