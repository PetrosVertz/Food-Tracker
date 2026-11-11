// Core helpers: storage, formatting, numbers, dates, Gemini calls. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function t(k, v){ const e = S[k]; let s = e ? (e[lang === 'el' ? 1 : 0] ?? e[0]) : k; if(v) for(const [a,b] of Object.entries(v)) s = s.split(`{${a}}`).join(b); return s; }

function subOf(cat, sub){ const c = CAT[cat]; return c ? (c.subs.find(s => s.id === sub) || c.subs[0]) : null; }

function iconOf(f){ const s = subOf(f.cat, f.sub); return s ? s.icon : null; }

function typeLabel(cat, sub){ const c = CAT[cat]; if(!c) return ''; const s = subOf(cat, sub); return s.id === 'general' ? L(c) : `${L(c)} · ${L(s)}`; }

function norm(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').replace(/\s+/g,' ').trim(); }

function guessType(text){
  const tx = norm(text); if(!tx) return null;
  let best = null, score = 0;
  for(const c of CATS) for(const s of c.subs) for(const k of s.kw){
    if(tx.includes(k)){ const sc = k.length + (s.opt.s ? 20 : 0); if(sc > score){ score = sc; best = { cat:c.id, sub:s.id }; } }
  }
  return best;
}

function guessState(name){
  const n = norm(name);
  return /ρυζι|rice|pasta|μακαρον|ζυμαρικ|spaghetti|σπαγγετ|πεννε|κριθαρακ|χυλοπιτ|oat|βρωμη|φακεσ|lentil|ρεβυθ|φασολια|quinoa|κινοα|κοτοπουλ|chicken|κιμα|mince|μοσχαρ|beef|χοιριν|pork|σολομ|salmon|ψαρι|γαριδ|αλευρ|flour/.test(n)
    && !/βραστ|ψητ|καπνιστ|μαγειρεμεν|cooked|grilled|smoked|ζαμπον|ham|κονσερβ/.test(n) ? 'uncooked' : 'ready';
}

function guessPieces(cat, sub, name){
  const n = norm(name);
  if(sub === 'bread') return /αλευρ|flour|τριμμα/.test(n) ? 'none' : 'slice';
  if(['wrap','crackers','biscuits','egg','bar','sausage','cake'].includes(sub)) return 'piece';
  if(['cheese','coldcuts'].includes(sub) && /φετεσ|σε φετ|slice|τοστ|toast/.test(n)) return 'slice';
  return 'none';
}

// ======================= food records =======================
// (saving and loading lives in js/platform/store.js)
function normFood(f){
  const clean = Object.fromEntries(Object.entries(f || {}).filter(([,v]) => v !== undefined && v !== null));
  const out = Object.assign({ unit:'g', packs:[], usualPack:null, noBrand:false, cat:null, sub:null, state:'ready' }, clean);
  if(!['g','ml'].includes(out.unit)) out.unit = 'g';
  if(!['uncooked','cooked','ready'].includes(out.state)) out.state = 'ready';
  out.packs = Array.isArray(out.packs) ? out.packs.map(Number).filter(n => n > 0) : [];
  out.noBrand = !!out.noBrand;
  if(!['none','slice','piece'].includes(out.pieces)) out.pieces = guessPieces(out.cat, out.sub, out.name);
  if(!['auto','piece','pack','100'].includes(out.display)) out.display = 'auto';
  out.pieceSkipped = !!out.pieceSkipped;
  return out;
}

// fetch with a time limit; an outer signal cancels it too
function fetchT(url, opts, ms, outer){
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), ms);
  const onOuter = () => ctl.abort();
  if(outer){ if(outer.aborted) ctl.abort(); else outer.addEventListener('abort', onOuter); }
  return fetch(url, { ...opts, signal: ctl.signal }).finally(() => { clearTimeout(timer); if(outer) outer.removeEventListener('abort', onOuter); });
}

function status(el, msg, err){ el.textContent = msg; el.classList.toggle('show', !!msg); el.classList.toggle('err', !!err); }

function setSeg(sel, v){ document.querySelectorAll(`${sel} button`).forEach(b => b.classList.toggle('on', b.dataset.v === v)); }

