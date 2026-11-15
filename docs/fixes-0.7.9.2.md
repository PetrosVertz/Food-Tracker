# Fix lists — 0.7.9.2 (refinements)

Follow CLAUDE.md. Petros adds items during planning; prompts are written when he says he is done. The last branch of the round bumps VERSION and CACHE.

## shell (Sonnet)
1. **Selected bottom tab: livelier colour, only slightly frosted.** The marker behind the selected tab (`.rail>.knob`, tokens `--t-knob-*` in theme.css) currently looks too washed out and frosted.
   - Make it much closer to the colour of the **Start Workout / Log Food** buttons (full `var(--t-accent)`), with only a **slight** frosted look on top: a faint light highlight at the top, a soft 1 px light edge and a gentle inner glow. It must keep the vibrant accent colour, not a pale tint.
   - Raise the accent share from the current 26% (Dark) / 32% (Light) to roughly 80–90%, and tune by eye in Playwright screenshots (Dark and Light, every accent preset).
   - Still **no live blur** (`backdrop-filter` stays off) so sliding between tabs stays smooth.
   - Icon and profile photo on it must stay crisp and read at ≥ 4.5:1 in Light and Dark (use `--t-on` for the icon colour on the vibrant marker).
