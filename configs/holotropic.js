export default {
  title: 'Connected Breathing',
  eyebrow: 'Holotropic-style',
  hint: 'Breathe deeper and faster than usual, in through the mouth, with no pause at the top or bottom. Keep the breath circular and connected.',

  hue: 255,
  shape: 'circle',
  opacity: { min: 0.35, max: 1 },

  safety: {
    extra: [
      'Traditional holotropic breathwork is done with a trained facilitator. This page only paces your breathing.',
      'Strong emotions or cramping in the hands can come up. Slow down or stop whenever you need to.',
    ],
  },
  startScreen: true,
  sessionMinutes: 20,
  sessionChoices: [10, 20, 30],

  // 1.5s in + 1.5s out = 20 breaths/min by default.
  pace: { min: 12, max: 30, step: 2, default: 20 },
  // Last 2 minutes: slow down gradually to a resting rhythm.
  windDown: { minutes: 2, bpm: 8, prompt: 'Winding down. Let each breath get slower and softer.' },

  particles: { count: 30, radii: { inner: 0.3, outer: 0.85 } },

  phases: [
    { name: 'In', dur: 1.5, scale: 1.00,
      particles: { from: 'outer', to: 'inner', orbit: 24 } },
    { name: 'Out', dur: 1.5, scale: 0.6,
      particles: { from: 'inner', to: 'outer', orbit: 24 } },
  ],
};
