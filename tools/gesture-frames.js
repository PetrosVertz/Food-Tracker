#!/usr/bin/env node
// Gesture frame pacing (Playwright + Chrome DevTools touch input): drives real touch drags and records the time between animation frames.
// Run: node tools/gesture-frames.js [--cpu 4] [--json FILE]    (measurement only; exit 0 unless the page errors)
// Gestures: Gym pill carousel swipe, Gym page swipe to the next section, live workout page swipe (6 exercises), a bottom sheet opening.
// Each row: frames, median and p95 frame time, frames over 1.5× the budget ("dropped"), longest frame, long tasks (≥ 50 ms).
// The budget is taken from the browser's own idle frame rate (60 Hz → 16.7 ms). Headless Chromium renders at 60 Hz: 120 Hz (8.3 ms) needs a real
// 120 Hz phone or screen (Safari Web Inspector timelines / Chrome DevTools Performance on the device).
const fs = require('fs'), path = require('path'), http = require('http');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const root = path.join(__dirname, '..'), cpu = +(arg('--cpu') || 1);
const pw = require('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if(!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, sleep = ms => new Promise(r => setTimeout(r, ms));
const set = (i, d) => ({ id: 's' + i, type: 'N', w: String(60 + i * 2.5), r: '8', done: d, ...(d ? { at: Date.now() - 1e4 } : {}) });
const live = () => ({ id: 'a1', date: new Date().toISOString().slice(0, 10), start: new Date(Date.now() - 6e5).toISOString(), clock0: Date.now() - 6e5, name: 'Push', type: 'push', prs: [],
  exercises: ['bench', 'ohp', 'incline_db', 'lateral_db', 'rope_pushdown', 'dips'].map((exId, k) => ({ exId, reps: '8', rest: 90, sets: [0, 1, 2, 3].map(i => set(i, k === 0 && i < 2)) })) });

(async () => {
  const browser = await pw.chromium.launch(), rows = [], errs = [];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  page.on('pageerror', e => errs.push(e.message));
  const cdp = await page.context().newCDPSession(page);
  await page.goto(`http://localhost:${port}/`);
  await page.evaluate(a => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: 'en', lastBackup: new Date().toISOString(), theme: { mode: 'dark' } }));
    localStorage.setItem('ft.profile.v1', JSON.stringify({ sex: 'm', name: 'T' })); localStorage.setItem('ft.gym.active', JSON.stringify(a)); }, live());
  await page.goto(`http://localhost:${port}/?r=1`); await sleep(500);
  await page.evaluate(() => { window.__lt = []; try{ new PerformanceObserver(l => l.getEntries().forEach(e => __lt.push(e.duration))).observe({ type: 'longtask', buffered: false }); }catch(e){}
    window.__rec = null; const loop = t => { if(__rec) __rec.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  if(cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  // the browser's own frame budget, from idle frames
  await page.evaluate(() => { __rec = []; }); await sleep(600); const idle = await page.evaluate(() => { const a = __rec; __rec = null; const d = a.slice(1).map((t, i) => t - a[i]).sort((x, y) => x - y); return d[d.length >> 1]; });
  const hz = Math.round(1000 / idle), budget = 1000 / hz;
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  // a drag from (x0,y0) by (dx,dy) over ms, one move every 8 ms (a 120 Hz touch panel), then a short settle
  const drag = async (x0, y0, dx, dy, ms) => { await touch('touchStart', x0, y0); const n = Math.round(ms / 8), t0 = Date.now();
    for(let i = 1; i <= n; i++){ const p = i / n, e = 1 - Math.pow(1 - p, 2); await touch('touchMove', x0 + dx * e, y0 + dy * e); const wait = t0 + i * 8 - Date.now(); if(wait > 0) await sleep(wait); }
    await touch('touchEnd'); };
  const measure = async (name, fn, settle) => { await page.evaluate(() => { __lt.length = 0; __rec = []; }); await fn(); await sleep(settle || 700);
    const r = await page.evaluate(() => { const a = __rec; __rec = null; return { d: a.slice(1).map((t, i) => t - a[i]), lt: __lt.slice() }; });
    const d = r.d.slice().sort((x, y) => x - y), q = k => d.length ? d[Math.min(d.length - 1, Math.floor(d.length * k))] : 0;
    rows.push({ gesture: name, frames: d.length, median: +q(.5).toFixed(1), p95: +q(.95).toFixed(1), dropped: r.d.filter(x => x > budget * 1.5).length, worst: +(d[d.length - 1] || 0).toFixed(1), longTasks: r.lt.length }); };

  await page.evaluate(() => { location.hash = 'gym-prog'; }); await sleep(800);
  let b = await page.locator('#gTabs .pcrow').boundingBox();
  await measure('Gym pills: swipe left one pill', () => drag(b.x + b.width * .7, b.y + b.height / 2, -b.width * .35, 0, 260));
  await measure('Gym pills: quick swipe back', () => drag(b.x + b.width * .3, b.y + b.height / 2, b.width * .4, 0, 140));
  b = await page.locator('#pgGym').boundingBox();
  await measure('Gym page: swipe to the next section', () => drag(b.x + b.width * .85, b.y + 420, -b.width * .6, 0, 300), 900);
  await page.evaluate(() => openSession()); await sleep(900);
  b = await page.locator('#sesBody').boundingBox();
  await measure('Live workout: swipe to the next exercise', () => drag(b.x + b.width / 2, b.y + b.height * .75, 0, -b.height * .55, 260), 1000);
  await measure('Live workout: swipe back', () => drag(b.x + b.width / 2, b.y + b.height * .3, 0, b.height * .55, 260), 1000);
  await measure('Bottom sheet: Exercise Settings opens', async () => { await page.evaluate(() => openExSet()); }, 700);
  await page.evaluate(() => close('ovExSet')); await sleep(500);

  const env = { browser: 'Chromium ' + browser.version() + ' headless (Playwright), 390×844 @3x, touch', refreshHz: hz, budgetMs: +budget.toFixed(1), cpuSlowdown: cpu };
  console.log(`${env.browser} · measured refresh ${hz} Hz (budget ${env.budgetMs} ms) · CPU slowdown ${cpu}×`);
  console.log('gesture'.padEnd(44) + 'frames  median  p95    dropped  worst   long tasks');
  rows.forEach(r => console.log(r.gesture.padEnd(44) + String(r.frames).padEnd(8) + String(r.median).padEnd(8) + String(r.p95).padEnd(7) + String(r.dropped).padEnd(9) + String(r.worst).padEnd(8) + r.longTasks));
  console.log('120 Hz (8.3 ms) not verifiable here: needs a real 120 Hz device.');
  if(arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ env, rows }, null, 1));
  if(errs.length) console.log('page errors: ' + errs.join(' | '));
  await browser.close(); srv.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
