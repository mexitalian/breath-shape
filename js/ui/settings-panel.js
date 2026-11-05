import { el } from '../dom.js';
import { icon } from './icons.js';
import { readSettings, saveSettings, TUNING_RANGES } from '../settings.js';
import { canVibrate } from '../controls/vibration.js';
import { nativePlugin, platform, VIBRATION_USAGES, vibrationUsage, setVibrationUsage } from '../native.js';
import { readHistory, clearHistory } from '../history.js';
import { exportHistory } from '../export.js';
import { onBack } from '../app.js';

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

const ON_OFF = [[true, 'On'], [false, 'Off']];
const capitalise = (text) => text[0].toUpperCase() + text.slice(1);

// Sound: on/off plus a volume slider.
function soundRow(settings) {
  const row = choiceRow('Sound', ON_OFF, settings.sound, (sound) => {
    saveSettings({ sound });
    slider.disabled = !sound;
  });
  const slider = el('input', 'settings__range', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(settings.volume * 100)) });
  slider.setAttribute('aria-label', 'Volume');
  slider.disabled = !settings.sound;
  slider.addEventListener('input', () => saveSettings({ volume: Number(slider.value) / 100 }));
  row.append(slider);
  return row;
}

// A tuning slider (#102) for one numeric setting, with its value beside the label.
// Optional: a fallback shown while the setting is null, and a Reset back to it.
function tuningRow(label, key, settings, { step = 0.05, format = pct, fallback = null } = {}) {
  const row = el('div', 'settings__row');
  const id = `settings-label-${++panelId}`;
  const head = el('div', 'settings__label settings__label--value', { id });
  const name = el('span', '', { textContent: label });
  const value = el('span', 'settings__value');
  head.append(name, value);
  const [min, max] = TUNING_RANGES[key];
  const slider = el('input', 'settings__range', { type: 'range', min: String(min), max: String(max), step: String(step) });
  slider.setAttribute('aria-labelledby', id);
  let reset = null;
  const show = (v) => {
    slider.value = String(v ?? fallback);
    value.textContent = v == null ? `${format(fallback)} (technique)` : format(v);
    if (reset) reset.hidden = v == null;
  };
  if (fallback != null) {
    reset = el('button', 'chip chip--link settings__reset', { type: 'button', textContent: 'Reset' });
    reset.addEventListener('click', () => { saveSettings({ [key]: null }); show(null); });
  }
  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    saveSettings({ [key]: v });
    show(v);
  });
  row.append(head, slider);
  if (reset) row.append(reset);
  show(settings[key]);
  return row;
}
const pct = (v) => `${Math.round(v * 100)}%`;

// Fluid shapes (#94), with tuning sliders under the look that's picked (#102).
// cfg (in a session): the technique, for the Membrane's own sizes.
function fluidRows(settings, cfg) {
  const vessel = [
    tuningRow('Emptiest', 'vesselLow', settings),
    tuningRow('Fullest', 'vesselHigh', settings),
  ];
  const membrane = [
    tuningRow('Motion wobble', 'membraneWobble', settings, { step: 0.1 }),
    tuningRow('Smallest', 'membraneSmall', settings, { fallback: cfg?.minScale ?? 0.6 }),
    tuningRow('Largest', 'membraneLarge', settings, { fallback: cfg?.maxScale ?? 1 }),
  ];
  const tuning = el('div', 'settings__sub');
  tuning.append(...vessel, ...membrane);
  const showFor = (fluid) => {
    for (const row of vessel) row.hidden = fluid !== 'vessel';
    for (const row of membrane) row.hidden = fluid !== 'membrane';
    tuning.hidden = fluid === 'off';
  };
  const pick = choiceRow('Fluid', [['off', 'Off'], ['vessel', 'Vessel'], ['membrane', 'Membrane']], settings.fluid, (fluid) => {
    saveSettings({ fluid });
    showFor(fluid);
  });
  showFor(settings.fluid);
  return [pick, tuning];
}

// Android only: which kind of vibration sessions use. Some phones silence some
// kinds, so picking one plays a short test buzz.
function vibrationTypeRow() {
  const breath = platform === 'android' ? nativePlugin('BreathVibration') : null;
  if (!breath) return null;
  const options = VIBRATION_USAGES.filter(u => u !== 'unknown').map(u => [u, capitalise(u)]);
  return choiceRow('Vibration type', options, vibrationUsage(), (usage) => {
    setVibrationUsage(usage);
    Promise.resolve(breath.vibrate({ duration: 300, usage })).catch(() => {});
  });
}

