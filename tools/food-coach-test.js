#!/usr/bin/env node
// Food Coach 2.0 benchmark (offline, no AI, no browser): reading meals, corrections, quick answers, value checks, context, memory,
// food matching, and the built-in nutrition values against reference values (USDA FoodData Central, per 100 g).
// Run from the repo root:  node tools/food-coach-test.js      (tools/check.js runs it). Exit code 1 = a case failed.
// The live chat path (cards, Add, quota, restart) is tools/food-coach-e2e.js (browser, fake Gemini).

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let pass = 0, fails = 0;
const ok = () => { pass++; };
const fail = m => { fails++; console.log('FAIL  ' + m); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- load: norm() + FoodCoach + the matching helpers from today.js + the built-in foods ----
const mem = {};
const ctx = { console, Date, Math, JSON,
  Store: { load: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), save: (k, v) => { if (v == null) delete mem[k]; else mem[k] = JSON.parse(JSON.stringify(v)); return true; } } };
vm.createContext(ctx);
vm.runInContext(read('js/core.js').match(/function norm\(s\)\{[^\n]*\}/)[0] + '\n' + read('js/food-coach.js') + ';this.F = FoodCoach;', ctx);
const today = read('js/today.js');
const drop = today.match(/^const logQDrop = [^\n]*$/m)[0], key = today.match(/^function logQKey\(s\)[^\n]*$/m)[0];
const block = today.slice(today.indexOf('const LOGQ_DESCW'), today.indexOf('const logQEstData'));
vm.runInContext(drop + '\n' + key + '\n' + block + '\n;this.M = { logQSame, logQTight, logQCovers, logQKey };', ctx);
vm.runInContext(read('js/data/foods.js') + '\n' + read('js/data/foods-more.js') + ';this.GEN = [...GEN_RAW, ...GEN_MORE, ...(typeof GEN_067 !== "undefined" ? GEN_067 : [])];', ctx);
const F = ctx.F, M = ctx.M;
const GEN = Object.fromEntries(ctx.GEN.map(r => [r[0], { gid: r[0], en: r[1], el: r[2], kcal: r[8], protein: r[9], carbs: r[10], fat: r[11] }]));

