// ---------- icons (canvas Phones.dc.html): line icons, stroke = currentColor ----------
const ICON = {
  today: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  gym: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  food: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  fridge: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v1M9 13v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M12 9v6M16 9v6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', down: '<path d="M6 9l6 6 6-6"/>',
};
const svgIcon = (k, size, sw) => `<svg width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const BACK_SVG = svgIcon('back', 28, 2.4);   // every back control is this plain arrow (no box)

// ---------- sliding pills (canvas Main.dc.html): every selector has one knob that glides to the chosen button ----------
// Works for main pills (.mpill), secondary pills (.seg) and the bottom bar (.rail, 52×44 bubble). Whatever code toggles
// .on on a button, the knob follows: one observer watches class changes and re-rendered selectors.
// ---------- Settings › Theme (canvas ThemeMenu.dc.html): Dark / Light / Automatic + nine accent presets on one neutral grey base ----------
// [id, name, dark accent, dark text-on-accent, light accent, light text-on-accent]. A device setting (ui.theme), not synced.
const THEMES = [
  ['lime', 'Lime', '#c6f432', '#0f1113', '#8fbb12', '#0f1113'], ['ocean', 'Ocean', '#3fd5e0', '#061316', '#0f9aa6', '#ffffff'],
  ['sunset', 'Sunset', '#ff8c4a', '#1a0d06', '#e8692a', '#1a0d06'], ['violet', 'Violet', '#b39bff', '#120d22', '#7457ea', '#ffffff'],
  ['mono', 'Mono', '#f1f3f5', '#0a0a0b', '#1d1f22', '#f4f4f5'], ['red', 'Racing Red', '#ff4d4d', '#1a0606', '#d42c2c', '#ffffff'],
  ['gold', 'Gold', '#f2c14e', '#1a1306', '#c08c0c', '#1a1306'], ['mint', 'Mint', '#5fe3b0', '#04170f', '#16a673', '#04170f'],
  ['pink', 'Soft Pink', '#ff9ec7', '#2a0a18', '#db4f8c', '#ffffff'] ];
const THEME_WARM = ['sunset', 'red', 'gold', 'pink'];   // "Ready" muscles use green in these so they don't look like "Sore"
function themeNow(){ const th = (typeof ui === 'object' && ui && ui.theme) || {}, mode = ['dark', 'light', 'auto'].includes(th.mode) ? th.mode : 'dark', p = THEMES.find(x => x[0] === th.preset) || THEMES[0];
  return { mode, p, look: mode === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode }; }
function applyTheme(){
  const { p, look } = themeNow(), L = look === 'light', mono = p[0] === 'mono', r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
  r.setAttribute('data-theme', look);
  set('--t-accent', L ? p[4] : p[2]); set('--t-on', L ? p[5] : p[3]);
  set('--t-mp-text', mono ? (L ? '#ffffff' : '#0a0a0b') : p[2]);                 // the main pill keeps the bright accent (on black in Light)
  set('--t-mp-stroke', !L && !mono ? '2.4px #0b0d0f' : '0');
  set('--t-ready', THEME_WARM.includes(p[0]) ? 'var(--t-done)' : 'var(--t-accent)');
  const m = document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content', L ? '#e2e3e6' : '#000000');
  pillsAll && pillsAll();
}
function drawTheme(){
  const { mode, p, look } = themeNow(), L = look === 'light';
  setSeg('#thMode', mode); $('thNote').textContent = t(mode === 'auto' ? 'thAutoNote' : 'thLightNote');
  $('thSw').innerHTML = THEMES.map(x => `<button type="button" data-preset="${x[0]}" class="${x[0] === p[0] ? 'on' : ''}" style="--sw:${L ? x[4] : x[2]}" aria-label="${x[1]}" aria-pressed="${x[0] === p[0]}"><i></i><span>${x[1]}</span></button>`).join('');
  const v = $('sThemeVal'); if(v) v.textContent = `${t({ dark: 'thDark', light: 'thLight', auto: 'thAuto' }[mode])} · ${p[1]}`;
}
function setTheme(ch){ ui.theme = { ...(ui.theme || {}), ...ch }; saveUI(); applyTheme(); drawTheme(); if(location.hash.slice(1) === 'gym-rec' && typeof renderRecovery === 'function') renderRecovery(); }
try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if(themeNow().mode === 'auto') setTheme({}); }); }catch(e){}

const PILL_SEL = '.mpill,.seg,.rail';
function pillSync(el){
  let k = el.querySelector(':scope > .knob'), fresh = false;
  if(!k){ k = document.createElement('i'); k.className = 'knob'; k.setAttribute('aria-hidden', 'true'); el.prepend(k); fresh = true; pillRO && pillRO.observe(el); }
  const b = el.querySelector(':scope > button.on');
  if(!b || !b.offsetWidth){ k.style.opacity = 0; k.dataset.shown = ''; return; }
  const rail = el.classList.contains('rail'), w = rail ? 52 : b.offsetWidth, hh = rail ? 44 : b.offsetHeight,
    x = b.offsetLeft + (b.offsetWidth - w) / 2, y = b.offsetTop + (b.offsetHeight - hh) / 2, jump = fresh || !k.dataset.shown;
  if(jump) k.style.transition = 'none';
  k.style.width = w + 'px'; k.style.height = hh + 'px'; k.style.transform = `translate(${x}px,${y}px)`; k.style.opacity = 1; k.dataset.shown = '1';
  if(jump){ void k.offsetWidth; k.style.transition = ''; }
}
const pillRO = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => pillSync(e.target))) : null;
let pillQ = new Set(), pillRaf = 0;
function pillQueue(el){ pillQ.add(el); if(!pillRaf) pillRaf = requestAnimationFrame(() => { pillRaf = 0; const q = [...pillQ]; pillQ.clear(); q.forEach(e => e.isConnected && pillSync(e)); }); }
function pillsAll(){ document.querySelectorAll(PILL_SEL).forEach(pillQueue); }
new MutationObserver(recs => { for(const r of recs){
    const t = r.target; if(t.nodeType !== 1) continue;
    if(r.type === 'attributes'){ if(t.matches(PILL_SEL)) pillQueue(t); else if(t.parentElement && t.parentElement.matches(PILL_SEL)) pillQueue(t.parentElement); continue; }   // a hidden selector that appears is caught by the ResizeObserver
    if(t.matches(PILL_SEL)) pillQueue(t);
    r.addedNodes.forEach(n => { if(n.nodeType !== 1) return; if(n.matches(PILL_SEL)) pillQueue(n); n.querySelectorAll && n.querySelectorAll(PILL_SEL).forEach(pillQueue); });
  } }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
addEventListener('resize', pillsAll); document.addEventListener('DOMContentLoaded', pillsAll); if(document.fonts) document.fonts.ready.then(pillsAll);


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
  let h = location.hash.slice(1);
  if(!h || h === 'start' || h === 'home'){ history.replaceState(null, '', h === 'home' ? '#foods' : '#today'); }
  $('pgLaunch').classList.add('hide'); $('tabbar').classList.add('hide');
  h = location.hash.replace('#','');   // re-read: the start page may have just switched it
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

function openSetup(){
  const tg = targets || {}; const gymDays = Object.entries(gymPlan).filter(([, p]) => p && p.tpl && p.tpl !== 'rest').map(([wd]) => +wd);
  const workDays = Object.entries(gymPlan).filter(([, p]) => p && p.work).map(([wd]) => +wd), w0 = workDays.length ? gymPlan[workDays[0]].work : { from: '09:00', to: '17:00' };
  SUP = { step: 0, lang: lang, bw: tg.bw || '', goal: tg.goal || 'bulk', gym: new Set(gymDays.length ? gymDays : [1, 3, 5]), time: profile.gymTime || '18:00',
    work: workDays.length > 0, workDays: new Set(workDays.length ? workDays : [1, 2, 3, 4, 5]), from: w0.from, to: w0.to, key: settings.geminiKey || '', sex: profile.sex || null, h: profile.height || '' };
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
  sex = sex || profile.sex; hcm = hcm || profile.height;
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
  if(SUP.sex) profile.sex = SUP.sex; if(SUP.h > 120) profile.height = SUP.h; if(SUP.bw > 30 && !Object.keys(weights || {}).length){ weights[todayKey()] = SUP.bw; Store.save('weights', weights); }
  const tg = calcTargets(SUP.bw, SUP.goal); targets = { ...(targets || {}), ...tg }; Store.save('targets', targets);
  profile.gymTime = SUP.time; WD1().forEach(d => { const p = { ...(gymPlan[d] || {}) };
    if(SUP.gym.has(d)){ if(!p.tpl || p.tpl === 'rest') p.tpl = 'gym'; p.time = p.time || SUP.time; } else if(p.tpl === 'gym') delete p.tpl;
    if(SUP.work && SUP.workDays.has(d)) p.work = { from: SUP.from, to: SUP.to }; else delete p.work;
    if(p.tpl || p.work) gymPlan[d] = p; else delete gymPlan[d]; });
  saveG('plan'); if(SUP.key !== settings.geminiKey){ settings.geminiKey = SUP.key; Store.save('settings', settings); }
  ui.setupDone = true; ui.lang = lang; saveUI(); saveProfile(); close('ovSetup'); renderAll(); if(location.hash.slice(1) === 'start') renderLaunch();
}

// ---------- weekly backup, one tap to the share sheet (iCloud Drive / Files) ----------
function backupBlob(){ return new Blob([JSON.stringify(Store.snapshot(), null, 2)], { type: 'application/json' }); }

async function backupNow(){
  const name = `tracker-${todayKey()}.json`, blob = backupBlob();
  try{ await Phone.shareFile(blob, name);
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
const haptic = () => Phone.haptic();

// ---------- animations: sheets slide in/out, new rows fade in, removed rows fade out ----------
function close(id){ AI.noteClose(id); const el = $(id); if(!el) return; const was = el.classList.contains('open'); el.classList.remove('open'); if(id === 'ovScan') stopScan(); if(id === 'ovSession') keepAwake(false); if(id === 'ovExPick') $('pkBulb').classList.add('hide');
  if(was && !matchMedia('(prefers-reduced-motion: reduce)').matches){ el.classList.add('closing'); clearTimeout(el._ct); el._ct = setTimeout(() => el.classList.remove('closing'), 200); } }

function open(id){
  if(AI.holdOpen(id)) return;   // an AI answer is landing: the window waits behind the ✨ bubble
  const el = $(id); el.classList.remove('closing'); clearTimeout(el._ct); el.style.zIndex = ++zTop; el.classList.add('open');
  // search windows sit in the top two thirds at a fixed size (the list drops down under the box); short ones float in the middle at a steady size
  const searchy = !!el.querySelector('input[type=search],input.search,#exSearch,#iSearch,#lSearch,#fSearch2'); el.classList.toggle('searchy', searchy);
  if(searchy){ el.classList.remove('center'); return; }
  if(id === 'ovSession' || id === 'ovAsk') return;
  requestAnimationFrame(() => { const sh = el.querySelector('.sheet'); if(!sh) return; el.classList.add('measure'); const hgt = sh.offsetHeight; el.classList.remove('measure');
    el.classList.toggle('center', hgt < (window.innerHeight || 700) * .7); });
}

// ======================= settings + data =======================
// Settings is a page under Fridge (tap ⚙︎ to slide down; pull up to go back to Fridge)
function fillSettings(){ $('sKey').value = settings.geminiKey || ''; $('sModel').value = settings.model || ''; setSeg('#sLang', lang); status($('keyStatus'), ''); $('keyStatus').style.color = '';
  $('keySteps').innerHTML = KEY_STEPS[lang === 'el' ? 'el' : 'en'].map(x => `<li>${x}</li>`).join('');
  setSeg('#sSex', profile.sex || ''); $('sH').value = profile.height || ''; $('sW').value = latestWeight() || (targets && targets.bw) || ''; }
function openSettings(){ document.querySelectorAll('.overlay.open').forEach(o => close(o.id)); fillSettings(); if(location.hash.slice(1) !== 'settings') switchTab(1, 'settings'); }

function setLang(l){ lang = l; ui.lang = l; saveUI(); applyLang(); route(); }

function tabIdx(tab){ return tab === 'settings' ? TABS3.length : TABS3.indexOf(tab); }   // 0.6.3.1: Settings is a page under Fridge

// swipe right-to-left past 1/3 to delete: finger on a phone, mouse drag on a computer
function makeSwipeDelete(box, itemSel, onDelete, opts){
  opts = opts || ({ '.exc': { skip: '.setrow,.rbwrap,.sethead,.newset,.endex2,.adddrop,.exdone,.wuhint,.expills' }, '.setrow': { buttons: true } })[itemSel] || {};
  let S = null, eatClick = false;
  const start = (c, x, y) => { S = { c, x, y, dx: 0, claim: null }; };
  const move = (x, y, ev) => { if(!S) return false; const dx = x - S.x, dy = y - S.y;
    if(S.claim === null){ if(dx < -10 && Math.abs(dx) > Math.abs(dy) * 1.3) S.claim = true; else if(Math.abs(dy) > 10 || dx > 10) S.claim = false; }
    if(!S.claim) return false; ev.stopPropagation(); if(ev.cancelable) ev.preventDefault();
    S.dx = Math.min(0, dx); const pr = Math.min(1, -S.dx / (S.c.offsetWidth / 3));
    S.c.classList.add('swiping'); S.c.style.transform = `translateX(${S.dx}px)`; S.c.style.setProperty('--sw', pr.toFixed(2));
    if(pr >= 1 && !S.c.classList.contains('swready')) haptic(); S.c.classList.toggle('swready', pr >= 1); return true; };
  const end = ev => { if(!S) return; const s = S; S = null; if(!s.claim) return; ev.stopPropagation(); eatClick = true; setTimeout(() => eatClick = false, 50);
    if(-s.dx >= s.c.offsetWidth / 3){ s.c.style.transition = 'transform .2s ease-in,opacity .2s'; s.c.style.transform = 'translateX(-110%)'; s.c.style.opacity = '0'; setTimeout(() => onDelete(s.c), 190); }
    else { s.c.style.transition = 'transform .28s cubic-bezier(.2,.9,.3,1.2)'; s.c.style.transform = ''; s.c.style.setProperty('--sw', 0); setTimeout(() => { s.c.style.transition = ''; s.c.classList.remove('swiping', 'swready'); }, 300); } };
  const ok = t => !t.closest(opts.buttons ? 'input,textarea,select' : 'input,textarea,select,button,.stepper,.sbox') && !(opts.skip && t.closest(opts.skip));
  box.addEventListener('touchstart', e => { const c = e.target.closest(itemSel); if(!c || e.touches.length > 1 || !ok(e.target)){ S = null; return; } start(c, e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  box.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
  box.addEventListener('touchend', end); box.addEventListener('touchcancel', end);
  box.addEventListener('pointerdown', e => { if(e.pointerType !== 'mouse' || e.button) return; const c = e.target.closest(itemSel); if(!c || !ok(e.target)) return; start(c, e.clientX, e.clientY); });
  addEventListener('pointermove', e => { if(e.pointerType === 'mouse' && S) move(e.clientX, e.clientY, e); });
  addEventListener('pointerup', e => { if(e.pointerType === 'mouse') end(e); });
  box.addEventListener('click', e => { if(eatClick){ e.stopPropagation(); e.preventDefault(); eatClick = false; } }, true);
  box.classList.add('swipebox');
}
