// Weekly workout streak, Streak Savers and the Consistency Challenge (Changes #12 / #13; replaces the 0.7.7 day-by-day streak + weekly freeze).
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// The ONE owner of streak numbers. Everything is worked out from two things that are already saved, so it is right after days offline,
// a restart or a restore, and a grant can never happen twice:
//   • sessions (finished workouts; the authoritative history) → qualifying DAYS: one per local calendar date (s.date), however many workouts
//   • the weekly planner (gymPlan) → the number of Gym Days = the week's target, LOCKED at Monday: a change applies from the next Monday
// Saved here (Store 'streak', synced, in backups): { v: 1, since, epoch, base, best, plan: [[date, n]…], tg: { monday: n } }
//   since = first day this system ran on this data · epoch = its Monday (the first week assessed) · base = the old streak carried over
//   plan  = Gym-Day count changes, in order ([''] = before since) · tg = the target locked for each week · best = personal best (never goes down)
// Saver grants, uses and expiry, the challenge and every week's result are a pure replay of the above (Streak.compute), so they are never stored
// twice. Reconciliation: if past workouts are edited, deleted or imported, the replay follows the history (docs/architecture/decisions.md D11).
// Device only (ui.stk): which streak messages were already shown, and whether the How Streaks Work intro was seen.

