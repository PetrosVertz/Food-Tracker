// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

let fridge = Store.load('fridge', []), groc = Store.load('groc', []), dayLog = Store.load('dayLog', {}), days = Store.load('days', {}), targets = Store.load('targets', null), plans = Store.load('plans', {});

const saveFridge = () => Store.save('fridge', fridge), saveGroc = () => Store.save('groc', groc), saveLog = () => Store.save('dayLog', dayLog), saveDays = () => Store.save('days', days);

const dayStr = d => d.toLocaleDateString('en-CA');

const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dayStr(d); };

const daysUntil = s => Math.round((new Date(s + 'T12:00:00') - new Date(todayKey() + 'T12:00:00')) / 864e5);

const toMin = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };

const fromMin = m => { m = Math.max(0, Math.min(1439, Math.round(m))); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

const nowHM = () => fromMin(new Date().getHours() * 60 + new Date().getMinutes());

const stockOf = foodId => !kitchenOn() ? 0 : r1(fridge.filter(it => it.foodId === foodId).reduce((s, it) => s + it.qty, 0));

const mealStock = mealId => !kitchenOn() ? 0 : r1(fridge.filter(it => it.mealId === mealId).reduce((s, it) => s + it.qty, 0));

$('fSearch').addEventListener('input', renderFridge);

$('fLoc').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; ui.floc = b.dataset.v; saveUI(); renderFridge(); });

// 0.7.3: tap a fridge row = its menu drops down (fridge.js)
$('fList').addEventListener('click', shopFClick);
$('fList').addEventListener('change', shopFChange);
$('fList').addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches('[data-fpack],[data-fgr]')) e.target.blur(); });

$('faAmt').addEventListener('input', faHint);

 $('faCount').addEventListener('input', faHint);

$('faPacks').addEventListener('click', e => { const b = e.target.closest('[data-amt]'); if(b){ $('faAmt').value = b.dataset.amt; faHint(); } });

document.querySelectorAll('#faLoc button').forEach(b => b.addEventListener('click', () => {
  FA.loc = b.dataset.v; setSeg('#faLoc', FA.loc);
}));

$('faSave').addEventListener('click', () => {
  const amt = num('faAmt'), n = Math.max(1, Math.round(num('faCount') || 1));
  if(!(amt > 0)){ toast(t('needAmount')); return; }
  if(FA.food){ const f = foods.find(x => x.id === FA.food.id); if(f){ f.minStock = num('faMin') || null; f.noAutoGrocery = !$('faAuto').checked; saveFoods(); } }
  if(FA.mode === 'new'){
    // 0.7: n packs are n separate packs (they stack into one row), and the pack size + count are remembered for next time
    for(let i = 0; i < n; i++) addToFridge({ foodId: FA.food.id, qty: r1(amt), packSize: r1(amt), unit: FA.food.unit, loc: FA.loc });
    learnPack(FA.food.id, amt, n); close('ovFAdd'); renderAll();
    toast(t('addedFridge', { l: t(LOC_KEY[FA.loc]).toLowerCase() }), t('scanNext'), () => startScan('fridge'));
  } else {
    const it = fridge.find(x => x.id === FA.item.id);
    if(it){ if(it.qtyGuess && it.foodId){ fridge.filter(x => x.foodId === it.foodId && x.qtyGuess).forEach(x => { x.qty = x.packSize = r1(amt); delete x.qtyGuess; }); learnPack(it.foodId, amt); }   // fixing a guessed pack fixes it for next time too
      it.qty = r1(amt); it.loc = FA.loc; delete it.exp; delete it.expAuto; delete it.qtyGuess; }
    saveFridge(); if(it && it.foodId) checkRestock(it.foodId); close('ovFAdd'); renderAll(); toast(t('updated'));
  }
});

