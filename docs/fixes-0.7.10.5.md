# Fix lists — 0.7.10.5 (no back arrow in the live workout)

Follow CLAUDE.md. One small branch, Sonnet. Run after gym-0.7.10.4 is merged (same files). Bumps VERSION to 0.7.10.5 and CACHE to match.

## gym (Sonnet)
1. **Remove the back arrow from the live workout's main screen** (`#sesMin`, the `.sesback` button in the `seshead3` header of `#ovSession` in index.html, its wiring in gym.js / wire/04-gym.js, and CSS that only it used; grep first). The only ways to leave the live workout screen are now **End Workout** and **Discard** (the two buttons at the bottom). Keep the timer, rest hourglass and the Gym Coach robot in the header, centred and balanced now that the left button is gone (same top alignment as other windows, no empty gap on the left; the title or timer stays centred on the screen).
   - Leave every **other** window opened from the live workout exactly as it is, with its own back arrow: Exercise Settings, Pick Exercise, Swap, Form demo, Gym Coach chat, Rest timer and so on.
   - The phone's own Back gesture or button (`goBack` in ui.js) is not changed by this item; it still behaves as today. Say in the pull request what it does today in the live workout (minimises it, or asks first), so Petros can decide whether it should ask "End or Discard?" instead.
   - Check nothing else points at the removed button (a "resume workout" bar, hints, tutorial text, strings) and that after End Workout and after Discard the screen closes as before.
2. Check with screenshots at 390 px wide, Dark and Light: the header looks balanced, the robot and timer are not squeezed, and a workout can still be ended and discarded.
3. Bump VERSION to 0.7.10.5 and CACHE to match.
