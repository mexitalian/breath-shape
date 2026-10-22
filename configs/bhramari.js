// A steady buzz for the length of the hum: 60ms on, 40ms off, for 8 seconds.
const HUM_BUZZ = Array.from({ length: 160 }, (_, i) => (i % 2 ? 40 : 60));

export default {
  title: 'Bhramari',
  rate: 'in 4 · hum 8',
  hint: 'Breathe in through your nose. With your mouth closed, breathe out on a low, steady "mmm", like a bee. Feel the hum in your face and chest.',

  hue: 75,
  shape: 'circle',
  opacity: { min: 0.35, max: 0.9 },

  sound: { tone: 130 },

  particles: { count: 22, radii: { inner: 0.2, outer: 0.92 } },

  phases: [
    { name: 'Inhale', dur: 4, scale: 1.00,
      vibrate: [120], particles: { from: 'outer', to: 'inner' } },
    { name: 'Hum', dur: 8, scale: 0.55, hum: true, vibrate: HUM_BUZZ },
  ],
};
