#!/usr/bin/env node
// RECOVERY+ regression replays on the REAL exercise catalog (not a test library): the same fresh-history workouts the brief names, finished "now".
// Prints the hours the engine gives, so a change to the dose model can be explained against the numbers before it. Not biological truth.
// Run: node tools/recovery-replay.js [--json]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, isFinite, parseFloat }; vm.createContext(ctx);
vm.runInContext(read('js/data/gym.js').replace(/^(const|let) /gm, 'var ') + '\n' + read('js/data/recovery-anatomy.js').replace(/^const /gm, 'var ') + '\n' + read('js/recovery-anatomy.js').replace(/^const /gm, 'var ') + '\n' + read('js/recovery-plus.js').replace(/^const /gm, 'var ')
  + '\n;this.X = { LIB_RAW, RecoveryCore };', ctx);
const { LIB_RAW, RecoveryCore: C } = ctx.X, NOW = Date.UTC(2026, 10, 23, 12), H = 36e5;
const ex = id => { const r = LIB_RAW.find(a => a[0] === id); if(!r) return null; const mu = {}; String(r[5]).split(' ').forEach(p => { const [h, v] = p.split(':'); mu[h] = +v; }); return { id, en: r[1], p: r[4], mu, m: r[4] === 'cardio' ? 'cardio' : 'x' }; };
const set = o => ({ done: true, w: 20, r: 12, type: 'N', ...o }), sets = (k, o) => Array.from({ length: k }, () => set(o));
const ses = (id, hoursAgo, exs) => ({ id, date: new Date(NOW - hoursAgo * H).toISOString().slice(0, 10), start: new Date(NOW - hoursAgo * H - H).toISOString(), end: new Date(NOW - hoursAgo * H).toISOString(), exercises: exs.map(([exId, s]) => ({ exId, sets: s })) });
const TR = s => C.trainingRecovery({ sessions: s, ex, loadOf: (id, w) => +w, now: NOW });
const R = {
  'biceps after 3 preacher sets to failure': TR([ses('a', 0, [['preacher', sets(3, { type: 'F', r: 10 })]])]).heads.biceps.hours,
  'side delts after 3 ordinary sets of 12': TR([ses('a', 0, [['lateral_db', sets(3)]])]).heads.delt_side.hours,
  'side delts after 12 ordinary sets of 12': TR([ses('a', 0, [['lateral_db', sets(12)]])]).heads.delt_side.hours,
};
module.exports = { R, TR, ex, set, sets, ses, C, NOW, H };
if(require.main === module){ if(process.argv.includes('--json')) console.log(JSON.stringify(R)); else Object.entries(R).forEach(([k, v]) => console.log(String(v).padStart(4) + ' h  ' + k)); }
