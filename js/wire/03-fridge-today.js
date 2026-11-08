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

const isIOS = Phone.isIOS;

const stockOf = foodId => r1(fridge.filter(it => it.foodId === foodId).reduce((s, it) => s + it.qty, 0));

const mealStock = mealId => r1(fridge.filter(it => it.mealId === mealId).reduce((s, it) => s + it.qty, 0));

$('fSearch').addEventListener('input', renderFridge);

$('fLoc').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; ui.floc = b.dataset.v; saveUI(); renderFridge(); });

$('fAlerts').addEventListener('click', e => { if(e.target.closest('[data-cookup]')){ go('meals'); setTimeout(() => openCook(null, 'new'), 80); } });

$('fList').addEventListener('click', e => {
  const pm = e.target.closest('[data-minus],[data-plus]'); if(pm){ stepPack(pm); return; }
  const c = e.target.closest('[data-fid]'); if(!c) return; const it = fridge.find(x => x.id === c.dataset.fid); if(!it) return;
  if(e.target.closest('[data-use]')) openAmt({ mode: 'use', item: it }); else openFridgeItem(it);
});

$('faAmt').addEventListener('input', faHint);

 $('faCount').addEventListener('input', faHint);

$('faPacks').addEventListener('click', e => { const b = e.target.closest('[data-amt]'); if(b){ $('faAmt').value = b.dataset.amt; faHint(); } });

document.querySelectorAll('#faLoc button').forEach(b => b.addEventListener('click', () => {
  FA.loc = b.dataset.v; setSeg('#faLoc', FA.loc);
  if(FA.expAuto && FA.food){ $('faExp').value = addDays(todayKey(), defaultDays(FA.food, FA.loc)); $('faExpHint').textContent = t('expAuto', { w: t(LOC_KEY[FA.loc]).toLowerCase() }); }
  if(FA.meal && FA.loc === 'freezer' && FA.expAuto !== false){ $('faExp').value = addDays(todayKey(), 90); }
}));

$('faNoExp').addEventListener('click', () => setNoExp(!FA.noExp));

$('faExp').addEventListener('input', () => { FA.expAuto = false; $('faExpHint').textContent = ''; });

$('faExpQuick').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if(!b) return; setNoExp(false); $('faExp').value = addDays(todayKey(), +b.dataset.d); FA.expAuto = false; $('faExpHint').textContent = ''; });

