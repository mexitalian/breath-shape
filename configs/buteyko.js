const getReady = {
  name: 'Get ready', dur: 5, scale: 0.72, vibrate: [120],
  prompt: 'Breathe in and out normally through your nose, then pinch your nose closed.',
};

const controlPause = (when) => ({
  name: 'Control pause', dur: null, scale: 0.72, vibrate: [200],
  record: `Control pause · ${when}`, action: 'First urge',
  prompt: 'Hold with your nose pinched. Tap at the very first urge to breathe, not when it gets hard.',
});

export default {
  title: 'Buteyko',
  rate: 'measure · breathe less · measure',
  hint: 'Breathe quietly through your nose, a little less than you want to. A mild air hunger is the goal.',

  hue: 170,
  shape: 'circle',
  opacity: { min: 0.3, max: 0.75 },

  startScreen: true,

  particles: { count: 10, radii: { inner: 0.42, outer: 0.58 } },

  sequence: {
    rounds: 1,
    steps: [
      getReady,
      controlPause('before'),
      {
        // About 3½ minutes of small, quiet breaths.
        repeat: 30,
        counter: 'Light breath',
        phases: [
          { name: 'Small in', dur: 3, scale: 0.84,
            particles: { from: 'outer', to: 'inner' }, prompt: 'Small, quiet breath in through the nose.' },
          { name: 'Relax out', dur: 4, scale: 0.74,
            particles: { from: 'inner', to: 'outer' }, prompt: 'Let it go. Keep a slight wish for more air.' },
        ],
      },
      getReady,
      controlPause('after'),
    ],
  },

  summaryNote: 'Under 20s is low, 20–40s is moderate, 40s or more is good. A longer pause after the practice is a good sign.',
};
