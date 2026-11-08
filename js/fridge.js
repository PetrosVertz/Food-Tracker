// Fridge and groceries: stock, take-out, shopping in, stacking. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ---------- where things go (0.7: no expiry dates at all; the fridge is just what you have) ----------
function defaultLoc(f){ return 'fridge'; }   // everything starts in the fridge (no cupboard since 0.6.2); ❄️ Frozen is a switch when adding

// ---------- fridge items ----------
function itemInfo(it){
  if(it.mealId){ const m = meals.find(x => x.id === it.mealId); return m ? { name: m.name, icon: mealIcon(m), unit: 'g', per: m, piece: null, meal: m } : null; }
  const f = foods.find(x => x.id === it.foodId); if(!f) return null;
  return { name: foodName(f), icon: iconOf(f) || '📦', unit: f.unit, per: f, piece: f.pieces !== 'none' ? (f.piece || f.serving || null) : null, pw: f.pieces, food: f };
}

function fmtAmt(qty, info){
  if(info.piece && info.pw && info.pw !== 'none'){ const n = qty / info.piece; return `${Math.round(n * 10) / 10} ${n === 1 ? W(info.pw) : WS(info.pw)} · ${fmtSize(qty, info.unit)}`; }
  return fmtSize(qty, info.unit);
}

function liveItems(){ return fridge.map(it => ({ it, info: itemInfo(it) })).filter(x => x.info); }

// take an amount out of the fridge, oldest pack first; returns how much was actually there
function takeFromFridge(key, amount){
  let left = amount; const mine = fridge.filter(it => key.foodId ? it.foodId === key.foodId : it.mealId === key.mealId);
  mine
    .sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''))
    .forEach(it => { if(left <= 0) return; const d = Math.min(it.qty, left); it.qty = r1(it.qty - d); left -= d; });
  fridge = fridge.filter(it => it.qty > 0.05); saveFridge();
  // only something that was in the fridge can go on Groceries (a takeaway or a Fill My Food item never does)
  const added = key.foodId && mine.length ? checkRestock(key.foodId) : false;
  return { took: r1(amount - Math.max(0, left)), added };
}

function addToFridge(rec){
  fridge.push({ id: uid(), addedAt: new Date().toISOString(), ...rec }); saveFridge();
  // bought it → no longer needed on the list
  if(rec.foodId){ const before = groc.length; groc = groc.filter(g => !(g.foodId === rec.foodId && !g.done)); if(groc.length !== before) saveGroc(); }
}

function openFridgeChooser(){
  openIngSearch('', ref => { const f = foods.find(x => x.id === ref.id); if(f) openFridgeAdd(f); }, { force: true, scanBtn: 'fridge' });
}

function openFridgeAdd(food, preset){
  preset = preset || {};
  const loc = preset.loc || defaultLoc(food);
  FA = { mode: 'new', food, loc };
  $('faTitle').textContent = t('addFridgeHow'); $('faFood').textContent = `${iconOf(food) || '📦'} ${foodName(food)}`;
  const amt = preset.amt || food.usualPack || (food.piece ? food.piece * (food.cat === 'eggs' ? 6 : 1) : 100);
  $('faAmt').value = r1(amt); $('faCount').value = preset.count || food.usualCount || 1; $('faCount').parentElement.querySelector('span:nth-of-type(2)').classList.remove('hide'); $('faCount').classList.remove('hide');
  fillFA(food, loc); $('faDel').classList.add('hide'); $('faFrozen').checked = loc === 'freezer'; open('ovFAdd');
}

function openFridgeItem(it){
  const info = itemInfo(it); if(!info) return;
  FA = { mode: 'edit', item: it, food: info.food || null, meal: info.meal || null, loc: it.loc };
  $('faTitle').textContent = info.name; $('faFood').textContent = `${info.icon} ${t(LOC_KEY[it.loc])}`;
  $('faAmt').value = it.qty; $('faCount').value = 1; $('faCount').classList.add('hide'); $('faCount').parentElement.querySelector('span:nth-of-type(2)').classList.add('hide');
  fillFA(info.food || { unit: 'g', cat: 'ready', sub: 'meal', packs: [] }, it.loc);
  $('faDel').classList.remove('hide'); $('faFrozen').checked = it.loc === 'freezer'; open('ovFAdd');
}

