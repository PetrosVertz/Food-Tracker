// Today's food: daily log, targets, macros, plan my day, quick add, weigh-in. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function infoOfEntry(e){
  if(e.kind === 'meal'){ const m = meals.find(x => x.id === e.refId); return m ? { name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null } : null; }
  const f = foods.find(x => x.id === e.refId); return f ? fInfo_(f) : null;
}

function dayInfo(d){
  if(days[d]) return days[d];
  const pl = planFor(d); if(pl) return { ...pl, guessed: true };   // your weekly gym plan comes first
  const wk = days[addDays(d, -7)];   // same weekday last week is a good guess for a gym schedule
  return wk ? { type: wk.type, work: wk.work, time: wk.time, guessed: true } : { type: 'rest' };
}

// V3: the Gym Day / Rest Day label, one answer for every screen. Order: the day's stored status (a manual choice, or what a started workout set) →
// a workout already done that day → the plan (or last week's guess) → Rest Day. It only READS days / sessions / gymPlan; nothing is written,
// so a manual override never touches workout history, planner targets or the streak. The time is the real stored one: never made up.
function dayStatus(d){
  const o = days[d]; if(o && o.type) return { type: o.type === 'gym' ? 'gym' : 'rest', time: o.type === 'gym' ? o.time || '' : '' };
  if((typeof sessions !== 'undefined' ? sessions : []).some(s => s && s.date === d)) return { type: 'gym', time: '' };
  const di = dayInfo(d); if(di.type !== 'gym') return { type: 'rest', time: '' };
  if(planFor(d)){ const rp = gymPlan[new Date(d + 'T12:00:00').getDay()]; return { type: 'gym', time: (rp && rp.time) || '' }; }   // planFor() fills a default time; show only one that was set
  return { type: 'gym', time: di.time || '' };
}
function dayPillHtml(d){ const s = dayStatus(d), tm = s.type === 'gym' && toMin(s.time) !== null ? fmtClock(s.time) : '';
  return `<span class="daypill">${t(s.type === 'gym' ? 'gymDay' : 'restDay')}${tm ? `<span class="dpsub"><span class="dpsep"> · </span>${esc(tm)}</span>` : ''}</span>`; }

function targetFor(d){ if(!targets) return null; const di = dayInfo(d); return targets[di.type === 'gym' ? 'gym' : 'rest'] || null; }

// carb windows around the workout (minutes since midnight)
function carbWindows(d){
  const di = dayInfo(d), tg = targetFor(d); const C = tg ? tg.c : 0;
  if(di.type !== 'gym' || !toMin(di.time)){
    return [['winMorning', 360, 719], ['winMidday', 720, 1019], ['winEvening', 1020, 1439]].map(([k, a, b]) => ({ k, a, b, c: C / 3, na: 1 / 3, kk: 1 / 3, tip: k === 'winMorning' ? t('tipRest') : '' }));
  }
  const T = toMin(di.time), cardio = di.work === 'cardio', dur = cardio ? 45 : 75;
  const split = { legs: [.35, .35], full: [.3, .3], upper: [.25, .25], cardio: [.15, .2] }[di.work || 'upper'];
  const tips = { legs: ['tipLegsPre', 'tipLegsPost'], full: ['tipLegsPre', 'tipLegsPost'], upper: ['tipUpperPre', 'tipUpperPost'], cardio: ['tipCardioPre', 'tipCardioPost'] }[di.work || 'upper'];
  const preA = T - (cardio ? 120 : 180), postB = T + dur + 119;
  return [
    { k: 'winPre', a: preA, b: T - 1, c: C * split[0], na: .25, kk: .2, tip: t(tips[0]) },   // a bit more sodium around the workout (sweat)
    { k: 'winWorkout', a: T, b: T + dur - 1, c: 0, na: .1, kk: .05, gym: true, tip: cardio ? t('tipCardioDuring') : '' },
    { k: 'winPost', a: T + dur, b: postB, c: C * split[1], na: .25, kk: .3, tip: t(tips[1]) },
    { k: 'other', a: null, b: null, c: C * (1 - split[0] - split[1]), na: .4, kk: .45, tip: t('tipSpread') },
  ];
}

function openLogSearch(){ $('lSearch').value = ''; LW = { rows: {}, open: null, added: [] }; $('lAdded').innerHTML = ''; drawLog(); open('ovLog'); setTimeout(() => $('lSearch').focus(), 120); }

// ---------- targets ----------
// ---------- Fill My Macros (0.7.4.3): its 2–3 suggestions wait greyed at the top of Eaten, looking exactly like Eaten cards, each with Add ----------
// Food Coach's "what should I eat?" gives the same cards in the chat (logQSuggest); adding in either place adds it in both.
function renderPlan(){
  const p = plans[curDay], el = $('planShow');
  // one card per food (Banana, then Chicken…), each with its own Add; added or swiped-away foods leave the list
  el.innerHTML = p ? (p.meals || []).map((m, i) => m.logged ? '' : (m.items || []).map((it, j) => it.logged || !(Number(it.grams) > 0) ? '' : planItemCardHtml(m, i, j, it)).join('')).join('') : '';
}
const planName = m => m.title || (m.items || []).map(it => it.name).join(', ');
const planAmt = m => (m.items || []).map(it => `${it.name} ${r1(it.grams || 0)} g`).join(' · ');
function planRowHtml(m){
  return `<div class="et"><span class="name"><span class="nmt">${esc(planName(m))}</span></span><small class="esub"><b class="p">P ${fmt(m.protein || 0)}</b> · <b class="c">C ${fmt(m.carbs || 0)}</b> · <b class="f">F ${fmt(m.fat || 0)}</b> · <span class="eamt">${esc(planAmt(m))}</span></small></div><span class="ekc">${Math.round(m.kcal || 0)}<small>kcal</small></span>`;
}
// what one suggested food is (looked up without saving anything) and its numbers for the grams shown
function planItemInfo(it, save){
  const meal = meals.find(x => norm(x.name) === norm(it.name));
  if(meal) return { name: meal.name, icon: mealIcon(meal), unit: 'g', per: meal, meal };
  const ref = matchIng([it.name, it.name_en]); let f = null, g = null;
  if(ref && ref.type === 'my') f = foods.find(x => x.id === ref.id);
  else if(ref && ref.type === 'gen'){ g = GENBY[ref.id]; if(g && save) f = saveGeneric(g); }
  if(f) return { name: foodName(f), icon: iconOf(f) || '', unit: f.unit, per: f, food: f };
  return g ? { name: it.name, icon: '', unit: g.unit, per: g, gen: g } : null;
}
function planItemCardHtml(m, i, j, it){
  const info = planItemInfo(it, false), x = info ? macrosFor(info.per, Number(it.grams)) : null;
  const sub = x ? `<b class="p">P ${fmt(x.p)}</b> · <b class="c">C ${fmt(x.c)}</b> · <b class="f">F ${fmt(x.f)}</b> · ` : '';
  return `<div class="card eatrow sugg" data-pi="${i}" data-pj="${j}"><div class="et"><span class="name"><span class="nmt">${esc(it.name)}</span></span><small class="esub">${sub}<span class="eamt">${r1(it.grams || 0)} g</span></small></div>${x ? `<span class="ekc">${x.kcal}<small>kcal</small></span>` : ''}<button class="sgadd" type="button" data-plog="${i}" data-pj="${j}">${t('add')}</button></div>`;
}
function planPrompt(){
  const tg = targetFor(curDay), di = dayInfo(curDay), tot = dayTotals(curDay), isToday = daysUntil(curDay) === 0;
  const fr = liveItems().map(x => `${x.info.name}: ${fmtSize(x.it.qty, x.info.unit)}`).join('; ');
  const fl = foods.slice(0, 70).map(f => `${foodName(f)} (${f.kcal}kcal P${f.protein} C${f.carbs} F${f.fat} per 100${f.unit}${f.state === 'uncooked' ? ', weighed raw' : ''})`).join('; ');
  const ml = meals.map(m => `${m.name} (per 100 g cooked: ${m.kcal}kcal P${m.protein} C${m.carbs} F${m.fat})`).join('; ');
  const eaten = (dayLog[curDay] || []).map(e => `${e.time} ${e.name} ${e.amt}${e.unit}`).join('; ');
  return `You plan a day of eating for someone who lifts weights. Write all text in ${lang === 'el' ? 'Greek' : 'English'}.
Day: ${di.type === 'gym' ? `GYM DAY, ${di.work || 'upper'} workout at ${di.time || '18:00'}` : 'REST DAY'}. Goal: ${targets.goal}.
Targets for the whole day: ${tg.k} kcal, protein ${tg.p} g, carbs ${tg.c} g, fat ${tg.f} g, fibre ${fibTarget(tg)} g.
Electrolytes so far: sodium ${Math.round(tot.na || 0)} mg (guideline ~2300), potassium ${Math.round(tot.k || 0)} mg (aim ~3400): include potassium-rich foods${di.type === 'gym' ? ', and a potassium-rich carb such as a banana 30-60 min before training' : ''}.
${workFor(curDay) ? `They are at WORK ${workFor(curDay).from}-${workFor(curDay).to}: meals in that window must be portable and simple; plan a solid meal before and after work.` : 'No work today: proper meals at home are fine.'}
Already eaten today: ${eaten || 'nothing'} (totals ${Math.round(tot.kcal)} kcal, P ${Math.round(tot.p)}, C ${Math.round(tot.c)}, F ${Math.round(tot.f)}).
${isToday ? `Time now: ${nowHM()}. Only plan meals from now on.` : 'Plan the whole day.'}
${kitchenOn() ? `In the fridge/cupboard (use these FIRST): ${fr || 'nothing logged'}.\n` : ''}Their saved foods: ${fl || 'none'}.
Their home-cooked meals: ${ml || 'none'}.
Carb timing: ${di.type !== 'gym' ? 'spread carbs evenly; protein every 3-4 h.' : di.work === 'legs' || di.work === 'full' ? 'put most carbs in the meals 2-3 h before and within 2 h after the workout.' : di.work === 'cardio' ? 'light carb snack 1-2 h before, normal carbs after; remind to hydrate.' : 'moderate carbs before and after, rest spread out.'}
REMAINING for the rest of today (plan exactly this, NEVER more): ${Math.max(0, Math.round(tg.k - tot.kcal))} kcal, protein ${Math.max(0, Math.round(tg.p - tot.p))} g, carbs ${Math.max(0, Math.round(tg.c - tot.c))} g, fat ${Math.max(0, Math.round(tg.f - tot.f))} g.
Rules: land a little under the REMAINING numbers, never over. Use the exact food and meal names from the lists above. Grams are as weighed (raw for foods marked weighed raw, cooked weight for home-cooked meals). 1–3 meals or snacks: easy food combos or one simple plate each. Keep it realistic and simple.
Return ONLY JSON: {"meals":[{"time":"HH:MM","title":string,"items":[{"name":string,"name_en":string,"grams":number,"from":"fridge"|"foods"|"meal"}],"kcal":number,"protein":number,"carbs":number,"fat":number,"why":string}],"tip":string}${AI.dietRules()}${AI.knows('food')}`;
}
// a new plan: never over what's left, saved for the day, shown on Today
function planKeep(r){
  if(!r || !Array.isArray(r.meals) || !r.meals.length) throw new Error('empty plan');
  const tg = targetFor(curDay), tot = dayTotals(curDay); r.meals = r.meals.slice(0, 3);
  if(tg) planFit(r, { k: tg.k - tot.kcal, p: tg.p - tot.p, c: tg.c - tot.c, f: tg.f - tot.f });   // 0.6.5: never over what's left
  plans[curDay] = r; Store.save('plans', plans); renderPlan(); return r;
}
// Add: the given foods of a suggestion go into Eaten (with Undo); returns the undo, or null when nothing could be added.
// all = the whole suggestion (Food Coach's card): foods that can't be matched are still marked as handled, as before.
function planLogItems(day, m, its, all){
  if(!m || m.logged) return null;
  const added = [], marked = []; let miss = 0;
  its.forEach(it => {
    if(it.logged) return;
    const g = Number(it.grams); if(!(g > 0)) return;
    const info = planItemInfo(it, true);
    if(!info){ miss++; if(all) marked.push(it); return; }
    logEntry(day, info, g, m.time && toMin(m.time) !== null ? m.time : nowHM()); const l = dayLog[day]; added.push(l[l.length - 1]); marked.push(it);
    if(it.from === 'fridge' && kitchenOn()){ const key = info.meal ? { mealId: info.meal.id } : { foodId: info.food.id }; try{ takeFromFridge(key, g); }catch(e){} }
  });
  if(!added.length){ toast(t('planUnmatched', { n: miss })); return null; }
  marked.forEach(it => { it.logged = true; });
  m.logged = (m.items || []).every(it => it.logged || !(Number(it.grams) > 0));
  Store.save('plans', plans); renderAll();
  let undone = false;
  const undo = () => { if(undone) return; undone = true; const ids = new Set(added.map(e => e.id));
    dayLog[day] = (dayLog[day] || []).filter(e => !ids.has(e.id)); saveLog(); marked.forEach(it => { it.logged = false; }); m.logged = false; Store.save('plans', plans); renderAll(); planChatSync(); };
  PUNDO.set(m, undo);
  return { undo, n: added.length, miss };
}
const planLogMeal = (day, m) => planLogItems(day, m, (m && m.items) || [], true);
const PUNDO = new WeakMap(), PLANCH = [];   // a suggestion's Undo; the suggestion cards shown in Food Coach ({ m, card, ch })
function planAddMeal(day, m){
  const r = planLogMeal(day, m); if(!r) return; Phone.haptic(); planChatSync();
  toast(t(r.n === 1 ? 'planLoggedOne' : 'planLogged', { n: r.n }) + (r.miss ? ' · ' + t('planUnmatched', { n: r.miss }) : ''), t('undo'), r.undo);
}
function planAddItem(i, j){
  const p = plans[curDay], m = p && p.meals[i], it = m && (m.items || [])[j]; if(!it) return;
  const r = planLogItems(curDay, m, [it]); if(!r) return; Phone.haptic(); planChatSync();
  toast(t(r.n === 1 ? 'planLoggedOne' : 'planLogged', { n: r.n }) + (r.miss ? ' · ' + t('planUnmatched', { n: r.miss }) : ''), t('undo'), r.undo);
}
// swipe one suggested food away (Undo in the toast)
function planDropItem(i, j){ const p = plans[curDay], m = p && p.meals[i], it = m && (m.items || [])[j]; if(!it) return; it.logged = 'dropped';
  const done = () => (m.items || []).every(x => x.logged || !(Number(x.grams) > 0)); if(done()) m.logged = m.items.every(x => x.logged === 'dropped' || !(Number(x.grams) > 0)) ? 'dropped' : true;
  Store.save('plans', plans); renderPlan(); planChatSync();
  toast(t('planDropped'), t('undo'), () => { it.logged = false; m.logged = false; Store.save('plans', plans); renderPlan(); planChatSync(); }); }
// the chat's suggestion cards follow what happened on Today (and the other way round)
function planChatSync(){
  PLANCH.forEach(x => { const on = !!x.m.logged;
    if(on && !x.card.done) x.ch.update(x.card, { done: x.m.logged === 'dropped' ? t('planDropped') : t('planAddedOne'), dim: false, undo: x.m.logged === 'dropped' ? null : PUNDO.get(x.m) || null });
    else if(!on && x.card.done) x.ch.update(x.card, { done: '', dim: true, undo: null }); });
}

function gapDays(){ const d = lastSessionDate(); return d ? -daysUntil(d) : null; }

   // 1 g salt ≈ 400 mg sodium
function macrosFor(per, amt){ const x = amt / 100; return { kcal: Math.round((per.kcal || 0) * x), p: r1((per.protein || 0) * x), c: r1((per.carbs || 0) * x), f: r1((per.fat || 0) * x),
  fib: r1((per.fiber || 0) * x), na: Math.round(naOf(per) * x), k: Math.round((per.potassium || 0) * x) }; }

function logEntry(date, info, amt, time){
  const m = macrosFor(info.per, amt);
  (dayLog[date] = dayLog[date] || []).push({ id: uid(), time: time || nowHM(), kind: info.meal ? 'meal' : 'food', refId: info.meal ? info.meal.id : info.food.id,
    name: info.name, icon: info.icon, amt: r1(amt), unit: info.unit, kcal: m.kcal, p: m.p, c: m.c, f: m.f, fib: m.fib, na: m.na, k: m.k });
  saveLog();
}

function dayTotals(d){ return (dayLog[d] || []).reduce((s, e) => ({ kcal: s.kcal + e.kcal, p: s.p + e.p, c: s.c + e.c, f: s.f + e.f, fib: s.fib + (e.fib || 0), na: s.na + (e.na || 0), k: s.k + (e.k || 0) }), { kcal: 0, p: 0, c: 0, f: 0, fib: 0, na: 0, k: 0 }); }

function mealTotals(rows){
  const tot = { kcal:0, protein:0, carbs:0, fat:0, fib:0, na:0, k:0, raw:0 };
  rows.forEach(r => { if(!r.ref || !(r.grams > 0)) return; const m = r.grams / 100, p = r.ref.per;
    tot.kcal += (p.kcal || 0) * m; tot.protein += (p.protein || 0) * m; tot.carbs += (p.carbs || 0) * m; tot.fat += (p.fat || 0) * m;
    tot.fib += (p.fiber || 0) * m; tot.na += naOf(p) * m; tot.k += (p.potassium || 0) * m; tot.raw += r.grams; });
  return tot;
}

function elecHtml(tot){
  const row = (lbl, v, tgt, col) => { const pct = Math.round(v / tgt * 100), hi = lbl === t('sodium') && pct > 100, hit = lbl === t('potassium') && pct >= 100;
    return `<div class="mrow" style="--bar:${hi ? 'var(--orange)' : hit ? 'var(--ok)' : col}"><small>${lbl}</small><span class="mbar"><i style="width:${Math.min(100, pct)}%;background:var(--bar)"></i></span><span><b>${ui.elecMg ? Math.round(v).toLocaleString() + ' mg' : pct + '%'}</b>${hi ? `<small> ${t('elecHigh')}</small>` : ''}</span></div>`; };
  return `<div class="elec" data-elec><div class="row"><small class="rmeta">${t('electrolytes')} <button class="ibtn" type="button" data-tip="tipElec" aria-label="${t('logAInfo')}">${svgIcon('info', 18, 2)}</button></small></div>${row(t('sodium'), tot.na, NA_T, 'var(--na)')}${row(t('potassium'), tot.k, K_T, 'var(--kk)')}</div>`;
}

