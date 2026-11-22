// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// Settings › AI › AI Provider: Gemini (default, the user's free key), Claude, OpenAI, OpenRouter (ai-provider.js adapters). Each keeps its own key and models:
// Gemini in settings.geminiKey / model / modelAdvanced (unchanged, so an upgrade needs nothing), the others in settings.aiKeys[id] / aiModels[id].
// Tapping a provider only shows its fields (typed values are kept per provider while the page is open); Save Settings stores them in that
// provider's slot and makes it the one in use (settings.provider). Nothing ever switches by itself and no request goes to a provider that is not in use.
const PROV_URL = { gemini: KEY_URL, anthropic: 'https://console.anthropic.com/settings/keys', openai: 'https://platform.openai.com/api-keys', openrouter: 'https://openrouter.ai/keys' };
let SPROV = 'gemini', PDRAFT = {};
const PROV_T = { gemini: 'provGemini', anthropic: 'provAnthropic', openai: 'provOpenai', openrouter: 'provOpenrouter' }, provName = id => t(PROV_T[id] || 'provGemini');
const provSaved = id => id === 'gemini' ? { key: settings.geminiKey || '', model: settings.model || '', adv: settings.modelAdvanced || '' }
  : { key: (settings.aiKeys || {})[id] || '', model: ((settings.aiModels || {})[id] || {}).default || '', adv: ((settings.aiModels || {})[id] || {}).advanced || '' };
const provKeep = () => { PDRAFT[SPROV] = { key: $('sKey').value.trim(), model: $('sModel').value.trim(), adv: $('sModelAdv').value.trim() }; };
// id: the provider to show (null = the one in use); fresh: forget typed drafts (the page was just opened)
function drawAiProv(id, fresh){ if(fresh) PDRAFT = {}; const reg = AIProvider.registry, use = AIProvider.active();
  SPROV = reg[id] ? id : use.id; const p = reg[SPROV], v = PDRAFT[SPROV] || provSaved(SPROV), nm = provName(SPROV);
  setSeg('#sProv', SPROV); $('sProv').querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === SPROV)));
  $('sKeyL').textContent = t('aiKeyFor', { p: nm }); $('sModelL').textContent = t('aiModelFor', { p: nm });
  $('sKey').value = v.key; $('sModel').value = v.model; $('sModelAdv').value = v.adv;
  $('sModel').placeholder = (p.models && p.models.default) || ''; $('sModelAdv').placeholder = (p.models && p.models.advanced) || t('aiModelAdvPh');
  $('sGemOnly').classList.toggle('hide', SPROV !== 'gemini');
  const unm = provName(use.id);
  $('sProvNote').textContent = [SPROV === use.id ? t('aiProvInUse', { p: nm }) : t('aiProvSaveToUse', { p: nm, q: unm }), SPROV !== 'gemini' ? t('aiProvPaid', { p: nm }) : '', p.capabilities && !p.capabilities.search ? t('aiProvNoSearch') : ''].filter(Boolean).join(' ');
  status($('keyStatus'), ''); $('keyStatus').style.color = ''; }
$('sProv').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(!b || b.dataset.v === SPROV) return; Phone.haptic(); provKeep(); drawAiProv(b.dataset.v); });
$('getKey').addEventListener('click', () => Phone.openUrl(PROV_URL[SPROV] || KEY_URL));

$('aiKnowReset').addEventListener('click', async () => { Phone.haptic(); if(!(await ask(t('aiKnowAsk'), t('aiKnowYes')))) return; Know.reset(); if(typeof GymIntel !== 'undefined') GymIntel.forget(); drawAiMem(); toast(t('aiKnowDone')); });   // 0.7.9 ai: Settings › AI
// Athlete OS: what you told the coaches (AthleteMemory), each with when it ends and a delete button; Copy gives you all of it as text
function drawAiMem(){ const el = $('aiMem'); if(!el || typeof AthleteMemory === 'undefined') return;
  const ns = AthleteMemory.list(), day = ms => new Date(ms).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' });
  el.innerHTML = ns.length ? `<ul class="aimem">${ns.map(x => `<li><span>${esc(x.text)}<small>${esc(x.kind === 'context' ? t('memUntil', { d: day(x.until) }) : t('memKeep'))}</small></span>`
    + `<button type="button" class="aimemx" data-memx="${esc(x.id)}" aria-label="${esc(t('memDel'))}">${svgIcon('trash', 18, 2)}</button></li>`).join('')}</ul>` : `<p class="hint">${esc(t('memNone'))}</p>`; }
