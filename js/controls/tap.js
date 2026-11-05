// Tap anywhere to continue a hold (tap-to-continue phases). A press that moves past
// DRAG_THRESHOLD is a drag or a scroll, not a tap, and does nothing here.
// While `paused()` is true (Fluid shapes on: the liquid takes the touch) presses are
// ignored; holds then end with their on-screen button.
// Dragging to change the colour was retired in #130 (docs/DECISIONS.md).
const DRAG_THRESHOLD = 6;

export function initTapControl({ target = document, onTap, paused = () => false } = {}) {
  let start = null;
  let moved = false;

  const ignored = (e) => e.target.closest?.('button, a, input, .screen, .cycles');

  const down = (e) => {
    if (ignored(e) || paused()) return;
    start = { x: e.clientX, y: e.clientY };
    moved = false;
  };
  const move = (e) => {
    if (start && !moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) moved = true;
  };
  const up = (e) => {
    if (start && !moved) onTap?.(e);
    start = null;
  };
  const cancel = () => { start = null; };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', cancel);

  return {
    destroy() {
      target.removeEventListener('pointerdown', down);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', cancel);
    },
  };
}
