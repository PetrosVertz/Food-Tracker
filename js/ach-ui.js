// Achievements, what you see (Social Hub): the unlock pop-up, the collection inside the Hub, the detail window. The rules live in js/achievements.js.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// The pop-up (approved mock-up): one pill slides down from the top, "Achievement unlocked" slides up and away while the title rises in from below, a few seconds
// later the whole pill leaves through the top. Tap = the details (back returns to what was under it, e.g. Workout Done); swipe up = dismiss (shared dragger,
// transform only); a hidden Dismiss button for keyboards and screen readers. Reduced motion: a fade in place. One light haptic on arrival. No sound.
// One pop-up per save: announce() gets the whole batch, shows the featured one and "+N more", and the details window lists the batch.
const AchUI = (() => {
  const TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/></svg>';
  let FILTER = 'all', VIEW = 'main', BATCH = [], pop = null, timers = [], tk = 0;

  // ----- colours: the coin is the theme accent, the body a darker shade of it that still reads white text at 4.5:1 or better
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), hex = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  function bodyShade(acc){ let k = .5, c = hex(rgb(acc).map(v => v * (1 - k))); while(contrastHex(c, '#ffffff') < 5 && k < .9){ k += .03; c = hex(rgb(acc).map(v => v * (1 - k))); } return c; }
  function paint(){ if(!pop) return; const cs = getComputedStyle(document.documentElement), acc = cs.getPropertyValue('--t-accent').trim();
    if(/^#[0-9a-f]{6}$/i.test(acc)) pop.style.setProperty('--body', bodyShade(acc)); }
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] });   // a theme change recolours a pop-up that is on screen

  // ----- words: the evidence is data (see achievements.js); the sentence and the units are made here
  const loadTxt = kg => lbW(kg), repsTxt = n => String(n);
  const day = d => fmtDate(d + 'T12:00:00');
  const hms = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const num = n => Number(n).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB');
  const volTxt = kg => bwU() === 'lb' ? `${num(Math.round(kg * LB))} lb` : `${num(Math.round(kg))} kg`;
  const lines = l => (l || []).map(id => exName(id)).join(' › ');
  function params(id, e){
    e = e || {}; const p = {};
    if(e.x) p.x = exName(e.x); if(e.n != null) p.n = num(e.n); if(e.r != null) p.r = num(e.r); if(e.a && typeof e.a === 'string') p.a = day(e.a); if(e.b && typeof e.b === 'string') p.b = day(e.b);
    if(Array.isArray(e.l)) p.l = lines(e.l); else if(e.l != null) p.l = loadTxt(e.l);
    if(e.p != null) p.p = id === 'new_plate' ? loadTxt(e.p) : num(e.p);
    if(e.w != null) p.w = loadTxt(e.w);
    if(id === 'groundhog' && e.s){ p.ta = hms(e.s[0]); p.tb = hms(e.s[1]); }
    if(id === 'other_left'){ const f = q => `${t('achLeft')} ${q[0]}, ${t('achRight')} ${q[1]}`; p.a = f(e.a); p.b = f(e.b); }
    if(id === 'elephant') p.v = volTxt(5000); if(id === 'whale') p.v = volTxt(150000);
    if(id === 'elephant' || id === 'whale') p.n = volTxt(e.n);
    return p;
  }
  const nameOf = id => t('an_' + id), howOf = id => t('ac_' + id, params(id, {})), didOf = (id, e) => t('ae_' + id, params(id, e));
  const extraOf = (id, e) => S['af_' + id] ? t('af_' + id, params(id, e)) : '';

  // ----- the pop-up
  function build(){ if(pop) return pop; pop = document.createElement('div'); pop.className = 'achpop'; pop.id = 'achPop'; pop.setAttribute('role', 'status'); pop.setAttribute('aria-live', 'polite');
    pop.innerHTML = `<div class="achcoin">${TROPHY}</div><div class="achbody" aria-hidden="true"></div><button type="button" class="achhit"><span class="achsr"></span></button><button type="button" class="achdis"></button>`;
    document.body.appendChild(pop);
    pop.querySelector('.achhit').addEventListener('click', () => { if(!pop.classList.contains('live')) return; away(); openDetail(BATCH); });
    pop.querySelector('.achdis').addEventListener('click', away); pop.addEventListener('keydown', e => { if(e.key === 'Escape') away(); });
    dragger(pop, { axis: 'y', slop: 6, claim: (dx, dy) => dy < 0 && pop.classList.contains('live'),
      start: () => { stopTimers(); pop.style.transition = 'none'; },
      move: s => { pop.style.transform = `translateY(${(s.dy <= 0 ? s.dy : rubber(s.dy, 60)).toFixed(1)}px)`; },
      end: (s, ok) => { const dy = Math.min(0, s.dy), h = pop.offsetHeight + 24;
        pop.style.transition = '';
        if(ok && (-dy > h * .4 || (s.vy < -.4 && -dy > 12))){ pop.style.transform = ''; away(true); return; }
        const a = pop.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.22,1.2,.36,1)' }); pop.style.transform = ''; leaveLater(2000); } });
    return pop; }
  const stopTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const later = (ms, fn) => { const k = tk; timers.push(setTimeout(() => { if(k === tk) fn(); }, ms)); };
  function away(fast){ stopTimers(); tk++; if(!pop) return; pop.classList.remove('in'); pop.classList.add('out'); if(fast) pop.style.transition = ''; timers.push(setTimeout(() => pop.classList.remove('live', 'out', 'second'), 320)); }
  function leaveLater(ms){ const k = ++tk; timers.push(setTimeout(() => { if(k === tk) away(); }, ms)); }
  function hold(first){ const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1; return Math.max(3000, Math.round(nameOf(first.id).length * 90 * Math.max(1, scale))); }
  // list = new unlocks [{ id, d, w, e }], featured first. opts.catchUp: one summary for achievements found in old history
  function announce(list, opts){
    if(!list || !list.length) return; opts = opts || {}; build(); stopTimers(); tk++; BATCH = list.slice();
    const f = list[0], n = list.length - 1, rm = reducedMotion(), secret = Ach.SECRET.has(f.id) && !opts.catchUp;
    const title = opts.catchUp ? t('achCatch', { n: list.length }) : nameOf(f.id), more = !opts.catchUp && n ? t('achMore', { n }) : '';
    pop.querySelector('.achbody').innerHTML = `<div class="achfr one"><span class="achk">${esc(t(secret ? 'achUnlockedSecret' : 'achUnlocked'))}</span></div><div class="achfr two"><span class="achn">${esc(title)}</span>${more ? `<span class="achmore">${esc(more)}</span>` : ''}</div>`;
    pop.querySelector('.achsr').textContent = `${t(secret ? 'achUnlockedSecret' : 'achUnlocked')}: ${title}.${more ? ' ' + more + '.' : ''} ${t('achOpen')}`;
    pop.querySelector('.achdis').textContent = t('achDismiss'); paint();
    pop.className = 'achpop' + (rm ? ' rm' : ''); void pop.offsetHeight; pop.classList.add('live'); void pop.offsetHeight; pop.classList.add('in');
    Phone.haptic();
    later(300 + 1000, () => pop.classList.add('second'));
    later(300 + 1000 + 320 + hold(f), () => away());
  }

  // ----- the details window (#ovAch): back = whatever was under it
  function detailHtml(list){
    return list.map(a => { const x = extraOf(a.id, a.e);
      return `<div class="achcard"><span class="achc">${TROPHY}</span><div class="achtx"><b>${esc(nameOf(a.id))}</b>${x ? `<em>${esc(x)}</em>` : ''}<h4>${esc(t('achHow'))}</h4><p>${esc(howOf(a.id))}</p><h4>${esc(t('achDid'))}</h4><p>${esc(didOf(a.id, a.e))}</p><span class="achdate">${esc(t('achOn', { d: day(a.d) }))}</span></div></div>`; }).join('');
  }
  function openDetail(list){ const box = $('achDet'); if(!box) return; box.innerHTML = detailHtml(list); open('ovAch'); }
  const asList = ids => { const got = Ach.earned(); return ids.filter(id => got[id]).map(id => ({ id, ...got[id] })); };

  // ----- the collection (drawn inside the Social Hub, from the saved unlocks only: no history scan)
  function cardHtml(id, got){
    const a = got[id];
    if(a) return `<button type="button" class="achcard earned" data-achopen="${id}"><span class="achc">${TROPHY}</span><span class="achtx"><b>${esc(nameOf(id))}</b><p>${esc(didOf(id, a.e))}</p><span class="achdate">${esc(t('achOn', { d: day(a.d) }))}</span></span></button>`;
    if(Ach.SECRET.has(id)) return `<div class="achcard hid" role="img" aria-label="${esc(t('achHidden'))}"><span class="achc" aria-hidden="true">${TROPHY}</span><span class="achtx" aria-hidden="true"><b>${esc(t('achSecretCard'))}</b></span></div>`;   // a faint generic label only: no name, no hint, no number, no title attribute
    return `<div class="achcard lock"><span class="achc">${TROPHY}</span><span class="achtx"><b>${esc(nameOf(id))}</b><p>${esc(howOf(id))}</p></span></div>`;
  }
  function collectionHtml(){
    const got = Ach.earned(), n = Ach.count(), ids = Ach.IDS.filter(id => FILTER === 'all' || (FILTER === 'earned') === !!got[id]);
    ids.sort((a, b) => (!!got[b] - !!got[a]) || (got[a] && got[b] ? got[b].d.localeCompare(got[a].d) : 0) || Ach.IDS.indexOf(a) - Ach.IDS.indexOf(b));
    const flt = [['all', 'achAll'], ['earned', 'achEarned'], ['locked', 'achLocked']].map(([k, s]) => `<button type="button" data-achf="${k}" aria-pressed="${FILTER === k}">${esc(t(s))}</button>`).join('');
    return `<div class="achfix"><div class="achhead"><button type="button" class="achback" data-achback aria-label="${esc(t('back'))}">${svgIcon('back', 22, 2.4)}</button><h3 class="pfh"><span>${esc(t('achBtn'))}</span></h3></div>
      <p class="achtot">${esc(t('achOf', { a: n, b: Ach.total() }))}</p><div class="achflt" role="group" aria-label="${esc(t('achBtn'))}">${flt}</div></div>
      <div class="achlist" id="achList">${ids.map(id => cardHtml(id, got)).join('') || `<p class="pfempty">${esc(t('achEmpty'))}</p>`}</div>`;
  }
  const view = () => VIEW;
  function show(v){ VIEW = v; window.scrollTo(0, 0); if(typeof renderProfile === 'function') renderProfile(); }
  document.addEventListener('click', e => {
    if(e.target.closest('#pfAch')){ Phone.haptic(); show('ach'); return; }
    if(e.target.closest('[data-achback]')){ Phone.haptic(); show('main'); return; }
    const f = e.target.closest('[data-achf]'); if(f){ FILTER = f.dataset.achf; if(typeof renderProfile === 'function') renderProfile(); return; }
    const o = e.target.closest('[data-achopen]'); if(o){ openDetail(asList([o.dataset.achopen])); return; }
  });

  // ----- entry points: every one goes through Ach.record(), which is idempotent
  const record = why => Ach.record(why);
  function afterWorkout(){ return record('workout'); }                                   // finishWorkout: announce after Workout Done is up
  function afterBoard(){ const l = record('board'); if(l.length) setTimeout(() => announce(l), 400); }   // a typed 1RM: at that action's confirmation
  function afterImport(){ const l = record('import'); if(l.length) setTimeout(() => announce(l, { catchUp: true }), 600); }
  function afterBoot(){ if(profile.ach && profile.ach.v === 1) return; const l = record('seed'); if(l.length) setTimeout(() => announce(l, { catchUp: true }), 2500); }   // first run with old history: one summary
  return { announce, afterWorkout, afterBoard, afterImport, afterBoot, collectionHtml, view, show, openDetail, detailHtml };
})();
