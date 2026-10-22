import { el } from '../dom.js';

let screenId = 0;

// Pattern: full-page screen over the stage. Used for safety, start and summary screens.
//   points:   ['plain bullet', ...]
//   list:     [[label, value], ...]
//   checkbox: { label, checked? }  — its state is passed to action handlers
//   actions:  [{ label, primary?, onClick?(state), href? }]
export function showScreen(mount, { eyebrow, title, body, points, list, checkbox, actions = [] }) {
  const id = `screen-title-${++screenId}`;
  const screen = el('div', 'screen');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', id);

  const panel = el('div', 'screen__panel');
  if (eyebrow) panel.append(el('div', 'eyebrow', { textContent: eyebrow }));
  panel.append(el('h1', 'screen__title', { id, textContent: title }));
  if (body) panel.append(el('p', 'screen__body', { textContent: body }));

  if (points?.length) {
    const ul = el('ul', 'screen__points');
    for (const point of points) ul.append(el('li', '', { textContent: point }));
    panel.append(ul);
  }

  if (list?.length) {
    const ul = el('ul', 'screen__list');
    for (const [label, value] of list) {
      const li = el('li');
      li.append(el('span', '', { textContent: label }), el('span', '', { textContent: value }));
      ul.append(li);
    }
    panel.append(ul);
  }

  let input = null;
  if (checkbox) {
    const label = el('label', 'check');
    input = el('input', 'check__input', { type: 'checkbox', checked: !!checkbox.checked });
    label.append(input, el('span', 'check__label', { textContent: checkbox.label }));
    panel.append(label);
  }

  if (actions.length) {
    const row = el('div', 'screen__actions');
    for (const action of actions) {
      const variant = action.primary ? 'button--primary' : 'button--ghost';
      const node = action.href
        ? el('a', `button ${variant}`, { href: action.href, textContent: action.label })
        : el('button', `button ${variant}`, { type: 'button', textContent: action.label });
      if (action.onClick) node.addEventListener('click', () => action.onClick({ checked: !!input?.checked }));
      row.append(node);
    }
    panel.append(row);
  }

  screen.append(panel);
  mount.append(screen);
  (panel.querySelector('.button--primary') ?? panel.querySelector('.button'))?.focus();

  return { close: () => screen.remove() };
}