// Your data: export the history as CSV, and clear it (a second tap confirms).
function dataRow() {
  const row = el('div', 'settings__row');
  const id = `settings-label-${++panelId}`;
  row.append(el('div', 'settings__label', { id, textContent: 'Your data' }));
  const buttons = el('div', 'settings__buttons');
  buttons.setAttribute('role', 'group');
  buttons.setAttribute('aria-labelledby', id);
  const exportBtn = el('button', 'button button--ghost', { type: 'button', textContent: 'Export history' });
  const clearBtn = el('button', 'button button--ghost', { type: 'button', textContent: 'Clear history' });
  const note = el('p', 'settings__note');
  note.setAttribute('aria-live', 'polite');
  const empty = () => {
    const none = !readHistory().length;
    exportBtn.disabled = clearBtn.disabled = none;
    if (none) note.textContent = 'No sessions saved yet.';
  };
  let confirmTimer = 0;
  const resetClear = () => {
    clearTimeout(confirmTimer);
    clearBtn.textContent = 'Clear history';
    delete clearBtn.dataset.confirm;
  };
  exportBtn.addEventListener('click', async () => {
    resetClear();
    exportBtn.disabled = true;
    try {
      note.textContent = await exportHistory();
    } catch (err) {
      note.textContent = `Export failed: ${err?.message ?? err}`;
    }
    exportBtn.disabled = false;
  });
  clearBtn.addEventListener('click', () => {
    if (!clearBtn.dataset.confirm) {
      clearBtn.dataset.confirm = 'true';
      clearBtn.textContent = 'Tap again to clear';
      note.textContent = 'This removes every saved session on this device.';
      confirmTimer = setTimeout(() => { resetClear(); note.textContent = ''; }, 5000);
      return;
    }
    resetClear();
    clearHistory();
    empty();
    note.textContent = 'History cleared.';
  });
  buttons.append(exportBtn, clearBtn);
  row.append(buttons, note);
  empty();
  return row;
}

// Pattern: the settings panel, opened from the gear. Uses the screen pattern so it
// sits over the stage like the start and summary screens.
// Every control applies its change the moment it's used (#131). Done, the close
// button (where the gear was, staying put while the panel scrolls), Escape, a tap
// outside and Android back all just close it.
// opener: the gear button, so the close button takes its place.
export function openSettings({ particleOptions = [['webgl', 'WebGL'], ['on', 'Standard'], ['off', 'Off']], cfg = null, opener = null } = {}) {
  const settings = readSettings();
  const titleId = `settings-title-${++panelId}`;
  const screen = el('div', 'screen settings');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', titleId);
  const panel = el('div', 'screen__panel');
  panel.append(el('h1', 'screen__title', { id: titleId, textContent: 'Settings' }));
  panel.append(choiceRow('Theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], settings.theme, theme => saveSettings({ theme })));
  // Fluid looks only apply when a shape is shown: in Fill the fill itself is the
  // liquid, so the Fluid rows hide while Fill is chosen (#138).
  const fluid = el('div', 'settings__group');
  fluid.append(...fluidRows(settings, cfg));
  const showFluid = (layout) => { fluid.hidden = layout === 'fill'; };
  panel.append(choiceRow('Session layout', [['shrink', 'Shrink'], ['fill', 'Fill']], settings.sessionLayout, (sessionLayout) => {
    saveSettings({ sessionLayout });
    showFluid(sessionLayout);
  }));
  panel.append(choiceRow('Particles', particleOptions, settings.particles, particles => saveSettings({ particles })));
  // Fluid shapes (#94), moved by tilt (on a computer, the mouse; #138).
  panel.append(fluid);
  showFluid(settings.sessionLayout);
  if (window.AudioContext || window.webkitAudioContext) panel.append(soundRow(settings));
  panel.append(choiceRow('Keep screen on', ON_OFF, settings.keepAwake, keepAwake => saveSettings({ keepAwake })));
  if (canVibrate()) {
    panel.append(choiceRow('Vibration', ON_OFF, settings.vibration, vibration => saveSettings({ vibration })));
    const type = vibrationTypeRow();
    if (type) panel.append(type);
    // Continuous needs the app's own session player (Android).
    if (platform === 'android' && nativePlugin('BreathSession')) {
      panel.append(choiceRow('Vibration style', [['taps', 'Taps'], ['continuous', 'Continuous']], settings.vibrationStyle, vibrationStyle => saveSettings({ vibrationStyle })));
    }
  }
  panel.append(dataRow());
  const done = el('button', 'button button--primary', { type: 'button', textContent: 'Done' });
  const actions = el('div', 'screen__actions');
  actions.append(done);
  panel.append(actions);
  const closeButton = el('button', 'icon-button settings__close', { type: 'button' });
  closeButton.setAttribute('aria-label', 'Close settings');
  closeButton.title = 'Close';
  closeButton.append(icon('close'));
  const spot = opener?.getBoundingClientRect();
  if (spot?.width) {
    closeButton.style.top = `${spot.top}px`;
    closeButton.style.left = `${spot.left}px`;
  }
  screen.append(panel);
  const previous = document.activeElement;
  // On body, not in the screen: the screen's backdrop blur would make a fixed child
  // scroll with the panel.
  document.body.append(screen, closeButton);
  // Focus Done for the keyboard, but open at the top: on a phone the panel is taller
  // than the screen, and a plain focus() scrolls it to the bottom (#110).
  done.focus({ preventScroll: true });

  let removeBack = null;
  function close() {
    if (!screen.isConnected) return;
    screen.remove();
    closeButton.remove();
    document.removeEventListener('keydown', onKey);
    removeBack?.();
    previous?.focus?.();
  }
  removeBack = onBack(close);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  done.addEventListener('click', close);
  closeButton.addEventListener('click', close);
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
  button.addEventListener('click', () => openSettings({ ...options, opener: button }));
  return button;
}
