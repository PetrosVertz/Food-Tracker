#!/usr/bin/env node
// Exercise Picker V27 · your own exercises (js/excustom.js) and their QR codes (js/gym-share.js): pure checks, no browser.
// Run: node tools/expick-test.js   (also run by tools/check.js)
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');

function run(){
  const c = { console }; vm.createContext(c);
  vm.runInContext(read('js/data/gym.js') + '\n' + read('js/excustom.js') + '\n' + read('js/gym-share.js')
    + '\n;this.__X = { cxTitle, cxClean, cxRecord, cxSig, cxPack, cxUnpack, cxAdopt, cxRestore, cxMu, wkPack, wkUnpack, EXM, CX_MUSCLES, HEADS };', c);
  const X = c.__X, bad = []; let n = 0;
  const eq = (got, want, what) => { n++; if(JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
  const yes = (v, what) => { n++; if(!v) bad.push(what); };

  // 1. Title Case is stored, any input casing, hyphens, Greek, apostrophes, spaces
  eq(X.cxTitle('sINGLE-aRM CABLE PRESS'), 'Single-Arm Cable Press', 'title: mixed case + hyphen');
  eq(X.cxTitle('farmer\'s walk'), 'Farmer\'s Walk', 'title: apostrophe stays inside the word');
  eq(X.cxTitle('ΠΙΕΣΕΙΣ ΠΑΓΚΟΥ με αλτήρες'), 'Πιεσεις Παγκου Με Αλτήρες', 'title: Greek (final sigma kept)');
  eq(X.cxTitle('πιεσεις-ωμων'), 'Πιεσεις-Ωμων', 'title: Greek with hyphen');
  eq(X.cxTitle('1-arm db row (incline)'), '1-Arm Db Row (Incline)', 'title: digits and brackets');
  eq(X.cxClean('  lat   pull\tdown  '), 'Lat Pull Down', 'clean: spaces collapse');
  eq(X.cxClean('x'.repeat(80)).length, 60, 'clean: 60 characters at most');

  // 2. a record: needs name, a known muscle and equipment; equipment is never guessed
  yes(X.cxRecord({ name: 'Thing', mus: ['chest'], heads: [] }) === null, 'record without equipment is refused (no default Dumbbell)');
  yes(X.cxRecord({ name: '', mus: ['chest'], e: 'cable' }) === null, 'record without a name is refused');
  yes(X.cxRecord({ name: 'Thing', mus: ['nope'], e: 'cable' }) === null, 'record with no known muscle is refused');
  const r = X.cxRecord({ name: 'sINGLE-aRM CABLE PRESS', mus: ['chest', 'triceps'], heads: ['chest_upper', 'lats'], e: 'cable', uni: true }, 'c_1');
  eq([r.en, r.el, r.e, r.uni, r.custom, r.est, r.mus, r.heads], ['Single-Arm Cable Press', 'Single-Arm Cable Press', 'cable', true, true, true, ['chest', 'triceps'], ['chest_upper']], 'record fields (a head of a muscle not chosen is dropped)');
  eq(r.mu, { chest_upper: 60, triceps: 40 }, 'record work split: primary 60, the rest 40');
  eq([r.h, r.m], ['chest_upper', 'chest'], 'record main head and group (older code reads these)');
  eq(X.cxMu(['back'], []), { lats: 25, upper_back: 25, traps: 25, lower_back: 25 }, 'All heads = every head of the muscle');

  // 3. same exercise = same name (any case) + same details; different details stay apart
  const list = [];
  const a = X.cxAdopt(list, { name: 'cable press', mus: ['chest'], heads: [], e: 'cable' }, () => 'c_a');
  const b = X.cxAdopt(list, { name: 'CABLE   PRESS', mus: ['chest'], heads: [], e: 'cable' }, () => 'c_b');
  const d = X.cxAdopt(list, { name: 'Cable Press', mus: ['chest'], heads: [], e: 'band' }, () => 'c_d');
  eq([a.added, b.added, b.id, d.added, list.length], [true, false, 'c_a', true, 2], 'dedupe: same reused, different equipment kept apart');
  const old = { id: 'c_old', en: 'Sled Push', el: 'Sled Push', e: 'machine', h: 'quads', m: 'quads', mu: { quads: 100 }, custom: true };
  eq(X.cxSig(old), X.cxSig({ name: 'sled push', mus: ['quads'], heads: [], e: 'machine' }), 'an older one-head record compares like the new kind');

  // 4. restore: names shown in Title Case, nothing else touched, junk dropped
  const rs = X.cxRestore([{ id: 'c_1', en: 'bad CASE', el: 'bad CASE', e: 'band', h: 'biceps', mu: { biceps: 100 }, custom: true, rest: 75 }, null, { en: 'no id' }]);
  eq([rs.length, rs[0].en, rs[0].el, rs[0].rest, rs[0].e], [1, 'Bad Case', 'Bad Case', 75, 'band'], 'restore');

  // 5. one exercise by QR: round trip, limits, newer and broken codes
  const code = X.cxPack(r); const back = X.cxUnpack(code);
  eq(back.spec, { name: 'Single-Arm Cable Press', e: 'cable', uni: true, mus: ['chest', 'triceps'], heads: ['chest_upper'] }, 'GX1 round trip');
  eq(X.cxUnpack(X.cxPack({ en: 'Push, ~ Pull; 50%', e: 'band', mus: ['back'], heads: [] })).spec.name, 'Push, ~ Pull; 50%', 'GX1 keeps % ~ ; , in the name');
  yes(X.cxUnpack('GX2~whatever').newer, 'a newer exercise code says so');
  ['', 'hello', 'GX1~a~cable~1~chest', 'GX1~a~sword~1~chest~', 'GX1~a~cable~2~chest~', 'GX1~a~cable~1~chest.chest~', 'GX1~a~cable~1~chest~lats', 'GX1~~cable~1~chest~',
    'GX1~' + 'a'.repeat(700) + '~cable~1~chest~', 'GX1~<script>~cable~1~nope~'].forEach(s => yes(X.cxUnpack(s).error, 'broken exercise code refused: ' + s.slice(0, 30)));

  // 6. workout codes: own exercises carry their V27 details, older readers still see the first five fields, GB1 still reads
  const tpl = { name: 'Push', type: 'push', exercises: [{ exId: 'bench', sets: 3, reps: '8', rest: 120 }, { exId: 'c_1', sets: 2, reps: '12', rest: 60 }] };
  const wk = X.wkPack(tpl, id => id === 'c_1' ? r : null), u = X.wkUnpack(wk);
  yes(wk.startsWith('GB1~'), 'workout code stays version 1');
  eq([u.own[0].en, u.own[0].h, u.own[0].e, u.own[0].mus, u.own[0].heads, u.own[0].uni], ['Single-Arm Cable Press', 'chest_upper', 'cable', ['chest', 'triceps'], ['chest_upper'], true], 'own exercise details travel in the workout code');
  const own = wk.split('~')[4].split(',');
  eq(own.slice(0, 5), ['Single-Arm Cable Press', 'chest_upper', 'cable', 'press_h', '90'], 'older apps read the same first five fields');
  const v1 = X.wkUnpack('GB1~legs~Leg Day~squat,5,5,180;!0,3,12,60~Sled%2C Push,quads,machine,press_h,120');
  eq([v1.own[0].en, v1.own[0].h, v1.own[0].mus], ['Sled, Push', 'quads', undefined], 'an old GB1 code reads as before');
  return { tests: n, bad };
}
module.exports = { run };
if(require.main === module){ const r = run(); r.bad.forEach(b => console.log('FAIL  ' + b)); console.log(`${r.tests - r.bad.length}/${r.tests} checks pass`); process.exit(r.bad.length ? 1 : 0); }
