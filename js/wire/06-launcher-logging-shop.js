// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ---------- logging: your usuals first, last amounts remembered, one-tap re-log, barcode in the bar ----------
const fInfo_ = f => ({ name: foodName(f), icon: iconOf(f) || '🍽️', unit: f.unit, per: f, food: f, piece: f.pieces !== 'none' ? (f.piece || f.serving || null) : null, pw: f.pieces });

$('lSearch').addEventListener('input', () => { clearTimeout(LOGON.timer); const q = $('lSearch').value.trim(); if(LOGON.q !== q){ LOGON.res = []; LOGON.busy = false; }
  if(q.length >= 3) LOGON.timer = setTimeout(() => { if($('lSearch').value.trim() === q) runLogOnline(q); }, 550); });   // online results load as you type

$('lScanIn').addEventListener('click', () => { close('ovLog'); startScan('log'); });

// editing a log entry keeps fibre / sodium / potassium right too
$('amSave').addEventListener('click', () => {
  if(!AM || AM.mode !== 'editlog') return; const e = (dayLog[AM.date] || []).find(x => x.id === AM.entry.id); if(!e || !AM.info.food && !AM.info.meal) return;
  const m = macrosFor(AM.info.per, e.amt); Object.assign(e, m); saveLog();
});

$('dBlocks').addEventListener('click', e => {
  if(e.target.closest('[data-skipday]')){ setDay({ type: 'rest', skipped: true }); renderAll(); toast(t('gymSkippedT')); return; }   // skip today: rest-day targets
  if(e.target.closest('[data-unskip]')){ const pl = planFor(curDay) || {}; setDay({ type: 'gym', skipped: false, work: pl.work || 'upper', time: pl.time || profile.gymTime || '18:00' }); renderAll(); return; }
  if(e.target.closest('[data-rmx]')){ ui.remHide = curDay; saveUI(); renderTodayRec(); } if(e.target.closest('[data-gorec]')) go('gym-rec'); });

const WD1 = () => [1, 2, 3, 4, 5, 6, 0];

$('suBody').addEventListener('click', e => {
  const L2 = e.target.closest('[data-sulang]'); if(L2){ lang = L2.dataset.sulang; ui.lang = lang; saveUI(); applyLang(); route(); drawSetup(); return; }
  const g = e.target.closest('#suGoal [data-v]'); if(g){ SUP.goal = g.dataset.v; setSeg('#suGoal', SUP.goal); return; }
  const gd = e.target.closest('[data-sugym]'); if(gd){ readSetup(); const d = +gd.dataset.sugym; SUP.gym.has(d) ? SUP.gym.delete(d) : SUP.gym.add(d); drawSetup(); return; }
  const wd = e.target.closest('[data-suwd]'); if(wd){ readSetup(); const d = +wd.dataset.suwd; SUP.workDays.has(d) ? SUP.workDays.delete(d) : SUP.workDays.add(d); drawSetup(); return; }
  if(e.target.closest('#suGetKey')){ const gk = $('getKey'); if(gk) gk.click(); return; }
  if(e.target.closest('[data-suskip]')){ ui.setupDone = true; ui.lang = lang; saveUI(); close('ovSetup'); return; }
  const nv = e.target.closest('[data-sunav]'); if(!nv) return; readSetup();
  if(nv.dataset.skipkey !== undefined) SUP.key = settings.geminiKey || '';
  if(nv.dataset.sunav === 'done') return finishSetup();
  const d = +nv.dataset.sunav; if(d > 0 && SUP.step === 1 && !(SUP.bw > 30)){ toast(t('suNeedW')); $('suBw').focus(); return; }
  SUP.step = Math.max(0, Math.min(4, SUP.step + d)); drawSetup();
});

$('suBody').addEventListener('change', e => { if(e.target.id === 'suWork'){ readSetup(); SUP.work = e.target.checked; drawSetup(); } });

// ---------- fridge = stock only; shopping in by photo, receipt or barcode ----------

$('shopOpts').addEventListener('click', e => {
  const b = e.target.closest('[data-shop]'); if(!b) return; const k = b.dataset.shop;
  if(k === 'search'){ close('ovShop'); openFridgeChooser(); return; }
  if(k === 'scan'){ close('ovShop'); SHOP.scanLoop = true; startScan('fridge'); return; }
  if(!settings.geminiKey){ toast(t('needKeyFirst')); return; }
  SHOP.kind = k; $('shopFile').value = ''; $('shopFile').click();
});

