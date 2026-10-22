import { el } from '../dom.js';
import { createLabels } from './labels.js';
import { icon } from './icons.js';

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
// top bar → field (or split halves) → cycle counter → labels → hint → controls
export function buildStage(cfg, mount) {
  const stage = el('div', 'stage');

  // Top bar: back to the list · technique name · icon toggles
  const topbar = el('header', 'topbar');
  const back = el('a', 'icon-button topbar__back', { href: './' });
  back.setAttribute('aria-label', 'All techniques');
  back.title = 'All techniques';
  back.append(icon('back'));
  const heading = el('div', 'topbar__heading');
  const title = el('h1', 'topbar__title', { textContent: cfg.title });
  heading.append(title);
  const actions = el('div', 'topbar__actions');
  topbar.append(back, heading, actions);

  const toast = el('div', 'toast');
  toast.setAttribute('role', 'status');
  let toastTimer = 0;

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

  const cycles = el('div', 'stage__cycles');
  const labels = createLabels();
  const hint = el('div', 'hint', { textContent: cfg.hint });
  const controls = el('div', 'stage__controls');

  stage.append(topbar, toast, visual, cycles, labels.root, hint, controls);
  mount.append(stage);

  return {
    stage,
    sides,
    cycles,
    labels,
    controls,
    actions,
    notify(text) {
      toast.textContent = text;
      toast.dataset.visible = '';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { delete toast.dataset.visible; }, 2500);
    },
    setHint(text) {
      if (hint.textContent !== text) hint.textContent = text;
    },
  };
}
