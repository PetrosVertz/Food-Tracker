// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

window.addEventListener('hashchange', route);

$('backBtn').addEventListener('click', () => goBack());

$('backBtn2').addEventListener('click', () => goBack());

$('tSupps').addEventListener('click', () => go('supps'));

$('foodTabs').addEventListener('click', e => { const b = e.target.closest('button'); if(b) history.replaceState(null, '', '#' + (b.dataset.v === 'meals' ? 'meals' : b.dataset.v === 'supps' ? 'supps' : 'foods')), route(); });

$('tScan').addEventListener('click', () => startScan());

$('tFoods').addEventListener('click', () => go('foods'));

$('tMeals').addEventListener('click', () => go('meals'));

// the floating button does the main thing of each page; the second one (Food Track, Fridge) is next to it
$('fab').addEventListener('click', () => { const a = $('fab').dataset.action;
  if(a === 'supps') openSupp(null); else if(a === 'today') openLogSearch(); else if(a === 'fridge') open('ovShop'); else if(a === 'meals') open('ovCookPick');
  else if(a === 'gym') $('gStart').click(); else if(a === 'gymlib') openTpl(null);
  else { pendingBarcode = null; openForm({}, null, 'new'); } });   // Food Track: ＋ Add Food = type it in
$('fab2').addEventListener('click', () => { if($('fab').dataset.action === 'fridge'){ shopCamera(); return; } pendingBarcode = null; startScan(); });

document.querySelectorAll('[data-settings]').forEach(b => b.addEventListener('click', openSettings));

$('search').addEventListener('input', render);

$('catChips').addEventListener('click', e => { const b = e.target.closest('.fchip'); if(!b) return; ui.cat = b.dataset.c; saveUI(); render(); });

$('sortBtn').addEventListener('click', () => { ui.sort = ui.sort === 'recent' ? 'az' : 'recent'; saveUI(); render(); });

$('list').addEventListener('click', e => { const card = e.target.closest('.card'); if(!card) return; const f = foods.find(x => x.id === card.dataset.id); if(f) openForm(f, null, 'edit'); });

document.querySelectorAll('#fState button').forEach(b => b.addEventListener('click', () => { F.stateTouched = true; setState(b.dataset.v); }));

document.querySelectorAll('#fUnit button').forEach(b => b.addEventListener('click', () => { F.unitTouched = true; setUnit(b.dataset.v); }));

document.querySelectorAll('#fPieces button').forEach(b => b.addEventListener('click', () => { F.piecesTouched = true; F.pieceSkipped = false; setPieces(b.dataset.v); }));

document.querySelectorAll('#fDisplay button').forEach(b => b.addEventListener('click', () => setDisplay(b.dataset.v)));

$('fPiece').addEventListener('input', () => { $('fCount').value = ''; pieceHint(); updatePreview(); });

$('fCount').addEventListener('input', () => {
  const n = num('fCount');
  if(n > 0 && F.usual) $('fPiece').value = r1(F.usual / n);
  else if(n > 0){ $('pieceHint').textContent = t('addPackFirst'); return; }
  pieceHint(); updatePreview();
});

$('typeBtn').addEventListener('click', () => {
  mountPicker($('typePicker'), F.cat ? { cat:F.cat, sub:F.sub } : null, v => { F.typeTouched = true; setType(v.cat, v.sub, false); close('ovType'); });
  open('ovType');
});

$('noBrandBtn').addEventListener('click', () => { setNoBrand(!F.noBrand); if(!F.noBrand) $('fBrand').focus(); });

$('fName').addEventListener('input', () => {
  F.gid = null;
  if(F.editingId) return;
  const v = $('fName').value;
  if(!F.stateTouched) setState(guessState(v));
  if(!F.typeTouched){ const g = guessType(v); if(g) setType(g.cat, g.sub, true); }
  if(!F.piecesTouched && F.cat) setPieces(guessPieces(F.cat, F.sub, v));
});

$('packAdd').addEventListener('click', addPack);

$('packIn').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); addPack(); } });

