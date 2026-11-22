#!/usr/bin/env node
// RECOVERY+ in the real app (Playwright): seeds workouts + a plan, opens #gym-rec and checks the page rules, then (with --shots DIR)
// saves phone screenshots. Run: node tools/recovery-e2e.js [--shots DIR] [--root PATH]   (exit 1 = a check failed)
// Rules checked: tiles only for Recovering / Needs Rest (also with Advanced on, same subjects); the body is the new SVG (no <img>, 21 heads);
// unknown is never shown as ready; nothing in the saved workouts or plan changes; no page errors; 320 / 375 / 390 px fit without sideways scroll.
const fs = require('fs'), path = require('path'), http = require('http');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const root = path.resolve(arg('--root') || path.join(__dirname, '..')), shots = arg('--shots');
let fails = 0; const ok = (c, m) => { if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const pw = require('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if(!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const at = (n, hh) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(hh, 0, 0, 0); return d.toISOString(); };
const S = (k, w, r, o) => Array.from({ length: k }, () => ({ w, r, done: true, ...(o || {}) }));
// a realistic week: legs 2 days ago, push yesterday evening, curls this morning; tomorrow's plan = Push
function seed(sex, withHistory){
  const sessions = withHistory ? [
    { id: 's1', date: day(-9), start: at(-9, 18), end: at(-9, 19), name: 'Pull', mins: 60, vol: 5000, exercises: [{ exId: 'bb_row', sets: S(4, 70, 8) }, { exId: 'lat_pulldown', sets: S(3, 60, 10) }] },
    { id: 's2', date: day(-2), start: at(-2, 17), end: at(-2, 18), name: 'Legs', mins: 70, vol: 9000, exercises: [{ exId: 'squat', sets: S(5, 100, 5, { type: 'F' }) }, { exId: 'rdl', sets: S(3, 90, 8) }, { exId: 'leg_ext', sets: S(3, 50, 12) }] },
    { id: 's3', date: day(-1), start: at(-1, 18), end: at(-1, 19), name: 'Push', mins: 65, vol: 7000, exercises: [{ exId: 'bench', sets: S(5, 80, 6, { rir: 1 }) }, { exId: 'ohp', sets: S(4, 45, 8) }, { exId: 'lateral_db', sets: S(4, 10, 15) }] },
    { id: 's4', date: day(0), start: new Date(Date.now() - 3 * 36e5).toISOString(), end: new Date(Date.now() - 2 * 36e5).toISOString(), name: 'Arms', mins: 40, vol: 2000, exercises: [{ exId: 'bb_curl', sets: S(5, 30, 10, { type: 'F' }) }] },
  ] : [];
  const tpls = [{ id: 'tpush', name: 'Push Day', type: 'push', exercises: [{ exId: 'bench', sets: 4, reps: '6-8', rest: 150 }, { exId: 'ohp', sets: 3, reps: '8-10', rest: 120 }, { exId: 'rope_pushdown', sets: 3, reps: '12', rest: 60 }] }];
  const wd = new Date(day(1) + 'T12:00:00').getDay(), plan = { [wd]: { tpl: 'tpush', time: '18:00' } };
  return { 'ft.ui.v1': { setupDone: true, lang: 'en', lastBackup: new Date().toISOString(), theme: { mode: 'dark', preset: 'lime' } }, 'ft.profile.v1': { sex, name: 'Test' }, 'ft.gym.sessions': sessions, 'ft.gym.tpl': tpls, 'ft.gym.plan': plan,
    'ft.targets.v1': { goal: 'cut', bw: 80, gym: { k: 2300, p: 160, c: 230, f: 70 }, rest: { k: 2100, p: 160, c: 190, f: 70 } } };
}
(async () => {
  const browser = await pw.chromium.launch(), errs = [];
  const open = async (o) => {
    const page = await browser.newPage({ viewport: { width: o.w || 390, height: o.h || 844 }, deviceScaleFactor: o.dpr || 2, colorScheme: o.theme || 'dark' });
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if(m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    const data = seed(o.sex || 'm', o.history !== false); if(o.theme) data['ft.ui.v1'].theme.mode = o.theme; if(o.adv) data['ft.ui.v1'].recAdv = true; if(o.lang) data['ft.ui.v1'].lang = o.lang;
    await page.evaluate(d => { localStorage.clear(); Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); }, data);
    await page.goto(`http://localhost:${port}/?r=1`, { waitUntil: 'load' }); await page.waitForTimeout(400);   // the app starts on its home page
    await page.evaluate(h => { location.hash = h; }, o.hash || 'gym-rec'); await page.waitForTimeout(700);
    return page;
  };
  const state = page => page.evaluate(() => { const r = RecoveryPlus.compute(), not = RecoveryCore.GROUPS10.filter(g => ['recovering', 'needs_rest'].includes(r.tr.groups[g].state));
    const tiles = [...document.querySelectorAll('#gRecV .rectile')].map(el => el.dataset.rg), heads = [...document.querySelectorAll('#recFig svg path[data-h]')].map(p => p.dataset.h);
    return { not, tiles, heads: [...new Set(heads)], img: document.querySelectorAll('#gRecV img').length, next: (document.querySelector('.recnext') || {}).innerText || '',
      ins: document.querySelectorAll('.recins').length, overflow: document.documentElement.scrollWidth > innerWidth + 1, ses: localStorage.getItem('ft.gym.sessions'), plan: localStorage.getItem('ft.gym.plan') }; });

  if(arg('--picker')){   // only the exercise picker's map (for a pixel compare against main)
    const p = await open({ hash: 'gym', sex: arg('--picker') });
    await p.evaluate(() => { ui.pkMode = 'map'; openExPick(() => {}, {}); }); await p.waitForTimeout(600);
    await p.locator('#ovExPick .sheet').screenshot({ path: path.join(shots, `picker_${arg('--picker')}.png`) }); await p.close(); srv.close(); await browser.close(); return;
  }
  // 1. male, with history, dark: rules
  let p = await open({ sex: 'm' }); let s = await state(p);
  ok(s.not.length > 0 && s.tiles.length === s.not.length && s.tiles.every(g => s.not.includes(g)), `tiles = only non-ready groups (${s.tiles.join(', ')})`);
  ok(s.img === 0 && s.heads.length >= 21, `body is live SVG regions (${s.heads.length} ids incl. skin/hair), no <img>`);
  ok(/Push Day/.test(s.next) && /Tomorrow/.test(s.next), 'next workout card names the planned workout and day: ' + s.next.replace(/\s+/g, ' ').slice(0, 140));
  ok(s.tiles.includes('arms') && !(await p.locator('.rectile[data-rg="arms"] .rtn').innerText()).includes('Triceps'), 'curls this morning: Arms tile names Biceps, not Triceps');
  const before = { ses: s.ses, plan: s.plan };
  if(shots){ await p.screenshot({ path: path.join(shots, 'rec_m_dark_390.png'), fullPage: true });
    await p.evaluate(() => document.querySelector('#gRecV .rech').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await p.screenshot({ path: path.join(shots, 'rec_m_dark_390_tiles.png') }); }
  await p.click('#recAdvSw'); await p.waitForTimeout(300); const s2 = await state(p);
  ok(JSON.stringify(s2.tiles) === JSON.stringify(s.tiles), 'Advanced on: exactly the same tiles (no ready cards added)');
  ok(await p.locator('.radctx').count() === 1, 'Advanced shows the reasoning / context card');
  if(shots){ await p.locator('details.radrow').first().evaluate(d => { d.open = true; d.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(300); await p.screenshot({ path: path.join(shots, 'rec_m_dark_390_advanced.png') }); }
  ok(s2.ses === before.ses && s2.plan === before.plan, 'opening RECOVERY+ and Advanced changed no workouts or plans');
  await p.close();
  // 2. female, light, 3 widths; Greek once
  for(const [w, th, sx, lang] of [[320, 'light', 'f'], [375, 'dark', 'f'], [390, 'light', 'm'], [390, 'dark', 'f', 'el']]){
    p = await open({ sex: sx, theme: th, w, lang }); s = await state(p);
    ok(!s.overflow, `${sx} ${th} ${w}px${lang ? ' ' + lang : ''}: no sideways scroll`);
    ok(s.tiles.every(g => s.not.includes(g)), `${sx} ${th} ${w}px: tiles only for non-ready muscles`);
    if(shots) await p.screenshot({ path: path.join(shots, `rec_${sx}_${th}_${w}${lang ? '_' + lang : ''}.png`), fullPage: true });
    await p.close(); }
  // 3. no history: honest neutral state, body all unknown (graphite), no "All Muscles Ready"
  p = await open({ sex: 'm', history: false }); s = await state(p);
  const txt = await p.locator('#gRecV').innerText();
  ok(s.tiles.length === 0 && !/All Muscles Ready/.test(txt) && /appear as you log workouts/.test(txt), 'no history: no tiles, no all-ready claim, honest message');
  const fills = await p.evaluate(() => [...new Set([...document.querySelectorAll('#recFig path[data-h]')].map(x => x.getAttribute('fill')))]);
  ok(fills.length === 1, 'no history: every region neutral (one gradient)');
  if(shots) await p.screenshot({ path: path.join(shots, 'rec_m_dark_390_nohistory.png'), fullPage: true });
  await p.close();
  // 4. offline + no Athlete OS: still renders
  p = await open({ sex: 'f' }); await p.context().setOffline(true);
  const offline = await p.evaluate(() => { window.AthleteState = undefined; renderRecovery(); return document.querySelectorAll('#recFig svg').length; });
  ok(offline === 1, 'offline and without Athlete OS: RECOVERY+ renders');
  await p.close();
  // 5. Gym hub mini map uses the new figure
  p = await open({ sex: 'f', hash: 'gym' }); const mini = await p.evaluate(() => !!document.querySelector('#gMiniRec svg.ra-svg'));
  ok(mini, 'Gym hub recovery mini map uses the RECOVERY+ figure'); await p.close();
  // one snapshot for everyone: the Recovery page, Athlete OS and Gym Coach read the same RECOVERY+ version; a finished workout changes it for all three
  { const q = await open({ sex: 'm' });
    const look = () => q.evaluate(() => { const s = RecoveryPlus.snapshot(), st = AthleteState.get('recovery'), pk = GymIntel.brief('plan', 'gym', 'am I recovered enough to train chest?').text;
      return { id: s.snapshotId, ver: s.version, until: s.validUntil, at: s.at, st: st.snapshotId, coach: (pk.match(/RECOVERY\+ (r1-[a-z0-9]+)/) || [])[1] || null, chest: s.groups.chest.state, tiles: [...document.querySelectorAll('#gRecV .rectile')].map(e => e.dataset.rg) }; });
    const a = await look();
    ok(a.ver === 'recovery.v1' && a.id && a.st === a.id && a.coach === a.id && a.until > a.at && a.until - a.at <= 10 * 6e4 + 1, `one snapshot (${a.id}): Recovery page, Athlete OS and the Gym Coach packet read the same version; valid for ${Math.round((a.until - a.at) / 6e4)} min`);
    // a finished chest workout, saved the normal way
    await q.evaluate(() => { const now = Date.now(); sessions.push({ id: 'sx', date: todayKey(), start: new Date(now - 50 * 6e4).toISOString(), end: new Date(now - 5 * 6e4).toISOString(), name: 'Chest', mins: 45, vol: 4000,
      exercises: [{ exId: 'bench', sets: Array.from({ length: 6 }, () => ({ w: '80', r: '6', done: true, rir: 1 })) }, { exId: 'incline_db', sets: Array.from({ length: 4 }, () => ({ w: '30', r: '10', done: true })) }] }); saveG('ses'); renderRecovery(); });
    await q.waitForTimeout(300); const b = await look();
    ok(b.id !== a.id && b.st === b.id && b.coach === b.id && b.chest === 'recovering' && b.tiles.includes('chest'), `after a finished chest workout: new snapshot ${b.id}; the page shows a Chest tile, Athlete OS and Gym Coach have ${b.coach}`);
    // time alone: Athlete OS keeps the slice only until validUntil
    const exp = await q.evaluate(u => { AthleteState.get('recovery'); const s0 = AthleteState.stats().builds; AthleteState.get('recovery', u - 1000); const s1 = AthleteState.stats().builds; AthleteState.get('recovery', u + 1000); return [s1 - s0, AthleteState.stats().builds - s1]; }, b.until);
    ok(exp[0] === 0 && exp[1] === 1, 'Athlete OS reuses the recovery slice until validUntil, then reads RECOVERY+ again (time alone can change a muscle state)');
    await q.close(); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + [...new Set(errs)].join(' | ') : ''));
  srv.close(); await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed: ' + e.message); process.exit(1); });
