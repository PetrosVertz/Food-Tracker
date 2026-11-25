// ---------- Refinements #5 (changes 24 + 25): Food Coach complex meals — one AI call, one card, the app does the maths ----------
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// Simple foods ("rice", "2 eggs and toast") keep the Food Coach path in today.js. A complex meal (a known composed dish from
// js/data/portions.js, or three or more foods) goes here:
//   mealDetect  the code decides first: known dish, how many, portion words (small, large, double meat…), grams written or not
//   mealPrompt  ONE AI call: the parts with their grams and numbers (never a total); the same prompt for any model
//   mealParts   reads and checks the answer (broken → one retry → the old Food Coach path)
//   mealBuild   the code takes over: weights of a known dish from the portion file (values from the built-in foods),
//               minimum sensible weights, the 4/4/9 check, hidden cooking oil, confidence
//   mealTotal   adds the parts up (the card's total is always the sum of its rows)
//   mealCard*   one card; tap to open the parts; one Eaten entry when logged
// The engine part (down to mealTotal) needs only norm(), GENBY and the portion file, so tools/meal-test.js runs it without a browser.

const MEAL_ROLES = ['bread', 'meat', 'fries', 'veg', 'sauce', 'cheese', 'pasta', 'drink', 'oil', 'other'];
const MEAL_SIZE = Object.fromEntries(PORTION_WORDS.map(w => [w.k, w.f]));   // small .75 · normal 1 · large 1.3 · xl 1.6
const MEAL_SIZES = ['small', 'normal', 'large'];   // the card's one-tap portion choice
const MEAL_NUM = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, ena: 1, enas: 1, mia: 1, dyo: 2, dio: 2, duo: 2, tria: 3, tris: 3, tessera: 4,
  'ενα': 1, 'ενασ': 1, 'μια': 1, 'δυο': 2, 'τρια': 3, 'τρεισ': 3, 'τεσσερα': 4, 'τεσσερισ': 4 };

// the portion file's patterns are written with \b and \w; JavaScript's \b and \w only know Latin letters, so for Greek they become
// "a letter or digit" / "the start, the end or anything else" (no look-behind, so older iPhones read it too)
const MEAL_RX = {}, MEAL_L = '[\\p{L}\\p{N}]', MEAL_B = '(?:^|$|[^\\p{L}\\p{N}])';
function mealRx(src){
  return MEAL_RX[src] || (MEAL_RX[src] = new RegExp(String(src).replace(/\\b/g, MEAL_B).replace(/\\w/g, MEAL_L), 'u'));
}
const mealCountry = () => PORTIONS[PORTION_HOME] || PORTIONS.GR;
// where one food ends and the next starts: commas, "and", "with", "+", Greek / Greeklish "και", "με", "kai", "me"
const MEAL_SPLIT = mealRx('\\s*(?:[,;+&\\n]|\\b(?:and|with|plus|kai|ke|me|και|κ|με)\\b)\\s*');
const MEAL_GRAMS = mealRx('\\d+(?:[.,]\\d+)?\\s*(?:g|gr|grams?|γρ|kg|ml|lt?)\\b');

// ---- 1. the code decides first ----
function mealDetect(txt){
  const s = norm(txt), P = mealCountry();
  const dish = P.dishes.find(d => mealRx(d.re).test(s) && (!d.need || mealRx(d.need).test(s))) || null;
  let n = 1;
  if(dish && dish.count){ const hit = s.match(mealRx(dish.re)), before = s.slice(0, hit ? hit.index : 0).trim().split(' ').slice(-2).reverse();
    for(const w of before){ const v = /^\d+$/.test(w) ? +w : MEAL_NUM[w]; if(v > 0 && v <= 12){ n = v; break; } } }
  const size = (PORTION_WORDS.find(w => mealRx(w.re).test(s)) || { k: 'normal' }).k;
  const roles = {}; PORTION_ROLE_WORDS.forEach(w => { if(mealRx(w.re).test(s)) roles[w.role] = w.f; });
  const items = s.split(MEAL_SPLIT).filter(x => x && x.trim().length > 1).length;
  return { s, dish, n, size, roles, grams: MEAL_GRAMS.test(s), items, complex: !!dish || items >= 3 };
}

