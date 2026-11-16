# Universal exercise ranking system: research, design and build brief (Petros's spec)

Paste into a new chat (Opus): *"Read docs/notes/ranking-brief.md in the Food-Tracker repo and follow it, with CLAUDE.md. Start with section 0 (what I already found), then research, then build. Do not change the live rank engine until the new one is validated."* Petros is not a programmer: explain results in plain words.

## 0. What the previous chat found in the live app (0.7.10.4), verified by running the real code

- **Only 71 of the 341 exercises have a rank at all.** Ranks exist for the exercises listed in `TIER_STD` (21 base lifts, ratios of body weight for Beginner / Novice / Intermediate / Advanced / Elite) plus `TIER_VARIANT` (a variant strength factor of a base lift), both in `js/data/gym.js`. Every other exercise shows no rank.
- **The pull-up problem Petros reported is real.** Tested with the app's own `tierFor()`, a 70 kg man, unassisted pull-ups:
  - 1 set of 9 reps: **Bronze III**
  - 3 sets (9, 8, 7): Silver II
  - 4 sets (9, 9, 8, 8): Silver II
  The current engine (`RANK`, `rankParts`, `rankScore`, `rankSteps` in `js/data/gym.js`, `tierFor` in `js/gym.js`) mixes **60% peak estimated 1RM + 25% average of the top 3 sets + 15% single-session volume**, all from `e1rm()` (Epley) and divided by body weight to the power 0.67. So it **rewards doing many sets** and punishes a single great set, and it uses estimated 1RM. Both go against this brief (best single set only, no estimated 1RM, no total volume). `loadOf()` in `js/wire/04-gym.js` already gives the effective load for bodyweight exercises (body weight + added) and for assisted ones (body weight minus assistance); reuse it.
- The standards table is a short list of body-weight ratios taken from general knowledge, not from cited data, and has no age adjustment.
- Reusable: `loadOf`, `isMainSet`, `bodyW`, `latestWeight`, `tierBody` (needs sex and body weight; age is not stored yet), the rank names (`TIERS`, `tierName`), the 15 plate images in `img/rank/`, the bar bubble, rank-up window, Highest Rank card, leaderboards and stats that read `tierFor()` (keep its result shape: `n`, `tier`, `label`, `frac`, `next: { n, tier, label, kg }`, `none`, `need`).
- Sets are stored as `{ done, type (N, W = warm-up, drop flag), side (L/R), w, r, rir, hr, ng }`; dumbbell weights follow the app's existing per-hand convention (check `exById(id).e` and how the set is entered before deciding).
- The app has no server: benchmarks must ship as static data files in the repo (small, versioned) and work offline.

