# Module map — where each feature lives

Source-verified 2026-11-22 (v0.7.10.7 + V3 hardening). **The code wins over this page**: if a path or symbol here is wrong, grep, fix the code task, then fix this row. `node tools/check.js` fails when a path or `name()` below stops existing.

All scripts are classic browser scripts sharing one global scope, loaded in the order of `index.html`:
config → platform (`store`, `backup`, `phone`, `ai-provider`, `ai-usage`, `ai`) → data (`strings`, foods, gym, anatomy, rank bench) → helpers (`core`, `draft`, `ui`, `coach`) → features → `know` → Athlete OS (`js/athlete/*`) → `wire/01…10` (state, listeners, first render). A file may only use, **at load time**, what earlier files define; inside functions anything global is fine. `js/wire/11-v059.js` is dead (not loaded) — do not edit it.

## Routing table

| Change topic | Owner (branch) | Entry files › symbols | Saved data (Store names) | Main consumers | Tests |
|---|---|---|---|---|---|
| Food list, food form, barcode, cooking | foods | `js/food.js` › `renderAll()`, `normFood()` (core.js); state in `js/wire/01-core.js` | foods, meals | Today, search, coaches | `check.js` strings/ids, boot |
| Food search (offline + online) | foods | `js/search.js` | — (reads foods) | food list, logging | boot |
| Today / diary / targets / weigh-in | log | `js/today.js` › `renderToday()`, `dayInfo()`; state in `js/wire/03-fridge-today.js` | dayLog, days, targets, plans, weights | Food Coach, Know, Progress | boot, `store-test.js` import |
| Food Coach (Quick Log chat) | log | `js/today.js` › `logQSend()`, `logQPrompt()`; meals in `js/meal.js` | dayLog (only after the user taps log; undo kept), logPhr, foodFix | — | `tools/meal-test.js` |
| Supplements | log | `js/supplements.js` | supps, suppLog | Today | boot |
| Fridge, groceries, shopping, receipts | shop | `js/fridge.js`, `js/shop.js`, `js/receipt.js` | fridge, groc | Today (stock), Food Coach | boot |
| Workout plan, templates, schedule | gym | `js/gym.js` › `renderGymPlan()`, `renderTpls()`; Gym/Rest pill: `dayStatus()` + `dayPillHtml()` in today.js (read-only over `days`, `sessions`, `gymPlan`; `dayInfo()` still drives targets) | gymPlan, tpls, days | Today pill, Gym Coach | boot |
| Live workout (sets, rest, finish) | gym | `js/gym.js` › `startSession()`, `tickSet()`, `renderSession()`; `js/wire/04-gym.js` › `checkAbandoned()`, `saveG()`; `js/wire/10-workout.js` | active, sessions, comeback | Progress, rank, recovery | boot |
| Exercise picker + exercise search | gym | `js/gym.js` › `openExPick()`, `drawExPick()`, `exTiles()`; `js/exsearch.js`; library `js/data/gym.js` | exCustom | live workout, builder | `check.js` library + `tools/exsearch-test.js` |
| Recovery (current, not RECOVERY+) | gym | `js/gym.js` › `headLoads()`, `estimateRecovery()`, `headFatigue()`, `renderRecovery()`; anatomy `js/data/gym-anatomy.js` | — (derived from sessions) | Today recovery card, Gym Coach | boot |
| Rank (live) | gym | `js/gym.js` › `tierFor()`; `js/rank-fx.js` | — (derived) | Social Hub, live workout | `check.js` rank, rank plates |
| Rank v2 (OFF, not live) | gym | `js/rank-engine.js`, `js/rank-v2.js`, `js/data/rank-bench.js` | — | nothing yet | `check.js` "rank v2 (not live)" |
| Progress page | gym | `js/progress.js` › `renderProgress()`; `bodyW()`, `e1rm()` in wire/04 | — (derived) | — | boot |
| Gym Coach | gym | `js/gym.js` › `gymCoachSend()`, `gymLiveSend()`, `gcContext()`, `gcPrompt()`; setup in wire/04 | — (suggestions applied only by the user) | — | — (manual) |
| Coach chat window (shared) | shell | `js/coach.js` › `Coach` | — | Food Coach, Gym Coach | boot |
| What the AI knows | shell | `js/know.js` › `Know` | aiKnow (device only) | coach prompts via `AI.knows` | — |
| Athlete OS (events, state, context, memory, supervisor) | shell | `js/athlete/events.js` › `AthleteEvents`; `js/athlete/state.js` › `AthleteState`; `js/athlete/context.js` › `AthleteContext`; `js/athlete/memory.js` › `AthleteMemory`; `js/athlete/supervisor.js` › `Supervisor`; hook `Store.onChange` | athleteMem (device only); reads everything else | every coach prompt via `AI.knows(topic, specialist)`, coach chat (`js/coach.js`), Fridge AI (`sgGo`, `suggestBtn`), Settings › AI › What You Told the Coaches (`drawAiMem()` in wire/08) | `tools/athlete-test.js` |
| Social Hub / profile / stats | gym | `js/profile.js` › `renderProfile()`, `profileData()` | profile | — | `check.js` stats |
| Share a workout (QR) | gym | `js/gym-share.js` | tpls | — | `check.js` workout QR |
| Storage, migrations, backup file | shell | `js/platform/store.js` › `Store` | all (see contracts.md) | everything | `tools/store-test.js` |
| Import a backup | shell | `js/platform/backup.js` › `Backup.plan`; wiring `js/wire/08-settings-boot.js` | all synced names | — | `tools/store-test.js` §7, browser import in `check.js --boot` |
| AI requests, models, time limits, usage | shell | `js/platform/ai-provider.js` › `AIProvider`; `js/platform/ai.js` › `AI`; `js/platform/ai-usage.js` | models, aiUsage (device only) | every AI feature | `check.js` AI provider |
| Phone features (camera, haptics, files) | shell | `js/platform/phone.js` › `Phone` | — | everything | boot |
| Navigation, sheets, themes, icons, drag | shell | `js/ui.js` › `route()`, `open()`, `close()`, `svgIcon()`, `applyTheme()` | ui, settings (device only) | everything | boot, `tools/overlap.js` |
| Offline cache / updates | shell | `sw.js` | — | — | `tools/sw-test.js` |
| Time display (12 / 24 h) | shell | `js/ui.js` › `fmtClock()`, `clock24()`, `syncClocks()`; setting page in `js/wire/08-settings-boot.js` › `drawTimeFmt()` | ui.timeFmt (device only; stored times stay "HH:MM") | planner, Gym/Rest pill, carb windows, workout alerts | boot |
| Texts (EN + GR) | each topic | `js/data/strings.js` (the last `Object.assign` that sets a key wins) | — | — | `check.js` strings |

