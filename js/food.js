// Food Track: food list, food form, barcode, ingredient search, cook a meal, meals. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function portion(f){
  const pw = foodPieceSize(f);
  const pack = f.usualPack || null;
  let mode = f.display || 'auto';
  if(mode === 'auto') mode = pw ? 'piece' : (pack && pack <= SMALL_PACK ? 'pack' : '100');
  if(mode === 'piece' && !pw) mode = pack ? 'pack' : '100';
  if(mode === 'pack' && !pack) mode = '100';
  if(mode === 'piece') return { mode, amt: pw, label: t('perWLabel', { w: W(f.pieces) }), size: `${f.piece ? '' : '≈'}${fmtSize(pw, f.unit)}` };
  if(mode === 'pack') return { mode, amt: pack, label: t('perPackLabel'), size: fmtSize(pack, f.unit) };
  return { mode, amt: 100, label: t('per100Label', { u: f.unit }), size: '' };
}

function renderAll(){ render(); renderMeals(); renderQuickMeals(); renderSupps(); renderToday(); renderFridge(); renderGroc(); renderGym(); renderTodayRec(); drawStkBubs();
  const fab = $('fab'); if(fab.dataset.action === 'gym') { if(active) fab.textContent = t('resume', { m: Math.floor(sesMs() / 60000) }); else fab.innerHTML = fabBtn('play', t('startWk')); }
  syncFab2(); }

// the second floating button (0.6.9): the same pair on Food Tracker and Fridge — scan first (line scanner icon), then ＋ Add Food
function syncFab2(){ const a = $('fab').dataset.action, hid = $('fab').classList.contains('hide'), on = (a === 'store' || a === 'fridge') && !hid;
  $('fab2').classList.toggle('hide', !on); document.body.classList.toggle('twofab', on);
  const scan = l => `<span class="fabic">${svgIcon('scan', 18)}</span>${esc(l)}`;
  if(on && a === 'fridge'){ $('fab2').innerHTML = scan(t('scanReceipt')); $('fab').textContent = t('addFridgeFab'); } else $('fab2').innerHTML = scan(t('scanFoodFab')); }

// 0.8 (24 Nov): the Food Library home is a bento grid. Six tiles, each a live preview of its own page (tap = that page).
// Everything here only READS saved data. The rotating Foods stat is picked once per visit (never the same as last time: ui.fhStat).
// where most of a food's calories come from: protein ×4, carbs ×4, fat ×9 (null: no macros, e.g. water)
function foodClass(f){ const p = (+f.protein || 0) * 4, c = (+f.carbs || 0) * 4, fa = (+f.fat || 0) * 9;
  if(p + c + fa <= 0) return null; return p >= c && p >= fa ? 'p' : c >= fa ? 'c' : 'f'; }
// every macro a food is rich in, for the Foods ring: its main one, plus any other that gives at least a quarter of its calories
// (5 g protein + 80 g carbs = carbs only; 30 g protein + 70 g carbs = protein and carbs), so one food can count in two or three arcs
function foodRich(f){ const k = foodClass(f); if(!k) return []; const e = { p: (+f.protein || 0) * 4, c: (+f.carbs || 0) * 4, f: (+f.fat || 0) * 9 }, tot = e.p + e.c + e.f;
  return ['p', 'c', 'f'].filter(x => x === k || e[x] / tot >= .25); }
const fhMonth = () => todayKey().slice(0, 7);
// times each saved thing was logged this month: { refId: n } for one kind ('food' / 'meal')
function fhLogged(kind){ const m = fhMonth(), n = {};
  Object.keys(dayLog).forEach(d => { if(d.slice(0, 7) !== m) return; (dayLog[d] || []).forEach(e => { if(e.kind === kind && e.refId) n[e.refId] = (n[e.refId] || 0) + 1; }); });
  return n; }
const fhIco = k => `<span class="btic">${svgIcon(k, 18, 2)}</span>`;
const fhHead = (ic, key, right) => `<div class="bth">${fhIco(ic)}<b>${esc(t(key))}</b>${right ? `<span class="btr">${right}</span>` : ''}</div>`;
// a small progress ring (Recipes, Shopping List): a of b, coloured stroke on the inner track
function fhMiniRing(a, b, cls){ const R = 18, C = 2 * Math.PI * R, f = b ? Math.min(1, a / b) : 0;
  return `<span class="btring ${cls || ''}"><svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true"><circle cx="22" cy="22" r="${R}" class="trk"/>${f ? `<circle cx="22" cy="22" r="${R}" class="val" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 22 22)"/>` : ''}</svg><b>${a}/${b}</b></span>`; }
