#!/usr/bin/env node
// Change #12 / #13 tests: weekly workout streak, Streak Savers, Consistency Challenge (js/streak.js) and Stats pins + 24-hour rotation (js/profile.js).
// Runs offline in Node (no browser). Run:  node tools/streak-test.js      Exit code 1 = a rule broke.
// Calendar used below (2026): Mondays are 2 Nov, 9 Nov, 16 Nov, 23 Nov, 30 Nov, 7 Dec … 28 Dec; 4 Jan 2027 is a Monday.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0, passes = 0;
const check = (cond, msg) => { if (cond) { passes++; console.log('ok    ' + msg); } else { fails++; console.log('FAIL  ' + msg); } };
const J = JSON.stringify;

// the pure engine (no app globals)
const E = (() => { const c = { console }; vm.createContext(c); vm.runInContext(read('js/streak.js') + '\n;this.__S = Streak;', c); return c.__S; })();
const days = (...list) => new Set(list.flat());
const range = (from, n) => Array.from({ length: n }, (_, i) => E.add(from, i));
const rec = (o = {}) => Object.assign({ v: 1, since: '2026-11-02', epoch: '2026-11-02', base: 0, best: 0, plan: [['', 3]], tg: {} }, o);
const run = (d, r, today) => E.compute(d, rec(r), today);

// ---------- streak calculation ----------
{
  let v = run(days('2026-11-03', '2026-11-05', '2026-11-07'), {}, '2026-11-09');
  check(v.last.o === 'ok' && v.total === 3, 'three required, three completed: success, +3');
  v = run(days('2026-11-02', '2026-11-03', '2026-11-05', '2026-11-08'), {}, '2026-11-09');
  check(v.last.o === 'ok' && v.total === 4, 'three required, four completed: success, +4 (extras count)');
  // a saver is used in week 1, so week 2 has none left (one regular saver per month)
  v = run(days('2026-11-03', '2026-11-05', '2026-11-10', '2026-11-12'), { base: 10 }, '2026-11-16');
  check(v.weeks[0].o === 'saved' && v.weeks[1].o === 'fail' && v.total === 0, 'three required, two completed, no saver left: failure, streak reset');
  v = run(days('2026-11-03', '2026-11-05'), { base: 10 }, '2026-11-09');
  check(v.last.o === 'saved' && v.total === 10 && v.last.pts === 0, 'three required, two completed, saver held: protected, no points added');
  v = run(days('2026-11-03'), { base: 10 }, '2026-11-09');
  check(v.last.o === 'fail' && v.total === 0 && v.savers.log.every(s => !s.used), 'three required, one completed: failure despite a saver (saver kept)');
  v = run(days(), { base: 5, plan: [['', 1]] }, '2026-11-09');
  check(v.last.o === 'fail' && v.total === 0 && v.savers.log.every(s => !s.used), 'one required, zero completed: failure despite a saver');
  const ses = [{ date: '2026-11-03', exercises: [] }, { date: '2026-11-03', exercises: [] }, { date: '2026-11-05', exercises: [] }];
  check(E.qualDays(ses).size === 2, 'two workouts on the same day count as one qualifying day');
  v = run(E.qualDays(ses.concat({ date: '2026-11-07', exercises: [] })), {}, '2026-11-09');
  check(v.total === 3, 'double day + two more days: 3 points, not 4');
  v = run(days('2026-11-02', '2026-11-04', '2026-11-06', '2026-11-08'), {}, '2026-11-09');
  check(v.total === 4, 'four workouts on four different days count as four');
  // the spec's table: 3/3, 4/3, 3/3, then 2/3 with this month's saver already gone
  v = run(days(range('2026-11-02', 3), range('2026-11-09', 4), range('2026-11-16', 3)), {}, '2026-11-23');
  check(J(v.weeks.map(w => w.after)) === '[3,7,10]', 'accumulates across successful weeks: 3, 7, 10');
  v = run(days(range('2026-11-02', 3), range('2026-11-09', 2), range('2026-11-16', 3), range('2026-11-23', 2)), {}, '2026-11-30');
  check(J(v.weeks.map(w => w.o + w.after)) === '["ok3","saved3","ok6","fail0"]', 'protected week keeps 3, next success 6, an unprotected miss resets to 0');
  // F6 example: 15, protected (2/3), then 4/3 → 19
  v = run(days(range('2026-11-02', 2), range('2026-11-09', 4)), { base: 15 }, '2026-11-16');
  check(v.weeks[0].after === 15 && v.total === 19, 'saver keeps 15 (the protected week\'s 2 workouts earn nothing), next week +4 = 19');
  check(v.best === 19, 'personal best follows the highest total');
  v = run(days(), { base: 3, best: 40 }, '2026-11-16');
  check(v.best === 40 && v.total === 0, 'personal best is kept when the streak resets');
}

