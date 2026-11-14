#!/usr/bin/env node
// Quick health check for the app. Run from the repo root:  node tools/check.js
// Add --boot to also open the app in a headless browser and report start-up errors
// (needs Playwright; skipped if it isn't installed).
// Exit code 1 = something must be fixed. "note" lines are information only.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0;
const fail = m => { fails++; console.log('FAIL  ' + m); };
const ok = m => console.log('ok    ' + m);
const note = m => console.log('note  ' + m);

const html = read('index.html');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map(m => m[1]);

// 1. Syntax of every script
let bad = 0;
for (const f of [...scripts, 'sw.js']) {
  if (!fs.existsSync(path.join(root, f))) { fail(`${f} is in index.html but the file is missing`); bad++; continue; }
  try { execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' }); }
  catch (e) { fail(`syntax error in ${f}\n${String(e.stderr).trim()}`); bad++; }
}
if (!bad) ok(`syntax: ${scripts.length + 1} scripts`);

// 2. sw.js offline list matches index.html
const sw = read('sw.js');
const shell = [...(sw.match(/const SHELL = \[([\s\S]*?)\];/) || ['', ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const need = [...styles, ...scripts];
const missing = need.filter(f => !shell.includes(f));
const dupes = shell.filter((f, i) => shell.indexOf(f) !== i);
const stale = shell.filter(f => /^(css|js)\//.test(f) && !need.includes(f));
if (missing.length) fail('sw.js SHELL is missing: ' + missing.join(', '));
if (dupes.length) fail('sw.js SHELL lists twice: ' + dupes.join(', '));
if (stale.length) fail('sw.js SHELL lists files index.html no longer loads: ' + stale.join(', '));
if (!missing.length && !dupes.length && !stale.length) ok('sw.js SHELL matches index.html');

// 3. VERSION matches CACHE
const ver = (read('js/data/config.js').match(/VERSION\s*=\s*'([^']+)'/) || [])[1];
const cache = (sw.match(/CACHE\s*=\s*'([^']+)'/) || [])[1];
if (!ver || !cache || !cache.startsWith('tracker-v' + ver)) fail(`VERSION ${ver} doesn't match CACHE ${cache}`);
else ok(`version ${ver} / cache ${cache}`);

// 4. Strings: every key used exists, every key has Greek
const ctx = { console: { log() {}, warn() {} } };
vm.createContext(ctx);
try {
  vm.runInContext(read('js/data/strings.js') + '\n;this.__S = S;', ctx);
  const S = ctx.__S;
  const used = new Map();
  const add = (k, where) => { if (!used.has(k)) used.set(k, where); };
  for (const m of html.matchAll(/data-t[hpa]?="([^"]+)"/g)) add(m[1], 'index.html');
  const jsFiles = scripts.filter(f => fs.existsSync(path.join(root, f)));
  for (const f of jsFiles) {
    const src = read(f);
    for (const m of src.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) add(m[1], f);
  }
  const unknown = [...used].filter(([k]) => !k.endsWith('_') && !(k in S));   // 'slot_' + x etc. are built at run time
  if (unknown.length) unknown.forEach(([k, f]) => fail(`string key "${k}" (used in ${f}) doesn't exist in strings.js`));
  else ok(`strings: ${used.size} keys used, all exist`);
  const noGreek = Object.keys(S).filter(k => !Array.isArray(S[k]) || S[k][1] == null || S[k][1] === '');
  if (noGreek.length) fail('strings without Greek: ' + noGreek.join(', '));
  // Keys never referenced literally (dynamic families like slot_/petMood_ are skipped)
  const all = jsFiles.map(read).join('\n') + html;
  const dyn = /^(slot_|petMood_|wt_|ul_|u_)/;
  const unused = Object.keys(S).filter(k => !dyn.test(k) && !new RegExp(`['"\`]${k}['"\`]|\\b${k}\\b(?!\\s*:)`).test(all.replace(read('js/data/strings.js'), '')));
  if (unused.length) note(`${unused.length} string keys look unused: ${unused.slice(0, 40).join(', ')}${unused.length > 40 ? ' …' : ''}`);
} catch (e) { fail('could not load strings.js: ' + e.message); }

// 5. Duplicate element ids in index.html
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dupIds = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
if (dupIds.length) fail('duplicate ids in index.html: ' + dupIds.join(', '));
else ok(`ids: ${ids.length}, no duplicates`);

// 5b. Every FORM_PICK key is a real exercise id (data/gym.js)
try {
  const gctx = { console: { log() {}, warn() {} } }; vm.createContext(gctx);
  vm.runInContext(read('js/data/gym.js') + '\n;this.__G = { FORM_PICK, LIB_RAW };', gctx);
  const libIds = new Set(gctx.__G.LIB_RAW.map(r => r[0])), badPick = Object.keys(gctx.__G.FORM_PICK).filter(k => !libIds.has(k));
  if (badPick.length) fail('FORM_PICK has keys that are not exercise ids: ' + badPick.join(', '));
  else ok(`FORM_PICK: ${Object.keys(gctx.__G.FORM_PICK).length} exercises, all real ids`);
} catch (e) { fail('could not check FORM_PICK: ' + e.message); }

// 6. Emoji left on screen (information only)
const emo = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2190}-\u{21FF}\u{24D8}\u{FF0B}\u{2305}\u{25A5}\u{25B6}\u{25BE}\u{25B8}]/u;
const files = ['index.html', ...styles, ...scripts.filter(f => fs.existsSync(path.join(root, f)))];
const hits = {};
for (const f of files) read(f).split('\n').forEach(l => {
  const code = l.replace(/\/\/.*$|\/\*.*?\*\/|<!--.*?-->/g, '');
  if (emo.test(code)) hits[f] = (hits[f] || 0) + 1;
});
const total = Object.values(hits).reduce((a, b) => a + b, 0);
if (total) note(`lines with emoji/glyph icons: ${total} (${Object.entries(hits).map(([f, n]) => `${f} ${n}`).join(', ')})`);
else ok('no emoji/glyph icons');

// 8. Exercise library (LIB_RAW in js/data/gym.js)
try {
  const gctx = { console: { log() {}, warn() {} } };
  vm.createContext(gctx);
  vm.runInContext(read('js/data/gym.js').replace(/^const /gm, 'var ') + '\n;this.__G = { LIB_RAW, HEADS, EQ, REST_BY_PATTERN };', gctx);
  const { LIB_RAW, HEADS, EQ, REST_BY_PATTERN } = gctx.__G;
  const seen = new Set(), bad = [];
  for (const row of LIB_RAW) {
    const [id, en, el, eq, pat, mu] = row, p = m => bad.push(`${id}: ${m}`);
    if (seen.has(id)) p('duplicate id'); seen.add(id);
    if (!/^[a-z0-9_]+$/.test(id)) p('id is not snake_case');
    if (!en) p('no English name');
    if (!el || !String(el).trim()) p('no Greek name');
    if (!(eq in EQ)) p(`equipment code "${eq}" not in EQ`);
    if (!(pat in REST_BY_PATTERN)) p(`pattern "${pat}" not in REST_BY_PATTERN`);
    const parts = String(mu).trim().split(/\s+/).map(x => x.split(':'));
    let sum = 0;
    if (parts.length > 4) p('more than 4 muscles');
    for (const [k, v] of parts) {
      if (!(k in HEADS)) p(`muscle "${k}" not in HEADS`);
      if (!/^\d+$/.test(v || '')) p(`"${k}" percentage "${v}" is not a whole number`);
      sum += +v || 0;
    }
    if (sum !== 100) p(`percentages add up to ${sum}, not 100`);
    else if (parts.length > 1 && Math.max(...parts.map(x => +x[1])) !== +parts[0][1]) p('main mover is not listed first');
  }
  // 4. other names (ALSO) and search
  const normSrc = (read('js/core.js').match(/function norm\(s\)\{[^\n]*\}/) || [])[0];
  vm.runInContext(normSrc + '\n;this.__N = norm;', gctx);
  const norm = gctx.__N, { ALSO, exMatch } = gctx.__G2 = vm.runInContext('({ ALSO, exMatch })', gctx);
  const ids = new Set(LIB_RAW.map(r => r[0])), names = new Map(LIB_RAW.map(r => [norm(r[1]), r[0]]));
  for (const [id, al] of Object.entries(ALSO)) {
    if (!ids.has(id)) bad.push(`${id}: other names given for an exercise that doesn't exist`);
    for (const a of al) { const o = names.get(norm(a)); if (o && o !== id) bad.push(`${id}: other name "${a}" is the real name of ${o} (would look like a duplicate)`); }
  }
  const noAlso = LIB_RAW.filter(r => !(r[0] in ALSO) || !ALSO[r[0]].length).map(r => r[0]);
  if (noAlso.length) bad.push('no other names: ' + noAlso.join(', '));
  const lib = LIB_RAW.map(r => ({ id: r[0], en: r[1], el: r[2], al: ALSO[r[0]] || [] }));
  const find = q => lib.map((x, i) => ({ x, i, r: exMatch(x, norm(q), '') })).filter(o => o.r.s).sort((a, b) => b.r.s - a.r.s || a.i - b.i).map(o => o.x.id);
  const tests = { 'low row': 'machine_row', 'rdl': 'rdl', 'pec deck': 'pec_deck', 'ohp': 'ohp', 'skull crusher': 'skullcrusher', 'bss': 'bulgarian', 'outer thigh': 'abductor', 'inner thigh': 'adductor', 'power squat': 'pendulum_squat',
    'reverse pec deck': 'reverse_pec', 'rear delt machine': 'reverse_pec', 'leg curl': 'lying_curl', 'quad extension': 'leg_ext', 'vertical chest press': 'machine_press', 'iso lateral pulldown': 'iso_pulldown', 'κωπηλατικη': 'machine_row', 'βυθισεις': 'dips', 'ροδακι': 'ab_wheel', 'tgu': 'kb_tgu', 'stairmaster': 'stairs' };
  for (const [q, want] of Object.entries(tests)) { const got = find(q)[0]; if (got !== want) bad.push(`search "${q}" finds ${got} first, expected ${want}`); }
  // no visible exercise name (EN or GR) may carry a brand or machine name; those live only in the hidden search names (ALSO)
  const BRANDS = /matrix|technogym|hammer strength|life ?fitness|cybex|panatta|gym ?80|iso[- ]?lateral|low row/i;
  LIB_RAW.forEach(r => { if (BRANDS.test(r[1]) || BRANDS.test(r[2])) bad.push(`${r[0]} shows a brand or machine name: "${r[1]}" / "${r[2]}"`); });
  if (bad.length) bad.forEach(b => fail('exercise ' + b)); else ok(`exercise library: ${LIB_RAW.length} exercises, all valid`);
} catch (e) { fail('could not check exercise library: ' + e.message); }

// 9. Shared workout QR codes (js/gym-share.js): a workout with supersets packs, unpacks and imports identically,
//    a saved version-1 code still reads the same, and the QR maker accepts the code
try {
  const q = { console: { log() {} } }; vm.createContext(q);
  vm.runInContext(read('js/vendor/qrcode.js') + '\n' + read('js/gym-share.js') + '\n;this.__Q = { wkPack, wkUnpack, qrcode };', q);
  const { wkPack, wkUnpack, qrcode } = q.__Q, bad = [];
  const own = { c_1: { en: 'Band, Fly; 50%', h: 'chest_mid', e: 'band', p: 'fly', rest: 45 } };
  const tpl = { name: 'Πόδια ~ Push, A;B 100%', type: 'push', exercises: [
    { exId: 'bench', sets: 4, reps: '6-8', rest: 180, ss: 'x1' }, { exId: 'c_1', sets: 3, reps: '12,10', rest: 45, ss: 'x1' },
    { exId: 'ohp', sets: 3, reps: '8', rest: 120 },
    { exId: 'lateral_raise', sets: 3, reps: '15', rest: 60, ss: 'y9', uni: true }, { exId: 'pushdown', sets: 2, reps: '10-12', rest: 60, ss: 'y9' }, { exId: 'c_1', sets: 2, reps: 'AMRAP', rest: 45 }] };
  const code = wkPack(tpl, id => own[id] || null), d = wkUnpack(code);
  // import the way wkImport does: own exercises get new ids, each superset letter gets a new group id
  const newOwn = d.own.map((o, i) => 'new_' + i), grp = {};
  const back = d.exercises.map(e => ({ exId: e.own != null ? newOwn[e.own] : e.exId, sets: e.sets, reps: e.reps, rest: e.rest, ss: e.ss ? (grp[e.ss] = grp[e.ss] || 'g' + e.ss) : undefined, uni: !!e.uni }));
  const ownBack = Object.fromEntries(d.own.map((o, i) => [newOwn[i], o]));
  if (d.name !== tpl.name) bad.push(`name "${d.name}"`);
  if (d.type !== tpl.type) bad.push(`type "${d.type}"`);
  if (back.length !== tpl.exercises.length) bad.push(`${back.length} exercises, expected ${tpl.exercises.length}`);
  const sameGroup = (l, i, j) => !!l[i].ss && l[i].ss === l[j].ss;
  tpl.exercises.forEach((e, i) => {
    const b = back[i] || {}, o = own[e.exId], bo = ownBack[b.exId];
    if (o ? !(bo && bo.en === o.en && bo.h === o.h && bo.e === o.e && bo.p === o.p && bo.rest === o.rest) : b.exId !== e.exId) bad.push(`exercise ${i + 1} is ${b.exId}`);
    if (b.sets !== e.sets || b.reps !== e.reps || b.rest !== e.rest || b.uni !== !!e.uni) bad.push(`exercise ${i + 1} sets/reps/rest/one-side changed`);
    tpl.exercises.forEach((_, j) => { if (j !== i && sameGroup(tpl.exercises, i, j) !== sameGroup(back, i, j)) bad.push(`superset ${i + 1}–${j + 1} changed`); });
  });
  if (back[0].exId !== 'bench' || newOwn.length !== 1 || back[1].exId !== back[5].exId) bad.push('own exercise not shared once');
  // version 1 codes are frozen: this one must keep reading the same forever
  const v1 = wkUnpack('GB1~legs~Leg Day %7E 1~squat,5,5,180,A;!0,3,12%2C10,60,Au;calf_raise,4,15~Sled%2C Push,quads,machine,press_h,120');
  if (!v1 || v1.name !== 'Leg Day ~ 1' || v1.type !== 'legs' || v1.exercises.length !== 3 || v1.exercises[1].own !== 0 || v1.exercises[1].reps !== '12,10' || !v1.exercises[1].uni
    || v1.exercises[0].ss !== 'A' || v1.exercises[1].ss !== 'A' || v1.exercises[2].rest !== undefined || v1.own[0].en !== 'Sled, Push' || v1.own[0].rest !== 120) bad.push('a saved version-1 code no longer reads the same');
  if (!(wkUnpack('GB2~x') || {}).newer) bad.push('a newer code is not recognised as newer');
  if (wkUnpack('https://example.com') !== null || wkUnpack('GB1~push~x~') !== null) bad.push('a non-workout code is accepted');
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const qr = qrcode(0, 'M'); qr.addData(code, 'Byte'); qr.make(); const n = qr.getModuleCount();
  if (n > 77) bad.push(`QR is ${n}×${n} modules, too dense to scan comfortably`);
  if (bad.length) bad.forEach(b => fail('workout QR: ' + b)); else ok(`workout QR: supersets round-trip, ${code.length} characters, ${n}×${n} QR`);
} catch (e) { fail('could not check workout QR codes: ' + e.message); }

// 7. Optional: open the app and catch start-up errors
async function boot() {
  let pw; try { pw = require('playwright'); } catch { note('--boot skipped: Playwright not installed'); return; }
  const http = require('http');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0);
  const port = srv.address().port;
  const browser = await pw.chromium.launch();
  const errs = [];
  for (const scheme of ['dark', 'light']) {
    const page = await browser.newPage({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => errs.push(`[${scheme}] ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(`[${scheme}] console: ${m.text()}`); });
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    for (const h of ['#foods', '#today', '#gym', '#fridge']) { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(250); }
    await page.close();
  }
  await browser.close(); srv.close();
  if (errs.length) [...new Set(errs)].forEach(e => fail('start-up: ' + e)); else ok('boot: app starts with no errors (dark + light)');
}

(process.argv.includes('--boot') ? boot() : Promise.resolve()).then(() => {
  console.log(fails ? `\n${fails} problem(s) to fix.` : '\nAll checks passed.');
  process.exit(fails ? 1 : 0);
});
