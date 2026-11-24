// Exercise Picker V27 (Add Exercise): Upper | All Muscles | Lower on top (tap or drag the highlight), then ONE row of filter pills at a time
// (muscle → head → equipment) that folds into the chosen pill, the chosen path under it, two-column exercise cards, global search at the bottom
// (on top while there is text in it). One tap adds and closes; a long press selects several (live workout, workout builder).
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// Data: the built-in library + your own exercises (EX()), muscle list EXM (js/excustom.js), history = completed sets in `sessions` (read only).
// Search is ExSearch.query (js/exsearch.js), always over every exercise. Nothing here saves anything except through the callers' own code.

const PK_STEP = 72;                                    // cards drawn at once in one long list (Show More adds the next 72)
PK = { cb: null, hist: new Map() };   // declared in js/data/config.js (shared state)
let PK_ANIM = { on: false, n: 0, layer: null };       // the pill fold animation that is running (a new tap cancels it)
const pkReduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const pkName = k => k === 'abductors' ? t('pkAbd') : exTitle(ML(k));
const pkHeadsOf = m => exmHasHeads(m) ? exmHeads(m) : [];
// readable text on a coloured pill (V27): near-black on light colours, white on dark ones
function pkInk(hex){
  const v = String(hex || '').replace('#', ''); if(v.length !== 6) return '#fff';
  const c = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  const L = .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; return (L + .05) / .05 >= 1.05 / (L + .05) ? '#171a1c' : '#fff';
}
// completed sets per exercise (and when it was last done): the only thing "most used" is built from
function pkHistory(){
  const m = new Map();
  (Array.isArray(sessions) ? sessions : []).forEach(s => { const at = Date.parse(s.start || s.date || '') || 0;
    (s.exercises || []).forEach(x => { const n = (x.sets || []).filter(z => z && z.done).length; if(!n || !x.exId) return;
      const o = m.get(x.exId) || { n: 0, at: 0 }; o.n += n; if(at > o.at) o.at = at; m.set(x.exId, o); }); });
  return m;
}
// a fixed "random" order for people with no history yet: the same every time, but mixed across muscles and equipment
const pkDisc = id => { let h = 2166136261; for(let i = 0; i < id.length; i++){ h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------- open / close ----------
// cb(id) adds the exercise. Petros: one tap adds it and closes the picker. o.multi (live workout, workout builder): a long press on a
// card starts Select mode instead; then taps select / unselect and Add (N) adds them all, in the order chosen (cb once per exercise,
// then o.done(ids) if given). o.muscle / o.group / o.cardio open straight at that muscle (Gym Coach › Replace).
function openExPick(cb, o){
  o = o || {}; pkCancelAnim();
  const m = o.cardio ? 'cardio' : EXM[o.muscle] ? o.muscle : EXM[o.group] && o.group !== 'abductors' ? o.group : null;
  PK = { cb, multi: !!o.multi, done: o.done || null, sel: [], selOn: false, region: m && m !== 'cardio' ? exmRegion(m) : 'all', muscle: m, head: null, eq: null,
    step: m ? (pkHeadsOf(m).length ? 'head' : 'equipment') : 'region', collapsed: false, user: true, limit: PK_STEP, q: '', last: null, hist: pkHistory() };
  if(!m && o.group === 'arms') PK.region = 'up';
  $('exSearch').value = ''; pkClr(); pkToastHide(); pkSelBar();
  pkDraw(); open('ovExPick'); pkFit(); $('pkBody').scrollTop = 0; pkSegPut(false);
}
// the window always matches the visible screen, so the search strip sits right above the keyboard while typing
function pkFit(){ const ov = $('ovExPick'), vv = window.visualViewport; if(!vv || !ov.classList.contains('open')) return;
  ov.style.setProperty('--pkvh', vv.height + 'px'); ov.style.setProperty('--pkvt', vv.offsetTop + 'px'); ov.classList.toggle('kb', vv.height < innerHeight * .8); }
// exercises already in the workout this picker adds to
function pkHave(){ const op = id => $(id).classList.contains('open');
  const l = op('ovTpl') && TP ? TP.exercises : active && op('ovSession') ? active.exercises : [];
  return new Set(l.map(e => e.exId)); }
// Back / Escape: a search is cleared first, then Select mode ends; otherwise the window closes (ui.js goBack)
function pkBack(){ if($('exSearch').value){ $('exSearch').value = ''; pkSearch(); return true; } if(PK.selOn){ pkSelEnd(); return true; } return false; }

// ---------- which exercises, in which order ----------
function pkHits(x, m, head){
  if(x.custom){ const s = cxSpec(x); if(!s.mus.includes(m)) return false; if(!head) return true; const mine = s.heads.filter(h => exmHeads(m).includes(h)); return !mine.length || mine.includes(head); }
  if(m === 'cardio') return x.m === 'cardio';
  return head ? (+(x.mu || {})[head] || 0) >= 25 : exmUse(x, m) >= 25;
}
const pkGrouped = () => !PK.q && !PK.muscle && (PK.region !== 'all' || !!PK.eq);
function pkList(){
  const H = PK.hist, h = id => H.get(id) || { n: 0, at: 0 }, hist = (a, b) => h(b.id).n - h(a.id).n || h(b.id).at - h(a.id).at;
  const use = (x, k) => { const v = x.custom ? null : PK.head && k === PK.muscle ? +(x.mu || {})[PK.head] || 0 : k === 'cardio' ? (x.m === 'cardio' ? 100 - cardioRank(x.id) : 0) : exmUse(x, k); return v == null ? -1 : v; };
  const byName = (a, b) => exName(a).localeCompare(exName(b));
  if(PK.q){
    const r = ExSearch.query(PK.q, { list: EX(), lang, sessions });
    return { mode: 'search', items: r.items.map(i => i.x).filter(Boolean) };
  }
  let l = EX();
  if(PK.region !== 'all') l = l.filter(x => exmRegion(exmOf(x)) === PK.region);
  if(PK.muscle) l = l.filter(x => pkHits(x, PK.muscle, PK.head));
  if(PK.eq) l = l.filter(x => x.e === PK.eq);
  if(pkGrouped()){
    const bins = new Map(); l.forEach(x => { const k = exmOf(x); if(!bins.has(k)) bins.set(k, []); bins.get(k).push(x); });
    const order = [...EXM_UP, ...EXM_LOW, 'cardio'], rank = k => { const i = order.indexOf(k); return i < 0 ? 99 : i; };
    const groups = [...bins.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map(k => ({ k, items: bins.get(k).sort((a, b) => use(b, k) - use(a, k) || hist(a, b) || byName(a, b)) }));
    return { mode: 'grouped', groups, n: l.length };
  }
  if(PK.muscle) return { mode: 'flat', items: l.slice().sort((a, b) => use(b, PK.muscle) - use(a, PK.muscle) || hist(a, b) || byName(a, b)) };
  // everything: your most-done exercises first (completed sets, then the latest); the rest in the fixed discovery order, your own newest first
  const ci = new Map(exCustom.map((c, i) => [c.id, i]));
  return { mode: 'flat', items: l.slice().sort((a, b) => hist(a, b) || (ci.has(b.id) ? ci.get(b.id) : -1) - (ci.has(a.id) ? ci.get(a.id) : -1) || pkDisc(a.id) - pkDisc(b.id)) };
}

// ---------- the filter strip ----------
function pkCrumbs(){
  const p = [['region', PK.region === 'up' ? t('pkUp') : PK.region === 'low' ? t('pkLow') : t('all'), 'var(--t-accent-ink,var(--t-accent))']];
  if(PK.muscle) p.push(['muscle', pkName(PK.muscle), gymInk(exmCol(PK.muscle))]);
  if(PK.head) p.push(['head', pkName(PK.head), gymInk(HEAD_COL[PK.head] || exmCol(PK.muscle))]);
  if(PK.eq) p.push(['equipment', exTitle(EL(PK.eq)), gymInk(EQ_COL[PK.eq])]);
  return p.map(([k, v, c], i) => `${i ? '<span class="pkdotsep" aria-hidden="true">·</span>' : ''}<button type="button" class="pkcrumb" data-jump="${k === 'region' ? 'muscle' : k}" style="color:${c}" aria-label="${esc(t('pkChange', { n: v }))}">${esc(v)}</button>`).join('');
}
function pkPills(){
  const st = PK.step, all = [['all', t('all')]];
  let opts = [], sel = 'all';
  if(st === 'muscle'){ opts = all.concat((PK.region === 'all' ? [...EXM_UP, ...EXM_LOW, 'cardio'] : PK.region === 'up' ? EXM_UP : EXM_LOW).map(k => [k, pkName(k)])); sel = PK.muscle || 'all'; }
  else if(st === 'head'){ opts = all.concat(pkHeadsOf(PK.muscle).map(k => [k, pkName(k)])); sel = PK.head || 'all'; }
  else if(st === 'equipment'){ opts = all.concat(EQ_ORDER.map(e => [e, exTitle(EL(e))])); sel = PK.eq || 'all'; }
  return opts.map(([v, l]) => {
    const dot = st === 'muscle' && v !== 'all' ? exmCol(v) : st === 'head' ? (v === 'all' ? exmCol(PK.muscle) : HEAD_COL[v]) : null, eq = st === 'equipment' && v !== 'all' ? EQ_COL[v] : null;
    const col = dot || eq || exmCol(PK.muscle || 'other'), on = v === sel;
    const cls = ['pkpill', on ? 'sel' : '', v === 'all' ? 'all' : '', st === 'head' ? 'head' : '', st === 'muscle' && v !== 'all' ? 'mus' : '', st === 'equipment' ? 'eq' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-c="${st}" data-v="${v}" aria-pressed="${on}" style="--dc:${dot || 'transparent'};--pc:${col};--sink:${pkInk(col)}"><span class="pkpl">${esc(l)}</span>${dot ? '<span class="pkdot" aria-hidden="true"></span>' : ''}${eq ? `<span class="pkpi" aria-hidden="true">${eqIcon(v, 16)}</span>` : ''}</button>`;
  }).join('');
}
function pkDrawFilters(){
  const st = PK.step, fil = $('pkFil');
  pkSegMark();
  $('pkPath').innerHTML = pkCrumbs();
  const title = { muscle: 'pkChoose', head: 'pkChooseArea', equipment: 'pkChooseEq' }[st];
  $('pkStt').innerHTML = title ? `<strong>${esc(t(title))}</strong>${st === 'muscle' || st === 'head' ? `<button type="button" class="pkgo" data-goto="equipment">${esc(t('pkEqGo'))}${svgIcon('chevR', 11, 2.6)}</button>` : ''}` : '';
  $('pkStt').classList.toggle('hide', !title);
  $('pkOpts').innerHTML = st === 'region' ? `<button type="button" class="pkreopen" data-goto="muscle">${esc(t('pkChoose'))}${svgIcon('chevR', 13, 2.6)}</button>`
    : title ? `<div class="pkrow"><button type="button" class="pkpback" data-pkback aria-label="${esc(t('pkPrev'))}">${svgIcon('back', 22, 2.5)}</button><div class="pkrail" id="pkRail">${pkPills()}</div></div>` : '';
  const hint = st === 'equipment' ? t('pkOptional') : ''; $('pkHint').textContent = hint; $('pkHint').classList.toggle('on', !!hint);
  fil.classList.toggle('compact', !!PK.q || PK.collapsed || st === 'done' || ($('pkBody').scrollTop > 75 && !PK.user));
  const rail = $('pkRail'); if(rail){ const s = rail.querySelector('.sel'); if(s && rail.scrollWidth > rail.clientWidth) rail.scrollLeft = Math.max(0, s.offsetLeft - rail.offsetLeft - 8); }
}

// ---------- the cards ----------
function pkArt(x){
  if(!x) return '';
  if(isCardio(x.id)) return exIcon(x, 70);
  const mu = x.custom ? Object.fromEntries(Object.keys(x.mu || {}).map(h => [h, 100])) : x.mu;   // your own: the chosen muscles lit evenly (no made-up shares)
  return miniMap({ id: x.id, mu }, true);   // the RECOVERY+ figure, cut to the card (raExerciseSVG in js/recovery-anatomy.js)
}
function pkCard(x, k, have, i){
  const nm = exName(x), inW = have.has(x.id), focus = PK.head && k === PK.muscle ? PK.head : k;
  const use = x.custom ? t('pkCustom') : isCardio(x.id) ? '' : t('muUse', { p: Math.round(HEADS[focus] && !EXM[focus] ? +(x.mu || {})[focus] || 0 : exmUse(x, focus)) });
  const badge = x.custom ? `<span class="pkpuz" role="img" aria-label="${esc(t('pkCustomL'))}">${gymIco('puzzle', 18, 1.9)}</span>`
    : `<button type="button" class="pkinfo" data-exinfo="${x.id}" aria-label="${esc(t('pkInfoL', { n: nm }))}">${svgIcon('info', 18, 2)}</button>`;
  const si = PK.sel ? PK.sel.indexOf(x.id) : -1;
  return `<div class="pkcard${inW ? ' added' : ''}${si > -1 ? ' sel' : ''}" data-ex="${x.id}" role="button" tabindex="0" aria-label="${esc(t('pkAddL', { n: nm }))}"${PK.selOn ? ` aria-pressed="${si > -1}"` : ''} style="--i:${Math.min(i, 9)}">`
    + `<span class="pksn" aria-hidden="true">${si > -1 ? si + 1 : ''}</span>`
    + `<div class="pkctop"><span class="pkeq"><span>${esc(exTitle(EL(x.e)))}</span>${eqIcon(x.e, 14)}</span>${badge}</div>`
    + `<div class="pkart" data-art="${x.id}" aria-hidden="true"></div>`
    + `<div class="pkcbot"><span class="pkname">${esc(nm)}</span>${use ? `<span class="pkuse">${esc(use)}</span>` : ''}${inW ? `<span class="pkin" aria-hidden="true">${svgIcon('check', 12, 3)}</span>` : ''}</div></div>`;
}
let PK_IO = null;
function pkArtWatch(){
  const box = $('pkGrid'), arts = box.querySelectorAll('.pkart');
  if(!('IntersectionObserver' in window)){ arts.forEach(el => { el.innerHTML = pkArt(exById(el.dataset.art)); }); return; }
  // only the cards near the screen carry their body drawing (each is a full anatomy figure); far ones are emptied again
  if(!PK_IO) PK_IO = new IntersectionObserver(es => es.forEach(e => { const el = e.target;
    if(e.isIntersecting){ if(!el.firstChild) el.innerHTML = pkArt(exById(el.dataset.art)); } else if(el.firstChild) el.textContent = ''; }), { root: $('pkBody'), rootMargin: '600px 0px' });
  PK_IO.disconnect(); arts.forEach(el => PK_IO.observe(el));
}
function pkDrawResults(){
  const L = pkList(), have = pkHave(), grid = $('pkGrid');
  const n = L.mode === 'grouped' ? L.n : L.items.length, H = PK.hist;
  $('pkRLabel').textContent = t(L.mode === 'search' ? 'pkSearchRes' : L.mode === 'grouped' ? 'pkByMuscle' : 'pkExercises');
  $('pkMeta').innerHTML = `<b>${esc(t(n === 1 ? 'pkCount1' : 'pkCount', { n }))}</b><span>${esc(t(L.mode === 'search' ? 'pkBest' : L.mode === 'grouped' ? 'pkHigh' : PK.muscle ? 'pkUsageFirst' : H.size ? 'pkMostSets' : 'pkDiscover'))}</span>`;
  let html = '', more = 0;
  if(!n) html = `<div class="pkempty"><b>${esc(t('pkNoMatch'))}</b>${esc(t('pkNoMatchSub'))}</div>`;
  else if(L.mode === 'grouped') html = L.groups.map(g => `<section class="pksec" style="--sc:${gymInk(exmCol(g.k))}"><div class="pksech"><strong>${esc(g.k === 'other' ? t('pkOther') : pkName(g.k))}</strong><span>${esc(t(g.items.length === 1 ? 'pkCount1' : 'pkCount', { n: g.items.length }))}</span></div>`
    + `<div class="pkgrid">${g.items.map((x, i) => pkCard(x, g.k, have, i)).join('')}</div></section>`).join('');
  else { const show = L.items.slice(0, PK.limit); more = L.items.length - show.length; html = `<div class="pkgrid">${show.map((x, i) => pkCard(x, PK.muscle || exmOf(x), have, i)).join('')}</div>`; }
  grid.innerHTML = html; grid.classList.toggle('grouped', L.mode === 'grouped');
  $('pkMore').classList.toggle('hide', !more); if(more) $('pkMore').textContent = t('pkMore', { n: more });
  $('pkHold').classList.toggle('hide', !PK.multi || PK.selOn || !n);
  pkArtWatch();
}
function pkDraw(){ pkDrawFilters(); pkDrawResults(); }
const drawExPick = pkDraw;   // the old name (docs/architecture/module-map.md)

// ---------- choosing filters ----------
function pkChoose(st, v){
  if(st === 'muscle'){ if(v === 'all'){ PK.muscle = null; PK.head = null; PK.step = 'muscle'; } else { PK.muscle = v; PK.head = null; PK.step = pkHeadsOf(v).length ? 'head' : 'equipment'; } }
  else if(st === 'head'){ PK.head = v === 'all' ? null : v; PK.step = 'equipment'; }
  else if(st === 'equipment'){ PK.eq = v === 'all' ? null : v; PK.step = 'done'; PK.collapsed = true; }
  PK.user = true; PK.limit = PK_STEP; $('pkBody').scrollTop = 0; pkDraw();
}
// the next row arrives while the old one is still folding (V27: about 250 ms, overlapping by ~100 ms)
function pkEnter(){
  if(pkReduce()) return; const st = $('pkStage'), fil = $('pkFil');
  st.classList.remove('entering', 'revealing'); fil.classList.remove('updated'); void st.offsetWidth;
  if(PK.step !== 'done' && PK.step !== 'region') st.classList.add('entering'); fil.classList.add('updated');
}
function pkCancelAnim(){ PK_ANIM.n++; if(PK_ANIM.layer){ PK_ANIM.layer.remove(); PK_ANIM.layer = null; } const r = document.querySelector('#pkOpts .pkrow.folding'); if(r) r.classList.remove('folding'); PK_ANIM.on = false; }
// the other pills travel into the one you tapped and fade; copies do the moving (the real row is hidden), so nothing below jumps
async function pkPickPill(st, v, btn){
  if(PK_ANIM.on) pkCancelAnim();
  if(st === 'muscle' && v === 'all' && !PK.muscle){ pkChoose(st, v); return; }
  const row = btn.closest('.pkrow'), rail = row && row.querySelector('.pkrail'), pills = rail ? [...rail.querySelectorAll('[data-c]')] : [], host = $('ovExPick').querySelector('.pksheet');
  Phone.haptic();
  if(pkReduce() || !row || !pills.length || !btn.animate){ pkChoose(st, v); pkEnter(); return; }
  PK_ANIM.on = true; const n = ++PK_ANIM.n;
  const T = btn.getBoundingClientRect(), P = host.getBoundingClientRect(), R = rail.getBoundingClientRect(), cx = T.left + T.width / 2, cy = T.top + T.height / 2;
  const layer = document.createElement('div'); layer.className = 'pkfold'; host.appendChild(layer); PK_ANIM.layer = layer;
  const anims = [];
  pills.forEach(p => { const r = p.getBoundingClientRect(); if(r.right <= R.left || r.left >= R.right || !r.width) return;
    const c = p.cloneNode(true), me = p === btn; c.removeAttribute('data-c'); c.removeAttribute('data-v'); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; if(me) c.classList.add('sel');
    Object.assign(c.style, { position: 'absolute', left: (r.left - P.left) + 'px', top: (r.top - P.top) + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: me ? '2' : '1' });
    layer.appendChild(c); const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    const k = me ? [{ offset: 0, transform: 'translate(0,0) scale(1)', opacity: 1 }, { offset: .66, transform: 'translate(0,0) scale(1.08)', opacity: 1 }, { offset: 1, transform: 'translate(0,-3px) scale(.83)', opacity: 0 }]
      : [{ offset: 0, transform: 'translate(0,0) scale(1)', opacity: 1 }, { offset: .7, transform: `translate(${dx * .88}px,${dy * .88}px) scale(.65)`, opacity: .7 }, { offset: 1, transform: `translate(${dx}px,${dy}px) scale(.24)`, opacity: 0 }];
    anims.push(c.animate(k, { duration: 250, easing: 'cubic-bezier(.22,.85,.22,1)', fill: 'forwards' }).finished.catch(() => {})); });
  row.classList.add('folding');
  try{ await new Promise(r => setTimeout(r, 150)); if(n !== PK_ANIM.n) return; pkChoose(st, v); pkEnter(); await Promise.all(anims); }
  finally{ if(n === PK_ANIM.n){ layer.remove(); PK_ANIM.layer = null; row.classList.remove('folding'); PK_ANIM.on = false; } }
}
function pkJump(st){ pkCancelAnim(); PK.step = st; PK.collapsed = false; PK.user = true; $('pkBody').scrollTop = 0; pkDrawFilters(); pkEnter(); }
function pkExpand(){ pkCancelAnim(); PK.step = 'muscle'; PK.collapsed = false; PK.user = true; $('pkBody').scrollTop = 0; pkDrawFilters();
  if(pkReduce()) return; const st = $('pkStage'); st.classList.remove('revealing'); void st.offsetWidth; st.classList.add('revealing'); }
// the back chevron: one step back, and that step's choice (and what depended on it) is cleared
function pkStepBack(){
  pkCancelAnim();
  if(PK.step === 'done'){ PK.eq = null; PK.step = 'equipment'; }
  else if(PK.step === 'equipment'){ PK.eq = null;
    if(PK.muscle && pkHeadsOf(PK.muscle).length){ PK.head = null; PK.step = 'head'; }
    else if(PK.muscle){ PK.muscle = null; PK.head = null; PK.step = 'muscle'; }
    else if(PK.region !== 'all'){ PK.region = 'all'; PK.step = 'muscle'; }
    else PK.step = 'muscle'; }
  else if(PK.step === 'head'){ PK.muscle = null; PK.head = null; PK.eq = null; PK.step = 'muscle'; }
  else { PK.region = 'all'; PK.muscle = null; PK.head = null; PK.eq = null; PK.step = 'region'; }
  PK.collapsed = false; PK.user = true; PK.limit = PK_STEP; $('pkBody').scrollTop = 0; pkDraw(); pkEnter();
}
function pkReset(){ pkCancelAnim(); Object.assign(PK, { region: 'all', muscle: null, head: null, eq: null, step: 'region', collapsed: false, limit: PK_STEP, user: true, q: '' });
  $('exSearch').value = ''; pkClr(); $('pkBody').scrollTop = 0; pkDraw(); pkSegPut(true); }
function pkRegion(r){
  if(r === PK.region && PK.step !== 'region'){ pkSegPut(true); return; }
  pkCancelAnim(); Object.assign(PK, { region: r, muscle: null, head: null, step: 'muscle', collapsed: false, user: true, limit: PK_STEP });
  Phone.haptic(); $('pkBody').scrollTop = 0; pkDraw(); pkSegPut(true); pkEnter();
}

// ---------- Upper | All Muscles | Lower: the highlight glides to a tap, and follows a finger 1:1 when dragged (shared drag helper) ----------
const PK_REG = ['up', 'all', 'low'];
function pkSegMark(){ document.querySelectorAll('#pkRegion [data-r]').forEach(b => { const on = b.dataset.r === PK.region; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); }
function pkSegPut(smooth){ const ind = $('pkInd'); if(!ind) return; ind.getAnimations().forEach(a => a.cancel()); ind.classList.toggle('still', !smooth); ind.style.transform = ''; ind.style.setProperty('--i', PK_REG.indexOf(PK.region)); pkSegMark(); }
function pkSegSetup(){
  const seg = $('pkRegion'), ind = $('pkInd'); let w = 0, base = 0;
  seg.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if(b) pkRegion(b.dataset.r); });
  dragger(seg, { axis: 'x', slop: 6,
    start: () => { ind.getAnimations().forEach(a => a.cancel()); w = ind.offsetWidth || 1; base = PK_REG.indexOf(PK.region) * w; ind.classList.add('still'); },
    move: s => { const x = Math.max(0, Math.min(2 * w, base + s.dx)); ind.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      const k = Math.round(x / w); seg.querySelectorAll('[data-r]').forEach((b, i) => b.classList.toggle('on', i === k)); },
    end: (s, ok) => { const x = Math.max(0, Math.min(2 * w, base + s.dx)), from = PK_REG.indexOf(PK.region);
      let k = Math.round(x / w); if(ok && Math.abs(s.vx) > .45 && Math.abs(s.dx) > 12) k = Math.max(0, Math.min(2, from + Math.sign(s.vx)));   // a flick: one step that way
      if(!ok) k = from;
      const a = springTo(ind, { x }, { x: k * w }, { x: s.vx }, { k: 320, damp: .9, fill: 'forwards' });
      a.onfinish = () => { a.cancel(); ind.style.transform = ''; ind.style.setProperty('--i', k); };
      ind.style.setProperty('--i', k);
      if(PK_REG[k] !== PK.region) pkRegion(PK_REG[k]); else pkSegMark(); } });
}

// ---------- adding (Petros): one tap adds and closes; a long press starts Select mode, Add (N) adds them all ----------
let PK_TT = 0;
function pkToast(msg){
  const el = $('pkToast'); el.querySelector('.pktm').innerHTML = `<span>${esc(msg)}</span>`;
  el.classList.add('show'); clearTimeout(PK_TT); PK_TT = setTimeout(pkToastHide, 3200);
}
function pkToastHide(){ clearTimeout(PK_TT); $('pkToast').classList.remove('show'); }
function pkPick(id){
  const x = exById(id); if(!x || !PK.cb) return;
  if(PK.selOn){ pkSelToggle(id); return; }
  if(PK.multi && pkHave().has(id)){ Phone.haptic(); pkToast(t('pkHave')); return; }
  Phone.haptic(); const cb = PK.cb, done = PK.done; pkFinish(); cb(id); if(done) done([id]);
}
// added: the window's work is done, so its search text is not brought back as a draft next time (js/draft.js)
function pkFinish(){ Draft.commit('ovExPick'); $('exSearch').value = ''; pkClr(); close('ovExPick'); }
// Select mode: the cards keep their order number; the bar at the bottom shows Cancel and Add (N)
function pkSelStart(id){
  if(!PK.multi || !PK.cb || PK.selOn) return;
  if(pkHave().has(id)){ Phone.haptic(); pkToast(t('pkHave')); return; }
  PK.selOn = true; PK.sel = [id]; Phone.haptic(); pkToastHide(); pkMarkSel(); pkSelBar(); $('pkHold').classList.add('hide');
}
function pkSelToggle(id){
  const i = PK.sel.indexOf(id);
  if(i > -1) PK.sel.splice(i, 1); else if(pkHave().has(id)){ Phone.haptic(); pkToast(t('pkHave')); return; } else PK.sel.push(id);
  Phone.haptic(); pkMarkSel(); pkSelBar();
}
function pkSelEnd(){ PK.selOn = false; PK.sel = []; pkMarkSel(); pkSelBar(); }
function pkSelAdd(){
  const ids = PK.sel.filter(id => exById(id)); if(!ids.length) return;
  const cb = PK.cb, done = PK.done; PK.selOn = false; PK.sel = []; pkSelBar(); Phone.haptic();
  pkFinish(); ids.forEach(id => cb(id)); if(done) done(ids);
}
function pkSelBar(){
  const bar = $('pkSelBar'), on = !!(PK.selOn), n = on ? PK.sel.length : 0;
  $('ovExPick').classList.toggle('pkselect', on); bar.classList.toggle('show', on); bar.setAttribute('aria-hidden', String(!on));
  $('pkSelN').textContent = t(n === 1 ? 'pkSel1' : 'pkSelN', { n });
  const add = $('pkSelAdd'); add.textContent = t('pkSelAdd', { n }); add.disabled = !n;
  const dn = $('pkDone'); if(dn){ dn.classList.toggle('hide', !on || !PK.q); dn.textContent = n ? t('pkDoneN', { n }) : t('done'); }   // 0.8: while searching, Done sits top right
}
// only the order numbers and outlines change (no redraw, no lost scroll)
function pkMarkSel(){
  $('pkGrid').querySelectorAll('.pkcard[data-ex]').forEach(c => { const i = PK.selOn ? PK.sel.indexOf(c.dataset.ex) : -1;
    c.classList.toggle('sel', i > -1); c.querySelector('.pksn').textContent = i > -1 ? i + 1 : '';
    if(PK.selOn) c.setAttribute('aria-pressed', String(i > -1)); else c.removeAttribute('aria-pressed'); });
}
// a long press: the finger stays put for 450 ms (a scroll or a drag cancels it); the tap that follows is swallowed
function pkLongPress(body){
  let tm = 0, x0 = 0, y0 = 0, st0 = 0, card = null; PK.ate = false;
  const stop = () => { clearTimeout(tm); tm = 0; if(card) card.classList.remove('pressing'); card = null; };
  body.addEventListener('pointerdown', e => { stop(); PK.ate = false; if(!PK.multi || PK.selOn || e.button > 0) return;
    const c = e.target.closest('.pkcard[data-ex]'); if(!c || e.target.closest('[data-exinfo]')) return;
    card = c; x0 = e.clientX; y0 = e.clientY; st0 = body.scrollTop; c.classList.add('pressing');
    tm = setTimeout(() => { const id = card && card.dataset.ex; stop(); if(!id) return; PK.ate = true; pkSelStart(id); }, 450); }, { passive: true });
  body.addEventListener('pointermove', e => { if(tm && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) stop(); }, { passive: true });
  ['pointerup', 'pointercancel'].forEach(k => body.addEventListener(k, () => { if(tm) stop(); }, { passive: true }));
  body.addEventListener('scroll', () => { if(tm && Math.abs(body.scrollTop - st0) > 8) stop(); }, { passive: true });   // the list really moved
  body.addEventListener('contextmenu', e => { if(e.target.closest('.pkcard')) e.preventDefault(); });
}

// ---------- search: always over every exercise (filters are kept for when the box is cleared) ----------
// 0.8 (24 Nov): the search bar stays docked right above the keyboard (pkFit follows the visible screen). Once typing starts, the results panel
// slides up over the picker and fills everything above the bar; clearing the box (or Done on the keyboard) slides it back down.
function pkClr(){ const on = !!$('exSearch').value, ov = $('ovExPick'), was = ov.classList.contains('pksearching'); $('pkClr').classList.toggle('hide', !on);
  if(on === was) return;
  const body = $('pkBody'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; body.getAnimations().forEach(a => a.cancel());
  if(on){ ov.classList.add('pksearching'); if(!reduce && body.animate) body.animate([{ transform: 'translate3d(0,100%,0)', opacity: .4 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.3,1.08,.5,1)' }); return; }
  if(reduce || !body.animate || !ov.classList.contains('open')){ ov.classList.remove('pksearching'); return; }
  body.animate([{ transform: 'translate3d(0,0,0)', opacity: 1 }, { transform: 'translate3d(0,100%,0)', opacity: .4 }], { duration: 240, easing: 'cubic-bezier(.45,0,.2,1)' }).onfinish = () => { if(!$('exSearch').value) ov.classList.remove('pksearching'); }; }
function pkSearch(){ pkCancelAnim(); PK.q = $('exSearch').value.trim(); pkClr(); PK.limit = PK_STEP; if(!PK.q) PK.user = true;
  $('pkBody').scrollTop = 0; pkDraw(); pkSelBar(); }
// Done on the keyboard: the chosen exercises are added (Select mode); otherwise the keyboard goes away and the results slide back down
function pkSearchDone(){ const sx = $('exSearch'); sx.blur();
  if(PK.selOn && PK.sel.length){ pkSelAdd(); return; }
  if(PK.selOn) pkSelEnd(); sx.value = ''; pkSearch(); }

// ---------- wiring (called once from js/wire/04-gym.js) ----------
function pkSetup(){
  const body = $('pkBody'), fil = $('pkFil');
  $('pkReset').innerHTML = gymIco('reset', 19, 2.1); $('pkSelX').innerHTML = svgIcon('x', 18, 2.4); $('ovExPick').querySelector('.pksi').innerHTML = svgIcon('search', 19, 2.1);
  $('pkClr').innerHTML = svgIcon('x', 13, 2.6); $('pkCustom').querySelector('.pkplus').innerHTML = svgIcon('plus', 18, 2.2);
  fil.addEventListener('click', e => {
    const back = e.target.closest('[data-pkback]'), pill = e.target.closest('[data-c]'), jump = e.target.closest('[data-jump]'), go = e.target.closest('[data-goto]');
    if(back){ Phone.haptic(); pkStepBack(); }
    else if(pill) pkPickPill(pill.dataset.c, pill.dataset.v, pill);
    else if(jump){ if(PK.q){ $('exSearch').value = ''; PK.q = ''; pkClr(); pkDrawResults(); } pkJump(jump.dataset.jump); }
    else if(go){ if(go.dataset.goto === 'muscle' && PK.step === 'region') pkExpand(); else pkJump(go.dataset.goto); } });
  $('pkReset').addEventListener('click', () => { Phone.haptic(); pkReset(); });
  pkSegSetup();
  body.addEventListener('click', e => {
    const inf = e.target.closest('[data-exinfo]'); if(inf){ e.stopPropagation(); const id = inf.dataset.exinfo; openExInfo(id, () => pkPick(id), true); return; }
    if(e.target.closest('#pkMore')){ PK.limit += PK_STEP; pkDrawResults(); return; }
    if(e.target.closest('#pkCustom')){ openExCreate(); return; }
    const c = e.target.closest('.pkcard[data-ex]'); if(!c) return; if(PK.ate){ PK.ate = false; return; } pkPick(c.dataset.ex); });
  pkLongPress(body);
  body.addEventListener('keydown', e => { if((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pkcard[data-ex]')){ e.preventDefault(); pkPick(e.target.dataset.ex); } });
  // scrolling the cards folds the filter row away (the region pill stays); back at the top it opens again
  let folded = false;
  body.addEventListener('scroll', () => { if(PK.q) return; PK.user = false; const f = body.scrollTop > 75 || PK.collapsed || PK.step === 'done'; if(f !== folded || f !== fil.classList.contains('compact')){ folded = f; fil.classList.toggle('compact', f); } }, { passive: true });
  const sx = $('exSearch');
  sx.addEventListener('input', pkSearch);
  sx.addEventListener('focus', () => { if(PK.q) fil.classList.add('compact'); });
  sx.addEventListener('keydown', e => { if(e.key !== 'Enter' || e.isComposing) return; e.preventDefault(); pkSearchDone(); });
  $('pkDone').addEventListener('click', () => { Phone.haptic(); pkSearchDone(); });
  $('pkClr').addEventListener('click', () => { sx.value = ''; pkSearch(); sx.blur(); });
  $('pkSelAdd').addEventListener('click', pkSelAdd); $('pkSelX').addEventListener('click', () => { Phone.haptic(); pkSelEnd(); });
  if(window.visualViewport){ visualViewport.addEventListener('resize', pkFit); visualViewport.addEventListener('scroll', pkFit); }
}
