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
  bag: '<path d="M5 8h14l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',   // Refinements #4: Food Library hub
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 21h8M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/>',
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
  // 0.7.7 Profile: you, friends, share, streak flame
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5L5 19.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  share: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/>',
  flame: '<path d="M12 21.5c-4 0-7-2.8-7-6.6 0-3 1.8-5 3.3-6.6.4 1.6 1.2 2.7 2.4 3.3C10.4 8 11.6 4.8 14.2 2.5c.3 3 1.6 4.8 3 6.6 1.2 1.6 1.8 3.4 1.8 5.4 0 4-3 7-7 7z"/><path d="M12 21.5c-1.7 0-3-1.3-3-3 0-1.8 1.5-3 2.4-4.3.5 1.2 1.3 1.9 2.2 2.3.8.4 1.4 1.2 1.4 2.1 0 1.6-1.3 2.9-3 2.9z"/>',
  // Refinements #8: small chevrons (Workout Done rank row, Social Hub lift menu)
  chevR: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>', chevD: '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
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
// V3: ONE formatter for every time you read. Stored times stay "HH:MM" (nothing saved changes); only what is shown does.
// ui.timeFmt (device setting, Settings › Customize › Time Format): 'system' (default: the phone's own 12 / 24 hour choice) | '12' | '24'.
function clock24(){ const m = (typeof ui === 'object' && ui && ui.timeFmt); if(m === '24') return true; if(m === '12') return false;
  let hc; try{ hc = new Intl.DateTimeFormat([], { hour: 'numeric' }).resolvedOptions().hourCycle; }catch(e){} return hc === 'h23' || hc === 'h24'; }
function fmtClock(v){ const m = /^(\d{1,2}):(\d{2})/.exec(v || ''); if(!m) return ''; const h24 = clock24();
  return new Date(2000, 0, 1, +m[1], +m[2]).toLocaleTimeString(lang === 'el' ? 'el-GR' : h24 ? 'en-GB' : 'en-US', { hour: h24 ? '2-digit' : 'numeric', minute: '2-digit', hourCycle: h24 ? 'h23' : 'h12' }); }
function syncClocks(){ document.querySelectorAll('.wptime input').forEach(i => { const sp = i.closest('.wptime').firstElementChild; if(sp && sp !== i) sp.textContent = fmtClock(i.value) || '--:--'; }); }
const bwU = () => UN().w === 'lb' ? 'lb' : 'kg';
const bwOut = kg => kg == null || kg === '' ? '' : UN().w === 'lb' ? Math.round(+kg * LB * 10) / 10 : Math.round(+kg * 10) / 10;
const bwIn = v => UN().w === 'lb' ? +v / LB : +v;
const hOut = cm => { if(!cm) return ''; if(UN().h !== 'ft') return cm; const inch = Math.round(cm / 2.54); return `${Math.floor(inch / 12)}'${inch % 12}`; };
const hIn = v => { if(UN().h !== 'ft') return +v; const m = String(v).match(/(\d+)\D+(\d+)/); if(m) return (+m[1] * 12 + +m[2]) * 2.54; const n = +v; return n > 0 && n < 9 ? n * 12 * 2.54 : n * 2.54; };

// ---------- Settings › Theme (canvas ThemeMenu.dc.html): Dark / Light / Automatic + nine accent presets on one neutral grey base ----------
// [id, name, dark accent, dark text-on-accent, light accent, light text-on-accent, light accent-as-text (≥ 4.5:1 on the Light page)]. A device setting (ui.theme), not synced.
const THEMES = [
  ['lime', 'Lime', '#c8f53a', '#0f1113', '#8cbb0d', '#0f1113', '#476300'], ['ocean', 'Ocean', '#40d9e6', '#061316', '#087f8c', '#ffffff', '#095f69'],
  ['sunset', 'Sunset', '#ff9150', '#1a0d06', '#ea6a2a', '#1a0d06', '#a3400d'], ['violet', 'Violet', '#b8a1ff', '#120d22', '#7355ea', '#ffffff', '#5a3fd0'],
  ['mono', 'Mono', '#f1f3f5', '#0a0a0b', '#1d1f22', '#f4f4f5', '#1d1f22'], ['red', 'Racing Red', '#ff5454', '#1a0606', '#d42a2a', '#ffffff', '#ad1d1d'],
  ['gold', 'Gold', '#f5c750', '#1a1306', '#c28d08', '#1a1306', '#7b5700'], ['mint', 'Mint', '#5ce8b4', '#04170f', '#14a572', '#04170f', '#096946'],
  ['pink', 'Soft Pink', '#ff9fc8', '#2a0a18', '#cf3c7f', '#ffffff', '#a3255c'] ];
const THEME_WARM = ['sunset', 'red', 'gold', 'pink'];   // "Ready" muscles use green in these so they don't look like "Sore"
function themeNow(){ const th = (typeof ui === 'object' && ui && ui.theme) || {}, mode = ['dark', 'light', 'auto'].includes(th.mode) ? th.mode : 'auto', p = THEMES.find(x => x[0] === th.preset) || THEMES[0];
  return { mode, p, look: mode === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode }; }
