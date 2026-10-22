# breathing-animations

## Workflow

- Every change reaches `main` through a pull request, never a direct push, so the work is trackable on GitHub. Work on a branch, open a PR that links its issues (`Closes #n`), then merge the PR.
- Merge with a merge commit (not squash) so the individual commits stay visible.
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