// a built-in food: short name and values per 100 g
const mealGen = gid => (typeof GENBY !== 'undefined' && GENBY[gid]) || null;
const mealGenName = (g, el) => String((el ? g.el : g.en) || g.en).split(/[,(]/)[0].trim();
const mealGenPer = g => ({ kcal: +g.kcal || 0, protein: +g.protein || 0, carbs: +g.carbs || 0, fat: +g.fat || 0, fiber: +g.fiber || 0, potassium: +g.potassium || 0, salt: g.salt, sodium: g.sodium });
const mealStem = s => norm(s).split(' ')[0].slice(0, 5);
const mealSays = (s, g) => [mealStem(g.en), mealStem(g.el)].some(st => st.length >= 4 && s.includes(st));
const mealNot = (s, g) => [mealStem(g.en), mealStem(g.el)].some(st => st.length >= 4 && mealRx(`\\b(without|no|xoris|xwris|χωρισ)\\s+(\\w+\\s+)?${st}`).test(s));

// ---- 2. the one AI call ----
function mealGuide(det){
  const el = typeof lang !== 'undefined' && lang === 'el';
  const one = d => { const nm = el ? d.el : d.en, per = d.per === 'slice' ? ' per slice' : d.count ? ' each' : '';
    if(d.parts) return `${nm}${per}: ` + d.parts.map(p => { const g = mealGen(p.gid); return g ? `${mealGenName(g).toLowerCase()} ${p.g} g${p.optional ? ' (optional add-on)' : ''}` : ''; }).filter(Boolean).join(', ');
    return `${nm}${per}: about ${d.g} g in all`; };
  const P = mealCountry(), first = det && det.dish ? [det.dish] : [];
  return [...first, ...P.dishes.filter(d => !first.includes(d))].map(one).map(x => '- ' + x).join('\n');
}
function mealPrompt(txt, ch, det, extra){
  const conv = typeof logQConv === 'function' ? logQConv(ch) : ch && ch.transcript ? ch.transcript() : '', ln = typeof lang !== 'undefined' && lang === 'el' ? 'Greek' : 'English';
  const hint = typeof logQFixHint === 'function' ? logQFixHint(txt) : '';
  const extras = typeof AI !== 'undefined' ? AI.dietRules() + AI.knows('food') : '';
  // the one coach personality and reply length (Settings › AI › Coach Personality) as in every Food Coach prompt; reply stays apart from the JSON fields
  const voice = typeof AI !== 'undefined' && AI.voice ? AI.voice('chef') : '', words = n => typeof AI !== 'undefined' && AI.words ? AI.words(n) : n;
  return `${voice}Here you are Food Coach, the chef robot in a food-tracking app for someone who lifts weights. Never judgmental about food, no lectures.
${conv ? `Recent chat:\n${conv}\n` : ''}The user's new message: """${txt}"""
The user may write in English, Greek, Greeklish (Greek in Latin letters: "xoirino" = pork, "kotopoulo" = chicken, "kima" = mince, "tost" = toastie, "gala" = milk, "patates" = fries) or a mix, with slang and half sentences.
First decide what the message is: "log" (they ate or drank something), "suggest" (they ask what to eat next; leave parts empty) or "answer" (any other question; leave parts empty).
reply: in ${ln}, plain text, no markdown, no emoji, no numbers; for "log" at most ${words(20)} words, for "answer" at most ${words(60)} words. Nothing is logged until the user taps Add, so never say you added or logged anything. The reply is only for the user: it never changes the parts, names, grams or numbers.
For "log" the user ate ONE meal made of several parts. Split it into its parts; the app adds them up:
- One part per food in it (bread, meat, fries, vegetables, sauce, cheese, pasta, drink...). Never one part for a whole dish.
- grams: the cooked weight of that part as eaten. Always a NORMAL adult serving, never a small, half or single-bite one. Ignore size words (small, large, double): the app applies them. Use other amounts only when the user writes them.
- role: bread, meat, fries, veg, sauce, cheese, pasta, drink, oil or other. cook: raw, boiled, grilled, pan, fried or baked.
- kcal, protein, carbs, fat: for THAT part at those grams (not per 100 g), without added cooking oil (the app adds it).
- optional: true for add-ons the user did not name and only some people take (sauces like tzatziki, extra cheese); false for what they named or the dish always has.
- Assume the usual version of the dish. Do not add anything up and give no total.
- title: the meal as the user wrote it, tidied, in ${ln}. assumed: one short phrase in ${ln} with what you assumed ("medium pita, no tzatziki"). range: true when this meal's portion often varies a lot.
Typical normal portions in Greece:
${mealGuide(det)}${hint}${extra || ''}${extras}
Return ONLY JSON in exactly this shape: {"intent":"log","reply":"Got it.","complex":true,"title":"Pork Gyro Pita","assumed":"medium pita, no tzatziki","range":true,"parts":[{"name":"pita bread","role":"bread","grams":75,"cook":"grilled","optional":false,"kcal":218,"protein":6,"carbs":37.5,"fat":4.5}]}`;
}

// ---- 3. read and check the answer ----
function mealParts(a){
  if(!Array.isArray(a)) return null;
  const n = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v;
  const out = a.filter(x => x && typeof x === 'object' && (x.name || x.text) && n(x.grams) > 0).slice(0, 15).map(x => ({
    name: String(x.name || x.text).slice(0, 60), role: MEAL_ROLES.includes(x.role) ? x.role : 'other', g: Math.min(3000, n(x.grams)),
    cook: PORTION_OIL[x.cook] !== undefined ? x.cook : 'raw', optional: x.optional === true,
    kcal: n(x.kcal) !== null && n(x.kcal) >= 0 ? n(x.kcal) : null, p: Math.max(0, n(x.protein) || 0), c: Math.max(0, n(x.carbs) || 0), f: Math.max(0, n(x.fat) || 0) }))
    .filter(x => x.kcal !== null || x.p + x.c + x.f > 0);
  return out.length ? out : null;
}
// the 4/4/9 check (change 25): protein × 4 + carbs × 4 + fat × 9 must match the calories within 10 %, otherwise the calories are
// worked out again from them. Drinks are left alone (alcohol has calories outside protein, carbs and fat).
function mealCheck(x){
  const mk = x.p * 4 + x.c * 4 + x.f * 9;
  if(x.kcal === null) return { kcal: mk, fixed: true };
  if(x.role === 'drink' || !(mk > 0)) return { kcal: x.kcal, fixed: false };
  if(Math.abs(mk - x.kcal) > .1 * Math.max(mk, x.kcal)) return { kcal: mk, fixed: true };
  return { kcal: x.kcal, fixed: false };
}

// ---- 4. the code takes over ----
// det: from mealDetect; ai: { parts (from mealParts), title, assumed, range }. Returns the meal shown on the card.
function mealBuild(det, ai, txt){
  const P = mealCountry(), dish = det.grams ? null : det.dish, n = det.n || 1, s = det.s;
  let parts = ai.parts.map(x => { const k = mealCheck(x);
    return { name: x.name, role: x.role, cook: x.cook, opt: x.optional, on: !x.optional, g0: x.g, src: 'est', fixed: k.fixed,
      per: { kcal: k.kcal / x.g * 100, protein: x.p / x.g * 100, carbs: x.c / x.g * 100, fat: x.f / x.g * 100 } }; });
  let raised = false;
  // a known dish with its parts: the weights and values come from the portion file and the built-in foods; the AI's names stay
  if(dish && dish.parts){
    const used = new Set(), out = [];
    dish.parts.forEach(dp => { const g = mealGen(dp.gid); if(!g || mealNot(s, g)) return;
      const byName = dp.role === 'veg' || dp.role === 'sauce';
      const j = parts.findIndex((p, i) => !used.has(i) && p.role === dp.role && (!byName || mealSays(norm(p.name), g)));
      const hit = j > -1 ? parts[j] : null; if(hit) used.add(j);
      const on = !dp.optional || (hit && !hit.opt) || mealSays(s, g);
      out.push({ name: hit ? hit.name : mealGenName(g, typeof lang !== 'undefined' && lang === 'el'), role: dp.role, cook: 'raw', opt: !!dp.optional, on, g0: dp.g * n, gid: dp.gid,
        src: 'std', fixed: false, per: mealGenPer(g) }); });
    // the AI split it well: keep its extras (feta, a drink…); it did not: the portion file is the meal, plus any drink
    const rest = used.size >= 2 ? parts.filter((p, i) => !used.has(i)) : parts.filter(p => p.role === 'drink');
    parts = out.concat(rest);
  }
  // a known dish with only a total weight: the AI's parts are scaled up to a normal portion of it (never down)
  if(dish && !dish.parts && dish.g){
    const body = parts.filter(p => p.on && p.role !== 'drink'), sum = body.reduce((a, p) => a + p.g0, 0), want = dish.g * n;
    if(sum > 0 && sum < want * .85 && !mealRx('\\b(whole|oloklir\\w*|ολοκληρ\\w*|family|οικογενει\\w*)\\b').test(s)){ const k = want / sum; body.forEach(p => { p.g0 *= k; p.raised = true; }); raised = true; }
  }
  // minimum sensible weights (change 24 B), unless the user said small or wrote the grams
  if(!det.grams && det.size !== 'small') parts.forEach(p => {
    const r = P.mins.find(m => mealRx(m.re).test(norm(p.name)) && (!m.role || m.role === p.role) && !(m.side && det.dish && det.dish.wrap) && !(m.per === 'slice' && det.dish && det.dish.per === 'slice'));
    if(r && p.on && p.g0 < r.g){ p.g0 = r.g; p.raised = true; raised = true; } });
  // hidden cooking oil (change 25): only for parts whose numbers came from the AI (told to leave the oil out)
  const hasOil = parts.some(p => p.role === 'oil' || mealRx('\\b(oil|ladi|λαδι|ελαιολαδο|butter|βουτυρο)\\b').test(norm(p.name)));
  const oil = hasOil ? 0 : parts.filter(p => p.src === 'est' && p.on).reduce((a, p) => a + (PORTION_OIL[p.cook] || 0), 0);
  const og = mealGen(PORTION_OIL_GID);
  if(oil > 0 && og) parts.push({ name: typeof t === 'function' ? t('mealOil') : 'Cooking oil', role: 'oil', cook: 'raw', opt: false, on: true, g0: oil, gid: PORTION_OIL_GID, src: 'std', fixed: false, oil: true, per: mealGenPer(og) });
  parts.forEach(p => { p.name = p.name.charAt(0).toUpperCase() + p.name.slice(1); });   // rows read alike, AI names and built-in names
  const M = { title: mealTitle(ai.title || txt), assumed: String(ai.assumed || '').replace(/\s+/g, ' ').trim().slice(0, 80), parts, size: det.grams ? 'normal' : det.size, roles: det.roles || {},
    grams: det.grams, dish: dish ? dish.id : null, raised, range: !!ai.range, open: false };
  // confidence (change 25): High = the user wrote the amounts; Medium = a known regional dish or built-in values; Low = vague or corrected
  const fixed = parts.some(p => p.fixed), allStd = parts.every(p => p.src === 'std');
  M.conf = det.grams ? 'high' : (dish || allStd) ? 'medium' : (raised || fixed || ai.range) ? 'low' : 'medium';
  M.why = [det.grams ? null : 'portion', parts.some(p => p.oil || (p.on && (p.cook === 'fried' || p.cook === 'pan' || p.role === 'fries'))) ? 'oil' : null, parts.some(p => p.opt) ? 'sauce' : null].filter(Boolean);
  mealApply(M);
  return M;
}
// the weight of each part from its normal weight, the portion size and the role words (double meat…)
const mealF = (M, p) => (M.grams ? 1 : (MEAL_SIZE[M.size] || 1)) * (M.roles[p.role] || 1);
function mealApply(M){ M.parts.forEach(p => { p.g = Math.round(p.g0 * mealF(M, p)); }); return M; }
// one part at its weight: kcal rounded (so the total is exactly the sum of the rows), macros to 0.1 g
function mealPart(p){ const x = (p.g || 0) / 100, r = v => Math.round(v * 10) / 10;
  return { kcal: Math.round(p.per.kcal * x), p: r(p.per.protein * x), c: r(p.per.carbs * x), f: r(p.per.fat * x), fib: r((p.per.fiber || 0) * x) }; }
function mealTotal(M, size){
  const S = size ? { ...M, size } : M, r = v => Math.round(v * 10) / 10;
  return M.parts.filter(p => p.on && p.g0 > 0).reduce((a, p) => { const q = mealPart(size ? { ...p, g: Math.round(p.g0 * mealF(S, p)) } : p);
    return { kcal: a.kcal + q.kcal, p: r(a.p + q.p), c: r(a.c + q.c), f: r(a.f + q.f), fib: r(a.fib + q.fib), g: a.g + (size ? Math.round(p.g0 * mealF(S, p)) : p.g) }; }, { kcal: 0, p: 0, c: 0, f: 0, fib: 0, g: 0 });
}
// the card title: the name as written, tidied, a capital on each main word (English and Greek)
const MEAL_SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'with', 'without', 'in', 'on', 'kai', 'me', 'xoris', 'και', 'με', 'χωρίς', 'σε', 'το', 'τα', 'η', 'ο', 'οι']);
function mealTitle(s){
  const ws = String(s || '').replace(/[.!?;:"""«»]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).split(' ');
  return ws.map((w, i) => i && MEAL_SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
// the simple path's AI said "complex" (its second opinion): its foods become the parts of one meal, no second call
function mealFromItems(items, r){
  const parts = (items || []).filter(it => it.grams > 0 && it.kcal !== null && it.kcal !== undefined).map(it => ({ name: it.name || it.text, role: 'other', grams: it.grams, cook: 'raw', optional: false,
    kcal: it.kcal * it.grams / 100, protein: it.protein * it.grams / 100, carbs: it.carbs * it.grams / 100, fat: it.fat * it.grams / 100 }));
  return parts.length >= 2 ? { intent: 'log', reply: r && r.reply, title: r && r.title, assumed: '', range: false, parts } : null;
}

// ---- 5. in the Food Coach chat ----
// returns true when it handled the message; false = no request was made (no key / offline): the old Food Coach path takes over;
// { spent: true } = a request was made but its answer was not usable; { err } = it failed. Both go to the offline reading (one request per message).
// Food Coach 2.0: ai = an AI request can go out now (logQAIOk). A dish you added before needs no AI; otherwise ONE call (the provider already moves to
// the next model when an answer can't be read). A failed call returns { err } so Food Coach answers offline at once instead of asking again.
async function mealSend(txt, ch, det, ai){
  const key = 'meal:' + norm(txt); let r = Array.isArray((logPhr[key] || {}).parts) ? logPhr[key] : null;   // the same message as before: no AI at all
  if(!r){ if(ai === false || !AI.hasKey()) return false;
    try{ const a = await ch.ask(mealPrompt(txt, ch, det, ''), null, { task: 'food-meal' }) || {};
      const intent = String(a.intent || 'log');
      if(intent === 'suggest'){ await logQSuggest(ch, logQReply(a.reply), null); return true; }   // the one request is spent: a short reply, no second request
      if(intent === 'answer' && !mealParts(a.parts)){ ch.say(logQReply(a.reply) || t('aiErrOther')); return true; }
      if(mealParts(a.parts)) r = a; }
    catch(e){ if(e.cancelled) throw e; return { err: e }; }
    if(!r) return { spent: true };   // an unreadable / empty answer: the request was made, so Food Coach reads the message offline (no second request)
  }
  return mealShow(txt, ch, det, r);
}
function mealShow(txt, ch, det, r){
  const parts = mealParts(r.parts); if(!parts) return false;
  const M = mealBuild(det, { ...r, parts }, txt);
  if(!M.parts.some(p => p.on)) return false;
  const m = { id: uid(), items: [], meal: M, raw: r, mk: 'meal:' + norm(txt), state: 'ready' };
  ch.say(logQReply(r.reply) || t('logQGot'));
  const [card] = ch.cards([{ body: '', actions: [{ label: t('add'), primary: true, run: () => mealLog(m) }, { label: t('logQAddSave'), run: () => logQNameAsk(m) }] }]);
  FC[m.id] = { m, card, ch }; logQRedraw(m);
  return true;
}

// ---- 6. Ask first: a takeaway dish with no details (burger, pizza, crepe) gets one small card, no AI ----
// The dish table is ASK_DISHES in js/data/portions.js. The card asks for what is usually different (toppings / the pizza type / sweet or savoury), the app adds
// up the built-in foods. "Just Estimate" / "None Of The Above" give a typical version and the coach says plainly that it is a general estimate.
const askName = x => (typeof lang !== 'undefined' && lang === 'el' ? x.el : x.en) || x.en;
// only a short message about one dish: grams, a list of foods or words like chicken / veggie go the normal way
// "crepe with nutella" is still one dish: every other piece of the message must be one of that dish's own ticks (it comes ticked on the card)
const askEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const askSays = (s, it) => mealRx('\\b(?:' + (it.kw || askEsc(norm(it.en)) + '|' + askEsc(norm(it.el))) + ')\\b').test(s);
const askAllItems = a => [].concat(a.groups || [], a.savory || [], a.sweet || []).reduce((l, gr) => l.concat(gr.items), []);
const askBrandOf = s => (typeof ASK_BRANDS !== 'undefined' ? ASK_BRANDS : []).find(b => mealRx(b.re).test(s)) || null;
const askNamedOf = (a, s) => (a.named || []).find(n => mealRx(n.re).test(s)) || null;
function askMatch(txt, det){
  if(typeof ASK_DISHES === 'undefined' || !det || det.grams) return null;
  const br = askBrandOf(det.s), s = br ? det.s.replace(mealRx(br.re), ' ').replace(/\s+/g, ' ').trim() : det.s;   // the place's name is not a food
  const a = ASK_DISHES.find(x => mealRx(x.re).test(s) && !(x.skip && mealRx(x.skip).test(s)));
  if(!a) return null;
  const rest = s.split(MEAL_SPLIT).filter(x => x && x.trim().length > 1 && !mealRx(a.re).test(x)), its = askAllItems(a);
  return rest.every(seg => its.some(it => askSays(seg, it))) && rest.length <= 4 ? a : null;
}
const askGroups = (a, mode) => a.groups || (mode && a[mode]) || [];
function askItems(A){   // every tick of the card now showing: { key, it }
  const out = []; askGroups(A.a, A.mode).forEach(gr => gr.items.forEach((it, i) => out.push({ key: (A.mode ? A.mode + '.' : '') + gr.k + i, it, gr }))); return out;
}
const askPart = (it, g, role) => { const f = mealGen(it.gid); return f ? { name: askName(it), role: role || it.role || 'other', cook: 'raw', opt: false, on: true, g0: g, gid: it.gid, src: 'std', fixed: false, per: mealGenPer(f) } : null; };
const askKcal = (it, n) => { const f = mealGen(it.gid); return f ? Math.round((+f.kcal || 0) * it.g * (n || 1) / 100) : 0; };
// the parts of the dish as it stands (est = the typical version: the usual ticks, the general pizza)
function askParts(A, est){
  const a = A.a, n = A.n || 1, parts = [];
  if(a.kind === 'pick'){ const o = !est && A.pick >= 0 ? a.options[A.pick] : null, it = o || a.general, f = it && mealGen(it.gid); if(!f) return [];
    parts.push({ name: o ? askName(o) : askName(a), role: 'other', cook: 'raw', opt: false, on: true, g0: it.g * A.slices, gid: it.gid, src: 'std', fixed: false, per: mealGenPer(f) }); return parts; }
  (a.base || []).forEach(b => { const p = askPart(b, b.g * n); if(p) parts.push(p); });
  askItems(A).forEach(({ key, it }) => { if(est ? it.on : A.on[key]){ const p = askPart(it, it.g * n); if(p) parts.push(p); } });
  return parts;
}
function askBuild(m, est, brandy){
  const A = m.ask, a = A.a, det = m.det || {}, parts = askParts(A, est), el = typeof lang !== 'undefined' && lang === 'el';
  const o = a.kind === 'pick' && !est && A.pick >= 0 ? a.options[A.pick] : null;
  const title = A.label && a.kind !== 'pick' ? A.label : A.label ? (o ? (el ? 'Πίτσα ' + o.el + ' ' + A.place : A.place + ' ' + o.en + ' Pizza') : A.label) : a.kind === 'pick' ? (o ? (el ? 'Πίτσα ' + o.el : o.en + ' Pizza') : askName(a)) : a.modes ? t('askMode_' + A.mode) + ' ' + askName(a) : askName(a);
  const ticked = a.kind === 'tick' && !est ? askItems(A).filter(x => A.on[x.key]).map(x => askName(x.it).toLowerCase()) : [];
  const assumed = est || brandy ? t('askAssumedEst') : a.kind === 'pick' ? t('askSlices', { n: A.slices }) : ticked.length ? t('askWith', { l: ticked.slice(0, 5).join(', ') + (ticked.length > 5 ? '…' : '') }) : '';
  const M = { title: mealTitle(title), assumed: assumed.slice(0, 80), parts, size: A.size || det.size || 'normal', roles: det.roles || {}, grams: false, dish: a.id, raised: false, range: false, open: false,
    conf: est || brandy ? 'low' : 'medium', why: ['portion'], est: !!est || !!brandy, local: true };
  return mealApply(M);
}
async function askShow(txt, ch, a, det){
  const named = md => askGroups(a, md).reduce((l, gr) => l.concat(gr.items.filter(it => askSays(det.s, it))), []);
  const first = a.modes ? (/(sweet|gliko|γλυκ)/.test(det.s) || (named('sweet').length > named('savory').length) ? 'sweet' : a.modes[0]) : null;
  const br = askBrandOf(det.s), nmd = askNamedOf(a, det.s), place = (nmd && nmd.brand) || (br && br.name) || '';
  // a place or a menu item named: still an estimate from typical ingredients (no brand's official numbers), and the card says so
  const A = { a, n: a.kind === 'pick' ? 1 : (det.n || 1), mode: first, on: {}, pick: 0, slices: a.kind === 'pick' ? (det.n > 1 ? det.n : a.slices) : 0,
    place, label: nmd ? nmd.name : place ? place + ' ' + askName(a) : '' };
  // size words are read without the place's name or the menu item ("Big Mac" is not a big portion)
  { const s2 = det.s.replace(mealRx(br ? br.re : '$^'), ' ').replace(mealRx(nmd ? nmd.re : '$^'), ' '); A.size = (PORTION_WORDS.find(w => mealRx(w.re).test(s2)) || { k: 'normal' }).k; }
  const m = { id: uid(), items: [], ask: A, det, txt, mk: 'ask:' + norm(txt), state: 'ready' };
  askItems(A).forEach(({ key, it }) => { A.on[key] = !!it.on; });
  if(a.modes) a.modes.forEach(md => askGroups(a, md).forEach(gr => gr.items.forEach((it, i) => { A.on[md + '.' + gr.k + i] = !!it.on; })));
  // what the message already named is ticked; the usual extras stay ticked only when nothing was named for that dish (so "crepe with ham" is a ham crepe)
  const nm = Object.keys(A.on).filter(k => { const p = k.split('.'), md = p.length > 2 ? p[0] : null, gk = p[p.length - 1][0], i = +p[p.length - 1].slice(1), gr = askGroups(a, md).find(g => g.k === gk); return gr && askSays(det.s, gr.items[i]); });
  if(nmd) askItems(A).forEach(({ key, it }) => { A.on[key] = nmd.on.includes(it.en); });   // Big Mac, Whopper…: their usual ticks
  else if(nm.length){ Object.keys(A.on).forEach(k => { if(!k.startsWith(first + '.') && a.modes) return; A.on[k] = nm.includes(k); }); }
  ch.say(A.label ? t('askSayBrand', { b: place || A.label, d: askName(a).toLowerCase() }) : t('askSay_' + a.id));
  const go = est => () => askGo(m, est);
  const [card] = ch.cards([{ body: '', actions: a.kind === 'pick' ? [{ label: t('askLog'), primary: true, run: go(false) }] : [{ label: t('askJust'), run: go(true) }, { label: t('askLogThese'), primary: true, run: go(false) }] }]);
  FC[m.id] = { m, card, ch }; logQRedraw(m);
}
// the card becomes the normal meal card (sizes, parts, Add). An estimate stays on the card for you to look at; ticked foods are logged at once (with Undo).
function askGo(m, forceEst){
  const x = FC[m.id], A = m.ask; if(!x || !A || m.state === 'logged') return;
  const brandy = !!A.label, est = !!forceEst || (A.a.kind === 'pick' && A.pick < 0) || brandy, M = askBuild(m, !!forceEst || (A.a.kind === 'pick' && A.pick < 0), brandy);
  if(!M.parts.some(p => p.on)){ toast(t('logQNothing')); return; }
  m.meal = M; m.ask = null; m.mk = 'meal:' + norm(m.txt);
  x.ch.update(x.card, { actions: [{ label: t('add'), primary: true, run: () => mealLog(m) }, { label: t('logQAddSave'), run: () => logQNameAsk(m) }], body: fcHtml(m) });
  if(brandy) x.ch.say(t('askBrandSay', { b: A.place || A.label, d: askName(A.a).toLowerCase() }));
  else if(est) x.ch.say(t('askEstSay', { d: askName(A.a).toLowerCase() })); else mealLog(m);
}
function askCardHtml(m){
  const A = m.ask, a = A.a, ck = (on, label, k) => `<button type="button" class="askchip ${on ? 'on' : ''}" data-ak="${k}" aria-pressed="${on ? 'true' : 'false'}"><i>${svgIcon('check', 12, 3.2)}</i>${esc(label)}</button>`;
  if(a.kind === 'pick'){
    const o = A.pick >= 0 ? a.options[A.pick] : null, per = mealGen((o || a.general).gid), k = per ? Math.round((+per.kcal || 0) * (o || a.general).g * A.slices / 100) : 0;
    return `<div class="lqcard askcard"><b class="askh">${esc(t('askWhich', { d: A.label || askName(a) }))}</b>
      <div class="askopts">${a.options.map((x, i) => `<button type="button" class="askopt ${A.pick === i ? 'on' : ''}" data-apick="${i}"><span>${esc(askName(x))}</span><small>${askKcal(x, 1)} kcal ${esc(t('askPerSlice'))}</small></button>`).join('')}
      <button type="button" class="askopt none ${A.pick === -1 ? 'on' : ''}" data-apick="-1"><span>${esc(t('askNone'))}</span><small>${esc(t('askGeneral'))}</small></button></div>
      <div class="askstep"><span>${esc(t('askSliceL'))}</span><div><button type="button" data-astep="-1" aria-label="${esc(t('askFewer'))}">${svgIcon('minus', 16, 2.6)}</button><b>${A.slices}</b><button type="button" data-astep="1" aria-label="${esc(t('askMore'))}">${svgIcon('plus', 16, 2.6)}</button></div></div>
      <div class="asktot"><span><b>${k}</b> <small>kcal</small></span><small>${esc(A.pick === -1 ? t('askGeneral') : askName(o) + ' × ' + A.slices)}</small></div></div>`;
  }
  const seg = a.modes ? `<div class="seg askseg" role="group" aria-label="${esc(askName(a))}">${a.modes.map(md => `<button type="button" data-v="${md}" data-amode="${md}" class="${A.mode === md ? 'on' : ''}">${esc(t('askMode_' + md))}</button>`).join('')}</div>` : '';
  const base = (a.base || []).map(b => askName(b));
  const kc = (a.base || []).reduce((s, b) => s + askKcal(b, A.n), 0) + askItems(A).reduce((s, x) => s + (A.on[x.key] ? askKcal(x.it, A.n) : 0), 0);
  const on = askItems(A).filter(x => A.on[x.key]).length;
  return `<div class="lqcard askcard"><b class="askh">${esc(t('askYour', { d: A.label || askName(a) }))}</b>${seg}
    <small class="ls">${esc(t('askBase', { b: mealList(base) }))}</small>
    ${askGroups(a, A.mode).map(gr => `<div class="askgrp">${esc(askName(gr))}</div><div class="askchips">${gr.items.map((it, i) => { const key = (A.mode ? A.mode + '.' : '') + gr.k + i; return ck(!!A.on[key], askName(it) + (askKcal(it, A.n) ? ' · +' + askKcal(it, A.n) : ''), key); }).join('')}</div>`).join('')}
    <div class="asktot"><span><b>${kc}</b> <small>kcal</small></span><small>${esc(t('askTicked', { n: on }))}</small></div></div>`;
}
function askClick(e, m){
  const A = m.ask; if(!A) return;
  const ak = e.target.closest('[data-ak]'); if(ak){ Phone.haptic(); A.on[ak.dataset.ak] = !A.on[ak.dataset.ak]; logQRedraw(m); return; }
  const md = e.target.closest('[data-amode]'); if(md){ if(A.mode !== md.dataset.amode){ Phone.haptic(); A.mode = md.dataset.amode; logQRedraw(m); } return; }
  const pk = e.target.closest('[data-apick]'); if(pk){ Phone.haptic(); A.pick = +pk.dataset.apick; logQRedraw(m); return; }
  const st = e.target.closest('[data-astep]'); if(st){ Phone.haptic(); A.slices = Math.max(1, Math.min(16, A.slices + +st.dataset.astep)); logQRedraw(m); }
}

const mealList = l => l.length > 1 ? l.slice(0, -1).join(', ') + t('mealAnd') + l[l.length - 1] : l.join('');
const mealMac = q => `<b class="p">P ${fmt(q.p)}</b> · <b class="c">C ${fmt(q.c)}</b> · <b class="f">F ${fmt(q.f)}</b>`;
function mealCardHtml(m){
  const M = m.meal, tot = mealTotal(M), done = m.state === 'logged', open = M.open && !done;
  const l1 = [M.grams ? '' : t('mealSize_' + M.size), M.assumed].filter(Boolean).join(' · ');
  const l2 = `${t('mealConf_' + M.conf)}${M.why.length ? ' · ' + t('mealWhy', { w: mealList(M.why.map(w => t('mealWhy_' + w))) }) : ''}`;
  const nxt = M.size === 'small' ? 'normal' : M.size === 'large' ? 'xl' : 'large';
  const range = (M.dish || M.range) && !M.grams ? `<small class="ls mlrange">${t('mealRange', { k: mealTotal(M, nxt).kcal, s: t('mealSize_' + nxt) })}</small>` : '';
  const seg = done || M.grams ? '' : `<div class="seg mlsize" role="group" aria-label="${esc(t('mealSizeL'))}">${MEAL_SIZES.map(k => `<button type="button" data-v="${k}" data-msize="${k}" class="${M.size === k ? 'on' : ''}">${t('mealSz_' + k)}</button>`).join('')}</div>`;
  const rows = open ? `<div class="mlparts">${M.parts.map((p, i) => mealRowHtml(M, p, i)).join('')}${range}</div>` : '';
  const nm = m.naming && !done ? `<div class="lqname"><small class="ls">${esc(t('logQNameSub', { n: M.title }))}</small>
    <div class="lqnrow"><input class="lqsq" type="text" data-qname value="${esc(m.mname || '')}" placeholder="${t('logQNamePh')}" autocomplete="off" enterkeyhint="done" aria-label="${t('logQNamePh')}" maxlength="60">
    <button class="lqswapbtn" type="button" data-qnameok>${t('save')}</button></div></div>` : '';
  return `<div class="lqcard mlcard ${done ? 'logged' : ''}">${M.est ? `<small class="askest">${esc(t('askEstTag'))}</small>` : ''}
    <button class="mlhead" type="button" data-mlopen aria-expanded="${open ? 'true' : 'false'}" ${done ? 'disabled' : ''}>
      <span class="mlt"><b class="mlname">${esc(M.title)}</b><small class="lm mlmac">${mealMac(tot)}</small></span>
      <span class="mlk"><span class="mlkn">${tot.kcal}</span><small>kcal</small></span>${done ? '' : `<span class="mlchev">${svgIcon('down', 16, 2.4)}</span>`}</button>
    ${l1 ? `<small class="ls aiassume mlq">${esc(l1)}</small>` : ''}<small class="ls aiassume mlq">${esc(l2)}</small>
    ${seg}${rows}${nm}</div>`;
}
function mealRowHtml(M, p, i){
  const q = mealPart(p), tag = p.src === 'est' ? ` <span class="ctag est">${t('logQEst')}</span>` : '';
  if(p.opt) return `<div class="mlrow mlopt" data-mli="${i}"><span class="mln">${esc(p.name)}</span>
    <button type="button" class="mltog ${p.on ? 'on' : ''}" data-mltog role="switch" aria-checked="${p.on ? 'true' : 'false'}" aria-label="${esc(p.name)}"><span>+${mealPart({ ...p, g: p.g }).kcal} kcal</span></button></div>`;
  return `<div class="mlrow" data-mli="${i}"><span class="mln">${esc(p.name)}${tag}</span>
    <span class="mlg"><input class="lan" type="number" inputmode="decimal" min="0" step="any" value="${p.g}" data-mlg aria-label="${esc(t('mealGramsL', { n: p.name }))}"><span class="mlgu">g</span></span>
    <span class="mlkc">${q.kcal} kcal</span>
    <button class="lqx" type="button" data-mlrm aria-label="${t('logQRm')}">${svgIcon('x', 14, 2.6)}</button></div>`;
}
// after a weight is typed: only the numbers change (no redraw, so the keyboard stays)
function mealLive(m, root){
  const M = m.meal, tot = mealTotal(M), card = root.closest('.mlcard'); if(!card) return;
  const k = card.querySelector('.mlkn'), mm = card.querySelector('.mlmac'); if(k) k.textContent = tot.kcal; if(mm) mm.innerHTML = mealMac(tot);
  card.querySelectorAll('[data-mli]').forEach(r => { const p = M.parts[+r.dataset.mli], c = r.querySelector('.mlkc'); if(p && c) c.textContent = mealPart(p).kcal + ' kcal'; });
  logQKeep(m);
}
// clicks inside a meal card (wired from logQWire in today.js)
function mealClick(e, m){
  const M = m.meal;
  if(e.target.closest('[data-mlopen]')){ M.open = !M.open; logQRedraw(m); return; }
  const sz = e.target.closest('[data-msize]'); if(sz){ if(M.size !== sz.dataset.msize){ Phone.haptic(); M.size = sz.dataset.msize; mealApply(M); logQRedraw(m); } return; }
  const row = e.target.closest('[data-mli]'); if(!row) return; const i = +row.dataset.mli, p = M.parts[i]; if(!p) return;
  if(e.target.closest('[data-mltog]')){ Phone.haptic(); p.on = !p.on; logQRedraw(m); return; }
  if(e.target.closest('[data-mlrm]')){ M.parts.splice(i, 1); logQRedraw(m); }
}
function mealInput(e, m){
  const row = e.target.closest('[data-mli]'); if(!row || !e.target.matches('[data-mlg]')) return;
  const p = m.meal.parts[+row.dataset.mli]; if(!p) return;
  const g = Math.max(0, +e.target.value || 0); p.g = Math.round(g); p.g0 = g / mealF(m.meal, p); p.user = true;
  mealLive(m, row);
}

// Add: ONE Eaten entry with the meal's total; its parts ride along on the entry (shown when you open it).
// Add & Save also keeps it in the library as one meal, the way Food Coach saves a plate today.
function mealSaveLib(M, name){
  const ings = M.parts.filter(p => p.on && p.g > 0).map(p => ({ ref: p.gid && mealGen(p.gid) ? gen_ref(mealGen(p.gid)) : { type: 'est', id: null, name: p.name, unit: 'g', icon: '', per: { ...p.per } }, grams: r1(p.g) }));
  if(!ings.length) return null;
  const tot = mealTotals(ings), w = tot.raw; if(!(w > 0)) return null;
  const k = 100 / w, now = new Date().toISOString();
  const ml = { id: uid(), createdAt: now, cookedAt: now, timesCooked: 1, name, aiName: M.title, ingredients: ings, rawWeight: Math.round(w), cookedWeight: Math.round(w), cookedEstimated: true, quick: true, via: 'coach',
    kcal: Math.round(tot.kcal * k), protein: r1(tot.protein * k), carbs: r1(tot.carbs * k), fat: r1(tot.fat * k), fiber: r1(tot.fib * k), salt: Math.round(tot.na * k / 400 * 100) / 100, potassium: Math.round(tot.k * k),
    total: { kcal: Math.round(tot.kcal), protein: r1(tot.protein), carbs: r1(tot.carbs), fat: r1(tot.fat) }, recipe: null, updatedAt: now };
  meals.push(ml); if(!saveMeals()){ meals.pop(); return null; }
  return ml;
}
function mealLog(m, keep){
  const x = FC[m.id]; if(!x || m.state === 'logged') return;
  const M = m.meal, tot = mealTotal(M); if(!(tot.g > 0)){ toast(t('logQNothing')); return; }
  const day = curDay, tm = daysUntil(day) === 0 ? nowHM() : '13:00', on = M.parts.filter(p => p.on && p.g > 0);
  const ex = on.reduce((a, p) => { const q = macrosFor(p.per, p.g); return { na: a.na + q.na, k: a.k + q.k }; }, { na: 0, k: 0 });
  const saved = keep ? mealSaveLib(M, keep) : null;
  const e = { id: uid(), time: tm, kind: 'meal', refId: saved ? saved.id : null, name: M.title, icon: '', amt: tot.g, unit: 'g',
    kcal: tot.kcal, p: tot.p, c: tot.c, f: tot.f, fib: tot.fib, na: Math.round(ex.na), k: Math.round(ex.k), ai: !M.local,
    parts: on.map(p => ({ n: p.name, g: p.g, kcal: mealPart(p).kcal })) };
  (dayLog[day] = dayLog[day] || []).push(e); saveLog();
  if(m.raw && m.mk){ logPhr[m.mk] = m.raw; logQTrim(); logQSavePhr(); }   // the same words next time: no AI call
  const msg = t('mealLogged', { n: M.title, k: tot.kcal }) + (saved ? ' · ' + t('mealSaved', { n: saved.name }) : keep ? ' · ' + t('logQNoMeal') : '');
  let undone = false;
  const undo = () => { if(undone) return; undone = true;
    dayLog[day] = (dayLog[day] || []).filter(z => z.id !== e.id); saveLog();
    if(saved){ const i = meals.findIndex(z => z.id === saved.id); if(i > -1){ meals.splice(i, 1); saveMeals(); } }
    m.state = 'ready'; m.undo = null; x.card.done = ''; x.card.undo = null; renderAll(); logQRedraw(m); };
  m.undo = undo; m.state = 'logged'; M.open = false;
  x.card.body = fcHtml(m); x.ch.update(x.card, { done: msg, undo }); renderAll();
  toast(msg, t('undo'), undo);
}
// the parts of a logged meal, in its edit window (Eaten › tap the meal); scaled when the amount there changes
function mealPartsHtml(e, amt){
  if(!e || !Array.isArray(e.parts) || !e.parts.length) return '';
  const base = e.parts.reduce((x, p) => x + (+p.g || 0), 0), k = base > 0 && amt > 0 ? amt / base : 1;   // the parts as logged, scaled to the amount now
  return `<div class="mlparts mlsaved">${e.parts.map(p => `<div class="mlrow"><span class="mln">${esc(p.n)}</span><span class="mlkc">${Math.round(p.g * k)} g · ${Math.round(p.kcal * k)} kcal</span></div>`).join('')}</div>`;
}
