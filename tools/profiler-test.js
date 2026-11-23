#!/usr/bin/env node
// Beta profiler checks (pure, no browser): the real js/profiler.js on a synthetic history. Run: node tools/profiler-test.js   (exit 1 = a check failed)
// Covers: empty app, report shape, observations, strength / consistency / nutrition indicators, forecast check, early-retest outcome,
// bounded log, no writes to app data, unknown stays unknown.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0, n = 0; const ok = (c, m) => { n++; if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const DAY = 864e5, NOW = Date.UTC(2026, 10, 23, 12), iso = ms => new Date(ms).toISOString(), key = ms => iso(ms).slice(0, 10);
function make(seed){
  const mem = {}, ctx = { console, Date: class extends Date { constructor(...a){ super(...(a.length ? a : [NOW])); } static now(){ return NOW; } }, Math, JSON, Set, Map, Object, Array, Number, String, isFinite, isNaN, parseFloat, Intl, Blob: class { constructor(p, o){ this.p = p; this.type = o && o.type; } } };
  vm.createContext(ctx);
  ctx.Store = { load: (k, d) => k in mem ? JSON.parse(JSON.stringify(mem[k])) : d, save: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); return true; } };
  ctx.mem = mem; ctx.Phone = { shareFile: async () => 'shared', download(){} };
  vm.runInContext(`
    const VERSION = 'test';
    const LIBX = { bench: { id: 'bench', en: 'Bench press', m: 'chest', mu: { chest_mid: 100 } }, squat: { id: 'squat', en: 'Squat', m: 'quads', mu: { quads: 100 } }, run: { id: 'run', en: 'Run', m: 'cardio', mu: {} } };
    const exById = id => LIBX[id] || { id, en: id, m: 'other', mu: {} };
    const e1rm = (w, r) => w * (1 + r / 30);
    const dayInfo = () => ({ type: 'gym' });
    let profile = { sex: 'm', height: 180 }, weights = {}, targets = { gym: { kcal: 2800, p: 160, c: 300, f: 80 }, rest: { kcal: 2500, p: 160, c: 250, f: 80 } }, settings = {}, ui = { lang: 'en' };
    let dayLog = {}, foods = [], meals = [], fridge = [], supps = [], logPhr = {}, foodFix = {}, sessions = [], exCustom = [], tpls = [], gymPlan = {};
    const RecoveryPlus = { snapshot: () => ({ v: 1, engineVersion: 't', dataFreshness: 'current', groups: { chest: { state: 'recovering', detail: 'recovering', hoursLeft: 20, conf: 'moderate' }, quads: { state: 'ready' } }, muscleHeads: {}, readiness: { level: 'normal', conf: 'low' }, overall: { assessment: 'ready', confidence: 'low' } }) };
  `, ctx);
  vm.runInContext(read('js/profiler.js') + '\n;this.Profiler = Profiler;', ctx);
  if(seed) seed(ctx, mem);
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);
const sess = (i, day, ex) => ({ id: 's' + i, date: key(day), start: iso(day), mins: 60, vol: 5000, prs: [], exercises: ex });
const sets = (w, r, k) => Array.from({ length: k }, () => ({ w: String(w), r: String(r), done: true, type: 'N' }));

