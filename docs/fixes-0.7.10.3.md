# Fix lists — 0.7.10.3 (Social Hub stats)

Follow CLAUDE.md. One branch, Sonnet. Run after the rank plates branch (0.7.10.2) is merged. Bumps VERSION to 0.7.10.3 and CACHE to match (only branch of this round).

## stats (Sonnet)
The Social Hub stats are the table `STATS` in profile.js (each row: id, calc, title and subtitle strings; 5 random per day, pins kept in `profile.statPins`). Petros chose these changes:

1. **Remove the 5 food stats** (`proteinRun`, `kcalDays`, `meals`, `topFood`, `foodDays`) and their strings (grep first). Old pins of removed stats are ignored without errors. Nobody cares about food on the Social Hub.
2. **Add these 12 training stats.** Each has a short title, a big number or name, and one friendly subtitle line, English and Greek, Title Case for titles; each stays hidden until it has data. Use the helpers already in `statsCtx()` (sessions, `exName`, `loadOf`, `tierFor`, `e1rm`, body weight from `latestWeight()` or targets).
   - **Heaviest Day** (`bestDay`): the most total kg moved in one workout, shown with a friendly comparison (25 kg bags, then cars about 1,500 kg, then elephants about 5,000 kg, then a blue whale about 150,000 kg) like the existing total-kg stat. Subtitle names the date.
   - **Mountain Climbed** (`mountain`): all your lifting turned into climbing. Work = sum over every finished normal set of reps x kg x 0.5 m of bar travel per rep x 9.81. Compare with climbing Everest (8,849 m) carrying your own body weight (use 75 kg if body weight is unknown): "Mountains Climbed: 2.4x Everest". Show one decimal.
   - **Lucky Weekday** (`luckyDay`): the weekday on which you set the most personal records (use each session's `prs`). Needs at least 3 records. Subtitle: how many.
   - **Midnight Iron** (`night`): workouts started after 9 pm (count), subtitle "after 9 pm". Hide at 0.
   - **Dawn Patrol** (`dawn`): workouts started before 7 am (count). Hide at 0.
   - **Couch Potato** (`couch`): your longest gap between two workouts in days, with the dates ("12 days, 3 Mar to 15 Mar"). Needs at least 2 workouts. (This was "Longest Rest Gap"; the name is Couch Potato.)
   - **Closest to Ranking Up** (`nextRank`): the exercise with the smallest kg still needed for its next rank (from `tierFor().next.kg`), shown as "+2.5 kg" with the exercise name and the next rank's plate icon (`rankIcon`, small). Hide at top rank everywhere.
   - **Strongest for Your Weight** (`ratio`): the highest best-estimated-1RM divided by body weight among exercises that have a rank standard, shown like "1.8x body weight" with the exercise. Hide without body weight.
   - **Rep King** (`repKing`): the most reps in a single finished normal set (no warm-ups), with the exercise; ignore sets over 100 reps.
   - **Big Three Total** (`big3`): best estimated 1RM of Bench + Squat + Deadlift added together, in kg, subtitle "x.x times your body weight" when known. Show only when all three have data.
   - **Exercise Explorer** (`explorer`): how many different exercises you have done, subtitle names the newest one you tried.
   - **Loyalty** (`loyal`): the exercise you have done in the most months in a row without skipping a calendar month, "Bench Press: 14 months in a row" (name as the big text, months as the subtitle). Needs at least 2 months.
3. **Keep the other training stats** that are already there (workouts, sets, total kg, best streak, best week, favourite exercise, favourite muscle, heaviest lift, best session volume, longest workout, earliest, latest, favourite training day, total workout time, records) unless two stats say nearly the same thing: **Heaviest Day replaces "Best Session Volume"** (remove that one), the rest stay. List the final stat list in the pull request so Petros can trim it.
4. **Unit tests in `tools/check.js`** with a small fake history: each new stat returns the expected value and each hides when it has no data; no stat throws when history is empty.
5. Check the Social Hub screenshots (Dark and Light, 390 px): five stats show, text never overflows (long exercise names wrap or shrink), pins still work, the shuffle button still works.
6. Bump VERSION to 0.7.10.3 and CACHE to match.
