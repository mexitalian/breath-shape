// Shape presets: which components a field uses by default, and the path a dot traces.
// Sizes and radii for each shape live in css/components/field.css under [data-shape].
export const SHAPES = {
  circle: {
    components: ['ring', 'ripple', 'glow', 'hum', 'heat', 'particles', 'core'],
  },
  box: {
    components: ['track', 'glow', 'particles', 'core', 'dot'],
    // Corners in percent of the field, one side per phase, clockwise like the
    // triangle: in up the left side, hold across the top, out down the right side,
    // hold along the bottom. BL → TL → TR → BR.
    path: [[0, 100], [0, 0], [100, 0], [100, 100]],
  },
  triangle: {
    components: ['outline', 'glow', 'particles', 'core', 'dot'],
    // The filled shape is clipped to the outline instead of being a rounded box.
    clipCore: true,
    // Point-down equilateral triangle, as wide as the field: rise up the left
    // side, run flat across the top, fall back to the point.
    path: [[50, 93.3], [0, 6.7], [100, 6.7]],
  },
};
