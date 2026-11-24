# Food Track · Gym Buddy

Personal food + gym web app (PWA). Plain HTML/CSS/JS, no build step — GitHub Pages serves the files as they are.

## Files
| Path | What's in it |
|---|---|
| `index.html` | All screens and pop-up sheets (markup only) + the list of CSS/JS files to load |
| `css/theme.css` | **Design system** (loaded last): Inter, sizes 32/28/20/15/12, weights 700/500/400, radii, elevation, colour roles, light-mode values; the older colour names point here. Since 0.6.8.2 also every canvas piece: sliding main/secondary pills, bottom bar, back arrow, Today's Food, Form page, Swap sheet, Recovery, Settings › Theme, Log Food window |
| `css/*.css` | base, glass look, motion, page layout, workout mode (live workout screen = canvas design, end of workout.css) |
| `js/data/config.js` | Version, defaults, small shared state |
| `js/platform/store.js` | **Storage + data model.** The only code that touches localStorage. Device settings vs synced data, schema version + migrations, record ids, change times and tombstones for sync, backups, `Account` (who the user is) |
| `js/platform/backup.js` | **Import planner**: `Backup.plan()` merges a backup file into copies of your data (pure, no saving); Settings › Import saves the result with `Store.saveMany()` all or nothing |
| `js/platform/phone.js` | **Phone features**: haptics, vibration, camera, barcode reader, keep screen on, share/save files, clipboard |
| `js/platform/ai.js` | **AI service**: models, the Gemini call (`best`: strongest model first; `search`: Google Search), daily counter, the ✨ bubble, Test key, photo shrinking |
| `js/data/strings.js` | Every text in English + Greek |
| `js/data/foods.js`, `js/data/foods-more.js`, `js/data/gym.js` | Built-in foods (700, incl. ~370 cooked foods and dishes added in 0.6.7) / exercises, muscles, equipment |
| `js/core.js` | Helpers: text, food records, fetch with timeout, Claude export |
| `js/draft.js` | **Draft memory (Refinements)**: a window keeps what you typed for 3 minutes after it closes (`DRAFT_MS`); `Draft.put / get / clear` for other features (hub memory). Device only, never in backups |
| `js/ui.js` | Line icons (`ICON`, `svgIcon`, `BACK_SVG`), sliding pills (one knob per selector follows `.on`), themes (`THEMES`, `applyTheme`), navigation, tabs, sheets (open/close), setup, settings, backup, swipe-to-delete |
| `js/coach.js` | **Coach chat (0.7.4.3)**: the one chat window Food Coach and Gym Coach share (`Coach.setup` / `Coach.open`), its robot bubble, the coach pills beside the main button |
| `js/food.js` | Food Track: food list, food form, barcode, cooking, meals |
| `js/search.js` | **Search** (0.6.7): word order, plurals, typos, other names (`SYN_GROUPS`), ranking by your habits and time of day, Did you mean, online (USDA + Open Food Facts) with a quality check |
| `js/exsearch.js` | **Exercise search** (Refinements): the one search every exercise box uses (`ExSearch.query`): typos, words together or apart, other names (`ALSO`) and close neighbours (`EX_NEAR`, data/gym.js), Greek, Greeklish, similar exercises, your habits; one ranked list. Test list: `tools/exsearch-test.js` (run by `tools/check.js`) |
| `js/supplements.js` | Supplements (Take button with times) |
| `js/food-coach.js` | **Food Coach 2.0, the no-AI parts** (`FoodCoach`): reads a meal message, small corrections, quick answers, value checks, the short context the AI gets, the chat kept on this phone, answer times. Tests: `tools/food-coach-test.js`, `tools/food-coach-e2e.js` |
| `js/today.js` | Today's food: log, targets + padlocks, Fill My Food, Add Takeaway, weigh-in |
| `js/fridge.js` | Fridge + groceries |
| `js/shop.js` | **Shopping in (0.7)**: Groceries tick → fridge, remembered packs (`usualPack` / `usualCount`), continuous barcode scanning + the review list with the count wheel, receipts (best model reads the lines; matched against your foods → built-in → Open Food Facts → one web lookup), ✨ Check My Foods |
| `js/recovery-plus.js` | **RECOVERY+ engine**: muscle recovery per head (21 heads, 10 groups) from finished workouts, live-workout fatigue kept apart, sleep / food / goal context that never changes muscle hours, next-workout advice (never edits anything), the `RecoveryPlus.snapshot()` other features read. How it works: `docs/architecture/recovery-plus.md`. Tests: `tools/recovery-test.js`, `tools/recovery-e2e.js` |
| `js/recovery-anatomy.js`, `js/data/recovery-anatomy.js` | **RECOVERY+ body**: the approved male / female front + back figures as live SVG regions (each muscle colourable by its id); made by `tools/recovery-anatomy/`. Only RECOVERY+ uses it; the exercise picker keeps `js/data/gym-anatomy.js` |
| `js/gym.js` | Gym Buddy: workouts, sessions, L/R sets, picker, RECOVERY+ page, form demos |
| `js/gym-share.js` | **Share a Workout by QR (0.7.7)**: packs a saved workout into a short versioned code (`wkPack` / `wkUnpack`, layout `GB1~…`; old codes keep importing), draws its QR, scans one with the camera and saves it |
| `js/vendor/qrcode.js` | QR picture maker (qrcode-generator, MIT, unmodified; licence in `licenses/qrcode-generator`) |
| `js/progress.js` | Gym → Progress |
| `js/profile.js` | **Social Hub tab (0.7.7, was Profile)**: your circle + friends space, Share a Workout, streak, latest PR, leaderboards (best estimated 1RM per board lift), stats. `profileData()` is the one place the gym branches fill in (streak, tiers); `renderProfile()` draws the page. Settings opens from the gear on Profile |
| `js/know.js` | **What the AI knows (0.7.9)**: once a day, on the phone, a short profile from your own logs (eating, training, strength, weight trend) saved as `aiKnow`; `AI.knows(topic)` adds it to coach and suggestion prompts. Never shown on screen; Settings › AI › Reset What AI Knows clears it |
| `js/wire/01…10-*.js` | Start-up wiring in order: state, button wiring, first render (by topic) |
| `sw.js` | Offline cache (bump `CACHE` and list new files when adding any) |

