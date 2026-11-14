// Food Track: food list, food form, barcode, ingredient search, cook a meal, meals. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function portion(f){
  const pw = f.pieces && f.pieces !== 'none' ? (f.piece || f.serving || null) : null;
  const pack = f.usualPack || null;
  let mode = f.display || 'auto';
  if(mode === 'auto') mode = pw ? 'piece' : (pack && pack <= SMALL_PACK ? 'pack' : '100');
  if(mode === 'piece' && !pw) mode = pack ? 'pack' : '100';
  if(mode === 'pack' && !pack) mode = '100';
  if(mode === 'piece') return { mode, amt: pw, label: t('perWLabel', { w: W(f.pieces) }), size: `${f.piece ? '' : '≈'}${fmtSize(pw, f.unit)}` };
  if(mode === 'pack') return { mode, amt: pack, label: t('perPackLabel'), size: fmtSize(pack, f.unit) };
  return { mode, amt: 100, label: t('per100Label', { u: f.unit }), size: '' };
}

function renderAll(){ render(); renderMeals(); renderSupps(); renderToday(); renderFridge(); renderGroc(); renderGym(); renderTodayRec();
  const fab = $('fab'); if(fab.dataset.action === 'gym') { if(active) fab.textContent = t('resume', { m: Math.floor(sesMs() / 60000) }); else fab.innerHTML = fabBtn('play', t('startWk')); }
  syncFab2(); }

// the second floating button (0.6.9): the same pair on Food Tracker and Fridge — scan first (line scanner icon), then ＋ Add Food
function syncFab2(){ const a = $('fab').dataset.action, hid = $('fab').classList.contains('hide'), on = (a === 'store' || a === 'fridge') && !hid;
  $('fab2').classList.toggle('hide', !on); document.body.classList.toggle('twofab', on);
  const scan = l => `<span class="fabic">${svgIcon('scan', 18)}</span>${esc(l)}`;
  if(on && a === 'fridge'){ $('fab2').innerHTML = scan(t('scanReceipt')); $('fab').textContent = t('addFridgeFab'); } else $('fab2').innerHTML = scan(t('scanFoodFab')); }

// ======================= store-bought list =======================
const FCAT = {};   // open categories in My foods
function render(){
  const q = norm($('search').value);
  const counts = {}; foods.forEach(f => { const k = f.cat || 'none'; counts[k] = (counts[k]||0) + 1; });
  ui.cat = 'all';   // 0.6.1: categories are drop-downs now, no chips
  const chips = [`<button class="fchip ${ui.cat==='all'?'on':''}" data-c="all">${t('all')} ${foods.length||''}</button>`]
    .concat(CATS.filter(c => counts[c.id]).map(c => `<button class="fchip ${ui.cat===c.id?'on':''}" data-c="${c.id}">${esc(L(c))} ${counts[c.id]}</button>`))
    .concat(counts.none ? [`<button class="fchip ${ui.cat==='none'?'on':''}" data-c="none">${t('noType')} ${counts.none}</button>`] : []);
  $('catChips').innerHTML = '';
  $('sortBtn').innerHTML = foods.length ? t(ui.sort === 'recent' ? 'sortRecent' : 'sortAZ') : '';
  const tokens = q.split(' ').filter(Boolean);
  const items = foods
    .filter(f => ui.cat === 'all' || (f.cat || 'none') === ui.cat)
    .filter(f => !tokens.length || Search.matches(q, f))
    .sort(ui.sort === 'recent' ? (a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||'') : (a,b) => norm(foodName(a)).localeCompare(norm(foodName(b))) || norm(a.brand).localeCompare(norm(b.brand)));
  $('count').textContent = foods.length ? (items.length === 1 ? t('nFood') : t('nFoods', { n: items.length })) : '';
  if(!foods.length){ $('list').innerHTML = `<div class="empty">${t('noFoods')}</div>`; return; }
  if(!items.length){ $('list').innerHTML = `<div class="empty">${q ? t('nothingMatches', { q: esc($('search').value) }) : t('nothingHere')}</div>`; return; }
  const cardOf = f => {
    const pt = portion(f), x = pt.amt / 100;
    const sc = v => (v === null || v === undefined || isNaN(v)) ? null : v * x;
    return `<div class="card" data-id="${f.id}" style="position:relative">
      <div class="body">
        <div class="row"><div class="brand">${esc(f.noBrand ? t('noBrand') : (f.brand || '—'))}</div><div class="kcalcol"><div class="kcal">${f.kcal == null ? '–' : Math.round(f.kcal * x)} <small>kcal</small></div>${stockBadge(f)}</div></div>
        <div class="name">${esc(foodName(f))}${f.checked ? ` <span class="fchk" title="${t('chkTick')}" aria-label="${t('chkTick')}">${svgIcon('check', 10, 3.4)}</span>` : ''}</div>
        <div class="row" style="margin-top:2px">
          <div class="macros"><span class="m p">P <b>${fmt(sc(f.protein))}</b></span><span class="m c">C <b>${fmt(sc(f.carbs))}</b></span><span class="m f">F <b>${fmt(sc(f.fat))}</b></span>${f.fiber != null ? `<span class="m fi">Fi <b>${fmt(sc(f.fiber))}</b></span>` : ''}</div>
          <span class="chip ${f.state==='uncooked'?'raw':f.state==='cooked'?'cooked':''}">${pt.label}${pt.size ? ' · ' + pt.size : ''}${f.state !== 'ready' ? ' · ' + t(STATE_KEY[f.state]).toLowerCase() : ''}</span>
        </div>
      </div></div>`;
  };
  // 0.6.1: no search = categories as drop-downs; searching shows the matches straight away
  if(tokens.length){ $('list').innerHTML = items.map(cardOf).join(''); return; }
  const groups = {}; items.forEach(f => (groups[f.cat || 'none'] = groups[f.cat || 'none'] || []).push(f));
  const order = [...CATS.map(c => c.id).filter(id => groups[id]), ...(groups.none ? ['none'] : [])];
  const allOpen = !!FCAT.__all;   // 0.6.5.1: everything sits inside one All Foods fold
  $('list').innerHTML = `<button class="foldh catfold allfold ${allOpen ? 'open' : ''}" data-fcat="__all"><b>${t('allFoods')}</b><span class="fn">${items.length}</span><i>${svgIcon('down', 18)}</i></button>` + (!allOpen ? '' : '<div class="foldb allbody">' + order.map(id => { const c = CATS.find(x => x.id === id), op = !!FCAT[id];
    return `<button class="foldh catfold ${op ? 'open' : ''}" data-fcat="${id}"><b>${c ? esc(L(c)) : t('noType')}</b><span class="fn">${groups[id].length}</span><i>${svgIcon('down', 18)}</i></button>` +
      (op ? `<div class="foldb catbody">${groups[id].map(cardOf).join('')}</div>` : ''); }).join('') + '</div>');

}

