// Gym Buddy: workouts, sessions, library, picker, recovery, progress, form demos. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ran out (or below your level) → onto the grocery list by itself
function checkRestock(foodId){
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
    const work = x.sets.filter(st => st.done && st.type !== 'W' && st.w !== '' && st.r !== '');
    if(!work.length) return null;
    const top = work.reduce((b, st) => (+st.w > +b.w || (+st.w === +b.w && +st.r > +b.r)) ? st : b, work[0]);
    return { date: s.date, start: s.start, sets: work, top, e1: Math.max(...work.map(st => e1rm(+st.w, +st.r, exId))) }; }).filter(Boolean).sort((a, b) => a.start.localeCompare(b.start));
}

function lastSessionDate(){ const s = sessions.slice().sort((a, b) => b.start.localeCompare(a.start))[0]; return s ? s.date : (profile.gymLast || null); }

function comebackFactor(){ if(!comeback) return 1; const k = sessions.filter(s => s.start > comeback.at).length; return Math.min(1, comeback.base + .05 * k); }

function cbBase(gap){ return gap >= 42 ? .7 : gap >= 21 ? .8 : .9; }

function suggestFor(exId, reps){
  const ex = exById(exId), [lo, hi] = repRange(reps), h = exHistory(exId, active && active.id);
  if(isCardio(exId)) return null;
  if(!h.length){ const ur = usualReps(exId) || hi, est = estimateNew(exId, ur); return est ? { first: true, est: true, w: est, r: ur, lo, hi } : { first: true, lo, hi }; }
  const last = h[h.length - 1], f = comebackFactor();
  if(f < 1){ const pre = comeback.ref && comeback.ref[exId] ? comeback.ref[exId] : +last.top.w; return { cb: true, p: Math.round(f * 100), w: r25(pre * f, ex.e), r: `${lo}-${hi}`, last }; }
  const w = +last.top.w, r = +last.top.r;
  return r >= hi ? { w: r25(w + (ex.e === 'dumbbell' ? 2 : 2.5), ex.e), r: `${lo}-${hi}`, last } : { w, r: Math.min(hi, r + 1), last };
}

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

function warmupFor(exId, w){
  const ex = exById(exId); if(!(w >= 20) || ex.e === 'bodyweight' || isCardio(exId)) return [];
  return [[.4, 8], [.6, 5], [.8, 3]].map(([p, r]) => ({ w: Math.max(ex.e === 'barbell' ? 20 : 0, r25(w * p, ex.e)), r })).filter((x, i, a) => x.w > 0 && (i === 0 || x.w > a[i - 1].w));
}

// ---------- live session ----------
// 0.7.7: Exercise Settings (one global menu, saved with the device settings): both sides together, hidden markers, per-set extras, sounds
const gx = () => settings.gx || (settings.gx = {});
// 0.7.9.1: Hide Set Markers is a drop-down of three: Warm-Up (W), Drop Set (D), Failure (F). gx().hideM = { W:true, … } = not offered on sets any more.
// The old single switch (hideMarks) becomes all three hidden.
// 0.7.9.6: ONE place for the Exercise Settings defaults: only the three pills are on; a switch someone has changed keeps their choice
const GX_DEF = { rank: true, uniPill: true, formPill: true, swapPill: true, lbAtt: false, warnSore: false, tips: false, uniBoth: false, half: false, neg: false, rir: false, sound: false };
const gOn = k => { const v = gx()[k]; return v === undefined || v === null ? !!GX_DEF[k] : !!v; };
function hideM(k){ const G = gx(); if(G.hideMarks){ G.hideM = { W: true, D: true, F: true }; delete G.hideMarks; Store.save('settings', settings); } return !!(G.hideM && G.hideM[k]); }
let EXS_MK = false;   // the Hide Set Markers list is open
function setGx(k, v){ gx()[k] = v; Store.save('settings', settings); }
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
  active.exercises.forEach((x, i) => { const e = tpl.exercises[i]; if(e && e.uni !== undefined ? e.uni : isUni(x.exId)) makeUni(x, true); });   // one side at a time: L / R sets
  saveG('act');
  // today becomes a gym day; discarding the workout puts the day back as it was
  const tk = todayKey(), di = dayInfo(tk); active.dayBefore = days[tk] ? { ...days[tk] } : null;
  days[tk] = { ...di, type: 'gym', work: workKind(active.type), time: profile.realStart || !di.time || di.type !== 'gym' ? fromMin(now.getHours() * 60 + now.getMinutes()) : di.time }; delete days[tk].guessed; saveDays();
  close('ovStart'); renderAll(); openSession();
}

function openSession(){ if(!active) return; renderSession(); open('ovSession'); keepAwake(true); }

// the sweatband robot in a title bar (live workout header, Start Workout window)
function gymHeadRobot(id){ const cb = $(id); cb.innerHTML = AI.robot('gym', id === 'sesCoach' ? 40 : 30); cb.setAttribute('aria-label', t('coachBubA', { n: t('coachGym') })); }
function renderSession(){
  if(!active) return;
  $('sesName').textContent = active.name && active.name !== t('emptyWorkout') ? active.name : ''; tickClock();   // 0.7.3: blank until the workout has a name
  gymHeadRobot('sesCoach');   // 0.7.7: the Gym Coach robot, top right of the header
  $('sesHg').innerHTML = hourglass('hg5', 24, sesMs() / 1000);
  const cb = comebackFactor();
  const day = suppLog[todayKey()] || {}, sp = supps.filter(s => s.often === 'training' || s.times.some(x => x === 'pre' || x === 'post'));
  $('sesSupps').innerHTML = (cb < 1 ? `<div class="alert" style="cursor:default">${t('cbActive', { k: sessions.filter(s => s.start > comeback.at).length + 1, p: Math.round(cb * 100) })}</div>` : '') +
    (sp.length ? `<div class="slots" style="margin:0 0 10px"><small class="rmeta" style="align-self:center">${t('suppsNow')}</small>${sp.map(s => { const sl = s.times.find(x => x === 'pre' || x === 'post') || s.times[0]; const k = `${s.id}|${sl}`;
      return `<button class="slot ${day[k] ? 'taken' : ''}" data-ssup="${k}">${day[k] ? svgIcon('check', 14, 2.6) + ' ' : ''}${suppIcon(s)} ${esc(suppName(s))}</button>`; }).join('')}</div>` : '');
  if(active.clock0 === undefined) active.clock0 = active.exercises.length ? new Date(active.start).getTime() : null;   // workouts started before 0.6.0
  if(!active.clock0 && active.exercises.length){ active.clock0 = Date.now(); saveG('act'); }   // 0.6.0: the clock starts with the first exercise
  normalizeSS(active.exercises);
  const shown = active.exercises.map((x, i) => cardHtml(x, i)).join('');
  $('sesBody').innerHTML = shown || `<div class="empty">${t('noExYet')}</div>`;
  SES_ADD = SES_ADD || $('sesAddEx'); $('sesBody').appendChild(SES_ADD);   // Add Exercise always sits under the last exercise
}
let SES_ADD = null;
const sesMs = () => active && active.clock0 ? Date.now() - active.clock0 : 0;

