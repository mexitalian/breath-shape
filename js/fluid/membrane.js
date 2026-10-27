import { LiquidSim } from './liquid-sim.js';
import { createMotion } from '../controls/motion.js';
import { readSettings, onSettingsChange } from '../settings.js';
import { outlineFor, outlineRadius } from '../particle-outline.js';

// Fluid shapes → Membrane (#94): the shape's edge is a liquid skin. The breath grows
// and shrinks the shape as usual; the skin wobbles on top. The simulation is the
// same as the Vessel's, joined into a loop round the outline (waves run all the way
// round). Tilt makes the shape sag towards the real floor; twisting the phone sends
// a bulge circling the edge; shakes jolt it; touch anywhere: tap = poke the edge in,
// drag = pull the edge towards your finger (out when you're outside the shape, in
// when inside), press and hold = push it in.
// Settings → Fluid → Membrane can turn the motion up or down, and set how small and
// how large the shape gets in place of the technique's own sizes (#102).

const SHRINK = 0.9;      // the shape at full breath, as a share of its box: room to bulge out
const SAG = 0.06;        // how far gravity pulls the bottom out (fraction of the radius)
const SPIN_GAIN = 0.002; // how hard a twist (deg/s) pushes the circling bulge
const DRAG_PX = 6;
const HOLD_MS = 280;

// Pure: the edge's sample directions (radians from the outline's centre, starting
// straight up and going clockwise) and the outline's distance in each.
export function ringGeometry(shape, count) {
  const outline = outlineFor(shape);
  const angles = Array.from({ length: count }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / count);
  return { outline, angles, radii: angles.map(a => outlineRadius(outline, a)) };
}

// Pure: the edge as a CSS clip-path in % of the shape's box. heights: px inward
// (negative = bulging out); radiusPx: the shape's half-width at full size.
export function membraneClip(geometry, heights, radiusPx) {
  const [cx, cy] = geometry.outline?.centre ?? [0, 0];
  const pct = (v) => `${(50 + v * 50 * SHRINK).toFixed(2)}%`;
  let points = '';
  geometry.angles.forEach((a, i) => {
    const r = geometry.radii[i] - heights[i] / radiusPx;
    points += `${pct(cx + Math.cos(a) * r)} ${pct(cy + Math.sin(a) * r)},`;
  });
  return `polygon(${points.slice(0, -1)})`;
}

// Pure: the rest shape for a down direction: the side facing the floor bulges out,
// the top flattens a little.
export function sagFor(geometry, gravity, radiusPx) {
  return geometry.angles.map(a => -SAG * radiusPx * (Math.cos(a) * gravity.x + Math.sin(a) * gravity.y));
}

// Pure: the shape's scale for a breath scale, with the size range from Settings
// (null = the technique's own end).
export function sizeFor(scale, cfg, small, large) {
  const span = cfg.maxScale - cfg.minScale;
  const t = span > 0 ? Math.min(1, Math.max(0, (scale - cfg.minScale) / span)) : 1;
  const from = small ?? cfg.minScale;
  const to = large ?? cfg.maxScale;
  return from + (to - from) * t;
}

export function createMembrane({ core, cfg }) {
  let sim = null;
  let geometry = null;
  let radius = 0;
  let last = 0;
  let spinPhase = 0;
  let shownClip = '';
  let press = null;
  let shownSize = '';

  let tuning = readSettings();
  const stopListening = onSettingsChange((next) => { tuning = next; });
  const useTilt = tuning.fluidInput === 'tilt';
  const motion = useTilt ? createMotion({
    onShake: ({ strength, x, y }) => {
      if (!sim) return;
      // Jolt the whole edge: the side the phone moved towards dents in, the far side bulges.
      const kick = strength * radius * 3 * tuning.membraneWobble;
      geometry.angles.forEach((a, i) => { sim.v[i] += kick * (Math.cos(a) * x + Math.sin(a) * y); });
    },
  }) : null;

  function ensure() {
    const size = core.offsetWidth;
    if (sim && size / 2 === radius) return;
    radius = size / 2;
    const loop = Math.PI * size * SHRINK;
    sim = new LiquidSim(loop, {
      waveSpeed: size * 1.6, friction: 1.6, settlePull: 10,
      maxRise: radius * (1 - SHRINK) * 0.9, maxDepth: radius * 0.2,
    }, { ring: true });
    geometry = ringGeometry(cfg.shape, sim.count);
  }

  // Where along the loop a screen angle is.
  const arcAt = (angle) => ((((angle + Math.PI / 2) / (2 * Math.PI)) % 1 + 1) % 1) * sim.width;

  // A touch, relative to the shape: its angle from the centre, and how far it is
  // inside (+) or outside (−) the edge, px at the shape's current size.
  function locate(e) {
    const rect = core.getBoundingClientRect();
    const half = (rect.width / 2) * SHRINK;
    const [cx, cy] = geometry.outline?.centre ?? [0, 0];
    const dx = e.clientX - (rect.left + rect.width / 2 + cx * half);
    const dy = e.clientY - (rect.top + rect.height / 2 + cy * half);
    const angle = Math.atan2(dy, dx);
    const edge = outlineRadius(geometry.outline, angle) * half;
    return { angle, inside: edge - Math.hypot(dx, dy) };
  }

  const ignored = (e) => e.target.closest?.('button, a, input, .screen, .cycles');
  function down(e) {
    if (ignored(e) || !sim) return;
    const at = locate(e);
    press = { x0: e.clientX, y0: e.clientY, angle: at.angle, dragging: false, held: false };
    press.timer = setTimeout(() => {
      if (!press || press.dragging) return;
      press.held = true;
      sim.hold(arcAt(press.angle), radius * 0.5, radius * 0.12);
    }, HOLD_MS);
  }
  function move(e) {
    if (!press) return;
    if (!press.dragging && Math.hypot(e.clientX - press.x0, e.clientY - press.y0) > DRAG_PX) press.dragging = true;
    if (!press.dragging) return;
    const at = locate(e);
    press.angle = at.angle;
    sim.hold(arcAt(at.angle), radius * 0.6, at.inside * 0.7);
  }
  function up() {
    if (!press) return;
    clearTimeout(press.timer);
    if (!press.dragging && !press.held) sim.impulse(arcAt(press.angle), radius * 0.35, radius * 3);
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
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const wobble = tuning.membraneWobble;
      if (motion?.available) {
        sim.setRest(sagFor(geometry, motion.gravity, radius * wobble));
        // A twist: a push that travels round the edge at the turning speed.
        const spin = motion.spin;
        if (Math.abs(spin) > 5) {
          spinPhase += (spin * Math.PI / 180) * dt;
          sim.impulse(arcAt(spinPhase), radius * 0.6, Math.min(Math.abs(spin), 360) * SPIN_GAIN * radius * wobble);
        }
      }
      // A size range from Settings replaces the technique's own.
      const custom = tuning.membraneSmall != null || tuning.membraneLarge != null;
      const size = custom ? `calc(${sizeFor(snap.scale, cfg, tuning.membraneSmall, tuning.membraneLarge).toFixed(4)} * (1 + var(--hum-jitter, 0)))` : '';
      if (size !== shownSize) {
        if (size) core.style.setProperty('--core-transform', size);
        else core.style.removeProperty('--core-transform');
        shownSize = size;
      }
      sim.step(dt);
      const clip = membraneClip(geometry, sim.h, radius);
      if (clip !== shownClip) {
        core.style.clipPath = clip;
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
      core.style.clipPath = '';
      core.style.removeProperty('--core-transform');
    },
  };
}
