// Fridge and groceries: stock, take-out, shopping in, stacking. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ---------- where things go and how long they last (rough defaults, always editable) ----------
function defaultLoc(f){ return 'fridge'; }   // everything starts in the fridge (no cupboard since 0.6.2); ❄️ Frozen is a switch when adding
function defaultDays(f, loc){
  const c = f.cat, s = f.sub;
  if(loc === 'freezer') return ['meat','fish'].includes(c) ? 120 : 90;
  if(loc === 'fridge'){
    if(['chicken','turkey','mince','fishgen','salmon','shrimp','octopus','squid'].includes(s)) return 2;
    if(['beef','pork','lamb','sausage'].includes(s)) return 3;
    if(s === 'coldcuts') return 5; if(s === 'milk' || s === 'juice') return 7; if(s === 'yogurt' || s === 'cream') return 14;
    if(s === 'cheese') return 21; if(s === 'butter') return 30; if(c === 'eggs') return 28; if(c === 'ready') return 3;
    if(c === 'fruit' || c === 'veg') return 7; return 7;
  }
  if(s === 'bread') return 5; if(s === 'banana') return 5; if(['potato','sweetpotato','onion','garlic'].includes(s)) return 21;
  if(c === 'fruit' || c === 'veg') return 7; return 180;
}

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

// take an amount out of the fridge, soonest-expiring first; returns how much was actually there
function takeFromFridge(key, amount){
  let left = amount; const mine = fridge.filter(it => key.foodId ? it.foodId === key.foodId : it.mealId === key.mealId);
  mine
    .sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999'))
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
  FA = { mode: 'new', food, loc, noExp: false };
  $('faTitle').textContent = t('addFridgeHow'); $('faFood').textContent = `${iconOf(food) || '📦'} ${foodName(food)}`;
  const amt = preset.amt || food.usualPack || (food.piece ? food.piece * (food.cat === 'eggs' ? 6 : 1) : 100);
  $('faAmt').value = r1(amt); $('faCount').value = preset.count || 1; $('faCount').parentElement.querySelector('span:nth-of-type(2)').classList.remove('hide'); $('faCount').classList.remove('hide');
  fillFA(food, loc, null); $('faDel').classList.add('hide'); $('faFrozen').checked = loc === 'freezer'; open('ovFAdd');
}

function openFridgeItem(it){
  const info = itemInfo(it); if(!info) return;
  FA = { mode: 'edit', item: it, food: info.food || null, meal: info.meal || null, loc: it.loc, noExp: !it.exp };
  $('faTitle').textContent = info.name; $('faFood').textContent = `${info.icon} ${t(LOC_KEY[it.loc])}`;
  $('faAmt').value = it.qty; $('faCount').value = 1; $('faCount').classList.add('hide'); $('faCount').parentElement.querySelector('span:nth-of-type(2)').classList.add('hide');
  fillFA(info.food || { unit: 'g', cat: 'ready', sub: 'meal', packs: [] }, it.loc, it.exp);
  $('faDel').classList.remove('hide'); $('faFrozen').checked = it.loc === 'freezer'; open('ovFAdd');
}

function fillFA(food, loc, exp){
  const u = food.unit || 'g';
  $('faUnit').textContent = u; $('faMinUnit').textContent = u;
  $('faPacks').innerHTML = [...new Set([...(food.packs || []), food.piece && food.pieces !== 'none' ? food.piece : null].filter(Boolean))]
    .map(p => `<button data-amt="${p}">${p === food.piece && food.pieces !== 'none' && !(food.packs || []).includes(p) ? '1 ' + W(food.pieces) + ' · ' : ''}${fmtSize(p, u)}</button>`).join('');
  setSeg('#faLoc', loc); FA.loc = loc;
  const def = addDays(todayKey(), defaultDays(food, loc));
  $('faExp').value = exp || (FA.mode === 'new' ? def : ''); FA.expAuto = !exp && FA.mode === 'new';
  setNoExp(FA.mode === 'edit' && !exp);
  $('faExpQuick').innerHTML = [3, 7, 14, 30, 90].map(n => `<button data-d="${n}">+${n < 30 ? n + (lang === 'el' ? 'μ' : 'd') : n === 30 ? (lang === 'el' ? '1 μήνας' : '1 month') : (lang === 'el' ? '3 μήνες' : '3 months')}</button>`).join('');
  $('faExpHint').textContent = FA.expAuto ? t('expAuto', { w: t(LOC_KEY[loc]).toLowerCase() }) : '';
  $('faStockBox').classList.toggle('hide', !FA.food);
  if(FA.food){ $('faMin').value = FA.food.minStock || ''; $('faAuto').checked = !FA.food.noAutoGrocery; }
  faHint();
}

