// Today's food: daily log, targets, macros, plan my day, quick add, weigh-in. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function infoOfEntry(e){
  if(e.kind === 'meal'){ const m = meals.find(x => x.id === e.refId); return m ? { name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null } : null; }
  const f = foods.find(x => x.id === e.refId); return f ? { name: foodName(f), icon: iconOf(f) || '', unit: f.unit, per: f, food: f, piece: f.pieces !== 'none' ? (f.piece || f.serving || null) : null, pw: f.pieces } : null;
}

function dayInfo(d){
  if(days[d]) return days[d];
  const pl = planFor(d); if(pl) return { ...pl, guessed: true };   // your weekly gym plan comes first
  const wk = days[addDays(d, -7)];   // same weekday last week is a good guess for a gym schedule
  return wk ? { type: wk.type, work: wk.work, time: wk.time, guessed: true } : { type: 'rest' };
}

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
function renderPlan(){
  const p = plans[curDay], el = $('planShow');
  if(!p || !(p.meals || []).some(m => !m.logged)){ el.innerHTML = ''; return; }   // 0.6.5.2: eaten plan meals move into Eaten
  el.innerHTML = `<h3 class="sect"><span>${t('planT')} ${AI.badge()}</span><button class="linkbtn" id="dropPlan">${t('dropPlan')}</button></h3>` +
    (p.meals || []).map((m, i) => m.logged ? '' : `<div class="planmeal planned"><div class="row"><b>${esc(m.time || '')} · ${esc(m.title || '')}</b><span class="rmeta">${Math.round(m.kcal || 0)} kcal</span></div>
      <div class="rmeta">P ${fmt(m.protein)} · C ${fmt(m.carbs)} · F ${fmt(m.fat)}</div>
      <ul>${(m.items || []).map(it => `<li>${esc(it.name)} — ${r1(it.grams || 0)} g ${it.from === 'fridge' ? `<span class="src-f">${svgIcon('snow', 14, 2)} ${t('logPlanFridge')}</span>` : ''}</li>`).join('')}</ul>
      ${m.why ? `<div class="hint">${esc(m.why)}</div>` : ''}
      <div class="actions" style="margin-top:8px"><button class="btn small primary" data-plog="${i}">${t('ateBtn')}</button></div></div>`).join('') +
    (p.tip ? `<p class="hint">${esc(p.tip)}</p>` : '');
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
// single units for foods where they make sense (v2 #4): the number goes in the box beside the unit
const LW_UNITS = [
  [/\begg(s)?\b/, [['Small Egg', 'Μικρό αυγό', 43], ['Medium Egg', 'Μεσαίο αυγό', 50], ['Large Egg', 'Μεγάλο αυγό', 58]]],
  [/\b(fries|chips|french fr)/, [['Small Portion', 'Μικρή μερίδα', 80], ['Medium Portion', 'Μεσαία μερίδα', 120], ['Large Portion', 'Μεγάλη μερίδα', 160]]],
  [/chicken breast|στήθος κοτ/, [['Breast', 'Στήθος', 170]]],
  [/yogh?urt|γιαούρτ/, [['Pot', 'Κεσεδάκι', 170]]],
  [/\b(rice|oats|cereal|milk)\b|ρύζι|γάλα/, [['Cup', 'Φλιτζάνι', 158]]],
  [/\boil\b|λάδι/, [['Tbsp', 'Κ. σούπας', 13.5], ['Tsp', 'Κ. γλυκού', 4.5]]] ];
// the cooking slider (v1 + v2 #1/#3): three ways of cooking with their own values per 100 g; Title Case labels, no text above
const LW_COOK = [
  [/scrambled egg|eggs? scrambled|ομελέτα|αυγά χτυπητά/, 1, [['With Butter / Oil', 'Με βούτυρο / λάδι', 212, 13.8, 2, 16.5], ['Little Oil', 'Λίγο λάδι', 170, 13, 1.5, 12], ['No Fat', 'Χωρίς λιπαρά', 140, 12.6, 1.1, 9.5]]],
  [/\b(french )?fries\b|\bchips\b|πατάτες τηγαν/, 2, [['Deep Fried', 'Τηγανητές', 312, 3.4, 41, 15], ['Pan / Oven', 'Τηγάνι / φούρνος', 200, 3.2, 33, 6.5], ['Air Fried', 'Air fryer', 150, 3, 30, 2.5]]],
  [/chicken breast|στήθος κοτ/, 2, [['Fried', 'Τηγανητό', 222, 30, 2, 10], ['Pan, Little Oil', 'Τηγάνι, λίγο λάδι', 187, 31, 0, 6.5], ['Grilled / No Oil', 'Ψητό / χωρίς λάδι', 165, 31, 0, 3.6]]] ];
const lwL = a => lang === 'el' ? a[1] : a[0];
function lwInfo(k, i){
  const mInfo = m => ({ name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null });
  if(k === 'rc') return infoOfEntry(LS.recent[i]);
  if(k === 'ml') return mInfo(LS.meals[i]);
  if(k === 'm') return fInfo_(LS.mine[i]);
  if(k === 's'){ const g = LS.std[i]; return { ...fInfo_({ ...g, unit: g.unit }), name: L(g), icon: subOf(g.cat, g.sub).icon, food: null, gen: g }; }
  if(k === 'o'){ const d = LOGON.res[i]; return { name: d.name, icon: '', unit: d.unit || 'g', per: d, food: null, online: d, piece: null }; }
  return null;
}
function lwRef(info){ return info.meal ? 'm:' + info.meal.id : info.food ? 'f:' + info.food.id : info.gen ? 'g:' + info.gen.gid : info.online ? 'o:' + (info.online.barcode || info.name) : 'n:' + info.name; }
function lwUnits(info){
  const u = [], name = norm(info.name || ''), f = info.food || info.gen;
  const hint = LW_UNITS.find(([re]) => re.test(name)); if(hint && info.unit !== 'ml') hint[1].forEach(x => u.push({ k: 'h' + x[2], l: lwL(x), size: x[2] }));
  if(!hint && info.piece && info.pw) u.push({ k: 'pc', l: info.pw === 'slice' ? t('logUSlice') : t('logUPiece'), size: info.piece });
  if(f && f.usualPack && f.usualPack <= 1000 && f.usualPack !== info.piece) u.push({ k: 'pack', l: t('logUPack'), size: f.usualPack });
  if(info.meal && info.meal.cookedWeight && (info.meal.quick || (info.meal.recipe && info.meal.recipe.servings === 1))) u.push({ k: 'plate', l: t('logUPlate'), size: Math.round(info.meal.cookedWeight) });
  u.push(info.unit !== 'ml' && UN().f === 'oz' ? { k: 'g', l: t('logUOz'), size: OZ } : { k: 'g', l: info.unit === 'ml' ? t('logUMl') : t('logUG'), size: 1 });
  return u;
}
function lwState(k, i){
  const key = k + i; if(LW.rows[key]) return LW.rows[key];
  const info = lwInfo(k, i); if(!info) return null;
  const ref = lwRef(info), units = lwUnits(info), name = norm(info.name || ''), cook = LW_COOK.find(([re]) => re.test(name));
  const pick = (ui.logUnit || {})[ref], last = info.meal || info.food ? lastEntryOf((info.meal || info.food).id) : (k === 'rc' ? LS.recent[i] : null);
  // v2 #5: grams by default, always grams once you've logged this food in grams; otherwise it opens on your last pick ("2 Medium Eggs")
  let u = units.length - 1, n = r1((last ? last.amt : 100) / units[units.length - 1].size);
  if(pick && pick !== 'g'){ const j = units.findIndex(x => x.k === pick); if(j > -1){ u = j; n = last ? Math.max(.5, Math.round(last.amt / units[j].size * 2) / 2) : 1; } }
  if(!last && units.length > 1 && !pick && units[0].k !== 'g' && info.meal) { u = 0; n = 1; }
  const ck = cook ? ((ui.logCook || {})[ref] ?? cook[1]) : null;
  return (LW.rows[key] = { k, i, info, ref, units, u, n, cook: cook ? cook[2] : null, ck });
}
function lwPer(st){ if(!st.cook) return st.info.per; const c = st.cook[st.ck]; return { ...st.info.per, kcal: c[2], protein: c[3], carbs: c[4], fat: c[5] }; }
function lwCalc(st){ const g = (+st.n || 0) * st.units[st.u].size; return { g, ...macrosFor(lwPer(st), g) }; }
function lwSub(st){ const r = lwCalc(st), un = st.units[st.u], n = +st.n || 0;
  const amt = un.k === 'g' ? fmtSize(r.g, st.info.unit) : `${fmt(n)} ${n === 1 || lang === 'el' || /sp$/.test(un.l) ? un.l : un.l + 's'} · ${fmtSize(r.g, st.info.unit)}`;
  return `${amt} · ${r.kcal} kcal`; }
function lwRow(k, i){ const st = lwState(k, i); if(!st) return ''; const open = LW.open === k + i;
  return `<div class="lrow ${open ? 'open' : ''}" data-k="${k}" data-i="${i}"><div class="lrh"><button class="lrn" type="button" data-lopen><span class="nm">${esc(st.info.name)}</span><small class="ls">${esc(lwSub(st))}</small></button>
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
    h += `<button class="lmore" id="lTakeaway" type="button"><span>${t('logQOpen', { q: esc(q) })} ${AI.badge()}</span><small>${t('logQOpenSub')}</small></button>`;
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
  if(info.meal) [250, 350, 450].forEach(g => chips.push([g, `${g} g`]));
  if(!info.meal && !(info.piece && info.pw)) (info.unit === 'ml' ? [100, 200, 250, 500] : [50, 100, 150, 200]).forEach(g => chips.push([g, fmtSize(g, info.unit)]));
  if(o.mode === 'use') chips.push([o.item.qty, `${t('logAll')} · ${fmtSize(o.item.qty, info.unit)}`]);
  $('amQuick').innerHTML = chips.map(([v, l]) => `<button data-v="${r1(v)}">${esc(l)}</button>`).join('');
  $('amAmt').value = o.mode === 'editlog' ? o.entry.amt : '';
  $('amTime').value = o.mode === 'editlog' ? o.entry.time : (o.time || nowHM());
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
    if(last && !$('amAmt').value){ $('amAmt').value = last.amt; amUnits(o); amRes(); }   // your usual amount, in the unit it fits
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
  if(info.piece && info.pw) u.push({ k: 'pc', size: info.piece, l: WS(info.pw) });
  if(f && f.usualPack && f.usualPack !== info.piece) u.push({ k: 'pack', size: f.usualPack, l: t('uPacks') });
  if(info.meal && info.meal.cookedWeight && (info.meal.quick || (info.meal.recipe && info.meal.recipe.servings === 1))) u.push({ k: 'plate', size: Math.round(info.meal.cookedWeight), l: t('uPlates') });
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
  if(!settings.geminiKey){ $('qaOut').textContent = t('qaNoKey'); return; }
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
function renderToday(){
  const d = curDay, di = dayInfo(d), tg = targetFor(d), tot = dayTotals(d), entries = (dayLog[d] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const diff = daysUntil(d);
  $('dLabel').textContent =   // 0.6.3: just the date
    new Date(d + 'T12:00:00').toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  setSeg('#dType', di.type); $('gymBox').classList.toggle('hide', di.type !== 'gym'); setSeg('#dWork', di.work || ''); $('dTime').value = di.time || '';
  // hero bars (0.6.8.2): slim, fully round; "112 / 160 g" sits inside at the right end; where the fill reaches the letters they flip colour (two text layers, one clipped to the fill)
  const mrow = (cls, label, a, b, u, st) => { const w = b ? Math.min(100, a / b * 100) : 0, txt = `<b>${Math.round(a)}</b> / ${b ? Math.round(b) : '–'}${u.trim()}`;
    return `<div class="mrow hero ${cls} ${st || ''}"><small>${label}</small><span class="hbar"><i style="width:${w}%"></i><em>${txt}</em><em class="inv" style="clip-path:inset(0 ${100 - w}% 0 0)">${txt}</em></span></div>`; };
  const usedUp = !!tg && Math.round(tot.kcal) >= tg.k, ms = k => tg ? macroState(k, { p: tot.p, c: tot.c, f: tot.f }[k], tg[k], usedUp) : '';
  const pill = `<span class="daypill">${t(di.type === 'gym' ? 'gymDay' : 'restDay')}</span>`;
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
      <div class="tm">${w.k === 'other' ? t('logRestDay') : t(w.k)}<small>${w.a !== null ? fromMin(w.a) + '–' + fromMin(w.b + 1) : ''}</small></div>
      <div class="bd">${w.gym ? t(di.work === 'legs' ? 'wLegs' : di.work === 'full' ? 'wFull' : di.work === 'cardio' ? 'wCardio' : 'wUpper') : `${t('winCarbs', { a: Math.round(eatenIn(w)), b: Math.round(w.c) })}${n ? ` · ${t(n === 1 ? 'logTMeal' : 'logTMeals', { n })}` : ''}`}${ml ? `<span class="na">${t('logTWater', { n: ml })}</span>` : ''}</div></div>`; }).join('');
  // log
  // Eaten rows (0.6.9): name + Cooked / Raw / Ready tag; under it P · C · F then the grams; calories bold italic on the right.
  // The time shows only when you tap the row (the edit sheet).
  const stOf = e => { if(e.kind !== 'food') return ''; const f = foods.find(x => x.id === e.refId); return f ? f.state : ''; };
  $('dLog').innerHTML = entries.length ? entries.map(e => `<div class="card eatrow" data-eid="${e.id}"><div class="et"><span class="name"><span class="nmt">${esc(bareName(e.name))}</span>${stTag(stOf(e))}${logQEstTag(e)}</span><small class="esub"><b class="p">P ${fmt(e.p)}</b> · <b class="c">C ${fmt(e.c)}</b> · <b class="f">F ${fmt(e.f)}</b> · <span class="eamt">${fmtSize(e.amt, e.unit)}</span></small></div><span class="ekc">${Math.round(e.kcal)}<small>kcal</small></span></div>`).join('')
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

