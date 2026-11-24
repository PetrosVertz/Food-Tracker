#!/usr/bin/env node
// RECOVERY+ engine + anatomy data checks (pure, no browser). Run: node tools/recovery-test.js   (exit 1 = a check failed)
// Covers the cases in the RECOVERY+ prompt: no history, compound vs isolation, consecutive days, RIR missing vs 0, failure / drop / L-R /
// warm-ups, edited / deleted workouts, custom exercises, plan changes, food logging gaps, sleep gaps, Bulk / Recomp / Cut, goal switches,
// Athlete OS off, no mutation of saved data, and the anatomy's 21 heads / 10 groups on all four views.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, isFinite };
vm.createContext(ctx);
vm.runInContext(read('js/data/recovery-anatomy.js') + read('js/recovery-anatomy.js') + read('js/recovery-plus.js') +
  '\n;this.RecoveryCore = RecoveryCore; this.RA_DATA = RA_DATA; this.recoveryAnatomySVG = recoveryAnatomySVG; this.raCropFor = raCropFor; this.RecoveryPlus = RecoveryPlus;', ctx);
const C = ctx.RecoveryCore;
let fails = 0, n = 0;
const ok = (c, m) => { n++; if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };

// ---- a tiny exercise library (same shape as the app's: mu = { head: % }, p = movement pattern)
const LIB = {
  bench: { id: 'bench', mu: { chest_mid: 55, delt_front: 20, triceps: 25 }, p: 'press_h' },
  curl: { id: 'curl', mu: { biceps: 80, forearms: 20 }, p: 'curl' },
  pushdown: { id: 'pushdown', mu: { triceps: 100 }, p: 'ext' },
  squat: { id: 'squat', mu: { quads: 55, glutes: 25, adductors: 10, lower_back: 10 }, p: 'squat' },
  ohp: { id: 'ohp', mu: { delt_front: 60, delt_side: 15, triceps: 25 }, p: 'press_v' },
  row: { id: 'row', mu: { lats: 40, upper_back: 35, biceps: 15, delt_rear: 10 }, p: 'row' },
  run: { id: 'run', mu: { cardio: 100 }, m: 'cardio' },
};
const ex = id => LIB[id] || null, loadOf = (id, w) => +w || 0;
const H = 36e5, NOW = Date.parse('2026-11-22T12:00:00Z');
const set = (o) => ({ done: true, w: 60, r: 10, ...o });
const ses = (id, hoursAgo, exs) => ({ id, date: new Date(NOW - hoursAgo * H).toISOString().slice(0, 10), start: new Date(NOW - hoursAgo * H - H).toISOString(), end: new Date(NOW - hoursAgo * H).toISOString(),
  exercises: exs.map(([exId, sets]) => ({ exId, sets })) });
const TR = (sessions, now = NOW) => C.trainingRecovery({ sessions, ex, loadOf, now });
const sets = (k, o) => Array.from({ length: k }, () => set(o));
const deep = x => JSON.parse(JSON.stringify(x));
const freeze = o => { if(o && typeof o === 'object'){ Object.freeze(o); Object.values(o).forEach(freeze); } return o; };

// 1. No workout history: unknown everywhere, never "ready"
{ const t = TR([]);
  ok(C.HEADS21.every(h => t.heads[h].state === 'unknown'), 'no history: all 21 heads unknown');
  ok(C.GROUPS10.every(g => t.groups[g].state === 'unknown'), 'no history: all 10 groups unknown (not ready)');
  const a = C.assessWorkout(t, { at: NOW + 5 * H, exercises: ['bench'] }, ex);
  ok(a.assessment === 'unknown', 'no history: next workout assessment unknown'); }

// 2. Compound (bench) → chest / front delts / triceps by their own shares; biceps untouched
{ const t = TR([ses('a', 2, [['bench', sets(5)]])]);
  ok(['recovering', 'needs_rest'].includes(t.heads.chest_mid.state), 'bench: mid chest not ready');
  ok(t.heads.chest_mid.hours > t.heads.delt_front.hours, 'bench: chest (55 %) needs longer than front delts (20 %)');
  ok(t.heads.biceps.state === 'ready' && t.heads.abs.state === 'ready', 'bench: biceps and abs ready (trained nothing there)');
  ok(t.groups.chest.heads.includes('chest_mid') && !t.groups.chest.heads.includes('chest_upper'), 'bench: chest tile qualifies Mid chest only'); }

// 3. Biceps curls only: triceps pushdown is NOT warned (the old broad "arms" bug)
{ const t = TR([ses('a', 3, [['curl', sets(6, { type: 'F' })]])]);
  ok(t.heads.biceps.state !== 'ready', 'curls: biceps not ready');
  ok(t.heads.triceps.state === 'ready', 'curls: triceps ready');
  ok(t.groups.arms.heads.join() === 'biceps' || t.groups.arms.heads.join() === 'biceps,forearms', 'curls: Arms tile names Biceps (and forearms only if fatigued), not Triceps');
  const p = C.assessWorkout(t, { at: NOW + H, exercises: ['pushdown'] }, ex), c = C.assessWorkout(t, { at: NOW + H, exercises: ['curl'] }, ex);
  ok(p.assessment === 'proceed' && p.limiting.length === 0, 'curls: an isolated triceps workout gets no warning');
  ok(c.assessment === 'consider_adjustment' && c.limiting[0] === 'biceps', 'curls: another curl workout is flagged by biceps'); }

// 4. Consecutive days accumulate, no NaN, bounded
{ const old = [300, 400, 500].map((h, i) => ses('o' + i, h, [['squat', sets(5)]]));   // familiar lifter in both cases (no novelty difference)
  const one = TR([...old, ses('a', 20, [['squat', sets(5)]])]), two = TR([...old, ses('a', 30, [['squat', sets(5)]]), ses('b', 20, [['squat', sets(5)]])]);
  ok(two.heads.quads.hours > one.heads.quads.hours, 'back-to-back squat days leave more quad fatigue than one');
  ok(C.HEADS21.every(h => isFinite(two.heads[h].hours) && two.heads[h].hours >= 0 && two.heads[h].hours <= 200), 'hours finite and bounded'); }