$('packList').addEventListener('click', e => {
  const s = e.target.closest('[data-star]'), r = e.target.closest('[data-rm]');
  if(s){ F.usual = Number(s.dataset.star); drawPacks(); }
  if(r){ const v = Number(r.dataset.rm); F.packs = F.packs.filter(p => p !== v); if(F.usual === v) F.usual = F.packs[0] ?? null; drawPacks(); }
});

['fKcal','fP','fC','fF'].forEach(id => $(id).addEventListener('input', checkKcal));

$('saveBtn').addEventListener('click', trySave);

document.querySelectorAll('#mBrandSeg button').forEach(b => b.addEventListener('click', () => {
  M.brandMode = b.dataset.v; setSeg('#mBrandSeg', M.brandMode);
  $('mBrand').classList.toggle('hide', M.brandMode !== 'add');
  if(M.brandMode === 'add') setTimeout(() => $('mBrand').focus(), 50);
  checkMissing();
}));

$('mBrand').addEventListener('input', checkMissing);

$('mBrand').addEventListener('keydown', e => { if(e.key === 'Enter' && !$('mSave').disabled) $('mSave').click(); });

$('mSave').addEventListener('click', () => {
  if(M.needBrand){ if(M.brandMode === 'none') setNoBrand(true); else { setNoBrand(false); $('fBrand').value = $('mBrand').value.trim(); } }
  if(M.needType){ F.typeTouched = true; setType(M.cat, M.sub, false); }
  close('ovMissing'); trySave();
});

document.querySelectorAll('#pcSeg button').forEach(b => b.addEventListener('click', () => { setPcMode(b.dataset.v); setTimeout(() => $(b.dataset.v === 'weigh' ? 'pcG' : 'pcN').focus(), 50); }));

['pcG','pcN','pcPack'].forEach(id => { $(id).addEventListener('input', pcCheck); $(id).addEventListener('keydown', e => { if(e.key === 'Enter' && !$('pcSave').disabled) $('pcSave').click(); }); });

$('pcSave').addEventListener('click', () => {
  const v = pcValue(); if(!v) return;
  if(PC.mode === 'count'){ const p = num('pcPack'); if(!F.packs.includes(p)) F.packs.push(p); F.usual = p; drawPacks(); }
  $('fPiece').value = v; F.pieceSkipped = false; pieceHint(); updatePreview();
  close('ovPiece'); trySave();
});

$('pcSkip').addEventListener('click', () => { F.pieceSkipped = true; close('ovPiece'); trySave(); });

$('pcNone').addEventListener('click', () => { F.piecesTouched = true; setPieces('none'); close('ovPiece'); trySave(); });

$('delBtn').addEventListener('click', () => {
  const i = foods.findIndex(x => x.id === F.editingId); if(i === -1) return;
  const [gone] = foods.splice(i, 1); saveFoods(); close('ovForm'); renderAll();
  toast(t('deleted', { n: foodName(gone) }), t('undo'), () => { foods.splice(i, 0, gone); saveFoods(); renderAll(); });
});

$('dupBtn').addEventListener('click', () => {
  const f = foods.find(x => x.id === F.editingId); if(!f) return;
  close('ovForm');
  setTimeout(() => { openForm({ ...f, id:null, barcode:null, createdAt:null, updatedAt:null, source:'manual' }, null, 'new');
    $('formSub').textContent = t('copyOf'); F.typeTouched = F.stateTouched = F.unitTouched = F.piecesTouched = true; }, 60);
});

$('optManual').addEventListener('click', () => { close('ovAdd'); const code = pendingBarcode; pendingBarcode = null; openForm({ barcode: code }, null, 'new'); });

$('optScan').addEventListener('click', () => { close('ovAdd'); startScan(); });

$('scanManual').addEventListener('click', () => { close('ovScan'); openForm({}, null, 'new'); });

$('scanLabel').addEventListener('click', () => { close('ovScan'); pendingBarcode = null; status($('addStatus'), ''); open('ovAdd'); $('optPhoto').click(); });

$('scanCancel').addEventListener('click', () => close('ovScan'));

