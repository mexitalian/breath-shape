import { el } from '../dom.js';
import { createLabels } from './labels.js';

// Pattern: single-field practice layout.
// eyebrow → field → labels → hint → controls
export function buildStage(cfg, mount) {
  const stage = el('div', 'stage');

  const eyebrow = el('div', 'eyebrow', { textContent: cfg.eyebrow });
  if (cfg.rate) eyebrow.append(' · ', el('span', 'rate', { textContent: cfg.rate }));

  const field = el('div', 'field');
  field.dataset.shape = cfg.shape;

  const labels = createLabels();
  const hint = el('div', 'hint', { textContent: cfg.hint });
  const controls = el('div', 'stage__controls');

  stage.append(eyebrow, field, labels.root, hint, controls);
  mount.append(stage);

  return {
    stage,
    field,
    labels,
    controls,
    setHint(text) {
      if (hint.textContent !== text) hint.textContent = text;
    },
  };
}
