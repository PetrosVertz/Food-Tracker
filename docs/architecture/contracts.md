# Contracts — the stable seams, and what is only planned

Implemented contracts first; the **Planned** section is compatibility notes only, not permission to build. One source per contract: if you change a seam, change its paragraph here in the same branch.

## Store (`js/platform/store.js`) — the only code that touches localStorage
- `Store.load(name, fallback)` → saved value, or `fallback` when absent **or unreadable**. Unreadable (corrupt JSON) is not treated as empty on disk: the bytes are copied to `ft.corrupt.<key>` first (if that copy fails, the key is locked against overwriting for this session) and reported by `Store.problems()`.
- `Store.save(name, value)` → `true` only when the browser stored it. `null`/`undefined` removes the key; `[]`/`{}` are stored as they are. Missing ids on synced `list`/`days` records are given here (the one place), on the caller's objects, so memory and disk agree. The sync table (`ft.sync.v1`: `upd`/`tomb`) changes **only after** a successful write.
- `Store.saveMany({ name: value, … })` → all or nothing. Writes a journal (`ft.journal.v1`) with the old bytes first; on a failed write the group is rolled back; if the app closes half way, the next start rolls back and reports `rolledBack`. If the journal itself does not fit, roll-back works from memory (only a crash during those milliseconds is then unguarded).
- `Store.problems()` → `[{ kind: 'corrupt' | 'migration' | 'rolledBack' | 'rollbackFailed' | 'tooNew', … }]`. Start-up shows one toast for new problems (`wire/08`).
- Migrations: `SCHEMA` + `MIGRATIONS[n]`. A migration must throw on any failed write (`mustWrite`), be safe to rerun, and copy before deleting. The schema number advances only after success. Data with a schema **above** ours is never migrated down.
- Backups: `Store.snapshot()` (export), `Store.upgradeBackup(d)` (older → current; newer left alone), `Store.backupTooNew(d)`.
- Exception (documented): `index.html` reads `ft.ui.v1` directly for the theme before scripts load.

### Persistence inventory
Sync = included in backups and future sync. "Main writers" is a starting point, not a full list: find every writer with `rg "Store.save\('<name>'|save<Name>\(\)|saveG\(" js`.

| Name | Key | Shape | Sync | Main writers | In backup | Import rule |
|---|---|---|---|---|---|---|
| foods | ft.foods.v1 | list | yes | food.js, shop.js, today.js (`saveFoods`) | foods | add; newer `updatedAt` replaces |
| meals | ft.meals.v1 | list | yes | food.js, meal.js | meals | same as foods |
| supps | ft.supps.v1 | list | yes | supplements.js | supps | same as foods |
| suppLog | ft.supplog.v1 | map day→{} | yes | supplements.js | suppLog | file's ticks added per day |
| fridge | ft.fridge.v1 | list | yes | fridge.js, shop.js | fridge | same as foods (name optional) |
| groc | ft.groc.v1 | list | yes | fridge.js, shop.js | groc | same as foods |
| dayLog | ft.log.v1 | days | yes | today.js, meal.js, wire/06 (`saveLog`) | dayLog | add missing entries |
| days | ft.days.v1 | map | yes | today.js | days | yours win |
| targets | ft.targets.v1 | one | yes | today.js, wire/08 | targets | only if you have none |
| plans | ft.plans.v1 | map | yes | today.js | plans | yours win |
| weights | ft.weights.v1 | map day→kg | yes | wire/06, wire/08 | weights | yours win |
| profile | ft.profile.v1 | one | yes | ui.js, profile.js | profile | yours win |
| exCustom | ft.gym.custom | list | yes | gym.js `saveG('custom')` | gym.custom | add missing |
| tpls | ft.gym.tpl | list | yes | gym.js `saveG('tpl')` | gym.tpl | add missing |
| gymPlan | ft.gym.plan | map | yes | gym.js `saveG('plan')` | gym.plan | only if yours is empty |
| sessions | ft.gym.sessions | list | yes | gym.js `saveG('ses')` | gym.sessions | add missing; no start time = skipped |
| active | ft.gym.active | one | yes | gym.js `saveG('act')` | gym.active (new) | only when no live workout here and not already finished; then the "left open" rule runs |
| comeback | ft.gym.comeback | one | yes | gym.js | gym.comeback | not imported (unchanged) |
| combos | ft.combos.v1 | list | yes | today.js | combos | add missing |
| logPhr | ft.logphr.v1 | map | yes | today.js | logPhr (new) | yours win |
| foodFix | ft.foodfix.v1 | map | yes | today.js | foodFix (new) | yours win |
| aiKnow, drafts, aiUsage, settings, ui, models, account | ft.aiknow.v1 … | one | no (device) | know.js, draft.js, ai-usage.js, ui; `settings.coach` = js/athlete/persona.js (`Persona.set`) | never (API key stays on the phone) | — |
| athleteMem | ft.athletemem.v1 | one | no (device) | js/athlete/memory.js (`AthleteMemory`) | never (Copy as Text in Settings › AI instead) | — |
| gymCoach | ft.gymcoach.v1 | one `{ v:1, chats, seen, said }` | no (device) | js/gym-intel.js (`GymIntel.chatSave`, `markSeen`, `said`) | never; cleared by Settings › AI › Reset | — |
| coachChat | ft.coachchat.v1 | one | no (device) | food-coach.js (`chatSave`, `track`), today.js (`logQPersist`) | never | — |
| (Store internal) | ft.schema, ft.sync.v1, ft.journal.v1, ft.corrupt.* | — | — | store.js | sync table yes; corrupt bytes as `recovery` | — |