// ---------- planner: locked at Monday, all-rest weeks ----------
{
  const plan = [['', 3], ['2026-11-04', 5]];
  check(E.planTarget(plan, '2026-11-02') === 3 && E.planTarget(plan, '2026-11-09') === 5, 'planner changed on Wednesday: this week stays 3, next Monday 5');
  check(E.planTarget([['', 3], ['2026-11-09', 5]], '2026-11-09') === 3, 'a change made ON Monday applies from the following Monday');
  let v = run(days(range('2026-11-02', 3), range('2026-11-09', 4)), { plan }, '2026-11-16');
  check(v.weeks[0].t === 3 && v.weeks[0].o === 'ok' && v.weeks[1].t === 5 && v.weeks[1].o !== 'ok', 'week 1 judged on 3, week 2 on 5');
  v = run(days(range('2026-11-02', 3), range('2026-11-09', 4)), { plan, tg: { '2026-11-09': 4 } }, '2026-11-16');
  check(v.weeks[1].t === 4 && v.weeks[1].o === 'ok', 'a locked week target wins over the planner log');
  // all rest from next Monday: no goal, no points, nothing lost, no saver
  const off = [['', 3], ['2026-11-05', 0], ['2026-11-12', 3]];
  v = run(days(range('2026-11-02', 3), '2026-11-10'), { plan: off, base: 0 }, '2026-11-16');
  check(v.weeks[1].o === 'off' && v.weeks[1].after === 3 && v.savers.log.every(s => !s.used), 'all-rest week: tracking off, streak kept, no saver used, the workout earns nothing');
  check(v.state !== 'off' && v.week.target === 3, 'tracking resumes the Monday after the planner has Gym Days again');
  v = run(days('2026-11-03'), { plan: [['', 3], ['2026-11-04', 0]], base: 8 }, '2026-11-09');
  check(v.weeks[0].o === 'fail' && v.total === 0, 'switching to all-rest midweek does not rescue the failing week');
  v = run(days(), { plan: [['', 0]] }, '2026-11-05');
  check(v.state === 'off' && !v.on, 'an all-rest planner shows tracking as off, not a 0-workout failure');
}

