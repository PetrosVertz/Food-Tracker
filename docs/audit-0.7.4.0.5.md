# Audit — tracker v0.7.4 (round 0.7.4.0.5)

Audited: `tracker-v0.7.4_1.zip` (45 files). No code was changed.

## 0. Before you read

- **BRANCH.md, CORE.md and `tools/check.js` are not in this zip.** It's the full app zip (the GitHub copy). The merge page adds those three only to branch zips. So `node tools/check.js` could not be run.
  - As a stand-in, I ran these checks:
    - `node --check` on all 29 scripts plus sw.js: no syntax errors.
    - Every CSS and JS file in index.html is listed in the sw.js SHELL, with no duplicates and none missing.
    - VERSION `0.7.4` matches CACHE `tracker-v0.7.4`.
  - The "app-wide rules" used below come from README.md › Rules, `claude/branches.md` (the strict branch rules) and `claude/visual-spec-8nov.md`.
- Line numbers are from this zip.
- The branch for each item follows the ownership table in branches.md. Shared files are split by topic.

---

## 1. Emojis and emoji-like symbols

The app uses three kinds:
- **real emoji**, e.g. 🍳 💪 🧊;
- **dingbat icons used as text**: ✨ ＋ ✓ ✕ ▶ ▥ ⓘ ⌄ ▾ ★ ☆ ● ↺ ✎ ⚙︎ ❔ ⚠️;
- typographic signs (≈ ≤ × → ·). These are fine and not listed.

### 1a. strings.js: final values that still show an emoji or symbol (EN + GR)
`S` is built from many `Object.assign` blocks, so **a later line replaces an earlier one**. The line given is the one that wins.

| Key | Line | Shows |
|---|---|---|
| light | 22 | 🔦 Light |
| needKey | 37 | (⚙︎) in sentence |
| packHint | 51 | ★ in sentence |
| weighOne / countThem | 79 | ⚖️ / 🔢 (Piece weight sheet, index.html:415) |
| noFoods | 84 | ＋ Add Food in sentence |
| noType | 86 | ❔ No type |
| suggestRecipe | 90 | ✨ (set by `textContent` at wire/02-food.js:293, so the raw ✨ shows after a request) |
| addIngredient | 94 | ＋ |
| recipeBadge | 107 | 📖 recipe |
| searchOnline | 110 | 🔎 |
| addRecipeLater | 117 | ✨ (unused) |
| cookAgain | 118 | 🍳 Cook Again |
| getKey | 124 | 🔑 Get API Key |
| ownRecipe | 139 | 📝 |
| addSuppFab | 148 | ＋ |
| allTaken | 158 | 💪 (unused) |
| noTargets | 164 | 🎯 (unused) |
| copyYesterday | 167 | ↺ |
| logFab | 169 | ＋ Log Food |
| nothingLogged | 171 | ＋ ×2 in sentence |
| planNeedTargets | 193 | (🎯 at the top) — the Targets button is an SVG now |
| dropPlan | 194 | ✕ Clear plan |
| emptyFridge | 198 | ＋ Add Food in sentence |
| alertSupps | 209 | 💊 |
| sendReminders | 217 | 📲 (unused) |
| addAsText | 222 | ＋ |
| testKey / keyOk / keyFail | 227–228 | ✓ / ✓ / ✗ |
| addExercise / createEx | 239–240 | ＋ |
| postMeal | 244 | 🍽️ |
| startToday / startAny / resume | 245 | ▶ / ▶ / ● |
| addSet | 247 | ＋ (unused) |
| addWarm | 249 | ＋ |
| restEdit / prToast | 250 | ▸ / 🏆 (both unused) |
| smTitle | 252 | 💪 Workout Done |
| newWorkoutBtn | 257 | ＋ (unused) |
| gCutHold, gCutDrop, gBulkUp, gFlat, gDown | 260–264 | 💪 📉 📈 ➖ 📉 (all unused) |
| breakT / cbActive | 266 / 268 | 🔄 |
| petNone / petLv / petFed / petEvolved | 272–274 | 🥚 / 🍖 / 🍖 / ✨ (toast shows raw ✨) |
| newSet / endEx | 287 | ＋ / ✓ (unused) |
| noExYet | 288 | ＋ in sentence |
| prW / prV / prWLine / prVLine | 289–290 | 🏋️ 📈 |
| addThis | 294 | ＋ |
| whatNext | 295 | 💡 |
| recAllReady | 299 | 💪 |
| recWarnTomorrow / recWarnToday | 301–302 | ⚠️ |
| recRestDay | 303 | 😴 |
| howSore | 305 | 😬 (unused) |
| pasteRecipe | 321 | 📋 |
| sgGo | 323 | ✨ (textContent at wire/05-nav-cook-gym.js:86, so raw ✨ shows) |
| sgNoTargets | 324 | 🎯 |
| addWork | 328 | ＋ |
| fridgeFab | 338 | ＋ Add Shopping |
| lGymRest / lGymDone | 341 | 😴 / ✓ (launcher only, dead) |
| suWelcome | 342 | 👋 |
| suDoneSub | 348 | 🎯 |
| suAgain | 349 | ↺ |
| remWork | 350 | 💼 (unused) |
| qaTag | 352 | ⚡ |
| grpOnline2 | 353 | 🌐 (GR too) |
| fromFridge | 354 | 🧊 |
| shopScan / shopSearch | 358 | ▥ / 🔍 |
| formBtn | 361 | ▶ Form |
| wiOk | 366 | 👍 |
| bkT | 369 | 💾 |
| recReadyChip | 378 | ✓ |
| blDone | 388 | 💪 |
| addYesterday | 442 | ↺ (unused) |
| cancelRec | 450 | ✕ |
| shopPhoto / shopReceipt | 451 | 📸 ✨ / 🧾 ✨ (also not Title Case) |
| optPhoto | 452 | ✨ |
| cWeighLink | 457 | ⚖️ |
| cqT / cqGo | 458–459 | ⚡ / ✨ (unused) |
| shopCam | 470 | 📷 ✨ |
| addFoodFab | 497 | ＋ Add Food |
| addFridgeFab | 508 | ＋ Add Food |
| planMyDay | 515 | ✨ (unused) |
| qaBtn | 516 | 🥡 (unused) |
| takeawaySub | 530 | ✨ (unused) |
| dropMore | 543 | ＋ Drop (GR also "＋ Drop") |
| shopWebLook | 556 | ✨ (shown with `status()` = textContent, so raw ✨) |
| chkBtn | 559 | ✨ |
| chkAllDone / chkRunning | 562 | ✓ / ✨ (raw ✨ through `status()`) |
| cookSuggest | 594 | ✨ |
| foodsQrOpt / foodsQrGo | 595–596 | ✨ |
| scanItem | 598 | ✨ |

