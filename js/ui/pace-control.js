import { el } from '../dom.js';
import { clampPace, formatBpm } from '../pace.js';

// − / value / + stepper for breaths per minute.
export function createPaceControl(container, pace, initial, onChange) {
  let bpm = initial;
  const root = el('div', 'pace');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Breathing pace');

  const slower = el('button', 'button button--ghost pace__step', { type: 'button', textContent: '−' });
  slower.setAttribute('aria-label', 'Slower');
  const faster = el('button', 'button button--ghost pace__step', { type: 'button', textContent: '+' });
  faster.setAttribute('aria-label', 'Faster');
  const value = el('div', 'pace__value');
  value.setAttribute('aria-live', 'polite');

  let locked = false;
  function render(shown = bpm) {
    value.textContent = `${formatBpm(shown)} breaths/min`;
    slower.disabled = locked || bpm <= pace.min;
    faster.disabled = locked || bpm >= pace.max;
  }

  function set(next) {
    const clamped = clampPace(pace, next);
    if (clamped === bpm) return;
    bpm = clamped;
    render();
    onChange(bpm);
  }

  slower.addEventListener('click', () => set(bpm - pace.step));
  faster.addEventListener('click', () => set(bpm + pace.step));

  root.append(slower, value, faster);
  container.append(root);
  render();

  return {
    // Shows a pace the user can't change (e.g. while a session winds down).
    lock(shownBpm) {
      locked = true;
      render(Math.round(shownBpm));
    },
    unlock() {
      locked = false;
      render();
    },
    destroy: () => root.remove(),
  };
}