$('faDel').addEventListener('click', () => {
  const i = fridge.findIndex(x => x.id === FA.item.id); if(i === -1) return;
  const [gone] = fridge.splice(i, 1); saveFridge(); const info = itemInfo(gone); const added = gone.foodId ? checkRestock(gone.foodId) : false;
  close('ovFAdd'); renderAll();
  toast(t('removedItem', { n: info ? info.name : '' }) + (added ? ' ' + t('toList') : ''), t('undo'), () => {
    fridge.splice(i, 0, gone); saveFridge(); if(added){ groc = groc.filter(g => !(g.foodId === gone.foodId && g.why && !g.done)); saveGroc(); } renderAll(); });
});

$('amN').addEventListener('input', amFromN);
$('amU').addEventListener('change', () => { AM.u = $('amU').selectedIndex; if(!(num('amAmt') > 0)){ $('amN').value = 1; amFromN(); } else amRes(); amDD(); });
$('amDDB').addEventListener('click', () => $('amDDM').classList.toggle('hide'));
$('amDDM').addEventListener('click', e => { const b = e.target.closest('[data-amu]'); if(!b) return; $('amU').selectedIndex = +b.dataset.amu; $('amDDM').classList.add('hide'); $('amU').dispatchEvent(new Event('change')); });

$('amQuick').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(b){ $('amAmt').value = b.dataset.v; amUnits(AM); amRes(); } });

$('amLog').addEventListener('change', () => $('amTimeRow').classList.toggle('hide', !$('amLog').checked));

$('amSave').addEventListener('click', () => {
  const a = num('amAmt'); if(!(a > 0)){ toast(t('needAmount')); $('amN').focus(); return; }
  const info = AM.info, time = $('amTime').value || nowHM(); let extra = '';
  if(AM.mode === 'use'){
    const it = fridge.find(x => x.id === AM.item.id);
    if(it){ const d = Math.min(it.qty, a); it.qty = r1(it.qty - d); if(it.qty <= 0.05) fridge = fridge.filter(x => x !== it); saveFridge();
      if(it.foodId && checkRestock(it.foodId)) extra = ' ' + t('toList'); }
    if($('amLog').checked) logEntry(todayKey(), info, a, time);
    close('ovAmt'); renderAll(); toast(t('usedToast', { a: fmtSize(a, info.unit), n: info.name }) + extra);
  } else if(AM.mode === 'log'){
    logEntry(curDay, info, a, time);
    if(!$('amFridgeWrap').classList.contains('hide') && $('amFridge').checked){
      const r = takeFromFridge(info.meal ? { mealId: info.meal.id } : { foodId: info.food.id }, a); if(r.added) extra = ' ' + t('toList'); }
    close('ovAmt'); renderAll(); toast(t('logged', { n: info.name }) + extra);
  } else {
    const list = dayLog[AM.date] || [], e = list.find(x => x.id === AM.entry.id);
    if(e){ const m = macrosFor(info.per, a); Object.assign(e, { amt: r1(a), time, kcal: m.kcal, p: m.p, c: m.c, f: m.f }); saveLog(); }
    close('ovAmt'); renderAll(); toast(t('updated'));
  }
});

$('amFinish').addEventListener('click', () => {
  if(AM.mode === 'editlog'){
    const list = dayLog[AM.date] || [], i = list.findIndex(x => x.id === AM.entry.id); if(i === -1) return;
    const [gone] = list.splice(i, 1); saveLog(); close('ovAmt'); renderAll();
    toast(t('deleted', { n: gone.name }), t('undo'), () => { list.splice(i, 0, gone); dayLog[AM.date] = list; saveLog(); renderAll(); }); return;
  }
  const it = fridge.find(x => x.id === AM.item.id); if(!it) return;
  fridge = fridge.filter(x => x !== it); saveFridge(); const added = it.foodId ? checkRestock(it.foodId) : false;
  close('ovAmt'); renderAll(); toast(t('finishedToast', { n: AM.info.name }) + (added ? ' ' + t('toList') : ''));
});

