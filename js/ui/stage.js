import { el } from '../dom.js';
import { createLabels } from './labels.js';

function createField(cfg) {
  const field = el('div', 'field');
  field.dataset.shape = cfg.shape;
  return field;
}

// Pattern: split layout — two halves side by side, each with its own field and
// colour scope (--hue-offset), e.g. one half per nostril.
function buildSplit(cfg) {
  const split = el('div', 'split');
  const sides = ['left', 'right'].map((side, i) => {
    const half = el('div', 'split__half');
    half.dataset.side = side;
    half.dataset.hue = '';
    half.style.setProperty('--hue-offset', String(i === 0 ? -cfg.split.hueOffset : cfg.split.hueOffset));
    const field = createField(cfg);
    const caption = el('div', 'split__caption', { textContent: cfg.split.labels[i] });
    half.append(field, caption);
    split.append(half);
    return { side, half, field };
  });
  return { root: split, sides };
}

// Pattern: practice layout.
// eyebrow → field (or split halves) → labels → hint → controls
export function buildStage(cfg, mount) {
  const stage = el('div', 'stage');

  const eyebrow = el('div', 'eyebrow', { textContent: cfg.eyebrow });
  const rate = el('span', 'rate', { textContent: cfg.rate });
  if (cfg.rate || cfg.pace) eyebrow.append(' · ', rate);

  let visual;
  let sides;
  if (cfg.layout === 'split') {
    const split = buildSplit(cfg);
    visual = split.root;
    sides = split.sides;
  } else {
    visual = createField(cfg);
    sides = [{ side: null, half: null, field: visual }];
  }

  const labels = createLabels();
  const hint = el('div', 'hint', { textContent: cfg.hint });
  const controls = el('div', 'stage__controls');

  stage.append(eyebrow, visual, labels.root, hint, controls);
  mount.append(stage);

  return {
    stage,
    sides,
    labels,
    controls,
    setHint(text) {
      if (hint.textContent !== text) hint.textContent = text;
    },
    setRate(text) {
      rate.textContent = text;
    },
  };
}
