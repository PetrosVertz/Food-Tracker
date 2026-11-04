// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// 0.5.9: ⓘ bubbles, one-box Quick add, Plan my day in the Log food sheet, extras fold, Calculate from the latest weigh-in.

// ⓘ info bubbles (capture, so they never also toggle a fold or the % / mg switch)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tip]');
  if(b){ e.preventDefault(); e.stopPropagation(); if($('tipPop') && $('tipPop').dataset.k === b.dataset.tip){ hideTip(); return; } showTip(b.dataset.tip, b); $('tipPop').dataset.k = b.dataset.tip; return; }
  if($('tipPop')) hideTip();
}, true);
addEventListener('scroll', hideTip, true);
addEventListener('hashchange', hideTip);

// Log food sheet: Quick add + Plan my day
$('lQuickTop').addEventListener('click', () => { close('ovLog'); openQuick(); });
$('planShow').addEventListener('click', e => { if(e.target.closest('#planCancel') && planCtl){ planCtl.abort(); renderPlan(); } });

// Quick add: one box, Small / Normal / Big
document.querySelectorAll('#qaSize button').forEach(b => b.addEventListener('click', () => setSeg('#qaSize', b.dataset.v)));
$('qaName').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); saveQuick(); } });

// Extras: tap the electrolytes to switch % / mg
$('dExtrasBody').addEventListener('click', e => { if(e.target.closest('[data-elec]')){ ui.elecMg = !ui.elecMg; saveUI(); renderToday(); } });

// Daily Targets: Calculate uses your latest weigh-in (Gym → Progress)
$('tgCalc').addEventListener('click', e => { if(num('tgBw') > 30) return; e.stopImmediatePropagation(); toast(t('calcNeedW')); close('ovTargets'); go('gym-prog'); }, true);

// ---------- 0.6.0: Progress folds, weight chart Day / Week / Month ----------
$('gProgV').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if(!b) return; PG.open[b.dataset.pg] = !PG.open[b.dataset.pg]; renderProgress(); });
$('gWeigh').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if(!b) return; ui.wtMode = b.dataset.wt; saveUI(); drawWeigh(); });

// ---------- 0.6.1: long press to reorder exercises (template editor + live workout) ----------
makeSortable($('tpList'), '.tpcard', (a, b) => { TP.exercises.splice(b, 0, TP.exercises.splice(a, 1)[0]); drawTpl(); });
makeSortable($('sesBody'), '.exc', (a, b) => { const ex = active.exercises, moved = ex[a]; ex.splice(b, 0, ex.splice(a, 1)[0]);
  if(REST && typeof REST.xi === 'number'){ const cur = REST.xi === a ? b : REST.xi > a && REST.xi <= b ? REST.xi - 1 : REST.xi < a && REST.xi >= b ? REST.xi + 1 : REST.xi; REST.xi = cur; }
  saveG('act'); renderSession(); });

// ---------- 0.6.1: Food Track ----------
$('list').addEventListener('click', e => { const b = e.target.closest('[data-fcat]'); if(!b) return; FCAT[b.dataset.fcat] = !FCAT[b.dataset.fcat]; render(); });
// Add food goes straight to the scanner; the other ways hide behind "Can't scan?"
$('fab').addEventListener('click', e => { if($('fab').dataset.action === 'store'){ e.stopImmediatePropagation(); pendingBarcode = null; startScan(); } }, true);
$('cantScanBtn').addEventListener('click', () => { const c = $('cantScan'), op = c.classList.toggle('hide'); $('cantScanBtn').classList.toggle('open', !op); if(!op) setTimeout(() => c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60); });
{ const ss = startScan; startScan = function(...a){ $('cantScan').classList.add('hide'); $('cantScanBtn').classList.remove('open'); return ss.apply(this, a); }; }
// Log food: add yesterday's food
{ const ol = openLogSearch; openLogSearch = function(){ $('lYesterday').classList.toggle('hide', !(dayLog[addDays(curDay, -1)] || []).length); return ol(); }; }
$('lYesterday').addEventListener('click', () => { close('ovLog'); $('copyYesterday').click(); });