// ======================= type picker =======================
function mountPicker(el, current, onPick){
  let showCat = current && current.cat ? current.cat : null;
  const draw = () => {
    if(!showCat){
      el.innerHTML = `<div class="pgrid">${CATS.map(c => `<button class="pitem ${current&&current.cat===c.id?'on':''}" data-c="${c.id}">${esc(L(c))}</button>`).join('')}</div>`;
    } else {
      const c = CAT[showCat];
      el.innerHTML = `<button class="pback" data-back>${svgIcon('back', 20, 2.4)}${t('allCats')}</button><div class="pgrid">${c.subs.map(s =>
        `<button class="pitem ${current&&current.cat===c.id&&current.sub===s.id?'on':''}" data-s="${s.id}">${s.id==='general' ? `${t('general')} · ${esc(L(c))}` : esc(L(s))}</button>`).join('')}</div>`;
    }
  };
  el.onclick = e => {
    if(e.target.closest('[data-back]')){ showCat = null; draw(); return; }
    const ci = e.target.closest('[data-c]'); if(ci){ showCat = ci.dataset.c; if(CAT[showCat].subs.length === 1){ current = { cat:showCat, sub:'general' }; onPick(current); } draw(); return; }
    const si = e.target.closest('[data-s]'); if(si){ current = { cat:showCat, sub:si.dataset.s }; draw(); onPick(current); }
  };
  draw();
}

function num(id){ const v = $(id).value.trim().replace(',', '.'); return v === '' ? null : Number(v); }

function setState(v){ F.state = v; setSeg('#fState', v); }

function setUnit(v){ F.unit = v; setSeg('#fUnit', v); $('per100').textContent = t('per100', { u: v }); $('packUnit').textContent = v;
  document.querySelector('#fDisplay [data-v="100"]').textContent = t('per100', { u: v }); setPieces(F.pieces); drawPacks(); }

function setPieces(v){
  F.pieces = v; setSeg('#fPieces', v);
  $('pieceBox').classList.toggle('hide', v === 'none');
  $('pieceLbl').textContent = t('oneWeighs', { w: W(v), u: F.unit });
  $('countLbl').textContent = t('orCount', { ws: WS(v) });
  const pb = document.querySelector('#fDisplay [data-v="piece"]');
  pb.textContent = t('perW', { w: W(v) }); pb.classList.toggle('hide', v === 'none');
  if(v === 'none' && F.display === 'piece') setDisplay('auto');
  pieceHint(); updatePreview();
}

function setDisplay(v){ F.display = v; setSeg('#fDisplay', v); updatePreview(); }

function pieceHint(){
  const pw = num('fPiece'), el = $('pieceHint');
  if(pw) el.textContent = t('everyCounts', { w: W(F.pieces), s: fmtSize(pw, F.unit) });
  else if(F.serving) el.textContent = t('usingEst', { s: fmtSize(F.serving, F.unit) });
  else el.textContent = t('weighOrCount', { w: W(F.pieces) });
}

function setType(cat, sub, guessed){
  F.cat = cat; F.sub = sub;
  const s = subOf(cat, sub);
  $('typeBtn').classList.toggle('missing', !cat);
  $('typeBtn').innerHTML = cat
    ? `<span>${esc(typeLabel(cat, sub))}<small>${guessed ? t('guessed') : t('tapChange')}</small></span>`
    : `<span>${t('chooseType')}<small>${t('chooseTypeSub')}</small></span>`;
  if(cat && !F.unitTouched && !F.editingId && s.opt.ml) setUnit('ml');
  if(cat && !F.piecesTouched) setPieces(guessPieces(cat, sub, $('fName').value));
}

function setNoBrand(on){ F.noBrand = on; $('noBrandBtn').classList.toggle('on', on); $('fBrand').disabled = on; if(on) $('fBrand').value = ''; }

function drawPacks(){
  F.packs.sort((a,b) => a-b);
  $('packList').innerHTML = F.packs.map(p => `<span class="pack ${F.usual===p?'usual':''}">${fmtSize(p, F.unit)}
     <button class="star" data-star="${p}" aria-label="${t('packStarA')}">${svgIcon(F.usual===p ? 'starOn' : 'star', 18)}</button><button data-rm="${p}" aria-label="${t('delete')}">${svgIcon('x', 16)}</button></span>`).join('');
  updatePreview();
}

function addPack(){
  const v = num('packIn'); if(!v || v <= 0){ toast(t('typePack')); return; }
  if(!F.packs.includes(v)) F.packs.push(v);
  if(F.usual === null) F.usual = v;
  $('packIn').value = ''; drawPacks();
  if(num('fCount')) $('fCount').dispatchEvent(new Event('input'));
}

function updatePreview(){
  const pt = portion({ pieces:F.pieces, piece:num('fPiece'), serving:F.serving, usualPack:F.usual, display:F.display, unit:F.unit });
  const auto = F.display === 'auto', x = `${pt.label}${pt.size ? ' (' + pt.size + ')' : ''}`;
  $('displayHint').textContent = auto
    ? t('autoPicks', { x }) + (pt.mode === 'piece' ? t('becausePieces', { ws: WS(F.pieces) }) : pt.mode === 'pack' ? t('becauseSmall', { n: SMALL_PACK, u: F.unit }) : t('becauseBig'))
    : t('showing', { x }) + '.';
  const p = num('fP'), c = num('fC'), f = num('fF'); let k = num('fKcal');
  const el = $('packPreview');
  if(p===null || c===null || f===null){ el.classList.remove('show'); return; }
  if(k===null) k = p*4 + c*4 + f*9;
  const line = (amt, label) => { const m = amt/100; return `${label}: <b>${Math.round(k*m)} kcal</b> · P ${r1(p*m)} · C ${r1(c*m)} · F ${r1(f*m)}`; };
  const parts = [];
  const pw = F.pieces !== 'none' ? (num('fPiece') || F.serving) : null;
  if(pw) parts.push(line(pw, `${t('onePiece', { w: W(F.pieces) })} (${num('fPiece') ? '' : '≈'}${fmtSize(pw, F.unit)})`));
  if(F.usual) parts.push(line(F.usual, `${t('wholePack')} (${fmtSize(F.usual, F.unit)})`));
  el.innerHTML = parts.join('<br>'); el.classList.toggle('show', parts.length > 0);
}