$('faSave').addEventListener('click', () => {
  const amt = num('faAmt'), n = Math.max(1, Math.round(num('faCount') || 1));
  if(!(amt > 0)){ toast(t('needAmount')); return; }
  const exp = FA.noExp ? null : ($('faExp').value || null);
  if(FA.food){ const f = foods.find(x => x.id === FA.food.id); if(f){ f.minStock = num('faMin') || null; f.noAutoGrocery = !$('faAuto').checked; saveFoods(); } }
  if(FA.mode === 'new'){
    addToFridge({ foodId: FA.food.id, qty: r1(amt * n), packSize: n === 1 ? amt : null, unit: FA.food.unit, loc: FA.loc, exp, expAuto: !!FA.expAuto });
    close('ovFAdd'); renderAll();
    toast(t('addedFridge', { l: t(LOC_KEY[FA.loc]).toLowerCase(), i: iconOf(FA.food) || '' }), t('scanNext'), () => startScan('fridge'));
  } else {
    const it = fridge.find(x => x.id === FA.item.id); if(it){ it.qty = r1(amt); it.loc = FA.loc; it.exp = exp; it.expAuto = !!FA.expAuto && !!exp; }
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
$('amU').addEventListener('change', () => { AM.u = $('amU').selectedIndex; if(!(num('amAmt') > 0)){ $('amN').value = 1; amFromN(); } else amRes(); });

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

$('gIn').addEventListener('input', () => {
  const q = $('gIn').value.trim(); if(!q){ $('gSugg').innerHTML = ''; return; }
  GS = searchLocal(q); GS.mine = GS.mine.slice(0, 4); GS.std = GS.std.slice(0, 3);
  $('gSugg').innerHTML = GS.mine.map((f, i) => itemHtml('m', i, iconOf(f) || '❔', foodName(f), f.brand && !f.noBrand ? esc(f.brand) : t('grpMine'))).join('') +
    GS.std.map((g, i) => itemHtml('s', i, subOf(g.cat, g.sub).icon, L(g), t('grpStd'))).join('') +
    `<button class="sitem" data-k="t"><span class="e">✏️</span><span class="t"><b>${t('addAsText', { q: esc(q) })}</b></span></button>`;
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
  if(g && e.target.closest('[data-tick]')){ g.done = !g.done; g.doneAt = new Date().toISOString(); Phone.vibrate(20); saveGroc(); renderAll(); return; }
  if(g && e.target.closest('[data-inc]')){ g.count++; saveGroc(); renderGroc(); return; }
  if(g && e.target.closest('[data-dec]')){ g.count = Math.max(1, g.count - 1); saveGroc(); renderGroc(); return; }
  if(g && e.target.closest('[data-del]')){ const i = groc.indexOf(g); groc.splice(i, 1); saveGroc(); renderAll();
    toast(t('deleted', { n: g.name }), t('undo'), () => { groc.splice(i, 0, g); saveGroc(); renderAll(); }); return; }
  if(e.target.closest('#gClear')){ groc = groc.filter(x => !x.done); saveGroc(); renderAll(); return; }
  if(e.target.closest('#gPutAway')){
    let n = 0, text = 0;
    groc.filter(x => x.done).forEach(x => { const f = x.foodId && foods.find(y => y.id === x.foodId);
      if(!f){ text++; return; }
      const size = x.size || f.usualPack || (f.piece ? f.piece * 6 : 100), loc = defaultLoc(f);
      fridge.push({ id: uid(), addedAt: new Date().toISOString(), foodId: f.id, qty: r1(size * x.count), packSize: x.count === 1 ? size : null, unit: f.unit, loc,
        exp: addDays(todayKey(), defaultDays(f, loc)), expAuto: true }); n++; });
    groc = groc.filter(x => !x.done); saveFridge(); saveGroc(); renderAll();
    toast(t('putAwayDone', { n }) + (text ? ' · ' + t('notFoodWarn', { n: text }) : ''), t('tFridge'), () => go('fridge'));
  }
});

$('gSend').addEventListener('click', () => { if(!isIOS) return shareList(); if(!ui.scDone) return openShortcutGuide(); runShortcut(); });

$('gShare').addEventListener('click', shareList);

$('scDone').addEventListener('change', () => { ui.scDone = $('scDone').checked; saveUI(); renderGroc(); });

$('scTry').addEventListener('click', () => { ui.scDone = true; saveUI(); close('ovShortcut'); renderGroc(); runShortcut(); });

$('useUp').addEventListener('click', async e => {
  const a = e.target.closest('[data-again]');
  if(a){ const m = meals.find(x => x.id === a.dataset.again); if(m){ close('ovCook'); setTimeout(() => openCook(m, 'again'), 60); } return; }
  const pick = e.target.closest('[data-idea]'); if(pick){ $('cName').value = pick.dataset.idea; $('cName').focus(); return; }
  const b = e.target.closest('#useUpAI'); if(!b || b.disabled) return;
  b.disabled = true; b.textContent = t('thinking');
  try{
    const soon = expiringList().map(x => x.info.name).join(', ');
    const r = await gemini(`Suggest 3 simple home-cooked dishes (gym-friendly, high protein) that use up these ingredients before they expire: ${soon}. Other foods available: ${liveItems().map(x => x.info.name).slice(0, 30).join(', ')}.
Write in ${lang === 'el' ? 'Greek' : 'English'}. Return ONLY JSON: {"ideas":[{"name":string,"why":string}]} where "why" is one short line.`, null, (i, n) => { b.textContent = t('cancelRec', { i, n }).replace(/^✕\s*\S+\s*·\s*/, ''); });
    $('useUpAIOut').innerHTML = (r.ideas || []).slice(0, 3).map(i => `<button data-idea="${esc(i.name)}">✨ ${esc(i.name)}<small>${esc(i.why || '')}</small></button>`).join('');
    b.remove();
  }catch(err){ b.disabled = false; b.textContent = t('useUpAI'); $('useUpAIOut').innerHTML = `<small>${esc(err.message)}</small>`; }
});

// ---------- today's food ----------
let curDay = todayKey();

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

$('copyYesterday').addEventListener('click', () => {
  const y = dayLog[addDays(curDay, -1)] || []; if(!y.length){ toast(t('nothingYesterday')); return; }
  dayLog[curDay] = (dayLog[curDay] || []).concat(y.map(e => ({ ...e, id: uid() }))); saveLog(); renderAll(); toast(t('copiedDay', { n: y.length }));
});


$('lSearch').addEventListener('input', drawLog);

$('lResults').addEventListener('click', e => {
  if(e.target.closest('#lOnline')){ runLogOnline($('lSearch').value.trim()); return; }
  const dy = e.target.closest('[data-dym]'); if(dy){ $('lSearch').value = dy.dataset.dym; $('lSearch').dispatchEvent(new Event('input')); return; }
  if(e.target.closest('#lTakeaway')){ const q = $('lSearch').value.trim(); close('ovLog'); openQuick(); $('qaName').value = q; return; }
  const row = e.target.closest('.lrow'); if(!row) return; const st = lwState(row.dataset.k, +row.dataset.i); if(!st) return;
  if(e.target.closest('[data-lplus]')) return lwAdd(st);                                  // ＋ = the usual amount, one tap
  if(e.target.closest('[data-ladd]')) return lwAdd(st);
  const dd = e.target.closest('[data-ldd]'); if(dd){ const m = row.querySelector('.ldm'); m.classList.toggle('hide'); dd.setAttribute('aria-expanded', !m.classList.contains('hide')); return; }
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
  const bw = num('tgBw'); if(!(bw > 30)){ toast(t('calcNeedW')); close('ovTargets'); go('gym-prog'); return; }   // Calculate uses your latest weigh-in (Gym → Progress)
  const ct = calcTargets(bw, TG.goal), g = ct.gym, r = ct.rest;   // 0.6.2: uses sex + height when known
  [['G', g], ['R', r]].forEach(([p, o]) => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).value = o[x])); tgCheck();
});

['G', 'R'].forEach(p => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).addEventListener('input', tgCheck)));

