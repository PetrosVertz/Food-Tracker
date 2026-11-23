// Gym Coach intelligence: the quiet, deterministic part of the coach. Plain code, no AI call anywhere in this file.
// Food Track · Gym Buddy — plain browser script, loaded after gym.js (uses gym.js / wire/04 helpers only inside functions).
//
// What it does (all local, all from what the athlete actually logged):
//   hist / evidence      the comparable history of one exercise and how much it can be trusted (sessions, recency against the athlete's OWN rhythm,
//                        consistency, breaks, whether effort was logged). Used to set how firmly to recommend; never shown as a number.
//   progression          double progression from real sets: add reps inside the range, add weight only when the top of the range is reached
//                        convincingly (all sets, twice in a row, or logged reps-in-reserve), one weak day is not a trend, a break means rebuild.
//                        suggestFor() (gym.js) uses it, so the live workout hints and the coach agree.
//   live / nudge         what is happening in the running workout (sets, drops, overlap, what is left) and, rarely, ONE proactive hint
//                        (each hint once per workout, at most two per workout, dismissed ones never again).
//   proposal / applyOp   a change the coach PROPOSES (weight, reps, sets, swap, add) is checked against the running workout and the exercise
//                        library; only the user's Apply runs applyOp, which returns its own undo. Nothing here saves on its own.
//   recovery             the ONE door to recovery for the coach: a RECOVERY+ snapshot when that exists (versioned, may be stale), else the
//                        current estimate (gym.js recMapNow). Never computes recovery itself. Unknown stays unknown.
//   brief / voice        the coach's personality and a small, task-specific context packet per message (a bench question does not carry the
//                        whole exercise library or every saved workout).
//   memory               device-only (Store 'gymCoach'): recent chat lines per coach window, hints already shown, past proposals + outcome.
//
// Exercise-science basis (kept here, not shown to users): double progression and small load steps (ACSM 2009 progression position stand;
// Helms et al. 2016 RIR-based RPE), reps-in-reserve as optional extra signal (Zourdos et al. 2016), set-to-set rep loss at a fixed load being
// normal with short rests (Willardson 2006; Senna et al. 2011), roughly 10+ hard sets per muscle per week for growth with diminishing returns per
// session (Schoenfeld et al. 2017; Pelland et al. 2024 dose-response), and strength mostly kept over 2–3 weeks off with a quick return
// (McMaster et al. 2013; Ogasawara et al. 2013). Thresholds below are deliberately conservative and relative to the athlete's own data.

