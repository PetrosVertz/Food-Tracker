# Fix lists — 0.7.4.0.5

How to use: each branch session does only its own section. Follow CLAUDE.md.
Line numbers come from the audit (docs/audit-0.7.4.0.5.md) and may have shifted: search by name.

Order: **shell-1** (shell items 1, 2, 3, the data-ta part of 7, and the AI-badge line of 8) → **gym, log, foods, shop** (any order, can run at the same time) → **shell-2** (all other shell items) last.

## gym


1. Hold-to-superset in a live workout doesn't work on the iPhone (Create a Workout has the same code). When you hold an exercise over another to link them, the reorder takes over and just moves it above or below the other card.
   - Code: gym.js:1029–1063 makeSortable(), wired at wire/04-gym.js:334–339.
   - Why the reorder wins:
     - The zone test (gym.js:1047) uses drag.rects, taken when the drag started, but the other cards have already shuffled.
     - `to` isn't reset while you're over a card, so the cards keep moving.
     - iOS sends pointercancel once #sesBody/#tpList start panning (touch-action:pan-y, workout.css:201, layout.css:130), and end() (gym.js:1056) then commits the reorder.
   - Fix:
     - While dragging, the middle part of the target card is a "link" zone. It lights up "Superset" (.ssarm, theme.css:333–334) and the cards stop shuffling.
     - Only the top and bottom edges reorder.
     - Link on release inside that zone (no 1 s wait).
     - A light vibration when it arms: Phone.haptic().
     - Work the zones out from where the cards are now, not from the start-of-drag rects.
     - On pointercancel, cancel the drag; never commit a move.
     - Same in Create a Workout.

2. No emojis or text-glyph icons. Use svgIcon() line icons or drop them. Shell adds the icons info, lock, unlock, trash, star, starOn, play and snow (shell-1, already on main).
   - gym.js:
     - 118: "✓ " in supplement slots
     - 148, 152, 325, 933 and wire/04-gym.js:294: celebrate('🏋️' / '📈' / '🏆' / '✨' / '🎉' / '🥚'). celebrate() at 363–366 also throws emoji and ✨ as confetti; make it plain CSS dots/shapes.
     - 338: 🥚 pet placeholder
     - 359: ✅ / ⬜ pet checklist
     - 535: "✕ No thanks"
     - 555: "✓ trained"
     - 559: 🏋️ in the plan <option>
     - 561: ✕
     - 580: ▶
     - 585: ⌄ → svgIcon('down')
     - 614: ⓘ → svgIcon('info')
     - 632: ✏️
     - 701: ✓
     - 719: ↘ drop-set label → a "D" badge, as in the spec
     - 729: 🔥
     - 732: ✓ 🏋️ 📈 ↺
     - 772–774: ＋ steppers → svgIcon('plus')
     - 807, 879: ✕ → red svgIcon('x')
     - 875: 🏋️ 📈
     - 878: ✅
     - 879: ⚠️
     - 903: ✓
     - 930: 🏆
     - 990: drop the unused emoji column in `types`
   - progress.js: 61 ▾ → svgIcon('down'); 62 ⓘ → svgIcon('info').
   - index.html: 196 💡 in the #ovBulb title; 582 💡 fallback inside #pkBulb (the robot replaces it).
   - strings.js (edit the line that wins, EN + GR):
     - startToday, startAny, resume 245 (▶ ▶ ●)
     - addExercise, createEx 239–240; postMeal 244; addWarm 249; smTitle 252
     - breakT 266; cbActive 268; petNone, petLv, petFed, petEvolved 272–274
     - noExYet 288 (＋ in the sentence → "Add Exercise")
     - prW, prV, prWLine, prVLine 289–290; addThis 294; whatNext 295
     - recAllReady 299; recWarnTomorrow, recWarnToday 301–302; recRestDay 303
     - addWork 328; formBtn 361; recReadyChip 378; blDone 388; dropMore 543

