// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const WT_ICON = Object.fromEntries([...WTYPES.map(w => [w[0], w[1]]), ['chest','🫁'],['back','🔙'],['shoulders','🤷'],['arms','💪'],['core','🎯'],['glutes','🍑']]);

const workKind = ty => ['legs','lower','glutes'].includes(ty) ? 'legs' : ty === 'full' ? 'full' : ty === 'cardio' ? 'cardio' : 'upper';

const typeLabel_ = ty => t(({ upper:'wUpper', lower:'wLower', full:'wFull', push:'wPush', pull:'wPull', legs:'wLegs', cardio:'wCardio', chest:'wChest', back:'wBack', shoulders:'wShoulders', arms:'wArms', core:'wCore', glutes:'wGlutes' })[ty] || 'wUpper');

GEN.forEach(g => { const x = EXTRA[g.gid]; if(x){ g.fiber = x[0]; g.salt = r1(x[1] * 2.5 / 1000 * 100) / 100; g.potassium = x[2]; } });

COOKED.forEach(([id, rawId, en, el, kcal, protein, carbs, fat, fib, na, k]) => {
  const raw = GENBY[rawId]; if(!raw) return;
  const g = { ...raw, gid: id, en, el, alias: raw.alias, state: 'cooked', kcal, protein, carbs, fat, fiber: fib, salt: r1(na * 2.5 / 1000 * 100) / 100, potassium: k };
  g.hay = norm(`${en} ${el} ${raw.alias} cooked μαγειρεμενο βραστο ψητο ${subOf(raw.cat, raw.sub).en} ${subOf(raw.cat, raw.sub).el}`);
  GEN.push(g); GENBY[id] = g; PAIR[rawId] = id; PAIR[id] = rawId;
});

if(GENBY.rice_white && GENBY.rice_cooked){ PAIR.rice_white = 'rice_cooked'; PAIR.rice_cooked = 'rice_white'; }

if(GENBY.pasta && GENBY.pasta_cooked){ PAIR.pasta = 'pasta_cooked'; PAIR.pasta_cooked = 'pasta'; }

// standard foods saved before this version get fibre, salt and potassium filled in
foods.forEach(f => { const g = f.gid && GENBY[f.gid]; if(!g) return; if(f.fiber == null && g.fiber != null) f.fiber = g.fiber; if(f.salt == null && g.salt != null) f.salt = g.salt; if(f.potassium == null && g.potassium != null) f.potassium = g.potassium; });

if(foods.some(f => f.gid && GENBY[f.gid])) saveFoods();

NUM.potassium = 'fK';

// ---------- macros incl. fibre, sodium, potassium ----------
const naOf = per => per.salt != null ? per.salt * 400 : 0;

// 0.5.9: fibre target is automatic, from calories and goal (no input box)
const fibTarget = tg => { const k = tg ? tg.k : 2500, cut = targets && targets.goal === 'cut'; return cut ? Math.max(32, Math.round(k / 1000 * 16)) : Math.max(25, Math.round(k / 1000 * 14)); };

$('dTotals').addEventListener('click', e => { if(e.target.closest('[data-elec]')){ ui.elecMg = !ui.elecMg; saveUI(); renderToday(); } });

$('cookSuggestBtn').addEventListener('click', () => { close('ovCookPick'); $('cName').value = ''; SG.time = null; openSuggest(); setSeg('#sgTime', ''); $('sgLeft').textContent = t('sgAdult'); setTimeout(() => $('sgIn').focus(), 150); });

$('cookOwnBtn').addEventListener('click', () => { close('ovCookPick'); openCook(null, 'new'); setTimeout(() => $('cName').focus(), 150); });

$('pasteBtn').addEventListener('click', () => $('ownBtn').click());

// raw / cooked switch on every ingredient that has both versions
const pairOf = ref => { if(!ref) return null; if(ref.type === 'gen') return PAIR[ref.id] || null; if(ref.type === 'my'){ const f = foods.find(x => x.id === ref.id); return f && f.gid ? PAIR[f.gid] || null : null; } return null; };

const refState = ref => { const g = ref.type === 'gen' ? GENBY[ref.id] : ref.type === 'my' ? (foods.find(x => x.id === ref.id) || {}) : {}; return g.state || 'ready'; };

