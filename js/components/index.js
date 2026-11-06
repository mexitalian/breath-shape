import { ring, track, glow } from './basic.js';
import { core } from './core.js';
import { particles } from './particles.js';
import { dot } from './dot.js';
import { ripple } from './ripple.js';
import { outline } from './outline.js';
import { hum } from './hum.js';
import { heat } from './heat.js';
import { brackets } from './brackets.js';
import { form, formMarker } from './form.js';

// Each component: ({ field, cfg }) => { update?(snapshot) }.
// Mounted in the order a config (or its shape preset) lists them, which is also stacking order.
export const COMPONENTS = { ring, track, outline, glow, hum, heat, form, core, formMarker, particles, brackets, dot, ripple };
