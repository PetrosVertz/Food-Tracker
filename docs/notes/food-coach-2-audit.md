# Food Coach 2.0 — audit (2026-11-22)

Source read: `js/today.js` (Food Coach section `logQ*`), `js/meal.js`, `js/coach.js`, `js/platform/ai.js`, `js/platform/ai-provider.js`, `js/platform/ai-usage.js`, `js/know.js`, `js/platform/store.js`, `js/data/strings.js`.

## How it worked before this branch
One user message could start this chain, **one AI call after another**:
1. 3+ foods or a known dish → `mealSend`: up to **2 AI calls** (60 s deadline each) for one meal card.
2. If that failed → `logQSend`: 1 split call (60 s deadline, up to 10 models), plus **1 "retry" call** when any value looked odd.
3. Every food not in My Foods → **1 web-search call** (120 s deadline).
Worst case with Gemini down: about 5 minutes of waiting, 5 calls, then "Not found" rows.

## Confirmed defects
| # | Defect | Where | Effect |
|---|---|---|---|
| D1 | Sequential AI calls per message (meal ×2 → split → retry → web search) | `logQSend`, `mealSend`, `logQWeb` | slow (normal case 8–20 s), costly, long hangs |
| D2 | No overall time budget for a Food Coach message; each call has its own 60–120 s deadline and walks up to 10 models | `AIProvider.run` defaults | "stuck" thinking dots for minutes |
| D3 | Quota (429) is retried on every model, every message; nothing remembers the provider is out | `AIProvider.run` | each message waits the full chain again |
| D4 | After the split fails, the web lookup is still tried (and also fails, slowly) | `logQMatchAll` | doubles the wait when offline / out of quota |
| D5 | Technical errors shown in the chat: "The AI didn't answer (HTTP 429 …)", "Couldn't answer just now (All models busy: …)" | `logQAIFail`, `coachFail` with `err.message` | confusing text |
| D6 | Fallback split at every comma / "and" / "+": "with 20g protein" becomes a food; names with "and" break; spelled numbers ("one toast") lost | `logQSplit`, `MEAL_SPLIT` | lost or wrong items |
| D7 | Foods Food Coach found are saved with `via:'coach'` and **never read back** — a message you already confirmed still triggers the web lookup every time | `logQLocal`, `logQSaveFound` | the "previously confirmed" fast path does not exist |
| D8 | Missing protein / carbs / fat from the AI become **0** | `logQClean`, `logQWeb` | an estimate can look like a "0 g protein" fact |
| D9 | Add stays tappable while rows are "Not found"; unresolved rows are silently skipped | `logQLogAll` | user thinks everything was logged |
| D10 | "Add another toast", "make it 200g", "remove the bar" all need a full AI call and create a **new card** (the old one stays) | `logQIsFix` path | duplicate cards, wasted calls |
| D11 | Sending the same message again while its card is still open makes a second identical card | `logQSend` | duplicate cards |
| D12 | The user's example "250g chicken breast in tomato sauce, a white chocolate Snickers protein bar with 20g protein, and one protein toast" counts as "3+ foods" → one composed **meal** card; "20g protein" counted as an item | `mealDetect` routing | wrong structure |
| D13 | Chat is memory-only: closing the app loses the conversation and the open list | `coach.js` `CH` | no continuity |
| D14 | Prompt sends the last 8 messages × 280 chars every time plus long instructions; voice was "no chatting" | `logQPrompt` | tokens; robotic tone |
| D15 | A log message that also asks a question ("…after the gym. Was that a good meal?") only gets "Got it" | prompt rules | question ignored |

## Risks found (not defects today)
- API keys live on the phone (user's own Gemini key). Fine for a personal app; a paid product must move the key behind a server — the provider layer is built so only the provider changes.
- `logPhr` / `foodFix` are synced maps; new fields must stay optional so old backups still import (they do: only new keys/fields are added).
- Gym Coach shares `coach.js`; changes there are additive (an action can be disabled; friendly error text) and keep its behaviour.

## What already works and is kept
- `AIProvider` normalized request/response/errors, usage telemetry without message text, cancel by `AbortSignal`.
- The card UI (rows, units, cooking slider, swap search, Add / Add & Save, undo) and the robots.
- "Nothing is logged until Add" and undo; corrections memory (`foodFix`); built-in foods and portions; meal engine for known dishes.
- Athlete OS is **not built** (contracts.md › Planned). The existing read-only sources are used: `targetFor`, `dayTotals`, `dayStatus`, `AI.knows('food')`, `AI.dietRules()`.

## Changes (this branch)
See the pull request for the stage-by-stage list and measured results.
