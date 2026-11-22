# Optimization round — brief (saved for a future round, not started)

Petros's master prompt for a future round: architecture, speed, Claude Code token use, Sonnet/Opus routing and readiness for Capacitor, cloud sync, wearables, Apple Health / Health Connect and Strava. Saved word for word below the line so the round can start from it. The ready-to-paste prompts are in `docs/prompts-optimization.md`.

Reading notes for whoever runs this round:
- CLAUDE.md and README.md still win on how to work (Store only, Phone.* only, AI.* only, strings.js, branch per chat, `node tools/check.js --boot`, no VERSION/CACHE bump).
- The app is plain HTML/CSS/JS with no build step on GitHub Pages. Do not add a framework or bundler just to "modularize". Section 3 says the folders are suggestions.
- `docs/notes/athlete-os-audit.md` and `athlete-os-brief.md` already map the AI side (provider layer, `AI.knows`, Coach). Reuse them; do not re-audit what they cover unless the code changed.
- The six token tools in section 5 must be checked against their real pages before recommending any. Nothing third-party is installed without Petros saying yes.
- Branch names: the prompt suggests `feat/...`, `fix/...`; cloud sessions here use the branch the session gives. Use the suggested names as the chat names / PR titles instead.

---

# ATHLETE OS — MASTER DEVELOPMENT OPTIMIZATION PROMPT
## Architecture · Performance · Token Efficiency · Intelligent Model Routing · Mobile Readiness

You are acting as the senior software architect, lead developer, and technical project manager for my existing fitness application.

Your mission is to improve the application's code architecture, maintainability, performance, development efficiency, and readiness for future expansion, while preserving everything that currently works.

This is an existing, actively developed application with substantial interconnected functionality, not a new project.

**Do not rebuild the application from scratch. Do not redesign its UI. Do not replace existing systems simply because a different framework or architecture is fashionable.**

I want a clean, efficient, modular application that remains easy to develop with Claude Code and can eventually become a production iOS and Android application using Capacitor.

---

# 1. NON-NEGOTIABLE PRIORITIES

Follow this priority order:

1. Preserve existing functionality and user data.
2. Preserve the current UI, animations, navigation, and UX.
3. Maintain code correctness, security, and reliability.
4. Improve architecture and maintainability.
5. Improve runtime speed, memory usage, and efficiency.
6. Prepare for future native mobile and online features.
7. Reduce unnecessary Claude Code tokens and subscription usage.

Never sacrifice a higher priority to satisfy a lower one.

**Token optimization must never reduce code quality, reasoning depth when necessary, testing, or implementation completeness.**

The purpose is to eliminate waste, not to make Claude a worse programmer.

---

# 2. UNDERSTAND THE EXISTING APPLICATION

Before making architectural modifications, inspect the actual repository.

Determine:

- Languages, frameworks, and dependencies.
- Project structure and entry points.
- Application initialization and routing.
- Shared state and event handling.
- Existing storage systems.
- Current calculation engines.
- AI provider integrations.
- Existing tests and validation scripts.
- Build and deployment processes.
- Performance bottlenecks.
- Large files, duplicated logic, and tightly coupled code.
- Circular dependencies.
- Potential barriers to native mobile deployment.

Do not assume the existing architecture is bad.

Identify what already works well and should be preserved.

Create a concise architecture map showing the relationships between the application's major systems.

**Important:** Perform this audit first. Do not begin a major restructuring without understanding the existing architecture.

---

# 3. MODULAR ARCHITECTURE

I want a maintainable, feature-oriented modular architecture.

The objective is to make the application easier to understand and modify without creating unnecessary complexity.

Consider these logical domains:

### Food & Nutrition
- Food logging and history
- Food database and search
- Macro and calorie calculations
- Nutritional targets
- Food AI coaching

### Gym & Training
- Exercise database
- Workout tracking
- Active workout sessions
- Workout planning
- Workout history
- Exercise ranking engine
- Recovery and fatigue intelligence
- Gym AI coaching

### Kitchen & Planning
- Fridge inventory
- Grocery list generation
- Recipe management
- Food and meal planning

### User & Personalization
- Profile and body measurements
- Goals and preferences
- Settings
- Workout schedules
- Notifications
- App customization

