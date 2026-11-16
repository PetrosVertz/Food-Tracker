#!/usr/bin/env node
// Builds the benchmark database of the new rank engine from open data only.
//   in : data/rank/rank-config.json  +  data/rank/sources/*  (GymStreak CC BY 4.0, OpenPowerlifting public domain)
//   out: data/rank/benchmarks.v1.json  and  js/data/rank-bench.js (the same data as `const RANK_BENCH`)
// Run: node tools/rank/build-bench.js      (--check: fail if the outputs are not up to date)
// Method (docs/RANKING_ALGORITHM.md): for each lift and sex, GymStreak's four published percentiles (25, 50, 75, 90) in each
// 10 kg body-weight band are fitted with one curve per percentile, kg = a_p x (bw / refBw) ^ k(z), where the body-weight
// exponent k may rise with the percentile (stronger lifters gain more per kg of body weight). Above the 90th percentile the
// exponent moves to the one measured on OpenPowerlifting competitors.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..'), P = f => path.join(root, f);
const cfg = JSON.parse(fs.readFileSync(P('data/rank/rank-config.json'), 'utf8'));
const csv = f => { const [h, ...rows] = fs.readFileSync(P(f), 'utf8').trim().split(/\r?\n/).map(l => l.split(','));
  return rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
const b5 = csv('data/rank/sources/gymstreak/b5_strength_standards.csv');
const opl = JSON.parse(fs.readFileSync(P('data/rank/sources/openpowerlifting-summary.json'), 'utf8'));

const PCT = [25, 50, 75, 90], Z = [-0.6745, 0, 0.6745, 1.2816], Z_TOP = 2.0537;   // z of the 98th percentile: where Diamond starts
const r3 = x => Math.round(x * 1000) / 1000, r1 = x => Math.round(x * 10) / 10;

// least squares by normal equations (tiny systems)
function solve(A, b){ const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for(let i = 0; i < n; i++){ let p = i; for(let j = i + 1; j < n; j++) if(Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j; [M[i], M[p]] = [M[p], M[i]];
    for(let j = i + 1; j < n; j++){ const f = M[j][i] / M[i][i]; for(let k = i; k <= n; k++) M[j][k] -= f * M[i][k]; } }
  const x = Array(n).fill(0); for(let i = n - 1; i >= 0; i--){ let s = M[i][n]; for(let k = i + 1; k < n; k++) s -= M[i][k] * x[k]; x[i] = s / M[i][i]; } return x; }

function fit(ex, sexKey){ const c = cfg.exercises[ex], sex = sexKey === 'm' ? 'male' : 'female', ref = c.refBw[sexKey];
  const all = b5.find(r => r.split === 'sex' && r.ex === c.gymstreak && r.sex === sex);
  const bands = b5.filter(r => r.split === 'sex_x_bodyweight' && r.ex === c.gymstreak && r.sex === sex)
    .map(r => ({ lo: +r.band.split('-')[0], n: +r.n_users, q: PCT.map(p => +r[`p${p}_kg`]) })).sort((a, b) => a.lo - b.lo);
  if(!all || bands.length < cfg.minBands) return { none: `GymStreak publishes ${bands.length} body-weight band(s) for ${sex} lifters on this lift; at least ${cfg.minBands} are needed for a body-weight curve` };
  // unknowns: A25, A50, A75, A90, k0, k1   model: ln q = A_p + (k0 + k1 z_p) x
  const N = 6, ATA = Array.from({ length: N }, () => Array(N).fill(0)), ATb = Array(N).fill(0);
  bands.forEach(b => PCT.forEach((p, i) => { const x = Math.log((b.lo + 5) / ref), row = Array(N).fill(0); row[i] = 1; row[4] = x; row[5] = Z[i] * x;
    const y = Math.log(b.q[i]), w = b.n; for(let a = 0; a < N; a++){ ATb[a] += w * row[a] * y; for(let d = 0; d < N; d++) ATA[a][d] += w * row[a] * row[d]; } }));
  const s = solve(ATA, ATb), kAt = z => Math.max(0, s[4] + s[5] * z);
  const o = c.opl && opl.lifts[`${c.opl}_${sexKey.toUpperCase()}`];
  const z = [...Z, Z_TOP], k = [...Z.map(kAt), o ? o.bw_exponent : kAt(Z[3])];
  // the fit error: how far the fitted curves are from the published band values (median absolute, %)
  const errs = []; bands.forEach(b => PCT.forEach((p, i) => errs.push(Math.abs(Math.exp(s[i] + kAt(Z[i]) * Math.log((b.lo + 5) / ref)) / b.q[i] - 1))));
  errs.sort((a, b) => a - b);
  const rL = cfg.conversion.loadReps, rV = cfg.conversion.volumeReps;
  const m = {
    refBw: ref, bwRange: [bands[0].lo, bands[bands.length - 1].lo + 9],
    z: z.map(r3), a: s.slice(0, 4).map(v => r1(Math.exp(v))), k: k.map(r3),
    kL: r3(1 / (1 + rL / 30)), kV: r3(rV / (1 + rV / 30)), loadReps: rL, volumeReps: rV, repCap: cfg.conversion.repCap,
    n: +all.n_users, nWithBw: +all.n_users_with_bw, bands: bands.length, fitErrPct: r1(errs[Math.floor(errs.length / 2)] * 100),
    published: { p25: +all.p25_kg, p50: +all.p50_kg, p75: +all.p75_kg, p90: +all.p90_kg },
    age: null, ceiling: null,
    measured: 'percentiles 25-90 (GymStreak, direct)', estimated: 'below the 25th and above the 90th percentile (the curve is continued); the two conversion constants kL and kV',
    confidence: +all.n_users >= 3000 && bands.length >= 6 ? 'high' : 'medium',
    sources: ['gymstreak_train'],
  };
  if(o){
    m.sources.push('openpowerlifting');
    // age: median lift of the age band / the 24-34 median (never above 1: no bonus is taken away from anyone)
    // baseline = young adults: no adjustment up to 37; from the 40-44 band on, the band's median over the 24-34 median (never above 1)
    m.age = [[37, 1], ...Object.entries(o.age).map(([band, v]) => { const [lo, hi] = band.split('-').map(Number); return [(lo + hi + 1) / 2, Math.min(1, v.factor)]; }).filter(([mid]) => mid >= 40)];
    for(let i = 1; i < m.age.length; i++) m.age[i][1] = Math.min(m.age[i][1], m.age[i - 1][1]);
    // plausibility ceiling: the heaviest raw competition lift in the body-weight band, never lower than a lighter band's
    let top = 0; m.ceiling = Object.entries(o.bands).map(([band, v]) => { top = Math.max(top, v.max); return [+band.split('-')[0], top]; });
    m.oplN = o.n;
  } else m.notes = 'No competition data for this lift: no age adjustment and no record ceiling (the generic "far above the curve" check still applies). Body-weight exponent above the 90th percentile held at the 90th-percentile value.';
  // sanity: curves must never cross inside the body-weight range
  for(let bw = m.bwRange[0]; bw <= m.bwRange[1]; bw += 5){ let prev = 0;
    for(let i = 0; i < 4; i++){ const v = m.a[i] * Math.pow(bw / ref, m.k[i]); if(v <= prev) throw new Error(`${ex} ${sexKey}: percentile curves cross at ${bw} kg`); prev = v; } }
  return m; }

const out = {
  _about: 'Benchmark database of the new rank engine. GENERATED by tools/rank/build-bench.js from data/rank/rank-config.json and data/rank/sources/*: do not edit by hand. Open data only (GymStreak CC BY 4.0, OpenPowerlifting public domain). No value comes from Strength Level, Symmetric Strength or Buffro.',
  version: cfg.version, calibrated: cfg.calibrated, synthetic: false,
  ranks: cfg.ranks.levels, scoring: Object.fromEntries(Object.entries(cfg.scoring).filter(([k]) => k[0] !== '_')),
  conversionNote: cfg.conversion._about, sources: cfg.sources, exercises: {}, variants: {}, unranked: {},
};
for(const ex of Object.keys(cfg.exercises)){ const c = cfg.exercises[ex], models = {};
  for(const sx of ['m', 'f']){ const m = fit(ex, sx); if(m.none) out.unranked[`${ex}:${sx}`] = m.none; else models[sx] = m; }
  out.exercises[ex] = { id: ex, name: c.name, equipment: c.equipment, loadType: c.loadType, unit: c.unit, models }; }
for(const [id, v] of Object.entries(cfg.variants)){ if(id[0] === '_') continue;
  if(!out.exercises[v.anchor]) throw new Error(`${id}: anchor ${v.anchor} has no benchmark`);
  if(cfg.variants[v.anchor]) throw new Error(`${id}: chains are not allowed (anchor ${v.anchor} is itself a variation)`);
  if(!v.source || !(v.n > 0)) throw new Error(`${id}: a variation factor needs a source and a sample size`);
  out.variants[id] = v; }

const json = JSON.stringify(out, null, 1) + '\n';
const js = `// GENERATED by tools/rank/build-bench.js from data/rank/benchmarks.v1.json: do not edit by hand.\n// Benchmarks of the new rank engine (js/rank-engine.js). Open data only: GymStreak (CC BY 4.0), OpenPowerlifting (public domain).\nconst RANK_BENCH = ${JSON.stringify(out)};\nif(typeof module !== 'undefined') module.exports = RANK_BENCH;\n`;
const files = [['data/rank/benchmarks.v1.json', json], ['js/data/rank-bench.js', js]];
if(process.argv.includes('--check')){
  const stale = files.filter(([f, s]) => !fs.existsSync(P(f)) || fs.readFileSync(P(f), 'utf8') !== s).map(([f]) => f);
  if(stale.length){ console.log('stale: ' + stale.join(', ')); process.exit(1); } console.log('benchmarks up to date');
} else { files.forEach(([f, s]) => fs.writeFileSync(P(f), s));
  for(const [ex, e] of Object.entries(out.exercises)) for(const [sx, m] of Object.entries(e.models))
    console.log(`${ex} ${sx}: n=${m.n} bands=${m.bands} a=${m.a.join('/')} k=${m.k.join('/')} kL=${m.kL} kV=${m.kV} fitErr=${m.fitErrPct}% ${m.confidence}`);
  for(const [k, why] of Object.entries(out.unranked)) console.log(`NO RANK ${k}: ${why}`); }
