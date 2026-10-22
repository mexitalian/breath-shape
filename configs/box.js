window.BREATHING_CONFIG = {
  title:   'Box Breathing',
  eyebrow: 'Box Breathing',
  rate:    'in 4 · hold 4 · out 4 · hold 4',
  hint:    'Follow the dot around the square. In for 4, hold for 4, out for 4, hold for 4.',

  hue: 185,
  shape: 'box',

  phases: [
    { name: 'Inhale', dur: 4, scale: 1.00 },
    { name: 'Hold',   dur: 4, scale: 1.00 },
    { name: 'Exhale', dur: 4, scale: 0.72 },
    { name: 'Hold',   dur: 4, scale: 0.72 },
  ],

  minScale: 0.72,
  opacity:  { min: 0.50, max: 1.00 },

  vibrationPatterns: [
    [120],        // Inhale — one solid pulse
    [30, 60, 30], // Hold — two light taps
    [120],        // Exhale — one solid pulse
    [30, 60, 30], // Hold — two light taps
  ],

  particles: null,
  extras: { dot: true, track: true },
};
