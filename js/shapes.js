// Shape presets: which components a field uses by default, and the path a dot traces.
// Sizes and radii for each shape live in css/components/field.css under [data-shape].
export const SHAPES = {
  circle: {
    components: ['ring', 'ripple', 'glow', 'hum', 'heat', 'particles', 'core'],
  },
  box: {
    components: ['track', 'glow', 'particles', 'core', 'dot'],
    // Corners in percent of the field, one side per phase: TL → BL → BR → TR.
    path: [[0, 0], [0, 100], [100, 100], [100, 0]],
  },
  triangle: {
    components: ['outline', 'glow', 'particles', 'core', 'dot'],
    // The filled shape is clipped to the outline instead of being a rounded box.
    clipCore: true,
    // Point-up equilateral triangle, as wide as the field: rise up the left
    // side to the peak, come down the right side, return along the base.
    path: [[0, 93.3], [50, 6.7], [100, 93.3]],
  },
};
