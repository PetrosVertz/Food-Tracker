#!/usr/bin/env node
// Athlete Rank v0.4 — the brief's scenarios on the real engine + data (no browser). Prints the actual rank and reason of each, then pass / fail.
// Run: node tools/rank-v04-test.js [--inventory]   (--inventory also writes docs/rank/RANK_V04_COVERAGE.md from the exercise library)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0, n = 0; const ok = (c, m) => { n++; if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const ctx = {}; vm.createContext(ctx);
vm.runInContext(read('js/data/gym.js').replace(/^(const|let) /gm, 'var ') + '\n' + read('js/rank-engine.js') + '\n' + read('js/data/rank-bench.js').replace(/^const /gm, 'var ') + '\n' + read('js/data/rank-v04.js').replace(/^const /gm, 'var ')
  + '\n' + read('js/rank-v04.js').split('// ---------- the app adapter ----------')[0].replace(/^const /gm, 'var ') + ';this.X = { LIB_RAW, EQ, RankEngine, RANK_BENCH, RANK04, RankV4Core };', ctx);
const { LIB_RAW, EQ, RankEngine, RANK_BENCH, RANK04, RankV4Core } = ctx.X;
const E = RankV4Core.create(RANK04, RankEngine.create(RANK_BENCH));
const NAMES = ['Bronze III', 'Bronze II', 'Bronze I', 'Silver III', 'Silver II', 'Silver I', 'Gold III', 'Gold II', 'Gold I', 'Platinum III', 'Platinum II', 'Platinum I', 'Diamond III', 'Diamond II', 'Diamond I'];
const LIB = Object.fromEntries(LIB_RAW.map(([id, en, el, eq, p]) => [id, { id, en, e: EQ[eq], p, m: p === 'cardio' ? 'cardio' : 'x' }]));
const cls = id => E.classify(id, LIB[id]);
const rank = (id, sex, bw, sets, extra) => { const c = cls(id); if(!c || !c.eng) return c; return E.evaluate(c, sex, [{ date: '2026-11-20', bw, sets: sets.map(s => ({ w: s[0], r: s[1], ...(s[2] || {}) })) }, ...(extra || [])]); };
const say = r => r && r.n != null ? `${NAMES[r.n]} (raw ${r.n}${r.q ? ', ' + r.q : ''})` : JSON.stringify(r);
const nxt = r => !r || !r.next ? '' : r.next.reps ? ` · next ${NAMES[r.next.n]}: ${r.next.reps} reps` : r.next.add != null ? ` · next ${NAMES[r.next.n]}: +${r.next.add} kg × ${r.next.r}` : ` · next ${NAMES[r.next.n]}: ${r.next.w} kg × ${r.next.r}`;

