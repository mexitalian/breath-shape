// Tilt, spin and shakes from the phone's motion sensor (the devicemotion event), for
// the fluid shapes and particles. Android (app and Chrome) sends these without asking;
// iPhone Safari needs a permission prompt, which we don't show, so it reports nothing.
// On a computer (a mouse, no motion sensor) the mouse stands in for tilt (#138): down
// points from the middle of the screen towards the pointer, so the pointer at the
// bottom is the phone held upright and the pointer in the middle is lying flat. A
// fast flick of the mouse counts as a shake. The real sensor wins once it reports.
//
// gravity: which way is down, in screen coordinates (x right, y down), smoothed.
//   Phone upright: { x: 0, y: 1 }. Lying flat: close to { x: 0, y: 0 }.
// spin: turning around the axis through the screen, degrees per second (+ = clockwise
//   as you look at the screen).
// available: true once the sensor has reported.

const G = 9.81;
const SMOOTHING_S = 0.12;   // gravity follows the phone over about this long
const SHAKE_MS2 = 6;        // a jolt this far from the smoothed reading counts as a shake
const SHAKE_GAP_MS = 250;   // at most one shake per this long

// Rotate a screen-space vector to the current screen orientation (0, 90, 180, 270).
function toScreen(x, y, angle) {
  switch (((angle % 360) + 360) % 360) {
    case 90: return [y, -x];
    case 180: return [-x, -y];
    case 270: return [-y, x];
    default: return [x, y];
  }
}

const FLICK_PX_S = 2500;     // a mouse this fast counts as a shake

// Pure: the mouse position → a down vector, as if the screen tilted towards it.
// Length 1 at the edge of the screen (or beyond), 0 in the middle.
export function gravityFromPointer(x, y, width, height) {
  const gx = (x - width / 2) / (width / 2 || 1);
  const gy = (y - height / 2) / (height / 2 || 1);
  const len = Math.hypot(gx, gy);
  return len > 1 ? [gx / len, gy / len] : [gx, gy];
}

// Pure: one sensor reading → down vector in screen coordinates (unit = 1 g).
// accelerationIncludingGravity points away from the floor (it's what a resting phone
// pushes against), with device y up the screen; screen y runs down.
export function gravityFromReading({ x = 0, y = 0 } = {}, angle = 0) {
  return toScreen(-x / G, y / G, angle);
}

export function createMotion({ onShake } = {}) {
  const state = { gravity: { x: 0, y: 1 }, spin: 0, available: false, destroy };
  if (typeof window === 'undefined') return state;
  let last = 0;
  let lastShake = 0;
  let smooth = null;

  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const now = e.timeStamp || performance.now();
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    const [gx, gy] = gravityFromReading(a, angle);
    const k = 1 - Math.exp(-dt / SMOOTHING_S);
    if (!smooth) smooth = { x: gx, y: gy, raw: { x: a.x, y: a.y, z: a.z ?? 0 } };
    smooth.x += (gx - smooth.x) * k;
    smooth.y += (gy - smooth.y) * k;
    state.gravity = { x: smooth.x, y: smooth.y };
    // A jolt: the raw reading jumps away from where it was a moment ago.
    const dxRaw = a.x - smooth.raw.x;
    const dyRaw = a.y - smooth.raw.y;
    const dzRaw = (a.z ?? 0) - smooth.raw.z;
    const jolt = Math.hypot(dxRaw, dyRaw, dzRaw);
    smooth.raw.x += dxRaw * k;
    smooth.raw.y += dyRaw * k;
    smooth.raw.z += dzRaw * k;
    if (jolt > SHAKE_MS2 && now - lastShake > SHAKE_GAP_MS) {
      lastShake = now;
      // The way the phone was pushed, on the screen's plane.
      const [dx, dy] = toScreen(dxRaw, -dyRaw, angle);
      const flat = Math.hypot(dx, dy) || 1;
      onShake?.({ strength: Math.min(1, jolt / (SHAKE_MS2 * 3)), x: dx / flat, y: dy / flat });
    }
    // rotationRate.alpha: around the axis out of the screen, counter-clockwise positive.
    const spin = e.rotationRate?.alpha;
    if (spin != null) state.spin += (-spin - state.spin) * k;
    state.available = true;
  }

  // The mouse, on a computer: only while the motion sensor hasn't reported.
  let sensor = false;
  let mouseAt = null;
  let mouse = null;
  const onMouse = (e) => {
    if (sensor) return;
    const now = e.timeStamp || performance.now();
    const [gx, gy] = gravityFromPointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    if (!mouse) mouse = { x: gx, y: gy };
    const dt = mouseAt ? Math.min(0.1, (now - mouseAt.t) / 1000) : 0.016;
    const k = 1 - Math.exp(-dt / SMOOTHING_S);
    mouse.x += (gx - mouse.x) * k;
    mouse.y += (gy - mouse.y) * k;
    state.gravity = { x: mouse.x, y: mouse.y };
    if (mouseAt && dt > 0) {
      const dx = e.clientX - mouseAt.x;
      const dy = e.clientY - mouseAt.y;
      const speed = Math.hypot(dx, dy) / dt;
      if (speed > FLICK_PX_S && now - lastShake > SHAKE_GAP_MS) {
        lastShake = now;
        const flat = Math.hypot(dx, dy) || 1;
        onShake?.({ strength: Math.min(1, speed / (FLICK_PX_S * 3)), x: dx / flat, y: dy / flat });
      }
    }
    mouseAt = { x: e.clientX, y: e.clientY, t: now };
    state.available = true;
  };
  const hasMouse = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  const sensorMotion = (e) => {
    if (e.accelerationIncludingGravity?.x == null) return;
    sensor = true;
    onMotion(e);
  };

  window.addEventListener('devicemotion', sensorMotion);
  if (hasMouse) window.addEventListener('mousemove', onMouse);
  function destroy() {
    window.removeEventListener('devicemotion', sensorMotion);
    window.removeEventListener('mousemove', onMouse);
  }
  return state;
}
