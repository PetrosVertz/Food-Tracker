# Food Track · Gym Buddy

Personal food + gym web app (PWA). Plain HTML/CSS/JS, no build step — GitHub Pages serves the files as they are.

## Files
| Path | What's in it |
|---|---|
| `index.html` | All screens and pop-up sheets (markup only) + the list of CSS/JS files to load |
| `css/base.css` | Base layout and components |
| `css/glass.css` | Frosted-glass look, launcher, tab bar |
| `css/motion.css` | Animations, in-app picker / yes-no sheet |
| `css/layout.css` | One page per tab, side tab strip, pull-to-switch, switches, macro sliders |
| `css/workout.css` | Full-screen workout mode, light bulb, library sections, hub recovery |
| `js/data/config.js` | Version, storage keys, defaults |
| `js/data/strings.js` | Every text in English + Greek |
| `js/data/foods.js` | Built-in foods, raw/cooked pairs, categories |
| `js/data/gym.js` | Exercises, muscles, equipment, workout types |
| `js/core.js` | Helpers: storage, numbers, dates, Gemini |
| `js/ui.js` | Navigation, tabs, launcher, sheets, setup, settings, backup, motion, haptics |
| `js/food.js` | Food Track: food list, food form, barcode, cooking, meals |
| `js/supplements.js` | Supplements |
| `js/today.js` | Today's food: log, targets, plan my day, quick add, weigh-in |
| `js/fridge.js` | Fridge + groceries |
| `js/progress.js` | Gym → Progress (0.6.0): body weight chart, compact weigh-in, strength by muscle (volume per working set) |
| `js/gym.js` | Gym Buddy: workouts, sessions, picker, recovery, progress, pets, form demos |
| `js/wire/01…11-*.js` | Start-up code in order: state, button wiring, first render (11 = 0.5.9: ⓘ bubbles, one-box Quick add, Plan my day in the Log food sheet) |
| `sw.js` | Offline cache (bump `CACHE` and list new files when adding any) |
| `compare.html` | 2D vs 3D body test page (not part of the app) |

All scripts share one global scope and load in the order listed in `index.html`: data → functions → wiring.
Data lives only in the browser (localStorage); use Settings → backup to move it.
