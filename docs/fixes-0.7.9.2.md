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
6. **Page titles crisp, not smudged** (My Food Log is the example; check every page title). Two likely causes, fix both:
   - The soft fade under the top bar (`section.page>header::before`, `--topfade` in theme.css) overlaps the title. Make the fade as short as it can be (about 6 px, or none if it still looks clean) and sit as high as possible, and move the page's content start down a little so nothing is under the fade when a page opens. Title, back arrow and buttons stay on a solid bar.
   - The page-open animation (`pgIn`, plus the new tab-switch motion) must leave **no** `transform`, `opacity`, `will-change` or filter on the page or its header once it has finished, because iPhone draws text in a moving layer softly. Check the title is sharp right after the page opens and after scrolling.
   - Check by screenshots at device scale 3, Light and Dark.
7. Do **not** bump VERSION here; the coach branch (last in the round) does it.

## coach (Opus) — run after shell is merged
All about the AI helpers (robots, bubbles, chat). Files: platform/ai.js, coach.js, ui.js, theme.css.

1. **Eyes look where you tap.** The robot's eyes move when you tap the screen, but the white spots (glints) always sit up-left or up-right inside the eye, so the robot looks up even when you tap below it (`gaze()` in platform/ai.js; `.rlook`, `.rgl`, FACE_I). Rebuild it so the whole look follows the real direction:
   - The eyes shift a little toward the tap, and the **white glint moves further inside each eye in the same direction**, so tapping below makes it look down, tapping left makes it look left, and so on (all 360°), glint always inside the eye. Resting position with no tap = looking straight ahead.
   - Same for the thinking face and for every robot (chef, gym, clerk, tour, pills, header robot). Smooth ease, returns to centre after a moment; Reduce Motion off.
   - Check by taps at the eight compass points around a bubble in Playwright screenshots.
2. **Chat is a small window, not a whole page.** Tapping a coach bubble (`coachbub`):
   - The **bubble does not move** (remove the flight to the top right, `perch()`); it sits at the top right of the chat window, above it.
   - The chat opens as a **floating window** (not full screen) on a layer **above the page but behind the bubble**: rounded, with a margin around it, its top right corner under the bubble, the bubble overlapping that corner. Page behind is dimmed.
   - It grows out of the bubble (scale from the top right, soft spring, transform and opacity only) and shrinks back into it on close, swipe down or Back. History and scroll stay between opens. Keyboard open: the window stays fully visible.
   - Update the `#ovCoach` / `.coachwin` rules in theme.css; remove code that only the full-page version needed.
3. **Thinking dots, for every AI.** One shared "thinking" indicator: three dots where **one jumps up and lands, then the next, then the next** (a wave in sequence, each dot follows a sine path: up and down smoothly, rest, repeat, about 1.2 s per round, small height). Transform only. Use it in every coach chat and in every other place an AI shows it is thinking or loading (replace `.lqdots` and any other three-dot or spinner copy); Reduce Motion = dots fade in turn.
4. **AI helpers stay out of other pages.**
   - A coach bubble is fixed to the screen: it never moves with the page, scrolling or the tab-switch motion.
   - Each bubble belongs to its own area and **only shows there**: the Food Coach bubble on the food tabs, the Gym Coach bubble on the gym tabs, the Kitchen clerk in Kitchen. When you switch to another area it fades away, and it comes back when you return. A bubble in the trash or closed stays gone as today. List in the pull request which tabs belong to which coach and how the bubble hides.
   - Check: open Food Coach bubble, go to Gym Buddy and back; scroll pages with a bubble out.
5. Bump VERSION to 0.7.9.2 and CACHE to match (last branch of the round).
