# breath-shape

## Workflow

- Every change reaches `main` through a pull request, never a direct push, so the work is trackable on GitHub. Work on a branch, open a PR that links its issues (`Closes #n`), then merge the PR.
- Merge with a merge commit (not squash) so the individual commits stay visible.
- Stacked PRs: merge top-down into the bottom PR's branch, then merge the bottom PR into `main` once, so a stack triggers a single `main` build. Close the upper PRs' issues by hand ("Closes #n" only fires on merges into `main`).
- Every push to `main` builds the Android APK ("Latest app build" release) and the Mac `.dmg` ("Latest Mac build" release); avoid needless merges to `main`. The repo is public, so GitHub Actions minutes are free, macOS runners included.
- `main` is served live by GitHub Pages; merging a PR deploys it.

## Commands

```sh
npm test         # timeline/config tests, no dependencies
npm run serve    # local server; pages use ES modules so file:// won't work
```

## Design system rules

- Raw colours, sizes, durations and fonts live only in `css/tokens.css`. Components use semantic tokens (`--color-*`, `--space-*`, `--text-*`, …).
- `--hue` is the only value a technique sets. Elements with `data-hue` get their own colour scope.
- The engine writes state as CSS variables (`--breath-scale`, `--breath-glow`, …); styling stays in CSS, never in JS.
- New visuals go in as components (`js/components/` + `css/components/`), new layouts and screens as patterns (`js/ui/`).
- When adding a technique, also add it to `index.html` and the README table.

## Penpot

General Penpot know-how comes from the `penpot` plugin (https://github.com/mexitalian/claude-code-plugins), enabled in `.claude/settings.json`. This section holds the facts for this project only; they win over the plugin.

- File: https://design.penpot.app/?screen=workspace&team-id=c0ee57fd-603e-804a-8004-c5c99cdbf066&file-id=08b470c5-dda4-812a-8008-e56215f33260
- Pages: Library, Components, Home, Settings, Breathing shapes, Read me, Navigation map, Task flows, Prototype – as built.
- Match the Android app as it renders on the owner's Pixel 6a (412 × 915, Roboto), not the website. Show designs in Dark; Light is the Mode theme toggle.
- Token names mirror `css/tokens.css` (`space.md` ↔ `--space-md`). Colours are computed from `--hue`, so they flow code → Penpot only.
- Reference screenshots live in `docs/design/penpot/reference/`, described in `docs/design/penpot/README.md`.
- `node scripts/penpot-tokens.mjs check <export.json> [--write]` compares a Penpot token export with the CSS.
- `node scripts/nav-map.mjs --write` regenerates `docs/NAVIGATION.md`. Draw the Navigation map, Task flows and Prototype pages from it, and update them when navigation changes.
- "Pen pal" or "pen pod" in a dictated message means Penpot.

## Talking to the owner

- Always give links as full, clickable `https://` URLs (Markdown links), never bare paths like `github.com/...`. The owner often reads on a phone.
