import { LiquidSim } from './liquid-sim.js';
import { createMotion } from '../controls/motion.js';
import { readSettings, onSettingsChange } from '../settings.js';

// Fluid shapes → Vessel (#94): the shape is a glass seen from the side and the
// liquid level is the breath. Breathing in fills it, holds keep it level,
// breathing out drains it. Tilt (where the phone's motion sensor reports and
// Settings → Fluid input is Tilt + touch) slopes and sloshes the surface; shakes
// slosh it; touch anywhere on the screen moves it: tap = splash, drag = push,
// press and hold = press down.

const DRAG_PX = 6;
const HOLD_MS = 280;
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
  let press = null;

  const settings = readSettings();
  const useTilt = settings.fluidInput === 'tilt';
  let range = [settings.vesselLow, settings.vesselHigh];
  const stopListening = onSettingsChange((next) => { range = [next.vesselLow, next.vesselHigh]; });
  const motion = useTilt ? createMotion({
    onShake: ({ strength, x }) => sim?.shove(Math.sign(x) || 1, strength * size * 2.5),
  }) : null;

  function ensure() {
    const w = core.offsetWidth;
    if (sim && w === size) return;
    size = w;
    sim = new LiquidSim(w, { waveSpeed: w * 1.1, friction: 1.3, settlePull: 6, maxRise: w * 0.22, maxDepth: w * 0.22 });
  }

  // Touch anywhere on the screen, mapped across the glass.
  const ignored = (e) => e.target.closest?.('button, a, input, .screen, .cycles');
  const xOf = (e) => {
    const rect = core.getBoundingClientRect();
    return (Math.min(rect.right, Math.max(rect.left, e.clientX)) - rect.left) * (size / (rect.width || 1));
  };
  function down(e) {
    if (ignored(e) || !sim) return;
    press = { x0: e.clientX, y0: e.clientY, x: xOf(e), dragging: false, held: false };
    press.timer = setTimeout(() => {
      if (!press || press.dragging) return;
      press.held = true;
      sim.hold(press.x, size * 0.3, size * 0.14);
    }, HOLD_MS);
  }
  function move(e) {
    if (!press) return;
    const dy = e.clientY - press.y0;
    if (!press.dragging && Math.hypot(e.clientX - press.x0, dy) > DRAG_PX) press.dragging = true;
    if (!press.dragging) return;
    press.x = xOf(e);
    sim.hold(press.x, size * 0.32, dy * 0.6);
  }
  function up() {
    if (!press) return;
    clearTimeout(press.timer);
    if (!press.dragging && !press.held) sim.impulse(press.x, size * 0.16, size * 2.4);
    sim.release();
    press = null;
  }
  document.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);

  return {
    update(snap, now = performance.now()) {
      ensure();
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      if (motion?.available) sim.setSlope(slopeFor(motion.gravity));
      sim.step(dt);
      const levelPx = levelFor(snap.scale, cfg.minScale, cfg.maxScale, ...range) * size;
      const clip = surfaceClip(sim, levelPx, size);
      if (clip !== shownClip) {
        liquid.style.clipPath = clip;
        shownClip = clip;
      }
    },
    destroy() {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (press) clearTimeout(press.timer);
      stopListening();
      motion?.destroy();
      liquid.style.clipPath = '';
    },
  };
}
