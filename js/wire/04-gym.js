// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const BIG_HEADS = new Set(['chest_mid','chest_upper','lats','upper_back','lower_back','quads','hamstrings','glutes','adductors']);

const MUSCLES = Object.fromEntries([...Object.entries(GROUPS).map(([k, v]) => [k, [v[0], v[1]]]), ...Object.entries(HEADS).map(([k, v]) => [k, [v[0], v[1]]]),
  ['side_delts', ['Side delts','Πλάγιοι δελτοειδείς']], ['rear_delts', ['Rear delts','Οπίσθιοι δελτοειδείς']], ['biceps', ['Biceps','Δικέφαλοι']], ['triceps', ['Triceps','Τρικέφαλοι']], ['abs', ['Abs','Κοιλιακοί']]]);

const ML = k => (MUSCLES[k] || MUSCLES.other)[lang === 'el' ? 1 : 0], EL = k => (EQUIP[k] || EQUIP.machine)[lang === 'el' ? 1 : 0];

const HEAVY = new Set(['bench','incline_bench','squat','front_squat','deadlift','sumo_deadlift','trap_bar_dl','ohp']);

const LIB = LIB_RAW.map(([id, en, el, eq, p, mu]) => { const m_ = parseMu(mu), th = topHead(m_);
  return { id, en, el, e: EQ[eq], p, mu: m_, h: th, m: HEADS[th] ? HEADS[th][2] : 'other', rest: HEAVY.has(id) ? 180 : REST_BY_PATTERN[p] ?? 90 }; });

let exCustom = load(GKEY.custom, []), tpls = load(GKEY.tpl, null), gymPlan = load(GKEY.plan, {}), sessions = load(GKEY.ses, []), active = load(GKEY.act, null), comeback = load(GKEY.cb, null), pet = load(GKEY.pet, null);

const EX = () => (_exc && _exc.n === exCustom.length) ? _exc.l : (_exc = { n: exCustom.length, l: LIB.concat(exCustom.map(normEx)) }).l;

const exById = id => EX().find(x => x.id === id) || normEx({ id, en: id, el: id, m: 'other', e: 'machine', rest: 90 });

const exName = x => (typeof x === 'string' ? exById(x) : x)[lang === 'el' ? 'el' : 'en'];

const isCardio = id => exById(id).m === 'cardio';

const r25 = (x, e) => e === 'dumbbell' ? Math.round(x) : Math.round(x / 2.5) * 2.5;

const repRange = s => { const m = String(s || '').match(/(\d+)\s*[-–]\s*(\d+)/); if(m) return [+m[1], +m[2]]; const n = parseInt(s); return n ? [n, n] : [8, 12]; };

const defReps = rest => rest >= 180 ? '5-8' : rest >= 120 ? '8-12' : rest >= 90 ? '10-15' : '12-20';

const bodyW = () => (targets && targets.bw) || 75;

const e1rm = (w, r, id) => { const ex = exById(id); const load_ = ex.e === 'bodyweight' ? bodyW() + (w || 0) : w; return r >= 1 && r <= 20 && load_ > 0 ? load_ * (1 + r / 30) : 0; };

const fmtRest = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;

const saveG = k => store(GKEY[k], { custom: exCustom, tpl: tpls, plan: gymPlan, ses: sessions, act: active, cb: comeback, pet }[k]);

if(!tpls){
  const mk = (name, type, ids) => ({ id: uid(), name, type, exercises: ids.map(([id, sets]) => ({ exId: id, sets, reps: isCardio(id) ? '20' : defReps(exById(id).rest), rest: exById(id).rest })) });
  tpls = [];
  saveG('tpl');
}

