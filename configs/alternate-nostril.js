// Left and right feel different under the fingers when your eyes are closed:
// one pulse for the left side, two for the right.
const LEFT = [120];
const RIGHT = [60, 60, 60];
const HOLD = [30, 60, 30];

const particlesIn = { from: 'outer', to: 'inner' };
const particlesOut = { from: 'inner', to: 'outer' };

const inLeft = { name: 'In · left', dur: 4, scale: 1.00, side: 'left', vibrate: LEFT, particles: particlesIn,
  prompt: 'Close the right nostril with your thumb. Breathe in through the left.' };
const outRight = { name: 'Out · right', dur: 4, scale: 0.55, side: 'right', vibrate: RIGHT, particles: particlesOut,
  prompt: 'Close the left nostril with your ring finger. Breathe out through the right.' };
const inRight = { name: 'In · right', dur: 4, scale: 1.00, side: 'right', vibrate: RIGHT, particles: particlesIn,
  prompt: 'Stay on the right. Breathe in.' };
const outLeft = { name: 'Out · left', dur: 4, scale: 0.55, side: 'left', vibrate: LEFT, particles: particlesOut,
  prompt: 'Switch: close the right nostril. Breathe out through the left.' };
const hold = { name: 'Hold', dur: 4, scale: 1.00, side: 'both', vibrate: HOLD,
  prompt: 'Close both nostrils and hold gently.' };

export default {
  title: 'Alternate Nostril',
  eyebrow: 'Nadi Shodhana',
  rate: 'in 4 · out 4 · switch',
  hint: 'Use your right thumb and ring finger to close one nostril at a time. Follow the side that is lit.',

  hue: 45,
  shape: 'circle',
  layout: 'split',
  split: { hueOffset: 25, labels: ['Left', 'Right'] },
  opacity: { min: 0.35, max: 0.9 },

  startScreen: true,

  particles: { count: 16, radii: { inner: 0.2, outer: 0.92 } },

  variants: [
    { label: 'Without holds', phases: [inLeft, outRight, inRight, outLeft] },
    { label: 'With holds', phases: [inLeft, hold, outRight, inRight, { ...hold }, outLeft] },
  ],
};
