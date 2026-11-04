// App shell: navigation, tabs, launcher, sheets, toasts, setup, settings, backup, motion, haptics, in-app pickers. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  document.querySelectorAll('[data-th]').forEach(el => el.innerHTML = t(el.dataset.th));
  document.querySelectorAll('[data-tp]').forEach(el => el.placeholder = t(el.dataset.tp));
  setSeg('#sLang', lang);
}

function toast(msg, actLabel, act){
  $('toastMsg').textContent = msg; const b = $('toastAct');
  if(actLabel){ b.textContent = actLabel; b.classList.remove('hide'); b.onclick = () => { $('toast').classList.remove('show'); act(); }; }
  else { b.classList.add('hide'); b.onclick = null; }
  $('toast').classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), actLabel ? 5000 : 2200);
}

function go(h){ if(location.hash === '#' + h) route(); else location.hash = h; }

// ---------- cooking: choose first, then the details ----------
function cookStep(main){ $('cookStart').classList.toggle('hide', main); $('cookMain').classList.toggle('hide', !main); }

function navTo(h){ if(location.hash.slice(1) === h){ route(); return; } navMode = true; location.hash = h; }

function goBack(){
  const opens = [...document.querySelectorAll('.overlay.open')].filter(o => o.id !== 'ovLang').sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0));
  if(opens.length){
    const top = opens[0].id;
    if(top === 'ovExPick' && (PK.group || PK.eq)){ PK.fwd = { group: PK.group, head: PK.head, eq: PK.eq }; if(PK.eq) PK.eq = null; else { PK.group = null; PK.head = null; } drawExPick(); return; }
    if(top === 'ovSession'){ close('ovSession'); renderAll(); } else close(top); return;
  }
  // 0.5.9: back never leaves the current tab. A sub-page goes to the page it came from inside the same tab, else to the tab's main page.
  const h = location.hash.slice(1), tab = tabOf(h), root = TAB_ROOT[tab];
  if(h === root) return;
  const prev = NAVI > 0 ? NAV[NAVI - 1] : null;
  if(prev && prev !== h && tabOf(prev) === tab){ NAVI--; navTo(prev); return; }
  NAV = [root]; NAVI = 0; navTo(root);
}

function goForward(){
  if(document.querySelector('#ovExPick.open') && PK.fwd){ Object.assign(PK, PK.fwd); PK.fwd = null; drawExPick(); return; }
  if(document.querySelector('.overlay.open')) return;
  if(NAVI < NAV.length - 1 && tabOf(NAV[NAVI + 1]) === tabOf(location.hash.slice(1))){ NAVI++; navTo(NAV[NAVI]); }
}

function route_053(){
  let h = location.hash.replace('#','');
  const page = h === 'foods' || h === 'meals' || h === 'supps' ? 'foods' : h.startsWith('gym') ? 'gym' : ['today','fridge','groc','settings'].includes(h) ? h : 'foods';
  [['pgHome','home'],['pgFoods','foods'],['pgSupps','supps'],['pgToday','today'],['pgFridge','fridge'],['pgGroc','groc'],['pgGym','gym'],['pgLaunch','start'],['pgSettings','settings']].forEach(([id, p]) => $(id) && $(id).classList.toggle('hide', page !== p));
  const tab = h === 'meals' ? 'meals' : h === 'supps' ? 'supps' : 'store';   // 0.6.3.1: three tabs
  setSeg('#foodTabs', tab);
  $('storeView').classList.toggle('hide', tab !== 'store');
  $('mealsView').classList.toggle('hide', tab !== 'meals');
  $('foodSupps').classList.toggle('hide', tab !== 'supps');
  document.querySelectorAll('.fgseg').forEach(sg => sg.querySelectorAll('[data-fg]').forEach(b => b.classList.toggle('on', b.dataset.fg === page)));
  const ft = tabOf(h); markRail(ft);
  ui['lastIn_' + ft] = h; saveUI();
  const fab = $('fab');
  fab.classList.toggle('hide', page === 'groc' || page === 'settings' || (page === 'gym' && !!GSEC[h] && GSEC[h] !== 'tpl'));
  fab.textContent = page === 'today' ? t('logFab') : page === 'fridge' ? t('fridgeFab') : tab === 'meals' ? t('cookFab') : tab === 'supps' ? t('addSuppFab') : t('addFoodFab');
  fab.dataset.action = ['today','fridge','gym'].includes(page) ? page : tab;
  if(h === 'gym-lib'){ fab.dataset.action = 'gymlib'; fab.textContent = '＋ ' + t('createWorkout'); }
  else if(page === 'gym') fab.textContent = active ? t('resume', { m: Math.floor(sesMs() / 60000) }) : '▶ ' + t('startWk');
  renderAll();
  const pg = document.querySelector('section.page:not(.hide)'); if(pg && !navKeepScroll) pg.scrollTop = 0;
}

