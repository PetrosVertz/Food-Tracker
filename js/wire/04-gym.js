// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const BIG_HEADS = new Set(['chest_mid','chest_upper','lats','upper_back','lower_back','quads','hamstrings','glutes','adductors']);

const MUSCLES = Object.fromEntries([...Object.entries(GROUPS).map(([k, v]) => [k, [v[0], v[1]]]), ...Object.entries(HEADS).map(([k, v]) => [k, [v[0], v[1]]]),
  ['side_delts', ['Side delts','Πλάγιοι δελτοειδείς']], ['rear_delts', ['Rear delts','Οπίσθιοι δελτοειδείς']], ['biceps', ['Biceps','Δικέφαλοι']], ['triceps', ['Triceps','Τρικέφαλοι']], ['abs', ['Abs','Κοιλιακοί']]]);

const ML = k => (MUSCLES[k] || MUSCLES.other)[lang === 'el' ? 1 : 0], EL = k => (EQUIP[k] || EQUIP.machine)[lang === 'el' ? 1 : 0];

const HEAVY = new Set(['bench','incline_bench','squat','front_squat','deadlift','sumo_deadlift','trap_bar_dl','ohp']);

const LIB = LIB_RAW.map(([id, en, el, eq, p, mu]) => { const m_ = parseMu(mu), th = topHead(m_);
  return { id, en, el, al: ALSO[id] || [], e: EQ[eq], p, mu: m_, h: th, m: HEADS[th] ? HEADS[th][2] : 'other', rest: HEAVY.has(id) ? 180 : REST_BY_PATTERN[p] ?? 90 }; });

let exCustom = Store.load('exCustom', []), tpls = Store.load('tpls', null), gymPlan = Store.load('gymPlan', {}), sessions = Store.load('sessions', []), active = Store.load('active', null), comeback = Store.load('comeback', null);

const EX = () => (_exc && _exc.n === exCustom.length) ? _exc.l : (_exc = { n: exCustom.length, l: LIB.concat(exCustom.map(normEx)) }).l;

const exById = id => EX().find(x => x.id === id) || normEx({ id, en: id, el: id, m: 'other', e: 'machine', rest: 90 });