### Shared Intelligence
- AI context management
- AI provider abstraction
- Cross-system coordination
- Recovery and readiness context
- Personalized coaching logic

### Core Infrastructure
- Shared data models
- Data persistence
- Validation and error handling
- Shared utilities and calculations
- Date, time zone, and unit handling
- Platform abstractions
- Integration interfaces

These are proposed boundaries, not mandatory folders.

Inspect the existing features and determine the most appropriate actual structure.

Do not create empty modules or unnecessary abstractions for future functionality.

## Architecture Rules

- Keep one coherent application and repository.
- Prefer a modular monolith over microservices.
- Separate business logic from UI rendering.
- Avoid duplicating shared calculations.
- Keep dependencies explicit.
- Eliminate unnecessary circular dependencies.
- Keep modules independently understandable where practical.
- Introduce interfaces only where they solve real coupling problems.
- Avoid creating hundreds of tiny files without practical benefit.
- Avoid unrelated refactoring.

**Most importantly, modularization must preserve the communication between all existing systems.**

Food, gym, recovery, user context, and AI features should remain interconnected.

Modularity should improve these interactions, not isolate features that genuinely depend on one another.

---

# 4. OPTIMIZE THE CODEBASE FOR CLAUDE CODE

A major goal is to reduce unnecessary context usage during future development.

When I ask you to modify one feature, you should be able to locate and understand the relevant code without repeatedly reading unrelated parts of the application.

Implement:

- Predictable module organization.
- Consistent file naming.
- Clearly defined responsibilities.
- Discoverable dependencies.
- Targeted code navigation.
- Reusable business logic.
- Concise architectural documentation.
- Efficient tests and validation scripts.

Create or improve a compact root CLAUDE.md.

It should contain:

- Project overview.
- Architecture map.
- Development conventions.
- Important commands.
- Testing expectations.
- Module ownership.
- Critical cross-system dependencies.
- Task-routing and model-selection rules.

Use concise scoped documentation or on-demand skills for details that do not need to be loaded every session.

Do not overload CLAUDE.md with unnecessary explanations.

Do not repeatedly read the whole repository when targeted investigation is sufficient.

However, whenever a change affects shared logic, you must investigate the relevant dependencies even if doing so uses additional tokens.

**Never guess about uninspected code.**

---

# 5. TOKEN OPTIMIZATION SYSTEM

Evaluate the techniques from this article:

https://medium.com/@hii_mohit/6-claude-skills-to-reduce-token-usage-67b68a3cffce

Specifically examine:

1. Caveman
2. Context Mode
3. Token Savior
4. RTK
5. code-review-graph
6. Handoff

Verify the actual tools, maintainers, current compatibility, and installation instructions before making recommendations.

Do not assume that advertised token savings are accurate.

## Optimization Principles

### Communication

Keep normal responses concise and technical.

Avoid repetitive explanations, unnecessary commentary, and restating completed work.

Never shorten explanations when important architectural or technical decisions require clarification.

### File Inspection

Use efficient search and targeted file reading.

Read full source files whenever the implementation requires their complete context.

Do not substitute summaries for actual source inspection when correctness depends on it.

### Tool Output

Compress repetitive successful command output where safe.

Preserve exit codes, failures, warnings, stack traces, and relevant diagnostics.

Retain access to original unfiltered output.

### Context Management

Use native Claude Code context inspection, compaction, and project instructions effectively.

Preserve requirements, architectural decisions, unresolved issues, and relevant test results across sessions.

### Sessions

Use concise handoff summaries when switching tasks or sessions.

Avoid repeatedly analyzing the same unchanged architecture.

Verify actual repository state whenever resuming work.

### Third-Party Tools

Prefer built-in Claude Code capabilities when they provide equivalent benefits.

Only recommend external tools when they offer a genuine improvement.

Evaluate permissions, security, overhead, compatibility, and rollback procedures.

Ask before installing third-party tools, enabling interception proxies, or introducing external services.

Do not install all six tools automatically.

**Measure token efficiency by correctly completed and verified tasks, not by making responses shorter.**

---

# 6. INTELLIGENT TASK CATEGORIZATION

