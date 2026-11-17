# Refinements — chats and prompts to paste

Patch name: **Refinements** (no version number). The change list is `docs/fixes-refinements.md`.

How to use: merge this plan's pull request first. Then, for each chat in order: start a new session with Food-Tracker selected, name the chat as shown, choose **Opus**, paste the prompt, and merge its pull request before starting the next chat.

Not built in this patch: change 6 (cancelled), change 8 (on hold, the exercise picker menu stays exactly as it is), My Meals inside change 7 (Coming Soon tile and pill only), point 4 of change 25 (personal portion memory, a later round).

## Merge order

| # | Chat | Changes | Model | Depends on | Check after merging |
|---|---|---|---|---|---|
| 1 | Refinements #1 | 1, 2, 20B | Opus | — | Swiping down never closes a window. Typed text comes back within 3 minutes. Daily Targets show open in Body and Goals. |
| 2 | Refinements #2 | 12, 11, hub rule of 7 | Opus | #1 | Buttons match the bottom bar bubble. The Gym Buddy pills rotate like the camera picker. Leaving a tab brings you back to the hub. |
| 3 | Refinements #3 | 13, 18 | Opus | #1, #2 | The bubble glides top right and opens big. Dragging it back snaps into the pill. No trash bin. Both coaches the same. |
| 4 | Refinements #4 | 7 (no My Meals), 22A (replaces 10), 9, 22B | Opus | #2, #3 | Food Library hub with My Meals dimmed. Recipes options with chef faces. Calories black or white. Kitchen off hides every fridge trace. |
| 5 | Refinements #5 | 24, 25 | Opus | #3, #4 | "pita gyro xoirino" gives one card around 650 to 700 kcal with its parts, a confidence line, and one Eaten entry. |
| 6 | Refinements #6 | 16 | Opus | #1 | "pec duck", "pullup" and Greek find the right exercise. The picker looks unchanged. |
| 7 | Refinements #7 | 3, 4, 5, 17 | Opus | #2 | Phone time wheel in the planner. Weight chart picks its own level. Strength rows with trend lines. Recovery tiles. |
| 8 | Refinements #8 | 19, 20A, 23, 14, 15 | Opus | #2, #6, #7 | Add Exercise under the list. Robot recovery line. Rank up screens before Workout Done. Gold, silver, bronze leaderboard. No body weight in the Social Hub. |

