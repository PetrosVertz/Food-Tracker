// Shopping in (0.7): Groceries → fridge, remembered packs, continuous barcode scanning, the review list with a count wheel,
// receipts (the AI only reads the lines; the app finds the foods) and Check My Foods (AI). (functions only)
// Food Tracker · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ---------- packs: remembered per food (size of one pack + how many you usually buy) ----------
function guessPack(f){
  if(f.pieces && f.pieces !== 'none' && (f.piece || f.serving)) return (f.piece || f.serving) * (f.cat === 'eggs' ? 6 : 1);
  return f.unit === 'ml' ? 1000 : 500;
}
function learnPack(foodId, size, count){
  const f = foods.find(x => x.id === foodId); if(!f) return;
  if(size > 0){ size = r1(size); f.usualPack = size; if(!(f.packs || []).includes(size)) f.packs = [...(f.packs || []), size].slice(-6); }
  if(count > 0) f.usualCount = Math.round(count);
  saveFoods();
}
// n packs of one food into the fridge; returns the new ids (for Undo)
function putPacks(f, size, n, guess, opt){
  const ids = []; for(let i = 0; i < Math.max(1, n); i++){ const id = uid(); ids.push(id);
    addToFridge({ id, foodId: f.id, qty: r1(size), packSize: r1(size), unit: f.unit, loc: opt && opt.frozen ? 'freezer' : defaultLoc(f), ...(opt && opt.tag && opt.tag !== f.state ? { tag: opt.tag } : {}), ...(guess ? { qtyGuess: true } : {}) }); }
  return ids;
}
function takeBack(ids){ const s = new Set(ids); fridge = fridge.filter(it => !s.has(it.id)); saveFridge(); }

// ---------- Groceries: ticking an item = it's in the fridge (usual pack × count); a never-bought item goes in as 1 pack to fix later ----------
function grocTick(g){
  if(g.done){ if(g.fids) takeBack(g.fids); g.done = false; delete g.fids; delete g.doneAt; saveGroc(); renderAll(); return; }   // unticked: back out
  g.done = true; g.doneAt = new Date().toISOString();
  const f = g.foodId && foods.find(x => x.id === g.foodId);
  if(f){ const known = g.size || f.usualPack, n = known ? Math.max(1, g.count || 1) : 1;
    g.fids = putPacks(f, known || guessPack(f), n, !known); if(known) learnPack(f.id, known, n);
    toast(t('tickedIn', { n: foodName(f) })); }
  saveGroc(); renderAll();
}

// ---------- the review list (after scanning, or the unsure lines of a receipt) ----------
const WH = 30;   // one row of the count wheel
function shopItem(o){ return { id: uid(), name: '', brand: '', foodId: null, gid: null, data: null, size: null, unit: 'g', count: 1, scans: 0, usual: 0, userCount: false, on: true, sure: false, done: false, look: '', web: false, line: '', code: null, src: 'scan', ...o }; }
function shopSetFood(x, f){
  x.foodId = f.id; x.gid = null; x.data = null; x.web = false; x.look = ''; x.name = foodName(f); x.brand = f.noBrand ? '' : (f.brand || ''); x.unit = f.unit || 'g';
  x.size = x.sizeFixed ? x.size : (x.size || f.usualPack || null); x.usual = f.usualCount || 0; shopCount(x);
}
function shopCount(x){ if(x.userCount || x.src !== 'scan') return; x.count = x.scans > 1 ? x.scans : Math.max(1, x.usual || 1); }   // scanned twice = 2; once = your usual count