$('iRows').addEventListener('click', e => {
  const b = e.target.closest('[data-rc]'); if(!b) return; e.stopPropagation();
  const r = D.rows.find(x => x.key === b.closest('.irow').dataset.key), pr = pairOf(r.ref); if(!pr) return;
  const mine = foods.find(f => f.gid === pr); r.ref = mine ? foods_ref(mine) : gen_ref(GENBY[pr]); drawRows();
}, true);

let SG = { sel: new Set() };

$('sgAdd').addEventListener('click', addSgChip);

$('sgIn').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); $('sgGo').click(); } });

$('sgChips').addEventListener('click', e => { const b = e.target.closest('[data-sg]'); if(!b) return; const v = b.dataset.sg; SG.sel.has(v) ? SG.sel.delete(v) : SG.sel.add(v); drawSgChips(); });

$('sgGo').addEventListener('click', async () => {
  if(sgCtl){ sgCtl.abort(); return; }
  const dish = $('sgIn').value.trim() || $('cName').value.trim();
  if(!SG.sel.size && !dish){ toast(t('sgPick')); return; }
  if(!settings.geminiKey){ toast(t('needKey')); openSettings(); return; }
  const btn = $('sgGo'); sgCtl = new AbortController(); const ctl = sgCtl; btn.textContent = t('thinking');
  const rm = remainingToday(), fr = liveItems().map(x => x.info.name).slice(0, 30).join(', ');
  try{
    const r = await gemini(`You are a practical home-cooking assistant for someone who lifts weights and tracks macros. Write ALL text in ${lang === 'el' ? 'Greek' : 'English'}.
${dish ? `Dish name they gave: "${dish}".` : 'Pick a fitting dish.'} They want: ${[...SG.sel].join(', ') || 'anything good'}.
${SG.time ? `Total cooking time: ${{ quick: '20 minutes or less', mid: '20 to 60 minutes', long: 'over 60 minutes is fine' }[SG.time]}.` : ''}
ONE serving is a normal adult portion of a main meal (roughly 600–800 kcal, high protein), whatever they have eaten today.
In their fridge (use these when they fit): ${fr || 'unknown'}.
Return ONLY JSON: {"title":string,"servings":number,"minutes":number,"perServing":{"kcal":number,"protein":number,"carbs":number,"fat":number},"ingredients":[{"name":string,"name_en":string,"grams":number,"note":string|null}],"steps":[string]}
Rules: ONE plate only — servings = 1, no leftovers, no batch cooking. Amounts in grams for that one plate, raw as they go in (dry pasta/rice, raw meat). Include cooking oil. No steps about weighing the cooked food. 3–10 ingredients, 4–10 short steps. name_en = plain generic English food name (e.g. "chicken breast", "olive oil").`, null, (i, n) => { if(sgCtl === ctl) btn.textContent = t('cancelRec', { i, n }); }, ctl.signal);
    if(!r || !Array.isArray(r.steps) || !r.steps.length) throw new Error('empty recipe');
    pendingRecipe = r; close('ovSuggest');
    $('rBody').innerHTML = (r.perServing ? `<div class="macroline"><span class="m kc"><b>${Math.round(r.perServing.kcal)}</b> kcal</span><span class="m p">P <b>${fmt(r.perServing.protein)}</b></span><span class="m c">C <b>${fmt(r.perServing.carbs)}</b></span><span class="m f">F <b>${fmt(r.perServing.fat)}</b></span> <small class="rmeta">/ serving</small></div>` : '') + recipeHtml(r, false);
    open('ovRecipe');
  }catch(err){ if(!err.cancelled) toast(t('recipeFail', { e: err.message })); }
  finally{ sgCtl = null; btn.textContent = t('sgGo'); }
});

// ---------- navigation: 3 tabs, back + forward history, orange back on every sheet ----------
let NAV = [location.hash.slice(1)], NAVI = 0, navMode = false;

window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if(navMode){ navMode = false; return; } if(NAV[NAVI] === h) return; NAV = NAV.slice(0, NAVI + 1); NAV.push(h); NAVI = NAV.length - 1; });