// 0.6.9: exercise names are titles — a capital on every word ("Lateral Raise")
const exTitle = s => String(s || '').replace(/(^|[\s(\-/])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
const exName = x => exTitle((typeof x === 'string' ? exById(x) : x)[lang === 'el' ? 'el' : 'en']);

const isCardio = id => exById(id).m === 'cardio';

const r25 = (x, e) => e === 'dumbbell' ? Math.round(x) : Math.round(x / 2.5) * 2.5;

const repRange = s => { const m = String(s || '').match(/(\d+)\s*[-–]\s*(\d+)/); if(m) return [+m[1], +m[2]]; const n = parseInt(s); return n ? [n, n] : [8, 12]; };

const defReps = rest => rest >= 180 ? '5-8' : rest >= 120 ? '8-12' : rest >= 90 ? '10-15' : '12-20';

// 0.7.1: your latest weigh-in, then the target body weight, then 75
const bodyW = () => { const w = typeof weights === 'object' && weights ? weights : {}, k = Object.keys(w).filter(d => +w[d] > 30).sort().pop(); return (k && +w[k]) || (targets && targets.bw) || 75; };
const gymIsAssist = exId => { const ex = exById(exId); return !!ex && /assist/i.test(`${ex.id} ${ex.en || ''}`); };
const gymBwDash = exId => { const ex = exById(exId); return !!ex && (ex.e === 'bodyweight' || gymIsAssist(exId)); };   // kg box starts with a dash

const e1rm = (w, r, id) => { const load_ = loadOf(id, w); return r >= 1 && r <= 20 && load_ > 0 ? load_ * (1 + r / 30) : 0; };

const fmtRest = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;

const saveG = k => Store.save(GKEY[k], { custom: exCustom, tpl: tpls, plan: gymPlan, ses: sessions, act: active, cb: comeback }[k]);

if(!tpls){
  const mk = (name, type, ids) => ({ id: uid(), name, type, exercises: ids.map(([id, sets]) => ({ exId: id, sets, reps: isCardio(id) ? '20' : defReps(exById(id).rest), rest: exById(id).rest })) });
  tpls = [];
  saveG('tpl');
}

// ---------- weekly plan feeds Today's food ----------
const WD = () => t('wdShort').split(' ');   // index = getDay(), Sunday first

$('gPlanV').addEventListener('change', e => {
  const row = e.target.closest('[data-wd]'); if(!row) return; const wd = +row.dataset.wd; const p = gymPlan[wd] || {};
  if(e.target.matches('[data-ptpl]')){ p.tpl = e.target.value || null; if(p.tpl && p.tpl !== 'rest' && !p.time) p.time = '18:00'; }
  if(e.target.matches('[data-ptime]')) p.time = e.target.value;
  if(p.tpl || p.work) gymPlan[wd] = p; else delete gymPlan[wd];
  saveG('plan'); renderGymPlan(); renderToday(); toast(t('planSaved'));
});

// the weight a set really moved: body weight + belt on bodyweight moves, body weight − assistance on assisted machines
const loadOf = (exId, w) => gymIsAssist(exId) ? Math.max(0, bodyW() - (+w || 0)) : exById(exId).e === 'bodyweight' ? bodyW() + (+w || 0) : (+w || 0);
// 0.7.1 calories: counted from the sets you did, not the time (rest and a forgotten open workout don't add any).
// About a third of a kcal per kg of body weight per working set, more for big muscles and more reps; warm-ups, drops and single sides count less.
function gymSetKcal(exId, s, bw){
  if(isCardio(exId)) return +s.cal > 0 ? +s.cal : bw * 7 * (+s.r || 0) / 60;   // calories typed from the machine win
  const mu = exById(exId).mu || {}, big = Object.entries(mu).reduce((a, [h, v]) => a + (BIG_HEADS.has(h) ? v : 0), 0) / 100;
  const reps = Math.min(1.4, Math.max(.7, Math.sqrt((+s.r || 8) / 10)));
  return bw * .33 * (.75 + .45 * big) * reps * (s.type === 'W' ? .5 : 1) * (s.drop ? .6 : 1) * (s.side ? .6 : 1); }

// a set that counts on its own: not a warm-up, not the R half of an L/R pair, not a drop under another set
const isMainSet = s => s.type !== 'W' && s.side !== 'R' && !s.drop;

const exVol = (exId, sets) => sets.filter(s => s.done && s.type !== 'W').reduce((a, s) => a + loadOf(exId, s.w) * (+s.r || 0), 0);

const exAt = el => { const c = el.closest('[data-x]'); return c ? active.exercises[+c.dataset.x] : null; };

$('sesBody').addEventListener('input', e => {
  const x = exAt(e.target), row = e.target.closest('[data-s]'); if(!x || !row) return; const s = x.sets[+row.dataset.s];
  if(e.target.matches('[data-w]')) s.w = e.target.value.replace(',', '.'); if(e.target.matches('[data-r]')) s.r = e.target.value; if(e.target.matches('[data-cal]')) s.cal = e.target.value; if(e.target.matches('[data-lvl]')) s.lvl = e.target.value; saveG('act');
});
// 0.7.10.4: half reps / negatives are picked on the scroll wheel (openSx in gym.js), not typed
$('sesBody').addEventListener('click', e => { const b = e.target.closest('[data-sxpick]'); if(!b) return; const x = exAt(b), row = b.closest('[data-sxrow]'); if(!x || !row) return; Phone.haptic(); openSx(x, +row.dataset.sxrow, b.dataset.sxpick); });
$('sxWheel').addEventListener('scroll', e => { const w = e.target; if(!SX || !w._set) return; const n = Math.max(0, Math.min(30, Math.round(w.scrollTop / 30)));
  if(n !== (SX.v || 0)){ SX.v = n; Phone.vibrate(5); w.querySelectorAll('[data-wn]').forEach(d => d.classList.toggle('on', +d.dataset.wn === n)); } });
$('sxWheel').addEventListener('click', e => { const d = e.target.closest('[data-wn]'); if(d) $('sxWheel').scrollTo({ top: +d.dataset.wn * 30, behavior: 'smooth' }); });
$('sxDone').addEventListener('click', () => { close('ovSx'); sxSave(); });
$('sxClear').addEventListener('click', () => { if(SX) SX.v = null; close('ovSx'); sxSave(); });
$('ovSx').addEventListener('click', e => { if(e.target === $('ovSx')) sxSave(); });   // tapping outside saves (the generic handler closes the window)


$('sesBody').addEventListener('click', e => {
  const ab = e.target.closest('[data-attempt]'); if(ab) return atToggle(+ab.closest('.exc').dataset.x);   // trophy: Leaderboard Attempt on this exercise
  const rs = e.target.closest('[data-rs]'); if(rs) return restAdjust(rs.dataset.rs);
  const sp = e.target.closest('[data-step]'); if(sp) return stepSet(sp);
  if(e.target.closest('[data-exset]')){ Phone.haptic(); return openExSet(); }
  const tb = e.target.closest('[data-tierinfo]'); if(tb){ Phone.haptic(); return showTierGap(tb); }
  // tiers need body weight + sex: open Settings › Body on top of the workout; after Save the cards redraw with their tier
  if(e.target.closest('[data-tierbody]')){ Phone.haptic(); fillSettings(); open('ovSBody'); $('sBodySave').addEventListener('click', () => { if(active) renderSession(); }, { once: true }); return; }
  const rr = e.target.closest('[data-rir]'); if(rr){ const rx = exAt(rr), rw = rr.closest('[data-sxrow]'), rs2 = rx && rw && rx.sets[+rw.dataset.sxrow]; if(rs2){ const k = +rr.dataset.rir; if(rs2.rir === k) delete rs2.rir; else rs2.rir = k; saveG('act'); renderSession(); } return; }
  const dm = e.target.closest('[data-demo]'); if(dm){ const dx = exAt(dm); if(dx) openDemo(dx.exId); return; }
  const x = exAt(e.target); if(!x) return; const xi = active.exercises.indexOf(x), row = e.target.closest('[data-s]'), s = row ? x.sets[+row.dataset.s] : null;
  if(e.target.closest('[data-uni]')){ makeUni(x, !x.uni); saveG('act'); renderSession(); return; }   // L / R: one side at a time
  if(e.target.closest('[data-info]')) return openExInfo(x.exId);
  if(e.target.closest('[data-adddrop]')){ const j = x.sets.map((z, k) => z.drop ? k : -1).filter(k => k >= 0).pop(); if(j !== undefined) addDrop(x, j); saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-type]') && s){ const j = +row.dataset.s;
    if(s.drop){ if(!hideM('D')){ addDrop(x, j); saveG('act'); renderSession(); } return; }   // ↘ on a drop: one more drop
    const cyc = ['N', 'W', 'D', 'F']; let nt = s.type; for(let q = 0; q < 4; q++){ nt = cyc[(cyc.indexOf(nt) + 1) % 4]; if(nt === 'N' || !hideM(nt)) break; }   // skip the markers hidden in Exercise Settings
    if(nt === s.type) return; s.type = nt;
    if(s.type === 'D' && !(x.sets[j + 1] || {}).drop) addDrop(x, j);   // Drop Set: a lighter row appears under it
    if(s.type === 'F'){ while(x.sets[j + 1] && x.sets[j + 1].drop && !x.sets[j + 1].done) x.sets.splice(j + 1, 1); }
    saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-ok]') && s){ tickSet(x, s, row, xi, +row.dataset.s); return; }
  if(e.target.closest('[data-addset]')){ if(!x.t0) x.t0 = Date.now(); if(x.uni) x.sets.push(...uniPair()); else x.sets.push(newSet()); saveG('act'); renderSession(); focusSet(xi, x.sets.length - (x.uni ? 2 : 1)); return; }
  if(e.target.closest('[data-endex]')){ if(REST && REST.xi === xi){ REST = null; autoEndMark(0); }   // ending the exercise stops its rest timer
    x.ended = true; if(x.t0 && !x.t1) x.t1 = Date.now(); x.sets = x.sets.filter(z => z.done || (!z.auto && (z.w !== '' || z.r !== ''))); delete active.cur; saveG('act'); renderSession();
    const next = active.exercises.findIndex(z => !z.ended); setTimeout(() => showCard(next >= 0 ? document.querySelector(`.exc[data-x="${next}"]`) : $('sesAddEx')), 60); return; }
  if(e.target.closest('[data-reopen]')){ x.ended = false; x.t1 = null; saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-rest]')){ const opts = [60, 90, 120, 150, 180, 240, 300]; x.rest = opts[(opts.indexOf(x.rest) + 1) % opts.length] || 90; saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-warm]')){ const sug = suggestFor(x.exId, x.reps); x.sets.unshift(...warmupFor(x.exId, sug.w).map(w => ({ id: uid(), type: 'W', w: String(w.w), r: String(w.r), done: false }))); saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-swap]')){ openSwap(xi); return; }
  if(e.target.closest('[data-xrm]')){ active.exercises.splice(xi, 1); if(REST && REST.xi === xi) REST = null; saveG('act'); renderSession(); return; }
});

