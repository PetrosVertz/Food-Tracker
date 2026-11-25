#!/usr/bin/env node
// 0.8 (24 Nov) bento homes + My Food Log, in the real app in a browser (Playwright). Run: node tools/bento-e2e.js   (also run by check.js --boot)
// Food Library: six tiles fill the screen (no scroll at 390×844, scroll falls back at 320×568), tile → page, macro ring bubble (2 s, switches,
// outside tap closes, others dim), no floating buttons, empty states. Gym Buddy: four tiles, Recovery slides every 5 s (not with Reduce Motion),
// Week Planner pills, Start Workout pill clear of the grid. Streak bubble → history with a calendar. My Food Log: pinned top, slim Gym Day line.
const path = require('path'), fs = require('fs'), http = require('http');
const root = path.resolve(__dirname, '..');
let pass = 0, fails = 0;
const must = (c, m) => { if(c){ pass++; console.log('ok    ' + m); } else { fails++; console.log('FAIL  ' + m); } };
function serve(){ const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  return new Promise(res => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
    if(!f.startsWith(root) || !fs.existsSync(f)){ r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, () => res(s)); }); }
// sample data: foods of each kind, recipes, a month of logs, supplements, fridge, a shopping list, saved workouts, a plan, 8 weeks of sessions
function seed(){ const dk = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
  const F = [['f1', 'Chicken breast', 'meat', 110, 23, 0, 1.5], ['f2', 'Rice', 'rice', 350, 7, 78, 1], ['f3', 'Greek yoghurt', 'dairy', 73, 10, 3, 2], ['f4', 'Olive oil', 'oils', 884, 0, 0, 100],
    ['f5', 'Eggs', 'eggs', 143, 13, 1, 10], ['f6', 'Pasta', 'pasta', 360, 12, 72, 1.5], ['f7', 'Almonds', 'nuts', 579, 21, 22, 50], ['f8', 'Broccoli', 'veg', 34, 2.8, 7, .4]]
    .map(([id, name, cat, kcal, protein, carbs, fat], i) => ({ id, name, cat, kcal, protein, carbs, fat, unit: 'g', createdAt: dk(-20 + i) + 'T10:00:00Z', updatedAt: dk(-2) }));
  const ref = f => ({ type: 'my', id: f.id, name: f.name, unit: 'g', per: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat } });
  const log = {}; for(let i = 0; i < 3; i++) log[dk(-i)] = [{ id: 'l' + i, time: '12:00', kind: 'meal', refId: 'm1', name: 'Chicken & rice', amt: 300, unit: 'g', kcal: 500, p: 40, c: 50, f: 10 }];
  const ses = []; for(let i = 1; i < 56; i += 3){ const d = dk(-i); ses.push({ id: 's' + i, date: d, start: d + 'T18:00:00.000Z', vol: 4000 + i * 10, prs: [], exercises: [{ exId: 'bench', sets: [{ w: 80, r: 5, done: true }] }] }); }
  const plan = {}; [1, 2, 4, 5].forEach(d => { plan[d] = { tpl: 't1' }; }); [3, 6, 0].forEach(d => { plan[d] = { tpl: 'rest' }; });
  return { 'ft.foods.v1': F, 'ft.meals.v1': [{ id: 'm1', name: 'Chicken & rice', ingredients: [{ ref: ref(F[0]), grams: 200 }, { ref: ref(F[1]), grams: 100 }] }], 'ft.log.v1': log,
    'ft.supps.v1': [{ id: 's1', name: 'Creatine', dose: 5, unit: 'g', often: 'daily', times: ['any'] }], 'ft.supplog.v1': { [dk(-1)]: { takes: { s1: ['09:00'] } }, [dk(-2)]: { takes: { s1: ['09:00'] } } },
    'ft.fridge.v1': [{ id: 'i1', foodId: 'f1', qty: 500, loc: 'fridge' }, { id: 'i2', foodId: 'f2', qty: 1000, loc: 'fridge' }], 'ft.groc.v1': [{ id: 'g1', name: 'Eggs', foodId: 'f5', count: 1, done: false }, { id: 'g2', name: 'Milk', done: true }],
    'ft.gym.tpl': [{ id: 't1', name: 'A Very Long Workout Name Here', type: 'push', exercises: [{ exId: 'bench', sets: 4 }, { exId: 'squat', sets: 3 }] }], 'ft.gym.plan': plan, 'ft.gym.sessions': ses }; }