// 0.8 (24 Nov): the Shopping List add box uses the Log Food search engine (Search.local) and puts first what you actually buy:
// 1. foods you bought before (in My Fridge now or ticked on this list before), with your usual pack and count; 2. other foods you logged,
// most logged first; 3. your other saved foods; 4. the built-in list. Picking one links it, so ticking it later puts the right pack in My Fridge.
function grocBought(){ const s = new Set(); fridge.forEach(it => { if(it.foodId) s.add(it.foodId); }); groc.forEach(g => { if(g.done && g.foodId) s.add(g.foodId); }); foods.forEach(f => { if(f.usualPack) s.add(f.id); }); return s; }
function grocLogged(){ const n = {}; Object.keys(dayLog).forEach(d => (dayLog[d] || []).forEach(e => { if(e.refId && e.kind !== 'meal') n[e.refId] = (n[e.refId] || 0) + 1; })); return n; }
function grocRank(mine){ const b = grocBought(), lg = grocLogged(), tier = f => b.has(f.id) ? 0 : lg[f.id] ? 1 : 2;
  return mine.map((f, i) => ({ f, i, k: tier(f) })).sort((x, y) => x.k - y.k || (x.k === 1 ? (lg[y.f.id] || 0) - (lg[x.f.id] || 0) : 0) || x.i - y.i).map(x => ({ f: x.f, k: x.k })); }
$('gIn').addEventListener('input', () => {
  const q = $('gIn').value.trim(); if(!q){ $('gSugg').innerHTML = ''; return; }
  GS = searchLocal(q, false, { mineMax: 40 }); const R = grocRank(GS.mine).slice(0, 5); GS.mine = R.map(r => r.f); GS.std = GS.std.slice(0, 3);
  const usual = f => [f.usualPack ? fmtSize(f.usualPack, f.unit || 'g') : '', (f.usualCount || 1) > 1 ? '×' + f.usualCount : ''].filter(Boolean).join(' ');
  $('gSugg').innerHTML = R.map((r, i) => { const f = r.f, u = r.k === 0 ? usual(f) : '';
      return itemHtml('m', i, catIcon(f.cat), foodName(f), [r.k === 0 ? t('grpBought') : r.k === 1 ? t('grpLogged') : (f.brand && !f.noBrand ? esc(f.brand) : t('grpMine')), u ? esc(u) : ''].filter(Boolean).join(' · ')); }).join('') +
    GS.std.map((g, i) => itemHtml('s', i, catIcon(g.cat), L(g), t('grpStd'))).join('') +
    `<button class="sitem" data-k="t"><span class="t"><b>${t('addAsText', { q: esc(q) })}</b></span></button>`;
});

$('gIn').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); $('gAdd').click(); } });

$('gAdd').addEventListener('click', () => {
  const q = $('gIn').value.trim(); if(!q) return;
  const exact = foods.find(f => norm(foodName(f)) === norm(q)); addGroc(exact || null, q);
});

$('gSugg').addEventListener('click', e => {
  const b = e.target.closest('.sitem'); if(!b) return; const k = b.dataset.k, i = +b.dataset.i;
  if(k === 'm') addGroc(GS.mine[i]); else if(k === 's') addGroc(saveGeneric(GS.std[i])); else addGroc(null, $('gIn').value.trim());
});

document.getElementById('pgGroc').addEventListener('click', e => {
  const g = grocById(e.target);
  if(g && e.target.closest('[data-tick]')){ Phone.vibrate(20); grocTick(g); return; }   // 0.7: ticked = in the fridge (unticking takes it back out)
  if(g && e.target.closest('[data-inc]')){ g.count++; saveGroc(); renderGroc(); return; }
  if(g && e.target.closest('[data-dec]')){ if(g.count > 1){ g.count--; saveGroc(); renderGroc(); return; }   // − at 1 takes it off the list (Undo in the toast)
    const i = groc.indexOf(g); groc.splice(i, 1); saveGroc(); renderAll(); toast(t('deleted'), t('undo'), () => { groc.splice(i, 0, g); saveGroc(); renderAll(); }); return; }
  if(g && e.target.closest('[data-del]')){ const i = groc.indexOf(g); groc.splice(i, 1); saveGroc(); renderAll();
    toast(t('deleted', { n: g.name }), t('undo'), () => { groc.splice(i, 0, g); saveGroc(); renderAll(); }); return; }
  if(e.target.closest('#gClear')){ groc = groc.filter(x => !x.done); saveGroc(); renderAll(); return; }
});