// ---------- this week: warnings, early reset, never too early ----------
{
  // target 3, one workout by Friday, Saturday open: still possible (last chance = today and tomorrow both needed)
  let v = run(days(range('2026-11-02', 3), '2026-11-10'), {}, '2026-11-14');
  check(v.state === 'last' && v.week.need === 2 && v.total === 3, 'two needed, Saturday + Sunday left, not trained today: "last chance"');
  // this month's saver already used for week 1 → Sunday morning with 1/3: unreachable, nothing can protect → early reset
  v = run(days(range('2026-11-02', 2), '2026-11-10'), { base: 10 }, '2026-11-15');
  check(v.state === 'reset' && v.total === 0 && v.kept === 10, 'goal out of reach with no saver: early reset (shows 0)');
  // same day, saver still held → no early reset: 2 workouts would be protected
  v = run(days(range('2026-11-02', 3), '2026-11-10'), { base: 10 }, '2026-11-15');
  check(v.state === 'saver' && v.total === 13 && v.week.saverNeed === 1, 'no premature reset while a saver could still protect the week');
  v = run(days(range('2026-11-02', 3), '2026-11-10', '2026-11-11'), { base: 10 }, '2026-11-15');
  check(v.state === 'on' || v.state === 'last', 'two done, Sunday left, target 3: still reachable');
  v = run(days(range('2026-11-02', 3), '2026-11-10', '2026-11-11'), { base: 10 }, '2026-11-16');
  check(v.last.o === 'saved' && v.total === 13, 'Sunday passes with 2/3: the saver is used automatically');
  v = run(days(range('2026-11-02', 3), range('2026-11-09', 2)), {}, '2026-11-12');
  check(v.state === 'on' && v.week.need === 1, 'one more needed with days to spare');
  check(E.notices(v).some(n => n.kind === 'one'), 'warning: "one more workout keeps your streak alive"');
  v = run(days(range('2026-11-02', 3), range('2026-11-09', 2), '2026-11-15'), {}, '2026-11-15');
  check(v.state === 'met' && v.total === 3 && v.week.done === 3, 'late-night workout on Sunday (saved under Sunday) meets the goal; points wait for the week to end');
  v = run(days(range('2026-11-02', 3), range('2026-11-09', 3), '2026-11-15'), {}, '2026-11-16');
  check(v.total === 7, 'the week finalizes on Monday with every qualifying day (+4)');
  // notices: once-only keys, the lost streak is named
  v = run(days(range('2026-11-02', 2), '2026-11-10'), { base: 10 }, '2026-11-15');
  const n1 = E.notices(v); check(n1.some(n => n.kind === 'lost' && n.key === 'lost:2026-11-09'), 'early reset gives one "streak lost" message for that week');
  const v2 = run(days(range('2026-11-02', 2), '2026-11-10'), { base: 10 }, '2026-11-16');
  check(E.notices(v2).filter(n => n.kind === 'lost').every(n => n.key === 'lost:2026-11-09'), 'the end-of-week reset of that week uses the same key (not said twice)');
  check(!E.notices(run(days(), { plan: [['', 0]] }, '2026-11-05')).length, 'tracking off: no warnings');
}

