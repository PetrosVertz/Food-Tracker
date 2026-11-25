// AI providers (0.8 prep, Athlete OS step 1): the one place that knows how to talk to a specific AI company.
// Food Track · Gym Buddy — AI.* in ai.js (bubble, counter, prompts) never builds a request itself; it hands a normalized request to AIProvider.run().
// Today only Gemini works (the user's own key, straight from the phone). When the small server arrives in 0.8, a provider that talks to the
// server replaces GeminiProvider here and nothing that asks the AI has to change.
//
// Normalized request   { prompt, images: [base64 jpeg], json: true, search: false, tier: 'default' | 'advanced', timeoutMs, deadlineMs, retries, task }
//   timeoutMs  one try on one model (default 30 s; 60 s for advanced / search)
//   deadlineMs the WHOLE request: model list, every try, retry and pause together (default 60 s; 120 s for advanced / search). V3 hardening:
//              before this, ten busy models could keep the bubble spinning for five minutes or more.
//   json   the answer must be a JSON object (checked here; an unreadable answer counts as a failed try)
//   search the provider may look things up on the web (Gemini cannot do this and JSON answer mode at once, so the JSON is cut out of the text)
//   tier   'default' = the model chosen in Settings; 'advanced' = the strongest model the key allows (receipts)
//   retries  extra tries on the SAME model after a busy / rate-limit / network error (default 0: the next model is tried instead)
//   task   optional short label for the usage page ('receipt'), never the user's text
//   model  optional: try this model first (a specialist's own choice); ctx: letters of athlete context in the prompt (usage numbers only)
// Normalized response  { text, json, usage: { input, output, total } | null, model, provider, ms, tries }
//   usage is null when the provider did not report tokens: it is never made up and never 0.
// Normalized error     Error with .kind: 'auth' | 'rate' | 'overloaded' | 'timeout' | 'network' | 'bad_output' | 'cancelled' | 'unsupported' | 'other'
//                      .retryable (worth trying again), .fatal (stop at once: a bad key fails on every model), .cancelled, .status
// Capabilities         { vision, search, json, searchWithJson, usage }

const AIKinds = {   // retry: waiting a moment helps; wait: pause before the next try
  auth: { retry: false }, rate: { retry: true, wait: true }, overloaded: { retry: true, wait: true }, timeout: { retry: true }, network: { retry: true, wait: true },
  bad_output: { retry: false }, cancelled: { retry: false }, unsupported: { retry: false }, other: { retry: false },
};
function aiError(kind, message, extra){
  return Object.assign(new Error(message), { kind, retryable: !!(AIKinds[kind] || {}).retry }, kind === 'cancelled' ? { cancelled: true } : null, extra);
}

// the answer text → an object (plain JSON, JSON in a ```fence, or JSON inside other text); null when there is none
function aiParseJSON(txt){
  try{ return JSON.parse(String(txt).replace(/^\s*```(json)?|```\s*$/g, '').trim()); }catch(e){}
  try{ const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if(a !== -1 && b > a) return JSON.parse(txt.slice(a, b + 1)); }catch(e){}
  return null;
}

