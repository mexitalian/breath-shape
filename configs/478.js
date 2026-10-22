window.BREATHING_CONFIG = {
  title:   '4-7-8 Breathing',
  eyebrow: '4-7-8 Breathing',
  rate:    'in 4 · hold 7 · out 8',
  hint:    'In through the nose for 4, hold for 7, out through the mouth for 8. The long exhale is what does the work.',

  hue: 14,
  shape: 'circle',

  phases: [
    { name: 'Inhale', dur: 4, scale: 1.00 },
    { name: 'Hold',   dur: 7, scale: 1.00 },
    { name: 'Exhale', dur: 8, scale: 0.55 },
  ],

  minScale: 0.55,
  opacity:  { min: 0.35, max: 0.90 },

  vibrationPatterns: [
    [120],                     // Inhale — one solid pulse
    [30, 60, 30],              // Hold — two light taps
    [50, 40, 40, 40, 30, 40],  // Exhale — fading release
  ],

  particles: {
    count: 26,
    radii: { inner: 0.20, outer: 0.92 },
    phases: [
      { from: 'outer', to: 'inner' }, // Inhale: converge
      { from: 'inner', to: 'inner' }, // Hold: settled near core
      { from: 'inner', to: 'outer' }, // Exhale: radiate
    ],
  },

  extras: {},
};