function shopName(x){ return x.name || (x.code ? t('unknownCode', { c: x.code }) : x.line || '?'); }
function shopTags(x){
  const tags = [];
  if(x.look === 'busy') tags.push(`<span class="spin1"></span>${t('lookingUp1')}`);
  else if(!x.foodId && !x.gid && !x.data) tags.push(`<span class="stag warn">${t('shopPick')}</span>`);
  else if(x.web) tags.push(`<span class="stag web">${t('fromWeb')}</span>`);
  else if(x.data) tags.push(`<span class="stag">${t('shopNew')}</span>`);
  else if(x.gid) tags.push(`<span class="stag">${t('stdValues')}</span>`);
  if(x.src === 'receipt' && !x.sure && x.look !== 'busy' && (x.foodId || x.gid || x.data)) tags.push(`<span class="stag warn">${t('shopUnsure')}</span>`);
  if(x.brand) tags.push(esc(x.brand));
  if(x.line && x.src !== 'scan') tags.push(`<span class="sline">${esc(x.line)}</span>`);
  return tags.join(' · ');
}
function wheelHtml(n){ return `<div class="wheelw"><div class="wheel" data-wheel role="listbox" aria-label="${t('packsL')}">${Array.from({ length: 30 }, (_, i) => `<div data-wn="${i + 1}" class="${i + 1 === n ? 'on' : ''}">${i + 1}</div>`).join('')}</div></div>`; }
function shopRow(x, i){
  return `<div class="shoprow ${x.on ? '' : 'off'}" data-si="${i}">
    <button class="sbox" type="button" data-son aria-label="${x.on ? t('remove') : t('add')}">${x.on ? svgIcon('check', 15, 3) : ''}</button>
    <button class="sname" type="button" data-sname><b>${esc(shopName(x))}</b><small>${shopTags(x)}</small></button>
    <label class="spack"><input data-ssize inputmode="decimal" data-nfix value="${x.size ? fmt(x.size) : ''}" placeholder="—" aria-label="${t('packSizeL')}"><span>${x.unit}</span></label>
    <span class="wx">×</span>${wheelHtml(x.count)}</div>`;
}
function shopRemove(x){
  const i = SHOP.items.indexOf(x); if(i < 0) return; SHOP.items.splice(i, 1); drawShop();
  toast(t('deleted', { n: shopName(x) }), t('undo'), () => { SHOP.items.splice(Math.min(i, SHOP.items.length), 0, x); drawShop(); });
}
// the edit window for one card: name, which food, tag, pack size, count
let SHED = null;
function shopEdit(x){
  SHED = x; $('shedName').value = x.name || ''; $('shedSize').value = x.size ? fmt(x.size) : ''; $('shedUnit').textContent = x.unit; $('shedCount').textContent = x.count;
  $('shedFood').textContent = x.foodId || x.gid || x.data ? shopName(x) : t('shopPick'); drawShedTags(); open('ovShopEd');
}
function drawShedTags(){
  const f = SHED.foodId && foods.find(y => y.id === SHED.foodId), cur = SHED.tag || (f && f.state) || 'cooked';
  $('shedTags').innerHTML = [['cooked', 'shopFCooked'], ['uncooked', 'shopFRaw'], ['ready', 'shopFReady']].map(([v, k]) => `<button type="button" data-stag="${v}" class="${cur === v ? 'on' : ''}">${t(k)}</button>`).join('')
    + `<button type="button" data-sfrz class="${SHED.frozen ? 'on' : ''}" aria-pressed="${!!SHED.frozen}">${t('frozen')}</button>`;
}
function shopVisible(){ return SHOP.items.map((x, i) => ({ x, i })).filter(({ x }) => !x.done); }
function drawShop(){
  const vis = shopVisible(), n = vis.filter(({ x }) => x.on).length, done = SHOP.items.filter(x => x.done);
  $('shopDone').innerHTML = done.length ? `<div class="shopdone"><span>${svgIcon('check', 15, 3)}</span><div><b>${t('wentIn', { n: done.length })}</b><small>${esc(done.map(shopName).join(', '))}</small></div><button class="linkbtn" type="button" id="shopUndoSure">${t('undo')}</button></div>` : '';
  $('shopList').innerHTML = vis.map(({ x, i }) => shopRow(x, i)).join('') || (SHOP.busy ? '' : done.length ? `<div class="empty">${t('allIn')}</div>` : '');
  $('shopAddBtn').textContent = n ? t('shopAddAll', { n }) : t('done'); $('shopAddBtn').disabled = !!SHOP.busy && !n;
  syncWheels();
}
function shopRedrawRow(x){ const i = SHOP.items.indexOf(x), r = document.querySelector(`#shopList [data-si="${i}"]`); if(!r){ if($('ovShopRev').classList.contains('open')) drawShop(); return; }
  if(r.contains(document.activeElement)) return; r.outerHTML = shopRow(x, i); syncWheels(); }