**About ✨.** It is a hidden marker that `applyLang` (ui.js:114) and `AI.label` (ai.js:156) turn into the AI badge. But it only becomes the badge on `data-t`/`data-th` elements. Everywhere text goes in by `textContent`, it shows as a real ✨: wire/02:293, wire/05:86, shop.js:229, shop.js:289 and the gym.js:325 toast. `data-tp` placeholders strip it.

**Dead copies that still hold emojis** (overwritten later, never shown, but they clutter the file):
- addFoodFab@14 (＋), cookFab@14 (🍳 Cook a meal)
- optPhoto@17, scanPhoto@22 (📷)
- noBarcodeLabel@24/451 (📷), typeIt@24 (✎)
- tryingModel/cancelRec@135 (✕)
- planMyDay@192 (✨), qaBtn@351/404 (⚡)
- shopPhoto/shopReceipt@356–357, cookSuggest@319 (✨), cookOwn@320 (📝)
- scanItem@498 (📸 ✨)

**Your examples:**
- **Cook a Meal, Suggest a Recipe, My Own Recipe:** the values that win (594) are clean. The old 🍳/📝 versions are at lines 14, 319 and 320.
  - The Cook sheet title `cookMeal`@88 is "Cook a meal" (not Title Case).
  - "Suggest a Recipe" keeps ✨ as its AI marker.

### 1b. index.html
| Line | What |
|---|---|
| 43, 57, 105, 137, 164 (+79, 113) | `⚙︎` text gear on every page's Settings button. All hidden by layout.css:71, so this is dead markup |
| 47–49 | launcher bubbles 🥗 📅 🏋️ (dead page, see §5) |
| 61–68 | home tiles ▥ 📅 🏋️ 🗂️ 🍲 🧊 🛒 💊 (dead page) |
| 125, 713 | `ⓘ` text info buttons |
| 191 | old bottom bar 🥗 📅 🏋️ (dead, always hidden) |
| 196 | Bulb sheet title starts as `💡` (gym.js:989 overwrites it) |
| 273–274 | 🇬🇧 🇬🇷 flags on the first-launch language sheet |
| 282–284 | Add Food options ▥ / 📷 / ✎ |
| 582 | `💡` in #pkBulb; JS swaps in the robot (gym.js:949). Fallback glyph left in the markup |
| 662 | `❄️` before "Frozen" in Add to Fridge |

