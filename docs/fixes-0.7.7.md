# Fix lists — 0.7.7 (Social Hub = Profile tab)

The last new feature before 0.8; small refinements only after this. Follow CLAUDE.md.
Order: **shell first, merge it** (can start now) → after 0.7.5 and 0.7.6 are merged: **gym-tiers**, **gym-streak**, **gym-qr**, **gym-settings** (any order); **food-scan** can run any time.
Everything here works offline, on this phone only. Friends, live status and friend leaderboards need accounts and a server (0.8+): build the spaces for them, filled with the user's own data or a short "With friends soon" placeholder, never fake people.

## shell (Opus)
1. **Bottom bar like Instagram:** Today's Food (home) · Gym Buddy · Food Tracker · Fridge & Groceries · **Profile** (new, last). Settings moves behind a gear icon at the top right of Profile (the old Settings tab goes away; every Settings page still works and Back returns to Profile). Keep the sliding pill and tab order logic working, and the phone's back never jumps tabs.
2. **Profile page template**, top to bottom:
   - Circles row: your circle top left, a bit bigger (initial or photo later; ring = accent glow while a workout is live, dimmer ring = trained today); space to the right for friends, scrolling sideways, empty for now with a small "Friends Soon" circle.
   - "Share a Workout" button under the circles row (opens the saved workouts list; the QR comes in gym-qr).
   - Workout streak card (number + line flame icon; filled in by gym-streak, show 0 until then).
   - Latest PR card (from sessions: exercise, weight × reps, date).
   - Leaderboards area: one row per board lift with **your** best estimated 1RM and tier badge (tier from gym-tiers; until then just the number). Board lifts: bench (chest), overhead press (shoulders), pull-up (back), barbell row (upper back), squat (quads), Romanian deadlift (hamstrings), hip thrust (glutes), barbell curl (arms); deadlift as a bonus board. Petros may still change this list.
   - Stats: PRs count, body weight trend (small line chart from weigh-ins), totals (workouts, sets, volume, days logged food).
   - One shared helper `profileData()` the gym branches fill in, so they don't edit the page markup.
3. **Bottom pills animate on page switch:** when you switch tabs, the action pills above the bottom bar (Log Food, Food Coach, Search, Create a Workout, Gym Coach, Start Workout, Add Shopping…) slide down out of view, then the new page's pills rise up from the bottom with a short fade and a slight spring (about 250 ms, staggered by ~40 ms when there are two). No jump or flash of the old pill's text; the glow moves with the pill. Off with Reduce Motion (just swap). Must stay smooth on iPhone (transform and opacity only).
4. Strings EN + GR, Light and Dark, iPhone 13 mini width. Bump VERSION to 0.7.7 and CACHE to match.

## gym-tiers (Opus)
1. **Per-exercise tiers:** Bronze, Silver, Gold, Platinum, Diamond, each with levels 3 → 1 (Bronze 3 is lowest, Diamond 1 highest).
   - From estimated 1RM of normal (working) sets (Epley or Brzycki, reps ≤ 12 only) vs body weight and sex (profile), measured against published strength standards (beginner → elite ratios per lift). Put the standards table in `js/data/gym.js` with a comment naming the source. Only lifts with a sensible standard get tiers (the board lifts plus close variants); the rest show none.
   - No body weight or sex in the profile: show a one-line prompt to add them, no tier.
2. **Live workout badge:** small tier badge top right on the exercise card; tap it for the gap to the next level ("2.5 kg to Platinum 1"). Line-style badge, tier colours readable in Light and Dark.
3. Feed tiers into `profileData()` for the Profile leaderboards. Strings EN + GR.

## gym-streak (Sonnet)
1. **Workout streak** from the Week Planner: counts planned gym days; rest days never break it; a workout on a rest day adds to it; only a skipped planned gym day breaks it. Work it out from saved sessions and the plan (no timers), also after the app was closed for days.
2. **One streak freeze per week:** Skip on the Gym Today card opens "1 Streak Freeze Left This Week, Use It?"; with 0 left, "This Will End Your N-Day Streak" with Skip / Go to Gym.
3. **Flame:** line flame icon (add to ICON), no emoji. Colour by workouts in the streak: orange, silver at 10, gold at 25, platinum at 50, glowing diamond blue at 100. Readable in Light.
4. Feed it into `profileData()`; also show the flame + number on the Gym Today card. Strings EN + GR.

## gym-qr (Opus)
1. **QR sharing of saved workouts, no server:** pack the workout (exercise ids, sets, reps, rest, supersets, name) into a short string that fits a QR code comfortably; version it so old codes still import.
2. A small QR icon on each saved workout row opens the QR full screen (bright white background, screen brightness hint). "Share a Workout" on Profile opens the same list.
3. **Scanning:** a "Scan a Workout" option that opens the camera and reads the QR. iPhone Safari has no BarcodeDetector, so check how the app scans barcodes on iPhone today and use the same path; if a small QR library is needed, vendor it (MIT/Apache) with its licence in `licenses/`, no CDN. Scanning saves the workout, then asks Start / Not Now. Note: a home-screen app on iPhone doesn't share storage with Safari, so scanning must happen inside the app, not through the phone's Camera app link.
4. Test: make a code from a workout with supersets, decode it, and check it imports identically. Strings EN + GR.

## gym-settings (Sonnet)
Petros's earlier requests (first written in an old branch that was never merged; build them fresh on main, don't merge that branch).
1. **One Exercise Settings menu:** a gear line icon on every exercise card (live workout) opens the same settings sheet for all exercises (global, saved in Store). In it:
   - Toggle: on a one-sided (unilateral) exercise, finishing a set ticks both sides together.
   - Toggle: hide the warm-up, failure and drop-set markers.
   - Per-set extras, switched on here and then available on each set: half reps, negatives, RIR (reps in reserve, 0–5).
   Saved workouts and history must keep working with and without these fields (optional fields, no migration).
2. **Cardio cards:** today cardio exercises show sets and reps. Give them cardio fields instead (time, distance, and calories or level where it fits the machine) and no set/rep controls; history and PRs use time/distance.
3. **Recovery:**
   - Show a smooth colour gradient instead of stages, and only how much more rest each muscle needs (never "time since last workout"). Keep the 0.7.4.2 rule for the label (Needs Rest / Recovering / Ready).
   - Also look at the food eaten since the workout (protein and calories vs targets, read through the existing Store helpers) and say in one line whether it was enough for recovery.
4. **Sounds** (through `Phone.*`; add a small sound helper there if missing): the rest timer ends with a boxing-ring bell; the finished-workout sound is a quieter, softer, satisfying tone. Generate them with Web Audio (no sound files from the web), respect the phone's silent mode where possible, and add an on/off switch in the Exercise Settings menu.
5. **Sleep for recovery:** a web app can't read a smartwatch directly. Add an optional manual "Hours Slept" entry on the Recovery page that recovery uses if filled in; in the pull request, explain what a watch link would need later (the Capacitor app + Apple Health).
Strings EN + GR, Title Case, line icons only.

## food-scan (Sonnet)
1. When you scan a food barcode to check it, the scan result shows its macros under the name: kcal, protein, carbs, fat (per 100 g and per pack/serving when known). Code: the scan flow in food.js near `Phone.barcodeReader()`.