function renderLaunch(){
  const hr = new Date().getHours(); $('lHello').textContent = t(hr < 12 ? 'hiMorning' : hr < 18 ? 'hiDay' : 'hiEvening') + ' 👋';
  const tk = todayKey(), tg = targetFor(tk), tot = dayTotals(tk), pl = planFor(tk), tp = pl && pl.tpl && tpls.find(x => x.id === pl.tpl);
  $('lbFood').textContent = t('lFoodSub', { n: foods.length, f: liveItems().length });
  $('lbToday').textContent = tg ? t('lTodaySub', { a: Math.round(tot.kcal).toLocaleString(), b: tg.k.toLocaleString() }) : t('lTodayNo', { a: Math.round(tot.kcal) });
  $('lbGym').textContent = sessions.some(s => s.date === tk) ? t('lGymDone') : pl && pl.type === 'gym' ? t('lGymPlan', { n: tp ? tp.name : t('gymAny'), t: pl.time || '' }) : pl && pl.type === 'rest' ? t('lGymRest') : t('lGymNone');
  $('lBar').style.width = tg ? `${Math.min(100, tot.kcal / tg.k * 100)}%` : '0'; renderBackupCard($('lBackup'));
}

function launchTo(tab, btn){
  const target = () => { if(tab === 'today') curDay = todayKey(); go(TAB_ROOT[tab]); };
  const bubbles = [...document.querySelectorAll('#pgLaunch .bubble')], bar = $('tabbar');
  if(!btn || matchMedia('(prefers-reduced-motion: reduce)').matches || !bubbles[0].animate){ target(); return; }
  bar.classList.remove('hide'); bar.style.opacity = '0';
  const tabs = TABS3.map(k => bar.querySelector(`[data-tab="${k}"]`));
  const anims = bubbles.map((b, i) => { const r = b.getBoundingClientRect(), tr = tabs[i].getBoundingClientRect();
    const dx = tr.left + tr.width / 2 - (r.left + r.width / 2), dy = tr.top + tr.height / 2 - (r.top + r.height / 2), s = Math.min(tr.width / r.width, tr.height / r.height);
    return b.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: b === btn ? 1 : .5 }], { duration: 430, easing: 'cubic-bezier(.55,0,.2,1)', fill: 'forwards', delay: b === btn ? 0 : 40 }); });
  bar.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 260, fill: 'forwards' });
  setTimeout(() => { bar.style.opacity = ''; bar.getAnimations().forEach(a => a.cancel()); target(); anims.forEach(a => a.cancel()); }, 470);
}

// ---------- tabs: Today → Gym → Food → Fridge, switched from the side strip or a short pull past the end ----------
let navKeepScroll = false, SWITCHING = false;
function markRail(tab){ const rail = $('rail'); if(!rail) return; rail.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); }
function tabTarget(tab){ if(tab === 'today'){ curDay = todayKey(); return 'today'; }
  const last = ui['lastIn_' + tab]; return last && tabOf(last) === tab ? last : TAB_ROOT[tab]; }
