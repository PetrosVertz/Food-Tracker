// ---------- icons (canvas Phones.dc.html): line icons, stroke = currentColor ----------
const ICON = {
  today: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  gym: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  food: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  fridge: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v1M9 13v3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',   // 0.6.9.3: a real gear (the rays looked like a sun)
  workouts: '<g transform="rotate(-45 12 12)"><path d="M7.5 12h9"/><rect x="4" y="7.5" width="3.5" height="9" rx="1"/><rect x="16.5" y="7.5" width="3.5" height="9" rx="1"/><path d="M2 10.5v3M22 10.5v3"/></g>',
  progress: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/><path d="M15 8h4v4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h.01M12 14h.01M16.5 14h.01M7.5 17.5h.01M12 17.5h.01"/>',
  bolt: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  dial: '<circle cx="12" cy="12" r="5.6"/><path d="M12 12l2.6-2.9"/><path d="M5.21 18.79h.01M2.40 12.00h.01M5.21 5.21h.01M12.00 2.40h.01M18.79 5.21h.01M21.60 12.00h.01M18.79 18.79h.01" stroke-width="2.6"/>',
  capsule: '<g transform="rotate(-45 12 12)"><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/></g>',
  cartridge: '<path d="M5 3.5A1.5 1.5 0 0 1 6.5 2h11A1.5 1.5 0 0 1 19 3.5V18l-2 2v2H7v-2l-2-2z"/><rect x="8" y="5.5" width="8" height="7" rx="1"/><path d="M9.5 18.5v1.5M12 18.5v1.5M14.5 18.5v1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  podium: '<path d="M3 20h18M8.5 20v-8h7v8M3 20v-5h5.5M15.5 20v-3H21v3"/><path d="M12 4.2l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2L9.1 6.3l2-.3z"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M8.7 11.2L6 3h4l2 5M15.3 11.2L18 3h-4l-2 5"/><path d="M12 13v4"/>',
  warn: '<path d="M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  again: '<path d="M4 9a7 7 0 0 1 12-3l3 3M20 15a7 7 0 0 1-12 3l-3-3M19 4v5h-5M5 20v-5h5"/>',
  scale: '<rect x="3" y="3.5" width="18" height="17" rx="4"/><path d="M7.5 9.5a6 6 0 0 1 9 0"/><path d="M12 10.5l1.6-2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M12 9v6M16 9v6"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M6.5 13.5h.01M17.5 13.5h.01M9.5 14h5"/>',
  pot: '<path d="M4 11h16v4.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5z"/><path d="M2 11h2M20 11h2M8.5 11a3.5 1.5 0 0 1 7 0"/><path d="M10 3.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5M14 3.5c-.8.8-.8 1.7 0 2.5s.8 1.7 0 2.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', down: '<path d="M6 9l6 6 6-6"/>',
  // 0.7.4.0.5: shared line icons for every branch (they replace the old text glyphs)
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7M10 11v6M14 11v6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  starOn: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>',
  play: '<path d="M7.5 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.7 4.1a.8.8 0 0 0-1.2.7z"/>',
  snow: '<path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5M4 10.4l3.4.9-.9 3.4M20 13.6l-3.4-.9.9-3.4M4 13.6l3.4-.9-.9-3.4M20 10.4l-3.4.9.9 3.4"/>',
};
const svgIcon = (k, size, sw) => `<svg width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const BACK_SVG = svgIcon('back', 28, 2.4);   // every back control is this plain arrow (no box)

// ---------- sliding pills (canvas Main.dc.html): every selector has one knob that glides to the chosen button ----------
// Works for main pills (.mpill), secondary pills (.seg) and the bottom bar (.rail, 52×44 bubble). Whatever code toggles
// .on on a button, the knob follows: one observer watches class changes and re-rendered selectors.
// ---------- Settings › Customize › Units (0.6.9): body weight kg/lb, height cm/ft-in, food g/oz. Everything is stored metric;
// only what you see and type changes. (Lifting weights stay in kg for now.)
const UN = () => ({ w: 'kg', h: 'cm', f: 'g', ...((typeof ui === 'object' && ui && ui.units) || {}) });
const LB = 2.20462, OZ = 28.3495;
const bwU = () => UN().w === 'lb' ? 'lb' : 'kg';
const bwOut = kg => kg == null || kg === '' ? '' : UN().w === 'lb' ? Math.round(+kg * LB * 10) / 10 : Math.round(+kg * 10) / 10;
const bwIn = v => UN().w === 'lb' ? +v / LB : +v;
const hOut = cm => { if(!cm) return ''; if(UN().h !== 'ft') return cm; const inch = Math.round(cm / 2.54); return `${Math.floor(inch / 12)}'${inch % 12}`; };
const hIn = v => { if(UN().h !== 'ft') return +v; const m = String(v).match(/(\d+)\D+(\d+)/); if(m) return (+m[1] * 12 + +m[2]) * 2.54; const n = +v; return n > 0 && n < 9 ? n * 12 * 2.54 : n * 2.54; };

