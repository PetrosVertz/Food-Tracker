# Ranking Research (deliverable A)

Branch ranking-1, 16 November 2026. Brief: `docs/notes/ranking-brief.md`.

Ranks in this app are a game for motivation. They do not measure real-world lifting ability and are not meant for judging anyone. Everything below serves one goal: a rank that feels deserved to the person who earned it.

## Short version

- **Two open sources have numbers we are allowed to use**: GymStreak (ordinary gym-app users, free to reuse with credit) and OpenPowerlifting (competition results, public domain).
- Together they support **four barbell lifts**: bench press, back squat, deadlift (men and women) and overhead press (men only).
- **Nothing open was found for any other exercise**: no pull-ups, curls, dumbbell lifts, machines or cables. Those get no rank in the new engine.
- Strength Level, Symmetric Strength and Buffro were read for their method only. **No number from them is used.** Strength Level's licence page says plainly that even a free, personal or unreleased app needs a written licence.
- One thing found on the way that Petros must know: **the live app's current standards table says in the code that it comes from Strength Level** (see "The live app" below).

## 1. Section 0 of the brief, checked against the real app

Run in a headless browser against the real code (app version 0.7.10.4):

| Claim in the brief | Result |
|---|---|
| 341 exercises, 71 with a rank | Confirmed: 341 exercises (22 cardio), 21 in `TIER_STD` + 50 in `TIER_VARIANT` = 71 |
| 70 kg man, 1 set of 9 pull-ups: Bronze III | Confirmed |
| 3 sets (9, 8, 7): Silver II | Confirmed |
| 4 sets (9, 9, 8, 8): Silver II | Confirmed |
| Rank mixes 60% peak estimated 1RM + 25% top three sets + 15% session volume, divided by body weight^0.67 | Confirmed (`RANK`, `rankParts`, `rankScore` in `js/data/gym.js`) |
| `loadOf` gives body weight + added, or body weight − assistance | Confirmed (`js/wire/04-gym.js`); only `assisted_pullup` counts as assisted |
| Age is not stored | Confirmed: the profile holds only sex |
| Standards "taken from general knowledge" | **Not quite**: the comment above `TIER_STD` says "Source: Strength Level (strengthlevel.com) published standards … rounded to the nearest 0.05" |

So the pull-up complaint is real and comes from the design: one great set is only a third of the "top three sets" part and brings little session volume, so doing more sets raises the rank.

### The live app and Strength Level

The 21 standards in the live app are, by the code's own comment, Strength Level's published values rounded. Strength Level's licensing page (read 16 November 2026) says that copying a few values, rounding them, renaming the levels or using them "behind the scenes" all need a written licence, and that being free, personal or unreleased does not change this. This is not legal advice, but it is a reason to replace the live table rather than keep it, and it is listed under "decisions" in the final report.

## 2. Sources

### Usable for numbers

| Source | What it is | Licence | What we take from it |
|---|---|---|---|
| **GymStreak, "How lifters actually train" (2026)** https://www.gymstreak.com/research/how-lifters-train | 27.5 million logged sets from 149,299 users of a gym app, December 2019 to September 2026. Aggregate tables only, each row at least 100 people. | CC BY 4.0 (credit required) | `b5_strength_standards.csv`: 25th, 50th, 75th and 90th percentile of each lifter's best set (1 to 10 reps, last 12 months) for bench, squat, deadlift and overhead press, by sex, by 10 kg body-weight band and by age band. `q2_rep_percentiles.csv`: how many reps people do on those lifts. |
| **GymStreak, "How lifters progress" (2026)** https://www.gymstreak.com/research/how-lifters-progress | Change in best set over 2, 6 and 12 months for the 15 most-used lifts, by self-chosen experience level. | CC BY 4.0 | The time-to-rank check (how long a typical person needs). No split by sex or body weight. |
| **OpenPowerlifting bulk data** (revision 6b8787a8, 14 November 2026) https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html | 4,067,854 competition entries. We used raw (unequipped) lifts: 1,441,519 best lifts by lifter and age band. | Public domain; credit requested and given | Real one-rep lifts for squat, bench, deadlift: how strength changes with age (40 and over), how it scales with body weight among strong lifters, the heaviest lift ever made at each body weight (for the "Check this set" rule), and a reality check of the top ranks. |
| **Tsoukos & Bogdanis 2025**, J Funct Morphol Kinesiol 10(2):178, doi:10.3390/jfmk10020178 | 11 trained women tested for a true 1RM on Smith-machine and free-weight full squats. | CC BY 4.0 | One variation factor: Smith squat = 1.092 × free squat, women only, low confidence. |

Credit lines (shown on the simulator page and in `data/rank/README.md`):
- GymStreak (2026). How lifters actually train: GymStreak Training Data Study. CC BY 4.0.
- This page uses data from the OpenPowerlifting project, https://www.openpowerlifting.org. You may download a copy of the data at https://data.openpowerlifting.org.

### Read for method only (no numbers used)