Re-importing the same file adds nothing (by id; records without an id are matched by content). Bad records are skipped, not fatal.

## Import (`js/platform/backup.js`)
`Backup.plan(current, data)` is pure: copies in, `{ ok, reason, next, changed, added, updated, activeRestored, activeSkipped }` out. `wire/08` saves `changed` names with `Store.saveMany`, and only then assigns the live lists, redraws and shows "Imported". File limit 25 MB.

## AI (`js/platform/ai-provider.js`)
Request `{ prompt, images, json, search, tier, timeoutMs, deadlineMs, retries, task, maxModels, dedupeKey, maxTokens }` → `{ text, json, usage | null, model, provider, ms, tries }` or an Error with `.kind` (auth, rate, overloaded, timeout, network, bad_output, cancelled, unsupported, other). **One deadline per request** covers model listing, tries, retries and pauses: 60 s (default) / 120 s (advanced or search); each try gets at most the time left. Cancel (`outer` AbortSignal) stops the chain and records one usage entry. Usage (`AIProvider.onDone` → `AIUsage.record`) stores counts and tokens only, never text. AI answers never change saved data by themselves: features show a card and the user applies (with undo). Callers use `gemini()` / `AI.*`, never `fetch`.
- **Food Coach 2.0**: `maxModels` caps the model chain; a 429 cools that model for the provider's `retryDelay` (30 s default, 10 min max) and, when every model in the chain is cooling, `run()` fails at once with `.cooldown` (no network); `AIProvider.status(req)` answers "can a request go out now?" without a network call; the same `dedupeKey` in flight shares one call. Providers: `gemini` (default, the user's key), `openai`, `openrouter`, `anthropic` (adapters with the same normalized request/response/errors; picked by `settings.provider`, keys `settings.aiKeys[id]`, models `settings.aiModels[id]`, `settings.aiBase[id]` = the app's own server later, so a shipped app carries no key). No Settings screen offers them yet, and `run()` never switches provider by itself. `AI.friendly(err)` = the error in plain words for chats.
- **Food Coach answer budget** (`LOGQ_AI` in today.js): 12 s, 9 s per try, 3 models, then the offline answer. One blocking AI call per message; branded foods get one background web lookup that never blocks Add.

## Athlete OS (`js/athlete/*`) — shared athlete context; not a coach, not a second copy of logs
Load order after `know.js`: `events` → `memory` → `state` → `context` → `persona` → `supervisor`. No AI call anywhere in these files.
- **Events** (`AthleteEvents`): built from `Store.onChange(fn)` — `fn(name, { added, changed, removed } | null, 'save' | 'import')` after every successful write; a listener error never breaks a save. Event v1 `{ v, id, type, at, name, key, src, …ids/dates }`, never text. `id` = type|name|record key|change|record fingerprint, so a replayed change is ignored. An import = one `data.imported` per name. Types: `workout.completed|edited|deleted|live_changed|scheduled|rescheduled|templates_changed`, `nutrition.meal_logged|meal_edited|meal_deleted|meal_corrected|targets_changed|plan_changed`, `athlete.weight_updated|preference_updated|goal_updated`, `recovery.state_updated`, `kitchen.stock_changed`, `food.library_changed`, `memory.updated`, `patterns.rebuilt`. In memory only (last 200); durable history = Store's sync table.
- **State** (`AthleteState.get(slice)`): read-only slices `identity, body, goals, nutrition, schedule, training, recovery, corrections, kitchen, usage, patterns`, read through the owners' functions (`dayTotals`, `targetFor`, `dayInfo`, `recMapNow`, `hitsFrom`, `logFix`, `aiKnow`). Facts carry `kind`: measured / reported / calculated / inferred. Missing = null. Cached per slice; dropped by events, the date, or a ttl (recovery 10 min). Conflict rule: finished workout today (measured) > plan (reported) > guess from last week (inferred); a live workout wins over all.
- **Usage** (slice `usage`, personality V3 § feature usage): per record (food log, workouts, weigh-ins, fridge list) the days with records in the last 28, the last day, a level `frequent | occasional | rare | lapsed | never` and a reliability `verified | partial | stale | unknown`. It describes how complete the records are, never what the user did (a day without a log is unknown). The context part `usage` ("Records kept…") is sent to every specialist; Fridge AI gets only food log + fridge list.
- **Context** (`AthleteContext.build(spec, { text })`): parts `now, usage, notes, nutrition, goals, body, training, recovery, changes, ledger, patterns` in that priority; only the spec's `scopes` (permission filter) minus `skip` (what its prompt already has), plus `cross` when the message is about the other domain. Hard letter budget; header always kept. Result cached until an input changes.
- **Memory** (`AthleteMemory`): only from the user's typed chat message by fixed rules (EN + GR); AI answers never write memory. `profile` notes stay until deleted, `context` notes expire and are then removed; same `key` = newer replaces older; "fine now / eat it again" removes. Instruction-like text refused; notes go to prompts quoted, as facts. Ledger: `{ at, sp, act, i }` per coach card action. Settings › AI shows, deletes, copies; Reset What AI Knows clears it.
- **Persona** (`Persona`, js/athlete/persona.js): the ONE personality Food Coach, Gym Coach and Fridge AI share; their own prompts keep only expertise, task rules and JSON shapes. Prompts reach it through `AI.voice(id)` (block, cached per setting) and `AI.words(n)` (a reply word limit scaled by the Length setting: concise 0.6×, detailed 1.8×). Settings › AI › Coach Personality writes `settings.coach` `{ base: balanced|motivator|analytical, humor: low|natural|playful, len: concise|adaptive|detailed, custom ≤ 300 letters }` (device only, like the API key); unknown values read as defaults and are never rewritten on read. Custom text is quoted as tone-only wishes. No AI call; adds ~330 tokens to a coach prompt, ~210 to a Fridge AI prompt. Tools that are not conversations (Fill My Macros, meal plans, Next Exercise) do not get it.
- **Supervisor**: `register(id, spec)` (chef, gym, gymstart, gymlive, fridge, food, gymtool); `begin/end` around a coach message; `context(topic, id)` = what `AI.knows(topic, id)` returns; `ask(id, prompt, img, opts)` = ONE `gemini()` request + schema check; one stronger-tier retry only for specialists with `escalate` and only on an unusable answer; `strict` specialists throw `bad_output`. Coaches only propose; Apply / Undo stay in feature code. Per-task numbers in `AIUsage.byTask(n)`.

## Gym Coach intelligence (`js/gym-intel.js` › `GymIntel`) — deterministic, no AI call
- **Progression**: `GymIntel.progression(exId, reps)` → `{ act, w, r, lo, hi, last, first, est, cb, p, strength, why }` (`suggestFor()` in gym.js returns exactly this, so live hints and the coach agree). Double progression over completed working sets only; weight goes up only when the top of the range is reached on all sets, twice in a row, or with logged reps-in-reserve ≥ 2; one weak session → repeat the best recent weight; two → hold; a break is measured against the athlete's own rhythm (≥ 14 days and ≥ 3× their usual gap). A missing RIR is never read as 0.
- **Evidence** (`evidence()`): none / thin / some / solid from comparable sessions since the last break, consistency and trend. Sets how firmly the coach recommends; never shown as a number.
- **Proposals**: the live coach's `"change"` (weight, reps, sets, swap, add) → `GymIntel.proposal(raw, active)` (exercise must be in this workout or the library, numbers in range, unknown → dropped) → a card. Only the card's Apply runs `applyOp(op, active)`, which changes **not-yet-done sets only** and returns its undo; Apply re-checks `stillFits` first. Not Now / Apply / Undo are remembered (`said`) so a declined idea is not pushed again.
- **Quiet hints**: `nudge(active, seen)` after a ticked set; at most one at a time, each once per workout, at most two per workout; shown as a dot on the header robot, posted with `Coach.post()` when the chat opens.
- **Context**: `brief(mode, chatId, text)` builds a small packet by intent (workout, debrief, next, progress, volume, recovery, technique, chat) and named exercises; a follow-up ("why?") keeps the previous subject. The full exercise list is sent only for workout building (and then only the athlete's equipment).
- **Recovery door**: `recovery()` is the only place the coach reads recovery: a RECOVERY+ snapshot if `RecoveryPlus.snapshot()` exists and has `v: 1`, else the current estimate (`recMapNow`). It never computes recovery.
- **Memory**: `gymCoach` (device only): recent chat lines per coach window (live chat only for the same workout), hints shown, proposals + outcome. Restored cards have no buttons.

## Offline cache (`sw.js`)
Network first. Only files listed in `SHELL` are cached, and only good (200) answers, so an error page never replaces a working copy; other sites (AI, food databases) are never touched. Update policy: a new version takes over at once (`skipWaiting` + `clients.claim`) but an open page is never reloaded, so a live workout keeps running on the code it loaded. Saved data is in localStorage, not in the cache.

## Phone (`js/platform/phone.js`)
`Phone.*` (haptic, vibrate, camera, barcode, wake lock, share/download, clipboard). The native app swaps the inside; callers never test for native vs browser.

## Planned — compatibility only (DO NOT IMPLEMENT without their own prompt)
- **RECOVERY+**: will be the only owner of muscle/head recovery and, separately, overall readiness; reads `sessions`/`active` (completed sets only) and optional sleep/nutrition; publishes a versioned read-only snapshot; unknown stays unknown. Gym Coach already reads it through `GymIntel.recovery()` when a global `RecoveryPlus.snapshot()` returns `{ v: 1, at, groups: { <group>: { state: 'recovering' | 'ready' | 'unknown', hoursLeft, conf } }, readiness: { level: 'normal' | 'reduced' | 'low' | 'unknown', conf, why } }`; older than 6 h = told to the AI as possibly out of date; any other shape = the current estimate is used. Keeps 10 display groups / 21 head ids (`js/data/gym-anatomy.js`). Replaces, not duplicates, the current `headLoads()`/`estimateRecovery()`.
- **Athlete Rank v0.4**: `js/rank-v2.js` stays switched off until its task; reads factual sets and the RECOVERY+ snapshot, writes only its own rank evidence; no rank for machine/cable lifts.
- **Athlete OS**: built (see above). Still planned on top of it: Experiments, a Not Now button on coach cards, mixed-intent hand-off between coach windows, cloud sync of memory (it is device-only today).
- **Coaches / Fridge AI**: propose, never write without the user's Apply; no emojis; go through `AIProvider`.
- **Integrations (Health, watches, Strava, cloud)**: adapter → permission → validation → normalized facts → the owning domain's save. No direct writes to other keys. Sync can use `ft.sync.v1` (`upd`/`tomb` per record id).
