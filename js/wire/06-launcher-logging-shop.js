// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ---------- logging: your usuals first, last amounts remembered, one-tap re-log, barcode in the bar ----------
const fInfo_ = f => ({ name: foodName(f), icon: iconOf(f) || '', unit: f.unit, per: f, food: f, piece: f.pieces !== 'none' ? (f.piece || f.serving || null) : null, pw: f.pieces });

$('lSearch').addEventListener('input', () => { clearTimeout(LOGON.timer); const q = $('lSearch').value.trim(); if(LOGON.q !== q){ LOGON.res = []; LOGON.busy = false; }
  if(q.length >= 3) LOGON.timer = setTimeout(() => { if($('lSearch').value.trim() === q) runLogOnline(q); }, 550); });   // online results load as you type

$('lScanIn').addEventListener('click', () => { close('ovLog'); startScan('log'); });

// editing a log entry keeps fibre / sodium / potassium right too
$('amSave').addEventListener('click', () => {
  if(!AM || AM.mode !== 'editlog') return; const e = (dayLog[AM.date] || []).find(x => x.id === AM.entry.id); if(!e || !AM.info.food && !AM.info.meal) return;
  const m = macrosFor(AM.info.per, e.amt); Object.assign(e, m); saveLog();
});

$('dBlocks').addEventListener('click', e => {
  if(e.target.closest('[data-gymstart]') || e.target.closest('[data-gymresume]')) return gymStartToday();   // Start / Resume on the gym-day card
  if(e.target.closest('[data-skipday]')){ setDay({ type: 'rest', skipped: true }); renderAll(); toast(t('gymSkippedT')); return; }   // skip today: rest-day targets
  if(e.target.closest('[data-unskip]')){ const pl = planFor(curDay) || {}; setDay({ type: 'gym', skipped: false, work: pl.work || 'upper', time: pl.time || profile.gymTime || '18:00' }); renderAll(); return; }
  if(e.target.closest('[data-rmx]')){ ui.remHide = curDay; saveUI(); renderTodayRec(); } if(e.target.closest('[data-gorec]')) go('gym-rec'); });

const WD1 = () => [1, 2, 3, 4, 5, 6, 0];

$('suBody').addEventListener('click', e => {
  const L2 = e.target.closest('[data-sulang]'); if(L2){ lang = L2.dataset.sulang; ui.lang = lang; saveUI(); applyLang(); route(); drawSetup(); return; }
  const fc = e.target.closest('.fpchips button'); if(fc){ fc.classList.toggle('on'); Phone.haptic(); return; }
  const g = e.target.closest('#suGoal [data-v]'); if(g){ SUP.goal = g.dataset.v; setSeg('#suGoal', SUP.goal); return; }
  const us = e.target.closest('#suUse [data-v]'); if(us){ SUP.use = us.dataset.v; setSeg('#suUse', SUP.use); return; }
  const gd = e.target.closest('[data-sugym]'); if(gd){ readSetup(); const d = +gd.dataset.sugym; SUP.gym.has(d) ? SUP.gym.delete(d) : SUP.gym.add(d); drawSetup(); return; }
  const wd = e.target.closest('[data-suwd]'); if(wd){ readSetup(); const d = +wd.dataset.suwd; SUP.workDays.has(d) ? SUP.workDays.delete(d) : SUP.workDays.add(d); drawSetup(); return; }
  if(e.target.closest('#suGetKey')){ const gk = $('getKey'); if(gk) gk.click(); return; }
  if(e.target.closest('[data-suskip]')){ ui.setupDone = true; ui.lang = lang; saveUI(); close('ovSetup'); return; }
  const nv = e.target.closest('[data-sunav]'); if(!nv) return; readSetup();
  if(nv.dataset.skipkey !== undefined) SUP.key = settings.geminiKey || '';
  if(nv.dataset.sunav === 'done') return finishSetup();
  const d = +nv.dataset.sunav; if(d > 0 && SUP.step === 1 && !(SUP.bw > 30)){ toast(t('suNeedW')); $('suBw').focus(); return; }
  SUP.step = Math.max(0, Math.min(5, SUP.step + d)); drawSetup();
});

$('suBody').addEventListener('change', e => { if(e.target.id === 'suWork'){ readSetup(); SUP.work = e.target.checked; drawSetup(); } });

// ---------- fridge = stock only; shopping in by photo, receipt or barcode ----------

$('shopOpts').addEventListener('click', e => {
  const b = e.target.closest('[data-shop]'); if(!b) return; const k = b.dataset.shop;
  if(k === 'search'){ close('ovShop'); openFridgeChooser(); return; }
  if(k === 'scan'){ close('ovShop'); startScan('fridge'); return; }
  if(!settings.geminiKey){ toast(t('needKeyFirst')); return; }
  $('shopFile').value = ''; $('shopFile').click();
});

// 0.7: receipts and grocery photos: the best model reads the lines at full sharpness, the app finds the foods (shop.js)
$('shopFile').addEventListener('change', () => { const file = $('shopFile').files[0]; if(!file) return; close('ovShop'); shopPhoto(file); });

