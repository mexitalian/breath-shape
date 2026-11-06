// Breath shapes (#159): every technique drawn as its own shape. Calm and focus
// patterns get one side per phase, each as long as its phase (4-7-8 is a 4 : 7 : 8
// triangle); Energise techniques get a picture of what they do. Resonance stays a
// circle (in and out are equal), and Box, Triangle and Alternate Nostril keep their
// own shapes.
//
// Settings → Breath shapes: 'original' (the circles), 'shapes' (these, breathing),
// or 'counted' (these, and the Energise pictures also count through each round:
// Kapalabhati lights a spike per pump, Wim Hof charges a segment per power breath,
// Tummo's flame grows breath by breath).
//
// Coordinates are a 100 × 100 box. The fill is drawn as a mask over the breathing
// core, so the phase text still reads as a negative inside it.

export const SHAPE_MODES = ['original', 'shapes', 'counted'];
export const VIEW = '-4 -4 108 108';

const f2 = (n) => Number(n.toFixed(2));

function wavyOut() {
  // The egg's out-breath curve, rippling for Bhramari's hum.
  const P = (t) => {
    const u = 1 - t;
    const p = [[36, 4], [96, 10], [96, 90], [36, 96]];
    return [0, 1].map(k => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
  };
  let d = 'M36,4';
  for (let i = 1; i <= 80; i++) {
    const t = i / 80;
    const [x, y] = P(t);
    const [x0, y0] = P(Math.max(0, t - 0.01));
    const l = Math.hypot(x - x0, y - y0) || 1;
    const a = Math.sin(t * Math.PI * 14) * 3 * Math.sin(t * Math.PI);
    d += ` L${f2(x + ((y - y0) / l) * a)},${f2(y - ((x - x0) / l) * a)}`;
  }
  return d;
}
const HUM_OUT = wavyOut();

function spikes(lit = 30, n = 30) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const p = (a, r) => `${f2(50 + r * Math.cos(a))},${f2(50 + r * Math.sin(a))}`;
    s += `<path d="M50,50 L${p(a0, 30)} L${p(a0 + Math.PI / n, 48)} L${p(a0 + (2 * Math.PI) / n, 30)} Z" fill-opacity="${i < lit ? 1 : 0.22}"/>`;
  }
  return `${s}<circle cx="50" cy="50" r="31"/>`;
}

