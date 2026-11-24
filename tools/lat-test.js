#!/usr/bin/env node
// Left / Right + load convention checks (pure, no browser): every built-in exercise is covered by the reviewed table, the table says what the brief says
// for the named exercises, and the shared conversion / pair handling in js/gym-lat.js gives equal volume for equal work.   Run: node tools/lat-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0, n = 0; const ok = (c, m) => { n++; if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const ctx = { console, Math, JSON, Date, Set, Object, Array, Number, String, isFinite, parseFloat }; vm.createContext(ctx);
vm.runInContext(read('js/data/gym.js').replace(/^const /gm, 'var ') + '\n' + read('js/data/gym-lat.js').replace(/^const /gm, 'var ') + '\n' + read('js/gym-lat.js').replace(/^const /gm, 'var ') + '\n;this.G = { LIB_RAW, LAT, Lat };', ctx);
const { LIB_RAW, LAT, Lat } = ctx.G, EQN = { b: 'barbell', d: 'dumbbell', m: 'machine', c: 'cable', w: 'bodyweight', k: 'kettlebell', e: 'band' };
const ex = id => { const r = LIB_RAW.find(a => a[0] === id); return r ? { id, en: r[1], e: EQN[r[3]], m: r[4] === 'cardio' ? 'cardio' : 'x' } : null; };

// 1. coverage
const ids = LIB_RAW.map(a => a[0]);
ok(ids.length === 326 && new Set(ids).size === 326, '326 built-in exercises, unique ids');
ok(ids.every(i => Array.isArray(LAT[i]) && LAT[i].length === 7), 'every built-in id has a reviewed entry (mode, load, n, rp, unit, alt, note)');
ok(Object.keys(LAT).every(i => ids.includes(i)), 'no entry for an id that does not exist');
ok(Object.values(LAT).every(a => ['P', 'C'].includes(a[0]) && ['hand', 'bar', 'stack', 'bw', 'band', 'none'].includes(a[1]) && [1, 2].includes(a[2]) && ['both', 'side'].includes(a[3]) && ['reps', 'sec', 'min'].includes(a[4])), 'every entry uses only known values');
ok(Object.values(LAT).filter(a => a[0] === 'P').every(a => a[3] === 'side' || a[5] === 1), 'a paired default either counts reps per side or asks together / alternating');
const doc = read('docs/gym-lateral-inventory.md'); ok(ids.every(i => doc.includes('| ' + i + ' |')), 'the inventory document lists every id');

// 2. the brief's named exercises
const P = i => Lat.defaultPaired(i, ex(i));
const wantP = 'meadows_row kroc_row preacher_db cross_body_hammer alt_db_curl front_raise lateral_db seated_lateral lean_lateral bent_over_lateral db_curl seated_db_curl incline_curl hammer_curl bulgarian lunges step_up pistol_squat concentration kickback suitcase_carry cossack step_down donkey_kick fire_hydrant clamshell band_hip_abduction band_adduction cable_abduction cable_adduction side_plank copenhagen pallof pallof_hold woodchop side_bend btb_cable_lateral bayesian_curl cross_body_ext landmine_press hk_landmine_press kb_press kb_row kb_clean kb_snatch kb_windmill kb_tgu single_arm_cable_lateral db_row'.split(' ');
ok(wantP.every(P), 'every exercise the brief names opens as Left / Right rows' + wantP.filter(i => !P(i)).join(','));
ok(['db_bench', 'goblet', 'mountain_climber', 'bench', 'squat', 'leg_press', 'lat_pulldown', 'russian_twist', 'cable_fly', 'db_shoulder'].every(i => !P(i)), 'bilateral / shared-bar / machine / continuous drills stay one row');
ok(Lat.canPair('meadows_row', ex('meadows_row')) && !Lat.canPair('bench', ex('bench')) && !Lat.canPair('run', ex('run')), 'barbell Meadows row keeps the L | R control; a bench press and cardio do not get one');
ok(P('cable_lateral') && LAT.cable_lateral[6].startsWith('AMBIGUOUS') && LAT.bulgarian[6].startsWith('AMBIGUOUS'), 'unresolved setups are flagged AMBIGUOUS, not guessed silently');
ok(LAT.side_plank[4] === 'sec' && LAT.pallof_hold[4] === 'sec' && LAT.copenhagen[4] === 'sec', 'side holds are recorded as time');
ok(Lat.defaultPaired('c_x', { custom: true, uni: true }) && !Lat.defaultPaired('c_y', { custom: true, uni: false }) && !Lat.defaultPaired('c_z', { custom: true }), 'custom exercises keep their creator\'s choice (no name guessing)');
ok(LAT.lateral_db[5] === 1 && LAT.db_curl[5] === 1 && LAT.lunges[5] === 0, 'raises / curls ask together vs alternating; lunges do not');

