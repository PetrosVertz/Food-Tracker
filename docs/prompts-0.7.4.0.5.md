# Round 0.7.4.0.5 — prompts to paste

Start every chat as a **new Claude Code session with the Food-Tracker repo selected**. Paste one prompt per chat.

## Order
1. **Merge the setup pull request** (guide file, check tool, fix list). Everything below needs it.
2. **shell-1** → merge its pull request.
3. **gym, log, foods, shop** → all four can run at the same time. Merge each pull request when it's ready.
   - If GitHub says a pull request "has conflicts", go back to that chat and paste: `main changed — rebase on main, fix the conflicts, run the check and push again.`
4. **shell-2** last → merge.

Before step 3, decide the Greek-word questions at the bottom, and change the gym / log / foods prompts if you want something else.

---

## shell-1
```
Branch shell-1-0.7.4.0.5. From the ## shell section of docs/fixes-0.7.4.0.5.md, do ONLY: items 1, 2 and 3; from item 7 only the data-ta support in applyLang; from item 8 only the AI badge line (make theme.css:654–658 the one badge style, incl. .aiafter). The other branches build on these, so don't remove anything yet. Follow CLAUDE.md, run node tools/check.js --boot, push and open a pull request.
```

## gym
```
Branch gym-0.7.4.0.5. Do the ## gym section of docs/fixes-0.7.4.0.5.md, following CLAUDE.md. Greek: translate the gym words (Drop, Push, Pull, Cardio, Bro split). Run node tools/check.js --boot, push and open a pull request.
```

## log
```
Branch log-0.7.4.0.5. Do the ## log section of docs/fixes-0.7.4.0.5.md, following CLAUDE.md. Greek: keep "Quick Log" as a name in English, translate "Recomp" and "online". Run node tools/check.js --boot, push and open a pull request.
```

## foods
```
Branch foods-0.7.4.0.5. Do the ## foods section of docs/fixes-0.7.4.0.5.md, following CLAUDE.md. Greek: keep "Barcode" and "Online" as they are. Run node tools/check.js --boot, push and open a pull request.
```

## shop
```
Branch shop-0.7.4.0.5. Do the ## shop section of docs/fixes-0.7.4.0.5.md, following CLAUDE.md. Run node tools/check.js --boot, push and open a pull request.
```

## shell-2 (last, after the other four are merged)
```
Branch shell-2-0.7.4.0.5. Do the rest of the ## shell section of docs/fixes-0.7.4.0.5.md: everything shell-1 didn't do (see its merged pull request). The other branches are merged, so removing the old home page is safe now. Following CLAUDE.md, also bump VERSION to 0.7.4.0.5 and CACHE to match. Run node tools/check.js --boot, push and open a pull request.
```

---

## Decide before step 3
- Gym words (Drop, Push, Pull, Cardio, Bro split): Greek or keep English? *Prompt says: Greek.*
- "Quick Log", "Recomp", "online": *Prompt says: Quick Log stays English, the others Greek.*
- "Barcode", "Online" on Foods: *Prompt says: keep as is.*