// 5. Effort: RIR missing ≠ RIR 0; failure; RIR 3 lighter
{ const L = o => C.setEffort(set(o));
  ok(L({}) === 1, 'missing RIR = normal effort (not failure)');
  ok(L({ rir: 0 }) > L({}) && L({ type: 'F' }) > L({}), 'RIR 0 and failure count more than missing RIR');
  ok(L({ rir: 3 }) < L({}), 'RIR 3 counts less');
  ok(L({ type: 'W' }) === 0 && L({ done: false }) === 0, 'warm-ups and unfinished sets count 0');
  ok(L({ side: 'R' }) === 1 && L({ side: 'L' }) === 1, 'each side row has its own full effort (they are summed per side, not added together: see section 5b)');
  ok(Math.abs(L({ drop: true }) - .4) < 1e-9, 'a completed drop extension with no parent to compare counts 40 %, not a full set');
  ok(L({ type: 'D' }) === L({}), 'a drop MARKER alone adds nothing above the completed parent set');
  ok(C.setEffort({ done: true, w: 'abc', r: null }) === 1 && isFinite(C.setEffort({ done: true, rir: 'x' })), 'odd values do not produce NaN'); }

// 5b. Dose rules (Prompt 3, stage 1): per-side pairs, effort signals applied once, drop extensions, half reps, negatives
{ const T1 = arr => TR([ses('a', 1, [['curl', arr]])]); const L = o => C.setEffort(set(o)), P = o => ({ ...set(o) });
  // blank vs explicit zero, and an explicit entry counts on its own set even on a first-ever workout
  ok(L({ rir: 0 }) === 1.3 && L({}) === 1 && L({ rir: '' }) === 1 && L({ rir: null }) === 1, 'blank / empty RIR stays neutral; an explicit 0 counts as 1.30 on its own set');
  const first = T1([set({ rir: 0 }), ...sets(3)]), blank = T1(sets(4));
  ok(first.heads.biceps.hours > blank.heads.biceps.hours, 'first workout ever: one explicit RIR 0 set counts more than a blank one (no habit is inferred)');
  // failure + RIR 0 is one signal, applied once
  ok(L({ type: 'F', rir: 0 }) === 1.3 && L({ type: 'F' }) === 1.3 && L({ rir: 0 }) === 1.3, 'failure + RIR 0 = 1.30 once, never stacked');
  ok(L({ type: 'F', rir: 3 }) === 1 && L({ type: 'F', rir: 1 }) === 1.3, 'a failure mark with RIR 3 is a contradiction and counts as a normal effort; RIR 1 + failure counts once as failure');
  // drop: marker alone, completed extensions, unopened chain
  const parent = set({ w: 40, r: 10 }), ext = set({ w: 30, r: 8, drop: true, type: 'D' });
  ok(Math.abs(C.setEffort(ext, parent) - .6) < 1e-9, 'a completed drop 30 kg x 8 under 40 kg x 10 counts 60 % of a set (0.8 reps x 0.75 load)');
  ok(C.setEffort(set({ w: 2, r: 1, drop: true }), parent) >= .15 && C.setEffort(set({ w: 2, r: 1, drop: true }), parent) < .2 && C.setEffort(set({ w: 40, r: 10, drop: true }), parent) === .7, 'a tiny extension counts at least 15 %, a near-copy at most 70 %: never a fresh full set');
  ok(C.setEffort({ ...ext, done: false }, parent) === 0, 'an untouched drop row earns no credit');
  const base = T1([parent]), mark = T1([{ ...parent, type: 'D' }]);
  const chain = T1([{ ...parent, type: 'D' }, ext, { ...ext, w: 20 }]), unopened = T1([{ ...parent, type: 'D' }, { ...ext, done: false }, { ...ext, done: false, w: 20 }]);
  const three = T1(sets(3, { w: 40 }));
  ok(mark.heads.biceps.hours === base.heads.biceps.hours, 'a drop set marker alone: exactly the parent set (no extra fatigue)');
  ok(unopened.heads.biceps.hours === base.heads.biceps.hours, 'an unopened drop chain: exactly the parent set');
  ok(chain.heads.biceps.hours > base.heads.biceps.hours && chain.heads.biceps.hours < three.heads.biceps.hours, 'a completed drop chain adds partial work: more than the parent, less than three full sets');
  ok(chain.heads.biceps.contrib[0].dropExt === 2 && chain.heads.biceps.contrib[0].sets === 1, 'Advanced data: two completed extensions kept apart from the one parent set');
  // half reps recorded, no hours; extra negatives modest and capped
  const hr = T1([{ ...parent, hr: 6 }]), ng1 = T1([{ ...parent, ng: 2 }]), ng40 = T1([{ ...parent, ng: 40 }]), ng9 = T1([{ ...parent, ng: 9 }]);
  ok(hr.heads.biceps.hours === base.heads.biceps.hours && hr.heads.biceps.contrib[0].halfReps === 6, 'half reps only: recorded for Advanced, no hours added, never converted into full reps');
  ok(ng1.heads.biceps.hours >= base.heads.biceps.hours && ng40.heads.biceps.hours === ng9.heads.biceps.hours, 'extra negatives: a small effect that stops growing (cap +10 %)');
  // paired sides: independent per side, more fatigued side wins, equal sides = one logical set
  const pr = (l, r) => ['L', 'R'].map((side, i) => ({ ...set(i ? r : l), side }));
  const comp1 = T1([set({})]), eq = T1(pr({}, {}));
  ok(eq.heads.biceps.hours === comp1.heads.biceps.hours && eq.heads.biceps.side === null, 'matched sides: a Left / Right pair is ONE logical set, same hours as the compact set');
  const hardR = T1(pr({}, { type: 'F' })), failC = T1([set({ type: 'F' })]);
  ok(hardR.heads.biceps.hours === failC.heads.biceps.hours && hardR.heads.biceps.side === 'R', 'hard right / easy left: the more fatigued side (right) drives the tile and is named');
  const oneL = T1([{ ...set({}), side: 'L' }]);
  ok(oneL.heads.biceps.hours === comp1.heads.biceps.hours && oneL.heads.biceps.side === 'L', 'one side only: only that side is fatigued (the other side is not invented)');
  const alt = T1([...pr({ type: 'F' }, {}), ...pr({}, { type: 'F' })]), bothF = T1([...pr({ type: 'F' }, { type: 'F' }), ...pr({ type: 'F' }, { type: 'F' })]);
  const oneFnorm = T1([set({ type: 'F' }), set({})]);
  ok(alt.heads.biceps.hours === oneFnorm.heads.biceps.hours && alt.heads.biceps.hours < bothF.heads.biceps.hours, 'alternating which side works hardest: each side did one hard + one easy set, not one fictional side that did both hard');
  const withAnn = [...pr({ rir: 1, hr: 2, ng: 1 }, { rir: 1, hr: 2, ng: 1 })], cmp = [set({ rir: 1, hr: 4, ng: 2 })];
  ok(T1(withAnn).heads.biceps.hours === T1(cmp).heads.biceps.hours, 'the same annotations give the same hours in Left / Right rows and in the compact layout');
}
// 5c. Regression replays on the real catalog (the brief's numbers): unchanged because those workouts have no drops, sides or annotations
{ const RP = require('./recovery-replay.js').R;
  ok(RP['biceps after 3 preacher sets to failure'] === 31 && RP['side delts after 3 ordinary sets of 12'] === 23 && RP['side delts after 12 ordinary sets of 12'] === 77, 'replays: 31 h biceps (3 preacher failure sets), 23 h and 77 h side delts (3 / 12 sets of 12) are unchanged by the dose rules'); }