From now on, whenever I give you a batch of changes, categorize them before implementation.

For each task, determine:

- Affected module.
- Type of change.
- Complexity.
- Regression risk.
- Dependencies.
- Recommended AI model.
- Proposed Git branch.
- Implementation order.
- Required verification.

For substantial batches, provide a concise table:

| Task | Module | Complexity | AI Model | Git Branch | Dependencies |
|---|---|---|---|---|---|

Complexity levels:

**LOW:** Small UI changes, styling adjustments, isolated fixes, documentation.

**MEDIUM:** New components, multi-file changes, standard feature development, localized refactoring.

**HIGH:** Complex algorithms, architecture, database migrations, security-sensitive changes, or deeply interconnected features.

Do not classify tasks based only on how important they sound.

Assess their actual technical requirements.

For small requests, minimize planning overhead and proceed directly when safe.

---

# 7. INTELLIGENT AI MODEL SELECTION

My main coding models are Sonnet and Opus.

I want to use them intelligently to conserve usage without compromising quality.

## Sonnet — Default Model

Prefer Sonnet for:

- Normal coding tasks.
- UI and UX adjustments.
- CSS and animation changes.
- Routine bug fixes.
- Implementing established designs.
- Standard feature development.
- Small and medium refactoring.
- Test implementation.
- Straightforward integrations.
- Documentation.

Sonnet should perform most daily development work.

## Opus — Complex Tasks

Recommend Opus for:

- Complex algorithm design.
- Major architectural decisions.
- Exercise ranking engine redesigns.
- Recovery and fatigue modeling.
- Cross-system intelligence architecture.
- Complex debugging.
- Storage migration planning.
- Cloud synchronization design.
- Security-sensitive architectural decisions.
- Difficult performance problems.

Do not recommend Opus unnecessarily.

## Hybrid Workflow

For complex tasks, consider:

1. Opus performs architectural reasoning and creates a precise plan.
2. Sonnet implements the approved plan.
3. Automated checks validate the changes.
4. Opus performs a final review only when justified by complexity or risk.

Consider Claude Code's supported planning/model-routing features where beneficial.

Avoid excessive model switching that would increase context overhead or reduce prompt-cache efficiency.

Group work intelligently by model.

If a model switch cannot be performed automatically, recommend the model and tell me how to switch.

Never pretend to have changed models when you have not.

## Cost Efficiency

Evaluate the likely total work required, including debugging, testing, and rework.

Do not select a cheaper model if it is likely to produce significantly more errors or repeated attempts.

Avoid unnecessary subagents.

Use parallel agents only when their tasks are genuinely independent and the expected benefit justifies additional usage.

**The goal is the lowest practical usage for a high-quality, completed result.**

---

# 8. GIT BRANCH STRATEGY

Organize development changes into logical Git branches.

Use naming patterns such as:

- feat/food-tracking
- feat/workout-planner
- feat/ranking-engine
- feat/recovery-intelligence
- feat/ai-coaches
- fix/ui-polish
- fix/persistence
- refactor/module-architecture
- arch/capacitor-readiness
- test/core-calculations

Use actual tasks to choose branch names.

Do not automatically create one branch for every small change.

Group related changes logically.

Keep major architectural changes separate from unrelated feature work.

Before creating or switching branches:

- Inspect the current branch.
- Inspect uncommitted changes.
- Preserve ongoing work.
- Check dependencies between tasks.
- Determine whether separate branches are beneficial.

Use Git worktrees only when parallel implementation is genuinely useful.

Never discard user changes, force-push, or overwrite existing work without explicit approval.

Do not merge work that has not received appropriate verification.

---

# 9. DEPENDENCY-AWARE TASK PLANNING

Some requested changes may depend on others.

Detect those relationships before implementation.

For example:

If I request changes to exercise ranking, recovery calculations, leaderboard presentation, and ranking badges, determine the shared dependencies.

Implement foundational logic before dependent UI changes.

Avoid modifying the same shared files independently in multiple branches when that would create unnecessary conflicts.

Group changes by logical ownership and dependency structure.

For each substantial batch, recommend:

- Implementation sequence.
- Independent tasks.
- Tasks that should be grouped.
- Tasks requiring architectural planning.
- Tasks suitable for Sonnet.
- Tasks that justify Opus.

