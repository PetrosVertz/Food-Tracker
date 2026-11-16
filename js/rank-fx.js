// 0.7.10.2 Rank Up / Rank Changed: the plate spins like a coin and turns into the new rank (canvas: Rank Icons › Anim).
// When: at the end of a workout (each exercise whose rank changed in it, at most 3, the rest listed in Workout Done)
// and when the app opens (a rank lower than last seen, e.g. after a long break). profile.rankSeen = { exId: n } remembers
// the last rank shown per exercise, so each change shows once and never again after a reload.
// Motion: Web Animations on transform and opacity only, all started in one go on one timeline; no layout reads while it plays.
// Reduce Motion: a plain cross-fade between the two plates.

// before / after: { exId: n (0–14) } → [{ exId, from, to, kind: 'first' | 'up' | 'tierup' | 'down' }]; same rank or no rank now → nothing
function rankChanges(before, after, ids){
  before = before || {}; after = after || {};
  return (ids || Object.keys(after)).map(id => { const a = after[id], b = before[id];
    if(a == null || a === b) return null;
    if(b == null) return { exId: id, from: null, to: a, kind: 'first' };
    if(a < b) return { exId: id, from: b, to: a, kind: 'down' };
    return { exId: id, from: b, to: a, kind: Math.floor(a / 3) > Math.floor(b / 3) ? 'tierup' : 'up' }; }).filter(Boolean);
}
// every exercise with a finished set in a saved workout
const rankIds = () => { const ids = new Set(); sessions.forEach(s => s.exercises.forEach(x => { if(x.sets.some(st => st.done)) ids.add(x.exId); })); return [...ids]; };
// the rank of each exercise as of the saved workouts (the one in progress left out)
function rankNow(ids){ const out = {}; ids.forEach(id => { const tf = tierFor(id, undefined, true); if(tf && tf.label) out[id] = tf.n; }); return out; }

