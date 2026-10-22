import { el } from '../dom.js';

const STATUS_FADE_MS = 2500;

// Browsers only allow vibration after a user gesture, so the user arms it with a button.
export function initVibration(container) {
  const supported = 'vibrate' in navigator;
  let armed = false;

  const status = el('div', 'status');
  status.setAttribute('aria-live', 'polite');

  const button = el('button', 'button button--primary', {
    type: 'button',
    textContent: supported ? 'Enable vibration' : 'Vibration unsupported',
    disabled: !supported,
  });

  button.addEventListener('click', () => {
    armed = !!navigator.vibrate(200);
    status.textContent = armed
      ? "Vibration on — you'll feel the next phase change."
      : 'Tap registered, but the browser blocked vibration.';
    setTimeout(() => { status.dataset.faded = ''; }, STATUS_FADE_MS);
    button.textContent = armed ? 'Vibration on' : 'Vibration blocked';
    button.disabled = true;
  });

  container.append(status, button);

  return {
    buzz(pattern) {
      if (!armed || !pattern) return;
      try { navigator.vibrate(pattern); } catch { /* vibration is best-effort */ }
    },
    destroy() {
      status.remove();
      button.remove();
    },
  };
}
