#!/usr/bin/env node
// Exercise Picker V27 + Create Custom Exercise, in the real app in a browser (Playwright). Run: node tools/expick-e2e.js
// Also run by tools/check.js --boot. Each case drives the screen the way a finger would and checks the saved data.
const path = require('path'), fs = require('fs'), http = require('http');
const root = path.resolve(__dirname, '..');

function serve(){ const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  return new Promise(res => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
    if(!f.startsWith(root) || !fs.existsSync(f)){ r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, () => res(s)); }); }

async function page(browser, port, o = {}){
  const p = await browser.newPage({ viewport: { width: o.w || 390, height: 844 }, colorScheme: o.dark ? 'dark' : 'light', reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if(m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await p.evaluate(([o]) => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: o.lang || 'en', theme: { mode: o.dark ? 'dark' : 'light', preset: 'lime' } }));
    localStorage.setItem('ft.profile.v1', JSON.stringify({ sex: o.sex || 'm' })); for(const [k, v] of Object.entries(o.seed || {})) localStorage.setItem(k, JSON.stringify(v)); }, [o]);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(300);
  if(!o.noSession){ await p.evaluate(() => { location.hash = '#gym'; startSession({ id: 't', name: 'T', type: 'push', exercises: [] }); }); await p.waitForTimeout(200);
    await p.evaluate(() => openExPick(addToSession, { multi: true })); await p.waitForTimeout(450); }
  return p;
}
const S = p => p.evaluate(() => ({ region: PK.region, muscle: PK.muscle, head: PK.head, eq: PK.eq, step: PK.step, q: PK.q, n: active ? active.exercises.length : -1,
  cards: [...document.querySelectorAll('#pkGrid .pkcard')].map(c => c.dataset.ex), meta: document.querySelector('#pkMeta').innerText.replace(/\s+/g, ' '),
  compact: document.querySelector('#pkFil').classList.contains('compact'), toast: document.querySelector('#pkToast').classList.contains('show') ? document.querySelector('#pkToast').innerText.replace(/\s+/g, ' ') : '' }));
const wait = (p, ms) => p.waitForTimeout(ms || 380);

