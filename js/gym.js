// Gym Buddy: workouts, sessions, library, picker, recovery, progress, form demos. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ran out (or below your level) → onto the grocery list by itself
function checkRestock(foodId){
  if(!kitchenOn()) return false;   // Refinements #4: Kitchen off = the Groceries top-up never runs
  const f = foods.find(x => x.id === foodId); if(!f || f.noAutoGrocery) return false;
  const have = stockOf(foodId), min = f.minStock || 0;
  const low = min > 0 ? have < min : have <= 0;
  if(!low || groc.some(g => g.foodId === foodId && !g.done)) return false;
  groc.push({ id: uid(), foodId, name: foodName(f), count: f.usualCount || 1, size: f.usualPack || null, unit: f.unit, why: have <= 0 ? 'out' : 'low', done: false, addedAt: new Date().toISOString() });   // the usual pack × the usual count
  saveGroc(); return true;
}

function setDay(patch){ days[curDay] = { ...dayInfo(curDay), ...patch }; delete days[curDay].guessed; saveDays(); renderToday(); }

function parseMu(s){ const o = {}; s.split(' ').forEach(p => { const [k, v] = p.split(':'); o[k] = +v; }); return o; }

function topHead(mu){ return Object.entries(mu).sort((a, b) => b[1] - a[1])[0][0]; }

// custom (and v1.6) exercises get muscle data from their old single-muscle field
function normEx(x){ if(x.mu) return x; const h = LEGACY_HEAD[x.m] || 'chest_mid'; return { ...x, mu: { [h]: 100 }, h, m: HEADS[h] ? HEADS[h][2] : 'other', p: x.m === 'cardio' ? 'cardio' : (x.p || 'press_h') }; }

function exIcon(x, size){
  x = typeof x === 'string' ? exById(x) : x; const f = ICON_FIG[x.id === 'treadmill' ? 'treadmill' : x.p] || ICON_FIG.press_h, col = (GROUPS[x.m] || GROUPS.other)[3];
  return `<svg class="exicon" viewBox="0 0 48 48" width="${size || 40}" height="${size || 40}" aria-hidden="true"><rect x="1" y="1" width="46" height="46" rx="12" fill="${col}" opacity=".16"/>
    <path d="${f[2]}" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f[0]}" cy="${f[1]}" r="3.6" fill="${col}"/></svg>`;
}

// ---------- history helpers ----------
function exHistory(exId, excludeId){
  return sessions.filter(s => s.id !== excludeId).map(s => { const x = s.exercises.find(e => e.exId === exId); if(!x) return null;
    const work = x.sets.filter(st => st.done && st.type !== 'W' && st.w !== '' && st.r !== '').map(st => x.cv && x.cv.l === 'total' && !st.side ? { ...st, w: String(Lat.unitW(x, st)) } : st);   // a typed total is read per implement; the saved set is untouched
    if(!work.length) return null;
    const top = work.reduce((b, st) => (+st.w > +b.w || (+st.w === +b.w && +st.r > +b.r)) ? st : b, work[0]);
    return { date: s.date, start: s.start, cv: x.cv, sets: work, top, e1: Math.max(...work.map(st => e1rm(+st.w, +st.r, exId))) }; }).filter(Boolean).sort((a, b) => a.start.localeCompare(b.start));
}

function lastSessionDate(){ const s = sessions.slice().sort((a, b) => b.start.localeCompare(a.start))[0]; return s ? s.date : (profile.gymLast || null); }

function comebackFactor(){ if(!comeback) return 1; const k = sessions.filter(s => s.start > comeback.at).length; return Math.min(1, comeback.base + .05 * k); }

function cbBase(gap){ return gap >= 42 ? .7 : gap >= 21 ? .8 : .9; }

// Gym Coach intelligence: the next-session weight comes from js/gym-intel.js (double progression over comparable sessions, one weak day is not a
// trend, breaks measured against your own rhythm), so the live workout hints and the coach always agree. Same fields as before: { w, r, last, first, est, cb, p }.
function suggestFor(exId, reps){ return GymIntel.progression(exId, reps); }

// a brand-new exercise: estimate a safe start from your lifts on related exercises (same movement, same muscles), with equipment ratios.
// Conservative on purpose (about 85% of the estimate); after the first session your real numbers take over.
const EQF = { barbell: 1, machine: 1.1, cable: .65, dumbbell: .4, kettlebell: .35, band: .3 };   // dumbbell / kettlebell = per hand
function estimateNew(exId, reps){
  const ex = exById(exId); if(!ex || isCardio(exId) || gymIsAssist(exId) || !(ex.e in EQF)) return null;
  const cos = (a, b) => { let d = 0, na = 0, nb = 0; Object.keys({ ...a, ...b }).forEach(k => { d += (a[k] || 0) * (b[k] || 0); na += (a[k] || 0) ** 2; nb += (b[k] || 0) ** 2; }); return na && nb ? d / Math.sqrt(na * nb) : 0; };
  const ids = [...new Set(sessions.flatMap(s => s.exercises.map(x => x.exId)))].filter(id => id !== exId && !isCardio(id));
  const rel = ids.map(id => { const o = exById(id); if(!(o.e in EQF)) return null; const sim = cos(ex.mu, o.mu) * (o.p === ex.p ? 1 : .7); if(sim < .55) return null;
      const h = exHistory(id); if(!h.length) return null; const top = h[h.length - 1].top, e1 = e1rm(+top.w, +top.r, id); if(!(e1 > 0)) return null;
      let e = e1 * EQF[ex.e] / EQF[o.e]; if(isUni(exId) && !isUni(id) && ex.e === o.e) e *= .5;
      return { sim, e }; }).filter(Boolean).sort((a, b) => b.sim - a.sim).slice(0, 3);
  if(!rel.length) return null;
  const e1 = rel.reduce((a, r) => a + r.e * r.sim, 0) / rel.reduce((a, r) => a + r.sim, 0);
  const w = r25(e1 / (1 + reps / 30) * .85, ex.e); return w > 0 ? w : null;
}

// the reps you usually do (0.6.9): median of your finished working sets over the last ~2 months, same movement first, else all lifts
function usualReps(exId){
  const ex = exById(exId), since = Date.now() - 60 * 864e5, same = [], all = [];
  sessions.forEach(s => { if(new Date(s.start).getTime() < since) return; s.exercises.forEach(x => { if(isCardio(x.exId)) return; const o = exById(x.exId); if(!o) return;
    x.sets.forEach(z => { if(z.done && isMainSet(z) && +z.r > 0){ all.push(+z.r); if(o.p === ex.p) same.push(+z.r); } }); }); });
  const pick = same.length >= 4 ? same : all; if(pick.length < 4) return null;
  const v = pick.sort((a, b) => a - b), m = v[Math.floor(v.length / 2)]; return Math.max(3, Math.min(20, Math.round(m)));
}

// the colour of a muscle (a group, or one head of it) for the small line under an exercise's name
const muCol = k => (typeof HEAD_COL !== 'undefined' && HEAD_COL[k]) || (GROUPS[k] && GROUPS[k][3]) || (HEADS[k] && GROUPS[HEADS[k][2]] && GROUPS[HEADS[k][2]][3]) || null;
// warm-up sets for a working weight: 3 by default; the Gym Coach asks for 2 (about half, then three quarters)
function warmupFor(exId, w, two){
  const ex = exById(exId); if(!(w >= 20) || ex.e === 'bodyweight' || isCardio(exId)) return [];
  return (two ? [[.5, 8], [.75, 4]] : [[.4, 8], [.6, 5], [.8, 3]]).map(([p, r]) => ({ w: Math.max(ex.e === 'barbell' ? 20 : 0, r25(w * p, ex.e)), r })).filter((x, i, a) => x.w > 0 && (i === 0 || x.w > a[i - 1].w));
}

// ---------- live session ----------
// 0.7.7: Exercise Settings (one global menu, saved with the device settings): both sides together, hidden markers, per-set extras, sounds
const gx = () => settings.gx || (settings.gx = {});
// 0.7.9.1: Hide Set Markers is a drop-down of three: Warm-Up (W), Drop Set (D), Failure (F). gx().hideM = { W:true, … } = not offered on sets any more.
// The old single switch (hideMarks) becomes all three hidden.
// 0.7.9.6: ONE place for the Exercise Settings defaults: only the three pills are on; a switch someone has changed keeps their choice
const GX_DEF = { rank: true, uniPill: true, formPill: true, swapPill: true, lbAtt: false, warnSore: false, tips: false, uniBoth: true, half: false, neg: false, rir: false, sound: false };
// Petros: Exercise Settings for all exercises at once ('all') or for each exercise on its own ('each'): settings.gxMode (unset = not asked
// yet: the first tap on a card's gear asks). In 'each' mode an exercise's own choices live in settings.gxEx[exId] ({ key: bool, hideM });
// anything it has not changed reads the general settings (gx()), so a new exercise starts from them, and switching back to 'all' keeps
// every exercise's own choices for later. Ranking, Leaderboards, Tips and Sounds are always shared (not in GX_EACH). Device only, like gx.
const GX_EACH = ['uniPill', 'formPill', 'swapPill', 'uniBoth', 'half', 'neg', 'rir', 'warnSore'];
const gxEach = () => settings.gxMode === 'each';
const gxOwn = (id, make) => { if(!id || !gxEach()) return null; const E = settings.gxEx || (make ? (settings.gxEx = {}) : null); if(!E) return null; return E[id] || (make ? (E[id] = {}) : null); };
const gOn = (k, id) => { const o = GX_EACH.includes(k) ? gxOwn(id) : null; if(o && o[k] != null) return !!o[k];
  const v = gx()[k]; return v === undefined || v === null ? !!GX_DEF[k] : !!v; };
function hideM(k, id){ const G = gx(); if(G.hideMarks){ G.hideM = { W: true, D: true, F: true }; delete G.hideMarks; Store.save('settings', settings); }
  const o = gxOwn(id); if(o && o.hideM) return !!o.hideM[k]; return !!(G.hideM && G.hideM[k]); }
let EXS_MK = false;   // the Hide Set Markers list is open
function setGx(k, v, id){ const o = GX_EACH.includes(k) ? gxOwn(id, true) : null; (o || gx())[k] = v; Store.save('settings', settings); }
function toggleHideM(k, id){ hideM(k); const o = gxOwn(id, true), G = gx();
  const box = o ? (o.hideM = o.hideM || { ...(G.hideM || {}) }) : (G.hideM = G.hideM || {});   // an exercise's own list starts from the general one
  if(box[k]) delete box[k]; else box[k] = true; Store.save('settings', settings); }
function setGxMode(m){ settings.gxMode = m === 'each' ? 'each' : 'all'; Store.save('settings', settings); }
// 0.7.7 cardio: no sets / reps. Time (min, stored in r) and distance (km, stored in w) like before, plus calories and level where the machine has them (optional fields cal, lvl).
const CARDIO_NODIST = /^(burpee|jumping_jacks|jump_rope|battle_ropes)$/, CARDIO_LVL = /bike|elliptical|stair|rower|ski_erg|spin|treadmill|incline/;
const cardioFields = id => { const ex = exById(id); return ['r', ...(CARDIO_NODIST.test(id) ? [] : ['w']), ...(ex.e === 'm' ? ['cal'] : []), ...(CARDIO_LVL.test(id) && ex.e === 'm' ? ['lvl'] : [])]; };
const CARDIO_LBL = { r: 'cardTime', w: 'cardDist', cal: 'cardCal', lvl: 'cardLvl' };
function cardioRow(x, s, j){
  const box = k => `<div class="cardf"><span>${t(CARDIO_LBL[k])}</span><div class="gymsbox"><button data-step="${k}" data-d="-1" aria-label="${t('gMinusL')}">−</button><input data-${k} inputmode="${k === 'w' ? 'decimal' : 'numeric'}" value="${s[k] ?? ''}" aria-label="${t(CARDIO_LBL[k])}"><button data-step="${k}" data-d="1" aria-label="${t('gPlusL')}">+</button></div></div>`;
  return `<div class="cardrow ${s.done ? 'done' : ''} ${s.pr ? 'pr' : ''}" data-s="${j}">${cardioFields(x.exId).map(box).join('')}<button class="sok" data-ok aria-label="${s.done ? t('setDoneL') : t('markDoneL')}">${ICO_TICK}</button></div>`; }

function newSet(type){ return { id: uid(), type: type || 'N', w: '', r: '', done: false }; }

function startSession(tpl){
  const now = new Date(), gap = gapDays();
  if(gap !== null && gap >= 14 && !comeback){
    const ref = {}; sessions.forEach(s => s.exercises.forEach(x => { const h = exHistory(x.exId); if(h.length) ref[x.exId] = +h[h.length - 1].top.w; }));
    comeback = { at: now.toISOString(), base: cbBase(gap), gap, ref }; saveG('cb');
  }
  active = { id: uid(), date: todayKey(), start: now.toISOString(), clock0: tpl && tpl.exercises.length ? now.getTime() : null, tplId: tpl ? tpl.id : null, name: tpl ? tpl.name : '', type: tpl ? tpl.type : 'full', prs: [],
    exercises: tpl ? tpl.exercises.map(e => ({ exId: e.exId, reps: e.reps, rest: e.rest ?? exById(e.exId).rest, sets: Array.from({ length: e.sets || 3 }, () => newSet()), ...(e.ss ? { ss: e.ss } : {}) })) : [] };
  normalizeSS(active.exercises);   // only neighbours stay linked
  active.exercises.forEach((x, i) => { const e = tpl && tpl.exercises[i]; cvInit(x); if(e && e.uni !== undefined ? e.uni : isUni(x.exId)) makeUni(x, true); });   // one side at a time: L / R sets
  saveG('act');
  // today becomes a gym day; discarding the workout puts the day back as it was
  const tk = todayKey(), di = dayInfo(tk); active.dayBefore = days[tk] ? { ...days[tk] } : null;
  days[tk] = { ...di, type: 'gym', work: workKind(active.type), time: profile.realStart || !di.time || di.type !== 'gym' ? fromMin(now.getHours() * 60 + now.getMinutes()) : di.time }; delete days[tk].guessed; saveDays();
  close('ovStart'); renderAll(); openSession();
  if(tpl && active.exercises.length) gcWarmupHint();
  if(!active.exercises.length){ EMPTY_START = true; $('sesAddEx').click(); }   // an empty workout goes straight to the exercise list; picking one starts it
}
// Gym Coach, when a saved workout is started: "I would suggest warm-ups for these", 1-2 light sets (kg x reps) for each lift that has a known working weight.
// Plain rules, no AI. It waits in the live chat (a dot on the robot) and never sits on an exercise card. Add puts the sets in at the top, with Undo.
function gcWarmupHint(){
  if(!active) return;
  const wid = active.id, list = active.exercises.map((x, i) => { if(hideM('W', x.exId) || x.sets.some(s => s.type === 'W' || s.done)) return null;
    const sug = suggestFor(x.exId, x.reps); if(!sug || !(!sug.first || sug.est)) return null;
    const wu = warmupFor(x.exId, sug.w, true); return wu.length ? { x, wu } : null; }).filter(Boolean);
  if(!list.length) return;
  const line = o => `${esc(exName(o.x.exId))}: <b>${o.wu.map(w => `${fmt(w.w)} kg × ${w.r}`).join(' · ')}</b>`;
  const card = { title: t('gcWarmT'), sub: t('gcWarmSub'), body: `<ul class="gcwu">${list.map(o => `<li>${line(o)}</li>`).join('')}</ul>`,
    actions: [
      { label: t('gcWarmAdd'), primary: true, run(cd, ch){ if(cd.done) return;
        if(!active || active.id !== wid){ ch.update(cd, { done: t('gciStale') }); return; }
        const added = []; list.forEach(o => { if(!active.exercises.includes(o.x) || o.x.sets.some(s => s.type === 'W' || s.done)) return;
          const sets = o.wu.map(w => ({ id: uid(), type: 'W', w: String(w.w), r: String(w.r), done: false })); o.x.sets.unshift(...sets); added.push([o.x, sets]); });
        saveG('act'); renderSession();
        ch.update(cd, { done: t('gcWarmDone'), undo(){ if(active && active.id === wid){ added.forEach(([x, sets]) => { x.sets = x.sets.filter(s => !sets.includes(s)); }); saveG('act'); renderSession(); } } }); } },
      { label: t('gciNotNow'), run(cd, ch){ if(cd.done) return; ch.update(cd, { done: t('gciKept') }); } } ] };
  Coach.post('gymlive', t('gcWarmIntro'), [card]);
  const b = $('sesCoach'); if(b) b.classList.add('nudge');
}
// backing out of that first exercise list: no workout is started, back to the Gym Hub with Start Workout
let EMPTY_START = false;
function gymEmptyBack(){ if(!EMPTY_START) return; EMPTY_START = false;
  setTimeout(() => { if(!active || active.exercises.length) return; gymDropEmpty(); close('ovSession'); renderAll(); }, 0); }

function openSession(){ if(!active) return; renderSession(); open('ovSession'); fitPages(); revealLists(); keepAwake(true); }   // fitPages after open: the window only has a height once it is showing

// the sweatband robot in a title bar (live workout header, Start Workout window)
function gymHeadRobot(id){ const cb = $(id); if(id === 'sesCoach' && cb.querySelector('svg.robot')) return; cb.innerHTML = AI.robot('gym', id === 'sesCoach' ? 54 : 30); cb.setAttribute('aria-label', t('coachBubA', { n: t('coachGym') })); }
function renderSession(){
  if(!active) return;
  $('sesName').textContent = active.name && active.name !== t('emptyWorkout') ? active.name : ''; tickClock();   // 0.7.3: blank until the workout has a name
  gymHeadRobot('sesCoach');   // 0.7.7: the Gym Coach robot, top right of the header
  const cb = comebackFactor();
  const day = suppLog[todayKey()] || {}, sp = supps.filter(s => s.often === 'training' || s.times.some(x => x === 'pre' || x === 'post'));
  $('sesSupps').innerHTML = (cb < 1 ? `<div class="alert" style="cursor:default">${t('cbActive', { k: sessions.filter(s => s.start > comeback.at).length + 1, p: Math.round(cb * 100) })}</div>` : '') +
    (sp.length ? `<div class="slots" style="margin:0 0 10px"><small class="rmeta" style="align-self:center">${t('suppsNow')}</small>${sp.map(s => { const sl = s.times.find(x => x === 'pre' || x === 'post') || s.times[0]; const k = `${s.id}|${sl}`;
      return `<button class="slot ${day[k] ? 'taken' : ''}" data-ssup="${k}">${day[k] ? svgIcon('check', 14, 2.6) + ' ' : ''}${suppIcon(s)} ${esc(suppName(s))}</button>`; }).join('')}</div>` : '');
  if(active.clock0 === undefined) active.clock0 = active.exercises.length ? new Date(active.start).getTime() : null;   // workouts started before 0.6.0
  if(!active.clock0 && active.exercises.length){ active.clock0 = Date.now(); saveG('act'); }   // 0.6.0: the clock starts with the first exercise
  normalizeSS(active.exercises);
  const shown = active.exercises.map((x, i) => cardHtml(x, i)).join(''), body = $('sesBody'), st = body.scrollTop;
  const lst = {}, cst = {}; body.querySelectorAll('.setlist').forEach(l => { lst[l.dataset.sl] = l.scrollTop; cst[l.dataset.sl] = l.parentElement.scrollTop; });   // each card's own set list (and a card scrolling inside itself) keeps where it was
  body.innerHTML = shown || `<div class="empty">${t('noExYet')}</div>`;
  SES_ADD = SES_ADD || $('sesAddEx'); body.appendChild(SES_ADD);   // Add Exercise is the last page, under the last exercise
  body.scrollTop = st; fitUniTicks(); fitPages();
  body.querySelectorAll('.setlist').forEach(l => { if(lst[l.dataset.sl] !== undefined){ l.scrollTop = lst[l.dataset.sl]; l.parentElement.scrollTop = cst[l.dataset.sl]; } });
  revealLists(); markPages();
}
// a set was added, finished or removed (or the workout was just opened / resumed): bring the set you work on next into its list's view.
// Never when only a value changed, so reading old sets is not interrupted. A list with no size yet (window still closed) does not count as seen.
function revealLists(){ if(!active) return; $('sesBody').querySelectorAll('.setlist').forEach(l => { const x = active.exercises[+l.dataset.sl]; if(!x || !l.clientHeight) return;
  const sig = x.sets.length + ':' + x.sets.filter(s => s.done).length + ':' + ['half', 'neg', 'rir'].map(k => +gOn(k, x.exId)).join('');   /* switching set extras on also re-shows the working set */ if(SET_SIG.get(x) !== sig){ SET_SIG.set(x, sig); listReveal(l); } }); }
// the pages: room under the last card so the Add Exercise page can reach the top like every other page (the card sizes are natural; only the peek above is fixed)
// Active Exercise card cap: a card rests centred between the top gap and DOCKGAP above the bottom card (room for the Swipe tip and the timer);
// it grows both ways until it reaches either edge and then stops there (--cardmax). Past that, its set list scrolls inside the card and the older
// finished sets are drawn compact (.capped), so the title, the set you are working on and New Set / End Exercise always stay on screen, apart from the timer.
// A page too short for that (a phone on its side) scrolls the whole card inside itself with the buttons pinned (.short); only an absurdly short one (< 96 px) lets the card run past the screen (.tall).
const PEEK = 64, DOCKGAP = 40, CARDTOP = 8, CARDMIN = 240, LISTMIN = 112;
const SET_OPEN = new WeakSet(), SET_SIG = new WeakMap();   // screen state only: finished sets reopened from compact, last set count / done count per exercise
function fitPages(){ const body = $('sesBody'), add = $('sesAddEx'); if(!body || !add.isConnected) return;
  body.style.setProperty('--peek', PEEK + 'px'); body.style.setProperty('--dockgap', DOCKGAP + 'px'); body.style.setProperty('--cardtop', CARDTOP + 'px');
  const H = body.clientHeight, room = H - DOCKGAP - CARDTOP, cards = body.querySelectorAll(':scope>.exc'), capOk = room >= CARDMIN, tiny = room < 96;
  body.style.setProperty('--cardmax', tiny ? 'none' : room + 'px');
  // read the natural height with nothing compact (one read per card per fit, never per frame), then write the classes
  cards.forEach(c => c.classList.remove('capped', 'short'));
  const nat = [...cards].map(c => { const l = c.querySelector(':scope>.setlist'); return l ? c.offsetHeight - l.clientHeight + l.scrollHeight : c.offsetHeight; });
  // too short even for the title + one set + the buttons (a phone on its side): the whole card scrolls inside itself, New Set / End Exercise stay pinned at its foot (.short)
  cards.forEach((c, i) => { const over = nat[i] > room; c.classList.toggle('capped', !tiny && over); c.classList.toggle('short', !tiny && !capOk && over); c.classList.toggle('tall', tiny && over); c.classList.remove('tight'); });
  // a short page: when the capped list cannot show one whole set, the card's header and footer pack tighter (.tight); one more read, then writes
  const lists = [...cards].map(c => c.classList.contains('capped') ? c.querySelector(':scope>.setlist') : null), lh = lists.map(l => l ? l.clientHeight : 1e9);
  cards.forEach((c, i) => { if(lh[i] < LISTMIN || c.classList.contains('short')) c.classList.add('tight'); });
  const h0 = cards[0] ? cards[0].offsetHeight : 0;
  body.style.setProperty('--lead', (cards[0] && !cards[0].classList.contains('tall') ? Math.max(0, (room - h0) / 2) : 0) + 'px');   // room above the first card so it can rest centred too (a margin: padding would stretch the page)
  body.style.paddingBottom = Math.max(0, H - add.offsetHeight - PEEK) + 'px'; }
// scroll a card's own set list (never the page) so `row` (default: the first unfinished set, else the last) is fully in view
// (on a phone on its side the whole card is the scroller and its pinned buttons cover the foot)
function listReveal(list, row){ if(!list) return; const card = list.closest('.exc'), sc = card.classList.contains('short') ? card : list; if(sc.scrollHeight <= sc.clientHeight + 1) return;
  row = row || list.querySelector('.setrow:not(.done)') || [...list.querySelectorAll('.setrow')].pop(); if(!row) return;
  // layout offsets (the card is the rows' offsetParent), not screen boxes: the window's opening animation scales the sheet
  const head = sc === list ? list.querySelector('.sethead') : null, foot = sc === card ? card.querySelector(':scope>.exfoot') : null, top0 = head ? head.offsetHeight : 0, bot0 = foot ? foot.offsetHeight : 0;
  const base = sc === card ? 0 : list.offsetTop + list.clientTop, top = row.offsetTop - base;
  let bot = top + row.offsetHeight, tgt = row.nextElementSibling; while(tgt && !tgt.matches('.setrow')){ bot = Math.max(bot, tgt.offsetTop - base + tgt.offsetHeight); tgt = tgt.nextElementSibling; }   // its half reps / rest timer underneath come along
  const v0 = sc.scrollTop + top0, v1 = sc.scrollTop + sc.clientHeight - bot0;
  if(top < v0) sc.scrollTop = top - top0; else if(bot > v1) sc.scrollTop += Math.min(bot - v1, top - v0); }
// bring an exercise (or the Add page) to where it rests
function showCard(el, smooth){ if(!el) return; el.scrollIntoView({ behavior: smooth === false ? 'auto' : 'smooth', block: el.matches('.exc:not(.tall)') ? 'center' : 'start' }); }
// at rest only the card you are on (and the bottom of the one above) shows; the cards below fade in while you swipe (opacity only).
// The tip above the bottom card says Swipe For Next when there is another exercise below, else Swipe To Add.
function markPages(){ const body = $('sesBody'); if(!body) return; const r = body.getBoundingClientRect(), line = r.bottom - DOCKGAP - 24, cards = [...body.querySelectorAll(':scope>.exc')];
  let cur = 0; cards.forEach((c, i) => { if(c.getBoundingClientRect().top <= line) cur = i; });   // the card you are on = the lowest one that has come up past the line near the bottom
  cards.forEach((c, i) => c.classList.toggle('after', i > cur));
  const tip = $('sesTip').querySelector('span'), k = cur < cards.length - 1 ? 'swipeNext' : 'swipeAdd'; if(tip.dataset.t !== k){ tip.dataset.t = k; tip.textContent = t(k); }
  // where you are: one small dot per exercise in the bottom card (the one you're on is a longer accent pill, finished ones green); 13 or more = "3 / 14"
  const dots = $('sesDots'), n = cards.length, ex = active ? active.exercises : [];
  dots.innerHTML = n < 2 ? '' : n > 12 ? `<span class="dkcount">${cur + 1} / ${n}</span>` : cards.map((c, i) => `<button type="button" class="dkdot${i === cur ? ' on' : ''}${ex[+c.dataset.x] && ex[+c.dataset.x].ended ? ' done' : ''}" data-dot="${i}" aria-label="${i + 1} / ${n}"></button>`).join('');
  body.dataset.cur = cur; return cur; }
