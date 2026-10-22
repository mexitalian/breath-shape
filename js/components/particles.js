import { el } from '../dom.js';
import { noise1D } from '../noise.js';

// Particles drift between named radii (fractions of the field radius) once per phase.
// Each phase sets { from, to }; a phase without `particles` hides them.
// Optional cone: { angle, spread } in degrees (0 = right, -90 = up) keeps them in
// one direction instead of all around, e.g. a stream of breath leaving the lips.
// Open-ended holds loop the drift every HOLD_LOOP_MS.
const HOLD_LOOP_MS = 4000;

export function particles({ field, cfg }) {
  const { count, radii } = cfg.particles;
  const layer = el('div', 'particle-layer');
  field.append(layer);

  const items = Array.from({ length: count }, (_, i) => {
    const node = el('div', 'particle');
    layer.append(node);
    return {
      node,
      seed: i * 3.17 + Math.random() * 2,
      radiusSeed: i * 5.29 + Math.random() * 2,
      sizeJitter: 0.7 + Math.random() * 0.8,
      opacityJitter: 0.6 + Math.random() * 0.4,
      // <1 rushes early, >1 lags then catches up; all still start and finish together
      speedExp: 0.55 + Math.random() * 1.3,
    };
  });

  function update(snap) {
    const motion = snap.phase.particles;
    if (!motion || snap.finished) {
      for (const p of items) p.node.style.opacity = 0;
      return;
    }

    let frac = snap.progress;
    let phaseSeed = snap.serial;
    if (snap.openEnded) {
      const loop = Math.floor(snap.elapsed / HOLD_LOOP_MS);
      frac = (snap.elapsed % HOLD_LOOP_MS) / HOLD_LOOP_MS;
      phaseSeed += loop * 0.5;
    }

    const R = field.clientWidth / 2;
    const fromR = R * (radii[motion.from] ?? 0);
    const toR = R * (radii[motion.to] ?? 0);
    // Full fade at each phase boundary hides the re-seeded placement.
    const envelope = Math.sin(frac * Math.PI);

    for (const p of items) {
      const n = noise1D(p.seed + phaseSeed * 9.13);
      const angle = motion.cone
        ? ((motion.cone.angle + (n - 0.5) * motion.cone.spread) * Math.PI) / 180
        : n * Math.PI * 2;
      const spread = 0.65 + noise1D(p.radiusSeed + phaseSeed * 13.7) * 0.55;
      const r = (fromR + (toR - fromR) * frac ** p.speedExp) * spread;
      p.node.style.transform = `translate(${Math.cos(angle) * r}px,${Math.sin(angle) * r}px) scale(${p.sizeJitter})`;
      p.node.style.opacity = envelope * p.opacityJitter;
    }
  }

  return { update };
}
