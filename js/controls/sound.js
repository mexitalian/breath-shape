import { createIconToggle } from '../ui/icon-toggle.js';

// Opt-in hum tone for phases marked hum: true. Off until the user turns it on
// (browsers only allow audio after a tap anyway).
const FADE_S = 0.35;
const LEVEL = 0.08;

export function initSound(container, notify, { tone = 130 } = {}) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let gain = null;
  let on = false;
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

  function setTarget() {
    if (!gain) return;
    gain.gain.setTargetAtTime(on && humming ? LEVEL : 0, ctx.currentTime, FADE_S / 3);
  }

  const toggle = createIconToggle({
    name: 'sound',
    label: AudioCtx ? 'Hum sound' : 'Sound not supported in this browser',
    disabled: !AudioCtx,
    onClick: () => {
      if (!ctx) build();
      on = !on;
      if (on) ctx.resume();
      toggle.set(on);
      notify(on ? 'Hum sound on' : 'Hum sound off');
      setTarget();
    },
  });

  container.append(toggle.button);

  return {
    update(snap) {
      const next = !!snap.phase.hum && !snap.finished;
      if (next === humming) return;
      humming = next;
      setTarget();
    },
    destroy() {
      toggle.button.remove();
      ctx?.close();
    },
  };
}
