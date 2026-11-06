import { el } from '../dom.js';
import { readSettings, onSettingsChange } from '../settings.js';
import { readTechniques } from './catalogue.js';
import { createSwipePicker } from './swipe.js';
import { createQuestionsPicker } from './questions.js';
import { createSpectrumPicker } from './spectrum.js';

// Home's picker (#151): today's list, or the one chosen in Settings → Choose a breath.
// The others hide the list (css/components/pickers.css) and draw themselves above it.
// "Browse everything" shows the list for this visit, with a way back.
const PICKERS = { swipe: createSwipePicker, questions: createQuestionsPicker, spectrum: createSpectrumPicker };
const NAMES = { swipe: 'Swipe', questions: 'Questions', spectrum: 'Spectrum' };
const BROWSE = 'breathing:browse';

export function initPickers({ before }) {
  const root = document.documentElement;
  const techniques = readTechniques();
  const mount = el('section', 'picker');
  mount.setAttribute('aria-label', 'Pick a breath');
  const back = el('button', 'chip chip--link picker-back', { type: 'button' });
  before.before(mount);
  before.before(back);

  let current = null;
  let kind = null;

  const browsing = () => { try { return sessionStorage.getItem(BROWSE) === '1'; } catch { return false; } };
  const setBrowsing = (on) => {
    try { if (on) sessionStorage.setItem(BROWSE, '1'); else sessionStorage.removeItem(BROWSE); } catch { /* best-effort */ }
    root.toggleAttribute('data-browse', on);
  };

  function show(picker) {
    root.dataset.picker = picker;
    if (picker === kind) return;
    current?.destroy();
    current = null;
    kind = picker;
    if (!PICKERS[picker]) { setBrowsing(false); return; }
    back.textContent = `← Back to ${NAMES[picker]}`;
    current = PICKERS[picker](mount, techniques, {
      onBrowse: () => { setBrowsing(true); window.scrollTo({ top: 0, behavior: 'instant' }); },
    });
  }

  back.addEventListener('click', () => { setBrowsing(false); window.scrollTo({ top: 0, behavior: 'instant' }); });
  root.toggleAttribute('data-browse', browsing());
  show(readSettings().picker);
  onSettingsChange((settings) => { if (settings.picker !== kind) { setBrowsing(false); show(settings.picker); } });
}