const GymIntel = (() => {
  const DAY = 864e5, NAME = 'gymCoach';
  const ago = iso => (Date.now() - new Date(iso).getTime()) / DAY;
  const median = a => { const v = a.filter(x => isFinite(x)).sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
  const kg = w => `${+(+w).toFixed(2)} kg`;
  const nm = id => { const x = exById(id); return (x && (x.en || x.id)) || id; };
  const lift = id => { const x = exById(id); return !!x && !isCardio(id); };
  const bw = id => { const x = exById(id); return !!x && x.e === 'bodyweight'; };
  const assist = id => typeof gymIsAssist === 'function' && gymIsAssist(id);
  const step = id => { const e = exById(id).e; return e === 'dumbbell' ? 2 : e === 'kettlebell' ? 4 : 2.5; };
  const round = (w, id) => Math.max(0, r25(w, exById(id).e));

  // ---------------------------------------------------------------- history of one exercise (completed working sets only)
  // → [{ id, date, start, pos, sets: [{ w, r, rir, f }], top: { w, r }, atTop: [reps at the top weight], e1 }] oldest first
  function hist(exId, skipId){
    const out = [];
    (typeof sessions !== 'undefined' ? sessions : []).forEach(s => { if(!s || !s.start || s.id === skipId || !Array.isArray(s.exercises)) return;
      const pos = s.exercises.findIndex(x => x && x.exId === exId); if(pos < 0) return;
      const sets = s.exercises.filter(x => x && x.exId === exId).flatMap(x => x.sets || [])
        .filter(z => z && z.done && isMainSet(z) && z.w !== '' && z.w != null && +z.r > 0 && isFinite(+z.w))
        .map(z => ({ w: +z.w, r: +z.r, rir: z.rir != null && z.rir !== '' && isFinite(+z.rir) ? +z.rir : null, f: z.type === 'F' }));
      if(!sets.length) return;
      const top = sets.reduce((b, z) => z.w > b.w || (z.w === b.w && z.r > b.r) ? z : b, sets[0]);
      out.push({ id: s.id, date: s.date, start: s.start, pos, sets, top: { w: top.w, r: top.r }, topSet: top, atTop: sets.filter(z => z.w === top.w).map(z => z.r),
        e1: Math.max(0, ...sets.map(z => e1rm(z.w, z.r, exId))) }); });
    return out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  }
  // the athlete's own rhythm: median days between workouts (last ~12), null with fewer than 3
  function cadence(){
    const st = (typeof sessions !== 'undefined' ? sessions : []).map(s => s && s.start).filter(Boolean).sort().slice(-13).map(s => new Date(s).getTime());
    const gaps = st.slice(1).map((v, i) => (v - st[i]) / DAY).filter(g => g > .3);
    return gaps.length >= 2 ? median(gaps) : null;
  }

  // ---------------------------------------------------------------- how much the history of one exercise supports a conclusion
  // level: none | thin | some | solid. Relative to the athlete's own rhythm, not fixed calendar windows. Missing effort data is just missing.
  function evidence(exId, h){
    h = h || hist(exId, typeof active !== 'undefined' && active ? active.id : null);
    if(!h.length) return { level: 'none', n: 0 };
    const t = h.map(x => new Date(x.start).getTime()), own = median(t.slice(1).map((v, i) => (v - t[i]) / DAY).filter(g => g > .3)), cad = cadence();
    const breakAt = Math.max(14, 3 * Math.max(own || 0, cad || 0, 2.5)), last = h[h.length - 1], since = ago(last.start);
    let from = 0; for(let i = 1; i < h.length; i++) if((t[i] - t[i - 1]) / DAY > breakAt) from = i;   // the history since the last break counts most
    const recent = h.slice(from), comp = recent.filter(x => Math.abs(x.top.r - last.top.r) <= 4);   // comparable: same kind of rep work
    const e = comp.slice(-5).map(x => x.e1).filter(v => v > 0), spread = e.length >= 2 ? Math.max(...e) / Math.min(...e) - 1 : null;
    let trend = null;
    if(comp.length >= 3){ const ref = median(comp.slice(-4, -1).map(x => x.e1)), d = ref ? last.e1 / ref - 1 : 0; trend = d > .02 ? 'up' : d < -.03 ? 'down' : 'flat'; }
    else if(comp.length === 2){ const d = comp[0].e1 ? last.e1 / comp[0].e1 - 1 : 0; trend = d > .02 ? 'up' : d < -.05 ? 'down' : 'flat'; }
    const consistent = spread === null ? null : spread < .15, onBreak = since > breakAt;
    let level = comp.length >= 4 && consistent !== false ? 'solid' : comp.length >= 2 ? 'some' : 'thin';
    if(onBreak) level = level === 'solid' ? 'some' : 'thin';
    return { level, n: h.length, recentN: recent.length, compN: comp.length, onBreak, since: Math.round(since), breakAt: Math.round(breakAt), trend, consistent,
      effort: recent.some(x => x.sets.some(z => z.rir != null || z.f)), effortLast: last.sets.some(z => z.rir != null || z.f), last };
  }

  // ---------------------------------------------------------------- next-session recommendation for one exercise
  // act: start | comeback | increase | consolidate | reps | repeat | hold | lighten | harder
  // Same fields suggestFor() always returned ({ w, r, last, first, est, cb, p }) plus act, strength (firm | suggest | tentative) and why (facts).
  function progression(exId, reps){
    if(!lift(exId)) return null;
    const [lo, hi] = repRange(reps), h = hist(exId, typeof active !== 'undefined' && active ? active.id : null);
    if(!h.length){ const ur = (typeof usualReps === 'function' && usualReps(exId)) || hi, est = typeof estimateNew === 'function' ? estimateNew(exId, ur) : null;
      return est ? { act: 'start', first: true, est: true, w: est, r: ur, lo, hi, strength: 'tentative', why: ['no sessions of this exercise yet; estimate from related lifts'] }
        : { act: 'start', first: true, lo, hi, strength: 'tentative', why: ['no sessions of this exercise yet'] }; }
    const ev = evidence(exId, h), L = h[h.length - 1], range = `${lo}-${hi}`, strength = { solid: 'firm', some: 'suggest' }[ev.level] || 'tentative';
    const fact = x => `${x.date}: ${x.sets.map(z => `${+z.w}x${z.r}${z.rir != null ? ` (${z.rir} in reserve)` : ''}${z.f ? ' (to failure)' : ''}`).join(', ')}`;
    const base = { lo, hi, last: L, ev, strength };
    // the app's own comeback rule (a long break for every lift) comes first: it is already on screen elsewhere
    const f = typeof comebackFactor === 'function' ? comebackFactor() : 1;
    if(f < 1){ const pre = comeback && comeback.ref && comeback.ref[exId] ? comeback.ref[exId] : L.top.w;
      return { ...base, act: 'comeback', cb: true, p: Math.round(f * 100), w: round(pre * f, exId), r: range, strength: 'tentative', why: [`back after a break; last before it ${fact(L)}`] }; }
    if(ev.onBreak){ const lastAny = (typeof sessions !== 'undefined' ? sessions : []).map(s => s && s.start).filter(Boolean).sort().pop(), still = lastAny && ago(lastAny) < ev.breakAt;
      const k = still ? (ev.since >= 42 ? .85 : .9) : typeof cbBase === 'function' ? cbBase(ev.since) : .9;   // still training other lifts: strength fades less
      return { ...base, act: 'comeback', cb: true, p: Math.round(k * 100), w: bw(exId) ? L.top.w : round(L.top.w * k, exId), r: range, strength: 'tentative',
        why: [`${ev.since} days since the last session of this exercise (usual gap far shorter)`, `last: ${fact(L)}`] }; }
    // one weak day is not a trend: judge from the best of the previous few; two weak days in a row is worth a hold
    let B = L, act = null; const why = [`last: ${fact(L)}`];
    if(h.length >= 2){ const prev = h.slice(-4, -1), best = prev.reduce((b, x) => x.e1 > b.e1 ? x : b, prev[0] || L);
      if(best && best.e1 > 0 && L.e1 < best.e1 * .92){
        const p2 = h[h.length - 2], before = h.slice(-5, -2), ref2 = before.length ? Math.max(...before.map(x => x.e1)) : 0;
        if(ref2 && p2 !== best && p2.e1 < ref2 * .95){ act = 'hold'; why.push(`the previous session was also below their earlier best (${fact(p2)})`); }
        else { act = 'repeat'; B = best; why.push(`one session below their recent best (${fact(best)}); treat it as an off day`); } } }
    if(act === 'hold') return { ...base, act, w: L.top.w, r: range, strength: 'tentative', why };
    if(act === 'repeat') return { ...base, act, w: B.top.w, r: Math.min(hi, B.top.r), strength: 'tentative', why };
    if(L !== h[0]) why.push(`before: ${fact(h[h.length - 2])}`);
    const W = B.top.w, atW = B.atTop, topHit = B.top.r >= hi;
    const allHit = atW.length >= 2 && atW.every(r => r >= hi);
    const prevSame = h.length >= 2 ? h[h.length - 2] : null, twice = !!prevSame && prevSame.top.w === W && prevSame.top.r >= hi;
    const room = B.topSet && B.topSet.rir != null && B.topSet.rir >= 2;   // only when logged; a missing value is never read as 0
    if(topHit && (allHit || twice || room)){
      why.push(allHit ? `all ${atW.length} sets at ${kg(W)} reached ${hi}+ reps` : twice ? `top of ${range} reached two sessions in a row at ${kg(W)}` : `top of ${range} reached with ${B.topSet.rir} reps in reserve logged`);
      if(bw(exId)) return { ...base, act: 'harder', w: W, r: range, why };
      const nw = assist(exId) ? Math.max(0, round(W - step(exId), exId)) : round(W + step(exId), exId);
      return { ...base, act: 'increase', w: nw, r: range, why };
    }
    if(topHit){ why.push(`top of ${range} reached on one set only`); return { ...base, act: 'consolidate', w: W, r: hi, why }; }
    const lowTwice = B.top.r < lo && prevSame && prevSame.top.w === W && prevSame.top.r < lo;
    if(lowTwice && !bw(exId) && !assist(exId)){ why.push(`below ${lo} reps at ${kg(W)} two sessions in a row`); return { ...base, act: 'lighten', w: round(W * .93, exId), r: range, why }; }
    return { ...base, act: 'reps', w: W, r: Math.min(hi, Math.max(lo, B.top.r + 1)), why };
  }

  // ---------------------------------------------------------------- the running workout
  const groupOf = h => HEADS[h] && HEADS[h][2];
  // hard sets per muscle group from completed sets (max over the group's heads, like Athlete OS state)
  function groups(list){ const g = {}; Object.entries(hitsFrom(list, false)).forEach(([h, v]) => { const k = groupOf(h); if(k && k !== 'cardio' && k !== 'other') g[k] = Math.max(g[k] || 0, v); }); return g; }
  // this session: one hard set counts once for every group the exercise mainly trains (a head at 50% or more), the usual way sets per muscle are counted
  function sessionGroups(act){ const g = {};
    act.exercises.forEach(x => { const e = exById(x.exId); if(!e || !e.mu || isCardio(x.exId)) return; const gs = new Set(Object.entries(e.mu).filter(([, p]) => p >= 50).map(([h]) => groupOf(h)).filter(k => k && k !== 'other'));
      const n = (x.sets || []).filter(z => z.done && isMainSet(z)).length; gs.forEach(k => { g[k] = (g[k] || 0) + n; }); }); return g; }
  function live(act){
    act = act === undefined ? (typeof active !== 'undefined' ? active : null) : act; if(!act || !Array.isArray(act.exercises)) return null;
    const xs = act.exercises.map((x, i) => {
      const d = (x.sets || []).filter(z => z.done && isMainSet(z) && +z.r > 0), planned = (x.sets || []).filter(isMainSet).length, flags = [];
      if(!lift(x.exId)) return { i, exId: x.exId, cardio: true, done: d.length, planned, ended: !!x.ended, flags };
      const h = hist(x.exId, act.id), L = h[h.length - 1], ev = h.length ? evidence(x.exId, h) : { level: 'none' };
      if(d.length && L && !ev.onBreak){ const f0 = d[0], ref = L.sets[0];
        if(+f0.w >= ref.w && +f0.r >= ref.r + 2) flags.push('ahead');
        else if(+f0.w <= ref.w && +f0.r <= ref.r * .75 && ref.r - +f0.r >= 2) flags.push('below'); }
      let drop = null, first = d[0];   // drop: reps lost from the first to the latest set at the same weight
      for(let k = 1; k < d.length; k++){ if(+d[k].w !== +first.w) first = d[k]; else drop = Math.max(drop || 0, 1 - +d[k].r / +first.r);
        if(+d[k].w !== +d[k - 1].w) continue; const r0 = +d[k - 1].r, r1 = +d[k].r; if(r1 <= r0 * .6 && r0 - r1 >= 3) flags.push('sharp' + k); }
      return { i, exId: x.exId, done: d.length, planned, ended: !!x.ended, sets: d.map(z => ({ w: +z.w, r: +z.r, rir: z.rir != null && z.rir !== '' ? +z.rir : null })), flags, drop, ev: ev.level, last: L || null, reps: x.reps };
    });
    const g = sessionGroups(act), left = xs.filter(x => !x.ended && x.done < x.planned);
    return { name: act.name || act.type || 'workout', mins: act.clock0 ? Math.round((Date.now() - act.clock0) / 6e4) : act.start ? Math.round(ago(act.start) * 1440) : null,
      xs, groups: g, left, cur: typeof act.cur === 'number' ? act.cur : null };
  }

  // ONE proactive hint, rarely: { key, kind, xi, exId, text (strings key + params), op (a change to propose) | null }. Deterministic; no AI.
  function nudge(act, seenKeys){
    const L = live(act); if(!L) return null; const seen = new Set(seenKeys || []), rej = new Set(load().said.filter(x => x.out === 'no').map(x => x.key));
    if([...seen].filter(k => k.startsWith(act.id + ':')).length >= 2) return null;   // at most two hints in one workout
    const K = k => `${act.id}:${k}`, open = k => !seen.has(K(k)) && !rej.has(K(k));
    for(const x of L.xs){ if(x.cardio || x.ended || !x.done) continue;
      const ex = act.exercises[x.i], undone = (ex.sets || []).filter(z => !z.done && z.type !== 'W' && !z.drop).length, last = x.sets[x.sets.length - 1], [, hi] = repRange(ex.reps);
      // ahead of last time and the top of the range already on the first sets: a small step up for what is left (only with some history behind it)
      if(x.flags.includes('ahead') && undone && x.ev !== 'thin' && x.ev !== 'none' && last.r >= hi + 1 && !bw(x.exId) && !assist(x.exId) && open('up' + x.i)){
        const w = round(last.w + step(x.exId), x.exId);
        if(w > last.w) return { key: K('up' + x.i), kind: 'up', xi: x.i, exId: x.exId, text: ['gciNUp', { n: exName(x.exId), r: last.r, w: fmtW(w) }], op: { type: 'weight', xi: x.i, exId: x.exId, w } }; }
      // two big drops in a row at the same weight (well beyond normal set-to-set fatigue): offer a lighter weight for what is left
      const sharp = x.flags.filter(f => f.startsWith('sharp')).length;
      if((sharp >= 2 || (sharp && x.flags.includes('below'))) && undone && !bw(x.exId) && open('drop' + x.i)){
        const w = round(last.w * .9, x.exId);
        if(w > 0 && w < last.w) return { key: K('drop' + x.i), kind: 'drop', xi: x.i, exId: x.exId, text: ['gciNDrop', { n: exName(x.exId), w: fmtW(w) }], op: { type: 'weight', xi: x.i, exId: x.exId, w } }; }
    }
    // a lot of work for one muscle group in this session and more of it still planned: a heads-up, no change proposed
    for(const [g, v] of Object.entries(L.groups)){ if(v < 12 || !open('vol' + g)) continue;
      const more = L.left.some(x => { const e = exById(x.exId); return e && e.mu && Object.entries(e.mu).some(([h, p]) => p >= 50 && groupOf(h) === g); });
      if(more) return { key: K('vol' + g), kind: 'vol', group: g, text: ['gciNVol', { g: ML(g), n: Math.round(v) }], op: null }; }
    return null;
  }
  const fmtW = w => typeof fmt === 'function' ? fmt(w) : String(w);

  // ---------------------------------------------------------------- proposed changes: check, apply (only on the user's tap), undo
  const OPS = ['weight', 'reps', 'sets', 'swap', 'add'];
  const num = (v, lo, hi) => { const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+(?:[.,]\d+)?\s*$/.test(v) ? +v.replace(',', '.') : NaN; return isFinite(n) && n >= lo && n <= hi ? n : null; };
  const findEx = name => { if(!name || typeof exByName !== 'function') return null; const x = exByName(String(name).slice(0, 80)); return x && x.id ? x : null; };
  // raw = what the AI returned in "change"; act = the running workout. → a normalized op, or null when anything does not check out
  function proposal(raw, act){
    if(!raw || typeof raw !== 'object' || Array.isArray(raw) || !act || !Array.isArray(act.exercises)) return null;
    const type = String(raw.type || '').toLowerCase(); if(!OPS.includes(type)) return null;
    const why = String(raw.why || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if(type === 'add'){ const to = findEx(raw.to || raw.exercise); if(!to || act.exercises.some(x => x.exId === to.id && !x.ended)) return null; return { type, exId: to.id, to: to.id, why }; }
    // the exercise must be one in this workout: a loose name ("Squat") means the squat they are doing, not some other variant in the library
    const q = norm(String(raw.exercise || '').slice(0, 80)), names = x => { const e = exById(x.exId); return [e.en, e.el, ...(e.al || [])].filter(Boolean).map(norm); };
    let xi = !q ? -1 : act.exercises.findIndex(x => !x.ended && names(x).includes(q));
    if(xi < 0 && q.length >= 4){ const hits = act.exercises.map((x, i) => [x, i]).filter(([x]) => !x.ended && names(x).some(n => n.includes(q) || q.includes(n))); if(hits.length === 1) xi = hits[0][1]; }
    if(xi < 0){ const want = findEx(raw.exercise); if(!want) return null; xi = act.exercises.findIndex(x => x.exId === want.id && !x.ended); }
    if(xi < 0) return null;
    const x = act.exercises[xi], undone = x.sets.filter(z => !z.done && z.type !== 'W' && !z.drop), done = x.sets.filter(z => z.done && isMainSet(z)).length;
    if(type === 'weight'){ const w = num(raw.w, 0, 500); if(w === null || Math.round(w * 4) !== w * 4 || !undone.length || isCardio(x.exId)) return null; return { type, xi, exId: x.exId, w, why }; }
    if(type === 'reps'){ const r = num(raw.r, 1, 50); if(r === null || r % 1 || !undone.length) return null; return { type, xi, exId: x.exId, r, why }; }
    if(type === 'sets'){ const n = num(raw.n, 1, 10); if(n === null || n % 1 || n < done || n === x.sets.filter(isMainSet).length) return null; return { type, xi, exId: x.exId, n, why }; }
    const to = findEx(raw.to); if(!to || to.id === x.exId || isCardio(to.id) !== isCardio(x.exId)) return null;   // swap
    return { type, xi, exId: x.exId, to: to.id, why, after: done > 0 };   // with sets already done, the new one goes after it instead
  }
  // the op still fits the workout as it is now (the user may have changed things since the card was shown)
  function stillFits(op, act){ if(!act) return false; if(op.type === 'add') return !act.exercises.some(x => x.exId === op.exId && !x.ended);
    const x = act.exercises[op.xi]; return !!x && x.exId === op.exId && !x.ended; }
  // apply(op, act) → undo(); changes ONLY not-yet-done sets of the named exercise (or adds one). Never touches finished sets or saved sessions.
  function applyOp(op, act){
    if(!stillFits(op, act)) return null;
    const mk = typeof newSet === 'function' ? newSet : () => ({ id: Math.random().toString(36).slice(2), type: 'N', w: '', r: '', done: false });
    if(op.type === 'add'){ const id = op.exId, e = exById(id), x = { exId: id, reps: isCardio(id) ? '20' : defReps(e.rest), rest: e.rest, sets: [mk(), mk(), mk()] };
      act.exercises.push(x); return () => { const i = act.exercises.indexOf(x); if(i > -1 && !x.sets.some(z => z.done)) act.exercises.splice(i, 1); }; }
    const x = act.exercises[op.xi], open = x.sets.filter(z => !z.done && z.type !== 'W' && !z.drop);
    if(op.type === 'weight' || op.type === 'reps'){ const k = op.type === 'weight' ? 'w' : 'r', old = open.map(z => [z, z[k]]); open.forEach(z => { z[k] = String(op[k]); });
      return () => old.forEach(([z, v]) => { if(!z.done) z[k] = v; }); }
    if(op.type === 'sets'){ const have = x.sets.filter(isMainSet).length;
      if(op.n > have){ const add = Array.from({ length: op.n - have }, () => (x.uni && typeof uniPair === 'function' ? uniPair() : [mk()])).flat(); x.sets.push(...add);
        return () => add.forEach(z => { const i = x.sets.indexOf(z); if(i > -1 && !z.done) x.sets.splice(i, 1); }); }
      const gone = []; for(let i = x.sets.length - 1; i >= 0 && x.sets.filter(isMainSet).length > op.n; i--){ const z = x.sets[i]; if(!z.done && isMainSet(z)){ gone.unshift([i, z]); x.sets.splice(i, 1); } }
      return () => gone.forEach(([i, z]) => x.sets.splice(Math.min(i, x.sets.length), 0, z)); }
    if(op.type === 'swap'){ const e = exById(op.to);
      if(x.sets.some(z => z.done)){ const n = { exId: op.to, reps: x.reps, rest: e.rest || x.rest, sets: open.map(() => mk()) }; if(!n.sets.length) n.sets.push(mk());
        act.exercises.splice(op.xi + 1, 0, n); return () => { const i = act.exercises.indexOf(n); if(i > -1 && !n.sets.some(z => z.done)) act.exercises.splice(i, 1); }; }
      const was = { exId: x.exId, rest: x.rest, uni: x.uni }; x.exId = op.to; x.rest = e.rest || x.rest; x.sets.forEach(z => { if(!z.done){ z.w = ''; } }); if(!x.sets.some(z => z.done) && typeof latReset === 'function'){ was.cv = x.cv; was.sets = x.sets; was.uni2 = x.uni; was.jt = x.jt; latReset(x); }
      return () => { if(!x.sets.some(z => z.done)){ x.exId = was.exId; x.rest = was.rest; if(was.sets){ x.sets = was.sets; x.uni = was.uni2; x.jt = was.jt; if(was.cv) x.cv = was.cv; else delete x.cv; } else if(was.uni) x.uni = was.uni; } }; }
    return null;
  }
  // one line describing the op (for the card): english-free, built from strings
  function describe(op, act){
    const x = op.xi != null && act ? act.exercises[op.xi] : null, cur = k => { const z = x && x.sets.find(s => !s.done && s.type !== 'W' && !s.drop); return z && z[k] !== '' ? z[k] : null; };
    if(op.type === 'weight'){ const c = cur('w'); return c != null ? t('gciOpW', { a: fmtW(+c), b: fmtW(op.w) }) : t('gciOpW0', { b: fmtW(op.w) }); }
    if(op.type === 'reps'){ const c = cur('r'); return c != null ? t('gciOpR', { a: c, b: op.r }) : t('gciOpR0', { b: op.r }); }
    if(op.type === 'sets') return t('gciOpS', { a: x ? x.sets.filter(isMainSet).length : '–', b: op.n });
    if(op.type === 'swap') return t(op.after ? 'gciOpAfter' : 'gciOpSwap', { n: exName(op.to) });
    return t('gciOpAdd', { n: exName(op.exId) });
  }

  // ---------------------------------------------------------------- recovery: the one door (RECOVERY+ when it exists, else today's estimate)
  // → { src: 'recovery+' | 'estimate' | 'none', stale, groups: [{ group, state: 'recovering' | 'ready' | 'unknown', hoursLeft }], readiness: { level, note } }
  // RECOVERY+ contract expected (docs/architecture/contracts.md): RecoveryPlus.snapshot() → { v: 1, at, groups: { g: { state, hoursLeft, conf } }, readiness: { level, conf, why } }
  function recovery(){
    try{
      if(typeof RecoveryPlus !== 'undefined' && RecoveryPlus && typeof RecoveryPlus.snapshot === 'function'){
        const s = RecoveryPlus.snapshot();
        // the shared contract: recovery.v1 (or the older { v: 1, groups } subset); snapshotId says which version this coach answer was built on
        if(s && (s.version === 'recovery.v1' || s.v === 1) && s.groups && typeof s.groups === 'object'){
          const stale = !(s.at > 0) || Date.now() - s.at > 6 * 36e5;
          const gl = Object.entries(s.groups).map(([group, v]) => ({ group, state: v && ['recovering', 'ready'].includes(v.state) ? v.state : 'unknown', hoursLeft: v && isFinite(v.hoursLeft) ? Math.round(v.hoursLeft) : null, low: v && v.conf === 'low' }));
          const rd = s.readiness && ['normal', 'reduced', 'low'].includes(s.readiness.level) ? { level: s.readiness.level, note: String(s.readiness.why || '').slice(0, 120) } : { level: 'unknown' };
          return { src: 'recovery+', stale, groups: gl, readiness: rd, id: s.snapshotId || null, next: s.nextWorkout || null };
        }
      }
    }catch(e){ console.warn('recovery+', e); }
    const f = typeof recMapNow === 'function' ? recMapNow : null; if(!f) return { src: 'none', stale: false, groups: [], readiness: { level: 'unknown' } };
    const m = f() || {};
    // legacy fallback (only when RECOVERY+ is not loaded): the old map; 'unk' stays unknown
    return { src: 'estimate', stale: false, groups: Object.entries(m).map(([group, v]) => ({ group, state: !v || v.st === 'unk' ? 'unknown' : v.st !== 'ok' ? 'recovering' : 'ready', hoursLeft: v && v.h > 0 ? Math.round(v.h) : 0 })),
      readiness: { level: 'unknown' } };
  }

  // ---------------------------------------------------------------- what the message is about (word rules, EN + GR; no AI)
  const INTENTS = [
    ['debrief', /how did (my|the|today|it)|last (workout|session)|\breview\b|debrief|πώς πήγε|τελευταία προπόνηση|σημερινή προπόνηση/i],
    ['workout', /\b(workout|routine|program+e?|split|plan|build|create|make me|suggest a|improve|session for)\b|πρόγραμμα|φτιάξε|πρότεινε|βελτίωσε|προπόνηση για/i],
    ['next', /\bnext\b|what now|after this|what should i do|επόμεν|τι να κάνω (τώρα|μετά)/i],
    ['progress', /increase|heavier|\bweight|\bkg\b|kilo|progress|stronger|weaker|plateau|stuck|\breps?\b|another set|one more set|αύξ|βάρος|κιλά|δυνατ|αδύναμ|κόλλησ|επαναλήψ|σετ ακόμα|άλλο σετ/i],
    ['volume', /\bsets?\b|volume|too much|enough|frequency|σετ|όγκο|πολύ|αρκετ|συχνότητα/i],
    ['recovery', /sore|recover|rest day|tired|fatigue|sleep|pain|hurt|πιασ|πόνο|πονάει|κουρασ|ξεκούρ|αποκατάσταση|ύπνο/i],
    ['technique', /form|technique|how (do|to)|cue|grip|stance|τεχνική|πώς κάνω|λαβή|στάση/i],
  ];
  function intentOf(text){ const s = String(text || ''); for(const [k, re] of INTENTS) if(re.test(s)) return k; return 'chat'; }
  // exercises the message names (from what the athlete actually does first, then the whole library by name / alias); at most 3
  function mentioned(text){
    const q = ' ' + norm(text) + ' '; if(q.trim().length < 3) return [];
    const own = new Set(), add = id => { if(id && lift(id)) own.add(id); };
    if(typeof active !== 'undefined' && active) active.exercises.forEach(x => add(x.exId));
    (typeof sessions !== 'undefined' ? sessions : []).slice(-30).forEach(s => (s.exercises || []).forEach(x => add(x.exId)));
    (typeof tpls !== 'undefined' && tpls ? tpls : []).forEach(tp => (tp.exercises || []).forEach(x => add(x.exId)));
    const words = x => [x.en, x.el, ...(x.al || [])].filter(Boolean).map(norm).filter(w => w.length >= 3);
    const hit = (ids, lim) => { const out = []; for(const id of ids){ const x = exById(id); const ws = words(x);
      const best = Math.max(0, ...ws.map(w => q.includes(' ' + w + ' ') || q.includes(' ' + w + 's ') ? w.length : 0));
      if(best) out.push([id, best]); } return out.sort((a, b) => b[1] - a[1]).slice(0, lim).map(z => z[0]); };
    let r = hit([...own], 3);
    if(!r.length){ const short = { bench: 'bench', squat: 'squat', deadlift: 'deadlift', ohp: 'ohp', 'πάγκο': 'bench', 'καθίσματα': 'squat', 'άρσεις θανάτου': 'deadlift' };
      Object.entries(short).forEach(([w, id]) => { if(q.includes(' ' + norm(w)) && exById(id) && !r.includes(id)) r.push(id); });
      if(!r.length) r = hit(EX().filter(x => !isCardio(x.id) && !x.custom).map(x => x.id), 2); }
    return [...new Set(r)].slice(0, 3);
  }

  // ---------------------------------------------------------------- compact context packets (plain text for the prompt)
  const line = (x) => `${x.date} ${x.sets.map(z => `${+z.w}x${z.r}${z.rir != null ? '@' + z.rir + 'RIR' : ''}${z.f ? 'F' : ''}`).join(' ')}`;
  const ACT_TXT = { start: 'no history: start conservatively', comeback: 'returning after a break: rebuild below the old weight', increase: 'ready for a small weight increase',
    consolidate: 'same weight, get more sets to the top of the range', reps: 'same weight, add a rep', repeat: 'one off day: repeat the best recent weight',
    hold: 'two weaker sessions: hold the weight, keep reps clean', lighten: 'reps below the range twice: a slightly lighter weight', harder: 'bodyweight top of range: add load or a harder version' };
  function focusPack(ids){
    return ids.map(id => { const x = exById(id), act = typeof active !== 'undefined' && active ? active.exercises.find(z => z.exId === id) : null;
      const reps = (act && act.reps) || (typeof usualReps === 'function' && usualReps(id) ? `${Math.max(1, usualReps(id) - 2)}-${usualReps(id) + 2}` : defReps(x.rest));
      const h = hist(id, typeof active !== 'undefined' && active ? active.id : null), p = progression(id, reps), ev = p && p.ev;
      const evTxt = !h.length ? 'none' : `${ev.level} (${h.length} sessions logged${ev.onBreak ? `, ${ev.since} days since last` : ''}${ev.trend ? `, trend ${ev.trend}` : ''}${ev.effort ? '' : ', effort/RIR not logged'})`;
      const rec = p ? `${ACT_TXT[p.act] || p.act}${p.w ? `: ${+p.w} kg x ${p.r}` : ''}; recommend ${p.strength === 'firm' ? 'plainly' : p.strength === 'suggest' ? 'as a suggestion' : 'tentatively'}` : '';
      return `- ${nm(id)} (${x.e}, target ${reps} reps). Recorded: ${h.length ? h.slice(-4).map(line).join(' | ') : 'nothing yet'}. Evidence: ${evTxt}. App's progression read: ${rec}.${p && p.why ? ' Facts: ' + p.why.join('; ') + '.' : ''}`; }).join('\n');
  }
  function athletePack(){
    const s = typeof gymStyle === 'function' ? gymStyle() : { k: 'mid' }, cad = cadence(), n28 = (typeof sessions !== 'undefined' ? sessions : []).filter(x => x.start && ago(x.start) <= 28).length;
    return `Athlete: ${typeof bodyW === 'function' ? bodyW() : '?'} kg body weight, goal ${(typeof targets !== 'undefined' && targets && targets.goal) || 'not set'}; ${n28} workouts in the last 4 weeks${cad ? `, usually every ${Math.round(cad * 10) / 10} days` : ''}; style ${s.k}${typeof gymReps === 'function' && gymReps() ? `, chosen rep range ${gymReps()}` : ''}.`;
  }
  function equipPack(){ const eq = new Set();
    [...(typeof tpls !== 'undefined' && tpls ? tpls : []).flatMap(tp => tp.exercises || []), ...(typeof sessions !== 'undefined' ? sessions : []).slice(-20).flatMap(s => s.exercises || [])].forEach(x => { const e = exById(x.exId).e; if(e) eq.add(e); });
    return [...eq]; }
  function recoveryPack(){ const r = recovery(); if(r.src === 'none') return 'Recovery: unknown.';
    const rec = r.groups.filter(g => g.state === 'recovering').sort((a, b) => (b.hoursLeft || 0) - (a.hoursLeft || 0)).map(g => `${g.group}${g.hoursLeft ? ` ~${g.hoursLeft} h` : ''}`);
    const unk = r.groups.filter(g => g.state === 'unknown').map(g => g.group);
    // unknown stays unknown: "recovered" is said only of groups RECOVERY+ actually knows
    const rdy = r.groups.filter(g => g.state === 'ready').map(g => g.group), sum = rec.length ? 'still recovering: ' + rec.join(', ') : rdy.length ? (unk.length ? 'recovered: ' + rdy.join(', ') : 'all groups look recovered') : 'no finished workouts to judge from';
    return `Recovery (${r.src === 'recovery+' ? `RECOVERY+${r.id ? ' ' + r.id : ''}` : 'app estimate from logged sets only'}${r.stale ? ', may be out of date' : ''}): ${sum}${unk.length ? `; unknown: ${unk.join(', ')}` : ''}. Overall readiness: ${r.readiness.level === 'unknown' ? 'not measured (no sleep or readiness data; do not assume it is low)' : r.readiness.level + (r.readiness.note ? ` (${r.readiness.note})` : '')}.`; }
  function weekPack(){ const g = groups((typeof sessions !== 'undefined' ? sessions : []).filter(s => s.date && -daysUntil(s.date) <= 6)); const e = Object.entries(g).filter(([, v]) => v >= 1);
    return `Hard sets per muscle group, last 7 days: ${e.map(([k, v]) => `${k} ${Math.round(v)}`).join(', ') || 'none'}.`; }
  function historyPack(n){ return (typeof sessions !== 'undefined' ? sessions : []).slice().sort((a, b) => String(b.start).localeCompare(String(a.start))).slice(0, n).map(s =>
    `- ${s.date} ${s.name || s.type || ''}: ${(s.exercises || []).map(x => { const d = (x.sets || []).filter(z => z.done && isMainSet(z)); if(!d.length) return null; if(isCardio(x.exId)) return nm(x.exId);
      const top = d.filter(z => z.w !== '' && +z.r > 0).sort((a, b) => +b.w - +a.w || +b.r - +a.r)[0]; return `${nm(x.exId)} ${d.length}x${top ? ` top ${+top.w}x${top.r}` : ''}`; }).filter(Boolean).join(', ')}`).join('\n') || '- none yet'; }
  function savedPack(n){ return (typeof tpls !== 'undefined' && tpls ? tpls : []).slice(0, n).map(tp => `- "${tp.name}" (${tp.type}): ${tp.exercises.map(e => `${nm(e.exId)} ${e.sets}x${e.reps}`).join(', ')}`).join('\n') || '- none yet'; }
  function progressingPack(){ const ids = [...new Set((typeof sessions !== 'undefined' ? sessions : []).slice(-12).flatMap(s => (s.exercises || []).map(x => x.exId)))].filter(lift);
    const up = [], down = []; ids.forEach(id => { const e = evidence(id); if(e.level === 'none' || e.onBreak) return; if(e.trend === 'up') up.push(nm(id)); else if(e.trend === 'down' && e.compN >= 3) down.push(nm(id)); });
    return (up.length ? `Progressing well (keep these): ${up.slice(0, 8).join(', ')}. ` : '') + (down.length ? `Slipping lately: ${down.slice(0, 5).join(', ')}.` : ''); }
  function livePack(){ const L = live(); if(!L) return 'No workout running.';
    return `Workout running now: "${L.name}"${L.mins != null ? `, ${L.mins} min in` : ''}. In order:\n` + L.xs.map(x => `${x.i + 1}. ${nm(x.exId)}${x.i === L.cur ? ' [current]' : ''}${x.ended ? ' [finished]' : ''}: ${x.cardio ? `${x.done} done` : `${x.done}/${x.planned} sets${x.sets && x.sets.length ? ' ' + x.sets.map(z => `${z.w}x${z.r}${z.rir != null ? '@' + z.rir + 'RIR' : ''}`).join(' ') : ''}${x.reps ? `, target ${x.reps}` : ''}${x.last ? `; last time ${line(x.last)}` : '; first time'}${x.flags.length ? `; notes: ${x.flags.map(f => f.startsWith('sharp') ? 'big rep drop between sets at the same weight' : f === 'ahead' ? 'ahead of last time' : 'well below last time on the first set').join(', ')}` : ''}${x.drop != null && !x.flags.some(f => f.startsWith('sharp')) ? `; rep loss between sets ${Math.round(x.drop * 100)}% (normal fatigue)` : ''}`}`).join('\n')
      + `\nWorked so far this session (hard sets): ${Object.entries(L.groups).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ') || 'nothing yet'}.`; }
  function debriefPack(){ const s = (typeof sessions !== 'undefined' ? sessions : []).slice().sort((a, b) => String(b.start).localeCompare(String(a.start)))[0]; if(!s) return 'No finished workout yet.';
    const rows = (s.exercises || []).filter(x => lift(x.exId)).map(x => { const h = hist(x.exId).filter(z => z.start < s.start), cur = hist(x.exId).find(z => z.id === s.id); if(!cur) return null;
      const prev = h[h.length - 1], d = prev && prev.e1 ? Math.round((cur.e1 / prev.e1 - 1) * 100) : null;
      return `- ${nm(x.exId)}: ${line(cur)}${prev ? `; previous ${line(prev)}${d != null ? ` (estimated strength ${d >= 0 ? '+' : ''}${d}%)` : ''}` : '; first time'}`; }).filter(Boolean);
    const pr = (s.prs || []).map(p => `${nm(p.exId)} ${p.kind === 'v' ? 'volume' : p.kind === 'w' ? `weight ${p.w} kg x ${p.r}` : p.kind}`);
    return `Last finished workout: ${s.date} "${s.name || s.type || ''}", ${s.mins || '?'} min.\n${rows.join('\n') || '- no lifting sets'}${pr.length ? `\nRecords: ${pr.join(', ')}.` : ''}`; }
  function pastPack(){ const said = load().said.filter(x => Date.now() - x.at < 21 * DAY).slice(-4); if(!said.length) return '';
    return `Your earlier proposals and what the athlete did: ${said.map(x => `${x.txt}: ${x.out === 'yes' ? 'applied' : x.out === 'no' ? 'declined' : x.out === 'undo' ? 'applied then undone' : 'no answer'}`).join('; ')}. Do not push a declined one again unless asked.`; }

  // brief(mode, chatId, text) → { text, intent, focus, chars }: only the parts this kind of message needs. mode 'plan' (planning chats) | 'live'
  const FOCUS = {};
  function brief(mode, id, text){
    let it = intentOf(text), ids = mentioned(text);
    const prev = FOCUS[id];
    if(!ids.length && prev && Date.now() - prev.at < 30 * 6e4 && (it === 'chat' || it === 'progress' || it === 'volume' || /^(why|how|but|so|really|isn'?t|γιατί|πώς|αλλά|δηλαδή|σίγουρα)\b/i.test(norm(text)))){ ids = prev.ids; if(it === 'chat') it = prev.it; }   // a follow-up ("why?") keeps the subject
    if(!ids.length && mode === 'live' && typeof active !== 'undefined' && active){ const c = typeof active.cur === 'number' ? active.exercises[active.cur] : null, x = c || [...active.exercises].reverse().find(z => z.sets.some(s => s.done));
      if(x && lift(x.exId) && (it === 'progress' || it === 'chat')) ids = [x.exId]; }
    FOCUS[id] = { ids, it, at: Date.now() };
    const parts = [athletePack()];
    if(mode === 'live') parts.push(livePack());
    if(ids.length) parts.push('About the exercises in question:\n' + focusPack(ids));
    if(it === 'workout'){ const eq = equipPack(); parts.push(`Equipment they use: ${eq.join(', ') || 'unknown (assume a normal gym)'}.`, `Saved workouts:\n${savedPack(10)}`, `Recent workouts (newest first):\n${historyPack(4)}`, weekPack(), progressingPack(), recoveryPack()); }
    else if(it === 'debrief') parts.push(debriefPack());
    else if(it === 'volume' || it === 'recovery') parts.push(weekPack(), recoveryPack(), ...(mode === 'live' ? [] : [`Recent workouts (newest first):\n${historyPack(3)}`]));
    else if(it === 'next'){ parts.push(recoveryPack()); if(mode !== 'live') parts.push(`Recent workouts (newest first):\n${historyPack(3)}`, weekPack()); }
    else if(!ids.length && mode !== 'live') parts.push(`Recent workouts (newest first):\n${historyPack(3)}`, recoveryPack());
    else if(mode === 'live') parts.push(recoveryPack());
    const past = pastPack(); if(past) parts.push(past);
    const txt = parts.filter(Boolean).join('\n');
    return { text: txt, intent: it, focus: ids, chars: txt.length };
  }
  // the exercise names the AI may use when it builds a workout: the athlete's equipment only (all when unknown), no cardio
  function names(){ const eq = new Set(equipPack()); return EX().filter(x => x.m !== 'cardio' && x.en && (!eq.size || eq.has(x.e) || x.e === 'bodyweight')).map(x => x.en).join('; '); }

  // ---------------------------------------------------------------- the coach's voice (shared rules; the JSON shape stays in gym.js)
  function voice(){
    return `${AI.voice('gym')}Here you are Gym Coach in the workout tracker: an experienced personal trainer who is also a relaxed training partner. Direct and practical; no hype, no generic motivation, no repeated openers, no greetings or sign-offs. Respect that the athlete decides.
Depth follows the athlete: a simple question gets a simple answer (one to three sentences). When they ask why, push back, or use training-science terms, explain with their own recorded numbers and go deeper each time, still conversational, never a lecture. Do not just agree: weigh their argument; change your advice only if it holds up, and say so plainly.
Facts: use only the recorded data below. Never invent sessions, weights, reps or effort. Missing data is unknown, not bad: no reps-in-reserve logged does not mean failure, no sleep data does not mean poor sleep, no food logs does not mean under-eating, no soreness report does not mean none. Do not diagnose physiological causes from workout logs. Recovery figures are estimates: real performance today and what the athlete says outrank them, and they never forbid training.
Keep the analysis to yourself: no scores, confidence levels, percentages of certainty, data-quality talk or app internals. If the evidence is thin, say it in plain words ("that's one session so far"). Match how firmly you recommend to the app's progression read when one is given.
You advise; the athlete decides. Never say you changed, saved, added or applied anything.`;
  }

  // ---------------------------------------------------------------- local answers when the AI cannot be reached (offline, no key, provider down)
  function offline(text, mode, id){
    const it = intentOf(text); let ids = mentioned(text);
    if(!ids.length && FOCUS[id]) ids = FOCUS[id].ids;
    if(!ids.length && mode === 'live' && typeof active !== 'undefined' && active){ const x = typeof active.cur === 'number' ? active.exercises[active.cur] : null; if(x && lift(x.exId)) ids = [x.exId]; }
    if(ids.length && (it === 'progress' || it === 'chat' || it === 'next')){ const id = ids[0], x = exById(id), a = typeof active !== 'undefined' && active ? active.exercises.find(z => z.exId === id) : null;
      const p = progression(id, (a && a.reps) || defReps(x.rest)); if(!p) return '';
      const n = exName(id), w = p.w ? fmtW(p.w) : null;
      const k = { start: w ? 'gciLStart' : 'gciLStartN', comeback: 'gciLBack', increase: 'gciLUp', consolidate: 'gciLCons', reps: 'gciLReps', repeat: 'gciLRepeat', hold: 'gciLHold', lighten: 'gciLLight', harder: 'gciLHarder' }[p.act];
      return k ? t(k, { n, w, r: p.r }) : ''; }
    if(it === 'next' && mode === 'live'){ const L = live(); const nx = L && L.left.find(x => !x.done) || (L && L.left[0]); if(nx) return t('gciLNext', { n: exName(nx.exId) }); }
    return '';
  }

  // ---------------------------------------------------------------- device-only memory (Store 'gymCoach')
  const EMPTY = () => ({ v: 1, chats: {}, seen: null, said: [] });
  let M = null;
  function load(){ if(M) return M; const m = typeof Store !== 'undefined' ? Store.load(NAME, null) : null; M = m && m.v === 1 ? { ...EMPTY(), ...m, said: Array.isArray(m.said) ? m.said : [] } : EMPTY(); return M; }
  const save = () => { if(typeof Store !== 'undefined') Store.save(NAME, M); };
  const KEEP = 24, CUT = 600, OLD = 14 * DAY;
  // chats: what the coach window shows, as plain text (cards keep only their title and line; no photos, no buttons)
  function chatSave(id, msgs, scope){ const m = load();
    if(!msgs){ delete m.chats[id]; save(); return; }
    const list = msgs.filter(x => !x.work).slice(-KEEP).map(x => ({ who: x.who === 'me' ? 'me' : 'bot', ...(x.first ? { first: true } : {}), ...(/^[a-z]{2,12}$/.test(x.by || '') ? { by: x.by } : {}), text: String(x.text || (x.img ? '[photo]' : '')).slice(0, CUT),
      ...(x.cards ? { cards: x.cards.slice(0, 12).map(c => ({ title: String(c.title || '').slice(0, 80), sub: String(c.sub || '').slice(0, 120), ...(c.done ? { done: String(c.done).slice(0, 80) } : {}) })) } : {}) }));
    m.chats[id] = { at: Date.now(), scope: scope || null, msgs: list }; save(); }
  function chatLoad(id, scope){ const c = load().chats[id]; if(!c || !Array.isArray(c.msgs) || Date.now() - c.at > OLD || (c.scope || null) !== (scope || null)) return null;
    return c.msgs.map(x => ({ who: x.who === 'me' ? 'me' : 'bot', text: String(x.text || ''), ...(x.first ? { first: true } : {}), ...(/^[a-z]{2,12}$/.test(x.by || '') ? { by: x.by } : {}), ...(x.cards ? { cards: x.cards.map(cd => ({ title: cd.title, sub: cd.sub, done: cd.done || '', cls: 'old', actions: [], cid: Math.random().toString(36).slice(2) })) } : {}) })); }
  // hints already shown (this workout only)
  function seen(wid){ const m = load(); return m.seen && m.seen.w === wid ? m.seen.keys.slice() : []; }
  function markSeen(wid, key){ const m = load(); if(!m.seen || m.seen.w !== wid) m.seen = { w: wid, keys: [] }; if(!m.seen.keys.includes(key)) m.seen.keys.push(key); save(); }
  // proposals and what happened to them: out = 'yes' | 'no' | 'undo' | null
  function said(key, txt){ const m = load(), x = { at: Date.now(), key: String(key).slice(0, 80), txt: String(txt || '').slice(0, 100), out: null }; m.said.push(x); if(m.said.length > 30) m.said.splice(0, m.said.length - 30); save(); return x; }
  function outcome(x, out){ if(!x) return; x.out = out; save(); }
  function forget(){ M = EMPTY(); Object.keys(FOCUS).forEach(k => delete FOCUS[k]); if(typeof Store !== 'undefined') Store.save(NAME, null); }

  return { hist, cadence, evidence, progression, live, nudge, proposal, stillFits, applyOp, describe, recovery, intentOf, mentioned, brief, names, voice, offline,
    chatSave, chatLoad, seen, markSeen, said, outcome, forget, _reset(){ M = null; Object.keys(FOCUS).forEach(k => delete FOCUS[k]); } };
})();
