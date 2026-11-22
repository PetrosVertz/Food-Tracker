# Decisions (only the hard-to-reverse ones)

**D1 · No build step, no framework, no IndexedDB (2026-11-22).** Classic scripts + localStorage stay. Evidence: a 2-year power-user profile is 1.2 MB (localStorage limit ~5 MB); saves take <10 ms; start-up ~375 ms. A bundler/ESM move would touch all 47 scripts for no measured gain today. Revisit when data nears ~3 MB or a native build needs modules.

**D2 · Import is planned on copies and saved all-or-nothing (2026-11-22).** `Backup.plan` (pure) + `Store.saveMany` (journal + roll-back). Rejected: a full staged "import preview" screen — more UI/strings than the risk needs, since import only adds/fills and never deletes. A preview can be added on top of `Backup.plan` (it already returns counts and `changed`).

**D3 · Live workout in backups (2026-11-22).** Exported as `gym.active`. Restored only if this phone has no live workout and it was not finished since; then the existing "left open" rule (`checkAbandoned`) decides. A live workout on the phone is never replaced. *Petros may prefer "never restore a live workout" — one line in `Backup.plan`.*

**D4 · Service worker takes over at once, never reloads a page (2026-11-22).** Kept `skipWaiting` + `clients.claim` (network-first, no `controllerchange` reload), so a workout in progress is not interrupted; the new version runs at the next start. Caching limited to `SHELL` files with 200 answers.

**D5 · Two tabs: not solved yet — decision needed.** Two open copies of the app can overwrite each other's newest changes (localStorage has no compare-and-swap). Options: (a) warn and offer reload when another tab saves (`storage` event; small, needs 1 string), (b) single-tab lock, (c) leave as is (a phone PWA is usually one window). Recommendation: (a).

**D6 · AI deadline values (2026-11-22).** 60 s for normal requests, 120 s for receipts / web look-ups, each try limited to the time left. Before: up to ~5–7 minutes. Change in `deadlineFor` (ai-provider.js) if real use shows receipts need longer.

**D7 · Athlete OS events come from Store, not from feature files (2026-11-22).** `Store.save` already diffs every synced record for the sync table; `Store.onChange` hands that diff to `AthleteEvents`, which maps Store names to event types. So gym.js / today.js emit nothing and cannot forget to. Rejected: `emit()` calls in every save path (≈40 call sites across four branches' files, easy to miss one). Cost: the event says *what record* changed, not *why* (a deleted diary entry and a moved one look alike); enough for cache invalidation and context.

**D8 · Coach memory is the user's own words only, on this phone (2026-11-22).** Notes come from fixed sentence rules over the user's typed chat message (EN + GR), never from an AI answer, so an AI guess cannot become a "fact". Device-only (`athleteMem`, like `aiKnow`); not in backups or sync; Settings › AI › Copy as Text exports it. *Petros may want it in backups (then it needs an import rule and store-test cases) and may want a confirm card before a note is kept (today: kept at once, with Undo in the toast).*

**D9 · Context goes through the existing `AI.knows()` door (2026-11-22).** Every prompt that already called `AI.knows(topic)` gets the Athlete OS block with no prompt rewrite; coach personalities and JSON shapes are untouched. The block replaces the old daily-summary text (which is still inside it, as its lowest-priority part) and has a hard letter budget per specialist (900–1500 letters ≈ 225–375 tokens; the old block could reach ~1700).