## 1. The core concept
(Petros's text, unchanged below.)

I want to develop a proper exercise-ranking algorithm for my existing fitness app. It is a social gamification feature: a Bronze, Silver, Gold, Platinum or Diamond rank for performance on individual exercises. It is NOT an official strength-sport ranking system. It should be about 80-90% fair and consistent in practice, grounded in real lifting data, not arbitrary numbers.

Every exact exercise has its own independent ranking system (barbell curl, standing strict curl, preacher curl, spider curl, Bayesian curl, barbell bench, incline dumbbell bench, lat pulldown, pull-ups, leg extension...). Separate exercises, separate benchmarks. A user can be Diamond in preacher curls and Silver in barbell curls. We DO NOT compare one exercise to another. We DO NOT want one universal strength rating. We DO NOT want ranks that change with the number of app users. Every exercise needs fixed, universal benchmarks.

## 2. The ranking system
Bronze III, II, I, Silver III, II, I, Gold III, II, I, Platinum III, II, I, Diamond III, II, I (Bronze III lowest, Diamond I highest). The average regular gym-goer should land around Silver I to Gold III. The distribution is fixed and independent of the number of app users.

Proposed reference percentile bands (evaluate before finalising):

| Rank | Percentile |
|---|---|
| Bronze III | below 5 |
| Bronze II | 5-10 |
| Bronze I | 10-20 |
| Silver III | 20-30 |
| Silver II | 30-40 |
| Silver I | 40-50 |
| Gold III | 50-60 |
| Gold II | 60-70 |
| Gold I | 70-80 |
| Platinum III | 80-85 |
| Platinum II | 85-90 |
| Platinum I | 90-95 |
| Diamond III | 95-97 |
| Diamond II | 97-99 |
| Diamond I | 99+ |

The actual thresholds are stored as fixed exercise-specific values, never calculated from the current app user population.

## 3. The performance metrics
**No estimated one-rep max.** No Epley, Brzycki, Wathan or any other 1RM formula in the ranking algorithm. Evaluate what the user actually logged. Two primary measurements:

**A. Best single-set volume.** `set_volume = actual_weight x repetitions`; use the highest-volume individual set, not total volume across sets or the workout. Example: 100x1 = 100, 90x3 = 270, 80x6 = 480, 70x10 = 700 (set four wins). This avoids over-rewarding low-rep max-strength training.

**B. Maximum actual weight.** The highest actual weight successfully logged for that exact exercise. A 100 kg single deserves recognition even when someone else moves more weight in one set.

Initial hypothesis: `Final performance score = 60% volume percentile + 40% maximum-load percentile`. Convert both measurements to exercise-specific percentile scores first; never combine raw kg with kg-reps. Test 50/50 and 70/30 too, explain which is fairest and why, and beware double-counting strength (the two are related). No total-workout volume, no frequency farming, no consistency bonus, no user-entered ROM or RPE.

## 4. Bodyweight is critical
A 50 kg person benching 120 kg is very different from a 150 kg person benching 100 kg. But no crude divide-by-bodyweight. Compare actual performance against a reference for: sex reference category, age, exact bodyweight, exact exercise. Use bodyweight-adjusted benchmark curves; investigate allometric scaling, regression and other normalisation. **Do not apply one bodyweight exponent to every exercise** (bench, squat, biceps curl, lateral raise and pull-up scale differently); derive per exercise where possible. Use a young-adult reference population (about 18-35) as baseline and investigate age adjustments for older users. Bodyweight is recorded alongside the performance so the comparison uses the body weight at that time.

## 5. Different exercise types
Every exact exercise needs its own benchmark model.
- **Free weights** (bench, squat, deadlift, barbell and dumbbell curl): actual external weight and reps; respect the app's convention for per-hand versus combined dumbbell loads.
- **Machines** (hack squat, leg extension, machine chest press): numbers are not comparable between manufacturers; investigate how to handle it; no arbitrary machine penalty.
- **Cables** (cable fly, pushdown, cable curl, lat pulldown): account for pulley configuration and calibration where possible.
- **Bodyweight** (pull-ups, chin-ups, dips, push-ups): actual bodyweight, reps, added weight, assistance. Weighted: `effective_load = bodyweight + additional_weight`. Assisted: `effective_load = supported_bodyweight - assistance + additional_weight`. Where a bodyweight participation coefficient is needed, investigate and document an exercise-specific value. Push-ups and pull-ups do not move the same share of body weight. Do not invent unsupported coefficients.

## 6. Benchmark database (the most important part)
A structured database with, for each exact exercise: exercise ID, exact name, equipment category, sex-specific reference data, age adjustments, bodyweight adjustments, maximum-actual-load benchmarks, best-single-set-volume benchmarks, percentile thresholds, number of observations, original data source, data licence, confidence level, last calibration date, benchmark version. Ideal data: regular recreational gym-goers, not only competitive powerlifters; not an average of all adults (that makes every gym-goer look exceptionally strong). Realistic gym-going standards.

Research these first:
1. **Strength Level**: https://strengthlevel.com/strength-standards , /about , /data-licensing. The most important reference: how it handles exercise-specific standards, bodyweight, sex, age, percentile classes; very wide exercise coverage.
   **IMPORTANT (updated by Petros): its standards, data and models require a written licence for reuse in another product. Do not copy, scrape, manually transcribe, reverse-engineer or derive our thresholds from its proprietary numerical standards. Investigate licensing if commercially viable.** So Strength Level is for understanding the method (how it handles bodyweight, sex, age, percentile classes) only. No number from it goes into our benchmark files, and the research report records the licence question and what a licence would involve (who to contact, cost if published, what we would get).
2. **OpenPowerlifting**: https://openpowerlifting.gitlab.io/opl-csv/ and https://data.openpowerlifting.org/ . Public-domain competition data; may support actual maximum-load benchmarks for bench, squat, deadlift. Competitive lifters, so not the average gym-goer.
3. **GymStreak research**: https://www.gymstreak.com/research/how-lifters-train . Downloadable aggregate datasets, CC BY 4.0. Real-world rep ranges, training habits and set distributions; not complete strength benchmarks.
4. **Published reference study**: https://doi.org/10.1186/s13102-026-02195-6 . Sex- and age-specific squat, bench, deadlift reference values. Uses estimated 1RM, so do not use its scoring approach; use it for population differences and bodyweight normalisation context.
5. **Symmetric Strength**: https://symmetricstrength.com/standards and /about . Bodyweight-adjusted framework and exercise classes; use for methodology comparison, do not copy the proprietary model.
6. **Buffro**: https://buffro.app/research/strength-standards . Published explanation of exercise-specific standards, bodyweight scaling and calculation branches. Proprietary standards: do not copy.
Also look for genuinely open datasets and studies with actual weight-and-reps performance. A small one worth checking: https://doi.org/10.5281/zenodo.3253731 (3-7RM across 15 exercises, 28 participants): too small for universal benchmarks, maybe useful for method validation.

## 7. Missing exercise data
Hundreds of exercises eventually; not all will have enough data. Hierarchy: (1) direct benchmark data for the exact exercise; (2) a validated model from closely related variations; (3) a provisional benchmark with a clearly disclosed confidence level; (4) no rank if the evidence is insufficient. Spider and preacher curls must not automatically share standards; if a related movement is a proxy, document why and how it is adjusted. Do not invent thresholds to fill the database; do not label unsupported exercises as accurately calibrated. First establish a properly researched group of **30-50 priority exercises** before expanding.

## 8. Fixed benchmarks
Not Elo, not a live leaderboard ranking. The reference population sets the standards, converted to fixed thresholds per exercise. Adding 100 or 100,000 app users must not change the requirements. Benchmark updates are versioned and intentional. Each benchmark records its source and method.

## 9. Test cases (build the simulator first)
Bench: 50 kg bodyweight 120 kg bench; 75 kg bw 100 kg; 100 kg bw 100 kg; 150 kg bw 100 kg (do not assume the ranks; derive from the model). Single-set volume: 100x1, 90x3, 80x6, 70x10 (confirm volume rewards the right set while max load still recognises the heaviest lift). Pull-ups: 70 kg bw 9 unassisted; 90 kg bw 9 unassisted; 70 kg bw 9 reps +10 kg; 70 kg bw 9 reps with assistance (**the current implementation gives an obviously low rank for 8-9 unassisted pull-ups at about 70 kg: investigate first**, see section 0). Curl variations: barbell, strict standing, preacher, spider, Bayesian, each with its own curve.

## 10. Implementation requirements
Existing application: do not rebuild it. Before writing code: inspect the project structure; find the current ranking algorithm (done in section 0, verify); identify how exercise IDs and categories are stored; how sets, reps, weights and body weight are recorded; trace the pull-up result; identify what to reuse. Do not alter unrelated screens, workout functionality, styling or navigation. Separate the ranking engine from the UI; modular so benchmark values and scoring weights can change without rewriting the app. Suggested components (adapt names to the codebase): `exerciseBenchmarkDatabase`, `bodyweightNormalization`, `singleSetVolumeCalculator`, `maximumLoadCalculator`, `exercisePercentileCalculator`, `rankThresholdMapper`, `rankingConfidence`, `benchmarkVersionManager`.

## 11. Deliverables
- **A. `RANKING_RESEARCH.md`** (put in `docs/`): datasets, data quality, licensing, exercise coverage, male/female coverage, bodyweight and age coverage, missing data, recommended sources.
- **B. `RANKING_ALGORITHM.md`** (in `docs/`): exact scoring formula; how bodyweight normalisation works; how age and sex are handled; single-set volume; maximum actual weight; percentile thresholds to ranks; bodyweight exercises; how confidence is determined.
- **C. Benchmark database:** JSON/CSV files in the repo (small, versioned, offline) with exercise metadata and **sourced** values only. Synthetic test values clearly labelled synthetic and never treated as production.
- **D. Ranking simulator:** a way to enter exercise, sex category, age, bodyweight, load, reps and see the volume score, maximum-load score, combined rating and rank (for example a small page `docs/rank-simulator.html` that loads the same engine file, usable on the phone for odd bodyweights).
- **E. Initial implementation:** the modular engine in the app, **kept separate from the live ranking** until real benchmark data exists (a switch in code, off by default).
- **F. Final report:** what changed, what works, what remains uncalibrated, which benchmarks have real supporting data, which exercises still need research, how to test.

## Variation factors (Petros's idea, adopted)
Niche variations (preacher curl, spider curl, Bayesian curl, incline presses, and so on) are ranked from a well-supported **anchor lift** of the same family (barbell curl, bench, squat, deadlift, row, pulldown...) using a **difficulty factor**: the variation's thresholds are the anchor's thresholds multiplied by the factor. This is step 2 of the hierarchy in section 7 (a validated model using closely related variations). Rules:
- **Sourced factors only.** A factor must come from a published comparison of the two exercises (cite it, with sample size and sex/age of the subjects), or from the app's own anonymous data later (0.8, with consent): the ratio between one person's best set on the variation and on the anchor, averaged across many people, then frozen in a numbered benchmark version. Never invent a factor. The existing `TIER_VARIANT` numbers in `js/data/gym.js` (for example incline bench 0.85) are unsourced guesses: treat them as provisional, list them in the report, and replace or flag each one.
- **Same family and same equipment type** (barbell with barbell, dumbbell with dumbbell, cable with cable, machine with machine). A factor between different equipment types needs its own evidence.
- **No chains**: a variation of a variation is not ranked.
- **Shown honestly in the app**: a rank from a factor is marked "Estimate" with its anchor (for example "Estimate, based on Barbell Curl"); an exercise with no usable anchor shows no rank.
- Factors can depend on sex and body size; check whether the ratio is stable across them before using one number.
- The research report lists every exercise in the app, its anchor (if any), its factor, the source and the confidence, so Petros can see exactly what is real and what is missing.

## Final instructions
Fairness matters more than speed. No mathematically sophisticated but arbitrary ranks. An understandable, consistent system backed by real-world lifting data. Do not use estimated 1RM, total workout volume, user-entered ROM or technique, comparisons between exercise cards, user-count-based thresholds, invented benchmark values, or changes to unrelated parts of the app. Investigate the existing implementation and the available data first, then build the foundations. The goal: a fun social feature where a rank on each exercise feels deserved.

## Notes added by the planning chat
- The sandbox the chat runs in may not reach every website listed (OpenPowerlifting, Strength Level and others). If a source cannot be fetched, say so in `RANKING_RESEARCH.md`, list exactly what is blocked, and do not fill the gap with remembered numbers presented as data. Ask Petros to download the file and attach it.
- Every source has terms of use: read each licence and record it. Only store thresholds that are derived from data we are allowed to use (OpenPowerlifting is public domain, GymStreak is CC BY 4.0 and needs credit, published studies need citing). Strength Level, Symmetric Strength and Buffro are proprietary: methodology reading only, no numbers copied, no values re-derived from their tables.
- Because only a few sources are open, the 30-50 priority exercises may start with fewer than 30 that have real data. That is acceptable: list exactly which have real support and which rank nothing yet (section 7, step 4). If open data covers only the big lifts, say so plainly; Petros will then decide whether to pay for a licence or to collect anonymous in-app data later with consent.
- Keep every existing screen working during the build: the live `tierFor()` stays untouched until Petros approves the switch.
