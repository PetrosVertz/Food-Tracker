// Create Custom Exercise (V27): name (stored in Title Case) → muscles on the front/back body map OR from pills → (heads) → equipment → save.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// Map: one tap = that muscle, straight on to equipment; hold = several muscles (taps then add/remove); pinch / + − / double-tap = zoom; one
// finger drags a zoomed map (shared drag helper). Pills: tap = fold into it and go on (its heads, if it has any, else equipment); hold = several,
// with Done on the status line; then each chosen muscle's heads one at a time (1 of N). Equipment always starts empty and is never guessed.
// Saving goes through exCustom + saveG('custom') (Store); the new exercise is added through the picker (js/expick.js › pkPick).

const CX_HOLD = 520;
let CX = null, CX_ANIM = { n: 0, layer: null, busy: false };
const cxReduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const cxNew = () => ({ name: '', mus: [], heads: new Set(), pri: null, e: null, uni: false, stage: 'muscle', mode: 'single', src: 'pill',
  cur: 0, hMulti: false, hTouched: false, hAll: false, zoom: 1, px: 0, py: 0, mapUsed: false, mapMultiUsed: false, pillMultiUsed: false, headMultiUsed: false });
const cxHas = m => CX.mus.includes(m);
const cxHeadMus = () => CX.mus.filter(m => exmHasHeads(m));
const cxCurMus = () => { const q = cxHeadMus(); if(!q.length) return null; CX.cur = Math.max(0, Math.min(CX.cur, q.length - 1)); return q[CX.cur]; };
const cxHeadsOf = m => [...CX.heads].filter(h => exmHeads(m).includes(h));
const cxMuscleOfShape = h => h === 'abductors' ? 'abductors' : exmOfHead(h);
const cxOrdered = () => CX.pri && cxHas(CX.pri) ? [CX.pri, ...CX.mus.filter(m => m !== CX.pri)] : CX.mus.slice();

function openExCreate(){
  cxCancelAnim(); CX = cxNew();
  { const sb = $('ovExCreate').querySelector('.cxsheet>.sback'); if(sb){ sb.classList.add('cxback'); $('cxBack').replaceWith(sb); sb.id = 'cxBack'; } }   // the app's back arrow (wire/05) is the creator's back
  $('cxScroll').innerHTML = cxBody(); $('cxVal').textContent = '';
  open('ovExCreate'); cxMapSetup(); cxSync(); $('cxScroll').scrollTop = 0;
  setTimeout(() => { const el = $('cxName'); if(el && $('ovExCreate').classList.contains('open')) el.focus({ preventScroll: true }); }, 90);
}
function cxClose(){ cxCancelAnim(); clearTimeout(CX_PRESS.tm); close('ovExCreate'); setTimeout(() => { const s = $('exSearch'); if($('ovExPick').classList.contains('open') && s) s.blur(); }, 0); }
// Back / Escape: a multi-select is left first, then the creator closes (ui.js goBack)
function cxBack(){ if(!CX) return false; if(CX.mode !== 'single'){ cxExitMulti(); return true; } if(CX.hMulti){ cxExitHeadMulti(); return true; } cxClose(); return true; }

