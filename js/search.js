// Search (0.6.7): every food search box uses this. (functions only)
// Understands any word order, plurals, typos ("egs scrambld") and other names for the same food (crisps = chips);
// ranks your own foods and what you eat at this time of day first; online: USDA first in English, Greek products first in Greek,
// every online result checked for complete, sensible numbers. Never a dead end: "Did you mean…" and "Add as Takeaway".

// other names for the same thing (each group means the same word; English first, Greek later)
const SYN_GROUPS = [
  'crisp chip', 'fries chips frenchfries', 'omelette omelet', 'scrambled scramble', 'yogurt yoghurt yoghourt', 'courgette zucchini', 'aubergine eggplant',
  'prawn shrimp', 'mince minced ground', 'rocket arugula', 'scallion springonion', 'biscuit cookie', 'sweet candy', 'soda fizzy softdrink pop',
  'porridge oatmeal', 'beetroot beet', 'chickpea garbanzo', 'capsicum pepper', 'mayo mayonnaise', 'burger hamburger', 'hotdog frankfurter',
  'bbq barbecue barbecued', 'doughnut donut', 'whey proteinpowder', 'fillet filet', 'pancake hotcake', 'coke cola', 'gyro gyros giros',
  'souvlaki kalamaki skewer', 'pita pitta', 'tzatziki tsatsiki', 'kebab kebap doner', 'pasta spaghetti macaroni penne', 'cooked boiled',
  'grilled chargrilled', 'roast roasted', 'baked oven', 'fried pan', 'skinless boneless', 'jacket baked', 'ham gammon', 'coriander cilantro',
  'sultana raisin', 'tuna tunafish', 'mandarin clementine tangerine', 'oat oats', 'granola muesli', 'icecream gelato', 'loaf bread',
  'lasagna lasagne', 'coffee espresso', 'cappuccino capuccino', 'freddo fredo', 'frappe frape', 'koulouri simit', 'tiropita cheesepie',
  'spanakopita spinachpie', 'horiatiki greeksalad', 'fasolada beansoup', 'fakes lentilsoup', 'keftedes meatball', 'loukaniko sausage',
];
// phrases that are one word (applied to what you type and to every food)
const SYN_PHRASES = [['french fries', 'frenchfries'], ['hot dog', 'hotdog'], ['soft drink', 'softdrink'], ['spring onion', 'springonion'], ['protein powder', 'proteinpowder'],
  ['ice cream', 'icecream'], ['tuna fish', 'tunafish'], ['cheese pie', 'cheesepie'], ['spinach pie', 'spinachpie'], ['greek salad', 'greeksalad'], ['bean soup', 'beansoup'], ['lentil soup', 'lentilsoup']];
const STOP = new Set(['and', 'with', 'of', 'the', 'a', 'an', 'in', 'on', 'my', 'some', 'me', 'και', 'το', 'τα', 'η', 'ο', 'οι', 'για', 'απο', 'σε']);

