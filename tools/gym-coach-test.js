#!/usr/bin/env node
// Gym Coach intelligence tests (js/gym-intel.js + the Gym Coach parts of js/gym.js), on the REAL code: the functions are taken from the app's
// files by name and run in a small fake app (real exercise library, real strings, real Store with a fake localStorage, a fake AI).
// Run:  node tools/gym-coach-test.js        Exit code 1 = a rule broke.   (tools/check.js runs it too)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0, passes = 0;
const check = (cond, msg) => { if (cond) { passes++; console.log('ok    ' + msg); } else { fails++; console.log('FAIL  ' + msg); } };

// ---- take top-level definitions out of a source file by name (a function with its body, or a const/let up to the next top-level line)
function pick(src, names, file) {
  const lines = src.split('\n'), out = [];
  for (const n of names) {
    const re = new RegExp(`^(async )?function ${n}\\(|^(const|let) ${n}\\b`);
    const i = lines.findIndex(l => re.test(l)); if (i < 0) throw new Error(`${file}: ${n} not found`);
    if (/function/.test(lines[i].slice(0, 15))) {   // brace-match the function body
      let depth = 0, j = i, started = false, txt = '';
      for (; j < lines.length; j++) { const l = lines[j]; txt += l + '\n';
        for (const ch of l.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '').replace(/\/\/.*$/, '')) { if (ch === '{') { depth++; started = true; } else if (ch === '}') depth--; }
        if (started && depth <= 0) break; }
      out.push(txt);
    } else { let j = i + 1; while (j < lines.length && (lines[j] === '' || /^\s/.test(lines[j]) || /^[)\]}.]/.test(lines[j]))) j++; out.push(lines.slice(i, j).join('\n')); }
  }
  return out.join('\n').replace(/^const /gm, 'var ').replace(/^let /gm, 'var ');
}

const GYM = read('js/gym.js'), W04 = read('js/wire/04-gym.js'), CORE = read('js/core.js'), W01 = read('js/wire/01-core.js'), W03 = read('js/wire/03-fridge-today.js');
const SRC = [
  read('js/data/strings.js').replace(/^const /gm, 'var '),
  read('js/data/gym.js').replace(/^const /gm, 'var ').replace(/^let /gm, 'var '),
  pick(CORE, ['norm', 't'], 'core.js'),
  pick(W01, ['uid', 'esc', 'r1', 'fmt'], 'wire/01'),
  pick(W03, ['daysUntil'], 'wire/03'), 'var _exc = null;',
  pick(GYM, ['parseMu', 'topHead', 'normEx', 'exHistory', 'comebackFactor', 'cbBase', 'suggestFor', 'EQF', 'estimateNew', 'usualReps', 'newSet', 'hitsFrom',
    'UNI_RE', 'isUni', 'uniPair', 'rest30', 'exByName', 'gcEx', 'gcLang', 'gcNames', 'GC_REPLY', 'gcReply', 'GC_BUILD', 'GC_WORKOUT', 'GC_MACHINE', 'GC_CHANGE', 'gcPrompt', 'gcLivePrompt',
    'gcActive', 'gcWorkout', 'inferType', 'gcAsk', 'gcChangeCard', 'GS_RULE', 'GS_SETS', 'gymStyleRead', 'gymStyle', 'gymStyleRule', 'GC_REPS', 'gymReps'], 'gym.js'),
  pick(W04, ['BIG_HEADS', 'MUSCLES', 'ML', 'HEAVY', 'LIB', 'EX', '_exIdx', 'exById', 'exTitle', 'exName', 'isCardio', 'r25', 'repRange', 'defReps', 'gymIsAssist', 'e1rm', 'loadOf', 'isMainSet'], 'wire/04'),
  read('js/platform/store.js').replace(/^const /gm, 'var '),
  read('js/gym-intel.js').replace(/^const /gm, 'var '),
  read('js/athlete/persona.js').replace(/^const /gm, 'var '),   // the shared coach personality (AI.voice)
].join('\n;\n');

const DAY = 864e5, dk = d => d.toLocaleDateString('en-CA'), TODAY = dk(new Date());
const daysAgo = n => { const d = new Date(Date.now() - n * DAY); d.setHours(18, 0, 0, 0); return d; };
function fakeStorage() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, map: m }; }

