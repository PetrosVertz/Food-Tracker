# Fix lists — 0.7.10.4 (Half Reps and Negatives picker)

Follow CLAUDE.md. One branch, Sonnet. Run it **before** the Gym Coach branch of Athlete OS (athlete-4), because both change gym.js. Bumps VERSION to 0.7.10.4 and CACHE to match (only branch of this round).

## gym (Sonnet)
The extra boxes under each set are drawn by `extrasHtml()` in gym.js (`.setx`, `.sxn` in workout.css). Today Half Reps and Negatives are small typed boxes in a wrapping row with a label beside each, and the label shows in capital letters. Petros wants:

1. **Pick the number with an iPhone-style scroll wheel instead of typing.** Tapping the Half Reps or Negatives box opens the app's existing scroll-wheel picker (the count wheel that is already used elsewhere; grep for `.wheel` and reuse it, do not write a second one) with the numbers **0 to 30** in a column you scroll with the finger and that snaps to a number, like the iPhone's own picker; the current value is preselected, an empty box shows a grey 0; a **Done** button (and tapping outside) saves, and a **Clear** choice empties the box. No keyboard opens. The value is saved in the same place as now (`s.hr` for half reps, `s.ng` for negatives), so history, stats and saved workouts keep working. The box is a button that shows the number (or a grey 0), not a text field.
2. **Labels in normal case, above the boxes.** "Half Reps" and "Negatives" are written in Title Case as the strings are (no capital-letter transform; find and remove whatever makes them all caps), small and muted, **above** each box, not beside it.
3. **Alignment under the set row.** Lay the extras out on the same columns as the set row above (`.setrow` grid: set number, kg, reps, tick): the **Half Reps box is centred under the kg box**, and the **Negatives box is centred under the reps box**, each with its label above it, same width as the boxes above and same height as other small boxes. If only one of the two is switched on in Exercise Settings it still sits under its own column (half reps under kg, negatives under reps). L | R pairs and drop sets keep the same alignment.
4. **Reps in Reserve stays exactly as it is** (the 0 to 5 buttons), on its own row **below** the Half Reps and Negatives boxes, with its label as today.
5. Check with screenshots at 390 px wide, Dark and Light: all three switched on, each alone, with an L | R exercise and a drop set; the wheel opens, scrolls, snaps, saves and clears; Reduce Motion; the values show after reopening the workout and in saved workouts.
6. Bump VERSION to 0.7.10.4 and CACHE to match.
