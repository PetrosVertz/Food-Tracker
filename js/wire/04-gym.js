// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const BIG_HEADS = new Set(['chest_mid','chest_upper','lats','upper_back','lower_back','quads','hamstrings','glutes','adductors']);

const MUSCLES = Object.fromEntries([...Object.entries(GROUPS).map(([k, v]) => [k, [v[0], v[1]]]), ...Object.entries(HEADS).map(([k, v]) => [k, [v[0], v[1]]]),
  ['side_delts', ['Side delts','Πλάγιοι δελτοειδείς']], ['rear_delts', ['Rear delts','Οπίσθιοι δελτοειδείς']], ['biceps', ['Biceps','Δικέφαλοι']], ['triceps', ['Triceps','Τρικέφαλοι']], ['abs', ['Abs','Κοιλιακοί']]]);

const ML = k => (MUSCLES[k] || MUSCLES.other)[lang === 'el' ? 1 : 0], EL = k => (EQUIP[k] || EQUIP.machine)[lang === 'el' ? 1 : 0];

const HEAVY = new Set(['bench','incline_bench','squat','front_squat','deadlift','sumo_deadlift','trap_bar_dl','ohp']);

const LIB = LIB_RAW.map(([id, en, el, eq, p, mu]) => { const m_ = parseMu(mu), th = topHead(m_);
  return { id, en, el, e: EQ[eq], p, mu: m_, h: th, m: HEADS[th] ? HEADS[th][2] : 'other', rest: HEAVY.has(id) ? 180 : REST_BY_PATTERN[p] ?? 90 }; });

let exCustom = Store.load('exCustom', []), tpls = Store.load('tpls', null), gymPlan = Store.load('gymPlan', {}), sessions = Store.load('sessions', []), active = Store.load('active', null), comeback = Store.load('comeback', null), pet = Store.load('pet', null);

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

const saveG = k => Store.save(GKEY[k], { custom: exCustom, tpl: tpls, plan: gymPlan, ses: sessions, act: active, cb: comeback, pet }[k]);

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
  if(isCardio(exId)) return bw * 7 * (+s.r || 0) / 60;
  const mu = exById(exId).mu || {}, big = Object.entries(mu).reduce((a, [h, v]) => a + (BIG_HEADS.has(h) ? v : 0), 0) / 100;
  const reps = Math.min(1.4, Math.max(.7, Math.sqrt((+s.r || 8) / 10)));
  return bw * .33 * (.75 + .45 * big) * reps * (s.type === 'W' ? .5 : 1) * (s.drop ? .6 : 1) * (s.side ? .6 : 1); }

// a set that counts on its own: not a warm-up, not the R half of an L/R pair, not a drop under another set
const isMainSet = s => s.type !== 'W' && s.side !== 'R' && !s.drop;

const exVol = (exId, sets) => sets.filter(s => s.done && s.type !== 'W').reduce((a, s) => a + loadOf(exId, s.w) * (+s.r || 0), 0);

const exAt = el => { const c = el.closest('[data-x]'); return c ? active.exercises[+c.dataset.x] : null; };

$('sesBody').addEventListener('input', e => {
  const x = exAt(e.target), row = e.target.closest('[data-s]'); if(!x || !row) return; const s = x.sets[+row.dataset.s];
  if(e.target.matches('[data-w]')) s.w = e.target.value.replace(',', '.'); if(e.target.matches('[data-r]')) s.r = e.target.value; saveG('act');
});