// ---- 1. reading a meal message (no AI). [message, [[name, qty, unit, stated?, state?], ...]] ----
// name: lower-case words that must be in the food's name; qty/unit as written (g/ml already multiplied out); null = not written
const P = [
  // the brief's example, and English everyday meals
  ['Had 250g chicken breast in tomato sauce, a white chocolate Snickers protein bar with 20g protein, and one protein toast.',
    [['chicken breast', 250, 'g'], ['tomato sauce', null, null], ['snickers protein bar', 1, 'piece', { protein: 20 }], ['protein toast', 1, 'piece']]],
  ['I ate chicken and rice after the gym. Was that a good meal?', [['chicken', null, null], ['rice', null, null]]],
  ['2 eggs, 1 slice of bread and a glass of milk', [['eggs', 2, 'piece'], ['bread', 1, 'slice'], ['milk', 250, 'ml']]],
  ['200 g cooked rice', [['cooked rice', 200, 'g', null, 'cooked']]],
  ['150g raw chicken breast', [['chicken breast', 150, 'g', null, 'raw']]],
  ['100g dry oats with 300ml milk', [['oats', 100, 'g', null, 'raw'], ['milk', 300, 'ml']]],
  ['a banana', [['banana', 1, 'piece']]],
  ['half an avocado', [['avocado', 0.5, 'piece']]],
  ['two slices of pizza', [['pizza', 2, 'slice']]],
  ['x2 bananas', [['bananas', 2, 'piece']]],
  ['3 x eggs', [['eggs', 3, 'piece']]],
  ['1 scoop whey', [['whey', 1, 'piece']]],
  ['protein shake 1 scoop', [['protein shake', 1, 'piece']]],
  ['a can of coke', [['coke', 330, 'ml']]],
  ['330ml coke zero', [['coke zero', 330, 'ml']]],
  ['a bottle of water', [['water', 500, 'ml']]],
  ['1.5 l water', [['water', 1500, 'ml']]],
  ['1kg watermelon', [['watermelon', 1000, 'g']]],
  ['2 tbsp peanut butter', [['peanut butter', 2, 'tbsp']]],
  ['1 tsp honey', [['honey', 1, 'tsp']]],
  ['a cup of coffee', [['coffee', 1, 'cup']]],
  ['one bowl of cereal', [['cereal', 1, 'serving']]],
  ['a plate of pasta bolognese', [['pasta bolognese', 1, 'serving']]],
  ['a portion of fries', [['fries', 1, 'serving']]],
  ['8oz steak', [['steak', 226.8, 'g']]],
  ['mac and cheese', [['mac and cheese', null, null]]],
  ['fish & chips, 330ml coke', [['fish & chips', null, null], ['coke', 330, 'ml']]],
  ['salt and pepper chicken', [['salt and pepper chicken', null, null]]],
  ['a Fage 2% yogurt 200g with honey', [['fage 2% yogurt', 200, 'g'], ['honey', null, null]]],
  ['oats for breakfast', [['oats', null, null]]],
  ['chicken salad for lunch', [['chicken salad', null, null]]],
  ['just had a big mac', [['big mac', 1, 'piece']]],
  ['burger, fries + coke', [['burger', null, null], ['fries', null, null], ['coke', null, null]]],
  ['steak with potatoes', [['steak', null, null], ['potatoes', null, null]]],
  ['pancakes with maple syrup', [['pancakes', null, null], ['maple syrup', null, null]]],
  ['a protein bar with 30 g of protein', [['protein bar', 1, 'piece', { protein: 30 }]]],
  ['protein bar, 20g protein', [['protein bar', null, null, { protein: 20 }]]],
  ['a 300 kcal sandwich', [['sandwich', 1, 'piece', { kcal: 300 }]]],
  ['greek yogurt 170g, granola 40g, 1 banana', [['greek yogurt', 170, 'g'], ['granola', 40, 'g'], ['banana', 1, 'piece']]],
  ['grilled salmon 180g\nboiled potatoes 200g', [['grilled salmon', 180, 'g', null, 'cooked'], ['boiled potatoes', 200, 'g', null, 'cooked']]],
  ['ate 3 boiled eggs', [['boiled eggs', 3, 'piece', null, 'cooked']]],
  ['tuna can in water', [['tuna can in water', null, null]]],   // a tuna can is not a drink can
  ['50g almonds and an apple', [['almonds', 50, 'g'], ['apple', 1, 'piece']]],
  ['two pieces of chicken', [['chicken', 2, 'piece']]],
  ['Is fruit sugar bad?', []],
  ['How much protein should I eat?', []],
  // Greek
  ['Έφαγα 200γρ κοτόπουλο με ρύζι', [['κοτόπουλο', 200, 'g'], ['ρύζι', null, null]]],
  ['3 αυγά και μια φέτα ψωμί', [['αυγά', 3, 'piece'], ['ψωμί', 1, 'slice']]],
  ['κοτόπουλο μετά το γυμναστήριο', [['κοτόπουλο', null, null]]],
  ['ένα γιαούρτι 200 γρ', [['γιαούρτι', 200, 'g']]],
  ['δύο σουβλάκια', [['σουβλάκια', 2, 'piece']]],
  ['μισό αβοκάντο', [['αβοκάντο', 0.5, 'piece']]],
  ['ένα ποτήρι γάλα', [['γάλα', 250, 'ml']]],
  ['μια μερίδα μουσακά', [['μουσακά', 1, 'serving']]],
  ['ήπια έναν φρέντο εσπρέσο', [['φρέντο εσπρέσο', null, null]]],
  ['150 γραμμάρια φακές', [['φακές', 150, 'g']]],
  ['ψητό σολομό 180γρ', [['σολομό', 180, 'g', null, 'cooked']]],
  ['μια μπάρα πρωτεΐνης με 20γρ πρωτεΐνη', [['μπάρα πρωτεΐνης', 1, 'piece', { protein: 20 }]]],
  ['2 κουταλιές μέλι', [['μέλι', 2, 'tbsp']]],
  ['1 κιλό καρπούζι', [['καρπούζι', 1000, 'g']]],
  ['φέτα 50γρ', [['φέτα', 50, 'g']]],
  ['ελιές, ντομάτα και φέτα', [['ελιές', null, null], ['ντομάτα', null, null], ['φέτα', null, null]]],
  ['ωμό στήθος κοτόπουλο 200 γρ', [['στήθος κοτόπουλο', 200, 'g', null, 'raw']]],
  ['Έφαγα μακαρονάδα για μεσημεριανό', [['μακαρονάδα', null, null]]],
  // Greeklish + mixed
  ['kotopoulo me ryzi', [['kotopoulo', null, null], ['ryzi', null, null]]],
  ['2 tost kai ena gala', [['tost', 2, 'piece'], ['gala', 1, 'piece']]],
  ['200g κοτόπουλο and rice', [['κοτόπουλο', 200, 'g'], ['rice', null, null]]],
  ['freddo espresso και ένα κρουασάν', [['freddo espresso', null, null], ['κρουασάν', 1, 'piece']]],
  // 0.8 (24 Nov): Greek units attached or not, "γρ." is not the end of a sentence, filler words are never foods
  ['250γ κιμάς μοσχάρι και 250γ μακαρόνια', [['κιμάς μοσχάρι', 250, 'g'], ['μακαρόνια', 250, 'g']]],
  ['250 γρ. κιμά', [['κιμά', 250, 'g']]],
  ['300 γραμμάρια κοτόπουλο και 1 κιλό ρύζι', [['κοτόπουλο', 300, 'g'], ['ρύζι', 1000, 'g']]],
  ['χθες παρήγγειλα ένα πιάτο μακαρόνια με λίγες πατάτες τηγανητές', [['μακαρόνια', 1, 'serving'], ['πατάτες τηγανητές', null, null]]],
];
const ext = { items: 0, names: 0, qty: 0 };
P.forEach(([msg, want]) => {
  const got = F.parse(msg);
  if (got.length !== want.length) { fail(`parse "${msg}": ${got.length} foods ${JSON.stringify(got.map(x => x.name))}, want ${want.length}`); ext.items += want.length; return; }
  let bad = '';
  want.forEach(([nm, q, u, st, cook], i) => { const g = got[i]; ext.items++;
    const n = ctx.norm(g.name), nameOk = ctx.norm(nm).split(' ').every(w => n.includes(w));
    const qOk = (q == null ? g.qty == null : Math.abs(g.qty - q) < .01) && (u == null ? g.unit == null : g.unit === u);
    if (nameOk) ext.names++; else bad += ` name[${i}] "${g.name}"≠"${nm}"`;
    if (qOk) ext.qty++; else bad += ` qty[${i}] ${g.qty} ${g.unit}≠${q} ${u}`;
    if (st && !eq(g.stated, st)) bad += ` stated[${i}] ${JSON.stringify(g.stated)}`;
    if (!st && g.stated) bad += ` stated[${i}] should be none`;
    if (cook && g.state !== cook) bad += ` state[${i}] "${g.state}"≠"${cook}"`; });
  if (got.some(g => !g.text)) bad += ' (original words lost)';
  bad ? fail(`parse "${msg}":${bad}`) : ok();
});
{ const s = 'Had 250g chicken, rice'; const copy = s; F.parse(s); s === copy ? ok() : fail('parse changed the message'); }

