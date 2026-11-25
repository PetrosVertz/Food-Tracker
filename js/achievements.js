// Achievements (Social Hub): 44 permanent unlocks worked out from your own workout history. Deterministic, local, no AI.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// Saved (inside the profile record: synced, in backups, "yours win" on import): profile.ach = { v: 1, got: { <id>: { d: 'YYYY-MM-DD', w: workout id | null, e: evidence {…} } }, seen: n }
//   got  = what you have earned. Never rewritten once set, so saves, retries, duplicate imports and repeated renders cannot change or repeat an unlock.
//   Evidence is data (exercise ids, kilograms, counts, dates), not text: the words and units are made when it is drawn (English / Greek, kg / lb).
//
// How it works: Ach.scan(sessions, env) replays the workouts oldest first and returns every unlock with its date. It is pure (env gives the app's helpers),
// so tools/ach-test.js runs it on small fake histories. Ach.record() runs it after a save / import / leaderboard entry, stores anything new and
// says which ones are new. Nothing here runs on a repaint or an animation frame.
//
// What counts: finished workouts; working sets only (done, not a warm-up, not a drop row, not the right-hand row of a Left / Right pair, not skipped);
// "full reps" = the reps typed (half reps and negatives are separate fields and never count). A PR is the one the app already saved with the workout (ses.prs).
// Order evidence = the time each set was ticked (s.at). A workout where a working set has no time is "unordered": opener, final set, Tenet and lineups are skipped for it.
const Ach = (() => {
  // [id, secret]. Order = the catalogue order shown in the Hub.
  const CAT = [['press_start', 0], ['the_regular', 0], ['gym_now', 0], ['every_day', 0], ['returned', 1], ['roll_credits', 0], ['emotional', 0], ['leg_witness', 0],
    ['old_reliable', 0], ['till_plates', 0], ['attendance', 0], ['same_iron', 0], ['new_plate', 0], ['pullups', 0], ['out_of_hand', 0], ['deja', 0], ['eighty_four', 0],
    ['gravity', 0], ['on_record', 0], ['fellowship', 0], ['double_digits', 0], ['past_me', 1], ['final_set', 1], ['comeback', 1], ['post_credits', 1], ['after_hours', 0],
    ['breakfast', 0], ['shift', 1], ['groundhog', 1], ['what_am', 1], ['elephant', 0], ['whale', 0], ['summit', 0], ['one_rep', 0], ['side_quest', 0], ['know_move', 0],
    ['four_elements', 0], ['tour', 0], ['gotta_rep', 0], ['answer_42', 1], ['tenet', 1], ['other_left', 1], ['band', 1], ['know_guy', 1]];
  const IDS = CAT.map(c => c[0]), SECRET = new Set(CAT.filter(c => c[1]).map(c => c[0]));
  const BOARD = ['bench', 'squat', 'deadlift'];

  const dn = d => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d || ''); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5) : NaN; };   // calendar day number
  const monOf = d => { const n = dn(d), w = ((n + 3) % 7 + 7) % 7; return n - w; };                                                                    // Monday of that week (as a day number)
  const monthN = d => +String(d).slice(0, 4) * 12 + +String(d).slice(5, 7);
  const addYear = d => `${+d.slice(0, 4) + 1}${d.slice(4)}`;
  const addMonths = (d, n) => { const m = monthN(d) - 1 + n, y = Math.floor(m / 12), mo = m % 12 + 1, dd = +d.slice(8, 10), last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return `${y}-${String(mo).padStart(2, '0')}-${String(Math.min(dd, last)).padStart(2, '0')}`; };
  const pullish = id => /pull-?up|chin-?up/i.test(id), dipish = id => /(^|[^a-z])dips?([^a-z]|$)/i.test(id);

  // the workouts, oldest first, with only what the rules need
  function prep(sessions, env){
    const W = (sessions || []).filter(s => s && s.start && Array.isArray(s.exercises) && !isNaN(new Date(s.start)))
      .sort((a, b) => String(a.start).localeCompare(String(b.start)) || String(a.id).localeCompare(String(b.id)));
    return W.map((s, i) => {
      const d = new Date(s.start), sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(), date = s.date || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const xs = []; let order = true;
      (s.exercises || []).forEach((x, xi) => {
        const info = env.ex(x.exId) || {}; if(info.m === 'cardio') return;
        const sets = (x.sets || []).filter(st => st && st.done && st.type !== 'W' && st.side !== 'R' && !st.drop && !st.skip && Math.floor(+st.r) > 0)
          .map((st, k) => ({ w: +st.w || 0, r: Math.floor(+st.r), lv: env.lv(x.exId, +st.w || 0), kg: env.load(x.exId, +st.w || 0), at: +st.at || 0, k }));
        if(!sets.length) return; if(sets.some(z => !z.at)) order = false;
        xs.push({ id: x.exId, info, sets, raw: x.sets || [], uni: !!x.uni, xi });
      });
      const flat = xs.flatMap(x => x.sets.map(z => ({ ...z, id: x.id })));
      const seq = order && flat.length ? flat.slice().sort((a, b) => a.at - b.at || 0) : null;   // actual completion order, or null when it cannot be proven
      const prs = [...new Set((s.prs || []).filter(p => p && (p.kind === 'w' || p.kind === 'v') && p.exId && (env.ex(p.exId) || {}).m !== 'cardio').map(p => p.exId))];
      const vol = +s.vol > 0 ? +s.vol : flat.reduce((a, z) => a + z.w * z.r, 0);
      return { i, id: s.id || null, date, day: dn(date), sec, hasSec: typeof s.start === 'string' && /T\d\d:\d\d:\d\d/.test(s.start), wd: d.getDay(), xs, seq, prs, vol, ses: s };
    });
  }

  // env: ex(id) → { e, m, uni }, load(id, w) → kg, lv(id, w) → comparable load, bodyW(), lower(m) → bool, target(mondayDayNumber) → number | null, board() → { bench: 'date', … }
  function scan(sessions, env){
    const W = prep(sessions, env), got = {};
    const give = (id, w, e) => { if(!got[id]) got[id] = { d: w.date, w: w.id, e: e || {} }; };
    const wdSet = new Set(), firstW = W[0] || null, byEx = new Map(), openerCount = new Map(), lowWeeks = new Set(), weekDays = new Map();
    const dawnDates = new Set(), nightDates = new Set(), startsByDay = new Map(), lineSeen = new Map(), distinct = new Set();
    let night = 0, dawn = 0, eve = 0, vol = 0, reps = 0, climb = 0, rollIdx = -1, firstOpener = null;
    const ex = id => { let e = byEx.get(id); if(!e){ e = { first: null, last: null, months: new Set(), keys: new Map(), repLoad: new Map(), counts: new Set(), repsSeen: new Set(), flags: {}, free: null, pair: 0 }; byEx.set(id, e); } return e; };
    const bwk = (info, id) => info.e === 'bodyweight' || /assist/i.test(id);

    W.forEach(w => {
      const n = w.i + 1, prevW = W[w.i - 1];
      // ---- counts and calendar
      give('press_start', w, { n }); if(n >= 25) give('the_regular', w, { n }); if(n >= 100) give('gym_now', w, { n });
      wdSet.add(w.wd); if(wdSet.size === 7) give('every_day', w);
      if(prevW){ const away = w.day - prevW.day - 1; if(away >= 14) give('returned', w, { n: away }); }
      if(firstW && w.date >= addYear(firstW.date)){ give('roll_credits', w, { a: firstW.date }); if(rollIdx < 0) rollIdx = w.i; }
      if(w.sec < 7 * 3600){ dawn++; dawnDates.add(w.date); } if(w.sec >= 21 * 3600){ night++; nightDates.add(w.date); }
      if(dawn >= 10 && w.sec < 7 * 3600) give('breakfast', w, { n: dawn }); if(night >= 10 && w.sec >= 21 * 3600) give('after_hours', w, { n: night });
      if(w.sec < 7 * 3600 && [...nightDates].some(d => d !== w.date) || w.sec >= 21 * 3600 && [...dawnDates].some(d => d !== w.date)) give('shift', w, { a: [...(w.sec < 7 * 3600 ? nightDates : dawnDates)].find(d => d !== w.date), b: w.date });
      if(w.sec >= 18 * 3600) eve++; else { if(eve >= 10 && w.sec < 9 * 3600) give('what_am', w, { n: eve }); eve = 0; }
      if(w.hasSec){ const list = startsByDay.get(w.day - 7) || [], hit = list.find(o => Math.abs(o.sec - w.sec) <= 60);
        if(hit) give('groundhog', w, { a: hit.date, b: w.date, n: Math.abs(hit.sec - w.sec), s: [hit.sec, w.sec] });
        (startsByDay.get(w.day) || startsByDay.set(w.day, []).get(w.day)).push({ sec: w.sec, date: w.date }); }
      // weekly rules
      const mon = monOf(w.date); (weekDays.get(mon) || weekDays.set(mon, new Set()).get(mon)).add(w.date);
      let att = 0; for(let k = 0; k < 4; k++){ const m = mon - 7 * k, tg = env.target(m); if(tg == null || !(tg > 0) || (weekDays.get(m) || new Set()).size < tg) break; att++; }
      if(att === 4) give('attendance', w, { n: env.target(mon) });
      // ---- what was trained
      const names = new Set(w.xs.map(x => x.id)); let lower = false, eqs = new Set(), wReps = 0;
      const opener = w.seq ? w.seq[0].id : null;
      if(opener){ if(!firstOpener && w.i === 0) firstOpener = opener; const o = openerCount.get(opener) || new Set(); o.add(w.i); openerCount.set(opener, o); if(o.size >= 5) give('emotional', w, { x: opener, n: o.size }); }
      if(w.i === 0 && !w.seq) firstOpener = null;
      if(w.seq){ const col = []; w.seq.forEach(z => { if(col[col.length - 1] !== z.id) col.push(z.id); });
        if(col.length >= 3 && new Set(col).size >= 2 && col.join('|') === col.slice().reverse().join('|')) give('tenet', w, { l: col });
        const fo = []; w.seq.forEach(z => { if(!fo.includes(z.id)) fo.push(z.id); });
        if(fo.length >= 3){ const key = fo.join('|'), last = lineSeen.get(key); if(last != null && w.day - last - 1 >= 30) give('band', w, { l: fo, n: w.day - last - 1 }); lineSeen.set(key, w.day); } }
      const beats = [];   // sets of this workout that beat an EARLIER session (decided before this workout is added)
      w.xs.forEach(x => {
        const e = ex(x.id), isBw = bwk(x.info, x.id); if(env.lower(x.info.m)) lower = true; eqs.add(x.info.e);
        const keyOf = z => Math.round(z.lv * 100) / 100, top = new Map(), byRep = new Map();   // best reps per load / best load per rep count, in this workout
        x.sets.forEach(z => { reps += z.r; wReps += z.r; top.set(keyOf(z), Math.max(top.get(keyOf(z)) || 0, z.r)); byRep.set(z.r, Math.max(byRep.has(z.r) ? byRep.get(z.r) : -1e9, z.lv)); });
        top.forEach((r, k) => { const h = e.keys.get(k); if(h && r > h.best){ give('same_iron', w, { x: x.id, l: k, r, p: h.best }); }
          if(h && h.first === 5 && r >= 10 && h.firstW < w.i) give('double_digits', w, { x: x.id, l: k, r });
          if(h && e.last != null && w.day - e.last - 1 >= 30 && r > h.best) give('comeback', w, { x: x.id, l: k, r, p: h.best, n: w.day - e.last - 1 });
          if(h && h.ties >= 2 && r > h.best) give('past_me', w, { x: x.id, l: k, r, p: h.best }); });
        byRep.forEach((lv, r) => { const p = e.repLoad.get(r); if(p != null && lv > p) give('new_plate', w, { x: x.id, r, l: lv, p }); });
        x.sets.forEach(z => { const h = e.keys.get(keyOf(z)), p = e.repLoad.get(z.r); if((h && z.r > h.best) || (p != null && z.lv > p)) beats.push(z); });
        if(w.prs.includes(x.id) && e.first && addMonths(e.first, 6) <= w.date) give('eighty_four', w, { x: x.id, a: e.first });
        if(pullish(x.id) && x.info.e === 'bodyweight' && !/assist/i.test(x.id) && x.sets.some(z => z.r >= 10 && z.w >= 0)) give('pullups', w, { x: x.id, r: Math.max(...x.sets.map(z => z.r)) });
        if((pullish(x.id) || dipish(x.id)) && x.info.e === 'bodyweight' && !/assist/i.test(x.id)){ if(e.flags.free != null && e.flags.free < w.i && x.sets.some(z => z.w > 0)) give('gravity', w, { x: x.id, w: Math.max(...x.sets.map(z => z.w)), a: e.flags.freeDate });
          if(x.sets.some(z => z.w <= 0) && e.flags.free == null){ e.flags.free = w.i; e.flags.freeDate = w.date; } }
        // Déjà Lift: three working sets in a row, same load, same reps
        const ord = x.sets.every(z => z.at) ? x.sets.slice().sort((a, b) => a.at - b.at) : x.sets;
        for(let k = 2; k < ord.length; k++) if(ord[k].lv === ord[k - 1].lv && ord[k].lv === ord[k - 2].lv && ord[k].r === ord[k - 1].r && ord[k].r === ord[k - 2].r){ give('deja', w, { x: x.id, w: ord[k].w, r: ord[k].r }); break; }
        // Tour of Duty: exactly 2, 3 and 4 working sets of one exercise on three different workouts
        if(x.sets.length >= 2 && x.sets.length <= 4){ e.counts.add(x.sets.length); if([2, 3, 4].every(c => e.counts.has(c))) give('tour', w, { x: x.id }); }
        x.sets.forEach(z => { if(z.r <= 12) e.repsSeen.add(z.r); }); if([...Array(12).keys()].every(k => e.repsSeen.has(k + 1))) give('gotta_rep', w, { x: x.id });
        // Other Left: Left beats Right on one pair, then Right beats Left on the next pair, same load throughout
        if(x.uni){ const pairs = []; const rows = x.raw;
          rows.forEach((s, j) => { if(s.side !== 'L' || !s.done || s.skip || s.type === 'W' || s.drop) return;
            const mt = s.pr && rows.findIndex((z, k) => k !== j && z.pr === s.pr && z.side === 'R'), m = mt != null && mt >= 0 ? mt : (rows[j + 1] && rows[j + 1].side === 'R' && !rows[j + 1].pr && !s.pr ? j + 1 : -1);
            const R = m >= 0 ? rows[m] : null; if(R && R.done && !R.skip && R.r !== '' && s.r !== '' && R.w !== '' && s.w !== '') pairs.push({ l: +s.r, r: +R.r, wl: +s.w, wr: +R.w }); });
          for(let k = 1; k < pairs.length; k++){ const a = pairs[k - 1], b = pairs[k]; if(a.l > a.r && b.r > b.l && a.wl === a.wr && b.wl === b.wr && a.wl === b.wl) give('other_left', w, { x: x.id, w: a.wl, a: [a.l, a.r], b: [b.l, b.r] }); } }
      });
      if(w.seq){ const last = w.seq[w.seq.length - 1]; if(beats.some(z => z.at === last.at && z.r === last.r && z.w === last.w)) give('final_set', w, { x: last.id, w: last.w, r: last.r }); }
      if(w.prs.length >= 2) give('out_of_hand', w, { l: w.prs.slice(0, 4), n: w.prs.length });
      if(rollIdx >= 0 && w.i > rollIdx && firstW && firstW.xs.some(x => w.prs.includes(x.id))){ const x = firstW.xs.find(q => w.prs.includes(q.id)); give('post_credits', w, { x: x.id }); }
      if(lower){ lowWeeks.add(mon); if([0, 1, 2, 3].every(k => lowWeeks.has(mon - 7 * k))) give('leg_witness', w, { n: 4 }); }
      if(['barbell', 'dumbbell', 'machine', 'bodyweight'].every(q => eqs.has(q))) give('four_elements', w);
      if(wReps === 42 && names.size >= 3) give('answer_42', w, { n: names.size });
      if(w.i + 1 >= 100 && (w.i + 1) % 100 === 0 && firstOpener && names.has(firstOpener)) give('know_guy', w, { x: firstOpener, n: w.i + 1 });
      // ---- running totals
      vol += w.vol; if(vol >= 5000) give('elephant', w, { n: Math.round(vol) }); if(vol >= 150000) give('whale', w, { n: Math.round(vol) });
      w.xs.forEach(x => x.sets.forEach(z => { climb += z.r * z.kg * .5 * 9.81; })); if(climb / (8849 * env.bodyW() * 9.81) >= 1) give('summit', w, { n: Math.round(vol) });
      if(reps >= 1000) give('one_rep', w, { n: reps });
      w.xs.forEach(x => distinct.add(x.id)); if(distinct.size >= 10) give('side_quest', w, { n: distinct.size }); if(distinct.size >= 50) give('know_move', w, { n: distinct.size });
      // ---- bring each exercise up to date AFTER the comparisons
      w.xs.forEach(x => { const e = ex(x.id); if(!e.first) e.first = w.date; e.months.add(w.date.slice(0, 7));
        const m = [...e.months].map(monthN).sort((a, b) => a - b), cur = monthN(w.date); let run = 0; while(m.includes(cur - run)) run++;
        if(run >= 6) give('old_reliable', w, { x: x.id, n: run }); if(run >= 12) give('till_plates', w, { x: x.id, n: run });
        x.sets.forEach(z => { const k = Math.round(z.lv * 100) / 100; let h = e.keys.get(k);
          if(!h){ h = { best: 0, first: z.r, firstW: w.i, ties: 0, seenAt: new Set() }; e.keys.set(k, h); }
          if(!h.seenAt.has(w.i)){ h.seenAt.add(w.i); const mx = Math.max(...x.sets.filter(q => Math.round(q.lv * 100) / 100 === k).map(q => q.r));
            if(h.best && mx === h.best) h.ties++; else if(mx > h.best){ h.ties = h.best ? 0 : 0; h.best = mx; } }
          e.repLoad.set(z.r, Math.max(e.repLoad.has(z.r) ? e.repLoad.get(z.r) : -1e9, z.lv)); });
        e.last = w.day; });
    });
    // leaderboard routes: first single, then all three lifts (dates may differ)
    const b = env.board() || {}, ds = BOARD.map(k => b[k]).filter(Boolean).sort();
    if(ds.length) got.on_record = got.on_record || { d: ds[0], w: null, e: { x: BOARD.find(k => b[k] === ds[0]) } };
    if(ds.length === 3) got.fellowship = got.fellowship || { d: ds[2], w: null, e: {} };
    return got;
  }

  // ---- the app side ----
  const env = () => ({
    ex: id => { const x = exById(id); return { e: x.e, m: x.m, uni: !!x.uni }; },
    load: (id, w) => loadOf(id, w),
    lv: (id, w) => gymIsAssist(id) ? -(+w || 0) : (+w || 0),   // comparable load: added weight (bodyweight work), minus the assistance (assisted work), or the bar load
    bodyW: () => bodyW(), lower: m => !!(GROUPS[m] && GROUPS[m][2] === 'low'),
    target: mon => { const rec = Store.load('streak', null), k = new Date(mon * 864e5).toISOString().slice(0, 10); return rec && rec.tg && rec.tg[k] != null ? +rec.tg[k] : null; },
    board: () => { const o = {}; BOARD.forEach(id => { const b = boardFirst(id); if(b) o[id] = b; }); return o; } });
  // the date of the first qualifying single on a board lift (typed 1RM, or a ticked single with the trophy on), same sources as boardBest()
  function boardFirst(exId){
    let d = null; const take = x => { if(x && (!d || x < d)) d = x; };
    ormList().forEach(o => { if(o.exId === exId) take(o.date); });
    sessions.forEach(s => s.exercises.forEach(x => { if(x.exId === exId && x.attempt && x.sets.some(st => st.done && isMainSet(st) && st.w !== '' && +st.r === 1)) take(s.date); }));
    return d;
  }
  const rec = () => (profile.ach && profile.ach.v === 1 && profile.ach.got && typeof profile.ach.got === 'object') ? profile.ach : null;
  const earned = () => (rec() || { got: {} }).got;
  // work out everything, keep what is new. why = 'workout' | 'board' | 'import' | 'seed'. → the new unlocks [{ id, d, w, e }], best first (featured first)
  function record(why){
    let got; try{ got = scan(sessions, env()); }catch(err){ console.error('achievements', err); return []; }
    const had = !!rec(), cur = had ? profile.ach : { v: 1, got: {}, seen: 0 }, fresh = [];
    IDS.forEach(id => { if(got[id] && !cur.got[id]){ cur.got[id] = got[id]; fresh.push({ id, ...got[id] }); } });
    if(fresh.length){ profile.ach = cur; saveProfile(); }   // nothing new = nothing written (a profile save is an app-wide event; never at start-up for no reason)
    return pick(fresh);
  }
  // featured first: a secret before an ordinary one, the narrower condition first (rarer = higher), then the catalogue order
  const NARROW = { past_me: 90, final_set: 88, comeback: 86, other_left: 84, tenet: 82, band: 80, groundhog: 78, answer_42: 76, post_credits: 74, shift: 72, what_am: 70, returned: 60, know_guy: 92,
    gotta_rep: 50, tour: 48, deja: 46, four_elements: 44, double_digits: 42, same_iron: 40, new_plate: 40, pullups: 38, gravity: 36, eighty_four: 34, out_of_hand: 32, fellowship: 30, on_record: 28 };
  const rankOf = id => (SECRET.has(id) ? 1000 : 0) + (NARROW[id] || 0);
  function pick(list){ return list.slice().sort((a, b) => rankOf(b.id) - rankOf(a.id) || IDS.indexOf(a.id) - IDS.indexOf(b.id)); }
  const total = () => IDS.length, count = () => Object.keys(earned()).filter(k => IDS.includes(k)).length;
  return { CAT, IDS, SECRET, scan, record, earned, pick, total, count, rankOf, _prep: prep };
})();
