// Social Hub tab (was Profile; 0.7.7): your circle, Share a Workout, streak, highest rank, leaderboards, stats. Settings opens from the gear (index.html).
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// Everything here is this phone's own data. Friends, live status and friend boards need accounts (0.8+): only their spaces are drawn.

// The lifts that have a leaderboard (Add a 1RM offers these; the trophy button shows on them)
const BOARD_LIFTS = [{ id: 'bench' }, { id: 'squat' }, { id: 'deadlift' }];   // 0.7.10: the three main lifts; other exercises keep their rank on their own

// Refinements #8 (Petros): a leaderboard entry is a REAL tested single only: one you entered under Add a 1RM (profile.orm: { id, exId, w, date })
// or a single rep ticked while the trophy was on for that exercise (Leaderboard Attempt, x.attempt: normal set, no warm-up, not the right side of L/R).
// A heavier single without the trophy does not count, and nothing is ever estimated (no e1rm). w = the weight you typed; the board shows the lifted
// load (loadOf: pull-ups count body weight + added weight). → { kg, w, date, src: 'manual' | 'live' } or null. Ties: the one lifted first wins.
const ormList = () => Array.isArray(profile.orm) ? profile.orm.filter(o => o && o.exId && +o.w >= 0 && o.date) : [];
function boardBest(exId, skip){   // skip = one set to leave out (to compare a fresh single with the best before it)
  let best = null; const take = (w, date, src) => { const kg = loadOf(exId, w); if(kg > 0 && (!best || kg > best.kg || (kg === best.kg && date < best.date))) best = { kg, w: +w, date, src }; };
  ormList().forEach(o => { if(o.exId === exId) take(o.w, o.date, 'manual'); });
  const scan = (x, date) => { if(x.exId !== exId || !x.attempt) return; x.sets.forEach(st => { if(st !== skip && st.done && isMainSet(st) && st.w !== '' && +st.r === 1) take(+st.w, date, 'live'); }); };
  sessions.forEach(s => s.exercises.forEach(x => scan(x, s.date))); if(active) active.exercises.forEach(x => scan(x, active.date));
  return best;
}
const isBoardLift = exId => BOARD_LIFTS.some(b => b.id === exId);

// ---------- 0.7.10 Highest Rank card: every exercise you have done, with the rank you hold in it (best first) ----------
// profile.rankPick = up to 3 exercise ids you chose (Customize); none = your three highest ranks (Automatic; Refinements #8, was the single highest)
function rankList(){
  if(!tierBody()) return [];
  const last = new Map(); sessions.forEach(s => s.exercises.forEach(x => { if(x.sets.some(st => st.done) && String(s.start) > (last.get(x.exId) || '')) last.set(x.exId, String(s.start)); }));
  return [...last.keys()].map(exId => { const tf = tierFor(exId); return tf && tf.label ? { exId, n: tf.n, tier: tf.tier, label: tf.label, name: exName(exId), at: last.get(exId) } : null; }).filter(Boolean)
    .sort((a, b) => b.n - a.n || b.at.localeCompare(a.at) || a.name.localeCompare(b.name));   // Refinements #8: same rank = the most recent first
}
const rankPicks = ranks => { const ids = Array.isArray(profile.rankPick) ? profile.rankPick : [], got = ids.map(id => ranks.find(r => r.exId === id)).filter(Boolean).slice(0, 3); return got.length ? got : ranks.slice(0, 3); };
const rankMini = (r, size) => `<span class="pftier rk tr-${r.tier}">${rankIcon(r.tier, r.n, size)}</span>`;
function openRankPick(){ $('rkSearch').value = ''; drawRankPick(); open('ovRank'); }
function drawRankPick(){
  const q = $('rkSearch').value.trim(), all = rankList(), picked = Array.isArray(profile.rankPick) ? profile.rankPick : [];
  // Refinements change 16: the same exercise search as the picker (typos, other names, Greek, Greeklish), best match first
  const hits = q ? ExSearch.query(q, { list: EX(), lang, sessions, ids: new Set(all.map(r => r.exId)), near: false, similar: false }).items.filter(i => i.level <= 4) : null;
  const ranks = hits ? hits.map(i => all.find(r => r.exId === i.id)).filter(Boolean) : all;
  $('rkCount').textContent = t('rkPicked', { n: picked.filter(id => all.some(r => r.exId === id)).length });
  $('rkList').innerHTML = ranks.map(r => { const on = picked.includes(r.exId);
    return `<button type="button" class="rkrow${on ? ' on' : ''}" data-rkpick="${esc(r.exId)}" aria-pressed="${on}">${rankMini(r, 30)}<span class="pfrn tr-${r.tier}"><b>${esc(r.name)}</b><small class="rkink">${esc(r.label)}</small></span>${on ? svgIcon('check', 20, 2.4) : ''}</button>`; }).join('')
    || `<p class="pfempty">${esc(t('rkNone'))}</p>`;
}
function togglePick(exId){
  const ranks = rankList(), cur = (Array.isArray(profile.rankPick) ? profile.rankPick : []).filter(id => ranks.some(r => r.exId === id));
  if(cur.includes(exId)) cur.splice(cur.indexOf(exId), 1); else if(cur.length >= 3){ toast(t('rkMax')); return; } else cur.push(exId);
  if(cur.length) profile.rankPick = cur; else delete profile.rankPick; saveProfile(); Phone.haptic(); drawRankPick(); renderProfile();
}
function resetRankPick(){ delete profile.rankPick; saveProfile(); Phone.haptic(); drawRankPick(); renderProfile(); }