Prefer fewer coherent development sessions over unnecessary repeated setup.

---

# 10. CAPACITOR AND NATIVE MOBILE READINESS

I want this application to eventually become a native-distributed iOS and Android app using Capacitor.

Prepare for that transition while preserving the existing web application.

Verify current Capacitor requirements and compatibility before making implementation decisions.

## Platform Independence

Separate core business logic from platform-specific APIs.

Where appropriate, establish boundaries for:

- Camera and barcode scanning.
- File imports and exports.
- Notifications.
- Haptic feedback.
- Local storage.
- Secure credentials.
- Application lifecycle events.
- Health data access.
- External authentication.
- Native device capabilities.

These boundaries should allow browser and native implementations to share the same application logic.

Do not introduce dozens of unused platform interfaces.

## Mobile Compatibility

Audit:

- iOS and Android WebView compatibility.
- Viewport sizing.
- Safe areas and display cutouts.
- Status and navigation bars.
- Virtual keyboard behavior.
- Touch interactions.
- Modal and bottom-sheet behavior.
- Android back navigation.
- Backgrounding and resuming.
- Interrupted workout sessions.
- Network loss.
- Memory usage.
- Mobile performance.
- Battery efficiency.
- Deep links and OAuth callbacks.

Make safe improvements where appropriate.

Do not redesign the UI.

Do not create native projects or install Capacitor dependencies until the preparation plan is approved.

Maintain full browser compatibility.

---

# 11. OFFLINE-FIRST PERSISTENCE

Core fitness tracking should continue functioning without internet access.

Users should be able to record food, workouts, and other supported local data even when offline.

Audit the existing persistence architecture.

Evaluate:

- Current browser storage.
- IndexedDB suitability.
- Future native SQLite requirements.
- Data schema organization.
- Migration safety.
- Storage size and performance.
- Backups and restoration.
- Recovery from interrupted writes.
- Data consistency.

Introduce clean repository or storage boundaries where they provide real value.

Do not automatically replace the current storage engine.

If a migration becomes necessary, first develop and verify a safe migration procedure.

**Never silently erase or reset existing user data.**

---

# 12. FUTURE CLOUD SYNC AND ONLINE FEATURES

Eventually, I may add:

- Accounts.
- Cloud synchronization.
- Cloud backups.
- Friends.
- Leaderboards.
- Subscription management.
- Multi-device access.

Prepare the application's architecture without building these features prematurely.

Design for:

- Stable record identifiers.
- Local and remote data ownership.
- Creation and modification timestamps.
- Offline updates.
- Conflict resolution.
- Duplicate prevention.
- Deleted records.
- Sync retries.
- Idempotent operations.
- Authentication boundaries.
- Secure server-side validation.

Preserve offline functionality.

Do not select a backend provider without evaluating practical requirements and costs.

Do not implement unused cloud infrastructure.

For future leaderboards, plan for server-side validation and reasonable anti-cheat protections.

Never assume client-submitted exercise statistics are trustworthy.

---

# 13. HEALTH, SMARTWATCH, AND WEARABLE READINESS

I may eventually support:

- Apple Health through HealthKit.
- Android Health Connect.
- Apple Watch.
- Wear OS.
- Fitness bands.
- Other compatible wearable platforms.

Do not implement those integrations yet.

Design suitable integration boundaries so future providers can be added without rewriting the app's core systems.

Consider future data such as:

- Step counts.
- Heart rate.
- Resting heart rate.
- Sleep duration.
- Exercise sessions.
- Active energy expenditure.
- Walking and running distance.
- Bodyweight.
- Recovery-related measurements.

## Unified Data Handling

External data should have clear metadata for:

- Provider and source.
- External record identifier.
- Timestamp and time zone.
- Measurement units.
- Data type.
- Sync status.
- User authorization.
- Manual versus imported origin.

Account for different provider capabilities.

Do not assume every wearable reports the same measurements or supports the same integrations.

## Duplicate Prevention

Avoid counting the same workout, step data, or energy expenditure multiple times when it appears in several connected services.

Prepare reasonable provenance and deduplication principles.

Use Apple Health and Health Connect as potential central sources where appropriate.

