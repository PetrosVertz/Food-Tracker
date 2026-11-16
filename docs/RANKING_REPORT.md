# Ranking: Final Report (deliverable F)

Branch ranking-1 (pushed as `claude/cool-faraday-1ddxi9`), 16 November 2026. Written for Petros, in plain words.

Ranks are a game for motivation. Nothing here measures real-world lifting ability.

## What was done

1. **Checked the previous chat's findings** against the real app. All confirmed: 341 exercises, 71 with a rank, and the pull-up problem (one set of 9 at 70 kg is Bronze III, three sets make it Silver II). The cause is the design: the old rank rewards doing more sets.
2. **Researched the sources** and read every licence (`docs/RANKING_RESEARCH.md`).
3. **Wrote the method** (`docs/RANKING_ALGORITHM.md`).
4. **Built the benchmark files** from open data only (`data/rank/`).
5. **Built a simulator**: a page for the phone (`docs/rank-simulator.html`, on the published site at `/docs/rank-simulator.html` once merged) and a command (`node tools/rank/sim.js`).
6. **Built the new engine** as separate files, switched off (`js/rank-engine.js`, `js/rank-v2.js`).
7. **A list of all 341 exercises** with their status (`docs/RANKING_EXERCISES.md`).

**Not changed:** the live ranking (`tierFor()` and the old standards), every screen, VERSION and CACHE. The app behaves exactly as before. Three small script files are now loaded by the app but nothing uses them.

## What is real data

| Thing | Where it comes from |
|---|---|
| How much ordinary gym-goers lift on **bench press, back squat, deadlift** (men and women) and **overhead press** (men), from the 25th to the 90th percentile, at each body weight | GymStreak's study of 149,299 app users (free to use with credit) |
| How strength changes with body weight, separately for each lift, sex and level | Fitted to the same GymStreak tables (fit error 1.5% to 3.6%) |
| How strength falls with age from 40 on (bench, squat, deadlift) | OpenPowerlifting, 4 million competition results (public domain) |
| The heaviest lift ever made at each body weight (used to catch typos) | OpenPowerlifting |
| Smith machine squat is about 9% heavier than a free squat | One study of 11 trained women |
| That beginners start in Bronze II, "intermediate" lifters reach Silver III in a year and "advanced" ones Gold III | GymStreak's progress study, placed on the new scale |

## What is an estimate

