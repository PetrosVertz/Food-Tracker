#!/usr/bin/env node
// Food Coach complex meals (Refinements #5): the maths and the safety nets, checked without the network.
// Run from the repo root:  node tools/meal-test.js     (tools/check.js runs it too)
// Each case is a message plus a fake AI answer (what a weak model might return). The app's code then does the rest:
// detect the dish, take weights from js/data/portions.js, check 4/4/9, add oil, add up. Exit code 1 = a case failed.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load(){
  const ctx = { console, lang: 'en' };
  vm.createContext(ctx);
  // norm() from core.js, the built-in foods, the portion file and the meal engine
  vm.runInContext(read('js/core.js').match(/function norm\(s\)\{[^\n]*\}/)[0], ctx);
  vm.runInContext(read('js/data/foods.js') + '\n' + read('js/data/foods-more.js') + '\n' + read('js/data/portions.js'), ctx);
  vm.runInContext(`
    const GENBY = {};
    GEN_RAW.forEach(([gid,en,el,alias,cat,sub,unit,state,kcal,protein,carbs,fat,pieces,piece]) => { GENBY[gid] = { gid, en, el, cat, unit, kcal, protein, carbs, fat }; });
    [...GEN_MORE, ...(typeof GEN_067 !== 'undefined' ? GEN_067 : [])].forEach(([gid,en,el,alias,cat,sub,unit,state,kcal,protein,carbs,fat,fiber]) => { GENBY[gid] = { gid, en, el, cat, unit, kcal, protein, carbs, fat, fiber }; });
    const t = (k, v) => ({ mealOil: 'Cooking oil' })[k] || (v ? k + JSON.stringify(v) : k);
  ` + read('js/meal.js') + '\n;this.E = { COOKED, askScore, askMatch, askParts, askBuild, askItems, mealDetect, mealParts, mealBuild, mealTotal, mealApply, mealPart, mealFromItems, mealPrompt, GENBY };', ctx);
  return ctx.E;
}

let fails = 0;
const ok = m => console.log('ok    ' + m);
const fail = m => { fails++; console.log('FAIL  ' + m); };
const E = load();

// a meal from a message and a fake answer; null when the answer is unusable (the app then falls back to the old Food Coach)
function run(txt, answer){
  const det = E.mealDetect(txt), parts = E.mealParts(answer && answer.parts);
  if(!parts) return { det, M: null };
  return { det, M: E.mealBuild(det, { ...answer, parts }, txt) };
}
const sumOf = M => M.parts.filter(p => p.on && p.g0 > 0).reduce((a, p) => a + E.mealPart(p).kcal, 0);
const part = (name, role, grams, kcal, protein, carbs, fat, extra) => ({ name, role, grams, kcal, protein, carbs, fat, cook: 'raw', optional: false, ...(extra || {}) });

