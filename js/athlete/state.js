// Athlete OS · state: one read-only view of the athlete, built from the app's OWN records. It stores nothing.
// Food Track · Gym Buddy — plain browser script. The records stay where they are (dayLog, sessions, targets, weights, days, gymPlan,
// profile, foodFix, aiKnow …) and their owners stay the only writers. This file reads them through the owners' functions
// (dayTotals, targetFor, dayInfo, recMapNow …) so no rule is written twice.
//
// get(slice) → plain object, cached until an event says one of its sources changed (AthleteEvents), the day changes, or its ttl ends.
// Every fact says what kind of fact it is, so a coach never mistakes an estimate for a measurement:
//   measured   recorded by the user as it happened (a finished workout, a weigh-in, a logged food)
//   reported   set or said by the user (targets, plan, profile, goal)
//   calculated worked out by the app from records (totals, recovery hours, trends)
//   inferred   a guess by the app (a schedule guessed from last week)
// Missing data stays missing: a field is null / absent, never a default (bodyW() falls back to 75 kg for the UI; this file does not).

const AthleteState = (() => {
  const DAY = 864e5, ver = {}, cache = {}, stats = { builds: 0, hits: 0 };
  // the app's globals, looked up by name at call time (top-level let/const of other scripts are shared but not on window); undefined when absent
  const G = {
    profile: () => typeof profile !== 'undefined' ? profile : undefined,
    lang: () => typeof lang !== 'undefined' ? lang : undefined,
    todayKey: () => typeof todayKey !== 'undefined' ? todayKey : undefined,
    weights: () => typeof weights !== 'undefined' ? weights : undefined,
    targets: () => typeof targets !== 'undefined' ? targets : undefined,
    dayLog: () => typeof dayLog !== 'undefined' ? dayLog : undefined,
    dayTotals: () => typeof dayTotals !== 'undefined' ? dayTotals : undefined,
    targetFor: () => typeof targetFor !== 'undefined' ? targetFor : undefined,
    dayInfo: () => typeof dayInfo !== 'undefined' ? dayInfo : undefined,
    sessions: () => typeof sessions !== 'undefined' ? sessions : undefined,
    active: () => typeof active !== 'undefined' ? active : undefined,
    isMainSet: () => typeof isMainSet !== 'undefined' ? isMainSet : undefined,
    hitsFrom: () => typeof hitsFrom !== 'undefined' ? hitsFrom : undefined,
    HEADS: () => typeof HEADS !== 'undefined' ? HEADS : undefined,
    RecoveryPlus: () => typeof RecoveryPlus !== 'undefined' ? RecoveryPlus : undefined,
    recMapNow: () => typeof recMapNow !== 'undefined' ? recMapNow : undefined,
    recMap: () => typeof recMap !== 'undefined' ? recMap : undefined,
    logFix: () => typeof logFix !== 'undefined' ? logFix : undefined,
    kitchenOn: () => typeof kitchenOn !== 'undefined' ? kitchenOn : undefined,
    liveItems: () => typeof liveItems !== 'undefined' ? liveItems : undefined,
    Streak: () => typeof Streak !== 'undefined' ? Streak : undefined,
  };
  const g = n => G[n] ? G[n]() : undefined;
  const num = v => v === '' || v === null || v === undefined || !isFinite(+v) ? null : +v;
  const r0 = v => v == null ? null : Math.round(v), r1_ = v => v == null ? null : Math.round(v * 10) / 10;
  const today = () => (g('todayKey') || (() => new Date().toLocaleDateString('en-CA')))();
  const addD = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
  const ago = d => Math.round((new Date(today() + 'T12:00:00') - new Date(d + 'T12:00:00')) / DAY);

  // ---- the slices: deps = Store names that change it; day = rebuilt when the date changes; ttl = ms (time-dependent values) ----
  const SLICES = {
    identity: { deps: ['profile'], fn(){ const p = g('profile') || {};
      return { sex: p.sex === 'm' || p.sex === 'f' ? p.sex : null, heightCm: num(p.height) > 0 ? num(p.height) : null, age: num(p.age) > 0 ? num(p.age) : null,
        lang: g('lang') || null, kind: 'reported', src: 'profile' }; } },

    body: { deps: ['weights', 'targets'], fn(){
      const w = g('weights') || {}, ds = Object.keys(w).filter(d => num(w[d]) > 30).sort();
      if(!ds.length){ const tb = num((g('targets') || {}).bw); return { weightKg: null, targetBodyKg: tb, kind: 'reported', src: 'targets' }; }
      const last = ds[ds.length - 1], from = ds.filter(d => ago(d) <= 56), out = { weightKg: num(w[last]), weighedOn: last, ageDays: ago(last), kind: 'measured', src: 'weights' };
      if(from.length >= 2){ const a = from[0], b = from[from.length - 1], wk = Math.max(1, (ago(a) - ago(b)) / 7);
        if(ago(a) - ago(b) >= 7) out.trend = { kgPerWeek: r1_((num(w[b]) - num(w[a])) / wk), weeks: Math.round(wk), kind: 'calculated' }; }
      return out; } },

    goals: { deps: ['targets'], fn(){ const tg = g('targets');
      if(!tg) return { goal: null };
      const pick = x => x ? { kcal: r0(num(x.k)), protein: r0(num(x.p)), carbs: r0(num(x.c)), fat: r0(num(x.f)) } : null;
      return { goal: tg.goal || null, gymDay: pick(tg.gym), restDay: pick(tg.rest), kind: 'reported', src: 'targets' }; } },

    // today's eating: totals are calculated from the diary; the target is the user's for today's day type
    nutrition: { deps: ['dayLog', 'targets', 'days', 'gymPlan', 'sessions'], day: true, fn(){
      const d = today(), log = (g('dayLog') || {})[d] || [], tot = g('dayTotals') ? g('dayTotals')(d) : null, tg = g('targetFor') ? g('targetFor')(d) : null;
      const y = addD(d, -1), ylog = (g('dayLog') || {})[y] || [], ytot = ylog.length && g('dayTotals') ? g('dayTotals')(y) : null, ytg = g('targetFor') ? g('targetFor')(y) : null;
      const times = log.map(e => e.time).filter(Boolean).sort();
      return { date: d, entries: log.length, lastAt: times.length ? times[times.length - 1] : null,
        eaten: tot && log.length ? { kcal: r0(tot.kcal), protein: r0(tot.p), carbs: r0(tot.c), fat: r0(tot.f), kind: 'calculated', src: 'dayLog' } : null,
        target: tg ? { kcal: r0(tg.k), protein: r0(tg.p), carbs: r0(tg.c), fat: r0(tg.f), kind: 'reported', src: 'targets' } : null,
        left: tg && tot ? { kcal: r0(tg.k - tot.kcal), protein: r0(tg.p - tot.p), kind: 'calculated' } : null,
        yesterday: ytot ? { kcal: r0(ytot.kcal), protein: r0(ytot.p), targetKcal: ytg ? r0(ytg.k) : null, targetProtein: ytg ? r0(ytg.p) : null, kind: 'calculated' } : null }; } },

    // the schedule, with conflicts settled by priority: a finished workout today (measured) wins over the plan (reported), which wins
    // over a guess from last week (inferred). A workout running now wins over both.
    schedule: { deps: ['days', 'gymPlan', 'sessions', 'active'], day: true, fn(){
      const d = today(), di = g('dayInfo') ? g('dayInfo')(d) : null, tm = g('dayInfo') ? g('dayInfo')(addD(d, 1)) : null;
      const done = (g('sessions') || []).filter(s => s && s.date === d).sort((a, b) => String(a.start).localeCompare(String(b.start))), act = g('active');
      const plan = di ? { type: di.type || 'rest', kind: di.guessed ? 'inferred' : 'reported', src: di.guessed ? 'gymPlan' : 'days' } : null;
      let status = plan ? (plan.type === 'gym' ? 'planned_gym' : 'rest') : 'unknown', note = null;
      if(done.length){ if(plan && plan.type !== 'gym') note = 'plan_said_rest'; status = 'trained'; }
      if(act && act.exercises){ status = 'training_now'; }
      return { date: d, status, note, plan,
        trained: done.map(s => ({ id: s.id, name: s.name || s.type || null, type: s.type || null, mins: num(s.mins), endedAt: s.end || null, kind: 'measured', src: 'sessions' })),
        live: act && act.exercises ? { name: act.name || act.type || null, exercises: act.exercises.length, startedAt: act.start || null, kind: 'measured', src: 'active' } : null,
        tomorrow: tm ? { type: tm.type || 'rest', kind: tm.guessed ? 'inferred' : 'reported' } : null }; } },

    training: { deps: ['sessions', 'active', 'gymPlan', 'streak'], day: true, fn(){
      const list = (g('sessions') || []).filter(s => s && s.date).slice().sort((a, b) => String(b.start || b.date).localeCompare(String(a.start || a.date)));
      const main = g('isMainSet') || (s => s.type !== 'W'), sets = s => (s.exercises || []).reduce((n, x) => n + (x.sets || []).filter(z => z.done && main(z)).length, 0);
      const last = list.slice(0, 3).map(s => ({ date: s.date, name: s.name || s.type || null, sets: sets(s), mins: num(s.mins) }));
      const out = { workouts7: list.filter(s => ago(s.date) <= 6).length, workouts28: list.filter(s => ago(s.date) <= 27).length,
        daysSinceLast: list.length ? ago(list[0].date) : null, last, kind: 'measured', src: 'sessions' };
      if(g('hitsFrom') && g('HEADS')){ const H = g('HEADS'), grp = {};
        Object.entries(g('hitsFrom')(list.filter(s => ago(s.date) <= 6), false)).forEach(([h, v]) => { const gr = H[h] && H[h][2]; if(gr && gr !== 'cardio' && gr !== 'other') grp[gr] = Math.max(grp[gr] || 0, Math.round(v)); });
        out.hardSets7 = { byGroup: grp, kind: 'calculated' }; }
      // Change #13: the weekly streak summary from its one owner (js/streak.js): numbers only, never the history; null when unavailable
      try{ out.streak = g('Streak') ? g('Streak').summary() : null; }catch(e){ out.streak = null; }
      return out; } },

    // recovery: the existing engine (gym.js recMap through its 30 s cache); hours change with time, so a short ttl
    // RECOVERY+ is the one source (its snapshot: summaries and reason codes only, no food diary); the old map is only a fallback
    recovery: { deps: ['sessions', 'gymPlan', 'tpls', 'dayLog', 'targets'], ttl: 10 * 60e3, fn(){
      const R = g('RecoveryPlus');
      if(R && R.snapshot){ try{ const s = R.snapshot();
        if(s && s.v === 1 && s.groups){ const known = Object.values(s.groups).some(v => v.state !== 'unknown');
          const groups = Object.entries(s.groups).filter(([, v]) => v.state === 'recovering').map(([gr, v]) => ({ group: gr, hoursLeft: v.hoursLeft, heads: v.heads || [], conf: v.conf })).sort((a, b) => b.hoursLeft - a.hoursLeft);
          const sp = s.support || {};
          return { known, recovering: groups, kind: 'calculated', src: 'recovery+', readiness: s.overall, next: s.nextWorkout || null,
            sleep: sp.sleep ? { status: sp.sleep.status, conf: sp.sleep.confidence } : null, food: sp.nutrition ? { status: sp.nutrition.status, reasons: sp.nutrition.reasons, goal: sp.nutrition.goalContext } : null }; } }catch(e){} }
      const f = g('recMapNow') || g('recMap'); if(!f) return { known: false };
      const m = f(), groups = Object.entries(m || {}).filter(([, v]) => v && (v.st === 'mid' || v.st === 'low')).map(([gr, v]) => ({ group: gr, hoursLeft: v.h })).sort((a, b) => b.hoursLeft - a.hoursLeft);
      return { known: true, recovering: groups, kind: 'calculated', src: 'sessions' }; } },

    // the user's portion corrections (owned by today.js as 'foodFix'): learned memory, read here, never copied
    corrections: { deps: ['foodFix'], fn(){ const f = g('logFix') || {}, all = Object.values(f).filter(x => x && x.g > 0).sort((a, b) => (b.at || 0) - (a.at || 0));
      return { count: all.length, recent: all.slice(0, 5).map(x => ({ name: x.name, grams: x.g, aiGrams: x.aiG || null, times: x.n || 1 })), kind: 'measured', src: 'foodFix' }; } },

    kitchen: { deps: ['fridge'], fn(){ const on = g('kitchenOn') ? g('kitchenOn')() : true, items = on && g('liveItems') ? g('liveItems')() : [];
      return { on, items: items.length, kind: 'measured', src: 'fridge' }; } },

    // how much the user actually keeps each record (persona V3 § feature usage): per source the days with records in the last 28,
    // the last day, a level (frequent / occasional / rare / lapsed / never) and how far the records can be trusted:
    // verified (kept often and recently) · partial (kept now and then) · stale (nothing recent) · unknown (never kept / list off).
    // Says how complete the records are, never what the user did: a day without a log is unknown, not a day without food or training.
    usage: { deps: ['dayLog', 'sessions', 'weights', 'fridge'], day: true, fn(){
      const src = (dates, often, some, fresh) => { const ds = [...new Set(dates.filter(d => typeof d === 'string' && ago(d) >= 0))].sort();
        if(!ds.length) return { level: 'never', n28: 0, last: null, age: null, rel: 'unknown', kind: 'calculated' };
        const last = ds[ds.length - 1], age = ago(last), n28 = ds.filter(d => ago(d) <= 27).length;
        const level = !n28 ? 'lapsed' : n28 >= often ? 'frequent' : n28 >= some ? 'occasional' : 'rare';
        return { level, n28, last, age, rel: age > fresh ? 'stale' : level === 'frequent' ? 'verified' : 'partial', kind: 'calculated' }; };
      const log = g('dayLog') || {}, w = g('weights') || {};
      const out = { food: src(Object.keys(log).filter(d => (log[d] || []).length), 16, 6, 7),
        training: src((g('sessions') || []).map(s => s && s.date), 8, 3, 21),
        weight: src(Object.keys(w).filter(d => num(w[d]) > 30), 8, 2, 21) };
      const on = g('kitchenOn') ? g('kitchenOn')() : true, items = on && g('liveItems') ? g('liveItems')().length : 0;
      const m = Store.meta ? Store.meta() : null, at = m && m.upd && m.upd.fridge ? Math.max(0, ...Object.values(m.upd.fridge)) : 0, fa = at ? Math.floor((Date.now() - at) / DAY) : null;
      out.kitchen = !on || !items ? { on, items, rel: 'unknown', kind: 'measured' } : { on, items, age: fa, rel: fa === null || fa > 30 ? 'stale' : fa <= 7 ? 'verified' : 'partial', kind: 'measured' };
      return out; } },

    // the daily summary of habits (know.js); stale when it was built before the last few days
    patterns: { deps: ['aiKnow'], day: true, fn(){ const k = Store.load('aiKnow', null) || {};
      const age = k.day ? ago(k.day) : null;
      return { day: k.day || null, stale: age === null || age > 2, body: k.body || '', food: k.food || '', foodShort: k.foodShort || '', gym: k.gym || '', gymShort: k.gymShort || '', kind: 'calculated', src: 'aiKnow' }; } },
  };

  const keyFor = (name, s, now) => s.deps.map(n => n + ':' + (ver[n] || 0)).join(',') + (s.day ? '|' + today() : '') + (s.ttl ? '|' + Math.floor(now / s.ttl) : '');
  // get(slice) → the slice (cached). Never throws: a failing reader gives { error: true } so a coach request still goes out.
  function get(name, now){
    const s = SLICES[name]; if(!s) return null; now = now || Date.now();
    const k = keyFor(name, s, now), c = cache[name];
    if(c && c.k === k){ stats.hits++; return c.v; }
    let v; try{ v = s.fn(); }catch(e){ console.warn('athlete state', name, e); v = { error: true }; }
    stats.builds++; cache[name] = { k, v }; return v;
  }
  // a permission-filtered copy: only the slices a specialist may read (Supervisor passes its scopes)
  function snapshot(scopes){ const out = {}; (scopes || Object.keys(SLICES)).forEach(n => { if(SLICES[n]) out[n] = get(n); }); return out; }
  const bump = n => { if(n) ver[n] = (ver[n] || 0) + 1; };

  // events → drop what changed. A goal change inside a targets save becomes its own event (athlete.goal_updated).
  let lastGoal;
  if(typeof AthleteEvents !== 'undefined'){
    AthleteEvents.on('*', ev => {
      if(ev.type === 'data.imported'){ bump(ev.name); return; }
      bump(ev.name);
      if(ev.type === 'nutrition.targets_changed'){ const gl = ((g('targets') || {}).goal) || null;
        if(lastGoal !== undefined && gl !== lastGoal) AthleteEvents.emit('athlete.goal_updated', { name: 'targets', from: lastGoal, to: gl }, { id: `athlete.goal_updated|${ev.id}` });
        lastGoal = gl; }
      if(/^workout\.(completed|edited|deleted)$/.test(ev.type)) AthleteEvents.emit('recovery.state_updated', { name: 'recovery', because: ev.type }, { id: `recovery.state_updated|${ev.id}` });
    });
    setTimeout(() => { if(lastGoal === undefined) lastGoal = ((g('targets') || {}).goal) || null; }, 0);   // the goal as the app started
  }
  return { get, snapshot, SLICES, stats: () => ({ ...stats }), versions: () => ({ ...ver }), _clear(){ Object.keys(cache).forEach(k => delete cache[k]); stats.builds = stats.hits = 0; } };
})();
