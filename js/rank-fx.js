// 0.7.10.2 Rank Up / Rank Changed: the plate spins like a coin and turns into the new rank (Petros's design: rank-change.js/.css,
// canvas "Rank Icons" › Anim). Up: 9 turns, fast then slowing, flash + rising sparks. Down: 4 turns the other way, greyer, settles with a wobble.
// When: at the end of a workout (each exercise whose rank changed in it, at most 3, the rest listed in Workout Done)
// and when the app opens (a rank lower than last seen, e.g. after a long break). profile.rankSeen = { exId: n } remembers
// the last rank shown per exercise, so each change shows once and never again after a reload.
// Motion: CSS keyframes started by one class; no layout reads while it plays. Reduce Motion: a plain cross-fade between the two plates.

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
  // the coin (Petros's design: rank-change.js / rank-change.css, "Rank Icons" › Anim): the plate face on a 3D edge of 21 rings
  // and a back disc, in the plate's metal; sizes from the plate (III 5 kg … I 25 kg)
  const COL = { bronze: ['#c98a5a', '#7a4a28'], silver: ['#c4ccd6', '#7d8794'], gold: ['#f2c14e', '#a87a12'], platinum: ['#5fe3c8', '#1f8f7c'], diamond: ['#7fb8ff', '#2f63b8'] };
  const R64 = { III: 17, II: 22.5, I: 26.5 }, TH = { III: 8, II: 11, I: 14 }, SIZE = 168, NL = 21, W = 280;   // W: the window slides in first
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timers = [], busy = Promise.resolve();
  const tierOfN = n => TIERS[Math.floor(n / 3)];
  function coin(n){ const m = tierOfN(n), s = ROMAN[n % 3], [main, dark] = COL[m];
    const R = (R64[s] + 1) * SIZE / 64, T = TH[s], off = Math.round(SIZE / 2 - R), dia = Math.round(R * 2), hole = Math.round(3.3 * SIZE / 64), box = `left:${off}px;top:${off}px;width:${dia}px;height:${dia}px`;
    let h = '';
    for(let k = 0; k < NL; k++){ const shade = (k < 2 || k > NL - 3 || k % 5 === 3) ? main : dark;
      h += `<i class="rcedge" style="${box};transform:translateZ(${(-T / 2 + T * k / (NL - 1)).toFixed(2)}px);border:3px solid ${shade}"></i>`; }
    h += `<i class="rcedge" style="${box};transform:translateZ(${(-T / 2 - .15).toFixed(2)}px) rotateY(180deg);background:radial-gradient(circle,transparent 0 ${hole}px,${dark} ${hole}px,${main} 60%,${dark} 100%)"></i>`;
    return h + `<span class="rcface" style="transform:translateZ(${(T / 2 + .15).toFixed(2)}px)">${rankIcon(m, n, SIZE)}</span>`; }

  function draw(c){ const box = $('rfxBody'), tf = tierFor(c.exId, undefined, true), name = exName(c.exId), up = c.kind !== 'down';
    const to = c.to, tier = tierOfN(to), label = tierName(to), metal = c.from == null || tierOfN(c.from) !== tier;
    const tag = up ? t(metal ? 'rfxUp' : 'rfxStep') : t('rfxDown');
    $('ovRankFx').className = `overlay center tr-${tier}`;
    box.innerHTML = `<p class="sub rfxex">${esc(name)}</p>
      <div class="rcstage" aria-hidden="true" style="color:${COL[tier][0]}"><i class="rcflash"></i>${up ? Array.from({ length: 12 }, (_, k) =>
        `<i class="rcpt" style="left:${18 + (k * 53) % 64}%;width:${4 + (k % 3) * 2}px;height:${4 + (k % 3) * 2}px;animation-delay:${(.9 + (k % 6) * .07).toFixed(2)}s"></i>`).join('') : ''}
        <div class="rccoin">${c.from == null ? '' : `<div class="rcside rcA">${coin(c.from)}</div>`}<div class="rcside rcB">${coin(to)}</div></div></div>
      <div class="rclbl"><h2 class="rctag ${up ? 'up' : 'down'}" id="rfxT">${esc(tag)}</h2><b class="rcname">${esc(label)}</b></div>
      ${up ? '' : `<p class="rfxmsg">${esc(t('rfxDownMsg', { ex: name, rank: label }))}</p>`}
      ${tf && tf.label ? `<div class="tiergap rfxbar">${tierBarHtml(tf)}</div>` : ''}
      <div class="actions"><button class="btn primary" type="button" id="rfxOk">${esc(t(up ? 'rfxNice' : 'rfxGotIt'))}</button></div>`;
    $('rfxOk').addEventListener('click', () => close('ovRankFx'));
    $('ovRankFx').setAttribute('aria-label', `${tag} · ${name} · ${label}`); }

  // the motion is all in workout.css (rc-up / rc-down / rc-first, ported from rank-change.css); one class starts it.
  // The old coin hides and the new one shows at 50 %, exactly when the coin is edge-on (1890° up, 990° down).
  function animate(c){ const ov = $('ovRankFx'), kind = reduce() ? 'reduce' : c.kind === 'down' ? 'down' : c.from == null ? 'first' : 'up';
    timers.push(setTimeout(() => { ov.classList.add('rc-' + kind); }, W));
    if(c.kind !== 'down') timers.push(setTimeout(() => Phone.haptic(), W + ({ up: 900, first: 450, reduce: 400 })[kind])); }
  function stop(){ timers.forEach(clearTimeout); timers = []; }
  // one window; resolves once it has closed (Nice / Got It, or a tap outside)
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