// ---------- 0.6.1: AI — spinning loader instead of "model 1 of 10", daily use counter ----------
function aiCount(){ const d = todayKey(); if(!ui.ai || ui.ai.d !== d) ui.ai = { d, n: 0 }; ui.ai.n++; saveUI();
  const n = ui.ai.n; if(n === 100 || (n > 100 && n % 25 === 0)) setTimeout(() => toast(t('aiMany', { n })), 400); }
function aiWait(on, cancel){
  let w = $('aiWait');
  if(!on){ if(w){ w.classList.add('out'); setTimeout(() => w.remove(), 180); } return; }
  if(w) w.remove(); w = document.createElement('div'); w.id = 'aiWait'; w.className = 'aiwait';
  w.innerHTML = `<div class="aibox"><div class="aispin"></div><b>✨ ${t('aiThinking')}</b><p>${t('aiSlow')}</p><button class="btn" type="button">${t('cancel')}</button></div>`;
  w.querySelector('button').onclick = () => { cancel(); aiWait(false); }; document.body.appendChild(w);
}
{ const g0 = gemini; gemini = async function(prompt, img, onTry, outer, opts){
    aiCount();
    if(opts && opts.quiet) return g0(prompt, img, onTry, outer);   // background jobs (recovery check) don't block the screen
    const ctl = new AbortController(); if(outer){ if(outer.aborted) ctl.abort(); else outer.addEventListener('abort', () => ctl.abort()); }
    aiWait(true, () => ctl.abort());
    try{ return await g0(prompt, img, onTry, ctl.signal); } finally{ aiWait(false); } }; }

// ---------- 0.6.1: Cook a meal = two choices, each in its own window ----------
['cookSuggestBtn', 'cookOwnBtn'].forEach(id => $('cookPickOpts').appendChild($(id)));
$('ovCookPick').addEventListener('click', e => { if(e.target === $('ovCookPick')) close('ovCookPick'); });
$('fab').addEventListener('click', e => { if($('fab').dataset.action === 'meals'){ e.stopImmediatePropagation(); open('ovCookPick'); } }, true);
$('cookSuggestBtn').addEventListener('click', e => { e.stopImmediatePropagation(); close('ovCookPick'); $('cName').value = ''; SG.time = null; openSuggest(); setSeg('#sgTime', ''); $('sgLeft').textContent = t('sgAdult'); setTimeout(() => $('sgIn').focus(), 150); }, true);
$('cookOwnBtn').addEventListener('click', e => { e.stopImmediatePropagation(); close('ovCookPick'); openCook(null, 'new'); setTimeout(() => $('cName').focus(), 150); }, true);
{ const oc = openCook; openCook = function(...a){ const r = oc.apply(this, a); cookStep(true); return r; }; }
$('rYes').addEventListener('click', () => { if(!$('ovCook').classList.contains('open') && pendingRecipe){ const r = pendingRecipe; openCook(null, 'new'); if(r.title) $('cName').value = r.title; } }, true);
$('sgIn').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); e.stopImmediatePropagation(); $('sgGo').click(); } }, true);
document.querySelectorAll('#sgTime button').forEach(b => b.addEventListener('click', () => { SG.time = SG.time === b.dataset.v ? null : b.dataset.v; setSeg('#sgTime', SG.time || ''); }));
// My Own Recipe: the cooked weight is worked out from the ingredients; weighing it yourself is optional and folded away
(() => { const h = document.querySelector('#cookMain [data-t="finishedWeight"]'), stopAt = $('cResult'); if(!h) return;
  const box = document.createElement('div'); box.id = 'cWeighBox'; box.className = 'hide'; h.before(box);
  let el = h; while(el && el !== stopAt){ const nx = el.nextElementSibling; box.appendChild(el); el = nx; }
  const lk = document.createElement('button'); lk.type = 'button'; lk.className = 'linkbtn'; lk.id = 'cWeighLink'; lk.textContent = t('cWeighLink'); box.before(lk);
  lk.addEventListener('click', () => { box.classList.toggle('hide'); }); })();