function openTargets(){
  const tg = targets || { goal: 'bulk', bw: '', gym: {}, rest: {} };
  setSeg('#tgGoal', tg.goal || 'bulk'); TG.goal = tg.goal || 'bulk'; $('tgBw').value = latestWeight() || tg.bw || ''; $('tgFib').value = '';
  $('tgCalcHint').textContent = $('tgBw').value ? t('calcFrom', { w: fmt(+$('tgBw').value) }) : t('calcNeedW');
  [['G', tg.gym || {}], ['R', tg.rest || {}]].forEach(([p, o]) => ['k', 'p', 'c', 'f'].forEach(x => $('tg' + p + x).value = o[x] ?? ''));
  tgCheck(); open('ovTargets');
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
  hideTip(); const p = document.createElement('div'); p.className = 'tippop'; p.id = 'tipPop'; p.setAttribute('role', 'tooltip'); p.textContent = t(key); document.body.appendChild(p);
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
// plan my day runs from the Log food sheet; progress shows on Today where the plan lands
function planStat(txt){ const el = $('planShow'); el.innerHTML = `<div class="planstat"><span class="hint">${esc(txt)} ${AI.badge()}</span><button class="linkbtn" id="planCancel">${t('cancel')}</button></div>`; }

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
// when a food can't be found). Each item is matched: what you typed before → your foods / meals → the built-in list → online
// (USDA + Open Food Facts). Not found anywhere → saved as a new food (kcal/P/C/F only, "estimate" tag) when you tap Add.
// Rows reuse the Log Food row: units, your egg size and the cooking slider follow your Log Food settings.
let logPhr = Store.load('logPhr', {});   // 'p:<typed words>' → { f: foodId } | { m: mealId };  'm:<whole message>' → the AI's split
const logQSavePhr = () => Store.save('logPhr', logPhr);
function logQEstTag(e){ if(e.kind !== 'food') return ''; const f = foods.find(x => x.id === e.refId); return f && f.source === 'estimate' ? `<span class="sttag est">${t('logQEst')}</span>` : ''; }

// the typed words for one food, without amounts: "Fage yogurt 200g" → "fage yogurt"
const logQDrop = new Set('g gr gram grams kg ml l lt cup cups tbsp tsp piece pieces pc pcs slice slices serving servings portion portions plate plates one two three four five six half a an of x γρ γραμμαρια τεμ τεμαχια φετα φετεσ μεριδα μεριδεσ ενα ενασ μια δυο τρια τρεισ τεσσερα τεσσερισ μιση μισο'.split(' '));
function logQKey(s){ return norm(s).replace(/(\d)([^\d\s.,])/gu, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(w => w && !/^\d/.test(w) && !logQDrop.has(w)).join(' '); }

const logQMealInfo = m => ({ name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null });
const logQGenInfo = g => ({ ...fInfo_({ ...g, unit: g.unit }), name: L(g), icon: subOf(g.cat, g.sub).icon, food: null, gen: g });
function logQFromRef(r){
  if(!r) return null;
  if(r.m){ const m = meals.find(x => x.id === r.m); return m ? { info: logQMealInfo(m), src: 'meal' } : null; }
  if(r.f){ const f = foods.find(x => x.id === r.f); return f ? { info: fInfo_(f), src: f.source === 'estimate' ? 'est' : 'mine' } : null; }
  return null;
}

// the AI: split only (plus a fallback estimate per 100 g)
function logQPrompt(txt){
  return `Split this note of what someone ate into separate food items. Text: """${txt}"""
Rules:
- One item per food. "granola and nuts 200ml milk" is two items (granola with nuts; milk). Keep every food; never merge or skip one.
- text: the words for that item as written, without the amount.
- qty + unit: the amount as written; unit is one of g, ml, kg, l, piece, slice, cup, tbsp, tsp, serving. Counted things ("4 eggs", "a banana") are piece. qty null when no amount is written.
- name: short plain food name in ${lang === 'el' ? 'Greek' : 'English'}, with how it was cooked when that is said ("scrambled eggs"), without the brand. name_en: the same name in English. brand: the brand or restaurant, "" if none.
- grams: your best guess of the whole amount eaten, in grams (ml for drinks). ml: true for drinks.
- kcal, protein, carbs, fat: typical values PER 100 g (or 100 ml) of this food as eaten.
Return ONLY JSON: {"items":[{"text":string,"name":string,"name_en":string,"brand":string,"qty":number|null,"unit":string|null,"grams":number,"ml":boolean,"kcal":number,"protein":number,"carbs":number,"fat":number}]}`;
}
function logQClean(a){
  if(!Array.isArray(a)) return null;
  const n = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v;
  return a.filter(x => x && (x.name || x.text)).slice(0, 25).map(x => ({ text: String(x.text || x.name).slice(0, 80), name: String(x.name || x.text).slice(0, 60), name_en: String(x.name_en || x.name || '').slice(0, 60),
    brand: String(x.brand || '').slice(0, 40), qty: n(x.qty) > 0 ? n(x.qty) : null, unit: x.unit ? String(x.unit) : null, grams: n(x.grams) > 0 ? n(x.grams) : null, ml: !!x.ml,
    kcal: n(x.kcal) !== null && n(x.kcal) >= 0 ? n(x.kcal) : null, protein: Math.max(0, n(x.protein) || 0), carbs: Math.max(0, n(x.carbs) || 0), fat: Math.max(0, n(x.fat) || 0) }));
}
// without a key (or when the AI fails): split at commas, "and", "+", new lines; the recipe reader finds the amounts
function logQSplit(txt){
  return txt.split(/\s*(?:[,;\n+]|\band\b|\s(?:και|κ\.)\s)\s*/i).map(s => s.trim()).filter(s => s.length > 1).slice(0, 25).map(s => {
    const p = parseIngLine(s) || {}, name = p.name || cleanName(s);
    return { text: s, name, name_en: name, brand: '', qty: p.count || p.grams || null, unit: p.count ? 'piece' : p.grams ? 'g' : null, grams: p.grams || null, ml: false, kcal: null, protein: 0, carbs: 0, fat: 0 }; });
}

// one item → a Log Food row state (amount + unit + cooking), from what was typed
function logQState(info, it){
  const ref = lwRef(info), units = lwUnits(info), cook = LW_COOK.find(([re]) => re.test(norm(info.name || '')));
  const gi = units.length - 1, qty = +it.qty || 0, un = norm(it.unit || ''), pick = (ui.logUnit || {})[ref];
  const mk = (u, n) => ({ k: 'q', i: 0, info, ref, units, u, n, cook: cook ? cook[2] : null, ck: cook ? ((ui.logCook || {})[ref] ?? cook[1]) : null });
  let g = 0;
  if(qty && /^(g|gr|gram|kg|ml|l$|lt|lit|oz|γρ)/.test(un)) g = qty * (/^(kg|l$|lt|lit)/.test(un) ? 1000 : /^oz/.test(un) ? OZ : 1);
  else if(qty){
    const want = /cup|φλιτζ/.test(un) ? 'h158' : /tbsp|tablesp|σουπ/.test(un) ? 'h13.5' : /tsp|teasp|γλυκ/.test(un) ? 'h4.5' : null;
    let j = -1;
    if(want) j = units.findIndex(x => x.k === want);
    else if(/serv|portion|plate|μεριδ|πιατ/.test(un)) j = units.findIndex(x => x.k === 'plate');
    else if(/slice|φετ/.test(un)) j = info.pw === 'slice' ? units.findIndex(x => x.k === 'pc') : -1;
    else {   // a count: "4 eggs", "a yogurt"; the unit you last picked in Log Food (your egg size) wins
      j = units.findIndex(x => x.k === pick && x.k !== 'g');
      if(j < 0 && units.some(x => x.k === 'h50')){ const egg = Object.values(ui.logUnit || {}).filter(k => ['h43', 'h50', 'h58'].includes(k)).pop(); j = units.findIndex(x => x.k === (egg || 'h50')); }
      if(j < 0) j = units.findIndex(x => /^h/.test(x.k));
      if(j < 0) j = units.findIndex(x => x.k === 'pc' || x.k === 'plate' || x.k === 'pack'); }
    if(j > -1) return mk(j, qty);
    g = +it.grams || 0;
  } else { const last = info.meal || info.food ? lastEntryOf((info.meal || info.food).id) : null; g = last ? last.amt : +it.grams || 0; }
  if(!(g > 0)) g = 100;
  return mk(gi, r1(g / units[gi].size));
}
function logQSet(it, info, src){ it.src = src; it.st = logQState(info, it); }

async function logQMatch(it){
  const mem = logQFromRef(logPhr['p:' + logQKey(it.text || it.name)]) || (it.name_en ? logQFromRef(logPhr['p:' + logQKey(it.name_en)]) : null);
  if(mem) return logQSet(it, mem.info, mem.src);
  const nm = it.name || it.text, en = it.name_en || nm, br = (it.brand || '').trim(), nb = norm(br);
  // a food of yours with another brand isn't the one you typed ("Fage yogurt" ≠ your Olympus yogurt)
  const brandOk = f => !br || !f.brand || norm(f.brand).includes(nb.split(' ')[0]) || nb.includes(norm(f.brand).split(' ')[0]);
  for(const q of [...new Set([br && `${br} ${nm}`, br && `${br} ${en}`, nm, en].filter(Boolean))]){
    const s = searchLocal(q, false, { log: true, meals: true });
    const f = s.mine.find(brandOk); if(f) return logQSet(it, fInfo_(f), f.source === 'estimate' ? 'est' : 'mine');
    if(!br && s.meals[0]) return logQSet(it, logQMealInfo(s.meals[0]), 'meal');
  }
  for(const q of [...new Set([nm, en])]){ const s = searchLocal(q, false, { log: true }); if(s.std[0]) return logQSet(it, logQGenInfo(s.std[0]), 'std'); }
  try{
    const res = await Promise.race([searchOnlineAll(br ? `${br} ${en}` : en), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 15000))]);
    const d = (res || []).find(x => !x.check && +x.kcal > 0);
    if(d) return logQSet(it, { name: d.name, icon: '', unit: d.unit || 'g', per: d, food: null, online: d, piece: null }, 'onl');
  }catch(e){}
  if(it.kcal !== null && it.kcal !== undefined){ const nmC = nm.charAt(0).toUpperCase() + nm.slice(1);
    return logQSet(it, { name: nmC, icon: '', unit: it.ml ? 'ml' : 'g', per: { kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat }, food: null, est: { brand: br, en }, piece: null }, 'est'); }
  it.st = null; it.src = 'none';
}