$('sesSupps').addEventListener('click', e => {
  const b = e.target.closest('[data-ssup]'); if(!b) return; const k = todayKey(); suppLog[k] = suppLog[k] || {};
  if(suppLog[k][b.dataset.ssup]) delete suppLog[k][b.dataset.ssup]; else suppLog[k][b.dataset.ssup] = true; Store.save('suppLog', suppLog); renderSession(); renderSupps();
});

const bestVolBefore = exId => { const h = exHistory(exId, active && active.id); return h.length ? Math.max(...h.map(z => exVol(exId, z.sets.map(s => ({ ...s, done: true }))))) : 0; };


$('restBar').addEventListener('click', e => { const b = e.target.closest('[data-rs]'); if(b) restAdjust(b.dataset.rs); });

setInterval(() => { tickRest(); tickClock(); }, 500);

const exScore = (x, key) => HEADS[key] ? (x.mu[key] || 0) : Object.entries(x.mu).filter(([h]) => HEADS[h] && HEADS[h][2] === key).reduce((a, [, v]) => a + v, 0);

$('exSearch').addEventListener('input', drawExPick);
// Refinements change 16: Search / Return on the keyboard picks the first (lit) result; scrolling near the end shows more results
$('exSearch').addEventListener('keydown', e => { if(e.key !== 'Enter' || e.isComposing) return; const f = $('pkBody').querySelector('.exsr > .exrow.exbest'); if(!f) return; e.preventDefault(); $('exSearch').blur(); f.click(); });
$('ovExPick').addEventListener('scroll', exSearchMore, { capture: true, passive: true });
// while searching, the pills step aside so the results get the room (0.7.9.6: the box stays at the bottom, above the keyboard)
const gymPkSearching = () => $('ovExPick').querySelector('.sheet').classList.toggle('pksearching', document.activeElement === $('exSearch') || !!$('exSearch').value.trim());
['focus', 'input', 'blur'].forEach(k => $('exSearch').addEventListener(k, () => setTimeout(gymPkSearching, 0)));
if(window.visualViewport){ visualViewport.addEventListener('resize', pkFit); visualViewport.addEventListener('scroll', pkFit); }   // 0.7.9.6: search strip above the keyboard
$('pkBody').addEventListener('change', e => { if(e.target.id === 'pkSortMu'){ ui.pkSortMu = e.target.checked; saveUI(); drawExPick(); } });   // one list by muscle usage