$('torchBtn').addEventListener('click', async () => {
  const tr = stream && stream.getVideoTracks()[0]; if(!tr) return;
  try{ torchOn = !torchOn; await tr.applyConstraints({ advanced:[{ torch: torchOn }] }); $('torchBtn').classList.toggle('on', torchOn); }catch(e){ toast(t('lightNA')); }
});

$('scanPhotoBtn').addEventListener('click', () => { $('barcodePhoto').value = ''; $('barcodePhoto').click(); });

$('barcodePhoto').addEventListener('change', async e => {
  const file = e.target.files[0]; if(!file) return;
  status($('scanStatus'), t('readingPhoto'));
  try{
    const det = await Phone.barcodeReader(); const bmp = await createImageBitmap(file);
    const hit = (await det.detect(bmp)).map(r => r.rawValue).find(c => validGTIN(c));
    if(hit && scanCtx === 'fridge' && SHOP.scan){ status($('scanStatus'), ''); shopAddCode(hit); return; }
    if(hit){ stopScan(); lookup(hit); } else status($('scanStatus'), t('noCodeInPhoto'), true);
  }catch(err){ status($('scanStatus'), t('photoFail'), true); }
});

$('lookupBtn').addEventListener('click', async () => {
  const c = $('manualCode').value.replace(/\D/g,'');
  if(!c){ toast(t('typeCodeFirst')); $('manualCode').focus(); return; }
  if(c.length < 8){ toast(t('codeShort')); return; }
  if(!validGTIN(c) && !(await ask(t('codeInvalid')))) return;
  if(scanCtx === 'fridge' && SHOP.scan){ $('manualCode').value = ''; shopAddCode(c); return; }   // typed codes join the list too
  stopScan(); lookup(c);
});

$('manualCode').addEventListener('keydown', e => { if(e.key === 'Enter') $('lookupBtn').click(); });

$('optPhoto').addEventListener('click', () => {
  if(!settings.geminiKey){ status($('addStatus'), t('needKey'), true); return; }
  $('photoInput').value = ''; $('photoInput').click();
});

$('photoInput').addEventListener('change', async e => {
  const file = e.target.files[0]; if(!file) return;
  status($('addStatus'), t('readingLabel'));
  const onTry = (i, n) => status($('addStatus'), t('readingLabel') + (i > 1 ? ' ' + t('tryingModel', { i, n }) : ''));
  try{
    const img = await shrink(file);
    const d = await gemini(`You read food nutrition labels (often Greek). Return ONLY JSON:
{"brand":string|null,"name":string|null,"kcal":number|null,"protein":number|null,"carbs":number|null,"fat":number|null,"fiber":number|null,"sugar":number|null,"satFat":number|null,"salt":number|null,"potassium":number|null,"serving":number|null,"unit":"g"|"ml","packSize":number|null,"state":"uncooked"|"cooked"|"ready"}
Rules: values from the per 100 g / 100 ml column, never per serving. kcal not kJ. carbs = total carbohydrate (Υδατάνθρακες), sugar = "εκ των οποίων σάκχαρα". If only per-serving values exist, convert to per 100 using the serving size. serving = weight of one piece/slice/serving if printed. potassium in mg per 100 g if listed. unit "ml" for drinks/milk/oil. packSize = net quantity of the whole pack in g or ml. state "uncooked" for dry rice/pasta/oats/raw meat, else "ready". null for anything unreadable.`, img, onTry);
    if(d.packSize > 0){ d.packs = [Math.round(d.packSize)]; d.usualPack = d.packs[0]; }
    if(d.unit === 'g' || d.unit === 'ml') d.unitFromLabel = true; else delete d.unit;
    if(pendingBarcode) d.barcode = pendingBarcode;
    d.source = 'label photo'; pendingBarcode = null;
    close('ovAdd'); openForm(d, t('theLabelPhoto'), 'new');
  }catch(err){ status($('addStatus'), t('labelFail', { e: err.message }), true); }
});

const macroLine = f => `${stTag(f.state)}${Math.round(f.kcal ?? 0)} kcal · P ${fmt(f.protein)} · C ${fmt(f.carbs)} · F ${fmt(f.fat)} / 100 ${f.unit || 'g'}`;

