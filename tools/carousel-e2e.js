#!/usr/bin/env node
// Shared pill carousel (Gym + Food Library) in the real app (Playwright). Run: node tools/carousel-e2e.js   (exit 1 = a check failed)
// Checks: Gym has 4 pills and no Partner anywhere (pill, text, route); an old #gym-partner link and a saved last page "gym-partner" land on the
// Gym hub; the chosen pill's title has room for its bold italic + outline (clip box wider than the letters) in English and Greek, also with
// larger text; a pill chosen with the keyboard (Enter) routes and the strip follows; Food Library pills still route; no page errors.
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.join(__dirname, '..'); let fails = 0; const ok = (c, m) => { if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const pw = require('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if(!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await pw.chromium.launch(), errs = [];
  const open = async (lang, uiExtra) => { const p = await browser.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://localhost:${port}/`);
    await p.evaluate(([l, x]) => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: l, lastBackup: new Date().toISOString(), theme: { mode: 'dark' }, ...x })); }, [lang, uiExtra || {}]);
    await p.goto(`http://localhost:${port}/?r=1`); await sleep(400); return p; };
  const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await sleep(600); };
  // 1. Partner is gone
  let p = await open('en'); await go(p, 'gym-prog');
  const g = await p.evaluate(() => { const mid = [...document.querySelectorAll('#gTabs .pcrow>button:not([aria-hidden])')]; return { keys: mid.map(b => b.dataset.car), soon: document.querySelectorAll('#gTabs .soon').length,
    partner: /partner|συνεργάτ/i.test(document.getElementById('pgGym').innerText) || typeof S.hubPartner !== 'undefined' }; });
  ok(g.keys.join() === 'gym-lib,gym-prog,gym-week,gym-rec' && !g.soon && !g.partner, `Gym pills: ${g.keys.join(', ')}; no Coming Soon slot, no Partner text or string`);
  await go(p, 'gym-partner'); const h1 = await p.evaluate(() => ({ h: location.hash, shown: !document.getElementById('pgGym').classList.contains('hide') }));
  ok(h1.h === '#gym' && h1.shown, `an old #gym-partner link lands on the Gym hub (${h1.h})`); await p.close();
  p = await open('en', { lastIn_gym: 'gym-partner' }); await p.evaluate(() => { history.replaceState(null, '', '#gym-partner'); route(); }); await sleep(400);
  ok(await p.evaluate(() => location.hash === '#gym' && ui.lastIn_gym === 'gym'), 'a saved last page "gym-partner" is replaced by the Gym hub'); await p.close();
  // 2. the chosen title is not cut (EN, GR, larger text)
  for(const [lang, hash, z] of [['en', 'gym-prog', 1], ['el', 'gym-week', 1], ['el', 'gym-rec', 1.3], ['el', 'meals', 1.3]]){
    p = await open(lang); await go(p, hash);
    if(z !== 1){ await p.evaluate(z => { document.querySelectorAll('.pcar').forEach(c => { c.style.fontSize = z + 'em'; }); dispatchEvent(new Event('resize')); }, z); await sleep(400); }
    const sel = hash.startsWith('gym') ? '#gTabs' : '#fTabs';
    const m = await p.evaluate(sel => { const b = document.querySelector(sel + ' .pcrow>button.on b'), r = document.createRange(); r.selectNodeContents(b);
      const ink = r.getBoundingClientRect(), cs = getComputedStyle(b), pad = parseFloat(cs.paddingLeft), box = b.getBoundingClientRect();
      return { txt: b.textContent, room: +(pad).toFixed(1), inside: ink.left >= box.left + pad - .5 && ink.right <= box.right - pad + .5, ell: b.scrollWidth > b.clientWidth + 1 }; }, sel);
    ok(m.room >= 2.5 && m.inside && !m.ell, `${lang} ${hash}${z !== 1 ? ' at ' + z + '× text' : ''}: chosen "${m.txt}" has ${m.room} px room each side for the slant and outline, not cut`);
    await p.close(); }
  // 3. keyboard + Food routes
  p = await open('en'); await go(p, 'gym-prog');
  await p.focus('#gTabs .pcrow>button[data-car="gym-week"]:not([aria-hidden])'); await p.keyboard.press('Enter'); await sleep(700);
  ok(await p.evaluate(() => location.hash === '#gym-week' && document.querySelector('#gTabs .pcrow>button.on').dataset.car === 'gym-week' && !document.getElementById('gPlanV').classList.contains('hide')), 'keyboard Enter on Week Planner: route, chosen pill and section agree');
  await go(p, 'foods'); await p.click('#fTabs .pcrow>button[data-car="supps"]:not([aria-hidden])'); await sleep(700);
  ok(await p.evaluate(() => location.hash === '#supps' && !document.getElementById('foodSupps').classList.contains('hide')), 'Food Library pills still route (Supplements)');
  await p.close();
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close(); console.log(fails ? `\n${fails} check(s) failed` : '\nAll carousel checks passed.'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