// press and hold (End Workout, Discard): a fill sweeps across the button and the action runs when it is full. Letting go early does nothing
// (a quick tap shows how it works). Enter / Space still work for keyboards.
function holdButton(btn, ms, hint, fn){
  const fill = document.createElement('i'); fill.className = 'hfill'; fill.setAttribute('aria-hidden', 'true'); btn.prepend(fill); btn.classList.add('holdbtn'); btn.style.setProperty('--hold', ms + 'ms');
  let tm = 0, t0 = 0;
  const stop = () => { if(!tm) return; clearTimeout(tm); tm = 0; btn.classList.remove('holding'); if(Date.now() - t0 < ms * .5) toast(t(hint)); };
  btn.addEventListener('pointerdown', e => { if(e.button > 0 || tm) return; t0 = Date.now(); btn.classList.add('holding'); Phone.haptic();
    tm = setTimeout(() => { tm = 0; btn.classList.remove('holding'); Phone.haptic(); fn(); }, ms); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => btn.addEventListener(k, stop));
  btn.addEventListener('click', e => { if(e.detail === 0) fn(); });
  btn.addEventListener('contextmenu', e => e.preventDefault()); }
// one tall tick spans both hands (and their extras) of a unilateral set: size it from the real rows after each draw
function fitUniTicks(){ document.querySelectorAll('#sesBody .setrow.lmerge').forEach(row => { const ok = row.querySelector('.sok'); if(!ok) return;
  let last = row.nextElementSibling; while(last && !last.classList.contains('rmate')) last = last.nextElementSibling;   // the R row
  if(!last) return; const after = last.nextElementSibling; if(after && after.classList.contains('setx')) last = after;
  const h = Math.round(last.getBoundingClientRect().bottom - row.getBoundingClientRect().top), own = Math.round(row.getBoundingClientRect().height);
  if(h > own){ ok.style.height = h + 'px'; ok.style.marginBottom = -(h - own) + 'px'; } }); }
let SES_ADD = null;
const sesMs = () => active && active.clock0 ? Date.now() - active.clock0 : 0;

const clk = ms => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`; };

// the Gym Coach robot cheers when a set is finished (bigger when it is a record or the last set of the exercise); transform only
function coachCheer(kind){ const b = $('sesCoach'); if(!b || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  b.classList.remove('cheer1', 'cheer2', 'cheer3'); void b.offsetWidth; b.classList.add(kind === 'pr' ? 'cheer3' : kind === 'last' ? 'cheer2' : 'cheer1');
  clearTimeout(b._ct); b._ct = setTimeout(() => b.classList.remove('cheer1', 'cheer2', 'cheer3'), 1300); }
function tickClock(){ if(!active || !$('ovSession').classList.contains('open')) return;
  $('sesClock').textContent = clk(sesMs()); }

function focusSet(xi, si){ setTimeout(() => { const el = document.querySelector(`.exc[data-x="${xi}"] .setrow[data-s="${si}"] [data-w]`); if(!el) return;
  if(el.closest('.exc.capped')) listReveal(el.closest('.setlist'), el.closest('.setrow')); else el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); }   // a card at its height limit scrolls only its own set list

// records: a WEIGHT record (heaviest set) and a VOLUME record (total kg moved across all sets) — volume counts more
function tickSet(x, s, row, xi, si, fromHold){
  Lat.ensurePairs(x);
  if(s.done){ const mi = jointOn(x) ? Lat.mate(x, si) : -1, mt = mi >= 0 && x.sets[mi].done ? x.sets[mi] : null; if(mt){ mt.done = false; mt.pr = null; delete mt.at; }   // the tall tick reopens both sides (the recorded values stay as they were)
    s.done = false; if(s.pr === 't' || s.pr === 'd') active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === s.pr)); s.pr = null; delete s.at; if(x.volPR && exVolBasis(x.exId, x.sets, x.cv) <= bestVolBefore(x.exId)){ x.volPR = false; active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === 'v')); } saveG('act'); renderSession(); return; }
  const wi = row.querySelector('[data-w]'), ri = row.querySelector('[data-r]'), card = isCardio(x.exId);
  if(atOn(x) && s.type !== 'W') s.r = '1';   // attempt mode: a ticked set is a single
  if(s.w === '' && wi.placeholder && !isNaN(+wi.placeholder)) s.w = wi.placeholder; if(s.r === '' && ri && ri.placeholder && !isNaN(+ri.placeholder)) s.r = ri.placeholder;
  if(s.r === '' || (!card && s.w === '' && !gymBwDash(x.exId))){ toast(t(card ? 'needCardio' : 'needSetVals')); (s.w === '' && !card ? wi : ri).focus(); return; }
  if(s.w === '') s.w = '0';
  if(x.cv && x.cv.ask && !x.uni && !s.side && !card && s.type !== 'W'){ toast(t('cvPickFirst')); openCv(xi, true); return; }   // a movement that can be done together OR alternating: say which before it is saved
  if(isHold(x.exId) && s.type !== 'W' && !fromHold){ if(HOLDRUN && HOLDRUN.xi === xi && HOLDRUN.si === si) return holdStop(); if(HOLDRUN) HOLDRUN = null; return holdStart(x, xi, si); }   // a hold: the tick starts the countdown; the set is saved when it ends
  s.done = true; s.at = Date.now(); delete s.tw; delete s.tr; Phone.unlockAudio(); if(!x.t0) x.t0 = Date.now();
  coachCheer(x.sets.every(z => z.done) ? 'last' : 'set');
  if(card){   // cardio records: longest time, farthest distance (only against earlier workouts)
    const hist = exHistory(x.exId, active.id);
    if(hist.length){ [['t', 'r'], ['d', 'w']].forEach(([kind, k]) => { const prev = Math.max(...hist.flatMap(h => h.sets.map(z => +z[k] || 0))), cur = +s[k] || 0;
      if(cur > prev && !active.prs.some(p => p.exId === x.exId && p.kind === kind && p.v >= cur)){ active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === kind)); active.prs.push({ exId: x.exId, kind, v: cur }); s.pr = kind; celebrate(); toast(t(kind === 't' ? 'prT' : 'prD', { n: exName(x.exId), v: fmt(cur) })); } }); }
  }
  let both = false;   // one tap finishes the pair: this side and its mate (found by pair id, never by position), one set, one rest
  const mi2 = s.side && jointOn(x) ? Lat.mate(x, si) : -1;
  if(mi2 >= 0 && Lat.open(x.sets[mi2])){ const o = x.sets[mi2]; if(o.w === '') o.w = s.w; if(o.r === '') o.r = s.r; o.done = true; o.at = Date.now(); delete o.tw; delete o.tr; both = true; si = Math.max(si, mi2); }
  const waitMate = s.side === 'L' && !both && (() => { const m = Lat.mate(x, si); return m >= 0 && Lat.open(x.sets[m]); })() || (s.side === 'L' && !both && !s.pr && x.uni && x.sets[si + 1] && x.sets[si + 1].side === 'R' && !x.sets[si + 1].done);   // L done, R still to do: the rest starts after R
  if(!card && s.type !== 'W'){
    const hist = exHistory(x.exId, active.id), same = active.exercises.filter(z => z.exId === x.exId);
    if(hist.length){
      const uw = Lat.unitW(x, s), prevMaxW = Math.max(...hist.flatMap(h => h.sets.map(z => +z.w))), curOther = Math.max(0, ...same.flatMap(o => o.sets.filter(z => z !== s && z.done && z.type !== 'W').map(z => Lat.unitW(o, z))));
      if(exById(x.exId).e !== 'bodyweight' && uw > prevMaxW && uw > curOther){ s.pr = 'w'; active.prs.push({ exId: x.exId, kind: 'w', w: uw, r: +s.r }); celebrate(); toast(t('prW', { n: exName(x.exId), w: fmt(uw), r: s.r })); }
      const prevVol = bestVolBefore(x.exId), curVol = same.reduce((a, z) => a + exVolBasis(x.exId, z.sets, z.cv), 0);
      if(!x.volPR && curVol > prevVol){ x.volPR = true; s.pr = 'v'; active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === 'v'));
        active.prs.push({ exId: x.exId, kind: 'v', vol: Math.round(curVol), prev: Math.round(prevVol) });
        celebrate(); setTimeout(celebrate, 350); toast(t('prV', { n: exName(x.exId), v: Math.round(curVol).toLocaleString() })); }
      else if(x.volPR){ const p = active.prs.find(p => p.exId === x.exId && p.kind === 'v'); if(p) p.vol = Math.round(curVol); }
    }
  }
  if(s.pr) coachCheer('pr');
  saveG('act');
  SSNEXT = null; const nxt = x.sets[si + 1], moreDrop = nxt && nxt.drop && !nxt.done;   // no rest between drops
  if(!card && !waitMate && !moreDrop){
    const go = s.type === 'W' ? null : ssNext(xi);   // superset: straight to the partner's next set
    if(go) SSNEXT = go;
    else { const rest = s.type === 'W' ? 60 : ssRest(x); REST = { end: Date.now() + rest * 1000, total: rest, rang: false, xi, si }; }
  }
  if(!card && s.type !== 'W' && +s.r === 1 && x.attempt) boardCheer(x, s);   // Refinements #8: only a single ticked with the trophy on is a leaderboard 1RM
  autoEndMark(REST ? REST.end : 0);   // the auto-end wait starts when this rest ends (or now, with no rest)
  if(s.type !== 'W' && !moreDrop && !waitMate && x.sets.every(z => z.done || z.skip)){   // 0.7.1: the next set is already waiting under the rest timer
    const add = x.uni ? uniPair() : [newSet()]; add.forEach(z => z.auto = true);
    if(atOn(x)) add.forEach(z => { z.r = '1'; z.w = String(r25(+s.w + (exById(x.exId).e === 'dumbbell' ? 2 : 2.5), exById(x.exId).e)); });   // the next single, a step up
    x.sets.push(...add); saveG('act'); }
  renderSession(); tickRest(); if(typeof restKick === 'function') restKick(); gcNudgeCheck();   // Gym Coach intelligence: rarely, one quiet hint (a dot on the robot)
  if(SSNEXT) setTimeout(() => { const el = document.querySelector(`#sesBody [data-x="${SSNEXT.xi}"] [data-s="${SSNEXT.si}"]`); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
}

// ---------- Leaderboard Attempt (0.7.9.1): switched on in Exercise Settings (gx().lbAtt). Then every leaderboard lift gets a small trophy button above its
// name; pressing it turns the name gold and puts that exercise in attempt mode (x.attempt): each set row is just the weight and a tick, a ticked
// single (reps = 1) that beats your best goes to the leaderboard (boardBest reads ticked singles) with a celebration.
const ICO_TROPHY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/></svg>';
const atAvail = x => gOn('lbAtt') && isBoardLift(x.exId) && !isCardio(x.exId);
const atOn = x => atAvail(x) && !!x.attempt;
function atToggle(xi){ const x = active && active.exercises[xi]; if(!x || !atAvail(x)) return;
  if(x.attempt) delete x.attempt; else x.attempt = true; saveG('act'); Phone.haptic(); renderSession(); }
function boardCheer(x, s){
  if(!isBoardLift(x.exId)) return; const kg = loadOf(x.exId, s.w); if(!(kg > 0)) return;
  const prev = boardBest(x.exId, s); if(prev && kg <= prev.kg) return;
  celebrate(); setTimeout(celebrate, 300); setTimeout(celebrate, 650); Phone.vibrate([60, 40, 60, 40, 120]);
  toast(t('atNew', { n: exName(x.exId), kg: fmt(kg) }));
}

// ---------- supersets: linked exercises share a colour; tick A → straight to B (no rest) → rest (the longest of the group) → back to A ----------
let SSNEXT = null;
const SS_COL = ['#c6f432', '#5ab0ff', '#ffb547', '#ff7ab6', '#9b8cff'];
const ssColor = (list, id) => { const ids = [...new Set(list.map(z => z.ss).filter(Boolean))]; return gymInk(SS_COL[ids.indexOf(id) % SS_COL.length]); };   // label text: darker in Light
function ssNext(xi){ const ex = active.exercises, x = ex[xi]; if(!x.ss) return null;
  for(let j = xi + 1; j < ex.length && ex[j].ss === x.ss; j++){ const k = ex[j].sets.findIndex(z => !z.done && z.type !== 'W' && !z.drop && z.side !== 'R'); if(k >= 0 && !ex[j].ended) return { xi: j, si: k }; }
  return null; }
const ssRest = x => x.ss ? Math.max(...active.exercises.filter(z => z.ss === x.ss).map(z => z.rest || 90)) : x.rest;
// only neighbours stay linked (after a move or a delete)
function normalizeSS(list){ list.forEach((z, i) => { if(z.ss && !((list[i - 1] || {}).ss === z.ss || (list[i + 1] || {}).ss === z.ss)) delete z.ss; }); }
// 0.6.9: supersets are made by dragging — hold an exercise over another for a second and drop (like making a folder on the
// iPhone home screen). Dragging it out of the group unlinks it (normalizeSS after every move).
function ssMerge(list, from, to){ const a = list[from], b = list[to]; if(!a || !b || a === b) return false;
  const id = b.ss || uid(); b.ss = id; list.splice(from, 1); let j = list.indexOf(b); while(list[j + 1] && list[j + 1].ss === id) j++;
  list.splice(j + 1, 0, a); a.ss = id; normalizeSS(list); return true; }
// 0.7.4.2: a plain move (Create a Workout + live workout). Dropped past the top or bottom of the list (out) = taken out of its superset,
// so the first or last exercise of a group can be unlinked too. Tells you when a move unlinked it.
function ssMove(list, from, to, out){ const it = list[from]; if(!it) return; const had = it.ss;
  list.splice(to, 0, list.splice(from, 1)[0]); if(out) delete it.ss; normalizeSS(list); if(had && !it.ss) toast(t('ssOut')); }

// ---------- drop sets: the next row starts lighter (your last drop for this exercise, else ~22% less) ----------
function dropWeight(x, w){
  w = +w || 0; const e = exById(x.exId).e;
  const h = sessions.slice().reverse().flatMap(s => s.exercises.filter(z => z.exId === x.exId)).find(z => z.sets.some(st => st.drop));
  let ratio = .78; if(h){ const j = h.sets.findIndex(st => st.drop), p = h.sets[j - 1]; if(p && +p.w > 0 && +h.sets[j].w > 0) ratio = Math.min(.95, Math.max(.4, +h.sets[j].w / +p.w)); }
  return w > 0 ? String(Math.max(0, r25(w * ratio, e))) : ''; }
function addDrop(x, j){ const s = x.sets[j]; Lat.ensurePairs(x);
  if(s.side && s.pr && jointOn(x)){   // a pair: the drop is a lighter PAIR under it, with its own pair id, so no row is ever detached from its mate
    const end = Math.max(...Lat.pairIdx(x, j)), w = dropWeight(x, s.w || (s.done ? s.w : '')), pair = Lat.newPair('D', uid, true); pair.forEach(z => { z.w = w; }); x.sets.splice(end + 1, 0, ...pair); return; }
  x.sets.splice(j + 1, 0, { ...newSet('D'), drop: true, w: dropWeight(x, s.w || (s.done ? s.w : '')), side: s.side }); if(!x.sets[j + 1].side) delete x.sets[j + 1].side; }

// ---------- timed holds (dead hang, plank, ...): type the seconds, tap the tick: a 5 s get-ready count, then the hold counts down and a ding says let go ----------
// HOLDRUN = { xi, si, t0, lead, total, rang } (screen state only). Tapping the tick while holding stops early and saves the seconds really held; during the
// get-ready count it cancels. The set is saved through tickSet() like any other, with the time in the reps field.
let HOLDRUN = null;
const holdBox = () => `<div class="holdcd" data-hold role="timer" aria-live="off"><b data-hn>${holdText()}</b><small data-hl>${t(holdLeft().lead ? 'holdReady' : 'holdGo')}</small></div>`;
function holdLeft(){ if(!HOLDRUN) return { lead: false, n: 0, held: 0 }; const e = (Date.now() - HOLDRUN.t0) / 1000;
  return e < HOLDRUN.lead ? { lead: true, n: Math.ceil(HOLDRUN.lead - e), held: 0 } : { lead: false, n: Math.max(0, Math.ceil(HOLDRUN.total - (e - HOLDRUN.lead))), held: Math.min(HOLDRUN.total, e - HOLDRUN.lead) }; }
const holdText = () => { const l = holdLeft(), n = l.n; return l.lead ? String(n) : n >= 60 ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : String(n); };
function holdStart(x, xi, si){ const s = x.sets[si], secs = Math.floor(+s.r); if(!(secs >= 1)) return;
  Phone.unlockAudio(); HOLDRUN = { xi, si, t0: Date.now(), lead: 5, total: secs, rang: false }; Phone.haptic(); renderSession(); }
function holdStop(){ if(!HOLDRUN) return; const h = HOLDRUN, l = holdLeft(); HOLDRUN = null;
  if(l.lead || l.held < 1){ renderSession(); return; }   // cancelled before the hold began (or under a second): nothing saved
  holdDone(h, Math.floor(l.held)); }
function holdDone(h, secs){ const x = active && active.exercises[h.xi], s = x && x.sets[h.si]; HOLDRUN = null; if(!s || s.done){ renderSession(); return; }
  s.r = String(Math.max(1, secs)); renderSession(); const row = document.querySelector(`#sesBody .exc[data-x="${h.xi}"] .setrow[data-s="${h.si}"]`); if(row) tickSet(x, s, row, h.xi, h.si, true); }
function tickHold(){ if(!HOLDRUN) return; if(!active){ HOLDRUN = null; return; } const l = holdLeft(), el = document.querySelector('#sesBody [data-hn]');
  if(!l.lead && l.n <= 0 && !HOLDRUN.rang){ HOLDRUN.rang = true; if(gOn('sound')) Phone.sound('bell'); Phone.vibrate([300, 120, 300]); return holdDone(HOLDRUN, HOLDRUN.total); }
  if(el){ const t0 = holdText(); if(el.textContent !== t0) el.textContent = t0; const sm = document.querySelector('#sesBody [data-hl]'); if(sm){ const k = t(l.lead ? 'holdReady' : 'holdGo'); if(sm.textContent !== k) sm.textContent = k; } } }
function tickRest(){
  if(!REST) return; const left = REST.end - Date.now();
  if(left <= 0 && !REST.rang){ REST.rang = true; if(gOn('sound')) Phone.sound('bell'); Phone.vibrate([300, 120, 300]); if(!$('ovSession').classList.contains('open')) toast(t('restDone'));
    setTimeout(() => { const w = $('rbWrap'); if(w) w.classList.add('fold'); setTimeout(() => { if(REST && REST.rang){ REST = null; if(active && $('ovSession').classList.contains('open')) renderSession(); } }, 360); }, 900); }
}

function restAdjust(v){ if(!REST) return; if(v === 'skip'){ REST = null; autoEndMark(0); renderSession(); return; }
  REST.end = Math.max(Date.now() + 1000, REST.end + +v * 1000); REST.total = Math.max(REST.total, Math.round((REST.end - Date.now()) / 1000)); REST.rang = false; autoEndMark(REST.end); tickRest(); }
// 0.7.4.2 auto-end: saved with the workout, so it also works out right after the app was closed. idleFrom = when the last rest ends or
// was skipped (or the last set, with no rest); a new set, a rest change or Resume starts the wait again.
function autoEndMark(t){ if(!active) return; active.idleFrom = Math.max(Date.now(), t || 0); delete active.askedAt; saveG('act'); }   // the bracket updates itself every frame

// The exercise picker (openExPick, pkFit, pkHave …) lives in js/expick.js (V27).

// ---------- exercise details: muscles %, form, common mistakes ----------
function addToSession(id){ const x = { exId: id, reps: isCardio(id) ? '20' : defReps(exById(id).rest), rest: exById(id).rest, sets: [newSet()] }; cvInit(x); if(isUni(id)) makeUni(x, true);
  active.exercises.push(x); active.cur = active.exercises.length - 1; saveG('act'); renderSession();
  const i = active.exercises.length - 1; setTimeout(() => { showCard(document.querySelector(`.exc[data-x="${i}"]`)); }, 60); }

// unilateral exercises: L and R sets in pairs; rest starts after the R side
const UNI_RE = /single|one[- ]?arm|one[- ]?leg|1[- ]arm|unilateral|bulgarian|split squat|lunge|step[- ]?up|pistol|concentration|kickback|suitcase/i;
const isUni = id => { const ex = exById(id); return !!ex && !isCardio(id) && (typeof ex.uni === 'boolean' && Array.isArray(ex.mus) ? ex.uni : Lat.info(id) ? Lat.defaultPaired(id, ex) : UNI_RE.test(ex.en || '')); };   // built-ins: the reviewed table (js/data/gym-lat.js); custom: what its creator chose
const uniPair = s => Lat.newPair(s && s.type, uid);
// one-tap finishing for THIS exercise: an explicit choice (this exercise's own, else the general one, true OR false) always wins; otherwise the card's own snapshot
// from when it was made (x.jt, new work = on); a workout already running from before this update has no snapshot and keeps the old default (off)
function uniExplicit(id){ const o = gxOwn(id); if(o && o.uniBoth != null) return !!o.uniBoth; const v = gx().uniBoth; return v === undefined || v === null ? undefined : !!v; }
const jointOn = x => !!x.uni && (uniExplicit(x.exId) !== undefined ? uniExplicit(x.exId) : x.jt === true);
function makeUni(x, on){ Lat.makeUni(x, on, uid); if(on && x.jt === undefined) x.jt = true; }
// the load convention of a new exercise card (old cards have none and keep the meaning they always had)
function cvInit(x){ if(!isCardio(x.exId)){ const c = Lat.defaultCv(x.exId, exById(x.exId)); if(c) x.cv = c; else delete x.cv; } else delete x.cv; return x; }

// ---------- Swap (canvas Gym.dc.html): frosted bottom sheet, every exercise ranked by how alike its muscle use is ----------
function swapMatch(a, b){ let d = 0, na = 0, nb = 0; new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => { const x = a[k] || 0, y = b[k] || 0; d += x * y; na += x * x; nb += y * y; });
  return na && nb ? d / Math.sqrt(na * nb) : 0; }
function openSwap(xi){
  const x = active.exercises[xi], ex = exById(x.exId); SW = { xi };
  $('swTitle').textContent = t('swapT', { n: exName(ex) });
  drawSwap(); open('ovSwap');
}

function drawSwap(){
  const x = active.exercises[SW.xi], ex = exById(x.exId), mu = ex.mu || {};
  const alts = EX().filter(a => a.id !== ex.id && !isCardio(a.id)).map(a => ({ a, m: Math.round(swapMatch(mu, a.mu || {}) * 100) })).filter(z => z.m >= 40)
    .sort((p, q) => q.m - p.m || (exHistory(q.a.id).length - exHistory(p.a.id).length)).slice(0, 8);
  $('swList').innerHTML = alts.length ? alts.map(({ a, m }, i) => { const top = Object.entries(a.mu || {}).sort((p, q) => q[1] - p[1])[0];
    return `<button class="swrow" data-ex="${a.id}"><span class="swt"><span class="swn">${esc(exName(a))}</span><small>${EL(a.e)}${top ? ` · ${esc(ML(top[0]))} ${Math.round(top[1])}%` : ''}</small></span><span class="swm ${i < 2 ? 'top' : ''}">${m}%</span></button>`; }).join('')
    : `<p class="hint">${t('nothingHere')}</p>`;
}

// ---------- what next? muscles you haven't hit yet (free) + Gemini ----------
function hitsFrom(list, includeUndone){
  const hits = {};
  list.forEach(s => s.exercises.forEach(x => { const ex = exById(x.exId);
    x.sets.filter(z => z.type !== 'W' && (z.done || (includeUndone && !x.ended))).forEach(() => Object.entries(ex.mu).forEach(([h, v]) => { if(HEADS[h]) hits[h] = (hits[h] || 0) + v / 100; })); }));
  return hits;
}

function openNext(){
  const list = nextSuggestions();
  $('nxBody').innerHTML = (list.length ? list.map(x => `<div class="nxrow"><b>${esc(ML(x.h))}</b> <small class="rmeta">${t('nxWhy', { a: Math.round(x.s * 10) / 10, b: Math.round(x.w * 10) / 10 })}</small>${exTiles(x.ex, x.h)}</div>`).join('') : `<p class="hint">${t('nxNone')}</p>`) +
    (AI.hasKey() ? `<div class="actions"><button class="btn" id="nxAI">${t('nxAI')} ${AI.badge()}</button></div><div id="nxAIOut"></div>` : `<p class="hint">${t('nxNoKey')}</p>`);
  open('ovNext');
}

// ---------- progress ----------
function strengthChange(exId){
  const h = exHistory(exId); if(!h.length) return null;
  const now = Date.now(), d = s => (now - new Date(s.start)) / 864e5;
  const recent = h.filter(x => d(x) <= 28), prev = h.filter(x => d(x) > 28 && d(x) <= 56);
  const best = a => a.length ? Math.max(...a.map(x => x.e1)) : null;
  const r = best(recent), p = best(prev), first = h[0].e1, all = best(h);
  return { h, best: all, pct: r && p ? (r / p - 1) * 100 : null, since: r && h.length > 1 ? (r / first - 1) * 100 : null };
}

// confetti: plain coloured dots, squares and bars from the theme (no emoji)
const CONF_COL = ['var(--t-accent)', 'var(--t-rest)', 'var(--t-warm)', 'var(--t-done)', 'var(--t-drop)'];
function celebrate(){
  const b = $('burst'); for(let i = 0; i < 18; i++){ const s = document.createElement('span'); s.className = 'cf cf' + (i % 3); s.style.background = CONF_COL[i % CONF_COL.length];
    s.style.left = '50%'; s.style.top = '45%'; s.style.setProperty('--dx', `${(Math.random() - .5) * 360}px`); s.style.setProperty('--dy', `${(Math.random() - .7) * 420}px`); s.style.setProperty('--rot', `${(Math.random() - .5) * 120}deg`);
    b.appendChild(s); setTimeout(() => s.remove(), 1300); }
  Phone.vibrate([40, 30, 60]);
}

// ---------- recovery: RECOVERY+ (js/recovery-plus.js) owns the maths. These older names stay for their callers and read from it. ----------
// The sleep multiplier (sleepFactor / watchSleepHours) is retired: sleep never changes muscle hours (RECOVERY+ › sleep context instead),
// and the AI's hours (ses.recov) are kept only as old saved data: they no longer change any estimate.
const exRec = id => { const x = exById(id); return x && x.m === 'other' && !(x.mu && Object.keys(x.mu).length) ? null : x; };
function headLoads(ses){ const idx = RecoveryCore.indexHistory(sessions, exRec, loadOf), r = RecoveryCore.sessionHeadLoads(ses, idx, exRec, loadOf), out = {};
  Object.entries(r.heads).forEach(([h, v]) => { out[h] = v.load; }); return out; }
// hours until each trained group of ONE workout is ready again (saved with the workout as ses.recovEst; a record of that day, not a live clock)
function estimateRecovery(ses){ const L = headLoads(ses), g = {};
  Object.entries(L).forEach(([h, l]) => { if(l < .5) return; const A = Math.min(1, l / 6), T = RecoveryCore.headHours(h, l), gr = RecoveryCore.GROUP[h];
    if(gr) g[gr] = Math.max(g[gr] || 0, A > .2 ? Math.round(T * (1 - .2 / A)) : 0); }); return g; }
