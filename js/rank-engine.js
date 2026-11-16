// ---------- New rank engine (ranking-1). Pure maths: no app state, no screen, no storage. ----------
// NOT the live ranking: the app still uses tierFor() in gym.js. This file is used by docs/rank-simulator.html, tools/rank/sim.js,
// tools/check.js and the adapter js/rank-v2.js (switched off). Spec: docs/RANKING_ALGORITHM.md. Data: js/data/rank-bench.js.
// Rules of the brief it follows: best single set only (no total volume), no estimated 1RM on what the user logged, each exercise
// has its own fixed benchmark, body weight / sex / age come from benchmark curves, ranks are for fun.
//   const eng = RankEngine.create(RANK_BENCH);
//   eng.evaluate('bench', { sex: 'm', age: 30 }, [{ day: 0, bw: 80, sets: [{ w: 80, reps: 8 }] }], today) → { n, name, score, ... }
const RankEngine = (() => {
  // normal distribution: z → share of people below (0…1)
  const phi = z => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
  // straight-line interpolation through knots (xs rising); outside the knots: `hold` keeps the end value, otherwise the end slope continues
  const lerp = (xs, ys, x, hold) => { const n = xs.length; if(x <= xs[0]) return hold ? ys[0] : ys[0] + (ys[1] - ys[0]) / (xs[1] - xs[0]) * (x - xs[0]);
    if(x >= xs[n - 1]) return hold ? ys[n - 1] : ys[n - 1] + (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2]) * (x - xs[n - 1]);
    let i = 1; while(x > xs[i]) i++; return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]); };

  function create(db){
    const S = db.scoring, LV = db.ranks, TOP = LV.length - 1;

    // exerciseBenchmarkDatabase: the model an exercise is measured against, or why there is none
    // → { m (curves), factor, anchor (id, when it is a variation = "Estimate"), confidence, loadType, share } | { none: reason }
    function model(exId, sex){ const v = db.variants[exId], base = v ? v.anchor : exId, ex = db.exercises[base];
      if(!ex) return { none: 'no open benchmark data for this exercise' };
      if(v && !(v.factor[sex] > 0)) return { none: 'the variation factor has no evidence for this sex' };
      const m = ex.models[sex]; if(!m) return { none: (db.unranked && db.unranked[`${base}:${sex}`]) || 'no benchmark for this sex' };
      return { m, factor: v ? v.factor[sex] : 1, anchor: v ? base : null, confidence: v ? v.confidence : m.confidence,
        loadType: (v && v.loadType) || ex.loadType, share: ex.bwShare == null ? 1 : ex.bwShare, name: ex.name }; }

    // rankingConfidence + age: thresholds × this (1 for young adults, lower for older lifters; no age → 1)
    const ageFactor = (m, age) => m.age && age > 0 ? lerp(m.age.map(a => a[0]), m.age.map(a => a[1]), age, true) : 1;
    // bodyweightNormalization: the reference lifter at z standard deviations from the median gym-goer, in the source's unit (kg), for this
    // body weight and age. Each percentile has its own curve a × (bw / refBw)^k; between the published percentiles: straight lines in z.
    const clampBw = (m, bw) => Math.min(m.bwRange[1], Math.max(m.bwRange[0], bw));
    function refKg(mo, z, bw, age){ const m = mo.m, x = Math.log(clampBw(m, bw) / m.refBw), zs = m.z.slice(0, m.a.length);
      return Math.exp(lerp(zs, m.a.map(Math.log), z) + lerp(m.z, m.k, z, true) * x) * ageFactor(m, age) * mo.factor; }
    // exercisePercentileCalculator: z of a measured value (metric 'L' = heaviest weight, 'V' = best set volume). refKg rises with z → bisection.
    function zOf(mo, metric, value, bw, age){ if(!(value > 0)) return -9; const c = metric === 'L' ? mo.m.kL : mo.m.kV; let lo = -9, hi = 9;
      for(let i = 0; i < 44; i++){ const mid = (lo + hi) / 2; if(refKg(mo, mid, bw, age) * c > value) hi = mid; else lo = mid; } return (lo + hi) / 2; }
    const pct = z => phi(z) * 100;
    const score = (zL, zV) => S.wLoad * pct(zL) + S.wVolume * pct(zV);
    // rankThresholdMapper
    const level = sc => { let n = 0; while(n < TOP && sc >= LV[n + 1].from - 1e-9) n++; return n; };

    // the weight a set really moved (brief §5): external · body weight + added · body weight − assistance
    const loadOf = (mo, set, bw) => mo.loadType === 'bodyweight' ? mo.share * bw + (+set.w || 0) : mo.loadType === 'assisted' ? Math.max(0, mo.share * bw - (+set.w || 0)) : (+set.w || 0);
    // maximumLoadCalculator + singleSetVolumeCalculator: what one set is worth. Reps above the cap add no volume.
    const measure = (mo, set, bw) => { const load = loadOf(mo, set, bw), reps = Math.floor(+set.reps || 0); return reps >= 1 && load > 0 ? { load, reps, L: load, V: load * Math.min(reps, mo.m.repCap) } : null; };
    // the record ceiling for this body weight (heaviest raw competition lift of the band, + margin), or 0 when the lift has none
    const ceiling = (mo, bw) => { const c = mo.m.ceiling; if(!c) return 0; let v = c[0][1]; for(const [lo, kg] of c) if(bw >= lo) v = kg; return v * S.ceilingMargin * mo.factor; };
    // rule 2: a set far above what the data says anyone lifts → "Check this set", ignored until the user confirms it (set.ok)
    function implausible(mo, ms, bw, age){ const cap = mo.loadType === 'external' ? ceiling(mo, bw) : 0;
      return (cap > 0 && ms.L > cap) || zOf(mo, 'L', ms.L, bw, age) > S.implausibleZ || zOf(mo, 'V', ms.V, bw, age) > S.implausibleZ; }

    // One exercise, one person. sessions: [{ day (whole days, any origin), bw (body weight that day), sets: [{ w, reps, ok? }] }]
    // (finished normal sets only: the caller leaves out warm-ups, drop sets and the second side of L/R). body: { sex: 'm'|'f', age? }.
    // today: day number "now" (default: the last session). → see the return at the bottom.
    function evaluate(exId, body, sessions, today){
      const mo = model(exId, body && body.sex); if(mo.none) return { ranked: false, reason: mo.none };
      const age = body.age, checks = [], days = new Map();
      (sessions || []).forEach(s => { if(!(s.bw > 0)) return; (s.sets || []).forEach(st => { const ms = measure(mo, st, s.bw); if(!ms) return;
        if(!st.ok && implausible(mo, ms, s.bw, age)){ checks.push({ day: s.day, w: +st.w || 0, reps: ms.reps }); return; }
        const d = days.get(s.day) || { day: s.day, bw: s.bw, L: null, V: null }; days.set(s.day, d);
        if(!d.L || ms.L > d.L.L) d.L = ms; if(!d.V || ms.V > d.V.V) d.V = ms; }); });
      const list = [...days.values()].sort((a, b) => a.day - b.day);
      if(!list.length) return { ranked: false, none: true, reason: 'no sets yet', checks, confidence: mo.confidence, estimate: mo.anchor };
      const now = today == null ? list[list.length - 1].day : today;
      // rule 4: sets count in full for windowDays, then lose fadePerWeek of their weight per week, never below fadeFloor
      const fade = (d, T) => Math.max(S.fadeFloor, 1 - S.fadePerWeek * Math.max(0, (T - d.day - S.windowDays) / 7));
      // the best value of a metric at day T, and the best value that a second workout on another day (within confirmDays) also reached
      function best(metric, T){ const zs = []; for(const d of list){ if(d.day > T) break; const f = fade(d, T); zs.push({ z: zOf(mo, metric, d[metric][metric] * f, d.bw, age), d, f }); }
        zs.sort((a, b) => b.z - a.z); const top = zs[0]; let conf = -9;
        for(let i = 0; i < zs.length && i < 40; i++) for(let j = i + 1; j < zs.length && j < 40; j++)
          if(Math.abs(zs[i].d.day - zs[j].d.day) <= S.confirmDays){ conf = Math.max(conf, zs[j].z); break; }
        return { z: top.z, conf, d: top.d, f: top.f }; }
      // the rank the data supports at day T (rule 1: from confirmFrom upwards only what two workouts reached)
      function at(T){ const L = best('L', T), V = best('V', T), raw = score(L.z, V.z), nRaw = level(raw);
        let sc = raw, n = nRaw, pending = null;
        if(nRaw >= S.confirmFrom){ const scC = score(Math.min(L.z, L.conf), Math.min(V.z, V.conf)), nC = level(scC);
          if(nC < nRaw){ pending = nRaw; n = Math.max(nC, S.confirmFrom - 1); sc = nC >= S.confirmFrom ? scC : Math.min(raw, LV[S.confirmFrom].from - 1e-6); } }
        return { L, V, raw, sc, n, pending }; }
      // rule 3: replay the workouts in order; after the first ranked one, a workout lifts the shown rank by at most maxStepUp levels
      let shown = null; for(const d of list){ if(d.day > now) break; const t = at(d.day); shown = shown == null ? t.n : Math.min(t.n, shown + S.maxStepUp); }
      const cur = at(now); let n = shown == null ? cur.n : Math.min(cur.n, shown), capped = n < cur.n;
      const lo = LV[n].from, hi = n < TOP ? LV[n + 1].from : 100, sc = capped ? hi - 1e-6 : cur.sc;
      const res = { ranked: true, n, tier: LV[n].tier, name: LV[n].name, score: cur.raw, pctLoad: pct(cur.L.z), pctVolume: pct(cur.V.z),
        frac: Math.max(0, Math.min(1, (sc - lo) / (hi - lo))), pending: cur.pending != null && cur.pending > n ? { n: cur.pending, name: LV[cur.pending].name } : null,
        capped, checks, confidence: mo.confidence, estimate: mo.anchor,
        bestLoad: { w: cur.L.d.L.load, reps: cur.L.d.L.reps, day: cur.L.d.day }, bestVolume: { w: cur.V.d.V.load, reps: cur.V.d.V.reps, day: cur.V.d.day, volume: cur.V.d.V.V } };
      // the kg still needed: both best sets that much heavier (same reps) until the score reaches the next level
      if(n < TOP && !capped && !res.pending){ const need = LV[n + 1].from, bwN = list[list.length - 1].bw;
        const grow = f => score(zOf(mo, 'L', cur.L.d.L.L * cur.L.f * f, bwN, age), zOf(mo, 'V', cur.V.d.V.V * cur.V.f * f, bwN, age));
        let a = 1, b = 1.02; while(grow(b) < need && b < 30) b *= 1.3; for(let i = 0; i < 40; i++){ const mid = (a + b) / 2; if(grow(mid) >= need) b = mid; else a = mid; }
        res.next = { n: n + 1, tier: LV[n + 1].tier, name: LV[n + 1].name, kg: (b - 1) * cur.L.d.L.load }; }
      else if(n < TOP) res.next = { n: n + 1, tier: LV[n + 1].tier, name: LV[n + 1].name, kg: 0 };
      return res; }

    // the weight (kg, as typed for this exercise) at which ONE set of `reps` reps alone reaches level n for this body; null = no rank
    function need(exId, body, n, reps){ const mo = model(exId, body.sex); if(mo.none) return null; if(n <= 0) return 0;
      const sc = w => { const ms = measure(mo, { w, reps }, body.bw); return ms ? score(zOf(mo, 'L', ms.L, body.bw, body.age), zOf(mo, 'V', ms.V, body.bw, body.age)) : 0; };
      let a = mo.loadType === 'external' ? 0 : -mo.share * body.bw, b = 1500; if(sc(b) < LV[n].from) return null;
      for(let i = 0; i < 50; i++){ const mid = (a + b) / 2; if(sc(mid) >= LV[n].from) b = mid; else a = mid; } return b; }
    // one set on its own: its two percentiles, score and level (the simulator's "what is this set worth")
    function scoreSet(exId, body, set){ const mo = model(exId, body.sex); if(mo.none) return { ranked: false, reason: mo.none };
      const ms = measure(mo, set, body.bw); if(!ms) return { ranked: false, reason: 'no load or reps' };
      const zL = zOf(mo, 'L', ms.L, body.bw, body.age), zV = zOf(mo, 'V', ms.V, body.bw, body.age), sc = score(zL, zV), n = level(sc);
      return { ranked: true, load: ms.load, volume: ms.V, pctLoad: pct(zL), pctVolume: pct(zV), score: sc, n, name: LV[n].name, check: !set.ok && implausible(mo, ms, body.bw, body.age),
        confidence: mo.confidence, estimate: mo.anchor }; }

    return { db, model, refKg, zOf, pct, score, level, measure, ceiling, evaluate, need, scoreSet, version: db.version };
  }
  return { create };
})();
if(typeof module !== 'undefined') module.exports = RankEngine;