3. Light mode (coloured text on grey):
   - Accent text → var(--t-accent-ink,var(--t-accent)). Shell adds that token (shell-1, already on main). Places:
     - workout.css :5 .addexbig, :17 .blchip.on, :18 .blbest small, :187 .newset
     - theme.css :213 .swm.top, :372 .strow .stic
   - Shell also gives --t-warm, --t-rest, --t-drop, --t-fail and --t-mid darker Light values (shell-1, already on main) (today they have none). Check in Light:
     - workout.css :168 .adddrop, :173 .rbk, :175 .rbfuse, :179 .rbt.last
     - the W/D/F type badges. Done badges are filled with a black letter; on the darker Light fills, use a white letter.
   - Hard-coded dark-mode colours used as text:
     - data/gym.js:381 EQ_COL (text at gym.js:618 and wire/05-nav-cook-gym.js:144)
     - data/gym.js:301 HEAD_COL (heading at gym.js:644)
     - gym.js:171 SS_COL (.sslbl, workout.css:81)
     - Add Light versions (≥ 4.5:1 on white) or read them from CSS vars.
   - base.css:209 .feed li.prv (#ffd23f) and glass.css:54 .remind .rmrec (#ffcf9e) are about 1.4:1 in Light. Use theme vars.

4. Title blur:
   - index.html:139 #gSecTitle (set at gym.js:888/892) is a second title under the header. It scrolls under the title blur while the header still says Gym Buddy. Show the section name in the header h1 and remove the h2.
   - Pick Exercise (#ovExPick, workout.css:88): its title and back row scroll under the status bar. Make them a sticky top bar with a solid background, like .seshead3.
   - workout.css:74: remove the .aibub z-index (shell keeps one value in layout.css).

5. Greek and Title Case:
   - Greek identical to English:
     - tDrop 286, dropMore 543 ("＋ Drop")
     - wPush, wPull 332; wCardio 166; broSplit 331
     - Give Greek (e.g. Πτωτικό, Ώθηση, Έλξη, Αερόβια, Ένας μυς τη μέρα), unless Petros wants these gym words left in English.
   - English steps in Greek: gym.js:828 fills "How to do it" with the free-exercise-db English instructions when we have none. In Greek show only our own steps. Fix formCredit 362 ("Steps in English").
   - Move text out of JS into strings (gym keys, EN + GR): wire/04-gym.js:52 weekday names.
   - English-only aria-labels in gym markup and JS: "Back" #gBackBtn (index.html:136), "What next?" #pkBulb (582), "Recovery", plus/minus. Shell adds data-ta="key" (shell-1, already on main); use it with gym keys.
   - Title Case:
     - startAny "Start a Workout", resume "Resume Workout" (245)
     - formT "Correct Form" 361; typeChange "Change", otherWorkout 363
     - remSetT 350; blBuildT 389; blAccept 390; realStartT 524

6. Leftovers and unused code:
   - Shell removes the old home and launcher pages (shell-1, already on main), so these must go now or start-up breaks:
     - wire/04-gym.js:300 $('tGym') listener and :325 $('homeAlerts') listener
     - the renderHome() calls at gym.js:14 and wire/04-gym.js:59 and :114
     - homeGymTile gym.js:371–377 (with its 😴 🔄 ● text). If check.js says food.js still uses it, leave the definition (nothing calls it any more) and say so in result.json.
   - Unused (delete):
     - gym.js:179 toggleLink (old ⛓ link), :621 bodyMapSVG, :911–918 fridgeGroups (fridge code in the gym file)
     - data/gym.js:293 SORE, :367 WTYPES
     - data/config.js:90 SO
     - wire/05-nav-cook-gym.js:4 WT_ICON, plus the never-opened #ovWType sheet (index.html:748–754)
     - the empty "SORENESS" comment (index.html:598)
   - Unused strings (delete): gtPlan, gtWorkouts, discard, discardQ, startWorkout, restLbl, restOver, addSet, removeSet, lastTime, tryNext, firstTime, comebackW, restEdit, prToast, planHint, newWorkoutBtn, progOverall, progSinceStart, gCutHold, gCutDrop, gBulkUp, gFlat, gDown, historyT, tWarm, tWork, tDrop, tFail, typeLbl, newSet, endEx, endWorkout, gtRecovery, soreQ, sore0–sore4, soreSaved, howSore, hubRecSub, weekHint, broSub, eqWhat, remWork, formZoomHint, formPhoto, repsL, lastSetL, weekHintSimple, wiRate, wiNeed, wiApply, wiApplied. Grep each before deleting.
   - Duplicate key: workoutName at 242 (385 wins). Delete the 242 copy.
   - Dead CSS (grep first):
     - workout.css: .l2 49–53, .createwk 63, .hubtabs 64–65, .aispin2 74, .sslink 81–83
     - layout.css: .hubtabs 73/75
     - base.css: .hubrow 167/170, .eqb 186, .exsum 196, .exgrid 197, .soreface/.soreemo 209–211, .seshead 217–218, .stype 224–226, .restbar/.rbtop 226–229, .dayrow 231–233, .tpex 234–236
   - workout.css:35 restyles .linkbtn for the whole app from the gym file. Delete it (shell owns .linkbtn).
   - AI badge:
     - Replace gymAIB (gym.js:85, sits before the text) with AI.badge() after the text: gym.js:263, 937, 944; wire/04-gym.js:174, 176.
     - Delete the gym-block copy of .aibadge (theme.css:501–503). Shell's rule is the one style.
   - Rules:
     - makeSortable's `typeof haptic` calls → Phone.haptic()
     - gym.js:791 loadFedb uses a raw fetch() → fetchT() with a time limit

7. New requests (added later by Petros). Gym-side parts:
   1. Recovery should also look at the food eaten and say whether it was enough for recovery (protein, calories). Reads today's log with the existing Store helpers; don't change the log files. If a sleep source exists (see shell item 10), include sleep in the recovery result too.
   2. Recovery shows a gradient instead of stages. It must NOT show time since the last workout, only how much more rest the muscle needs.
   3. Rest timer plays a boxing-ring bell. The finished-workout sound is a quieter, softer, satisfying tone. (Sound playing goes through Phone.*; if there is no helper yet, ask shell.)
   4. A gear icon (svgIcon) on every exercise card opens ONE settings sheet. The settings are global: they apply to every exercise in the active workout and any added later (e.g. turn off warm-up sets once and no exercise gets them). Save them through Store. Put these in it:
      - toggle: finishing a set on a one-sided (unilateral) exercise ties both sides together
      - toggle: turn off warm-up, failure and drop-set markers
      - add half reps, negatives and RIR (reps in reserve) to a set
   5. Cardio cards are broken: they show sets and reps. Give them cardio fields instead (time, distance, etc.) and no set/rep controls.
   Strings in English + Greek, Title Case, no emoji, svgIcon() only.


## log


1. The big kcal number on Today, kcalColor() (today.js:481–489), is unreadable in Light:
   - At 75–100 % it blends from white (238, 241, 243) to green, so it fades to near-white.
   - Over target it uses pale hsl yellows and oranges.
   - Fix: build it from theme colours (--t-text → --t-done; over → --t-warm → --t-danger). Shell gives those darker Light values (shell-1, already on main).

2. No emojis or text-glyph icons. Use svgIcon() line icons or drop them. Shell adds info, lock, unlock, trash, star, starOn, play and snow (shell-1, already on main).
   - today.js:
     - 45: 🧊 in the plan list; 47: "✓ Ate"; 48: 💡 tip
     - 77: ⓘ → svgIcon('info')
     - 189: "✓ " chips
     - 211–212: 🕒 ⭐ group labels; 220: 🌐 "Search online"
     - 443, 473: 🔓 / 🔒 padlocks → svgIcon('unlock' / 'lock')
     - 6, 344, 622: '🍽️' and 121, 619: '🌐' icon fallbacks → ''
   - wire/06-launcher-logging-shop.js:5: fInfo_ '🍽️' fallback → ''.
   - supplements.js:
     - 18: ✓ and ✕ → svgIcon('check' / 'x')
     - 27: quick-add q.icon emoji
     - 31: iconOf() emoji in the <option> list
   - wire/02-food.js:329–334: QUICK supplement list emoji column → '' (keep the array shape; suppIcon at :343 already draws the capsule).
   - index.html 125 and 713: ⓘ → info icon.
   - CSS:
     - layout.css:114 content:'🗑' (swipe-to-delete on Today rows) → line trash icon (SVG mask or element)
     - theme.css:568 content:'✓' → line check
   - strings.js (line that wins, EN + GR):
     - logFab 169, addSuppFab 148: drop "＋ " (shell draws a plus icon on the main button)
     - nothingLogged 171: ＋ twice in the text; use words
     - copyYesterday 167 (↺)
     - planNeedTargets 193: "🎯 at the top" → "Targets"
     - dropPlan 194 (✕); fromFridge 354 (🧊); qaTag 352 (⚡); grpOnline2 353 (🌐)

3. Light mode (coloured text on grey):
   - Accent text → var(--t-accent-ink,var(--t-accent)) (shell adds it (shell-1, already on main)):
     - theme.css :327 #dBlocks .gymdayic, :387 .eyest, :414 .lsave
     - theme.css :559 .lqswapbtn (also give it a button shape; now it's just coloured text)
     - layout.css:307 .dym b
   - Amber and blue follow shell's new Light values: theme.css :318 .sttag.ready, :576 .sttag.lq.onl. Swap the hard-coded #9a6a06 at :578 for the var. Check the whole log block (theme.css:519–617) in Light.

4. Title blur:
   - Info bubble showTip (today.js:499–503) is placed at r.bottom + 8 even when the ⓘ sits right under the header, so it lands in (on iPhone, under) the title blur.
     - Keep it below the header's bottom edge, or flip it above the ⓘ.
     - Close it on scroll.
   - Same check for the Log Food unit drop-down .ldd (today.js:157 / 657) near the top.

5. Greek and Title Case:
   - Move text out of JS into strings (log keys, EN + GR): today.js:128–131 (Slice, Piece, Pack, Plate, Ounces, Millilitres, Grams), :249 (All), :293 (Grams), :391 (Rest of day).
   - Greek identical to English: gRecomp 187 "Recomp"; logQT 575 "Quick Log" and logQOnl 583 "online". Give Greek, or confirm with Petros that "Quick Log" stays a name.
   - English-only aria-labels in Today and Log markup: Previous/Next day, Previous/Next month, Daily targets, Lock, More, Less, Same as yesterday, Quick Log, Send, Amount, Time taken, Info. Shell adds data-ta="key" (shell-1, already on main); use it with log keys.
   - Title Case: alsoLog 172, bodyweight 187, dropPlan 194, comboDel 354.

6. Leftovers and unused code:
   - Shell removes the old home page (shell-1, already on main), so these must go now or start-up breaks:
     - wire/02-food.js:10 $('tSupps') listener
     - wire/03-fridge-today.js:287 $('homeAlerts') listener and :289 $('tToday') listener
   - Delete today.js:416 weighAdvice (never called), plus any wi* strings that become unused.
   - AI badge:
     - Replace logAIB (today.js:536) with AI.badge() at today.js:42, 225, 507.
     - Delete the duplicate badge shape in theme.css:520–524. Keep the .lwacts / .lmore tweaks at 525–528. Shell keeps one badge rule, including .aiafter.
   - Unused strings (delete): supNeedTime, allTaken, tagTraining, tagNeeded, noTargets, todayD, yesterdayD, tomorrowD, scanToLog, calcHint, planMyDay (all copies), logThis, elecHint, qaBtn (all copies), qaMore, qaNeed, lastAmt, quickLogged, lwTake, lwTrack, fibSug, fibCutX, extrasT, winElec, addYesterday, usualHour, addAsTakeaway, takeawaySub, checkVals, logQTotal. Grep each first.
   - Duplicate keys (delete the earlier copies): planT 193, qaT 351, qaSub 351, fromFridge 195, advancedT 466, u_caps / u_tabs / u_scoops / u_drops 231.
   - Dead CSS (grep first): layout.css .logacts 61–64; glass.css .qlog 47–48, .qabtn 48; base.css .src-e 299.
   - haptic() → Phone.haptic(): wire/02-food.js:348.


## foods


1. Food-type emoji (🥛 🧀 🍗 …): every type in the table at wire/01-core.js:9–117 has one, and it reaches the screen through iconOf() / subOf().icon.
   - Replace each emoji with '' (keep the array positions).
   - Stop printing it in foods code:
     - food.js:121: the big type emoji on the type button; 122: ❔
     - food.js:482, 518: ref.icon; 623: ref.icon / '🍽️'
     - food.js:490 mealIcon: keep the function (others call it), return ''. Its uses at 500 (.ficon → svgIcon('pot') or nothing) and 513 (title prefix).
     - food.js:379–381: emoji arguments to itemHtml. Keep itemHtml's signature (shop calls it); pass ''.

2. Other emojis and text-glyph icons. Use svgIcon() line icons (shell adds info, lock, unlock, trash, star, starOn, play and snow (shell-1, already on main)) or drop them.
   - food.js:
     - 17: "▶ " on the gym button (ui.js:225 sets the same text; shell draws the icon)
     - 63–64: ⌄ → svgIcon('down')
     - 132: ★ ☆ ✕ pack sizes → svgIcon('starOn' / 'star' / 'x')
     - 367: "▥ " plus an inline style on the JS-made scan button → svgIcon('scan') and a class
     - 397, 483: 📖
     - 626: ✕ → svgIcon('x')
   - index.html 282–284: Add Food options ▥ 📷 ✎ → scan / camera / keyboard line icons.
   - strings.js (line that wins, EN + GR):
     - addFoodFab 497: drop "＋ " (shell draws the plus icon)
     - light 22 (🔦); weighOne, countThem 79 (⚖️ 🔢)
     - needKey 37: (⚙︎) → "Settings"
     - packHint 51: ★ → "the star"
     - noFoods 84 (＋ in the text)
     - noType 86 (❔); addIngredient 94; recipeBadge 107 (📖)
     - searchOnline 110 (🔎); cookAgain 118 (🍳); ownRecipe 139 (📝)
     - pasteRecipe 321 (📋); cWeighLink 457 (⚖️)
     - sgNoTargets 324: 🎯 → "Targets"
   - The ✨ AI marker in your strings: suggestRecipe 90, optPhoto 452, sgGo 323, cookSuggest 594, foodsQrOpt 595, foodsQrGo 596, scanItem 598.
     - Remove ✨ and put class="aiafter" on the element instead: #suggestBtn (index.html:449), #sgGo (745), the <b> in #cookSuggestBtn and #cookQuickBtn (434–435), #foodsQrGo (778), the label span in #optPhoto (283), and the scanItem span (306).
     - Today a raw ✨ shows after a request, because wire/02-food.js:293 and wire/05-nav-cook-gym.js:86 reset the button with textContent. .aiafter survives that.

3. Light mode (coloured text on grey):
   - base.css :51 .chip.ok / .chip.raw / .chip.cooked and :83 .pack.usual .star: accent text → var(--t-accent-ink,var(--t-accent)) (shell adds it (shell-1, already on main)).
   - base.css :111 .ipick.unset and :152 .parsed li.miss are amber (--c). Shell darkens --c in Light (shell-1, already on main); check them in Light.

4. Greek and Title Case:
   - search.js:195: t('logfClear') doesn't exist, so the clear button's aria-label reads "logfClear". Add a foods key (EN + GR) and use it.
   - Greek identical to English: grpOnline 109, barcode 64. Decide, or confirm with Petros that "Barcode" / "Online" stay.
   - Title Case:
     - cookMeal "Cook a Meal" and cookAgainT "Cook Again" (88)
     - noType 86; grams / millilitres 47 → "Grams (g)" / "Millilitres (ml)"
     - scanPhoto 598 → "Scan from a Photo"
     - cookedW, potOther 370; cWeighLink 457; didYouMean 529; searchOnline 110; leftoversIn 214

5. Leftovers and unused code:
   - Shell removes the old home page (shell-1, already on main), so these must go now or start-up breaks:
     - wire/02-food.js:14, 16, 18: $('tScan') / $('tFoods') / $('tMeals') listeners
     - the renderHome() call in renderAll (food.js:16)
     - renderHome (food.js:668–675) and homeTodayTiles (576–590). If check.js says another part still uses renderHome, leave the definition (nothing calls it any more) and say so in result.json.
   - Delete data/foods.js:451 LOC_IC (unused).
   - Unused strings (delete): myFoods, pieceQ, pieceSub, pieceSkipEst, pieceSkipLater, inPack, wholePackU, notInPieces, orFoodOnly, noWeightConfirm, addRecipeLater, cqT, cqPh, cqGo. Grep each first.
   - Duplicate keys (delete the earlier copies): addFoodFab 14 and 442, cookFab 14, optPhoto 17, scanPhoto 22, typeCode 23, noBarcodeLabel 24 and 451, typeIt 24, fibre 49, scanNext 83, mealName 89, inFridgeToo 306, cookSuggest 319, cookOwn 320, sgPh 322, scanItem 498.
   - Dead CSS (grep first): glass.css .searchrow, .scanin, .srow 44–47.
   - food.js:342 (Open Food Facts by barcode) uses a raw fetch() → fetchT() with a time limit.

6. New request (added later by Petros): after a barcode scan, before adding, show the food's name, then its calories AND macros (P / C / F per 100 g) right under the name, before any amount is typed. Today amRes() (food.js:530) only shows them once an amount is entered, so the sheet shows just name + calories. Cover both paths: the amount sheet after a log-scan (openAmt in today.js, log branch owns that file: add one line under amTitle only) and the new-food form after a normal scan (openForm with fromScan).


## shop


1. No emojis or text-glyph icons. Use svgIcon() line icons (shell adds snow, star, trash and others (shell-1, already on main)) or drop them.
   - fridge.js:
     - 11: '📦' icon fallback → ''
     - 47: '📦' + iconOf() in the Add to Fridge title
     - 56: info.icon
     - 133: 🧊 in stockBadge (it shows on My Foods cards)
   - wire/03-fridge-today.js:
     - 53: iconOf() inside the "added to fridge" toast (drop the {i})
     - 114: '❔' / iconOf() arguments to itemHtml → ''
     - 116: ✏️ → svgIcon('plus') or nothing
   - index.html:662: ❄️ before "Frozen" → svgIcon('snow') or nothing.
   - strings.js (line that wins, EN + GR):
     - fridgeFab 338, addFridgeFab 508: drop "＋ " (shell draws the plus icon on the main button)
     - emptyFridge 198 (＋ Add Food in the text); addAsText 222 (＋)
     - shopScan 358 (▥), shopSearch 358 (🔍), chkAllDone 562 (✓)
   - The ✨ AI marker: shopCam 470 ("📷 ✨ Camera"), shopWebLook 556, chkBtn 559, chkRunning 562.
     - Remove ✨. status() (shop.js:229, :289) uses textContent, so these show a raw ✨ today.
     - Put class="aiafter" on #checkFoodsBtn (index.html:85) and on the <b> of the Camera option (index.html:212).

2. Light mode (coloured text on grey):
   - Accent text → var(--t-accent-ink,var(--t-accent)) (shell adds it (shell-1, already on main)): theme.css :448 .stag, :449 .stag.web, :496 .chkvals .chg b.
   - theme.css :631 .sttag.frozen (Light fix at 633), :648 .ffrz.on and :649 .frm follow shell's new Light values for --t-rest and --t-fail. Check the shop block (theme.css:623–650) in Light.

3. Send / Share to Reminders is hidden for good (index.html:175 is a div.hide). Remove the feature:
   - index.html:175 and the Shortcut sheet at 727–735
   - the send / share / shortcut functions in fridge.js (~100–110, incl. openShortcutGuide)
   - wire/03-fridge-today.js:142–148
   - strings sendReminders, sendHintIos, sendHintAndroid and the sc* keys once unused
   - SC_NAME / SC_STEPS in data/foods.js belong to foods: leave them (next round).

4. Shell removes the old home page (shell-1, already on main), so remove these now or start-up breaks: wire/03-fridge-today.js:291 $('tFridge') listener and :293 $('tGroc') listener.

5. Leftovers and unused code:
   - fridge.js:53 openFridgeItem is never called. Delete it.
   - Unused strings (delete): nItems, nItem, optScanF, optPickF, expires, noExpiry, expToday, expTomorrow, expIn, expGone, expWeeks, expDate, ofPack, piecesLeft, useBtn (all copies), notFoodWarn, shopPhoto, shopPhotoSub, shopReceipt, shopReceiptSub, shopAdd, scanNextQ, frozenTip, fixPack. Grep each first; the shopPhoto() function is a different name.
   - Duplicate keys (delete the earlier copies): fridgeFab 197, inFridgeTag 170.
   - Dead CSS (grep first): base.css .gitem 284–290; layout.css .frz 279–280; glass.css .stackbtns, .fmeta, .frow2, .stackn 20–22; theme.css .fixpack 482–483.
   - Title Case: takeOutT 354 → "Take Out: {n}".
   - haptic() → Phone.haptic(): fridge.js:201, 208, 209; shop.js:140.


## shell


1. Light-mode colour tokens. The other four branches use these (shell-1, already on main).
   - Add --t-accent-ink (the accent when it's used as text). Dark = the accent. Light, per preset (THEMES ui.js:46–51, set in applyTheme ui.js:58):
     - Lime #4a6600, Ocean #0a6670, Sunset #a8420f
     - Violet #5a3fd0, Mono #1d1f22, Racing Red #b01f1f
     - Gold #7f5a00, Mint #0a6e4a, Soft Pink #a8285f
     - All are ≥ 4.7:1 on the #e2e3e6 page. Today the Light Lime accent is 1.8:1 as text.
   - Light values (theme.css:47–60, and :430, which sets --t-c again):
     - --t-warm #8a5a00, --t-rest #1f64b0, --t-drop #6a4fd6, --t-fail #b3261e, --t-mid #8a5a00
     - --t-c #8a6100, --t-done #167a43
     - Today warm, rest, drop and fail have no Light value (1.8–2.5:1); carbs and done fail at 3.5–3.6:1.
   - Shell's own accent text → var(--t-accent-ink): base.css:13 h1 span, motion.css:19 .pickopt b.

2. Light-mode surfaces and buttons that don't look like buttons:
   - base.css:281–283 .alert / .alert.red / .alert.green are hard-coded dark boxes (#2a1a08 with #ffcf9e …). Move them to theme vars with a Light version (soft tint, dark text).
   - base.css:140 .toast button is #3d6b00. In Light the toast is near-black, so that's 2.8:1. Use the bright accent in Light (--t-mp-text); keep a dark ink in Dark.
   - theme.css:87 secondary .btn is #e6e7ea with no border, which is invisible on the Light page (#e2e3e6). Light: white fill, 1px rgba(0,0,0,.12) border, --t-shadow.
   - .linkbtn (base.css:36, glass.css:55; gym deletes workout.css:35) is grey 13 px text, used for real actions (Sort, Add Supplement, Paste a Recipe, Undo, Clear Bought, Delete Combo…). Make it one rule that reads as tappable: accent-ink text, medium weight, 15 px, 44 px tap height (or a small pill).
   - layout.css:59 .ibtn (ⓘ): grey glyph → a round chip with svgIcon('info').

3. Add these line icons to ICON in ui.js (same stroke style): info, lock, unlock, trash, star, starOn (filled), play, snow. The other branches use them (shell-1, already on main).

4. Title blur:
   - ui.js:328–329 close() turns body.ovopen off before the 200 ms close animation (.overlay.closing, motion.css:8). So on iPhone every closing sheet slides out under the title blur.
     - Keep ovopen until the animation ends.
     - Add .overlay.closing to the rule at layout.css:207–208.
   - Settings pages .setpage (theme.css:346–350): the h2 and the .sback arrow scroll away under the status bar. Make them a sticky top bar with a solid --t-bg (or the same fade as pages).
   - .aibub: keep one z-index in layout.css, high enough to sit above every window (gym removes the 100000 at workout.css:74).

5. Remove the old home page, launcher and bottom bar. They can never show: route() sends home/start to #foods, and the bar is always hidden. The other branches remove their code for them (shell-1, already on main), so **merge this branch last**.
   - index.html:
     - 38–71 (#pgLaunch, #pgHome)
     - 191 (#tabbar)
     - the hidden ⚙︎ Settings button in every header: 43, 57, 79, 105, 113, 137, 164 (only the data-settings button), plus layout.css:71
   - ui.js:155–176 renderLaunch / launchTo, and their calls at ui.js:281, 290 and wire/08-settings-boot.js:64.
   - The pgLaunch / tabbar parts of route() (ui.js:205, 208).
   - wire/05-nav-cook-gym.js:106 (tabbar listener), wire/06-launcher-logging-shop.js:140 (bubbles), wire/02-food.js:27 (data-settings listener).
   - Their strings: launchSub, hiMorning, hiDay, hiEvening, lFoodSub, lTodaySub, lTodayNo, lGymDone, lGymPlan, lGymRest, lGymNone, homeHello, home-tile subs. Grep first: tToday is also the Today title.
   - Their CSS: .bubble(s), .b-food / .b-today / .b-gym, .tabbar. Keep .tile, which the Gym hub uses.

6. Emojis in shell parts:
   - index.html 273–274 and ui.js:242: 🇬🇧 🇬🇷 flags
   - ui.js:252: ✅
   - ui.js:308: ⌄ → svgIcon('down')
   - ui.js:314: ✓ → svgIcon('check')
   - Main button (route(), ui.js:220–225): the other branches drop "＋ " from their button strings (shell-1, already on main).
     - Draw svgIcon('plus') before the text for add actions, including "＋ " + createWorkout (ui.js:224).
     - Draw svgIcon('play') for Start Workout (ui.js:225).
     - Nothing for Resume (gym drops the ●).
   - data/config.js:73–74: 🔑 and ✓ in the AI key guide (EN + GR).
   - strings (line that wins, EN + GR):
     - getKey 124 (🔑); testKey, keyOk 227 (✓); keyFail 228 (✗); cancelRec 450 (✕)
     - bkT 369 (💾); suWelcome 342 (👋); suAgain 349 (↺)
     - suDoneSub 348: "🎯 in Today" → "Targets in Today"

7. Strings:
   - The Title Case pass at strings.js:425 runs before 14 later Object.assign blocks, so later values skip it. Move the whole pass to the very end of strings.js, and fix geminiKey 453.
   - Add data-ta="key" support to applyLang (ui.js:113–116) to translate aria-labels. Today Settings, Back, Close, Clear … are English in Greek. Use it in shell markup.
   - Duplicate keys (delete the earlier copies): homeHello 6, geminiKey 123, tryingModel and cancelRec 135, tabFood 313.
   - Unused strings (delete): settingsSub, yourData, comingSoon, backArrow, stCustomSub, stBodySub, stAISub, stDataSub, stAboutSub, aiSlow.

8. Old styles layered on top of new ones. Keep one rule each in theme.css and delete the older copies:
   - .btn: base:87, glass:16, layout:164 (theme:87 wins)
   - .btn.primary: base:88, glass:17, layout:165 (glass:17 and layout:165 are the same rule twice)
   - .fab (9 places); .fab2 layout:214 / theme:331 / theme:433
   - .sheet ×7; .overlay ×5; input / select / textarea ×6; body ×8; html ×6
   - :root ×16. base.css:1–4 still sets the old palette and base.css:7 the system font, all overridden.
   - .toast: base:138, motion:14, layout:321, layout:197
   - glass.css:9 and layout.css:75 put backdrop-filter on cards (.tile, .macrocard, .bubble, .remind, .minirec, .foldh, .hubtabs) only for theme.css:75 to cancel it. Delete both and the cancel.
   - AI badge: make theme.css:654–658 the one badge style, including .aiafter::after{content:'AI'} and the Light colours. Gym and log delete their copies at 501–503 and 520–524.
   - Dead CSS (grep first): base.css .bignum 130, .sheethead 146–147; glass.css .slideL / .slideR 18–19; layout.css .ghostbtn 82; theme.css .onacc 657.

9. Rules:
   - index.html:16 reads localStorage directly for the pre-paint theme. Write it into CORE.md as the one exception, or read it through a tiny Store helper.
   - ui.js:325 `haptic` is an alias over Phone.haptic(). Switch shell's own calls (ui.js:363, ai.js:121, 148) to Phone.haptic(). The other branches switch theirs (shell-1, already on main); delete the alias next round.
   - wire/09-tabs-targets-recovery.js:4 TAB_LBL is unused. Delete it.

10. New request (added later by Petros): sleep from a smartwatch or band, used by recovery (gym item 7.1). This is a web app, so it cannot read a watch directly. Check what is possible in platform/* (e.g. a manual sleep entry, or import) and report what is realistic; do not promise a live watch link. Also: if gym finds no sound helper for the boxing bell and soft finish tone, add one in platform/*.

