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
| `extended-exhale.html` | in 4 · out 8, adjustable pace (1:2 ratio kept) |
| `triangle-breathing.html` | in 4 · hold 4 · out 4 |
| `pursed-lip-breathing.html` | nose in 2 · lips out 4 |
| `bhramari.html` | in 4 · hum 8, optional hum sound |
| `bhastrika.html` | 3 rounds of 20 bellows breaths (1s in · 1s out) + 30s rest; safety screen |
| `kapalabhati.html` | 3 rounds of 30 pumps (sharp 0.3s out · passive 0.7s in) + 30s rest; safety screen |
| `wim-hof.html` | 3 rounds: 30 power breaths, empty-lung hold (tap to end, timed), 15s recovery hold; safety screen |
| `tummo.html` | 5 rounds: 20 deep breaths, full-breath hold with squeeze (tap to release, timed), 12s rest; safety screen |
| `connected-breathing.html` | holotropic-style connected breathing: 10/20/30 min, adjustable pace, 2 min wind-down; safety screen |
| `buteyko.html` | control pause (timed), 30 light breaths, control pause again; summary compares them |
| `alternate-nostril.html` | split screen, one half per nostril: in left · out right · in right · out left, holds optional |

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
  components/         field parts: ring, track, outline, glow, hum, heat, core, particles, dot, ripple
  ui/                 stage layout, labels, screen pattern
  controls/           hue drag (and tap), vibration, hum sound
configs/*.js          one config per technique
*.html                thin wrappers: load a config, call start()
```

### How the pieces fit

- **Tokens** live only in `css/tokens.css`. Components use semantic roles (`--color-accent`, `--color-line`, …), never raw values. `--hue` is the one value a technique sets; any element with `data-hue` gets its own colour scope.
- **Themes:** pages follow the phone's light/dark setting (or `data-theme="light|dark"` on `<html>`). A theme only redefines the `--tone-*` lightness values in `tokens.css`; a small `cos()` correction keeps text contrast at WCAG AA for every hue.
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
  shape: 'circle',             // 'circle' | 'box' | 'triangle'
  layout: 'single',            // or 'split': two halves, one per side (phases set side)
  split: { hueOffset: 20, labels: ['Left', 'Right'] },  // split layout options
  components: [...],           // optional; defaults come from the shape
  opacity: { min, max },       // glow opacity at smallest / largest breath
  particles: { count: 26, radii: { inner: 0.2, outer: 0.92 } },  // optional

  id: 'box-breathing',         // optional; defaults to a slug of the title
  safety: false,               // true, or { extra: ['…'] }: warning screen before anything starts
  pace: { min: 4.5, max: 6.5, step: 0.5, default: 5 },  // optional − / + control in breaths/min;
                               // scales every timed phase, changes apply from the next breath
  startScreen: false,          // show a Start screen first
  sessionMinutes: null,        // end after this long (at the end of a breath)
  sessionChoices: [10, 20, 30],// start screen offers these lengths (minutes); sessionMinutes is the default
  windDown: { minutes: 2, bpm: 8, prompt: '…' },  // with pace + session: slow down over the last minutes
  summaryNote: '…',            // text on the end screen, under the title
  vibration: true,             // show the "Enable vibration" button
  sound: { tone: 130 },        // optional "Hum sound" toggle (off by default) for hum phases

  // Either a simple loop…
  phases: [ PHASE, ... ],

  // …or variants the start screen offers (first is the default)…
  variants: [{ label: 'Without holds', phases: [...] }, { label: 'With holds', phases: [...] }],

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
                               // add cone: { angle: -90, spread: 40 } to stream one way (degrees, -90 = up)
                               // add orbit: 24 (deg/s) to circle continuously with no fade between phases
  ripple: true,                // expanding ring during this phase
  hum: true,                   // sound-wave rings + core tremor; plays the hum tone if sound is on
  heat: true,                  // warmth builds from the core's centre while the phase lasts
  record: 'Retention',         // record this phase's duration for the summary
  action: 'Breathe',           // button label on open-ended holds
  prompt: 'Tap when you need to breathe.',    // replaces the hint during this phase
  side: 'left',                // split layout: 'left' | 'right' | 'both' lights that half
}
```

## Adding a technique

1. Add `configs/<name>.js` (see the reference above).
2. Copy one of the HTML wrappers and point its import at the new config.
3. Add a row for it to `index.html`.

## License

© 2026 mexitalian. All rights reserved. See [LICENSE](LICENSE). The source is visible so the pages can be hosted; no rights to use or copy the code are granted.