// the rotating Foods stat: every one that has something to say; then one at random, never the last one shown
function fhStats(){
  const out = [], cls = { p: 0, c: 0, f: 0 }; foods.forEach(f => foodRich(f).forEach(k => cls[k]++));
  ['p', 'c', 'f'].forEach(k => { if(cls[k]) out.push({ key: 'n' + k, num: String(cls[k]), sub: t('fhRich_' + k) }); });
  const best = foods.filter(f => +f.kcal >= 20 && +f.protein > 0).map(f => ({ f, v: +f.protein / +f.kcal * 100 })).sort((a, b) => b.v - a.v)[0];
  if(best) out.push({ key: 'ppc', num: `${fmt(Math.round(best.v * 10) / 10)} g`, sub: t('fhPerKcal', { n: foodName(best.f) }) });
  const ok = foods.filter(f => f.checked).length; if(foods.length) out.push({ key: 'chk', num: String(ok), sub: t('fhChecked', { n: foods.length - ok }) });
  const lg = fhLogged('food'), top = Object.keys(lg).map(id => [foods.find(f => f.id === id), lg[id]]).filter(x => x[0]).sort((a, b) => b[1] - a[1])[0];
  if(top) out.push({ key: 'top', num: `${top[1]}×`, sub: foodName(top[0]), big: true });
  const nw = foods.filter(f => f.createdAt).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  if(nw) out.push({ key: 'new', num: fmtDate(nw.createdAt), sub: t('fhNewest', { n: foodName(nw) }) });
  return { out, cls };
}
let FH_STAT = null;
function fhPick(list, fresh){
  if(!fresh && FH_STAT && list.some(x => x.key === FH_STAT)) return list.find(x => x.key === FH_STAT);
  const pool = list.length > 1 ? list.filter(x => x.key !== ui.fhStat) : list, pick = pool[Math.floor(Math.random() * pool.length)];
  FH_STAT = pick ? pick.key : null; if(pick && ui.fhStat !== pick.key){ ui.fhStat = pick.key; saveUI(); } return pick; }
// the macro ring: one arc per class (protein / carbs / fat), a small gap between them; a tap anywhere on the ring picks the arc at that
// angle (data-a0 / data-a1 = where each arc starts and ends, 0-1 clockwise from the top) and shows a bubble along the tile's foot (wire/02)
function fhRing(cls){ const tot = cls.p + cls.c + cls.f, R = 46, C = 2 * Math.PI * R, gap = tot && [cls.p, cls.c, cls.f].filter(Boolean).length > 1 ? 7 : 0;
  let off = 0; const arcs = tot ? ['p', 'c', 'f'].filter(k => cls[k]).map(k => { const len = C * cls[k] / tot, d = Math.max(.5, len - gap);
    const a = `<circle cx="60" cy="60" r="${R}" class="seg s-${k}" data-seg="${k}" data-a0="${(off / C).toFixed(3)}" data-a1="${((off + len) / C).toFixed(3)}" stroke-dasharray="${d.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off - gap / 2).toFixed(1)}"/>`; off += len; return a; }).join('') : '';
  return `<div class="fring" aria-label="${esc(t('fhRingA', { p: cls.p, c: cls.c, f: cls.f }))}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="trk"/><g transform="rotate(-90 60 60)">${arcs}</g></svg>
    <span class="fringt"><b>${esc(t('fhSplit'))}</b><small>${esc(t('fhSplit2'))}</small></span></div><span class="fbub hide" aria-live="polite"></span>`; }
// Supps: a day counts when every daily supplement was taken (training-day / when-needed ones never break it)
// today's supplements not taken yet (the daily ones; when there are none, all of them) — the Yes button on the tile logs these
function fhSuppLeft(){ const d = todayKey(), need = supps.filter(s => s.often !== 'training' && s.often !== 'needed'), L = need.length ? need : supps; return L.filter(s => !takesOf(d, s.id).length); }
function suppDayState(d){ const need = supps.filter(s => s.often !== 'training' && s.often !== 'needed'), L = need.length ? need : supps;
  if(!L.length) return 'none'; const n = L.filter(s => takesOf(d, s.id).length).length; return n === L.length ? 'done' : n ? 'part' : 'miss'; }
// Recipes: the saved recipe you can cook now with the most of its ingredients in My Fridge
function fhCookable(){ const ids = r => r && r.type === 'my' ? r.id : r && r.type === 'gen' ? ((foods.find(f => f.gid === r.id) || {}).id || null) : null;
  return meals.filter(m => !m.quick && (m.ingredients || []).some(i => i.ref)).map(m => { const ing = m.ingredients.filter(i => i.ref), miss = ing.filter(i => { const id = ids(i.ref); return !id || stockOf(id) <= 0; });
    return { m, have: ing.length - miss.length, of: ing.length, miss }; }).sort((a, b) => (b.have / b.of) - (a.have / a.of) || (b.m.timesCooked || 0) - (a.m.timesCooked || 0))[0] || null; }