function remainingToday(){ const tg = targetFor(todayKey()); if(!tg) return null; const tot = dayTotals(todayKey());
  return { k: Math.max(0, Math.round(tg.k - tot.kcal)), p: Math.max(0, Math.round(tg.p - tot.p)), c: Math.max(0, Math.round(tg.c - tot.c)), f: Math.max(0, Math.round(tg.f - tot.f)) }; }

function lastEntryOf(refId){ const ds = Object.keys(dayLog).sort().reverse(); for(const d of ds){ const l = dayLog[d] || []; for(let i = l.length - 1; i >= 0; i--) if(l[i].refId === refId) return l[i]; } return null; }

function usuals(){
  const now = Date.now(), m = {};
  Object.keys(dayLog).sort().slice(-60).forEach(d => { const age = (now - new Date(d + 'T12:00:00')) / 864e5; (dayLog[d] || []).forEach(e => { if(!e.refId || e.kind === 'quick') return;
    const k = e.kind + e.refId; const x = m[k] || (m[k] = { e, n: 0, sc: 0 }); x.n++; x.sc += 1 + Math.max(0, 14 - age) / 7; x.e = e; }); });
  const nowM = new Date().getHours() * 60 + new Date().getMinutes(), near = tm => { const d = Math.abs(toMin(tm) - nowM); return Math.min(d, 1440 - d) <= 75; };
  Object.keys(dayLog).sort().slice(-60).forEach(d => (dayLog[d] || []).forEach(e => { const x = m[e.kind + e.refId]; if(x && e.time && near(e.time)) x.hr = (x.hr || 0) + 1; }));
  const all = Object.values(m).filter(x => infoOfEntry(x.e)), hour = all.filter(x => (x.hr || 0) >= 2).sort((a, b) => b.hr - a.hr || b.sc - a.sc).slice(0, 5);
  const rest = all.filter(x => !hour.includes(x)).sort((a, b) => b.sc - a.sc).slice(0, 12 - hour.length);
  LS.hourN = hour.length; return [...hour, ...rest].map(x => x.e);   // 0.6.2: what you usually eat around this time comes first
}

// ---------- Log Food window (canvas Phones.dc.html screen 4 + logging mockup v1 + Petros's six v2 changes) ----------
// One window: search on top, rows with ＋ (log the usual amount in one tap, Undo in the toast) and an inline panel on tap
// (amount + one unit from a custom list, the cooking slider where it matters, live kcal/P/C/F, Add). The window stays open;
// what you added shows as green chips at the top. Editing a row only updates that row, never the whole list.
let LW = { rows: {}, open: null, added: [] };
// Household measures belong to a specific food and preparation.
function foodMeasures(info){
  const f = info.food || info.gen || info.online;
  if(!f) return [];
  const catalogue = f.gid && GENBY[f.gid];
  const measures = f.unit === 'g' && catalogue?.measures || {};
  const keys = { cup: 'foodCup', tbsp: 'foodTbsp', tsp: 'foodTsp' };
  const units = Object.entries(measures).map(([k, size]) => ({ k, size, l: t(keys[k] || k) }));
  if(f.piece > 0 && f.pieces && f.pieces !== 'none'){
    const typicalBar = f.sub === 'bar' && f.gid && !catalogue?.labelUrl && f.pieces === 'piece';
    units.unshift({ k: 'pc', size: f.piece, l: typicalBar ? '≈ ' + W('bar') : W(f.pieces) });
  } else if(info.piece > 0 && info.pw && info.pw !== 'none' && f.source !== 'openfoodfacts'){
    units.unshift({ k: 'pc', size: info.piece, l: W(info.pw) });
  }
  if(f.serving > 0 && !units.some(x => x.size === f.serving && x.k === 'pc')){
    units.push({ k: 'serving', size: f.serving, l: t('foodServing') });
  }
  return units;
}
function defaultLabelUnit(info, units){
  const f = info.food || info.gen || info.online;
  if(!f) return null;
  if(f.pieces === 'bar' && f.piece > 0) return units.find(x => x.k === 'pc');
  if(f.source === 'openfoodfacts' && f.serving > 0) return units.find(x => x.k === 'serving');
  return null;
}
// the cooking slider (v1 + v2 #1/#3): three ways of cooking with their own values per 100 g; Title Case labels, no text above
const LW_COOK = [
  ['scrambled_egg', 1, [['With Butter / Oil', 'Με βούτυρο / λάδι', 212, 13.8, 2, 16.5], ['Little Oil', 'Λίγο λάδι', 170, 13, 1.5, 12], ['No Fat', 'Χωρίς λιπαρά', 140, 12.6, 1.1, 9.5]]],
  ['fries', 2, [['Deep Fried', 'Τηγανητές', 312, 3.4, 41, 15], ['Pan / Oven', 'Τηγάνι / φούρνος', 200, 3.2, 33, 6.5], ['Air Fried', 'Air fryer', 150, 3, 30, 2.5]]],
  ['chicken_grilled', 2, [['Fried', 'Τηγανητό', 222, 30, 2, 10], ['Pan, Little Oil', 'Τηγάνι, λίγο λάδι', 187, 31, 0, 6.5], ['Grilled / No Oil', 'Ψητό / χωρίς λάδι', 165, 31, 0, 3.6]]] ];
const lwL = a => lang === 'el' ? a[1] : a[0];
function lwInfo(k, i){
  const mInfo = m => ({ name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null });
  if(k === 'rc') return infoOfEntry(LS.recent[i]);
  if(k === 'ml') return mInfo(LS.meals[i]);
  if(k === 'm') return fInfo_(LS.mine[i]);
  if(k === 's'){ const g = LS.std[i]; return { ...fInfo_({ ...g, unit: g.unit }), name: L(g), icon: subOf(g.cat, g.sub).icon, food: null, gen: g }; }
  if(k === 'o'){ const d = LOGON.res[i]; return { ...fInfo_(d), name: d.name, food: null, online: d }; }
  return null;
}
function lwRef(info){ return info.meal ? 'm:' + info.meal.id : info.food ? 'f:' + info.food.id : info.gen ? 'g:' + info.gen.gid : info.online ? 'o:' + (info.online.barcode || info.name) : 'n:' + info.name; }
function mealPortion(m){
  if(!m || !(m.cookedWeight > 0)) return null;
  const servings = +m.recipe?.servings;
  const estimated = m.cookedEstimated ? '≈ ' : '';
  if(servings > 1) return {k: 'serving', size: m.cookedWeight / servings, l: estimated + t('foodServing')};
  if(m.quick || servings === 1) return {k: 'plate', size: m.cookedWeight, l: estimated + t('logUPlate')};
  return null;
}
function lwUnits(info){
  const f = info.food || info.gen || info.online, u = foodMeasures(info);
  if(f && f.usualPack && f.usualPack <= 1000 && f.usualPack !== info.piece) u.push({ k: 'pack', l: t('logUPack'), size: f.usualPack });
  const dish = mealPortion(info.meal); if(dish) u.push(dish);
  u.push(info.unit !== 'ml' && UN().f === 'oz' ? { k: 'g', l: t('logUOz'), size: OZ } : { k: 'g', l: info.unit === 'ml' ? t('logUMl') : t('logUG'), size: 1 });
  return u;
}
function lwState(k, i){
  const key = k + i; if(LW.rows[key]) return LW.rows[key];
  const info = lwInfo(k, i); if(!info) return null;
  const ref = lwRef(info), units = lwUnits(info), cook = LW_COOK.find(([gid]) => gid === (info.food || info.gen)?.gid);
  const pick = (ui.logUnit || {})[ref], last = info.meal || info.food ? lastEntryOf((info.meal || info.food).id) : (k === 'rc' ? LS.recent[i] : null);
  // v2 #5: grams by default, always grams once you've logged this food in grams; otherwise it opens on your last pick ("2 Medium Eggs")
  let u = units.length - 1, n = r1((last ? last.amt : 100) / units[units.length - 1].size);
  if(pick && pick !== 'g'){ const j = units.findIndex(x => x.k === pick); if(j > -1){ u = j; n = last ? Math.max(.5, Math.round(last.amt / units[j].size * 2) / 2) : 1; } }
  const preferred = defaultLabelUnit(info, units);
  if(!last && !pick && preferred){ u = units.indexOf(preferred); n = 1; }
  if(!last && units.length > 1 && !pick && units[0].k !== 'g' && info.meal) { u = 0; n = 1; }
  const ck = cook ? ((ui.logCook || {})[ref] ?? null) : null;
  return (LW.rows[key] = { k, i, info, ref, units, u, n, cook: cook ? cook[2] : null, ck });
}
function lwPer(st){ if(!st.cook || !st.cook[st.ck]) return st.info.per; const c = st.cook[st.ck]; return { ...st.info.per, kcal: c[2], protein: c[3], carbs: c[4], fat: c[5] }; }
function lwCalc(st){ const g = (+st.n || 0) * st.units[st.u].size; return { g, ...macrosFor(lwPer(st), g) }; }
function lwSub(st){ const r = lwCalc(st), un = st.units[st.u], n = +st.n || 0;
  const amt = un.k === 'g' ? fmtSize(r.g, st.info.unit) : `${fmt(n)} ${n === 1 || lang === 'el' || /sp$/.test(un.l) ? un.l : un.l + 's'} · ${fmtSize(r.g, st.info.unit)}`;
  return `${amt} · ${r.kcal} kcal`; }
function lwRow(k, i){ const st = lwState(k, i); if(!st) return ''; const open = LW.open === k + i;
  return `<div class="lrow ${open ? 'open' : ''}" data-k="${k}" data-i="${i}"><div class="lrh"><button class="lrn" type="button" data-lopen><span class="nm">${catIcon(st.info.food ? st.info.food.cat : st.info.gen ? st.info.gen.cat : null)}${esc(st.info.name)}</span><small class="ls">${esc(lwSub(st))}</small></button>
    <button class="lplus" type="button" data-lplus aria-label="${t('lwUsual')}">+</button></div>${open ? lwPanel(st) : ''}</div>`; }
function lwPanel(st){
  const r = lwCalc(st);
  return `<div class="lpn"><div class="lamt"><input class="lan" type="number" inputmode="decimal" step="any" min="0" value="${fmt(+st.n || 0)}" aria-label="${t('lwAmount')}">
    <div class="ldd"><button class="ldb" type="button" data-ldd aria-haspopup="listbox"><span class="ldl">${esc(lwUnitLbl(st, st.u))}</span>${svgIcon('down', 16, 2.4)}</button><div class="ldm hide" role="listbox">${lwMenu(st)}</div></div></div>
    ${st.cook ? `<div class="seg lck">${st.cook.map((c, j) => `<button type="button" data-v="${j}" data-lck="${j}" class="${j === st.ck ? 'on' : ''}">${esc(lwL(c))}</button>`).join('')}</div>` : ''}
    <div class="lres"><span class="lk">${r.kcal} kcal</span><span class="lm"><b class="p">P ${fmt(r.p)}</b> · <b class="c">C ${fmt(r.c)}</b> · <b class="f">F ${fmt(r.f)}</b></span></div>
    <button class="lgo" type="button" data-ladd>${t('add')}</button></div>`; }
function lwUnitLbl(st, j){ const u = st.units[j]; return u.k === 'g' ? u.l : `${u.l} (${fmtSize(u.size, st.info.unit)})`; }
// v2 #6: a custom list — the portion and its weight on the left, its calories on the right (they follow the cooking slider)
function lwMenu(st){ const per = lwPer(st);
  return st.units.map((u, j) => `<button type="button" class="ldo ${j === st.u ? 'on' : ''}" data-lu="${j}" role="option" aria-selected="${j === st.u}"><span>${esc(lwUnitLbl(st, j))}</span><span>${macrosFor(per, u.k === 'g' && u.size === 1 ? 100 : u.size).kcal} kcal${u.k === 'g' ? (u.size === 1 ? ' / 100 ' + (st.info.unit || 'g') : ' / oz') : ''}</span></button>`).join(''); }
// v2 #2: only the numbers, the line under the name, the slider and the list change
function lwUpdate(row, st){ const r = lwCalc(st);
  row.querySelector('.ls').textContent = lwSub(st);
  const k = row.querySelector('.lk'); if(k) k.textContent = r.kcal + ' kcal';
  const m = row.querySelector('.lm'); if(m) m.innerHTML = `<b class="p">P ${fmt(r.p)}</b> · <b class="c">C ${fmt(r.c)}</b> · <b class="f">F ${fmt(r.f)}</b>`;
  const l = row.querySelector('.ldl'); if(l) l.textContent = lwUnitLbl(st, st.u);
  const mn = row.querySelector('.ldm'); if(mn) mn.innerHTML = lwMenu(st);
  row.querySelectorAll('[data-lck]').forEach(b => b.classList.toggle('on', +b.dataset.lck === st.ck)); }
function lwAdd(st){
  const r = lwCalc(st); if(!(r.g > 0)){ toast(t('needAmount')); return; }
  let info = st.info;
  if(info.gen) info = fInfo_(saveGeneric(info.gen)); else if(info.online) info = fInfo_(saveOnlineFood(info.online));
  info = { ...info, per: lwPer(st) };
  const ref = lwRef(info), un = st.units[st.u].k;
  if(un === 'g') ui.logGrams = { ...(ui.logGrams || {}), [ref]: true };   // once in grams, always grams
  ui.logUnit = { ...(ui.logUnit || {}), [ref]: (ui.logGrams || {})[ref] ? 'g' : un };
  if(st.cook) ui.logCook = { ...(ui.logCook || {}), [ref]: st.ck }; saveUI();
  logEntry(curDay, info, r.g, daysUntil(curDay) === 0 ? nowHM() : '13:00');
  const list = dayLog[curDay], added = list[list.length - 1];
  const key = info.meal ? { mealId: info.meal.id } : info.food ? { foodId: info.food.id } : null, stock = key ? (key.foodId ? stockOf(key.foodId) : mealStock(key.mealId)) : 0;
  let extra = ''; if(key && stock > 0){ const x = takeFromFridge(key, r.g); if(x && x.added) extra = ' ' + t('toList'); }
  LW.added.push(added); LW.open = null; lwChips(); renderAll(); drawLog();
  toast(t('logged', { n: info.name }) + ` · ${added.kcal} kcal` + extra, t('undo'), () => { dayLog[curDay] = (dayLog[curDay] || []).filter(x => x !== added); LW.added = LW.added.filter(x => x !== added); saveLog(); lwChips(); renderAll(); });
}
function lwChips(){ $('lAdded').innerHTML = LW.added.map(e => `<span class="lchip">${esc(bareName(e.name))} · ${e.kcal}<button class="lchipx" type="button" data-chiprm="${e.id}" aria-label="${t('logChipRm')}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></span>`).join('') +
  (LW.added.length >= 2 ? (LW.naming ? `<span class="lcombo"><input id="lComboName" placeholder="${t('comboPh')}" autocomplete="off"><button type="button" class="lwdone" id="lComboSave">${t('save')}</button></span>` : `<button type="button" class="lsave" id="lComboBtn">${svgIcon('plus', 14, 2.4)}${t('comboSave')}</button>`) : ''); }

// ---------- combos (0.6.9.3): the same few foods you often eat together, logged in one tap ("My breakfast") ----------
let combos = Store.load('combos', []);
const saveCombos = () => Store.save('combos', combos);
function comboKcal(c){ return Math.round(c.items.reduce((a, e) => a + (+e.kcal || 0), 0)); }
function comboFromEntries(name, list){
  const c = { id: uid(), name: name.trim(), items: list.map(e => Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'id' && k !== 'time'))), at: new Date().toISOString() };
  combos.unshift(c); saveCombos(); return c; }
function logCombo(c){ const day = curDay, tm = daysUntil(day) === 0 ? nowHM() : '13:00', added = c.items.map(e => ({ ...e, id: uid(), time: tm }));
  dayLog[day] = (dayLog[day] || []).concat(added); saveLog(); LW.added.push(...added); lwChips(); renderAll(); drawLog();
  toast(t('comboLogged', { n: c.name, k: comboKcal(c) }), t('undo'), () => { const ids = new Set(added.map(z => z.id)); dayLog[day] = (dayLog[day] || []).filter(z => !ids.has(z.id)); LW.added = LW.added.filter(z => !ids.has(z.id)); saveLog(); lwChips(); renderAll(); }); }
const comboRow = (c, i) => `<div class="lrow combo" data-combo="${i}"><div class="lrh"><button class="lrn" type="button" data-copen><span class="nm">${esc(c.name)}</span><small class="ls">${t('comboSub', { n: c.items.length, k: comboKcal(c) })}</small></button><button class="lplus" type="button" data-cplus aria-label="${t('lwUsual')}">+</button></div>
  ${LW.copen === i ? `<div class="lpn"><div class="cmlist">${c.items.map(e => `<div><span>${esc(bareName(e.name))}</span><small>${fmtSize(e.amt, e.unit)} · ${Math.round(e.kcal)} kcal</small></div>`).join('')}</div><button type="button" class="linkbtn danger" data-cdel>${t('comboDel')}</button></div>` : ''}</div>`;
