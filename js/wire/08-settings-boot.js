// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

$('getKey').addEventListener('click', () => Phone.openUrl(KEY_URL));

$('saveSettings').addEventListener('click', () => { settings.geminiKey = $('sKey').value.trim(); settings.model = $('sModel').value.trim() || DEFAULT_MODEL; if(Store.save('settings', settings)) toast(t('settingsSaved')); });

document.querySelectorAll('#sLang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.v)));

document.querySelectorAll('#ovLang [data-lang]').forEach(b => b.addEventListener('click', () => { setLang(b.dataset.lang); close('ovLang'); }));

$('copyClaude').addEventListener('click', async () => {
  if(!foods.length && !meals.length && !supps.length && !fridge.length){ toast(t('nothingCopy')); return; }
  const txt = claudeText();
  await Phone.copy(txt); toast(t('copied'));
});

$('exportJson').addEventListener('click', () => { Phone.download(backupBlob(), `tracker-${todayKey()}.json`); ui.lastBackup = new Date().toISOString(); saveUI(); });

$('importBtn').addEventListener('click', () => { $('importInput').value=''; $('importInput').click(); });

$('importInput').addEventListener('change', async e => {
  const file = e.target.files[0]; if(!file) return;
  try{
    const data = Store.upgradeBackup(JSON.parse(await file.text()));
    const inFoods = Array.isArray(data) ? data : data.foods, inMeals = Array.isArray(data.meals) ? data.meals : [];
    if(!Array.isArray(inFoods)) throw new Error();
    let added = 0, updated = 0;
    const merge = (arr, incoming, fix) => { for(const raw of incoming){ if(!raw || !raw.name) continue; const f = fix(raw);
      const i = arr.findIndex(x => x.id === f.id);
      if(i === -1){ arr.push({ ...f, id: f.id || uid() }); added++; } else if((f.updatedAt||'') > (arr[i].updatedAt||'')){ arr[i] = f; updated++; } } };
    merge(foods, inFoods, normFood); merge(meals, inMeals, m => m); merge(supps, Array.isArray(data.supps) ? data.supps : [], s => s);
    if(data.suppLog && typeof data.suppLog === 'object') for(const [d, v] of Object.entries(data.suppLog)) suppLog[d] = { ...(suppLog[d] || {}), ...v };
    merge(fridge, Array.isArray(data.fridge) ? data.fridge.map(x => ({ ...x, name: x.name || 'item' })) : [], x => x);
    merge(groc, Array.isArray(data.groc) ? data.groc : [], x => x);
    if(data.dayLog && typeof data.dayLog === 'object') for(const [d, v] of Object.entries(data.dayLog)){ const have = new Set((dayLog[d] || []).map(e => e.id)); dayLog[d] = (dayLog[d] || []).concat((v || []).filter(e => !have.has(e.id))); }
    if(data.days && typeof data.days === 'object') days = { ...data.days, ...days };
    if(data.plans && typeof data.plans === 'object') plans = { ...data.plans, ...plans };
    if(data.targets && !targets) targets = data.targets;
    if(data.weights && typeof data.weights === 'object'){ weights = { ...data.weights, ...weights }; Store.save('weights', weights); }
    if(data.gym){ const g = data.gym; const have = new Set(sessions.map(x => x.id)); sessions = sessions.concat((g.sessions || []).filter(x => !have.has(x.id))).sort((a, b) => a.start.localeCompare(b.start));
      const ht = new Set(tpls.map(x => x.id)); tpls = tpls.concat((g.tpl || []).filter(x => !ht.has(x.id))); const hc = new Set(exCustom.map(x => x.id)); exCustom = exCustom.concat((g.custom || []).filter(x => !hc.has(x.id)));
      if(g.plan && !Object.keys(gymPlan).length) gymPlan = g.plan; ['ses', 'tpl', 'custom', 'plan'].forEach(saveG); }
    if(data.pet && !pet){ pet = data.pet; saveG('pet'); }
    if(data.profile && typeof data.profile === 'object'){ profile = { ...data.profile, ...profile }; saveProfile(); }
    fridge.forEach(x => { if(x.name === 'item') delete x.name; });
    saveFoods(); saveMeals(); saveSupps(); Store.save('suppLog', suppLog); saveFridge(); saveGroc(); saveLog(); saveDays(); Store.save('plans', plans); if(targets) Store.save('targets', targets); renderAll(); toast(t('imported', { a: added, u: updated }));
  }catch(err){ toast(t('badBackup')); }
});

// ======================= go =======================
applyLang();

route();

if(!ui.setupDone) openSetup();
else setTimeout(checkAbandoned, 1200);   // a workout left open for 20+ min ends by itself (4+ exercises) or asks

if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{});