// 5d. The ready window (Prompt 3, stage 2): absolute earliest / latest times, the countdown, the 24 h boundary, first workout
{ const HIST = (endAgo, k = 6) => [...Array.from({ length: 4 }, (_, i) => ses('h' + i, 200 + i * 24, [['curl', sets(3)]])), ses('z', endAgo, [['curl', sets(k, { type: 'F' })]])];   // regular history, then one hard workout
  const t0 = TR(HIST(0)), hb = t0.heads.biceps;
  ok(hb.state !== 'ready' && hb.readyFrom < NOW + hb.hours * H && hb.readyBy > NOW + hb.hours * H && isFinite(hb.readyFrom) && isFinite(hb.readyBy), 'a recovering head carries an earliest and a latest ready time around the central estimate');
  const t6 = TR(HIST(0), NOW + 6 * H);
  ok(t6.heads.biceps.readyFrom === hb.readyFrom && t6.heads.biceps.readyBy === hb.readyBy, 'the window is stored as timestamps: it does not drift or jump as time passes');
  ok(hb.range[0] <= hb.hours && hb.range[1] >= hb.hours && hb.range[1] > hb.range[0], 'the shown range is around the central hours and is not a fixed +/- 3 h (' + hb.range.join('-') + ' for ' + hb.hours + ')');
  // the brief's example: 28-34 h window
  const w = { state: 'recovering', readyFrom: NOW + 28 * H, readyBy: NOW + 34 * H };
  const cd = k => C.countdown(w, NOW + k * H);
  ok(cd(0).kind === 'range' && cd(0).a === 28 && cd(0).b === 34, 'initial window 28-34 h shows 28-34 h');
  ok(cd(12).kind === 'range' && cd(12).a === 16 && cd(12).b === 22, 'after 12 h it shows 16-22 h');
  ok(cd(28).kind === 'within' && cd(28).n === 6, 'on reaching the lower bound: "likely ready within 6 h"');
  ok(cd(31).kind === 'within' && cd(31).n === 3, 'inside the window it counts down to the latest time');
  ok(cd(34).kind === 'ready' && cd(60).kind === 'ready', 'at the upper bound (and after, absent new evidence): ready, never negative');
  ok([0, 5, 27.9, 28, 33.9, 34, 90].every(k => { const c = cd(k); return !('a' in c) || (c.a >= 0 && c.b >= c.a); }), 'no countdown value is ever negative');
  ok(C.countdown({ state: 'unknown' }, NOW).kind === 'unknown', 'unknown stays unknown');
  ok(C.windowText(w, NOW + 12 * H) === 'ready in 16–22 h' && C.windowText(w, NOW + 30 * H) === 'likely ready within 4 h', 'coaches get the same range as plain text');
  // the 24 h colour boundary and the window
  ok(C.windowState('needs_rest', NOW, NOW + 30 * H, NOW + 40 * H, true) === 'needs_rest' && C.windowState('needs_rest', NOW + 31 * H, NOW + 30 * H, NOW + 40 * H, true) === 'recovering', 'Needs Rest only before the window opens; inside the window it is at most Recovering');
  ok(C.windowState('ready', NOW + 1, NOW, NOW + 5 * H, true) === 'recovering' && C.windowState('ready', NOW + 6 * H, NOW, NOW + 5 * H, true) === 'ready', 'past the central estimate but before the latest time it stays Recovering; after it, Ready');
  ok(C.windowState('ready', NOW, NOW, NOW, false) === 'ready', 'a muscle that was not trained has no window to wait for');
  // the tail: central time passed, window not yet closed -> a tile still shows "within"
  const lateNow = NOW + (hb.readyFrom - NOW) + 1, tl = TR(HIST(0), lateNow).heads.biceps;
  ok(['recovering', 'ready'].includes(tl.state) && tl.state !== 'needs_rest', 'inside the window the head is never Needs Rest (' + tl.state + ')');
  // evidence sets the width
  const first = TR([ses('a', 0, [['curl', sets(6, { type: 'F' })]])]).heads.biceps, reg = hb;
  const wd = v => (v.readyBy - v.readyFrom) / (v.readyBy + v.readyFrom - 2 * NOW || 1);
  ok(first.coarse === true && C.countdown(first, NOW).kind === 'days', 'a first workout is broad and shown as days ("about 1-2 days")');
  ok(wd(first) > wd(reg), 'little history gives a wider window than a regular history');
  // snapshot: the same window for every consumer
  const sn = C.snapshot({ tr: TR(HIST(0)), sleep: C.evaluateSleepSupport({ records: [], now: NOW }), nutr: C.evaluateNutritionSupport({ days: {}, today: '2026-11-23', now: NOW }), readiness: C.buildOverallReadiness(TR(HIST(0)), C.evaluateSleepSupport({ records: [], now: NOW }), C.evaluateNutritionSupport({ days: {}, today: '2026-11-23', now: NOW }), null), acute: {}, now: NOW });
  const tr0 = TR(HIST(0));
  ok(sn.muscleHeads.biceps.readyWindow && sn.muscleHeads.biceps.readyWindow.from === Math.round(tr0.heads.biceps.readyFrom) && sn.groups.arms.readyFrom === Math.round(tr0.groups.arms.readyFrom) && sn.groups.arms.readyBy === Math.round(tr0.groups.arms.readyBy), 'the snapshot carries the same window as the engine (groups and heads)');
  ok(sn.muscleHeads.chest_mid.readyWindow === undefined && sn.groups.chest.readyBy === undefined, 'a ready muscle has no window in the snapshot');
  ok(sn.validUntil <= NOW + 10 * 6e4 && sn.validUntil > NOW, 'validUntil still refreshes within 10 minutes');
}

