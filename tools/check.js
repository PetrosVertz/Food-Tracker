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