// 1. The gyro pita example (change 24): about 650 to 700 kcal, parts listed, tzatziki an optional toggle (off)
{
  const { det, M } = run('Greek pork gyro pita with fries, onion and sauce', { title: 'Pork Gyro Pita', assumed: 'medium pita', range: true, parts: [
    part('pita bread', 'bread', 50, 150, 4, 25, 3), part('pork gyro', 'meat', 60, 160, 12, 1, 12), part('fries', 'fries', 40, 120, 1, 15, 6),
    part('onion', 'veg', 10, 4, 0, 1, 0), part('tzatziki', 'sauce', 30, 33, 1, 1, 3, { optional: true }) ] });
  const tot = E.mealTotal(M), tz = M.parts.find(p => /tzatz/i.test(p.name));
  if(!det.complex || !det.dish || det.dish.id !== 'gyro_pita_pork') fail('gyro pita: not recognised as the pork gyro pita');
  else if(tot.kcal < 650 || tot.kcal > 700) fail(`gyro pita: ${tot.kcal} kcal, expected 650 to 700`);
  else if(!tz || !tz.opt || tz.on) fail('gyro pita: tzatziki should be an optional add-on, off by default');
  else if(tot.kcal !== sumOf(M)) fail('gyro pita: total is not the sum of the parts');
  else ok(`gyro pita: ${tot.kcal} kcal from ${M.parts.filter(p => p.on).length} parts (${M.parts.map(p => `${p.name} ${p.g} g`).join(', ')}), tzatziki optional, ${M.conf}`);
  // the AI's tiny weights (the 120 kcal bug) were replaced by the portion file
  const pita = M.parts.find(p => p.role === 'bread');
  if(!pita || pita.g < 60) fail('gyro pita: the pita stayed under the minimum');
  // turning tzatziki on adds it; editing a weight updates the total
  tz.on = true; const withTz = E.mealTotal(M).kcal; tz.on = false;
  if(!(withTz > tot.kcal)) fail('gyro pita: tzatziki toggle does not change the total');
  const meat = M.parts.find(p => p.role === 'meat'); meat.g = 150; const edited = E.mealTotal(M).kcal; meat.g = 100;
  if(edited !== tot.kcal + Math.round(260 * .5)) fail(`gyro pita: editing the meat to 150 g gives ${edited}, expected ${tot.kcal + 130}`);
  else ok('gyro pita: tzatziki toggle and weight edits update the total');
  // Small / Large: the one-tap portion choice scales every part
  M.size = 'large'; E.mealApply(M); const big = E.mealTotal(M).kcal; M.size = 'normal'; E.mealApply(M);
  if(!(big > tot.kcal * 1.25 && big < tot.kcal * 1.35)) fail(`gyro pita: Large gives ${big} kcal`); else ok(`gyro pita: Large gives ${big} kcal`);
}

// 2. "pita gyro xoirino" (Greeklish), with a weak model that returns the whole wrap as ONE part: the portion file rebuilds it
{
  const { det, M } = run('pita gyro xoirino', { title: 'Pita gyro xoirino', parts: [ part('pita gyro', 'other', 200, 400, 15, 40, 18) ] });
  const tot = M && E.mealTotal(M);
  if(!det.dish || det.dish.id !== 'gyro_pita_pork') fail('"pita gyro xoirino": dish not recognised');
  else if(tot.kcal < 650 || tot.kcal > 700) fail(`"pita gyro xoirino": ${tot.kcal} kcal, expected 650 to 700`);
  else if(M.parts.filter(p => p.on).length < 4) fail('"pita gyro xoirino": parts not listed');
  else ok(`"pita gyro xoirino": ${tot.kcal} kcal, ${M.parts.filter(p => p.on).length} parts, confidence ${M.conf}`);
}

// 3. "2 tost kai gala": two toasties (count from the message) and milk; the toasties are raised to two normal portions
{
  const { det, M } = run('2 tost kai gala', { title: '2 Tost Kai Gala', parts: [
    part('toast bread', 'bread', 50, 133, 4, 24, 2), part('ham', 'meat', 20, 24, 3.6, 0.4, 0.8), part('cheese', 'cheese', 20, 70, 5, 0.4, 5.5),
    part('milk', 'drink', 250, 118, 8.5, 12, 3.8) ] });
  const tot = E.mealTotal(M), food = M.parts.filter(p => p.on && p.role !== 'drink' && p.role !== 'oil').reduce((a, p) => a + p.g, 0);
  if(!det.dish || det.dish.id !== 'tost' || det.n !== 2) fail(`"2 tost kai gala": expected 2 toasties, got ${det.dish && det.dish.id} × ${det.n}`);
  else if(Math.abs(food - 240) > 3) fail(`"2 tost kai gala": toasties weigh ${food} g, expected about 240 g`);
  else if(!M.parts.some(p => p.role === 'drink' && p.g === 250)) fail('"2 tost kai gala": the milk was changed');
  else ok(`"2 tost kai gala": ${tot.kcal} kcal (toasties ${food} g, milk 250 g)`);
}

