#!/usr/bin/env node
// Quick health check for the app. Run from the repo root:  node tools/check.js
// Add --boot to also open the app in a headless browser and report start-up errors
// (needs Playwright; skipped with a note if it isn't installed).
// Add --strict (CI) to make a missing browser a FAIL instead of a note: a skipped check is never a pass.
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
  // Keys never referenced literally (dynamic families like slot_ is skipped)
  const all = jsFiles.map(read).join('\n') + html;
  const dyn = /^(slot_|wt_|ul_|u_)/;
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
  const norm = gctx.__N, { ALSO } = gctx.__G2 = vm.runInContext('({ ALSO })', gctx);
  const ids = new Set(LIB_RAW.map(r => r[0])), names = new Map(LIB_RAW.map(r => [norm(r[1]), r[0]]));
  for (const [id, al] of Object.entries(ALSO)) {
    if (!ids.has(id)) bad.push(`${id}: other names given for an exercise that doesn't exist`);
    for (const a of al) { const o = names.get(norm(a)); if (o && o !== id) bad.push(`${id}: other name "${a}" is the real name of ${o} (would look like a duplicate)`); }
  }
  const noAlso = LIB_RAW.filter(r => !(r[0] in ALSO) || !ALSO[r[0]].length).map(r => r[0]);
  if (noAlso.length) bad.push('no other names: ' + noAlso.join(', '));
  // the app's exercise search (js/exsearch.js), loaded by tools/exsearch-test.js the same way the app builds its list
  const exs = require(path.join(root, 'tools/exsearch-test.js')).load();
  const find = q => exs.ExSearch.query(q, { list: exs.LIST, lang: 'en', sessions: [] }).items.map(i => i.id);
  const tests = { 'low row': 'machine_row', 'rdl': 'rdl', 'pec deck': 'pec_deck', 'ohp': 'ohp', 'skull crusher': 'skullcrusher', 'bss': 'bulgarian', 'outer thigh': 'abductor', 'inner thigh': 'adductor', 'power squat': 'pendulum_squat',
    'reverse pec deck': 'reverse_pec', 'rear delt machine': 'reverse_pec', 'leg curl': 'lying_curl', 'quad extension': 'leg_ext', 'vertical chest press': 'machine_press', 'iso lateral pulldown': 'iso_pulldown', 'κωπηλατικη': 'machine_row', 'βυθισεις': 'dips', 'ροδακι': 'ab_wheel', 'tgu': 'kb_tgu', 'stairmaster': 'stairs' };
  for (const [q, want] of Object.entries(tests)) { const got = find(q)[0]; if (got !== want) bad.push(`search "${q}" finds ${got} first, expected ${want}`); }
  // no visible exercise name (EN or GR) may carry a brand or machine name; those live only in the hidden search names (ALSO)
  const BRANDS = /matrix|technogym|hammer strength|life ?fitness|cybex|panatta|gym ?80|iso[- ]?lateral|low row/i;
  LIB_RAW.forEach(r => { if (BRANDS.test(r[1]) || BRANDS.test(r[2])) bad.push(`${r[0]} shows a brand or machine name: "${r[1]}" / "${r[2]}"`); });
  if (bad.length) bad.forEach(b => fail('exercise ' + b)); else ok(`exercise library: ${LIB_RAW.length} exercises, all valid`);
} catch (e) { fail('could not check exercise library: ' + e.message); }

// 8b. Exercise search test list (tools/exsearch-test.js, Refinements change 16): every query finds the right exercise, and it stays fast
try {
  const r = require(path.join(root, 'tools/exsearch-test.js')).run();
  r.bad.forEach(b => fail('exercise search ' + b));
  if (r.perKey > 5) fail(`exercise search is slow: ${r.perKey.toFixed(2)} ms per keystroke (keep it under a few ms)`);
  if (!r.bad.length) ok(`exercise search: ${r.tests} checks, average ${r.avg.toFixed(2)} ms per search, ${r.perKey.toFixed(2)} ms per keystroke`);
} catch (e) { fail('could not run the exercise search test list: ' + e.message); }

// 8c. Exercise Picker V27: your own exercises (Title Case, records, duplicates) and their QR codes (tools/expick-test.js)
try {
  const r = require(path.join(root, 'tools/expick-test.js')).run();
  r.bad.forEach(b => fail('custom exercises: ' + b));
  if (!r.bad.length) ok(`custom exercises: ${r.tests} Title Case / record / duplicate / QR checks pass (tools/expick-test.js)`);
} catch (e) { fail('could not run tools/expick-test.js: ' + e.message); }

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


