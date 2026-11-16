# Ranking Algorithm (deliverable B)

Branch ranking-1, benchmark version 1.0.0, 16 November 2026. Code: `js/rank-engine.js`. Numbers: `data/rank/benchmarks.v1.json` (built from `data/rank/rank-config.json` and the open sources). Research: `docs/RANKING_RESEARCH.md`.

Ranks are a game for motivation. They do not represent real-world lifting ability and are not for judging anyone. There is no comparison between friends and no leaderboard of ranks.

**This engine is not live.** The app still uses the old `tierFor()`.

## The idea in five sentences

1. Each exercise has its own fixed yardstick: how much regular gym-goers who train that exercise lift, by sex, body weight and age.
2. From everything you logged, two things count: your **best single set by volume** (kg × reps) and the **heaviest weight** you lifted.
3. Each of the two is turned into a percentile: "stronger than this share of gym-goers of your sex, body weight and age on this exercise".
4. The two percentiles are mixed half and half into a score from 0 to 100, and the score falls into one of 15 fixed bands, Bronze III to Diamond I.
5. A few common-sense rules stop silly results: Platinum and Diamond need a second workout, a typo does not count, a rank climbs at most two levels per workout and never falls because of one bad day.

No estimated one-rep max is applied to what the user logged, no total workout volume, no number of sets, no comparison between exercises, nothing that depends on how many people use the app.

## 1. The exact scoring formula

For one exercise and one person:

```
set volume        V = load × min(reps, repCap)          repCap = 10
set load          L = load                               (load = the weight the set really moved, see section 6)

volume percentile pV = percentile of the best V   (best finished normal set, last 12 months)
load percentile   pL = percentile of the best L   (heaviest finished normal set, last 12 months)

score = 0.5 × pV + 0.5 × pL                               (0 to 100)
rank  = the band the score falls in (section 5)
```