// ---------- groceries ----------
function renderGroc(){
  const open_ = groc.filter(g => !g.done), done = groc.filter(g => g.done);
  $('gSendHint').textContent = isIOS ? (ui.scDone ? '' : t('sendHintIos')) : t('sendHintAndroid');
  $('gSend').textContent = isIOS ? t('sendReminders') : '📲 ' + t('share');
  $('gShare').classList.toggle('hide', !isIOS);
  const row = g => { const f = g.foodId && foods.find(x => x.id === g.foodId); const icon = f ? iconOf(f) || '🛒' : '🛒';
    return `<div class="gitem ${g.done ? 'done' : ''}" data-gid="${g.id}">
      <button class="box" data-tick>${g.done ? '✓' : ''}</button><span style="font-size:22px">${icon}</span>
      <div class="gname">${esc(f ? foodName(f) : g.name)}<small>${[g.size ? fmtSize(g.size, g.unit) : '', g.why === 'out' ? t('autoTag') : g.why === 'low' ? t('lowTag') : '', f && f.brand && !f.noBrand ? esc(f.brand) : ''].filter(Boolean).join(' · ')}</small></div>
      ${g.done ? '' : `<div class="qty"><button data-dec>−</button><b>${g.count}</b><button data-inc>＋</button></div>`}
      <button class="irm" data-del>✕</button></div>`; };
  $('gList').innerHTML = open_.length ? open_.map(row).join('') : `<div class="empty">${t('emptyGroc')}</div>`;
  $('gList').style.display = 'flex'; $('gList').style.flexDirection = 'column'; $('gList').style.gap = '8px';
  const linked = done.filter(g => g.foodId && foods.some(f => f.id === g.foodId)).length;
  $('gDone').innerHTML = done.length ? `<h3 class="sect"><span>${t('bought', { n: done.length })}</span><button class="linkbtn" id="gClear">${t('clearBought')}</button></h3>
    <div class="list" style="gap:8px">${done.map(row).join('')}</div>
    ${linked ? `<div class="actions"><button class="btn primary" id="gPutAway">${t('putAway', { n: linked })}</button></div>` : ''}` : '';
}

function addGroc(food, text){
  if(food){ const ex = groc.find(g => g.foodId === food.id && !g.done); if(ex) ex.count++;
    else groc.push({ id: uid(), foodId: food.id, name: foodName(food), count: 1, size: food.usualPack || null, unit: food.unit, why: null, done: false, addedAt: new Date().toISOString() }); }
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
  const it = { id: uid(), addedAt: new Date().toISOString(), foodId: f.id, qty: r1(size), packSize: size, unit: f.unit, loc, exp: addDays(todayKey(), defaultDays(f, loc)), expAuto: true, qtyGuess: !f.usualPack };
  fridge.push(it); saveFridge(); lastAutoFridge = it; return it;
}

// stock badge on My foods cards, e.g. "10/21 slices"
function stockBadge(f){
  const st = stockOf(f.id); if(!(st > 0)) return '';
  const pw = f.pieces !== 'none' ? (f.piece || f.serving) : null;
  let txt;
  if(pw){ const n = Math.round(st / pw), tot = f.usualPack ? Math.round(f.usualPack / pw) : null; txt = tot && n <= tot ? `${n}/${tot} ${WS(f.pieces)}` : `${n} ${WS(f.pieces)}`; }
  else txt = f.usualPack && st <= f.usualPack && Math.abs(st - f.usualPack) > .5 ? `${fmtSize(st, f.unit)} / ${fmtSize(f.usualPack, f.unit)}` : fmtSize(st, f.unit);
  const exp = fridge.filter(x => x.foodId === f.id).some(x => expState(x) === 'soon' || expState(x) === 'gone');
  return `<span class="stock ${exp ? 'warn' : ''}">🧊 ${txt}</span>`;
}

function shopFood(x){
  if(x.ref){ if(x.ref.type === 'my') return foods.find(f => f.id === x.ref.id); if(x.ref.type === 'gen') return saveGeneric(GENBY[x.ref.id]); }
  if(x.protein == null || x.carbs == null || x.fat == null) return null;
  return saveOnlineFood({ name: (lang === 'el' ? x.name_el : x.name_en) || x.name_en || x.name_el, brand: x.brand || '', unit: x.unit, state: x.state, kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat, packs: x.size ? [x.size] : [], usualPack: x.size, source: 'shopping photo' });
}

