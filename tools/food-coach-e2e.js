#!/usr/bin/env node
// Food Coach 2.0 end to end, in a real browser, with a FAKE Gemini (no key, no credits): the whole chat → card → Add → memory path.
// Run from the repo root:  node tools/food-coach-e2e.js      (tools/check.js --boot runs it too). Exit code 1 = a case failed.
// Prints the answer times (p50 / p95) per path so speed changes are visible.

const fs = require('fs');
const path = require('path');
const http = require('http');
const root = path.resolve(__dirname, '..');

let fails = 0;
const ok = m => console.log('ok    ' + m);
const fail = m => { fails++; console.log('FAIL  ' + m); };

// ---- the fake AI: decides from the prompt; mode switches failures on ----
const AI = { mode: 'ok', calls: 0, web: 0, last: '', mealPrompts: [] };
const gem = (obj, usage) => ({ status: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }], usageMetadata: usage || { promptTokenCount: 900, candidatesTokenCount: 200, totalTokenCount: 1100 } }) });
const item = (text, name, grams, kcal, protein, carbs, fat, extra) => ({ text, name, name_en: name, brand: '', qty: null, unit: null, grams, ml: false, kcal, protein, carbs, fat, stated: null, ...(extra || {}) });
const plan = (n) => ({ meals: Array.from({ length: n || 2 }, (_, i) => ({ time: ['19:30', '21:30'][i] || '20:00', title: ['Chicken and rice', 'Greek yoghurt with honey'][i] || 'Eggs on toast',
  items: [{ name: ['chicken breast', 'greek yoghurt'][i] || 'eggs', name_en: ['chicken breast', 'greek yoghurt'][i] || 'eggs', grams: 150, from: 'foods' }], kcal: 300, protein: 30, carbs: 25, fat: 8, why: 'fits what is left' })), tip: '' });
