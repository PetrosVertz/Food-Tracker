// Beta profiler (pre-release builds): quietly keeps a small log on this device and builds one detailed, readable report of the person's profile,
// habits, training, food and RECOVERY+ behaviour, to export from Settings › User Profile (Beta). It only READS the app's data (never writes it),
// keeps its own small bounded log in Store 'profiler' (device only, never in backups), and sends nothing anywhere: the person taps Export.
// The report is for the owner to read with Claude: summary lines first ("what stands out"), then the numbers, then the recovery forecast journal.
const Profiler = (() => {
  const KEEP_FORECASTS = 120, KEEP_ERRORS = 30, KEEP_DAYS = 120;
  // read-only access to the app's globals by name (no eval); a missing one is simply undefined
  const GL = {
    profile: () => typeof profile === 'undefined' ? undefined : profile,
    weights: () => typeof weights === 'undefined' ? undefined : weights,
    targets: () => typeof targets === 'undefined' ? undefined : targets,
    settings: () => typeof settings === 'undefined' ? undefined : settings,
    ui: () => typeof ui === 'undefined' ? undefined : ui,
    dayLog: () => typeof dayLog === 'undefined' ? undefined : dayLog,
    foods: () => typeof foods === 'undefined' ? undefined : foods,
    meals: () => typeof meals === 'undefined' ? undefined : meals,
    fridge: () => typeof fridge === 'undefined' ? undefined : fridge,
    supps: () => typeof supps === 'undefined' ? undefined : supps,
    logPhr: () => typeof logPhr === 'undefined' ? undefined : logPhr,
    foodFix: () => typeof foodFix === 'undefined' ? undefined : foodFix,
    sessions: () => typeof sessions === 'undefined' ? undefined : sessions,
    exCustom: () => typeof exCustom === 'undefined' ? undefined : exCustom,
    tpls: () => typeof tpls === 'undefined' ? undefined : tpls,
    gymPlan: () => typeof gymPlan === 'undefined' ? undefined : gymPlan };
  const g = n => { try{ return GL[n] ? GL[n]() : undefined; }catch(e){ return undefined; } };
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
  const r1 = v => v === null || v === undefined ? null : Math.round(v * 10) / 10;
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const dayKey = ms => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  // ---------- the small log ----------
  const blank = () => ({ v: 1, since: Date.now(), opens: {}, errors: [], forecasts: [], workouts: [] });
  const load = () => { const m = Store.load('profiler', null); return m && m.v === 1 ? m : blank(); };
  const save = m => { try{ Store.save('profiler', m); }catch(e){} };

  // a compact copy of RECOVERY+ as it was issued at this moment (so the app can later be checked against what really happened)
  function forecastNow(why){
    try{
      if(typeof RecoveryPlus === 'undefined' || !RecoveryPlus.snapshot) return null;
      const s = RecoveryPlus.snapshot(); if(!s || s.v !== 1) return null;
      const groups = {}; Object.entries(s.groups || {}).forEach(([k, v]) => { groups[k] = { st: v.state, d: v.detail, h: v.hoursLeft === undefined ? null : r1(v.hoursLeft), c: v.conf || null }; });
      const heads = {}; Object.entries(s.muscleHeads || {}).forEach(([k, v]) => { if(v.state !== 'ready' && v.state !== 'unknown') heads[k] = { st: v.state, r: v.remainingHoursRange || null, c: v.confidence || null }; });
      return { at: Date.now(), why, eng: s.engineVersion || null, fresh: s.dataFreshness || null, groups, heads,
        ready: s.readiness ? { l: s.readiness.level, c: s.readiness.conf } : null, overall: s.overall ? { a: s.overall.assessment, c: s.overall.confidence } : null,
        next: s.nextWorkout ? { at: s.nextWorkout.scheduledAt, a: s.nextWorkout.assessment, lim: s.nextWorkout.limitingMuscles || [] } : null,
        sleep: s.support && s.support.sleep ? s.support.sleep.status || null : null, food: s.support && s.support.nutrition ? s.support.nutrition.status || null : null };
    }catch(e){ return null; }
  }

  function tick(why){   // app start / back to the app: count the open, and keep a forecast at most every 6 hours
    try{
      const m = load(), k = dayKey(Date.now());
      m.opens[k] = (m.opens[k] || 0) + 1;
      Object.keys(m.opens).sort().slice(0, -KEEP_DAYS).forEach(d => delete m.opens[d]);
      const last = m.forecasts[m.forecasts.length - 1];
      if(!last || Date.now() - last.at > 6 * 3600e3){ const f = forecastNow(why || 'open'); if(f) m.forecasts.push(f); }
      m.forecasts = m.forecasts.slice(-KEEP_FORECASTS); save(m);
    }catch(e){}
  }
  function afterWorkout(ses){   // right after a workout is finished: what RECOVERY+ says now, and what the workout was
    try{
      const m = load(), f = forecastNow('workout'); if(f) m.forecasts.push(f);
      m.forecasts = m.forecasts.slice(-KEEP_FORECASTS);
      m.workouts.push({ at: Date.now(), id: ses && ses.id, sets: ses ? (ses.exercises || []).reduce((a, x) => a + x.sets.length, 0) : 0 });
      m.workouts = m.workouts.slice(-60); save(m);
    }catch(e){}
  }
  function logError(msg, src){ try{ const m = load(); m.errors.push({ at: Date.now(), msg: String(msg).slice(0, 200), src: String(src || '').slice(0, 120) }); m.errors = m.errors.slice(-KEEP_ERRORS); save(m); }catch(e){} }
  if(typeof window !== 'undefined' && window.addEventListener){
    window.addEventListener('error', e => logError(e.message, (e.filename || '').split('/').pop() + ':' + e.lineno));
    window.addEventListener('unhandledrejection', e => logError('promise: ' + (e.reason && e.reason.message || e.reason), ''));
    document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') tick('visible'); });
  }

  // ---------- the report ----------
  const SEX = { m: 'male', f: 'female' };
  function body(){
    const p = g('profile') || {}, w = g('weights') || {}, keys = Object.keys(w).sort(), vals = keys.map(k => num(w[k] && w[k].kg !== undefined ? w[k].kg : w[k])).filter(v => v !== null);
    const lastK = keys[keys.length - 1], d30 = keys.filter(k => k >= dayKey(Date.now() - 30 * 864e5)), v30 = d30.map(k => num(w[k] && w[k].kg !== undefined ? w[k].kg : w[k])).filter(v => v !== null);
    return { sex: SEX[p.sex] || p.sex || null, heightCm: num(p.height), birth: p.birth || p.birthYear || null, weighIns: keys.length, firstWeighIn: keys[0] || null, lastWeighIn: lastK || null,
      weightKgNow: vals.length ? r1(vals[vals.length - 1]) : null, weightKgFirst: vals.length ? r1(vals[0]) : null, change30dKg: v30.length > 1 ? r1(v30[v30.length - 1] - v30[0]) : null,
      gymStyle: p.gymStyle || null, gymTime: p.gymTime || null, gymReps: p.gymReps || null, rankPick: p.rankPick || null, realStart: p.realStart || null, ormEntries: Array.isArray(p.orm) ? p.orm.length : (p.orm ? Object.keys(p.orm).length : 0) };
  }
  function goals(){
    const t = g('targets') || {}, pick = o => o ? { kcal: num(o.kcal), p: num(o.p), c: num(o.c), f: num(o.f) } : null;
    return { gym: pick(t.gym), rest: pick(t.rest), mode: t.mode || t.goal || null, raw: Object.keys(t).filter(k => !['gym', 'rest'].includes(k)).slice(0, 8).reduce((a, k) => (a[k] = typeof t[k] === 'object' ? '[object]' : t[k], a), {}) };
  }
  function settingsSummary(){
    const s = g('settings') || {}, u = g('ui') || {}, G = s.gx || {};
    return { language: u.lang || null, units: u.units || null, timeFormat: u.timeFmt || 'system', weekPlannerAdvanced: !!u.wpAdv, recoveryAdvanced: !!u.recAdv, tabsUse: u.use || null,
      exerciseSettingsMode: s.gxMode || 'unset', exerciseSettings: G, perExerciseOverrides: s.gxEx ? Object.keys(s.gxEx).length : 0, recoveryPlus: s.recoveryPlus || s.recovery || null, coach: s.coach ? { ...s.coach, memoryText: undefined } : null };
  }
  function food(){
    const log = g('dayLog') || {}, days = Object.keys(log).filter(d => (log[d] || []).length).sort(), n = days.length, tot = d => (log[d] || []).reduce((s, e) => ({ kcal: s.kcal + (+e.kcal || 0), p: s.p + (+e.p || 0), c: s.c + (+e.c || 0), f: s.f + (+e.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
    const within = k => days.filter(d => d >= dayKey(Date.now() - k * 864e5)), last14 = within(14).map(tot).filter(t => t.kcal > 0);
    const entries = days.reduce((a, d) => a + log[d].length, 0);
    const first = days[0], span = first ? Math.max(1, Math.round((Date.now() - new Date(first + 'T12:00:00')) / 864e5) + 1) : 0;
    return { daysLogged: n, firstDay: first || null, lastDay: days[n - 1] || null, share: span ? r1(n / span) : null, last7: within(7).length, last30: within(30).length, last90: within(90).length, entriesPerLoggedDay: n ? r1(entries / n) : null,
      avgLast14: last14.length ? { days: last14.length, kcal: Math.round(avg(last14.map(t => t.kcal))), p: Math.round(avg(last14.map(t => t.p))), c: Math.round(avg(last14.map(t => t.c))), f: Math.round(avg(last14.map(t => t.f))) } : null,
      library: { foods: (g('foods') || []).length, meals: (g('meals') || []).length, fridge: (g('fridge') || []).length, supplements: (g('supps') || []).length },
      usesQuickLogAI: Object.keys(g('logPhr') || {}).length, foodFixes: Object.keys(g('foodFix') || {}).length };
  }
  function training(){
    const ses = (g('sessions') || []).slice().sort((a, b) => (a.start || '').localeCompare(b.start || '')), n = ses.length;
    const exOf = id => { try{ return exById(id); }catch(e){ return null; } };
    const real = s => (s.exercises || []).filter(x => { const e = exOf(x.exId); return !(e && e.m === 'cardio'); });
    const wk = {}; ses.forEach(s => { const d = new Date((s.date || '') + 'T12:00:00'); if(isNaN(d)) return; const m = new Date(d); m.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const k = dayKey(m.getTime()); wk[k] = (wk[k] || 0) + 1; });
    const weeks12 = Object.keys(wk).sort().slice(-12).map(k => wk[k]);
    const allSets = ses.flatMap(s => real(s).flatMap(x => x.sets.filter(z => z.done !== false).map(z => ({ ...z, exId: x.exId, dt: s.date, uni: !!x.uni }))));
    const work = allSets.filter(z => z.type !== 'W'), pct = (a, b) => b ? Math.round(100 * a / b) : null;
    const byEx = {}; ses.forEach(s => real(s).forEach(x => { const o = byEx[x.exId] || (byEx[x.exId] = { sessions: 0, sets: 0, topKg: 0, topReps: 0, first: s.date, last: s.date }); o.sessions++; o.sets += x.sets.filter(z => z.type !== 'W').length; o.last = s.date;
      x.sets.filter(z => z.type !== 'W').forEach(z => { if(+z.w > o.topKg || (+z.w === o.topKg && +z.r > o.topReps)){ o.topKg = +z.w || 0; o.topReps = +z.r || 0; } }); }));
    const top = Object.entries(byEx).sort((a, b) => b[1].sets - a[1].sets).slice(0, 25).map(([id, o]) => { const e = exOf(id); return { id, name: e ? e.en : id, ...o }; });
    const muscles = {}, since = dayKey(Date.now() - 28 * 864e5);
    ses.filter(s => s.date >= since).forEach(s => real(s).forEach(x => { const e = exOf(x.exId); if(!e || !e.mu) return; const n2 = x.sets.filter(z => z.type !== 'W').length; Object.entries(e.mu).forEach(([h, p]) => { muscles[h] = r1((muscles[h] || 0) + n2 * p / 100); }); }));
    const mins = ses.map(s => +s.mins).filter(v => v > 0);
    const rests = real({ exercises: ses.flatMap(s => s.exercises || []) }).map(x => +x.rest).filter(v => v > 0);
    const gaps = []; for(let i = 1; i < ses.length; i++){ const a = new Date(ses[i - 1].start), b = new Date(ses[i].start); if(!isNaN(a) && !isNaN(b)) gaps.push((b - a) / 36e5); }
    return { sessions: n, first: ses[0] ? ses[0].date : null, last: ses[n - 1] ? ses[n - 1].date : null, sessionsLast28d: ses.filter(s => s.date >= since).length, perWeekLast12: weeks12, avgPerWeek: r1(avg(weeks12)),
      avgMinutes: mins.length ? Math.round(avg(mins)) : null, avgWorkingSetsPerSession: n ? r1(work.length / n) : null, hoursBetweenSessions: { avg: r1(avg(gaps)), min: gaps.length ? r1(Math.min(...gaps)) : null, under30h: gaps.filter(h => h < 30).length },
      annotationUse: { rirPct: pct(work.filter(z => z.rir !== undefined && z.rir !== '').length, work.length), halfRepsPct: pct(work.filter(z => +z.hr > 0).length, work.length), negativesPct: pct(work.filter(z => +z.ng > 0).length, work.length),
        failurePct: pct(work.filter(z => z.type === 'F').length, work.length), dropPct: pct(work.filter(z => z.drop).length, work.length), warmUpSetsPct: pct(allSets.filter(z => z.type === 'W').length, allSets.length), leftRightPct: pct(work.filter(z => z.side).length, work.length) },
      setsByMuscleLast28d: muscles, topExercises: top, customExercises: (g('exCustom') || []).length, templates: (g('tpls') || []).length, plannedDays: Object.keys(g('gymPlan') || {}).length, typicalRestSeconds: rests.length ? Math.round(avg(rests)) : null,
      prs: ses.reduce((a, s) => a + ((s.prs || []).length), 0), volumeKgTotal: Math.round(ses.reduce((a, s) => a + (+s.vol || 0), 0)) };
  }
  // each forecast RECOVERY+ issued vs when that muscle group was really trained next (and how many hours early/late against the forecast)
  function forecastCheck(m){
    const ses = (g('sessions') || []).filter(s => s.start).map(s => ({ t: new Date(s.start).getTime(), s })).filter(o => !isNaN(o.t)).sort((a, b) => a.t - b.t);
    const grp = id => { try{ const e = exById(id); return e && e.m; }catch(e){ return null; } };
    const rows = [];
    m.forecasts.forEach(f => Object.entries(f.groups || {}).forEach(([gname, v]) => {
      if(v.st !== 'recovering' || v.h === null || v.h === undefined) return;
      const ready = f.at + v.h * 3600e3, next = ses.find(o => o.t > f.at && o.s.exercises.some(x => grp(x.exId) === gname && x.sets.some(z => z.done && z.type !== 'W')));
      rows.push({ issued: new Date(f.at).toISOString(), group: gname, hoursLeft: v.h, conf: v.c, nextTrainedAt: next ? new Date(next.t).toISOString() : null,
        trainedHoursBeforeReady: next ? r1((ready - next.t) / 3600e3) : null, status: next ? (next.t < ready ? 'trained_before_ready' : 'trained_after_ready') : (Date.now() > ready ? 'ready_not_trained_yet' : 'still_recovering') });
    }));
    const tested = rows.filter(r => r.trainedHoursBeforeReady !== null);
    return { issued: m.forecasts.length, groupRows: rows.slice(-60), trainedBeforeReady: tested.filter(r => r.trainedHoursBeforeReady > 0).length, trainedAfterReady: tested.filter(r => r.trainedHoursBeforeReady <= 0).length,
      note: 'trained_before_ready means the person trained the muscle group again earlier than the app said it would be ready. Whether that session went well is NOT known from this table; compare with the feel notes and the set numbers.' };
  }
  function recovery(m){
    let now = null; try{ now = forecastNow('report'); }catch(e){}
    return { engine: now ? now.eng : null, snapshotNow: now, journalDays: [...new Set(m.forecasts.map(f => dayKey(f.at)))].length, check: forecastCheck(m),
      recent: m.forecasts.slice(-12) };
  }

  // ---------- is the app helping? (outcomes over time; indicators, never proof) ----------
  const sesSorted = () => (g('sessions') || []).filter(s => s.start).slice().sort((a, b) => a.start.localeCompare(b.start));
  const e1 = (w, r, id) => { try{ const v = e1rm(+w, +r, id); return isFinite(v) && v > 0 ? v : null; }catch(e){ return null; } };
  const isCardioEx = id => { try{ return exById(id).m === 'cardio'; }catch(e){ return false; } };
  const trend = (a, b) => a && b ? r1(100 * (b - a) / a) : null;
  function liftSeries(){   // best estimated 1RM per workout for each frequently trained lift (warm-ups, drops and cardio left out)
    const by = {}; sesSorted().forEach(s => (s.exercises || []).forEach(x => { if(isCardioEx(x.exId)) return;
      const best = Math.max(0, ...x.sets.filter(z => z.done !== false && z.type !== 'W' && !z.drop && z.side !== 'R').map(z => e1(z.w, z.r, x.exId) || 0)); if(best > 0) (by[x.exId] || (by[x.exId] = [])).push({ d: s.date, v: best }); }));
    return Object.entries(by).filter(([, a]) => a.length >= 4).sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([id, a]) => {
      const first = avg(a.slice(0, 3).map(z => z.v)), last = avg(a.slice(-3).map(z => z.v)), best = Math.max(...a.map(z => z.v)), recent = a.slice(-4).map(z => z.v), plateau = a.length >= 6 && Math.max(...recent) < best * 1.005 && Math.max(...recent) <= avg(a.slice(-8, -4).map(z => z.v)) * 1.01;
      let name = id; try{ name = exById(id).en; }catch(e){}
      return { id, name, workouts: a.length, from: a[0].d, to: a[a.length - 1].d, e1rmFirst3Avg: r1(first), e1rmLast3Avg: r1(last), changePct: trend(first, last), bestE1rm: r1(best), plateau: !!plateau, series: a.slice(-12).map(z => [z.d, r1(z.v)]) }; });
  }
  function monthly(){
    const out = {}; sesSorted().forEach(s => { const k = (s.date || '').slice(0, 7); if(!k) return; const o = out[k] || (out[k] = { workouts: 0, workingSets: 0, volumeKg: 0, prs: 0, minutes: 0 });
      o.workouts++; o.workingSets += (s.exercises || []).reduce((a, x) => a + (isCardioEx(x.exId) ? 0 : x.sets.filter(z => z.type !== 'W').length), 0); o.volumeKg += +s.vol || 0; o.prs += (s.prs || []).length; o.minutes += +s.mins || 0; });
    return Object.keys(out).sort().slice(-8).map(k => ({ month: k, ...out[k], volumeKg: Math.round(out[k].volumeKg) }));
  }
  function consistency(){
    const ses = sesSorted(), wkOf = d => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dayKey(x.getTime()); };
    const cur = wkOf(dayKey(Date.now())), weeks = new Set(ses.map(s => wkOf(s.date))), back = n => { const x = new Date(cur + 'T12:00:00'); x.setDate(x.getDate() - 7 * n); return dayKey(x.getTime()); };
    const count = (from, to) => { let c = 0; for(let i = from; i < to; i++) if(weeks.has(back(i))) c++; return c; };
    const plan = Object.keys(g('gymPlan') || {}).filter(k => (g('gymPlan')[k] || {}).tpl && g('gymPlan')[k].tpl !== 'rest').length;
    return { weeksTrainedLast12: count(1, 13), weeksTrainedPrev12: count(13, 25), plannedGymDaysPerWeek: plan || null, streak: (() => { try{ return typeof Streak !== 'undefined' && Streak.summary ? Streak.summary() : null; }catch(e){ return null; } })() };
  }
  function nutritionOutcome(){
    const log = g('dayLog') || {}, t = g('targets') || {}, days = Object.keys(log).filter(d => (log[d] || []).length && d >= dayKey(Date.now() - 30 * 864e5)).sort(); if(!days.length) return null;
    const di = d => { try{ return dayInfo(d); }catch(e){ return {}; } }, tg = d => (t[di(d).type === 'gym' ? 'gym' : 'rest']) || null;
    let kOk = 0, pOk = 0, n = 0; days.forEach(d => { const T = tg(d); if(!T || !T.kcal) return; const tot = log[d].reduce((a, e) => ({ k: a.k + (+e.kcal || 0), p: a.p + (+e.p || 0) }), { k: 0, p: 0 }); n++; if(Math.abs(tot.k - T.kcal) <= T.kcal * .1) kOk++; if(T.p && tot.p >= T.p * .9) pOk++; });
    return n ? { daysChecked: n, kcalWithin10pctOfTarget: Math.round(100 * kOk / n), proteinAtLeast90pctOfTarget: Math.round(100 * pOk / n), note: 'Only days with food logged; unlogged days are unknown, not counted as misses.' } : null;
  }
  // did training a muscle group before RECOVERY+ said "ready" go worse than usual? compares the main lifts of that workout with the person's own recent norm
  function earlyRetestOutcomes(chk){
    const ses = sesSorted(), rows = [];
    (chk.groupRows || []).filter(r => r.status === 'trained_before_ready' && r.nextTrainedAt).forEach(r => {
      const s = ses.find(o => new Date(o.start).toISOString() === r.nextTrainedAt); if(!s) return; const before = ses.filter(o => o.start < s.start);
      (s.exercises || []).forEach(x => { let grp = null; try{ grp = exById(x.exId).m; }catch(e){} if(grp !== r.group) return;
        const now = Math.max(0, ...x.sets.filter(z => z.done !== false && z.type !== 'W' && !z.drop && z.side !== 'R').map(z => e1(z.w, z.r, x.exId) || 0));
        const prev = before.slice(-6).map(o => (o.exercises || []).find(y => y.exId === x.exId)).filter(Boolean).map(y => Math.max(0, ...y.sets.filter(z => z.done !== false && z.type !== 'W' && !z.drop && z.side !== 'R').map(z => e1(z.w, z.r, x.exId) || 0))).filter(v => v > 0);
        if(now > 0 && prev.length >= 3){ const norm = avg(prev); rows.push({ group: r.group, exercise: x.exId, hoursBeforeReady: r.trainedHoursBeforeReady, e1rmVsOwnRecentNormPct: r1(100 * (now - norm) / norm) }); } }); });
    const worse = rows.filter(z => z.e1rmVsOwnRecentNormPct < -5).length;
    return { tested: rows.length, clearlyWorse: worse, rows: rows.slice(-20), note: rows.length ? 'e1rmVsOwnRecentNormPct below about -5 on an early retest would suggest the forecast was right to warn; around 0 or above suggests it was too cautious. One session is weak evidence.' : 'No early retests with enough history yet.' };
  }
  function progress(m, chk){
    const lifts = liftSeries(), months = monthly(), cons = consistency(), nut = nutritionOutcome(), early = earlyRetestOutcomes(chk), b = body(), ind = [];
    const ch = lifts.map(l => l.changePct).filter(v => v !== null);
    if(ch.length >= 2){ const up = ch.filter(v => v > 2).length, down = ch.filter(v => v < -2).length; ind.push({ what: 'strength', value: `${up} of ${ch.length} main lifts up, ${down} down (est. 1RM, first 3 vs last 3 workouts)`, verdict: up > down ? 'improving' : down > up ? 'declining' : 'flat' }); }
    else ind.push({ what: 'strength', value: 'fewer than 2 lifts with 4+ workouts', verdict: 'not enough data' });
    if(cons.weeksTrainedLast12 + cons.weeksTrainedPrev12 >= 4) ind.push({ what: 'consistency', value: `${cons.weeksTrainedLast12} of the last 12 weeks trained vs ${cons.weeksTrainedPrev12} of the 12 before`, verdict: cons.weeksTrainedLast12 > cons.weeksTrainedPrev12 ? 'improving' : cons.weeksTrainedLast12 < cons.weeksTrainedPrev12 ? 'declining' : 'flat' });
    else ind.push({ what: 'consistency', value: 'under 24 weeks of history', verdict: 'not enough data' });
    if(nut) ind.push({ what: 'nutrition', value: `kcal within 10% of target on ${nut.kcalWithin10pctOfTarget}% of logged days, protein ≥90% on ${nut.proteinAtLeast90pctOfTarget}%`, verdict: nut.proteinAtLeast90pctOfTarget >= 70 ? 'improving' : 'flat' });
    if(early.tested >= 3) ind.push({ what: 'recovery advice', value: `${early.clearlyWorse} of ${early.tested} early retests were clearly worse than his own norm`, verdict: early.clearlyWorse / early.tested >= .5 ? 'warnings were useful' : early.clearlyWorse === 0 ? 'warnings looked too cautious' : 'mixed' });
    else ind.push({ what: 'recovery advice', value: `${early.tested} early retests with enough history`, verdict: 'not enough data' });
    return { sinceFirstWorkout: sesSorted()[0] ? sesSorted()[0].date : null, strengthByLift: lifts, monthly: months, consistency: cons, nutritionOutcome: nut, earlyRetests: early, weight: { now: b.weightKgNow, first: b.weightKgFirst, change30dKg: b.change30dKg }, indicators: ind,
      caution: 'Indicators show direction only. Strength can rise from learning the lift, weight from water, and a flat month may be a deload. They do not prove the app caused anything; compare with how he says he feels.' };
  }
  function who(r){   // an accurate plain description of the person from what he actually did (not what he said)
    const t = r.training, f = r.food, b = r.body, mus = Object.entries(t.setsByMuscleLast28d || {}).sort((a, c) => c[1] - a[1]), total = mus.reduce((a, z) => a + z[1], 0) || 1;
    const hrs = {}; sesSorted().forEach(s => { const h = new Date(s.start).getHours(); const k = h < 11 ? 'morning' : h < 16 ? 'midday' : h < 21 ? 'evening' : 'night'; hrs[k] = (hrs[k] || 0) + 1; });
    const when = Object.entries(hrs).sort((a, c) => c[1] - a[1])[0];
    return { sex: b.sex, heightCm: b.heightCm, weightKg: b.weightKgNow, trainingExperienceInApp: t.sessions ? `${t.sessions} workouts since ${t.first}` : 'none',
      typicalWeek: `${t.avgPerWeek ?? '?'} workouts, ${t.avgMinutes ?? '?'} min, ${t.avgWorkingSetsPerSession ?? '?'} working sets each`, usualTrainingTime: when ? when[0] : null,
      mostTrainedMuscles28d: mus.slice(0, 4).map(([h, v]) => `${h} ${Math.round(100 * v / total)}%`), leastTrainedMuscles28d: mus.slice(-3).map(([h, v]) => `${h} ${Math.round(100 * v / total)}%`),
      detailLevel: { food: f.daysLogged >= 21 && f.last30 >= 20 ? 'logs food most days' : f.daysLogged ? 'logs food sometimes' : 'does not log food', workouts: t.sessions >= 20 ? 'logs workouts regularly' : 'few workouts logged', effortAnnotations: (t.annotationUse.rirPct || 0) >= 50 ? 'records RIR' : 'rarely records RIR' },
      featuresActuallyUsed: Object.entries(r.features).filter(([, v]) => v).map(([k]) => k) };
  }
  function observations(r){
    const o = [], f = r.food, t = r.training, b = r.body;
    if(!t.sessions) o.push('No workouts logged yet.'); else o.push(`${t.sessions} workouts logged, about ${t.avgPerWeek ?? '?'} per week over the last 12 weeks; last on ${t.last}.`);
    if(f.daysLogged < 7) o.push(`Food is barely logged (${f.daysLogged} day(s)): nutrition-based readiness will stay unknown.`); else o.push(`Food logged on ${f.last30} of the last 30 days (${f.daysLogged} days in total).`);
    if(t.annotationUse.rirPct !== null && t.annotationUse.rirPct < 20) o.push(`RIR is rarely recorded (${t.annotationUse.rirPct}% of working sets): RECOVERY+ treats it as neutral, so it cannot refine recovery from effort.`);
    if(t.hoursBetweenSessions.under30h) o.push(`${t.hoursBetweenSessions.under30h} gaps between workouts were under 30 hours, which makes early retests possible.`);
    if(!b.weighIns) o.push('No weigh-ins: bodyweight-based exercises and ranks use a default weight.'); else if(b.change30dKg !== null) o.push(`Bodyweight changed ${b.change30dKg} kg over the last 30 days.`);
    if(r.recovery.check.issued < 3) o.push('Too few RECOVERY+ forecasts saved yet to say anything about accuracy.');
    else o.push(`Of ${r.recovery.check.trainedBeforeReady + r.recovery.check.trainedAfterReady} forecasts later tested by a workout, ${r.recovery.check.trainedBeforeReady} were trained before the forecast ready time.`);
    (r.progress ? r.progress.indicators : []).forEach(i => o.push(`Is the app helping? ${i.what}: ${i.value} → ${i.verdict}.`));
    if(r.log.errors.length) o.push(`${r.log.errors.length} app error(s) were caught on this device; see log.errors.`);
    return o;
  }
  function report(){
    const m = load(), r = { kind: 'food-tracker-beta-profile', schema: 1, generatedAt: new Date().toISOString(), app: { version: typeof VERSION === 'undefined' ? null : VERSION, language: (g('ui') || {}).lang || null,
        timezone: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || null, screen: typeof screen === 'object' ? screen.width + 'x' + screen.height : null, standalone: !!(typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) },
      loggingSince: new Date(m.since).toISOString() };
    r.body = body(); r.goals = goals(); r.settings = settingsSummary(); r.food = food(); r.training = training();
    r.recovery = recovery(m);
    r.progress = progress(m, r.recovery.check);
    r.log = { opensPerDay: m.opens, errors: m.errors, workoutsFinishedSinceLogging: m.workouts.length };
    r.features = { weekPlannerAdvanced: r.settings.weekPlannerAdvanced, usesTemplates: r.training.templates > 0, usesCustomExercises: r.training.customExercises > 0, logsFood: r.food.daysLogged > 0, logsWeight: r.body.weighIns > 0,
      usesRank: !!(r.body.rankPick || (g('profile') || {}).rankSeason), usesRIR: (r.training.annotationUse.rirPct || 0) > 0, usesDrops: (r.training.annotationUse.dropPct || 0) > 0, usesLeftRight: (r.training.annotationUse.leftRightPct || 0) > 0 };
    r.who = who(r);
    r.observations = observations(r);
    r.howToRead = 'Observations first, then the numbers. recovery.check compares each issued RECOVERY+ forecast with the next time that muscle group was trained. Missing data means unknown, not bad. Nothing here was changed by the profiler.';
    return r;
  }
  // a plain-text version for the screen in Settings (short)
  function text(r){ r = r || report(); const L = ['Observations'].concat(r.observations.map(s => '• ' + s));
    L.push('', `Workouts: ${r.training.sessions} · Food days: ${r.food.daysLogged} · Weigh-ins: ${r.body.weighIns} · RECOVERY+ forecasts saved: ${r.recovery.check.issued}`); return L.join('\n'); }
  async function exportFile(){
    const r = report(), blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }), name = 'foodtracker-beta-profile-' + dayKey(Date.now()) + '.json';
    try{ return await Phone.shareFile(blob, name); }catch(e){ if(e && e.name === 'AbortError') return 'cancelled'; Phone.download(blob, name); return 'downloaded'; }
  }
  return { tick, afterWorkout, report, text, exportFile, forecastNow, logError };
})();