// 0.7.9.2: the icon on the selected-tab marker uses whichever of the theme's text-on-accent, white or near-black reads best (≥ 4.5:1) on the accent
const lumHex = c => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(parseInt(c.slice(1, 3), 16)) + .7152 * f(parseInt(c.slice(3, 5), 16)) + .0722 * f(parseInt(c.slice(5, 7), 16)); };
const contrastHex = (a, b) => { const x = lumHex(a), y = lumHex(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function bestOn(acc){ return contrastHex(acc, '#000000') >= contrastHex(acc, '#ffffff') ? '#000000' : '#ffffff'; }   // letters on a coloured button: pure black or pure white, whichever reads better
function applyTheme(){
  const { p, look } = themeNow(), L = look === 'light', mono = p[0] === 'mono', r = document.documentElement, set = (k, v) => r.style.setProperty(k, v);
  r.setAttribute('data-theme', look);
  set('--t-accent', L ? p[4] : p[2]); set('--t-on', L ? p[5] : p[3]); set('--t-knob-on', bestOn(L ? p[4] : p[2])); set('--t-accent-ink', L ? p[6] : p[2]);
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
  setSeg('#thBar', ((typeof ui === 'object' && ui && ui.theme) || {}).bar === 'solid' ? 'solid' : 'clear');   // 0.7.10.7: read at start-up by index.html
  $('thSw').innerHTML = THEMES.map(x => `<button type="button" data-preset="${x[0]}" class="${x[0] === p[0] ? 'on' : ''}" style="--sw:${L ? x[4] : x[2]}" aria-label="${x[1]}" aria-pressed="${x[0] === p[0]}"><i></i><span>${x[1]}</span></button>`).join('');
  const v = $('sThemeVal'); if(v) v.textContent = `${t({ dark: 'thDark', light: 'thLight', auto: 'thAuto' }[mode])} · ${p[1]}`;
}
// ---------- 0.6.9.3: what the app is used for — "mainly gym work" puts Gym Buddy first (nothing is hidden) ----------
// 0.7.9: Kitchen (Fridge, Groceries) can be switched off in Settings › Tabs: four tabs. 0.7.9.1: Recipes always live in Food Library
const kitchenOn = () => !ui.noKitchen;
function applyTabOrder(){
  const order = (ui.gymFirst ? ['gym', 'today', 'food', 'fridge'] : ['today', 'gym', 'food', 'fridge']).filter(k => k !== 'fridge' || kitchenOn());
  TABS3.splice(0, TABS3.length, ...order);
  const bar = $('rail'); if(bar){ const last = bar.querySelector('[data-tab="profile"]'); order.forEach(k => { const b = bar.querySelector(`[data-tab="${k}"]`); if(b) bar.insertBefore(b, last); });
    const fb = bar.querySelector('[data-tab="fridge"]'); if(fb) fb.classList.toggle('hide', !kitchenOn()); }
  if($('sUse')) setSeg('#sUse', ui.gymFirst ? 'gym' : 'both');
  if($('sKitchen')) $('sKitchen').checked = kitchenOn();
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

// 0.7.9: pages and windows get .scrolled once their content moves, so the pinned back arrow shows its round backing (theme.css)
document.addEventListener('scroll', e => { const el = e.target; if(el.nodeType === 1 && el.matches('section.page,.overlay .sheet')) el.classList.toggle('scrolled', el.scrollTop > 6); }, { capture: true, passive: true });

const PILL_SEL = '.mpill,.seg,.rail';
const RAIL_KNOB = 44;   // the bottom bar's selected-tab circle (theme.css .rail>.knob; the profile photo is 36 px inside it)
function pillSync(el){
  let k = el.querySelector(':scope > .knob'), fresh = false;
  if(!k){ k = document.createElement('i'); k.className = 'knob'; k.setAttribute('aria-hidden', 'true'); el.prepend(k); fresh = true; pillRO && pillRO.observe(el); }
  const b = el.querySelector(':scope > button.on');
  if(!b || !b.offsetWidth){ k.style.opacity = 0; k.dataset.shown = ''; return; }
  const rail = el.classList.contains('rail');   // 0.7.9.1: the bottom bar's marker is the same 44 px circle on every tab (icons and the photo), so it never resizes while it slides
  const w = rail ? RAIL_KNOB : b.offsetWidth, hh = rail ? RAIL_KNOB : b.offsetHeight,
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
  document.querySelectorAll('[data-face]').forEach(el => { if(!el.firstChild) el.outerHTML = AI.face(el.dataset.face); });   // 0.7.9.1: a chat button's robot face (AI.face)
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

// ---------- 0.7.4.3 no AI key: every AI control is greyed out; tapping one says a key is needed, with a button to Settings › AI ----------
// An AI control = a button / label / link that carries the AI badge (class="aiafter", AI.badge(), .aib) or is a coach pill / bubble (a robot face).
// Every one of them has a way to do the job without AI, so nothing else changes (see docs/ai-optional-0.7.4.3.md).
const AI_CTL = '.aiafter,.coachpill,.coachbub,[data-ai]';
function aiGate(){ document.body.classList.toggle('noai', !AI.hasKey()); }
function aiCtl(el){ const c = el && el.closest && el.closest('button,label,a,[role="button"]'); if(!c || c.closest('#ovSAI,#ovSetup,#toast')) return null;
  return c.matches(AI_CTL) || c.querySelector('.aiafter,.aibadge,.aib') ? c : null; }
function aiNeedKey(){ Phone.haptic(); toast(t('aiNeedKey'), t('aiKeyGo'), () => { openSettings(); setTimeout(() => { fillSettings(); open('ovSAI'); }, 360); }); }
document.addEventListener('click', e => { if(AI.hasKey() || !aiCtl(e.target)) return; e.preventDefault(); e.stopImmediatePropagation(); aiNeedKey(); }, true);

// Refinements #4: moving around inside the app never adds a browser history step, so the iPhone's swipe from the left edge has
// nothing to go back to (the app's own back arrow keeps its own list, NAV)
function go(h){ if(location.hash === '#' + h) route(); else location.replace('#' + h); }

// ---------- cooking: choose first, then the details ----------
function cookStep(main){ $('cookStart').classList.toggle('hide', main); $('cookMain').classList.toggle('hide', !main); }

function navTo(h){ if(location.hash.slice(1) === h){ route(); return; } navMode = true; location.replace('#' + h); }

function goBack(){
  const opens = [...document.querySelectorAll('.overlay.open')].filter(o => o.id !== 'ovLang').sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0));
  if(opens.length){
    const top = opens[0].id;
    if(top === 'ovExPick' && (PK.group || PK.eq)){ if(PK.eq) PK.eq = null; else { PK.group = null; PK.head = null; } drawExPick(); return; }
    if(top === 'ovCoach'){ Coach.minimize(); return; }   // 0.7.4.3: Back shrinks the coach chat into its robot bubble
    if(top === 'ovSession'){ close('ovSession'); renderAll(); } else close(top); return;
  }
  // 0.5.9: back never leaves the current tab. A sub-page goes to the page it came from inside the same tab, else to the tab's main page.
  const h = location.hash.slice(1), tab = tabOf(h), root = TAB_ROOT[tab];
  if(h === root) return;
  const prev = NAVI > 0 ? NAV[NAVI - 1] : null;
  if(prev && prev !== h && tabOf(prev) === tab){ NAVI--; navTo(prev); return; }
  NAV = [root]; NAVI = 0; navTo(root);
}

// ---------- tabs: My Food Log → Gym → Food Library → Kitchen, switched from the side strip or a short pull past the end ----------
let navKeepScroll = false, SWITCHING = false;
function markRail(tab){ const rail = $('rail'); if(!rail) return; rail.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); }
function tabTarget(tab){ if(tab === 'today'){ curDay = todayKey(); return 'today'; }
  if(HUB_TABS.includes(tab)) return TAB_ROOT[tab];   // the hub rule: a hub tab always opens on its hub
  const last = ui['lastIn_' + tab]; return last && tabOf(last) === tab ? last : TAB_ROOT[tab]; }

// ---------- Refinements: the hub rule, one rule for every tab that opens on a hub (change 7) ----------
// 1. Leaving a hub tab and coming back lands on the hub (tabTarget above). 2. Pressing a tab from inside a section goes to that
// tab's hub (the bottom bar, wire/09). 3. Leaving the app inside a section and coming back within the draft time (Draft, js/draft.js,
// the same 3 minutes as the windows) shows the same section at the same scroll place; later, the hub. The timer starts on leaving.
const HUB_TABS = ['gym', 'food'];   // tabs whose main page is a hub of sections (Refinements #4: the Food Library too)
const hubSec = h => { const tab = tabOf(h); return HUB_TABS.includes(tab) && h !== TAB_ROOT[tab]; };
function hubLeave(){   // the app is going to the background or closing
  const h = location.hash.slice(1), pg = document.querySelector('section.page:not(.hide)');
  if(hubSec(h)) Draft.put('hub', { h, y: pg ? Math.round(pg.scrollTop) : 0 }); else Draft.clear('hub'); }
function hubReturn(){   // back from the background: past the draft time, a section goes back to its hub (not under an open window)
  const h = location.hash.slice(1); if(!hubSec(h) || Draft.get('hub') || document.querySelector('.overlay.open')) return;
  NAV = [TAB_ROOT[tabOf(h)]]; NAVI = 0; history.replaceState(null, '', '#' + TAB_ROOT[tabOf(h)]); route(); }
function hubBoot(){   // a fresh start: within the draft time, open the section that was left, at the same place
  const d = Draft.get('hub'); if(!d || !hubSec(d.h)) return;
  history.replaceState(null, '', '#' + d.h); NAV = [TAB_ROOT[tabOf(d.h)], d.h]; NAVI = 1;
  if(d.y) setTimeout(() => { const pg = document.querySelector('section.page:not(.hide)'); if(pg && location.hash.slice(1) === d.h) pg.scrollTop = d.y; }, 80); }
// ---------- the action pills above the bottom bar (main button, scan button, coach pill) when they change ----------
// 0.7.9.1: copies of the old pills drop out of view together (so their text never changes mid-way), then the new pills rise
// together as one unit: same curve, same time, no stagger, no overshoot (~300 ms down, ~350 ms up with a soft settle).
// Transform and opacity only, nothing moves in the layout while it is visible. A new change mid-way carries on from where the
// pills are: copies still dropping keep dropping; pills still rising drop from their current height. A tab switch starts at
// once; a change inside a tab (Fridge → Groceries, Store-Bought → Supplements) first checks whether the pills really changed, so
// identical pills never blink. With Reduce Motion they just swap.
const PILL_ACTS = '#fab2,#fab,.coachpill', PILL_OUT = 300, PILL_IN = 350, PILL_DROP = 96, PILL_EASE = 'cubic-bezier(.4,0,.2,1)';
const pillShown = el => !el.classList.contains('hide') && el.getClientRects().length && getComputedStyle(el).display !== 'none';
const pillsNow = () => [...document.querySelectorAll(PILL_ACTS)].filter(el => !el.classList.contains('pillghost') && pillShown(el)).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
const pillSig = els => els.map(el => { const r = el.getBoundingClientRect(); return `${el.id}|${el.textContent.trim()}|${Math.round(r.left)}|${Math.round(r.width)}`; }).join(';');
const pillReduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches || !document.body.animate;
// pills rising from below into place (`els` defaults to every pill showing now; dy/op0 = where a rise cut short carries on from)
function pillsIn(els, dy = PILL_DROP, op0 = 0){
  const all = [...document.querySelectorAll(PILL_ACTS)].filter(el => !el.classList.contains('pillghost'));
  all.forEach(el => { el.getAnimations().forEach(a => a.cancel()); el.style.transition = 'none'; });   // no CSS fade of their own on the way back
  document.body.classList.remove('pillswap');
  (els || pillsNow()).forEach(el => { const op = getComputedStyle(el).opacity;   // a greyed-out AI pill keeps its dimmed look
    el.style.willChange = 'transform,opacity';
    el.animate([{ transform: `translate3d(0,${dy}px,0)`, opacity: Math.min(op0, op) }, { transform: 'translate3d(0,0,0)', opacity: op }],
      { duration: Math.max(120, PILL_IN * dy / PILL_DROP), easing: PILL_EASE, fill: 'backwards' }).finished.then(() => { el.style.willChange = ''; }, () => {}); });
  requestAnimationFrame(() => all.forEach(el => el.style.transition = ''));
}
function pillSwap(soft){
  if(pillReduce()) return;
  // copies already on their way down: let them carry on; the new pills rise when they are out of sight
  if(pillSwap.out && document.querySelector('.pillghost')) return;
  clearTimeout(pillSwap.t); cancelAnimationFrame(pillSwap.f); document.querySelectorAll('.pillghost').forEach(g => g.remove());
  const olds = pillsNow(), sig0 = pillSig(olds), now = olds.map(el => [el.getBoundingClientRect(), getComputedStyle(el).opacity]);   // where they are right now (a rise may be under way)
  olds.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  const ghosts = olds.map((el, i) => { const r = el.getBoundingClientRect(), [r0, op] = now[i], cs = getComputedStyle(el), g = el.cloneNode(true);
    g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(x => x.removeAttribute('id')); g.classList.add('pillghost'); g.setAttribute('aria-hidden', 'true'); g.tabIndex = -1;
    const pin = { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', right: 'auto', bottom: 'auto', margin: '0', 'z-index': cs.zIndex };
    Object.entries(pin).forEach(([k, v]) => g.style.setProperty(k, v, 'important'));   // geometry beats the pills' own !important rules; transform and opacity stay free to animate
    const dy = Math.max(0, Math.min(PILL_DROP, r0.top - r.top));
    Object.assign(g.style, { transform: `translate3d(0,${dy}px,0)`, transition: 'none', animation: 'none', opacity: op, willChange: 'transform,opacity' }); g._dy = dy; document.body.appendChild(g); return g; });
  document.body.classList.add('pillswap');   // the real pills wait out of sight while the page changes under them
  const out = () => { pillSwap.out = true;
    const left = ghosts.length ? 1 - ghosts[0]._dy / PILL_DROP : 1, dur = Math.max(120, PILL_OUT * left);   // all copies are at the same height, so they move as one
    ghosts.forEach(g => g.animate([{ transform: g.style.transform, opacity: g.style.opacity }, { transform: `translate3d(0,${PILL_DROP}px,0)`, opacity: 0 }],
      { duration: dur, easing: PILL_EASE, fill: 'forwards' }));
    pillSwap.t = setTimeout(() => { pillSwap.out = false; ghosts.forEach(g => g.remove()); pillsIn(); }, dur + 10); };
  if(!soft){ out(); return; }
  // inside a tab: wait two frames (the page and the coach pill have been placed), then only animate if something changed
  pillSwap.f = requestAnimationFrame(() => { pillSwap.f = requestAnimationFrame(() => {
    if(pillSig(pillsNow()) === sig0){ const g0 = ghosts[0]; ghosts.forEach(g => g.remove()); document.body.classList.remove('pillswap');
      if(g0 && g0._dy > .5) pillsIn(olds, g0._dy, +g0.style.opacity); return; }   // nothing changed: a rise that was under way just finishes
    out(); }); });
}
// start-up: the pills rise once everything (fonts, coach pill) is in place, so the main button never visibly jumps aside
function pillsBoot(){ if(pillReduce()) return; document.body.classList.add('pillswap');
  let last = '', n = 0;   // rise only when the pills have stopped moving (same place and text twice in a row), 1.5 s at most
  const check = () => { const sg = pillSig(pillsNow()); if((sg === last && sg) || ++n > 12){ requestAnimationFrame(() => pillsIn()); return; } last = sg; setTimeout(check, 120); };
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 600))]).then(() => setTimeout(check, 420)); }   // the coach pill places itself ~300 ms after start (coach.js)

