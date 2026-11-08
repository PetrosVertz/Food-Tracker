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
| `js/platform/phone.js` | **Phone features**: haptics, vibration, camera, barcode reader, keep screen on, share/save files, clipboard |
| `js/platform/ai.js` | **AI service**: models, the Gemini call, daily counter, the ✨ bubble, Test key, photo shrinking |
| `js/data/strings.js` | Every text in English + Greek |
| `js/data/foods.js`, `js/data/foods-more.js`, `js/data/gym.js` | Built-in foods (700, incl. ~370 cooked foods and dishes added in 0.6.7) / exercises, muscles, equipment |
| `js/core.js` | Helpers: text, food records, fetch with timeout, Claude export |
| `js/ui.js` | Line icons (`ICON`, `svgIcon`, `BACK_SVG`), sliding pills (one knob per selector follows `.on`), themes (`THEMES`, `applyTheme`), navigation, tabs, sheets (open/close), setup, settings, backup, swipe-to-delete |
| `js/food.js` | Food Track: food list, food form, barcode, cooking, meals |
| `js/search.js` | **Search** (0.6.7): word order, plurals, typos, other names (`SYN_GROUPS`), ranking by your habits and time of day, Did you mean, online (USDA + Open Food Facts) with a quality check |
| `js/supplements.js` | Supplements (Take button with times) |
| `js/today.js` | Today's food: log, targets + padlocks, Fill My Food, Add Takeaway, weigh-in |
| `js/fridge.js` | Fridge + groceries |
| `js/gym.js` | Gym Buddy: workouts, sessions, L/R sets, picker, recovery, pets, form demos |
| `js/progress.js` | Gym → Progress |
| `js/wire/01…10-*.js` | Start-up wiring in order: state, button wiring, first render (by topic) |
| `sw.js` | Offline cache (bump `CACHE` and list new files when adding any) |

## Rules
- Save and load only through `Store.load(name)` / `Store.save(name, value)`. Names: foods, meals, supps, suppLog, fridge, groc, dayLog, days, targets, plans, weights, profile, exCustom, tpls, gymPlan, sessions, active, comeback, pet (synced) · settings, ui, models, account (this device only).
- Changing the shape of saved data: raise `SCHEMA` in store.js and add a migration (it also upgrades old backups in `upgradeBackup`).
- Phone APIs only through `Phone.*`; AI only through `gemini()` / `AI.*`.
- No wrappers: change the real function instead of re-assigning it later.

All scripts share one global scope and load in the order listed in `index.html`: config → platform → data → functions → wiring.
Data lives only in the browser (localStorage); use Settings → backup to move it.