// ---- 2. small corrections to the list on screen. [rows, message, want | null] ----
const R4 = [{ name: 'Chicken breast, cooked', text: '250g chicken breast' }, { name: 'Tomato sauce', text: 'tomato sauce' }, { name: 'White chocolate protein bar', text: 'white chocolate Snickers protein bar' }, { name: 'Protein toast', text: 'one protein toast', counted: true }];
const R1 = [{ name: 'Rice, cooked', text: 'rice' }], RE = [{ name: 'Egg, whole', text: '2 eggs', counted: true }];
const RG = [{ name: 'Κοτόπουλο ψητό', text: 'κοτόπουλο' }, { name: 'Ρύζι', text: 'ρύζι' }, { name: 'Τοστ', text: 'τοστ', counted: true }];
const C = [
  [R4, 'actually make the chicken 200g', { type: 'set', i: 0, qty: 200, unit: 'g' }],
  [R4, 'make the chicken 200 g', { type: 'set', i: 0, qty: 200, unit: 'g' }],
  [R4, 'the chicken was 300g', { type: 'set', i: 0, qty: 300, unit: 'g' }],
  [R4, 'no, chicken 180g', { type: 'set', i: 0, qty: 180, unit: 'g' }],
  [R4, 'make it 200g', null],   // four rows: unclear → the AI decides
  [R4, 'add another toast', { type: 'inc', i: 3, n: 1 }],
  [R4, 'one more protein bar', { type: 'inc', i: 2, n: 1 }],
  [R4, '2 more toasts', { type: 'inc', i: 3, n: 2 }],
  [R4, 'an extra toast', { type: 'inc', i: 3, n: 1 }],
  [R4, 'remove the bar', { type: 'remove', i: 2 }],
  [R4, 'delete the tomato sauce', { type: 'remove', i: 1 }],
  [R4, 'drop the toast', { type: 'remove', i: 3 }],
  [R4, 'remove the pizza', null],   // not on the list
  [R4, 'another coffee', null],   // a new food, not a change
  [R4, 'I meant cooked chicken', { type: 'state', i: 0, state: 'cooked' }],
  [R4, 'the chicken was raw', null],   // no number, not a fix word first → AI
  [R4, 'What about the protein bar?', null],
  [R4, 'how much protein was that?', null],
  [R4, 'had 2 eggs too', null],
  [R1, 'make it 200g', { type: 'set', i: 0, qty: 200, unit: 'g' }],
  [R1, '300g', { type: 'set', i: 0, qty: 300, unit: 'g' }],
  [R1, 'actually 1.5 kg', { type: 'set', i: 0, qty: 1500, unit: 'g' }],
  [R1, 'it was 250 grams', { type: 'set', i: 0, qty: 250, unit: 'g' }],
  [R1, 'actually 9000g', null],   // not believable
  [RE, 'actually 3', { type: 'set', i: 0, qty: 3, unit: 'piece' }],
  [RE, 'one more egg', { type: 'inc', i: 0, n: 1 }],
  [R1, 'actually 3', null],   // a bare number on a row weighed in grams is unclear
  [RG, 'κάνε το κοτόπουλο 200γρ', { type: 'set', i: 0, qty: 200, unit: 'g' }],
  [RG, 'ακόμα ένα τοστ', { type: 'inc', i: 2, n: 1 }],
  [RG, 'βγάλε το ρύζι', { type: 'remove', i: 1 }],
  [RG, 'όχι, το ρύζι ήταν 150 γρ', { type: 'set', i: 1, qty: 150, unit: 'g' }],
  [[], 'make it 200g', null],
];
C.forEach(([rows, msg, want]) => { const got = F.correction(msg, rows); eq(got, want) ? ok() : fail(`correction "${msg}": ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); });

// ---- 3. answered without AI ----
const Q = [
  ['thanks!', { kind: 'thanks' }], ['Thank you', { kind: 'thanks' }], ['ευχαριστώ πολύ', { kind: 'thanks' }], ['hi', { kind: 'hi' }], ['Καλημέρα', { kind: 'hi' }],
  ['how much protein was that?', { kind: 'last', key: 'p' }], ['How many calories was that', { kind: 'last', key: 'kcal' }], ['what was the fat in that?', { kind: 'last', key: 'f' }],
  ['πόση πρωτεΐνη είχε αυτό;', { kind: 'last', key: 'p' }], ['how much protein today?', { kind: 'today', key: 'p' }], ['how many calories do I have left', { kind: 'today', key: 'kcal' }],
  ['πόσες θερμίδες σήμερα;', { kind: 'today', key: 'kcal' }], ['how much protein is in an egg?', null], ['was that enough for today?', null], ['thanks, and 2 eggs', null],
  ['hi, I had pasta', null], ['what should I eat?', null],
];
Q.forEach(([msg, want]) => { const got = F.quick(msg); eq(got, want) ? ok() : fail(`quick "${msg}": ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); });
// a clear "what should I eat?" goes straight to the one suggestion request; anything that says what was eaten never does
[['What should I eat for dinner?', true], ['what can i have for a snack', true], ['any meal ideas?', true], ['suggest a dinner', true], ['Τι να φάω για βραδινό;', true], ['τι μπορώ να φάω τώρα', true],
 ['πρότεινέ μου κάτι να φάω', true], ['ti na fao', true], ['ti na faw gia mesimeri', true],
 ['I had chicken, what should I eat next?', false], ['έφαγα ένα σουβλάκι, τι να φάω μετά;', false], ['efaga souvlaki ti na fao', false], ['chicken and rice', false], ['is a gyro ok before the gym?', false], ['how much protein today?', false]]
  .forEach(([msg, want]) => { F.wantsIdeas(msg) === want ? ok() : fail(`wantsIdeas "${msg}": ${!want}, want ${want}`); });