| Source | Licence position | What was learned |
|---|---|---|
| **Strength Level** (about, standards and data-licensing pages) | Proprietary. Written licence needed for any reuse: standards, percentiles, models, exercise ratios, even a few rounded values, even in a free or personal app. Attribution is not enough. | Sets of 1 to 10 reps are turned into an estimated 1RM. Lift weight is modelled jointly against exact body weight, per exercise and sex. Five levels at fixed percentiles of its own users (5, 20, 50, 80, 95). Adult baseline 25 to 40, adjusted below and above. Bodyweight exercises have their own repetition standards for plain, weighted and assisted versions. 287 exercises. |
| **Symmetric Strength** (about, standards) | Proprietary model. | One formula for every lift: estimated 1RM, a Wilks-style body-weight adjustment, fixed ratios between lifts, age adjustment under 23 and over 40. It compares with strength athletes, not gym-goers, and says so. It refuses to show a percentile when fewer than 200 comparable people exist. |
| **Buffro** (strength-standards method page) | Proprietary; scraping and reuse not permitted. | Four calculation branches: external weight, bodyweight reps, weighted bodyweight, assisted bodyweight. Lift-specific body-weight exponents from a reference body weight. Age adjustments from 40. Leaves movements unranked when the logged number cannot support a rank. |
| **Clark, Latella, van den Hoek 2026**, BMC Sports Sci Med Rehabil, doi:10.1186/s13102-026-02195-6 | Crossref lists the licence as **CC BY-NC-ND 4.0** (no derivatives, non-commercial). Strength Level adds that the paper does not make its data open. | 74,892 Strength Level users, squat, bench and deadlift by age and sex, from estimated 1RM. The full text could not be opened (see "Blocked"). Not used for numbers, and its licence would not allow deriving thresholds from it anyway. |
| **Nuzzo et al. 2024**, Sports Med 54:303, doi:10.1007/s40279-023-01937-7 (CC BY 4.0) | Open, but the updated table is published as an image, so no values could be read reliably. | How many reps people manage at a given share of their max differs between exercises (more on leg press than bench press) and hardly differs by sex, age or training status. Supports keeping each exercise separate. |

### Checked and set aside

- **Zenodo 3253731** (3 to 7 rep maximum on 15 exercises, CC BY 4.0): downloaded and read. 28 people (21 men, 7 women), mostly machine exercises (bench press, biceps curl, calf raise, crunch, glute bridge, hip abductor and adductor, hyperextension, lat pulldown, lateral raise, leg curl, leg extension, row, side bend, triceps extension). Far too small for thresholds, and ratios between its exercises cross families and equipment, which the variation-factor rules do not allow. Not used.
- **van den Hoek et al. 2024** (powerlifting norms from 809,986 entries): the same OpenPowerlifting data we analysed directly; nothing extra to take.
- Web searches for open pull-up norms, open gym-log datasets and sourced lift-to-lift ratios found nothing usable: pull-up tables exist only for schoolboys or without a licence; the open gym datasets are motion-sensor data, not weights and reps.

### Blocked or unreadable

The workspace network was restricted at first; Petros approved a workspace setup that allows the research sites. After that:
- `data.openpowerlifting.org`: no answer; the same files were downloaded from `openpowerlifting.gitlab.io`. Nothing missing.
- The BMC paper's page (`link.springer.com`) and PubMed Central answered with a "prove you are not a robot" page. The BMC paper's full text was therefore not read; only its title, date and licence (from Crossref) and Strength Level's own description of it. If Petros wants it reviewed, download the PDF and attach it. It would still be method reading only.
- Kaggle, Hugging Face, OSF, Figshare were not on the allowed list and were not searched directly.

## 3. Data quality

**GymStreak** is the closest thing to the reference population the brief asks for: people who go to a gym and log that exact lift. Its limits, all stated by GymStreak itself:
- Self-selected app users, probably keener than the average gym member.
- Body weight is the latest profile value, in 10 kg bands, not the weight on the day.
- Its published figure is each lifter's best set of 1 to 10 reps turned into one number with the formula weight × (1 + reps ÷ 30). **It does not publish the heaviest weight or the best set volume**, the two things the brief wants to measure. Section 5 says how this is bridged and why that bridge is an estimate.
- Only the 25th, 50th, 75th and 90th percentiles are published. Everything below the 25th and **everything above the 90th (all of Platinum II and higher, and all of Diamond) is a continuation of the curve, not data**.
- Low percentiles sit near the empty 20 kg bar, most clearly for women's overhead press (25th percentile 26.5 kg, median 27.3 kg).

**OpenPowerlifting** is clean, huge and public, but it is competition lifters: their median is far above a gym-goer's. It is used for shape (age, body weight at the top end, records), never for where the middle ranks sit.

## 4. Coverage