## Planned owners (not built — do not create files for them until their prompt says so)
RECOVERY+, Gym/Food Coach v2, Athlete Rank v0.4 activation, health/watch/Strava adapters, cloud sync: see `docs/architecture/contracts.md` › Planned.

## Worked routes (dry runs, V3 §4F) — what to open for three typical future tasks

**1. Exercise Picker refinement (Upper | All Muscles | Lower, pill filters).** Open `js/gym.js` › `openExPick()`, `drawExPick()`, `exTiles()`; search stays `js/exsearch.js` › `ExSearch.query` (do not fork it); muscle/head/equipment data `js/data/gym.js` (`LIB_RAW`, `HEADS`, `EQ`); usage order from `sessions` (read only). Picker CSS: the picker block in `css/workout.css`. Contract: exercise ids and `exCustom` shape are frozen (saved in sessions, templates, QR codes). No anatomy map in the picker; do not import recovery code. Gates: `check.js` exercise library + `tools/exsearch-test.js` + boot; manual: phone screenshot of the picker in both themes and languages.

**2. Food Coach answer quality.** Open `js/today.js` › `logQPrompt()`, `logQSend()`, `logQReply()`; meals `js/meal.js`; facts via `AI.knows` (`js/know.js`); the request goes through `gemini()` (= `AI.ask`) → `AIProvider.run()` (deadline, retries, usage) — never `fetch` directly. Safety: the coach only proposes; diary writes happen in the card's log action with undo (`dayLog` + `saveLog()`), so a prompt/provider change cannot write food logs by itself. Gates: `tools/meal-test.js`, AI provider checks; manual: a few real chats.

**3. RECOVERY+ consumer.** Training facts: `sessions` (completed sets only: `s.done`), `active`; current derived recovery: `js/gym.js` › `headLoads()`, `estimateRecovery()`, `headFatigue()`. RECOVERY+ will replace these as the ONE recovery owner (see contracts.md › Planned) and expose a versioned read-only snapshot; Gym Coach (`gcContext()`) and rank must read that snapshot, never re-compute, and "unknown" must stay unknown (never "ready"). Gates: new pure tests next to the engine (like `tools/store-test.js`), boot, manual anatomy check.

Baseline before this map (measured in this session, 2026-11-22): finding the importer, Store callers and AI call path needed ~12 grep/read steps over 45 scripts; with this table each route above starts from 2–4 named files.
