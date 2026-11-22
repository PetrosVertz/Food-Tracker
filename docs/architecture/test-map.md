# Test map — what to run for what

| Command | Time* | Covers |
|---|---|---|
| `node tools/check.js` | ~7 s | syntax, offline file list, version/cache, strings EN+GR, ids, exercise library + search, QR, rank (live + v2 off), stats, rank plates, Food Coach meals, **store/import** (`tools/store-test.js`), **service worker** (`tools/sw-test.js`), **AI provider + deadline** (fake clock), docs map paths |
| `node tools/check.js --boot` | ~15 s | the above + app starts with no errors (dark + light, every tab) + **real import in the browser** (same file twice, odd text, half-failed write) |
| `node tools/check.js --boot --strict` | ~15 s | same, but a missing browser is a FAIL. **This is the release / CI gate** (`.github/workflows/check.yml`) |
| `node tools/store-test.js` | <1 s | Store + Backup only (fast loop while working on storage) |
| `node tools/sw-test.js` | <1 s | sw.js offline/update rules |
| `node tools/streak-test.js` | <1 s | weekly streak (targets locked at Monday, all-rest weeks, one per day, extras, early reset, warnings), Streak Savers (monthly, bonus challenge, expiry, month and year boundaries, max 2, never twice), saved record (restart, restore, history edits, old streak carried over), Stats pins (max 2, replace) + 24 h rotation |
| `node tools/exsearch-test.js` | <1 s | exercise search answers + speed |
| `node tools/expick-e2e.js` | ~40 s | Exercise Picker V27 + creator in the browser (also in `check.js --boot`): filters, order by real sets, global search, add/Undo, region drag, scroll fold, creator map/pill/long-press routes, no preselected equipment, Title Case, duplicates, QR, reload, 320 px Greek, reduced motion |
| `node tools/expick-test.js` | <1 s | Exercise Picker V27 custom exercises: stored Title Case (hyphens, Greek), records (no guessed equipment), duplicates, restore, GX1 exercise QR, own-exercise details inside GB1 workout codes, old GB1 still reads, RECOVERY+ counts custom sets on the chosen muscles (unknown stays unknown) |
| `node tools/meal-test.js` | <1 s | Food Coach meal maths |
| `node tools/recovery-test.js` | <1 s | RECOVERY+: no history = unknown, compound vs isolation (curls never warn triceps), accumulation, RIR / failure / drop / L-R / warm-ups, edits and deletes, custom exercises, plan changes, live fatigue kept apart, sleep and food gaps = unknown, Bulk / Recomp / Cut / goal switch, sleep / food / goal never change hours, snapshot contract, calibration bounds, no writes, anatomy coverage (21 heads × 4 views, no raster) |
| `node tools/recovery-e2e.js [--shots DIR]` | ~25 s | RECOVERY+ in the real app: tiles only for non-ready muscles (also with Advanced on), next-workout card, no history state, offline / no Athlete OS, Gym hub mini map, 320 / 375 / 390 px, EN + GR, no data changes; `--picker m\|f` screenshots the exercise picker map for a pixel compare with main |
| `node tools/athlete-test.js` | <1 s | Athlete OS: events from real saves, imports, state (missing stays missing, conflicts), context (cross-coach, budget, permissions, cache), memory rules EN + GR, injection, supervisor (one call, validation, escalation, failures), 2-year history |
| `node tools/gym-coach-test.js` | <1 s | Gym Coach intelligence on the real gym.js / gym-intel.js code: progression (new, weights+reps only, weeks of logs, RIR, stopped RIR, one weak day, two, break), evidence, Recovery+ missing/stale/conflicting, live fatigue and order, hints (rare, once), proposals (invalid exercises, numbers, approval only on Apply, undo), follow-ups, chat memory across a restart, offline answers, Greek, prompt size |
| `node tools/food-coach-test.js` | <1 s | Food Coach benchmark: ~200 cases (meal reading EN/GR/Greeklish, corrections, quick answers, value checks, context, memory, matching, built-in values vs USDA); prints extraction accuracy |
| `node tools/food-coach-e2e.js` | ~40 s | Food Coach in the browser with a fake Gemini: example meal, corrections, duplicates, Add once, memory, quota/cooldown, bad JSON, offline, slow provider, restart; prints p50/p95 per path (run by `--boot`) |
| `node tools/workout-card-e2e.js [--shots DIR]` | ~30 s | Active Exercise card cap in the real app: 1 / 5 / 6 / 12 sets at 390×844, 375×667, 320×568 and on its side; End Exercise and the timer each fully on screen and hit, never overlapping; the set being worked on in view; New Set; reopening a compact set; rest timer; keyboard up; End Exercise saves; resume after reload; Greek + long name, light, reduced motion |
| `node tools/ai-provider-e2e.js [--trace FILE]` | ~60 s | Settings › AI › AI Provider with all AI hosts mocked (no key, no network): each provider picked in Settings calls only its adapter (host, model, auth header name in the trace), switching restores each one's key + model, upgrade from Gemini-only, fresh install, missing / rejected key, unavailable model, quota + cooldown, offline, cancel, web look-up on a provider without search; no key in backups / Claude export / usage / console |
| `node tools/athlete-e2e.js` | ~20 s | Athlete OS in the browser with a fake Gemini: handoff Food → Gym and Gym → Food in the same chat (label, prompt, answer check, 1 request), mixed / food log / photo stay, memory read once, label after restart; Settings › AI note editing (save + context rebuild, cancel, empty, refused, deleted meanwhile, delete + Undo, export) |
| `node tools/carousel-e2e.js` | ~15 s | shared pill carousel: Gym has 4 pills and no Partner; old `#gym-partner` links / saved last page land on the Gym hub; the chosen title is not cut (EN + GR, larger text); keyboard Enter routes; Food Library pills route |
| `node tools/gesture-frames.js [--cpu 4] [--json FILE]` | ~25 s | measurement, not pass/fail: real touch drags (Gym pills, Gym page swipe, live workout page swipe, a bottom sheet) and the time between frames (median, p95, frames over 1.5× budget, long tasks). Headless Chromium is 60 Hz; 120 Hz needs a real device |
| `node tools/overlap.js`, `tools/topstrip.js`, `tools/form-review.js` | varies | layout / visual helpers (Playwright), run by hand for UI work |

