window.BREATHING_CONFIG = {
  title:   'Physiological Sigh',
  eyebrow: 'Physiological Sigh',
  rate:    'in 2 · sip 1 · out 5',
  hint:    'Inhale through the nose, then sip in a little more on top. Let it all go on one long, slow exhale through the mouth. One to three rounds is usually enough.',

  hue: 42,
  shape: 'circle',

  // Per-keyframe easing gives the two-step inhale a fast rise and the exhale a slow release.
  // 'easing' applies to the transition FROM this phase's start TO this phase's end.
  phases: [
    { name: 'Inhale', dur: 2, scale: 0.82, easing: 'ease-out' },
    { name: 'Sip',    dur: 1, scale: 1.00, easing: 'ease-out' },
    { name: 'Exhale', dur: 5, scale: 0.55, easing: 'ease-in'  },
  ],

  minScale: 0.55,
  opacity:  { min: 0.35, max: 1.00 },

  vibrationPatterns: [
    [90],                       // Inhale — one medium pulse
    [40],                       // Sip — one short sharp tap
    [60, 50, 50, 40, 30, 30],   // Exhale — long fading release
  ],

  particles: {
    count: 26,
    // Three-radius system: particles pull inward in two steps, then release on exhale.
    radii: { inner: 0.14, mid: 0.48, outer: 0.92 },
    phases: [
      { from: 'outer', to: 'mid'   }, // Inhale: outer → mid
      { from: 'mid',   to: 'inner' }, // Sip: mid → tightest
      { from: 'inner', to: 'outer' }, // Exhale: slow release outward
    ],
  },

  extras: {},
};
