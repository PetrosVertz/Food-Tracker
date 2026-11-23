# Athlete Rank v0.4 — how it works (methodology)

The approved "Athlete Rank v0.4 final" document was not available to this branch (a ChatGPT library link). This build follows the task brief's
rules section by section; any detail of the approved document that differs must be reconciled before release.

## Rules (from the brief)
1. One rank per exercise, Bronze III … Diamond I (15 levels), from the **best qualified actual set**: the kg as entered and the reps done.
2. A set qualifies when it is finished, not a warm-up or drop set, has at least 1 rep and a weight (bodyweight lifts: added kg ≥ 0).
3. Never from a typed 1RM, an estimated 1RM, extra sets, total volume or a streak. A heavy single is a normal set.
4. Reference targets depend on the movement, sex and body weight on the set's date. Published 1RM data is used only to build the reference.
5. Competitive engines: barbell, dumbbell, kettlebell, bodyweight. Machines, cables, Smith machines and bands never compete; their rank slot
   says "Ranking not available" (machine/cable copy approved in the brief; other reasons have their own text).
6. Fatigue (earlier sets for the same muscles, recovery carried in) is context and never changes the raw rank of a set.

## Reference model
- **Sourced anchors** (bench, squat, deadlift, overhead press): the reference lifter's 6-rep weight at each level comes from the curves in
  `js/data/rank-bench.js` (GymStreak 2026, CC BY 4.0; OpenPowerlifting, public domain), sex- and body-weight-sensitive. It is turned into a
  reference max with the rep table (reference side only).
- **Rep tables** (`repTable.upper`, `repTable.lower`): the share of the reference max at 1–20 reps; past 20 reps no extra credit.
- **Provisional rows**: every other ranked lift is `anchor × factor` with a stated protocol (bar, per hand, single dumbbell). Female overhead
  press has no open curve: female bench × the male ohp/bench ratio at the same level.
- **Bodyweight** (pull-ups, dips, push-ups, inverted rows and variations): reps needed per level at 70 kg (men) / 60 kg (women), scaled by
  (reference / body weight)^k. With added weight, the level's reps are turned into an added-kg target for the reps done (reference side only).

## Sanity checks (actual results, `node tools/rank-v04-test.js`)
| Case | Result |
|---|---|
| 70 kg man, 9 strict pull-ups | Silver II (intended mid-Silver); after 8 sets of rows: Silver II |
| 70 kg man, incline bench 60 kg × 8 | Gold I (intended roughly Gold) |
| incline 80 × 5: woman 70 kg / man 70 kg / man 100 kg | Diamond I / Platinum I / Gold I |
| 80 kg man, DB bench 30 kg per hand × 8 · goblet one 30 kg DB × 8 | Gold I · Silver II |
| 70 kg man, pull-up +20 kg × 5 | Gold II (next: +24 kg × 5) |
| 80 kg man, bench 60 × 8 once vs twelve times | Silver I both |
| Season: Gold I, raw Silver II under new benchmarks | visible Gold III, badge Gold I; a new lifter: Silver II |

The incline 80 × 5 for a 70 kg woman reaching Diamond I is the provisional model's top end and should be reviewed with real data.

## Coverage
See `RANK_V04_COVERAGE.md`: 341 exercises, 97 ranked (4 sourced, 93 provisional), 129 excluded equipment, 93 PR only, 22 cardio.
