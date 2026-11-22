#!/usr/bin/env node
// Active Exercise card cap (Playwright, real app): the card rests centred, grows to the room between the top gap and the gap above the
// Swipe tip + timer card, then stops; past that only its set list scrolls and older finished sets turn compact.
// Run: node tools/workout-card-e2e.js [--shots DIR]   (exit 1 = a check failed)
// Checks: 1 / 5 / 6 / 12 sets at 390×844, 320×568, 375×667; End Exercise and the timer each fully on screen, not overlapping, and the one
// actually hit at their centres; the set being worked on is in view; New Set; reopening a compact set (values unchanged); a running rest timer;
// keyboard up (shorter page); End Exercise really ends the exercise; resume after a reload keeps every set and value; Greek + a long name;
// light theme; reduced motion; a phone on its side (the card may run past the page there, End Exercise is reached by scrolling the page).
const fs = require('fs'), path = require('path'), http = require('http');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const root = path.join(__dirname, '..'), shots = arg('--shots');
let fails = 0; const ok = (c, m) => { if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const pw = require('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if(!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const set = (i, done) => ({ id: 's' + i, type: 'N', w: String(60 + i * 2.5), r: String(8 + (i % 3)), done: !!done, ...(done ? { at: Date.now() - (20 - i) * 1e4 } : {}) });
const workout = (n, o) => ({ id: 'a1', date: new Date().toISOString().slice(0, 10), start: new Date(Date.now() - 6e5).toISOString(), clock0: Date.now() - 6e5, name: 'Push', type: 'push', prs: [],
  exercises: [{ exId: (o && o.exId) || 'bench', reps: '8', rest: 90, t0: Date.now() - 5e5, sets: Array.from({ length: n }, (_, i) => set(i, i < n - 1)) }, { exId: 'ohp', reps: '8', rest: 90, sets: [set(0)] }] });

(async () => {
  const browser = await pw.chromium.launch(), errs = [];
  const open = async (o) => {
    const page = await browser.newPage({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: shots ? 2 : 1, colorScheme: o.theme || 'dark', reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
    page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    await page.evaluate(([a, lang, theme]) => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang, lastBackup: new Date().toISOString(), theme: { mode: theme } }));
      localStorage.setItem('ft.profile.v1', JSON.stringify({ sex: 'm', name: 'T' })); localStorage.setItem('ft.gym.active', JSON.stringify(a)); }, [o.act || workout(o.n, o), o.lang || 'en', o.theme || 'dark']);
    await page.goto(`http://localhost:${port}/?r=1`, { waitUntil: 'load' }); await page.waitForTimeout(400);
    await page.evaluate(() => { if(!document.getElementById('ovSession').classList.contains('open')) openSession(); }); await page.waitForTimeout(700);
    return page;
  };
  // the geometry of the card on screen (first card), End Exercise, the Swipe tip and the timer card
  const geo = page => page.evaluate(() => { const R = el => { if(!el) return null; const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
    const card = document.querySelector('#sesBody>.exc'), end = card && card.querySelector('[data-endex]'), list = card && card.querySelector('.setlist'), clock = document.getElementById('sesClock'), fin = document.getElementById('sesFinish');
    const hits = (el, r) => { if(!el || !r) return false; const e = document.elementFromPoint(r.cx, r.cy); return !!e && (e === el || el.contains(e)); };
    const work = list && (list.querySelector('.setrow:not(.done)') || [...list.querySelectorAll('.setrow')].pop()), wr = R(work), lr = R(list);
    const g = { card: R(card), end: R(end), tip: R(document.getElementById('sesTip')), dock: R(document.getElementById('sesDock')), body: R(document.getElementById('sesBody')),
      capped: card.classList.contains('capped'), tall: card.classList.contains('tall'), tight: card.classList.contains('tight'), compact: card.querySelectorAll('.setrow.old').length,
      endHit: hits(end, R(end)), clockHit: hits(clock, R(clock)), finishHit: hits(fin, R(fin)), workIn: !!(wr && lr && wr.t >= lr.t - 1 && wr.b <= lr.b + 1),
      wideTitle: (() => { const n = card.querySelector('.exname'); return (n ? n.scrollWidth > card.clientWidth : false) || [...card.querySelectorAll('.exfoot>button')].some(b => b.scrollWidth > b.clientWidth + 1); })(), sideways: document.documentElement.scrollWidth > innerWidth + 1 };
    g.endClear = !!(g.end && g.end.b <= g.tip.t && g.end.b <= g.dock.t && g.end.t >= g.body.t); g.centre = g.card ? (g.card.t + g.card.b) / 2 : 0; return g; });
  const shot = async (page, name) => { if(shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };

  // 1. sizes and set counts: End Exercise and the timer are each fully usable, never on top of each other
  for(const [w, h, n] of [[390, 844, 1], [390, 844, 5], [390, 844, 6], [390, 844, 12], [375, 667, 6], [375, 667, 12], [320, 568, 6], [320, 568, 12]]){
    const p = await open({ w, h, n }), g = await geo(p);
    ok(g.endClear && g.endHit && g.clockHit && g.finishHit, `${w}×${h}, ${n} set${n > 1 ? 's' : ''}: End Exercise above the Swipe tip and timer (end ${g.end.b | 0} ≤ tip ${g.tip.t | 0}); End, timer and End Workout each hit at their centres`);
    ok(g.workIn, `${w}×${h}, ${n} sets: the set being worked on is in the list's view${g.capped ? ' (card capped, ' + g.compact + ' compact)' : ''}${g.tight ? ', tight' : ''}`);
    ok(!g.sideways && !g.wideTitle, `${w}×${h}, ${n} sets: no sideways overflow`);
    if(n === 1){ const mid = (g.body.t + 8 + g.body.b - 40) / 2; ok(Math.abs(g.centre - mid) < 6, `${w}×${h}, 1 set: the card rests centred (${g.centre | 0} vs ${mid | 0})`); }
    await shot(p, `card_${w}x${h}_${n}`); await p.close();
  }

  // 2. 12 sets at 390×844: New Set, reopen a compact set, a running rest timer, keyboard, End Exercise
  { const p = await open({ w: 390, h: 844, n: 12 }); let g = await geo(p);
    ok(g.capped && g.compact >= 8 && !g.tall, `12 sets: card stops at the cap, ${g.compact} older finished sets compact`);
    const before = await p.evaluate(() => JSON.stringify(active.exercises[0].sets));
    await p.click('#sesBody>.exc [data-addset]'); await p.waitForTimeout(300); g = await geo(p);
    const n13 = await p.evaluate(() => { const l = document.querySelector('#sesBody>.exc .setlist'), r = l.querySelector('.setrow[data-s="12"]'), a = r.getBoundingClientRect(), b = l.getBoundingClientRect(); return { len: active.exercises[0].sets.length, inView: a.top >= b.top - 1 && a.bottom <= b.bottom + 1 }; });
    ok(n13.len === 13 && n13.inView && g.endClear && g.endHit, 'New Set: set 13 added and in view, End Exercise still clear');
    // reopen the first (compact) set by tapping its kg box
    await p.evaluate(() => document.querySelector('#sesBody>.exc .setlist').scrollTop = 0); await p.waitForTimeout(100);
    await p.click('#sesBody>.exc .setrow[data-s="0"] [data-w]'); await p.waitForTimeout(250);
    const re = await p.evaluate(() => { const r = document.querySelector('#sesBody>.exc .setrow[data-s="0"]'), l = r.closest('.setlist'), a = r.getBoundingClientRect(), b = l.getBoundingClientRect();
      return { old: r.classList.contains('old'), focus: document.activeElement === r.querySelector('[data-w]'), inView: a.top >= b.top - 1 && a.bottom <= b.bottom + 1, w: active.exercises[0].sets[0].w, done: active.exercises[0].sets[0].done }; });
    ok(!re.old && re.focus && re.inView && re.w === '60' && re.done, 'reopening a compact set: full row, focused, in view, value and tick unchanged');
    await shot(p, 'card_reopen_first');
    // keyboard up: the page gets ~300 px shorter; the focused set stays in view, End Exercise and the timer stay separate
    await p.setViewportSize({ width: 390, height: 544 }); await p.waitForTimeout(300); g = await geo(p);
    const kb = await p.evaluate(() => { const f = document.activeElement, r = f && f.closest('.setrow'), l = r && (r.closest('.exc.short') || r.closest('.setlist')); if(!r) return 'no focus: ' + (f && f.tagName); const a = r.getBoundingClientRect(), b = l.getBoundingClientRect(); return a.top >= b.top - 1 && a.bottom <= b.bottom + 1 || `row ${a.top | 0}-${a.bottom | 0} list ${b.top | 0}-${b.bottom | 0}`; });
    ok(kb === true && g.endClear && g.endHit && g.clockHit, `keyboard up (390×544): focused set in view${g.tight ? ' (tight)' : ''}, End Exercise and timer separate` + (kb === true ? '' : ' — ' + kb) + ` end ${g.end.b | 0} tip ${g.tip.t | 0}`);
    await shot(p, 'card_keyboard'); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
    // a running rest timer under the set just ticked
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await p.evaluate(() => { const l = document.querySelector('#sesBody>.exc .setlist'); l.scrollTop = l.scrollHeight; });
    await p.fill('#sesBody>.exc .setrow[data-s="11"] [data-w]', '90'); await p.fill('#sesBody>.exc .setrow[data-s="11"] [data-r]', '6');
    await p.click('#sesBody>.exc .setrow[data-s="11"] [data-ok]'); await p.waitForTimeout(500); g = await geo(p);
    const rest = await p.evaluate(() => !!document.getElementById('rbWrap'));
    ok(rest && g.endClear && g.endHit && g.clockHit, 'rest timer running in the card: End Exercise and the timer each still hit');
    await shot(p, 'card_rest_timer');
    const kept = await p.evaluate(b => { const now = active.exercises[0].sets, was = JSON.parse(b); return was.slice(0, 11).every((s, i) => s.id === now[i].id && s.w === now[i].w && s.r === now[i].r && s.done === now[i].done); }, before);
    ok(kept, 'compacting / reopening never changed a set (ids, kg, reps, ticks)');
    // End Exercise ends the exercise
    await p.click('#sesBody>.exc [data-endex]'); await p.waitForTimeout(400);
    const ended = await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('ft.gym.active')); return a.exercises[0].ended === true && active.exercises[0].ended === true; });
    ok(ended, 'End Exercise ends the exercise (saved)'); await p.close(); }

  // 3. resume: a reload of a workout with many sets keeps every set and the set being worked on
  { const act = workout(12); const p = await open({ w: 390, h: 844, act }); const a0 = await p.evaluate(() => localStorage.getItem('ft.gym.active'));
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(400); await p.evaluate(() => { if(!document.getElementById('ovSession').classList.contains('open')) openSession(); }); await p.waitForTimeout(600);
    const g = await geo(p), same = await p.evaluate(a => { const was = JSON.parse(a).exercises[0].sets, now = active.exercises[0].sets; return was.length === now.length && was.every((s, i) => s.id === now[i].id && s.done === now[i].done && s.w === now[i].w); }, a0);
    ok(same && g.workIn && g.capped, 'resume after reload: same sets and ticks, the unfinished set in view'); await p.close(); }

  // 4. Greek, light theme, reduced motion, a long exercise name
  { const act = workout(12, { exId: 'bench' }); act.exercises[0].exId = 'incline_db'; const p = await open({ w: 320, h: 568, act, lang: 'el', theme: 'light', reduce: true }); const g = await geo(p);
    ok(g.endClear && g.endHit && g.clockHit && !g.sideways && !g.wideTitle, `Greek, light, reduced motion, 320×568, long name: End Exercise and timer separate, no sideways overflow${g.tight ? ' (tight)' : ''}`);
    await shot(p, 'card_el_light_320'); await p.close(); }

  // 5. a phone on its side: too short for the normal cap; the whole card scrolls inside itself and New Set / End Exercise stay pinned at its foot
  { const p = await open({ w: 844, h: 390, n: 6 }); const g = await geo(p);
    ok(g.capped && !g.tall && g.endClear && g.endHit && g.clockHit, `on its side (844×390): card capped and scrolls inside itself, End Exercise pinned above the tip (end ${g.end.b | 0} ≤ tip ${g.tip.t | 0}) and the timer each hit`);
    const sc = await p.evaluate(() => { const c = document.querySelector('#sesBody>.exc'), r = c.querySelector('.setrow:not(.done)'), f = c.querySelector('.exfoot'); return { short: c.classList.contains('short'), vis: r.getBoundingClientRect().bottom <= f.getBoundingClientRect().top + 1 && r.getBoundingClientRect().top >= c.getBoundingClientRect().top - 1 }; });
    ok(sc.short && sc.vis, 'on its side: the set being worked on is scrolled into view above the pinned buttons');
    await shot(p, 'card_landscape'); await p.close(); }

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close(); srv.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nAll workout card checks passed.'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
