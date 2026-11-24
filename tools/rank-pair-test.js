#!/usr/bin/env node
// Athlete Rank v0.4 for Left / Right pairs and compact entries (pure, no browser): the real js/rank-v04.js adapter + js/gym-lat.js on synthetic workouts.
// Run: node tools/rank-pair-test.js   (exit 1 = a check failed)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0, n = 0; const ok = (c, m) => { n++; if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const ctx = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, isFinite, parseFloat, isNaN }; vm.createContext(ctx);
vm.runInContext(`
  ${read('js/data/gym.js').replace(/^(const|let) /gm, 'var ')}
  ${read('js/data/gym-lat.js').replace(/^const /gm, 'var ')}
  ${read('js/gym-lat.js').replace(/^const /gm, 'var ')}
  ${read('js/rank-engine.js')}
  ${read('js/data/rank-bench.js').replace(/^const /gm, 'var ')}
  ${read('js/data/rank-v04.js').replace(/^const /gm, 'var ')}
  var EQN = { b: 'barbell', d: 'dumbbell', m: 'machine', c: 'cable', w: 'bodyweight', k: 'kettlebell', e: 'band' };
  var exById = id => { const r = LIB_RAW.find(a => a[0] === id); if(!r) return { id, en: id, m: 'other', e: 'machine', mu: {} };
    const mu = {}; String(r[5]).split(' ').forEach(p => { const [h, v] = p.split(':'); mu[h] = +v; }); return { id, en: r[1], e: EQN[r[3]], p: r[4], m: r[4] === 'cardio' ? 'cardio' : 'x', mu }; };
  var isMainSet = s => s.type !== 'W' && s.side !== 'R' && !s.drop;
  var weights = { '2026-11-01': 80 }, targets = { bw: 80 }, profile = { sex: 'm' }, sessions = [], active = null;
  var todayKey = () => '2026-11-23', saveProfile = () => {}, rankIds = () => [...new Set(sessions.flatMap(s => s.exercises.map(x => x.exId)))];
  var t = k => k, tierName = n => TIERS[Math.floor(n / 3)] + ' ' + n;
  ${read('js/rank-v04.js')}
  ;this.X = { RANK4, rank4For, rank4Raw, rank4Sessions, rank4, Lat, LIB_RAW, RANK04 };
`, ctx);
const X = ctx.X, E = X.rank4(), Lat = X.Lat;
const setS = (v) => vm.runInContext('sessions = ' + JSON.stringify(v) + '; profile.rankSeason = null;', ctx);
const mkS = (id, d, ex) => ({ id, date: d, start: d + 'T10:00:00Z', exercises: ex });
const row = (w, r, o) => ({ id: 'r' + Math.random(), type: 'N', w: String(w), r: String(r), done: true, ...o });
const pairRows = (L, R, pr = 'p' + Math.random()) => [row(L[0], L[1], { side: 'L', pr }), row(R[0], R[1], { side: 'R', pr })];
const rankOf = (ex, extraSessions) => { setS([mkS('a', '2026-11-10', [ex]), ...(extraSessions || [])]); return X.rank4For(ex.exId); };
const CV2 = { l: 'hand', n: 2, rp: 'both' }, CV1S = { l: 'hand', n: 1, rp: 'side' }, CVT = { l: 'total', n: 2, rp: 'both' };
const id = 'hammer_curl', body = { sex: 'm', bw: 80 };
// pick weights from the engine itself (per-hand standard for 12 reps) so the test is not tied to a table value
const need = (lvl) => Math.ceil(E.loadTarget(E.classify(id, X.rank4 && ctx.exById(id)), body, lvl, 12) * 2) / 2;
const w3 = need(3), w6 = need(6), w9 = need(9);
console.log(`(hammer curl 12 reps, 80 kg male: level 3 ≈ ${w3} kg, level 6 ≈ ${w6} kg, level 9 ≈ ${w9} kg per hand)`);
const comp = (w, r, cv = CV2) => ({ exId: id, cv, sets: [row(w, r)] });
const pair = (L, R, cv = CV1S, uni = true) => ({ exId: id, uni, cv, sets: pairRows(L, R) });
const same = (a, b) => a && b && a.n === b.n && Math.abs(a.frac - b.frac) < 1e-9 && JSON.stringify(a.next) === JSON.stringify(b.next);