// ---------- Settings › Theme (canvas ThemeMenu.dc.html): Dark / Light / Automatic + nine accent presets on one neutral grey base ----------
// [id, name, dark accent, dark text-on-accent, light accent, light text-on-accent, light accent-as-text (≥ 4.5:1 on the Light page)]. A device setting (ui.theme), not synced.
const THEMES = [
  ['lime', 'Lime', '#c6f432', '#0f1113', '#8fbb12', '#0f1113', '#4a6600'], ['ocean', 'Ocean', '#3fd5e0', '#061316', '#0f9aa6', '#ffffff', '#0a6670'],
  ['sunset', 'Sunset', '#ff8c4a', '#1a0d06', '#e8692a', '#1a0d06', '#a8420f'], ['violet', 'Violet', '#b39bff', '#120d22', '#7457ea', '#ffffff', '#5a3fd0'],
  ['mono', 'Mono', '#f1f3f5', '#0a0a0b', '#1d1f22', '#f4f4f5', '#1d1f22'], ['red', 'Racing Red', '#ff4d4d', '#1a0606', '#d42c2c', '#ffffff', '#b01f1f'],
  ['gold', 'Gold', '#f2c14e', '#1a1306', '#c08c0c', '#1a1306', '#7f5a00'], ['mint', 'Mint', '#5fe3b0', '#04170f', '#16a673', '#04170f', '#0a6e4a'],
  ['pink', 'Soft Pink', '#ff9ec7', '#2a0a18', '#db4f8c', '#ffffff', '#a8285f'] ];
const THEME_WARM = ['sunset', 'red', 'gold', 'pink'];   // "Ready" muscles use green in these so they don't look like "Sore"
function themeNow(){ const th = (typeof ui === 'object' && ui && ui.theme) || {}, mode = ['dark', 'light', 'auto'].includes(th.mode) ? th.mode : 'auto', p = THEMES.find(x => x[0] === th.preset) || THEMES[0];
  return { mode, p, look: mode === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode }; }