document.querySelectorAll('#pkRegion button').forEach(b => b.addEventListener('click', () => { PK.region = b.dataset.v; PK.group = null; PK.head = null; ui.pkRegion = PK.region; saveUI(); drawExPick(); }));

document.querySelectorAll('#pkMode button').forEach(b => b.addEventListener('click', () => { PK.mode = b.dataset.v; ui.pkMode = PK.mode; saveUI(); drawExPick(); }));

$('pkBody').addEventListener('click', e => {
  const inf = e.target.closest('[data-exinfo]'); if(inf){ e.stopPropagation(); openExInfo(inf.dataset.exinfo, PK.cb); return; }
  if(e.target.closest('[data-hh]:not([data-hh=""])')) return;   // a muscle on the body: wire/05 lights it up, then opens it
  const g = e.target.closest('[data-g],[data-grp]'); if(g){ PK.group = g.dataset.g || g.dataset.grp; PK.head = null; drawExPick(); return; }
  const hd = e.target.closest('[data-head]'); if(hd){ PK.head = hd.dataset.head || null; drawExPick(); return; }
  if(e.target.closest('[data-pkback]')){ PK.group = null; PK.head = null; drawExPick(); return; }
  const n = e.target.closest('[data-new]');
  if(n){ const name = $('exSearch').value.trim(), hh = PK.head || (PK.group ? Object.keys(HEADS).find(k => HEADS[k][2] === PK.group) : 'chest_mid');
    const x = { id: 'c_' + uid(), en: name, el: name, e: 'machine', p: 'press_h', mu: { [hh]: 100 }, h: hh, m: HEADS[hh][2], rest: 90, custom: true };
    exCustom.push(x); saveG('custom'); close('ovExPick'); PK.cb && PK.cb(x.id); return; }
  const b = e.target.closest('[data-ex]'); if(b){ close('ovExPick'); PK.cb && PK.cb(b.dataset.ex); }
});

$('sesAddEx').addEventListener('click', () => openExPick(addToSession));


$('swList').addEventListener('click', e => {
  const inf = e.target.closest('[data-exinfo]'); if(inf){ e.stopPropagation(); openExInfo(inf.dataset.exinfo); return; }
  const b = e.target.closest('[data-ex]'); if(!b) return; const x = active.exercises[SW.xi], nx = exById(b.dataset.ex);
  x.exId = nx.id; x.rest = nx.rest; x.volPR = false; x.sets = x.sets.filter(s => s.done).length ? x.sets.filter(s => !s.done).length ? x.sets.map(s => s.done ? s : newSet()) : [...x.sets, newSet()] : x.sets.filter(s => s.type !== 'W').map(() => newSet());
  if(!x.sets.length) x.sets = [newSet()];
  saveG('act'); close('ovSwap'); renderSession(); toast(t('swapped', { n: exName(nx) }));
});

$('sesNext').addEventListener('click', openNext);

$('nxBody').addEventListener('click', async e => {
  const inf = e.target.closest('[data-exinfo]'); if(inf){ e.stopPropagation(); openExInfo(inf.dataset.exinfo, addToSession); return; }
  const b = e.target.closest('[data-ex]'); if(b){ close('ovNext'); addToSession(b.dataset.ex); return; }
  const ai = e.target.closest('#nxAI'); if(!ai || ai.disabled) return;
  ai.disabled = true; ai.textContent = t('gThinking');
  try{
    const done = active.exercises.map(x => `${exById(x.exId).en}: ${x.sets.filter(s => s.done && s.type !== 'W').map(s => `${s.w}x${s.r}`).join(', ') || 'planned'}`).join('; ');
    const wk = hitsFrom(sessions.filter(s => -daysUntil(s.date) <= 6), false), wkTxt = Object.entries(wk).map(([h, v]) => `${HEADS[h][0]} ${Math.round(v)} sets`).join(', ');
    const names = EX().filter(x => x.m !== 'cardio').map(x => x.en).join('; ');
    const r = await gemini(`You are a gym coach. Today's workout type: ${active.type}. Done so far: ${done || 'nothing yet'}. Hard sets per muscle in the last 7 days: ${wkTxt || 'none'}. Goal: ${targets ? targets.goal : 'build muscle'}.
${gymStyleRule()}${AI.knows('gym')}
Suggest the 3 best next exercises to balance this session (fill muscles that are missing, avoid overdoing ones already hit). Pick ONLY from this list, using the exact English names: ${names}.
Reply in ${lang === 'el' ? 'Greek' : 'English'} for the "why". Return ONLY JSON: {"picks":[{"name":string,"why":string,"sets":number,"reps":string}]}`, null, (i, n) => { ai.textContent = `${t('gThinking')} ${i}/${n}`; });
    const picks = (r.picks || []).map(p => ({ ...p, ex: EX().find(x => norm(x.en) === norm(p.name)) || EX().find(x => norm(x.en).includes(norm(p.name)) || norm(p.name).includes(norm(x.en))) })).filter(p => p.ex);
    $('nxAIOut').innerHTML = picks.map(p => `<div class="nxrow"><small class="rmeta">${esc(p.why || '')}${p.sets ? ` · ${p.sets}×${esc(p.reps || '')}` : ''} ${AI.badge()}</small>${exTiles([p.ex])}</div>`).join('') || `<p class="hint">${t('nothingHere')}</p>`;
    ai.remove();
  }catch(err){ ai.disabled = false; ai.innerHTML = t('nxAI') + ' ' + AI.badge(); $('nxAIOut').innerHTML = `<p class="hint">${esc(err.message)}</p>`; }
});

