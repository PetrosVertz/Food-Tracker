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
// Petros: only a swipe that STARTS on the last exercise does it; a swipe (even a hard flick) from an earlier one never opens the menu, it stops on the
// last exercise. The menu rises with the page (inline transform only, no blur) and lands with a spring. In a live workout it can be pulled down again
// from anywhere in its top strip, or from its list when the list is at the top, and it drops away (shared drag helper, 1:1 with the finger).
{ const bd = $('sesBody'), pk = $('ovExPick'), sh = pk.querySelector(':scope>.sheet');
  let tm = 0, raf = 0, drag = false, pv = 0, atAdd = false, cool = 0, touching = false, s0 = 0, armed = false, anim = null;
  const cards = () => bd.querySelectorAll(':scope>.exc'), lastCard = () => { const cs = cards(); return cs[cs.length - 1]; };
  const onAdd = () => { const a = $('sesAddEx'); return !!(active && a.isConnected && active.exercises.length && a.getBoundingClientRect().top - bd.getBoundingClientRect().top <= PEEK + 24); };
  // progress = how far you are along the swipe from where the last exercise rested to the Add page at the top: the menu is fully up exactly when the Add page arrives
  const prog = () => { if(!armed || !active || !active.exercises.length) return 0; const room = bd.scrollHeight - bd.clientHeight - s0; return room < 40 ? 0 : Math.max(0, Math.min(1, (bd.scrollTop - s0) / room)); };
  const put = p => { sh.style.transform = `translate3d(0,${((1 - p) * 100).toFixed(2)}%,0)`; };   // p: 0 = below the screen, 1 = up
  const stopAnim = () => { if(anim){ anim.onfinish = null; anim.cancel(); anim = null; } };
  const spring = (p0, p1, vy, done) => { stopAnim(); const H = sh.offsetHeight || innerHeight;
    anim = springTo(sh, { y: (1 - p0) * H }, { y: (1 - p1) * H }, { y: vy || 0 }, { k: 240, damp: .92, fill: 'forwards' }); anim.onfinish = () => { put(p1); stopAnim(); if(done) done(); }; };
  const landed = () => { sh.style.transform = ''; };   // pkdrag stays on while it is open (taking it off would replay the opening animation)
  // the menu drops away: the last exercise comes back down at the same time
  const drop = (p0, vy) => { cool = Date.now() + 1200; if(onAdd()) showCard(lastCard());
    spring(p0, 0, vy, () => { pk.classList.add('pkcancel'); close('ovExPick'); }); };   // pkcancel stays while it is closed (the next opening clears it)
  // only your own finger or wheel drives it (not the scroll the app does itself); where the page rested when you started is "0"
  const grab = () => { if(touching) return; touching = true; s0 = bd.scrollTop; armed = +(bd.dataset.cur || 0) === cards().length - 1 && !onAdd(); };
  ['touchstart', 'pointerdown', 'wheel'].forEach(k => bd.addEventListener(k, grab, { passive: true }));
  // Petros: nothing settles while the finger is still on the glass (a pause mid-swipe used to spring the menu away under the finger); it waits for the lift
  let down = false, waitUp = false;
  bd.addEventListener('touchstart', () => { down = true; }, { passive: true });
  ['touchend', 'touchcancel'].forEach(k => bd.addEventListener(k, e => { if(e.touches.length) return; down = false;
    if(waitUp){ waitUp = false; clearTimeout(tm); tm = setTimeout(() => settle(), 120); } }, { passive: true }));   // a fling's scrolling resets this wait
  ['touchend', 'pointerup'].forEach(k => bd.addEventListener(k, () => setTimeout(() => { if(!bd.classList.contains('moving')) touching = false; }, 90), { passive: true }));   // a tap, no swipe
  const frame = () => { raf = 0; if(pk.classList.contains('open') && !drag) return; if(!touching || (!drag && Date.now() < cool)) return; const p = prog();
    if(!drag && p > .02){ drag = true; stopAnim(); pk.classList.remove('pkcancel'); pk.classList.add('pkdrag'); put(0); $('sesAddEx').click(); }
    if(drag){ pv = p; put(p); } };
  // let go: the page has already snapped (the menu followed it all the way), so the menu just finishes where the page landed
  const settleDrag = () => { if(!drag) return; drag = false; if(onAdd()) spring(pv, 1, 0, landed); else drop(pv, 0); };
  $('sesAddEx').addEventListener('click', () => { if(drag) return; stopAnim(); pk.classList.remove('pkdrag', 'pkcancel'); sh.style.transform = ''; }, true);
  let settle = () => {};
  bd.addEventListener('scrollend', () => { if(bd.classList.contains('moving')){ clearTimeout(tm); settle(); } }, { passive: true });   // where the phone tells us the page has stopped: no extra wait
  bd.addEventListener('scroll', () => { if(!bd.classList.contains('moving')) bd.classList.add('moving');   /* only a real change: the same class written again on every scroll event woke every class watcher */ if(!raf) raf = requestAnimationFrame(frame); clearTimeout(tm); tm = setTimeout(settle = () => { if(down){ waitUp = true; return; } const was = bd.dataset.cur; if(was !== undefined && markPages() !== +was) Phone.haptic(); else markPages(); bd.classList.remove('moving');   // a tiny buzz when a new exercise snaps in
    const mine = touching, fromLast = armed; touching = false; if(drag){ settleDrag(); return; }
    if(pk.classList.contains('open')) return; const on = onAdd();
    if(on && mine && !fromLast){ showCard(lastCard()); return; }   // flung past the last exercise from an earlier one: back to the last exercise, no menu
    if(on && !atAdd){ atAdd = true; $('sesAddEx').click(); } else if(!on) atAdd = false; }, 120); }, { passive: true });
  const live = () => !!(active && active.exercises.length && pk.classList.contains('open') && $('ovSession').classList.contains('open'));
  // the browser is told before the finger lands that a downward pull on the top strip (and on the list while it is at the top) is ours, not a scroll
  const markLive = () => { pk.classList.toggle('pklive', live()); pk.classList.toggle('pkattop', $('pkBody').scrollTop <= 0); };
  $('pkBody').addEventListener('scroll', () => { const t = $('pkBody').scrollTop <= 0; if(t !== pk.classList.contains('pkattop')) pk.classList.toggle('pkattop', t); }, { passive: true });
  new MutationObserver(ms => { markLive();   // opened any other way (a tap, the Workout Library): the ordinary window, nothing left over from a swipe
    if(!drag && pk.classList.contains('open') && ms.some(m => !/\bopen\b/.test(m.oldValue || ''))){ stopAnim(); pk.classList.remove('pkdrag', 'pkcancel'); sh.style.transform = ''; } }).observe(pk, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  new MutationObserver(() => { if(pk.classList.contains('open')) return;
    setTimeout(() => { if(!onAdd() || Date.now() < cool) return; showCard(lastCard()); }, 450); }).observe(pk, { attributes: true, attributeFilter: ['class'] });
  // pull the menu down to put it away (live workout only): the top strip anywhere, or the list once it is scrolled to the top
  let where = '', ty = 0, tx = 0;
  sh.addEventListener('touchstart', e => { const p = e.touches[0]; ty = p.clientY; tx = p.clientX; where = e.target.closest('.pktop') ? 'top' : e.target.closest('#pkBody') ? 'list' : ''; }, { passive: true });
  sh.addEventListener('touchmove', e => { if(!where || !live() || !e.cancelable || e.touches.length > 1) return; const p = e.touches[0], dy = p.clientY - ty, dx = p.clientX - tx;   // the list doesn't scroll or bounce while it is pulled
    if(dy > 0 && dy > Math.abs(dx) && (where === 'top' || $('pkBody').scrollTop <= 0)) e.preventDefault(); }, { passive: false });
  let H = 0, fromTop = false;
  dragger(sh, { axis: 'y', slop: 8,
    item: e => { if(!live() || drag || e.target.closest('input,.pksearch') || !e.target.closest('.pktop,#pkBody')) return null; fromTop = !!e.target.closest('.pktop'); return sh; },
    claim: (dx, dy) => dy > 0 && (fromTop || $('pkBody').scrollTop <= 0),
    start: () => { stopAnim(); H = sh.offsetHeight || innerHeight; pk.classList.add('pkdrag'); },
    move: s => { const y = s.dy > 0 ? s.dy : rubber(s.dy, H) * .3; sh.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`; },
    end: (s, ok) => { const y = Math.max(0, s.dy), p = 1 - y / H;
      if(ok && (y > H * .22 || (s.vy > .45 && y > 24))){ Phone.haptic(); drop(p, s.vy); } else spring(p, 1, s.vy, landed); } });
}
$('sesDots').addEventListener('click', e => { const d = e.target.closest('[data-dot]'); if(!d) return; showCard($('sesBody').querySelectorAll(':scope>.exc')[+d.dataset.dot]); });
// the tip: Swipe For Next goes to the next exercise; only Swipe To Add opens the exercise menu
$('sesTip').addEventListener('click', () => { Phone.haptic(); const bd = $('sesBody'), cs = bd.querySelectorAll(':scope>.exc'), c = +(bd.dataset.cur || 0);
  if(c < cs.length - 1) showCard(cs[c + 1]); else $('sesAddEx').click(); });
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
    if(next && card === cur.closest('.exc') && card.classList.contains('capped')){ listReveal(next.closest('.setlist'), next); return; }   // a card at its height limit scrolls its own set list, never the page
    if(next && !(card === cur.closest('.exc') && card.offsetHeight <= bd.clientHeight)) next.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); });
// Active Exercise card cap: window resize and the on-screen keyboard (visualViewport) re-measure once per frame; the field being typed in stays in its list's view
{ let fr = 0; const refit = () => { if(fr || !active) return; fr = requestAnimationFrame(() => { fr = 0; if(!active || !$('ovSession').classList.contains('open')) return; fitPages();
    const f = document.activeElement, l = f && f.closest && f.closest('#sesBody .setlist'); if(l) listReveal(l, f.closest('.setrow')); }); };
  addEventListener('resize', refit); if(window.visualViewport) visualViewport.addEventListener('resize', refit);
  // the page's own size settles after the window's resize event (sheet layout): watch it directly. Its size never depends on the cards, so no loop
  if(window.ResizeObserver){ let h0 = 0; new ResizeObserver(es => { const h = es[0].contentRect.height; if(Math.abs(h - h0) < 1) return; h0 = h; refit(); }).observe($('sesBody')); } }
// a compact (older, finished) set opens again when you tap or focus it; it stays open for this screen only (nothing saved) and is kept in view
{ const reopen = e => { const r = e.target.closest('.exc.capped .setrow.old'); if(!r || !active || e.target.closest('[data-ok]')) return;   // the tick keeps working as a tick
    const x = active.exercises[+r.closest('[data-x]').dataset.x], s = x && x.sets[+r.dataset.s]; if(!s) return;
    SET_OPEN.add(s); r.classList.remove('old'); listReveal(r.closest('.setlist'), r); };
  $('sesBody').addEventListener('focusin', reopen); $('sesBody').addEventListener('pointerdown', reopen, true); }

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

// 0.7.7: the Gym Coach robot lives in the live workout header (top right). Tap it → the chat. 0.7.8: closing the chat makes no floating bubble (coach.js HEAD).
// When the workout ends its chat ends with it (the next workout starts a fresh chat).
$('sesCoach').addEventListener('click', () => { Phone.haptic(); gcOpenLive(); });   // Gym Coach intelligence: shows a waiting hint, if any
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