// ---------- weekly plan feeds Today's food ----------
const WD = () => lang === 'el' ? ['Κυρ','Δευ','Τρί','Τετ','Πέμ','Παρ','Σάβ'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

$('gPlanV').addEventListener('change', e => {
  const row = e.target.closest('[data-wd]'); if(!row) return; const wd = +row.dataset.wd; const p = gymPlan[wd] || {};
  if(e.target.matches('[data-ptpl]')){ p.tpl = e.target.value || null; if(p.tpl && p.tpl !== 'rest' && !p.time) p.time = '18:00'; }
  if(e.target.matches('[data-ptime]')) p.time = e.target.value;
  if(p.tpl || p.work) gymPlan[wd] = p; else delete gymPlan[wd];
  saveG('plan'); renderGymPlan(); renderHome(); renderToday(); toast(t('planSaved'));
});

const loadOf = (exId, w) => exById(exId).e === 'bodyweight' ? bodyW() + (+w || 0) : (+w || 0);

const exVol = (exId, sets) => sets.filter(s => s.done && s.type !== 'W').reduce((a, s) => a + loadOf(exId, s.w) * (+s.r || 0), 0);

const exAt = el => { const c = el.closest('[data-x]'); return c ? active.exercises[+c.dataset.x] : null; };

$('sesBody').addEventListener('input', e => {
  const x = exAt(e.target), row = e.target.closest('[data-s]'); if(!x || !row) return; const s = x.sets[+row.dataset.s];
  if(e.target.matches('[data-w]')) s.w = e.target.value.replace(',', '.'); if(e.target.matches('[data-r]')) s.r = e.target.value; saveG('act');
});

$('sesBody').addEventListener('click', e => {
  const rs = e.target.closest('[data-rs]'); if(rs) return restAdjust(rs.dataset.rs);
  const x = exAt(e.target); if(!x) return; const xi = active.exercises.indexOf(x), row = e.target.closest('[data-s]'), s = row ? x.sets[+row.dataset.s] : null;
  if(e.target.closest('[data-info]')) return openExInfo(x.exId);
  if(e.target.closest('[data-type]') && s){ s.type = { N: 'W', W: 'D', D: 'F', F: 'N' }[s.type]; saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-ok]') && s){ tickSet(x, s, row, xi, +row.dataset.s); return; }
  if(e.target.closest('[data-addset]')){ x.sets.push(newSet()); saveG('act'); renderSession(); focusSet(xi, x.sets.length - 1); return; }
  if(e.target.closest('[data-endex]')){ x.ended = true; if(x.t0 && !x.t1) x.t1 = Date.now(); x.sets = x.sets.filter(z => z.done || z.w !== '' || z.r !== ''); saveG('act'); renderSession();
    const next = active.exercises.findIndex(z => !z.ended); setTimeout(() => (next >= 0 ? document.querySelector(`.exc[data-x="${next}"]`) : $('sesAddEx')).scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); return; }
  if(e.target.closest('[data-reopen]')){ x.ended = false; x.t1 = null; saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-rest]')){ const opts = [60, 90, 120, 150, 180, 240, 300]; x.rest = opts[(opts.indexOf(x.rest) + 1) % opts.length] || 90; saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-warm]')){ const sug = suggestFor(x.exId, x.reps); x.sets.unshift(...warmupFor(x.exId, sug.w).map(w => ({ type: 'W', w: String(w.w), r: String(w.r), done: false }))); saveG('act'); renderSession(); return; }
  if(e.target.closest('[data-swap]')){ openSwap(xi); return; }
  if(e.target.closest('[data-xrm]')){ active.exercises.splice(xi, 1); if(REST && REST.xi === xi) REST = null; saveG('act'); renderSession(); return; }
});

$('sesSupps').addEventListener('click', e => {
  const b = e.target.closest('[data-ssup]'); if(!b) return; const k = todayKey(); suppLog[k] = suppLog[k] || {};
  if(suppLog[k][b.dataset.ssup]) delete suppLog[k][b.dataset.ssup]; else suppLog[k][b.dataset.ssup] = true; store(LOGKEY, suppLog); renderSession(); renderHome(); renderSupps();
});

const bestVolBefore = exId => { const h = exHistory(exId, active && active.id); return h.length ? Math.max(...h.map(z => exVol(exId, z.sets.map(s => ({ ...s, done: true }))))) : 0; };

const beep = bell;

$('restBar').addEventListener('click', e => { const b = e.target.closest('[data-rs]'); if(b) restAdjust(b.dataset.rs); });

