export default {
  title: 'Wim Hof Method',
  rate: '3 rounds',
  hint: 'Breathe in deeply through the nose or mouth, let go without forcing it out. Fully in, let go.',

  hue: 200,
  shape: 'circle',
  opacity: { min: 0.2, max: 1 },

  safety: {
    extra: ['Never do this in water, even shallow water. Fainting during the hold is possible.'],
  },
  startScreen: true,

  particles: { count: 28, radii: { inner: 0.2, outer: 0.95 } },

  sequence: {
    rounds: 3,
    steps: [
      {
        repeat: 30,
        counter: 'Power breath',
        phases: [
          { name: 'Fully in', dur: 1.5, scale: 1.00, easing: 'ease-out',
            vibrate: [30], particles: { from: 'outer', to: 'inner' } },
          { name: 'Let go', dur: 1.5, scale: 0.62, easing: 'ease-in-out',
            particles: { from: 'inner', to: 'outer' } },
        ],
      },
      { name: 'Hold', dur: null, scale: 0.55, easing: 'ease-out',
        vibrate: [200], record: 'Retention', action: 'Breathe in',
        prompt: 'Breathe out and hold with empty lungs. Tap when you feel the urge to breathe.' },
      { name: 'Breathe in', dur: 2, scale: 1.00, easing: 'ease-out',
        vibrate: [120], particles: { from: 'outer', to: 'inner' },
        prompt: 'One big breath in.' },
      { name: 'Recovery hold', dur: 15, scale: 1.00,
        vibrate: [30, 60, 30], prompt: 'Hold the full breath for 15 seconds, then let go.' },
    ],
  },
};
