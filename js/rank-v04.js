// ---------- Athlete Rank v0.4 (LIVE: tierFor() in gym.js answers from here) ----------
// Bronze III … Diamond I per exercise, from the best QUALIFIED ACTUAL SET: the kg really lifted (per hand / on the bar / added to body weight)
// and the reps really done, compared with reference targets for that lift, sex and body weight on that day. A reference max (published 1RM data)
// is used only on the reference side; a typed or estimated 1RM, extra sets, total volume or a streak never give a rank.
// Machines, cables, Smith and bands never compete (the card keeps the slot: a muted plate with a red X, "Ranking not available").
// Fatigue before a set (earlier sets for the same muscles in that workout, recovery carried in) is CONTEXT only: equal sets give equal ranks.
// Seasons: two a year (UTC); a new benchmark version starts only at a season boundary; an established lifter's benchmark-only drop is limited
// to two levels (protected); the old season's rank stays as a badge. Data: js/data/rank-v04.js (+ the anchor curves in js/data/rank-bench.js).
const RankV4Core = (() => {
  const TOP = 14;
  function create(D, eng){
    const tbl = (name, r) => { const t = D.repTable[name] || D.repTable.upper, x = Math.min(20, Math.max(1, r)); let i = 1; while(i < t.length - 1 && x > t[i][0]) i++;
      const [x0, y0] = t[i - 1], [x1, y1] = t[i]; return x <= x0 ? y0 : x >= x1 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); };
    // classify(id, ex) → { eng: 'load', anchor, f, table, proto, q } | { eng: 'bw', base, mult, q } | { excluded: code } | { prOnly: code } | null (cardio)
    function classify(id, ex){
      if(!ex) return null; if(ex.m === 'cardio' || ex.p === 'cardio') return null;
      const eq = ex.e, code = { barbell: 'b', dumbbell: 'd', kettlebell: 'k', bodyweight: 'w', machine: 'm', cable: 'c', band: 'e' }[eq] || 'x';
      if(D.excluded[code]) return { excluded: D.excluded[code] };
      if(/assist/.test(id)) return { prOnly: 'assisted' };
      if(ex.custom) return { prOnly: 'insufficient_benchmark' };
      if(D.prOnly[id]) return { prOnly: D.prOnly[id] };
      if(code === 'w' && D.holdVar && D.holdVar[id]){ const h = D.holdVar[id]; return { eng: 'bw', base: h[0], mult: h[1], hold: true, q: 'provisional' }; }
      if(code === 'w'){ const v = D.bwVar[id]; return v ? { eng: 'bw', base: v[0], mult: v[1], q: 'provisional' } : { prOnly: 'insufficient_benchmark' }; }
      const l = D.load[id]; if(!l || !D.engines[code]) return { prOnly: 'insufficient_benchmark' };
      return { eng: 'load', anchor: l[0], f: l[1], table: l[2], proto: l[3], q: l[4] === 'sourced' ? 'sourced' : 'provisional' };
    }
    // the anchor's reference max at level n for this body (from its sourced 6-rep curve), memoised. Female ohp: derived (provisional).
    const memo = new Map();
    function refMax(anchor, sex, bw, n){
      if(n <= 0) return 0; const b = Math.round(bw * 2) / 2, k = anchor + sex + b + '|' + n; if(memo.has(k)) return memo.get(k);
      const t6 = tbl(anchor === 'squat' || anchor === 'deadlift' ? 'lower' : 'upper', 6); let w6 = eng.need(anchor, { sex, bw: b }, n, 6), derived = false;
      const dv = D.derived[anchor + ':' + sex];
      if(!(w6 > 0) && dv){ const a = eng.need(dv.ratioOf[0], { sex: dv.sex, bw: 80 }, n, 6), c = eng.need(dv.ratioOf[1], { sex: dv.sex, bw: 80 }, n, 6), base = eng.need(dv.from, { sex, bw: b }, n, 6);
        w6 = a > 0 && c > 0 && base > 0 ? base * a / c : null; derived = true; }
      const v = w6 > 0 ? w6 / t6 : null; memo.set(k, v); return v; }
    // load target: the kg (as this exercise is entered) a set of r reps needs for level n
    const loadTarget = (c, body, n, r) => { if(n <= 0) return 0; const m = refMax(c.anchor, body.sex, body.bw, n); return m == null ? null : m * c.f * tbl(c.table, r); };
    // bodyweight: reps needed at level n with no added weight; added kg needed for r reps (reference side: the level's reps turned into a load with Epley)
    const tab = c => D.bw[c.base] || D.holdBw[c.base];   // a hold's table is in seconds
    const bwReps = (c, body, n) => { const t = tab(c); return Math.max(1, t[body.sex][n] * c.mult * Math.pow(D.refBw[body.sex] / body.bw, t.k)); };
    const bwAdd = (c, body, n, r) => { const R = bwReps(c, body, n); if(r >= R) return 0; const T = tab(c), ep = T.ep || 30, L = body.bw * T.share; return L * ((1 + R / ep) / (1 + r / ep) - 1); };
    // one set → { n, frac, check } or null (does not qualify)
    function scoreSet(c, body, set){
      const r = Math.floor(+set.r || 0); if(!(r >= 1)) return null;
      if(c.eng === 'load'){ const w = +set.w; if(!(w > 0)) return null;
        const t = n => loadTarget(c, body, n, r); if(t(1) == null) return null;
        if(!set.ok && w > 1.5 * t(TOP)) return { check: true };   // far above anyone in the data: "Check this set" until confirmed
        let n = 0; while(n < TOP && w >= t(n + 1)) n++; const lo = t(n), hi = n < TOP ? t(n + 1) : null;
        return { n, frac: hi ? Math.max(0, Math.min(1, (w - lo) / (hi - lo))) : 1, w, r }; }
      const a = Math.max(0, +set.w || 0);   // added kg (0 = strict, unweighted); assistance is a different exercise (PR only)
      if(!set.ok && r > 3 * bwReps(c, body, TOP)) return { check: true };
      const ok = n => a >= bwAdd(c, body, n, r) - 1e-9; let n = 0; while(n < TOP && ok(n + 1)) n++;
      let frac = 1; if(n < TOP){ if(a > 0){ const lo = bwAdd(c, body, n, r), hi = bwAdd(c, body, n + 1, r); frac = hi > lo ? (a - lo) / (hi - lo) : 0; }
        else { const lo = n ? bwReps(c, body, n) : 0, hi = bwReps(c, body, n + 1); frac = (r - lo) / (hi - lo); } }
      return { n, frac: Math.max(0, Math.min(1, frac)), w: a, r, bw: true }; }
    // what the next level needs, from the user's own best set: a weight × those reps, the reps alone, or the added weight for those reps
    function nextFor(c, body, best){ const n = best.n + 1; if(n > TOP) return null;
      if(c.eng === 'load'){ const step = c.proto === 'bar' ? 1.25 : 1, w = Math.ceil(loadTarget(c, body, n, best.r) / step - 1e-9) * step; return { n, w, r: best.r, kg: Math.max(0.5, w - best.w) }; }
      if(best.w > 0){ const add = Math.max(0.5, Math.ceil(bwAdd(c, body, n, best.r) * 2) / 2); return { n, add, r: best.r, kg: Math.max(0.5, add - best.w), ...(c.hold ? { sec: true } : {}) }; }
      return { n, reps: Math.ceil(bwReps(c, body, n) - 1e-9), kg: null, ...(c.hold ? { sec: true } : {}) }; }
    // sessions: [{ date, bw, sets: [{ w, r, ok?, before? }] }] (qualifying sets only; the caller drops warm-ups, drops and unfinished sets)
    function evaluate(c, sex, sessions){
      if(!c || !c.eng) return null; let best = null, bestBody = null; const checks = [];
      (sessions || []).forEach(s => { if(!(s.bw > 30)) return; const body = { sex, bw: s.bw };
        s.sets.forEach(st => { const x = scoreSet(c, body, st); if(!x) return; if(x.check){ checks.push({ date: s.date, w: +st.w || 0, r: +st.r }); return; }
          if(!best || x.n > best.n || (x.n === best.n && x.frac > best.frac)){ best = { ...x, date: s.date, before: st.before || 0 }; bestBody = body; } }); });
      if(!best) return { none: true, checks };
      return { n: best.n, frac: best.frac, best, next: nextFor(c, bestBody, best), checks, q: c.q }; }
    return { classify, scoreSet, evaluate, loadTarget, bwReps, bwAdd, nextFor, refMax, tbl };
  }
  // ---- seasons (pure): two a year, UTC
  const seasonOf = ms => { const d = new Date(ms); return d.getUTCFullYear() + '-H' + (d.getUTCMonth() < 6 ? 1 : 2); };
  // rec: { v: 1, sid, bv, vis: { exId: n }, floor: { exId: n }, badges: { sid: { exId: n } } } | null; raws: { exId: raw n } under the version in use.
  // A new season (also several missed while offline) archives the old visible ranks as badges, freezes the new benchmark version, and gives an
  // established lifter a floor `protect` levels under last season's visible rank (a benchmark-only drop); a genuine improvement shows at once;
  // a new lifter gets the raw result. Same input → same output (safe to run on every start, after an import, after a restore).
  function seasonStep(rec, now, bv, raws, protect){
    const sid = seasonOf(now); raws = raws || {};
    if(!rec || rec.v !== 1) return { v: 1, sid, bv, vis: { ...raws }, floor: {}, badges: {} };
    const r = { v: 1, sid: rec.sid, bv: rec.bv, vis: { ...(rec.vis || {}) }, floor: { ...(rec.floor || {}) }, badges: { ...(rec.badges || {}) } };
    if(r.sid !== sid){ r.badges[r.sid] = { ...r.vis }; r.floor = {}; Object.entries(r.vis).forEach(([id, n]) => { if(n != null) r.floor[id] = Math.max(0, n - protect); }); r.sid = sid; r.bv = bv; }
    const vis = {}; new Set([...Object.keys(raws), ...Object.keys(r.floor)]).forEach(id => { const raw = raws[id], fl = r.floor[id];
      if(raw == null && fl == null) return; vis[id] = Math.max(raw == null ? -1 : raw, fl == null ? -1 : fl); });
    r.vis = vis; return r; }
  return { create, seasonOf, seasonStep, TOP };
})();
if(typeof module !== 'undefined') module.exports = RankV4Core;