function fillFA(food, loc){
  const u = food.unit || 'g';
  $('faUnit').textContent = u; $('faMinUnit').textContent = u;
  $('faPacks').innerHTML = [...new Set([...(food.packs || []), food.piece && food.pieces !== 'none' ? food.piece : null].filter(Boolean))]
    .map(p => `<button data-amt="${p}">${p === food.piece && food.pieces !== 'none' && !(food.packs || []).includes(p) ? '1 ' + W(food.pieces) + ' · ' : ''}${fmtSize(p, u)}</button>`).join('');
  setSeg('#faLoc', loc); FA.loc = loc;
  $('faStockBox').classList.toggle('hide', !FA.food);
  if(FA.food){ $('faMin').value = FA.food.minStock || ''; $('faAuto').checked = !FA.food.noAutoGrocery; }
  faHint();
}

// ---------- groceries ----------
function renderGroc(){
  const open_ = groc.filter(g => !g.done), done = groc.filter(g => g.done);
  // 0.6.9.3: a supermarket checklist — round tick on the left, the name, the amount on the right; ticked items are
  // crossed off (a line through, faded) and drop to the Bought section. No emoji, no Share (Add to Reminders comes with the App Store app).
  // 0.7: ticking = bought = in the fridge (usual pack × count); the size shown is what goes in
  const row = g => { const f = g.foodId && foods.find(x => x.id === g.foodId), size = g.size || (f && f.usualPack);
    const meta = [g.done && g.fids && g.fids.length ? `<span class="infr">${t('inFridgeTag')}</span>` : '', size ? fmtSize(size, g.unit || (f && f.unit) || 'g') : '', g.why === 'out' ? t('autoTag') : g.why === 'low' ? t('lowTag') : '', f && f.brand && !f.noBrand ? esc(f.brand) : ''].filter(Boolean).join(' · ');
    return `<div class="gitem2 ${g.done ? 'done' : ''}" data-gid="${g.id}">
      <button class="gtick" type="button" data-tick aria-label="${g.done ? t('undo') : 'Bought'}">${g.done ? svgIcon('check', 16, 3) : ''}</button>
      <div class="gname"><span class="gn">${esc(f ? foodName(f) : g.name)}</span>${meta ? `<small>${meta}</small>` : ''}</div>
      ${g.done ? `<button class="girm" type="button" data-del aria-label="Remove">${svgIcon('x', 16, 2.2)}</button>` : `<div class="gqty"><button type="button" data-dec aria-label="Less">−</button><b>${g.count}</b><button type="button" data-inc aria-label="More">+</button></div>`}</div>`; };
  $('gList').innerHTML = open_.length ? open_.map(row).join('') : `<div class="empty">${t('emptyGroc')}</div>`;

  $('gDone').innerHTML = done.length ? `<h3 class="sect"><span>${t('bought', { n: done.length })}</span><button class="linkbtn" id="gClear">${t('clearBought')}</button></h3>
    <div class="glist">${done.map(row).join('')}</div>` : '';
}

function addGroc(food, text){
  if(food){ const ex = groc.find(g => g.foodId === food.id && !g.done); if(ex) ex.count++;
    else groc.push({ id: uid(), foodId: food.id, name: foodName(food), count: food.usualCount || 1, size: food.usualPack || null, unit: food.unit, why: null, done: false, addedAt: new Date().toISOString() }); }
  else groc.push({ id: uid(), foodId: null, name: text, count: 1, size: null, unit: 'g', why: null, done: false, addedAt: new Date().toISOString() });
  saveGroc(); $('gIn').value = ''; $('gSugg').innerHTML = ''; renderAll();
}

function grocById(el){ const r = el.closest('[data-gid]'); return r && groc.find(g => g.id === r.dataset.gid); }

function grocText(){
  return groc.filter(g => !g.done).map(g => { const f = g.foodId && foods.find(x => x.id === g.foodId);
    return `${f ? foodName(f) : g.name}${f && f.brand && !f.noBrand ? ' (' + f.brand + ')' : ''}${g.size ? ' ' + fmtSize(g.size, g.unit) : ''}${g.count > 1 ? ' ×' + g.count : ''}`; }).join('\n');
}

