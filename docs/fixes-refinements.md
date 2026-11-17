# Refinements — change list

Patch name: **Refinements** (no version number). Chats are named `Refinements #1`, `#2` … in merge order; see `docs/prompts-refinements.md`.

**Notes added when this file was saved (read first):**
- There is no `claude/` folder in the repo. `claude/test/redecl.js`, `claude/test/search.js` and `claude/visual-spec-8nov.md` do not exist. The health check is `node tools/check.js --boot` (it loads every script in one browser page, so anything declared twice fails there). New test lists go under `tools/`.
- The rank files are `js/rank-engine.js`, `js/rank-v2.js`, `js/rank-fx.js` and `img/rank/` (not `rank-plates.js` / `rank-change.*`).
- Not built: change 6 (cancelled), change 8 (on hold, the exercise picker menu stays exactly as it is), My Meals inside change 7 (Coming Soon tile and pill only).
- Change 22 Part A replaces the pill of change 10. In change 9, item 5b wins over item 2.
- Change 25 (Food Coach hybrid engine) is new and is built together with change 24 in Refinements #5, following the recommendations at its end. Point 4 there (new saved data: country, restaurants, personal portion memory) is left for a later round.

---

Follow CLAUDE.md first.

## Where We Left Off

Read the repo before changing anything. Check, in this order:

1. The current `VERSION` and `CACHE` values, so you know which build is live.
2. The git log and recently merged branches, to see what shipped last.
3. `docs/notes/` and the plan files in `claude/`, so you know what was planned versus what actually shipped.

These are small refinements. They have no version number. Do not bump `VERSION` or `CACHE` unless told to.

## How To Work

- Do the changes below one at a time, in order.
- Before each change, grep for every place it touches. Do not guess names.
- Change only what is listed. Leave everything else as it is.
- After the changes, run `node tools/check.js --boot` and report anything that fails.
- If a change is unclear or conflicts with something in the code, stop and ask instead of guessing.

## Changes

### 1. Remove Swipe Down To Close

**What:** Swiping down on a window or sheet no longer closes it. Remove that gesture everywhere. It is annoying because it triggers by accident.

**Where:** Every sheet and overlay that has it. Examples: Log Food, the exercise picker, Swap, the Settings pages, Form, Check My Foods, the shopping review. Find the shared drag-to-dismiss code (the sheet helpers from 0.7.9.1 if present) and remove it, or switch it off for every sheet.

**Keep these ways to close, exactly as they work now:**

- the back arrow
- the Done or Close button
- tapping outside the window

**Do not touch:** swipe to delete on Eaten rows and workout exercises, hold-to-drag to reorder, hold-to-superset, and the page pull between tabs.

**Check it:**

- Dragging down on any sheet scrolls its content or does nothing. It never closes.
- Scrolling a long list inside a sheet still works normally.
- The three ways to close still work on every sheet.
- Remove any CSS or JS that is left unused after this. Make sure nothing is declared twice (`claude/test/redecl.js`).

### 2. Windows Remember What You Typed For 3 Minutes

**What:** When a window or sheet closes, it keeps whatever the user typed or selected in it. If the same window opens again within 3 minutes, it comes back with those values filled in. After 3 minutes it opens fresh. This protects against closing a window by accident (this pairs with change 1, since closing is now only done on purpose).

**The timer:** It starts when the window closes, not when the user first typed. Keep the 3 minutes as one named constant (for example `DRAFT_MS = 3 * 60 * 1000`) so it can be changed with a one-number edit.

**Where:** Every window and sheet in the app that has typed or selected input. Examples: adding or building a workout in Workouts, the food form, Log Food, Quick Log, the fridge add sheet, the exercise picker, weigh-in, supplements, the template editor. Search boxes remember their typed text too, but do not bring back an open results list or an expanded row. Keep search behind its own small switch (for example `DRAFT_SEARCH = true`), so it can be turned off later if it feels odd.

**What counts as the draft:**

- text typed into any field
- numbers and units picked
- toggles, chips, pills and dropdown choices
- items added to a list inside the window (for example exercises added to a workout being built)

**Reset the draft immediately (before the 3 minutes) when the user:**

- saves or confirms (Save, Add, Log, Done that commits something)
- finishes (for example, finishing a workout)
- discards (any Discard button, on any window that has one)

Closing with the back arrow, tapping outside, or the Done button on a window that only views things does NOT reset it. Those just start the 3 minute timer.

**How to build it:**

- One shared module for this, not a copy in every window. Save drafts by window id through `Store` as device-only data (like `aiKnow` and `brainPrefs`). Never include it in backups, exports or sync.
- Hook the open and close of windows in the shared overlay helpers (`open` and `close`), so every window gets it without being edited one by one. Read the window's inputs by id or by a `data-draft` attribute on each field, and restore them when it opens.
- Throw away expired drafts when the app starts, and when a window is checked.
- Do not restore anything that would be wrong or dangerous after 3 minutes, for example a running timer, a live workout in progress (that already has its own saving), a camera scan, or a barcode scan result.
- A window the user opens for a different item (for example editing food A, then food B) must not get food A's draft. Key the draft by window id plus the item id.

**Check it:**

- Type in a window, close it, reopen within 3 minutes: the values are back.
- Close it, wait over 3 minutes, reopen: it is empty.
- Save, finish or discard, then reopen: it is empty.
- Editing a different item opens with that item's own values, not another item's draft.
- Nothing from drafts shows up in a backup file.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 3. Week Planner: Use The Phone's Native Time Picker

**What:** On the Week Planner in Gym Buddy, with the Advanced switch on, every time field opens the phone's own scrolling time picker (the iPhone wheel). The user only picks the time. No typing, no custom time box. It is easier and feels native.

**Which fields:**

- the gym start time for each day
- the work hours for each day (both start and end)

**How to build it:**

- Use a real `<input type="time">` for each field, so iOS shows its own wheel. The gym card on Today's Food already uses an invisible `<input type="time">` laid over the card (0.6.9). Reuse that same approach and styling where it fits.
- Keep the look of the planner the same: the time still shows as text in the same place and style, and tapping it opens the picker. Only the way of choosing the time changes.
- Find how the planner reads and saves times now (`gymPlan`, `saveG('plan')`, the `time` field) and keep the stored format as it is, so nothing already saved breaks. Convert only if the input's value format differs.
- Remove the old custom time input code for these fields once it is unused.
- Respect the 12 or 24 hour format the phone uses. Do not force one.

**Do not touch:** the simple mode of the planner (GYM or REST per day), saved workouts, and the Carb Timing switch that uses the workout start time.

**Check it:**

- Tapping a gym time or a work time opens the phone's wheel.
- The picked time shows in the planner and is still there after reopening the app.
- Old saved times still show correctly.
- Carb Timing and the gym reminder on Today's Food still read the new times.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 4. Body Weight Chart: Remove Day / Week / Month, Zoom Out Automatically

**What:** In Progress, the body weight chart no longer has the Day / Week / Month selector. The chart picks its own level of detail from how much weigh-in data exists. The user never chooses.

**The levels (by the span from the first weigh-in to the latest):**

- Up to about 4 weeks of data: one point per day.
- From 4 weeks up to about 6 months: one point per week, the average of that week's weigh-ins.
- Over about 6 months: one point per month, the average of that month's weigh-ins.

Keep the cutoffs as named constants in one place (for example `BW_DAILY_DAYS = 28` and `BW_WEEKLY_DAYS = 183`), so they are easy to change.

**How to build it:**

- Find the body weight chart in Progress and the selector that controls it. Remove the selector and its stored state (for example in `ui`), and any strings left unused (EN and GR).
- Add one function that takes the weigh-ins (`weights`, stored by date) and returns the points to draw, grouped by the rules above. Weeks start on the same day the rest of the app uses. Average the weights inside each group. Do not average across missing days; a group with no weigh-ins just has no point.
- The latest weigh-in and the starting weight shown elsewhere (for example in Settings or the hero numbers) stay as the real values, not averages.
- The user does not need to weigh in on a schedule. The chart handles gaps. A user who weighs in rarely still sees their points, and the level changes only by the time span, not by how many weigh-ins there are.
- Units follow the user's setting (kg or lb), as they do now. Stored data stays metric.
- Keep the chart's look, colours and animation the same. Only the data and the removed selector change.
- Label the horizontal axis to match the level (days, weeks, or months), in the same style as the other charts.
- Do not change how weigh-ins are saved. The data format stays the same.

**Check it:**

- A new user with a few days of weigh-ins sees daily points.
- Fake 8 weeks of weigh-ins: the chart shows weekly averages.
- Fake 8 months: it shows monthly averages.
- No selector is visible, and old saved selector values cause no error.
- Weighing in on a day with no previous weigh-in, or deleting one, updates the chart.
- Light and dark mode both look right.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 5. Strength By Muscle: A Row Per Muscle With A Trend Line

**What:** Redesign Strength by Muscle in Progress. The user has never seen it because it unlocks after 10 workouts, so first read how it is built now (find it in Progress, and the "Unlocks after 10 workouts" lock) and report what is there before changing it. Keep the 10 workout unlock.

