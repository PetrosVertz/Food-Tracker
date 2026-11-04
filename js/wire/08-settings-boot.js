// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

$('getKey').addEventListener('click', () => window.open(KEY_URL, '_blank', 'noopener'));

$('saveSettings').addEventListener('click', () => { settings.geminiKey = $('sKey').value.trim(); settings.model = $('sModel').value.trim() || DEFAULT_MODEL; if(store(SKEY, settings)) toast(t('settingsSaved')); });

document.querySelectorAll('#sLang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.v)));

document.querySelectorAll('#ovLang [data-lang]').forEach(b => b.addEventListener('click', () => { setLang(b.dataset.lang); close('ovLang'); }));

$('copyClaude').addEventListener('click', async () => {
  if(!foods.length && !meals.length && !supps.length && !fridge.length){ toast(t('nothingCopy')); return; }
  const txt = claudeText();
  try{ await navigator.clipboard.writeText(txt); toast(t('copied')); }
  catch(e){ const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(t('copied')); }
});

$('exportJson').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ app:'tracker', version:VERSION, exportedAt:new Date().toISOString(), foods, meals, supps, suppLog, fridge, groc, dayLog, days, targets, plans, gym: { custom: exCustom, tpl: tpls, plan: gymPlan, sessions, comeback }, pet }, null, 2)], { type:'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tracker-${new Date().toISOString().slice(0,10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('importBtn').addEventListener('click', () => { $('importInput').value=''; $('importInput').click(); });

$('importInput').addEventListener('change', async e => {
  const file = e.target.files[0]; if(!file) return;
  try{
    const data = JSON.parse(await file.text());
    const inFoods = Array.isArray(data) ? data : data.foods, inMeals = Array.isArray(data.meals) ? data.meals : [];
    if(!Array.isArray(inFoods)) throw new Error();
    let added = 0, updated = 0;
    const merge = (arr, incoming, fix) => { for(const raw of incoming){ if(!raw || !raw.name) continue; const f = fix(raw);
      const i = arr.findIndex(x => x.id === f.id);
      if(i === -1){ arr.push({ ...f, id: f.id || uid() }); added++; } else if((f.updatedAt||'') > (arr[i].updatedAt||'')){ arr[i] = f; updated++; } } };
    merge(foods, inFoods, migrate); merge(meals, inMeals, m => m); merge(supps, Array.isArray(data.supps) ? data.supps : [], s => s);
    if(data.suppLog && typeof data.suppLog === 'object') for(const [d, v] of Object.entries(data.suppLog)) suppLog[d] = { ...(suppLog[d] || {}), ...v };
    merge(fridge, Array.isArray(data.fridge) ? data.fridge.map(x => ({ ...x, name: x.name || 'item' })) : [], x => x);
    merge(groc, Array.isArray(data.groc) ? data.groc : [], x => x);
    if(data.dayLog && typeof data.dayLog === 'object') for(const [d, v] of Object.entries(data.dayLog)){ const have = new Set((dayLog[d] || []).map(e => e.id)); dayLog[d] = (dayLog[d] || []).concat((v || []).filter(e => !have.has(e.id))); }
    if(data.days && typeof data.days === 'object') days = { ...data.days, ...days };
    if(data.plans && typeof data.plans === 'object') plans = { ...data.plans, ...plans };
    if(data.targets && !targets) targets = data.targets;
    if(data.weights && typeof data.weights === 'object'){ weights = { ...data.weights, ...weights }; store(WKEY, weights); }
    if(data.gym){ const g = data.gym; const have = new Set(sessions.map(x => x.id)); sessions = sessions.concat((g.sessions || []).filter(x => !have.has(x.id))).sort((a, b) => a.start.localeCompare(b.start));
      const ht = new Set(tpls.map(x => x.id)); tpls = tpls.concat((g.tpl || []).filter(x => !ht.has(x.id))); const hc = new Set(exCustom.map(x => x.id)); exCustom = exCustom.concat((g.custom || []).filter(x => !hc.has(x.id)));
      if(g.plan && !Object.keys(gymPlan).length) gymPlan = g.plan; ['ses', 'tpl', 'custom', 'plan'].forEach(saveG); }
    if(data.pet && !pet){ pet = data.pet; saveG('pet'); }
    fridge.forEach(x => { if(x.name === 'item') delete x.name; });
    saveFoods(); saveMeals(); saveSupps(); store(LOGKEY, suppLog); saveFridge(); saveGroc(); saveLog(); saveDays(); store(PLKEY, plans); if(targets) store(TGKEY, targets); renderAll(); toast(t('imported', { a: added, u: updated }));
  }catch(err){ toast(t('badBackup')); }
});

// ======================= go =======================
applyLang();

route();

if(!ui.setupDone) openSetup();

if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{});

if(location.protocol === 'https:') setTimeout(() => getDetector().catch(()=>{}), 2500);

window.__ft = { openSetup, searchLocal, usuals, weightTrend, demoMatches, loadFedb, switchTab, renderLaunch, calcTargets, backupBlob, get SHOP(){ return SHOP; }, set FEDB(v){ FEDB = v; }, goBack, goForward, matchIng, dayTotals, PAIR, GENBY, workKind, groupReadiness, recoveryWarnings, nextSuggestions, exById, EX, stockBadge, suggestFor, warmupFor, strengthChange, petSVG, planFor, e1rm, goBack, carbWindows, defaultDays, defaultLoc, grocText, guessType, guessPieces, portion, validGTIN, searchLocal, claudeText, GEN, parseRecipe, sortModels };