// 1 equal sides = compact = simultaneous total
let A = rankOf(comp(w6, 12)), B = rankOf(pair([w6, 12], [w6, 12])), T = rankOf(comp(w6 * 2, 12, CVT));
ok(A.n >= 5 && same(A, B), 'equal sides: Left / Right pair gives exactly the compact result (rank ' + A.label + ', next ' + JSON.stringify(A.next && A.next.w) + ')');
ok(same(A, T), 'a 40-style TOTAL entry (' + w6 * 2 + ' kg total x 12, two bells) gives exactly the same tier, progress and next target');
ok(B.sides === 'both' && A.sides === 'single', 'the result says whether both sides were scored');
// 2 unequal sides: the lower side decides
let R = rankOf(pair([w9, 12], [w3, 12])), Lw = rankOf(pair([w3, 12], [w9, 12])), low = rankOf(comp(w3, 12));
ok(same(R, low) && same(Lw, low), 'right stronger or left stronger: the pair earns the LOWER side (' + low.label + '), never the stronger one');
ok(R.best.w === w3 && R.best.r === 12, 'the scored set is one side\'s own weight and reps');
// 3 never mix weight from one side with reps of the other
let M = rankOf(pair([w9, 6], [w3, 12]));
const sA = E.scoreSet(E.classify(id, ctx.exById(id)), body, { w: w9, r: 6 }), sB = E.scoreSet(E.classify(id, ctx.exById(id)), body, { w: w3, r: 12 });
ok(M.n === Math.min(sA.n, sB.n), 'heavy-low-reps left with light-high-reps right: each scored on its own weight and reps, the lower wins (' + M.n + ' = min ' + sA.n + ',' + sB.n + ')');
// 4 incomplete pair / one side only
setS([mkS('a', '2026-11-10', [{ exId: id, uni: true, cv: CV1S, sets: [row(w6, 12, { side: 'L', pr: 'p1' })] }])]); let one = X.rank4For(id);
ok(one.none && one.lone === 1, 'one side only (new work): the performance is kept, no rank is awarded');
setS([mkS('a', '2026-11-10', [{ exId: id, uni: true, cv: CV1S, sets: [row(w6, 12, { side: 'L', pr: 'p1' }), row('', '', { side: 'R', pr: 'p1', done: false })] }])]); one = X.rank4For(id);
ok(one.none, 'a pair whose right side was never finished does not rank');
setS([mkS('a', '2026-11-10', [{ exId: id, sets: [row(w6, 12, { side: 'L' })] }])]); const legacy = X.rank4For(id);
ok(legacy.n === A.n && legacy.sides === 'single', 'old workouts (no convention) keep ranking their single / Left row exactly as before');
// a lone side never lifts a rank above a complete pair
setS([mkS('a', '2026-11-10', [pair([w3, 12], [w3, 12])]), mkS('b', '2026-11-12', [{ exId: id, uni: true, cv: CV1S, sets: [row(w9, 12, { side: 'L', pr: 'p9' })] }])]);
ok(X.rank4For(id).n === rankOf(comp(w3, 12)).n, 'a later one-sided heavy set does not raise the rank');
// 5 one best logical set: two pairs never merge
setS([mkS('a', '2026-11-10', [{ exId: id, uni: true, cv: CV1S, sets: [...pairRows([w9, 12], [w3, 12]), ...pairRows([w3, 12], [w9, 12])] }])]);
ok(X.rank4For(id).n === low.n, 'strong left in one pair and strong right in the next are not merged into a strong pair');
// 6 extras confer nothing
const ann = { exId: id, uni: true, cv: CV1S, sets: [...pairRows([w6, 12], [w6, 12]).map(r => ({ ...r, hr: 3, ng: 2, rir: 0, type: 'F' })), ...pairRows([w3, 8], [w3, 8]).map(r => ({ ...r, drop: true, type: 'D' })), ...pairRows([w6, 12], [w6, 12]), row(5, 20, { type: 'W' })] };
ok(same(rankOf(ann), A), 'half reps, negatives, failure / RIR, drop pairs, warm-ups and extra sets earn no extra rank');
// 7 separate vs joint completion are the same data
const sepP = pair([w6, 12], [w6, 12]); sepP.sets[0].at = 1; sepP.sets[1].at = 99999;
ok(same(rankOf(sepP), A), 'separate-side finishing gives the same rank as one-tap');
// 8 edit / undo
const und = pair([w6, 12], [w6, 12]); und.sets[1].done = false; ok(rankOf(und).none, 'undo of the right side takes the pair back out of the rank');
// 9 split squat per bell vs bar
const bul = rankOf({ exId: 'bulgarian', uni: true, cv: { l: 'hand', n: 2, rp: 'side' }, sets: pairRows([w3, 12], [w3, 12]) });
const bulOne = rankOf({ exId: 'bulgarian', uni: true, cv: { l: 'hand', n: 1, rp: 'side' }, sets: pairRows([w3, 12], [w3, 12]) });
ok(bul.n === bulOne.n && bul.best.w === w3, 'split squat: two bells or one, the rank uses the weight PER BELL (the benchmark is per hand), not the doubled load');
const sq = rankOf({ exId: 'squat', cv: { l: 'bar', n: 1, rp: 'both' }, sets: [row(100, 5)] }); ok(sq.best.w === 100, 'a shared bar is scored at its total');
// 10 cable single-arm stays unranked even though it can be paired
const cab = rankOf({ exId: 'single_arm_cable_row', uni: true, cv: { l: 'stack', n: 1, rp: 'side' }, sets: pairRows([30, 12], [30, 12]) });
ok(cab.na === 'machine_cable' && Lat.info('single_arm_cable_row').mode === 'P', 'a single-arm cable exercise pairs for logging but stays ineligible for a competitive rank');
// 11 layout switch, restore, recompute
const lay = { exId: id, uni: false, cv: { ...CV2 }, sets: [row(w6, 12)] }; const before = rankOf(JSON.parse(JSON.stringify(lay)));
Lat.makeUni(lay, true); const rows = rankOf(JSON.parse(JSON.stringify(lay))); Lat.makeUni(lay, false); const back = rankOf(JSON.parse(JSON.stringify(lay)));
ok(same(before, rows) && same(before, back), 'compact -> Left / Right -> compact gives the same rank every time (no duplicated or lost rank)');
const tot = { exId: id, uni: false, cv: { ...CVT }, sets: [row(w6 * 2, 12)] }; const t0 = rankOf(JSON.parse(JSON.stringify(tot))); Lat.makeUni(tot, true); const t1 = rankOf(JSON.parse(JSON.stringify(tot)));
ok(same(t0, t1) && same(t0, before), 'a typed total, its Left / Right rows and the per-hand entry all rank the same');
const rest = JSON.parse(JSON.stringify(sepP)); ok(same(rankOf(rest), rankOf(sepP)) && same(rankOf(sepP), rankOf(sepP)), 'the same logical workout after a restore / recompute ranks the same');
// 12 ambiguous / lone old rows are never presented as both-sides
ok(legacy.sides === 'single', 'old data is never shown as a verified both-sides result');
// 13 unfinished / zero-weight sides
ok(rankOf(pair([w6, 12], [0, 12])).none === true, 'a side with no load does not qualify, so the pair does not');
console.log(`\n${n - fails}/${n} rank pair checks pass`); process.exit(fails ? 1 : 0);