$('tgSave').addEventListener('click', () => {
  const rd = p => { const o = {}; ['k', 'p', 'c', 'f'].forEach(x => o[x] = num('tg' + p + x)); if(!o.k && o.p !== null && o.c !== null && o.f !== null) o.k = Math.round(o.p * 4 + o.c * 4 + o.f * 9); return o; };
  targets = { goal: TG.goal, bw: num('tgBw'), gym: rd('G'), rest: rd('R'), fib: num('tgFib') || null, lock: { G: MXL.G, R: MXL.R } };
  if(!targets.rest.k) targets.rest = { ...targets.gym };
  Store.save('targets', targets); close('ovTargets'); renderAll(); toast(t('targetsSaved'));
});

$('planShow').addEventListener('click', e => {
  if(e.target.closest('#planCancel')){ if(planCtl){ planCtl.abort(); renderPlan(); } return; }
  if(e.target.closest('#dropPlan')){ delete plans[curDay]; Store.save('plans', plans); renderPlan(); return; }
  const b = e.target.closest('[data-plog]'); if(!b) return;
  const m = plans[curDay].meals[+b.dataset.plog]; let n = 0, miss = 0;
  (m.items || []).forEach(it => {
    const g = Number(it.grams); if(!(g > 0)) return;
    const meal = meals.find(x => norm(x.name) === norm(it.name));
    let info = null;
    if(meal) info = { name: meal.name, icon: mealIcon(meal), unit: 'g', per: meal, meal };
    else { const ref = matchIng([it.name, it.name_en]); let f = null;
      if(ref && ref.type === 'my') f = foods.find(x => x.id === ref.id); else if(ref && ref.type === 'gen') f = saveGeneric(GENBY[ref.id]);
      if(f) info = { name: foodName(f), icon: iconOf(f) || '🍽️', unit: f.unit, per: f, food: f }; }
    if(!info){ miss++; return; }
    logEntry(curDay, info, g, m.time && toMin(m.time) !== null ? m.time : nowHM());
    if(it.from === 'fridge') takeFromFridge(info.meal ? { mealId: info.meal.id } : { foodId: info.food.id }, g);
    n++;
  });
  m.logged = true; Store.save('plans', plans); renderAll();
  toast(t('planLogged', { n }) + (miss ? ' · ' + t('planUnmatched', { n: miss }) : ''));
});