$('iSearch').addEventListener('input', () => {
  status($('iStatus'), ''); drawIngResults();
  clearTimeout(ING.timer);
  const text = $('iSearch').value.trim();
  const local = searchLocal(text);
  if(text.length >= 3 && local.mine.length + local.std.length < 2) ING.timer = setTimeout(() => runOnline(text), 700);
});

$('iResults').addEventListener('click', e => {
  if(e.target.closest('#iOnline')){ runOnline($('iSearch').value.trim()); return; }
  const b = e.target.closest('.sitem'); if(!b) return;
  const i = Number(b.dataset.i), k = b.dataset.k, saveIt = ING.force || $('iSaveMy').checked;
  if(k === 'm') return pickIng(foods_ref(lastLocal.mine[i]));
  if(k === 's'){ const g = lastLocal.std[i]; return pickIng(saveIt ? foods_ref(saveGeneric(g)) : gen_ref(g)); }
  if(k === 'o'){
    const d = ING.online[i];
    if(saveIt){ close('ovIng'); openForm(d, 'Open Food Facts', 'new', { onSaved: f => { ING.cb && ING.cb(foods_ref(f)); } }); return; }
    return pickIng(off_ref(d));
  }
});

const foods_ref = f => ({ type:'my', id:f.id, name:foodName(f), unit:f.unit, icon:iconOf(f), per:{ kcal:f.kcal, protein:f.protein, carbs:f.carbs, fat:f.fat, fiber:f.fiber, salt:f.salt, potassium:f.potassium } });

const gen_ref = g => ({ type:'gen', id:g.gid, name:L(g), unit:g.unit, icon:subOf(g.cat,g.sub).icon, per:{ kcal:g.kcal, protein:g.protein, carbs:g.carbs, fat:g.fat, fiber:g.fiber, salt:g.salt, potassium:g.potassium } });

const off_ref = d => ({ type:'off', id:d.barcode, name:d.name, unit:d.unit || 'g', icon:'🌐', per:{ kcal:d.kcal ?? Math.round(d.protein*4 + d.carbs*4 + d.fat*9), protein:d.protein, carbs:d.carbs, fat:d.fat, fiber:d.fiber, salt:d.salt, potassium:d.potassium } });

const newRow = () => ({ key: uid(), ref: null, grams: null, wanted: '' });

$('recipeShow').addEventListener('click', e => { if(e.target.closest('#dropRecipe')){ D.recipe = null; drawRecipeBox(); } });

$('iRows').addEventListener('click', e => {
  const row = e.target.closest('.irow'); if(!row) return;
  const r = D.rows.find(x => x.key === row.dataset.key);
  if(e.target.closest('[data-rm]')){ D.rows = D.rows.filter(x => x !== r); if(!D.rows.length) D.rows.push(newRow()); drawRows(); return; }
  if(e.target.closest('[data-pick]')) openIngSearch(r.wanted || '', ref => { r.ref = ref; drawRows(); const inp = document.querySelector(`.irow[data-key="${r.key}"] [data-g]`); if(inp && !r.grams) inp.focus(); });
});

$('iRows').addEventListener('input', e => {
  if(!e.target.matches('[data-g]')) return;
  const r = D.rows.find(x => x.key === e.target.closest('.irow').dataset.key);
  const v = e.target.value.trim().replace(',', '.'); r.grams = v === '' ? null : Number(v); calcMeal();
});

$('addIng').addEventListener('click', () => {
  const r = newRow(); D.rows.push(r); drawRows();
  openIngSearch('', ref => { r.ref = ref; drawRows(); const inp = document.querySelector(`.irow[data-key="${r.key}"] [data-g]`); if(inp) inp.focus(); });
});

['cPotFull','cPotEmpty','cCooked'].forEach(id => $(id).addEventListener('input', () => { if(id !== 'cCooked'){ const w = num('cPotFull') - (num('cPotEmpty') || 0); if(num('cPotFull') && num('cPotEmpty') !== null) $('cCooked').value = w > 0 ? r1(w) : ''; } calcMeal(); }));