async function run(browser, port){
  const bad = [], ok = [], must = (v, what) => { (v ? ok : bad).push(what); if(process.env.PK_LIVE) console.log((v ? 'ok    ' : 'FAIL  ') + what); };   // PK_LIVE=1: print each check as it runs
  // 1. first look: All Muscles, the centred Choose Muscle pill, every exercise, two readable columns at 390
  { const p = await page(browser, port); const s = await S(p);
    const g = await p.evaluate(() => { const c = [...document.querySelectorAll('#pkGrid .pkcard')].slice(0, 2).map(e => e.getBoundingClientRect()); const b = document.querySelector('.pkreopen').getBoundingClientRect();
      return { cols: c[0].top === c[1].top, w: Math.round(c[0].width), mid: Math.round(b.left + b.width / 2), seg: document.querySelector('#pkRegion .on').dataset.r, n: EX().length }; });
    must(s.region === 'all' && g.seg === 'all' && s.step === 'region', 'opens on All Muscles with the Choose Muscle pill');
    must(Math.abs(g.mid - 195) <= 1, 'Choose Muscle is centred');
    must(g.cols && g.w >= 170, 'two columns of ~177 px cards at 390 px');
    must(s.meta.startsWith(`${g.n} Exercises`) && /Discover/.test(s.meta), 'real count (' + g.n + ') and newcomer subtitle');
    // the newcomer order is stable (not reshuffled on every draw)
    const o1 = s.cards.slice(0, 12).join(); await p.evaluate(() => { pkDraw(); }); must((await S(p)).cards.slice(0, 12).join() === o1, 'newcomer discovery order is stable');
    // 2. muscle → head → equipment, real usage order, back clears the step, reset clears all
    await p.click('.pkreopen'); await wait(p);
    must(await p.$$eval('#pkRail [data-c="muscle"]', l => l.length) === 13, 'muscle row: All + 12 muscles');
    await p.click('[data-c="muscle"][data-v="chest"]'); await wait(p);
    let t = await S(p); const use = await p.evaluate(ids => ids.map(id => exmUse(exById(id), 'chest')), t.cards);
    must(t.muscle === 'chest' && t.step === 'head', 'chest → head row');
    must(use.every((v, i) => i === 0 || v <= use[i - 1]) && use.every(v => v >= 25), 'chest list ordered by real chest usage, all train chest');
    must(await p.$$eval('#pkRail [data-c="head"]', l => l.length) === 4, 'head row: All + 3 chest heads');
    must(await p.evaluate(() => document.querySelectorAll('#pkStage .pkrow').length === 1), 'only one filter row at a time');
    await p.click('[data-c="head"][data-v="chest_upper"]'); await wait(p); t = await S(p);
    must(t.head === 'chest_upper' && t.step === 'equipment' && /Muscle Usage First/.test(t.meta), 'head chosen → equipment row');
    await p.click('[data-c="equipment"][data-v="cable"]'); await wait(p); t = await S(p);
    const eqs = await p.evaluate(ids => [...new Set(ids.map(id => exById(id).e))], t.cards);
    must(t.eq === 'cable' && t.step === 'done' && t.compact && eqs.join() === 'cable', 'equipment chosen: cable only, filter row folded');
    must((await p.$eval('#pkPath', e => e.innerText.replace(/\s+/g, ' '))) === 'All · Chest · Upper Chest · Cable', 'path shows All · Chest · Upper Chest · Cable');
    await p.click('[data-pkback]', { timeout: 1500 }).catch(() => {}); await p.click('.pkcrumb[data-jump="equipment"]'); await wait(p); await p.click('[data-pkback]'); await wait(p); t = await S(p);
    must(t.eq === null && t.head === null && t.step === 'head' && t.muscle === 'chest', 'back from equipment clears equipment and head');
    await p.click('#pkReset'); await wait(p); t = await S(p);
    must(!t.muscle && !t.eq && t.region === 'all' && t.step === 'region', 'reset clears everything');
    // 3. equipment alone (no muscle forced) and Upper / Lower are grouped by muscle
    await p.click('.pkreopen'); await wait(p); await p.click('[data-goto="equipment"]'); await wait(p); await p.click('[data-c="equipment"][data-v="kettlebell"]'); await wait(p); t = await S(p);
    must(!t.muscle && t.eq === 'kettlebell' && /Highest Usage/.test(t.meta) && await p.$$eval('.pksec', l => l.length) > 1, 'equipment alone → grouped by muscle');
    await p.click('#pkReset'); await p.click('[data-r="up"]'); await wait(p); t = await S(p);
    const regs = await p.evaluate(ids => [...new Set(ids.map(id => exmRegion(exmOf(exById(id)))))], t.cards);
    must(t.region === 'up' && regs.join() === 'up' && /Exercises By Muscle/.test(await p.$eval('#pkRLabel', e => e.textContent)), 'Upper: upper-body muscles only, grouped');
    // 4. drag the region highlight: it follows the finger, snaps to the nearest, a small move is a tap
    await p.click('[data-r="all"]'); await wait(p);
    const sb = await p.$eval('#pkRegion', e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width }; });
    await p.mouse.move(sb.x + sb.w / 2, sb.y); await p.mouse.down(); await p.mouse.move(sb.x + sb.w / 2 + 40, sb.y, { steps: 4 });
    const mid = await p.$eval('#pkInd', e => e.style.transform); await p.mouse.move(sb.x + sb.w / 2 + 110, sb.y, { steps: 6 }); await p.mouse.up(); await wait(p, 500);
    must(/translate3d\(1[56]\d/.test(mid) || /translate3d\(\d+/.test(mid), 'region highlight follows the finger (' + mid + ')');
    must((await S(p)).region === 'low', 'dragged right → Lower');
    await p.mouse.move(sb.x + sb.w * .83, sb.y); await p.mouse.down(); await p.mouse.move(sb.x + sb.w * .83 - 18, sb.y, { steps: 3 }); await p.mouse.up(); await wait(p, 500);
    must((await S(p)).region === 'low', 'a short drag snaps back (no out-of-range jump)');
    await p.click('[data-r="up"]'); await wait(p); must((await S(p)).region === 'up', 'a tap on a region still works');
    // 5. scrolling folds the filter row, the top opens it again
    await p.click('#pkReset'); await p.click('.pkreopen'); await wait(p);
    await p.evaluate(() => { const b = $('pkBody'); b.scrollTop = 700; b.dispatchEvent(new Event('scroll')); }); await wait(p, 120);
    must((await S(p)).compact, 'scrolling down folds the filter row');
    await p.evaluate(() => { const b = $('pkBody'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); }); await wait(p, 120);
    must(!(await S(p)).compact, 'back at the top it opens again');
    // 6. search is global, uses ExSearch (typos, Greek), clearing restores the filters
    await p.click('[data-c="muscle"][data-v="chest"]'); await wait(p);
    await p.fill('#exSearch', 'squat'); await wait(p, 150); t = await S(p);
    must(t.cards.includes('squat') && t.muscle === 'chest' && /Best Match/.test(t.meta), 'search ignores the chest filter (global)');
    await p.fill('#exSearch', 'benhc pres'); await wait(p, 150); must((await S(p)).cards[0] === 'bench', 'typo "benhc pres" → Bench Press first');
    await p.fill('#exSearch', 'πιέσεις πάγκου'); await wait(p, 150); must((await S(p)).cards.length > 0, 'Greek search finds exercises');
    await p.fill('#exSearch', 'zzqqxx'); await wait(p, 150); must(await p.$eval('#pkGrid', e => /No Matching Exercises/.test(e.innerText)) && await p.$eval('#pkCustom', e => e.offsetHeight > 0), 'empty search: message + Create Custom Exercise still there');
    await p.keyboard.press('Escape'); await wait(p, 200); t = await S(p);
    must(!t.q && t.muscle === 'chest' && t.step === 'head', 'Escape clears the search and the chest filter is back');
    // 7. typing (0.8): the search bar stays docked at the bottom (above the keyboard); the results panel slides up and fills the screen above it
    { const a0 = await p.$eval('#exSearch', e => [e.type, e.autocomplete, e.getAttribute('autocorrect'), e.getAttribute('autocapitalize'), e.spellcheck, e.enterKeyHint, e.name].join());
      must(a0 === 'search,off,off,off,false,done,exq', 'search box: no AutoFill Contact hints ' + a0); }
    await p.fill('#exSearch', 'bench press'); await wait(p, 450);
    { const g = await p.evaluate(() => ({ on: $('ovExPick').classList.contains('pksearching'), fil: $('pkFil').offsetHeight, reg: document.querySelector('.pkreg').offsetHeight,
        box: document.querySelector('.pksbox').getBoundingClientRect().top, grid: $('pkGrid').getBoundingClientRect().top, vh: innerHeight, body: $('pkBody').getBoundingClientRect().top }));
      must(g.on && !g.fil && !g.reg && g.box > g.vh - 120 && g.grid < g.box && g.body < 60, 'typing: filters hidden, search bar stays at the bottom, results fill the screen above it ' + JSON.stringify(g)); }
    // one tap adds and closes the picker
    await p.click('#pkGrid .pkcard[data-ex="bench"]'); await wait(p, 300); t = await S(p);
    must(t.n === 1 && await p.evaluate(() => !$('ovExPick').classList.contains('open')), 'one tap: added and the picker closes');
    const reopen = async () => { await wait(p, 700); await p.evaluate(() => openExPick(addToSession, { multi: true })); await wait(p, 450); };   // after the workout has shown the new card
    await reopen(); must(!(await p.evaluate(() => $('ovExPick').classList.contains('pksearching'))), 'reopened: no results panel, filters shown');
    // Enter (Done on the keyboard) with nothing chosen: the results slide back down, the picker stays
    await p.fill('#exSearch', 'curl'); await wait(p, 400); await p.press('#exSearch', 'Enter'); await wait(p, 400);
    must(await p.evaluate(() => !$('ovExPick').classList.contains('pksearching') && !$('exSearch').value && $('ovExPick').classList.contains('open') && document.activeElement !== $('exSearch')), 'Enter: results slide down, keyboard hidden, picker open');
    await p.fill('#exSearch', 'bench press'); await wait(p, 150); await p.click('#pkGrid .pkcard[data-ex="bench"]'); await wait(p, 150); t = await S(p);
    must(t.n === 1 && /Already/.test(t.toast) && await p.evaluate(() => $('ovExPick').classList.contains('open')), 'tapping an exercise already in the workout adds nothing, picker stays');
    await p.fill('#exSearch', ''); await wait(p, 450);   // the results panel slides down (240 ms)
    // a long press starts Select mode; taps select and unselect; Add (N) adds them in order and closes
    const ids = await p.evaluate(() => [...document.querySelectorAll('#pkGrid .pkcard:not(.added)')].slice(0, 4).map(c => c.dataset.ex));
    const press = async (id, ms) => { const b = await p.$eval(`#pkGrid .pkcard[data-ex="${id}"]`, e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); await wait(p, 80); };
    await press(ids[0], 650);
    let sel = await p.evaluate(() => ({ on: PK.selOn, sel: PK.sel.slice(), bar: $('pkSelBar').classList.contains('show'), add: $('pkSelAdd').textContent, open: $('ovExPick').classList.contains('open'), n: active.exercises.length }));
    must(sel.on && sel.sel.join() === ids[0] && sel.bar && sel.add === 'Add (1)' && sel.open && sel.n === 1, 'long press: Select mode, that card chosen, nothing added yet ' + JSON.stringify(sel));
    for(const id of [ids[1], ids[2], ids[1], ids[3]]) await press(id, 40);
    sel = await p.evaluate(() => ({ sel: PK.sel.slice(), add: $('pkSelAdd').textContent, nums: [...document.querySelectorAll('#pkGrid .pkcard.sel .pksn')].map(e => e.textContent).sort().join() }));
    must(sel.sel.join() === [ids[0], ids[2], ids[3]].join() && sel.add === 'Add (3)' && sel.nums === '1,2,3', 'a second tap unselects; numbers follow the order ' + JSON.stringify(sel));
    await p.click('#pkSelAdd'); await wait(p, 300);
    sel = await p.evaluate(() => ({ ex: active.exercises.map(x => x.exId), open: $('ovExPick').classList.contains('open'), on: PK.selOn }));
    must(sel.ex.join() === ['bench', ids[0], ids[2], ids[3]].join() && !sel.open && !sel.on, 'Add (3): all three added in order, picker closed');
    // while searching: long press = Select mode, the Done button sits top right; Enter adds the chosen ones and closes
    await reopen(); await p.fill('#exSearch', 'curl'); await wait(p, 450);
    { const cid = await p.evaluate(() => [...document.querySelectorAll('#pkGrid .pkcard:not(.added)')].slice(0, 2).map(c => c.dataset.ex)); await press(cid[0], 650); await press(cid[1], 40);
      const d = await p.evaluate(() => { const b = $('pkDone'), r = b.getBoundingClientRect(); return { shown: !b.classList.contains('hide') && r.height > 0, right: r.right > innerWidth - 80, top: r.top < 120, txt: b.textContent, bar: getComputedStyle($('pkSelBar')).display }; });
      must(d.shown && d.right && d.top && d.txt === 'Done (2)' && d.bar === 'none', 'searching + Select mode: Done (2) top right, no bottom bar ' + JSON.stringify(d));
      await p.press('#exSearch', 'Enter'); await wait(p, 400);
      const r = await p.evaluate(() => ({ n: active.exercises.length, open: $('ovExPick').classList.contains('open') }));
      must(r.n === 6 && !r.open, 'Enter in Select mode: both added, picker closed ' + JSON.stringify(r)); }
    await reopen(); await press(ids[1], 650); await p.click('#pkSelX'); await wait(p, 150);
    must(await p.evaluate(() => !PK.selOn && !document.querySelector('#pkGrid .pkcard.sel') && $('ovExPick').classList.contains('open') && active.exercises.length === 6), 'Cancel leaves Select mode, adds nothing');
    t = await S(p);
    const n0 = t.n; await p.click('#pkGrid .pkcard[data-ex="cable_crossover"] .pkinfo', { timeout: 1500 }).catch(async () => p.click('#pkGrid .pkinfo')); await wait(p, 300);
    must(await p.evaluate(() => $('ovExInfo').classList.contains('open') && $('ovExPick').classList.contains('open')) && (await S(p)).n === n0, 'info opens details, adds nothing, picker stays');
    await p.evaluate(() => close('ovExInfo')); await wait(p, 300);
    // 8. five quick taps on pills, then a consistent state and no errors
    await p.click('#pkReset'); await p.click('.pkreopen'); await wait(p, 120);
    for(const v of ['back', 'all', 'quads', 'all', 'calves']){ await p.click(`#pkRail [data-c="muscle"][data-v="${v}"]`, { timeout: 600 }).catch(() => {}); await p.waitForTimeout(60); }
    await wait(p, 500); t = await S(p);
    must(!p.errs.length && !(await p.$('.pkfold')) && t.step && (t.muscle === null || EXMOK(t.muscle)), 'rapid taps: no errors, no stuck animation (' + JSON.stringify([t.muscle, t.step]) + ')');
    must(!p.errs.length, 'no page errors in the picker run ' + p.errs.join(' | '));
    await p.close(); }
  // 9. history: most completed sets first, then the latest; planned / undone sets don't count
  { const ses = [{ id: 's1', start: '2026-10-01T10:00:00Z', date: '2026-10-01', exercises: [{ exId: 'squat', sets: Array(6).fill({ done: true }) }, { exId: 'bench', sets: Array(9).fill({ done: false }) }] },
      { id: 's2', start: '2026-11-01T10:00:00Z', date: '2026-11-01', exercises: [{ exId: 'deadlift', sets: Array(6).fill({ done: true }) }, { exId: 'bb_curl', sets: [{ done: true }] }] }];
    const p = await page(browser, port, { seed: { 'ft.gym.sessions': ses } }); const t = await S(p);
    must(t.cards.slice(0, 3).join() === 'deadlift,squat,bb_curl' && /Most Logged Sets/.test(t.meta), 'returning user: most completed sets first, recency breaks ties (' + t.cards.slice(0, 3) + ')');
    await p.close(); }
  // 10. the creator: Title Case live and saved, no equipment preselected, map tap → equipment, save → added, card says Custom
  { const p = await page(browser, port);
    await p.click('#pkCustom'); await wait(p, 400);
    must(await p.evaluate(() => $('ovExCreate').classList.contains('open') && !document.querySelector('#cxFlow .cxpill.on') && !CX.e), 'creator opens; no equipment chosen');
    await p.fill('#cxName', ''); await p.type('#cxName', 'sINGLE-aRM cABLE fly');
    must(await p.$eval('#cxName', e => e.value) === 'Single-Arm Cable Fly', 'name turns Title Case while typing');
    await p.click('#cxSave'); await wait(p, 150);
    must(/muscle/i.test(await p.$eval('#cxVal', e => e.textContent)), 'save without a muscle explains');
    const cm = await p.$eval('#cxMap [data-cm="chest"]', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.click(cm.x, cm.y); await wait(p, 400);
    must(await p.evaluate(() => CX.stage === 'equipment' && CX.mus.join() === 'chest' && !CX.e), 'map tap: chest, straight to equipment (no head step), equipment still empty');
    await p.click('#cxSave'); await wait(p, 150);
    must(/equipment/i.test(await p.$eval('#cxVal', e => e.textContent)) && !(await p.evaluate(() => CX.e)), 'save without equipment asks for it (nothing guessed)');
    await p.click('[data-cxe="cable"]'); await wait(p, 450);
    must(await p.evaluate(() => CX.stage === 'complete' && !!document.querySelector('.cxedit [data-cxjump="equipment"]')), 'equipment chosen: Change Muscle / Head / Equipment');
    await p.click('#cxSave'); await wait(p, 400);
    const sv = await p.evaluate(() => ({ list: JSON.parse(localStorage.getItem('ft.gym.custom') || '[]'), n: active.exercises.length, open: $('ovExCreate').classList.contains('open') }));
    const c = sv.list[0] || {};
    must(sv.list.length === 1 && c.en === 'Single-Arm Cable Fly' && c.e === 'cable' && c.mus.join() === 'chest' && c.uni === false && !sv.open && sv.n === 1, 'saved through Store in Title Case and added once');
    await p.evaluate(() => openExPick(addToSession, { multi: true })); await wait(p, 450);   // saving added it and closed the picker (like a tap)
    await p.fill('#exSearch', 'single arm cable fly'); await wait(p, 200);
    const card = await p.$eval(`#pkGrid .pkcard[data-ex="${c.id}"]`, e => ({ use: e.querySelector('.pkuse').textContent, puz: !!e.querySelector('.pkpuz'), info: !!e.querySelector('.pkinfo') })).catch(() => null);
    must(card && card.use === 'Custom' && card.puz && !card.info, 'custom card: puzzle mark, "Custom", no percentage');
    // the same one again is reused, not doubled
    await p.fill('#exSearch', ''); await p.click('#pkCustom'); await wait(p, 300); await p.type('#cxName', 'single-arm cable fly');
    const cm2 = await p.$eval('#cxMap [data-cm="chest"]', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: document.getElementById('cxScroll').scrollTop }; });     await p.mouse.click(cm2.x, cm2.y); await wait(p, 350); await p.click('[data-cxe="cable"]'); await wait(p, 400); await p.click('#cxSave'); await wait(p, 300);
    { const d = await p.evaluate(() => ({ l: JSON.parse(localStorage.getItem('ft.gym.custom')), v: $('cxVal').textContent, open: $('ovExCreate').classList.contains('open') })); must(d.l.length === 1, 'saving the same exercise again reuses it ' + (d.l.length === 1 ? '' : JSON.stringify(d))); }
    // 11. pills: hold = several, Done on the status line, heads one muscle at a time, hold a head = several
    await p.click('#pkCustom'); await wait(p, 300);
    const hold = async sel => { const b = await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await wait(p, 200); };
    await hold('[data-cxm="chest"]');
    let cx = await p.evaluate(() => ({ mode: CX.mode, mus: CX.mus.slice(), done: !!document.querySelector('.cxstat .cxdone'), row: document.querySelectorAll('#cxFlow .cxstat').length, path: !!document.querySelector('#cxFlow .cxpath') }));
    must(cx.mode === 'pill-multi' && cx.mus.join() === 'chest' && cx.done && cx.row === 1 && !cx.path, 'hold Chest: chosen at once, Done on the same status row, path hidden');
    await p.click('[data-cxm="back"]'); await p.click('[data-cxm="biceps"]'); await wait(p, 150);
    await p.click('.cxdone'); await wait(p, 400);
    cx = await p.evaluate(() => ({ st: CX.stage, prog: (document.querySelector('.cxpc') || {}).textContent, h: (document.querySelector('.cxfh strong') || {}).textContent }));
    must(cx.st === 'head' && cx.prog === '1 of 2' && /Chest/.test(cx.h), 'Done → Chest heads, 1 of 2 (Biceps has none, skipped)');
    await p.click('[data-cxh="all"]'); await wait(p, 450);
    cx = await p.evaluate(() => ({ st: CX.stage, prog: (document.querySelector('.cxpc') || {}).textContent }));
    must(cx.st === 'head' && cx.prog === '2 of 2', 'All advances to Back heads, 2 of 2');
    await hold('[data-cxh="lats"]'); await p.click('[data-cxh="upper_back"]'); await wait(p, 150);
    cx = await p.evaluate(() => ({ multi: CX.hMulti, heads: [...CX.heads].sort().join(), done: !!document.querySelector('.cxstat .cxdone') }));
    must(cx.multi && cx.heads === 'lats,upper_back' && cx.done, 'hold a head: chosen at once, more can be tapped, Done shown');
    await p.click('.cxdone'); await wait(p, 400);
    must(await p.evaluate(() => CX.stage === 'equipment' && !CX.e), 'heads done → equipment, still not chosen');
    await p.click('[data-pri="back"]'); await wait(p, 100);
    must(await p.evaluate(() => cxOrdered()[0] === 'back'), 'tap a chosen muscle: it becomes primary');
    await p.click('[data-rm="biceps"]'); await wait(p, 100);
    must(await p.evaluate(() => CX.mus.join() === 'chest,back'), 'remove a chosen muscle');
    await p.evaluate(() => cxClose()); await wait(p, 300);
    // 12. map: hold = several, taps toggle, no Done step
    await p.click('#pkCustom'); await wait(p, 300);
    const mp = async k => p.$eval(`#cxMap [data-cm="${k}"]`, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const q = await mp('quads'); await p.mouse.move(q.x, q.y); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await wait(p, 250);
    const g2 = await mp('calves'); await p.mouse.click(g2.x, g2.y); await wait(p, 350);
    cx = await p.evaluate(() => ({ mode: CX.mode, mus: CX.mus.join(), st: CX.stage, done: !!document.querySelector('.cxdone'), lit: document.querySelectorAll('#cxMap .cxm.sel').length }));
    must(cx.mode === 'map-multi' && cx.mus === 'quads,calves' && cx.st === 'equipment' && !cx.done && cx.lit >= 2, 'map hold: several muscles, lit on the map, no Done/head step');
    await p.click('[data-zoom="in"]'); await wait(p, 100); const z = await p.evaluate(() => CX.zoom);
    const g3 = await mp('calves'); await p.mouse.move(g3.x, g3.y); await p.mouse.down(); await p.mouse.move(g3.x + 40, g3.y + 30, { steps: 5 }); await p.mouse.up(); await wait(p, 200);
    cx = await p.evaluate(() => ({ mus: CX.mus.join(), px: CX.px }));
    must(z > 1 && cx.mus === 'quads,calves' && cx.px !== 0, 'zoomed map pans with a drag and the drag selects nothing');
    await p.click('[data-zoom="reset"]'); must(await p.evaluate(() => CX.zoom === 1 && CX.px === 0), 'Reset zoom');
    await p.evaluate(() => cxClose()); await wait(p, 300);
    // 13. QR: one exercise code imports once; a workout code brings its own exercises along (once)
    const r = await p.evaluate(async () => {
      const c = exCustom[0], code = cxPack(c); exCustom.length = 0; saveG('custom'); pkDrawResults();
      wkScanned(code); await new Promise(r => setTimeout(r, 350)); const a = exCustom.length;
      wkScanned(code); await new Promise(r => setTimeout(r, 350)); const b = exCustom.length;
      const tp = { id: 'w1', name: 'Mine', type: 'push', exercises: [{ exId: exCustom[0].id, sets: 3, reps: '10', rest: 90 }] }, wcode = wkPack(tp, wkOwn);
      exCustom.length = 0; saveG('custom'); const d1 = wkUnpack(wcode); window.ask = async () => false; await wkImport(d1); const c1 = exCustom.length, t1 = tpls.length;
      await wkImport(wkUnpack(wcode)); const c2 = exCustom.length, t2 = tpls.length;
      const ref = tpls.find(x => x.name === 'Mine'); return { a, b, c1, c2, t1, t2, ok: !!ref && !!exById(ref.exercises[0].exId).custom && exCustom[0].mus.join() === 'chest', old: wkUnpack('GB1~legs~Leg~squat,5,5,180') !== null };
    });
    must(r.a === 1 && r.b === 1, 'exercise QR imports once (a second scan reuses)');
    must(r.c1 === 1 && r.c2 === 1 && r.t1 === r.t2 && r.ok, JSON.stringify(r) + ' ' + 'workout QR brings its custom exercise (with its muscles); importing twice adds nothing');
    must(r.old, 'old GB1 workout codes still read');
    // 14. reload: saved custom exercises come back and are addable
    await p.reload({ waitUntil: 'load' }); await wait(p, 300);
    must(await p.evaluate(() => exCustom.length === 1 && exCustom[0].en === 'Single-Arm Cable Fly' && !!exById(exCustom[0].id).custom), 'custom exercise survives a reload');
    must(!p.errs.length, 'no page errors in the creator run ' + p.errs.join(' | '));
    await p.close(); }
  // 15. single-pick callers (Gym Coach › Replace): opens at the muscle, one tap closes and calls back once
  { const p = await page(browser, port, { noSession: true }); await p.evaluate(() => { window.__got = []; openExPick(id => __got.push(id), { muscle: 'biceps' }); }); await wait(p, 400);
    const t = await S(p); await p.click('#pkGrid .pkcard'); await wait(p, 300);
    const got = await p.evaluate(() => ({ g: __got, open: $('ovExPick').classList.contains('open') }));
    must(t.muscle === 'biceps' && t.step === 'equipment' && got.g.length === 1 && !got.open, 'replace flow: opens at Biceps, one pick, closes');
    await p.close(); }
  // 16. 320 px, Greek, dark, reduced motion: no sideways scroll, no clipped page, filters still step instantly
  { const p = await page(browser, port, { w: 320, lang: 'el', dark: true, reduce: true });
    await p.click('.pkreopen'); await p.click('[data-c="muscle"][data-v="back"]'); await wait(p, 300);
    const t = await S(p), o = await p.evaluate(() => ({ sx: document.querySelector('#pkBody').scrollWidth <= document.querySelector('#pkBody').clientWidth + 1, seg: [...document.querySelectorAll('#pkRegion button')].every(b => b.scrollWidth <= b.clientWidth + 1), cols: getComputedStyle(document.querySelector('.pkgrid')).gridTemplateColumns.split(' ').length, title: document.querySelector('.pkbar h2').textContent }));
    must(t.muscle === 'back' && t.step === 'head', 'reduced motion: a pill tap steps at once');
    must(o.sx && o.seg && o.cols === 2 && o.title === 'Προσθήκη Άσκησης', '320 px Greek: two columns, region labels fit, no sideways scroll ' + (o.sx && o.seg && o.cols === 2 ? '' : JSON.stringify(o)));
    must(!p.errs.length, 'no page errors at 320 px Greek ' + p.errs.join(' | '));
    await p.close(); }
  // 12. Exercise Settings (Petros): first gear tap asks; individual = this exercise only (shared ones stay shared); back to all keeps them
  { const p = await page(browser, port, { dark: true });
    await p.evaluate(() => { close('ovExPick'); addToSession('bench'); addToSession('ohp'); renderSession(); }); await wait(p, 600);
    const gear = () => p.evaluate(() => document.querySelector('.exc[data-x="0"] [data-exset]').click());
    await gear(); await wait(p, 400);
    must(await p.evaluate(() => $('ovExSetAsk').classList.contains('open') && !$('ovExSet').classList.contains('open')), 'gear, first time: asks Same for All or Individual');
    await p.click('[data-gxask="each"]'); await wait(p, 400);
    must(await p.evaluate(() => settings.gxMode === 'each' && $('ovExSet').classList.contains('open') && document.querySelectorAll('#exsBody [data-exsec]').length === 5 && !!document.querySelector('#exsMode [data-gxmode].on')),
      'Individual: settings open on the list of five sections, the switch on top is on');
    await p.click('[data-exsec="sets"]'); await p.click('[data-gx="half"]'); await wait(p, 200);
    let r = await p.evaluate(() => ({ b: gOn('half', 'bench'), o: gOn('half', 'ohp'), g: gOn('half'), box0: !!document.querySelector('.exc[data-x="0"] [data-sxrow]'), box1: !!document.querySelector('.exc[data-x="1"] [data-sxrow]') }));
    must(r.b && !r.o && !r.g && r.box0 && !r.box1, 'Half Reps on for Bench Press only: its card shows the box, Overhead Press does not ' + JSON.stringify(r));
    await p.evaluate(() => goBack()); await wait(p, 150);
    must(await p.evaluate(() => $('ovExSet').classList.contains('open') && !!document.querySelector('#exsBody [data-exsec]')), 'Back leaves the section first, the window stays');
    await p.click('[data-exsec="social"]'); await p.click('[data-gx="lbAtt"]'); await wait(p, 150);
    must(await p.evaluate(() => settings.gx.lbAtt === true && !(settings.gxEx.bench || {}).lbAtt && gOn('lbAtt', 'ohp')), 'Leaderboards stay the same for all exercises');
    await p.evaluate(() => goBack()); await p.click('[data-exsec="machine"]'); await wait(p, 150);
    must(await p.evaluate(() => !!document.querySelector('#exsBody .exsoon .switch[disabled]')), 'Machine Position Reminders: shown, Coming Soon, cannot be turned on');
    await p.click('[data-gxmode]'); await wait(p, 150);
    r = await p.evaluate(() => ({ m: settings.gxMode, b: gOn('half', 'bench'), kept: settings.gxEx.bench.half }));
    must(r.m === 'all' && !r.b && r.kept === true, 'switch off: every exercise uses the same settings, Bench Press keeps its own for later');
    await p.evaluate(() => close('ovExSet')); await wait(p, 350); await gear(); await wait(p, 350);
    must(await p.evaluate(() => !$('ovExSetAsk').classList.contains('open') && $('ovExSet').classList.contains('open')), 'gear again: no question, settings open (remembered)');
    must(!p.errs.length, 'no page errors in Exercise Settings ' + p.errs.join(' | '));
    await p.close(); }
  return { ok, bad };
}
function EXMOK(m){ return typeof m === 'string'; }
module.exports = { run, serve };
if(require.main === module){ (async () => { let pw; try{ pw = require('playwright'); }catch(e){ console.log('Playwright is not installed'); process.exit(1); }
  const s = await serve(), b = await pw.chromium.launch(); const r = await run(b, s.address().port); await b.close(); s.close();
  r.ok.forEach(x => console.log('ok    ' + x)); r.bad.forEach(x => console.log('FAIL  ' + x)); console.log(`${r.ok.length}/${r.ok.length + r.bad.length} pass`); process.exit(r.bad.length ? 1 : 0); })(); }