$('shopFile').addEventListener('change', async () => {
  const file = $('shopFile').files[0]; if(!file) return;
  close('ovShop'); SHOP.items = []; drawShop(); status($('shopStatus'), t('shopReading')); open('ovShopRev');
  const base = `Return ONLY JSON: {"items":[{"name_en":string,"name_el":string,"brand":string|null,"count":number,"packSize":number|null,"unit":"g"|"ml","kcal":number|null,"protein":number|null,"carbs":number|null,"fat":number|null,"state":"uncooked"|"ready"}]}
packSize = net weight of ONE pack/piece in g or ml (read it if printed, otherwise a typical size, e.g. milk 1000 ml, a chicken breast tray 1000 g, one egg 60 g). Macros = typical values per 100 g/ml of that product (carbs without fibre). state "uncooked" for raw meat/fish, dry rice/pasta/oats, else "ready". Food and drinks only.`;
  const rcpt = `This is a supermarket receipt, often Greek with abbreviated product names. List every food or drink line. Expand abbreviations into a clear name. count = quantity bought; for weighed items (e.g. "0,850 KG") count = 1 and packSize = that weight in g. Skip bags, deposits, discounts and non-food. ${base}`;
  const groc_ = `This photo shows groceries laid out on a table (likely a Greek supermarket). List every distinct food or drink item you can see. count = how many identical packs or pieces (eggs: count the eggs, packSize 60). ${base}`;
  const prompt = SHOP.kind === 'receipt' ? rcpt : SHOP.kind === 'camera' ? `This image is EITHER a supermarket receipt OR groceries laid out on a table. Decide which, then follow the matching instructions.\nIF IT IS A RECEIPT: ${rcpt}\nIF IT IS GROCERIES: ${groc_}` : groc_;
  try{
    const img = await shrink(file), d = await gemini(prompt, img);
    const items = (d && Array.isArray(d.items) ? d.items : []).filter(x => x && (x.name_en || x.name_el));
    if(!items.length){ status($('shopStatus'), t('shopNone'), true); return; }
    SHOP.items = items.map(x => { const ref = matchIng([x.name_en, x.name_el]); return { ...x, on: true, ref, count: Math.max(1, Math.round(x.count || 1)), size: x.packSize > 0 ? Math.round(x.packSize) : null, unit: x.unit === 'ml' ? 'ml' : 'g', loc: null }; });
    status($('shopStatus'), ''); drawShop();
  }catch(err){ status($('shopStatus'), t('shopFail', { e: err.message }), true); }
});

$('shopList').addEventListener('click', e => {
  const r = e.target.closest('[data-si]'); if(!r) return; const x = SHOP.items[+r.dataset.si];
  if(e.target.closest('[data-son]')){ x.on = !x.on; drawShop(); return; }
  if(e.target.closest('[data-sloc]')){ const cur = x.loc || 'fridge', o = ['fridge', 'freezer', 'cupboard']; x.loc = o[(o.indexOf(cur) + 1) % 3]; drawShop(); return; }
  if(e.target.closest('[data-sname]')) openIngSearch(x.name_en || '', ref => { x.ref = ref; x.on = true; drawShop(); open('ovShopRev'); }, { force: true });
});

$('shopList').addEventListener('input', e => { const r = e.target.closest('[data-si]'); if(!r) return; const x = SHOP.items[+r.dataset.si];
  if(e.target.matches('[data-scount]')) x.count = Math.max(1, Math.round(+e.target.value || 1)); if(e.target.matches('[data-ssize]')) x.size = +e.target.value.replace(',', '.') || null; });

$('shopAddBtn').addEventListener('click', () => {
  let n = 0;
  SHOP.items.filter(x => x.on).forEach(x => { const f = shopFood(x); if(!f) return; const loc = x.loc || defaultLoc(f), size = x.size || f.usualPack || (f.piece || 100);
    for(let i = 0; i < x.count; i++) addToFridge({ foodId: f.id, qty: r1(size), packSize: r1(size), unit: f.unit, loc, exp: addDays(todayKey(), defaultDays(f, loc)), expAuto: true });
    if(x.size && !(f.packs || []).includes(x.size)){ f.packs = [...(f.packs || []), x.size]; f.usualPack = f.usualPack || x.size; } n++; });
  saveFoods(); close('ovShopRev'); renderAll(); toast(t('shopAdded', { n }));
});

$('faSave').addEventListener('click', () => { if(SHOP.scanLoop && !$('ovFAdd').classList.contains('open')) setTimeout(() => toast(t('scanNextQ'), t('scanNext'), () => startScan('fridge')), 300); });

$('ovShop').addEventListener('click', e => { if(e.target === $('ovShop')) SHOP.scanLoop = false; });

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

$('wiSave').addEventListener('click', () => { const w = num('wiIn'); if(!(w > 30)) { $('wiIn').focus(); return; } weights[todayKey()] = w; Store.save('weights', weights);
  if(targets){ targets.bw = w; Store.save('targets', targets); } $('tgBw').value = w; drawWeigh(); toast(t('wiSaved')); });

document.addEventListener('click', e => { if(e.target.closest('[data-backup]')) backupNow(); });


// ---------- cooking: just weigh the food; the pot method hides behind a link ----------
$('potOther').addEventListener('click', () => $('cPotFull').closest('.grid').classList.toggle('hide'));

// ---------- smooth sliders ----------
$('soRange').setAttribute('step', 'any');

// new sheets get the back arrow and tap-outside-to-close, like the others
['ovSetup', 'ovQuick', 'ovShop', 'ovShopRev', 'ovDemo'].forEach(id => { const ov = $(id), sh = ov.querySelector('.sheet');
  if(id !== 'ovSetup' && !sh.querySelector('.sback')){ const b = document.createElement('button'); b.className = 'sback'; b.type = 'button'; b.setAttribute('aria-label', 'Back'); b.innerHTML = BACK_SVG; b.addEventListener('click', goBack); sh.prepend(b); }
  if(id !== 'ovSetup') ov.addEventListener('click', e => { if(e.target === ov) close(id); }); });

$('qaSave').addEventListener('click', saveQuick);

 $('qaDel').addEventListener('click', delQuick);

document.querySelectorAll('#pgLaunch .bubble').forEach(b => b.addEventListener('click', () => launchTo(b.dataset.tab, b)));

$('suAgainBtn').addEventListener('click', () => { close('ovSettings'); openSetup(); });

history.replaceState(null, '', '#today'); NAV = ['today']; NAVI = 0;   // the app always opens on Today's food

// Setup: male / female
document.addEventListener('click', e => { const b = e.target.closest('#suSex [data-v]'); if(!b) return; readSetup(); SUP.sex = b.dataset.v; setSeg('#suSex', SUP.sex); });
