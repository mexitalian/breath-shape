# Breathing Animations

Guided breathing animations built on one shared engine and design system. Each technique is a small config file; the engine handles timing, visuals, counters, screens, vibration and the colour drag control.

Live at **https://mexitalian.github.io/breathing-animations/** (served by GitHub Pages from `main`). The [style guide](https://mexitalian.github.io/breathing-animations/styleguide.html) shows every token and component.

## Techniques

| Page | Pattern |
|---|---|
| `box-breathing.html` | in 4 · hold 4 · out 4 · hold 4 |
| `resonance-breathing.html` | equal in and out, adjustable 4.5–6.5 breaths/min (default 5) |
| `478-breathing.html` | in 4 · hold 7 · out 8 |
| `physiological-sigh.html` | in 2 · sip 1 · out 5 |

## Running locally

The pages use JavaScript modules, so they need to be served over http (opening the file directly won't work):

```sh
npm run serve      # then open the printed URL
npm test           # timeline and config tests (Node 20+, no dependencies)
```

## Structure

```
css/
  tokens.css          design tokens: primitives → semantic roles → component tokens
  base.css            reset, page defaults, shared text styles
  components/*.css    one file per component or pattern
  system.css          entry point every page links
js/
  engine.js           start(config) — wires everything together
  timeline.js         pure phase clock: rounds, counted breaths, open-ended holds, session timer
  config.js           validates and normalises configs
  shapes.js           shape presets (default components, dot path)
  easing.js           CSS-equivalent easing curves
  components/         field parts: ring, track, glow, core, particles, dot, ripple
  ui/                 stage layout, labels, screen pattern
  controls/           hue drag (and tap), vibration
configs/*.js          one config per technique
*.html                thin wrappers: load a config, call start()
```

### How the pieces fit

- **Tokens** live only in `css/tokens.css`. Components use semantic roles (`--color-accent`, `--color-line`, …), never raw values. `--hue` is the one value a technique sets; any element with `data-hue` gets its own colour scope.
- **Shapes** are token presets: `.field[data-shape="box"]` overrides `--core-size`, `--core-radius`, `--field-radius`.
- **State is CSS variables.** Each frame the engine writes `--breath-scale` and `--breath-glow` onto the field (plus `--dot-x`/`--dot-y`, `--ripple-scale`/`--ripple-opacity`); CSS does the drawing.
- **Components** are functions `({ field, cfg }) => ({ update(snapshot) })`, mounted in the order listed. Add one by writing it in `js/components/`, registering it in `components/index.js`, and adding its CSS file.

## Config reference

```js
export default {
  title: 'Box Breathing',
  rate: 'in 4 · hold 4 · out 4 · hold 4',   // shown in the eyebrow
  hint: 'Follow the dot around the square.',

  hue: 185,                    // 0–359
  shape: 'circle',             // 'circle' | 'box'
  components: [...],           // optional; defaults come from the shape
  opacity: { min, max },       // glow opacity at smallest / largest breath
  particles: { count: 26, radii: { inner: 0.2, outer: 0.92 } },  // optional

  id: 'box-breathing',         // optional; defaults to a slug of the title
  safety: false,               // true, or { extra: ['…'] }: warning screen before anything starts
  pace: { min: 4.5, max: 6.5, step: 0.5, default: 5 },  // optional − / + control in breaths/min;
                               // scales every timed phase, changes apply from the next breath
  startScreen: false,          // show a Start screen first
  sessionMinutes: null,        // end after this long (at the end of a breath)
  vibration: true,             // show the "Enable vibration" button

  // Either a simple loop…
  phases: [ PHASE, ... ],

  // …or a sequence with counted breaths, holds and rounds.
  sequence: {
    rounds: 3,                 // default: Infinity
    steps: [
      { repeat: 30, counter: 'Breath', phases: [ PHASE, PHASE ] },
      PHASE,                   // a single phase is a step too
    ],
  },
};

// PHASE
{
  name: 'Inhale',
  dur: 4,                      // seconds, or null = hold until tap / Space / button
  scale: 1.0,                  // core size at the end of the phase
  easing: 'ease-in-out',       // linear | ease | ease-in | ease-out | ease-in-out
  vibrate: [120],              // vibration pattern when the phase starts
  particles: { from: 'outer', to: 'inner' },  // radii names; omit to hide
  ripple: true,                // expanding ring during this phase
  record: 'Retention',         // record this phase's duration for the summary
  action: 'Breathe',           // button label on open-ended holds
  prompt: 'Tap when you need to breathe.',    // replaces the hint during this phase
}
```

## Adding a technique

1. Add `configs/<name>.js` (see the reference above).
2. Copy one of the HTML wrappers and point its import at the new config.
3. Add a row for it to `index.html`.

## License

© 2026 mexitalian. All rights reserved. See [LICENSE](LICENSE). The source is visible so the pages can be hosted; no rights to use or copy the code are granted.