function applyTheme(){
  const { p, look } = themeNow(), L = look === 'light', mono = p[0] === 'mono', r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
  r.setAttribute('data-theme', look);
  set('--t-accent', L ? p[4] : p[2]); set('--t-on', L ? p[5] : p[3]); set('--t-accent-ink', L ? p[6] : p[2]);
  set('--t-toast-act', L ? (mono ? '#ffffff' : p[2]) : p[6]);              // toast is near-black in Light (bright accent), near-white in Dark (dark ink)
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
// ---------- 0.6.9.3: what the app is used for — "mainly gym work" puts Gym Buddy first (nothing is hidden) ----------
function applyTabOrder(){
  const order = ui.gymFirst ? ['gym', 'today', 'food', 'fridge'] : ['today', 'gym', 'food', 'fridge'];
  TABS3.splice(0, TABS3.length, ...order);
  const bar = $('rail'); if(bar){ const set = bar.querySelector('[data-tab="settings"]'); order.forEach(k => { const b = bar.querySelector(`[data-tab="${k}"]`); if(b) bar.insertBefore(b, set); }); }
  if($('sUse')) setSeg('#sUse', ui.gymFirst ? 'gym' : 'both');
  if(typeof pillsAll === 'function') pillsAll();
}
const fabBtn = (icon, label) => `<span class="fabic">${svgIcon(icon, 18, 2.4)}</span>${esc(label)}`;   // main button: line icon before the text
const homeHash = () => '#' + TAB_ROOT[TABS3[0]];
function setTheme(ch){ ui.theme = { ...(ui.theme || {}), ...ch }; saveUI(); applyTheme(); drawTheme(); if(location.hash.slice(1) === 'gym-rec' && typeof renderRecovery === 'function') renderRecovery(); }
try{ matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if(themeNow().mode === 'auto') setTheme({}); }); }catch(e){}

// 0.7.4.0.5: every .ibtn (info button) shows the info line icon in a round chip (layout.css .ibtn); a leftover text glyph is replaced
function ibtnFill(root){ (root.matches && root.matches('.ibtn') ? [root] : []).concat([...(root.querySelectorAll ? root.querySelectorAll('.ibtn') : [])])
  .forEach(b => { if(!b.querySelector('svg')) b.innerHTML = svgIcon('info', 18); }); }
document.addEventListener('DOMContentLoaded', () => ibtnFill(document));

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
    r.addedNodes.forEach(n => { if(n.nodeType !== 1) return; ibtnFill(n); if(n.matches(PILL_SEL)) pillQueue(n); n.querySelectorAll && n.querySelectorAll(PILL_SEL).forEach(pillQueue); });
  } }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
addEventListener('resize', pillsAll); document.addEventListener('DOMContentLoaded', pillsAll); if(document.fonts) document.fonts.ready.then(pillsAll);


// App shell: navigation, tabs, launcher, sheets, toasts, setup, settings, backup, motion, haptics, in-app pickers. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function applyLang(){
  document.documentElement.lang = lang;
  // 0.7.1: a ✨ in a label becomes the "AI" badge after the text
  document.querySelectorAll('[data-t]').forEach(el => { const s = t(el.dataset.t); if(s.includes('✨')) el.innerHTML = AI.label(s); else el.textContent = s; });
  document.querySelectorAll('[data-th]').forEach(el => el.innerHTML = AI.label(t(el.dataset.th), true));
  document.querySelectorAll('[data-tp]').forEach(el => el.placeholder = t(el.dataset.tp).replace(/✨\s?/g, ''));
  document.querySelectorAll('[data-ta]').forEach(el => el.setAttribute('aria-label', t(el.dataset.ta).replace(/\u2728\s?/g, '')));   // 0.7.4.0.5: translated aria-labels
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

// ---------- tabs: Today → Gym → Food → Fridge, switched from the side strip or a short pull past the end ----------
let navKeepScroll = false, SWITCHING = false;
function markRail(tab){ const rail = $('rail'); if(!rail) return; rail.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); }
function tabTarget(tab){ if(tab === 'today'){ curDay = todayKey(); return 'today'; }
  const last = ui['lastIn_' + tab]; return last && tabOf(last) === tab ? last : TAB_ROOT[tab]; }
