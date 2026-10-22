export default {
  title: 'Resonance Breathing',
  hint: 'Equal time in and out, no holds. Adjust the pace until it feels easy; most people settle between 4.5 and 6.5 breaths a minute.',

  // 6s in + 6s out = 5 breaths/min at the default pace.
  pace: { min: 4.5, max: 6.5, step: 0.5, default: 5 },

  hue: 262,
  shape: 'circle',
  opacity: { min: 0.35, max: 0.9 },

  particles: { count: 26, radii: { inner: 0.20, outer: 0.92 } },

  phases: [
    { name: 'Inhale', dur: 6, scale: 1.00, ripple: true,
      vibrate: [120], particles: { from: 'outer', to: 'inner' } },
    { name: 'Exhale', dur: 6, scale: 0.55,
      vibrate: [50, 40, 40, 40, 30, 40], particles: { from: 'inner', to: 'outer' } },
  ],
};
