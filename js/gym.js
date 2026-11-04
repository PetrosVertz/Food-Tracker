// Gym Buddy: workouts, sessions, library, picker, recovery, progress, pets, form demos. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function expState(it){ if(!it.exp) return null; const d = daysUntil(it.exp); return d < 0 ? 'gone' : d <= 2 ? 'soon' : 'ok'; }

function expBadge(it){
  if(!it.exp) return '';
  const d = daysUntil(it.exp), st = expState(it);
  const txt = d < 0 ? t('expGone') : d === 0 ? t('expToday') : d === 1 ? t('expTomorrow') : d < 14 ? t('expIn', { n: d }) : fmtDate(it.exp);
  return `<span class="exp ${st === 'ok' ? '' : st}">${st === 'gone' ? '⛔ ' : st === 'soon' ? '⚠️ ' : ''}${txt}</span>`;
}

function expiringList(){ return liveItems().filter(x => expState(x.it) === 'soon').sort((a, b) => a.it.exp.localeCompare(b.it.exp)); }

function expiredList(){ return liveItems().filter(x => expState(x.it) === 'gone'); }

// ran out (or below your level) → onto the grocery list by itself
function checkRestock(foodId){
  const f = foods.find(x => x.id === foodId); if(!f || f.noAutoGrocery) return false;
  const have = stockOf(foodId), min = f.minStock || 0;
  const low = min > 0 ? have < min : have <= 0;
  if(!low || groc.some(g => g.foodId === foodId && !g.done)) return false;
  groc.push({ id: uid(), foodId, name: foodName(f), count: 1, size: f.usualPack || null, unit: f.unit, why: have <= 0 ? 'out' : 'low', done: false, addedAt: new Date().toISOString() });
  saveGroc(); return true;
}

function setNoExp(on){ FA.noExp = on; $('faNoExp').classList.toggle('on', on); $('faExp').disabled = on; }

function setDay(patch){ days[curDay] = { ...dayInfo(curDay), ...patch }; delete days[curDay].guessed; saveDays(); renderToday(); renderHome(); }

function parseMu(s){ const o = {}; s.split(' ').forEach(p => { const [k, v] = p.split(':'); o[k] = +v; }); return o; }

function topHead(mu){ return Object.entries(mu).sort((a, b) => b[1] - a[1])[0][0]; }

// custom (and v1.6) exercises get muscle data from their old single-muscle field
function normEx(x){ if(x.mu) return x; const h = LEGACY_HEAD[x.m] || 'chest_mid'; return { ...x, mu: { [h]: 100 }, h, m: HEADS[h] ? HEADS[h][2] : 'other', p: x.m === 'cardio' ? 'cardio' : (x.p || 'press_h') }; }

