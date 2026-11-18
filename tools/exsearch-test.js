#!/usr/bin/env node
// Exercise search test list (Refinements change 16). Run:  node tools/exsearch-test.js   (tools/check.js runs it too)
// Each line: [what you type, a word one of the top 3 results must contain (its English name, lower case)].
// Lines marked TOP must have that exercise first. Every build must pass the whole list, and the average search must stay fast.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');

const TESTS = [
  // from change 16
  ['pec duck', 'pec deck', 'TOP'], ['pec deck', 'pec deck', 'TOP'], ['chest fly machine', 'pec deck', 'TOP'], ['machine fly', 'pec deck', 'TOP'],
  ['chest fly on the machine', 'pec deck', 'TOP'], ['pullup', 'pull-up', 'TOP'], ['pull up', 'pull-up', 'TOP'], ['pull-up', 'pull-up', 'TOP'],
  ['benchpress', 'bench press', 'TOP'], ['lat pull down', 'lat pulldown', 'TOP'], ['rdl', 'romanian deadlift', 'TOP'], ['skull crusher', 'skull crusher', 'TOP'],
  ['press bench', 'bench press', 'TOP'], ['bench presses', 'bench press', 'TOP'], ['lying triceps extension', 'skull crusher', 'TOP'], ['pulldown', 'lat pulldown'],
  // typos, spacing, short words
  ['skul crusher', 'skull crusher', 'TOP'], ['romanain deadlift', 'romanian deadlift', 'TOP'], ['dumbell curl', 'dumbbell curl', 'TOP'], ['db curl', 'dumbbell curl', 'TOP'],
  ['hammer curls', 'hammer curl', 'TOP'], ['legpress', 'leg press', 'TOP'], ['leg extention', 'leg extension', 'TOP'], ['chinup', 'chin-up', 'TOP'], ['chin up', 'chin-up', 'TOP'],
  ['butterfly', 'pec deck', 'TOP'], ['incline db press', 'incline dumbbell press', 'TOP'], ['bulgarian', 'bulgarian split squat', 'TOP'], ['latteral raise', 'lateral raise', 'TOP'],
  ['hip thrusts', 'hip thrust', 'TOP'], ['squat', 'squat'], ['bench', 'bench press'], ['ohp', 'overhead press', 'TOP'], ['face pul', 'face pull', 'TOP'],
  // Greek: with and without accents, upper case
  ['πιέσεις πάγκου', 'bench press', 'TOP'], ['πιεσεις παγκου', 'bench press', 'TOP'], ['ΠΙΈΣΕΙΣ ΠΆΓΚΟΥ', 'bench press', 'TOP'], ['έλξεις', 'pull-up', 'TOP'],
  ['ελξεις τροχαλιας', 'lat pulldown', 'TOP'], ['ρουμάνικες', 'romanian deadlift', 'TOP'], ['ΡΟΥΜΑΝΙΚΕΣ', 'romanian deadlift', 'TOP'], ['πεταλουδα', 'pec deck', 'TOP'],
  ['βυθισεις', 'dips'], ['σφυρια', 'hammer curl', 'TOP'], ['πρεσα ποδιων', 'leg press', 'TOP'], ['καθίσματα', 'squat', 'TOP'], ['κάμψεις με μπάρα', 'barbell curl', 'TOP'],
  // Greeklish
  ['elxeis', 'pull-up', 'TOP'], ['roumanikes', 'romanian deadlift', 'TOP'], ['piesis pagkou', 'bench press', 'TOP'], ['kathismata', 'squat', 'TOP'], ['presa podiwn', 'leg press', 'TOP'],
];
// "chest fly on the machine" must also show the pec deck somewhere in the list; Did You Mean must answer a word with no match
const EXTRA = [['chest fly on the machine', 'pec_deck', 12], ['cable fly', 'pec_deck', 12]];