$('cSave').addEventListener('click', async () => {
  const name = $('cName').value.trim();
  if(!name){ toast(t('needMealName')); $('cName').focus(); return; }
  const rows = D.rows.filter(r => r.ref || r.grams);
  if(!rows.length){ toast(t('needIng')); return; }
  if(rows.some(r => !r.ref)){ toast(t('unsetIng')); return; }
  if(rows.some(r => !(r.grams > 0))){ toast(t('needGrams')); return; }
  if(num('cPotFull') && num('cPotEmpty') !== null && num('cPotFull') <= num('cPotEmpty')){ toast(t('potNegative')); return; }
  const tot = mealTotals(rows), w = num('cCooked');
  // 0.6.1: no cooked weight = worked out from the ingredients, no question
  const cooked = w > 0 ? w : tot.raw, m = 100 / cooked, now = new Date().toISOString();
  const rec = { name, ingredients: rows.map(({ key, wanted, ...r }) => r), rawWeight: tot.raw, cookedWeight: cooked, cookedEstimated: !(w > 0),
    kcal: Math.round(tot.kcal*m), protein: r1(tot.protein*m), carbs: r1(tot.carbs*m), fat: r1(tot.fat*m), fiber: r1(tot.fib*m), salt: Math.round(tot.na*m/400*100)/100, potassium: Math.round(tot.k*m),
    total: { kcal: Math.round(tot.kcal), protein: r1(tot.protein), carbs: r1(tot.carbs), fat: r1(tot.fat) },
    recipe: D.recipe, updatedAt: now };
  if(D.id){ const i = meals.findIndex(x => x.id === D.id);
    meals[i] = { ...meals[i], ...rec, cookedAt: D.mode === 'again' ? now : meals[i].cookedAt, timesCooked: D.mode === 'again' ? (meals[i].timesCooked || 1) + 1 : (meals[i].timesCooked || 1) }; }
  else meals.push({ id: uid(), createdAt: now, cookedAt: now, timesCooked: 1, ...rec });
  if(!saveMeals()) return;
  const extra = afterCook(D.id || meals[meals.length - 1].id, rows, cooked);
  close('ovCook'); go('meals'); renderAll(); toast(t('mealSaved', { n: name }) + extra);
});

$('cDelete').addEventListener('click', async () => {
  const i = meals.findIndex(x => x.id === D.id); if(i === -1) return;
  if(!(await ask(t('deleteMeal', { n: meals[i].name })))) return;
  const [gone] = meals.splice(i, 1); saveMeals(); close('ovCook'); renderAll();
  toast(t('deleted', { n: gone.name }), t('undo'), () => { meals.splice(i, 0, gone); saveMeals(); renderAll(); });
});

$('suggestBtn').addEventListener('click', async () => {
  if(recCtl){ recCtl.abort(); return; }   // second tap = cancel
  const name = $('cName').value.trim();
  if(!name){ toast(t('suggestNeedName')); $('cName').focus(); return; }
  if(!settings.geminiKey){ $('suggestHint').textContent = t('needKey'); $('suggestHint').classList.add('warn'); return; }
  $('suggestHint').classList.remove('warn'); $('suggestHint').textContent = t('suggestHint');
  const btn = $('suggestBtn'); btn.textContent = t('thinking'); recCtl = new AbortController(); const ctl = recCtl;
  const onTry = (i, n) => { if(recCtl === ctl) btn.textContent = t('cancelRec', { i, n }); };
  try{
    const have = foods.slice(0, 80).map(f => foodName(f)).join('; ');
    const r = await gemini(`You are a practical home-cooking assistant for someone who lifts weights and tracks macros.
Dish: "${name}". Write ALL text in ${lang === 'el' ? 'Greek' : 'English'}.
Return ONLY JSON: {"title":string,"servings":number,"minutes":number,"ingredients":[{"name":string,"name_en":string,"grams":number,"note":string|null}],"steps":[string]}
Rules: amounts in grams for the whole batch (liquids: 1 ml = 1 g), weighed raw as they go in (dry pasta and rice, raw meat). Include cooking oil explicitly. 3–10 ingredients, 4–10 short clear steps. name_en is a plain generic English food name (e.g. "chicken breast", "olive oil", "onion", "beef mince").
Foods the user already has (prefer them when they fit): ${have || 'none listed'}`, null, onTry, ctl.signal);
    if(!r || !Array.isArray(r.steps) || !r.steps.length) throw new Error('empty recipe');
    pendingRecipe = r;
    $('rBody').innerHTML = recipeHtml(r, false);
    open('ovRecipe');
  }catch(err){ if(!err.cancelled){ $('suggestHint').textContent = t('recipeFail', { e: err.message }); $('suggestHint').classList.add('warn'); } }
  finally{ recCtl = null; btn.textContent = t('suggestRecipe'); }
});