// ---- 0.7.4.3 Food Coach (was Quick Log): the shared coach chat (js/coach.js) with the chef robot ----
// Each answer is one card: the foods it understood as a compact list (tap a row to change the amount, unit or food; X removes it)
// with the total underneath, and ONE Add button that logs every food on the list.
const FC = {};   // answer id → { m, card, ch }
const fcHtml = m => `<div class="fcwrap" data-mid="${m.id}">${logQCardHtml(m)}</div>`;
function logQRedraw(m){ const x = FC[m.id]; if(x) x.ch.update(x.card, { body: fcHtml(m) }); }
function logQKeep(m){ const x = FC[m.id]; if(x) x.card.body = fcHtml(m); }   // after an in-place change: the next redraw shows the same thing
function logQTot(m){ return m.items.filter(it => it.st && !it.busy).reduce((a, it) => { const r = lwCalc(it.st); return { kcal: a.kcal + r.kcal, p: a.p + r.p, c: a.c + r.c, f: a.f + r.f }; }, { kcal: 0, p: 0, c: 0, f: 0 }); }
function logQCardHtml(m){
  const tot = logQTot(m), done = m.state === 'logged';
  const foot = done ? '' : `<div class="lqfoot"><div class="lres"><span class="lk">${Math.round(tot.kcal)} kcal</span><span class="lm"><b class="p">P ${fmt(tot.p)}</b> · <b class="c">C ${fmt(tot.c)}</b> · <b class="f">F ${fmt(tot.f)}</b></span></div></div>`;
  return `<div class="lqcard ${done ? 'logged' : ''}">${m.items.map((it, i) => logQRowHtml(m, it, i)).join('')}${foot}</div>`;
}
function logQRowHtml(m, it, i){
  const tag = { std: t('logQStd'), onl: t('logQOnl'), est: t('logQEst') }[it.src], done = m.state === 'logged';
  const nm = it.st ? it.st.info.name : (it.name || it.text), sub = it.busy ? t('logQFind') : it.st ? lwSub(it.st) : t('logQNone');
  return `<div class="lqrow ${it.open && !done ? 'open' : ''} ${it.busy ? 'busy' : ''} ${!it.busy && !it.st ? 'miss' : ''}" data-qi="${i}">
    <div class="lrh"><button class="lrn" type="button" data-qopen ${done || it.busy ? 'disabled' : ''}><span class="nm">${esc(bareName(nm))}${tag ? ` <span class="sttag lq ${it.src}">${tag}</span>` : ''}</span><small class="ls">${esc(sub)}</small></button>
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
// typing an amount / changing the unit or cooking: only that row and the card's total change
function logQUpd(m, row, it){
  lwUpdate(row, it.st);
  const card = row.closest('.lqcard'), tot = logQTot(m), k = card && card.querySelector('.lqfoot .lk'), mm = card && card.querySelector('.lqfoot .lm');
  if(k) k.textContent = Math.round(tot.kcal) + ' kcal';
  if(mm) mm.innerHTML = `<b class="p">P ${fmt(tot.p)}</b> · <b class="c">C ${fmt(tot.c)}</b> · <b class="f">F ${fmt(tot.f)}</b>`;
  logQKeep(m);
}

// ---- open, answer, add ----
// opens Food Coach; q = words to put in the box (from Log Food's "nothing matches" row)
function logQOpenSheet(q){
  Coach.open('chef');
  if(q){ const ta = $('coachIn'); ta.value = q; ta.dispatchEvent(new Event('input')); setTimeout(() => { try{ ta.focus(); }catch(e){} }, 120); }
}
function logQTrim(){ const ks = Object.keys(logPhr); if(ks.length <= 600) return; ks.filter(k => k.startsWith('m:')).slice(0, ks.length - 500).forEach(k => { delete logPhr[k]; }); }

async function logQSend(txt, ch){
  const m = { id: uid(), items: [], mk: 'm:' + norm(txt), state: 'ready' };
  let parts = Array.isArray(logPhr[m.mk]) ? logPhr[m.mk] : null, note = '';   // the same message as before: no AI at all
  if(!parts && AI.hasKey()){
    try{ parts = logQClean((await ch.ask(logQPrompt(txt)) || {}).items); if(parts && parts.length) m.parts = parts; else parts = null; }
    catch(err){ if(err.cancelled) throw err; note = t('logQAIFail', { e: err.message }); }
  }
  if(!parts) parts = logQSplit(txt);
  if(!parts.length){ ch.say(t('logQFail')); return; }
  if(note) ch.say(note);
  m.items = parts.map(p => ({ ...p, busy: true }));
  const [card] = ch.cards([{ body: '', actions: [{ label: t('add'), primary: true, run: () => logQLogAll(m) }] }]);
  FC[m.id] = { m, card, ch }; logQRedraw(m);
  await Promise.all(m.items.map(async it => { try{ await logQMatch(it); }catch(e){ it.st = null; it.src = 'none'; } it.busy = false; logQRedraw(m); }));
}

function logQEstFood(info){ const p = info.per;   // kcal / P / C / F only, tagged so it can be found and fixed later
  return saveOnlineFood({ name: info.name, brand: info.est.brand || '', hint: info.est.en || '', unit: info.unit, kcal: Math.round(p.kcal), protein: r1(p.protein), carbs: r1(p.carbs), fat: r1(p.fat), state: 'ready', source: 'estimate' }); }

function logQLogAll(m){
  const x = FC[m.id]; if(!x || m.state === 'logged') return;
  if(m.items.some(it => it.busy)){ toast(t('logQFind')); return; }
  const ok = m.items.filter(it => it.st); if(!ok.length){ toast(t('logQNothing')); return; }
  const day = curDay, tm = daysUntil(day) === 0 ? nowHM() : '13:00', added = [], made = [];
  ok.forEach(it => { const st = it.st, r = lwCalc(st); if(!(r.g > 0)) return;
    let info = st.info;
    if(info.gen) info = fInfo_(saveGeneric(info.gen));
    else if(info.online) info = fInfo_(saveOnlineFood(info.online));
    else if(info.est){ const f = logQEstFood(info); made.push(f); info = fInfo_(f); }
    info = { ...info, per: lwPer(st) };
    logEntry(day, info, r.g, tm); const l = dayLog[day]; added.push(l[l.length - 1]);
    const key = info.meal ? { mealId: info.meal.id } : { foodId: info.food.id };   // same as logging it in Log Food: it comes out of the fridge
    try{ if(key.foodId ? stockOf(key.foodId) > 0 : mealStock(key.mealId) > 0) takeFromFridge(key, r.g); }catch(e){}
    const pk = logQKey(it.text || it.name); if(pk) logPhr['p:' + pk] = info.meal ? { m: info.meal.id } : { f: info.food.id };
  });
  if(!added.length){ toast(t('needAmount')); return; }
  if(m.parts) logPhr[m.mk] = m.parts;
  logQTrim(); logQSavePhr();
  const k = Math.round(added.reduce((a, e) => a + e.kcal, 0)), msg = t('logQLogged', { n: added.length, k });
  let undone = false;
  const undo = () => { if(undone) return; undone = true;
    const ids = new Set(added.map(e => e.id)); dayLog[day] = (dayLog[day] || []).filter(e => !ids.has(e.id)); saveLog();
    made.forEach(f => { const i = foods.indexOf(f); if(i > -1) foods.splice(i, 1); }); if(made.length) saveFoods();
    m.state = 'ready'; x.card.done = ''; x.card.undo = null; renderAll(); logQRedraw(m); };
  m.state = 'logged'; x.card.body = fcHtml(m); x.ch.update(x.card, { done: msg, undo }); renderAll();
  toast(msg + (made.length ? ' · ' + t('logQNew', { n: made.length }) : ''), t('undo'), undo);
}

// wiring (called once from wire/03, where the Log Food sheet is wired): Food Coach answers with logQSend; the rows inside its cards
function logQWire(){
  Coach.setup('chef', { kind: 'chef', title: () => t('coachFood'), first: () => t('coachFoodHi'), send: logQSend });
  const list = $('coachList');
  const msgOf = el => { const b = el.closest('[data-mid]'); const x = b && FC[b.dataset.mid]; return x ? x.m : null; };
  list.addEventListener('click', e => {
    const m = msgOf(e.target); if(!m || m.state === 'logged') return;
    const row = e.target.closest('[data-qi]'); if(!row) return; const i = +row.dataset.qi, it = m.items[i]; if(!it || it.busy) return;
    if(e.target.closest('[data-qrm]')){ m.items.splice(i, 1); logQRedraw(m); return; }
    const focusQ = () => setTimeout(() => { const r = document.querySelector(`#coachList [data-mid="${m.id}"] [data-qi="${i}"] .lqsq`); if(r) r.focus(); }, 30);
    if(e.target.closest('[data-qopen]')){ const was = it.open; m.items.forEach(x => { x.open = false; x.swap = false; }); it.open = !was; if(it.open && !it.st){ it.swap = true; focusQ(); } logQRedraw(m); return; }
    if(e.target.closest('[data-qswap]')){ it.swap = true; logQRedraw(m); focusQ(); return; }
    const pk = e.target.closest('[data-qpick]'); if(pk){ const [src, info] = (it.sres || [])[+pk.dataset.qpick] || []; if(!info) return;
      const g = it.st ? lwCalc(it.st).g : +it.grams || 0;
      it.st = logQState(info, g > 0 ? { qty: g, unit: 'g' } : {}); it.src = src; it.swap = false; it.sq = ''; logQRedraw(m); return; }
    const st = it.st; if(!st) return;
    const dd = e.target.closest('[data-ldd]'); if(dd){ lddToggle(row, dd); return; }
    const lu = e.target.closest('[data-lu]'); if(lu){ const j = +lu.dataset.lu, g = (+st.n || 0) * st.units[st.u].size, sz = st.units[j].size;
      st.u = j; st.n = st.units[j].k === 'g' ? r1((g || 100) / sz) : Math.max(.5, Math.round((g || sz) / sz * 2) / 2);
      row.querySelector('.lan').value = fmt(st.n); row.querySelector('.ldm').classList.add('hide'); logQUpd(m, row, it); return; }
    const ck = e.target.closest('[data-lck]'); if(ck){ st.ck = +ck.dataset.lck; row.querySelectorAll('[data-lck]').forEach(b => b.classList.toggle('on', b === ck)); logQUpd(m, row, it); }
  });
  list.addEventListener('input', e => {
    const m = msgOf(e.target), row = e.target.closest('[data-qi]'); if(!m || !row) return; const it = m.items[+row.dataset.qi]; if(!it) return;
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
  let h = '<span></span>'.repeat(lead);
  for(let d = 1; d <= n; d++){ const k = `${logCalM}-${String(d).padStart(2, '0')}`, cls = [k === today ? 'today' : '', k === curDay ? 'on' : '', (dayLog[k] || []).length ? 'has' : ''].join(' ');
    h += `<button type="button" class="calday ${cls}" data-cald="${k}" aria-label="${new Date(k + 'T12:00:00').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}"${k === curDay ? ' aria-current="date"' : ''}>${d}</button>`; }
  $('calDays').innerHTML = h;
  $('calNow').classList.toggle('hide', curDay === today && logCalM === today.slice(0, 7));
}
function logCalGo(k){ curDay = k; close('ovCal'); renderToday(); }
function logCalWire(){
  $('dLabel').addEventListener('click', logCalOpen);
  $('calPrev').addEventListener('click', () => logCalShift(-1));
  $('calNext').addEventListener('click', () => logCalShift(1));
  $('calDays').addEventListener('click', e => { const b = e.target.closest('[data-cald]'); if(b) logCalGo(b.dataset.cald); });
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