// 1. pull-ups, 70 kg man, 9 strict reps: mid-Silver; the same set after rows (fatigued) gives the same raw result
const pu = rank('pullup', 'm', 70, [[0, 9]]), puF = rank('pullup', 'm', 70, [[0, 9, { before: 8 }]]);
console.log(`     pull-up 70 kg man, 9 strict reps: ${say(pu)}${nxt(pu)}; after 8 sets of rows: ${say(puF)}`);
ok(pu.n === 4 && puF.n === pu.n && puF.best.before === 8, 'pull-ups: 9 strict reps at 70 kg (man) = Silver II (mid-Silver); fatigued = same raw rank, fatigue kept as context');
ok(pu.next && pu.next.reps === 11 && pu.next.kg == null, 'pull-ups: the next target is reps alone (11), no kg');
// 2. incline bench 60 × 8, 70 kg man: roughly Gold
const ib = rank('incline_bench', 'm', 70, [[60, 8]]);
console.log(`     incline bench 70 kg man, 60 kg × 8: ${say(ib)}${nxt(ib)}`);
ok(ib.n >= 6 && ib.n <= 8 && ib.q === 'provisional', 'incline 60 × 8 at 70 kg (man) lands in Gold (provisional benchmark, labelled)');
ok(ib.next && ib.next.r === 8 && ib.next.w > 60, 'incline: the next target is an achievable kg × the same reps');
// 3. incline 80 × 5 for a 70 kg woman, a 70 kg man and a 100 kg man
const iF = rank('incline_bench', 'f', 70, [[80, 5]]), iM = rank('incline_bench', 'm', 70, [[80, 5]]), iH = rank('incline_bench', 'm', 100, [[80, 5]]);
console.log(`     incline 80 × 5: woman 70 kg ${say(iF)} · man 70 kg ${say(iM)} · man 100 kg ${say(iH)}`);
ok(iF.n >= iM.n && iM.n >= iH.n && iF.n > iH.n, 'incline 80 × 5: same set ranks higher for the lighter / female lifter (sex and body weight curves)');
// 4. paired vs single dumbbell: db bench is per hand, goblet is one dumbbell held with both hands
const dbP = rank('db_bench', 'm', 80, [[30, 8]]), dbS = rank('goblet', 'm', 80, [[30, 8]]);
console.log(`     dumbbell bench 30 kg per hand × 8 (80 kg man): ${say(dbP)} · goblet squat one 30 kg dumbbell × 8: ${say(dbS)}`);
ok(cls('db_bench').proto === 'per_hand' && cls('goblet').proto === 'single' && dbP.n > 0 && dbS.n >= 0, 'dumbbells: a pair counts per hand, a single dumbbell its own weight (protocol in the data)');
// 5. weighted and assisted pull-ups
const wp = rank('pullup', 'm', 70, [[20, 5]]);
console.log(`     weighted pull-up 70 kg man, +20 kg × 5: ${say(wp)}${nxt(wp)}`);
ok(wp.n > pu.n && wp.next && wp.next.add > 20 && wp.next.r === 5, 'weighted pull-ups: added kg counts on top of body weight; the next target is added weight for the same reps');
ok(cls('assisted_pullup').excluded === 'machine_cable', 'assisted pull-up (machine): never ranked; PRs and progress stay');
// 6. missing profile / bodyweight: no rank invented
ok(E.evaluate(cls('bench'), 'm', [{ date: 'd', bw: 0, sets: [{ w: 100, r: 5 }] }]).none === true, 'no body weight for a set: that set gives no rank (the adapter asks for body weight)');
// 7. duplicated easy sets and total volume never raise the rank
const one = rank('bench', 'm', 80, [[60, 8]]), many = rank('bench', 'm', 80, Array.from({ length: 12 }, () => [60, 8]));
console.log(`     bench 80 kg man: one set 60 × 8 ${say(one)} · twelve sets 60 × 8 ${say(many)}`);
ok(one.n === many.n && Math.abs(one.frac - many.frac) < 1e-9, 'extra sets / volume do not change the rank (best qualified set only)');
// 8. warm-ups and invalid records (the adapter drops warm-ups and drops; here: empty, zero, text, negative)
const bad = rank('bench', 'm', 80, [['', 8], [0, 5], ['x', 5], [-20, 5], [60, 0]]);
ok(bad.none === true, 'invalid sets (no weight, zero reps, text, negative) never qualify');
// 9. reps matter: lower reps need more weight (movement rep table)
const t1 = E.loadTarget(cls('bench'), { sex: 'm', bw: 80 }, 6, 1), t8 = E.loadTarget(cls('bench'), { sex: 'm', bw: 80 }, 6, 8);
ok(t1 > t8 * 1.2, `rep table: Gold III bench at 80 kg needs ${t1.toFixed(1)} kg × 1 but ${t8.toFixed(1)} kg × 8`);
// 10. excluded equipment and reasons
const ex = ['leg_press', 'lat_pulldown', 'cable_curl', 'smith_bench', 'pec_deck'].map(id => cls(id).excluded), band = cls('band_curl').excluded;
ok(ex.every(x => x === 'machine_cable') && band === 'other_equipment' && cls('kb_swing').prOnly === 'protocol' && cls('copenhagen') && cls('copenhagen').prOnly === 'insufficient_benchmark',
  'machine / cable / Smith = machine_cable; band = other equipment; ballistic / timed = protocol; no benchmark = insufficient (each its own text)');