// ---------- Streak Savers ----------
{
  let v = run(days(), {}, '2027-01-10');
  const regs = v.savers.log.filter(s => s.kind === 'r');
  check(J(regs.map(s => s.month)) === '["2026-11","2026-12","2027-01"]', 'one regular saver per month, from the month streaks started');
  v = run(days(range('2026-11-02', 5), range('2026-11-09', 5)), {}, '2026-11-14');
  check(v.bonus['2026-11'] && v.bonus['2026-11'].at === '2026-11-13' && v.savers.n === 2, 'bonus saver after the 10th workout day across two calendar weeks (5 + 5); two held');
  v = run(days(range('2026-11-02', 4), range('2026-11-09', 6)), {}, '2026-11-15');
  check(!!v.bonus['2026-11'], 'bonus with 4 + 6');
  v = run(days(range('2026-11-04', 6), range('2026-11-10', 4)), {}, '2026-11-15');
  check(!!v.bonus['2026-11'] && v.bonus['2026-11'].at === '2026-11-13', 'bonus with 6 + 4 (ten distinct days)');
  v = run(days(range('2026-11-02', 5), range('2026-11-09', 4)), {}, '2026-11-16');
  check(!v.bonus['2026-11'] && v.savers.n === 1, 'nine qualifying days do not earn the bonus');
  v = run(E.qualDays([...range('2026-11-02', 5), ...range('2026-11-09', 4), '2026-11-12'].map(date => ({ date, exercises: [] }))), {}, '2026-11-16');
  check(!v.bonus['2026-11'], 'two workouts on one day do not count twice toward the challenge');
  // a rolling 14 days that is not a Monday-start pair: Wed 4 Nov → Tue 17 Nov, 10 days, but no calendar pair has 10
  v = run(days(range('2026-11-05', 4), range('2026-11-09', 3), range('2026-11-16', 3)), {}, '2026-11-22');
  check(!v.bonus['2026-11'], 'the challenge uses Monday–Sunday week pairs, not a rolling 14 days');
  v = run(days(range('2026-11-02', 5), range('2026-11-09', 5), range('2026-11-16', 5), range('2026-11-23', 5)), {}, '2026-11-29');
  check(Object.keys(v.bonus).length === 1 && v.savers.log.filter(s => s.kind === 'b').length === 1, 'at most one bonus saver per month (second achievement in the same month gives nothing)');
  v = run(days(range('2026-11-16', 5), range('2026-11-23', 5), range('2026-11-30', 7)), {}, '2026-12-07');
  check(v.bonus['2026-11'] && !v.bonus['2026-12'], 'an achievement never pays twice: weeks used by a bonus do not start the next pair');
  v = run(days(range('2026-11-02', 3), range('2026-11-09', 2)), { base: 6 }, '2026-11-16');
  check(v.savers.log.filter(s => s.used).length === 1, 'exactly one saver used for one failed week');
  check(v.savers.log.every(s => s.used === null || s.kind === 'r'), 'the regular saver is used first');
  // inventory never above two
  let maxHeld = 0; for (let d = '2026-11-02'; d <= '2027-02-28'; d = E.add(d, 1)) { const x = run(days(range('2026-11-02', 120)), {}, d); maxHeld = Math.max(maxHeld, x.savers.n); }
  check(maxHeld === 2, 'never more than two savers held (checked every day for 4 months of daily training)');
  // expiry: November's savers are gone in December and cannot protect a December week
  v = run(days(range('2026-11-02', 3)), {}, '2026-12-01');
  check(v.savers.held.every(s => s.at.startsWith('2026-12')) && v.savers.n === 1, 'unused November saver expires at month end; December brings one new one');
  // week Mon 30 Nov – Sun 6 Dec, 2/3: belongs to December (its Sunday), uses December's saver; next miss in December has none (November's is expired)
  v = run(days(range('2026-11-23', 3), '2026-11-30', '2026-12-02', '2026-12-08', '2026-12-10'), { since: '2026-11-23', epoch: '2026-11-23' }, '2026-12-14');
  check(v.weeks[1].o === 'saved' && v.savers.log.find(s => s.used === '2026-11-30').month === '2026-12', 'month boundary inside a week: the week uses the saver of the month it ends in');
  check(v.weeks[2].o === 'fail' && v.savers.log.find(s => s.month === '2026-11').used === null, 'an expired (November) saver never protects a later December week');
  // December / January: the pair 28 Dec – 10 Jan
  v = run(days(range('2026-12-28', 5), range('2027-01-04', 5)), { since: '2026-12-01', epoch: '2026-11-30' }, '2027-01-10');
  check(v.bonus['2027-01'] && v.bonus['2027-01'].at === '2027-01-08' && !v.bonus['2026-12'], 'bonus across the new year belongs to January (month of the 10th workout)');
  v = run(days(range('2026-12-21', 7), range('2026-12-28', 3)), { since: '2026-12-01', epoch: '2026-11-30' }, '2027-01-03');
  check(v.bonus['2026-12'] && v.bonus['2026-12'].at === '2026-12-30', 'a pair crossing into January whose 10th day is in December belongs to December');
  check(v.challenge.earned === null && v.savers.held.every(x => x.kind === 'r'), 'on 3 January, December\'s bonus is expired and not shown as earned');
  // challenge display
  v = run(days(range('2026-11-02', 5), range('2026-11-09', 3)), {}, '2026-11-11');
  check(v.challenge.n === 8 && v.challenge.pair === 'lastThis', 'challenge progress: 8/10 for last week + this week');
  v = run(days(range('2026-11-09', 3)), {}, '2026-11-12');
  check(v.challenge.n === 3 && v.challenge.pair === 'thisNext', 'challenge progress: this + next week when last week can no longer make it');
  v = run(days(range('2026-11-02', 5), range('2026-11-09', 5)), {}, '2026-11-14');
  check(!!v.challenge.earned && v.challenge.claimedAt === '2026-11-13', 'challenge shows "earned" for the rest of the month');
  check(v.challenge.n <= 10 && v.challenge.of === 10, 'challenge counter never above 10');
  // a bonus that could still come this week is a protection path: no early "lost"
  v = run(days(range('2026-11-02', 2), range('2026-11-09', 7), range('2026-11-16', 2)), { base: 12, plan: [['', 2], ['2026-11-12', 5]] }, '2026-11-21');
  check(v.state !== 'reset', 'no early reset while the Consistency Challenge could still earn a saver by Sunday');
  // nothing invented
  const d0 = days(range('2026-11-02', 2)); const before = J([...d0]); v = run(d0, { base: 9 }, '2026-11-16');
  check(J([...d0]) === before && v.weeks[0].c === 2, 'a saver never adds a workout: history and counts unchanged');
  check(run(days(), { base: 0 }, '2026-11-09').savers.log.every(s => !s.used), 'no saver is spent on a week when there is no streak to protect');
}

