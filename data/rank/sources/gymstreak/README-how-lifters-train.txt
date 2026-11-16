GymStreak Training Data Study 2026: how lifters actually train
https://www.gymstreak.com/research/how-lifters-train

Licence: Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/
Cite as: GymStreak (2026). How lifters actually train: GymStreak Training Data Study.
Data: GymStreak app users, Dec 2019-Sep 2026, n=149,299 lifters.

What this is
- Aggregate tables only. Every row describes a group of at least 100 different lifters;
  smaller groups were removed. In splits by sex, age, bodyweight or country a group is also
  removed if one lifter contributes more than 20% of its sets (column max_user_share).
- Source: sets logged in the GymStreak app, December 2019 to 29 September 2026
  (workout-log backup 29 Sep 2026, profile export 30 Sep 2026). Self-selected app users,
  not a representative sample. Full methodology on the page above.

Common columns
- n_users: distinct lifters in the group. n_sets / n_sessions / n_user_weeks: rows counted.
- share / share_of_*: a 0-1 fraction (0.183 = 18.3%).
- p25 / median (p50) / p75 / p90: percentiles across the group (BigQuery approximate
  quantiles, within about 1 percentile point).
- max_user_share: the largest share of the group's sets from any one lifter.

Definitions
- Working set: a set ticked as done, not a warm-up. Rep statistics use reps 1-30.
- Active training week: an ISO week with at least 2 logged workouts. Each set counts once
  towards each primary muscle of its exercise (GymStreak catalogue).
- Workout length: workouts timed live in the app, 10 minutes to 4 hours (q4_duration_buckets
  also shows the shorter and longer ones for completeness).
- Workouts per week: lifters who logged workouts in at least 4 different weeks; average
  workouts per week in which they trained.
- b3w_top_weighted_exercises_by_group: loaded exercises only, ranked by lifters;
  share_of_group_users = n_users / grp_users (lifters in the group who logged a loaded exercise).
- b5_strength_standards: estimated 1RM, Epley weight x (1 + reps/30), best working set of
  1-10 reps with a bar weight of 20-400 kg in the 12 months up to the lifter's last workout.
  *_bw_mult = e1RM / midpoint of the lifter's 10 kg bodyweight band. split = sex |
  sex_x_bodyweight | sex_x_age. Low percentiles near 20 kg are held up by the bar-weight
  minimum (notably women's overhead press).
- Lifts: Barbell_Bench_Press, Barbell_Squats, Barbell_Deadlift,
  Standing_Barbell_Shoulder_Press. Country = account country (ISO 3166-1 alpha-2).
