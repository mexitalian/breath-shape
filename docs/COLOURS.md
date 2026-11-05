# Technique colours

The colour is the biggest thing on a session screen, so it should say what the breathing is for before you read a word. Each technique has one hue (`hue:` in its config). Every colour on its screens, in light and dark, is worked out from that hue in `css/tokens.css`.

These are best guesses (#132), meant to be tried on the phone and adjusted.

## The idea: temperature follows the nervous system

| Purpose | Colour family | Hues | Why |
|---|---|---|---|
| **Calm & sleep** (down-regulating) | Blue → indigo → violet | 195–270 | Cool colours read as slowing down. The deeper and darker the hue, the stronger the "brake": sky blue for a quick reset, violet for sleep. In yoga's chakra colours, throat (blue), brow (indigo) and crown (violet) are the quiet, inward end of the body. |
| **Focus & balance** | Teal → green | 125–165 | Green sits in the middle of the colour wheel, between cool and warm, the way these patterns sit between calming and energising. It's also the heart chakra's colour, the centre of the seven, linked with balance. |
| **Energise** (up-regulating) | Yellow → orange → red | 0–52 | Warm colours read as heat and alertness. The hotter the hue, the more intense the practice: yellow for short bright pumps, red for the longest, strongest sessions. Solar plexus (yellow), sacral (orange) and root (red) are the energetic, grounding end of the chakra scale. |
| **Measure & train** | Their own | 330, 180 | These aren't about a state to reach, so they sit outside the scale, each with a colour that says what it measures. |

The chakra link is a loose borrowing that fits the warm-to-cool scale; it isn't a claim about chakras. The main reason is simpler: cool means slow down, warm means wake up, and almost everyone reads it that way without being told.

## Each technique

### Calm & sleep: blue to violet, gentlest to strongest

| Technique | Hue | Colour | Reasoning |
|---|---|---|---|
| Pursed-Lip Breathing | 195 | Cyan-blue | Air and ease. It's a recovery tool for breathlessness, so it gets the lightest, most "open air" blue. |
| Physiological Sigh | 210 | Sky blue | A fast reset that takes the edge off in a few breaths. Bright, quick, a cool splash. |
| Bhramari (humming bee) | 222 | Throat blue | The hum lives in the throat, and blue is the throat chakra's colour. Calm, with a voice. |
| Resonance Breathing | 238 | Deep blue | Steady coherence between heart and breath. Calm but awake, the middle of the calm range. |
| Extended Exhale | 255 | Indigo | A longer out-breath is a stronger brake on the nervous system. Darker, heavier, closer to sleep. |
| 4-7-8 Breathing | 270 | Violet | The sleep breath. Night colour, the far quiet end of the scale. |

### Focus & balance: greens

| Technique | Hue | Colour | Reasoning |
|---|---|---|---|
| Box Breathing | 165 | Teal-green | Composed focus under pressure. Green with a cool edge: alert but steady. |
| Triangle Breathing | 145 | Green | A gentler box, plain and even. |
| Alternate Nostril | 125 | Leaf green | Balancing left and right. Its two halves sit 18° either side, so both still read green. |

### Energise: yellow to red, gentlest to strongest

| Technique | Hue | Colour | Reasoning |
|---|---|---|---|
| Kapalabhati | 52 | Yellow | Short, sharp belly pumps. The solar plexus is yellow, and the feeling is bright and clear-headed. |
| Bhastrika | 34 | Orange | Bellows fanning a fire. Warmer, fuller breaths. |
| Wim Hof Method | 22 | Deep orange | Power breaths and long holds. Hotter and more intense. |
| Tummo | 10 | Red-orange | "Inner fire": building heat with a held, squeezed breath. |
| Connected Breathing | 0 | Red | The longest and most intense practice, fast with no pauses. The hottest colour, at the root of the scale. |

### Measure & train

| Technique | Hue | Colour | Reasoning |
|---|---|---|---|
| Heart Rate & HRV | 330 | Rose-magenta | The heart. Moved from 352 so it doesn't sit next to Connected Breathing's red: measuring isn't energising. |
| Buteyko | 180 | Aqua | Light, reduced breathing that trains calm (higher CO₂ tolerance). It sits where the calm blues meet the balance greens. |

## Changing a colour

1. Change `hue:` in the config, and the same `--hue` on its row in `index.html`. A test keeps the two in step.
2. Check the session in light and dark, and the Fill layout, where the whole screen is that colour.
3. Update this file, and regenerate the Penpot palette (`docs/design/penpot/README.md`).
