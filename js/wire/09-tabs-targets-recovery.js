// Wiring for 0.5.7: side tab strip, pull-to-switch tabs, Fridge/Groceries switch, supplements in Food, linked macro sliders.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.


// ---------- side strip ----------
$('rail').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if(!b) return;
  const tab = b.dataset.tab, h = location.hash.slice(1);
  if(tabOf(h) === tab){ if(h !== TAB_ROOT[tab]) go(TAB_ROOT[tab]); else { const pg = document.querySelector('section.page:not(.hide)'); if(pg) pg.scrollTo({ top: 0, behavior: 'smooth' }); } }
  else switchTab(0, tab); });
addEventListener('resize', () => markRail(tabOf(location.hash.slice(1))));
document.querySelectorAll('.fgseg').forEach(sg => sg.addEventListener('click', e => { const b = e.target.closest('[data-fg]'); if(b && location.hash.slice(1) !== b.dataset.fg) go(b.dataset.fg); }));
$('fScanBtn').addEventListener('click', () => startScan());
$('suppAddBtn').addEventListener('click', () => openSupp(null));

// 0.7.2: no more pulling past the end of a page to change tabs; the bottom bar does it

// ---------- targets: linked macro sliders, fibre suggestion ----------
$('ovTargets').addEventListener('input', e => { const r = e.target.closest('.mxr'); if(r){ moveMx(r.dataset.p, r.dataset.k, +r.value); return; }
  const id = e.target.id || ''; const m = id.match(/^tg([GR])([kpcf])$/); if(!m) return;
  if(m[2] === 'k'){ if(MX[m[1]]){ mxKeepLock(m[1]); drawMx(m[1], true); } } else { MX[m[1]] = mxFromGrams(m[1]); drawMx(m[1], false); }
  if(m[2] === 'k') drawFibSug(); });
$('ovTargets').addEventListener('click', e => {
  if(e.target.closest('#fibUse')){ $('tgFib').value = fibSuggest(); return; }
  if(e.target.closest('#tgGoal button') || e.target.closest('#tgCalc,[data-calc]') || /calc/i.test(e.target.id || '')) setTimeout(() => { ['G', 'R'].forEach(P => { if($('mx' + P)){ MX[P] = mxFromGrams(P); drawMx(P, false); } }); drawFibSug(); }, 0);
});

// 0.7.1: the bottom bar stays one size (the 0.6.9.3 shrink-on-scroll is gone)
