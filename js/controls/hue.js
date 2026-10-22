// Drag anywhere to set --hue from the angle around the screen centre.
// A press that doesn't move past DRAG_THRESHOLD counts as a tap instead.
const DRAG_THRESHOLD = 6;

export function initHueControl({ target = document, root = document.documentElement, onTap } = {}) {
  let start = null;
  let dragging = false;

  const ignored = (e) => e.target.closest?.('button, a, .screen');

  const apply = (x, y) => {
    const angle = Math.atan2(y - window.innerHeight / 2, x - window.innerWidth / 2);
    root.style.setProperty('--hue', (((angle * 180) / Math.PI + 360) % 360).toFixed(1));
  };

  const down = (e) => {
    if (ignored(e)) return;
    start = { x: e.clientX, y: e.clientY };
    dragging = false;
  };

  const move = (e) => {
    if (!start) return;
    if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) dragging = true;
    if (dragging) apply(e.clientX, e.clientY);
  };

  const up = (e) => {
    if (start && !dragging) onTap?.(e);
    start = null;
    dragging = false;
  };

  const cancel = () => {
    start = null;
    dragging = false;
  };

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
