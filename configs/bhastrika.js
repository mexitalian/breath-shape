export default {
  title: 'Bhastrika',
  rate: '3 × 20 breaths',
  hint: 'Breathe in and out forcefully through your nose, like a bellows, using your belly. Equal in and out.',

  hue: 350,
  shape: 'circle',
  opacity: { min: 0.3, max: 1 },

  safety: true,
  startScreen: true,

  particles: { count: 26, radii: { inner: 0.22, outer: 0.92 } },

  sequence: {
    rounds: 3,
    steps: [
      {
        repeat: 20,
        counter: 'Breath',
        phases: [
          { name: 'In', dur: 1, scale: 1.00, easing: 'ease-out',
            vibrate: [30], particles: { from: 'outer', to: 'inner' } },
          { name: 'Out', dur: 1, scale: 0.60, easing: 'ease-out',
            particles: { from: 'inner', to: 'outer' } },
        ],
      },
      { name: 'Rest', dur: 30, scale: 0.72, easing: 'ease-in-out',
        vibrate: [120, 80, 120], prompt: 'Breathe normally and let your body settle.' },
    ],
  },
};