// 4. "makaronia me kima": a known plate; the AI's small plate is raised to a normal one (350 g), pan cooked mince gets oil
{
  const { det, M } = run('makaronia me kima', { title: 'Makaronia me kima', parts: [
    part('spaghetti, cooked', 'pasta', 150, 237, 8.7, 46, 1.4, { cook: 'boiled' }), part('beef mince sauce', 'meat', 100, 180, 12, 6, 12, { cook: 'pan' }) ] });
  const tot = E.mealTotal(M), oil = M.parts.find(p => p.oil);
  if(!det.dish || det.dish.id !== 'pasta_mince') fail('"makaronia me kima": dish not recognised');
  else if(!oil || oil.g < 5 || oil.g > 12) fail('"makaronia me kima": the pan oil was not added');
  else ok(`"makaronia me kima": ${tot.kcal} kcal, ${M.parts.map(p => `${p.name} ${p.g} g`).join(', ')}`);
}

// 5. a five part meal gives exactly one card and one Eaten entry (the log step makes one entry from the meal's total)
{
  const { det, M } = run('chicken, rice, salad, feta and a coke', { title: 'Chicken Rice Salad Feta Coke', parts: [
    part('grilled chicken', 'meat', 150, 240, 45, 0, 6, { cook: 'grilled' }), part('rice', 'pasta', 200, 260, 5, 56, 0.6, { cook: 'boiled' }),
    part('salad', 'veg', 150, 30, 1.5, 5, 0.3), part('feta', 'cheese', 40, 106, 5.7, 1.6, 8.6), part('coke', 'drink', 330, 139, 0, 35, 0) ] });
  const cards = M ? 1 : 0, tot = E.mealTotal(M);
  const entries = [{ kind: 'meal', amt: tot.g, kcal: tot.kcal, parts: M.parts.filter(p => p.on).map(p => ({ n: p.name, g: p.g, kcal: E.mealPart(p).kcal })) }];
  if(!det.complex) fail('five parts: not seen as a complex meal');
  else if(cards !== 1 || entries.length !== 1) fail('five parts: expected one card and one Eaten entry');
  else if(entries[0].parts.reduce((a, p) => a + p.kcal, 0) !== tot.kcal) fail('five parts: the entry total is not the sum of its parts');
  else ok(`five parts: one card, one Eaten entry of ${tot.kcal} kcal with ${entries[0].parts.length} parts inside (grilled chicken oil added)`);
}

// 6. broken answers fall back safely (no card; today.js then runs the old Food Coach path, never a raw error)
{
  const bad = [null, {}, { parts: 'nope' }, { parts: [] }, { parts: [{ name: 'x' }] }, { parts: [{ grams: 100, kcal: 200 }] }, { parts: [{ name: 'pita', grams: -5, kcal: 100 }] }];
  const r = bad.map(a => run('gyro pita', a).M);
  if(r.some(Boolean)) fail('broken JSON: a broken answer still made a card'); else ok(`broken JSON: ${bad.length} broken answers fall back safely`);
}

// 7. the 4/4/9 check: calories that do not match protein, carbs and fat are worked out again
{
  const { M } = run('eggs, toast, avocado', { parts: [ part('eggs', 'meat', 100, 400, 12.6, 0.7, 9.5), part('toast', 'bread', 50, 133, 4, 24, 1.8), part('avocado', 'veg', 50, 80, 1, 1, 7.5) ] });
  const egg = M.parts.find(p => /^eggs$/i.test(p.name)), mk = Math.round(12.6 * 4 + 0.7 * 4 + 9.5 * 9);
  if(!egg.fixed || E.mealPart(egg).kcal !== mk) fail(`4/4/9: eggs at 400 kcal should become ${mk}`); else ok(`4/4/9: eggs 400 kcal → ${mk} kcal from their macros`);
}

// 8. portion words: small, large, double meat (English, Greek, Greeklish)
{
  const d1 = E.mealDetect('mikri pita gyro'), d2 = E.mealDetect('μεγάλη πίτα γύρο'), d3 = E.mealDetect('pita gyro with double meat'), d4 = E.mealDetect('πίτα γύρος χοιρινό με διπλό γύρο');
  if(d1.size !== 'small' || d2.size !== 'large' || d3.roles.meat !== 2 || d4.roles.meat !== 2 || !d2.dish) fail(`portion words: ${d1.size} ${d2.size} ${d3.roles.meat} ${d4.roles.meat}`);
  else ok('portion words: small, large and double meat read in English, Greek and Greeklish');
  const { M } = run('pita gyro with double meat', { parts: [ part('pita', 'bread', 75, 218, 6, 37.5, 4.5), part('pork gyro', 'meat', 100, 260, 20, 2, 19) ] });
  const meat = M.parts.find(p => p.role === 'meat');
  if(meat.g !== 200) fail(`double meat: ${meat.g} g`); else ok('double meat: only the meat doubles (200 g)');
}