// 10. AI provider layer (js/platform/ai-provider.js): fake network, no key needed. Tries, errors, retries, usage, cancel.
async function aiTests() {
  const bad = [];
  // fake clock (V3 hardening): pauses and timeouts move a pretend clock instead of really waiting, so these tests take milliseconds, not ~30 s
  const fakeTime = () => {
    const clock = { now: Date.UTC(2026, 10, 16, 12) }; const live = new Map(); let n = 0;
    class FDate extends Date { constructor(...a) { super(...(a.length ? a : [clock.now])); } static now() { return clock.now; } }
    const st = (f, ms) => { const id = ++n; live.set(id, 1); setImmediate(() => { if (!live.delete(id)) return; clock.now += Math.max(0, ms || 0); f(); }); return id; };
    return { clock, Date: FDate, setTimeout: st, clearTimeout: id => { live.delete(id); } };
  };
  const mk = script => {   // script: list of replies in order; a reply is { status, body } or { throw: 'AbortError' | 'net', cost: ms the try takes }
    const calls = [], waits = [], ft = fakeTime();
    const c = { console: { log() {}, warn() {} }, setTimeout: ft.setTimeout, clearTimeout: ft.clearTimeout, Promise, JSON, Date: ft.Date, Math, Object, Error, Array, Set, String, Number, AbortController,
      settings: { geminiKey: 'k', model: 'm1' }, DEFAULT_MODEL: 'm1', Store: { load: () => ({ at: Date.now(), tag: 'k', list: ['m1', 'm2', 'm3'] }), save() {} },
      t: (k, v) => k + (v && v.e ? ':' + v.e : '') };
    c.fetchT = async (url, opts, ms) => {
      calls.push(decodeURIComponent(url.split('/models/')[1] || url)); waits.push(ms);
      const r = script.shift() || { status: 200, body: { candidates: [{ content: { parts: [{ text: '{"ok":1}' }] } }] } };
      if (r.cost) ft.clock.now += Math.min(r.cost, ms);   // a slow try uses up its time, at most its own time limit
      if (r.throw) { const e = new Error(r.throw); e.name = r.throw === 'AbortError' ? 'AbortError' : 'TypeError'; throw e; }
      return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
    };
    vm.createContext(c);
    vm.runInContext(read('js/platform/ai-provider.js') + '\n;this.__P = { AIProvider, GeminiProvider, AnthropicProvider };', c); c.settings.aiKeys = {};
    return { P: c.__P, calls, waits, c, clock: ft.clock };
  };
  const good = (text, usage) => ({ status: 200, body: { candidates: [{ content: { parts: [{ text }] } }], ...(usage ? { usageMetadata: usage } : {}) } });
  const fails = async (f) => { try { await f(); return null; } catch (e) { return e; } };
  const req = { prompt: 'x', json: true };
  let r;
  // success, JSON in a fence, usage normalised
  r = mk([good('```json\n{"a":2}\n```', { promptTokenCount: 10, candidatesTokenCount: 4, thoughtsTokenCount: 6, totalTokenCount: 20 })]);
  let res = await r.P.AIProvider.run(req);
  if (!res.json || res.json.a !== 2) bad.push('fenced JSON not read');
  if (!res.usage || res.usage.input !== 10 || res.usage.output !== 10 || res.usage.total !== 20) bad.push('usage not normalised');
  // no usage reported = null, never 0
  r = mk([good('{"a":1}')]); res = await r.P.AIProvider.run(req);
  if (res.usage !== null) bad.push('missing usage must be null');
  // unreadable answer → next model, counted as a failed try
  r = mk([good('nope'), good('{"a":3}')]); res = await r.P.AIProvider.run(req);
  if (res.json.a !== 3 || r.calls.length !== 2 || res.model !== 'gemini-flash-latest') bad.push('unreadable answer did not move on to the next model');
  // bad key: stops on the first model, kind auth, fatal
  r = mk([{ status: 401, body: { error: { message: 'API key not valid. Please pass a valid API key.' } } }]);
  let e = await fails(() => r.P.AIProvider.run(req));
  if (!e || e.kind !== 'auth' || !e.fatal || r.calls.length !== 1 || !/^keyBad/.test(e.message)) bad.push('bad key must stop at once as kind auth');
  // busy (503) and rate limit (429): next model, with a pause, kinds normalised
  r = mk([{ status: 429, body: { error: { message: 'quota' } } }, { status: 503, body: { error: { message: 'overloaded' } } }, good('{"a":4}')]);
  const t0 = r.clock.now; res = await r.P.AIProvider.run(req);
  if (res.json.a !== 4 || r.calls.join() !== 'm1:generateContent,gemini-flash-latest:generateContent,gemini-flash-lite-latest:generateContent' || r.clock.now - t0 < 600) bad.push('429/503 must try the next model after a short pause');
  // every model fails: one error with the old text, kind of the last failure
  r = mk(Array(10).fill({ status: 503, body: { error: { message: 'busy' } } }));
  r.P.AIProvider.onDone = tr => { r.trace = tr; };
  e = await fails(() => r.P.AIProvider.run(req));
  if (!e || e.kind !== 'overloaded' || e.message !== 'allBusy:busy' || !r.trace || r.trace.ok || r.trace.tries.length < 3) bad.push('all-fail error/trace wrong');
  // timeout reads as before
  r = mk([{ throw: 'AbortError' }, good('{"a":5}')]); res = await r.P.AIProvider.run(req);
  if (res.json.a !== 5) bad.push('timeout must move on');
  r = mk(Array(10).fill({ throw: 'AbortError' })); e = await fails(() => r.P.AIProvider.run(req));
  if (!e || e.message !== 'allBusy:timedOut' || e.kind !== 'timeout') bad.push('timeout text changed');
  // opt-in retry on the same model, bounded
  r = mk([{ status: 503, body: {} }, good('{"a":6}')]); res = await r.P.AIProvider.run({ ...req, retries: 1 });
  if (res.model !== 'm1' || r.calls.length !== 2) bad.push('retries:1 must retry the same model once');
  r = mk(Array(10).fill({ status: 503, body: {} })); await fails(() => r.P.AIProvider.run({ ...req, retries: 99 }));
  if (r.calls.length > 10 * 3) bad.push('retries must be bounded');
  // cancel
  const ctl = new r.c.AbortController(); ctl.abort(); r = mk([]); e = await fails(() => r.P.AIProvider.run(req, { outer: ctl.signal }));
  if (!e || !e.cancelled || e.kind !== 'cancelled') bad.push('cancel must give a cancelled error');
  // V3 hardening: ONE deadline for the whole request (model list, tries, retries, pauses). Default 60 s, advanced / search 120 s.
  r = mk(Array(10).fill({ throw: 'AbortError', cost: 30000 })); { const t1 = r.clock.now; let tr = null; r.P.AIProvider.onDone = x => { tr = x; };
    e = await fails(() => r.P.AIProvider.run(req)); const el = r.clock.now - t1;
    if (!e || e.kind !== 'timeout' || !e.deadline || el > 60000 || r.calls.length > 2) bad.push(`deadline: 10 slow models must stop within 60 s (took ${el} ms, ${r.calls.length} tries)`);
    if (!tr || !tr.deadline || tr.ok) bad.push('deadline: the usage trace must say the deadline ended it'); }
  r = mk(Array(10).fill({ status: 503, body: { error: { message: 'busy' } }, cost: 25000 })); { const t1 = r.clock.now; e = await fails(() => r.P.AIProvider.run(req));
    if (r.clock.now - t1 > 60000 || !e || e.message !== 'allBusy:busy') bad.push(`deadline: busy models + pauses must stay within 60 s (took ${r.clock.now - t1} ms) and keep the old text`); }
  r = mk([{ throw: 'AbortError', cost: 30000 }, good('{"a":7}')]); res = await r.P.AIProvider.run({ ...req, deadlineMs: 50000 });
  if (res.json.a !== 7 || r.waits[1] !== 20000) bad.push(`deadline: the next try gets only the time left (got ${r.waits[1]} ms, want 20000)`);
  r = mk(Array(10).fill({ throw: 'AbortError', cost: 60000 })); { const t1 = r.clock.now; await fails(() => r.P.AIProvider.run({ ...req, tier: 'advanced' }));
    if (r.clock.now - t1 > 120000 || r.calls.length !== 2) bad.push(`deadline: advanced must stop within 120 s (took ${r.clock.now - t1} ms, ${r.calls.length} tries)`); }
  r = mk([good('{"a":8}')]); res = await r.P.AIProvider.run({ ...req, deadlineMs: 5000 });
  if (res.json.a !== 8 || r.waits[0] !== 5000) bad.push('deadline: deadlineMs caps the first try too');
  // cancel during a pause: stops at once, one usage record
  { r = mk(Array(10).fill({ status: 503, body: {} })); const ctl2 = new r.c.AbortController(); let n = 0; r.P.AIProvider.onDone = () => { n++; };
    const pr = fails(() => r.P.AIProvider.run(req, { outer: ctl2.signal, onTry: i => { if (i === 2) ctl2.abort(); } })); e = await pr;
    if (!e || !e.cancelled || r.calls.length > 2 || n !== 1) bad.push(`cancel mid-request: must stop with one usage record (tries ${r.calls.length}, records ${n})`); }
  // tiers: advanced puts the strongest first; default starts with Settings model
  r = mk([good('{"a":1}')]); r.c.settings.modelAdvanced = 'mx'; await r.P.AIProvider.run({ ...req, tier: 'advanced' });
  if (r.calls[0] !== 'mx:generateContent') bad.push('advanced tier ignores settings.modelAdvanced');
  r = mk([good('{"a":1}')]); await r.P.AIProvider.run(req); if (r.calls[0] !== 'm1:generateContent') bad.push('default tier must start with settings.model');
  // a provider without a key refuses at once, without a network call (never a silent switch to another provider)
  r = mk([]); r.c.settings.provider = 'anthropic'; e = await fails(() => r.P.AIProvider.run(req));
  if (!e || e.kind !== 'auth' || r.calls.length) bad.push('a provider with no key must refuse without calling the network');
  // Food Coach 2.0: OpenAI-compatible + Anthropic adapters give the same normalized answer, usage and errors
  r = mk([{ status: 200, body: { choices: [{ message: { content: '{"a":9}' } }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } } }]);
  r.c.settings.provider = 'openrouter'; r.c.settings.aiKeys = { openrouter: 'k' }; res = await r.P.AIProvider.run(req);
  if (res.json.a !== 9 || res.provider !== 'openrouter' || res.usage.total !== 8 || !/chat\/completions/.test(r.calls[0])) bad.push('OpenRouter adapter: answer/usage not normalized');
  r = mk([{ status: 200, body: { content: [{ type: 'text', text: '{"a":10}' }], usage: { input_tokens: 7, output_tokens: 2 } } }]);
  r.c.settings.provider = 'anthropic'; r.c.settings.aiKeys = { anthropic: 'k' }; res = await r.P.AIProvider.run(req);
  if (res.json.a !== 10 || res.usage.total !== 9 || res.usage.input !== 7) bad.push('Anthropic adapter: answer/usage not normalized');
  r = mk([{ status: 529, body: { error: { type: 'overloaded_error' } } }, { status: 401, body: { error: { message: 'invalid x-api-key' } } }]);
  r.c.settings.provider = 'anthropic'; r.c.settings.aiKeys = { anthropic: 'k' }; e = await fails(() => r.P.AIProvider.run({ ...req, tier: 'advanced' }));
  if (!e || e.kind !== 'auth' || !e.fatal) bad.push('Anthropic adapter: 529 must move on, 401 must stop as auth');
  r = mk([]); r.c.settings.provider = 'openai'; r.c.settings.aiKeys = { openai: 'k' }; e = await fails(() => r.P.AIProvider.run({ ...req, search: true }));
  if (!e || e.kind !== 'unsupported') bad.push('OpenAI adapter must refuse web search instead of pretending');
  // quota cooldown: a 429 cools that model; when all are cooling the next request fails at once (no network); the provider's retryDelay is used
  r = mk([{ status: 429, body: { error: { message: 'quota', details: [{ retryDelay: '40s' }] } } }, { status: 429, body: { error: { message: 'quota' } } }]);
  e = await fails(() => r.P.AIProvider.run({ ...req, maxModels: 2 }));
  if (!e || e.kind !== 'rate' || r.calls.length !== 2) bad.push(`maxModels: 2 must stop after 2 tries (${r.calls.length})`);
  { const n0 = r.calls.length; e = await fails(() => r.P.AIProvider.run({ ...req, maxModels: 2 })); const st = await r.P.AIProvider.status({ maxModels: 2 });
    if (!e || !e.cooldown || r.calls.length !== n0 || st.ok || st.why !== 'cooling') bad.push('cooldown: a quota-exhausted chain must fail at once without a network call');
    r.clock.now += 41000; const st2 = await r.P.AIProvider.status({ maxModels: 2 }); if (!st2.ok) bad.push('cooldown must end after the provider\'s retry delay'); }
  // the same request in flight twice (dedupeKey) = one call
  r = mk([good('{"a":11}')]); { const [x, y] = await Promise.all([r.P.AIProvider.run({ ...req, dedupeKey: 'q' }), r.P.AIProvider.run({ ...req, dedupeKey: 'q' })]);
    if (x.json.a !== 11 || y !== x || r.calls.length !== 1) bad.push('dedupeKey: two identical requests in flight must share one call'); }

  // telemetry (js/platform/ai-usage.js): counts, tokens only when reported, no message text, 30 days kept
  {
    const mem = {}; const c = { ...mk([]).c }; for (const k of ['AIProvider','GeminiProvider','AnthropicProvider']) delete c[k]; const c0 = c; const fresh = {}; for (const k of Object.keys(c0)) if (!/^(AI|Gemini|Anthropic|__)/.test(k)) fresh[k] = c0[k]; vm.createContext(fresh);
    const c1 = fresh; c1.Store = { load: (k, d) => k === 'models' ? { at: Date.now(), tag: 'k', list: ['m1', 'm2'] } : (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), save: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); return true; } };
    c1.todayKey = () => new c1.Date().toLocaleDateString('en-CA'); c1.lang = 'en';   // the fake clock's day, like the app's todayKey (was fixed to one date: failed every other day)
    const q = [good('{"a":1}', { promptTokenCount: 7, candidatesTokenCount: 3, totalTokenCount: 10 }), good('nope'), good('{"a":2}'), { status: 503, body: { error: { message: 'busy' } } }];
    let n = 0; c1.fetchT = async () => { const r = q[n++] || { status: 500, body: { error: { message: 'x' } } }; return { ok: r.status < 300, status: r.status, json: async () => r.body }; };
    vm.runInContext(read('js/platform/ai-provider.js') + '\n' + read('js/platform/ai-usage.js') + '\n;this.__U = { AIProvider, AIUsage };', c1);
    const { AIProvider, AIUsage } = c1.__U;
    await AIProvider.run({ prompt: 'SECRET MESSAGE', json: true, task: 'chat' });                   // 1 try, with tokens
    await AIProvider.run({ prompt: 'SECRET MESSAGE', json: true, tier: 'advanced' });              // unreadable, then ok: 2 tries, no tokens
    await fails(() => AIProvider.run({ prompt: 'SECRET MESSAGE', json: true, search: true }));     // every model busy: failed
    const d = JSON.parse(JSON.stringify(mem.aiUsage)).days[c1.todayKey()], s1 = AIUsage.sum(1);
    if (!d || d.calls !== 3 || d.ok !== 2 || d.failed !== 1) bad.push('usage: request counts wrong ' + JSON.stringify(d && [d.calls, d.ok, d.failed]));
    if (d.tokIn !== 7 || d.tokOut !== 3 || d.tokTries !== 1) bad.push('usage: tokens must be summed only where reported');
    if (d.bad !== 1) bad.push('usage: unreadable answer not counted');
    if (d.mode.text !== 1 || d.mode.advanced !== 1 || d.mode.search !== 1) bad.push('usage: modes wrong');
    if (JSON.stringify(mem.aiUsage).includes('SECRET')) bad.push('usage: message text was stored');
    if (s1.calls !== 3 || s1.tries < 4) bad.push('usage: sum wrong');
    for (let i = 0; i < 40; i++) { const u = JSON.parse(JSON.stringify(mem.aiUsage)); u.days['2026-01-' + String(i + 1).padStart(2, '0')] = { calls: 1 }; mem.aiUsage = u; }
    AIUsage.record({ ok: true, tier: 'default', ms: 5, tries: [{ model: 'm', ok: true }] });
    if (Object.keys(mem.aiUsage.days).length > 30) bad.push('usage: more than 30 days kept');
    AIUsage.reset(); if (Object.keys(mem.aiUsage.days).length) bad.push('usage: reset did not clear');
  }
  if (bad.length) bad.forEach(b => fail('AI provider: ' + b)); else ok('AI provider layer + usage: tries, errors, retries, tiers, cancel, tokens, privacy, 30-day limit');
}