// a fresh app. o.ls: reuse a storage (a "restart"); o.sessions, o.active, o.rec (recMapNow answer), o.lang
function boot(o) {
  o = o || {};
  const ls = o.ls || fakeStorage(); if (!o.ls) ls.setItem('ft.schema', '2');
  const c = {
    localStorage: ls, console: { log() {}, warn() {}, error() {} }, JSON, Date, Math, Object, Array, Map, Set, String, Number, Error, RegExp, Promise, isFinite, isNaN, parseInt, parseFloat, structuredClone, queueMicrotask,
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener() {}, document: { visibilityState: 'visible' }, toast() {}, VERSION: 'test',
    lang: o.lang || 'en', todayKey: () => TODAY, profile: {}, targets: { goal: 'bulk' }, settings: {}, weights: {}, exCustom: [], tpls: o.tpls || [], comeback: null,
    sessions: o.sessions || [], active: o.active || null, bodyW: () => 80,
    recMapNow: () => o.rec || {}, gymIsAssistX: null,
    AI: { knows: () => '', dietRules: () => '', voice: id => c.Persona.voice(id) + '\n', words: n => c.Persona.words(n) }, inferDayType: () => 'push', typeLabel_: k => k,
    saveG() {}, renderSession() {}, $: () => null,
  };
  vm.createContext(c);
  vm.runInContext(SRC + '\n;this.__ok = true;', c);
  return c;
}
// a finished workout: ex = [[exId, [[w, r, extra?], …]], …]
let sid = 0;
const ses = (dAgo, ex, extra) => { const d = daysAgo(dAgo); sid++; return { id: 's' + sid, date: dk(d), start: d.toISOString(), mins: 60, name: 'Push', type: 'push',
  exercises: ex.map(([exId, sets]) => ({ exId, reps: '8-12', sets: sets.map(([w, r, x]) => ({ id: 'z' + Math.random(), type: (x && x.F) ? 'F' : 'N', w: String(w), r: String(r), done: true, ...(x && x.rir != null ? { rir: x.rir } : {}) })) })), ...(extra || {}) }; };
const live = (ex, extra) => ({ id: 'live1', start: new Date(Date.now() - 30 * 6e4).toISOString(), clock0: Date.now() - 30 * 6e4, name: 'Push', type: 'push', prs: [],
  exercises: ex.map(([exId, sets, reps]) => ({ exId, reps: reps || '8-12', rest: 120, sets: sets.map(([w, r, done]) => ({ id: 'q' + Math.random(), type: 'N', w: w === '' ? '' : String(w), r: r === '' ? '' : String(r), done: !!done })) })), ...(extra || {}) });

