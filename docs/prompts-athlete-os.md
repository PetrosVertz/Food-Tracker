# Athlete OS — prompts to paste

Merge this plan's pull request first. One chat per branch, in order; merge each before the next. **Opus** for all of them. Food-Tracker selected.

**Order: athlete-1 (done), athlete-3, athlete-4, athlete-2, athlete-5, athlete-6.** The small coach upgrades come before the Brain. Paste the Grok Food Coach code into the athlete-3 chat. If Petros finds the Provider-agnostic Infrastructure spec (Spec B), paste it into the athlete-2 chat.

## athlete-1 (Opus): audit and provider layer. DONE, pull request #84
```
Branch athlete-1. Read docs/notes/athlete-os-brief.md (the picks in section 3 are decided) and docs/notes/ai-coach-brief.md, following CLAUDE.md. Do step 1 of section 4: write docs/notes/athlete-os-audit.md, then build the provider layer, telemetry and Settings › AI › Usage. Do not change how anything looks or works for the user. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push. List in the pull request what was done, skipped and tested.
```

## athlete-3 (Opus): Food Coach
```
Branch athlete-3. Read docs/notes/athlete-os-brief.md (section 2 lists what to adopt from the Grok Food Coach code and what not to copy), following CLAUDE.md. Do the athlete-3 step of section 4 (no Brain yet: keep corrections on the phone through Store). Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-4 (Opus): Gym Coach
```
Branch athlete-4. Read docs/notes/athlete-os-brief.md and docs/notes/ai-coach-brief.md, following CLAUDE.md. Do the athlete-4 step of section 4 (no Brain yet; research first, record sources in docs/notes/ai-coach-evidence.md). Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-2 (Opus): Brain store, events, context builder
```
Branch athlete-2. Read docs/notes/athlete-os-brief.md and docs/notes/athlete-os-audit.md, following CLAUDE.md. Do the athlete-2 step of section 4, including the decision ledger and the food and gym events from athlete-3 and athlete-4. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-5 (Opus): Supervisor and Fridge AI
```
Branch athlete-5. Read docs/notes/athlete-os-brief.md, following CLAUDE.md. Do step 5 of section 4. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-6 (Opus): quality and release
```
Branch athlete-6. Read docs/notes/athlete-os-brief.md, following CLAUDE.md. Do step 6 of section 4, including the VERSION and CACHE bump. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```