// 3. the worked conversions (same actual external volume however it is logged)
const loadOf = (id, w) => +w || 0, X = (o) => ({ exId: 'x', ...o }), S = (w, r, extra) => ({ w: String(w), r: String(r), done: true, type: 'N', ...extra });
const V = (x, sets) => sets.reduce((a, s) => a + Lat.volume(x, s, loadOf), 0);
const cvSim = { l: 'hand', n: 2, rp: 'both' }, cvTot = { l: 'total', n: 2, rp: 'both' };
ok(V(X({ cv: cvSim }), [S(20, 12)]) === 480, 'two 20 kg dumbbells raised together x 12 = 480 kg (20 per hand x 2 bells)');
ok(V(X({ cv: cvTot }), [S(40, 12)]) === 480, 'the same set typed as 40 kg total x 12 = 480 kg');
ok(V(X({ cv: cvSim, uni: true }), [S(20, 12, { side: 'L' }), S(20, 12, { side: 'R' })]) === 480, 'the same set as Left 20 x 12 and Right 20 x 12 = 480 kg');
ok(V(X({ cv: { l: 'stack', n: 1, rp: 'side' } }), [S(20, 12)]) === 480, 'single-handle cable, equal each side: 20 per side x 12 each = 480 kg');
ok(V(X({ cv: { l: 'hand', n: 1, rp: 'side' } }), [S(20, 12)]) === 480, 'alternating curl, 20 kg bell, 12 each side = 480 kg');
ok(V(X({ cv: { l: 'hand', n: 2, rp: 'side' } }), [S(10, 12)]) === 480, 'split squat, two 10 kg bells, 12 per leg: 20 kg moved x 12 x 2 legs = 480 kg');
ok(V(X({ cv: { l: 'hand', n: 2, rp: 'side' }, uni: true }), [S(10, 12, { side: 'L' }), S(10, 12, { side: 'R' })]) === 480, 'the same split squat as Left and Right rows = 480 kg, still two logical rows');
ok(V(X({ cv: { l: 'bar', n: 1, rp: 'both' } }), [S(100, 5)]) === 500, 'a shared bar keeps its total (100 x 5)');
ok(V(X({}), [S(20, 12)]) === 240 && Lat.unitW(X({}), S(20, 12)) === 20, 'an old set with no convention keeps its old meaning (w x r), never reinterpreted');
ok(Lat.unitW(X({ cv: cvTot }), S(40, 12)) === 20 && Lat.unitW(X({ cv: cvSim }), S(20, 12)) === 20, 'records / progression see 20 per implement for both entries');
ok(Lat.basis(X({ cv: cvSim }), S(20, 12), loadOf) === 240, 'record volume is like-for-like with old history (20 x 12), not doubled');
ok(V(X({ cv: cvSim }), [S(20, 12, { done: false })].filter(s => s.done)) === 0, 'an unfinished set adds no volume');

