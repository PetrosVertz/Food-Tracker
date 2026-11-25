// Achievements: the 44 unlock rules on small fake histories (js/achievements.js). Run: node tools/ach-test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'achievements.js'), 'utf8').replace(/^const /gm, 'var ');
const g = { console, sessions: [], profile: {}, saveProfile() {}, ormList: () => [], isMainSet: s => s.type !== 'W' && s.side !== 'R' && !s.drop, Store: { load: () => null } };
vm.createContext(g); vm.runInContext(src + '\n;this.Ach = Ach;', g);
const Ach = g.Ach; let bad = 0; const fail = m => { bad++; console.log('FAIL ' + m); }, ok = m => console.log('ok   ' + m);
const INFO = { bench: { e: 'barbell', m: 'chest' }, squat: { e: 'barbell', m: 'quads' }, curl: { e: 'dumbbell', m: 'arms' }, press: { e: 'machine', m: 'chest' }, pullup: { e: 'bodyweight', m: 'back' },
  dip: { e: 'bodyweight', m: 'chest' }, row: { e: 'cable', m: 'back', uni: 1 }, lunge: { e: 'dumbbell', m: 'glutes' }, run: { e: 'machine', m: 'cardio' } };
const env = o => Object.assign({ ex: id => INFO[id] || { e: 'machine', m: 'chest' }, load: (id, w) => (INFO[id] || {}).e === 'bodyweight' ? 80 + w : w, lv: (id, w) => w, bodyW: () => 80,
  lower: m => ['quads', 'glutes', 'hamstrings'].includes(m), target: () => null, board: () => ({}) }, o);
let id = 0;
const S = (date, hhmmss, exs, o) => { const start = new Date(`${date}T${hhmmss}`).toISOString(); let at = Date.parse(start);
  return Object.assign({ id: 'w' + (++id), date, start, prs: [], vol: 0, exercises: exs.map(([exId, ...sets]) => ({ exId, sets: sets.map(([w, r, x]) => Object.assign({ w, r, done: true, at: (at += 60000) }, x || {})) })) }, o || {}); };
