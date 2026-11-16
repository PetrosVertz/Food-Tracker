# Athlete OS — audit, decisions and build plan (for the Athlete OS chats)

Written while Petros slept, so every open question has a **chosen default** (marked **Pick**). Petros reviews them in the morning; change a pick and the plan follows. Read together with the two long specs Petros pasted (call them **Spec A: Master Intelligence System** and **Spec B: Provider-agnostic infrastructure**) and the older `docs/notes/ai-coach-brief.md` (research-first rules). Petros is not a programmer: explain results in plain words.

## 1. What the app has today (audited)

| Area | Where | What it does |
|---|---|---|
| The one AI call | `js/platform/ai.js` `AI.call` (also `const gemini = AI.ask`) | Talks to Google Gemini directly from the phone with the **user's own key** (`settings.geminiKey`). Picks a model chain (best, then fallbacks), 30 s / 60 s time limits, JSON answer mode, optional Google Search, optional photos. No token counting, no cost tracking. A daily use counter exists (`count()`). |
| "What AI knows" | `js/know.js`, `AI.knows(topic)` | A daily on-phone profile (eating, training, strength, weight) added quietly to Gym Coach, Food Coach, Fill My Macros, cook ideas, Next Exercise. Settings › AI shows it and has Reset. **This is the seed of the Brain.** |
| Diet rules | `AI.dietRules()` | Food preferences injected into prompts. |
| Chat shell | `js/coach.js` | One shared chat window for all coaches: `Coach.setup(id, { kind, title, first, send })`, `chat.ask`, `chat.say`, `chat.cards`, transcript. Robots: chef, gym, fridge clerk, tour. |
| Food Coach | `js/today.js` `logQPrompt`, `logQClean`, `logQSend`, `logQSuggest` | Intent log / suggest / answer, items per 100 g, saved-food matching, cards, one Add. |
| Gym Coach | `js/gym.js` (chat + suggested workouts), live workout header robot | Suggest/improve workout, Replace/Remove cards, Save/Start. |
| Kitchen / Fridge AI | `js/fridge.js`, `js/shop.js`, `js/receipt.js` | Receipt and photo reading, recipe ideas, fridge clerk chat. Check exactly what exists before building. |
| Recovery | `js/gym.js` (`groupReadiness`, `recMap`, `exSore`) | Per-muscle hours left from hard sets, failure sets, heavy lowering; deterministic. |
| Sets data | gym history | weight, reps, markers (warm-up/drop/failure), optional half reps, negatives, RIR. |
| Storage | `js/platform/store.js` (`Store`) | The only way to save data on the phone. |
| Server | none | Comes in 0.8 (small server holding one Haiku key). |

**Things in the specs that do not exist in the app (do not go looking):**
- `js/brain.js` and `BRAIN_RULES` do not exist. The Brain is new. `js/know.js` is the closest thing; evolve it, do not duplicate it.
- Spec B assumes "server-side credentials". Today the key lives on the phone (user's own key). Server-side comes in 0.8. Build the provider layer **on the phone now**, written so it can move behind the server later without touching agents.
- Spec A's Supervisor, Decision ledger, Experiments, Sleep and Pain events: none exist yet. Sleep has only a hook returning null.

## 2. Findings about the pasted Grok Food Coach code (compare with `js/today.js`)

Good, adopt:
- Calm, precise personality text; "very occasional dry humour".
- `total_kcal` per item plus a consistency check against per-100 g x grams (`logQClean`).
- Library hint: pass the user's matching saved foods (name, brand, kcal/100 g) to the model.
- Correction detection and a **single** retry with a "give a realistic version" nudge.
- Reply clean-up (strip "I updated your log").

**Problems, do not copy:**
1. **Hard-coded calorie override.** `HIGH_RISK` (pita, gyro, burger, pizza, wrap...) forces `total_kcal = 840` when below 580. Spec B says **never reintroduce arbitrary keyword calorie overrides**. Replace with: if an estimate looks implausible, do one retry; if still doubtful, show it as an estimate and let the user correct it. No fixed numbers.
2. The prompt bakes in gyro-specific ranges ("740-980 kcal"). Move this into a small, general "portion realism" note or the Brain's food-correction memory (learned from this user's own corrections), not into a keyword list.
3. `isCorrection` is declared twice and the retry can double the calls on every message that mentions "calories/kcal"; retry only when the model's answer is empty or implausible.
4. It uses `err.message` raw and a different cleaning path than the app's `logQSplit` fallback; keep the existing offline fallback and `logPhr` cache (same message = no AI call).
5. `typeof foods` / `foodName` use must follow the existing helpers; check names before pasting.