function openForm(data, sourceNote, mode, opts){
  opts = opts || {};
  data = normFood(data || {});
  F.editingId = mode === 'edit' ? data.id : null;
  F.fromScan = !!opts.fromScan; F.onSaved = opts.onSaved || null;
  F.stateTouched = mode === 'edit';
  F.unitTouched = mode === 'edit' || !!data.unitFromLabel || !!data.gid;
  F.typeTouched = !!data.cat && (mode === 'edit' || !!data.gid);
  F.piecesTouched = mode === 'edit' || !!data.gid;
  F.source = data.source || (sourceNote ? sourceNote : 'manual');
  F.gid = data.gid || null;
  F.packs = [...data.packs]; F.usual = data.usualPack ?? (F.packs[0] ?? null);
  F.serving = data.serving > 0 ? Number(data.serving) : null;
  F.pieceSkipped = !!data.pieceSkipped;
  F.pieces = data.pieces; F.display = data.display;
  $('fPiece').value = data.piece > 0 ? data.piece : ''; $('fCount').value = '';
  $('formTitle').textContent = mode === 'edit' ? t('editFood') : t('newFood');
  $('formSub').textContent = mode === 'edit' ? t('changeAny') : t('checkLabel');
  $('fBrand').value = data.brand || ''; $('fName').value = data.gid ? foodName(data) : (data.name || '');
  $('fCode').value = data.barcode || ''; $('fNotes').value = data.notes || ''; $('packIn').value = '';
  for(const [k,id] of Object.entries(NUM)) $(id).value = (data[k] ?? '') === '' ? '' : data[k];
  setNoBrand(!!data.noBrand);
  setUnit(data.unit || 'g');
  setState(mode === 'edit' || data.state !== 'ready' ? data.state : guessState(data.name || ''));
  if(data.cat) setType(data.cat, data.sub || 'general', false);
  else { const g = guessType(`${data.name||''} ${data.hint||''}`); g ? setType(g.cat, g.sub, true) : setType(null, null); }
  if(F.piecesTouched) setPieces(data.pieces); else if(!F.cat) setPieces('none');
  setDisplay(data.display || 'auto');
  $('fSource').textContent = sourceNote ? t('filledFrom', { s: sourceNote }) : (mode==='edit' && data.updatedAt ? t('lastUpdated', { d: fmtDate(data.updatedAt) }) : '');
  $('delBtn').classList.toggle('hide', mode !== 'edit');
  $('dupBtn').classList.toggle('hide', mode !== 'edit');
  $('brandList').innerHTML = [...new Set(foods.map(f => f.brand).filter(Boolean))].sort().map(b => `<option value="${esc(b)}">`).join('');
  checkKcal(); drawPacks();
  open('ovForm');
  if(mode !== 'edit' && !data.name) setTimeout(() => $('fName').focus(), 150);
  const adv = ['fSug', 'fSat', 'fSalt', 'fK'].some(id => $(id).value !== ''); $('fAdvSw').checked = adv; $('fAdv').classList.toggle('hide', !adv);
}

function checkKcal(){
  const k = num('fKcal'), p = num('fP'), c = num('fC'), f = num('fF'), el = $('kcalCheck');
  el.onclick = null; el.classList.remove('warn','click');
  if(p===null || c===null || f===null){ el.textContent=''; updatePreview(); return; }
  const est = p*4 + c*4 + f*9;
  if(k === null){ el.textContent = t('noKcal', { n: Math.round(est) }); el.classList.add('click'); el.onclick = () => { $('fKcal').value = Math.round(est); checkKcal(); }; }
  else if(Math.abs(k - est) / Math.max(k,1) > 0.15 && Math.abs(k-est) > 20){ el.textContent = t('kcalWarn', { n: Math.round(est), k }); el.classList.add('warn'); }
  else el.textContent = t('kcalOk', { n: Math.round(est) });
  updatePreview();
}

function readForm(){
  const vals = {}; for(const [k,id] of Object.entries(NUM)) vals[k] = num(id);
  return { name: $('fName').value.trim(), brand: F.noBrand ? '' : $('fBrand').value.trim(), vals };
}

function checkMissing(){
  const brandOk = !M.needBrand || M.brandMode === 'none' || (M.brandMode === 'add' && $('mBrand').value.trim());
  $('mSave').disabled = !(brandOk && (!M.needType || !!M.cat));
}

function setPcMode(m){ PC.mode = m; setSeg('#pcSeg', m); $('pcWeigh').classList.toggle('hide', m !== 'weigh'); $('pcCount').classList.toggle('hide', m !== 'count'); pcCheck(); }

function pcValue(){ if(PC.mode === 'weigh') return num('pcG') > 0 ? num('pcG') : null; const n = num('pcN'), p = num('pcPack'); return n > 0 && p > 0 ? r1(p / n) : null; }

function pcCheck(){
  const v = pcValue(), el = $('pcRes');
  $('pcSave').disabled = !v;
  if(v){
    const k = num('fKcal') ?? (num('fP')*4 + num('fC')*4 + num('fF')*9), m = v/100;
    el.innerHTML = (PC.mode === 'count' ? t('eachIs', { a: fmtSize(num('pcPack'), F.unit), n: num('pcN'), s: fmtSize(v, F.unit) }) + '<br>' : '') +
      `${t('onePiece', { w: W(F.pieces) })}: <b>${Math.round(k*m)} kcal</b> · P ${r1(num('fP')*m)} · C ${r1(num('fC')*m)} · F ${r1(num('fF')*m)}`;
    el.classList.add('show');
  } else el.classList.remove('show');
}