(async () => {
  // 1. empty app
  let c = make(); let r = c.Profiler.report();
  ok(r.kind === 'food-tracker-beta-profile' && r.training.sessions === 0 && r.food.daysLogged === 0, 'empty app: a valid report, nothing invented');
  ok(r.observations.some(o => /No workouts/.test(o)) && r.observations.some(o => /Food is barely logged/.test(o)), 'empty app: says what is missing');
  ok(r.progress.indicators.every(i => i.verdict === 'not enough data' || i.what === 'recovery advice'), 'empty app: progress says not enough data, never a guess');

  // 2. twelve weeks of a lifter: bench 80 → 92 kg x 5, squat flat, food logged, forecasts saved, one early retest
  c = make((ctx, mem) => {
    const S = [], start = NOW - 84 * DAY;
    for(let w = 0; w < 12; w++) for(const d of [0, 3]){ const t = start + (w * 7 + d) * DAY; S.push(sess(S.length, t, [{ exId: 'bench', rest: 120, sets: sets(80 + w, 5, 3) }, { exId: 'squat', rest: 180, sets: sets(100, 5, 3) }])); }
    // the last bench workout comes 10 h after a forecast that said chest needed 20 more hours, and is worse than normal
    const early = NOW - 2 * DAY, f0 = early - 10 * 36e5;
    S.push(sess(S.length, early, [{ exId: 'bench', rest: 120, sets: sets(70, 5, 3) }]));
    run(ctx, 'sessions = ' + JSON.stringify(S)); const log = {}; for(let i = 0; i < 20; i++) log[key(NOW - i * DAY)] = [{ kcal: 2780, p: 165, c: 300, f: 80 }]; run(ctx, 'dayLog = ' + JSON.stringify(log));
    mem.profiler = { v: 1, since: NOW - 60 * DAY, opens: { [key(NOW)]: 3 }, errors: [], workouts: [], forecasts: [{ at: f0, groups: { chest: { st: 'recovering', h: 20, c: 'moderate' } }, heads: {} }, { at: NOW - 5 * DAY, groups: { chest: { st: 'recovering', h: 6, c: 'low' } }, heads: {} }] };
    run(ctx, 'weights = ' + JSON.stringify({ [key(NOW - 30 * DAY)]: { kg: 80 }, [key(NOW)]: { kg: 82 } }));
  });
  r = c.Profiler.report();
  const bench = r.progress.strengthByLift.find(l => l.id === 'bench'), squat = r.progress.strengthByLift.find(l => l.id === 'squat');
  ok(r.training.sessions === 25 && r.training.avgPerWeek >= 1.9, 'lifter: sessions and weekly rate read from the history');
  ok(bench && bench.changePct > 3, 'bench: estimated 1RM trend is up (' + (bench && bench.changePct) + '%)');
  ok(squat && Math.abs(squat.changePct) < 1, 'squat: flat stays flat');
  ok(r.progress.indicators.find(i => i.what === 'strength').verdict === 'improving', 'strength indicator: improving');
  ok(r.food.last30 >= 20 && r.progress.nutritionOutcome.proteinAtLeast90pctOfTarget === 100, 'food: adherence counted on logged days only');
  ok(r.body.change30dKg === 2, 'body: 30-day change from weigh-ins');
  const chk = r.recovery.check; const row = chk.groupRows.find(z => z.status === 'trained_before_ready');
  ok(chk.issued === 2 && row && row.trainedHoursBeforeReady > 5 && row.trainedHoursBeforeReady < 15, 'forecast check: trained about 10 h before the forecast ready time');
  ok(r.progress.earlyRetests.tested === 1 && r.progress.earlyRetests.rows[0].e1rmVsOwnRecentNormPct < -5, 'early retest: the worse session is compared with his own norm');
  ok(r.who.featuresActuallyUsed.includes('logsFood') && r.who.usualTrainingTime, 'who: described from what he did');
  const before = JSON.stringify([run(c, 'sessions'), run(c, 'dayLog'), run(c, 'weights'), run(c, 'profile')]);
  await c.Profiler.exportFile(); c.Profiler.report(); c.Profiler.tick('open');
  ok(before === JSON.stringify([run(c, 'sessions'), run(c, 'dayLog'), run(c, 'weights'), run(c, 'profile')]), 'profiler never changes app data');

  // 3. bounded log and caught errors
  c = make(); for(let i = 0; i < 200; i++){ c.Profiler.logError('e' + i, 'x.js:1'); c.Profiler.afterWorkout({ id: 'w' + i, exercises: [] }); }
  ok(c.mem.profiler.errors.length === 30 && c.mem.profiler.forecasts.length <= 120 && c.mem.profiler.workouts.length <= 60, 'log stays small (errors 30, forecasts 120, workouts 60)');
  ok(c.mem.profiler.forecasts[0].groups.chest.h === 20 && c.mem.profiler.forecasts[0].groups.quads.st === 'ready', 'a forecast is saved as issued');
  console.log(`\n${n - fails}/${n} profiler checks pass`); process.exit(fails ? 1 : 0);
})();