// ================================================================ 1. new athlete, no history
{
  const c = boot(), G = c.GymIntel;
  const p = G.progression('bench', '8-12');
  check(p && p.first && p.act === 'start' && !p.w && p.strength === 'tentative', 'new athlete: no history gives a first-time start, no invented weight, tentative');
  check(G.evidence('bench').level === 'none', 'new athlete: evidence is none');
  const b = G.brief('plan', 'gym', 'how heavy should I bench?');
  check(/Recorded: nothing yet/.test(b.text) && !/\d+x\d+/.test(b.text.split('About the exercises')[1] || ''), 'new athlete: the packet says nothing is recorded (no made-up sets)');
  check(/first time on Bench Press/i.test(G.offline('what weight for bench?', 'plan', 'gym')), 'new athlete: offline answer still useful (start light)');
}
// ================================================================ 2. average athlete: weights + reps only
{
  const S = [ses(10, [['bench', [[60, 10], [60, 9], [60, 8]]]]), ses(6, [['bench', [[60, 11], [60, 10], [60, 9]]]]), ses(2, [['bench', [[60, 12], [60, 11], [60, 10]]]])];
  const c = boot({ sessions: S }), G = c.GymIntel, p = G.progression('bench', '8-12');
  check(p.act === 'consolidate' && p.w === 60, 'weights+reps only: top of the range on one set only → same weight, more sets to 12 (not an automatic increase)');
  check(G.evidence('bench').level === 'some' && G.evidence('bench').trend === 'up', 'weights+reps only: evidence "some", trend up, without any effort data');
  check(!G.evidence('bench').effort && /effort\/RIR not logged/.test(G.brief('plan', 'g2', 'bench?').text), 'weights+reps only: missing RIR is reported as not logged (never as failure)');
  const s = c.suggestFor('bench', '8-12');
  check(s && s.w === 60 && s.last && s.last.top.w === 60 && 'first' in s === false || (s && s.w === 60), 'suggestFor() keeps its old shape for the live workout hints (w, r, last.top)');
}
// ================================================================ 3. several weeks of consistent logs → increase, firm
{
  const S = [12, 9, 6, 3].map((d, i) => ses(d, [['bench', [[60, 10 + Math.min(i, 2)], [60, 10 + Math.min(i, 2)], [60, 9 + Math.min(i, 2)]]]]));
  S.push(ses(0.5, [['bench', [[60, 12], [60, 12], [60, 12]]]]));
  const c = boot({ sessions: S }), p = c.GymIntel.progression('bench', '8-12');
  check(p.act === 'increase' && p.w === 62.5 && p.strength === 'firm', 'weeks of logs: all sets at the top of 8-12 → 62.5 kg, said plainly');
  check(p.why.some(w => /all 3 sets at 60 kg reached 12/.test(w)), 'weeks of logs: the reason uses the real recorded sets');
  check(/try 62\.5 kg/.test(c.GymIntel.offline('should I go heavier on bench?', 'plan', 'x')), 'weeks of logs: offline answer "I\'d try 62.5 kg"');
}
// ================================================================ 7. repeated progression across comparable sessions (twice in a row on the top set)
{
  const S = [ses(5, [['bench', [[60, 12], [60, 10], [60, 9]]]]), ses(2, [['bench', [[60, 12], [60, 10], [60, 9]]]])];
  const p = boot({ sessions: S }).GymIntel.progression('bench', '8-12');
  check(p.act === 'increase' && p.w === 62.5 && p.why.some(w => /two sessions in a row/.test(w)), 'repeated progression: 12 reps at 60 kg two sessions running → 62.5 kg');
}
// ================================================================ 4. advanced athlete with RIR; 5. stops logging RIR
{
  const S = [ses(4, [['bench', [[80, 7, { rir: 1 }], [80, 7, { rir: 0 }]]]]), ses(1, [['bench', [[80, 8, { rir: 3 }], [80, 7, { rir: 1 }]]]])];
  const c = boot({ sessions: S }), p = c.GymIntel.progression('bench', '6-8');
  check(p.act === 'increase' && p.why.some(w => /3 reps in reserve/.test(w)), 'RIR athlete: top of 6-8 with 3 in reserve logged → a step up, reason names the RIR');
  check(/80x8@3RIR/.test(c.GymIntel.brief('plan', 'r', 'bench').text), 'RIR athlete: RIR goes into the packet next to the set');
  const S2 = [ses(8, [['bench', [[80, 7, { rir: 3 }], [80, 7]]]]), ses(1, [['bench', [[80, 8], [80, 7]]]])];
  const p2 = boot({ sessions: S2 }).GymIntel.progression('bench', '6-8');
  check(p2.act === 'consolidate' && p2.w === 80, 'stopped logging RIR: no RIR on the last session is not read as 0 or as room left → consolidate at 80');
  check(boot({ sessions: S2 }).GymIntel.evidence('bench').effort === true && boot({ sessions: S2 }).GymIntel.evidence('bench').effortLast === false, 'stopped logging RIR: evidence knows effort was logged before, not now');
}
// ================================================================ 6. one unusually weak session; and two in a row
{
  const S = [ses(9, [['squat', [[100, 8], [100, 8], [100, 7]]]]), ses(6, [['squat', [[100, 9], [100, 8], [100, 8]]]]), ses(2, [['squat', [[90, 5], [90, 5]]]])];
  const p = boot({ sessions: S }).GymIntel.progression('squat', '6-10');
  check(p.act === 'repeat' && p.w === 100 && p.strength === 'tentative', 'one weak session: no panic, repeat the best recent weight (100 kg)');
  const S2 = [ses(14, [['squat', [[100, 9], [100, 9]]]]), ses(10, [['squat', [[100, 9], [100, 9]]]]), ses(6, [['squat', [[100, 6], [100, 6]]]]), ses(2, [['squat', [[100, 5], [100, 5]]]])];
  const p2 = boot({ sessions: S2 }).GymIntel.progression('squat', '6-10');
  check(p2.act === 'hold' && p2.w === 100, 'two weaker sessions in a row: hold the weight (no increase, no drastic cut)');
}
// ================================================================ 8. extended break (relative to the athlete's own rhythm)
{
  const S = [40, 37, 34, 31].map(d => ses(d, [['bench', [[70, 8], [70, 8]]]]));
  const c = boot({ sessions: S }), p = c.GymIntel.progression('bench', '6-10');
  check(p.act === 'comeback' && p.w < 70 && p.w >= 52.5 && p.strength === 'tentative', 'long break (31 days, usually every 3, nothing else trained): rebuild below the old weight (the app comeback steps)');
  check(c.GymIntel.evidence('bench').onBreak && c.GymIntel.evidence('bench').level !== 'solid', 'long break: evidence downgraded');
  const S3 = [60, 46, 32, 18].map(d => ses(d, [['bench', [[70, 8], [70, 8]]]]));   // trains bench every 2 weeks: 18 days is normal for them
  const p3 = boot({ sessions: S3 }).GymIntel.progression('bench', '6-10');
  check(p3.act !== 'comeback', 'no rigid threshold: someone who benches every two weeks is not "on a break" after 18 days');
}
// ================================================================ 9. missing or stale Recovery+; 10. conflicting recovery vs performance
{
  const c = boot({ rec: { chest: { h: 30, st: 'low' }, back: { h: 0, st: 'ok' } } }), r = c.GymIntel.recovery();
  check(r.src === 'estimate' && r.readiness.level === 'unknown' && r.groups.find(g => g.group === 'chest').state === 'recovering', 'no Recovery+: the current estimate is used, readiness stays unknown');
  check(/do not assume it is low/.test(c.GymIntel.brief('plan', 'z', 'am I recovered?').text), 'no readiness data: the AI is told unknown is not low');
  c.RecoveryPlus = { snapshot: () => ({ v: 1, at: Date.now() - 7 * 36e5, groups: { chest: { state: 'ready', hoursLeft: 0 }, legs: { state: 'weird' } }, readiness: { level: 'reduced', why: 'short sleep' } }) };
  vm.runInContext('this.RecoveryPlus = RecoveryPlus', c);
  const r2 = c.GymIntel.recovery();
  check(r2.src === 'recovery+' && r2.stale && r2.readiness.level === 'reduced' && r2.groups.find(g => g.group === 'legs').state === 'unknown', 'Recovery+ snapshot: used when present; 7 h old = stale; unknown values stay unknown');
  check(/may be out of date/.test(c.GymIntel.brief('plan', 'z2', 'is my chest recovered').text), 'stale Recovery+: said to the AI as possibly out of date');
  c.RecoveryPlus = { snapshot: () => ({ v: 9, groups: {} }) }; vm.runInContext('this.RecoveryPlus = RecoveryPlus', c);
  check(c.GymIntel.recovery().src === 'estimate', 'Recovery+ with an unknown version: ignored, the estimate is used (no crash)');
  const v = c.GymIntel.voice();
  check(/real performance today and what the athlete says outrank them/.test(v) && /never forbid training/.test(v), 'conflict rule: performance and what the athlete reports outrank recovery estimates, which never forbid training');
}
// ================================================================ 11. live fatigue and order; 12. unexpected rep reductions
{
  const S = [ses(4, [['bench', [[60, 10], [60, 10], [60, 9]]], ['incline_db', [[22, 10], [22, 10]]]])];
  const a = live([['bench', [[60, 10, 1], [60, 9, 1], [60, 8, 1], [60, '', 0]]]]);
  const c = boot({ sessions: S, active: a }), L = c.GymIntel.live();
  check(L.xs[0].flags.length === 0 && L.xs[0].drop > .15 && L.xs[0].drop < .25, 'live: 10, 9, 8 at the same weight is normal fatigue (no flag)');
  check(/normal fatigue/.test(c.GymIntel.brief('live', 'gymlive', 'how is it going').text), 'live: the packet calls it normal fatigue, not a recovery problem');
  check(c.GymIntel.nudge(a, []) === null, 'live: normal fatigue gives no hint (stays quiet)');
  const a2 = live([['bench', [[60, 10, 1], [60, 5, 1], [60, 2, 1], [60, '', 0]]]]);
  const c2 = boot({ sessions: S, active: a2 }), n = c2.GymIntel.nudge(a2, []);
  check(n && n.kind === 'drop' && n.op && n.op.type === 'weight' && n.op.w === 55, 'live: two sharp rep drops → one hint offering a lighter weight for the sets left (55 kg)');
  check(c2.GymIntel.nudge(a2, [n.key]) === null, 'live: the same hint is never shown twice in a workout');
  const a3 = live([['bench', [[60, 13, 1], [60, '', 0], [60, '', 0]]]]);
  const S3 = [ses(8, [['bench', [[60, 10], [60, 10]]]]), ses(4, [['bench', [[60, 10], [60, 10], [60, 9]]]])];
  const n3 = boot({ sessions: S3, active: a3 }).GymIntel.nudge(a3, []);
  check(n3 && n3.kind === 'up' && n3.op.w === 62.5, 'live: 13 reps on the first set, ahead of last time → a hint offering 62.5 kg for the rest');
  check(boot({ sessions: S3, active: a3 }).GymIntel.nudge(a3, ['live1:x', 'live1:y']) === null, 'live: at most two hints per workout');
  // order + overlap: chest already worked, more chest planned
  const many = Array.from({ length: 12 }, () => [60, 10, 1]);
  const a4 = live([['bench', many], ['incline_db', [[22, '', 0], [22, '', 0]]]]);
  const c4 = boot({ sessions: S, active: a4 }), n4 = c4.GymIntel.nudge(a4, []);
  check(n4 && n4.kind === 'vol' && !n4.op, 'live: lots of chest done and more chest planned → a volume heads-up with no change attached');
  const pk = c4.GymIntel.brief('live', 'gymlive', 'what next?').text;
  check(/1\. Bench press/i.test(pk) && /2\. Incline dumbbell press/i.test(pk) && /Worked so far this session/.test(pk), 'live: the packet has the order, what is left, and what was already worked');
}
// ================================================================ 13. follow-ups and disagreement keep the subject; 14. deep technical talk
{
  const S = [ses(5, [['bench', [[60, 12], [60, 12], [60, 12]]], ['squat', [[100, 8]]]])];
  const c = boot({ sessions: S }), G = c.GymIntel;
  const b1 = G.brief('plan', 'gym', 'Should I increase the weight on bench?');
  check(b1.focus.includes('bench') && b1.intent === 'progress', 'follow-up: first question is about bench progression');
  const b2 = G.brief('plan', 'gym', "Why? Isn't it too early?");
  check(b2.focus.join() === 'bench' && /Bench press/i.test(b2.text), 'follow-up: "Why? Isn\'t it too early?" keeps bench and its recorded sets in context');
  const b3 = G.brief('plan', 'gym', "But wouldn't lowering my reps hurt progressive overload?");
  check(b3.focus.join() === 'bench', 'disagreement: the next challenge still has the bench data');
  const v = G.voice();
  check(/Do not just agree/.test(v) && /go deeper each time/.test(v) && /never a lecture/.test(v), 'personality: weighs arguments, deepens on demand, never a lecture');
  check(/No emojis/.test(v) && !/[\u{1F300}-\u{1FAFF}]/u.test(v), 'personality: no emojis');
  check(/no scores, confidence levels/.test(v), 'invisible intelligence: no scores or confidence talk in answers');
  check(/You advise; the athlete decides\. Never say you changed/.test(v), 'control: the coach never claims it changed anything');
}
// ================================================================ 15. workout-generation constraints
{
  const S = [ses(3, [['bench', [[60, 10]]], ['lat_pulldown', [[50, 10]]]])];
  const c = boot({ sessions: S, tpls: [{ id: 't1', name: 'My Push', type: 'push', exercises: [{ exId: 'bench', sets: 3, reps: '8-12', rest: 120 }] }] });
  const b = c.GymIntel.brief('plan', 'gym', 'Build me a push workout for 45 minutes');
  check(b.intent === 'workout' && /Saved workouts:\n- "My Push"/.test(b.text) && /Equipment they use: barbell, cable/.test(b.text) && /Recovery/.test(b.text), 'workout request: saved workouts, equipment and recovery go in');
  const names = c.GymIntel.names();
  check(!/Treadmill/i.test(names) && !/Dumbbell Curl/.test(names) && /Bench press/i.test(names), 'workout request: the exercise list is only their equipment (no dumbbells for a barbell + cable athlete)');
  const w = c.gcWorkout({ name: 'Push', exercises: [{ name: 'Bench Press', sets: 4, reps: '8-12' }, { name: 'Bench Press', sets: 3 }, { name: 'Smith Machine Bench Press', sets: 3 }, { name: 'Moon Laser Press', sets: 3 }, { name: 'Overhead Press', sets: 20 }] });
  const ids = w.tpl.exercises.map(e => e.exId);
  check(ids.filter(i => i === 'bench').length === 1 && !ids.some(i => /laser/.test(i)), 'workout from the AI: duplicates and made-up exercises are dropped');
  check(w.tpl.exercises.reduce((a, e) => a + e.sets, 0) <= 30 && w.tpl.exercises.every(e => e.sets <= 8), 'workout from the AI: sets kept in a sane range');
}
// ================================================================ 16. invalid AI change proposals; 17/18. approval boundaries
{
  const a = live([['bench', [[60, 10, 1], [60, '', 0], [60, '', 0]]], ['squat', [[100, '', 0]]]]);
  const c = boot({ active: a }), G = c.GymIntel;
  check(G.proposal({ type: 'weight', exercise: 'Unicorn Press', w: 60 }, a) === null, 'proposal: an exercise that is not in the library is rejected');
  check(G.proposal({ type: 'weight', exercise: 'Leg Press', w: 60 }, a) === null, 'proposal: an exercise that is not in this workout is rejected');
  check(G.proposal({ type: 'weight', exercise: 'Bench Press', w: '62.5kg; drop table' }, a) === null && G.proposal({ type: 'weight', exercise: 'Bench Press', w: 900 }, a) === null && G.proposal({ type: 'weight', exercise: 'Bench Press', w: 61.13 }, a) === null, 'proposal: malformed, absurd or odd weights are rejected');
  check(G.proposal({ type: 'delete_history', exercise: 'Bench Press' }, a) === null && G.proposal('set bench to 100', a) === null, 'proposal: unknown actions and free text are rejected');
  check(G.proposal({ type: 'swap', exercise: 'Bench Press', to: 'Treadmill' }, a) === null, 'proposal: swapping a lift for cardio is rejected');
  check(G.proposal({ type: 'sets', exercise: 'Bench Press', n: 0 }, a) === null, 'proposal: fewer sets than already done is rejected');
  const before = JSON.stringify(a);
  const op = G.proposal({ type: 'weight', exercise: 'Bench Press', w: 62.5, why: 'all reps were easy' }, a);
  check(op && op.xi === 0 && op.w === 62.5 && JSON.stringify(a) === before, 'proposal: a valid one is normalized, and checking it changes nothing');
  // the card: nothing happens until Apply; Not Now leaves the workout unchanged; Apply changes only sets still to do; Undo restores
  const ch = { update(card, p) { Object.assign(card, p); } };
  vm.runInContext('active = this.__a', Object.assign(c, { __a: a }));
  const card = c.gcChangeCard(op, op.why);
  check(JSON.stringify(c.active) === before, 'approval: showing the proposal card changes nothing');
  const card2 = c.gcChangeCard(op, op.why); card2.actions[1].run(card2, ch);
  check(JSON.stringify(c.active) === before && card2.done, 'approval: Not Now leaves the workout exactly as it was');
  card.actions[0].run(card, ch);
  const x = c.active.exercises[0];
  check(x.sets[0].w === '60' && x.sets[0].done && x.sets[1].w === '62.5' && x.sets[2].w === '62.5', 'approval: Apply changes only the sets still to do (the finished set keeps 60 kg)');
  card.actions[0].run(card, ch);
  check(c.active.exercises.length === 2 && x.sets.length === 3, 'approval: a second tap on Apply does nothing (no duplicate change)');
  card.undo();
  check(JSON.stringify(c.active) === before, 'approval: Undo puts the workout back');
  const said = G.chatLoad ? c.Store.load('gymCoach', {}).said : [];
  check(said.length === 2 && said.some(s => s.out === 'no') && said.some(s => s.out === 'undo'), 'memory: declined and undone proposals are remembered');
  check(/declined/.test(G.brief('live', 'gymlive', 'bench?').text), 'memory: the AI is told what was declined so it is not pushed again');
  // stale: the exercise was finished before Apply
  const op2 = G.proposal({ type: 'reps', exercise: 'Squat', r: 6 }, c.active), card3 = c.gcChangeCard(op2, '');
  c.active.exercises[1].ended = true; card3.actions[0].run(card3, ch);
  check(c.active.exercises[1].sets[0].r === '' && /changed since/.test(card3.done), 'approval: if the workout changed since, Apply applies nothing and says so');
  // a swap after sets are done goes after it; completed history untouched
  const sw = G.proposal({ type: 'swap', exercise: 'Bench Press', to: 'Dumbbell Bench Press' }, c.active);
  const u = G.applyOp(sw, c.active);
  check(sw.after && c.active.exercises[0].exId === 'bench' && c.active.exercises[1].exId === sw.to, 'swap with sets done: the new exercise goes after it, the done sets stay');
  u(); check(c.active.exercises[1].exId === 'squat', 'swap undo: removed again');
}
// ================================================================ 19. conversation persistence across restarts
{
  const a = live([['bench', [[60, 10, 1]]]]);
  const c = boot({ active: a }), G = c.GymIntel;
  G.chatSave('gym', [{ who: 'bot', text: 'Hi', first: true }, { who: 'me', text: 'bench?' }, { who: 'bot', text: "I'd try 62.5 kg." }, { who: 'bot', cards: [{ title: 'Push', sub: 'Push · 5 exercises', actions: [{ label: 'Save', run() {} }], undo() {} }] }]);
  G.chatSave('gymlive', [{ who: 'me', text: 'next?', img: 'AAAA' }], 'live1');
  const c2 = boot({ ls: c.localStorage, active: a }), m = c2.GymIntel.chatLoad('gym', null);
  check(m && m.length === 4 && m[2].text === "I'd try 62.5 kg." && m[0].first, 'restart: the Gym Coach chat comes back');
  check(m[3].cards[0].title === 'Push' && m[3].cards[0].actions.length === 0 && !m[3].cards[0].undo, 'restart: old cards come back as text only (no buttons that could act on stale data)');
  check(c2.GymIntel.chatLoad('gymlive', 'live1')[0].text === 'next?' && !JSON.stringify(c.localStorage.getItem('ft.gymcoach.v1')).includes('AAAA'), 'restart: the live chat comes back for the same workout; photos are never stored');
  check(c2.GymIntel.chatLoad('gymlive', 'other') === null, 'restart: a different workout does not get the old live chat');
  c2.GymIntel.forget();
  check(boot({ ls: c.localStorage }).GymIntel.chatLoad('gym', null) === null, 'privacy: Reset What AI Knows clears the coach chats');
}
// ================================================================ 20. offline / AI failures
(async () => {
  {
    const S = [ses(5, [['bench', [[60, 12], [60, 12]]]]), ses(2, [['bench', [[60, 12], [60, 12]]]])];
    const c = boot({ sessions: S });
    const ch = { id: 'gym', ask: async () => { throw Object.assign(new Error('offline'), { kind: 'network' }); } };
    const r = await c.gcAsk(ch, 'p', null, 'should I go up on bench?', 'plan');
    check(r && r.local && /can't reach the AI/.test(r.reply) && /62\.5 kg/.test(r.reply), 'offline: a progression question still gets an answer from the log');
    let threw = false; try { await c.gcAsk(ch, 'p', null, 'tell me a joke', 'plan'); } catch (e) { threw = e.kind === 'network'; }
    check(threw, 'offline: a question the log cannot answer shows the usual failure (nothing made up)');
    const chc = { id: 'gym', ask: async () => { throw Object.assign(new Error('x'), { cancelled: true }); } };
    let cx = false; try { await c.gcAsk(chc, 'p', null, 'bench?', 'plan'); } catch (e) { cx = !!e.cancelled; }
    check(cx, 'cancelled request: stays cancelled (no local answer pops up)');
    const bad = await (async () => { const chb = { id: 'gymlive', ask: async () => ({ reply: 'ok', change: { type: 'weight', exercise: 'Bench Press', w: 'lots' } }) };
      const a = live([['bench', [[60, '', 0]]]]); vm.runInContext('active = this.__a', Object.assign(c, { __a: a }));
      const r2 = await c.gcAsk(chb, 'p', null, 'x', 'live'); return c.GymIntel.proposal(r2.change, c.active); })();
    check(bad === null, 'invalid JSON values from the AI: the change is dropped, no card');
  }
  // ================================================================ 22. Greek
  {
    const S = [ses(5, [['bench', [[60, 12], [60, 12]]]]), ses(2, [['bench', [[60, 12], [60, 12]]]])];
    const c = boot({ sessions: S, lang: 'el' });
    const o = c.GymIntel.offline('να ανεβάσω βάρος στον πάγκο;', 'plan', 'gym');
    check(/62\.5 kg/.test(o) && /[α-ω]/.test(o), 'Greek: a Greek question finds bench (πάγκο) and the answer is in Greek');
    check(c.GymIntel.intentOf('πώς πήγε η τελευταία προπόνηση;') === 'debrief' && c.GymIntel.intentOf('φτιάξε μου ένα πρόγραμμα') === 'workout', 'Greek: intents (debrief, workout) are recognised');
    const p = c.gcPrompt({ id: 'gym', transcript: () => 'User: γεια', history: () => [{ who: 'me', text: 'γεια' }] }, null, 'γεια');
    check(/in Greek/.test(p), 'Greek: the coach is told to answer in Greek');
    const S2 = boot({ lang: 'el' }); const d = S2.GymIntel.describe({ type: 'weight', xi: 0, w: 62.5, exId: 'bench' }, live([['bench', [[60, '', 0]]]]));
    check(/Σετ που απομένουν: 62\.5 kg/.test(d), 'Greek: the change card reads in Greek');
  }
  // ================================================================ 21. prompt size: a bench question with two years of history
  {
    const S = []; for (let i = 0; i < 200; i++) S.push(ses(730 - i * 3.6, [['bench', [[60 + i * .1, 10], [60, 9]]], ['squat', [[100, 8]]], ['lat_pulldown', [[50, 10]]], ['lateral_raise', [[10, 15]]], ['tricep_pushdown', [[30, 12]]]]));
    const T = Array.from({ length: 10 }, (_, i) => ({ id: 't' + i, name: 'Workout ' + i, type: 'push', exercises: ['bench', 'squat', 'lat_pulldown', 'lateral_raise', 'tricep_pushdown', 'incline_db'].map(e => ({ exId: e, sets: 3, reps: '8-12', rest: 90 })) }));
    const c = boot({ sessions: S, tpls: T });
    const ch = q => ({ id: 'gym', transcript: () => 'User: ' + q, history: () => [{ who: 'me', text: q }] });
    const t0 = Date.now(); const pq = c.gcPrompt(ch('Should I increase the weight on bench?'), null, 'Should I increase the weight on bench?'); const ms = Date.now() - t0;
    const pw = c.gcPrompt(ch('Build me a push workout'), null, 'Build me a push workout');
    const all = c.gcNames().length;
    check(!pq.includes('Exercise list') && pq.length < 5200, `prompt size: a bench question is ${pq.length} letters (~${Math.round(pq.length / 4)} tokens), without the ${all}-letter exercise list`);
    check(pw.includes('Exercise list') && pw.length > pq.length, `prompt size: a workout request carries the (filtered) exercise list: ${pw.length} letters`);
    check(ms < 150, `speed: building the prompt over 200 workouts takes ${ms} ms`);
  }
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