function answer(prompt){
  // the recognised-dish prompt (js/meal.js): recorded so the personality check can read what was really sent
  const dish = (prompt.match(/The user's new message: """([\s\S]*?)"""/) || [])[1];
  if(dish !== undefined){ AI.mealPrompts.push(prompt);
    if(/broken/i.test(dish)) return gem({ intent: 'log', reply: 'Got it.', complex: true, title: 'Gyro', parts: [] });   // unusable: no parts
    if(/ok before|is a gyro|είναι καλό/i.test(dish)) return gem({ intent: 'answer', reply: 'It works if it is a few hours before; keep the fries small.', parts: [] });
    return gem({ intent: 'log', reply: 'Classic. Here is the pita split up.', complex: true, title: 'Pork Gyro Pita', assumed: 'medium pita, no tzatziki', range: true,
      parts: [{ name: 'pita bread', role: 'bread', grams: 75, cook: 'grilled', optional: false, kcal: 218, protein: 6, carbs: 37.5, fat: 4.5 }, { name: 'pork gyro', role: 'meat', grams: 90, cook: 'grilled', optional: false, kcal: 230, protein: 18, carbs: 2, fat: 17 },
        { name: 'fries', role: 'fries', grams: 40, cook: 'fried', optional: false, kcal: 125, protein: 1.5, carbs: 16, fat: 6 }] }); }
  if(/You plan a day of eating/.test(prompt)) return gem(plan(2));
  if(/Find these branded foods/.test(prompt)){ AI.web++; return gem({ items: [{ i: 0, found: true, name: 'White Chocolate Protein Bar', brand: 'Snickers', kcal: 368, protein: 35, carbs: 33, fat: 14, fiber: 2, unit: 'g', assumed: '1 bar = 57 g' }] }); }
  const msg = (prompt.match(/User: """([\s\S]*?)"""/) || [])[1] || '';
  AI.last = msg;
  if(/snickers/i.test(msg)) return gem({ intent: 'log', reply: 'Nice post-gym haul. Here it is.', complex: false, items: [
    item('250g chicken breast', 'chicken breast', 250, 165, 31, 0, 3.6, { qty: 250, unit: 'g' }),
    item('tomato sauce', 'tomato sauce', 80, 50, 1.5, 8, 1.5),
    item('white chocolate Snickers protein bar', 'white chocolate protein bar', 57, 380, 35, 35, 14, { brand: 'Snickers', qty: 1, unit: 'piece', stated: { protein: 20 } }),
    item('one protein toast', 'protein toast', 60, 250, 20, 25, 6, { qty: 1, unit: 'piece' }) ] });
  if(/chicken and rice/i.test(msg)) return gem({ intent: 'log', reply: 'Solid post-workout plate: protein plus carbs to refill. A bit of veg next time and it is textbook.', complex: false, items: [
    item('chicken', 'chicken breast', 200, 165, 31, 0, 3.6), item('rice', 'cooked white rice', 250, 130, 2.7, 28, 0.3) ] });
  if(/ok before/i.test(msg)) return gem({ intent: 'answer', reply: 'It works if it is a few hours before; keep the fries small.', complex: false, items: [] });
  if(/any thoughts/i.test(msg)) return gem({ intent: 'suggest', reply: 'Something with protein and a few carbs would fit nicely.', complex: false, items: [], meals: plan(1).meals });
  if(/is fruit sugar bad/i.test(msg)) return gem({ intent: 'answer', reply: 'Not for most people: whole fruit comes with fibre and water, so it is fine.', complex: false, items: [] });
  if(/broken json/i.test(msg)) return gem('this is not json');
  return gem({ intent: 'log', reply: 'Got it.', complex: false, items: [item(msg, msg.slice(0, 30), 100, 200, 10, 20, 8)] });
}

(async () => {
  let pw; try { pw = require('playwright'); } catch { console.log('note  Playwright not installed: food-coach-e2e skipped'); process.exit(process.argv.includes('--strict') ? 1 : 0); }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
  const port = srv.address().port, browser = await pw.chromium.launch(), errs = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/generativelanguage\.googleapis\.com/, async route => {
    const url = route.request().url();
    if (/models\?pageSize/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) }) });
    AI.calls++;
    if (AI.mode === 'quota') return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { message: 'You exceeded your current quota', details: [{ retryDelay: '50s' }] } }) });
    if (AI.mode === 'down') return route.abort('failed');
    if (AI.mode === 'slow') { await new Promise(r => setTimeout(r, 12000)); return route.fulfill({ status: 503, body: '{}' }); }
    const body = JSON.parse(route.request().postData() || '{}'), prompt = (((body.contents || [])[0] || {}).parts || [])[0].text || '';
    const a = answer(prompt); await new Promise(r => setTimeout(r, 120));   // a quick model
    return route.fulfill({ status: a.status, contentType: 'application/json', body: a.body });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.evaluate(() => { settings.geminiKey = 'test-key'; settings.model = 'gemini-flash-latest'; Store.save('settings', settings);
    targets = { gym: { k: 2800, p: 180, c: 320, f: 80 }, rest: { k: 2400, p: 170, c: 250, f: 75 } }; Store.save('targets', targets); });
  await page.evaluate(() => Coach.open('chef')); await page.waitForTimeout(400);

  // send one message, wait until the robot has answered; returns { ms, calls, cards, text }
  async function send(txt){
    const c0 = AI.calls, w0 = AI.web, t0 = Date.now();
    await page.evaluate(x => { const ta = $('coachIn'); ta.value = x; ta.dispatchEvent(new Event('input')); $('coachForm').requestSubmit(); }, txt);
    await page.waitForFunction(() => !document.querySelector('#coachList .cwork'), null, { timeout: 30000 });
    const ms = Date.now() - t0;
    const st = await page.evaluate(() => ({ cards: document.querySelectorAll('#coachList .lqcard').length, text: [...document.querySelectorAll('#coachList .cmsg.bot .ctext')].map(e => e.textContent).pop() || '' }));
    return { ms, calls: AI.calls - c0 - (AI.web - w0), ...st };   // blocking calls only (the label check runs in the background)
  }
  const last = () => page.evaluate(() => { const m = logQPrev; if (!m) return null;
    return { state: m.state, can: logQCanAdd(m), rows: m.items.map(it => ({ name: it.st ? it.st.info.name : it.name, src: it.src, g: it.st ? Math.round(lwCalc(it.st).g) : null, kcal: it.st ? lwCalc(it.st).kcal : null, p: it.st ? lwCalc(it.st).p : null, chk: !!it.chk })) }; });
  const addBtn = () => page.evaluate(() => { const x = FC[logQPrev.id], el = document.querySelector(`#coachList [data-cid="${x.card.cid}"] .ccbtn.pri`); return el ? el.disabled : null; });
  const times = {};
  const rec = (p, ms) => { (times[p] = times[p] || []).push(ms); };

  // 1. the example message: 4 foods, quantities kept, 20 g protein is not the weight, one AI call
  let r = await send('Had 250g chicken breast in tomato sauce, a white chocolate Snickers protein bar with 20g protein, and one protein toast.'); rec('ai', r.ms);
  let L = await last();
  if (!L || L.rows.length !== 4) fail(`example: expected 4 rows, got ${L && JSON.stringify(L.rows)}`);
  else if (L.rows[0].g !== 250 || !/chicken/i.test(L.rows[0].name)) fail('example: 250 g chicken breast lost: ' + JSON.stringify(L.rows[0]));
  else if (L.rows[2].g === 20) fail('example: "20g protein" became the bar weight');
  else ok(`example: 4 rows (${L.rows.map(x => `${x.name} ${x.g} g [${x.src}]`).join('; ')}), ${r.calls} blocking AI call(s), ${r.ms} ms`);
  if (r.calls !== 1) fail(`example: ${r.calls} AI calls before the card, want 1`);
  await page.waitForFunction(() => logQPrev && !logQPrev.items.some(it => it.chk), null, { timeout: 30000 });
  L = await last(); const bar = L.rows[2];
  if (bar.src !== 'web' || Math.abs(bar.p - 20) > 0.6) fail(`background label check: bar should be from the web at ~20 g protein, got ${JSON.stringify(bar)}`); else ok(`background label check: branded bar replaced by the web value (${bar.p} g protein), Add never waited`);
  if (await addBtn() !== false) fail('Add must be on when every row is valid');

  // 2. corrections on the phone, in place, no AI, no second card
  const cards0 = await page.evaluate(() => document.querySelectorAll('#coachList .lqcard').length);
  r = await send('actually make the chicken 200g'); L = await last(); rec('local', r.ms);
  if (L.rows[0].g !== 200 || r.calls || r.cards !== cards0) fail(`"actually make the chicken 200g": ${JSON.stringify(L.rows[0])}, ${r.calls} calls, cards ${cards0} → ${r.cards}`); else ok(`"actually make the chicken 200g": 200 g, same card, no AI (${r.ms} ms)`);
  r = await send('add another toast'); L = await last(); rec('local', r.ms);
  if (L.rows[3].g !== 120 || r.calls) fail('"add another toast" should double the toast: ' + JSON.stringify(L.rows[3])); else ok('"add another toast": 2 toasts, same card');
  // the same message again is a normal conversation: answered again by the AI, a new card (no "already up there"); the first card is put back as the current one for the steps below
  const keepId = await page.evaluate(() => { globalThis.__keepPrev = logQPrev; return logQPrev.id; });
  r = await send('Had 250g chicken breast in tomato sauce, a white chocolate Snickers protein bar with 20g protein, and one protein toast.');
  if (r.calls !== 1 || /already/i.test(r.text) || r.cards !== cards0 + 1) fail(`same message again must be answered again with a card (calls ${r.calls}, cards ${cards0} → ${r.cards}, "${r.text}")`); else ok('same message again: answered again by the AI, a new card');
  await page.evaluate(k => { const cur = logQPrev && logQPrev.id; if (cur && cur !== k) delete FC[cur]; logQPrev = globalThis.__keepPrev; }, keepId);
  r = await send('how much protein was that?'); rec('local', r.ms);
  const pSum = Math.round(L.rows.reduce((a, x) => a + x.p, 0));
  if (r.calls || !new RegExp(`\\b${pSum}\\b`).test(r.text)) fail(`"how much protein was that?" → "${r.text}" (want ${pSum} g, no AI)`); else ok(`"how much protein was that?" answered on the phone: "${r.text}"`);

  // 3. Add: entries saved once; double tap does not duplicate; the list is remembered
  const before = await page.evaluate(() => (dayLog[curDay] || []).length);
  await page.evaluate(() => { const x = FC[logQPrev.id]; const b = document.querySelector(`#coachList [data-cid="${x.card.cid}"] .ccbtn.pri`); b.click(); b.click(); });
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => (dayLog[curDay] || []).length);
  if (after - before !== 4) fail(`Add: ${after - before} entries saved, want exactly 4 (double tap)`); else ok('Add: 4 entries, a double tap adds nothing more');
  const estSaved = await page.evaluate(() => foods.filter(f => f.via === 'coach').length);
  ok(`estimates saved to My Foods only on Add: ${estSaved} food(s) marked as from Food Coach`);

  // 4. the same message next time: from memory, no AI, fast
  await page.evaluate(() => { Object.keys(FC).forEach(k => delete FC[k]); logQPrev = null; });
  r = await send('Had 250g chicken breast in tomato sauce, a white chocolate Snickers protein bar with 20g protein, and one protein toast.'); rec('memory', r.ms);
  L = await last();
  if (r.calls) fail(`memory: the same message used ${r.calls} AI call(s)`);
  else if (L.rows[0].g !== 200 || L.rows[3].g !== 120 || !L.can) fail('memory: should come back with your corrected amounts and be addable: ' + JSON.stringify(L.rows));
  else ok(`memory: same message again → your list with your amounts, no AI, ${r.ms} ms`);
  if (r.ms > 1000) fail(`memory path took ${r.ms} ms (target < 1 s)`);
  // a single food you added before, inside a new message: found on the phone
  AI.mode = 'down'; r = await send('protein toast and a coffee'); L = await last(); AI.mode = 'ok';
  if (!L.rows.some(x => /toast/i.test(x.name) && x.src === 'mem')) fail('remembered food: "protein toast" should come from what you added before: ' + JSON.stringify(L.rows)); else ok('remembered food inside a new message, even with the AI down');

  // 5. log + question in one message: reply answers, card offered, nothing saved
  const n0 = await page.evaluate(() => (dayLog[curDay] || []).length);
  r = await send('I ate chicken and rice after the gym. Was that a good meal?'); rec('ai', r.ms);
  L = await last(); const n1 = await page.evaluate(() => (dayLog[curDay] || []).length);
  if (!/post-workout/i.test(r.text) || L.rows.length !== 2 || n1 !== n0) fail(`log + question: reply "${r.text}", rows ${L.rows.length}, saved ${n1 - n0}`); else ok('log + question: one answer with advice + an editable card, nothing saved');
  r = await send('remove the rice'); L = await last();
  if (r.calls || L.rows.length !== 1) fail('"remove the rice" should leave 1 row: ' + JSON.stringify(L.rows)); else ok('"remove the rice": row removed in place');
  r = await send('is fruit sugar bad?'); if (r.calls !== 1 || !/fibre/.test(r.text)) fail('a plain question should get the AI answer'); else ok('nutrition question answered (1 call)');
  r = await send('thanks!'); if (r.calls) fail('"thanks" used the AI'); else ok('"thanks" answered on the phone');

  // 6. failures: quota → offline list fast, then no network at all while cooling; unreadable answers; network down; unknown food blocks Add
  AI.mode = 'quota'; r = await send('2 eggs and a slice of bread'); rec('offline', r.ms);
  L = await last();
  if (!/can.t reach the AI/i.test(r.text) || /429|quota|HTTP/i.test(r.text)) fail(`quota: message should be plain words, got "${r.text}"`);
  else if (r.ms > 8000) fail(`quota: offline answer took ${r.ms} ms (target < 8 s)`);
  else if (!L.rows.some(x => /egg/i.test(x.name) && x.g > 0)) fail('quota: the offline list lost the eggs: ' + JSON.stringify(L.rows));
  else ok(`quota used up: offline list in ${r.ms} ms (${L.rows.map(x => `${x.name} ${x.g ?? '?'} g`).join('; ')}), plain message`);
  r = await send('a banana'); rec('offline', r.ms);
  if (r.calls) fail(`cooldown: ${r.calls} network call(s) while the quota is cooling`); else ok(`cooldown: next message answered without any network call (${r.ms} ms)`);
  await page.evaluate(() => AIProvider.coolReset()); AI.mode = 'ok';
  r = await send('broken json please'); L = await last();
  if (r.calls > 3 || r.ms > 8000) fail(`unreadable answers: ${r.calls} calls, ${r.ms} ms`); else ok(`unreadable AI answers: stopped after ${r.calls} tries, offline list in ${r.ms} ms`);
  AI.mode = 'down'; r = await send('zorblax crunch 2 pieces'); L = await last(); rec('offline', r.ms);
  if (L.can || (await addBtn()) !== true) fail('an unknown food must keep Add off'); else ok('unknown food: "Not Found" row keeps Add off, nothing silently skipped');
  if (L.rows[0].kcal != null) fail('unknown food must not get made-up values (not 0 kcal either)');
  await page.evaluate(() => { const x = FC[logQPrev.id]; document.querySelector(`#coachList [data-mid="${logQPrev.id}"] [data-qrm]`).click(); });
  // 0.8 regression (24 Nov): Greek amounts with the AI offline: two rows, 250 g beef mince + 250 g pasta (not 100 g mince and "γ μακαρόνια: Not found")
  r = await send('250γ κιμάς μοσχάρι και 250γ μακαρόνια'); L = await last();
  { const okRows = L && L.rows.length === 2 && /mince|κιμά/i.test(L.rows[0].name) && L.rows[0].g === 250 && /pasta|μακαρ|ζυμαρ/i.test(L.rows[1].name) && L.rows[1].g === 250 && L.rows.every(x => x.src !== 'none');
    if(!okRows) fail('Greek amounts offline: ' + JSON.stringify(L && L.rows)); else ok(`Greek amounts offline: ${L.rows.map(x => `${x.name} ${x.g} g [${x.src}]`).join('; ')}`); }
  await page.evaluate(() => { const m = logQPrev; m.items.slice().forEach(() => { const b = document.querySelector(`#coachList [data-mid="${m.id}"] [data-qrm]`); if(b) b.click(); }); });
  // filler words and context: "χθες παρήγγειλα ένα πιάτο μακαρόνια με λίγες πατάτες τηγανητές" = pasta + fries, for yesterday, a restaurant portion
  r = await send('χθες παρήγγειλα ένα πιάτο μακαρόνια με λίγες πατάτες τηγανητές'); L = await last();
  { const d = await page.evaluate(() => ({ day: logQPrev.day, y: addDays(todayKey(), -1) }));
    if(!L || L.rows.length !== 2 || !L.rows.every(x => x.src !== 'none') || d.day !== d.y) fail('fillers / yesterday: ' + JSON.stringify({ rows: L && L.rows, d }));
    else ok(`fillers + yesterday: ${L.rows.map(x => `${x.name} ${x.g} g`).join('; ')} → ${d.day}`); }
  await page.evaluate(() => { const m = logQPrev; m.items.slice().forEach(() => { const b = document.querySelector(`#coachList [data-mid="${m.id}"] [data-qrm]`); if(b) b.click(); }); });
  // just talking with the AI offline: an answer, no food card
  { const c0 = (await page.evaluate(() => document.querySelectorAll('#coachList .lqcard').length)); r = await send('how are you doing today');
    if(r.cards !== c0 || !r.text) fail(`just talking: ${r.cards - c0} new card(s), text "${r.text}"`); else ok(`just talking: no card, answer "${r.text.slice(0, 60)}…"`); }
  AI.mode = 'ok';
  AI.mode = 'slow'; await page.evaluate(() => AIProvider.coolReset()); r = await send('slow model test food');
  if (r.ms > 20000) fail(`slow provider: answer took ${r.ms} ms (budget 16 s)`); else ok(`slow / busy provider: offline answer after ${r.ms} ms (16 s budget, not minutes)`);
  AI.mode = 'ok';

  // 7. app restart: the chat and today's lists come back; an added list can still be undone
  const beforeReload = await page.evaluate(() => document.querySelectorAll('#coachList .cmsg').length);
  await page.reload({ waitUntil: 'load' }); await page.evaluate(() => Coach.open('chef')); await page.waitForTimeout(400);
  const back = await page.evaluate(() => ({ msgs: document.querySelectorAll('#coachList .cmsg').length, cards: document.querySelectorAll('#coachList .lqcard').length, undo: document.querySelectorAll('#coachList [data-cundo]').length }));
  if (back.msgs < beforeReload - 2 || !back.cards) fail(`restart: chat not restored (${back.msgs}/${beforeReload} messages, ${back.cards} cards)`); else ok(`restart: ${back.msgs} messages and ${back.cards} cards back (${back.undo} with Undo)`);
  r = await send('how much protein today?'); if (r.calls || !/170 g/.test(r.text)) fail(`"how much protein today?" → "${r.text}"`); else ok(`after restart: "${r.text}"`);

  // 8. one AI request per message (brief: Food Coach request budget) and the shared personality in the recognised-dish prompt
  const sugg = () => page.evaluate(() => document.querySelectorAll('#coachList .eatrow.sugg').length);
  for(const q of ['What should I eat for dinner?', 'Τι να φάω για βραδινό;', 'ti na fao twra']){
    const s0 = await sugg(); r = await send(q); const s1 = await sugg();
    if(r.calls !== 1 || s1 - s0 < 1) fail(`"${q}": ${r.calls} request(s), ${s1 - s0} suggestion card(s); want 1 request and cards`); else ok(`"${q}": suggestion cards from 1 request (${r.ms} ms)`); }
  { const s0 = await sugg(); r = await send("I'm starving, any thoughts?"); const s1 = await sugg();
    if(r.calls !== 1 || s1 - s0 < 1) fail(`AI-classified suggestion: ${r.calls} request(s), ${s1 - s0} card(s); want ideas in the same answer`); else ok('a suggestion the AI recognises: ideas come in the same answer (1 request)'); }
  { const n0 = await page.evaluate(() => (dayLog[curDay] || []).length); AI.mealPrompts = [];
    r = await send('had a pork gyro pita'); const mm = await page.evaluate(() => logQPrev === null || !FC ? null : Object.values(FC).map(x => x.m).filter(m => m.meal).pop());
    const n1 = await page.evaluate(() => (dayLog[curDay] || []).length);
    if(r.calls !== 1 || !mm || n1 !== n0) fail(`recognised gyro: ${r.calls} request(s), meal card ${!!mm}, saved ${n1 - n0} (nothing may be saved before Add)`); else ok(`recognised gyro: one meal card from 1 request, nothing logged until Add`);
    await page.evaluate(() => { const m = Object.values(FC).map(x => x.m).filter(m => m.meal).pop(); mealLog(m); });
    const n2 = await page.evaluate(() => (dayLog[curDay] || []).length); if(n2 - n1 !== 1) fail(`gyro Add: ${n2 - n1} entries`); else ok('gyro: Add logs one entry'); }
  r = await send('had a gyro pita broken'); if(r.calls !== 1 || !(await last()) ) fail(`unusable dish answer: ${r.calls} request(s) (want 1, then the offline reading)`); else ok(`unusable dish answer: no second request, offline reading instead ("${r.text.slice(0, 60)}")`);
  r = await send('is a gyro ok before the gym?'); if(r.calls !== 1 || !/fries/.test(r.text)) fail(`question about a dish: ${r.calls} request(s), "${r.text}"`); else ok('a question that names a dish ("is a gyro ok before the gym?"): answered from 1 request');
  r = await send('efaga ena gyro pita'); if(r.calls !== 1) fail(`Greeklish dish: ${r.calls} request(s)`); else ok('Greeklish "efaga ena gyro pita": 1 request');
  { AI.mealPrompts = []; const outs = [];
    for(const pref of [{ base: 'balanced', humor: 'low', len: 'concise' }, { base: 'motivator', humor: 'playful', len: 'detailed' }]){
      await page.evaluate(p => { Persona.set(p); Object.keys(FC).forEach(k => delete FC[k]); logQPrev = null; Object.keys(logPhr).filter(k => k.startsWith('meal:')).forEach(k => delete logPhr[k]); }, pref);
      await send('had a chicken gyro pita'); outs.push(AI.mealPrompts.pop() || ''); }
    const words = s => (s.match(/for "answer" at most (\d+) words/) || [])[1];
    if(!outs[0] || !outs[1] || outs[0] === outs[1] || words(outs[0]) === words(outs[1]) || !/no emoji/i.test(outs[1])) fail(`personality: the recognised-dish prompt must change with style / humour / length (answer words ${words(outs[0])} → ${words(outs[1])})`);
    else ok(`personality reaches the recognised-dish prompt: style, humour and length change it (answer limit ${words(outs[0])} → ${words(outs[1])} words); no-emoji rule kept`);
    await page.evaluate(() => Persona.set({ base: 'balanced', humor: 'natural', len: 'adaptive' })); }
  { const c0 = AI.calls; await page.evaluate(() => { const ta = $('coachIn'); ta.value = 'two bananas and milk'; ta.dispatchEvent(new Event('input')); $('coachForm').requestSubmit(); ta.value = 'two bananas and milk'; ta.dispatchEvent(new Event('input')); $('coachForm').requestSubmit(); });
    await page.waitForFunction(() => !document.querySelector('#coachList .cwork'), null, { timeout: 30000 });
    if(AI.calls - c0 !== 1) fail(`rapid double send: ${AI.calls - c0} requests`); else ok('rapid double send: the second tap waits ("still working"), 1 request'); }
  { AI.mode = 'slow'; const c0 = AI.calls; await page.evaluate(() => { const ta = $('coachIn'); ta.value = 'cancel me pasta'; ta.dispatchEvent(new Event('input')); $('coachForm').requestSubmit(); });
    await page.waitForTimeout(400); await page.evaluate(() => Coach.dismiss('chef')); await page.waitForTimeout(300);
    const err = errs.length; AI.mode = 'ok'; await page.evaluate(() => Coach.open('chef')); await page.waitForTimeout(300);
    if(AI.calls - c0 > 1 || errs.length !== err) fail(`cancel: ${AI.calls - c0} request(s)`); else ok('closing the chat mid-answer cancels the request (no retry, no error)'); }

  // speeds
  const P = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; };
  console.log('speed (ms, end to end incl. UI): ' + Object.entries(times).map(([k, v]) => `${k} p50 ${P(v, 50)} / p95 ${P(v, 95)} (n=${v.length})`).join(' · '));
  const st = await page.evaluate(() => FoodCoach.stats()); console.log('in-app answer log: ' + JSON.stringify(st));
  if (errs.length) { errs.forEach(e => fail('page error: ' + e)); }
  await browser.close(); srv.close();
  console.log(fails ? `\n${fails} Food Coach e2e case(s) failed.` : '\nAll Food Coach e2e cases passed.');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL  e2e crashed: ' + (e && e.stack || e)); process.exit(1); });