// 0.7.9.4: one calm slide, transform only, no fade, no old-page copy. The new page is fully solid from the first frame (.pgnew: solid page colour)
// and slides in 28 px; what its edge uncovers is the plain page colour, never the old page. 320 ms, the same ease as the bottom bar's circle.
// Reduce Motion = a plain swap. A tap during the motion is remembered and played right after, so the circle and the page stay in step.
const TAB_EASE = 'cubic-bezier(.45,0,.2,1)', TAB_MS = 320;
function switchTab(dir, toTab, to){   // to: open this page of the tab instead of its usual one
  const h = location.hash.slice(1), cur = tabOf(h), i = tabIdx(cur);   // Profile is the last tab
  const tab = toTab || [...TABS3, 'profile'][i + dir]; if(!tab || tab === cur) return;
  if(SWITCHING){ switchTab.next = tab; return; }
  if(!dir) dir = tabIdx(tab) > i ? 1 : -1;
  document.querySelectorAll('.pghost').forEach(g => g.remove()); document.querySelectorAll('.pgnew').forEach(g => g.classList.remove('pgnew'));
  const pg = document.querySelector('section.page:not(.hide)'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!pg || !pg.animate || reduce){ const tg = to || tabTarget(tab); if(location.hash.slice(1) === tg) route(); else location.replace('#' + tg); return; }
  SWITCHING = true; switchTab.next = null; pillSwap();
  const target = to || tabTarget(tab); let np = null, finished = false, tm = 0;
  const done = () => { if(finished) return; finished = true; clearTimeout(tm); removeEventListener('hashchange', run);
    document.querySelectorAll('.pgnew').forEach(g => g.classList.remove('pgnew')); SWITCHING = false;
    const nx = switchTab.next; switchTab.next = null; if(nx) switchTab(0, nx); };
  function run(){ if(finished || np) return; np = document.querySelector('section.page:not(.hide)');
    if(!np){ done(); return; }
    np.classList.add('pgnew');   // solid from this very frame, before the slide starts
    const a = np.animate([{ transform: `translate3d(${dir * 28}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: TAB_MS, easing: TAB_EASE });
    a.onfinish = a.oncancel = done; tm = setTimeout(done, TAB_MS + 60); }
  if(location.hash.slice(1) === target){ route(); run(); }
  else { addEventListener('hashchange', run, { once: true }); location.replace('#' + target); }   // 0.6.5: replace, not push — the phone's back never jumps tabs; the page swaps on hashchange, then it moves
}

function route(){
  let h = location.hash.slice(1);
  if(!h || h === 'start' || h === 'home'){ history.replaceState(null, '', h === 'home' ? '#foods' : homeHash()); }
  h = location.hash.replace('#','');   // re-read: an old start / home link was just switched
  { const prev = route.last; route.last = h; if(prev && prev !== h && !SWITCHING && tabOf(prev) === tabOf(h)) pillSwap(true); }   // 0.7.9: pills changing inside a tab glide too
  const kit = kitchenOn();
  if(!kit && (h === 'fridge' || h === 'groc')){ h = homeHash().slice(1); history.replaceState(null, '', '#' + h); }   // Kitchen is off: nothing opens it
  const kv = kit && ['fridge', 'groc'].includes(h) ? h : '';   // Kitchen = Fridge · Groceries under one pill
  const page = kv ? (kv === 'groc' ? 'groc' : 'fridge') : h === 'foods' || h === 'meals' || h === 'supps' ? 'foods' : h.startsWith('gym') ? 'gym' : ['today','settings','profile'].includes(h) ? h : 'foods';
  [['pgFoods','foods'],['pgSupps','supps'],['pgToday','today'],['pgFridge','fridge'],['pgGym','gym'],['pgSettings','settings'],['pgProfile','profile']].forEach(([id, p]) => $(id) && $(id).classList.toggle('hide', page !== p && !(p === 'fridge' && page === 'groc')));
  { const shown = document.querySelector('section.page:not(.hide):not(.pghost)');   // 0.7.9.2: a page that newly appears fades in with a small rise (a tab switch runs its own cross-fade)
    if(shown && route.shown !== shown && !SWITCHING && shown.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) shown.animate([{ opacity: 0, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 300, easing: TAB_EASE });
    route.shown = shown; }
  // 0.6.9: Fridge and Groceries are one page; only the list under the pill changes, so the pill glides
  $('fridgeView').classList.toggle('hide', kv !== 'fridge'); $('pgGroc').classList.toggle('hide', kv !== 'groc');
  const tab = h === 'meals' ? 'meals' : h === 'supps' ? 'supps' : 'store';   // 0.6.3.1: three tabs
  const fhub = page === 'foods' && !['foods', 'meals', 'supps'].includes(h);   // Refinements #4: the Food Library opens on its hub
  $('fHub').classList.toggle('hide', !fhub); $('fTabs').classList.toggle('hide', fhub); $('backBtn').classList.toggle('hide', fhub);
  $('pgFoods').querySelector('header h1').textContent = t(fhub ? 'tabFood' : { store: 'tabStore', meals: 'tabMeals', supps: 'tabSupps' }[tab]);
  if(fhub) renderFoodHub(); else if(page === 'foods' && typeof FOOD_CAR === 'object') FOOD_CAR.set(h);
  $('storeView').classList.toggle('hide', fhub || tab !== 'store');
  $('mealsView').classList.toggle('hide', fhub || tab !== 'meals');
  $('foodSupps').classList.toggle('hide', fhub || tab !== 'supps');
  document.querySelectorAll('.fgseg').forEach(sg => sg.querySelectorAll('[data-fg]').forEach(b => b.classList.toggle('on', b.dataset.fg === kv)));
  const ft = tabOf(h); markRail(ft);
  ui['lastIn_' + ft] = h; saveUI();
  const fab = $('fab');
  fab.classList.toggle('hide', (page === 'foods' && tab === 'meals' && !fhub) || page === 'groc' || page === 'settings' || page === 'profile' || (page === 'gym' && !!GSEC[h] && GSEC[h] !== 'tpl'));
  { const fl = page === 'today' ? t('logFab') : page === 'fridge' ? t('fridgeFab') : tab === 'supps' ? t('addSuppFab') : t('addFoodFab');
    if(page === 'today') fab.textContent = fl; else fab.innerHTML = fabBtn('plus', fl); }
  fab.dataset.action = tab === 'meals' ? 'meals' : ['today','fridge','gym'].includes(page) ? page : tab;
  if(h === 'gym-lib'){ fab.dataset.action = 'gymlib'; fab.innerHTML = fabBtn('plus', t('createWorkout')); }
  else if(page === 'gym') { if(active) fab.textContent = t('resume', { m: Math.floor(sesMs() / 60000) }); else fab.innerHTML = fabBtn('play', t('startWk')); }
  renderAll(); if(page === 'profile' && typeof renderProfile === 'function') renderProfile();
  const pg = document.querySelector('section.page:not(.hide)'); if(pg && !navKeepScroll) pg.scrollTop = 0;
}

// ---------- Refinements: the rotating pill carousel on top of a hub's sections (like the iPhone camera mode picker) ----------
// One shared component (Gym Buddy now, the Food Library next). The chosen pill always sits in the middle under a still highlight
// (the .mpill knob look); the row is a native scroll-snap strip, so swiping or tapping glides another pill into the middle.
// All pills are as wide as the longest label (measured when labels or the width change, never while moving), so every pill's
// place is known in advance and a frame only reads scrollLeft and writes transform + opacity. A disabled pill (Coming Soon)
// can be seen but never chosen. Reduce Motion: instant jumps, no scaling.
//   const c = pillCarousel(el, { items: [{ key, label: () => text, soon: true? }], onPick: key => … })
//   c.set(key)   show this pill in the middle without calling onPick (when the page is drawn)
//   page: { area, views }  (Refinements #4) swiping the page sideways moves to the next or previous pill, like flipping photos:
//   the section follows the finger 1:1 (shared drag helper), then slides out while the next one slides in. views() = what is showing.
const CAR_GAP = 4, CAR_FADE = .6, CAR_SHRINK = .1, CAR_TURN = 38, CAR_PERSP = 360;   // neighbours: opacity down to .4, scale down to .9, turned away CAR_TURN degrees like the side of a wheel
function carFade(els){   // the content under the carousel: a light cross fade, never from blank
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  els.forEach(el => el && el.animate && el.animate(reduce ? [{ opacity: .6 }, { opacity: 1 }] : [{ opacity: .35, transform: 'translate3d(0,4px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: reduce ? 120 : 240, easing: 'cubic-bezier(.3,1.3,.6,1)' }));
}
// Endless (Refinements #4, Petros): the pills are drawn three times in a row and the row always rests on the middle copy; after it
// settles on a copy to the left or right it jumps (unseen: same labels in the same places) back to the middle, so it never runs out.
function swipePages(page, car, stepTo, pills){
  const NO = 'input,textarea,select,button.stepper,.pcar,.swipebox [data-id],.swipebox .exc,.swipebox .tpcard,.mxr,[data-noswipe],svg.anat,.anatomy';
  let w = 0, vs = [];
  page.area.style.touchAction = 'pan-y';   // sideways is ours: the phone never starts its own pan (which cancelled the swipe or made the page wobble); rows that scroll sideways inside still do
  const sideScroll = t => { for(let e = t; e && e !== page.area; e = e.parentElement){ if(e.scrollWidth > e.clientWidth + 2){ const ox = getComputedStyle(e).overflowX; if(ox === 'auto' || ox === 'scroll') return true; } } return false; };
  dragger(page.area, { axis: 'x', slop: 12,
    item: e => car.classList.contains('hide') || document.querySelector('.overlay.open') || e.target.closest(NO) || sideScroll(e.target) ? null : page.area,
    start: () => { w = page.area.clientWidth || 360; vs = page.views(); vs.forEach(v => { v.getAnimations().forEach(a => a.cancel()); v.style.willChange = 'transform,opacity'; }); },
    move: s => { const tr = `translate3d(${s.dx.toFixed(1)}px,0,0)`, op = (1 - Math.min(.5, Math.abs(s.dx) / w * .6)).toFixed(3);
      vs.forEach(v => { v.style.transform = tr; v.style.opacity = op; }); pills.drag(-s.dx / w); },
    end: (s, ok) => { const dx = s.dx, dir = dx < 0 ? 1 : -1, op0 = 1 - Math.min(.5, Math.abs(dx) / w * .6);
      const clear = v => { v.style.transform = ''; v.style.opacity = ''; v.style.willChange = ''; };
      const go = ok && (Math.abs(dx) > w * .28 || (Math.abs(s.vx) > .45 && Math.abs(dx) > 40 && Math.sign(s.vx) === Math.sign(dx)));
      if(!go){ pills.back(); vs.forEach(v => { clear(v); springTo(v, { x: dx }, { x: 0 }, { x: s.vx }, { op: [op0, 1] }); }); return; }
      pills.lead(dir);
      vs.forEach(v => { clear(v); springTo(v, { x: dx }, { x: -dir * Math.max(w * .6, Math.abs(dx) + 48) }, { x: s.vx }, { k: 420, damp: 1, fill: 'forwards', op: [op0, 0] }); });
      setTimeout(() => { const old = vs; if(!stepTo(dir)){ pills.back(); old.forEach(v => { v.getAnimations().forEach(a => a.cancel()); }); return; }
        old.forEach(v => v.getAnimations().forEach(a => a.cancel()));
        page.views().forEach(v => springTo(v, { x: dir * w * .45 }, { x: 0 }, { x: s.vx }, { k: 300, op: [0, 1] })); }, 130); } });
}
function pillCarousel(el, { items, onPick, page }){
  const n = items.length, R = 3;
  el.classList.add('pcar'); el.setAttribute('role', 'tablist');
  el.innerHTML = `<span class="pcknob" aria-hidden="true"></span><div class="pcrow"><i class="pcsp"></i>${Array.from({ length: n * R }, (_, i) => { const it = items[i % n], mid = i >= n && i < 2 * n;
    return `<button type="button" role="tab" data-car="${esc(it.key)}" data-i="${i}"${it.soon ? ' class="soon" aria-disabled="true"' : ''}${mid ? '' : ' tabindex="-1" aria-hidden="true"'}><span class="pcf"><b></b>${it.soon ? '<small></small>' : ''}</span></button>`; }).join('')}<i class="pcsp"></i></div>`;
  const row = el.querySelector('.pcrow'), btns = [...row.querySelectorAll('button')], faces = btns.map(b => b.firstChild), itm = i => items[i % n];   // faces: what turns and fades (the buttons stay square, so the snap reads true boxes)
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = -1, near = -1, step = 0, w = 0, labels = '', raf = 0, settleT = 0, jumping = false, gliding = false, hold = false;   // hold: this pill's own tap / swipe is picking, so set() must not jump the strip (the glide does the moving)
  // Petros: while the page under the pills is swiped, the pills turn with it like a wheel (the chosen label slides out of the highlight while
  // the next slides in). off = how far the strip is pushed past its scroll spot sl. While pushed, the strip's scroll snap is off (with snap
  // on, the browser re-snapped every frame and cancelled the push: the pills shook in place instead of following the finger).
  // Where the browser can tie an animation to a scroll position (iOS 26+, Chrome; class .pcnat), the turn and fade of every pill are done
  // by the browser itself, in step with the scroll at the screen's full frame rate: the push then really scrolls the strip, and a glide is
  // the browser's own smooth scroll. Elsewhere frame() draws each pill (transform), and a glide is sampled keyframes; both run off the
  // main thread, so drawing the new section never stalls them.
  const NAT = !!(window.CSS && CSS.supports('animation-timeline', 'view(inline)') && CSS.supports('animation-range', 'cover 0% cover 100%'));
  if(NAT) el.classList.add('pcnat');
  const nat = () => NAT && !reduce();
  let off = 0, pushed = false, sl = 0, sld = null;   // sld: the glide running now { from, to, t0, ms, done, tm }
  function push(){ if(pushed) return; pushed = true; sl = row.scrollLeft; row.style.scrollSnapType = 'none'; }
  function unpush(){ pushed = false; row.style.scrollSnapType = ''; }   // after the last frame(): the snap must see the strip at rest
  const ease = p => 1 - Math.pow(1 - p, 3);
  function stopSlide(){ if(!sld) return null; const s = sld; sld = null; clearTimeout(s.tm);   // freeze where it is now
    if(nat()){ off = row.scrollLeft - sl; row.scrollLeft = sl + off; }   // writing the spot stops the smooth scroll
    else { off = s.from + (s.to - s.from) * ease(Math.min(1, (performance.now() - s.t0) / s.ms)); frame(); faces.forEach(b => b.getAnimations().forEach(a => a.cancel())); }
    return s; }
  function endSlide(s){ if(sld !== s) return; sld = null; clearTimeout(s.tm); off = s.to;
    if(nat()) row.scrollLeft = sl + off; else { frame(); faces.forEach(b => b.getAnimations().forEach(a => a.cancel())); } if(s.done) s.done(); }   // .pcnat: never cancel (that would stop the browser's own turn)
  function dragOff(f){ if(!step) return; const s = stopSlide(); if(s && s.done) s.done();   // a new drag during a glide: finish that change first
    push(); off = Math.max(-step, Math.min(step, f * step)); if(nat()) row.scrollLeft = sl + off; frame(); }
  function slideOff(to, ms, done){ if(!step){ if(done) done(); return; } stopSlide(); push(); const from = off;
    if(reduce() || Math.abs(to - from) < .5){ off = to; if(nat()) row.scrollLeft = sl + off; frame(); if(done) done(); return; }
    const s = sld = { from, to, t0: performance.now(), ms, done };
    if(nat()){ row.scrollTo({ left: sl + to, behavior: 'smooth' }); s.tm = setTimeout(() => endSlide(s), ms + 450); return; }   // ends on arrival (scroll handler); the timer is a safety net
    const N = Math.max(4, Math.round(ms / 16)), keys = btns.map(() => []);
    for(let k = 0; k <= N; k++){ const o = from + (to - from) * ease(k / N); btns.forEach((b, i) => { const [tf, op] = look(i, sl + o, o, false); keys[i].push({ transform: tf, opacity: op }); }); }
    faces.forEach((b, i) => b.animate(keys[i], { duration: ms, easing: 'linear', fill: 'forwards' }));
    s.tm = setTimeout(() => endSlide(s), ms); }
  function sliding(to){ return sld && Math.abs(sld.to - to) < .5 ? sld : null; }
  function measure(){   // only when labels or the width changed (never during a scroll)
    const txt = items.map(it => it.label()).join('|'), rw = row.clientWidth; if(!rw) return false;
    if(txt === labels && rw === w) return true;
    labels = txt; w = rw;
    btns.forEach((b, i) => { b.querySelector('b').textContent = itm(i).label(); const sm = b.querySelector('small'); if(sm) sm.textContent = t('carSoon'); });
    el.classList.add('meas'); const pw = Math.min(Math.ceil(Math.max(...btns.slice(n, 2 * n).map(b => b.scrollWidth))) + 12, Math.round(rw * .62)); el.classList.remove('meas');
    el.style.setProperty('--pw', pw + 'px'); step = pw + CAR_GAP; el.style.setProperty('--pr', (1.5 * step).toFixed(1) + 'px'); return true;
  }
  function look(i, x, o, red){   // pill i's transform + opacity when the strip is at x, pushed by o
    const d = Math.max(-1.5, Math.min(1.5, (i * step - x) / step)), a = Math.min(1, Math.abs(d)), tx = `translate3d(${(-o).toFixed(2)}px,0,0) `;
    return [red ? tx : `${tx}perspective(${CAR_PERSP}px) rotateY(${(d * CAR_TURN).toFixed(2)}deg) scale(${(1 - CAR_SHRINK * a).toFixed(4)})`,
      ((1 - CAR_FADE * a) * (itm(i).soon ? .5 : 1)).toFixed(3)]; }
  function frame(){ raf = 0; if(!step) return;
    const x = pushed ? sl + off : row.scrollLeft, red = reduce();   // pushed: no layout read while the finger moves
    if(!nat()) faces.forEach((f, i) => { const [tf, op] = look(i, x, off, red); f.style.transform = tf; f.style.opacity = op; });
    const k = Math.max(0, Math.min(btns.length - 1, Math.round(x / step)));
    if(k !== near){ if(near !== -1 && !jumping) Phone.haptic(); near = k; }   // a light tick each time a new pill reaches the middle
  }
  function mark(i){ cur = i; btns.forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); }); }
  function centre(i, smooth){ if(!step) return; const sm = smooth && !reduce(); gliding = sm; row.style.scrollSnapType = sm ? 'none' : ''; row.scrollTo({ left: i * step, behavior: sm ? 'smooth' : 'auto' }); if(!sm) frame(); }
  function wrap(){   // back to the same pill in the middle copy, without any visible change
    if(cur < 0 || (cur >= n && cur < 2 * n) || !step) return; const j = n + cur % n;
    jumping = true; near = j; mark(j); row.scrollLeft = j * step; frame(); setTimeout(() => { jumping = false; }, 60); }
  const fade = () => { if(page) carFade(page.views()); };
  function pick(i){ if(i < 0 || itm(i).soon) { centre(cur, true); return; }
    if(i === cur) return; const same = cur >= 0 && cur % n === i % n; mark(i); if(!same){ hold = true; try{ onPick(itm(i).key); } finally{ hold = false; } fade(); } }
  function settle(){ clearTimeout(settleT); if(pushed) return; jumping = gliding = false; row.style.scrollSnapType = ''; if(!step) return; pick(Math.max(0, Math.min(btns.length - 1, Math.round(row.scrollLeft / step)))); if(!gliding){ wrap(); trim(); } }
  function trim(){   // the browser's snap reads the tilted pill's box and can stop a few px short: nudge the resting strip onto the exact spot
    if(cur < 0 || !step || pushed || sld) return; const e = cur * step - row.scrollLeft;
    if(Math.abs(e) > .5 && Math.abs(e) < step / 2){ row.style.scrollSnapType = 'none'; row.scrollLeft = cur * step; frame(); requestAnimationFrame(() => { row.style.scrollSnapType = ''; }); } }
  row.addEventListener('scroll', () => { if(!raf) raf = requestAnimationFrame(frame); clearTimeout(settleT);
    if(pushed){ if(sld && nat() && Math.abs(row.scrollLeft - sl - sld.to) < 1) endSlide(sld); return; }   // pushed by the page swipe: it picks, not the strip
    settleT = setTimeout(settle, 140); }, { passive: true });
  row.addEventListener('scrollend', () => { if(pushed){ if(sld && nat()) endSlide(sld); return; } if(step && Math.abs(row.scrollLeft / step - Math.round(row.scrollLeft / step)) * step < 2) settle(); });   // only once it rests on a pill
  row.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; const i = +b.dataset.i;
    if(itm(i).soon){ Phone.haptic(); return; }
    if(i === cur) return; Phone.haptic(); const same = cur >= 0 && cur % n === i % n; mark(i); if(!same){ hold = true; try{ onPick(itm(i).key); } finally{ hold = false; } fade(); } centre(i, true); });
  function stepTo(dir){   // the next (1) or previous (-1) pill that can be chosen, round the loop; false if there is none
    if(cur < 0) return false; let i = cur;
    for(let k = 0; k < n; k++){ i = (i + dir + 3 * n) % (3 * n); if(!itm(i).soon) break; }
    if(i % n === cur % n) return false;
    const from = cur, was = pushed; mark(i); hold = true; try{ onPick(itm(i).key); } finally{ hold = false; }
    if(!was){ centre(i, true); return true; }
    const land = () => { if(near !== i) Phone.haptic(); off = 0; jumping = true; near = i; row.scrollLeft = sl = i * step; frame(); unpush(); setTimeout(() => { jumping = false; wrap(); }, 60); };
    const s = sliding((i - from) * step); if(s) s.done = land; else slideOff((i - from) * step, 240, land);   // the glide started on release carries on, one move
    return true; }
  if(page) swipePages(page, el, stepTo, { drag: dragOff, back: () => slideOff(0, 260, () => { off = 0; frame(); unpush(); }), lead: dir => slideOff(dir * step, 300) });
  if(window.ResizeObserver) new ResizeObserver(() => { if(cur >= 0 && measure()) centre(cur, false); }).observe(el);
  return {
    set(key){ const k = items.findIndex(it => it.key === key); if(k < 0) return;
      const i = cur >= 0 && cur % n === k ? cur : n + k;   // keep the copy it is on (a tap's glide may still be on its way there)
      if(!measure()) { mark(i); return; }
      if(hold){ if(i !== cur) mark(i); return; }
      if(i === cur && gliding) return;
      if(i !== cur) mark(i);
      if(Math.abs(row.scrollLeft - i * step) > 1){ jumping = true; near = i; centre(i, false); setTimeout(() => { jumping = false; }, 60); } else frame(); }
  };
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
  saveG('plan'); if(SUP.key !== settings.geminiKey){ settings.geminiKey = SUP.key; Store.save('settings', settings); aiGate(); }
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
function close(id){ AI.noteClose(id); const el = $(id); if(!el) return; const was = el.classList.contains('open'); if(was) Draft.closed(id);
  const pose = was && el._ra && !reducedMotion() ? sheetPose(el) : null; if(el._ra){ el._ra.stop(); el._ra = null; if(!pose) el.classList.remove('reopen'); }   // closed again while still gliding in: carry on from where it is
  el.classList.remove('open'); if(id === 'ovScan'){ stopScan(); shopScanClosed(); } if(id === 'ovSession') keepAwake(false); if(id === 'ovExPick') $('pkBulb').classList.add('hide'); if(id === 'ovExPick' && was && typeof gymEmptyBack === 'function') gymEmptyBack(); if(id === 'ovCoach' && was) Coach.closed();
  // body.ovopen stays on until the 200 ms close animation ends, so a sliding-out sheet never passes under the title bar
  const sync = () => document.body.classList.toggle('ovopen', !!document.querySelector('.overlay.open,.overlay.closing'));
  stripSync();
  if(was && !matchMedia('(prefers-reduced-motion: reduce)').matches){ el.classList.add('closing'); if(pose) glide(el, pose, { tf: 'translateY(60px)', op: '0', bo: '0' }, 200, 'ease-in'); clearTimeout(el._ct);
    el._ct = setTimeout(() => { if(el._ra){ el._ra.stop(); el._ra = null; } el.classList.remove('closing', 'reopen'); sync(); }, 200); }
  sync(); }

// 0.7.10.7: the solid strip under the clock (body::before, theme.css) matches what is under it: the page, the page dimmed behind a floating window, or a full-screen window
function stripSync(){ const top = [...document.querySelectorAll('.overlay.open')].sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0)).pop();
  const full = top && (top.matches('#ovSummary,#ovRankFx.rkup') || !!top.querySelector(':scope>.sheet:is(.setpage,.formpage,.themepage,.session,.pksheet,.wqsheet,.rcptsheet)'));
  document.body.dataset.strip = !top ? '' : !full ? 'dim' : top.id === 'ovWkQR' ? 'paper' : ''; }

// 0.7.10.7: once a window has finished sliding / growing in, its animation is dropped (.settled, theme.css). An ended animation that still
// holds its last frame keeps the window on its own layer, and iPhone draws the text on such a layer softly (the chat window grew from scale .2 and stayed "scale 1")
// V3: a window that is told to open while it is still sliding out glides back from where it is (transform + opacity only, no jump), and one that
// is already open is left alone (restarting its slide made it flicker). Nothing here touches the window's contents, timers or scroll.
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function sheetPose(el){ const sh = el.querySelector(':scope>.sheet'); if(!sh) return null; const c = getComputedStyle(sh); return { sh, tf: c.transform, op: c.opacity, bo: getComputedStyle(el, '::before').opacity }; }
function glide(el, p, to, ms, ease, done){
  el.classList.add('reopen');   // motion.css: the CSS slide steps aside while this one runs
  const a = p.sh.animate([{ transform: p.tf, opacity: p.op }, { transform: to.tf, opacity: to.op }], { duration: ms, easing: ease, fill: 'forwards' });
  let b = null; try{ b = el.animate([{ opacity: p.bo }, { opacity: to.bo }], { duration: ms, easing: ease, fill: 'forwards', pseudoElement: '::before' }); }catch(e){}
  const ra = el._ra = { a, stop(){ a.cancel(); if(b) b.cancel(); } };
  if(done) a.onfinish = () => { if(el._ra === ra){ ra.stop(); el._ra = null; done(); } }; }
// V3: shared sliding pill rows (.chips): the browser scrolls them natively (touch + trackpad). A mouse wheel turns the row sideways, and a mouse can drag it;
// a drag never counts as a tap on a pill. Rows that do not overflow are left alone, so the page still scrolls normally over them.
(function(){ let d = null;
  addEventListener('wheel', e => { const r = e.target.closest && e.target.closest('.chips'); if(!r || e.ctrlKey || r.scrollWidth <= r.clientWidth + 1) return;
    if(e.deltaX || !(e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY)))) return;   // trackpads already send real sideways movement
    const max = r.scrollWidth - r.clientWidth, to = r.scrollLeft + (e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY); if((to <= 0 && r.scrollLeft <= 0) || (to >= max && r.scrollLeft >= max)) return;   // at the end: let the page scroll
    e.preventDefault(); r.scrollLeft = to; }, { passive: false });
  addEventListener('pointerdown', e => { const r = e.pointerType === 'mouse' && e.button === 0 && e.target.closest && e.target.closest('.chips'); if(r && r.scrollWidth > r.clientWidth + 1) d = { r, x: e.clientX, l: r.scrollLeft, moved: false }; });
  addEventListener('pointermove', e => { if(!d) return; const dx = e.clientX - d.x; if(!d.moved && Math.abs(dx) > 5) d.moved = true; if(d.moved) d.r.scrollLeft = d.l - dx; });
  addEventListener('pointerup', () => { if(d && d.moved){ const r = d.r; r._noTap = true; setTimeout(() => { r._noTap = false; }, 0); } d = null; });
  addEventListener('click', e => { const r = e.target.closest && e.target.closest('.chips'); if(r && r._noTap){ e.stopPropagation(); e.preventDefault(); } }, true);
})();
function settle(el){ const sh = el.querySelector(':scope>.sheet'); if(!sh) return; sh.classList.remove('settled');
  const done = e => { if(e.target !== sh) return; sh.removeEventListener('animationend', done); if(el.classList.contains('open')) sh.classList.add('settled'); };
  sh.addEventListener('animationend', done); }

function open(id){
  if(AI.holdOpen(id)) return;   // an AI answer is landing: the window waits behind the AI bubble
  const el = $(id), live = el.classList.contains('open'), pose = !live && el.classList.contains('closing') && !reducedMotion() ? sheetPose(el) : null;
  if(el._ra){ el._ra.stop(); el._ra = null; }
  el.classList.remove('closing'); clearTimeout(el._ct); el.style.zIndex = ++zTop; if(!live) Draft.opened(id); el.classList.add('open'); document.body.classList.add('ovopen'); stripSync();
  if(pose){ const sh = pose.sh; sh.classList.remove('settled'); glide(el, pose, { tf: 'none', op: '1', bo: '1' }, 220, 'cubic-bezier(.2,.9,.25,1)', () => { sh.classList.add('settled'); el.classList.remove('reopen'); }); }
  else { el.classList.remove('reopen'); if(!live) settle(el); }
  // search windows sit in the top two thirds at a fixed size (the list drops down under the box); short ones float in the middle at a steady size
  const searchy = !!el.querySelector('input[type=search],input.search,#exSearch,#iSearch,#lSearch,#fSearch2'); el.classList.toggle('searchy', searchy);
  if(searchy){ el.classList.remove('center'); return; }
  if(id === 'ovSession' || id === 'ovAsk' || id === 'ovCoach') return;   // 0.7.9.2: the coach chat places itself (coach.js lay)
  requestAnimationFrame(() => { const sh = el.querySelector('.sheet'); if(!sh) return; el.classList.add('measure'); const hgt = sh.offsetHeight; el.classList.remove('measure');
    el.classList.toggle('center', hgt < (window.innerHeight || 700) * .7); });
}

// ======================= settings + data =======================
// 0.7.7: Settings is a page inside the Profile tab (the gear at the top right of Profile); Back returns to Profile
function fillSettings(){ $('sKey').value = settings.geminiKey || ''; $('sModel').value = settings.model || ''; setSeg('#sLang', lang); status($('keyStatus'), ''); $('keyStatus').style.color = '';
  $('keySteps').innerHTML = KEY_STEPS[lang === 'el' ? 'el' : 'en'].map(x => `<li>${x}</li>`).join('');
  setSeg('#sSex', profile.sex || ''); $('sH').type = UN().h === 'ft' ? 'text' : 'number'; $('sH').placeholder = UN().h === 'ft' ? `5'10` : 'cm'; $('sH').value = hOut(profile.height); $('sW').placeholder = bwU(); $('sW').value = bwOut(latestWeight() || (targets && targets.bw) || ''); AIUsage.draw(); fillTargets(); }
function openSettings(){ document.querySelectorAll('.overlay.open').forEach(o => close(o.id)); fillSettings(); const h = location.hash.slice(1); if(h === 'settings') return;
  if(tabOf(h) === 'profile') go('settings'); else { ui.lastIn_profile = 'settings'; saveUI(); switchTab(0, 'profile'); } }

// ---------- 0.7.9: profile photo + name (Settings › Photo and Name, or tap your circle on Profile) ----------
// Camera or photo library through Phone.pickPhoto; drag and zoom it inside the circle; saved as a 192 px JPEG in profile.photo (synced, in backups).
const PH_PX = 192, PH_BOX = 200;
let PCROP = null;   // while placing a new photo: { img, w, h, x, y, z }
const pfPhoto = () => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(profile.photo || '') ? profile.photo : '';
const pfInitial = () => ((profile.name || Account.current().name || '').trim().charAt(0) || '').toUpperCase();
function avatarHtml(){ const p = pfPhoto(), i = pfInitial(); return p ? `<img class="avimg" src="${p}" alt="">` : i ? `<b class="avini">${esc(i)}</b>` : ''; }
function railAvatar(){ const r = document.querySelector('#rail [data-tab="profile"] .ri'); if(!r) return;
  r.innerHTML = avatarHtml() || svgIcon('user', 22, 2); const rl = $('rail'); if(rl) pillQueue(rl); }
// 0.7.9.1: the photo is sized once so it just fills the circle (z = 1); pinching (1× – 4×) and dragging only change its transform.
// x / y = how far its centre sits from the circle's centre. It always covers the circle: no empty edges.
const PH_ZMAX = 4;
const phBase = () => PH_BOX / Math.min(PCROP.w, PCROP.h);
function phCover(){ return phBase() * PCROP.z; }
function phLimits(z){ const c = PCROP, s = phBase() * z; return { mx: Math.max(0, (c.w * s - PH_BOX) / 2), my: Math.max(0, (c.h * s - PH_BOX) / 2) }; }
function phClamp(){ const c = PCROP; c.z = Math.max(1, Math.min(PH_ZMAX, c.z)); const { mx, my } = phLimits(c.z);
  c.x = Math.max(-mx, Math.min(mx, c.x)); c.y = Math.max(-my, Math.min(my, c.y)); }
function phDrawCrop(free){ const c = PCROP, im = $('phCirc').querySelector('img'); if(!c || !im) return; if(!free) phClamp();   // free: mid-gesture, edges rubber-band
  im.style.transform = `translate3d(${c.x.toFixed(2)}px,${c.y.toFixed(2)}px,0) scale(${c.z.toFixed(4)})`; }
function phSizeImg(){ const c = PCROP, s = phBase(), w = c.w * s, h = c.h * s;   // once per photo: the only layout change
  Object.assign(c.img.style, { width: w + 'px', height: h + 'px', marginLeft: -w / 2 + 'px', marginTop: -h / 2 + 'px' }); }
function drawPhoto(){
  const crop = !!PCROP, circ = $('phCirc'); circ.classList.toggle('cropping', crop);
  if(crop){ circ.innerHTML = ''; circ.appendChild(PCROP.img); PCROP.img.className = 'phimg'; phSizeImg(); phDrawCrop(); }
  else circ.innerHTML = avatarHtml() || svgIcon('user', 72, 1.6);
  $('phHint').classList.toggle('hide', !crop); $('phCropBtns').classList.toggle('hide', !crop);
  $('phBtns').classList.toggle('hide', crop); $('phDel').classList.toggle('hide', crop || !pfPhoto());
  $('phCam').innerHTML = `${svgIcon('camera', 18, 2)}<span>${esc(t('phTake'))}</span>`; $('phLib').innerHTML = `${svgIcon('image', 18, 2)}<span>${esc(t('phChoose'))}</span>`;
  $('phName').value = profile.name || '';
}
function openPhoto(){ PCROP = null; drawPhoto(); open('ovSProfile'); }
async function phPick(src){
  const f = await Phone.pickPhoto(src); if(!f) return;
  const url = URL.createObjectURL(f), img = new Image(); img.alt = ''; img.draggable = false;
  img.onload = () => { PCROP = { img, url, w: img.naturalWidth, h: img.naturalHeight, x: 0, y: 0, z: 1 }; drawPhoto(); };
  img.onerror = () => { URL.revokeObjectURL(url); toast(t('phBad')); }; img.src = url;
}
function phEnd(){ if(PCROP) URL.revokeObjectURL(PCROP.url); PCROP = null; drawPhoto(); }
function phSave(){
  const c = PCROP; if(!c) return; phClamp(); const s = phCover(), k = PH_PX / PH_BOX, cv = document.createElement('canvas'); cv.width = cv.height = PH_PX;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, PH_PX, PH_PX); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(c.img, (PH_BOX / 2 + c.x - c.w * s / 2) * k, (PH_BOX / 2 + c.y - c.h * s / 2) * k, c.w * s * k, c.h * s * k);
  profile.photo = cv.toDataURL('image/jpeg', .82); saveProfile(); phEnd(); railAvatar(); if(typeof renderProfile === 'function') renderProfile(); Phone.haptic(); toast(t('phSaved'));
}
function phRemove(){ delete profile.photo; saveProfile(); drawPhoto(); railAvatar(); if(typeof renderProfile === 'function') renderProfile(); }
function phName(v){ v = (v || '').trim().slice(0, 40); if(v) profile.name = v; else delete profile.name; saveProfile(); drawPhoto(); railAvatar(); if(typeof renderProfile === 'function') renderProfile(); }

function setLang(l){ lang = l; ui.lang = l; saveUI(); applyLang(); route(); }

function tabIdx(tab){ return tab === 'profile' ? TABS3.length : TABS3.indexOf(tab); }   // 0.7.7: Profile is the last tab (Settings lives inside it)

// swipe right-to-left past 1/3 (or a quick flick) to delete: finger on a phone, mouse drag on a computer. 0.7.9.1: on the shared
// drag helper: the row follows the finger 1:1, then carries on out with the finger's speed or springs back home
function makeSwipeDelete(box, itemSel, onDelete, opts){
  opts = opts || ({ '.exc': { skip: '.setrow,.rbwrap,.sethead,.newset,.endex2,.adddrop,.exdone,.wuhint,.expills' }, '.setrow': { buttons: true } })[itemSel] || {};
  const ok = t => !t.closest(opts.buttons ? 'input,textarea,select' : 'input,textarea,select,button,.stepper,.sbox') && !(opts.skip && t.closest(opts.skip));
  let w = 0;
  dragger(box, { axis: 'x', slop: 10,
    item: e => { const c = e.target.closest(itemSel); return c && box.contains(c) && ok(e.target) ? c : null; },
    claim: dx => dx < 0 && !document.body.classList.contains('sorting'),
    start: s => { const c = s.it; w = c.offsetWidth || 300; s.ready = false; c.getAnimations().forEach(a => a.cancel()); c.classList.add('swiping'); c.style.transition = 'none'; c.style.willChange = 'transform'; },
    move: s => { const c = s.it, dx = s.dx <= 0 ? s.dx : rubber(s.dx, 60), pr = Math.min(1, Math.max(0, -dx) / (w / 3));
      c.style.transform = `translate3d(${dx.toFixed(1)}px,0,0)`; c.style.setProperty('--sw', pr.toFixed(3));
      if((pr >= 1) !== s.ready){ s.ready = pr >= 1; c.classList.toggle('swready', s.ready); if(s.ready) Phone.haptic(); } },
    end: (s, fine) => { const c = s.it, dx = s.dx <= 0 ? s.dx : rubber(s.dx, 60); c.style.transform = ''; c.style.willChange = '';
      if(fine && (-dx >= w / 3 || (s.vx < -.6 && -dx > 40))){ c.style.setProperty('--sw', 1); c.classList.add('swready');
        springTo(c, { x: dx }, { x: -w * 1.1 }, { x: Math.min(s.vx, -.9) }, { k: 260, damp: 1, fill: 'forwards', op: [1, 0] }); setTimeout(() => onDelete(c), 190); return; }
      c.style.setProperty('--sw', 0); c.classList.remove('swready');
      springTo(c, { x: dx }, { x: 0 }, { x: s.vx }).finished.then(() => { c.style.transition = ''; c.classList.remove('swiping'); }, () => {}); } });
  box.classList.add('swipebox');
}

// ---------- 0.7.9.1: ONE drag helper for everything you move with a finger ----------
// Robot bubbles + the trash circle (AI.drag), swipe-to-delete rows (makeSwipeDelete),
// reordering exercise cards (makeSortable), the profile photo crop. Pointer events with pointer capture; the finger's position is
// only stored on pointermove and drawn once per frame (requestAnimationFrame); layout is read at the start, never during the move.
// A drag that has been claimed blocks the page's scroll (non-passive touchmove), so iPhone never takes it over half-way.
//   dragger(el, o) → { busy() }
//     o.item(e)     the element being dragged (for a list: e.target.closest(row)); null = not a drag here. Default: el
//     o.axis        'x' | 'y' | 'xy': which way a move must go to become a drag (the other way stays a page scroll). Default 'xy'
//     o.claim(dx, dy, s) optional finer test once the finger has moved `slop` px (e.g. only leftwards); false = let it go
//     o.hold        ms to press still before the drag starts (long press; moving first = a scroll). Default 0
//     o.slop        px before a move counts. Default 8
//     o.start(s)    the drag begins (s.it = the element, s.x0/y0 = where the finger went down)
//     o.move(s)     once per frame: s.dx / s.dy = how far the finger has moved (1:1), s.x / s.y = where it is
//     o.end(s, ok)  let go: s.vx / s.vy = the finger's speed (px per ms); ok = false when the phone cancelled the touch
//     o.multi(e)    a second finger touched down (pinch): the drag gives way
function dragger(el, o){
  o = o || {}; const axis = o.axis || 'xy', slop = o.slop ?? 8; let s = null, raf = 0, tm = 0;
  const frame = () => { raf = 0; if(s && s.on && o.move) o.move(s); };
  const track = e => { const now = e.timeStamp || performance.now(), dt = now - s.t;
    if(dt > 0){ const k = Math.min(1, dt / 32); s.vx += ((e.clientX - s.x) / dt - s.vx) * k; s.vy += ((e.clientY - s.y) / dt - s.vy) * k; }   // smoothed finger speed
    s.x = e.clientX; s.y = e.clientY; s.t = now; s.dx = s.x - s.x0; s.dy = s.y - s.y0; };
  const begin = () => { s.on = true; try{ el.setPointerCapture(s.id); }catch(x){} if(o.start) o.start(s); if(!raf) raf = requestAnimationFrame(frame); };
  el.addEventListener('pointerdown', e => {
    if(s || (e.pointerType === 'mouse' && e.button > 0) || !e.isPrimary) return;
    const it = o.item ? o.item(e) : el; if(!it) return;
    s = { it, id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, dx: 0, dy: 0, vx: 0, vy: 0, t: e.timeStamp || performance.now(), on: false, held: !o.hold };
    if(o.hold) tm = setTimeout(() => { tm = 0; if(s && !s.on){ s.held = true; begin(); } }, o.hold);
  });
  el.addEventListener('pointerdown', e => { if(s && !e.isPrimary && o.multi){ const was = s; finish(was, false); o.multi(e); } });
  el.addEventListener('pointermove', e => { if(!s || e.pointerId !== s.id) return; track(e);
    if(!s.on){ const ax = Math.abs(s.dx), ay = Math.abs(s.dy); if(Math.max(ax, ay) < slop) return;
      if(!s.held){ s = null; clearTimeout(tm); return; }   // moved before the long press: a scroll
      const way = axis === 'x' ? ax > ay * 1.2 : axis === 'y' ? ay > ax * 1.2 : true;
      if(!way || (o.claim && !o.claim(s.dx, s.dy, s))){ s = null; return; }
      begin(); }
    if(e.cancelable) e.preventDefault(); if(!raf) raf = requestAnimationFrame(frame); });
  const finish = (was, ok) => { s = null; clearTimeout(tm); cancelAnimationFrame(raf); raf = 0; if(!was.on) return;
    if(performance.now() - was.t > 80){ was.vx = 0; was.vy = 0; }   // the finger stopped before letting go: no fling
    if(o.move) o.move(was); if(o.end) o.end(was, ok);
    if(ok){ const eat = ev => { ev.stopImmediatePropagation(); ev.preventDefault(); }; el.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => el.removeEventListener('click', eat, true), 60); } };   // no tap on what you just let go
  el.addEventListener('pointerup', e => { if(s && e.pointerId === s.id) finish(s, true); });
  el.addEventListener('pointercancel', e => { if(s && e.pointerId === s.id) finish(s, false); });
  el.addEventListener('touchmove', e => { if(s && (s.on || (s.held && o.hold)) && e.cancelable) e.preventDefault(); }, { passive: false });   // a claimed drag: the page doesn't scroll
  el.addEventListener('contextmenu', e => { if(s && o.hold) e.preventDefault(); });
  return { busy: () => !!(s && s.on) };
}
// past an edge, the drag gives less and less (like iOS): d = how far past, dim = the size it is measured against
const rubber = (d, dim) => { const a = Math.abs(d), r = (1 - 1 / (a * .55 / (dim || 300) + 1)) * (dim || 300); return d < 0 ? -r : r; };
// a spring from where the finger let go to where it belongs, carrying the finger's speed (v in px per ms) so there's no jolt.
// Sampled once into keyframes so it runs on the compositor. from / to: { x, y, s } (translate px, scale). Returns the Animation.
function springTo(el, from, to, v, o){
  o = o || {}; const k = o.k || 260, c = o.c || 2 * Math.sqrt(k) * (o.damp ?? .86), dt = 1 / 120, keys = [];
  const f = { x: from.x || 0, y: from.y || 0, s: from.s ?? 1 }, g = { x: to.x || 0, y: to.y || 0, s: to.s ?? 1 };
  const dist = Math.hypot(g.x - f.x, g.y - f.y) || 1, along = v ? ((v.x || 0) * (g.x - f.x) + (v.y || 0) * (g.y - f.y)) / dist * 1000 : 0;   // speed toward the target, px per s
  let p = 0, u = Math.max(-8, Math.min(8, along / dist)), t = 0; const pts = [[0, 0]];   // p: 0 → 1 of the way; u: its speed (capped: a fast finger over a short way never flings it past and back)
  while(t < 1.2){ const a = -k * (p - 1) - c * u; u += a * dt; p += u * dt; t += dt; pts.push([t, p]); if(Math.abs(p - 1) < .002 && Math.abs(u) < .02) break; }
  const T = t, step = Math.max(1, Math.round(pts.length / 40));
  for(let i = 0; i < pts.length; i += step){ const [ti, pi] = pts[i], q = i + step >= pts.length ? 1 : pi;
    keys.push({ offset: ti / T, transform: `translate3d(${(f.x + (g.x - f.x) * q).toFixed(2)}px,${(f.y + (g.y - f.y) * q).toFixed(2)}px,0) scale(${(f.s + (g.s - f.s) * q).toFixed(4)})`,
      ...(o.op ? { opacity: (o.op[0] + (o.op[1] - o.op[0]) * Math.min(1, Math.max(0, q))).toFixed(3) } : {}) }); }
  keys[keys.length - 1].offset = 1;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return el.animate([keys[keys.length - 1], keys[keys.length - 1]], { duration: 1, fill: o.fill || 'none' });
  return el.animate(keys, { duration: T * 1000, easing: 'linear', fill: o.fill || 'none' });
}
