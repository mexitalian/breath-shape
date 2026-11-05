import { LiquidSim } from './liquid-sim.js';
import { createMotion } from '../controls/motion.js';
import { readSettings, onSettingsChange } from '../settings.js';

// Fluid shapes → Vessel (#94): the shape is a glass seen from the side and the
// liquid level is the breath. Breathing in fills it, holds keep it level,
// breathing out drains it. Tilt (the phone's motion sensor; on a computer, the
// mouse) slopes and sloshes the surface, and shakes slosh it. Touch doesn't move it
// (retired in #138): dragging scrolls and taps continue holds.

const MAX_SLOPE = 1;

// Pure: where the surface sits, as a fraction from the top, for a breath scale.
// low / high: the fill at the emptiest and fullest points of the breath
// (Settings → Fluid → Vessel; empty to full by default).
export function levelFor(scale, minScale, maxScale, low = 0, high = 1) {
  const span = maxScale - minScale;
  const fill = span > 0 ? (scale - minScale) / span : 1;
  return 1 - (low + (high - low) * Math.min(1, Math.max(0, fill)));
}

// Pure: the liquid's outline as a CSS clip-path, in % of the shape's box.
export function surfaceClip(sim, levelPx, size) {
  const pct = (v) => `${((v / size) * 100).toFixed(2)}%`;
  let points = '';
  for (let i = 0; i < sim.count; i++) points += `${pct(sim.x(i))} ${pct(levelPx + sim.h[i])},`;
  return `polygon(${points}100% 100%,0% 100%)`;
}

// Pure: the rest line's slope (dy/dx, y down) for a down direction on the screen.
// The surface lies across gravity: when down points down-right, the surface rises
// to the right and the liquid gathers on that side.
// Lying flat the reading is weak, so the slope eases off rather than jumping about.
export function slopeFor({ x, y }) {
  const slope = -x / Math.max(y, 0.35);
  return Math.min(MAX_SLOPE, Math.max(-MAX_SLOPE, slope)) + 0; // + 0: never -0
}

export function createVessel({ core, liquid, cfg }) {
  let sim = null;
  let size = 0;
  let last = 0;
  let shownClip = '';

  const settings = readSettings();
  let range = [settings.vesselLow, settings.vesselHigh];
  const stopListening = onSettingsChange((next) => { range = [next.vesselLow, next.vesselHigh]; });
  const motion = createMotion({
    onShake: ({ strength, x }) => sim?.shove(Math.sign(x) || 1, strength * size * 2.5),
  });

  function ensure() {
    const w = core.offsetWidth;
    if (sim && w === size) return;
    size = w;
    sim = new LiquidSim(w, { waveSpeed: w * 1.1, friction: 1.3, settlePull: 6, maxRise: w * 0.22, maxDepth: w * 0.22 });
  }

  return {
    update(snap, now = performance.now()) {
      ensure();
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      if (motion.available) sim.setSlope(slopeFor(motion.gravity));
      sim.step(dt);
      const levelPx = levelFor(snap.scale, cfg.minScale, cfg.maxScale, ...range) * size;
      const clip = surfaceClip(sim, levelPx, size);
      if (clip !== shownClip) {
        liquid.style.clipPath = clip;
        shownClip = clip;
      }
    },
    destroy() {
      stopListening();
      motion.destroy();
      liquid.style.clipPath = '';
    },
  };
}
