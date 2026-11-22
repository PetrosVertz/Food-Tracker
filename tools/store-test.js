#!/usr/bin/env node
// Store (js/platform/store.js) safety tests: failed writes, migrations, corrupt data, backups, multi-key writes.
// Runs offline in a fake browser (no Playwright). Run:  node tools/store-test.js      Exit code 1 = a data-safety rule broke.
// Each case loads a FRESH copy of store.js into its own fake localStorage, the way the app does at start-up.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(root, 'js/platform/store.js'), 'utf8');
let fails = 0, passes = 0;
const check = (cond, msg) => { if (cond) { passes++; console.log('ok    ' + msg); } else { fails++; console.log('FAIL  ' + msg); } };

// a fake localStorage: setItem can be told to fail (quota) for some keys or after n writes
function fakeStorage(init) {
  const m = new Map(Object.entries(init || {}));
  const s = {
    failKeys: new Set(), failAfter: Infinity, writes: 0,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      if (s.failKeys.has(k) || s.writes >= s.failAfter) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      s.writes++; m.set(k, String(v));
    },
    removeItem: k => { m.delete(k); },
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    dump: () => Object.fromEntries(m),
  };
  return s;
}

// load store.js into a fresh fake page; returns { Store, ls, toasts, timers }
function boot(init, opts) {
  const ls = fakeStorage(init); const toasts = []; const timers = [];
  if (opts && opts.prep) opts.prep(ls);
  const c = {
    localStorage: ls, console: { log() {}, warn() {}, error() {} }, JSON, Date, Math, Object, Array, Map, Set, String, Number, Error,
    VERSION: 'test', toast: m => toasts.push(m), t: k => k,
    setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: () => {},
    addEventListener() {}, document: { visibilityState: 'visible' },
  };
  vm.createContext(c);
  vm.runInContext(SRC + '\n;this.__S = { Store, Account };', c);
  return { Store: c.__S.Store, ls, toasts, timers, c };
}
const J = JSON.stringify;

// 1. A failed write must not mark the record as changed in the sync table (metadata follows real data only)
{
  const { Store, ls } = boot({ 'ft.schema': '2' });
  ls.failKeys.add('ft.foods.v1');
  const ok = Store.save('foods', [{ id: 'a', name: 'Rice' }]);
  check(ok === false, 'failed write: save() reports false');
  check(ls.getItem('ft.foods.v1') === null, 'failed write: nothing stored');
  const upd = (Store.meta().upd.foods || {});
  check(!upd.a, 'failed write: sync table does not claim record "a" changed');
  // and once the write works, the change IS recorded
  ls.failKeys.clear(); Store.save('foods', [{ id: 'a', name: 'Rice' }]);
  check(!!(Store.meta().upd.foods || {}).a, 'successful write after a failure: change recorded');
}
// 1b. A failed delete-by-omission must not leave a tombstone for a record that is still on disk
{
  const { Store, ls } = boot({ 'ft.schema': '2', 'ft.foods.v1': J([{ id: 'a', name: 'Rice' }, { id: 'b', name: 'Oats' }]) });
  ls.failKeys.add('ft.foods.v1');
  Store.save('foods', [{ id: 'a', name: 'Rice' }]);
  check(!(Store.meta().tomb.foods || {}).b, 'failed write: no tombstone for a record still saved');
}

// 2. A migration that throws must not advance the schema number (it must run again next start)
{
  const prep = ls => { ls.failKeys.add('ft.profile.v1'); };   // migration 2 writes the profile; make that write fail
  const { ls } = boot({ 'ft.ui.v1': J({ sex: 'm' }) }, { prep });
  const sch = ls.getItem('ft.schema');
  check(sch === null || +sch < 2, 'failed migration: schema stays below 2 (was ' + sch + ')');
  check(JSON.parse(ls.getItem('ft.ui.v1')).sex === 'm', 'failed migration: old data still where it was');
}
// 2b. A migration that succeeds advances the schema, and running it twice changes nothing
{
  const init = { 'ft.ui.v1': J({ sex: 'f', height: 170 }), 'ft.gym.sessions': J([{ start: '2026-01-01', exercises: [{ sets: [{ w: 50 }] }] }]) };
  const a = boot(init);
  check(a.ls.getItem('ft.schema') === '2', 'migration 2: schema advanced to 2');
  const pf = JSON.parse(a.ls.getItem('ft.profile.v1')); check(pf.sex === 'f' && pf.height === 170, 'migration 2: profile moved');
  const s1 = a.ls.getItem('ft.gym.sessions');
  check(!!JSON.parse(s1)[0].exercises[0].sets[0].id, 'migration 2: sets got ids');
  const d = a.ls.dump(); d['ft.schema'] = '1'; const b = boot(d);   // rerun on already-migrated data
  check(b.ls.getItem('ft.gym.sessions') === s1, 'migration 2 rerun: set ids unchanged (idempotent)');
}

