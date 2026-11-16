// Social Hub tab (was Profile; 0.7.7): your circle, Share a Workout, streak, highest rank, leaderboards, stats. Settings opens from the gear (index.html).
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// Everything here is this phone's own data. Friends, live status and friend boards need accounts (0.8+): only their spaces are drawn.

// The board lifts: one leaderboard row each (lbl = string key of the muscle it stands for). Petros may still change this list.
const BOARD_LIFTS = [{ id: 'bench', lbl: 'pfMChest' }, { id: 'squat', lbl: 'pfMQuads' }, { id: 'deadlift', lbl: 'pfMBack' }];   // 0.7.10: the three main lifts; other exercises keep their rank on their own
// 0.7.10: Max PR = the heaviest real lift in kg; Strength = that lift per kg of body weight (the rank rating of the rank branch can replace it later, so a lighter lifter can top the board)
const boardMode = () => ui.pfBoard === 'str' ? 'str' : 'max';
const strengthOf = kg => { const bw = bodyW(); return bw > 0 && kg > 0 ? kg / bw : 0; };

// 0.7.9: a leaderboard entry is a REAL 1RM only: one you entered (profile.orm: { id, exId, w, date }) or a single rep at that weight,
// ticked in a workout (normal set, no warm-up, not the right side of L/R). w = the weight you typed; the board shows the lifted load
// (loadOf: pull-ups count body weight + added weight). → { kg, w, date, src: 'manual' | 'live' } or null.
const ormList = () => Array.isArray(profile.orm) ? profile.orm.filter(o => o && o.exId && +o.w >= 0 && o.date) : [];
function boardBest(exId, skip){   // skip = one set to leave out (to compare a fresh single with the best before it)
  let best = null; const take = (w, date, src) => { const kg = loadOf(exId, w); if(kg > 0 && (!best || kg > best.kg)) best = { kg, w: +w, date, src }; };
  ormList().forEach(o => { if(o.exId === exId) take(o.w, o.date, 'manual'); });
  const scan = (x, date) => { if(x.exId !== exId) return; x.sets.forEach(st => { if(st !== skip && st.done && isMainSet(st) && st.w !== '' && +st.r === 1) take(+st.w, date, 'live'); }); };
  sessions.forEach(s => s.exercises.forEach(x => scan(x, s.date))); if(active) active.exercises.forEach(x => scan(x, active.date));
  return best;
}
const isBoardLift = exId => BOARD_LIFTS.some(b => b.id === exId);