function drawLog(){
  const q = $('lSearch').value.trim();
  if(LW.q !== q){ LW.rows = {}; LW.open = null; LW.q = q; }
  let h = '';
  if(!q){
    LS.recent = usuals(); const ids = LS.recent.map((e, i) => i);
    if(combos.length) h += `<div class="lgrp">${t('comboT')}</div>` + combos.map(comboRow).join('');
    if(LS.recent.length && LS.hourN) h += `<div class="lgrp">${t('lwHour')}</div>` + ids.slice(0, LS.hourN).map(i => lwRow('rc', i)).join('') + (LS.recent.length > LS.hourN ? `<div class="lgrp">${t('usuals')}</div>` + ids.slice(LS.hourN).map(i => lwRow('rc', i)).join('') : '');
    else if(LS.recent.length) h += `<div class="lgrp">${t('usuals')}</div>` + ids.map(i => lwRow('rc', i)).join('');
    else if(!combos.length) h = `<div class="hint">${t('typeToSearch')}</div>`;
  } else {
    const s = searchLocal(q, false, { log: true, meals: true }); LS.meals = s.meals; LS.mine = s.mine; LS.std = s.std;
    const local = LS.meals.length + LS.mine.length + LS.std.length, onl = LOGON.q === q && LOGON.res.length;
    if(local) h += `<div class="lgrp">${t('lwResults')}</div>` + LS.meals.map((m, i) => lwRow('ml', i)).join('') + LS.mine.map((f, i) => lwRow('m', i)).join('') + LS.std.map((g, i) => lwRow('s', i)).join('');
    if(onl) h += `<div class="lgrp">${t('grpOnline2')}</div>` + LOGON.res.map((d, i) => lwRow('o', i)).join('');
    else if(LOGON.busy) h += `<div class="hint">${t('onlineSearching')}</div>`;
    else if(q.length >= 2 && LOGON.q !== q) h += `<button class="lmore" id="lOnline" type="button">${t('onlineMore')}</button>`;
    // never a dead end: a spelling fix when little matched, and Quick Log for anything
    const dym = local + (onl ? LOGON.res.length : 0) < 3 ? Search.didYouMean(q) : null;
    if(!local && !LOGON.busy && !onl) h = `<div class="hint">${t('nothingMatches', { q: esc(q) })}</div>` + h;
    if(dym) h = `<button class="dym" data-dym="${esc(dym)}">${t('didYouMean')} <b>${esc(dym)}</b>?</button>` + h;
    h += `<button class="lmore" id="lTakeaway" type="button" data-ai><span class="aifln">${AI.face('chef')}<span>${t('logQOpen', { q: esc(q) })}</span></span><small>${t('logQOpenSub')}</small></button>`;
  }
  $('lResults').innerHTML = h;
}

async function runLogOnline(q){
  LOGON = { q, res: [], busy: true, timer: null }; drawLog();
  try{ const res = await searchOnlineAll(q); if($('lSearch').value.trim() !== q) return; LOGON = { q, res, busy: false }; }
  catch(e){ LOGON = { q, res: [], busy: false }; toast(t('onlineFail')); }
  drawLog();
}

// amount sheet: remember last amount, fridge comes off by itself, fridge "use" is take-out only
function openAmt(o){
  AM = o;
  const info = o.mode === 'use' ? itemInfo(o.item) : o.mode === 'editlog' ? (infoOfEntry(o.entry) || { name: o.entry.name, icon: o.entry.icon, unit: o.entry.unit, per: { kcal: o.entry.kcal / o.entry.amt * 100, protein: o.entry.p / o.entry.amt * 100, carbs: o.entry.c / o.entry.amt * 100, fat: o.entry.f / o.entry.amt * 100 } }) : o.info;
  if(!info) return; AM.info = info;
  $('amTitle').textContent = o.mode === 'use' ? t('useT', { n: info.name }) : bareName(info.name);
  $('amSub').textContent = o.mode === 'use' ? t('useSub') + ' · ' + t('left', { a: fmtAmt(o.item.qty, info) }) : (o.mode === 'editlog' ? t('edit') : t('logFood'));
  const chips = [];
  if(info.piece && info.pw) [1, 2, 3].forEach(n => chips.push([n * info.piece, `${n} ${n === 1 ? W(info.pw) : WS(info.pw)}`]));
  if(info.food && info.food.usualPack && info.food.usualPack <= 1000) chips.push([info.food.usualPack, `1 ${t('perPackLabel').replace(/^(per|ανά)\s*/, '')} · ${fmtSize(info.food.usualPack, info.unit)}`]);
  const dish = mealPortion(info.meal);
  if(dish?.k === 'serving') chips.push([dish.size, `1 ${dish.l} · ${fmtSize(dish.size, 'g')}`]);
  if(!info.meal && !(info.piece && info.pw)) (info.unit === 'ml' ? [100, 200, 250, 500] : [50, 100, 150, 200]).forEach(g => chips.push([g, fmtSize(g, info.unit)]));
  if(o.mode === 'use') chips.push([o.item.qty, `${t('logAll')} · ${fmtSize(o.item.qty, info.unit)}`]);
  $('amQuick').innerHTML = chips.map(([v, l]) => `<button data-v="${r1(v)}">${esc(l)}</button>`).join('');
  $('amAmt').value = o.mode === 'editlog' ? o.entry.amt : '';
  $('amTime').value = o.mode === 'editlog' ? o.entry.time : (o.time || nowHM()); syncClocks();
  $('amLogWrap').classList.toggle('hide', o.mode !== 'use'); $('amLog').checked = true;
  const key = info.meal ? { mealId: info.meal.id } : info.food ? { foodId: info.food.id } : null;
  const stock = key ? (key.foodId ? stockOf(key.foodId) : mealStock(key.mealId)) : 0;
  $('amFridgeWrap').classList.toggle('hide', !(o.mode === 'log' && stock > 0)); $('amFridge').checked = true;
  $('amFridgeTxt').textContent = t('takeFromFridge', { s: fmtAmt(stock, info) });
  $('amTimeRow').classList.toggle('hide', o.mode === 'use' && !$('amLog').checked);
  $('amFinish').classList.toggle('hide', o.mode === 'log'); $('amFinish').textContent = o.mode === 'use' ? t('finishedIt') : t('delete');
  $('amFinish').classList.toggle('danger', o.mode === 'editlog');
  amUnits(o); amRes(); open('ovAmt'); setTimeout(() => $('amN').focus(), 120);
  
  if(o.mode === 'log'){
    const ref = info.meal ? info.meal.id : info.food ? info.food.id : null, last = ref && lastEntryOf(ref);
    if(!$('amAmt').value){
      const preferred = defaultLabelUnit(info, AM.units);
      if(last || preferred){
        $('amAmt').value = last ? last.amt : preferred.size;
        amUnits(o);
        if(!last && preferred){ AM.u = AM.units.findIndex(x => x.k === preferred.k); $('amU').selectedIndex = AM.u; syncSel($('amU')); amDD(); }
        amRes();
      }
    }   // your usual amount, in the unit it fits
    const stock = info.meal ? mealStock(info.meal.id) : info.food ? stockOf(info.food.id) : 0;
    $('amFridgeTxt').textContent = t('fromFridge', { s: fmtAmt(stock, info) }); $('amFridge').checked = true;
    $('amTitle').innerHTML = `${esc(bareName(info.name))} ${stTag((info.food || {}).state)}`;
  }
  if(o.mode === 'use'){ $('amLog').checked = false; $('amLogWrap').classList.add('hide'); $('amTimeRow').classList.add('hide');
    $('amTitle').textContent = t('takeOutT', { n: info.name }); $('amSub').textContent = t('takeOutSub') + ' · ' + t('left', { a: fmtAmt(o.item.qty, info) }); }
  // one-plate recipes: log the whole plate in one tap
  const m = info.meal;
  if(m && (m.quick || (m.recipe && m.recipe.servings === 1)) && m.cookedWeight){ const cw = Math.round(m.cookedWeight);
    $('amQuick').insertAdjacentHTML('afterbegin', `<button data-v="${cw}">1 ${t('plate')} · ${cw} g</button>`);
    if(o.mode === 'log' && !lastEntryOf(m.id)){ $('amAmt').value = cw; amUnits(o); amRes(); } }
}

// amount picker: a number + a unit (g/ml, slices or pieces, packs, plates); the grams behind it are what gets saved
function amUnits(o){
  const info = AM.info, f = info.food, u = [{ k: 'g', size: 1, l: info.unit }];
  u.push(...foodMeasures(info));
  if(f && f.usualPack && f.usualPack !== info.piece) u.push({ k: 'pack', size: f.usualPack, l: t('logUPack') });
  const dish = mealPortion(info.meal); if(dish) u.push(dish);
  if(o.mode === 'use' && o.item && o.item.packSize && !u.some(x => x.k === 'pack')) u.push({ k: 'pack', size: o.item.packSize, l: t('uPacks') });
  AM.units = u; const g = num('amAmt');
  // start in the unit the amount fits best: whole slices / packs / plates, else grams
  let i = 0; if(g > 0) u.forEach((x, j) => { if(j && i === 0){ const n = g / x.size; if(n >= .5 && Math.abs(n - Math.round(n * 2) / 2) < .03) i = j; } });
  else if(u.length > 1 && u[1].k === 'pc') i = 1;
  AM.u = i; $('amU').innerHTML = u.map(x => `<option value="${x.k}">${esc(x.l)}</option>`).join(''); $('amU').selectedIndex = i; syncSel($('amU')); amDD();
}
// 0.6.9.3: the same custom unit list as Log Food — portion + weight on the left, its calories on the right
function amDD(){ if(!AM || !AM.units) return; const per = AM.info.per, lbl = x => x.k === 'g' ? x.l : `${x.l} (${fmtSize(x.size, AM.info.unit)})`;
  $('amDDL').textContent = lbl(AM.units[AM.u] || AM.units[0]);
  $('amDDM').innerHTML = AM.units.map((x, j) => `<button type="button" class="ldo ${j === AM.u ? 'on' : ''}" data-amu="${j}" role="option"><span>${esc(lbl(x))}</span><span>${macrosFor(per, x.k === 'g' ? 100 : x.size).kcal} kcal${x.k === 'g' ? ' / 100 ' + (AM.info.unit || 'g') : ''}</span></button>`).join(''); }
function amFromN(){ const u = AM.units[AM.u] || { size: 1 }, n = num('amN'); $('amAmt').value = n > 0 ? r1(n * u.size) : ''; AM.typing = true; amRes(); AM.typing = false; }

// 0.5.9 Quick add: one box. Built-in foods / dishes with a normal portion first, then the AI for mixed dishes.
let QAbusy = null;
function openQuick(entry){
  QA = entry || null; $('qaName').value = entry && entry.name !== t('qaDef') ? entry.name : ''; $('qaOut').textContent = '';
  setSeg('#qaSize', String(entry && entry.size || 1)); $('qaDel').classList.toggle('hide', !entry);
  open('ovQuick'); setTimeout(() => $('qaName').focus(), 120);
}
function qaPortion(g){   // grams in a normal plate / serving of a built-in food
  if(g.pieces === 'slice' && g.piece) return { amt: g.piece * 3, n: 3, w: 'slice' };
  if(g.pieces && g.pieces !== 'none' && g.piece) return { amt: g.piece, n: 1, w: g.pieces };
  if(g.unit === 'ml') return { amt: 250 };
  const by = { meat: 150, fish: 150, eggs: 100, rice: 200, pasta: 250, veg: 150, legumes: 250, fruit: 150, dairy: 200, bread: 60, nuts: 30, oils: 15, snacks: 40, supps: 30 };
  if(g.cat === 'ready') return { amt: g.gid === 'tzatziki' ? 60 : g.gid === 'horiatiki' ? 300 : 350 };
  if(g.cat === 'dairy' && g.sub === 'cheese') return { amt: 50 };
  return { amt: by[g.cat] || 150 };
}
const QA_ALIAS = { pasta: ['spaghetti', 'μακαροναδ'], spaghetti: ['pasta', 'μακαροναδ'], makaronada: ['μακαροναδ', 'spaghetti'], bolognese: ['κιμα'], gyro: ['gyros', 'γυρο'], gyros: ['γυρο'], souvlaki: ['σουβλακ'], pita: ['πιτα'], pitta: ['pita', 'πιτα'], burger: ['χαμπουργκερ'], toast: ['τοστ'] };
function qaLocal(q){
  const s = searchLocal(q, false, { log: true }), toks = norm(q).split(' ').filter(w => w.length >= 3);
  const hay = f => norm([foodName(f), f.name, f.brand, f.gid && GENBY[f.gid] ? GENBY[f.gid].en + ' ' + GENBY[f.gid].el + ' ' + (GENBY[f.gid].hay || '') : ''].join(' '));
  const ghay = g => norm([g.en, g.el, g.hay || ''].join(' '));
  const al = tk => [tk, tk.slice(0, -1), ...(QA_ALIAS[tk] || [])];
  const covers = h => toks.length && toks.every(tk => al(tk).some(a => a.length >= 3 && h.includes(a)));
  const m = meals.find(x => covers(norm(x.name)));
  if(m) return { kind: 'meal', m };
  // a whole dish beats an ingredient ("souvlaki pita" = the wrap, not the bread)
  const rd = GEN.filter(g => g.cat === 'ready'), dish = rd.find(g => covers(norm(g.en + ' ' + g.el))) || rd.find(g => covers(ghay(g))); if(dish && toks.length > 1) return { kind: 'gen', g: dish };
  const f = s.mine.find(x => covers(hay(x))); if(f) return { kind: 'food', f };
  const g = s.std.find(x => covers(ghay(x))) || dish; if(g) return { kind: 'gen', g };
  return null;
}
async function saveQuick(){
  const q = $('qaName').value.trim(), size = +(document.querySelector('#qaSize .on') || {}).dataset?.v || 1;
  if(!q){ toast(t('qaNeedTxt')); $('qaName').focus(); return; }
  if(QAbusy) return;
  const time = QA ? QA.time : daysUntil(curDay) === 0 ? nowHM() : '13:00';
  const dropOld = () => { if(QA){ const l = dayLog[curDay] || [], i = l.indexOf(QA); if(i > -1) l.splice(i, 1); } };
  const done = (entry, label) => { const l = dayLog[curDay] = dayLog[curDay] || []; l.push(entry); saveLog(); close('ovQuick'); renderAll();
    toast(t('qaLogged', { n: label, k: entry.kcal }), t('undo'), () => { dayLog[curDay] = (dayLog[curDay] || []).filter(x => x !== entry); saveLog(); renderAll(); }); };
  const loc = qaLocal(q);
  if(loc){
    let info, por;
    if(loc.kind === 'meal'){ info = { name: loc.m.name, icon: mealIcon(loc.m), unit: 'g', per: loc.m, meal: loc.m }; por = { amt: loc.m.cookedWeight && loc.m.cookedWeight <= 900 && !(loc.m.ingredients || []).length ? loc.m.cookedWeight : 350 }; }
    else if(loc.kind === 'gen' && loc.g.cat === 'ready'){ const pg = qaPortion(loc.g).amt, x = pg / 100, g = loc.g;
      const m = dishMeal({ name: L(g), grams: pg, kcal: g.kcal * x, p: g.protein * x, c: g.carbs * x, f: g.fat * x, fib: (g.fiber || 0) * x, na: naOf(g) * x, k: (g.potassium || 0) * x });
      info = { name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m }; por = { amt: pg }; }
    else { const f = loc.kind === 'gen' ? saveGeneric(loc.g) : loc.f; info = { name: foodName(f), icon: iconOf(f) || '', unit: f.unit, per: f, food: f }; por = qaPortion(loc.kind === 'gen' ? loc.g : { ...f, gid: f.gid, cat: f.cat, sub: f.sub }); }
    const amt = Math.round(por.amt * size); dropOld();
    const m = macrosFor(info.per, amt);
    done({ id: uid(), time, kind: info.meal ? 'meal' : 'food', refId: info.meal ? info.meal.id : info.food.id, name: info.name, icon: info.icon, amt, unit: info.unit, ...m }, `${info.name} · ${fmtSize(amt, info.unit)}`);
    return;
  }
  if(!AI.hasKey()){ $('qaOut').textContent = t('qaNoKey'); return; }
  const btn = $('qaSave'); QAbusy = new AbortController(); btn.textContent = t('qaThinking'); $('qaOut').textContent = '';
  try{
    const r = await gemini(`Estimate the nutrition of ONE ${size < 1 ? 'small' : size > 1 ? 'large' : 'normal, typical restaurant/home'} portion of this food or dish, as eaten in Greece: "${q}".
Return ONLY JSON: {"name":string (short name in ${lang === 'el' ? 'Greek' : 'English'}),"grams":number,"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sodium_mg":number,"potassium_mg":number}`, null, null, QAbusy.signal);
    if(!r || !(+r.kcal > 0)) throw new Error('no estimate');
    dropOld();
    const gr = Math.max(50, Math.round(+r.grams || 350)), base = { kcal: +r.kcal, p: +r.protein || 0, c: +r.carbs || 0, f: +r.fat || 0, fib: +r.fiber || 0, na: +r.sodium_mg || 0, k: +r.potassium_mg || 0 };
    const nm = q.charAt(0).toUpperCase() + q.slice(1), ml = dishMeal({ name: nm, grams: gr / size, ...Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v / size])) });   // saved as one normal plate
    const m = macrosFor(ml, gr);
    done({ id: uid(), time, kind: 'meal', refId: ml.id, name: ml.name, icon: mealIcon(ml), amt: gr, unit: 'g', ...m, ai: true }, nm);
  }catch(err){ if(!err.cancelled) $('qaOut').textContent = t('qaFail'); }
  finally{ QAbusy = null; btn.textContent = t('qaLog'); }
}

function delQuick(){ if(!QA) return; const l = dayLog[curDay] || [], i = l.indexOf(QA); if(i > -1){ l.splice(i, 1); saveLog(); } close('ovQuick'); renderAll(); }

// ---------- Today: just gym or rest; a small reminder instead of time + type fields ----------
// 0.8 (24 Nov): the top of My Food Log (gym-day line + hero card) stays put and only the Eaten list scrolls. When the top takes too much of
// the screen (small phone, Advanced open, larger text) the whole page scrolls as before. One layout read per change (ResizeObserver), never while moving.
function todayFit(){ const pg = $('pgToday'), w = $('dEatenWrap'); if(!pg || !w || pg.classList.contains('hide')) return;
  const room = pg.clientHeight - w.offsetTop; pg.classList.toggle('pinned', room >= 240);
  // the title row's real height: measured with its height released, and with offsetHeight (scrollHeight counted the blur band under it and its own
  // old height, so every re-check made the row taller and left a gap above and below "Logged Foods")
  const sm = document.querySelector('#dEatenFold>summary'); if(sm && pg.classList.contains('pinned')){ sm.style.height = 'auto'; const h = Math.ceil(sm.offsetHeight); sm.style.height = ''; pg.style.setProperty('--sumh', (h + 2) + 'px'); } }
