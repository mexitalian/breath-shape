// Shape presets: which components a field uses by default, and the path a dot traces.
// Sizes and radii for each shape live in css/components/field.css under [data-shape].
export const SHAPES = {
  circle: {
    components: ['ring', 'ripple', 'glow', 'particles', 'core'],
  },
  box: {
    components: ['track', 'glow', 'particles', 'core', 'dot'],
    // Corners in percent of the field, one side per phase: TL → BL → BR → TR.
    path: [[0, 0], [0, 100], [100, 100], [100, 0]],
  },
};
