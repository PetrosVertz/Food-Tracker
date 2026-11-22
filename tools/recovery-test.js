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
  ok(L({ side: 'R' }) === 0 && L({ side: 'L' }) === 1, 'L/R pair counts once (on the L half)');
  ok(Math.abs(L({ drop: true }) - .4) < 1e-9, 'a drop under a set counts 40 %, not a full set');
  ok(L({ type: 'D' }) > L({}), 'a drop set counts a little more');
  ok(C.setEffort({ done: true, w: 'abc', r: null }) === 1 && isFinite(C.setEffort({ done: true, rir: 'x' })), 'odd values do not produce NaN'); }

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
  ok(!JSON.stringify(s).includes('kcal'), 'no raw food diary in the snapshot'); }

// 14. Personal calibration: slow, bounded, needs repeated evidence
{ const mk = (k, gapH, best) => Array.from({ length: k }, (_, i) => ses('c' + i, (k - i) * gapH, [['bench', [set({ w: best, r: 5 })]]]));
  const one = C.calibrate(C.indexHistory(mk(2, 30, 100), ex, loadOf), ex, NOW);
  ok(!one.chest || !one.chest.used, 'one comparison never changes anything');
  const many = C.calibrate(C.indexHistory(mk(6, 30, 100), ex, loadOf), ex, NOW);
  ok(many.chest && many.chest.used && many.chest.f < 1 && many.chest.f >= C.CFG.calib.min, 'repeated strong performance while "recovering": a bit faster, within bounds'); }

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
