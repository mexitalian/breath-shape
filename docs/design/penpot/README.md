# Penpot reference

The app as the Android app draws it today, for rebuilding in Penpot (#107): the
home screen, Settings, and a session for each breathing shape (circle, alternate
nostril, triangle, box).
Everything here is generated from the real pages by `scripts/penpot-reference.mjs`
(see **Checking Penpot against the app** below), in headless Chromium set up to
look like the Android app (so Settings shows its Android-only rows), at Pixel 6a
size (412 × 915 CSS px), drawn at 2× so text stays sharp. The font is forced to
Roboto, which is what Android shows for the app's system font stack. Other
machines substitute their own system font (a Mac shows San Francisco, for example),
so lines wrap a little differently there.

## Files

| File | What it is |
|---|---|
| `reference/home-light.webp`, `home-dark.webp` | The first screen, light and dark |
| `reference/home-*-full.webp` | The whole scrolling page |
| `reference/home-*-filter-calm.webp` | With the **Calm & sleep** filter picked |
| `reference/home-*-settings.webp` | Settings opened from the gear (first screen) |
| `reference/home-*-settings-full.webp` | The whole Settings panel (it scrolls on the phone) |
| `reference/sessions/<shape>-<theme>-start.webp` | A session's start screen: circle (Resonance), nostril (Alternate Nostril), triangle, box |
| `reference/sessions/<shape>-<theme>-session.webp` | The same session a few seconds in |
| `reference/sessions/<box\|triangle>-<theme>-fill-in.webp`, `-fill-hold.webp` | The Fill layout with the closure shapes (#148), 3 min picked: breathing in, and the marker in the corner as the hold begins. Taken with reduced motion, so the liquid is flat and has no bubbles |
| `reference/nav/*.webp` | Dark, Android: one per screen on the Navigation map and the Prototype. `home.webp` and `home-full.webp` show the Jump back in card, `session.webp` the length chip, `settings.webp` the close button, `heart-rate.webp` the Back to the technique button, `entrainment.webp` the Entrainment lab |
| `app-text.json` | Every string the app shows, per screen (dark, Android), for checking the words on the boards |
| `tokens.json` | Every design token, resolved per theme: the home hue and the four purpose hues (calm 240, focus 145, energise 30, measure 330; docs/COLOURS.md) |
| `palette.json` | The Penpot `palette` token set: every colour role for each technique's hue (docs/COLOURS.md), light and dark, as hex with alpha. Penpot's palette is refreshed from it when hues change |
| `tokens-core.penpot.json` | The Penpot file's core token set (space, radius, size, type, opacity, shadows), as a baseline for the round trip |
| `home-light-layout.json` | Every visible element on the light home page: tag, class, text, box (CSS px, page coordinates) and resolved style |

The images are 824 px wide (2×). In Penpot, place them at **412 px wide** on a
412 × 915 board (or 412 × page height for the full page).

## How Penpot maps to the code

Units: 1rem = 16 px. Sizes in `tokens.json` are in rem; multiply by 16.

**Colours follow a hue.** Every page sets one hue (home is 220, each technique has
its own). The roles below are formulas of that
hue, not fixed colours. In Penpot, make one colour library for the home hue in each
theme. Name colours after the roles so changes map back to the code:

| Role (CSS token) | Light | Dark | Used for |
|---|---|---|---|
| `color-bg` | `#f1f4f8` | `#0c1018` | Page background |
| `color-bg-raised` | `#fcfcfd` | `#151c28` | Panels |
| `color-ink` | `#1d222a` | `#e1e4ea` | Main text |
| `color-dim` | `#515867` | `#8790a1` | Secondary text, labels, icons |
| `color-line` | `#4d5566` 18% | `#858fa3` 18% | Hairlines, chip borders |
| `color-accent` | `#2a4d92` | `#88a4dc` | Selected chip, primary button, links |
| `color-on-accent` | `#f8f9fc` | `#06090e` | Text on the accent |
| `color-accent-fill` | `#809eda` | `#7092d5` | The breathing shape's fill |

Alpha variants of the accent (`hover` 7%, `faint` 10%, `soft` 20%, `edge` 35%,
`strong` 60%) are in `tokens.json`. Each technique row on the home page shows its
own hue: its orb, pattern line and text tint. Those colours are listed per hue in
`tokens.json`.

**Type** (Roboto):

| Style | Size / weight / tracking | Where |
|---|---|---|
| Eyebrow | 11.5 px / 500 / 0.28em, uppercase | "BREATH SHAPE", group titles |
| Title | 32 px / 300 / −0.01em, line 1.1 | "Pick a pace and follow the light." |
| Lede | 15.2 px / 400, line 1.6 | Intro paragraph |
| Chip | 11.2 px / 500 / 0.07em, uppercase | Filters, settings options |
| Technique name | 16.8 px / 500 | Row title |
| Pattern | 12.8 px / 400 / 0.02em, technique hue | "in 4 · hold 7 · out 8" |
| Use line | 12.8 px / 400, line 1.5 | Row description |
| Button | 13.6 px / 600 / 0.02em | "Your history", "Done" |

**Spacing** 3.2 · 4.8 · 6.4 · 11.2 · 16 · 24 · 35.2 · 48 · 72 px (`space-3xs` to
`space-3xl`). **Radii** 5 · 14 · 18 · 22 px, pill, circle. Page side margin 16 px.

**Components** (Components page): chip (resting, pressed; the Home filter pills are
chips with their purpose colour), icon buttons (Back, Settings, Close; 44 px),
technique row (orb 52 px, text column from x 90, arrow at the right; hairline
between rows), group header, safety chip, ghost button, button, slider, top bar,
shape label, cycle counter, pace control, length chip (under the cycle counter in a
session) and Jump back in (the card on Home after you leave a session).

**Motion that won't show in Penpot:** the orbs pulse at each technique's breathing
pace, and the filter bar sticks to the top on scroll. Describe changes to these in
words on the ticket.

## Design tokens (#112)

The Penpot file holds design tokens named after `css/tokens.css`: `space.md` is
`--space-md`, `color.accent` is `--color-accent`, `size.orb` is `--orb-size`.
Penpot works in px; the CSS mostly in rem (16 px = 1 rem).

- **Sets:** `core` (space, radius, size, border, opacity, type, shadows), `palette`
  (every colour role for each hue, light and dark), `technique/<page>` (which hue is
  current), `mode/light` and `mode/dark` (the `color.*` roles, each technique's row
  colours, and the surfaces: page, raised, overlay).
- **Themes** (Tokens panel, top): **Mode** switches Light and Dark, **Technique**
  switches the hue. Both apply to the whole file.
- **Colours go one way, code to Penpot.** The CSS works each colour out from the
  page's hue, which Penpot can't express, so Penpot holds the results. Change colours
  in the CSS formula.
- **Everything else goes both ways.** Export the tokens from Penpot (Tokens panel,
  export as a single JSON file), then:

  ```bash
  node scripts/penpot-tokens.mjs check penpot-tokens.json          # list differences
  node scripts/penpot-tokens.mjs check penpot-tokens.json --write  # update tokens.css
  ```

## Checking Penpot against the app

Run this after any change to what the app shows, then compare the Penpot boards with
the new screenshots:

```bash
node scripts/penpot-reference.mjs                # everything (about 4 minutes)
node scripts/penpot-reference.mjs home nav       # only some: home, sessions, fill, nav, text, tokens
```

It serves the repo itself, fakes Capacitor as Android, forces Roboto (fetched once
with `npm pack @fontsource/roboto`, or pass `--fonts <dir>`) and writes the WebP
images, `app-text.json` and `tokens.json`. `git diff --stat` shows which screens
changed. Then, in a Claude session with the Penpot MCP plugin connected, ask for a
fidelity check: it compares each board with its screenshot and the words with
`app-text.json`, points every board's hidden Reference layer, the Navigation map and
the Prototype at the new images (Penpot fetches them from the pushed branch on
GitHub), and fixes what drifted. `node scripts/penpot-tokens.mjs check` covers the
tokens. Gaps Penpot can't show are listed on its Read me page.

## Bringing changes back

Edit in Penpot, then either:
- in a Claude session with the Penpot MCP plugin connected, ask for the
  changed boards to be read and turned into a ticket and PR; or
- export the changed boards as PNG and attach them to a ticket, with exact values
  where they matter.
