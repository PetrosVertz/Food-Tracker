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

// ======================= storage =======================
function load(k, fb){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }catch(e){ return fb; } }

function store(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ toast(t('saveFail')); return false; } }

function migrate(f){
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
    fl.forEach(x => out.push(`- ${x.info.food && x.info.food.gid && GENBY[x.info.food.gid] ? GENBY[x.info.food.gid].en : x.info.name}${x.it.mealId ? ' (leftovers)' : ''}: ${fmtSize(x.it.qty, x.info.unit)} in the ${x.it.loc}${x.it.exp ? `, expires ${x.it.exp}` : ''}`)); }
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