// ---- 4. one food's values made consistent (replaces a second AI call); unknown stays unknown ----
const K = [
  [{ kcal: 165, protein: 31, carbs: 0, fat: 3.6, grams: 200 }, '', x => x.kcal === 165],
  [{ kcal: null, protein: 31, carbs: 0, fat: 3.6 }, 'kcal from macros', x => x.kcal === 156],
  [{ kcal: 2000, protein: 10, carbs: 10, fat: 10 }, 'kcal above pure fat', x => x.kcal === null],
  [{ kcal: 400, protein: 60, carbs: 50, fat: 10 }, 'macros above 100 g per 100 g', () => true],
  [{ kcal: 500, protein: 10, carbs: 10, fat: 5 }, 'kcal and macros disagree', () => true],
  [{ kcal: 30, protein: 0, carbs: 0, fat: 0, ml: true }, '', () => true],   // a drink: no macro check
  [{ kcal: 250, protein: null, carbs: null, fat: null }, 'macros unknown', x => x.protein === null],   // never 0
  [{ kcal: 165, protein: 31, carbs: 0, fat: 3.6, grams: 9000 }, 'amount too large', x => x.grams === null],
  [{ kcal: 100, protein: 5, carbs: 15, fat: 2, grams: 200, total: 600 }, 'total disagrees with per 100 g', () => true],
  [{ kcal: 100, protein: 5, carbs: 15, fat: 2, grams: 200, total: 210 }, '', () => true],
  [{ kcal: 380, protein: 35, carbs: 35, fat: 14, grams: 57, stated: { protein: 20 } }, '', x => Math.abs(x.protein - 35.1) < .2],
  [{ kcal: -5, protein: 'x', carbs: 3, fat: 1 }, '', x => x.kcal === null && x.protein === null],
  [{ kcal: '120', protein: '20', carbs: '2', fat: '3' }, '', x => x.kcal === 120 && x.protein === 20],
];
K.forEach(([inp, doubt, test], i) => { const r = F.check(inp); (r.doubt === doubt && test(r.item)) ? ok() : fail(`check #${i}: doubt "${r.doubt}" (want "${doubt}") ${JSON.stringify(r.item)}`); });
[[{ kcal: 100, protein: 1, carbs: 2, fat: 3 }, true], [{ kcal: null, protein: 1, carbs: 2, fat: 3 }, false], [{ kcal: 100, protein: null, carbs: null, fat: null }, false], [null, false]]
  .forEach(([x, w]) => (!!F.usable(x) === w ? ok() : fail(`usable ${JSON.stringify(x)} should be ${w}`)));