function switchTab(dir, toTab){
  const h = location.hash.slice(1), cur = tabOf(h), i = tabIdx(cur);   // Settings sits below Fridge
  const tab = toTab || [...TABS3, 'settings'][i + dir]; if(!tab || tab === cur || SWITCHING) return;
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
  if(!h || h === 'start' || h === 'home'){ history.replaceState(null, '', h === 'home' ? '#foods' : homeHash()); }
  h = location.hash.replace('#','');   // re-read: an old start / home link was just switched
  const page = h === 'foods' || h === 'meals' || h === 'supps' ? 'foods' : h.startsWith('gym') ? 'gym' : ['today','fridge','groc','settings'].includes(h) ? h : 'foods';
  [['pgFoods','foods'],['pgSupps','supps'],['pgToday','today'],['pgFridge','fridge'],['pgGym','gym'],['pgSettings','settings']].forEach(([id, p]) => $(id) && $(id).classList.toggle('hide', page !== p && !(p === 'fridge' && page === 'groc')));
  // 0.6.9: Fridge and Groceries are one page; only the list under the pill changes, so the pill glides
  $('fridgeView').classList.toggle('hide', page === 'groc'); $('pgGroc').classList.toggle('hide', page !== 'groc');
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
  { const fl = page === 'today' ? t('logFab') : page === 'fridge' ? t('fridgeFab') : tab === 'meals' ? t('cookFab') : tab === 'supps' ? t('addSuppFab') : t('addFoodFab');
    if(page === 'today') fab.textContent = fl; else fab.innerHTML = fabBtn('plus', fl); }
  if(page === 'foods' && tab === 'meals') fab.innerHTML = `${svgIcon('pot', 20, 2.1)}<span>${esc(t('cookFab'))}</span>`;
  fab.dataset.action = ['today','fridge','gym'].includes(page) ? page : tab;
  if(h === 'gym-lib'){ fab.dataset.action = 'gymlib'; fab.innerHTML = fabBtn('plus', t('createWorkout')); }
  else if(page === 'gym') { if(active) fab.textContent = t('resume', { m: Math.floor(sesMs() / 60000) }); else fab.innerHTML = fabBtn('play', t('startWk')); }
  renderAll();
  const pg = document.querySelector('section.page:not(.hide)'); if(pg && !navKeepScroll) pg.scrollTop = 0;
}

// ---------- Food Preferences (setup step + Settings): allergies and foods you don't eat, saved in profile.foodPrefs (optional field) ----------
const FP_ALLERGY = ['peanuts', 'tree_nuts', 'milk', 'eggs', 'fish', 'shellfish', 'soy', 'gluten', 'sesame'];
const FP_AVOID = ['vegetarian', 'vegan', 'pescatarian', 'pork', 'beef', 'lamb', 'alcohol', 'mushrooms'];
function foodPrefsHtml(fp){
  fp = fp || {}; const chips = (list, pre, on) => `<div class="tchips fpchips">${list.map(k => `<button type="button" data-fp="${k}" class="${(on || []).includes(k) ? 'on' : ''}">${esc(t(pre + k))}</button>`).join('')}</div>`;
  return `<p class="sub">${t('fpSub')}</p><label>${t('fpAllergies')}</label>${chips(FP_ALLERGY, 'fpA_', fp.allergies)}
    <input class="fpAx" autocomplete="off" value="${esc(fp.allergyText || '')}" placeholder="${esc(t('fpOtherPh'))}" style="margin-top:8px">
    <div class="fpwarn">${svgIcon('warn', 16, 2.2)}<span>${t('fpWarn')}</span></div>
    <label>${t('fpAvoid')}</label>${chips(FP_AVOID, 'fpD_', fp.avoid)}
    <input class="fpDx" autocomplete="off" value="${esc(fp.avoidText || '')}" placeholder="${esc(t('fpOtherPh'))}" style="margin-top:8px">`;
}
function readFoodPrefs(root){
  const on = pre => [...root.querySelectorAll('.fpchips button.on')].map(b => b.dataset.fp).filter(k => (pre === 'a' ? FP_ALLERGY : FP_AVOID).includes(k));
  const tx = sel => (root.querySelector(sel) || {}).value || '';
  return { allergies: on('a'), allergyText: tx('.fpAx').trim(), avoid: on('d'), avoidText: tx('.fpDx').trim() };
}
function saveFoodPrefs(fp){ if(fp.allergies.length || fp.allergyText || fp.avoid.length || fp.avoidText) profile.foodPrefs = fp; else delete profile.foodPrefs; saveProfile(); }