// 4. pairs, layout round trip, drops
const mk = (o) => ({ id: 'x', exId: 'db_curl', uni: false, cv: { ...cvSim }, sets: [], ...o });
let x = mk({ sets: [S(20, 12), S(22.5, 10)] });
Lat.makeUni(x, true); ok(x.sets.length === 4 && x.sets[0].side === 'L' && x.sets[1].side === 'R' && x.sets[0].pr === x.sets[1].pr && x.sets[0].pr !== x.sets[2].pr, 'compact to Left / Right: two sets become two pairs, each with its own pair id');
ok(x.sets[1].w === '20' && x.sets[1].r === '12' && x.sets[1].done, 'the right row carries the same recorded values');
const before = JSON.stringify([x.sets.map(s => [s.w, s.r, s.done])]); Lat.makeUni(x, false);
ok(x.sets.length === 2 && x.sets[0].w === '20' && x.sets[1].w === '22.5' && !x.sets[0].side, 'matched pairs merge back into the same compact sets');
Lat.makeUni(x, true); ok(JSON.stringify([x.sets.map(s => [s.w, s.r, s.done])]) === before, 'round trip compact -> rows -> compact -> rows is lossless');
// unequal sides never merge
x = mk({ uni: true, sets: Lat.newPair('N', () => 'u' + Math.random()) }); x.sets.forEach((s, i) => { s.w = i ? '16' : '20'; s.r = '10'; s.done = true; });
Lat.makeUni(x, false); ok(x.sets.length === 2 && x.sets[0].side === 'L' && x.sets[1].w === '16', 'unequal weights stay as their own rows (nothing lost)');
x = mk({ uni: true, sets: Lat.newPair('N', () => 'u' + Math.random()) }); x.sets.forEach(s => { s.w = '20'; s.r = '10'; s.done = true; }); x.sets[1].rir = 1; x.sets[1].hr = 2;
Lat.makeUni(x, false); ok(x.sets.length === 2, 'a different RIR / half reps on one side keeps the pair as rows');
x = mk({ uni: true, sets: Lat.newPair('N', () => 'u' + Math.random()) }); x.sets[0].w = x.sets[1].w = '20'; x.sets[0].r = x.sets[1].r = '10'; x.sets[0].done = true;
Lat.makeUni(x, false); ok(x.sets.length === 2, 'a half-finished pair stays as rows');
x = mk({ uni: true, sets: Lat.newPair('N', () => 'u' + Math.random()) }); x.sets[0].w = x.sets[1].w = '20'; x.sets[0].r = x.sets[1].r = '10'; x.sets[0].done = true; x.sets[1].skip = true;
Lat.makeUni(x, false); ok(x.sets.length === 2 && x.sets[1].skip, 'a side that was not done is not invented on compact');
// a typed total survives rows and back exactly
x = mk({ cv: { ...cvTot }, sets: [S(41, 12)] }); Lat.makeUni(x, true);
ok(x.cv.l === 'hand' && x.sets[0].w === '20.5' && x.sets[1].w === '20.5' && V(x, x.sets) === 41 * 12, 'total 41 x 12 becomes 20.5 + 20.5 rows with the same 492 kg');
Lat.makeUni(x, false); ok(x.cv.l === 'total' && x.sets.length === 1 && x.sets[0].w === '41', 'and merges back to total 41');
// drop pairs: an inserted drop cannot detach a mate
x = mk({ uni: true, sets: [...Lat.newPair('N', () => 'a' + Math.random()), ...Lat.newPair('N', () => 'b' + Math.random())] });
const [L1, R1, L2, R2] = x.sets, dp = Lat.newPair('D', () => 'd' + Math.random(), true); x.sets.splice(2, 0, ...dp);
ok(Lat.mate(x, 0) === 1 && Lat.mate(x, 1) === 0 && Lat.mate(x, 2) === 3 && Lat.mate(x, 4) === 5, 'after a drop pair is inserted every row still finds its own mate by pair id');
ok(x.sets[2].drop && x.sets[3].drop && x.sets[2].pr !== x.sets[0].pr, 'the drop pair has its own pair id');
// legacy rows (L, R, no pair id) get ids without changing values
x = mk({ uni: true, sets: [{ id: 'l', side: 'L', w: '20', r: '10', done: false, type: 'N' }, { id: 'r', side: 'R', w: '', r: '', done: false, type: 'N' }] });
Lat.ensurePairs(x); ok(x.sets[0].pr && x.sets[0].pr === x.sets[1].pr && x.sets[0].w === '20', 'old Left / Right rows are tagged as a pair without touching a value');
// options
ok(Lat.options(mk({ exId: 'lateral_db' })).length === 3 && Lat.options(mk({ exId: 'bench', cv: { l: 'bar', n: 1, rp: 'both' } })).length === 0, 'the load chip offers choices only where the setup is really ambiguous');
console.log(`\n${n - fails}/${n} lateral checks pass`); process.exit(fails ? 1 : 0);