$('aiMem').addEventListener('click', e => { const b = e.target.closest('[data-memx]'); if(!b) return; Phone.haptic();
  const gone = AthleteMemory.remove(b.dataset.memx); drawAiMem(); if(gone) toast(t('memDeleted'), t('undo'), () => { AthleteMemory.restore([gone]); drawAiMem(); }); });
// Athlete OS · persona: Settings › AI › Coach Personality (one setting for every coach; saved in settings.coach on this phone)
function drawPersona(){ if(typeof Persona === 'undefined') return; const p = Persona.prefs();
  setSeg('#perBase', p.base); setSeg('#perHumor', p.humor); setSeg('#perLen', p.len); const c = $('perCustom'); if(c && document.activeElement !== c) c.value = p.custom; }
[['perBase', 'base'], ['perHumor', 'humor'], ['perLen', 'len']].forEach(([id, k]) => $(id).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(!b) return;
  Phone.haptic(); if(Persona.set({ [k]: b.dataset.v })) toast(t('perSaved')); drawPersona(); }));
$('perCustom').addEventListener('change', e => { const v = e.target.value; if(Persona.set({ custom: v })) toast(t('perSaved')); e.target.value = Persona.prefs().custom; });
$('aiMemCopy').addEventListener('click', async () => { Phone.haptic(); await Phone.copy(AthleteMemory.exportAll()); toast(t('memCopied')); });
$('aiuReset').addEventListener('click', async () => { Phone.haptic(); if(!(await ask(t('aiuAsk'), t('aiuYes')))) return; AIUsage.reset(); AIUsage.draw(); toast(t('aiuDone')); });   // Athlete OS step 1: Settings › AI › Usage
$('saveSettings').addEventListener('click', () => { const key = $('sKey').value.trim(), model = $('sModel').value.trim(), adv = $('sModelAdv').value.trim();
  if(SPROV === 'gemini'){ if(key !== settings.geminiKey) Store.save('models', null); settings.geminiKey = key; settings.model = model || DEFAULT_MODEL; if(adv) settings.modelAdvanced = adv; else delete settings.modelAdvanced; }
  else { settings.aiKeys = { ...(settings.aiKeys || {}), [SPROV]: key }; const m = { ...(model ? { default: model } : {}), ...(adv ? { advanced: adv } : {}) };
    settings.aiModels = { ...(settings.aiModels || {}) }; if(Object.keys(m).length) settings.aiModels[SPROV] = m; else delete settings.aiModels[SPROV]; }
  settings.provider = SPROV; delete PDRAFT[SPROV];
  if(Store.save('settings', settings)) toast(t('settingsSaved')); aiGate(); drawAiProv(SPROV); });