// 6. Edited / deleted workouts: pure recompute from the list
{ const list = [ses('a', 5, [['bench', sets(5)]])], before = TR(list), after = TR([]);
  ok(before.heads.chest_mid.state !== 'ready' && after.heads.chest_mid.state === 'unknown', 'deleting the only workout: chest goes back to unknown');
  const edited = deep(list); edited[0].exercises[0].sets = sets(1); const e = TR(edited);
  ok(e.heads.chest_mid.hours < before.heads.chest_mid.hours, 'editing a workout down to 1 set lowers the hours'); }

// 7. Custom / unknown exercises: no invented chest load, flagged, no crash
{ const t = TR([ses('a', 3, [['my_custom_thing', sets(5)], ['run', sets(2)]])]);
  ok(C.HEADS21.every(h => t.heads[h].state === 'ready'), 'unknown exercise adds no load anywhere (not chest)');
  ok(t.unknownExercises.includes('my_custom_thing') && !t.unknownExercises.includes('run'), 'unknown exercise listed; cardio is not "unknown"');
  const t2 = TR([ses('a', 3, [['my_custom_thing', sets(5)], ['bench', sets(4)]])]);
  ok(t2.heads.chest_mid.conf === 'low', 'a workout with an unmapped exercise lowers confidence'); }

// 8. Plan changes → different assessment, same training state
{ const t = TR([ses('a', 10, [['bench', sets(6, { type: 'F' })]])]);
  const a1 = C.assessWorkout(t, { at: NOW + 2 * H, exercises: ['bench', 'ohp'] }, ex), a2 = C.assessWorkout(t, { at: NOW + 2 * H, exercises: ['squat'] }, ex);
  ok(a1.assessment === 'consider_adjustment' && a2.assessment === 'proceed', 'changing the planned workout changes the advice');
  const far = C.assessWorkout(t, { at: NOW + 120 * H, exercises: ['bench'] }, ex);
  ok(far.assessment === 'proceed', 'the same workout 5 days later: proceed (forecast moves with time)');
  const nolist = C.assessWorkout(t, { at: NOW + 2 * H, exercises: null }, ex);
  ok(nolist.assessment === 'unknown', 'a plan without an exercise list: unknown, no invented exercises'); }

// 9. Live workout: acute fatigue separate from recovery
{ const active = { exercises: [{ exId: 'curl', sets: sets(4, { at: NOW - 5 * 6e4 }) }] };
  const a = C.acuteFatigue({ active, ex, now: NOW }), t = TR([]);
  ok(a.biceps > 0 && a.biceps <= 1 && !a.triceps, 'acute fatigue for the live workout (biceps only)');
  ok(t.heads.biceps.state === 'unknown', 'the live workout does not touch recovery until it is finished'); }

// 10. Sleep context
{ const night = (dAgo, hrs, o) => ({ start: NOW - dAgo * 864e5 - hrs * H, end: NOW - dAgo * 864e5, kind: 'asleep', source: 'wearable', ...o });
  const S = r => C.evaluateSleepSupport({ records: r, now: NOW });
  ok(S([]).status === 'unknown' && S([]).reasonCodes.includes('insufficient_sleep_data'), 'no sleep data (watch absent): unknown, no penalty');
  const one = S([{ ...night(0.2, 4.5), source: 'manual' }]);
  ok(one.status === 'possible_concern' && one.confidence === 'low' && one.basis === 'single_night', 'one short self-reported night: low-confidence signal only');
  const rep = S([night(0.2, 5), night(1.2, 5.2), night(2.2, 4.8), night(3.2, 7.5)]);
  ok(rep.reasonCodes.includes('repeated_short_sleep') && rep.confidence === 'moderate', '3 short nights: repeated_short_sleep');
  const dup = S([night(0.2, 7.5), night(0.2, 7.5), { ...night(0.2, 7.5), source: 'manual' }]);
  ok(dup.lastNightHours === 7.5, 'double-synced / overlapping records are not double counted');
  ok(S([{ ...night(0.2, 8), kind: 'in_bed' }]).status === 'unknown', 'time in bed is not used as sleep');
  ok(S([{ ...night(0.2, 8), deep: 10 }]).reasonCodes.every(c => !/deep|stage/.test(c)), 'sleep stages are ignored');
  ok(C.evaluateSleepSupport({ records: [night(0.2, 4)], optOut: true, now: NOW }).reasonCodes.includes('opted_out'), 'sleep opt-out: not read'); }

