export default {
  title: '4-7-8 Breathing',
  rate: 'in 4 · hold 7 · out 8',
  hint: 'In through the nose for 4, hold for 7, out through the mouth for 8. The long exhale is what does the work.',

  hue: 14,
  shape: 'circle',
  opacity: { min: 0.35, max: 0.9 },

  particles: { count: 26, radii: { inner: 0.20, outer: 0.92 } },

  phases: [
    { name: 'Inhale', dur: 4, scale: 1.00,
      vibrate: [120], particles: { from: 'outer', to: 'inner' } },
    { name: 'Hold', dur: 7, scale: 1.00,
      vibrate: [30, 60, 30], particles: { from: 'inner', to: 'inner' } },
    { name: 'Exhale', dur: 8, scale: 0.55,
      vibrate: [50, 40, 40, 40, 30, 40], particles: { from: 'inner', to: 'outer' } },
  ],
};