// residual fatigue per head (0–1) at a moment, from finished workouts only
function headFatigue(atTs){ const r = RecoveryPlus.compute(); return Object.fromEntries(RecoveryCore.HEADS21.map(h => [h, r.tr.fatigueAt(h, atTs)])); }
// what made this workout hard, from your own history (no maths of its own: volume, minutes and top weights as saved)
function recFacts(ses){
  const prev = sessions.filter(s => s.id !== ses.id && String(s.start) < String(ses.start)).slice(-10), avg = k => prev.length ? prev.reduce((a, s) => a + (+s[k] || 0), 0) / prev.length : 0;
  const top = x => Math.max(0, ...x.sets.filter(isMainSet).map(st => loadOf(x.exId, +st.w || 0)));
  let up = 0; ses.exercises.forEach(x => { const last = [...prev].reverse().map(s => s.exercises.find(y => y.exId === x.exId)).find(Boolean); if(last && top(x) > top(last) * 1.04) up++; });
  const fail = ses.exercises.reduce((a, x) => a + x.sets.filter(st => st.type === 'F' || st.type === 'D').length, 0), av = avg('vol'), am = avg('mins');
  return [`duration ${ses.mins} min${am ? ` (your usual: ${Math.round(am)} min)` : ''}`, `total volume ${Math.round(ses.vol)} kg${av ? ` (your usual: ${Math.round(av)} kg)` : ''}`,
    `exercises where the weight went up clearly since last time: ${up}`, `weight records: ${(ses.prs || []).filter(p => p.kind === 'w').length}`, `sets to failure or drop sets: ${fail}`].join('; ');
}
// Refinements #8: the coach's line is 1-2 short sentences; anything longer than two lines on a small iPhone is cut to its first sentence, or dropped
function recNoteFit(s){ s = String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu, '').replace(/\s+/g, ' ').trim(); if(!s) return '';
  if(s.length > 85){ const m = s.match(/^.*?[.!;](\s|$)/); s = m ? m[0].trim() : ''; }
  return s.length > 85 ? '' : s; }
async function aiRecovery(ses){
  const est = ses.recovEst || estimateRecovery(ses), groups = Object.keys(est); if(!groups.length) return null;
  const lines = ses.exercises.map(x => { const ex = exById(x.exId); return `${ex.name || ex.id} [${Object.entries(ex.mu || {}).map(([h, v]) => `${h} ${v}%`).join(', ')}]: ` +
    x.sets.map(s => `${s.w || 0}kg×${s.r || 0}${s.type === 'F' ? ' (to failure)' : s.type === 'D' ? ' (drop set)' : s.type === 'W' ? ' (warm-up)' : ''}`).join(', '); }).join('\n');
  // RECOVERY+: the hours below are the app's final estimate. The AI only explains them in one short line; it never sets hours.
  const prompt = `You are an experienced strength coach talking to the lifter right after this workout.
The app's recovery estimate (final, hours until each muscle group can be trained hard again): ${JSON.stringify(est)}. Do not change these numbers.
Facts about this workout: ${recFacts(ses)}.
Workout:
${lines}
Return ONLY JSON: {"note":"..."}.
"note": in ${lang === 'el' ? 'Greek' : 'English'}, one or two very short sentences, at most 12 words, under 75 characters in total.
Say how many hours the most worked muscles need, using exactly the hours above (in hours, never days), and why, from the facts (heavier than last time, a lot of volume, a long session, sets to failure). No emoji. Never call it medical advice.`;
  const d = await gemini(prompt, null, null, null, { quiet: true }); if(!d || !d.note) return null;
  return { hours: est, note: recNoteFit(d.note) };
}

function groupReadiness(atTs){
  const f = headFatigue(atTs), out = {};
  RecoveryCore.GROUPS10.forEach(g => { out[g] = Math.min(...RecoveryCore.HEADS21.filter(h => RecoveryCore.GROUP[h] === g).map(h => 1 - (f[h] || 0))); });
  return out;
}
// ONE source for the state of every group: RECOVERY+. Same shape as before ({ h, st, col, p }) plus st 'unk' (no workout history: unknown, never "ready")
// and heads (the heads that are not ready). > 24 h left = low (Needs Rest) · 1–24 h = mid (Recovering) · 0 = ok (Ready).
let _recMapAt = 0, _recMapV = null;
function recMapNow(){ if(!_recMapV || Date.now() - _recMapAt > 30000){ _recMapV = recMap(); _recMapAt = Date.now(); } return _recMapV; }
// RECOVERY+: the sore-muscle state of one exercise from ITS OWN significant heads (a biceps curl never makes a triceps pushdown look sore)
function exSore(exId){ const mu = RecoveryCore.muOf(exById(exId)); if(!mu) return null; const r = RecoveryPlus.compute();
  const hs = Object.entries(mu).filter(([, pc]) => pc >= RecoveryCore.CFG.significant).map(([h]) => h).filter(h => r.tr.heads[h].state === 'recovering' || r.tr.heads[h].state === 'needs_rest');
  if(!hs.length) return null; hs.sort((a, b) => r.tr.heads[b].hours - r.tr.heads[a].hours); const v = r.tr.heads[hs[0]];
  return { h: v.hours, st: RecoveryCore.legacySt(v.state), p: v.p, head: hs[0], heads: hs }; }
const recStateH = h => h > 24 ? 'low' : h > 0 ? 'mid' : 'ok';
function recMap(){ return RecoveryPlus.legacyMap(); }
// 0.7.7: a smooth gradient instead of stages: green (ready) → yellow (24 h left) → red (3 days or more left). The label still follows recStateH.
const recMix = (a, b, p) => `color-mix(in srgb, ${b} ${Math.round(Math.max(0, Math.min(1, p)) * 100)}%, ${a})`;
const recColor = h => h <= 0 ? REC_COL.ok : h <= 24 ? recMix(REC_COL.ok, REC_COL.mid, h / 24) : recMix(REC_COL.mid, REC_COL.low, (h - 24) / 48);
const recFill = m => Object.fromEntries(Object.entries(m).filter(([, v]) => v.col).map(([g, v]) => [g, v.col])), recLows = m => new Set(Object.entries(m).filter(([, v]) => v.st === 'low').map(([g]) => g));
// head colours for the RECOVERY+ figure: each head by its own hours; unknown heads get none (neutral graphite)
// Dark mode only: the figure's green / orange / red are softened toward the dark background (they were too bright against it); Light mode is unchanged
// green stays softened a little less than before (.30, was .42); orange and red are barely softened so they read bright against the dark body
const recDim = (c, h) => document.documentElement.getAttribute('data-theme') === 'dark' ? recMix(c, '#2a2f33', h <= 0 ? .30 : h <= 24 ? .30 - .24 * (h / 24) : Math.max(0, .06 - .06 * ((h - 24) / 48))) : c;
function recHeadColors(tr){ const out = {}; RecoveryCore.HEADS21.forEach(h => { const v = tr.heads[h]; if(v.state !== 'unknown') out[h] = recDim(recColor(v.hours), v.hours); }); return out; }

function tplGroups(tp){ const s = new Set(); tp.exercises.forEach(e => Object.entries(exById(e.exId).mu).forEach(([h, v]) => { if(v >= 40 && HEADS[h] && HEADS[h][2] !== 'cardio') s.add(HEADS[h][2]); })); return [...s]; }

// Today's gym card lines (RECOVERY+): tomorrow's planned workout judged by its own exercises' heads, and a rest-day note. Advice only.
function recoveryWarnings(){
  const out = [], tk = todayKey(), tm = addDays(tk, 1), r = RecoveryPlus.compute();
  if(r.next && r.next.date === tm && r.nextA && r.nextA.assessment === 'consider_adjustment' && r.next.name){
    out.push(t('recWarnNext', { w: r.next.name, t: fmtClock(r.next.time), m: recHeadList(r.nextA.limiting.slice(0, 2)) })); }
  const di = dayInfo(tk);
  if(di.type === 'rest'){ const bad = RecoveryCore.GROUPS10.filter(g => ['recovering', 'needs_rest'].includes(r.tr.groups[g].state)); if(bad.length) out.push(t('recRestDay', { m: bad.map(g => ML(g)).join(', ') })); }
  return out;
}
const recHeadList = hs => hs.map(h => ML(h)).join(', ');

// ---------- RECOVERY+ page (#gRecV, route gym-rec) ----------
// Order: A next workout (one suggestion, never a change) · B the approved body (js/recovery-anatomy.js) · C tiles ONLY for muscles that are
// Recovering / Need Rest (same tiles with Advanced on) · D at most one insight · E Advanced: why, load, effort, trend, confidence, sleep / food / goal context.
// Nothing here writes workouts, plans, targets or logs. Ready muscles stay green on the body; unknown stays graphite, never green.
const recSex = () => profile && profile.sex === 'f' ? 'f' : 'm';
function recFigure(r){ r = r || RecoveryPlus.compute();
  return recoveryAnatomySVG({ sex: recSex(), view: 'both', colorsByHead: recHeadColors(r.tr), idPrefix: 'rec', maxWidth: 360, label: recFigLabel(r) }); }
function recFigLabel(r){ const not = RecoveryCore.GROUPS10.filter(g => ['recovering', 'needs_rest'].includes(r.tr.groups[g].state));
  return t('recFigAria', { m: not.length ? not.map(g => ML(g)).join(', ') : t('recNoneShort') }); }
// food context for older callers: the structured RECOVERY+ nutrition result (missing / partial logs = unknown, never "low")
function recFoodVerdict(){ return RecoveryPlus.compute().nutr; }
function recFoodLine(){ return ''; }   // replaced by the one RECOVERY+ insight (renderRecovery)
const REC_CONF = c => t({ low: 'recCLow', moderate: 'recCMod', high: 'recCHigh' }[c] || 'recUnknown');
const recName = (g, v) => { const all = RecoveryCore.HEADS21.filter(h => RecoveryCore.GROUP[h] === g); return v.heads.length && v.heads.length < all.length ? `${ML(g)} · ${v.heads.map(h => ML(h)).join(', ')}` : ML(g); };
const recWhen = (d, tm) => { const n = daysUntil(d); return t('recNextWhen', { d: n === 0 ? t('recDayToday') : n === 1 ? t('recDayTomorrow') : t('wdFull').split(' ')[new Date(d + 'T12:00:00').getDay()], t: fmtClock(tm) }); };
function recNextCard(r){
  const tr = r.tr, nx = r.next, a = r.nextA, hist = tr.evidence.sessionsTotal;
  if(!ui.wpAdv || !nx) return '';   // the next workout shows only when the Week Planner is in Advanced mode and a workout is planned; otherwise nothing
  const notGroups = RecoveryCore.GROUPS10.filter(g => ['recovering', 'needs_rest'].includes(tr.groups[g].state));
  let title = t('recNextT'), sub = '', msg = '';
  if(!hist) msg = t('recAsNoHistory');
  if(nx){ sub = `${esc(nx.name || t('gymAny'))} · ${esc(recWhen(nx.date, nx.time))}`;
    if(hist && a){ const lim = a.limiting.slice(0, 2).map(h => ML(h)).join(', '), code = a.suggestionCodes[0];
      msg = { train_as_planned: t('recAsProceed'), monitor_performance: t('recAsMonitor', { m: lim }), reduce_volume_optional: t('recAsReduce', { m: lim }),
        consider_alternative: t('recAsAlt', { m: lim }), extra_rest_optional: t('recAsRest', { m: lim }),
        check_fatigued_muscles: t('recAsListFat', { m: a.limiting.slice(0, 3).map(h => ML(h)).join(', ') }), no_exercise_list: t('recAsListOk') }[code] || ''; } }
  else if(hist){ title = t('recNoPlanT'); msg = notGroups.length ? t('recSumRec', { m: notGroups.map(g => ML(g)).join(', ') }) : tr.evidence.lastAt && Date.now() - tr.evidence.lastAt > 21 * 864e5 ? t('recStale') : t('recSumReady'); }
  const lowHist = hist > 0 && (hist < 3 || tr.evidence.recent14 === 0) ? `<small class="recmeta">${t('recLimited')}</small>` : '';
  const ico = !hist ? 'info' : a && a.assessment === 'consider_adjustment' ? 'warn' : 'check';
  return `<div class="recnext card"><div class="rnh"><span class="rnic ${ico}">${svgIcon(ico === 'info' ? 'bolt' : ico, 18, 2.2)}</span><b>${title}</b></div>${sub ? `<div class="rnsub">${sub}</div>` : ''}
    <p class="rnmsg">${esc(msg)}</p>${lowHist}${hist && (nx || notGroups.length) ? `<small class="recmeta">${t('recAdvice')}</small>` : ''}</div>`;
}
let REC_T = 0;
function renderRecovery(){
  const r = RecoveryPlus.compute(), tr = r.tr, C = { ok: REC_COL.ok, mid: REC_COL.mid, low: REC_COL.low }, adv = !!ui.recAdv, hist = tr.evidence.sessionsTotal;
  const order = r.nextA ? new Set(r.nextA.limiting.map(h => RecoveryCore.GROUP[h])) : new Set();
  const sore = RecoveryCore.GROUPS10.map(g => [g, tr.groups[g]]).filter(([, v]) => v.state === 'recovering' || v.state === 'needs_rest')
    .sort((a, b) => order.has(b[0]) - order.has(a[0]) || b[1].hours - a[1].hours || ML(a[0]).localeCompare(ML(b[0])));
  const unk = RecoveryCore.GROUPS10.some(g => tr.groups[g].state === 'unknown');
  const ins = recInsight(r);
  const stale = hist && (!tr.evidence.lastAt || Date.now() - tr.evidence.lastAt > 21 * 864e5);
  const none = !hist ? `<div class="recall neutral">${svgIcon('bolt', 20, 2.2)}<b>${t('recAsNoHistory')}</b></div>`
    : stale ? `<div class="recall neutral">${svgIcon('clock', 20, 2.2)}<b>${t('recStale')}</b></div>`
    : `<div class="recall">${svgIcon('check', 22, 2.6)}<b>${t('recAllReady')}</b></div>`;
  $('gRecV').innerHTML = recNextCard(r) + `<div class="reccard"><div id="recFig">${recFigure(r)}</div>
      <div class="recgrad" aria-hidden="true"><i style="background:linear-gradient(90deg,${C.ok},${C.mid},${C.low})"></i><span><small class="ok">${t('recReady')}</small><small class="mid">${t('recMid')}</small><small class="low">${t('recLow')}</small></span></div>
      ${unk ? `<small class="recunk"><i></i>${t('recUnknownKey')}</small>` : ''}</div>
    ${sore.length ? `<h3 class="rech">${t('recWatchT')}</h3><div class="rectiles" id="recTiles">${sore.map(recTile).join('')}</div>` : none}
    ${ins ? `<div class="recins"><span class="rnic">${svgIcon('bolt', 16, 2.2)}</span><div><b>${t('recInsightT')}</b><p>${esc(ins.text)}</p></div></div>` : ''}
    <div class="wpadv recadv"><span>${t('advancedT')}</span><button class="switch ${adv ? 'on' : ''}" id="recAdvSw" type="button" role="switch" aria-checked="${adv}" aria-label="${t('advancedT')}"><i></i></button></div>
    ${adv ? recAdvanced(r, sore) : ''}
    <p class="hint">${t('recHint2')}</p>`;
  clearInterval(REC_T); REC_T = sore.length ? setInterval(recTick, 60000) : 0;
}
const recTile = ([g, v]) => `<div class="rectile ${RecoveryCore.legacySt(v.state)}" data-rg="${g}" data-h="${v.hours}"><b class="rtn">${esc(recName(g, v))}</b><div class="rtpic">${recMuscleSVG(g)}</div>
  <span class="rth">${gymIco('clock', 16, 2)}<b>${v.hours}</b><small>${t('recHrs')}</small></span></div>`;
// one insight at most; a tip shown on each of the last 3 days steps aside for a day (device memory, ui.recIns)
function recInsight(r){
  const mem = (ui.recIns && typeof ui.recIns === 'object') ? ui.recIns : {}, tk = todayKey();
  const recent = Object.entries(mem).filter(([c, v]) => v && v.n >= 3 && v.last === addDays(tk, -1)).map(([c]) => c);
  const pick = RecoveryCore.buildDecisionInsight({ sleep: r.sleep, nutr: r.nutr, next: r.nextA, recentCodes: recent }); if(!pick) return null;
  const m = mem[pick.code] || { n: 0, last: '' }; if(m.last !== tk){ mem[pick.code] = { n: m.last === addDays(tk, -1) ? m.n + 1 : 1, last: tk }; ui.recIns = mem; saveUI(); }
  return { code: pick.code, text: t('recI_' + pick.code.replace('insight_', '')) };
}
function recAdvanced(r, sore){
  const tr = r.tr, rows = [];
  sore.forEach(([g, v]) => { const hs = v.heads.length ? v.heads : v.all;
    const items = hs.map(h => { const x = tr.heads[h], cs = x.contrib || [], sets = cs.reduce((a, c) => a + c.sets, 0), rir = cs.reduce((a, c) => a + c.rirSets, 0),
        fail = cs.reduce((a, c) => a + c.failSets, 0), drop = cs.reduce((a, c) => a + c.dropSets, 0), exs = [...new Set(cs.flatMap(c => c.ex))];
      const top = exs[0], sc = top ? strengthChange(top) : null;
      const li = [t('recDSets', { n: sets, s: cs.length }), exs.length ? t('recDEx', { e: exs.slice(0, 3).map(id => exName(id)).join(', ') }) : '',
        sets ? (rir ? t('recDRir', { a: rir, b: sets }) : t('recDRirNone')) : '', fail ? t('recDFail', { n: fail }) : '', drop ? t('recDDrop', { n: drop }) : '',
        x.range && x.hours > 0 ? t('recDRange', { a: x.range[0], b: x.range[1] }) : '', t('recDConf', { c: REC_CONF(x.conf) }),
        sc && sc.pct != null ? t('recDTrend', { e: exName(top), s: (sc.pct >= 0 ? '+' : '') + Math.round(sc.pct) + '%' }) : top ? t('recDTrendNone') : '',
        x.reasons.includes('personal_faster') ? t('recPersFast') : x.reasons.includes('personal_slower') ? t('recPersSlow') : '',
        x.reasons.includes('unmapped_exercise_in_session') ? t('recDUnmapped') : ''].filter(Boolean);
      return `<div class="radh"><b>${esc(ML(h))}</b> <small>${t({ needs_rest: 'recLow', recovering: 'recMid', ready: 'recReady' }[x.state] || 'recUnknown')}${x.hours ? ` · ${x.hours} ${t('recHrs')}` : ''}</small><ul>${li.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`; }).join('');
    rows.push(`<details class="radrow"><summary>${esc(recName(g, v))}<small>${v.hours} ${t('recHrs')}</small></summary>${items}</details>`); });
  const a = r.nextA, why = a && a.limitingDetail && a.limitingDetail.length ? a.limitingDetail.slice(0, 4).map(l => t('recWhyRow', { m: ML(l.h), h: l.hours, n: l.primary || l.any })).join(' ') : a ? t('recWhyNone') : t('recWhyNoPlan');
  const sl = r.sleep, sleepTx = settings.recNoSleep ? t('recOff') : sl.status === 'unknown' ? t('recSleepNone') : sl.reasonCodes.includes('repeated_short_sleep') ? t('recSleepShort', { h: sl.avg7 || '–' })
    : sl.reasonCodes.includes('short_sleep_single') ? t('recSleepSingle', { h: sl.lastNightHours }) : t('recSleepOk', { h: sl.avg7 || sl.lastNightHours || '–' });
  const n = r.nutr, foodTx = settings.recNoFood ? t('recOff') : [n.protein.status === 'adequate_observed' ? t('recFoodProteinOk') : n.protein.status === 'possible_gap' ? t('recFoodProteinGap') : t('recFoodUnknown'),
    n.coverage.loggedDays ? t('recFoodCov', { a: n.coverage.loggedDays, b: n.coverage.eligibleDays, w: n.coverage.windowDays }) : ''].filter(Boolean).join(' ');
  const ga = n.goalAssessment || {}, gl = { bulk: 'gBulk', recomp: 'gRecomp', cut: 'gCut' }[ga.selectedGoal];
  const goalTx = settings.recNoFood ? t('recOff') : (gl ? t(gl) : t('recUnknown')) + (targets && targets.goalAt ? ` · ${t('recSince', { d: fmtDay(targets.goalAt) })}` : '') + '. ' +
    t({ consistent_with_target: 'recEnergyOk', below_target: 'recEnergyLow', above_target: 'recEnergyHigh' }[ga.observedEnergyRelation] || 'recEnergyUnknown');
  const ev = tr.evidence, dataTx = ev.sessionsTotal ? t('recDataN', { n: ev.sessionsTotal, d: ev.lastAt ? fmtDay(new Date(ev.lastAt).toISOString().slice(0, 10)) : '–' }) : t('recAsNoHistory');
  const ctx = [[t('recCtxWhy'), why], [t('recCtxSleep'), sleepTx], [t('recCtxFood'), foodTx], [t('goal'), goalTx], [t('recCtxData'), dataTx + ' ' + t('recCtxRule')]];
  return `${rows.length ? `<h3 class="rech">${t('recDetailsT')}</h3><div class="radlist">${rows.join('')}</div>` : ''}
    <h3 class="rech">${t('recContextT')}</h3><div class="card radctx">${ctx.map(([k, v]) => `<div class="radc"><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join('')}
      <div class="radsw"><span>${t('recUseFood')}</span><button class="switch ${settings.recNoFood ? '' : 'on'}" type="button" role="switch" data-recopt="recNoFood" aria-checked="${!settings.recNoFood}" aria-label="${t('recUseFood')}"><i></i></button></div>
      <div class="radsw"><span>${t('recUseSleep')}</span><button class="switch ${settings.recNoSleep ? '' : 'on'}" type="button" role="switch" data-recopt="recNoSleep" aria-checked="${!settings.recNoSleep}" aria-label="${t('recUseSleep')}"><i></i></button></div></div>`;
}
const fmtDay = d => { const x = new Date(d + 'T12:00:00'); return x.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' }); };
// one muscle group cut from the RECOVERY+ body (same artwork), each not-ready head in its own state colour; crop from the drawn geometry
function recMuscleSVG(g){
  const r = RecoveryPlus.compute(), v = r.tr.groups[g], hs = v.heads.length ? v.heads : v.all, c = raCropFor(recSex(), hs); if(!c) return '';
  const cols = {}; hs.forEach(h => { const x = r.tr.heads[h]; if(x.state !== 'unknown') cols[h] = recDim(recColor(x.hours), x.hours); });
  return recoveryAnatomySVG({ sex: recSex(), view: c.fig === 'f' ? 'front' : 'back', colorsByHead: cols, only: hs, crop: c.box, idPrefix: 'rt' + g });
}
function recTick(){
  const box = $('recTiles'); if(!box || !box.isConnected){ clearInterval(REC_T); return; }
  if(document.hidden || $('gRecV').classList.contains('hide')) return;
  const tr = RecoveryPlus.compute().tr, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if([...box.children].some(el => +el.dataset.h !== tr.groups[el.dataset.rg].hours)){ const f = $('recFig'); if(f) f.innerHTML = recFigure(); }   // the body's colours move with the hours
  const gone = [];
  [...box.children].forEach(el => { const v = tr.groups[el.dataset.rg], st = RecoveryCore.legacySt(v.state); if(st === 'ok' || st === 'unk'){ gone.push(el); return; }
    el.dataset.h = v.hours; el.querySelector('.rth b').textContent = v.hours;
    if(!el.classList.contains(st)){ el.classList.remove('low', 'mid'); el.classList.add(st); el.querySelector('.rtpic').innerHTML = recMuscleSVG(el.dataset.rg); } });
  if(!gone.length) return;
  if(gone.length === box.children.length || still){ if(gone.length === box.children.length) renderRecovery(); else gone.forEach(el => el.remove()); return; }
  // the ready tile fades out, then the others glide into place (transform and opacity only)
  gone.forEach(el => el.classList.add('out'));
  setTimeout(() => { const rest = [...box.children].filter(el => !gone.includes(el)), r0 = rest.map(el => el.getBoundingClientRect());
    gone.forEach(el => el.remove());
    rest.forEach((el, i) => { const r1 = el.getBoundingClientRect(), dx = r0[i].left - r1.left, dy = r0[i].top - r1.top; if(!dx && !dy) return;
      el.style.transition = 'none'; el.style.transform = `translate(${dx}px,${dy}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'transform .34s cubic-bezier(.2,.9,.25,1)'; el.style.transform = ''; })); }); }, 240);
}

// 0.7.2: the new body (Body Muscles by Ivan Vulović, Apache 2.0, rounded shapes; data in js/data/gym-anatomy.js).
// A body-coloured outline sits behind, so the gaps between muscles read as lines. Female users keep the older drawing until there is a female source.
const gymBmVal = (heads, mu) => Math.max(0, ...heads.map(h => +(mu || {})[h] || 0));
const gymBmSides = { f: new Set(GYM_BM.f.mus.flatMap(([k]) => GYM_BM_HEADS[k])), b: new Set(GYM_BM.b.mus.flatMap(([k]) => GYM_BM_HEADS[k])) };
function gymBodySVG(o){
  const mode = o.mode || 'plain', region = o.region, gcol = o.colors || {}, mu = o.mu || {}, max = o.muMax || 60;
  const live = h => mode === 'rec' || mode === 'plain' || !region || (o.groupRegion && o.groupRegion(ANAT_HEAD_GROUP[h]) === region);
  const shape = ([k, d]) => { const hs = GYM_BM_HEADS[k], h = hs[0], g = ANAT_HEAD_GROUP[h], on = live(h), tap = mode === 'pick' && on;
    let fill = '', op = 1, cls = '';
    if(mode === 'rec'){ fill = gcol[g] || ''; if(!fill) cls = 'gbm-off'; else if(o.lows && o.lows.has(g)) cls = 'mlow'; }
    else if(mode === 'mu'){ const v = gymBmVal(hs, mu); if(v > 0){ if(o.tint) fill = HEAD_COL[hs.find(z => (+mu[z] || 0) > 0) || h]; else cls = 'gbm-on'; op = .35 + .65 * Math.min(1, v / max); } else cls = 'gbm-off'; }
    else if(mode === 'select'){ const m = o.muscleOf(h, hs); return m ? `<path d="${d}" class="cxm" data-cm="${m}" style="--cmc:${o.colorOf(m)}"/>` : `<path d="${d}" class="gbm-off" style="pointer-events:none"/>`; }
    else if(mode === 'pick'){ if(on) fill = HEAD_COL[h]; else cls = 'gbm-off'; }
    else fill = HEAD_COL[h];
    return `<path d="${d}"${cls ? ` class="${cls}"` : ''}${fill ? ` fill="${fill}"` : ''}${op < 1 ? ` fill-opacity="${op.toFixed(2)}"` : ''}${tap ? ` data-hh="${h}" data-g="${g}" style="cursor:pointer"` : ' style="pointer-events:none"'}/>`; };
  const fig = (side, ox, label) => `<g transform="translate(${ox} 0)"><path class="gbm-edge" d="${GYM_BM[side].base}" style="pointer-events:none"/><path class="gbm-base" d="${GYM_BM[side].base}" style="pointer-events:none"/>${GYM_BM[side].mus.map(shape).join('')}
      ${o.labels === false || o.side ? '' : `<text x="100" y="460" text-anchor="middle" fill="var(--t-muted)" font-size="13" font-family="var(--font)">${label}</text>`}</g>`;
  if(o.side){
    const vb1 = o.vb || (o.half === 'up' ? '24 4 152 250' : o.half === 'low' ? '24 196 152 250' : '0 0 200 446');
    return `<svg viewBox="${vb1}" width="${o.w || 46}" height="${o.h || 56}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${fig(o.side, 0, '')}</svg>`;
  }
  const vb = o.half === 'up' ? '22 4 336 262' : o.half === 'low' ? '22 196 336 252' : `0 0 420 ${o.labels === false ? 446 : 468}`;
  return `<svg viewBox="${vb}" width="100%" style="max-width:${o.max || 380}px;display:block;margin:0 auto" aria-hidden="true">${fig('f', 0, o.front || 'Front')}${fig('b', o.half ? 160 : 220, o.back || 'Back')}</svg>`;
}