| | Bench | Squat | Deadlift | Overhead press | Everything else |
|---|---|---|---|---|---|
| GymStreak men | 10,244 lifters, 9 body-weight bands (50 to 139 kg) | 4,773, 6 bands (60 to 119) | 3,554, 6 bands (60 to 119) | 2,702, 6 bands (60 to 119) | nothing |
| GymStreak women | 1,709, 5 bands (50 to 99) | 1,937, 5 bands | 1,610, 5 bands | 445 lifters, **1 band only: no rank** | nothing |
| GymStreak age bands | 18 to 54 (men), 18 to 44 (women) | same | same | 18 to 54 (men) | nothing |
| OpenPowerlifting men (18 to 34, raw) | 241,708 lifters | 185,672 | 208,092 | not a competition lift | nothing |
| OpenPowerlifting women | 92,807 | 80,807 | 88,373 | not a competition lift | nothing |
| OpenPowerlifting age | 14 to 79, both sexes | same | same | none | nothing |

What the open data says about body weight (the exponent: how fast the lift grows with body weight; 1 would mean "in proportion"):

| Lift | Gym-goers, men (median) | Gym-goers, women (median) | Competitors, men | Competitors, women |
|---|---:|---:|---:|---:|
| Bench | 0.60 | 0.17 | 0.73 | 0.51 |
| Squat | 0.48 | 0.17 | 0.71 | 0.57 |
| Deadlift | 0.44 | 0.11 | 0.56 | 0.45 |
| Overhead press | 0.39 | no data | no data | no data |

Two findings follow, and both back the brief's rule "no single body-weight exponent":
1. Every lift scales differently (deadlift least, bench most).
2. Among ordinary gym-goers, heavier people are only a little stronger, and among women hardly at all. Among competitors body weight matters much more. The exponent also rises with the percentile inside the gym data (men's bench: 0.55 at the 25th percentile, 0.70 at the 90th, 0.73 among competitors). The model therefore lets the exponent rise with the level.

Age, from OpenPowerlifting (median lift of the age band next to ages 24 to 34, body weight removed):

| Age | Men bench | Men squat | Men deadlift | Women bench | Women squat | Women deadlift |
|---|---:|---:|---:|---:|---:|---:|
| 40 to 44 | 1.00 | 0.93 | 0.94 | 0.97 | 0.92 | 0.95 |
| 50 to 54 | 0.93 | 0.85 | 0.87 | 0.91 | 0.82 | 0.88 |
| 60 to 64 | 0.84 | 0.76 | 0.80 | 0.80 | 0.71 | 0.81 |
| 70 to 79 | 0.71 | 0.60 | 0.68 | 0.67 | 0.56 | 0.70 |

GymStreak's own age bands agree for squat and deadlift (lower per kg of body weight from 35 on) and show almost no drop for bench and overhead press up to 54. Using the competition figures therefore errs on the kind side for older users, which suits a motivational feature.

## 5. What is missing, and what that forces

1. **The two measurements the brief wants are not published anywhere open.** No source gives the distribution of "heaviest weight logged" or "best single-set volume". The benchmarks are therefore built from GymStreak's best-set figure with two stated conversion constants (see `RANKING_ALGORITHM.md`, "The bridge"). This is the weakest link of the whole system and the first thing to replace when the app can collect its own anonymous data.
2. **No open data for 314 of the 319 non-cardio exercises.** That includes the pull-up, the exercise that started this work. The engine handles bodyweight, weighted and assisted sets correctly, but has no benchmark to compare them with.
3. **Variation factors**: one sourced factor was found (Smith squat, women). The 50 factors in the live app's `TIER_VARIANT` are unsourced guesses and are listed one by one in `docs/RANKING_EXERCISES.md`. Finding real ones means reading individual studies (front squat, incline bench, close-grip bench, trap-bar deadlift, sumo deadlift are the likeliest to exist); most abstracts do not state the ratio, so the full papers are needed.
4. **Machines and cables**: no open data, and no way to compare machines of different makers. The honest answer for now is no rank; later, per-user progress on the same machine or in-app data per machine model.
5. **Women's overhead press**: one body-weight band and the bottom half pinned at the empty bar. No rank until better data exists.
6. **Age is not stored in the app**, so the age adjustment exists in the engine but does nothing until a birth year is added to the profile.

## 6. Recommended sources

- Keep **GymStreak** as the reference population for the four barbell lifts and re-check when they publish an update (they publish dated studies).
- Keep **OpenPowerlifting** for age, records and the top-end reality check; it is updated weekly and `tools/rank/opl-summary.py` rebuilds our summary from a fresh download.
- For everything else there are three routes, and choosing is Petros's decision:
  1. **A Strength Level licence.** Their page: contact support@strengthlevel.com, subject "Data Licensing Enquiry", with company name, website, product, number of users, exercises and calculations needed, and annual budget. Their guide price for an annual licence of existing models is "roughly the equivalent of 1 to 3 months of a senior software engineer's time"; they prefer established businesses, give no public API and do not sell small one-off extracts. It would give standards, percentiles and age, sex and body-weight adjustments for up to 287 exercises.
  2. **The app's own anonymous data** (planned for 0.8, with consent): real distributions of heaviest weight and best set volume per exercise, and real variation factors (one person's best set on the variation next to the anchor). This also fixes the weakest link in point 1 above. It needs enough users per exercise (the other sites wait for 100 to 200 people per group).
  3. **Stay with four ranked lifts** plus sourced variation factors as they are found.