const clk = ms => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`; };
const exTime = x => clk((x.t1 || Date.now()) - x.t0);
function tickClock(){ if(!active || !$('ovSession').classList.contains('open')) return;
  $('sesClock').textContent = clk(sesMs());
  document.querySelectorAll('#sesBody [data-xt]').forEach(el => { const x = active.exercises[+el.dataset.xt]; if(x && x.t0) el.textContent = exTime(x); }); }

function focusSet(xi, si){ setTimeout(() => { const el = document.querySelector(`.exc[data-x="${xi}"] .setrow[data-s="${si}"] [data-w]`); if(el){ el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 60); }

// records: a WEIGHT record (heaviest set) and a VOLUME record (total kg moved across all sets) — volume counts more
function tickSet(x, s, row, xi, si){
  if(s.done){ const mate = gOn('uniBoth') && x.uni && s.side === 'L' && x.sets[si + 1] && x.sets[si + 1].side === 'R' ? x.sets[si + 1] : null; if(mate){ mate.done = false; delete mate.at; }   // the tall tick reopens both sides
    s.done = false; if(s.pr === 't' || s.pr === 'd') active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === s.pr)); s.pr = null; delete s.at; if(x.volPR && exVol(x.exId, x.sets) <= bestVolBefore(x.exId)){ x.volPR = false; active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === 'v')); } saveG('act'); renderSession(); return; }
  const wi = row.querySelector('[data-w]'), ri = row.querySelector('[data-r]'), card = isCardio(x.exId);
  if(atOn(x) && s.type !== 'W') s.r = '1';   // attempt mode: a ticked set is a single
  if(s.w === '' && wi.placeholder && !isNaN(+wi.placeholder)) s.w = wi.placeholder; if(s.r === '' && ri && ri.placeholder && !isNaN(+ri.placeholder)) s.r = ri.placeholder;
  if(s.r === '' || (!card && s.w === '' && !gymBwDash(x.exId))){ toast(t(card ? 'needCardio' : 'needSetVals')); (s.w === '' && !card ? wi : ri).focus(); return; }
  if(s.w === '') s.w = '0';
  s.done = true; s.at = Date.now(); Phone.unlockAudio(); if(!x.t0) x.t0 = Date.now();
  if(card){   // cardio records: longest time, farthest distance (only against earlier workouts)
    const hist = exHistory(x.exId, active.id);
    if(hist.length){ [['t', 'r'], ['d', 'w']].forEach(([kind, k]) => { const prev = Math.max(...hist.flatMap(h => h.sets.map(z => +z[k] || 0))), cur = +s[k] || 0;
      if(cur > prev && !active.prs.some(p => p.exId === x.exId && p.kind === kind && p.v >= cur)){ active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === kind)); active.prs.push({ exId: x.exId, kind, v: cur }); s.pr = kind; celebrate(); toast(t(kind === 't' ? 'prT' : 'prD', { n: exName(x.exId), v: fmt(cur) })); } }); }
  }
  let both = false;   // one-sided exercise + the setting: finishing L finishes R too
  if(gOn('uniBoth') && x.uni && s.side === 'L'){ const o = x.sets[si + 1]; if(o && o.side === 'R' && !o.done){ if(o.w === '') o.w = s.w; if(o.r === '') o.r = s.r; o.done = true; o.at = Date.now(); both = true; si++; } }
  if(!card && s.type !== 'W'){
    const hist = exHistory(x.exId, active.id), same = active.exercises.filter(z => z.exId === x.exId);
    if(hist.length){
      const prevMaxW = Math.max(...hist.flatMap(h => h.sets.map(z => +z.w))), curOther = Math.max(0, ...same.flatMap(z => z.sets).filter(z => z !== s && z.done && z.type !== 'W').map(z => +z.w));
      if(exById(x.exId).e !== 'bodyweight' && +s.w > prevMaxW && +s.w > curOther){ s.pr = 'w'; active.prs.push({ exId: x.exId, kind: 'w', w: +s.w, r: +s.r }); celebrate(); toast(t('prW', { n: exName(x.exId), w: fmt(+s.w), r: s.r })); }
      const prevVol = bestVolBefore(x.exId), curVol = same.reduce((a, z) => a + exVol(x.exId, z.sets), 0);
      if(!x.volPR && curVol > prevVol){ x.volPR = true; s.pr = 'v'; active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === 'v'));
        active.prs.push({ exId: x.exId, kind: 'v', vol: Math.round(curVol), prev: Math.round(prevVol) });
        celebrate(); setTimeout(celebrate, 350); toast(t('prV', { n: exName(x.exId), v: Math.round(curVol).toLocaleString() })); }
      else if(x.volPR){ const p = active.prs.find(p => p.exId === x.exId && p.kind === 'v'); if(p) p.vol = Math.round(curVol); }
    }
  }
  saveG('act');
  SSNEXT = null; const nxt = x.sets[si + 1], moreDrop = nxt && nxt.drop && !nxt.done;   // no rest between drops
  if(!card && !(x.uni && s.side === 'L' && !both) && !moreDrop){
    const go = s.type === 'W' ? null : ssNext(xi);   // superset: straight to the partner's next set
    if(go) SSNEXT = go;
    else { const rest = s.type === 'W' ? 60 : ssRest(x); REST = { end: Date.now() + rest * 1000, total: rest, rang: false, xi, si }; }
  }
  if(!card && s.type !== 'W' && +s.r === 1) boardCheer(x, s);   // 0.7.9: a ticked single on a board lift = a leaderboard 1RM
  autoEndMark(REST ? REST.end : 0);   // the auto-end wait starts when this rest ends (or now, with no rest)
  if(s.type !== 'W' && !moreDrop && !(x.uni && s.side === 'L' && !both) && x.sets.every(z => z.done)){   // 0.7.1: the next set is already waiting under the rest timer
    const add = x.uni ? uniPair() : [newSet()]; add.forEach(z => z.auto = true);
    if(atOn(x)) add.forEach(z => { z.r = '1'; z.w = String(r25(+s.w + (exById(x.exId).e === 'dumbbell' ? 2 : 2.5), exById(x.exId).e)); });   // the next single, a step up
    x.sets.push(...add); saveG('act'); }
  renderSession(); tickRest();
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
function addDrop(x, j){ const s = x.sets[j]; x.sets.splice(j + 1, 0, { ...newSet('D'), drop: true, w: dropWeight(x, s.w || (s.done ? s.w : '')), side: s.side }); if(!x.sets[j + 1].side) delete x.sets[j + 1].side; }

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

// o (0.7.9, optional): { group } opens straight at that muscle group's list, { cardio: true } at Cardio (Gym Coach › Replace)
function openExPick(cb, o){ o = o || {}; const g = o.group && GROUPS[o.group] ? o.group : null;
  PK = { cb, region: o.cardio ? 'cardio' : g ? GROUPS[g][2] : ui.pkRegion || 'up', mode: ui.pkMode || 'map', group: g, head: null }; $('exSearch').value = ''; $('ovExPick').querySelector('.sheet').classList.remove('pksearching'); drawExPick(); open('ovExPick'); pkFit(); }
// 0.7.9.6: the window always matches the visible screen, so the search strip at the bottom sits right above the keyboard while typing
function pkFit(){ const ov = $('ovExPick'), vv = window.visualViewport; if(!vv || !ov.classList.contains('open')) return;
  ov.style.setProperty('--pkvh', vv.height + 'px'); ov.style.setProperty('--pkvt', vv.offsetTop + 'px'); ov.classList.toggle('kb', vv.height < innerHeight * .8); }
// exercises already in the workout this picker adds to: marked in the list
function pkHave(){ const op = id => $(id).classList.contains('open');
  const l = op('ovTpl') && TP ? TP.exercises : active && op('ovSession') ? active.exercises : [];
  return new Set(l.map(e => e.exId)); }

// ---------- exercise details: muscles %, form, common mistakes ----------
function addToSession(id){ const x = { exId: id, reps: isCardio(id) ? '20' : defReps(exById(id).rest), rest: exById(id).rest, sets: [newSet()] }; if(isUni(id)) makeUni(x, true);
  active.exercises.push(x); active.cur = active.exercises.length - 1; saveG('act'); renderSession();
  const i = active.exercises.length - 1; setTimeout(() => { const el = document.querySelector(`.exc[data-x="${i}"]`); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }

// unilateral exercises: L and R sets in pairs; rest starts after the R side
const UNI_RE = /single|one[- ]?arm|one[- ]?leg|1[- ]arm|unilateral|bulgarian|split squat|lunge|step[- ]?up|pistol|concentration|kickback|suitcase/i;
const isUni = id => { const ex = exById(id); return !!ex && !isCardio(id) && UNI_RE.test(ex.en || ''); };
const uniPair = s => [{ ...newSet(s && s.type), side: 'L' }, { ...newSet(s && s.type), side: 'R' }];
function makeUni(x, on){ x.uni = on;
  if(on) x.sets = x.sets.flatMap(s => s.side ? [s] : [{ ...s, side: 'L' }, { ...newSet(s.type), side: 'R' }]);
  else x.sets = x.sets.filter(s => s.side !== 'R').map(s => { const c = { ...s }; delete c.side; return c; }); }

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
    (settings.geminiKey ? `<div class="actions"><button class="btn" id="nxAI">${t('nxAI')} ${AI.badge()}</button></div><div id="nxAIOut"></div>` : `<p class="hint">${t('nxNoKey')}</p>`);
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

// ---------- recovery model: hard sets per muscle × time since, with your soreness on top ----------
// Each done set adds load to its muscles by the exercise's muscle %, weighted for effort:
// failure ×1.35, drop set ×1.2, heavy (≤5 reps) ×1.1, very light (≥20 reps) ×0.85, lowering-heavy moves (hinge/squat/lunge) ×1.2.
const ECC_PAT = /hinge|squat|lunge|rdl|split|nordic|bulgarian/i;
function headLoads(ses){
  const per = {};
  (ses.exercises || []).forEach(x => { const ex = exById(x.exId); if(!ex || !ex.mu) return; const ecc = ECC_PAT.test((ex.p || '') + ' ' + ex.id) ? 1.2 : 1;
    x.sets.filter(z => z.done && z.type !== 'W').forEach(z => { const reps = +z.r || 0, rf = reps >= 20 ? .85 : reps > 0 && reps <= 5 ? 1.1 : 1;
      // 0.7.9.1: background extras make a set harder: reps in reserve 0, or negatives, ×1.1 (once, not stacked)
      const hardX = z.rir === 0 || +z.ng > 0 ? 1.1 : 1;
      const e = (z.type === 'F' ? 1.35 : z.type === 'D' ? 1.2 : 1) * ecc * rf * hardX;
      Object.entries(ex.mu).forEach(([h, v]) => { if(HEADS[h] && h !== 'cardio') per[h] = (per[h] || 0) + v / 100 * e; }); }); });
  return per;
}
// 0.7.8: sleep counts only when a smartwatch or band is connected. Hook for later (the Capacitor app via Apple Health): return the average hours slept
// since endTs, or null when there's no watch data. Today it is always null, so sleep changes nothing and nothing about sleep is shown.
const watchSleepHours = endTs => null;
// Short sleep stretches the rest a muscle needs, long sleep trims it a little.
const sleepFactor = endTs => { const h = watchSleepHours(endTs);
  if(h == null || !(h > 0)) return 1; return h < 5 ? 1.3 : h < 6 ? 1.2 : h < 7 ? 1.1 : h <= 9 ? 1 : .95; };
const headHours = (h, load) => Math.round(Math.min(96, (BIG_HEADS.has(h) ? 48 : 36) + 7 * Math.max(0, load - 3)));
// hours until each trained muscle group is ready to train hard again (≥80 %, same rule as the recovery map)
const readyHours = (h, l) => { const f = Math.min(1, l / 6); return f > .2 ? Math.round(headHours(h, l) * (1 - .2 / f)) : 0; };
function estimateRecovery(ses){ const L = headLoads(ses), g = {};
  Object.entries(L).forEach(([h, l]) => { if(l < .5) return; const gr = HEADS[h][2]; g[gr] = Math.max(g[gr] || 0, readyHours(h, l)); }); return g; }
function headFatigue(atTs){
  const out = {};
  const list = sessions.concat(active ? [{ ...active, end: new Date().toISOString() }] : []);
  list.forEach(s => {
    const end = new Date(s.end || s.start).getTime(), hrs = (atTs - end) / 3.6e6; if(hrs < 0 || hrs > 144) return;
    Object.entries(headLoads(s)).forEach(([h, l]) => { const gr = HEADS[h][2], base = headHours(h, l);
      const est = (s.recovEst || {})[gr], rh = s.recov && s.recov[gr] && est > 0 ? Math.max(base * .5, Math.min(144, base * s.recov[gr] / est)) : base;
      const rhs = rh * sleepFactor(end);
      out[h] = Math.min(1, (out[h] || 0) + Math.min(1, l / 6) * Math.max(0, 1 - hrs / rhs)); });
  });
  return out;
}
async function aiRecovery(ses){
  const est = ses.recovEst || estimateRecovery(ses), groups = Object.keys(est); if(!groups.length) return null;
  const lines = ses.exercises.map(x => { const ex = exById(x.exId); return `${ex.name || ex.id} [${Object.entries(ex.mu || {}).map(([h, v]) => `${h} ${v}%`).join(', ')}]: ` +
    x.sets.map(s => `${s.w || 0}kg×${s.r || 0}${s.type === 'F' ? ' (to failure)' : s.type === 'D' ? ' (drop set)' : s.type === 'W' ? ' (warm-up)' : ''}`).join(', '); }).join('\n');
  const prompt = `You are an experienced strength coach. Estimate how many hours each muscle group needs after this workout until it can be trained hard again (about 80% recovered).