// ---- 5. food matching: the food you said, not one that merely contains your words ----
const T = [
  ['tomato sauce', 'Beef in tomato sauce (kokkinisto)', false], ['chicken breast', 'Chicken breast, skinless', true], ['grilled chicken breast', 'Grilled chicken breast', true],
  ['bread', 'Chicken breast, cooked', false], ['slice of bread', 'White bread', true], ['bread', 'White bread', true], ['eggs', 'Egg muffin (breakfast sandwich)', false],
  ['eggs', 'Egg, whole', true], ['rice', 'White rice, cooked', true], ['cooked rice', 'White rice, cooked', true], ['feta', 'Spicy feta dip (tirokafteri)', false], ['feta', 'Feta', true], ['ψωμί', 'Ψωμί λευκό', true], ['κοτόπουλο', 'Κοτόπουλο ψητό', true],
  ['salmon', 'Salmon fillet', false], ['salmon fillet', 'Salmon fillet', true], ['banana', 'Banana bread', false], ['banana', 'Banana, peeled', true],
];
T.forEach(([q, en, want]) => { const got = M.logQTight(q, { en, el: '' }); got === want ? ok() : fail(`match "${q}" ~ "${en}": ${got}, want ${want}`); });
[['egg', 'eggs', true], ['bread', 'breast', false], ['αυγό', 'αυγά', true], ['ψωμι', 'ψωμια', true], ['potato', 'potatoes', true], ['pasta', 'pastry', false], ['rice', 'ricotta', false]]
  .forEach(([a, b, w]) => (M.logQSame(ctx.norm(a), ctx.norm(b)) === w ? ok() : fail(`same word "${a}"/"${b}" should be ${w}`)));