// ---------- the app adapter ----------
const RANK4 = { on: true };   // the production switch (tools/check.js runs the production path; the old tierFor body is kept only as tierForLegacy)
let _rank4 = null; const rank4 = () => _rank4 || (_rank4 = RankV4Core.create(RANK04, RankEngine.create(RANK_BENCH)));
// body weight as of a set's date: the last weigh-in on or before it, else the first after it, else the target body weight (never made up)
function rank4BwAt(date){ const w = typeof weights === 'object' && weights ? weights : {}, ks = Object.keys(w).filter(k => +w[k] > 30).sort();
  let k = null; for(const d of ks){ if(d <= date) k = d; else { if(!k) k = d; break; } }
  return (k && +w[k]) || (typeof targets !== 'undefined' && targets && +targets.bw) || 0; }
// the qualifying sets of one exercise, per workout, in the order they were done; each set knows how many sets for the same main muscles came
// before it in that workout (fatigue context only)
function rank4Sessions(exId, noLive){ const out = [], mu = (exById(exId) || {}).mu || {}, main = Object.keys(mu).filter(h => mu[h] >= 25);
  const add = s => { let before = 0, sets = [];
    (s.exercises || []).forEach(x => { const xm = (exById(x.exId) || {}).mu || {}, hits = main.some(h => (xm[h] || 0) >= 25);
      (x.sets || []).forEach(st => { if(!st.done) return; if(x.exId === exId && isMainSet(st) && st.r !== '' && +st.r >= 1) sets.push({ w: st.w === '' ? 0 : +st.w || 0, r: +st.r, ok: !!st.ok, before });
        if(hits && isMainSet(st)) before++; }); });
    if(sets.length) out.push({ date: s.date, bw: rank4BwAt(s.date), sets }); };
  sessions.forEach(add); if(typeof active !== 'undefined' && active && !noLive) add(active); return out; }
