export default {
  title: 'Kapalabhati',
  rate: '3 × 30 pumps',
  hint: 'Snap your belly in to push the air out sharply through your nose. Let the in-breath happen on its own. About one pump a second.',

  hue: 105,
  shape: 'circle',
  opacity: { min: 0.35, max: 1 },

  safety: true,
  startScreen: true,

  particles: { count: 26, radii: { inner: 0.22, outer: 0.85 } },

  sequence: {
    rounds: 3,
    steps: [
      {
        repeat: 30,
        counter: 'Pump',
        // Both halves share one label: switching the word every 0.3s would be unreadable.
        phases: [
          { name: 'Snap out', dur: 0.3, scale: 0.70, easing: 'ease-out',
            vibrate: [25], particles: { from: 'inner', to: 'outer' } },
          { name: 'Snap out', dur: 0.7, scale: 0.88, easing: 'ease-in' },
        ],
      },
      { name: 'Rest', dur: 30, scale: 0.75,
        vibrate: [120, 80, 120], prompt: 'Breathe normally and let your body settle.' },
    ],
  },
};
