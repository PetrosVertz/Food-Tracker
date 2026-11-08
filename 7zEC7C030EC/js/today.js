// Today's food: daily log, targets, macros, plan my day, quick add, weigh-in. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function infoOfEntry(e){
  if(e.kind === 'meal'){ const m = meals.find(x => x.id === e.refId); return m ? { name: m.name, icon: mealIcon(m), unit: 'g', per: m, meal: m, piece: null } : null; }
  const f = foods.find(x => x.id === e.refId); return f ? { name: foodName(f), icon: iconOf(f) || '🍽️', unit: f.unit, per: f, food: f, piece: f.pieces !== 'none' ? (f.piece || f.serving || null) : null, pw: f.pieces } : null;
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
  el.innerHTML = `<h3 class="sect"><span>✨ ${t('planT')}</span><button class="linkbtn" id="dropPlan">${t('dropPlan')}</button></h3>` +
    (p.meals || []).map((m, i) => m.logged ? '' : `<div class="planmeal planned"><div class="row"><b>${esc(m.time || '')} · ${esc(m.title || '')}</b><span class="rmeta">${Math.round(m.kcal || 0)} kcal</span></div>
      <div class="rmeta">P ${fmt(m.protein)} · C ${fmt(m.carbs)} · F ${fmt(m.fat)}</div>
      <ul>${(m.items || []).map(it => `<li>${esc(it.name)} — ${r1(it.grams || 0)} g ${it.from === 'fridge' ? `<span class="src-f">🧊 ${t('fromFridge')}</span>` : ''}${it.expiring ? ` <span class="src-e">⚠️ ${t('expiringTag')}</span>` : ''}</li>`).join('')}</ul>
      ${m.why ? `<div class="hint">${esc(m.why)}</div>` : ''}
      <div class="actions" style="margin-top:8px"><button class="btn small primary" data-plog="${i}">✓ ${t('ateBtn')}</button></div></div>`).join('') +
    (p.tip ? `<p class="hint">💡 ${esc(p.tip)}</p>` : '');
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
  return `<div class="elec" data-elec><div class="row"><small class="rmeta">⚡ ${t('electrolytes')} <button class="ibtn" type="button" data-tip="tipElec" aria-label="Info">ⓘ</button></small></div>${row(t('sodium'), tot.na, NA_T, 'var(--na)')}${row(t('potassium'), tot.k, K_T, 'var(--kk)')}</div>`;
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
  if(k === 'o'){ const d = LOGON.res[i]; return { name: d.name, icon: '🌐', unit: d.unit || 'g', per: d, food: null, online: d, piece: null }; }
  return null;
}
function lwRef(info){ return info.meal ? 'm:' + info.meal.id : info.food ? 'f:' + info.food.id : info.gen ? 'g:' + info.gen.gid : info.online ? 'o:' + (info.online.barcode || info.name) : 'n:' + info.name; }
function lwUnits(info){
  const u = [], name = norm(info.name || ''), f = info.food || info.gen;
  const hint = LW_UNITS.find(([re]) => re.test(name)); if(hint && info.unit !== 'ml') hint[1].forEach(x => u.push({ k: 'h' + x[2], l: lwL(x), size: x[2] }));
  if(!hint && info.piece && info.pw) u.push({ k: 'pc', l: info.pw === 'slice' ? (lang === 'el' ? 'Φέτα' : 'Slice') : (lang === 'el' ? 'Τεμάχιο' : 'Piece'), size: info.piece });
  if(f && f.usualPack && f.usualPack <= 1000 && f.usualPack !== info.piece) u.push({ k: 'pack', l: lang === 'el' ? 'Συσκευασία' : 'Pack', size: f.usualPack });
  if(info.meal && info.meal.cookedWeight && (info.meal.quick || (info.meal.recipe && info.meal.recipe.servings === 1))) u.push({ k: 'plate', l: lang === 'el' ? 'Πιάτο' : 'Plate', size: Math.round(info.meal.cookedWeight) });
  u.push(info.unit !== 'ml' && UN().f === 'oz' ? { k: 'g', l: lang === 'el' ? 'Ουγγιές' : 'Ounces', size: OZ } : { k: 'g', l: info.unit === 'ml' ? (lang === 'el' ? 'ml' : 'Millilitres') : (lang === 'el' ? 'Γραμμάρια' : 'Grams'), size: 1 });
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
function lwChips(){ $('lAdded').innerHTML = LW.added.map(e => `<span class="lchip">✓ ${esc(e.name)} · ${e.kcal}</span>`).join(''); }
function drawLog(){
  const q = $('lSearch').value.trim();
  if(LW.q !== q){ LW.rows = {}; LW.open = null; LW.q = q; }
  let h = '';
  if(!q){
    LS.recent = usuals(); const ids = LS.recent.map((e, i) => i);
    if(LS.recent.length && LS.hourN) h += `<div class="lgrp">🕒 ${t('lwHour')}</div>` + ids.slice(0, LS.hourN).map(i => lwRow('rc', i)).join('') + (LS.recent.length > LS.hourN ? `<div class="lgrp">⭐ ${t('usuals')}</div>` + ids.slice(LS.hourN).map(i => lwRow('rc', i)).join('') : '');
    else if(LS.recent.length) h += `<div class="lgrp">⭐ ${t('usuals')}</div>` + ids.map(i => lwRow('rc', i)).join('');
    else h = `<div class="hint">${t('typeToSearch')}</div>`;
  } else {
    const s = searchLocal(q, false, { log: true, meals: true }); LS.meals = s.meals; LS.mine = s.mine; LS.std = s.std;
    const local = LS.meals.length + LS.mine.length + LS.std.length, onl = LOGON.q === q && LOGON.res.length;
    if(local) h += `<div class="lgrp">${t('lwResults')}</div>` + LS.meals.map((m, i) => lwRow('ml', i)).join('') + LS.mine.map((f, i) => lwRow('m', i)).join('') + LS.std.map((g, i) => lwRow('s', i)).join('');
    if(onl) h += `<div class="lgrp">${t('grpOnline2')}</div>` + LOGON.res.map((d, i) => lwRow('o', i)).join('');
    else if(LOGON.busy) h += `<div class="hint">${t('onlineSearching')}</div>`;
    else if(q.length >= 2 && LOGON.q !== q) h += `<button class="lmore" id="lOnline" type="button">🌐 ${t('onlineMore')}</button>`;
    // never a dead end: a spelling fix when little matched, and Add as Takeaway for anything
    const dym = local + (onl ? LOGON.res.length : 0) < 3 ? Search.didYouMean(q) : null;
    if(!local && !LOGON.busy && !onl) h = `<div class="hint">${t('nothingMatches', { q: esc(q) })}</div>` + h;
    if(dym) h = `<button class="dym" data-dym="${esc(dym)}">${t('didYouMean')} <b>${esc(dym)}</b>?</button>` + h;
    h += `<button class="lmore" id="lTakeaway" type="button">🥡 ${t('addAsTakeaway', { q: esc(q) })}<small>${t('takeawaySub')}</small></button>`;
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
  $('amTitle').textContent = o.mode === 'use' ? t('useT', { n: info.name }) : `${info.icon} ${info.name}`;
  $('amSub').textContent = o.mode === 'use' ? t('useSub') + ' · ' + t('left', { a: fmtAmt(o.item.qty, info) }) : (o.mode === 'editlog' ? t('edit') : t('logFood'));
  const chips = [];
  if(info.piece && info.pw) [1, 2, 3].forEach(n => chips.push([n * info.piece, `${n} ${n === 1 ? W(info.pw) : WS(info.pw)}`]));
  if(info.food && info.food.usualPack && info.food.usualPack <= 1000) chips.push([info.food.usualPack, `1 ${t('perPackLabel').replace(/^(per|ανά)\s*/, '')} · ${fmtSize(info.food.usualPack, info.unit)}`]);
  if(info.meal) [250, 350, 450].forEach(g => chips.push([g, `${g} g`]));
  if(!info.meal && !(info.piece && info.pw)) (info.unit === 'ml' ? [100, 200, 250, 500] : [50, 100, 150, 200]).forEach(g => chips.push([g, fmtSize(g, info.unit)]));
  if(o.mode === 'use') chips.push([o.item.qty, `${lang === 'el' ? 'Όλο' : 'All'} · ${fmtSize(o.item.qty, info.unit)}`]);
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
    $('amTitle').innerHTML = `${info.icon} ${esc(info.name)} ${stTag((info.food || {}).state)}`;
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
  AM.u = i; $('amU').innerHTML = u.map(x => `<option value="${x.k}">${esc(x.l)}</option>`).join(''); $('amU').selectedIndex = i; syncSel($('amU'));
}
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
    else { const f = loc.kind === 'gen' ? saveGeneric(loc.g) : loc.f; info = { name: foodName(f), icon: iconOf(f) || '🍽️', unit: f.unit, per: f, food: f }; por = qaPortion(loc.kind === 'gen' ? loc.g : { ...f, gid: f.gid, cat: f.cat, sub: f.sub }); }
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
    (tg ? '' : `<button class="linkbtn" data-targets><b>${t('noTargets')}</b></button>`) +
    mrow('p', t('protein'), tot.p, tg && tg.p, ' g', ms('p')) + mrow('c', t('carbs'), tot.c, tg && tg.c, ' g', ms('c')) + mrow('f', t('fat'), tot.f, tg && tg.f, ' g', ms('f'));
  const fT = fibTarget(tg);
  $('dExtrasBody').innerHTML = mrow('fi', t('fibre'), tot.fib || 0, fT, ' g', Math.round(tot.fib || 0) >= fT ? 'hit' : '') + elecHtml(tot);
  // carb timing
  const wins = carbWindows(d), nowM = diff === 0 ? toMin(nowHM()) : -1;
  const eatenIn = w => entries.filter(e => { const m = toMin(e.time); if(w.k === 'other') return !wins.some(x => x.a !== null && m >= x.a && m <= x.b); return m >= w.a && m <= w.b; }).reduce((s, e) => s + e.c, 0);
  $('dTiming').innerHTML = !tg ? `<p class="hint">${t('noTargets')}</p>` : wins.map(w => `<div class="win ${w.gym ? 'gym' : ''} ${w.a !== null && nowM >= w.a && nowM <= w.b ? 'now' : ''}">
      <div class="tm">${w.k === 'other' ? (lang === 'el' ? 'Υπόλοιπη μέρα' : 'Rest of day') : t(w.k)}<small>${w.a !== null ? fromMin(w.a) + '–' + fromMin(w.b + 1) : ''}</small></div>
      <div class="bd">${w.gym ? '🏋️ ' + t(di.work === 'legs' ? 'wLegs' : di.work === 'full' ? 'wFull' : di.work === 'cardio' ? 'wCardio' : 'wUpper') : t('winCarbs', { a: Math.round(eatenIn(w)), b: Math.round(w.c) })}${w.tip ? `<small>${w.tip}</small>` : ''}<span class="na">${t('winElec', { na: rnd50(NA_T * w.na), k: rnd50(K_T * w.kk) })}</span></div></div>`).join('');
  // log
  // Eaten rows (0.6.9): name + Cooked / Raw / Ready tag; under it P · C · F then the grams; calories bold italic on the right.
  // The time shows only when you tap the row (the edit sheet).
  const stOf = e => { if(e.kind !== 'food') return ''; const f = foods.find(x => x.id === e.refId); return f ? f.state : ''; };
  $('dLog').innerHTML = entries.length ? entries.map(e => `<div class="card eatrow" data-eid="${e.id}"><div class="et"><span class="name"><span class="nmt">${esc(bareName(e.name))}</span>${stTag(stOf(e))}</span><small class="esub"><b class="p">P ${fmt(e.p)}</b> · <b class="c">C ${fmt(e.c)}</b> · <b class="f">F ${fmt(e.f)}</b> · <span class="eamt">${fmtSize(e.amt, e.unit)}</span></small></div><span class="ekc">${Math.round(e.kcal)}<small>kcal</small></span></div>`).join('')
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

function weighAdvice(tr){
  const goal = (targets && targets.goal) || 'bulk', pct = tr.perWeek / tr.last * 100;
  if(goal === 'bulk') return pct < .25 ? { msg: t('wiSlowBulk'), d: 150 } : pct > .6 ? { msg: t('wiFastBulk'), d: -150 } : { msg: t('wiOk'), d: 0 };
  if(goal === 'cut') return pct > -.4 ? { msg: t('wiSlowCut'), d: -200 } : pct < -1.1 ? { msg: t('wiFastCut'), d: 150 } : { msg: t('wiOk'), d: 0 };
  return Math.abs(pct) > .3 ? { msg: t('wiRecomp'), d: pct > 0 ? -100 : 100 } : { msg: t('wiOk'), d: 0 };
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
      d.innerHTML = ['p', 'c', 'f'].map(k => `<div class="mxrow"><span class="mxl mx-${k}"><button class="mxlock" type="button" data-lock="${k}" data-p="${P}" aria-label="Lock">🔓</button>${t({ p: 'protein', c: 'carbs', f: 'fat' }[k])}</span><input type="range" class="mxr mx-${k}" min="0" max="100" step="any" data-p="${P}" data-k="${k}" aria-label="${k}"><b data-o="${k}"></b></div>`).join('') +
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
function drawLocks(){ ['G', 'R'].forEach(P => { const box = $('mx' + P); if(!box) return; box.querySelectorAll('[data-lock]').forEach(b => { const on = MXL[P] === b.dataset.lock; b.textContent = on ? '🔒' : '🔓'; b.classList.toggle('on', on); }); }); }
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
  if(e <= T){ const f = e >= T ? 1 : (Math.floor((pct - 75) / 5) + 1) / 6, W = [238, 241, 243], G = [89, 211, 140];
    return `rgb(${W.map((w, i) => Math.round(w + (G[i] - w) * f)).join(',')})`; }
  const f = Math.min(10, Math.ceil((e - T) / 50)) / 10;
  return `hsl(${Math.round(145 * (1 - f))},${Math.round(59 + 41 * f)}%,${Math.round(59 + 9 * f)}%)`;
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
  let x = Math.max(16, Math.min(innerWidth - w - 16, r.left + r.width / 2 - w / 2)), y = r.bottom + 8; if(y + h > innerHeight - 16) y = Math.max(16, r.top - h - 8);
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
function hideTip(){ const p = $('tipPop'); if(p) p.remove(); }
// plan my day runs from the Log food sheet; progress shows on Today where the plan lands
function planStat(txt){ const el = $('planShow'); el.innerHTML = `<div class="planstat"><span class="hint">✨ ${esc(txt)}</span><button class="linkbtn" id="planCancel">${t('cancel')}</button></div>`; }

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
