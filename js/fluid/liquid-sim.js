// 1D liquid surface, ported from the cocktailcollectiveberlin.com nav
// (cocktail-craft-collective/src/lib/liquid-sim.ts). Pure maths, no DOM.
//
// The surface is a row of points across the width. Each has a height `h` (px,
// positive = down) and a velocity. Per point, acceleration comes from:
//   - wave propagation: neighbours pull on each other (the 1D wave equation)
//   - settle pull: a spring towards the rest line, which can slope (`setSlope`):
//     a tilted phone tilts the liquid, and changing the tilt makes it slosh
//   - friction, so everything comes to rest
//   - an optional hold: a hand pressing a bell-shaped bump or dip
// The ends are the glass walls: waves reflect off them. With { ring: true } the
// ends join instead, for a closed loop such as a shape's outline (Membrane).
// Fixed small sub-steps keep it the same at any frame rate.

const POINT_SPACING = 6;
const HOLD_STIFFNESS = 4000;
const REST_HEIGHT = 0.15;
const REST_VELOCITY = 1.5;

export class LiquidSim {
  // params: { waveSpeed px/s, friction 1/s, settlePull 1/s², maxRise px, maxDepth px }
  // width: length of the surface, px (for a ring, the loop's length).
  constructor(width, params, { ring = false } = {}) {
    this.width = Math.max(1, width);
    this.ring = ring;
    const points = Math.round(this.width / POINT_SPACING);
    this.count = Math.min(400, Math.max(24, ring ? points : points + 1));
    this.spacing = this.width / (ring ? this.count : this.count - 1);
    this.h = new Float64Array(this.count);
    this.v = new Float64Array(this.count);
    this.rest = new Float64Array(this.count);
    this.params = params;
    this.holdShape = null;
    this.holdAmount = 0;
  }

  x(i) {
    return i * this.spacing;
  }

  // Soft bell-shaped weights centred on x; width ≈ visible width of the bump.
  bell(x, width) {
    const sigma = Math.max(1, width / 2.5);
    const w = new Float64Array(this.count);
    for (let i = 0; i < this.count; i++) {
      let dx = this.x(i) - x;
      if (this.ring) dx -= this.width * Math.round(dx / this.width); // nearest way round
      const d = dx / sigma;
      w[i] = Math.exp(-0.5 * d * d);
    }
    return w;
  }

  // The rest shape, point by point (px), e.g. a membrane sagging under gravity.
  setRest(heights) {
    this.rest.set(heights);
  }

  // The rest line's slope (dy/dx, y down), pivoting on the middle. 0 = level.
  setSlope(slope) {
    const mid = this.width / 2;
    for (let i = 0; i < this.count; i++) this.rest[i] = slope * (this.x(i) - mid);
  }

  // Press the surface into a bump/dip centred on x; amount = height at the centre
  // relative to the rest line (negative = rise).
  hold(x, width, amount) {
    this.holdShape = this.bell(x, width);
    this.holdAmount = this.clampHeight(amount);
  }

  get isHolding() {
    return this.holdShape !== null;
  }

  release() {
    this.holdShape = null;
    this.holdAmount = 0;
  }

  // A velocity kick (px/s at the centre) in a bell shape around x.
  impulse(x, width, velocity) {
    const w = this.bell(x, width);
    for (let i = 0; i < this.count; i++) this.v[i] += velocity * w[i];
  }

  // A sideways shove: the liquid piles up on one side (+1 = right) and sloshes back.
  shove(direction, velocity) {
    const mid = this.width / 2;
    for (let i = 0; i < this.count; i++) this.v[i] -= velocity * direction * ((this.x(i) - mid) / mid);
  }

  reset() {
    this.h.fill(0);
    this.v.fill(0);
    this.release();
  }

  // Flat on its rest line, still, and nothing holding it.
  get isSettled() {
    if (this.holdShape) return false;
    for (let i = 0; i < this.count; i++) {
      if (Math.abs(this.h[i] - this.rest[i]) > REST_HEIGHT || Math.abs(this.v[i]) > REST_VELOCITY) return false;
    }
    return true;
  }

  clampHeight(y) {
    return Math.min(this.params.maxDepth, Math.max(-this.params.maxRise, y));
  }

  // Advance by dt seconds (clamped, split into stable sub-steps).
  step(dt) {
    const frame = Math.min(Math.max(dt, 0), 1 / 20);
    const { waveSpeed, friction, settlePull, maxRise, maxDepth } = this.params;
    const c2 = (waveSpeed * waveSpeed) / (this.spacing * this.spacing);
    const maxSub = Math.min((0.5 * this.spacing) / Math.max(waveSpeed, 1), 1 / 240);
    const steps = Math.max(1, Math.ceil(frame / maxSub));
    const sub = frame / steps;
    const holdDamp = 2 * Math.sqrt(HOLD_STIFFNESS);
    const { h, v, rest, count } = this;
    const last = count - 1;
    // Waves travel on top of the rest line, so they see the height above it.
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i <= last; i++) {
        const d = h[i] - rest[i];
        // Walls mirror the neighbour (waves reflect); a ring wraps round.
        const li = i === 0 ? (this.ring ? last : 1) : i - 1;
        const ri = i === last ? (this.ring ? 0 : last - 1) : i + 1;
        const left = h[li] - rest[li];
        const right = h[ri] - rest[ri];
        let a = c2 * (left - 2 * d + right) - settlePull * d - friction * v[i];
        if (this.holdShape) {
          const w = this.holdShape[i];
          a += w * (HOLD_STIFFNESS * (rest[i] + this.holdAmount * w - h[i]) - holdDamp * v[i]);
        }
        v[i] += a * sub;
      }
      for (let i = 0; i <= last; i++) {
        h[i] += v[i] * sub;
        const lo = rest[i] - maxRise;
        const hi = rest[i] + maxDepth;
        if (h[i] < lo) {
          h[i] = lo;
          if (v[i] < 0) v[i] = 0;
        } else if (h[i] > hi) {
          h[i] = hi;
          if (v[i] > 0) v[i] = 0;
        }
      }
    }
  }
}
