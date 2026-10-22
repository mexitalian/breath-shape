import { SHAPES } from './shapes.js';
import { normalizePace } from './pace.js';

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const DEFAULT_OPACITY = { min: 0.35, max: 0.9 };

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

  const hasRipple = steps.some(s => s.phases.some(p => p.ripple));
  const components = (cfg.components ?? preset.components).filter(name =>
    (name !== 'particles' || cfg.particles) &&
    (name !== 'ripple' || hasRipple)
  );

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
    startScreen: cfg.startScreen ?? false,
    safety: cfg.safety ?? false,
    pace: normalizePace(cfg.pace, steps),
    sessionMinutes: cfg.sessionMinutes ?? null,
    sequence: {
      rounds: source.rounds ?? Infinity,
      steps,
      initialScale: cfg.initialScale ?? minScale,
    },
    minScale,
    maxScale,
  };
}