// ---------- finish → summary (ties into food and supplements) ----------
// 0.7.3: back with no exercises = no workout (the day goes back to how it was, the button stays "Start Workout")
function gymDropEmpty(){ if(!active || active.exercises.length) return; if(active.dayBefore !== undefined){ if(active.dayBefore) days[active.date] = active.dayBefore; else delete days[active.date]; saveDays(); }
  active = null; saveG('act'); REST = null; $('restBar').classList.add('hide'); keepAwake(false); }

holdButton($('sesDiscard'), 1000, 'holdDiscard', () => {   // the hold is the confirmation: no second question
  if(active && active.dayBefore !== undefined){ if(active.dayBefore) days[active.date] = active.dayBefore; else delete days[active.date]; saveDays(); }   // the day goes back to how it was
  active = null; saveG('act'); REST = null; $('restBar').classList.add('hide'); close('ovSession'); renderAll(); });

holdButton($('sesFinish'), 800, 'holdEnd', () => finishWorkout());

// save the workout. auto = true: ended by itself (no questions, no summary); 'asked': you answered Finish to "Finished Your Workout?".
// Both end at your last logged set.
async function finishWorkout(auto){
  if(!auto) active.exercises.forEach(x => x.sets.forEach(s => { if(!s.done && s.w !== '' && s.r !== ''){ s.done = true; s.at = Date.now(); if(!x.t0) x.t0 = s.at; } }));   // kilograms and reps typed but not ticked: counts as done
  const doneSets = active.exercises.flatMap(x => x.sets.filter(s => s.done));
  if(!doneSets.length){ if(!auto) toast(t('noSets')); return false; }
  const end = auto ? new Date(lastSetAt()) : new Date(), mins = Math.max(1, Math.round((end - (active.clock0 || new Date(active.start).getTime())) / 60000));
  const bw = bodyW(), kcal = Math.round(active.exercises.reduce((a, x) => a + x.sets.filter(s => s.done).reduce((b, s) => b + gymSetKcal(x.exId, s, bw), 0), 0) / 5) * 5;
  const vol = Math.round(active.exercises.filter(x => !isCardio(x.exId)).reduce((a, x) => a + exVol(x.exId, x.sets), 0));
  const ses = { ...active, end: end.toISOString(), mins, kcal, vol, exercises: active.exercises.map(x => ({ ...x, sets: x.sets.filter(s => s.done) })).filter(x => x.sets.length) };
  if(!ses.name || ses.name === t('emptyWorkout')) ses.name = typeLabel_(inferDayType(ses.exercises));   // unnamed: Push / Pull / Legs… from what was done
  delete ses.last; delete ses.dayBefore; delete ses.cur; delete ses.idleFrom; delete ses.askedAt; delete ses.idleAsked; if(auto === true) ses.autoEnded = true;
  ses.recovEst = estimateRecovery(ses); ses.recov = { ...ses.recovEst };
  const rkBefore = rankNow(ses.exercises.map(x => x.exId));   // ranks before this workout (rank-fx.js)
  sessions.push(ses); saveG('ses');
  const rk = RankFx.afterWorkout(ses, rkBefore);   // ranks that changed: up to 3 windows, the rest listed in Workout Done
  if(comeback && comebackFactor() >= 1){ comeback = null; saveG('cb'); }
  active = null; saveG('act'); REST = null; SSNEXT = null; _recMapV = null; $('restBar').classList.add('hide');
  close('ovSession');
  if(auto === true){ renderAll(); toast(t('autoEnded', { t: fromMin(end.getHours() * 60 + end.getMinutes()) })); RankFx.play(rk.slice(0, 3)); return true; }
  if(gOn('sound')) Phone.sound('done');
  showSummary(ses, rk.slice(3)); renderAll();
  RankFx.play(rk.slice(0, 3));
  return true;
}