Consider total volume per muscle, sets taken to failure, drop sets, heavy eccentric (lowering) work and rep ranges. Lifter: ${bodyW()} kg, goal: ${(targets && targets.goal) || 'bulk'}.
Muscle groups to rate: ${groups.join(', ')}. A simple formula estimated: ${JSON.stringify(est)}.
Workout:
${lines}
Return ONLY JSON: {"hours":{${groups.map(g => `"${g}":number`).join(',')}},"note":"one short sentence for the lifter, in ${lang === 'el' ? 'Greek' : 'English'}"}. Each value between 0 and 120.`;
  const d = await gemini(prompt, null, null, null, { quiet: true }); const hrs = d && d.hours; if(!hrs) return null;
  const out = {}; groups.forEach(g => { const v = +hrs[g]; out[g] = v >= 0 && v <= 120 ? Math.round(v) : est[g]; });
  return { hours: out, note: String(d.note || '').slice(0, 220) };
}

function groupReadiness(atTs){
  const f = headFatigue(atTs);   // 0.6.9: from your workouts only (the "how sore are you" sheet is gone)
  const out = {};
  Object.entries(GROUPS).forEach(([g]) => { if(g === 'cardio' || g === 'other') return;
    const hs = Object.keys(HEADS).filter(h => HEADS[h][2] === g); let r = Math.min(...hs.map(h => 1 - (f[h] || 0)));
    out[g] = r; });
  return out;
}

// 0.7.4.2: ONE function decides the recovery state, from the hours left, so the colour and the hours text always agree:
// more than 24 h left = low (red, Needs Rest) · 1-24 h = mid (yellow, Recovering) · recovered = ok (green, Ready)
let _recMapAt = 0, _recMapV = null;
function recMapNow(){ if(!_recMapV || Date.now() - _recMapAt > 30000){ _recMapV = recMap(); _recMapAt = Date.now(); } return _recMapV; }
// 0.7.9.5: the sore-muscle state of one exercise, from recMap() (the one source): { h, st } when Needs Rest or Recovering, else null
function exSore(exId){ const ex = exById(exId), hd = HEADS[ex.h], v = hd && recMapNow()[hd[2]]; return v && v.st !== 'ok' ? v : null; }
const recStateH = h => h > 24 ? 'low' : h > 0 ? 'mid' : 'ok';
function recMap(){
  const now = groupReadiness(Date.now()), gs = Object.keys(now), hrs = {};
  for(let h = 0; h <= 120 && Object.keys(hrs).length < gs.length; h += 2){ const rd = groupReadiness(Date.now() + h * 3.6e6); gs.forEach(g => { if(!(g in hrs) && rd[g] >= .8) hrs[g] = h; }); }
  return Object.fromEntries(gs.map(g => { const h = g in hrs ? hrs[g] : 120; return [g, { h, st: recStateH(h), col: recColor(h), p: now[g] }]; })); }
// 0.7.7: a smooth gradient instead of stages: green (ready) → yellow (24 h left) → red (3 days or more left). The label still follows recStateH.
const recMix = (a, b, p) => `color-mix(in srgb, ${b} ${Math.round(Math.max(0, Math.min(1, p)) * 100)}%, ${a})`;
const recColor = h => h <= 0 ? REC_COL.ok : h <= 24 ? recMix(REC_COL.ok, REC_COL.mid, h / 24) : recMix(REC_COL.mid, REC_COL.low, (h - 24) / 48);
const recFill = m => Object.fromEntries(Object.entries(m).map(([g, v]) => [g, v.col])), recLows = m => new Set(Object.entries(m).filter(([, v]) => v.st === 'low').map(([g]) => g));

function tplGroups(tp){ const s = new Set(); tp.exercises.forEach(e => Object.entries(exById(e.exId).mu).forEach(([h, v]) => { if(v >= 40 && HEADS[h] && HEADS[h][2] !== 'cardio') s.add(HEADS[h][2]); })); return [...s]; }

function recoveryWarnings(){
  const out = [], tk = todayKey(), tm = addDays(tk, 1), wName = w => t({ legs: 'wLegs', upper: 'wUpper', full: 'wFull', cardio: 'wCardio' }[w] || 'wUpper');
  const pt = planFor(tm), tp = pt && pt.tpl && tpls.find(x => x.id === pt.tpl);
  if(tp && tp.type !== 'cardio'){ const at = new Date(`${tm}T${pt.time || '18:00'}:00`).getTime(), rd = groupReadiness(at);
    const bad = tplGroups(tp).filter(g => rd[g] < .8); if(bad.length) out.push(t('recWarnTomorrow', { w: tp.name, t: pt.time || '18:00', m: bad.map(g => ML(g)).join(', '), p: Math.round(Math.min(...bad.map(g => rd[g])) * 100) })); }
  const di = dayInfo(tk);
  if(di.type === 'rest'){ const rd = groupReadiness(Date.now()), bad = Object.keys(rd).filter(g => rd[g] < .8); if(bad.length) out.push(t('recRestDay', { m: bad.map(g => ML(g)).join(', ') })); }
  return out;
}

// Recovery (0.7.4.2): an information screen — front and back side by side, nothing on it reacts to taps.
// Colours are always green / yellow / red, whatever the theme: Ready / Recovering / Needs Rest.
function recFigure(){ const m = recMap();
  return anatomySVG({ mode: 'rec', colors: recFill(m), lows: recLows(m), w: 200, h: 446, idp: 'rec', front: t('front'), back: t('backSide') }); }
// 0.7.9.1: does the food since the last workout support recovery? ALL the rules live in recFoodVerdict() so the AI coach brain
// (docs/notes/ai-coach-brief.md) can replace them later with the researched rules. Reads the food log and targets, nothing new is stored.
// Returns null (say nothing) or { v: 'ok' | 'bit' | 'low', tip, gap? }.
function recFoodVerdict(){
  const last = sessions.slice().sort((a, b) => (b.end || b.start).localeCompare(a.end || a.start))[0]; if(!last || !targets) return null;
  const endTs = new Date(last.end || last.start).getTime(); if(Date.now() - endTs > 48 * 36e5) return null;   // the recovery window: up to ~48 h after the workout
  const wDay = last.date, today = todayKey(), now = new Date(), nowH = now.getHours() + now.getMinutes() / 60, wH = new Date(endTs).getHours() + new Date(endTs).getMinutes() / 60;
  const tg = targetFor(today); if(!tg || !tg.p || !tg.k) return null;
  // RULE 1: nothing logged today is UNKNOWN, not zero. Then today is left out and the window ends with the last day that has food (yesterday).
  const todayFood = (dayLog[today] || []).length > 0, endDay = todayFood ? today : addDays(today, -1);
  if(endDay < wDay) return null;   // the workout was today and nothing is logged yet: nothing to judge
  // RULE 2: how much of a normal day's eating is "due" by a given hour (not a flat share: breakfast is small, dinner is big)
  const due = h => { const pts = [[6, 0], [9, .2], [13, .5], [19, .8], [22, 1]]; if(h <= pts[0][0]) return 0; for(let i = 1; i < pts.length; i++) if(h <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (h - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); return 1; };
  let exp = 0, p = 0, k = 0, n = 0;
  for(let d = wDay; d <= endDay; d = addDays(d, 1)){
    const from = d === wDay ? wH : 0, to = d === today ? nowH : 24, hm = d === wDay ? new Date(endTs).toTimeString().slice(0, 5) : '';
    exp += Math.max(0, due(to) - due(from));
    (dayLog[d] || []).filter(e => !hm || (e.time || '') >= hm).forEach(e => { n++; p += +e.p || 0; k += +e.kcal || 0; }); }
  if(exp < .15) return null;   // too early in the window to say anything useful
  if(!n) return null;   // no food logged in the window at all: unknown, not zero
  // RULE 3: compare with the targets pro-rated by that share; the weaker of protein and calories decides
  const r = Math.min(p / (tg.p * exp), k / (tg.k * exp)), v = r >= .85 ? 'ok' : r >= .6 ? 'bit' : 'low';
  // RULE 4: one tip when low; exact grams only when the day is mostly over
  const dayOver = todayFood && nowH >= 21;
  return { v, tip: v === 'low' ? (!todayFood ? 'recTipToday' : nowH >= 20 ? 'recTipTomorrow' : 'recTipTonight') : '', gap: v !== 'ok' && dayOver ? Math.max(0, Math.round(tg.p * exp - p)) : 0 };
}
function recFoodLine(){ const r = recFoodVerdict(); if(!r) return '';
  return `<div class="alert" style="cursor:default;margin-bottom:12px"><b>${t({ ok: 'recVOk', bit: 'recVBit', low: 'recVLow' }[r.v])}</b>${r.tip ? ' · ' + t(r.tip) : ''}${r.gap > 0 ? ' · ' + t('recGap', { g: r.gap }) : ''}</div>`; }
function renderRecovery(){
  const m = recMap(), C = { ok: REC_COL.ok, mid: REC_COL.mid, low: REC_COL.low };
  const all = Object.entries(m).sort((a, b) => b[1].h - a[1].h);   // 0.7.9.1: every muscle, state + hours left ("Needs Rest · 48 h", "Recovering · 14 h", "Ready"), always hours
  const row = ([g, v]) => `<div class="recrow"><span class="rn">${esc(ML(g))}</span><span class="rs ${v.st}">${v.st === 'ok' ? t('recReady') : `${t(v.st === 'low' ? 'recLow' : 'recMid')} · ${v.h} h`}</span></div>`;
  $('gRecV').innerHTML = `<div class="reccard" id="recFig">${recFigure()}</div>
    <div class="recgrad" aria-hidden="true"><i style="background:linear-gradient(90deg,${C.ok},${C.mid},${C.low})"></i><span><small>${t('recReady')}</small><small>${t('recLow')}</small></span></div>
    ${recFoodLine()}
    <div class="reclist">${all.map(row).join('')}</div>
    <p class="hint">${t('recHint')}</p>`;
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
    else if(mode === 'mu'){ const v = gymBmVal(hs, mu); if(v > 0){ cls = 'gbm-on'; op = .35 + .65 * Math.min(1, v / max); } else cls = 'gbm-off'; }
    else if(mode === 'pick'){ if(on) fill = HEAD_COL[h]; else cls = 'gbm-off'; }
    else fill = HEAD_COL[h];
    return `<path d="${d}"${cls ? ` class="${cls}"` : ''}${fill ? ` fill="${fill}"` : ''}${op < 1 ? ` fill-opacity="${op.toFixed(2)}"` : ''}${tap ? ` data-hh="${h}" data-g="${g}" style="cursor:pointer"` : ' style="pointer-events:none"'}/>`; };
  const fig = (side, ox, label) => `<g transform="translate(${ox} 0)"><path class="gbm-edge" d="${GYM_BM[side].base}" style="pointer-events:none"/><path class="gbm-base" d="${GYM_BM[side].base}" style="pointer-events:none"/>${GYM_BM[side].mus.map(shape).join('')}
      ${o.labels === false || o.side ? '' : `<text x="100" y="460" text-anchor="middle" fill="var(--t-muted)" font-size="13" font-family="var(--font)">${label}</text>`}</g>`;
  if(o.side){
    const vb1 = o.half === 'up' ? '24 4 152 250' : o.half === 'low' ? '24 196 152 250' : '0 0 200 446';
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
    if(mode === 'mu') return (o.mu || {})[h] > 0 ? '#c6f432' : '#3a4048';   // how much each head works: lime, brighter = more
    if(mode === 'pick'){ const reg = o.groupRegion ? o.groupRegion(g) : null; return !region || reg === region ? HEAD_COL[h] : '#3a4048'; }
    return HEAD_COL[h]; };
  const live = h => mode === 'rec' || mode === 'plain' || !region || (o.groupRegion && o.groupRegion(ANAT_HEAD_GROUP[h]) === region);
  const fem = o.fem !== undefined ? o.fem : profile.sex === 'f', W_ = d => fem ? femWarp(d) : d;
  const half = side => ANAT[side].map(([h, d]) => `<path d="${W_(d)}" class="${mode === 'rec' && o.lows && o.lows.has(ANAT_HEAD_GROUP[h]) ? 'mlow' : ''}" data-hh="${live(h) ? h : ''}" data-g="${live(h) ? ANAT_HEAD_GROUP[h] : ''}" fill="${fill(h)}" fill-opacity="${mode === 'mu' ? ((o.mu || {})[h] > 0 ? .3 + .7 * Math.min(1, o.mu[h] / (o.muMax || 60)) : .5) : live(h) ? .95 : .45}" stroke="#0d0f12" stroke-width="1.3" stroke-linejoin="round" style="${mode === 'mu' && (o.mu || {})[h] > 0 ? 'fill:var(--t-accent);' : ''}${live(h) ? 'cursor:pointer' : 'pointer-events:none'}"/>` +
      `<path d="${d}" fill="url(#${idp}shade)" style="pointer-events:none"/>`).join('') +
    `<path d="${W_(ANAT_FIBRES[side])}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width=".8" stroke-linecap="round" style="pointer-events:none"/>`;
  const skin = `<g fill="#2b3036" stroke="#1a1d21" stroke-width="1" style="pointer-events:none">${ANAT_SKIN.map(d => `<path d="${W_(d)}"/>`).join('')}${ANAT_SKIN_ELL.map(([cx, cy, rx, ry]) => `<ellipse cx="${fem ? femX(cx, cy) : cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`;
  const fig = (side, ox, label) => `<g transform="translate(${ox} 0)">
      <g style="pointer-events:none">${fem ? '<path d="M78 40 C76 14 124 14 122 40 C124 62 126 78 118 86 L82 86 C74 78 76 62 78 40 Z" fill="#23272c"/>' : ''}<ellipse cx="100" cy="36" rx="${fem ? 19 : 21}" ry="${fem ? 24.5 : 26}" fill="#2b3036" stroke="#1a1d21"/><path d="M86 54 L114 54 L121 77 L79 77 Z" fill="#2b3036"/></g>
      ${skin}<g transform="translate(200 0) scale(-1 1)">${skin}</g>
      ${half(side)}<g transform="translate(200 0) scale(-1 1)">${half(side)}</g>
      ${o.labels === false || o.side ? '' : `<text x="100" y="438" text-anchor="middle" fill="#8b949c" font-size="13" font-family="system-ui">${label}</text>`}</g>`;
  if(o.side){   // one figure only (mini maps): front or back, whole or half
    const vb1 = o.half === 'up' ? '24 4 152 250' : o.half === 'low' ? '24 196 152 250' : '0 0 200 446';
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
        <input type="time" data-ptime value="${p.time || ''}" ${!p.tpl || p.tpl === 'rest' ? 'disabled' : ''}></div>
      ${p.work ? `<div class="dcrow"><span class="dcl lic">${gymIco('work', 18, 1.8)}</span><input type="time" data-wfrom value="${p.work.from}"><span class="rmeta">–</span><input type="time" data-wto value="${p.work.to}"><button class="irm" data-wrm aria-label="${t('remove')}">${svgIcon('x', 16, 2.2)}</button></div>`
        : `<button class="linkbtn" data-wadd>${t('addWork')}</button>`}</div>`; }).join('');
}

// Gym Buddy's own line icons (same stroke style as svgIcon): card = an old-console memory card (game save), work = a work bag
const GYM_ICON = {
  card: '<path d="M7.5 2h7.2L18 5.3v15.2a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5v-17A1.5 1.5 0 0 1 7.5 2z"/><rect x="8.5" y="5" width="6" height="5.5" rx="1"/><path d="M11.5 13.2l1.6 1.8h-3.2z"/><path d="M8.8 18.3v1.7M11 18.3v1.7M13.2 18.3v1.7M15.4 18.3v1.7"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h.01M17.2 17.2v3.3h3.3v-3.3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
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
function miniMap(x){
  const k = x.id + (profile.sex === 'f' ? 'f' : 'm'); if(MINI.has(k)) return MINI.get(k);
  const mu = x.mu || {}, sideOf = h => (profile.sex === 'f' ? ANAT.f.some(([hh]) => hh === h) : gymBmSides.f.has(h)) ? 'f' : 'b';
  let fr = 0, bk = 0, up = 0, low = 0; Object.entries(mu).forEach(([h, v]) => { if(sideOf(h) === 'f') fr += v; else bk += v; const g = (HEADS[h] || [])[2], r = (GROUPS[g] || [])[2]; if(r === 'low') low += v; else up += v; });
  const svg = anatomySVG({ mode: 'mu', mu, side: fr >= bk ? 'f' : 'b', half: low > up ? 'low' : 'up', muMax: Math.max(...Object.values(mu), 1), idp: 'mm' + x.id.replace(/\W/g, '') });
  MINI.set(k, svg); return svg;
}
const PK_IN = () => `<span class="exin" aria-hidden="true">${svgIcon('check', 18, 2.6)}</span>`;   // 0.7.9.6: already in this workout
function exTiles(list, key, vias, have){ have = have || new Set();
  return `<div class="exrows">${list.map(x => { const pct = key ? exScore(x, key) : (x.mu || {})[x.h] || 0;
    return `<button class="exrow${have.has(x.id) ? ' in' : ''}" data-ex="${x.id}" style="--eq:${EQ_COL[x.e] || '#8b949c'}"><span class="mm">${isCardio(x.id) ? exIcon(x, 40) : miniMap(x)}</span>
      <span class="exn"><b>${esc(exName(x))}</b>${vias && vias[x.id] ? `<small class="exalso">${t('exAlso', { n: esc(exTitle(vias[x.id])) })}</small>` : ''}<small>${eqIcon(x.e, 13)} ${EL(x.e)}${isCardio(x.id) ? '' : ` · ${t('muUse', { p: pct })}`}</small></span>${have.has(x.id) ? PK_IN() : ''}<span class="iinfo" data-exinfo="${x.id}" role="button" aria-label="${t('gInfoL')}">${svgIcon('info', 18, 2)}</span></button>`; }).join('')}</div>`;
}

function exTilesByEq(list, key, have){
  return EQ_ORDER.filter(e => list.some(x => x.e === e)).map(e => `<div class="eqhead" style="color:${gymInk(EQ_COL[e])}">${eqIcon(e, 18)} ${EL(e)}</div>${exTiles(list.filter(x => x.e === e), key, null, have)}`).join('');
}
// 0.7.9.6 List view: every exercise of the region, grouped by muscle. Even rows: the equipment icon on the left, the name, then muscle · equipment
// in grey. A muscle's heading opens that muscle (its parts and equipment filters), like tapping it on the body
function exListByGroup(region, have){
  return Object.keys(GROUPS).filter(k => GROUPS[k][2] === region).map(k => {
    const l = EX().filter(x => x.m === k).sort((a, b) => exHistory(b.id).length - exHistory(a.id).length); if(!l.length) return '';
    return `<button type="button" class="pkgh" data-grp="${k}"><b>${esc(ML(k))}</b><small>${t('nEx', { n: l.length })}</small><span class="pkchev" aria-hidden="true">${svgIcon('back', 16, 2.4)}</span></button>
      <div class="exrows">${l.map(x => `<button class="exrow eqrow${have.has(x.id) ? ' in' : ''}" data-ex="${x.id}" style="--eq:${EQ_COL[x.e] || '#8b949c'}"><span class="mm">${eqIcon(x.e, 24)}</span>
      <span class="exn"><b>${esc(exName(x))}</b><small>${esc(ML(x.h))} · ${EL(x.e)}</small></span>${have.has(x.id) ? PK_IN() : ''}<span class="iinfo" data-exinfo="${x.id}" role="button" aria-label="${t('gInfoL')}">${svgIcon('info', 18, 2)}</span></button>`).join('')}</div>`; }).join('');
}

// 0.7.9: cardio list starts with the machines people use most
const CARDIO_FIRST = ['treadmill', 'bike', 'rower', 'elliptical', 'stairs', 'walking'], cardioRank = id => { const i = CARDIO_FIRST.indexOf(id); return i < 0 ? 99 : i; };
function drawExPick(){
  const q = norm($('exSearch').value), tokens = q.split(' ').filter(Boolean), have = pkHave();
  setSeg('#pkRegion', PK.region); setSeg('#pkMode', PK.mode);
  const mapv = !q && PK.region !== 'cardio' && !PK.group && PK.mode === 'map'; $('pkBody').classList.toggle('pkmapmode', mapv);
  $('pkModeRow').classList.toggle('hide', !!q || PK.region === 'cardio' || !!PK.group);
  let h = '';
  if(q){
    const vias = {};   // 0.7.5: best matches first; an "also: …" line shows when it matched another name
    const list = EX().map((x, i) => ({ x, i, r: exMatch(x, q, `${ML(x.h)} ${ML(x.m)} ${EL(x.e)} ${(HEADS[x.h] || []).join(' ')}`) })).filter(o => o.r.s).sort((a, b) => b.r.s - a.r.s || exName(a.x).length - exName(b.x).length || a.i - b.i).slice(0, 80).map(o => { if(o.r.via) vias[o.x.id] = o.r.via; return o.x; });
    h = (list.length ? exTiles(list, null, vias, have) : `<p class="pknone">${t('pkNone', { q: esc($('exSearch').value.trim()) })}</p>`) + `<button class="sitem" data-new style="margin-top:10px"><span class="e">${svgIcon('plus', 20, 2)}</span><span class="t"><b>${t('createEx', { q: esc($('exSearch').value.trim()) })}</b><small>${ML(PK.group || 'other')}</small></span></button>`;
  } else if(PK.region === 'cardio'){
    h = exTiles(EX().filter(x => x.m === 'cardio').sort((a, b) => cardioRank(a.id) - cardioRank(b.id)), null, null, have);
  } else if(!PK.group){
    // 0.7.9.6: the body fills the space (theme: .pkmap sizes it by the room left, --ar = its width / height), the caption right under it
    if(PK.mode === 'map') h = `<div class="pkmap" style="--ar:${PK.region === 'low' ? 336 / 252 : 336 / 262}">${anatomySVG({ mode: 'pick', region: PK.region, groupRegion: g => (GROUPS[g] || [])[2], front: t('front'), back: t('backSide'), idp: 'pick', half: PK.region === 'up' || PK.region === 'low' ? PK.region : null, max: 900 })}<p class="pkcap">${t('tapMuscle')}</p></div>`;
    else h = exListByGroup(PK.region, have);
  } else {
    const heads = Object.entries(HEADS).filter(([, v]) => v[2] === PK.group).map(([k]) => k), key = PK.head || PK.group;
    let list = EX().filter(x => exScore(x, key) >= (PK.head ? 25 : 40) && x.m !== 'cardio').sort((a, b) => exScore(b, key) - exScore(a, key) || (exHistory(b.id).length - exHistory(a.id).length));
    const eqs = EQ_ORDER.filter(e => list.some(x => x.e === e));
    if(PK.eq) list = list.filter(x => x.e === PK.eq);
    h = `<div class="pkhead"><button class="pback" data-pkback>${svgIcon('back', 20, 2.4)}${t('allMuscles')}</button><h3 style="margin:0 0 8px;color:${gymInk(HEAD_COL[PK.head] || HEAD_COL[heads[0]])}">${esc(ML(PK.head || PK.group))}</h3></div>` +
      (heads.length > 1 ? `<div class="chips" style="margin-bottom:8px"><button class="fchip ${!PK.head ? 'on' : ''}" data-head="">${t('all')}</button>${heads.map(k => `<button class="fchip hchip ${PK.head === k ? 'on' : ''}" data-head="${k}" style="--hc:${HEAD_COL[k]}"><i></i>${esc(ML(k))}</button>`).join('')}</div>` : '') +
      `<div class="chips eqchips" style="margin-bottom:10px"><button class="fchip ${!PK.eq ? 'on' : ''}" data-eq="">${t('allEquip')}</button>${eqs.map(e => `<button class="fchip eqchip ${PK.eq === e ? 'on' : ''}" data-eq="${e}" style="--ec:${EQ_COL[e]};--eci:${gymInk(EQ_COL[e])}">${eqIcon(e, 15)} ${EL(e)}</button>`).join('')}</div>` +
      `<label class="advrow musort"><span>${t('sortByMu')}</span><input type="checkbox" id="pkSortMu" ${ui.pkSortMu ? 'checked' : ''}></label>` +
      (PK.eq || ui.pkSortMu ? exTiles(list, key, null, have) : exTilesByEq(list, key, have));   // grouped by equipment, or one list by muscle usage
  }
  $('pkBody').innerHTML = h;
  if(mapv && PK.lastH) document.querySelectorAll(`#pkBody path[data-hh="${PK.lastH}"]`).forEach(p => p.classList.add('pkhit'));   // the muscle you came back from stays lit
  if(q){ const sh = $('ovExPick').querySelector('.sheet'); sh.scrollTop = 0; $('pkBody').scrollTop = 0; }   // 0.7.9: the best match stays in view on every keystroke
}

