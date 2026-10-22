export default {
  title: 'Extended Exhale',
  hint: 'Breathe out for twice as long as you breathe in. The long, slow exhale tells your body it is safe to slow down.',

  hue: 228,
  shape: 'circle',
  opacity: { min: 0.35, max: 0.9 },

  // 4s in + 8s out = 5 breaths/min. Pace keeps the 1:2 ratio (3:6 up to 5:10).
  pace: { min: 4, max: 6.5, step: 0.5, default: 5 },

  particles: { count: 26, radii: { inner: 0.20, outer: 0.92 } },

  phases: [
    { name: 'Inhale', dur: 4, scale: 1.00,
      vibrate: [120], particles: { from: 'outer', to: 'inner' } },
    { name: 'Exhale', dur: 8, scale: 0.55, easing: 'ease-out',
      vibrate: [50, 40, 40, 40, 30, 40], particles: { from: 'inner', to: 'outer' } },
  ],
};
