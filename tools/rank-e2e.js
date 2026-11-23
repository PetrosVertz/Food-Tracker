#!/usr/bin/env node
// Athlete Rank v0.4 in the real app (Playwright). Run: node tools/rank-e2e.js [--shots DIR]   (exit 1 = a check failed)
// Card plate from v0.4 (incline Gold I, pull-ups Silver II); machine / cable slot = muted plate + red X; "Ranking not available" popover opens
// with tap and keyboard, closes with Escape (focus back) and an outside tap, Greek text; the Ranks switch hides both; Profile shows the same
// rank; a better set raises the card and Rank Up once, and a reload does not replay it; an upgrade from old seen ranks plays nothing.
const fs = require('fs'), path = require('path'), http = require('http');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const root = path.join(__dirname, '..'), shots = arg('--shots'); let fails = 0; const ok = (c, m) => { if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const pw = require('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if(!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, sleep = ms => new Promise(r => setTimeout(r, ms));
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const S = (k, w, r) => Array.from({ length: k }, () => ({ type: 'N', w: String(w), r: String(r), done: true }));
const ses = (id, n, exs) => ({ id, date: day(n), start: new Date(Date.now() + n * 864e5 - 36e5).toISOString(), end: new Date(Date.now() + n * 864e5).toISOString(), name: 'W', mins: 60, vol: 1, exercises: exs.map(([exId, sets]) => ({ exId, sets })) });
(async () => {
  const browser = await pw.chromium.launch(), errs = [];
  const open = async (o) => { const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: shots ? 2 : 1 }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://localhost:${port}/`);
    await p.evaluate(d => { localStorage.clear(); Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); }, {
      'ft.ui.v1': { setupDone: true, lang: o.lang || 'en', lastBackup: new Date().toISOString() }, 'ft.profile.v1': { sex: 'm', name: 'T', ...(o.profile || {}) }, 'ft.weights.v1': { [day(-30)]: 70 },
      'ft.gym.sessions': o.sessions || [ses('s1', -3, [['incline_bench', S(3, 60, 8)], ['pullup', S(1, '', 9)], ['leg_press', S(3, 120, 10)]])],
      ...(o.active ? { 'ft.gym.active': o.active } : {}) });
    await p.goto(`http://localhost:${port}/?r=1`); await sleep(1300); return p; };
  const live = { id: 'a1', date: day(0), start: new Date().toISOString(), clock0: Date.now(), name: 'Push', type: 'push', prs: [], exercises: [{ exId: 'incline_bench', reps: '8', rest: 90, sets: [{ type: 'N', w: '', r: '', done: false }] }, { exId: 'leg_press', reps: '10', rest: 90, sets: [{ type: 'N', w: '', r: '', done: false }] }] };
  // 1. card plates and the not-ranked slot
  let p = await open({ active: live });
  await p.evaluate(() => { if(!document.getElementById('ovSession').classList.contains('open')) openSession(); }); await sleep(600);
  const c = await p.evaluate(() => { const cards = document.querySelectorAll('#sesBody>.exc'), b0 = cards[0].querySelector('.tierbadge'), b1 = cards[1].querySelector('.tierbadge');
    return { inc: tierFor('incline_bench', null, true), pu: tierFor('pullup', null, true), lp: tierFor('leg_press'), b0: b0 && b0.className, b1: b1 && b1.className, x: !!(b1 && b1.querySelector('.rnax')) }; });
  ok(c.inc.label === 'Gold I' && /tr-gold/.test(c.b0) && c.pu.label === 'Silver II' && c.pu.next.reps === 11, `card: incline 60 × 8 → ${c.inc.label} plate; pull-ups 9 reps → ${c.pu.label} (next: ${c.pu.next.reps} reps)`);
  ok(c.lp.na === 'machine_cable' && /rankna/.test(c.b1) && c.x, 'leg press (machine): slot kept, muted plate with a red X');
  await p.click('#sesBody>.exc:nth-child(2) [data-rankna]'); await sleep(200);
  const pop = await p.evaluate(() => { const e = document.getElementById('tipPop'); return e ? { role: e.getAttribute('role'), txt: e.innerText, focus: document.activeElement === e } : null; });
  ok(pop && pop.role === 'dialog' && /^Ranking not available/.test(pop.txt) && /machine and cable resistance varies between equipment and gyms/.test(pop.txt) && pop.focus, 'tap: "Ranking not available" with the approved copy, as a focused dialog');
  if(shots) await p.screenshot({ path: path.join(shots, 'rank_na_popover.png') });
  await p.keyboard.press('Escape'); await sleep(100);
  ok(await p.evaluate(() => !document.getElementById('tipPop') && document.activeElement && document.activeElement.matches('[data-rankna]')), 'Escape closes it and focus returns to the plate');
  await p.focus('#sesBody>.exc:nth-child(2) [data-rankna]'); await p.keyboard.press('Enter'); await sleep(150);
  const kb = await p.evaluate(() => !!document.getElementById('tipPop')); await p.mouse.click(200, 30); await sleep(150);
  ok(kb && await p.evaluate(() => !document.getElementById('tipPop')), 'keyboard Enter opens it; a tap outside closes it');
  await p.evaluate(() => { setGx('rank', false); renderSession(); }); await sleep(150);
  ok(await p.evaluate(() => !document.querySelector('#sesBody .tierbadge')), 'Ranks switched off: neither plates nor the not-ranked mark show');
  await p.evaluate(() => { setGx('rank', true); renderSession(); }); await p.close();
  p = await open({ active: live, lang: 'el' }); await p.evaluate(() => { if(!document.getElementById('ovSession').classList.contains('open')) openSession(); }); await sleep(500);
  await p.click('#sesBody>.exc:nth-child(2) [data-rankna]'); await sleep(150);
  ok(/Η κατάταξη δεν είναι διαθέσιμη/.test(await p.evaluate(() => document.getElementById('tipPop').innerText)), 'Greek: «Η κατάταξη δεν είναι διαθέσιμη» with the Greek text'); await p.close();
  // 2. Profile, a better workout, Rank Up once, reload
  p = await open({});
  const prof = await p.evaluate(() => (profileData().ranks || []).find(x => x.exId === 'incline_bench'));
  ok(prof && prof.label === 'Gold I', `Profile shows the same rank (${prof && prof.label})`);
  const up = await p.evaluate(() => { const before = rankNow(['incline_bench']); const s = { id: 's2', date: todayKey(), start: new Date(Date.now() - 36e5).toISOString(), end: new Date().toISOString(), name: 'W', mins: 50, vol: 1,
      exercises: [{ exId: 'incline_bench', sets: [{ type: 'N', w: '70', r: '8', done: true }] }] }; sessions.push(s); saveG('ses'); const ch = RankFx.afterWorkout(s, before); return { ch, now: tierFor('incline_bench', null, true).label }; });
  ok(up.ch.length === 1 && up.ch[0].from === 8 && up.ch[0].to > 8 && up.now !== 'Gold I', `a better set (70 × 8): card ${up.now}, Rank Up ${up.ch[0] && up.ch[0].kind} once`);
  await p.reload(); await sleep(1500);
  ok(await p.evaluate(() => !document.getElementById('ovRankFx').classList.contains('open')), 'reload: no replayed Rank Up'); await p.close();
  // 3. upgrade from the old engine's seen ranks (higher than v0.4 gives): nothing plays, the baseline is set quietly
  p = await open({ profile: { rankSeen: { incline_bench: 13, pullup: 12 } } }); await sleep(600);
  const ug = await p.evaluate(() => ({ open: document.getElementById('ovRankFx').classList.contains('open'), v: profile.rankSeenV, seen: profile.rankSeen.incline_bench }));
  ok(!ug.open && /^v04:/.test(ug.v) && ug.seen === 8, `upgrade: old seen ranks replaced quietly (${ug.v}), no Rank Changed windows`); await p.close();
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close(); console.log(fails ? `\n${fails} check(s) failed` : '\nAll rank browser checks passed.'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