## 3. Picks for the questionnaire (Petros can change in the morning)

### Gym Coach profile (Grok's three questions)
1. When he offers a previous AI workout: **B**, offer it with small progression (+1 rep or the smallest weight step where the last session hit the top of the range at the target RIR), with a **"Same as Last Time"** chip next to Apply, so the user can say no without typing. Reason: matches the app's double-progression idea in the older brief and costs no extra AI call.
2. Number of exercises: **flexible by time**: about 4-5 for 45 min, 5-7 for 60 min, 6-8 for 90 min. Never more than the user's chosen session length allows; no junk volume.
3. Stricter about: (a) **never inventing numbers** (weights come from history, else ask or label "first time"); (b) **at most one suggestion per exercise per session**, learning from Not Now; (c) **pain or injury reports always win** over any plan; (d) recovery is smart not rigid: a muscle on Needs Rest can be trained lightly or indirectly, never heavy to failure; (e) quiet by default: no tips unless asked or the live "!" badge rules fire.

### Architecture picks
| # | Question | Pick |
|---|---|---|
| 1 | Where does the Brain live? | **On the phone** (via `Store`), built storage-agnostic so 0.8 can sync it to the server. Evolve `js/know.js`. |
| 2 | Provider layer location | Inside `js/platform/ai.js` (or `js/platform/ai-provider.js`), **adapter pattern**: `GeminiProvider` real and tested; `AnthropicProvider` documented stub marked **not implemented** (no pretending). Agents never call `fetchT`/Gemini directly. |
| 3 | Keys | Stay the user's own Gemini key on the phone until 0.8. Never in logs, never in exports. |
| 4 | Supervisor | **Deterministic router, no model call**: keyword/state rules for intent; mixed questions go to one primary agent with shared context. |
| 5 | Model calls per message | One. Events and state updates cause zero calls. |
| 6 | Memory visibility | Settings › AI › What AI Knows shows facts with source and confidence; user can edit or delete any one; Reset stays. |
| 7 | Event log | Keep last ~500 events plus rolled-up summaries; dedupe by event id. |
| 8 | Cross-provider fallback | **Off.** |
| 9 | Telemetry | Local only: counts, tokens when the provider reports them (else "unavailable", never 0), latency, retries, failures, validation result. Shown in Settings › AI › Usage. No message text stored. |
| 10 | Escalation to a stronger model | Only on repeated validation failure or contradictory data, never because an answer is short; if information is missing, ask the user. |
| 11 | Benchmark | Fixtures in `tools/` (extend `tools/check.js` or add `tools/bench.js`): deterministic rules must pass 100%; AI tasks scored against reference answers only when a key is supplied. Report each domain separately. |
| 12 | Language | Follow the app language (English and Greek), all user-visible text in `js/data/strings.js`. |
| 13 | Privacy | Synthetic test profiles for any benchmark; warn that free-tier terms differ from production. |
| 14 | Research | Reuse the research-first rule from `docs/notes/ai-coach-brief.md`: rules cite sources in `docs/notes/ai-coach-evidence.md` with confidence. |