// 11. Nutrition context (lower-bound rule, completeness, goals)
{ const today = '2026-11-22', tf = () => ({ k: 2500, p: 150, c: 300 });
  const D = (map) => map;
  const N = (days, goal, extra) => C.evaluateNutritionSupport({ days, today, targetFor: tf, goal, bodyKg: 80, now: NOW, ...(extra || {}) });
  const back = (i) => { const x = new Date(today + 'T12:00:00'); x.setDate(x.getDate() - i); return x.toISOString().slice(0, 10); };
  const full = (kcal, p, k = 5) => Object.fromEntries(Array.from({ length: k }, (_, i) => [back(i + 1), { n: 4, kcal, p, c: 250, complete: true }]));
  const r0 = N({}, 'bulk'); ok(r0.status === 'unknown' && r0.reasonCodes.includes('no_food_logged'), '10 days no food: unknown, not "low"');
  const r1 = N({ [today]: { n: 1, kcal: 700, p: 40, c: 60 } }, 'bulk'); ok(r1.energy.observation === 'unknown' && r1.status === 'unknown', 'one 700 kcal meal today: unknown, not a deficit');
  const r2 = N({ [today]: { n: 2, kcal: 900, p: 160, c: 60 } }, 'bulk'); ok(r2.reasonCodes.includes('protein_today_recorded_adequate') && r2.energy.observation === 'unknown', 'partial day with protein over target: protein OK, calories unknown');
  const r3 = N(full(2500, 90), 'maintain'); ok(r3.protein.status === 'possible_gap' && r3.reasonCodes.includes('protein_pattern_low'), 'several complete low-protein days: protein note');
  const r4 = N(full(2125, 150), 'cut'); ok(r4.status !== 'possible_concern' && !r4.reasonCodes.includes('sustained_energy_concern'), 'moderate planned cut + enough protein: no concern');
  ok(C.buildDecisionInsight({ nutr: r4 }) && C.buildDecisionInsight({ nutr: r4 }).code === 'insight_cut_ok', 'cut on track: the supportive cut line (only with complete days)');
  const r5 = N(full(1500, 150), 'cut'); ok(r5.reasonCodes.includes('sustained_energy_concern') && r5.status === 'possible_concern', 'cut far below even the cut target: gentle concern, no diagnosis');
  const r6 = N(full(2000, 160), 'bulk'); ok(r6.reasonCodes.includes('goal_mismatch_bulk_low'), 'bulk with complete days below target: goal mismatch');
  const partial = Object.fromEntries(Object.entries(full(1200, 60)).map(([d, v]) => [d, { ...v, complete: false }]));
  ['bulk', 'cut'].forEach(g => { const r = N(partial, g); ok(r.energy.observation === 'unknown' && !r.reasonCodes.some(c => /energy|mismatch|protein_pattern/.test(c)), `${g} + incomplete logs: no under-eating conclusion`); });
  const r7 = N(full(2500, 150), 'recomp'); ok(!r7.reasonCodes.some(c => /mismatch|concern/.test(c)), 'recomp at maintenance: no "not bulking enough"');
  const r8 = N(full(1500, 150, 7), 'bulk', { goalSince: back(1) }); ok(r8.coverage.eligibleDays <= 1 && !r8.reasonCodes.includes('goal_mismatch_bulk_low'), 'cut→bulk this week: old cut days are not judged against the bulk target');
  const r9 = N(full(2500, 150), undefined); ok(r9.energy.goal === 'unknown', 'unknown goal: no invented intent');
  const r10 = N(full(2500, 150), 'bulk', { demand: { highVolumeRecent: true, nextDemandingInH: 6 } }); ok(r10.reasonCodes.includes('rapid_refuelling_relevant'), 'big session + another within 6 h: carb timing relevant');
  const r11 = N(full(2500, 150), 'bulk', { demand: { highVolumeRecent: false, nextDemandingInH: 30 } }); ok(!r11.reasonCodes.includes('rapid_refuelling_relevant'), 'ordinary session: no carb concern');
  ok(N(full(1500, 60), 'cut', { optOut: true }).reasonCodes.join() === 'opted_out', 'food opt-out: nothing read'); }

// 12. Sleep / food / goal never change muscle hours or colours
{ const list = [ses('a', 6, [['bench', sets(5)]]), ses('b', 30, [['squat', sets(5)]])], t = TR(list);
  const snap = (sleep, nutr) => C.snapshot({ tr: t, sleep, nutr, readiness: C.buildOverallReadiness(t, sleep, nutr, null), now: NOW }).muscleHeads;
  const s0 = C.evaluateSleepSupport({ records: [], now: NOW }), s1 = C.evaluateSleepSupport({ records: [0.2, 1.2, 2.2].map(d => ({ start: NOW - d * 864e5 - 4 * H, end: NOW - d * 864e5, source: 'wearable' })), now: NOW });
  const n = g => C.evaluateNutritionSupport({ days: {}, today: '2026-11-22', goal: g, now: NOW });
  const base = JSON.stringify(snap(s0, n('bulk')));
  ok(JSON.stringify(snap(s1, n('bulk'))) === base, 'short sleep: identical head states and hours');
  ok(['cut', 'recomp', 'maintain', undefined].every(g => JSON.stringify(snap(s0, n(g))) === base), 'Bulk / Recomp / Cut / unknown: identical head states and hours');
  ok(C.evaluateSleepSupport({ records: [], now: NOW }).status === s0.status, 'goal does not touch sleep'); }