(M.logQCovers('greek yogurt', { en: 'Greek yogurt 2%', el: 'Γιαούρτι στραγγιστό' }) ? ok() : fail('covers: greek yogurt'));
(!M.logQCovers('protein toast', { en: 'Toast bread, white', el: 'Ψωμί του τοστ' }) ? ok() : fail('covers: "protein toast" is not plain toast bread'));

// ---- 6. built-in nutrition against references (USDA FoodData Central, per 100 g): kcal within 8 %, protein within 1.5 g ----
const REF = { chicken_breast: [120, 22.5], chicken_grilled: [165, 31], rice_cooked: [130, 2.7], rice_white: [360, 6.6], egg: [143, 12.6], boiled_egg: [155, 12.6], oats: [379, 13.2],
  banana: [89, 1.1], olive_oil: [884, 0], feta: [264, 14.2], bread_white: [266, 8.9], salmon: [208, 20.4], pasta_cooked: [158, 5.8], pasta: [371, 13], lentils: [352, 24.6],
  milk_whole: [61, 3.2], potato: [77, 2], apple: [52, 0.3], almonds: [579, 21.2], tuna_water: [116, 25.5] };
let errSum = 0, errN = 0;
Object.entries(REF).forEach(([gid, [k, p]]) => { const g = GEN[gid]; if (!g) return fail(`reference: built-in food "${gid}" is missing`);
  const e = Math.abs(g.kcal - k) / k; errSum += e; errN++;
  (e <= .08 && Math.abs(g.protein - p) <= 1.5) ? ok() : fail(`reference ${gid}: ${g.kcal} kcal / ${g.protein} g protein, reference ${k} / ${p}`); });

