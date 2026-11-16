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


// 10. AI provider layer (js/platform/ai-provider.js): fake network, no key needed. Tries, errors, retries, usage, cancel.
async function aiTests() {
  const bad = [];
  const mk = script => {   // script: list of replies in order; a reply is { status, body } or { throw: 'AbortError' | 'net' }
    const calls = [];
    const c = { console: { log() {}, warn() {} }, setTimeout, clearTimeout, Promise, JSON, Date, Math, Object, Error, Array, Set, String, Number, AbortController,
      settings: { geminiKey: 'k', model: 'm1' }, DEFAULT_MODEL: 'm1', Store: { load: () => ({ at: Date.now(), tag: 'k', list: ['m1', 'm2', 'm3'] }), save() {} },
      t: (k, v) => k + (v && v.e ? ':' + v.e : '') };
    c.fetchT = async (url) => {
      calls.push(decodeURIComponent(url.split('/models/')[1] || url));
      const r = script.shift() || { status: 200, body: { candidates: [{ content: { parts: [{ text: '{"ok":1}' }] } }] } };
      if (r.throw) { const e = new Error(r.throw); e.name = r.throw === 'AbortError' ? 'AbortError' : 'TypeError'; throw e; }
      return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
    };
    vm.createContext(c);
    vm.runInContext(read('js/platform/ai-provider.js') + '\n;this.__P = { AIProvider, GeminiProvider, AnthropicProvider };', c);
    return { P: c.__P, calls, c };
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
  const t0 = Date.now(); res = await r.P.AIProvider.run(req);
  if (res.json.a !== 4 || r.calls.join() !== 'm1:generateContent,gemini-flash-latest:generateContent,gemini-flash-lite-latest:generateContent' || Date.now() - t0 < 600) bad.push('429/503 must try the next model after a short pause');
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
  // tiers: advanced puts the strongest first; default starts with Settings model
  r = mk([good('{"a":1}')]); r.c.settings.modelAdvanced = 'mx'; await r.P.AIProvider.run({ ...req, tier: 'advanced' });
  if (r.calls[0] !== 'mx:generateContent') bad.push('advanced tier ignores settings.modelAdvanced');
  r = mk([good('{"a":1}')]); await r.P.AIProvider.run(req); if (r.calls[0] !== 'm1:generateContent') bad.push('default tier must start with settings.model');
  // an unimplemented provider says so
  r = mk([]); r.c.settings.provider = 'anthropic'; e = await fails(() => r.P.AIProvider.run(req));
  if (!e || e.kind !== 'unsupported' || r.calls.length) bad.push('Anthropic stub must refuse, not pretend');

  // telemetry (js/platform/ai-usage.js): counts, tokens only when reported, no message text, 30 days kept
  {
    const mem = {}; const c = { ...mk([]).c }; for (const k of ['AIProvider','GeminiProvider','AnthropicProvider']) delete c[k]; const c0 = c; const fresh = {}; for (const k of Object.keys(c0)) if (!/^(AI|Gemini|Anthropic|__)/.test(k)) fresh[k] = c0[k]; vm.createContext(fresh);
    const c1 = fresh; c1.Store = { load: (k, d) => k === 'models' ? { at: Date.now(), tag: 'k', list: ['m1', 'm2'] } : (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), save: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); return true; } };
    c1.todayKey = () => '2026-11-16'; c1.lang = 'en';
    const q = [good('{"a":1}', { promptTokenCount: 7, candidatesTokenCount: 3, totalTokenCount: 10 }), good('nope'), good('{"a":2}'), { status: 503, body: { error: { message: 'busy' } } }];
    let n = 0; c1.fetchT = async () => { const r = q[n++] || { status: 500, body: { error: { message: 'x' } } }; return { ok: r.status < 300, status: r.status, json: async () => r.body }; };
    vm.runInContext(read('js/platform/ai-provider.js') + '\n' + read('js/platform/ai-usage.js') + '\n;this.__U = { AIProvider, AIUsage };', c1);
    const { AIProvider, AIUsage } = c1.__U;
    await AIProvider.run({ prompt: 'SECRET MESSAGE', json: true, task: 'chat' });                   // 1 try, with tokens
    await AIProvider.run({ prompt: 'SECRET MESSAGE', json: true, tier: 'advanced' });              // unreadable, then ok: 2 tries, no tokens
    await fails(() => AIProvider.run({ prompt: 'SECRET MESSAGE', json: true, search: true }));     // every model busy: failed
    const d = JSON.parse(JSON.stringify(mem.aiUsage)).days['2026-11-16'], s1 = AIUsage.sum(1);
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
    for (const h of ['#foods', '#meals', '#supps', '#today', '#gym', '#fridge', '#profile', '#settings']) { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(250); }
    await page.close();
  }
  await browser.close(); srv.close();
  if (errs.length) [...new Set(errs)].forEach(e => fail('start-up: ' + e)); else ok('boot: app starts with no errors (dark + light)');
}

aiTests().then(() => process.argv.includes('--boot') ? boot() : null).then(() => {
  console.log(fails ? `\n${fails} problem(s) to fix.` : '\nAll checks passed.');
  process.exit(fails ? 1 : 0);
});
