export default {
  title: 'Resonance Breathing',
  rate: '5 breaths/min',
  hint: 'Follow the orb — 6 seconds in, 6 seconds out, no holds. This pace is where heart rate and breathing sync up.',

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
