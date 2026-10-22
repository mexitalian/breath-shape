# Breathing Animations

Guided breathing animations built on one shared engine. Each technique is a small config file; the engine handles the phase timer, the breathing core, particles, vibration cues and the hue drag control.

## Techniques

| Page | Pattern |
|---|---|
| `box-breathing.html` | in 4 · hold 4 · out 4 · hold 4 |
| `resonance-breathing.html` | in 6 · out 6 (5 breaths/min) |
| `478-breathing.html` | in 4 · hold 7 · out 8 |
| `physiological-sigh.html` | in 2 · sip 1 · out 5 |

Open any page directly in a browser; there's no build step. Drag anywhere on the screen to change the colour.

## Layout

- `engine.js` — phase timer, generated CSS keyframes, particle noise system, vibration, hue drag
- `styles.css` — token system (`--hue` is the only per-page colour override) and component styles
- `configs/*.js` — one config object per technique
- `*.html` — wrappers that load a config, then the engine

## Adding a technique

1. Copy a file in `configs/` and set its phases (`name`, `dur` in seconds, `scale`), `hue`, and particle radii.
2. Copy one of the HTML pages and point its first `<script>` at the new config.
