#!/usr/bin/env node
// Achievements in the real app (Playwright). Run: node tools/ach-e2e.js [--shots DIR]   (exit 1 = a check failed)
// A real Finish Workout: Workout Done opens, then ONE pop-up (title only, "+N more" for a batch); tap opens the details and back returns to Workout Done;
// swipe up / the hidden Dismiss button close it; reduced motion fades in place; the Hub has Achievements beside Share a Workout with the collection, filters,
// locked secrets with no text at all, Greek; saving again or reloading repeats nothing; the first run with old history gives one catch-up summary.
const fs = require('fs'), path = require('path'), http = require('http');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const root = path.join(__dirname, '..'), shots = arg('--shots'); let fails = 0; const ok = (c, m) => { if (c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const pw = require('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, sleep = ms => new Promise(r => setTimeout(r, ms));
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const set = (w, r, at) => ({ type: 'N', w: String(w), r: String(r), done: true, at });
(async () => {
  const browser = await pw.chromium.launch(), errs = [];
  const open = async (o) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: o.reduce ? 'reduce' : 'no-preference' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://localhost:${port}/`);
    await p.evaluate(d => { localStorage.clear(); Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); }, {
      'ft.ui.v1': { setupDone: true, lang: o.lang || 'en', lastBackup: new Date().toISOString() }, 'ft.profile.v1': { sex: 'm', name: 'T', ...(o.profile || {}) }, 'ft.weights.v1': { [day(-30)]: 80 },
      'ft.gym.sessions': o.sessions || [], ...(o.active ? { 'ft.gym.active': o.active } : {}) });
    await p.goto(`http://localhost:${port}/?r=1`); await sleep(1400); return p; };
  const now = Date.now();
  const finish = async (p) => { await p.evaluate(() => { if (!document.getElementById('ovSession').classList.contains('open')) openSession(); }); await sleep(500);
    await p.locator('#sesFinish').dispatchEvent('pointerdown', { button: 0, isPrimary: true }); await sleep(1000); await p.locator('#sesFinish').dispatchEvent('pointerup', { button: 0 }); await sleep(1800);
    for (let k = 0; k < 4; k++) { if (!(await p.evaluate(() => document.getElementById('ovRankFx').classList.contains('open')))) break; await p.click('#rfxOk'); await sleep(900); }   // Rank Up screens come first, Next is the only way on
    await sleep(1200); };
  const live = { id: 'a1', date: day(0), start: new Date(now - 36e5).toISOString(), clock0: now - 36e5, name: 'Push', type: 'push', prs: [],
    exercises: [{ exId: 'bench', reps: '8', rest: 90, sets: [set(60, 8, now - 3e5), set(60, 8, now - 2e5)] }, { exId: 'squat', reps: '8', rest: 90, sets: [set(80, 8, now - 1e5)] }] };
  // 1. a real Finish Workout
  let p = await open({ active: live, sessions: [] });
  await finish(p);
  ok(await p.evaluate(() => document.getElementById('ovSummary').classList.contains('open')), 'Finish Workout: Workout Done is on screen');
  let st = await p.evaluate(() => { const e = document.getElementById('achPop'); return e && { live: e.classList.contains('live'), txt: e.innerText, role: e.getAttribute('role'), sr: e.querySelector('.achsr').textContent }; });
  ok(st && st.live && /Achievement unlocked/.test(st.txt) && /Press Start/.test(st.txt) && st.role === 'status', 'one pop-up appears over Workout Done: "Achievement unlocked" then the title');
  ok(!/Last|apart|Workout #/.test(st.txt), 'the pop-up carries the title only; the explanation is in the details');
  if (shots) await p.screenshot({ path: path.join(shots, 'ach_popup.png') });
  await sleep(1500);
  st = await p.evaluate(() => ({ second: document.getElementById('achPop').classList.contains('second') })); ok(st.second, 'the title rises in after the first line');
  // tap -> details; back -> Workout Done
  await p.click('#achPop .achhit'); await sleep(500);
  ok(await p.evaluate(() => document.getElementById('ovAch').classList.contains('open') && /how you earn it/i.test(document.getElementById('achDet').innerText) && /what you did/i.test(document.getElementById('achDet').innerText)), 'tap opens the details with how you earn it and what you did');
  if (shots) await p.screenshot({ path: path.join(shots, 'ach_detail.png') });
  await p.evaluate(() => goBack ? goBack() : close('ovAch')); await sleep(500);
  ok(await p.evaluate(() => !document.getElementById('ovAch').classList.contains('open') && document.getElementById('ovSummary').classList.contains('open')), 'back from the details returns to Workout Done');
  // idempotent
  const before = await p.evaluate(() => JSON.stringify(profile.ach.got)); const again = await p.evaluate(() => Ach.record('workout').length + Ach.record('import').length);
  ok(again === 0 && before === await p.evaluate(() => JSON.stringify(profile.ach.got)), 'running it again (duplicate save / import / repaint) adds nothing and changes nothing');
  // 2. the Hub
  await p.evaluate(() => { closeAll && closeAll(); }).catch(() => {}); await p.evaluate(() => { ['ovSummary', 'ovAch'].forEach(i => close(i)); location.hash = '#profile'; }); await sleep(700);
  const hub = await p.evaluate(() => { const a = document.getElementById('pfAch'), s = document.getElementById('pfShare'); return a && s && { same: a.parentElement === s.parentElement, ra: a.getBoundingClientRect().top, rs: s.getBoundingClientRect().top, txt: a.innerText.replace(/\s+/g, ' ') }; });
  ok(hub && hub.same && Math.abs(hub.ra - hub.rs) < 2 && hub.txt === 'Achievements', 'Social Hub: Achievements (full name, no count) sits beside Share a Workout');
  await p.click('#pfAch'); await sleep(400);
  const col = await p.evaluate(() => { const c = [...document.querySelectorAll('#pfBody .achcard')], hid = c.filter(x => x.classList.contains('hid'));
    return { total: c.length, hid: hid.length, hidText: hid.map(x => x.innerText.trim()).join(''), hidAria: hid.every(x => x.getAttribute('aria-label') === 'Hidden achievement'), hidTitle: hid.some(x => x.hasAttribute('title') || x.querySelector('[title]')), earned: c.filter(x => x.classList.contains('earned')).length, tot: document.querySelector('.achtot').innerText }; });
  ok(col.total === 44 && col.hid === 13 && col.earned === 1, `collection: 44 cards, 13 hidden, 1 earned (${col.total}/${col.hid}/${col.earned})`);
  ok(col.hidText === '' && col.hidAria && !col.hidTitle, 'locked secrets: zero visible text, accessible name "Hidden achievement", no tooltip');
  ok(/1 of 44 earned/.test(col.tot), 'earned / total line');
  await p.click('[data-achf=earned]'); await sleep(150); ok(await p.evaluate(() => document.querySelectorAll('#pfBody .achcard').length) === 1, 'Earned filter: only what you earned');
  await p.click('[data-achf=locked]'); await sleep(150); ok(await p.evaluate(() => document.querySelectorAll('#pfBody .achcard').length) === 43, 'Locked filter: 43 cards, secrets as blank silhouettes');
  const leak = await p.evaluate(() => document.getElementById('pfBody').innerText + document.getElementById('pfBody').innerHTML.replace(/<[^>]+>/g, ' '));
  ok(!/Groundhog|Tenet|Somehow, You Returned|The Answer Is 42|Past Me Said No|Hey, I Know That Guy|Shift Change|What Is This|Called It a Comeback|Post-Credits|The Other Left|Band.s Back|Final Set/.test(leak), 'no secret name or condition appears anywhere in the locked list');
  if (shots) await p.screenshot({ path: path.join(shots, 'ach_collection.png') });
  await p.click('[data-achback]'); await sleep(300); ok(await p.evaluate(() => !!document.getElementById('pfShare')), 'back returns to the Hub');
  // 3. cold reload: nothing repeats
  await p.reload(); await sleep(1800); ok(await p.evaluate(() => !document.getElementById('achPop') || !document.getElementById('achPop').classList.contains('live')) && await p.evaluate(() => Object.keys(profile.ach.got).length) >= 1, 'cold reload: unlock kept, no pop-up again');
  // 4. swipe up + dismiss button
  p = await open({ active: live, sessions: [] });
  await finish(p);
  const pb = await p.locator('#achPop').boundingBox(); await p.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await p.mouse.down(); await p.mouse.move(pb.x + pb.width / 2, pb.y - 80, { steps: 8 }); await p.mouse.up(); await sleep(600);
  ok(await p.evaluate(() => !document.getElementById('achPop').classList.contains('live')), 'swipe up dismisses the pop-up');
  p = await open({ active: live, sessions: [] }); await finish(p);
  await p.focus('#achPop .achdis'); await p.keyboard.press('Enter'); await sleep(500); ok(await p.evaluate(() => !document.getElementById('achPop').classList.contains('live')), 'the hidden Dismiss button works from the keyboard');
  // 5. reduced motion
  p = await open({ active: live, sessions: [], reduce: true }); await finish(p);
  ok(await p.evaluate(() => document.getElementById('achPop').classList.contains('rm')), 'reduced motion: a fade in place');
  // 6. Greek
  p = await open({ active: live, sessions: [], lang: 'el' }); await finish(p);
  ok(await p.evaluate(() => /Ξεκλειδώθηκε επίτευγμα/.test(document.getElementById('achPop').innerText) && /Πάτα Start/.test(document.getElementById('achPop').innerText)), 'Greek pop-up');
  // 7. old history on first run: one catch-up summary
  const old = Array.from({ length: 26 }, (_, k) => ({ id: 'o' + k, date: day(-60 + k), start: new Date(now + (-60 + k) * 864e5).toISOString(), end: new Date(now + (-60 + k) * 864e5 + 36e5).toISOString(), name: 'W', mins: 60, vol: 3000, prs: [], exercises: [{ exId: 'bench', sets: [set(60, 8, now + (-60 + k) * 864e5 + 1e4)] }] }));
  p = await open({ sessions: old }); await sleep(3600);
  const cu = await p.evaluate(() => ({ live: document.getElementById('achPop') && document.getElementById('achPop').classList.contains('live'), txt: document.getElementById('achPop') && document.getElementById('achPop').innerText, n: Object.keys(profile.ach.got).length }));
  ok(cu.live && /from your history/.test(cu.txt) && cu.n >= 2, `first run with 26 old workouts: one catch-up summary (${cu.n} found)`);
  // 8. Stats: 37 eligible cards, the six-card grid, View All with pins that keep their saved order
  const rich = Array.from({ length: 48 }, (_, k) => { const n = -118 + k * 2.5 | 0, t0 = now + n * 864e5, exs = [['bench', 60 + k % 5, 8 + k % 3], ['squat', 80 + k % 4, 6], ['curl', 12, 10 + k % 4]];
    return { id: 'r' + k, date: day(n), start: new Date(t0).toISOString(), end: new Date(t0 + 36e5).toISOString(), name: 'W', mins: 60, vol: 4000 + k * 10, prs: k % 6 === 0 ? [{ kind: 'w', exId: 'bench', w: 62, r: 8 }, { kind: 'v', exId: 'squat' }] : [],
      exercises: exs.map(([exId, w, r], j) => ({ exId, sets: [set(w, r, t0 + 1e4 + j * 1e5), set(w, r, t0 + 2e4 + j * 1e5)] })) }; });
  p = await open({ sessions: rich, profile: { ach: { v: 1, got: {}, seen: 0 }, orm: [{ id: 'o1', exId: 'bench', w: 100, date: day(-40) }, { id: 'o2', exId: 'squat', w: 130, date: day(-40) }, { id: 'o3', exId: 'deadlift', w: 150, date: day(-40) }] } });
  await p.evaluate(() => { location.hash = '#profile'; }); await sleep(900);
  const sv = await p.evaluate(() => ({ eligible: STATS.filter(x => !STAT_HUB_HIDE.has(x.id)).length, hidden: [...STAT_HUB_HIDE], grid: document.querySelectorAll('#pfBody .pfstatgrid .pfstat').length,
    all: statAllList().map(x => x.id), big3: (statAllList().find(x => x.id === 'big3') || {}).r, titles: ['bestDay', 'couch'].map(id => t('stt_' + id)) }));
  ok(sv.eligible === 37 && sv.hidden.length === 1 && sv.hidden[0] === 'ratio', `Stats: 37 eligible cards, the body-weight ratio stays hidden (${sv.eligible})`);
  ok(sv.grid === 6, 'Stats: the grid still shows six cards');
  ok(sv.titles[0] === 'Heaviest Session' && sv.titles[1] === 'Between Chapters', 'Stats: the two renames (Heaviest Session, Between Chapters)');
  ok(sv.big3 && sv.big3.v === '380 kg' && !/body/i.test(JSON.stringify(sv.big3)), 'Big Three Total: sum of the real singles, no body-weight wording');
  await p.click('[data-statall]'); await sleep(500);
  const va = await p.evaluate(() => ({ open: document.getElementById('ovStats').classList.contains('open'), n: document.querySelectorAll('#stAllList .pfstat').length }));
  ok(va.open && va.n > 6, `View All opens a list of every card with data (${va.n})`);
  await p.fill('#stAllSearch', 'Frequent'); await sleep(200); ok(await p.evaluate(() => [...document.querySelectorAll('#stAllList .pfstt')].every(e => /frequent/i.test(e.textContent)) && document.querySelectorAll('#stAllList .pfstat').length >= 1), 'View All: search finds cards by name');
  await p.fill('#stAllSearch', ''); await sleep(150);
  const pins = await p.evaluate(async () => { const b = document.querySelectorAll('#stAllList [data-statpin2]'); const ids = [b[2].dataset.statpin2, b[4].dataset.statpin2]; b[2].click(); await new Promise(r => setTimeout(r, 200)); document.querySelectorAll('#stAllList [data-statpin2]')[4].click(); await new Promise(r => setTimeout(r, 300)); return { ids, saved: statPins() }; });
  ok(pins.saved.length === 2 && pins.saved[0] === pins.ids[0] && pins.saved[1] === pins.ids[1], 'View All: two pins saved in the order you chose');
  await p.reload(); await sleep(1500); await p.evaluate(() => { location.hash = '#profile'; }); await sleep(800);
  ok(await p.evaluate((ids) => JSON.stringify([...document.querySelectorAll('#pfBody .pfstat.pinned')].map(e => e.querySelector('[data-statpin]').dataset.statpin)) === JSON.stringify(ids), pins.ids), 'cold reload: the pins are still first, in the same order');
  ok(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close(); console.log(fails ? `\n${fails} FAILED` : '\nall achievement app checks passed'); process.exit(fails ? 1 : 0);
})();
