window.BREATHING_CONFIG = {
  title:   'Resonance Breathing',
  eyebrow: 'Resonance Breathing',
  rate:    '5 breaths/min',
  hint:    'Follow the orb — 6 seconds in, 6 seconds out, no holds. This pace is where heart rate and breathing sync up.',

  hue: 262,
  shape: 'circle',

  phases: [
    { name: 'Inhale', dur: 6, scale: 1.00 },
    { name: 'Exhale', dur: 6, scale: 0.55 },
  ],

  minScale: 0.55,
  opacity:  { min: 0.35, max: 0.90 },

  vibrationPatterns: [
    [120],
    [50, 40, 40, 40, 30, 40],
  ],

  particles: {
    count: 26,
    radii: { inner: 0.20, outer: 0.92 },
    phases: [
      { from: 'outer', to: 'inner' }, // Inhale: particles converge
      { from: 'inner', to: 'outer' }, // Exhale: particles radiate
    ],
  },

  extras: { ripple: true },
};
