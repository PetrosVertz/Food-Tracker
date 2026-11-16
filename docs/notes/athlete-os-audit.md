# Athlete OS — audit of every AI request (step 1, branch athlete-1)

Written from the code as it is on this branch (0.7.9.x). Names, not line numbers, because lines move. Plain words first; the table is for the next chats.

## The short version

- **One door.** Every AI request in the app goes through `gemini()` (which is `AI.ask`) in `js/platform/ai.js`. Nothing else talks to an AI. The only other network calls are food databases (USDA, Open Food Facts) and the exercise database, none of them AI.
- **One AI company.** Everything calls Google Gemini directly from the phone with the user's own key (`settings.geminiKey`). The key is sent as a request header, never in the web address, and is not saved anywhere except Settings.
- **20 places ask the AI** (plus Test Key), listed below. About half **need** a model (photos, web look-ups, free-text understanding). The rest have a ready fallback on the phone and could later be done by rules (recovery hours, recipe text, Quick Log splitting).
- **No cost or token tracking existed.** The only counter was "how many asks today" (`ui.ai`, a gentle toast past 100). It counts asks, not real requests, so it hid retries.
- **One ask can become many requests.** `AI.call` walks a list of up to 7 (strongest-first) or 10 models, one try each, 30 s (60 s for strongest-first or Google Search), until one answers. Worst case is minutes, and the user sees one "thinking" bubble. Nothing recorded how often that happens.

## Where requests are made

"Mode" = what the call asks of the provider: **text** (normal), **best** (strongest model first, 60 s, temperature 0), **search** (Google Search on, JSON cut out of the answer text), **photo** (sends one or more pictures). "Needs a model?" = could a rule on the phone do this job alone?

| # | Where (function / file) | What it does | Mode | Quiet* | Needs a model? | Fallback if no key or it fails |
|---|---|---|---|---|---|---|
| 1 | `logQSend` → `logQPrompt` (today.js) via Food Coach `ch.ask` | Quick Log: understand a message, split into foods with per-100 g values, or answer / suggest | text | yes | Yes (free text, any language). Repeat of the same message uses `logPhr`, no AI | `logQSplit` on the phone |
| 2 | `logQSuggest` → `planPrompt` (today.js), Food Coach | Fill My Macros / meal suggestions from what is left today | text | yes | Words yes, numbers could be rules | none |
| 3 | `logQWeb` (today.js, "Find these foods online") | Looks up branded foods per 100 g | search | no | Yes (web) | keeps the first guess |
| 4 | `saveQuick` (today.js) | Quick estimate of one dish | text | no | Yes | message |
| 5 | `planBtn` click (wire/03-fridge-today.js) | Fill My Food plan for the day | text | no | Words yes, numbers could be rules | message |
| 6 | `talk` (coach.js) | Plain chat for Food Coach / Gym Coach without its own handler | text | yes | Yes | message |
| 7 | `gymCoachSend` / `gcPrompt` (gym.js) | Gym Coach chat: suggest / improve workout, sets per week | text, photo | yes | Words yes, sets and weights should come from history rules | message |
| 8 | `gymLiveSend` / `gcLivePrompt` (gym.js) | Live workout coach, can read a photo of a machine | text, photo | yes | Photo yes, text partly | message |
| 9 | `aiRecovery` (gym.js) | Refines recovery hours and writes one sentence after a workout | text | yes | **No** — `estimateRecovery` already gives the hours; the AI only adjusts them | the formula (already used offline) |
| 10 | `nxBody` click, Next Exercise (wire/04-gym.js) | "Next Exercise": 3 picks from the library | text | no | Words yes, choice could be rules | message |
| 11 | `sgGo` (wire/05-nav-cook-gym.js) | Cook idea for one plate | text | no | Yes (creative) | message |
| 12 | `suggestBtn` (wire/02-food.js) | Write a recipe for a dish name | text | no | Yes | message |
| 13 | `foodsQuickRecipe` (food.js, "Turn this home recipe…") | Reads pasted recipe text | text | no | Mostly **no** — `parseRecipe` is the fallback | `parseRecipe` |
| 14 | `photoInput` label reader (wire/02-food.js) | Reads a nutrition label photo | photo | no | Yes (vision) | none |
| 15 | `itemPhoto` product photo (wire/02-food.js) | Identifies a product from packaging | photo | no | Yes (vision) | none |
| 16 | barcode check (shop.js, `shopFoodCheck`) | Is this barcode even food? | search | yes | Yes (web) | assumes food |
| 17 | `shopPhoto`, receipt reader (shop.js) | Reads receipt lines, long receipts in parts | best + photo | no | Yes (vision), strongest model on purpose | message |
| 18 | `shopPhoto`, online product details (shop.js) | Finds nutrition of bought products | text | no | Yes (web) | none |
| 19 | `checkFoods`, Check My Foods (shop.js) | Compares saved foods with the web | search | no | Yes (web) | none |
| 20 | `shopTable`, shopping-table photo (shop.js) | Matches products on a table to receipt lines | photo | no | Yes (vision) | none |
| 21 | `AI.testKey` (Settings › Test key) | Lists models to check the key; not a generation | — | — | — | — |

*Quiet = no robot bubble; the chat shows its own thinking dots.

Notes:
- `js/wire/11-v059.js` has its own copies of `aiCount`, `fillSettings`, recipe parsing and product-photo reading, but it is **not** loaded by `index.html` or `sw.js`. It is dead code. It is left untouched because it belongs to another topic; whoever owns the shell can delete it.
- `js/know.js` and `AI.knows()` make **no** network calls. They only write text into prompts (rows 1, 2, 5, 6, 7, 10, 11, 12).
- `js/receipt.js` is picture processing on the phone, not AI.
- Every call site shows `err.message` to the user, and checks `err.cancelled`. Those two behaviours are kept exactly.

## What was missing (the gaps this branch closes)

| Gap | Today | After athlete-1 |
|---|---|---|
| Provider hidden inside one 40-line function | request building, models, parsing, errors in `AI.call` | split: provider adapter (Gemini works, Anthropic is a labelled stub) behind one normalized request / response / error |
| Error types | free-text messages | each failure has a kind (bad key, busy, timeout, no network, unreadable answer, cancelled) and whether retrying makes sense |
| Retries | walk to the next model at once | same walk, plus a short back-off after "busy" and an off-by-default same-model retry for future agents |
| Tiers | `best` flag + `settings.model` | `default` and `advanced` tiers read from settings; the old flags map onto them |
| Cost / tokens | none | local telemetry: calls, tokens (only when Google reports them, else "unavailable"), time, retries, failures, unreadable answers |
| Visibility | none | Settings › AI › Usage |

## Which calls need a model (for the later branches)

- **Must stay AI:** rows 1, 3, 4, 6, 8 (photo), 11, 12, 14, 15, 16, 17, 18, 19, 20.
- **AI for words, rules for numbers (athlete-3 / 4 / 5):** rows 2, 5, 7, 10.
- **Could drop the AI entirely:** rows 9 and 13 (a fallback already exists and is deterministic).

## Not changed on purpose

- How any feature looks or behaves for the user (same messages, same order of models, same limits). Settings › AI gains one new section, Usage.
- The daily counter `ui.ai` and its "many asks" toast.
- Keys: still the user's own Gemini key on the phone; the Usage data holds no key and no message text.
