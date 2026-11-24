// Left / Right pairs and load conventions (Prompt 1). Pure helpers over the reviewed table in js/data/gym-lat.js: what a typed weight means,
// one shared conversion to the real external load and volume, and pair handling that survives drop sets and layout switches.
// Nothing here reads the DOM or saved data except through the arguments. Old workouts have no `cv` on their exercise: they keep the meaning they
// always had (typed weight × reps, one row = one set); nothing here guesses what an old number meant.
//
// Saved shape (an exercise in a workout): x.uni (Left / Right rows for new sets), x.jt (one-tap finishing was ON when the card was made),
// x.cv = { l: 'hand'|'total'|'bar'|'stack'|'bw'|'band'|'none', n: implements moved together in the one-row layout, rp: 'both'|'side', ask?: 1, pt?: 1 }.
// A set row: { w, r, side?: 'L'|'R', pr?: pair id (both rows of one pair share it; a drop pair has its own), skip?: true (that side was not done), tw/tr: R field edited by hand }.
const Lat = (() => {
  const TABLE = () => (typeof LAT === 'object' && LAT) || {};
  const F = ['mode', 'load', 'n', 'rp', 'unit', 'alt', 'note'];
  const row = a => a ? Object.fromEntries(F.map((k, i) => [k, a[i]])) : null;
  const info = id => row(TABLE()[id]);   // null for custom / unknown ids
  const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  const rnd = v => Math.round(v * 1e6) / 1e6;

  // Left / Right default for NEW work. Built-ins: the reviewed table. Custom (has `mus`): exactly what the creator chose. Unknown ids: not paired.
  const defaultPaired = (id, ex) => { const L = info(id); if(L) return L.mode === 'P'; return !!(ex && ex.custom && ex.uni === true); };
  // can the card offer the L | R pill? (barbell hides it, except where the table says the movement is one-sided, e.g. Meadows row, landmine)
  const canPair = (id, ex) => { if(!ex || ex.m === 'cardio') return false; const L = info(id); if(L) return L.mode === 'P' || ex.e !== 'barbell'; return ex.e !== 'barbell'; };
  const LOADOF = { dumbbell: 'hand', kettlebell: 'hand', barbell: 'bar', machine: 'stack', cable: 'stack', band: 'band', bodyweight: 'bw' };
  function defaultCv(id, ex){
    if(!ex || ex.m === 'cardio') return null; const L = info(id);
    if(L) return { l: L.load, n: L.n, rp: L.rp, ...(L.alt ? { ask: 1 } : {}) };
    const l = LOADOF[ex.e] || 'stack', one = ex.custom && ex.uni === true;   // custom one-sided: one implement, reps per side; custom bilateral dumbbells: two, together
    return { l, n: l === 'hand' ? (one ? 1 : ex.e === 'dumbbell' ? 2 : 1) : 1, rp: one ? 'side' : 'both' };
  }

  // ---- the shared conversion: every consumer asks here, none re-derives it
  const rowN = cv => !cv ? 1 : cv.rp === 'both' ? Math.max(1, (cv.n || 1) / 2) : (cv.n || 1);   // implements held by ONE side's row
  // actual external kg moved in one rep of this row: bells × typed weight (per-hand), the typed total, the bar, the stack
  function ext(x, s){ const w = num(s.w), cv = x && x.cv; if(!cv) return w; if(cv.l === 'hand') return w * (s.side ? rowN(cv) : (cv.n || 1)); return w; }
  // how many sides one saved row stands for: a Left / Right row is one side; a one-row set with "reps each side" means both sides, done equally
  const sides = (x, s) => !x || !x.cv || s.side ? 1 : x.cv.rp === 'side' ? 2 : 1;
  // typed weight expressed per implement (what history, progression and PR checks compare); only a typed TOTAL needs converting
  const unitW = (x, s) => { const w = num(s.w), cv = x && x.cv; return cv && cv.l === 'total' && !s.side ? w / Math.max(1, cv.n || 1) : w; };
  // real external volume of one row, with the caller's body-weight / assistance rule (loadOf) applied to the external load
  const volume = (x, s, loadOf) => (loadOf ? loadOf(x.exId, ext(x, s)) : ext(x, s)) * num(s.r) * sides(x, s);
  // the like-for-like volume that records are compared on (per-implement weight × reps × sides), so a new two-bell set never fakes a record against old history
  const basis = (x, s, loadOf) => (loadOf ? loadOf(x.exId, unitW(x, s)) : unitW(x, s)) * num(s.r) * sides(x, s);

  // an exercise's sets with the typed weight read PER IMPLEMENT (only a typed total needs converting); a copy, the saved sets are never touched.
  // History readers (progression, records, ranks, coach) use this so 40 kg total and 20 kg per hand are the same lift.
  const sets = x => { const S = (x && x.sets) || []; return x && x.cv && x.cv.l === 'total' ? S.map(z => z.side ? z : { ...z, w: String(unitW(x, z)) }) : S; };

  // ---- pairs
  const newPr = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // legacy rows (an L directly followed by an R, no `pr`) get a pair id; idempotent, never changes a value
  function ensurePairs(x){ const S = x.sets; for(let i = 0; i < S.length - 1; i++){ const a = S[i], b = S[i + 1];
    if(a.side === 'L' && b.side === 'R' && !a.pr && !b.pr && !!a.drop === !!b.drop){ a.pr = b.pr = newPr(); i++; } } return x; }
  // the other side of a pair (index), by pair id; -1 when there is none
  function mate(x, j){ const s = x.sets[j]; if(!s || !s.side || !s.pr) return -1; return x.sets.findIndex((z, k) => k !== j && z.pr === s.pr && z.side && z.side !== s.side); }
  const pairIdx = (x, j) => { const m = mate(x, j); return m < 0 ? [j] : [Math.min(j, m), Math.max(j, m)]; };
  // the finished work of one exercise as LOGICAL sets, for rank and other consumers that must count one pair once: warm-ups and drop rows are left out;
  // a one-row set is { kind: 'one', row }; both sides of a pair (found by pair id, else an L directly followed by its R) are { kind: 'pair', L, R };
  // a side with no finished mate (one side only, or the other side not done) is { kind: 'lone', row }. Pure: nothing is tagged or changed.
  function logical(x){
    const S = (x && x.sets) || [], out = [], seen = new Set();
    S.forEach((z, j) => {
      if(seen.has(j) || z.type === 'W' || z.drop) return; seen.add(j);
      if(!z.side){ if(z.done) out.push({ kind: 'one', row: z }); return; }
      let m = -1;
      if(z.pr) m = S.findIndex((q, k) => k !== j && q.pr === z.pr && q.side && q.side !== z.side);
      else if(z.side === 'L' && S[j + 1] && S[j + 1].side === 'R' && !S[j + 1].pr && !S[j + 1].drop) m = j + 1;
      if(m >= 0) seen.add(m);
      const o = m >= 0 ? S[m] : null, Lr = z.side === 'L' ? z : o, Rr = z.side === 'R' ? z : o;
      if(Lr && Lr.done && Rr && Rr.done) out.push({ kind: 'pair', L: Lr, R: Rr });
      else { const d = z.done ? z : o && o.done ? o : null; if(d) out.push({ kind: 'lone', row: d }); }
    });
    return out;
  }
  const open = z => !z.done && !z.skip;
  // two matching rows can be one compact set only when nothing would be lost
  const ANN = ['type', 'drop', 'hr', 'ng', 'rir', 'cal', 'lvl'];
  function matched(a, b){ return !!a && !!b && a.side === 'L' && b.side === 'R' && !a.skip && !b.skip && !!a.done === !!b.done && String(a.w) === String(b.w) && String(a.r) === String(b.r) && ANN.every(k => (a[k] ?? null) === (b[k] ?? null)); }

  // Left / Right rows on or off for one exercise. Off merges ONLY matched pairs (and sets one-row layout for new sets); an unequal or partly done pair, a
  // skipped side, anything with an annotation that differs stays as its own rows, so nothing is ever lost. A typed TOTAL becomes per-hand while rows are on
  // and is restored (cv.pt) when the pair merges back, so the round trip is exact.
  function makeUni(x, on, uid){
    const id = uid || (() => 'r' + newPr());
    ensurePairs(x); const cv = x.cv;
    if(on){
      x.uni = true;
      if(cv && cv.l === 'total'){ const k = Math.max(1, cv.n || 1); x.sets.forEach(z => { if(!z.side && z.w !== '') z.w = String(rnd(num(z.w) / k)); }); cv.l = 'hand'; cv.pt = 1; }
      const out = []; x.sets.forEach(z => { if(z.side){ out.push(z); return; } const pr = newPr(); out.push({ ...z, side: 'L', pr }); out.push({ ...z, id: id(), side: 'R', pr, ...(z.done ? { at: z.at } : {}) }); });
      x.sets = out;
    } else {
      x.uni = false; const out = [], done = new Set();
      x.sets.forEach((z, j) => { if(done.has(j)) return; const m = mate(x, j);
        if(z.side === 'L' && m > j && matched(z, x.sets[m])){ const c = { ...z }; delete c.side; delete c.pr; out.push(c); done.add(m); }
        else out.push(z); });
      x.sets = out;
      if(cv && cv.pt && !x.sets.some(z => z.side)){ const k = Math.max(1, cv.n || 1); x.sets.forEach(z => { if(z.w !== '') z.w = String(rnd(num(z.w) * k)); }); cv.l = 'total'; delete cv.pt; }
    }
    return x;
  }
  // a fresh pair (or one row) of the given type
  const freshSet = (type, uid) => ({ id: (uid || (() => 'r' + newPr()))(), type: type || 'N', w: '', r: '', done: false });
  function newPair(type, uid, drop){ const pr = newPr(); return ['L', 'R'].map(side => ({ ...freshSet(type, uid), side, pr, ...(drop ? { drop: true } : {}) })); }

  // choices the person can make for the load convention before a first set is finished (value = what is stored in x.cv)
  function options(x){
    const cv = x.cv, L = info(x.exId); if(!cv || !(cv.l === 'hand' || cv.l === 'total')) return [];
    if(x.uni) return (L ? L.rp === 'side' : cv.rp === 'side') ? [1, 2].map(n => ({ l: 'hand', n, rp: 'side' })) : [];
    if(L && L.alt) return [{ l: 'hand', n: 2, rp: 'both' }, { l: 'total', n: 2, rp: 'both' }, { l: 'hand', n: 1, rp: 'side' }];
    if(L ? L.rp === 'side' : cv.rp === 'side') return [{ l: 'hand', n: 1, rp: 'side' }, { l: 'hand', n: 2, rp: 'side' }];
    if(cv.n === 2 || (L && L.n === 2)) return [{ l: 'hand', n: 2, rp: 'both' }, { l: 'total', n: 2, rp: 'both' }];
    return [];
  }
  // text key for a convention (strings.js cv_*) and whether reps per side must be said
  const labelKey = (cv, rows) => !cv ? '' : cv.l === 'total' ? 'cvTotal' : cv.l === 'bar' ? 'cvBar' : cv.l === 'stack' ? (rows ? 'cvStackSide' : 'cvStack') : cv.l === 'hand' ? ((rows ? rowN(cv) : cv.n) >= 2 ? 'cvHand2' : (rows || cv.rp === 'side' ? 'cvHand' : 'cvOne')) : '';

  return { logical, sets, info, defaultPaired, canPair, defaultCv, rowN, ext, sides, unitW, volume, basis, ensurePairs, mate, pairIdx, open, matched, makeUni, newPair, freshSet, options, labelKey, newPr };
})();
