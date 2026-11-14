// Fridge and groceries: stock, take-out, shopping in, stacking. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ---------- where things go (0.7: no expiry dates at all; the fridge is just what you have) ----------
function defaultLoc(f){ return 'fridge'; }   // everything starts in the fridge (no cupboard since 0.6.2); Frozen is a switch when adding

// ---------- fridge items ----------
function itemInfo(it){
  if(it.mealId){ const m = meals.find(x => x.id === it.mealId); return m ? { name: m.name, icon: mealIcon(m), unit: 'g', per: m, piece: null, meal: m } : null; }
  const f = foods.find(x => x.id === it.foodId); if(!f) return null;
  return { name: foodName(f), icon: iconOf(f) || '', unit: f.unit, per: f, piece: f.pieces !== 'none' ? (f.piece || f.serving || null) : null, pw: f.pieces, food: f };
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
  $('faTitle').textContent = t('addFridgeHow'); $('faFood').textContent = foodName(food);
  const amt = preset.amt || food.usualPack || (food.piece ? food.piece * (food.cat === 'eggs' ? 6 : 1) : 100);
  $('faAmt').value = r1(amt); $('faCount').value = preset.count || food.usualCount || 1; $('faCount').parentElement.querySelector('span:nth-of-type(2)').classList.remove('hide'); $('faCount').classList.remove('hide');
  fillFA(food, loc); $('faDel').classList.add('hide'); $('faFrozen').checked = loc === 'freezer'; open('ovFAdd');
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
  return `<span class="stock">${svgIcon('fridge', 12, 2.2)}${txt}</span>`;
}

// 0.7.3: one row per food (and per fridge / freezer): tag + name + ⌄ on the left, "300 / 500 g" on the right.
// Tap the row and a small menu drops down under it: ± a pack (or ± grams for loose buys), pack size, the tag, Frozen, Remove.
// Fridge items can carry tag (the state shown, when it differs from the food's) and loose (counted in grams, not packs).
const SHOPF = { open: null };
function shopFKey(it){ return (it.mealId ? 'm' + it.mealId : 'f' + it.foodId) + '|' + (it.loc || 'fridge'); }
function shopFList(key){ return fridge.filter(x => shopFKey(x) === key).sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || '')); }
function shopFPackOf(list){ const p = list.map(x => x.packSize).filter(v => v > 0); return p.length ? p[p.length - 1] : null; }
function shopFTagOf(list, info){ const own = list.map(x => x.tag).filter(Boolean).pop(); return own || (info.food ? info.food.state : 'cooked'); }
function shopFAmt(have, pack, info, loose){
  const u = info.unit, pc = info.piece && info.pw && info.pw !== 'none' ? info.piece : null;
  if(!pack || loose) return pc ? `${Math.round(have / pc * 10) / 10} ${WS(info.pw)}` : fmtSize(have, u);
  const n = Math.max(1, Math.ceil(have / pack - 0.02)), cap = n * pack;
  if(pc) return `${Math.round(have / pc * 10) / 10} / ${Math.round(cap / pc)} ${WS(info.pw)}`;
  const a = fmtSize(r1(have), u), b = fmtSize(r1(cap), u), ua = a.split(' ').pop();
  return ua === b.split(' ').pop() ? `${a.slice(0, -ua.length - 1)} / ${b}` : `${a} / ${b}`;
}

function renderFridge(){
  const loc = ui.floc || 'all', q = norm($('fSearch').value);
  setSeg('#fLoc', loc);
  const all = liveItems();
  if(!all.length){ $('fList').innerHTML = `<div class="empty">${t('emptyFridge')}</div>`; return; }
  const groups = new Map();
  all.filter(x => loc === 'all' || x.it.loc === loc).filter(x => !q || norm(x.info.name).includes(q))
    .forEach(x => { const k = shopFKey(x.it); if(!groups.has(k)) groups.set(k, { key: k, info: x.info, list: [] }); groups.get(k).list.push(x.it); });
  const rows = [...groups.values()].sort((a, b) => norm(bareName(a.info.name)).localeCompare(norm(bareName(b.info.name))) || a.key.localeCompare(b.key));
  if(!rows.length){ $('fList').innerHTML = `<div class="empty">${t('nothingHere')}</div>`; return; }
  $('fList').innerHTML = rows.map(({ key, info, list }) => {
    const have = r1(list.reduce((s, x) => s + (x.qty || 0), 0)), pack = shopFPackOf(list), loose = list.some(x => x.loose) || !pack;
    const tag = shopFTagOf(list, info), frozen = list[0].loc === 'freezer', open_ = SHOPF.open === key, guess = list.some(x => x.qtyGuess);
    const tags = (it => `${stTag(tag)}${frozen ? `<span class="sttag frozen">${t('shopFFrozenTag')}</span>` : ''}${it.mealId ? `<span class="sttag lo">${t('leftovers')}</span>` : ''}`)(list[0]);
    const amt = `${guess ? '≈ ' : ''}${shopFAmt(have, pack, info, loose)}`;
    const st = v => `<button type="button" data-ftag="${v}" class="${tag === v ? 'on' : ''}">${t(v === 'uncooked' ? 'shopFRaw' : v === 'cooked' ? 'shopFCooked' : 'shopFReady')}</button>`;
    const menu = !open_ ? '' : `<div class="fmenu">
      <div class="fmrow"><button type="button" class="fstep" data-fminus aria-label="−">−</button>${loose
        ? `<div class="fgr"><input type="number" inputmode="decimal" step="any" min="0" data-fgr placeholder="0" aria-label="${t('shopFAmount')}"><i>${info.unit === 'ml' ? 'ml' : 'g'}</i></div>`
        : `<button type="button" class="fmode" data-fmode>${t('shopFPack', { s: fmtAmt(pack, info) })}</button>`}<button type="button" class="fstep" data-fplus aria-label="+">+</button></div>
      ${loose && pack ? `<button type="button" class="fmode fmode2" data-fmode>${t('shopFToPacks', { s: fmtSize(pack, info.unit) })}</button>` : ''}
      <div class="fmrow"><span class="fml">${t('shopFPackSize')}</span><div class="fgr"><input type="number" inputmode="decimal" step="any" min="0" data-fpack value="${pack || ''}" placeholder="0" aria-label="${t('shopFPackSize')}"><i>${info.unit === 'ml' ? 'ml' : 'g'}</i></div></div>
      <div class="seg fseg">${st('cooked')}${st('uncooked')}${st('ready')}</div>
      <div class="fmrow"><button type="button" class="ffrz ${frozen ? 'on' : ''}" data-ffrz aria-pressed="${frozen}">${t('frozen')}</button><button type="button" class="frm" data-frm>${t('remove')}</button></div></div>`;
    return `<div class="card fcard ${open_ ? 'open' : ''}" data-fkey="${esc(key)}">
      <button type="button" class="fhead" data-ftog aria-expanded="${open_}"><span class="fnm">${tags}<span class="fnt">${esc(bareName(info.name))}</span>${svgIcon('down', 14, 2.6)}</span><span class="famt">${amt}</span></button>${menu}</div>`;
  }).join('');
}