function renderToday(){
  const d = curDay, di = dayInfo(d), tg = targetFor(d), tot = dayTotals(d), entries = (dayLog[d] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const diff = daysUntil(d);
  $('dLabel').textContent =   // 0.6.3: just the date
    new Date(d + 'T12:00:00').toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  setSeg('#dType', di.type); $('gymBox').classList.toggle('hide', di.type !== 'gym'); setSeg('#dWork', di.work || ''); $('dTime').value = di.time || ''; syncClocks();
  // hero bars (0.6.8.2): slim, fully round; "112 / 160 g" sits inside at the right end; where the fill reaches the letters they flip colour (two text layers, one clipped to the fill)
  const mrow = (cls, label, a, b, u, st) => { const w = b ? Math.min(100, a / b * 100) : 0, txt = `<b>${Math.round(a)}</b> / ${b ? Math.round(b) : '–'}${u.trim()}`;
    return `<div class="mrow hero ${cls} ${st || ''}"><small>${label}</small><span class="hbar"><i style="width:${w}%"></i><em>${txt}</em><em class="inv" style="clip-path:inset(0 ${100 - w}% 0 0)">${txt}</em></span></div>`; };
  const usedUp = !!tg && Math.round(tot.kcal) >= tg.k, ms = k => tg ? macroState(k, { p: tot.p, c: tot.c, f: tot.f }[k], tg[k], usedUp) : '';
  const pill = dayPillHtml(d);
  $('dTotals').innerHTML = `<div class="kchead"><span class="kcnum" style="color:${kcalColor(tot.kcal, tg && tg.k)}">${Math.round(tot.kcal).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB')}<small>${tg ? '/ ' + tg.k.toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB') + ' kcal' : 'kcal'}</small></span>${pill}</div>` +
    mrow('p', t('protein'), tot.p, tg && tg.p, ' g', ms('p')) + mrow('c', t('carbs'), tot.c, tg && tg.c, ' g', ms('c')) + mrow('f', t('fat'), tot.f, tg && tg.f, ' g', ms('f'));
  const fT = fibTarget(tg);
  $('dExtrasBody').innerHTML = mrow('fi', t('fibre'), tot.fib || 0, fT, ' g', Math.round(tot.fib || 0) >= fT ? 'hit' : '') + elecHtml(tot);
  // carb timing
  const wins = carbWindows(d), nowM = diff === 0 ? toMin(nowHM()) : -1;
  const eatenIn = w => entries.filter(e => { const m = toMin(e.time); if(w.k === 'other') return !wins.some(x => x.a !== null && m >= x.a && m <= x.b); return m >= w.a && m <= w.b; }).reduce((s, e) => s + e.c, 0);
  // 0.7.3: slim rows: carbs + how many meals; water before / during / after the workout (no tips, no sodium / potassium)
  const bw = (tg && +tg.bw) || latestWeight() || 75, meals = { winMorning: 1, winMidday: 1, winEvening: 2, winPre: 1, winPost: 1, other: 2 };
  const water = w => w.k === 'winPre' ? rnd50(6 * bw) : w.k === 'winWorkout' ? rnd50(8 * bw * (w.b - w.a + 1) / 60) : w.k === 'winPost' ? rnd50(8 * bw) : 0;
  $('dTiming').innerHTML = !tg ? '' : wins.map(w => { const n = meals[w.k] || 0, ml = water(w);
    return `<div class="win ${w.gym ? 'gym' : ''} ${w.a !== null && nowM >= w.a && nowM <= w.b ? 'now' : ''}">
      <div class="tm">${w.k === 'other' ? t('logRestDay') : t(w.k)}<small>${w.a !== null ? fmtClock(fromMin(w.a)) + '–' + fmtClock(fromMin(w.b + 1)) : ''}</small></div>
      <div class="bd">${w.gym ? t(di.work === 'legs' ? 'wLegs' : di.work === 'full' ? 'wFull' : di.work === 'cardio' ? 'wCardio' : 'wUpper') : `${t('winCarbs', { a: Math.round(eatenIn(w)), b: Math.round(w.c) })}${n ? ` · ${t(n === 1 ? 'logTMeal' : 'logTMeals', { n })}` : ''}`}${ml ? `<span class="na">${t('logTWater', { n: ml })}</span>` : ''}</div></div>`; }).join('');
  // log
  // Eaten rows (0.6.9): name + Cooked / Raw / Ready tag; under it P · C · F then the grams; calories bold italic on the right.
  // The time shows only when you tap the row (the edit sheet).
  const catOf = e => { if(e.kind !== 'food') return null; const f = foods.find(x => x.id === e.refId); return f ? f.cat : null; };
  const stOf = e => { if(e.kind !== 'food') return ''; const f = foods.find(x => x.id === e.refId); return f ? f.state : ''; };
  $('dLog').innerHTML = entries.length ? entries.map(e => `<div class="card eatrow" data-eid="${e.id}"><div class="et"><span class="name"><span class="nmt">${catIcon(catOf(e))}${esc(bareName(e.name))}</span>${stTag(stOf(e))}${logQEstTag(e)}</span><small class="esub"><b class="p">P ${fmt(e.p)}</b> · <b class="c">C ${fmt(e.c)}</b> · <b class="f">F ${fmt(e.f)}</b> · <span class="eamt">${fmtSize(e.amt, e.unit)}</span></small></div><span class="ekc">${Math.round(e.kcal)}<small>kcal</small></span></div>`).join('')
    : `<div class="empty">${t('nothingLogged')}</div>`;
  $('copyYesterday').classList.toggle('hide', !!entries.length || !(dayLog[addDays(d, -1)] || []).length);
  renderPlan();
  try{ renderTodayRec(); }catch(e){}
  (dayLog[curDay] || []).filter(e => e.kind === 'quick').forEach(e => { const c = document.querySelector(`#dLog [data-eid="${e.id}"] .eamt`); if(c) c.textContent = t('qaTag'); });
  $('realStart').checked = !!profile.realStart;
  const n = (dayLog[curDay] || []).length; $('dEatenN').textContent = n ? ` · ${n}` : '';
}

function weightTrend(){
  const pts = Object.entries(weights).map(([d, w]) => [new Date(d + 'T12:00:00').getTime() / 864e5, +w]).filter(p => p[1] > 0).sort((a, b) => a[0] - b[0]);
  const now = Date.now() / 864e5, rec = pts.filter(p => now - p[0] <= 28); if(rec.length < 3) return null;
  const span = rec[rec.length - 1][0] - rec[0][0]; if(span < 6) return null;
  const n = rec.length, mx = rec.reduce((a, p) => a + p[0], 0) / n, my = rec.reduce((a, p) => a + p[1], 0) / n;
  const slope = rec.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / rec.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  return { perWeek: slope * 7, days: Math.round(span), last: rec[rec.length - 1][1], pts: rec.map(p => p[1]) };
}

// Refinements 20B: the Daily Targets live open on Settings › Body and Goals. fillTargets() fills them (fillSettings calls it);
// openTargets() (Today's Food shortcuts) opens that page on top of the current one, scrolled to the targets
function openTargets(){ fillSettings(); open('ovSBody'); requestAnimationFrame(() => $('tgBox').scrollIntoView({ block: 'start' })); }
function fillTargets(){
  const tg = targets || { goal: 'bulk', bw: '', gym: {}, rest: {} };
  setSeg('#tgGoal', tg.goal || 'bulk'); TG.goal = tg.goal || 'bulk'; $('tgBw').value = latestWeight() || tg.bw || ''; $('tgFib').value = '';
  $('tgCalcHint').textContent = $('tgBw').value ? t('calcFrom', { w: fmt(+$('tgBw').value) }) : t('calcNeedW');
  [['G', tg.gym || {}], ['R', tg.rest || {}]].forEach(([p, o]) => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).value = o[x] ?? ''));
  tgCheck();
  initMacroSliders();
  const lk = (targets && targets.lock) || {};   // padlocks are remembered
  ['G', 'R'].forEach(P => { MXL[P] = lk[P] || null; MXLG[P] = MXL[P] ? +$('tg' + P + MXL[P]).value || 0 : 0; }); drawLocks();
}
function latestWeight(){ const d = Object.keys(weights).filter(k => +weights[k] > 0).sort().pop(); return d ? +weights[d] : null; }
// Calories stay fixed; protein / carbs / fat are % of them and always add up to 100.
const MX = { G: null, R: null }, MXK = { p: 4, c: 4, f: 9 };
function mxFromGrams(P){ const k = +$('tg' + P + 'k').value || 0, g = x => +$('tg' + P + x).value || 0;
  const cal = { p: g('p') * 4, c: g('c') * 4, f: g('f') * 9 }, sum = cal.p + cal.c + cal.f;
  if(!sum) return { p: 30, c: 45, f: 25 };
  return { p: cal.p / sum * 100, c: cal.c / sum * 100, f: cal.f / sum * 100 }; }
function initMacroSliders(){
  [['G', 'gymDayTargets'], ['R', 'restDayTargets']].forEach(([P]) => {
    if(!$('mx' + P)){ const grid = $('tg' + P + 'k').closest('.grid4'), d = document.createElement('div'); d.className = 'mxs'; d.id = 'mx' + P;
      d.innerHTML = ['p', 'c', 'f'].map(k => `<div class="mxrow"><span class="mxl mx-${k}"><button class="mxlock" type="button" data-lock="${k}" data-p="${P}" data-ta="logALock" aria-label="${t('logALock')}">${svgIcon('unlock', 16, 2)}</button>${t({ p: 'protein', c: 'carbs', f: 'fat' }[k])}</span><input type="range" class="mxr mx-${k}" min="0" max="100" step="any" data-p="${P}" data-k="${k}" aria-label="${k}"><b data-o="${k}"></b></div>`).join('') +
        `<div class="mxbar"><i class="mx-p"></i><i class="mx-c"></i><i class="mx-f"></i></div>`;
      grid.after(d); }
    MX[P] = mxFromGrams(P); drawMx(P, false); });
}
function drawMx(P, writeGrams){
  const m = MX[P], k = +$('tg' + P + 'k').value || 0, box = $('mx' + P); if(!box) return;
  ['p', 'c', 'f'].forEach(x => { const gr = Math.round(k * m[x] / 100 / MXK[x]);
    if(writeGrams) $('tg' + P + x).value = k ? gr : '';
    { const r = box.querySelector(`[data-k="${x}"]`); r.value = m[x]; r.style.setProperty('--v', m[x] + '%'); } box.querySelector(`[data-o="${x}"]`).textContent = `${Math.round(m[x])}%${k ? ' · ' + gr + ' g' : ''}`;
    box.querySelector(`.mxbar .mx-${x}`).style.width = m[x] + '%'; });
  if(writeGrams && typeof tgCheck === 'function') tgCheck();
}
function moveMx(P, key, v){
  const m = MX[P], L = MXL[P];
  if(L && L !== key){   // a locked macro never moves: the change comes out of the third one
    const third = ['p', 'c', 'f'].find(x => x !== key && x !== L); v = Math.max(5, Math.min(100 - m[L] - 5, v)); m[key] = v; m[third] = 100 - m[L] - v; drawMx(P, true); return; }
  const others = ['p', 'c', 'f'].filter(x => x !== key); v = Math.max(5, Math.min(90, v));
  const rem = 100 - v, a = m[others[0]], b = m[others[1]];
  let na = a + b > 0 ? rem * a / (a + b) : rem / 2, nb = rem - na;
  if(na < 5){ na = 5; nb = rem - 5; } if(nb < 5){ nb = 5; na = rem - 5; }
  m[key] = v; m[others[0]] = na; m[others[1]] = nb; drawMx(P, true);
  if(L){ const k = +$('tg' + P + 'k').value || 0; MXLG[P] = k ? Math.round(k * m[L] / 100 / MXK[L]) : 0; }   // dragging the locked one: it keeps its new grams
}

// padlock: lock one macro's grams any time; the locked slider can still be dragged, but moving the others never moves it
const MXL = { G: null, R: null }, MXLG = { G: 0, R: 0 };
function mxKeepLock(P){ const L = MXL[P], k = +$('tg' + P + 'k').value || 0; if(!L || !k || !MXLG[P]) return; const m = MX[P];
  const pct = Math.max(5, Math.min(90, MXLG[P] * MXK[L] / k * 100)), others = ['p', 'c', 'f'].filter(x => x !== L), sum = m[others[0]] + m[others[1]] || 1, rem = 100 - pct;
  m[L] = pct; m[others[0]] = Math.max(5, rem * m[others[0]] / sum); m[others[1]] = 100 - pct - m[others[0]]; }
function drawLocks(){ ['G', 'R'].forEach(P => { const box = $('mx' + P); if(!box) return; box.querySelectorAll('[data-lock]').forEach(b => { const on = MXL[P] === b.dataset.lock; b.innerHTML = svgIcon(on ? 'lock' : 'unlock', 16, 2); b.classList.toggle('on', on); }); }); }
function fibSuggest(){ const goal = TG.goal || 'bulk', k = +$('tgRk').value || +$('tgGk').value || 2500;
  return goal === 'cut' ? Math.max(32, Math.round(k / 1000 * 16)) : Math.round(k / 1000 * 14); }
function drawFibSug(){}   // 0.5.9: fibre is automatic, no box

// ---------- 0.5.9 colours ----------
const rnd50 = v => Math.round(v / 50) * 50;
// eaten calories: white to 75 %, one step greener every 5 % up to fully green on target, then one step towards red every 50 kcal over (fully red at +500)
function kcalColor(e, T){
  if(!T) return 'var(--text)';
  e = Math.round(e); const pct = e / T * 100;
  if(pct < 75) return 'var(--text)';
  // 0.7.4.0.5: blends between theme colours, so it stays readable in Light too
  if(e <= T){ const f = e >= T ? 1 : (Math.floor((pct - 75) / 5) + 1) / 6;
    return `color-mix(in srgb, var(--t-done) ${Math.round(f * 100)}%, var(--t-text))`; }
  const f = Math.min(10, Math.ceil((e - T) / 50)) / 10;
  return `color-mix(in srgb, var(--t-danger) ${Math.round(f * 100)}%, var(--t-warm))`;
}
// macro bars: green when the goal is hit; over it while calories are still under target = light green; red only once calories are used up and past the margin
const MACRO_MARGIN = { p: .25, c: .1, f: .1 };   // protein gets the biggest margin
function macroState(k, a, b, usedUp){
  if(!b || Math.round(a) < Math.round(b)) return '';
  if(a <= b * 1.03) return 'hit';
  if(!usedUp) return 'soft';
  return a > b * (1 + MACRO_MARGIN[k]) ? 'red' : 'hit';
}
// ⓘ bubbles
function showTip(key, btn){
  hideTip(); const p = document.createElement('div'); p.className = 'tippop'; p.id = 'tipPop'; p.setAttribute('role', 'tooltip'); if(btn.dataset.tip1){ p.textContent = btn.dataset.tip1; const sm = document.createElement('small'); sm.className = 'tipsub'; sm.textContent = btn.dataset.tip2 || ''; p.appendChild(sm); } else p.textContent = t(key); document.body.appendChild(p);
  const r = btn.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  const top = topClear(), x = Math.max(16, Math.min(innerWidth - w - 16, r.left + r.width / 2 - w / 2));
  let y = r.bottom + 8;   // 0.7.4.0.5: below the button; flipped above only if that stays clear of the page title blur
  if(y + h > innerHeight - 16){ const up = r.top - h - 8; y = up >= top ? up : Math.max(top, innerHeight - 16 - h); }
  p.style.left = x + 'px'; p.style.top = Math.max(y, top) + 'px';
}
// the first y that isn't under the page title blur (no blur while a window is open)
function topClear(){
  if(document.body.classList.contains('ovopen') || document.querySelector('.overlay.open')) return 16;
  const hd = [...document.querySelectorAll('section.page>header')].find(h => h.offsetParent !== null && h.getBoundingClientRect().height);
  return hd ? Math.max(16, hd.getBoundingClientRect().bottom + 18) : 16;
}
// Log Food / Quick Log unit menu: opens downward, or upward when there's no room below in its window
function lddToggle(row, dd){ const mn = row.querySelector('.ldm'); mn.classList.toggle('hide'); const on = !mn.classList.contains('hide'); dd.setAttribute('aria-expanded', on); mn.classList.remove('up');
  if(!on) return; const box = dd.closest('.sheet') || document.documentElement, b = box.getBoundingClientRect(), r = dd.getBoundingClientRect(), h = mn.offsetHeight;
  const lim = Math.min(innerHeight, b.bottom) - 8, ceil = Math.max(topClear(), b.top) + 8;
  if(r.bottom + 4 + h > lim && r.top - 4 - h >= ceil) mn.classList.add('up'); }
function hideTip(){ const p = $('tipPop'); if(p) p.remove(); }

// 0.6.3.1: dishes (souvlaki, moussaka…) from Quick Add are saved as Home-cooked meals, not store-bought foods
function dishMeal(d){
  const ex = meals.find(x => norm(x.name) === norm(d.name)); if(ex) return ex;
  const per = 100 / d.grams, now = new Date().toISOString();
  const m = { id: uid(), createdAt: now, cookedAt: now, timesCooked: 1, name: d.name, ingredients: [], rawWeight: Math.round(d.grams), cookedWeight: Math.round(d.grams), cookedEstimated: true, quick: true,
    kcal: Math.round(d.kcal * per), protein: r1(d.p * per), carbs: r1(d.c * per), fat: r1(d.f * per), fiber: r1(d.fib * per), salt: Math.round(d.na * per / 400 * 100) / 100, potassium: Math.round(d.k * per),
    total: { kcal: Math.round(d.kcal), protein: r1(d.p), carbs: r1(d.c), fat: r1(d.f) }, recipe: null, updatedAt: now };
  meals.push(m); saveMeals(); return m;
}