function switchTab(dir, toTab){
  const h = location.hash.slice(1), cur = tabOf(h), i = tabIdx(cur);   // Settings sits below Fridge
  const tab = toTab || TABS3[i + dir]; if(!tab || tab === cur || SWITCHING) return;
  if(!dir) dir = tabIdx(tab) > i ? 1 : -1;
  const pg = document.querySelector('section.page:not(.hide)'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!pg || reduce || !pg.animate){ const tg = tabTarget(tab); if(location.hash.slice(1) === tg) route(); else location.replace('#' + tg); return; }
  // plain slide: this page moves out, the next one moves in (down = next tab slides up from below)
  SWITCHING = true;
  const ghost = pg.cloneNode(true), top = pg.scrollTop; ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  ghost.classList.add('pghost'); ghost.setAttribute('aria-hidden', 'true'); document.body.appendChild(ghost); ghost.scrollTop = top;
  const opt = { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' }, target = tabTarget(tab);
  const run = () => { const np = document.querySelector('section.page:not(.hide):not(.pghost)');
    ghost.animate([{ transform: 'none' }, { transform: `translateY(${dir > 0 ? -100 : 100}%)` }], { ...opt, fill: 'forwards' });
    if(np) np.animate([{ transform: `translateY(${dir > 0 ? 100 : -100}%)` }, { transform: 'none' }], opt);
    setTimeout(() => { ghost.remove(); SWITCHING = false; }, 300); };
  if(location.hash.slice(1) === target){ route(); run(); }
  else { addEventListener('hashchange', run, { once: true }); location.replace('#' + target); }   // 0.6.5: replace, not push — the phone's back never jumps tabs; the page swaps on hashchange, then it slides
}

function route(){
  const h = location.hash.slice(1);
  if(!h || h === 'start' || h === 'home'){ history.replaceState(null, '', h === 'home' ? '#foods' : '#today'); }
  $('pgLaunch').classList.add('hide'); $('tabbar').classList.add('hide');
  route_053();
}

function openSetup(){
  const tg = targets || {}; const gymDays = Object.entries(gymPlan).filter(([, p]) => p && p.tpl && p.tpl !== 'rest').map(([wd]) => +wd);
  const workDays = Object.entries(gymPlan).filter(([, p]) => p && p.work).map(([wd]) => +wd), w0 = workDays.length ? gymPlan[workDays[0]].work : { from: '09:00', to: '17:00' };
  SUP = { step: 0, lang: lang, bw: tg.bw || '', goal: tg.goal || 'bulk', gym: new Set(gymDays.length ? gymDays : [1, 3, 5]), time: ui.gymTime || '18:00',
    work: workDays.length > 0, workDays: new Set(workDays.length ? workDays : [1, 2, 3, 4, 5]), from: w0.from, to: w0.to, key: settings.geminiKey || '', sex: ui.sex || null, h: ui.height || '' };
  drawSetup(); open('ovSetup');
}

function drawSetup(){
  const s = SUP.step, wdn = WD(), dayChips = (set, attr) => `<div class="tchips daychips">${WD1().map(d => `<button data-${attr}="${d}" class="${set.has(d) ? 'on' : ''}">${wdn[d].slice(0, 3)}</button>`).join('')}</div>`;
  let h = `<div class="sudots">${[0, 1, 2, 3, 4].map(i => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>`;
  if(s === 0) h += `<h2>${t('suWelcome')}</h2><p class="sub">${t('suWelcomeSub')}</p><div class="langpick"><button data-sulang="en" class="${lang === 'en' ? 'on' : ''}"><span style="font-size:26px">🇬🇧</span> English</button><button data-sulang="el" class="${lang === 'el' ? 'on' : ''}"><span style="font-size:26px">🇬🇷</span> Ελληνικά</button></div>`;
  if(s === 1) h += `<h2>${t('suAbout')}</h2><label>${t('suSex')}</label><div class="seg" id="suSex"><button data-v="m" class="${SUP.sex === 'm' ? 'on' : ''}">${t('suMale')}</button><button data-v="f" class="${SUP.sex === 'f' ? 'on' : ''}">${t('suFemale')}</button></div>
    <label for="suH">${t('suHeight')}</label><div class="brandrow"><input id="suH" type="number" inputmode="numeric" value="${SUP.h || ''}" placeholder="178" style="flex:1"><span style="color:var(--muted)">cm</span></div><label for="suBw">${t('suWeight')}</label><div class="brandrow"><input id="suBw" type="number" inputmode="decimal" step="any" value="${SUP.bw}" placeholder="75" style="flex:1"><span style="color:var(--muted)">kg</span></div>
    <label>${t('suGoal')}</label><div class="seg" id="suGoal">${['bulk', 'recomp', 'cut'].map(g => `<button data-v="${g}" class="${SUP.goal === g ? 'on' : ''}">${t({ bulk: 'gBulk', recomp: 'gRecomp', cut: 'gCut' }[g])}</button>`).join('')}</div>`;
  if(s === 2) h += `<h2>${t('suWeek')}</h2><label>${t('suGymDays')}</label>${dayChips(SUP.gym, 'sugym')}
    <div class="brandrow" style="margin-top:12px"><label for="suTime" style="margin:0;flex:1">${t('suGymTime')}</label><input id="suTime" type="time" value="${SUP.time}" style="flex:0 0 130px"></div>
    <label class="check" style="margin-top:14px"><input type="checkbox" id="suWork" ${SUP.work ? 'checked' : ''}><span>${t('suWorkQ')}</span></label>
    <div id="suWorkBox" class="${SUP.work ? '' : 'hide'}"><label>${t('suWorkDays')}</label>${dayChips(SUP.workDays, 'suwd')}
      <div class="grid" style="margin-top:8px"><div><label for="suFrom">${t('suFrom')}</label><input id="suFrom" type="time" value="${SUP.from}"></div><div><label for="suTo">${t('suTo')}</label><input id="suTo" type="time" value="${SUP.to}"></div></div></div>`;
  if(s === 3) h += `<h2>${t('suAi')}</h2><p class="sub">${t('suAiSub')}</p><input id="suKey" type="password" autocomplete="off" value="${esc(SUP.key)}" placeholder="AIza…"><div class="actions" style="margin-top:8px"><button class="btn" id="suGetKey">${t('getKey')}</button></div>`;
  if(s === 4){ const tg = calcTargets(SUP.bw, SUP.goal); h += `<div style="font-size:54px;text-align:center;margin:10px 0">✅</div><h2 style="text-align:center">${t('suDone')}</h2><p class="sub" style="text-align:center">${t('suDoneSub', { g: tg.gym.k.toLocaleString(), r: tg.rest.k.toLocaleString(), p: tg.gym.p })}</p>`; }
  h += `<div class="actions">${s > 0 ? `<button class="btn" data-sunav="-1">${t('suBack')}</button>` : `<button class="btn" data-suskip>${t('suSkip')}</button>`}${s === 3 ? `<button class="btn" data-sunav="1" data-skipkey>${t('suSkip')}</button>` : ''}<button class="btn primary" data-sunav="${s === 4 ? 'done' : 1}">${s === 4 ? t('suFinish') : t('suNext')}</button></div>`;
  $('suBody').innerHTML = h;
}

function readSetup(){ const v = id => $(id) ? $(id).value : null;
  if($('suBw')) SUP.bw = num('suBw') || ''; if($('suH')) SUP.h = num('suH') || ''; if($('suTime')) SUP.time = v('suTime') || '18:00'; if($('suFrom')) SUP.from = v('suFrom') || '09:00'; if($('suTo')) SUP.to = v('suTo') || '17:00'; if($('suKey')) SUP.key = v('suKey').trim(); }

function calcTargets(bw, goal, sex, hcm){
  sex = sex || ui.sex; hcm = hcm || ui.height;
  if(sex && hcm > 120){   // 0.6.2: from sex + height + weight (age ~25 assumed), lightly active + training
    const maint = (10 * bw + 6.25 * hcm - 5 * 25 + (sex === 'f' ? -161 : 5)) * 1.5, gymK = maint + { bulk: 250, recomp: 0, cut: -450 }[goal];
    const prot = Math.round(bw * (goal === 'cut' ? 2.2 : 2) / 5) * 5, fpk = sex === 'f' ? .1 : 0;
    const mk = (k, fatPerKg) => { const f = Math.round(bw * fatPerKg / 5) * 5, kk = Math.round(k / 50) * 50; return { k: kk, p: prot, f, c: Math.max(0, Math.round((kk - prot * 4 - f * 9) / 4 / 5) * 5) }; };
    return { goal, bw, sex, h: hcm, gym: mk(gymK, .9 + fpk), rest: mk(gymK - (goal === 'cut' ? 200 : 250), 1 + fpk) };
  }
  const kg = { bulk: 36, recomp: 33, cut: 28 }[goal], prot = Math.round(bw * (goal === 'cut' ? 2.2 : 2) / 5) * 5;
  const mk = (k, fatPerKg) => { const f = Math.round(bw * fatPerKg / 5) * 5, kk = Math.round(k / 50) * 50; return { k: kk, p: prot, f, c: Math.max(0, Math.round((kk - prot * 4 - f * 9) / 4 / 5) * 5) }; };
  return { goal, bw, gym: mk(bw * kg, .9), rest: mk(bw * kg - (goal === 'cut' ? 200 : 250), 1) };
}

function finishSetup(){
  if(SUP.sex) ui.sex = SUP.sex; if(SUP.h > 120) ui.height = SUP.h; if(SUP.bw > 30 && !Object.keys(weights || {}).length){ weights[todayKey()] = SUP.bw; store(WKEY, weights); }
  const tg = calcTargets(SUP.bw, SUP.goal); targets = { ...(targets || {}), ...tg }; store(TGKEY, targets);
  ui.gymTime = SUP.time; WD1().forEach(d => { const p = { ...(gymPlan[d] || {}) };
    if(SUP.gym.has(d)){ if(!p.tpl || p.tpl === 'rest') p.tpl = 'gym'; p.time = p.time || SUP.time; } else if(p.tpl === 'gym') delete p.tpl;
    if(SUP.work && SUP.workDays.has(d)) p.work = { from: SUP.from, to: SUP.to }; else delete p.work;
    if(p.tpl || p.work) gymPlan[d] = p; else delete gymPlan[d]; });
  saveG('plan'); if(SUP.key !== settings.geminiKey){ settings.geminiKey = SUP.key; store(SKEY, settings); }
  ui.setupDone = true; ui.lang = lang; saveUI(); close('ovSetup'); renderAll(); if(location.hash.slice(1) === 'start') renderLaunch();
}

// ---------- weekly backup, one tap to the share sheet (iCloud Drive / Files) ----------
function backupBlob(){ return new Blob([JSON.stringify({ app: 'tracker', version: VERSION, exportedAt: new Date().toISOString(), foods, meals, supps, suppLog, fridge, groc, dayLog, days, targets, plans, weights, gym: { custom: exCustom, tpl: tpls, plan: gymPlan, sessions, comeback }, pet }, null, 2)], { type: 'application/json' }); }

async function backupNow(){
  const name = `tracker-${todayKey()}.json`, blob = backupBlob();
  try{ const file = new File([blob], name, { type: 'application/json' });
    if(navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: name }); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
    ui.lastBackup = new Date().toISOString(); saveUI(); toast(t('bkDone')); renderAll(); if(location.hash.slice(1) === 'start') renderLaunch();
  }catch(e){ if(e && e.name !== 'AbortError') toast(e.message || 'backup'); }
}

