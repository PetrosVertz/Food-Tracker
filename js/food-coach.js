// Food Coach 2.0 — the parts of Food Coach that need no AI: reading a meal message, small corrections, quick answers, checking values,
// the short context the AI gets, the chat memory across restarts and the speed log. Food Track · Gym Buddy (plain browser script).
// No DOM and no network in here (tools/food-coach-test.js runs it in node). The chat itself, the cards and logging stay in today.js (logQ*).
//
//   FoodCoach.parse(text)            → [{ text, name, qty, unit, grams, ml, stated: { protein?, kcal?, carbs?, fat? } | null, state: 'raw' | 'cooked' | '' }]
//                                       a message split into foods without AI. The original message is never changed.
//   FoodCoach.correction(text, rows) → { type: 'set' | 'inc' | 'remove' | 'state', i, qty, unit, n, state } | null
//                                       a small change to the list on screen ("make it 200g", "add another toast", "remove the bar")
//   FoodCoach.quick(text)            → { kind: 'thanks' | 'hi' | 'last' | 'today', key } | null   answered without AI
//   FoodCoach.check(item)            → { item, doubt }   one food's values made consistent (no second AI call); unknown stays null
//   FoodCoach.context()              → one short text: targets, what is logged (marked incomplete), gym / rest day, rules, what the app learned
//   FoodCoach.chatLoad() / chatSave(list)   the Food Coach chat on this phone (Store 'coachChat', never synced, kept 2 days)
//   FoodCoach.track(path, ms, calls) / stats()   end-to-end answer times by path ('local' | 'memory' | 'ai' | 'offline'), p50 / p95

