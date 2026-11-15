#!/usr/bin/env node
// Overlap finder. Run from the repo root:  node tools/overlap.js [--json] [--only=text]
// Opens every page and every pop-up window at 375×812 and 390×844, Dark and Light, and lists
//  - text or buttons whose boxes sit on top of each other,
//  - text that is cut off (clipped without "…"),
//  - content at the very bottom of a page that stays hidden behind the bottom pills / bar.
// Needs Playwright. Exit code 1 when anything is found.

const fs = require('fs');
const path = require('path');
const http = require('http');
const root = path.resolve(__dirname, '..');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
const asJson = process.argv.includes('--json');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const PAGES = ['foods', 'meals', 'supps', 'today', 'gym', 'gym-rec', 'fridge', 'groc', 'profile', 'settings'];
const SIZES = [[375, 812], [390, 844]];

// runs inside the page: returns the list of problems for the given scope (a page or the top window)
function scan(scopeSel, mode) {
  const scope = document.querySelector(scopeSel); if (!scope) return { skip: true, list: [] };
  const vw = innerWidth, vh = innerHeight, out = [];
  const label = el => { const id = el.id ? '#' + el.id : ''; const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return el.tagName.toLowerCase() + id + (c ? '.' + c : ''); };
  const vis = el => { const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < .05) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const shown = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (!vis(e)) return false;
    if (e.parentElement && e.parentElement.tagName === 'DETAILS' && !e.parentElement.open && e.tagName !== 'SUMMARY') return false;   // closed "How to…" boxes
    if (e.classList && e.classList.contains('hbar')) return false; } return true; };   // the bar labels are drawn twice on purpose (dark + inverted)
  // clipped by a scrolling / hidden ancestor? then only the visible part counts
  const clip = (el, r) => { let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) { const cs = getComputedStyle(p);
      if (/(hidden|auto|scroll|clip)/.test(cs.overflowX + cs.overflowY)) { const b = p.getBoundingClientRect(); x1 = Math.max(x1, b.left); y1 = Math.max(y1, b.top); x2 = Math.min(x2, b.right); y2 = Math.min(y2, b.bottom); } }
    return x2 - x1 > 1 && y2 - y1 > 1 ? { left: x1, top: y1, right: x2, bottom: y2 } : null; };
  const items = [];
  const add = (el, r, kind, text) => { if (!shown(el)) return; const c = clip(el, r); if (!c) return; if (c.bottom < 0 || c.top > vh || c.right < 0 || c.left > vw) return; items.push({ el, r: c, kind, text }); };
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const txt = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!txt) continue; const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|OPTION)$/.test(el.tagName)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1); if (!rs.length) continue;
    rs.forEach(r => add(el, r, 'text', txt.slice(0, 28)));   // one box per line, so wrapped text never counts as a big block
  }
  scope.querySelectorAll('button,input,select,textarea,svg,img,canvas').forEach(el => { if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
    let r = el.getBoundingClientRect(); if (el.classList.contains('ibtn') && el.querySelector('svg')) r = el.querySelector('svg').getBoundingClientRect();   // the info button's 44 px tap area is invisible: use the round chip
    if (el.tagName.toLowerCase() === 'svg' && el.closest('button,a,label,.knob')) return;   // an icon inside its own button is not a second thing
    add(el, r, el.tagName.toLowerCase(), (el.getAttribute('aria-label') || el.placeholder || el.textContent || '').trim().slice(0, 24)); });
  // floating things that sit on the page (bottom bar, pills, rail) — only counted for the page scan, when scrolled to the end
  const fixed = [];
  if (mode === 'page') document.querySelectorAll('.fab,.coachpill,#rail,.rail,.bbar,.bar,#fab,#fab2').forEach(el => { if (!vis(el) || getComputedStyle(el).position !== 'fixed') return; fixed.push(el); });
  const inA = (a, b) => a.el.contains(b.el) || b.el.contains(a.el);
  const seen = new Set();
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (inA(a, b)) continue;
    if ((a.kind === 'svg' && /^(input|textarea)$/.test(b.kind)) || (b.kind === 'svg' && /^(input|textarea)$/.test(a.kind))) continue;   // a search icon inside its field
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 2 && h > 3 && w * h > 12) { const key = label(a.el) + '|' + label(b.el); if (seen.has(key)) continue; seen.add(key);
      // two stacked controls that merely share an edge row are fine; a text over a different element's box is not
      out.push({ type: 'overlap', a: `${a.kind} "${a.text}" ${label(a.el)}`, b: `${b.kind} "${b.text}" ${label(b.el)}`, px: `${Math.round(w)}×${Math.round(h)}` }); }
  }
  // cut-off text: clipped box that is not meant to end in "…"
  scope.querySelectorAll('*').forEach(el => { if (!shown(el)) return; const cs = getComputedStyle(el); if (!/(hidden|clip)/.test(cs.overflowX)) return; if (cs.textOverflow === 'ellipsis' || cs.whiteSpace === 'nowrap' && cs.textOverflow === 'ellipsis') return;
    if (!el.childNodes.length || ![...el.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim())) return;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) out.push({ type: 'cut-off', a: `${label(el)} "${(el.textContent || '').trim().slice(0, 28)}"`, px: `${el.scrollWidth}px of ${el.clientWidth}px` }); });
  // text running outside the screen sideways
  items.forEach(it => { if (it.kind === 'text' && (it.r.right > vw + 1 || it.r.left < -1) && !it.el.closest('.chips,.hscroll,[data-scroll],.seg')) out.push({ type: 'off-screen', a: `${it.kind} "${it.text}" ${label(it.el)}`, px: `${Math.round(it.r.left)}…${Math.round(it.r.right)} of ${vw}` }); });
  // side margins: text closer than 16 px to the screen edge (pages only)
  if (mode === 'page') items.forEach(it => { if (it.kind === 'text' && (it.r.left < 15 || it.r.right > vw - 15) && !it.el.closest('.chips,.rail,#rail,.seg,.fab,.coachpill,button,header')) out.push({ type: 'margin', a: `${it.kind} "${it.text}" ${label(it.el)}`, px: `${Math.round(it.r.left)} / ${Math.round(vw - it.r.right)} px from the edge` }); });
  // page end: last real content versus the floating bar
  if (mode === 'page') {
    const bars = fixed.map(f => f.getBoundingClientRect()).filter(r => r.top > vh * .5);
    const content = items.filter(it => !it.el.closest('.fab,.coachpill,#rail,.rail,.bbar,.bar,#fab,#fab2,header'));
    const lowest = content.reduce((m, it) => Math.max(m, it.r.bottom), 0);
    const barTop = bars.reduce((m, r) => Math.min(m, r.top), vh);
    if (bars.length && lowest > barTop - 8) out.push({ type: 'hidden-by-bar', a: `lowest content ends at ${Math.round(lowest)}px, bar starts at ${Math.round(barTop)}px` });
  }
  return { list: out };
}