function charge(lit = 30, n = 30) {
  let s = '<circle cx="50" cy="50" r="28"/>';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const xy = (r) => `${f2(50 + r * Math.cos(a))},${f2(50 + r * Math.sin(a))}`;
    const [x1, y1] = xy(36).split(','), [x2, y2] = xy(47).split(',');
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-opacity="${i < lit ? 1 : 0.2}"/>`;
  }
  return s;
}

function flame(h = 1) {
  const y = (v) => f2(98 - (98 - v) * h);
  return `<path d="M50,98 C15,${y(90)} 10,${y(55)} 35,${y(30)} C40,${y(48)} 48,${y(50)} 50,${y(40)} C52,${y(25)} 60,${y(12)} 58,${y(2)} C85,${y(25)} 95,${y(60)} 82,${y(82)} C75,${y(94)} 62,98 50,98 Z"/>`;
}

function wave(phase = 0) {
  let d = '';
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const r = 42 + 6 * Math.sin(a * 8 + phase);
    d += `${i ? 'L' : 'M'}${f2(50 + r * Math.cos(a))},${f2(50 + r * Math.sin(a))} `;
  }
  return `<path d="${d}Z"/>`;
}

const BELLOWS = 'M22,6 L78,6 L94,22 L78,38 L94,54 L78,70 L94,86 L78,96 L22,96 L6,86 L22,70 L6,54 L22,38 L6,22 Z';

// Each shape:
//   fill(state)  — the inner SVG of the fill (a mask: black shows, alpha fades)
//   track        — the outline drawn behind it (a path), if any
//   sides        — one path per phase, for the marker to ride (in phase order)
//   label        — where the phase name sits, if not the centre
//   count(snap)  — for 'counted': what to draw this moment (Energise only)
export const FORMS = {
  '478': {
    fill: () => '<path d="M4.9,74.6 L4,22 L96,22 Z"/>',
    track: 'M4.9,74.6 L4,22 L96,22 Z',
    sides: ['M4.9,74.6 L4,22', 'M4,22 L96,22', 'M96,22 L4.9,74.6'],
    label: [30, 40],
  },
  sigh: {
    fill: () => '<path d="M24,96 L24,42 L40,14 C92,22 92,94 24,96 Z"/>',
    track: 'M24,96 L24,42 L40,14 C92,22 92,94 24,96 Z',
    sides: ['M24,96 L24,42', 'M24,42 L40,14', 'M40,14 C92,22 92,94 24,96'],
    label: [50, 55],
  },
  egg: {
    fill: () => '<path d="M36,96 Q4,50 36,4 C96,10 96,90 36,96 Z"/>',
    track: 'M36,96 Q4,50 36,4 C96,10 96,90 36,96 Z',
    sides: ['M36,96 Q4,50 36,4', 'M36,4 C96,10 96,90 36,96'],
    label: [50, 50],
  },
  hum: {
    fill: () => `<path d="M36,96 Q4,50 ${HUM_OUT.slice(1)} Z"/>`,
    track: `M36,96 Q4,50 ${HUM_OUT.slice(1)} Z`,
    sides: ['M36,96 Q4,50 36,4', HUM_OUT],
    label: [50, 50],
  },
  pursed: {
    fill: () => '<path d="M39,96 Q11,60 29,20 Q49,0 81,8 Q69,70 39,96 Z"/>',
    track: 'M39,96 Q11,60 29,20 Q49,0 81,8 Q69,70 39,96 Z',
    sides: ['M39,96 Q11,60 29,20', 'M29,20 Q49,0 81,8 Q69,70 39,96'],
    label: [46, 50],
  },
  dotted: {
    // Buteyko: light breathing round a calm centre.
    fill: () => '<circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="2 5"/>',
  },
  spikes: {
    fill: () => spikes(),
    count: (snap) => spikes(snap.counter ? snap.rep : 30, 30),
  },
  bellows: {
    fill: () => `<path d="${BELLOWS}"/>`,
  },
  charge: {
    fill: () => charge(),
    count: (snap) => charge(snap.counter ? snap.rep : 30, 30),
  },
  flame: {
    fill: () => flame(),
    label: [50, 70],
    count: (snap) => flame(snap.counter && snap.repeat ? 0.45 + 0.55 * (snap.rep / snap.repeat) : 1),
  },
  wave: {
    fill: () => wave(),
    count: (snap) => wave(((snap.sessionElapsed ?? 0) / 1000) * 0.8),
  },
};

// Which shape each technique page takes (Home's list, history, the pickers). The
// configs name theirs as `form`; tests/forms.test.js keeps the two in step.
export const FORM_OF_PAGE = {
  '478-breathing.html': '478',
  'physiological-sigh.html': 'sigh',
  'extended-exhale.html': 'egg',
  'bhramari.html': 'hum',
  'pursed-lip-breathing.html': 'pursed',
  'buteyko.html': 'dotted',
  'kapalabhati.html': 'spikes',
  'bhastrika.html': 'bellows',
  'wim-hof.html': 'charge',
  'tummo.html': 'flame',
  'connected-breathing.html': 'wave',
};

// Pure: the mask image for a shape, as a CSS url().
export function formMask(inner) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${VIEW}' preserveAspectRatio='none'>${inner.replace(/"/g, "'")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Pure: a shape's key for this config and mode, or null for the original look.
export function activeForm(cfg, mode) {
  if (mode === 'original' || !cfg.form || !FORMS[cfg.form]) return null;
  return cfg.form;
}

// Pure: the components a field mounts with a shape on. The new shape replaces the
// outline, ring, glow and the straight-line marker; 'form' (outline and mask) goes
// just before the core, and 'formMarker' (where there are sides to ride) just after.
export function formComponents(components, key) {
  if (!key) return components;
  const keep = components.filter(n => !['ring', 'track', 'outline', 'glow', 'dot'].includes(n));
  let at = keep.indexOf('core');
  if (at < 0) { keep.push('core'); at = keep.length - 1; }
  keep.splice(at, 0, 'form');
  if (FORMS[key].sides) keep.splice(at + 2, 0, 'formMarker');
  return keep;
}

// Pure: a config with its shape applied for this mode (Settings → Breath shapes).
export function withForm(cfg, mode) {
  const key = activeForm(cfg, mode);
  if (!key) return { ...cfg, formKey: null, formMode: 'original' };
  return { ...cfg, formKey: key, formMode: mode, components: formComponents(cfg.components, key) };
}

// ---- Paths as points, for the marker (no DOM needed) ----

// Pure: an SVG path of M, L, Q and C commands (absolute) as a list of points.
export function pathPoints(d, steps = 20) {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+/gi);
  const pts = [];
  let i = 0, cmd = null, cur = [0, 0];
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLQCZ]/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === 'Z') { if (pts.length) pts.push(pts[0]); continue; }
    if (cmd === 'M' || cmd === 'L') { cur = [num(), num()]; pts.push(cur); continue; }
    if (cmd === 'Q') {
      const c = [num(), num()], e = [num(), num()], s = cur;
      for (let k = 1; k <= steps; k++) { const t = k / steps, u = 1 - t; pts.push([u * u * s[0] + 2 * u * t * c[0] + t * t * e[0], u * u * s[1] + 2 * u * t * c[1] + t * t * e[1]]); }
      cur = e; continue;
    }
    if (cmd === 'C') {
      const c1 = [num(), num()], c2 = [num(), num()], e = [num(), num()], s = cur;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps, u = 1 - t;
        pts.push([0, 1].map(j => u * u * u * s[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * e[j]));
      }
      cur = e; continue;
    }
    i++; // unknown token: skip
  }
  return pts;
}

// Pure: the point a fraction t (0–1) of the way along a list of points.
export function pointAlong(pts, t) {
  if (pts.length < 2) return pts[0] ?? [50, 50];
  const lens = [];
  let total = 0;
  for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); lens.push(l); total += l; }
  let left = Math.min(1, Math.max(0, t)) * total;
  for (let k = 0; k < lens.length; k++) {
    if (left <= lens[k] || k === lens.length - 1) {
      const f = lens[k] ? Math.min(1, left / lens[k]) : 0;
      return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
    }
    left -= lens[k];
  }
  return pts.at(-1);
}

// Pure: a point in shape units as a percentage of the field.
export const toPercent = (u) => ((u + 4) / 108) * 100;
