GymStreak progress data study 2026: how lifters progress
https://www.gymstreak.com/research/how-lifters-progress

Licence: Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/
Cite as: GymStreak (2026). How lifters progress: GymStreak product data study.
Data: GymStreak app users, 723,068 back-to-back sessions (22,819 lifters) and 30,794 new
lifters (first workout Jan 2024-Jun 2026).

What this is
- Aggregate tables only. Every row describes a group of at least 100 different lifters;
  smaller groups were removed.
- Source: sets logged in the GymStreak app up to 29 September 2026 (workout-log backup of
  29 Sep 2026; queries run 30 Sep 2026). Self-selected app users, not a representative sample.
  Only people who logged at least one workout are included. Dates are UTC days.
- Breakdowns by sex, age or bodyweight are not published for this study.
  p1_e1rm_change_windows.csv therefore contains only the overall and experience rows; its
  `sex` column is always empty.
- Survivor bias: p1 (and, to a lesser degree, p2 and p3) only include lifters who were still
  logging a lift at each point, so they are likely better than the typical result for
  everyone who starts.

Common columns
- n_users: distinct lifters in the group. n_streaks / n_breaks / n_pairs / n_sessions: rows counted.
- Shares (p_*, ret_*, share_*, back_*, pr_rate, *_pct): 0-1 fractions (0.719 = 71.9%).
- An empty ex / exp / which / streak_len cell means "all" (the total row).
- exp: experience level chosen in the app (beginner / intermediate / advanced; answers that
  look like app defaults are "unknown").

Files
- r4_streak_hazard: weekly streak = consecutive Monday-Sunday weeks with >= 1 logged set, for
  lifters whose first logged week began 2024-01-01..2026-06-08. p_break_after_this_week = share
  of streaks that reached weeks_reached weeks and ended right after that week (only streaks
  whose following week is observable). which = first streak | later streaks.
- r5_comeback_after_break: breaks with >= 12 weeks of follow-up. back_after_1wk_gap = returned
  after exactly one missed week; back_within_Nwk = returned within N missed weeks;
  not_back_12wk = no return within 12 weeks. streak_len = length of the streak that broke.
- r2_week1_predictors: new lifters with a first logged set 2024-01-01..2026-06-09. Week 1 =
  days 0-6 after the first workout. ret_w4 = logged on days 28-55; ret_w12 = days 84-111;
  avg_active_weeks_of_13 = average number of the first 13 weeks with a logged set.
  first_session_duration uses app-timed workouts of 10 min to 4 h.
- p2_session_to_session: the 15 most-used weighted catalogue lifts. Top weight = heaviest
  working set (ticked, non-warm-up, weight 0-400 kg, reps 1-30) in a session, compared with the
  previous session of the same lift 1-21 days earlier. median_jump_* = median increase when the
  weight went up. same_w_* = among same-weight pairs. up_after_*_reps = reps at the previous
  session's top weight, among increases.
- p3_pr_rate_by_session_number: pr_rate = share of sessions whose best estimated 1RM (Epley,
  weight x (1 + reps/30), sets of 1-10 reps) beats every earlier session of that lift by > 0.1%.
  session_number = the session's number on that lift (02 = second time it was logged).
- p1_e1rm_change_windows: baseline = best estimated 1RM in the first 14 days on a lift;
  follow-up = best in days 49-70 (2 months), 168-196 (6 months) or 350-380 (12 months).
  *_pct = follow-up / baseline - 1. share_up_5pct = up 5% or more; share_down = below baseline.