// ---------- profileData(): everything the Profile page shows, in one place ----------
// Gym branches fill in their slot here (streak from gym-streak, tier from gym-tiers); the page markup (renderProfile) stays as it is.
//   streak : Streak.view()               — the weekly workout streak (js/streak.js): total, this week, savers, challenge
//   tierNeed: body weight or sex missing (no ranks yet)
function profileData(){
  const me = Account.current(), today = todayKey();
  const streak = Streak.view();                            // Change #13 weekly streak (js/streak.js)
  // PRs saved with each finished workout (weight PRs carry weight × reps; volume PRs are counted too)
  const prs = sessions.flatMap(s => (s.prs || []).map(p => ({ ...p, date: s.date, start: s.start })));
  return {
    initial: pfInitial(), photo: pfPhoto(),   // 0.7.9: Settings › Photo and Name (ui.js)
    live: !!active, trainedToday: sessions.some(s => s.date === today),
    streak, ranks: rankList(),
    tierNeed: !tierBody(),                                // no body weight or sex yet: one line asking for them, no tiers
  };
}

// ---------- 0.7.10 Stats: facts from your own history. One row each: id, calc(c) → null (no data yet, hidden) or { v: number text, p: subtitle values, k?: other subtitle key } ----------
// Words live in strings.js: title = stt_<id>, one-line subtitle = sts_<id> (or sts_<k>). To add a stat: add a row here and its two strings.
const STATS = [
  { id: 'workouts',   calc: c => c.ses.length && { v: c.num(c.ses.length), p: {} } },
  { id: 'sets',       calc: c => c.sets && { v: c.num(c.sets), p: {} } },
  { id: 'kg',         calc: c => { if(!(c.kg > 0)) return null; const el = c.kg / 5000, car = c.kg / 1500, bag = c.kg / 25;   // a friendly comparison: elephants, then cars, then 25 kg bags
                         return el >= 1 ? { v: c.num(Math.round(c.kg)), k: 'kgEl', p: { n: c.num(Math.round(el * 10) / 10) } } : car >= 1 ? { v: c.num(Math.round(c.kg)), k: 'kgCar', p: { n: c.num(Math.round(car * 10) / 10) } } : { v: c.num(Math.round(c.kg)), k: 'kgBag', p: { n: c.num(Math.round(bag)) } }; } },
  { id: 'streak',     calc: c => c.streakBest > 1 && { v: c.num(c.streakBest), p: {} } },
  { id: 'bestWeek',   calc: c => c.weekBest && { v: c.num(c.weekBest), p: {} } },
  { id: 'favEx',      calc: c => c.favEx && { v: c.favEx.name, p: { n: c.favEx.n }, big: 1 } },
  { id: 'favMuscle',  calc: c => c.favMuscle && { v: c.favMuscle.name, p: { n: c.favMuscle.n }, big: 1 } },
  { id: 'heaviest',   calc: c => c.heavy && { v: `${c.num(Math.round(c.heavy.kg * 2) / 2)} kg`, p: { n: c.heavy.name } } },
  { id: 'longest',    calc: c => c.longMin && { v: c.dur(c.longMin), p: {} } },
  { id: 'earliest',   calc: c => c.early != null && { v: c.hm(c.early), p: {} } },
  { id: 'latest',     calc: c => c.late != null && { v: c.hm(c.late), p: {} } },
  { id: 'weekday',    calc: c => c.wdBest != null && { v: t('wdFull').split(' ')[c.wdBest], p: { n: c.wdN }, big: 1 } },
  { id: 'hours',      calc: c => c.totMin >= 30 && { v: c.dur(c.totMin), p: {} } },
  { id: 'bestDay',    calc: c => c.dayBest && { v: `${c.num(Math.round(c.dayBest.kg))} kg`, ...c.cmp(c.dayBest.kg, 'bd', 1), p: { ...c.cmp(c.dayBest.kg, 'bd', 1).p, d: fmtDate(c.dayBest.date + 'T12:00:00') } } },
  { id: 'mountain',   calc: c => c.climb >= 0.01 && { v: `${c.climb.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', { minimumFractionDigits: c.climb < 0.1 ? 2 : 1, maximumFractionDigits: c.climb < 0.1 ? 2 : 1 })}x`, p: {} } },   // one decimal; two while it is still under 0.1 so a new lifter doesn't see 0.0x
  { id: 'luckyDay',   calc: c => c.prs >= 3 && c.luckyN > 0 && { v: t('wdFull').split(' ')[c.luckyWd], p: { n: c.luckyN }, big: 1 } },
  { id: 'night',      calc: c => c.nights > 0 && { v: c.num(c.nights), p: {} } },
  { id: 'dawn',       calc: c => c.dawns > 0 && { v: c.num(c.dawns), p: {} } },
  { id: 'couch',      calc: c => c.couch && { v: `${c.num(c.couch.n)} ${t(c.couch.n === 1 ? 'stUnitDay' : 'stUnitDays')}`, p: { a: fmtDate(c.couch.a + 'T12:00:00'), b: fmtDate(c.couch.b + 'T12:00:00') } } },
  { id: 'nextRank',   calc: c => c.nextRank && { v: `+${c.num(c.nextRank.kg)} kg`, p: { n: c.nextRank.name, r: c.nextRank.label }, ico: rankMini(c.nextRank, 16) } },
  { id: 'ratio',      calc: c => c.ratio && { v: `${c.ratio.x.toFixed(1)}x`, p: { n: c.ratio.name } } },
  { id: 'repKing',    calc: c => c.repKing && { v: `${c.num(c.repKing.r)} ${t('stUnitReps')}`, p: { n: c.repKing.name } } },
  { id: 'big3',       calc: c => c.big3 && { v: `${c.num(Math.round(c.big3 * 10) / 10)} kg`, k: c.bw ? 'big3Bw' : 'big3', p: { n: (c.big3 / c.bw).toFixed(1) } } },
  { id: 'explorer',   calc: c => c.explorer && { v: c.num(c.explorer.n), p: { n: c.explorer.name } } },
  { id: 'loyal',      calc: c => c.loyal && { v: c.loyal.name, p: { n: c.loyal.n }, big: 1 } },
  { id: 'prs',        calc: c => c.prs && { v: c.num(c.prs), p: {} } },
];
// everything the table needs, worked out once per draw
function statsCtx(){
  const num = n => Number(n).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB'), ses = sessions, c = { ses, num };
  const top = m => { let b = null; m.forEach((n, k) => { if(!b || n > b.n) b = { k, n }; }); return b; };
  const ex = new Map(), mus = new Map(), wk = new Map(), wd = [0, 0, 0, 0, 0, 0, 0], days = new Set();
  const e1s = new Map(), firstSeen = new Map(), months = new Map(), wdPr = [0, 0, 0, 0, 0, 0, 0], dates = [];
  c.bw = (typeof latestWeight === 'function' && latestWeight()) || (targets && +targets.bw) || 0; if(!(c.bw > 30)) c.bw = 0;
  c.climb = 0; c.dayBest = null; c.nights = 0; c.dawns = 0; c.repKing = null;
  c.cmp = (kg, pre, whale) => { const w = kg / 150000, el = kg / 5000, car = kg / 1500, bag = kg / 25, r1 = n => c.num(Math.round(n * 10) / 10);   // a friendly comparison: blue whales, elephants, cars, then 25 kg bags
    return whale && w >= 1 ? { k: pre + 'Whale', p: { n: r1(w) } } : el >= 1 ? { k: pre + 'El', p: { n: r1(el) } } : car >= 1 ? { k: pre + 'Car', p: { n: r1(car) } } : { k: pre + 'Bag', p: { n: c.num(Math.round(bag)) } }; };
  c.sets = 0; c.kg = 0; c.heavy = null; c.longMin = 0; c.totMin = 0; c.early = null; c.late = null; c.prs = 0;
  ses.slice().sort((a, b) => String(a.start).localeCompare(String(b.start))).forEach(s => {
    let vol = 0; days.add(s.date); c.prs += (s.prs || []).length; wdPr[new Date(s.date + 'T12:00:00').getDay()] += (s.prs || []).length; dates.push(s.date);
    s.exercises.forEach(x => { const m = exById(x.exId).m, sets = x.sets.filter(st => st.done && isMainSet(st));
      if(sets.length){ if(!firstSeen.has(x.exId)) firstSeen.set(x.exId, s.start); const mk = s.date.slice(0, 7); if(!months.has(x.exId)) months.set(x.exId, new Set()); months.get(x.exId).add(mk); }
      if(sets.length){ ex.set(x.exId, (ex.get(x.exId) || 0) + sets.length); if(m && m !== 'cardio' && m !== 'other') mus.set(m, (mus.get(m) || 0) + sets.length); }
      sets.forEach(st => { c.sets++; const w = +st.w || 0, r = +st.r || 0; vol += w * r;
        const kg = loadOf(x.exId, w); c.climb += r * kg * 0.5 * 9.81;   // 0.5 m of bar travel per rep
        if(r > 0 && r <= 100 && (!c.repKing || r > c.repKing.r)) c.repKing = { r, name: exName(x.exId) };
        if(r >= 1 && r <= 12 && kg > 0){ const e = e1rm(w, r, x.exId); if(e > (e1s.get(x.exId) || 0)) e1s.set(x.exId, e); }
        if(r > 0 && r <= 12 && kg > 0 && (!c.heavy || kg > c.heavy.kg)) c.heavy = { kg, name: exName(x.exId) }; }); });
    const sv = +s.vol || vol; c.kg += sv; if(sv > 0 && (!c.dayBest || sv > c.dayBest.kg)) c.dayBest = { kg: sv, date: s.date };
    const a = new Date(s.start), b = s.end ? new Date(s.end) : null, min = b ? (b - a) / 6e4 : 0;
    if(min >= 5 && min <= 360){ c.longMin = Math.max(c.longMin, Math.round(min)); c.totMin += min; }
    const hm = a.getHours() * 60 + a.getMinutes(); if(!isNaN(hm)){ c.early = c.early == null ? hm : Math.min(c.early, hm); c.late = c.late == null ? hm : Math.max(c.late, hm); }
    if(!isNaN(hm)){ if(hm >= 21 * 60) c.nights++; if(hm < 7 * 60) c.dawns++; }
    wd[a.getDay()]++;   // Sunday = 0, as in wdFull
    const mon = addDays(s.date, -((new Date(s.date + 'T12:00:00').getDay() + 6) % 7)); wk.set(mon, (wk.get(mon) || 0) + 1);
  });
  const fe = top(ex), fm = top(mus), fw = Math.max(...wd);
  c.favEx = fe && { name: exName(fe.k), n: fe.n }; c.favMuscle = fm && GROUPS[fm.k] ? { name: GROUPS[fm.k][lang === 'el' ? 1 : 0], n: fm.n } : null;
  c.weekBest = Math.max(0, ...wk.values()); c.wdBest = fw > 0 ? wd.indexOf(fw) : null; c.wdN = fw;
  c.streakBest = typeof Streak !== 'undefined' ? Streak.view().best : 0;   // Change #13: the weekly streak's personal best (js/streak.js), not a second count
  c.climb = c.climb / (8849 * bodyW() * 9.81);   // Everest climbed carrying your own body weight (75 kg if unknown)
  const lw = Math.max(...wdPr); c.luckyN = lw; c.luckyWd = lw > 0 ? wdPr.indexOf(lw) : null;
  const ud = [...new Set(dates)].sort(); c.couch = null;
  if(ses.length >= 2) for(let i = 1; i < ud.length; i++){ const n = Math.round((new Date(ud[i] + 'T12:00:00') - new Date(ud[i - 1] + 'T12:00:00')) / 864e5); if(n >= 1 && (!c.couch || n > c.couch.n)) c.couch = { n, a: ud[i - 1], b: ud[i] }; }
  c.nextRank = null; c.ratio = null;
  e1s.forEach((e, id) => { const tf = tierFor(id); if(tf && tf.next && tf.next.kg != null && (!c.nextRank || tf.next.kg < c.nextRank.kg)) c.nextRank = { kg: tf.next.kg, name: exName(id), tier: tf.next.tier, n: tf.next.n, label: tf.next.label };
    if(c.bw && tierStd(id) && (!c.ratio || e / c.bw > c.ratio.x)) c.ratio = { x: e / c.bw, name: exName(id) }; });
  c.big3 = ['bench', 'squat', 'deadlift'].every(id => e1s.get(id) > 0) ? ['bench', 'squat', 'deadlift'].reduce((a, id) => a + e1s.get(id), 0) : 0;
  let nw = null; firstSeen.forEach((st, id) => { if(!nw || st >= nw.st) nw = { st, id }; }); c.explorer = nw && { n: firstSeen.size, name: exName(nw.id) };
  c.loyal = null; months.forEach((set, id) => { const ms = [...set].map(m => +m.slice(0, 4) * 12 + +m.slice(5, 7)).sort((a, b) => a - b); let run = 1, best = 1, last = ms[0];
    ms.forEach((m, i) => { if(!i) return; run = m === ms[i - 1] + 1 ? run + 1 : 1; if(run >= best){ best = run; last = m; } });
    if(best >= 2 && (!c.loyal || best > c.loyal.n || (best === c.loyal.n && last > c.loyal.last))) c.loyal = { n: best, last, name: exName(id) }; });
  c.hm = m => { const h = Math.floor(m / 60), mi = String(m % 60).padStart(2, '0'); return `${String(h).padStart(2, '0')}:${mi}`; };
  c.dur = m => m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min` : `${Math.round(m)} min`;
  return c;
}
// Change #12: six cards (two even columns of three rows; STAT_N is the one number to change): up to STAT_PIN_MAX pinned (yours, in your order, never rotated),
// the other slots filled from a rotation that changes once every 24 hours. The rotation (ui.statRot, this phone only) is saved with its next change time,
// so leaving the page, reloading or restarting never picks a new set early; the shuffle button is your own early pick (a new 24 hours start then).
const STAT_N = 6, STAT_PIN_MAX = 2, STAT_ROT_MS = 864e5;
// Refinements #8: no body weight in the Social Hub: the stat that divides by body weight is left out here, and Big Three shows its plain line
const STAT_HUB_HIDE = new Set(['ratio']);
// your pins as saved (profile.statPins, synced + in backups). Older versions allowed six: only the first two count, the saved list is not rewritten until you change it.
const statPins = () => (Array.isArray(profile.statPins) ? profile.statPins : []).filter(id => typeof id === 'string').slice(0, STAT_PIN_MAX);
// pure: pin / unpin one stat. → { pins, full } (full: two are pinned already; nothing changes until you choose one to replace)
function pinToggle(pins, id, replace){
  const p = pins.slice(0, STAT_PIN_MAX); if(p.includes(id)) return { pins: p.filter(x => x !== id), full: false };
  if(p.length < STAT_PIN_MAX) return { pins: p.concat(id), full: false };
  if(replace && p.includes(replace)) return { pins: p.filter(x => x !== replace).concat(id), full: false };
  return { pins: p, full: true };
}
// pure: the rotation. R = saved { at, next, ids, prev } or null; pool = ids of stats with data that are not pinned; now = ms.
// Keeps R until `next`; then picks STAT_N new ids (ones that were not in the last set first, so two days in a row never show the same set
// when there are enough stats). A stat that loses its data, or gets pinned, is replaced from the pool without rerolling the others.
function statRotate(R, pool, now){
  const seeded = seed => { let h = 2166136261; for(const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = (h + 0x6D2B79F5) | 0; let x = Math.imul(h ^ (h >>> 15), 1 | h); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  const mix = (list, rnd) => { const a = list.slice().sort(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ok = R && typeof R === 'object' && Array.isArray(R.ids) && isFinite(R.at) && isFinite(R.next);
  // keep the current set until its time is up (a clock moved back by more than a day counts as up, so it cannot stick for weeks)
  if(ok && now < R.next && now > R.at - STAT_ROT_MS){
    const ids = R.ids.filter(id => pool.includes(id)); if(ids.length >= Math.min(STAT_N, pool.length)) return { R, changed: false };
    const rnd = seeded(R.at + ':fill'), fresh = mix(pool.filter(id => !ids.includes(id)), rnd), notPrev = fresh.filter(id => !(R.prev || []).includes(id));
    return { R: { ...R, ids: ids.concat(notPrev, fresh.filter(id => !notPrev.includes(id))).slice(0, STAT_N) }, changed: true };
  }
  const last = ok ? R.ids : [], rnd = seeded(now), fresh = mix(pool.filter(id => !last.includes(id)), rnd), again = mix(pool.filter(id => last.includes(id)), rnd);
  return { R: { at: now, next: now + STAT_ROT_MS, ids: fresh.concat(again).slice(0, STAT_N), prev: last.slice(0, STAT_N) }, changed: true };
}
// what the grid shows: the pinned cards first, then the rotation for the free slots (never the same stat twice)
function statsPick(all, now){
  const pins = statPins().map(id => all.find(x => x.id === id)).filter(Boolean), pinIds = pins.map(x => x.id);
  const r = statRotate(ui.statRot, all.filter(x => !pinIds.includes(x.id)).map(x => x.id), now == null ? Date.now() : now);
  if(r.changed){ ui.statRot = r.R; saveUI(); }
  return pins.concat(r.R.ids.map(id => all.find(x => x.id === id)).filter(Boolean)).slice(0, STAT_N);
}
const ICO_PIN = '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 14v7"/>', ICO_SHUF = '<path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.4 0 2.4-1 3.3-2.3M13.2 9.3C14 8 15 7 16.5 7H20M17.5 4L20.5 7l-3 3M17.5 14l3 3-3 3"/>';
const pfIcon = (d, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
function statCards(){
  const c = statsCtx(), all = STATS.filter(x => !STAT_HUB_HIDE.has(x.id)).map(x => ({ id: x.id, r: x.calc(c) })).filter(x => x.r), pins = statPins();
  return all.length ? statsPick(all).map(x => { const on = pins.includes(x.id), r = x.r;
    return `<div class="pfstat${on ? ' pinned' : ''}"><button class="pfpin" type="button" data-statpin="${x.id}" aria-pressed="${on}" aria-label="${esc(t(on ? 'stUnpin' : 'stPin'))}">${pfIcon(ICO_PIN, 16)}</button>
      <small class="pfstt">${esc(t('stt_' + x.id))}</small><b class="${r.big ? 'txt' : ''}">${esc(r.v)}</b><span>${r.ico || ''}${esc(t('sts_' + (r.k === 'big3Bw' ? 'big3' : r.k || x.id), r.p))}</span></div>`; }).join('') : `<p class="pfempty">${esc(t('stEmpty'))}</p>`;
}
// a third pin: say the limit is reached and offer to replace the older pin (only on Replace; Cancel changes nothing)
async function togglePin(id){
  let r = pinToggle(statPins(), id);
  if(r.full){ const old = r.pins[0]; Phone.haptic();
    if(!(await ask(t('stPinFull', { n: STAT_PIN_MAX, a: t('stt_' + old), b: t('stt_' + id) }), t('stPinReplace')))) return;
    r = pinToggle(statPins(), id, old); }
  if(r.pins.length) profile.statPins = r.pins; else delete profile.statPins;
  saveProfile(); Phone.haptic(); renderProfile();
}

// ---------- 0.7.9 Add a 1RM (Profile › Leaderboards): lift, weight, date; your entries below with Delete ----------
function openOrm(exId){
  const sel = $('ormEx'); sel.innerHTML = BOARD_LIFTS.map(b => `<option value="${b.id}">${esc(exName(b.id))}</option>`).join('');
  sel.value = exId && isBoardLift(exId) ? exId : BOARD_LIFTS[0].id; if(typeof syncSel === 'function') syncSel(sel);
  $('ormW').value = ''; $('ormDate').value = todayKey(); $('ormDate').max = todayKey(); ormHint(); drawOrmList(); open('ovOrm');
}
// pull-ups: the weight is what you add on top of your body weight
function ormHint(){ const bw = exById($('ormEx').value).e === 'bodyweight'; $('ormBw').classList.toggle('hide', !bw); if(bw) $('ormBw').textContent = t('ormBwHint', { bw: fmt(bodyW()) }); }
function drawOrmList(){
  const L = ormList().slice().sort((a, b) => b.date.localeCompare(a.date));
  $('ormList').innerHTML = L.length ? `<h3 class="exsh">${esc(t('ormYours'))}</h3>` + L.map(o => `<div class="ormrow"><span><b>${esc(exName(o.exId))}</b><small>${fmt(o.w)} kg · ${esc(fmtDate(o.date + 'T12:00:00'))}</small></span>
      <button class="iconbtn" type="button" data-ormdel="${esc(o.id)}" aria-label="${esc(t('delete'))}">${svgIcon('trash', 20, 2)}</button></div>`).join('') : '';
}
function saveOrm(){
  const exId = $('ormEx').value, w = parseFloat(String($('ormW').value).replace(',', '.')), date = $('ormDate').value, bw = exById(exId).e === 'bodyweight';
  if(!isBoardLift(exId) || !(w > 0 || (bw && w === 0)) || w > 600 || !/^\d{4}-\d\d-\d\d$/.test(date) || date > todayKey()){ toast(t('ormBad')); return; }
  profile.orm = [...ormList(), { id: uid(), exId, w, date }]; saveProfile(); Phone.haptic(); close('ovOrm'); renderProfile(); toast(t('ormSaved'));
}
function delOrm(id){ profile.orm = ormList().filter(o => o.id !== id); if(!profile.orm.length) delete profile.orm; saveProfile(); drawOrmList(); renderProfile(); }

// ---------- Refinements #8 change 14: the friends leaderboard, one rep max only, one lift at a time ----------
// The pill on top drops down Bench Press, Deadlift, Squat (ui.pfLift remembers the choice). Rows: place, picture, name, weight (your kg / lb setting;
// stored in kg). Places 1-3 are gold, silver and bronze (--lb-gold/-silver/-bronze, theme.css); a shared weight shares the place, the first to lift it first.
// Friends need accounts and sync, which do not exist yet (0.8+): LB_FRIENDS is where their rows plug in; today it is empty.
const LB_LIFTS = ['bench', 'deadlift', 'squat'];
const LB_SHOW_ME = true;   // Petros has not confirmed showing you in the list: false leaves your row out (the "join" line still shows when you have no single)
const lbLift = () => LB_LIFTS.includes(ui.pfLift) ? ui.pfLift : LB_LIFTS[0];
let LB_FRIENDS = [];   // friends' best singles, once accounts and sync exist: [{ name, photo, initial, kg, date }] (empty until then)
const lbFriends = () => LB_FRIENDS;
const lbW = kg => bwU() === 'lb' ? `${Math.round(kg * LB)} lb` : `${fmt(Math.round(kg * 2) / 2)} kg`;
function lbRows(exId){
  const mine = boardBest(exId), me = mine && LB_SHOW_ME ? [{ me: true, name: (profile.name || Account.current().name || t('pfYou')).trim(), photo: pfPhoto(), initial: pfInitial(), kg: mine.kg, date: mine.date, src: mine.src }] : [];
  const L = lbFriends().filter(f => f && f.kg > 0).concat(me).sort((a, b) => b.kg - a.kg || String(a.date).localeCompare(String(b.date)));
  L.forEach((r, i) => { r.place = i && L[i - 1].kg === r.kg ? L[i - 1].place : i + 1; }); return { rows: L, mine };
}
function lbHtml(){
  const ex = lbLift(), { rows, mine } = lbRows(ex), friends = lbFriends().length;
  const pill = `<div class="lbpick"><button type="button" class="lbpill" data-lbpill aria-haspopup="listbox" aria-expanded="false"><span>${esc(exName(ex))}</span>${svgIcon('chevD', 18, 2.4)}</button>
      <div class="lbmenu" role="listbox" aria-label="${esc(t('pfBoards'))}">${LB_LIFTS.map(id => `<button type="button" role="option" class="lbopt${id === ex ? ' on' : ''}" data-lblift="${id}" aria-selected="${id === ex}"><span>${esc(exName(id))}</span>${id === ex ? svgIcon('check', 18, 2.4) : ''}</button>`).join('')}</div></div>`;
  const av = r => `<span class="lbav">${r.photo ? `<img class="avimg" src="${r.photo}" alt="">` : r.initial ? esc(r.initial) : svgIcon('user', 18, 2)}</span>`;
  const list = rows.map(r => `<button type="button" class="lbrow${r.me ? ' me' : ''}${r.place <= 3 ? ' lb' + r.place : ''}" data-lbrow>
      <b class="lbn">${r.place}</b>${av(r)}<span class="lbname"><span>${esc(r.name)}</span><small class="lbdate">${esc(fmtDate(r.date + 'T12:00:00'))}${r.src === 'manual' ? ` · ${esc(t('ormManual'))}` : ''}</small></span><b class="lbw">${lbW(r.kg)}</b></button>`).join('');
  const empty = !rows.length ? `<p class="pfempty lbempty"><b>${esc(t('lbNoneYet'))}</b>${esc(t(friends ? 'lbNoneSub' : 'lbNoFriends'))}</p>` : '';
  const join = !mine ? `<p class="pfline lbjoin">${esc(t('lbJoin'))}</p>${gOn('lbAtt') ? '' : `<p class="pfline lbjoin">${esc(t('lbJoinHow'))}</p>`}` : '';
  return `<h3 class="pfh">${svgIcon('podium', 18, 2)}<span>${esc(t('pfBoards'))}</span></h3><p class="pfsub">${esc(t('pfBoardsSub'))}</p>${pill}
    <div class="pfcard pfboards lblist" id="lbList">${list}${empty}${join}<button class="btn pform" type="button" data-orm>${svgIcon('plus', 18, 2.2)}<span>${esc(t('ormAdd'))}</span></button></div>`;
}
// the lift menu: drops down under the pill (transform and opacity only), closes on a pick, a tap elsewhere or Escape; the list cross-fades to the new lift
function lbMenu(show){ const p = document.querySelector('#pfBody .lbpick'); if(!p) return; p.classList.toggle('open', show); p.querySelector('[data-lbpill]').setAttribute('aria-expanded', String(show)); }
function lbPick(id){ if(!LB_LIFTS.includes(id)) return; lbMenu(false); if(id === lbLift()) return; ui.pfLift = id; saveUI(); Phone.haptic();
  const box = $('lbList'), go = () => { const y = $('pfBody').scrollTop; renderProfile(); $('pfBody').scrollTop = y; const nb = $('lbList'); if(nb){ nb.classList.add('lbin'); } };
  if(!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return go();
  box.classList.add('lbout'); setTimeout(go, 140); }

function renderProfile(){
  const box = $('pfBody'); if(!box) return;
  const d = profileData();
  const ring = d.live ? 'live' : d.trainedToday ? 'today' : '';
  // Refinements #8: the workout streak is a small frosted pill with a flame on the bottom right of your picture (its box is gone)
  // Change #13: a tap opens the streak window; the shield(s) next to the number are the Streak Savers you hold
  const streak = `<button type="button" class="pfstpill stk-${d.streak.state}" data-streak aria-label="${esc(streakLabel(d.streak))}">${flameIcon(d.streak.total, 14)}<b>${d.streak.total}</b>${saverMini(d.streak)}</button>`;
  const circles = `<div class="pfcircles" role="list">
      <div class="pfme ${ring}" role="listitem"><span class="pfavw"><button class="pfav" type="button" data-pfphoto aria-label="${esc(t('stProfile'))}">${d.photo ? `<img class="avimg" src="${d.photo}" alt="">` : d.initial ? esc(d.initial) : svgIcon('user', 34, 1.8)}</button>${streak}</span><small>${esc(t('pfYou'))}</small></div>
    </div>`;
  // Refinements #8 change 15: Highest Ranked Exercises, the whole width: your three best ranks, big plates with the rank name under each;
  // a tap on a plate pops a small bubble with the exercise (wire/04: data-rkbub). Fewer than three: quiet empty slots and one line on how to earn one.
  const picks = rankPicks(d.ranks), custom = Array.isArray(profile.rankPick) && profile.rankPick.length > 0;
  const slots = picks.map(r => `<button type="button" class="pfrkslot tr-${r.tier}" data-rkbub aria-label="${esc(r.name)} · ${esc(r.label)}">${rankMini(r, 76)}<b class="pfrkname">${esc(r.label)}</b><span class="rkbub" role="tooltip">${esc(r.name)}</span></button>`)
    .concat(Array.from({ length: Math.max(0, 3 - picks.length) }, () => `<span class="pfrkslot empty" aria-hidden="true"><i class="rkhole"></i></span>`)).join('');
  const rk = `<div class="pfrkrow">${slots}</div>${picks.length < 3 ? `<span class="pfline pfrkhint">${esc(t(d.tierNeed ? 'tierNeedBody' : picks.length ? 'pfRankMore' : 'pfNoRank'))}</span>` : ''}`;
  const rkBtns = `<span class="pfrkb"><button class="pflink" type="button" data-rkcustom>${esc(t('rkCustomize'))}</button>${custom ? `<button class="pflink" type="button" data-rkreset>${esc(t('rkReset'))}</button>` : ''}</span>`;
  box.innerHTML = circles
    + `<button class="btn pfshare" type="button" id="pfShare">${svgIcon('share', 18, 2.2)}<span>${esc(t('pfShare'))}</span></button>`
    + `<div class="pfcard pfpr pfrkfull${picks.length ? ' tr-' + picks[0].tier : ''}"><small class="pflab">${svgIcon('medal', 16, 2)}${esc(t('pfHighRank'))}</small>${rk}${d.ranks.length ? rkBtns : ''}</div>`
    + lbHtml()
    + `<h3 class="pfh">${svgIcon('progress', 18, 2)}<span>${esc(t('pfStats'))}</span><button class="iconbtn pfshuf" type="button" data-statshuf aria-label="${esc(t('stShuffle'))}">${pfIcon(ICO_SHUF, 20)}</button></h3>`
    + `<p class="pfsub">${esc(t(statPins().length >= STAT_PIN_MAX ? 'stPinsFull' : 'stPinsSub', { n: statPins().length, m: STAT_PIN_MAX }))}</p>`
    + `<div class="pfstatgrid">${statCards()}</div>`;
}
