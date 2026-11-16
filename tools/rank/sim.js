#!/usr/bin/env node
// Command-line rank simulator and the fairness checks of the new engine (brief sections 2b and 9).
//   node tools/rank/sim.js                      every check, as text (docs/RANKING_ALGORITHM.md quotes these tables)
//   node tools/rank/sim.js bench m 30 80 100 5  one set: exercise, sex, age, body weight, kg, reps
// Synthetic lifters and the pull-up / curl benchmarks used here are SYNTHETIC (data/rank/synthetic-test.json): test values only.
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '../..');
const RankEngine = require(path.join(root, 'js/rank-engine.js')), BENCH = require(path.join(root, 'js/data/rank-bench.js'));
const SYN = JSON.parse(fs.readFileSync(path.join(root, 'data/rank/synthetic-test.json'), 'utf8'));
const OPL = JSON.parse(fs.readFileSync(path.join(root, 'data/rank/sources/openpowerlifting-summary.json'), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
const eng = RankEngine.create(BENCH);
// real + synthetic benchmarks together: for the test cases that have no open data (pull-ups, curls). Never used by the app.
const withSyn = () => { const d = clone(BENCH); Object.assign(d.exercises, SYN.exercises); Object.assign(d.variants, SYN.variants); d.synthetic = true; return RankEngine.create(d); };
const weights = (wBest, wV) => { const d = clone(BENCH); d.scoring.wBest = wBest; d.scoring.wVolume = wV; d.scoring.wLoad = 1 - wV; return RankEngine.create(d); };
const f1 = x => (Math.round(x * 10) / 10).toFixed(1), f0 = x => String(Math.round(x));
const half = x => (Math.ceil(x * 2 - 1e-9) / 2).toString();
const table = (head, rows) => ['| ' + head.join(' | ') + ' |', '|' + head.map((h, i) => i ? '---:' : '---').join('|') + '|', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');
const once = (e, ex, body, sets, bw) => e.evaluate(ex, body, [{ day: 0, bw, sets }], 0);
const show = r => r.ranked ? `${r.name}${r.pending ? ` (${r.pending.name} pending)` : ''}` : `no rank (${r.reason})`;
const Zs = { 20: -0.8416, 50: 0, 75: 0.6745, 90: 1.2816, 92: 1.4051, 98: 2.0537, 98.5: 2.1701 };
// SYNTHETIC lifter: someone whose strength sits at percentile p of the reference curve, doing sets of the given reps.
// Weights come from the source's own set formula turned round (weight = reference ÷ (1 + reps/30)); used here to invent test sets only.
const synSets = (e, ex, sex, bw, p, repsList, age) => { const ref = e.refKg(e.model(ex, sex), Zs[p], bw, age); return repsList.map(r => ({ w: ref / (1 + r / 30), reps: r })); };

const out = [], H = s => out.push(`\n## ${s}\n`), P = s => out.push(s);
const all = () => {
  H('1. Section 9 test cases: bench press (real open data)');
  P(table(['Body weight', 'Set', 'Load percentile', 'Volume percentile', 'Score', 'Rank from this one set'],
    [[50, 120, 1], [75, 100, 1], [100, 100, 1], [150, 100, 1], [50, 120, 8], [75, 100, 8], [100, 100, 8], [150, 100, 8]].map(([bw, w, r]) => { const s = eng.scoreSet('bench', { sex: 'm', bw, age: 30 }, { w, reps: r });
      const ev = once(eng, 'bench', { sex: 'm', age: 30 }, [{ w, reps: r }], bw);
      return [`${bw} kg man`, `${w} kg x ${r}`, f1(s.pctLoad), f1(s.pctVolume), f1(s.score), show(ev) + (s.check ? ' · Check this set' : '')]; })));
  P('\nThe 150 kg man is measured at 139 kg: the heaviest body-weight band the open data covers.');

  H('2. Section 9: single-set volume (80 kg man, bench, all four sets in one workout)');
  const four = [[100, 1], [90, 3], [80, 6], [70, 10]].map(([w, reps]) => ({ w, reps }));
  P(table(['Set', 'Volume (kg x reps)', 'Load percentile', 'Volume percentile', 'Alone it would be'], four.map(s => { const r = eng.scoreSet('bench', { sex: 'm', bw: 80, age: 30 }, s); return [`${s.w} x ${s.reps}`, f0(r.volume), f1(r.pctLoad), f1(r.pctVolume), r.name]; })));
  const r4 = once(eng, 'bench', { sex: 'm', age: 30 }, four, 80);
  P(`\nAll four together: **${r4.name}**. Best volume set: ${r4.bestVolume.w} x ${r4.bestVolume.reps} (${f0(r4.bestVolume.volume)}, percentile ${f1(r4.pctVolume)}). Heaviest weight: the ${r4.bestLoad.w} kg single (percentile ${f1(r4.pctLoad)}). The rank follows the better of the two: score ${f1(r4.score)}.`);

  H('3. Scoring: the same true strength, different training styles (80 kg man, bench, SYNTHETIC lifters)');
  const styles = { 'Heavy singles only': [1], 'Triples only': [3], '5 x 5 only': [5], 'Sets of 6': [6], 'Sets of 7': [7], 'Sets of 8': [8], 'Sets of 6 to 8': [6, 7, 8], 'Sets of 10': [10], 'Sets of 12': [12], 'Sets of 15': [15], 'Sets of 5 and 10': [5, 10], 'A single and sets of 10': [1, 10] };
  for(const [title, wB, wV] of [['The better of the two measurements (chosen)', 1, 0.5], ['Average, 50% volume / 50% max load', 0, 0.5], ['Average, 60% volume / 40% max load (the brief\'s first guess)', 0, 0.6], ['Average, 70% volume / 30% max load', 0, 0.7]]){ const e = weights(wB, wV);
    P(`\n**${title}**\n`);
    P(table(['Style', '20th pct lifter', '50th', '75th', '92nd', '98.5th'], Object.entries(styles).map(([name, rs]) => [name, ...[20, 50, 75, 92, 98.5].map(p => { const sets = synSets(e, 'bench', 'm', 80, p, rs, 30);
      return e.evaluate('bench', { sex: 'm', age: 30 }, [0, 7, 14, 21].map(day => ({ day, bw: 80, sets })), 21).name; })]))); }
  P('\nA lifter truly at the 20th / 50th / 75th / 92nd / 98.5th percentile should read Bronze II / Silver III / Gold III / Platinum III / Diamond III.');

  H('4. Same percentile, different body sizes (rule 5)');
  const bodies = [['f', 50], ['f', 60], ['f', 75], ['f', 95], ['m', 55], ['m', 70], ['m', 85], ['m', 100], ['m', 130]];
  for(const ex of ['bench', 'squat', 'deadlift']) P(`\n**${ex}**\n\n` + table(['Percentile', ...bodies.map(([s, bw]) => `${s === 'm' ? 'Man' : 'Woman'} ${bw} kg`)], [20, 50, 75, 90, 98].map(p => [p + 'th', ...bodies.map(([sex, bw]) => { const sets = synSets(eng, ex, sex, bw, p, [6, 10], 30);
    const r = eng.evaluate(ex, { sex, age: 30 }, [{ day: 0, bw, sets }, { day: 7, bw, sets }], 7); return `${r.name} (${f0(sets[1].w)} x 10)`; })])));

  H('5. Beginners cannot reach Diamond (rule 6)');
  P(table(['Profile', 'Set', 'Rank', 'Diamond III would need (one set of 8)'], [['m', 50, 'bench', 30, 10], ['m', 50, 'squat', 40, 10], ['m', 50, 'deadlift', 50, 8], ['f', 50, 'bench', 20, 10], ['f', 50, 'squat', 30, 10], ['f', 50, 'deadlift', 40, 8], ['m', 50, 'ohp', 20, 10]].map(([sex, bw, ex, w, r]) =>
    [`${sex === 'm' ? 'Man' : 'Woman'} ${bw} kg, ${ex}`, `${w} x ${r}`, show(once(eng, ex, { sex, age: 25 }, [{ w, reps: r }], bw)), half(eng.need(ex, { sex, bw, age: 25 }, 12, 8)) + ' kg'])));

  H('6. Coherence rules (80 kg man, bench)');
  const B = { sex: 'm', age: 30 }, base = d => ({ day: d, bw: 80, sets: [{ w: 60, reps: 10 }, { w: 60, reps: 9 }] }), hist = [0, 7, 14, 21].map(base);
  const lines = [];
  lines.push(['Four weeks of 60 x 10', show(eng.evaluate('bench', B, hist, 21))]);
  lines.push(['… then one workout of 130 x 8 (first time)', show(eng.evaluate('bench', B, [...hist, { day: 28, bw: 80, sets: [{ w: 130, reps: 8 }] }], 28))]);
  lines.push(['… and 130 x 8 again a week later', show(eng.evaluate('bench', B, [...hist, { day: 28, bw: 80, sets: [{ w: 130, reps: 8 }] }, { day: 35, bw: 80, sets: [{ w: 130, reps: 8 }] }], 35))]);
  lines.push(['… and a third time', show(eng.evaluate('bench', B, [...hist, ...[28, 35, 42].map(d => ({ day: d, bw: 80, sets: [{ w: 130, reps: 8 }] }))], 42))]);
  lines.push(['Very first workout ever: 130 x 8', show(once(eng, 'bench', B, [{ w: 130, reps: 8 }], 80))]);
  const typo = eng.evaluate('bench', B, [...hist, { day: 28, bw: 80, sets: [{ w: 600, reps: 10 }] }], 28);
  lines.push(['A typo: 600 x 10', `${show(typo)}; ${typo.checks.length} set marked "Check this set"`]);
  lines.push(['One bad day after the four weeks (40 x 10)', show(eng.evaluate('bench', B, [...hist, { day: 28, bw: 80, sets: [{ w: 40, reps: 10 }] }], 28))]);
  const strong = [0, 7, 14].map(d => ({ day: d, bw: 80, sets: [{ w: 100, reps: 8 }, { w: 115, reps: 3 }] }));
  for(const wk of [0, 26, 52, 65, 80, 104]) lines.push([`Strong lifter (100 x 8, 115 x 3) stops training: after ${wk} weeks`, show(eng.evaluate('bench', B, strong, 14 + wk * 7))]);
  P(table(['Situation', 'Rank shown'], lines));

  H('7. Pull-ups and curls (SYNTHETIC benchmarks: the ranks below mean nothing, they only show how the engine treats the sets)');
  const s = withSyn(), Bm = { sex: 'm', age: 30 };
  P(table(['Case', 'Counted load', 'Rank (synthetic)'], [
    ['70 kg, 9 unassisted pull-ups, one set', 'pullup', 70, [{ w: 0, reps: 9 }]], ['70 kg, sets of 9, 8, 7', 'pullup', 70, [{ w: 0, reps: 9 }, { w: 0, reps: 8 }, { w: 0, reps: 7 }]],
    ['70 kg, sets of 9, 9, 8, 8', 'pullup', 70, [{ w: 0, reps: 9 }, { w: 0, reps: 9 }, { w: 0, reps: 8 }, { w: 0, reps: 8 }]],
    ['90 kg, 9 unassisted pull-ups', 'pullup', 90, [{ w: 0, reps: 9 }]], ['70 kg, 9 reps with +10 kg', 'pullup', 70, [{ w: 10, reps: 9 }]], ['70 kg, 9 reps with 20 kg assistance', 'assisted_pullup', 70, [{ w: 20, reps: 9 }]],
  ].map(([name, ex, bw, sets]) => { const r = once(s, ex, Bm, sets, bw); return [name, `${f0(r.bestLoad.w)} kg`, r.name]; })));
  P('\nWith the real database the same sets give: ' + show(once(eng, 'pullup', Bm, [{ w: 0, reps: 9 }], 70)) + '.\n');
  P(table(['Curl (80 kg man, 30 kg x 8; dumbbell and cable: 12 kg x 8)', 'Rank (synthetic)'], [['bb_curl', 30], ['strict_curl', 30], ['ez_preacher', 30], ['spider_curl', 12], ['bayesian_curl', 12]].map(([ex, w]) => [SYN.exercises[ex].name, show(once(s, ex, Bm, [{ w, reps: 8 }], 80))])));
  P('\nA sourced variation factor (real): Smith machine squat, 65 kg woman, 60 x 8: ' + show(once(eng, 'smith_squat', { sex: 'f', age: 30 }, [{ w: 60, reps: 8 }], 65)) + ' (Estimate, based on Back squat); the same set as a free back squat: ' + show(once(eng, 'squat', { sex: 'f', age: 30 }, [{ w: 60, reps: 8 }], 65)) + '; a man on the Smith machine: ' + show(once(eng, 'smith_squat', Bm, [{ w: 100, reps: 8 }], 80)) + '.');

  H('8. Kilograms for each rank: one set of 8 reps on its own (age 18-35)');
  for(const ex of ['bench', 'squat', 'deadlift', 'ohp']){ const cols = [['m', 65], ['m', 80], ['f', 65], ['f', 80]].filter(([sx]) => eng.model(ex, sx).m);
    P(`\n**${BENCH.exercises[ex].name}** \n\n` + table(['Rank', ...cols.map(([sx, bw]) => `${sx === 'm' ? 'Man' : 'Woman'} ${bw} kg`)], BENCH.ranks.slice(1).map(l => [l.name, ...cols.map(([sex, bw]) => half(eng.need(ex, { sex, bw, age: 30 }, l.n, 8)))]))); }

  H('9. Where the top ranks sit among competition lifters (OpenPowerlifting, raw lifting, ages 18-34)');
  P('The reference weight (the source unit: best set of 1-10 reps x (1 + reps/30)) at the start of each top rank, next to the best competition lifts (real 1RMs) of competitors in the same 10 kg body-weight band.\n');
  const rowsC = []; for(const [ex, sx, bw, band] of [['bench', 'm', 85, '80-89'], ['squat', 'm', 85, '80-89'], ['deadlift', 'm', 85, '80-89'], ['bench', 'f', 65, '60-69'], ['squat', 'f', 65, '60-69'], ['deadlift', 'f', 65, '60-69']]){
    const mo = eng.model(ex, sx), o = OPL.lifts[`${ex}_${sx.toUpperCase()}`].bands[band], zAt = p => { let lo = -9, hi = 9; for(let i = 0; i < 50; i++){ const m = (lo + hi) / 2; if(eng.pct(m) > p) hi = m; else lo = m; } return lo; };
    rowsC.push([`${ex}, ${sx === 'm' ? 'man' : 'woman'} ${bw} kg`, ...[90, 98, 99.7].map(p => f0(eng.refKg(mo, zAt(p), bw, 30))), `${o.p50} / ${o.p90} / ${o.p99}`, `${o.max}`]); }
  P(table(['Lift', 'Platinum III', 'Diamond III', 'Diamond I', 'Competitors: median / 90th / 99th', 'Heaviest'], rowsC));

  H('10. Age (bench, 80 kg man, the same set of 80 x 8)');
  P(table(['Age', 'Rank'], [25, 40, 50, 60, 70].map(a => [a, show(once(eng, 'bench', { sex: 'm', age: a }, [{ w: 80, reps: 8 }], 80))])));
  H('11. How long it takes: GymStreak experience groups placed on the scale (bench, squat, deadlift)');
  P('Median best set (source unit) of app users in their first 14 days on the lift, by the experience level they chose, and one year later. The progress study has no split by sex, so the groups are placed on the men\'s curve (about 85% of the bench sample is male): read it as a rough guide.\n');
  const prog = fs.readFileSync(path.join(root, 'data/rank/sources/gymstreak/p1_e1rm_change_windows.csv'), 'utf8').trim().split('\n').map(l => l.split(',')), ph = prog.shift(), pr = prog.map(r => Object.fromEntries(ph.map((k, i) => [k, r[i]])));
  const zs = [-0.6745, 0, 0.6745, 1.2816], rankOfKg = (ex, kg) => { const q = BENCH.exercises[ex].models.m.published, ys = [q.p25, q.p50, q.p75, q.p90].map(Math.log), x = Math.log(kg);
    let z; if(x <= ys[0]) z = zs[0] + (x - ys[0]) / (ys[1] - ys[0]) * (zs[1] - zs[0]); else if(x >= ys[3]) z = zs[3] + (x - ys[3]) / (ys[3] - ys[2]) * (zs[3] - zs[2]); else { let i = 1; while(x > ys[i]) i++; z = zs[i - 1] + (x - ys[i - 1]) / (ys[i] - ys[i - 1]) * (zs[i] - zs[i - 1]); }
    return `${BENCH.ranks[eng.level(eng.pct(z))].name} (${f0(eng.pct(z))}%)`; };
  const rowsT = []; for(const [ex, gs] of [['bench', 'Barbell_Bench_Press'], ['squat', 'Barbell_Squats'], ['deadlift', 'Barbell_Deadlift']]) for(const exp of ['beginner', 'intermediate', 'advanced']){
    const two = pr.find(r => r.ex === gs && r.horizon === '2 months' && r.exp === exp), yr = pr.find(r => r.ex === gs && r.horizon === '12 months' && r.exp === exp); if(!two) continue; const s0 = +two.median_start_e1rm;
    rowsT.push([`${ex}, ${exp}`, two.n_users, `${s0} kg`, rankOfKg(ex, s0), rankOfKg(ex, s0 * (1 + +two.median_pct)), yr ? rankOfKg(ex, +yr.median_start_e1rm * (1 + +yr.median_pct)) : 'no data', yr ? rankOfKg(ex, +yr.median_start_e1rm * (1 + +yr.p75_pct)) : 'no data']); }
  P(table(['Group', 'Lifters', 'Start', 'Rank at the start', 'After 2 months (typical)', 'After 12 months (typical)', 'After 12 months (top quarter)'], rowsT));

  console.log(out.join('\n'));
};
if(process.argv.length >= 8){ const [ex, sex, age, bw, w, reps] = process.argv.slice(2), e = BENCH.exercises[ex] || BENCH.variants[ex] ? eng : withSyn();
  const r = e.scoreSet(ex, { sex, age: +age, bw: +bw }, { w: +w, reps: +reps });
  console.log(r.ranked ? `${ex}: ${w} kg x ${reps} at ${bw} kg → load percentile ${f1(r.pctLoad)}, volume percentile ${f1(r.pctVolume)}, score ${f1(r.score)} → ${r.name}${r.check ? ' (Check this set)' : ''}${r.estimate ? `, Estimate based on ${r.estimate}` : ''} [confidence: ${r.confidence}]` : `${ex}: no rank (${r.reason})`);
} else all();