// gym-day card on Today (0.6.9): can't be hidden (no ✎ / ✕); the pills sit on the right.
// With no gym time set, tapping anywhere else on the card opens the time picker.
// 0.7.2: the diagonal Workouts icon on the left; Start (today only) next to Skip opens today's planned workout in one tap; Resume while one is running.
function renderTodayRec(){
  const el = $('dRec'); if(el) el.innerHTML = '';
  const isToday = daysUntil(curDay) === 0, di = dayInfo(curDay), pl = planFor(curDay);
  const tp = pl && pl.tpl && tpls.find(x => x.id === pl.tpl), nm = tp ? tp.name : t('gymAny'), lines = [];
  let skip = '', noTime = false;
  if(di.type === 'gym'){ const tm = (pl && pl.type === 'gym' && pl.time) || (days[curDay] && days[curDay].time) || ''; noTime = !tm;
    lines.push(`<b>${t('remGymNoT')}</b>` + (tm ? '' : `<small class="rmhint">${t('remSetT')}</small>`));
    const live = active && active.date === curDay;
    if(isToday && live) skip = `<button class="gymstartbtn" type="button" data-gymresume>${t('gymResumeP')}</button>`;
    else if(!live) skip = (isToday && !active ? `<button class="gymstartbtn" type="button" data-gymstart>${t('gymStartP')}</button>` : '') + `<button class="skipbtn" type="button" data-skipday>${t('skipGym')}</button>`; }
  else if(days[curDay] && days[curDay].skipped){ lines.push(`<b>${t('gymSkipped')}</b>`); skip = `<button class="skipbtn" type="button" data-unskip>${t('undo')}</button>`; }   // rest-day calories and macros today
  const sk = di.type === 'gym' && isToday ? gymStreak().n : 0; if(sk && lines.length) lines[0] = `<span class="gymtitle">${lines[0].replace(/<small.*$/, '')}<span class="gymstreak">${flameIcon(sk, 14)}<b>${sk}</b></span></span>` + (lines[0].match(/<small.*$/) || [''])[0];
  const ws = isToday ? recoveryWarnings() : [];
  const ic = lines.length ? `<span class="gymdayic">${svgIcon('workouts', 22, 1.8)}</span>` : '';
  $('dBlocks').innerHTML = lines.length || ws.length ? `<div class="remind ${noTime ? 'notime' : ''}">${noTime ? `<input type="time" class="remtime" id="dRemTime" aria-label="${t('remSetT')}">` : ''}${ic}<div class="rmtxt">${lines.map(l => `<div>${l}</div>`).join('')}${ws.map(w => `<div class="rmrec" data-gorec><span class="ric">${svgIcon('bolt', 14, 2)}</span>${w}</div>`).join('')}</div>${skip ? `<div class="gymdaybtns">${skip}</div>` : ''}</div>` : '';
}

