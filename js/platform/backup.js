// Backup import planner (V3 hardening). Pure: takes copies of what is saved now + a parsed backup file, returns what to save.
// Food Track · Gym Buddy — Settings › Import (wire/08) calls Backup.plan(), saves the result with Store.saveMany() (all or nothing),
// and only THEN puts the new values into the live lists. Nothing here touches the screen, localStorage or the live lists.
//
// Merge rules (unchanged from before 0.7.10.8 unless marked NEW):
//   foods, meals, supps, fridge, groc   add new ones; replace yours only when the file's copy has a newer updatedAt
//   dayLog (food diary)                 add entries you don't have (by id)
//   suppLog                             per day, the file's ticks are added over yours
//   days, plans, weights, profile       yours win; the file only fills what you don't have
//   targets, gym plan                   only when you have none
//   combos, sessions, tpls, exCustom    add the ones you don't have (by id)
//   NEW logPhr, foodFix                 yours win; the file fills the rest
//   NEW gym.active (live workout)       restored ONLY when you have no live workout and it is not already a finished session.
//                                       A live workout on this phone is never replaced.
//   NEW records without an id (very old backups) are matched by their content, so importing the same file twice adds nothing twice.
//   NEW streak (Change #13)            the record with the longer history (earlier `since`) wins; the higher personal best is kept.
//                                       Savers and weekly results are worked out again from the workouts, so an import can never grant twice.
//   NEW bad records are skipped, not fatal: non-objects, sessions without a start time, diary days that are not dates.

