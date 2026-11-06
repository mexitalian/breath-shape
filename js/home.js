import { el } from './dom.js';
import { icon } from './ui/icons.js';
import { readResume, clearResume, resumeSummary } from './resume.js';
import { initPickers } from './pickers/index.js';

// Technique list: group filter chips, and the filter + scroll position remembered
// for this visit so coming back from a practice page lands where you left off.
const KEY = 'breathing:home';

function defaultStorage() {
  try { return window.sessionStorage; } catch { return null; }
}

export function readHomeState(storage = defaultStorage()) {
  try {
    const state = JSON.parse(storage?.getItem(KEY) ?? 'null');
    return {
      filter: typeof state?.filter === 'string' ? state.filter : 'all',
      scrollY: Number.isFinite(state?.scrollY) ? state.scrollY : 0,
    };
  } catch {
    return { filter: 'all', scrollY: 0 };
  }
}

export function saveHomeState(state, storage = defaultStorage()) {
  try { storage?.setItem(KEY, JSON.stringify(state)); } catch { /* best-effort */ }
}

// "Jump back in" (#117): the session you left, at the top of Home, one tap to carry on.
export function showResumeCard(before, rec = readResume()) {
  if (!rec) return null;
  const card = el('div', 'resume');
  const link = el('a', 'resume__link', { href: `${rec.page}?resume=1` });
  link.dataset.hue = '';
  link.style.setProperty('--hue', String(rec.hue));
  const text = el('div', 'resume__text');
  text.append(
    el('span', 'resume__eyebrow', { textContent: 'Jump back in' }),
    el('strong', 'resume__title', { textContent: rec.title }),
    el('span', 'resume__meta', { textContent: resumeSummary(rec) }),
  );
  link.append(el('span', 'resume__dot'), text, el('span', 'resume__arrow', { textContent: '→' }));
  link.querySelector('.resume__arrow').setAttribute('aria-hidden', 'true');
  const close = el('button', 'icon-button resume__close', { type: 'button' });
  close.setAttribute('aria-label', 'Dismiss');
  close.append(icon('close'));
  close.addEventListener('click', () => { clearResume(); card.remove(); });
  card.append(link, close);
  before.before(card);
  return card;
}

export function initHome() {
  const nav = document.querySelector('.group-nav');
  showResumeCard(nav);
  // Settings → Choose a breath (#151): a different way in, above the list.
  initPickers({ before: nav });
  const chips = [...nav.querySelectorAll('[data-filter]')];
  const groups = [...document.querySelectorAll('[data-group]')];
  let filter = 'all';

  function apply(next) {
    filter = chips.some(c => c.dataset.filter === next) ? next : 'all';
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));
    for (const group of groups) group.hidden = filter !== 'all' && group.dataset.group !== filter;
  }

  const save = () => saveHomeState({ filter, scrollY: window.scrollY });

  // Where the chips sit before they stick: just below the header.
  function stuckAt() {
    const above = nav.previousElementSibling.getBoundingClientRect().bottom + window.scrollY;
    const gap = parseFloat(getComputedStyle(nav.parentElement).rowGap) || 0;
    const margin = parseFloat(getComputedStyle(nav).marginTop) || 0;
    return above + gap + margin;
  }
  // Give the chips a solid backdrop only once they're stuck over the list.
  const markStuck = () => nav.toggleAttribute('data-stuck', window.scrollY > stuckAt());

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      // Keep the chips where they are if they're stuck to the top, so the list
      // starts right under them instead of jumping past the new results.
      const top = stuckAt();
      const wasStuck = window.scrollY > top;
      apply(chip.dataset.filter);
      if (wasStuck) window.scrollTo({ top, behavior: 'instant' });
      markStuck();
      save();
    });
  }

  window.addEventListener('scroll', markStuck, { passive: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const saved = readHomeState();
  apply(saved.filter);
  window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
  markStuck();

  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  document.addEventListener('click', (event) => { if (event.target.closest('a[href]')) save(); });
}