// free-write quick add: the AI turns it into ingredients and amounts (without a key, the built-in reader tries)
$('cQuickGo').addEventListener('click', async () => {
  const txt = $('cQuickTxt').value.trim(); if(!txt){ $('cQuickTxt').focus(); return; }
  let r = null;
  if(settings.geminiKey){
    try{ r = await gemini(`Turn this home recipe into structured data. Write names in ${lang === 'el' ? 'Greek' : 'English'}. Text: """${txt}"""
Return ONLY JSON: {"title":string,"servings":number,"ingredients":[{"name":string,"name_en":string,"grams":number}],"steps":[string]}
Rules: grams for the whole batch as weighed raw; convert spoons/cups/pieces to grams; include oil; name_en = plain generic English food name.`); }
    catch(err){ if(err.cancelled) return; toast(t('cqFail')); }
  }
  if(!r){ r = parseRecipe(txt); if(!r.ingredients.length){ toast(t(settings.geminiKey ? 'cqFail' : 'cqNoKey')); return; } }
  if(r.title && !$('cName').value.trim()) $('cName').value = r.title;
  applyRecipe(r, true); $('cQuickTxt').value = ''; toast(t('cqDone', { n: (r.ingredients || []).length }));
});

// ---------- 0.6.2 ----------
// Gym: the floating button starts (or resumes) a workout, like Log Food / Add Food
$('fab').addEventListener('click', e => { if($('fab').dataset.action === 'gym'){ e.stopImmediatePropagation(); $('gStart').click(); } }, true);
{ const ra = renderAll; renderAll = function(...a){ const r = ra.apply(this, a); const fab = $('fab');
    if(fab.dataset.action === 'gym') fab.textContent = active ? t('resume', { m: Math.floor(sesMs() / 60000) }) : '▶ ' + t('startWk'); return r; }; }
// Daily Targets from the calorie card
$('tgCardBtn').addEventListener('click', openTargets);
// Eaten: a drop-down with a count; swipe a food right-to-left (past 1/3) to delete it
{ const rt = renderToday; renderToday = function(...a){ const r = rt.apply(this, a); const n = (dayLog[curDay] || []).length; $('dEatenN').textContent = n ? ` · ${n}` : ''; return r; }; }
function delEntry(id){ const l = dayLog[curDay] || [], i = l.findIndex(x => x.id === id); if(i < 0) return; const [gone] = l.splice(i, 1); saveLog(); renderAll();
  toast(t('entryDel', { n: gone.name }), t('undo'), () => { (dayLog[curDay] = dayLog[curDay] || []).splice(i, 0, gone); saveLog(); renderAll(); }); }
makeSwipeDelete($('dLog'), '.card[data-eid]', c => delEntry(c.dataset.eid));
// Setup: male / female
document.addEventListener('click', e => { const b = e.target.closest('#suSex [data-v]'); if(!b) return; readSetup(); SUP.sex = b.dataset.v; setSeg('#suSex', SUP.sex); });
// Add shopping: Camera opens straight away
$('shopOpts').addEventListener('click', e => { const b = e.target.closest('[data-shop="camera"]'); if(!b) return; e.stopImmediatePropagation();
  if(!settings.geminiKey){ toast(t('needKeyFirst')); return; } SHOP.kind = 'camera'; $('shopFile').value = ''; $('shopFile').click(); }, true);
// Cook: no empty "Choose food" row; Add Ingredient opens the food search
{ const oc = openCook; openCook = function(...a){ const r = oc.apply(this, a); if(D && D.rows.length === 1 && !D.rows[0].ref && !D.rows[0].grams){ D.rows = []; drawRows(); } return r; }; }
// Backup reminder when the app opens (iPhone can't show anything when a web app closes)
setTimeout(async () => {
  if(!ui.setupDone || document.querySelector('.overlay.open')) return;
  const hasData = foods.length || Object.keys(dayLog).length || sessions.length; if(!hasData) return;
  const last = ui.lastBackup ? new Date(ui.lastBackup).getTime() : 0, days3 = Date.now() - last >= 3 * 864e5;
  if(!days3 || ui.bkAsked === todayKey()) return; ui.bkAsked = todayKey(); saveUI();
  if(await ask(t(last ? 'bkAskOld' : 'bkAskNever', { d: last ? Math.floor((Date.now() - last) / 864e5) : 0 }), t('bkYes'), t('later'))) backupNow();
}, 1500);

