# Fix lists — 0.7.10.6 (ranks can be switched off)

Follow CLAUDE.md. One small branch, Sonnet. Independent of the new ranking engine (it only adds the switch). Bumps VERSION to 0.7.10.6 and CACHE to match.

## ranks-switch (Sonnet)
1. **A "Ranks" switch in Settings**, in the gym area where the other gym switches live (grep `exsHalf`, the Exercise Settings rows and the Settings page to find the best place; if the Settings page has a Gym or Workout section, put it there). Title **Ranks**, on by default, saved with the other settings through `Store`. Under it, a small grey description line (the same style as the other switch descriptions):
   *"Ranks do not represent real-world lifting ability. They are there to give you a more fun experience while lifting and hitting goals."*
   English and Greek in strings.js, Title Case for the title.
2. **When Ranks is off, nothing rank-related shows anywhere**: the rank badge on exercise cards (and the room it takes, so the title keeps its full width), the next-rank bar bubble, the rank plates in the Social Hub rows and the Highest Rank card (hide the card, or show nothing where it was, without an empty gap), the leaderboards' rank icons (the lifts and kg stay), the Customize picker, the stats that talk about ranks (`nextRank`, rank climbs, and any other: grep `tierFor`, `rankIcon`, `tierBadge`), the Rank Up and Rank Changed windows, and rank text in Gym Coach and Food Coach knowledge (`know.js`, `AI.knows`): the AI must not mention ranks while it is off. The data is still kept, so turning Ranks back on shows everything again, and rank-up animations for changes that happened while it was off are not replayed.
3. **A short version of the same description** under the rank bubble title (the tap-the-rank bubble) is optional: add it only if it fits without crowding the bar.
4. Check with screenshots at 390 px wide, Dark and Light, with Ranks on and off: exercise card, Social Hub, leaderboards, Settings row; and that switching it live updates open screens without a reload. Add a fixture to `tools/check.js` that no rank markup is produced when the switch is off.
5. Bump VERSION to 0.7.10.6 and CACHE to match.
