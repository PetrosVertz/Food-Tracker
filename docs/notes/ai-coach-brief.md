# Brief: the AI Coach brain (background intelligence) — for a new planning chat

Paste into a new chat: *"Read docs/notes/ai-coach-brief.md in the Food-Tracker repo and help me design this. Don't build yet: research first, then write docs/fixes-<round>.md with branch prompts like the earlier rounds."*

## Goal (Petros's words, summarised)
The app has one quiet "brain" that knows the user. Food Coach, Gym Coach and the general app share it. It should feel like a real coach, not a chatbot: it learns from history, explains little, and steps in at the right moment.

## What exists today (check the code, this may be out of date)
- `js/know.js` + `AI.knows(topic)` (0.7.9 ai branch): a daily on-phone profile of eating, training, strength and weight, added quietly to Gym Coach, Food Coach, Fill My Macros, cook ideas, Next Exercise. Settings › AI has "What AI Knows" and Reset.
- Recovery: per-muscle hours left (gradient), a line on whether food since the workout was enough. Sleep is used only if a watch/band is connected (none yet; hook returns null).
- Sets store weight, reps, markers (warm-up, drop, failure) and optional half reps, negatives, RIR.
- Ranks (est. 1RM vs body weight and sex), leaderboards, streak, training style (volume/intensity) from history.
- AI calls: Gemini now (user key); later Haiku 5.5 through a small server (0.8).

## Research step (do this first, in the new chat)
Look up solid, mainstream evidence (meta-analyses, position stands, large well-known studies; not single niche papers) on four topics, and turn each into **concrete rules the app can compute**:
1. **Muscle recovery:** how long muscles need between hard sessions, by volume, proximity to failure, eccentric work (negatives), muscle size, training age; effect of protein/energy intake and sleep.
2. **Hypertrophy:** weekly sets per muscle, frequency, rep ranges, proximity to failure (RIR), rest between sets, exercise variety, lengthened partials (half reps).
3. **Maximising a workout / progression:** progressive overload rules (e.g. double progression: hit the top of the rep range at a target RIR for N sessions → add the smallest weight step), deloads, plateaus, exercise order, warm-ups.
4. **Nutrition for training:** daily protein per kg body weight and per meal, energy balance for gaining/cutting, timing around workouts.
Starting points to verify (from general knowledge, check each before using): Schoenfeld and colleagues' meta-analyses on volume, frequency and load; Morton et al. 2018 protein meta-analysis; ISSN and ACSM position stands; studies on RIR-based training and sleep restriction and muscle protein synthesis. Record each rule with its source in `docs/notes/ai-coach-evidence.md`, with how confident it is.

## Design principles
- **Rules on the phone, AI for words.** Numbers (recovery hours, progression, protein targets, when to step in) come from deterministic rules built from the research; the AI only phrases advice and answers questions. Cheaper, consistent, works offline, testable.
- **One brain, three voices:** the shared profile + rules feed Food Coach, Gym Coach and app-wide hints. Food affects recovery; recovery and history affect the workout; the workout affects food targets.
- **Quiet by default:** no insight dashboards. It shows up only when useful, and never asks what it can work out from the logs.
- **Explainable:** every suggestion can say why in one line ("You did 3 × 12 at 60 kg with 2+ reps left twice: try 62.5 kg").

## Live workout interventions (the example Petros gave)
- The Gym Coach robot at the top right gets a small **"!" badge** when it has a suggestion; tapping it shows the suggestion as a short card with **Apply / Not Now**. No pop-ups that block the workout.
- Example triggers (to be set from the research, not guessed): ready to add weight (double progression met); too easy this set (RIR high); too much volume today for a muscle still recovering; long rest overrun; form/negatives fatigue; first-time exercise weight.
- Petros's example "20 sets at this weight → add 2 kg": turn into an evidence-based progression rule (reps achieved at the top of the range with RIR in reserve over recent sessions), with the smallest available plate step.
- Frequency limit: at most one suggestion per exercise per session; learns from Not Now (fewer of that kind).

## Data it uses
Food logs (kcal, protein vs targets, meal timing), workouts and every set (weight, reps, RIR, markers, half reps, negatives), exercise history and ranks, body weight trend, recovery state, Food Preferences, steps and sleep only if a health source is connected.

## Things to decide in that chat
- Which rules ship first (suggest: progression nudge, recovery-aware volume warning, protein-for-recovery line).
- How suggestions are tested (fixtures of fake histories in tools/check.js).
- Privacy wording and the Reset button scope.
- Model use and cost per suggestion (rules first; AI only when the user taps for detail).
