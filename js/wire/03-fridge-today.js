// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

let fridge = load(FRKEY, []), groc = load(GRKEY, []), dayLog = load(LGKEY, {}), days = load(DYKEY, {}), targets = load(TGKEY, null), plans = load(PLKEY, {});

const saveFridge = () => store(FRKEY, fridge), saveGroc = () => store(GRKEY, groc), saveLog = () => store(LGKEY, dayLog), saveDays = () => store(DYKEY, days);

const dayStr = d => d.toLocaleDateString('en-CA');

const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dayStr(d); };

const daysUntil = s => Math.round((new Date(s + 'T12:00:00') - new Date(todayKey() + 'T12:00:00')) / 864e5);

const toMin = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };

const fromMin = m => { m = Math.max(0, Math.min(1439, Math.round(m))); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

const nowHM = () => fromMin(new Date().getHours() * 60 + new Date().getMinutes());

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const stockOf = foodId => r1(fridge.filter(it => it.foodId === foodId).reduce((s, it) => s + it.qty, 0));

const mealStock = mealId => r1(fridge.filter(it => it.mealId === mealId).reduce((s, it) => s + it.qty, 0));

$('fSearch').addEventListener('input', renderFridge);

$('fLoc').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; ui.floc = b.dataset.v; saveUI(); renderFridge(); });

$('fAlerts').addEventListener('click', e => { if(e.target.closest('[data-cookup]')){ go('meals'); setTimeout(() => openCook(null, 'new'), 80); } });

$('fList').addEventListener('click', e => {
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

$('amAmt').addEventListener('input', amRes);

$('amQuick').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(b){ $('amAmt').value = b.dataset.v; amRes(); } });

$('amLog').addEventListener('change', () => $('amTimeRow').classList.toggle('hide', !$('amLog').checked));

$('amSave').addEventListener('click', () => {
  const a = num('amAmt'); if(!(a > 0)){ toast(t('needAmount')); $('amAmt').focus(); return; }
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
  if(g && e.target.closest('[data-tick]')){ g.done = !g.done; g.doneAt = new Date().toISOString(); navigator.vibrate?.(20); saveGroc(); renderAll(); return; }
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

document.querySelectorAll('#dType button').forEach(b => b.addEventListener('click', () => setDay({ type: b.dataset.v, work: dayInfo(curDay).work || (b.dataset.v === 'gym' ? 'upper' : undefined), time: dayInfo(curDay).time || (b.dataset.v === 'gym' ? '18:00' : undefined) })));

document.querySelectorAll('#dWork button').forEach(b => b.addEventListener('click', () => setDay({ type: 'gym', work: b.dataset.v })));

$('dTime').addEventListener('change', () => setDay({ type: 'gym', time: $('dTime').value }));

$('dTotals').addEventListener('click', e => { if(e.target.closest('[data-targets]')) openTargets(); });

$('targetsBtn').addEventListener('click', openTargets);

$('dLog').addEventListener('click', e => { const c = e.target.closest('[data-eid]'); if(!c) return; const en = (dayLog[curDay] || []).find(x => x.id === c.dataset.eid); if(en) openAmt({ mode: 'editlog', entry: en, date: curDay }); });

$('copyYesterday').addEventListener('click', () => {
  const y = dayLog[addDays(curDay, -1)] || []; if(!y.length){ toast(t('nothingYesterday')); return; }
  dayLog[curDay] = (dayLog[curDay] || []).concat(y.map(e => ({ ...e, id: uid() }))); saveLog(); renderAll(); toast(t('copiedDay', { n: y.length }));
});

const mealOrFoodStock = it => it.foodId ? stockOf(it.foodId) : mealStock(it.mealId);

$('lSearch').addEventListener('input', drawLog);

$('lResults').addEventListener('click', e => {
  const b = e.target.closest('.sitem'); if(!b) return; const k = b.dataset.k, i = +b.dataset.i; let info = null, amt = null;
  const fInfo = f => ({ name: foodName(f), icon: iconOf(f) || '🍽️', unit: f.unit, per: f, food: f, piece: f.pieces !== 'none' ? (f.piece || f.serving || null) : null, pw: f.pieces });
  const mInfo = m => ({ name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null });
  if(k === 'ml') info = mInfo(LS.meals[i]);
  else if(k === 'm') info = fInfo(LS.mine[i]);
  else if(k === 's') info = fInfo(saveGeneric(LS.std[i]));
  else if(k === 'fr') info = LS.fr[i].info.meal ? mInfo(LS.fr[i].info.meal) : fInfo(LS.fr[i].info.food);
  else if(k === 'rc'){ info = infoOfEntry(LS.recent[i]); amt = LS.recent[i].amt; }
  if(!info) return;
  close('ovLog'); openAmt({ mode: 'log', info }); if(amt){ $('amAmt').value = amt; amRes(); }
});

$('lScan').addEventListener('click', () => { close('ovLog'); startScan('log'); });

document.querySelectorAll('#tgGoal button').forEach(b => b.addEventListener('click', () => { TG.goal = b.dataset.v; setSeg('#tgGoal', TG.goal); }));

$('tgCalc').addEventListener('click', () => {
  const bw = num('tgBw'); if(!(bw > 30)){ $('tgBw').focus(); return; }
  const ct = calcTargets(bw, TG.goal), g = ct.gym, r = ct.rest;   // 0.6.2: uses sex + height when known
  [['G', g], ['R', r]].forEach(([p, o]) => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).value = o[x])); tgCheck();
});