const tabOf = h => h === 'settings' ? 'settings' : h === 'today' ? 'today' : h.startsWith('gym') ? 'gym' : h === 'fridge' || h === 'groc' ? 'fridge' : 'food';

(() => {   // swipe from the right edge = forward (left edge = back is already wired)
  let sx = null, sy = 0, st = 0;
  document.addEventListener('touchstart', e => { const t0 = e.touches[0]; if(t0.clientX > window.innerWidth * .55 && !e.target.closest('input,select,textarea,.mxs,.stepper,.hscroll,.chips,.tchips,.wrapchips,.seg,.swipebox .card,.swipebox .exc,.swipebox .tpcard,.bodymap,.wtchart')){ sx = t0.clientX; sy = t0.clientY; st = Date.now(); } else sx = null; }, { passive: true });
  document.addEventListener('touchend', e => { if(sx === null) return; const t1 = e.changedTouches[0], dx = t1.clientX - sx, dy = Math.abs(t1.clientY - sy); sx = null;
    if(dx > -80 || dy > 50 || dy > -dx * .6 || Date.now() - st > 700) return; goForward(); }, { passive: true });
})();

document.querySelectorAll('.overlay .sheet').forEach(sh => { const ov = sh.parentElement.id; if(ov === 'ovLang' || ov === 'ovSession' || ov === 'ovAsk' || ov === 'ovPick') return;
  const b = document.createElement('button'); b.className = 'sback'; b.type = 'button'; b.setAttribute('aria-label', 'Back'); b.innerHTML = BACK_SVG; b.addEventListener('click', goBack); sh.prepend(b); });

$('tabbar').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if(!b) return; const tab = b.dataset.tab, h = location.hash.slice(1);
  if(tabOf(h) === tab && h !== TAB_ROOT[tab]) go(TAB_ROOT[tab]); else if(tabOf(h) !== tab) go(ui['lastIn_' + tab] && tab !== 'today' ? ui['lastIn_' + tab] : TAB_ROOT[tab]); else window.scrollTo({ top: 0, behavior: 'smooth' }); });

$('gHubTiles').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if(b) go(b.dataset.sec); });

$('gMiniRec').addEventListener('click', () => go('gym-rec'));

$('gBackBtn').addEventListener('click', goBack);

const workFor = d => { const p = gymPlan[new Date(d + 'T12:00:00').getDay()]; return p && p.work ? p.work : null; };

$('gPlanV').addEventListener('change', e => { if(e.target.id === 'wpAdv'){ ui.wpAdv = e.target.checked; saveUI(); renderGymPlan(); } });
$('gPlanV').addEventListener('click', e => {
  const ws = e.target.closest('[data-wpset]'); if(ws){ const wd = +ws.closest('[data-wd]').dataset.wd, p = { ...(gymPlan[wd] || {}) };
    if(ws.dataset.wpset === 'rest') p.tpl = 'rest'; else { if(!p.tpl || p.tpl === 'rest') p.tpl = 'gym'; p.time = p.time || profile.gymTime || '18:00'; }
    gymPlan[wd] = p; saveG('plan'); renderAll(); return; }
  const row = e.target.closest('[data-wd]'); if(!row) return; const wd = +row.dataset.wd, p = gymPlan[wd] || {};
  if(e.target.closest('[data-wadd]')){ p.work = { from: '09:00', to: '17:00' }; gymPlan[wd] = p; saveG('plan'); renderGymPlan(); renderToday(); }
  if(e.target.closest('[data-wrm]')){ delete p.work; if(p.tpl) gymPlan[wd] = p; else delete gymPlan[wd]; saveG('plan'); renderGymPlan(); renderToday(); }
});

$('gPlanV').addEventListener('change', e => {
  const row = e.target.closest('[data-wd]'); if(!row || !(e.target.matches('[data-wfrom]') || e.target.matches('[data-wto]'))) return;
  const p = gymPlan[+row.dataset.wd]; if(!p || !p.work) return;
  if(e.target.matches('[data-wfrom]')) p.work.from = e.target.value; else p.work.to = e.target.value; saveG('plan'); renderToday();
});

$('dBlocks').addEventListener('click', e => { if(e.target.closest('[data-goweek]')) go('gym-week'); });