const GeminiProvider = (() => {
  const GAPI = 'https://generativelanguage.googleapis.com/v1beta/models', TIMEOUT = 30000;
  const key = () => settings.geminiKey || '';
  const info = { id: 'gemini', name: 'Google Gemini', implemented: true, capabilities: { vision: true, search: true, json: true, searchWithJson: false, usage: true } };

  // Free Gemini models get overloaded, so every model the key can use is tried, each for at most 30 s, until one answers.
  function sortModels(names){
    const ver = n => { const m = n.match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
    const tier = n => /latest/.test(n) ? 0 : /preview|exp/.test(n) ? 2 : 1;
    const kind = n => /flash-lite/.test(n) ? 1 : /flash/.test(n) ? 0 : /pro/.test(n) ? 3 : 2;
    return names.sort((a, b) => tier(a) - tier(b) || ver(b) - ver(a) || kind(a) - kind(b));
  }
  // the strongest first: Pro, then Flash, then the rest, Lite last; newest version first within each
  function bestModels(names){
    const ver = n => /latest/.test(n) ? 99 : (n.match(/(\d+(?:\.\d+)?)/) || [0, 0])[1] * 1;
    const kind = n => /flash-lite/.test(n) ? 3 : /pro/.test(n) ? 0 : /flash/.test(n) ? 1 : 2;
    return [...names].filter(n => !/(gemma|nano|thinking-exp|8b)/.test(n)).sort((a, b) => kind(a) - kind(b) || ver(b) - ver(a) || (/preview|exp/.test(a) - /preview|exp/.test(b)));
  }
  async function listModels(){
    const tag = key().slice(-6), c = Store.load('models', null);
    if(c && c.tag === tag && Date.now() - c.at < 864e5 && c.list && c.list.length) return c.list;
    try{
      const r = await fetchT(`${GAPI}?pageSize=200`, { headers: { 'x-goog-api-key': key() } }, 10000);
      if(!r.ok) return [];
      const j = await r.json();
      const list = sortModels((j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(n => /^gemini/.test(n) && !/(embed|image|tts|audio|live|aqa|robotics|computer|learnlm)/.test(n)));
      Store.save('models', { at: Date.now(), tag, list });
      return list;
    }catch(e){ return []; }
  }
  // the models to try, in order: the tiers from Settings (settings.model = default; settings.modelAdvanced = optional, else the strongest the key allows)
  async function chain(req){
    const all = await listModels(), dflt = req.model || settings.model || DEFAULT_MODEL;   // req.model: a specialist's own model (Athlete OS registry), else Settings
    if(req.tier === 'advanced') return [...new Set([settings.modelAdvanced, ...bestModels(all).slice(0, 4), dflt, 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter(Boolean))].slice(0, 7);
    return [...new Set([dflt, 'gemini-flash-latest', 'gemini-flash-lite-latest', ...all])].slice(0, 10);
  }
  const timeoutFor = req => req.timeoutMs || (req.tier === 'advanced' || req.search ? 60000 : TIMEOUT);

  // ONE try on ONE model. Returns { text, usage }; throws an aiError.
  async function generate(req, model, outer){
    const parts = [{ text: req.prompt }]; [].concat(req.images || []).forEach(d => parts.push({ inline_data: { mime_type: 'image/jpeg', data: d } }));   // one photo, or several (a long receipt in parts)
    // Google Search can't be combined with the JSON-only answer mode
    const gen = req.search ? { temperature: 0 } : { ...(req.json === false ? {} : { responseMimeType: 'application/json' }), temperature: req.images && req.images.length || req.tier === 'advanced' ? 0 : 0.6 };
    const body = JSON.stringify({ contents: [{ parts }], generationConfig: gen, ...(req.search ? { tools: [{ google_search: {} }] } : {}) });
    let r, j = null;
    try{
      r = await fetchT(`${GAPI}/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() }, body }, timeoutFor(req), outer);
      try{ j = await r.json(); }catch(e){}
    }catch(e){
      if(outer && outer.aborted) throw aiError('cancelled', t('cancelled'));
      if(e && e.name === 'AbortError') throw aiError('timeout', t('timedOut'));
      throw aiError('network', (e && e.message) || 'network');
    }
    if(!r.ok){
      const msg = (j && j.error && j.error.message) || `HTTP ${r.status}`;
      // a bad key won't work on any model, so stop right away
      if(r.status === 401 || /api key not valid|api_key_invalid|denied access/i.test(msg)) throw aiError('auth', t('keyBad', { e: msg.replace(/\.\s*$/, '') }), { fatal: true, status: r.status });
      const short = msg.length > 90 ? msg.slice(0, 90) + '…' : msg;
      throw aiError(r.status === 429 ? 'rate' : r.status >= 500 ? 'overloaded' : 'other', short, { status: r.status, retryAfterMs: retryAfter(j, msg), ...(r.status === 404 ? { nomodel: true } : {}) });
    }
    const text = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    const u = j && j.usageMetadata, usage = u && u.totalTokenCount != null
      ? { input: u.promptTokenCount ?? null, output: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), total: u.totalTokenCount } : null;
    return { text, usage };
  }

  // Food Coach 2.0: how long Gemini asks us to wait after a 429 (RetryInfo.retryDelay "37s"); a daily quota → 10 minutes; null = not said
  function retryAfter(j, msg){
    const d = ((j && j.error && j.error.details) || []).find(x => x && x.retryDelay), s = d && parseFloat(d.retryDelay);
    if(s > 0) return Math.round(s * 1000);
    return /per ?day|daily/i.test(msg || '') ? 600000 : null;
  }

  // Settings › Test key: how many Gemini models this key can use (the caller saves the key if it works)
  async function testKey(k){
    const r = await fetchT(`${GAPI}?pageSize=200`, { headers: { 'x-goog-api-key': k } }, 12000);
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `HTTP ${r.status}`);
    return (j.models || []).filter(m => /^models\/gemini/.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent')).length;
  }
  return { ...info, models: { default: DEFAULT_MODEL, advanced: '' }, ready: () => !!key(), chain, generate, testKey, listModels, bestModels, timeoutFor };
})();

// Food Coach 2.0: the other providers. Same normalized request / response / errors as Gemini, so no feature changes when one is picked.
// Picked by settings.provider ('gemini' default | 'openai' | 'openrouter' | 'anthropic'); key settings.aiKeys[id]; models settings.aiModels[id] =
// { default, advanced }; settings.aiBase[id] = another address (the app's own server later: it holds the key, so a shipped app carries none and
// the key can be left empty). Settings › AI picks the provider and keeps each one's key and models apart (wire/08 drawAiProv).
// Never a silent switch to a paid provider: run() only uses the provider that is picked.
const aiCfg = (id, k) => { const s = typeof settings !== 'undefined' ? settings : {}; return ((s[k] || {})[id]); };
function aiHttpError(status, msg, extra){
  const short = String(msg || `HTTP ${status}`).slice(0, 90);
  if(status === 401 || status === 403) return aiError('auth', t('keyBad', { e: short }), { fatal: true, status });
  return aiError(status === 429 ? 'rate' : status >= 500 || status === 529 ? 'overloaded' : 'other', short, { status, ...(status === 404 ? { nomodel: true } : {}), ...(extra || {}) });
}
async function aiPost(url, headers, body, ms, outer){
  let r, j = null;
  try{ r = await fetchT(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }, ms, outer); try{ j = await r.json(); }catch(e){} }
  catch(e){
    if(outer && outer.aborted) throw aiError('cancelled', t('cancelled'));
    if(e && e.name === 'AbortError') throw aiError('timeout', t('timedOut'));
    throw aiError('network', (e && e.message) || 'network');
  }
  if(!r.ok){ const ra = r.headers && r.headers.get ? parseFloat(r.headers.get('retry-after')) : NaN;
    throw aiHttpError(r.status, j && j.error && (j.error.message || j.error.type), { retryAfterMs: ra > 0 ? ra * 1000 : null }); }
  return j || {};
}
// New models keep arriving and each family refuses different settings, so there is no list of model names to keep up to date. A model that refuses a setting
// says which one (HTTP 400 "Unsupported parameter: 'temperature' …"): the request is changed that way (setting dropped, or max_tokens ↔ max_completion_tokens)
// and sent again, and what each model needs is remembered while the app is open. Used for OpenAI, OpenRouter and Claude.
const LEARNED = {};
function learnFix(mods, msg){
  const m = String(msg || ''), next = { ...mods, drop: { ...(mods.drop || {}) } };
  const tok = m.match(/max_completion_tokens|max_tokens/); if(tok && next.tok) next.tok = tok[0] === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';   // the first one named is the one refused
  ['temperature', 'top_p', 'response_format', 'reasoning_effort'].forEach(k => { if(m.includes(k)) next.drop[k] = true; });
  return JSON.stringify(next) === JSON.stringify(mods) ? null : next;
}
async function sendAdaptive(lk, mods0, send){
  let mods = LEARNED[lk] || mods0, last = null;
  for(let i = 0; i < 4; i++){
    try{ const r = await send(mods); LEARNED[lk] = mods; return r; }
    catch(e){ last = e; if(!(e && (e.status === 400 || e.status === 422))) throw e; const next = learnFix(mods, e.message); if(!next) throw e; mods = next; }
  }
  throw last;
}
// OpenAI chat completions, and every service that speaks the same language (OpenRouter, a self-hosted server)
function openAICompat(id, name, base, models){
  const key = () => aiCfg(id, 'aiKeys') || '', url = () => (aiCfg(id, 'aiBase') || base).replace(/\/$/, '');
  const pick = tier => { const m = aiCfg(id, 'aiModels') || {}; return (tier === 'advanced' ? m.advanced || models.advanced : m.default || models.default); };
  return {
    id, name, implemented: true, capabilities: { vision: true, search: false, json: true, searchWithJson: false, usage: true, streaming: false }, models,
    ready: () => !!key() || !!aiCfg(id, 'aiBase'),
    async chain(req){ return [...new Set([pick(req.tier), pick('default')].filter(Boolean))]; },
    timeoutFor: req => req.timeoutMs || (req.tier === 'advanced' ? 60000 : 30000),
    async generate(req, model, outer){
      if(req.search) throw aiError('unsupported', name + ': no web search', { fatal: true });
      const prompt = req.json !== false && !/json/i.test(req.prompt) ? req.prompt + '\nAnswer with the JSON object only.' : req.prompt;   // JSON mode: OpenAI refuses a request that never says "JSON"
      const content = [{ type: 'text', text: prompt }, ...[].concat(req.images || []).map(d => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + d } }))];
      // OpenAI's thinking models (gpt-5…, o1/o3/o4…) are started with the settings they are known to want; any other model (Luna, Terra, whatever comes next) starts
      // with the classic ones and is corrected by sendAdaptive from what it answers.
      const think = id === 'openai' && /^(gpt-5(?!.*chat)|o\d)/i.test(model);
      const mk = mods => ({ model, messages: [{ role: 'user', content: content.length === 1 ? prompt : content }],
        ...(think || mods.drop.temperature ? {} : { temperature: req.images && req.images.length || req.tier === 'advanced' ? 0 : 0.6 }),
        ...(think && !mods.drop.reasoning_effort ? { reasoning_effort: 'low' } : {}),   // a chat answer needs little thinking: faster, cheaper, not cut by the thinking
        ...(req.json === false || mods.drop.response_format ? {} : { response_format: { type: 'json_object' } }),
        ...(req.maxTokens && !think ? { [mods.tok]: req.maxTokens } : {}) });
      const j = await sendAdaptive(id + '|' + model, { drop: {}, tok: id === 'openai' ? 'max_completion_tokens' : 'max_tokens' },
        mods => aiPost(url() + '/chat/completions', key() ? { Authorization: 'Bearer ' + key() } : {}, mk(mods), req.timeoutMs, outer));
      const text = String((((j.choices || [])[0] || {}).message || {}).content || ''), u = j.usage;
      return { text, usage: u && u.total_tokens != null ? { input: u.prompt_tokens ?? null, output: u.completion_tokens ?? null, total: u.total_tokens } : null };
    },
    // the models this key can use (GET /models: also proves the key, with no model guessed). Chat models only, newest-looking first.
    async listModels(k){ const r = await aiGet(url() + '/models', k ? { Authorization: 'Bearer ' + k } : {}); return chatModels(r.data); },
    async testKey(k){ const l = await this.listModels(k); this.found = l; return l.length; },
  };
}
// the list of models a key can use, for Settings › AI (pick instead of typing an ID)
async function aiGet(url, headers){
  let r, j = null;
  try{ r = await fetchT(url, { headers }, 12000); try{ j = await r.json(); }catch(e){} }
  catch(e){ throw aiError(e && e.name === 'AbortError' ? 'timeout' : 'network', (e && e.name === 'AbortError') ? t('timedOut') : (e && e.message) || 'network'); }
  if(!r.ok) throw aiHttpError(r.status, j && j.error && (j.error.message || j.error.type));
  return j || {};
}
const NOT_CHAT = /(embed|tts|whisper|audio|realtime|image|transcribe|moderation|dall-e|davinci|babbage|instruct|computer-use|search-preview|sora|omni-moderation|guard)/i;
function chatModels(rows){ return [...new Set((rows || []).map(m => m && m.id).filter(id => id && !NOT_CHAT.test(id)))].sort().reverse(); }
const OpenAIProvider = openAICompat('openai', 'OpenAI', 'https://api.openai.com/v1', { default: 'gpt-4o-mini', advanced: 'gpt-4o' });
const OpenRouterProvider = openAICompat('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', { default: 'openai/gpt-4o-mini', advanced: 'anthropic/claude-sonnet-5-5' });
// Anthropic (Claude) Messages API. Straight from a browser it needs the "direct browser access" header; through the app's server (aiBase) it does not.
const AnthropicProvider = (() => {
  const id = 'anthropic', key = () => aiCfg(id, 'aiKeys') || '', base = () => (aiCfg(id, 'aiBase') || 'https://api.anthropic.com').replace(/\/$/, '');
  const pick = tier => { const m = aiCfg(id, 'aiModels') || {}; return tier === 'advanced' ? m.advanced || 'claude-sonnet-5-5' : m.default || 'claude-haiku-5-5'; };
  const head = k => ({ ...(k ? { 'x-api-key': k } : {}), 'anthropic-version': '2023-06-01', ...(aiCfg(id, 'aiBase') ? {} : { 'anthropic-dangerous-direct-browser-access': 'true' }) });
  return {
    id, name: 'Anthropic Claude', implemented: true, capabilities: { vision: true, search: false, json: true, searchWithJson: false, usage: true, streaming: false }, models: { default: 'claude-haiku-5-5', advanced: 'claude-sonnet-5-5' },
    ready: () => !!key() || !!aiCfg(id, 'aiBase'),
    async chain(req){ return [...new Set([pick(req.tier), pick('default')])]; },
    timeoutFor: req => req.timeoutMs || (req.tier === 'advanced' ? 60000 : 30000),
    async generate(req, model, outer){
      if(req.search) throw aiError('unsupported', 'Claude: no web search here', { fatal: true });
      const content = [...[].concat(req.images || []).map(d => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } })),
        { type: 'text', text: req.prompt + (req.json === false ? '' : '\nAnswer with the JSON object only.') }];
      const j = await sendAdaptive(id + '|' + model, { drop: {} }, mods => aiPost(base() + '/v1/messages', head(key()), { model, max_tokens: req.maxTokens || 1500,
        ...(mods.drop.temperature ? {} : { temperature: req.images && req.images.length || req.tier === 'advanced' ? 0 : 0.6 }), messages: [{ role: 'user', content }] }, req.timeoutMs, outer));
      const text = (j.content || []).map(c => c.text || '').join(''), u = j.usage;
      return { text, usage: u && u.input_tokens != null ? { input: u.input_tokens, output: u.output_tokens ?? null, total: u.input_tokens + (u.output_tokens || 0) } : null };
    },
    async listModels(k){ const r = await aiGet(base() + '/v1/models?limit=100', head(k)); return chatModels(r.data); },
    async testKey(k){ const l = await this.listModels(k); this.found = l; return l.length; },
  };
})();

const AIProvider = (() => {
  const registry = { gemini: GeminiProvider, openai: OpenAIProvider, openrouter: OpenRouterProvider, anthropic: AnthropicProvider };
  // the provider in use: settings.provider, Gemini when nothing (or something unknown) is set
  const active = () => registry[(typeof settings !== 'undefined' && settings.provider) || 'gemini'] || GeminiProvider;
  const sleep = (ms, outer) => new Promise((res, rej) => {
    if(outer && outer.aborted) return rej(aiError('cancelled', t('cancelled')));
    const id = setTimeout(() => { if(outer) outer.removeEventListener('abort', onAbort); res(); }, ms), onAbort = () => { clearTimeout(id); rej(aiError('cancelled', t('cancelled'))); };
    if(outer) outer.addEventListener('abort', onAbort, { once: true }); });
  const backoff = n => Math.min(2000, 400 * 2 ** n);   // 0.4 s, 0.8 s, 1.6 s, then 2 s at most
  const MIN_TRY = 3000;   // a try with less time left than this is not started: it would only time out
  const deadlineFor = req => req.deadlineMs || (req.tier === 'advanced' || req.search ? 120000 : 60000);

  // Food Coach 2.0 — quota cooldown: a model that answered 429 is skipped until the time the provider asked for (30 s when it did not say,
  // at most 10 min). When every model in the chain is cooling down, run() fails at once with kind 'rate' and .cooldown, without a network call,
  // so a message sent while the free quota is used up gets the offline answer in milliseconds instead of another minute of tries.
  const cool = {}, COOL_DEF = 30000, COOL_MAX = 600000;
  const coolKey = (p, m) => p.id + '|' + m;
  const cooling = (p, m) => (cool[coolKey(p, m)] || 0) > Date.now();
  function coolUntil(){ const n = Date.now(), v = Object.values(cool).filter(x => x > n); return v.length ? Math.min(...v) : 0; }
  // can a request be sent right now? { ok, why: 'nokey' | 'cooling' | 'unsupported', until }
  async function status(req){
    const p = active(); if(!p.implemented) return { ok: false, why: 'unsupported' };
    if(p.ready && !p.ready()) return { ok: false, why: 'nokey' };
    const ms = (await p.chain(req || {})).slice(0, (req && req.maxModels) || 99);
    return ms.length && ms.every(m => cooling(p, m)) ? { ok: false, why: 'cooling', until: coolUntil() } : { ok: true };
  }
  // the same request while it is still running (same dedupeKey) shares one answer instead of a second call
  const inflight = new Map();
  function run(req, opts){
    const k = req && req.dedupeKey; if(!k) return run1(req, opts);
    if(inflight.has(k)) return inflight.get(k);
    const pr = run1(req, opts); inflight.set(k, pr);
    const off = () => { if(inflight.get(k) === pr) inflight.delete(k); }; pr.then(off, off); return pr;
  }
  // Runs one normalized request: walks the model list (one try each, like before), retries are bounded, and every failure is normalized.
  // opts: { onTry(i, n, model), outer (AbortSignal) }.  Returns the normalized response; throws a normalized error (with the same user-facing texts as before).
  // req.maxModels (Food Coach 2.0): try at most this many models (a chat answer is not worth ten tries).
  async function run1(req, opts){
    opts = opts || {}; const outer = opts.outer, p = active(), t0 = Date.now(), maxRetry = Math.min(2, Math.max(0, req.retries | 0)), end = t0 + deadlineFor(req);
    const left = () => end - Date.now(), perTry = p.timeoutFor ? p.timeoutFor(req) : 30000;
    const trace = { provider: p.id, tier: req.tier || 'default', search: !!req.search, photo: !!(req.images && [].concat(req.images).length), task: req.task || '', ctx: req.ctx | 0, start: t0, tries: [], ok: false };
    const done = (res, err) => { trace.ms = Date.now() - t0; trace.ok = !err; trace.cancelled = !!(err && err.cancelled); trace.kind = err ? err.kind || 'other' : ''; try{ if(AIProvider.onDone) AIProvider.onDone(trace); }catch(e){} };
    try{
      if(!p.implemented) throw aiError('unsupported', p.name + ' is not built yet.', { fatal: true });
      if(p.ready && !p.ready()) throw aiError('auth', t('keyBad', { e: p.name }), { fatal: true, nokey: true });
      // a job the picked provider cannot do (web look-ups on OpenAI / OpenRouter / Claude here) stops before any network call, with its reason;
      // never handed to another provider
      const cap = p.capabilities || {};
      if(req.search && !cap.search) throw aiError('unsupported', t('aiErrNoSearch', { p: p.name }), { fatal: true, nosearch: true });
      if(req.images && [].concat(req.images).length && !cap.vision) throw aiError('unsupported', t('aiErrNoPhoto', { p: p.name }), { fatal: true, nophoto: true });
      const all = (await p.chain(req)).slice(0, req.maxModels || 99), models = all.filter(m => !cooling(p, m)); let last = null, waits = 0;
      if(all.length && !models.length){ trace.cooldown = true; throw aiError('rate', t('allBusy', { e: 'quota' }), { cooldown: true, until: coolUntil() }); }
      for(let i = 0; i < models.length; i++){
        if(outer && outer.aborted) throw aiError('cancelled', t('cancelled'));
        if(left() < MIN_TRY){ trace.deadline = true; break; }
        if(opts.onTry) opts.onTry(i + 1, models.length, models[i]);
        for(let again = 0; ; again++){
          if(again && left() < MIN_TRY){ trace.deadline = true; break; }
          const a = { model: models[i], t0: Date.now() };
          try{
            const g = await p.generate({ ...req, timeoutMs: Math.max(1000, Math.min(perTry, left())) }, models[i], outer); a.usage = g.usage || null;
            let json = null;
            if(req.json !== false){ json = aiParseJSON(g.text); if(json == null){ a.valid = false; throw aiError('bad_output', 'unreadable answer'); } a.valid = true; }
            a.ms = Date.now() - a.t0; a.ok = true; trace.tries.push(a);
            const res = { text: g.text, json, usage: g.usage || null, model: models[i], provider: p.id, ms: Date.now() - t0, tries: trace.tries.length };
            done(res); return res;
          }catch(e){
            a.ms = Date.now() - a.t0; a.ok = false; a.kind = e.kind || 'other'; trace.tries.push(a);
            if(e.fatal || e.cancelled) throw e;
            if(outer && outer.aborted) throw aiError('cancelled', t('cancelled'));
            last = e;
            if(a.kind === 'rate') cool[coolKey(p, models[i])] = Date.now() + Math.min(COOL_MAX, e.retryAfterMs || COOL_DEF);
            const k = AIKinds[a.kind] || {};
            if(k.wait && !(e.retryAfterMs > 5000)){ await sleep(Math.max(0, Math.min(backoff(waits++), left() - MIN_TRY)), outer); }   // busy or offline: a short pause helps whatever comes next (not after "quota used up for N s": waiting can't help)
            if(k.retry && again < maxRetry && a.kind !== 'rate') continue;   // opt-in same-model retry (default off); never into a 429
            break;
          }
        }
      }
      if(trace.deadline) throw aiError('timeout', t('allBusy', { e: last ? last.message : t('timedOut') }), { deadline: true });
      throw aiError(last ? last.kind : 'other', t('allBusy', { e: last ? last.message : '?' }), last ? { ...(last.nomodel ? { nomodel: true } : {}), status: last.status, why: last.message } : null);   // why = the provider's own short reason (Settings · Test The AI, and the chats when a request was turned down)   // keep why (a model that does not exist) for the plain message
    }catch(e){ if(!trace.ms) done(null, e); throw e; }
  }

  return { run, status, active, registry, onDone: null, aiParseJSON, coolReset: () => { Object.keys(cool).forEach(k => delete cool[k]); } };
})();