function anatomySVG(o){
  o = o || {};
  if(!(o.fem !== undefined ? o.fem : profile.sex === 'f')) return gymBodySVG(o);
  const mode = o.mode || 'plain', region = o.region, gcol = o.colors || {}, idp = o.idp || 'an';
  const fill = h => { const g = ANAT_HEAD_GROUP[h];
    if(mode === 'rec') return gcol[g] || '#3a4048';
    if(mode === 'mu') return (o.mu || {})[h] > 0 ? (o.tint ? HEAD_COL[h] : '#c6f432') : '#3a4048';   // how much each head works: lime (tint: the muscle's colour), brighter = more
    if(mode === 'pick'){ const reg = o.groupRegion ? o.groupRegion(g) : null; return !region || reg === region ? HEAD_COL[h] : '#3a4048'; }
    return HEAD_COL[h]; };
  const live = h => mode === 'rec' || mode === 'plain' || !region || (o.groupRegion && o.groupRegion(ANAT_HEAD_GROUP[h]) === region);
  const fem = o.fem !== undefined ? o.fem : profile.sex === 'f', W_ = d => fem ? femWarp(d) : d;
  const sel = mode === 'select' ? h => o.muscleOf(h, [h]) : null;   // creator: the muscle each shape stands for; colours come from CSS
  const half = side => ANAT[side].map(([h, d]) => sel ? (sel(h) ? `<path d="${W_(d)}" class="cxm" data-cm="${sel(h)}" style="--cmc:${o.colorOf(sel(h))}" stroke="#0d0f12" stroke-width="1.3" stroke-linejoin="round"/>` : '') : `<path d="${W_(d)}" class="${mode === 'rec' && o.lows && o.lows.has(ANAT_HEAD_GROUP[h]) ? 'mlow' : ''}" data-hh="${live(h) ? h : ''}" data-g="${live(h) ? ANAT_HEAD_GROUP[h] : ''}" fill="${fill(h)}" fill-opacity="${mode === 'mu' ? ((o.mu || {})[h] > 0 ? .3 + .7 * Math.min(1, o.mu[h] / (o.muMax || 60)) : .5) : live(h) ? .95 : .45}" stroke="#0d0f12" stroke-width="1.3" stroke-linejoin="round" style="${mode === 'mu' && !o.tint && (o.mu || {})[h] > 0 ? 'fill:var(--t-accent);' : ''}${live(h) ? 'cursor:pointer' : 'pointer-events:none'}"/>` +
      `<path d="${d}" fill="url(#${idp}shade)" style="pointer-events:none"/>`).join('') +
    `<path d="${W_(ANAT_FIBRES[side])}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width=".8" stroke-linecap="round" style="pointer-events:none"/>`;
  const skin = `<g fill="#2b3036" stroke="#1a1d21" stroke-width="1" style="pointer-events:none">${ANAT_SKIN.map(d => `<path d="${W_(d)}"/>`).join('')}${ANAT_SKIN_ELL.map(([cx, cy, rx, ry]) => `<ellipse cx="${fem ? femX(cx, cy) : cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`;
  const fig = (side, ox, label) => `<g transform="translate(${ox} 0)">
      <g style="pointer-events:none">${fem ? '<path d="M78 40 C76 14 124 14 122 40 C124 62 126 78 118 86 L82 86 C74 78 76 62 78 40 Z" fill="#23272c"/>' : ''}<ellipse cx="100" cy="36" rx="${fem ? 19 : 21}" ry="${fem ? 24.5 : 26}" fill="#2b3036" stroke="#1a1d21"/><path d="M86 54 L114 54 L121 77 L79 77 Z" fill="#2b3036"/></g>
      ${skin}<g transform="translate(200 0) scale(-1 1)">${skin}</g>
      ${half(side)}<g transform="translate(200 0) scale(-1 1)">${half(side)}</g>
      ${o.labels === false || o.side ? '' : `<text x="100" y="438" text-anchor="middle" fill="#8b949c" font-size="13" font-family="system-ui">${label}</text>`}</g>`;
  if(o.side){   // one figure only (mini maps): front or back, whole or half
    const vb1 = o.vb || (o.half === 'up' ? '24 4 152 250' : o.half === 'low' ? '24 196 152 250' : '0 0 200 446');
    return `<svg viewBox="${vb1}" width="${o.w || 46}" height="${o.h || 56}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><radialGradient id="${idp}shade" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>${fig(o.side, 0, '')}</svg>`;
  }
  const vb = o.half === 'up' ? '22 4 336 262' : o.half === 'low' ? '22 196 336 252' : '0 0 420 446';   // 0.6.4: half a body, bigger
  return `<svg viewBox="${vb}" width="100%" style="max-width:${o.max || 380}px;display:block;margin:0 auto" aria-hidden="true">
    <defs><radialGradient id="${idp}shade" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>
    ${fig('f', 0, o.front || 'Front')}${fig('b', o.half ? 160 : 220, o.back || 'Back')}</svg>`;
}

function drawRecipeBox(){
  $('recipeBox').classList.add('hide');
  $('recipeShow').classList.toggle('hide', !D.recipe);
  if(D.recipe) $('recipeShow').innerHTML = recipeHtml(D.recipe, true) + `<button class="linkbtn" id="dropRecipe">${t('noThanks')}</button>`;
}

function applyRecipe(r, own){
  D.recipe = { title: r.title || $('cName').value.trim(), servings: r.servings || null, minutes: r.minutes || null, steps: r.steps || [], own: !!own,
    ingredients: (r.ingredients || []).map(i => ({ name: i.name, grams: Number(i.grams) > 0 ? r1(Number(i.grams)) : null, note: i.note || null })) };
  D.rows = D.rows.filter(x => x.ref || x.grams);
  (r.ingredients || []).forEach(i => D.rows.push({ key: uid(), ref: matchIng([i.name, i.name_en]), grams: Number(i.grams) > 0 ? r1(Number(i.grams)) : null, wanted: i.name }));
  if(!D.rows.length) D.rows.push(newRow());
  if(!$('cName').value.trim() && r.title) $('cName').value = r.title;
  drawRecipeBox(); drawRows(); cookStep(true);
}

// Refinements: a planner time is plain text with the phone's own time wheel laid over it, invisible (like the gym card on Today's Food, .remtime).
// Stored as "HH:MM", as before. Shown in the phone's 12 or 24 hour style, with the app language's words.
function wpTime(v){ return fmtClock(v) || '--:--'; }   // V3: the shared clock formatter (ui.js)
const wpTimeBox = (attr, v, lbl, off) => `<label class="wptime ${off ? 'off' : ''}"><span>${esc(wpTime(v))}</span><input type="time" class="remtime" ${attr} value="${esc(v || '')}" aria-label="${esc(t(lbl))}" ${off ? 'disabled' : ''}></label>`;

