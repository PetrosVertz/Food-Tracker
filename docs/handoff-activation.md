# Finish and activate Food-Tracker — handoff (branch `claude/dazzling-pasteur-lte6w2`)

Started from `1343b39` (v0.7.10.7 + RECOVERY+ merge), rebased on `main` `caadde3` (Exercise Picker V27). VERSION / CACHE not changed (the last
branch of a round bumps them). Nothing deployed.

**Spec inputs not available to this branch** (ChatGPT library links): Food-Tracker activation audit, Athlete Rank v0.4 final, RECOVERY+
Goal-Aware Final, RECOVERY+ anatomy handoff. The brief itself, the repository docs and the code were used instead; each finding was re-checked
on this checkout. Rank v0.4 details that differ from the approved document must be reconciled (see `docs/rank/RANK_V04_METHOD.md`).

## Review table

| Item | Status | Normal user path | Evidence | Remaining dependency |
|---|---|---|---|---|
| 1. Active Exercise card cap | Done | Gym › Start Workout › any exercise: card centred, stops above the Swipe tip + timer; older finished sets compact (tap to reopen); short screens pack tighter; phone on its side scrolls the card with New Set / End Exercise pinned | `tools/workout-card-e2e.js` (1/5/6/12 sets, 390×844, 375×667, 320×568, 844×390, keyboard, rest timer, reopen, End Exercise saves, resume, Greek, light, reduced motion) | Real iPhone / Android safe areas and keyboard |
| 2. Half Reps / Negatives compact | Done | Exercise Settings › Sets › Half Reps / Negatives on: small [title value] brackets under kg / reps; tap = wheel; Arrow keys ±1 | same tool, group 6 (EN dark 390, GR light 320; fields `hr` / `ng` unchanged) | Touch feel on a device |
| 3a. Pill title clipping | Done | Gym / Food Library pills: chosen title's slant + outline no longer cut | `tools/carousel-e2e.js`; before/after crops | — |
| 3b. Partner removed | Done | Gym pills: Library · Progress · Week · RECOVERY+; old `#gym-partner` links land on the Gym hub | `tools/carousel-e2e.js`; pet cleanup in store.js kept | — |
| 3c. Gestures / frame pacing | Done (measured at 60 Hz) | Pill swipe, page swipe, live workout swipe, bottom sheet | `tools/gesture-frames.js`: Chromium 157 headless, 60 Hz, 1× CPU: 0 dropped frames in all 6 gestures; 4× CPU: 1–5 long frames per gesture, now dominated by browser painting (large blurred glows) not app code. Fixes: section change redraws only its page; text-ticker scan once per frame, no-op class writes ignored; live workout stops re-adding a class per scroll event; chips mouse drag per frame + pointercancel | **120 Hz not verified** (needs a 120 Hz device); glow paint cost on real GPUs |
| 4. AI provider selection | Done | Settings › AI › AI Provider: Gemini / Claude / OpenAI / OpenRouter, each with its own key + models; Save makes it the one in use | `tools/ai-provider-e2e.js` (mock trace per provider, upgrade, fresh install, no / bad key, missing model, quota + cooldown, offline, cancel, web look-up on a provider without search, no key leaks) | First-run setup still asks for the free Gemini key (by design) |
| 5. Food Coach personality + one request | Done | Food Coach: "What should I eat for dinner?" (EN / GR / Greeklish) = 1 request; recognised dishes use the Coach Personality setting | `tools/food-coach-e2e.js` group 8; `tools/food-coach-test.js` | Answer quality with a real model |
| 6a. Athlete OS routing | Done | Food Coach ↔ Gym Coach: a clear other-domain question is answered by the other coach in the same chat (labelled); food / dish words, mixed messages and photos stay | `tools/athlete-e2e.js`, `tools/athlete-test.js` | — |
| 6b. Memory note editing | Done | Settings › AI › What You Told the Coaches › edit icon | `tools/athlete-e2e.js` | Notes are device-only (unchanged, D8) |
| 7. RECOVERY+ to coaches | Done (+ bug fix) | Recovery page, Gym Coach and Athlete OS read one snapshot (`snapshotId`, `validUntil`) | `tools/recovery-e2e.js`, `tools/recovery-test.js`; **fixed**: with any planned workout `RecoveryPlus.snapshot()` threw and coaches silently used the old estimate | Sleep source (D14), "finished logging" mark (D13) — unchanged |
| 8. Athlete Rank v0.4 | Done (provisional data) | Live everywhere `tierFor()` is used: exercise card, rank bubble, Profile, Rank Up, Know; machine / cable / Smith / band slot = muted plate + red X + "Ranking not available" | `tools/rank-v04-test.js` (brief scenarios, actual ranks), `tools/rank-e2e.js`, `docs/rank/RANK_V04_COVERAGE.md`, `docs/rank/RANK_V04_METHOD.md` | Approved v0.4 document to reconcile; 93 provisional rows need real data; community recalibration (opt-in dataset) and a screen to import a reviewed benchmark version not built; personal leaderboard unchanged |
| 9. Placeholders and dead code | Done | My Meals and Friends placeholders gone from navigation; saved meals stay under Recipes; personal leaderboard kept | `check.js` strings / ids / docs map | My Meals has no implementation; Friends needs accounts + sync (0.8+) |

## Actual rank results (`node tools/rank-v04-test.js`)
70 kg man, 9 strict pull-ups: **Silver II** (also after 8 sets of rows) · incline 60 × 8: **Gold I** · incline 80 × 5: woman 70 kg **Diamond I**,
man 70 kg **Platinum I**, man 100 kg **Gold I** · DB bench 30 kg/hand × 8 (80 kg man): **Gold I** · pull-up +20 kg × 5: **Gold II** · bench 60 × 8
once or twelve times: **Silver I** both · season: Gold I → raw Silver II shows **Gold III**, badge Gold I kept, a new lifter gets Silver II.

## Saved data / migration notes
- No schema change. New optional fields only: `settings.provider`, `settings.aiKeys`, `settings.aiModels` (device only, never in backups);
  `profile.rankSeason`, `profile.rankSeenV` (synced with the profile, so backups carry them; import rule for profile unchanged: yours win).
- Upgrade from v0.7.10.7: Gemini key / model work unchanged; ranks re-score once to v0.4 quietly (no Rank Up / Rank Changed replay).
- Removed: `js/rank-v2.js`, `js/wire/11-v059.js` (neither loaded), two never-opened food-form dialogs, 9 orphan strings.

## Tests run (final, after rebase on main)
`node tools/check.js --boot --strict`: all passed (includes Food Coach e2e and the browser import) · workout-card-e2e 47 ok · carousel-e2e 10 ·
ai-provider-e2e 37 · athlete-e2e 15 · rank-e2e 12 · recovery-e2e 23 · expick-test 37 · expick-e2e 64 · rank-v04-test 21 · athlete-test 91 ·
recovery-test 104 · food-coach-test 214 · gym-coach-test 80. One existing flake fixed: recovery-e2e depended on the time of day.

## Needs a real device / browser
120 Hz frame pacing; iPhone Safari PWA safe areas, keyboard and gestures on the capped card; service worker update on https; touch feel of
the new brackets; real AI answer quality per provider (no paid calls were made).
