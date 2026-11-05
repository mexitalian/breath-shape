# Decisions

What was decided or retired, and why, so it isn't re-added by accident or argued again without the reasons. Newest first. Each entry links the issue that holds the discussion.

To add one: a dated heading, then **Decision**, **Why**, and **Instead** (what replaces it, if anything). Reversing a decision is fine. Add a new entry that says so; don't edit the old one.

## 2026-11-05 · Fill: Box and Triangle are implied by their corners (#148)

**Decision:** in the Fill layout, Box and Triangle are drawn only as hairline brackets at their corners, with the marker riding the invisible edges between them. The shape spans the back chevron's tip to the settings cog's edge. The marker and brackets are flat (no glow), don't change when the marker arrives, and flip colour with the liquid. Shrink keeps the filled shapes.

**Why:** with the liquid filling the screen, a second filled shape competed with it. Gestalt closure lets the corners alone carry the shape and keeps the screen calm.

**Instead:** each bracket's arms are as long as the marker's edges, so at a corner the bracket and marker make one complete small shape.
## 2026-11-05 · Session lengths are time only, picked from a toggle (#147)

**Decision:** every length is in minutes (No limit, then e.g. 3, 5, 10 min). Physiological Sigh, 4-7-8 and Bhramari no longer offer cycle counts. The tap-through length chip is replaced by a toggle that shows every option side by side and works any time. The counter always shows cycles and time together, and the picked length says how many cycles it holds.

**Why:** cycle counts like 1 or 3 were too short to be useful, and tapping one chip to step through hidden options was awkward. Time was only shown when a length was picked.

**Instead:** "Cycle 4 · 0:41" with No limit, and "Cycle 4 of 25 · 4:19 left" with a length. The mini shapes fill as you breathe in and stay full; with a length, every outline shows up front.

## 2026-11-05 · Retired: touch moving the fluid; "Fluid moves with" (#138)

**Decision:** touch no longer moves Vessel, Membrane or the Fill liquid. Only tilt does. On a computer with no tilt sensor, the mouse position stands in for tilt. The "Fluid moves with" setting is gone.

**Why:** touch now has other jobs. Dragging scrolls the session layouts, and a tap continues a hold. Splitting touch between those and the liquid made both unreliable.

**Instead:** tilt and shakes on the phone; the mouse and fast flicks on a computer. Particles stay on with the fluid looks (they used to switch off), and in Fill they become bubbles rising through the liquid.

## 2026-11-05 · Retired: the Sticky session layout (#137)

**Decision:** Settings → Session layout offers Shrink (the default) and Fill. Sticky is gone; a saved Sticky reads as Shrink.

**Why:** on the phone, text sliding under a full-size shape felt cluttered, and the band that hid it read as a shadow across the screen.

**Instead:** Shrink keeps the shape at the top and shrinks it (down to 35%) only when the content doesn't fit. Anything passing behind it fades out through a halo in the shape's own outline, not a full-width band.

## 2026-11-05 · The glow takes the shape's outline (#137)

**Decision:** the soft glow behind the shape is drawn in the shape's own outline and size.

**Why:** it was a fixed round disc at 70% of the field. It showed as a stray circle whenever the shape was smaller than that, and as a round blob behind squares and triangles.

## 2026-11-05 · Technique colours say what the breathing is for (#132)

**Decision:** each technique's hue now follows its purpose. Calm and sleep techniques are blue to violet. Focus and balance techniques are greens. Energising techniques are yellow to red. Measuring tools have their own colours. The reasoning for every hue is in `docs/COLOURS.md`.

**Why:** colour is the biggest cue on the screen. Before this, hues were picked one at a time to look different from each other: 4-7-8, a sleep breath, was orange, and Wim Hof was blue. Now the colour tells you at a glance what kind of breathing you're doing and why.

**Instead of:** one arbitrary hue per technique, and a colour you could change by dragging (retired below).

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