function renderBackupCard(el){
  if(!el) return; const has = foods.length + Object.keys(dayLog).length + sessions.length > 0, last = ui.lastBackup ? new Date(ui.lastBackup) : null;
  const due = has && (!last || (Date.now() - last) / 864e5 >= 7);
  el.innerHTML = due ? `<button class="bkcard" data-backup><b>${t('bkT')}</b><small>${t('bkSub', { d: last ? fmtDate(last.toISOString()) : t('bkNever') })}</small></button>` : '';
}

function ask(msg, yes, no){
  return new Promise(res => { ASK = res; $('askMsg').textContent = msg; $('askYes').textContent = yes || t('ok_'); $('askNo').textContent = no || t('cancel'); open('ovAsk'); });
}

function syncSel(s){ const b = s.nextElementSibling; if(b && b.classList.contains('selbtn')) b.firstChild.textContent = selLabel(s); }

function enhanceSel(s){
  if(s.dataset.enh) { syncSel(s); return; } s.dataset.enh = '1'; s.classList.add('nsel');
  const b = document.createElement('button'); b.type = 'button'; b.className = 'selbtn'; b.innerHTML = '<span></span><i>⌄</i>'; b.firstChild.textContent = selLabel(s);
  if(s.style.flex) b.style.flex = s.style.flex;
  s.after(b);
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); PICKSEL = s;
    const lbl = s.id && document.querySelector(`label[for="${s.id}"]`);
    $('pickT').textContent = lbl ? lbl.textContent : '';
    $('pickList').innerHTML = [...s.options].map((o, i) => `<button class="pickopt ${i === s.selectedIndex ? 'on' : ''}" data-pi="${i}" ${o.disabled ? 'disabled' : ''}>${esc(o.textContent)}${i === s.selectedIndex ? '<b>✓</b>' : ''}</button>`).join('');
    open('ovPick'); });
}

