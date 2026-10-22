export default {
  title: 'Pursed-Lip Breathing',
  rate: 'in 2 · out 4',
  hint: 'Breathe in gently through your nose. Breathe out slowly through pursed lips, as if cooling soup or blowing out a candle.',

  hue: 300,
  shape: 'circle',
  opacity: { min: 0.35, max: 0.9 },

  particles: { count: 26, radii: { core: 0.18, inner: 0.25, outer: 0.95 } },

  phases: [
    { name: 'Nose in', dur: 2, scale: 1.00,
      vibrate: [90], particles: { from: 'outer', to: 'inner' } },
    // Exhale streams upward in a narrow cone, like breath through pursed lips.
    { name: 'Lips out', dur: 4, scale: 0.55, easing: 'ease-out',
      vibrate: [50, 40, 40, 40, 30, 40],
      particles: { from: 'core', to: 'outer', cone: { angle: -90, spread: 40 } } },
  ],
};
