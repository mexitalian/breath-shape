/* BreathingEngine — shared phase timer, particle system, vibration, hue-drag.
   Call BreathingEngine.init(window.BREATHING_CONFIG) to start. */
(function () {
  'use strict';

  // ---- noise: deterministic hash-based value noise (smoothstep interpolated) ----
  function hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }
  function noise1D(x) {
    const i = Math.floor(x);
    const f = x - i;
    const a = hash(i);
    const b = hash(i + 1);
    const u = f * f * (3 - 2 * f); // smoothstep
    return a + (b - a) * u;
  }

  // ---- phase engine ----
  function computeStarts(phases) {
    return phases.reduce((acc, p, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + phases[i - 1].dur);
      return acc;
    }, []);
  }

  function getPhaseAt(tSec, phases, starts) {
    for (let i = phases.length - 1; i >= 0; i--) {
      if (tSec >= starts[i]) {
        return { index: i, frac: (tSec - starts[i]) / phases[i].dur };
      }
    }
    return { index: 0, frac: 0 };
  }

  // ---- keyframe generation ----
  function f(n) { return +n.toFixed(4) + '%'; } // "21.0526%", no trailing zeros

  function generateBreathKeyframes(cfg, phases, starts, cycleS) {
    const n = phases.length;
    const minScale = cfg.minScale;
    const minOp = cfg.opacity.min;
    const maxOp = cfg.opacity.max;

    function scaleToOpacity(s) {
      const t = (s - minScale) / (1 - minScale);
      return +(minOp + t * (maxOp - minOp)).toFixed(4);
    }

    let breathe = '@keyframes breathe {\n';
    let pulse   = '@keyframes pulse {\n';

    for (let i = 0; i < n; i++) {
      const phasePct = starts[i] / cycleS * 100;
      // The scale at the START of phase i = the scale at the END of the previous phase
      const startScale = phases[(i - 1 + n) % n].scale;
      const easing = phases[i].easing
        ? `\n  animation-timing-function: ${phases[i].easing};` : '';

      breathe += `  ${f(phasePct)} { transform: scale(${startScale});${easing} }\n`;
      pulse   += `  ${f(phasePct)} { opacity: ${scaleToOpacity(startScale)};${easing} }\n`;
    }

    // 100% closes the loop — same values as the 0% frame
    const endScale = phases[n - 1].scale;
    breathe += `  100% { transform: scale(${endScale}); }\n}\n`;
    pulse   += `  100% { opacity: ${scaleToOpacity(endScale)}; }\n}\n`;

    return breathe + '\n' + pulse;
  }

  // Box breathing: dot traces the square perimeter, one side per phase.
  // A 1% pause at each corner is achieved by arriving 1% early then holding.
  function generateTraceKeyframes(phases, starts, cycleS) {
    const corners = [
      { top: '-7px',             left: '-7px'             }, // top-left    (start of phase 0)
      { top: 'calc(100% - 7px)', left: '-7px'             }, // bottom-left (start of phase 1)
      { top: 'calc(100% - 7px)', left: 'calc(100% - 7px)' }, // bottom-right (start of phase 2)
      { top: '-7px',             left: 'calc(100% - 7px)' }, // top-right   (start of phase 3)
    ];

    function pos(c) { return `top: ${c.top}; left: ${c.left};`; }

    let kf = '@keyframes trace {\n';
    kf += `  0% { ${pos(corners[0])} }\n`;

    for (let i = 0; i < phases.length; i++) {
      const endPct  = (starts[i] + phases[i].dur) / cycleS * 100;
      const arrival = endPct - 1; // arrive at corner 1% early → brief pause
      const next    = corners[(i + 1) % corners.length];

      kf += `  ${f(arrival)} { ${pos(next)} }\n`;
      kf += `  ${f(endPct)}  { ${pos(next)} }\n`;
    }

    kf += '}\n';
    return kf;
  }

  // Resonance ripple: expands during inhale, snaps back at start of exhale.
  function generateRippleKeyframes(phases, starts, cycleS, minScale) {
    const inhaleEnd = (starts[0] + phases[0].dur) / cycleS * 100;
    return [
      '@keyframes ripple {',
      `  0% { transform: scale(${minScale}); opacity: 0.6; }`,
      `  ${f(inhaleEnd)} { transform: scale(1.05); opacity: 0; }`,
      `  ${f(inhaleEnd + 0.01)} { transform: scale(${minScale}); opacity: 0.6; }`,
      `  100% { transform: scale(${minScale}); opacity: 0.6; }`,
      '}\n',
    ].join('\n');
  }

  function injectKeyframes(cfg, phases, starts, cycleS) {
    let css = generateBreathKeyframes(cfg, phases, starts, cycleS);

    if (cfg.shape === 'box') {
      css += '\n' + generateTraceKeyframes(phases, starts, cycleS);
    }
    if (cfg.extras && cfg.extras.ripple) {
      css += '\n' + generateRippleKeyframes(phases, starts, cycleS, cfg.minScale);
    }

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---- DOM builder ----
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function buildDOM(cfg) {
    document.title = cfg.title;

    const stage = el('div', 'stage');
    const eyebrow = el('div', 'eyebrow');
    eyebrow.innerHTML = cfg.rate
      ? `${cfg.eyebrow} · <span class="rate">${cfg.rate}</span>`
      : cfg.eyebrow;
    stage.appendChild(eyebrow);

    const field = el('div', 'field');

    if (cfg.shape === 'box') {
      field.appendChild(el('div', 'track'));
    } else {
      field.appendChild(el('div', 'ring'));
      if (cfg.extras && cfg.extras.ripple) {
        field.appendChild(el('div', 'ripple'));
      }
    }

    field.appendChild(el('div', 'glow'));

    if (cfg.particles) {
      const pl = el('div', 'particle-layer');
      pl.id = 'particleLayer';
      field.appendChild(pl);
    }

    field.appendChild(el('div', 'core'));

    if (cfg.shape === 'box') {
      field.appendChild(el('div', 'dot'));
    }

    stage.appendChild(field);

    const labels = el('div');
    labels.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0.4rem;';
    const phaseLabel = el('div', 'phase');
    phaseLabel.id = 'phaseLabel';
    phaseLabel.textContent = cfg.phases[0].name;
    const phaseCount = el('div', 'count');
    phaseCount.id = 'phaseCount';
    phaseCount.textContent = cfg.phases[0].dur;
    labels.appendChild(phaseLabel);
    labels.appendChild(phaseCount);
    stage.appendChild(labels);

    const hint = el('div', 'hint');
    hint.textContent = cfg.hint;
    stage.appendChild(hint);

    document.body.appendChild(stage);
    return { stage, field };
  }

  // ---- particles ----
  function initParticles(cfg) {
    if (!cfg.particles) return null;

    const layer = document.getElementById('particleLayer');
    const count = cfg.particles.count;
    const particles = [];

    for (let i = 0; i < count; i++) {
      const node = el('div', 'particle');
      layer.appendChild(node);
      particles.push({
        el:           node,
        seed:         i * 3.17 + Math.random() * 2,
        radiusSeed:   i * 5.29 + Math.random() * 2,
        sizeJitter:   0.7 + Math.random() * 0.8,
        opacityJitter: 0.6 + Math.random() * 0.4,
        speedExp:     0.55 + Math.random() * 1.3, // <1 rushes early, >1 lags then catches up
      });
    }
    return particles;
  }

  function resolveR(key, radii, R) {
    return R * (radii[key] || 0);
  }

  function tickParticles(now, cfg, particles, field, phases, starts, cycleS) {
    const R    = field.clientWidth / 2;
    const radii = cfg.particles.radii;
    const phaseDefs = cfg.particles.phases;

    const tSec = (now / 1000) % cycleS;
    const { index, frac } = getPhaseAt(tSec, phases, starts);

    // phaseSeed increments once per phase transition, re-randomizing particle placement
    const cycleIdx  = Math.floor(now / 1000 / cycleS);
    const phaseSeed = cycleIdx * phases.length + index;

    // full fade in/out at every phase boundary makes re-seeded placement invisible
    const opacityEnvelope = Math.sin(Math.min(frac, 1) * Math.PI);

    const motion = phaseDefs[index];
    const fromR  = resolveR(motion.from, radii, R);
    const toR    = resolveR(motion.to,   radii, R);

    particles.forEach(p => {
      const angle  = noise1D(p.seed      + phaseSeed *  9.13) * Math.PI * 2;
      const spread = 0.65 + noise1D(p.radiusSeed + phaseSeed * 13.7)  * 0.55;

      // per-particle speed warp: speeds visibly differ while all starting/finishing together
      const pFrac  = Math.pow(Math.min(frac, 1), p.speedExp);
      const pRadius = fromR + (toR - fromR) * pFrac;

      const r = pRadius * spread;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      p.el.style.transform = `translate(${x}px,${y}px) scale(${p.sizeJitter})`;
      p.el.style.opacity   = opacityEnvelope * p.opacityJitter;
    });
  }

  // ---- vibration ----
  function initVibration(stage) {
    const supported = 'vibrate' in navigator;
    let armed = false;

    const statusEl = el('div');
    statusEl.style.cssText = 'font-size:0.7rem;color:var(--dim);transition:opacity 0.6s ease;min-height:1em;';
    stage.appendChild(statusEl);

    const btn = el('button');
    btn.textContent = supported ? 'Enable vibration' : 'Vibration unsupported';
    btn.disabled = !supported;
    btn.style.cssText = [
      'background:var(--glow)',
      'color:#0e0a06',
      'border:none',
      'font-size:0.85rem',
      'font-weight:600',
      'letter-spacing:0.02em',
      'padding:0.7rem 1.4rem',
      'border-radius:999px',
      'cursor:pointer',
    ].join(';');

    btn.addEventListener('click', () => {
      const ok = navigator.vibrate(200);
      armed = !!ok;
      statusEl.textContent = armed
        ? "Vibration on — you'll feel the next phase change."
        : 'Tap registered, but the browser blocked vibration.';
      setTimeout(() => { statusEl.style.opacity = '0'; }, 2500);
      btn.textContent = armed ? 'Vibration on' : 'Vibration blocked';
      btn.disabled = true;
    });
    stage.appendChild(btn);

    return function buzz(pattern) {
      if (!armed) return;
      try { navigator.vibrate(pattern); } catch (_) {}
    };
  }

  // ---- hue control: angle from screen center → hue (works at any hue) ----
  function initHueControl() {
    function apply(clientX, clientY) {
      const angle = Math.atan2(clientY - window.innerHeight / 2, clientX - window.innerWidth / 2);
      document.documentElement.style.setProperty('--hue', ((angle * 180 / Math.PI) + 360) % 360);
    }
    document.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) apply(t.clientX, t.clientY);
    }, { passive: true });
    let down = false;
    document.addEventListener('mousedown', (e) => { down = true;  apply(e.clientX, e.clientY); });
    document.addEventListener('mousemove', (e) => { if (down) apply(e.clientX, e.clientY); });
    document.addEventListener('mouseup',   ()  => { down = false; });
  }

  // ---- init ----
  function init(cfg) {
    const phases  = cfg.phases;
    const starts  = computeStarts(phases);
    const cycleS  = phases.reduce((s, p) => s + p.dur, 0);

    // CSS variables that scale with the config
    const root = document.documentElement;
    root.style.setProperty('--hue',     cfg.hue);
    root.style.setProperty('--cycle-s', cycleS + 's');
    if (cfg.shape === 'box') {
      root.style.setProperty('--core-size',   '40%');
      root.style.setProperty('--core-radius', '18px');
      root.style.setProperty('--field-radius', '22px');
    }

    injectKeyframes(cfg, phases, starts, cycleS);

    const { stage, field } = buildDOM(cfg);
    const particles = initParticles(cfg);
    const buzz      = initVibration(stage);
    initHueControl();

    const labelEl = document.getElementById('phaseLabel');
    const countEl = document.getElementById('phaseCount');
    let lastIdx = -1;

    function tick(now) {
      const tSec = (now / 1000) % cycleS;
      const { index, frac } = getPhaseAt(tSec, phases, starts);
      const dur = phases[index].dur;

      labelEl.textContent = phases[index].name;
      countEl.textContent = Math.max(1, Math.ceil(dur - frac * dur));

      if (index !== lastIdx) {
        lastIdx = index;
        if (cfg.vibrationPatterns) buzz(cfg.vibrationPatterns[index]);
      }

      if (particles) tickParticles(now, cfg, particles, field, phases, starts, cycleS);

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  window.BreathingEngine = { init };
})();