function syncWheels(){ requestAnimationFrame(() => document.querySelectorAll('#shopList .wheel').forEach(w => { if(w._set || !w.offsetHeight) return;
  const x = SHOP.items[+w.closest('[data-si]').dataset.si]; w.scrollTop = (x.count - 1) * WH; w._set = true; })); }
function shopReview(){ open('ovShopRev'); drawShop(); }

// what an item becomes when it goes in: your food, a built-in one, or a new food from the barcode / web data
function shopResolve(x){
  if(x.foodId) return foods.find(f => f.id === x.foodId) || null;
  if(x.gid && GENBY[x.gid]) return saveGeneric(GENBY[x.gid]);
  if(x.data){ const f = saveOnlineFood({ ...x.data, barcode: x.code || x.data.barcode || null, source: x.web ? 'web' : (x.data.source || 'openfoodfacts') }); x.foodId = f.id; return f; }
  return null;
}
function shopPut(x){
  const f = shopResolve(x); if(!f) return null;
  const size = x.size || f.usualPack, n = Math.max(1, Math.round(x.count || 1));
  const ids = putPacks(f, size || guessPack(f), n, !size, { tag: x.tag, frozen: x.frozen });
  if(size) learnPack(f.id, size, n); else learnPack(f.id, null, n);
  if(x.code && !f.barcode) f.barcode = x.code;
  if(x.line && x.src !== 'scan'){ const k = norm(x.line); f.rcpt = [...new Set([k, ...(f.rcpt || [])])].slice(0, 8); }   // this receipt line = this food, next time
  saveFoods(); x.done = true; return ids;
}
function shopAddAll(){
  const list = shopVisible().filter(({ x }) => x.on).map(({ x }) => x);
  if(!list.length){ close('ovShopRev'); return; }
  let n = 0, skip = 0; const ids = [];
  list.forEach(x => { const r = shopPut(x); if(r){ ids.push(...r); n++; } else skip++; });
  close('ovShopRev'); renderAll();
  toast(t('shopAdded', { n }) + (skip ? ' · ' + t('shopSkipped', { n: skip }) : ''), t('undo'), () => { takeBack(ids); renderAll(); });
}