*measured in the cloud container, 2026-11-22. Before V3: `check.js` ~37 s (real AI back-off waits), `--boot` ~43 s with one date-dependent failure.

## By change type
- **Storage, backup, import, schema**: `tools/store-test.js` first; add a case that fails before your fix. Then `--boot --strict`. For a new migration: test old data, rerun (idempotent), failed write (schema must not advance).
- **AI features**: AI provider checks (fake network + clock: no key needed). Never real sleeps in tests.
- **Athlete OS / coach context**: `tools/athlete-test.js` first (fake AI counts calls). A new event type, slice, part or specialist gets a case there. Coach personality (`Persona`: settings, size, shared rules) and records-kept (`usage`) are groups 9–10.
- **UI**: `--boot --strict`, plus screenshots at 390×844 in dark + light and EN + GR for the screens you touched; drags checked frame by frame (CLAUDE.md).
- **Offline / sw.js**: `tools/sw-test.js`. The real update-while-working-out path needs https and a phone: **manual**.

## Not covered automatically (manual or missing)
- Real phones (iPhone Safari PWA, Android Chrome): gestures, safe areas, camera, haptics, wake lock.
- Service worker in a real browser (the app registers it only on https).
- Two tabs open at once (no cross-tab protection exists yet; see decisions.md D5).
- Set completion double-tap: a set is a toggle on one stored object, so it cannot be saved twice, but a fast double tap un-ticks it (no automated test).
- Gym Coach / Food Coach answer quality with a real model (needs a real key); `tools/gym-coach-test.js` checks what goes into the prompt and what comes back out; `tools/food-coach-e2e.js` runs Food Coach against a fake Gemini. For a live check: open Food Coach with a key and use the brief's example messages; `FoodCoach.stats()` in the console shows answer times.

## Performance baseline (Chromium, 390×844, 9 runs, p50 / p95)
| Data | Start-up before | Start-up after | Save diary | Save sessions |
|---|---|---|---|---|
| empty | ~255 / ~270 ms | ~255 / ~270 ms | 0.2 ms | 0.0 ms |
| 2 years (690 diary days, 300 workouts, 1.2 MB) | ~510 / ~578 ms | ~375 / ~400 ms | ~7.5 ms | ~3.5 ms |
Method: temporary script (not in repo) seeding localStorage, `navigation.loadEventEnd`, `performance.now()` around `Store.save`. Re-run the same way after hot-path changes; numbers vary ±10% between runs.