if(location.protocol === 'https:') setTimeout(() => Phone.barcodeReader().catch(()=>{}), 2500);

window.__ft = { openSetup, searchLocal, usuals, weightTrend, demoMatches, loadFedb, switchTab, renderLaunch, calcTargets, backupBlob, get SHOP(){ return SHOP; }, set FEDB(v){ FEDB = v; }, goBack, goForward, matchIng, dayTotals, PAIR, GENBY, workKind, groupReadiness, recoveryWarnings, nextSuggestions, exById, EX, stockBadge, suggestFor, warmupFor, strengthChange, petSVG, planFor, e1rm, goBack, carbWindows, defaultDays, defaultLoc, grocText, guessType, guessPieces, portion, validGTIN, searchLocal, claudeText, GEN, parseRecipe, AI, Store, Phone, Account };

// Settings → Your Body: sex, height, weight; offers to recalculate targets
document.querySelectorAll('#sSex button').forEach(b => b.addEventListener('click', () => setSeg('#sSex', b.dataset.v)));
$('sBodySave').addEventListener('click', async () => {
  const sx = (document.querySelector('#sSex .on') || {}).dataset?.v || null, hh = num('sH'), w = num('sW');
  if(sx) profile.sex = sx; if(hh > 120 && hh < 230) profile.height = hh; saveProfile();
  if(w > 30 && w < 300){ weights[todayKey()] = w; Store.save('weights', weights); if(targets){ targets.bw = w; Store.save('targets', targets); } }
  renderAll(); toast(t('bodySaved'));
  const bw = w > 30 ? w : latestWeight() || (targets && targets.bw);
  if(bw && await ask(t('recalcQ'), t('recalcYes'), t('recalcNo'))){ const tg = calcTargets(bw, (targets && targets.goal) || 'bulk'); targets = { ...(targets || {}), ...tg }; Store.save('targets', targets); renderAll(); toast(t('targetsSaved')); }
});
addEventListener('hashchange', () => { if(location.hash === '#settings') fillSettings(); });
addEventListener('hashchange', () => setTimeout(syncFab2, 0));

// Backup reminder when the app opens (iPhone can't show anything when a web app closes)
setTimeout(async () => {
  if(!ui.setupDone || document.querySelector('.overlay.open')) return;
  const hasData = foods.length || Object.keys(dayLog).length || sessions.length; if(!hasData) return;
  const last = ui.lastBackup ? new Date(ui.lastBackup).getTime() : 0, days3 = Date.now() - last >= 3 * 864e5;
  if(!days3 || ui.bkAsked === todayKey()) return; ui.bkAsked = todayKey(); saveUI();
  if(await ask(t(last ? 'bkAskOld' : 'bkAskNever', { d: last ? Math.floor((Date.now() - last) / 864e5) : 0 }), t('bkYes'), t('later'))) backupNow();
}, 1500);

// ---------- 0.6.8.2: Settings › Theme ----------
applyTheme(); drawTheme();
$('sThemeBtn').addEventListener('click', () => { drawTheme(); open('ovTheme'); });
$('thMode').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(b) setTheme({ mode: b.dataset.v }); });
$('thSw').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if(b) setTheme({ preset: b.dataset.preset }); });
