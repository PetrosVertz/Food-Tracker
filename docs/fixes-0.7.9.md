# Fix lists — 0.7.9 (refinement pass)

Polish what exists; no unrelated new features. Follow CLAUDE.md.
Order: **shell first, merge it** → **log**, **gym-a**, **gym-b**, **ai** (any order, can run together) → **polish last** (replaces the 0.7.8 spacing chat, which was never run).
Default decisions (Petros can change them): Fridge tab is renamed **Kitchen** (Fridge, Groceries, Recipes inside); steps and sleep are used only when a watch/phone health source is connected (Capacitor app later), never asked for by hand.

## shell (Opus)
1. **Tabs and names:** rename Today's Food → **My Food Log**, Food Tracker → **Food Library**, Fridge → **Kitchen** (with Fridge, Groceries and Recipes inside that section). Settings › Tabs: a switch to turn the Kitchen section off; then the bottom bar has four tabs and nothing links to Kitchen (EN + GR).
2. **Profile picture:** Settings/Profile lets you set a photo (Camera or Photo Library via `Phone.*`), cropped to a circle, stored small (≤ 200 px) through Store. The bottom bar's Profile icon becomes that photo (Instagram style; initial letter when no photo); make the tab selector more circular so the avatar sits naturally.
3. **Navigation rules, one pattern everywhere:** back arrow and title always on the same line and vertically centred together, same left margin on every page and window. Fix the Daily Targets page.
4. **Header:** if the 0.7.8 titles fix (PR "titles-0.7.8") isn't perfect on iPhone, remove the header band: page titles become part of each page and scroll with the content (back arrows stay sticky at the top-left of full-screen windows). Decide from screenshots at device scale 3 and say which way you went.
5. **Pill animations:** the bottom pills' switch animation must feel smooth and native (transform/opacity only, no layout jumps, spring easing, no flicker of the old text, nothing left half-drawn).

## log (Sonnet)
1. **My Food Log (home):** Gym pill shows only "Gym Today"; streak pill without the workout time (compact); no circle around the info icon; spacing and centring of every card on the screen.
2. **Calendar:** month label between the two arrows; barbell icon only on days with a recorded workout. Tapping a day asks **Food** or **Workout**: Food opens My Food Log on that date; Workout shows the full recorded session (exercises, sets, reps, weight, duration), read-only, like the workout summary. If the day has only one of the two, open it directly.
3. **Supplements window:** fix the layout stretched sideways; it follows the normal window width and spacing.
4. **Home Cooked Recipes:** centre the AI label on its button (with the foods owner's markup if needed).

## gym-a (Sonnet)
1. **Exercise Picker:** clearer layering, colours and hierarchy. Light mode: much lighter grey behind exercise icons. Muscle group pills use the app's normal pill style. **Search bug:** while typing, the best match must show at the top and stay visible (fix ordering and scroll-to-top on each keystroke). Cardio: most-used cardio first (treadmill, bike, rower, elliptical, stair climber, walking), and a treadmill line icon.
2. **Exercise Information:** percentage bars aligned in one column; Correct Form moves to a right-side button like in the live workout; on open show only the images first (steps and muscles below / on tap).
3. **Workout streak numbers:** slanted athletic numerals (bold italic Inter with tight spacing, or a free athletic font vendored with its licence), on the streak card and pill.
4. **Remove the pet system completely:** UI, drawings, progression, rewards, strings, saved data keys (stop writing them; old saved pet data is ignored and removed from new backups), celebrations that reference pets. Grep `pet`, `PETS`, `petMood_`, `pet_` everywhere. Profile, ranks and progress are the motivation now.

## gym-b (Opus)
1. **Gym Coach workouts as editable cards:** keep the Intensity and Rep Range choices. The generated workout shows one card per exercise: name, sets, rep range, suggested weight (from history / the first-time estimate, when available), with **Remove** and **Replace** (opens the exercise picker filtered to the same muscle). Then Save / Start. Fix the intensity buttons: the selected one animates on, the others off (today "Low" stays active).
2. **Exercise ranks:** every exercise with a sensible standard gets its rank (from 0.7.7 tiers: estimated 1RM vs body weight and sex). Replace text ranks with **premium rank icons** (one line-style emblem per tier — Bronze, Silver, Gold, Platinum, Diamond — with the level 3/2/1 as small pips), shown top right of the exercise card (left of the gear) and on Profile.
3. **Leaderboards only with real data:** empty (with a short explanation) until there's a valid 1RM. An entry comes from **a manually entered 1RM** (exercise, weight, date) or **a valid 1RM in a live workout** (a single rep at that weight, ticked).
4. **Leaderboard Attempt mode** in the live workout (optional switch, trophy line icon, no emoji): shows only leaderboard lifts, sets up a 1RM attempt (warm-up suggestions from your estimate, then single attempts), and a successful single is submitted to the leaderboard automatically, with a celebration.

## ai (Opus)
**Background intelligence:** the app quietly builds a personal profile and every AI feature uses it, so it feels like it already knows the user.
1. **Daily summary, computed on the phone (no AI call needed):** once a day on open, look at past days and store a compact profile through Store: usual calories and protein vs targets, meal timing, favourite foods and brands, foods avoided (plus Food Preferences), training days and split, volume per muscle, strength trends and ranks, rep ranges and intensity used, weight trend, recovery patterns; steps and sleep only if a health source is connected. Keep it small (a few hundred words max as text).
2. **Use it silently:** add this profile to the Gym Coach, Food Coach and grocery suggestions (shop.js) prompts through one shared helper (next to the Food Preferences helper), so suggestions fit the user without asking the same questions again. Don't show the insights on screen.
3. Settings › AI: one line explaining the AI learns from your logs on this phone, with a **Reset What AI Knows** button. Nothing leaves the phone except inside the AI requests the user already makes.

## polish (Sonnet, last)
1. Do the old **## spacing** section of docs/fixes-0.7.8.md (overlap finder `tools/overlap.js`, one spacing scale, no overlaps, bottom padding) across the whole app as it is after this round.
2. **General polish:** spacing, alignment and centring consistent on every page and window, Light and Dark, iPhone 13 mini and 390 px widths.
3. Bump VERSION to 0.7.9 and CACHE to match.