setInterval(() => { tickRest(); tickClock(); }, 500);

const exScore = (x, key) => HEADS[key] ? (x.mu[key] || 0) : Object.entries(x.mu).filter(([h]) => HEADS[h] && HEADS[h][2] === key).reduce((a, [, v]) => a + v, 0);

$('exSearch').addEventListener('input', drawExPick);

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

$('swEquip').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(b){ SW.taken = b.dataset.v; drawSwap(); } });

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
  ai.disabled = true; ai.textContent = t('thinking');
  try{
    const done = active.exercises.map(x => `${exById(x.exId).en}: ${x.sets.filter(s => s.done && s.type !== 'W').map(s => `${s.w}x${s.r}`).join(', ') || 'planned'}`).join('; ');
    const wk = hitsFrom(sessions.filter(s => -daysUntil(s.date) <= 6), false), wkTxt = Object.entries(wk).map(([h, v]) => `${HEADS[h][0]} ${Math.round(v)} sets`).join(', ');
    const names = EX().filter(x => x.m !== 'cardio').map(x => x.en).join('; ');
    const r = await gemini(`You are a gym coach. Today's workout type: ${active.type}. Done so far: ${done || 'nothing yet'}. Hard sets per muscle in the last 7 days: ${wkTxt || 'none'}. Goal: ${targets ? targets.goal : 'build muscle'}.
Suggest the 3 best next exercises to balance this session (fill muscles that are missing, avoid overdoing ones already hit). Pick ONLY from this list, using the exact English names: ${names}.
Reply in ${lang === 'el' ? 'Greek' : 'English'} for the "why". Return ONLY JSON: {"picks":[{"name":string,"why":string,"sets":number,"reps":string}]}`, null, (i, n) => { ai.textContent = t('cancelRec', { i, n }).replace(/^✕\s*\S+\s*·\s*/, ''); });
    const picks = (r.picks || []).map(p => ({ ...p, ex: EX().find(x => norm(x.en) === norm(p.name)) || EX().find(x => norm(x.en).includes(norm(p.name)) || norm(p.name).includes(norm(x.en))) })).filter(p => p.ex);
    $('nxAIOut').innerHTML = picks.map(p => `<div class="nxrow"><small class="rmeta">✨ ${esc(p.why || '')}${p.sets ? ` · ${p.sets}×${esc(p.reps || '')}` : ''}</small>${exTiles([p.ex])}</div>`).join('') || `<p class="hint">${t('nothingHere')}</p>`;
    ai.remove();
  }catch(err){ ai.disabled = false; ai.textContent = t('nxAI'); $('nxAIOut').innerHTML = `<p class="hint">${esc(err.message)}</p>`; }
});

// ---------- finish → summary (ties into food, supplements and the pet) ----------
$('sesMin').addEventListener('click', () => { close('ovSession'); renderAll(); });

$('sesDiscard').addEventListener('click', async () => { if(!(await ask(t('discardQ')))) return; active = null; saveG('act'); REST = null; $('restBar').classList.add('hide'); close('ovSession'); renderAll(); });

$('sesFinish').addEventListener('click', async () => {
  const doneSets = active.exercises.flatMap(x => x.sets.filter(s => s.done));
  if(!doneSets.length){ toast(t('noSets')); return; }
  const filled = active.exercises.some(x => x.sets.some(s => !s.done && (s.w !== '' || s.r !== '')));
  if(filled && !(await ask(t('unfinished')))) return;
  const end = new Date(), mins = Math.max(1, Math.round((end - (active.clock0 || new Date(active.start).getTime())) / 60000));
  const cardioMin = active.exercises.filter(x => isCardio(x.exId)).flatMap(x => x.sets.filter(s => s.done)).reduce((a, s) => a + (+s.r || 0), 0);
  const kcal = Math.round(bodyW() * (5 * Math.max(0, mins - cardioMin) + 7 * cardioMin) / 60);
  const vol = Math.round(active.exercises.filter(x => !isCardio(x.exId)).flatMap(x => x.sets.filter(s => s.done && s.type !== 'W')).reduce((a, s) => a + (+s.w || 0) * (+s.r || 0), 0));
  const ses = { ...active, end: end.toISOString(), mins, kcal, vol, exercises: active.exercises.map(x => ({ ...x, sets: x.sets.filter(s => s.done) })).filter(x => x.sets.length) };
  ses.recovEst = estimateRecovery(ses); ses.recov = { ...ses.recovEst };
  sessions.push(ses); saveG('ses');
  if(comeback && comebackFactor() >= 1){ comeback = null; saveG('cb'); }
  active = null; saveG('act'); REST = null; $('restBar').classList.add('hide');
  petAward('workout', 1);
  close('ovSession'); showSummary(ses); renderAll();
  if(!ses.tplId) askSaveTpl(ses);
});

