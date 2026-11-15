# Fix lists — 0.7.9.1 (refinements)

Follow CLAUDE.md. Run after ai-0.7.9 and gym-b-0.7.9 are merged. **shell** and **foods** can run together.

## shell (Sonnet)
1. **Bottom pill animations, smoother:**
   - Two pills move **together as one unit** (remove the per-pill delay `PILL_GAP` in ui.js); same speed, same curve.
   - **Food Coach / Gym Coach pill glitch:** `.coachpill` has a live `backdrop-filter: blur(20px)` (theme.css) while it moves, which stutters on iPhone. Give it a solid background like the main pill (no blur), and make sure both pills animate the same properties.
   - Down and up use one smooth easing, a little longer (about 300 ms down, 350 ms up with a soft settle, no bounce overshoot); transform and opacity only; no layout change, text swap or glow jump during the move; a new tab switch mid-animation continues smoothly from where the pill is.
   - Check by recording frames in Playwright at device scale 3 and stepping through them: no jumps between frames, both pills in step.
2. **Coach chat grows out of its bubble:** tapping a robot bubble moves the bubble smoothly to the top right; the chat window then drops down and grows out of it (scale and clip from the bubble's position, like a speech bubble opening; ~300 ms, spring easing). Closing, swiping back or dragging the chat shrinks it back up into the robot bubble, and the bubble returns to where it was. The chat keeps its history and scroll between opens. Transform/opacity/clip-path only; Reduce Motion = a simple fade.
3. **One rule for AI faces:** anything that **opens a chat** with an AI helper shows that helper's robot face (Food Coach = chef, Gym Coach = sweatband, Kitchen chats = fridge clerk); a **one-tap AI job with no chat** (Check My Foods, Fill My Macros, receipt reading, scan item, suggest recipe…) keeps the AI tag. Go through every AI button, pill and settings row in the app and apply it; list them in the pull request.

## foods (Sonnet)
1. **Recipes back to the Food Library:** Home-Cooked lives in Food Library again as a pill switcher `Store-Bought | Home-Cooked` (same pill style as Kitchen's switcher). Kitchen keeps only `Fridge | Groceries`. Move the markup, routes and wiring; "Cook a Meal" still works from the Fridge and the finished meal lands under Home-Cooked. Turning Kitchen off never hides recipes. Update any links, strings (EN + GR) and the Tabs setting text that mention Recipes in Kitchen.
2. Bump VERSION to 0.7.9.1 and CACHE to match.