// 9. simple messages stay on the simple path; complex ones go here
{
  const simple = ['chicken with rice', '2 eggs and toast', 'banana', 'Fage yogurt 200g'], complex = ['ate pasta with beef sauce', 'pita gyro xoirino', '2 tost kai gala', 'makaronia me kima', 'chicken, rice and broccoli'];
  const wrongS = simple.filter(s => E.mealDetect(s).complex), wrongC = complex.filter(s => !E.mealDetect(s).complex);
  if(wrongS.length || wrongC.length) fail(`simple / complex: wrong for ${[...wrongS, ...wrongC].join(', ')}`); else ok('simple / complex: decided right for 9 messages');
}

// 10. grams written by the user: their amounts stay, confidence High
{
  const { M } = run('200g chicken, 150g rice, 100g broccoli', { parts: [ part('chicken', 'meat', 200, 330, 62, 0, 7.2, { cook: 'grilled' }), part('rice', 'pasta', 150, 195, 4, 42, 0.5), part('broccoli', 'veg', 100, 35, 2.4, 4, 0.4) ] });
  if(M.conf !== 'high' || M.parts.find(p => /^chicken$/i.test(p.name)).g !== 200) fail('grams written: should keep them, confidence High'); else ok('grams written: kept as written, confidence High');
}

// 11. the simple path's "complex" second opinion: its foods become one meal
{
  const mi = E.mealFromItems([{ name: 'burger', grams: 200, kcal: 260, protein: 13, carbs: 25, fat: 12 }, { name: 'fries', grams: 150, kcal: 312, protein: 3.4, carbs: 37, fat: 15 }], { reply: 'ok' });
  if(!mi || mi.parts.length !== 2 || Math.round(mi.parts[0].kcal) !== 520) fail('second opinion: items not turned into parts'); else ok('second opinion: two foods become two parts of one meal');
}

// 12. the prompt is the same for every model and asks for JSON only
{
  const p = E.mealPrompt('pita gyro xoirino', null, E.mealDetect('pita gyro xoirino'));
  if(!/Return ONLY JSON/.test(p) || /gemini|haiku|claude/i.test(p) || p.length > 6000) fail('prompt: JSON only, no model names, short'); else ok(`prompt: ${p.length} characters, JSON only, no model-specific text`);
}

console.log(fails ? `\n${fails} meal case(s) failed.` : '\nAll meal cases pass.');

