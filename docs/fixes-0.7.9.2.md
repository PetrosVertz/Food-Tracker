# Fix lists — 0.7.9.2 (refinements)

Follow CLAUDE.md. Petros adds items during planning; prompts are written when he says he is done. The last branch of the round bumps VERSION and CACHE.

## shell (Sonnet)
1. **Selected bottom tab: livelier colour, only slightly frosted.** The marker behind the selected tab (`.rail>.knob`, tokens `--t-knob-*` in theme.css) currently looks too washed out and frosted.
   - Make it much closer to the colour of the **Start Workout / Log Food** buttons (full `var(--t-accent)`), with only a **slight** frosted look on top: a faint light highlight at the top, a soft 1 px light edge and a gentle inner glow. It must keep the vibrant accent colour, not a pale tint.
   - Raise the accent share from the current 26% (Dark) / 32% (Light) to roughly 80–90%, and tune by eye in Playwright screenshots (Dark and Light, every accent preset).
   - Still **no live blur** (`backdrop-filter` stays off) so sliding between tabs stays smooth.
   - Icon and profile photo on it must stay crisp and read at ≥ 4.5:1 in Light and Dark (use `--t-on` for the icon colour on the vibrant marker).

2. **Tab switch: smoother selector slide.** When another bottom tab is pressed, the marker circle glides from the old tab to the new one (`.rail>.knob`, tabs sliding code near `RAIL_KNOB` in ui.js). Make that glide clearly smoother:
   - One continuous motion with a soft ease-in-out (about 320–380 ms), no bounce, no stutter, no size or colour jump on the way.
   - Move with transform only (no left/width changes, no layout reads during the move); the icon/photo colour change on the old and new tab fades in step with the circle.
   - Tapping another tab mid-slide continues smoothly from where the circle currently is.
3. **Tab switch: smoother page change** (`switchTab` in ui.js, `pgIn` in motion.css). Make the old page leaving and the new page arriving one smooth, calm transition:
   - Short cross-fade with a small slide (direction matches the tab order), using opacity and transform only, about 280–340 ms, same easing as the selector so they move as one.
   - No flash, blank frame, scroll jump or layout shift while switching; the page is built before it appears, heavy work waits until the motion has finished.
   - Reduce Motion = a plain quick fade.
   - Check by recording frames in Playwright at device scale 3 and stepping through them: no jumps between frames, the circle and the page in step.
4. **Pull a window down to close it: much smoother** (`sheetDrag` in ui.js; Petros sees about 5 frames a second on iPhone). It must feel as smooth as the robot bubbles.
   - Already true: the window follows the finger with transform only and has no blur. So look for what else costs frames while it moves, and remove it: the big box-shadow on the window, the dim background behind it repainting on every frame (fade it with opacity on its own layer instead), the page underneath being redrawn or re-rendered while dragging or at the moment of release (`close()` / `renderAll()` should wait until the closing motion has finished), and the window not being on its own layer from the start (give it `will-change: transform` when it opens, not when the drag starts).
   - Test every window that can be pulled down (Start Workout, Add Food, pickers, summaries and so on), not just one.
   - Check by recording frames in Playwright (also with CPU throttling 4x) and stepping through them: the window is under the finger in every frame, and the release and close carry on smoothly.
5. **Start Workout window: title lined up with the back arrow.** "Saved Workouts" sits about 8 px lower than the back arrow (measured: arrow centre 235, title centre 243 on a 390 px wide phone). Fix in theme.css (the `.sback + .sthead` rules, the Gym Coach button makes the row 52 px tall) so the title's vertical centre equals the arrow's, in every window with a back arrow and a title row; check Start Workout, Pick Exercise, Targets and the Settings pages.
6. Bump VERSION to 0.7.9.2 and CACHE to match (this is the only branch of the round).
