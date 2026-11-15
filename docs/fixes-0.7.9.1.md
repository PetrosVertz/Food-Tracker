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
4. **No scroll bars:** hide the scroll bar on every scrolling area in the app (pages, windows, lists, chat, pickers) so it feels like an app, not a website. Scrolling, momentum and pull-to-close still work (`scrollbar-width:none` and `::-webkit-scrollbar{display:none}`).
5. **Profile photo crop with fingers:** remove the zoom slider. In the circle crop, pinch with two fingers to zoom (about 1× to 4×) and drag with one finger to move the photo, like iPhone Contacts; the photo always fills the circle (no empty edges), double-tap to reset. Use the shared drag helper; smooth on iPhone.
6. **One rule for AI faces:** anything that **opens a chat** with an AI helper shows that helper's robot face (Food Coach = chef, Gym Coach = sweatband, Kitchen chats = fridge clerk); a **one-tap AI job with no chat** (Check My Foods, Fill My Macros, receipt reading, scan item, suggest recipe…) keeps the AI tag. Go through every AI button, pill and settings row in the app and apply it; list them in the pull request.

## foods (Sonnet)
1. **Recipes back to the Food Library:** Home-Cooked lives in Food Library again as a pill switcher `Store-Bought | Home-Cooked` (same pill style as Kitchen's switcher). Kitchen keeps only `Fridge | Groceries`. Move the markup, routes and wiring; "Cook a Meal" still works from the Fridge and the finished meal lands under Home-Cooked. Turning Kitchen off never hides recipes. Update any links, strings (EN + GR) and the Tabs setting text that mention Recipes in Kitchen.
2. Bump VERSION to 0.7.9.1 and CACHE to match.

## gym (Sonnet)
1. **Finished sets stay clean:** when a set is ticked (the green finished row above the rest timer), its half reps, negatives and RIR fields disappear from the row; it shows only the finished set (weight × reps, as today). The values stay saved with the set.
   - Before ticking, the extras show as today (when switched on in Exercise Settings). Tapping a finished set to reopen it shows them again for editing.
   - They're background data: recovery uses them (e.g. RIR 0 / negatives = harder set), and the Gym Coach and the background profile (AI.knows) read them; check both actually do, and add it where missing.
2. **Leaderboard Attempt moves into Exercise Settings:** a toggle "Enable Leaderboard Attempt on Available Exercises" (replaces the trophy switch in the live workout). When on, every leaderboard exercise card shows a small trophy line-icon button top centre, above the exercise name. Pressing it turns the name gold and switches that exercise to attempt mode: each set row shows just the weight and a tick for "rep completed"; a ticked single that beats your best goes to the leaderboard (celebration as today). Press again to leave attempt mode.
3. **Hide Set Markers becomes a drop-down row:** tapping it opens a small list inside Exercise Settings with Warm-Up, Drop Set and Failure. Tapping one greys it out and that marker is no longer offered on sets until you tap it again. Saved sets with that marker keep it.
4. **Unilateral Set Finishing, one tall tick:** when it's on, a one-sided set's Left and Right rows keep their own weight and reps, but their two tick boxes merge into **one tall tick box** spanning both rows (the two boxes joined vertically into one rounded box, tick centred). One tap finishes both sides. When it's off, the two separate ticks come back.
5. **Rename "Both Sides Together" → "Unilateral Set Finishing"** (EN + GR, with a one-line explanation under it), and centre the Exercise Settings rows properly (labels and switches aligned on one grid).
6. **Live workout:** make the timer bigger again (clearly the biggest thing in the top bar, about 34 px, tabular numbers) and the Gym Coach robot at the top right bigger (about 40 px, 44 px tap area). Check it all fits the iPhone 13 mini.
7. **Swipe to delete an exercise** in the live workout and Create a Workout: smooth, using the shared drag helper from the shell chat (follows the finger, red reveal + trash, springs back or completes, Undo). If the shell chat isn't merged yet, wait for it.
8. **Recovery page, simpler:**
   - Remove the banner above the muscle list ("Rest day · chest, shoulders, back, arms still recovering · good call resting" and similar).
   - Keep the muscle tabs (Arms, Back, Chest, Shoulders…). Each shows only its state and the hours left, counting down: **"Needs Rest · 48 h"**, **"Recovering · 14 h"**, **"Ready"**. Always hours, never days, no "more rest" wording. Same rule (0.7.4.2) for the colour and the label.
9. **Smarter food line in Recovery:** today it says "34 g more protein" even when nothing is logged yet, which makes no sense. Make it judge properly:
   - **Nothing logged today** = unknown, not zero: say nothing about today, or (if yesterday was logged) judge from yesterday.
   - Look at the recovery window that matters: food from the workout until now (up to about 48 h), against the protein and calorie targets **pro-rated by time of day** (in the morning you're not "behind" for the whole day).
   - Show one short verdict only when it's useful: **On Track**, **A Bit Low** or **Low**, with one tip when low (e.g. "Add a protein-rich meal tonight"). No exact gram gaps unless the day is mostly over.
   - Keep the rules in one function with comments, so the AI coach brain (docs/notes/ai-coach-brief.md) can replace them later with the researched rules.
