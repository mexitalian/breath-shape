import { el } from '../dom.js';

// On phases marked hum: true, rings pulse outward from the core like sound waves
// and the core trembles slightly. Writes --hum-jitter onto the field for the core.
const RINGS = 3;
const WAVE_MS = 1400;
const JITTER = 0.012;
const JITTER_HZ = 9;

export function hum({ field }) {
  const rings = Array.from({ length: RINGS }, () => {
    const node = el('div', 'hum-ring');
    field.append(node);
    return node;
  });

  function update(snap) {
    const active = snap.phase.hum && !snap.finished;
    if (!active) {
      field.style.setProperty('--hum-jitter', '0');
      for (const node of rings) node.style.setProperty('--hum-opacity', '0');
      return;
    }
    // Fade the whole effect in and out at the phase edges.
    const edge = snap.progress == null ? 1 : Math.min(1, snap.progress * 6, (1 - snap.progress) * 6);
    const t = snap.elapsed;
    field.style.setProperty('--hum-jitter', (Math.sin((t / 1000) * JITTER_HZ * 2 * Math.PI) * JITTER * edge).toFixed(4));
    rings.forEach((node, i) => {
      const k = ((t / WAVE_MS) + i / RINGS) % 1;
      node.style.setProperty('--hum-scale', (1 + k * 1.6).toFixed(4));
      node.style.setProperty('--hum-opacity', ((1 - k) * edge).toFixed(4));
    });
  }

  return { update };
}