function drawShop(){
  const n = SHOP.items.filter(x => x.on).length;
  $('shopList').innerHTML = SHOP.items.map((x, i) => { const nm = x.ref ? x.ref.name : (lang === 'el' ? x.name_el : x.name_en) || x.name_en;
    const loc = x.loc || (x.ref ? defaultLoc(x.ref.type === 'gen' ? GENBY[x.ref.id] : (foods.find(f => f.id === x.ref.id) || {})) : 'fridge');
    const ok = x.ref || x.protein != null;
    return `<div class="shoprow ${x.on ? '' : 'off'}" data-si="${i}"><button class="box" data-son>${x.on ? '✓' : ''}</button>
      <div class="sname" data-sname><b>${esc(nm)}</b><small>${x.ref ? '' : ok ? `<span class="sttag">${t('shopNew')}</span> ` : `⚠️ ${t('shopPick')}`}${x.brand ? esc(x.brand) : ''}</small></div>
      <div class="sqty"><input data-scount inputmode="numeric" value="${x.count}"><span>×</span><input data-ssize inputmode="decimal" value="${x.size || ''}" placeholder="${x.unit}"><small>${x.unit}</small></div>
      <button class="sloc" data-sloc>${LOC_IC[loc]}</button></div>`; }).join('');
  $('shopAddBtn').textContent = t('shopAdd', { n }); $('shopAddBtn').disabled = !n;
}

function renderFridge(){
  const loc = ui.floc || 'all', q = norm($('fSearch').value);
  setSeg('#fLoc', loc);
  const gone = expiredList(), soon = expiringList(), uniq = l => [...new Set(l.map(x => x.info.name))].join(', ');
  $('fAlerts').innerHTML = (gone.length ? `<div class="alert red">${t('alertGone', { n: new Set(gone.map(x => x.info.name)).size, list: esc(uniq(gone)) })}</div>` : '') +
    (soon.length ? `<div class="alert" data-cookup>${t('alertExp', { n: new Set(soon.map(x => x.info.name)).size, list: esc(uniq(soon)) })} →</div>` : '');
  const all = liveItems();
  if(!all.length){ $('fList').innerHTML = `<div class="empty">${t('emptyFridge')}</div>`; return; }
  const items = all.filter(x => loc === 'all' || x.it.loc === loc).filter(x => !q || norm(x.info.name).includes(q))
    .sort((a, b) => (a.it.exp || '9999').localeCompare(b.it.exp || '9999') || norm(a.info.name).localeCompare(norm(b.info.name)));
  if(!items.length){ $('fList').innerHTML = `<div class="empty">${t('nothingHere')}</div>`; return; }
  $('fList').innerHTML = fridgeGroups(items).map(({ it, info, list }) => { const st = expState(it), n = list.length;
    const amt = n > 1 ? `<b class="stackn">×${n}</b> · ${fmtSize(r1(it.packSize * n), info.unit)}`
      : it.packSize && Math.abs(it.qty - it.packSize) > 0.5 && it.qty < it.packSize ? t('ofPack', { a: fmtAmt(it.qty, info), b: fmtSize(it.packSize, info.unit) }) : fmtAmt(it.qty, info);
    const full = it.packSize && Math.abs(it.qty - it.packSize) <= 0.5;
    return `<div class="card ${st === 'gone' ? 'bad' : st === 'soon' ? 'warn' : ''}" data-fid="${it.id}">
      <div class="ficon">${info.icon}</div>
      <div class="body">
        <div class="name">${esc(info.name)}${it.loc === 'freezer' ? ` <button class="frz" type="button" data-tip="frozenTip" aria-label="Frozen">❄️</button>` : ''}${it.mealId ? ` <span class="tag">${t('leftovers')}</span>` : ''}</div>
        <div class="rmeta fmeta">${amt}</div>
        <div class="frow2">${expBadge(it)}${full ? `<div class="stackbtns"><button data-minus aria-label="−1">−</button><button data-plus aria-label="+1">＋</button></div>` : ''}</div>
      </div>
      <button class="usebtn" data-use>${t('useBtn')}</button></div>`; }).join('');
}

// Fridge: the main button scans a receipt with the camera
function shopCamera(){ if(!settings.geminiKey){ open('ovShop'); toast(t('needKeyFirst')); return; } SHOP.kind = 'camera'; $('shopFile').value = ''; $('shopFile').click(); }