$('planBtn').addEventListener('click', async () => {
  if(planCtl){ planCtl.abort(); return; }
  const tg = targetFor(curDay); if(!tg){ toast(t('planNeedTargets')); openTargets(); return; }
  if(!settings.geminiKey){ toast(t('needKey')); openSettings(); return; }
  const btn = $('planBtn'), di = dayInfo(curDay), tot = dayTotals(curDay), isToday = daysUntil(curDay) === 0;
  planCtl = new AbortController(); const ctl = planCtl; btn.textContent = t('planning'); if($('ovLog').classList.contains('open')) close('ovLog'); planStat(t('planning'));
  const fr = liveItems().map(x => `${x.info.name}: ${fmtSize(x.it.qty, x.info.unit)}${x.it.exp ? `, expires in ${daysUntil(x.it.exp)} days` : ''}`).join('; ');
  const fl = foods.slice(0, 70).map(f => `${foodName(f)} (${f.kcal}kcal P${f.protein} C${f.carbs} F${f.fat} per 100${f.unit}${f.state === 'uncooked' ? ', weighed raw' : ''})`).join('; ');
  const ml = meals.map(m => `${m.name} (per 100 g cooked: ${m.kcal}kcal P${m.protein} C${m.carbs} F${m.fat})`).join('; ');
  const eaten = (dayLog[curDay] || []).map(e => `${e.time} ${e.name} ${e.amt}${e.unit}`).join('; ');
  try{
    const r = await gemini(`You plan a day of eating for someone who lifts weights. Write all text in ${lang === 'el' ? 'Greek' : 'English'}.
Day: ${di.type === 'gym' ? `GYM DAY, ${di.work || 'upper'} workout at ${di.time || '18:00'}` : 'REST DAY'}. Goal: ${targets.goal}.
Targets for the whole day: ${tg.k} kcal, protein ${tg.p} g, carbs ${tg.c} g, fat ${tg.f} g, fibre ${fibTarget(tg)} g.
Electrolytes so far: sodium ${Math.round(tot.na || 0)} mg (guideline ~2300), potassium ${Math.round(tot.k || 0)} mg (aim ~3400): include potassium-rich foods${di.type === 'gym' ? ', and a potassium-rich carb such as a banana 30-60 min before training' : ''}.
${workFor(curDay) ? `They are at WORK ${workFor(curDay).from}-${workFor(curDay).to}: meals in that window must be portable and simple; plan a solid meal before and after work.` : 'No work today: proper meals at home are fine.'}
Already eaten today: ${eaten || 'nothing'} (totals ${Math.round(tot.kcal)} kcal, P ${Math.round(tot.p)}, C ${Math.round(tot.c)}, F ${Math.round(tot.f)}).
${isToday ? `Time now: ${nowHM()}. Only plan meals from now on.` : 'Plan the whole day.'}
In the fridge/cupboard (use these FIRST, and anything expiring soonest before everything else): ${fr || 'nothing logged'}.
Their saved foods: ${fl || 'none'}.
Their home-cooked meals: ${ml || 'none'}.
Carb timing: ${di.type !== 'gym' ? 'spread carbs evenly; protein every 3-4 h.' : di.work === 'legs' || di.work === 'full' ? 'put most carbs in the meals 2-3 h before and within 2 h after the workout.' : di.work === 'cardio' ? 'light carb snack 1-2 h before, normal carbs after; remind to hydrate.' : 'moderate carbs before and after, rest spread out.'}
REMAINING for the rest of today (plan exactly this, NEVER more): ${Math.max(0, Math.round(tg.k - tot.kcal))} kcal, protein ${Math.max(0, Math.round(tg.p - tot.p))} g, carbs ${Math.max(0, Math.round(tg.c - tot.c))} g, fat ${Math.max(0, Math.round(tg.f - tot.f))} g.
Rules: land a little under the REMAINING numbers, never over. Use the exact food and meal names from the lists above. Grams are as weighed (raw for foods marked weighed raw, cooked weight for home-cooked meals). 1–3 meals or snacks: easy food combos or one simple plate each. Keep it realistic and simple.
Return ONLY JSON: {"meals":[{"time":"HH:MM","title":string,"items":[{"name":string,"name_en":string,"grams":number,"from":"fridge"|"foods"|"meal"}],"kcal":number,"protein":number,"carbs":number,"fat":number,"why":string}],"tip":string}`,
      null, (i, n) => { if(planCtl === ctl){ btn.textContent = t('cancelRec', { i, n }); planStat(t('cancelRec', { i, n })); } }, ctl.signal);
    if(!r || !Array.isArray(r.meals) || !r.meals.length) throw new Error('empty plan');
    planFit(r, { k: tg.k - tot.kcal, p: tg.p - tot.p, c: tg.c - tot.c, f: tg.f - tot.f });   // 0.6.5: never over what's left
    const expNames = new Set(expiringList().map(x => norm(x.info.name)));
    r.meals.forEach(m => (m.items || []).forEach(it => { it.expiring = expNames.has(norm(it.name)); }));
    plans[curDay] = r; Store.save('plans', plans); renderPlan();
    setTimeout(() => $('planShow').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }catch(err){ if(!err.cancelled) toast(t('planFail', { e: err.message })); renderPlan(); }
  finally{ planCtl = null; btn.textContent = t('lwFill'); }
});

$('homeAlerts').addEventListener('click', e => { const a = e.target.closest('[data-go]'); if(a) go(a.dataset.go); });

$('tToday').addEventListener('click', () => { curDay = todayKey(); go('today'); });

$('tFridge').addEventListener('click', () => go('fridge'));

$('tGroc').addEventListener('click', () => go('groc'));

document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', () => goBack()));

$('testKey').addEventListener('click', async () => {
  const key = $('sKey').value.trim(), el = $('keyStatus');
  if(!key){ status(el, t('keyEmpty'), true); return; }
  status(el, t('keyTesting'));
  try{
    const n = await AI.testKey(key);
    status(el, t('keyOk', { n })); el.style.color = 'var(--ok)';
  }catch(e){ el.style.color = ''; status(el, t('keyFail', { e: e.name === 'AbortError' ? t('timedOut') : e.message }), true); }
});

// Carb Timing: the windows follow the real workout start (on) or the Week Planner time (off)
$('realStart').addEventListener('change', () => { profile.realStart = $('realStart').checked; saveProfile();
  const tk = todayKey(), pl = planFor(tk), d = days[tk];
  if(d && d.type === 'gym'){ const real = active && active.date === tk ? fromMin(new Date(active.start).getHours() * 60 + new Date(active.start).getMinutes()) : null;
    const t_ = profile.realStart ? real : pl && pl.time; if(t_){ d.time = t_; saveDays(); } }
  renderAll(); });

// Fridge − / +: one pack less (the last one goes on Groceries) or one more
function stepPack(pm){
  const c = pm.closest('[data-fid]'), it = fridge.find(x => x.id === c.dataset.fid); if(!it) return;
  if(pm.hasAttribute('data-plus')){ const { id, addedAt, ...rest } = it; fridge.push({ ...rest, qty: it.packSize, id: uid(), addedAt: new Date().toISOString() }); saveFridge(); }
  else { const twin = [...fridge].reverse().find(x => x !== it && x.foodId === it.foodId && x.mealId === it.mealId && x.loc === it.loc && x.packSize === it.packSize && (x.exp || '') === (it.exp || '') && Math.abs(x.qty - x.packSize) <= 0.5) || it;
    fridge = fridge.filter(x => x !== twin); saveFridge(); if(it.foodId && checkRestock(it.foodId)) toast(t('toList').trim()); }
  renderAll();
}

// Log food sheet: Add Takeaway, yesterday's food
$('lQuickTop').addEventListener('click', () => { close('ovLog'); openQuick(); });
$('lTrack').addEventListener('click', () => { close('ovLog'); go('foods'); });
$('lYesterday').addEventListener('click', () => { close('ovLog'); $('copyYesterday').click(); });
// Add Takeaway: one box, Small / Normal / Big
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
// Daily Targets: padlocks
$('ovTargets').addEventListener('click', e => { const b = e.target.closest('[data-lock]'); if(!b) return; const P = b.dataset.p, k = b.dataset.lock;
  MXL[P] = MXL[P] === k ? null : k; MXLG[P] = +$('tg' + P + k).value || 0; drawLocks(); });
$('ovTargets').addEventListener('input', e => { const id = e.target.id || '', m = id.match(/^tg([GR])([pcf])$/); if(m && MXL[m[1]] === m[2]) MXLG[m[1]] = +e.target.value || 0; });
// Fridge: no Fridge/Freezer tabs; "Frozen" is a switch when adding, frozen things show ❄️
ui.floc = 'all';
$('faFrozen').addEventListener('change', () => { const b = $('faLoc').querySelector(`[data-v="${$('faFrozen').checked ? 'freezer' : 'fridge'}"]`); if(b) b.click(); });