// the menu's own amounts: oldest first, like eating from the fridge; an emptied row can be undone
function shopFTake(list, amt){
  let left = amt; list.forEach(it => { if(left <= 0) return; const d = Math.min(it.qty, left); it.qty = r1(it.qty - d); left -= d; });
}
function shopFDone(list, key, before, name){
  fridge = fridge.filter(it => it.qty > 0.05); saveFridge();
  const gone = !fridge.some(x => shopFKey(x) === key), fid = list[0] && list[0].foodId;
  const onList = fid && checkRestock(fid);
  if(gone){ SHOPF.open = null; toast(t('deleted', { n: name }) + (onList ? ' ' + t('toList') : ''), t('undo'), () => { fridge = before; saveFridge(); renderAll(); }); }
  else if(onList) toast(t('toList').trim());
  renderAll();
}

function shopFClick(e){
  const row = e.target.closest('[data-fkey]'); if(!row) return;
  const key = row.dataset.fkey, list = shopFList(key); if(!list.length) return;
  const info = itemInfo(list[0]); if(!info) return;
  const name = bareName(info.name), pack = shopFPackOf(list), loose = list.some(x => x.loose) || !pack;
  const before = fridge.map(x => ({ ...x }));
  if(e.target.closest('[data-ftog]')){ SHOPF.open = SHOPF.open === key ? null : key; Phone.haptic(); renderFridge(); return; }
  if(e.target.closest('[data-fmode]')){ if(!pack) return; list.forEach(x => { if(loose) delete x.loose; else x.loose = true; }); saveFridge(); renderFridge(); return; }
  const pm = e.target.closest('[data-fplus],[data-fminus]');
  if(pm){ const plus = pm.hasAttribute('data-fplus'); let amt = pack;
    if(loose){ const box = row.querySelector('[data-fgr]'), v = parseFloat(box && box.value); if(!(v > 0)){ if(box) box.focus(); return; } amt = v; }
    if(plus){ if(loose){ const last = list[list.length - 1]; last.qty = r1(last.qty + amt); saveFridge(); }
      else { const { id, addedAt, qtyGuess, ...rest } = list[list.length - 1]; addToFridge({ ...rest, qty: r1(amt), packSize: r1(amt) }); }
      Phone.haptic(); renderAll(); return; }
    shopFTake(list, amt); Phone.haptic(); shopFDone(list, key, before, name); return; }
  const tg = e.target.closest('[data-ftag]');
  if(tg){ const v = tg.dataset.ftag, own = info.food ? info.food.state : 'cooked'; list.forEach(x => { if(v === own) delete x.tag; else x.tag = v; }); saveFridge(); renderFridge(); return; }
  if(e.target.closest('[data-ffrz]')){ const to = list[0].loc === 'freezer' ? 'fridge' : 'freezer'; list.forEach(x => x.loc = to); SHOPF.open = shopFKey(list[0]); saveFridge(); renderFridge(); return; }
  if(e.target.closest('[data-frm]')){ fridge = fridge.filter(x => !list.includes(x)); SHOPF.open = null; saveFridge(); renderAll();
    toast(t('deleted', { n: name }), t('undo'), () => { fridge = before; saveFridge(); renderAll(); }); }
}

// pack size: saved when the box is left or Enter is pressed; a guessed pack (from a receipt) becomes the real one
function shopFChange(e){
  const box = e.target.closest('[data-fpack]'); if(!box) return;
  const row = box.closest('[data-fkey]'), list = shopFList(row.dataset.fkey), v = r1(parseFloat(box.value)); if(!list.length || !(v > 0)) return;
  list.forEach(x => { if(x.qtyGuess){ x.qty = v; delete x.qtyGuess; } x.packSize = v; });
  if(list[0].foodId) learnPack(list[0].foodId, v);
  saveFridge(); renderAll(); toast(t('updated'));
}

// Fridge: the main button scans a receipt with the camera
function shopCamera(){ if(!settings.geminiKey){ open('ovShop'); toast(t('needKeyFirst')); return; } $('shopFile').value = ''; $('shopFile').click(); }