// 13. Snapshot: recovery.v1 + the v:1 shape Gym Coach reads; Athlete OS off still works
{ const t = TR([ses('a', 6, [['curl', sets(5)]])]), nx = C.assessWorkout(t, { at: NOW + 3 * H, exercises: ['curl'] }, ex);
  const s = C.snapshot({ tr: t, sleep: null, nutr: null, next: nx, plan: { id: 'tp1', at: NOW + 3 * H }, readiness: C.buildOverallReadiness(t, null, null, nx), now: NOW });
  ok(s.v === 1 && s.version === 'recovery.v1' && s.at === NOW && s.engineVersion, 'snapshot has v:1, version recovery.v1, at, engineVersion');
  ok(Object.keys(s.groups).length === 10 && Object.values(s.groups).every(g => ['recovering', 'ready', 'unknown'].includes(g.state)), 'groups use the contract states');
  ok(Object.keys(s.muscleHeads).length === 21, '21 muscle heads published');
  ok(s.nextWorkout && s.nextWorkout.assessment === 'consider_adjustment' && s.nextWorkout.limitingMuscles[0] === 'biceps', 'next workout: advisory codes only');
  ok(['normal', 'reduced', 'unknown'].includes(s.readiness.level), 'readiness level in the contract values');
  ok(!JSON.stringify(s).includes('kcal'), 'no raw food diary in the snapshot');
  // which version and for how long: snapshotId (what it says, not when) and validUntil (next change by time alone, at most 10 min)
  const s2 = C.snapshot({ tr: t, sleep: null, nutr: null, next: nx, plan: { id: 'tp1', at: NOW + 3 * H }, readiness: C.buildOverallReadiness(t, null, null, nx), now: NOW + 1000 });
  const t3 = TR([ses('a', 6, [['curl', sets(5)]]), ses('b', 2, [['bench', sets(5)]])]), s3 = C.snapshot({ tr: t3, sleep: null, nutr: null, readiness: C.buildOverallReadiness(t3, null, null, null), now: NOW });
  ok(/^r1-[a-z0-9]+$/.test(s.snapshotId) && s2.snapshotId === s.snapshotId && s3.snapshotId !== s.snapshotId, 'snapshotId: the same facts a second later keep the id; a new workout changes it');
  ok(s.validUntil > NOW && s.validUntil <= NOW + 10 * 6e4 + 1000, 'validUntil: within 10 min (a consumer re-reads before a muscle can change state)');
  const t4 = TR([ses('a', 47.99, [['curl', sets(1)]])]), s4 = C.snapshot({ tr: t4, sleep: null, nutr: null, readiness: C.buildOverallReadiness(t4, null, null, null), now: NOW }), hb = t4.heads.biceps.hours;
  ok(!(hb > 0) || s4.validUntil <= NOW + Math.min(10 * 6e4, hb * 36e5 + 1000) + 1, `validUntil: earlier when a head is about to be ready (${hb ? hb.toFixed(3) + ' h left' : 'already ready'})`); }

// 14. Personal calibration: slow, bounded, needs repeated evidence
{ const mk = (k, gapH, best) => Array.from({ length: k }, (_, i) => ses('c' + i, (k - i) * gapH, [['bench', [set({ w: best, r: 5 })]]]));
  const one = C.calibrate(C.indexHistory(mk(2, 30, 100), ex, loadOf), ex, NOW);
  ok(!one.chest || !one.chest.used, 'one comparison never changes anything');
  const many = C.calibrate(C.indexHistory(mk(6, 30, 100), ex, loadOf), ex, NOW);
  ok(many.chest && many.chest.used && many.chest.f < 1 && many.chest.f >= C.CFG.calib.min, 'repeated strong performance while "recovering": a bit faster, within bounds'); }