// 3. Corrupt data is not the same as no data, and the original bytes are kept
{
  const raw = '[{"id":"a","name":"Rice"},{"id":"b"';   // cut off half way
  const { Store, ls } = boot({ 'ft.schema': '2', 'ft.foods.v1': raw });
  const v = Store.load('foods', []);
  check(Array.isArray(v) && v.length === 0, 'corrupt data: load() still gives the fallback so the app starts');
  const probs = Store.problems ? Store.problems() : [];
  check(probs.some(p => p.name === 'foods' && p.kind === 'corrupt'), 'corrupt data: reported by Store.problems()');
  Store.save('foods', [{ id: 'n', name: 'New' }]);
  const kept = Object.entries(ls.dump()).some(([k, x]) => k !== 'ft.foods.v1' && x === raw);
  check(kept || ls.getItem('ft.foods.v1') === raw, 'corrupt data: original bytes survive a later save');
  const snap = Store.snapshot();
  check(snap.recovery && Object.values(snap.recovery).includes(raw), 'corrupt data: original bytes included in the backup file');
}
// 3b. Data from a newer app version (schema above ours) is not "upgraded" down
{
  const { ls } = boot({ 'ft.schema': '9', 'ft.foods.v1': J([{ id: 'a', name: 'Rice' }]) });
  check(ls.getItem('ft.schema') === '9', 'newer schema on disk: number left as it is');
}

// 4. Backup: active workout, Quick Log phrases and Food Coach corrections are in the file
{
  const act = { id: 'w1', start: '2026-11-20T10:00:00Z', exercises: [{ exId: 'bench', sets: [{ id: 's1', w: 60, r: 8, done: true }] }] };
  const { Store } = boot({ 'ft.schema': '2', 'ft.gym.active': J(act), 'ft.logphr.v1': J({ 'm:eggs': 1 }), 'ft.foodfix.v1': J({ eggs: { g: 120 } }) });
  const s = Store.snapshot();
  check(s.gym && s.gym.active && s.gym.active.id === 'w1', 'backup: includes the live workout (gym.active)');
  check(s.logPhr && s.logPhr['m:eggs'] === 1, 'backup: includes Quick Log phrases (logPhr)');
  check(s.foodFix && s.foodFix.eggs, 'backup: includes Food Coach corrections (foodFix)');
  check(!('settings' in s) && !J(s).includes('geminiKey'), 'backup: no device settings or API key');
}
// 4b. A backup from a newer app version is refused, not silently downgraded
{
  const { Store } = boot({ 'ft.schema': '2' });
  const d = Store.upgradeBackup({ app: 'tracker', schema: 99, foods: [] });
  check(d && d.schema === 99 && (Store.backupTooNew ? Store.backupTooNew(d) : false), 'newer backup: kept at its own schema and flagged too new');
}

// 5. records()/save() give missing ids at ONE place (save), and the ids written are the ids in memory
{
  const { Store, ls } = boot({ 'ft.schema': '2' });
  const list = [{ name: 'Rice' }];
  Store.save('foods', list);
  const disk = JSON.parse(ls.getItem('ft.foods.v1'));
  check(!!list[0].id && disk[0].id === list[0].id, 'ids: the id given on save is the same in memory and on disk');
  const snapA = Store.snapshot(); const snapB = Store.snapshot();
  check(J(snapA.foods) === J(snapB.foods), 'ids: taking a backup twice does not invent new ids');
}

