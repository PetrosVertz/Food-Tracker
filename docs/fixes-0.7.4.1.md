# Fix lists — 0.7.4.1 (visual)

Each branch session does only its own section. Follow CLAUDE.md. Run after 0.7.4.0.5 is fully merged (incl. shell-2).
Order: **gym** and **small** (any order, can run together) → **shell** last (it sweeps up what's left).

## gym
1. End Exercise: remove the two emojis from the done line (e.g. "Done · 3 Sets · 1,000 kg").
2. Exercise info window: no emojis. Line icons: a tick by "How to do it", a warning triangle by "Common mistakes", a red X before each mistake.
3. Exercise info window: each muscle name on one line ("Upper chest" wraps now); make the % bars shorter so they fit the iPhone 13 mini (375 px wide).
4. Form page on a computer stretches across the screen: cap it at phone width and centre it.
5. Workout summary: no emojis, "Workout Done" with no emoji. Line icons in our style (add to ICON in ui.js if missing): lightning bolt (recovery), podium (Records), rising chart (volume records), medal (weight PRs). Light mode: "Volume record" is yellow on grey, make it readable; the Done button must look like a filled button.
6. Create a Workout cards: remove the old exercise icons; Form pill on the right instead of the eye; the delete X with no box; Sets and Rest boxes with better contrast and values centred; the equipment icon next to each exercise; exercise name bold italic.
7. Saved workouts: names always shown in capitals; the memory card icon bigger, no box.
8. Anatomy body: the lower abs are too long; make them shorter and natural, in proportion with the upper abs, and reshape the silhouette behind them to match. Check front view in Light and Dark.

## small (today + foods + fridge)
1. Log Food window, green "added" chips: keep the X but remove the button shape around it; a plain X in the chip's green, still at least 44 px tap area.
2. Gym Today card on Today's Food: the "Start" pill reads "Workout" in the theme accent colour (accent-ink in Light), next to Skip; while a workout is running it reads "Resume Workout". New strings EN + GR.
3. Food Tracker (Store-bought and Home-cooked): remove the stray system-style X under "Search food, brand or category" and hide the browser's own search clear button everywhere (`input[type=search]::-webkit-search-cancel-button`); only our own X inside the box, shown when text is typed.
4. Food Tracker rows: show the fridge amount as a small soft-green pill under the kcal (the --t-done green, readable in Light), with the fridge line icon instead of the ice cube.

## shell
Most of the old shell list for this round was done in 0.7.4.0.5. Only finish what's left:
1. Emoji sweep: run `node tools/check.js`; its "lines with emoji/glyph icons" note lists what's left. Replace each visible one with an ICON line icon or remove it (EN + GR strings, HTML, JS, CSS content). Known leftovers to check: Cook a Meal, Suggest a Recipe, My Own Recipe (ingredient bubbles, time chips, buttons). Leave typographic signs (· × ≈ → ≤) and comments alone.
2. Light mode contrast pass: open every page and the main windows in Light; background, cards, inputs and buttons clearly separated; every button looks like a button; no coloured text below 4.5:1. Change Light values only; Dark stays.
3. Page titles (Today's Food, Gym Buddy, Food Tracker, Fridge, Settings): confirm they're sharp and above the top bar on all five pages in Light and Dark, with content scrolled under. Fix if not.
4. Bump VERSION to 0.7.4.1 and CACHE to match.