// 14b. Personal memory (Prompt 3, stage 3): informative evidence only, bounded, per region, deterministic
{ const perfSet = (w, extra) => [set({ w, r: 5, ...(extra || {}) }), set({ w, r: 5, ...(extra || {}) }), set({ w, r: 5, ...(extra || {}) })];
  // exs(i) → the exercises of session i as [[exId, sets]]; gaps in hours; the last session ends `endAgo` hours before NOW
  const series = (n, gapH, exs, endAgo = 0, tag = 's') => Array.from({ length: n }, (_, i) => ses(tag + i, endAgo + (n - 1 - i) * gapH, exs(i)));
  const CAL = (list, o) => C.calibrate(C.indexHistory(list, ex, loadOf), ex, NOW, o);
  // two users, identical workouts and doses, different later performance
  const fastU = series(10, 30, () => [['bench', perfSet(100)]], 24, 'f');                              // trains again after 30 h and holds 100 every time
  const slowU = series(14, 72, i => [['bench', perfSet(i % 4 === 3 ? 86 : 100)]], 24, 'w');            // waits 72 h and still dips on every 4th session
  const cf = CAL(fastU), cs = CAL(slowU);
  ok(cf.chest.used && cf.chest.f < 1 && cs.chest.used && cs.chest.f > 1, 'two users, identical workouts: the one who holds performance early is learned faster, the one who dips late slower (' + cf.chest.f + ' vs ' + cs.chest.f + ')');
  const final = [ses('x', 0, [['bench', sets(6, { w: 100, r: 5 })]])], hrs = u => TR([...u, ...final]).heads.chest_mid.hours;
  ok(hrs(fastU) < hrs(slowU), 'the same new workout gets a shorter forecast for the faster person (' + hrs(fastU) + ' h vs ' + hrs(slowU) + ' h)');
  ok(cf.chest.f >= C.CFG.calib.min && cs.chest.f <= C.CFG.calib.max, 'the personal change stays inside its bounds');
  // regular attendance with no informative early retest
  const reg = CAL(series(12, 72, () => [['bench', perfSet(100)]], 24));
  ok(!reg.chest.used && reg.chest.f === 1, 'regular attendance and good sets 72 h later tell nothing about a ~48 h window: no change (' + reg.chest.informative + ' informative)');
  { const sp = CAL(series(2, 30, () => [['bench', perfSet(100)]])); ok(!sp.chest || (!sp.chest.used && sp.chest.informative === 0), 'sparse history: nothing is learned'); }
  // a single poor session never decides
  const one = CAL(series(9, 72, i => [['bench', perfSet(i === 7 ? 80 : 100)]], 24)); ok(!one.chest.used, 'one poor session is not enough to change anything');
  // a broad dip across the whole session counts for much less on any one muscle
  const g4 = i => [['bench', perfSet(i % 4 === 3 ? 85 : 100)], ['squat', perfSet(i % 4 === 3 ? 85 : 100)], ['curl', perfSet(i % 4 === 3 ? 85 : 100)], ['pushdown', perfSet(i % 4 === 3 ? 85 : 100)]];
  const glob = CAL(series(14, 72, g4, 24)), solo = CAL(series(14, 72, i => [['bench', perfSet(i % 4 === 3 ? 85 : 100)]], 24));
  ok(solo.chest.slow > glob.chest.slow && glob.chest.slow <= solo.chest.slow * .3, 'the same dips across most exercises of one session (a bad day) count far less than a dip on one lift (' + glob.chest.slow + ' vs ' + solo.chest.slow + ')');
  // different setup / deliberately easy sets are not comparable
  const sigs = series(10, 30, i => [['bench', perfSet(100)]], 24); sigs.forEach((s, i) => { s.exercises[0].cv = { l: 'hand', n: i % 2 ? 1 : 2, rp: 'both' }; });
  ok(!CAL(sigs).chest || !CAL(sigs).chest.used, 'a changed setup / convention between sessions is not comparable evidence');
  const easy = series(10, 30, () => [['bench', perfSet(100, { rir: 4 })]], 24); ok(!CAL(easy).chest || !CAL(easy).chest.used, 'deliberately easy sets (RIR 4+) are not evidence');
  // compound lifts are not blamed on every contributor; muscles learn separately
  const comp = CAL(series(10, 24, () => [['row', perfSet(100)]], 24)); ok(!comp.back || !comp.back.used, 'a compound lift whose main muscle does under half of the work attributes to nobody');
  const arms = CAL(series(10, 24, () => [['curl', perfSet(100)]], 24)); ok(arms.arms && arms.arms.used && (!arms.chest || !arms.chest.used), 'biceps work teaches the arm region only (nothing drifts into chest)');
  // a long layoff / stale evidence
  const stale = CAL(series(10, 30, () => [['bench', perfSet(100)]], 24 * 130)); ok(stale.chest.reset && !stale.chest.used, 'evidence older than 90 days is not used and the window widens again');
  const wide = (cal) => { const t = C.trainingRecovery({ sessions: [...series(10, 30, () => [['bench', perfSet(100)]], 24 * 130), ses('y', 0, [['bench', sets(6)]])], ex, loadOf, now: NOW, calib: cal }).heads.chest_mid; return t.readyBy - t.readyFrom; };
  ok(wide(stale) > wide({}), 'after a long break the forecast window is wider (restored uncertainty)');
  // context sources: weights only qualify evidence; switching one off removes its influence exactly and deterministically
  const base = series(14, 72, i => [['bench', perfSet(i % 4 === 3 ? 86 : 100)]], 24);
  const poorDays = CAL(base, { ctxFor: () => 'poor' }), noCtx = CAL(base), off = CAL(base, { ctxFor: () => null });
  ok(poorDays.chest.slow < noCtx.chest.slow && JSON.stringify(off) === JSON.stringify(noCtx), 'a drop on a known poor-context day counts for less; opting the source out gives exactly the memory without it');
  ok(JSON.stringify(CAL(base)) === JSON.stringify(CAL(base)), 'the same history always gives the same memory');
  // corrections / duplicates / import replay
  const dup = [...base, ...base.map(s => ({ ...s }))]; ok(JSON.stringify(CAL(dup)) === JSON.stringify(CAL(base)), 'a duplicated session (restore / import twice) does not add observations');
  const edited = base.map((s, i) => i === 3 ? ses('s3', (14 - 1 - 3) * 72 + 24, [['bench', perfSet(100)]]) : s); ok(CAL(edited).chest.slow < CAL(base).chest.slow, 'editing a workout changes what is learned, deterministically');
  ok(CAL(base.filter((_, i) => i !== 3)).chest.informative <= CAL(base).chest.informative, 'deleting a workout never creates evidence');
  // usual timing is learned separately and never moves the forecast
  ok(cs.chest.usualGapH === 72 && cf.chest.usualGapH === 30, 'usual gym timing (median gap) is kept separately from recovery speed (' + cs.chest.usualGapH + ' h and ' + cf.chest.usualGapH + ' h)');
  // a next-day workout 23 h later counts when comparable
  const nd = CAL(series(12, 23, () => [['bench', perfSet(100)]], 24)); ok(nd.chest && nd.chest.informative >= 3, 'a next-day workout 23 h later is informative evidence when comparable');
  // bounded, inspectable
  ok(cf.chest.obs.length <= C.CFG.learn.keepObs && cf.chest.obs.every(o => o.kind && o.gapH > 0 && o.T > 0 && o.date), 'the memory keeps a few inspectable observations: date, exercise, kind, gap, dose-implied time');
}
// 14c. Forecast journal and evaluation: chronological, as issued, against a training-only comparator
{ const H2 = H, mkSes = (n, gapH) => Array.from({ length: n }, (_, i) => ses('j' + i, (n - 1 - i) * gapH + 24, [['bench', [set({ w: 100, r: 5 }), set({ w: 100, r: 5 }), set({ w: 100, r: 5 })]]]));
  const S = mkSes(14, 72), end = i => Date.parse(S[i].end);
  const entry = (i, pw, cw, extra) => ({ v: 1, at: end(i), hs: C.histHash(S, end(i)), cx: [], w: { chest_mid: [end(i) + pw[0] * H2, end(i) + pw[1] * H2, end(i) + cw[0] * H2, end(i) + cw[1] * H2] }, ...(extra || {}) });
  const EV = (entries, enabled = []) => C.evaluateJournal({ entries, sessions: S, ex, loadOf, now: NOW, enabled });
  const good = [5, 6, 7, 8, 9, 10].map(i => entry(i, [40, 60], [80, 90]));   // the next set came 72 h later and held: personal says ready by 60 h (right), comparator says not before 80 h (unnecessary delay)
  const r1 = EV(good); ok(r1.n === 6 && r1.personal.unnecessaryDelay === 0 && r1.comparator.unnecessaryDelay === 6 && r1.verdict === 'better', 'personal forecasts that were right while the comparator delayed: verdict better (' + r1.personal.score + ' vs ' + r1.comparator.score + ')');
  const wideP = [5, 6, 7, 8, 9, 10].map(i => entry(i, [10, 200], [40, 60]));
  const r2 = EV(wideP); ok(r2.verdict !== 'better' && r2.personal.meanWidthH > r2.comparator.meanWidthH, 'a wider range alone cannot win: inside the window counts against it (' + r2.verdict + ')');
  const early = [5, 6, 7, 8, 9, 10].map(i => entry(i, [10, 20], [40, 60])); S.forEach(() => 0);
  ok(EV(early).personal.tooEarly === 0, 'a muscle that held when the window said ready is not an error');
  ok(EV(good.slice(0, 2)).verdict === 'not_enough_evidence', 'a handful of forecasts is not enough to say anything');
  ok(EV([entry(5, [40, 60], [80, 90], { cx: ['sleep'] })]).ineligible.sourceOff === 1, 'a forecast issued with a context source that is now switched off is left out of future evaluation');
  const edited = S.slice(); edited[2] = { ...S[2], end: new Date(Date.parse(S[2].end) + 5 * H2).toISOString() };
  const r3 = C.evaluateJournal({ entries: good, sessions: edited, ex, loadOf, now: NOW, enabled: [] }); ok(r3.ineligible.obsolete === 6 && r3.n === 0, 'editing a workout before a forecast makes that forecast ineligible (obsolete); the saved prediction itself is untouched');
  const frozenEntry = JSON.stringify(good); EV(good); C.evaluateJournal({ entries: good, sessions: edited, ex, loadOf, now: NOW, enabled: [] }); ok(JSON.stringify(good) === frozenEntry, 'evaluation never rewrites an issued forecast');
  const untested = [entry(13, [40, 60], [40, 60])]; ok(EV(untested).ineligible.untested === 1 && EV(untested).n === 0, 'a forecast that no later informative set tested is not counted');
  const hist = C.journalEntry({ tr: TR(S), comparator: TR(S), sessions: S, now: NOW, cx: ['food'] }); ok(hist.v === 1 && hist.hs === C.histHash(S, NOW) && hist.cx.join() === 'food', 'a journal entry is minimal and versioned');
}