## Rules
- Save and load only through `Store.load(name)` / `Store.save(name, value)`. Names: foods, meals, supps, suppLog, fridge, groc, dayLog, days, targets, plans, weights, profile, exCustom, tpls, gymPlan, sessions, active, comeback (synced) · settings, ui, models, account, aiKnow, aiUsage, drafts, coachChat (this device only).
- Changing the shape of saved data: raise `SCHEMA` in store.js and add a migration (it also upgrades old backups in `upgradeBackup`).
- The one exception to "Store only": the first lines of `index.html` read the saved theme straight from localStorage (`ft.ui.v1`) so the page is the right colour before anything loads, and set the iPhone status bar style from the theme's Status Bar choice (`ui.theme.bar`, 0.7.10.7). Nothing else may.
- Phone APIs only through `Phone.*`; AI only through `gemini()` / `AI.*`.
- No wrappers: change the real function instead of re-assigning it later.

Architecture map, contracts and test map: `docs/architecture/`. Health check: `node tools/check.js --boot --strict`.

All scripts share one global scope and load in the order listed in `index.html`: config → platform → data → functions → wiring.
Data lives only in the browser (localStorage); use Settings → backup to move it.

## Changelog

### 0.8.0 (24 Nov 2026)
- **Food Library home is a bento grid** (Foods, Meals | Supps, Recipes | Shopping List, My Fridge) that fills the screen between the header and the bottom bar; each tile is a live preview and opens its page. Foods has a rotating stat (never the same twice in a row) and a macro ring (tap a segment: a bubble with the count, 2 s, others dim). No floating buttons; a bigger scan button top right. Sections renamed: Foods, Meals, Recipes, Supps, Shopping List, My Fridge.
- **Gym Buddy home is a bento grid**: Workouts (most-trained muscles from your saved workouts, least-trained in amber), Progress (rotating stat + 8-week volume line), RECOVERY+ (body only, front and back slide every 5 s), Week Planner (day pills, Total Gym Sessions, Gym / Rest or workout names with long names (and a long Progress line) scrolling like a news ticker). Start Workout stays as the floating pill.
- Both homes: centred title with today's date, streak bubble top left; they scroll only when they don't fit (small phones, larger text).
- **Streak bubble** on My Food Log, Food Library and Gym Buddy; tap it for the streak history with a 6-week calendar of trained days.
- **My Food Log**: the top (gym-day line + hero card) stays put and only the Eaten list scrolls; slimmer hero; the gym-day card is one slim line (Gym Day with Start / Skip, or Rest Day; long press also skips). The old "Gym Today" label is gone.
- **Live workout**: the L | R pill is a plain on / off switch (no Left Only / Right Only chooser).
- **Add Exercise search**: no AutoFill Contact; the search bar stays above the keyboard, results slide up over the picker, one tap adds, long press selects several with Done top right, Done on the keyboard slides everything back.
- **Shopping List add box** ranks foods you bought before (with your usual pack and count), then foods you log, then your other foods, then the built-in list; a plain text item can be saved as a food after you tick it.
- **Food Coach**: decides chat or log first (no food card for small talk), one Greek + English filler-word list, Greek units (`γ`, `γρ.`, `γραμμάρια`, `κιλό`…) attached or not, Greek aliases (μακαρόνια → pasta, κιμάς → beef mince…), "yesterday / χθες" logs to yesterday, "takeaway / παρήγγειλα" = a restaurant portion. Regression test: `250γ κιμάς μοσχάρι και 250γ μακαρόνια` offline gives 250 g beef mince + 250 g pasta.
- **Look**: tab bars without a border (slightly lighter fill); a thinner outline on the selected pill.
- **Performance** (nothing looks different): the selector knob moves with transform only and is placed once per tap (resizes debounced); blur only on the bottom bar (paused while its marker slides) and one open sheet; the rest timer loop, Recovery slide and text ticker stop when hidden or off screen; home tiles are rewritten only when their content changed.
- Tests: `tools/bento-e2e.js` (new, run by `check.js --boot`), new cases in `tools/expick-e2e.js`, `tools/food-coach-e2e.js` and `tools/food-coach-test.js`.