async function open(browser, port, o = {}){
  const p = await browser.newPage({ viewport: { width: o.w || 390, height: o.h || 844 }, reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if(m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await p.evaluate(([o, sd]) => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: o.lang || 'en', lastBackup: new Date().toISOString(), theme: { mode: o.light ? 'light' : 'dark' }, stk: { intro: 1, intro0: 1 }, wpAdv: !!o.adv }));
    if(!o.empty) for(const [k, v] of Object.entries(sd)) localStorage.setItem(k, JSON.stringify(v)); }, [o, seed()]);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
  if(o.hash){ await p.evaluate(h => { location.hash = h; }, o.hash); await p.waitForTimeout(900); }
  return p; }
const segTap = (p, k) => p.$eval(`#fhFoods [data-seg="${k}"]`, e => { const o = { bubbles: true, cancelable: true }; e.dispatchEvent(new PointerEvent('pointerdown', o)); e.dispatchEvent(new MouseEvent('click', o)); });   // an arc's box is the whole ring: tap the arc itself
const tap = async (p, sel) => { const b = await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await p.mouse.click(b.x, b.y); };
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch(e) { console.log('skip: no Playwright'); process.exit(process.argv.includes('--strict') ? 1 : 0); }
  const srv = await serve(), port = srv.address().port, browser = await chromium.launch();
  try {
    // ---- Food Library ----
    let p = await open(browser, port, { hash: '#food' });
    let s = await p.evaluate(() => ({ tiles: [...document.querySelectorAll('#fBento > .bt')].map(e => e.id), scroll: $('pgFoods').scrollHeight - $('pgFoods').clientHeight, fab: !$('fab').classList.contains('hide') || !$('fab2').classList.contains('hide'),
      title: document.querySelector('#pgFoods header h1').textContent, date: $('fDate').textContent, bub: !document.querySelector('#pgFoods .stkbub').classList.contains('hide'), scan: $('fScanBtn').offsetWidth,
      railTop: $('rail').getBoundingClientRect().top, last: $('fhInv').getBoundingClientRect().bottom, first: $('fhFoods').getBoundingClientRect().height, mid: $('fhMeals').getBoundingClientRect().height }));
    must(s.tiles.join() === 'fhFoods,fhMeals,fhSupps,fhRecipes,fhGroc,fhInv', 'Food Library: six tiles in order ' + s.tiles.join());
    must(s.scroll <= 1 && s.last < s.railTop && s.railTop - s.last <= 24 && s.first > s.mid, `Food Library: fills the screen, no scroll, small gap above the bar (${Math.round(s.railTop - s.last)} px), Foods is the tallest`);
    must(!s.fab && s.title === 'Food Library' && s.date.length > 5 && s.bub && s.scan >= 46, `header: centred title + date "${s.date}", streak bubble, scan ${s.scan} px; no floating buttons`);
    s = await p.evaluate(() => ({ n: $('fhFoods').querySelector('.btnum').textContent, segs: [...document.querySelectorAll('#fhFoods [data-seg]')].map(e => e.dataset.seg).join(), stat: $('fhFoods').querySelector('.btstat b').textContent,
      chev: !!$('fHub').querySelector('.chev,[class*="chevron"]'), chips: !!$('fhFoods').querySelector('.mchip'), names: [...document.querySelectorAll('#fBento .bth b')].map(e => e.textContent).join('|') }));
    must(s.n === '8' && s.segs === 'p,c,f' && !!s.stat && !s.chev, `Foods: 8 saved, rotating stat "${s.stat}", ring split p/c/f, no chevron`);
    must(s.names === 'Foods|Meals|Supplements|Recipes|Shopping List|My Fridge', 'new section names: ' + s.names);
    await segTap(p, 'f'); await p.waitForTimeout(400);
    s = await p.evaluate(() => { const b = document.querySelector('#fhFoods .fbub'); return { on: !b.classList.contains('hide'), txt: b.textContent, k: b.className, dim: [...document.querySelectorAll('#fhFoods [data-seg].dim')].map(e => e.dataset.seg).join(), hash: location.hash }; });
    must(s.on && /3 fat-rich foods in total/.test(s.txt) && /k-f/.test(s.k) && s.dim === 'p,c' && s.hash === '#food', `ring tap: bubble "${s.txt}" in the segment colour, others dim, page stays`);
    await segTap(p, 'p'); await p.waitForTimeout(200);
    must(await p.evaluate(() => /protein-rich/.test(document.querySelector('#fhFoods .fbub').textContent)), 'another segment switches the bubble at once');
    await p.waitForTimeout(2300); must(await p.evaluate(() => document.querySelector('#fhFoods .fbub').classList.contains('hide') && !document.querySelector('#fhFoods .dim')), 'the bubble hides itself after 2 s');
    await segTap(p, 'c'); await p.waitForTimeout(200); await p.mouse.click(195, 30); await p.waitForTimeout(300);
    must(await p.evaluate(() => document.querySelector('#fhFoods .fbub').classList.contains('hide')), 'tapping anywhere else closes it');
    s = await p.evaluate(() => ({ meals: $('fhMeals').innerText, supps: $('fhSupps').innerText, dots: $('fhSupps').querySelectorAll('.sdot').length, rec: $('fhRecipes').innerText, groc: $('fhGroc').innerText, inv: $('fhInv').innerText }));
    must(/Chicken & rice/.test(s.meals) && /3×/.test(s.meals), 'Meals: top meals with times logged this month');
    must(s.dots === 7 && /Did you take your supplements today\?/.test(s.supps) && !/streak/.test(s.supps) && /1 left/.test(s.supps), 'Supps: today\'s question (no streak), 7 dots, 1 left today');
    must(/2\/2/.test(s.rec) && /Chicken & rice/.test(s.rec), 'Recipes: a recipe you can cook now, 2/2 in the fridge');
    must(/1\/2/.test(s.groc) && /1 left to buy/.test(s.groc) && /Eggs/.test(s.groc), 'Shopping List: ticked ring, left to buy, next item');
    must(/2/.test(s.inv) && /items/.test(s.inv) && /Protein 1/.test(s.inv), 'My Fridge: item count + legend');
    await tap(p, '#fhGroc'); await p.waitForTimeout(500); must(await p.evaluate(() => location.hash === '#groc' && !$('pgGroc').classList.contains('hide')), 'a tile opens its page (Shopping List)');
    must(!p.errs.length, 'no page errors (Food Library) ' + p.errs.slice(0, 2).join(' | ')); await p.close();
    // small screen: falls back to normal scrolling; brand-new user: six empty states
    p = await open(browser, port, { hash: '#food', w: 320, h: 568 });
    s = await p.evaluate(() => ({ free: $('pgFoods').classList.contains('bentofree'), scroll: $('pgFoods').scrollHeight > $('pgFoods').clientHeight }));
    must(s.free && s.scroll, '320×568: the grid does not fit, so the page scrolls normally'); await p.close();
    p = await open(browser, port, { hash: '#food', empty: true });
    must(await p.evaluate(() => document.querySelectorAll('#fBento .btempty').length === 6 && $('pgFoods').scrollHeight <= $('pgFoods').clientHeight + 1), 'brand-new user: six empty states, still fills the screen');
    await p.close();
    // ---- Gym Buddy ----
    p = await open(browser, port, { hash: '#gym', adv: true });
    s = await p.evaluate(() => { const r = id => $(id).getBoundingClientRect(); return { lib: r('ghLib'), prog: r('ghProg'), rec: r('ghRec'), week: r('ghWeek'), fab: $('fab').getBoundingClientRect(), fabOn: !$('fab').classList.contains('hide'),
      pills: document.querySelectorAll('#ghWeek .wpd').length, total: $('ghWeek').querySelector('.btr b').textContent, scroll: $('pgGym').scrollHeight - $('pgGym').clientHeight,
      bars: $('ghLib').querySelectorAll('.btbar').length, acc: $('ghLib').querySelectorAll('.btbar.acc').length, stat: ($('ghProg').querySelector('.btstat b') || {}).textContent, line: !!$('ghProg').querySelector('.ghline .dot'),
      text: $('ghRec').innerText.replace(/\s+/g, ' ').trim(), dots: $('ghRec').querySelectorAll('.ghdots i').length, label: [...document.querySelectorAll('#ghWeek .wpd em')].map(e => e.textContent) }; });
    must(Math.abs(s.rec.top - s.lib.top) < 2 && Math.abs(s.rec.bottom - s.prog.bottom) < 2 && s.rec.left > s.lib.right, 'Gym: RECOVERY+ is one tall tile beside Workouts + Progress');
    must(s.week.bottom <= s.fab.top && s.fab.top - s.week.bottom <= 4 && s.fabOn && s.scroll <= 1, `Week Planner ends 2-4 px above the Start Workout pill (${Math.round(s.fab.top - s.week.bottom)} px), no scroll`);
    must(await p.evaluate(() => getComputedStyle($('pgGym')).overflowY === 'hidden'), 'Gym Buddy cannot be dragged when they fit');
    must(await p.evaluate(() => { const v = $('ghProg').querySelector('.ghvol'), s = $('ghProg').querySelector('.btstat'); return !!v.querySelector('.ar') && /\b(up|down|flat)\b/.test(v.className) && (!s || /\b(up|down|flat)\b/.test(s.className)); }), 'Progress: filled smooth curve, trend colour class on the stat and the curve');
    const few = await p.evaluate(() => { const keep = sessions; sessions = keep.slice(0, 5); renderGymHub(); const r = { txt: $('ghProg').innerText, line: !!$('ghProg').querySelector('.ghline') }; sessions = keep; renderGymHub(); return r; });
    must(/Finish 8 workouts/.test(few.txt) && /5\/8/.test(few.txt) && !few.line, `Progress: under 8 workouts only a message counts up ("${few.txt.replace(/\n/g, ' ')}")`);
    must(s.pills === 7 && s.total === '4', 'Week Planner: 7 pills, Total Gym Sessions 4');
    must(s.bars >= 2 && s.bars <= 4 && s.acc === 1, `Workouts: ${s.bars} muscle bars, the top one in the accent colour`);
    must(!!s.stat && s.line, `Progress: rotating stat "${s.stat}" + 8-week line with an end dot`);
    must(s.text === 'RECOVERY+' && s.dots === 2, 'RECOVERY+: only the body + two dots, no numbers');
    must(s.label.some(x => /Long Workout/.test(x)) && s.label.includes('Rest'), 'advanced mode: workout names under the pills');
    must(await p.evaluate(() => [...document.querySelectorAll('#ghWeek .wpd em')].filter(e => e.firstChild && e.firstChild.className === 'tk' || e.scrollWidth <= e.clientWidth + 1).length === 7), 'long names: any day whose name does not fit scrolls like a news ticker (js/core.js), the rest sit still');
    must(await p.evaluate(async () => { const sp = $('ghProg').querySelector('.btstat.big span'); if(!sp) return true; sp.textContent = 'Best lift · Smith Incline Bench Press Machine Heavy'; await new Promise(r => setTimeout(r, 400));
      const i = sp.querySelector('.tk>.tki'); return !!i && getComputedStyle(i).animationName === 'tkRun'; }), 'Progress: a too-long line scrolls like a news ticker');
    const side0 = await p.evaluate(() => GH_REC.side); await p.waitForTimeout(9700);
    s = await p.evaluate(() => ({ side: GH_REC.side, on: [...document.querySelectorAll('#ghRec .ghdots i')].findIndex(e => e.classList.contains('on')) }));
    must(s.side !== side0 && s.on === s.side, 'RECOVERY+ switches sides after 9 s, dots follow');
    await p.evaluate(() => { location.hash = '#gym-prog'; }); await p.waitForTimeout(400); must(await p.evaluate(() => !GH_REC.tm), 'the slide stops when the Gym home is not showing');
    await p.evaluate(() => { location.hash = '#gym'; }); await p.waitForTimeout(500);
    await tap(p, '#ghWeek'); await p.waitForTimeout(400); must(await p.evaluate(() => location.hash === '#gym-week'), 'Week Planner tile opens the planner');
    must(!p.errs.length, 'no page errors (Gym Buddy) ' + p.errs.slice(0, 2).join(' | ')); await p.close();
    p = await open(browser, port, { hash: '#gym', reduce: true }); const r0 = await p.evaluate(() => GH_REC.side); await p.waitForTimeout(9600);
    must(await p.evaluate(s0 => GH_REC.side === s0 && !GH_REC.tm, r0), 'Reduce Motion: no automatic switch'); await p.close();
    p = await open(browser, port, { hash: '#gym', empty: true });
    must(await p.evaluate(() => /No workouts saved yet/.test($('ghLib').innerText) && document.querySelectorAll('#ghWeek .wpd.rest').length === 7), 'Gym, brand-new user: empty states'); await p.close();
    // ---- streak bubble + My Food Log ----
    p = await open(browser, port, { hash: '#today' });
    s = await p.evaluate(() => ({ pinned: $('pgToday').classList.contains('pinned'), line: document.querySelector('#dBlocks .gdline'), txt: document.querySelector('#dBlocks .gdline') && document.querySelector('#dBlocks .gdline').innerText }));
    must(s.pinned, 'My Food Log: the top is pinned, the Eaten list scrolls');
    const gl = await p.evaluate(() => { const e = document.querySelector('#dBlocks .gdline'); return e ? { h: e.offsetHeight, t: e.innerText.replace(/\s+/g, ' ') } : null; });
    must(gl && gl.h <= 46 && !/Today/.test(gl.t) && /(Gym Day|Rest Day)/.test(gl.t), `gym-day card is one slim line (${gl && gl.h} px): "${gl && gl.t}"`);
    await tap(p, '#pgToday .stkbub'); await p.waitForTimeout(500);
    s = await p.evaluate(() => ({ open: $('ovStreak').classList.contains('open'), cells: document.querySelectorAll('#stkBody .stkcalg i').length, on: document.querySelectorAll('#stkBody .stkcalg i.on').length }));
    must(s.open && s.cells === 28 && s.on >= 1, `streak bubble opens the history: calendar of 4 weeks, ${s.on} trained days`);
    must(!p.errs.length, 'no page errors (My Food Log) ' + p.errs.slice(0, 2).join(' | ')); await p.close();
    // Greek + light: no errors, nothing cut off sideways
    p = await open(browser, port, { hash: '#food', lang: 'el', light: true });
    s = await p.evaluate(() => ({ w: document.documentElement.scrollWidth, errs: 0 })); await p.evaluate(() => { location.hash = '#gym'; }); await p.waitForTimeout(800);
    must(s.w <= 390 && !p.errs.length, 'Greek + light: no sideways scroll, no errors ' + p.errs.slice(0, 2).join(' | ')); await p.close();
  } finally { await browser.close(); srv.close(); }
  console.log(fails ? `${pass}/${pass + fails} pass` : `${pass}/${pass} pass`); process.exit(fails ? 1 : 0);
})();