$('rNo').addEventListener('click', () => { pendingRecipe = null; close('ovRecipe'); });

$('rYes').addEventListener('click', () => {
  if(pendingRecipe){ const r = pendingRecipe; if(!$('ovCook').classList.contains('open')){ openCook(null, 'new'); if(r.title) $('cName').value = r.title; }
    applyRecipe(r, false); pendingRecipe = null; }
  close('ovRecipe'); if(D && D.recipe && (D.recipe.servings || 1) <= 1) $('cLeft').checked = false; });   // one-plate recipes: no leftovers by default

const nk = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ς/g,'σ');

const R_AMT = new RegExp(`${R_NUM}\\s*(${R_UNITS.map(u => u[0]).join('|')})(?![a-zα-ω])\\.?`);

$('ownBtn').addEventListener('click', () => { OWN = null; $('ownText').value = ''; $('ownOut').innerHTML = ''; $('ownUse').disabled = true; open('ovOwn'); setTimeout(() => $('ownText').focus(), 120); });

$('ownRead').addEventListener('click', readOwn);

$('ownUse').addEventListener('click', () => { if(!OWN) readOwn(); if(OWN && (OWN.ingredients.length || OWN.steps.length)){ applyRecipe(OWN, true); close('ovOwn'); } });

$('mSearch').addEventListener('input', renderMeals);

$('mList').addEventListener('click', e => { const c = e.target.closest('[data-mid]'); if(c) openMeal(c.dataset.mid); });

$('mdPlate').addEventListener('input', () => {
  const m = meals.find(x => x.id === openMealId), g = num('mdPlate'), el = $('mdPlateRes');
  if(!m || !(g > 0)){ el.classList.remove('show'); return; }
  const x = g / 100; el.innerHTML = `${fmtSize(g, 'g')}: <b>${Math.round(m.kcal*x)} kcal</b> · P ${r1(m.protein*x)} · C ${r1(m.carbs*x)} · F ${r1(m.fat*x)}`; el.classList.add('show');
});

$('mdCookAgain').addEventListener('click', () => { const m = meals.find(x => x.id === openMealId); close('ovMeal'); if(m) setTimeout(() => openCook(m, 'again'), 60); });

$('mdEdit').addEventListener('click', () => { const m = meals.find(x => x.id === openMealId); close('ovMeal'); if(m) setTimeout(() => openCook(m, 'edit'), 60); });

// [id, English, Greek, dose, unit, times, icon]  — typical label doses, always editable
const QUICK = [
  ['creatine','Creatine','Κρεατίνη',5,'g',['any'],'💪'], ['whey','Whey protein','Πρωτεΐνη whey',30,'g',['post'],'🥛'],
  ['magnesium','Magnesium','Μαγνήσιο',300,'mg',['bed'],'🌙'], ['melatonin','Melatonin','Μελατονίνη',1,'mg',['bed'],'😴'],
  ['vitd','Vitamin D3','Βιταμίνη D3',2000,'IU',['breakfast'],'☀️'], ['omega3','Omega-3','Ωμέγα-3',1,'caps',['dinner'],'🐟'],
  ['zinc','Zinc','Ψευδάργυρος',15,'mg',['dinner'],'🔩'], ['multi','Multivitamin','Πολυβιταμίνη',1,'tabs',['breakfast'],'💊'],
  ['caffeine','Caffeine','Καφεΐνη',200,'mg',['pre'],'⚡'], ['electrolytes','Electrolytes','Ηλεκτρολύτες',1,'scoops',['pre'],'💧'],
  ['vitc','Vitamin C','Βιταμίνη C',500,'mg',['breakfast'],'🍊'], ['ashwa','Ashwagandha','Ασβαγκάντα',600,'mg',['bed'],'🌿'],
].map(([id,en,el,dose,unit,times,icon]) => ({ id, en, el, dose, unit, times, icon }));