// ---------- 0.7.10 Highest Rank card: every exercise you have done, with the rank you hold in it (best first) ----------
// profile.rankPick = up to 3 exercise ids you chose (Customize); none = the single highest rank (Automatic)
function rankList(){
  if(!tierBody()) return [];
  const ids = new Set(); sessions.forEach(s => s.exercises.forEach(x => { if(x.sets.some(st => st.done)) ids.add(x.exId); }));
  return [...ids].map(exId => { const tf = tierFor(exId); return tf && tf.label ? { exId, n: tf.n, tier: tf.tier, label: tf.label, name: exName(exId) } : null; }).filter(Boolean)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
const rankPicks = ranks => { const ids = Array.isArray(profile.rankPick) ? profile.rankPick : [], got = ids.map(id => ranks.find(r => r.exId === id)).filter(Boolean).slice(0, 3); return got.length ? got : ranks.slice(0, 1); };
const rankMini = (r, size) => `<span class="pftier rk tr-${r.tier}" role="img" aria-label="${esc(r.label)}">${rankIcon(r.tier, r.n, size)}</span>`;
function openRankPick(){ $('rkSearch').value = ''; drawRankPick(); open('ovRank'); }
function drawRankPick(){
  const q = $('rkSearch').value.trim().toLowerCase(), ranks = rankList(), picked = Array.isArray(profile.rankPick) ? profile.rankPick : [];
  $('rkCount').textContent = t('rkPicked', { n: picked.filter(id => ranks.some(r => r.exId === id)).length });
  $('rkList').innerHTML = ranks.filter(r => !q || r.name.toLowerCase().includes(q)).map(r => { const on = picked.includes(r.exId);
    return `<button type="button" class="rkrow${on ? ' on' : ''}" data-rkpick="${esc(r.exId)}" aria-pressed="${on}">${rankMini(r, 30)}<span class="pfrn"><b>${esc(r.name)}</b><small>${esc(r.label)}</small></span>${on ? svgIcon('check', 20, 2.4) : ''}</button>`; }).join('')
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
//   streak : { n, color? }               — workouts in the current streak (0 until gym-streak)
//   tierOf : (exId, e1) => null | { label, tier, n, color? }   (0.7.9: drawn as the rank emblem, rankIcon in gym.js)   — the tier badge for a board row (gym-tiers); tierNeed: body weight or sex missing
function profileData(){
  const me = Account.current(), today = todayKey();
  const streak = gymStreak();                              // gym-streak (gym.js)
  // gym-tiers: Bronze 3 … Diamond 1 from tierFor() (gym.js); colour = the tier's theme-aware colour (workout.css --tier-*)
  const tierOf = (exId, e1) => { const tf = tierFor(exId, e1); return tf && tf.label ? { label: tf.label, tier: tf.tier, n: tf.n, color: `var(--tier-${tf.tier})` } : null; };
  // PRs saved with each finished workout (weight PRs carry weight × reps; volume PRs are counted too)
  const prs = sessions.flatMap(s => (s.prs || []).map(p => ({ ...p, date: s.date, start: s.start })));
  const wts = Object.entries(weights || {}).filter(([, w]) => +w > 0).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([d, w]) => ({ d, w: +w }));
  return {
    initial: pfInitial(), photo: pfPhoto(),   // 0.7.9: Settings › Photo and Name (ui.js)
    live: !!active, trainedToday: sessions.some(s => s.date === today),
    streak, ranks: rankList(),
    tierNeed: !tierBody(),                                // no body weight or sex yet: one line asking for them, no tiers
    boards: BOARD_LIFTS.map(b => { const best = boardBest(b.id); return { ...b, best, e1: best ? best.kg : 0, str: best ? strengthOf(best.kg) : 0, tier: best ? tierOf(b.id, best.kg) : null }; }).filter(b => b.best)
      .sort((x, y) => boardMode() === 'str' ? y.str - x.str : y.e1 - x.e1),   // 0.7.9: only lifts with a real 1RM
    weights: wts,
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
  { id: 'mountain',   calc: c => c.climb > 0 && { v: `${(Math.round(c.climb * 10) / 10).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`, p: {} } },
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
  // longest streak: workouts in a row with at most 2 days off between them
  const ds = [...days].sort(); let run = 0, best = 0, prev = null;
  ds.forEach(d => { const n = ses.filter(s => s.date === d).length; run = prev && (new Date(d) - new Date(prev)) / 864e5 <= 3 ? run + n : n; best = Math.max(best, run); prev = d; }); c.streakBest = best;
  c.climb = c.climb / (8849 * bodyW() * 9.81);   // Everest climbed carrying your own body weight (75 kg if unknown)
  const lw = Math.max(...wdPr); c.luckyN = lw; c.luckyWd = lw > 0 ? wdPr.indexOf(lw) : null;
  const ud = [...new Set(dates)].sort(); c.couch = null;
  if(ses.length >= 2) for(let i = 1; i < ud.length; i++){ const n = Math.round((new Date(ud[i] + 'T12:00:00') - new Date(ud[i - 1] + 'T12:00:00')) / 864e5); if(n >= 1 && (!c.couch || n > c.couch.n)) c.couch = { n, a: ud[i - 1], b: ud[i] }; }
  c.nextRank = null; c.ratio = null;
  e1s.forEach((e, id) => { const tf = tierFor(id); if(tf && tf.next && (!c.nextRank || tf.next.kg < c.nextRank.kg)) c.nextRank = { kg: tf.next.kg, name: exName(id), tier: tf.next.tier, n: tf.next.n, label: tf.next.label };
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
// today's five: pinned first, then a shuffle seeded by the date (stable all day, new tomorrow); the shuffle button bumps ui.statShuf.n
function statsPick(all){
  const pins = (Array.isArray(profile.statPins) ? profile.statPins : []).map(id => all.find(x => x.id === id)).filter(Boolean).slice(0, 5);
  const sh = ui.statShuf && ui.statShuf.d === todayKey() ? ui.statShuf.n : 0; let h = 2166136261; for(const ch of todayKey() + ':' + sh) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = (h + 0x6D2B79F5) | 0; let x = Math.imul(h ^ (h >>> 15), 1 | h); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const rest = all.filter(x => !pins.includes(x)).sort((a, b) => a.id.localeCompare(b.id)); for(let i = rest.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  return pins.concat(rest).slice(0, Math.max(5, pins.length));
}
const ICO_PIN = '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 14v7"/>', ICO_SHUF = '<path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.4 0 2.4-1 3.3-2.3M13.2 9.3C14 8 15 7 16.5 7H20M17.5 4L20.5 7l-3 3M17.5 14l3 3-3 3"/>';
const pfIcon = (d, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
function statCards(){
  const c = statsCtx(), all = STATS.map(x => ({ id: x.id, r: x.calc(c) })).filter(x => x.r), pins = Array.isArray(profile.statPins) ? profile.statPins : [];
  return all.length ? statsPick(all).map(x => { const on = pins.includes(x.id), r = x.r;
    return `<div class="pfstat${on ? ' pinned' : ''}"><button class="pfpin" type="button" data-statpin="${x.id}" aria-pressed="${on}" aria-label="${esc(t(on ? 'stUnpin' : 'stPin'))}">${pfIcon(ICO_PIN, 16)}</button>
      <small>${esc(t('stt_' + x.id))}</small><b class="${r.big ? 'txt' : ''}">${esc(r.v)}</b><span>${r.ico || ''}${esc(t('sts_' + (r.k || x.id), r.p))}</span></div>`; }).join('') : `<p class="pfempty">${esc(t('stEmpty'))}</p>`;
}
function togglePin(id){
  const pins = (Array.isArray(profile.statPins) ? profile.statPins : []).slice();
  if(pins.includes(id)) pins.splice(pins.indexOf(id), 1); else if(pins.length >= 5){ toast(t('stPinMax')); return; } else pins.push(id);
  if(pins.length) profile.statPins = pins; else delete profile.statPins; saveProfile(); Phone.haptic(); renderProfile();
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

// small line chart of the latest weigh-ins (theme colours, no labels inside)
function pfWeightChart(pts){
  if(pts.length < 2) return '';
  const W = 300, H = 72, P = 6, ws = pts.map(p => p.w), lo = Math.min(...ws), hi = Math.max(...ws), span = hi - lo || 1;
  const xy = pts.map((p, i) => [P + i * (W - 2 * P) / (pts.length - 1), H - P - (p.w - lo) / span * (H - 2 * P)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(''), [lx, ly] = xy[xy.length - 1];
  return `<svg class="pfchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${line}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5" fill="currentColor"/></svg>`;
}

function renderProfile(){
  const box = $('pfBody'); if(!box) return;
  const d = profileData(), kg = v => `${fmt(Math.round(v * 2) / 2)} kg`, num = n => Number(n).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB');
  const ring = d.live ? 'live' : d.trainedToday ? 'today' : '';
  const circles = `<div class="pfcircles" role="list">
      <div class="pfme ${ring}" role="listitem"><button class="pfav" type="button" data-pfphoto aria-label="${esc(t('stProfile'))}">${d.photo ? `<img class="avimg" src="${d.photo}" alt="">` : d.initial ? esc(d.initial) : svgIcon('user', 34, 1.8)}</button><small>${esc(t('pfYou'))}</small></div>
      <div class="pffr" role="listitem"><span class="pfav">${svgIcon('users', 22, 1.8)}</span><small>${esc(t('pfFriendsSoon'))}</small></div>
    </div>`;
  const picks = rankPicks(d.ranks), custom = Array.isArray(profile.rankPick) && profile.rankPick.length > 0;
  const rk = !picks.length ? `<span class="pfline">${esc(t(d.tierNeed ? 'tierNeedBody' : 'pfNoRank'))}</span>`
    : picks.length === 1 ? `<div class="pfrk1">${rankMini(picks[0], 44)}<span class="pfrn"><b class="pfbig">${esc(picks[0].name)}</b><small>${esc(picks[0].label)}</small></span></div>`
    : `<div class="pfrk3">${picks.map(r => `<span class="pfrkc">${rankMini(r, 34)}<small>${esc(r.name)}</small></span>`).join('')}</div>`;
  const rkBtns = `<span class="pfrkb"><button class="pflink" type="button" data-rkcustom>${esc(t('rkCustomize'))}</button>${custom ? `<button class="pflink" type="button" data-rkreset>${esc(t('rkReset'))}</button>` : ''}</span>`;
  const strMode = boardMode() === 'str';
  const rows = d.boards.map(b => `<div class="pfrow"><span class="pfrn"><b>${esc(exName(b.id))}</b><small>${esc(t(b.lbl))} · ${esc(fmtDate(b.best.date + 'T12:00:00'))}${b.best.src === 'manual' ? ` · ${esc(t('ormManual'))}` : ''}</small></span>
      ${b.tier ? `<span class="pftier rk tr-${b.tier.tier}" role="img" aria-label="${esc(b.tier.label)}" title="${esc(b.tier.label)}">${rankIcon(b.tier.tier, b.tier.n, 30)}</span>` : ''}<span class="pfrv">${strMode ? (b.str ? `${b.str.toFixed(2)} <small>${esc(t('pfXBw'))}</small>` : '–') : b.e1 ? kg(b.e1) : '–'}</span></div>`).join('');
  const boardSw = `<div class="seg pfboardsw" id="pfBoardSw" role="group" aria-label="${esc(t('pfBoards'))}"><button type="button" data-pfboard="max" class="${strMode ? '' : 'on'}">${esc(t('pfMaxPR'))}</button><button type="button" data-pfboard="str" class="${strMode ? 'on' : ''}">${esc(t('pfStrength'))}</button></div>`;
  const w = d.weights, wl = w.length ? w[w.length - 1].w : null, wd = w.length > 1 ? Math.round((wl - w[0].w) * 10) / 10 : null;
  const wCard = `<div class="pfcard pfwt"><div class="pfhead"><span>${esc(t('pfWeight'))}</span>${wl ? `<b>${bwOut(wl)} ${bwU()}${wd ? ` <small>${wd > 0 ? '+' : '−'}${bwOut(Math.abs(wd))}</small>` : ''}</b>` : ''}</div>
      ${w.length > 1 ? pfWeightChart(w) : `<span class="pfline">${esc(t('pfNoWeight'))}</span>`}</div>`;
  box.innerHTML = circles
    + `<button class="btn pfshare" type="button" id="pfShare">${svgIcon('share', 18, 2.2)}<span>${esc(t('pfShare'))}</span></button>`
    + `<div class="pfduo"><div class="pfcard pfstreak"><span class="pfic">${flameIcon(d.streak.n, 26)}</span><b class="pfnum">${d.streak.n}</b><small>${esc(t('pfStreak'))}</small></div>
        <div class="pfcard pfpr"><small class="pflab">${svgIcon('medal', 16, 2)}${esc(t('pfHighRank'))}</small>${rk}${d.ranks.length ? rkBtns : ''}</div></div>`
    + `<h3 class="pfh">${svgIcon('podium', 18, 2)}<span>${esc(t('pfBoards'))}</span></h3><p class="pfsub">${esc(t(strMode ? 'pfBoardsSubStr' : 'pfBoardsSub'))}</p>${boardSw}${d.tierNeed ? `<button class="tierneed pfneed" type="button" data-tierbody>${esc(t('tierNeedBody'))}</button>` : ''}<div class="pfcard pfboards">${rows || `<p class="pfempty">${esc(t('pfBoardsEmpty'))}</p>`}<button class="btn pform" type="button" data-orm>${svgIcon('plus', 18, 2.2)}<span>${esc(t('ormAdd'))}</span></button></div>`
    + wCard
    + `<h3 class="pfh">${svgIcon('progress', 18, 2)}<span>${esc(t('pfStats'))}</span><button class="iconbtn pfshuf" type="button" data-statshuf aria-label="${esc(t('stShuffle'))}">${pfIcon(ICO_SHUF, 20)}</button></h3>`
    + `<div class="pfstatgrid">${statCards()}</div>`;
}