Shared pieces come first: the draft memory (#1), the frosted buttons, carousel and hub rule (#2), the coach pill and bubble (#3), the exercise search (#6).

Why Opus for every chat: each one either builds a shared piece that later chats reuse, touches saved data, AI or numbers you will trust, or needs smooth motion. A mistake in any of them is costly to undo after merging.

## Rules for every chat (already inside each prompt)

Follow CLAUDE.md. Do not bump VERSION or CACHE. Report how each thing works today before changing it. If a change conflicts with the code, stop and ask. Commit after each change. Run `node tools/check.js --boot` before every push (there is no `claude/` folder: this is also the "nothing declared twice" check). Open a pull request titled with the chat name, and in plain words list what shipped, what was skipped and why, what Petros must decide, and how to test it on the phone.

## Prompts

### Refinements #1
```
Chat name: Refinements #1
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build: change 1 (Remove Swipe Down To Close), change 2 (Windows Remember What You Typed For 3 Minutes) and change 20 Part B (Daily Targets Open Under Body And Goals). Nothing else.
Depends on: nothing.
Do not touch: swipe to delete, hold to reorder, hold to superset, the page pull between tabs, the robot bubble drag, the exercise picker menu, how targets are calculated (calcTargets).
Notes: build the draft memory as one shared module hooked into the shared open/close helpers in ui.js, saved through Store as device-only data, never in backups or sync. Chats #2 and #4 reuse it for the hub memory, so give it a small clear API and describe it in the pull request. For 20B, list every place that opens the Daily Targets sheet before removing anything.
Check: every "Check it" line of 1, 2 and 20B, in Playwright where possible.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #1" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```

### Refinements #2
```
Chat name: Refinements #2
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build: change 12 (One Frosted Button Style Everywhere); change 11 (Rotating Pill Carousel) as one shared component, used now on the Gym Buddy hub (Workouts, Progress, Week Planner, Partner, Recovery); and the "hub rule" paragraph of change 7, built once in the shared navigation and applied to Gym Buddy now.
Depends on: Refinements #1 (use its draft module and 3 minute timer for the hub memory, no second timer).
Do not touch: .mpill, .seg and the pill knob, tiles, the Food Library (chat #4 plugs it into the carousel and hub rule), the exercise picker menu.
Ask before adding real backdrop blur to buttons. List every button that still has the old style.
Check: every "Check it" line of 11 and 12, plus the hub rule checks of change 7 for Gym Buddy. Check carousel frames in Playwright: transform and opacity only, 60 frames.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #2" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```

### Refinements #3
```
Chat name: Refinements #3
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build: change 13 (Coach Bubble Glides To The Top Right And Opens Bigger) and change 18 (Coach Pills: Log Food Cleanup, Snap Back To Pill, Gym Coach The Same), as ONE shared coach component for Food Coach and Gym Coach (js/coach.js, the bubble in js/platform/ai.js). No second copy.
Depends on: Refinements #1 and #2 (frosted style for the ghost pill).
Do not touch: the Gym Coach robot in the live workout header (gymHeadRobot, #sesCoach): report how it works and ask. The AI prompts. The exercise picker.
All drags use the shared drag helper in ui.js.
Check: every "Check it" line of 13 and 18, with frame checks in Playwright, at 13 mini size, with the keyboard open.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #3" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```

### Refinements #4
```
Chat name: Refinements #4
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build:
- Change 7 (Food Library Becomes A Hub), following its LATEST DECISIONS: four tiles; My Meals is a dimmed, disabled Coming Soon tile and a disabled Coming Soon pill in the carousel. Do NOT build the My Meals screen, add flow, logging or the Combos migration; Combos keep working as today. Use the shared carousel and hub rule from Refinements #2.
- Change 22 Part A (Recipes Layout With Coach Faces). It REPLACES the pill of change 10; from change 10 only remove the duplicate top buttons and the Cook a Meal step. Tell Petros you followed 22A.
- Change 9 (Food Rows): build items 1, 4, 5, 5b and 6. Skip item 2 (5b overrides it). For item 3 and the All Foods fold, write a short proposal and ask; do not build.
- Change 22 Part B (When Kitchen Is Off, Hide Everything About It): one shared check used everywhere, including the new Food Library and Recipes screens. List every place changed. Do not change the AI prompts beyond leaving out their fridge part when Kitchen is off.
Depends on: Refinements #2 and #3.
Do not touch: Supplements content (change 6 is cancelled), how Recipes cook, saved data (nothing is deleted).
Check: every "Check it" line of 7 (except My Meals ones), 22A, 9 and 22B. Light, dark, Greek, 13 mini.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #4" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```

### Refinements #5
```
Chat name: Refinements #5
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build: change 24 (Food Coach: Complex Meals, One Card, App Does The Maths), following its LATEST DECISIONS, together with change 25 (Food Coach Hybrid Estimation Engine) as described under "What Refinements #5 builds from change 25": the one-call path for complex meals, with the code replacing the AI's weights from the Greek portion file where a dish is known; portion words (small, large, double meat...); cooking oil adjustments; saved user products always win; Greek, Greeklish and mixed-language input; the 4/4/9 calorie check; a quiet confidence line; one optional one-tap portion choice on the card, never a question before the result. No emoji. Greece only in js/data/portions.js, built so other countries can be added.
Not now: country/region in the profile, saved restaurants, the personal portion memory (point 4 of change 25).
Saving: the same as the Food Coach saves today (My Meals is not built).
Depends on: Refinements #3 (coach), #4 (neutral calories, Kitchen off).
Do not touch: the AI service itself (reuse AI.* / gemini()), My Meals, the Recipes options.
New files (for example js/meal.js, js/data/portions.js) go in index.html and the sw.js SHELL list; say so. Portion numbers come from the existing built-in foods and references in the project; mark anything uncertain, invent nothing. Put the meal test list under tools/: the gyro pita example, a five part meal giving one card and one Eaten entry, broken JSON falling back safely, "pita gyro xoirino", "2 tost kai gala", "makaronia me kima".
Check: every "Check it" line of 24. Works on the free Gemini key, no model-specific code.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #5" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```

### Refinements #6
```
Chat name: Refinements #6
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build: change 16 (Exercise Search: Smarter, One Continuous Ranked List), as one shared module (for example js/exsearch.js, listed in index.html and the sw.js SHELL list) reusing the ideas and helpers of js/search.js, used everywhere exercises are searched.
Depends on: Refinements #1 (the search draft switch).
Do NOT change the exercise picker menu in any way (change 8 is on hold): no moving, restyling or removing the pills, body map, grouping, sort or search box. Only the matching and the result list behind the box change.
Add the exercise test list under tools/ with every query listed in change 16 plus ten Greek ones, and run it from tools/check.js.
Check: every "Check it" line of 16, including search time under a few milliseconds and no flicker when typing fast.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #6" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```

### Refinements #7
```
Chat name: Refinements #7
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build: change 3 (Week Planner Native Time Picker), change 4 (Body Weight Chart Zooms Out Automatically), change 5 (Strength By Muscle Rows With A Trend Line) and change 17 (Recovery Tiles For Recovering Muscles Only).
Depends on: Refinements #2 (Recovery sits in the Gym Buddy carousel).
Do not touch: how weigh-ins, plans and recovery hours are saved or worked out; the exercise picker; the live workout screen; the Social Hub.
Use existing helpers (e1rm, loadOf, isMainSet, recMap) and the existing anatomy regions. No new artwork, no new colours.
Check: every "Check it" line of 3, 4, 5 and 17 with fake data. Female and male body, light, dark, Greek, 13 mini.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #7" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```

### Refinements #8
```
Chat name: Refinements #8
Follow CLAUDE.md first. Read docs/fixes-refinements.md fully (the notes at the top too).
Build: change 19 (Add Exercise Always Sits Under The Workout), change 20 Part A (Workout Summary Recovery Card), change 23 (Rank Up Screen Before Workout Done), change 14 (Social Hub Leaderboard) and change 15 (Social Hub Profile). Rank files: js/rank-engine.js, js/rank-v2.js, js/rank-fx.js, img/rank/; reuse their artwork and animation. Social Hub: js/profile.js.
Important for 14: I found no one rep max tick box on sets. Today a real 1RM is one entered under Profile, Add a 1RM, or a logged single rep. Report what exists and ask Petros before adding a tick box. If friends' data needs a server that does not exist, report what is missing and build against the data that exists.
Depends on: Refinements #2 (frosted buttons), #6 and #7.
Do not touch: the template editor (report and ask), the exercise picker menu, the recovery hours maths, the header robot in the live workout, weigh-in data, the rank maths.
The recovery AI call must not wait for the rank up screens. Save the rank ups and the recovery sentence with the session, so reopening never replays the screens or calls the AI again.
Check: every "Check it" line of 19, 20A, 23, 14 and 15, including network off. Light, dark, Greek, 13 mini.
Do not bump VERSION or CACHE. Report how things work today before changing them; if something conflicts with the code, stop and ask. Commit after each change, run node tools/check.js --boot before every push, open a pull request titled "Refinements #8" with a plain words report: what shipped, what was skipped and why, what Petros must decide, how to test it on the phone.
```