async function commit(){
  const { name, brand, vals } = readForm();
  if(vals.kcal === null) vals.kcal = Math.round(vals.protein*4 + vals.carbs*4 + vals.fat*9);
  const code = $('fCode').value.replace(/\D/g,'');
  const others = foods.filter(f => f.id !== F.editingId);
  const sameCode = code && others.find(f => f.barcode === code);
  if(sameCode && !(await ask(t('sameCode', { n: foodName(sameCode) })))) return;
  const sameName = !sameCode && others.find(f => norm(foodName(f)) === norm(name) && norm(f.brand) === norm(brand));
  if(sameName && !(await ask(t('sameName', { n: (brand ? brand + ' ' : '') + name })))) return;
  const now = new Date().toISOString();
  const rec = { brand, noBrand: F.noBrand, name, gid: F.gid, barcode: code || null, cat: F.cat, sub: F.sub || 'general', state: F.state, unit: F.unit,
    packs: [...F.packs], usualPack: F.usual, pieces: F.pieces, piece: F.pieces !== 'none' ? num('fPiece') : null,
    pieceSkipped: F.pieceSkipped, display: F.display, serving: F.serving,
    notes: $('fNotes').value.trim(), source: F.source, ...vals, checked: null, updatedAt: now };   // editing a food takes its ✓ (Check My Foods) away
  const wasEdit = !!F.editingId; let saved;
  if(wasEdit){ const i = foods.findIndex(f => f.id === F.editingId); foods[i] = saved = { ...foods[i], ...rec }; }
  else foods.push(saved = { id: uid(), createdAt: now, ...rec });
  if(!saveFoods()) return;
  close('ovForm'); if(ui.cat !== 'all' && ui.cat !== F.cat) ui.cat = 'all'; renderAll();
  lastAutoFridge = null; if(!wasEdit && !F.onSaved && !scanCtx){ autoFridge(saved); renderAll(); }
  if(F.onSaved){ const cb = F.onSaved; F.onSaved = null; cb(saved); return; }
  if(!wasEdit && scanCtx){ const c = scanCtx; scanCtx = null;
    if(c === 'fridge') return openFridgeAdd(saved);
    if(c === 'log') return openAmt({ mode: 'log', info: { name: foodName(saved), icon: iconOf(saved) || '', unit: saved.unit, per: saved, food: saved, piece: saved.pieces !== 'none' ? (saved.piece || saved.serving || null) : null, pw: saved.pieces } }); }
  if(wasEdit) toast(t('updated'));
  else if(F.fromScan) toast(lastAutoFridge ? t('inFridgeToo', { i: '' }) : t('saved', { i: '' }), t('scanNext'), () => startScan());
  else if(lastAutoFridge){ const it = lastAutoFridge; toast(t('inFridgeToo', { i: '' }), t('notInFridge'), () => { fridge = fridge.filter(x => x.id !== it.id); saveFridge(); renderAll(); }); }
  else toast(t('saved', { i: '' }));
}

function validGTIN(c){
  if(!/^\d{8}$|^\d{12,14}$/.test(c)) return /^\d{6,}$/.test(c);
  const d = c.split('').map(Number), check = d.pop();
  const sum = d.reverse().reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check;
}

async function startScan(ctx){
  scanCtx = ctx || null; $('cantScan').classList.add('hide'); $('cantScanBtn').classList.remove('open');
  if(scanCtx === 'fridge') shopScanStart(); else { SHOP.scan = null; scanUI(); }   // 0.7: fridge scanning keeps going and collects a list
  open('ovScan'); status($('scanStatus'), t('startingCam')); $('manualCode').value = '';
  $('torchBtn').classList.add('hide'); torchOn = false;
  if(!Phone.hasCamera()){ status($('scanStatus'), t('camFail'), true); return; }
  try{
    const [det, s] = await Promise.all([Phone.barcodeReader(), Phone.camera()]);
    if(!$('ovScan').classList.contains('open')){ s.getTracks().forEach(tr => tr.stop()); return; }
    stream = s; const v = $('video'); v.srcObject = s; await v.play().catch(()=>{});
    const track = s.getVideoTracks()[0], caps = track.getCapabilities ? track.getCapabilities() : {};
    try{ if(caps.focusMode && caps.focusMode.includes('continuous')) await track.applyConstraints({ advanced:[{ focusMode:'continuous' }] }); }catch(e){}
    if(caps.torch) $('torchBtn').classList.remove('hide');
    status($('scanStatus'), '');
    scanOn = true; let last = null;
    const tick = async () => {
      if(!scanOn) return;
      try{
        if(v.readyState >= 2){
          const res = await det.detect(v);
          const hit = res.map(r => r.rawValue).find(c => validGTIN(c));
          if(scanCtx === 'fridge' && SHOP.scan) shopSeen(hit || null);   // fridge: every pack counts, the camera stays on
          else if(hit){ if(hit === last){ scanOn = false; Phone.vibrate(60); stopScan(); lookup(hit); return; } last = hit; }
        }
      }catch(e){}
      scanLoop = setTimeout(tick, 90);
    };
    tick();
  }catch(e){
    status($('scanStatus'), e && e.name === 'NotAllowedError' ? t('camBlocked') : location.protocol !== 'https:' ? t('camHttps') : t('camFail'), true);
  }
}

function stopScan(){ scanOn = false; clearTimeout(scanLoop); if(stream){ stream.getTracks().forEach(tr => tr.stop()); stream = null; } const v = $('video'); if(v) v.srcObject = null; }

function parseQty(p){
  let n = Number(p.product_quantity), u = String(p.product_quantity_unit || '').toLowerCase();
  if(!(n > 0)){
    const m = String(p.quantity || '').toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|l|lt|ml|cl)\b/);
    if(!m) return null; n = Number(m[1]); u = m[2];
    if(u === 'kg'){ n *= 1000; u = 'g'; } if(u === 'l' || u === 'lt'){ n *= 1000; u = 'ml'; } if(u === 'cl'){ n *= 10; u = 'ml'; } if(u === 'gr') u = 'g';
  }
  return (u === 'g' || u === 'ml') ? { size: Math.round(n), unit: u } : null;
}

function offToFood(p, code){
  const n = p.nutriments || {};
  const g = k => { const v = n[k + '_100g']; return (v === undefined || v === '' || v === null) ? null : r1(Number(v)); };
  let kcal = g('energy-kcal'); if(kcal === null && n['energy_100g'] != null) kcal = Math.round(Number(n['energy_100g']) / 4.184);
  const q = parseQty(p);
  return {
    barcode: code || p.code || null, brand: (p.brands || '').split(',')[0].trim(),
    name: (lang === 'el' ? p.product_name_el : p.product_name_en) || p.product_name || p.product_name_el || p.product_name_en || p.generic_name || '',
    hint: (p.categories_tags || []).slice(-3).map(x => x.replace(/^\w\w:/,'').replace(/-/g,' ')).join(' '),
    kcal, protein: g('proteins'), carbs: g('carbohydrates'), fat: g('fat'),
    fiber: g('fiber'), sugar: g('sugars'), satFat: g('saturated-fat'), salt: g('salt'), potassium: n['potassium_100g'] != null ? Math.round(Number(n['potassium_100g']) * 1000) : null,
    serving: p.serving_quantity ? Number(p.serving_quantity) : null,
    unit: q ? q.unit : undefined, unitFromLabel: !!q, packs: q ? [q.size] : [], usualPack: q ? q.size : null, source: 'openfoodfacts'
  };
}

