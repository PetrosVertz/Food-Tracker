# Fix lists — 0.7.9.1 (refinements)

Follow CLAUDE.md. Run after ai-0.7.9 and gym-b-0.7.9 are merged. **shell**, **foods** and **gym** can run together.

## shell (Sonnet)
1. **Bottom pill animations, smoother:**
   - Two pills move **together as one unit** (remove the per-pill delay `PILL_GAP` in ui.js); same speed, same curve.
   - **Food Coach / Gym Coach pill glitch:** `.coachpill` has a live `backdrop-filter: blur(20px)` (theme.css) while it moves, which stutters on iPhone. Give it a solid background like the main pill (no blur), and make sure both pills animate the same properties.
   - Down and up use one smooth easing, a little longer (about 300 ms down, 350 ms up with a soft settle, no bounce overshoot); transform and opacity only; no layout change, text swap or glow jump during the move; a new tab switch mid-animation continues smoothly from where the pill is.
   - Check by recording frames in Playwright at device scale 3 and stepping through them: no jumps between frames, both pills in step.
2. **Coach chat grows out of its bubble:** tapping a robot bubble moves the bubble smoothly to the top right; the chat window then drops down and grows out of it (scale and clip from the bubble's position, like a speech bubble opening; ~300 ms, spring easing). Closing, swiping back or dragging the chat shrinks it back up into the robot bubble, and the bubble returns to where it was. The chat keeps its history and scroll between opens. Transform/opacity/clip-path only; Reduce Motion = a simple fade.
3. **Everything draggable feels smooth** (robot bubbles, drag to the trash circle, reordering exercise cards and supersets, swipe-to-delete rows, receipt cards, sheets dragged down to close, the count wheel):
   - Pointer events with pointer capture; move only with `transform: translate3d(...)` inside `requestAnimationFrame`; never read layout (getBoundingClientRect, offsetTop) during a move, only at drag start; no `transition` while the finger is down.
   - Follow the finger 1:1, then release with a spring (velocity carried over) to the snap point, side, or back home; rubber-band at edges.
   - **Bubble dismissed in the trash:** the bubble shrinks and fades into the trash circle, the trash circle closes, then the coach pill rises back with the same animation as a tab switch, all one smooth sequence with no jump, flash or layout shift of Log Food / Create a Workout (they slide aside smoothly to make room).
   - Write one shared drag helper (in ui.js) and use it everywhere instead of separate drag code; keep `touch-action` right so iPhone scrolling still works and never cancels a drag halfway.
   - Check by recording frames in Playwright: no jumps, element always under the pointer.
4. **One rule for AI faces:** anything that **opens a chat** with an AI helper shows that helper's robot face (Food Coach = chef, Gym Coach = sweatband, Kitchen chats = fridge clerk); a **one-tap AI job with no chat** (Check My Foods, Fill My Macros, receipt reading, scan item, suggest recipe…) keeps the AI tag. Go through every AI button, pill and settings row in the app and apply it; list them in the pull request.

## foods (Sonnet)
1. **Recipes back to the Food Library:** Home-Cooked lives in Food Library again as a pill switcher `Store-Bought | Home-Cooked` (same pill style as Kitchen's switcher). Kitchen keeps only `Fridge | Groceries`. Move the markup, routes and wiring; "Cook a Meal" still works from the Fridge and the finished meal lands under Home-Cooked. Turning Kitchen off never hides recipes. Update any links, strings (EN + GR) and the Tabs setting text that mention Recipes in Kitchen.
2. Bump VERSION to 0.7.9.1 and CACHE to match.

## gym (Sonnet)
1. **Finished sets stay clean:** when a set is ticked (the green finished row above the rest timer), its half reps, negatives and RIR fields disappear from the row; it shows only the finished set (weight × reps, as today). The values stay saved with the set.
   - Before ticking, the extras show as today (when switched on in Exercise Settings). Tapping a finished set to reopen it shows them again for editing.
   - They're background data: recovery uses them (e.g. RIR 0 / negatives = harder set), and the Gym Coach and the background profile (AI.knows) read them; check both actually do, and add it where missing.