const FoodCoach = (() => {
  const N = s => (typeof norm === 'function' ? norm(s) : String(s || '').toLowerCase());
  // ---- words ----
  const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: .5, couple: 2, dozen: 12,
    ενα: 1, ενασ: 1, μια: 1, μιαν: 1, δυο: 2, δυoν: 2, τρια: 3, τρεισ: 3, τεσσερα: 4, τεσσερισ: 4, πεντε: 5, εξι: 6, επτα: 7, εφτα: 7, οκτω: 8, οχτω: 8, εννια: 9, δεκα: 10, μισο: .5, μιση: .5, μισοσ: .5,
    ena: 1, mia: 1, dyo: 2, dio: 2, duo: 2, tria: 3, tessera: 4, miso: .5 };   // Greeklish
  // unit words → [unit, factor]; glass / can / bottle become ml
  const UNITS = [
    [/^(g|gr|grs|gram|grams|gramm\p{L}*|γρ|γραμ\p{L}*|γραμμ\p{L}*)$/u, 'g', 1], [/^(kg|kgs|kilo\p{L}*|κιλ\p{L}*)$/u, 'g', 1000], [/^(oz|ounces?)$/, 'g', 28.35],
    [/^(ml|mls|millilit\p{L}*|μλ)$/u, 'ml', 1], [/^(l|lt|ltr|lit\p{L}*|λιτρ\p{L}*)$/u, 'ml', 1000],
    [/^(slices?|φετα|φετεσ|φετουλ\p{L}*)$/u, 'slice', 1], [/^(cups?|φλιτζαν\p{L}*|κουπα|κουπεσ)$/u, 'cup', 1],
    [/^(tbsps?|tablespoons?|κ\.σ\.?|κουταλιεσ?|κουταλια)$/, 'tbsp', 1], [/^(tsps?|teaspoons?|κ\.γ\.?|κουταλακι\p{L}*)$/u, 'tsp', 1],
    [/^(servings?|portions?|plates?|bowls?|μεριδ\p{L}*|πιατ\p{L}*|μπολ)$/u, 'serving', 1],
    [/^(pieces?|pcs?|τεμ\p{L}*|κομματ\p{L}*|scoops?|μεζουρ\p{L}*|bars?|μπαρ\p{L}*)$/u, 'piece', 1],
    [/^(glass|glasses|ποτηρ\p{L}*)$/u, 'ml', 250], [/^(cans?|κουτ\p{L}*)$/u, 'ml', 330], [/^(bottles?|μπουκαλ\p{L}*)$/u, 'ml', 500],
  ];
  // "bar" counts the bar but stays in the name ("protein bar"); the other count words are dropped from the name
  const KEEP_IN_NAME = /^(bars?|μπαρ\p{L}*)$/u;
  const SEP = new Set(['and', 'plus', 'also', 'then', 'και', 'κ.', 'kai', 'ke', '&', '+']);
  // dishes whose name has "and" in it stay one food
  const PAIRS = /(?<![\p{L}\p{N}])(mac|macaroni|fish|salt|sweet|peanut butter|bread|strawberries|cookies|ham|surf|rice|chips|bacon|pb)\s+(and|&|n|'n')\s+(cheese|chips|pepper|sour|jelly|butter|cream|turf|beans|dip|eggs|j)(?![\p{L}\p{N}])/giu;
  const WITH = new Set(['with', 'με', 'me', 'w/']);
  const SAUCE = /^(sauce|gravy|dressing|oil|butter|cream|syrup|ketchup|mayo\p{L}*|σαλτσ\p{L}*|λαδι|βουτυρ\p{L}*|κρεμα|σιροπ\p{L}*)$/u;
  const LEAD = /^(i|i've|ive|just|had|have|ate|eaten|eat|drank|drink|got|actually|today|for|breakfast|lunch|dinner|snack|my|εφαγα|φαγα|ηπια|τωρα|σημερα|μολισ|πρωινο|μεσημεριανο|βραδινο|σνακ)$/;
  const ART = /^(the|some|of|το|τα|η|ο|οι|λιγο|λιγη|λιγα|καμια|κανα)$/;
  const TAIL_A = /^(after|before|post|pre|at|for|this|μετα|πριν|για|στο|στη|στην|το)$/, TAIL_N = /^(gym|workout|training|lunch|dinner|breakfast|morning|evening|night|γυμναστηριο|προπονηση|μεσημερι|μεσημεριανο|βραδυ|βραδινο|πρωι|πρωινο)$/;
  const NUTR = { protein: /^(protein|proteins|πρωτεϊν\p{L}*|πρωτειν\p{L}*)$/u, carbs: /^(carbs?|carbohydrates?|υδατανθρακ\p{L}*)$/u, fat: /^(fats?|λιπαρ\p{L}*|λιπο\p{L}*)$/u, kcal: /^(kcal|cal|calories|θερμιδ\p{L}*)$/u };
  const COOKED = /^(cooked|boiled|grilled|fried|baked|roasted|steamed|scrambled|poached|μαγειρεμεν\p{L}*|βραστ\p{L}*|ψητ\p{L}*|τηγανητ\p{L}*|φουρνου|σχαρασ)$/u, RAW = /^(raw|uncooked|dry|ωμ\p{L}*|αμαγειρευτ\p{L}*)$/u;
  const numOf = w => { if(/^\d+([.,]\d+)?$/.test(w)) return parseFloat(w.replace(',', '.')); if(/^\d+\/\d+$/.test(w)){ const [a, b] = w.split('/'); return +a / +b; } return NUMW[w] ?? null; };
  const unitOf = w => { for(const [re, u, f] of UNITS) if(re.test(w)) return [u, f]; return null; };
  const nutrOf = w => Object.keys(NUTR).find(k => NUTR[k].test(w)) || null;

  // ---- 1. a message → foods ----
  // sentences that are questions are not foods ("Was that a good meal?"); the rest is split at commas, "and", "+", "και", and at "with" /
  // "in <sauce>" unless what follows is a stated nutrient ("with 20g protein" belongs to the bar, it is not its weight).
  function parse(txt){
    const src = String(txt || '').slice(0, 600), out = [];
    const sentences = src.split(/(?<=[.!?;])\s+|\n+/).map(s => s.trim()).filter(s => s && !/\?\s*$/.test(s));
    for(const sen of sentences){
      const toks = sen.replace(PAIRS, '$1\u0001$2\u0001$3').replace(/([,;+&])(?!\S*\u0001)/g, ' $1 ').replace(/(\d)([a-zα-ωά-ώ]+)/giu, '$1 $2').replace(/(?<![\p{L}\p{N}])(\d+)x(?![\p{L}\p{N}])/giu, 'x$1').split(/\s+/).filter(Boolean);
      let seg = [];
      const flush = () => { if(seg.length) out.push(seg); seg = []; };
      for(let i = 0; i < toks.length; i++){
        const raw = toks[i], w = N(raw).replace(/[.!:"“”()]+$/g, '').replace(/^["“(]+/, '');
        if([',', ';'].includes(w) || SEP.has(w)){ flush(); continue; }
        if(WITH.has(w)){   // "with 20g protein" → a stated nutrient of this food; "with rice" → a new food
          const a = numOf(N(toks[i + 1] || '')), u = N(toks[i + 2] || ''), n3 = N(toks[i + 3] || '');
          if(a != null && (nutrOf(u) || (unitOf(u) && (nutrOf(n3) || (n3 === 'of' && nutrOf(N(toks[i + 4] || ''))))))){ seg.push(raw); continue; }
          flush(); continue; }
        if((w === 'in' || w === 'σε') && seg.length && toks.slice(i + 1, i + 4).some(x => SAUCE.test(N(x)))){ flush(); continue; }
        seg.push(raw);
      }
      flush();
    }
    // each piece of words → one food (a piece that is only a nutrient, "20g protein", is added to the food before it)
    for(const words of out.splice(0)){
      const it = one(words); if(!it) continue;
      if(!it.name && it.stated && out.length){ out[out.length - 1].stated = { ...(out[out.length - 1].stated || {}), ...it.stated }; continue; }
      if(it.name) out.push(it);
    }
    return out.slice(0, 25);
  }
  function one(words){
    let qty = null, unit = null, factor = 1, mult = 1, state = '', stated = null, byWord = false; const name = [];
    const text = words.join(' ').replace(/\u0001/g, ' ').replace(/\s+([,.])/g, '$1').trim();
    for(let i = 0; i < words.length; i++){
      const raw = words[i].replace(/\u0001/g, ' '), w = N(raw).replace(/[.!:,"“”()]+$/g, '').replace(/^["“(]+/, '');
      if(!w) continue;
      const xm = w.match(/^x(\d+)$/); if(xm){ mult *= +xm[1]; continue; }
      const n = numOf(w);
      if(n != null){
        const nx = N(words[i + 1] || '').replace(/[.,]+$/, ''), nx2 = N(words[i + 2] || '').replace(/[.,]+$/, '');
        // a stated nutrient: "20g protein", "20 g of protein", "300 kcal"
        const nk = nutrOf(nx) || (unitOf(nx) && (nutrOf(nx2) || (nx2 === 'of' && nutrOf(N(words[i + 3] || ''))) ));
        if(/^\d/.test(w) && nk){ const k = typeof nk === 'string' ? nk : nutrOf(nx2) || nutrOf(N(words[i + 3] || ''));
          stated = { ...(stated || {}), [k]: n }; i += nutrOf(nx) ? 1 : nutrOf(nx2) ? 2 : 3;
          if(name.length && WITH.has(N(name[name.length - 1]))) name.pop(); continue; }
        const u = unitOf(nx);
        if(qty == null || (byWord && /^\d/.test(w) && u)){   // a written amount ("200g") beats an earlier "a" / "one"
          if(u){ qty = n; unit = u[0]; factor = u[1]; byWord = false; i++; if(KEEP_IN_NAME.test(nx)) name.push(words[i]); if(N(words[i + 1] || '') === 'of') i++; continue; }
          if(qty == null && (/^\d/.test(w) || !name.length || NUMW[w] !== 1 || /^(one|ενα|ενασ|μια)$/.test(w))){ qty = n; unit = 'piece'; byWord = !/^\d/.test(w); continue; } }
        if(NUMW[w] != null && !/^\d/.test(w)) continue;   // "a", "an" inside a name
      }
      const u = unitOf(w); if(u && qty == null && !name.length && !KEEP_IN_NAME.test(w) && w !== 'φετα'){ qty = 1; unit = u[0]; factor = u[1]; if(N(words[i + 1] || '') === 'of') i++; continue; }   // (φέτα alone is feta cheese) "a slice of bread", "glass of milk"
      if(COOKED.test(w)) state = 'cooked'; else if(RAW.test(w)) state = 'raw';
      if(!name.length && (LEAD.test(w) || ART.test(w))) continue;
      name.push(raw.replace(/[,.!:;]+$/, ''));
    }
    // "… after the gym", "… for lunch", "μετά το γυμναστήριο": cut from the time word on (word by word: \b does not work on Greek)
    const cut = name.findIndex((x, j) => TAIL_A.test(N(x)) && name.slice(j + 1, j + 3).some(y => TAIL_N.test(N(y))));
    if(cut >= 0) name.splice(cut);
    let nm = name.join(' ').replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();
    if(N(nm).length < 2) nm = '';
    if(nm && WITH.has(N(nm.split(' ').pop()))) nm = nm.split(' ').slice(0, -1).join(' ');
    if(!nm && !stated) return null;
    if(qty != null) qty *= mult; else if(mult > 1){ qty = mult; unit = 'piece'; }
    const g = qty != null && (unit === 'g' || unit === 'ml') ? Math.round(qty * factor * 10) / 10 : null;
    return { text: text.slice(0, 80), name: nm.slice(0, 60), name_en: nm.slice(0, 60), brand: '', qty: g != null ? g : qty, unit: g != null ? unit : unit, grams: g, ml: unit === 'ml',
      kcal: null, protein: null, carbs: null, fat: null, total: null, stated, state };
  }

  // ---- 2. small corrections to the list on screen (no AI) ----
  // rows: [{ name, text }]. The target is the row the words name; with one row, "make it 200g" means that row. Anything unclear → null (the AI decides).
  const stem = w => w.slice(0, Math.max(4, w.length - 2));
  const words = s => N(s).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3 && !/^\d/.test(w) && !ART.test(w));
  function target(rest, rows){
    const ws = words(rest).filter(w => !/^(make|change|actually|meant|another|more|extra|remove|delete|drop|was|were|it|its|that|this|one|add|please|instead|cooked|raw|αλλαξε|κανε|ηταν|ακομα|αλλο|αλλη|βγαλε|σβησε)$/.test(w));
    if(!ws.length) return rows.length === 1 ? 0 : -1;
    const sc = rows.map(r => { const rw = words((r.name || '') + ' ' + (r.text || '')); return ws.filter(w => rw.some(x => x.startsWith(stem(w)) || w.startsWith(stem(x)))).length; });
    const best = Math.max(...sc); if(!(best > 0)) return -2;   // named something that is not on the list
    return sc.filter(x => x === best).length === 1 ? sc.indexOf(best) : -1;
  }
  function correction(txt, rows){
    rows = rows || []; if(!rows.length) return null;
    const s = N(txt).replace(/[.!]+$/, '').trim(); if(!s || s.length > 120 || /\?$/.test(s)) return null;
    let m = s.match(/^(?:please\s+)?(?:remove|delete|drop|take out|skip|scratch|βγαλε|σβησε|αφαιρεσε|χωρισ)\s+(?:the\s+|το\s+|τα\s+|την\s+|τη\s+)?(.+)$/);
    if(m){ const i = target(m[1], rows); return i >= 0 ? { type: 'remove', i } : null; }
    m = s.match(/^(?:add\s+|and\s+|plus\s+|βαλε\s+|προσθεσε\s+)?(another|one more|an extra|(?:\d+|two|three) more|ακομα\s+(?:ενα|μια|ενασ|\d+)|αλλο ενα|αλλη μια|αλλον εναν)\s+(.+)$/);
    if(m){ const n = (m[1].match(/\d+/) || [])[0] ? +(m[1].match(/\d+/)[0]) : /two/.test(m[1]) ? 2 : /three/.test(m[1]) ? 3 : 1, i = target(m[2], rows);
      return i >= 0 ? { type: 'inc', i, n } : null; }
    const said = parse(txt)[0] || null, cook = /(?<![\p{L}\p{N}])(cooked|boiled|grilled|μαγειρεμεν\p{L}*|βραστ\p{L}*|ψητ\p{L}*)(?![\p{L}\p{N}])/u.test(s) ? 'cooked' : /(?<![\p{L}\p{N}])(raw|uncooked|dry|ωμ\p{L}*)(?![\p{L}\p{N}])/u.test(s) ? 'raw' : '';
    const fixy = /^(actually|no|nope|make it|make that|change it|change that|it was|it's|its|i meant|meant|sorry|correction|οχι|κανε το|αλλαξε|ηταν|εννοουσα|συγγνωμη)(?![\p{L}\p{N}])/u.test(s) || /(?<![\p{L}\p{N}])(make it|make the|should be|instead|not \d|was \d|ηταν \d|κανε τ)/u.test(s);
    const q = s.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|γρ|kg|ml|l|lt|slices?|pieces?|pcs|cups?|tbsp|tsp|servings?|portions?|scoops?|φετεσ|φετα|τεμ\p{L}*|μεριδ\p{L}*)?(?![\p{L}\p{N}])/u);
    const onlyAmount = /^(\d+(?:[.,]\d+)?)\s*(g|gr|grams?|γρ|kg|ml|l|lt)$/.test(s);
    if(q && (fixy || onlyAmount)){
      const rest = s.replace(q[0], ' '), i = target(rest, rows); if(i < 0) return null;
      const u = q[2] ? unitOf(q[2]) : null, n = parseFloat(q[1].replace(',', '.'));
      if(!(n > 0) || n > 5000) return null;
      if(!u){ return rows[i].counted ? { type: 'set', i, qty: n, unit: 'piece' } : null; }
      return { type: 'set', i, qty: u[0] === 'g' || u[0] === 'ml' ? n * u[1] : n, unit: u[0] === 'g' || u[0] === 'ml' ? u[0] : u[0] };
    }
    if(cook && (fixy || s.split(' ').length <= 3)){ const i = target(s, rows); return i >= 0 ? { type: 'state', i, state: cook } : null; }
    return null;
  }

  // ---- 3. answered without AI ----
  function quick(txt){
    const s = N(txt).replace(/[!.\s]+$/, '').trim();
    if(/^(thanks?|thank you( so much)?|thx|ty|cheers|ευχαριστω( πολυ)?|ευχαριστουμε|merci|great,? thanks|perfect,? thanks|τελεια,? ευχαριστω)$/.test(s)) return { kind: 'thanks' };
    if(/^(hi|hello|hey|hey there|yo|γεια|γεια σου|γεια σασ|καλημερα|καλησπερα|χαιρετω)$/.test(s)) return { kind: 'hi' };
    const key = /protein|πρωτειν/.test(s) ? 'p' : /carb|υδατανθρακ/.test(s) ? 'c' : /(?<![\p{L}\p{N}])fat|λιπαρ|λιπο/u.test(s) ? 'f' : /calor|kcal|θερμιδ/.test(s) ? 'kcal' : null;
    if(!key || !/^(how (much|many)|what(?:'s| is| was)|ποσ[ηοα]|ποσεσ|ποσουσ|τι)(?![\p{L}\p{N}])/u.test(s) || s.split(' ').length > 9) return null;
    if(/(?<![\p{L}\p{N}])(today|so far|left|remaining|σημερα|μεχρι τωρα|μου μενουν|απομενουν|εμειναν)(?![\p{L}\p{N}])/u.test(s)) return { kind: 'today', key };
    if(/(?<![\p{L}\p{N}])(that|this|it|those|these|was|αυτο|αυτα|ηταν|ειχε)(?![\p{L}\p{N}])/u.test(s)) return { kind: 'last', key };
    return null;
  }

  // ---- 4. one food's values made consistent, deterministically (replaces the old second "retry" AI call) ----
  // kcal per 100 g missing but protein / carbs / fat known → 4/4/9; absurd values → unknown; macros that do not add up, or a whole-portion total
  // that disagrees with per-100 g × grams → kept but marked doubt ("rough estimate, check"). Missing macros stay null (unknown), never 0.
  function check(x){
    const it = { ...x }, num = v => (v === null || v === undefined || v === '' || !isFinite(+v)) ? null : +v;
    ['kcal', 'protein', 'carbs', 'fat', 'grams', 'total'].forEach(k => { const v = num(it[k]); it[k] = v != null && v >= 0 ? v : null; });
    let doubt = '';
    const known = ['protein', 'carbs', 'fat'].filter(k => it[k] != null), mk = (it.protein || 0) * 4 + (it.carbs || 0) * 4 + (it.fat || 0) * 9;
    if(it.kcal == null && known.length === 3 && mk > 0){ it.kcal = Math.round(mk); doubt = 'kcal from macros'; }
    if(it.kcal != null && it.kcal > 902){ it.kcal = null; doubt = 'kcal above pure fat'; }
    if(known.length && (it.protein || 0) + (it.carbs || 0) + (it.fat || 0) > 101){ doubt = 'macros above 100 g per 100 g'; }
    if(it.kcal != null && known.length === 3 && !it.ml && Math.abs(mk - it.kcal) > Math.max(40, it.kcal * .3)) doubt = doubt || 'kcal and macros disagree';
    if(it.kcal != null && known.length < 3 && it.kcal > 40) doubt = doubt || 'macros unknown';
    if(it.grams != null && it.grams > 5000){ it.grams = null; doubt = doubt || 'amount too large'; }
    if(it.total != null && it.grams && it.kcal != null){ const calc = it.kcal * it.grams / 100;
      if(Math.abs(calc - it.total) > Math.max(60, Math.max(calc, it.total) * .25)) doubt = doubt || 'total disagrees with per 100 g'; }
    // a stated nutrient ("20g protein") wins over the estimate's protein for that amount
    if(it.stated && it.stated.protein > 0 && it.grams > 0 && it.kcal != null){ const p = Math.round(it.stated.protein / it.grams * 1000) / 10; if(p <= 100) it.protein = p; }
    return { item: it, doubt };
  }
  // usable as a food row: kcal known and at least protein, carbs and fat not all unknown
  const usable = x => x && x.kcal != null && ['protein', 'carbs', 'fat'].some(k => x[k] != null);

  // ---- 5. the short context the AI gets (read-only; the app's own numbers; nothing copied anywhere) ----
  // Athlete OS is planned, not built: these are the existing owners (targets, the diary, the Gym / Rest Day label, Food Preferences, what the app learned).
  function context(){
    const out = [];
    try{
      const d = curDay, tg = targetFor(d), tot = dayTotals(d), st = dayStatus(d), today = d === todayKey(), n = (dayLog[d] || []).length;
      const trained = (typeof sessions !== 'undefined' ? sessions : []).some(s => s && s.date === d && s.end);
      out.push(`${today ? 'Today' : 'Day ' + d}: ${st.type === 'gym' ? 'training day' + (trained ? ' (workout done)' : st.time ? ` (gym at ${st.time})` : '') : 'rest day'}.`);
      out.push(n ? `Logged so far (${n} entries; may be incomplete — unlogged food is unknown, never a deficit): ${Math.round(tot.kcal)} kcal, P ${Math.round(tot.p)} g, C ${Math.round(tot.c)} g, F ${Math.round(tot.f)} g.` : 'Nothing logged yet for this day (unknown, not zero eaten).');
      if(tg) out.push(`Targets: ${tg.k} kcal, P ${tg.p} g, C ${tg.c} g, F ${tg.f} g.`);
    }catch(e){}
    let rules = ''; try{ rules = AI.dietRules() + AI.knows('food'); }catch(e){}
    return out.join(' ') + rules;
  }

  // ---- 6. chat memory on this phone ----
  const CHAT_MS = 2 * 864e5, CHAT_MAX = 80;
  function chatLoad(){ const c = Store.load('coachChat', null); if(!c || !Array.isArray(c.msgs) || Date.now() - (c.at || 0) > CHAT_MS) return null; return c; }
  function chatSave(msgs, extra){ const c = Store.load('coachChat', null) || {};
    return Store.save('coachChat', { ...c, ...(extra || {}), at: Date.now(), msgs: (msgs || []).slice(-CHAT_MAX) }); }
  const chatClear = () => { const c = Store.load('coachChat', null); Store.save('coachChat', c && c.lat ? { lat: c.lat, at: 0, msgs: [] } : null); };

  // ---- 7. how fast answers are (this phone only; times and the path, never the text) ----
  const LAT_MAX = 200;
  function track(path, ms, calls){ try{ const c = Store.load('coachChat', null) || { msgs: [], at: 0 }; const l = (c.lat || []).concat([[path, Math.round(ms), calls | 0]]).slice(-LAT_MAX);
    Store.save('coachChat', { ...c, lat: l }); }catch(e){} }
  function pct(a, p){ if(!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; }
  function stats(){ const l = ((Store.load('coachChat', null) || {}).lat || []), by = {};
    l.forEach(([p, ms, c]) => { (by[p] = by[p] || { ms: [], calls: 0 }).ms.push(ms); by[p].calls += c; });
    const row = a => ({ n: a.ms.length, p50: pct(a.ms, 50), p95: pct(a.ms, 95), callsPerAnswer: a.ms.length ? Math.round(a.calls / a.ms.length * 100) / 100 : 0 });
    return { all: row({ ms: l.map(x => x[1]), calls: l.reduce((a, x) => a + x[2], 0) }), ...Object.fromEntries(Object.entries(by).map(([k, v]) => [k, row(v)])) }; }

  return { parse, correction, quick, check, usable, context, chatLoad, chatSave, chatClear, track, stats, pct };
})();