async function lookup(code){
  open('ovScan'); status($('scanStatus'), t('lookingUp', { c: code }));
  const existing = foods.find(f => f.barcode === code);
  if(existing){ close('ovScan');
    if(scanCtx === 'fridge'){ scanCtx = null; openFridgeAdd(existing); return; }
    if(scanCtx === 'log'){ scanCtx = null; openAmt({ mode: 'log', info: { name: foodName(existing), icon: iconOf(existing) || '', unit: existing.unit, per: existing, food: existing, piece: existing.pieces !== 'none' ? (existing.piece || existing.serving || null) : null, pw: existing.pieces } }); return; }
    toast(t('alreadyHave')); openForm(existing, null, 'edit'); return; }
  try{
    const r = await fetchT(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, {}, 9000);
    const j = await r.json();
    if(j.status !== 1 || !j.product) return notFound(code, t('notInOFF'));
    const data = offToFood(j.product, code);
    if(data.protein === null && data.carbs === null && data.fat === null) return notFound(code, t('noMacros'));
    if(scanCtx === 'log'){ scanCtx = null; close('ovScan'); const f = saveOnlineFood({ ...data, source: 'openfoodfacts' }); renderAll(); openAmt({ mode: 'log', info: fInfo_(f) }); toast(t('scanSaved')); return; }
    close('ovScan'); openForm(data, 'Open Food Facts', 'new', { fromScan: true });
  }catch(e){ notFound(code, t('lookupFail')); }
}

function notFound(code, why){
  close('ovScan'); open('ovAdd'); pendingBarcode = code;
  status($('addStatus'), t('notFoundMsg', { c: code, why }), true);
}


// ======================= ingredient search =======================
// Order: your own foods → the standard list (works in Greek and English) → Open Food Facts online
// names are checked in both Greek and English, so "κοτόπουλο στήθος" and "chicken breast" land on the same food
function openIngSearch(prefill, cb, opts){
  opts = opts || {};
  ING = { cb, online:[], onlineQ:'', timer:null, force: !!opts.force };
  let sb = $('iScanBtn');
  if(!sb){ sb = document.createElement('button'); sb.id = 'iScanBtn'; sb.className = 'btn iscanbtn';
    $('iSearch').closest('.logfX').before(sb); sb.addEventListener('click', () => { const c = sb.dataset.ctx; close('ovIng'); startScan(c); }); }
  sb.innerHTML = svgIcon('scan', 18) + `<span>${esc(t('scanTitle'))}</span>`; sb.dataset.ctx = opts.scanBtn || ''; sb.classList.toggle('hide', !opts.scanBtn);
  $('iSearch').value = prefill || ''; status($('iStatus'), ''); $('iSaveMy').checked = true;
  drawIngResults(); open('ovIng'); setTimeout(() => $('iSearch').focus(), 120);
}

function itemHtml(kind, i, icon, title, subline){ return `<button class="sitem" data-k="${kind}" data-i="${i}"><span class="t"><b>${esc(title)}</b><small>${subline}</small></span></button>`; }

function drawIngResults(){
  const text = $('iSearch').value.trim();
  if(!text){ $('iResults').innerHTML = `<div class="hint">${t('typeToSearch')}</div>`; $('iSaveWrap').classList.add('hide'); return; }
  lastLocal = searchLocal(text);
  let h = '';
  if(lastLocal.mine.length) h += `<div class="sgroup">${t('grpMine')}</div>` + lastLocal.mine.map((f,i) => itemHtml('m', i, '', foodName(f), `${f.noBrand ? '' : esc(f.brand) + ' · '}${macroLine(f)}`)).join('');
  if(lastLocal.std.length) h += `<div class="sgroup">${t('grpStd')}</div>` + lastLocal.std.map((g,i) => itemHtml('s', i, '', L(g), `${macroLine(g)} · ${t('stdValues')}`)).join('');
  if(ING.online.length && ING.onlineQ === text) h += `<div class="sgroup">${t('grpOnline')}</div>` + ING.online.map((d,i) => itemHtml('o', i, '', d.name, `${esc(d.brand || '')}${d.brand ? ' · ' : ''}${macroLine(d)}`)).join('');
  else h += `<button class="btn" id="iOnline" style="width:100%;margin-top:12px">${t('searchOnline', { q: esc(text) })}</button>`;
  $('iResults').innerHTML = h;
  $('iSaveWrap').classList.toggle('hide', ING.force || !(lastLocal.std.length || ING.online.length));
}

async function runOnline(text){
  status($('iStatus'), t('searching'));
  try{ const res = await searchOnline(text); if($('iSearch').value.trim() !== text) return;
    ING.online = res; ING.onlineQ = text; status($('iStatus'), res.length ? '' : t('onlineNone'), !res.length); drawIngResults(); }
  catch(e){ status($('iStatus'), t('onlineFail'), true); }
}

function pickIng(ref){ close('ovIng'); ING.cb && ING.cb(ref); }

function recipeHtml(r, compact){
  return `<div class="recipe"><b>${esc(r.title || t('recipeT'))}</b>
    <div class="rmeta">${[r.own ? t('ownTag') : '', r.servings ? t('serves', { n: r.servings }) : '', r.minutes ? t('minutes', { n: r.minutes }) : ''].filter(Boolean).join(' · ')}</div>
    ${compact ? '' : `<ul>${(r.ingredients || []).map(i => `<li>${esc(i.name)}${Number(i.grams) > 0 ? ` — ${r1(Number(i.grams))} g` : ''}${i.note ? ` (${esc(i.note)})` : ''}</li>`).join('')}</ul>`}
    <div class="sgroup">${t('steps')}</div><ol>${(r.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`;
}

function calcMeal(){
  const tot = mealTotals(D.rows);
  $('cTotals').innerHTML = `<span>${t('rawTotal')}: <b>${fmtSize(tot.raw, 'g')}</b></span><span><b>${Math.round(tot.kcal)}</b> kcal · P ${Math.round(tot.protein)} · C ${Math.round(tot.carbs)} · F ${Math.round(tot.fat)}</span>`;
  const w = num('cCooked'), el = $('cResult');
  if(!tot.raw){ el.innerHTML = ''; el.classList.remove('show'); return; }
  el.classList.add('show');
  const base = w > 0 ? w : tot.raw, m = 100 / base;
  el.innerHTML = (w > 0 ? t('foodWeight', { s: fmtSize(w, 'g') }) + '<br>' : `<span style="color:var(--c)">${t('noWeightYet', { s: fmtSize(tot.raw, 'g') })}</span><br>`) +
    t('resultPer100', { k: Math.round(tot.kcal*m), p: r1(tot.protein*m), c: r1(tot.carbs*m), f: r1(tot.fat*m) });
}

function parseNum(s){ s = s.replace(',', '.').trim(); const parts = s.split(/\s+/); let v = 0;
  for(const p of parts){ if(p.includes('/')){ const [a,b] = p.split('/').map(Number); if(b) v += a / b; } else v += Number(p) || 0; } return v; }

function cleanName(s){
  return s.replace(/\([^)]*\)/g, ' ').replace(/^[\s\-–—:,.*•·x×]+|[\s\-–—:,.*•·]+$/g, '').replace(/^(of|από|απο)\s+/i, '').replace(/\s{2,}/g, ' ').trim();
}