1. **Platinum II and everything above it, and the very bottom of Bronze.** The open data stops at the 90th percentile (the start of Platinum III). Above that the curve is simply continued. It was checked against competition lifters and looks right (Diamond I is around a good competitor's level), but it is not measured.
2. **The two "bridge" numbers.** The brief wants two measurements: best single-set volume and heaviest weight. No open source publishes those. GymStreak publishes one figure per person (their best set of 1 to 10 reps), so I had to assume which set is a typical person's heaviest (a heavy set of 5 reps) and which is their best-volume set (a set of 10). This is the weakest part of the system.
3. **The time-to-rank table from Gold II upwards.** The progress data covers 12 months only; "several years" and "many years" are judgement from how rare those levels are.
4. **The age adjustment** comes from competition lifters, who may age differently from casual gym-goers. It errs on the kind side for older users. It also does nothing yet, because the app does not store age.
5. **Smith machine squat** (women): one small study, marked "Estimate" and low confidence.

## What has no rank yet

- **314 of the 319 non-cardio exercises**, including **pull-ups**, all curls, all dumbbell lifts, all machines and all cables. No open data with usable numbers was found for any of them. The engine handles pull-ups correctly (body weight plus added weight, minus assistance, and one set of 9 ranks the same as four sets), but it has nothing to compare them with.
- **Women's overhead press**: too little data (445 lifters, and half of them are at the empty bar).
- **Smith machine squat for men**: the only study is on women.
- Today the live app ranks 71 exercises; the new engine ranks 5. That is the honest result of "sourced values only".

## What works (and how to test it)

- On your phone: open `docs/rank-simulator.html` from the published site. Pick an exercise, sex, age, body weight, add sets. It shows both percentiles, the score, the rank, "pending" and "Check this set", and the kg needed for every rank. Tick "synthetic test exercises" to try pull-ups and curls with invented numbers (the page says so in a warning).
- All the brief's test cases, with results: `node tools/rank/sim.js` (the same tables are in the algorithm document).
- `node tools/check.js --boot` passes and now also tests the new engine: more weight or reps never lowers a rank, more sets change nothing, low-rep and high-rep training of the same strength give the same rank within one level, the same percentile is the same rank at every body weight, a first workout never shows Platinum, a 900 kg typo is not counted, one bad day never lowers a rank, and the switch is off.

Some results to judge whether it feels right (80 kg man, bench press, one set of 8 reps):

| Rank | Weight for 8 reps |
|---|---:|
| Silver III (the median lifter) | 52.5 kg |
| Gold III | 68.5 kg |
| Platinum III | 85.5 kg |
| Diamond III | 108.5 kg |
| Diamond I | 134.5 kg |

For a 65 kg woman: Silver III at 30.5 kg, Gold III at 37.5 kg, Platinum III at 46.5 kg, Diamond I at 72.5 kg.

The same weights work for any set of 1 to 8 reps; with a set of 10 reps about 12% less is enough.

## What you must decide

1. **The live standards table says it comes from Strength Level.** The comment above `TIER_STD` in `js/data/gym.js` reads "Source: Strength Level … rounded to the nearest 0.05". Their licence page says even rounded values in a free personal app need written permission. I am not a lawyer, but I would not leave it as it is. Options: switch to the new engine for the lifts it covers and show no rank elsewhere; or ask Strength Level for a licence; or keep the old table knowingly until one of those happens.
2. **How to get ranks for the other 314 exercises.** Three routes:
   - **Buy a Strength Level licence.** Contact support@strengthlevel.com, subject "Data Licensing Enquiry". Their guide price for a yearly licence is "1 to 3 months of a senior software engineer's time" (so thousands of euros a year), and they prefer established businesses.
   - **Collect anonymous data in the app** (the 0.8 plan, with consent). Free and it fixes the weakest part of the system too, but it needs a few hundred users per exercise before a rank can be trusted.
   - **Stay with the barbell lifts** and add variation estimates as studies are found.
3. **When to switch the live rank.** With only 5 exercises ranked, switching now would remove the rank from 66 exercises. My suggestion: do not switch yet; decide points 1 and 2 first.
4. **High-intensity, low-volume lifters are now represented (changed after your message).** The first version averaged the two measurements, which pushed people who only do heavy sets of 1 to 5 reps several ranks too low. Now **the rank follows the better of your two measurements**: the heaviest weight for low-rep lifters, the best set volume for higher-rep lifters. In the tests, someone doing only triples or 5 × 5 lands within one rank of an equally strong person doing sets of 10. What is left: a true all-out single reads about one rank high, and people who only do sets of 8, or 15 and more, read about one rank low. Say if you want it nudged either way.
5. **The new scale is more generous than the old one.** Example: a 70 kg man benching 75 kg for sets of 10 is about Silver I in the live app and Platinum II in the new engine, because the real median gym-goer is weaker than the old table assumed. This matches your "average user is Silver III" rule, but ranks would jump on the day of the switch.
6. **Reps above 10 add no volume.** Needed so that 30 easy reps cannot beat 10 hard ones. A set of 15 counts as 10 of its reps. Say if you prefer 12.
7. **Age.** The engine can adjust for age from 40 on, but the app has no birth year. Add one to the profile, or leave age out.
8. **Credit lines.** If these ranks go live, the app must show the GymStreak and OpenPowerlifting credit somewhere (for example Settings › About). Wording is in `data/rank/README.md`.
9. **The 50 guessed variant factors** in the live app (incline bench 0.85 and so on) are listed one by one in `docs/RANKING_EXERCISES.md`. None has a source. They go away with the old engine; until then they stay as they are.

## What could not be researched

- The reference study (doi 10.1186/s13102-026-02195-6): its web page asked for a "not a robot" check, so the full text was not read. Its licence (no derivatives, non-commercial) would not allow using its numbers anyway. Attach the PDF if you want it reviewed for method.
- The updated reps-at-percentage table of Nuzzo et al. 2024 is published as an image; no numbers were taken from it.
- Kaggle, Hugging Face, OSF and Figshare were not searched directly (not on the allowed network list).
- Sourced variation factors beyond the Smith squat need the full text of individual studies; abstracts rarely give the ratio.

## For the next chat (technical pointers)

- To change a threshold, weight or rule: edit `data/rank/rank-config.json`, run `node tools/rank/build-bench.js`, then `node tools/rank/sim.js` and `node tools/check.js --boot`.
- To add an exercise with real data: add its source table under `data/rank/sources/`, an entry under `exercises` in the config, and teach `build-bench.js` to read the table if its format is new.
- To add a variation factor: an entry under `variants` with `anchor`, `factor` per sex, `source`, `n` and `confidence`. The build refuses one without a source.
- The switch, when approved: in `tierFor()` add `if(RANK2.on) return rank2For(exId, noLive);` and set `RANK2.on` in `js/rank-v2.js`. The screens then need three small additions: the "pending" note, "Estimate, based on …", and "Check this set" (the result already carries `pending`, `estimate` and `checks`). All of them must respect the Ranks switch of 0.7.10.6.
- `tools/check.js` fails on purpose if the live rank code mentions the new engine or if `RANK2.on` is true; update that check when switching.