// Eaten: swipe a food right-to-left to delete it (Undo in the toast)
function delEntry(id){ const l = dayLog[curDay] || [], i = l.findIndex(x => x.id === id); if(i < 0) return; const [gone] = l.splice(i, 1); saveLog(); renderAll();
  toast(t('entryDel', { n: gone.name }), t('undo'), () => { (dayLog[curDay] = dayLog[curDay] || []).splice(i, 0, gone); saveLog(); renderAll(); }); }

// Fill My Food: shrink portions if the plan would go over what's left
function planFit(r, rem){ const tot = r.meals.reduce((a, m) => a + (+m.kcal || 0), 0), k = Math.max(0, rem.k);
  if(!(tot > 0) || tot <= k * 1.03) return; const f = Math.max(.3, k / tot);
  r.meals.forEach(m => { (m.items || []).forEach(it => { it.grams = Math.round((+it.grams || 0) * f / 5) * 5; }); ['kcal', 'protein', 'carbs', 'fat'].forEach(q => { m[q] = Math.round((+m[q] || 0) * f); }); }); }

// ---------- Food Coach (0.7.4.3; was Quick Log, 0.7.1): tell the chef robot what you ate ----------
// The AI only splits it into items + amounts (one AI use per message; the same answer carries a per-100 g estimate, used only
// when the web can't find a food). 0.7.5: no database matching; each item goes to the AI with web search (see logQWeb below).
// Rows reuse the Log Food row: units, your egg size and the cooking slider follow your Log Food settings.
let logPhr = Store.load('logPhr', {});   // 'm:<whole message>' → the AI's split
const logQSavePhr = () => Store.save('logPhr', logPhr);
function logQEstTag(e){ if(e.kind !== 'food') return ''; const f = foods.find(x => x.id === e.refId); return f && f.source === 'estimate' ? `<span class="sttag est">${t('logQEst')}</span>` : ''; }