// ---------- the page ----------
function cxMapSvg(){
  return anatomySVG({ mode: 'select', labels: false, muscleOf: (h, hs) => { const m = cxMuscleOfShape(hs && hs[0] || h); return CX_MUSCLES.includes(m) ? m : null; }, colorOf: exmCol, idp: 'cx', max: 290 });
}
function cxBody(){
  return `<section class="cxsec"><div class="cxsh"><strong>${esc(t('cxName'))}</strong><span>${esc(t('cxRequired'))}</span></div>
    <label class="cxinw"><input class="cxin" id="cxName" maxlength="60" autocapitalize="words" autocomplete="off" enterkeyhint="done" spellcheck="false" placeholder="${esc(t('cxNamePh'))}" aria-label="${esc(t('cxName'))}"></label></section>
  <section class="cxsec cxmus"><div class="cxsh"><strong>${esc(t('cxMusT'))}</strong><span>${esc(t('cxMusSub'))}</span></div>
    <div class="cxmap" id="cxMap"><div class="cxvp" id="cxVp"><div class="cxzl" id="cxZl">${cxMapSvg()}</div></div><span class="cxzb" id="cxZb" aria-hidden="true">100%</span>
      <div class="cxzc"><button type="button" data-zoom="in" aria-label="${esc(t('cxZoomIn'))}">${svgIcon('plus', 17, 2.4)}</button><button type="button" data-zoom="out" aria-label="${esc(t('cxZoomOut'))}">${gymIco('minus', 17, 2.4)}</button><button type="button" data-zoom="reset" class="cxzr">${esc(t('cxReset'))}</button></div>
      <div class="cxml" aria-hidden="true"><span>${esc(t('front'))}</span><span>${esc(t('backSide'))}</span></div></div>
    <p class="cxmh" id="cxMh"></p>
    <div class="cxflow" id="cxFlow">${cxFlowHtml()}</div><div class="cxchosen" id="cxChosen">${cxChosenHtml()}</div></section>
  <section class="cxsec"><div class="cxsh"><strong>${esc(t('cxMoveT'))}</strong></div>
    <button type="button" class="cxtog" id="cxUni" role="switch" aria-checked="false"><span><strong>${esc(t('cxUniT'))}</strong><small>${esc(t('cxUniSub'))}</small></span><span class="cxsw" aria-hidden="true"></span></button></section>
  <section class="cxsec"><div class="cxsh"><strong>${esc(t('cxIntelT'))}</strong><span>${esc(t('cxAuto'))}</span></div>
    <div class="cxpol"><span class="cxpi no" aria-hidden="true">${svgIcon('x', 15, 2.6)}</span><div><b>${esc(t('cxNoRank'))}</b><p>${esc(t('cxNoRankSub'))}</p></div></div>
    <div class="cxpol"><span class="cxpi" aria-hidden="true">${gymIco('clock', 16, 2.2)}</span><div><b>${esc(t('cxRecT'))}</b><p>${esc(t('cxRecSub'))}</p></div></div></section>
  <p class="cxnote" id="cxShareHint">${esc(t('cxShareHint'))}</p>`;
}
function cxChosenHtml(){
  if(!CX.mus.length) return `<span class="cxempty">${esc(t('cxNoMus'))}</span>`;
  return cxOrdered().map(m => { const pri = m === CX.pri, nm = pkName(m);
    return `<div class="cxch${pri ? ' pri' : ''}" style="--pc:${exmCol(m)}" role="group" aria-label="${esc(nm)}, ${esc(t(pri ? 'cxPrimary' : 'cxSecondary'))}"><button type="button" class="cxchm" data-pri="${m}" aria-pressed="${pri}" aria-label="${esc(pri ? t('cxPrimary') : t('cxMakePri', { n: nm }))}"><span class="dot" aria-hidden="true"></span><span>${esc(nm)}</span>${pri ? `<span class="cxpt">${esc(t('cxPrimary'))}</span>` : ''}</button><button type="button" class="cxrm" data-rm="${m}" aria-label="${esc(t('cxRemove', { n: nm }))}">${svgIcon('x', 12, 2.6)}</button></div>`; }).join('');
}
function cxFlowHtml(){
  const st = CX.stage, multi = CX.mode === 'pill-multi', mapMulti = CX.mode === 'map-multi', hm = st === 'head' ? cxCurMus() : null, q = cxHeadMus(), curHeads = hm ? cxHeadsOf(hm) : [];
  let heading = '', opts = [];
  if(st === 'muscle'){ heading = t(multi ? 'cxChooseMany' : 'pkChoose'); opts = CX_MUSCLES.map(k => ({ k, l: pkName(k), c: exmCol(k), on: cxHas(k), kind: 'm' })); }
  else if(st === 'head'){ heading = t('cxChooseHead', { n: pkName(hm) }); opts = [{ k: 'all', l: t('all'), c: exmCol(hm), on: !curHeads.length, kind: 'h' }, ...exmHeads(hm).map(k => ({ k, l: pkName(k), c: HEAD_COL[k] || exmCol(hm), on: CX.heads.has(k), kind: 'h' }))]; }
  else if(st === 'equipment'){ heading = t('pkChooseEq'); opts = EQ_ORDER.map(k => ({ k, l: exTitle(EL(k)), c: EQ_COL[k], on: CX.e === k, kind: 'e' })); }
  else heading = t('cxComplete');
  const pills = opts.map((o, i) => `<button type="button" class="cxpill${o.on ? ' on' : ''}" data-cx${o.kind}="${o.k}" style="--pc:${o.c};--pi:${Math.min(i, 9)}" aria-pressed="${o.on}">${o.kind !== 'e' ? '<span class="dot" aria-hidden="true"></span>' : ''}<span>${esc(o.l)}</span>${o.kind === 'e' ? eqIcon(o.k, 16) : ''}</button>`).join('');
  const back = st === 'muscle' ? '' : `<button type="button" class="cxfback" data-cxback aria-label="${esc(t('pkPrev'))}">${svgIcon('back', 24, 2.4)}</button>`;
  const canDone = (st === 'muscle' && multi && CX.mus.length > 0) || (st === 'head' && CX.hMulti && CX.hTouched && (curHeads.length > 0 || CX.hAll));
  const done = canDone ? `<button type="button" class="cxdone" data-cxdone>${esc(t('exDone'))}</button>` : '';
  const path = [...cxOrdered().map(m => ({ k: 'muscle', l: pkName(m), c: exmCol(m) })), ...[...CX.heads].map(h => ({ k: 'head', l: pkName(h), c: HEAD_COL[h] }))];
  if(CX.e && (st === 'equipment' || st === 'complete')) path.push({ k: 'equipment', l: exTitle(EL(CX.e)), c: EQ_COL[CX.e] });
  const pathHtml = path.length ? `<div class="cxpath">${path.map((x, i) => `${i ? '<span class="cxpd" aria-hidden="true">·</span>' : ''}<button type="button" data-cxjump="${x.k}" style="color:${gymInk(x.c)}">${esc(x.l)}</button>`).join('')}</div>` : '';
  const n = CX.mus.length, cnt = k => t(k === 1 ? 'cxMus1' : 'cxMusN', { n: k });
  const status = (multi && st === 'muscle') || mapMulti ? `<div class="cxstat"><span>${esc(cnt(n))}</span><button type="button" data-cxexit>${esc(t('cxSingle'))}</button>${done}</div>`
    : st === 'head' && CX.hMulti ? `<div class="cxstat"><span>${esc(curHeads.length ? t(curHeads.length === 1 ? 'cxHead1' : 'cxHeadN', { n: curHeads.length }) : t('cxAllHeads'))}</span><button type="button" data-cxexith>${esc(t('cxSingle'))}</button>${done}</div>` : '';
  const prog = st === 'head' && q.length > 1 ? `<span class="cxprog" aria-label="${esc(t('cxOfL', { i: CX.cur + 1, n: q.length }))}"><span class="cxpc">${esc(t('cxOf', { i: CX.cur + 1, n: q.length }))}</span><span class="cxps" aria-hidden="true">${q.map((_, i) => `<i class="${i < CX.cur ? 'done' : i === CX.cur ? 'cur' : ''}"></i>`).join('')}</span></span>` : '';
  let gt = '', show = false;
  if(st === 'muscle'){ gt = t(multi ? 'cxTapToggle' : 'cxHoldMany'); show = !multi || !CX.pillMultiUsed; }
  else if(st === 'head'){ gt = t(CX.hMulti ? 'cxTapToggle' : 'cxHoldMany'); show = !CX.hMulti || !CX.headMultiUsed; }
  const gesture = `<p class="cxgh${show ? '' : ' off'}" aria-hidden="${!show}">${esc(gt)}</p>`;
  const hasHeads = CX.mus.some(m => exmHasHeads(m)), ch = HEAD_COL[exmHeads(CX.pri || '')[0]] || exmCol(CX.pri || 'other');
  const edit = `<div class="cxedit"><button type="button" class="cxep" data-cxjump="muscle" style="--ec:${exmCol(CX.pri || 'other')};--pi:0"><span class="dot" aria-hidden="true"></span>${esc(t('cxChMus'))}</button>`
    + `<button type="button" class="cxep" data-cxjump="head" ${hasHeads ? '' : 'disabled'} style="--ec:${ch};--pi:1"><span class="dot" aria-hidden="true"></span>${esc(t('cxChHead'))}</button>`
    + `<button type="button" class="cxep" data-cxjump="equipment" style="--ec:${EQ_COL[CX.e] || 'var(--t-accent)'};--pi:2">${esc(t('cxChEq'))}${CX.e ? eqIcon(CX.e, 13) : ''}</button></div>`;
  const multiNow = canDone || (st === 'head' && CX.hMulti) || (st === 'muscle' && multi) || mapMulti;
  return `<div class="cxfh"><strong>${esc(heading)}</strong>${prog}</div>`
    + (st === 'complete' ? edit : `<div class="cxrow">${back}<div class="cxrail" id="cxRail">${pills}</div></div>`)
    + gesture + (multiNow ? '' : pathHtml) + status;
}
function cxSync(){
  const mh = $('cxMh'); if(mh){ const mm = CX.mode === 'map-multi', vis = !CX.mus.length || (mm && !CX.mapMultiUsed);
    const copy = t(mm ? 'cxMapMany' : CX.mapUsed ? 'cxMapTap' : 'cxMapHint'); if(mh.textContent !== copy) mh.textContent = copy;
    mh.classList.toggle('off', !vis); mh.setAttribute('aria-hidden', String(!vis)); }
  const sh = $('cxShareHint'); if(sh){ const on = CX.stage === 'complete'; sh.classList.toggle('on', on); sh.setAttribute('aria-hidden', String(!on)); }
}
function cxUpdate(anim){
  const sc = $('cxScroll'), flow = $('cxFlow'); if(!sc || !flow) return; const pos = sc.scrollTop;
  flow.innerHTML = cxFlowHtml();
  if(anim && !cxReduce()){ flow.classList.remove('in'); void flow.offsetWidth; flow.classList.add('in'); }
  $('cxMap').querySelectorAll('[data-cm]').forEach(el => { const m = el.dataset.cm, on = cxHas(m); el.classList.toggle('sel', on); el.classList.toggle('pri', CX.pri === m); el.setAttribute('aria-pressed', String(on)); });
  $('cxChosen').innerHTML = cxChosenHtml();
  $('cxUni').setAttribute('aria-checked', String(CX.uni));
  const r = $('cxRail'); if(r){ const s = r.querySelector('.on'); if(s && r.scrollWidth > r.clientWidth) r.scrollLeft = Math.max(0, s.offsetLeft - r.offsetLeft - 8); }
  cxSync(); $('cxVal').textContent = ''; sc.scrollTop = pos;
}

