import { SHAPES } from './shapes.js';
import { normalizePace } from './pace.js';

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const DEFAULT_OPACITY = { min: 0.35, max: 0.9 };
const PHASE_FLAG_COMPONENTS = ['ripple', 'hum', 'heat'];

function normalizePhase(p) {
  if (typeof p.name !== 'string') throw new Error('Every phase needs a name');
  if (p.dur !== null && !(p.dur > 0)) throw new Error(`Phase "${p.name}" needs dur > 0, or dur: null for a tap-to-continue hold`);
  if (typeof p.scale !== 'number') throw new Error(`Phase "${p.name}" needs a scale`);
  return {
    name: p.name,
    dur: p.dur,
    scale: p.scale,
    easing: p.easing ?? 'ease-in-out',
    particles: p.particles ?? null,
    vibrate: p.vibrate ?? null,
    ripple: !!p.ripple,
    hum: !!p.hum,
    heat: !!p.heat,
    record: p.record ?? null,
    action: p.action ?? 'Continue',
    prompt: p.prompt ?? null,
  };
}

function normalizeStep(step) {
  if (Array.isArray(step.phases)) {
    return {
      repeat: step.repeat ?? 1,
      counter: step.counter ?? null,
      phases: step.phases.map(normalizePhase),
    };
  }
  return { repeat: 1, counter: null, phases: [normalizePhase(step)] };
}

// Accepts either `phases` (one cycle that loops forever) or
// `sequence: { rounds, steps }` (counted groups, rounds, open-ended holds).
export function normalize(cfg) {
  const source = cfg.sequence ?? { rounds: Infinity, steps: [{ phases: cfg.phases }] };
  const steps = source.steps.map(normalizeStep);
  const scales = steps.flatMap(s => s.phases.map(p => p.scale));
  const minScale = Math.min(...scales);
  const maxScale = Math.max(...scales);

  const shape = cfg.shape ?? 'circle';
  const preset = SHAPES[shape];
  if (!preset) throw new Error(`Unknown shape "${shape}"`);

  // Components driven by a phase flag are only mounted when some phase uses that flag.
  const anyPhase = (flag) => steps.some(s => s.phases.some(p => p[flag]));
  const components = (cfg.components ?? preset.components).filter((name) => {
    if (name === 'particles') return !!cfg.particles;
    if (PHASE_FLAG_COMPONENTS.includes(name)) return anyPhase(name);
    return true;
  });

  return {
    id: cfg.id ?? slug(cfg.title),
    title: cfg.title,
    eyebrow: cfg.eyebrow ?? cfg.title,
    rate: cfg.rate ?? '',
    hint: cfg.hint ?? '',
    hue: cfg.hue ?? 220,
    shape,
    path: preset.path ?? null,
    components,
    particles: cfg.particles ?? null,
    opacity: cfg.opacity ?? DEFAULT_OPACITY,
    vibration: cfg.vibration ?? true,
    sound: cfg.sound ?? null,
    startScreen: cfg.startScreen ?? false,
    safety: cfg.safety ?? false,
    pace: normalizePace(cfg.pace, steps),
    sessionMinutes: cfg.sessionMinutes ?? null,
    sessionChoices: cfg.sessionChoices ?? null,
    windDown: cfg.windDown ?? null,
    sequence: {
      rounds: source.rounds ?? Infinity,
      steps,
      initialScale: cfg.initialScale ?? minScale,
    },
    minScale,
    maxScale,
  };
}