function openSetup(){
  const tg = targets || {}; const gymDays = Object.entries(gymPlan).filter(([, p]) => p && p.tpl && p.tpl !== 'rest').map(([wd]) => +wd);
  const workDays = Object.entries(gymPlan).filter(([, p]) => p && p.work).map(([wd]) => +wd), w0 = workDays.length ? gymPlan[workDays[0]].work : { from: '09:00', to: '17:00' };
  SUP = { step: 0, lang: lang, use: ui.gymFirst ? 'gym' : 'both', bw: tg.bw || '', goal: tg.goal || 'bulk', gym: new Set(gymDays.length ? gymDays : [1, 3, 5]), time: profile.gymTime || '18:00',
    work: workDays.length > 0, workDays: new Set(workDays.length ? workDays : [1, 2, 3, 4, 5]), from: w0.from, to: w0.to, key: settings.geminiKey || '', sex: profile.sex || null, h: profile.height || '', fp: profile.foodPrefs || null };
  drawSetup(); open('ovSetup');
}

function drawSetup(){
  const s = SUP.step, wdn = WD(), dayChips = (set, attr) => `<div class="tchips daychips">${WD1().map(d => `<button data-${attr}="${d}" class="${set.has(d) ? 'on' : ''}">${wdn[d].slice(0, 3)}</button>`).join('')}</div>`;
  let h = `<div class="sudots">${[0, 1, 2, 3, 4, 5].map(i => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>`;
  const useSeg = `<label style="margin-top:16px">${t('suUse')}</label><div class="seg" id="suUse"><button data-v="both" class="${SUP.use !== 'gym' ? 'on' : ''}">${t('useBoth')}</button><button data-v="gym" class="${SUP.use === 'gym' ? 'on' : ''}">${t('useGym')}</button></div>`;
  if(s === 0) h += `<h2>${t('suWelcome')}</h2><p class="sub">${t('suWelcomeSub')}</p><div class="langpick"><button data-sulang="en" class="${lang === 'en' ? 'on' : ''}">English</button><button data-sulang="el" class="${lang === 'el' ? 'on' : ''}">Ελληνικά</button></div>` + useSeg;
  if(s === 1) h += `<h2>${t('suAbout')}</h2><label>${t('suSex')}</label><div class="seg" id="suSex"><button data-v="m" class="${SUP.sex === 'm' ? 'on' : ''}">${t('suMale')}</button><button data-v="f" class="${SUP.sex === 'f' ? 'on' : ''}">${t('suFemale')}</button></div>
    <label for="suH">${t('suHeight')}</label><div class="brandrow"><input id="suH" type="number" inputmode="numeric" value="${SUP.h || ''}" placeholder="178" style="flex:1"><span style="color:var(--muted)">cm</span></div><label for="suBw">${t('suWeight')}</label><div class="brandrow"><input id="suBw" type="number" inputmode="decimal" step="any" value="${SUP.bw}" placeholder="75" style="flex:1"><span style="color:var(--muted)">kg</span></div>
    <label>${t('suGoal')}</label><div class="seg" id="suGoal">${['bulk', 'recomp', 'cut'].map(g => `<button data-v="${g}" class="${SUP.goal === g ? 'on' : ''}">${t({ bulk: 'gBulk', recomp: 'gRecomp', cut: 'gCut' }[g])}</button>`).join('')}</div>`;
  if(s === 2) h += `<h2>${t('suWeek')}</h2><label>${t('suGymDays')}</label>${dayChips(SUP.gym, 'sugym')}
    <div class="brandrow" style="margin-top:12px"><label for="suTime" style="margin:0;flex:1">${t('suGymTime')}</label><input id="suTime" type="time" value="${SUP.time}" style="flex:0 0 130px"></div>
    <label class="check" style="margin-top:14px"><input type="checkbox" id="suWork" ${SUP.work ? 'checked' : ''}><span>${t('suWorkQ')}</span></label>
    <div id="suWorkBox" class="${SUP.work ? '' : 'hide'}"><label>${t('suWorkDays')}</label>${dayChips(SUP.workDays, 'suwd')}
      <div class="grid" style="margin-top:8px"><div><label for="suFrom">${t('suFrom')}</label><input id="suFrom" type="time" value="${SUP.from}"></div><div><label for="suTo">${t('suTo')}</label><input id="suTo" type="time" value="${SUP.to}"></div></div></div>`;
  if(s === 3) h += `<h2>${t('stFoodPrefs')}</h2>${foodPrefsHtml(SUP.fp)}`;
  if(s === 4) h += `<h2>${t('suAi')}</h2><p class="sub">${t('suAiSub')}</p><input id="suKey" type="password" autocomplete="off" value="${esc(SUP.key)}" placeholder="AIza…"><div class="actions" style="margin-top:8px"><button class="btn" id="suGetKey">${t('getKey')}</button></div>`;
  if(s === 5){ const tg = calcTargets(SUP.bw, SUP.goal); h += `<div style="text-align:center;margin:10px 0;color:var(--t-accent-ink,var(--t-accent))">${svgIcon('check', 54, 2)}</div><h2 style="text-align:center">${t('suDone')}</h2><p class="sub" style="text-align:center">${t('suDoneSub', { g: tg.gym.k.toLocaleString(), r: tg.rest.k.toLocaleString(), p: tg.gym.p })}</p>`; }
  h += `<div class="actions">${s > 0 ? `<button class="btn" data-sunav="-1">${t('suBack')}</button>` : `<button class="btn" data-suskip>${t('suSkip')}</button>`}${s === 4 ? `<button class="btn" data-sunav="1" data-skipkey>${t('suSkip')}</button>` : ''}<button class="btn primary" data-sunav="${s === 5 ? 'done' : 1}">${s === 5 ? t('suFinish') : t('suNext')}</button></div>`;
  $('suBody').innerHTML = h;
}