// 11. Rank rating (RANK … rankGap in js/data/gym.js): fair and steady (see docs/notes/rank-fairness.md)
try {
  const r = {}; vm.createContext(r);
  vm.runInContext(read('js/data/gym.js').replace(/^const /gm, 'var ') + '\n;this.__R = { TIER_STD, rankParts, rankScore, rankSteps, rankLevel, rankRefParts };', r);
  const { TIER_STD, rankParts, rankScore, rankSteps, rankLevel, rankRefParts } = r.__R, bad = [];
  const ses = (ago, w, reps, n) => ({ ago, e1s: Array(n).fill(w * (1 + reps / 30)), vol: w * reps * n });
  const lvl = (list, bw, sex, lift) => { const std = { s: TIER_STD[lift], k: 1 }, b = { bw, sex }; return rankLevel(rankScore(rankParts(list), b, std), rankSteps(b, std)); };
  const kgFor = (n, bw, sex, lift) => { const std = { s: TIER_STD[lift], k: 1 }, b = { bw, sex }, st = rankSteps(b, std)[n]; let a = 0, z = 3000;
    for (let i = 0; i < 50; i++) { const m = (a + z) / 2; if (rankScore(rankRefParts(m), b, std) >= st) z = m; else a = m; } return z; };
  for (const lift of Object.keys(TIER_STD)) for (const sex of ['m', 'f']) {
    for (const bw of [55, 80, 120]) {
      let last = 0; for (let w = 2.5; w <= 400; w += 2.5) { const n = lvl([ses(0, w, 5, 3)], bw, sex, lift); if (n < last) { bad.push(`${lift} ${sex} ${bw} kg: more weight gave a lower level at ${w} kg`); break; } last = n; }
      last = 0; for (let reps = 1; reps <= 12; reps++) { const n = lvl([ses(0, 0.5 * bw, reps, 3)], bw, sex, lift); if (n < last) { bad.push(`${lift} ${sex} ${bw} kg: more reps gave a lower level at ${reps}`); break; } last = n; }
      // eight weekly workouts of 4 × 8, then one bad workout (lower level?) or one lucky heavy single (more than one level up?)
      for (const f of [0.3, 0.6, 0.9, 1.2]) { const w = f * TIER_STD[lift][sex][2] * bw * 0.75, hist = Array.from({ length: 8 }, (_, i) => ses(7 * (8 - i), w, 8, 4)), n0 = lvl(hist, bw, sex, lift);
        if (lvl([...hist, ses(0, w * 0.6, 8, 3)], bw, sex, lift) < n0) bad.push(`${lift} ${sex} ${bw} kg: one bad workout lowered the level`);
        if (lvl([...hist, { ago: 0, e1s: [w * 1.25 * (1 + 8 / 30)], vol: w * 1.25 }], bw, sex, lift) > n0 + 1) bad.push(`${lift} ${sex} ${bw} kg: one lucky set jumped more than one level`); }
      // the same lift scaled by body weight^0.67 gets the same level as at 80 kg
      const at80 = lvl([ses(0, 100, 5, 3)], 80, sex, lift), scaled = lvl([ses(0, 100 * Math.pow(bw / 80, 0.67), 5, 3)], bw, sex, lift);
      if (at80 !== scaled) bad.push(`${lift} ${sex}: the same relative lift is level ${scaled} at ${bw} kg but ${at80} at 80 kg`);
    }
    for (let n = 1; n < 15; n++) { const k = [55, 65, 80, 100, 120].map(bw => kgFor(n, bw, sex, lift)); if (k.some((v, i) => i && v <= k[i - 1])) { bad.push(`${lift} ${sex}: level ${n} doesn't need more kg for a heavier lifter`); break; } }
    for (const bw of [65, 80]) { const d1 = kgFor(14, bw, sex, lift), elite = TIER_STD[lift][sex][4] * bw; if (!(d1 > elite * 0.95 && d1 < elite * 1.25)) bad.push(`${lift} ${sex} ${bw} kg: Diamond 1 needs ${Math.round(d1)} kg (Elite standard ${Math.round(elite)})`); }
  }
  if (bad.length) [...new Set(bad)].slice(0, 20).forEach(b => fail('rank: ' + b)); else ok(`rank: ${Object.keys(TIER_STD).length} lifts fair (monotonic, body weight, steady, Diamond reachable)`);
} catch (e) { fail('could not check the rank rating: ' + e.message); }