// Start on the gym-day card: today's planned workout straight away; no plan → the same Saved Workouts sheet as the Gym tab's Start
function gymStartToday(){
  if(active) return openSession();
  const pl = planFor(todayKey()), tp = pl && pl.tpl && tpls.find(x => x.id === pl.tpl);
  if(tp || !tpls.length) return startSession(tp || null);
  $('gStart').click();
}

// ---------- workout streak (0.7.7) ----------
// Worked out from saved sessions + the plan, never from timers, so it is right after days of the app being closed.
// Planned gym days count; rest days never break it; a workout on a rest day adds to it; only a skipped (or missed) planned gym day breaks it.
// A skipped day that used the weekly freeze (days[d].frozen) does not break it.
function gymPlanned(d){ const o = days[d]; if(o) return o.type === 'gym' || !!o.skipped; const pl = planFor(d); return !!(pl && pl.type === 'gym'); }
function gymStreak(){
  const today = todayKey(), counts = {}; sessions.forEach(s => { counts[s.date] = (counts[s.date] || 0) + 1; });
  const first = Object.keys(counts).sort()[0]; if(!first) return { n: 0 };
  let n = 0;
  for(let d = today, i = 0; d >= first && i < 800; d = addDays(d, -1), i++){
    if(counts[d]){ n += counts[d]; continue; }
    if(d === today) continue;                                        // today is still open
    if(gymPlanned(d) && !(days[d] && days[d].frozen)) break;         // a planned gym day with no workout
  }
  return { n };
}
// the one streak freeze of the week (Monday to Sunday) around a date
function freezeLeft(d){ const wd = (new Date(d + 'T12:00:00').getDay() + 6) % 7, mon = addDays(d, -wd);
  return [0, 1, 2, 3, 4, 5, 6].some(i => { const o = days[addDays(mon, i)]; return o && o.frozen; }) ? 0 : 1; }
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
const tierBadge = tf => `<button type="button" class="tierbadge tr-${tf.tier}" data-tierinfo aria-label="${esc(tf.label)}">${rankIcon(tf.tier, tf.n, 26)}</button>`;
// 0.7.10: tap the rank → a bubble with a bar in the current tier's colour that fills towards the next level; the kg still needed written once.
// Current rank icon at the left end, the next one at the right; at Diamond 1 the bar is full and says so.
function showTierGap(btn){ const x = exAt(btn), tf = x && tierFor(x.exId); if(!tf || !tf.label) return;
  hideTip(); const p = document.createElement('div'); p.className = 'tippop tiergap'; p.id = 'tipPop'; p.setAttribute('role', 'tooltip'); p.style.zIndex = zTop + 50;
  p.setAttribute('aria-label', `${tf.label} · ${tf.next ? t('tierGap', { kg: fmt(tf.next.kg), tier: tf.next.label }) : t('tierTop')}`);
  p.innerHTML = tierBarHtml(tf);
  document.body.appendChild(p);
  const r = btn.getBoundingClientRect(), w = p.offsetWidth;
  p.style.left = Math.max(16, Math.min(innerWidth - w - 16, r.left)) + 'px'; p.style.top = (r.bottom + 8) + 'px'; }
// the kg still needed, then [current plate] bar in the tier colour [next plate]; shared by the rank bubble and the Rank Up window (rank-fx.js)
function tierBarHtml(tf){ const nx = tf.next, pct = nx ? Math.max(0, Math.min(100, tf.frac * 100)) : 100, end = (tier, n, lbl) => `<span class="tgend">${rankIcon(tier, n, 20)}<small>${esc(lbl)}</small></span>`;
  return `<b class="tgkg">${nx ? esc(t('tierGapKg', { kg: fmt(nx.kg) })) : esc(t('tierTop'))}</b>
    <div class="tgrow tr-${tf.tier}">${end(tf.tier, tf.n, tf.label)}<span class="tgbar"><i style="transform:scaleX(${(pct / 100).toFixed(3)})"></i></span>${nx ? end(nx.tier, nx.n, nx.label) : ''}</div>`; }