Recognize that standalone smartwatch applications may require separate native watchOS or Wear OS development.

Capacitor alone does not guarantee full smartwatch support.

---

# 14. STRAVA INTEGRATION READINESS

Prepare for possible future Strava connectivity.

Consider:

- OAuth authorization.
- Secure token management.
- Activity imports.
- Provider-specific data mapping.
- Duplicate detection.
- Synchronization.
- Rate limits.
- Revoked access.
- Account disconnection.
- Mobile deep-link handling.

Do not implement Strava connectivity now.

Never expose backend-only credentials in the distributed frontend.

Verify the latest official API rules before actual implementation.

The application's workout and recovery systems should function independently of Strava.

---

# 15. AI PROVIDER AND INTELLIGENCE ARCHITECTURE

My application uses AI features and may change AI models or providers over time.

Keep AI provider code appropriately separated from core application logic.

Consider distinct responsibilities for:

- AI provider requests.
- Prompt construction.
- Context selection.
- Response validation.
- Usage limits.
- Error handling.
- Cost controls.
- Feature-specific coaching.
- Shared user context.

Changing an AI provider should not require rewriting the food or gym systems.

Avoid sending excessive user history on every request.

Select relevant context efficiently, but never omit necessary information simply to reduce tokens.

Keep all existing AI features working.

Do not expose server-side secrets in frontend code.

Preserve important cross-system intelligence between nutrition, training, recovery, and coaching.

---

# 16. PERFORMANCE OPTIMIZATION

Improve actual runtime performance, not just code appearance.

Investigate:

- Initial loading time.
- Bundle size.
- Unnecessary dependencies.
- Memory leaks.
- Event-listener cleanup.
- Repeated rendering.
- Expensive calculations.
- Data access performance.
- Excessive storage operations.
- Large exercise and food datasets.
- Animation smoothness.
- Mobile battery usage.

Measure representative behavior before and after major optimizations when possible.

Consider lazy loading for heavy or infrequently used functionality.

Avoid excessive code splitting that creates unnecessary network requests or slow navigation.

Prioritize responsiveness in:

- Food logging.
- Workout tracking.
- Exercise selection.
- Navigation.
- Live workout state.
- Daily dashboard rendering.

Do not claim measurable performance improvements without evidence.

---

# 17. SECURITY AND PRIVACY

The application may eventually handle sensitive health information.

Prepare for appropriate privacy and security requirements.

Consider:

- User consent.
- Minimal permissions.
- GDPR-related obligations.
- Secure credential management.
- Data export and deletion.
- Health data access restrictions.
- Appropriate local and server-side responsibilities.
- Secure AI data handling.
- User control over connected services.

Do not introduce unnecessary data collection.

Do not add external telemetry or analytics without approval.

Do not transmit private user information to new services merely as part of optimization.

---

# 18. SAFE INCREMENTAL REFACTORING

Never perform an uncontrolled full-codebase rewrite.

Refactor incrementally.

For each meaningful change:

1. Explain the reason.
2. Identify affected modules.
3. Identify potential regressions.
4. Establish baseline behavior.
5. Make the smallest practical change.
6. Preserve existing interfaces where possible.
7. Run appropriate checks.
8. Verify affected user flows.
9. Review cross-module effects.
10. Record important architectural decisions.

Use compatibility layers where helpful during transitions.

Do not introduce new dependencies without a genuine need.

## Preserve Existing Behavior

Do not unintentionally alter:

- Visual design.
- Animations.
- Navigation.
- Food calculation logic.
- Exercise ranking logic.
- Recovery and fatigue calculations.
- Workout scheduling.
- Workout session behavior.
- AI coaching behavior.
- Data persistence.
- User settings.
- Backup functionality.

If a behavioral change is necessary, explain why and request approval.

A successful build alone does not prove functional correctness.

---

# 19. TESTING AND RELIABILITY

Establish practical verification for important systems.

Prioritize:

- Nutritional calculations.
- Workout data handling.
- Exercise performance calculations.
- Exercise rankings.
- Recovery and fatigue logic.
- Scheduling.
- Data persistence and migrations.
- AI response validation.
- Cross-system coordination.

Introduce tests where they provide meaningful protection.

