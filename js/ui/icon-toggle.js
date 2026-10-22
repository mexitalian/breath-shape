import { el } from '../dom.js';
import { icon } from './icons.js';

// Compact on/off button with an icon; state is exposed through aria-pressed.
export function createIconToggle({ name, label, disabled = false, onClick }) {
  const button = el('button', 'icon-button', { type: 'button', disabled });
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', 'false');
  button.title = label;
  button.append(icon(name));
  button.addEventListener('click', onClick);
  return {
    button,
    set(on) { button.setAttribute('aria-pressed', String(on)); },
  };
}