### 1c. JS (visible output only, comments not counted)
- **ui.js**
  - 157: "Good morning 👋" (launcher, dead)
  - 224: FAB `'＋ ' + createWorkout`
  - 225: FAB `'▶ ' + startWk`
  - 242: 🇬🇧 🇬🇷 in the setup language pick
  - 252: big ✅ on setup done
  - 308: `⌄` text chevron in the select button
  - 314: `✓` in the picker list
- **food.js**
  - 17: `'▶ '` (same as ui.js:225)
  - 63, 64: `⌄`
  - 121: the food type button shows the type emoji (`s.icon`)
  - 122: ❔
  - 132: ★ ☆ ✕ (pack sizes)
  - 367: `'▥ '` (scan button made in JS)
  - 397, 483: 📖
  - 482, 518: ingredient `ref.icon` emoji
  - 490: mealIcon fallback 🍲
  - 623: ingredient emoji / 🍽️
  - 626: ✕
- **today.js**
  - 45: 🧊 in the plan list
  - 47: `✓ ` on the Ate button
  - 48: 💡 tip
  - 77: ⓘ
  - 189: `✓ ` chips
  - 211: 🕒 ⭐ group labels
  - 212: ⭐ group labels
  - 220: 🌐 "Search online"
  - 443, 473: 🔓 / 🔒 macro padlocks as emoji
- **supplements.js**
  - 18: ✓ and ✕
  - 27: quick-add emoji (`q.icon`)
  - 31: `<option>` food emoji
- **fridge.js**
  - 47: 📦 + emoji
  - 56: emoji
  - 133: 🧊 stock badge
- **gym.js**
  - 118: `✓ ` supplement slots
  - 148, 152, 325, 933: celebrate('🏋️' / '📈' / '🏆' / '✨' / '🎉')
  - 364: the burst confetti is emoji, plus ✨
  - 338: 🥚 pet placeholder
  - 359: ✅ / ⬜ pet checklist
  - 374–376: 😴 🔄 ● (home tile, dead)
  - 535: `✕ No thanks`
  - 555: `✓ trained`
  - 559: 🏋️ in the plan `<option>`
  - 561: ✕
  - 580: ▶
  - 585: ⌄
  - 614: ⓘ
  - 632: ✏️ Create Exercise tile
  - 701: ✓
  - 719: ↘ as the drop-set label (the spec says a **D** badge)
  - 729: 🔥 warm-up hint
  - 732: ✓ 🏋️ 📈 ↺
  - 772–774: ＋ steppers
  - 807, 879: ✕ mistakes
  - 875: 🏋️ 📈
  - 878: ✅ How to do it
  - 879: ⚠️ Common mistakes
  - 903: ✓
  - 930: 🏆 PRs
- **progress.js**
  - 61: ▾
  - 62: ⓘ
- **wire/02-food.js**
  - 217: 🌐 icon
  - 329–334: supplement quick list emoji 💪 🥛 🌙 😴 ☀️ 🐟 🔩 💊 ⚡ 💧 🍊 🌿 (shown at supplements.js:27)
- **wire/03-fridge-today.js**
  - 53: emoji inside the "added to fridge" toast
  - 116: ✏️
- **wire/04-gym.js**
  - 294: celebrate('🥚')
- **wire/01-core.js:9–117**: the whole food type table uses emoji icons (🥛 🧀 🍗 …). They reach the screen through `iconOf()` / `subOf().icon` at the places above.
- **data/config.js:73–74**: `🔑 Get API key` / `✓` in the AI key guide (EN + GR).
- **data/foods.js:160, 163**: `＋` in the Shortcuts guide (EN + GR).

### 1d. CSS `content`
- layout.css:114: `content:'🗑'` (swipe-to-delete on Today rows)
- theme.css:568: `content:'✓'` (Quick Log footer)
- layout.css:52: `content:'›'` is a chevron, not an emoji (keep or swap for the SVG)

---

## 2. Light mode: hard-to-read text, and buttons that don't look like buttons

Contrast in Light mode (target 4.5 : 1). Backgrounds: card #fff, inner card #ebecee, page #e2e3e6.

