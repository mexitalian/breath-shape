// WebGL particles (Settings → Particles → WebGL test): a few hundred soft points on
// one canvas, moving like the standard particles (between named radii once per
// phase, fading at phase boundaries, optional cone and orbit). All motion is worked
// out in the vertex shader; JavaScript only sets a handful of uniforms per frame.
// Draws at most 30 frames a second.

const COUNT = 360;
const MIN_FRAME_MS = 1000 / 30;
const HOLD_LOOP_MS = 4000;

const VERTEX = `
attribute vec4 aSeed;      // angle, spread, speed exponent, size
attribute float aTwinkle;
uniform float uFrom, uTo, uFrac, uEnvelope, uOrbit, uShuffle, uTime;
uniform float uConeAngle, uConeSpread, uPointSize;
varying float vAlpha;
void main() {
  float a = fract(aSeed.x + uShuffle);
  float angle = uOrbit + (uConeSpread > 0.0
    ? radians(uConeAngle + (a - 0.5) * uConeSpread)
    : a * 6.2831853);
  float spread = 0.65 + fract(aSeed.y + uShuffle * 1.618) * 0.55;
  float r = mix(uFrom, uTo, pow(uFrac, aSeed.z)) * spread;
  gl_Position = vec4(cos(angle) * r, -sin(angle) * r, 0.0, 1.0);
  gl_PointSize = uPointSize * aSeed.w;
  vAlpha = uEnvelope * (0.55 + 0.45 * sin(uTime * 1.7 + aTwinkle * 6.2831853));
}`;

const FRAGMENT = `
precision mediump float;
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = vAlpha * pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
  gl_FragColor = vec4(uColor * a, a);   // premultiplied
}`;

// '#rrggbb' or 'rgb(r, g, b)' from getComputedStyle → [0–1] × 3
function rgbOf(css) {
  const m = css.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(v => Number(v) / 255) : [0.6, 0.7, 0.9];
}

// layer: the element to draw in (the standard particle layer, so the canvas sits
// under the breathing shape like the standard particles do).
export function createGlParticles({ field, layer, cfg }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'particle-canvas';
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  // Per particle: angle, spread, speed exponent (<1 rushes, >1 lags), size; twinkle phase.
  const seeds = new Float32Array(COUNT * 5);
  for (let i = 0; i < COUNT; i++) {
    seeds.set([Math.random(), Math.random(), 0.55 + Math.random() * 1.3, 0.5 + Math.random(), Math.random()], i * 5);
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  const aSeed = gl.getAttribLocation(program, 'aSeed');
  const aTwinkle = gl.getAttribLocation(program, 'aTwinkle');
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(aTwinkle);
  gl.vertexAttribPointer(aTwinkle, 1, gl.FLOAT, false, 20, 16);
  const u = Object.fromEntries(['uFrom', 'uTo', 'uFrac', 'uEnvelope', 'uOrbit', 'uShuffle', 'uTime', 'uConeAngle', 'uConeSpread', 'uPointSize', 'uColor']
    .map(name => [name, gl.getUniformLocation(program, name)]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  layer.append(canvas);
  let last = 0;
  let cleared = true;
  let color = null;
  let colorAt = 0;
  // Custom properties read back unresolved; the canvas's own CSS colour resolves the
  // accent (theme and hue drag included), re-read at most twice a second.
  canvas.style.color = 'var(--color-accent)';

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.round(field.clientWidth * ratio);
    if (canvas.width !== size) { canvas.width = canvas.height = size; gl.viewport(0, 0, size, size); }
    return ratio;
  }

  function clear() {
    if (cleared) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    cleared = true;
  }

  function update(snap, now = performance.now()) {
    const motion = snap.phase.particles;
    if (!motion || snap.finished) { clear(); return; }
    if (now - last < MIN_FRAME_MS) return;
    last = now;

    let frac = snap.progress ?? 1;
    let shuffle = snap.serial * 0.381966;
    if (motion.orbit) shuffle = 0;
    if (snap.openEnded) {
      const loop = Math.floor(snap.elapsed / HOLD_LOOP_MS);
      frac = (snap.elapsed % HOLD_LOOP_MS) / HOLD_LOOP_MS;
      shuffle += loop * 0.19;
    }
    const ratio = resize();
    if (!color || now - colorAt > 500) { color = rgbOf(getComputedStyle(canvas).color); colorAt = now; }
    const { radii } = cfg.particles;
    gl.uniform1f(u.uFrom, radii[motion.from] ?? 0);
    gl.uniform1f(u.uTo, radii[motion.to] ?? 0);
    gl.uniform1f(u.uFrac, frac);
    gl.uniform1f(u.uEnvelope, motion.orbit ? 1 : Math.sin(frac * Math.PI));
    gl.uniform1f(u.uOrbit, motion.orbit ? ((snap.sessionElapsed / 1000) * motion.orbit * Math.PI) / 180 : 0);
    gl.uniform1f(u.uShuffle, shuffle);
    gl.uniform1f(u.uTime, now / 1000);
    gl.uniform1f(u.uConeAngle, motion.cone?.angle ?? 0);
    gl.uniform1f(u.uConeSpread, motion.cone?.spread ?? 0);
    gl.uniform1f(u.uPointSize, 7 * ratio);
    gl.uniform3fv(u.uColor, color);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, COUNT);
    cleared = false;
  }

  return { update, clear };
}