const Streak = (() => {
  // ---------- calendar: date keys 'YYYY-MM-DD' (the date a workout was saved under), arithmetic in UTC so DST / time zone moves never shift a day ----------
  const DK = /^\d{4}-\d{2}-\d{2}$/, DAY = 864e5, BONUS_NEED = 10;
  const ms = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  const add = (d, n) => new Date(ms(d) + n * DAY).toISOString().slice(0, 10);
  const dow = d => (new Date(ms(d)).getUTCDay() + 6) % 7;   // Monday 0 … Sunday 6
  const monday = d => add(d, -dow(d));
  const month = d => d.slice(0, 7);
  const monthEnd = m => add(add(m + '-01', 32).slice(0, 7) + '-01', -1);

  // ---------- targets ----------
  // the Gym-Day count in force for the week that starts on Monday w: the last planner change made BEFORE that Monday
  function planTarget(plan, w){ let n = 0; for(const e of plan || []) if(Array.isArray(e) && e[0] < w) n = +e[1] || 0; return n; }
  const targetOf = (rec, w) => rec.tg && rec.tg[w] != null ? +rec.tg[w] || 0 : planTarget(rec.plan, w);

  // ---------- the replay (pure): qualifying days + saved record + today → every week's result, savers, challenge and this week's state ----------
  // days: Set of date keys with at least one finished workout. Never reads globals; tools/streak-test.js runs it in Node.
  function compute(days, rec, today){
    const has = d => days.has(d), W0 = monday(today), sinceM = month(rec.since || today);
    const inWeek = (w, upto) => { let c = 0; for(let i = 0; i < 7; i++){ const d = add(w, i); if(upto && d > upto) break; if(has(d)) c++; } return c; };

    // Consistency Challenge: pairs of adjacent Monday–Sunday weeks; 10 distinct workout days → one bonus saver for the month of the 10th day.
    // At most one per month; a pair that earned one is used up (the next pair starts after it), so one achievement never pays twice.
    const bonus = {}; let lastPair = null;
    for(let w = add(rec.epoch, -7); w <= W0; w = add(w, 7)){
      if(lastPair && w <= add(lastPair, 7)) continue;
      let n = 0, tenth = null;
      for(let i = 0; i < 14 && !tenth; i++){ const d = add(w, i); if(d > today) break; if(has(d) && ++n === BONUS_NEED) tenth = d; }
      if(tenth && tenth >= rec.epoch && month(tenth) >= sinceM && !bonus[month(tenth)]){ bonus[month(tenth)] = { at: tenth, pair: w }; lastPair = w; }
    }
    // Savers: one regular saver per calendar month (from the month this system started) + that month's bonus, if earned. Both expire at month end.
    const savers = {};
    const sv = m => { if(m < sinceM) return null; if(!savers[m]) savers[m] = { r: { kind: 'r', at: m + '-01', used: null }, b: bonus[m] ? { kind: 'b', at: bonus[m].at, used: null } : null }; return savers[m]; };
    // the saver that can protect the week ending on Sunday sun: one of THAT month's, granted by then, not used (regular first)
    for(let m = sinceM, i = 0; m <= month(today) && i < 600; m = add(monthEnd(m), 1).slice(0, 7), i++) sv(m);   // every month's grant, in order
    const pick = sun => { const s = sv(month(sun)); if(!s) return null; if(!s.r.used) return s.r; return s.b && !s.b.used && s.b.at <= sun ? s.b : null; };

    // finished weeks, oldest first
    let total = Math.max(0, +rec.base || 0), best = Math.max(+rec.best || 0, total);
    const weeks = [];
    for(let w = rec.epoch; w < W0; w = add(w, 7)){
      const t = targetOf(rec, w), c = inWeek(w), sun = add(w, 6), before = total; let o;
      if(t <= 0) o = 'off';                                                     // all-rest planner: no goal, no points, nothing lost, no saver
      else if(c >= t){ total += c; o = 'ok'; }                                  // every qualifying day counts, extras too
      else { const s = total > 0 && c === t - 1 && c >= 1 ? pick(sun) : null;  // one short, at least one real workout, a streak to protect
        if(s){ s.used = w; o = 'saved'; } else { total = 0; o = 'fail'; } }
      best = Math.max(best, total);
      weeks.push({ w, t, c, o, pts: o === 'ok' ? c : 0, before, after: total });
    }

    // this week (not final yet): progress shown apart from the total; an early reset once the goal is out of reach with no saver able to help
    const t = targetOf(rec, W0), idx = dow(today), todayDone = has(today), c = inWeek(W0, today);
    const open = 6 - idx + (todayDone ? 0 : 1);   // days left that can still add a workout (today too, if not trained yet)
    const reach = c + open, need = Math.max(0, t - c), sun = add(W0, 6);
    const saverNext = (() => { const s = sv(month(sun)); if(!s) return null; if(!s.r.used) return s.r; return s.b && !s.b.used ? s.b : null; })();
    // a bonus saver that could still be earned by Sunday (last week + this week reaching 10) is a protection path too: never reset early while it exists
    const prev = add(W0, -7), prevUsed = !!lastPair && (lastPair === prev || lastPair === add(prev, -7));
    const pairPrev = (() => { let n = 0; for(let d = prev; d <= today; d = add(d, 1)) if(has(d)) n++; return n; })();
    const bonusMaybe = !saverNext && month(sun) >= sinceM && !bonus[month(sun)] && !prevUsed && pairPrev + open >= BONUS_NEED;
    let state;
    if(t <= 0) state = 'off';
    else if(c >= t) state = 'met';
    else if(reach >= t) state = need === open && !todayDone ? 'last' : 'on';
    else if(total > 0 && t >= 2 && reach >= t - 1 && (saverNext || bonusMaybe)) state = 'saver';
    else state = total > 0 ? 'reset' : 'missed';

    // savers in hand today (this month's, not used)
    const cur = sv(month(today)), held = cur ? [cur.r, cur.b].filter(s => s && !s.used && s.at <= today) : [];
    // challenge progress: the adjacent-week pair that is closest to 10 and still reachable (last + this week, or this + next week)
    const challenge = (() => {
      const earned = bonus[month(today)] || null, left = to => Math.round((ms(to) - ms(today)) / DAY) + (todayDone ? 0 : 1);   // days that can still add one
      const cnt = from => { let n = 0; for(let d = from; d <= today; d = add(d, 1)) if(has(d)) n++; return n; };
      const a = prevUsed ? null : { pair: 'lastThis', from: prev, to: sun, n: Math.min(BONUS_NEED, pairPrev) };
      // this week is part of a pair that already paid out (last + this week): the next pair starts next Monday
      const b = lastPair === prev ? { pair: 'next', from: add(W0, 7), to: add(W0, 20), n: 0 } : { pair: 'thisNext', from: W0, to: add(W0, 13), n: Math.min(BONUS_NEED, cnt(W0)) };
      const live = [a, b].filter(p => p && p.n < BONUS_NEED && p.n + Math.max(0, left(p.to)) >= BONUS_NEED);
      const p = live.sort((x, y) => y.n - x.n)[0] || b;
      return { n: p.n, of: BONUS_NEED, pair: p.pair, from: p.from, to: p.to, earned, claimedAt: earned ? earned.at : null };
    })();

    const last = weeks[weeks.length - 1] || null;
    return {
      on: t > 0, state, total: state === 'reset' ? 0 : total, kept: total, best, weeks, last,
      week: { start: W0, end: sun, target: t, done: c, need, open, todayDone, saverNeed: state === 'saver' ? Math.max(0, t - 1 - c) : 0, viaBonus: state === 'saver' && !saverNext, next: planTarget(rec.plan, add(W0, 7)) },
      savers: { n: held.length, held: held.map(s => ({ kind: s.kind, at: s.at, exp: monthEnd(month(today)) })),
        log: Object.entries(savers).flatMap(([m, s]) => [s.r, s.b].filter(Boolean).map(x => ({ month: m, kind: x.kind, at: x.at, used: x.used, exp: monthEnd(m) }))) },
      bonus, challenge,
    };
  }

  // ---------- notices (pure): what is worth saying once, with a key so it is never repeated ----------
  function notices(v){
    const out = [], wk = v.week.start, L = v.last;
    if(L && L.o === 'saved') out.push({ key: 'saved:' + L.w, kind: 'saved', n: L.after });
    if(L && L.o === 'fail' && L.before > 0) out.push({ key: 'lost:' + L.w, kind: 'lost', n: L.before });
    if(v.state === 'reset') out.push({ key: 'lost:' + wk, kind: 'lost', n: v.kept });
    if(v.state === 'saver' && !v.week.saverNeed && !v.week.viaBonus) out.push({ key: 'saver:' + wk, kind: 'saver' });
    if(v.kept > 0 && v.state === 'last') out.push({ key: 'last:' + wk + ':' + v.week.need, kind: 'last', need: v.week.need });
    else if(v.kept > 0 && v.state === 'on' && v.week.need === 1) out.push({ key: 'one:' + wk, kind: 'one' });
    if(v.challenge.earned) out.push({ key: 'bonus:' + v.challenge.earned.at.slice(0, 7), kind: 'bonus', quiet: true });
    return out;
  }

  // ---------- the app side: read the live data, keep the saved record up to date, cache the replay ----------
  // the app's top-level let/const are shared between scripts but are not on window: looked up by name at call time (as in js/athlete/state.js)
  const G = {
    sessions: () => typeof sessions !== 'undefined' ? sessions : undefined, gymPlan: () => typeof gymPlan !== 'undefined' ? gymPlan : undefined,
    tpls: () => typeof tpls !== 'undefined' ? tpls : undefined, days: () => typeof days !== 'undefined' ? days : undefined,
    planFor: () => typeof planFor !== 'undefined' ? planFor : undefined, todayKey: () => typeof todayKey !== 'undefined' ? todayKey : undefined,
    ui: () => typeof ui !== 'undefined' ? ui : undefined,
  };
  const g = n => G[n] ? G[n]() : undefined;
  // Gym Days in the planner: a weekday set to Gym or to a saved workout that still exists (the same rule as planFor in gym.js)
  function gymDays(plan, tp){ let n = 0; for(let wd = 0; wd < 7; wd++){ const p = plan && plan[wd]; if(!p || !p.tpl || p.tpl === 'rest') continue;
    if(p.tpl === 'gym' || (tp || []).some(x => x && x.id === p.tpl)) n++; } return n; }
  const qualDays = list => { const s = new Set(); for(const x of list || []) if(x && typeof x.date === 'string' && DK.test(x.date) && Array.isArray(x.exercises)) s.add(x.date); return s; };

  // the old streak (0.7.7: workouts on planned days, a missed planned day broke it) carried over once: its workout DAYS before this week
  function legacy(dayset, today){
    const ep = monday(today), planFor_ = g('planFor'), dd = g('days') || {};
    const planned = d => { const o = dd[d]; if(o) return o.type === 'gym' || !!o.skipped; const pl = planFor_ ? planFor_(d) : null; return !!(pl && pl.type === 'gym'); };
    const first = [...dayset].sort()[0]; let base = 0;
    if(first) for(let d = today, i = 0; d >= first && i < 800; d = add(d, -1), i++){
      if(dayset.has(d)){ if(d < ep) base++; continue; }
      if(d === today) continue;
      if(planned(d) && !(dd[d] && dd[d].frozen)){ if(d >= ep) base = 0; break; }
    }
    // the old Longest Streak stat (workout days with at most 2 days off between them), so the personal best does not drop on update
    let run = 0, best = 0, prev = null; [...dayset].sort().forEach(d => { run = prev && (ms(d) - ms(prev)) / DAY <= 3 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
    return { base, best: Math.max(base, best) };
  }

  const valid = r => !!r && typeof r === 'object' && r.v === 1 && DK.test(r.since || '') && DK.test(r.epoch || '') && Array.isArray(r.plan);
  let memo = null;
  // read + repair the saved record: seed it the first time, note planner changes, lock this week's target, raise the personal best
  function record(today, dayset){
    let rec = Store.load('streak', null), dirty = false;
    if(!valid(rec)){ const L = legacy(dayset, today); rec = { v: 1, since: today, epoch: monday(today), base: L.base, best: L.best, plan: [['', gymDays(g('gymPlan'), g('tpls'))]], tg: {} }; dirty = true; }
    rec.tg = rec.tg && typeof rec.tg === 'object' ? rec.tg : {};
    const n = gymDays(g('gymPlan'), g('tpls')), lastE = rec.plan[rec.plan.length - 1];
    if(!lastE || +lastE[1] !== n){
      if(lastE && lastE[0] === today){ lastE[1] = n; const pr = rec.plan[rec.plan.length - 2]; if(pr && +pr[1] === n) rec.plan.pop(); }   // changed twice today: keep one entry
      else rec.plan.push([today, n]);
      dirty = true; }
    for(let w = rec.epoch, i = 0; w <= monday(today) && i < 1200; w = add(w, 7), i++) if(rec.tg[w] == null){ rec.tg[w] = planTarget(rec.plan, w); dirty = true; }
    return { rec, dirty };
  }
  function view(){
    const today = g('todayKey') ? g('todayKey')() : new Date().toLocaleDateString('en-CA');
    const dayset = qualDays(g('sessions')), key = [...dayset].sort().join(',') + '|' + gymDays(g('gymPlan'), g('tpls'));
    const fp = () => today + '|' + key + '|' + JSON.stringify(Store.load('streak', null));
    if(memo && memo.fp === fp()) return memo.v;
    const { rec, dirty } = record(today, dayset), v = compute(dayset, rec, today);
    if(dirty || v.best > (+rec.best || 0)){ rec.best = Math.max(+rec.best || 0, v.best); Store.save('streak', rec); }
    v.since = rec.since;
    memo = { fp: fp(), v };
    return v;
  }

  // what the planner change means for the streak (shown when the user edits the planner): null when the target did not change
  function planNote(){
    const v = view(), now = v.week.target, next = v.week.next; if(next === now) return null;
    return next <= 0 ? { k: 'stkPlanOff', p: { n: now } } : now <= 0 ? { k: 'stkPlanOn', p: { m: next } } : { k: 'stkPlanNext', p: { n: now, m: next } };
  }
  // for the coaches (Athlete OS training slice): the deterministic summary only, never the history
  function summary(){
    const v = view();
    return { tracking: v.on, state: v.state, weeklyTarget: v.week.target, doneThisWeek: v.week.done, stillNeeded: v.week.need, daysLeft: v.week.open,
      streak: v.total, best: v.best, saversHeld: v.savers.n, challenge: v.challenge.earned ? 'earned this month' : `${v.challenge.n}/${v.challenge.of}`, kind: 'calculated', src: 'sessions+gymPlan' };
  }
  // device-only memory of messages already shown
  const seenGet = () => { const u = g('ui'); return (u && u.stk && typeof u.stk === 'object') ? u.stk : {}; };
  function pending(){ const s = seenGet().seen || {}; return notices(view()).filter(x => !s[x.key]); }
  function markSeen(keys){ const u = g('ui'); if(!u) return; const st = u.stk = Object.assign({}, seenGet()), s = st.seen = Object.assign({}, st.seen || {});
    keys.forEach(k => { s[k] = 1; }); const ks = Object.keys(s); if(ks.length > 40) ks.slice(0, ks.length - 40).forEach(k => delete s[k]); Store.save('ui', u); }

  // a planner edit that changes the number of Gym Days: say what it means (this week's goal stays, the new one starts Monday)
  // (compared with the last count the saved record knows, so it works whether or not the streak was drawn yet in this session)
  if(typeof Store !== 'undefined' && Store.onChange) Store.onChange((name, ch, how) => {
    if(name !== 'gymPlan' || how !== 'save' || typeof toast !== 'function') return;
    const r = Store.load('streak', null), last = valid(r) && r.plan.length ? +r.plan[r.plan.length - 1][1] : null;
    if(last === null || last === gymDays(g('gymPlan'), g('tpls'))) return;
    setTimeout(() => { const note = planNote(); if(note) toast(t(note.k, note.p)); }, 0);   // after the planner's own "saved" toast
  });

  return { compute, notices, planTarget, gymDays, qualDays, view, planNote, summary, pending, markSeen, monday, add, monthEnd, BONUS_NEED };
})();

// ---------- drawing (Change #13 UI): the flame pill's shields, the warning line, the streak window, once-only messages ----------
const STK_SHIELD = '<path d="M12 3l7 3v5.5c0 4.3-2.9 8-7 9.5-4.1-1.5-7-5.2-7-9.5V6z"/>';
const stkShield = (on, size) => `<svg class="stkshield${on ? ' on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" fill-opacity="${on ? '.28' : '0'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${STK_SHIELD}</svg>`;
let STK_ANIM = 0;   // until this time, the shield plays its short "used" pulse (a saver was just used for last week)
// small shields next to the streak number: one filled shield per saver held (none held: one outline shield)
function saverMini(v){ if(!v || !v.on) return ''; const n = v.savers.n, cls = Date.now() < STK_ANIM ? ' stkused' : '';
  return `<span class="stksv${cls}">${n ? Array.from({ length: n }, () => stkShield(true, 12)).join('') : stkShield(false, 12)}</span>`; }
const streakLabel = v => t('stkAria', { n: v.total, s: v.savers.n });
const stkDate = d => fmtDate(d + 'T12:00:00');
// the status line. card = true: only the lines you can act on, in their short form (Today's gym card)
function streakLine(v, card){
  const w = v.week, k = v.state;
  if(card) return k === 'last' && v.kept > 0 ? t('stkCLast') : k === 'on' && w.need === 1 && v.kept > 0 ? t('stkCOne') : k === 'saver' ? t('stkCSaver') : k === 'reset' ? t('stkCLost') : null;
  if(k === 'last' && v.kept > 0) return t('stkLast');
  if(k === 'on' && w.need === 1 && v.kept > 0) return t('stkOne');
  if(k === 'saver') return w.viaBonus ? t('stkSaverBonus') : w.saverNeed ? t('stkSaverNeed', { n: w.saverNeed }) : t('stkSaver');
  if(k === 'reset') return t('stkLost');
  if(k === 'off') return t(w.next > 0 ? 'stkOffNext' : 'stkOff');
  if(k === 'met') return t('stkMet');
  if(k === 'missed') return t('stkMissed');
  if(k === 'last') return t('stkLastNew');
  return t(w.need === 1 ? 'stkOneNew' : 'stkOn', { n: w.need, d: w.open });
}
// 0.8: the streak bubble in the top left of My Food Log, Food Library and Gym Buddy: the shield with the flame inside, and the number
const STK_BUB_ICON = () => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${STK_SHIELD}<g transform="translate(7.4 7.6) scale(.38)" fill="currentColor" stroke="none">${ICON.flame}</g></svg>`;
function drawStkBubs(){ const bs = document.querySelectorAll('.stkbub'); if(!bs.length) return; let v; try{ v = Streak.view(); }catch(e){ return; }
  const html = `<span class="stkbi">${STK_BUB_ICON()}</span><b>${v.total}</b>`, lab = streakLabel(v);
  bs.forEach(b => { if(b.innerHTML !== html) b.innerHTML = html; b.setAttribute('aria-label', lab); }); }
// 0.8: the streak history: the last six weeks, Monday to Sunday, every day you trained in green (today has a ring)
function stkCalendar(){ const days = Streak.qualDays(sessions), tk = todayKey(), w0 = Streak.add(Streak.monday(tk), -35), wd = t('wdShort').split(' ');
  const head = [1, 2, 3, 4, 5, 6, 0].map(d => `<small>${esc((wd[d] || '').charAt(0))}</small>`).join('');
  const cells = Array.from({ length: 42 }, (_, i) => { const d = Streak.add(w0, i), on = days.has(d), fut = d > tk;
    return `<i class="${on ? 'on' : ''}${d === tk ? ' today' : ''}${fut ? ' fut' : ''}">${+d.slice(8)}</i>`; }).join('');
  return `<div class="stkcard stkcal"><div class="stkrowt"><b>${esc(t('stkCal'))}</b></div><div class="stkcalg">${head}${cells}</div><small>${esc(t('stkCalSub'))}</small></div>`; }
function openStreak(intro){ drawStreak(intro); $('toast').classList.remove('show'); open('ovStreak');
  if(!(ui.stk && ui.stk.intro)){ ui.stk = Object.assign({}, ui.stk, { intro: 1 }); saveUI(); } }
function drawStreak(intro){
  const v = Streak.view(), w = v.week, box = $('stkBody'); if(!box) return;
  const firstTime = intro || !(ui.stk && ui.stk.intro);
  const chip = { on: 'stkStOn', last: 'stkStOn', met: 'stkStMet', saver: 'stkStSaver', off: 'stkStOff', reset: 'stkStReset', missed: 'stkStMissed' }[v.state];
  const cells = v.on ? Array.from({ length: Math.min(7, Math.max(w.target, w.done)) }, (_, i) => `<i class="${i < w.done ? (i < w.target ? 'on' : 'on extra') : ''}"></i>`).join('') : '';
  const held = v.savers.held, nextM = Streak.add(Streak.monthEnd(todayKey().slice(0, 7)), 1);   // the 1st of next month
  const savers = `<div class="stkcard stksavers"><span class="stkshields">${[0, 1].map(i => stkShield(i < held.length, 26)).join('')}</span>
      <span><b>${esc(t('stkSavers'))}</b><small>${esc(t('stkSaverN', { n: held.length }))} · ${esc(held.length ? t('stkSaverExp', { d: stkDate(held[0].exp) }) : t('stkSaverNone', { d: stkDate(nextM) }))}</small></span></div>`;
  const ch = v.challenge, chOn = !!ch.earned;
  const chal = `<div class="stkcard stkchal${chOn ? ' earned' : ''}"><div class="stkrowt"><b>${esc(t('stkChal'))}</b>${chOn ? `<span class="stkchip stk-met">${esc(t('stkChalEarned'))}</span>` : `<span class="stkchn">${esc(t('stkChalN', { n: ch.n, m: ch.of }))}</span>`}</div>
      ${chOn ? '' : `<div class="stkbar" role="progressbar" aria-valuemin="0" aria-valuemax="${ch.of}" aria-valuenow="${ch.n}"><i style="transform:scaleX(${ch.n / ch.of})"></i></div><small>${esc(t('stkChalPair', { a: stkDate(ch.from), b: stkDate(ch.to) }))}</small>`}
      <small>${esc(chOn ? t('stkChalEarnedSub', { d: stkDate(ch.claimedAt) }) : t('stkChalSub'))}</small></div>`;
  const how = `<details class="stkhow"${firstTime ? ' open' : ''}><summary>${esc(t('stkHow'))}</summary><ul>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<li>${esc(t('stkHow' + i))}</li>`).join('')}</ul></details>`;
  box.innerHTML = `<div class="stkhead stk-${v.state}"><span class="stkfl">${flameIcon(v.total, 40)}</span><span class="stknum"><b>${v.total}</b><small>${esc(t('pfStreak'))}</small></span><span class="stkchip stk-${v.state}">${esc(t(chip))}</span></div>
    <p class="stkline">${esc(streakLine(v, false))}</p>
    ${v.on ? `<div class="stkcard stkweek"><div class="stkrowt"><b>${esc(t('stkWeek'))}</b><span>${esc(t('stkWeekOf', { d: w.done, t: w.target }))}</span></div><div class="stkcells">${cells}</div>
      <small>${esc(w.need ? t(w.open === 1 ? 'stkWeekNeed1' : 'stkWeekNeed', { n: w.need, d: w.open }) : t('stkWeekDone'))}${w.next !== w.target ? ' · ' + esc(t('stkWeekNext', { n: w.next })) : ''}</small></div>` : ''}
    ${stkCalendar()}
    ${savers}
    <div class="stkcard stkbest"><span>${esc(t('stkBest'))}</span><b>${v.best}</b></div>
    ${chal}${how}`;
}
// once-only messages (a streak lost, protected, a last chance…): shown as one toast when the app opens or comes back; the rest are marked seen
function streakNotify(){
  if(!ui.setupDone || document.querySelector('.overlay.open')) return;
  const all = Streak.pending(); if(!ui.stk || !ui.stk.intro0){ ui.stk = Object.assign({}, ui.stk, { intro0: 1 }); saveUI();
    if(!(ui.stk && ui.stk.intro)){ toast(t('stkIntro'), t('stkIntroBtn'), () => openStreak(true)); Streak.markSeen(all.map(x => x.key)); return; } }
  if(!all.length) return; const say = all.find(x => !x.quiet); Streak.markSeen(all.map(x => x.key)); if(!say) return;
  if(say.kind === 'saved'){ STK_ANIM = Date.now() + 1600; renderTodayRec(); if(typeof renderProfile === 'function') renderProfile(); }
  const msg = { saved: 'stkSavedT', lost: 'stkLost', saver: 'stkSaver', last: 'stkLast', one: 'stkOne' }[say.kind];
  toast(t(msg), t('stkMore'), () => openStreak());
}
if(typeof document !== 'undefined' && document.addEventListener){
  setTimeout(() => { try{ streakNotify(); }catch(e){ console.warn('streak', e); } }, 2600);   // after start-up (a workout left open is asked about first)
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') setTimeout(() => { try{ streakNotify(); }catch(e){} }, 900); });
}