// ---------- today's food ----------
let curDay = todayKey();
// V3: when the calendar day changes while the app is open (midnight, or waking from the background), Today moves on and the Gym Day / Rest Day pill is redrawn.
// Looking at another day is left alone.
let lastToday = curDay;
function dayRolled(){ const n = todayKey(); if(n === lastToday) return; if(curDay === lastToday) curDay = n; lastToday = n; renderAll(); armMidnight(); }
function armMidnight(){ clearTimeout(armMidnight.t); const n = new Date(); armMidnight.t = setTimeout(dayRolled, new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1) - n); }
document.addEventListener('visibilitychange', () => { if(!document.hidden) dayRolled(); }); addEventListener('focus', dayRolled); armMidnight();

$('dPrev').addEventListener('click', () => { curDay = addDays(curDay, -1); renderToday(); });

$('dNext').addEventListener('click', () => { curDay = addDays(curDay, 1); renderToday(); });

// Today: gym or rest (gym keeps the work type and time it had, or your usual gym time)
document.querySelectorAll('#dType button').forEach(b => b.addEventListener('click', () => { const di = dayInfo(curDay);
  setDay(b.dataset.v === 'gym' ? { type: 'gym', work: di.work || 'upper', time: di.time || profile.gymTime || '18:00' } : { type: b.dataset.v, work: di.work, time: di.time }); }));

document.querySelectorAll('#dWork button').forEach(b => b.addEventListener('click', () => setDay({ type: 'gym', work: b.dataset.v })));

$('dTime').addEventListener('change', () => setDay({ type: 'gym', time: $('dTime').value }));

$('dTotals').addEventListener('click', e => { if(e.target.closest('[data-targets]')) openTargets(); });

$('targetsBtn').addEventListener('click', openTargets);

$('dLog').addEventListener('click', e => { const c = e.target.closest('[data-eid]'); if(!c) return; const en = (dayLog[curDay] || []).find(x => x.id === c.dataset.eid); if(!en) return;
  if(en.kind === 'quick') openQuick(en); else openAmt({ mode: 'editlog', entry: en, date: curDay }); });

// 0.6.9.3: the circular arrows on the Eaten header (only while today is empty) copy yesterday's food in, with Undo
$('copyYesterday').addEventListener('click', e => {
  e.preventDefault(); e.stopPropagation();   // it sits in the header; don't fold the list
  const y = dayLog[addDays(curDay, -1)] || []; if(!y.length){ toast(t('nothingYesterday')); return; }
  const day = curDay, added = y.map(z => ({ ...z, id: uid() }));
  dayLog[day] = (dayLog[day] || []).concat(added); saveLog(); renderAll();
  toast(t('copiedDay', { n: y.length }), t('undo'), () => { const ids = new Set(added.map(z => z.id)); dayLog[day] = (dayLog[day] || []).filter(z => !ids.has(z.id)); saveLog(); renderAll(); });
});


$('lSearch').addEventListener('input', drawLog);

