# breathing-animations

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

## Talking to the owner

- Always give links as full, clickable `https://` URLs (Markdown links), never bare paths like `github.com/...`. The owner often reads on a phone.