function parseIngLine(line){
  let src = line; for(const [k,v] of Object.entries(FRAC)) src = src.split(k).join(v);
  const low = nk(src), m = low.match(R_AMT);
  if(m){
    const val = parseNum(m[1]); const u = R_UNITS.find(x => new RegExp(`^(?:${x[0]})$`).test(m[2]));
    let name = cleanName(src.slice(0, m.index) + ' ' + src.slice(m.index + m[0].length));
    let f = u ? u[1] : 1; if(f === 15 && /λαδ|oil|ελαιολαδ/.test(nk(name))) f = 13.5;
    return { name, grams: val > 0 ? r1(val * f) : null };
  }
  const c = low.match(/^\s*(\d+(?:[.,]\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)\s+(?=\S)/);
  if(c){
    const n = parseNum(c[1]), name = cleanName(src.slice(c[0].length)), nn = nk(name);
    const w = COUNT_W.find(([k]) => new RegExp(k).test(nn)); const g = GEN.find(x => x.piece && (nk(x.en).includes(nn) || nn.includes(nk(x.el).split(' ')[0])));
    return { name, grams: w ? r1(n * w[1]) : g ? r1(n * g.piece) : null, count: n };
  }
  return null;
}

// Cook a Meal › Quick Recipe: type the recipe freely; the AI turns it into a Home-cooked meal (your own foods first: applyRecipe matches them before the built-in list)
async function foodsQuickRecipe(){
  const txt = $('foodsQrIn').value.trim(); if(!txt){ $('foodsQrIn').focus(); return; }
  let r = null;
  if(settings.geminiKey){
    try{ const have = foods.slice(0, 80).map(f => foodName(f)).join('; ');
      r = await gemini(`Turn this home recipe into structured data. Write names in ${lang === 'el' ? 'Greek' : 'English'}. Text: """${txt}"""
Return ONLY JSON: {"title":string,"servings":number,"ingredients":[{"name":string,"name_en":string,"grams":number}],"steps":[string]}
Rules: grams for the whole batch as weighed raw; convert spoons/cups/pieces to grams; include oil; servings = the portions the text mentions, else 1; title = a short dish name; name_en = plain generic English food name; steps only if the text has them.
Foods the user already has (use these names when they fit): ${have || 'none listed'}`, null, null, null, { robot: 'chef' }); }
    catch(err){ if(err.cancelled) return; toast(t('cqFail')); r = null; }
  }
  if(!r || !Array.isArray(r.ingredients) || !r.ingredients.length){ r = parseRecipe(txt); if(!r.ingredients.length){ toast(t(settings.geminiKey ? 'cqFail' : 'cqNoKey')); return; } }
  if(!Array.isArray(r.steps)) r.steps = [];
  close('ovQRec'); openCook(null, 'new');
  if(r.title) $('cName').value = r.title;
  applyRecipe(r, true); $('foodsQrIn').value = ''; toast(t('cqDone', { n: r.ingredients.length }));
}

function parseRecipe(text){
  const H_ING = /^(ingredients?|υλικα|τα υλικα|συστατικα)\s*:?$/, H_STEP = /^(steps?|method|instructions?|directions?|preparation|how to make( it)?|οδηγιεσ|εκτελεση|βηματα|παρασκευη|διαδικασια|τροποσ παρασκευησ|μεθοδοσ)\s*:?$/;
  const lines = text.split(/\r?\n/).map(s => s.replace(/^[#>*\s]+/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
  const out = { title: '', ingredients: [], steps: [] }; let mode = null;
  lines.forEach((raw, idx) => {
    const key = nk(raw).replace(/[:.]$/, '').trim();
    if(H_ING.test(key)){ mode = 'ing'; return; }
    if(H_STEP.test(key)){ mode = 'steps'; return; }
    const numbered = /^\d+\s*[.)]\s+/.test(raw) && !/^\d+[.,]\d/.test(raw);
    const body = raw.replace(/^[-–•·]\s*/, '').replace(/^\d+\s*[.)]\s+(?=\D)/, '').trim();
    const amt = mode === 'steps' ? null : parseIngLine(body);
    if(idx === 0 && !amt && mode === null && lines.length > 1 && body.length < 70 && !/[.!]$/.test(body)){ out.title = body; return; }
    if(mode === 'steps' || (mode === null && ((!amt && (numbered || body.length > 45 || /[.!]$/.test(body))) || (amt && body.length > 60)))){ out.steps.push(body); return; }
    if(amt) out.ingredients.push(amt);
    else out.ingredients.push({ name: cleanName(body), grams: null });
  });
  out.ingredients = out.ingredients.filter(i => i.name);
  return out;
}

function readOwn(){
  OWN = parseRecipe($('ownText').value);
  if(!OWN.ingredients.length && !OWN.steps.length){ $('ownOut').innerHTML = `<div class="status show err">${t('nothingFound')}</div>`; $('ownUse').disabled = true; return; }
  const items = OWN.ingredients.map(i => { const ref = matchIng([i.name]);
    return `<li class="${ref && i.grams ? '' : 'miss'}">${esc(i.name)} — ${i.grams ? fmtSize(i.grams, 'g') : t('noAmount')}${ref ? ` → <b>${esc(ref.name)}</b>` : ` · ${t('willPick')}`}</li>`; }).join('');
  $('ownOut').innerHTML = `<div class="recipe parsed">${OWN.title ? `<b>${esc(OWN.title)}</b>` : ''}
    <div class="sgroup">${t('foundIng', { n: OWN.ingredients.length })}</div><ul style="color:var(--text)">${items}</ul>
    <div class="sgroup">${t('foundSteps', { n: OWN.steps.length })}</div><ol>${OWN.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`;
  $('ownUse').disabled = false;
}

// ======================= meals list + detail =======================
function mealIcon(m){ return ''; }   // food-type emojis are gone (0.7.4.0.5); kept because other parts call it

function renderMeals(){
  const q = norm($('mSearch').value), tokens = q.split(' ').filter(Boolean);
  const items = meals.filter(m => !tokens.length || tokens.every(tk => norm(m.name + ' ' + m.ingredients.map(i => i.name).join(' ')).includes(tk)))
    .sort((a,b) => (b.cookedAt||'').localeCompare(a.cookedAt||''));
  $('mCount').textContent = meals.length ? (items.length === 1 ? t('nMeal') : t('nMeals', { n: items.length })) : '';
  if(!meals.length){ $('mList').innerHTML = `<div class="empty">${t('noMeals')}</div>`; return; }
  if(!items.length){ $('mList').innerHTML = `<div class="empty">${t('nothingMatches', { q: esc($('mSearch').value) })}</div>`; return; }
  $('mList').innerHTML = items.map(m => `<div class="card" data-mid="${m.id}">
      <div class="ficon">${svgIcon('pot', 22)}</div>
      <div class="body">
        <div class="row"><div class="brand">${fmtDate(m.cookedAt)}${m.timesCooked > 1 ? ' · ' + t('timesCooked', { n: m.timesCooked }) : ''}</div><div class="kcal">${m.kcal} <small>kcal</small></div></div>
        <div class="name">${esc(m.name)}</div>
        <div class="row" style="margin-top:2px">
          <div class="macros"><span class="m p">P <b>${fmt(m.protein)}</b></span><span class="m c">C <b>${fmt(m.carbs)}</b></span><span class="m f">F <b>${fmt(m.fat)}</b></span></div>
          <span class="chip ${m.recipe ? 'ok' : ''}">${m.recipe ? t('recipeBadge') + ' · ' : ''}${m.cookedEstimated ? '≈ ' : ''}${t('per100cooked')}</span>
        </div>
      </div></div>`).join('');
}

function openMeal(id){
  const m = meals.find(x => x.id === id); if(!m) return; openMealId = id;
  $('mdName').textContent = m.name;
  $('mdWhen').textContent = m.cookedEstimated ? t('estimated') : t('per100cooked');
  $('mdMeta').textContent = t('mealMeta', { d: fmtDate(m.cookedAt), s: fmtSize(m.cookedWeight, 'g') }) + (m.timesCooked > 1 ? ' · ' + t('timesCooked', { n: m.timesCooked }) : '');
  $('mdStats').innerHTML = `<div><b>${m.kcal}</b><small>kcal</small></div><div><b style="color:var(--p)">${fmt(m.protein)}</b><small>${t('protein')}</small></div><div><b style="color:var(--c)">${fmt(m.carbs)}</b><small>${t('carbs')}</small></div><div><b style="color:var(--f)">${fmt(m.fat)}</b><small>${t('fat')}</small></div>`;
  $('mdPlate').value = ''; $('mdPlateRes').classList.remove('show');
  $('mdIngs').innerHTML = `<ul style="color:var(--text)">${m.ingredients.map(i => `<li>${esc(i.ref.name)} — ${fmtSize(i.grams, i.ref.unit)}</li>`).join('')}</ul>`;
  $('mdRecipe').innerHTML = m.recipe ? `<h3>${t('recipeT')}</h3>` + recipeHtml(m.recipe, true) : `<p class="hint">${t('noRecipe')}</p>`;
  open('ovMeal');
}

function drawSupTimes(){ $('supTimes').innerHTML = SLOTS.map(sl => `<button data-t2="${sl}" class="${SU.times.includes(sl) ? 'on' : ''}">${t('slot_' + sl)}</button>`).join(''); }

function faHint(){
  const f = FA.food, a = num('faAmt') || 0, n = num('faCount') || 1;
  $('faHint').textContent = f && f.pieces !== 'none' && (f.piece || f.serving) ? `≈ ${Math.round(a * n / (f.piece || f.serving))} ${WS(f.pieces)}` : (n > 1 ? `= ${fmtSize(a * n, f ? f.unit : 'g')}` : '');
}

function amRes(){
  const a = num('amAmt'), el = $('amRes');
  if(AM && !AM.typing && AM.units){ const u = AM.units[AM.u] || { size: 1 }; $('amN').value = a > 0 ? r1(a / u.size) : ''; }
  if(!(a > 0)){ el.innerHTML = ''; el.style.display = 'none'; return; }
  const m = macrosFor(AM.info.per, a); el.style.display = 'block';
  el.innerHTML = `<div class="lres"><span class="lk">${m.kcal} kcal</span><span class="lm"><b class="p">P ${m.p}</b> · <b class="c">C ${m.c}</b> · <b class="f">F ${m.f}</b> · ${fmtSize(a, AM.info.unit)}</span></div>`;
}

async function shareList(){
  const text = grocText(); if(!text){ toast(t('nothingToSend')); return; }
  try{ if(await Phone.shareText(t('tGroc'), text)) return; }catch(e){ if(e && e.name === 'AbortError') return; }
  await Phone.copy(text); toast(t('listCopied'));
}

function updateTake(){
  if(!D) return;
  const n = D.rows.filter(r => { const k = fridgeKeyForRef(r.ref); return k && stockOf(k.foodId) > 0; }).length;
  $('cTakeWrap').classList.toggle('hide', !n || D.mode === 'edit');
  $('cTakeTxt').textContent = t('takeIng', { n });
}

function renderUseUp(mode){
  const box = $('useUp'); $('cLeft').checked = mode !== 'edit'; $('cLeftWrap').classList.toggle('hide', mode === 'edit');
  if(mode === 'edit'){ box.innerHTML = ''; return; }
  box.innerHTML = '';   // 0.7: the "use these soon" ideas went with the expiry dates
}

function afterCook(mealId, rows, cooked){
  let msg = '';
  if(D.mode !== 'edit' && !$('cTakeWrap').classList.contains('hide') && $('cTake').checked){
    let n = 0; rows.forEach(r => { const k = fridgeKeyForRef(r.ref); if(k && stockOf(k.foodId) > 0){ takeFromFridge(k, r.grams); n++; } });
    if(n) msg += ' · ' + t('tookOut', { n });
  }
  if(D.mode !== 'edit' && $('cLeft').checked && cooked > 0){
    addToFridge({ mealId, qty: r1(cooked), unit: 'g', loc: 'fridge' });
  }
  return msg;
}

function tgCheck(){
  const msgs = []; [['G', t('gymDayTargets')], ['R', t('restDayTargets')]].forEach(([p, lbl]) => {
    const k = num('tg' + p + 'k'), pp = num('tg' + p + 'p'), c = num('tg' + p + 'c'), f = num('tg' + p + 'f');
    if(k && pp !== null && c !== null && f !== null){ const n = Math.round(pp * 4 + c * 4 + f * 9); if(Math.abs(n - k) > 60) msgs.push(t('tgMismatch', { d: lbl, n, k })); }
  });
  $('tgCheck').textContent = msgs.length ? msgs.join(' ') : t('tgOk'); $('tgCheck').classList.toggle('warn', !!msgs.length);
}

function saveGeneric(g){
  const existing = foods.find(f => f.gid === g.gid); if(existing) return existing;
  const now = new Date().toISOString();
  const f = normFood({ id: uid(), gid: g.gid, name: L(g), brand:'', noBrand:true, cat:g.cat, sub:g.sub, unit:g.unit, state:g.state,
    kcal:g.kcal, protein:g.protein, carbs:g.carbs, fat:g.fat, fiber: g.fiber ?? null, salt: g.salt ?? null, potassium: g.potassium ?? null,
    pieces:g.pieces, piece:g.piece, pieceSkipped: !g.piece && g.pieces !== 'none', source:'standard', createdAt: now, updatedAt: now });
  foods.push(f); saveFoods(); renderAll(); return f;
}

function matchIng(names){
  for(const q of names){ if(!q) continue; const k = norm(q).replace(/[.,]/g, '').trim(); const gid = DEFAULT_PICK[k];
    if(gid){ const mine = foods.find(f => f.gid === gid); const ref = mine ? foods_ref(mine) : gen_ref(GENBY[gid]); ref.vague = true; return ref; } }
  const tryQ = q => { const s = searchLocal(q, true); return s.mine.length ? foods_ref(s.mine[0]) : s.std.length ? gen_ref(s.std[0]) : null; };
  for(const q of names){ if(!q) continue; const r = tryQ(q); if(r) return r; }
  for(const q of names){ if(!q) continue;
    for(const w of norm(q).split(' ').filter(w => w.length >= 4).sort((a,b) => b.length - a.length)){ const g = DEFAULT_PICK[w]; if(g){ const ref = gen_ref(GENBY[g]); ref.vague = true; return ref; } const r = tryQ(w); if(r) return r; } }
  return null;
}

function openCook(meal, mode){
  D = { id: mode === 'edit' ? meal.id : (mode === 'again' ? meal.id : null), mode, recipe: meal && meal.recipe ? meal.recipe : null,
        rows: meal ? meal.ingredients.map(r => ({ ...r, key: uid() })) : [], timesCooked: meal ? (meal.timesCooked || 1) : 0 };
  $('cookTitle').textContent = mode === 'edit' ? t('editMeal') : mode === 'again' ? t('cookAgainT') : t('cookMeal');
  $('cName').value = meal ? meal.name : '';
  $('cPotFull').value = ''; $('cPotEmpty').value = ''; $('cCooked').value = mode === 'edit' && meal && !meal.cookedEstimated ? meal.cookedWeight : '';
  $('cDelete').classList.toggle('hide', mode !== 'edit');
  renderUseUp(mode); drawRecipeBox(); drawRows(); cookStep(true); open('ovCook');
}

function drawRows(){
  $('iRows').innerHTML = D.rows.map(r => { const pr = pairOf(r.ref), st = r.ref ? refState(r.ref) : null;
    return `<div class="irow" data-key="${r.key}">
      <button class="ipick ${r.ref ? '' : 'unset'} ${r.ref && r.ref.vague ? 'vague' : ''}" data-pick>${r.ref ? `<span>${esc(r.ref.name)}${r.ref.vague ? `<small>${t('tapChangeV')}</small>` : ''}</span>` : `<span>${esc(r.wanted || t('chooseFood'))}</span>`}</button>
      ${pr ? `<button class="rc ${st === 'cooked' ? 'ck' : ''}" data-rc>${st === 'cooked' ? t('cookedS') : t('raw')}</button>` : ''}
      <div class="igr"><input type="number" inputmode="decimal" step="any" min="0" value="${r.grams ?? ''}" data-g placeholder="0"><i>${r.ref && r.ref.unit === 'ml' ? 'ml' : 'g'}</i></div>
      <button class="irm" data-rm aria-label="${t('delete')}">${svgIcon('x', 16)}</button></div>`; }).join('');
  calcMeal(); updateTake();
}

function openSuggest(){
  SG.sel = new Set(); $('sgIn').value = ''; const rm = remainingToday();
  $('sgLeft').textContent = rm ? t('sgLeft', rm) : t('sgNoTargets'); drawSgChips(); open('ovSuggest');
}

function drawSgChips(){
  const all = [...(ui.sgChips || []), ...SG_DEFAULT[lang === 'el' ? 'el' : 'en']];
  $('sgChips').innerHTML = [...new Set(all)].map(c => `<button class="fchip ${SG.sel.has(c) ? 'on' : ''}" data-sg="${esc(c)}">${esc(c)}</button>`).join('');
}

function addSgChip(){ const v = $('sgIn').value.trim(); if(!v) return; ui.sgChips = [v, ...(ui.sgChips || []).filter(x => x !== v)].slice(0, 16); saveUI(); SG.sel.add(v); $('sgIn').value = ''; drawSgChips(); }

// ---------- tags: raw (light blue) / cooked (light green) ----------
function stTag(state){ return state === 'uncooked' ? `<span class="sttag raw">${t('rawTag')}</span>` : state === 'cooked' ? `<span class="sttag cooked">${t('cookedTag')}</span>` : state === 'ready' ? `<span class="sttag ready">${t('readyTag')}</span>` : ''; }
// "Chicken breast, cooked" → "Chicken breast" (the tag says it instead)
const bareName = n => String(n || '').replace(/,\s*(cooked|raw|uncooked|ready[- ]to[- ]eat|μαγειρεμέν[οηα]|ωμ[όήά])\s*$/i, '');

function saveOnlineFood(d){
  if(d.barcode){ const ex = foods.find(f => f.barcode === d.barcode); if(ex) return ex; }
  const now = new Date().toISOString(), g = guessType(d.name + ' ' + (d.hint || ''));
  const f = normFood({ id: uid(), name: d.name, brand: d.brand || '', noBrand: !d.brand, barcode: d.barcode || null, cat: g ? g.cat : 'other', sub: g ? g.sub : 'general', unit: d.unit || 'g', state: d.state || 'ready',
    kcal: d.kcal ?? Math.round(d.protein * 4 + d.carbs * 4 + d.fat * 9), protein: d.protein, carbs: d.carbs, fat: d.fat, fiber: d.fiber ?? null, salt: d.salt ?? null, potassium: d.potassium ?? null,
    packs: d.packs || [], usualPack: d.usualPack || null, pieces: 'none', serving: d.serving || null, source: d.source || 'online', createdAt: now, updatedAt: now });
  foods.push(f); saveFoods(); return f;
}

// ---------- fewer pop-ups when saving a food ----------
function trySave(){
  const { name, brand, vals } = readForm();
  if(!name){ toast(t('needName')); $('fName').focus(); return; }
  if(vals.protein === null || vals.carbs === null || vals.fat === null){ toast(t('needMacros')); return; }
  if(Object.values(vals).some(v => v !== null && (isNaN(v) || v < 0))){ toast(t('numbersOff')); return; }
  if(!brand && !F.noBrand) setNoBrand(true);
  if(!F.cat){ const g = guessType(name + ' ' + (F.hint || '')); if(g) setType(g.cat, g.sub, false); else setType('other', 'general', false); }
  if(F.pieces !== 'none' && !num('fPiece')) F.pieceSkipped = true;
  commit();
}

// the old home page is gone (0.7.4.0.5). Kept empty only because gym.js and wire/04-gym.js still call it; delete once they stop.
function renderHome(){}
