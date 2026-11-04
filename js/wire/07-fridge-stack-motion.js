// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

$('fList').addEventListener('click', e => {
  const pm = e.target.closest('[data-minus],[data-plus]'); if(!pm) return; e.stopImmediatePropagation();
  const c = pm.closest('[data-fid]'), it = fridge.find(x => x.id === c.dataset.fid); if(!it) return;
  if(pm.hasAttribute('data-plus')){ const { id, addedAt, ...rest } = it; fridge.push({ ...rest, qty: it.packSize, id: uid(), addedAt: new Date().toISOString() }); saveFridge(); }
  else { const twin = [...fridge].reverse().find(x => x !== it && x.foodId === it.foodId && x.mealId === it.mealId && x.loc === it.loc && x.packSize === it.packSize && (x.exp || '') === (it.exp || '') && Math.abs(x.qty - x.packSize) <= 0.5) || it;
    fridge = fridge.filter(x => x !== twin); saveFridge(); if(it.foodId && checkRestock(it.foodId)) toast(t('toList').trim()); }
  renderAll();
}, true);

const askDone = v => { close('ovAsk'); const r = ASK; ASK = null; if(r) r(v); };

$('askYes').addEventListener('click', () => askDone(true));

 $('askNo').addEventListener('click', () => askDone(false));

$('ovAsk').addEventListener('click', e => { if(e.target === $('ovAsk')) askDone(false); });

const selLabel = s => { const o = s.options[s.selectedIndex]; return o ? o.textContent : '—'; };

$('pickList').addEventListener('click', e => { const o = e.target.closest('[data-pi]'); if(!o || !PICKSEL) return;
  PICKSEL.selectedIndex = +o.dataset.pi; syncSel(PICKSEL); close('ovPick');
  const s = PICKSEL; PICKSEL = null; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });

(() => { // keep the button text right when the code changes a dropdown
  const P = HTMLSelectElement.prototype;
  ['value', 'selectedIndex'].forEach(k => { const d = Object.getOwnPropertyDescriptor(P, k); if(!d || !d.set) return;
    Object.defineProperty(P, k, { ...d, set(v){ d.set.call(this, v); if(this.dataset && this.dataset.enh) syncSel(this); } }); });
})();

document.addEventListener('input', e => { const el = e.target; if(el.dataset && el.dataset.nfix && el.value.includes(',')){ const p = el.selectionStart; el.value = el.value.replace(/,/g, '.'); try{ el.setSelectionRange(p, p); }catch(_){} } }, true);

document.addEventListener('click', e => { if(e.target.closest && e.target.closest('#hapL')) return; const b = e.target.closest && e.target.closest(HAPTIC_SEL); if(b) haptic(); }, true);

const keyOf = el => { for(const a of KEYATTR) if(el.hasAttribute(a)) return a + '=' + el.getAttribute(a); return null; };

const SEEN = new Set();

 let RECTS = new Map(), ANIM_ON = false;

const contKey = el => { const c = el.parentElement && el.parentElement.closest('[id]'); return c ? c.id : ''; };

document.addEventListener('pointerdown', () => { // remember where rows are, so removed ones can fade out in place
  RECTS = new Map(); document.querySelectorAll(KEYATTR.map(a => `section.page:not(.hide) [${a}], .overlay.open [${a}]`).join(',')).forEach(el => {
    const k = keyOf(el); if(k) RECTS.set(contKey(el) + '|' + k, { r: el.getBoundingClientRect(), el }); }); }, true);

new MutationObserver(muts => {
  const added = new Map(), removed = new Map();
  muts.forEach(m => { m.addedNodes.forEach(n => { if(n.nodeType !== 1) return;
      if(n.tagName === 'SELECT') enhanceSel(n); n.querySelectorAll && n.querySelectorAll('select').forEach(enhanceSel);
      if(n.tagName === 'INPUT') fixNum(n); n.querySelectorAll && n.querySelectorAll('input[type=number]').forEach(fixNum);
      [n, ...(n.querySelectorAll ? n.querySelectorAll(KEYATTR.map(a => `[${a}]`).join(',')) : [])].forEach(el => { const k = el.getAttribute && keyOf(el); if(k) added.set(contKey(el) + '|' + k, el); }); });
    m.removedNodes.forEach(n => { if(n.nodeType !== 1) return; const c = m.target && m.target.closest ? (m.target.closest('[id]') || m.target) : null;
      [n, ...(n.querySelectorAll ? n.querySelectorAll(KEYATTR.map(a => `[${a}]`).join(',')) : [])].forEach(el => { const k = el.getAttribute && keyOf(el); if(k) removed.set(k, c); }); }); });
  if(!ANIM_ON || matchMedia('(prefers-reduced-motion: reduce)').matches){ added.forEach((el, k) => SEEN.add(k)); return; }
  added.forEach((el, k) => { if(!SEEN.has(k)){ SEEN.add(k); if(el.offsetParent !== null){ el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); } } });
  if(!removed.size) return; RECTS.forEach((v, k) => { if(!removed.has(k.split('|')[1]) || added.has(k) || document.contains(v.el) || v.r.width === 0) return; const vis = v.r.bottom > 0 && v.r.top < innerHeight; if(!vis) return; const anc = v.el.parentElement && v.el.parentElement.closest(KEYATTR.map(x => `[${x}]`).join(',')); if(anc && anc !== v.el) return;
    const g = v.el.cloneNode(true); g.classList.add('ghostout'); Object.assign(g.style, { position: 'fixed', left: v.r.left + 'px', top: v.r.top + 'px', width: v.r.width + 'px', height: v.r.height + 'px', margin: 0, zIndex: 9999, pointerEvents: 'none' });
    document.body.appendChild(g); setTimeout(() => g.remove(), 260); RECTS.delete(k); }); RECTS = new Map();
}).observe(document.body, { childList: true, subtree: true });

document.querySelectorAll('select').forEach(enhanceSel);

 document.querySelectorAll('input[type=number]').forEach(fixNum);

setTimeout(() => { document.querySelectorAll(KEYATTR.map(a => `[${a}]`).join(',')).forEach(el => { const k = keyOf(el); if(k) SEEN.add(contKey(el) + '|' + k); }); ANIM_ON = true; }, 400);

// tick pop on a finished set
document.addEventListener('click', e => { const ok = e.target.closest('[data-ok]'); if(!ok) return; const x = ok.closest('[data-x]'), s = ok.closest('[data-s]'); if(!x || !s) return;
  const xi = x.dataset.x, si = s.dataset.s; setTimeout(() => { const b = document.querySelector(`#sesBody [data-x="${xi}"] [data-s="${si}"] .sok`); if(b){ b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } }, 0); }, true);