function renderGymPlan(){
  const tk = todayKey(), twd = new Date(tk + 'T12:00:00').getDay(), monday = addDays(tk, -((twd + 6) % 7));
  // Advanced off: just GYM or REST per day. On: saved workouts, times and work hours.
  const adv = !!ui.wpAdv;
  // 0.7.2: Advanced = a rounded card, label on the left, switch on the right; full day names, no dates
  $('gPlanV').innerHTML = `<div class="wpadv"><span>${t('advancedT')}</span><button class="switch ${adv ? 'on' : ''}" id="wpAdv" type="button" role="switch" aria-checked="${adv}" aria-label="${t('advancedT')}"><i></i></button></div>` + [1, 2, 3, 4, 5, 6, 0].map((wd, i) => { const p = gymPlan[wd] || {}, date = addDays(monday, i), done = sessions.some(s => s.date === date);
    const head = `<div class="daycard ${wd === twd ? 'today' : ''}" data-wd="${wd}">
      <div class="dch"><b>${t('wdFull').split(' ')[wd]}</b>${done ? `<span class="chip ok">${svgIcon('check', 12, 2.6)} ${t('trained')}</span>` : ''}</div>`;
    if(!adv){ const gym = p.tpl && p.tpl !== 'rest';
      return head + `<div class="seg wpseg"><button data-wpset="gym" class="${gym ? 'on' : ''}">${t('gymL')}</button><button data-wpset="rest" class="${p.tpl === 'rest' ? 'on' : ''}">${t('restDayS')}</button></div></div>`; }
    return head + `
      <div class="dcrow"><span class="dcl lic">${gymIco('card', 18, 1.8)}</span><select data-ptpl><option value="">—</option><option value="rest" ${p.tpl === 'rest' ? 'selected' : ''}>${t('restDayL')}</option><option value="gym" ${p.tpl === 'gym' ? 'selected' : ''}>${t('gymAnyOpt')}</option>${tpls.map(x => `<option value="${x.id}" ${p.tpl === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        ${wpTimeBox('data-ptime', p.time, 'workoutAt', !p.tpl || p.tpl === 'rest')}</div>
      ${p.work ? `<div class="dcrow"><span class="dcl lic">${gymIco('work', 18, 1.8)}</span>${wpTimeBox('data-wfrom', p.work.from, 'suFrom')}<span class="rmeta">–</span>${wpTimeBox('data-wto', p.work.to, 'suTo')}<button class="irm" data-wrm aria-label="${t('remove')}">${svgIcon('x', 16, 2.2)}</button></div>`
        : `<button class="linkbtn" data-wadd>${t('addWork')}</button>`}</div>`; }).join('');
}

// Gym Buddy's own line icons (same stroke style as svgIcon): card = an old-console memory card (game save), work = a work bag
const GYM_ICON = {
  card: '<path d="M7.5 2h7.2L18 5.3v15.2a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5v-17A1.5 1.5 0 0 1 7.5 2z"/><rect x="8.5" y="5" width="6" height="5.5" rx="1"/><path d="M11.5 13.2l1.6 1.8h-3.2z"/><path d="M8.8 18.3v1.7M11 18.3v1.7M13.2 18.3v1.7M15.4 18.3v1.7"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h.01M17.2 17.2v3.3h3.3v-3.3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  arrUp: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>', arrDown: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',   // Refinements #7: trend arrows
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  // V27 picker: Reset Filters (one round arrow) and the mark of your own exercise (a puzzle piece)
  reset: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.4h-4.4"/>',
  minus: '<path d="M5 12h14"/>',
  puzzle: '<path d="M9 3H5a2 2 0 0 0-2 2v4h2a2 2 0 0 1 0 4H3v6a2 2 0 0 0 2 2h5v-2a2 2 0 0 1 4 0v2h5a2 2 0 0 0 2-2v-5h-2a2 2 0 0 1 0-4h2V5a2 2 0 0 0-2-2h-5v2a2 2 0 0 1-4 0V3z"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M3 12.5h18"/><path d="M10.5 12.5v1.5h3v-1.5"/>' };
const gymIco = (k, size, sw) => `<svg width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GYM_ICON[k]}</svg>`;

// ---------- Workout Library: starts empty, pick a type ----------
let LIBF = { saved: true, past: false };
function renderTpls(){
  const saved = tpls.length ? `<div class="list" style="margin-top:6px">${tpls.map(x => { const last = sessions.filter(s => s.tplId === x.id).sort((a, b) => b.start.localeCompare(a.start))[0];
    return `<div class="card" data-tp="${x.id}"><div class="ficon lic svic">${gymIco('card', 34, 1.7)}</div><div class="body">
      <div class="name svname">${esc(x.name)}</div><div class="rmeta">${typeLabel_(x.type)} · ${t('nEx', { n: x.exercises.length })}${last ? ' · ' + t('lastDone', { d: fmtDate(last.start) }) : ''}</div>
      <div class="rmeta" style="margin-top:4px">${x.exercises.slice(0, 4).map(e => esc(exName(e.exId))).join(', ')}${x.exercises.length > 4 ? '…' : ''}</div></div>
      <button class="usebtn qrbtn" data-qr-tp aria-label="${t('wqShowL')}">${gymIco('qr', 18, 2)}</button>
      <button class="usebtn" data-go-tp aria-label="${t('gStartL')}">${svgIcon('play', 18, 2)}</button></div>`; }).join('')}</div>` : `<div class="empty" style="margin-top:6px">${t('libEmpty')}</div>`;
  const past = sessions.slice().sort((a, b) => b.start.localeCompare(a.start));
  const pastHtml = past.length ? `<div class="list" style="margin-top:6px">${past.map(s => `<div class="card" data-ses="${s.id}"><div class="ficon lic">${svgIcon('workouts', 22, 1.8)}</div><div class="body">
      <div class="name">${esc(s.name)}</div><div class="rmeta">${fmtDate(s.start)} · ${s.mins} min · ${t('nEx', { n: s.exercises.length })}${s.vol ? ' · ' + s.vol.toLocaleString() + ' kg' : ''}</div></div></div>`).join('')}</div>`
    : `<p class="hint">${t('noPast')}</p>`;
  const fold = (k, title, n, body) => `<button class="foldh ${LIBF[k] ? 'open' : ''}" data-fold="${k}"><b>${title}</b><span class="fn">${n}</span><i>${svgIcon('down', 18, 2)}</i></button>${LIBF[k] ? `<div class="foldb">${body}</div>` : ''}`;
  $('gTplV').innerHTML = `<button class="btn wsbtn" type="button" data-wkscan>${gymIco('qr', 18, 2)}<span>${esc(t('wsT'))}</span></button>` + fold('saved', t('savedWorkouts'), tpls.length, saved) +
    fold('past', t('pastWorkouts'), past.length, pastHtml);
}

// ---------- "What next?" understands push / pull / bro-split days ----------
function nextSuggestions(){
  if(!active) return [];
  const ses = hitsFrom([active], true), week = hitsFrom(sessions.filter(s => -daysUntil(s.date) <= 6), false), ty = active.type;
  const want = h => { if(h === 'cardio') return false; if(TYPE_HEADS[ty]) return TYPE_HEADS[ty].includes(h); const r = GROUPS[HEADS[h][2]][2];
    return ty === 'full' || (workKind(ty) === 'legs' ? r === 'low' : r === 'up'); };
  const heads = Object.keys(HEADS).filter(want).filter(h => h !== 'forearms' && h !== 'lower_back')
    .map(h => ({ h, s: ses[h] || 0, w: week[h] || 0 })).filter(x => x.s < 2).sort((a, b) => (a.s * 3 + a.w) - (b.s * 3 + b.w)).slice(0, 4);
  const used = new Set(active.exercises.map(x => x.exId));
  return heads.map(x => ({ ...x, ex: EX().filter(e => !used.has(e.id) && (e.mu[x.h] || 0) >= 50).sort((a, b) => (exHistory(b.id).length - exHistory(a.id).length) || (b.mu[x.h] - a.mu[x.h]) || (b.rest - a.rest)).slice(0, 3) })).filter(x => x.ex.length);
}

// exercise list = compact rows: mini muscle map (the heads it works, lit by %), name, Muscle Usage, ⓘ, coloured equipment edge
const MINI = new Map();
function miniMap(x, tint){   // tint (V27 picker cards): the worked muscles in their own muscle colour (Petros: now always, on the RECOVERY+ figure)
  const k = x.id + recSex() + (tint ? 't' : ''); if(MINI.has(k)) return MINI.get(k);
  const svg = raExerciseSVG(x.mu || {}, { sex: recSex(), thumb: true, colours: HEAD_COL, idPrefix: 'mm' + (tint ? 't' : '') + x.id.replace(/\W/g, ''), w: tint ? 104 : 46, h: tint ? 116 : 56, aspect: tint ? 104 / 116 : 46 / 56 });
  MINI.set(k, svg); return svg;
}
const PK_IN = () => `<span class="exin" aria-hidden="true">${svgIcon('check', 18, 2.6)}</span>`;   // 0.7.9.6: already in this workout
function exTiles(list, key, vias, have){ have = have || new Set();
  return `<div class="exrows">${list.map(x => { const pct = key ? exScore(x, key) : (x.mu || {})[x.h] || 0;
    return `<button class="exrow${have.has(x.id) ? ' in' : ''}" data-ex="${x.id}" style="--eq:${EQ_COL[x.e] || '#8b949c'}"><span class="mm">${isCardio(x.id) ? exIcon(x, 40) : miniMap(x)}</span>
      <span class="exn"><b>${esc(exName(x))}</b>${vias && vias[x.id] ? `<small class="exalso">${t('exAlso', { n: esc(exTitle(vias[x.id])) })}</small>` : ''}<small>${eqIcon(x.e, 13)} ${EL(x.e)}${isCardio(x.id) ? '' : ` · ${t('muUse', { p: pct })}`}</small></span>${have.has(x.id) ? PK_IN() : ''}<span class="iinfo" data-exinfo="${x.id}" role="button" aria-label="${t('gInfoL')}">${svgIcon('info', 18, 2)}</span></button>`; }).join('')}</div>`;
}

// 0.7.9: cardio list starts with the machines people use most
const CARDIO_FIRST = ['treadmill', 'bike', 'rower', 'elliptical', 'stairs', 'walking'], cardioRank = id => { const i = CARDIO_FIRST.indexOf(id); return i < 0 ? 99 : i; };
// gym-day card on Today (0.6.9): can't be hidden (no ✎ / ✕); the pills sit on the right.
// With no gym time set, tapping anywhere else on the card opens the time picker.
// 0.7.2: the diagonal Workouts icon on the left; Start (today only) next to Skip opens today's planned workout in one tap; Resume while one is running.
// 0.8 (24 Nov): the gym-day card on My Food Log is one slim line: the gym icon + "Gym Day" (or "Rest Day"), then a small accent Start and a
// grey Skip text button. No time and no streak here (the streak is the bubble in the top left). A long press on the card also skips
// (used when the phone is too narrow to show Skip). 0.6.9 named it Gym Day / Rest Day; the old "Gym Today" label is gone.
function renderTodayRec(){
  const el = $('dRec'); if(el) el.innerHTML = '';
  const isToday = daysUntil(curDay) === 0, di = dayInfo(curDay), live = !!active && active.date === curDay, skipped = !!(days[curDay] && days[curDay].skipped);
  let lab, btns = '', gym = false;
  if(di.type === 'gym'){ gym = true; lab = t('gymDay');
    if(isToday && live) btns = `<button class="gymstartbtn" type="button" data-gymresume>${t('gdResume')}</button>`;
    else if(!live) btns = `<button class="skipbtn" type="button" data-skipday>${t('skipGym')}</button>` + (isToday && !active ? `<button class="gymstartbtn" type="button" data-gymstart>${t('gdWorkout')}</button>` : ''); }
  else if(skipped){ lab = t('gymSkipped'); btns = `<button class="skipbtn" type="button" data-unskip>${t('undo')}</button>`; }
  else{ lab = t('restDay');   // a rest day has no Skip, but a Workout bubble (or Resume) when you feel like training anyway
    if(isToday) btns = live ? `<button class="gymstartbtn" type="button" data-gymresume>${t('gdResume')}</button>` : !active ? `<button class="gymstartbtn" type="button" data-gymstart>${t('gdWorkout')}</button>` : ''; }
  $('dBlocks').innerHTML = `<div class="remind gdline${gym ? ' gym' : ' rest'}"${gym && !live ? ' data-gdhold' : ''}><span class="gymdayic">${svgIcon('workouts', 20, 1.9)}</span><b class="gdlab">${esc(lab)}</b>${btns ? `<div class="gymdaybtns">${btns}</div>` : ''}</div>`;
}

// Start on the gym-day card: today's planned workout straight away; no plan → the same Saved Workouts sheet as the Gym tab's Start
function gymStartToday(){
  if(active) return openSession();
  const pl = planFor(todayKey()), tp = pl && pl.tpl && tpls.find(x => x.id === pl.tpl);
  if(!tpls.length || (tp && !ui.wpAdv)) return startSession(tp || null);   // Advanced Week Planner on: always the list, never a preset on its own
  $('gStart').click();
}

// ---------- workout streak: the weekly streak lives in js/streak.js (Change #13); this file only draws it ----------
// flame colour by workouts in the streak (Light-safe values live in workout.css)
function flameIcon(n, size){ return `<span class="flame fl-${flameTier(n)}">${svgIcon('flame', size || 22, 2)}</span>`; }
function flameTier(n){ return n >= 100 ? 'diamond' : n >= 50 ? 'platinum' : n >= 25 ? 'gold' : n >= 10 ? 'silver' : 'orange'; }

function planFor(d){ const wd = new Date(d + 'T12:00:00').getDay(); const p = gymPlan[wd]; if(!p || !p.tpl) return null;
  if(p.tpl === 'rest') return { type: 'rest' };
  if(p.tpl === 'gym') return { type: 'gym', work: 'upper', time: p.time || profile.gymTime || '18:00' };
  const tp = tpls.find(x => x.id === p.tpl); return tp ? { type: 'gym', work: workKind(tp.type), time: p.time || profile.gymTime || '18:00', tpl: tp.id } : null; }

// ---------- tiers: Bronze 3 … Diamond 1 per exercise (0.7.10: the rating in data/gym.js, RANK / rankScore; standards TIER_STD) ----------
const tierBody = () => { const bw = (typeof latestWeight === 'function' && latestWeight()) || (targets && +targets.bw) || 0, sex = profile && profile.sex;
  return bw > 30 && (sex === 'm' || sex === 'f') ? { bw, sex } : null; };
// the standard an exercise is measured against: [Beginner…Elite ratios, strength next to the board lift] or null (no tiers)
function tierStd(exId){ const v = TIER_VARIANT[exId], base = v ? v[0] : exId, s = TIER_STD[base]; return s ? { s, k: v ? v[1] : 1 } : null; }
// one summary per workout with this lift, for rankParts(): finished normal sets only (no warm-ups, drops or the right side of L/R);
// estimated 1RMs from sets of 1–12 reps, volume from every such set; saved workouts + the live one (noLive: saved workouts only)
function tierList(exId, noLive){ const out = [];
  const add = s => { let e1s = [], vol = 0;
    s.exercises.forEach(x => { if(x.exId !== exId) return; x.sets.forEach(st => { if(!st.done || !isMainSet(st) || st.w === '' || st.r === '' || +st.r < 1) return;
      vol += loadOf(exId, st.w) * (+st.r); if(+st.r <= 12) e1s.push(e1rm(+st.w, +st.r, exId)); }); });
    if(e1s.length || vol > 0) out.push({ ago: Math.max(0, -daysUntil(s.date)), e1s, vol }); };
  sessions.forEach(add); if(active && !noLive) add(active); return out; }
const ROMAN = ['III', 'II', 'I'];   // level 3 … 1 inside a tier; n % 3 = 0 → III
const tierName = n => `${t('tier_' + TIERS[Math.floor(n / 3)])} ${ROMAN[n % 3]}`;
// 0.7.10.2: rank plates (img/rank, 15 ranks × large/small). n = 0…14 (Bronze III … Diamond I). An <img>, not inline SVG, so each file's
// own animation runs and its ids never clash when the same plate is on screen many times. `small` under 36 px (no texture), `large` from 36 px.
const rankSrc = (tier, n, size) => `img/rank/${(size || 26) < 36 ? 'small' : 'large'}/${TIERS.includes(tier) ? tier : TIERS[Math.floor(n / 3)] || 'bronze'}-${ROMAN[((n % 3) + 3) % 3]}.svg`;
function rankIcon(tier, n, size){ const h = size || 26;
  return `<img class="rankic" src="${rankSrc(tier, n, h)}" width="${h}" height="${h}" alt="${esc(tierName(n))}" decoding="async" draggable="false">`; }
// the badge top right on the exercise card (just left of the gear); tap → the rank name and the gap to the next level
const tierBadge = tf => `<button type="button" class="tierbadge tr-${tf.tier}" data-tierinfo aria-label="${esc(tf.label)}">${rankIcon(tf.tier, tf.n, 52)}</button>`;
// Athlete Rank v0.4: an exercise that does not compete keeps the slot: a muted empty plate with a small red X; tap / Enter → "Ranking not available"
const rankNaBadge = code => `<button type="button" class="tierbadge rankna" data-rankna="${esc(code)}" aria-haspopup="dialog" aria-label="${esc(t('rankNaT'))}">${rankIcon('bronze', 0, 52)}<span class="rnax" aria-hidden="true">${svgIcon('x', 14, 3)}</span></button>`;
const RANK_NA_TXT = { machine_cable: 'rankNaMachine', other_equipment: 'rankNaOther', insufficient_benchmark: 'rankNaData', protocol: 'rankNaProtocol', assisted: 'rankNaAssist' };
function showRankNa(btn){ hideTip(); const code = btn.dataset.rankna, p = document.createElement('div');
  p.className = 'tippop rankna-pop'; p.id = 'tipPop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-labelledby', 'rankNaH'); p.tabIndex = -1; p.style.zIndex = zTop + 50;
  p.innerHTML = `<b id="rankNaH">${esc(t('rankNaT'))}</b><p>${esc(t(RANK_NA_TXT[code] || 'rankNaData'))}</p>`;
  document.body.appendChild(p); const r = btn.getBoundingClientRect(), w = p.offsetWidth;
  p.style.left = Math.max(16, Math.min(innerWidth - w - 16, r.left)) + 'px'; p.style.top = (r.bottom + 8) + 'px'; p.focus({ preventScroll: true });
  const esc_ = e => { if(e.key !== 'Escape') return; e.preventDefault(); e.stopPropagation(); hideTip(); btn.focus(); };
  document.addEventListener('keydown', esc_, true); new MutationObserver((m, o) => { if(!p.isConnected){ document.removeEventListener('keydown', esc_, true); o.disconnect(); } }).observe(document.body, { childList: true }); }
// the next level, said as something to do: a weight × reps, the reps alone, added weight × reps, or "beat your best" while protected
const rankNextTxt = nx => nx.w != null ? t('tierNextSet', { w: fmt(nx.w), r: nx.r }) : nx.reps != null ? t(nx.sec ? 'tierNextSecs' : 'tierNextReps', { r: nx.reps }) : nx.add != null ? t(nx.sec ? 'tierNextAddSecs' : 'tierNextAdd', { a: fmt(nx.add), r: nx.r }) : nx.beat ? t('tierNextBeat') : t('tierGapKg', { kg: fmt(nx.kg) });
// 0.7.10: tap the rank → a bubble with a bar in the current tier's colour that fills towards the next level; the kg still needed written once.
// Current rank icon at the left end, the next one at the right; at Diamond 1 the bar is full and says so.
function showTierGap(btn){ const x = exAt(btn), tf = x && tierFor(x.exId); if(!tf || !tf.label) return;
  hideTip(); const p = document.createElement('div'); p.className = 'tippop tiergap'; p.id = 'tipPop'; p.dataset.tg = btn.closest('[data-x]') ? btn.closest('[data-x]').dataset.x : ''; p.setAttribute('role', 'tooltip'); p.style.zIndex = zTop + 50;
  p.setAttribute('aria-label', `${tf.label} · ${tf.next ? t('tierGap2', { what: rankNextTxt(tf.next), tier: tf.next.label }) : t('tierTop')}`);
  p.innerHTML = tierBarHtml(tf);
  document.body.appendChild(p);
  const r = btn.getBoundingClientRect(), w = p.offsetWidth;
  p.style.left = Math.max(16, Math.min(innerWidth - w - 16, r.left)) + 'px'; p.style.top = (r.bottom + 8) + 'px'; }
// the kg still needed, then [current plate] bar in the tier colour [next plate]; shared by the rank bubble and the Rank Up window (rank-fx.js)
function tierBarHtml(tf){ const nx = tf.next, pct = nx ? Math.max(0, Math.min(100, tf.frac * 100)) : 100, end = (tier, n, lbl) => `<span class="tgend">${rankIcon(tier, n, 20)}<small>${esc(lbl)}</small></span>`;
  return `<b class="tgkg">${nx ? `<span class="tgup">${svgIcon('arrowUp', 16, 2.8)}</span>${esc(rankNextTxt(nx))}` : esc(t('tierTop'))}</b>${tf.protected ? `<small class="tgprot">${esc(t('rankProt'))}</small>` : ''}
    <div class="tgrow tr-${tf.tier}">${end(tf.tier, tf.n, tf.label)}<span class="tgbar"><i style="transform:scaleX(${(pct / 100).toFixed(3)})"></i></span>${nx ? end(nx.tier, nx.n, nx.label) : ''}</div>`; }
// → null (no tiers for this lift) · { need: true } (body weight or sex missing) · { none: true } (no sets yet)
// · { n (0–14), tier, label, frac (0…1 along this level), next?: { n, tier, label, kg (estimated 1RM still needed) } }
// e1 (optional): a real 1RM from elsewhere (Profile › Add a 1RM); it counts as your peak, or as a normal trainee's if there are no workouts
// noLive: leave the workout in progress out (the rank as of the last saved workout)
// Athlete Rank v0.4 is live (js/rank-v04.js): a typed 1RM (e1) never gives a rank there. The body below is the old engine, kept only as the
// clearly marked fallback for RANK4.on = false.
function tierFor(exId, e1, noLive){ if(typeof RANK4 !== 'undefined' && RANK4.on) return rank4For(exId, noLive);
  const std = tierStd(exId); if(!std) return null; const body = tierBody(); if(!body) return { need: true };
  let parts = rankParts(tierList(exId, noLive));
  if(+e1 > parts.P) parts = parts.P > 0 ? { ...parts, P: +e1 } : rankRefParts(+e1);
  if(!(parts.P > 0)) return { none: true };
  const g = rankGap(parts, body, std), n = g.n, res = { n, tier: TIERS[Math.floor(n / 3)], label: tierName(n), frac: g.frac };
  if(n < 14) res.next = { n: n + 1, tier: TIERS[Math.floor((n + 1) / 3)], label: tierName(n + 1), kg: Math.max(0.5, Math.ceil(g.kg * 2) / 2) };
  return res; }

// ---------- live workout (canvas: Phones.dc.html / Gym.dc.html) ----------
// one exercise is open at a time (plus its superset partners); the others are short cards: name, muscle · equipment · N sets
const ICO_EYE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICO_SWAP = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9a7 7 0 0 1 12-3l3 3M20 15a7 7 0 0 1-12 3l-3-3M19 4v5h-5M5 20v-5h5"/></svg>';
const ICO_TICK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
// line hourglass; the sand drains and it flips every `period` seconds (delay = seconds already gone, so a redraw doesn't restart it)
const hourglass = (cls, size, delay) => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="animation-delay:-${delay || 0}s"><path class="sandT" style="animation-delay:-${delay || 0}s" d="M8.6 5.2h6.8v.9L12 9.6 8.6 6.1z" fill="currentColor"/><path class="sandB" style="animation-delay:-${delay || 0}s" d="M8.6 20.5h6.8v-2.4L12 14.6l-3.4 3.5z" fill="currentColor"/><path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// per-set extras (switched on in Exercise Settings): half reps, negatives, reps in reserve 0–5. Optional fields on the set, so old data needs no change.
// 0.7.9.1: a ticked set shows only the finished row; the values stay saved on the set (recovery, Gym Coach and AI.knows read them). Reopen the set to edit them.
function extrasHtml(s, j, id){ const G = gx(); if(!(gOn('half', id) || gOn('neg', id) || gOn('rir', id)) || s.type === 'W' || s.done) return '';
  // 0.7.10.4: half reps / negatives are buttons under the kg and reps columns; tapping one opens the scroll wheel (openSx). Same fields as before: s.hr, s.ng
  // compact brackets in the kg / reps style, right under their own box: [title value]; tap = the 0–30 wheel, Arrow Up / Down = ±1 (wire/04)
  const num = (k, lbl, v, col) => `<div class="sxn" style="grid-column:${col}"><button type="button" class="sxb${v > 0 ? '' : ' zero'}" data-sxpick="${k}" aria-label="${esc(lbl)}: ${v > 0 ? v : 0}"><span>${lbl}</span><b>${v > 0 ? v : 0}</b></button></div>`;
  return `<div class="setx${s.drop ? " drop" : ""}" data-sxrow="${j}">${gOn('half', id) ? num('hr', t('sxHalf'), s.hr, 2) : ''}${gOn('neg', id) ? num('ng', t('sxNeg'), s.ng, 3) : ''}${gOn('rir', id) ? `<div class="sxr" role="group" aria-label="${t('rirL')}"><span>${t('rirL')}</span>${[0, 1, 2, 3, 4, 5].map(k => `<button data-rir="${k}" class="${s.rir === k ? 'on' : ''}" aria-pressed="${s.rir === k}">${k}</button>`).join('')}</div>` : ''}</div>`; }

// the 0–30 scroll wheel for half reps / negatives (the same .wheel as the shopping count wheel; its rows are 30 px)
let SX = null;
function openSx(x, j, k){ const s = x.sets[j]; if(!s) return; SX = { x, s, k, v: +s[k] > 0 ? +s[k] : null };
  $('sxT').textContent = t(k === 'hr' ? 'halfReps' : 'negReps');
  const w = $('sxWheel'), cur = SX.v || 0; w._set = false;
  w.innerHTML = Array.from({ length: 31 }, (_, i) => `<div data-wn="${i}" class="${i === cur ? 'on' : ''}">${i}</div>`).join('');
  open('ovSx'); w.style.scrollBehavior = 'auto'; requestAnimationFrame(() => { w.scrollTop = cur * 30; w._set = true; }); }
function sxSave(){ if(!SX) return; const { s, k, v } = SX; if(v > 0) s[k] = v; else delete s[k]; SX = null; saveG('act'); renderSession(); }

// the one Exercise Settings sheet (same for every exercise)
// Petros: Exercise Settings works like the main Settings page: a list of sections (tap one to open it, Back returns), and on top the
// switch "Settings Set Individually". The first time the gear is tapped on a card, a small window asks: same for all or individual.
// EXS_EX: the exercise whose card opened it (null = the general settings). EXS_SEC: the open section (null = the list).
let EXS_EX = null, EXS_SEC = null;
const EXS_SECS = [['social', 'exsTabSocial', 'exsSecSocialS'], ['buttons', 'exsTabButtons', 'exsSecButtonsS'], ['sets', 'exsTabSets', 'exsSecSetsS'], ['alerts', 'exsTabAlerts', 'exsSecAlertsS'], ['machine', 'exsTabMachine', 'exsMachS']];
function openExSet(id){ EXS_EX = id && exById(id) ? id : null; EXS_SEC = null; EXS_MK = false;
  if(EXS_EX && !settings.gxMode){ $('ovExSetAsk').dataset.ex = EXS_EX; open('ovExSetAsk'); return; }   // first time: ask how to keep them
  drawExSet(); open('ovExSet'); }
function exSetBack(){ if(!EXS_SEC) return false; EXS_SEC = null; EXS_MK = false; Phone.haptic(); drawExSet(); return true; }
function exSetChoose(m){ setGxMode(m); Phone.haptic(); close('ovExSetAsk'); drawExSet(); open('ovExSet'); if(active) renderSession(); }
function drawExSet(){
  const own = gxEach() && EXS_EX, nm = EXS_EX ? exName(exById(EXS_EX)) : '';
  const row = (k, a, b) => { const sh = own && !GX_EACH.includes(k);
    return `<div class="exsrow"><div><b>${t(a)}</b><small>${t(b)}</small>${sh ? `<small class="exsall">${t('exsShared')}</small>` : ''}</div><button class="switch ${gOn(k, EXS_EX) ? 'on' : ''}" data-gx="${k}" type="button" role="switch" aria-checked="${gOn(k, EXS_EX)}" aria-label="${t(a)}"><i></i></button></div>`; };
  const mk = [['W', t('mkW')], ['D', t('mkD')], ['F', t('mkF')]].map(([k, l]) => `<button type="button" class="mkopt${hideM(k, EXS_EX) ? ' off' : ''}" data-hm="${k}" aria-pressed="${!hideM(k, EXS_EX)}">${l}</button>`).join('');
  const marks = `<div class="exsrow mkrow"><button type="button" class="mkhead" data-hmopen aria-expanded="${EXS_MK}"><span><b>${t('exsMarks')}</b><small>${t('exsMarksS')}</small></span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>${EXS_MK ? `<div class="mklist">${mk}</div>` : ''}`;
  // the switch on top: on = each exercise keeps its own settings
  const each = gxEach();
  $('exsMode').innerHTML = `<div class="exsrow exsmode"><div><b>${t('exsModeT')}</b><small>${t(each ? (EXS_EX ? 'exsModeOnS' : 'exsModeOnNo') : 'exsModeOffS', { n: esc(nm) })}</small></div><button class="switch ${each ? 'on' : ''}" data-gxmode type="button" role="switch" aria-checked="${each}" aria-label="${t('exsModeT')}"><i></i></button></div>`;
  if(!EXS_SEC){
    $('exsBody').innerHTML = `<div class="pgroup exslist">${EXS_SECS.map(([k, l, sub]) => `<button class="prow exsec${k === 'machine' ? ' soon' : ''}" type="button" data-exsec="${k}"><span><b>${t(l)}</b><small>${t(k === 'machine' ? 'carSoon' : sub)}</small></span>${svgIcon('chevR', 16, 2.4)}</button>`).join('')}</div>`;
    return; }
  const sec = EXS_SECS.find(s => s[0] === EXS_SEC), head = `<div class="exsechd"><b>${t(sec[1])}</b>${own && ['buttons', 'sets', 'alerts'].includes(EXS_SEC) ? `<small>${esc(nm)}</small>` : ''}</div>`;
  $('exsBody').innerHTML = head + (EXS_SEC === 'social' ? row('rank', 'exsRank', 'exsRankS') + row('lbAtt', 'atTitle', 'atSub')
    : EXS_SEC === 'buttons' ? row('uniPill', 'exsUniPill', 'exsUniPillS') + row('formPill', 'exsFormPill', 'exsFormPillS') + row('swapPill', 'exsSwapPill', 'exsSwapPillS')
    : EXS_SEC === 'sets' ? row('uniBoth', 'exsUni', 'exsUniS') + marks + row('half', 'halfReps', 'exsHalfS') + row('neg', 'negReps', 'exsNegS') + row('rir', 'exsRir', 'exsRirS')
    : EXS_SEC === 'alerts' ? row('warnSore', 'exsWarn', 'exsWarnS') + row('tips', 'exsTips', 'exsTipsS') + row('sound', 'exsSound', 'exsSoundS')
    : `<div class="exsrow exsoon" aria-disabled="true"><div><b>${t('exsMachT')}</b><small>${t('exsMachS')}</small><small class="exsall">${t('carSoon')}</small></div><button class="switch" type="button" role="switch" aria-checked="false" aria-disabled="true" disabled aria-label="${t('exsMachT')}"><i></i></button></div>`); }

function cardHtml(x, i){
  const ex = exById(x.exId), card = isCardio(x.exId), sc = x.ss ? ssColor(active.exercises, x.ss) : null;
  const hold = isHold(x.exId), doneN = x.sets.filter(s => s.done && isMainSet(s)).length, fresh = !x.ended && !x.sets.some(s => s.done);
  const ssl = sc ? `<div class="sslbl">${t('superset')}</div>` : '', ssStyle = sc ? ` style="--ssc:${sc}"` : '';
  Lat.ensurePairs(x); const sug = suggestFor(x.exId, x.reps), vol = Math.round(exVol(x.exId, x.sets, x.cv));
  const tf = card ? null : tierFor(x.exId), tierNeed = tf && tf.need ? `<button class="tierneed" type="button" data-tierbody>${t('tierNeedBody')}</button>` : '';
  const uniPill = card || (!Lat.canPair(x.exId, ex) && !x.uni) || !gOn('uniPill', x.exId) ? '' : `<button class="pill2 uni ${x.uni ? 'on' : ''}" data-uni aria-pressed="${!!x.uni}" aria-label="${t('uniT')}">L | R</button>`;
  const sore = !card && gOn('warnSore', x.exId) ? exSore(x.exId) : null;
  // 0.7.10: the top row of the card: on the left the rank badge, then the sore-muscle warning (each only if switched on); the gear stays top right. The title gets the full width below
  const rk = tf && tf.label && gOn('rank'), na = !rk && tf && tf.na && gOn('rank'), head = `<div class="extop${rk || na || sore ? ' has' : ''}"><span class="extier" data-tier>${rk ? tierBadge(tf) : na ? rankNaBadge(tf.na) : ''}${sore ? `<button type="button" class="sorewarn" data-tip="sore${i}" data-tip1="${esc(t('soreBub2', { m: ML(sore.head) }))}" data-tip2="${esc(t('soreBubH', { h: Math.ceil(sore.h) }))}" aria-label="${esc(t('soreBub2', { m: ML(sore.head) }))}">${svgIcon('warn', 20, 2.2)}</button>` : ''}</span><button type="button" class="exgear" data-exset aria-label="${t('exSettings')}">${svgIcon('settings', 20, 2)}</button></div><div class="exhead">${atAvail(x) ? `<button type="button" class="attbtn${x.attempt ? ' on' : ''}" data-attempt aria-pressed="${!!x.attempt}" aria-label="${esc(t('atBtn'))}">${ICO_TROPHY}</button>` : ''}<span class="exnrow"><b class="exname${atOn(x) ? ' gold' : ''}" data-info>${esc(exName(ex))}</b></span>
      ${tierNeed}<div class="exsub"><small class="exmeta"><span style="color:${gymInk(muCol(ex.h)) || 'inherit'}">${ML(ex.h)}</span> · <span style="color:${gymInk(EQ_COL[ex.e]) || 'inherit'}">${EL(ex.e)}</span></small>
      <div class="expills">${uniPill}${gOn('formPill', x.exId) ? `<button class="pill2" data-demo>${ICO_EYE}${t('formPill')}</button>` : ''}${card || !gOn('swapPill', x.exId) ? '' : `<button class="pill2" data-swap>${ICO_SWAP}${t('swapPill')}</button>`}</div></div></div>`;
  // 0.6.9: a suggestion line only on an exercise you're doing for the first time ("last time / try" is gone; the grey hints in the boxes stay)
  let info = '';
  if(gOn('tips') && !x.ended && sug && sug.est && !x.sets.some(s => s.done)) info = t('estNew', { w: fmt(sug.w), r: sug.r });
  let n = 0, prevVals = null, lastDone = -1; x.sets.forEach((s, j) => { if(s.done) lastDone = j; });
  // an L/R pair stays together: the newest finished pair is never compacted
  if(lastDone > 0 && x.sets[lastDone].side === 'R' && x.sets[lastDone - 1].side === 'L') lastDone--;
  const rows = x.sets.map((s, j) => {
    if(isMainSet(s)) n++;
    let ph = s.type === 'W' ? {} : prevVals ? prevVals : (sug && (!sug.first || sug.est) ? { w: sug.w, r: String(sug.r).split('-').pop() } : sug && sug.last ? { w: sug.last.top.w, r: sug.last.top.r } : {});
    if(s.type !== 'W' && (s.w !== '' || s.r !== '')) prevVals = { w: s.w || ph.w, r: s.r || ph.r };
    if(hold) ph = { ...ph, r: String((prevVals && +prevVals.r) || (sug && sug.last && +sug.last.top.r) || 30) };   // a hold: seconds, never the rep range
    if(gymBwDash(x.exId) && !(+ph.w > 0)) ph = { ...ph, w: '–' };   // bodyweight: your weight is counted for you; type only extra (belt) or assistance
    const box = k => `<div class="gymsbox"><button data-step="${k}" data-d="-1" aria-label="${t('gMinusL')}">−</button><input data-${k} inputmode="${k === 'w' ? 'decimal' : 'numeric'}" value="${s[k]}" placeholder="${ph[k] ?? (k === 'w' ? (card ? 'km' : 'kg') : (card ? 'min' : hold ? t('secLbl') : t('repsLbl')))}" aria-label="${k === 'w' ? t('kgLbl') : hold ? t('secLbl') : t('repsLbl')}"><button data-step="${k}" data-d="1" aria-label="${t('gPlusL')}">+</button></div>`;
    const ty = s.drop ? 'D' : s.type, base = s.drop ? 'D' : ty === 'N' ? n : ty, lbl = s.side ? `${base}/${s.side}` : base;
    const lastDrop = !hideM('D', x.exId) && s.drop && !(x.sets[j + 1] && x.sets[j + 1].drop) && !x.ended;
    const restHere = REST && REST.xi === i && REST.si === j, holdOn = HOLDRUN && HOLDRUN.xi === i ? HOLDRUN.si : -1;
    if(card) return cardioRow(x, s, j) + (restHere ? restBracket() : '');
    const jm = jointOn(x) && s.side && !s.skip ? Lat.mate(x, j) : -1, merge = jm === j + 1 && s.side === 'L' && !x.sets[jm].skip, mate = jm === j - 1 && s.side === 'R' && !x.sets[jm].skip;   // 0.7.9.1: one tall tick spans the L and R rows
    const xtra = extrasHtml(s, j, x.exId);   // Refinements: half reps / negatives sit right under their own hand's set, also with one tick for both hands
    // a finished set older than the newest finished one may be drawn compact when the card is at its height limit (.exc.capped); reopened rows stay full (SET_OPEN: screen state only, never saved)
    const old = s.done && j < lastDone && !SET_OPEN.has(s) ? ' old' : '';
    const sk = !!s.skip, offBtns = '';   // 0.8: no Left Only / Right Only chooser; the L | R pill is a plain on / off switch
    const bothBtn = sk ? `<div class="onesd"><button type="button" data-skip data-j="${j}">${t('bothSides')}</button></div>` : '';   // a side skipped before 0.8 can still be brought back
    return `<div class="setrow t-${ty}${holdOn === j ? ' holding' : ''}${sk ? ' skipped' : ''}${merge ? ' lmerge' : ''}${mate ? ' rmate' : ''}${atOn(x) && s.type !== 'W' ? ' attset' : ''}${old} ${s.done ? 'done' : ''} ${s.pr ? 'pr' : ''} ${s.drop ? 'drop' : ''} ${s.side ? 'pair' : ''} ${s.side === 'R' ? 'rside' : ''} ${SSNEXT && SSNEXT.xi === i && SSNEXT.si === j ? 'ssnext' : ''}" data-s="${j}">
        <button class="snum ${ty === 'N' ? 'tn' : 'tb'}" data-type aria-label="${t('tapNum')}">${lbl}</button>${box('w')}${atOn(x) && s.type !== 'W' ? '' : holdOn === j ? holdBox() : box('r')}
        <button class="sok" data-ok aria-label="${s.done ? t('setDoneL') : t('markDoneL')}"${sk ? ' disabled' : ''}>${ICO_TICK}</button></div>` + (sk ? '' : xtra) + offBtns + bothBtn +
      (lastDrop ? `<button class="adddrop" data-adddrop>${svgIcon('plus', 12, 2.6)} ${t('dropMore')}</button>` : '') + (restHere ? restBracket() : '');
  }).join('');
  return `<div class="exc open ${x.ended ? 'ended' : ''} ${sc ? 'ss' : ''}${jointOn(x) ? ' unib' : ''}" data-x="${i}"${ssStyle}>${ssl}${head}
    ${info ? `<div class="exinfo">${info}</div>` : ''}
    <div class="setlist" data-sl="${i}">${cvChip(x)}${x.sets.length && !card ? `<div class="sethead${atOn(x) ? ' attset' : ''}"><span>${t('setLbl')}</span>${x.cv && Lat.options(x).length ? `<button type="button" class="kgh" data-cv aria-label="${esc(t('cvT'))}">${t('kgLbl')}${svgIcon('chevD', 10, 2.6)}</button>` : `<span>${t('kgLbl')}</span>`}${atOn(x) ? '' : `<span>${card ? t('minLbl') : hold ? t('secLbl') : t('repsLbl')}</span>`}<span></span></div>` : ''}
    ${rows}</div>
    ${x.ended ? `<div class="exdone"><span class="exdt">${svgIcon('check', 16, 2.6)}${t('exDone')} · ${t('nSets', { n: doneN })}${card ? '' : ` · ${vol.toLocaleString()} kg`}${x.sets.some(s => s.pr === 'w') ? ' · ' + t('prWLine') : ''}${x.volPR ? ' · ' + t('prVLine') : ''}</span><button class="linkbtn" data-reopen>${t('reopenEx')}</button></div>`
      : `<div class="exfoot">${card ? '' : `<button class="newset" data-addset>${t('newSetPill')}</button>`}<button class="endex2" data-endex>${t('endExPill')}</button></div>`}</div>`;
}

// the load convention beside the weight: what the typed number means (per hand, total of both bells, bar, stack) and whether reps are counted per side
function cvText(cv, rows){ if(!cv) return ''; const k = Lat.labelKey(cv, rows); if(!k) return ''; return t(k) + (!rows && cv.rp === 'side' ? ' · ' + t('cvRepsSide') : !rows && cv.rp === 'both' && cv.n === 2 && (cv.l === 'hand' || cv.l === 'total') ? ' · ' + t('cvRepsBoth') : ''); }
function cvChip(x){ if(isCardio(x.exId) || !x.cv || !x.sets.length || !(x.cv.ask && !x.uni)) return ''; const txt = t('cvPick');
  return Lat.options(x).length ? `<button type="button" class="cvchip need" data-cv aria-label="${esc(t('cvT'))}: ${esc(txt)}"><span>${t('kgLbl')} · ${esc(txt)}</span>${svgIcon('chevD', 12, 2.6)}</button>` : `<div class="cvchip static"><span>${t('kgLbl')} · ${esc(txt)}</span></div>`; }
function openCv(xi, fromTick){ const x = active && active.exercises[xi]; if(!x || !x.cv) return; const opts = Lat.options(x), locked = x.sets.some(z => z.done) && !x.cv.ask; /* a first choice still pending can be made even after Left / Right rows were finished */
  $('cvT').textContent = t('cvT'); $('cvSub').textContent = locked ? t('cvLocked') : exName(x.exId);
  $('cvList').innerHTML = opts.map((o, i) => { const on = o.l === x.cv.l && o.n === x.cv.n && o.rp === x.cv.rp && !x.cv.ask; return `<button class="pickopt ${on ? 'on' : ''}" data-cvo="${i}" ${locked ? 'disabled' : ''}>${esc(cvText(o, !!x.uni))}${on ? `<b>${svgIcon('check', 18, 2.4)}</b>` : ''}</button>`; }).join('');
  CVX = { xi, opts }; open('ovCv'); }
let CVX = null;
// a different exercise in an untouched card: fresh sets in its own default layout (Left / Right or one row) and its own load convention
function latReset(x){ const n = Math.max(1, x.sets.filter(isMainSet).length); x.sets = Array.from({ length: n }, () => newSet()); x.uni = false; delete x.jt; cvInit(x); if(isUni(x.exId)) makeUni(x, true); }
function cvChoose(i){ if(!CVX || !active) return; const x = active.exercises[CVX.xi], o = CVX.opts[i]; if(!x || !o || (x.sets.some(z => z.done) && !x.cv.ask)) return;
  x.cv = { ...x.cv, l: o.l, n: o.n, rp: o.rp }; delete x.cv.ask; delete x.cv.pt;
  if(o.l === 'total' && x.sets.some(z => z.side)){ x.cv.l = 'hand'; x.cv.pt = 1; } /* rows are per hand; a matched pair merges back to the total */ saveG('act'); close('ovCv'); CVX = null; renderSession(); }
// typing in the Left row fills the Right row that has not been touched by hand, visibly and as you type; editing Right by hand ends that field's mirroring
function latEdited(x, j, k){ const s = x.sets[j]; if(!s || !s.side || !s.pr) return; if(s.side === 'R'){ s['t' + k] = true; return; }
  const m = Lat.mate(x, j); if(m < 0) return; const o = x.sets[m]; if(o.done || o.skip || o['t' + k]) return; o[k] = s[k];
  const xi = active.exercises.indexOf(x), el = document.querySelector(`#sesBody .exc[data-x="${xi}"] .setrow[data-s="${m}"] [data-${k}]`); if(el) el.value = s[k]; }

// rest bracket: a thin blue box under the set just finished; the outline draws in, then burns from the left to meet on the right at 0:00
function restBracket(){
  const el = (Date.now() - (REST.end - REST.total * 1000)) / 1000, first = !REST.drawn; REST.drawn = true;
  // the two fuse lines are built from the box's real width the first frame it is on screen (restFit), so they always run the whole outline
  return `<div class="rbwrap" id="rbWrap"><div class="rbk"><div class="rbglow" id="rbGlow"></div>
    <svg class="rbfuse" id="rbFuse" data-intro="${first ? 1 : ''}" width="100%" height="100%" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
    ${hourglass('hg', 22, Math.max(0, el))}<span class="rbt" id="restTxt2">${clk(Math.max(0, REST.end - Date.now()) + 999)}</span><span class="rbsp"></span>
    <div class="rbb"><button data-rs="-15" aria-label="${t('sub15')}">−</button><button data-rs="15" aria-label="${t('add15')}">+</button><button class="skip" data-rs="skip">${t('skip')}</button></div></div></div>`;
}
// where the burning tip is along the top half of the bracket (viewBox 324 × 52, corner radius 12) — the soft blue fill follows it
// 0.6.8.2: fit the fuse to the bracket's real size (any width, any rest length): top and bottom halves of a rounded box,
// both starting at the left-middle and meeting at the right-middle. Returns the length of one half, in px.
function restFit(svg){
  const W = svg.clientWidth, H = svg.clientHeight; if(!W || !H) return 0;
  if(+svg.dataset.w === W && +svg.dataset.h === H) return +svg.dataset.len;
  const r = 12, a = 1.5, m = H / 2, R = W - a, B = H - a;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const [top, bot] = svg.querySelectorAll('path');
  top.setAttribute('d', `M${a} ${m}V${a + r}Q${a} ${a} ${a + r} ${a}H${R - r}Q${R} ${a} ${R} ${a + r}V${m}`);
  bot.setAttribute('d', `M${a} ${m}V${B - r}Q${a} ${B} ${a + r} ${B}H${R - r}Q${R} ${B} ${R} ${B - r}V${m}`);
  const L = top.getTotalLength();
  [top, bot].forEach(p => p.setAttribute('stroke-dasharray', `${L} ${L}`));
  svg.dataset.w = W; svg.dataset.h = H; svg.dataset.len = L;
  if(svg.dataset.intro){ svg.dataset.intro = ''; if(!matchMedia('(prefers-reduced-motion: reduce)').matches && top.animate)
    [top, bot].forEach(p => p.animate([{ strokeDashoffset: -L }, { strokeDashoffset: 0 }], { duration: 700, easing: 'cubic-bezier(.3,.7,.3,1)' })); }
  return L;
}

// workout template editor: clear rows with labelled steppers
function drawTpl(){
  $('tpTypeShow').innerHTML = `<b>${typeLabel_(TP.type)}</b> <button class="linkbtn" id="tpTypeChg">${t('typeChange')}</button>`;
  normalizeSS(TP.exercises);
  $('tpList').innerHTML = TP.exercises.map((e, i, all) => { const ex = exById(e.exId), card = isCardio(e.exId), sc = e.ss ? ssColor(all, e.ss) : null;
    const reps = String(e.reps);
    return `<div class="tpcard ${sc ? 'ss' : ''}" data-i="${i}"${sc ? ` style="--ssc:${sc}"` : ''}>${sc ? `<div class="sslbl">${t('superset')}</div>` : ''}<div class="tph"><div class="ttl"><b class="tpname">${esc(exName(ex))}</b><small>${ML(ex.h)} · ${eqIcon(ex.e, 13)} ${EL(ex.e)}</small>${card ? '' : `<small class="tpkg">${t('tpKgNote')}</small>`}</div>
      <div class="tpb"><button data-demo2 class="pill2 formb" aria-label="${t('formBtn')}">${ICO_EYE}${t('formPill')}</button><button data-rm class="tprm" aria-label="${t('remove')}">${svgIcon('x', 18, 2)}</button></div></div>
      <div class="tpsteps"><div class="tps"><small>${t('setsL')}</small><div class="stepper"><button data-sd aria-label="${t('gMinusL')}">−</button><b>${e.sets}</b><button data-su aria-label="${t('gPlusL')}">${svgIcon('plus', 16, 2.2)}</button></div></div>
      ${card ? `<div class="tps"><small>${t('minLbl')}</small><div class="stepper"><button data-rd aria-label="${t('gMinusL')}">−</button><input data-reps value="${esc(reps)}" inputmode="numeric"><button data-ru aria-label="${t('gPlusL')}">${svgIcon('plus', 16, 2.2)}</button></div></div>`
        : `<div class="tps"><small>${t('restL')}</small><div class="stepper"><button data-rsd aria-label="${t('gMinusL')}">−</button><b>${fmtRest(rest30(e.rest))}</b><button data-rsu aria-label="${t('gPlusL')}">${svgIcon('plus', 16, 2.2)}</button></div></div>`}</div></div>`; }).join('') || `<p class="hint">${t('nothingHere')}</p>`;
  if(TP.exercises.filter(e => !isCardio(e.exId)).length > 1) $('tpList').insertAdjacentHTML('beforeend', `<p class="hint">${t('ssHint')}</p>`);
}

function openTpl(x, type){
  TP = x ? JSON.parse(JSON.stringify(x)) : { id: null, name: type ? typeLabel_(type) : '', type: type || 'full', exercises: [] };
  $('tpTitle').textContent = x && x.id ? t('editWorkout') : t('newWorkout'); $('tpName').value = TP.name; setSeg('#tpType', TP.type); $('tpType').classList.add('hide');
  $('tpDel').classList.toggle('hide', !(x && x.id)); drawTpl(); open('ovTpl');   // 0.7.4.3: a Gym Coach workout opens here unsaved (no id)
  if(!x && !type) setTimeout(() => $('tpName').focus(), 150);
}

// the workout type is worked out from its exercises
function inferType(list){
  if(!list.length) return 'full'; if(list.every(e => isCardio(e.exId))) return 'cardio';
  let up = 0, low = 0; list.forEach(e => { const mu = (exById(e.exId) || {}).mu || {}; Object.entries(mu).forEach(([h, v]) => { const g = (HEADS[h] || [])[2], r = (GROUPS[g] || [])[2]; if(r === 'up') up += v; else if(r === 'low') low += v; }); });
  const tot = up + low || 1; return low / tot >= .6 ? 'legs' : up / tot >= .75 ? 'upper' : 'full';
}

async function loadFedb(){ if(FEDB) return FEDB; let err; for(const u of FEDB_URLS){ try{ const r = await fetchT(u, {}, 20000); if(r.ok){ FEDB = await r.json(); return FEDB; } }catch(e){ err = e; } } throw err || new Error('load'); }

// Strong matches only: same equipment and the photo's name is the exercise's name (at most one extra word).
// Anything weaker shows no photo: no picture is better than a wrong one.
function demoMatches(exId){
  const ex = exById(exId), mine = tokz(ex.en).split(' ').filter(Boolean), eq = EQ_FE[ex.e]; if(!eq || !mine.length) return [];
  return FEDB.map(d => { if(d.equipment !== eq) return null; const th = tokz(d.name).split(' ').filter(Boolean), extra = th.length - mine.length;
    if(!mine.every(w => th.includes(w)) || extra > 1) return null; return { d, s: -extra }; })
    .filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.d);
}

// the photos to offer for one exercise: our hand-picked one (or none), else a strong guess; the user's own pick wins, "Wrong Photo?" hides it
function demoList(exId){
  const saved = (ui.demoPick || {})[exId], mine = saved && FEDB.find(z => z.id === saved);
  const hasPick = Object.prototype.hasOwnProperty.call(FORM_PICK, exId), pick = hasPick && FORM_PICK[exId] && FEDB.find(z => z.id === FORM_PICK[exId]);
  let list = hasPick ? (pick ? [pick] : []) : demoMatches(exId);
  if((ui.formWrong || {})[exId]) list = [];
  if(mine) list = [mine].concat(list.filter(d => d.id !== mine.id));
  return list;
}

// ---------- Form page (canvas Gym.dc.html): crossfading photos · How to do it + Common mistakes · fixed muscle map ----------
async function openDemo(exId){
  DEMO.exId = exId; clearInterval(DEMO.timer); const x = exById(exId), L_ = lang === 'el' ? 1 : 0;
  $('dmTitle').textContent = exName(exId); $('dmNext').classList.add('hide'); $('dmWrong').classList.add('hide');
  $('dmPhoto').innerHTML = `<span class="fpcap">${t('formLoading')}</span>`;
  const steps = (CUES[x.p] || []).map(c => c[L_]).concat(SPECIFIC[exId] ? [SPECIFIC[exId][L_]] : []), errs = (MISTAKES[x.p] || []).map(c => c[L_]);
  const left = `<div class="fpl">${steps.length || lang !== 'el' ? `<div class="fpblk"><b class="fph">${svgIcon('check', 16, 2.4)}${t('howTo')}</b><ol id="dmSteps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
    ${errs.length ? `<div class="fpblk"><b class="fph warn">${svgIcon('warn', 16, 2.2)}${t('mistakesT')}</b><ul class="fpx">${errs.map(s => `<li><span class="xred">${svgIcon('x', 14, 2.6)}</span>${esc(s)}</li>`).join('')}</ul></div>` : ''}</div>`;
  const map = isCardio(exId) ? '' : `<div class="fpr"><div class="fpsw"><span>${t('formPct')}</span><button class="switch ${ui.formPct === false ? '' : 'on'}" id="dmPct" type="button" role="switch" aria-checked="${ui.formPct !== false}" aria-label="${t('formPct')}"><i></i></button></div>
    <div class="fpstage bodymap" id="fmStage"></div></div>`;
  $('dmBody').classList.toggle('one', !map); $('dmBody').innerHTML = left + map;
  open('ovDemo');
  if(map) requestAnimationFrame(() => formMap(exId));
  try{ await loadFedb(); }catch(e){ $('dmPhoto').innerHTML = `<span class="fpcap">${t('formFail')}</span>`; return; }
  if(DEMO.exId !== exId) return;
  DEMO.list = demoList(exId); DEMO.i = 0; drawDemo();
}

function drawDemo(){
  clearInterval(DEMO.timer); const d = DEMO.list[DEMO.i];
  if(!d){ $('dmPhoto').innerHTML = `<span class="fpcap">${t('formNone')}</span>`; $('dmNext').classList.add('hide'); $('dmWrong').classList.add('hide'); return; }
  $('dmNext').classList.toggle('hide', DEMO.list.length < 2); $('dmWrong').classList.remove('hide');
  const imgs = (d.images || []).map(FEDB_IMG);
  $('dmPhoto').innerHTML = imgs.map((u, i) => `<img src="${u}" alt="" class="${i ? '' : 'on'}" loading="eager">`).join('') +
    (imgs.length > 1 ? `<span class="fpdots">${imgs.map((u, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</span>` : '');
  // our own short steps come first; the photo set's (English) steps fill in when we have none, in English only
  const ol = $('dmSteps'); if(ol && !ol.children.length && lang !== 'el') ol.innerHTML = (d.instructions || []).slice(0, 5).map(s => `<li>${esc(s)}</li>`).join('');
  if(imgs.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let k = 0; DEMO.timer = setInterval(() => { const ph = $('dmPhoto'); if(!$('ovDemo').classList.contains('open')){ clearInterval(DEMO.timer); return; }
    k = (k + 1) % imgs.length; ph.querySelectorAll('img').forEach((x, j) => x.classList.toggle('on', j === k)); ph.querySelectorAll('.fpdots i').forEach((x, j) => x.classList.toggle('on', j === k)); }, 2000);
}

// 0.7.1: the muscle map is fixed (no pinch, drag or double-tap): one side of the body fitted onto the working heads,
// with a leader line and % for EVERY working muscle. The stage grows taller when there are many labels.
const FM = { s: 1, x: 0, y: 0 };
function formMap(exId){
  const st = $('fmStage'); if(!st) return; const x = exById(exId), mu = x.mu || {}, fem = profile.sex === 'f';
  const sideHeads = sd => fem ? new Set(ANAT[sd].map(a => a[0])) : gymBmSides[sd];
  const sideSum = sd => [...sideHeads(sd)].reduce((s, h) => s + (mu[h] || 0), 0), side = sideSum('b') > sideSum('f') ? 'b' : 'f';
  const pts = {}, nums = d => d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  if(fem) ANAT[side].forEach(([h, d]) => { if(!(mu[h] > 0)) return; const a = nums(d);
    for(let i = 0; i + 1 < a.length; i += 2) (pts[h] = pts[h] || []).push([200 - femX(a[i], a[i + 1]), a[i + 1]]); });   // the mirrored (right-hand) copy, so lines run right
  else GYM_BM[side].mus.forEach(([k, d]) => { const a = nums(d), p = []; for(let i = 0; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]);
    if(p.reduce((s, q) => s + q[0], 0) / p.length < 100) return;   // only the right-hand copy, so lines run right
    GYM_BM_HEADS[k].forEach(h => { if(mu[h] > 0) (pts[h] = pts[h] || []).push(...p); }); });
  const heads = Object.keys(pts).map(h => { const p = pts[h], xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    return { h, v: mu[h], ax: xs.reduce((a, b) => a + b, 0) / xs.length, ay: ys.reduce((a, b) => a + b, 0) / ys.length, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; })
    .sort((a, b) => b.v - a.v);
  const W = st.clientWidth || 163, H = Math.max(300, heads.length * 36 + 30), BW = Math.round(W * .55);
  const max = Math.max(...Object.values(mu), 1);
  st.innerHTML = `<svg id="fmSvg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(heads.map(z => ML(z.h) + ' ' + Math.round(z.v) + '%').join(', '))}">
    <defs><clipPath id="fmClip"><rect x="0" y="0" width="${BW}" height="${H}"/></clipPath></defs>
    <g clip-path="url(#fmClip)"><g id="fmBody">${anatomySVG({ mode: 'mu', mu, muMax: max, side, w: 200, h: 446, idp: 'fm', labels: false })}</g></g><g id="fmLbl" style="transition:opacity .25s;opacity:${ui.formPct === false ? 0 : 1}"></g></svg>`;
  const bx0 = heads.length ? Math.min(...heads.map(z => z.x0)) : 100, bx1 = heads.length ? Math.max(...heads.map(z => z.x1)) : 200,
    by0 = heads.length ? Math.min(...heads.map(z => z.y0)) : 60, by1 = heads.length ? Math.max(...heads.map(z => z.y1)) : 300;
  const s0 = Math.max(.6, Math.min(3.5, BW * .9 / Math.max(20, bx1 - bx0), H * .85 / Math.max(20, by1 - by0)));
  Object.assign(FM, { st, W, H, BW, heads, s: s0, x: BW / 2 - s0 * (bx0 + bx1) / 2, y: H / 2 - s0 * (by0 + by1) / 2 }); fmApply();
}
function fmApply(){
  const b = $('fmBody'); if(!b) return; b.setAttribute('transform', `translate(${FM.x.toFixed(2)} ${FM.y.toFixed(2)}) scale(${FM.s.toFixed(4)})`);
  const show = FM.heads.map(h => ({ ...h, sx: Math.min(FM.BW - 4, Math.max(4, FM.x + FM.s * h.ax)), sy: Math.min(FM.H - 4, Math.max(4, FM.y + FM.s * h.ay)) })).sort((a, b) => a.sy - b.sy);
  const gap = 36, ys = []; show.forEach((h, i) => ys.push(Math.max(i ? ys[i - 1] + gap : 22, Math.min(FM.H - 12, h.sy))));
  for(let i = ys.length - 1; i >= 0; i--){ const lim = (i === ys.length - 1 ? FM.H - 12 : ys[i + 1] - gap); if(ys[i] > lim) ys[i] = lim; }
  const lx = FM.BW + 6, top = FM.heads[0] && FM.heads[0].h;
  $('fmLbl').innerHTML = show.map((h, i) => `<path d="M${h.sx.toFixed(1)} ${h.sy.toFixed(1)}L${lx - 2} ${(ys[i] - 4).toFixed(1)}" stroke="var(--t-muted)" stroke-width="1" fill="none"/><circle cx="${h.sx.toFixed(1)}" cy="${h.sy.toFixed(1)}" r="2" fill="var(--t-text)"/>
    <text x="${lx}" y="${(ys[i] - 8).toFixed(1)}" font-size="12" fill="var(--t-muted)">${esc(ML(h.h))}</text><text x="${lx}" y="${(ys[i] + 9).toFixed(1)}" font-size="15" font-weight="700" font-style="italic" fill="${h.h === top ? 'var(--t-accent)' : 'var(--t-text)'}">${Math.round(h.v)}%</text>`).join('');
}

// keep (V27 picker): adding from here leaves the picker open (it shows the add itself, with Undo)
function openExInfo(id, addCb, keep){
  const x = exById(id);
  if(x.custom){ exInfoCustom(x, addCb, keep); return; }
  const mus = Object.entries(x.mu).sort((a, b) => b[1] - a[1]), L_ = lang === 'el' ? 1 : 0;
  const cues = (CUES[x.p] || []).map(c => c[L_]).concat(SPECIFIC[id] ? [SPECIFIC[id][L_]] : []), errs = (MISTAKES[x.p] || []).map(c => c[L_]);
  const h = exHistory(id), bestW = h.length ? Math.max(...h.flatMap(s => s.sets.map(z => +z.w))) : null, bestV = h.length ? Math.max(...h.map(s => exVol(id, s.sets.map(z => ({ ...z, done: true })), s.cv))) : null;
  $('eiBody').innerHTML = `<div class="row" style="align-items:center;justify-content:flex-start;gap:12px"><div><h2 style="margin:0">${esc(exName(x))}</h2><small class="rmeta">${EL(x.e)} · ${ML(x.m)}</small></div><button type="button" class="pill2 formb eiform" id="eiForm" aria-label="${t('formT')}">${ICO_EYE}${t('formPill')}</button></div>
    ${h.length ? `<p class="rmeta" style="margin:10px 0 0">${t('bestW')}: <b>${fmt(bestW)} kg</b> · ${t('bestV')}: <b>${Math.round(bestV).toLocaleString()} kg</b></p>` : ''}
    ${isCardio(id) ? '' : `<div class="eimap">${raExerciseSVG(x.mu, { sex: recSex(), colours: HEAD_COL, idPrefix: 'ei', maxWidth: 340 })}</div>`}
    ${isCardio(id) ? '' : `<button class="foldh" type="button" id="eiMoreB" aria-expanded="false"><b>${t('eiMore')}</b><i>${svgIcon('down', 18, 2)}</i></button>`}
    <div id="eiMore" class="${isCardio(id) ? '' : 'hide'}"><h3>${t('musclesWorked')}</h3>${mus.map(([k, v]) => `<div class="mrow"><small>${esc(ML(k))}</small><span class="mbar"><i style="width:${v}%;background:${(GROUPS[HEADS[k] ? HEADS[k][2] : 'other'] || GROUPS.other)[3]}"></i></span><b>${v}%</b></div>`).join('')}
    <p class="hint">${t('pctNote')}</p>
    ${cues.length ? `<h3 class="fph">${svgIcon('check', 16, 2.4)}${t('howTo')}</h3><ul class="feed">${cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${errs.length ? `<h3 class="fph warn">${svgIcon('warn', 16, 2.2)}${t('mistakesT')}</h3><ul class="feed fpx">${errs.map(c => `<li><span class="xred">${svgIcon('x', 14, 2.6)}</span>${esc(c)}</li>`).join('')}</ul>` : ''}</div>`;
  const mb = $('eiMoreB'); if(mb) mb.onclick = () => { const o = $('eiMore').classList.toggle('hide'); mb.classList.toggle('open', !o); mb.setAttribute('aria-expanded', String(!o)); };
  $('eiAdd').classList.toggle('hide', !addCb);
  $('eiAdd').onclick = () => { close('ovExInfo'); if(!keep) close('ovExPick'); addCb && addCb(id); };
  $('eiForm').onclick = () => openDemo(id);
  open('ovExInfo');
}
// your own exercise: the muscles you chose (no percentages: there are none), its settings, no rank, and its QR code to share it
function exInfoCustom(x, addCb, keep){
  const s = cxSpec(x), lit = Object.fromEntries(Object.keys(x.mu || {}).map(h => [h, 100])), uni = isUni(x.id);
  $('eiBody').innerHTML = `<div class="cxinfo"><h2 style="margin:0">${esc(exName(x))}</h2><small class="rmeta">${esc(exTitle(EL(x.e)))} · ${esc(t(uni ? 'cxEachSide' : 'cxBothSides'))}</small>
    <div class="eimap">${raExerciseSVG(lit, { sex: recSex(), colours: HEAD_COL, idPrefix: 'eic', maxWidth: 340 })}</div>
    <div class="cxchips">${s.mus.map((m, i) => `<span class="cxchip" style="--pc:${exmCol(m)}"><i aria-hidden="true"></i>${esc(pkName(m))}${i ? '' : `<small>${esc(t('cxPrimary'))}</small>`}</span>`).join('')}${s.heads.map(h => `<span class="cxchip" style="--pc:${HEAD_COL[h]}"><i aria-hidden="true"></i>${esc(pkName(h))}</span>`).join('')}</div>
    <div class="cxpol"><span class="cxpi no" aria-hidden="true">${svgIcon('x', 15, 2.6)}</span><div><b>${esc(t('cxNoRank'))}</b><p>${esc(t('cxNoRankSub'))}</p></div></div>
    <div class="cxpol"><span class="cxpi" aria-hidden="true">${gymIco('clock', 16, 2.2)}</span><div><b>${esc(t('cxRecT'))}</b><p>${esc(t('cxRecSub'))}</p></div></div>
    <button type="button" class="btn cxshare" id="eiShare">${gymIco('qr', 18, 2)}<span>${esc(t('cxShareQR'))}</span></button></div>`;
  $('eiShare').onclick = () => openCxQR(x.id);
  $('eiAdd').classList.toggle('hide', !addCb);
  $('eiAdd').onclick = () => { close('ovExInfo'); if(!keep) close('ovExPick'); addCb && addCb(x.id); };
  open('ovExInfo');
}

// ---------- 0.8 (24 Nov): the Gym Buddy home is a bento grid ----------
// Workouts (left, top) · Progress (left, below) · RECOVERY+ (right, tall) · Week Planner (full width). Start Workout is the floating pill.
// Read-only over tpls, sessions, gymPlan; the rotating Progress stat is picked once per visit (never the same as last time: ui.gpStat).
const GH_MAIN = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps'];
const ghKey = h => { const g = HEADS[h] && HEADS[h][2]; return !g || g === 'cardio' || g === 'other' ? null : g === 'arms' || g === 'core' ? h : g; };
// sets × each muscle's share of the exercise, over every exercise of every saved workout
function ghMuscleSets(){ const tot = {};
  (tpls || []).forEach(tp => (tp.exercises || []).forEach(x => { const n = +x.sets || 0; if(!n || isCardio(x.exId)) return; const mu = exById(x.exId).mu || {};
    const sum = Object.values(mu).reduce((a, b) => a + (+b || 0), 0); if(!sum) return;
    Object.keys(mu).forEach(h => { const k = ghKey(h); if(k) tot[k] = (tot[k] || 0) + n * (+mu[h] || 0) / sum; }); }));
  return tot; }
// weekly training volume (kg) of the last 8 weeks, Monday to Sunday, oldest first
function ghWeekVol(){ const w0 = Streak.monday(todayKey()), out = Array(8).fill(0);
  sessions.forEach(s => { const d = s.date || String(s.start || '').slice(0, 10); if(!d) return;
    const k = 7 + Math.round((new Date(Streak.monday(d) + 'T12:00:00') - new Date(w0 + 'T12:00:00')) / 6048e5); if(k >= 0 && k < 8) out[k] += +s.vol || 0; });
  return out; }
function ghStats(){ const out = [], wv = ghWeekVol(), a = wv.slice(0, 4).reduce((x, y) => x + y, 0), b = wv.slice(4).reduce((x, y) => x + y, 0);
  // trend colour: green = better, grey = steady (within 3 %), red = worse
  const vp = a > 0 && b > 0 ? (b / a - 1) * 100 : 0, vdir = vp >= 3 ? 'up' : vp <= -3 ? 'down' : 'flat';
  if(a > 0 && b > 0) out.push({ key: 'vol', num: sbmPct(vp), sub: t('ghVol'), dir: vdir });
  const done = sessions.slice().sort((x, y) => String(y.start).localeCompare(String(x.start)));
  for(const s of done){ const pr = (s.prs || []).filter(p => p.kind === 'w' && +p.w > 0).pop(); if(pr){ out.push({ key: 'pr', dir: 'up', num: `${fmt(bwOut(pr.w))} ${bwU()}`, sub: t('ghPr', { n: exName(pr.exId), r: pr.r }) }); break; } }
  let best = null; sessions.forEach(s => (s.exercises || []).forEach(x => { if(isCardio(x.exId) || exById(x.exId).e === 'bodyweight') return;
    (x.sets || []).forEach(st => { if(st.done === false || st.warm) return; const w = +st.w || 0; if(w > 0 && (!best || w > best.w)) best = { w, r: +st.r || 0, id: x.exId }; }); }));
  if(best) out.push({ key: 'best', dir: 'up', num: `${fmt(bwOut(best.w))} ${bwU()}`, sub: t('ghBest', { n: exName(best.id), r: best.r }) });
  if(sessions.length >= GH_MIN){ const m = sbmMuscles().map(sbmStat).filter(x => x && x.pct !== undefined && x.pct > 0).sort((x, y) => y.pct - x.pct)[0];
    if(m) out.push({ key: 'mus', dir: 'up', num: sbmPct(m.pct), sub: t('ghMus', { n: m.name }) }); }
  return { out, wv, vdir }; }
let GH_STAT = null;
const GH_MIN = 8;   // Progress shows its stats and curve only once this many workouts are done (a message counts up until then)
function ghPick(list, fresh){
  if(!fresh && GH_STAT && list.some(x => x.key === GH_STAT)) return list.find(x => x.key === GH_STAT);
  const pool = list.length > 1 ? list.filter(x => x.key !== ui.gpStat) : list, pick = pool[Math.floor(Math.random() * pool.length)];
  GH_STAT = pick ? pick.key : null; if(pick && ui.gpStat !== pick.key){ ui.gpStat = pick.key; saveUI(); } return pick; }
// the 8-week volume as a smooth wave with a light fill under it: the in-between weeks are softened a little (a week's jump is
// spread over its neighbours) and drawn as one flowing curve whose bends never poke above the top or below the floor of the box
function ghLine(wv){ const W = 142, H = 44, n = wv.length, sm = wv.map((v, i) => i === 0 || i === n - 1 ? v : (wv[i - 1] + 2 * v + wv[i + 1]) / 4);
  const mx = Math.max(...sm), lo = Math.min(...sm), rng = mx - lo || 1, top = 4, bot = H - 4;
  const P = sm.map((v, i) => [W * i / (n - 1), mx ? top + (bot - top) * (1 - (v - lo) / rng) : bot]), f = x => x.toFixed(1), cl = y => Math.min(bot, Math.max(top, y));
  let c = `M${f(P[0][0])},${f(P[0][1])}`;
  for(let i = 0; i < n - 1; i++){ const a = P[Math.max(0, i - 1)], b = P[i], e = P[i + 1], g = P[Math.min(n - 1, i + 2)];
    c += `C${f(b[0] + (e[0] - a[0]) / 6)},${f(cl(b[1] + (e[1] - a[1]) / 6))} ${f(e[0] - (g[0] - b[0]) / 6)},${f(cl(e[1] - (g[1] - b[1]) / 6))} ${f(e[0])},${f(e[1])}`; }
  const L = P[n - 1];
  return `<svg class="ghline" viewBox="-5 0 ${W + 10} ${H}" aria-hidden="true"><path d="${c}L${W},${H - 0.5}L0,${H - 0.5}Z" class="ar"/><line x1="0" x2="${W}" y1="${H - 0.5}" y2="${H - 0.5}" class="base"/><path d="${c}" class="ln"/><circle cx="${f(L[0])}" cy="${f(L[1])}" r="4" class="dot"/></svg>`; }
const ghHead = (ic, key, right) => `<div class="bth">${ic ? `<span class="btic">${svgIcon(ic, 18, 2)}</span>` : ''}<b>${esc(t(key))}</b>${right ? `<span class="btr">${right}</span>` : ''}</div>`;
function renderGymHub(fresh){
  if(!$('ghLib')) return;
  // Workouts: which muscles your saved workouts train most
  { const tot = ghMuscleSets(), keys = Object.keys(tot).sort((a, b) => tot[b] - tot[a]), top = keys.slice(0, 4), mx = top.length ? tot[top[0]] : 1;
    const low = GH_MAIN.filter(k => !top.includes(k)).sort((a, b) => (tot[a] || 0) - (tot[b] || 0))[0];
    setHTML($('ghLib'), ghHead('workouts', 'hubLib') + (top.length ? `<small class="btsub">${esc(t('ghMost'))}</small><div class="btbars">${top.map((k, i) => `<div class="btbar${i ? '' : ' acc'}"><span><em>${esc(ML(k))}</em><b>${Math.round(tot[k])}</b></span><i><u style="transform:scaleX(${(tot[k] / mx).toFixed(3)})"></u></i></div>`).join('')}</div>
      ${low && top.length >= 2 ? `<em class="btlow">${esc(t('ghLow', { n: ML(low), v: Math.round(tot[low] || 0) }))}</em>` : ''}` : `<p class="btempty">${esc(t('ghNoTpl'))}</p>`)); }
  // Progress: one rotating stat + the 8-week volume line
  { const ok = sessions.length >= GH_MIN, st = ok ? ghStats() : { out: [], wv: [] }, s = ok ? ghPick(st.out, fresh) : null;
    setHTML($('ghProg'), ghHead('progress', 'hubProg') + (s ? `<div class="btstat big ${s.dir || 'flat'}"><b>${esc(s.num)}</b><span>${esc(s.sub)}</span></div>` : `<p class="btempty">${esc(ok ? t('ghNoStat') : t('ghNoSes', { n: GH_MIN, d: Math.min(sessions.length, GH_MIN) }))}</p>`) +
      (ok ? `<div class="ghvol ${st.vdir}">${ghLine(st.wv)}<small class="btsub">${esc(t('ghVol8'))}</small></div>` : '')); }
  // RECOVERY+: only the body, front and back, sliding every 9 s
  { const rr = RecoveryPlus.compute(), col = recHeadColors(rr.tr), fig = v => recoveryAnatomySVG({ sex: recSex(), view: v, colorsByHead: col, idPrefix: 'gh' + v, maxWidth: 150 });
    const side = GH_REC.side, key = JSON.stringify(col) + recSex() + lang;
    if($('ghRec')._k !== key){ $('ghRec')._k = key; $('ghRec').innerHTML = ghHead('bolt', 'hubRec') + `<div class="ghfigs"><div class="ghfig${side ? ' off' : ''}" data-v="front">${fig('front')}</div><div class="ghfig${side ? '' : ' off'}" data-v="back">${fig('back')}</div></div><div class="ghdots" aria-hidden="true"><i class="${side ? '' : 'on'}"></i><i class="${side ? 'on' : ''}"></i></div>`; }
    $('ghRec').setAttribute('aria-label', t('hubRec')); pauseOffscreen($('ghRec')); if(!GH_REC.tm) ghRecArm(); }
  renderGymWeek();
  // the grid ends 3 px above the Start Workout pill (its place depends on the phone's safe area, so it is measured, once per draw)
  { const fab = $('fab'), pg = $('pgGym'); if(fab && !fab.classList.contains('hide')){ const top = fab.getBoundingClientRect().top; if(top > 0) pg.style.setProperty('--fabclear', Math.round(pg.clientHeight - top + 3) + 'px'); } }
  [['ghLib', 'hubLib'], ['ghProg', 'hubProg'], ['ghWeek', 'hubWeek']].forEach(([id, k]) => $(id).setAttribute('aria-label', t(k)));
  bentoFit('pgGym', 'gBento');
  if(fresh) bentoRise($('gBento'));
}
// Week Planner: Mon … Sun pills (done = green tick, today = accent ring, gym day = raised grey with the gym icon, rest = dark with a dash)
function renderGymWeek(){
  const tk = todayKey(), twd = new Date(tk + 'T12:00:00').getDay(), monday = addDays(tk, -((twd + 6) % 7)), adv = !!ui.wpAdv, wd = t('wdShort').split(' ');
  let n = 0;
  const pills = [1, 2, 3, 4, 5, 6, 0].map((d, i) => { const p = gymPlan[d] || {}, date = addDays(monday, i), done = sessions.some(s => s.date === date), gym = !!p.tpl && p.tpl !== 'rest', today = d === twd;
    if(gym || done) n++;
    const tp = gym && p.tpl !== 'gym' ? tpls.find(x => x.id === p.tpl) : null, lab = !gym && !done ? t('restDayS') : adv ? (tp ? tp.name : t('gymL')) : t('gymL');
    const ic = done ? svgIcon('check', 18, 3) : gym ? svgIcon('workouts', 18, 2) : '<u></u>';
    return `<span class="wpd ${done ? 'done' : gym ? 'gym' : 'rest'}${today ? ' today' : ''}"><small>${esc((wd[d] || '').charAt(0))}</small><i>${ic}</i><em>${esc(lab)}</em></span>`; }).join('');
  pauseOffscreen($('ghWeek'));
  if(!setHTML($('ghWeek'), ghHead('calendar', 'hubWeek', `${esc(t('ghTotal'))} <b>${n}</b>`) + `<div class="wpdays">${pills}</div>`)) return;   // unchanged: the ticker keeps running
}
// the RECOVERY+ tile switches sides every 9 s: the body slides out to the left and fades; only when it is almost gone does the other side fade in from the right (never one pushing the other).
// Only while the Gym home shows and the app is visible; Reduce Motion = no automatic switch.
const GH_REC = { side: 0, tm: 0 };
function ghRecStop(){ clearTimeout(GH_REC.tm); GH_REC.tm = 0; }
function ghRecArm(){ ghRecStop(); if(matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) return; GH_REC.tm = setTimeout(ghRecFlip, 9000); }
function ghRecFlip(){ GH_REC.tm = 0; const box = $('ghRec'); if(!box || document.hidden || box.offsetParent === null || $('gHub').classList.contains('hide')) return;
  if(box.classList.contains('offscr')){ ghRecArm(); return; }   // scrolled out of view: wait, no slide
  const figs = box.querySelectorAll('.ghfig'); if(figs.length < 2) return; const from = figs[GH_REC.side], to = figs[1 - GH_REC.side], dir = GH_REC.side ? -1 : 1;
  GH_REC.side = 1 - GH_REC.side; box.querySelectorAll('.ghdots i').forEach((d, i) => d.classList.toggle('on', i === GH_REC.side));
  const OUT = 900, IN = 1000, GAP = OUT * .8;   // the new side starts when the old one is ~80 % gone
  from.animate([{ transform: 'translate3d(0,0,0)', opacity: 1 }, { transform: `translate3d(${-dir * 60}%,0,0)`, opacity: 0 }], { duration: OUT, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).onfinish = () => { from.classList.add('off'); from.getAnimations().forEach(a => a.cancel()); };
  to.style.opacity = '0'; to.classList.remove('off');
  to.animate([{ transform: `translate3d(${dir * 60}%,0,0)`, opacity: 0 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { duration: IN, delay: GAP, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).onfinish = () => { to.style.opacity = ''; to.getAnimations().forEach(a => a.cancel()); };
  ghRecArm(); }
document.addEventListener('visibilitychange', () => { if(document.hidden) ghRecStop(); else if($('ghRec') && !$('gHub').classList.contains('hide') && !$('pgGym').classList.contains('hide')) ghRecArm(); });

function renderGym(){
  const h = location.hash.slice(1), sec = GSEC[h] || null;
  $('gHub').classList.toggle('hide', !!sec);
  $('gBackBtn').classList.toggle('hide', !sec);
  $('gTabs').classList.toggle('hide', !sec);   // Refinements: Recovery is in the carousel too
  if(sec && typeof GYM_CAR === 'object') GYM_CAR.set(h);
  // 0.7.4.0.5: the section name is the page title (no second title under the header)
  $('pgGym').querySelector('header h1').textContent = t(sec ? { plan: 'hubWeek', tpl: 'hubLib', prog: 'hubProg', rec: 'hubRec' }[sec] : 'tabGym');
  ['plan', 'tpl', 'prog', 'rec'].forEach(k => $({ plan: 'gPlanV', tpl: 'gTplV', prog: 'gProgV', rec: 'gRecV' }[k]).classList.toggle('hide', sec !== k));
  $('gWeigh').classList.toggle('hide', sec !== 'prog'); if(sec === 'prog' && typeof drawWeigh === 'function') drawWeigh();   // 0.5.9: weigh-in lives in Progress
  const today = planFor(todayKey()), tp = today && today.tpl && tpls.find(x => x.id === today.tpl);
  $('gStart').textContent = active ? t('resume', { m: Math.floor((Date.now() - new Date(active.start)) / 60000) }) : tp ? t('startToday', { n: tp.name }) : t('startAny');
  $('gStart').classList.toggle('hide', !!sec);   // 0.6.1: no Start button inside the Library
  const gap = gapDays(), cb = comebackFactor();
  $('gBanner').innerHTML = sec ? '' : cb < 1 ? `<div class="alert" style="cursor:default">${t('cbActive', { k: sessions.filter(s => s.start > comeback.at).length + 1, p: Math.round(cb * 100) })}</div>`
    : gap !== null && gap >= 14 && !active ? `<div class="alert" style="display:block;cursor:default"><b>${t('breakT', { n: gap })}</b><br><small>${t('breakTxt', { p: Math.round(cbBase(gap) * 100), s: Math.ceil((1 - cbBase(gap)) / .05) + 1 })}</small></div>` : '';
  hubHead('pgGym', 'gDate', !sec);   // 0.8: bento home header (ui.js)
  { const shown = !$('pgGym').classList.contains('hide'), st = !sec && shown ? 'hub' : 'away', fresh = st === 'hub' && renderGym.st !== 'hub'; renderGym.st = st;
    if(st === 'hub') renderGymHub(fresh); else ghRecStop(); }   // drawn only while it shows (renderAll runs on every page)
  renderGymPlan(); renderTpls(); renderProgress(); if(sec === 'rec') renderRecovery();
  $('gOther').classList.toggle('hide', !sec || !!active || !tp || $('gStart').classList.contains('hide'));   // 0.8: the home has only the Start Workout pill
}

// ---------- Workout Done ----------
// Refinements #8 change 20A: the Gym Coach's recovery line. ONE AI call per finished workout, started the moment the workout is saved
// (finishWorkout), so it never waits for the Rank Up screens. The call is the same as before (aiRecovery: it also refines the hours, as it
// always did); it now returns one short sentence written from those same final hours. The sentence is saved with the workout
// (ses.recovNote + recovAI); ses.recovTried means it was asked once, so reopening the summary never asks again.
// No sentence (no key, offline, slow, failed): no card at all, the summary looks complete without it.
const REC_AI = {}, REC_SLOW = 25000;   // workout id → the call in flight; after REC_SLOW the card goes away (a late answer is still saved)
function startRecLine(ses){
  if(!AI.hasKey() || ses.recovTried || ses.recovAI || navigator.onLine === false || !Object.keys(ses.recovEst || {}).length) return;
  ses.recovTried = 1; saveG('ses');
  const p = aiRecovery(ses).then(res => { if(!res) return null; const s = sessions.find(x => x.id === ses.id) || ses;
      if(res.note){ s.recovAI = true; s.recovNote = res.note; saveG('ses'); renderAll(); } return res.note || null; })   // RECOVERY+: the AI explains; its hours are never saved over the estimate
    .catch(() => null).then(note => { delete REC_AI[ses.id]; recLanded(ses.id, note); return note; });
  REC_AI[ses.id] = p; setTimeout(() => { if(REC_AI[ses.id] === p) recLanded(ses.id, null); }, REC_SLOW);
}
// the card: the sweatband robot on the left (thinking while the call runs), the line beside it
function recCard(ses){ const wait = !ses.recovNote && !!REC_AI[ses.id]; if(!ses.recovNote && !wait) return '';
  return `<div class="smrec${wait ? ' wait' : ''}" id="smRec" data-ses="${esc(ses.id)}"><span class="smrecbot">${AI.robot('gym', 40, wait)}</span><p class="smrectx">${ses.recovNote ? esc(ses.recovNote) : ''}</p></div>`; }
function recLanded(id, note){ const el = $('smRec'); if(!el || el.dataset.ses !== id || !el.classList.contains('wait')) return;
  if(!note){ el.classList.add('gone'); setTimeout(() => el.remove(), 260); return; }
  el.querySelector('.smrecbot').innerHTML = AI.robot('gym', 40); el.querySelector('.smrectx').textContent = note; el.classList.remove('wait'); el.classList.add('in'); }
// Refinements #8 change 23: the rank ups of this workout (saved with it as ses.rankUps), old plate → new plate, one row each
function rankUpCard(ses){ const L = Array.isArray(ses.rankUps) ? ses.rankUps : []; if(!L.length) return '';
  const plate = n => rankIcon(TIERS[Math.floor(n / 3)], n, 30);
  return `<h3><span class="ric">${svgIcon('medal', 16, 2)}</span>${esc(t(L.length === 1 ? 'smRankUp1' : 'smRankUps'))}</h3><div class="smranks">${L.map(c =>
    `<div class="smrank tr-${TIERS[Math.floor(c.to / 3)]}"><b>${esc(exName(c.exId))}</b><span class="smrk">${c.from == null ? '' : `<span class="smold">${plate(c.from)}</span>${svgIcon('chevR', 14, 2.4)}`}${plate(c.to)}<small>${esc(tierName(c.to))}</small></span></div>`).join('')}</div>`; }
let SM_SES = null;
function showSummary(ses){
  const tg = targetFor(ses.date), wins = carbWindows(ses.date), post = wins.find(w => w.k === 'winPost');
  $('smBody').innerHTML = `<h2>${t('smTitle')}</h2><p class="sub">${esc(ses.name)} · ${fmtDate(ses.start)}</p>
    <div class="statgrid"><div><b>${ses.mins}</b><small>${t('smDur')}</small></div><div><b>${ses.vol.toLocaleString()}</b><small>${t('smVol')}</small></div>
      <div><b>${ses.exercises.reduce((a, x) => a + x.sets.filter(isMainSet).length, 0)}</b><small>${t('smSets')}</small></div><div><b>≈${ses.kcal}</b><small>${t('smKcal')}</small></div></div>
    ${recCard(ses)}${rankUpCard(ses)}
    <h3><span class="ric">${svgIcon('podium', 16, 2)}</span>${t('smPRs')}</h3>${ses.prs.length ? `<ul class="feed">${ses.prs.slice().sort((a, b) => (b.kind === 'v') - (a.kind === 'v')).map(p => p.kind === 'v' ? `<li class="prv"><span class="ric">${svgIcon('trend', 16, 2.2)}</span>${t('prVLine')} · ${esc(exName(p.exId))}: <b>${p.vol.toLocaleString()} kg</b> <small class="rmeta">(${t('prWas', { v: p.prev.toLocaleString() })})</small></li>`
      : p.kind === 't' || p.kind === 'd' ? `<li class="prw"><span class="ric">${svgIcon('medal', 16, 2)}</span>${t(p.kind === 't' ? 'prTLine' : 'prDLine')} · ${esc(exName(p.exId))}: <b>${fmt(p.v)} ${p.kind === 't' ? 'min' : 'km'}</b></li>` : p.kind === 'w' ? `<li class="prw"><span class="ric">${svgIcon('medal', 16, 2)}</span>${t('prWLine')} · ${esc(exName(p.exId))}: <b>${fmt(p.w)} kg × ${p.r}</b></li>` : `<li>${esc(exName(p.exId))}: <b>${fmt(p.w)} × ${p.r}</b></li>`).join('')}</ul>` : `<p class="hint">${t('smNoPR')}</p>`}
    ${tg && post ? `<div class="alert green" style="cursor:default">${t('smFood', { t: fmtClock(fromMin(post.b + 1)), c: Math.round(post.c) })}</div>` : ''}
    ${!ses.tplId && ses.exercises.some(x => !isCardio(x.exId)) ? `<button type="button" class="btn smtpl" data-smtpl>${svgIcon('plus', 16, 2.4)} ${t('smSaveTpl')}</button>` : ''}`;
  SM_SES = ses;
  if(ses.prs.length) celebrate();
  open('ovSummary');
}

// ---------- "what next?" button in the exercise picker (0.7.3: the sweatband robot, was a 💡) ----------
const gymBulbRobot = () => { const b = $('pkBulb'); if(b && !b.dataset.robot && typeof AI !== 'undefined' && AI.robot){ b.innerHTML = AI.robot('gym', 32); b.dataset.robot = 1; } };
const DAY_SETS = { push: ['chest_upper','chest_mid','chest_lower','delt_front','delt_side','triceps'], pull: ['lats','upper_back','traps','delt_rear','biceps'],
  legs: ['quads','hamstrings','glutes','calves','adductors','abductors'] };
function inferDayType(list){
  const sc = { push: 0, pull: 0, legs: 0 };
  list.forEach(x => Object.entries(exById(x.exId).mu || {}).forEach(([h, v]) => Object.keys(DAY_SETS).forEach(k => { if(DAY_SETS[k].includes(h)) sc[k] += v / 100; })));
  const tot = sc.push + sc.pull + sc.legs; if(!tot) return active && active.type || 'full';
  if(sc.legs / tot > .6) return 'legs';
  if(sc.legs / tot > .2) return 'full';
  const up = sc.push + sc.pull; if(sc.pull / up < .25) return 'push'; if(sc.push / up < .25) return 'pull'; return 'upper';
}
function headsFor(type){ if(TYPE_HEADS[type]) return TYPE_HEADS[type];
  if(type === 'legs' || type === 'lower') return DAY_SETS.legs.concat(type === 'lower' ? ['abs'] : []);
  if(type === 'upper') return DAY_SETS.push.concat(DAY_SETS.pull);
  return ['chest_mid','lats','quads','hamstrings','delt_side','upper_back','glutes','triceps','biceps','abs']; }
// best exercise for a muscle head: ones you've done before first, then the most direct hit, compounds (longer rest) first
const bestFor = (h, used) => EX().filter(e => !used.has(e.id) && e.m !== 'cardio' && (e.mu[h] || 0) >= 50)
  .sort((a, b) => (exHistory(b.id).length - exHistory(a.id).length) || (b.rest - a.rest) || (b.mu[h] - a.mu[h]));
function buildWorkout(type){
  const n = { push: 5, pull: 5, legs: 5, lower: 5, upper: 6, full: 6 }[type] || 4, used = new Set(), out = [], heads = headsFor(type);
  for(let pass = 0; out.length < n && pass < 3; pass++) heads.forEach(h => { if(out.length >= n) return; if(pass === 0 && out.some(e => (e.mu[h] || 0) >= 40)) return; const e = bestFor(h, used)[0]; if(e){ used.add(e.id); out.push(e); } });
  return out.sort((a, b) => b.rest - a.rest);
}
function bulbSuggest(){
  const ty = active.type && active.type !== 'full' && active.type !== 'cardio' ? active.type : inferDayType(active.exercises), used = new Set(active.exercises.map(x => x.exId)), hits = hitsFrom([active], true);
  const heads = headsFor(ty).filter(h => h !== 'forearms').map(h => ({ h, s: hits[h] || 0 })).sort((a, b) => a.s - b.s);
  const picks = []; heads.forEach(({ h, s }) => { if(picks.length >= 3 || s >= 2) return; const e = bestFor(h, new Set([...used, ...picks.map(p => p.ex.id)]))[0]; if(e) picks.push({ h, ex: e }); });
  return { ty, picks };
}
let BULB = null;
function openBulb(){
  if(!active) return; BULB = null;
  if(active.exercises.length){ const { ty, picks } = bulbSuggest();
    $('blTitle').textContent = t('blNextT');
    $('blBody').innerHTML = `<p class="sub">${t('blLooks', { d: typeLabel_(ty) })}</p>` + (picks.length ? `<div class="blbest"><small>${t('blBest')}</small>${exTiles([picks[0].ex], picks[0].h)}</div>` +
      (picks.length > 1 ? `<h3>${t('blOr')}</h3>${exTiles(picks.slice(1).map(p => p.ex))}` : '') : `<p class="hint">${t('blDone')}</p>`);
  } else drawBulbTypes();
  open('ovBulb');
}
function drawBulbTypes(){
  $('blTitle').textContent = t('blBuildT');
  const types = [['push', 'wPush'], ['pull', 'wPull'], ['upper', 'wUpper'], ['lower', 'wLower'], ['full', 'wFull']];
  $('blBody').innerHTML = `<div class="alert" style="cursor:default">${t('blNeedEx')}</div><p class="sub">${t('blPick')}</p>
    <div class="blchips">${types.map(([k, l]) => `<button class="blchip" data-bt="${k}">${t(l)}</button>`).join('')}</div>
    <p class="sub" style="margin-top:12px">${t('blOrMuscle')}</p><div class="blchips">${BRO.map(([k, l]) => `<button class="blchip" data-bt="${k}">${t(l)}</button>`).join('')}</div><div id="blPlan"></div>`;
}
function drawBulbPlan(type){
  const list = buildWorkout(type); BULB = { type, list };
  document.querySelectorAll('#blBody .blchip').forEach(b => b.classList.toggle('on', b.dataset.bt === type));
  $('blPlan').innerHTML = list.length ? `<h3>${typeLabel_(type)} · ${t('nEx', { n: list.length })}</h3><ol class="blplan">${list.map(e => `<li><b>${esc(exName(e))}</b><small>${esc(ML(e.h))} · ${EL(e.e)} · ${GS_SETS[gymStyle().k]} × ${defReps(e.rest)}</small></li>`).join('')}</ol>
    <div class="actions"><button class="btn primary" id="blAccept">${t('blAccept')}</button></div>` : `<p class="hint">${t('blNone')}</p>`;
  setTimeout(() => $('blPlan').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}
function acceptBulbPlan(){
  if(!BULB || !active) return;
  const ns = GS_SETS[gymStyle().k]; BULB.list.forEach(e => active.exercises.push({ exId: e.id, reps: defReps(e.rest), rest: e.rest, sets: Array.from({ length: ns }, () => newSet()) }));
  if(!active.tplId && !active.exercises.slice(0, -BULB.list.length).length){ active.type = BULB.type; active.name = typeLabel_(BULB.type); }
  saveG('act'); close('ovBulb'); close('ovExPick'); renderSession(); toast(t('blAdded', { n: BULB.list.length })); BULB = null;
}

// ---------- keep the screen on while a workout is open ----------
const keepAwake = on => Phone.keepScreenOn(on);

// ---------- after an empty workout: save it as a workout for later? ----------
let SV = null;
function askSaveTpl(ses){
  if(!ses || !ses.exercises.some(x => !isCardio(x.exId))) return; SV = ses;
  $('svName').value = ses.name && ses.name !== t('emptyWorkout') ? ses.name : typeLabel_(inferDayType(ses.exercises));
  open('ovSaveTpl');
}
function saveSessionAsTpl(){
  if(!SV) return; const name = $('svName').value.trim() || typeLabel_(inferDayType(SV.exercises));
  const tpl = { id: uid(), name, type: inferDayType(SV.exercises),
    exercises: SV.exercises.map(x => ({ exId: x.exId, sets: x.sets.filter(isMainSet).length || 3, reps: x.reps, rest: x.rest, ...(x.ss ? { ss: x.ss } : {}), ...(x.uni ? { uni: true } : isUni(x.exId) ? { uni: false } : {}) })) };
  tpls.push(tpl); saveG('tpl'); SV.tplId = tpl.id; SV.name = name; saveG('ses'); SV = null;
  close('ovSaveTpl'); document.querySelectorAll('[data-smtpl]').forEach(b => b.remove()); renderAll(); toast(t('tplSavedT', { n: name }));
}

// ---------- 0.6.1: rest in 30 s steps (0:30 – 5:00); long press to drag a block up or down ----------
const rest30 = v => Math.max(30, Math.min(300, Math.round((+v || 90) / 30) * 30));
// 0.7.4.0.5: hold a card to pick it up. Over the MIDDLE of another card, "Superset" lights up, the cards stay still and
// letting go links the two. Over the top or bottom EDGE of a card, it moves above or below it. Zones come from where the cards
// are now (after they moved aside), not where they were when the drag began. If the phone cancels the touch, nothing moves.
function makeSortable(box, itemSel, onMove, onMerge, canMerge){
  // 0.7.9.1: on the shared drag helper (ui.js dragger): long press, then the card follows the finger 1:1 (drawn once per frame,
  // positions read only at the start); let go and it springs into its new slot carrying the finger's speed, then the list is redrawn
  let drag = null; box.classList.add('sortbox');   // (a window's pull-down-to-close leaves this list alone)
  const items = () => [...box.querySelectorAll(itemSel)];
  const scroller = () => { for(let el = box; el && el !== document.body; el = el.parentElement){ const o = getComputedStyle(el).overflowY; if((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return el; } return document.scrollingElement || document.documentElement; };
  // how far card i has moved aside for the dragged one
  const shift = (d, i) => d.from < d.to && i > d.from && i <= d.to ? -d.step : d.from > d.to && i < d.from && i >= d.to ? d.step : 0;
  const reset = list => { document.body.classList.remove('sorting'); list.forEach(el => { el.style.transform = ''; el.style.willChange = ''; el.classList.remove('dragging', 'ssarm'); }); };
  dragger(box, { hold: 420, slop: 8,
    item: e => { if(drag || e.target.closest('input,button,textarea,select,a')) return null; const it = e.target.closest(itemSel); return it && box.contains(it) ? it : null; },
    start: s => { const it = s.it, list = items(), from = list.indexOf(it); if(from < 0) return;
      const rects = list.map(el => el.getBoundingClientRect()), sc = scroller(), nx = rects[from + 1] || rects[from - 1];
      const gap = nx ? Math.max(0, nx.top > rects[from].top ? nx.top - rects[from].bottom : rects[from].top - nx.bottom) : 10;
      drag = { it, from, to: from, y0: s.y0, list, rects, sc, st0: sc.scrollTop, step: rects[from].height + gap, over: -1, ty: 0 };
      it.classList.add('dragging'); it.style.willChange = 'transform'; document.body.classList.add('sorting'); Phone.haptic(); },
    move: s => { const d = drag; if(!d) return; const ds = d.sc.scrollTop - d.st0, y = s.y;
      let over = -1, to = d.to;
      { const r = d.rects[d.from], top = r.top + y - d.y0, m = Math.min(r.height * .4, 70);   // the card itself pulled past the top or bottom of the whole list
        d.out = d.list.length > 1 && (top + r.height > d.rects[d.rects.length - 1].bottom - ds + m || top < d.rects[0].top - ds - m); }
      d.list.forEach((el, i) => { if(i === d.from) return;
        const r = d.rects[i], top = r.top - ds + shift(d, i), f = (y - top) / r.height; if(f < 0 || f > 1) return;
        if(onMerge && f > .25 && f < .75 && (!canMerge || canMerge(d.from, i))){ over = i; return; }   // the middle: link
        const before = f < .5; to = i > d.from ? (before ? i - 1 : i) : (before ? i : i + 1); });   // an edge: above or below this card
      if(over !== d.over){ if(d.over > -1) d.list[d.over].classList.remove('ssarm'); d.over = over;
        if(over > -1){ d.list[over].dataset.ssl = t('superset'); d.list[over].classList.add('ssarm'); Phone.haptic(); } }
      if(over < 0) d.to = to;   // over a link zone the other cards stay where they are
      d.ty = y - d.y0 + ds; d.it.style.transform = `translate3d(0,${d.ty.toFixed(1)}px,0) scale(1.02)`;
      d.list.forEach((el, i) => { if(i === d.from) return; const sh = shift(d, i); el.style.transform = sh ? `translate3d(0,${sh}px,0)` : ''; }); },
    end: (s, ok) => { const d = drag; drag = null; if(!d) return; const { from, to, list, over, out } = d;
      if(!ok){ reset(list); return; }   // pointercancel (the phone took the touch): never commit a move
      if(over > -1){ reset(list); onMerge(from, over); return; }
      const moved = from !== to || out, slot = (to - from) * d.step;   // where the card lands (its own spot if nothing moved)
      d.it.style.transform = '';
      springTo(d.it, { y: d.ty, s: 1.02 }, { y: moved ? slot : 0, s: 1 }, { y: s.vy }, { damp: 1, fill: 'forwards' }).finished.then(a => {
        d.it.getAnimations().forEach(x => x.cancel()); reset(list); if(moved) onMove(from, to, !!out); }, () => reset(list)); } });   // same task as the redraw: no frame in between
}

// 0.6.2: female figure = the same muscles, reshaped: narrower shoulders and arms, a narrower waist, wider hips
const FEM_K = [[0, 1], [70, 1], [92, .9], [150, .9], [178, .88], [200, .93], [232, 1.09], [280, 1.05], [330, 1], [460, 1]];
function femS(y){ for(let i = 1; i < FEM_K.length; i++){ const [y1, s1] = FEM_K[i], [y0, s0] = FEM_K[i - 1]; if(y <= y1) return s0 + (s1 - s0) * (y - y0) / (y1 - y0); } return 1; }
const femX = (x, y) => +(100 - (100 - x) * femS(y)).toFixed(1);
function femWarp(d){ return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (m, x, y) => `${femX(+x, +y)} ${y}`); }

// ---------- 0.7.4.3 Gym Coach: the shared coach chat (coach.js) with the sweatband robot ----------
// Every answer is one or two short friendly lines ("reply"), then the result as a card (a workout, a machine). No long chat.
// Gym Coach intelligence: the voice and the depth rules live in GymIntel.voice(); this is only the answer's shape
const GC_REPLY = 'Reply style: "reply" is plain text, no lists or markdown. Usually one to three short sentences (about {s} words at most); when the athlete asks why, disagrees or goes technical, up to about {l} words. A result (a workout, a machine, a change) never goes inside "reply": it goes in its own field and the app shows it as a card.';
const gcReply = () => GC_REPLY.replace('{s}', AI.words(45)).replace('{l}', AI.words(120));   // Athlete OS persona: the user's Length setting
const gcLang = () => lang === 'el' ? 'Greek' : 'English';
// the AI names exercises in English; find ours (exact name first, then the longest name it contains or is part of)
function exByName(n){
  const q = norm(n); if(!q) return null; const L = EX().filter(x => x.en);
  return L.find(x => norm(x.en) === q) || L.find(x => norm(x.el || '') === q)
    || L.filter(x => { const e = norm(x.en); return e.length > 4 && (q.includes(e) || e.includes(q)); }).sort((a, b) => Math.abs(norm(a.en).length - q.length) - Math.abs(norm(b.en).length - q.length))[0] || null;
}
const gcEx = id => { const x = exById(id); return x.en || x.id; };
const gcNames = () => EX().filter(x => x.m !== 'cardio' && x.en).map(x => x.en).join('; ');
const GC_WORKOUT = '"workout": null, or (only when you suggest a full workout or an improved version of one of theirs) {"name": string, "type": "push"|"pull"|"legs"|"upper"|"lower"|"full", "based_on": the exact name of their saved workout you improved, or null, "exercises": [{"name": exact English name from the exercise list, "sets": number, "reps": string like "8-12", "rest": seconds}]}';
// Gym Coach intelligence: a small, task-specific packet (GymIntel.brief) instead of everything every time. The exercise list goes in only
// when the message asks for a workout, and then only the athlete's equipment; for other questions the app matches names itself (exByName).
const GC_BUILD = 'Workouts: only when they ask for one (or for an improved one). Prefer adapting one of their saved workouts when it fits (set "based_on"); keep exercises that are progressing; no two exercises with the same movement for the same muscle unless asked; about 4 to 7 exercises for an hour (fewer if they want it shorter); fit the recovery notes (other muscles or lighter work for groups still recovering, unless they ask); use only equipment they use.';
function gcPrompt(ch, img, text){
  const P = GymIntel.brief('plan', ch.id, text || (ch.history().filter(h => h.who === 'me').pop() || {}).text || ''), build = P.intent === 'workout';
  return `${GymIntel.voice()}
Answer the athlete's last message in ${gcLang()}.
${gcReply()}
${GC_BUILD}
${gymStyleRule()} The athlete can correct their training style in the chat: if they say they train differently, set "style" to "low", "mid" or "high", else null.${AI.dietRules()}${AI.knows('gym')}
${P.text}
${build ? `Exercise list (use these exact English names): ${GymIntel.names()}.` : 'Name exercises by their usual English names.'}
Conversation so far (latest last):
${ch.transcript()}
${img ? 'The athlete also sent the attached photo.\n' : ''}Return ONLY JSON: {"reply": string, ${GC_WORKOUT}, "style": null | "low" | "mid" | "high"}`;
}
// the AI's workout → a workout in the app's shape (exercises it named that we don't have are left out)
function gcWorkout(w){
  if(!w || !Array.isArray(w.exercises)) return null;
  const list = w.exercises.map(e => { const x = exByName(e && e.name); if(!x) return null;
    const sets = Math.max(1, Math.min(8, Math.round(+e.sets) || 3)), reps = /^\d+(\s*[-–]\s*\d+)?$/.test(String(e.reps || '').trim()) ? String(e.reps).trim().replace(/\s*[-–]\s*/, '-') : defReps(x.rest);
    const rr = gymReps(), r2 = rr && !isCardio(x.id) && x.m !== 'core' && x.e !== 'bodyweight' ? rr : reps;   // 0.7.9: the chosen Rep Range wins
    return { exId: x.id, sets, reps: r2, rest: rest30(+e.rest || x.rest), ...(isUni(x.id) ? { uni: true } : {}) }; }).filter(Boolean)
    .filter((e, i, a) => a.findIndex(z => z.exId === e.exId) === i)
    .filter((e, i, a) => { const x = exById(e.exId); return isCardio(e.exId) || a.findIndex(z => { const y = exById(z.exId); return y.p === x.p && y.h === x.h; }) === i; })   // Gym Coach intelligence: no redundant twins
    .slice(0, 10);
  let total = 0; list.forEach(e => { e.sets = Math.max(1, Math.min(e.sets, 30 - total - (list.length - list.indexOf(e) - 1))); total += e.sets; });
  if(!list.length) return null;
  const base = w.based_on ? tpls.find(tp => norm(tp.name) === norm(w.based_on)) : null;
  const type = inferType(list) === 'cardio' ? 'cardio' : inferDayType(list);   // push / pull / legs / upper / full, like the rest of Gym
  return { tpl: { id: null, name: String(w.name || '').trim().slice(0, 40) || (base ? base.name : typeLabel_(type)), type, exercises: list }, base };
}
// 0.7.9: the coach's workout as editable cards: a head card (name, type, count), one card per exercise (sets × rep range · rest, the suggested weight)
// with Remove and Replace (the exercise picker at the same muscle), then Save / Start. Edits change this one workout (W.list) only.
function gcSugg(exId, reps){
  const ex = exById(exId); if(isCardio(exId) || ex.e === 'bodyweight') return '';
  const s = suggestFor(exId, reps); if(!s || !s.w) return '';
  return `<div class="gcsw"><small>${t(s.first ? 'gcSugFirst' : 'gcSugW')}</small><b>${fmt(s.w)} kg × ${esc(String(s.r))}</b></div>`;
}
const gcExSub = e => `${e.sets} × ${e.reps} · ${fmtRest(e.rest)}`;
function gcExCard(W, e){
  const c = { cls: 'gcex', title: exName(e.exId), sub: gcExSub(e), body: gcSugg(e.exId, e.reps), _e: e };
  c.actions = gcExActs(W, c); return c;
}
function gcExActs(W, c){
  return [
    { label: t('remove'), run(card, ch){ const i = W.list.indexOf(card._e); if(i > -1) W.list.splice(i, 1);
      ch.update(card, { dim: true, actions: [{ label: t('gcAddBack'), run(cd, ch2){ W.list.splice(Math.min(W.order(cd), W.list.length), 0, cd._e); ch2.update(cd, { dim: false, actions: gcExActs(W, cd) }); W.sync(ch2); } }] }); W.sync(ch); } },
    { label: t('gcReplace'), run(card, ch){ const g = HEADS[exById(card._e.exId).h]; Phone.haptic();
      openExPick(id => { if(!id || id === card._e.exId) return; const x = exById(id), old = card._e, i = W.list.indexOf(old);
        const e = { ...old, exId: id, rest: rest30(old.rest || x.rest) }; if(isUni(id)) e.uni = true; else delete e.uni;
        if(isCardio(id)){ e.sets = 1; e.reps = '20'; }
        if(i > -1) W.list[i] = e; ch.update(card, { _e: e, title: exName(id), sub: gcExSub(e), body: gcSugg(id, e.reps) }); W.sync(ch); },
        { muscle: g && !isCardio(card._e.exId) ? exmOf(exById(card._e.exId)) : null, cardio: isCardio(card._e.exId) }); } } ];
}
function gcWorkoutCards(tpl, base){
  const W = { list: tpl.exercises.slice(), all: [], tpl, done: false };
  W.order = cd => { const k = W.all.indexOf(cd); return W.all.slice(0, k).filter(x => !x.dim).length; };   // where a removed card goes back
  W.cur = () => ({ ...JSON.parse(JSON.stringify(tpl)), exercises: JSON.parse(JSON.stringify(W.list)), type: W.list.length ? (inferType(W.list) === 'cardio' ? 'cardio' : inferDayType(W.list)) : tpl.type });
  W.sync = ch => { const tp = W.cur(); ch.update(W.head, { sub: `${typeLabel_(tp.type)} · ${t('nEx', { n: W.list.length })}` });
    if(!W.done) ch.update(W.foot, { dim: !W.list.length }); };
  const head = { title: tpl.name, sub: `${typeLabel_(tpl.type)} · ${t('nEx', { n: tpl.exercises.length })}`, tag: base ? t('gcImproved') : '' };
  const exs = tpl.exercises.map(e => gcExCard(W, e));
  const foot = { cls: 'gcfoot', actions: [
    { label: t('save'), run(card, ch){ if(!W.list.length) return; const tp = { ...W.cur(), id: uid() }; tpls.push(tp); saveG('tpl'); renderAll(); W.done = true;
      ch.update(card, { done: t('gcSaved', { n: tp.name }), undo(){ W.done = false; const i = tpls.findIndex(x => x.id === tp.id); if(i > -1){ tpls.splice(i, 1); saveG('tpl'); renderAll(); } } }); } },
    { label: t('gStartL'), primary: true, run(){ if(!W.list.length) return; if(active){ toast(t('gcLiveAlready')); return; }
      const tp = W.cur(); Coach.minimize(); setTimeout(() => startSession(tp), 260); } } ] };
  return { W, list: [head, ...exs, foot] };
}
function gcShow(r, ch){
  const reply = String((r && r.reply) || '').trim(), w = gcWorkout(r && r.workout);
  if(reply || !w) ch.say(reply || t('coachFail', { e: '?' }));
  if(w){ const { W, list } = gcWorkoutCards(w.tpl, w.base), cs = ch.cards(list);   // the chat keeps copies: edit those
    W.head = cs[0]; W.all = cs.slice(1, -1); W.foot = cs[cs.length - 1]; }
  gcStyleAfter(r, ch);
}
// the training style (Intensity) and Rep Range show with the chat's first answer; "style" in the answer = the user corrected it by text
function gcStyleAfter(r, ch){ const k = r && r.style; if(['low', 'mid', 'high'].includes(k) && k !== gymStyle().k){ gymStyleSet(k, null, ch); return; }
  if(ch.history().filter(h => h.who === 'me').length === 1) ch.cards([gymStyleCard(), gymRepsCard()]); }
async function gymCoachSend(text, ch, img){ ch.status(t(img ? 'coachStPhoto' : 'gcStLook')); gcShow(await gcAsk(ch, gcPrompt(ch, img, text), img, text, 'plan'), ch); }
// Gym Coach intelligence: the one AI request for this message. If it fails (offline, no key, every model busy), a question the app can answer
// from your own log (next weight, what's next) still gets a plain answer; otherwise the usual "couldn't answer" line.
async function gcAsk(ch, prompt, img, text, mode){
  try{ return await ch.ask(prompt, img); }
  catch(e){ if(e && e.cancelled) throw e; const loc = !img && GymIntel.offline(text, mode, ch.id); if(!loc) throw e; return { reply: `${t('gciOffline')} ${loc}`, local: true }; }
}

// ---- live workout: the sweatband robot bubble ('gymlive'); a photo of a machine → what it is, how to use it, a first-time weight ----
function gcActive(){
  if(!active) return 'No workout running.';
  return `Workout running now: ${active.name || active.type || 'workout'}, ${Math.round(sesMs() / 60000)} min in. Exercises so far: ${active.exercises.map(x => {
    const d = x.sets.filter(z => z.done && isMainSet(z)); return `${gcEx(x.exId)} (${d.length}/${x.sets.filter(isMainSet).length} sets done${d.length ? `, last ${d[d.length - 1].w}kg x ${d[d.length - 1].r}` : ''})`; }).join(', ') || 'none yet'}.`;
}
const GC_MACHINE = '"machine": null, or (only when the photo shows gym equipment) {"name": the machine\'s usual name, "exercise": the exact English name from the exercise list that this machine is used for (the main one), or null, "how": one or two sentences on how the machine works (what moves, what to adjust), "steps": 3 to 5 short steps to do the exercise, "mistakes": 2 to 4 short common mistakes}';
// Gym Coach intelligence: a proposed change to the running workout is data, never an action. The app checks it (GymIntel.proposal: the exercise
// must be in this workout, numbers in range, a swap must exist in the library) and shows it as a card; only Apply changes the workout (with Undo).
const GC_CHANGE = '"change": null, or (only when you propose one concrete change to the running workout; if they agree to something you proposed earlier, propose it again here so they can apply it) {"type": "weight"|"reps"|"sets"|"swap"|"add", "exercise": the English name of an exercise in this workout (not for add), "w": kg for the sets still to do (weight), "r": reps for the sets still to do (reps), "n": total working sets (sets), "to": English name of the new exercise (swap, add), "why": a few words}';
function gcLivePrompt(ch, img, text){
  const P = img ? null : GymIntel.brief('live', ch.id, text || '');
  return `${GymIntel.voice()}
The athlete is in the middle of a workout. Answer their last message in ${gcLang()}.
${gcReply()}
${img ? 'They sent a photo, most likely of a gym machine they are not sure about. Name it only from what you can see; if you are not sure which machine it is, say so plainly. Do not invent settings or details that are not visible, and do not judge technique from a still photo of equipment. If the photo is not gym equipment, say so briefly in "reply" and set "machine" to null.' : 'Answer about this workout: weights, sets, what to do next, technique, rest. Within-session fatigue is normal (a few reps fewer each set at the same weight); do not treat it as a recovery problem. Respect their planned order unless there is a good reason.'}
${gymStyleRule()} The athlete can correct their training style in the chat: if they say they train differently, set "style" to "low", "mid" or "high", else null.${AI.dietRules()}${AI.knows('gym')}
${P ? P.text : gcActive()}
${img ? `Exercise list (use these exact English names): ${gcNames()}.` : 'Name exercises by their usual English names.'}
Conversation so far (latest last):
${ch.transcript()}
Return ONLY JSON: {"reply": string, ${img ? GC_MACHINE : GC_CHANGE}, "style": null | "low" | "mid" | "high"}`;
}
// the card for a checked change: what changes, why, Apply (with Undo) or Not Now. Both answers are remembered (GymIntel.said) so a declined idea is not pushed again.
function gcChangeCard(op, why, key){
  const rec = GymIntel.said(key || `${active ? active.id : ''}:${op.type}:${op.exId}`, `${op.type} ${gcEx(op.exId)}${op.w != null ? ' ' + op.w + ' kg' : op.r != null ? ' ' + op.r + ' reps' : op.n != null ? ' ' + op.n + ' sets' : op.to ? ' to ' + gcEx(op.to) : ''}`), wid = active && active.id;
  const card = { title: exName(op.exId), sub: GymIntel.describe(op, active), tag: t('gciProposed'),
    body: why ? `<p class="gchow">${esc(why)}</p>` : '',
    actions: [
      { label: t('gciApply'), primary: true, run(cd, ch){ if(cd.done) return;
        if(!active || active.id !== wid || !GymIntel.stillFits(op, active)){ ch.update(cd, { done: t('gciStale') }); GymIntel.outcome(rec, null); return; }
        const undo = GymIntel.applyOp(op, active); if(!undo){ ch.update(cd, { done: t('gciStale') }); return; }
        saveG('act'); renderSession(); GymIntel.outcome(rec, 'yes');
        ch.update(cd, { done: t('gciApplied'), undo(){ if(active && active.id === wid){ undo(); saveG('act'); renderSession(); } GymIntel.outcome(rec, 'undo'); } }); } },
      { label: t('gciNotNow'), run(cd, ch){ if(cd.done) return; GymIntel.outcome(rec, 'no'); ch.update(cd, { done: t('gciKept') }); } } ] };
  return card;
}
const gcList = (a, n) => (Array.isArray(a) ? a : []).map(s => String(s || '').trim()).filter(Boolean).slice(0, n);
// a first-time weight: your history on this exercise, else the app's estimate from your other lifts (estimateNew)
function gcWeight(exId){
  const ex = exById(exId); if(isCardio(exId) || ex.e === 'bodyweight') return '';
  const reps = usualReps(exId) || repRange(defReps(ex.rest))[1], s = suggestFor(exId, String(reps));
  if(!s) return '';
  if(s.w && !s.first) return t('gcWLast', { w: fmt(s.w), r: s.r });
  if(s.w) return t('gcWEst', { w: fmt(s.w), r: s.r });
  return t('gcWNone');
}
function gcMachineCard(m){
  const x = exByName(m.exercise), steps = gcList(m.steps, 6), errs = gcList(m.mistakes, 5), w = x ? gcWeight(x.id) : '';
  const acts = x ? [
    ...(active ? [{ label: t('gcAddWk'), primary: true, run(card, ch){ addToSession(x.id); const add = active.exercises[active.exercises.length - 1];
      ch.update(card, { done: t('gcAddedWk', { n: exName(x) }), undo(){ const i = active ? active.exercises.indexOf(add) : -1; if(i > -1){ active.exercises.splice(i, 1); if(active.cur >= active.exercises.length) active.cur = null; saveG('act'); renderSession(); } } }); } }] : []),
    { label: t('formPill'), run(){ openDemo(x.id); } } ] : [];
  return { title: String(m.name || (x && exName(x)) || '').trim().slice(0, 60), sub: x ? `${exName(x)} · ${EL(x.e)}` : '',
    body: `${m.how ? `<p class="gchow">${esc(String(m.how).slice(0, 300))}</p>` : ''}
      ${steps.length ? `<div class="gcblk"><b class="fph">${svgIcon('check', 16, 2.4)}${t('howTo')}</b><ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      ${errs.length ? `<div class="gcblk"><b class="fph warn">${svgIcon('warn', 16, 2.2)}${t('mistakesT')}</b><ul class="fpx">${errs.map(s => `<li><span class="xred">${svgIcon('x', 14, 2.6)}</span>${esc(s)}</li>`).join('')}</ul></div>` : ''}
      ${w ? `<div class="gcw"><small>${t('gcWFirst')}</small><b>${esc(w)}</b></div>` : ''}`,
    actions: acts };
}
async function gymLiveSend(text, ch, img){
  ch.status(t(img ? 'coachStPhoto' : 'aiThinking'));
  const r = await gcAsk(ch, gcLivePrompt(ch, img, text), img, text, 'live'), m = r && r.machine && (r.machine.name || r.machine.exercise) ? r.machine : null, reply = String((r && r.reply) || '').trim();
  const op = !img && r && r.change ? GymIntel.proposal(r.change, active) : null;   // checked; an invalid or unknown one is simply not shown
  if(reply || (!m && !op)) ch.say(reply || t('coachFail', { e: '?' }));
  if(m) ch.cards([gcMachineCard(m)]);
  if(op) ch.cards([gcChangeCard(op, op.why)]);
  gcStyleAfter(r, ch);
}
// ---- quiet proactive coaching: after a set, plain rules (GymIntel.nudge, no AI) may find ONE useful thing. Then a small dot appears on the
// header robot; nothing pops up. Opening the chat shows it, with a change card when there is something to apply. Each hint once per workout.
let GC_NUDGE = null;
function gcNudgeCheck(){
  if(!active || typeof GymIntel === 'undefined') return; GC_NUDGE = null;
  try{ const n = GymIntel.nudge(active, GymIntel.seen(active.id)); if(n){ GC_NUDGE = n; GymIntel.markSeen(active.id, n.key); } }catch(e){ console.warn('gym nudge', e); }
  const b = $('sesCoach'); if(b) b.classList.toggle('nudge', !!GC_NUDGE);
}
function gcOpenLive(){
  const n = GC_NUDGE; GC_NUDGE = null; const b = $('sesCoach'); if(b) b.classList.remove('nudge');
  Coach.open('gymlive');
  if(n && active) Coach.post('gymlive', t(n.text[0], n.text[1]), n.op && GymIntel.stillFits(n.op, active) ? [gcChangeCard(n.op, '', n.key)] : null);
}

// ---- training style: read from your logged workouts (sets per muscle a week, reps, sets to failure, rest); you can correct it in the chat ----
// low = low volume / high intensity · mid = in between · high = high volume / lower intensity. profile.gymStyle = your own choice (overrides the reading).
const GS_RULE = {
  low: 'low volume, high intensity: 2-3 hard working sets per exercise, 5-8 reps, the last set taken to failure, 2-3 min rest, about 6-10 sets per muscle a week',
  mid: 'in between: 3 working sets per exercise, 8-12 reps, stop 1-2 reps short of failure (last set may go to failure), 90-120 s rest, about 10-15 sets per muscle a week',
  high: 'high volume, lower intensity: 3-5 sets per exercise, 10-15 reps, 2-3 reps short of failure, 60-90 s rest, about 15-22 sets per muscle a week' };
const GS_SETS = { low: 2, mid: 3, high: 4 };
function gymStyleRead(){
  const since = Date.now() - 56 * 864e5, list = sessions.filter(s => new Date(s.start).getTime() >= since && s.exercises.some(x => !isCardio(x.exId)));
  if(list.length < 3) return null;
  const reps = [], rests = []; let sets = 0, fail = 0;
  list.forEach(s => s.exercises.forEach(x => { if(isCardio(x.exId)) return; const d = x.sets.filter(z => z.done && isMainSet(z)); if(!d.length) return;
    rests.push(+x.rest || exById(x.exId).rest); d.forEach(z => { sets++; if(z.type === 'F') fail++; if(+z.r > 0) reps.push(+z.r); }); }));
  if(!sets) return null;
  const weeks = Math.max(1, (Date.now() - Math.min(...list.map(s => new Date(s.start).getTime()))) / 6048e5), g = {};
  Object.entries(hitsFrom(list, false)).forEach(([h, v]) => { const k = HEADS[h] && HEADS[h][2]; if(k && k !== 'cardio' && k !== 'other') g[k] = Math.max(g[k] || 0, v); });
  const gv = Object.values(g).filter(v => v >= 1), perWk = gv.length ? gv.reduce((a, v) => a + v, 0) / gv.length / weeks : 0;
  const med = a => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 0; };
  const r = med(reps), fp = fail / sets, rest = Math.round(rests.reduce((a, v) => a + v, 0) / rests.length);
  // points toward low (−) or high (+) volume
  const pts = (perWk < 9 ? -1 : perWk >= 15 ? 1 : 0) + (r && r <= 7 ? -1 : r >= 12 ? 1 : 0) + (fp >= .35 ? -1 : fp < .1 ? .5 : 0) + (rest >= 150 ? -.5 : rest <= 75 ? .5 : 0);
  return { k: pts <= -1.5 ? 'low' : pts >= 1.5 ? 'high' : 'mid', perWk: Math.round(perWk), reps: r, fail: Math.round(fp * 100), rest, n: list.length };
}
function gymStyle(){ const read = gymStyleRead(), own = ['low', 'mid', 'high'].includes(profile.gymStyle) ? profile.gymStyle : null; return { ...(read || {}), read, own, k: own || (read && read.k) || 'mid' }; }
const gsName = k => t({ low: 'gsLow', mid: 'gsMid', high: 'gsHigh' }[k]);
// one line for every gym suggestion prompt
function gymStyleRule(){ const s = gymStyle(), rr = gymReps();
  return (rr ? `Rep range the user chose for working sets: ${rr} reps (use it for every lift except core and cardio). ` : '') + `Training style: ${s.k === 'low' ? 'low volume / high intensity' : s.k === 'high' ? 'high volume / lower intensity' : 'in between'}${s.own ? ' (the user chose this)' : s.read ? ` (from their last ${s.n} workouts: about ${s.perWk} hard sets per muscle a week, usually ${s.reps} reps, ${s.fail}% of sets to failure, ${s.rest} s rest)` : ' (not enough workouts yet to tell)'}. Fit every suggestion to it: ${GS_RULE[s.k]}.`; }
// 0.7.9: Intensity and Rep Range are pickers: the tapped button slides on (accent), the others off; the choice is saved at once and the card stays
// (the chat redraws only on new messages, so the buttons are switched in place and the card is kept in step for later redraws)
function gcChoose(card, i, sub){
  card.actions.forEach((a, j) => { a.primary = j === i; }); if(sub != null) card.sub = sub;
  const el = document.querySelector(`#coachList [data-cid="${card.cid}"]`); if(!el) return;
  el.querySelectorAll('.ccacts .ccbtn').forEach((b, j) => { b.classList.toggle('pri', j === i); b.setAttribute('aria-pressed', j === i); });
  const sm = el.querySelector('.cchead small'); if(sm && sub != null) sm.textContent = sub;
}
function gymStyleBody(s){ const row = (l, v) => `<div class="gsrow"><small>${l}</small><b>${v}</b></div>`;
  return `<span class="gspick" hidden></span>` + (s.read ? `<div class="gsgrid">${row(t('gsSets'), '~' + s.read.perWk)}${row(t('gsReps'), s.read.reps || '–')}${row(t('gsFail'), s.read.fail + '%')}${row(t('restL'), fmtRest(s.read.rest))}</div>` : '')
    + `<p class="hint gsnote">${s.own ? t('gsMine') : s.read ? t('gsFrom', { n: s.read.n }) : t('gsFew')}</p>`; }
function gymStyleCard(){
  const s = gymStyle(), ks = ['low', 'mid', 'high'];
  return { title: t('gcStyleT'), sub: gsName(s.k), body: gymStyleBody(s),
    actions: ks.map((k, i) => ({ label: t({ low: 'gsLowS', mid: 'gsMidS', high: 'gsHighS' }[k]), primary: k === s.k, run(card){ gymStyleSet(k); card.body = gymStyleBody(gymStyle()); gcChoose(card, i, gsName(k));
      const n = document.querySelector(`#coachList [data-cid="${card.cid}"] .gsnote`); if(n) n.textContent = t('gsMine'); } })) };
}
// the chat corrected it by text (no card): save it and show the Intensity card with the new choice
function gymStyleSet(k, card, ch){
  profile.gymStyle = k; saveProfile();
  if(ch) ch.cards([{ ...gymStyleCard(), sub: gsName(k) }]);
}
// Rep Range for working sets: Auto (follows Intensity) or a fixed range. profile.gymReps = '5-8' | '8-12' | '12-15' (absent = Auto)
const GC_REPS = ['', '5-8', '8-12', '12-15'];
const gymReps = () => GC_REPS.includes(profile.gymReps) && profile.gymReps ? profile.gymReps : '';
function gymRepsCard(){
  const cur = gymReps(), name = v => v ? t('gcRepsN', { r: v }) : t('gcRepsAuto');
  return { title: t('gcRepRange'), sub: name(cur), body: `<span class="gspick" hidden></span>`,
    actions: GC_REPS.map((v, i) => ({ label: v || t('auto'), primary: v === cur, run(card){ if(v) profile.gymReps = v; else delete profile.gymReps; saveProfile(); gcChoose(card, i, name(v)); } })) };
}
