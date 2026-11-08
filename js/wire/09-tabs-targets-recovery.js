// Wiring for 0.5.7: side tab strip, pull-to-switch tabs, Fridge/Groceries switch, supplements in Food, linked macro sliders.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const RAIL_IC = { today: '🍽️', gym: '🏋️', food: '🍎', fridge: '🧊', settings: '⚙︎' }, TAB_LBL = { today: 'tabToday', gym: 'tabGym', food: 'tabFood', fridge: 'tabFridge', settings: 'settings' };

// ---------- side strip ----------
$('rail').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if(!b) return;
  const tab = b.dataset.tab, h = location.hash.slice(1);
  if(tabOf(h) === tab){ if(h !== TAB_ROOT[tab]) go(TAB_ROOT[tab]); else { const pg = document.querySelector('section.page:not(.hide)'); if(pg) pg.scrollTo({ top: 0, behavior: 'smooth' }); } }
  else switchTab(0, tab); });
addEventListener('resize', () => markRail(tabOf(location.hash.slice(1))));
document.querySelectorAll('.fgseg').forEach(sg => sg.addEventListener('click', e => { const b = e.target.closest('[data-fg]'); if(b && location.hash.slice(1) !== b.dataset.fg) go(b.dataset.fg); }));
$('fScanBtn').addEventListener('click', () => startScan());
$('suppAddBtn').addEventListener('click', () => openSupp(null));

// ---------- pull past the end (or the top) of a tab to move to the next one ----------
(() => {
  const TH = 46; let P = null, acc = 0, accT = null;
  const pageEl = () => document.querySelector('section.page:not(.hide)');
  const skip = el => el.closest('input,textarea,select,.overlay,.hscroll,.chips,.tchips,.rail,.mxs,[data-noswipe]');
  const nextOf = d => TABS3[tabIdx(tabOf(location.hash.slice(1))) + d];
  const ends = pg => ({ bot: pg.scrollTop + pg.clientHeight >= pg.scrollHeight - 2, top: pg.scrollTop <= 0 });
  function hint(d, prog){ const el = $('pullHint'), tab = d ? nextOf(d) : null;
    if(!tab || prog <= .08){ el.style.opacity = 0; el.classList.remove('ready'); return; }
    el.classList.toggle('top', d < 0); el.classList.toggle('bottom', d > 0);
    $('phIcon').textContent = RAIL_IC[tab]; $('phText').textContent = (d > 0 ? '↓ ' : '↑ ') + t(TAB_LBL[tab]);
    const p = Math.min(1, prog); el.style.opacity = .35 + .65 * p; el.style.transform = `translateX(-50%) translateY(${(d > 0 ? 1 : -1) * (1 - p) * 14}px) scale(${.88 + .12 * p})`;
    const ready = prog >= 1; if(ready && !el.classList.contains('ready')) haptic(); el.classList.toggle('ready', ready); }
  document.addEventListener('touchstart', e => { const pg = pageEl();
    if(!pg || e.touches.length > 1 || SWITCHING || document.querySelector('.overlay.open') || skip(e.target)){ P = null; return; }
    const y = e.touches[0].clientY; P = { pg, x: e.touches[0].clientX, y, last: y, base: null, dir: 0, prog: 0 }; }, { passive: true });
  document.addEventListener('touchmove', e => { if(!P) return; const tch = e.touches[0], y = tch.clientY, { bot, top } = ends(P.pg);
    if(P.base === null && Math.abs(tch.clientX - P.x) > 40 && Math.abs(y - P.y) < 24){ P = null; hint(0, 0); return; }
    if(P.base === null){ if(bot && y < P.last && nextOf(1)){ P.base = y; P.dir = 1; } else if(top && y > P.last && nextOf(-1)){ P.base = y; P.dir = -1; } }
    if(P.base !== null){ const pull = P.dir > 0 ? P.base - y : y - P.base; if(pull < -6){ P.base = null; P.dir = 0; P.prog = 0; hint(0, 0); } else { P.prog = pull / TH; hint(P.dir, P.prog); } }
    P.last = y; }, { passive: true });
  const end = () => { if(P && P.prog >= 1) switchTab(P.dir); P = null; hint(0, 0); };
  document.addEventListener('touchend', end, { passive: true }); document.addEventListener('touchcancel', () => { P = null; hint(0, 0); }, { passive: true });
  // mouse wheel / trackpad on a computer
  document.addEventListener('wheel', e => { const pg = pageEl(); if(!pg || SWITCHING || document.querySelector('.overlay.open')) return; const { bot, top } = ends(pg);
    if((e.deltaY > 0 && bot && nextOf(1)) || (e.deltaY < 0 && top && nextOf(-1))){ acc += e.deltaY; clearTimeout(accT); accT = setTimeout(() => { acc = 0; hint(0, 0); }, 380);
      const d = Math.sign(acc); hint(d, Math.abs(acc) / 190); if(Math.abs(acc) >= 190){ acc = 0; hint(0, 0); switchTab(d); } }
    else if(acc){ acc = 0; hint(0, 0); } }, { passive: true });
})();

// ---------- targets: linked macro sliders, fibre suggestion ----------
$('ovTargets').addEventListener('input', e => { const r = e.target.closest('.mxr'); if(r){ moveMx(r.dataset.p, r.dataset.k, +r.value); return; }
  const id = e.target.id || ''; const m = id.match(/^tg([GR])([kpcf])$/); if(!m) return;
  if(m[2] === 'k'){ if(MX[m[1]]){ mxKeepLock(m[1]); drawMx(m[1], true); } } else { MX[m[1]] = mxFromGrams(m[1]); drawMx(m[1], false); }
  if(m[2] === 'k') drawFibSug(); });
$('ovTargets').addEventListener('click', e => {
  if(e.target.closest('#fibUse')){ $('tgFib').value = fibSuggest(); return; }
  if(e.target.closest('#tgGoal button') || e.target.closest('#tgCalc,[data-calc]') || /calc/i.test(e.target.id || '')) setTimeout(() => { ['G', 'R'].forEach(P => { if($('mx' + P)){ MX[P] = mxFromGrams(P); drawMx(P, false); } }); drawFibSug(); }, 0);
});