// ---------- barcode scanning into the fridge: first scan asks "More items?", then it keeps scanning quietly ----------
function shopScanStart(){ SHOP.scan = { cont: false, ask: false, last: null, gate: null }; SHOP.items = []; SHOP.busy = false; const fl = $('scanFlash'); fl.classList.remove('show'); fl.innerHTML = ''; scanUI(); }
// called for every camera frame while scanning for the fridge (hit = a valid barcode or null)
function shopSeen(hit){
  const S_ = SHOP.scan; if(!S_) return; const now = Date.now();
  if(S_.gate && now - S_.gate.seen > 900) S_.gate = null;          // that pack has left the view: the same barcode can count again
  if(!hit){ S_.last = null; return; }
  if(S_.gate && hit === S_.gate.code){ S_.gate.seen = now; return; } // still the same pack in front of the camera
  if(S_.ask) return;                                                 // waiting for More items?
  if(hit !== S_.last){ S_.last = hit; return; }                      // read twice in a row before it counts
  S_.last = null; S_.gate = { code: hit, seen: now }; shopAddCode(hit);
}
function shopAddCode(code){
  let x = SHOP.items.find(i => i.code === code);
  if(x){ x.scans++; x.on = true; shopCount(x); } else { x = shopItem({ code, scans: 1 }); SHOP.items.push(x); shopLookup(x); }
  Phone.vibrate(40);
  if(SHOP.scan && !SHOP.scan.cont){ SHOP.scan.ask = true; SHOP.scan.askFor = x; } else scanFlash(x);
  scanUI();
}
async function shopLookup(x){
  const f = foods.find(y => y.barcode === x.code); if(f){ shopSetFood(x, f); return; }
  x.look = 'busy';
  try{
    const r = await fetchT(`https://world.openfoodfacts.org/api/v2/product/${x.code}.json?fields=${OFF_FIELDS}`, {}, 9000), j = await r.json();
    const d = j && j.status === 1 && j.product ? offToFood(j.product, x.code) : null;
    if(d && d.name && (d.protein !== null || d.carbs !== null || d.fat !== null)){ x.data = { ...d, protein: d.protein ?? 0, carbs: d.carbs ?? 0, fat: d.fat ?? 0 }; x.name = d.name; x.brand = d.brand || ''; x.unit = d.unit || 'g'; x.size = x.size || d.usualPack || null; }
  }catch(e){}
  x.look = ''; scanUI(); shopRedrawRow(x);
}
function scanUI(){
  const S_ = SHOP.scan, n = SHOP.items.reduce((a, x) => a + (x.scans || 1), 0), fr = scanCtx === 'fridge' && S_;   // how many packs went past the camera
  $('scanBasket').classList.toggle('hide', !fr || !SHOP.items.length); $('scanBasket').textContent = t('scanBasket', { n });
  $('scanCancel').textContent = fr && SHOP.items.length ? t('scanDone', { n }) : t('close');
  const q = fr && S_.ask; $('scanQ').classList.toggle('hide', !q);
  if(q){ const x = S_.askFor; $('scanQT').innerHTML = `<small>${t('addedOne')}</small><b>${esc(x.look === 'busy' ? t('lookingUp1') : shopName(x))}</b>`; }
}
function scanFlash(x){ const el = $('scanFlash'); el.innerHTML = `${svgIcon('check', 16, 3)} ${esc(x.look === 'busy' ? t('addedOne') : shopName(x))}${x.scans > 1 ? ` <b>×${x.scans}</b>` : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); Phone.haptic(); }
// the scanner closed: what you scanned goes to the review list
function shopScanClosed(){
  if(!SHOP.scan) return;
  setTimeout(() => { if(AI.busy()) return;   // a photo of the item is being read: it joins the list when the answer lands
    SHOP.scan = null; if(SHOP.items.length && !document.querySelector('.overlay.open')) shopReview(); }, 0);
}

// ---------- receipts / grocery photos: the AI reads the lines, the app finds the foods ----------
const shopWords = x => [...new Set([...Search.words(x.name_en || ''), ...Search.words(x.name_el || '')])];
// words that only describe a food's state ("Banana, peeled", "Chicken breast, raw") don't have to be on the receipt
const SOFTW = new Set(['raw', 'uncooked', 'cooked', 'fresh', 'peeled', 'whole', 'plain', 'ready', 'boneless', 'skinless', 'average', 'ωμο', 'ωμα', 'ωμη', 'ωμος', 'φρεσκο', 'φρεσκα', 'φρεσκη', 'μαγειρεμενο', 'μαγειρεμενη', 'μαγειρεμενα']);
const candWords = n => Search.words(n).filter(w => !SOFTW.has(w));
// share of the words in a that also appear in b (plurals, typos and still-typing forms count)
function cover(a, b){ if(!a.length) return 0;
  return a.filter(w => b.some(v => v === w || (w.length >= 4 && v.length >= 4 && (v.startsWith(w) || w.startsWith(v))) || (w.length >= 5 && v.length >= 5 && Search.dist(w, v, 1) <= 1))).length / a.length; }
const GRL = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o' };
const latin = s => norm(s || '').split('').map(c => GRL[c] ?? c).join('').replace(/[^a-z0-9]/g, '');
function brandOk(a, b){ const x = latin(a), y = latin(b); if(!x || !y) return false; return x === y || x.includes(y) || y.includes(x) || (x.length >= 4 && Search.dist(x, y, 2) <= 2); }

// how sure we are that a receipt line is one of your foods / a built-in food
function shopMatch(x){
  const line = norm(x.line || '');
  const own = line && foods.find(f => (f.rcpt || []).includes(line)); if(own) return { foodId: own.id, sure: true };   // seen this exact line before
  const R = shopWords(x), Ren = Search.words(x.name_en || ''), Rel = Search.words(x.name_el || '');
  const fit = names => Math.max(0, ...names.filter(Boolean).map(n => { const C = candWords(n); return C.length ? Math.min(cover(C, R), Math.max(cover(Ren, C), cover(Rel, C)) + .25) : 0; }));
  const fitOwn = names => Math.max(0, ...names.filter(Boolean).map(n => { const C = candWords(n); return C.length ? cover(C, R) : 0; }));
  const cand = [...new Set([...searchLocal(x.name_en || '', true).mine.slice(0, 6), ...searchLocal(x.name_el || '', true).mine.slice(0, 6)])];
  let best = null;
  cand.forEach(f => { const g = f.gid && GENBY[f.gid], names = [f.name, foodName(f), g && g.en, g && g.el];
    const branded = f.brand && !f.noBrand, bOk = branded ? brandOk(f.brand, x.brand) : !x.brand;
    const s = branded ? (bOk ? fitOwn(names) : 0) : fit(names);
    if(s > (best ? best.s : 0)) best = { foodId: f.id, s, sure: s >= .75 && (branded ? bOk : (x.loose || !x.brand)) }; });
  if(best && best.s >= .5) return best;
  const std = [...new Set([...searchLocal(x.name_en || '', true).std.slice(0, 6), ...searchLocal(x.name_el || '', true).std.slice(0, 6)])];
  std.forEach(g => { const s = fit([g.en, g.el]); if(s > (best ? best.s : 0)) best = { gid: g.gid, s, sure: s >= .75 && (x.loose || !x.brand) }; });
  return best && best.s >= .5 ? best : null;
}

// branded lines you don't have yet: the exact product from Open Food Facts (no AI)
async function shopOff(x){
  try{
    const qs = [`${x.brand} ${x.name_el || ''}`, `${x.brand} ${x.name_en || ''}`].map(s => s.trim()).filter((s, i, a) => s && a.indexOf(s) === i);
    for(const q of qs){
      const res = await Search.off(q), R = shopWords(x);
      const hit = res.filter(d => brandOk(d.brand, x.brand) && Search.quality(d) > 0).map(d => ({ d, s: cover(Search.words(d.name), [...R, ...Search.words(x.line || '')]) }))
        .filter(r => r.s >= .5).sort((a, b) => b.s - a.s)[0];
      if(hit) return hit.d;
    }
  }catch(e){}
  return null;
}

const RCPT_PROMPT = `This photo is a supermarket receipt (usually Greek, with short abbreviated product names) OR groceries laid out on a table. Read every line carefully.
Return ONLY JSON: {"kind":"receipt"|"groceries","items":[{"line":string,"name_en":string,"name_el":string,"brand":string|null,"count":number,"packSize":number|null,"unit":"g"|"ml","loose":boolean}]}
- line: the product text exactly as printed (receipt), or a short description of the item (photo).
- name_en / name_el: what the product is, in plain English and in Greek, abbreviations expanded, keeping the product line and variant (fat %, flavour, light/zero), e.g. "ΦΑΓΕ ΤΟΤΑΛ 2% 1ΚΓ" → "Total 2% strained yoghurt" / "Total 2% στραγγιστό γιαούρτι". No brand and no size in these.
- brand: the brand if printed or obvious (ΦΑΓΕ → Fage, ΔΕΛΤΑ → Delta, ΜΕΒΓΑΛ → Mevgal), else null.
- count: how many were bought (quantity column, 1 if not shown). Weighed items ("0,850 KG", "1,234 x 2,99"): count 1 and packSize = that weight in g.
- packSize: the size of ONE pack in g or ml ONLY if printed in the line ("500ΓΡ", "1LT" = 1000, "1Κ"/"1ΚΓ" = 1000), else null. Never guess.
- unit: "ml" for drinks, milk and oil, else "g".
- loose: true for unbranded fresh food (fruit, vegetables, butcher meat, fish, bakery bread, deli by weight), else false.
Skip bags, deposits (ΕΓΓΥΗΣΗ), discounts (ΕΚΠΤΩΣΗ), totals, VAT and non-food (cleaning, toiletries). Do NOT give nutrition values.`;

async function shopPhoto(file){
  SHOP.scan = null; SHOP.items = []; SHOP.busy = true; $('shopDone').innerHTML = ''; status($('shopStatus'), t('shopReading')); open('ovShopRev'); drawShop();
  let lines;
  try{
    const img = await shrink(file, 3072, .92), d = await gemini(RCPT_PROMPT, img, (i, n) => status($('shopStatus'), t('shopReading') + (i > 1 ? ' ' + t('tryingModel', { i, n }) : '')), null, { best: true, robot: 'fridge' });
    lines = (d && Array.isArray(d.items) ? d.items : []).filter(x => x && (x.name_en || x.name_el || x.line));
  }catch(err){ SHOP.busy = false; status($('shopStatus'), err.cancelled ? '' : t('shopFail', { e: err.message }), !err.cancelled); drawShop(); return; }
  if(!lines.length){ SHOP.busy = false; status($('shopStatus'), t('shopNone'), true); drawShop(); return; }
  // 1) your foods and the built-in list
  SHOP.items = lines.map(l => { const x = shopItem({ src: 'receipt', line: String(l.line || '').trim(), name_en: l.name_en, name_el: l.name_el, brand: l.brand || '', loose: !!l.loose,
      count: Math.max(1, Math.round(+l.count || 1)), size: +l.packSize > 0 ? Math.round(+l.packSize) : null, unit: l.unit === 'ml' ? 'ml' : 'g' });
    x.sizeFixed = !!x.size; x.name = (lang === 'el' ? l.name_el : l.name_en) || l.name_en || l.name_el || x.line;
    const m = shopMatch(x);
    if(m && m.foodId){ const f = foods.find(y => y.id === m.foodId); const nm = x.name; shopSetFood(x, f); if(!m.sure) x.name = foodName(f) || nm; }
    else if(m && m.gid){ x.gid = m.gid; x.name = L(GENBY[m.gid]); }
    x.sure = !!(m && m.sure); x.on = !!m; return x; });
  // every line is shown as a card for you to check: sure matches first (pre-ticked), unsure ones marked
  SHOP.items = SHOP.items.map((x, i) => [x, i]).sort((a, b) => (b[0].sure - a[0].sure) || a[1] - b[1]).map(r => r[0]); SHOP.sureIds = []; drawShop();
  // 2) branded lines you don't have: Open Food Facts
  const offs = SHOP.items.filter(x => !x.done && !x.foodId && x.brand && !x.loose);
  if(offs.length){ status($('shopStatus'), t('shopOffLook', { n: offs.length })); offs.forEach(x => { x.look = 'busy'; }); drawShop();
    for(let i = 0; i < offs.length; i += 4) await Promise.all(offs.slice(i, i + 4).map(async x => { const d = await shopOff(x); x.look = '';
      if(d){ x.data = d; x.gid = null; x.name = d.name; x.size = x.size || d.usualPack || null; x.unit = d.unit || x.unit; x.on = true; } shopRedrawRow(x); })); }
  // 3) still nothing exact: one web lookup for all of them (Gemini + Google Search). A branded product that only matched a plain built-in food is looked up too
  const web = SHOP.items.filter(x => !x.done && !x.foodId && !x.data && (!x.gid || (x.brand && !x.loose)));
  if(web.length){ status($('shopStatus'), t('shopWebLook', { n: web.length })); web.forEach(x => { x.look = 'busy'; }); drawShop();
    for(let i = 0; i < web.length; i += 15){ const part = web.slice(i, i + 15);
      try{ const r = await gemini(`Find these supermarket products (bought in Greece) online — the brand's own site, a Greek supermarket listing (AB, Sklavenitis, Masoutis, My Market, e-fresh) or Open Food Facts — and read the nutrition per 100 g/ml of THAT exact product (same brand, product line, variant and fat %). If you can't find that exact product, set "found": false — never use a similar product.
Return ONLY JSON: {"items":[{"i":number,"found":boolean,"name":string,"brand":string|null,"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number|null,"packSize":number|null,"unit":"g"|"ml","state":"uncooked"|"ready","source":string}]}
Carbs as on EU labels (fibre not included). packSize = net size of one pack in g/ml. state "uncooked" for raw meat/fish and dry rice/pasta/oats.
Products:
${part.map((x, j) => `${j}) "${x.line}" = ${x.brand ? x.brand + ' ' : ''}${x.name_en || x.name}`).join('\n')}`, null, null, null, { quiet: true, search: true, robot: 'fridge' });
        (r && Array.isArray(r.items) ? r.items : []).forEach(w => { const x = part[+w.i]; if(!x || !w.found) return;
          const d = { name: w.name || x.name, brand: w.brand || x.brand || '', kcal: +w.kcal || null, protein: +w.protein, carbs: +w.carbs, fat: +w.fat, fiber: w.fiber != null ? +w.fiber : null, unit: w.unit === 'ml' ? 'ml' : 'g', state: w.state === 'uncooked' ? 'uncooked' : 'ready', packs: +w.packSize > 0 ? [Math.round(+w.packSize)] : [], usualPack: +w.packSize > 0 ? Math.round(+w.packSize) : null };
          if(!(Search.quality(d) > 0)) return;
          x.data = d; x.gid = null; x.web = true; x.name = d.name; x.size = x.size || d.usualPack; x.unit = d.unit; x.on = true; x.src2 = w.source; });
      }catch(e){ if(e.cancelled) break; }
    }
    web.forEach(x => { x.look = ''; });
  }
  SHOP.busy = false; status($('shopStatus'), ''); drawShop();
}

// ---------- Check My Foods (AI): every saved food against online sources, in batches of 20; only the ones that look off are shown ----------
let CHK = null;
function checkTodo(){ return foods.filter(f => !f.checked && !f.gid && f.protein != null); }   // built-in foods come from the curated list already
async function checkFoods(){
  if(CHK && CHK.running){ open('ovCheck'); return; }
  if(!settings.geminiKey){ toast(t('needKeyFirst')); return; }
  const todo = checkTodo(); if(!todo.length){ toast(t('chkAllDone')); return; }
  const nb = Math.ceil(todo.length / 20);
  if(!(await ask(t(nb === 1 ? 'chkAsk1' : 'chkAsk', { n: todo.length, b: nb }), t('chkGo')))) return;
  CHK = { rows: [], ok: 0, nf: 0, done: 0, total: todo.length, running: true, ctl: new AbortController(), err: '' };
  open('ovCheck'); drawCheck();
  const clean = v => v == null || v === '' || isNaN(+v) ? null : r1(+v);
  for(let i = 0; i < todo.length && !CHK.ctl.signal.aborted; i += 20){
    const batch = todo.slice(i, i + 20); CHK.at = i; drawCheck();
    try{
      const r = await gemini(`You check saved food entries against real online sources (the product's own page, Greek supermarket listings, Open Food Facts, USDA for plain foods).
For EACH food, find THAT EXACT product: same brand, same product name, same variant (fat %, flavour, light/zero) and the same state (raw / cooked / ready to eat). If you can't find that exact product, status "notfound" — never compare with a similar product (never swap Greek yoghurt for sheep yoghurt, or 2% for 0%).
If found and the saved values per 100 g/ml are close (kcal within 8 %, each macro within 2 g), status "ok". If found and clearly different, status "off" with the correct per-100 values. Only say "off" when you're sure.
Carbs as on EU labels (fibre not included).
Return ONLY JSON: {"foods":[{"i":number,"status":"ok"|"off"|"notfound","kcal":number|null,"protein":number|null,"carbs":number|null,"fat":number|null,"fiber":number|null,"source":string|null}]}
Foods:
${batch.map((f, j) => JSON.stringify({ i: j, name: f.name, brand: f.noBrand ? null : f.brand || null, barcode: f.barcode || null, state: f.state, unit: f.unit, per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }, notes: f.notes || undefined })).join('\n')}`,
        null, null, CHK.ctl.signal, { quiet: true, search: true, robot: 'fridge' });
      const seen = new Set();
      (r && Array.isArray(r.foods) ? r.foods : []).forEach(a => { const f = batch[+a.i]; if(!f || seen.has(f.id)) return; seen.add(f.id);
        if(a.status === 'ok'){ f.checked = { at: todayKey(), how: 'ok' }; CHK.ok++; return; }
        const sug = { kcal: clean(a.kcal), protein: clean(a.protein), carbs: clean(a.carbs), fat: clean(a.fat), fiber: clean(a.fiber), name: f.name };
        if(a.status !== 'off' || [sug.protein, sug.carbs, sug.fat].some(v => v === null) || !(Search.quality(sug) > 0)){ CHK.nf++; return; }
        if(!sug.kcal) sug.kcal = Math.round(sug.protein * 4 + sug.carbs * 4 + sug.fat * 9);
        const close_ = Math.abs(sug.kcal - (f.kcal || 0)) <= Math.max(8, (f.kcal || 0) * .08) && ['protein', 'carbs', 'fat'].every(k => Math.abs(sug[k] - (f[k] || 0)) <= 2);
        if(close_){ f.checked = { at: todayKey(), how: 'ok' }; CHK.ok++; return; }
        CHK.rows.push({ id: f.id, sug, src: a.source || '' }); });
      CHK.nf += batch.filter(f => !seen.has(f.id)).length; CHK.done += batch.length; saveFoods();
    }catch(e){ if(!e.cancelled) CHK.err = e.message; break; }
  }
  CHK.running = false; drawCheck(); render();
}
function drawCheck(){
  if(!CHK) return;
  // every number that would change is shown with an arrow
  const m = (k, a, b) => { const d = Math.abs((b || 0) - (a || 0)) >= (k === 'kcal' ? 2 : .5); return `<span class="${d ? 'chg' : ''}"><i>${k === 'kcal' ? 'kcal' : k[0].toUpperCase()}</i> ${fmt(a)}${d ? ` → <b>${fmt(b)}</b>` : ''}</span>`; };
  status($('chkStatus'), CHK.running ? t('chkRunning', { a: Math.min(CHK.total, CHK.at + 1), b: Math.min(CHK.total, CHK.at + 20), n: CHK.total }) : CHK.err ? t('chkErr', { e: CHK.err }) : '', !!CHK.err);
  $('chkSum').innerHTML = CHK.done ? `<div class="chksum"><span><b>${CHK.ok}</b> ${t('chkOk')}</span><span><b>${CHK.rows.length}</b> ${t('chkOff')}</span><span><b>${CHK.nf}</b> ${t('chkNf')}</span></div>` : '';
  $('chkList').innerHTML = CHK.rows.map((r, i) => { const f = foods.find(x => x.id === r.id); if(!f) return '';
    return `<div class="chkrow" data-ck="${i}"><div class="chkname"><b>${esc(foodName(f))}</b><small>${esc(f.noBrand ? '' : f.brand || '')}${f.state !== 'ready' ? ' · ' + t(STATE_KEY[f.state]).toLowerCase() : ''} · ${t('per100Label', { u: f.unit })}</small></div>
      <div class="chkvals">${['kcal', 'protein', 'carbs', 'fat'].map(k => m(k, f[k], r.sug[k])).join('')}</div>
      ${r.src ? `<small class="chksrc">${t('chkSrc')}: ${esc(r.src).slice(0, 80)}</small>` : ''}
      <div class="chkbtns"><button class="btn small" type="button" data-ckeep>${t('chkKeep')}</button><button class="btn small primary" type="button" data-cacc>${t('chkAccept')}</button></div></div>`; }).join('')
    || (!CHK.running && CHK.done ? `<div class="empty">${t('chkNothing')}</div>` : '');
  $('chkCancel').textContent = CHK.running ? t('cancel') : t('close');
  $('checkFoodsBtn').classList.toggle('busy', !!CHK.running);
}
function checkDecide(i, accept){
  const r = CHK.rows[i]; if(!r) return; const f = foods.find(x => x.id === r.id);
  if(f){ if(accept){ ['kcal', 'protein', 'carbs', 'fat'].forEach(k => { f[k] = r.sug[k]; }); if(r.sug.fiber != null) f.fiber = r.sug.fiber; f.updatedAt = new Date().toISOString(); }
    f.checked = { at: todayKey(), how: accept ? 'fixed' : 'kept' }; saveFoods(); }
  CHK.rows.splice(i, 1); drawCheck(); render(); if(accept) toast(t('updated'));
}
