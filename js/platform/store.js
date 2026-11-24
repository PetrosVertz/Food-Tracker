// Storage + data model. Every saved thing goes through Store (nothing else touches localStorage).
// Food Track · Gym Buddy — loaded right after config.js. A native app / cloud sync swaps the inside of this file only.
//
//  • Device settings (this phone only): settings, ui, models, account.
//  • Data (will sync to the account later): everything else.
//  • Schema-versioned: SCHEMA goes up with every change to the data shape; MIGRATIONS bring old data (and old backups) up to date.
//  • Sync-ready: list records always have an id; every save notes which records changed (last-changed time) and which
//    were deleted (a tombstone), in one side table — so two devices can merge later without losing or reviving things.

const Account = {
  // who is the user — always this phone until sign-in exists; sign-in plugs in here
  current(){ return Object.assign({ id: 'local', provider: 'local', name: null }, Store.load('account', {})); },
  signedIn(){ return this.current().provider !== 'local'; },
};

const Store = (() => {
  const SCHEMA = 2, SCHEMA_KEY = 'ft.schema', META_KEY = 'ft.sync.v1';
  // name → [storage key, shape, synced]   shapes: list = [{id}], map = {key: value}, days = {date: [{id}]}, one = a single value
  const C = {
    foods: ['ft.foods.v1', 'list', 1], meals: ['ft.meals.v1', 'list', 1], supps: ['ft.supps.v1', 'list', 1], suppLog: ['ft.supplog.v1', 'map', 1],
    fridge: ['ft.fridge.v1', 'list', 1], groc: ['ft.groc.v1', 'list', 1], dayLog: ['ft.log.v1', 'days', 1], days: ['ft.days.v1', 'map', 1],
    targets: ['ft.targets.v1', 'one', 1], plans: ['ft.plans.v1', 'map', 1], weights: ['ft.weights.v1', 'map', 1], profile: ['ft.profile.v1', 'one', 1],
    exCustom: ['ft.gym.custom', 'list', 1], tpls: ['ft.gym.tpl', 'list', 1], gymPlan: ['ft.gym.plan', 'map', 1], sessions: ['ft.gym.sessions', 'list', 1],
    active: ['ft.gym.active', 'one', 1], comeback: ['ft.gym.comeback', 'one', 1], combos: ['ft.combos.v1', 'list', 1],
    logPhr: ['ft.logphr.v1', 'map', 1],   // 0.7.1 Quick Log: typed phrase → food, so repeats need no AI matching
    foodFix: ['ft.foodfix.v1', 'map', 1],
    streak: ['ft.streak.v1', 'one', 1],   // Change #13: the weekly streak's start, carried-over streak, planner-change log, locked week targets, personal best (js/streak.js)   // Athlete OS step 3: Food Coach corrections you made (food words → your portion), so the AI learns your portions
    aiKnow: ['ft.aiknow.v1', 'one', 0],   // 0.7.9 what the AI has learned from your logs (js/know.js); this device only, rebuilt daily
    drafts: ['ft.drafts.v1', 'one', 0],   // Refinements: what you typed in a window, kept 3 minutes after it closes (js/draft.js); this device only, never in backups
    athleteMem: ['ft.athletemem.v1', 'one', 0],   // Athlete OS: notes the user told a coach + the decision ledger (js/athlete/memory.js); this device only, never in backups
    gymCoach: ['ft.gymcoach.v1', 'one', 0],   // Gym Coach: recent chat lines, hints already shown, past proposals and what you did with them (js/gym-intel.js); this device only, never in backups
    coachChat: ['ft.coachchat.v1', 'one', 0],   // Food Coach 2.0: the Food Coach chat kept 2 days + answer times (js/food-coach.js); this device only, never in backups
    recJournal: ['ft.recjournal.v1', 'one', 0],   // RECOVERY+ forecast journal: forecasts as issued + the training-only comparator (js/recovery-plus.js › journal); this device only, never in backups
    profiler: ['ft.profiler.v1', 'one', 0],   // beta profiler: opens, saved RECOVERY+ forecasts, caught errors (js/profiler.js); this device only, never in backups
    aiUsage: ['ft.aiusage.v1', 'one', 0],   // Athlete OS step 1: AI request counts, tokens and timings (js/platform/ai-usage.js); this device only, no message text
    settings: ['ft.settings.v1', 'one', 0], ui: ['ft.ui.v1', 'one', 0], models: ['ft.models.v1', 'one', 0], account: ['ft.account.v1', 'one', 0],
  };
  const BY_KEY = Object.fromEntries(Object.entries(C).map(([n, c]) => [c[0], n]));
  const nameOf = k => C[k] ? k : BY_KEY[k] || null, keyOf = k => C[k] ? C[k][0] : k;
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- raw storage ----------
  // read(): undefined = absent. Text that is not valid JSON is CORRUPT, not absent: its bytes are copied to 'ft.corrupt.<key>' first
  // (or, if even that copy fails, the key is locked against overwriting for this session), so a later save can never destroy the only copy.
  const JOURNAL_KEY = 'ft.journal.v1', CORRUPT = 'ft.corrupt.';
  const problems = [], locked = new Set(), rescued = {};
  const raw = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  function quarantine(k, txt){
    if(k in rescued) return; rescued[k] = txt;
    const q = raw(CORRUPT + k);   // again: the same bytes were already put aside at an earlier start (no new notice needed)
    problems.push({ kind: 'corrupt', key: k, name: nameOf(k), at: Date.now(), again: q === txt });
    try{ if(q !== txt) localStorage.setItem(q == null ? CORRUPT + k : CORRUPT + k + '.' + Date.now(), txt); }
    catch(e){ locked.add(k); }
  }
  const read = k => { const v = raw(k); if(!v) return undefined; try{ return JSON.parse(v); }catch(e){ quarantine(k, v); return undefined; } };
  // write(): true only when the browser really stored it. undefined (and null through save) removes the key; [] and {} are stored as they are.
  const write = (k, v, quiet) => {
    if(locked.has(k)){ if(!quiet) try{ toast(t('saveFail')); }catch(_){} return false; }
    try{ if(v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch(e){ if(!quiet) try{ toast(t('saveFail')); }catch(_){} return false; } };
  const mustWrite = (k, v) => { if(!write(k, v, true)) throw new Error('could not write ' + k); };
  const putRaw = (k, txt) => { try{ localStorage.removeItem(k); if(txt != null) localStorage.setItem(k, txt); return true; }catch(e){ return false; } };

  // ---------- sync bookkeeping ----------
  let meta = null, metaTimer = null; const seen = {};
  const M = () => meta || (meta = Object.assign({ upd: {}, tomb: {} }, read(META_KEY) || {}));
  const flushMeta = () => { clearTimeout(metaTimer); metaTimer = null; if(meta) write(META_KEY, meta); };
  // ids: the ONE place missing record ids are given is just before a synced list / day list is saved (save, saveMany, migration 2).
  // The ids are put on the caller's objects on purpose, so what is in memory and what is on disk carry the same id.
  const ensureIds = (shape, v) => {
    if(v == null) return;
    if(shape === 'list' && Array.isArray(v)) v.forEach(x => { if(x && typeof x === 'object' && !x.id) x.id = newId(); });
    if(shape === 'days' && typeof v === 'object') Object.values(v).forEach(l => (Array.isArray(l) ? l : []).forEach(e => { if(e && typeof e === 'object' && !e.id) e.id = newId(); }));
  };
  // records(): read only. A record without an id (old data before migration 2) is keyed by its place instead of being given one here.
  const records = (shape, v) => {
    if(v == null) return [];
    if(shape === 'list') return Array.isArray(v) ? v.filter(x => x && typeof x === 'object').map((x, i) => [x.id || '#' + i, x]) : [];
    if(shape === 'days') return Object.entries(v).flatMap(([d, l]) => (Array.isArray(l) ? l : []).map((e, i) => [d + '/' + ((e && e.id) || '#' + i), e]));
    if(shape === 'map') return Object.entries(v);
    return [['_', v]];
  };
  const hashes = (shape, v) => new Map(records(shape, v).map(([k, x]) => [k, JSON.stringify(x)]));
  // diff BEFORE writing (the old value is still on disk), commit AFTER the write succeeded: a failed write never touches the sync table
  function diff(name, v){ const shape = C[name][1]; return { cur: hashes(shape, v), prev: seen[name] || hashes(shape, read(C[name][0])) }; }
  // returns what changed, record by record: { added, changed, removed } as [record key, fingerprint] pairs (Athlete OS events read this)
  function commit(name, d){
    const now = Date.now(), m = M(), upd = m.upd[name] = m.upd[name] || {}, tomb = m.tomb[name] = m.tomb[name] || {};
    let changed = false; const ch = { added: [], changed: [], removed: [] }, want = subs.length > 0;
    d.cur.forEach((h, k) => { const p = d.prev.get(k); if(p !== h){ upd[k] = now; changed = true; if(want) (p === undefined ? ch.added : ch.changed).push([k, fp(h)]); } if(tomb[k]){ delete tomb[k]; changed = true; } });
    d.prev.forEach((h, k) => { if(!d.cur.has(k)){ tomb[k] = now; delete upd[k]; changed = true; if(want) ch.removed.push([k, fp(h)]); } });
    seen[name] = d.cur;
    if(changed && !metaTimer) metaTimer = setTimeout(flushMeta, 400);
    return ch;
  }
  // ---------- change listeners (Athlete OS step 2) ----------
  // onChange(fn): fn(name, changes | null, how) after every SUCCESSFUL save. how = 'save' | 'import' (saveMany). changes is null for
  // device-only names (no record diff is kept for them). A listener can never break or slow a save: errors are caught, nothing is awaited.
  const subs = [];
  const fp = h => { let x = 2166136261; for(let i = 0; i < h.length; i++){ x ^= h.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };   // FNV-1a: a short fingerprint of a record
  function notify(name, ch, how){ for(const f of subs){ try{ f(name, ch, how); }catch(e){ try{ console.warn('Store listener', e); }catch(_){} } } }
  function onChange(fn){ subs.push(fn); return () => { const i = subs.indexOf(fn); if(i > -1) subs.splice(i, 1); }; }
  addEventListener('pagehide', flushMeta); addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') flushMeta(); });

  // ---------- public ----------
  function load(k, fb){ const v = read(keyOf(k)); return v === undefined || v === null ? fb : v; }
  function save(k, v){
    const n = nameOf(k), sync = n && C[n][2];
    if(sync) ensureIds(C[n][1], v);
    const d = sync ? diff(n, v) : null;
    const ok = write(keyOf(k), v ?? undefined);
    if(ok){ const ch = d ? commit(n, d) : null; if(n && subs.length) notify(n, ch, 'save'); }
    return ok;
  }
  // several names at once, all or nothing (imports). { name: value, ... } → true when every key is stored; false = nothing changed.
  // The old values go to a journal key first, so if the app is closed half way the next start puts them back. If the journal itself
  // does not fit (storage nearly full) the group still rolls back from memory on a failed write; only a crash in those few ms is then unguarded.
  function saveMany(obj){
    const items = Object.entries(obj).map(([k, v]) => { const n = nameOf(k); if(!n) throw new Error('unknown store name ' + k); return { n, key: C[n][0], v, sync: C[n][2] }; });
    if(items.some(it => locked.has(it.key))){ try{ toast(t('saveFail')); }catch(_){} return false; }
    items.forEach(it => { if(it.sync){ ensureIds(C[it.n][1], it.v); it.d = diff(it.n, it.v); } it.old = raw(it.key); });
    const journaled = write(JOURNAL_KEY, { at: Date.now(), old: Object.fromEntries(items.map(it => [it.key, it.old])) }, true);
    let failed = false;
    for(const it of items){ if(!write(it.key, it.v ?? undefined, true)){ failed = true; break; } it.done = true; }
    if(failed){
      const back = items.filter(it => it.done).every(it => putRaw(it.key, it.old));
      if(back && journaled) write(JOURNAL_KEY, undefined, true);
      if(!back) problems.push({ kind: 'rollbackFailed', at: Date.now() });
      try{ toast(t('saveFail')); }catch(_){}
      return false;
    }
    const chs = items.map(it => it.d ? commit(it.n, it.d) : null);
    if(journaled) write(JOURNAL_KEY, undefined, true);
    if(subs.length) items.forEach((it, i) => notify(it.n, chs[i], 'import'));
    return true;
  }
  // an import (saveMany) that the app was closed in the middle of: put every key back the way it was before it started
  (function recover(){
    const j = read(JOURNAL_KEY); if(!j || !j.old || typeof j.old !== 'object') return;
    const back = Object.entries(j.old).every(([k, txt]) => putRaw(k, txt));
    if(back) write(JOURNAL_KEY, undefined, true);
    problems.push({ kind: back ? 'rolledBack' : 'rollbackFailed', at: Date.now(), keys: Object.keys(j.old) });
  })();

  // ---------- migrations (old data and old backups) ----------
  // Rules: a migration must throw if any write fails (mustWrite), must be safe to run again, and copies before it deletes.
  // The schema number moves on only after its migration finished; a failed one runs again at the next start.
  const setIds = ses => (ses || []).forEach(s => (s.exercises || []).forEach(x => (x.sets || []).forEach(st => { if(!st.id) st.id = newId(); })));
  const MIGRATIONS = {
    // 0.6.6: profile (body + gym habits) moves out of the UI settings into synced data; every record and set gets an id
    2(){
      const ui = read(C.ui[0]) || {}, pf = Object.assign({}, read(C.profile[0]) || {}), moved = ['sex', 'height', 'gymTime', 'gymLast', 'sore'].filter(k => ui[k] !== undefined);
      if(moved.length){ moved.forEach(k => { if(pf[k] === undefined) pf[k] = ui[k]; }); mustWrite(C.profile[0], pf); moved.forEach(k => delete ui[k]); mustWrite(C.ui[0], ui); }
      Object.entries(C).forEach(([n, [key, shape, sync]]) => { if(!sync || shape !== 'list' && shape !== 'days') return; const v = read(key); if(v == null) return; ensureIds(shape, v); mustWrite(key, v); });
      const ses = read(C.sessions[0]); if(ses){ setIds(ses); mustWrite(C.sessions[0], ses); }
      const act = read(C.active[0]); if(act){ setIds([act]); mustWrite(C.active[0], act); }
      const tp = read(C.tpls[0]); if(tp){ tp.forEach(x => (x.exercises || []).forEach(e => { if(!e.id) e.id = newId(); })); mustWrite(C.tpls[0], tp); }
      const now = Date.now(), m = M();   // everything that exists now counts as changed now
      Object.entries(C).forEach(([n, [key, shape, sync]]) => { if(!sync) return; const u = m.upd[n] = m.upd[n] || {}; records(shape, read(key)).forEach(([k]) => { if(!u[k]) u[k] = now; }); });
      flushMeta();
    },
  };
  try{ localStorage.removeItem('ft.pet.v1'); }catch(e){}   // 0.7.9: the pet system is gone; old pet data is deleted
  (function migrate(){
    let v = +read(SCHEMA_KEY) || 1;
    if(v > SCHEMA){ problems.push({ kind: 'tooNew', schema: v, at: Date.now() }); return; }   // data from a newer app version: never "upgraded" down
    while(v < SCHEMA){
      const next = v + 1;
      try{ if(MIGRATIONS[next]) MIGRATIONS[next](); }
      catch(e){ console.error('migration ' + next, e); problems.push({ kind: 'migration', step: next, at: Date.now() }); return; }
      if(!write(SCHEMA_KEY, next, true)){ problems.push({ kind: 'migration', step: next, at: Date.now() }); return; }
      v = next;
    }
  })();

  // a backup from an older version: bring it to the current shape before merging. A backup from a NEWER version is left as it is (backupTooNew).
  const backupTooNew = d => !!d && typeof d === 'object' && (+d.schema || 1) > SCHEMA;
  function upgradeBackup(d){
    if(!d || typeof d !== 'object' || Array.isArray(d) || backupTooNew(d)) return d;
    if((+d.schema || 1) < 2){ const g = d.gym || {}; setIds(g.sessions); (g.tpl || []).forEach(x => (x.exercises || []).forEach(e => { if(!e.id) e.id = newId(); })); }
    d.schema = SCHEMA; return d;
  }

  // backup = all synced data (same flat layout as before 0.6.6, plus profile, schema and the sync table).
  // Added (all optional, older versions ignore them): gym.active (the live workout), logPhr, foodFix, streak (Change #13), recovery (bytes of saved data that could not be read).
  function snapshot(){
    const g = n => load(n, C[n][1] === 'list' ? [] : C[n][1] === 'one' ? null : {});
    flushMeta();
    const rec = {};
    try{ for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(k && k.startsWith(CORRUPT)) rec[k.slice(CORRUPT.length)] = raw(k); } }catch(e){}
    Object.entries(rescued).forEach(([k, txt]) => { if(!Object.values(rec).includes(txt)) rec[k] = txt; });
    return { app: 'tracker', version: VERSION, schema: SCHEMA, exportedAt: new Date().toISOString(), account: Account.current().id,
      foods: g('foods'), meals: g('meals'), supps: g('supps'), suppLog: g('suppLog'), fridge: g('fridge'), groc: g('groc'), dayLog: g('dayLog'), days: g('days'),
      targets: g('targets'), plans: g('plans'), weights: g('weights'), profile: g('profile') || {},
      gym: { custom: g('exCustom'), tpl: g('tpls') || [], plan: g('gymPlan'), sessions: g('sessions'), comeback: g('comeback'), active: g('active') },
      combos: g('combos'), logPhr: g('logPhr'), foodFix: g('foodFix'), streak: g('streak'), sync: M(), ...(Object.keys(rec).length ? { recovery: rec } : {}) };
  }

  return { SCHEMA, load, save, saveMany, onChange, snapshot, upgradeBackup, backupTooNew, newId, meta: M, flush: flushMeta, problems: () => problems.slice(),
    dataNames: () => Object.keys(C).filter(n => C[n][2]), deviceNames: () => Object.keys(C).filter(n => !C[n][2]) };
})();