// 6. saveMany: several keys together, all or nothing
if (typeof boot({ 'ft.schema': '2' }).Store.saveMany === 'function') {
  const init = { 'ft.schema': '2', 'ft.foods.v1': J([{ id: 'a', name: 'Rice' }]), 'ft.meals.v1': J([{ id: 'm', name: 'Stew' }]) };
  {
    const { Store, ls } = boot(init);
    ls.failKeys.add('ft.meals.v1');
    const r = Store.saveMany({ foods: [{ id: 'a', name: 'Rice' }, { id: 'b', name: 'Oats' }], meals: [{ id: 'm', name: 'Stew' }, { id: 'n', name: 'Soup' }] });
    check(r === false, 'saveMany: reports false when one key fails');
    check(ls.getItem('ft.foods.v1') === init['ft.foods.v1'], 'saveMany: the key written before the failure is put back');
    check(ls.getItem('ft.meals.v1') === init['ft.meals.v1'], 'saveMany: the failed key is unchanged');
    check(!(Store.meta().upd.foods || {}).b, 'saveMany: sync table untouched after a failed group');
    check(ls.getItem('ft.journal.v1') === null, 'saveMany: no journal left after a clean roll-back');
  }
  {
    const { Store, ls } = boot(init);
    const r = Store.saveMany({ foods: [{ id: 'a', name: 'Rice' }, { id: 'b', name: 'Oats' }], meals: [] });
    check(r === true && JSON.parse(ls.getItem('ft.foods.v1')).length === 2 && JSON.parse(ls.getItem('ft.meals.v1')).length === 0, 'saveMany: writes every key on success (an empty list stays an empty list)');
    check(!!(Store.meta().upd.foods || {}).b && !!(Store.meta().tomb.meals || {}).m, 'saveMany: sync table records changes and deletions on success');
    check(ls.getItem('ft.journal.v1') === null, 'saveMany: journal removed on success');
  }
  {
    // the app was closed half way: journal on disk, foods already new, meals not yet → next start puts both back
    const half = Object.assign({}, init, { 'ft.foods.v1': J([{ id: 'a' }, { id: 'b' }]), 'ft.journal.v1': J({ at: 1, old: { 'ft.foods.v1': init['ft.foods.v1'], 'ft.meals.v1': init['ft.meals.v1'] } }) });
    const { ls, Store } = boot(half);
    check(ls.getItem('ft.foods.v1') === init['ft.foods.v1'] && ls.getItem('ft.journal.v1') === null, 'interrupted saveMany: next start restores the old data and clears the journal');
    check(Store.problems().some(p => p.kind === 'rolledBack'), 'interrupted saveMany: reported as rolled back');
  }
  {
    // a key that did not exist before is removed again by the roll-back
    const { Store, ls } = boot({ 'ft.schema': '2' });
    ls.failKeys.add('ft.meals.v1');
    Store.saveMany({ foods: [{ id: 'a', name: 'Rice' }], meals: [{ id: 'm' }] });
    check(ls.getItem('ft.foods.v1') === null, 'saveMany roll-back: a key that was absent is absent again');
  }
} else check(false, 'saveMany: Store.saveMany() does not exist (multi-key writes cannot be all-or-nothing)');