| Colour used as text | on card | on page | Problem |
|---|---|---|---|
| Accent **Lime** #8fbb12 (the default) | 2.3 | 1.8 | fails |
| Accent Gold #c08c0c / Mint #16a673 / Sunset #e8692a / Ocean #0f9aa6 | 3.0 / 3.1 / 3.2 / 3.4 | 2.3–2.6 | fail |
| `--t-warm` #f2b84b (**no Light value**) | 1.8 | 1.4 | fails badly |
| `--t-rest` #5fa8f5 (no Light value) | 2.5 | 2.0 | fails |
| `--t-drop` #b39bff (no Light value) | 2.3 | 1.8 | fails |
| `--t-fail` #ff7a7a (no Light value) | 2.5 | 2.0 | fails |
| `--t-mid` (Light #c28414) | 3.2 | 2.5 | fails |
| `--t-c` carbs amber (Light #b07d0a) | 3.6 | 2.8 | fails for small text |
| `--t-done` (Light #1f9d57) | 3.5 | 2.7 | fails for small text |

### Where this shows (file:line, selector)
- **Amber and yellow:**
  - theme.css:318 `.sttag.ready` and :577 `.sttag.est` (--t-warm). Only `.est` has a Light fix (:578).
  - base.css:72 `.hint.warn`, :111 `.ipick.unset`, :152 `.parsed li.miss`, :51 `.chip.raw` (all --c)
  - theme.css:288 `.lm .c`, :315 `.eatrow .esub .c`, :449 `.stag.web`, :483 `.fixpack`
  - base.css:209 `.feed li.prv` is **#ffd23f** (1.4 : 1 in Light)
  - glass.css:54 `.remind .rmrec` is **#ffcf9e** (1.4 : 1 in Light)
  - base.css:281–283 `.alert` / `.alert.red` / `.alert.green` are hard-coded dark boxes with pale text and no Light version. They show as dark brown, red and green blocks on the light page (Today alerts, Recovery warnings gym.js:470).
- **today.js:481–489 `kcalColor()`** (the big kcal number on Today):
  - At 75–100 % it blends from **white** (238, 241, 243) to green, so in Light the number fades to near-white and disappears.
  - Over target it uses `hsl(…, 59–68 % lightness)`, a pale yellow/orange that's unreadable on white.
- **Accent as text** (fails in Light with Lime, Gold, Mint, Sunset, Ocean):
  - theme.css: :213 `.swm.top`, :327 `#dBlocks .gymdayic`, :372 `.strow .stic`, :387 `.eyest`, :414 `.lsave`, :448 `.stag`, :496 `.chkvals .chg b`, :559 `.lqswapbtn`
  - workout.css: :5 `.addexbig`, :17 `.blchip.on`, :18 `.blbest small`, :83 `.sslink.on`, :187 `.newset`
  - base.css: :13 `h1 span`, :51 `.chip.ok`, :83 `.pack.usual .star`, :233 `.dayrow.today b`
  - glass.css:48 `.qlog`; motion.css:19 `.pickopt b`; layout.css:307 `.dym b`
- **Blue, violet and red as text:**
  - workout.css: :168 `.adddrop` (--t-drop), :173 `.rbk`, :175 `.rbfuse`, :179 `.rbt.last` (--t-rest)
  - theme.css: :576 `.sttag.lq.onl`, :631 `.sttag.frozen` (Light fix at :633, others none), :648 `.ffrz.on`, :649 `.frm` (--t-fail)
- **Hard-coded bright colours written into the page by JS:**
  - gym.js:618 `.eqhead` text uses `EQ_COL` (data/gym.js:381: #ffb547 kettlebell, #5ab0ff, #4dd0e1 …)
  - gym.js:644 Pick Exercise heading uses `HEAD_COL` (data/gym.js:301: #ffc46b, #ffa53a …)
  - wire/05-nav-cook-gym.js:144 uses `EQ_COL`
  - gym.js:171 `SS_COL` (#c6f432, #ffb547 …) drives the superset label `.sslbl` (workout.css:81)
  - All are dark-mode colours with no Light set.
- **Toast:** base.css:140 `.toast button{color:#3d6b00}` (the Undo action). The toast background is `var(--text)`, which is near-black in Light, so dark green on black = **2.8 : 1**.
- **Main-pill text:** theme.css:59 sets Light `--t-mp-text:#c6f432`. applyTheme (ui.js:59) then overrides it per preset with the *dark* accent. That's intended (bright on black), so fine.

### Buttons that don't look like buttons
- **Secondary `.btn` in Light:** theme.css:87 = `background:var(--t-sel)` #e6e7ea with `border:0`. On the page background #e2e3e6 that's 1.02 : 1, so it's invisible and only the text shows. Same for `.pillbtn` without a type.
- **`.linkbtn`:** base.css:36 = grey 13 px text, no fill, no underline. It's used for real actions:
  - index.html: 85 Sort, 94 Add Supplement, 141 "or pick another workout", 236 Next photo, 254 Run setup again, 424, 456 Paste a recipe, 461 Weighed the cooked food? / Weigh it in the pot
  - gym.js: 535 No thanks, 562 + Work, 732 Reopen, 766 Change
  - today.js: 42 Clear plan, 203 Delete combo (red text only), 507 Cancel
  - shop.js:67 Undo; fridge.js:87 Clear bought
  - Also defined three times: base:36 13 px, glass:55 15 px, workout:35 13 px, which wins app-wide from the gym file.
- **Glyph-only buttons with muted colour and no shape:**
  - base.css:82 `.pack button` (★ ☆ ✕)
  - base.css:116 `.irm` (✕)
  - layout.css:188 `.take button`
  - theme.css:404 `.girm`, :557 `.lqx`
  - layout.css:59 `.ibtn` (ⓘ, grey)
- **`.lqswapbtn`** (theme.css:559): accent text only, so in Light Lime it's 2.3 : 1 and looks like a label.

---

## 3. The page-title blur

The fade is `section.page>header::before` (layout.css:210–212). It's hidden while `body.ovopen` or `body:has(.overlay.open)` (layout.css:207–208), because on iPhone a sticky blurred layer paints over later fixed layers.

1. **Closing windows go under the blur.** ui.js:328 `close()` removes `.open` and turns `ovopen` off straight away. The sheet then animates out for 200 ms as `.overlay.closing` (motion.css:8). During those 200 ms the fade and header layer come back, so on iPhone every closing sheet slides out *under* the title blur. Neither the CSS rule nor `close()` counts `.closing`.
2. **Floating things that aren't `.overlay` are never covered by the rule.**
   - `.tippop` (layout.css:60, made in today.js:499–503). It's placed at `r.bottom + 8` with no check against the header's bottom. With an ⓘ just under the header, the bubble sits in (and on iPhone under) the blur.
   - Same risk for the Log Food unit drop-down `.ldd` (today.js:157/657) and the fridge row menu (fridge.js:178) when the row is near the top.
   - The AI bubble already clamps to the header bottom (ai.js:131–133), so it's fine.
3. **Gym section title is outside the header.** index.html:139 `<h2 id="gSecTitle" class="sectitle">` (base.css:167; set at gym.js:888/892) is a second title under the header that scrolls under the blur. Meanwhile the real header still says "Gym Buddy". Put the section name in the header h1 (or make the h2 sticky inside the header) instead.
4. **Full-screen windows have no title bar.**
   - Settings pages `.setpage` (theme.css:346–350): the `h2` and the `.sback` arrow scroll away under the status bar with no fade, unlike pages.
   - Same in Pick Exercise (workout.css:88, only the search bar is sticky).
   - The live workout header `.seshead3` is sticky with a solid fill (workout.css:116), which is fine.
5. **Layering of the header itself.** The h1 is `z-index:2` in an isolated header with the fade at 0 (layout.css:203–204), so the title is above the fade on pages.
   - `.hbtns` buttons are `z-index:1`.
   - workout.css:74 gives `.aibub` `z-index:100000`, while layout.css:235 gives 150. Two values layered; pick one.

---

## 4. Greek and Title Case

### Missing Greek
- **No key is missing its Greek value.**
- **Missing key:** search.js:195 `t('logfClear')`. The key doesn't exist, so the clear button's aria-label reads "logfClear".
- **Greek identical to English (English shown in Greek mode):**
  - tDrop "Drop" 286, dropMore "＋ Drop" 543
  - wPush "Push", wPull "Pull" 332, wCardio "Cardio" 166, broSplit "Bro split" 331
  - gRecomp "Recomp" 187
  - grpOnline 109 / grpOnline2 353 "Online", logQOnl "online" 583
  - barcode "Barcode" 64
  - logQT "Quick Log" 575, tabFood / lwTrack "Food Tracker" 338 / 361, tabGym "Gym Buddy" 313
  - Names (Food Tracker, Gym Buddy, Quick Log) may be on purpose. The workout words need a decision.
  - Greek loanwords (barcode, online, superset, bulk) appear inside many Greek sentences; I'm listing them only, since those are common Greek usage.
- **English-only text on screen in Greek mode:**
  - gym.js:828: when an exercise has none of our own steps, the form page fills "How to do it" with the free-exercise-db **English** instructions. formCredit@362 even says "Steps in English".
  - `p.names[0]` pet names at gym.js:348.
- **Text written in JS instead of strings.js** (works, but breaks "every text in strings.js"):
  - gym.js:374 (Today / Σήμερα)
  - today.js:128–131 (Slice, Piece, Pack, Plate, Ounces, Millilitres, Grams), :249 (All), :293 (Grams), :391 (Rest of day)
  - wire/04-gym.js:52 (weekday names)
- **English-only aria-labels** across index.html and JS:
  - Settings ×7, Back ×5, Remove ×4, Info ×4, Scan ×2
  - Targets, Recovery, Previous/Next day, Previous/Next month, Lock, More, Less, Close, Clear, Send, Amount, Search foods, Same as yesterday, What next?, Time taken, plus, minus

### Title Case
- **The Title Case pass is in the wrong place.** strings.js:425 runs `titleCase()` over a fixed key list at line 425, but **14 `Object.assign` blocks after it replace keys**, so later values skip the pass. In the list, these finals are not Title Case:
  - geminiKey@453 "Gemini API key (AI = uses it)"
  - scanPhoto@598 "Scan From a Photo" ("From" should be small)
  - shopPhoto / shopReceipt@451
- **Titles and buttons that aren't Title Case** (final line):
  - cookMeal@88 "Cook a meal", cookAgainT@88 "Cook again"
  - noType@86, grams / millilitres@47 "grams (g)" / "millilitres (ml)"
  - alsoLog@172, bodyweight@187, unW@354 "Body weight"
  - dropPlan@194, newWorkoutBtn@257
  - leftoversIn@214, scDoneLbl@225
  - useBtn@338 "Take out", takeOutT@354, comboDel@354
  - remSetT@350, formT@361 "Correct form"
  - typeChange@363 "change", otherWorkout@363 "or pick another workout"
  - cookedW@370, potOther@370
  - blBuildT@389, blAccept@390
  - cWeighLink@457, sgMid / sgLong@456 ("min" fine)
  - realStartT@524, didYouMean@529
  - startAny@245 "Start a workout", resume@245 "Resume workout"
  - planMyDay@515 (unused)

---

## 5. Leftovers: old icons, layered styles, unused code, rule breaks

### Dead pages and markup (unreachable since the rail replaced them)
- **`#pgLaunch` (index.html:40–52) and `#pgHome` (index.html:54–71) can never show.**
  - `route()` (ui.js:203–209) rewrites `home`/`start` to `#foods` and always hides `pgLaunch`.
  - The code still runs on every `renderAll()`:
    - food.js:16 → `renderHome()` 668–675 → `homeTodayTiles()` 576–590 + `homeGymTile()` gym.js:371–377
    - ui.js:156–162 `renderLaunch()`, called at ui.js:281, 290 and wire/08:64
    - ui.js:165–176 `launchTo()`
  - The listeners still run too: wire/02-food.js:14, 16 (tiles); wire/06:140 (bubbles); wire/03:287 and wire/04-gym.js:325 (`#homeAlerts`).
  - Their strings and CSS remain (`.tile`, `.bubble`, `.tiles`, `.mbar`…).
- **`#tabbar`** (index.html:191, emoji) is always hidden by route() (ui.js:205). Its listener sits at wire/05:106.
- **`#ovWType`** (index.html:748–754, the "Workout Type" sheet) is never opened. Its only data, `WT_ICON` (wire/05:4) and `WTYPES` (data/gym.js:367), are unused.
- **Settings `⚙︎` buttons** in every header (index.html:43, 57, 79, 105, 113, 137, 164) are hidden by layout.css:71. Their listener is at wire/02:27.
- **Empty "SORENESS" section** comment at index.html:598.

### Unused functions and tables (no reference anywhere)
- data/config.js:90 `SO`
- data/foods.js:451 `LOC_IC`
- data/gym.js:293 `SORE`
- data/gym.js:367 `WTYPES` and wire/05-nav-cook-gym.js:4 `WT_ICON`
- gym.js:179 `toggleLink` (the old ⛓ link)
- gym.js:621 `bodyMapSVG`
- gym.js:911–918 `fridgeGroups` (fridge code in the gym file)
- gym.js:990 `types` emoji column (the `ic` value is never used)
- today.js:416 `weighAdvice`
- fridge.js:53 `openFridgeItem`
- wire/09:4 `TAB_LBL`
- food.js:372 `itemHtml(kind, i, icon, …)` ignores its `icon` argument. All callers still pass emoji (food.js:379–381, wire/03:114–115).
- 20 element ids that nothing reads: gSendHint, mBrandSec, mTypeSec, mTypePicker, pcTitle, pcSub, pcGl, pcNl, pcPackl, amDD, tgGp, tgGc, tgGf, tgRp, tgRc, tgRf, wtList, lqSend, dmCredit (set by data-t only, fine), ovWType.

### Unused strings: 135 keys never referenced (dynamic `slot_` / `petMood_` / `wt_` / `ul_` / `u_` families excluded)
- **Gym:** gtPlan, gtWorkouts, discard, discardQ, startWorkout, restLbl, restOver, addSet, removeSet, lastTime, tryNext, firstTime, comebackW, restEdit, prToast, planHint, newWorkoutBtn, progOverall, progSinceStart, gCutHold, gCutDrop, gBulkUp, gFlat, gDown, historyT, tWarm, tWork, tDrop, tFail, typeLbl, endEx, endWorkout, gtRecovery, soreQ, sore0–sore4, soreSaved, howSore, hubRecSub, weekHint, broSub, eqWhat, remWork, formZoomHint, formPhoto, repsL, lastSetL, weekHintSimple, wiRate, wiNeed, wiApply, wiApplied
- **Log:** supNeedTime, allTaken, tagTraining, tagNeeded, noTargets, todayD, yesterdayD, tomorrowD, scanToLog, calcHint, planMyDay, logThis, elecHint, qaBtn, qaMore, qaNeed, lastAmt, quickLogged, lwTake, lwTrack, fibSug, fibCutX, extrasT, winElec, addYesterday, usualHour, addAsTakeaway, takeawaySub, checkVals, logQTotal
- **Foods:** myFoods, pieceQ, pieceSub, pieceSkipEst, pieceSkipLater, inPack, wholePackU, notInPieces, orFoodOnly, noWeightConfirm, addRecipeLater, cqT, cqPh, cqGo
- **Shop:** nItems, nItem, optScanF, optPickF, expires, noExpiry, expToday, expTomorrow, expIn, expGone, expWeeks, expDate, ofPack, piecesLeft, useBtn, sendReminders, sendHintIos, sendHintAndroid, notFoodWarn, shopPhotoSub, shopReceipt, shopReceiptSub, shopAdd, scanNextQ, frozenTip, fixPack
- **Shell:** settingsSub, yourData, comingSoon, backArrow, stCustomSub, stBodySub, stAISub, stDataSub, stAboutSub, aiSlow

### strings.js layering: 37 keys are defined 2–3 times (the earlier lines are dead)
homeHello 6/314 · addFoodFab 14/442/497 · cookFab 14/594 · optPhoto 17/452 · scanPhoto 22/598 · typeCode 23/480 · noBarcodeLabel 24/451/599 · typeIt 24/599 · fibre 49/315 · scanNext 83/360 · mealName 89/454 · geminiKey 123/453 · tryingModel 135/450 · cancelRec 135/450 · inFridgeTag 170/565 · planMyDay 192/515 · planT 193/515 · fromFridge 195/354 · fridgeFab 197/338 · useBtn 207/338 · u_caps / u_tabs / u_scoops / u_drops 231/490 · workoutName 242/385 · inFridgeToo 306/600 · tabFood 313/338 · cookSuggest 319/594 · cookOwn 320/594 · sgPh 322/455 · qaBtn 351/404/516 · qaT 351/516 · qaSub 351/405 · shopPhoto 356/451 · shopReceipt 357/451 · advancedT 466/480 · scanItem 498/598

### CSS: old styles layered on new ones
57 selectors are set 3+ times across files. `!important` counts: theme.css 246, layout.css 125, workout.css 44. Worst cases (file:line in load order):
- `.btn` base:87 → glass:16 → layout:164 → theme:87; `.btn.primary` base:88 → glass:17 → layout:165 → theme:88 (glass:17 and layout:165 are the same rule twice)
- `.fab` ×9 (base:54, 165 · glass:18 · layout:12, 37, 73, 94 · theme:88, 293); `.fab2` layout:214 → theme:331 → theme:433
- `.sheet` ×7, `.overlay` ×5, inputs/select/textarea ×6, `body` ×8, `html` ×6, `:root` ×16 (base.css:1–4 still sets the old palette: --p #5ab0ff, --c #ffb547, --f #ff6b8b, --danger #ff5c5c, --bg #0f1113 …, all overridden by theme.css)
- `.macrocard` ×11, `.card` ×7, `.exc` ×8, `.tpcard` ×8, `.tile` ×8, `.foldh` ×6, `.prog` ×7, `.remind` ×7
- `.linkbtn` ×3 (above); `.toast` base:138 → motion:14 → layout:321 + html.pwa layout:197
- `.aibub` layout:235 / 254 / 267 + workout:74
- **AI badge styled three times:** theme.css:501–503 (gym block, `.aibadge`), 520–528 (log block, `.aib`, `.aiafter`), 654–658 (shell block, all three). There are also three JS makers: `AI.badge()` (ai.js:155), `gymAIB` (gym.js:85, *before* the text) and `logAIB` (today.js:536).
- `.alert`, `.restbar`, `.seshead` etc. still use the pre-0.6.6 hard-coded palette (base.css).
- The warm-up type uses `--c` (carbs) at base.css:226 `.t-W .stype` instead of `--t-warm`.

**Dead CSS classes** (no markup or JS uses them):
- base.css: .bignum, .sheethead, .hubrow, .eqb, .exsum, .exgrid, .soreface, .soreemo, .seshead, .stype, .restbar, .rbtop, .dayrow, .tpex, .gitem, .src-e
- glass.css: .slideL, .slideR, .stackbtns, .fmeta, .frow2, .stackn, .searchrow, .scanin, .srow, .qlog, .qabtn, .rmbtns
- layout.css: .logacts, .hubtabs, .ghostbtn, .slist, .frz
- theme.css: .fixpack, .onacc
- workout.css: .l2, .createwk, .aispin2, .sslink

### Old icons next to the new line icons
The line icons are `ICON`/`svgIcon` in ui.js:2–28: back, next, down, check, x, plus, search, scan, camera, eye, …
- Text chevrons `⌄` (ui.js:308, food.js:63–64, gym.js:585) and `▾` (progress.js:61) sit next to `svgIcon('down')` (fridge.js:178, today.js:157/657).
- Text `✕` is used for remove/close in supplements.js:18, food.js:132/626, gym.js:535/561 and the mistakes lists, while `svgIcon('x')` exists.
- Text `✓` is used in many places while `svgIcon('check')` exists.
- `＋` in labels while `svgIcon('plus')` exists.
- `ⓘ` text info buttons; `▥` text scan glyph (food.js:367, index.html:61/282, shopScan) while `svgIcon('scan')` exists.
- `▶` play glyphs; 🔓 / 🔒 emoji padlocks (today.js:443/473).
- Emoji food-type icons (wire/01-core.js) and supplement icons (wire/02:329–334), while `suppIcon` (wire/02:343) already draws the line capsule everywhere else.

### Duplicate logic
- The gym FAB text is set in two places: ui.js:224–225 and food.js:17, both with `'▶ '`.
- The fridge-pack stacking code lives in gym.js:911 (unused, see above).

### Breaks of the app-wide rules
- **Storage only through Store** (README › Rules): index.html:16 reads `localStorage` directly for the pre-paint theme. It's a sensible exception but isn't documented as one (add it to CORE.md or read it through a tiny Store helper).
- **Phone.\* only:** ui.js:325 `const haptic = () => Phone.haptic();` is an alias used across files (gym.js:1040/1049 even guard it with `typeof haptic`). Call `Phone.haptic()` directly.
- **Fetch with a time limit:** food.js:342 (Open Food Facts by barcode) and gym.js:791 (`loadFedb`) call raw `fetch()` with no timeout. Use `fetchT` (core.js:53).
- **Spec: "D" badge for drop sets**, but gym.js:719 labels drop rows `↘`.
- **Spec: blur only on floating things**, but glass.css:9 and layout.css:75 still put `backdrop-filter` on `.tile`, `.macrocard`, `.bubble`, `.remind`, `.minirec`, `.foldh`, `.hubtabs`. theme.css:75 cancels it with `!important`, so it's layered dead weight.
- **Branch blocks used for app-wide styles:** the shared AI badge is in the gym block (theme.css:501–503), and the "no zoom" rule is in the shell block (fine, that's shell).
- **Old palette and fonts:** base.css:7 still sets `font:15px/1.4 system-ui…` (Inter comes from theme.css:64). base.css:1–4 sets the whole old palette.

---

## 6. Gym fix list: hold-to-superset doesn't work on iPhone (known bug)

**Code:** gym.js:1029–1063 `makeSortable()`; wired at wire/04-gym.js:334–339 (Create a Workout `#tpList` / `.tpcard`, live workout `#sesBody` / `.exc`).

**What I see in the code** (why reorder wins):
- **Hit zones:** the zone test (gym.js:1047) uses `drag.rects`, a snapshot from drag start. Once the other cards have shuffled (translateY at :1053), the card you're holding over is no longer where its rect says. Reordering also keeps going while you're over a zone: `to` isn't reset, so cards keep moving.
- **The hold rule:** a superset needs a 1 s motionless hold (`HOLD`, :1031). Any change of `over` restarts it.
- **iPhone:** `#sesBody`/`#tpList` are `touch-action:pan-y` (workout.css:201) and `.swipebox .exc` too (layout.css:130). iOS often ends the pointer stream with `pointercancel` once it starts panning. `end()` (:1056–1059) treats cancel like a drop and **commits the reorder** (`onMove`) with `armed` still false.

**Fix (as asked):**
- While dragging, the middle part of the target card is a "link" zone. It lights up "Superset" and the cards stop shuffling. Only the top and bottom edges reorder.
- Link on release inside that zone.
- Give a light vibration (`Phone.haptic()`) when the zone arms.
- Same in Create a Workout.

**Also:**
- Use live rects for the zones, not the start snapshot.
- On `pointercancel`, cancel the drag instead of committing it (or drive the drag with touch events on iOS).
