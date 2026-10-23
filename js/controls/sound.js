import { createIconToggle } from '../ui/icon-toggle.js';
import { readSettings, saveSettings, onSettingsChange } from '../settings.js';

// Hum tone for phases marked hum: true. On/off and volume live in Settings; the
// top-bar toggle is a quick mute that flips the same setting. Browsers only allow
// audio after a tap, so the sound starts on the first tap on the page.
// silent: the Android app plays the hum itself (js/controls/session-cues.js); the
// toggle still flips the setting.
const FADE_S = 0.35;
const MAX_LEVEL = 0.13;

export function initSound(container, notify, { tone = 130, silent = false } = {}) {
  const AudioCtx = silent ? null : window.AudioContext || window.webkitAudioContext;
  const supported = silent || !!AudioCtx;
  let ctx = null;
  let gain = null;
  let { sound: on, volume } = readSettings();
  let humming = false;

  function build() {
    ctx = new AudioCtx();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    // A soft fundamental plus a quiet octave reads as a hum rather than a beep.
    for (const [mult, level] of [[1, 1], [2, 0.25], [3, 0.08]]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = tone * mult;
      g.gain.value = level;
      osc.connect(g).connect(gain);
      osc.start();
    }
  }

  // Only called once a tap has happened (or the context already exists).
  function wakeAudio() {
    if (!AudioCtx) return;
    if (!ctx) build();
    if (ctx.state !== 'running') ctx.resume();
  }

  function setTarget() {
    if (!gain) return;
    gain.gain.setTargetAtTime(on && humming ? MAX_LEVEL * volume : 0, ctx.currentTime, FADE_S / 3);
  }

  const onTap = () => {
    if (!on) return;
    wakeAudio();
    setTarget();
  };
  document.addEventListener('pointerdown', onTap);

  const toggle = createIconToggle({
    name: 'sound',
    label: supported ? 'Hum sound' : 'Sound not supported in this browser',
    disabled: !supported,
    onClick: () => {
      wakeAudio();
      saveSettings({ sound: !on });
      notify(on ? 'Hum sound on' : 'Hum sound off');
    },
  });

  toggle.set(on && supported);
  container.append(toggle.button);

  const stopListening = onSettingsChange((settings) => {
    on = settings.sound;
    volume = settings.volume;
    toggle.set(on && supported);
    setTarget();
  });

  return {
    update(snap) {
      const next = !!snap.phase.hum && !snap.finished;
      if (next === humming) return;
      humming = next;
      setTarget();
    },
    destroy() {
      stopListening();
      document.removeEventListener('pointerdown', onTap);
      toggle.button.remove();
      ctx?.close();
    },
  };
}