function renderFoodHub(fresh){
  if(!$('fhFoods')) return;
  const on = kitchenOn(), empty = (k, ic) => `<p class="btempty">${esc(t(k))}</p>`;
  // Foods
  { const st = fhStats(), s = fhPick(st.out, fresh);
    setHTML($('fhFoods'), `<div class="btcol">${fhHead('bag', 'tabStore')}${foods.length ? `<div class="bthero"><b class="btnum">${foods.length}</b><span>${esc(t(foods.length === 1 ? 'fhSaved1' : 'fhSaved'))}</span></div>
      ${s ? `<div class="btstat${s.big ? ' big' : ''}"><b>${esc(s.num)}</b><span>${esc(s.sub)}</span></div>` : ''}` : empty('fhNoFoods')}</div>${foods.length ? fhRing(st.cls) : ''}`);
    $('fhFoods').setAttribute('aria-label', t('tabStore')); }
  // Meals: top 3 by times logged this month
  { const lg = fhLogged('meal'), top = Object.keys(lg).map(id => [meals.find(m => m.id === id), lg[id]]).filter(x => x[0] && x[0].quick).sort((a, b) => b[1] - a[1]).slice(0, 3), mx = top.length ? top[0][1] : 1;
    setHTML($('fhMeals'), fhHead('bowl', 'tabMyMeals', top.length ? esc(t('fhMonthL')) : '') + (top.length ? `<div class="btbars">${top.map(([m, n], i) => `<div class="btbar"><span><em>${esc(m.name)}</em><b>${n}×</b></span><i><u style="transform:scaleX(${(n / mx).toFixed(3)})"></u></i></div>`).join('')}</div>` : empty(meals.some(m => m.quick) ? 'fhNoMealsMonth' : 'fhNoMeals'))); }
  // Supps: title only, a small question under it with a Yes button that logs today's supplements (wire/02), the last 7 days (a tick = all taken)
  { const d0 = todayKey(), left = fhSuppLeft().length;
    const wd = t('wdShort').split(' '), dots = Array.from({ length: 7 }, (_, i) => { const d = addDays(d0, i - 6), st = suppDayState(d), dw = new Date(d + 'T12:00:00').getDay();
      return `<span class="sdot ${st}${i === 6 ? ' today' : ''}"><i>${st === 'done' ? svgIcon('check', 12, 3) : ''}</i><small>${esc((wd[dw] || '').charAt(0))}</small></span>`; }).join('');
    setHTML($('fhSupps'), fhHead('capsule', 'tabSupps') + (supps.length ? `<small class="btsub btask">${esc(t(left ? 'fhSuppAsk' : 'fhSuppDone'))}</small>${left ? `<button class="btn primary btyes" type="button" data-suppyes>${esc(t('fhYes'))}</button>` : ''}<div class="sdots">${dots}</div>` : empty('fhNoSupps'))); }
  // Recipes: one you can cook now
  { const r = fhCookable();
    setHTML($('fhRecipes'), fhHead('pot', 'tabMeals') + (r ? `<div class="btringrow">${fhMiniRing(r.have, r.of, 'acc')}<span class="btsub">${esc(t('fhInFridge'))}</span></div><b class="btname">${esc(r.m.name)}</b><span class="btsub">${esc(r.miss.length ? t('fhMissing', { x: r.miss.map(i => i.ref.name).slice(0, 2).join(', ') }) : t('fhReady'))}</span>`
      : empty(meals.some(m => !m.quick) ? 'fhNoIng' : 'fhNoRecipes'))); }
  // Shopping List
  { const tot = groc.length, done = groc.filter(g => g.done).length, next = groc.filter(g => !g.done).slice(0, 2);
    setHTML($('fhGroc'), fhHead('cart', 'fhGrocT') + (!on ? empty('invOff') : tot ? `<div class="btringrow">${fhMiniRing(done, tot, 'ok')}<span class="btsub">${esc(tot - done ? t('fhToBuy', { n: tot - done }) : t('fhAllBought'))}</span></div><div class="btlist">${next.map(g => `<span>${esc(g.name)}${g.size ? ' ' + esc(fmtSize(g.size, g.unit || 'g')) : ''}${g.count > 1 ? ' ×' + g.count : ''}</span>`).join('')}</div>` : empty('fhNoGroc'))); }
  // My Fridge: count, a bar split by Food Library category (the most common first; past 4 kinds the rest join "Other"), low items in amber
  { const its = on ? liveItems() : [], cnt = {}; its.forEach(x => { const c = x.info.food && CAT[x.info.food.cat] ? x.info.food.cat : 'other'; cnt[c] = (cnt[c] || 0) + 1; });
    let ks = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || CATS.findIndex(c => c.id === a) - CATS.findIndex(c => c.id === b));
    if(ks.length > 4){ const rest = ks.slice(3).filter(k => k !== 'other'), o = rest.reduce((n, k) => n + cnt[k], cnt.other || 0); ks = ks.slice(0, 3).filter(k => k !== 'other'); cnt.other = o; if(ks.length < 4) ks.push('other'); }
    const low = [...new Set(its.filter(x => x.info.food && +x.info.food.minStock > 0 && stockOf(x.info.food.id) < +x.info.food.minStock).map(x => x.info.name))];
    setHTML($('fhInv'), fhHead('fridge', 'tFridge', low.length ? `<em class="btlow">${esc(t('fhLow', { x: low.slice(0, 2).join(', ') }))}</em>` : '') + (!on ? empty('invOff') : its.length ? `<div class="bthero"><b class="btnum">${its.length}</b><span>${esc(t(its.length === 1 ? 'fhItem1' : 'fhItems'))}</span></div>
      <div class="fstack">${ks.map(k => `<i class="kc-${k}" style="flex:${cnt[k]}"></i>`).join('')}</div><div class="flegend">${ks.map(k => `<span><i class="kc-${k}"></i>${esc(L(CAT[k]) || t('fhOther'))} ${cnt[k]}</span>`).join('')}</div>` : empty('fhNoFridge'))); }
  ['fhInv', 'fhGroc'].forEach(id => { $(id).classList.toggle('off', !on); $(id).setAttribute('aria-disabled', String(!on)); });
  [['fhMeals', 'tabMyMeals'], ['fhSupps', 'tabSupps'], ['fhRecipes', 'tabMeals'], ['fhGroc', 'tGroc'], ['fhInv', 'tFridge']].forEach(([id, k]) => $(id).setAttribute('aria-label', t(k)));
  bentoFit('pgFoods', 'fBento');
  if(fresh) bentoRise($('fBento'));
}

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
  if(!foods.length){ $('list').innerHTML = `<div class="empty">${t('noFoods')}</div>`; return; }
  if(!items.length){ $('list').innerHTML = `<div class="empty">${q ? t('nothingMatches', { q: esc($('search').value) }) : t('nothingHere')}</div>`; return; }
  const cardOf = f => {
    const pt = portion(f), x = pt.amt / 100;
    const sc = v => (v === null || v === undefined || isNaN(v)) ? null : v * x;
    // Refinements #4 (change 9): the name is the hero; a bigger category icon with the brand quietly beside it (no "No Brand" label);
    // kcal in the plain text colour; P, C, F in their macro colours (fibre stays in the food's details); basis and fridge stock as muted text
    const brand = !f.noBrand && f.brand ? `<span class="fbrand">${esc(f.brand)}</span>` : '';
    return `<div class="card frow" data-id="${f.id}" style="position:relative">
      <div class="body">
        <div class="row frhead"><span class="fric">${catIcon(f.cat, 24)}${brand}</span><div class="kcalcol"><div class="kcal">${f.kcal == null ? '–' : Math.round(f.kcal * x)} <small>kcal</small></div>${stockBadge(f)}</div></div>
        <div class="name">${esc(foodName(f))}${f.checked ? ` <span class="fchk" title="${t('chkTick')}" aria-label="${t('chkTick')}">${svgIcon('check', 10, 3.4)}</span>` : ''}</div>
        <div class="row frfoot">
          <div class="macros"><span class="m p">P <b>${fmt(sc(f.protein))}</b></span><span class="m c">C <b>${fmt(sc(f.carbs))}</b></span><span class="m f">F <b>${fmt(sc(f.fat))}</b></span></div>
          <span class="fbasis">${pt.label}${pt.size ? ' · ' + pt.size : ''}${f.state !== 'ready' ? ' · ' + t(STATE_KEY[f.state]).toLowerCase() : ''}</span>
        </div>
      </div></div>`;
  };
  // 0.6.1: no search = categories as drop-downs; searching shows the matches straight away
  if(tokens.length){ $('list').innerHTML = items.map(cardOf).join(''); return; }
  const groups = {}; items.forEach(f => (groups[f.cat || 'none'] = groups[f.cat || 'none'] || []).push(f));
  const order = [...CATS.map(c => c.id).filter(id => groups[id]), ...(groups.none ? ['none'] : [])];
  const allOpen = !!FCAT.__all;   // 0.6.5.1: everything sits inside one All Foods fold
  $('list').innerHTML = `<button class="foldh catfold allfold ${allOpen ? 'open' : ''}" data-fcat="__all"><b>${t('allFoods')}</b><span class="fn">${items.length}</span><i>${svgIcon('down', 18)}</i></button>` + (!allOpen ? '' : '<div class="foldb allbody">' + order.map(id => { const c = CATS.find(x => x.id === id), op = !!FCAT[id];
    return `<button class="foldh catfold ${op ? 'open' : ''}" data-fcat="${id}"><b>${c ? catIcon(c.id) + esc(L(c)) : t('noType')}</b><span class="fn">${groups[id].length}</span><i>${svgIcon('down', 18)}</i></button>` +
      (op ? `<div class="foldb catbody">${groups[id].map(cardOf).join('')}</div>` : ''); }).join('') + '</div>');

}