// ---------- 0.6.3 ----------
// swipe right-to-left past 1/3 to delete: finger on a phone, mouse drag on a computer
function makeSwipeDelete(box, itemSel, onDelete){
  let S = null, eatClick = false;
  const start = (c, x, y) => { S = { c, x, y, dx: 0, claim: null }; };
  const move = (x, y, ev) => { if(!S) return false; const dx = x - S.x, dy = y - S.y;
    if(S.claim === null){ if(dx < -10 && Math.abs(dx) > Math.abs(dy) * 1.3) S.claim = true; else if(Math.abs(dy) > 10 || dx > 10) S.claim = false; }
    if(!S.claim) return false; ev.stopPropagation(); if(ev.cancelable) ev.preventDefault();
    S.dx = Math.min(0, dx); const pr = Math.min(1, -S.dx / (S.c.offsetWidth / 3));
    S.c.classList.add('swiping'); S.c.style.transform = `translateX(${S.dx}px)`; S.c.style.setProperty('--sw', pr.toFixed(2));
    if(pr >= 1 && !S.c.classList.contains('swready')) haptic(); S.c.classList.toggle('swready', pr >= 1); return true; };
  const end = ev => { if(!S) return; const s = S; S = null; if(!s.claim) return; ev.stopPropagation(); eatClick = true; setTimeout(() => eatClick = false, 50);
    if(-s.dx >= s.c.offsetWidth / 3){ s.c.style.transition = 'transform .2s ease-in,opacity .2s'; s.c.style.transform = 'translateX(-110%)'; s.c.style.opacity = '0'; setTimeout(() => onDelete(s.c), 190); }
    else { s.c.style.transition = 'transform .28s cubic-bezier(.2,.9,.3,1.2)'; s.c.style.transform = ''; s.c.style.setProperty('--sw', 0); setTimeout(() => { s.c.style.transition = ''; s.c.classList.remove('swiping', 'swready'); }, 300); } };
  const ok = t => !t.closest('input,textarea,select,button,.stepper');
  box.addEventListener('touchstart', e => { const c = e.target.closest(itemSel); if(!c || e.touches.length > 1 || !ok(e.target)){ S = null; return; } start(c, e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  box.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
  box.addEventListener('touchend', end); box.addEventListener('touchcancel', end);
  box.addEventListener('pointerdown', e => { if(e.pointerType !== 'mouse' || e.button) return; const c = e.target.closest(itemSel); if(!c || !ok(e.target)) return; start(c, e.clientX, e.clientY); });
  addEventListener('pointermove', e => { if(e.pointerType === 'mouse' && S) move(e.clientX, e.clientY, e); });
  addEventListener('pointerup', e => { if(e.pointerType === 'mouse') end(e); });
  box.addEventListener('click', e => { if(eatClick){ e.stopPropagation(); e.preventDefault(); eatClick = false; } }, true);
  box.classList.add('swipebox');
}
// exercises: live workout + template editor
makeSwipeDelete($('sesBody'), '.exc', c => { const i = +c.dataset.x, gone = active.exercises.splice(i, 1)[0]; if(!gone) return;
  const rest = REST; if(REST && REST.xi === i){ REST = null; $('restBar').classList.add('hide'); } else if(REST && REST.xi > i) REST.xi--;
  saveG('act'); renderSession(); toast(t('exRemoved', { n: exName(gone.exId) }), t('undo'), () => { active.exercises.splice(i, 0, gone); if(rest && rest.xi >= i && REST) REST.xi++; saveG('act'); renderSession(); }); });
makeSwipeDelete($('tpList'), '.tpcard', c => { const i = +c.dataset.i, gone = TP.exercises.splice(i, 1)[0]; if(!gone) return; drawTpl();
  toast(t('exRemoved', { n: exName(gone.exId) }), t('undo'), () => { TP.exercises.splice(i, 0, gone); drawTpl(); }); });

// Create a Workout: straight to a name and exercises; the type is worked out from the exercises
function inferType(list){
  if(!list.length) return 'full'; if(list.every(e => isCardio(e.exId))) return 'cardio';
  let up = 0, low = 0; list.forEach(e => { const mu = (exById(e.exId) || {}).mu || {}; Object.entries(mu).forEach(([h, v]) => { const g = (HEADS[h] || [])[2], r = (GROUPS[g] || [])[2]; if(r === 'up') up += v; else if(r === 'low') low += v; }); });
  const tot = up + low || 1; return low / tot >= .6 ? 'legs' : up / tot >= .75 ? 'upper' : 'full';
}
{ const ot = openTpl; openTpl = function(x, type){ if(!x && !type){ openTpl_053(null, 'full'); TP.name = ''; $('tpName').value = ''; $('tpType').classList.add('hide'); setTimeout(() => $('tpName').focus(), 150); return; } return ot(x, type); }; }
$('tpSave').addEventListener('click', () => { TP.type = inferType(TP.exercises); if(!$('tpName').value.trim()) $('tpName').value = typeLabel_(TP.type); }, true);

// Advanced: a switch; off every time the app opens
$('advSw').checked = false;
$('advSw').addEventListener('change', () => { const b = $('advBody'); b.classList.toggle('hide', !$('advSw').checked); if($('advSw').checked) b.animate && b.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1)' }); });

// macro lock: lock one macro's grams; moving another only shifts the third
const MXL = { G: null, R: null }, MXLG = { G: 0, R: 0 };
function mxKeepLock(P){ const L = MXL[P], k = +$('tg' + P + 'k').value || 0; if(!L || !k || !MXLG[P]) return; const m = MX[P];
  const pct = Math.max(5, Math.min(90, MXLG[P] * MXK[L] / k * 100)), others = ['p', 'c', 'f'].filter(x => x !== L), sum = m[others[0]] + m[others[1]] || 1, rem = 100 - pct;
  m[L] = pct; m[others[0]] = Math.max(5, rem * m[others[0]] / sum); m[others[1]] = 100 - pct - m[others[0]]; }
{ const mv = moveMx; moveMx = function(P, key, v){ const L = MXL[P]; if(!L) return mv(P, key, v); if(L === key){ drawMx(P, false); return; }
    const m = MX[P], third = ['p', 'c', 'f'].find(x => x !== key && x !== L); v = Math.max(5, Math.min(100 - m[L] - 5, v)); m[key] = v; m[third] = 100 - m[L] - v; drawMx(P, true); }; }
function drawLocks(){ ['G', 'R'].forEach(P => { const box = $('mx' + P); if(!box) return; box.querySelectorAll('[data-lock]').forEach(b => { const on = MXL[P] === b.dataset.lock; b.textContent = on ? '🔒' : '🔓'; b.classList.toggle('on', on); });
  box.querySelectorAll('.mxr').forEach(r => { r.disabled = MXL[P] === r.dataset.k; }); }); }
$('ovTargets').addEventListener('click', e => { const b = e.target.closest('[data-lock]'); if(!b) return; const P = b.dataset.p, k = b.dataset.lock;
  MXL[P] = MXL[P] === k ? null : k; MXLG[P] = +$('tg' + P + k).value || 0; drawLocks(); });
{ const ot = openTargets; openTargets = function(...a){ const r = ot.apply(this, a); const lk = (targets && targets.lock) || {};
    ['G', 'R'].forEach(P => { MXL[P] = lk[P] || null; MXLG[P] = MXL[P] ? +$('tg' + P + MXL[P]).value || 0 : 0; }); drawLocks(); return r; }; }
$('tgSave').addEventListener('click', () => setTimeout(() => { if(targets){ targets.lock = { G: MXL.G, R: MXL.R }; store(TGKEY, targets); } }, 0));
$('ovTargets').addEventListener('input', e => { const id = e.target.id || '', m = id.match(/^tg([GR])([pcf])$/); if(m && MXL[m[1]] === m[2]) MXLG[m[1]] = +e.target.value || 0; });

// Settings → Your Body: sex, height, weight; offers to recalculate targets
{ const os = openSettings; openSettings = function(...a){ const r = os.apply(this, a); setSeg('#sSex', ui.sex || ''); $('sH').value = ui.height || ''; $('sW').value = latestWeight() || (targets && targets.bw) || ''; return r; }; }
document.querySelectorAll('#sSex button').forEach(b => b.addEventListener('click', () => setSeg('#sSex', b.dataset.v)));
$('sBodySave').addEventListener('click', async () => {
  const sx = (document.querySelector('#sSex .on') || {}).dataset?.v || null, hh = num('sH'), w = num('sW');
  if(sx) ui.sex = sx; if(hh > 120 && hh < 230) ui.height = hh; saveUI();
  if(w > 30 && w < 300){ weights[todayKey()] = w; store(WKEY, weights); if(targets){ targets.bw = w; store(TGKEY, targets); } }
  renderAll(); toast(t('bodySaved'));
  const bw = w > 30 ? w : latestWeight() || (targets && targets.bw);
  if(bw && await ask(t('recalcQ'), t('recalcYes'), t('recalcNo'))){ const tg = calcTargets(bw, (targets && targets.goal) || 'bulk'); targets = { ...(targets || {}), ...tg }; store(TGKEY, targets); renderAll(); toast(t('targetsSaved')); }
});

// ---------- 0.6.3.1 ----------
// calorie card: 🎯 sits on the same line as the Advanced switch, under the dotted line
(() => { const row = document.querySelector('#dExtras .advrow'), line = document.createElement('div'); line.className = 'advline'; row.before(line); line.appendChild(row); line.appendChild($('tgCardBtn')); })();
// Library: the floating button creates a workout
$('fab').addEventListener('click', e => { if($('fab').dataset.action === 'gymlib'){ e.stopImmediatePropagation(); openTpl(null); } }, true);
// padlock: lock any time; the locked slider can still be dragged (the other two share the change), but moving the others never moves it
{ const mv = moveMx; moveMx = function(P, key, v){ const L = MXL[P];
    if(L && L === key){ MXL[P] = null; mv(P, key, v); MXL[P] = L; const k = +$('tg' + P + 'k').value || 0; MXLG[P] = k ? Math.round(k * MX[P][L] / 100 / MXK[L]) : 0; return; }
    return mv(P, key, v); }; }
{ const dl = drawLocks; drawLocks = function(){ dl(); document.querySelectorAll('#ovTargets .mxr').forEach(r => { r.disabled = false; }); }; }

// Supplements: name + dose only; a Take button logs the time (change it if you took it earlier); take it again later the same day
const takesOf = (d, id) => ((suppLog[d] || {}).takes || {})[id] || [];
function setTakes(d, id, arr){ const day = suppLog[d] = suppLog[d] || {}; day.takes = day.takes || {}; if(arr.length) day.takes[id] = arr; else delete day.takes[id]; store(LOGKEY, suppLog); }
todayProgress = function(){ const d = todayKey(); return { total: supps.length, done: supps.filter(s => takesOf(d, s.id).length).length }; };
renderSupps = function(){
  const tp = todayProgress(), d = todayKey();
  $('sToday').textContent = `${t('todayLabel')} · ${new Date().toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`;
  $('sTodayN').textContent = tp.total ? t('todayTaken', { a: tp.done, b: tp.total }) : '';
  $('sProg').style.width = tp.total ? `${Math.round(tp.done / tp.total * 100)}%` : '0';
  if(!supps.length){ $('sList').innerHTML = `<div class="empty">${t('noSupps')}</div>`; return; }
  $('sList').innerHTML = supps.map(s => { const tk = takesOf(d, s.id);
    return `<div class="card supcard" data-sid="${s.id}"><div class="body">
      <div class="row"><div class="name">${esc(suppName(s))}</div><span class="rmeta">${fmt(s.dose)} ${esc(unitLabel(s.unit))}</span></div>
      <div class="takes">${tk.map((tm, i) => `<span class="take"><span>✓</span><input type="time" value="${tm}" data-tkt="${i}" aria-label="Time taken"><button data-tkx="${i}" aria-label="Remove">✕</button></span>`).join('')}
        <button class="btn small takebtn" data-take>${tk.length ? t('takeAgain') : t('takeIt')}</button></div></div></div>`; }).join('');
};
$('sList').addEventListener('click', e => { const c = e.target.closest('[data-sid]'); if(!c) return; const id = c.dataset.sid, d = todayKey();
  if(e.target.closest('[data-take]')){ e.stopImmediatePropagation(); setTakes(d, id, [...takesOf(d, id), nowHM()].sort()); haptic(); renderAll(); return; }
  const x = e.target.closest('[data-tkx]'); if(x){ e.stopImmediatePropagation(); const a = takesOf(d, id).slice(); a.splice(+x.dataset.tkx, 1); setTakes(d, id, a); renderAll(); return; }
  if(e.target.closest('.take,input')) e.stopImmediatePropagation(); }, true);
$('sList').addEventListener('change', e => { const i = e.target.closest('[data-tkt]'); if(!i) return; const id = i.closest('[data-sid]').dataset.sid, d = todayKey(), a = takesOf(d, id).slice();
  a[+i.dataset.tkt] = i.value || a[+i.dataset.tkt]; setTakes(d, id, a.sort()); renderAll(); });
// the form: name, dose and unit only (C = capsules, T = tablets, S = scoops, D = drops)
{ const os = openSupp; openSupp = function(s){ const r = os(s); $('supUnit').querySelectorAll('option').forEach(o => { const long = t('ul_' + o.value); if(long && long !== 'ul_' + o.value) o.textContent = `${unitLabel(o.value)} · ${long}`; });
    if(!s) SU.times = ['any']; return r; }; }
$('supSave').addEventListener('click', () => { if(!SU.times.length) SU.times = ['any']; SU.often = 'daily'; }, true);

// ---------- Settings as a page under Fridge (tap ⚙︎ to slide down; pull up to go back to Fridge; never pulled into) ----------
TAB_ROOT.settings = 'settings'; RAIL_IC.settings = '⚙︎'; TAB_LBL.settings = 'settings';
(() => { const sh = $('ovSettings').querySelector('.sheet'), pg = document.createElement('section'); pg.className = 'page wrap hide'; pg.id = 'pgSettings';
  pg.innerHTML = `<header><div class="left"><h1 data-t="settings"></h1></div></header>`;
  [...sh.children].forEach(el => { if(el.classList.contains('sheethead') || el.classList.contains('sback')) return; pg.appendChild(el); });
  $('pgFridge').after(pg); applyLang(); })();
function fillSettings(){ $('sKey').value = settings.geminiKey || ''; $('sModel').value = settings.model || ''; setSeg('#sLang', lang); status($('keyStatus'), ''); $('keyStatus').style.color = '';
  $('keySteps').innerHTML = KEY_STEPS[lang === 'el' ? 'el' : 'en'].map(x => `<li>${x}</li>`).join('');
  setSeg('#sSex', ui.sex || ''); $('sH').value = ui.height || ''; $('sW').value = latestWeight() || (targets && targets.bw) || ''; }
openSettings = function(){ document.querySelectorAll('.overlay.open').forEach(o => close(o.id)); fillSettings(); if(location.hash.slice(1) !== 'settings') switchTab(1, 'settings'); };
addEventListener('hashchange', () => { if(location.hash === '#settings') fillSettings(); });