$('smMeal').addEventListener('click', () => { close('ovSummary'); curDay = todayKey(); go('today'); setTimeout(() => { if(settings.geminiKey && targets) $('planBtn').click(); else openLogSearch(); }, 120); });

$('gTabs').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; ui.gtab = b.dataset.v; saveUI(); renderGym(); });

$('gStart').addEventListener('click', () => {
  if(active) return openSession();
  if(!tpls.length) return startSession(null);   // nothing saved yet: straight into an empty workout
  const today = planFor(todayKey()), tp = today && today.tpl && tpls.find(x => x.id === today.tpl);
  $('stList').innerHTML = (tp ? [tp] : []).concat(tpls.filter(x => x !== tp)).map(x => `<button class="sitem" data-st="${x.id}"><span class="e">${x === tp ? '⭐' : '🏋️'}</span><span class="t"><b>${esc(x.name)}</b><small>${t('nEx', { n: x.exercises.length })}</small></span></button>`).join('') +
    `<button class="sitem" data-st=""><span class="e">➕</span><span class="t"><b>${t('emptyWorkout')}</b></span></button>`;
  open('ovStart');
});

$('stList').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if(b) startSession(tpls.find(x => x.id === b.dataset.st) || null); });

$('gTplV').addEventListener('click', e => {
  if(e.target.closest('#tpNew')) return openTpl(null);
  const c = e.target.closest('[data-tp]'); if(!c) return; const x = tpls.find(y => y.id === c.dataset.tp);
  if(e.target.closest('[data-go-tp]')){ if(active) return openSession(); return startSession(x); }
  openTpl(x);
});

document.querySelectorAll('#tpType button').forEach(b => b.addEventListener('click', () => { TP.type = b.dataset.v; setSeg('#tpType', TP.type); }));

$('tpList').addEventListener('click', e => {
  const r = e.target.closest('[data-i]'); if(!r) return; const i = +r.dataset.i, x = TP.exercises[i];
  if(e.target.closest('[data-up]') && i > 0){ TP.exercises.splice(i - 1, 0, TP.exercises.splice(i, 1)[0]); }
  if(e.target.closest('[data-sd]')) x.sets = Math.max(1, x.sets - 1); if(e.target.closest('[data-su]')) x.sets = Math.min(10, x.sets + 1);
  if(e.target.closest('[data-rm]')) TP.exercises.splice(i, 1);
  if(!e.target.matches('[data-reps]')) drawTpl();
});

$('tpList').addEventListener('input', e => { if(e.target.matches('[data-reps]')) TP.exercises[+e.target.closest('[data-i]').dataset.i].reps = e.target.value; });

$('tpAdd').addEventListener('click', () => openExPick(id => { TP.exercises.push({ exId: id, sets: isCardio(id) ? 1 : 3, reps: isCardio(id) ? '20' : defReps(exById(id).rest), rest: exById(id).rest }); drawTpl(); }));

$('tpSave').addEventListener('click', () => {
  TP.name = $('tpName').value.trim() || ({ upper: t('wUpper'), legs: t('wLegs'), full: t('wFull'), cardio: t('wCardio') }[TP.type]);
  if(TP.id){ const i = tpls.findIndex(y => y.id === TP.id); tpls[i] = TP; } else { TP.id = uid(); tpls.push(TP); }
  saveG('tpl'); close('ovTpl'); renderAll(); toast(t('updated'));
});