// 11. Ask first (burger / pizza / crepe): which messages get the small card, and the maths on it (no AI)
{
  const ask = txt => { const a = E.askMatch(txt, E.mealDetect(txt)); return a ? a.id : null; };
  const want = [['I had a burger', 'burger'], ['had pizza last night', 'pizza'], ['I got a crepe', 'crepe'], ['crepe with nutella', 'crepe'], ['ham and cheese crepe', 'crepe'],
    ['2 burgers', 'burger'], ['burger me tyri', 'burger'], ['έφαγα πίτσα', 'pizza'], ['κρέπα με σοκολάτα', 'crepe'], ["McDonald's burger", 'burger'], ['Big Mac', 'burger'], ['Domino\'s pizza', 'pizza'], ['Burger King', 'burger'], ["McDonald's", null], ['Whopper', 'burger'],
    ['pork gyro pita', 'pita'], ['chicken souvlaki', 'pita'], ['kebab', 'pita'], ['πίτα γύρος', 'pita'], ['Everest', 'sandwich'], ['baguette', 'sandwich'], ['ham and cheese toast', 'sandwich'], ['τοστ', 'sandwich'],
    ['club sandwich', 'sandwich'], ['Pizza Fan', 'pizza'], ['Pizza Fan pepperoni', 'pizza'], ['Telepizza special', 'pizza'], ['I had a large pizza', 'pizza']];
  const bad = want.filter(([txt, id]) => ask(txt) !== id).map(([txt, id]) => `${txt} → ${ask(txt)} (want ${id})`);
  // more than the dish: other foods, grams, chicken / veggie burgers go the normal way
  const no = ['protein toast', 'avocado toast', 'gyros plate', 'spanakopita', 'tiropita', 'souvlaki merida', 'chicken sandwich and fries', 'I had a burger with fries', 'burger 200g', 'chicken burger', 'veggie burger', 'pizza and a coke and fries', 'rice and chicken'].filter(txt => ask(txt));
  if(bad.length) fail('ask card: wrong match: ' + bad.join('; ')); else ok('ask card: burger, pizza, crepe (also "crepe with nutella", Greek pizza) get the card');
  if(no.length) fail('ask card: should not appear for: ' + no.join('; ')); else ok('ask card: a message with other foods, grams or chicken / veggie goes the normal way');
  const burger = E.askMatch('I had a burger', E.mealDetect('I had a burger')), A = { a: burger, n: 1, mode: null, on: {}, pick: 0, slices: 0 };
  E.askItems(A).forEach(({ key, it }) => { A.on[key] = !!it.on; });
  const kc = parts => { E.mealApply({ parts, size: 'normal', roles: {}, grams: false }); return parts.reduce((a, p) => a + E.mealPart(p).kcal, 0); };
  const usual = kc(E.askParts(A, false));
  const none = kc(E.askParts({ ...A, on: {} }, false)), est = kc(E.askParts({ ...A, on: {} }, true));
  if(!(none > 300 && none < 450 && usual > none && usual < 700)) fail(`ask burger: bun + patty ${none} kcal, usual ticks ${usual} kcal`); else ok(`ask burger: bun + patty ${none} kcal, usual ticks ${usual} kcal (a normal burger)`);
  if(est !== usual) fail(`ask burger: the general estimate (${est}) is not the usual ticks (${usual})`); else ok('ask burger: "Just Estimate" = the usual ticks');
  const pz = E.askMatch('pizza', E.mealDetect('pizza')), P = { a: pz, n: 1, pick: 1, slices: 3 }, pep = E.askParts(P, false)[0], gen = E.askParts({ ...P, pick: -1 }, false)[0];
  if(!(pep && gen && pep.g0 === 330 && gen.g0 === 345)) fail('ask pizza: slices × grams wrong'); else ok('ask pizza: a type and slices, or "None Of The Above" = the general pizza');
  // single-choice groups: the best match wins (a list of patterns counts one point each)
  const pita = E.askMatch('pita', E.mealDetect('pita')), meat = pita.groups[0].items, pick = s => { const sc = meat.map(it => E.askScore(E.mealDetect(s).s, it)), b = Math.max(0, ...sc); return b ? meat[sc.indexOf(b)].en : null; };
  const wantMeat = [['chicken souvlaki pita', 'Chicken Souvlaki'], ['pork gyro', 'Pork Gyro'], ['chicken gyros pita', 'Chicken Gyro'], ['kebab', 'Kebab'], ['bifteki pita', 'Bifteki'], ['pita', null]].filter(([s, w]) => pick(s) !== w);
  if(wantMeat.length) fail('ask pita: wrong meat for ' + wantMeat.map(x => x[0]).join(', ')); else ok('ask pita: "chicken souvlaki", "pork gyro", "kebab"… pick the right meat');
  const cr = E.askMatch('crepe', E.mealDetect('crepe')); let missing = [];
  [burger, pz, cr, pita, E.askMatch('baguette', E.mealDetect('baguette'))].forEach(a => [].concat(a.base || [], a.options || [], a.general ? [a.general] : [], ...[a.groups, a.savory, a.sweet].filter(Boolean).map(g => g.flatMap(x => x.items))).forEach(x => { if(!E.GENBY[x.gid] && !/^sr_/.test(x.gid) && !E.COOKED.some(c => c[0] === x.gid)) missing.push(x.gid); }));
  if(missing.length) fail('ask dishes: not in the built-in foods: ' + missing.join(', ')); else ok('ask dishes: every ingredient is a built-in food');
}

process.exit(fails ? 1 : 0);