document.querySelectorAll('#sLang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.v)));

document.querySelectorAll('#ovLang [data-lang]').forEach(b => b.addEventListener('click', () => { setLang(b.dataset.lang); close('ovLang'); }));

$('copyClaude').addEventListener('click', async () => {
  if(!foods.length && !meals.length && !supps.length && !fridge.length){ toast(t('nothingCopy')); return; }
  const txt = claudeText();
  await Phone.copy(txt); toast(t('copied'));
});

$('exportJson').addEventListener('click', () => { Phone.download(backupBlob(), `tracker-backup-${todayKey()}.json`); ui.lastBackup = new Date().toISOString(); saveUI(); });

$('importBtn').addEventListener('click', () => { $('importInput').value=''; $('importInput').click(); });

// Import (V3 hardening): read → check → plan on copies (Backup.plan) → save every changed list at once (Store.saveMany: all or nothing)
// → only then put the new values on screen. A failed save changes nothing, in storage or in memory, and shows no success.
$('importInput').addEventListener('change', async e => {
  const file = e.target.files[0]; if(!file) return;
  let data;
  try{ if(file.size > 25e6) throw new Error('too big'); data = Store.upgradeBackup(JSON.parse(await file.text())); }catch(err){ toast(t('badBackup')); return; }
  let p;
  try{ p = Backup.plan({ foods, meals, supps, suppLog, fridge, groc, dayLog, days, plans, targets, weights, combos, logPhr, foodFix: logFix, profile,
    sessions, tpls, exCustom, gymPlan, active, streak: Store.load('streak', null) }, data); }catch(err){ console.error('import', err); toast(t('badBackup')); return; }
  if(!p.ok){ toast(t(p.reason === 'tooNew' ? 'backupTooNew' : 'badBackup')); return; }
  if(p.changed.length && !Store.saveMany(Object.fromEntries(p.changed.map(k => [k, p.next[k]])))) return;   // saveMany already said it could not save
  const n = p.next;
  foods = n.foods; meals = n.meals; supps = n.supps; suppLog = n.suppLog; fridge = n.fridge; groc = n.groc; dayLog = n.dayLog; days = n.days; plans = n.plans; targets = n.targets;
  weights = n.weights; combos = n.combos; logPhr = n.logPhr; logFix = n.foodFix; profile = n.profile; sessions = n.sessions; tpls = n.tpls; exCustom = n.exCustom; gymPlan = n.gymPlan; active = n.active;
  renderAll(); toast(t('imported', { a: p.added, u: p.updated }));
  if(p.activeRestored) setTimeout(checkAbandoned, 1200);   // a restored live workout follows the same "left open" rule as at start-up
});

// ======================= go =======================
applyLang();

hubBoot();   // Refinements: back within 3 minutes of leaving a Gym Buddy section → that section
route();

{ const pr = Store.problems();   // V3 hardening: say once if start-up found an interrupted import or saved data it could not read
  const msg = pr.some(p => p.kind === 'rolledBack') ? 'importUndone' : pr.some(p => /^(corrupt|migration|rollbackFailed)$/.test(p.kind) && !p.again) ? 'dataProblem' : null;
  if(msg) setTimeout(() => toast(t(msg)), 900); }

if(!ui.setupDone) openSetup();
else setTimeout(checkAbandoned, 1200);   // a workout left open for 20+ min ends by itself (4+ exercises) or asks

if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{});

if(location.protocol === 'https:') setTimeout(() => Phone.barcodeReader().catch(()=>{}), 2500);

window.__ft = { openSetup, searchLocal, usuals, weightTrend, demoMatches, loadFedb, switchTab, calcTargets, backupBlob, get SHOP(){ return SHOP; }, set FEDB(v){ FEDB = v; }, goBack, matchIng, dayTotals, PAIR, GENBY, workKind, groupReadiness, recoveryWarnings, nextSuggestions, exById, EX, stockBadge, suggestFor, warmupFor, strengthChange, planFor, e1rm, goBack, carbWindows, defaultLoc, grocText, guessType, guessPieces, portion, validGTIN, searchLocal, claudeText, GEN, parseRecipe, AI, Store, Phone, Account };

