export default {
  title: 'Tummo',
  rate: '5 rounds',
  hint: 'Deep, full breaths: belly, then chest. Let each one go without pushing.',

  hue: 28,
  shape: 'circle',
  opacity: { min: 0.25, max: 1 },

  safety: {
    extra: ['Squeeze gently during the hold. Never strain, and stop if you feel dizzy.'],
  },
  startScreen: true,

  particles: { count: 28, radii: { inner: 0.2, outer: 0.95 } },

  sequence: {
    rounds: 5,
    steps: [
      {
        repeat: 20,
        counter: 'Breath',
        phases: [
          { name: 'Fully in', dur: 2, scale: 1.00, easing: 'ease-out',
            vibrate: [30], particles: { from: 'outer', to: 'inner' } },
          { name: 'Let go', dur: 2, scale: 0.62,
            particles: { from: 'inner', to: 'outer' } },
        ],
      },
      { name: 'Breathe in fully', dur: 2, scale: 1.00, easing: 'ease-out',
        vibrate: [120], particles: { from: 'outer', to: 'inner' } },
      // Unlike Wim Hof, the hold is on a full breath. Heat builds; embers drift up.
      { name: 'Hold & squeeze', dur: null, scale: 1.00, heat: true,
        vibrate: [200], record: 'Hold', action: 'Release',
        particles: { from: 'inner', to: 'outer', cone: { angle: -90, spread: 110 } },
        prompt: 'Hold the full breath and gently squeeze your belly and pelvic floor. Feel warmth at your navel. Tap to release.' },
      { name: 'Rest', dur: 12, scale: 0.72,
        vibrate: [120, 80, 120], prompt: 'Let go and breathe normally.' },
    ],
  },
};
