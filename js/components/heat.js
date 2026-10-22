// On phases marked heat: true, warmth builds over BUILD_MS and fades quickly when
// the phase ends. Writes --heat (0–1) onto the field; the core fill warms with it.
const BUILD_MS = 20000;
const FADE_PER_FRAME = 0.06;

export function heat({ field }) {
  let level = 0;

  function update(snap) {
    const target = snap.phase.heat && !snap.finished
      ? Math.min(1, 0.15 + snap.elapsed / BUILD_MS)
      : 0;
    level = target >= level ? target : Math.max(target, level - FADE_PER_FRAME);
    field.style.setProperty('--heat', level.toFixed(4));
  }

  return { update };
}