$('lAdded').addEventListener('click', e => {
  if(e.target.closest('#lComboBtn')){ LW.naming = true; lwChips(); setTimeout(() => $('lComboName') && $('lComboName').focus(), 50); return; }
  if(e.target.closest('#lComboSave')){ const n = ($('lComboName').value || '').trim(); if(!n){ $('lComboName').focus(); return; }
    const c = comboFromEntries(n, LW.added); LW.naming = false; LW.added = []; lwChips(); drawLog(); toast(t('comboSaved', { n: c.name })); }
});
$('lAdded').addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.id === 'lComboName') $('lComboSave').click(); });
$('lResults').addEventListener('click', e => {
  const cr = e.target.closest('[data-combo]'); if(cr){ const i = +cr.dataset.combo, c = combos[i]; if(!c) return;
    if(e.target.closest('[data-cplus]')) return logCombo(c);
    if(e.target.closest('[data-cdel]')){ combos.splice(i, 1); saveCombos(); LW.copen = null; drawLog(); toast(t('deleted'), t('undo'), () => { combos.splice(i, 0, c); saveCombos(); drawLog(); }); return; }
    if(e.target.closest('[data-copen]')){ LW.copen = LW.copen === i ? null : i; drawLog(); } return; }
  if(e.target.closest('#lOnline')){ runLogOnline($('lSearch').value.trim()); return; }
  const dy = e.target.closest('[data-dym]'); if(dy){ $('lSearch').value = dy.dataset.dym; $('lSearch').dispatchEvent(new Event('input')); return; }
  if(e.target.closest('#lTakeaway')){ const q = $('lSearch').value.trim(); close('ovLog'); logQOpenSheet(q); return; }
  const row = e.target.closest('.lrow'); if(!row) return; const st = lwState(row.dataset.k, +row.dataset.i); if(!st) return;
  if(e.target.closest('[data-lplus]')) return lwAdd(st);                                  // ＋ = the usual amount, one tap
  if(e.target.closest('[data-ladd]')) return lwAdd(st);
  const dd = e.target.closest('[data-ldd]'); if(dd){ lddToggle(row, dd); return; }
  const lu = e.target.closest('[data-lu]'); if(lu){ const j = +lu.dataset.lu, g = (+st.n || 0) * st.units[st.u].size;
    st.u = j; st.n = st.units[j].k === 'g' ? r1((g || 100) / st.units[j].size) : 1; row.querySelector('.lan').value = fmt(st.n); row.querySelector('.ldm').classList.add('hide'); lwUpdate(row, st); return; }
  const ck = e.target.closest('[data-lck]'); if(ck){ st.ck = +ck.dataset.lck; lwUpdate(row, st); return; }
  if(e.target.closest('[data-lopen]')){ const key = st.k + st.i; LW.open = LW.open === key ? null : key;
    document.querySelectorAll('#lResults .lrow.open').forEach(r => { if(r !== row){ r.classList.remove('open'); const p = r.querySelector('.lpn'); if(p) p.remove(); } });
    row.classList.toggle('open', LW.open === key); const p = row.querySelector('.lpn'); if(p) p.remove(); else row.insertAdjacentHTML('beforeend', lwPanel(st)); }
});
$('lResults').addEventListener('input', e => { if(!e.target.matches('.lan')) return; const row = e.target.closest('.lrow'), st = lwState(row.dataset.k, +row.dataset.i); st.n = +e.target.value || 0; lwUpdate(row, st); });
$('lResults').addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches('.lan')){ const row = e.target.closest('.lrow'); lwAdd(lwState(row.dataset.k, +row.dataset.i)); } });

$('lScan').addEventListener('click', () => { close('ovLog'); startScan('log'); });

document.querySelectorAll('#tgGoal button').forEach(b => b.addEventListener('click', () => { TG.goal = b.dataset.v; setSeg('#tgGoal', TG.goal); }));

$('tgCalc').addEventListener('click', () => {
  const bw = num('tgBw'); if(!(bw > 30)){ toast(t('calcNeedW')); close('ovSBody'); go('gym-prog'); return; }   // Calculate uses your latest weigh-in (Gym → Progress)
  const ct = calcTargets(bw, TG.goal), g = ct.gym, r = ct.rest;   // 0.6.2: uses sex + height when known
  [['G', g], ['R', r]].forEach(([p, o]) => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).value = o[x])); tgCheck();
});

['G', 'R'].forEach(p => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).addEventListener('input', tgCheck)));

