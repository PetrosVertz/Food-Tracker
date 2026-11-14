# Fix lists — 0.7.4.2 (usability)

Each branch session does only its own section. Follow CLAUDE.md. Start after 0.7.4.1 is fully merged.
Order: **gym-a**, **gym-b**, **small** (any order, can run together; if gym-a and gym-b overlap, merge gym-a first) → **shell** last.
Saved-data rule (README): adding an optional field needs no migration; changing an existing field's shape needs a SCHEMA bump + migration in store.js.

## gym-a (Sonnet)
1. End Exercise: don't collapse the finished card. It stays open with all its sets, marked done, with a Reopen button. Moving on smoothly scrolls the next exercise to the centre of the screen.
2. Set rows: don't copy kg and reps from the set above into the boxes; show them only as grey placeholder hints. Typing writes over them; ticking an empty set uses the hint values.
3. Recovery: remove the Front / Back pill; show front and back side by side (must fit the iPhone 13 mini, 375 px).
4. Recovery colours: more than 24 h left = red (Needs Rest); 24 h or less = yellow (Recovering); recovered = green (Ready). One function decides it, so the colour and the hours text always agree. Readable in Light.
5. Start Workout window: never taller than 4 saved workouts; more scroll inside the list; "Start Empty Workout" fixed at the bottom.

## gym-b (Opus)
1. Create a Workout: supersets by holding one exercise over another, using the same link-zone logic as the live workout (makeSortable, fixed in 0.7.4.0.5); drag out to unlink. Saved workouts keep their supersets, and starting a saved workout keeps them linked.
2. Auto-end, replacing the old 4-exercise rule, for any number of exercises:
   - 5 minutes after the last rest timer ends or is skipped with nothing new logged, ask "Finished Your Workout?" (Finish / Resume).
   - If 10 more minutes pass with no answer, finish it and save it to past workouts; end time = the last logged set.
   - It works when you've left the workout window: the question pops up over whatever page you're on (Fridge, Today…).
   - If the app was closed, work it out from saved times when it opens (no timers needed while closed).
   - Strings EN + GR. Test each path (answer Finish, answer Resume, no answer, app closed and reopened) by faking the clock.

## small (Sonnet)
1. Supplements form: add "Usual Time" (optional time picker) after Name, Dose and Unit. The supplements list sorts by it through the day (no time = end). Store it as an optional field so phone notifications can use it later. Strings EN + GR.
2. Receipt review: after a receipt scan, a window shows every item as a card: sure matches pre-ticked at the top, unsure ones marked. Swipe a card right-to-left to remove it (red glow + trash icon, Undo toast). Tap a card to edit the name, which food it is, the tag (Cooked / Raw / Ready / Frozen), pack size and count. One "Add All to Fridge" button fixed at the bottom. Reuse the app's existing swipe-to-delete. Strings EN + GR.

## shell (Sonnet, last)
1. Food Preferences: a new setup step, plus its own bar in Settings after Body and Goals.
   - Allergies (common ones as tap chips + free text) and foods you don't eat (dislikes, vegetarian, vegan…).
   - Save it with the profile (optional field).
   - Add it to every AI food prompt (grep for gemini( / AI.* calls that suggest or estimate food: recipes, Fill My Food, Suggest, Quick Log, receipt and scan) so the AI never suggests those foods. Do it in one shared helper, not copy-pasted text.
   - Only on this step, under the allergies box, a small line with a yellow warning line icon: "AI suggestions may contain errors. If you have allergies or dietary restrictions, always check labels and ingredients before eating." EN + GR; darker amber in Light.
2. Bump VERSION to 0.7.4.2 and CACHE to match.