- "Finished normal set": ticked as done, not a warm-up, not a drop set, and for left/right exercises only one side (the app's existing `isMainSet`).
- The best V and the best L may come from different sets and different workouts.
- Each set is compared using **the body weight on the day of that set**.
- Doing the same set once or five times gives the same rank (tested in `tools/check.js`).

### Why reps above 10 add no volume

Without a limit, kg × reps keeps growing as the weight drops: 30 easy reps would beat 10 hard ones. Ten is the median set in the GymStreak data and the top of the 1 to 10 rep window its strength figures are built on. A set of 15 still counts, as 10 of its reps.

## 2. The reference curves (where the percentiles come from)

For each exercise and sex the database holds four **percentile curves** taken from GymStreak: the 25th, 50th, 75th and 90th percentile lifter at every body weight.

```
reference(p, bodyweight) = a_p × (bodyweight / refBw) ^ k_p
```

- `a_p`: what the p-th percentile lifter moves at the reference body weight (80 kg men, 65 kg women).
- `k_p`: how fast that grows with body weight. **Each exercise, each sex and each percentile has its own value**, fitted to GymStreak's body-weight bands. There is no single exponent for everything.
- Between the four curves, straight lines (on a bell-curve scale). Below the 25th and above the 90th the nearest line is continued: **an estimate, not data**.
- Above the 90th percentile the body-weight exponent moves towards the one measured on OpenPowerlifting competitors and reaches it where Diamond starts (98th percentile), because the people up there are competition-level lifters.
- Body weights outside the range the data covers are treated as the nearest covered weight (for example a 150 kg man is measured as 139 kg).

The fitted values:

| Exercise | Sex | Lifters | Body weights covered | a: 25th / 50th / 75th / 90th (kg) | k: 25th / 50th / 75th / 90th / 98th+ | Reps of the max-load set | Fit error (median) | Confidence |
|---|---|---:|---|---|---|---:|---:|---|
| Bench press | Men | 10,244 | 50 to 139 kg | 47.1 / 64.7 / 82.5 / 99.5 | 0.547 / 0.6 / 0.654 / 0.702 / 0.734 | 7 | 3.6% | high |
| Bench press | Women | 1,709 | 50 to 99 kg | 29.4 / 36.5 / 44.6 / 53.7 | 0.16 / 0.17 / 0.18 / 0.189 / 0.506 | 7 | 1.8% | medium |
| Back squat | Men | 4,773 | 60 to 119 kg | 52.5 / 78.1 / 104.9 / 128.1 | 0.417 / 0.478 / 0.538 / 0.593 / 0.706 | 8 | 3.1% | high |
| Back squat | Women | 1,937 | 50 to 99 kg | 35.5 / 50 / 65.2 / 81.2 | 0.174 / 0.168 / 0.162 / 0.157 / 0.57 | 8 | 2.3% | medium |
| Deadlift | Men | 3,554 | 60 to 119 kg | 52.9 / 81 / 114.9 / 144.2 | 0.405 / 0.439 / 0.474 / 0.504 / 0.556 | 7 | 1.8% | high |
| Deadlift | Women | 1,610 | 50 to 99 kg | 37.8 / 51.2 / 69.8 / 88.1 | 0 / 0.112 / 0.288 / 0.446 / 0.453 | 7 | 1.5% | medium |
| Overhead press | Men | 2,702 | 60 to 119 kg | 30.9 / 39 / 49.1 / 58.9 | 0.312 / 0.389 / 0.465 / 0.534 / 0.534 | 8 | 2.2% | medium |

"Fit error" is how far the smooth curves are from GymStreak's published band values: 1.5% to 3.6%.

### The bridge: from GymStreak's figure to our two measurements (an assumption)

GymStreak publishes one number per lifter: their best set of 1 to 10 reps, written as `weight × (1 + reps ÷ 30)`. It does not publish the heaviest weight or the best set volume. No open source does. So each reference value is turned back into two real sets with GymStreak's own formula:

```
max-load reference = reference ÷ (1 + r ÷ 30)        r = the 25th-percentile rep count on that lift (7 for bench and deadlift, 8 for squat and overhead press)
volume reference   = 10 × reference ÷ (1 + 10 ÷ 30)  = a set of 10 reps
```

In words: the reference lifter's heaviest set is assumed to be one of their lower-rep sets (7 or 8 reps), and their best-volume set a set of 10. Both rep counts come from GymStreak's rep statistics, but **which set a person's heaviest or best-volume set is, is an assumption**. The formula is used only to rebuild the reference, never on the user's own sets. These two constants (`kL`, `kV` in the data file) are the weakest part of the system and the first to replace with measured values once the app can collect anonymous data with consent.

## 3. Sex, age and body weight

- **Sex**: separate curves from separate data. A woman is compared with women, a man with men. Without a sex in the profile there is no rank (same as today).
- **Body weight**: through the curves above, at the body weight of the day. This is what makes a 60 kg woman's Gold II and a 100 kg man's Gold II mean the same thing: both are stronger than the same share of people like them.
- **Age**: the thresholds of older lifters are lowered. Baseline is young adults; nothing changes up to 37. From 40 on, each exercise and sex has its own factor from OpenPowerlifting (the median lift of the age band next to ages 24 to 34), for example men's bench 0.93 at 50 to 54 and 0.84 at 60 to 64. Overhead press has no competition data, so no age adjustment. **The app does not store age yet**, so in the app this does nothing until a birth year is added to the profile.

Example: an 80 kg man, bench press, the same single set of 80 kg x 8 (a first workout, so Platinum shows as pending):

| Age | Rank |
|---|---:|
| 25 | Gold II |
| 40 | Gold II |
| 50 | Gold I |
| 60 | Gold I (Platinum III pending) |
| 70 | Gold I (Platinum I pending) |

## 4. Why 50/50 (the weights were tested)

The brief's first guess was 60% volume and 40% max load, with 50/50 and 70/30 to test. Invented lifters of the same true strength were given different training styles:

**50% volume / 50% max load**

| Style | 20th pct lifter | 50th | 75th | 90th | 98th |
|---|---:|---:|---:|---:|---:|
| Singles only | Bronze II | Bronze I | Bronze I | Silver III | Silver III |
| Triples only | Bronze III | Bronze I | Silver III | Silver III | Silver II |
| 5 x 5 only | Bronze III | Bronze I | Silver III | Silver I | Gold II |
| Sets of 8 | Bronze III | Bronze I | Silver I | Gold II | Platinum II |
| Sets of 10 | Bronze II | Silver III | Silver I | Gold I | Platinum II |
| Sets of 12 | Bronze II | Bronze I | Silver I | Gold II | Platinum II |
| Sets of 15 | Bronze III | Bronze I | Silver II | Gold III | Platinum II |
| Sets of 5 and 10 | Bronze II | Silver III | Gold III | Platinum III | Platinum II |
| A single and sets of 10 | Bronze II | Silver II | Gold II | Platinum III | Platinum II |

**60% volume / 40% max load**

| Style | 20th pct lifter | 50th | 75th | 90th | 98th |
|---|---:|---:|---:|---:|---:|
| Singles only | Bronze III | Bronze II | Bronze I | Bronze I | Bronze I |
| Triples only | Bronze III | Bronze II | Bronze I | Bronze I | Silver III |
| 5 x 5 only | Bronze III | Bronze II | Silver III | Silver II | Gold III |
| Sets of 8 | Bronze III | Bronze I | Silver II | Gold II | Platinum II |
| Sets of 10 | Bronze II | Silver III | Gold III | Gold I | Platinum II |
| Sets of 12 | Bronze II | Bronze I | Silver I | Gold II | Platinum II |
| Sets of 15 | Bronze III | Bronze I | Silver II | Gold III | Platinum II |
| Sets of 5 and 10 | Bronze II | Silver III | Gold III | Platinum III | Platinum II |
| A single and sets of 10 | Bronze II | Silver II | Gold II | Platinum III | Platinum II |

**70% volume / 30% max load**

| Style | 20th pct lifter | 50th | 75th | 90th | 98th |
|---|---:|---:|---:|---:|---:|
| Singles only | Bronze III | Bronze II | Bronze II | Bronze II | Bronze II |
| Triples only | Bronze III | Bronze II | Bronze II | Bronze I | Silver III |
| 5 x 5 only | Bronze III | Bronze II | Bronze I | Silver II | Gold III |
| Sets of 8 | Bronze III | Bronze I | Silver II | Gold II | Platinum II |
| Sets of 10 | Bronze II | Silver III | Gold III | Gold I | Platinum II |
| Sets of 12 | Bronze II | Bronze I | Silver I | Gold I | Platinum II |
| Sets of 15 | Bronze III | Bronze I | Silver II | Gold II | Platinum II |
| Sets of 5 and 10 | Bronze II | Silver III | Gold III | Platinum III | Platinum II |
| A single and sets of 10 | Bronze II | Silver II | Gold II | Platinum III | Platinum II |

What this shows:
- People who train around 8 to 12 reps, or who mix heavy and lighter sets, land where they should with any of the three.
- **People who only ever do low reps are ranked too low**, because a set of 3 is a small kg × reps. The more weight volume gets, the worse it is: at 70/30 a very strong lifter who only does triples is Silver III. At 50/50 the damage is smallest of the three options, so 50/50 is the default.
- The two measurements overlap (both grow with strength), which is fine here: a lifter whose two percentiles agree gets exactly that percentile as the score.
- This is a property of the two measurements the brief chose, not a bug. It is listed in the final report as a decision: keep it (it does what the brief wanted: no reward for max-strength-only training), or soften it.

The weights are two numbers in `data/rank/rank-config.json`.

## 5. From score to rank

The reference population is regular gym-goers who train that exercise. The median lifter (score 50) is **Silver III**.

| Rank | Score from | Share of lifters at or above |
|---|---:|---|
| Bronze III | 0 | everyone |
| Bronze II | 15 | 85% |
| Bronze I | 30 | 70% |
| Silver III | 45 | 55% |
| Silver II | 55 | 45% |
| Silver I | 64 | 36% |
| Gold III | 72 | 28% |
| Gold II | 79 | 21% |
| Gold I | 85 | 15% |
| Platinum III | 90 | 10% |
| Platinum II | 93.5 | 6.5% |
| Platinum I | 96 | 4% |
| Diamond III | 98 | 2% |
| Diamond II | 99 | 1% |
| Diamond I | 99.7 | 0.3% |

This is the brief's section 2b draft, kept after testing: Bronze is the bottom 45%, Silver III to Gold I is the solid middle (45th to 90th percentile), Platinum is the top 10%, Diamond the top 2%. The thresholds are fixed numbers in the data file; the number of app users changes nothing.

### Evaluation against real data

**Where GymStreak's own experience groups land** (their best set in the first two weeks on the lift, and a year later):

Median best set (source unit) of app users in their first 14 days on the lift, by the experience level they chose, and one year later. The progress study has no split by sex, so the groups are placed on the men's curve (about 85% of the bench sample is male): read it as a rough guide.

| Group | Lifters | Start | Rank at the start | After 2 months (typical) | After 12 months (typical) | After 12 months (top quarter) |
|---|---:|---:|---:|---:|---:|---:|
| bench, beginner | 404 | 46.7 kg | Bronze II (22%) | Bronze II (28%) | Bronze II (27%) | Silver III (46%) |
| bench, intermediate | 1269 | 55.5 kg | Bronze I (35%) | Bronze I (41%) | Silver III (47%) | Silver I (69%) |
| bench, advanced | 640 | 73.5 kg | Silver II (59%) | Silver I (64%) | Gold III (73%) | Gold I (85%) |
| squat, beginner | 223 | 53.3 kg | Bronze II (25%) | Bronze I (30%) | no data | no data |
| squat, intermediate | 687 | 63.3 kg | Bronze I (35%) | Bronze I (41%) | Silver III (47%) | Silver I (69%) |
| squat, advanced | 368 | 80 kg | Silver III (50%) | Silver II (56%) | Silver II (63%) | Gold III (77%) |
| deadlift, beginner | 165 | 48.4 kg | Bronze II (20%) | Bronze II (27%) | no data | no data |
| deadlift, intermediate | 459 | 69.5 kg | Bronze I (40%) | Silver III (45%) | Silver III (53%) | Gold III (73%) |
| deadlift, advanced | 259 | 88.7 kg | Silver II (56%) | Silver II (62%) | no data | no data |

So people who call themselves beginners start in Bronze II, "intermediate" lifters sit in Bronze I and reach Silver III within a year, and "advanced" lifters sit in Silver II and reach Gold III. That is the shape the brief asked for.

**Where the top ranks sit among competition lifters:**

The reference weight (the source unit: best set of 1-10 reps x (1 + reps/30)) at the start of each top rank, next to the best competition lifts (real 1RMs) of competitors in the same 10 kg body-weight band.

| Lift | Platinum III | Diamond III | Diamond I | Competitors: median / 90th / 99th | Heaviest |
|---|---:|---:|---:|---:|---:|
| bench, man 85 kg | 104 | 132 | 164 | 132.5 / 165 / 195 | 280 |
| squat, man 85 kg | 133 | 172 | 217 | 195 / 240 / 280 | 353 |
| deadlift, man 85 kg | 149 | 199 | 258 | 227.5 / 272.5 / 315 | 412.5 |
| bench, woman 65 kg | 54 | 68 | 84 | 62.5 / 85 / 110 | 150 |
| squat, woman 65 kg | 81 | 107 | 138 | 115 / 147.5 / 178.5 | 227.5 |
| deadlift, woman 65 kg | 88 | 118 | 155 | 137.5 / 170 / 201 | 250 |

Diamond III starts about where a typical competition lifter's bench is, and Diamond I is near the 90th percentile of competitors on bench and between the median and the 90th on squat and deadlift. So "Diamond I is competition level" holds. The left columns are best-set figures and the right columns real one-rep lifts, so read this as a rough check.

### Time-to-rank table

The loads are exact (from the engine). The times are a reading of the GymStreak progress study, which follows people for 12 months only and groups them by the experience level they chose, not by years trained. Up to Gold III the times rest on that data; from Gold II upwards they are judgement based on how rare the level is.

| Rank | Typical time for a natural lifter training consistently | How rare |
|---|---|---|
| Bronze III, Bronze II | First weeks to first months | bottom 30% |
| Bronze I | 3 to 12 months | |
| Silver III | About a year | the median lifter |
| Silver II, Silver I | 1 to 3 years | |
| Gold III | 2 to 4 years | top 28% |
| Gold II, Gold I | Several years | top 21% to 15% |
| Platinum III to I | Many years, and not everyone gets there | top 10% to 4% |
| Diamond III, II | Exceptional | top 2% to 1% |
| Diamond I | Competition level | top 0.3% |

**Bench press**: kg for one set of 8 reps on its own

| Rank | Man 65 kg | Man 80 kg | Woman 65 kg | Woman 80 kg |
|---|---:|---:|---:|---:|
| Bronze II | 31 | 34.5 | 23 | 23.5 |
| Bronze I | 39.5 | 44 | 27 | 28 |
| Silver III | 47 | 53.5 | 30.5 | 32 |
| Silver II | 52 | 59 | 33.5 | 34.5 |
| Silver I | 56.5 | 64.5 | 36 | 37 |
| Gold III | 61 | 70 | 38.5 | 39.5 |
| Gold II | 66 | 75.5 | 41 | 42.5 |
| Gold I | 70.5 | 81.5 | 44 | 46 |
| Platinum III | 76 | 88 | 47.5 | 50 |
| Platinum II | 81.5 | 94.5 | 51 | 54 |
| Platinum I | 88 | 102 | 55 | 59.5 |
| Diamond III | 96.5 | 112 | 60.5 | 66.5 |
| Diamond II | 105 | 122.5 | 66 | 73 |
| Diamond I | 120 | 139.5 | 75 | 83.5 |

**Back squat**: kg for one set of 8 reps on its own

| Rank | Man 65 kg | Man 80 kg | Woman 65 kg | Woman 80 kg |
|---|---:|---:|---:|---:|
| Bronze II | 33.5 | 36.5 | 25.5 | 26.5 |
| Bronze I | 45 | 49.5 | 33 | 34.5 |
| Silver III | 56.5 | 62.5 | 40.5 | 42 |
| Silver II | 64 | 71 | 45.5 | 47 |
| Silver I | 71 | 79 | 50 | 51.5 |
| Gold III | 77.5 | 87 | 54.5 | 56.5 |
| Gold II | 84.5 | 95 | 59.5 | 61.5 |
| Gold I | 91.5 | 103 | 65 | 67 |
| Platinum III | 99 | 112 | 71 | 74 |
| Platinum II | 106.5 | 121 | 77.5 | 81.5 |
| Platinum I | 115 | 131.5 | 84.5 | 91.5 |
| Diamond III | 126.5 | 145.5 | 94.5 | 105 |
| Diamond II | 138 | 159.5 | 104.5 | 117.5 |
| Diamond I | 159 | 184 | 122 | 137.5 |

**Deadlift**: kg for one set of 8 reps on its own

| Rank | Man 65 kg | Man 80 kg | Woman 65 kg | Woman 80 kg |
|---|---:|---:|---:|---:|
| Bronze II | 34 | 37 | 28 | 28 |
| Bronze I | 46.5 | 51 | 35.5 | 35.5 |
| Silver III | 60 | 65.5 | 42.5 | 43 |
| Silver II | 69 | 75.5 | 47.5 | 49 |
| Silver I | 77.5 | 85.5 | 53 | 55.5 |
| Gold III | 87 | 95.5 | 58.5 | 62 |
| Gold II | 95.5 | 105.5 | 64.5 | 69 |
| Gold I | 104.5 | 116 | 70.5 | 76.5 |
| Platinum III | 114.5 | 127 | 77.5 | 85 |
| Platinum II | 124.5 | 139 | 85 | 93.5 |
| Platinum I | 136 | 152 | 93.5 | 102.5 |
| Diamond III | 152 | 170.5 | 105 | 115.5 |
| Diamond II | 168.5 | 189 | 116.5 | 128 |
| Diamond I | 198 | 222 | 137.5 | 151 |

**Barbell curl and pull-up: no table.** No open benchmark data exists for them (see the research report), so the new engine gives them no rank and there are no honest loads to print. With a licence or in-app data they get the same kind of table.

Reading the tables: a set of 8 is one way to reach a rank. Someone who also lifts a heavier low-rep set needs less on the set of 8. The simulator shows any combination.

## 6. Exercise types

| Type | The weight a set "really moved" | Status |
|---|---|---|
| Barbell | the bar weight typed | 4 lifts ranked |
| Dumbbell | as typed (the app logs one dumbbell) | no benchmark yet; when one is added it must be in the same unit, recorded in the `unit` field |
| Machine, cable | as typed | no benchmark; numbers differ between makers, so no rank rather than a penalty (decision for later: rank per machine from in-app data) |
| Bodyweight (pull-up, dip, push-up) | `share × body weight + added weight` | engine ready; no benchmark, and no sourced `share` for push-ups, so no rank |
| Assisted | `share × body weight − assistance` | engine ready; no benchmark |

`share` is the part of the body weight the exercise moves (1 for pull-ups and dips; push-ups move less and need a sourced value before they can be ranked). Nothing is invented: an exercise without a benchmark shows no rank.

The engine's handling of bodyweight, weighted and assisted sets and of separate curl curves is demonstrated with **synthetic** numbers (`data/rank/synthetic-test.json`, clearly labelled, never loaded by the app):

| Case | Counted load | Rank (synthetic) |
|---|---:|---:|
| 70 kg, 9 unassisted pull-ups, one set | 70 kg | Silver III |
| 70 kg, sets of 9, 8, 7 | 70 kg | Silver III |
| 70 kg, sets of 9, 9, 8, 8 | 70 kg | Silver III |
| 90 kg, 9 unassisted pull-ups | 90 kg | Silver III |
| 70 kg, 9 reps with +10 kg | 80 kg | Silver I |
| 70 kg, 9 reps with 20 kg assistance | 50 kg | Bronze III |

With the real database the same sets give: no rank (no open benchmark data for this exercise).

| Curl (80 kg man, 30 kg x 8; dumbbell and cable: 12 kg x 8) | Rank (synthetic) |
|---|---:|
| Barbell curl (SYNTHETIC) | Silver II |
| Strict standing curl (SYNTHETIC) | Gold III |
| Preacher curl (SYNTHETIC) | Gold II |
| Spider curl (SYNTHETIC) | Gold I |
| Bayesian cable curl (SYNTHETIC) | Silver II |

A sourced variation factor (real): Smith machine squat, 65 kg woman, 60 x 8: Gold III (Estimate, based on Back squat); the same set as a free back squat: Gold II; a man on the Smith machine: no rank (the variation factor has no evidence for this sex).

Note the first three rows: one set of 9, three sets, four sets all give the same rank. That is the pull-up complaint fixed by design.

## 7. Variation factors

A variation without its own data can be ranked from an anchor lift: `thresholds of the variation = thresholds of the anchor × factor`. Rules enforced by the build script: a source and a sample size are required, no chains, a sex without evidence gets no rank. In the app such a rank must be shown as "Estimate, based on <anchor>" (the engine returns `estimate`).

Version 1.0.0 has one: Smith machine squat = 1.092 × back squat, women only, low confidence (11 trained women, Tsoukos & Bogdanis 2025). It is there mainly to prove the mechanism with a real number.

## 8. The coherence rules (brief section 2b)

| Rule | How the engine does it |
|---|---|
| 1. No Platinum or Diamond on the first try | From Platinum III up, a level counts only if a **second workout on another day within 8 weeks** also reached it. Until then the shown rank is at most Gold I and the result carries `pending` ("Platinum II pending"). |
| 2. Implausible sets | A set heavier than the heaviest raw competition lift ever recorded at that body weight (plus 5%), or more than 4.5 standard deviations above the curve, is returned in `checks` ("Check this set") and ignored until the set is marked confirmed (`ok`). |
| 3. Gradual | Workouts are replayed in date order. After the first ranked workout, one workout raises the shown rank by at most two levels. |
| 4. Stable | The best sets of the last 12 months count in full. Older sets lose 1% of their weight per week, never more than 25%. One bad day changes nothing. |
| 5. Fair across body sizes | By construction: the same percentile is the same rank at every body weight and for both sexes. |
| 6. Beginners cannot be Diamond | By the data: see the table below. |
| 7. No friend comparison | None is built. |

| Situation | Rank shown |
|---|---:|
| Four weeks of 60 x 10 | Silver I |
| … then one workout of 130 x 8 (first time) | Gold II (Diamond II pending) |
| … and 130 x 8 again a week later | Platinum III |
| … and a third time | Platinum I |
| Very first workout ever: 130 x 8 | Gold I (Diamond II pending) |
| A typo: 600 x 10 | Silver I; 1 set marked "Check this set" |
| One bad day after the four weeks (40 x 10) | Silver I |
| Strong lifter (100 x 8, 115 x 3) stops training: after 0 weeks | Platinum I |
| Strong lifter (100 x 8, 115 x 3) stops training: after 26 weeks | Platinum I |
| Strong lifter (100 x 8, 115 x 3) stops training: after 52 weeks | Platinum I |
| Strong lifter (100 x 8, 115 x 3) stops training: after 65 weeks | Platinum III |
| Strong lifter (100 x 8, 115 x 3) stops training: after 80 weeks | Gold II |
| Strong lifter (100 x 8, 115 x 3) stops training: after 104 weeks | Gold II |

| Profile | Set | Rank | Diamond III would need (one set of 8) |
|---|---:|---:|---:|
| Man 50 kg, bench | 30 x 10 | Bronze II | 80 kg |
| Man 50 kg, squat | 40 x 10 | Bronze I | 119.5 kg |
| Man 50 kg, deadlift | 50 x 8 | Bronze I | 145.5 kg |
| Woman 50 kg, bench | 20 x 10 | Bronze II | 54 kg |
| Woman 50 kg, squat | 30 x 10 | Bronze I | 83 kg |
| Woman 50 kg, deadlift | 40 x 8 | Bronze I | 93.5 kg |
| Man 50 kg, ohp | 20 x 10 | Bronze II | 56.5 kg |

Same percentile, different bodies (rule 5):

**bench**

| Percentile | Woman 50 kg | Woman 60 kg | Woman 75 kg | Woman 95 kg | Man 55 kg | Man 70 kg | Man 85 kg | Man 100 kg | Man 130 kg |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20th | Bronze II (20 x 10) | Bronze II (21 x 10) | Bronze II (21 x 10) | Bronze II (22 x 10) | Bronze II (27 x 10) | Bronze II (30 x 10) | Bronze II (34 x 10) | Bronze II (37 x 10) | Bronze II (43 x 10) |
| 50th | Silver III (26 x 10) | Silver III (27 x 10) | Silver III (28 x 10) | Silver III (29 x 10) | Silver III (39 x 10) | Silver III (45 x 10) | Silver III (50 x 10) | Silver III (55 x 10) | Silver III (65 x 10) |
| 75th | Gold III (32 x 10) | Gold III (33 x 10) | Gold III (34 x 10) | Gold III (36 x 10) | Gold III (48 x 10) | Gold III (57 x 10) | Gold III (64 x 10) | Gold III (72 x 10) | Gold III (85 x 10) |
| 90th | Platinum III (38 x 10) | Platinum III (40 x 10) | Platinum III (41 x 10) | Platinum III (43 x 10) | Platinum III (57 x 10) | Platinum III (68 x 10) | Platinum III (78 x 10) | Platinum III (87 x 10) | Platinum III (105 x 10) |
| 98th | Platinum II (45 x 10) | Platinum II (49 x 10) | Platinum II (55 x 10) | Platinum II (62 x 10) | Platinum II (72 x 10) | Platinum II (86 x 10) | Platinum II (99 x 10) | Platinum II (112 x 10) | Platinum II (135 x 10) |

**squat**

| Percentile | Woman 50 kg | Woman 60 kg | Woman 75 kg | Woman 95 kg | Man 55 kg | Man 70 kg | Man 85 kg | Man 100 kg | Man 130 kg |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20th | Bronze II (23 x 10) | Bronze II (24 x 10) | Bronze II (25 x 10) | Bronze II (26 x 10) | Bronze II (32 x 10) | Bronze II (34 x 10) | Bronze II (37 x 10) | Bronze II (39 x 10) | Bronze II (42 x 10) |
| 50th | Silver III (36 x 10) | Silver III (37 x 10) | Silver III (38 x 10) | Silver III (40 x 10) | Silver III (51 x 10) | Silver III (55 x 10) | Silver III (60 x 10) | Silver III (65 x 10) | Silver III (71 x 10) |
| 75th | Gold III (47 x 10) | Gold III (48 x 10) | Gold III (50 x 10) | Gold III (52 x 10) | Gold III (67 x 10) | Gold III (73 x 10) | Gold III (81 x 10) | Gold III (89 x 10) | Gold III (97 x 10) |
| 90th | Platinum III (58 x 10) | Platinum III (60 x 10) | Platinum III (62 x 10) | Platinum III (65 x 10) | Platinum III (81 x 10) | Platinum III (89 x 10) | Platinum III (100 x 10) | Platinum III (110 x 10) | Platinum III (122 x 10) |
| 98th | Platinum II (69 x 10) | Platinum II (77 x 10) | Platinum II (87 x 10) | Platinum II (100 x 10) | Platinum II (101 x 10) | Platinum II (113 x 10) | Platinum II (129 x 10) | Platinum II (145 x 10) | Platinum II (164 x 10) |

**deadlift**

| Percentile | Woman 50 kg | Woman 60 kg | Woman 75 kg | Woman 95 kg | Man 55 kg | Man 70 kg | Man 85 kg | Man 100 kg | Man 130 kg |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20th | Bronze II (26 x 10) | Bronze II (26 x 10) | Bronze II (26 x 10) | Bronze II (26 x 10) | Bronze II (32 x 10) | Bronze II (34 x 10) | Bronze II (37 x 10) | Bronze II (39 x 10) | Bronze II (42 x 10) |
| 50th | Silver III (37 x 10) | Silver III (38 x 10) | Silver III (39 x 10) | Silver III (40 x 10) | Silver III (54 x 10) | Silver III (57 x 10) | Silver III (62 x 10) | Silver III (67 x 10) | Silver III (72 x 10) |
| 75th | Gold III (49 x 10) | Gold III (51 x 10) | Gold III (55 x 10) | Gold III (58 x 10) | Gold III (75 x 10) | Gold III (81 x 10) | Gold III (89 x 10) | Gold III (96 x 10) | Gold III (104 x 10) |
| 90th | Platinum III (59 x 10) | Platinum III (64 x 10) | Platinum III (70 x 10) | Platinum III (78 x 10) | Platinum III (94 x 10) | Platinum III (101 x 10) | Platinum III (111 x 10) | Platinum III (121 x 10) | Platinum III (132 x 10) |
| 98th | Platinum II (79 x 10) | Platinum II (86 x 10) | Platinum II (95 x 10) | Platinum II (106 x 10) | Platinum II (123 x 10) | Platinum II (134 x 10) | Platinum II (149 x 10) | Platinum II (163 x 10) | Platinum II (180 x 10) |

## 9. The brief's test cases

| Body weight | Set | Load percentile | Volume percentile | Score | Rank from this one set |
|---|---:|---:|---:|---:|---:|
| 50 kg man | 120 kg x 1 | 100.0 | 0.8 | 50.4 | Silver III |
| 75 kg man | 100 kg x 1 | 98.3 | 0.1 | 49.2 | Silver III |
| 100 kg man | 100 kg x 1 | 92.8 | 0.0 | 46.4 | Silver III |
| 150 kg man | 100 kg x 1 | 78.5 | 0.0 | 39.3 | Bronze I |
| 50 kg man | 120 kg x 8 | 100.0 | 99.9 | 100.0 | Gold I (Diamond I pending) |
| 75 kg man | 100 kg x 8 | 98.3 | 95.1 | 96.7 | Gold I (Platinum I pending) |
| 100 kg man | 100 kg x 8 | 92.8 | 84.5 | 88.7 | Gold I |
| 150 kg man | 100 kg x 8 | 78.5 | 66.2 | 72.3 | Gold III |

The 150 kg man is measured at 139 kg: the heaviest body-weight band the open data covers.

A single heavy rep scores high on max load and almost nothing on volume, so on its own it lands around Silver III. With eight reps the same weights rank where one would expect.

| Set | Volume (kg x reps) | Load percentile | Volume percentile | Alone it would be |
|---|---:|---:|---:|---:|
| 100 x 1 | 100 | 97.6 | 0.0 | Silver III |
| 90 x 3 | 270 | 94.9 | 10.7 | Silver III |
| 80 x 6 | 480 | 89.5 | 49.1 | Silver I |
| 70 x 10 | 700 | 79.4 | 85.9 | Gold II |

All four together: **Gold I**. The volume part comes from 70 x 10 (700), the max-load part from the 100 kg single. Score 91.7.

## 10. Confidence

Every benchmark carries a confidence level, returned with every rank:

| Level | Meaning | In version 1.0.0 |
|---|---|---|
| high | at least 3,000 lifters and 6 body-weight bands behind it | men's bench, squat, deadlift |
| medium | real data, but fewer lifters or bands | women's bench, squat, deadlift; men's overhead press |
| low | a variation factor from one small study | women's Smith squat |
| no rank | not enough evidence | everything else |

Inside every level the same caveat applies: percentiles 25 to 90 are data, the tails and the two bridge constants are estimates.

## 11. What comes back, and versions

`RankEngine.create(RANK_BENCH).evaluate(exerciseId, { sex, age }, workouts, today)` returns the level (0 to 14), tier, name, score, both percentiles, progress within the level, the kg still needed for the next level, `pending`, `checks`, `confidence` and `estimate`. The adapter `js/rank-v2.js` turns this into the exact shape `tierFor()` returns today, so the screens need no change when the switch is made.

Benchmarks are versioned (`version`, `calibrated` in the data file). A change of thresholds is a new version made on purpose by editing `rank-config.json` or the sources and running `node tools/rank/build-bench.js`; `node tools/check.js` fails if the files do not match.

## 12. Known weak points

1. The two bridge constants (section 2) are assumptions.
2. Everything above the 90th percentile is a continued curve. Platinum II and above are estimates in the strict sense.
3. Low-rep-only lifters are ranked low (section 4).
4. The reference population is gym-app users. If they are keener than the average gym-goer, the ranks are slightly hard; if casual users dominate, slightly easy.
5. Body weight in the source is in 10 kg bands and self-reported.