// the review list: tick, change the food, pack size, the count wheel, Add all
$('shopList').addEventListener('click', e => {
  const r = e.target.closest('[data-si]'); if(!r) return; const x = SHOP.items[+r.dataset.si]; if(!x) return;
  if(e.target.closest('[data-son]')){ if(!x.on && !x.foodId && !x.gid && !x.data) return shopPickFor(x); x.on = !x.on; shopRedrawRow(x); drawShopBtn(); return; }
  const wn = e.target.closest('[data-wn]'); if(wn){ const w = wn.closest('.wheel'); w.scrollTo({ top: (+wn.dataset.wn - 1) * WH, behavior: 'smooth' }); }
  if(!e.target.closest('.wheelw,.spack')) shopEdit(x);
});
function shopPickFor(x){ openIngSearch(x.name_en || x.name || '', ref => { if(ref.type === 'my'){ const f = foods.find(y => y.id === ref.id); if(f) shopSetFood(x, f); } else if(ref.type === 'gen'){ x.gid = ref.id; x.foodId = null; x.data = null; x.web = false; x.name = ref.name; }
  x.on = true; open('ovShopRev'); drawShop(); if(SHED === x) shopEdit(x); }, { force: true }); }
makeSwipeDelete($('shopList'), '.shoprow', c => { const x = SHOP.items[+c.dataset.si]; if(x) shopRemove(x); else drawShop(); }, { buttons: true });
$('shedName').addEventListener('input', () => { const x = SHED; x.name = $('shedName').value; if(x.data) x.data.name = x.name; });
$('shedSize').addEventListener('input', () => { SHED.size = +$('shedSize').value.replace(',', '.') || null; SHED.sizeFixed = true; });
$('shedFoodBtn').addEventListener('click', () => { const x = SHED; shopPickFor(x); });
$('shedTags').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; if(b.dataset.sfrz !== undefined) SHED.frozen = !SHED.frozen; else SHED.tag = b.dataset.stag; drawShedTags(); });
document.querySelectorAll('[data-shedn]').forEach(b => b.addEventListener('click', () => { SHED.count = Math.max(1, Math.min(30, SHED.count + +b.dataset.shedn)); SHED.userCount = true; $('shedCount').textContent = SHED.count; }));
$('shedDone').addEventListener('click', () => { close('ovShopEd'); const x = SHED; x.on = true; SHED = null; drawShop(); });
function drawShopBtn(){ const n = shopVisible().filter(({ x }) => x.on).length; $('shopAddBtn').textContent = n ? t('shopAddAll', { n }) : t('done'); }
$('shopList').addEventListener('input', e => { const r = e.target.closest('[data-si]'); if(!r) return; const x = SHOP.items[+r.dataset.si];
  if(e.target.matches('[data-ssize]')){ x.size = +e.target.value.replace(',', '.') || null; x.sizeFixed = true; } });
// the wheel: scroll snaps to a number; a light tick each time it passes one
$('shopList').addEventListener('scroll', e => { const w = e.target; if(!w.classList || !w.classList.contains('wheel')) return;
  const x = SHOP.items[+w.closest('[data-si]').dataset.si], n = Math.max(1, Math.min(30, Math.round(w.scrollTop / WH) + 1));
  if(n !== x.count){ x.count = n; x.userCount = true; Phone.vibrate(5); w.querySelectorAll('[data-wn]').forEach(d => d.classList.toggle('on', +d.dataset.wn === n)); } }, true);
new ResizeObserver(() => syncWheels()).observe($('shopList'));
$('shopAddBtn').addEventListener('click', shopAddAll);
$('shopDone').addEventListener('click', e => { if(e.target.closest('#shopUndoSure')){ takeBack(SHOP.sureIds || []); SHOP.items.forEach(x => { if(x.sure){ x.done = false; x.on = true; } }); SHOP.sureIds = []; renderAll(); drawShop(); } });

// the scanner's "More items?" (after the first scan)
$('scanQMore').addEventListener('click', () => { if(!SHOP.scan) return; SHOP.scan.cont = true; SHOP.scan.ask = false; scanUI(); });
$('scanQClose').addEventListener('click', () => close('ovScan'));

// ✨ Check My Foods
$('checkFoodsBtn').addEventListener('click', checkFoods);
$('chkCancel').addEventListener('click', () => { if(CHK && CHK.running) CHK.ctl.abort(); else close('ovCheck'); });
$('chkList').addEventListener('click', e => { const r = e.target.closest('[data-ck]'); if(!r) return;
  if(e.target.closest('[data-cacc]')) checkDecide(+r.dataset.ck, true); else if(e.target.closest('[data-ckeep]')) checkDecide(+r.dataset.ck, false); });

$('gOther').addEventListener('click', () => { forcePick = true; $('gStart').click(); });

// ---------- gym: big, labelled − / + steppers instead of empty boxes ----------
const stepOf = (exId, k) => isCardio(exId) ? (k === 'w' ? .5 : 1) : k === 'r' ? 1 : ({ dumbbell: 2, kettlebell: 4, bodyweight: 2.5, band: 1 }[exById(exId).e] || 2.5);

