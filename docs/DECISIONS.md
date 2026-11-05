# Decisions

What was decided or retired, and why, so it isn't re-added by accident or argued again without the reasons. Newest first. Each entry links the issue that holds the discussion.

To add one: a dated heading, then **Decision**, **Why**, and **Instead** (what replaces it, if anything). Reversing a decision is fine. Add a new entry that says so; don't edit the old one.

## 2026-11-05 · Retired: dragging to change the colour (#130)

**Decision:** dragging on a session no longer changes the colour. The Colour slider in Settings is gone too.

**Why:**
- It was an early experiment from when the app was a set of breathing animations. Nobody used it on purpose, and it made accidental colour changes easy.
- The new session layouts (#128) use dragging to scroll the text under the shape. One gesture can't do both.
- Colour now carries meaning. Each technique's hue says what the breathing is for (#132). A free colour picker would undo that.

**Instead:** taps still continue holds (tap-to-continue). A drag never counts as a tap. With Fluid shapes on, touch still moves the liquid.

## 2026-11-05 · The breathing shape is never squashed (#128)

**Decision:** the shape is as large as possible across the width (screen width minus side gutters, up to its maximum size) and always keeps its proportions. Content under it scrolls, shrinks or moves. The rule is also in `CLAUDE.md`.

**Why:** on short screens the shape was squashed to make room for the text and controls (412 × 354 on a 412 × 800 screen). A squashed circle reads as a mistake, and the shape's size is the main cue for the breath.

**Instead:** three session layouts to choose from in Settings: Sticky, Shrink and Fill.

## 2026-11-05 · Leaving a session stays instant; no "stop?" prompt (#117)

**Decision:** Back and Android back leave a running session straight away.

**Why:** a confirm dialog gets in the way of the common case (meaning to leave) to protect the rare one.

**Instead:** Home offers "Jump back in" for 30 minutes, continuing the same session.

## 2026-11-05 · Looping techniques start breathing straight away (#116)

**Decision:** the nine techniques that loop open straight into the session with No limit, or the last length chosen. There's no start screen to pick a length.

**Why:** these are the calm, everyday techniques. An extra screen before the first breath adds friction where people most want none.

**Instead:** a length chip under the cycle counter changes the length while the session runs.

## 2026-11-05 · Designs: colours flow from code to Penpot (#112)

**Decision:** the CSS computes every colour from the technique's hue. Penpot gets the results; colour edits in Penpot don't come back to the code automatically.

**Why:** Penpot tokens can't run the hue formulas, so the code has to stay the source.

**Instead:** spacing, sizes and type do round-trip through `scripts/penpot-tokens.mjs`.