### Questions that only Petros can answer (not blocking, defaults used meanwhile)
1. Fridge AI: is the Kitchen clerk chat "Fridge AI", or a new thing? (Default: it is the same; extend it.)
2. Do you want the live-workout "!" suggestion badge in the first Gym Coach branch, or later? (Default: with the Gym Coach branch.)
3. Should the Brain's memory ever be exported/shared with friends? (Default: never.)

## 4. Build plan: one branch per chat (each merged before the next), Opus

**Order changed (decided with Petros after athlete-1):** small coach upgrades first, the big Brain last. Branch names stay the same, so the order is **athlete-1, athlete-3, athlete-4, athlete-2, athlete-5, athlete-6**. Athlete-3 and athlete-4 use simple rules and do not wait for the Brain. The events they would send (FOOD_LOGGED, FOOD_CORRECTED, workout and set events, suggestion accepted / rejected) are added in athlete-2, once the Brain exists.

Rules for every branch: follow CLAUDE.md; plain HTML/CSS/JS, no build step; `Store` only; `AI.*` only; `Phone.*` only; no wrappers; do not change what already works; do not bump VERSION except the last branch. **No "Advanced Model" box in Settings** (Petros decided).

1. **athlete-1: audit and provider layer. DONE (pull request #84).** `docs/notes/athlete-os-audit.md`; `js/platform/ai-provider.js` (normalized request / answer / error, `GeminiProvider` working, `AnthropicProvider` a labelled stub, default / advanced tiers, bounded retries); `js/platform/ai-usage.js` (local telemetry); Settings › AI › Usage. Existing behaviour unchanged.
2. **athlete-3: Food Coach upgrade (do next).** Section 2 above: personality, library hint, `total_kcal` check, correction retry, no keyword overrides, correction memory (per user, on the phone through `Store`). Keep cards, Add, Greek/English, per-100 g data. Needs the pasted Grok Food Coach code in the chat. Pass `opts.task` on the AI calls it touches so Usage can split by job.
3. **athlete-4: Gym Coach upgrade.** Section 3 picks: workout offering (previous AI workout with progression), progression rules, recovery-aware smart selection, weak-point focus only when a workout is requested, live "!" badge with Apply / Not Now, at most one suggestion per exercise per session. Research first; rules recorded with sources in `docs/notes/ai-coach-evidence.md`.
4. **athlete-2: Brain store, events, context builder, decision ledger.** Evolve `know.js` into the athlete model with provenance (value, source, confidence, timestamp, count); the 20 event types in Spec A (idempotent, no model calls); the Context Builder; memory edit / delete screen; **the decision ledger** (recommendation, reason, accepted or rejected, outcome) so Not Now and failed suggestions are learned from; wire the food and gym events from steps 2 and 3. Fixtures of fake histories in `tools/`. Experiments (Spec A 5.3) stay out until the ledger works.
5. **athlete-5: Supervisor and Fridge AI.** Deterministic router, mixed-intent handling (one main coach, shared context, one AI call), intervention priority levels 0-4, conflict order from Spec A 7.4, Fridge AI using ingredients + remaining macros + training context, meal accepted / rejected events.
6. **athlete-6: quality.** Benchmark suites per domain, routing / memory / event tests, cost report, review against the Spec B success list, switch-provider instructions in `docs/notes/athlete-os-switching.md`, VERSION and CACHE bump.

Each branch's pull request must list what was done, what was skipped, what Petros must decide, and test results (nothing claimed that was not tested).

## 5. Specs received (what is and is not in the repo)

- **Spec A (Master Intelligence System):** received parts 1-7.4 (cut off mid-sentence at "The user's explicit decision remains"). Matches this plan; the decision ledger and experiments were missing from the first plan, so the ledger is now in athlete-2.
- **Spec B (Provider-agnostic infrastructure):** never received. Athlete-1 followed the summary in section 3. If it turns up, compare it with `js/platform/ai-provider.js` before athlete-6.
- **Grok Food Coach code:** not received yet; paste it into the athlete-3 chat.
