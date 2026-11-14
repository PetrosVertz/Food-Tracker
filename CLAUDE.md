# Food Track · Gym Buddy — notes for Claude

Plain HTML/CSS/JS PWA, no build step. GitHub Pages serves `main` as is. See README.md for the file map and the app rules (Store only, Phone.* only, AI.* only, no wrappers).

The owner (Petros) is not a programmer: explain results in plain words, no code talk.

## Workflow
- One branch per session, named like `gym-0.7.4.0.5`. Never push to `main`.
- Work list: `docs/fixes-<round>.md` — do only your branch's section. Background: `docs/audit-<round>.md`.
- Line numbers in those lists are hints and may have shifted; find things by name with grep.
- Grep before deleting anything (strings, CSS classes, functions, ids).
- Before pushing: `node tools/check.js --boot` must pass. Fix anything it reports that your branch caused.
- Before pushing, also `git fetch origin main` and rebase on it if main moved; keep both sides' intent when resolving conflicts.
- Push, then open a pull request to `main` titled `<branch>: <round> fixes`. In the PR body list what was done, what was skipped and why, and anything Petros must decide.
- Don't change VERSION (config.js) or CACHE (sw.js); the last branch of a round (shell-2) bumps both.

## Branch ownership
- **gym**: gym.js, progress.js, workout.css, data/gym.js, data/gym-anatomy.js, wire/04-gym.js, wire/10-workout.js, gym parts of wire/05.
- **log**: today.js, supplements.js, Today/Log/supplement parts of wire/02, wire/03 and wire/06.
- **foods**: food.js, search.js, data/foods.js, data/foods-more.js, wire/01-core.js, food/cook parts of wire/02 and wire/05.
- **shop**: fridge.js, shop.js, fridge parts of wire/03, wire/07.
- **shell**: ui.js, core.js, coach.js, platform/*, config.js, sw.js, base/glass/motion/layout.css, wire/08, wire/09, theme tokens.
- **Shared files** (strings.js, index.html, theme.css): edit only the keys, markup and theme.css block for your own topic.

## Style rules
- Every visible text lives in `js/data/strings.js`, English + Greek. Edit the copy that wins (the last `Object.assign` that sets the key).
- Titles and buttons in Title Case.
- No emoji or text-glyph icons (✓ ✕ ＋ ⌄ ⓘ ▶ …): use `svgIcon()` line icons from ui.js, or nothing.
- Colours come from theme vars and must read at ≥ 4.5:1 in Light mode too. Accent used as text: `var(--t-accent-ink,var(--t-accent))`.
- AI features: `class="aiafter"` / `AI.badge()` after the text, never a ✨ in the string.
- Network calls: `fetchT()` (with a time limit), never raw `fetch()`. Haptics: `Phone.haptic()`.
