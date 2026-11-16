# Athlete OS — prompts to paste

Merge this plan's pull request first. One chat per branch, in order; merge each before the next. **Opus** for all of them. Food-Tracker selected. In the first chat also paste the two long specs Petros wrote (Master Intelligence System and Provider-agnostic Infrastructure), and the pasted Grok Food Coach code.

## athlete-1 (Opus): audit and provider layer
```
Branch athlete-1. Read docs/notes/athlete-os-brief.md (the picks in section 3 are decided) and docs/notes/ai-coach-brief.md, following CLAUDE.md. Do step 1 of section 4: write docs/notes/athlete-os-audit.md, then build the provider layer, telemetry and Settings › AI › Usage. Do not change how anything looks or works for the user. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push. List in the pull request what was done, skipped and tested.
```

## athlete-2 (Opus): Brain store, events, context builder
```
Branch athlete-2. Read docs/notes/athlete-os-brief.md and docs/notes/athlete-os-audit.md, following CLAUDE.md. Do step 2 of section 4. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-3 (Opus): Food Coach
```
Branch athlete-3. Read docs/notes/athlete-os-brief.md (section 2 lists what to adopt from the Grok Food Coach code and what not to copy), following CLAUDE.md. Do step 3 of section 4. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-4 (Opus): Gym Coach
```
Branch athlete-4. Read docs/notes/athlete-os-brief.md and docs/notes/ai-coach-brief.md, following CLAUDE.md. Do step 4 of section 4 (research first, record sources in docs/notes/ai-coach-evidence.md). Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-5 (Opus): Supervisor and Fridge AI
```
Branch athlete-5. Read docs/notes/athlete-os-brief.md, following CLAUDE.md. Do step 5 of section 4. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```

## athlete-6 (Opus): quality and release
```
Branch athlete-6. Read docs/notes/athlete-os-brief.md, following CLAUDE.md. Do step 6 of section 4, including the VERSION and CACHE bump. Commit and push after each part. Run node tools/check.js --boot before every push, open a pull request after the first push.
```
