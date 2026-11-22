# RECOVERY+ — how it works (engine `js/recovery-plus.js`, figure `js/recovery-anatomy.js`)

RECOVERY+ is the one owner of muscle recovery and, separately, of overall readiness. It is offline, uses no AI and no network, and never
changes a workout, plan, target or food log. Coaches (through Athlete OS) explain its result; they never recompute or overwrite it.

## Three separate things
1. **Local muscle recovery** (per head, 21 heads → 10 display groups): only from finished workouts (`sessions`). This alone sets the map colours and hours.
2. **Acute fatigue** inside the live workout (`active`): published as `activeSession.acuteFatigueByHead`; never written into recovery until the workout is finished.
3. **Overall readiness context**: the planned workout's muscles + optional sleep + food + goal. It can add a caution or one insight. It never changes 1.

## Local recovery model (product heuristics, configurable in `RecoveryCore.CFG`)
- Each counted set adds `exercise muscle % × effort` to each head. Counted = done, not a warm-up, the L half of an L/R pair (the pair counts once); a drop under a set counts 0.4.
- Effort: missing RIR = 1 (normal effort; never treated as failure) · RIR 0 / failure 1.3 · RIR 1 1.15 · RIR 2 1 · RIR 3 0.9 · RIR ≥ 4 0.8 · drop set ×1.15 · ≤ 5 reps ×1.08 · ≥ 20 reps ×0.85 · negatives ×1.1 · hinge / squat / lunge patterns ×1.15.
- Familiarity (repeated-bout effect): first time ×1.15, 1–2 times before ×1.07, then ×1. Relative intensity vs your best e1RM for that lift in 90 days: ≥ 92 % ×1.06, < 60 % ×0.85.
- Time to full recovery for a head = 48 h (big) / 36 h (small) + 7 h per effective set above 3, at most 96 h (the app's existing base). Fatigue = min(1, load / 6) fading linearly to 0 over that time; several workouts add up (capped at 1).
- Ready = estimated residual fatigue ≤ 20 % (existing rule). > 24 h left = Needs Rest, 1–24 h = Recovering (existing rule).
- Personal calibration: the same lift 24–120 h apart; holding ≥ 98 % while the model expected "recovering" = faster evidence; dropping < 93 % while expected "ready" = slower. Needs ≥ 3 such comparisons; ±4 % per net comparison, between ×0.85 and ×1.2, per group, last 90 days. One bad day never decides.
- Confidence: low (little history, an unmapped custom exercise in that workout, or no logs for 3 weeks) · moderate · high (most sets with RIR and a calibrated group). Shown in Advanced with a rounded range (±35 / 25 / 15 %).
- No workout history at all = **unknown** (graphite on the map, no tiles, no "all ready").
- Exercise decisions use the exercise's own heads with ≥ 25 % share (`exSore`, next-workout check): a fatigued biceps never warns a triceps pushdown.

## What was retired
- the old `sleepFactor` / `watchSleepHours` helpers (sleep multiplied muscle hours). Sleep is now context only.
- AI hours: `aiRecovery()` now only writes the short Workout Done note from the engine's hours; old `ses.recov` values stay in saved workouts but change nothing.
- `recFoodVerdict()` meal-time pro-rating (a partial day could look like under-eating). Replaced by `evaluateNutritionSupport()`.

## Sleep context (`evaluateSleepSupport`)
No sleep source exists in the app today, so the result is "unknown" and nothing is assumed. Ready for records `{ start, end, kind: 'asleep', source }` from Athlete OS / a future Health adapter (a global named `athleteSleepRecords`, not built yet): time in bed is ignored, overlapping / double-synced records are merged, naps (< 3 h) are not main sleep, stages are never read. 2+ short nights of the last 3–4 (short = under the personal median − 1.25 h, or 6 h without a baseline) = possible concern; one short night = low-confidence signal only.

## Food and goal context (`evaluateNutritionSupport`)
- Logged food is a **lower bound**. Nothing logged = unknown. Today is incomplete until marked finished.
- Calorie comparisons and protein **gaps** only use days marked finished (`days[d].foodDone`). The app has no such mark yet (decision below), so in practice these stay unknown and RECOVERY+ says so. Protein **adequacy** can be shown from logged amounts alone (lower bound).
- Goal (`targets.goal`: bulk / recomp / cut) shapes interpretation only. A cut below maintenance is expected; concern only far below the user's own cut target (< 75 %) on several finished days. Bulk below target on finished days = a goal-mismatch note. Recomp / maintain: no surplus / deficit assumption.
- `targets.goalAt` (new, additive): the day the goal last changed (set by Body and Goals Save and by setup). Food days before it are not judged against the new goal.
- Carbohydrate is only relevant after an observed big session (≥ 20 working sets or ≥ 75 min within 24 h) with another planned session (≥ 4 exercises) within 12 h.
- Opt-out: Advanced › Use Food Data / Use Sleep Data (`settings.recNoFood` / `recNoSleep`, device only): not read, not published.

## Page (route `gym-rec`, `renderRecovery()` in gym.js)
Next workout card (planner only; never invented) → the approved body (colours per head) → tiles only for Recovering / Needs Rest (same tiles with Advanced on) → at most one insight (a tip shown 3 days running steps aside for a day; `ui.recIns`) → Advanced: per-head sets, exercises, RIR / failure / drops, range, confidence, strength trend, and how the decision was made.

## Contract (`RecoveryPlus.snapshot()`) — see contracts.md › RECOVERY+

## Evidence notes (background, not individual predictions)
Saner 2020 (J Physiol, sleep restriction and protein synthesis) · Walsh 2021 (BJSM sleep consensus) · Choudhary 2026 (sleep manipulation review) ·
Pigeon 2025 (wearable sleep vs PSG) · Jäger 2017 (ISSN protein) · Morton 2018 (protein meta-regression) · Areta 2014 (energy deficit and MPS) ·
Mountjoy 2023 (IOC REDs) · Henselmans 2022 and Jukic 2022 (carbohydrate and resistance training) · Thomas 2016 (ACSM/AND/DC) · Kerksick 2017 (nutrient timing) ·
Murphy & Koehler 2022 (deficit and lean mass / strength) · Iraki 2019 (off-season) · Longland 2016 (higher protein in deficit) · ISSN 2017 diets · Barakat 2020 (recomposition).
None of these gives a per-person conversion from sleep, food or goal into muscle recovery hours, which is why RECOVERY+ never makes one.