// the season record (profile.rankSeason, synced with the profile, in backups): brought up to date once per day / after workouts and imports
function rank4Season(){ const now = Date.now(), rec = profile.rankSeason;
  if(rec && rec.v === 1 && rec.sid === RankV4Core.seasonOf(now) && rec._d === todayKey()) return rec;
  const raws = {}; rankIds().forEach(id => { const r = rank4Raw(id, true); if(r && r.n != null) raws[id] = r.n; });
  const nx = RankV4Core.seasonStep(rec, now, RANK04.version, raws, RANK04.season.protect); nx._d = todayKey();
  profile.rankSeason = nx; if(typeof saveProfile === 'function') saveProfile(); return nx; }
function rank4Raw(exId, noLive){ const E = rank4(), c = E.classify(exId, exById(exId)); if(!c || !c.eng) return c;
  const sex = profile && profile.sex; if(sex !== 'm' && sex !== 'f') return { need: true, why: 'sex' };
  const list = rank4Sessions(exId, noLive); if(list.some(s => !(s.bw > 30))) return { need: true, why: 'bodyweight' };
  return E.evaluate(c, sex, list); }
// tierFor()'s shapes, plus: excluded / prOnly (the slot shows "Ranking not available"), raw (before season protection), protected, q (sourced |
// provisional), next.{ w, r } | { reps } | { add, r } (what to do), fatigue (sets for the same muscles before the best set; context only)
function rank4For(exId, noLive){
  const r = rank4Raw(exId, noLive); if(!r) return null;
  if(r.excluded || r.prOnly) return { na: r.excluded || r.prOnly };
  if(r.need) return { need: true, why: r.why }; if(r.none) return { none: true, checks: r.checks };
  const season = rank4Season(), fl = season.floor && season.floor[exId], n = fl != null && fl > r.n ? fl : r.n, prot = n > r.n;
  const res = { n, tier: TIERS[Math.floor(n / 3)], label: tierName(n), frac: prot ? 0 : r.frac, raw: r.n, protected: prot, q: r.q, checks: r.checks, best: r.best, fatigue: { before: r.best.before } };
  if(r.next && !prot){ const nx = r.next; res.next = { n: nx.n, tier: TIERS[Math.floor(nx.n / 3)], label: tierName(nx.n), kg: nx.kg, w: nx.w, r: nx.r, reps: nx.reps, add: nx.add, sec: nx.sec }; }
  else if(n < RankV4Core.TOP){ const nn = n + 1; res.next = { n: nn, tier: TIERS[Math.floor(nn / 3)], label: tierName(nn), kg: null, beat: true }; }
  return res; }