function claudeText(){
  const out = [`My Tracker data. Store-bought foods: ${foods.length}. Home-cooked meals: ${meals.length}. Macros are per 100 g or 100 ml as marked; [uncooked] = raw/dry weight, [cooked] = cooked weight. Exported ${new Date().toLocaleDateString('en-GB')}.`];
  const byCat = {};
  foods.forEach(f => { const k = f.cat ? CAT[f.cat].en : 'No type'; (byCat[k] = byCat[k] || []).push(f); });
  for(const [cat, list] of Object.entries(byCat).sort()){
    out.push(`\n${cat}:`);
    list.sort((a,b) => norm(a.name).localeCompare(norm(b.name))).forEach(f => out.push(
      `- ${f.noBrand ? '' : (f.brand ? f.brand + ' ' : '')}${f.gid && GENBY[f.gid] ? GENBY[f.gid].en : f.name}${f.sub && f.sub !== 'general' ? ` (${subOf(f.cat,f.sub).en.toLowerCase()})` : ''} [${f.state === 'ready' ? 'ready to eat' : f.state}], per 100 ${f.unit}: ${fmt(f.kcal)} kcal, P ${fmt(f.protein)} / C ${fmt(f.carbs)} / F ${fmt(f.fat)}` +
      (f.fiber!=null?`, fibre ${fmt(f.fiber)}`:'') + (f.sugar!=null?`, sugar ${fmt(f.sugar)}`:'') +
      (f.packs.length ? `; packs ${f.packs.map(p => fmtSize(p, f.unit)).join(', ')}${f.usualPack ? ` (usually ${fmtSize(f.usualPack, f.unit)})` : ''}` : '') +
      (f.pieces !== 'none' && (f.piece || f.serving) ? `; 1 ${f.pieces} = ${f.piece ? '' : '~'}${fmtSize(r1(f.piece || f.serving), f.unit)}${f.piece ? ' (weighed)' : ' (database estimate)'}` : '') +
      (f.notes ? ` — ${f.notes}` : '')));
  }
  if(meals.length){
    out.push('\nHome-cooked meals (per 100 g cooked):');
    meals.forEach(m => out.push(`- ${m.name}: ${m.kcal} kcal, P ${fmt(m.protein)} / C ${fmt(m.carbs)} / F ${fmt(m.fat)}; batch ${fmtSize(m.cookedWeight,'g')}${m.cookedEstimated ? ' (not weighed, raw total used)' : ''}; ingredients: ${m.ingredients.map(i => `${i.ref.name} ${fmtSize(i.grams, i.ref.unit)}`).join(', ')}${m.recipe ? '; has recipe' : ''}`));
  }
  const fl = liveItems();
  if(fl.length){ out.push('\nIn my fridge/freezer/cupboard right now:');
    fl.forEach(x => out.push(`- ${x.info.food && x.info.food.gid && GENBY[x.info.food.gid] ? GENBY[x.info.food.gid].en : x.info.name}${x.it.mealId ? ' (leftovers)' : ''}: ${fmtSize(x.it.qty, x.info.unit)} in the ${x.it.loc}`)); }
  const gl = groc.filter(g => !g.done);
  if(gl.length) out.push('\nGrocery list: ' + grocText().split('\n').join('; '));
  if(targets) out.push(`\nMy targets (${targets.goal}${targets.bw ? ', ' + targets.bw + ' kg' : ''}): gym day ${targets.gym.k} kcal P${targets.gym.p} C${targets.gym.c} F${targets.gym.f}; rest day ${targets.rest.k} kcal P${targets.rest.p} C${targets.rest.c} F${targets.rest.f}`);
  const td = dayLog[todayKey()] || [], di = dayInfo(todayKey());
  if(td.length){ const tt = dayTotals(todayKey()); out.push(`\nToday (${di.type === 'gym' ? 'gym day: ' + (di.work || '') + ' at ' + (di.time || '?') : 'rest day'}) I've eaten ${Math.round(tt.kcal)} kcal, P${Math.round(tt.p)} C${Math.round(tt.c)} F${Math.round(tt.f)}:`);
    td.slice().sort((a, b) => a.time.localeCompare(b.time)).forEach(e => out.push(`- ${e.time} ${e.name} ${fmtSize(e.amt, e.unit)} (${e.kcal} kcal)`)); }
  if(sessions.length || Object.keys(gymPlan).length){
    out.push('\nGym week: ' + [1, 2, 3, 4, 5, 6, 0].map(wd => { const p = gymPlan[wd]; const tp = p && tpls.find(x => x.id === p.tpl); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wd]} ${p && p.tpl === 'rest' ? 'rest' : tp ? tp.name + (p.time ? ' ' + p.time : '') : '-'}`; }).join(', '));
    const ids = [...new Set(sessions.flatMap(x => x.exercises.map(e => e.exId)))].filter(id => !isCardio(id));
    if(ids.length){ out.push('Lifts (last top set, best est. 1RM, change last 4 wks vs prior 4):');
      ids.forEach(id => { const c = strengthChange(id); if(!c) return; const top = c.h[c.h.length - 1].top; out.push(`- ${exById(id).en}: ${top.w} kg x ${top.r}, e1RM ${Math.round(c.best)}${c.pct !== null ? `, ${c.pct > 0 ? '+' : ''}${c.pct.toFixed(1)}%` : ''}`); }); }
    const g = gapDays(); if(g !== null) out.push(`Last workout: ${g} days ago.`);
  }
  if(supps.length){
    out.push('\nMy supplement routine:');
    supps.forEach(s => out.push(`- ${s.qid && QBY[s.qid] ? QBY[s.qid].en : s.name}: ${fmt(s.dose)} ${S['u_' + s.unit][0]}, ${s.times.map(x => S['slot_' + x][0].toLowerCase()).join(' + ')}, ${s.often === 'daily' ? 'every day' : s.often === 'training' ? 'training days' : 'when needed'}${s.notes ? ' — ' + s.notes : ''}`));
  }
  return out.join('\n');
}

// ---------- 0.7.2: text that doesn't fit in a pill or bubble scrolls sideways like a news ticker ----------
// Only when it overflows; off with Reduce Motion. The text is wrapped in <span class="tk"><span class="tki" data-tk="…">, the repeat is a CSS ::after (so textContent stays the same).
(() => {
  const SEL = '.mpill>button,.seg>button,.chip,.chips>*,.tchips>*,.wrapchips>*,.daychips>*,.fchip,.hchip,.lchip,.rchip,.eqchip,.restchip,.daypill,.tag,.stag,.sttag,.btn,.fab,.pillbtn,.lwacts button,section.page>header h1';
  const GAP = 32, SPEED = 32, rm = matchMedia('(prefers-reduced-motion: reduce)');
  const unwrap = el => { const i = el.querySelector(':scope>.tk>.tki'); if(!i) return; const k = i.parentNode; while(i.firstChild) el.insertBefore(i.firstChild, k); k.remove(); el.classList.remove('tkon'); };
  function tick(el){
    if(el.closest('.tk') || !el.isConnected) return;
    if(el.querySelector(':scope>.tk')){ const k = el.querySelector(':scope>.tk'), i = k.firstChild;   // already scrolling: stop if it fits now
      if(rm.matches || +i.dataset.w <= k.clientWidth + 1) unwrap(el); return; }
    if(rm.matches || !el.textContent.trim() || el.clientWidth < 8) return;
    const ws = getComputedStyle(el).whiteSpace; if(ws !== 'nowrap' && ws !== 'pre') return;
    if(el.scrollWidth <= el.clientWidth + 1) return;
    const k = document.createElement('span'), i = document.createElement('span'); k.className = 'tk'; i.className = 'tki';
    while(el.firstChild) i.appendChild(el.firstChild); k.appendChild(i); el.appendChild(k); el.classList.add('tkon');
    const w = i.scrollWidth; if(w <= k.clientWidth + 1){ unwrap(el); return; }
    i.dataset.w = w;
    if([...i.childNodes].some(n => n.nodeType === 1)){   // an icon or badge inside: glide to the end and back instead of looping
      i.classList.add('tkalt'); i.style.setProperty('--tkd', -(w - k.clientWidth + 6) + 'px'); i.style.setProperty('--tkt', Math.max(2, (w - k.clientWidth) / SPEED * 1.6).toFixed(2) + 's'); return; }
    i.dataset.tk = i.textContent.replace(/\s+/g, ' ').trim();
    i.style.setProperty('--tkd', -(w + GAP) + 'px'); i.style.setProperty('--tkt', ((w + GAP) / SPEED).toFixed(2) + 's'); }
  const todo = new Set(); let raf = 0;
  const queue = root => { if(!root || root.nodeType !== 1) return; if(root.matches(SEL)) todo.add(root); root.querySelectorAll(SEL).forEach(e => todo.add(e));
    const up = root.closest(SEL); if(up) todo.add(up);
    if(!raf) raf = requestAnimationFrame(() => { raf = 0; const all = [...todo]; todo.clear(); all.forEach(tick); }); };
  const mo = new MutationObserver(ms => ms.forEach(m => queue(m.target.nodeType === 1 ? m.target : m.target.parentElement)));
  const start = () => { mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] }); queue(document.body);
    addEventListener('resize', () => queue(document.body)); if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => queue(document.body));
    try{ rm.addEventListener('change', () => queue(document.body)); }catch(e){} };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();

// ---------- 0.7.3 Settings: search bar that finds and opens any setting, and the Back Up Now button ----------
// Each entry: label (string key), group (crumb key), kw (extra words, both languages), go = what to tap in order, hl = what to light up when it opens, run = do it straight away.
const SHELL_SETS = [
  { k: 'stCustom', go: ['[data-sp="ovSCustom"]'] },
  { k: 'themeT', g: 'stCustom', kw: 'dark light automatic auto colour color accent lime mode appearance preset σκούρο ανοιχτό αυτόματο χρώμα εμφάνιση', go: ['[data-sp="ovSCustom"]', '#sThemeBtn'] },
  { k: 'language', g: 'stCustom', kw: 'english greek ελληνικά αγγλικά', go: ['[data-sp="ovSCustom"]', '[data-sp="ovSLang"]'] },
  { k: 'unitsT', g: 'stCustom', kw: 'kg lb pounds cm feet inches oz grams metric imperial κιλά λίβρες γραμμάρια', go: ['[data-sp="ovSCustom"]', '[data-sp="ovSUnits"]'] },
  { k: 'suUse', g: 'stCustom', kw: 'gym first mainly food tabs order start page γυμναστήριο φαγητό', go: ['[data-sp="ovSCustom"]'], hl: '#sUse' },
  { k: 'stBody', go: ['[data-sp="ovSBody"]'] },
  { k: 'shSex', g: 'stBody', kw: 'male female man woman άνδρας γυναίκα', go: ['[data-sp="ovSBody"]'], hl: '#sSex' },
  { k: 'suHeight', g: 'stBody', kw: 'tall cm ft ψηλός', go: ['[data-sp="ovSBody"]'], hl: '#sH' },
  { k: 'bodyweight', g: 'stBody', kw: 'weight kg lb weigh κιλά ζύγισμα', go: ['[data-sp="ovSBody"]'], hl: '#sW' },
  { k: 'dailyTargets', g: 'stBody', kw: 'calories kcal protein carbs fat fibre fiber macros goal bulk cut recomp θερμίδες πρωτεΐνη υδατάνθρακες λιπαρά στόχος όγκος γράμμωση', go: ['[data-sp="ovSBody"]', '#sTargetsBtn'] },
  { k: 'stAI', kw: 'gemini artificial intelligence τεχνητή νοημοσύνη', go: ['[data-sp="ovSAI"]'] },
  { k: 'geminiKey', g: 'stAI', kw: 'api key password κλειδί', go: ['[data-sp="ovSAI"]'], hl: '#sKey' },
  { k: 'geminiModel', g: 'stAI', kw: 'flash pro lite μοντέλο', go: ['[data-sp="ovSAI"]'], hl: '#sModel' },
  { k: 'keyGuideT', g: 'stAI', kw: 'free key how help οδηγίες δωρεάν', go: ['[data-sp="ovSAI"]'], hl: 'details.guide' },
  { k: 'stData', go: ['[data-sp="ovSData"]'] },
  { k: 'shBackupNow', g: 'stData', kw: 'backup save export icloud files αντίγραφο ασφαλείας αποθήκευση αρχεία', run: () => backupNow() },
  { k: 'download', g: 'stData', kw: 'export json αρχείο', go: ['[data-sp="ovSData"]'], hl: '#exportJson' },
  { k: 'import', g: 'stData', kw: 'restore load new phone επαναφορά', go: ['[data-sp="ovSData"]'], hl: '#importBtn' },
  { k: 'copyClaude', g: 'stData', kw: 'claude chat export summary αντιγραφή', go: ['[data-sp="ovSData"]'], hl: '#copyClaude' },
  { k: 'stAbout', kw: 'version credits licence license notice έκδοση άδεια', go: ['[data-sp="ovSAbout"]'] },
  { k: 'suAgain', g: 'stAbout', kw: 'setup first launch start over reset αρχή ξανά', go: ['[data-sp="ovSAbout"]'], hl: '#suAgainBtn' },
];
const shellNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const shellLbl = k => t(k).replace(/^[↺✨💾\s]+/u, '').replace(/\s*\(.*\)\s*$/, '').replace(/\?$/, '');
function shellSearch(q){
  const box = $('sResults'), main = $('sMain'), nq = shellNorm(q); $('sSearchX').classList.toggle('hide', !q);
  if(!nq){ box.classList.add('hide'); main.classList.remove('hide'); box.innerHTML = ''; return; }
  const words = nq.split(' '), hits = SHELL_SETS.map((e, i) => { const all = [e.k, e.g].filter(Boolean).map(k => (S[k] || []).join(' ')).join(' ') + ' ' + (e.kw || '');
    const hw = shellNorm(all).split(' '), lw = shellNorm((S[e.k] || []).join(' ')).split(' ');
    if(!words.every(w => hw.some(h => h.startsWith(w)))) return null;
    return { i, sc: (e.g ? 0 : 1) + words.filter(w => lw.some(h => h.startsWith(w))).length * 2 }; }).filter(Boolean).sort((a, b) => b.sc - a.sc);
  main.classList.add('hide'); box.classList.remove('hide');
  box.innerHTML = hits.length ? hits.map(h => { const e = SHELL_SETS[h.i];
    return `<button class="prow sres" type="button" data-si="${h.i}"><span>${esc(shellLbl(e.k))}</span>${e.g ? `<span class="sv">${esc(shellLbl(e.g))}</span>` : ''}</button>`; }).join('')
    : `<p class="snone">${esc(t('shNone'))}</p>`; }
function shellGo(i){ const e = SHELL_SETS[i]; if(!e) return; $('sSearch').blur();
  if(e.run){ e.run(); return; }
  (e.go || []).forEach(sel => { const el = document.querySelector(sel); if(el) el.click(); });
  if(!e.hl) return;
  setTimeout(() => { const el = document.querySelector(e.hl); if(!el) return; if(el.tagName === 'DETAILS') el.open = true;
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.classList.remove('sfound'); void el.offsetWidth; el.classList.add('sfound'); setTimeout(() => el.classList.remove('sfound'), 1800); }, 380); }
function shellBkLast(){ const el = $('sBackupLast'); if(!el) return; const last = typeof ui !== 'undefined' && ui.lastBackup;
  el.textContent = t('shLast', { d: last ? fmtDate(last) : t('bkNever') }); }
(() => { const start = () => { const inp = $('sSearch'); if(!inp) return;
    inp.addEventListener('input', () => shellSearch(inp.value));
    inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ const f = $('sResults').querySelector('[data-si]'); if(f) shellGo(+f.dataset.si); } });
    $('sSearchX').addEventListener('click', () => { inp.value = ''; shellSearch(''); inp.focus(); });
    $('sResults').addEventListener('click', e => { const b = e.target.closest('[data-si]'); if(b) shellGo(+b.dataset.si); });
    $('sBackupNow').addEventListener('click', () => backupNow());
    const ver = document.querySelector('#pgSettings .ver'); if(ver) ver.textContent = 'Food Tracker · Gym Buddy · v' + VERSION;
    shellBkLast(); addEventListener('hashchange', shellBkLast); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
})();