const run = (list, e) => Ach.scan(list, env(e));
const has = (got, k, msg) => { if (!got[k]) fail(`${msg || k}: expected ${k}, got [${Object.keys(got)}]`); };
const no = (got, k, msg) => { if (got[k]) fail(`${msg || k}: should not unlock ${k}`); };
if (Ach.IDS.length !== 44 || Ach.SECRET.size !== 13 || new Set(Ach.IDS).size !== 44) fail('catalogue must have 44 ids, 13 of them secret'); else ok('catalogue: 44 achievement ids, 13 secret');
// groundhog: 60 s qualifies, 61 s does not, exactly 7 days apart
let a = run([S('2026-03-03', '21:34:12', [['bench', [60, 5]]]), S('2026-03-10', '21:35:12', [['bench', [60, 5]]])]); has(a, 'groundhog', '60 seconds'); ok('groundhog: 60 seconds qualifies');
a = run([S('2026-03-03', '21:34:12', [['bench', [60, 5]]]), S('2026-03-10', '21:35:13', [['bench', [60, 5]]])]); no(a, 'groundhog', '61 seconds'); ok('groundhog: 61 seconds fails');
a = run([S('2026-03-03', '21:34:12', [['bench', [60, 5]]]), S('2026-03-11', '21:34:30', [['bench', [60, 5]]])]); no(a, 'groundhog', '8 days'); ok('groundhog: 8 days apart fails');
// DST (Europe/Athens switched on 2026-03-29): the same local clock time a week later still counts
a = run([S('2026-03-24', '21:34:12', [['bench', [60, 5]]]), S('2026-03-31', '21:34:57', [['bench', [60, 5]]])]); has(a, 'groundhog', 'DST'); ok('groundhog: local clock compared across a daylight-saving change');
// exactly 42 reps
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 14]], ['squat', [60, 14]], ['curl', [10, 14]]])]); has(a, 'answer_42'); ok('42 reps across three exercises unlocks');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 14]], ['squat', [60, 14]], ['curl', [10, 15]]])]); no(a, 'answer_42'); ok('43 reps does not');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 21]], ['squat', [60, 21]]])]); no(a, 'answer_42'); ok('42 reps across two exercises does not');
// counts, warm-ups ignored
a = run([S('2026-03-03', '10:00:00', [['bench', [20, 100, { type: 'W' }], [60, 5]]])]); no(a, 'one_rep'); has(a, 'press_start'); ok('warm-ups never count');
// opener (needs set times)
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 5]], ['squat', [60, 5]], ['bench', [60, 5]]])]); has(a, 'tenet'); ok('Tenet: bench, squat, bench is a palindrome in actual order');
const unordered = S('2026-03-03', '10:00:00', [['bench', [60, 5]], ['squat', [60, 5]], ['bench', [60, 5]]]); unordered.exercises.forEach(x => x.sets.forEach(s => delete s.at));
a = run([unordered]); no(a, 'tenet'); no(a, 'final_set'); ok('no set times: order rules stay locked');
// Left / Right
const lr = (l1, r1, l2, r2, w2) => S('2026-03-03', '10:00:00', [['row', [20, l1, { side: 'L', pr: 'p1' }], [20, r1, { side: 'R', pr: 'p1' }], [w2 || 20, l2, { side: 'L', pr: 'p2' }], [w2 || 20, r2, { side: 'R', pr: 'p2' }]]]);
const lr1 = lr(10, 8, 8, 10); lr1.exercises[0].uni = true; a = run([lr1]); has(a, 'other_left'); ok('The Other Left: left then right ahead, same load');
const lr2 = lr(10, 8, 8, 10, 25); lr2.exercises[0].uni = true; a = run([lr2]); no(a, 'other_left'); ok('The Other Left: different load fails');
const lr3 = lr(10, 8, 8, 10); lr3.exercises[0].uni = true; lr3.exercises[0].sets.forEach(s => { if (s.side === 'R') { s.r = ''; } }); a = run([lr3]); no(a, 'other_left'); ok('The Other Left: missing side data never unlocks');
// Same Iron / New Plate / Double Digits / Past Me
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 5]]]), S('2026-03-10', '10:00:00', [['bench', [60, 6]]])]); has(a, 'same_iron'); ok('Same Iron, New Story');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 5]]]), S('2026-03-10', '10:00:00', [['bench', [62.5, 5]]])]); has(a, 'new_plate'); ok('New Plate, Who Dis?');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 5]]]), S('2026-03-10', '10:00:00', [['bench', [60, 10]]])]); has(a, 'double_digits'); ok('Double Digits');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 8]]]), S('2026-03-10', '10:00:00', [['bench', [60, 8]]]), S('2026-03-17', '10:00:00', [['bench', [60, 8]]]), S('2026-03-24', '10:00:00', [['bench', [60, 9]]])]); has(a, 'past_me'); ok('Past Me Said No: baseline, two ties, then a beat');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 8]]]), S('2026-03-10', '10:00:00', [['bench', [60, 8]]]), S('2026-03-17', '10:00:00', [['bench', [60, 9]]])]); no(a, 'past_me'); ok('Past Me Said No: one tie is not enough');
// Comeback needs 30 full days away
a = run([S('2026-01-05', '10:00:00', [['bench', [60, 8]]]), S('2026-02-10', '10:00:00', [['bench', [60, 9]]])]); has(a, 'comeback'); ok('Called It a Comeback after 35 days');
a = run([S('2026-01-05', '10:00:00', [['bench', [60, 8]]]), S('2026-02-03', '10:00:00', [['bench', [60, 9]]])]); no(a, 'comeback'); ok('29 days away is not a comeback');
// Somehow, You Returned: 14 full days away
a = run([S('2026-01-05', '10:00:00', [['bench', [60, 8]]]), S('2026-01-20', '10:00:00', [['bench', [60, 8]]])]); has(a, 'returned'); a = run([S('2026-01-05', '10:00:00', [['bench', [60, 8]]]), S('2026-01-19', '10:00:00', [['bench', [60, 8]]])]); no(a, 'returned'); ok('Somehow, You Returned: 14 full days');
// fallback bodyweight: summit uses env.bodyW (the app's 75 kg fallback when no weight is logged)
const big = S('2026-03-03', '10:00:00', [['bench', [100, 15000]]], { vol: 1 }); a = run([big], { bodyW: () => 75 }); has(a, 'summit'); no(run([S('2026-03-03', '10:00:00', [['bench', [100, 3000]]])], { bodyW: () => 75 }), 'summit'); ok('Summit Meeting uses the Mountain Climbed estimate (bodyweight fallback)');
// pull-ups, tour, gotta rep, four elements, workout 100
a = run([S('2026-03-03', '10:00:00', [['pullup', [0, 10]]])]); has(a, 'pullups'); ok('ten pull-ups');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 5], [60, 5]]]), S('2026-03-05', '10:00:00', [['bench', [60, 5], [60, 5], [60, 5]]]), S('2026-03-07', '10:00:00', [['bench', [60, 5], [60, 5], [60, 5], [60, 5]]])]); has(a, 'tour'); has(a, 'deja'); ok('Tour of Duty and Déjà Lift');
a = run([S('2026-03-03', '10:00:00', [['bench', ...Array.from({ length: 12 }, (_, k) => [60, k + 1])]])]); has(a, 'gotta_rep'); ok('Gotta Rep Em All');
a = run([S('2026-03-03', '10:00:00', [['bench', [60, 5]], ['curl', [10, 5]], ['press', [10, 5]], ['pullup', [0, 5]]])]); has(a, 'four_elements'); ok('four equipment types in one workout');
const hundred = Array.from({ length: 100 }, (_, k) => S(new Date(Date.UTC(2026, 0, 1 + k)).toISOString().slice(0, 10), '10:00:00', [['squat', [60, 5]], ['bench', [60, 5]]])); a = run(hundred); has(a, 'gym_now'); has(a, 'know_guy'); no(a, 'summit'); ok('workout 100 + the opener of workout 1');
// idempotent + empty
if (Object.keys(run([])).length) fail('empty history must unlock nothing'); else ok('empty history unlocks nothing');
if (JSON.stringify(run(hundred)) !== JSON.stringify(run(hundred.slice().reverse()))) fail('order of the list must not matter'); else ok('same result however the list is ordered');
// Perfect Attendance only with a locked positive weekly target
const wk = []; for (let w = 0; w < 4; w++) for (let d of [0, 2]) wk.push(S(new Date(Date.UTC(2026, 2, 2 + w * 7 + d)).toISOString().slice(0, 10), '10:00:00', [['bench', [60, 5]]]));
a = run(wk, { target: () => 2 }); has(a, 'attendance'); a = run(wk, { target: () => null }); no(a, 'attendance'); a = run(wk, { target: () => 3 }); no(a, 'attendance'); ok('Perfect Attendance: needs the locked weekly target; missing target stays locked');
console.log(bad ? `\n${bad} FAILED` : '\nall achievement checks passed'); process.exit(bad ? 1 : 0);
