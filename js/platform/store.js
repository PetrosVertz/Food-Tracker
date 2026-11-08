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
    active: ['ft.gym.active', 'one', 1], comeback: ['ft.gym.comeback', 'one', 1], pet: ['ft.pet.v1', 'one', 1], combos: ['ft.combos.v1', 'list', 1],
    settings: ['ft.settings.v1', 'one', 0], ui: ['ft.ui.v1', 'one', 0], models: ['ft.models.v1', 'one', 0], account: ['ft.account.v1', 'one', 0],
  };
  const BY_KEY = Object.fromEntries(Object.entries(C).map(([n, c]) => [c[0], n]));
  const nameOf = k => C[k] ? k : BY_KEY[k] || null, keyOf = k => C[k] ? C[k][0] : k;
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const read = k => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : undefined; }catch(e){ return undefined; } };
  const write = (k, v) => { try{ if(v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch(e){ try{ toast(t('saveFail')); }catch(_){} return false; } };

  // ---------- sync bookkeeping ----------
  let meta = null, metaTimer = null; const seen = {};
  const M = () => meta || (meta = Object.assign({ upd: {}, tomb: {} }, read(META_KEY) || {}));
  const flushMeta = () => { clearTimeout(metaTimer); metaTimer = null; if(meta) write(META_KEY, meta); };
  const records = (shape, v) => {
    if(v == null) return [];
    if(shape === 'list') return Array.isArray(v) ? v.filter(x => x && typeof x === 'object').map(x => { if(!x.id) x.id = newId(); return [x.id, x]; }) : [];
    if(shape === 'days') return Object.entries(v).flatMap(([d, l]) => (l || []).map(e => { if(!e.id) e.id = newId(); return [d + '/' + e.id, e]; }));
    if(shape === 'map') return Object.entries(v);
    return [['_', v]];
  };
  const hashes = (shape, v) => new Map(records(shape, v).map(([k, x]) => [k, JSON.stringify(x)]));
  function track(name, v){
    const shape = C[name][1], now = Date.now(), cur = hashes(shape, v), m = M();
    const prev = seen[name] || hashes(shape, read(C[name][0]));
    const upd = m.upd[name] = m.upd[name] || {}, tomb = m.tomb[name] = m.tomb[name] || {};
    let changed = false;
    cur.forEach((h, k) => { if(prev.get(k) !== h){ upd[k] = now; changed = true; } if(tomb[k]){ delete tomb[k]; changed = true; } });
    prev.forEach((_, k) => { if(!cur.has(k)){ tomb[k] = now; delete upd[k]; changed = true; } });
    seen[name] = cur;
    if(changed && !metaTimer) metaTimer = setTimeout(flushMeta, 400);
  }
  addEventListener('pagehide', flushMeta); addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') flushMeta(); });

  // ---------- public ----------
  function load(k, fb){ const v = read(keyOf(k)); return v === undefined || v === null ? fb : v; }
  function save(k, v){ const n = nameOf(k); if(n && C[n][2]) track(n, v); return write(keyOf(k), v ?? undefined); }

  // ---------- migrations (old data and old backups) ----------
  const setIds = ses => (ses || []).forEach(s => (s.exercises || []).forEach(x => (x.sets || []).forEach(st => { if(!st.id) st.id = newId(); })));
  const MIGRATIONS = {
    // 0.6.6: profile (body + gym habits) moves out of the UI settings into synced data; every record and set gets an id
    2(){
      const ui = read(C.ui[0]) || {}, pf = Object.assign({}, read(C.profile[0]) || {});
      ['sex', 'height', 'gymTime', 'gymLast', 'sore'].forEach(k => { if(ui[k] !== undefined){ if(pf[k] === undefined) pf[k] = ui[k]; delete ui[k]; } });
      write(C.ui[0], ui); write(C.profile[0], pf);
      Object.entries(C).forEach(([n, [key, shape, sync]]) => { if(!sync || shape !== 'list' && shape !== 'days') return; const v = read(key); if(v == null) return; records(shape, v); write(key, v); });
      const ses = read(C.sessions[0]); if(ses){ setIds(ses); write(C.sessions[0], ses); }
      const act = read(C.active[0]); if(act){ setIds([act]); write(C.active[0], act); }
      const tp = read(C.tpls[0]); if(tp){ tp.forEach(x => (x.exercises || []).forEach(e => { if(!e.id) e.id = newId(); })); write(C.tpls[0], tp); }
      const now = Date.now(), m = M();   // everything that exists now counts as changed now
      Object.entries(C).forEach(([n, [key, shape, sync]]) => { if(!sync) return; const u = m.upd[n] = m.upd[n] || {}; records(shape, read(key)).forEach(([k]) => { if(!u[k]) u[k] = now; }); });
      flushMeta();
    },
  };
  (function migrate(){
    let v = +read(SCHEMA_KEY) || 1;
    while(v < SCHEMA){ v++; try{ MIGRATIONS[v] && MIGRATIONS[v](); }catch(e){ console.error('migration ' + v, e); } write(SCHEMA_KEY, v); }
  })();

  // a backup from an older version: bring it to the current shape before merging
  function upgradeBackup(d){
    if(!d || typeof d !== 'object' || Array.isArray(d)) return d;
    if((+d.schema || 1) < 2){ const g = d.gym || {}; setIds(g.sessions); (g.tpl || []).forEach(x => (x.exercises || []).forEach(e => { if(!e.id) e.id = newId(); })); }
    d.schema = SCHEMA; return d;
  }

  // backup = all synced data (same flat layout as before 0.6.6, plus profile, schema and the sync table)
  function snapshot(){
    const g = n => load(n, C[n][1] === 'list' ? [] : C[n][1] === 'one' ? null : {});
    flushMeta();
    return { app: 'tracker', version: VERSION, schema: SCHEMA, exportedAt: new Date().toISOString(), account: Account.current().id,
      foods: g('foods'), meals: g('meals'), supps: g('supps'), suppLog: g('suppLog'), fridge: g('fridge'), groc: g('groc'), dayLog: g('dayLog'), days: g('days'),
      targets: g('targets'), plans: g('plans'), weights: g('weights'), profile: g('profile') || {},
      gym: { custom: g('exCustom'), tpl: g('tpls') || [], plan: g('gymPlan'), sessions: g('sessions'), comeback: g('comeback') }, pet: g('pet'), combos: g('combos'), sync: M() };
  }

  return { SCHEMA, load, save, snapshot, upgradeBackup, newId, meta: M, flush: flushMeta,
    dataNames: () => Object.keys(C).filter(n => C[n][2]), deviceNames: () => Object.keys(C).filter(n => !C[n][2]) };
})();