// 15. Nothing is changed: frozen inputs go through every function
{ const list = freeze([ses('a', 6, [['bench', sets(5)]])]), snapBefore = JSON.stringify(list);
  let threw = false; try{ const t = TR(list); C.assessWorkout(t, freeze({ at: NOW + H, exercises: ['bench'] }), ex); C.acuteFatigue({ active: freeze({ exercises: [{ exId: 'bench', sets: sets(2) }] }), ex, now: NOW }); }catch(e){ threw = e.message; }
  ok(!threw && JSON.stringify(list) === snapBefore, 'engine never writes to workouts / plans (frozen inputs pass) ' + (threw || '')); }

// 16. Anatomy data: 4 views, all 21 heads on each sex, renderer colours by head, crops, no rasters
{ const D = ctx.RA_DATA;
  ['m', 'f'].forEach(sx => { const ids = new Set([...D[sx].f.p, ...D[sx].b.p].map(p => p[0]));
    ok(C.HEADS21.every(h => ids.has(h)), `${sx === 'm' ? 'male' : 'female'}: all 21 head ids have paths`);
    ok([...ids].every(i => C.HEADS21.includes(i) || i === 'skin' || i === 'hair'), `${sx === 'm' ? 'male' : 'female'}: no invented ids`);
    ['f', 'b'].forEach(v => ok(D[sx][v].p.length > 50 && D[sx][v].sil && D[sx][v].hl.length === 3, `${sx}/${v}: real regions (${D[sx][v].p.length} paths), silhouette, highlights`)); });
  const front = ['chest_upper', 'chest_mid', 'abs', 'obliques', 'delt_front', 'biceps', 'forearms', 'adductors', 'quads'], backH = ['lats', 'delt_rear', 'triceps', 'hamstrings', 'glutes', 'calves', 'lower_back', 'traps'];
  ['m', 'f'].forEach(sx => { const f = new Set(D[sx].f.p.map(p => p[0])), b = new Set(D[sx].b.p.map(p => p[0]));
    ok(front.every(h => f.has(h)) && backH.every(h => b.has(h)), `${sx}: front shows chest/abs/obliques/front delts/biceps/forearms/adductors/quads; back shows lats/rear delts/triceps/hamstrings/glutes/calves/lower back/traps`); });
  const svg = ctx.recoveryAnatomySVG({ sex: 'f', view: 'both', colorsByHead: { biceps: '#ff6b5c', triceps: '#59d38c' }, idPrefix: 't' });
  ok(!/<image|data:image|\.png/.test(svg), 'renderer output has no raster image');
  ok(/data-h="biceps"/.test(svg) && /url\(#tgff6b5c\)/.test(svg), 'biceps paths get their own colour gradient');
  const cnt = (s, re) => (s.match(re) || []).length, plain = ctx.recoveryAnatomySVG({ sex: 'm', view: 'both', idPrefix: 'p' });
  ok(cnt(plain, /<radialGradient/g) === 1, 'no colours = one neutral gradient (unknown stays graphite)');
  C.GROUPS10.forEach(g => { const hs = C.HEADS21.filter(h => C.GROUP[h] === g); ['m', 'f'].forEach(sx => { const c = ctx.raCropFor(sx, hs);
    ok(c && c.box.every(isFinite) && c.box[2] > 0, `thumbnail crop for ${g} (${sx})`); }); });
  ok(!JSON.stringify(D).match(/vertebra|spine/i), 'no spine / vertebra shapes in the data'); }

console.log(`\n${n - fails}/${n} RECOVERY+ checks pass`);
process.exit(fails ? 1 : 0);