const Backup = (() => {
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const goodId = id => (typeof id === 'string' && id.length > 0 && id.length <= 64) || (typeof id === 'number' && isFinite(id));
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  const newId = () => (typeof Store !== 'undefined' && Store.newId) ? Store.newId() : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const nameKey = x => String(x.name || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + String(x.brand || '').toLowerCase().trim();
  const bodyKey = x => { const { id, ...rest } = x; return JSON.stringify(rest); };
  const dayMap = v => isObj(v) ? Object.fromEntries(Object.entries(v).filter(([d]) => DAY.test(d))) : {};

  // the live data the planner needs, as Store names. cur: { foods, meals, ... } (the caller passes the live values; they are copied here)
  function plan(cur, data){
    if(Array.isArray(data)) data = { foods: data };   // the oldest backups were just the food list
    if(!isObj(data) || !Array.isArray(data.foods)) return { ok: false, reason: 'bad' };
    if(Store.backupTooNew(data)) return { ok: false, reason: 'tooNew' };
    const was = {}, next = {};
    Object.keys(cur).forEach(k => { was[k] = JSON.stringify(cur[k]); next[k] = clone(cur[k]); });
    let added = 0, updated = 0;

    // lists of named records (foods & co): by id, else by name + brand; newer updatedAt wins
    const mergeNamed = (name, incoming, fix, needName) => {
      const arr = next[name] = Array.isArray(next[name]) ? next[name] : [];
      for(const raw of Array.isArray(incoming) ? incoming : []){
        if(!isObj(raw) || (needName && (typeof raw.name !== 'string' || !raw.name.trim()))) continue;
        const f = fix(clone(raw)); if(!isObj(f)) continue;
        if(!goodId(f.id)) delete f.id;
        const i = f.id != null ? arr.findIndex(x => x.id === f.id) : nameKey(f) === '|' ? -1 : arr.findIndex(x => nameKey(x) === nameKey(f));
        if(i === -1){ arr.push({ ...f, id: f.id != null ? f.id : newId() }); added++; }
        else if((f.updatedAt || '') > (arr[i].updatedAt || '')){ arr[i] = { ...f, id: arr[i].id }; updated++; }
      }
    };
    // lists where only new ones are added (by id, else by content)
    const addMissing = (name, incoming, valid, keyOf) => {
      const arr = next[name] = Array.isArray(next[name]) ? next[name] : [];
      const ids = new Set(arr.map(x => x && x.id)), keys = new Set(arr.map(keyOf));
      for(const raw of Array.isArray(incoming) ? incoming : []){
        if(!isObj(raw) || !valid(raw)) continue;
        const x = clone(raw);
        if(goodId(x.id)){ if(ids.has(x.id)) continue; }
        else { delete x.id; if(keys.has(keyOf(x))) continue; x.id = newId(); }
        arr.push(x); ids.add(x.id); keys.add(keyOf(x));
      }
    };
    const fillMap = (name, incoming, dates) => { if(isObj(incoming)) next[name] = { ...(dates ? dayMap(incoming) : clone(incoming)), ...(next[name] || {}) }; };

    mergeNamed('foods', data.foods, typeof normFood === 'function' ? normFood : x => x, true);
    mergeNamed('meals', data.meals, x => x, true);
    mergeNamed('supps', data.supps, x => x, true);
    mergeNamed('fridge', data.fridge, x => x, false);
    mergeNamed('groc', data.groc, x => x, true);

    if(isObj(data.suppLog)){ const sl = next.suppLog = isObj(next.suppLog) ? next.suppLog : {};
      Object.entries(dayMap(data.suppLog)).forEach(([d, v]) => { if(isObj(v)) sl[d] = { ...(sl[d] || {}), ...clone(v) }; }); }
    if(isObj(data.dayLog)){ const dl = next.dayLog = isObj(next.dayLog) ? next.dayLog : {};
      Object.entries(dayMap(data.dayLog)).forEach(([d, v]) => {
        if(!Array.isArray(v)) return; const have = dl[d] = Array.isArray(dl[d]) ? dl[d] : [];
        const ids = new Set(have.map(e => e && e.id)), keys = new Set(have.filter(isObj).map(bodyKey));
        v.forEach(raw => { if(!isObj(raw)) return; const e = clone(raw);
          if(goodId(e.id)){ if(ids.has(e.id)) return; } else { delete e.id; if(keys.has(bodyKey(e))) return; e.id = newId(); }
          have.push(e); ids.add(e.id); keys.add(bodyKey(e)); });
        if(!have.length) delete dl[d];
      }); }
    fillMap('days', data.days, true);
    fillMap('plans', data.plans, true);
    fillMap('weights', data.weights, true);
    if(isObj(data.targets) && !next.targets) next.targets = clone(data.targets);
    addMissing('combos', Array.isArray(data.combos) ? data.combos.filter(x => isObj(x) && goodId(x.id)) : [], () => true, bodyKey);
    fillMap('logPhr', data.logPhr, false);
    fillMap('foodFix', data.foodFix, false);
    // the streak record: valid shape only; the longer history wins, best = the higher of both
    const sr = data.streak, okRec = r => isObj(r) && r.v === 1 && DAY.test(r.since || '') && DAY.test(r.epoch || '') && Array.isArray(r.plan);
    if(okRec(sr)){ const mine = okRec(next.streak) ? next.streak : null, best = Math.max(+sr.best || 0, mine ? +mine.best || 0 : 0);
      if(!mine || sr.since < mine.since) next.streak = { ...clone(sr), best };
      else if(best > (+mine.best || 0)) next.streak = { ...mine, best }; }
    if(isObj(data.profile)) next.profile = { ...clone(data.profile), ...(isObj(next.profile) ? next.profile : {}) };

    let activeRestored = false, activeSkipped = false;
    if(isObj(data.gym)){
      const g = data.gym;
      addMissing('sessions', g.sessions, s => typeof s.start === 'string' && Array.isArray(s.exercises), s => s && s.start);
      next.sessions.sort((a, b) => String(a.start).localeCompare(String(b.start)));
      addMissing('tpls', g.tpl, t_ => Array.isArray(t_.exercises), x => x && JSON.stringify([x.name, x.exercises]));
      addMissing('exCustom', g.custom, x => typeof x.id === 'string' || typeof x.en === 'string', x => x && JSON.stringify([x.en, x.el]));
      if(isObj(g.plan) && !Object.keys(next.gymPlan || {}).length) next.gymPlan = clone(g.plan);
      if(isObj(g.active) && Array.isArray(g.active.exercises)){
        const inSessions = next.sessions.some(s => s.id === g.active.id || (g.active.start && s.start === g.active.start));
        if(!next.active && !inSessions){ next.active = clone(g.active); activeRestored = true; } else activeSkipped = !inSessions;
      }
    }
    if(Array.isArray(next.fridge)) next.fridge.forEach(x => { if(x && x.name === 'item') delete x.name; });   // as before: placeholder names never stay

    // only names whose value really changed are written (smaller journal, fewer writes)
    const changed = Object.keys(next).filter(k => JSON.stringify(next[k]) !== was[k]);
    return { ok: true, next, changed, added, updated, activeRestored, activeSkipped };
  }

  return { plan };
})();