// → null (no tiers for this lift) · { need: true } (body weight or sex missing) · { none: true } (no sets yet)
// · { n (0–14), tier, label, frac (0…1 along this level), next?: { n, tier, label, kg (estimated 1RM still needed) } }
// e1 (optional): a real 1RM from elsewhere (Profile › Add a 1RM); it counts as your peak, or as a normal trainee's if there are no workouts
// noLive: leave the workout in progress out (the rank as of the last saved workout)
function tierFor(exId, e1, noLive){ const std = tierStd(exId); if(!std) return null; const body = tierBody(); if(!body) return { need: true };
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
function curEx(){ const ex = active.exercises; if(active.cur != null && ex[active.cur]) return active.cur; return ex.findIndex(x => !x.ended); }
function isOpenEx(i){ const c = curEx(), x = active.exercises[i], y = active.exercises[c]; return i === c || !!(x && y && x.ss && x.ss === y.ss); }

// per-set extras (switched on in Exercise Settings): half reps, negatives, reps in reserve 0–5. Optional fields on the set, so old data needs no change.
// 0.7.9.1: a ticked set shows only the finished row; the values stay saved on the set (recovery, Gym Coach and AI.knows read them). Reopen the set to edit them.
function extrasHtml(s, j){ const G = gx(); if(!(gOn('half') || gOn('neg') || gOn('rir')) || s.type === 'W' || s.done) return '';
  const num = (k, lbl, v) => `<label class="sxn"><span>${lbl}</span><input data-sx="${k}" inputmode="numeric" value="${v ?? ''}" placeholder="0" aria-label="${lbl}"></label>`;
  return `<div class="setx" data-sxrow="${j}">${gOn('half') ? num('hr', t('halfReps'), s.hr) : ''}${gOn('neg') ? num('ng', t('negReps'), s.ng) : ''}${gOn('rir') ? `<div class="sxr" role="group" aria-label="${t('rirL')}"><span>${t('rirL')}</span>${[0, 1, 2, 3, 4, 5].map(k => `<button data-rir="${k}" class="${s.rir === k ? 'on' : ''}" aria-pressed="${s.rir === k}">${k}</button>`).join('')}</div>` : ''}</div>`; }

// the one Exercise Settings sheet (same for every exercise)
function openExSet(){ drawExSet(); open('ovExSet'); }
function drawExSet(){ const G = gx(), row = (k, a, b) => `<div class="exsrow"><div><b>${t(a)}</b><small>${t(b)}</small></div><button class="switch ${gOn(k) ? 'on' : ''}" data-gx="${k}" type="button" role="switch" aria-checked="${gOn(k)}" aria-label="${t(a)}"><i></i></button></div>`;
  const mk = [['W', t('mkW')], ['D', t('mkD')], ['F', t('mkF')]].map(([k, l]) => `<button type="button" class="mkopt${hideM(k) ? ' off' : ''}" data-hm="${k}" aria-pressed="${!hideM(k)}">${l}</button>`).join('');
  $('exsBody').innerHTML = `<h3 class="exsh first">${t('exsVisH')}</h3>` + row('lbAtt', 'atTitle', 'atSub') + row('rank', 'exsRank', 'exsRankS') + row('warnSore', 'exsWarn', 'exsWarnS') + row('uniPill', 'exsUniPill', 'exsUniPillS') + row('formPill', 'exsFormPill', 'exsFormPillS') + row('swapPill', 'exsSwapPill', 'exsSwapPillS') + row('tips', 'exsTips', 'exsTipsS') +
    `<h3 class="exsh">${t('exsExtH')}</h3>` + row('uniBoth', 'exsUni', 'exsUniS') +
    `<div class="exsrow mkrow"><button type="button" class="mkhead" data-hmopen aria-expanded="${EXS_MK}"><span><b>${t('exsMarks')}</b><small>${t('exsMarksS')}</small></span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>${EXS_MK ? `<div class="mklist">${mk}</div>` : ''}` + row('half', 'halfReps', 'exsHalfS') + row('neg', 'negReps', 'exsNegS') + row('rir', 'exsRir', 'exsRirS') + row('sound', 'exsSound', 'exsSoundS'); }

function cardHtml(x, i){
  const ex = exById(x.exId), card = isCardio(x.exId), sc = x.ss ? ssColor(active.exercises, x.ss) : null;
  const doneN = x.sets.filter(s => s.done && isMainSet(s)).length, fresh = !x.ended && !x.sets.some(s => s.done);
  const ssl = sc ? `<div class="sslbl">${t('superset')}</div>` : '', ssStyle = sc ? ` style="--ssc:${sc}"` : '';
  if(!x.ended && !isOpenEx(i)){   // short card: tap to open (0.7.4.2: a finished exercise stays open with its sets)
    const n = x.ended ? doneN : x.sets.filter(z => isMainSet(z) && !(z.auto && !z.done)).length;   // the waiting auto set doesn't count
    return `<div class="exc mini ${x.ended ? 'ended' : ''} ${sc ? 'ss' : ''}" data-x="${i}" data-openex${ssStyle}>${ssl}<div class="mtxt"><b>${esc(exName(ex))}</b><small>${ML(ex.h)} · ${EL(ex.e)} · ${t('nSets', { n })}</small></div>${fresh && gOn('swapPill') ? `<button class="swapq" data-replace aria-label="${t('swapEx')}">${ICO_SWAP.replace(/width="12" height="12"/, 'width="16" height="16"')}</button>` : ''}</div>`;
  }
  const sug = suggestFor(x.exId, x.reps), vol = Math.round(exVol(x.exId, x.sets));
  const tf = card ? null : tierFor(x.exId), tierNeed = tf && tf.need ? `<button class="tierneed" type="button" data-tierbody>${t('tierNeedBody')}</button>` : '';
  const uniPill = card || ex.e === 'barbell' || !gOn('uniPill') ? '' : `<button class="pill2 uni ${x.uni ? 'on' : ''}" data-uni aria-pressed="${!!x.uni}" aria-label="${t('uniT')}">L | R</button>`;
  const sore = !card && gOn('warnSore') ? exSore(x.exId) : null;
  // 0.7.10: the top row of the card: on the left the rank badge, then the sore-muscle warning (each only if switched on); the gear stays top right. The title gets the full width below
  const rk = tf && tf.label && gOn('rank'), head = `<div class="extop${rk || sore ? ' has' : ''}"><span class="extier" data-tier>${rk ? tierBadge(tf) : ''}${sore ? `<button type="button" class="sorewarn" data-tip="sore${i}" data-tip1="${esc(t('soreBub', { m: ML(ex.h), p: Math.round(sore.p * 100) }))}" data-tip2="${esc(t('soreBubH', { h: Math.ceil(sore.h) }))}" aria-label="${esc(t('soreBub', { m: ML(ex.h), p: Math.round(sore.p * 100) }))}">${svgIcon('warn', 20, 2.2)}</button>` : ''}</span><button type="button" class="exgear" data-exset aria-label="${t('exSettings')}">${svgIcon('settings', 20, 2)}</button></div><div class="exhead">${atAvail(x) ? `<button type="button" class="attbtn${x.attempt ? ' on' : ''}" data-attempt aria-pressed="${!!x.attempt}" aria-label="${esc(t('atBtn'))}">${ICO_TROPHY}</button>` : ''}<span class="exnrow"><b class="exname${atOn(x) ? ' gold' : ''}" data-info>${esc(exName(ex))}</b></span>
      <small>${ML(ex.h)} · ${EL(ex.e)}${x.t0 ? ` · <span class="xt" data-xt="${i}">${exTime(x)}</span>` : ''}</small>${tierNeed}
      <div class="expills${uniPill || gOn('formPill') || (!card && gOn('swapPill')) ? '' : ' hide'}">${uniPill}${gOn('formPill') ? `<button class="pill2" data-demo>${ICO_EYE}${t('formPill')}</button>` : ''}${card || !gOn('swapPill') ? '' : `<button class="pill2" data-swap>${ICO_SWAP}${t('swapPill')}</button>`}</div></div>`;
  // 0.6.9: a suggestion line only on an exercise you're doing for the first time ("last time / try" is gone; the grey hints in the boxes stay)
  let info = '';
  if(gOn('tips') && !x.ended && sug && sug.est && !x.sets.some(s => s.done)) info = t('estNew', { w: fmt(sug.w), r: sug.r });
  const G = gx(), hasWarm = x.sets.some(s => s.type === 'W'), wu = !hideM('W') && !x.ended && sug && (!sug.first || sug.est) && !hasWarm && !x.sets.some(s => s.done) ? warmupFor(x.exId, sug.w) : [];
  let n = 0, prevVals = null;
  const rows = x.sets.map((s, j) => {
    if(isMainSet(s)) n++;
    let ph = s.type === 'W' ? {} : prevVals ? prevVals : (sug && (!sug.first || sug.est) ? { w: sug.w, r: String(sug.r).split('-').pop() } : sug && sug.last ? { w: sug.last.top.w, r: sug.last.top.r } : {});
    if(s.type !== 'W' && (s.w !== '' || s.r !== '')) prevVals = { w: s.w || ph.w, r: s.r || ph.r };
    if(gymBwDash(x.exId) && !(+ph.w > 0)) ph = { ...ph, w: '–' };   // bodyweight: your weight is counted for you; type only extra (belt) or assistance
    const box = k => `<div class="gymsbox"><button data-step="${k}" data-d="-1" aria-label="${t('gMinusL')}">−</button><input data-${k} inputmode="${k === 'w' ? 'decimal' : 'numeric'}" value="${s[k]}" placeholder="${ph[k] ?? (k === 'w' ? (card ? 'km' : 'kg') : (card ? 'min' : t('repsLbl')))}" aria-label="${k === 'w' ? t('kgLbl') : t('repsLbl')}"><button data-step="${k}" data-d="1" aria-label="${t('gPlusL')}">+</button></div>`;
    const ty = s.drop ? 'D' : s.type, base = s.drop ? 'D' : ty === 'N' ? n : ty, lbl = s.side ? `${base}/${s.side}` : base;
    const lastDrop = !hideM('D') && s.drop && !(x.sets[j + 1] && x.sets[j + 1].drop) && !x.ended;
    const restHere = REST && REST.xi === i && REST.si === j;
    if(card) return cardioRow(x, s, j) + (restHere ? restBracket() : '');
    const merge = gOn('uniBoth') && x.uni && s.side === 'L' && x.sets[j + 1] && x.sets[j + 1].side === 'R', mate = gOn('uniBoth') && x.uni && s.side === 'R' && j > 0 && x.sets[j - 1].side === 'L';   // 0.7.9.1: one tall tick spans the L and R rows
    const xtra = merge ? '' : (mate ? extrasHtml(x.sets[j - 1], j - 1) : '') + extrasHtml(s, j);
    return `<div class="setrow t-${ty}${merge ? ' lmerge' : ''}${mate ? ' rmate' : ''}${atOn(x) && s.type !== 'W' ? ' attset' : ''} ${s.done ? 'done' : ''} ${s.pr ? 'pr' : ''} ${s.drop ? 'drop' : ''} ${s.side ? 'pair' : ''} ${s.side === 'R' ? 'rside' : ''} ${SSNEXT && SSNEXT.xi === i && SSNEXT.si === j ? 'ssnext' : ''}" data-s="${j}">
        <button class="snum ${ty === 'N' ? 'tn' : 'tb'}" data-type aria-label="${t('tapNum')}">${lbl}</button>${box('w')}${atOn(x) && s.type !== 'W' ? '' : box('r')}
        <button class="sok" data-ok aria-label="${s.done ? t('setDoneL') : t('markDoneL')}">${ICO_TICK}</button></div>` + xtra +
      (lastDrop ? `<button class="adddrop" data-adddrop>${svgIcon('plus', 12, 2.6)} ${t('dropMore')}</button>` : '') + (restHere ? restBracket() : '');
  }).join('');
  return `<div class="exc open ${x.ended ? 'ended' : ''} ${sc ? 'ss' : ''}" data-x="${i}"${ssStyle}>${ssl}${head}
    ${info ? `<div class="exinfo">${info}</div>` : ''}
    ${wu.length ? `<div class="wuhint"><span>${t('warmupS', { s: wu.map(w => `${fmt(w.w)}×${w.r}`).join(' · ') })}</span><button data-warm>${t('addWarm')}</button></div>` : ''}
    ${x.sets.length && !card ? `<div class="sethead${atOn(x) ? ' attset' : ''}"><span>${t('setLbl')}</span><span>${card ? t('kmLbl') : t('kgLbl')}</span>${atOn(x) ? '' : `<span>${card ? t('minLbl') : t('repsLbl')}</span>`}<span></span></div>` : ''}
    ${rows}
    ${x.ended ? `<div class="exdone"><span class="exdt">${svgIcon('check', 16, 2.6)}${t('exDone')} · ${t('nSets', { n: doneN })}${card ? '' : ` · ${vol.toLocaleString()} kg`}${x.sets.some(s => s.pr === 'w') ? ' · ' + t('prWLine') : ''}${x.volPR ? ' · ' + t('prVLine') : ''}</span><button class="linkbtn" data-reopen>${t('reopenEx')}</button></div>`
      : `${card ? '' : `<button class="newset" data-addset>${t('newSetPill')}</button>`}<button class="endex2" data-endex>${t('endExPill')}</button>`}</div>`;
}

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
    return `<div class="tpcard ${sc ? 'ss' : ''}" data-i="${i}"${sc ? ` style="--ssc:${sc}"` : ''}>${sc ? `<div class="sslbl">${t('superset')}</div>` : ''}<div class="tph"><div class="ttl"><b class="tpname">${esc(exName(ex))}</b><small>${ML(ex.h)} · ${eqIcon(ex.e, 13)} ${EL(ex.e)}</small></div>
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

function openExInfo(id, addCb){
  const x = exById(id), mus = Object.entries(x.mu).sort((a, b) => b[1] - a[1]), L_ = lang === 'el' ? 1 : 0;
  const cues = (CUES[x.p] || []).map(c => c[L_]).concat(SPECIFIC[id] ? [SPECIFIC[id][L_]] : []), errs = (MISTAKES[x.p] || []).map(c => c[L_]);
  const h = exHistory(id), bestW = h.length ? Math.max(...h.flatMap(s => s.sets.map(z => +z.w))) : null, bestV = h.length ? Math.max(...h.map(s => exVol(id, s.sets.map(z => ({ ...z, done: true }))))) : null;
  $('eiBody').innerHTML = `<div class="row" style="align-items:center;justify-content:flex-start;gap:12px"><div><h2 style="margin:0">${esc(exName(x))}</h2><small class="rmeta">${EL(x.e)} · ${ML(x.m)}</small></div><button type="button" class="pill2 formb eiform" id="eiForm" aria-label="${t('formT')}">${ICO_EYE}${t('formPill')}</button></div>
    ${h.length ? `<p class="rmeta" style="margin:10px 0 0">${t('bestW')}: <b>${fmt(bestW)} kg</b> · ${t('bestV')}: <b>${Math.round(bestV).toLocaleString()} kg</b></p>` : ''}
    ${isCardio(id) ? '' : `<div class="eimap">${anatomySVG({ mode: 'mu', mu: x.mu, muMax: Math.max(...Object.values(x.mu), 1), front: t('front'), back: t('backSide'), idp: 'ei', max: 340 })}</div>`}
    ${isCardio(id) ? '' : `<button class="foldh" type="button" id="eiMoreB" aria-expanded="false"><b>${t('eiMore')}</b><i>${svgIcon('down', 18, 2)}</i></button>`}
    <div id="eiMore" class="${isCardio(id) ? '' : 'hide'}"><h3>${t('musclesWorked')}</h3>${mus.map(([k, v]) => `<div class="mrow"><small>${esc(ML(k))}</small><span class="mbar"><i style="width:${v}%;background:${(GROUPS[HEADS[k] ? HEADS[k][2] : 'other'] || GROUPS.other)[3]}"></i></span><b>${v}%</b></div>`).join('')}
    <p class="hint">${t('pctNote')}</p>
    ${cues.length ? `<h3 class="fph">${svgIcon('check', 16, 2.4)}${t('howTo')}</h3><ul class="feed">${cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${errs.length ? `<h3 class="fph warn">${svgIcon('warn', 16, 2.2)}${t('mistakesT')}</h3><ul class="feed fpx">${errs.map(c => `<li><span class="xred">${svgIcon('x', 14, 2.6)}</span>${esc(c)}</li>`).join('')}</ul>` : ''}</div>`;
  const mb = $('eiMoreB'); if(mb) mb.onclick = () => { const o = $('eiMore').classList.toggle('hide'); mb.classList.toggle('open', !o); mb.setAttribute('aria-expanded', String(!o)); };
  $('eiAdd').classList.toggle('hide', !addCb);
  $('eiAdd').onclick = () => { close('ovExInfo'); close('ovExPick'); addCb && addCb(id); };
  $('eiForm').onclick = () => openDemo(id);
  open('ovExInfo');
}

function renderGym(){
  const h = location.hash.slice(1), sec = GSEC[h] || null;
  $('gHub').classList.toggle('hide', !!sec);
  $('gBackBtn').classList.toggle('hide', !sec);
  $('gTabs').classList.toggle('hide', !sec || sec === 'rec');
  $('gTabs').querySelectorAll('[data-sec]').forEach(b => b.classList.toggle('on', b.dataset.sec === h));
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
  if(!sec){
    const rm = recMap(), colors = recFill(rm), lows = recLows(rm), low = Object.values(rm).filter(v => v.h > 0).length;
    $('gMiniRec').innerHTML = `<div class="rbhead"><b><span class="ric">${svgIcon('bolt', 16, 2)}</span>${t('hubRec')}</b><span>›</span></div>` + anatomySVG({ mode: 'rec', colors, lows, labels: false, max: 230, idp: 'mini' }) + `<small>${low ? t('recMid') + ' · ' + low : t('recReady')}</small>`;
    $('hubLibSub').textContent = tpls.length === 1 ? t('hubLibSub1') : t('hubLibSub', { n: tpls.length });
  }
  renderGymPlan(); renderTpls(); renderProgress(); if(sec === 'rec') renderRecovery();
  $('gOther').classList.toggle('hide', !!active || !tp || $('gStart').classList.contains('hide'));
}

// summary + recovery estimate (offline at once, AI refines it when there's a key)
function recBlock(ses, r, note){
  return `<div id="smRec"><h3><span class="ric">${svgIcon('bolt', 16, 2)}</span>${t('recEstT')}</h3><p class="hint" style="margin:0">${t('recEstSub')}</p><div class="recest">${Object.entries(r).sort((a, b) => b[1] - a[1]).map(([g, hh]) => `<span class="rchip"><b>${esc(ML(g))}</b> ${hh > 0 ? `~${hh} h` : t('recReadyChip')}</span>`).join('')}</div>
    <p class="hint">${note}</p></div>`;
}
// moreRanks (0.7.10.2): rank changes beyond the 3 shown as Rank Up windows (rank-fx.js), listed here
function showSummary(ses, moreRanks){
  const tg = targetFor(ses.date), wins = carbWindows(ses.date), post = wins.find(w => w.k === 'winPost');
  $('smBody').innerHTML = `<h2>${t('smTitle')}</h2><p class="sub">${esc(ses.name)} · ${fmtDate(ses.start)}</p>
    <div class="statgrid"><div><b>${ses.mins}</b><small>${t('smDur')}</small></div><div><b>${ses.vol.toLocaleString()}</b><small>${t('smVol')}</small></div>
      <div><b>${ses.exercises.reduce((a, x) => a + x.sets.filter(isMainSet).length, 0)}</b><small>${t('smSets')}</small></div><div><b>≈${ses.kcal}</b><small>${t('smKcal')}</small></div></div>
    <h3><span class="ric">${svgIcon('podium', 16, 2)}</span>${t('smPRs')}</h3>${ses.prs.length ? `<ul class="feed">${ses.prs.slice().sort((a, b) => (b.kind === 'v') - (a.kind === 'v')).map(p => p.kind === 'v' ? `<li class="prv"><span class="ric">${svgIcon('trend', 16, 2.2)}</span>${t('prVLine')} · ${esc(exName(p.exId))}: <b>${p.vol.toLocaleString()} kg</b> <small class="rmeta">(${t('prWas', { v: p.prev.toLocaleString() })})</small></li>`
      : p.kind === 't' || p.kind === 'd' ? `<li class="prw"><span class="ric">${svgIcon('medal', 16, 2)}</span>${t(p.kind === 't' ? 'prTLine' : 'prDLine')} · ${esc(exName(p.exId))}: <b>${fmt(p.v)} ${p.kind === 't' ? 'min' : 'km'}</b></li>` : p.kind === 'w' ? `<li class="prw"><span class="ric">${svgIcon('medal', 16, 2)}</span>${t('prWLine')} · ${esc(exName(p.exId))}: <b>${fmt(p.w)} kg × ${p.r}</b></li>` : `<li>${esc(exName(p.exId))}: <b>${fmt(p.w)} × ${p.r}</b></li>`).join('')}</ul>` : `<p class="hint">${t('smNoPR')}</p>`}
    ${moreRanks && moreRanks.length ? `<h3><span class="ric">${svgIcon('medal', 16, 2)}</span>${esc(moreRanks.length === 1 ? t('rfxMore1') : t('rfxMore', { n: moreRanks.length }))}</h3><ul class="feed rfxmore">${moreRanks.map(c => `<li>${rankIcon(TIERS[Math.floor(c.to / 3)], c.to, 24)}<span>${esc(exName(c.exId))}: <b>${esc(tierName(c.to))}</b></span></li>`).join('')}</ul>` : ''}
    ${tg && post ? `<div class="alert green" style="cursor:default">${t('smFood', { t: fromMin(post.b + 1), c: Math.round(post.c) })}</div>` : ''}`;
  if(ses.prs.length) celebrate();
  open('ovSummary');
  const r = ses.recov || estimateRecovery(ses); if(!Object.keys(r).length) return;
  const fresh = ses === sessions[sessions.length - 1] && !ses.recovAI && Date.now() - new Date(ses.end || 0) < 6e5 && settings.geminiKey;
  const note = ses.recovAI ? esc(ses.recovNote || t('recAIdone')) + ' ' + AI.badge() : fresh ? t('recAIwait') + ' ' + AI.badge() : t('recOffline');   // the AI badge goes after the text
  const box = document.createElement('div'); box.innerHTML = recBlock(ses, r, note);
  const h3 = [...$('smBody').querySelectorAll('h3')][0]; if(h3) h3.before(box.firstElementChild); else $('smBody').appendChild(box.firstElementChild);
  if(!fresh) return;
  aiRecovery(ses).then(res => { const el = $('smRec');
    if(!res){ if(el) el.outerHTML = recBlock(ses, r, t('recAIFail')); return; }
    ses.recov = res.hours; ses.recovAI = true; ses.recovNote = res.note; saveG('ses'); renderAll();
    if(el && document.contains(el)) el.outerHTML = recBlock(ses, res.hours, esc(res.note || t('recAIdone')) + ' ' + AI.badge());
  }).catch(() => { const el = $('smRec'); if(el) el.outerHTML = recBlock(ses, r, t('recAIFail')); });
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
  setTimeout(() => open('ovSaveTpl'), 350);
}
function saveSessionAsTpl(){
  if(!SV) return; const name = $('svName').value.trim() || typeLabel_(inferDayType(SV.exercises));
  const tpl = { id: uid(), name, type: inferDayType(SV.exercises),
    exercises: SV.exercises.map(x => ({ exId: x.exId, sets: x.sets.filter(isMainSet).length || 3, reps: x.reps, rest: x.rest, ...(x.ss ? { ss: x.ss } : {}), ...(x.uni ? { uni: true } : {}) })) };
  tpls.push(tpl); saveG('tpl'); SV.tplId = tpl.id; SV.name = name; saveG('ses'); SV = null;
  close('ovSaveTpl'); renderAll(); toast(t('tplSavedT', { n: name }));
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
const GC_REPLY = 'Reply style: straight to the point. "reply" is one or two short, friendly sentences (at most 35 words), plain text: no lists, no markdown, no greetings or sign-offs, no long explanations. A result (a workout, a machine) never goes inside "reply": it goes in its own field and the app shows it as a card.';
const gcLang = () => lang === 'el' ? 'Greek' : 'English';
// the AI names exercises in English; find ours (exact name first, then the longest name it contains or is part of)
function exByName(n){
  const q = norm(n); if(!q) return null; const L = EX().filter(x => x.en);
  return L.find(x => norm(x.en) === q) || L.find(x => norm(x.el || '') === q)
    || L.filter(x => { const e = norm(x.en); return e.length > 4 && (q.includes(e) || e.includes(q)); }).sort((a, b) => Math.abs(norm(a.en).length - q.length) - Math.abs(norm(b.en).length - q.length))[0] || null;
}
const gcEx = id => { const x = exById(id); return x.en || x.id; };
// what the coach knows: your saved workouts, recent history, sets per muscle this week, recovery and the equipment you use
function gcContext(){
  const recent = sessions.slice().sort((a, b) => b.start.localeCompare(a.start)), eq = new Set();
  [...tpls.flatMap(tp => tp.exercises), ...recent.slice(0, 20).flatMap(s => s.exercises)].forEach(x => { const e = exById(x.exId).e; if(e) eq.add(e); });
  const saved = tpls.slice(0, 12).map(tp => `- "${tp.name}" (${tp.type}): ${tp.exercises.map(e => `${gcEx(e.exId)} ${e.sets}x${e.reps}${e.rest ? ` rest ${e.rest}s` : ''}`).join(', ')}`).join('\n');
  const hist = recent.slice(0, 6).map(s => `- ${s.date} ${s.name || s.type || ''}: ${s.exercises.map(x => { const w = x.sets.filter(z => z.done && isMainSet(z));
    const top = w.filter(z => z.w !== '' && z.r !== '').sort((a, b) => +b.w - +a.w || +b.r - +a.r)[0]; const xt = [top && +top.hr > 0 ? `${top.hr} half reps` : '', top && +top.ng > 0 ? `${top.ng} negatives` : '', top && top.rir != null ? `${top.rir} reps in reserve` : ''].filter(Boolean).join(', ');
    return `${gcEx(x.exId)} ${w.length} sets${top ? ` top ${top.w}kg x ${top.r}${xt ? ` (${xt})` : ''}` : ''}`; }).join(', ')}`).join('\n');
  const wk = hitsFrom(sessions.filter(s => -daysUntil(s.date) <= 6), false);
  const rec = Object.entries(recMap()).map(([g, v]) => `${g} ${v.st === 'ok' ? 'ready' : `${v.h} h to recover`}`).join(', ');
  return `Today: ${todayKey()}. Lifter: ${bodyW()} kg, goal ${(targets && targets.goal) || 'build muscle'}.
Equipment they use: ${[...eq].join(', ') || 'unknown (assume a normal gym)'}.
Saved workouts:
${saved || '- none yet'}
Recent workouts (newest first):
${hist || '- none yet'}
Hard sets per muscle in the last 7 days: ${Object.entries(wk).map(([h, v]) => `${HEADS[h][0]} ${Math.round(v)}`).join(', ') || 'none'}.
Recovery now: ${rec}.`;
}
const gcNames = () => EX().filter(x => x.m !== 'cardio' && x.en).map(x => x.en).join('; ');
const GC_WORKOUT = '"workout": null, or (only when you suggest a full workout or an improved version of one of theirs) {"name": string, "type": "push"|"pull"|"legs"|"upper"|"lower"|"full", "based_on": the exact name of their saved workout you improved, or null, "exercises": [{"name": exact English name from the exercise list, "sets": number, "reps": string like "8-12", "rest": seconds}]}';
function gcPrompt(ch, img){
  return `You are Gym Coach, a friendly, practical strength coach inside a workout-tracking app. Answer the user's last message in ${gcLang()}.
${GC_REPLY}
You can suggest a full workout, or look at one of their saved workouts and improve it (better exercise choice and order, balance between muscles, sets, reps, rest). Respect recovery: avoid muscles that still need rest. Use only equipment they use.
${gymStyleRule()} The user can correct their training style in the chat: if they say they train differently, set "style" to "low", "mid" or "high", else null.${AI.dietRules()}${AI.knows('gym')}
${gcContext()}
Exercise list (use these exact English names): ${gcNames()}.
Conversation so far (latest last):
${ch.transcript()}
${img ? 'The user also sent the attached photo.\n' : ''}Return ONLY JSON: {"reply": string, ${GC_WORKOUT}, "style": null | "low" | "mid" | "high"}`;
}
// the AI's workout → a workout in the app's shape (exercises it named that we don't have are left out)
function gcWorkout(w){
  if(!w || !Array.isArray(w.exercises)) return null;
  const list = w.exercises.map(e => { const x = exByName(e && e.name); if(!x) return null;
    const sets = Math.max(1, Math.min(8, Math.round(+e.sets) || 3)), reps = /^\d+(\s*[-–]\s*\d+)?$/.test(String(e.reps || '').trim()) ? String(e.reps).trim().replace(/\s*[-–]\s*/, '-') : defReps(x.rest);
    const rr = gymReps(), r2 = rr && !isCardio(x.id) && x.m !== 'core' && x.e !== 'bodyweight' ? rr : reps;   // 0.7.9: the chosen Rep Range wins
    return { exId: x.id, sets, reps: r2, rest: rest30(+e.rest || x.rest), ...(isUni(x.id) ? { uni: true } : {}) }; }).filter(Boolean)
    .filter((e, i, a) => a.findIndex(z => z.exId === e.exId) === i);
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
        { group: g && !isCardio(card._e.exId) ? g[2] : null, cardio: isCardio(card._e.exId) }); } } ];
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
async function gymCoachSend(text, ch, img){ ch.status(t(img ? 'coachStPhoto' : 'gcStLook')); gcShow(await ch.ask(gcPrompt(ch, img), img), ch); }