$('dRec').addEventListener('click', e => { if(e.target.closest('[data-gorec]')) go('gym-rec'); }, true);

// clear out the old ready-made workouts if they were never used
if(!ui.seedClean053){
  const seedNames = new Set(['Upper','Legs','Full body','Cardio','Πάνω σώμα','Πόδια','Όλο το σώμα']);
  const used = new Set([...sessions.map(s => s.tplId), ...Object.values(gymPlan).map(p => p && p.tpl)].filter(Boolean));
  tpls = tpls.filter(x => !(seedNames.has(x.name) && !used.has(x.id))); saveG('tpl'); ui.seedClean053 = true; saveUI();
}

const eqIcon = (e, s) => `<svg viewBox="0 0 24 24" width="${s || 16}" height="${s || 16}" fill="none" stroke="${EQ_COL[e] || '#8b949c'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EQ_ICON[e] || ''}</svg>`;

$('pkBody').addEventListener('click', e => {
  const hh = e.target.closest('[data-hh]'); if(hh && hh.dataset.hh){ e.stopPropagation(); PK.group = HEADS[hh.dataset.hh][2]; PK.head = hh.dataset.hh; PK.eq = null; drawExPick(); return; }
  const eq = e.target.closest('[data-eq]'); if(eq){ e.stopPropagation(); PK.eq = eq.dataset.eq || null; drawExPick(); return; }
  if(e.target.closest('[data-pkback]')){ e.stopPropagation(); goBack(); return; }
  const hd = e.target.closest('[data-head]'); if(hd){ PK.eq = null; }
}, true);

[...GEN_MORE, ...GEN_067].forEach(([id, en, el, alias, cat, sub, unit, state, kcal, protein, carbs, fat, fib, na, k, pieces, piece]) => {
  if(GENBY[id]) return;
  const so = subOf(cat, sub) || {}; const g = { gid: id, en, el, alias, cat, sub, unit, state, kcal, protein, carbs, fat, fiber: fib, salt: r1(na * 2.5 / 1000 * 100) / 100, potassium: k,
    pieces: pieces || 'none', piece: piece || null, hay: norm(`${en} ${el} ${alias} ${so.en || ''} ${so.el || ''} ${(so.kw || []).join(' ')}`) };
  GEN.push(g); GENBY[id] = g;
});

const POPI = Object.fromEntries(POP.map((g, i) => [g, i]));

const popBonus = gid => gid in POPI ? 7 * (1 - POPI[gid] / POP.length) + 1 : 0;


// Suggest a meal: time available (tap again to clear)
document.querySelectorAll('#sgTime button').forEach(b => b.addEventListener('click', () => { SG.time = SG.time === b.dataset.v ? null : b.dataset.v; setSeg('#sgTime', SG.time || ''); }));
// My Own Recipe: the cooked weight is worked out from the ingredients; weighing it yourself is optional and folded away
$('cWeighLink').addEventListener('click', () => $('cWeighBox').classList.toggle('hide'));
// free-write quick add: the AI turns it into ingredients and amounts (without a key, the built-in reader tries)
$('cQuickGo').addEventListener('click', async () => {
  const txt = $('cQuickTxt').value.trim(); if(!txt){ $('cQuickTxt').focus(); return; }
  let r = null;
  if(settings.geminiKey){
    try{ r = await gemini(`Turn this home recipe into structured data. Write names in ${lang === 'el' ? 'Greek' : 'English'}. Text: """${txt}"""
Return ONLY JSON: {"title":string,"servings":number,"ingredients":[{"name":string,"name_en":string,"grams":number}],"steps":[string]}
Rules: grams for the whole batch as weighed raw; convert spoons/cups/pieces to grams; include oil; name_en = plain generic English food name.`); }
    catch(err){ if(err.cancelled) return; toast(t('cqFail')); }
  }
  if(!r){ r = parseRecipe(txt); if(!r.ingredients.length){ toast(t(settings.geminiKey ? 'cqFail' : 'cqNoKey')); return; } }
  if(r.title && !$('cName').value.trim()) $('cName').value = r.title;
  applyRecipe(r, true); $('cQuickTxt').value = ''; toast(t('cqDone', { n: (r.ingredients || []).length }));
});