// the typed words for one food, without amounts: "Fage yogurt 200g" → "fage yogurt"
const logQDrop = new Set('g gr gram grams kg ml l lt cup cups tbsp tsp piece pieces pc pcs slice slices serving servings portion portions plate plates one two three four five six half a an of x γρ γραμμαρια τεμ τεμαχια φετα φετεσ μεριδα μεριδεσ ενα ενασ μια δυο τρια τρεισ τεσσερα τεσσερισ μιση μισο'.split(' '));
function logQKey(s){ return norm(s).replace(/(\d)([^\d\s.,])/gu, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(w => w && !/^\d/.test(w) && !logQDrop.has(w)).join(' '); }

const logQMealInfo = m => ({ name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null });
const logQGenInfo = g => ({ ...fInfo_({ ...g, unit: g.unit }), name: L(g), icon: subOf(g.cat, g.sub).icon, food: null, gen: g });

// Food Coach 2.0: ONE AI call per message. It decides what the message is and, for food, splits it into items with a per-100 g estimate.
// The app does the rest without AI: your remembered foods, My Foods, the built-in list, deterministic checks (FoodCoach.check), the maths.
// The prompt is short on purpose: the context is one line (FoodCoach.context), the chat is the last 4 lines, the library only what shares a word.
function logQPrompt(txt, ch, fix){
  const ln = lang === 'el' ? 'Greek' : 'English', conv = logQConv(ch);
  return `${AI.voice('chef')}Here you are Food Coach, the chef robot in the food tracker, for someone who lifts weights. No lectures, no talk about how you calculate. If something is unknown, say so.
Context: ${FoodCoach.context()}
${conv ? `Recent chat:\n${conv}\n` : ''}User: """${txt}"""
Talk like a normal conversation. If they repeat or re-ask something already in the chat or on the list on screen, answer it again in full: you may say you had it before ("like I said, …"), then give the whole answer and the full list again. Never refuse, never point them back to an earlier message. Stay on food, nutrition, supplements, drinks, cooking and how eating affects their training and body goals; for anything else say in one friendly line that you are the food coach and leave it.
intent: "log" = they say what they ate or drank (even if they also ask something), or correct the list; "suggest" = they ask what to eat to fit their targets; "answer" = a food or nutrition question; "chat" = anything else.
reply: ${ln}, plain text, at most ${AI.words(60)} words, no markdown. For "log": a short natural acknowledgement, plus a real answer if they also asked something (e.g. whether it suits their training day, using the context). Don't repeat the card's numbers. Nothing is logged until they tap Add: never say you added, logged or saved anything.
items (only for "log"; one per food; never merge or drop a food): text = their words for it without the amount; name = short food name in ${ln} (with how it was cooked if said), no brand; name_en = English name; brand = brand or restaurant, "" if none; qty + unit = the amount as written (unit g, ml, piece, slice, cup, tbsp, tsp or serving; null when not written); grams = the whole amount eaten (when not written, a real serving: restaurant and takeaway food is bigger and richer; count oil, sauce, cheese); ml = true for drinks; kcal, protein, carbs, fat = per 100 g (100 ml) as eaten, ALWAYS numbers: your best estimate for any real food, also an unusual or foreign one, never null and never left out; stated = nutrients the user stated for the whole item, e.g. "a bar with 20g protein" gives {"protein":20} (that is NOT its weight), else null.
complex: true only when the whole message is ONE composed dish (a gyro pita, a burger menu, pasta with mince).
meals (only for "suggest", else []): 1-3 simple meals or snacks that fit what is left of the day's targets in Context (never over it), from common foods or their saved foods; per meal: time "HH:MM", title, items [{name, name_en, grams}], kcal, protein, carbs, fat (for the whole meal), why (one short line).${logQLib(txt)}${logQFixHint(txt + ' ' + (fix ? fix.items.map(it => it.text || it.name).join(' ') : ''))}${fix ? logQFixAsk(fix) : ''}
Return ONLY JSON: {"intent":"log"|"suggest"|"answer"|"chat","reply":string,"complex":boolean,"meals":[{"time":string,"title":string,"items":[{"name":string,"name_en":string,"grams":number}],"kcal":number,"protein":number,"carbs":number,"fat":number,"why":string}],"items":[{"text":string,"name":string,"name_en":string,"brand":string,"qty":number|null,"unit":string|null,"grams":number,"ml":boolean,"kcal":number,"protein":number,"carbs":number,"fat":number,"stated":object|null}]}`;
}
// the recent chat for the prompt: 4 lines, short; the list on screen as one line (cards have no text of their own)
function logQConv(ch){
  const h = ch && ch.history ? ch.history().filter(x => x.text).slice(-4) : [], out = h.map(x => `${x.who === 'me' ? 'User' : 'Coach'}: ${String(x.text).slice(0, 160)}`);
  const p = logQPrev && FC[logQPrev.id] ? logQPrev : null;
  if(p && p.items.length) out.push(`List on screen (${p.state === 'logged' ? 'added' : 'not added yet'}): ` + p.items.map(it => { const r = it.st ? lwCalc(it.st) : null; return `${it.st ? it.st.info.name : it.name}${r ? ` ${Math.round(r.g)} g ${r.kcal} kcal` : ' (not found)'}`; }).join('; '));
  return out.join('\n');
}
// the correction case: the list being corrected, so the AI changes only what the user corrected
function logQFixAsk(prev){
  const rows = prev.items.map(it => { const r = it.st ? lwCalc(it.st) : null; return `- ${it.st ? it.st.info.name : it.name}: ${r ? `${Math.round(r.g)} g, ${Math.round(r.kcal)} kcal` : 'not found'}`; });
  return `\nThe user is correcting the list you gave last:\n${rows.join('\n')}\nAnswer "log" with the WHOLE corrected list: change what they corrected, keep the rest as it was, and make the corrected values realistic.`;
}
// the user's own library that shares a word with the message: saved foods (name, brand, kcal per 100) and saved meals (the user's own
// name, the name the AI found, what is in it). One source among several: the AI still makes its own estimate and the web lookup still
// runs for every food (logQWeb gets the same lines to compare with). mode 'web' words the lines for the web lookup.
function logQLib(txt, mode){
  const ws = new Set(logQKey(txt).split(' ').filter(w => w.length > 2)); if(!ws.size) return '';
  const hits = s => logQKey(s).split(' ').filter(w => ws.has(w)).length;
  const seen = new Set(), hit = foods.filter(f => f && f.name && isFinite(+f.kcal) && +f.kcal >= 0)
    .map(f => ({ f, n: hits(f.name + ' ' + (f.brand || '')) + (f.source === 'estimate' ? 0 : .5) }))
    .filter(x => x.n >= 1).sort((a, b) => b.n - a.n)
    .filter(({ f }) => { const k = norm(f.name) + '|' + norm(f.brand || ''); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  const ml = mode === 'web' ? [] : meals.filter(m => m && m.name).map(m => ({ m, n: hits(m.name) * 2 + hits(m.aiName || '') + hits((m.ingredients || []).map(x => x.ref && x.ref.name).join(' ')) }))
    .filter(x => x.n >= 1).sort((a, b) => b.n - a.n).slice(0, 4);
  let out = '';
  if(hit.length) out += (mode === 'web'
    ? `\nThe user's own saved values for foods with similar names (name | brand | kcal per 100; "estimate" = an earlier AI estimate). One more source: compare them with what you find; when one is clearly the same product and its values agree with a reliable source, keep them.\n`
    : `\nThe user's own saved foods that may be the same (name | brand | kcal per 100; "estimate" = an earlier AI estimate). One source among several: compare them with your own estimate; when one is clearly the same food and its values are realistic, use its name and values.\n`)
    + hit.map(({ f }) => `- ${String(f.name).slice(0, 50)}${f.brand ? ' | ' + String(f.brand).slice(0, 30) : ''} | ${Math.round(+f.kcal)} kcal/100 ${f.unit === 'ml' ? 'ml' : 'g'}${f.source === 'estimate' ? ' | estimate' : ''}`).join('\n');
  if(ml.length) out += `\nThe user's saved meals that may be meant (when the message names one of these, list its foods with these amounts):\n`
    + ml.map(({ m }) => `- "${String(m.name).slice(0, 60)}"${m.aiName && norm(m.aiName) !== norm(m.name) ? ` (the user's own name for what you found as "${String(m.aiName).slice(0, 60)}")` : ''}: ${(m.ingredients || []).filter(x => x.ref).map(x => `${x.ref.name} ${Math.round(x.grams)} g`).join(', ') || `${Math.round(m.cookedWeight || 0)} g`}; ${Math.round((m.total && m.total.kcal) || 0)} kcal`).join('\n');
  return out;
}
// the reply as shown: plain text, and never a claim that something was logged (only the Add button logs)
function logQReply(s){
  s = String(s || '').replace(/[*_`#]+/g, '').replace(/\s+/g, ' ').trim();
  const claim = /\b(I(?:'ve| have| will|'ll)?|I just)\s+(?:also\s+)?(?:updated|added|logged|saved|recorded|tracked|entered|add|log|update|save|record)\b[^.!?]*\b(?:log|diary|tracker|journal|today|day|entry|entries|record)\b|(?:πρόσθεσα|προστέθηκε|καταχώρησα|καταχωρήθηκε|ενημέρωσα|κατέγραψα|θα (?:το |τα )?(?:προσθέσω|καταχωρήσω|καταγράψω))/i;
  const kept = (s.match(/[^.!?;]+[.!?;]*/g) || []).filter(x => !claim.test(x)).join(' ').replace(/\s+/g, ' ').trim();
  return kept.slice(0, 400);
}
// the AI's items, cleaned: numbers that are missing stay null (unknown), never 0; then each is made consistent (FoodCoach.check)
function logQClean(a){
  if(!Array.isArray(a)) return null;
  const n = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v, nn = v => n(v) !== null && n(v) >= 0 ? n(v) : null;
  const st = s => { if(!s || typeof s !== 'object') return null; const o = {}; ['protein', 'kcal', 'carbs', 'fat'].forEach(k => { if(n(s[k]) > 0) o[k] = n(s[k]); }); return Object.keys(o).length ? o : null; };
  return a.filter(x => x && (x.name || x.text)).slice(0, 25).map(x => {
    const c = FoodCoach.check({ text: String(x.text || x.name).slice(0, 80), name: String(x.name || x.text).slice(0, 60), name_en: String(x.name_en || x.name || '').slice(0, 60),
      brand: String(x.brand || '').slice(0, 40), qty: n(x.qty) > 0 ? n(x.qty) : null, unit: x.unit ? String(x.unit) : null, grams: n(x.grams) > 0 ? n(x.grams) : null, ml: !!x.ml,
      kcal: nn(x.kcal), protein: nn(x.protein), carbs: nn(x.carbs), fat: nn(x.fat), total: n(x.total_kcal) > 0 ? n(x.total_kcal) : null, stated: st(x.stated) });
    return c.doubt ? { ...c.item, doubt: true } : c.item; });
}
// ---- Athlete OS step 3: Food Coach remembers your corrections (on this phone, through Store; the Brain takes this over later) ----
// Learned only from what you do: changing an amount the AI guessed, swapping a food, or correcting the list in the chat. Each food word
// key keeps your latest portion; the matching ones go into the next request as a hint. Reset What AI Knows clears it (js/know.js).
let logFix = Store.load('foodFix', {});   // logQKey(food words) → { name, g, kcal, aiG, aiKcal, to, n, at }
const LOGQ_FIX_MAX = 150;
function logQFixSave(){
  const ks = Object.keys(logFix); if(ks.length > LOGQ_FIX_MAX) ks.sort((a, b) => (logFix[a].at || 0) - (logFix[b].at || 0)).slice(0, ks.length - LOGQ_FIX_MAX).forEach(k => { delete logFix[k]; });
  Store.save('foodFix', logFix);
}
function logQFixNote(it, d){
  const k = logQKey(it.text || it.name || ''); if(!k) return;
  const was = logFix[k] || {};
  logFix[k] = { name: String(it.name || it.text).slice(0, 60), g: Math.round(d.g), kcal: Math.round(d.kcal), aiG: d.aiG ? Math.round(d.aiG) : null, aiKcal: d.aiKcal ? Math.round(d.aiKcal) : null,
    to: d.to ? String(d.to).slice(0, 60) : null, n: (was.n || 0) + 1, at: Date.now() };
}
// the remembered corrections that share a word with these words, as a prompt line; '' when none
function logQFixHint(words){
  const ws = new Set(logQKey(words).split(' ').filter(w => w.length > 2)); if(!ws.size) return '';
  const hit = Object.entries(logFix).map(([k, v]) => ({ v, n: k.split(' ').filter(w => ws.has(w)).length })).filter(x => x.n && x.v && x.v.g > 0)
    .sort((a, b) => b.n - a.n || (b.v.at || 0) - (a.v.at || 0)).slice(0, 6);
  if(!hit.length) return '';
  return `\nThis user's own past corrections (learned from their edits; for the same food use their portion and values unless the message says otherwise):\n`
    + hit.map(({ v }) => `- "${v.name}": ${v.to ? `they chose "${v.to}" instead; ` : ''}they log about ${v.g} g (${v.kcal} kcal)${v.aiG ? `, where the first guess was ${v.aiG} g${v.aiKcal ? ` (${v.aiKcal} kcal)` : ''}` : ''}`).join('\n');
}
// does the message correct the last list? ("no, it was bigger", "that's too low", "λάθος, ήταν 300 γρ") — only counted when a list is there to correct
function logQIsFix(txt){
  const s = norm(txt);
  return /\b(wrong|incorrect|too (low|high|little|much|small|big|few|many)|more like|closer to|not (that|so|enough)|actually|it was (more|less|bigger|smaller|about|around)|that'?s (not|too|off|way)|should be|bigger|smaller|larger|underestimat\w*|overestimat\w*|correct(ion)?|fix|change it|make it)\b/.test(s)
    || /(λαθοσ|λαθοσ|πολυ (λιγ|πολλ)|περισσοτερ|λιγοτερ|μεγαλυτερ|μικροτερ|στην πραγματικοτητα|διορθ|δεν ηταν|ηταν (πιο|γυρω|περιπου|πανω|κατω)|αλλαξε|κανε το)/.test(s);
}
let logQPrev = null;   // the last list Food Coach showed, so a correction can refer to it
// one item → a Log Food row state (amount + unit + cooking), from what was typed
function logQState(info, it){
  const ref = lwRef(info), units = lwUnits(info), cook = LW_COOK.find(([gid]) => gid === (info.food || info.gen)?.gid);
  const gi = units.length - 1, qty = +it.qty || 0, un = norm(it.unit || ''), pick = (ui.logUnit || {})[ref];
  const mk = (u, n) => ({ k: 'q', i: 0, info, ref, units, u, n, cook: cook ? cook[2] : null, ck: cook ? ((ui.logCook || {})[ref] ?? null) : null });
  let g = 0;
  if(qty && /^(g|gr|gram|kg|ml|l$|lt|lit|oz|γρ)/.test(un)) g = qty * (/^(kg|l$|lt|lit)/.test(un) ? 1000 : /^oz/.test(un) ? OZ : 1);
  else if(qty){
    const want = /cup|φλιτζ/.test(un) ? 'cup' : /tbsp|tablesp|σουπ/.test(un) ? 'tbsp' : /tsp|teasp|γλυκ/.test(un) ? 'tsp' : null;
    let j = -1;
    if(want) j = units.findIndex(x => x.k === want);
    else if(/serv|portion|plate|μεριδ|πιατ/.test(un)) j = units.findIndex(x => x.k === 'serving' || x.k === 'plate');
    else if(/slice|φετ/.test(un)) j = info.pw === 'slice' ? units.findIndex(x => x.k === 'pc') : -1;
    else {   // a count: "4 eggs", "a yogurt"; the unit you last picked in Log Food (your egg size) wins
      j = info.pw === 'bar' ? units.findIndex(x => x.k === 'pc') : units.findIndex(x => x.k === pick && x.k !== 'g');
      if(j < 0) j = units.findIndex(x => x.k === 'pc' || x.k === 'plate' || x.k === 'pack'); }
    if(j > -1) return mk(j, qty);
    g = +it.grams || 0;
    if(!g && /serv|portion|plate|μεριδ|πιατ/.test(un)) g = qty * (it.rest ? 330 : 250);   // 0.8: a plate / serving with no size on file; a takeaway portion is bigger
  } else { const last = info.meal || info.food ? lastEntryOf((info.meal || info.food).id) : null; g = last ? last.amt : +it.grams || 0; }
  if(!(g > 0)) g = 100;
  return mk(gi, r1(g / units[gi].size));
}

// ---- Food Coach 2.0: where each food's values come from, best first, all on the phone (no AI call) ----
// 1. what you added before for the same words (logPhr 'i:<words>' → that food; your last amount of it comes with it)
// 2. your own saved meals and foods, then the built-in list (a branded food never takes a generic built-in value as if it were that product)
// 3. the AI's estimate from the same answer (tag AI ESTIMATE). It is saved to My Foods only when you tap Add, never before.
// 4. not found: tap the row to pick a food, or remove it. Add stays off until every row has a food and an amount.
// Branded foods that ended up as an estimate are looked up on the web in the BACKGROUND (one call for the card); Add never waits for it.
function logQSet(it, info, src){ it.src = src; it.st = logQState(info, it); if(it.g0 == null) it.g0 = lwCalc(it.st).g; }   // g0: the amount first offered, to notice your corrections
const logQTmpInfo = d => ({ name: d.name, icon: '', unit: d.unit || 'g', per: d, food: null, tmp: d, piece: null });
function logQInfoOf(ref){
  if(!ref) return null; const k = ref.slice(0, 2), id = ref.slice(2);
  if(k === 'f:'){ const f = foods.find(x => x.id === id); return f ? fInfo_(f) : null; }
  if(k === 'm:'){ const m = meals.find(x => x.id === id); return m ? logQMealInfo(m) : null; }
  if(k === 'g:'){ const g = GENBY[id]; return g ? logQGenInfo(g) : null; }
  return null;
}
const logQMemKey = it => { const k = logQKey([it.brand, it.text || it.name].filter(Boolean).join(' ')); return k ? 'i:' + k : ''; };
function logQMem(it){ const v = logPhr[logQMemKey(it)]; if(!v || !v.ref) return null; const info = logQInfoOf(v.ref); return info ? { info, g: v.g } : null; }
const LOGQ_SAME = [[/^(boiled|steamed|βραστ\p{L}*|μαγειρεμεν\p{L}*)$/u, 'cooked'], [/^(fresh|homemade|plain|organic|natural|σπιτικ\p{L}*|φρεσκ\p{L}*)$/u, '']];
function logQLocal(it){
  const tidy = s => norm(s || '').split(' ').map(w => { const r = LOGQ_SAME.find(([re]) => re.test(w)); return r ? r[1] : w; }).filter(Boolean).join(' ');
  const b = it.brand ? it.brand + ' ' : '', qs = [b + (it.name_en || ''), b + (it.name || ''), b + (it.text || '')].map(x => x.trim()); qs.push(...qs.map(tidy));
  for(const q of [...new Set(qs.filter(Boolean))]){
    if(!logQKey(q)) continue;
    const loc = qaLocal(q); if(!loc) continue;
    if(loc.kind === 'meal') return { info: logQMealInfo(loc.m), src: 'meal' };
    if(loc.kind === 'gen'){   // the first built-in food that is really what you said (not just one that contains your words)
      const g = logQTight(q, loc.g) ? loc.g : searchLocal(q, false, { log: true }).std.slice(0, 12).find(x => logQTight(q, x) && logQCovers(q, x));
      if(g) return { info: logQGenInfo(g), src: 'std' }; continue; }
    if(loc.f.via !== 'coach' && loc.f.source !== 'estimate') return { info: fInfo_(loc.f), src: 'mine' };
  }
  return null;
}
// a built-in food only counts when its main name says no more than you did ("tomato sauce" is not "Beef in tomato sauce"; cooking words are fine)
const LOGQ_DESCW = /^(cooked|raw|boiled|grilled|baked|fried|roasted|steamed|fresh|plain|white|whole|lean|skinless|boneless|homemade|ready|μαγειρεμεν\p{L}*|ωμ\p{L}*|βραστ\p{L}*|ψητ\p{L}*|τηγανητ\p{L}*|φρεσκ\p{L}*|σπιτικ\p{L}*|λευκ\p{L}*)$/u;
// the same word, allowing only plural / Greek endings ("egg" = "eggs", "αυγό" = "αυγά"; "bread" is not "breast")
const LOGQ_END = /^(|s|es|ies|a|o|ος|οσ|ου|οι|α|ο|η|ι|ες|εσ|ια|ιο|ης|ησ|ων|ακι|ακια)$/;
function logQSame(a, b){ if(a === b) return true; let i = 0; while(i < a.length && a[i] === b[i]) i++; return i >= 3 && LOGQ_END.test(a.slice(i)) && LOGQ_END.test(b.slice(i)); }
const logQWords = s => norm(s).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3 && !/^\d/.test(w) && !(logQDrop.has(w) && w !== 'φετα'));   // φέτα is also feta
function logQTight(q, g){
  const qs = logQWords(q);
  const fits = nm => { const ws = logQWords(String(nm || '').split(/[,(]/)[0]); return ws.length > 0 && ws.filter(w => !LOGQ_DESCW.test(w) && !qs.some(x => logQSame(x, w))).length === 0; };
  return fits(g.en) || fits(g.el);
}
// every word you said is in the food's names (same word rules)
function logQCovers(q, g){ const hw = logQWords([g.en, g.el, g.hay || ''].join(' ')); return logQWords(q).filter(w => !LOGQ_DESCW.test(w)).every(w => hw.some(x => logQSame(w, x))); }
const logQEstData = it => { const nm = String(it.name || it.text); return { name: nm.charAt(0).toUpperCase() + nm.slice(1), brand: (it.brand || '').trim(), hint: it.name_en || '', unit: it.ml ? 'ml' : 'g',
  kcal: Math.round(it.kcal), protein: r1(it.protein), carbs: r1(it.carbs), fat: r1(it.fat), state: 'ready', source: 'estimate' }; };
function logQResolve(m){
  m.items.forEach(it => {
    if(it.st || it.busy) return;
    const mem = logQMem(it); if(mem){ logQSet(it, mem.info, 'mem'); return logQStated(it); }
    const loc = logQLocal(it);
    if(loc && !(it.brand && loc.src === 'std')){ logQSet(it, loc.info, loc.src); return logQStated(it); }
    if(FoodCoach.usable(it)){ logQSet(it, logQTmpInfo(logQEstData(it)), 'est'); return logQStated(it); }
    if(loc){ logQSet(it, loc.info, loc.src); it.assumed = t('logQClose'); return; }   // a brand with only a general match: shown, and said so
    it.st = null; it.src = 'none';
  });
}
// "with 20g protein": when the food found disagrees clearly with what you said, the row says so (you know your bar better than we do)
function logQStated(it){
  const s = it.stated && it.stated.protein; if(!(s > 0) || !it.st) return;
  const p = lwCalc(it.st).p; if(Math.abs(p - s) > Math.max(3, s * .25)){ it.doubt = true; it.assumed = t('logQStatedOff', { v: fmt(s) }); }
}
// a branded food the app could not find itself: one web lookup for the card, in the background; it replaces the estimate only if you haven't touched that row
async function logQWeb(m, ch){
  const list = m.items.filter(it => it.brand && (it.src === 'est' || it.src === 'none') && !it.touched);
  if(!list.length || !AI.can('search') || !(await logQAIOk(2))) return;   // no web look-ups on this provider: the estimate stays (no request)
  list.forEach(it => { it.chk = true; }); logQRedraw(m);
  try{
    const r = await ch.ask(`Find these branded foods online and read their nutrition per 100 g (or 100 ml) as sold. Use THAT exact product (the brand's site, a supermarket listing or Open Food Facts); if you can't find that exact product, "found": false — never a similar product. Carbs as on EU labels (fibre not included).
name: short name in ${lang === 'el' ? 'Greek' : 'English'}, without the brand. assumed: a short phrase on what you assumed ("1 bar = 60 g"), or "".
Return ONLY JSON: {"items":[{"i":number,"found":boolean,"name":string,"brand":string,"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number|null,"unit":"g"|"ml","assumed":string}]}
Foods:
${list.map((it, j) => `${j}) ${it.brand} ${it.name_en || it.name} ("${it.text}")`).join('\n')}`, null, { search: true, task: 'food-web', deadlineMs: 25000, timeoutMs: 20000, maxModels: 2 });
    const n = v => v === null || v === undefined || v === '' || !isFinite(+v) || +v < 0 ? null : +v;
    (r && Array.isArray(r.items) ? r.items : []).forEach(w => { const it = list[+w.i];
      if(!it || !w.found || it.touched || m.state === 'logged' || !m.items.includes(it)) return;
      const d = { name: w.name || it.name, brand: w.brand || it.brand || '', hint: it.name_en || '', kcal: n(w.kcal), protein: n(w.protein), carbs: n(w.carbs), fat: n(w.fat), fiber: n(w.fiber), unit: w.unit === 'ml' ? 'ml' : 'g', state: 'ready', source: 'web' };
      if(!FoodCoach.usable(d) || FoodCoach.check(d).doubt || Search.quality(d) <= 0) return;
      const g = it.st ? lwCalc(it.st).g : 0; it.src = 'web'; it.st = logQState(logQTmpInfo(d), it); it.doubt = false;
      if(g > 0 && Math.abs(lwCalc(it.st).g - g) > 1){ const gi = it.st.units.length - 1; it.st.u = gi; it.st.n = r1(g / it.st.units[gi].size); }
      if(w.assumed) it.assumed = String(w.assumed).slice(0, 80); logQStated(it); });
  }catch(e){ /* the estimate stays; nothing else changes */ }
  finally{ list.forEach(it => { it.chk = false; }); logQRedraw(m); }
}
// can an AI request go out now? (a key, online, and the provider not cooling down after "out of quota") — answered without a network call
async function logQAIOk(maxModels){
  if(!AI.hasKey() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
  try{ return (await AIProvider.status({ maxModels: maxModels || 3 })).ok; }catch(e){ return false; }
}

// ---- 0.7.4.3 Food Coach (was Quick Log): the shared coach chat (js/coach.js) with the chef robot ----
// Each answer is one card: the foods it understood as a compact list (tap a row to change the amount, unit or food; X removes it)
// with the total underneath, and ONE Add button that logs every food on the list. Food Coach 2.0: Add (and Add & Save) stay off until
// every row has a food and an amount; a row marked Not Found is picked or removed first, so nothing is skipped without you knowing.
const FC = {};   // answer id → { m, card, ch }
const fcHtml = m => `<div class="fcwrap" data-mid="${m.id}">${m.meal ? mealCardHtml(m) : logQCardHtml(m)}</div>`;   // m.meal: a complex meal (js/meal.js)
function logQRedraw(m){ const x = FC[m.id]; if(x) x.ch.update(x.card, { body: fcHtml(m) }); }
function logQKeep(m){ const x = FC[m.id]; if(x) x.card.body = fcHtml(m); }   // after an in-place change: the next redraw shows the same thing
function logQTot(m){ return m.items.filter(it => it.st && !it.busy).reduce((a, it) => { const r = lwCalc(it.st); return { kcal: a.kcal + r.kcal, p: a.p + r.p, c: a.c + r.c, f: a.f + r.f }; }, { kcal: 0, p: 0, c: 0, f: 0 }); }
const logQCanAdd = m => !!m && (m.meal ? true : m.items.length > 0 && m.items.every(it => !it.busy && it.st && lwCalc(it.st).g > 0));
function logQCardHtml(m){
  const tot = logQTot(m), done = m.state === 'logged';
  const foot = done ? '' : `<div class="lqfoot"><div class="lres"><span class="lk">${Math.round(tot.kcal)} kcal</span><span class="lm"><b class="p">P ${fmt(tot.p)}</b> · <b class="c">C ${fmt(tot.c)}</b> · <b class="f">F ${fmt(tot.f)}</b></span></div></div>`;
  const hint = done ? '' : `<small class="ls lqhint${logQCanAdd(m) || m.items.some(it => it.busy) ? ' hide' : ''}">${t('logQPickRows')}</small>`;
  const nm = m.naming && !done ? `<div class="lqname"><small class="ls">${esc(t('logQNameSub', { n: logQAutoName(m.items.filter(it => it.st).map(it => it.st.info)) }))}</small>
    <div class="lqnrow"><input class="lqsq" type="text" data-qname value="${esc(m.mname || '')}" placeholder="${t('logQNamePh')}" autocomplete="off" enterkeyhint="done" aria-label="${t('logQNamePh')}" maxlength="60">
    <button class="lqswapbtn" type="button" data-qnameok>${t('save')}</button></div></div>` : '';
  return `<div class="lqcard ${done ? 'logged' : ''}">${m.items.map((it, i) => logQRowHtml(m, it, i)).join('')}${foot}${hint}${nm}</div>`;
}
function logQRowHtml(m, it, i){
  const done = m.state === 'logged', tag = it.src === 'std' ? `<span class="sttag lq std">${t('logQStd')}</span>` : it.src === 'web' ? `<span class="ctag web">${t('logQWebTag')}</span>` : it.src === 'est' ? `<span class="ctag est">${t('logQEstTag')}</span>` : '';
  const nm = it.st ? it.st.info.name : (it.name || it.text), sub = it.busy ? t('logQFind') : it.st ? lwSub(it.st) : t('logQNone');
  return `<div class="lqrow ${it.open && !done ? 'open' : ''} ${it.busy ? 'busy' : ''} ${!it.busy && !it.st ? 'miss' : ''}" data-qi="${i}">
    <div class="lrh"><button class="lrn" type="button" data-qopen ${done || it.busy ? 'disabled' : ''}><span class="nm">${esc(bareName(nm))}${tag ? ' ' + tag : ''}</span><small class="ls">${it.busy ? AI.dots(sub) : esc(sub)}</small>${it.assumed && it.st ? `<small class="ls aiassume">${esc(it.assumed)}</small>` : ''}${it.doubt && it.st && !done ? `<small class="ls aiassume lqdoubt">${t('logQDoubt')}</small>` : ''}${it.chk && !done ? `<small class="ls aiassume">${AI.dots(t('logQChecking'))}</small>` : ''}</button>
    ${done ? '' : `<button class="lqx" type="button" data-qrm aria-label="${t('logQRm')}">${svgIcon('x', 14, 2.6)}</button>`}</div>
    ${it.open && !done ? logQPanel(it) : ''}</div>`;
}
function logQPanel(it){
  const sw = `<div class="lqswap"><div class="logfX"><input class="lqsq" type="search" data-qsq value="${esc(it.sq || '')}" placeholder="${t('logQSwapPh')}" autocomplete="off" enterkeyhint="search" aria-label="${t('logQSwapPh')}">${logfXBtn()}</div><div class="lqsres">${logQSwapRes(it)}</div></div>`;
  const st = it.st; if(!st) return `<div class="lpn">${sw}</div>`;
  const r = lwCalc(st);
  return `<div class="lpn"><div class="lamt"><input class="lan" type="number" inputmode="decimal" step="any" min="0" value="${fmt(+st.n || 0)}" aria-label="${t('lwAmount')}">
    <div class="ldd"><button class="ldb" type="button" data-ldd aria-haspopup="listbox"><span class="ldl">${esc(lwUnitLbl(st, st.u))}</span>${svgIcon('down', 16, 2.4)}</button><div class="ldm hide" role="listbox">${lwMenu(st)}</div></div></div>
    ${st.cook ? `<div class="seg lck">${st.cook.map((c, j) => `<button type="button" data-v="${j}" data-lck="${j}" class="${j === st.ck ? 'on' : ''}">${esc(lwL(c))}</button>`).join('')}</div>` : ''}
    <div class="lres"><span class="lk">${r.kcal} kcal</span><span class="lm"><b class="p">P ${fmt(r.p)}</b> · <b class="c">C ${fmt(r.c)}</b> · <b class="f">F ${fmt(r.f)}</b></span></div>
    ${it.swap ? sw : `<button class="lqswapbtn" type="button" data-qswap>${t('logQSwap')}</button>`}</div>`;
}
function logQSwapRes(it){
  const q = (it.sq || '').trim(); if(!q){ it.sres = []; return ''; }
  const s = searchLocal(q, false, { log: true, meals: true });
  it.sres = [...s.mine.slice(0, 4).map(f => [f.source === 'estimate' ? 'est' : 'mine', fInfo_(f)]), ...s.meals.slice(0, 2).map(m => ['meal', logQMealInfo(m)]), ...s.std.slice(0, 4).map(g => ['std', logQGenInfo(g)])];
  if(!it.sres.length) return `<div class="hint">${t('logQNoMatch', { q: esc(q) })}</div>`;
  return it.sres.map(([, inf], j) => `<button class="lqpick" type="button" data-qpick="${j}"><span>${esc(inf.name)}</span><small>${macrosFor(inf.per, 100).kcal} kcal / 100 ${inf.unit || 'g'}</small></button>`).join('');
}
// Add / Add & Save on or off, and the "pick or remove" line, without redrawing the card (typing keeps its focus)
function logQSyncBtns(m){
  const x = FC[m.id], el = x && document.querySelector(`#coachList [data-cid="${x.card.cid}"]`); if(!el) return; const ok = logQCanAdd(m);
  el.querySelectorAll('[data-ca]').forEach(b => { b.disabled = !ok; }); const h = el.querySelector('.lqhint'); if(h) h.classList.toggle('hide', ok);
}
// typing an amount / changing the unit or cooking: only that row and the card's total change
function logQUpd(m, row, it){
  lwUpdate(row, it.st); it.touched = true;
  if(it.doubt){ it.doubt = false; const d = row.querySelector('.lqdoubt'); if(d) d.remove(); }   // checked by the user: the note goes
  const card = row.closest('.lqcard'), tot = logQTot(m), k = card && card.querySelector('.lqfoot .lk'), mm = card && card.querySelector('.lqfoot .lm');
  if(k) k.textContent = Math.round(tot.kcal) + ' kcal';
  if(mm) mm.innerHTML = `<b class="p">P ${fmt(tot.p)}</b> · <b class="c">C ${fmt(tot.c)}</b> · <b class="f">F ${fmt(tot.f)}</b>`;
  logQKeep(m); logQSyncBtns(m);
}

// ---- open, answer, add ----
// opens Food Coach; q = words to put in the box (from Log Food's "nothing matches" row)
function logQOpenSheet(q){
  Coach.open('chef');
  if(q){ const ta = $('coachIn'); ta.value = q; ta.dispatchEvent(new Event('input')); setTimeout(() => { try{ ta.focus(); }catch(e){} }, 120); }
}
// logPhr holds 'm:<message>' (a whole message you added) and 'i:<food words>' (one food you added); the oldest go first past the limits
function logQTrim(){
  const cut = (pre, max) => { const ks = Object.keys(logPhr).filter(k => k.startsWith(pre)); if(ks.length <= max) return;
    ks.sort((a, b) => ((logPhr[a] || {}).at || 0) - ((logPhr[b] || {}).at || 0)).slice(0, ks.length - max).forEach(k => { delete logPhr[k]; }); };   // 'm:' lists have no .at: stable sort keeps insertion order
  cut('m:', 500); cut('i:', 400);
}

// Food Coach 2.0: one answer = at most ONE AI call (plus, for branded foods only, one web lookup in the background), inside one time budget.
// Everything that can be answered on the phone is: thanks, totals, small corrections, a message you added before, foods you have.
const LOGQ_AI = { deadlineMs: 12000, timeoutMs: 9000, maxModels: 3 };   // after that: the offline answer, never minutes of dots
let logQCalls = 0;
const logQCh = ch => ({ ...ch, ask: (p, img, o) => { logQCalls++; return ch.ask(p, img, { ...LOGQ_AI, ...(o || {}) }); } });
async function logQSend(txt, ch){
  const t0 = Date.now(), n0 = logQCalls, how = { path: 'ai' };
  try{ await logQAnswer(txt, logQCh(ch), how); }
  finally{ FoodCoach.track(how.path, Date.now() - t0, logQCalls - n0); }
}
async function logQAnswer(txt, ch, how){
  const prev = logQPrev && FC[logQPrev.id] && !logQPrev.meal ? logQPrev : null;
  // 1. answered on the phone: thanks, hello, "how much protein was that?", "how much protein today?"
  const q = FoodCoach.quick(txt);
  if(q && (q.kind !== 'last' || (prev && prev.items.length))){ how.path = 'local'; ch.say(logQQuick(q, prev)); return; }
  // 2. a small change to the list on screen: "make it 200g", "add another toast", "remove the bar", "I meant cooked"
  if(prev && prev.items.length){ const cmd = FoodCoach.correction(txt, logQRows(prev)); if(cmd && logQApplyCmd(prev, cmd, ch)){ how.path = 'local'; return; } }
  const mk = 'm:' + norm(txt);
  // 3. (removed) the same message again is answered again, like in a normal conversation: the AI may say it had it before, and the card comes back
  const fix = prev && prev.items.length && logQIsFix(txt) ? prev : null;
  // 4. a message you added before: the same foods and amounts, no AI
  const mem = !fix && Array.isArray(logPhr[mk]) ? logPhr[mk] : null;
  if(mem && mem.length){ how.path = 'memory'; logQShow(txt, ch, mem.map(p => ({ ...p, src: p.ref ? 'mem' : p.src })), t('logQGot')); return; }
  let ai = await logQAIOk(), err = null, parts = null, reply = '';
  // 4b. a clear "what should I eat?": the suggestion request itself is the one request (no classification request before it)
  if(!fix && FoodCoach.wantsIdeas(txt)){ how.path = 'suggest';
    if(!ai){ ch.say(AI.hasKey() ? t('logQSuggOff') : t('aiErrNoKey')); return; }
    try{ await logQSuggest(ch, ''); }catch(e){ if(e.cancelled) throw e; ch.say(AI.friendly(e)); }
    return; }
  // 5. a known dish: one AI call, one meal card (js/meal.js); a dish you added before needs none.
  // The request budget is one per message: a dish answer that could not be used ({ spent }) or failed ({ err }) goes to the offline reading, never to a second request.
  if(!fix){ const det = mealDetect(txt); if(det.dish){ const r = await mealSend(txt, ch, det, ai); if(r === true) return; if(r && (r.err || r.spent)){ if(r.err) err = r.err; ai = false; } } }
  // 6. the one AI call: what the message is, the reply, and the foods with an estimate each
  if(ai){
    try{ const r = await ch.ask(logQPrompt(txt, ch, fix), null, { task: fix ? 'food-coach-fix' : 'food-coach' }) || {}, intent = String(r.intent || 'log');
      reply = logQReply(r.reply);
      if(intent === 'suggest'){ await logQSuggest(ch, reply, Array.isArray(r.meals) && r.meals.length ? r.meals : null); return; }   // the ideas come in the same answer
      if(intent !== 'log'){ ch.say(reply || t('aiErrOther')); return; }
      parts = logQClean(r.items); if(!(parts && parts.length)) parts = null;
      if(parts && r.complex === true && !fix){ const mi = mealFromItems(parts, r); if(mi && mealShow(txt, ch, mealDetect(txt), mi)) return; }
    }catch(e){ if(e.cancelled) throw e; err = e; }
  }
  // 7. no AI (no key, offline, quota used up, or it failed): the app reads the message itself and matches what it can
  let note = reply || t('logQGot');
  if(!parts){
    how.path = 'offline'; parts = FoodCoach.parse(txt);
    // 0.8: only confident matches. A row counts when it closely matches a real food (or a Greek alias), or when you wrote an amount for it;
    // the rest ("how are you", "a plate of … with some …" leftovers) is ignored. No food words and no amounts = just talking: no card.
    parts = parts.filter(p => p.qty != null || p.stated || logQMem(p) || logQLocal(p));
    if(!parts.length){ if(!FoodCoach.hasAmount(txt)){ how.path = 'local'; ch.say(logQTalk()); return; } ch.say(err ? AI.friendly(err) : reply || t('logQFail')); return; }
    note = err && (err.kind === 'auth' || err.kind === 'other' || err.nomodel || err.nokey) ? AI.friendly(err) + ' ' + t('logQLocalOnly') : err || !ai ? (AI.hasKey() ? t('logQOffline') : t('logQLocalOnly')) : reply || t('logQGot');   // a failed AI call says why (key / quota / busy / the provider's own reason), not only "can't reach"
  }
  logQShow(txt, ch, parts, note, parts && !how.path.startsWith('off') ? fix : null);
}
// one list on screen: rows found on the phone at once, the background label check for branded estimates
function logQShow(txt, ch, parts, note, fixOf){
  // 0.8: "yesterday / χθες" logs to yesterday; "takeaway / delivery / παρήγγειλα" makes a food without an amount one restaurant portion
  const wh = FoodCoach.when(txt); if(wh.takeaway) parts = parts.map(p => p.ref || p.tmp ? p : p.qty == null ? { ...p, qty: 1, unit: 'serving', rest: true } : { ...p, rest: true });
  const m = { id: uid(), items: logQRebuild(parts), mk: 'm:' + norm(txt), state: 'ready', fixOf: fixOf || null, at: todayKey(), day: wh.day ? addDays(todayKey(), wh.day) : null };
  if(m.day) note += ' ' + t('logQYest');
  logQResolve(m);
  ch.say(note + (m.fixOf && m.fixOf.state === 'logged' ? ' ' + t('logQFixNote') : ''));
  logQPrev = m; logQCard(m, ch);
  logQWeb(m, ch).catch(() => {});
}
function logQCard(m, ch, extra){
  const off = () => !logQCanAdd(m);
  const [card] = ch.cards([{ body: '', actions: [{ label: t('add'), primary: true, off, run: () => logQLogAll(m) }, { label: t('logQAddSave'), off, run: () => logQNameAsk(m) }], ...(extra || {}) }]);
  FC[m.id] = { m, card, ch }; logQRedraw(m); return card;
}
// rows as FoodCoach.correction() reads them
const logQRows = m => m.items.map(it => ({ name: it.st ? it.st.info.name : it.name, text: it.text, counted: !!(it.st && it.st.units[it.st.u].k !== 'g') }));
// a small correction, done on the phone. The list still open changes in place (no second card); a list already added gets a corrected copy
// that replaces it when you tap Add (with undo), as before. false = not applied here (the AI decides).
function logQApplyCmd(prev, cmd, ch){
  const m = prev.state === 'logged' ? { ...prev, id: uid(), state: 'ready', undo: null, naming: false, fixOf: prev, items: prev.items.map(it => ({ ...it, st: it.st ? { ...it.st } : null, open: false, swap: false })) } : prev;
  const it = m.items[cmd.i]; if(!it) return false;
  if(cmd.type === 'remove') m.items.splice(cmd.i, 1);
  else {
    const st = it.st; if(!st) return false; const g = lwCalc(st).g;
    if(cmd.type === 'inc'){
      const u = st.units[st.u], cnt = /^(piece|slice|serving)$/.test(it.unit || '') && it.qty > 0 ? it.qty : 1;
      if(u.k === 'g'){ st.n = r1(+st.n + g / cnt * cmd.n / u.size); } else st.n = +st.n + cmd.n;
      if(cnt > 1 || /^(piece|slice|serving)$/.test(it.unit || '')) it.qty = cnt + cmd.n;
    } else if(cmd.type === 'set'){
      if(cmd.unit === 'g' || cmd.unit === 'ml'){ const gi = st.units.findIndex(x => x.k === 'g'); st.u = gi; st.n = r1(cmd.qty / st.units[gi].size); }
      else { const ns = logQState(st.info, { qty: cmd.qty, unit: cmd.unit }); ns.ck = st.ck; it.st = ns; }
    } else if(cmd.type === 'state'){
      const w = cmd.state + ' ' + (it.name_en || it.name), loc = logQLocal({ text: w, name: cmd.state + ' ' + it.name, name_en: w, brand: '' });
      if(!loc || lwRef(loc.info) === st.ref) return false;
      it.st = logQState(loc.info, { qty: g, unit: 'g' }); it.src = loc.src; it.swapped = true;
    }
    it.touched = true; it.doubt = false;
  }
  if(m !== prev){ logQPrev = m; ch.say(t('logQFixedNew')); logQCard(m, ch); }
  else { ch.say(t('logQFixed')); logQRedraw(m); }
  return true;
}
// 0.8: a message that is just talking (no food words, no amounts) and no AI to chat: a short answer in the coach's personality, no card
function logQTalk(){ const b = (typeof Persona === 'object' && Persona.prefs && Persona.prefs().base) || 'balanced'; return t('logQTalk_' + (['balanced', 'motivator', 'analytical'].includes(b) ? b : 'balanced')); }
// thanks / hello / totals, in plain words
function logQQuick(q, prev){
  if(q.kind === 'thanks') return t('logQThanks');
  if(q.kind === 'hi') return t('logQHi');
  const v = (o, k) => k === 'kcal' ? `${Math.round(o.kcal)} kcal` : `${fmt(Math.round(o[k]))} g ${t('logQN_' + k)}`;
  if(q.kind === 'last') return t('logQAnsLast', { v: v(logQTot(prev), q.key) }) + (prev.items.some(it => !it.st) ? ' ' + t('logQAnsMiss') : '');
  const tg = targetFor(curDay), tk = { kcal: 'k', p: 'p', c: 'c', f: 'f' }[q.key];
  return t('logQAnsToday', { v: v(dayTotals(curDay), q.key), of: tg && tg[tk] ? t('logQOf', { t: q.key === 'kcal' ? tg.k + ' kcal' : tg[tk] + ' g' }) : '' });
}
// a list kept as plain data (chat memory, and a message you added): each row with its food id, amount and unit; an estimate keeps its values
function logQSer(m){
  return m.items.map(it => ({ text: it.text, name: it.name, name_en: it.name_en, brand: it.brand, qty: it.qty, unit: it.unit, grams: it.grams, ml: it.ml,
    kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat, stated: it.stated || null, src: it.src, assumed: it.assumed || '', doubt: !!it.doubt, g0: it.g0, touched: !!it.touched,
    ref: it.st && !it.st.info.tmp ? it.st.ref : null, tmp: it.st && it.st.info.tmp ? it.st.info.tmp : null, n: it.st ? +it.st.n : null, uk: it.st ? it.st.units[it.st.u].k : null, ck: it.st ? it.st.ck : null }));
}
function logQRebuild(list){
  return (list || []).map(p => {
    const it = { ...p, busy: false }; ['ref', 'tmp', 'n', 'uk', 'ck'].forEach(k => delete it[k]);
    if(!p.ref && !p.tmp){ it.st = null; return it; }
    const info = p.tmp ? logQTmpInfo(p.tmp) : logQInfoOf(p.ref);
    if(!info){ it.st = null; it.src = 'none'; return it; }   // the food was deleted since: pick another
    it.st = logQState(info, it); const j = p.uk ? it.st.units.findIndex(x => x.k === p.uk) : -1;
    if(j > -1 && p.n > 0){ it.st.u = j; it.st.n = p.n; } if(p.ck != null && it.st.cook) it.st.ck = p.ck;
    return it; });
}
// the chat on this phone (coach.js persist.load / persist.save): kept 2 days; lists from today come back as working cards, older ones are not offered again
function logQPersist(msgs){
  const out = [];
  (msgs || []).forEach(x => { if(x.work) return;
    if(x.cards){ x.cards.forEach(c => { const f = Object.values(FC).find(z => z.card === c); if(f && !f.m.meal) out.push({ who: 'bot', fc: { mk: f.m.mk, at: f.m.at || todayKey(), state: f.m.state, items: logQSer(f.m), added: f.m.added || null }, done: c.done || '' }); }); return; }
    if(x.text) out.push({ who: x.who, text: String(x.text).slice(0, 600), ...(x.first ? { first: true } : {}), ...(/^[a-z]{2,12}$/.test(x.by || '') ? { by: x.by } : {}) }); });   // by: a handed-over answer (Athlete OS)
  FoodCoach.chatSave(out);
}
function logQRestore(ch){
  const c = FoodCoach.chatLoad(); if(!c || !c.msgs.length) return null;
  const today = todayKey(), out = [], api = logQCh(ch);
  c.msgs.forEach(x => {
    if(!x.fc){ if(x.text) out.push({ who: x.who === 'me' ? 'me' : 'bot', text: x.text, ...(x.first ? { first: true } : {}), ...(/^[a-z]{2,12}$/.test(x.by || '') ? { by: x.by } : {}) }); return; }
    if(x.fc.at !== today) return;
    const m = { id: uid(), items: logQRebuild(x.fc.items), mk: x.fc.mk, state: x.fc.state === 'logged' ? 'logged' : 'ready', at: x.fc.at, fixOf: null, added: x.fc.added };
    const off = () => !logQCanAdd(m), card = { cid: uid(), body: '', actions: [{ label: t('add'), primary: true, off, run: () => logQLogAll(m) }, { label: t('logQAddSave'), off, run: () => logQNameAsk(m) }] };
    FC[m.id] = { m, card, ch: api };
    if(m.state === 'logged' && m.added){ const u = logQUndoOf(m, m.added); m.undo = u; card.done = x.done || ''; card.undo = u; }
    else if(m.state === 'logged') card.done = x.done || '';
    card.body = fcHtml(m); out.push({ who: 'bot', cards: [card] }); logQPrev = m;
  });
  return out.length ? out : null;
}
// "what should I eat?" in Food Coach: Fill My Macros, shown as the same greyed suggestion cards (and on Today)
// every word (4+ letters) of a built-in food's English or Greek name, minus words gym talk shares; built once
let FOODW = null; const FOODW_NOT = new Set(['press', 'plate', 'bench', 'rows', 'squat', 'curl', 'with', 'without', 'free', 'light', 'heavy', 'cooked', 'grilled', 'fried', 'boiled', 'raw', 'whole', 'mixed', 'plain']);
const foodWords = () => FOODW || (FOODW = new Set(GEN.flatMap(g => [g.en, g.el, g.alias].filter(Boolean).flatMap(s => norm(String(s)).split(' '))).filter(x => x.length >= 4 && !FOODW_NOT.has(x))));
// meals: ideas that came in the answer already (no request); null = this message's one request is spent and brought none (a short reply, no
// second request); undefined = ask for them now (the one request of a clear "what should I eat?")
async function logQSuggest(ch, reply, meals){
  if(!targetFor(curDay)){ ch.say(t('planNeedTargets')); return; }
  if(meals === null){ ch.say(reply || t('logQSuggSpent')); return; }
  let r; const day = curDay;
  if(meals){ try{ r = planKeep({ meals: meals.map(m => ({ ...m, items: (m.items || []).map(it => ({ ...it, from: it.from || 'foods' })) })), tip: '' }); }catch(e){ ch.say(reply || t('logQSuggSpent')); return; } }
  else r = planKeep(await ch.ask(planPrompt(), null, { task: 'food-suggest', deadlineMs: 25000, timeoutMs: 15000 }));
  ch.say(reply || t('logQSugg'));
  const cards = ch.cards(r.meals.map(m => ({ body: `<div class="eatrow sugg">${planRowHtml(m)}</div>`, dim: true,
    actions: [{ label: t('add'), primary: true, run: () => planAddMeal(day, m) }] })));
  cards.forEach((card, i) => PLANCH.push({ m: r.meals[i], card, ch }));
}
// what Add teaches: an amount the AI guessed and you changed, a food you swapped, or a food you corrected in the chat
function logQLearn(m, it, r){
  const guessed = it.qty == null && it.g0 > 0, moved = guessed && Math.abs(r.g - it.g0) > Math.max(10, it.g0 * .15);
  const before = m.fixOf && m.fixOf.items.find(p => logQKey(p.text || p.name) === logQKey(it.text || it.name) && p.st);
  const pr = before ? lwCalc(before.st) : null, chat = pr && (Math.abs(pr.g - r.g) > Math.max(10, pr.g * .1) || Math.abs(pr.kcal - r.kcal) > Math.max(30, pr.kcal * .1));
  if(!moved && !it.swapped && !chat) return;
  const per = it.g0 > 0 && it.st ? r.kcal / r.g : 0;
  logQFixNote(it, { g: r.g, kcal: r.kcal, aiG: chat ? pr.g : moved ? it.g0 : null, aiKcal: chat ? pr.kcal : moved && per ? it.g0 * per : null, to: it.swapped ? it.st.info.name : null });
}
// Add & Save: the foods on the card also become one meal in the library (AI estimates too), so the same plate is one tap next time.
// Each food is already in My Foods (saved on Add, logQSaveTmp); the meal keeps them together with these amounts. A meal on the card adds its own ingredients.
const logQAutoName = infos => { const n = infos.map(i => bareName(i.name)); return (n.slice(0, 3).join(' + ') + (n.length > 3 ? ' +' + (n.length - 3) : '')).slice(0, 60); };
// Add & Save: first the name YOU use for this plate (the card shows a name box); the meal keeps both names, so the AI learns that yours means this
function logQNameAsk(m){
  if(m.state === 'logged') return;
  if(!m.meal && m.items.some(it => it.busy)){ toast(t('logQFind')); return; }
  if(!m.meal && !m.items.some(it => it.st)){ toast(t('logQNothing')); return; }
  m.naming = true; logQRedraw(m);
  setTimeout(() => { const i = document.querySelector(`#coachList [data-mid="${m.id}"] [data-qname]`); if(i){ try{ i.focus(); }catch(e){} } }, 30);
}
function logQNameOk(m){
  const name = String(m.mname || '').trim().slice(0, 60);
  if(!name){ toast(t('needMealName')); const i = document.querySelector(`#coachList [data-mid="${m.id}"] [data-qname]`); if(i) i.focus(); return; }
  m.naming = false; logQLogAll(m, name);
}
function logQSaveMeal(rows, name){
  const ings = [];
  rows.forEach(({ info, g }) => {
    if(info.food){ ings.push({ ref: { ...foods_ref(info.food), per: info.per }, grams: r1(g) }); return; }
    const ml = info.meal, f = ml && ml.cookedWeight > 0 ? g / ml.cookedWeight : 0;
    if(f && (ml.ingredients || []).length) ml.ingredients.forEach(i => ings.push({ ref: i.ref, grams: r1(i.grams * f) }));
  });
  if(!ings.length) return null;
  const tot = mealTotals(ings), w = tot.raw; if(!(w > 0)) return null;
  const aiName = logQAutoName(rows.map(r => r.info));
  const k = 100 / w, now = new Date().toISOString();
  const m = { id: uid(), createdAt: now, cookedAt: now, timesCooked: 1, name, aiName, ingredients: ings, rawWeight: Math.round(w), cookedWeight: Math.round(w), cookedEstimated: true, quick: true, via: 'coach',
    kcal: Math.round(tot.kcal * k), protein: r1(tot.protein * k), carbs: r1(tot.carbs * k), fat: r1(tot.fat * k), fiber: r1(tot.fib * k), salt: Math.round(tot.na * k / 400 * 100) / 100, potassium: Math.round(tot.k * k),
    total: { kcal: Math.round(tot.kcal), protein: r1(tot.protein), carbs: r1(tot.carbs), fat: r1(tot.fat) }, recipe: null, updatedAt: now };
  meals.push(m); if(!saveMeals()){ meals.pop(); return null; }
  return m;
}
function logQLogAll(m, keep){   // keep: the meal name for Add & Save
  if(m.meal) return mealLog(m, keep);   // a complex meal: one Eaten entry (js/meal.js)
  const x = FC[m.id]; if(!x || m.state === 'logged') return;
  if(m.items.some(it => it.busy)){ toast(t('logQFind')); return; }
  if(!logQCanAdd(m)){ toast(t(m.items.length ? 'logQPickRows' : 'logQNothing')); return; }   // never a silent skip
  const fx = m.fixOf; if(fx && fx.state === 'logged' && fx.undo) fx.undo();   // a correction replaces the list it corrects
  const day = m.day || curDay, tm = daysUntil(day) === 0 ? nowHM() : '13:00', added = [], rows = [];   // 0.8: "yesterday" in the message = yesterday
  m.items.forEach(it => { const st = it.st, r = lwCalc(st); if(!(r.g > 0)) return;
    let info = st.info;
    if(info.gen) info = fInfo_(saveGeneric(info.gen));
    if(info.tmp) info = fInfo_(logQSaveTmp(info.tmp));   // an AI estimate / web value becomes a food in My Foods only now, when you add it
    if(info !== st.info){ st.info = info; st.ref = lwRef(info); }
    info = { ...info, per: lwPer(st) };
    logEntry(day, info, r.g, tm); const l = dayLog[day]; added.push(l[l.length - 1]); rows.push({ info, g: r.g });
    logQLearn(m, it, r);
    const mk = logQMemKey(it); if(mk) logPhr[mk] = { ref: st.ref, g: Math.round(r.g), at: Date.now() };   // confirmed: these words mean this food next time
    const key = info.meal ? { mealId: info.meal.id } : { foodId: info.food.id };   // same as logging it in Log Food: it comes out of the fridge
    try{ if(key.foodId ? stockOf(key.foodId) > 0 : mealStock(key.mealId) > 0) takeFromFridge(key, r.g); }catch(e){}
  });
  if(!added.length){ toast(t('needAmount')); return; }
  const memo = logQSer(m).map(p => ({ ...p, tmp: null, assumed: '', doubt: false }));
  const mkey = !m.fixOf ? m.mk : fx && fx.mk;   // a correction: the first message now gives the corrected list next time
  if(mkey){ delete logPhr[mkey]; logPhr[mkey] = memo; }   // re-inserted, so the newest are last (logQTrim drops the oldest)
  logQTrim(); logQSavePhr(); logQFixSave();
  const meal = keep ? logQSaveMeal(rows, keep) : null;
  const k = Math.round(added.reduce((a, e) => a + e.kcal, 0)), msg = t('logQLogged', { n: added.length, k }) + (meal ? ' · ' + t('mealSaved', { n: meal.name }) : keep ? ' · ' + t('logQNoMeal') : '');
  m.added = { day, ids: added.map(e => e.id), meal: meal ? meal.id : null };
  const undo = logQUndoOf(m, m.added);
  m.undo = undo; m.state = 'logged'; x.card.body = fcHtml(m); x.ch.update(x.card, { done: msg, undo }); renderAll();
  toast(msg, t('undo'), undo);
}
// a found food saved to My Foods (marked as from Food Coach); the same name + values already saved by Food Coach is not saved twice
function logQSaveTmp(d){
  const key = x => [norm(x.name || ''), norm(x.brand || ''), Math.round(+x.kcal || 0), r1(+x.protein || 0), r1(+x.carbs || 0), r1(+x.fat || 0), x.unit === 'ml' ? 'ml' : 'g'].join('|');
  let f = foods.find(x => x.via === 'coach' && key(x) === key(d));
  if(!f){ f = saveOnlineFood(d); f.via = 'coach'; saveFoods(); }
  return f;
}
// undo for an added list: removes exactly the entries it added (also after an app restart: the ids are kept with the chat)
function logQUndoOf(m, a){
  let undone = false;
  return () => { if(undone) return; undone = true; const x = FC[m.id];
    const ids = new Set(a.ids || []); dayLog[a.day] = (dayLog[a.day] || []).filter(e => !ids.has(e.id)); saveLog();
    if(a.meal){ const i = meals.findIndex(z => z.id === a.meal); if(i > -1){ meals.splice(i, 1); saveMeals(); } }
    m.state = 'ready'; m.undo = null; m.added = null; if(x){ x.card.done = ''; x.card.undo = null; } renderAll(); logQRedraw(m); };
}

// wiring (called once from wire/03, where the Log Food sheet is wired): Food Coach answers with logQSend; the rows inside its cards
function logQWire(){
  // keep: a message that names a dish or a food the app knows stays with Food Coach even if it also says "gym" (no handoff; Athlete OS routing)
  Coach.setup('chef', { kind: 'chef', title: () => t('coachFood'), first: () => t('coachFoodHi'), send: logQSend,
    keep: txt => { try{ if(mealDetect(txt).dish) return true; const w = norm(txt).split(' '); return w.some(x => x.length >= 4 && foodWords().has(x)); }catch(e){ return false; } },
    persist: { load: (id, ch) => logQRestore(ch), save: (id, msgs) => msgs ? logQPersist(msgs) : FoodCoach.chatClear() } });   // Food Coach 2.0: the chat survives a restart (coach.js persist)
  const list = $('coachList');
  const msgOf = el => { const b = el.closest('[data-mid]'); const x = b && FC[b.dataset.mid]; return x ? x.m : null; };
  list.addEventListener('click', e => {
    const m = msgOf(e.target); if(!m || m.state === 'logged') return;
    if(e.target.closest('[data-qnameok]')){ Phone.haptic(); logQNameOk(m); return; }
    if(m.meal){ mealClick(e, m); return; }
    const row = e.target.closest('[data-qi]'); if(!row) return; const i = +row.dataset.qi, it = m.items[i]; if(!it || it.busy) return;
    if(e.target.closest('[data-qrm]')){ m.items.splice(i, 1); logQRedraw(m); return; }
    const focusQ = () => setTimeout(() => { const r = document.querySelector(`#coachList [data-mid="${m.id}"] [data-qi="${i}"] .lqsq`); if(r) r.focus(); }, 30);
    if(e.target.closest('[data-qopen]')){ const was = it.open; m.items.forEach(x => { x.open = false; x.swap = false; }); it.open = !was; if(it.open && !it.st){ it.swap = true; focusQ(); } logQRedraw(m); return; }
    if(e.target.closest('[data-qswap]')){ it.swap = true; logQRedraw(m); focusQ(); return; }
    const pk = e.target.closest('[data-qpick]'); if(pk){ const [src, info] = (it.sres || [])[+pk.dataset.qpick] || []; if(!info) return;
      const g = it.st ? lwCalc(it.st).g : +it.grams || 0;
      it.st = logQState(info, g > 0 ? { qty: g, unit: 'g' } : {}); it.src = src; it.swap = false; it.sq = ''; it.swapped = true; it.doubt = false; it.touched = true; it.assumed = ''; logQRedraw(m); return; }
    const st = it.st; if(!st) return;
    const dd = e.target.closest('[data-ldd]'); if(dd){ lddToggle(row, dd); return; }
    const lu = e.target.closest('[data-lu]'); if(lu){ const j = +lu.dataset.lu, g = (+st.n || 0) * st.units[st.u].size, sz = st.units[j].size;
      st.u = j; st.n = st.units[j].k === 'g' ? r1((g || 100) / sz) : Math.max(.5, Math.round((g || sz) / sz * 2) / 2);
      row.querySelector('.lan').value = fmt(st.n); row.querySelector('.ldm').classList.add('hide'); logQUpd(m, row, it); return; }
    const ck = e.target.closest('[data-lck]'); if(ck){ st.ck = +ck.dataset.lck; row.querySelectorAll('[data-lck]').forEach(b => b.classList.toggle('on', b === ck)); logQUpd(m, row, it); }
  });
  list.addEventListener('keydown', e => { if(e.key !== 'Enter' || !e.target.matches('[data-qname]') || e.isComposing) return; e.preventDefault(); const m = msgOf(e.target); if(m && m.state !== 'logged') logQNameOk(m); });
  list.addEventListener('input', e => {
    const m = msgOf(e.target), row = e.target.closest('[data-qi]');
    if(m && e.target.matches('[data-qname]')){ m.mname = e.target.value; logQKeep(m); return; }
    if(m && m.meal){ mealInput(e, m); return; }
    if(!m || !row) return; const it = m.items[+row.dataset.qi]; if(!it) return;
    if(e.target.matches('[data-qsq]')){ it.sq = e.target.value; row.querySelector('.lqsres').innerHTML = logQSwapRes(it); logQKeep(m); return; }
    if(e.target.classList.contains('lan') && it.st){ it.st.n = e.target.value; logQUpd(m, row, it); }
  });
}

// ---------- 0.7.2 month calendar: tap the date on Today's Food, tap a day to jump to it ----------
let logCalM = null;   // the month on show, 'YYYY-MM'
function logCalOpen(){ logCalM = curDay.slice(0, 7); logCalDraw(); open('ovCal'); }
function logCalShift(n){ const [y, m] = logCalM.split('-').map(Number), d = new Date(y, m - 1 + n, 1); logCalM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; logCalDraw(); }
function logCalDraw(){
  const [y, m] = logCalM.split('-').map(Number), loc = lang === 'el' ? 'el-GR' : 'en-GB', first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(), lead = (first.getDay() + 6) % 7, today = todayKey();
  const ttl = first.toLocaleDateString(loc, { month: 'long', year: 'numeric' }); $('calT').textContent = ttl.charAt(0).toUpperCase() + ttl.slice(1);
  $('calWk').innerHTML = [...Array(7)].map((_, i) => `<span>${new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday: 'narrow' })}</span>`).join('');   // 1 Jan 2024 was a Monday
  const wkDays = new Set(sessions.map(x => x.date)); let h = '<span></span>'.repeat(lead);
  for(let d = 1; d <= n; d++){ const k = `${logCalM}-${String(d).padStart(2, '0')}`, cls = [k === today ? 'today' : '', k === curDay ? 'on' : '', (dayLog[k] || []).length ? 'has' : '', wkDays.has(k) ? 'wk' : ''].join(' ');
    h += `<button type="button" class="calday ${cls}" data-cald="${k}" aria-label="${new Date(k + 'T12:00:00').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}"${k === curDay ? ' aria-current="date"' : ''}>${d}${wkDays.has(k) ? `<span class="calwkic">${svgIcon('workouts', 11, 2)}</span>` : ''}</button>`; }
  $('calDays').innerHTML = h;
  $('calNow').classList.toggle('hide', curDay === today && logCalM === today.slice(0, 7));
}
// tap a day: Food and Workout both there → ask; only one → open it; neither → Food Log
function logCalTap(k){
  const wk = sessions.filter(x => x.date === k), food = (dayLog[k] || []).length > 0;
  if(wk.length && food){ calPickDay = k; $('calPickT').textContent = new Date(k + 'T12:00:00').toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); close('ovCal'); open('ovCalPick'); }
  else if(wk.length) logCalSession(k);
  else logCalGo(k);
}
let calPickDay = '';
function logCalSession(k){
  const loc = lang === 'el' ? 'el-GR' : 'en-GB';
  $('dsBody').innerHTML = sessions.filter(x => x.date === k).map(ses => `<h2>${esc(ses.name || t('gymAny'))}</h2><p class="sub">${new Date(k + 'T12:00:00').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <div class="statgrid"><div><b>${ses.mins || 0}</b><small>${t('smDur')}</small></div><div><b>${(ses.vol || 0).toLocaleString()}</b><small>${t('smVol')}</small></div>
      <div><b>${ses.exercises.reduce((a, x) => a + x.sets.filter(st => st.done && isMainSet(st)).length, 0)}</b><small>${t('smSets')}</small></div><div><b>≈${ses.kcal || 0}</b><small>${t('smKcal')}</small></div></div>
    <h3>${t('calExercises')}</h3>` + ses.exercises.map(x => { const card = isCardio(x.exId), sets = x.sets.filter(st => st.done);
      return `<div class="dsex"><b>${esc(exName(x.exId))}</b>${sets.length ? sets.map((st, i) => `<div class="dsset"><span>${t('setLbl')} ${i + 1}${st.side ? ' · ' + st.side : ''}${st.type === 'W' ? ' · W' : st.drop ? ' · D' : ''}</span><span>${card ? `${esc(st.r)} ${t('minLbl')}${+st.w ? ' · ' + esc(st.w) + ' ' + t('kmLbl') : ''}` : `${esc(st.w)} ${t('kgLbl')} × ${esc(st.r)} ${t('repsLbl')}`}</span></div>`).join('') : `<small class="hint">${t('calNoSets')}</small>`}</div>`; }).join('')).join('');
  close('ovCal'); open('ovDaySes');
}
function logCalGo(k){ curDay = k; close('ovCal'); renderToday(); }
function logCalWire(){
  $('dLabel').addEventListener('click', logCalOpen);
  $('calPrev').addEventListener('click', () => logCalShift(-1));
  $('calNext').addEventListener('click', () => logCalShift(1));
  $('calDays').addEventListener('click', e => { const b = e.target.closest('[data-cald]'); if(b) logCalTap(b.dataset.cald); });
  $('calPickFood').addEventListener('click', () => { close('ovCalPick'); logCalGo(calPickDay); });
  $('calPickWk').addEventListener('click', () => { close('ovCalPick'); logCalSession(calPickDay); });
  $('calNow').addEventListener('click', () => logCalGo(todayKey()));
}

// ---------- 0.7.3 Log Food: the X on an added chip removes that entry (with Undo) ----------
function logChipRm(id){
  const day = Object.keys(dayLog).find(d => (dayLog[d] || []).some(e => e.id === id)); if(!day) return;
  const list = dayLog[day], i = list.findIndex(e => e.id === id), e = list[i], j = LW.added.findIndex(x => x.id === id);
  list.splice(i, 1); if(j > -1) LW.added.splice(j, 1); saveLog(); lwChips(); renderAll();
  toast(t('removedItem', { n: bareName(e.name) }), t('undo'), () => { (dayLog[day] = dayLog[day] || []).splice(i, 0, e); if(j > -1) LW.added.splice(j, 0, e); saveLog(); lwChips(); renderAll(); });
}

// ---------- Log Food sheet wiring (0.7.4.3: the pill beside Log Food is now the Food Coach pill, js/coach.js) ----------
function logFabWire(){
  $('ovLog').querySelector('.lwback').addEventListener('click', goBack);
  $('lAdded').addEventListener('click', e => { const x = e.target.closest('[data-chiprm]'); if(x){ e.stopPropagation(); logChipRm(x.dataset.chiprm); } });
}
