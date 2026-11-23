#!/usr/bin/env node
// Settings › AI › AI Provider in the real app with every AI host mocked (Playwright; no key, no network, no paid call).
// Run: node tools/ai-provider-e2e.js [--trace FILE]   (exit 1 = a check failed)
// For each provider (Gemini, Claude, OpenAI, OpenRouter), picked through the Settings screen: the request goes to that adapter only (host,
// model, the auth header's NAME — never its value — are recorded in the trace), the answer is read, usage is recorded without the key.
// Also: an upgrade from a Gemini-only 0.7.10.7 settings works on first open; a fresh install has no key and AI buttons ask for one;
// missing key / rejected key / unavailable model / quota (then cooldown: no request) / offline / cancel each give the right kind and
// plain message; a web look-up (Check My Foods) on a provider without web search stops before any request; switching back restores each
// provider's own key and model; keys never appear in a backup, the Claude export, the usage log or the console.
const fs = require('fs'), path = require('path'), http = require('http');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const root = path.join(__dirname, '..'); let fails = 0; const ok = (c, m) => { if(c) console.log('ok   ' + m); else { fails++; console.log('FAIL ' + m); } };
const pw = require('playwright');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p += 'index.html'; const f = path.join(root, p);
  if(!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port, sleep = ms => new Promise(r => setTimeout(r, ms));
const KEYS = { gemini: 'G-TESTKEY-0001', anthropic: 'sk-ant-TESTKEY-0002', openai: 'sk-TESTKEY-0003', openrouter: 'sk-or-TESTKEY-0004' };
const HOST = { gemini: 'generativelanguage.googleapis.com', anthropic: 'api.anthropic.com', openai: 'api.openai.com', openrouter: 'openrouter.ai' };
const ANSWER = '{"ok":true,"said":"hello"}';

(async () => {
  const browser = await pw.chromium.launch(), trace = [];
  let mode = 'ok', calls = [], consoleText = '';
  const open = async (settings, uiExtra) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await ctx.newPage();
    page.on('console', m => { consoleText += m.text() + '\n'; }); page.on('pageerror', e => { consoleText += e.message + '\n'; });
    // every AI host answers from here; anything else outside the app is refused (no real network)
    await ctx.route(u => !u.href.startsWith(`http://localhost:${port}`), async (route, req) => {
      const u = new URL(req.url()), h = req.headers(), body = req.postData() ? JSON.parse(req.postData() || '{}') : null;
      const prov = Object.keys(HOST).find(k => u.hostname === HOST[k]);
      if(!prov) return route.abort();
      const auth = ['x-goog-api-key', 'x-api-key', 'authorization'].find(k => h[k]);
      const sentKey = auth ? String(h[auth]).replace(/^Bearer /, '') : '';
      const rec = { provider: prov, method: req.method(), path: u.pathname.replace(/models\/[^:/]+/, 'models/<model>'), model: body ? body.model || (u.pathname.match(/models\/([^:]+):/) || [])[1] || null : null, authHeader: auth || null, keyMatches: sentKey === KEYS[prov] };
      if(mode === 'offline') return route.abort('internetdisconnected');   // a mocked route would answer even with the browser offline
      if(mode === 'slow'){ await sleep(3000); }
      calls.push(rec);
      if(req.method() === 'GET') return route.fulfill({ json: { models: [{ name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] }] } });
      if(mode === 'auth') return route.fulfill({ status: 401, json: { error: { message: 'invalid key' } } });
      if(mode === 'nomodel') return route.fulfill({ status: 404, json: { error: { message: 'model not found' } } });
      if(mode === 'quota') return route.fulfill({ status: 429, json: { error: { message: 'quota', details: [{ retryDelay: '40s' }] } } });
      if(prov === 'gemini') return route.fulfill({ json: { candidates: [{ content: { parts: [{ text: ANSWER }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 } } });
      if(prov === 'anthropic') return route.fulfill({ json: { content: [{ type: 'text', text: ANSWER }], usage: { input_tokens: 5, output_tokens: 3 } } });
      return route.fulfill({ json: { choices: [{ message: { content: ANSWER } }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } } });
    });
    await page.goto(`http://localhost:${port}/`);
    await page.evaluate(([s, x]) => { localStorage.clear(); localStorage.setItem('ft.ui.v1', JSON.stringify({ setupDone: true, lang: 'en', lastBackup: new Date().toISOString(), ...(x || {}) }));
      if(s) localStorage.setItem('ft.settings.v1', JSON.stringify(s)); }, [settings, uiExtra]);
    await page.goto(`http://localhost:${port}/?r=1`); await sleep(400); return { ctx, page };
  };
  // the app's own AI door (what every feature calls); returns { ok, kind, msg, n } with n = requests that left the phone
  const askAI = (page, opts) => page.evaluate(async o => { try{ const r = await gemini('Say hello as JSON.', null, null, o && o.cancelAfter ? (() => { const c = new AbortController(); setTimeout(() => c.abort(), o.cancelAfter); return c.signal; })() : null, { quiet: true, task: 'e2e' });
      return { ok: true, r }; }catch(e){ return { ok: false, kind: e.kind, msg: AI.friendly(e), cancelled: !!e.cancelled, cooldown: !!e.cooldown }; } }, opts || null);
  const settingsKey = page => page.evaluate(() => localStorage.getItem('ft.settings.v1'));
  const pickInSettings = async (page, id, key, model) => { await page.evaluate(() => { openSettings(); fillSettings(); open('ovSAI'); }); await sleep(300);
    await page.click(`#sProv [data-v="${id}"]`); await page.fill('#sKey', key); if(model !== undefined) await page.fill('#sModel', model); await page.click('#saveSettings'); await sleep(200); };

  // 1. upgrade: a 0.7.10.7 phone with only a Gemini key and model works on first open, and Settings shows them
  { const { ctx, page } = await open({ geminiKey: KEYS.gemini, model: 'gemini-flash-latest' }); calls = []; mode = 'ok';
    const r = await askAI(page);
    const s = await page.evaluate(() => { openSettings(); fillSettings(); return { prov: document.querySelector('#sProv .on') && document.querySelector('#sProv .on').dataset.v, key: $('sKey').value, model: $('sModel').value, gem: !$('sGemOnly').classList.contains('hide') }; });
    ok(r.ok && r.r.said === 'hello' && calls.length && calls.every(c => c.provider === 'gemini' && c.keyMatches), `upgrade (Gemini only): first AI request works on Gemini (${calls.filter(c => c.method === 'POST').length} answer request)`);
    ok(s.prov === 'gemini' && s.key === KEYS.gemini && s.model === 'gemini-flash-latest' && s.gem, 'upgrade: Settings › AI shows Gemini picked, its key and model, the Gemini how-to');
    trace.push({ case: 'upgrade, Gemini only', calls: calls.slice() }); await ctx.close(); }

  // 2. fresh install: no key; an AI button asks for a key instead of calling
  { const { ctx, page } = await open(null); calls = [];
    const r = await askAI(page), noai = await page.evaluate(() => document.body.classList.contains('noai'));
    ok(!r.ok && r.kind === 'auth' && /needs an AI key/i.test(r.msg) && !calls.length && noai, `fresh install: no key → "${r.msg}", no request, AI buttons marked as needing a key`); await ctx.close(); }

  // 3. each provider picked in Settings: only its adapter is called; switching keeps each one's own key + model
  { const { ctx, page } = await open({ geminiKey: KEYS.gemini, model: 'gemini-flash-latest' });
    for(const [id, model] of [['anthropic', 'claude-haiku-5-5'], ['openai', 'gpt-4o-mini'], ['openrouter', 'openai/gpt-4o-mini'], ['gemini', 'gemini-flash-latest']]){
      await pickInSettings(page, id, KEYS[id], model); calls = []; mode = 'ok';
      const r = await askAI(page), u = await page.evaluate(() => { const l = AIUsage.list ? AIUsage.list() : JSON.parse(localStorage.getItem('ft.aiusage.v1') || '{}'); return JSON.stringify(l); });
      const post = calls.filter(c => c.method === 'POST');
      ok(r.ok && r.r.said === 'hello' && calls.length && calls.every(c => c.provider === id && c.keyMatches) && post.length === 1 && post[0].model === model,
        `${id}: picked in Settings, one request to ${HOST[id]} only (model ${post[0] && post[0].model}, auth header ${post[0] && post[0].authHeader}), answer read`);
      ok(!Object.values(KEYS).some(k => u.includes(k)), `${id}: usage record has no key`);
      trace.push({ case: 'Settings → ' + id, calls: calls.slice() });
    }
    // switching back shows each provider's own saved key and model
    const back = await page.evaluate(() => { openSettings(); fillSettings(); const out = {}; ['anthropic', 'openai', 'openrouter', 'gemini'].forEach(id => { document.querySelector(`#sProv [data-v="${id}"]`).click(); out[id] = [$('sKey').value, $('sModel').value]; }); return out; });
    ok(back.anthropic[0] === KEYS.anthropic && back.openai[0] === KEYS.openai && back.openrouter[0] === KEYS.openrouter && back.gemini[0] === KEYS.gemini && back.openai[1] === 'gpt-4o-mini' && back.gemini[1] === 'gemini-flash-latest', 'switching providers in Settings restores each one\'s own key and model');
    // tapping a provider without Save changes nothing: requests still go to the one in use
    await page.evaluate(() => { document.querySelector('#sProv [data-v="openai"]').click(); }); calls = []; await askAI(page);
    ok(calls.length && calls.every(c => c.provider === 'gemini'), 'tapping OpenAI without Save: requests still go to Gemini (the one in use)');
    // no key anywhere it should not be
    const leak = await page.evaluate(async () => { const b = JSON.stringify(Store.snapshot ? Store.snapshot() : {}); let c = ''; try{ c = claudeText(); }catch(e){} return b + '\n' + c; });
    ok(!Object.values(KEYS).some(k => leak.includes(k) || consoleText.includes(k)), 'no key in the backup file, the Claude export or the console');
    await ctx.close(); }

  // 4. failures, per provider: rejected key, unavailable model, quota then cooldown, offline, cancel, missing key
  for(const id of ['gemini', 'anthropic', 'openai', 'openrouter']){
    const s = id === 'gemini' ? { geminiKey: KEYS.gemini } : { provider: id, aiKeys: { [id]: KEYS[id] } }, { ctx, page } = await open(s), res = {};
    for(const m of ['auth', 'nomodel', 'quota']){ mode = m; calls = []; await page.evaluate(() => AIProvider.coolReset()); res[m] = { ...(await askAI(page)), n: calls.filter(c => c.method === 'POST').length }; }
    mode = 'quota'; calls = []; await page.evaluate(() => AIProvider.coolReset()); await askAI(page); calls = []; res.cool = { ...(await askAI(page)), n: calls.length };
    await page.evaluate(() => AIProvider.coolReset()); mode = 'offline'; calls = []; res.off = { ...(await askAI(page)), n: calls.length };
    mode = 'slow'; calls = []; res.cancel = await askAI(page, { cancelAfter: 300 }); await sleep(3200); mode = 'ok';
    ok(!res.auth.ok && res.auth.kind === 'auth' && res.auth.n === 1, `${id}: rejected key → one request, stops (kind auth: "${res.auth.msg}")`);
    ok(!res.nomodel.ok && /model/i.test(res.nomodel.msg) && res.nomodel.n >= 1 && res.nomodel.n <= (id === 'gemini' ? 10 : 2), `${id}: unavailable model → tries its own model list only (${res.nomodel.n}), then "${res.nomodel.msg}"`);
    ok(!res.quota.ok && res.quota.kind === 'rate' && !/free/i.test(res.quota.msg) && !res.cool.ok && res.cool.cooldown && res.cool.n === 0, `${id}: quota → "${res.quota.msg}"; the next message waits out the cooldown with no request`);
    ok(!res.off.ok && res.off.kind === 'network' && res.off.n === 0, `${id}: offline → "${res.off.msg}"`);
    ok(!res.cancel.ok && res.cancel.cancelled, `${id}: cancelling a running request stops it (cancelled)`);
    await ctx.close(); }
  { const { ctx, page } = await open({ provider: 'openai' }); calls = []; const r = await askAI(page);
    ok(!r.ok && r.kind === 'auth' && !calls.length, `OpenAI picked, no key: "${r.msg}", no request`); await ctx.close(); }

  // 5. a web look-up on a provider without web search: Check My Foods says why, before any request
  { const { ctx, page } = await open({ provider: 'anthropic', aiKeys: { anthropic: KEYS.anthropic } }); calls = [];
    await page.evaluate(() => { foods.push({ id: 'f1', name: 'Test bar', kcal: 200, protein: 10, carbs: 20, fat: 8 }); checkFoods(); }); await sleep(400);
    const msg = await page.evaluate(() => document.getElementById('toast') ? document.getElementById('toast').innerText : '');
    const direct = await page.evaluate(async () => { try{ await gemini('x', null, null, null, { quiet: true, search: true }); return 'answered'; }catch(e){ return AI.friendly(e); } });
    ok(/Gemini/.test(msg) && /web/i.test(msg) && !calls.length, `Claude picked, Check My Foods: "${msg.trim()}" and no request`);
    ok(/web/i.test(direct) && !calls.length, `Claude picked, any web look-up stops before the network: "${direct}"`); await ctx.close(); }

  if(arg('--trace')) fs.writeFileSync(arg('--trace'), JSON.stringify(trace, null, 1));
  console.log('\ntrace (keys never recorded; keyMatches = the header carried the key saved for that provider):');
  trace.forEach(c => console.log(`  ${c.case}: ` + c.calls.map(x => `${x.method} ${x.provider}${x.path} model=${x.model || '-'} auth=${x.authHeader}`).join(' · ')));
  await browser.close(); srv.close(); console.log(fails ? `\n${fails} check(s) failed` : '\nAll AI provider checks passed.'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