// ---------- 0.7.4.2 auto-end, any number of exercises (replaces the 4-exercise rule) ----------
// 5 min after the last rest ends or is skipped with nothing new logged: "Finished Your Workout?" (Finish / Resume), over whatever page is open.
// No answer for 10 more min: saved to past workouts, ending at the last logged set. iPhone web apps don't run in the background,
// so with the app closed it's worked out from the saved times when the app opens again.
// A workout with nothing ticked keeps the old check: after 15 min without a tap, Back to Workout / End It (discards it).
const AE_ASK = 5 * 60000, AE_END = 10 * 60000, IDLE_MS = 15 * 60000;
let lastMark = 0, AEQ = null;   // AEQ: our question's answer slot, while it's on screen
function markActive(){ if(!active) return; const now = Date.now(); active.last = now; if(now - lastMark > 15000){ lastMark = now; saveG('act'); } }
$('ovSession').addEventListener('pointerdown', markActive, true); $('ovSession').addEventListener('input', markActive, true);
// the time of the last logged set (sets from before 0.7.4.2 have no time: the last tap instead)
function lastSetAt(){ const ts = active.exercises.flatMap(x => x.sets.filter(s => s.done && s.at).map(s => s.at)); return ts.length ? Math.max(...ts) : active.last || Date.now(); }
async function checkAbandoned(){
  if(!active) return; const now = Date.now();
  if(!active.last){ active.last = now; saveG('act'); }
  if(!active.exercises.some(x => x.sets.some(s => s.done))) return checkEmptyIdle(now);
  const askAt = (active.idleFrom || lastSetAt()) + AE_ASK; if(now < askAt) return;
  const due = Math.max(askAt, active.askedAt || 0) + AE_END;   // a question on screen always gets its 10 minutes
  if(now >= due){ if(AEQ && ASK === AEQ){ askDone('timeout'); return; }   // still on screen: close it
    AEQ = null; await finishWorkout(true); return; }                     // never shown, or another question took its place
  if(AEQ || $('ovAsk').classList.contains('open')) return;   // already asking, or another question is open: try again next check
  active.askedAt = now; saveG('act'); Phone.haptic();
  const q = ask(t('aeQ'), t('aeFinish'), t('aeResume')); AEQ = ASK; const a = await q; AEQ = null;
  if(!active) return;
  if(a === 'timeout') return finishWorkout(true);
  if(a) return finishWorkout('asked');
  autoEndMark(0); if(!$('ovSession').classList.contains('open')) openSession();   // Resume: the 5 minutes start again
}
async function checkEmptyIdle(now){
  if(now - active.last < IDLE_MS || active.idleAsked === active.last || $('ovAsk').classList.contains('open')) return;
  active.idleAsked = active.last; saveG('act');
  if(await ask(t('idleQ', { m: Math.round((now - active.last) / 60000) }), t('idleBack'), t('idleEnd'))){ markActive(); saveG('act'); openSession(); return; }
  if(!active) return;
  if(active.dayBefore !== undefined){ if(active.dayBefore) days[active.date] = active.dayBefore; else delete days[active.date]; saveDays(); }
  active = null; saveG('act'); REST = null; $('restBar').classList.add('hide'); renderAll(); toast(t('idleDiscarded'));
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') setTimeout(checkAbandoned, 600); });
setInterval(checkAbandoned, 15000);


$('smMeal').addEventListener('click', () => { close('ovSummary'); curDay = todayKey(); go('today'); setTimeout(() => { if(settings.geminiKey && targets) $('planBtn').click(); else openLogSearch(); }, 120); });

// Refinements: the Gym Buddy sections are a rotating pill carousel (pillCarousel in ui.js). Partner has no screen yet: a Coming Soon pill.
const GYM_CAR = pillCarousel($('gTabs'), {
  items: [{ key: 'gym-lib', label: () => t('hubLib') }, { key: 'gym-prog', label: () => t('hubProg') }, { key: 'gym-week', label: () => t('hubWeek') },
    { key: 'gym-partner', label: () => t('hubPartner'), soon: true }, { key: 'gym-rec', label: () => t('hubRec') }],
  onPick: key => { if(location.hash.slice(1) === key) return; navKeepScroll = false; history.replaceState(null, '', '#' + key); route(); },
  page: { area: $('pgGym'), views: () => ['gPlanV', 'gTplV', 'gWeigh', 'gProgV', 'gRecV'].map($).filter(el => !el.classList.contains('hide')) }
});

$('gStart').addEventListener('click', () => {
  if(active) return openSession();
  const pick = forcePick; forcePick = false;   // "Other workout" always shows the list
  const pl = planFor(todayKey()), planned = pl && pl.tpl && tpls.find(x => x.id === pl.tpl); if(planned && !pick) return startSession(planned);   // a planned day starts straight away
  if(!tpls.length) return startSession(null);   // nothing saved yet: straight into an empty workout
  const today = planFor(todayKey()), tp = today && today.tpl && tpls.find(x => x.id === today.tpl);
  // Saved Workouts (0.6.9.3; 0.7.2 memory card): a memory card for each, the name in slanted capitals; Start Empty Workout underneath
  $('stList').innerHTML = (tp ? [tp] : []).concat(tpls.filter(x => x !== tp)).map(x => `<button class="strow ${x === tp ? 'today' : ''}" data-st="${x.id}"><span class="stic">${gymIco('card', 26, 1.7)}</span><span class="t"><b>${esc(x.name).toUpperCase()}</b><small>${t('nEx', { n: x.exercises.length })}${x === tp ? ' · ' + t('stToday') : ''}</small></span></button>`).join('');
  gymHeadRobot('stCoach'); open('ovStart');
});

$('stList').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if(b) startSession(tpls.find(x => x.id === b.dataset.st) || null); });
$('stEmpty').addEventListener('click', () => startSession(null));

