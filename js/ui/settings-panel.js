import { el } from '../dom.js';
import { icon } from './icons.js';
import { readSettings, saveSettings } from '../settings.js';

let panelId = 0;

// One setting: a label over a row of chip buttons, one pressed.
function choiceRow(label, options, current, onPick) {
  const row = el('div', 'settings__row');
  const id = `settings-label-${++panelId}`;
  row.append(el('div', 'settings__label', { id, textContent: label }));
  const group = el('div', 'group-nav');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', id);
  const buttons = options.map(([value, text]) => {
    const button = el('button', 'chip chip--link', { type: 'button', textContent: text });
    button.setAttribute('aria-pressed', String(value === current));
    button.addEventListener('click', () => {
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
      onPick(value);
    });
    return button;
  });
  group.append(...buttons);
  row.append(group);
  return row;
}

// Pattern: the settings panel, opened from the gear. Uses the screen pattern so it
// sits over the stage like the start and summary screens. Changes apply at once.
export function openSettings({ canVibrate, particleOptions = [['on', 'On'], ['off', 'Off'], ['webgl', 'WebGL (test)']] }) {
  const settings = readSettings();
  const titleId = `settings-title-${++panelId}`;
  const screen = el('div', 'screen settings');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', titleId);
  const panel = el('div', 'screen__panel');
  panel.append(el('h1', 'screen__title', { id: titleId, textContent: 'Settings' }));
  panel.append(choiceRow('Theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], settings.theme, theme => saveSettings({ theme })));
  panel.append(choiceRow('Particles', particleOptions, settings.particles, particles => saveSettings({ particles })));
  if (canVibrate) {
    panel.append(choiceRow('Vibration', [[true, 'On'], [false, 'Off']], settings.vibration, vibration => saveSettings({ vibration })));
  }
  const done = el('button', 'button button--primary', { type: 'button', textContent: 'Done' });
  const actions = el('div', 'screen__actions');
  actions.append(done);
  panel.append(actions);
  screen.append(panel);
  const previous = document.activeElement;
  document.body.append(screen);
  done.focus();

  function close() {
    screen.remove();
    document.removeEventListener('keydown', onKey);
    previous?.focus?.();
  }
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  done.addEventListener('click', close);
  screen.addEventListener('click', (e) => { if (e.target === screen) close(); });
  document.addEventListener('keydown', onKey);
  return { close };
}

// The gear button that opens it.
export function createSettingsButton(options) {
  const button = el('button', 'icon-button', { type: 'button' });
  button.setAttribute('aria-label', 'Settings');
  button.title = 'Settings';
  button.append(icon('settings'));
  button.addEventListener('click', () => openSettings(options));
  return button;
}
