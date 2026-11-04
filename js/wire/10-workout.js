// Wiring for 0.5.8: workout screen (light bulb, save-for-later, auto-scroll, wake lock) and the Workout Library sections.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// 💡 only when adding to a live workout
$('sesAddEx').addEventListener('click', () => $('pkBulb').classList.remove('hide'), true);
$('pkBulb').addEventListener('click', openBulb);
$('blBody').addEventListener('click', e => {
  const bt = e.target.closest('[data-bt]'); if(bt){ drawBulbPlan(bt.dataset.bt); return; }
  if(e.target.closest('#blAccept')){ acceptBulbPlan(); return; }
  const inf = e.target.closest('[data-exinfo]'); if(inf){ e.stopPropagation(); openExInfo(inf.dataset.exinfo); return; }
  const ex = e.target.closest('[data-ex]'); if(ex){ close('ovBulb'); close('ovExPick'); addToSession(ex.dataset.ex); }
});

// save an empty workout for later
$('svSave').addEventListener('click', saveSessionAsTpl);
$('svSkip').addEventListener('click', () => { SV = null; close('ovSaveTpl'); });

// Workout Library: fold / unfold sections, open a past workout
$('gTplV').addEventListener('click', e => {
  const f = e.target.closest('[data-fold]'); if(f){ LIBF[f.dataset.fold] = !LIBF[f.dataset.fold]; renderTpls(); return; }
  const s = e.target.closest('[data-ses]'); if(s){ const ses = sessions.find(x => x.id === s.dataset.ses); if(ses) showSummary(ses); }
});
addEventListener('hashchange', () => { if(location.hash === '#gym-lib' && !LIBF.saved){ LIBF.saved = true; renderTpls(); } });

// after ticking a set, the next set slides to the middle of the screen
$('sesBody').addEventListener('click', e => { const ok = e.target.closest('[data-ok]'); if(!ok) return;
  const x = ok.closest('[data-x]'), r = ok.closest('[data-s]'); if(!x || !r) return; const xi = x.dataset.x, si = r.dataset.s;
  setTimeout(() => { const rows = [...document.querySelectorAll('#sesBody .exc:not(.ended) .setrow')], cur = document.querySelector(`#sesBody [data-x="${xi}"] [data-s="${si}"]`);
    if(!cur || !cur.classList.contains('done')) return; const i = rows.indexOf(cur), next = rows.slice(i + 1).find(el => !el.classList.contains('done'));
    if(next) next.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); });

// keep the screen on (it's released automatically when you switch apps)
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && $('ovSession').classList.contains('open')) keepAwake(true); });

// rest bar glides (updated every frame, not once a second)
(function restLoop(){ const pr = $('restProg2'); if(REST && pr) pr.style.width = `${Math.max(0, Math.min(100, (1 - (REST.end - Date.now()) / 1000 / REST.total) * 100))}%`; requestAnimationFrame(restLoop); })();