// ---- live workout: the sweatband robot bubble ('gymlive'); a photo of a machine → what it is, how to use it, a first-time weight ----
function gcActive(){
  if(!active) return 'No workout running.';
  return `Workout running now: ${active.name || active.type || 'workout'}, ${Math.round(sesMs() / 60000)} min in. Exercises so far: ${active.exercises.map(x => {
    const d = x.sets.filter(z => z.done && isMainSet(z)); return `${gcEx(x.exId)} (${d.length}/${x.sets.filter(isMainSet).length} sets done${d.length ? `, last ${d[d.length - 1].w}kg x ${d[d.length - 1].r}` : ''})`; }).join(', ') || 'none yet'}.`;
}
const GC_MACHINE = '"machine": null, or (only when the photo shows gym equipment) {"name": the machine\'s usual name, "exercise": the exact English name from the exercise list that this machine is used for (the main one), or null, "how": one or two sentences on how the machine works (what moves, what to adjust), "steps": 3 to 5 short steps to do the exercise, "mistakes": 2 to 4 short common mistakes}';
function gcLivePrompt(ch, img){
  return `You are Gym Coach, a friendly, practical strength coach inside a workout-tracking app. The user is in the middle of a workout. Answer their last message in ${gcLang()}.
${GC_REPLY}
${img ? 'They sent a photo, most likely of a gym machine they are not sure about: name it and explain how to use it safely. If the photo is not gym equipment, say so briefly in "reply" and set "machine" to null.' : 'Answer questions about this workout: technique, what to do next, weights, rest.'}
${gymStyleRule()} The user can correct their training style in the chat: if they say they train differently, set "style" to "low", "mid" or "high", else null.${AI.dietRules()}${AI.knows('gym')}
${gcActive()}
${gcContext()}
Exercise list (use these exact English names): ${gcNames()}.
Conversation so far (latest last):
${ch.transcript()}
Return ONLY JSON: {"reply": string, ${GC_MACHINE}, "style": null | "low" | "mid" | "high"}`;
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
  const r = await ch.ask(gcLivePrompt(ch, img), img), m = r && r.machine && (r.machine.name || r.machine.exercise) ? r.machine : null, reply = String((r && r.reply) || '').trim();
  if(reply || !m) ch.say(reply || t('coachFail', { e: '?' }));
  if(m) ch.cards([gcMachineCard(m)]);
  gcStyleAfter(r, ch);
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
