import { ring, track, glow, core } from './basic.js';
import { particles } from './particles.js';
import { dot } from './dot.js';
import { ripple } from './ripple.js';

// Each component: ({ field, cfg }) => { update?(snapshot) }.
// Mounted in the order a config (or its shape preset) lists them, which is also stacking order.
export const COMPONENTS = { ring, track, glow, core, particles, dot, ripple };