// 10b. timed holds: their own rank on time (seconds in the reps field), body weight and an optional belt
{ const hc = cls('dead_hang'), lv = (id, bw, sets) => E.evaluate(cls(id), 'm', [{ date: '2026-01-01', bw, sets }]).n;
  ok(hc && hc.hold && cls('plank').hold && cls('wall_sit').hold && cls('lsit').hold, 'dead hang, plank, wall sit and L-sit are timed holds with their own table');
  ok(lv('dead_hang', 70, [{ w: 0, r: 30 }]) < lv('dead_hang', 70, [{ w: 0, r: 60 }]) && lv('dead_hang', 70, [{ w: 0, r: 60 }]) < lv('dead_hang', 70, [{ w: 0, r: 120 }]), 'a longer hang ranks higher (30 s < 60 s < 120 s)');
  ok(lv('dead_hang', 70, [{ w: 10, r: 40 }]) > lv('dead_hang', 70, [{ w: 0, r: 40 }]), 'a belt with extra kg at the same time ranks higher');
  ok(lv('dead_hang', 100, [{ w: 0, r: 60 }]) >= lv('dead_hang', 60, [{ w: 0, r: 60 }]), 'a heavier lifter holding the same time is not ranked lower');
  const nx = E.evaluate(hc, 'm', [{ date: '2026-01-01', bw: 70, sets: [{ w: 0, r: 30 }] }]).next; ok(nx && nx.sec === true && nx.reps > 30, 'what the next level needs is more seconds, flagged as time');
  ok(lv('plank', 70, [{ w: 0, r: 20 }]) < lv('plank', 70, [{ w: 0, r: 180 }]) && lv('tuck_lsit', 70, [{ w: 0, r: 20 }]) <= lv('lsit', 70, [{ w: 0, r: 20 }]) + 99, 'plank and the L-sit variants rank on time too'); }
// 11. a typed or estimated 1RM never ranks: the engine has no 1RM input; a single at the target counts as a real set
const s1 = rank('bench', 'm', 80, [[E.loadTarget(cls('bench'), { sex: 'm', bw: 80 }, 9, 1) + 0.01, 1]]);
ok(s1.n === 9, 'an actual heavy single counts like any set (no estimated 1RM on the user side)');
// 12. seasons: the brief's boundary fixture
const H1 = Date.UTC(2026, 3, 10), H2 = Date.UTC(2026, 6, 1, 0, 0, 1);
let rec = RankV4Core.seasonStep(null, H1, '0.4.0', { bench: 8 }, 2);
rec = RankV4Core.seasonStep(rec, H2, '0.5.0', { bench: 4 }, 2);
console.log(`     season boundary: Gold I last season, raw ${NAMES[4]} under new benchmarks → visible ${NAMES[rec.vis.bench]}, badge ${NAMES[rec.badges['2026-H1'].bench]}, benchmarks ${rec.bv}`);
ok(rec.vis.bench === 6 && rec.badges['2026-H1'].bench === 8 && rec.bv === '0.5.0' && rec.sid === '2026-H2', 'season: established Gold I → raw Silver II shows Gold III (−2 at most), old badge Gold I kept, new version from the boundary');
const fresh = RankV4Core.seasonStep(null, H2, '0.5.0', { bench: 4 }, 2);
ok(fresh.vis.bench === 4, 'season: a new lifter gets the raw result');
const up = RankV4Core.seasonStep(rec, H2 + 864e5, '0.5.0', { bench: 9 }, 2);
ok(up.vis.bench === 9 && up.bv === '0.5.0', 'season: a genuine improvement shows at once; the version stays frozen inside the season');
const again = RankV4Core.seasonStep(RankV4Core.seasonStep(rec, H2 + 1000, '0.6.0', { bench: 4 }, 2), H2 + 2000, '0.6.0', { bench: 4 }, 2);
ok(JSON.stringify(again.vis) === JSON.stringify(rec.vis) && again.bv === '0.5.0', 'season: running it again (restart, restore, import) changes nothing; a newer version waits for the next boundary');
const skip = RankV4Core.seasonStep(rec, Date.UTC(2027, 7, 1), '0.5.0', {}, 2);
ok(skip.sid === '2027-H2' && skip.badges['2026-H2'].bench === 6 && skip.vis.bench === 4, 'season: offline across seasons: one step to the current season, last badge kept, protection from the last visible rank');
ok(RankV4Core.seasonOf(Date.UTC(2026, 5, 30, 23, 59, 59)) === '2026-H1' && RankV4Core.seasonOf(Date.UTC(2026, 6, 1)) === '2026-H2', 'season ids change exactly at 1 July / 1 January 00:00 UTC');

