#!/usr/bin/env node
// Status-bar strip check (0.7.10.7). Run from the repo root:  node tools/topstrip.js [safe-area px, default 59]
// A desktop browser has no status bar, so every env(safe-area-inset-top) is replaced with a fake height (59 px = a recent iPhone).
// Then, in Dark and Light, a bright red block is put at the very top of every page and every window (inside that page or window).
// The top of the screen must still show only one solid colour (the strip): nothing of a page or window may show under the clock.
// Needs Playwright. Exit code 1 when anything shows through.

const fs = require('fs');
const path = require('path');
const http = require('http');
const root = path.resolve(__dirname, '..');
const SA = Math.max(1, +(process.argv[2] || 59));   // at least 1 px (with 0 there is no strip to check)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const PAGES = ['foods', 'meals', 'supps', 'today', 'gym', 'gym-rec', 'fridge', 'groc', 'profile', 'settings'];

// one solid colour in the top SA rows? (reads the screenshot back through a canvas)
async function topClean(page) {
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: page.viewportSize().width, height: SA } });
  return page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let bad = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - d[0]) > 2 || Math.abs(d[i + 1] - d[1]) > 2 || Math.abs(d[i + 2] - d[2]) > 2) bad++;
    return { bad, red: d[0] > 200 && d[1] < 50 && d[2] < 50 }; }, buf.toString('base64'));
}
function probe(sel) {
  document.querySelectorAll('.redprobe').forEach(e => e.remove()); const host = document.querySelector(sel); if (!host) return false;
  const d = document.createElement('div'); d.className = 'redprobe'; d.style.cssText = 'position:fixed;left:0;right:0;top:0;height:120px;background:#f00;z-index:2147483000'; host.appendChild(d); return true;
}

async function main() {
  let pw; try { pw = require('playwright'); } catch { console.log('Playwright is not installed.'); process.exit(2); }
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    const ext = path.extname(f); let body = fs.readFileSync(f);
    if (/\.(css|js|html)$/.test(ext)) body = body.toString().replace(/env\(safe-area-inset-top(,[^)]*)?\)/g, SA + 'px');
    r.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }); r.end(body); }).listen(0);
  const port = srv.address().port, browser = await pw.chromium.launch(), fails = [];
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(sc => { try { const k = 'ft.ui.v1', u = JSON.parse(localStorage.getItem(k) || '{}'); u.setupDone = true; u.theme = Object.assign(u.theme || {}, { mode: sc }); localStorage.setItem(k, JSON.stringify(u)); } catch (e) {} }, scheme);
    const page = await ctx.newPage(); await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' }); await page.waitForTimeout(400);
    const check = async where => { const r = await topClean(page); if (r.bad || r.red) fails.push(`${scheme}  ${where}`); };
    for (const pg of PAGES) { await page.evaluate(x => { location.hash = x; }, pg); await page.waitForTimeout(350); if (await page.evaluate(probe, 'section.page:not(.hide)')) await check('page ' + pg); }
    await page.evaluate(() => { document.querySelectorAll('.redprobe').forEach(e => e.remove()); location.hash = 'today'; }); await page.waitForTimeout(300);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.overlay')].map(o => o.id));
    for (const id of ids) {
      await page.evaluate(() => document.querySelectorAll('.overlay.open').forEach(o => close(o.id))); await page.waitForTimeout(260);
      const ok = await page.evaluate(id => { try { if (id === 'ovCoach') Coach.open('chef'); else open(id); return true; } catch (e) { return false; } }, id);
      if (!ok) continue; await page.waitForTimeout(420);
      if (await page.evaluate(probe, '#' + id + ' .sheet')) await check('window ' + id);
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  fails.forEach(f => console.log('shows under the clock: ' + f));
  console.log(fails.length ? `\n${fails.length} place(s) show through the strip.` : `Strip OK: nothing shows in the top ${SA} px on any page or window (dark + light).`);
  process.exit(fails.length ? 1 : 0);
}
main();
