// ---------- 0.7.9 ai: what the AI knows about you (background intelligence) ----------
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// Once a day, when the app opens, this looks back over your own logs ON THE PHONE (no AI call) and keeps a short profile:
// how you usually eat (calories and protein vs targets, meal times, favourite foods and brands, suggestions you skip),
// how you train (days, split, sets per muscle, reps and effort, strength trends and ranks, how often each muscle gets trained)
// and your weight trend. Saved through Store as 'aiKnow' (this device only, never in backups):
//   { day: the date it was built, since: learning starts after this date (Settings › AI › Reset What AI Knows) or null,
//     body, food, foodShort, gym, gymShort: short English lines }
// AI.knows(topic) (js/platform/ai.js, next to the Food Preferences rules) puts it into the coach / suggestion prompts.
// It is never shown on screen. Steps and sleep join in only when a phone health source exists (none yet: no Phone.* call for it).

const Know = (() => {
  const FOOD_DAYS = 28, GYM_DAYS = 56, MAX = 1600;   // look-back windows; the whole profile stays under ~MAX letters
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const med = a => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 0; };
  const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  const top = (map, n, min) => Object.entries(map).filter(([, v]) => v >= (min || 1)).sort((a, b) => b[1] - a[1]).slice(0, n);
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

  // the days to learn from: before today, after the reset date, at most n days back
  function window_(n, since){ const today = todayKey(), out = [];
    for(let i = 1; i <= n; i++){ const d = addDays(today, -i); if(since && d <= since) break; out.push(d); }
    return out; }

  // ---- food ----
  function food(since){
    const ds = window_(FOOD_DAYS, since).filter(d => (dayLog[d] || []).length);
    if(ds.length < 3) return null;
    const kc = [], pr = [], tk = [], tp = [], gym = [], rest = [], times = [], firsts = [], lasts = [], occ = [], favs = {}, names = {}, brands = {};
    let hitP = 0; const trained = new Set(sessions.map(s => s.date));
    ds.forEach(d => {
      const l = dayLog[d], tot = dayTotals(d), tg = targetFor(d);
      kc.push(tot.kcal); pr.push(tot.p);
      if(tg){ tk.push(tg.k); tp.push(tg.p); if(tot.p >= tg.p * .9) hitP++; }
      (dayInfo(d).type === 'gym' || trained.has(d) ? gym : rest).push(tot.kcal);
      // eating occasions: entries less than 45 min apart are one meal
      const ms = l.map(e => toMin(e.time)).filter(m => m !== null).sort((a, b) => a - b), starts = [];
      ms.forEach(m => { if(!starts.length || m - starts[starts.length - 1].last > 45) starts.push({ at: m, last: m }); else starts[starts.length - 1].last = m; });
      if(starts.length){ firsts.push(starts[0].at); lasts.push(starts[starts.length - 1].at); occ.push(starts.length); starts.forEach(s => times.push(s.at)); }
      const seen = new Set();
      l.forEach(e => { const k = e.kind + ':' + e.refId; if(seen.has(k)) return; seen.add(k);
        const f = e.kind === 'food' && foods.find(x => x.id === e.refId), m = e.kind === 'meal' && meals.find(x => x.id === e.refId);
        const n = bareName(f ? foodName(f) : m ? m.name : e.name); if(!n) return;
        favs[n] = (favs[n] || 0) + 1; names[norm(n)] = 1;
        if(f && f.brand && !f.noBrand) brands[f.brand] = (brands[f.brand] || 0) + 1; });
    });
    // usual meal times: hours where a meal starts on at least a third of the days (neighbouring hours merged)
    const byH = {}; times.forEach(m => { const h = Math.floor(m / 60); byH[h] = (byH[h] || 0) + 1; });
    const peaks = Object.keys(byH).map(Number).sort((a, b) => a - b).filter(h => byH[h] >= ds.length / 3)
      .filter((h, i, a) => !(a.includes(h - 1) && byH[h - 1] >= byH[h]) && !(a.includes(h + 1) && byH[h + 1] > byH[h]));
    // AI meal suggestions (Fill My Macros / Food Coach) the user left out at least twice and never logged = probably not wanted
    const skip = {};
    window_(FOOD_DAYS, since).forEach(d => ((plans[d] && plans[d].meals) || []).forEach(m => { if(m.logged) return;
      (m.items || []).forEach(it => { const n = String(it.name || '').trim(); if(n && !names[norm(n)]) skip[n] = (skip[n] || 0) + 1; }); }));
    const k = Math.round(avg(kc)), p = Math.round(avg(pr)), K = Math.round(avg(tk)), P = Math.round(avg(tp));
    const lines = [
      `Food (last ${ds.length} logged days): usually ~${k} kcal${K ? ` (target ~${K}, ${pct(k, K)}%)` : ''}, protein ~${p} g${P ? ` (target ~${P}, ${pct(p, P)}%; reached on ${hitP} of ${ds.length} days)` : ''}.`
        + (gym.length >= 2 && rest.length >= 2 ? ` Gym days ~${Math.round(avg(gym))} kcal, rest days ~${Math.round(avg(rest))} kcal.` : ''),
      occ.length ? `Meals: about ${med(occ)} a day, first ~${hm(med(firsts))}, last ~${hm(med(lasts))}${peaks.length ? `, usually around ${peaks.map(h => hm(h * 60)).join(', ')}` : ''}.` : '',
      top(favs, 10, 2).length ? `Eats most often: ${top(favs, 10, 2).map(([n]) => n).join(', ')}.` : '',
      top(brands, 5, 2).length ? `Brands they buy: ${top(brands, 5, 2).map(([n]) => n).join(', ')}.` : '',
      top(skip, 5, 2).length ? `Suggested before but never eaten (seems to avoid): ${top(skip, 5, 2).map(([n]) => n).join(', ')}.` : '',
    ].filter(Boolean);
    return { full: lines.join(' '), short: lines[0] };
  }

  // ---- training ----
  function gym(since){
    const ds = new Set(window_(GYM_DAYS, since)), list = sessions.filter(s => ds.has(s.date)).sort((a, b) => a.start.localeCompare(b.start));
    if(list.length < 2) return null;
    const span = -daysUntil(list[0].date), weeks = Math.max(1, span / 7), dates = [...new Set(list.map(s => s.date))];
    const wd = {}; dates.forEach(d => { const w = new Date(d + 'T12:00:00').getDay(); wd[w] = (wd[w] || 0) + 1; });
    const days_ = Object.keys(wd).map(Number).filter(w => wd[w] >= weeks * .5).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(w => WD[w]);
    const starts = list.map(s => { const d = new Date(s.start); return d.getHours() * 60 + d.getMinutes(); }), mins = list.map(s => +s.mins).filter(m => m > 0);
    const split = {}; list.forEach(s => { const k = s.type || inferDayType(s.exercises); if(k) split[k] = (split[k] || 0) + 1; });
    const gaps = dates.slice(1).map((d, i) => -daysUntil(dates[i]) + daysUntil(d));
    // hard sets per muscle group per week, and how many days pass between two workouts of the same group
    const lift = list.filter(s => s.exercises.some(x => !isCardio(x.exId))), grp = {}, hitDays = {};
    Object.entries(hitsFrom(lift, false)).forEach(([h, v]) => { const g = HEADS[h] && HEADS[h][2]; if(g && g !== 'cardio' && g !== 'other') grp[g] = Math.max(grp[g] || 0, v); });
    lift.forEach(s => Object.entries(hitsFrom([s], false)).forEach(([h, v]) => { const g = HEADS[h] && HEADS[h][2]; if(!g || g === 'cardio' || g === 'other' || v < 1) return;
      (hitDays[g] = hitDays[g] || new Set()).add(s.date); }));
    const every = Object.entries(hitDays).map(([g, set]) => { const a = [...set].sort(); if(a.length < 2) return null;
      return [g, avg(a.slice(1).map((d, i) => daysUntil(d) - daysUntil(a[i])))]; }).filter(Boolean).sort((a, b) => a[1] - b[1]);
    const st = typeof gymStyleRead === 'function' ? gymStyleRead() : null;
    // strength: the most-done lifts, best estimated 1RM in the last 4 weeks vs the 4 weeks before, plus the rank (tier)
    const cnt = {}; lift.forEach(s => s.exercises.forEach(x => { if(!isCardio(x.exId) && x.sets.some(z => z.done && isMainSet(z))) cnt[x.exId] = (cnt[x.exId] || 0) + 1; }));
    const best = (exId, from, to) => { let b = 0; list.forEach(s => { const ago = -daysUntil(s.date); if(ago < from || ago > to) return;
      s.exercises.forEach(x => { if(x.exId !== exId) return; x.sets.forEach(z => { if(!z.done || !isMainSet(z) || z.w === '' || z.r === '' || +z.r > 12) return; b = Math.max(b, e1rm(+z.w, +z.r, exId)); }); }); }); return b; };
    const lifts = top(cnt, 6, 2).map(([id]) => { const now = best(id, 1, 28), was = best(id, 29, GYM_DAYS), e = now || was; if(!e) return null;
      const tf = typeof tierFor === 'function' ? tierFor(id, e) : null, ch = now && was ? Math.round((now - was) / was * 100) : null;
      return `${gcEx(id)} ~${Math.round(e)} kg${ch !== null ? ` (${ch > 0 ? '+' : ''}${ch}% vs the 4 weeks before)` : ''}${tf && tf.label ? `, rank ${tf.label}` : ''}`; }).filter(Boolean);
    // 0.7.9.1: effort logged in the background (reps in reserve, negatives, half reps)
    let nRir = 0, nHard = 0, nNeg = 0, nHalf = 0;
    lift.forEach(s => s.exercises.forEach(x => x.sets.forEach(z => { if(!z.done || !isMainSet(z)) return;
      if(z.rir != null){ nRir++; if(z.rir <= 1) nHard++; } if(+z.ng > 0) nNeg++; if(+z.hr > 0) nHalf++; })));
    const cardio = list.filter(s => s.exercises.some(x => isCardio(x.exId))).length;
    const lines = [
      `Training (last ${Math.round(weeks) === 1 ? 'week' : Math.round(weeks) + ' weeks'}): ${list.length} workouts, ~${(dates.length / weeks).toFixed(1)} days a week${days_.length ? `, usually ${days_.join(' ')}` : ''}, starts ~${hm(med(starts))}${mins.length ? `, ~${med(mins)} min` : ''}.`,
      top(split, 4).length ? `Split: ${top(split, 4).map(([k, n]) => `${k} ${n}x`).join(', ')}${cardio ? `; cardio in ${cardio} workouts` : ''}.` : '',
      Object.keys(grp).length ? `Hard sets per week: ${top(grp, 10).map(([g, v]) => `${g} ${Math.round(v / weeks)}`).join(', ')}.` : '',
      st ? `Usually ${st.reps || '?'} reps, ${st.fail}% of sets to failure, ~${st.rest} s rest.` : '',
      nRir >= 5 ? `Effort: ${Math.round(nHard / nRir * 100)}% of logged sets end with 0-1 reps in reserve.` : '',
      nNeg + nHalf >= 3 ? `Uses negatives in ${nNeg} sets and half reps in ${nHalf} sets.` : '',
      lifts.length ? `Strength (estimated 1RM): ${lifts.join('; ')}.` : '',
      gaps.length ? `Recovery: ~${avg(gaps).toFixed(1)} days between workouts (longest break ${Math.max(...gaps)} days)${every.length ? `; days between two workouts of the same muscle: ${every.slice(0, 6).map(([g, v]) => `${g} ${v.toFixed(1)}`).join(', ')}` : ''}.` : '',
    ].filter(Boolean);
    return { full: lines.join(' '), short: lines[0] };
  }

  // ---- body ----
  function body(since){
    const ds = window_(GYM_DAYS, since), w = ds.filter(d => +weights[d] > 0).sort();
    const bits = [profile.sex === 'm' ? 'male' : profile.sex === 'f' ? 'female' : '', +profile.height ? `${profile.height} cm` : '', targets && targets.goal ? `goal: ${targets.goal}` : ''].filter(Boolean);
    if(w.length >= 2){ const a = +weights[w[0]], b = +weights[w[w.length - 1]], d = r1(b - a), wk = Math.max(1, (daysUntil(w[w.length - 1]) - daysUntil(w[0])) / 7);
      bits.push(`weight ${fmt(b)} kg, ${d > 0 ? '+' : ''}${fmt(d)} kg over ${Math.round(wk) === 1 ? '1 week' : Math.round(wk) + ' weeks'} (${d > 0 ? '+' : ''}${r1(d / wk)} kg/week)`); }
    else if(w.length) bits.push(`weight ${fmt(+weights[w[0]])} kg`);
    return bits.length ? `Body: ${bits.join(', ')}.` : '';
  }

  // build today's profile (once a day; force = build again now)
  function daily(force){
    try{
      const k = Store.load('aiKnow', null) || {}, today = todayKey();
      if(!force && k.day === today) return;
      const f = food(k.since), g = gym(k.since), b = body(k.since), cut = s => String(s || '').slice(0, MAX / 2);
      Store.save('aiKnow', { day: today, since: k.since || null, body: b, food: cut(f && f.full), foodShort: (f && f.short) || '', gym: cut(g && g.full), gymShort: (g && g.short) || '' });
    }catch(e){ console.warn('aiKnow', e); }   // never in the way of starting the app
  }
  // Settings › AI › Reset What AI Knows: forget everything; learning starts again from tomorrow's look-back (only logs after today)
  function reset(){ Store.save('aiKnow', { day: todayKey(), since: todayKey(), body: '', food: '', foodShort: '', gym: '', gymShort: '' });
    if(typeof logFix !== 'undefined'){ logFix = {}; Store.save('foodFix', {}); }   // Athlete OS step 3: Food Coach's remembered corrections too
    if(typeof AthleteMemory !== 'undefined') AthleteMemory.clear(); }   // Athlete OS: the notes you told the coaches, and the decision ledger

  setTimeout(() => daily(), 1500);   // after start-up has drawn the app
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') setTimeout(() => daily(), 1500); });   // opened again on a new day
  return { daily, reset };
})();