// Settings → Your Body: sex, height, weight; offers to recalculate targets
document.querySelectorAll('#sSex button').forEach(b => b.addEventListener('click', () => setSeg('#sSex', b.dataset.v)));
$('sBodySave').addEventListener('click', async () => {
  const sx = (document.querySelector('#sSex .on') || {}).dataset?.v || null, hh = Math.round(hIn($('sH').value) || 0), w = r1(bwIn(num('sW')));
  if(sx) profile.sex = sx; if(hh > 120 && hh < 230) profile.height = hh; saveProfile();
  if(w > 30 && w < 300){ weights[todayKey()] = w; Store.save('weights', weights); if(targets){ targets.bw = w; Store.save('targets', targets); } }
  renderAll(); toast(t('bodySaved'));
  const bw = w > 30 ? w : latestWeight() || (targets && targets.bw);
  if(bw && await ask(t('recalcQ'), t('recalcYes'), t('recalcNo'))){ const tg = calcTargets(bw, (targets && targets.goal) || 'bulk'); targets = { ...(targets || {}), ...tg }; Store.save('targets', targets); renderAll(); fillTargets(); toast(t('targetsSaved')); }   // 20B: the new numbers show in the targets on this page
});
addEventListener('hashchange', () => { if(location.hash === '#settings') fillSettings(); });
$('pfGear').addEventListener('click', () => { Phone.haptic(); go('settings'); });   // 0.7.7: Settings opens from the gear on Profile
$('sBackBtn').addEventListener('click', goBack);
// 0.7.9: profile photo + name (ui.js): Settings › Photo and Name, or a tap on your circle on Profile
$('sPhotoBtn').addEventListener('click', openPhoto);
$('pfBody').addEventListener('click', e => { if(e.target.closest('[data-pfphoto]')){ Phone.haptic(); openPhoto(); } });
$('phCam').addEventListener('click', () => phPick('camera')); $('phLib').addEventListener('click', () => phPick('library'));
$('phCancel').addEventListener('click', phEnd); $('phUse').addEventListener('click', phSave); $('phDel').addEventListener('click', phRemove);
$('phName').addEventListener('change', e => phName(e.target.value));
// 0.7.9.1: place the photo with your fingers, like iPhone Contacts: one finger drags it (shared drag helper), two fingers pinch to
// zoom (1× – 4×) around the point between them, double-tap resets. Past an edge or a zoom limit it gives a little, then springs back
// so the photo always fills the circle. Drawn once per frame; only the photo's transform changes. Mouse wheel zooms on a computer.
{ const c = $('phCirc'), P = new Map(); let pin = null, raf = 0, tap = 0, tapAt = null;
  const im = () => c.querySelector('img'), still = () => { const el = im(); if(el) el.getAnimations().forEach(a => a.cancel()); };
  const rub = (v, lo, hi) => v < lo ? lo + rubber(v - lo, 80) : v > hi ? hi + rubber(v - hi, 80) : v;
  const settle = v => { const p = PCROP, el = im(); if(!p || !el) return; const from = { x: p.x, y: p.y, s: p.z }; phClamp(); phDrawCrop();   // back inside the limits, with a spring
    if(Math.abs(from.x - p.x) + Math.abs(from.y - p.y) + Math.abs(from.s - p.z) * 100 > .5) springTo(el, from, { x: p.x, y: p.y, s: p.z }, v, { damp: 1 }); };
  const pinch = () => { raf = 0; const p = PCROP; if(!p || !pin || P.size < 2) return; const [a, b] = [...P.values()];
    let z = pin.z0 * (Math.hypot(a.x - b.x, a.y - b.y) || 1) / pin.d0; z = z < 1 ? 1 - rubber(1 - z, 2) : z > PH_ZMAX ? PH_ZMAX + rubber(z - PH_ZMAX, 4) : z;
    const mx = (a.x + b.x) / 2 - pin.cx, my = (a.y + b.y) / 2 - pin.cy;   // the point of the photo that was between the fingers stays between them
    p.z = z; p.x = mx - (pin.mx - pin.x0) * z / pin.z0; p.y = my - (pin.my - pin.y0) * z / pin.z0; phDrawCrop(true); };
  c.addEventListener('pointerdown', e => { if(!PCROP) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY }); try{ c.setPointerCapture(e.pointerId); }catch(x){}
    if(P.size === 2){ const [a, b] = [...P.values()], r = c.getBoundingClientRect(); still();   // read once, at the start of the pinch
      pin = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: PCROP.z, x0: PCROP.x, y0: PCROP.y, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      pin.mx = (a.x + b.x) / 2 - pin.cx; pin.my = (a.y + b.y) / 2 - pin.cy; tap = 0; return; }
    if(P.size === 1){ if(e.timeStamp - tap < 320 && tapAt && Math.hypot(e.clientX - tapAt.x, e.clientY - tapAt.y) < 30){   // double-tap: back to the start
        tap = 0; still(); const p = PCROP, from = { x: p.x, y: p.y, s: p.z }; p.x = 0; p.y = 0; p.z = 1; phDrawCrop(); springTo(im(), from, { x: 0, y: 0, s: 1 }, null, { damp: 1 }); Phone.haptic(); }
      else { tap = e.timeStamp; tapAt = { x: e.clientX, y: e.clientY }; } } });
  c.addEventListener('pointermove', e => { if(!P.has(e.pointerId)) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY }); if(pin && !raf) raf = requestAnimationFrame(pinch); });
  const up = e => { P.delete(e.pointerId); if(pin && P.size < 2){ pin = null; cancelAnimationFrame(raf); raf = 0; settle(null); } };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  dragger(c, { slop: 3,   // one finger: drag
    item: () => PCROP && !pin ? c : null,
    start: s => { still(); s.px = PCROP.x; s.py = PCROP.y; },
    move: s => { const p = PCROP; if(!p || pin) return; const { mx, my } = phLimits(p.z); p.x = rub(s.px + s.dx, -mx, mx); p.y = rub(s.py + s.dy, -my, my); phDrawCrop(true); },
    end: s => { if(!pin) settle({ x: s.vx, y: s.vy }); },
    multi: () => {} });   // a second finger: the drag stops where it is and the pinch takes over
  c.addEventListener('wheel', e => { if(!PCROP) return; e.preventDefault(); still(); PCROP.z *= Math.exp(-e.deltaY * .002); phDrawCrop(); }, { passive: false }); }
