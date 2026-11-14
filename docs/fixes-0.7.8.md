# Fix lists — 0.7.8 (refinements)

Follow CLAUDE.md. Order: **titles** and **small** (can run together) → **spacing** last (it checks every screen after the others).

## titles (Opus)
Titles still look smudged on iPhone (page titles like Gym Buddy, some open windows, back arrows), even though the top bar is solid now (theme.css "ONE TOP BAR"). So the cause is no longer the blur. Find the real cause and fix it everywhere:
1. Likely causes to check, in this order:
   - Text centred with `transform: translate(-50%,-50%)` (layout.css `header>h1`) or other transforms: WebKit draws the text at half pixels and it looks soft. Centre with flex/grid or `left:0;right:0;text-align:center` instead, no transform on text.
   - `will-change`, leftover `transform`/`scale` or `filter` from animations (page slide, sliding pills, sheet open) on an ancestor of the title or back arrow: the layer is drawn at low resolution. Remove `will-change` after the animation ends, and end animations with `transform:none`.
   - `.sheet` glass `backdrop-filter` (theme.css, glass.css) under window titles: make window title bars solid like the page bar.
   - Any `opacity < 1`, text-shadow or blur filter on titles, back arrows or header buttons.
2. Check with screenshots at device scale 3 (iPhone) in Chromium, and in WebKit if Playwright's webkit runs here; compare crops of the title before and after. Fix all page titles, every window title, every back arrow and header button.
3. In the pull request, say plainly what the cause was.

## small (Sonnet)
1. **Food Coach pill:** remove the circle around the chef robot; just the robot, same size, no ring or background disc. Same for the Gym Coach pill.
2. **Live workout: no floating robot bubble.** In an active workout the AI is reached only from the robot at the top right. Closing the Gym Coach chat there does not create a bubble; the robot stays in the header. (Outside the live workout, coach bubbles work as today.)
3. **Sleep only with a watch:** remove the manual "Hours Slept" entry from Recovery. Recovery uses sleep only when a smartwatch or band is connected (later, in the Capacitor app via Apple Health); until then sleep is ignored and nothing about sleep shows. Keep a small hook (one function returning `null` today) where watch sleep data will plug in. Remove the unused strings.

## spacing (Sonnet, last)
Spacing should feel premium: today some things sit on top of each other.
1. **Find every overlap:** write a small Playwright script in tools/ (`tools/overlap.js`) that opens each page and the main windows (Log Food, Food Coach, live workout, Create a Workout, Recovery, Profile, Settings pages, receipt review) at 375 × 812 and 390 × 844, Light and Dark, and lists visible elements whose boxes overlap (text on text, button on text, pills over content) and text that's cut off. Fix each one.
2. **One spacing scale:** use the theme spacing tokens (`--s1…`) for gaps and padding instead of one-off pixel values; equal gaps between cards and sections; at least 16 px side margins; nothing touching card edges; bottom content never hidden behind the bottom pills (enough bottom padding on every page).
3. Before / after screenshots of the worst 5 screens in the pull request description (as a list of what changed).
4. Bump VERSION to 0.7.8 and CACHE to match.