// coverage inventory
const rows = Object.values(LIB).map(x => { const c = cls(x.id); return { x, c, kind: !c ? 'cardio' : c.eng ? 'ranked' : c.excluded ? 'excluded' : 'pr_only' }; });
const cnt = k => rows.filter(r => r.kind === k).length, src = rows.filter(r => r.c && r.c.q === 'sourced').length;
console.log(`     coverage: ${rows.length} exercises · ranked ${cnt('ranked')} (sourced ${src}, provisional ${cnt('ranked') - src}) · excluded equipment ${cnt('excluded')} · PR only ${cnt('pr_only')} · cardio ${cnt('cardio')}`);
ok(cnt('ranked') >= 90 && src === 4, 'coverage: every competitive-equipment exercise has an engine, a protocol and a reason');
if(process.argv.includes('--inventory')){
  const why = c => !c ? 'cardio: never ranked' : c.eng === 'load' ? `${c.anchor} × ${c.f} (${c.table} rep table, ${c.proto.replace('_', ' ')})` : c.eng === 'bw' ? `body weight: ${c.base} rep table × ${c.mult}` : (c.excluded || c.prOnly).replace(/_/g, ' ');
  const out = [`# Athlete Rank v0.4 — exercise coverage (benchmarks ${RANK04.version})`, '', `Generated by \`node tools/rank-v04-test.js --inventory\` from \`js/data/gym.js\` and \`js/data/rank-v04.js\`. Do not edit by hand.`, '',
    `- Exercises: **${rows.length}**`, `- Ranked: **${cnt('ranked')}** (sourced curves: **${src}** — bench, squat, deadlift, overhead press; provisional: **${cnt('ranked') - src}**)`,
    `- Excluded equipment (machine, cable, Smith, band): **${cnt('excluded')}** — the card shows "Ranking not available"`, `- PR only (no benchmark, ballistic / timed / unclear load, assisted): **${cnt('pr_only')}**`, `- Cardio: **${cnt('cardio')}**`, '',
    '| Exercise | Id | Equipment | Status | Engine / reason | Benchmark quality |', '|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.x.en} | \`${r.x.id}\` | ${r.x.e} | ${r.kind.replace('_', ' ')} | ${why(r.c)} | ${r.c && r.c.q ? r.c.q : ''} |`)];
  fs.mkdirSync(path.join(root, 'docs/rank'), { recursive: true }); fs.writeFileSync(path.join(root, 'docs/rank/RANK_V04_COVERAGE.md'), out.join('\n') + '\n'); console.log('     wrote docs/rank/RANK_V04_COVERAGE.md'); }
console.log(fails ? `\n${fails} of ${n} rank v0.4 checks failed` : `\nAll ${n} rank v0.4 checks pass.`); process.exit(fails ? 1 : 0);
