export default {
  title: 'Box Breathing',
  rate: 'in 4 · hold 4 · out 4 · hold 4',
  hint: 'Follow the marker around the square. In for 4, hold for 4, out for 4, hold for 4.',

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
