// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// 0.5.9: ⓘ bubbles, one-box Quick add, Plan my day in the Log food sheet, extras fold, Calculate from the latest weigh-in.

// ⓘ info bubbles (capture, so they never also toggle a fold or the % / mg switch)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tip]');
  if(b){ e.preventDefault(); e.stopPropagation(); if($('tipPop') && $('tipPop').dataset.k === b.dataset.tip){ hideTip(); return; } showTip(b.dataset.tip, b); $('tipPop').dataset.k = b.dataset.tip; return; }
  if($('tipPop')) hideTip();
}, true);
addEventListener('scroll', hideTip, true);
addEventListener('hashchange', hideTip);

// Log food sheet: Quick add + Plan my day
$('lQuickTop').addEventListener('click', () => { close('ovLog'); openQuick(); });
$('planShow').addEventListener('click', e => { if(e.target.closest('#planCancel') && planCtl){ planCtl.abort(); renderPlan(); } });

// Quick add: one box, Small / Normal / Big
document.querySelectorAll('#qaSize button').forEach(b => b.addEventListener('click', () => setSeg('#qaSize', b.dataset.v)));
$('qaName').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); saveQuick(); } });

// Extras: tap the electrolytes to switch % / mg
$('dExtrasBody').addEventListener('click', e => { if(e.target.closest('[data-elec]')){ ui.elecMg = !ui.elecMg; saveUI(); renderToday(); } });

// Daily Targets: Calculate uses your latest weigh-in (Gym → Progress)
$('tgCalc').addEventListener('click', e => { if(num('tgBw') > 30) return; e.stopImmediatePropagation(); toast(t('calcNeedW')); close('ovTargets'); go('gym-prog'); }, true);

// ---------- 0.6.0: Progress folds, weight chart Day / Week / Month ----------
$('gProgV').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if(!b) return; PG.open[b.dataset.pg] = !PG.open[b.dataset.pg]; renderProgress(); });
$('gWeigh').addEventListener('click', e => { const b = e.target.closest('[data-wt]'); if(!b) return; ui.wtMode = b.dataset.wt; saveUI(); drawWeigh(); });
