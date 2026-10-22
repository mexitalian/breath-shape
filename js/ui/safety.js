// Safety screen content and "don't show again" memory for intense techniques.

export const SAFETY_POINTS = [
  'Sit or lie down somewhere safe before you begin.',
  'Never practise in or near water, while driving, or while standing.',
  'Skip it if you are pregnant, or have epilepsy, heart problems, high blood pressure or a history of fainting.',
  'Tingling and light-headedness can happen. If you feel unwell, stop and breathe normally.',
];

export function safetyPoints(safety) {
  const extra = typeof safety === 'object' && Array.isArray(safety.extra) ? safety.extra : [];
  return [...SAFETY_POINTS, ...extra];
}

export const safetyKey = (id) => `breathing:safety-ack:${id}`;

// Storage can be missing or throw (private mode, blocked site data); treat that as "not acknowledged".
export function hasAcknowledged(storage, id) {
  try {
    return storage?.getItem(safetyKey(id)) === '1';
  } catch {
    return false;
  }
}

export function rememberAcknowledged(storage, id) {
  try {
    storage?.setItem(safetyKey(id), '1');
    return true;
  } catch {
    return false;
  }
}