// 7. Import planner (js/platform/backup.js): pure, idempotent, skips bad records, never replaces a live workout
{
  const BSRC = fs.readFileSync(path.join(root, 'js/platform/backup.js'), 'utf8');
  const { c } = boot({ 'ft.schema': '2' });
  c.normFood = f => Object.assign({ unit: 'g' }, f);
  vm.runInContext(BSRC + '\n;this.__B = Backup;', c);
  const B = c.__B;
  const empty = () => ({ foods: [], meals: [], supps: [], suppLog: {}, fridge: [], groc: [], dayLog: {}, days: {}, plans: {}, targets: null, weights: {}, combos: [], logPhr: {}, foodFix: {}, profile: {}, sessions: [], tpls: [], exCustom: [], gymPlan: {}, active: null });
  const file = {
    app: 'tracker', schema: 2,
    foods: [{ id: 'f1', name: 'Rice', updatedAt: '2026-01-01' }, { name: 'Old Oats' }, { name: '<img src=x onerror=alert(1)>' }, 'junk', { id: 'f9' }],
    dayLog: { '2026-11-01': [{ id: 'e1', food: 'f1', g: 100 }, { food: 'f1', g: 50 }], 'not-a-date': [{ id: 'z' }] },
    weights: { '2026-11-01': 80, 'bad': 1 },
    gym: { sessions: [{ id: 's1', start: '2026-11-01T10:00:00Z', exercises: [] }, { start: '2026-10-01T10:00:00Z', exercises: [] }, { id: 's3', exercises: [] }],
      active: { id: 'w9', start: '2026-11-21T10:00:00Z', exercises: [{ exId: 'bench', sets: [] }] } },
    logPhr: { 'm:eggs': 1 }, foodFix: { eggs: { g: 120 } },
  };
  const cur = empty(); const before = J(cur);
  const p1 = B.plan(cur, JSON.parse(J(file)));
  check(J(cur) === before, 'import plan: the live data passed in is not changed');
  check(p1.ok && p1.next.foods.length === 3 && p1.added === 3, 'import plan: good foods added, non-objects and nameless foods skipped (' + p1.next.foods.length + ')');
  check(p1.next.foods.some(f => f.name === '<img src=x onerror=alert(1)>'), 'import plan: odd text is kept as plain text (the screen escapes it)');
  check(p1.next.dayLog['2026-11-01'].length === 2 && !p1.next.dayLog['not-a-date'], 'import plan: diary entries added, non-date days skipped');
  check(!('bad' in p1.next.weights), 'import plan: weigh-ins on non-dates skipped');
  check(p1.next.sessions.length === 2 && p1.next.sessions[0].start < p1.next.sessions[1].start, 'import plan: sessions without a start time skipped (no crash), rest sorted');
  check(p1.activeRestored && p1.next.active.id === 'w9', 'import plan: live workout restored when this phone has none');
  check(p1.next.logPhr['m:eggs'] === 1 && p1.next.foodFix.eggs.g === 120, 'import plan: Quick Log phrases and Food Coach corrections imported');
  // the same file again, on top of the result: nothing new, nothing to write
  const p2 = B.plan(p1.next, JSON.parse(J(file)));
  check(p2.ok && p2.added === 0 && p2.changed.length === 0, 'import twice: nothing added, nothing to save (changed: ' + p2.changed.join(',') + ')');
  // a live workout on this phone is never replaced
  const mine = empty(); mine.active = { id: 'mine', start: '2026-11-22T09:00:00Z', exercises: [] };
  const p3 = B.plan(mine, JSON.parse(J(file)));
  check(p3.next.active.id === 'mine' && !p3.activeRestored && p3.activeSkipped, 'import: your live workout is kept, the file\'s is skipped');
  // a backup's live workout that was finished since (it is in sessions) is not brought back
  const done = empty(); done.sessions = [{ id: 'w9', start: '2026-11-21T10:00:00Z', exercises: [] }];
  check(!B.plan(done, JSON.parse(J(file))).activeRestored, 'import: a live workout already finished is not restored');
  // newer updatedAt wins, older does not
  const have = empty(); have.foods = [{ id: 'f1', name: 'Rice', kcal: 1, updatedAt: '2026-06-01' }];
  const p4 = B.plan(have, { foods: [{ id: 'f1', name: 'Rice', kcal: 2, updatedAt: '2026-01-01' }] });
  check(p4.next.foods[0].kcal === 1 && p4.updated === 0, 'import: an older copy does not replace yours');
  const p5 = B.plan(have, { foods: [{ id: 'f1', name: 'Rice', kcal: 3, updatedAt: '2026-09-01' }] });
  check(p5.next.foods[0].kcal === 3 && p5.updated === 1, 'import: a newer copy replaces yours');
  check(!B.plan(empty(), { schema: 99, foods: [] }).ok && B.plan(empty(), { schema: 99, foods: [] }).reason === 'tooNew', 'import: a backup from a newer app version is refused');
  check(!B.plan(empty(), { hello: 1 }).ok, 'import: a file without a food list is refused');
  // round trip: snapshot → plan into an empty phone → same data
  const { Store: S2 } = boot({ 'ft.schema': '2', 'ft.foods.v1': J([{ id: 'a', name: 'Rice' }]), 'ft.gym.sessions': J([{ id: 's', start: '2026-01-01', exercises: [] }]), 'ft.log.v1': J({ '2026-01-01': [{ id: 'e', g: 1 }] }) });
  const back = B.plan(empty(), JSON.parse(J(S2.snapshot())));
  check(back.ok && back.next.foods[0].id === 'a' && back.next.sessions[0].id === 's' && back.next.dayLog['2026-01-01'][0].id === 'e', 'backup round trip: foods, sessions and diary come back with the same ids');
}

console.log(fails ? `\n${fails} store problem(s), ${passes} ok.` : `\nAll ${passes} store checks passed.`);
process.exit(fails ? 1 : 0);
