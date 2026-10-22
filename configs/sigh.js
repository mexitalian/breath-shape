export default {
  title: 'Physiological Sigh',
  rate: 'in 2 · sip 1 · out 5',
  hint: 'Inhale through the nose, then sip in a little more on top. Let it all go on one long, slow exhale through the mouth. One to three rounds is usually enough.',

  hue: 42,
  shape: 'circle',
  opacity: { min: 0.35, max: 1 },

  // Three radii: particles pull inward in two steps, then release on the exhale.
  particles: { count: 26, radii: { inner: 0.14, mid: 0.48, outer: 0.92 } },

  // easing shapes the move from the previous phase's scale to this one's:
  // a fast two-step rise, then a slow release.
  phases: [
    { name: 'Inhale', dur: 2, scale: 0.82, easing: 'ease-out',
      vibrate: [90], particles: { from: 'outer', to: 'mid' } },
    { name: 'Sip', dur: 1, scale: 1.00, easing: 'ease-out',
      vibrate: [40], particles: { from: 'mid', to: 'inner' } },
    { name: 'Exhale', dur: 5, scale: 0.55, easing: 'ease-in',
      vibrate: [60, 50, 50, 40, 30, 30], particles: { from: 'inner', to: 'outer' } },
  ],
};
