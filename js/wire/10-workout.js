// Wiring for 0.5.8: workout screen (light bulb, save-for-later, auto-scroll, wake lock) and the Workout Library sections.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// 💡 only when adding to a live workout
$('sesAddEx').addEventListener('click', () => { $('pkBulb').classList.remove('hide'); gymBulbRobot(); }, true);
$('pkBulb').addEventListener('click', openBulb);
$('blBody').addEventListener('click', e => {
  const bt = e.target.closest('[data-bt]'); if(bt){ drawBulbPlan(bt.dataset.bt); return; }
  if(e.target.closest('#blAccept')){ acceptBulbPlan(); return; }
  const inf = e.target.closest('[data-exinfo]'); if(inf){ e.stopPropagation(); openExInfo(inf.dataset.exinfo); return; }
  const ex = e.target.closest('[data-ex]'); if(ex){ close('ovBulb'); close('ovExPick'); addToSession(ex.dataset.ex); }
});

// Refinements: swipe on past the last exercise and the exercise menu opens (the same as tapping Add Exercise). Closing it without a pick returns to the last exercise.
{ const bd = $('sesBody'); let tm = 0, atAdd = false;
  const onAdd = () => { const a = $('sesAddEx'); return !!(active && a.isConnected && active.exercises.length && a.getBoundingClientRect().top - bd.getBoundingClientRect().top <= PEEK + 24); };
  bd.addEventListener('scroll', () => { clearTimeout(tm); tm = setTimeout(() => { if($('ovExPick').classList.contains('open')) return; const on = onAdd(); if(on && !atAdd){ atAdd = true; $('sesAddEx').click(); } else if(!on) atAdd = false; }, 160); }, { passive: true });
  new MutationObserver(() => { if($('ovExPick').classList.contains('open')) return;
    setTimeout(() => { if(!onAdd()) return; const cards = bd.querySelectorAll('.exc'), last = cards[cards.length - 1]; if(last) last.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 450); }).observe($('ovExPick'), { attributes: true, attributeFilter: ['class'] }); }
// Workout Done: Save As Workout (the old pop-up after finishing now lives here)
$('smBody').addEventListener('click', e => { if(e.target.closest('[data-smtpl]') && SM_SES){ Phone.haptic(); askSaveTpl(SM_SES); } });
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
  setTimeout(() => { if(SSNEXT) return; const rows = [...document.querySelectorAll('#sesBody .exc:not(.ended) .setrow')], cur = document.querySelector(`#sesBody [data-x="${xi}"] [data-s="${si}"]`);
    if(!cur || !cur.classList.contains('done')) return; const i = rows.indexOf(cur), next = rows.slice(i + 1).find(el => !el.classList.contains('done'));
    const bd = $('sesBody'), card = next && next.closest('.exc');   // the page already shows the whole card: nothing to scroll
    if(next && !(card === cur.closest('.exc') && card.offsetHeight <= bd.clientHeight)) next.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); });

// keep the screen on (it's released automatically when you switch apps)
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && $('ovSession').classList.contains('open')) keepAwake(true); });

// rest bar glides (updated every frame, not once a second)
(function restLoop(){
  const fz = REST && $('rbFuse');
  if(fz){ const left = Math.max(0, REST.end - Date.now()), prog = Math.min(1, 1 - left / (REST.total * 1000)), secs = Math.ceil(left / 1000);
    const L = restFit(fz);
    if(L){ const ps = fz.querySelectorAll('path'); ps.forEach(p => p.setAttribute('stroke-dashoffset', String(-L * prog)));   // the lines burn from the left and meet on the right
      const g = $('rbGlow'); if(g){ g.style.left = (ps[0].getPointAtLength(Math.min(L, L * prog)).x / fz.clientWidth * 100).toFixed(2) + '%'; g.style.opacity = .6 + .4 * prog; } }
    const tx = $('restTxt2'); if(tx){ tx.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'); tx.classList.toggle('last', secs <= 10 && left > 0); }
    if(!left) tickRest(); }
  requestAnimationFrame(restLoop); })();

// 0.7.7: the Gym Coach robot lives in the live workout header (top right). Tap it → the chat. 0.7.8: closing the chat makes no floating bubble (coach.js NOBUB).
// When the workout ends its chat ends with it (the next workout starts a fresh chat).
$('sesCoach').addEventListener('click', () => { Phone.haptic(); Coach.open('gymlive'); });
{ let was = false; new MutationObserver(() => { const on = $('ovSession').classList.contains('open'); if(on === was) return; was = on;
    document.body.classList.toggle('inses', on);
    if(!on && !active) Coach.dismiss('gymlive'); }).observe($('ovSession'), { attributes: true, attributeFilter: ['class'] }); }

// Exercise Settings sheet: switches save at once and the open workout redraws; the four tabs switch the list
$('exsTabs').addEventListener('click', e => { const b = e.target.closest('[data-exstab]'); if(!b || b.dataset.exstab === EXS_TAB) return; Phone.haptic(); EXS_TAB = b.dataset.exstab; drawExSet(); $('exsBody').scrollTop = 0; });
$('exsBody').addEventListener('click', e => {
  if(e.target.closest('[data-hmopen]')){ EXS_MK = !EXS_MK; Phone.haptic(); drawExSet(); return; }
  const hm = e.target.closest('[data-hm]'); if(hm){ Phone.haptic(); const G = gx(); hideM('W'); G.hideM = G.hideM || {}; if(G.hideM[hm.dataset.hm]) delete G.hideM[hm.dataset.hm]; else G.hideM[hm.dataset.hm] = true; Store.save('settings', settings); drawExSet(); if(active) renderSession(); return; }
  const b = e.target.closest('[data-gx]'); if(!b) return; Phone.haptic(); setGx(b.dataset.gx, !gOn(b.dataset.gx)); drawExSet(); if(active) renderSession(); });

// 0.7.9.6 Pick Exercise: the back arrow sits in the title row of the solid top strip
{ const b = $('ovExPick').querySelector('.sheet>.sback'); if(b) $('pkBar').prepend(b); }

// 0.7.10.2 the app opens: a rank lower than last seen (a long break, say) shows once as Rank Changed (rank-fx.js)
setTimeout(() => { if(ui.setupDone) RankFx.onOpen(); }, 900);
