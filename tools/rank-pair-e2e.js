#!/usr/bin/env node
// Rank for Left / Right pairs in the real app (Playwright): the same work logged compact, as Left / Right rows and as a typed total shows the SAME rank on the
// exercise card, in the profile's rank list and on the finish screen (the Rank Up saved with the workout), and reopening / recomputing never repeats a rank-up.
// Run: node tools/rank-pair-e2e.js
const fs = require('fs'), path = require('path'), http = require('http'), pw = require('playwright');
const root = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if(!fs.existsSync(f)){ r.writeHead(404); return r.end(); }
  const t = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream'; r.writeHead(200, { 'Content-Type': t }); fs.createReadStream(f).pipe(r); }).listen(0);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if(!c) fails++; };
const row = (w, r, o) => ({ id: 'r' + Math.random().toString(36).slice(2, 6), type: 'N', w: String(w), r: String(r), done: true, at: Date.now() - 5e4, ...o });
const W = 12.5, ex = {
  compact: { exId: 'hammer_curl', reps: '12', rest: 90, t0: Date.now() - 4e5, cv: { l: 'hand', n: 2, rp: 'both' }, sets: [row(W, 12)] },
  pair: { exId: 'hammer_curl', reps: '12', rest: 90, t0: Date.now() - 4e5, uni: true, jt: true, cv: { l: 'hand', n: 2, rp: 'both' }, sets: [row(W, 12, { side: 'L', pr: 'p1' }), row(W, 12, { side: 'R', pr: 'p1' })] },
  total: { exId: 'hammer_curl', reps: '12', rest: 90, t0: Date.now() - 4e5, cv: { l: 'total', n: 2, rp: 'both' }, sets: [row(W * 2, 12)] },
  weakR: { exId: 'hammer_curl', reps: '12', rest: 90, t0: Date.now() - 4e5, uni: true, jt: true, cv: { l: 'hand', n: 2, rp: 'both' }, sets: [row(W, 12, { side: 'L', pr: 'p1' }), row(8, 12, { side: 'R', pr: 'p1' })] },
};
(async () => { const b = await pw.chromium.launch(), errs = [], got = {};
  for(const k of Object.keys(ex)){
    const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => errs.push(e.message));
    const u = 'http://localhost:' + srv.address().port + '/'; await pg.goto(u);
    const act = { id: 'a1', date: new Date().toISOString().slice(0, 10), start: new Date(Date.now() - 6e5).toISOString(), clock0: Date.now() - 6e5, name: 'T', type: 'full', prs: [], exercises: [ex[k]] };
    await pg.evaluate(a => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: 'en', lastBackup: new Date().toISOString() })); localStorage.setItem('ft.profile.v1', JSON.stringify({ sex: 'm', name: 'T' }));
      localStorage.setItem('ft.weights.v1', JSON.stringify({ [new Date().toISOString().slice(0, 10)]: 80 })); localStorage.setItem('ft.gym.active', JSON.stringify(a)); }, act);
    await pg.goto(u + '?r=1'); await pg.waitForTimeout(600);
    await pg.evaluate(() => { open('ovSession'); renderSession(); }); await pg.waitForTimeout(300);
    const card = await pg.evaluate(() => { const x = active.exercises[0], tf = tierForX(x); return { badge: (document.querySelector('.exc .extier') || {}).textContent || '', label: tf && tf.label, next: tf && tf.next ? rankNextTxt(tf.next) : null, tf: tf && { n: tf.n, frac: Math.round(tf.frac * 1000) } }; });
    // finish the workout: the profile list and the saved Rank Up come from the same pipeline
    const fin = await pg.evaluate(async () => { const before = rankNow(['hammer_curl']); await finishWorkout(true); const s = sessions[sessions.length - 1];
      const list = rankList().find(r => r.exId === 'hammer_curl'); const again = rankNow(['hammer_curl']);
      const r1 = JSON.stringify(RankFx.upList(s, RankFx.afterWorkout(s, {}))), r2 = JSON.stringify(RankFx.upList(s, RankFx.afterWorkout(s, rankNow(['hammer_curl']))));
      return { before, profile: list && list.label, saved: s.rankUps ? s.rankUps.map(u => u.n) : [], again: again.hammer_curl, replay: r2 }; });
    got[k] = { card, fin }; await pg.close(); }
  const c = got.compact, p = got.pair, t = got.total, w = got.weakR;
  console.log(JSON.stringify({ compact: c.card.label, pair: p.card.label, total: t.card.label, weakR: w.card.label, nextC: c.card.next, nextP: p.card.next, nextT: t.card.next }));
  ok(c.card.label && c.card.label === p.card.label && c.card.label === t.card.label && JSON.stringify(c.card.tf) === JSON.stringify(p.card.tf) && JSON.stringify(c.card.tf) === JSON.stringify(t.card.tf), 'exercise card: compact, Left / Right and typed total show the same rank and progress');
  ok(c.fin.profile === c.card.label && p.fin.profile === c.card.label && t.fin.profile === c.card.label, 'profile rank list shows that same rank for all three');
  ok(JSON.stringify(c.fin.saved) === JSON.stringify(p.fin.saved) && JSON.stringify(c.fin.saved) === JSON.stringify(t.fin.saved) && c.fin.saved.length === 1, 'finish screen: the same single Rank Up is saved with the workout for all three');
  ok(c.fin.replay === '[]' && p.fin.replay === '[]' && t.fin.replay === '[]', 'recomputing after the workout is saved gives no second rank-up');
  ok(/kg total/.test(t.card.next || '') && /each side/.test(p.card.next || '') && !/total|each/.test(c.card.next || '') , 'next target is said in the way it is logged: ' + [c.card.next, p.card.next, t.card.next].join(' | '));
  ok(w.card.n === undefined && (w.card.tf.n < c.card.tf.n), 'weaker right side: the card shows the lower rank than the equal pair (' + w.card.label + ' < ' + c.card.label + ')');
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 2)));
  await b.close(); srv.close(); process.exit(fails ? 1 : 0); })();