function readSetup(){ const v = id => $(id) ? $(id).value : null;
  if($('suBw')) SUP.bw = num('suBw') || ''; if($('suH')) SUP.h = num('suH') || ''; if($('suTime')) SUP.time = v('suTime') || '18:00'; if($('suFrom')) SUP.from = v('suFrom') || '09:00'; if($('suTo')) SUP.to = v('suTo') || '17:00'; if($('suKey')) SUP.key = v('suKey').trim(); if(SUP.step === 3) SUP.fp = readFoodPrefs($('suBody')); }

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
  if(SUP.fp) saveFoodPrefs(SUP.fp);
  profile.gymTime = SUP.time; WD1().forEach(d => { const p = { ...(gymPlan[d] || {}) };
    if(SUP.gym.has(d)){ if(!p.tpl || p.tpl === 'rest') p.tpl = 'gym'; p.time = p.time || SUP.time; } else if(p.tpl === 'gym') delete p.tpl;
    if(SUP.work && SUP.workDays.has(d)) p.work = { from: SUP.from, to: SUP.to }; else delete p.work;
    if(p.tpl || p.work) gymPlan[d] = p; else delete gymPlan[d]; });
  saveG('plan'); if(SUP.key !== settings.geminiKey){ settings.geminiKey = SUP.key; Store.save('settings', settings); }
  ui.gymFirst = SUP.use === 'gym'; applyTabOrder(); ui.setupDone = true; ui.lang = lang; saveUI(); saveProfile(); close('ovSetup'); renderAll();
}

// ---------- weekly backup, one tap to the share sheet (iCloud Drive / Files) ----------
function backupBlob(){ return new Blob([JSON.stringify(Store.snapshot(), null, 2)], { type: 'application/json' }); }