const RankFx = (() => {
  const SPARK = { bronze: 12, silver: 12, gold: 12, platinum: 12, diamond: 14 }, RAINBOW = ['#ff5f6d', '#ffc371', '#f9f871', '#5ef2a0', '#5ec8ff', '#a77bff'];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !document.body.animate;
  let anims = [], timer = 0, busy = Promise.resolve();
  const tierOfN = n => TIERS[Math.floor(n / 3)];
  // cubic ease-out spin, sampled so the plate is exactly edge-on (thin) at the moment the picture swaps
  function spinKeys(total, swapAt){ const ease = p => 1 - Math.pow(1 - p, 3), ts = 1 - Math.cbrt(1 - swapAt / total), keys = [];
    for(let i = 0; i <= 48; i++){ const p = i / 48; keys.push({ offset: p, transform: `rotateY(${(total * ease(p)).toFixed(2)}deg)` }); }
    keys.push({ offset: ts, transform: `rotateY(${swapAt}deg)` }); keys.sort((a, b) => a.offset - b.offset);
    return { keys, ts }; }
  const swapKeys = (ts, show) => show ? [{ opacity: 0 }, { offset: ts, opacity: 0 }, { offset: ts, opacity: 1 }, { opacity: 1 }] : [{ opacity: 1 }, { offset: ts, opacity: 1 }, { offset: ts, opacity: 0 }, { opacity: 0 }];
  const go = (el, keys, o) => { if(!el) return null; const a = el.animate(keys, { fill: 'both', ...o }); anims.push(a); return a; };

  function draw(c){ const box = $('rfxBody'), tf = tierFor(c.exId, undefined, true), name = exName(c.exId), up = c.kind !== 'down';
    const to = c.to, from = c.from == null ? to : c.from, tier = tierOfN(to), label = tierName(to);
    const plate = (n, cls) => rankIcon(tierOfN(n), n, 120).replace('class="rankic"', `class="rankic ${cls}"`);
    $('ovRankFx').className = `overlay center rfx-${c.kind} tr-${tier}`;
    box.innerHTML = `<span class="rfxhalo" aria-hidden="true"></span><h2 id="rfxT">${esc(t(up ? 'rfxUp' : 'rfxDown'))}</h2>
      ${up ? `<p class="sub rfxex">${esc(name)}</p>` : ''}
      <div class="rfxstage" aria-hidden="true"><span class="rfxglow"></span><span class="rfxrain"></span>
        <span class="rfxland"><span class="rfxcoin">${c.kind === 'first' ? '' : plate(from, 'rfxa')}${plate(to, 'rfxb')}<span class="rfxdim"></span><span class="rfxshine"><i></i></span></span></span>
        <span class="rfxsparks"></span></div>
      <b class="rfxname">${esc(label)}</b>
      ${up ? '' : `<p class="rfxmsg">${esc(t('rfxDownMsg', { ex: name, rank: label }))}</p>`}
      ${tf && tf.label ? `<div class="tiergap rfxbar">${tierBarHtml(tf)}</div>` : ''}
      <div class="actions"><button class="btn primary" type="button" id="rfxOk">${esc(t(up ? 'rfxNice' : 'rfxGotIt'))}</button></div>`;
    $('rfxOk').addEventListener('click', () => close('ovRankFx'));
    $('ovRankFx').setAttribute('aria-label', `${t(up ? 'rfxUp' : 'rfxDown')} · ${name} · ${label}`); }

  function animate(c){ const ov = $('ovRankFx'), q = s => ov.querySelector(s), a = q('.rfxa'), b = q('.rfxb'), W = 280;   // W: the window slides in first
    const bar = q('.tgbar i'), barTo = bar ? bar.style.transform : '';
    if(reduce()){ go(a, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: W }); go(b, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: W });
      if(c.kind !== 'down') timer = setTimeout(() => Phone.haptic(), W + 400); return; }
    const big = c.kind === 'tierup', diamond = tierOfN(c.to) === 'diamond';
    let land;
    if(c.kind === 'first'){ land = W + 440;   // drops in from above, squashes a little, settles
      go(q('.rfxland'), [{ transform: 'translate3d(0,-170px,0)', opacity: 0 }, { offset: .2, opacity: 1 }, { offset: .55, transform: 'translate3d(0,0,0) scale(1.08,.92)' },
        { offset: .75, transform: 'translate3d(0,-12px,0) scale(.98,1.02)' }, { offset: .9, transform: 'translate3d(0,0,0) scale(1.02,.98)' }, { transform: 'translate3d(0,0,0)', opacity: 1 }],
        { duration: 800, delay: W, easing: 'cubic-bezier(.3,0,.5,1)' }); }
    else if(c.kind === 'down'){ const D = 2200, s = spinKeys(-720, -450); land = W + D;   // the other way, slower, a little dimmer while it turns
      go(q('.rfxcoin'), s.keys, { duration: D, delay: W }); go(a, swapKeys(s.ts, false), { duration: D, delay: W }); go(b, swapKeys(s.ts, true), { duration: D, delay: W });
      go(q('.rfxdim'), [{ opacity: 0 }, { offset: .2, opacity: .38 }, { offset: .8, opacity: .38 }, { opacity: 0 }], { duration: D, delay: W });
      go(q('.rfxland'), [{ transform: 'translate3d(0,0,0)' }, { offset: .35, transform: 'translate3d(0,4px,0) scale(1.01,.97)' }, { transform: 'translate3d(0,0,0)' }], { duration: 300, delay: land, easing: 'ease-out' }); }
    else { const D = 1500, s = spinKeys(1080, 630); land = W + D;   // 3 turns, fast then slowing; lands with a bounce
      go(q('.rfxcoin'), s.keys, { duration: D, delay: W }); go(a, swapKeys(s.ts, false), { duration: D, delay: W }); go(b, swapKeys(s.ts, true), { duration: D, delay: W });
      go(q('.rfxland'), [{ transform: 'scale(1)' }, { offset: .3, transform: 'scale(1.14)' }, { offset: .6, transform: 'scale(.95)' }, { offset: .82, transform: 'scale(1.02)' }, { transform: 'scale(1)' }],
        { duration: 460, delay: land, easing: 'ease-out' }); }
    if(c.kind !== 'down'){
      go(q('.rfxshine i'), [{ transform: 'translate3d(-300%,0,0) rotate(20deg)' }, { transform: 'translate3d(300%,0,0) rotate(20deg)' }], { duration: 650, delay: land + 60, easing: 'ease-in-out' });
      const sp = q('.rfxsparks'), n = (SPARK[tierOfN(c.to)] || 12) * (big ? 2 : 1), dist = big ? 118 : 88;
      sp.innerHTML = Array.from({ length: n }, (_, i) => `<i${diamond ? ` style="background:${RAINBOW[i % RAINBOW.length]}"` : ''}></i>`).join('');
      [...sp.children].forEach((el, i) => { const ang = (i / n) * Math.PI * 2 + (i % 2 ? .18 : 0), r = dist * (.7 + (i % 3) * .15), dx = Math.cos(ang) * r, dy = Math.sin(ang) * r;
        go(el, [{ transform: 'translate3d(0,0,0) scale(1)', opacity: 0 }, { offset: .05, opacity: 1 }, { transform: `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(.2)`, opacity: 0 }],
          { duration: 700 + (i % 4) * 60, delay: land - 20, easing: 'cubic-bezier(.15,.7,.3,1)' }); });
      timer = setTimeout(() => Phone.haptic(), land);
      if(big || c.kind === 'first'){ go(q('.rfxglow'), [{ opacity: 0, transform: 'scale(.6)' }, { offset: .3, opacity: 1, transform: 'scale(1.05)' }, { opacity: big ? .7 : .45, transform: 'scale(1)' }], { duration: 900, delay: land - 120, easing: 'ease-out' }); }
      if(big) go(q('.rfxhalo'), [{ opacity: 0 }, { offset: .35, opacity: 1 }, { opacity: .75 }], { duration: 1000, delay: land - 60, easing: 'ease-out' });
      if(diamond) go(q('.rfxrain'), [{ opacity: 0, transform: 'rotate(0deg) scale(.9)' }, { offset: .3, opacity: .9 }, { opacity: 0, transform: 'rotate(200deg) scale(1.08)' }], { duration: 1400, delay: land - 60, easing: 'ease-out' });
    }
    if(bar && barTo) go(bar, [{ transform: 'scaleX(0)' }, { transform: barTo }], { duration: 600, delay: land + 120, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  function stop(){ clearTimeout(timer); anims.forEach(a => { try{ a.cancel(); }catch(e){} }); anims = []; }
  // one window; resolves once it has closed (Nice / Got It, a tap outside, or pulled down)
  function show(c){ return new Promise(res => { const ov = $('ovRankFx'); stop(); draw(c); open('ovRankFx'); animate(c);
    const mo = new MutationObserver(() => { if(ov.classList.contains('open')) return; mo.disconnect(); stop(); setTimeout(res, 260); });   // 260: the close animation ends before the next one opens
    mo.observe(ov, { attributes: true, attributeFilter: ['class'] }); }); }
  // one after another, never overlapping
  function play(list){ (list || []).forEach(c => { busy = busy.then(() => show(c)); }); return busy; }

  // end of a workout (before = rankNow() taken just before it was saved): each exercise in it against its last seen rank
  // (or its rank before the workout if never seen); remember the new ones → the changes, best news first
  function afterWorkout(ses, before){ if(!tierBody() || !ses) return [];
    const ids = [...new Set(ses.exercises.map(x => x.exId))], now = rankNow(ids), seen = { ...(profile.rankSeen || {}) };
    const ch = rankChanges({ ...(before || {}), ...seen }, now, ids); if(!ch.length) return [];
    ch.forEach(c => { seen[c.exId] = c.to; }); profile.rankSeen = seen; saveProfile();
    const order = { tierup: 0, up: 1, first: 2, down: 3 }; return ch.sort((a, b) => order[a.kind] - order[b.kind] || b.to - a.to); }
  // the app opens: ranks never seen are noted quietly; a rank higher than last seen too (it was shown when it happened);
  // a lower one is shown once (at most 3; the rest are noted quietly)
  function onOpen(){ if(!tierBody()) return;
    const ids = rankIds(), now = rankNow(ids), had = profile.rankSeen, seen = { ...(had || {}) };
    let dirty = !had; const down = had ? rankChanges(seen, now, ids).filter(c => c.kind === 'down') : [];
    ids.forEach(id => { if(now[id] != null && (seen[id] == null || now[id] > seen[id])){ seen[id] = now[id]; dirty = true; } });
    const free = !document.querySelector('.overlay.open');   // something else is on screen: show them next time
    if(free && down.length){ down.forEach(c => { seen[c.exId] = c.to; }); dirty = true; }
    if(dirty){ profile.rankSeen = seen; saveProfile(); }
    if(free && down.length) play(down.sort((a, b) => b.to - a.to).slice(0, 3)); }
  return { play, afterWorkout, onOpen };
})();