// − / + steppers: the first tap on an empty box starts from a sensible number (or takes the suggestion)
function stepSet(b){
  const x = exAt(b), row = b.closest('[data-s]'); if(!x || !row) return; const s = x.sets[+row.dataset.s], k = b.dataset.step, inp = row.querySelector(`[data-${k}]`);
  const hasPh = inp.placeholder && !isNaN(+inp.placeholder), st = stepOf(x.exId, k);
  if(s[k] === '' && !hasPh){ // nothing to go on yet: start from a sensible number instead of 0
    const e0 = exById(x.exId).e, start = k === 'r' ? (isCardio(x.exId) ? 20 : (parseInt(String(x.reps || '').split('-')[0], 10) || 8)) : isCardio(x.exId) ? 1 : ({ barbell: 20, dumbbell: 10, machine: 20, cable: 10, kettlebell: 8, bodyweight: 0, band: 0 }[e0] ?? 10);
    s[k] = String(start); inp.value = s[k]; saveG('act'); return; }
  const cur = s[k] !== '' ? +s[k] : (hasPh ? +inp.placeholder : 0);
  let v = Math.max(0, r1(cur + st * +b.dataset.d)); if(s[k] === '' && inp.placeholder && !isNaN(+inp.placeholder) && +b.dataset.d > 0 && cur === +inp.placeholder) v = cur; // first tap takes the suggestion
  s[k] = String(v); inp.value = s[k]; saveG('act');
}

const bumpReps = (r, d) => { const parts = String(r).split('-').map(x => parseInt(x, 10)).filter(n => !isNaN(n)); if(!parts.length) return String(Math.max(1, 10 + d)); return parts.map(n => Math.max(1, n + d)).join('-'); };

$('tpTypeShow').addEventListener('click', e => { if(e.target.closest('#tpTypeChg')) $('tpType').classList.toggle('hide'); });

document.querySelectorAll('#tpType button').forEach(b => b.addEventListener('click', () => { $('tpType').classList.add('hide'); drawTpl(); }));

const FEDB_IMG = p => `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${p}`;

const tokz = s => norm(s).replace(/[()/,]/g, ' ').split(' ').filter(Boolean).map(w => SYN[w] || w).join(' ').split(' ').filter(w => w.length > 1 && !['the', 'with', 'and', 'on', 'to', 'of', 'grip'].includes(w));

$('dmNext').addEventListener('click', () => { if(!DEMO.list || DEMO.list.length < 2) return; DEMO.i = (DEMO.i + 1) % DEMO.list.length; ui.demoPick = { ...(ui.demoPick || {}), [DEMO.exId]: DEMO.list[DEMO.i].id }; saveUI(); drawDemo(); });
$('dmBody').addEventListener('click', e => { const b = e.target.closest('#dmPct'); if(!b) return; const on = !b.classList.contains('on');
  b.classList.toggle('on', on); b.setAttribute('aria-checked', on); ui.formPct = on; saveUI(); const g = $('fmLbl'); if(g) g.style.opacity = on ? 1 : 0; });

 let weights = Store.load('weights', {});

$('wiSave').addEventListener('click', () => { const w = r1(bwIn(num('wiIn'))); if(!(w > 30)) { $('wiIn').focus(); return; } weights[todayKey()] = w; Store.save('weights', weights);
  if(targets){ targets.bw = w; Store.save('targets', targets); } $('tgBw').value = w; drawWeigh(); toast(t('wiSaved')); });



// ---------- cooking: just weigh the food; the pot method hides behind a link ----------
$('potOther').addEventListener('click', () => $('cPotFull').closest('.grid').classList.toggle('hide'));

// ---------- smooth sliders ----------


// new sheets get the back arrow and tap-outside-to-close, like the others
['ovSetup', 'ovQuick', 'ovShop', 'ovShopRev', 'ovShopEd', 'ovDemo', 'ovCheck'].forEach(id => { const ov = $(id), sh = ov.querySelector('.sheet');
  if(id !== 'ovSetup' && !sh.querySelector('.sback')){ const b = document.createElement('button'); b.className = 'sback'; b.type = 'button'; b.setAttribute('aria-label', t('back')); b.dataset.ta = 'back'; b.innerHTML = BACK_SVG; b.addEventListener('click', goBack); sh.prepend(b); }
  if(id !== 'ovSetup') ov.addEventListener('click', e => { if(e.target === ov) close(id); }); });

$('qaSave').addEventListener('click', saveQuick);

 $('qaDel').addEventListener('click', delQuick);

$('suAgainBtn').addEventListener('click', () => { close('ovSettings'); openSetup(); });

applyTabOrder(); history.replaceState(null, '', homeHash()); NAV = [homeHash().slice(1)]; NAVI = 0;   // the app opens on the first tab (Today's Food, or Gym Buddy for mainly-gym use)

// Setup: male / female
document.addEventListener('click', e => { const b = e.target.closest('#suSex [data-v]'); if(!b) return; readSetup(); SUP.sex = b.dataset.v; setSeg('#suSex', SUP.sex); });