$('tpDel').addEventListener('click', () => { const i = tpls.findIndex(y => y.id === TP.id); if(i === -1) return; const [gone] = tpls.splice(i, 1); saveG('tpl'); close('ovTpl'); renderAll();
  toast(t('deleted', { n: gone.name }), t('undo'), () => { tpls.splice(i, 0, gone); saveG('tpl'); renderAll(); }); });

$('gProgV').addEventListener('change', e => { if(e.target.id === 'gLast'){ ui.gymLast = e.target.value || null; saveUI(); renderGym(); } });

$('gProgV').addEventListener('click', e => { const c = e.target.closest('[data-ses]'); if(c){ const s = sessions.find(x => x.id === c.dataset.ses); if(s) showSummary(s); } });

const petLevel = xp => Math.floor(xp / 5) + 1, petStage = lv => lv >= 12 ? 2 : lv >= 5 ? 1 : 0;

$('ppList').addEventListener('click', e => { const b = e.target.closest('[data-pp]'); if(!b) return;
  pet = { species: b.dataset.pp, name: PETS[b.dataset.pp].names[0], xp: 0, lastFed: todayKey(), createdAt: new Date().toISOString(), awards: {}, log: [] };
  saveG('pet'); close('ovPetPick'); celebrate('🥚'); renderAll(); setTimeout(openPet, 250); });

$('petBody').addEventListener('change', e => { if(e.target.id === 'petName'){ pet.name = e.target.value.trim() || PETS[pet.species].names[0]; saveG('pet'); renderPetTile(); } });

$('tPet').addEventListener('click', openPet);

$('tGym').addEventListener('click', () => { if(active) openSession(); else go('gym'); });

// ---------- swipe from the left edge = back ----------
(() => {
  let sx = null, sy = 0, st = 0;
  document.addEventListener('touchstart', e => { const t0 = e.touches[0]; if(t0.clientX < 28){ sx = t0.clientX; sy = t0.clientY; st = Date.now(); } else sx = null; }, { passive: true });
  document.addEventListener('touchend', e => {
    if(sx === null) return; const t1 = e.changedTouches[0], dx = t1.clientX - sx, dy = Math.abs(t1.clientY - sy); sx = null;
    if(dx < 70 || dy > 60 || Date.now() - st > 700) return;
    goBack();
  }, { passive: true });
})();

const recState = r => r >= .8 ? 'ok' : r >= .5 ? 'mid' : 'low';

$('gRecV').addEventListener('click', e => {
  const g = e.target.closest('[data-g]'); if(g && g.dataset.g) return openSore(g.dataset.g);
  const r = e.target.closest('[data-sore]'); if(r) return openSore(r.dataset.sore);
  if(e.target.closest('#soreAny')) return openSore(null);
});

$('soRange').addEventListener('input', soreLbl);

$('soGroups').addEventListener('click', e => { const b = e.target.closest('[data-sg]'); if(!b) return; SO.g = b.dataset.sg; $('soGroups').querySelectorAll('.fchip').forEach(x => x.classList.toggle('on', x === b)); $('soTitle').textContent = `${t('soreQ')} · ${ML(SO.g)}`; const lv = ((ui.sore || {})[todayKey()] || {})[SO.g]; $('soRange').value = lv ?? 0; soreLbl(); });

$('soSave').addEventListener('click', () => {
  if(!SO.g){ toast(t('tapMuscle')); return; }
  ui.sore = ui.sore || {}; const k = todayKey(); ui.sore = { [k]: { ...(ui.sore[k] || {}), [SO.g]: +$('soRange').value } }; saveUI();
  close('ovSore'); renderAll(); toast(t('soreSaved'));
});

$('homeAlerts').addEventListener('click', e => { if(e.target.closest('[data-rec]')){ ui.gtab = 'rec'; saveUI(); } }, true);

$('dRec').addEventListener('click', e => { if(e.target.closest('[data-gorec]')){ ui.gtab = 'rec'; saveUI(); go('gym'); } });
