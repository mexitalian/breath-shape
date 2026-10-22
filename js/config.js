import { SHAPES } from './shapes.js';
import { normalizePace } from './pace.js';

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const DEFAULT_OPACITY = { min: 0.35, max: 0.9 };
const SIDES = ['left', 'right', 'both'];
const LAYOUTS = ['single', 'split'];
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
    side: checkSide(p),
  };
}

function checkSide(p) {
  if (p.side == null) return null;
  if (!SIDES.includes(p.side)) throw new Error(`Phase "${p.name}" has unknown side "${p.side}"`);
  return p.side;
}

function sourceOf(cfg) {
  return cfg.sequence ?? { rounds: Infinity, steps: [{ phases: cfg.phases }] };
}

function buildSequence(source, steps, initialScale) {
  return { rounds: source.rounds ?? Infinity, steps, initialScale };
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
// `variants: [{ label, phases | sequence }]` offers alternatives on the start screen;
// the first is the default.
export function normalize(cfg) {
  const variantSources = cfg.variants?.map(v => ({ label: v.label, source: sourceOf(v) }))
    ?? [{ label: null, source: sourceOf(cfg) }];
  const variantSteps = variantSources.map(v => v.source.steps.map(normalizeStep));
  const steps = variantSteps[0];
  const allSteps = variantSteps.flat();
  const scales = allSteps.flatMap(s => s.phases.map(p => p.scale));
  const minScale = Math.min(...scales);
  const maxScale = Math.max(...scales);
  const initialScale = cfg.initialScale ?? minScale;
  const variantSequences = variantSources.map((v, i) => buildSequence(v.source, variantSteps[i], initialScale));

  const layout = cfg.layout ?? 'single';
  if (!LAYOUTS.includes(layout)) throw new Error(`Unknown layout "${layout}"`);

  const shape = cfg.shape ?? 'circle';
  const preset = SHAPES[shape];
  if (!preset) throw new Error(`Unknown shape "${shape}"`);

  // Components driven by a phase flag are only mounted when some phase uses that flag.
  const anyPhase = (flag) => allSteps.some(s => s.phases.some(p => p[flag]));
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
    coreClip: preset.clipCore ? `polygon(${preset.path.map(([x, y]) => `${x}% ${y}%`).join(', ')})` : null,
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
    summaryNote: cfg.summaryNote ?? null,
    layout,
    split: layout === 'split' ? { hueOffset: cfg.split?.hueOffset ?? 20, labels: cfg.split?.labels ?? ['Left', 'Right'] } : null,
    sequence: variantSequences[0],
    variants: cfg.variants
      ? variantSources.map((v, i) => ({ label: v.label, sequence: variantSequences[i] }))
      : null,
    minScale,
    maxScale,
  };
}
