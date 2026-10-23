export default {
  title: 'Box Breathing',
  rate: 'in 4 · hold 4 · out 4 · hold 4',
  hint: 'Follow the marker around the square: up as you breathe in, across the top as you hold, down as you breathe out, along the bottom as you hold.',

  hue: 185,
  shape: 'box',
  opacity: { min: 0.5, max: 1 },

  phases: [
    { name: 'Inhale', dur: 4, scale: 1.00, vibrate: [120] },
    { name: 'Hold',   dur: 4, scale: 1.00, vibrate: [30, 60, 30] },
    { name: 'Exhale', dur: 4, scale: 0.72, vibrate: [120] },
    { name: 'Hold',   dur: 4, scale: 0.72, vibrate: [30, 60, 30] },
  ],
};
