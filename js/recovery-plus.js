// RECOVERY+ — the one owner of muscle recovery and, separately, overall readiness (docs/architecture/contracts.md › RECOVERY+).
// Offline, no AI, no network. Two parts:
//  • RecoveryCore: pure functions (no DOM, no globals) — tested in tools/recovery-test.js.
//      trainingRecovery()       local muscle recovery per head (21 heads) → 10 display groups, from finished workouts only
//      acuteFatigue()           short-term fatigue inside the live workout (kept apart; never written into recovery)
//      calibrate()              slow, bounded personal adjustment from comparable performances
//      evaluateSleepSupport()   sleep context (never changes muscle hours)
//      evaluateNutritionSupport() food context, goal-aware (never changes muscle hours; missing / partial logs = unknown)
//      assessWorkout()          a planned workout against the forecast head states → proceed / consider_adjustment / unknown
//      buildOverallReadiness(), buildDecisionInsight(), snapshot()
//  • RecoveryPlus: the app adapter — reads sessions / active / plan / food / goal through the existing globals, caches, and publishes
//      RecoveryPlus.snapshot() (recovery.v1, also the v:1 shape Gym Coach reads). Coaches explain it; they never recompute or overwrite it.
// All numbers below are product heuristics (labelled), not medical constants. Evidence notes: docs/architecture/recovery-plus.md.
const RecoveryCore = (() => {
  const ENGINE = 'recplus-2.0.0';
  const HEADS21 = ['chest_upper', 'chest_mid', 'chest_lower', 'delt_front', 'delt_side', 'delt_rear', 'lats', 'upper_back', 'traps', 'lower_back',
    'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'abductors', 'adductors', 'calves'];
  const GROUP = { chest_upper: 'chest', chest_mid: 'chest', chest_lower: 'chest', delt_front: 'shoulders', delt_side: 'shoulders', delt_rear: 'shoulders',
    lats: 'back', upper_back: 'back', traps: 'back', lower_back: 'back', biceps: 'arms', triceps: 'arms', forearms: 'arms', abs: 'core', obliques: 'core',
    quads: 'quads', hamstrings: 'hamstrings', glutes: 'glutes', abductors: 'glutes', adductors: 'adductors', calves: 'calves' };
  const GROUPS10 = ['chest', 'shoulders', 'back', 'arms', 'core', 'quads', 'hamstrings', 'glutes', 'adductors', 'calves'];
  const BIG = new Set(['chest_mid', 'chest_upper', 'lats', 'upper_back', 'lower_back', 'quads', 'hamstrings', 'glutes', 'adductors']);
  // ---- configurable heuristics (product choices; the base hours and the 80 % / 24 h rules are the app's existing, unchanged ones)
  const CFG = {
    windowH: 168,          // a workout older than 7 days leaves no residual local fatigue in this model
    readyAt: .2,           // "ready" = estimated residual fatigue ≤ 20 % (the existing ≥ 80 % recovered rule)
    needsRestH: 24,        // more than 24 h left = Needs Rest, 1–24 h = Recovering (existing rule)
    baseH: [48, 36],       // full-recovery time for ~3 hard sets: big / small heads (existing)
    perSetH: 7, maxH: 96,  // +7 h per extra effective hard set, at most 96 h (existing)
    loadFull: 6,           // effective hard sets at which a head's fatigue is "full"
    minLoad: .25,          // below this a head is not counted as trained in that workout
    significant: 25,       // % share of an exercise that makes a head matter for that exercise's warning
    primary: 40,           // % share that makes a head a primary mover
    dropChild: .4,         // a completed drop extension with no parent to compare with adds 40 % of a set; with a parent it is scaled by its real reps and load (dropPart)
    dropPart: { min: .15, max: .7, loadFloor: .4 },   // a completed extension is partial work: reps / parent reps x relative load, kept between 15 % and 70 % of a set
    // failure and RIR 0 are ONE effort signal (applied once, 1.30: provisional, kept until its effect on real histories is examined); an explicit RIR 2+ on a set
    // also marked failure is a contradiction: the set counts as a normal effort (and the reason is recorded). No drop-marker bonus: a marker alone adds nothing.
    // negatives: a deliberately logged extra-negative count adds 2.5 % per rep up to +10 %; the ordinary lowering phase is already part of every rep. Half reps: recorded, no hours.
    effort: { fail: 1.3, rir: [1.3, 1.15, 1, .9, .8], heavyReps: 1.08, lightReps: .85, negStep: .025, negCap: .1, eccentric: 1.15 },
    novelty: [1.15, 1.07, 1],  // first time / 1–2 times before / familiar (repeated-bout effect)
    relInt: { hi: .92, hiX: 1.06, lo: .6, loX: .85 },
    calib: { min: .85, max: 1.2, needN: 3, step: .04, days: 90 },
    // the ready WINDOW: earliest / latest ready time = the central estimate ± a share of its own length (time since the last relevant workout), the share set by how
    // much evidence there is: a first workout is broad (shown as days), little history wide, a calibrated group with logged effort tight. Stored as timestamps, so
    // the range does not drift or jump as time passes. Needs Rest (> 24 h left) can only show BEFORE the window opens; inside it the state is Recovering.
    spread: { first: .5, low: .35, moderate: .22, high: .12 },
    acuteHalfMin: 25,      // in-workout fatigue fades with a ~25 min half-life (separate from recovery)
    staleLogDays: 21,      // no logged workout for this long: "ready" only with low confidence
  };
  const isNum = x => typeof x === 'number' && isFinite(x);
  const ts = v => { const n = typeof v === 'number' ? v : Date.parse(v); return isFinite(n) ? n : NaN; };
  const sesEnd = s => { const e = ts(s.end); return isFinite(e) ? e : ts(s.start); };
  const headHours = (h, load) => Math.min(CFG.maxH, (BIG.has(h) ? CFG.baseH[0] : CFG.baseH[1]) + CFG.perSetH * Math.max(0, load - 3));
  const stateOfH = h => h > CFG.needsRestH ? 'needs_rest' : h > 0 ? 'recovering' : 'ready';
  const legacySt = st => ({ needs_rest: 'low', recovering: 'mid', ready: 'ok', unknown: 'unk' }[st] || 'unk');
  const CONF = ['unknown', 'low', 'moderate', 'high'], confMin = (a, b) => CONF[Math.min(CONF.indexOf(a), CONF.indexOf(b))];

  // valid muscle map of an exercise: { head: % } for the 21 heads only; null when the exercise has no usable mapping (unknown / custom without muscles)
  function muOf(ex){
    if(!ex || !ex.mu || typeof ex.mu !== 'object') return null;
    const out = {}; let n = 0;
    Object.entries(ex.mu).forEach(([h, v]) => { if(GROUP[h] && isNum(+v) && +v > 0){ out[h] = Math.min(100, +v); n++; } });
    return n ? out : null;
  }
  // effort of one finished set (0 = does not count): warm-ups 0; blank RIR = normal effort (never failure); an explicit RIR 0 and a failure mark are one signal.
  // A completed drop extension (z.drop) is partial work: scaled by its real reps and load against `parent` (the set it drops from) when that is known, else 40 %.
  // Left and right rows each count for their own side (sessionHeadLoads); a pair is one logical set per side.
  function setEffort(z, parent){
    if(!z || !z.done || z.type === 'W') return 0;
    const E = CFG.effort, rir = isNum(z.rir) ? Math.max(0, Math.round(z.rir)) : (isNum(+z.rir) && z.rir !== '' && z.rir != null ? Math.max(0, Math.round(+z.rir)) : null);
    const failMark = z.type === 'F' || rir === 0;
    let e = failMark ? (z.type === 'F' && rir != null && rir >= 2 ? 1 : E.fail) : rir == null ? 1 : E.rir[Math.min(4, rir)];
    const reps = +z.r || 0; if(reps >= 20) e *= E.lightReps; else if(reps > 0 && reps <= 5) e *= E.heavyReps;
    if(+z.ng > 0) e *= 1 + Math.min(E.negCap, E.negStep * Math.min(40, +z.ng));
    return (z.drop ? dropPart(z, parent) : 1) * e;
  }
  const effortConflict = z => !!z && z.type === 'F' && isNum(+z.rir) && z.rir !== '' && z.rir != null && +z.rir >= 2;
  function dropPart(z, parent){
    if(!parent || !(+parent.r > 0) || !(+z.r > 0)) return CFG.dropChild;
    const P = CFG.dropPart, repsF = Math.min(1, +z.r / +parent.r), loadF = +parent.w > 0 && +z.w > 0 ? Math.max(P.loadFloor, Math.min(1, +z.w / +parent.w)) : 1;
    return Math.max(P.min, Math.min(P.max, repsF * loadF * 1.0));
  }
  const e1 = (load, r) => r >= 1 && r <= 12 && load > 0 ? load * (1 + r / 30) : 0;

  // ---------------------------------------------------------------- history index (built once per data change)
  // ex(exId) → exercise record { mu, p, id, en, m }; loadOf(exId, w) → kg actually moved (bodyweight / assisted conventions)
  function indexHistory(sessions, ex, loadOf, setsOf){
    const SO = typeof setsOf === 'function' ? setsOf : x => x.sets || [];   // per-implement view of an exercise's sets (js/gym-lat.js › Lat.sets); default: as saved
    const list = (Array.isArray(sessions) ? sessions : []).filter(s => s && Array.isArray(s.exercises) && isFinite(sesEnd(s))).slice().sort((a, b) => sesEnd(a) - sesEnd(b));
    const byEx = {};   // exId → [{ end, best }]
    list.forEach(s => s.exercises.forEach(x => { if(!x || !x.exId) return; let best = 0;
      SO(x).forEach(z => { if(!z || !z.done || z.type === 'W' || z.drop || z.side === 'R') return; best = Math.max(best, e1(loadOf ? loadOf(x.exId, +z.w || 0) : (+z.w || 0), +z.r || 0)); });   // the Left row stands for a pair's comparable set
      (byEx[x.exId] = byEx[x.exId] || []).push({ end: sesEnd(s), best, sid: s.id }); }));
    return { list, byEx, setsOf: SO };
  }
  // per session per head: { load (the more fatigued side), L, R (each side's load), sets, rirSets, failSets, dropSets (parents marked as a drop set), dropExt (completed
  // drop extensions), halfReps / negs (recorded, informational), conflicts, ex:[ids] } + unknown exercises.
  // Left and right rows add to their own side only; a one-row (bilateral / compact) set adds to both sides. The head's load is the MORE fatigued side, so a pair of
  // equal sides is one logical set, and alternating which side works hardest does not build one imaginary side that did all the hardest work.
  function sessionHeadLoads(s, idx, ex, loadOf){
    const out = {}, unknown = [], end = sesEnd(s), SO = idx.setsOf || (x => x.sets || []);
    (s.exercises || []).forEach(x => {
      if(!x || !x.exId) return; const rec = ex(x.exId), mu = muOf(rec), S = SO(x);
      const counted = S.filter(z => setEffort(z) > 0);
      if(!counted.length) return;
      if(!mu){ if(!rec || rec.m !== 'cardio') unknown.push(x.exId); return; }
      const prior = (idx.byEx[x.exId] || []).filter(q => q.end < end - 6e4), recent = prior.filter(q => end - q.end <= 90 * 864e5);
      const nov = CFG.novelty[Math.min(2, prior.length >= 3 ? 2 : prior.length ? 1 : 0)];
      const ecc = /hinge|squat|lunge|rdl|split|nordic|bulgarian/i.test(`${rec.p || ''} ${x.exId}`) ? CFG.effort.eccentric : 1;
      const best = Math.max(0, ...recent.map(q => q.best));
      S.forEach((z, i) => { if(setEffort(z) <= 0) return;
        let parent = null; if(z.drop){ for(let k = i - 1; k >= 0; k--){ const q = S[k]; if(q && q.done && !q.drop && q.type !== 'W' && (q.side || null) === (z.side || null)){ parent = q; break; } } }
        let e = setEffort(z, parent) * nov * ecc;
        if(best > 0 && !z.drop){ const v = e1(loadOf ? loadOf(x.exId, +z.w || 0) : (+z.w || 0), +z.r || 0); if(v > 0){ const r = v / best; if(r >= CFG.relInt.hi) e *= CFG.relInt.hiX; else if(r < CFG.relInt.lo) e *= CFG.relInt.loX; } }
        const sides = z.side === 'L' ? [0] : z.side === 'R' ? [1] : [0, 1];
        Object.entries(mu).forEach(([h, pc]) => { const o = out[h] = out[h] || { load: 0, L: 0, R: 0, sets: 0, setsL: 0, setsR: 0, rirSets: 0, failSets: 0, dropSets: 0, dropExt: 0, halfReps: 0, negs: 0, conflicts: 0, ex: [] };
          sides.forEach(k => { o[k ? 'R' : 'L'] += pc / 100 * e; });
          if(pc >= 10){
            if(z.drop) o.dropExt++;
            else { sides.forEach(k => { o[k ? 'setsR' : 'setsL']++; }); if(z.rir != null && z.rir !== '') o.rirSets += 1 / sides.length; if(z.type === 'F' || (z.rir != null && z.rir !== '' && +z.rir === 0)) o.failSets += 1 / sides.length; if(z.type === 'D') o.dropSets += 1 / sides.length; if(effortConflict(z)) o.conflicts++; }
            if(+z.hr > 0) o.halfReps += +z.hr; if(+z.ng > 0) o.negs += +z.ng; }   // totals as logged: a compact set's count equals the sum of its two rows
          if(!o.ex.includes(x.exId)) o.ex.push(x.exId); }); });
    });
    Object.values(out).forEach(o => { o.load = Math.max(o.L, o.R); o.sets = Math.max(o.setsL, o.setsR); o.rirSets = Math.round(o.rirSets); o.failSets = Math.round(o.failSets); o.dropSets = Math.round(o.dropSets); });
    return { heads: out, unknown };
  }

  // ---------------------------------------------------------------- personal calibration (slow, bounded, needs repeated evidence)
  // Compares the same exercise across two workouts 24–120 h apart: the top estimated 1RM held (≥ 98 %) although the model expected the main
  // muscle to still be recovering → "recovers faster" evidence; it fell clearly (< 93 %) although the model expected it ready → "slower".
  // One poor day never decides: a group needs ≥ 3 such comparisons, and the factor moves 4 % per net comparison, between 0.85 and 1.2.
  function calibrate(idx, ex, now){
    const ev = {}, from = now - CFG.calib.days * 864e5;
    Object.entries(idx.byEx).forEach(([id, arr]) => {
      const mu = muOf(ex(id)); if(!mu) return; const [h, pc] = Object.entries(mu).sort((a, b) => b[1] - a[1])[0]; if(pc < CFG.primary) return;
      for(let i = 1; i < arr.length; i++){ const A = arr[i - 1], B = arr[i]; if(B.end < from || !(A.best > 0) || !(B.best > 0)) continue;
        const gap = (B.end - A.end) / 36e5; if(gap < 24 || gap > 120) continue;
        const expectedReady = gap >= headHours(h, 3) * (1 - CFG.readyAt);
        const g = GROUP[h], e = ev[g] = ev[g] || { fast: 0, slow: 0, n: 0 };
        if(!expectedReady && B.best >= A.best * .98){ e.fast++; e.n++; } else if(expectedReady && B.best < A.best * .93){ e.slow++; e.n++; } else e.n++; }
    });
    const out = {};
    Object.entries(ev).forEach(([g, e]) => { if(e.fast + e.slow < CFG.calib.needN){ out[g] = { f: 1, n: e.n, used: false }; return; }
      const f = Math.max(CFG.calib.min, Math.min(CFG.calib.max, 1 + CFG.calib.step * (e.slow - e.fast)));
      out[g] = { f: Math.round(f * 100) / 100, n: e.n, used: true }; });
    return out;
  }

  // ---------------------------------------------------------------- the ready window (earliest / latest ready time) and how it is said
  // state: Needs Rest only while the window has not opened and more than 24 h are left (the existing colour boundary, on the central estimate); once inside the
  // window it is at most Recovering ("likely ready within …"); past the latest time (or nothing to wait for) it is Ready
  function windowState(stC, now, from, by, trained){
    if(!trained) return 'ready';
    if(now >= by) return 'ready';
    if(now >= from) return 'recovering';
    return stC === 'ready' ? 'recovering' : stC;
  }
  // remaining hours as a [lowest, highest] pair, never negative, at least one hour apart
  function windowHours(from, by, now){ const a = Math.max(0, Math.round((from - now) / 36e5)), b = Math.max(a, Math.round((by - now) / 36e5)); return [a, b > a ? b : a + 1]; }
  // what to show for one head / group at time `now`, from the stored timestamps (so it is right after foregrounding or offline, and never negative):
  //   { kind: 'range', a, b } hours left between a and b · { kind: 'days', a, b } coarse (first workout or far away) · { kind: 'within', n } inside the window ·
  //   { kind: 'ready' } past the latest time · { kind: 'unknown' }
  function countdown(v, now){
    if(!v || v.state === 'unknown') return { kind: 'unknown' };
    if(!isFinite(v.readyBy) || now >= v.readyBy) return { kind: 'ready' };
    if(now >= v.readyFrom) return { kind: 'within', n: Math.max(1, Math.ceil((v.readyBy - now) / 36e5 - 1e-6)) };
    const [a, b] = windowHours(v.readyFrom, v.readyBy, now);
    if(v.coarse || b > 72){ const da = Math.max(1, Math.floor(a / 24 + .5)), db = Math.max(da, Math.ceil(b / 24 - 1e-6)); return { kind: 'days', a: da, b: db }; }
    return { kind: 'range', a, b };
  }

  // the same range as plain English for coaches / Athlete OS (they explain it; the numbers are the screen's)
  function windowText(v, now){ const c = countdown(v, isNum(now) ? now : Date.now());
    return c.kind === 'range' ? `ready in ${c.a}–${c.b} h` : c.kind === 'within' ? `likely ready within ${c.n} h` : c.kind === 'days' ? `ready in about ${c.a === c.b ? c.a : c.a + '–' + c.b} day${c.b > 1 ? 's' : ''}` : c.kind === 'ready' ? 'likely ready' : ''; }

  // ---------------------------------------------------------------- local muscle recovery
  // o: { sessions, ex, loadOf, now, calib? } → { heads, groups, evidence, unknownExercises, contrib }
  function trainingRecovery(o){
    const now = isNum(o.now) ? o.now : Date.now(), ex = o.ex, loadOf = o.loadOf;
    const idx = o.idx || indexHistory(o.sessions, ex, loadOf, o.setsOf), cal = o.calib || calibrate(idx, ex, now);
    const past = idx.list.filter(s => sesEnd(s) <= now + 6e4);
    const evidence = { sessionsTotal: past.length, recent14: past.filter(s => now - sesEnd(s) <= 14 * 864e5).length,
      lastAt: past.length ? sesEnd(past[past.length - 1]) : null };
    const contrib = {}, unknownExercises = new Set();
    past.filter(s => now - sesEnd(s) <= CFG.windowH * 36e5).forEach(s => {
      const r = sessionHeadLoads(s, idx, ex, loadOf); r.unknown.forEach(u => unknownExercises.add(u));
      Object.entries(r.heads).forEach(([h, v]) => { if(v.load < CFG.minLoad) return;
        const f = cal[GROUP[h]] && cal[GROUP[h]].used ? cal[GROUP[h]].f : 1;
        const sd = [v.L, v.R].map(l => ({ A: Math.min(1, l / CFG.loadFull), T: headHours(h, l) * f }));   // each side fades on its own clock
        (contrib[h] = contrib[h] || []).push({ sid: s.id, date: s.date, end: sesEnd(s), load: v.load, A: Math.min(1, v.load / CFG.loadFull), T: headHours(h, v.load) * f, sd, loadL: v.L, loadR: v.R,
          sets: v.sets, rirSets: v.rirSets, failSets: v.failSets, dropSets: v.dropSets, dropExt: v.dropExt, halfReps: v.halfReps, negs: v.negs, conflicts: v.conflicts, ex: v.ex, unknown: r.unknown.length > 0 }); }); });
    // fatigue of a head = its MORE fatigued side (several workouts add up per side, capped at 1); for equal sides this is exactly the one-number model
    const sideAt = (h, t, k) => Math.min(1, (contrib[h] || []).reduce((a, c) => a + c.sd[k].A * Math.max(0, 1 - (t - c.end) / 36e5 / c.sd[k].T), 0));
    const fatigueAt = (h, t) => Math.max(sideAt(h, t, 0), sideAt(h, t, 1));
    const heads = {};
    HEADS21.forEach(h => {
      const cs = contrib[h] || [];
      if(!evidence.sessionsTotal){ heads[h] = { state: 'unknown', hours: null, conf: 'unknown', p: null, reasons: ['no_workout_history'], source: 'unknown', contrib: [] }; return; }
      // the central time fatigue falls to the ready level: found on a FIXED absolute interval (from the last workout), so it is the same number whenever it is asked
      // (the window below is stored as timestamps and must not move with the clock). Nothing trained recently = nothing to wait for.
      let hi = now;
      if(cs.length){ const t0 = Math.max(...cs.map(c => c.end));
        if(fatigueAt(h, t0) <= CFG.readyAt) hi = t0;
        else { let lo = t0, up = t0 + 400 * 36e5; for(let i = 0; i < 48; i++){ const m = (lo + up) / 2; if(fatigueAt(h, m) <= CFG.readyAt) up = m; else lo = m; } hi = up; }
        if(hi < now && fatigueAt(h, now) > CFG.readyAt) hi = now; }
      const hours = Math.max(0, Math.ceil((hi - now) / 36e5 - 1e-6)), stC = stateOfH(hours), reasons = [];
      let conf = 'moderate';
      if(stC === 'ready'){
        if(!cs.length) reasons.push('not_trained_recently');
        else reasons.push('recovered_since_last_workout');
        if(!evidence.lastAt || now - evidence.lastAt > CFG.staleLogDays * 864e5){ conf = 'low'; reasons.push('no_recent_logs'); }
        else if(evidence.recent14 >= 3) conf = 'high';
      } else {
        const sets = cs.reduce((a, c) => a + c.sets, 0), rir = cs.reduce((a, c) => a + c.rirSets, 0);
        reasons.push(cs.length > 1 ? 'accumulated_sessions' : 'recent_training');
        if(cs.some(c => c.failSets)) reasons.push('failure_or_rir0');
        if(cs.some(c => c.dropSets)) reasons.push('drop_sets');
        if(cs.some(c => c.unknown)){ conf = 'low'; reasons.push('unmapped_exercise_in_session'); }
        else if(evidence.sessionsTotal < 3){ conf = 'low'; reasons.push('little_history'); }
        else if(sets && rir / sets >= .6 && cal[GROUP[h]] && cal[GROUP[h]].used) conf = 'high';
        if(!rir) reasons.push('rir_not_recorded');
        if(cal[GROUP[h]] && cal[GROUP[h]].used && cal[GROUP[h]].f !== 1) reasons.push(cal[GROUP[h]].f > 1 ? 'personal_slower' : 'personal_faster');
      }
      // the window and the state that follows it
      const lastEnd = cs.length ? Math.max(...cs.map(c => c.end)) : null, firstWorkout = evidence.sessionsTotal < 2;
      const centre = hi;   // when the central estimate crosses "ready" (already in the past for a muscle whose central time has gone by)
      const W = lastEnd == null ? 0 : Math.max(36e5, centre - lastEnd), sp = firstWorkout ? CFG.spread.first : CFG.spread[conf] || CFG.spread.low;
      const readyFrom = lastEnd == null ? now : centre - sp * W, readyBy = lastEnd == null ? now : centre + sp * W;
      const st = windowState(stC, now, readyFrom, readyBy, cs.length > 0);
      if(st === 'recovering' && stC === 'ready') reasons.push('inside_ready_window');
      heads[h] = { state: st, hours, conf, p: Math.round((1 - fatigueAt(h, now)) * 100) / 100, reasons, source: 'estimated',
        range: st === 'ready' ? [0, 0] : windowHours(readyFrom, readyBy, now), readyAt: hi, readyFrom, readyBy, coarse: firstWorkout && st !== 'ready', contrib: cs,
        side: Math.abs(sideAt(h, now, 0) - sideAt(h, now, 1)) > .02 ? (sideAt(h, now, 0) > sideAt(h, now, 1) ? 'L' : 'R') : null };
    });
    return { heads, groups: groupsOf(heads), evidence, unknownExercises: [...unknownExercises], calib: cal, fatigueAt, sideAt };
  }
  // a group shows its worst head; "which heads" is kept, so the page can say "Arms · Biceps" and a triceps exercise is judged by triceps only
  function groupsOf(heads){
    const rank = { unknown: -1, ready: 0, recovering: 1, needs_rest: 2 }, out = {};
    GROUPS10.forEach(g => { const hs = HEADS21.filter(h => GROUP[h] === g), known = hs.filter(h => heads[h].state !== 'unknown');
      if(!known.length){ out[g] = { state: 'unknown', hours: null, conf: 'unknown', heads: [], all: hs }; return; }
      const worst = known.reduce((a, h) => rank[heads[h].state] > rank[heads[a].state] || (rank[heads[h].state] === rank[heads[a].state] && heads[h].hours > heads[a].hours) ? h : a, known[0]);
      const not = known.filter(h => heads[h].state !== 'ready').sort((a, b) => heads[b].hours - heads[a].hours);
      out[g] = { state: heads[worst].state, hours: heads[worst].hours, conf: not.length ? not.map(h => heads[h].conf).reduce(confMin) : known.map(h => heads[h].conf).reduce(confMin),
        heads: not, all: hs, range: heads[worst].range, readyFrom: heads[worst].readyFrom, readyBy: heads[worst].readyBy, coarse: heads[worst].coarse }; });
    return out;
  }
  // head state at a future time (no new workouts assumed): hours left shrink with the clock
  function stateAt(tr, h, t){ const v = tr.heads[h]; if(!v || v.state === 'unknown') return { state: 'unknown', hours: null };
    const hrs = Math.max(0, Math.ceil((v.readyAt - t) / 36e5 - 1e-6)); return { state: stateOfH(hrs), hours: hrs }; }

  // ---------------------------------------------------------------- in-workout (acute) fatigue — separate from recovery
  function acuteFatigue(o){
    const a = o.active, now = isNum(o.now) ? o.now : Date.now(), out = {}; if(!a || !Array.isArray(a.exercises)) return out;
    const sides = {};   // head → [left, right]: the same per-side rule as the saved-workout dose; the live value is the more fatigued side
    a.exercises.forEach(x => { const mu = muOf(o.ex(x.exId)); if(!mu) return; const S = (o.setsOf ? o.setsOf(x) : x.sets) || [];
      S.forEach((z, i) => { let parent = null; if(z.drop){ for(let k = i - 1; k >= 0; k--){ const q = S[k]; if(q && q.done && !q.drop && q.type !== 'W' && (q.side || null) === (z.side || null)){ parent = q; break; } } }
        const e = setEffort(z, parent); if(!e) return; const at = isNum(z.at) ? z.at : now, mins = Math.max(0, (now - at) / 6e4), k = Math.pow(.5, mins / CFG.acuteHalfMin), ks = z.side === 'L' ? [0] : z.side === 'R' ? [1] : [0, 1];
        Object.entries(mu).forEach(([h, pc]) => { const v = sides[h] = sides[h] || [0, 0]; ks.forEach(j => { v[j] += pc / 100 * e * k; }); }); }); });
    Object.keys(sides).forEach(h => { out[h] = Math.max(sides[h][0], sides[h][1]); });
    Object.keys(out).forEach(h => { out[h] = Math.round((1 - Math.exp(-out[h] / 3)) * 100) / 100; });
    return out;
  }

  // ---------------------------------------------------------------- sleep context (never changes muscle hours or colours)
  // records: [{ start, end, kind: 'asleep' | 'in_bed' | 'self_report', source: 'manual' | 'wearable', rested? }] — stage fields are ignored on purpose
  function evaluateSleepSupport(o){
    const now = isNum(o.now) ? o.now : Date.now(), base = { evaluatedAt: now, observedNights: 0, sourceQuality: 'none', basis: 'none', confidence: 'unknown' };
    if(o.optOut) return { ...base, status: 'unknown', reasonCodes: ['opted_out'] };
    const recs = (o.records || []).map(r => ({ s: ts(r.start), e: ts(r.end), kind: r.kind || 'asleep', src: r.source === 'wearable' ? 'wearable' : 'manual' }))
      .filter(r => isFinite(r.s) && isFinite(r.e) && r.e > r.s && r.e <= now + 36e5 && r.e - r.s < 20 * 36e5 && r.kind === 'asleep');   // time in bed is not sleep
    if(!recs.length) return { ...base, status: 'unknown', reasonCodes: ['insufficient_sleep_data'] };
    // merge overlapping episodes (double syncs, two sources) — union of time, never added twice
    recs.sort((a, b) => a.s - b.s); const merged = [];
    recs.forEach(r => { const m = merged[merged.length - 1]; if(m && r.s <= m.e + 15 * 6e4){ m.e = Math.max(m.e, r.e); m.src = m.src === r.src ? m.src : 'mixed'; } else merged.push({ ...r }); });
    // main sleep per wake-up: episodes ≥ 3 h; shorter daytime ones are naps (context only, no "credit")
    const main = merged.filter(r => r.e - r.s >= 3 * 36e5), hrs = r => (r.e - r.s) / 36e5;
    const last28 = main.filter(r => now - r.e <= 28 * 864e5), last7 = main.filter(r => now - r.e <= 7 * 864e5), last4 = main.filter(r => now - r.e <= 4 * 864e5);
    const srcs = new Set(last7.map(r => r.src)), sourceQuality = srcs.size > 1 || srcs.has('mixed') ? 'mixed' : srcs.has('wearable') ? 'wearable' : 'manual';
    if(!last7.length) return { ...base, status: 'unknown', reasonCodes: ['sleep_data_stale'], observedNights: 0 };
    const sorted = last28.map(hrs).sort((a, b) => a - b), median = sorted.length >= 7 ? sorted[Math.floor(sorted.length / 2)] : null;
    const shortAt = median ? Math.min(6, median - 1.25) : 6;   // personal baseline when known; 6 h otherwise (7–9 h is general adult guidance, not a cut-off)
    const lastNight = last7[last7.length - 1], fresh = now - lastNight.e <= 20 * 36e5;
    const shortN = last4.filter(r => hrs(r) < shortAt).length, trend7 = last7.reduce((a, r) => a + hrs(r), 0) / last7.length;
    const res = { evaluatedAt: now, observedNights: last7.length, sourceQuality, lastNightHours: fresh ? Math.round(hrs(lastNight) * 10) / 10 : null,
      avg7: last7.length >= 3 ? Math.round(trend7 * 10) / 10 : null, baseline: median ? Math.round(median * 10) / 10 : null, lastUpdatedAt: lastNight.e };
    const qconf = sourceQuality === 'manual' ? 'low' : 'moderate';
    if(last4.length >= 3 && shortN >= 2) return { ...res, status: 'possible_concern', confidence: qconf, basis: 'duration_trend', reasonCodes: ['repeated_short_sleep'] };
    if(fresh && hrs(lastNight) < shortAt) return { ...res, status: 'possible_concern', confidence: 'low', basis: 'single_night', reasonCodes: ['short_sleep_single'] };
    return { ...res, status: 'supportive', confidence: last7.length >= 4 ? qconf : 'low', basis: last7.length >= 3 ? 'duration_trend' : 'single_night', reasonCodes: ['sleep_within_usual'] };
  }

  // ---------------------------------------------------------------- nutrition context (goal-aware; never changes muscle hours)
  // o: { days: { 'YYYY-MM-DD': { kcal, p, c, n, complete } }, today, targetFor(date) → { k, p, c } | null, goal, goalSince, bodyKg, weights: { date: kg },
  //      demand: { highVolumeRecent, nextDemandingInH }, optOut, now }
  // Rules: logged food is a LOWER BOUND; a day with nothing logged is unknown (not zero); today is incomplete until confirmed; deficiency or
  // energy-relation calls use only confirmed-complete days in the last 7, since the goal was last changed.
  const GOALS = { bulk: 'bulk', gain: 'bulk', recomp: 'recomp', cut: 'cut', lose: 'cut', maintain: 'maintain' };
  function evaluateNutritionSupport(o){
    const now = isNum(o.now) ? o.now : Date.now(), goal = GOALS[o.goal] || 'unknown';
    const out = { evaluatedAt: now, status: 'unknown', confidence: 'unknown', reasonCodes: [], protein: { status: 'unknown', eligibleDays: 0 },
      energy: { goal, observation: 'unknown', completeness: 'unknown' }, carbohydrate: { relevance: 'unknown', status: 'unknown' },
      coverage: { eligibleDays: 0, loggedDays: 0, windowDays: 7, rationale: 'complete_days_only' } };
    if(o.optOut){ out.reasonCodes.push('opted_out'); return out; }
    const today = o.today, days = o.days || {}, dates = [];
    for(let i = 1; i <= 7; i++){ const d = addD(today, -i); if(!o.goalSince || d >= o.goalSince) dates.push(d); }
    if(days[today] && days[today].complete) dates.unshift(today);
    const logged = dates.filter(d => days[d] && days[d].n > 0), complete = logged.filter(d => days[d].complete);
    out.coverage.loggedDays = logged.length; out.coverage.eligibleDays = complete.length; out.coverage.windowDays = dates.length;
    if(o.goalSince && o.goalSince > addD(today, -7)) out.reasonCodes.push('goal_changed_recently');
    const kg = isNum(o.bodyKg) && o.bodyKg > 30 ? o.bodyKg : null;
    const refP = d => { const tg = o.targetFor ? o.targetFor(d) : null; return tg && tg.p > 0 ? tg.p : kg ? 1.6 * kg : null; };
    // protein: enough recorded (lower bound) on most logged days → adequate; a gap only from complete days
    const pDays = logged.filter(d => refP(d)), okP = pDays.filter(d => days[d].p >= .9 * refP(d));
    const gapP = complete.filter(d => refP(d) && days[d].p < .8 * refP(d));
    out.protein.eligibleDays = complete.length;
    if(kg && logged.length) out.protein.observedGPerKg = Math.round(logged.reduce((a, d) => a + (days[d].p || 0), 0) / logged.length / kg * 10) / 10;
    out.protein.thresholdReference = kg ? '1.4-2.0 g/kg (ISSN 2017); your own target first' : 'own_target';
    if(okP.length >= 2 && okP.length >= Math.ceil(pDays.length / 2)) out.protein.status = 'adequate_observed';
    else if(complete.length >= 3 && gapP.length >= Math.ceil(complete.length * 2 / 3)){ out.protein.status = 'possible_gap'; out.reasonCodes.push('protein_pattern_low'); }
    if(days[today] && !days[today].complete && refP(today) && days[today].p >= refP(today)) out.reasonCodes.push('protein_today_recorded_adequate');
    // energy against the user's OWN target for the chosen goal (a planned deficit is normal on a cut)
    out.energy.completeness = complete.length >= 3 ? 'sufficient' : complete.length ? 'limited' : 'unknown';
    let rel = 'unknown';
    if(complete.length >= 3){ const r = complete.map(d => { const tg = o.targetFor && o.targetFor(d); return tg && tg.k > 0 ? days[d].kcal / tg.k : null; }).filter(isNum);
      if(r.length >= 3){ const m = r.reduce((a, b) => a + b, 0) / r.length; out.energy.ratio = Math.round(m * 100) / 100;
        rel = m < .9 ? 'below_target' : m > 1.1 ? 'above_target' : 'consistent_with_target'; out.energy.observation = rel;
        if(goal === 'cut' && m < .75) out.reasonCodes.push('sustained_energy_concern');
        if(goal === 'bulk' && m < .9) out.reasonCodes.push('goal_mismatch_bulk_low');
        if((goal === 'recomp' || goal === 'maintain' || goal === 'unknown') && m < .75) out.reasonCodes.push('sustained_energy_concern'); } }
    else if(logged.length) out.reasonCodes.push('incomplete_food_log');
    else out.reasonCodes.push('no_food_logged');
    // carbohydrate: only relevant with an observed demanding session and another one close behind
    const dmd = o.demand || {};
    out.carbohydrate.relevance = dmd.highVolumeRecent && isNum(dmd.nextDemandingInH) && dmd.nextDemandingInH <= 12 ? 'high_demand' : dmd.highVolumeRecent != null ? 'routine' : 'unknown';
    if(out.carbohydrate.relevance === 'high_demand') out.reasonCodes.push('rapid_refuelling_relevant');
    // weight trend (optional, only with enough weigh-ins)
    const ws = Object.entries(o.weights || {}).filter(([d, v]) => d <= today && d >= addD(today, -28) && +v > 30).sort((a, b) => a[0] < b[0] ? -1 : 1);
    let trend = 'unknown';
    if(ws.length >= 4 && dayDiff(ws[0][0], ws[ws.length - 1][0]) >= 10){ const h = Math.floor(ws.length / 2), a = ws.slice(0, h), b = ws.slice(h), av = x => x.reduce((s, [, v]) => s + +v, 0) / x.length;
      const pct = (av(b) - av(a)) / av(a) * 100; trend = pct > .5 ? 'increasing' : pct < -.5 ? 'decreasing' : 'stable'; }
    out.goalAssessment = { selectedGoal: goal, effectiveFrom: o.goalSince || undefined,
      observedEnergyRelation: rel, observedProteinPattern: out.protein.status === 'adequate_observed' ? 'adequate_observed' : out.protein.status === 'possible_gap' ? 'possible_gap' : 'unknown',
      evidenceDays: complete.length, evidenceCoverage: out.energy.completeness, estimatedWeightTrend: trend,
      confidence: complete.length >= 5 ? 'moderate' : complete.length >= 3 ? 'low' : 'unknown', reasonCodes: out.reasonCodes.filter(c => /goal|energy|protein/.test(c)), assessedAt: new Date(now).toISOString() };
    const concern = out.reasonCodes.some(c => c === 'protein_pattern_low' || c === 'sustained_energy_concern');
    out.status = concern ? 'possible_concern' : out.protein.status === 'adequate_observed' || rel === 'consistent_with_target' ? 'supportive' : 'unknown';
    out.confidence = concern || out.status === 'supportive' ? (complete.length >= 5 ? 'moderate' : 'low') : 'unknown';
    return out;
  }
  function addD(d, n){ const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
  function dayDiff(a, b){ return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }

  // ---------------------------------------------------------------- planned workout vs forecast (advice only)
  // plan: { at (ms), exercises: [exId] | null }. Per exercise only its significant heads count (a curl never warns a pushdown).
  function assessWorkout(tr, plan, ex){
    if(!plan || !isNum(plan.at)) return null;
    if(!tr.evidence.sessionsTotal) return { assessment: 'unknown', limiting: [], perExercise: [], suggestionCodes: ['log_workouts_for_estimates'] };
    if(!plan.exercises || !plan.exercises.length){
      const not = HEADS21.filter(h => stateAt(tr, h, plan.at).state === 'needs_rest');
      return { assessment: 'unknown', limiting: not, perExercise: [], suggestionCodes: not.length ? ['check_fatigued_muscles'] : ['no_exercise_list'] }; }
    const per = [], lim = {};
    plan.exercises.forEach(id => { const mu = muOf(ex(id)); if(!mu){ per.push({ exId: id, heads: [], unknown: true }); return; }
      const hs = Object.entries(mu).filter(([, pc]) => pc >= CFG.significant).map(([h, pc]) => ({ h, pc, ...stateAt(tr, h, plan.at) })).filter(x => x.state === 'recovering' || x.state === 'needs_rest');
      hs.forEach(x => { const l = lim[x.h] = lim[x.h] || { h: x.h, state: x.state, hours: x.hours, primary: 0, any: 0 }; l.any++; if(x.pc >= CFG.primary) l.primary++; });
      per.push({ exId: id, heads: hs.map(x => ({ h: x.h, state: x.state, hours: x.hours, share: x.pc })) }); });
    const limiting = Object.values(lim).sort((a, b) => (b.state === 'needs_rest') - (a.state === 'needs_rest') || b.primary - a.primary || b.hours - a.hours);
    const hardPrim = limiting.filter(l => l.state === 'needs_rest' && l.primary), recPrim = limiting.filter(l => l.primary);
    const exHit = per.filter(p => p.heads.some(x => x.state === 'needs_rest' && x.share >= CFG.primary)).length;
    let assessment = 'proceed'; const codes = [];
    if(hardPrim.length){ assessment = 'consider_adjustment'; codes.push(exHit >= Math.ceil(plan.exercises.length / 2) ? 'extra_rest_optional' : 'consider_alternative'); }
    else if(recPrim.length){ assessment = 'consider_adjustment'; codes.push('reduce_volume_optional'); }
    else if(limiting.length) codes.push('monitor_performance');
    else codes.push('train_as_planned');
    return { assessment, limiting: limiting.map(l => l.h), limitingDetail: limiting, perExercise: per, suggestionCodes: codes };
  }

  // ---------------------------------------------------------------- overall readiness and the one insight
  function buildOverallReadiness(tr, sleep, nutr, next){
    const reasons = []; let assessment = tr.evidence.sessionsTotal ? 'ready' : 'unknown';
    if(next && next.assessment === 'consider_adjustment'){ assessment = 'caution'; reasons.push('planned_muscles_fatigued'); }
    const demanding = next && next.perExercise && next.perExercise.length >= 3;
    if(sleep && sleep.status === 'possible_concern' && sleep.confidence !== 'low' && sleep.confidence !== 'unknown'){ reasons.push('sleep_pattern'); if(demanding) assessment = assessment === 'unknown' ? 'caution' : 'caution'; }
    if(nutr && nutr.reasonCodes && nutr.reasonCodes.includes('sustained_energy_concern') && nutr.confidence !== 'unknown') reasons.push('energy_support');
    const confidence = assessment === 'unknown' ? 'unknown' : tr.evidence.recent14 >= 3 ? 'moderate' : 'low';
    return { assessment, confidence, reasons, cautionScope: assessment === 'caution' ? (next ? 'next_session' : 'whole_workout') : assessment === 'unknown' ? 'unknown' : 'none' };
  }
  // at most ONE optional insight, never a copy of the decision card: sleep / food context first when it is well supported, then goal context
  function buildDecisionInsight(o){
    const { sleep, nutr, next, recentCodes } = o, c = [];
    const demanding = next && next.perExercise && next.perExercise.length >= 3;
    if(sleep && sleep.status === 'possible_concern' && sleep.basis === 'duration_trend' && demanding) c.push({ code: 'insight_sleep_short', topic: 'sleep' });
    if(nutr){ const r = nutr.reasonCodes || [], g = nutr.energy && nutr.energy.goal;
      if(r.includes('sustained_energy_concern')) c.push({ code: g === 'cut' ? 'insight_cut_energy_low' : 'insight_energy_low', topic: 'food' });
      if(r.includes('protein_pattern_low')) c.push({ code: 'insight_protein_gap', topic: 'food' });
      if(r.includes('goal_mismatch_bulk_low')) c.push({ code: 'insight_bulk_low', topic: 'food' });
      if(r.includes('rapid_refuelling_relevant')) c.push({ code: 'insight_carbs_turnaround', topic: 'food' });
      if(g === 'cut' && nutr.energy.observation === 'below_target' && !r.includes('sustained_energy_concern') && nutr.protein.status === 'adequate_observed') c.push({ code: 'insight_cut_ok', topic: 'food' });
      if(g === 'recomp' && nutr.protein.status === 'adequate_observed' && nutr.coverage.eligibleDays >= 3) c.push({ code: 'insight_recomp_ok', topic: 'food' }); }
    const pick = c.find(x => !(recentCodes || []).includes(x.code)) || null;   // a tip already shown on the last days steps aside
    return pick;
  }

  // ---------------------------------------------------------------- the published snapshot (recovery.v1; also the v:1 shape Gym Coach reads)
  const fingerprint = s => { let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };   // FNV-1a, no crypto needed
  function snapshot(o){
    const { tr, sleep, nutr, next, plan, readiness, acute, now, shareSleep, shareFood } = o;
    const head = {}; HEADS21.forEach(h => { const v = tr.heads[h];
      head[h] = { state: v.state, confidence: v.conf, remainingHoursRange: v.state !== 'unknown' && v.state !== 'ready' ? v.range : undefined, readyWindow: v.state !== 'unknown' && v.state !== 'ready' ? { from: Math.round(v.readyFrom), by: Math.round(v.readyBy), coarse: !!v.coarse } : undefined, reasons: v.reasons.slice(), source: v.source }; });
    const groups = {}; GROUPS10.forEach(g => { const v = tr.groups[g];
      groups[g] = { state: v.state === 'unknown' ? 'unknown' : v.state === 'ready' ? 'ready' : 'recovering', detail: v.state, hoursLeft: v.hours, conf: v.conf, heads: v.heads.slice(),
        ...(v.state !== 'unknown' && v.state !== 'ready' && isFinite(v.readyBy) ? { readyFrom: Math.round(v.readyFrom), readyBy: Math.round(v.readyBy), coarse: !!v.coarse } : {}) }; });
    const fresh = tr.evidence.lastAt && now - tr.evidence.lastAt <= 14 * 864e5 ? 'current' : tr.evidence.lastAt ? 'stale' : 'unknown';
    const s = { v: 1, version: 'recovery.v1', at: now, generatedAt: new Date(now).toISOString(), engineVersion: ENGINE, dataFreshness: fresh,
      groups, muscleHeads: head,
      readiness: { level: readiness.assessment === 'caution' ? 'reduced' : readiness.assessment === 'ready' ? 'normal' : 'unknown', conf: readiness.confidence, why: readiness.reasons.join(', ') },
      overall: { assessment: readiness.assessment, confidence: readiness.confidence, reasons: readiness.reasons.slice() },
      provenance: { observedWorkouts: tr.evidence.sessionsTotal > 0, selfReportAvailable: false, optionalSleepAvailable: !!(sleep && sleep.observedNights) },
      support: { evaluatedAt: new Date(now).toISOString(), overallReadinessReasons: readiness.reasons.slice(), cautionScope: readiness.cautionScope } };
    if(next && plan) s.nextWorkout = { workoutId: plan.id || '', scheduledAt: new Date(plan.at).toISOString(), assessment: next.assessment, limitingMuscles: next.limiting.slice(), suggestionCodes: next.suggestionCodes.slice() };
    if(acute && Object.keys(acute).length) s.activeSession = { acuteFatigueByHead: acute, kind: 'estimated' };
    if(sleep && shareSleep !== false) s.support.sleep = { status: sleep.status, confidence: sleep.confidence, observedNights: sleep.observedNights, reasons: sleep.reasonCodes.slice(),
      sourceKind: sleep.sourceQuality === 'none' ? 'none' : sleep.sourceQuality, freshness: sleep.observedNights ? 'current' : 'unknown' };
    if(nutr && shareFood !== false) s.support.nutrition = { status: nutr.status, confidence: nutr.confidence, eligibleCompletedDays: nutr.coverage.eligibleDays, reasons: nutr.reasonCodes.slice(),
      goalContext: nutr.energy.goal, goalAssessment: nutr.goalAssessment, freshness: nutr.coverage.loggedDays ? 'current' : 'unknown' };
    // validUntil: when a muscle state next changes with time alone (a head reaches ready, or Needs Rest turns Recovering at 24 h left), at most 10 min ahead,
    // so a consumer that caches the snapshot refreshes in time. snapshotId: a short fingerprint of what it says (not the time), so a consumer can show
    // which version it received and tell a real change from a re-read.
    const edges = []; HEADS21.forEach(h => { const v = tr.heads[h]; if(v.state === 'unknown' || v.state === 'ready') return; if(v.hours > 0){ edges.push(v.hours); if(v.hours > 24) edges.push(v.hours - 24); }
      [v.readyFrom, v.readyBy].forEach(t => { const d = (t - now) / 36e5; if(d > 0) edges.push(d); }); });
    s.validUntil = now + Math.min(10 * 6e4, ...edges.filter(x => x > 0).map(x => x * 36e5 + 1000));
    s.snapshotId = 'r1-' + fingerprint(JSON.stringify([groups, Object.entries(head).map(([h, v]) => h + v.state), s.readiness.level, s.nextWorkout || null, s.support.nutrition ? s.support.nutrition.status : '', s.support.sleep ? s.support.sleep.status : '']));
    return s;
  }
  return { ENGINE, CFG, HEADS21, GROUP, GROUPS10, muOf, windowState, windowHours, countdown, windowText, setEffort, indexHistory, sessionHeadLoads, calibrate, trainingRecovery, stateAt, acuteFatigue,
    evaluateSleepSupport, evaluateNutritionSupport, assessWorkout, buildOverallReadiness, buildDecisionInsight, snapshot, legacySt, headHours };
})();

// ================================================================ app adapter (reads the app's globals; nothing here writes saved data)
const RecoveryPlus = (() => {
  const C = RecoveryCore, g = n => { try{ return (0, eval)(n); }catch(e){ return undefined; } };
  let cache = null, dirty = true;
  const DEPS = new Set(['sessions', 'exCustom', 'gymPlan', 'tpls', 'days', 'dayLog', 'targets', 'weights', 'profile', 'settings']);
  if(typeof Store !== 'undefined' && Store.onChange) Store.onChange(name => { if(DEPS.has(name)) dirty = true; });
  function invalidate(){ dirty = true; }
  const exFn = id => { try{ const x = exById(id); return x && x.m === 'other' && !(x.mu && Object.keys(x.mu).length) ? null : x; }catch(e){ return null; } };
  const loadFn = (id, w) => { try{ return loadOf(id, w); }catch(e){ return +w || 0; } };
  const setsFn = x => { try{ return typeof Lat === 'object' ? Lat.sets(x) : (x.sets || []); }catch(e){ return x.sets || []; } };   // per-implement weights (a typed total is read per bell); the saved sets are untouched
  // opt-outs (device setting, Settings › AI › RECOVERY+ data; default on): no read, no publish when off
  const useFood = () => !(typeof settings !== 'undefined' && settings && settings.recNoFood);
  const useSleep = () => !(typeof settings !== 'undefined' && settings && settings.recNoSleep);
  // next scheduled workout from the planner (never invented): today if its time has not passed and no workout is logged today, else the next 7 days
  function nextPlan(now){
    if(typeof planFor !== 'function' || typeof todayKey !== 'function') return null;
    const tk = todayKey();
    for(let i = 0; i <= 7; i++){ const d = addDays(tk, i), p = planFor(d); if(!p || p.type !== 'gym') continue;
      if(i === 0 && (typeof sessions !== 'undefined' && sessions.some(s => s.date === d))) continue;
      const at = new Date(`${d}T${p.time || '18:00'}:00`).getTime(); if(i === 0 && at < now - 2 * 36e5) continue;
      const tp = p.tpl && typeof tpls !== 'undefined' && tpls ? tpls.find(x => x.id === p.tpl) : null;
      return { id: tp ? tp.id : '', name: tp ? tp.name : '', date: d, time: p.time || '18:00', at, exercises: tp ? tp.exercises.map(e => e.exId).filter(id => !(exFn(id) && exFn(id).m === 'cardio')) : null }; }
    return null;
  }
  function foodDays(today){
    const out = {}, L = typeof dayLog !== 'undefined' ? dayLog : {}, D = typeof days !== 'undefined' ? days : {};
    for(let i = 0; i <= 8; i++){ const d = addDays(today, -i), es = Array.isArray(L[d]) ? L[d] : [];
      out[d] = { n: es.length, kcal: es.reduce((a, e) => a + (+e.kcal || 0), 0), p: es.reduce((a, e) => a + (+e.p || 0), 0), c: es.reduce((a, e) => a + (+e.c || 0), 0),
        complete: !!(D[d] && D[d].foodDone) }; }   // days[d].foodDone: an explicit "finished logging" mark, only if the app ever records one
    return out;
  }
  function demand(now, next){
    const S = typeof sessions !== 'undefined' ? sessions : [], last = S.slice().sort((a, b) => String(b.end || b.start).localeCompare(String(a.end || a.start)))[0];
    if(!last) return { highVolumeRecent: null };
    const sets = (last.exercises || []).reduce((a, x) => a + (x.sets || []).filter(z => C.setEffort(z) > 0).length, 0), endAt = Date.parse(last.end || last.start);
    return { highVolumeRecent: now - endAt <= 24 * 36e5 && (sets >= 20 || +last.mins >= 75), nextDemandingInH: next && next.exercises && next.exercises.length >= 4 ? (next.at - now) / 36e5 : null };
  }
  function compute(now){
    now = now || Date.now();
    if(cache && !dirty && now - cache.base.at < 10 * 6e4 && cache.base.day === todayKey()) return derive(cache.base, now);
    const S = typeof sessions !== 'undefined' ? sessions : [];
    const idx = C.indexHistory(S, exFn, loadFn, setsFn), calib = C.calibrate(idx, exFn, now);
    const tk = todayKey(), tg = typeof targets !== 'undefined' ? targets : null;
    const next = nextPlan(now);
    const sleep = C.evaluateSleepSupport({ records: useSleep() ? sleepRecords() : [], optOut: !useSleep(), now });
    const nutr = C.evaluateNutritionSupport({ optOut: !useFood(), days: useFood() ? foodDays(tk) : {}, today: tk, targetFor: d => { try{ const x = targetFor(d); return x ? { k: +x.k, p: +x.p, c: +x.c } : null; }catch(e){ return null; } },
      goal: tg && tg.goal, goalSince: tg && tg.goalAt, bodyKg: typeof bodyW === 'function' ? bodyW() : null, weights: typeof weights !== 'undefined' ? weights : {}, demand: demand(now, next), now });
    cache = { base: { at: now, day: tk, idx, calib, next, sleep, nutr } }; dirty = false;
    return derive(cache.base, now);
  }
  // time-dependent part: cheap, recomputed on every read
  function derive(b, now){
    const tr = C.trainingRecovery({ idx: b.idx, calib: b.calib, ex: exFn, loadOf: loadFn, setsOf: setsFn, now });
    const nextA = b.next ? C.assessWorkout(tr, b.next, exFn) : null;
    const readiness = C.buildOverallReadiness(tr, b.sleep, b.nutr, nextA);
    const act = typeof active !== 'undefined' && active ? C.acuteFatigue({ active, ex: exFn, setsOf: setsFn, now }) : {};
    return { tr, next: b.next, nextA, sleep: b.sleep, nutr: b.nutr, readiness, acute: act, now };
  }
  // sleep: no sleep source exists in the app today (no watch / Health link; watchSleepHours() was always null). Athlete OS or a future
  // Health adapter may hand records here; nothing is invented.
  function sleepRecords(){ const f = g('athleteSleepRecords'); try{ return typeof f === 'function' ? (f() || []) : []; }catch(e){ return []; } }
  // next = the planned workout's assessment, plan = the planned workout (before: the plan was passed as `next`, so with any planned workout the
  // snapshot threw and Gym Coach / Athlete OS silently fell back to the old estimate)
  function snapshot(){ const r = compute(); return C.snapshot({ ...r, next: r.nextA, plan: r.next, shareSleep: useSleep(), shareFood: useFood() }); }
  // the legacy map shape every older caller understands: { group: { h, st: 'ok' | 'mid' | 'low' | 'unk', col, p, heads } }
  function legacyMap(){ const r = compute(), out = {};
    C.GROUPS10.forEach(gr => { const v = r.tr.groups[gr]; const st = C.legacySt(v.state), h = v.hours || 0;
      out[gr] = { h, st, col: st === 'unk' ? null : recColor(h), p: v.state === 'unknown' ? null : Math.min(...v.all.map(x => r.tr.heads[x].p)), heads: v.heads.slice(), conf: v.conf }; });
    return out; }
  return { compute, snapshot, legacyMap, invalidate, nextPlan };
})();