// ---------- the pill fold (same motion as the picker, inside the flow card) ----------
function cxCancelAnim(){ CX_ANIM.n++; CX_ANIM.busy = false; if(CX_ANIM.layer){ CX_ANIM.layer.remove(); CX_ANIM.layer = null; } const f = $('cxFlow'); if(f) f.classList.remove('folding', 'moving'); }
async function cxAnimate(btn, act){
  cxCancelAnim(); const n = CX_ANIM.n, flow = $('cxFlow'), rail = $('cxRail');
  if(!btn || !flow || !rail || cxReduce() || !btn.animate){ act(); cxUpdate(true); return; }
  const host = flow.getBoundingClientRect(), b = btn.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const layer = document.createElement('div'); layer.className = 'cxfold'; flow.appendChild(layer); CX_ANIM.layer = layer; CX_ANIM.busy = true;
  const anims = [...rail.querySelectorAll('.cxpill')].map(p => { const r = p.getBoundingClientRect(), c = p.cloneNode(true), me = p === btn;
    [...c.attributes].forEach(a => { if(a.name.startsWith('data-')) c.removeAttribute(a.name); }); c.tabIndex = -1; c.setAttribute('aria-hidden', 'true');
    Object.assign(c.style, { position: 'absolute', left: (r.left - host.left) + 'px', top: (r.top - host.top) + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', pointerEvents: 'none' });
    layer.appendChild(c); const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    const k = me ? [{ transform: 'translate3d(0,0,0) scale(1)', opacity: 1, offset: 0 }, { transform: 'translate3d(0,-1px,0) scale(1.035)', opacity: 1, offset: .35 }, { transform: 'translate3d(0,-2px,0) scale(.98)', opacity: .92, offset: .67 }, { transform: 'translate3d(0,-4px,0) scale(.89)', opacity: 0, offset: 1 }]
      : [{ transform: 'translate3d(0,0,0) scale(1)', opacity: 1, offset: 0 }, { transform: `translate3d(${dx * .28}px,${dy * .28}px,0) scale(.94)`, opacity: .94, offset: .3 }, { transform: `translate3d(${dx * .8}px,${dy * .8}px,0) scale(.55)`, opacity: .44, offset: .72 }, { transform: `translate3d(${dx}px,${dy}px,0) scale(.22)`, opacity: 0, offset: 1 }];
    return c.animate(k, { duration: 255, easing: 'cubic-bezier(.22,.85,.2,1)', fill: 'forwards' }); });
  flow.classList.add('folding', 'moving');
  await new Promise(r => setTimeout(r, 150)); if(n !== CX_ANIM.n) return;
  flow.classList.remove('folding'); act(); cxUpdate(true);
  await Promise.all(anims.map(a => a.finished.catch(() => {}))); if(n !== CX_ANIM.n) return;
  layer.remove(); CX_ANIM.layer = null; CX_ANIM.busy = false; flow.classList.remove('moving');
}

// ---------- choices ----------
function cxStartHeads(){ CX.cur = 0; CX.hMulti = false; CX.hTouched = false; CX.hAll = false; CX.stage = cxHeadMus().length ? 'head' : 'equipment'; }
function cxNextHead(){ const q = cxHeadMus(); CX.hMulti = false; CX.hTouched = false; CX.hAll = false; if(CX.cur + 1 < q.length){ CX.cur++; CX.stage = 'head'; } else CX.stage = 'equipment'; }
function cxDropHeads(m){ const keys = exmHeads(m); CX.heads = new Set([...CX.heads].filter(h => !keys.includes(h))); }
function cxPickMuscle(m, btn){
  if(!CX_MUSCLES.includes(m)) return;
  if(CX.mode === 'pill-multi'){ if(CX_ANIM.busy) return; CX.pillMultiUsed = true; Phone.haptic();
    if(cxHas(m)){ CX.mus = CX.mus.filter(x => x !== m); if(CX.pri === m) CX.pri = CX.mus[0] || null; cxDropHeads(m); } else { CX.mus.push(m); if(!CX.pri) CX.pri = m; }
    cxUpdate(); return; }
  Phone.haptic();
  cxAnimate(btn, () => { CX.mus = [m]; CX.pri = m; CX.heads = new Set(); CX.mode = 'single'; CX.src = 'pill'; cxStartHeads(); });
}
function cxPickHead(h, btn){
  const m = cxCurMus(); if(!m || (h !== 'all' && !exmHeads(m).includes(h))) return;
  if(CX.hMulti){ if(CX_ANIM.busy) return; CX.headMultiUsed = true; CX.hTouched = true; Phone.haptic();
    if(h === 'all'){ cxDropHeads(m); CX.hAll = true; } else { CX.hAll = false; if(CX.heads.has(h)) CX.heads.delete(h); else CX.heads.add(h); }
    cxUpdate(); return; }
  Phone.haptic();
  cxAnimate(btn, () => { cxDropHeads(m); if(h !== 'all') CX.heads.add(h); cxNextHead(); });
}
function cxPickEq(e, btn){ if(!EQUIP[e]) return; Phone.haptic(); cxAnimate(btn, () => { CX.e = e; CX.stage = 'complete'; }); }
// hold a muscle pill: that muscle is chosen at once and more can be tapped; Done (on the status line) goes on
function cxPillMulti(m){ if(!CX_MUSCLES.includes(m)) return; cxCancelAnim(); Phone.vibrate && Phone.vibrate(12);
  CX.mode = 'pill-multi'; CX.src = 'pill'; CX.stage = 'muscle'; CX.pillMultiUsed = false; if(!cxHas(m)) CX.mus.push(m); if(!CX.pri || !cxHas(CX.pri)) CX.pri = m;
  CX.heads.clear(); CX.hAll = false; CX.hMulti = false; CX.hTouched = false; CX.cur = 0; cxUpdate(true); }
function cxHeadMulti(h){ const m = cxCurMus(); if(CX.stage !== 'head' || !m || (h !== 'all' && !exmHeads(m).includes(h))) return; cxCancelAnim(); Phone.vibrate && Phone.vibrate(12);
  CX.hMulti = true; CX.hTouched = true; CX.headMultiUsed = false; if(h === 'all'){ cxDropHeads(m); CX.hAll = true; } else { CX.heads.add(h); CX.hAll = false; } cxUpdate(true); }
function cxDone(){
  if(CX.stage === 'muscle'){ if(CX.mode !== 'pill-multi' || !CX.mus.length) return; CX.mode = 'single'; cxStartHeads(); cxUpdate(true); return; }
  if(CX.stage === 'head'){ const m = cxCurMus(); if(!m || !CX.hMulti || !CX.hTouched || (!cxHeadsOf(m).length && !CX.hAll)) return; cxNextHead(); cxUpdate(true); }
}
// the body map: tap = this muscle, straight to equipment (no head step); hold = several (each later tap adds or removes)
function cxFromMap(m, many){
  if(!CX_MUSCLES.includes(m)) return; CX.mapUsed = true; cxCancelAnim(); Phone.haptic();
  if(CX.mode === 'map-multi' && !many) CX.mapMultiUsed = true;
  if(many && CX.mode !== 'map-multi'){ CX.mus = [m]; CX.pri = m; CX.mode = 'map-multi'; CX.mapMultiUsed = false; }
  else if(CX.mode === 'map-multi'){ if(cxHas(m) && CX.mus.length > 1){ CX.mus = CX.mus.filter(x => x !== m); if(CX.pri === m) CX.pri = CX.mus[0]; } else if(!cxHas(m)) CX.mus.push(m); }
  else { CX.mus = [m]; CX.pri = m; CX.mode = 'single'; }
  CX.heads.clear(); CX.hAll = false; CX.hMulti = false; CX.hTouched = false; CX.cur = 0; CX.src = 'map'; CX.stage = CX.e ? 'complete' : 'equipment';   // equipment already chosen: done
  cxUpdate(true);
}
function cxRemove(m){ CX.mus = CX.mus.filter(x => x !== m); if(CX.pri === m) CX.pri = CX.mus[0] || null; cxDropHeads(m); CX.cur = 0;
  if(!CX.mus.length){ CX.stage = 'muscle'; CX.mode = 'single'; CX.src = 'pill'; } else if(CX.mode === 'map-multi' && CX.mus.length === 1) CX.mode = 'single';
  Phone.haptic(); cxUpdate(); }
function cxGoBack(){
  cxCancelAnim(); Phone.haptic();
  if(CX.stage === 'complete') CX.stage = 'equipment';
  else if(CX.stage === 'equipment'){ if(CX.src === 'pill' && cxHeadMus().length){ CX.stage = 'head'; CX.cur = cxHeadMus().length - 1; CX.hMulti = false; CX.hTouched = false; } else { CX.stage = 'muscle'; if(CX.mode === 'map-multi') CX.mode = CX.mus.length > 1 ? 'pill-multi' : 'single'; } }
  else if(CX.stage === 'head'){ if(CX.cur > 0){ CX.cur--; CX.hMulti = false; CX.hTouched = false; CX.hAll = false; } else { CX.stage = 'muscle'; CX.hMulti = false; CX.hTouched = false; } }
  cxUpdate(true);
}
function cxJump(st){
  cxCancelAnim();
  if(st === 'muscle'){ CX.stage = 'muscle'; CX.hMulti = false; CX.hTouched = false; if(CX.mode === 'map-multi') CX.mode = CX.mus.length > 1 ? 'pill-multi' : 'single'; CX.src = 'pill'; }
  else if(st === 'head' && CX.mus.length && cxHeadMus().length){ CX.stage = 'head'; CX.cur = 0; CX.hMulti = false; CX.hTouched = false; CX.hAll = false; CX.src = 'pill'; }
  else if(st === 'equipment' && CX.mus.length){ CX.stage = 'equipment'; CX.hMulti = false; }
  cxUpdate(true);
}
function cxExitMulti(){
  if(CX.mode === 'map-multi'){ CX.mode = 'single'; CX.mus = CX.pri ? [CX.pri] : []; CX.src = 'map'; CX.stage = CX.mus.length ? (CX.e ? 'complete' : 'equipment') : 'muscle'; }
  else { CX.mode = 'single'; CX.mus = CX.pri ? [CX.pri] : []; CX.heads.clear(); CX.hAll = false; CX.cur = 0; CX.stage = 'muscle'; CX.src = 'pill'; }
  CX.hMulti = false; CX.hTouched = false; cxUpdate(true);
}
function cxExitHeadMulti(){ CX.hMulti = false; CX.hTouched = false; CX.hAll = false; cxUpdate(true); }

// ---------- zoom and pan of the map ----------
function cxZoom(z, px, py){
  const vp = $('cxVp'); if(!vp) return; CX.mapUsed = true; CX.zoom = Math.max(1, Math.min(4, z));
  const mx = (CX.zoom - 1) * vp.clientWidth / 2, my = (CX.zoom - 1) * vp.clientHeight / 2;
  CX.px = CX.zoom === 1 ? 0 : Math.max(-mx, Math.min(mx, px ?? CX.px)); CX.py = CX.zoom === 1 ? 0 : Math.max(-my, Math.min(my, py ?? CX.py));
  const zl = $('cxZl'); zl.style.transform = `translate3d(${CX.px.toFixed(1)}px,${CX.py.toFixed(1)}px,0) scale(${CX.zoom.toFixed(3)})`;
  vp.classList.toggle('zoomed', CX.zoom > 1); $('cxZb').textContent = Math.round(CX.zoom * 100) + '%'; cxSync();
}
// tap, hold, drag, pinch and double-tap told apart: a finger that moves (or a second finger) is never a tap, a hold never also taps
function cxMapSetup(){
  const vp = $('cxVp'), P = new Map(); let hold = 0, held = false, moved = false, down = null, pin = null, lastTap = 0, raf = 0;
  $('cxMap').querySelectorAll('[data-cm]').forEach(el => { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-label', pkName(el.dataset.cm)); el.setAttribute('aria-pressed', 'false'); });
  const stopHold = () => { clearTimeout(hold); hold = 0; };
  vp.addEventListener('pointerdown', e => { if(e.pointerType === 'mouse' && e.button) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if(P.size === 1){ moved = false; held = false; const m = e.target.closest('[data-cm]'); down = { x: e.clientX, y: e.clientY, m: m ? m.dataset.cm : null };
      if(down.m) hold = setTimeout(() => { hold = 0; if(moved || P.size !== 1) return; held = true; Phone.vibrate && Phone.vibrate(12); cxFromMap(down.m, true); }, CX_HOLD); }
    else if(P.size === 2){ stopHold(); moved = true; const [a, b] = [...P.values()]; pin = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: CX.zoom, px: CX.px, py: CX.py, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; } });
  const pinch = () => { raf = 0; if(!pin || P.size < 2) return; const [a, b] = [...P.values()];
    cxZoom(pin.z * Math.hypot(a.x - b.x, a.y - b.y) / pin.d, pin.px + (a.x + b.x) / 2 - pin.cx, pin.py + (a.y + b.y) / 2 - pin.cy); };
  vp.addEventListener('pointermove', e => { if(!P.has(e.pointerId)) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if(pin){ if(!raf) raf = requestAnimationFrame(pinch); return; }
    if(down && !moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 9){ moved = true; stopHold(); } });
  const up = e => { if(!P.has(e.pointerId)) return; const two = P.size > 1; P.delete(e.pointerId); stopHold();
    if(e.type === 'pointerup' && !two && !moved && !held && P.size === 0){ const now = e.timeStamp || performance.now();
      if(now - lastTap < 300){ lastTap = 0; cxZoom(CX.zoom > 1 ? 1 : 2.3, 0, 0); }   // double-tap: zoom in / back
      else { lastTap = now; if(down && down.m) cxFromMap(down.m, false); } }
    if(P.size < 2){ pin = null; cancelAnimationFrame(raf); raf = 0; }
    if(!P.size){ down = null; held = false; } };
  vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
  vp.addEventListener('contextmenu', e => e.preventDefault());
  dragger(vp, { slop: 9, item: () => CX && CX.zoom > 1 && !pin ? vp : null,   // one finger moves a zoomed map (1:1, transform only)
    start: s => { stopHold(); moved = true; s.px = CX.px; s.py = CX.py; vp.classList.add('panning'); },
    move: s => { if(!pin) cxZoom(CX.zoom, s.px + s.dx, s.py + s.dy); },
    end: () => vp.classList.remove('panning'), multi: () => {} });
  vp.addEventListener('wheel', e => { if(!e.ctrlKey && !e.metaKey) return; e.preventDefault(); cxZoom(CX.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
  vp.addEventListener('keydown', e => { const el = e.target.closest('[data-cm]'); if(el && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); cxFromMap(el.dataset.cm, e.shiftKey); } });
}

// ---------- save ----------
function cxSave(){
  const nameEl = $('cxName'), name = cxClean(nameEl.value); nameEl.value = name; CX.name = name;
  const bad = (k, el) => { $('cxVal').textContent = t(k); Phone.haptic(); if(el){ el.scrollIntoView({ behavior: cxReduce() ? 'auto' : 'smooth', block: 'center' }); } return false; };
  if(!name){ bad('cxNeedName', nameEl); nameEl.focus({ preventScroll: true }); return; }
  if(!CX.mus.length){ bad('cxNeedMus', $('cxFlow')); return; }
  if(!CX.e){ if(CX.stage !== 'equipment'){ CX.stage = 'equipment'; CX.hMulti = false; CX.mode = 'single'; cxUpdate(true); } bad('cxNeedEq', $('cxFlow')); const f = $('cxRail') && $('cxRail').querySelector('button'); if(f) f.focus({ preventScroll: true }); return; }
  const r = cxAdopt(exCustom, { name, mus: cxOrdered(), heads: [...CX.heads], e: CX.e, uni: CX.uni }, () => 'c_' + uid());
  if(!r){ bad('cxNeedMus', $('cxFlow')); return; }
  if(r.added) saveG('custom');
  Draft.commit('ovExCreate'); cxClose(); pkDrawResults();   // saved: the typed name is not offered again
  pkPick(r.id);
  if(!r.added) setTimeout(() => $('ovExPick').classList.contains('open') ? pkToast(t('cxReused')) : toast(t('cxReused')), 900);   // the picker may have closed (one tap = add and close)
}

// ---------- one exercise by QR: share (from its details) and import (the creator's QR button, or any workout scan) ----------
function openCxQR(id){
  const c = exCustom.find(x => x.id === id); if(!c) return;
  $('wqName').textContent = exName(c); $('wqMeta').textContent = t('cxShareMeta');
  $('wqSun').innerHTML = gymIco('sun', 18, 2);
  try{ $('wqCode').innerHTML = wkQRSvg(cxPack(c)); }catch(e){ $('wqCode').innerHTML = `<p class="hint">${esc(t('wqTooBig'))}</p>`; }
  open('ovWkQR'); Phone.keepScreenOn(true);
}
// a scanned exercise code → your list (an equal one already there is reused, never doubled) → shown in the picker
function cxScanned(spec){
  const r = cxAdopt(exCustom, spec, () => 'c_' + uid()); if(!r) return false;
  if(r.added) saveG('custom');
  const nm = exName(exById(r.id)); Phone.haptic();
  if($('ovExCreate').classList.contains('open')) cxClose();
  if($('ovExPick').classList.contains('open')){ $('exSearch').value = nm; pkSearch(); pkToast(t(r.added ? 'cxImported' : 'cxHaveIt', { n: nm })); }
  else toast(t(r.added ? 'cxImported' : 'cxHaveIt', { n: nm }));
  return true;
}

// ---------- wiring (called once from js/wire/04-gym.js) ----------
const CX_PRESS = { tm: 0, x: 0, y: 0, fired: false };
function cxSetup(){
  const sh = $('ovExCreate').querySelector('.cxsheet');
  $('cxBack').innerHTML = BACK_SVG; $('cxImport').innerHTML = gymIco('qr', 22, 2);
  $('cxBack').addEventListener('click', goBack);
  $('cxImport').addEventListener('click', () => startWkScan('exercise'));
  $('cxSave').addEventListener('click', cxSave);
  // hold a muscle or head pill: several at once
  sh.addEventListener('pointerdown', e => { const p = e.target.closest('[data-cxm],[data-cxh]'); if(!p || (e.pointerType === 'mouse' && e.button)) return;
    clearTimeout(CX_PRESS.tm); CX_PRESS.x = e.clientX; CX_PRESS.y = e.clientY; CX_PRESS.fired = false;
    CX_PRESS.tm = setTimeout(() => { CX_PRESS.fired = true; if(p.dataset.cxh) cxHeadMulti(p.dataset.cxh); else cxPillMulti(p.dataset.cxm); }, CX_HOLD); });
  sh.addEventListener('pointermove', e => { if(CX_PRESS.tm && Math.hypot(e.clientX - CX_PRESS.x, e.clientY - CX_PRESS.y) > 9){ clearTimeout(CX_PRESS.tm); CX_PRESS.tm = 0; } });
  ['pointerup', 'pointercancel'].forEach(k => sh.addEventListener(k, () => { clearTimeout(CX_PRESS.tm); CX_PRESS.tm = 0; }));
  sh.addEventListener('contextmenu', e => { if(e.target.closest('[data-cxm],[data-cxh]')) e.preventDefault(); });
  sh.addEventListener('click', e => {
    if(!CX) return; const g = s => e.target.closest(s);
    let b;
    if((b = g('[data-zoom]'))){ const a = b.dataset.zoom; cxZoom(a === 'reset' ? 1 : CX.zoom * (a === 'in' ? 1.45 : 1 / 1.45), a === 'reset' ? 0 : CX.px, a === 'reset' ? 0 : CX.py); return; }
    if((b = g('[data-cxm]'))){ if(CX_PRESS.fired){ CX_PRESS.fired = false; return; } cxPickMuscle(b.dataset.cxm, b); return; }
    if((b = g('[data-cxh]'))){ if(CX_PRESS.fired){ CX_PRESS.fired = false; return; } cxPickHead(b.dataset.cxh, b); return; }
    if((b = g('[data-cxe]'))){ cxPickEq(b.dataset.cxe, b); return; }
    if(g('[data-cxdone]')){ Phone.haptic(); cxDone(); return; }
    if(g('[data-cxback]')){ cxGoBack(); return; }
    if((b = g('[data-cxjump]'))){ Phone.haptic(); cxJump(b.dataset.cxjump); return; }
    if(g('[data-cxexith]')){ cxExitHeadMulti(); return; }
    if(g('[data-cxexit]')){ cxExitMulti(); return; }
    if((b = g('[data-rm]'))){ cxRemove(b.dataset.rm); return; }
    if((b = g('[data-pri]'))){ CX.pri = b.dataset.pri; Phone.haptic(); cxUpdate(); return; }
    if(g('#cxUni')){ CX.uni = !CX.uni; Phone.haptic(); cxUpdate(); return; } });
  sh.addEventListener('keydown', e => { if(!e.shiftKey || (e.key !== 'Enter' && e.key !== ' ')) return; const p = e.target.closest('[data-cxm],[data-cxh]'); if(!p) return; e.preventDefault(); if(p.dataset.cxh) cxHeadMulti(p.dataset.cxh); else cxPillMulti(p.dataset.cxm); });
  // the name: Title Case while you type (not while a character is still being composed), caret kept; Done on the keyboard just closes it
  sh.addEventListener('input', e => { if(e.target.id !== 'cxName') return; if(!e.isComposing) CX.name = cxTitleField(e.target); $('cxVal').textContent = ''; });
  sh.addEventListener('compositionend', e => { if(e.target.id === 'cxName') CX.name = cxTitleField(e.target); });
  sh.addEventListener('keydown', e => { if(e.target.id === 'cxName' && e.key === 'Enter' && !e.isComposing){ e.preventDefault(); e.target.blur(); } });
  document.addEventListener('keydown', e => { if(e.key !== 'Escape') return;
    if($('ovExCreate').classList.contains('open')){ e.preventDefault(); cxBack(); }
    else if($('ovExPick').classList.contains('open') && ![...document.querySelectorAll('.overlay.open')].some(o => +o.style.zIndex > +($('ovExPick').style.zIndex || 0))){ e.preventDefault(); if(!pkBack()) close('ovExPick'); } });
}