$('sesBody').addEventListener('click', e => {
  const rs = e.target.closest('[data-rs]'); if(rs) return restAdjust(rs.dataset.rs);
  const oc = e.target.closest('[data-openex]'); if(oc && !e.target.closest('[data-replace]')){ active.cur = +oc.dataset.x; saveG('act'); renderSession();   // open a short card
    setTimeout(() => { const el = document.querySelector(`.exc[data-x="${oc.dataset.x}"]`); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); return; }
  const sp = e.target.closest('[data-step]'); if(sp) return stepSet(sp);
  const dm = e.target.closest('[data-demo]'); if(dm){ const dx = exAt(dm); if(dx) openDemo(dx.exId); return; }
  const x = exAt(e.target); if(!x) return; const xi = active.exercises.indexOf(x), row = e.target.closest('[data-s]'), s = row ? x.sets[+row.dataset.s] : null;
  if(e.target.closest('[data-uni]')){ makeUni(x, !x.uni); saveG('act'); renderSession(); return; }   // L / R: one side at a time
  if(e.target.closest('[data-info]')) return openExInfo(x.exId);
  if(e.target.closest('[data-adddrop]')){ const j = x.sets.map((z, k) => z.drop ? k : -1).filter(k => k >= 0).pop(); if(j !== undefined) addDrop(x, j); saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-type]') && s){ const j = +row.dataset.s;
    if(s.drop){ addDrop(x, j); saveG('act'); renderSession(); return; }   // ↘ on a drop: one more drop
    s.type = { N: 'W', W: 'D', D: 'F', F: 'N' }[s.type];
    if(s.type === 'D' && !(x.sets[j + 1] || {}).drop) addDrop(x, j);   // Drop Set: a lighter row appears under it
    if(s.type === 'F'){ while(x.sets[j + 1] && x.sets[j + 1].drop && !x.sets[j + 1].done) x.sets.splice(j + 1, 1); }
    saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-replace]')) return openSwap(xi);   // 0.6.9.3: the same Swap menu as inside the open exercise
  if(e.target.closest('[data-ok]') && s){ tickSet(x, s, row, xi, +row.dataset.s); return; }
  if(e.target.closest('[data-addset]')){ if(!x.t0) x.t0 = Date.now(); if(x.uni) x.sets.push(...uniPair()); else x.sets.push(newSet()); saveG('act'); renderSession(); focusSet(xi, x.sets.length - (x.uni ? 2 : 1)); return; }
  if(e.target.closest('[data-endex]')){ x.ended = true; if(x.t0 && !x.t1) x.t1 = Date.now(); x.sets = x.sets.filter(z => z.done || (!z.auto && (z.w !== '' || z.r !== ''))); delete active.cur; saveG('act'); renderSession();
    const next = active.exercises.findIndex(z => !z.ended); setTimeout(() => (next >= 0 ? document.querySelector(`.exc[data-x="${next}"]`) : $('sesAddEx')).scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); return; }
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
// 0.7.1: while searching, the box sits at the top and the list scrolls under it (it no longer slides away behind the keyboard)
const gymPkSearching = () => $('ovExPick').querySelector('.sheet').classList.toggle('pksearching', document.activeElement === $('exSearch') || !!$('exSearch').value.trim());
['focus', 'input', 'blur'].forEach(k => $('exSearch').addEventListener(k, () => setTimeout(gymPkSearching, 0)));
$('pkBody').addEventListener('change', e => { if(e.target.id === 'pkSortMu'){ ui.pkSortMu = e.target.checked; saveUI(); drawExPick(); } });   // one list by muscle usage

document.querySelectorAll('#pkRegion button').forEach(b => b.addEventListener('click', () => { PK.region = b.dataset.v; PK.group = null; PK.head = null; ui.pkRegion = PK.region; saveUI(); drawExPick(); }));

document.querySelectorAll('#pkMode button').forEach(b => b.addEventListener('click', () => { PK.mode = b.dataset.v; ui.pkMode = PK.mode; saveUI(); drawExPick(); }));

$('pkBody').addEventListener('click', e => {
  const inf = e.target.closest('[data-exinfo]'); if(inf){ e.stopPropagation(); openExInfo(inf.dataset.exinfo, PK.cb); return; }
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
Suggest the 3 best next exercises to balance this session (fill muscles that are missing, avoid overdoing ones already hit). Pick ONLY from this list, using the exact English names: ${names}.
Reply in ${lang === 'el' ? 'Greek' : 'English'} for the "why". Return ONLY JSON: {"picks":[{"name":string,"why":string,"sets":number,"reps":string}]}`, null, (i, n) => { ai.textContent = `${t('gThinking')} ${i}/${n}`; });
    const picks = (r.picks || []).map(p => ({ ...p, ex: EX().find(x => norm(x.en) === norm(p.name)) || EX().find(x => norm(x.en).includes(norm(p.name)) || norm(p.name).includes(norm(x.en))) })).filter(p => p.ex);
    $('nxAIOut').innerHTML = picks.map(p => `<div class="nxrow"><small class="rmeta">${esc(p.why || '')}${p.sets ? ` · ${p.sets}×${esc(p.reps || '')}` : ''} ${AI.badge()}</small>${exTiles([p.ex])}</div>`).join('') || `<p class="hint">${t('nothingHere')}</p>`;
    ai.remove();
  }catch(err){ ai.disabled = false; ai.innerHTML = t('nxAI') + ' ' + AI.badge(); $('nxAIOut').innerHTML = `<p class="hint">${esc(err.message)}</p>`; }
});

// ---------- finish → summary (ties into food, supplements and the pet) ----------
// 0.7.3: back with no exercises = no workout (the day goes back to how it was, the button stays "Start Workout")
function gymDropEmpty(){ if(!active || active.exercises.length) return; if(active.dayBefore !== undefined){ if(active.dayBefore) days[active.date] = active.dayBefore; else delete days[active.date]; saveDays(); }
  active = null; saveG('act'); REST = null; $('restBar').classList.add('hide'); keepAwake(false); }
$('sesMin').addEventListener('click', () => { close('ovSession'); gymDropEmpty(); renderAll(); });

$('sesDiscard').addEventListener('click', async () => { if(!(await ask(t('discardQ2'), t('discardBtn'), t('keepBtn')))) return;
  if(active && active.dayBefore !== undefined){ if(active.dayBefore) days[active.date] = active.dayBefore; else delete days[active.date]; saveDays(); }   // the day goes back to how it was
  active = null; saveG('act'); REST = null; $('restBar').classList.add('hide'); close('ovSession'); renderAll(); });

$('sesFinish').addEventListener('click', () => finishWorkout());

// save the workout; auto = ended by itself after 15 min without a tap (end time = the last tap, no questions)
async function finishWorkout(auto){
  const doneSets = active.exercises.flatMap(x => x.sets.filter(s => s.done));
  if(!doneSets.length){ if(!auto) toast(t('noSets')); return false; }
  const filled = active.exercises.some(x => x.sets.some(s => !s.done && (s.w !== '' || s.r !== '')));
  if(!auto && filled && !(await ask(t('unfinished')))) return false;
  const end = auto && active.last ? new Date(active.last) : new Date(), mins = Math.max(1, Math.round((end - (active.clock0 || new Date(active.start).getTime())) / 60000));
  const bw = bodyW(), kcal = Math.round(active.exercises.reduce((a, x) => a + x.sets.filter(s => s.done).reduce((b, s) => b + gymSetKcal(x.exId, s, bw), 0), 0) / 5) * 5;
  const vol = Math.round(active.exercises.filter(x => !isCardio(x.exId)).reduce((a, x) => a + exVol(x.exId, x.sets), 0));
  const ses = { ...active, end: end.toISOString(), mins, kcal, vol, exercises: active.exercises.map(x => ({ ...x, sets: x.sets.filter(s => s.done) })).filter(x => x.sets.length) };
  if(!ses.name || ses.name === t('emptyWorkout')) ses.name = typeLabel_(inferDayType(ses.exercises));   // unnamed: Push / Pull / Legs… from what was done
  delete ses.last; delete ses.dayBefore; delete ses.cur; if(auto) ses.autoEnded = true;
  ses.recovEst = estimateRecovery(ses); ses.recov = { ...ses.recovEst };
  sessions.push(ses); saveG('ses');
  if(comeback && comebackFactor() >= 1){ comeback = null; saveG('cb'); }
  active = null; saveG('act'); REST = null; SSNEXT = null; $('restBar').classList.add('hide');
  petAward('workout', 1);
  close('ovSession');
  if(auto){ renderAll(); toast(t('autoEnded', { t: fromMin(end.getHours() * 60 + end.getMinutes()) })); return true; }
  showSummary(ses); renderAll();
  if(!ses.tplId) askSaveTpl(ses);
  return true;
}

// ---------- abandoned workouts (iPhone web apps don't run in the background, so this is checked when the app opens) ----------
const IDLE_MS = 15 * 60000;
let lastMark = 0;
function markActive(){ if(!active) return; const now = Date.now(); active.last = now; if(now - lastMark > 15000){ lastMark = now; saveG('act'); } }
$('ovSession').addEventListener('pointerdown', markActive, true); $('ovSession').addEventListener('input', markActive, true);
async function checkAbandoned(){
  if(!active) return; if(!active.last){ active.last = Date.now(); saveG('act'); return; }
  if(Date.now() - active.last < IDLE_MS || active.askedAt === active.last) return;
  const n = active.exercises.filter(x => x.sets.some(s => s.done)).length;   // only exercises with a finished set count
  if(n >= 4){ await finishWorkout(true); return; }
  active.askedAt = active.last; saveG('act');
  if(await ask(t('idleQ', { m: Math.round((Date.now() - active.last) / 60000) }), t('idleBack'), t('idleEnd'))){ markActive(); saveG('act'); openSession(); return; }
  if(active.exercises.some(x => x.sets.some(s => s.done))){ if(await finishWorkout(true)) return; }
  if(active.dayBefore !== undefined){ if(active.dayBefore) days[active.date] = active.dayBefore; else delete days[active.date]; saveDays(); }
  active = null; saveG('act'); REST = null; $('restBar').classList.add('hide'); renderAll(); toast(t('idleDiscarded'));
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') setTimeout(checkAbandoned, 600); });
setInterval(checkAbandoned, 60000);


$('smMeal').addEventListener('click', () => { close('ovSummary'); curDay = todayKey(); go('today'); setTimeout(() => { if(settings.geminiKey && targets) $('planBtn').click(); else openLogSearch(); }, 120); });

$('gTabs').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; if(b.hasAttribute('data-pet')) return openPet(); if(location.hash.slice(1) !== b.dataset.sec) history.replaceState(null, '', '#' + b.dataset.sec), route(); });

$('gStart').addEventListener('click', () => {
  if(active) return openSession();
  const pick = forcePick; forcePick = false;   // "Other workout" always shows the list
  const pl = planFor(todayKey()), planned = pl && pl.tpl && tpls.find(x => x.id === pl.tpl); if(planned && !pick) return startSession(planned);   // a planned day starts straight away
  if(!tpls.length) return startSession(null);   // nothing saved yet: straight into an empty workout
  const today = planFor(todayKey()), tp = today && today.tpl && tpls.find(x => x.id === today.tpl);
  // Saved Workouts (0.6.9.3; 0.7.2 memory card): a memory card for each, the name in slanted capitals; Start Empty Workout underneath
  $('stList').innerHTML = (tp ? [tp] : []).concat(tpls.filter(x => x !== tp)).map(x => `<button class="strow ${x === tp ? 'today' : ''}" data-st="${x.id}"><span class="stic">${gymIco('card', 26, 1.7)}</span><span class="t"><b>${esc(x.name).toUpperCase()}</b><small>${t('nEx', { n: x.exercises.length })}${x === tp ? ' · ' + t('stToday') : ''}</small></span></button>`).join('');
  open('ovStart');
});

$('stList').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if(b) startSession(tpls.find(x => x.id === b.dataset.st) || null); });
$('stEmpty').addEventListener('click', () => startSession(null));

$('gTplV').addEventListener('click', e => {
  if(e.target.closest('#tpNew')) return openTpl(null);
  const c = e.target.closest('[data-tp]'); if(!c) return; const x = tpls.find(y => y.id === c.dataset.tp);
  if(e.target.closest('[data-go-tp]')){ if(active) return openSession(); return startSession(x); }
  openTpl(x);
});

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

const petLevel = xp => Math.floor(xp / 5) + 1, petStage = lv => lv >= 12 ? 2 : lv >= 5 ? 1 : 0;

$('ppList').addEventListener('click', e => { const b = e.target.closest('[data-pp]'); if(!b) return;
  pet = { species: b.dataset.pp, name: PETS[b.dataset.pp].names[0], xp: 0, lastFed: todayKey(), createdAt: new Date().toISOString(), awards: {}, log: [] };
  saveG('pet'); close('ovPetPick'); celebrate(); renderAll(); setTimeout(openPet, 250); });

$('petBody').addEventListener('change', e => { if(e.target.id === 'petName'){ pet.name = e.target.value.trim() || PETS[pet.species].names[0]; saveG('pet'); renderPetTile(); } });

$('tPet').addEventListener('click', openPet);

// ---------- swipe from the left edge = back ----------
(() => {
  let sx = null, sy = 0, st = 0;
  document.addEventListener('touchstart', e => { const t0 = e.touches[0]; if(t0.clientX < innerWidth * .45 && !e.target.closest('input,select,textarea,.mxs,.stepper,.hscroll,.chips,.tchips,.wrapchips,.seg,.swipebox .card,.swipebox .exc,.swipebox .tpcard,.bodymap,.wtchart')){ sx = t0.clientX; sy = t0.clientY; st = Date.now(); } else sx = null; }, { passive: true });
  document.addEventListener('touchend', e => {
    if(sx === null) return; const t1 = e.changedTouches[0], dx = t1.clientX - sx, dy = Math.abs(t1.clientY - sy); sx = null;
    if(dx < 80 || dy > 50 || dy > dx * .6 || Date.now() - st > 700) return;
    goBack();
  }, { passive: true });
})();

const recState = r => r >= .8 ? 'ok' : r >= .5 ? 'mid' : 'low';

$('gRecV').addEventListener('click', e => {
  const sd = e.target.closest('[data-side]'); if(!sd || ui.recSide === sd.dataset.side) return; ui.recSide = sd.dataset.side; saveUI();
  document.querySelectorAll('#recSide [data-side]').forEach(b => b.classList.toggle('on', b === sd));   // the pill glides…
  const fig = $('recFig'), sv = fig && fig.querySelector('svg'), swap = () => { fig.innerHTML = recFigure(); };
  if(!sv || !sv.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return swap();
  // …and the body turns around: it narrows to a line, swaps sides, opens back out (~⅓ s)
  sv.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 150, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = () => { swap();
    const n = fig.querySelector('svg'); if(n) n.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 180, easing: 'cubic-bezier(.25,1,.5,1)' }); };
});

$('dRec').addEventListener('click', e => { if(e.target.closest('[data-gorec]')){ ui.gtab = 'rec'; saveUI(); go('gym'); } });

// Progress: folds; weight chart Day / Week / Month
$('gProgV').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if(!b) return; PG.open[b.dataset.pg] = !PG.open[b.dataset.pg]; renderProgress(); });
$('gWeigh').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if(!b) return; ui.wtMode = b.dataset.wt; saveUI(); drawWeigh(); });

// long press to reorder exercises (workout editor + live workout)
makeSortable($('tpList'), '.tpcard', (a, b) => { TP.exercises.splice(b, 0, TP.exercises.splice(a, 1)[0]); normalizeSS(TP.exercises); drawTpl(); },
  (a, b) => { ssMerge(TP.exercises, a, b); drawTpl(); toast(t('ssMade')); },
  (a, b) => !isCardio(TP.exercises[a].exId) && !isCardio(TP.exercises[b].exId));   // cardio doesn't superset
makeSortable($('sesBody'), '.exc', (a, b) => { const ex = active.exercises; ex.splice(b, 0, ex.splice(a, 1)[0]);
  if(REST && typeof REST.xi === 'number') REST.xi = REST.xi === a ? b : REST.xi > a && REST.xi <= b ? REST.xi - 1 : REST.xi < a && REST.xi >= b ? REST.xi + 1 : REST.xi;
  normalizeSS(ex); saveG('act'); renderSession(); },
  (a, b) => { const ex = active.exercises, rx = REST && typeof REST.xi === 'number' ? ex[REST.xi] : null;
    ssMerge(ex, a, b); if(rx) REST.xi = ex.indexOf(rx); saveG('act'); renderSession(); toast(t('ssMade')); },
  (a, b) => !isCardio(active.exercises[a].exId) && !isCardio(active.exercises[b].exId));

// swipe to delete: exercises (live workout + workout editor) and sets, with Undo
makeSwipeDelete($('sesBody'), '.exc', c => { const i = +c.dataset.x, gone = active.exercises.splice(i, 1)[0]; if(!gone) return;
  const rest = REST; if(REST && REST.xi === i){ REST = null; $('restBar').classList.add('hide'); } else if(REST && REST.xi > i) REST.xi--;
  saveG('act'); renderSession(); toast(t('exRemoved', { n: exName(gone.exId) }), t('undo'), () => { active.exercises.splice(i, 0, gone); if(rest && rest.xi >= i && REST) REST.xi++; saveG('act'); renderSession(); }); });
makeSwipeDelete($('tpList'), '.tpcard', c => { const i = +c.dataset.i, gone = TP.exercises.splice(i, 1)[0]; if(!gone) return; drawTpl();
  toast(t('exRemoved', { n: exName(gone.exId) }), t('undo'), () => { TP.exercises.splice(i, 0, gone); drawTpl(); }); });
makeSwipeDelete($('sesBody'), '.setrow', row => { const xi = +row.closest('[data-x]').dataset.x, si = +row.dataset.s, x = active.exercises[xi]; if(!x) return; const gone = x.sets.splice(si, 1)[0];
  if(REST && REST.xi === xi){ if(REST.si === si){ REST = null; $('restBar').classList.add('hide'); } else if(REST.si > si) REST.si--; }
  saveG('act'); renderSession(); toast(t('setRemoved'), t('undo'), () => { x.sets.splice(si, 0, gone); saveG('act'); renderSession(); }); });
