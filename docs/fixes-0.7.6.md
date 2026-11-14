# Fix lists — 0.7.6 (form photos)

One branch: **gym-0.7.6** (Sonnet). Follow CLAUDE.md. Run after 0.7.5 is merged (the exercise list must be final).
Today the Form page guesses photos from free-exercise-db by name (`demoMatches` in gym.js, `FEDB_URLS` in config.js), so some exercises show the wrong movement. Rule: **no picture is better than a wrong one.** Petros checks the result later with the review page (item 4).

## gym
1. **Hand-pick photos for the ~60 most used exercises** (all the big barbell, dumbbell, cable and machine lifts for every muscle group). Download free-exercise-db's exercises.json and images into a scratch folder (not the repo). For each exercise:
   - shortlist candidates by name, equipment and primary muscles, and read their instructions;
   - **open the candidate images and look at them** (Read tool) to confirm it's the same movement, equipment and body position;
   - save the choice in a new `FORM_PICK` table in `js/data/gym.js`: `exerciseId: 'fedbId'`, or `null` when nothing is right (then the Form page shows our own steps with no photo).
2. **Everything else:** only show a guessed photo when the match is strong (same equipment and the exercise name matches closely); otherwise no photo. The user's own pick (`ui.demoPick`) still wins on their device.
3. **"Wrong Photo?" link** on the Form page: hides the photo for that exercise on this device and remembers it (Store), so Petros can list them later. Strings EN + GR.
4. **Review page for Petros:** `docs/form-review.html`, a simple static page (no app code) that lists every `FORM_PICK` exercise: app name, the chosen photos loaded from the CDN, and a "Wrong" tick box. A "Copy List" button copies the ticked exercise ids, so Petros can paste them into a chat to fix. It must work on a phone at `https://petrosvertz.github.io/Food-Tracker/docs/form-review.html`. Generate it from the `FORM_PICK` table with a small script in `tools/` so it can be rebuilt.
5. Add to `tools/check.js`: every `FORM_PICK` key is a real exercise id.
6. Bump VERSION to 0.7.6 and CACHE to match.
In the pull request, list the exercises set to `null` (no good photo) so Petros knows which have none.