Use existing project tools whenever possible.

Avoid installing excessive testing frameworks.

For important UI changes, verify actual interactions where tools permit.

For cross-module changes, perform broader regression testing.

If a test cannot be performed, explicitly report the limitation.

Never suppress failures to conserve tokens.

---

# 20. LONG-TERM DEVELOPMENT WORKFLOW

Establish a lightweight permanent workflow for future Claude Code sessions.

When I provide new changes:

### Step A — Understand

Identify what I want and inspect relevant code.

### Step B — Categorize

Classify each meaningful task by module, complexity, dependencies, model, and Git branch.

### Step C — Plan

For substantial changes, propose the implementation order and main risks.

### Step D — Choose Model

Recommend Sonnet, Opus, or a hybrid workflow.

### Step E — Implement

Make focused, high-quality changes after any required approval.

### Step F — Verify

Run tests and inspect affected workflows.

### Step G — Report

Provide a short summary:

- Changes implemented.
- Branches used.
- Tests completed.
- Remaining issues.
- Suggested next actions.

Do not generate extensive reports for trivial changes.

Do not request approval for every ordinary implementation detail.

For large migrations, storage changes, framework changes, major architectural restructuring, or third-party installations, obtain approval first.

---

# 21. INITIAL EXECUTION PLAN

For this first session, follow these stages:

## Stage 1 — Architecture Audit

Thoroughly inspect the existing repository.

Identify current strengths, problems, dependencies, and future integration obstacles.

## Stage 2 — Proposed Architecture

Recommend a practical modular structure based on the actual codebase.

Show which files or responsibilities should move and which should stay unchanged.

## Stage 3 — Claude Code Optimization

Evaluate existing project instructions, code navigation, context handling, and token-saving techniques.

Apply safe native optimizations where practical.

Request approval before third-party installations.

## Stage 4 — Refactoring Plan

Produce a prioritized incremental plan.

Classify changes as:

- Immediate low-risk improvements.
- Medium-term architectural improvements.
- Changes required before Capacitor.
- Changes to defer until cloud or wearable integrations.

## Stage 5 — Safe Implementation

Implement independently verifiable, low-risk improvements.

For substantial restructuring or migrations, present the detailed proposal before implementation.

## Stage 6 — Verification

Ensure existing functionality and user data remain intact.

Provide build and test results.

## Stage 7 — Persistent Development Rules

Create or update concise CLAUDE.md instructions and any genuinely useful scoped rules or on-demand skills.

Make smart task routing, model selection, and efficient context usage part of the normal workflow.

---

# 22. FINAL DELIVERABLES

At the end of the initial optimization work, provide:

1. Current architecture assessment.
2. Proposed modular architecture.
3. Main technical problems and priorities.
4. Improvements actually implemented.
5. Remaining architectural work.
6. Capacitor readiness checklist.
7. Future cloud and wearable integration roadmap.
8. Claude Code token-efficiency improvements.
9. Recommended Sonnet/Opus workflow.
10. Git branching and task-routing conventions.
11. Testing and verification results.
12. Risks, limitations, and rollback instructions.

Keep explanations concise but technically meaningful.

Distinguish clearly between:

- What was implemented.
- What was planned.
- What requires approval.
- What should wait until later.

Do not describe unimplemented proposals as completed improvements.

---

# FINAL DIRECTIVE

My goal is to build a polished, reliable, efficient, and extensible fitness application.

I want the codebase to become easier for Claude Code to navigate, easier for me to maintain, and easier to expand into a real mobile application.

I want to conserve Claude Code credits through intelligent development practices, modular architecture, efficient context management, and strategic model selection.

I do not want lower-quality code, unnecessary complexity, or premature implementation of future features.

**Use Sonnet for the majority of normal development and recommend Opus when deeper reasoning is genuinely justified.**

**Keep the application modular but interconnected.**

**Prepare for Capacitor, cloud features, wearables, Apple Health, Health Connect, and Strava without building unnecessary infrastructure today.**

**Preserve my existing UI, data, functionality, and user experience.**

**Favor small, well-tested, incremental improvements over risky rewrites.**

Build a strong foundation for the application I have today and the application I want to develop in the future.