const QBY = Object.fromEntries(QUICK.map(q => [q.id, q]));

const todayKey = () => new Date().toLocaleDateString('en-CA');

const suppName = s => (s.qid && QBY[s.qid] && s.name === QBY[s.qid].en) || (s.qid && QBY[s.qid] && s.name === QBY[s.qid].el) ? L(QBY[s.qid]) : s.name;

const suppIcon = s => `<span class="sic">${svgIcon('capsule', 14, 2)}</span>`;   // 0.6.9.3: the line capsule everywhere

const unitLabel = u => t('u_' + u);

$('sList').addEventListener('click', e => { const c = e.target.closest('[data-sid]'); if(!c) return; const id = c.dataset.sid, d = todayKey();
  if(e.target.closest('[data-take]')){ setTakes(d, id, [...takesOf(d, id), nowHM()].sort()); haptic(); renderAll(); return; }
  const x = e.target.closest('[data-tkx]'); if(x){ const a = takesOf(d, id).slice(); a.splice(+x.dataset.tkx, 1); setTakes(d, id, a); renderAll(); return; }
  if(e.target.closest('.take,input')) return;
  const s = supps.find(x => x.id === id); if(s) openSupp(s); });

$('sList').addEventListener('change', e => { const i = e.target.closest('[data-tkt]'); if(!i) return; const id = i.closest('[data-sid]').dataset.sid, d = todayKey(), a = takesOf(d, id).slice();
  a[+i.dataset.tkt] = i.value || a[+i.dataset.tkt]; setTakes(d, id, a.sort()); renderAll(); });

$('supTimes').addEventListener('click', e => { const b = e.target.closest('[data-t2]'); if(!b) return; const v = b.dataset.t2;
  SU.times = SU.times.includes(v) ? SU.times.filter(x => x !== v) : [...SU.times, v]; drawSupTimes(); });

document.querySelectorAll('#supOften button').forEach(b => b.addEventListener('click', () => { SU.often = b.dataset.v; setSeg('#supOften', SU.often); }));

$('supQuickList').addEventListener('click', e => {
  const b = e.target.closest('[data-q]'); if(!b) return; const q = QBY[b.dataset.q];
  SU.qid = q.id; SU.icon = q.icon; SU.times = [...q.times];
  $('supName').value = L(q); $('supDose').value = q.dose; $('supUnit').value = q.unit; drawSupTimes();
  if(q.id === 'whey'){ const w = foods.find(f => f.sub === 'whey'); if(w) $('supFood').value = w.id; }
  $('supQuickList').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
});

$('supName').addEventListener('input', () => { const n = norm($('supName').value); const q = QUICK.find(x => norm(x.en) === n || norm(x.el) === n); SU.qid = q ? q.id : null; SU.icon = q ? q.icon : null; });

$('supSave').addEventListener('click', () => {
  const name = $('supName').value.trim(), dose = num('supDose');
  if(!name){ toast(t('supNeedName')); $('supName').focus(); return; }
  if(!(dose > 0)){ toast(t('supNeedDose')); $('supDose').focus(); return; }
  if(!SU.times.length) SU.times = ['any']; SU.often = 'daily';   // name + dose only
  const now = new Date().toISOString();
  const rec = { name, qid: SU.qid, icon: SU.icon, dose, unit: $('supUnit').value, times: SLOTS.filter(x => SU.times.includes(x)), often: SU.often,
    foodId: $('supFood').value || null, notes: $('supNotes').value.trim(), updatedAt: now };
  if(SU.id){ const i = supps.findIndex(x => x.id === SU.id); supps[i] = { ...supps[i], ...rec }; }
  else supps.push({ id: uid(), createdAt: now, ...rec });
  if(!saveSupps()) return;
  close('ovSupp'); renderAll(); toast(SU.id ? t('updated') : t('saved', { i: '' }).trim());
});

