# Fix lists — 0.7.9.2 (refinements)

Follow CLAUDE.md. Petros adds items during planning; prompts are written when he says he is done. The last branch of the round bumps VERSION and CACHE.

## shell (Sonnet)
1. **Selected bottom tab: livelier colour, only slightly frosted.** The marker behind the selected tab (`.rail>.knob`, tokens `--t-knob-*` in theme.css) currently looks too washed out and frosted.
   - Make it much closer to the colour of the **Start Workout / Log Food** buttons (full `var(--t-accent)`), with only a **slight** frosted look on top: a faint light highlight at the top, a soft 1 px light edge and a gentle inner glow. It must keep the vibrant accent colour, not a pale tint.
   - Raise the accent share from the current 26% (Dark) / 32% (Light) to roughly 80–90%, and tune by eye in Playwright screenshots (Dark and Light, every accent preset).
   - Still **no live blur** (`backdrop-filter` stays off) so sliding between tabs stays smooth.
   - Icon and profile photo on it must stay crisp and read at ≥ 4.5:1 in Light and Dark (use `--t-on` for the icon colour on the vibrant marker).

3. **Tab switch: smoother selector slide.** When another bottom tab is pressed, the marker circle glides from the old tab to the new one (`.rail>.knob`, tabs sliding code near `RAIL_KNOB` in ui.js). Make that glide clearly smoother:
   - One continuous motion with a soft ease-in-out (about 320–380 ms), no bounce, no stutter, no size or colour jump on the way.
   - Move with transform only (no left/width changes, no layout reads during the move); the icon/photo colour change on the old and new tab fades in step with the circle.
   - Tapping another tab mid-slide continues smoothly from where the circle currently is.
4. **Tab switch: smoother page change** (`switchTab` in ui.js, `pgIn` in motion.css). Make the old page leaving and the new page arriving one smooth, calm transition:
   - Short cross-fade with a small slide (direction matches the tab order), using opacity and transform only, about 280–340 ms, same easing as the selector so they move as one.
   - No flash, blank frame, scroll jump or layout shift while switching; the page is built before it appears, heavy work waits until the motion has finished.
   - Reduce Motion = a plain quick fade.
   - Check by recording frames in Playwright at device scale 3 and stepping through them: no jumps between frames, the circle and the page in step.
5. Bump VERSION to 0.7.9.2 and CACHE to match (this is the only branch of the round).