const Search = (() => {
  const SYN = {};
  const stem = w => {   // English plurals → one form; Greek words are matched by their start, so they stay as typed
    if(w.length < 3 || !/^[a-z]+$/.test(w)) return w;
    if(/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if(/(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
    if(/s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  };
  const words = text => { let s = ' ' + norm(text).replace(/[^\p{L}\p{N}%]+/gu, ' ') + ' ';
    SYN_PHRASES.forEach(([a, b]) => { s = s.split(' ' + a + ' ').join(' ' + b + ' '); });
    return s.split(' ').filter(w => w && !STOP.has(w)).map(stem); };
  SYN_GROUPS.forEach(g => { const ws = g.split(' ').map(stem); ws.forEach(w => { SYN[w] = [...new Set([...(SYN[w] || []), ...ws.filter(x => x !== w)])]; }); });

  // Damerau–Levenshtein, stops early past `max`
  function dist(a, b, max){
    if(Math.abs(a.length - b.length) > max) return max + 1;
    let p2 = null, p = Array.from({ length: b.length + 1 }, (_, i) => i);
    for(let i = 1; i <= a.length; i++){ const c = [i]; let lo = i;
      for(let j = 1; j <= b.length; j++){ let v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if(p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        c[j] = v; if(v < lo) lo = v; }
      if(lo > max) return max + 1; p2 = p; p = c; }
    return p[b.length];
  }
  // how well one typed word matches one word of a food (0 = not at all)
  function wordScore(q, w){
    if(q === w) return 1;
    if(q.length >= 2 && w.startsWith(q)) return q.length >= 3 ? .9 : .7;   // still typing
    if(q.length >= 4 && w.length >= 4 && w.includes(q)) return .6;
    if(q.length >= 3 && w.length >= 3 && q[0] === w[0]){ const max = q.length >= 7 ? 2 : 1, d = dist(q, w, max); if(d <= max) return d === 1 ? .75 : .6;
      if(w.length > q.length && q.length >= 5){ const d2 = dist(q, w.slice(0, q.length), 1); if(d2 <= 1) return .55; } }   // typo while still typing
    return 0;
  }
  // words in the food's name count fully; other names and keywords a bit less; another name for the word (synonym) a bit less again
  function tokenScore(q, idx){
    const one = (qq, f) => { if(idx.name.has(qq)) return f; let b = idx.set.has(qq) ? .8 : 0;
      for(const w of idx.list){ if(b >= .9) break; const s = wordScore(qq, w) * (idx.name.has(w) ? 1 : .8); if(s > b) b = s; } return b * f; };
    let best = one(q, 1); if(best >= 1) return best;
    for(const alt of SYN[q] || []) best = Math.max(best, one(alt, .9));
    return best;
  }
  const mkIdx = (names, extra) => { const nw = names.flatMap(n => words(n || '')), all = [...new Set([...nw, ...words(extra || '')])];
    return { list: all, set: new Set(all), name: new Set(nw), first: nw[0] || '', len: (names[0] || '').length }; };

  // index cache: built-in foods once; your foods until they change
  const cache = new Map();
  function idxOf(kind, x){
    const k = kind + ':' + (x.id || x.gid) + ':' + (x.updatedAt || '') + ':' + lang;
    let v = cache.get(k); if(v) return v;
    if(kind === 'g') v = mkIdx([L(x), x.en, x.el], `${x.alias || ''} ${x.hay || ''}`);
    else if(kind === 'm') v = mkIdx([x.name], (x.ingredients || []).map(i => i.ref && i.ref.name).join(' '));
    else { const g = x.gid && GENBY[x.gid], s = subOf(x.cat, x.sub);
      v = mkIdx([foodName(x), x.name, g ? g.en : '', g ? g.el : ''], `${x.brand || ''} ${x.barcode || ''} ${g ? g.alias + ' ' + g.hay : ''} ${s ? s.en + ' ' + s.el + ' ' + s.kw.join(' ') : ''}`); }
    cache.set(k, v); return v;
  }

  // the core: how well does this text match this food (0 = no)
  function score(qw, idx, qn){
    if(!qw.length) return 0;
    const sc = qw.map(q => tokenScore(q, idx)), miss = sc.filter(s => !s).length;
    if(miss && (qw.length < 3 || miss > 1)) return 0;   // every word must match (one may be missing in a long search)
    const avg = sc.reduce((a, b) => a + b, 0) / qw.length;
    const inName = qw.reduce((a, q) => a + (idx.name.has(q) ? 1 : (SYN[q] || []).some(x => idx.name.has(x)) ? .5 : 0), 0) / qw.length;
    return 10 * avg + 4 * inName + (idx.first && idx.first.startsWith(qw[0]) ? 2 : 0) - Math.min(idx.len, 60) / 30 - miss * 4;
  }

  // what you eat: how often (last 90 days) and around this time of day (±90 min, last 60 days)
  let habitsAt = 0, habits = null;
  function habitMap(){
    if(habits && Date.now() - habitsAt < 6e4) return habits;
    const n = {}, hr = {}, nowM = new Date().getHours() * 60 + new Date().getMinutes(), ds = Object.keys(dayLog).sort();
    ds.slice(-90).forEach(d => (dayLog[d] || []).forEach(e => { if(e.refId) n[e.refId] = (n[e.refId] || 0) + 1; }));
    ds.slice(-60).forEach(d => (dayLog[d] || []).forEach(e => { const m = toMin(e.time); if(!e.refId || m === null) return; const dd = Math.abs(m - nowM); if(Math.min(dd, 1440 - dd) <= 90) hr[e.refId] = (hr[e.refId] || 0) + 1; }));
    foods.forEach(f => { if(f.gid){ if(n[f.id]) n['g:' + f.gid] = n[f.id]; } });
    habits = { n, hr }; habitsAt = Date.now(); return habits;
  }
  const habitBonus = id => { const h = habitMap(), c = h.n[id] || 0, t_ = h.hr[id] || 0; return (c ? Math.min(8, 3 + c / 2) : 0) + (t_ >= 2 ? Math.min(5, 2 + t_ / 2) : 0); };

  // ---------- local: your foods, the built-in list, your meals ----------
  function local(text, raw, opts){
    opts = opts || {};
    const qw = words(text), qn = qw.join(' ');
    if(!qw.length) return { mine: [], std: [], meals: [] };
    const cookBias = st => raw ? (st === 'cooked' ? -6 : 0) : opts.log ? (st === 'cooked' ? 1.5 : st === 'uncooked' ? -1 : 0) : 0;   // cooked first when logging
    const rank = (arr, kind, extra) => arr.map(x => { const s = score(qw, idxOf(kind, x), qn); return { x, s: s > 0 ? s + extra(x) : 0 }; }).filter(r => r.s > 0).sort((a, b) => b.s - a.s).map(r => r.x);
    const have = new Set(foods.map(f => f.gid).filter(Boolean));
    const mine = rank(foods, 'f', f => habitBonus(f.id) + (f.gid ? .4 * popBonus(f.gid) : 0) + cookBias(f.state)).slice(0, opts.mineMax || 20);
    const seen = new Set(), std = rank(GEN.filter(g => !have.has(g.gid)), 'g', g => .4 * popBonus(g.gid) + cookBias(g.state))
      .filter(g => { const k = norm(L(g)); return !seen.has(k) && seen.add(k); }).slice(0, opts.stdMax || 50);   // same name twice → once
    const ml = opts.meals ? rank(meals, 'm', m => habitBonus(m.id)).slice(0, 10) : [];
    return { mine, std, meals: ml };
  }

  // Food Track list filter: same understanding, keeps the list's own order
  const matches = (text, f) => { const qw = words(text); return !qw.length || score(qw, idxOf('f', f), qw.join(' ')) > 0; };

  // ---------- "Did you mean…": the closest real words for anything that matched nothing ----------
  let vocab = null;
  function didYouMean(text){
    if(!vocab){ const v = new Map(); const add = ws => ws.forEach(w => { if(w.length >= 3) v.set(w, (v.get(w) || 0) + 1); });
      GEN.forEach(g => add(idxOf('g', g).list)); vocab = v; }
    foods.forEach(f => idxOf('f', f).list.forEach(w => { if(w.length >= 3 && !vocab.has(w)) vocab.set(w, 1); }));
    const qw = norm(text).split(' ').filter(Boolean); let changed = false;
    const out = qw.map(raw => { const q = stem(raw); if(q.length < 3 || vocab.has(q) || STOP.has(q)) return raw;
      let best = null, bd = 9, bf = 0; vocab.forEach((f, w) => { const d = dist(q, w, 2); if(d < bd || (d === bd && f > bf)){ best = w; bd = d; bf = f; } });
      if(best && bd <= (q.length >= 6 ? 2 : 1)){ changed = true; return best; } return raw; });
    return changed ? out.join(' ') : null;
  }

  // ---------- online ----------
  // every online result: complete numbers and macros that add up to the calories rank higher; half-empty or suspicious ones are hidden
  function quality(d){
    const p = +d.protein, c = +d.carbs, f = +d.fat; if([p, c, f].some(x => !isFinite(x) || x < 0)) return 0;
    if(p + c + f <= 0 && !(+d.kcal > 0)) return 0;
    const kcal = +d.kcal > 0 ? +d.kcal : p * 4 + c * 4 + f * 9, est = p * 4 + c * 4 + f * 9 + 2 * (+d.fiber || 0);
    if(p + c + f > 101) return 0;
    const alcohol = /beer|wine|vodka|whisk|rum|gin|ouzo|tsipouro|μπυρα|κρασι|alcohol/i.test(d.name || '');
    const dev = kcal > 20 ? Math.abs(kcal - est) / kcal : 0;
    if(dev > .35 && !alcohol) return 0;
    let q = dev > .15 && !alcohol ? .5 : 1;
    q *= .8 + .05 * ['fiber', 'sugar', 'salt', 'satFat'].filter(k => d[k] != null).length;   // fuller labels rank higher
    if(!d.name || d.name.length < 3) q *= .5;
    return q;
  }
  const NOISE = /,?\s*(broilers or fryers|meat only|meat and skin|ns as to [a-z ]+|without salt|with salt|nfs|from fresh|all commercial varieties|composite of [a-z ]+)/gi;
  async function usda(text){
    const key = settings.usdaKey || 'DEMO_KEY';
    const r = await fetchT(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(text)}&pageSize=30&dataType=Foundation,SR%20Legacy,Survey%20%28FNDDS%29`, {}, 9000);
    if(!r.ok) throw new Error('USDA ' + r.status); const j = await r.json();
    const nv = (f, ids) => { for(const n of f.foodNutrients || []){ if(ids.includes(n.nutrientId) || ids.includes(+n.nutrientNumber)) return n.value; } return null; };
    return (j.foods || []).map(f => { let kcal = nv(f, [1008, 208]); if(kcal == null){ const kj = nv(f, [1062]); if(kj != null) kcal = Math.round(kj / 4.184); }
      const carbs = nv(f, [1005, 205]), fib = nv(f, [1079, 291]), sug = nv(f, [2000, 269]);
      const nm = f.description.replace(NOISE, '').replace(/\s+/g, ' ').trim();
      return { name: nm.charAt(0) + nm.slice(1).toLowerCase(), brand: '', noBrand: true, kcal: kcal != null ? Math.round(kcal) : null, protein: nv(f, [1003, 203]), carbs: carbs != null ? r1(Math.max(0, carbs - (fib || 0))) : null, fat: nv(f, [1004, 204]),
        fiber: fib, sugar: sug, salt: nv(f, [1093, 307]) != null ? r1(nv(f, [1093, 307]) * 2.5 / 1000 * 100) / 100 : null, potassium: nv(f, [1092, 306]), unit: 'g', packs: [], usualPack: null,
        state: /\braw\b/i.test(nm) ? 'uncooked' : /cooked|boiled|roasted|grilled|baked|fried|steamed|braised|scrambled|poached/i.test(nm) ? 'cooked' : 'ready', source: 'USDA', fdc: f.fdcId }; })
      .filter(d => d.protein != null && d.carbs != null && d.fat != null);
  }
  async function off(text){
    const base = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(text)}&search_simple=1&action=process&json=1&page_size=20&fields=${OFF_FIELDS}`;
    const [gr, all] = await Promise.allSettled([fetchT(base + '&countries_tags_en=greece', {}, 9000).then(r => r.json()), fetchT(base, {}, 9000).then(r => r.json())]);
    if(gr.status === 'rejected' && all.status === 'rejected') throw new Error('offline');
    const seen = new Set(), tag = (arr, gr_) => (arr || []).map(p => ({ p, gr: gr_ }));
    return [...tag(gr.value?.products, true), ...tag(all.value?.products, false)].filter(({ p }) => p.code && !seen.has(p.code) && seen.add(p.code))
      .map(({ p, gr: g }) => ({ ...offToFood(p, p.code), greek: g })).filter(d => d.protein !== null && d.carbs !== null && d.fat !== null && d.name);
  }
  // both sources at once; English: USDA first, Greek: Greek supermarket products first; ranked by match × quality
  async function online(text){
    const [u, o] = await Promise.allSettled([usda(text), off(text)]);
    if(u.status === 'rejected' && o.status === 'rejected') throw new Error('offline');
    const qw = words(text), qn = qw.join(' '), el = lang === 'el';
    const rows = [...(u.status === 'fulfilled' ? u.value : []), ...(o.status === 'fulfilled' ? o.value.map(d => ({ ...d, source: 'openfoodfacts' })) : [])]
      .map(d => { const q = quality(d), rel = score(qw, mkIdx([d.name, d.brand], d.generic || ''), qn);
        const src = d.source === 'USDA' ? (el ? 1 : 3) : d.greek ? (el ? 3 : 1.5) : 0;
        return { d, q, s: q > 0 && rel > 0 ? rel * q + src : 0 }; })
      .filter(r => r.s > 0).sort((a, b) => b.s - a.s);
    const out = [], seen = new Set();
    rows.forEach(({ d, q }) => { const k = norm(d.name + '|' + (d.brand || '')); if(seen.has(k)) return; seen.add(k); out.push({ ...d, check: q < .8 }); });
    return out.slice(0, 30);
  }

  return { words, local, matches, didYouMean, online, quality, usda, off, dist };
})();

// the names the rest of the app uses
const searchLocal = (text, raw, opts) => Search.local(text, raw, opts);
const searchOnline = text => Search.online(text);
const searchOnlineAll = text => Search.online(text);

// ---------- 0.7.3 search boxes: an X inside the box when text is typed, one tap clears it ----------
// Wrap a search input in <div class="logfX">; the X shows only while the box has text (CSS :placeholder-shown).
function logfXBtn(){ return `<button class="logfXb" type="button" tabindex="-1" aria-label="${t('logfClear')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`; }
function logfXInit(){ document.querySelectorAll('.logfX').forEach(w => { if(!w.querySelector('.logfXb')) w.insertAdjacentHTML('beforeend', logfXBtn()); }); }
function logfXTap(e){
  const b = e.target.closest('.logfXb'); if(!b) return; const inp = b.parentNode.querySelector('input'); if(!inp) return;
  e.preventDefault(); e.stopPropagation(); inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus();
}
