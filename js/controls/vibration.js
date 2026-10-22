import { createIconToggle } from '../ui/icon-toggle.js';

// Browsers only allow vibration after a user gesture, so the user turns it on with a tap.
export function initVibration(container, notify) {
  const supported = 'vibrate' in navigator;
  let armed = false;

  const toggle = createIconToggle({
    name: 'vibrate',
    label: supported ? 'Vibration' : 'Vibration not supported on this device',
    disabled: !supported,
    onClick: () => {
      if (armed) {
        armed = false;
        notify('Vibration off');
      } else {
        armed = !!navigator.vibrate(200);
        notify(armed ? 'Vibration on: you’ll feel each phase change' : 'This browser blocked vibration');
      }
      toggle.set(armed);
    },
  });

  container.append(toggle.button);

  return {
    buzz(pattern) {
      if (!armed || !pattern) return;
      try { navigator.vibrate(pattern); } catch { /* vibration is best-effort */ }
    },
    destroy() {
      toggle.button.remove();
    },
  };
}