['G', 'R'].forEach(p => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).addEventListener('input', tgCheck)));

$('tgSave').addEventListener('click', () => {
  const rd = p => { const o = {}; ['k', 'p', 'c', 'f'].forEach(x => o[x] = num('tg' + p + x)); if(!o.k && o.p !== null && o.c !== null && o.f !== null) o.k = Math.round(o.p * 4 + o.c * 4 + o.f * 9); return o; };
  targets = { goal: TG.goal, bw: num('tgBw'), gym: rd('G'), rest: rd('R'), fib: num('tgFib') || null };
  if(!targets.rest.k) targets.rest = { ...targets.gym };
  store(TGKEY, targets); close('ovTargets'); renderAll(); toast(t('targetsSaved'));
});

$('planShow').addEventListener('click', e => {
  if(e.target.closest('#dropPlan')){ delete plans[curDay]; store(PLKEY, plans); renderPlan(); return; }
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
  m.logged = true; store(PLKEY, plans); renderAll();
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
Rules: reach the REMAINING targets within ~5%. Use the exact food and meal names from the lists above. Grams are as weighed (raw for foods marked weighed raw, cooked weight for home-cooked meals). 3–5 meals/snacks. Keep it realistic and simple.
Return ONLY JSON: {"meals":[{"time":"HH:MM","title":string,"items":[{"name":string,"name_en":string,"grams":number,"from":"fridge"|"foods"|"meal"}],"kcal":number,"protein":number,"carbs":number,"fat":number,"why":string}],"tip":string}`,
      null, (i, n) => { if(planCtl === ctl){ btn.textContent = t('cancelRec', { i, n }); planStat(t('cancelRec', { i, n })); } }, ctl.signal);
    if(!r || !Array.isArray(r.meals) || !r.meals.length) throw new Error('empty plan');
    const expNames = new Set(expiringList().map(x => norm(x.info.name)));
    r.meals.forEach(m => (m.items || []).forEach(it => { it.expiring = expNames.has(norm(it.name)); }));
    plans[curDay] = r; store(PLKEY, plans); renderPlan();
    setTimeout(() => $('planShow').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }catch(err){ if(!err.cancelled) toast(t('planFail', { e: err.message })); renderPlan(); }
  finally{ planCtl = null; btn.textContent = t('planMyDay'); }
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
    const r = await fetchT(`${GAPI}?pageSize=200`, { headers: { 'x-goog-api-key': key } }, 12000);
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `HTTP ${r.status}`);
    const n = (j.models || []).filter(m => /^models\/gemini/.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent')).length;
    status(el, t('keyOk', { n })); el.style.color = 'var(--ok)';
    if(key !== settings.geminiKey){ settings.geminiKey = key; store(SKEY, settings); store(MLKEY, null); }
  }catch(e){ el.style.color = ''; status(el, t('keyFail', { e: e.name === 'AbortError' ? t('timedOut') : e.message }), true); }
});
