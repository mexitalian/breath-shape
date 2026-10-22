import { el } from '../dom.js';

let screenId = 0;

// Pattern: full-page screen over the stage. Used for start and summary screens,
// and meant for the safety screen and any other interstitial.
// actions: [{ label, primary?, onClick? , href? }]
// list:    [[label, value], ...]
export function showScreen(mount, { eyebrow, title, body, list, actions = [] }) {
  const id = `screen-title-${++screenId}`;
  const screen = el('div', 'screen');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', id);

  const panel = el('div', 'screen__panel');
  if (eyebrow) panel.append(el('div', 'eyebrow', { textContent: eyebrow }));
  panel.append(el('h1', 'screen__title', { id, textContent: title }));
  if (body) panel.append(el('p', 'screen__body', { textContent: body }));

  if (list?.length) {
    const ul = el('ul', 'screen__list');
    for (const [label, value] of list) {
      const li = el('li');
      li.append(el('span', '', { textContent: label }), el('span', '', { textContent: value }));
      ul.append(li);
    }
    panel.append(ul);
  }

  if (actions.length) {
    const row = el('div', 'screen__actions');
    for (const action of actions) {
      const variant = action.primary ? 'button--primary' : 'button--ghost';
      const node = action.href
        ? el('a', `button ${variant}`, { href: action.href, textContent: action.label })
        : el('button', `button ${variant}`, { type: 'button', textContent: action.label });
      if (action.onClick) node.addEventListener('click', action.onClick);
      row.append(node);
    }
    panel.append(row);
  }

  screen.append(panel);
  mount.append(screen);
  panel.querySelector('.button')?.focus();

  return { close: () => screen.remove() };
}