$('gTplV').addEventListener('click', e => {
  if(e.target.closest('#tpNew')) return openTpl(null);
  if(e.target.closest('[data-wkscan]')){ Phone.haptic(); return startWkScan(); }
  const c = e.target.closest('[data-tp]'); if(!c) return; const x = tpls.find(y => y.id === c.dataset.tp);
  if(e.target.closest('[data-qr-tp]')){ Phone.haptic(); return openWkQR(x); }
  if(e.target.closest('[data-go-tp]')){ if(active) return openSession(); return startSession(x); }
  openTpl(x);
});

// 0.7.7 gym-qr: Scan a Workout — the camera stops whenever the window closes
new MutationObserver(() => { if(!$('ovWkScan').classList.contains('open')) stopWkScan(); }).observe($('ovWkScan'), { attributes: true, attributeFilter: ['class'] });
$('wsPhotoBtn').addEventListener('click', () => $('wsPhoto').click());
$('wsPhoto').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; wkScanPhoto(f); });
// 0.7.7 gym-qr: let the screen sleep again when the QR closes (unless a live workout is keeping it on)
new MutationObserver(() => { if(!$('ovWkQR').classList.contains('open') && !$('ovSession').classList.contains('open')) Phone.keepScreenOn(false); })
  .observe($('ovWkQR'), { attributes: true, attributeFilter: ['class'] });

document.querySelectorAll('#tpType button').forEach(b => b.addEventListener('click', () => { TP.type = b.dataset.v; setSeg('#tpType', TP.type); }));

$('tpList').addEventListener('click', e => {
  const r = e.target.closest('[data-i]'); if(!r) return; const i = +r.dataset.i, x = TP.exercises[i];
  if(e.target.closest('[data-demo2]')) return openDemo(x.exId);
  if(e.target.closest('[data-rd]')) x.reps = bumpReps(x.reps, -1); if(e.target.closest('[data-ru]')) x.reps = bumpReps(x.reps, 1);
  if(e.target.closest('[data-trest]')){ const o = [60, 90, 120, 150, 180, 240]; x.rest = o[(o.indexOf(x.rest) + 1) % o.length] || 90; }
  if(e.target.closest('[data-rsd]')) x.rest = Math.max(30, rest30(x.rest) - 30); if(e.target.closest('[data-rsu]')) x.rest = Math.min(300, rest30(x.rest) + 30);
  if(e.target.closest('[data-sd]')) x.sets = Math.max(1, x.sets - 1); if(e.target.closest('[data-su]')) x.sets = Math.min(10, x.sets + 1);
  if(e.target.closest('[data-rm]')) TP.exercises.splice(i, 1);
  if(!e.target.matches('[data-reps]')) drawTpl();
});

$('tpList').addEventListener('input', e => { if(e.target.matches('[data-reps]')) TP.exercises[+e.target.closest('[data-i]').dataset.i].reps = e.target.value; });

$('tpAdd').addEventListener('click', () => openExPick(id => { TP.exercises.push({ exId: id, sets: isCardio(id) ? 1 : 3, reps: isCardio(id) ? '20' : defReps(exById(id).rest), rest: exById(id).rest }); drawTpl(); }));

$('tpSave').addEventListener('click', () => {
  TP.type = inferType(TP.exercises); TP.name = $('tpName').value.trim() || typeLabel_(TP.type);
  if(TP.id){ const i = tpls.findIndex(y => y.id === TP.id); tpls[i] = TP; } else { TP.id = uid(); tpls.push(TP); }
  saveG('tpl'); close('ovTpl'); renderAll(); toast(t('updated'));
});

$('tpDel').addEventListener('click', () => { const i = tpls.findIndex(y => y.id === TP.id); if(i === -1) return; const [gone] = tpls.splice(i, 1); saveG('tpl'); close('ovTpl'); renderAll();
  toast(t('deleted', { n: gone.name }), t('undo'), () => { tpls.splice(i, 0, gone); saveG('tpl'); renderAll(); }); });

$('gProgV').addEventListener('change', e => { if(e.target.id === 'gLast'){ profile.gymLast = e.target.value || null; saveProfile(); renderGym(); } });

$('gProgV').addEventListener('click', e => { const c = e.target.closest('[data-ses]'); if(c){ const s = sessions.find(x => x.id === c.dataset.ses); if(s) showSummary(s); } });

$('dRec').addEventListener('click', e => { if(e.target.closest('[data-gorec]')){ ui.gtab = 'rec'; saveUI(); go('gym'); } });

// Progress: folds; weight chart Day / Week / Month
$('gProgV').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if(!b) return; PG.open[b.dataset.pg] = !PG.open[b.dataset.pg]; renderProgress(); });
$('gWeigh').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if(!b) return; ui.wtMode = b.dataset.wt; saveUI(); drawWeigh(); });

