#!/usr/bin/env node
// RECOVERY+ personal memory, forecast journal and ready range in the real app (Playwright). Run: node tools/recovery-memory-e2e.js
// Checks: the journal saves the forecast AS ISSUED (window + training-only comparator) and is bounded, an edited workout never rewrites it,
// Advanced shows what was learned and how forecasts did, Today says the same range as the Recovery page, opt-out of a source removes its entries from evaluation.
const fs = require('fs'), path = require('path'), http = require('http'), pw = require('playwright');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if(!fs.existsSync(f)){ r.writeHead(404); return r.end(); }
  const t = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream'; r.writeHead(200, { 'Content-Type': t }); fs.createReadStream(f).pipe(r); }).listen(0);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if(!c) fails++; };
(async () => { const b = await pw.chromium.launch(), errs = [], H = 36e5, now = Date.now();
  const set = o => ({ id: Math.random().toString(36).slice(2), type: 'N', w: '60', r: '5', done: true, ...o });
  const mk = (i, ago, ex) => ({ id: 's' + i, date: new Date(now - ago * H).toISOString().slice(0, 10), start: new Date(now - ago * H - H).toISOString(), end: new Date(now - ago * H).toISOString(), name: 'T', type: 'full', exercises: ex });
  const sessions = [...Array.from({ length: 8 }, (_, i) => mk(i, 200 - i * 24, [{ exId: 'db_curl', sets: [set(), set(), set()] }])), mk(20, 4, [{ exId: 'preacher', sets: [set({ type: 'F' }), set({ type: 'F' }), set({ type: 'F' })] }])];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
  const u = 'http://localhost:' + srv.address().port + '/'; await pg.goto(u);
  await pg.evaluate(ss => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: 'en', lastBackup: new Date().toISOString(), recAdv: true })); localStorage.setItem('ft.profile.v1', JSON.stringify({ sex: 'm', name: 'T' })); localStorage.setItem('ft.gym.sessions', JSON.stringify(ss)); }, sessions);
  await pg.goto(u + '?r=1'); await pg.waitForTimeout(700);
  // journal: as issued, minimal, versioned
  const j1 = await pg.evaluate(() => { RecoveryPlus.journal('workout'); const j = JSON.parse(localStorage.getItem('ft.recjournal.v1') || 'null'); return j; });
  ok(j1 && j1.v === 1 && j1.e.length === 1 && j1.e[0].v === 1 && Object.keys(j1.e[0].w).length > 0 && j1.e[0].w.biceps.length === 4, 'the forecast is saved as issued: version, history fingerprint, window and the training-only comparator per muscle');
  const win = j1.e[0].w.biceps; ok(win[1] > win[0] && win[3] > win[2], 'every saved window has an earliest and a latest time');
  // a history edit never rewrites what was issued; the entry becomes ineligible instead
  const after = await pg.evaluate(() => { const before = localStorage.getItem('ft.recjournal.v1'); sessions[2].end = new Date(Date.parse(sessions[2].end) + 5 * 36e5).toISOString(); RecoveryPlus.invalidate();
    const m = RecoveryPlus.memory(); return { same: before === localStorage.getItem('ft.recjournal.v1'), obsolete: m.evaluation.ineligible.obsolete, n: m.evaluation.n }; });
  ok(after.same && after.obsolete === 1 && after.n === 0, 'editing a workout leaves the saved forecast untouched and marks it obsolete for evaluation');
  // bounded
  const bound = await pg.evaluate(() => { for(let i = 0; i < 200; i++){ const j = JSON.parse(localStorage.getItem('ft.recjournal.v1')); j.e.push({ ...j.e[0], at: j.e[0].at + i }); localStorage.setItem('ft.recjournal.v1', JSON.stringify(j)); }
    sessions[2].end = new Date(Date.parse(sessions[2].end) - 5 * 36e5).toISOString(); RecoveryPlus.invalidate(); RecoveryPlus.journal('workout'); return JSON.parse(localStorage.getItem('ft.recjournal.v1')).e.length; });
  ok(bound <= 120, 'the journal stays bounded (' + bound + ' entries)');
  // opt-out of a context source: entries issued with it are left out
  const off = await pg.evaluate(() => { const j = JSON.parse(localStorage.getItem('ft.recjournal.v1')); j.e = [{ ...j.e[j.e.length - 1], cx: ['sleep'], at: j.e[j.e.length - 1].at }]; localStorage.setItem('ft.recjournal.v1', JSON.stringify(j)); settings.recNoSleep = true; RecoveryPlus.invalidate(); return RecoveryPlus.memory().evaluation.ineligible; });
  ok(off.sourceOff === 1, 'switching a source off removes forecasts issued with it from every future evaluation');
  // Advanced shows memory + evaluation; Today and the Recovery page say the same range
  await pg.evaluate(() => { settings.recNoSleep = false; RecoveryPlus.invalidate(); location.hash = 'gym-rec'; }); await pg.waitForTimeout(900);
  const page = await pg.evaluate(() => ({ txt: document.getElementById('gRecV').textContent, tiles: [...document.querySelectorAll('.rectile .rth b')].map(e => e.textContent), cd: recCd(RecoveryPlus.compute().tr.groups.arms) }));
  ok(/What It Has Learned About You/.test(page.txt) && /How Its Forecasts Did/.test(page.txt), 'Advanced shows what it has learned and how its forecasts did');
  ok(page.tiles.some(x => x === page.cd) && /\d+–\d+ h|About|Likely/.test(page.cd), 'the tile and the engine say the same range: ' + page.cd);
  const bar = await pg.evaluate(() => { const k = todayKey(); days[k] = { type: 'rest' }; return { hit: recoveryWarnings(), cd: recCd(RecoveryPlus.compute().tr.groups.arms) }; });
  ok(bar.hit.some(x => x.includes('(' + bar.cd + ')')), 'the rest-day line on the Gym hub says the same range as the Recovery page: ' + (bar.hit[0] || '(no line)'));
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 2)));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0); })();