**The layout:** one scrolling list, one row per muscle (biceps, triceps, chest, back, shoulders, quads, hamstrings, glutes, calves, abs and so on, use the app's own muscle list). Not a separate tab per muscle. Each row, left to right:

- the muscle name on the left
- a small trend line (sparkline) in the middle
- on the right, the percentage change with an arrow: arrow up if it is positive, arrow down if negative

Tapping a row opens that muscle's bigger chart, with the same line, the dates, and which exercises feed it.

**The trend line:** a smooth curve, like a sine wave, through the muscle's strength estimate over time. Draw it as one smooth line with no dots and no axes. Use the same line style as the other charts in the app. It must not be a flat line: it shows ups and downs.

**The muscle's strength estimate:** built from the user's own logged sets, using the exercises that train that muscle, each weighted by how much it uses that muscle (the `mu` percentages on the exercise). Use the estimated one rep max that the app already has (`e1rm`) and the same load rules as the rest of the gym code (`loadOf`, `isMainSet`: warm-up, drop sets and the other side of L/R do not count). Use one estimate per muscle per week or per session, so adding a new exercise later blends in and does not make the line jump. Reuse existing helpers. Do not copy their logic.

**The percentage (what happened overall):**

- It is the total change from the user's first reading for that muscle to the latest one.
- The first reading is fixed. It does not move when the user adds a new exercise.
- Show one decimal place only if under 10 percent, otherwise whole numbers. Add a plus or minus sign.

**The colour (what is happening now), separate from the percentage:**

- Compare the muscle's current strength estimate to its estimate two weeks ago.
- Any real increase, even half a kilo, is green.
- Any decrease is red.
- No change is gray.
- If there was no workout for that muscle in the last two weeks, show gray, not red. Not training is not the same as getting weaker.
- The colour applies to the arrow, the percentage and the line. Use the app's existing green and red roles for Light and Dark, and a neutral gray. Do not add new colours.
- Keep the two-week window and the half kilo threshold as named constants in one place (for example `SBM_WINDOW_DAYS = 14` and `SBM_MIN_STEP_KG = 0.5`).

**Edge cases:**

- A muscle with fewer than 2 readings shows its name and the text "Not Enough Data Yet", with no line and no percentage.
- Muscles never trained are listed last or hidden, in the same style as the rest of the app. Pick whichever matches Recovery.
- Units follow the user's setting (kg or lb). Stored data stays in kg.
- Greek and English strings. Title Case, no emoji.

**Check it:**

- With fake data of 12 workouts, every muscle row shows a line, a percentage and an arrow.
- Fake a two-week drop: red. A rise of 0.5 kg or more: green. No change: gray. No workouts in two weeks: gray.
- Tapping a row opens the bigger chart and back returns to the list.
- Under 10 workouts still shows the lock text.
- Light and dark mode both look right.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 6. CANCELLED: Supplements Stay In The Food Library (Do Not Build)

**CANCELLED by Petros.** Do not move Supplements into Kitchen. Supplements stays in the Food Library as a section, next to Store Bought, Recipes and My Meals. Ignore everything under this heading except the names paragraph, which is still correct. Nothing from this change is built.

**Names (current, from Petros):** Kitchen is the old Fridge page (Fridge and Groceries). Food Library is the old Food Tracker database page. Gym Buddy stays Gym Buddy. The first page is the daily food log (Today's Food, with the daily targets). Use these names in this change and check which ones the code and strings already use. If any of these renames are not done yet in strings (EN and GR), tell me before changing them. Do not rename anything that was not asked for in this list.

**What:** Move the existing Supplements page into Kitchen. No redesign. The page and everything on it stay exactly as they are (the supplement list, doses, times, the take buttons, the Store-bought tab rule). Only where the user finds it changes.

**How to build it:**

- Kitchen already has one selector for Fridge and Groceries (`.fgseg`, one page `#pgFridge`). Add Supplements as a third option in that same selector, using the same sliding pill. Fridge, Groceries, Supplements.
- Reuse the existing Supplements page content. Do not write a second copy. Move or mount it inside Kitchen, the way Groceries was merged into the Fridge page in 0.6.9 (one page, so the pill glides).
- Remove the old separate Supplements entry: the route (`supps`), the tab or hub link, and anything that opened it. Anything that linked to `#supps` (for example a taking reminder or a link from Today's Food) must now open Kitchen on the Supplements option.
- Keep the quick way to log a supplement dose from Today's Food exactly as it works now.
- Keep the page pull order working: pulling past Fridge reaches Settings. Make sure Supplements inside Kitchen does not break that, and that nothing becomes unreachable.
- Keep deep links and back arrows working. Back from Supplements returns to where the user came from.
- Data does not change. `supps` and `suppLog` stay as they are, so nothing is lost.
- Strings in EN and GR. Title Case, no emoji.

**Check it:**

- Kitchen shows three options, and the pill glides between them.
- Supplements inside Kitchen works as before: add, edit, take, undo.
- The old Supplements entry is gone and nothing links to it.
- Existing supplements and take history are all still there after the update.
- Light, dark and Greek all look right.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 7. Food Library Becomes A Hub (My Meals Shows As Coming Soon)

**LATEST DECISIONS (Petros, these override anything below that disagrees):**

**The hub layout.** The Food Library hub is a stack of tiles, top to bottom:

1. A row with two tiles. On the left, **Store Bought** as the main tile: the name "Store Bought" in bold, and "Foods" under it in a quieter, muted weight. Next to it, on the right, a smaller **My Meals** tile.
2. **Recipes**, a full width tile.
3. **Supplements**, a full width tile.

Each tile has its own plain line icon (same icon style as the Gym Buddy hub) and a small count in muted text (for example the number of foods, recipes or supplements). Use the existing tile style from the rest of the app (the same radius, border, background and press feedback as other tiles and cards). Do not invent a new tile look.

**My Meals is Coming Soon.** The My Meals tile is shown in the hub, but it is disabled: it cannot be opened, it shows a small "Coming Soon" label, and it is visibly dimmed. Do not build the My Meals screen, the add flow, the logging, or the Combos migration in this round. Everything below that describes My Meals in detail is for later and must NOT be built now. Keep combos working exactly as they do today. My Meals will be designed in a later round.

**Shakes:** Not a separate section. They will live inside My Meals when it is built.

**The carousel:** Inside a section (Store Bought, Recipes, Supplements), the pill on top is the rotating carousel from change 11. My Meals is in the carousel as a disabled, dimmed pill with the same Coming Soon label, so it cannot be selected.

**Why:** A friend put chicken and rice into Recipes, but that is a ready meal the user eats again and again, not a recipe. A protein shake is the same. The Food Library needs a separate place for repeat meals, and with four sections the single row of pills gets crowded.

**Update:** The Food Library has four sections, not three: Store Bought, Recipes, Supplements and My Meals. Supplements stays here (change 6 was cancelled). Wherever this change says three, read four. Where it lists the entries, add Supplements as the third entry, with its own line icon and count, using the existing Supplements page unchanged.

**The new structure:** The Food Library (the old Food Tracker database page) works like Gym Buddy. It opens on a hub with four entries. Tapping one opens that section full screen, with a plain back arrow and its own pills on top, like Workouts and Progress inside Gym Buddy.

- **Store Bought** (what is there today)
- **Recipes** (what is there today)
- **My Meals** (new)

Reuse the Gym Buddy hub code and styling (the entries without a box, plain line icons, the gliding pill inside each section). Do not write a second hub system. Each entry gets its own line icon in the same style as the Gym Buddy hub icons (`ICON` and `svgIcon()` in ui.js). Under each entry, show a small count (for example "42 Foods", "6 Recipes", "4 Meals").

**Name:** My Meals. It must cover plates (chicken and rice), shakes, snacks and anything the user eats as one repeat item. Do not call it plates anywhere in the app.

**My Meals, what it is:** A saved set of foods with amounts, logged in one tap. It is not cooked from ingredients, and it has no total cooked weight. It is a list of foods and amounts, with the totals worked out live.

**My Meals, how it works:**

- Same layout style as Store Bought and Recipes: a list of cards, a search box, and the same add button style.
- The add button opens a window: name it, add foods with amounts (use the same Log Food search and the same amount and unit picker, with grams by default), and see the total calories, protein, carbs and fat update live as foods are added.
- Tapping a meal opens it for editing: change the name, change an amount, add or remove a food, or delete the meal.
- Each row in the list shows the name, the total calories, and P, C, F.
- In Log Food, My Meals appear in the same place Combos do now. The plus button on a meal logs everything in one tap, with Undo. Tapping the name opens the details.
- Logging a meal adds its foods to the Eaten list on Today's Food as normal entries, with the amounts, so editing or deleting one food later works as usual.
- Fridge: if a food in the meal is in the fridge, logging takes it out of the fridge the same way logging a single food does. Do not add anything to Groceries for foods that are not in the fridge (the existing Groceries rule stays).

**Combos (from 0.6.9.3):** Fold them in. A saved combo becomes a meal. Migrate the existing `combos` data (`ft.combos.v1`) into My Meals so nothing is lost, and keep "Save as combo" in Log Food, renamed "Save As Meal". Report what you did with the old name and collection, and keep the backup and import working for old backups that still contain `combos`.

**Recipes:** Do not change how Recipes work. Check the cook flow (Cook a Meal, My Own Recipe, Suggest a Recipe) and report whether anything there should point to My Meals. Do not change it without asking.

**Where it lives:**

- Save meals as a synced collection with a unique id and a last changed time, like the other synced data (`Store`, the sync table, backups and imports).
- Do not bump the schema version unless it is really needed. If you add a field or collection, add it to the backup, the import and the upgrade function.

**The hub rule, for every hub in the app (this applies to Gym Buddy and the Food Library, and to any other page that works like a hub, such as Kitchen):**

- Leaving a main tab and coming back later always lands on the hub, from the start.
- If the user closes or leaves the app and comes back within 3 minutes, the hub shows the same section and the same place they left, using the same timer and the same shared draft module as change 2. The timer starts when they leave. After 3 minutes the hub opens fresh.
- Pressing a main tab from inside a section sends the user to that tab's hub.
- Make this one shared rule in the shared navigation code, not a copy per page.

**Check it:**

- The Food Library opens on the hub with four entries and counts.
- Store Bought and Recipes work exactly as before inside their sections, including search, sort, add, scan and Check My Foods.
- Create a meal with a protein shake (milk, whey, banana). The totals are right and match logging the foods one by one.
- Log the meal from Log Food in one tap. All foods appear in Eaten. Undo removes them all.
- Old combos show up as meals after the update. Backups from before the update still import.
- Leave the tab and return: the hub. Leave the app inside My Meals and return within 3 minutes: still in My Meals. After 3 minutes: the hub.
- Light, dark and Greek all look right. Title Case, no emoji.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 8. Exercise Picker Menu: WORK IN PROGRESS (Do Not Change The Menu Yet)

**Status:** WORK IN PROGRESS (Petros, latest). Petros still needs to look into the exercise picker menu more. \*\*Do not change the actual exercise picker menu in any way in this round.\*\* Keep the Upper and Lower pills, the body map, the body and list modes, the equipment grouping, the sort toggle, the search position and every other part exactly as they are today. Nothing in this change is built or started. The only exercise picker work that is allowed is the shared exercise search engine in change 16, and it must not move or restyle anything in the menu. Everything below is notes for a later round. Petros has not decided between two designs. **Do not build any part of this change until he decides.** Only report how the picker is built today (the body map, the Upper and Lower pills, the sort toggle, the equipment grouping, where the search sits) so the next conversation can start from facts.

**Option A (the layout below):** Upper and Lower pills, the body map with no card under them, then the list card, with search pinned at the bottom. Tapping a muscle on the body filters the list. Keeps the anatomy look that matches Recovery and the Form page. Open problems: no mid chest region, and the cropped body uses a lot of height.

**Option B (new, from Petros):** Drop the body map from the picker. Upper and Lower pills, then a two column grid of muscle category tiles (each with a small muscle icon). Tapping a tile opens that muscle's exercises, with search pinned at the bottom. Bigger tap targets, no cropping, and chest becomes one tile whose list is ranked from incline to decline, so mid chest is a position in the list. The body map would stay on the exercise info page and the Form page. Cost: one extra tap before the list (unless the grid and list share one screen), and the picker loses the anatomy look.

**Claude's honest view:** B is better for speed, crowding and small phones. A is better for the premium, consistent look. Since the complaint was crowded rather than slow, try B first with small muscle icons on the tiles, and bring A back if it feels cold. A mockup of B will be made in the text chat so Petros can choose by looking.

**Why:** The picker feels crowded. Body and List are two separate modes, with pills, mini muscle maps, tags and a search box all competing for space.

**Where it is used:** The same picker serves two jobs. It adds exercises to a live workout, and it builds a saved workout in the template editor. Every change below must work in both.

**The layout, top to bottom (decided):**

```
[ Upper | Lower ]          <- the only pills

      (body map)           <- no card, no frame

+---------------------------+
| Barbell                   |
|   Exercise rows           |
| Dumbbell                  |
|   Exercise rows           |
+---------------------------+

[ Search ]                 <- pinned to the bottom
```

**Pills:** Upper and Lower only. Remove the Cardio pill and the cardio entries from the picker completely. The app is for lifting and cardio needs fixing, so it is not used. Do not delete any cardio data. Old saved sessions that contain cardio must still show and count as before.

**Body and List become one thing:** The body map sits directly under the pills with no card around it. The exercise list is below it, inside its own card, in the same card style as the exercise cards elsewhere in the app. Tapping a muscle on the body filters the list to that muscle. Tapping the same muscle again clears the filter. With nothing tapped, the list shows every exercise for Upper or Lower.

**The body crop:**

- Upper: crop tighter. Cut off the legs, and cut a bit more toward the hands. The body gets smaller in height so the list has more room.
- Lower: keep exactly as it is now. It cannot be cropped any more.

**The list card:** Keep the equipment grouping as it works today (a Barbell heading, then barbell exercises, then Dumbbell and so on), unless the open questions below change it. The search box stays pinned to the bottom of the sheet, above the keyboard, while the list scrolls above it, exactly as it works today. It is not inside the list card. Petros decided this after seeing the mockup.

**How to build it:**

- Find the picker and reuse its data, filtering, `mu` muscle percentages and the existing body map. Do not write a second picker.
- Reuse the card styling from the rest of the app. No new colours.
- Keep the existing behaviour that the sheet cannot drift sideways and that the keyboard does not cover the list.
- Strings in EN and GR. Title Case, no emoji.
- This is a layout change. Do not change how exercises are added, swapped, or saved.

**Check it:**

- The picker opens from a live workout and from the template editor, and both show the same layout.
- Upper shows the cropped body, Lower shows the body as before.
- Tapping a muscle filters the list, tapping it again clears it.
- Search stays pinned at the bottom, above the keyboard, and the list scrolls above it.
- No Cardio pill and no cardio rows. Old sessions with cardio still show correctly.
- Light and dark mode both look right, and nothing overflows on a small iPhone (13 mini).
- No console errors, nothing declared twice (`claude/test/redecl.js`).

**Open questions (not decided, do NOT build these yet):**

- **Upper, mid and lower chest.** The body has upper chest and lower chest but no mid chest. Petros asked how to tell them apart. Options so far: (a) no mid chest region, flat presses appear under both upper and lower chest, ranked by usage, with the percent shown on each row; (b) rank the list from incline to decline when chest is tapped, with a small bar on each row showing where it sits; (c) a real mid chest option defined by exercise, not by a drawing. Petros wants something more creative than a plain tap. Undecided.
- **A small toggle.** Petros mentioned a small toggle but has not said what it switches. Candidates: front and back on the body, hiding the body to give the list more room, or grouping by equipment versus sorting by muscle usage.
- **Less crowded rows.** Ideas not confirmed: one muscle line per row (for example "Chest, triceps, shoulders") instead of a mini muscle map and separate tags, collapsible equipment groups, and the sort control behind a small button.
- **Feel and smoothness ideas, not confirmed:** a plus button on every row that adds the exercise and keeps the window open with a small counter (useful when building a saved workout); upper and lower pills that stay pinned while the body shrinks as the list scrolls; a half height sheet when opened from a live workout, full screen when building a saved workout; a shelf of recent exercises when live, and a shelf of what is already in the template when building.

For the open questions, only report how the picker handles chest and the toggle today. Do not change them until Petros decides.

### 9. Food Rows: Calmer, More Premium Look

**Why:** The Food Library rows (seen in Petros's screenshot) feel like a form, not a premium list. Too many boxes and too many colours compete on one row (teal kcal, green amount pill, four macro colours, a blue basis pill). This is a polish change. It does not add features.

**1. Calories are neutral, everywhere (decided).** The kcal number is black in Light mode and white in Dark mode, not teal or accent. Apply it in every place the app shows a kcal figure, not only the Food Library. Examples: Food Library rows, Log Food rows, Eaten rows on Today's Food, My Meals, Recipes, the amount sheet, fridge rows, Quick Log. Use the existing primary text colour token so it flips with the theme and with every accent preset. The word "kcal" next to the number stays in the muted text colour. Do not change the hero card's big kcal number style (italic, size) or the bar colours. Only the colour of the kcal numbers changes.

**2. Macro letters keep their colours, numbers go neutral (proposed, Petros has not confirmed).** P, C, F and Fi letters keep their macro colours (Protein, Carbs, Fat). The numbers next to them use the neutral text colour. Treat this as a suggestion and ask Petros before finishing it.

**3. One container per category (proposed, not confirmed).** Instead of a separate card for each category header and another card for each food, show the category name as a small muted label above one rounded container, with the foods inside it separated by hairline dividers. Same information with far fewer borders.

**4. The name is the hero, with a bigger food icon (decided).** Food row layout, top to bottom on the left side:

- Top left: the food's category icon, bigger than today so it shows up better (for example the meat icon for chicken). Use the existing category icons (`catIcon` or whatever the app uses now). Do not add new artwork. If a food has no icon, show the same fallback as today.
- Directly under the icon: the food name, larger than today and in medium weight. It is the most prominent text on the row.
- If the food has a brand, show it as small muted text next to the icon, on the same line. It must not pop. If there is no brand, show nothing there. Remove the "NO BRAND" label completely.
- The kcal stays on the right side of the row, in the neutral colour from item 1.

Keep the row compact. A bigger icon must not make rows much taller. Check that long names wrap to two lines cleanly and never push the kcal off the row. Apply this layout to the Food Library rows first, then report where the same food row is reused (Log Food, My Meals, Recipes, fridge) and ask before changing those.

**5. Quiet the extras (decided).** Two small things on the food row become plain muted text, with no coloured pill and no outline, in the same place as today:

- the "per 100 g, cooked" basis label
- the fridge amount (for example 300 g in stock)

**5b. Macros: coloured per macro, fibre removed from the row (decided).** The P, C and F values stay prominent. Each one uses its own macro colour (Protein, Carbs, Fat roles from the design system) for both the letter and the number. Remove fibre (Fi) from the food row completely. Fibre data stays saved and stays visible in the food's details and form. Only the Food Library row changes for now.

**6. Top controls of the Store Bought list (decided).**

- Remove the "N foods" count on the top left. The count stays in the All Foods header, where it already shows.
- Put the Check My Foods button in that top left spot, and keep its AI badge.
- Sort stays on the right.
- The All Foods fold is not decided. Report what it does today. Do not remove it yet.

**How to work:** Build item 1 now. For items 2 to 6, make a short written plan with what you would change and ask Petros before building. Do not touch the section pills at the top of the Food Library. They are being replaced by the hub (change 7), and Supplements stays in the Food Library (change 6 was cancelled).

**Check it:**

- Every kcal number is black in Light and white in Dark, in every accent preset.
- Nothing else changed colour, and the hero card looks the same.
- Contrast is readable on every card and sheet.
- Greek and English both fine.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 10. Recipes Section: One Pill For The Cook Options

**Context:** The Food Library becomes a hub (change 7). Tapping Recipes opens the Recipes section full screen, with a back arrow and its own pill on top, like Workouts and Progress inside Gym Buddy. The old top pill (Store Bought, Recipes, Supplements) is gone. Supplements stays in the Food Library as its own section (change 6 was cancelled).

**What:** Recipes currently shows Suggest a Recipe and a quick recipe option at the top of its screen, and the same options again inside Cook a Meal. Remove the duplicate buttons from the top. Make one sliding pill in the Recipes section with three options:

- Suggest
- My Own
- Quick

Keep the labels short so three fit on a small iPhone (13 mini). Use the same sliding pill component as the other selectors (`.mpill`, `.knob`, `pillSync()`). It is the only pill on that screen.

**How to build it:**

- Find where the two options appear at the top of Recipes and where they appear in Cook a Meal. Report both.
- The Cook a Meal button and its two choice window (My Own Recipe, Suggest a Recipe) are replaced by this pill. Reuse the existing content of each option. Do not rewrite the cooking logic.
- **Suggest:** the existing Suggest a Recipe (food name box with ingredient bubbles and time chips, normal adult portion).
- **My Own:** the existing My Own Recipe (title, ingredients, total weight worked out quietly).
- **Quick:** the free write quick add where the AI fills everything in. Petros called it the quick recipe. Check how it works today and report it. If it is not clearly a separate feature, ask before building.
- Saved recipes still list below or beside the pill as they do today. Check the layout and report before moving anything.
- Remove any unused buttons, strings (EN and GR) and CSS after this.

**Check it:**

- Recipes shows one pill with three options, and the pill glides between them.
- Each option works as before.
- The duplicate buttons at the top are gone and Cook a Meal is no longer a separate step.
- Light, dark and Greek all look right, nothing overflows on a small iPhone.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 11. Rotating Pill Carousel (Food Library And Gym Buddy)

**What:** The section pills on top of a hub become a rotating carousel. The selected pill always sits in the middle. Its neighbours sit on the left and right. When the user slides to another section, the whole row glides so the new pill ends up in the middle, and a pill from the far side slides in. Like the iPhone camera mode picker.

**Example, Food Library (four sections: Store Bought, Recipes, Supplements, My Meals):** Recipes selected means Store Bought on the left, Recipes in the middle, Supplements on the right. Slide to Supplements, and Recipes moves to the left, Supplements to the middle, My Meals comes in on the right. All sections are always reachable in the row.

**Where:** The Food Library hub pill (Store Bought, Recipes, Supplements, My Meals) and the Gym Buddy hub pill (Workouts, Progress, Week Planner, Partner, and Recovery, which now joins the carousel as one of its pills). Build it as one shared component and use it in both. Leave the small two and three option selectors (Front and Back, Day, Week and Month, Fridge and Groceries) as the normal sliding pill. Report any other selector that has five or more options.

**It must feel really smooth and premium (Petros's main requirement):**

- Use native scroll snap (`scroll-snap-type: x mandatory`, `scroll-snap-align: center`) so the row settles on a pill by itself.
- The selected pill highlight glides under the centred pill using the same accent pill style as `.mpill`. Spring easing `cubic-bezier(.3,1.3,.6,1)`, about 0.26 s.
- The pills near the edges fade and shrink slightly, for example opacity down to about 0.4 and scale to about 0.9. The selected pill is full size.
- Tapping a pill that is not selected scrolls it to the centre and selects it. Swiping the row does the same.
- The page content under the pill changes together with it, with a light cross fade. No blank flash.
- A light haptic tick on each snap, through the phone layer (`Phone.*`).
- Only animate `transform` and `opacity`, so it stays at 60 frames on an iPhone. No layout changes during the scroll. Use `will-change: transform` only on the moving row.
- Reduce Motion: no spring and no scaling, just a quick fade and an instant jump.
- Keep the selected section when the user returns within 3 minutes, and start from the hub otherwise, as in change 7.
- Respect the existing safe areas and the blurred top fade. Do not let the carousel sit under the status bar.
- Do not use a heavy carousel library. Write it small, with plain scroll snap and the existing pill helper (`pillSync()`).

**Check it:**

- Swiping and tapping both centre the pill, and the content follows.
- The first and last pills can still be centred. Add edge padding so they can.
- Smooth at 60 frames, no jumps, no flicker on first open.
- Light, dark and Greek. Long Greek labels still fit.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 12. One Frosted Button Style Everywhere

**Why:** The little coloured bubble in the bottom navigation bar has a frosted look that is different from the buttons in the rest of the app. Petros wants continuity: the same style on every button.

**What:**

- **Coloured buttons** (the ones filled with the accent or theme colour, for example Add Food, Log Food, End Workout, New Set, Done, and the selected pill): take the same frosted look as the bubble in the bottom navigation bar. Inspect that bubble (its fill, translucency, blur, edge and highlight in Dark and in Light) and copy those exact values into a shared style. Do not invent a new look.
- **Uncoloured buttons** (the white buttons in Dark mode and the black buttons in Light mode, for example Scan Food, secondary buttons, Discard-style soft buttons): get the same frosted treatment, in their own colour, so they match the coloured ones.
- **Tabs and the sliding pills stay as they are.** Petros likes them. Do not change `.mpill`, `.seg` or the pill knob. Only buttons change.
- **Tiles** (including the new Food Library hub tiles) use the app's existing tile style. Do not frost them.

**How to build it:**

- Make it one shared set of CSS variables and classes in the design system (`css/theme.css`, the last block), for example one frosted fill, one frosted edge and one highlight, with a coloured and an uncoloured version. Point the existing button classes at it. Replace the old styles, do not layer new ones on top.
- Reuse the bottom bar bubble's values by reference, so changing one place changes both.
- Keep press feedback (scale 0.96 and dim) and the Reduce Motion rule.
- Blur is only allowed on floating things according to the design rules (bottom bar, sheets, the AI bubble). Buttons sit on solid cards, so check how the frosted look is made without a real backdrop blur there (a translucent fill with an edge and an inner highlight). If it needs a real blur to look right, report it and ask before adding blur to buttons.
- Text on every button stays readable in all nine themes, in Light and Dark. Use the existing `--t-on` and `--t-mp-text` roles.

**Check it:**

- Go through every page and sheet and list any button that still has the old style.
- Coloured and uncoloured buttons look like they belong to the same family as the bottom bar bubble.
- All nine presets, Light and Dark, and Greek.
- Smooth scrolling is not affected on an iPhone.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 13. Coach Bubble Glides To The Top Right And Opens Bigger

**What:** When the user taps the floating coach bubble (Food Coach or Gym Coach, the robot bubble `aiBub`) wherever it is sitting, for example the bottom right, the bubble glides to a fixed spot at the top right of the screen, and the chat opens as a bigger panel hanging from that corner. This gives the chat more room to show more messages. When the chat closes, the panel shrinks away and the bubble glides back to the exact spot where the user had left it.

**The spot (decided):** Always the top right, whichever side or height the bubble started on. Keep it under the status bar and the blurred top fade, inside the safe area.

**The panel (decided):** A panel taking most of the screen height, wide enough to read comfortably, with its corner anchored to the bubble's top right spot. The keyboard must still fit: when it opens, the message list keeps the latest messages visible and the input stays above the keyboard.

**The motion, as one continuous movement (decided):**

- Opening: the bubble glides to the top right with a spring. The panel **starts opening before the bubble gets there**, at about the halfway point of the glide, growing out of the bubble. The glide and the open overlap. They are not two separate steps.
- Closing: the reverse. The panel shrinks back first, and the bubble glides back to its previous position as the panel finishes shrinking.
- It must feel smooth and premium. Only animate `transform` and `opacity`. Do not animate width and height directly. Use a scale from the bubble's corner with `transform-origin` at the top right. Spring easing `cubic-bezier(.3,1.3,.6,1)`, about 0.35 to 0.45 s in total.
- Reduce Motion: no glide and no scale, just a quick fade, and the bubble jumps.

**How to build it:**

- Find the bubble (`aiBub`, `gymHeadRobot`, `#sesCoach`) and the coach chat sheets. Report how they open today.
- Remember the bubble's resting position before opening, and restore exactly that on close (including if the user dragged it somewhere). Save nothing extra to storage.
- This applies to both Food Coach and Gym Coach, from every page where the bubble shows. In the live workout, the Gym Coach robot sits in the header, so keep that header behaviour as it is. Report whether this change applies there and ask before changing it.
- The thinking and ready animations on the bubble (robot faces, glow, green tick) keep working while it moves.
- Close by the existing ways. Add no new gestures (no swipe down to close, per change 1).

**Check it:**

- From bottom right, bottom left and middle, tapping the bubble sends it to the top right and opens the chat.
- The panel is already growing before the bubble arrives.
- Closing returns the bubble to exactly where it was.
- Works with the keyboard open, in Light, Dark and Greek, and on a small iPhone.
- No jank at 60 frames, no flicker.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 14. Social Hub Leaderboard: Friends, One Rep Max, Three Lifts

**Context:** The social hub already exists, and its leaderboard currently has Max PR and Strength. Petros has also already added a small one rep max toggle on three exercises: bench press, deadlift and squat. A set with that toggle ticked is a real tested single (one repetition at any weight). Read how the social hub, the leaderboard and that toggle are built today before changing anything, and report it. Do not rebuild what already exists.

**What (decided):** Make the leaderboard one big friends leaderboard for one rep max only.

- Remove the Strength view. Only Max PR remains. Keep the Max PR data and code if other things use them, and report what you removed.
- At the top, an exercise pill. Tapping it drops down a menu with exactly three choices: Bench Press, Deadlift, Squat. The user picks one, and the leaderboard shows that lift.
- **Friends only.** The list shows the user's friends. No global list.
- **What counts:** only sets where the one rep max toggle was ticked on that lift. It is the real heaviest tested single, not an estimate (do not use `e1rm`). Per friend, show their best ticked weight for that lift.
- **Each row, left to right:** the rank number on the left, then the profile picture, then the username, then the weight they lifted on the right. Use the user's unit setting (kg or lb). Data stays stored in kg.
- **Colours:** rank 1 is gold, with the number and the username in gold. Rank 2 is silver, rank 3 is bronze, the same way (number and username). Everyone else is white (the normal primary text colour, which is white in Dark and black in Light). Use the existing colour roles where possible and add three named tokens for gold, silver and bronze that work in Light and Dark. Do not add them as accent colours.
- **The user's own row:** include the user in the list, ranked with the friends, with a subtle highlight (for example a faint accent background) so they can find themselves. If the user has no ticked single for that lift, show a short line under the list: "Tick One Rep Max On A Set To Join". Petros has not confirmed showing the user in the list, so make it easy to remove.
- **Ties:** same weight shares the rank. The one who lifted it first is listed first.
- **Empty states:** no friends yet: a short line and a button to add friends (use the existing flow). Friends but none with a ticked single: "No One Rep Maxes Yet" and what to do next.
- **Dates:** show nothing extra on the row. Tapping a row may show the date it was lifted, only if that already exists.

**How to build it:**

- Reuse the pill and drop down style used elsewhere in the app. The frosted style is covered in change 12.
- Do not add new data collection. Use the existing friend data, usernames, profile pictures and the sets with the toggle. If the friends data needs a server that does not exist yet (the roadmap says the leaderboard needs accounts and sync), report exactly what is missing and build the screen against the data that exists. Ask before adding anything that needs a server.
- Strings EN and GR. Title Case, no emoji.
- Smooth: the drop down and the list change use the same motion rules as the rest of the app, and Reduce Motion is respected.

**Check it:**

- The pill shows the three lifts and switching changes the list.
- The top three are gold, silver and bronze, the rest are white, in Light and Dark.
- Only ticked one rep max sets count, and a heavier non-ticked set does not.
- Switching units shows the right weights.
- Empty states look right.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 15. Social Hub Profile: Stats, Streak Pill, Highest Ranked Exercises, No Body Weight

**Context:** This is the profile part of the social hub (the leaderboard is change 14). Read how the social hub profile is built today (the stats cards, the streak box, the Highest Rank box, the body weight part) and report it before changing anything. Do not rebuild what works.

**1. Remove body weight from the social hub (decided).** Nothing about body weight shows anywhere in the social hub: no body weight leaderboard, no weights on profiles, no body weight stat. It is private data. Do not delete any weigh in data, and do not touch body weight in Progress or Settings.

**2. Stats: six cards instead of five (decided).** Add one extra stat card so the grid is even and symmetrical (two columns, three rows, or whatever matches the current layout). The existing five stats are placeholders, and more will come later, so build the grid so adding cards later is easy. Do not change or remove the five. For the sixth, pick any stat from what the app already tracks (for example total workouts, longest streak or total volume lifted), in the same card style. Petros does not care which one. Tell him which you picked.

**3. Stat card text (decided).**

- The title on each stat card is slanted, bold italic, like the other important text in the app (see the type rules in `claude/visual-spec-8nov.md`).
- Under the title there is always exactly **one line** of description. Never two or three lines. Shorten the wording if needed so it fits on one line on a small iPhone (13 mini), in English and in Greek. Do not let it wrap, and do not cut it with dots if shortening is possible. The card must not grow taller because of the description.

**4. Workout streak becomes a small pill on the profile picture (decided).**

- Remove the streak from its box on the left side of the social hub.
- Put it as a small pill with a flame icon and the number (for example a flame and 12), on the **bottom right corner of the profile picture**, overlapping the edge a little. Use a line style flame from the app's icons (`svgIcon()`), no emoji.
- The box where the streak used to be: remove it, and make sure the layout closes up without a gap. Report what moved into the space.
- The pill follows the frosted button style (change 12) and is readable in Light and Dark.

**Name change (decided):** The card called Highest Rank is renamed **Highest Ranked Exercises**, in English and Greek. Wherever this change or the app says Highest Rank for this card, use the new name.

**5. Highest Rank fills the whole screen width (decided).**

- The Highest Rank box becomes a full width card, wider and longer than today, so it can show the user's **three best ranks** across exercises.
- The three rank icons are **big**, with their full detail visible (use the existing rank artwork and animations if they exist, check the rank files in the project such as `rank-icons.md`, `rank-plates.js`, `rank-change.js` and `rank-change.css`, and report what exists). Do not draw new rank artwork.
- Under each icon: the rank name in text, for example "Gold 2".
- **Tapping a rank icon** pops out a small bubble next to it that says which exercise it belongs to, for example "Bench Press". The bubble closes when the user taps elsewhere or after a few seconds. Smooth pop and fade, and Reduce Motion is respected.
- The three shown are the user's three highest ranks. Break ties by the most recent. If the user has fewer than three ranks, show what exists and leave the rest as a quiet empty slot with a short line explaining how to earn a rank.

**Check it:**

- No trace of body weight anywhere in the social hub.
- Six stat cards, even layout, each with an italic title and a one line description, in English and Greek.
- The streak pill sits on the bottom right of the profile picture, and the old streak box is gone with no gap.
- Highest Rank is full width, shows three big rank icons with names, and each tap shows its exercise bubble.
- Light, dark, and a small iPhone all look right.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 16. Exercise Search: Smarter, One Continuous Ranked List

**Why:** Petros wants exercise search to feel like the app understands what he means. People confuse exercise names (for example a chest fly on the machine and a pec deck are the same movement, but people use both names). Typos and spacing differences should not break search. It must feel premium.

**Where:** Every place the user searches exercises: the exercise picker (live workout and template editor), the Workouts library, the Swap sheet if it has search, and anywhere else. Build it as ONE shared exercise search function, in the same spirit as the food search in `js/search.js` (word order, plurals, typos, `SYN_GROUPS`, did you mean). Read `js/search.js` and reuse its ideas and helpers. Do not write a second copy of the same logic. Report how exercise search works today before changing it.

**What it must understand (decided):**

- **Greek and English in the same search box.** Typing in Greek finds the exercise, typing in English finds the same exercise. Ignore Greek accents and tones (for example `πολυ` finds `πολύ`), the final sigma, and upper or lower case. Also understand Greeklish (Latin letters typed for Greek words) if it is cheap. Each exercise needs its Greek and English names and synonyms (the exercise data already has `en` and `el` names, check it).
- **Synonyms and confusions.** One exercise can be known by several names, and similar exercises should come up together. Add a synonym table for exercises, for example: pec deck, chest fly machine, machine fly, butterfly, pec fly; pull up, pullup, chin up as a close neighbour; lat pulldown, pulldown; romanian deadlift, RDL; skull crusher, lying triceps extension; and so on. Build the table in one data file, easy to extend. Mark which names mean the exact same exercise and which are only close.
- **Typos.** `pec duck` finds `pec deck`. Match by the closest letters (edit distance, tolerant of one or two wrong, missing, extra or swapped letters, with the allowed distance growing with word length). Prefer names that start with the same letters.
- **Spacing.** Words written together or apart both work, in both directions: `pullup` finds `pull up`, and `pull up` finds `pullup`, `benchpress` finds `bench press`, `lat pull down` finds `lat pulldown`. Compare with all spaces and hyphens removed as an extra pass.
- **Word order and plurals.** `press bench` and `bench presses` find the bench press.

**How results are shown (decided): ONE continuous list.** There are no section headings, no "Similar" label and no divider line. As the user types, one list shows all the results ranked by how likely they are what the user means. Ranking, best first:

1. exact name or exact synonym matches
2. close matches after fixing typos and spacing
3. same movement under another common name (for example the pec deck for a chest fly on the machine)
4. similar exercises: same main muscle and the same kind of movement, ranked by how close they are (use the existing muscle usage `mu` and movement pattern `p`, and the cosine similarity already used by the Swap sheet) Within each level, use the user's habits as a tie breaker: exercises they have done recently or often come first. Keep the list short: show about 8 to 12 results, and more only when the user scrolls.

**The premium feel (decided, Petros said to make it as premium as possible):**

- The list updates on every keystroke, with no delay the user can feel. Do the matching on the phone, and keep it fast (precompute a normalised search index when the exercise list loads, do not re-normalise 300 exercises on every key).
- **Smooth reorder.** When the typed text changes, rows that stay glide to their new position, rows that leave fade out, and rows that arrive fade and slide in lightly. Use transform and opacity only (a simple FLIP animation: measure the old position, apply the new order, animate the difference). No full redraw, no flash, no jumping scroll position. Keep each row's DOM element by exercise id so the same row moves instead of being recreated.
- **Matched letters in bold.** In each row, the letters that matched the typed text show in bold, also when the match came through a typo fix or a synonym. When a result matched through a synonym, show the matched name in small muted text under the name, for example `Pec Deck` with `also called Chest Fly Machine` under it.
- The first result is subtly highlighted so the user sees what the engine believes they mean. Pressing the keyboard's search or return key picks it.
- A clear `x` button on the search box. Empty text shows the normal list as today.
- No results at all: show the closest few as `Did you mean` (as the food search does) and an option to add a custom exercise (the existing custom exercise flow).
- Respect Reduce Motion (a quick fade, no sliding).
- Keep the search box where it is. Where the search box sits in the picker is part of change 8, which is undecided. Do not move it.

**How to build it:**

- One module, for example `js/exsearch.js`, with a small public API (`ExSearch.query(text, options)` returning ranked ids with the reason and matched ranges). It touches the exercise list and no global state. Add the script line to `index.html` and `sw.js` if a new file is needed, and say so.
- Add Greek and English synonyms and the typo tolerance as data and small functions, not as one huge if chain.
- Write a test list like `claude/test/search.js` for exercises: `[query, a word the top 3 must contain]`. Include at least: pec duck, pec deck, chest fly machine, machine fly, pullup, pull up, pull-up, benchpress, lat pull down, rdl, skull crusher, and ten Greek ones (with and without accents, upper case, Greeklish). Every build must pass the whole list. Add it to the test README.
- Strings EN and GR. Title Case, no emoji.

**Check it:**

- The test list passes, and the average search time is under a few milliseconds.
- Greek and English both work, with and without accents.
- `pec duck`, `pullup`, `chest fly on the machine` all show the right exercise at the top, with the pec deck on the list for the last one.
- Typing quickly never flickers, never loses the scroll position, and never shows two lists.
- Light, dark and a small iPhone all look right.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 17. Recovery: Tiles For Recovering Muscles Only

**Why:** Petros likes how the body is shown in Recovery and wants the page to feel more premium. The part he wants to change is the muscle rows under the body, which are long sentences like "Sore, trained 12 h ago". Read how `renderRecovery`, `recMap` and the Recovery page are built today (the body card, the Ready and Needs Rest bar, the Front and Back pill, the labels under the feet) and report it before changing anything. The 0.7.10 coach brain plan has `Brain.recovery()` feeding the same data. Use whatever the page reads now. Do not change how recovery hours are worked out.

**What stays (decided):** The anatomy body and the card behind it stay as they are. The Front and Back pill on top stays. Colours stay green, yellow and red for Ready, Recovering and Needs Rest.

**1. Only recovering muscles are listed (decided).** Under the body card, show only muscles that are not ready yet. Muscles that are ready are not shown at all. If they are ready, they are ready.

- If every muscle is ready, show one full width card, the whole width of the screen, with the text "All Muscles Ready" and a green tick. Not an empty space.

**2. The muscle tiles (decided).**

- A two column grid of rectangular tiles. Two per row, not three.
- **Top of the tile:** the muscle name.
- **Middle:** a small picture of the actual muscle, cropped from the same anatomy model the page uses, zoomed on that muscle and lit in its recovery colour (yellow for Recovering, red for Needs Rest). Reuse the existing anatomy SVG regions. Do not draw new artwork. If a muscle is made of several regions, light them all and crop to fit.
- **Bottom, under the picture:** a clock icon (line style, `svgIcon()`), with the hours left next to it, for example "48" then "47". Hours only. Never days. Add the unit "h" or "hrs" in muted text if it fits, in the user's language. The number counts down as the muscle rests, and updates while the page is open (a light update each minute is enough, no full redraw).
- **Sorting (decided):** most sore first (the muscles with the most hours left at the top). Break ties by name.
- Tiles use the app's existing tile and card style (same radius, hairline edge and press feedback as other tiles). Do not frost them.
- Tapping a tile may open that muscle's detail only if something like that exists already. Add nothing new for it.

**3. The legend moves into the anatomy card, split to the two ends (decided).** The Ready and Needs Rest labels (and the simple bar they belong to, as it looks today) move into the anatomy card itself and run along the bottom edge of that card. The bar spans the card's width. Under the bar, at its two ends:

- **Ready** on the left end, in **green**.
- **Needs Rest** on the right end, in **red**.

Use the existing green and red roles (Light and Dark). The bar itself stays simple, exactly as it looks now: it does not show live counts. Only its place, the position of the two labels and their colours change. The old legend below the card is removed.

**4. Remove the Front and Back labels under the feet.** Delete the text labels under the feet of the two anatomy models. The Front and Back pill on top remains the control.

**How to build it:**

- Reuse the data the page already reads (`recMap()` or `Brain.recovery()`). Do not add a second source and do not change the hours maths.
- Keep the muscle ids mapped to the anatomy regions as they are now, in both the current and the later anatomy models.
- Strings EN and GR, Title Case, no emoji. Reduce Motion respected. Tiles appear with a light fade, and when a muscle becomes ready its tile fades out and the others glide up (transform and opacity only).
- Remove the old row list code and CSS once it is unused.

**Check it:**

- With fake data: a mix of Ready, Recovering and Needs Rest muscles shows only the recovering ones as tiles, sorted most sore first, two per row.
- With everything ready: one full width "All Muscles Ready" card with a green tick.
- Hours count down and never show days. 48 shows as 48.
- The legend sits inside the anatomy card, Ready left in green, Needs Rest right in red.
- No Front and Back text under the feet.
- Female body and male body both work. Light, dark, Greek and a small iPhone all look right.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 18. Coach Pills: Log Food Window Cleanup, Snap Back To Pill, Gym Coach The Same

**Context:** The Food Coach shows as a pill next to the Log Food button on the first page (Today's Food). Tapping the pill turns it into the floating bubble (`aiBub`), which is the chat box. Change 13 makes the bubble glide to the top right and open bigger. This change covers how the bubble goes back to being a pill, and a cleanup in the Log Food window. Read how the pill, the bubble, the drag and the trash bin work today, and report it before changing anything.

**1. Log Food window cleanup (decided).** In the Log Food window opened from the first page:

- Remove the Food Coach button from the window.
- Make **Fill My Macros** a bigger button that takes up the whole space where both buttons were (full width of that row, same height class as the other main buttons). The window keeps working as before otherwise. The Food Coach pill next to the Log Food button on the first page itself stays.

**2. No trash bin (decided).** Remove the trash bin that appears in the middle of the screen when the bubble is dragged, and everything that deletes or hides the bubble that way. The bubble is not removed. It only turns back into a pill.

**3. Drag the bubble back to become a pill again (decided).**

- While the user drags the bubble, a **ghost pill** appears at the place where the pill sits (next to Log Food). It is transparent and the same size and shape as the real pill, with the same frosted look (change 12), but quiet, so it only hints at the spot. It fades in when the bubble gets within reach of that spot and fades out when it moves away.
- When the user releases the bubble close to that spot (inside a reasonable snap distance, about the size of the pill plus some margin), the bubble animates into the pill and takes its place, with a spring. The pill is back exactly as before the user pressed it.
- If the user releases it anywhere else, it stays floating where it was dropped, as today.
- Light haptic when the bubble enters the snap zone and when it snaps (through the phone layer, `Phone.*`). Only animate `transform` and `opacity`. Reduce Motion: no spring, just a quick fade.

**4. Gym Coach behaves exactly the same (decided).**

- In Gym Buddy, on the Workouts tab, Create A Workout is the big pill and the Gym Coach pill sits next to it. Gym Coach must behave **exactly like the Food Coach**: tap the pill and it becomes the bubble, the bubble glides and opens as in change 13, drag the bubble near the pill's spot and a ghost pill shows, release and it snaps back to the pill. No trash bin.
- Build this **once, as one shared component** that both coaches use, with the coach type (food or gym) as a setting (robot face, chef or gym band, which assistant, which page). The two must never drift apart. Do not write a second copy.
- The Gym Coach robot in the live workout header (`gymHeadRobot`, `#sesCoach`) is a different place. Report how it works and keep it as it is until Petros says otherwise.

**Check it:**

- The Log Food window has no Food Coach button, and Fill My Macros is one big button using the whole space.
- No trash bin anywhere, in either coach.
- Dragging the bubble near the pill's spot shows the ghost pill, and releasing snaps it into the pill. Releasing far away leaves the bubble where it is.
- Food Coach and Gym Coach behave identically, and both work from every page where the bubble shows.
- Light, dark and Greek, on a small iPhone.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 19. Live Workout: Add Exercise Always Sits Under The Workout

**Why:** In the live workout screen most things sit at the bottom (the New Set and End Exercise buttons, Discard and End Workout), but the button to add the first exercise sits at the top. Petros wants everything together, close to the thumb.

**What (decided):** The Add Exercise button (the "tap to pick your first exercise" button) moves to sit **directly under the workout**, always:

- **Empty workout** (the user pressed Start Empty Workout, or started a workout with nothing selected): the Add Exercise button sits at the bottom of the screen, **just above Discard and End Workout**. The user taps it, the exercise picker opens, and the picked exercise appears.
- **With exercises:** the same button sits **right under the last exercise card**, at the end of the list, and moves down as exercises are added. It never goes back to the top of the screen.
- It is the same button in both states. It follows the end of the list, and in the empty state the list is empty, so it rests above Discard and End Workout.
- Remove the old Add Exercise button at the top of the live workout screen. Make sure there is only one.

**How to build it:**

- Find the live workout screen (`renderSession`, `#sesBody`, the sheet `#ovSession`) and the current Add Exercise button, and report where it sits today.
- Keep the button's look and wording. Only the position changes. It uses the app's frosted button style from change 12 if that is done, otherwise the current style.
- When an exercise is added the new card appears and the button slides down with it. Animate with transform and opacity only, and respect Reduce Motion. Keep the scroll position steady: do not jump.
- In the empty state the button must stay visible above Discard and End Workout, and never sit under the pinned bottom buttons. Check it on a small iPhone with the keyboard closed.
- The saved workout editor (template editor, `ovTpl`) is a different screen. Report whether it has the same problem and ask before changing it.
- Superset drag and drop, swipe to delete, hold to reorder and the exercise picker keep working as they do now.

**Check it:**

- Start Empty Workout: the Add Exercise button is at the bottom, just above Discard and End Workout.
- After picking the first exercise, the button sits right under that exercise card.
- With five exercises, it is under the fifth. After deleting one, it moves up with the list.
- There is no Add Exercise button at the top of the screen anymore.
- Light, dark, Greek, and a small iPhone.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 20. Workout Summary Recovery Card, And Daily Targets Open In Settings

### Part A: The recovery estimate on the workout summary

**Context:** When the user finishes a workout, the summary shows a recovery estimate. Read how the summary and its recovery card are built today (`renderSummary` or similar, the AI badge, `aiRecovery()` if it still exists, and the coach brain `Brain.recovery()` from the 0.7.10 plan) and report it before changing anything.

**What (decided):**

- Remove the AI badge from the recovery estimate card.
- On the **left side of the card**, show the **Gym Coach robot face** (the gym version of the robot, with the sweatband). Same artwork as the coach bubble. Do not draw new artwork.
- Next to it, a short text in the coach's voice: **one line, at most two lines**, never more. It says how much recovery the workout needs and explains why, from what the workout was like, for example if the user raised their weights a lot, did a lot of volume, or trained for a long time.
- The numbers (the recovery hours and what made the workout hard) come from the rules and the data that already exist. The AI only words the sentence. It must never contradict the hours shown on the Recovery page. If the hours come from the coach brain, give the AI those final numbers and the reasons (heavier than last time, high volume, long session) and tell it they are final.
- **Motion:** while the AI is working, the robot shows its thinking look (the two alternating faces and the sway, as on the coach bubble). When the line arrives, it **fades in** under or beside the robot. Respect Reduce Motion (no sway, a quick fade).
- **If the AI is slow, offline or fails, the card stays hidden.** No placeholder, no rule based sentence, no error text. The summary looks complete without it.
- Keep the text short enough to fit two lines on a small iPhone, in English and in Greek. Cap the AI's answer at about 25 words.
- One AI call at most per finished workout, and never again when the summary is reopened (save the sentence with the session).

**Check it:**

- The card has no AI badge. The robot is on the left, the one or two line text next to it.
- The line fades in after the robot thinks. With the network off, the card never appears and nothing breaks.
- The text matches what happened: a heavier session gives a longer recovery explanation than a light one.
- Light, dark, Greek, small iPhone.

### Part B: Daily Targets open under Body and Goals

**What (decided):** In Settings, on the Body and Goals page, the **Daily Targets** are shown open, directly on that page, under the body and goal rows. They are not behind an extra row or tab that opens another page or sheet. Remove the separate Daily Targets row and the extra screen it opened (the `ovTargets` flow, if it is only used from there). Report every place that opened it before removing anything (for example the target button on Today's Food, if there is one, which must still work).

**How to build it:**

- Show the same fields, with the same behaviour and saving, inline on the Body and Goals page. Use the same card and input styles as the other Settings rows. Do not change how targets are calculated (`calcTargets`).
- If other places link to the Daily Targets sheet (for example from Today's Food), make them open Settings on Body and Goals, scrolled to the targets, or keep a working sheet there. Report and ask if unclear.
- Strings EN and GR, no emoji. Inputs are 16 px so the iPhone does not zoom.

**Check it:**

- Settings, Body and Goals shows the targets open, and editing saves as before.
- No extra Daily Targets row remains, and nothing links to a removed screen.
- Light, dark, Greek, small iPhone.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 21. How Claude Code Hands The Work Back To Petros (Read This First)

**Why:** Petros builds this with separate chats, one for each piece of work, and merges them into the app one at a time. He must always know which chat is which and in what order to merge them, so he never gets lost.

**Do this before writing any code. Do not start building until you have given Petros the plan below.**

**1. Split the work into chats.** Group the changes in this document into a small number of chats, about five to eight. Group by what touches the same files or the same area, so two chats are unlikely to edit the same code. Keep each chat small enough to finish and test on its own. Put changes that other changes depend on first. Examples of what depends on what: the shared hub carousel (change 11) before the Food Library hub (change 7) and the Gym Buddy hub, the frosted button style (change 12) before things that use it, the shared coach bubble (changes 13 and 18) before anything else about the coaches. Changes that are marked undecided, cancelled or coming soon (changes 6, 8, and My Meals inside change 7) are not built. Say so in the plan.

**2. Name every chat with the patch name and a number.** Each chat gets a name made of the patch name, then a hash sign and a number, in merge order: for example `Refinements #1`, `Refinements #2`, `Refinements #3`, and so on, for as many chats as there are. Use the same patch name in all of them. Ask Petros what the patch name should be if there is no obvious one. The number is the order in which he must merge them. #1 is merged first.

**3. Give Petros one prompt per chat.** For each chat, write a ready to paste prompt that says: which changes from this document are in it (by number and title), what it must not touch, which chats it depends on, and how to check it. Start each prompt with the chat name, for example `Chat name: Refinements #2`. Tell Petros the chat name so he can name it in the app.

**4. Say which AI model to use for each chat.** For every chat, tell Petros which model he should use to write that code (for example the biggest model for the heavy shared work, a faster model for small polish) and give a one line reason. Be honest about it: use the stronger model where mistakes are costly (shared components, data, motion, search), and a lighter one for simple layout and wording changes.

**5. Give a merge order table.** At the end, one short table: chat name, what it contains, the model to use, what it depends on, and what to check after merging. Petros merges in the order of the numbers.

**6. Report back after each chat.** When a chat is done, say what shipped, what was left out, and anything Petros needs to decide.

**Rules that apply to every chat:** Follow CLAUDE.md. Do not bump VERSION or CACHE unless told to. Run `node tools/check.js --boot` and `claude/test/redecl.js`, and report the result. Do not change anything that is not in the chat's list.

### 22. Recipes Layout With Coach Faces, And Hide Everything Kitchen When Kitchen Is Off

### Part A: Cook options layout in Recipes

**Context:** Change 10 made one sliding pill in Recipes (Suggest, My Own, Quick). Petros has now described a different layout. **This part replaces the pill of change 10.** If the two disagree, follow this part, and tell Petros you did. (Claude assumed the stacked layout replaces the pill because it is the most recent description. Petros can say otherwise.) Read how the cook options (Cook a Meal, Suggest a Recipe, Quick Recipe, My Own Recipe) look and work today and report it first.

**What (decided):**

- **Suggest a Recipe** and **Quick Recipe** are placed together, stacked: one on top, one below it.
- **My Own Recipe** sits **below** those two.
- On the two AI options (Suggest a Recipe and Quick Recipe), **remove the AI badge**. Put the **Food Coach chef robot face** (the chef version of the robot, with the chef's hat) on the **left side** of each option instead. Use the existing robot artwork, no new drawing. My Own Recipe is not an AI option, so it has no robot and no badge.
- Use the app's existing card or button style for the three options. Keep the wording short, and the same behaviour as before for each. Do not rewrite the cooking logic.
- Remove the old Cook a Meal step and the old top buttons if they are now unused.

**Check it:** Three options in the order Suggest a Recipe, Quick Recipe, My Own Recipe. The chef face is on the left of the first two. No AI badge there. Light, dark, Greek, small iPhone.

### Part B: When Kitchen is turned off, hide everything about it, everywhere

**Context:** Settings lets the user disable the Kitchen (the old Fridge page with Fridge and Groceries). Find that setting and report how it works today and what it already hides.

**The rule (decided, applies to the whole app):** When the Kitchen is disabled in Settings, **everything in the app that mentions or touches the fridge, the groceries or the kitchen is hidden completely**, not just switched off. The app behaves as if the fridge and the groceries do not exist.

**Examples (not a full list, search the whole app for more):**

- In My Own Recipe: the toggle to put leftovers into the fridge. It is hidden, and nothing is ever added to the fridge.
- The Kitchen tab and its entry in the navigation, the Fridge and Groceries pages.
- Fill My Macros and Suggest a Recipe: no "from the fridge" ingredients, no fridge based suggestions, no alternatives he does not have, no cart or grocery hints.
- Logging food: nothing is taken out of the fridge, no Undo text about the fridge, and the groceries top up never runs.
- Scan Receipt, Add to Fridge, shopping scan and review, and any button or label that mentions them.
- Today's Food, Settings, onboarding and setup text that mention the kitchen, the fridge or groceries.
- The AI (Food Coach, Fill My Macros, Suggest a Recipe, Quick Recipe) is not blocked or changed in any way. It simply does not use the kitchen when Kitchen is off, because the prompts build their fridge and groceries part only when Kitchen is on, so that part is empty. Do not add any special handling or warnings for the AI.
- Backup and import still keep the data, so turning the Kitchen on again brings everything back.

**How to build it:**

- One shared check, for example `kitchenOn()`, used everywhere, rather than a separate test in each place. Search the code and strings for every use of fridge, groceries and kitchen (`fridge`, `groc`, `stockOf`, `takeFromFridge`, `addToFridge`, `checkRestock`, the strings in EN and GR) and make each place respect it. Report the list of places you changed.
- Hidden means not rendered at all. No disabled or greyed out versions. Layouts close up with no gaps.
- Turning the Kitchen off or on updates the app straight away without a restart.
- No data is deleted when it is off.

**Check it:**

- With Kitchen off, search every page, sheet and setting for the words fridge, groceries and kitchen, and for their icons. None is visible anywhere.
- My Own Recipe has no leftovers toggle. Logging a food never touches the fridge or the grocery list.
- With Kitchen on again, everything is back and the data is intact.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 23. Rank Up Screen Before Workout Done

**Context:** When the user ends a workout, the app shows the Workout Done page with the stats. Ranks already exist (see the project files `rank-icons.md`, `rank-plates.js`, `rank-plates-gen.py`, `rank-anim-gen.py`, `rank-change.js` and `rank-change.css`, and the social hub). Read how a rank up is detected and animated today, and how the Workout Done page is built, and report it before changing anything. Reuse the existing rank artwork and the existing rank change animation. Do not draw new artwork or write a second animation.

**What (decided):**

- **Only when the finished workout caused a rank up in at least one exercise**, the user first sees a full screen **rank up screen** with the existing rank change animation playing out. The new rank is shown big, with the rank name (for example Gold 2) and the exercise name.
- A **Next** button sits at the bottom of that screen. It is the only way forward. Do not auto advance.
- Tapping Next goes to the normal **Workout Done page** with the stats. On that page, the rank up also shows as part of the summary (for example a small rank card or row showing the exercise, the old rank and the new rank). Report where on the page it fits best and keep it consistent with the other summary cards.
- **If the user ranked up in more than one exercise:** play one rank up screen per exercise, one after the other, each with its own Next button. The last Next goes to Workout Done. Order them by the biggest rank change first, then by the most recent set. All of them appear in the summary on the Workout Done page.
- **If there is no rank up**, the user goes straight to the Workout Done page, exactly as today. Nothing changes for them.
- The rank up screens are shown only right after finishing the workout. Reopening the summary later shows the Workout Done page with the rank up card, and does not replay the animation screens.

**How to build it:**

- Find where the workout finish creates the summary (`finishWorkout`, the summary overlay) and where rank changes are computed. Compute the rank ups once at finish, store them with the finished session (so reopening works), and show the screens from that stored list.
- Smooth and premium: the screen fades in, the animation plays, and Next appears with a gentle fade only after the animation has reached its end state. Sound is not needed. A light haptic when the new rank lands (through the phone layer, `Phone.*`). Respect Reduce Motion (show the new rank without the animation).
- Never block the user. If anything fails to load, skip straight to the Workout Done page.
- Keep the workout saving, the recovery card (change 20) and the other summary parts working. The recovery card's AI call must not wait for the rank up screens.
- Strings EN and GR, Title Case, no emoji.

**Check it:**

- A workout with no rank up: straight to Workout Done, as before.
- A workout with one rank up: the rank up screen, then Next, then Workout Done with the rank up shown.
- A workout with two rank ups: two screens in order, then Workout Done showing both.
- Reopening the finished workout does not replay the animation.
- Light, dark, Greek, small iPhone, Reduce Motion.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 24. Food Coach: Complex Meals Broken Into Parts, One Card, App Does The Maths

**LATEST DECISIONS (Petros, these override anything below that disagrees):**

**A. Simple or complex decides the path.**

- **Simple food, one or two ingredients** (for example rice, a chicken breast, a banana with yoghurt): check the user's own foods and the built in food lists first (`searchLocal`, `Search`). Use the saved numbers when there is a match. Only if nothing matches, fall back to one AI estimate for that food, marked as an estimate. Do not run the breakdown for these.
- **Complex food, three or more ingredients, or a known composed dish** (a gyro pita, a pizza with four cheeses and meats, a burger menu, a souvlaki plate): **skip the database search.** Do what the bigger chat did: **one AI call** that returns the parts with weights and each part's numbers (kcal, protein, carbs, fat). The **app adds up the totals in code**. No lookups in the user's database, no Open Food Facts, no second call for the parts. One call, one card.
- Decide simple or complex with a small rule in code first (count the items the user wrote and check a list of known composed dishes), and let the AI call also return a `complex` flag as a second opinion. Keep the rule easy to adjust. The earlier description of the lookup order in this change (user foods, built in list, Open Food Facts, then a second AI call) now applies **only to the simple path**.

**B. Always a normal portion (a real bug).** Petros's test gave a pita about 120 kcal, which is far too low. The AI must always assume a **normal adult serving**, never a small, half or single piece portion, unless the user clearly says small. Do both:

- In the prompt: state this rule in one short line, and give typical weights for common items (from the portions file described below).
- In code: set a **minimum sensible weight** for common components (for example a pita bread should not go under about 60 to 70 g, a pork gyro portion under about 80 g, a fries portion under about 100 g, a slice of pizza under about 100 g). If the AI returns less, raise it to the minimum and keep a quiet flag. Take the minimums from the portions data file, and do not invent numbers. Mark anything uncertain.
- The card shows a small muted label "Normal Portion" (Title Case, EN and GR) so the user knows a standard size was assumed and can change the weights.

**C. Always one card, one meal (decided).** A complex meal is **always shown as a single food card with one set of totals**. The parts are **never** shown as separate cards, and are **never** logged as separate entries in Eaten. The parts appear only inside the card, when the user taps it open, as rows. Logging puts **one item** in Eaten with the combined kcal and macros. Add a test that a five part meal produces exactly one card and one Eaten entry.

**Why:** When Petros gives the Food Coach a complex meal (for example a Greek pork gyro pita with fries, onion and sauce), it returns wrong calories and macros. A bigger chat model gets it right because it does not guess the whole meal in one shot. It splits the meal into parts with weights, gives each part its own numbers, and adds them up (the example answer split the pita into pita bread about 240 kcal, pork gyro 90 to 100 g about 260 kcal, fries 50 to 60 g about 155 kcal, onion about 10 kcal, total about 665 kcal, and listed tzatziki as an optional add on). The app currently runs on the free Gemini key, and Petros plans to move to Haiku 5.5 later. **The system must be designed so a weak model can follow it and a strong model does even better with no change.** Read how the Food Coach and Quick Log build prompts and read answers today (`AI.ask` / `gemini(...)` in `js/platform/ai.js`, the Food Coach in `today.js`, Quick Log from `plan-0.7.1.md`, `AI.knows('food')`) and report it before changing anything. Reuse them. Do not write a second AI service.

**The method (decided): split, look up, add up in code.**

1. **The AI only splits the meal into parts.** One AI call. It returns plain JSON: a short list of components, each with a name, an estimated cooked weight in grams or a count of pieces, a cooking method where it matters (fried, grilled, raw), and a flag if it is an optional add on (for example tzatziki, sauces, extra cheese). It also returns the assumptions it made in one short line (for example "medium pita, no tzatziki"), a clean title, and a size range note when the portion could vary a lot. It must **not** add up anything and must not return a total.
2. **The app looks up each part**, in this order: the user's own foods, the built-in food list, Open Food Facts, and only for parts that still have no match, a second small AI call for that part's numbers per 100 g (main values only: kcal, protein, carbs, fat), marked as an estimate. Reuse the matching that Quick Log and the receipt flow already use (`shopMatch`, `searchLocal`, `Search`). Do not write new matching.
3. **The app adds up the numbers in code.** Per component: grams times the values per 100 g. Then the total. The AI never does the arithmetic, so totals cannot drift.
4. **Everything runs in the background.** The user sees the Food Coach thinking (the robot's thinking look), not a list of steps. When it is ready it fades in as one card.

**Prompt rules that make a weak model follow it (decided):**

- Ask for strict JSON only, with a short example of the exact shape in the prompt. Validate and repair the answer in code: if the JSON is broken, retry once, then fall back to the old behaviour. Never show a raw error.
- Give the AI a short built in guide of typical Greek and everyday portions (gyro pita, souvlaki, pita bread, fries portion, toast, a slice of pizza and so on) so its weights are realistic. Keep this as one data file that is easy to extend (for example `js/data/portions.js`), with typical weights and a note when shops tend to be generous. Do not invent numbers. Take them from the existing built in foods and standard references already in the project, and mark anything uncertain.
- Tell the AI to assume the usual version of a dish and to list add ons separately instead of guessing them in.
- Keep the prompt short. Use the same prompt for any model, with no model specific tricks, so moving to Haiku later needs no change.

**The result: one meal card (decided).**

- The meal appears as **one card** with a good title: the name as the user wrote it, tidied, with a capital first letter on each main word (for example "Pork Gyro Pita With Fries"). Title Case.
- The card shows the total kcal (in the neutral colour from change 9) and P, C, F in their macro colours.
- Tapping the card expands it to show the parts as rows: name, weight, kcal. Each weight is editable in one tap, and the totals update live. Parts that are estimates carry a small "estimate" tag.
- Optional add ons appear as toggles (for example Tzatziki, +50 to 80 kcal), off by default, with the assumptions line shown quietly under the title. Toggling updates the total.
- If the portion could vary a lot, show the range in one quiet line (for example "Large shop portions can reach 800 to 900 kcal"). Do not over explain. Never more than two lines of text.
- **Saving:** if the user likes it, they can log it, and they can save it. Saving it as a food or a meal is the same action the Food Coach already offers today. Keep that. When My Meals exists (it is coming soon, change 7), saved meals will go there. For now save it the way the Food Coach does today. Logging it puts it in the Eaten list as **one item** with the title, expandable to see the parts.
- Never ask the user a question before showing a result. The AI guesses sensibly and the user confirms or edits.

**Limits and cost:** One split call per meal, plus at most one small estimate call for all unmatched parts together (batch them). Never one call per part. Show the AI counter as the app does today.

**How to build it:**

- One module for the pipeline, for example `js/meal.js`, with small functions: `mealSplit`, `mealLookup`, `mealTotal`, `mealCard`. Add it to `index.html` and `sw.js` and say so.
- Add a test list like `claude/test/search.js` for meals: a handful of fake AI answers and the expected totals (for example the gyro pita example), so the maths can be checked without the network. Add a test that a broken JSON answer falls back safely.
- Strings EN and GR. Title Case, no emoji. Reduce Motion respected.

**Check it:**

- The gyro pita example gives a card of about 650 to 700 kcal, with the parts listed and tzatziki as an optional toggle.
- Totals always equal the sum of the parts.
- Editing a part weight updates the total instantly.
- Broken or empty AI answers fall back safely with no raw error.
- Works on the free Gemini key. No model specific code.
- Light, dark, Greek, small iPhone.
- No console errors, nothing declared twice (`claude/test/redecl.js`).

### 25. Food Coach: Hybrid Estimation Engine (Built Together With Change 24, In Refinements #5)

*Pasted by Petros "for the food coach to make logging food better", and added to this patch. It overlaps and partly conflicts with change 24. Refinements #5 builds change 24 plus the parts of change 25 listed under "What Refinements #5 builds" at the end, following the recommendations below, unless Petros overrides one of them before that chat starts.*

**Petros's text:**

> Users should be able to type naturally ("gyro pita pork fries", "chicken with rice", "2 eggs and toast", "ate pasta with beef sauce", "pita gyro xoirino", "2 tost kai gala", "makaronia me kima"). The AI understands the food and returns a realistic estimate without forcing grams. Priorities: ease of use, realistic regional portions, accurate macros, learning user habits.
>
> **Architecture:** do not rely on the LLM alone. User message → LLM understanding → food parsing → regional portion database → nutrition database → macro calculation → confidence and explanation → reply. The LLM understands language, identifies foods and cuisine, chooses database entries and explains. The code decides portion sizes, nutrition, macro maths and confidence.
>
> **User profile context:** country, region, food culture, units, saved foods, saved restaurants, personal portion corrections. Country and region change the default portions (a Greek gyro pita is not a German döner).
>
> **Pipeline:** 1) parse: food, cuisine, ingredients, cooking method, portion words, brand, restaurant or home made, missing info. 2) decompose every meal, never estimate a whole meal directly (pita 75 g, pork gyro 100 g, fries 60 g, onion 15 g, tzatziki 30 g if typical or mentioned), each part with weight, kcal, protein, carbs, fat. 3) regional portion profiles (Greece gyro_pita_medium: pita 75, pork gyro 100, fries 60, sauce 30, vegetables 35; Germany doner_medium: bread 120, meat 140, sauce 40, vegetables 80; Italy pizza_margherita: 350 g with mozzarella 80, dough 220, oil 10).
>
> **Portion words:** small 0.75×, medium/normal 1×, large 1.3×, extra large 1.6×. Double meat raises only the protein part, extra sauce only the sauce, extra fries only the fries.
>
> **Cooking adjustments (hidden oil):** boiled none; grilled +3–5 g oil; pan cooked +5–10 g; fried +10–20 g absorbed; restaurant food +5–15 % kcal; Mediterranean restaurants consider olive oil.
>
> **Database priority:** 1 user saved food, 2 barcode/product database, 3 official label, 4 national food database, 5 generic ingredient database, 6 AI estimate. Never overwrite a known user product (FAGE stays FAGE, not generic Greek yogurt).
>
> **Macro check:** protein×4 + carbs×4 + fat×9 must match the calories within 10 %, otherwise recalculate.
>
> **Confidence:** High (exact grams, barcode, saved product), Medium (common restaurant meal, standard regional food), Low (image only, vague). Show the level and the main uncertainty (for example "portion size and oil").
>
> **Smart questions:** only ask if the answer changes calories by more than 15 %, and ask in plain terms ("closer to a small plate or a full restaurant portion?"), never "how many grams".
>
> **Personal learning:** when the user corrects a part ("mine usually has around 150 g"), offer "Should I remember this as your default gyro portion?". If yes, save it in a personal food profile, and use it before the regional average next time.
>
> **Output:** meal name, breakdown (part, amount, kcal), totals (kcal, protein, carbs, fat), confidence, short assumptions.
>
> **UX goal:** it should feel like chatting with a nutrition coach, not filling a form. Accept slang, incomplete sentences, restaurant names, local foods and mixed languages.

**Where this conflicts (Petros decides):**
1. **Who gives the numbers for a complex meal.** Change 24 (LATEST DECISIONS) says one AI call returns the parts *with their numbers*, with no database lookups. Change 25 says the code takes portions and nutrition from databases and the AI only understands and chooses. Recommendation: keep 24's one-call path, but let the code replace the AI's weights with the regional portion file where a dish is known, and run the 4/4/9 check.
2. **Questions.** Change 24 says never ask before showing a result. Change 25 allows one question when it changes calories by more than 15 %. Recommendation: show the result first, and offer the question as a one-tap choice on the card ("Small Plate / Full Portion").
3. **Emoji.** The output format starts with 🍽. CLAUDE.md forbids emoji. Recommendation: no emoji, use the existing card.
4. **New saved data.** Country/region, saved restaurants and personal portion corrections do not exist yet. They need a new synced collection (schema, backup, import). Recommendation: a later chat, after 24 ships.
5. **Regional profiles for Germany and Italy.** The app is Greek and English. Recommendation: Greece only now, in `js/data/portions.js`, built so other countries can be added.
6. **Confidence label.** Not in change 24. Recommendation: add it as one quiet line on the card (High / Medium / Low plus the main uncertainty).

**What Refinements #5 builds from change 25:** recommendations 1, 2, 3, 5 and 6 above, plus the parts that do not conflict: portion words (small, large, double meat…), cooking oil adjustments, saved user products always win on the simple path, Greek, Greeklish and mixed-language input, the 4/4/9 check.

**Not built in this patch:** point 4 (country and region in the profile, saved restaurants, the personal portion memory and "Should I remember this?"). It needs new synced data and gets its own round after Refinements #5 ships.