async function backupNow(){
  const name = `tracker-backup-${todayKey()}.json`, blob = backupBlob();   // 0.7.3: the date is in the file name
  try{ await Phone.shareFile(blob, name);
    ui.lastBackup = new Date().toISOString(); saveUI(); toast(t('bkDone')); shellBkLast(); renderAll();
  }catch(e){ if(e && e.name !== 'AbortError') toast(e.message || 'backup'); }
}

function ask(msg, yes, no){
  return new Promise(res => { ASK = res; $('askMsg').textContent = msg; $('askYes').textContent = yes || t('ok_'); $('askNo').textContent = no || t('cancel'); open('ovAsk'); });
}

function syncSel(s){ const b = s.nextElementSibling; if(b && b.classList.contains('selbtn')) b.firstChild.textContent = selLabel(s); }

function enhanceSel(s){
  if(s.dataset.enh) { syncSel(s); return; } s.dataset.enh = '1'; s.classList.add('nsel');
  const b = document.createElement('button'); b.type = 'button'; b.className = 'selbtn'; b.innerHTML = `<span></span><i>${svgIcon('down', 18, 2.2)}</i>`; b.firstChild.textContent = selLabel(s);
  if(s.style.flex) b.style.flex = s.style.flex;
  s.after(b);
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); PICKSEL = s;
    const lbl = s.id && document.querySelector(`label[for="${s.id}"]`);
    $('pickT').textContent = lbl ? lbl.textContent : '';
    $('pickList').innerHTML = [...s.options].map((o, i) => `<button class="pickopt ${i === s.selectedIndex ? 'on' : ''}" data-pi="${i}" ${o.disabled ? 'disabled' : ''}>${esc(o.textContent)}${i === s.selectedIndex ? `<b>${svgIcon('check', 18, 2.4)}</b>` : ''}</button>`).join('');
    open('ovPick'); });
}

// ---------- numbers: comma or point both work (Greek keyboards type a comma) ----------
function fixNum(inp){
  if(inp.type !== 'number' || inp.dataset.nfix) return; inp.dataset.nfix = '1';
  const im = inp.getAttribute('inputmode'); inp.type = 'text'; inp.setAttribute('inputmode', im === 'numeric' ? 'numeric' : 'decimal'); inp.setAttribute('autocomplete', 'off');
}


// ---------- animations: sheets slide in/out, new rows fade in, removed rows fade out ----------
function close(id){ AI.noteClose(id); const el = $(id); if(!el) return; const was = el.classList.contains('open'); el.classList.remove('open'); if(id === 'ovScan'){ stopScan(); shopScanClosed(); } if(id === 'ovSession') keepAwake(false); if(id === 'ovExPick') $('pkBulb').classList.add('hide');
  // body.ovopen stays on until the 200 ms close animation ends, so a sliding-out sheet never passes under the title bar
  const sync = () => document.body.classList.toggle('ovopen', !!document.querySelector('.overlay.open,.overlay.closing'));
  if(was && !matchMedia('(prefers-reduced-motion: reduce)').matches){ el.classList.add('closing'); clearTimeout(el._ct); el._ct = setTimeout(() => { el.classList.remove('closing'); sync(); }, 200); }
  sync(); }

function open(id){
  if(AI.holdOpen(id)) return;   // an AI answer is landing: the window waits behind the AI bubble
  const el = $(id); el.classList.remove('closing'); clearTimeout(el._ct); el.style.zIndex = ++zTop; el.classList.add('open'); document.body.classList.add('ovopen');
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
  setSeg('#sSex', profile.sex || ''); $('sH').type = UN().h === 'ft' ? 'text' : 'number'; $('sH').placeholder = UN().h === 'ft' ? `5'10` : 'cm'; $('sH').value = hOut(profile.height); $('sW').placeholder = bwU(); $('sW').value = bwOut(latestWeight() || (targets && targets.bw) || ''); }
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
    if(pr >= 1 && !S.c.classList.contains('swready')) Phone.haptic(); S.c.classList.toggle('swready', pr >= 1); return true; };
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