railAvatar();

// 0.7.7 Profile: Share a Workout opens the saved workouts list in Gym Buddy, unfolded (each row has its QR button, gym-qr)
$('pfBody').addEventListener('click', e => { if(!e.target.closest('#pfShare')) return; Phone.haptic(); LIBF.saved = true; switchTab(0, 'gym', 'gym-lib'); });
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
$('thBar').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(b) setTheme({ bar: b.dataset.v }); });   // 0.7.10.7: Status Bar (takes effect at the next launch)
$('thSw').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if(b) setTheme({ preset: b.dataset.preset }); });

// ---------- 0.6.9: Settings in groups — each row opens its own page ----------
document.addEventListener('click', e => { const r = e.target.closest('[data-sp]'); if(!r) return; if(r.dataset.sp === 'ovSUnits') drawUnits(); if(r.dataset.sp === 'ovSTime') drawTimeFmt(); if(r.dataset.sp === 'ovSFood') $('sFoodBody').innerHTML = foodPrefsHtml(profile.foodPrefs); if(r.dataset.sp === 'ovSAbout') $('sAboutVer').textContent = 'Food Tracker · Gym Buddy · v' + VERSION; if(r.dataset.sp === 'ovSBody' || r.dataset.sp === 'ovSAI') fillSettings(); open(r.dataset.sp); });
function drawUnits(){ const u = UN(); setSeg('#unW', u.w); setSeg('#unH', u.h); setSeg('#unF', u.f);
  document.querySelectorAll('[data-sp="ovSUnits"] .sv').forEach(s => s.textContent = `${u.w} · ${u.h === 'ft' ? 'ft' : 'cm'} · ${u.f}`); }
[['unW', 'w'], ['unH', 'h'], ['unF', 'f']].forEach(([id, k]) => $(id).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(!b) return;
  ui.units = { ...UN(), [k]: b.dataset.v }; saveUI(); drawUnits(); fillSettings(); renderAll(); }));
drawUnits();
// V3: Settings › Customize › Time Format. Saved in ui (device setting); only what is shown changes, never a stored time.
['input', 'change'].forEach(ev => document.addEventListener(ev, e => { const i = e.target; if(i && i.matches && i.matches('.wptime input')){ const sp = i.closest('.wptime').firstElementChild; if(sp !== i) sp.textContent = fmtClock(i.value) || '--:--'; } }));
function drawTimeFmt(){ const m = ui.timeFmt === '12' || ui.timeFmt === '24' ? ui.timeFmt : 'system'; setSeg('#tmF', m);
  $('sTimeVal').textContent = t(m === '12' ? 'tm12' : m === '24' ? 'tm24' : 'tmSys'); }
$('tmF').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(!b) return; if(b.dataset.v === 'system') delete ui.timeFmt; else ui.timeFmt = b.dataset.v;
  saveUI(); drawTimeFmt(); syncClocks(); renderAll(); });
drawTimeFmt();

// 0.6.9.3: Customize › Use the app for (also asked at first launch)
$('sUse').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if(!b) return; ui.gymFirst = b.dataset.v === 'gym'; saveUI(); applyTabOrder(); toast(t(ui.gymFirst ? 'useGymOn' : 'useBothOn')); });
// 0.7.9: Settings › Tabs › Kitchen Tab (off = four tabs; Recipes always stay in Food Library)
$('sKitchen').addEventListener('change', e => { ui.noKitchen = !e.target.checked; if(!ui.noKitchen) delete ui.noKitchen; saveUI(); applyTabOrder(); markRail(tabOf(location.hash.slice(1))); renderAll(); });   // Refinements #4: stock and fridge bits appear or vanish at once
applyTabOrder();

$('sFoodBody').addEventListener('click', e => { const c = e.target.closest('.fpchips button'); if(c){ c.classList.toggle('on'); Phone.haptic(); } });
$('sFoodSave').addEventListener('click', () => { saveFoodPrefs(readFoodPrefs($('sFoodBody'))); toast(t('fpSaved')); close('ovSFood'); });

// 0.7.4.3: the shared coach chat (js/coach.js)
Coach.init(); aiGate(); pillsBoot();   // and greys out the AI controls when there is no key