function exIcon(x, size){
  x = typeof x === 'string' ? exById(x) : x; const f = ICON_FIG[x.p] || ICON_FIG.press_h, col = (GROUPS[x.m] || GROUPS.other)[3];
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

function lastSessionDate(){ const s = sessions.slice().sort((a, b) => b.start.localeCompare(a.start))[0]; return s ? s.date : (ui.gymLast || null); }

function comebackFactor(){ if(!comeback) return 1; const k = sessions.filter(s => s.start > comeback.at).length; return Math.min(1, comeback.base + .05 * k); }

function cbBase(gap){ return gap >= 42 ? .7 : gap >= 21 ? .8 : .9; }

function suggestFor(exId, reps){
  const ex = exById(exId), [lo, hi] = repRange(reps), h = exHistory(exId, active && active.id);
  if(isCardio(exId)) return null;
  if(!h.length) return { first: true, lo, hi };
  const last = h[h.length - 1], f = comebackFactor();
  if(f < 1){ const pre = comeback.ref && comeback.ref[exId] ? comeback.ref[exId] : +last.top.w; return { cb: true, p: Math.round(f * 100), w: r25(pre * f, ex.e), r: `${lo}-${hi}`, last }; }
  const w = +last.top.w, r = +last.top.r;
  return r >= hi ? { w: r25(w + (ex.e === 'dumbbell' ? 2 : 2.5), ex.e), r: `${lo}-${hi}`, last } : { w, r: Math.min(hi, r + 1), last };
}

function warmupFor(exId, w){
  const ex = exById(exId); if(!(w >= 20) || ex.e === 'bodyweight' || isCardio(exId)) return [];
  return [[.4, 8], [.6, 5], [.8, 3]].map(([p, r]) => ({ w: Math.max(ex.e === 'barbell' ? 20 : 0, r25(w * p, ex.e)), r })).filter((x, i, a) => x.w > 0 && (i === 0 || x.w > a[i - 1].w));
}

// ---------- live session ----------
function newSet(type){ return { type: type || 'N', w: '', r: '', done: false }; }

function startSession(tpl){
  const now = new Date(), gap = gapDays();
  if(gap !== null && gap >= 14 && !comeback){
    const ref = {}; sessions.forEach(s => s.exercises.forEach(x => { const h = exHistory(x.exId); if(h.length) ref[x.exId] = +h[h.length - 1].top.w; }));
    comeback = { at: now.toISOString(), base: cbBase(gap), gap, ref }; saveG('cb');
  }
  active = { id: uid(), date: todayKey(), start: now.toISOString(), clock0: tpl && tpl.exercises.length ? now.getTime() : null, tplId: tpl ? tpl.id : null, name: tpl ? tpl.name : t('emptyWorkout'), type: tpl ? tpl.type : 'full', prs: [],
    exercises: tpl ? tpl.exercises.map(e => ({ exId: e.exId, reps: e.reps, rest: e.rest ?? exById(e.exId).rest, sets: Array.from({ length: e.sets || 3 }, () => newSet()) })) : [] };
  saveG('act');
  days[todayKey()] = { ...dayInfo(todayKey()), type: 'gym', work: workKind(active.type), time: fromMin(now.getHours() * 60 + now.getMinutes()) }; delete days[todayKey()].guessed; saveDays();
  close('ovStart'); renderAll(); openSession();
}

function openSession(){ if(!active) return; renderSession(); open('ovSession'); keepAwake(true); }

function renderSession(){
  if(!active) return;
  $('sesName').textContent = active.name; tickClock();
  const cb = comebackFactor();
  const day = suppLog[todayKey()] || {}, sp = supps.filter(s => s.often === 'training' || s.times.some(x => x === 'pre' || x === 'post'));
  const warn = sessionRecoveryWarn();
  $('sesSupps').innerHTML = (cb < 1 ? `<div class="alert" style="cursor:default">${t('cbActive', { k: sessions.filter(s => s.start > comeback.at).length + 1, p: Math.round(cb * 100) })}</div>` : '') +
    (warn ? `<div class="alert red" style="cursor:default">${warn}</div>` : '') +
    (sp.length ? `<div class="slots" style="margin:0 0 10px"><small class="rmeta" style="align-self:center">${t('suppsNow')}</small>${sp.map(s => { const sl = s.times.find(x => x === 'pre' || x === 'post') || s.times[0]; const k = `${s.id}|${sl}`;
      return `<button class="slot ${day[k] ? 'taken' : ''}" data-ssup="${k}">${day[k] ? '✓ ' : ''}${suppIcon(s)} ${esc(suppName(s))}</button>`; }).join('')}</div>` : '');
  if(active.clock0 === undefined) active.clock0 = active.exercises.length ? new Date(active.start).getTime() : null;   // workouts started before 0.6.0
  if(!active.clock0 && active.exercises.length){ active.clock0 = Date.now(); saveG('act'); }   // 0.6.0: the clock starts with the first exercise
  $('sesBody').innerHTML = active.exercises.map(cardHtml).join('') || `<div class="empty">${t('noExYet')}</div>`;
  SES_ADD = SES_ADD || $('sesAddEx'); $('sesBody').appendChild(SES_ADD);   // Add Exercise always sits under the last exercise
}
let SES_ADD = null;
const sesMs = () => active && active.clock0 ? Date.now() - active.clock0 : 0;

const clk = ms => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`; };
const exTime = x => '⏱ ' + clk((x.t1 || Date.now()) - x.t0);
function tickClock(){ if(!active || !$('ovSession').classList.contains('open')) return;
  $('sesClock').textContent = clk(sesMs()); $('sesDate').textContent = fmtDate(active.start);
  document.querySelectorAll('#sesBody [data-xt]').forEach(el => { const x = active.exercises[+el.dataset.xt]; if(x && x.t0) el.textContent = exTime(x); }); }

function focusSet(xi, si){ setTimeout(() => { const el = document.querySelector(`.exc[data-x="${xi}"] .setrow[data-s="${si}"] [data-w]`); if(el){ el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 60); }

// records: a WEIGHT record (heaviest set) and a VOLUME record (total kg moved across all sets) — volume counts more
function tickSet(x, s, row, xi, si){
  if(s.done){ s.done = false; s.pr = null; if(x.volPR && exVol(x.exId, x.sets) <= bestVolBefore(x.exId)){ x.volPR = false; active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === 'v')); } saveG('act'); renderSession(); return; }
  const wi = row.querySelector('[data-w]'), ri = row.querySelector('[data-r]'), card = isCardio(x.exId);
  if(s.w === '' && wi.placeholder && !isNaN(+wi.placeholder)) s.w = wi.placeholder; if(s.r === '' && ri.placeholder && !isNaN(+ri.placeholder)) s.r = ri.placeholder;
  if(s.r === '' || (!card && s.w === '' && exById(x.exId).e !== 'bodyweight')){ toast(t('needSetVals')); (s.w === '' ? wi : ri).focus(); return; }
  if(s.w === '') s.w = '0';
  s.done = true; ensureAudio(); if(!x.t0) x.t0 = Date.now();
  if(!card && s.type !== 'W'){
    const hist = exHistory(x.exId, active.id), same = active.exercises.filter(z => z.exId === x.exId);
    if(hist.length){
      const prevMaxW = Math.max(...hist.flatMap(h => h.sets.map(z => +z.w))), curOther = Math.max(0, ...same.flatMap(z => z.sets).filter(z => z !== s && z.done && z.type !== 'W').map(z => +z.w));
      if(exById(x.exId).e !== 'bodyweight' && +s.w > prevMaxW && +s.w > curOther){ s.pr = 'w'; active.prs.push({ exId: x.exId, kind: 'w', w: +s.w, r: +s.r }); celebrate('🏋️'); toast(t('prW', { n: exName(x.exId), w: fmt(+s.w), r: s.r })); petAward('pr', 1); }
      const prevVol = bestVolBefore(x.exId), curVol = same.reduce((a, z) => a + exVol(x.exId, z.sets), 0);
      if(!x.volPR && curVol > prevVol){ x.volPR = true; s.pr = 'v'; active.prs = active.prs.filter(p => !(p.exId === x.exId && p.kind === 'v'));
        active.prs.push({ exId: x.exId, kind: 'v', vol: Math.round(curVol), prev: Math.round(prevVol) });
        celebrate('📈'); setTimeout(() => celebrate('🏆'), 350); toast(t('prV', { n: exName(x.exId), v: Math.round(curVol).toLocaleString() })); petAward('vpr', 2); }
      else if(x.volPR){ const p = active.prs.find(p => p.exId === x.exId && p.kind === 'v'); if(p) p.vol = Math.round(curVol); }
    }
  }
  saveG('act');
  if(!card){ REST = { end: Date.now() + (s.type === 'W' ? 60 : x.rest) * 1000, total: s.type === 'W' ? 60 : x.rest, rang: false, xi, si }; }
  renderSession(); tickRest();
}

function ensureAudio(){ try{ if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if(audioCtx.state === 'suspended') audioCtx.resume(); }catch(e){} }

// rest is over: a soft, rising three-note chime with a gentle echo
function bell(){
  try{ ensureAudio(); const now = audioCtx.currentTime, out = audioCtx.createGain(); out.gain.value = .9; out.connect(audioCtx.destination);
    const note = (f, at, peak, len) => [[1, 1], [2, .18], [3, .05]].forEach(([k, m]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f * k; o.connect(g); g.connect(out);
      g.gain.setValueAtTime(.0001, now + at); g.gain.exponentialRampToValueAtTime(peak * m, now + at + .012); g.gain.exponentialRampToValueAtTime(.0001, now + at + len / k);
      o.start(now + at); o.stop(now + at + len + .05); });
    [[880, 0], [1108.73, .13], [1318.51, .26]].forEach(([f, at]) => { note(f, at, .32, 1.8); note(f, at + .2, .07, 1.4); });   // A major arpeggio + soft echo
  }catch(e){}
}

function startRest(sec){ if(sec > 0){ REST = { end: Date.now() + sec * 1000, total: sec, rang: false, xi: -1, si: -1 }; tickRest(); } }

function tickRest(){
  if(!REST) return; const left = Math.round((REST.end - Date.now()) / 1000);
  if(left <= 0 && !REST.rang){ REST.rang = true; bell(); navigator.vibrate?.([300, 120, 300]); const el = document.querySelector('.restin'); if(el) el.classList.add('over'); if(!$('ovSession').classList.contains('open')) toast(t('restDone')); }
  const tx = $('restTxt2'), pr = $('restProg2');
  if(tx) tx.textContent = left > 0 ? `${t('restLbl')} ${fmtRest(left)}` : t('restOver');
  if(pr) pr.style.width = `${Math.max(0, Math.min(100, (1 - left / REST.total) * 100))}%`;
  if(left < -45){ REST = null; if(active && $('ovSession').classList.contains('open')) renderSession(); }
}

function restAdjust(v){ if(!REST) return; if(v === 'skip'){ REST = null; renderSession(); return; }
  REST.end += +v * 1000; REST.total = Math.max(REST.total, Math.round((REST.end - Date.now()) / 1000)); if(REST.end > Date.now()) REST.rang = false; renderSession(); tickRest(); }

function openExPick(cb){ PK = { cb, region: ui.pkRegion || 'up', mode: ui.pkMode || 'map', group: null, head: null }; $('exSearch').value = ''; drawExPick(); open('ovExPick'); }

// ---------- exercise details: muscles %, form, common mistakes ----------
function openExInfo_0(id, addCb){
  const x = exById(id), mus = Object.entries(x.mu).sort((a, b) => b[1] - a[1]), L_ = lang === 'el' ? 1 : 0;
  const cues = (CUES[x.p] || []).map(c => c[L_]).concat(SPECIFIC[id] ? [SPECIFIC[id][L_]] : []), errs = (MISTAKES[x.p] || []).map(c => c[L_]);
  const h = exHistory(id), bestW = h.length ? Math.max(...h.flatMap(s => s.sets.map(z => +z.w))) : null, bestV = h.length ? Math.max(...h.map(s => exVol(id, s.sets.map(z => ({ ...z, done: true }))))) : null;
  $('eiBody').innerHTML = `<div class="row" style="align-items:center;justify-content:flex-start;gap:12px">${exIcon(x, 64)}<div><h2 style="margin:0">${esc(exName(x))}</h2><small class="rmeta">${EL(x.e)} · ${ML(x.m)}</small></div></div>
    ${h.length ? `<p class="rmeta" style="margin:10px 0 0">🏋️ ${t('bestW')}: <b>${fmt(bestW)} kg</b> · 📈 ${t('bestV')}: <b>${Math.round(bestV).toLocaleString()} kg</b></p>` : ''}
    <h3>${t('musclesWorked')}</h3>${mus.map(([k, v]) => `<div class="mrow"><small>${esc(ML(k))}</small><span class="mbar"><i style="width:${v}%;background:${(GROUPS[HEADS[k] ? HEADS[k][2] : 'other'] || GROUPS.other)[3]}"></i></span><b>${v}%</b></div>`).join('')}
    <p class="hint">${t('pctNote')}</p>
    ${cues.length ? `<h3>✅ ${t('howTo')}</h3><ul class="feed">${cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${errs.length ? `<h3>⚠️ ${t('mistakesT')}</h3><ul class="feed warnlist">${errs.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}`;
  $('eiAdd').classList.toggle('hide', !addCb);
  $('eiAdd').onclick = () => { close('ovExInfo'); close('ovExPick'); addCb && addCb(id); };
  open('ovExInfo');
}

function addToSession(id){ active.exercises.push({ exId: id, reps: isCardio(id) ? '20' : defReps(exById(id).rest), rest: exById(id).rest, sets: [newSet()] }); saveG('act'); renderSession();
  const i = active.exercises.length - 1; setTimeout(() => { const el = document.querySelector(`.exc[data-x="${i}"]`); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }

function openSwap(xi){
  const x = active.exercises[xi], ex = exById(x.exId); SW = { xi, taken: ex.e };
  $('swTitle').textContent = t('swapT', { n: exName(ex) });
  $('swEquip').innerHTML = Object.keys(EQUIP).filter(k => EX().some(a => a.h === ex.h && a.e === k)).map(k => `<button data-v="${k}">${EL(k)}</button>`).join('');
  drawSwap(); open('ovSwap');
}

function drawSwap(){
  setSeg('#swEquip', SW.taken);
  const x = active.exercises[SW.xi], ex = exById(x.exId);
  let alts = EX().filter(a => a.h === ex.h && a.id !== ex.id && a.e !== SW.taken);
  if(alts.length < 3) alts = alts.concat(EX().filter(a => a.m === ex.m && a.h !== ex.h && a.id !== ex.id && a.e !== SW.taken && a.m !== 'cardio').slice(0, 6));
  alts.sort((a, b) => (exHistory(b.id).length - exHistory(a.id).length) || ((b.mu[ex.h] || 0) - (a.mu[ex.h] || 0)));
  $('swList').innerHTML = alts.length ? exTiles(alts, ex.h) : `<p class="hint">${t('nothingHere')}</p>`;
}

// ---------- 💡 what next? muscles you haven't hit yet (free) + ✨ Gemini ----------
function hitsFrom(list, includeUndone){
  const hits = {};
  list.forEach(s => s.exercises.forEach(x => { const ex = exById(x.exId);
    x.sets.filter(z => z.type !== 'W' && (z.done || (includeUndone && !x.ended))).forEach(() => Object.entries(ex.mu).forEach(([h, v]) => { if(HEADS[h]) hits[h] = (hits[h] || 0) + v / 100; })); }));
  return hits;
}

function openNext(){
  const list = nextSuggestions();
  $('nxBody').innerHTML = (list.length ? list.map(x => `<div class="nxrow"><b>${esc(ML(x.h))}</b> <small class="rmeta">${t('nxWhy', { a: Math.round(x.s * 10) / 10, b: Math.round(x.w * 10) / 10 })}</small>${exTiles(x.ex, x.h)}</div>`).join('') : `<p class="hint">${t('nxNone')}</p>`) +
    (settings.geminiKey ? `<div class="actions"><button class="btn" id="nxAI">${t('nxAI')}</button></div><div id="nxAIOut"></div>` : `<p class="hint">${t('nxNoKey')}</p>`);
  open('ovNext');
}

function showSummary_0(ses){
  const tg = targetFor(ses.date), wins = carbWindows(ses.date), post = wins.find(w => w.k === 'winPost');
  $('smBody').innerHTML = `<h2>${t('smTitle')}</h2><p class="sub">${esc(ses.name)} · ${fmtDate(ses.start)}</p>
    <div class="statgrid"><div><b>${ses.mins}</b><small>${t('smDur')}</small></div><div><b>${ses.vol.toLocaleString()}</b><small>${t('smVol')}</small></div>
      <div><b>${ses.exercises.reduce((a, x) => a + x.sets.filter(s => s.type !== 'W').length, 0)}</b><small>${t('smSets')}</small></div><div><b>≈${ses.kcal}</b><small>${t('smKcal')}</small></div></div>
    <h3>🏆 ${t('smPRs')}</h3>${ses.prs.length ? `<ul class="feed">${ses.prs.slice().sort((a, b) => (b.kind === 'v') - (a.kind === 'v')).map(p => p.kind === 'v' ? `<li class="prv">${t('prVLine')} · ${esc(exName(p.exId))}: <b>${p.vol.toLocaleString()} kg</b> <small class="rmeta">(${t('prWas', { v: p.prev.toLocaleString() })})</small></li>`
      : p.kind === 'w' ? `<li>${t('prWLine')} · ${esc(exName(p.exId))}: <b>${fmt(p.w)} kg × ${p.r}</b></li>` : `<li>${esc(exName(p.exId))}: <b>${fmt(p.w)} × ${p.r}</b></li>`).join('')}</ul>` : `<p class="hint">${t('smNoPR')}</p>`}
    ${tg && post ? `<div class="alert green" style="cursor:default">${t('smFood', { t: fromMin(post.b + 1), c: Math.round(post.c) })}</div>` : ''}`;
  if(ses.prs.length) celebrate('🎉');
  open('ovSummary');
}

// ---------- progress ----------
function spark(vals){
  if(vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), w = 90, h = 28, sx = w / (vals.length - 1), sy = mx === mn ? 0 : (h - 4) / (mx - mn);
  const pts = vals.map((v, i) => `${(i * sx).toFixed(1)},${(h - 2 - (v - mn) * sy).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function strengthChange(exId){
  const h = exHistory(exId); if(!h.length) return null;
  const now = Date.now(), d = s => (now - new Date(s.start)) / 864e5;
  const recent = h.filter(x => d(x) <= 28), prev = h.filter(x => d(x) > 28 && d(x) <= 56);
  const best = a => a.length ? Math.max(...a.map(x => x.e1)) : null;
  const r = best(recent), p = best(prev), first = h[0].e1, all = best(h);
  return { h, best: all, pct: r && p ? (r / p - 1) * 100 : null, since: r && h.length > 1 ? (r / first - 1) * 100 : null };
}

function renderProgress(){
  const el = $('gProgV'), gap = gapDays();
  let h = '';
  if(!sessions.length){
    h += `<div class="empty" style="margin-top:10px">${t('progNone')}</div><label for="gLast" style="margin-top:14px">${t('lastTrained')}</label><input id="gLast" type="date" value="${ui.gymLast || ''}" max="${todayKey()}">`;
    el.innerHTML = h; return;
  }
  const ids = [...new Set(sessions.flatMap(s => s.exercises.map(x => x.exId)))].filter(id => !isCardio(id));
  const rows = ids.map(id => ({ id, c: strengthChange(id) })).filter(x => x.c).sort((a, b) => b.c.h.length - a.c.h.length);
  const pcts = rows.map(x => x.c.pct).filter(v => v !== null), avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  const sinces = rows.map(x => x.c.since).filter(v => v !== null), avgS = sinces.length ? sinces.reduce((a, b) => a + b, 0) / sinces.length : null;
  const goal = targets && targets.goal, v = avg ?? avgS;
  const msg = v === null ? '' : goal === 'cut' ? (v >= -2 ? t('gCutHold') : t('gCutDrop')) : v > 2 ? t('gBulkUp') : v < -2 ? t('gDown') : t('gFlat');
  const cls = x => x === null ? 'flat' : x > 1 ? 'up' : x < -1 ? 'down' : 'flat', sg = x => x === null ? '–' : `${x > 0 ? '+' : ''}${x.toFixed(1)}%`;
  h += `<div class="macrocard"><div class="row"><span class="rmeta">${avg !== null ? t('progOverall') : t('progSinceStart')}</span><span class="pct ${cls(v)}" style="font-size:24px">${sg(v)}</span></div>${msg ? `<p class="hint" style="margin:6px 0 0">${msg}</p>` : ''}</div>`;
  h += `<h3 class="sect">${t('gtProgress')}</h3>` + rows.map(({ id, c }) => { const top = c.h[c.h.length - 1].top;
    return `<div class="prog"><div><b>${esc(exName(id))}</b><small>${t('lastTime')} ${fmt(+top.w)}×${top.r} · ${t('best')} ${Math.round(c.best)}</small></div>${spark(c.h.map(x => x.e1))}<span class="pct ${cls(c.pct ?? c.since)}">${sg(c.pct ?? c.since)}</span></div>`; }).join('');
  h += `<h3 class="sect">${t('historyT')}</h3><div class="list">` + sessions.slice().sort((a, b) => b.start.localeCompare(a.start)).slice(0, 10).map(s => `<div class="card" data-ses="${s.id}"><div class="ficon">🏋️</div><div class="body">
    <div class="row"><div class="name">${esc(s.name)}</div><span class="rmeta">${fmtDate(s.start)}</span></div><div class="rmeta">${s.mins} min · ${s.vol.toLocaleString()} kg${s.prs.length ? ` · 🏆 ${s.prs.length}` : ''}</div></div></div>`).join('') + '</div>';
  el.innerHTML = h;
}

function petMood(){ if(!pet || !pet.lastFed) return 'ok'; const d = -daysUntil(pet.lastFed); return d <= 1 ? 'happy' : d <= 3 ? 'ok' : 'sleepy'; }

function petSVG(species, stage, mood, size){
  const s = [.72, .86, 1][stage], eyes = (x1, x2, y) => mood === 'sleepy'
    ? `<path d="M${x1 - 5} ${y} q5 4 10 0 M${x2 - 5} ${y} q5 4 10 0" stroke="#1b1b1b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    : [x1, x2].map(x => `<circle cx="${x}" cy="${y}" r="${mood === 'happy' ? 5.5 : 4.5}" fill="#fff"/><circle cx="${x + .8}" cy="${y + .6}" r="3" fill="#1b1b1b"/><circle cx="${x + 2}" cy="${y - 1.2}" r="1.1" fill="#fff"/>`).join('');
  const mouth = (y) => mood === 'happy' ? `<path d="M55 ${y} q5 5 10 0" stroke="#1b1b1b" stroke-width="2.2" fill="none" stroke-linecap="round"/>` : `<path d="M56 ${y + 2} h8" stroke="#1b1b1b" stroke-width="2.2" stroke-linecap="round"/>`;
  let art = '';
  if(species === 'embrik'){
    const fl = [.55, .85, 1.15][stage];
    art = `<g transform="translate(60 34) scale(${fl}) translate(-60 -34)"><path d="M60 4 C72 16 74 26 67 34 C64 38 56 38 53 34 C46 26 50 14 60 4Z" fill="#ff8a2a"/><path d="M60 15 C66 23 65 30 60 34 C55 30 55 23 60 15Z" fill="#ffd23f"/></g>
      ${stage === 2 ? '<circle cx="34" cy="40" r="3" fill="#ffd23f"/><circle cx="88" cy="36" r="2.5" fill="#ff8a2a"/>' : ''}
      <path d="M38 60 C38 34 82 34 82 60" stroke="#2b2422" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M41 60 C41 39 79 39 79 60" stroke="#4a3b37" stroke-width="3" fill="none"/>
      <circle cx="60" cy="76" r="32" fill="#3b2f2c"/>${stage === 2 ? '<ellipse cx="60" cy="86" rx="20" ry="12" fill="#ff8a2a" opacity=".25"/>' : ''}
      <path d="M33 72 L43 77 L39 88 M85 66 L77 74 L85 83${stage >= 1 ? ' M52 100 L58 93 L66 99' : ''}" stroke="#ff8a2a" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="44" cy="82" rx="5" ry="3" fill="#ff8a2a" opacity=".55"/><ellipse cx="76" cy="82" rx="5" ry="3" fill="#ff8a2a" opacity=".55"/>
      ${eyes(51, 69, 72)}${mouth(82)}<ellipse cx="46" cy="107" rx="9" ry="5" fill="#2b2422"/><ellipse cx="74" cy="107" rx="9" ry="5" fill="#2b2422"/>`;
  } else if(species === 'tidepup'){
    art = `${stage === 2 ? '<circle cx="24" cy="50" r="5" fill="none" stroke="#8fd3ff" stroke-width="2"/><circle cx="98" cy="44" r="4" fill="none" stroke="#8fd3ff" stroke-width="2"/><circle cx="92" cy="28" r="2.5" fill="none" stroke="#8fd3ff" stroke-width="2"/>' : ''}
      <path d="M92 84 q14 -6 10 -22 q10 8 6 20 q-4 10 -16 8z" fill="#2f7fd0"/>
      <ellipse cx="60" cy="84" rx="32" ry="24" fill="#4aa8ff"/><ellipse cx="60" cy="90" rx="18" ry="14" fill="#bfe3ff"/>
      <ellipse cx="36" cy="52" rx="9" ry="16" transform="rotate(25 36 52)" fill="#2f7fd0"/><ellipse cx="84" cy="52" rx="9" ry="16" transform="rotate(-25 84 52)" fill="#2f7fd0"/>
      <circle cx="60" cy="56" r="24" fill="#4aa8ff"/>${stage >= 1 ? '<path d="M60 22 C66 30 68 34 66 38 C64 42 56 42 54 38 C52 34 54 30 60 22Z" fill="#8fd3ff"/>' : ''}
      ${stage === 2 ? '<path d="M38 74 q11 8 22 0 q11 8 22 0" stroke="#bfe3ff" stroke-width="4" fill="none" stroke-linecap="round"/>' : ''}
      ${eyes(51, 69, 52)}<ellipse cx="60" cy="64" rx="10" ry="7" fill="#bfe3ff"/><ellipse cx="60" cy="61" rx="3.5" ry="2.6" fill="#1b1b1b"/>${mouth(66)}
      <ellipse cx="46" cy="106" rx="8" ry="5" fill="#2f7fd0"/><ellipse cx="74" cy="106" rx="8" ry="5" fill="#2f7fd0"/>`;
  } else {
    art = `<circle cx="38" cy="44" r="11" fill="#6b8f3a"/><circle cx="38" cy="44" r="5.5" fill="#4f6e2a"/><circle cx="82" cy="44" r="11" fill="#6b8f3a"/><circle cx="82" cy="44" r="5.5" fill="#4f6e2a"/>
      ${stage >= 1 ? `<path d="M60 40 V22" stroke="#3f6e1f" stroke-width="3" stroke-linecap="round"/><ellipse cx="53" cy="24" rx="7" ry="4" transform="rotate(-30 53 24)" fill="#8bc34a"/><ellipse cx="67" cy="24" rx="7" ry="4" transform="rotate(30 67 24)" fill="#8bc34a"/>` : ''}
      ${stage === 2 ? '<circle cx="60" cy="18" r="4" fill="#ffd23f"/><circle cx="60" cy="12" r="3.2" fill="#ff8ab3"/><circle cx="54" cy="17" r="3.2" fill="#ff8ab3"/><circle cx="66" cy="17" r="3.2" fill="#ff8ab3"/><circle cx="57" cy="22" r="3.2" fill="#ff8ab3"/><circle cx="63" cy="22" r="3.2" fill="#ff8ab3"/><circle cx="60" cy="17" r="2.6" fill="#ffd23f"/>' : ''}
      <circle cx="60" cy="74" r="34" fill="#7aa24a"/><ellipse cx="60" cy="88" rx="20" ry="16" fill="#c9dca0"/>
      <ellipse cx="38" cy="90" rx="8" ry="6" fill="#5d8a2e"/><ellipse cx="84" cy="64" rx="7" ry="5" fill="#5d8a2e"/>${stage === 2 ? '<path d="M86 86 q4 -8 8 0z" fill="#d9534f"/><rect x="89" y="86" width="2" height="5" fill="#eee"/>' : ''}
      ${eyes(50, 70, 66)}<ellipse cx="60" cy="76" rx="9" ry="6" fill="#e6efcf"/><ellipse cx="60" cy="74" rx="3.2" ry="2.4" fill="#1b1b1b"/>${mouth(79)}
      <ellipse cx="45" cy="106" rx="9" ry="5" fill="#5d7a33"/><ellipse cx="75" cy="106" rx="9" ry="5" fill="#5d7a33"/>`;
  }
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true"><ellipse cx="60" cy="112" rx="${30 * s}" ry="5" fill="rgba(0,0,0,.35)"/>
    <g class="${mood === 'sleepy' ? '' : 'bob'}"><g transform="translate(60 110) scale(${s}) translate(-60 -110)">${art}</g></g>
    ${mood === 'sleepy' ? '<text x="88" y="30" fill="#8b949c" font-size="14" font-weight="700">z</text><text x="98" y="20" fill="#8b949c" font-size="10" font-weight="700">z</text>' : ''}</svg>`;
}

function petAward(kind, n){
  if(!pet) return; const d = todayKey(); pet.awards = pet.awards || {}; const a = pet.awards[d] = pet.awards[d] || {};
  if(kind === 'pr' || kind === 'vpr'){ if((a[kind] || 0) >= 3) return; a[kind] = (a[kind] || 0) + 1; } else { if(a[kind]) return; a[kind] = 1; }
  const fav = PETS[pet.species].fav, gain = n * (fav === kind || (fav === 'kcal' && kind === 'prot') || (fav === 'pr' && kind === 'vpr') ? 2 : 1);
  const before = petStage(petLevel(pet.xp)); pet.xp += gain; pet.lastFed = d;
  pet.log = [{ d, kind, gain }].concat(pet.log || []).slice(0, 12);
  const keys = Object.keys(pet.awards).sort(); if(keys.length > 60) keys.slice(0, keys.length - 60).forEach(k => delete pet.awards[k]);
  saveG('pet'); const after = petStage(petLevel(pet.xp));
  if(after > before){ celebrate('✨'); setTimeout(() => toast(t('petEvolved', { a: PETS[pet.species].names[before], b: PETS[pet.species].names[after] })), 300); }
  else if(kind !== 'pr' && kind !== 'vpr') toast(t('petFed', { n: pet.name, x: gain }));
}

// daily goals are checked whenever the numbers change
function petTick(){
  if(!pet) return; const d = todayKey(), tg = targetFor(d), tot = dayTotals(d), tp = todayProgress();
  if(tg && tg.k && Math.abs(tot.kcal - tg.k) / tg.k <= .07) petAward('kcal', 1);
  if(tg && tg.p && tot.p >= tg.p * .95) petAward('prot', 1);
  if(tp.total && tp.done === tp.total) petAward('supps', 1);
}

function renderPetTile(){
  if(!pet){ $('tPetArt').innerHTML = '<span style="font-size:44px">🥚</span>'; $('tPetName').textContent = t('petNone'); $('tPetSub').textContent = t('petNoneSub'); $('tPetBar').style.width = '0'; return; }
  const lv = petLevel(pet.xp), st = petStage(lv), mood = petMood();
  $('tPetArt').innerHTML = petSVG(pet.species, st, mood, 76);
  $('tPetName').textContent = pet.name === PETS[pet.species].names[st] ? pet.name : `${pet.name} · ${PETS[pet.species].names[st]}`;
  $('tPetSub').textContent = `${t('petLv', { l: lv, x: pet.xp % 5, n: 5 })} · ${t('petMood_' + mood)}`;
  $('tPetBar').style.width = `${(pet.xp % 5) / 5 * 100}%`; $('tPetBar').style.background = PETS[pet.species].col;
}

function openPet(){
  if(!pet){
    $('ppList').innerHTML = Object.entries(PETS).map(([k, p]) => `<button class="ppcard" data-pp="${k}">${petSVG(k, 0, 'happy', 110)}<span><b>${p.names[0]}</b><small>${p.trait[lang === 'el' ? 1 : 0]}</small><small>${p.names.join(' → ')}</small></span></button>`).join('');
    return open('ovPetPick');
  }
  const lv = petLevel(pet.xp), st = petStage(lv), mood = petMood(), a = (pet.awards || {})[todayKey()] || {}, P = PETS[pet.species];
  const nextLv = st === 0 ? 5 : st === 1 ? 12 : null;
  $('petBody').innerHTML = `<div class="petbig">${petSVG(pet.species, st, mood, 200)}</div>
    <div class="brandrow"><input id="petName" value="${esc(pet.name)}" aria-label="${t('petRename')}" style="font-size:18px;font-weight:700"><span class="chip">${P.names[st]}</span></div>
    <p class="rmeta" style="margin:8px 0">${t('petLv', { l: lv, x: pet.xp % 5, n: 5 })} · ${t('petMood_' + mood)}</p>
    <span class="mbar"><i style="width:${(pet.xp % 5) / 5 * 100}%;background:${P.col}"></i></span>
    <p class="hint">${t('petStage', { s: st + 1 })} · ${nextLv ? t('petNext', { l: nextLv }) : t('petMax')} · ${t('petFav', { f: t(FAV_KEY[P.fav]).split(' (')[0].toLowerCase() })}</p>
    <h3>${t('petHow')} · ${t('petToday')}</h3>
    <ul class="feed">${[['pfPR', (a.pr || 0) + (a.vpr || 0) > 0, a.pr || a.vpr ? ` (${(a.pr || 0) + (a.vpr || 0)})` : ''], ['pfWork', a.workout], ['pfKcal', a.kcal], ['pfProt', a.prot], ['pfSupps', a.supps]].map(([k, ok, x]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${t(k)}${x || ''}</li>`).join('')}</ul>`;
  open('ovPet');
}

function celebrate(ch){
  const b = $('burst'); for(let i = 0; i < 18; i++){ const s = document.createElement('span'); s.textContent = i % 3 ? ch : '✨';
    s.style.left = '50%'; s.style.top = '45%'; s.style.setProperty('--dx', `${(Math.random() - .5) * 360}px`); s.style.setProperty('--dy', `${(Math.random() - .7) * 420}px`); s.style.setProperty('--rot', `${(Math.random() - .5) * 120}deg`);
    b.appendChild(s); setTimeout(() => s.remove(), 1300); }
  navigator.vibrate?.([40, 30, 60]);
}

// ---------- home + routing ----------
function renderHome16(){
  const p = planFor(todayKey()), tp = p && p.tpl && tpls.find(x => x.id === p.tpl);
  $('tGymSub').textContent = active ? t('resume', { m: Math.floor((Date.now() - new Date(active.start)) / 60000) }).replace('● ', '')
    : (tp ? `${lang === 'el' ? 'Σήμερα' : 'Today'}: ${tp.name} ${p.time || ''}` : p && p.type === 'rest' ? `${lang === 'el' ? 'Σήμερα' : 'Today'}: 😴` : t('startAny').replace('▶ ', '')) +
      (gapDays() >= 14 && !active ? ` · 🔄 ${gapDays()}d` : '');
  $('tGymBadge').textContent = active ? '●' : ''; $('tGymBadge').classList.toggle('hide', !active);
  petTick(); renderPetTile();
}

// ---------- recovery model: hard sets per muscle × time since, with your soreness on top ----------
// Each done set adds load to its muscles by the exercise's muscle %, weighted for effort:
// failure ×1.35, drop set ×1.2, heavy (≤5 reps) ×1.1, very light (≥20 reps) ×0.85, lowering-heavy moves (hinge/squat/lunge) ×1.2.
const ECC_PAT = /hinge|squat|lunge|rdl|split|nordic|bulgarian/i;
function headLoads(ses){
  const per = {};
  (ses.exercises || []).forEach(x => { const ex = exById(x.exId); if(!ex || !ex.mu) return; const ecc = ECC_PAT.test((ex.p || '') + ' ' + ex.id) ? 1.2 : 1;
    x.sets.filter(z => z.done && z.type !== 'W').forEach(z => { const reps = +z.r || 0, rf = reps >= 20 ? .85 : reps > 0 && reps <= 5 ? 1.1 : 1;
      const e = (z.type === 'F' ? 1.35 : z.type === 'D' ? 1.2 : 1) * ecc * rf;
      Object.entries(ex.mu).forEach(([h, v]) => { if(HEADS[h] && h !== 'cardio') per[h] = (per[h] || 0) + v / 100 * e; }); }); });
  return per;
}
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
      out[h] = Math.min(1, (out[h] || 0) + Math.min(1, l / 6) * Math.max(0, 1 - hrs / rh)); });
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
  const f = headFatigue(atTs), now = Date.now(), sore = (ui.sore || {})[todayKey()] || {}, applySore = atTs - now < 18 * 3.6e6;
  const out = {};
  Object.entries(GROUPS).forEach(([g]) => { if(g === 'cardio' || g === 'other') return;
    const hs = Object.keys(HEADS).filter(h => HEADS[h][2] === g); let r = Math.min(...hs.map(h => 1 - (f[h] || 0)));
    if(applySore && sore[g] !== undefined){ const lv = Math.round(sore[g]); r = lv === 4 ? Math.min(r, .2) : lv === 3 ? Math.min(r, .45) : lv === 2 ? Math.min(r, .7) : lv === 0 ? Math.max(r, .9) : r; }
    out[g] = r; });
  return out;
}

function hoursUntilReady(g){ for(let h = 0; h <= 120; h += 2){ if(groupReadiness(Date.now() + h * 3.6e6)[g] >= .8) return h; } return 120; }

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

function sessionRecoveryWarn(){
  if(!active) return '';
  const rd = groupReadiness(new Date(active.start).getTime() - 60000), gs = new Set();
  active.exercises.forEach(e => Object.entries(exById(e.exId).mu).forEach(([h, v]) => { if(v >= 40 && HEADS[h]) gs.add(HEADS[h][2]); }));
  const bad = [...gs].filter(g => rd[g] !== undefined && rd[g] < .6);
  return bad.length ? t('recWarnToday', { m: bad.map(g => ML(g)).join(', '), p: Math.round(Math.min(...bad.map(g => rd[g])) * 100) }) : '';
}

function renderRecovery(){
  const rd = groupReadiness(Date.now()), colors = Object.fromEntries(Object.entries(rd).map(([g, r]) => [g, REC_COL[recState(r)]]));
  const notReady = Object.entries(rd).filter(([, r]) => r < .8).sort((a, b) => a[1] - b[1]);
  const sore = (ui.sore || {})[todayKey()] || {};
  $('gRecV').innerHTML = recoveryWarnings().map(w => `<div class="alert" style="cursor:default;margin-top:10px">${w}</div>`).join('') +
    `<div class="bodymap" style="margin-top:10px">${bodyMapSVG('rec', null, colors)}</div>
    <div class="legend"><span><i style="background:${REC_COL.ok}"></i>${t('recReady')}</span><span><i style="background:${REC_COL.mid}"></i>${t('recMid')}</span><span><i style="background:${REC_COL.low}"></i>${t('recLow')}</span></div>
    <p class="hint">${t('recHint')}</p>` +
    (notReady.length ? notReady.map(([g, r]) => `<div class="prog"><div><b>${esc(ML(g))}</b><small>${t('recIn', { h: hoursUntilReady(g) })}</small></div><span class="mbar"><i style="width:${Math.round(r * 100)}%;background:${REC_COL[recState(r)]}"></i></span><span class="pct" style="color:${REC_COL[recState(r)]}">${Math.round(r * 100)}%</span></div>`).join('')
      : `<div class="alert green" style="cursor:default">${t('recAllReady')}</div>`) +
    '';
}

function openSore(g){
  SO.g = g;
  $('soTitle').textContent = g ? `${t('soreQ')} · ${ML(g)}` : t('soreQ');
  $('soGroups').innerHTML = Object.keys(GROUPS).filter(k => k !== 'cardio' && k !== 'other').map(k => `<button class="fchip ${SO.g === k ? 'on' : ''}" data-sg="${k}">${esc(ML(k))}</button>`).join('');
  const lv = ((ui.sore || {})[todayKey()] || {})[g]; $('soRange').value = lv ?? 0; soreLbl(); open('ovSore');
}

function anatomySVG(o){
  o = o || {};
  const mode = o.mode || 'plain', region = o.region, gcol = o.colors || {}, idp = o.idp || 'an';
  const fill = h => { const g = ANAT_HEAD_GROUP[h];
    if(mode === 'rec') return gcol[g] || '#3a4048';
    if(mode === 'pick'){ const reg = o.groupRegion ? o.groupRegion(g) : null; return !region || reg === region ? HEAD_COL[h] : '#3a4048'; }
    return HEAD_COL[h]; };
  const live = h => mode === 'rec' || mode === 'plain' || !region || (o.groupRegion && o.groupRegion(ANAT_HEAD_GROUP[h]) === region);
  const fem = o.fem !== undefined ? o.fem : ui.sex === 'f', W_ = d => fem ? femWarp(d) : d;
  const half = side => ANAT[side].map(([h, d]) => `<path d="${W_(d)}" class="${mode === 'rec' && fill(h) === REC_COL.low ? 'mlow' : ''}" data-hh="${live(h) ? h : ''}" data-g="${live(h) ? ANAT_HEAD_GROUP[h] : ''}" fill="${fill(h)}" fill-opacity="${live(h) ? .95 : .45}" stroke="#0d0f12" stroke-width="1.3" stroke-linejoin="round" style="${live(h) ? 'cursor:pointer' : 'pointer-events:none'}"/>` +
      `<path d="${d}" fill="url(#${idp}shade)" style="pointer-events:none"/>`).join('') +
    `<path d="${W_(ANAT_FIBRES[side])}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width=".8" stroke-linecap="round" style="pointer-events:none"/>`;
  const skin = `<g fill="#2b3036" stroke="#1a1d21" stroke-width="1" style="pointer-events:none">${ANAT_SKIN.map(d => `<path d="${W_(d)}"/>`).join('')}${ANAT_SKIN_ELL.map(([cx, cy, rx, ry]) => `<ellipse cx="${fem ? femX(cx, cy) : cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`;
  const fig = (side, ox, label) => `<g transform="translate(${ox} 0)">
      <g style="pointer-events:none">${fem ? '<path d="M78 40 C76 14 124 14 122 40 C124 62 126 78 118 86 L82 86 C74 78 76 62 78 40 Z" fill="#23272c"/>' : ''}<ellipse cx="100" cy="36" rx="${fem ? 19 : 21}" ry="${fem ? 24.5 : 26}" fill="#2b3036" stroke="#1a1d21"/><path d="M86 54 L114 54 L121 77 L79 77 Z" fill="#2b3036"/></g>
      ${skin}<g transform="translate(200 0) scale(-1 1)">${skin}</g>
      ${half(side)}<g transform="translate(200 0) scale(-1 1)">${half(side)}</g>
      ${o.labels === false ? '' : `<text x="100" y="438" text-anchor="middle" fill="#8b949c" font-size="13" font-family="system-ui">${label}</text>`}</g>`;
  return `<svg viewBox="0 0 420 446" width="100%" style="max-width:${o.max || 380}px;display:block;margin:0 auto" aria-hidden="true">
    <defs><radialGradient id="${idp}shade" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>
    ${fig('f', 0, o.front || 'Front')}${fig('b', 220, o.back || 'Back')}</svg>`;
}

function drawRecipeBox(){
  $('recipeBox').classList.add('hide');
  $('recipeShow').classList.toggle('hide', !D.recipe);
  if(D.recipe) $('recipeShow').innerHTML = recipeHtml(D.recipe, true) + `<button class="linkbtn" id="dropRecipe">✕ ${t('noThanks')}</button>`;
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

function renderGym_053(){
  const h = location.hash.slice(1), sec = GSEC[h] || null;
  $('gHub').classList.toggle('hide', !!sec); $('gSecTitle').classList.toggle('hide', !sec);
  $('gBackBtn').classList.toggle('hide', !sec);
  $('gSecTitle').textContent = sec ? t({ plan: 'hubWeek', tpl: 'hubLib', prog: 'hubProg', rec: 'hubRec' }[sec]) : '';
  ['plan', 'tpl', 'prog', 'rec'].forEach(k => $({ plan: 'gPlanV', tpl: 'gTplV', prog: 'gProgV', rec: 'gRecV' }[k]).classList.toggle('hide', sec !== k));
  $('gWeigh').classList.toggle('hide', sec !== 'prog'); if(sec === 'prog' && typeof drawWeigh === 'function') drawWeigh();   // 0.5.9: weigh-in lives in Progress
  const today = planFor(todayKey()), tp = today && today.tpl && tpls.find(x => x.id === today.tpl);
  $('gStart').textContent = active ? t('resume', { m: Math.floor((Date.now() - new Date(active.start)) / 60000) }) : tp ? t('startToday', { n: tp.name }) : t('startAny');
  $('gStart').classList.toggle('hide', !!sec);   // 0.6.1: no Start button inside the Library
  const gap = gapDays(), cb = comebackFactor();
  $('gBanner').innerHTML = sec ? '' : cb < 1 ? `<div class="alert" style="cursor:default">${t('cbActive', { k: sessions.filter(s => s.start > comeback.at).length + 1, p: Math.round(cb * 100) })}</div>`
    : gap !== null && gap >= 14 && !active ? `<div class="alert" style="display:block;cursor:default"><b>${t('breakT', { n: gap })}</b><br><small>${t('breakTxt', { p: Math.round(cbBase(gap) * 100), s: Math.ceil((1 - cbBase(gap)) / .05) + 1 })}</small></div>` : '';
  if(!sec){
    const rd = groupReadiness(Date.now()), colors = Object.fromEntries(Object.entries(rd).map(([g, r]) => [g, REC_COL[recState(r)]])), low = Object.values(rd).filter(r => r < .8).length;
    $('gMiniRec').innerHTML = `<div class="rbhead"><b>🔋 ${t('hubRec')}</b><span>›</span></div>` + anatomySVG({ mode: 'rec', colors, labels: false, max: 230, idp: 'mini' }) + `<small>${low ? t('recMid') + ' · ' + low : t('recReady') + ' ✓'}</small>`;
    $('hubLibSub').textContent = t('hubLibSub', { n: tpls.length });
  }
  renderGymPlan(); renderTpls(); renderProgress(); if(sec === 'rec') renderRecovery();
}

function renderGymPlan(){
  const tk = todayKey(), twd = new Date(tk + 'T12:00:00').getDay(), monday = addDays(tk, -((twd + 6) % 7));
  $('gPlanV').innerHTML = `<p class="hint" style="margin:10px 0">${t('weekHint')}</p>` + [1, 2, 3, 4, 5, 6, 0].map((wd, i) => { const p = gymPlan[wd] || {}, date = addDays(monday, i), done = sessions.some(s => s.date === date);
    return `<div class="daycard ${wd === twd ? 'today' : ''}" data-wd="${wd}">
      <div class="dch"><b>${WD()[wd]}</b><small>${fmtDate(date)}</small>${done ? `<span class="chip ok">✓ ${t('trained')}</span>` : ''}</div>
      <div class="dcrow"><span class="dcl">🏋️</span><select data-ptpl><option value="">—</option><option value="rest" ${p.tpl === 'rest' ? 'selected' : ''}>😴 ${t('restDayL')}</option><option value="gym" ${p.tpl === 'gym' ? 'selected' : ''}>🏋️ ${t('gymAnyOpt')}</option>${tpls.map(x => `<option value="${x.id}" ${p.tpl === x.id ? 'selected' : ''}>${WT_ICON[x.type] || '🏋️'} ${esc(x.name)}</option>`).join('')}</select>
        <input type="time" data-ptime value="${p.time || ''}" ${!p.tpl || p.tpl === 'rest' ? 'disabled' : ''}></div>
      ${p.work ? `<div class="dcrow"><span class="dcl">💼</span><input type="time" data-wfrom value="${p.work.from}"><span class="rmeta">–</span><input type="time" data-wto value="${p.work.to}"><button class="irm" data-wrm>✕</button></div>`
        : `<button class="linkbtn" data-wadd>${t('addWork')}</button>`}</div>`; }).join('');
}

// ---------- Workout Library: starts empty, pick a type ----------
let LIBF = { saved: true, past: false };
function renderTpls(){
  const saved = tpls.length ? `<div class="list" style="margin-top:6px">${tpls.map(x => { const last = sessions.filter(s => s.tplId === x.id).sort((a, b) => b.start.localeCompare(a.start))[0];
    return `<div class="card" data-tp="${x.id}"><div class="ficon">${WT_ICON[x.type] || '🏋️'}</div><div class="body">
      <div class="name">${esc(x.name)}</div><div class="rmeta">${typeLabel_(x.type)} · ${t('nEx', { n: x.exercises.length })}${last ? ' · ' + t('lastDone', { d: fmtDate(last.start) }) : ''}</div>
      <div class="rmeta" style="margin-top:4px">${x.exercises.slice(0, 4).map(e => esc(exName(e.exId))).join(', ')}${x.exercises.length > 4 ? '…' : ''}</div></div>
      <button class="usebtn" data-go-tp>▶</button></div>`; }).join('')}</div>` : `<div class="empty" style="margin-top:6px">${t('libEmpty')}</div>`;
  const past = sessions.slice().sort((a, b) => b.start.localeCompare(a.start));
  const pastHtml = past.length ? `<div class="list" style="margin-top:6px">${past.map(s => `<div class="card" data-ses="${s.id}"><div class="ficon">${WT_ICON[s.type] || '🏋️'}</div><div class="body">
      <div class="name">${esc(s.name)}</div><div class="rmeta">${fmtDate(s.start)} · ${s.mins} min · ${t('nEx', { n: s.exercises.length })}${s.vol ? ' · ' + s.vol.toLocaleString() + ' kg' : ''}</div></div></div>`).join('')}</div>`
    : `<p class="hint">${t('noPast')}</p>`;
  const fold = (k, title, n, body) => `<button class="foldh ${LIBF[k] ? 'open' : ''}" data-fold="${k}"><b>${title}</b><span class="fn">${n}</span><i>⌄</i></button>${LIBF[k] ? `<div class="foldb">${body}</div>` : ''}`;
  $('gTplV').innerHTML = fold('saved', t('savedWorkouts'), tpls.length, saved) +
    fold('past', t('pastWorkouts'), past.length, pastHtml);
}

function openTpl_053(x, type){
  if(!x && !type) return openWType();
  TP = x ? JSON.parse(JSON.stringify(x)) : { id: null, name: typeLabel_(type), type, exercises: [] };
  $('tpTitle').textContent = x ? t('editWorkout') : t('newWorkout'); $('tpName').value = TP.name; setSeg('#tpType', TP.type);
  $('tpDel').classList.toggle('hide', !x); drawTpl(); open('ovTpl');
}

function openWType(){ drawWType(false); open('ovWType'); }

function drawWType(bro){
  $('wtList').innerHTML = (bro ? `<button class="pback" data-wtback>‹ ${t('broSplit')}</button>` : '') + `<div class="ggrid">` +
    (bro ? BRO.map(([k, l]) => `<button class="gbtn wt" data-wt="${k}"><span class="e">${WT_ICON[k]}</span><b>${t(l)}</b></button>`)
         : WTYPES.map(([k, ic, l]) => `<button class="gbtn wt" data-wt="${k}"><span class="e">${ic}</span><b>${t(l)}</b>${k === 'bro' ? `<small>${t('broSub')}</small>` : ''}</button>`)).join('') + '</div>';
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

function exTiles(list, key){
  return `<div class="exgrid">${list.map(x => `<button class="extile" data-ex="${x.id}" style="--eq:${EQ_COL[x.e] || '#8b949c'}"><span class="eqb">${eqIcon(x.e, 14)}</span><span class="iinfo" data-exinfo="${x.id}">ⓘ</span>${exIcon(x, 52)}<b>${esc(exName(x))}</b><small>${EL(x.e)}${key ? ` · ${exScore(x, key)}%` : ''}</small></button>`).join('')}</div>`;
}

function exTilesByEq(list, key){
  return EQ_ORDER.filter(e => list.some(x => x.e === e)).map(e => `<div class="eqhead" style="color:${EQ_COL[e]}">${eqIcon(e, 18)} ${EL(e)}</div>${exTiles(list.filter(x => x.e === e), key)}`).join('');
}

function bodyMapSVG(mode, region, colors){
  return anatomySVG({ mode, region, colors, groupRegion: g => (GROUPS[g] || [])[2], front: t('front'), back: t('backSide'), idp: mode });
}

function drawExPick(){
  const q = norm($('exSearch').value), tokens = q.split(' ').filter(Boolean);
  setSeg('#pkRegion', PK.region); setSeg('#pkMode', PK.mode);
  $('pkModeRow').classList.toggle('hide', !!q || PK.region === 'cardio' || !!PK.group);
  let h = '';
  if(q){
    const list = EX().filter(x => tokens.every(tk => norm(`${x.en} ${x.el} ${ML(x.h)} ${ML(x.m)} ${EL(x.e)} ${(HEADS[x.h] || []).join(' ')}`).includes(tk)));
    h = exTilesByEq(list.slice(0, 80)) + `<button class="sitem" data-new style="margin-top:10px"><span class="e">✏️</span><span class="t"><b>${t('createEx', { q: esc($('exSearch').value.trim()) })}</b><small>${ML(PK.group || 'other')}</small></span></button>`;
  } else if(PK.region === 'cardio'){
    h = exTiles(EX().filter(x => x.m === 'cardio'));
  } else if(!PK.group){
    if(PK.mode === 'map') h = `<div class="bodymap">${bodyMapSVG('pick', PK.region)}</div><p class="hint" style="text-align:center">${t('tapMuscle')}</p>`;
    else h = `<div class="ggrid">${Object.entries(GROUPS).filter(([, g]) => g[2] === PK.region).map(([k, g]) => { const hs = Object.keys(HEADS).filter(x => HEADS[x][2] === k);
      return `<button class="gbtn" data-grp="${k}" style="--gc:${HEAD_COL[hs[0]] || g[3]}"><b>${esc(ML(k))}</b><span class="dots">${hs.map(x => `<i style="background:${HEAD_COL[x]}"></i>`).join('')}</span><small>${t('nEx', { n: EX().filter(x => x.m === k).length })}</small></button>`; }).join('')}</div>`;
  } else {
    const heads = Object.entries(HEADS).filter(([, v]) => v[2] === PK.group).map(([k]) => k), key = PK.head || PK.group;
    let list = EX().filter(x => exScore(x, key) >= (PK.head ? 25 : 40) && x.m !== 'cardio').sort((a, b) => exScore(b, key) - exScore(a, key) || (exHistory(b.id).length - exHistory(a.id).length));
    const eqs = EQ_ORDER.filter(e => list.some(x => x.e === e));
    if(PK.eq) list = list.filter(x => x.e === PK.eq);
    h = `<button class="pback" data-pkback>${t('allMuscles')}</button><h3 style="margin:0 0 8px;color:${HEAD_COL[PK.head] || HEAD_COL[heads[0]]}">${esc(ML(PK.head || PK.group))}</h3>` +
      (heads.length > 1 ? `<div class="chips" style="margin-bottom:8px"><button class="fchip ${!PK.head ? 'on' : ''}" data-head="">${t('all')}</button>${heads.map(k => `<button class="fchip hchip ${PK.head === k ? 'on' : ''}" data-head="${k}" style="--hc:${HEAD_COL[k]}"><i></i>${esc(ML(k))}</button>`).join('')}</div>` : '') +
      `<div class="chips eqchips" style="margin-bottom:10px"><button class="fchip ${!PK.eq ? 'on' : ''}" data-eq="">${t('allEquip')}</button>${eqs.map(e => `<button class="fchip eqchip ${PK.eq === e ? 'on' : ''}" data-eq="${e}" style="--ec:${EQ_COL[e]}">${eqIcon(e, 15)} ${EL(e)}</button>`).join('')}</div>` +
      (PK.eq ? exTiles(list, key) : exTilesByEq(list, key));
  }
  $('pkBody').innerHTML = h;
}

function renderTodayRec(){
  const el = $('dRec'); if(el) el.innerHTML = '';
  const isToday = daysUntil(curDay) === 0, wb = workFor(curDay), di = dayInfo(curDay), pl = planFor(curDay);
  const tp = pl && pl.tpl && tpls.find(x => x.id === pl.tpl), nm = tp ? tp.name : t('gymAny'), lines = [];
  if(di.type === 'gym'){ const tm = (pl && pl.type === 'gym' && pl.time) || (days[curDay] && days[curDay].time) || '';
    lines.push(tm ? `<b>${t('remGym', { n: esc(nm), t: tm })}</b>` : `<b>${t('remGymNoT', { n: esc(nm) })}</b> <button class="linkbtn" data-goweek>${t('remSetT')}</button>`); }
  const ws = isToday ? recoveryWarnings() : [];
  const hidden = ui.remHide === curDay;
  $('dBlocks').innerHTML = (lines.length || ws.length) && !hidden ? `<div class="remind"><div class="rmtxt">${lines.map(l => `<div>${l}</div>`).join('')}${ws.map(w => `<div class="rmrec" data-gorec>🔋 ${w}</div>`).join('')}</div>
    <div class="rmbtns"><button class="linkbtn" data-goweek aria-label="Edit">✎</button><button class="linkbtn" data-rmx aria-label="Hide">✕</button></div></div>` : '';
}

function planFor(d){ const wd = new Date(d + 'T12:00:00').getDay(); const p = gymPlan[wd]; if(!p || !p.tpl) return null;
  if(p.tpl === 'rest') return { type: 'rest' };
  if(p.tpl === 'gym') return { type: 'gym', work: 'upper', time: p.time || ui.gymTime || '18:00' };
  const tp = tpls.find(x => x.id === p.tpl); return tp ? { type: 'gym', work: workKind(tp.type), time: p.time || ui.gymTime || '18:00', tpl: tp.id } : null; }

function cardHtml(x, i){
  const ex = exById(x.exId), card = isCardio(x.exId), sug = suggestFor(x.exId, x.reps);
  const doneN = x.sets.filter(s => s.done && s.type !== 'W').length, vol = Math.round(exVol(x.exId, x.sets));
  const head = `<div class="exh">${exIcon(ex, 44)}<div class="ttl"><b data-info>${esc(exName(ex))} <span class="i">ⓘ</span></b>
      <small>${ML(ex.h)} · ${EL(ex.e)}${card || x.ended ? '' : ` · <button class="rest" data-rest>⏱ ${fmtRest(x.rest)}</button>`}</small>${x.t0 ? `<small class="extimer" data-xt="${i}">${exTime(x)}</small>` : ''}</div>`;
  let info = '';
  if(sug && sug.last) info += `${t('lastTime')} <b>${sug.last.sets.map(s => `${fmt(+s.w)}×${s.r}`).join(' · ')}</b><br>`;
  if(sug && sug.cb) info += `<span class="cb">${t('comebackW', { p: sug.p, w: fmt(sug.w), r: sug.r })}</span>`;
  else if(sug && sug.first) info += t('firstTime', { r: sug.hi });
  else if(sug) info += `<span class="try">${t('tryNext', { w: fmt(sug.w), r: sug.r })}</span>`;
  if(x.ended) info = '';
  const hasWarm = x.sets.some(s => s.type === 'W'), wu = !x.ended && sug && !sug.first && !hasWarm && !x.sets.some(s => s.done) ? warmupFor(x.exId, sug.w) : [];
  let n = 0, prevVals = null;
  const rows = x.sets.map((s, j) => {
    if(s.type !== 'W') n++;
    const ph = s.type === 'W' ? {} : prevVals ? prevVals : (sug && !sug.first ? { w: sug.w, r: String(sug.r).split('-').pop() } : sug && sug.last ? { w: sug.last.top.w, r: sug.last.top.r } : {});
    if(s.type !== 'W' && (s.w !== '' || s.r !== '')) prevVals = { w: s.w || ph.w, r: s.r || ph.r };
    const restHere = REST && REST.xi === i && REST.si === j;
    const lw = s.type !== 'W' && sug && sug.last && !card ? sug.last.sets.filter(z => z.type !== 'W')[n - 1] : null;
    const stp = k => `<div class="stepper"><button data-step="${k}" data-d="-1" aria-label="minus">−</button><input data-${k} inputmode="${k === 'w' ? 'decimal' : 'numeric'}" value="${s[k]}" placeholder="${ph[k] ?? (k === 'w' ? (card ? 'km' : 'kg') : (card ? 'min' : t('repsLbl')))}"><button data-step="${k}" data-d="1" aria-label="plus">＋</button></div>`;
    return `<div class="setrow t-${s.type} ${s.done ? 'done' : ''} ${s.pr ? 'pr' : ''}" data-s="${j}">
        <button class="snum" data-type title="${t('tapNum')}">${s.type === 'N' ? n : s.type}</button>${stp('w')}${stp('r')}
        <button class="sok" data-ok>${s.pr === 'v' ? '📈' : s.pr ? '🏆' : '✓'}</button></div>` + (lw ? `<div class="prevset">${t('lastSetL', { w: fmt(+lw.w), r: lw.r })}</div>` : '') +
      (restHere ? `<div class="restin ${REST.rang ? 'over' : ''}"><div class="rbtop"><b id="restTxt2"></b><span><button data-rs="-15">−15</button><button data-rs="15">+15</button><button data-rs="skip">${t('skip')}</button></span></div><span class="mbar"><i id="restProg2" style="width:${Math.max(0, Math.min(100, (1 - (REST.end - Date.now()) / 1000 / REST.total) * 100))}%"></i></span></div>` : '');
  }).join('');
  return `<div class="exc ${x.ended ? 'ended' : ''}" data-x="${i}">${head}<div class="exbtns"><button class="formb" data-demo>${t('formBtn')}</button>${card ? '' : `<button class="taken" data-swap>🚫</button>`}<button data-xrm aria-label="Remove">✕</button></div></div>
    ${info ? `<div class="exinfo">${info}</div>` : ''}
    ${wu.length ? `<div class="wuhint"><span>🔥 ${t('warmupS', { s: wu.map(w => `${fmt(w.w)}×${w.r}`).join(' · ') })}</span><button data-warm>${t('addWarm')}</button></div>` : ''}
    ${x.sets.length ? `<div class="sethead"><span>${t('setLbl')}</span><span>${card ? t('kmLbl') : t('kgLbl')}</span><span>${card ? t('minLbl') : t('repsLbl')}</span><span>✓</span></div>` : ''}
    ${rows}
    ${x.ended ? `<div class="exdone"><span>✓ ${t('exDone')} · ${t('nSets', { n: doneN })}${card ? '' : ` · ${vol.toLocaleString()} kg`}${x.sets.some(s => s.pr === 'w') ? ' · 🏋️' : ''}${x.volPR ? ' · 📈' : ''}</span><button class="linkbtn" data-reopen>↺ ${t('reopenEx')}</button></div>`
      : `<div class="setbtns"><button data-addset>${t('newSet')}</button><button class="endex" data-endex>${t('endEx')}</button></div>`}</div>`;
}

// workout template editor: clear rows with labelled steppers
function drawTpl(){
  $('tpTypeShow').innerHTML = `${WT_ICON[TP.type] || '🏋️'} <b>${typeLabel_(TP.type)}</b> <button class="linkbtn" id="tpTypeChg">${t('typeChange')}</button>`;
  $('tpList').innerHTML = TP.exercises.map((e, i) => { const ex = exById(e.exId), card = isCardio(e.exId);
    const reps = String(e.reps);
    return `<div class="tpcard" data-i="${i}"><div class="tph">${exIcon(ex, 40)}<div class="ttl"><b>${esc(exName(ex))}</b><small>${ML(ex.h)} · ${EL(ex.e)}</small></div>
      <div class="tpb"><button data-demo2 class="formb">▶</button><button data-rm aria-label="Remove">✕</button></div></div>
      <div class="tpsteps"><div class="tps"><small>${t('setsL')}</small><div class="stepper"><button data-sd>−</button><b>${e.sets}</b><button data-su>＋</button></div></div>
      ${card ? `<div class="tps"><small>${t('minLbl')}</small><div class="stepper"><button data-rd>−</button><input data-reps value="${esc(reps)}" inputmode="numeric"><button data-ru>＋</button></div></div>`
        : `<div class="tps"><small>${t('restL')}</small><div class="stepper"><button data-rsd>−</button><b>${fmtRest(rest30(e.rest))}</b><button data-rsu>＋</button></div></div>`}</div></div>`; }).join('') || `<p class="hint">${t('nothingHere')}</p>`;
}

function openTpl(x, type){ openTpl_053(x, type); if($('ovTpl').classList.contains('open')) $('tpType').classList.add('hide'); }

async function loadFedb(){ if(FEDB) return FEDB; let err; for(const u of FEDB_URLS){ try{ const r = await fetch(u); if(r.ok){ FEDB = await r.json(); return FEDB; } }catch(e){ err = e; } } throw err || new Error('load'); }

function demoMatches(exId){
  const ex = exById(exId), mine = tokz(ex.en), eq = EQ_FE[ex.e];
  return FEDB.map(d => { const th = tokz(d.name), hit = mine.filter(w => th.includes(w)).length; if(!hit) return null;
    let s = hit * 3 - (th.length - hit) * .6 - (mine.length - hit) * 1.2; if(eq && d.equipment === eq) s += 2; if(norm(d.name) === norm(ex.en)) s += 6; return { d, s }; })
    .filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 6).map(x => x.d);
}

async function openDemo(exId){
  DEMO.exId = exId; clearInterval(DEMO.timer); $('dmTitle').textContent = exName(exId); $('dmBody').innerHTML = `<p class="hint">${t('formLoading')}</p>`; $('dmNext').classList.add('hide'); open('ovDemo');
  try{ await loadFedb(); }catch(e){ $('dmBody').innerHTML = `<p class="hint">${t('formFail')}</p>`; return; }
  DEMO.list = demoMatches(exId); const saved = (ui.demoPick || {})[exId], si = saved ? DEMO.list.findIndex(d => d.id === saved) : -1;
  if(saved && si === -1){ const d = FEDB.find(z => z.id === saved); if(d) DEMO.list.unshift(d); }
  DEMO.i = Math.max(0, si); drawDemo();
}

function drawDemo(){
  clearInterval(DEMO.timer); const d = DEMO.list[DEMO.i];
  if(!d){ $('dmBody').innerHTML = `<p class="hint">${t('formNone')}</p>`; $('dmNext').classList.add('hide'); return; }
  $('dmNext').classList.toggle('hide', DEMO.list.length < 2);
  const imgs = (d.images || []).map(FEDB_IMG);
  $('dmBody').innerHTML = `<div class="demoimg">${imgs.map((u, i) => `<img src="${u}" alt="" class="${i ? '' : 'on'}" loading="eager">`).join('')}</div><p class="rmeta" style="margin:8px 0 0"><b>${esc(d.name)}</b>${d.equipment ? ' · ' + esc(d.equipment) : ''}</p>
    <ol class="steps demosteps">${(d.instructions || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol><p class="hint">${t('formCredit')}</p>`;
  let k = 0; DEMO.timer = setInterval(() => { const im = $('dmBody').querySelectorAll('.demoimg img'); if(!im.length || !$('ovDemo').classList.contains('open')){ clearInterval(DEMO.timer); return; } k = (k + 1) % im.length; im.forEach((x, j) => x.classList.toggle('on', j === k)); }, 900);
}

function openExInfo(id, addCb){
  openExInfo_0(id, addCb);
  const b = document.createElement('button'); b.className = 'btn formwide'; b.textContent = t('formBtn') + ' · ' + t('formT'); b.addEventListener('click', () => openDemo(id)); $('eiBody').prepend(b);
}

function soreLbl(){ const v = Math.round(+$('soRange').value); $('soFace').textContent = SORE[v]; $('soText').textContent = t('sore' + v); }

function renderGym(){ renderGym_053(); const pl = planFor(todayKey()), tp = pl && pl.tpl && tpls.find(x => x.id === pl.tpl);
  $('gOther').classList.toggle('hide', !!active || !tp || $('gStart').classList.contains('hide')); }

// ======================= 0.5.5 =======================
// ---------- fridge: identical packs stack into one row (Bananas ×6) with − / ＋ ----------
function fridgeGroups(items){
  const map = new Map();
  items.forEach(x => { const it = x.it, full = it.packSize && Math.abs(it.qty - it.packSize) <= 0.5;
    const k = full ? [it.foodId || 'm' + it.mealId, it.loc, it.packSize, it.exp || ''].join('|') : 'one|' + it.id;
    if(!map.has(k)) map.set(k, { ...x, list: [] }); map.get(k).list.push(it); });
  return [...map.values()];
}

// summary + recovery estimate (offline at once, AI refines it when there's a key)
function recBlock(ses, r, note){
  return `<div id="smRec"><h3>🔋 ${t('recEstT')}</h3><p class="hint" style="margin:0">${t('recEstSub')}</p><div class="recest">${Object.entries(r).sort((a, b) => b[1] - a[1]).map(([g, hh]) => `<span class="rchip"><b>${esc(ML(g))}</b> ${hh > 0 ? `~${hh} h` : t('recReadyChip')}</span>`).join('')}</div>
    <p class="hint">${note}</p></div>`;
}
function showSummary(ses){
  showSummary_0(ses);
  const r = ses.recov || estimateRecovery(ses); if(!Object.keys(r).length) return;
  const fresh = ses === sessions[sessions.length - 1] && !ses.recovAI && Date.now() - new Date(ses.end || 0) < 6e5 && settings.geminiKey;
  const note = ses.recovAI ? '✨ ' + esc(ses.recovNote || t('recAIdone')) : fresh ? t('recAIwait') : t('recOffline');
  const box = document.createElement('div'); box.innerHTML = recBlock(ses, r, note);
  const h3 = [...$('smBody').querySelectorAll('h3')][0]; if(h3) h3.before(box.firstElementChild); else $('smBody').appendChild(box.firstElementChild);
  if(!fresh) return;
  aiRecovery(ses).then(res => { const el = $('smRec');
    if(!res){ if(el) el.outerHTML = recBlock(ses, r, t('recAIFail')); return; }
    ses.recov = res.hours; ses.recovAI = true; ses.recovNote = res.note; saveG('ses'); renderAll();
    if(el && document.contains(el)) el.outerHTML = recBlock(ses, res.hours, '✨ ' + esc(res.note || t('recAIdone')));
  }).catch(() => { const el = $('smRec'); if(el) el.outerHTML = recBlock(ses, r, t('recAIFail')); });
}

// ---------- 💡 light bulb in the exercise picker ----------
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
    $('blTitle').textContent = '💡 ' + t('blNextT');
    $('blBody').innerHTML = `<p class="sub">${t('blLooks', { d: typeLabel_(ty) })}</p>` + (picks.length ? `<div class="blbest"><small>${t('blBest')}</small>${exTiles([picks[0].ex], picks[0].h)}</div>` +
      (picks.length > 1 ? `<h3>${t('blOr')}</h3>${exTiles(picks.slice(1).map(p => p.ex))}` : '') : `<p class="hint">${t('blDone')}</p>`);
  } else drawBulbTypes();
  open('ovBulb');
}
function drawBulbTypes(){
  $('blTitle').textContent = '💡 ' + t('blBuildT');
  const types = [['push', '🫸', 'wPush'], ['pull', '🫷', 'wPull'], ['upper', '💪', 'wUpper'], ['lower', '🦵', 'wLower'], ['full', '🏋️', 'wFull']];
  $('blBody').innerHTML = `<div class="alert" style="cursor:default">${t('blNeedEx')}</div><p class="sub">${t('blPick')}</p>
    <div class="blchips">${types.map(([k, ic, l]) => `<button class="blchip" data-bt="${k}">${ic} ${t(l)}</button>`).join('')}</div>
    <p class="sub" style="margin-top:12px">${t('blOrMuscle')}</p><div class="blchips">${BRO.map(([k, l]) => `<button class="blchip" data-bt="${k}">${WT_ICON[k] || '•'} ${t(l)}</button>`).join('')}</div><div id="blPlan"></div>`;
}
function drawBulbPlan(type){
  const list = buildWorkout(type); BULB = { type, list };
  document.querySelectorAll('#blBody .blchip').forEach(b => b.classList.toggle('on', b.dataset.bt === type));
  $('blPlan').innerHTML = list.length ? `<h3>${typeLabel_(type)} · ${t('nEx', { n: list.length })}</h3><ol class="blplan">${list.map(e => `<li><b>${esc(exName(e))}</b><small>${esc(ML(e.h))} · ${EL(e.e)} · 3 × ${defReps(e.rest)}</small></li>`).join('')}</ol>
    <div class="actions"><button class="btn primary" id="blAccept">${t('blAccept')}</button></div>` : `<p class="hint">${t('blNone')}</p>`;
  setTimeout(() => $('blPlan').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}
function acceptBulbPlan(){
  if(!BULB || !active) return;
  BULB.list.forEach(e => active.exercises.push({ exId: e.id, reps: defReps(e.rest), rest: e.rest, sets: [newSet(), newSet(), newSet()] }));
  if(!active.tplId && !active.exercises.slice(0, -BULB.list.length).length){ active.type = BULB.type; active.name = typeLabel_(BULB.type); }
  saveG('act'); close('ovBulb'); close('ovExPick'); renderSession(); toast(t('blAdded', { n: BULB.list.length })); BULB = null;
}

// ---------- keep the screen on while a workout is open ----------
let WAKE = null;
async function keepAwake(on){
  try{ if(on){ if(!WAKE && navigator.wakeLock && document.visibilityState === 'visible'){ WAKE = await navigator.wakeLock.request('screen'); WAKE.addEventListener('release', () => { WAKE = null; }); } }
    else if(WAKE){ const w = WAKE; WAKE = null; await w.release(); } }catch(e){ WAKE = null; }
}

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
    exercises: SV.exercises.map(x => ({ exId: x.exId, sets: x.sets.filter(s => s.type !== 'W').length || 3, reps: x.reps, rest: x.rest })) };
  tpls.push(tpl); saveG('tpl'); SV.tplId = tpl.id; SV.name = name; saveG('ses'); SV = null;
  close('ovSaveTpl'); renderAll(); toast(t('tplSavedT', { n: name }));
}