// long press to reorder exercises (workout editor + live workout)
makeSortable($('tpList'), '.tpcard', (a, b, out) => { ssMove(TP.exercises, a, b, out); drawTpl(); },
  (a, b) => { ssMerge(TP.exercises, a, b); drawTpl(); toast(t('ssMade')); },
  (a, b) => !isCardio(TP.exercises[a].exId) && !isCardio(TP.exercises[b].exId));   // cardio doesn't superset
// the live workout is one exercise per page now, so hold-to-reorder / hold-to-superset live in the workout editor only (the list above)

// swipe to delete: exercises (live workout + workout editor) and sets, with Undo
makeSwipeDelete($('sesBody'), '.exc', c => { const i = +c.dataset.x, gone = active.exercises.splice(i, 1)[0]; if(!gone) return;
  const rest = REST; if(REST && REST.xi === i){ REST = null; $('restBar').classList.add('hide'); } else if(REST && REST.xi > i) REST.xi--;
  saveG('act'); renderSession(); toast(t('exRemoved', { n: exName(gone.exId) }), t('undo'), () => { active.exercises.splice(i, 0, gone); if(rest && rest.xi >= i && REST) REST.xi++; saveG('act'); renderSession(); }); });
makeSwipeDelete($('tpList'), '.tpcard', c => { const i = +c.dataset.i, gone = TP.exercises.splice(i, 1)[0]; if(!gone) return; drawTpl();
  toast(t('exRemoved', { n: exName(gone.exId) }), t('undo'), () => { TP.exercises.splice(i, 0, gone); drawTpl(); }); });
makeSwipeDelete($('sesBody'), '.setrow', row => { const xi = +row.closest('[data-x]').dataset.x, si = +row.dataset.s, x = active.exercises[xi]; if(!x) return; const gone = x.sets.splice(si, 1)[0];
  if(REST && REST.xi === xi){ if(REST.si === si){ REST = null; $('restBar').classList.add('hide'); } else if(REST.si > si) REST.si--; }
  saveG('act'); renderSession(); toast(t('setRemoved'), t('undo'), () => { x.sets.splice(si, 0, gone); saveG('act'); renderSession(); }); });

// ---------- 0.7.4.3 Gym Coach (the shared coach chat, sweatband robot) ----------
// 0.7.9.6: suggestion chips under the opening message (Improve only once there is a saved workout)
const gcStarters = () => [t('gcAskW'), ...(tpls.length ? [t('gcAskImp')] : []), t('gcAskSets')];
Coach.setup('gym', { kind: 'gym', send: gymCoachSend, starters: gcStarters });
// the live workout's own chat: the sweatband robot bubble, a big camera button for a photo of a machine
// 0.7.8: the Start Workout window's own chat: opened from the robot in its title bar, no floating bubble
Coach.setup('gymstart', { kind: 'gym', title: () => t('coachGym'), send: gymCoachSend, starters: gcStarters });
$('stCoach').addEventListener('click', () => { Phone.haptic(); Coach.open('gymstart'); });
Coach.setup('gymlive', { kind: 'gym', title: () => t('coachGym'), first: () => t('gcLiveHi'), camera: true, send: gymLiveSend });

// Profile › Leaderboards: no body weight or sex yet → Settings › Body (tiers need both)
// 0.7.9 leaderboards: Add a 1RM
$('pfBody').addEventListener('click', e => { if(e.target.closest('[data-orm]')){ Phone.haptic(); openOrm(); return; }
  if(e.target.closest('[data-rkcustom]')){ Phone.haptic(); openRankPick(); return; }
  const pn = e.target.closest('[data-statpin]'); if(pn){ togglePin(pn.dataset.statpin); return; }
  if(e.target.closest('[data-statshuf]')){ Phone.haptic(); ui.statShuf = { d: todayKey(), n: (ui.statShuf && ui.statShuf.d === todayKey() ? ui.statShuf.n : 0) + 1 }; saveUI(); renderProfile(); return; }
  if(e.target.closest('[data-rkreset]')){ resetRankPick(); return; }
  const sw = e.target.closest('[data-pfboard]'); if(sw){ Phone.haptic(); ui.pfBoard = sw.dataset.pfboard; saveUI(); renderProfile(); } });   // 0.7.10: Max PR | Strength, remembered
$('ormEx').addEventListener('change', ormHint);
$('ormSave').addEventListener('click', saveOrm);
$('rkList').addEventListener('click', e => { const b = e.target.closest('[data-rkpick]'); if(b) togglePick(b.dataset.rkpick); });
$('rkSearch').addEventListener('input', drawRankPick); $('rkReset').addEventListener('click', resetRankPick);
$('ormList').addEventListener('click', e => { const b = e.target.closest('[data-ormdel]'); if(b){ Phone.haptic(); delOrm(b.dataset.ormdel); } });
$('pfBody').addEventListener('click', e => { if(!e.target.closest('[data-tierbody]')) return; Phone.haptic(); openSettings(); setTimeout(() => { fillSettings(); open('ovSBody'); }, 360); });