// ---------- numbers: comma or point both work (Greek keyboards type a comma) ----------
function fixNum(inp){
  if(inp.type !== 'number' || inp.dataset.nfix) return; inp.dataset.nfix = '1';
  const im = inp.getAttribute('inputmode'); inp.type = 'text'; inp.setAttribute('inputmode', im === 'numeric' ? 'numeric' : 'decimal'); inp.setAttribute('autocomplete', 'off');
}

// ---------- tiny haptic taps (iPhone: hidden switch trick, Android: vibrate) ----------
function haptic(){ try{ if(navigator.vibrate && !/iPhone|iPad/.test(navigator.userAgent)) navigator.vibrate(8); else $('hapL').click(); }catch(_){} }

// ---------- animations: sheets slide in/out, new rows fade in, removed rows fade out ----------
function close(id){ const el = $(id); if(!el) return; const was = el.classList.contains('open'); el.classList.remove('open'); if(id === 'ovScan') stopScan(); if(id === 'ovSession') keepAwake(false); if(id === 'ovExPick') $('pkBulb').classList.add('hide');
  if(was && !matchMedia('(prefers-reduced-motion: reduce)').matches){ el.classList.add('closing'); clearTimeout(el._ct); el._ct = setTimeout(() => el.classList.remove('closing'), 200); } }

function open(id){ const el = $(id); el.classList.remove('closing'); clearTimeout(el._ct); el.style.zIndex = ++zTop; el.classList.add('open'); }

// ======================= settings + data =======================
function openSettings(){ $('sKey').value = settings.geminiKey; $('sModel').value = settings.model; setSeg('#sLang', lang); status($('keyStatus'), ''); $('keyStatus').style.color = '';
  $('keySteps').innerHTML = KEY_STEPS[lang === 'el' ? 'el' : 'en'].map(x => `<li>${x}</li>`).join(''); open('ovSettings'); }

function setLang(l){ lang = l; ui.lang = l; saveUI(); applyLang(); route(); }

function tabIdx(tab){ return tab === 'settings' ? TABS3.length : TABS3.indexOf(tab); }   // 0.6.3.1: Settings is a page under Fridge
