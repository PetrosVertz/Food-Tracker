# Fix lists — 0.7.5 (exercises)

One branch: **gym-0.7.5** (Sonnet). Follow CLAUDE.md. Exercise data lives in `js/data/gym.js` (`LIB_RAW`, `HEADS`, `EQ`/`EQUIP`, `REST_BY_PATTERN`, `CUES`, `MISTAKES`, `SPECIFIC`). Today there are ~169 exercises; target ~300.

## gym
1. **Data check first.** Add a check to `tools/check.js` for `LIB_RAW`: unique ids; every muscle key exists in `HEADS`; percentages are whole numbers that add up to 100; equipment code exists in `EQ`; pattern exists in `REST_BY_PATTERN`; Greek name present. Fix anything it finds in the current list.
2. **Audit the existing ~169.** Correct muscle splits that are off (e.g. main mover too low, a muscle that barely works listed), at most 4 muscles each, main mover first. English names in Title Case; real Greek names (gym terms Greek lifters actually use). **Never change an existing id** (saved workouts and history use them).
3. **Add ~130 new exercises** to reach ~300, including niche ones, spread across every group. Examples to cover (skip any that already exist under another name):
   - Chest: Svend press, guillotine press, landmine press, deficit push-up, plate-loaded/iso-lateral chest press, low-to-high cable fly, pec deck variants.
   - Back: Meadows row, seal row, Kroc row, Pendlay row, chest-supported T-bar row, rack pull, straight-arm pulldown, single-arm cable row, iso-lateral row and pulldown, inverted row.
   - Shoulders: Y-raise, Cuban press, Lu raise, landmine press (half-kneeling), cable Y-raise, behind-the-back cable lateral, Arnold press variants, face pull variants.
   - Arms: spider curl, Bayesian curl, Zottman curl, reverse curl, drag curl, JM press, Tate press, cross-body extension, wrist curl / reverse wrist curl, wrist roller.
   - Legs: sissy squat, Spanish squat, belt squat, pendulum squat, hack squat variants, Cossack squat, step-down, Nordic curl, reverse Nordic, tibialis raise, Jefferson curl, 45° back extension, frog pump, single-leg hip thrust, Copenhagen plank.
   - Calves: seated, donkey, single-leg, leg-press calf raise.
   - Core: dragon flag, ab wheel, Pallof press, hanging knee raise, L-sit, dead bug, cable crunch variants.
   - Kettlebell: swing, Turkish get-up, snatch, clean, goblet squat, windmill.
   - Cardio / conditioning: assault bike, rower, stair climber, sled push, battle ropes.
   - Bands and bodyweight versions where common.
   Rules: snake_case ids; equipment from `EQ` (if Smith machine, trap bar, landmine or sled are needed, add them to `EQ` / `EQUIP` with EN + GR names and an equipment line icon); a pattern from `REST_BY_PATTERN` so rest, cues and mistakes come automatically; muscle % as a rough, sensible biomechanics split (whole numbers, sum 100).
4. **Find them by any name (synonyms).** People search with the name on the machine or what their gym calls it, so every exercise gets a list of other names, and search matches any of them (both ways, partial words, EN + GR):
   - Gym slang and short forms: "RDL" → Romanian deadlift, "skull crusher" → lying triceps extension, "pec deck" → machine fly, "OHP" → overhead press, "BSS" → Bulgarian split squat.
   - **Machine names from the big brands** (Matrix, Technogym, Life Fitness, Hammer Strength, Cybex, Panatta, Gym80): e.g. machine row ↔ **low row** (Matrix) ↔ seated row machine; chest press ↔ vertical chest press ↔ iso-lateral chest press; lat pulldown ↔ pulldown machine ↔ iso-lateral pulldown; leg extension ↔ quad extension; leg curl ↔ seated / lying leg curl; hip abduction ↔ outer thigh; hip adduction ↔ inner thigh; pendulum squat ↔ power squat; shoulder press machine ↔ overhead press machine; rear delt machine ↔ reverse pec deck ↔ rear delt fly.
   - Common Greek names lifters use (e.g. κωπηλατική, πιέσεις, έλξεις, βυθίσεις, βαθύ κάθισμα).
   - The result shows the app's exercise name, with the matched other name in small grey text under it ("also: Low Row"), so the user knows it's the same exercise.
   - Synonyms must not create duplicate exercises: one exercise, many names.
   - Add a few test searches to tools/check.js (e.g. "low row", "RDL", "pec deck" each find the right exercise first).
5. Check the picker, Create a Workout and the Form page still work and look right with ~300 exercises (scrolling, grouping by muscle and equipment).
6. Bump VERSION to 0.7.5 and CACHE to match.
