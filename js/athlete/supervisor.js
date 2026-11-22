// Athlete OS · supervisor: plain code that sits between a coach and the AI. It is NOT another AI and never calls one on its own.
// Food Track · Gym Buddy — plain browser script, the last Athlete OS file (after events, memory, state, context).
//
// One user message = ONE AI request, as before. Per request the supervisor:
//   1. knows which specialist is asking (the registry below; the coach window the user opened decides it, never an AI)
//   2. lets that specialist's prompt pull its context block (AI.knows → context(): permission-filtered, budgeted, cached)
//   3. sends the request through AI.ask → AIProvider (model tier / optional model per specialist, task label for Settings › AI › Usage)
//   4. checks the answer against the specialist's schema (types, required fields, number ranges)
//   5. on an unusable answer: ONE retry on the stronger tier, only for specialists marked escalate (a fixed rule, no self-review loop)
//   6. records how it went (time, context size, valid or not) per specialist — numbers only, no text
// It also reads the user's own chat message for things to remember (AthleteMemory.observe: fixed rules, no AI) and records which
// coach card actions were applied or undone (the decision ledger). Specialists only PROPOSE: cards with Apply / Undo stay in the
// feature code, so no AI answer can change saved data by itself.
//
// Specialist contract (register(id, spec) adds a new one; nothing else in Athlete OS changes):
//   { id, topic: 'food' | 'gym', scopes: [context parts it may see], skip: [parts its prompt already has], cross: [extra parts for an
//     other-domain question], budget: letters of context, short: habits in one line, tier: 'default' | 'advanced', model: optional
//     model name (else the tier decides), task: usage label, schema: { field: rule }, strict: an invalid answer is an error,
//     escalate: one stronger retry on an invalid answer }
//   rule: 'string' | 'array' | 'object' | 'number' | 'boolean', '?' at the end = may be missing / null; or { type, min, max, of }.
// Output the coaches already return is unchanged: the JSON object of their own prompt.