$('tgSave').addEventListener('click', () => {
  const rd = p => { const o = {}; ['k', 'p', 'c', 'f'].forEach(x => o[x] = num('tg' + p + x)); if(!o.k && o.p !== null && o.c !== null && o.f !== null) o.k = Math.round(o.p * 4 + o.c * 4 + o.f * 9); return o; };
  // RECOVERY+: goalAt = the day the goal last changed, so food days before a switch are never judged against the new goal
  const goalAt = targets && targets.goal === TG.goal ? targets.goalAt : todayKey();
  targets = { goal: TG.goal, bw: num('tgBw'), gym: rd('G'), rest: rd('R'), fib: num('tgFib') || null, lock: { G: MXL.G, R: MXL.R }, ...(goalAt ? { goalAt } : {}) };
  if(!targets.rest.k) targets.rest = { ...targets.gym };
  Store.save('targets', targets); renderAll(); toast(t('targetsSaved'));   // 20B: the targets sit on Body and Goals: Save keeps you there, like the body Save
});

$('planShow').addEventListener('click', e => {
  const b = e.target.closest('[data-plog]'); if(!b) return;
  planAddItem(+b.dataset.plog, +b.dataset.pj);
});

// Fill My Macros: the pill on the Logged Foods line. It shrinks to the chef's thinking face and three hopping dots; no pop-up robot (the AI call is quiet).
// Only when the Food Coach is already out as a bubble does that bubble do the thinking. Press again while it thinks to cancel.
function planBusy(on){
  const btn = $('planBtn'), face = btn.querySelector('.fmface'); btn.classList.toggle('busy', on); btn.setAttribute('aria-busy', on ? 'true' : 'false');
  face.innerHTML = AI.robot('chef', 24, on); if(Coach.has('chef')) Coach.think('chef', on);
}
$('planBtn').addEventListener('click', async () => {
  if(planCtl){ planCtl.abort(); return; }
  const tg = targetFor(curDay); if(!tg){ toast(t('planNeedTargets')); openTargets(); return; }
  if(!AI.hasKey()){ toast(t('needKey')); openSettings(); return; }
  Phone.haptic(); planCtl = new AbortController(); const ctl = planCtl; planBusy(true);
  try{
    const r = await gemini(planPrompt(), null, null, ctl.signal, { quiet: true });
    planKeep(r);
    setTimeout(() => $('planShow').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }catch(err){ if(!err.cancelled) toast(t('planFail', { e: err.message })); renderPlan(); }
  finally{ planCtl = null; planBusy(false); }
});
$('planBtn').querySelector('.fmface').innerHTML = AI.robot('chef', 24);
// Logged Foods stays open: the list is always there (the pill sits where the arrow was)
$('dEatenFold').querySelector('summary').addEventListener('click', e => { if(!e.target.closest('#copyYesterday')) e.preventDefault(); });


document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', () => goBack()));

$('testKey').addEventListener('click', async () => {
  const key = $('sKey').value.trim(), el = $('keyStatus');
  if(!key){ status(el, t('keyEmpty'), true); return; }
  status(el, t('keyTesting'));
  try{
    const id = typeof SPROV === 'string' ? SPROV : 'gemini', n = await AI.testKey(key, id);   // the provider shown in Settings › AI, saved in its own slot
    const list = await AI.modelsOf(id); fillModelPicks(list);
    status(el, list.length ? t('keyOkN', { n: list.length }) : id === 'gemini' ? t('keyOk', { n }) : t('keyOk1')); el.style.color = 'var(--ok)';
  }catch(e){ el.style.color = ''; status(el, t('keyFail', { e: e.name === 'AbortError' ? t('timedOut') : e.message }), true); }
});

// Carb Timing: the windows follow the real workout start (on) or the Week Planner time (off)
$('realStart').addEventListener('change', () => { profile.realStart = $('realStart').checked; saveProfile();
  const tk = todayKey(), pl = planFor(tk), d = days[tk];
  if(d && d.type === 'gym'){ const real = active && active.date === tk ? fromMin(new Date(active.start).getHours() * 60 + new Date(active.start).getMinutes()) : null;
    const t_ = profile.realStart ? real : pl && pl.time; if(t_){ d.time = t_; saveDays(); } }
  renderAll(); });

// Log food sheet: Food Library, yesterday's food (Refinements: its Food Coach button is gone; the pill beside Log Food on Today opens the coach)
logQWire(); logCalWire(); logFabWire();
$('lTrack').addEventListener('click', () => { close('ovLog'); go('foods'); });
$('lYesterday').addEventListener('click', () => { close('ovLog'); $('copyYesterday').click(); });
// old Add Takeaway sheet: still opens to edit takeaway entries logged before 0.7.1
document.querySelectorAll('#qaSize button').forEach(b => b.addEventListener('click', () => setSeg('#qaSize', b.dataset.v)));
$('qaName').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); saveQuick(); } });
// Extras: tap the electrolytes to switch % / mg
$('dExtrasBody').addEventListener('click', e => { if(e.target.closest('[data-elec]')){ ui.elecMg = !ui.elecMg; saveUI(); renderToday(); } });
// calorie card: Daily Targets; Advanced is a switch, off every time the app opens
$('tgCardBtn').addEventListener('click', openTargets);
$('advSw').checked = false;
$('advSw').addEventListener('change', () => { const b = $('advBody'); b.classList.toggle('hide', !$('advSw').checked); if($('advSw').checked) b.animate && b.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1)' }); });
// Eaten: swipe to delete
makeSwipeDelete($('dLog'), '.card[data-eid]', c => delEntry(c.dataset.eid));
makeSwipeDelete($('planShow'), '.card[data-pi]', c => planDropItem(+c.dataset.pi, +c.dataset.pj));   // 0.7.4.3: swipe a Fill My Macros suggestion away
// Daily Targets: padlocks
$('tgBox').addEventListener('click', e => { const b = e.target.closest('[data-lock]'); if(!b) return; const P = b.dataset.p, k = b.dataset.lock;
  MXL[P] = MXL[P] === k ? null : k; MXLG[P] = +$('tg' + P + k).value || 0; drawLocks(); });
$('tgBox').addEventListener('input', e => { const id = e.target.id || '', m = id.match(/^tg([GR])([pcf])$/); if(m && MXL[m[1]] === m[2]) MXLG[m[1]] = +e.target.value || 0; });
// Fridge: no Fridge/Freezer tabs; "Frozen" is a switch when adding, frozen things show ❄️
ui.floc = 'all';
$('faFrozen').addEventListener('change', () => { const b = $('faLoc').querySelector(`[data-v="${$('faFrozen').checked ? 'freezer' : 'fridge'}"]`); if(b) b.click(); });

// My Food Log: scrolling the foods down slides Log Food + the coach button down into the bar (body.pillsunk). They come back up only when the
// list is back at its very top (or on leaving the page); the first nudge down starts them sinking; scrolling up a little or touching elsewhere does not bring them back.
{ const pg = $('pgToday'), unsink = () => document.body.classList.remove('pillsunk'); let last = 0;
  if(pg){ pg.addEventListener('scroll', e => { const el = e.target; if(el !== $('dScroll') && el !== pg) return; const y = el.scrollTop;
      if(y > 1 && y > last + 1) document.body.classList.add('pillsunk'); else if(y <= 2) unsink(); last = y; }, { capture: true, passive: true });
    addEventListener('hashchange', () => { unsink(); last = 0; }); } }
// 0.8: My Food Log keeps its top pinned while there is room (today.js todayFit); re-checked when the top or the screen changes size
if(typeof ResizeObserver === 'function'){ const ro = new ResizeObserver(() => { cancelAnimationFrame(todayFit.f); todayFit.f = requestAnimationFrame(todayFit); });
  ['dBlocks', 'pgToday'].forEach(id => $(id) && ro.observe($(id))); const mc = document.querySelector('#pgToday .macrocard'); if(mc) ro.observe(mc); }