function load(){
  const ctx = { console, Date }; vm.createContext(ctx);
  const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/^const /gm, 'var ').replace(/^let /gm, 'var ');
  const normSrc = (read('js/core.js').match(/function norm\(s\)\{[^\n]*\}/) || [])[0];
  vm.runInContext(normSrc + '\n' + read('js/data/gym.js') + '\n' + read('js/search.js') + '\n' + read('js/exsearch.js'), ctx);
  vm.runInContext(`var parseMu = s => { const o = {}; s.split(' ').forEach(p => { const [k, v] = p.split(':'); o[k] = +v; }); return o; };
    var LIST = LIB_RAW.map(([id, en, el, eq, p, mu]) => { const m_ = parseMu(mu), th = Object.entries(m_).sort((a, b) => b[1] - a[1])[0][0];
      return { id, en, el, al: ALSO[id] || [], e: EQ[eq], p, mu: m_, h: th, m: HEADS[th] ? HEADS[th][2] : 'other' }; });`, ctx);
  return ctx;
}

function run(){
  const ctx = load(), { ExSearch, LIST, norm } = ctx, bad = [];
  const q = (text, lang) => ExSearch.query(text, { list: LIST, lang: lang || 'en', sessions: [] });
  q('warm up');   // builds the index once, as when the picker first opens
  let ms = 0, n = 0;
  for(const [text, want, top] of TESTS){
    const t0 = process.hrtime.bigint(), r = q(text, /[α-ω]/i.test(text) ? 'el' : 'en'); ms += Number(process.hrtime.bigint() - t0) / 1e6; n++;
    const names = r.items.slice(0, 3).map(i => norm(i.x.en));
    const okTop = names.slice(0, top ? 1 : 3).some(nm => nm.includes(norm(want)));
    if(!okTop) bad.push(`"${text}": ${top ? 'first' : 'top 3'} should contain "${want}", got ${names.join(' | ') || 'nothing'}`);
  }
  for(const [text, id, within] of EXTRA){ const r = q(text); if(!r.items.slice(0, within).some(i => i.id === id)) bad.push(`"${text}": ${id} should be in the first ${within}`); }
  const d = q('xqzv'); if(d.items.length) bad.push('"xqzv" should find nothing');
  const y = q('pek dek'); if(!y.items.length || !y.items.slice(0, 3).some(i => i.id === 'pec_deck')) bad.push('"pek dek" should still find the pec deck');
  // bold letters: "pec duck" bolds the whole name, "bench" the first five letters of "Bench press"
  const b = q('bench').items.find(i => i.id === 'bench'); if(!b || JSON.stringify(b.ranges) !== '[[0,5]]') bad.push('"bench": bold letters should be [[0,5]] on "Bench press", got ' + JSON.stringify(b && b.ranges));
  const al = q('butterfly').items[0]; if(!al || !al.via || !/butterfly/i.test(al.via)) bad.push('"butterfly": the row should say it matched "butterfly"');
  // speed: a whole picker's worth of keystrokes
  const keys = ['p', 'pe', 'pec', 'pec ', 'pec d', 'pec du', 'pec duc', 'pec duck', 'b', 'be', 'ben', 'benc', 'bench', 'ρ', 'ρο', 'ρου', 'ρουμ', 'ρουμα'];
  const t1 = process.hrtime.bigint(); for(let i = 0; i < 5; i++) keys.forEach(k => q(k)); const per = Number(process.hrtime.bigint() - t1) / 1e6 / (keys.length * 5);
  return { bad, tests: n + EXTRA.length + 4, avg: ms / n, perKey: per };
}

if(require.main === module){
  const r = run(); r.bad.forEach(b => console.log('FAIL  ' + b));
  console.log(`${r.bad.length ? 'FAIL' : 'ok  '}  exercise search: ${r.tests} checks, ${r.bad.length} failed, average ${r.avg.toFixed(2)} ms per search, ${r.perKey.toFixed(2)} ms per keystroke`);
  process.exit(r.bad.length ? 1 : 0);
}
module.exports = { run, load: () => load(), TESTS };