// ======================= type picker =======================
function mountPicker(el, current, onPick){
  let showCat = current && current.cat ? current.cat : null;
  const draw = () => {
    if(!showCat){
      el.innerHTML = `<div class="pgrid">${CATS.map(c => `<button class="pitem ${current&&current.cat===c.id?'on':''}" data-c="${c.id}">${catIcon(c.id, 22)}${esc(L(c))}</button>`).join('')}</div>`;
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
  else if(F.serving && F.source !== 'openfoodfacts') el.textContent = t('usingEst', { s: fmtSize(F.serving, F.unit) });
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
  const pw = foodPieceSize({pieces: F.pieces, piece: num('fPiece'), serving: F.serving, source: F.source});
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
  F.piecesTouched = mode === 'edit' || !!data.gid || ['openfoodfacts','label photo','item photo'].includes(data.source);
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
    if(c === 'log') return openAmt({ mode: 'log', info: { name: foodName(saved), icon: iconOf(saved) || '', unit: saved.unit, per: saved, food: saved, piece: foodPieceSize(saved), pw: saved.pieces } }); }
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

// Normalize only the units the food form can represent. Keep grams and millilitres separate.
function labelAmount(value, unit){
  const n = Number(String(value ?? '').replace(',', '.'));
  const scale = { g: 1, gr: 1, kg: 1000, ml: 1, cl: 10, l: 1000, lt: 1000 }[unit];
  return n > 0 && Number.isFinite(n) && scale ? { size: n * scale, unit: ['g','gr','kg'].includes(unit) ? 'g' : 'ml' } : null;
}

function labelWeights(text){
  const re = /(\d+(?:[.,]\d+)?)\s*(kg|gr|g|ml|cl|lt|l|γρ)(?![\p{L}])/giu;
  return [...String(text || '').matchAll(re)].map(m => labelAmount(m[1], m[2].toLowerCase().replace('γρ','g')));
}

function parseQty(p){
  const structured = labelAmount(p.product_quantity, String(p.product_quantity_unit || '').toLowerCase());
  if(structured) return structured;
  const text = norm(p.quantity);
  const weights = labelWeights(text);
  if(weights.length !== 1) return null;
  const multi = text.match(/^(\d+)\s*(?:bars?|μπαρεσ)?\s*[x×]\s*\d/i);
  const each = text.match(/^(\d+)\s*(?:bars?|μπαρεσ|pieces?|slices?)\s+(?:of\s+)?\d+.*(?:each|ανά τεμάχιο|ανα τεμαχιο)$/u)
    || text.match(/^(\d+)\s*(?:bars?|μπαρεσ|pieces?|slices?)\s+of\s+\d/u);
  if(each) return { ...weights[0], size: Number(each[1]) * weights[0].size };
  if(multi) return +multi[1] > 0 ? { ...weights[0], size: +multi[1] * weights[0].size } : null;
  if(/[x×]\s*\d/i.test(text)) return null;
  return weights[0];
}

// Counts need explicit label evidence. A packet can contain two bars and a serving can be half a bar.
function offPortions(p, pack){
  const servingText = norm(p.serving_size);
  const qtyText = norm(p.quantity);
  const unit = String(p.serving_quantity_unit || '').toLowerCase();
  const weights = labelWeights(servingText);
  const printed = weights.length === 1 ? weights[0] : null;
  const structured = labelAmount(p.serving_quantity, unit || printed?.unit || pack?.unit);
  const basis = pack?.unit || printed?.unit || structured?.unit;
  const agrees = (a,b) => !a || !b || (a.unit === b.unit && Math.abs(a.size - b.size) < 0.11);
  const serving = agrees(printed, structured) && weights.length <= 1 ? printed || structured : null;
  const sv = serving?.unit === basis ? serving?.size : null;
  const result = { serving: sv || null, pieces: 'none', piece: null, unit: basis };
  if(basis !== 'g') return result;
  function count(text){
    const m = text.match(/(?:^|[^\p{L}\d/.,])(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|one|μια|ενα|half(?:\s+(?:a|of a))?|½)\s*(?:(?:cereal|protein|granola|snack)\s+)?(bars?|slices?|pieces?|μπαρα|μπαρεσ|φετα|φετεσ|τεμαχι[οα])(?!\p{L})/u);
    if(!m){
      const oneBar = /^(?:(?:cereal|protein|granola)\s+)?(?:bar|μπαρα)\s*[(,]?\s*\d/u.test(text);
      return oneBar ? { n: 1, kind: 'bar' } : null;
    }
    const raw = m[1].replace(/\s/g,'').replace(',','.');
    let n;
    if(raw.includes('/')){ const [a,b] = raw.split('/').map(Number); n = a / b; }
    else n = /^(one|μια|ενα)$/.test(raw) ? 1 : /^(half|½)/.test(raw) ? 0.5 : Number(raw);
    return Number.isFinite(n) && n > 0 ? { n, kind: /^(bar|μπαρ)/.test(m[2]) ? 'bar' : /^(slice|φετ)/.test(m[2]) ? 'slice' : 'piece' } : null;
  }
  const perServing = count(servingText), perPack = count(qtyText);
  const each = (text, size, c) => {
    if(!c || !size || /\d\s*[-–]\s*\d/.test(text)) return null;
    const oneWeight = /(?:\beach\b|ανά μπάρα|ανα μπαρα)/.test(text);
    return { kind: c.kind, size: oneWeight ? size : size / c.n };
  };
  const a = each(servingText, sv, perServing);
  const b = perPack && pack ? { kind: perPack.kind, size: pack.size / perPack.n } : null;
  if(a && b && (a.kind !== b.kind || !agrees({unit:'g',size:a.size},{unit:'g',size:b.size}))) return result;
  const barName = norm([p.product_name, p.product_name_en, p.product_name_el].filter(Boolean).join(' '));
  const singleBar = /(?:^|[^\p{L}])(?:bar|μπαρα)(?!\p{L})/u.test(barName) && !/(?:bars\b|μπαρεσ|pack|κουτι)/u.test(barName)
    && sv && pack && Math.abs(sv - pack.size) < 0.01 && !/\d\s*[×x]\s*\d/.test(qtyText)
    && (!servingText || /^(?:\d+(?:[.,]\d+)?\s*(g|gr|γρ))$/.test(servingText));
  const known = a || b || (singleBar ? { kind: 'bar', size: sv } : null);
  if(known && known.size > 0 && (!pack || known.size <= pack.size + .1)){
    result.pieces = known.kind; result.piece = Math.round(known.size * 1000) / 1000;
  }
  return result;
}

// Photo scans use the same count rules as a barcode. Only printed portions enter a saved record.
function photoPortions(d){
  const pack = labelAmount(d.packSize, d.unit);
  const p = offPortions({ product_name: d.name, serving_size: d.servingLabel, quantity: d.quantityLabel }, pack);
  Object.assign(d, {pieces: p.pieces, piece: p.piece, serving: p.serving});
  if(pack) Object.assign(d, {packs: [pack.size], usualPack: pack.size, unitFromLabel: true});
}

function offToFood(p, code){
  const n = p.nutriments || {};
  const g = k => { const v = n[k + '_100g']; const value = typeof v === 'number' || (typeof v === 'string' && v.trim()) ? Number(v) : NaN; return Number.isFinite(value) && value >= 0 ? value : null; };
  let kcal = g('energy-kcal'); const kj = g('energy-kj') ?? g('energy'); if(kcal === null && kj !== null) kcal = Math.round(kj / 4.184);
  const q = parseQty(p), portions = offPortions(p, q), potassium = g('potassium');
  return {
    barcode: code || p.code || null, brand: (p.brands || '').split(',')[0].trim(),
    name: (lang === 'el' ? p.product_name_el : p.product_name_en) || p.product_name || p.product_name_el || p.product_name_en || p.generic_name || '',
    hint: (p.categories_tags || []).slice(-3).map(x => x.replace(/^\w\w:/,'').replace(/-/g,' ')).join(' '),
    kcal, protein: g('proteins'), carbs: g('carbohydrates'), fat: g('fat'),
    fiber: g('fiber'), sugar: g('sugars'), satFat: g('saturated-fat'), salt: g('salt'), potassium: potassium === null ? null : Math.round(potassium * 1000),
    ...portions, unitFromLabel: !!portions.unit, packs: q ? [q.size] : [], usualPack: q ? q.size : null, source: 'openfoodfacts'
  };
}

async function lookup(code){
  open('ovScan'); status($('scanStatus'), t('lookingUp', { c: code }));
  const existing = foods.find(f => f.barcode === code);
  if(existing){ close('ovScan');
    if(scanCtx === 'fridge'){ scanCtx = null; openFridgeAdd(existing); return; }
    if(scanCtx === 'log'){ scanCtx = null; openAmt({ mode: 'log', info: fInfo_(existing) }); return; }
    toast(t('alreadyHave')); openForm(barcodePortionsForView(existing), null, 'edit'); return; }
  const local = LABEL_BY_CODE[code];
  if(local){
    close('ovScan');
    if(scanCtx === 'log'){ scanCtx = null; openAmt({ mode: 'log', info: fInfo_(saveGeneric(local)) }); }
    else if(scanCtx === 'fridge'){ scanCtx = null; openFridgeAdd(saveGeneric(local)); }
    else openForm({ ...local, name: L(local), source: 'label' }, local.brand, 'new', { fromScan: true });
    return;
  }
  try{
    const r = await fetchT(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, {}, 9000);
    const j = await r.json();
    if(j.status !== 1 || !j.product) return notFound(code, t('notInOFF'));
    const data = offToFood(j.product, code);
    if(data.protein === null && data.carbs === null && data.fat === null) return notFound(code, t('noMacros'));
    if([data.kcal, data.protein, data.carbs, data.fat].some(v => v == null)){
      close('ovScan'); openForm(data, 'Open Food Facts', 'new', { fromScan: true }); return;
    }
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

function itemHtml(kind, i, icon, title, subline){ return `<button class="sitem" data-k="${kind}" data-i="${i}"><span class="t"><b>${icon || ''}${esc(title)}</b><small>${subline}</small></span></button>`; }

function drawIngResults(){
  const text = $('iSearch').value.trim();
  if(!text){ $('iResults').innerHTML = `<div class="hint">${t('typeToSearch')}</div>`; $('iSaveWrap').classList.add('hide'); return; }
  lastLocal = searchLocal(text);
  let h = '';
  if(lastLocal.mine.length) h += `<div class="sgroup">${t('grpMine')}</div>` + lastLocal.mine.map((f,i) => itemHtml('m', i, catIcon(f.cat), foodName(f), `${f.noBrand ? '' : esc(f.brand) + ' · '}${macroLine(f)}`)).join('');
  if(lastLocal.std.length) h += `<div class="sgroup">${t('grpStd')}</div>` + lastLocal.std.map((g,i) => itemHtml('s', i, catIcon(g.cat), L(g), `${macroLine(g)} · ${t('stdValues')}`)).join('');
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
  $('cTotals').innerHTML = `<span>${t(D && D.quick ? 'qmTotal' : 'rawTotal')}: <b>${fmtSize(tot.raw, 'g')}</b></span><span><b>${Math.round(tot.kcal)}</b> kcal · P ${Math.round(tot.protein)} · C ${Math.round(tot.carbs)} · F ${Math.round(tot.fat)}</span>`;
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
  if(AI.hasKey()){
    try{ const have = foods.slice(0, 80).map(f => foodName(f)).join('; ');
      r = await gemini(`Turn this home recipe into structured data. Write names in ${lang === 'el' ? 'Greek' : 'English'}. Text: """${txt}"""
Return ONLY JSON: {"title":string,"servings":number,"ingredients":[{"name":string,"name_en":string,"grams":number}],"steps":[string]}
Rules: grams for the whole batch as weighed raw; convert spoons/cups/pieces to grams; include oil; servings = the portions the text mentions, else 1; title = a short dish name; name_en = plain generic English food name; steps only if the text has them.
Foods the user already has (use these names when they fit): ${have || 'none listed'}`, null, null, null, { robot: 'chef' }); }
    catch(err){ if(err.cancelled) return; toast(t('cqFail')); r = null; }
  }
  if(!r || !Array.isArray(r.ingredients) || !r.ingredients.length){ r = parseRecipe(txt); if(!r.ingredients.length){ toast(t(AI.hasKey() ? 'cqFail' : 'cqNoKey')); return; } }
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
  const recs = meals.filter(m => !m.quick);
  const items = recs.filter(m => !tokens.length || tokens.every(tk => norm(m.name + ' ' + m.ingredients.map(i => i.name).join(' ')).includes(tk)))
    .sort((a,b) => (b.cookedAt||'').localeCompare(a.cookedAt||''));
  $('mCount').textContent = recs.length ? (items.length === 1 ? t('nMeal') : t('nMeals', { n: items.length })) : '';
  if(!recs.length){ $('mList').innerHTML = `<div class="empty">${t('noMeals')}</div>`; return; }
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

// Meals tab: one-plate meals (meals[].quick). The numbers on the card are for the whole meal; one tap on Log adds it to today.
function mealWhole(m){ const w = +m.cookedWeight || 0, x = w / 100, g = k => (+m[k] || 0) * x;
  return { g: w, kcal: Math.round(g('kcal')), protein: r1(g('protein')), carbs: r1(g('carbs')), fat: r1(g('fat')) }; }
function renderQuickMeals(){
  const box = $('qmList'); if(!box) return;
  const all = meals.filter(m => m.quick), tokens = norm($('qmSearch').value).split(' ').filter(Boolean);
  const items = all.filter(m => !tokens.length || tokens.every(tk => norm(m.name + ' ' + (m.ingredients || []).map(i => (i.ref && i.ref.name) || i.name || '').join(' ')).includes(tk)))
    .sort((a, b) => (b.updatedAt || b.cookedAt || '').localeCompare(a.updatedAt || a.cookedAt || ''));
  $('qmCount').textContent = all.length ? (items.length === 1 ? t('nMeal') : t('nMeals', { n: items.length })) : '';
  if(!all.length){ box.innerHTML = `<div class="empty">${t('noQMeals')}</div>`; return; }
  if(!items.length){ box.innerHTML = `<div class="empty">${t('nothingMatches', { q: esc($('qmSearch').value) })}</div>`; return; }
  box.innerHTML = items.map(m => { const w = mealWhole(m), ing = (m.ingredients || []).map(i => (i.ref && i.ref.name) || i.name || '').filter(Boolean).join(', ');
    return `<div class="card qmcard" data-qid="${m.id}"><div class="ficon">${svgIcon('bowl', 22)}</div><div class="body">
      <div class="row"><div class="name">${esc(m.name)}</div><div class="kcal">${w.kcal} <small>kcal</small></div></div>
      <div class="row" style="margin-top:2px"><div class="macros"><span class="m p">P <b>${fmt(w.protein)}</b></span><span class="m c">C <b>${fmt(w.carbs)}</b></span><span class="m f">F <b>${fmt(w.fat)}</b></span></div><button class="btn small primary qmlog" type="button" data-qlog="${m.id}">${esc(t('mealLog'))}</button></div>
      ${ing ? `<div class="qming">${esc(ing)}</div>` : ''}</div></div>`; }).join('');
}
function logQuickMeal(id){
  const m = meals.find(x => x.id === id); if(!m || !(m.cookedWeight > 0)) return;
  const d = todayKey(), n = (dayLog[d] || []).length;
  logEntry(d, { name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null }, m.cookedWeight);
  Phone.haptic(); renderAll();
  toast(t('mealLogged', { n: m.name }), t('undo'), () => { if(dayLog[d] && dayLog[d].length > n){ dayLog[d].pop(); if(!dayLog[d].length) delete dayLog[d]; saveLog(); renderAll(); } });
}
// Move a saved meal between Recipes and Meals. A weighed batch becomes one plate: its numbers are scaled so the whole raw total is one meal. Undo restores the original.
function moveMeal(id){
  const i = meals.findIndex(x => x.id === id); if(i < 0) return; const before = JSON.parse(JSON.stringify(meals[i])), m = meals[i];
  if(m.quick){ delete m.quick; }
  else { const raw = +m.rawWeight || 0, cw = +m.cookedWeight || 0;
    if(!m.cookedEstimated && raw > 0 && cw > 0 && Math.abs(raw - cw) > 0.5){ const k = cw / raw;
      ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'salt', 'potassium'].forEach(q => { if(typeof m[q] === 'number') m[q] = q === 'kcal' || q === 'potassium' ? Math.round(m[q] * k) : Math.round(m[q] * k * 100) / 100; });
      m.cookedWeight = Math.round(raw); m.cookedEstimated = true; }
    m.quick = true; }
  m.updatedAt = new Date().toISOString();
  if(!saveMeals()){ meals[i] = before; return; }
  close('ovMeal'); renderAll(); go(m.quick ? 'mymeals' : 'meals');
  toast(t(m.quick ? 'mealMoved' : 'mealMovedBack', { n: m.name }), t('undo'), () => { const j = meals.findIndex(x => x.id === id); if(j > -1){ meals[j] = before; saveMeals(); renderAll(); } });
}

function openMeal(id){
  const m = meals.find(x => x.id === id); if(!m) return; openMealId = id;
  $('mdName').textContent = m.name;
  const q = !!m.quick; $('mdWhen').textContent = q ? t('mealWhole') : m.cookedEstimated ? t('estimated') : t('per100cooked');
  $('mdCookAgain').classList.toggle('hide', q); $('mdMove').textContent = t(q ? 'mealMoveBack' : 'mealMoveTo');
  $('mdMeta').textContent = t('mealMeta', { d: fmtDate(m.cookedAt), s: fmtSize(m.cookedWeight, 'g') }) + (m.timesCooked > 1 ? ' · ' + t('timesCooked', { n: m.timesCooked }) : '');
  { const w = q ? mealWhole(m) : m; $('mdStats').innerHTML = `<div><b>${w.kcal}</b><small>kcal</small></div><div><b style="color:var(--p)">${fmt(w.protein)}</b><small>${t('protein')}</small></div><div><b style="color:var(--c)">${fmt(w.carbs)}</b><small>${t('carbs')}</small></div><div><b style="color:var(--f)">${fmt(w.fat)}</b><small>${t('fat')}</small></div>`; }
  $('mdPlate').value = ''; $('mdPlateRes').classList.remove('show');
  $('mdIngs').innerHTML = `<ul style="color:var(--text)">${m.ingredients.map(i => `<li>${esc(i.ref.name)} — ${fmtSize(i.grams, i.ref.unit)}</li>`).join('')}</ul>`;
  $('mdRecipe').innerHTML = m.recipe ? `<h3>${t('recipeT')}</h3>` + recipeHtml(m.recipe, true) : `<p class="hint">${t('noRecipe')}</p>`;
  open('ovMeal');
}

function drawSupTimes(){ $('supTimes').innerHTML = SLOTS.map(sl => `<button data-t2="${sl}" class="${SU.times.includes(sl) ? 'on' : ''}">${t('slot_' + sl)}</button>`).join(''); }

function faHint(){
  const f = FA.food, a = num('faAmt') || 0, n = num('faCount') || 1;
  $('faHint').textContent = f && foodPieceSize(f) ? `≈ ${Math.round(a * n / foodPieceSize(f))} ${WS(f.pieces)}` : (n > 1 ? `= ${fmtSize(a * n, f ? f.unit : 'g')}` : '');
}

function amRes(){
  const a = num('amAmt'), el = $('amRes');
  if(AM && !AM.typing && AM.units){ const u = AM.units[AM.u] || { size: 1 }; $('amN').value = a > 0 ? r1(a / u.size) : ''; }
  $('amParts').innerHTML = AM && AM.mode === 'editlog' ? mealPartsHtml(AM.entry, a) : '';   // a Food Coach meal: its parts (js/meal.js)
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
  const box = $('useUp'), kit = kitchenOn(); $('cLeft').checked = kit && mode !== 'edit'; $('cLeftWrap').classList.toggle('hide', mode === 'edit' || !kit);   // Refinements #4: no leftovers toggle with Kitchen off
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
  const existing = foods.find(f => f.gid === g.gid || (g.barcode && f.barcode === g.barcode)); if(existing) return existing;
  const now = new Date().toISOString();
  const f = normFood({ id: uid(), gid: g.gid, name: L(g), brand:g.brand || '', noBrand:!g.brand, barcode:g.barcode || null, cat:g.cat, sub:g.sub, unit:g.unit, state:g.state,
    kcal:g.kcal, protein:g.protein, carbs:g.carbs, fat:g.fat, fiber: g.fiber ?? null, salt: g.salt ?? null, potassium: g.potassium ?? null,
    sugar:g.sugar, satFat:g.satFat, packs:g.packs || [], usualPack:g.usualPack, serving:g.serving,
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

function openCook(meal, mode, quick){
  const qk = quick != null ? !!quick : !!(meal && meal.quick);
  D = { quick: qk, id: mode === 'edit' ? meal.id : (mode === 'again' ? meal.id : null), mode, recipe: meal && meal.recipe ? meal.recipe : null,
        rows: meal ? meal.ingredients.map(r => ({ ...r, key: uid() })) : [], timesCooked: meal ? (meal.timesCooked || 1) : 0 };
  $('cookTitle').textContent = qk ? t(mode === 'edit' ? 'editMealT' : 'newMealT') : mode === 'edit' ? t('editMeal') : mode === 'again' ? t('cookAgainT') : t('cookMeal');
  $('cName').value = meal ? meal.name : '';
  $('cPotFull').value = ''; $('cPotEmpty').value = ''; $('cCooked').value = mode === 'edit' && meal && !meal.cookedEstimated ? meal.cookedWeight : '';
  $('cDelete').classList.toggle('hide', mode !== 'edit');
  renderUseUp(mode); drawRecipeBox(); drawRows(); cookStep(true);
  // a Meal (one plate) has no recipe steps and no pot weight: the whole of its ingredients is the meal
  ['recipeBox', 'pasteBtn', 'cWeighLink'].forEach(id => $(id).classList.toggle('hide', qk)); if(qk) $('cWeighBox').classList.add('hide');
  { const lb = document.querySelector('label[for="cName"]'), hint = $('ingHint') || document.querySelector('#cookMain .hint');
    if(lb) lb.textContent = t(qk ? 'qmName' : 'mealName'); $('cName').placeholder = t(qk ? 'qmNamePh' : 'mealNamePh'); if(hint) hint.textContent = t(qk ? 'qmIngHint' : 'ingHint'); }
  if(qk){ $('cLeft').checked = false; $('cLeftWrap').classList.add('hide'); }
  open('ovCook');
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
    packs: d.packs || [], usualPack: d.usualPack || null, pieces: d.pieces || 'none', piece: d.piece || null, serving: d.serving || null, sugar: d.sugar, satFat: d.satFat, source: d.source || 'online', createdAt: now, updatedAt: now });
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