function runShortcut(){
  const text = grocText(); if(!text){ toast(t('nothingToSend')); return; }
  location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SC_NAME)}&input=text&text=${encodeURIComponent(text)}`;
}

function openShortcutGuide(){ $('scSteps').innerHTML = SC_STEPS[lang === 'el' ? 'el' : 'en'].map(s => `<li>${s}</li>`).join(''); $('scDone').checked = !!ui.scDone; open('ovShortcut'); }

// ---------- cooking ↔ fridge ----------
function fridgeKeyForRef(ref){
  if(!ref) return null;
  if(ref.type === 'my') return foods.some(f => f.id === ref.id) ? { foodId: ref.id } : null;
  if(ref.type === 'gen'){ const f = foods.find(x => x.gid === ref.id); return f ? { foodId: f.id } : null; }
  return null;
}

function autoFridge(f){
  const loc = defaultLoc(f), size = f.usualPack || (f.pieces !== 'none' && (f.piece || f.serving) ? (f.piece || f.serving) * (f.cat === 'eggs' ? 6 : 1) : 100);
  const it = { id: uid(), addedAt: new Date().toISOString(), foodId: f.id, qty: r1(size), packSize: size, unit: f.unit, loc, qtyGuess: !f.usualPack };
  fridge.push(it); saveFridge(); lastAutoFridge = it; return it;
}

// stock badge on My foods cards, e.g. "10/21 slices"
function stockBadge(f){
  const st = stockOf(f.id); if(!(st > 0)) return '';
  const pw = f.pieces !== 'none' ? (f.piece || f.serving) : null;
  let txt;
  if(pw){ const n = Math.round(st / pw), tot = f.usualPack ? Math.round(f.usualPack / pw) : null; txt = tot && n <= tot ? `${n}/${tot} ${WS(f.pieces)}` : `${n} ${WS(f.pieces)}`; }
  else txt = f.usualPack && st <= f.usualPack && Math.abs(st - f.usualPack) > .5 ? `${fmtSize(st, f.unit)} / ${fmtSize(f.usualPack, f.unit)}` : fmtSize(st, f.unit);
  return `<span class="stock">🧊 ${txt}</span>`;
}

function renderFridge(){
  const loc = ui.floc || 'all', q = norm($('fSearch').value);
  setSeg('#fLoc', loc);
  const all = liveItems();
  if(!all.length){ $('fList').innerHTML = `<div class="empty">${t('emptyFridge')}</div>`; return; }
  // 0.7: no dates, no warnings: just what you have, A–Z
  const items = all.filter(x => loc === 'all' || x.it.loc === loc).filter(x => !q || norm(x.info.name).includes(q))
    .sort((a, b) => norm(a.info.name).localeCompare(norm(b.info.name)) || (a.it.addedAt || '').localeCompare(b.it.addedAt || ''));
  if(!items.length){ $('fList').innerHTML = `<div class="empty">${t('nothingHere')}</div>`; return; }
  $('fList').innerHTML = fridgeGroups(items).map(({ it, info, list }) => { const n = list.length;
    const amt = n > 1 ? `<b class="stackn">×${n}</b> · ${fmtSize(r1(it.packSize * n), info.unit)}`
      : it.packSize && Math.abs(it.qty - it.packSize) > 0.5 && it.qty < it.packSize ? t('ofPack', { a: fmtAmt(it.qty, info), b: fmtSize(it.packSize, info.unit) }) : fmtAmt(it.qty, info);
    const full = it.packSize && Math.abs(it.qty - it.packSize) <= 0.5, guess = list.some(x => x.qtyGuess);
    return `<div class="card" data-fid="${it.id}">
      <div class="ficon">${info.icon}</div>
      <div class="body">
        <div class="name">${esc(info.name)}${it.loc === 'freezer' ? ` <button class="frz" type="button" data-tip="frozenTip" aria-label="Frozen">❄️</button>` : ''}${it.mealId ? ` <span class="tag">${t('leftovers')}</span>` : ''}</div>
        <div class="rmeta fmeta">${guess ? '≈ ' : ''}${amt}${guess ? ` · <span class="fixpack">${t('fixPack')}</span>` : ''}</div>
        ${full ? `<div class="frow2"><div class="stackbtns"><button data-minus aria-label="−1">−</button><button data-plus aria-label="+1">＋</button></div></div>` : ''}
      </div>
      <button class="usebtn" data-use>${t('useBtn')}</button></div>`; }).join('');
}

// Fridge: the main button scans a receipt with the camera
function shopCamera(){ if(!settings.geminiKey){ open('ovShop'); toast(t('needKeyFirst')); return; } $('shopFile').value = ''; $('shopFile').click(); }