// ---------- the app side: saved record, restart, restore, history edits ----------
{
  const store = {};
  const app = (sessions, gymPlan, today) => {
    const c = { console, JSON, setTimeout() {}, toast() {}, t: k => k, Store: { load: (k, fb) => (k in store ? JSON.parse(store[k]) : fb), save: (k, v) => { store[k] = JSON.stringify(v); return true; }, onChange() {} } };
    vm.createContext(c);
    vm.runInContext(`var sessions = ${J(sessions)}, gymPlan = ${J(gymPlan)}, tpls = [], days = {}, ui = { stk: {} }; var todayKey = () => '${today}'; var planFor = () => null;\n` + read('js/streak.js') + '\n;this.__S = Streak;', c);
    return c.__S;
  };
  const gp = { 1: { tpl: 'gym' }, 3: { tpl: 'gym' }, 5: { tpl: 'gym' } }, ses = d => ({ id: 's' + d, date: d, start: d + 'T18:00:00', exercises: [{}] });
  let S = app([], gp, '2026-11-04');
  let v = S.view(), r = JSON.parse(store.streak);
  check(r.since === '2026-11-04' && r.epoch === '2026-11-02' && J(r.plan) === '[["",3]]' && r.tg['2026-11-02'] === 3, 'first run: record seeded, this week\'s target locked at 3');
  // midweek: 5 Gym Days → logged with today's date, this week still 3
  S = app([], { ...gp, 2: { tpl: 'gym' }, 4: { tpl: 'gym' } }, '2026-11-04'); v = S.view(); r = JSON.parse(store.streak);
  check(v.week.target === 3 && v.week.next === 5 && r.plan.length === 2, 'planner edit midweek: this week 3, next week 5');
  check(J(S.planNote()) === J({ k: 'stkPlanNext', p: { n: 3, m: 5 } }), 'planner edit explains: this week stays, the new goal starts Monday');
  S = app([], gp, '2026-11-04'); S.view(); r = JSON.parse(store.streak);
  check(J(r.plan) === '[["",3]]', 'changed back the same day: one entry, no noise');
  // a restart on a later day with workouts: same answer every time, saver use not undone
  const hist = ['2026-11-03', '2026-11-05', '2026-11-10', '2026-11-12'].map(ses);
  const a = app(hist, gp, '2026-11-16').view(), b = app(hist, gp, '2026-11-16').view();
  check(J(a.weeks) === J(b.weeks) && a.savers.n === b.savers.n, 'restart: identical result, a used saver stays used');
  check(a.weeks[0].o === 'fail' || a.weeks[0].o === 'saved', 'weeks are judged after a restart days later (offline gap)');
  // the same workout saved twice / two quick completions on the same day
  const c2 = app(hist.concat(ses('2026-11-12'), { ...ses('2026-11-12'), id: 'x2' }), gp, '2026-11-16').view();
  check(J(c2.weeks) === J(a.weeks), 'duplicate completions on one day change nothing');
  // a deleted past workout: the replay follows the history; the best never drops
  const full = ['2026-11-03', '2026-11-05', '2026-11-07'].map(ses), okv = app(full, gp, '2026-11-09').view();
  const cut = app(full.slice(0, 1), gp, '2026-11-09').view();
  check(okv.total === 3 && cut.total === 0 && cut.best === 3, 'a deleted workout re-judges its week; the personal best is kept');
  // restore: a backup record is the same record → same savers, no extra grant
  const saved = store.streak; const r1 = app(hist, gp, '2026-11-20').view(); store.streak = saved; const r2 = app(hist, gp, '2026-11-20').view();
  check(J(r1.savers) === J(r2.savers), 'restore of the same record: no duplicate saver');
  // old streak carried over once (distinct days before this week)
  for (const k of Object.keys(store)) delete store[k];
  const old = ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-03'].map(ses);
  const c3 = app(old, gp, '2026-11-04'); const vv = c3.view(); r = JSON.parse(store.streak);
  check(r.base === 3 && vv.total === 3, 'update: the old streak\'s workout days before this week carry over (3)');
}