// 11b. Athlete Rank v0.4 (live): the anchor curves (js/rank-engine.js + js/data/rank-bench.js) and the production path (js/rank-v04.js).
try {
  const bad = [], RankEngine = require(path.join(root, 'js/rank-engine.js')), BENCH = require(path.join(root, 'js/data/rank-bench.js'));
  try { execFileSync(process.execPath, [path.join(root, 'tools/rank/build-bench.js'), '--check'], { stdio: 'pipe' }); }
  catch (e) { bad.push('benchmark files are not up to date with data/rank/rank-config.json and the sources: run node tools/rank/build-bench.js'); }
  if (BENCH.synthetic !== false) bad.push('the app benchmark file must not be synthetic');
  if (/strength ?level|symmetric ?strength|buffro/i.test(JSON.stringify({ e: BENCH.exercises, v: BENCH.variants, s: BENCH.sources }))) bad.push('a proprietary site is named as a source of benchmark values');
  for (const [id, e] of Object.entries(BENCH.exercises)) for (const [sx, m] of Object.entries(e.models)) {
    if (!m.sources || !m.sources.length || m.sources.some(k => !BENCH.sources[k])) bad.push(`${id} ${sx}: no listed source`);
    if (!(m.n >= 100)) bad.push(`${id} ${sx}: fewer than 100 lifters behind the benchmark`); }
  for (const [id, v] of Object.entries(BENCH.variants)) { if (!v.source || !(v.n > 0)) bad.push(`variation ${id}: no source or sample size`); if (BENCH.variants[v.anchor]) bad.push(`variation ${id}: chained to another variation`); }
  const eng = RankEngine.create(BENCH), one = (ex, sex, bw, sets, age) => eng.evaluate(ex, { sex, age }, [{ day: 0, bw, sets }], 0);
  const two = (ex, sex, bw, sets) => eng.evaluate(ex, { sex }, [{ day: 0, bw, sets }, { day: 7, bw, sets }], 7);
  for (const [id, e] of Object.entries(BENCH.exercises)) for (const sex of Object.keys(e.models)) {
    for (const bw of [50, 65, 80, 100, 130]) {
      let last = 0; for (let w = 10; w <= 320; w += 2.5) { const n = two(id, sex, bw, [{ w, reps: 8 }]).n; if (n < last) { bad.push(`${id} ${sex} ${bw} kg: more weight gave a lower rank at ${w} kg`); break; } last = n; }
      last = 0; for (let reps = 1; reps <= 20; reps++) { const n = two(id, sex, bw, [{ w: 0.6 * bw, reps }]).n; if (n < last) { bad.push(`${id} ${sex} ${bw} kg: more reps gave a lower rank at ${reps}`); break; } last = n; }
      // best single set only: the same set done once or four times is the same rank
      for (const w of [0.4 * bw, 0.8 * bw, 1.2 * bw]) if (one(id, sex, bw, [{ w, reps: 9 }]).n !== one(id, sex, bw, Array(4).fill({ w, reps: 9 })).n) bad.push(`${id} ${sex} ${bw} kg: doing more sets changed the rank`);
      // a first workout never shows Platinum or Diamond, however heavy; a beginner's light set is Bronze
      if (one(id, sex, bw, [{ w: 2 * bw, reps: 8 }]).n > 8) bad.push(`${id} ${sex} ${bw} kg: a first workout reached Platinum`);
      if (one(id, sex, bw, [{ w: 20, reps: 10 }]).n > 2) bad.push(`${id} ${sex} ${bw} kg: 20 kg x 10 is above Bronze`);
    }
    // the same percentile at every body weight is the same rank (rule 5)
    for (const z of [-0.84, 0.1, 0.9, 1.5, 2.2]) { const mo = eng.model(id, sex), ranks = [50, 60, 75, 90, 110].map(bw => { const ref = eng.refKg(mo, z, bw); return two(id, sex, bw, [{ w: ref * mo.m.kL, reps: 1 }, { w: ref * mo.m.kV / 10, reps: 10 }]).n; });
      if (new Set(ranks).size > 1) bad.push(`${id} ${sex}: the same percentile is a different rank at different body weights (${ranks.join(',')})`); }
    for (let n = 1; n < 15; n++) { const k = [55, 70, 85, 100, 120].map(bw => eng.need(id, { sex, bw }, n, 8)); if (k.some((v, i) => i && v < k[i - 1] - 1e-6)) { bad.push(`${id} ${sex}: rank ${n} needs less kg for a heavier lifter`); break; } }
    // rule 3 (at most two levels per workout), rule 4 (one bad day never lowers), rule 2 (a typo is not counted)
    const hist = [0, 7, 14].map(day => ({ day, bw: 80, sets: [{ w: eng.need(id, { sex, bw: 80 }, 3, 8), reps: 8 }] })), n0 = eng.evaluate(id, { sex }, hist, 14).n;
    const jump = eng.evaluate(id, { sex }, [...hist, { day: 21, bw: 80, sets: [{ w: eng.need(id, { sex, bw: 80 }, 8, 8), reps: 8 }] }], 21);
    if (jump.n > n0 + 2) bad.push(`${id} ${sex}: one workout raised the rank by ${jump.n - n0} levels`);
    if (eng.evaluate(id, { sex }, [...hist, { day: 21, bw: 80, sets: [{ w: 20, reps: 5 }] }], 21).n < n0) bad.push(`${id} ${sex}: one bad workout lowered the rank`);
    const typo = eng.evaluate(id, { sex }, [...hist, { day: 21, bw: 80, sets: [{ w: 900, reps: 8 }] }], 21);
    if (typo.n !== n0 || typo.checks.length !== 1) bad.push(`${id} ${sex}: a 900 kg typo was counted`);
    if (eng.evaluate(id, { sex }, [...hist, { day: 21, bw: 80, sets: [{ w: 900, reps: 8, ok: true }] }], 21).checks.length) bad.push(`${id} ${sex}: a confirmed set is still marked to check`);
    // the common rep ranges are represented: the same true level trained as sets of 5, 6, 7, 8 or 10 (or a mix) lands within one rank of each other
    for (const z of [0, 0.6745, 1.2816]) { const mo = eng.model(id, sex), ref = eng.refKg(mo, z, 80), lv = [[5], [6], [7], [8], [10], [6, 8]].map(rs => two(id, sex, 80, rs.map(r => ({ w: ref / (1 + r / 30), reps: r }))).n);
      if (Math.max(...lv) - Math.min(...lv) > 1) bad.push(`${id} ${sex}: training style changes the rank by more than one level (${lv.join(',')})`); }
    // age: an older lifter never needs more than a young one
    if (eng.need(id, { sex, bw: 80, age: 60 }, 6, 8) > eng.need(id, { sex, bw: 80, age: 30 }, 6, 8) + 1e-6) bad.push(`${id} ${sex}: age 60 needs more kg than age 30`);
  }
  if (one('pullup', 'm', 70, [{ w: 0, reps: 9 }]).ranked) bad.push('pull-ups have a rank without open benchmark data');
  if (one('bench', 'm', 80, []).none !== true) bad.push('no sets must give "none"');
  // Athlete Rank v0.4 is the production path: the switch is on, tierFor() answers from it, nothing calls the old adapter
  const v4 = read('js/rank-v04.js'), gymJs = read('js/gym.js');
  if (!/const RANK4 = \{ on: true \}/.test(v4)) bad.push('RANK4.on must be true (v0.4 is live)');
  if (!/function tierFor\([^)]*\)\{ if\(typeof RANK4 !== 'undefined' && RANK4\.on\) return rank4For\(/.test(gymJs)) bad.push('tierFor() must answer from rank4For() first');
  if (/RANK2|rank2For|rank-v2\.js/.test(gymJs + read('js/profile.js') + read('js/rank-fx.js') + read('index.html') + read('sw.js'))) bad.push('something still refers to the retired rank-v2 adapter');
  const libIds = new Set([...read('js/data/gym.js').matchAll(/^ \['([a-z0-9_]+)',/gm)].map(m => m[1]));
  [...Object.keys(BENCH.exercises), ...Object.keys(BENCH.variants)].forEach(id => { if (!libIds.has(id)) bad.push(`benchmark exercise ${id} is not in the exercise library`); });
  try { const out = execFileSync(process.execPath, [path.join(root, 'tools/rank-v04-test.js')], { stdio: 'pipe' }).toString(); if (!/All \d+ rank v0\.4 checks pass/.test(out)) bad.push('tools/rank-v04-test.js did not pass'); }
  catch (e) { bad.push('tools/rank-v04-test.js: ' + String(e.stdout || e.message).split('\n').filter(l => /^FAIL/.test(l)).join(' | ')); }
  if (bad.length) [...new Set(bad)].slice(0, 20).forEach(b => fail('rank v0.4: ' + b));
  else ok(`rank v0.4 (live): anchor curves from open data (${Object.keys(BENCH.exercises).length} lifts) hold; switch on, tierFor() uses it; brief scenarios pass (tools/rank-v04-test.js)`);
} catch (e) { fail('could not check the new rank engine: ' + e.message); }

// 12. Social Hub stats (STATS in js/profile.js): each new stat gives the expected value on a small fake history, hides without data, and nothing throws on an empty history
try {
  const mk = (date, hh, sets, prs) => ({ date, start: `${date}T${hh}:00`, end: `${date}T${String(+hh.slice(0, 2) + 1).padStart(2, '0')}${hh.slice(2)}:00`, prs: prs || [], exercises: sets });
  const ex = (exId, ...rw) => ({ exId, sets: rw.map(([w, r]) => ({ w, r, done: true })) });
  const run = (sessions, extra) => {
    const g = { sessions, lang: 'en', weights: {}, targets: { bw: 80 }, profile: {}, ui: {}, console: { log() {} } };
    g.t = (k, p) => k === 'wdFull' ? 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday' : k + (p ? JSON.stringify(p) : '');
    g.exById = id => ({ m: 'chest' }); g.exName = id => id; g.isMainSet = st => st.type !== 'W' && st.side !== 'R' && !st.drop; g.loadOf = (id, w) => +w || 0;
    g.e1rm = (w, r) => r >= 1 && r <= 20 && +w > 0 ? +w * (1 + r / 30) : 0; g.bodyW = () => 80; g.latestWeight = () => 80; g.GROUPS = { chest: ['Chest', 'Στήθος'] };
    g.addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    g.fmtDate = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7); g.esc = x => String(x); g.rankIcon = () => ''; g.todayKey = () => '2026-11-16';
    g.tierStd = id => id === 'bench' || id === 'squat' || id === 'deadlift' ? {} : null; g.tierFor = id => id === 'bench' ? { next: { kg: 2.5, tier: 'silver', n: 3, label: 'Silver 3' } } : id === 'squat' ? { next: { kg: 10, tier: 'silver', n: 3, label: 'Silver 3' } } : null;
    Object.assign(g, extra); vm.createContext(g);
    vm.runInContext(read('js/profile.js').replace(/^const /gm, 'var ') + '\n;this.__ST = { STATS, statsCtx };', g);
    const c = g.__ST.statsCtx(), out = {}; g.__ST.STATS.forEach(x => { out[x.id] = x.calc(c) || null; }); return out;
  };
  const bad = [], none = run([]);
  for (const [id, v] of Object.entries(none)) if (v) bad.push(`${id} shows with no workouts`);
  const hist = [
    mk('2026-01-05', '06:30', [ex('bench', [100, 5], [100, 5])], [{ kind: 'w' }]),                 // Mon, dawn
    mk('2026-02-02', '22:00', [ex('bench', [1, 120]), ex('squat', [120, 5])], [{ kind: 'w' }]),    // Mon, night; 120 reps is ignored by Rep King
    mk('2026-02-16', '18:00', [ex('bench', [80, 30]), ex('squat', [130, 3]), ex('deadlift', [150, 3]), ex('curl', [10, 8])], [{ kind: 'w' }, { kind: 'v' }]),   // Mon
    mk('2026-03-10', '18:00', [ex('bench', [100, 1])]) ];
  const o = run(hist);
  const eq = (id, f, want) => { const got = o[id] && f(o[id]); if (got !== want) bad.push(`${id}: expected ${want}, got ${JSON.stringify(o[id])}`); };
  eq('bestDay', r => r.v, '3,320 kg'); eq('bestDay', r => r.k, 'bdCar');
  if (o.mountain) bad.push('mountain should hide while under 0.01 Everest');
  const mt = run([mk('2026-01-05', '18:00', [ex('bench', [100, 5000])])]).mountain; if (!mt || mt.v !== '0.4x') bad.push('mountain: expected 0.4x, got ' + JSON.stringify(mt));   // 5000 reps x 100 kg x 0.5 m x 9.81 / (8849 m x 80 kg x 9.81)
  eq('luckyDay', r => r.v, 'Monday'); eq('luckyDay', r => r.p.n, 4);
  eq('night', r => r.v, '1'); eq('dawn', r => r.v, '1');
  eq('couch', r => r.v, '28 stUnitDays'); eq('couch', r => r.p.a + '>' + r.p.b, '05/01>02/02');
  eq('nextRank', r => r.v, '+2.5 kg'); eq('nextRank', r => r.p.n, 'bench');
  eq('ratio', r => r.v, '2.1x'); eq('ratio', r => r.p.n, 'deadlift');
  eq('repKing', r => r.v, '30 stUnitReps'); eq('repKing', r => r.p.n, 'bench');
  eq('big3', r => r.v, '424.7 kg'); eq('big3', r => r.k, 'big3Bw');
  eq('explorer', r => r.v, '4'); eq('explorer', r => r.p.n, 'curl');
  eq('loyal', r => r.v, 'bench'); eq('loyal', r => r.p.n, 3);
  if (o.bestVol) bad.push('Best Session Volume should be gone');
  for (const id of ['proteinRun', 'kcalDays', 'meals', 'topFood', 'foodDays']) if (id in o) bad.push(`food stat ${id} is still in STATS`);
  // hiding rules
  const few = run([mk('2026-01-05', '18:00', [ex('bench', [100, 5])], [{ kind: 'w' }])]);
  for (const id of ['luckyDay', 'night', 'dawn', 'couch', 'big3', 'loyal']) if (few[id]) bad.push(`${id} should hide (not enough data)`);
  if (run(hist, { latestWeight: () => 0, targets: {} }).ratio) bad.push('ratio should hide without body weight');
  if (bad.length) bad.forEach(b => fail('stats: ' + b)); else ok('stats: 12 new training stats right on a fake history, hide without data, empty history is safe');
} catch (e) { fail('could not check the stats: ' + e.message); }

// 13. Rank plates (img/rank): all 30 files exist, are offline (sw.js SHELL), and are exactly the paths rankIcon() builds
try {
  const g = read('js/gym.js'), pick = re => { const m = g.match(re); if (!m) throw new Error('not found in gym.js: ' + re); return m[0]; };
  const rc = { esc: s => String(s), t: k => ({ tier_bronze: 'Bronze', tier_silver: 'Silver', tier_gold: 'Gold', tier_platinum: 'Platinum', tier_diamond: 'Diamond' })[k] || k }; vm.createContext(rc);
  vm.runInContext([(read('js/data/gym.js').match(/^const TIERS = .*$/m) || [''])[0], pick(/^const ROMAN = .*$/m), pick(/^const tierName = .*$/m), pick(/^const rankSrc = .*$/m),
    pick(/^function rankIcon\(tier, n, size\)\{[\s\S]*?\n.*\}$/m)].join('\n').replace(/^const /gm, 'var ') + '\n;this.__K = { TIERS, rankIcon };', rc);
  const { TIERS, rankIcon } = rc.__K, bad = [], files = [];
  for (const size of ['large', 'small']) for (const tier of TIERS) for (const r of ['III', 'II', 'I']) files.push(`img/rank/${size}/${tier}-${r}.svg`);
  files.forEach(f => { if (!fs.existsSync(path.join(root, f))) bad.push(`${f} is missing`); else if (!shell.includes(f)) bad.push(`${f} is not in the sw.js offline list`); });
  const built = new Set();
  for (let n = 0; n < 15; n++) for (const size of [20, 30, 35, 36, 44, 120]) {
    const tier = TIERS[Math.floor(n / 3)], html = rankIcon(tier, n, size), src = (html.match(/src="([^"]+)"/) || [])[1];
    const want = `img/rank/${size < 36 ? 'small' : 'large'}/${tier}-${['III', 'II', 'I'][n % 3]}.svg`; built.add(src);
    if (src !== want) bad.push(`rankIcon(${tier}, ${n}, ${size}) draws ${src}, expected ${want}`);
    if (!/^<img\b/.test(html) || !html.includes(`width="${size}"`) || !html.includes(`height="${size}"`)) bad.push(`rankIcon(${tier}, ${n}, ${size}) is not an <img> with a fixed size`);
    const alt = (html.match(/alt="([^"]*)"/) || [])[1]; if (!alt || !alt.endsWith(' ' + ['III', 'II', 'I'][n % 3])) bad.push(`rankIcon(${tier}, ${n}, ${size}) has alt "${alt}"`);
  }
  files.filter(f => !built.has(f)).forEach(f => bad.push(`${f} is never drawn by rankIcon()`));
  if (bad.length) bad.slice(0, 20).forEach(b => fail('rank plates: ' + b)); else ok(`rank plates: ${files.length} files, offline, and rankIcon() builds every path (n 0–14, small + large)`);
} catch (e) { fail('could not check the rank plates: ' + e.message); }

// 14. Rank Up / Rank Changed (js/rank-fx.js): a fake before and after rank list gives the right windows
try {
  const rc = {}; vm.createContext(rc);
  vm.runInContext(read('js/rank-fx.js') + '\n;this.__C = rankChanges;', rc);
  const rankChanges = rc.__C, bad = [];
  const before = { bench: 4, squat: 5, deadlift: 9, ohp: 7, row: 3 };
  const after = { bench: 5, squat: 6, deadlift: 8, ohp: 7, row: 3, curl: 0 };
  const got = Object.fromEntries(rankChanges(before, after).map(c => [c.exId, c]));
  const want = { bench: ['up', 4, 5], squat: ['tierup', 5, 6], deadlift: ['down', 9, 8], curl: ['first', null, 0] };
  for (const [id, [kind, from, to]] of Object.entries(want)) { const c = got[id];
    if (!c || c.kind !== kind || c.from !== from || c.to !== to) bad.push(`${id}: expected ${kind} ${from}→${to}, got ${c ? `${c.kind} ${c.from}→${c.to}` : 'nothing'}`); }
  ['ohp', 'row'].forEach(id => { if (got[id]) bad.push(`${id}: same rank as last seen must show nothing`); });
  if (Object.keys(got).length !== 4) bad.push(`${Object.keys(got).length} windows, expected 4`);
  if (rankChanges({ bench: 5 }, {}).length) bad.push('an exercise with no rank now must show nothing');
  if (rankChanges(before, after, ['bench']).length !== 1) bad.push('the exercise list (one workout) is not respected');
  if (rankChanges(undefined, { bench: 2 })[0].kind !== 'first') bad.push('nothing seen yet must count as first rank');
  if (bad.length) bad.forEach(b => fail('rank change: ' + b)); else ok('rank change: up, tier up, first rank, demote and no change give the right windows');
} catch (e) { fail('could not check rank changes: ' + e.message); }

// 7. Optional: open the app and catch start-up errors
// Food Coach complex meals (Refinements #5): the meal test list, offline
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/meal-test.js')], { stdio: 'pipe' }).toString(); ok('meals: ' + (out.match(/^ok /gm) || []).length + ' Food Coach meal cases pass (tools/meal-test.js)'); }
catch (e) { fail('meals: tools/meal-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }
// Food Coach 2.0 benchmark (offline): meal reading, corrections, quick answers, value checks, context, memory, matching, reference values
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/food-coach-test.js')], { stdio: 'pipe' }).toString(); ok(out.trim().split('\n').pop() + ' (tools/food-coach-test.js)'); }
catch (e) { fail('food coach: tools/food-coach-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }

// Storage safety (V3 hardening): failed writes, migrations, corrupt data, backups, all-or-nothing import (tools/store-test.js)
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/store-test.js')], { stdio: 'pipe' }).toString(); ok('store: ' + (out.match(/^ok /gm) || []).length + ' storage / backup / import safety checks pass (tools/store-test.js)'); }
catch (e) { fail('store: tools/store-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }

// Gym Coach intelligence (js/gym-intel.js + Gym Coach in gym.js): progression, evidence, live, hints, proposals + approval, memory, offline, Greek (tools/gym-coach-test.js)
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/gym-coach-test.js')], { stdio: 'pipe' }).toString(); ok('gym coach: ' + (out.match(/^ok /gm) || []).length + ' progression / live / approval / memory / offline checks pass (tools/gym-coach-test.js)'); }
catch (e) { fail('gym coach: tools/gym-coach-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }
// Changes #12 / #13: weekly streak, Streak Savers, Consistency Challenge, Stats pins + 24 h rotation (tools/streak-test.js)
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/streak-test.js')], { stdio: 'pipe' }).toString(); ok('streak + stats: ' + (out.match(/^ok /gm) || []).length + ' weekly streak / saver / challenge / pin / rotation checks pass (tools/streak-test.js)'); }
catch (e) { fail('streak + stats: tools/streak-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }
// RECOVERY+ (js/recovery-plus.js + js/recovery-anatomy.js): engine cases, sleep / food / goal context, snapshot contract, anatomy coverage (tools/recovery-test.js)
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/recovery-test.js')], { stdio: 'pipe' }).toString(); ok('recovery+: ' + (out.match(/^ok /gm) || []).length + ' engine / context / contract / anatomy checks pass (tools/recovery-test.js)'); }
catch (e) { fail('recovery+: tools/recovery-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }
// Athlete OS (js/athlete/*): events from saves, state, context budget + permissions, memory rules, supervisor (tools/athlete-test.js)
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/athlete-test.js')], { stdio: 'pipe' }).toString(); ok('athlete os: ' + (out.match(/^ok /gm) || []).length + ' event / state / context / memory / supervisor checks pass (tools/athlete-test.js)'); }
catch (e) { fail('athlete os: tools/athlete-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }

// Offline + update rules of sw.js (V3 hardening): errors never replace the offline copy, only app files cached, other sites untouched (tools/sw-test.js)
try { const out = execFileSync(process.execPath, [path.join(root, 'tools/sw-test.js')], { stdio: 'pipe' }).toString(); ok('service worker: ' + (out.match(/^ok /gm) || []).length + ' offline / update checks pass (tools/sw-test.js)'); }
catch (e) { fail('service worker: tools/sw-test.js\n' + String(e.stdout || '').split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }

// Docs map stays true (V3 hardening): every file path and plain `name()` in the architecture docs / CLAUDE.md exists,
// and every Store name has a row in the persistence inventory. A stale map is a warning to read the code, so it must not rot silently.
try {
  const docs = ['CLAUDE.md', ...fs.readdirSync(path.join(root, 'docs/architecture')).filter(f => f.endsWith('.md')).map(f => 'docs/architecture/' + f)];
  const allJs = [...scripts, 'sw.js'].filter(f => fs.existsSync(path.join(root, f))).map(read).join('\n');
  const bad = [];
  let nPath = 0, nSym = 0;
  for (const d of docs) for (const [, tok] of read(d).matchAll(/`([^`\n]+)`/g)) {
    for (const part of tok.split(/\s*[›>]\s*|,\s*/)) {
      const x = part.trim();
      if (/^(js|css|tools|docs|img|\.github)\/[\w.\/-]+$|^(sw\.js|index\.html)$/.test(x)) { nPath++; if (!fs.existsSync(path.join(root, x))) bad.push(`${d}: ${x} does not exist`); }
      const m = x.match(/^([A-Za-z_$][\w$]*)\(\)$/);
      if (m && !['fetch'].includes(m[1])) { nSym++; if (!new RegExp(`(function\\s+${m[1]}\\s*\\(|(const|let|var)\\s+${m[1]}\\s*=|,\\s*${m[1]}\\s*=\\s*(async\\s*)?(\\(|function\\b|[\\w$]+\\s*=>))`).test(allJs)) bad.push(`${d}: ${m[1]}() is not defined in any loaded script`); }
    }
  }
  const storeNames = [...read('js/platform/store.js').matchAll(/^\s+(?:[a-zA-Z]+: \[[^\]]+\],?\s*)+/gm)].join(' ').match(/\b([a-zA-Z]+): \['ft\./g).map(x => x.split(':')[0]);
  const inv = read('docs/architecture/contracts.md');
  storeNames.forEach(n => { if (!new RegExp(`\\b${n}\\b`).test(inv)) bad.push(`contracts.md: Store name "${n}" has no row in the persistence inventory`); });
  if (bad.length) bad.forEach(b => fail('docs map: ' + b)); else ok(`docs map: ${nPath} paths and ${nSym} functions named in CLAUDE.md + docs/architecture exist; all ${storeNames.length} Store names inventoried`);
} catch (e) { fail('docs map: could not check: ' + e.message); }

const STRICT = process.argv.includes('--strict');
async function boot() {
  let pw; try { pw = require('playwright'); } catch { (STRICT ? fail : note)('--boot skipped: Playwright not installed' + (STRICT ? ' (--strict: a skipped browser check is a failure)' : '')); return; }
  const http = require('http');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
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
    for (const h of ['#foods', '#meals', '#supps', '#today', '#gym', '#fridge', '#profile', '#settings']) { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(250); }
    await page.close();
  }
  // V3 hardening: Settings › Import in the real app. Same file twice adds nothing; a write that fails half way changes nothing and shows no success.
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); }); page.on('pageerror', e => errs.push('[import] ' + e.message));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: 'en', theme: { mode: 'dark', preset: 'lime' } }));
      localStorage.setItem('ft.foods.v1', JSON.stringify([{ id: 'keep', name: 'Keep Me' }])); });
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
    const file = (o, n) => ({ name: n || 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(o)) });
    const bk = { app: 'tracker', schema: 2, foods: [{ id: 'f1', name: 'Rice' }, { name: '<img src=x onerror=alert(1)>' }],
      dayLog: { '2026-11-01': [{ id: 'e1', kind: 'food', refId: 'f1', name: 'Rice', amt: 100, unit: 'g', kcal: 130 }] },
      gym: { sessions: [{ id: 's1', start: '2026-11-01T10:00:00Z', exercises: [] }, { exercises: [] }] } };
    const disk = () => page.evaluate(() => ({ foods: JSON.parse(localStorage.getItem('ft.foods.v1') || '[]').length, log: (JSON.parse(localStorage.getItem('ft.log.v1') || '{}')['2026-11-01'] || []).length,
      ses: JSON.parse(localStorage.getItem('ft.gym.sessions') || '[]').length, mem: foods.length, toast: document.getElementById('toastMsg').textContent, journal: localStorage.getItem('ft.journal.v1') }));
    const imp = async f => { await page.setInputFiles('#importInput', f); await page.waitForTimeout(400); return disk(); };
    const a = await imp(file(bk));
    const b = await imp(file(bk, 'again.json'));
    await page.evaluate(() => { location.hash = '#foods'; }); await page.waitForTimeout(300);
    const injected = await page.evaluate(() => !!document.querySelector('img[src="x"]'));
    await page.evaluate(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'ft.log.v1') { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); }; });
    const c = await imp(file({ ...bk, foods: [{ id: 'f2', name: 'Oats' }], dayLog: { '2026-11-02': [{ id: 'e2', kind: 'food', name: 'Oats', amt: 50 }] } }, 'late-fail.json'));
    await page.close();
    const bad = [];
    if (a.foods !== 3 || a.log !== 1 || a.ses !== 1 || a.mem !== 3 || !/Imported/.test(a.toast)) bad.push('first import ' + JSON.stringify(a));
    if (b.foods !== 3 || b.log !== 1 || b.ses !== 1 || b.mem !== 3) bad.push('second import of the same file added things ' + JSON.stringify(b));
    if (injected || dialogs.length) bad.push('a food name from a backup became HTML');
    if (c.foods !== 3 || c.mem !== 3 || /Imported/.test(c.toast) || c.journal) bad.push('failed import was partly applied or said it worked ' + JSON.stringify(c));
    if (bad.length) bad.forEach(x => fail('import (browser): ' + x)); else ok('import (browser): adds once, same file twice adds nothing, odd text stays text, a write that fails half way changes nothing and shows no success');
  } catch (e) { fail('import (browser): could not run: ' + e.message); }
  await browser.close(); srv.close();
  if (errs.length) [...new Set(errs)].forEach(e => fail('start-up: ' + e)); else ok('boot: app starts with no errors (dark + light)');
}

// Food Coach 2.0 end to end in the browser with a fake Gemini (--boot only: it needs Playwright)
function coachE2E() {
  try { const out = execFileSync(process.execPath, [path.join(root, 'tools/food-coach-e2e.js'), ...(STRICT ? ['--strict'] : [])], { stdio: 'pipe', timeout: 240000 }).toString();
    ok('food coach e2e: ' + (out.match(/^ok /gm) || []).length + ' browser cases pass (tools/food-coach-e2e.js); ' + ((out.match(/^speed[^\n]*/m) || [''])[0])); }
  catch (e) { fail('food coach e2e: tools/food-coach-e2e.js\n' + String(e.stdout || e.message).split('\n').filter(l => l.startsWith('FAIL')).join('\n')); }
}
// Exercise Picker V27 + Create Custom Exercise end to end in the browser (--boot only)
function pickerE2E() {
  try { const out = execFileSync(process.execPath, [path.join(root, 'tools/expick-e2e.js')], { stdio: 'pipe', timeout: 300000 }).toString();
    ok('exercise picker e2e: ' + (out.match(/^ok /gm) || []).length + ' browser cases pass (tools/expick-e2e.js)'); }
  catch (e) { fail('exercise picker e2e: tools/expick-e2e.js\n' + String(e.stdout || e.message).split('\n').filter(l => l.startsWith('FAIL') || /Error/.test(l)).join('\n')); }
}
aiTests().then(() => process.argv.includes('--boot') ? boot().then(coachE2E).then(pickerE2E) : null).then(() => {
  const partial = !process.argv.includes('--boot') ? ' (browser checks not run: add --boot)' : '';
  console.log(fails ? `\n${fails} problem(s) to fix.` : '\nAll checks passed.' + partial);
  process.exit(fails ? 1 : 0);
});