async function main() {
  let pw; try { pw = require('playwright'); } catch { console.log('Playwright is not installed.'); process.exit(2); }
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const port = srv.address().port, browser = await pw.chromium.launch(), report = [];
  for (const [w, h] of SIZES) for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { const k = 'ft.ui.v1', u = JSON.parse(localStorage.getItem(k) || '{}'); u.setupDone = true; localStorage.setItem(k, JSON.stringify(u)); } catch (e) {} });
    const page = await ctx.newPage(); await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' }); await page.waitForTimeout(400);
    const tag = `${w}×${h} ${scheme}`, push = (where, res) => res.list.forEach(p => report.push({ tag, where, ...p }));
    const closeAll = () => page.evaluate(() => document.querySelectorAll('.overlay.open').forEach(o => { o.classList.remove('open'); }) || document.body.classList.remove('ovopen'));
    for (const pg of PAGES) {
      if (only && !pg.includes(only)) continue;
      await closeAll(); await page.evaluate(x => { location.hash = x; }, pg); await page.waitForTimeout(450);
      const sel = await page.evaluate(() => { const s = document.querySelector('section.page:not(.hide)'); return s ? '#' + s.id : null; }); if (!sel) continue;
      await page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('section.page').forEach(s => s.scrollTop = 0); });
      push('page ' + pg + ' (top)', await page.evaluate(scan, [sel, 'page']));
      // scroll to the very end and look again: nothing may hide behind the bottom pills
      await page.evaluate(() => { window.scrollTo(0, 1e6); document.querySelectorAll('section.page').forEach(s => s.scrollTop = 1e6); }); await page.waitForTimeout(150);
      push('page ' + pg + ' (end)', await page.evaluate(scan, [sel, 'page']));
    }
    await page.evaluate(() => { location.hash = 'today'; }); await page.waitForTimeout(300);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.overlay')].map(o => o.id));
    for (const id of ids) {
      if (only && !id.toLowerCase().includes(only.toLowerCase())) continue;
      await closeAll();
      const ok = await page.evaluate(id => { try { if (id === 'ovCoach') Coach.open('chef'); else if (id === 'ovSession') { return false; } else open(id); return true; } catch (e) { return false; } }, id);
      if (!ok) continue; await page.waitForTimeout(450);
      push('window ' + id, await page.evaluate(scan, ['#' + id + '.open .sheet', 'window']));
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  if (asJson) console.log(JSON.stringify(report, null, 1));
  else {
    const groups = {}; report.forEach(r => { const k = `${r.type}  ${r.where.replace(/ \((top|end)\)/, '')}  ${r.a}${r.b ? '  ↔  ' + r.b : ''}`; (groups[k] = groups[k] || new Set()).add(r.tag + (r.px ? ' ' + r.px : '')); });
    Object.entries(groups).forEach(([k, v]) => console.log(k + '\n      ' + [...v].join(' | ')));
    console.log(`\n${Object.keys(groups).length} problem(s) in ${report.length} places.`);
  }
  process.exit(report.length ? 1 : 0);
}
main();
