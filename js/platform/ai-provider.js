// AI providers (0.8 prep, Athlete OS step 1): the one place that knows how to talk to a specific AI company.
// Food Track · Gym Buddy — AI.* in ai.js (bubble, counter, prompts) never builds a request itself; it hands a normalized request to AIProvider.run().
// Today only Gemini works (the user's own key, straight from the phone). When the small server arrives in 0.8, a provider that talks to the
// server replaces GeminiProvider here and nothing that asks the AI has to change.
//
// Normalized request   { prompt, images: [base64 jpeg], json: true, search: false, tier: 'default' | 'advanced', timeoutMs, retries, task }
//   json   the answer must be a JSON object (checked here; an unreadable answer counts as a failed try)
//   search the provider may look things up on the web (Gemini cannot do this and JSON answer mode at once, so the JSON is cut out of the text)
//   tier   'default' = the model chosen in Settings; 'advanced' = the strongest model the key allows (receipts)
//   retries  extra tries on the SAME model after a busy / rate-limit / network error (default 0: the next model is tried instead)
//   task   optional short label for the usage page ('receipt'), never the user's text
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
    const all = await listModels(), dflt = settings.model || DEFAULT_MODEL;
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
      throw aiError(r.status === 429 ? 'rate' : r.status >= 500 ? 'overloaded' : 'other', short, { status: r.status });
    }
    const text = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    const u = j && j.usageMetadata, usage = u && u.totalTokenCount != null
      ? { input: u.promptTokenCount ?? null, output: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), total: u.totalTokenCount } : null;
    return { text, usage };
  }

  // Settings › Test key: how many Gemini models this key can use (the caller saves the key if it works)
  async function testKey(k){
    const r = await fetchT(`${GAPI}?pageSize=200`, { headers: { 'x-goog-api-key': k } }, 12000);
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `HTTP ${r.status}`);
    return (j.models || []).filter(m => /^models\/gemini/.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent')).length;
  }
  return { ...info, chain, generate, testKey, listModels, bestModels };
})();

// Anthropic (Claude): NOT IMPLEMENTED. This is only the shape a real one must fill in, so nothing pretends to work.
// To build it for 0.8 (through the server, which holds the key): POST /v1/messages with headers x-api-key and anthropic-version, body { model, max_tokens, messages },
// read usage.input_tokens / usage.output_tokens, map 401 → 'auth', 429 → 'rate', 529 and 5xx → 'overloaded', and chain() returns the Haiku / stronger model by tier.
const AnthropicProvider = {
  id: 'anthropic', name: 'Anthropic Claude', implemented: false,
  capabilities: { vision: false, search: false, json: false, searchWithJson: false, usage: false },
  async chain(){ return []; },
  async generate(){ throw aiError('unsupported', 'The Anthropic provider is not built yet.', { fatal: true }); },
  async testKey(){ throw aiError('unsupported', 'The Anthropic provider is not built yet.', { fatal: true }); },
};

const AIProvider = (() => {
  const registry = { gemini: GeminiProvider, anthropic: AnthropicProvider };
  // the provider in use: settings.provider, Gemini when nothing (or something unknown) is set
  const active = () => registry[(typeof settings !== 'undefined' && settings.provider) || 'gemini'] || GeminiProvider;
  const sleep = (ms, outer) => new Promise((res, rej) => {
    if(outer && outer.aborted) return rej(aiError('cancelled', t('cancelled')));
    const id = setTimeout(() => { if(outer) outer.removeEventListener('abort', onAbort); res(); }, ms), onAbort = () => { clearTimeout(id); rej(aiError('cancelled', t('cancelled'))); };
    if(outer) outer.addEventListener('abort', onAbort, { once: true }); });
  const backoff = n => Math.min(2000, 400 * 2 ** n);   // 0.4 s, 0.8 s, 1.6 s, then 2 s at most

  // Runs one normalized request: walks the model list (one try each, like before), retries are bounded, and every failure is normalized.
  // opts: { onTry(i, n, model), outer (AbortSignal) }.  Returns the normalized response; throws a normalized error (with the same user-facing texts as before).
  async function run(req, opts){
    opts = opts || {}; const outer = opts.outer, p = active(), t0 = Date.now(), maxRetry = Math.min(2, Math.max(0, req.retries | 0));
    const trace = { provider: p.id, tier: req.tier || 'default', search: !!req.search, photo: !!(req.images && [].concat(req.images).length), task: req.task || '', start: t0, tries: [], ok: false };
    const done = (res, err) => { trace.ms = Date.now() - t0; trace.ok = !err; trace.cancelled = !!(err && err.cancelled); trace.kind = err ? err.kind || 'other' : ''; try{ if(AIProvider.onDone) AIProvider.onDone(trace); }catch(e){} };
    try{
      if(!p.implemented) throw aiError('unsupported', p.name + ' is not built yet.', { fatal: true });
      const models = await p.chain(req); let last = null, waits = 0;
      for(let i = 0; i < models.length; i++){
        if(outer && outer.aborted) throw aiError('cancelled', t('cancelled'));
        if(opts.onTry) opts.onTry(i + 1, models.length, models[i]);
        for(let again = 0; ; again++){
          const a = { model: models[i], t0: Date.now() };
          try{
            const g = await p.generate(req, models[i], outer); a.usage = g.usage || null;
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
            const k = AIKinds[a.kind] || {};
            if(k.wait){ await sleep(backoff(waits++), outer); }   // busy or offline: a short pause helps whatever comes next
            if(k.retry && again < maxRetry) continue;             // opt-in same-model retry (default off)
            break;
          }
        }
      }
      throw aiError(last ? last.kind : 'other', t('allBusy', { e: last ? last.message : '?' }));
    }catch(e){ if(!trace.ms) done(null, e); throw e; }
  }

  return { run, active, registry, onDone: null, aiParseJSON };
})();
