# Navigation map

Generated from the code by `node scripts/nav-map.mjs --write` (#114). Do not edit by hand: change the code, then regenerate. A test fails when this file is out of date.

## Problems

None found. Info pages (Privacy, Diagnostics, Style guide) lead only to Home by design.

## The shape of the app

Home is the only hub. Technique pages follow one of these patterns:

| Technique | Safety screen | Start screen | Ends with a summary |
|---|---|---|---|
| 4-7-8 Breathing (`478-breathing.html`) | · | · | when a length is set (No limit runs until you leave) |
| Alternate Nostril (`alternate-nostril.html`) | · | yes | when a length is set (No limit runs until you leave) |
| Bhastrika (`bhastrika.html`) | yes, until acknowledged | yes | yes |
| Bhramari (`bhramari.html`) | · | · | when a length is set (No limit runs until you leave) |
| Box Breathing (`box-breathing.html`) | · | · | when a length is set (No limit runs until you leave) |
| Buteyko (`buteyko.html`) | · | yes | yes |
| Connected Breathing (`connected-breathing.html`) | yes, until acknowledged | yes | yes |
| Extended Exhale (`extended-exhale.html`) | · | · | when a length is set (No limit runs until you leave) |
| Kapalabhati (`kapalabhati.html`) | yes, until acknowledged | yes | yes |
| Physiological Sigh (`physiological-sigh.html`) | · | · | when a length is set (No limit runs until you leave) |
| Pursed-Lip Breathing (`pursed-lip-breathing.html`) | · | · | when a length is set (No limit runs until you leave) |
| Resonance Breathing (`resonance-breathing.html`) | · | · | when a length is set (No limit runs until you leave) |
| Triangle Breathing (`triangle-breathing.html`) | · | · | when a length is set (No limit runs until you leave) |
| Tummo (`tummo.html`) | yes, until acknowledged | yes | yes |
| Wim Hof Method (`wim-hof.html`) | yes, until acknowledged | yes | yes |

```mermaid
flowchart LR
  index_html["Home"]
  exit((Leaves the app))
  diagnostics_html["Diagnostics"]
  heart_rate_html["Heart Rate & HRV"]
  history_html["History"]
  privacy_html["Privacy policy"]
  styleguide_html["Style Guide"]
  T["Technique page"]
  T_safety["Safety screen<br/>(energise, first visits)"]
  T_start["Start screen"]
  T_session["Session"]
  T_summary["Summary<br/>(sessions that end or have a length)"]
  SET{{"Settings overlay"}}
  index_html -->|"tap a technique"| T
  index_html -->|"Android back"| exit
  diagnostics_html -.->|"← All techniques"| index_html
  diagnostics_html -.->|"Android back"| index_html
  heart_rate_html -.->|"← All techniques"| index_html
  heart_rate_html -.->|"All techniques"| index_html
  heart_rate_html -.->|"Android back"| index_html
  history_html -.->|"← All techniques"| index_html
  history_html -.->|"Android back"| index_html
  index_html -->|"Heart Rate & HRV"| heart_rate_html
  index_html -->|"Your history →"| history_html
  index_html -->|"Privacy"| privacy_html
  index_html -->|"Diagnostics"| diagnostics_html
  index_html -->|"Style guide"| styleguide_html
  privacy_html -.->|"← All techniques"| index_html
  privacy_html -.->|"Android back"| index_html
  styleguide_html -.->|"All techniques"| index_html
  styleguide_html -.->|"All techniques"| index_html
  styleguide_html -.->|"All techniques"| index_html
  styleguide_html -.->|"Android back"| index_html
  history_html -->|"a saved session"| T
  T -->|"first visits"| T_safety
  T_safety -->|"I understand"| T_start
  T_safety -.->|"All techniques"| index_html
  T -->|"opens on"| T_start
  T -->|"looping techniques"| T_session
  T_start -->|"Start / variant / length"| T_session
  T_session -->|"ends"| T_summary
  T_summary -->|"Go again"| T_session
  T_summary -->|"Check heart rate"| heart_rate_html
  T_summary -.->|"All techniques"| index_html
  T_session -. "Back / Android back: kept 30 min" .-> index_html
  index_html -->|"Jump back in"| T_session
  heart_rate_html -->|"Back to the technique"| T
  T_session -->|"length chip"| T_session
  T_session -->|"gear"| SET
  index_html -->|"gear"| SET
  SET -.->|"Done"| T_session
```

Solid arrows go forward, dotted ones go back or close.

## Every way between screens

| From | Action | To | Kind |
|---|---|---|---|
| Home | Android back | Leaves the app | leave |
| Home | Jump back in (a session left in the last 30 min) | Its technique page | forward |
| Home | Gear | Home · Settings | overlay |
| Home · Settings | Done / tap outside / Esc | Home | close |
| 4-7-8 Breathing · Session | Length chip (No limit, minutes or cycles) | 4-7-8 Breathing · Session | self |
| 4-7-8 Breathing | Opens on | 4-7-8 Breathing · Session | forward |
| 4-7-8 Breathing · Session | Session ends (a length is set) | 4-7-8 Breathing · Summary | forward |
| 4-7-8 Breathing · Summary | Go again | 4-7-8 Breathing · Session | forward |
| 4-7-8 Breathing · Summary | Check heart rate | Heart Rate & HRV | forward |
| 4-7-8 Breathing · Summary | All techniques | Home | back |
| 4-7-8 Breathing · Session | Gear | 4-7-8 Breathing · Settings | overlay |
| 4-7-8 Breathing · Settings | Done / tap outside / Esc | 4-7-8 Breathing · Session | close |
| 4-7-8 Breathing · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| 4-7-8 Breathing · Summary | Back (top bar) / Android back | Home | back |
| Alternate Nostril · Session | Length chip (No limit, minutes or cycles) | Alternate Nostril · Session | self |
| Alternate Nostril · Start screen | A variant | Alternate Nostril · Session | forward |
| Alternate Nostril | Opens on | Alternate Nostril · Start screen | forward |
| Alternate Nostril · Session | Session ends (a length is set) | Alternate Nostril · Summary | forward |
| Alternate Nostril · Summary | Go again | Alternate Nostril · Session | forward |
| Alternate Nostril · Summary | Check heart rate | Heart Rate & HRV | forward |
| Alternate Nostril · Summary | All techniques | Home | back |
| Alternate Nostril · Session | Gear | Alternate Nostril · Settings | overlay |
| Alternate Nostril · Settings | Done / tap outside / Esc | Alternate Nostril · Session | close |
| Alternate Nostril · Start screen | Back (top bar) / Android back | Home | back |
| Alternate Nostril · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Alternate Nostril · Summary | Back (top bar) / Android back | Home | back |
| Bhastrika · Start screen | Start | Bhastrika · Session | forward |
| Bhastrika | Opens on (first visits) | Bhastrika · Safety screen (until "don't show again") | forward |
| Bhastrika · Safety screen (until "don't show again") | I understand, continue | Bhastrika · Start screen | forward |
| Bhastrika · Safety screen (until "don't show again") | All techniques | Home | back |
| Bhastrika | Opens on (once acknowledged) | Bhastrika · Start screen | forward |
| Bhastrika · Session | Session ends | Bhastrika · Summary | forward |
| Bhastrika · Summary | Go again | Bhastrika · Session | forward |
| Bhastrika · Summary | Check heart rate | Heart Rate & HRV | forward |
| Bhastrika · Summary | All techniques | Home | back |
| Bhastrika · Session | Gear | Bhastrika · Settings | overlay |
| Bhastrika · Settings | Done / tap outside / Esc | Bhastrika · Session | close |
| Bhastrika · Start screen | Back (top bar) / Android back | Home | back |
| Bhastrika · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Bhastrika · Summary | Back (top bar) / Android back | Home | back |
| Bhramari · Session | Length chip (No limit, minutes or cycles) | Bhramari · Session | self |
| Bhramari | Opens on | Bhramari · Session | forward |
| Bhramari · Session | Session ends (a length is set) | Bhramari · Summary | forward |
| Bhramari · Summary | Go again | Bhramari · Session | forward |
| Bhramari · Summary | Check heart rate | Heart Rate & HRV | forward |
| Bhramari · Summary | All techniques | Home | back |
| Bhramari · Session | Gear | Bhramari · Settings | overlay |
| Bhramari · Settings | Done / tap outside / Esc | Bhramari · Session | close |
| Bhramari · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Bhramari · Summary | Back (top bar) / Android back | Home | back |
| Box Breathing · Session | Length chip (No limit, minutes or cycles) | Box Breathing · Session | self |
| Box Breathing | Opens on | Box Breathing · Session | forward |
| Box Breathing · Session | Session ends (a length is set) | Box Breathing · Summary | forward |
| Box Breathing · Summary | Go again | Box Breathing · Session | forward |
| Box Breathing · Summary | Check heart rate | Heart Rate & HRV | forward |
| Box Breathing · Summary | All techniques | Home | back |
| Box Breathing · Session | Gear | Box Breathing · Settings | overlay |
| Box Breathing · Settings | Done / tap outside / Esc | Box Breathing · Session | close |
| Box Breathing · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Box Breathing · Summary | Back (top bar) / Android back | Home | back |
| Buteyko · Start screen | Start | Buteyko · Session | forward |
| Buteyko | Opens on | Buteyko · Start screen | forward |
| Buteyko · Session | Session ends | Buteyko · Summary | forward |
| Buteyko · Summary | Go again | Buteyko · Session | forward |
| Buteyko · Summary | Check heart rate | Heart Rate & HRV | forward |
| Buteyko · Summary | All techniques | Home | back |
| Buteyko · Session | Gear | Buteyko · Settings | overlay |
| Buteyko · Settings | Done / tap outside / Esc | Buteyko · Session | close |
| Buteyko · Start screen | Back (top bar) / Android back | Home | back |
| Buteyko · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Buteyko · Summary | Back (top bar) / Android back | Home | back |
| Connected Breathing · Start screen | A length | Connected Breathing · Session | forward |
| Connected Breathing | Opens on (first visits) | Connected Breathing · Safety screen (until "don't show again") | forward |
| Connected Breathing · Safety screen (until "don't show again") | I understand, continue | Connected Breathing · Start screen | forward |
| Connected Breathing · Safety screen (until "don't show again") | All techniques | Home | back |
| Connected Breathing | Opens on (once acknowledged) | Connected Breathing · Start screen | forward |
| Connected Breathing · Session | Session ends | Connected Breathing · Summary | forward |
| Connected Breathing · Summary | Go again | Connected Breathing · Session | forward |
| Connected Breathing · Summary | Check heart rate | Heart Rate & HRV | forward |
| Connected Breathing · Summary | All techniques | Home | back |
| Connected Breathing · Session | Gear | Connected Breathing · Settings | overlay |
| Connected Breathing · Settings | Done / tap outside / Esc | Connected Breathing · Session | close |
| Connected Breathing · Start screen | Back (top bar) / Android back | Home | back |
| Connected Breathing · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Connected Breathing · Summary | Back (top bar) / Android back | Home | back |
| Diagnostics | ← All techniques | Home | back |
| Diagnostics | Android back | Home | back |
| Extended Exhale · Session | Length chip (No limit, minutes or cycles) | Extended Exhale · Session | self |
| Extended Exhale | Opens on | Extended Exhale · Session | forward |
| Extended Exhale · Session | Session ends (a length is set) | Extended Exhale · Summary | forward |
| Extended Exhale · Summary | Go again | Extended Exhale · Session | forward |
| Extended Exhale · Summary | Check heart rate | Heart Rate & HRV | forward |
| Extended Exhale · Summary | All techniques | Home | back |
| Extended Exhale · Session | Gear | Extended Exhale · Settings | overlay |
| Extended Exhale · Settings | Done / tap outside / Esc | Extended Exhale · Session | close |
| Extended Exhale · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Extended Exhale · Summary | Back (top bar) / Android back | Home | back |
| Heart Rate & HRV | ← All techniques | Home | back |
| Heart Rate & HRV | All techniques | Home | back |
| Heart Rate & HRV | Back to the technique (opened from a summary) | Its technique page | forward |
| Heart Rate & HRV | Android back | Home | back |
| History | ← All techniques | Home | back |
| History | A saved session (opens its technique) | Its technique page | forward |
| History | Android back | Home | back |
| Home | Heart Rate & HRV | Heart Rate & HRV | forward |
| Home | Buteyko | Buteyko | forward |
| Home | Resonance Breathing | Resonance Breathing | forward |
| Home | 4-7-8 Breathing | 4-7-8 Breathing | forward |
| Home | Extended Exhale | Extended Exhale | forward |
| Home | Physiological Sigh | Physiological Sigh | forward |
| Home | Bhramari · Humming Bee | Bhramari | forward |
| Home | Pursed-Lip Breathing | Pursed-Lip Breathing | forward |
| Home | Box Breathing | Box Breathing | forward |
| Home | Triangle Breathing | Triangle Breathing | forward |
| Home | Alternate Nostril · Nadi Shodhana | Alternate Nostril | forward |
| Home | Bhastrika · Bellows Breath | Bhastrika | forward |
| Home | Kapalabhati · Skull-Shining Breath | Kapalabhati | forward |
| Home | Wim Hof Method | Wim Hof Method | forward |
| Home | Tummo · Inner Fire | Tummo | forward |
| Home | Connected Breathing | Connected Breathing | forward |
| Home | Your history → | History | forward |
| Home | Privacy | Privacy policy | forward |
| Home | Diagnostics | Diagnostics | forward |
| Home | Style guide | Style Guide | forward |
| Kapalabhati · Start screen | Start | Kapalabhati · Session | forward |
| Kapalabhati | Opens on (first visits) | Kapalabhati · Safety screen (until "don't show again") | forward |
| Kapalabhati · Safety screen (until "don't show again") | I understand, continue | Kapalabhati · Start screen | forward |
| Kapalabhati · Safety screen (until "don't show again") | All techniques | Home | back |
| Kapalabhati | Opens on (once acknowledged) | Kapalabhati · Start screen | forward |
| Kapalabhati · Session | Session ends | Kapalabhati · Summary | forward |
| Kapalabhati · Summary | Go again | Kapalabhati · Session | forward |
| Kapalabhati · Summary | Check heart rate | Heart Rate & HRV | forward |
| Kapalabhati · Summary | All techniques | Home | back |
| Kapalabhati · Session | Gear | Kapalabhati · Settings | overlay |
| Kapalabhati · Settings | Done / tap outside / Esc | Kapalabhati · Session | close |
| Kapalabhati · Start screen | Back (top bar) / Android back | Home | back |
| Kapalabhati · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Kapalabhati · Summary | Back (top bar) / Android back | Home | back |
| Physiological Sigh · Session | Length chip (No limit, minutes or cycles) | Physiological Sigh · Session | self |
| Physiological Sigh | Opens on | Physiological Sigh · Session | forward |
| Physiological Sigh · Session | Session ends (a length is set) | Physiological Sigh · Summary | forward |
| Physiological Sigh · Summary | Go again | Physiological Sigh · Session | forward |
| Physiological Sigh · Summary | Check heart rate | Heart Rate & HRV | forward |
| Physiological Sigh · Summary | All techniques | Home | back |
| Physiological Sigh · Session | Gear | Physiological Sigh · Settings | overlay |
| Physiological Sigh · Settings | Done / tap outside / Esc | Physiological Sigh · Session | close |
| Physiological Sigh · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Physiological Sigh · Summary | Back (top bar) / Android back | Home | back |
| Privacy policy | ← All techniques | Home | back |
| Privacy policy | Android back | Home | back |
| Pursed-Lip Breathing · Session | Length chip (No limit, minutes or cycles) | Pursed-Lip Breathing · Session | self |
| Pursed-Lip Breathing | Opens on | Pursed-Lip Breathing · Session | forward |
| Pursed-Lip Breathing · Session | Session ends (a length is set) | Pursed-Lip Breathing · Summary | forward |
| Pursed-Lip Breathing · Summary | Go again | Pursed-Lip Breathing · Session | forward |
| Pursed-Lip Breathing · Summary | Check heart rate | Heart Rate & HRV | forward |
| Pursed-Lip Breathing · Summary | All techniques | Home | back |
| Pursed-Lip Breathing · Session | Gear | Pursed-Lip Breathing · Settings | overlay |
| Pursed-Lip Breathing · Settings | Done / tap outside / Esc | Pursed-Lip Breathing · Session | close |
| Pursed-Lip Breathing · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Pursed-Lip Breathing · Summary | Back (top bar) / Android back | Home | back |
| Resonance Breathing · Session | Length chip (No limit, minutes or cycles) | Resonance Breathing · Session | self |
| Resonance Breathing | Opens on | Resonance Breathing · Session | forward |
| Resonance Breathing · Session | Session ends (a length is set) | Resonance Breathing · Summary | forward |
| Resonance Breathing · Summary | Go again | Resonance Breathing · Session | forward |
| Resonance Breathing · Summary | Check heart rate | Heart Rate & HRV | forward |
| Resonance Breathing · Summary | All techniques | Home | back |
| Resonance Breathing · Session | Gear | Resonance Breathing · Settings | overlay |
| Resonance Breathing · Settings | Done / tap outside / Esc | Resonance Breathing · Session | close |
| Resonance Breathing · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Resonance Breathing · Summary | Back (top bar) / Android back | Home | back |
| Style Guide | All techniques | Home | back |
| Style Guide | All techniques | Home | back |
| Style Guide | Resonance Breathing | Resonance Breathing | forward |
| Style Guide | All techniques | Home | back |
| Style Guide | Android back | Home | back |
| Triangle Breathing · Session | Length chip (No limit, minutes or cycles) | Triangle Breathing · Session | self |
| Triangle Breathing | Opens on | Triangle Breathing · Session | forward |
| Triangle Breathing · Session | Session ends (a length is set) | Triangle Breathing · Summary | forward |
| Triangle Breathing · Summary | Go again | Triangle Breathing · Session | forward |
| Triangle Breathing · Summary | Check heart rate | Heart Rate & HRV | forward |
| Triangle Breathing · Summary | All techniques | Home | back |
| Triangle Breathing · Session | Gear | Triangle Breathing · Settings | overlay |
| Triangle Breathing · Settings | Done / tap outside / Esc | Triangle Breathing · Session | close |
| Triangle Breathing · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Triangle Breathing · Summary | Back (top bar) / Android back | Home | back |
| Tummo · Start screen | Start | Tummo · Session | forward |
| Tummo | Opens on (first visits) | Tummo · Safety screen (until "don't show again") | forward |
| Tummo · Safety screen (until "don't show again") | I understand, continue | Tummo · Start screen | forward |
| Tummo · Safety screen (until "don't show again") | All techniques | Home | back |
| Tummo | Opens on (once acknowledged) | Tummo · Start screen | forward |
| Tummo · Session | Session ends | Tummo · Summary | forward |
| Tummo · Summary | Go again | Tummo · Session | forward |
| Tummo · Summary | Check heart rate | Heart Rate & HRV | forward |
| Tummo · Summary | All techniques | Home | back |
| Tummo · Session | Gear | Tummo · Settings | overlay |
| Tummo · Settings | Done / tap outside / Esc | Tummo · Session | close |
| Tummo · Start screen | Back (top bar) / Android back | Home | back |
| Tummo · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Tummo · Summary | Back (top bar) / Android back | Home | back |
| Wim Hof Method · Start screen | Start | Wim Hof Method · Session | forward |
| Wim Hof Method | Opens on (first visits) | Wim Hof Method · Safety screen (until "don't show again") | forward |
| Wim Hof Method · Safety screen (until "don't show again") | I understand, continue | Wim Hof Method · Start screen | forward |
| Wim Hof Method · Safety screen (until "don't show again") | All techniques | Home | back |
| Wim Hof Method | Opens on (once acknowledged) | Wim Hof Method · Start screen | forward |
| Wim Hof Method · Session | Session ends | Wim Hof Method · Summary | forward |
| Wim Hof Method · Summary | Go again | Wim Hof Method · Session | forward |
| Wim Hof Method · Summary | Check heart rate | Heart Rate & HRV | forward |
| Wim Hof Method · Summary | All techniques | Home | back |
| Wim Hof Method · Session | Gear | Wim Hof Method · Settings | overlay |
| Wim Hof Method · Settings | Done / tap outside / Esc | Wim Hof Method · Session | close |
| Wim Hof Method · Start screen | Back (top bar) / Android back | Home | back |
| Wim Hof Method · Session | Back (top bar) / Android back: kept for Jump back in | Home | back |
| Wim Hof Method · Summary | Back (top bar) / Android back | Home | back |
