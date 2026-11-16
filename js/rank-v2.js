// ---------- New rank engine in the app: the adapter (ranking-1). SWITCHED OFF: nothing calls it yet. ----------
// The live rank is still tierFor() in gym.js (RANK / TIER_STD in data/gym.js) and is not touched. This file only turns the app's
// saved workouts into what RankEngine.evaluate() needs, and gives the answer in tierFor()'s shape, so the switch is one line later:
//     in tierFor():   if(RANK2.on) return rank2For(exId, noLive);
// Do not flip RANK2.on before Petros approves (docs/RANKING_REPORT.md). Engine: js/rank-engine.js. Benchmarks: js/data/rank-bench.js.
// When the Ranks switch of 0.7.10.6 exists, every caller of tierFor() already respects it; nothing here draws on screen.
const RANK2 = { on: false };
let _rank2 = null, _rank2Memo = {};
const rank2Engine = () => _rank2 || (_rank2 = RankEngine.create(RANK_BENCH));
// body weight on a day: the last weigh-in on or before it, else the first one after, else the target body weight
function rank2BwAt(date){ const w = typeof weights === 'object' && weights ? weights : {}, ks = Object.keys(w).filter(k => +w[k] > 30).sort();
  let k = null; for(const d of ks){ if(d <= date) k = d; else { if(!k) k = d; break; } }
  return (k && +w[k]) || (targets && +targets.bw) || 0; }
// one entry per workout with this lift: finished normal sets only (no warm-ups, drops or the right side of L/R), the kg as typed
// (the engine adds body weight for bodyweight moves and takes assistance off, from the benchmark's loadType); st.ok = "Check this set" confirmed
function rank2Sessions(exId, noLive){ const out = [];
  const add = s => { const sets = [];
    s.exercises.forEach(x => { if(x.exId !== exId) return; x.sets.forEach(st => { if(st.done && isMainSet(st) && st.w !== '' && st.r !== '' && +st.r >= 1) sets.push({ w: +st.w || 0, reps: +st.r, ok: !!st.ok }); }); });
    if(sets.length) out.push({ day: daysUntil(s.date), bw: rank2BwAt(s.date), sets }); };
  sessions.forEach(add); if(active && !noLive) add(active); return out; }
// the same answer shapes as tierFor(): null (no rank for this lift) · { need: true } (sex or body weight missing) · { none: true } (no sets yet)
// · { n, tier, label, frac, next?: { n, tier, label, kg } } plus the new parts: pending ({ n, label }: Platinum or higher waiting for a second
// workout), estimate (the anchor lift's id when the rank comes from a variation factor), confidence, checks (sets to confirm), capped
function rank2For(exId, noLive){ const eng = rank2Engine(), sex = profile && profile.sex;
  if(sex !== 'm' && sex !== 'f') return eng.db.exercises[exId] || eng.db.variants[exId] ? { need: true } : null;
  if(eng.model(exId, sex).none) return null;
  const list = rank2Sessions(exId, noLive); if(list.some(s => !(s.bw > 30))) return { need: true };
  const age = profile && +profile.age > 0 ? +profile.age : undefined;   // age is not stored yet: no age adjustment until it is
  const key = exId + '|' + sex + '|' + (age || '') + '|' + JSON.stringify(list); let r = _rank2Memo[exId];
  if(!r || r.key !== key) r = _rank2Memo[exId] = { key, res: eng.evaluate(exId, { sex, age }, list, 0) };
  const e = r.res; if(!e.ranked) return e.none ? { none: true } : null;
  const res = { n: e.n, tier: e.tier, label: tierName(e.n), frac: e.frac, confidence: e.confidence, estimate: e.estimate, checks: e.checks, capped: e.capped };
  if(e.next) res.next = { n: e.next.n, tier: e.next.tier, label: tierName(e.next.n), kg: Math.max(0.5, Math.ceil(e.next.kg * 2) / 2) };
  if(e.pending) res.pending = { n: e.pending.n, label: tierName(e.pending.n) };
  return res; }
