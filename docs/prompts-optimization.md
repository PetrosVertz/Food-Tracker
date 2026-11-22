# Optimization — chats and prompts to paste (future round, not started)

Brief: `docs/notes/optimization-brief.md` (Petros's master prompt, saved word for word). Start this round only after the Refinements chats are merged, so the audit sees the finished code.

How to use: one chat at a time, Food-Tracker selected, name the chat as shown, choose the model shown, paste the prompt, merge its pull request before the next chat.

| # | Chat | Model | What it does | Check after merging |
|---|---|---|---|---|
| 1 | Optimization #1 | Opus | Audit and plan only (stages 1–4). Writes `docs/notes/optimization-audit.md`. Changes no app code. | The audit file exists, has the architecture map, the four-part plan and a list of what needs Petros's yes. |
| 2 | Optimization #2 | Sonnet | Safe low-risk items from the audit's "immediate" list, plus the compact CLAUDE.md update (stages 5–7). | App looks and works the same. `node tools/check.js --boot` passes. CLAUDE.md is still short. |
| 3+ | Later chats | Opus plans, Sonnet builds | Whatever the audit says needs approval (storage, Capacitor prep, cloud/wearable groundwork). Written after Petros reads the audit. | — |

Why this split: the audit decides everything that follows and touches storage, AI and ranking, so it gets Opus. The small fixes it finds are routine, so Sonnet.

## Prompts

### Optimization #1
```
Chat name: Optimization #1
Follow CLAUDE.md first. Read docs/notes/optimization-brief.md fully (the reading notes at the top too), then docs/notes/athlete-os-audit.md so you don't redo the AI audit.
Do stages 1 to 4 of section 21 only: audit, proposed structure, Claude Code / token review (check each of the six tools against its real page; install nothing), and the prioritized plan in the four groups. Include the Capacitor readiness checklist and the cloud/wearable roadmap (deliverables 6 and 7).
Write it all to docs/notes/optimization-audit.md, concise. Change no app code. End the file with a list of what needs Petros's yes, and a draft prompt table for the next chats with Sonnet or Opus for each.
Run node tools/check.js --boot before pushing. Open a pull request titled "Optimization #1" and explain the findings in plain words.
```

### Optimization #2
```
Chat name: Optimization #2
Follow CLAUDE.md first. Read docs/notes/optimization-audit.md.
Build only the "immediate low-risk" items Petros approved in that file, one commit each. Then update CLAUDE.md with the task-routing and model rules from the brief (sections 6, 7, 20), keeping it short; put longer detail in a scoped doc, not CLAUDE.md.
Do not change how anything looks or works for the user. Do not bump VERSION or CACHE.
Run node tools/check.js --boot before every push. Open a pull request titled "Optimization #2" listing what was done, skipped and why, and how to test it on the phone.
```