// ---- 7. context: what the AI is told (incomplete logs stay "unknown", not a deficit; missing context is safe) ----
Object.assign(ctx, { curDay: '2026-11-22', todayKey: () => '2026-11-22', dayLog: { '2026-11-22': [{ time: '08:00', name: 'Eggs', amt: 120, unit: 'g', kcal: 180, p: 15, c: 1, f: 12 }, { time: '13:00', name: 'Olive oil', amt: 30, unit: 'g', kcal: 270, p: 0, c: 0, f: 30 }], '2026-11-21': [{ time: '12:00', name: 'Rice', amt: 100, unit: 'g', kcal: 130, p: 3, c: 28, f: 1 }] }, sessions: [{ date: '2026-11-22', end: 1 }],
  targetFor: () => ({ k: 2800, p: 180, c: 320, f: 80 }), dayTotals: () => ({ kcal: 900.4, p: 70.2, c: 80, f: 30 }), dayStatus: () => ({ type: 'gym', time: '18:00' }),
  AI: { dietRules: () => '\nFood rules: allergic to peanuts.', knows: () => '' } });
{ const c = F.context();
  [/training day \(workout done\)/, /may be incomplete/, /unknown, never a deficit/, /900 kcal, P 70 g/, /Targets: 2800 kcal, P 180 g/, /allergic to peanuts/].forEach(re => (re.test(c) ? ok() : fail(`context should say ${re}: ${c}`)));
  /Eggs 120 g: 180 kcal/.test(c) && /Olive oil 30 g/.test(c) && /NOT eaten/.test(c) && /Usual logged day \(average of 1 earlier/.test(c) ? ok() : fail('context should list the logged foods and the usual day: ' + c);
  c.length < 1500 ? ok() : fail(`context is ${c.length} characters (keep it short)`); }
ctx.AthleteContext = {}; { const c = F.context(); (!/training day/.test(c) && /may be incomplete/.test(c)) ? ok() : fail('with Athlete OS the schedule comes from it, not repeated: ' + c); } delete ctx.AthleteContext;
Object.assign(ctx, { dayLog: {}, targetFor: () => null, dayStatus: () => ({ type: 'rest', time: '' }) });
{ const c = F.context(); (/rest day/.test(c) && /Nothing logged yet .*unknown/.test(c) && !/Targets/.test(c)) ? ok() : fail('context without logs or targets: ' + c); }
Object.assign(ctx, { dayStatus: () => { throw new Error('not ready'); }, AI: undefined });
{ let c; try { c = F.context(); ok(); } catch (e) { fail('context must never throw when the app data is not ready'); } (typeof c === 'string') ? ok() : fail('context must still be text'); }

// ---- 8. chat memory and the answer-time log (this phone only) ----
F.chatSave([{ who: 'me', text: 'hi' }, { who: 'bot', text: 'Hey' }]);
(eq((F.chatLoad() || {}).msgs, [{ who: 'me', text: 'hi' }, { who: 'bot', text: 'Hey' }]) ? ok() : fail('chat memory: saved messages not loaded'));
F.chatSave(Array.from({ length: 120 }, (_, i) => ({ who: 'me', text: 'm' + i }))); (F.chatLoad().msgs.length === 200 || F.chatLoad().msgs.length === 120) && F.chatLoad().msgs[F.chatLoad().msgs.length - 1].text === 'm119' ? ok() : fail('chat memory keeps the newest messages');
F.chatSave(Array.from({ length: 260 }, (_, i) => ({ who: 'me', text: 'n' + i }))); (F.chatLoad().msgs.length === 200 && F.chatLoad().msgs[0].text === 'n60') ? ok() : fail('chat memory keeps the newest 200');
mem.coachChat.at = Date.now() - 8 * 864e5; (F.chatLoad() === null) ? ok() : fail('chat memory older than 7 days must not come back');
[['local', 20], ['local', 30], ['memory', 40], ['ai', 2500], ['ai', 3100], ['ai', 4200], ['offline', 300]].forEach(([p, ms]) => F.track(p, ms, p === 'ai' ? 1 : 0));
{ const s = F.stats(); (s.ai.n === 3 && s.ai.p50 === 3100 && s.ai.p95 === 4200 && s.local.callsPerAnswer === 0 && s.ai.callsPerAnswer === 1) ? ok() : fail('answer-time stats: ' + JSON.stringify(s)); }
F.chatClear(); ((F.chatLoad() || { msgs: [] }).msgs.length === 0 && F.stats().all.n === 7) ? ok() : fail('clearing the chat keeps the speed log only');
(!JSON.stringify(mem.coachChat || {}).includes('peanut')) ? ok() : fail('the speed log must hold no message text');

const pct = n => Math.round(n / ext.items * 1000) / 10;
// ---- 0.8: filler words, aliases, when / takeaway, chat vs log (FoodCoach.when, alias, isFiller, hasAmount) ----
['χθες', 'σήμερα', 'παρήγγειλα', 'έφαγα', 'ήπια', 'λίγο', 'πιάτο', 'με', 'και', 'yesterday', 'ordered', 'some', 'plate'].forEach(w => F.isFiller(w) ? ok() : fail('filler: ' + w));
[['μακαρόνια', 'pasta'], ['κιμάς μοσχάρι', 'beef mince'], ['ρύζι', 'rice'], ['κοτόπουλο', 'chicken'], ['πατάτες τηγανητές', 'fries'], ['γιαούρτι', 'yoghurt'], ['αυγά', 'eggs'], ['μακαρόνια με κιμά', null]]
  .forEach(([a, b]) => F.alias(a) === b ? ok() : fail(`alias ${a} → ${F.alias(a)} (want ${b})`));
[['χθες έφαγα ρύζι', -1, false], ['yesterday I ordered pizza', -1, true], ['παρήγγειλα σουβλάκια', 0, true], ['2 eggs', 0, false]]
  .forEach(([m, d, tk]) => { const w = F.when(m); w.day === d && w.takeaway === tk ? ok() : fail(`when "${m}": ${JSON.stringify(w)}`); });
[['how are you doing today', false], ['τι κάνεις;', false], ['250γ ρύζι', true], ['a slice of bread', true], ['δύο αυγά', true]]
  .forEach(([m, a]) => F.hasAmount(m) === a ? ok() : fail(`hasAmount "${m}" = ${F.hasAmount(m)}`));
console.log(`food coach: ${pass} ok, ${fails} failed · extraction ${pct(ext.names)} % names, ${pct(ext.qty)} % quantities over ${ext.items} foods in ${P.length} messages · built-in kcal error vs reference ${(errSum / errN * 100).toFixed(1)} % (n=${errN})`);
process.exit(fails ? 1 : 0);