// ---------- Stats: two pins, 24-hour rotation ----------
{
  const g = { console, ui: {}, profile: {}, saveUI() {}, Date };
  vm.createContext(g);
  vm.runInContext(read('js/profile.js').replace(/^const /gm, 'var ') + '\n;this.__P = { pinToggle, statRotate, statsPick, STAT_N, STAT_PIN_MAX, statPins };', g);
  const P = g.__P;
  check(P.STAT_PIN_MAX === 2, 'stats: at most two pins');
  let r = P.pinToggle([], 'a'); check(J(r.pins) === '["a"]' && !r.full, 'pin one');
  r = P.pinToggle(['a'], 'b'); check(J(r.pins) === '["a","b"]', 'pin two, in your order');
  r = P.pinToggle(['a', 'b'], 'c'); check(r.full && J(r.pins) === '["a","b"]', 'a third pin is refused (limit reached), nothing replaced');
  r = P.pinToggle(['a', 'b'], 'c', 'a'); check(J(r.pins) === '["b","c"]', 'replace only after you choose which pin');
  r = P.pinToggle(['a', 'b'], 'a'); check(J(r.pins) === '["b"]', 'unpin');
  g.profile.statPins = ['a', 'b', 'c', 'd']; check(J(P.statPins()) === '["a","b"]', 'an older saved list of up to six pins: only the first two count (not rewritten)');
  const pool = 'abcdefghijklmnop'.split(''), t0 = Date.UTC(2026, 10, 22, 9);
  const A = P.statRotate(null, pool, t0).R;
  check(A.ids.length === P.STAT_N && A.next === t0 + 864e5, 'first rotation: six picks, next change in 24 hours');
  let same = true; for (const h of [1, 5, 12, 23.9]) { const x = P.statRotate(A, pool, t0 + h * 36e5); if (x.changed || J(x.R.ids) !== J(A.ids)) same = false; }
  check(same, 'no reroll before 24 hours (reload / restart / navigation)');
  const B = P.statRotate(A, pool, t0 + 864e5 + 1); check(B.changed && J(B.R.ids) !== J(A.ids) && !B.R.ids.some(id => A.ids.includes(id)), 'after 24 hours: a new set, none repeated when there are enough stats');
  const few = ['a', 'b', 'c', 'd', 'e', 'f', 'g'], F1 = P.statRotate(null, few, t0).R, F2 = P.statRotate(F1, few, t0 + 864e5 + 1).R;
  check(J(F2.ids.slice().sort()) !== J(F1.ids.slice().sort()), 'few stats: consecutive sets still differ when an alternative exists');
  const tiny = P.statRotate(null, ['a', 'b'], t0).R; check(tiny.ids.length === 2, 'fewer stats than slots: shows what exists, nothing invented');
  const lost = P.statRotate(A, pool.filter(id => id !== A.ids[0]), t0 + 36e5);
  check(lost.changed && !lost.R.ids.includes(A.ids[0]) && J(lost.R.ids.slice(0, 5)) === J(A.ids.slice(1)) && lost.R.next === A.next, 'pool shrinks: the missing stat is replaced, the others and the 24-hour clock stay');
  const back = P.statRotate(A, pool, A.at - 3 * 864e5); check(back.changed, 'a clock moved back by days does not freeze the rotation');
  // the grid: pins first, never duplicated, rest from the rotation
  const all = pool.map(id => ({ id }));
  g.profile.statPins = [A.ids[2], 'p']; g.ui.statRot = A;
  const shown = P.statsPick(all, t0 + 36e5).map(x => x.id);
  check(shown.length === 6 && shown[0] === A.ids[2] && shown[1] === 'p' && new Set(shown).size === 6, 'pinned first, no stat shown twice');
  check(J(P.statsPick(all, t0 + 2 * 36e5).map(x => x.id)) === J(shown), 'pinned + rotating stay the same within the day');
  const next = P.statsPick(all, t0 + 864e5 + 60e3).map(x => x.id); check(next[0] === A.ids[2] && next[1] === 'p', 'pinned stats never rotate');
}

console.log(fails ? `\n${fails} streak/stats problem(s), ${passes} ok.` : `\nAll ${passes} streak/stats checks passed.`);
process.exit(fails ? 1 : 0);