const Supervisor = (() => {
  const SP = {};
  const BASE = ['now', 'notes', 'goals', 'body', 'changes', 'ledger', 'patterns'];
  function register(id, spec){ SP[id] = Object.assign({ id, topic: 'food', scopes: BASE, skip: [], cross: [], budget: 1400, tier: 'default', task: id, schema: null, strict: false, escalate: false }, spec, { id }); return SP[id]; }

  // ---- the specialists today (their prompts and personalities stay in their own files) ----
  // Food Coach (today.js logQPrompt): its prompt already has today's totals → skip 'nutrition'; a training question adds training + recovery
  register('chef', { topic: 'food', scopes: [...BASE, 'nutrition'], skip: ['nutrition'], cross: ['training', 'recovery'], budget: 1500, task: 'coach-food',
    schema: { reply: 'string?', intent: 'string?', items: 'array?' }, escalate: false });
  // Gym Coach chat (gym.js gcPrompt / gcLivePrompt with GymIntel.brief): recovery and the relevant workouts are in its packet already → skip them; food today is new to it
  const GYM = { topic: 'gym', scopes: [...BASE, 'nutrition', 'training', 'recovery'], skip: ['training', 'recovery'], cross: [], budget: 1500,
    schema: { reply: 'string', workout: 'object?', style: 'string?' }, escalate: true };
  register('gym', { ...GYM, task: 'coach-gym' }); register('gymstart', { ...GYM, task: 'coach-gym' });
  register('gymlive', { ...GYM, task: 'coach-gym-live', schema: { reply: 'string', machine: 'object?', change: 'object?', style: 'string?' } });   // change: checked again by GymIntel.proposal before any card
  // Fridge AI = the Kitchen cook ideas and recipes (wire/05 sgGo, wire/02 suggestBtn): fridge items are in their prompts; it gets the goal,
  // the user's food notes and a one-line habit summary — not body weight, not training details (data minimisation)
  register('fridge', { topic: 'food', scopes: ['now', 'notes', 'goals', 'patterns'], budget: 900, short: true, task: 'fridge', strict: true, escalate: true,
    schema: { title: 'string', steps: { type: 'array', min: 1 }, ingredients: { type: 'array', min: 1, of: { grams: { type: 'number?', min: 0, max: 5000 } } },
      perServing: { type: 'object?', of: { kcal: { type: 'number?', min: 0, max: 5000 }, protein: { type: 'number?', min: 0, max: 400 } } } } });
  // the other AI helpers that ask for context by topic only (Fill My Macros, meal plans, Next Exercise)
  register('food', { topic: 'food', scopes: [...BASE, 'nutrition'], budget: 1400 });
  register('gymtool', { topic: 'gym', scopes: [...BASE, 'nutrition', 'recovery', 'training'], budget: 1400 });

  const spec = id => SP[id] || null;
  // which specialist fits a message best (plain word rules). Used for context (one coach, shared context), never for extra AI calls.
  function route(text, from){
    const it = AthleteContext.intentOf(text), f = spec(from);
    const to = it.gym && !it.food ? (f && f.topic === 'gym' ? from : 'gym') : it.food && !it.gym ? (f && f.topic === 'food' ? from : 'chef') : (from || 'chef');
    return { to, food: it.food, gym: it.gym, mixed: it.food && it.gym };
  }

  // ---- the request in progress (set by the coach window while it builds its prompt) ----
  let cur = null;
  // begin(id, text): a user message arrived in coach `id`. Returns what was remembered from it (the coach shows a small "Remembered" toast).
  function begin(id, text){
    cur = { id, text: String(text || ''), at: Date.now() };
    try{ return AthleteMemory.observe(text, id); }catch(e){ console.warn('athlete memory', e); return { added: [], dropped: [] }; }
  }
  const end = () => { cur = null; };
  // AI.knows(topic, id): the context block. The coach in progress wins when its topic matches; else the named or the topic's default specialist.
  function context(topic, id){
    const c = cur && Date.now() - cur.at < 120e3 && spec(cur.id) && spec(cur.id).topic === (topic || spec(cur.id).topic) ? cur : null;
    const s = spec(id) || (c && spec(c.id)) || spec(topic === 'gym' ? 'gymtool' : 'food');
    const b = AthleteContext.build(s, { text: c ? c.text : '' });
    last[s.id] = b.chars; return b.text;
  }
  const last = {};

  // ---- answer checking ----
  function check(rule, v, path, errs){
    const r = typeof rule === 'string' ? { type: rule } : rule, opt = /\?$/.test(r.type), type = r.type.replace(/\?$/, '');
    if(v === undefined || v === null){ if(!opt) errs.push(path + ' missing'); return; }
    const okType = type === 'array' ? Array.isArray(v) : type === 'number' ? typeof v === 'number' && isFinite(v) || (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) : type === 'object' ? typeof v === 'object' && !Array.isArray(v) : typeof v === type;
    if(!okType){ errs.push(path + ' not ' + type); return; }
    if(type === 'number' && ((r.min != null && +v < r.min) || (r.max != null && +v > r.max))) errs.push(path + ' out of range');
    if(type === 'string' && r.min && !v.trim()) errs.push(path + ' empty');
    if(type === 'array'){ if(r.min && v.length < r.min) errs.push(path + ' too short'); if(r.of) v.slice(0, 50).forEach((x, i) => { if(x && typeof x === 'object') Object.entries(r.of).forEach(([k, rr]) => check(rr, x[k], `${path}[${i}].${k}`, errs)); }); }
    if(type === 'object' && r.of) Object.entries(r.of).forEach(([k, rr]) => check(rr, v[k], path + '.' + k, errs));
  }
  // validate(schema, answer) → { ok, errors }
  function validate(schema, obj){ const errs = [];
    if(!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['not an object'] };
    Object.entries(schema || {}).forEach(([k, r]) => check(r, obj[k], k, errs)); return { ok: !errs.length, errors: errs }; }

  // ---- measurement per specialist (this session; the persistent numbers are in AIUsage by task label) ----
  const ST = {};
  const stat = id => ST[id] || (ST[id] = { calls: 0, ok: 0, failed: 0, invalid: 0, escalated: 0, ms: 0, ctx: 0 });

  // ask(id, prompt, img, opts) → the answer object, like gemini(). opts: { onTry, signal, quiet, robot, retries, task, … } (passed through)
  async function ask(id, prompt, img, opts){
    opts = opts || {}; const s = spec(id) || register(id, {}), st = stat(s.id), t0 = Date.now();
    const o = { ...opts, task: opts.task || s.task, ctx: last[s.id] || 0 }; delete o.onTry; delete o.signal;
    if(s.model && !o.model) o.model = s.model; if(s.tier === 'advanced') o.best = true;
    st.calls++; st.ctx += o.ctx;
    try{
      let r = await gemini(prompt, img, opts.onTry, opts.signal, o), v = s.schema ? validate(s.schema, r) : { ok: true };
      if(!v.ok){ st.invalid++;
        if(s.escalate && !o.best && !(opts.signal && opts.signal.aborted)){ st.escalated++;   // the one stronger retry
          r = await gemini(prompt, img, opts.onTry, opts.signal, { ...o, best: true, quiet: true, task: o.task + '-retry' }); v = validate(s.schema, r); if(!v.ok) st.invalid++; } }
      if(!v.ok && s.strict) throw Object.assign(new Error((typeof t === 'function' && t('aiBadAnswer') !== 'aiBadAnswer' ? t('aiBadAnswer') : 'unusable answer')), { kind: 'bad_output', errors: v.errors });
      st.ok++; return r;
    }catch(e){ st.failed++; throw e; }
    finally{ st.ms += Date.now() - t0; }
  }
  // decision ledger: a card action was used ('apply'), undone ('undo') or a card dismissed
  function decide(id, act, i){ try{ AthleteMemory.decide(id, act, i); }catch(e){} }
  return { register, spec, route, begin, end, context, validate, ask, decide, stats: () => JSON.parse(JSON.stringify(ST)), list: () => Object.keys(SP), current: () => cur };
})();