$('supDel').addEventListener('click', () => {
  const i = supps.findIndex(x => x.id === SU.id); if(i === -1) return;
  const [gone] = supps.splice(i, 1); saveSupps(); close('ovSupp'); renderAll();
  toast(t('deleted', { n: suppName(gone) }), t('undo'), () => { supps.splice(i, 0, gone); saveSupps(); renderAll(); });
});

// Food Track: folds per category
$('list').addEventListener('click', e => { const b = e.target.closest('[data-fcat]'); if(!b) return; FCAT[b.dataset.fcat] = !FCAT[b.dataset.fcat]; render(); });
// Add food: the other ways hide behind "Can't scan?"
$('cantScanBtn').addEventListener('click', () => { const c = $('cantScan'), op = c.classList.toggle('hide'); $('cantScanBtn').classList.toggle('open', !op); if(!op) setTimeout(() => c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60); });
// Add food: Advanced holds everything under the four macros
$('fAdvSw').addEventListener('change', () => $('fAdv').classList.toggle('hide', !$('fAdvSw').checked));

// scanner: a photo of the whole item (the AI recognises it and fills in typical values)
$('scanItemBtn').addEventListener('click', () => { if(!settings.geminiKey){ toast(t('needKeyFirst')); return; } $('itemPhoto').value = ''; $('itemPhoto').click(); });
$('itemPhoto').addEventListener('change', async () => {
  const file = $('itemPhoto').files[0]; if(!file) return; const ctx = scanCtx;
  try{
    const img = await shrink(file);
    const d = await gemini(`This is a photo of a food or drink product (often from a Greek supermarket). Identify it from the packaging (brand, product name, flavour/variant). If a nutrition table is visible, read it; otherwise give typical values for that exact product. Return ONLY JSON:
{"brand":string|null,"name":string,"kcal":number|null,"protein":number|null,"carbs":number|null,"fat":number|null,"fiber":number|null,"sugar":number|null,"satFat":number|null,"salt":number|null,"unit":"g"|"ml","packSize":number|null}
Values per 100 g / 100 ml, kcal not kJ, carbs = total carbohydrate. packSize = net weight of one pack in g or ml.`, img);
    if(!d || !d.name || d.protein == null) throw new Error('not recognised');
    if(d.packSize > 0){ d.packs = [Math.round(d.packSize)]; d.usualPack = d.packs[0]; } if(d.unit !== 'g' && d.unit !== 'ml') d.unit = 'g';
    if(ctx === 'fridge' && SHOP.scan){ const f = saveOnlineFood({ ...d, source: 'item photo' }), x = shopItem({ scans: 1 }); shopSetFood(x, f); SHOP.items.push(x);
      SHOP.scan = null; close('ovScan'); scanCtx = null; renderAll(); shopReview(); return; }   // the photographed item joins the review list
    close('ovScan'); scanCtx = null;
    if(ctx === 'log' || ctx === 'fridge'){ const f = saveOnlineFood({ ...d, source: 'item photo' }); renderAll(); if(ctx === 'log') openAmt({ mode: 'log', info: fInfo_(f) }); else openFridgeAdd(f); toast(t('scanSaved')); return; }
    d.source = 'item photo'; openForm(d, t('theItemPhoto'), 'new');
  }catch(err){ if(!err.cancelled) toast(t('itemFail')); }
});

// 0.7.3 search boxes: the X clears the box (pointerdown keeps the keyboard up)
logfXInit();
document.addEventListener('pointerdown', e => { if(e.target.closest('.logfXb')) e.preventDefault(); });
document.addEventListener('click', logfXTap, true);