// ---------- 0.6.1: rest in 30 s steps (0:30 – 5:00); long press to drag a block up or down ----------
const rest30 = v => Math.max(30, Math.min(300, Math.round((+v || 90) / 30) * 30));
function makeSortable(box, itemSel, onMove){
  let tm = null, drag = null, sx = 0, sy = 0;
  const items = () => [...box.querySelectorAll(itemSel)];
  const stop = () => { clearTimeout(tm); tm = null; };
  box.addEventListener('pointerdown', e => {
    if(drag || e.button > 0 || e.target.closest('input,button,textarea,select,a')) return;
    const it = e.target.closest(itemSel); if(!it || !box.contains(it)) return;
    sx = e.clientX; sy = e.clientY;
    tm = setTimeout(() => { tm = null; const list = items(), from = list.indexOf(it); if(from < 0) return;
      drag = { it, from, to: from, y0: sy, rects: list.map(el => el.getBoundingClientRect()), list };
      it.classList.add('dragging'); document.body.classList.add('sorting'); if(typeof haptic === 'function') haptic(); }, 420);
  });
  box.addEventListener('pointermove', e => {
    if(tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) stop();   // moved first = it's a scroll, not a long press
    if(!drag) return; e.preventDefault();
    const dy = e.clientY - drag.y0, r = drag.rects, me = r[drag.from], mid = me.top + me.height / 2 + dy;
    let to = drag.from; r.forEach((rc, i) => { if(i < drag.from && mid < rc.top + rc.height / 2) to = Math.min(to, i); if(i > drag.from && mid > rc.top + rc.height / 2) to = Math.max(to, i); });
    drag.to = to; drag.it.style.transform = `translateY(${dy}px) scale(1.02)`;
    drag.list.forEach((el, i) => { if(el === drag.it) return; const sh = drag.from < to && i > drag.from && i <= to ? -(me.height + 10) : drag.from > to && i < drag.from && i >= to ? me.height + 10 : 0; el.style.transform = sh ? `translateY(${sh}px)` : ''; });
  });
  const end = () => { stop(); if(!drag) return; const { from, to, list } = drag; drag = null; document.body.classList.remove('sorting');
    list.forEach(el => { el.style.transform = ''; el.classList.remove('dragging'); }); if(from !== to) onMove(from, to); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  document.addEventListener('touchmove', e => { if(drag) e.preventDefault(); }, { passive: false });   // no page scroll while dragging
  box.addEventListener('contextmenu', e => { if(drag || tm) e.preventDefault(); });
}

// 0.6.2: female figure = the same muscles, reshaped: narrower shoulders and arms, a narrower waist, wider hips
const FEM_K = [[0, 1], [70, 1], [92, .9], [150, .9], [178, .88], [200, .93], [232, 1.09], [280, 1.05], [330, 1], [460, 1]];
function femS(y){ for(let i = 1; i < FEM_K.length; i++){ const [y1, s1] = FEM_K[i], [y0, s0] = FEM_K[i - 1]; if(y <= y1) return s0 + (s1 - s0) * (y - y0) / (y1 - y0); } return 1; }
const femX = (x, y) => +(100 - (100 - x) * femS(y)).toFixed(1);
function femWarp(d){ return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (m, x, y) => `${femX(+x, +y)} ${y}`); }
