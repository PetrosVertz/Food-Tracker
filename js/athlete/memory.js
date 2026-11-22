// Athlete OS · memory: what the user TOLD the app about themselves, kept so every coach can use it later.
// Food Track · Gym Buddy — plain browser script. Saved through Store as 'athleteMem' (this device only, never in backups or sync,
// like 'aiKnow'). No AI call is made here, and no AI guess is ever stored: a note comes only from the user's own typed chat message,
// matched by the fixed rules in RULES below (English + Greek). Everything else the coaches know is read live from the app's records.
//
// Three kinds of memory (contract, v1):
//   profile   stable: "I don't eat mushrooms", "remember I train in the mornings"            kept until the user deletes it
//   context   temporary: "my shoulder hurts", "I'm travelling this week"                      expires (until), then is gone for good
//   learned   validated patterns the app already owns elsewhere: Food Coach portion corrections live in 'foodFix' (today.js) and the
//             daily patterns in 'aiKnow' (know.js). They are NOT copied here; AthleteState reads them where they live.
// Item  { id, kind: 'profile' | 'context', topic: 'food' | 'gym' | 'all', text, key, src: 'user', conf: 1, at, until: ms | null, n }
//   key   what the note is about ('food:mushrooms', 'pain:shoulder', 'routine:train'). A newer note with the same key REPLACES the older
//         one (the user's latest word wins); a "fine again" / "I eat it again" message removes it.
// Ledger (decision history, no text): { at, sp, act: 'apply' | 'undo' | 'dismiss', i } — which coach card actions were taken or undone.
// The user can see and delete every note (Settings › AI › What AI Knows); Reset What AI Knows clears all of it.

const AthleteMemory = (() => {
  const NAME = 'athleteMem', MAX = 60, LEDGER_MAX = 100, TEXT_MAX = 140, DAY = 864e5;
  const nm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/\s+/g, ' ').trim();
  let mem = null, ver = 0;

  function load(){
    if(mem) return mem;
    const m = Store.load(NAME, null);
    mem = m && Array.isArray(m.items) ? { v: 1, items: m.items.filter(ok), ledger: Array.isArray(m.ledger) ? m.ledger : [] } : { v: 1, items: [], ledger: [] };
    return mem;
  }
  const ok = x => x && typeof x === 'object' && typeof x.text === 'string' && x.text && (x.kind === 'profile' || x.kind === 'context');
  function save(){ ver++; return Store.save(NAME, mem); }
  const live = (x, now) => !x.until || x.until > now;
  // expired temporary notes are removed for good (a temporary note must never turn into a lasting one)
  function prune(now){ const m = load(), before = m.items.length; m.items = m.items.filter(x => live(x, now || Date.now())); if(m.items.length !== before) save(); return m; }

  // ---- safety: what may be stored and how it is shown to the AI ----
  // a note that tries to steer the AI ("ignore your rules", markup, code) is refused: notes are facts about the user, not instructions
  const INJECT = /\b(ignore|disregard|forget (all|your|the|previous)|system prompt|instruction|you are now|act as|pretend|jailbreak|developer mode|override|reveal|api key)\b|αγνοησε|οδηγιε|<\/?[a-z][^>]*>|```|\{|\}|https?:\/\//i;
  const clean = s => String(s || '').replace(/["“”«»`\\]/g, '').replace(/\s+/g, ' ').trim().replace(/[.,;:!\s]+$/, '').slice(0, TEXT_MAX);
  const safe = s => !!s && s.length >= 3 && !INJECT.test(s) && !INJECT.test(nm(s));

  // ---- the rules: one sentence of the user's message → a note, a removal, or nothing ----
  // obj: the thing the note is about, from the match (used for the key); kind / topic / days (context lifetime) per rule.
  const W = '([\\p{L}\\p{N} \\-]{2,40}?)';   // a short object ("my left shoulder", "mushrooms")
  const END = '(?:\\s+(?:any ?more|anymore|now|again|πια|πλεον|ξανα))?\\s*$';
  const R = (src, f) => new RegExp(src, 'iu');
  const RULES = [
    // corrections first: "my shoulder is fine now" removes the pain note; "I eat mushrooms again" removes the food note
    { re: R(`\\bmy ${W} (?:is|are|feels?) (?:fine|ok|okay|better|healed|good)\\b`), drop: 'pain' },
    { re: R(`\\bmy ${W} (?:doesn'?t|don'?t|does not|do not|no longer) hurts?\\b`), drop: 'pain' },
    { re: R(`(?:^|[\\s,])δεν (?:με )?πονα(?:ει|νε)? πια (?:ο |η |το |οι |τα )?${W}${END}`), drop: 'pain' },
    { re: R(`\\bi (?:eat|do eat|can eat) ${W} (?:again|now)\\b`), drop: 'food' },
    { re: R(`(?:^|[\\s,])τρωω (?:ξανα|πλεον) ${W}${END}`), drop: 'food' },
    // remember that … (explicit)
    { re: R('^(?:please )?(?:remember|note|keep in mind)(?: that)? (.{3,})$'), kind: 'auto', key: 'note' },
    { re: R('^(?:να )?(?:θυμ(?:ησου|ασαι)|σημειωσε)(?: οτι)? (.{3,})$'), kind: 'auto', key: 'note' },
    // food: restrictions and dislikes (stable)
    { re: R(`\\bi (?:don'?t|do not|never|can'?t|cannot|won'?t) eat ${W}${END}`), kind: 'profile', topic: 'food', key: 'food' },
    { re: R(`\\bi (?:hate|dislike|can'?t stand|don'?t like|do not like) ${W}${END}`), kind: 'profile', topic: 'food', key: 'food' },
    { re: R("\\bi(?:'m| am) (vegan|vegetarian|pescatarian|lactose intolerant|gluten intolerant|allergic to [\\p{L} ]{2,30})\\b"), kind: 'profile', topic: 'food', key: 'diet' },
    { re: R(`(?:^|[\\s,])δεν (?:τρωω|μου αρεσει|μου αρεσουν) ${W}${END}`), kind: 'profile', topic: 'food', key: 'food' },
    { re: R('(?:^|[\\s,])ειμαι (χορτοφαγοσ|vegan|βιγκαν|αλλεργικοσ σε [\\p{L} ]{2,30}|αλλεργικη σε [\\p{L} ]{2,30})'), kind: 'profile', topic: 'food', key: 'diet' },
    // body: pain and injury (temporary: a week)
    { re: R(`\\bmy ${W} (?:hurts?|(?:is|are|feels?) (?:sore|injured|painful|tweaked|stiff)|aches?|is killing me)\\b`), kind: 'context', topic: 'gym', key: 'pain', days: 7 },
    { re: R(`\\bi (?:hurt|injured|tweaked|pulled|strained) my ${W}${END}`), kind: 'context', topic: 'gym', key: 'pain', days: 7 },
    { re: R(`(?:^|[\\s,])(?:με )?πονα(?:ει|νε) (?:ο |η |το |οι |τα )?${W}${END}`), kind: 'context', topic: 'gym', key: 'pain', days: 7 },
    { re: R(`(?:^|[\\s,])τραυματισα (?:τον |την |το )?${W}${END}`), kind: 'context', topic: 'gym', key: 'pain', days: 7 },
    // schedule: away / sick / no gym (temporary)
    { re: R("\\bi(?:'m| am| will be)? ?(?:travell?ing|away|on holiday|on vacation|sick|ill)\\b"), kind: 'context', topic: 'all', key: 'away', days: 7, whole: true },
    { re: R("\\bi (?:can'?t|cannot|won'?t|will not) (?:train|work ?out|go to the gym|lift)\\b"), kind: 'context', topic: 'gym', key: 'away', days: 7, whole: true },
    { re: R('(?:^|[\\s,])(?:ειμαι|θα ειμαι) (?:αρρωστοσ|αρρωστη|(?:σε )?ταξιδι|(?:σε )?διακοπεσ)'), kind: 'context', topic: 'all', key: 'away', days: 7, whole: true },
    { re: R('(?:^|[\\s,])δεν (?:μπορω να|θα) (?:προπονηθω|γυμναστω|παω γυμναστηριο)'), kind: 'context', topic: 'gym', key: 'away', days: 7, whole: true },
    // routines (stable; the newest one wins)
    { re: R('\\bi (?:usually |always |only |prefer to )?(?:train|work out|lift|go to the gym) (?:in the |at |on )(.{3,40})$'), kind: 'profile', topic: 'gym', key: 'routine:train', whole: true },
    { re: R('(?:^|[\\s,])γυμναζομαι (?:συνηθωσ |παντα |μονο )?(?:το |τα |τισ |στισ |στο )(.{3,40})$'), kind: 'profile', topic: 'gym', key: 'routine:train', whole: true },
    { re: R('\\bi (?:usually |always )?(?:eat|have) (breakfast|lunch|dinner) (?:at|around) (.{2,20})$'), kind: 'profile', topic: 'food', key: 'routine:meal', whole: true },
  ];
  const GYM = /\b(train|workout|gym|lift|squat|bench|deadlift|sets?|reps|muscle|cardio|run)\w*|γυμναστ|γυμναζ|προπον|σετ|επαναληψ/iu;
  const FOOD = /\b(eat|food|meal|breakfast|lunch|dinner|snack|protein|calorie|kcal|carb|diet|drink)\w*|τρω|φαγητ|γευμα|πρωινο|μεσημεριανο|βραδινο|πρωτειν|θερμιδ|διατροφ/iu;
  const TEMP = /\b(today|tonight|tomorrow|this week|next week|this weekend|for now|until|till|these days)\b|σημερα|αυριο|αυτη την εβδομαδα|αυτεσ τισ μερεσ|μεχρι/iu;
  const lifeOf = s => /\b(today|tonight)\b|σημερα|αποψε/iu.test(s) ? 1 : /\btomorrow\b|αυριο/iu.test(s) ? 2 : /\bweekend\b|σαββατοκυριακο/iu.test(s) ? 4 : 7;
  const keyOf = (base, obj) => base.includes(':') ? base : base + ':' + nm(obj).replace(/^(my|the|a|an|ο|η|το|οι|τα|τον|την) /, '').replace(/^(left|right|αριστεροσ|αριστερη|αριστερο|δεξιοσ|δεξια|δεξι) /, '').replace(/ (μου|of mine)$/, '').slice(0, 30);

  // one message → [{ add: item } | { drop: key }]. Questions are skipped (only statements are remembered).
  function parse(text, now){
    now = now || Date.now();
    const out = [], sents = String(text || '').split(/(?<=[.!;\n])\s+|\n/).map(s => s.trim()).filter(Boolean);
    for(const raw of sents){
      if(/[?;]\s*$/.test(raw) && !/^(remember|θυμ)/i.test(nm(raw))) continue;   // a question (Greek uses ;)
      const s = nm(raw).replace(/[.!;?,\s]+$/, '');
      for(const r of RULES){
        const m = s.match(r.re); if(!m) continue;
        if(r.drop){ out.push({ drop: keyOf(r.drop, m[1]) }); break; }
        const obj = m[1] || '', textOut = clean(r.key === 'note' ? raw.replace(/^\s*(please\s+)?(remember|note|keep in mind)(\s+that)?\s+/i, '').replace(/^\s*(να\s+)?(θυμ[ήη]σου|θυμάσαι|σημείωσε)(\s+[όο]τι)?\s+/i, '') : raw);
        if(!safe(textOut) || !safe(obj || textOut)) break;
        let kind = r.kind, topic = r.topic || 'all', days = r.days || 0, base = r.key;
        if(base === 'food' && GYM.test(obj) && !FOOD.test(obj)){ topic = 'gym'; base = 'pref'; }   // "I don't like squats" is a training preference
        if(kind === 'auto'){ kind = TEMP.test(s) ? 'context' : 'profile'; topic = GYM.test(s) ? 'gym' : FOOD.test(s) ? 'food' : 'all'; days = kind === 'context' ? lifeOf(s) : 0; }
        else if(kind === 'context' && TEMP.test(s) && base !== 'pain') days = Math.min(days, lifeOf(s));   // pain is kept its week even if it started "today"
        const key = base === 'note' ? 'note:' + nm(textOut).slice(0, 40) : keyOf(base, obj);
        out.push({ add: { kind, topic, text: textOut, key, src: 'user', conf: 1, at: now, until: kind === 'context' ? now + days * DAY : null } });
        break;   // one note per sentence
      }
    }
    return out;
  }

  // ---- public ----
  // observe(text, specialist): the user's chat message. Returns { added: [items], dropped: [items] } (both may be empty).
  function observe(text, sp, now){
    now = now || Date.now(); const m = prune(now), added = [], dropped = [];
    parse(text, now).forEach(op => {
      const key = op.drop || op.add.key, i = m.items.findIndex(x => x.key === key);
      if(op.drop){ if(i > -1) dropped.push(...m.items.splice(i, 1)); return; }
      const it = op.add;
      if(i > -1){ const was = m.items[i]; if(nm(was.text) === nm(it.text)){ was.n = (was.n || 1) + 1; was.at = now; if(it.until) was.until = it.until; return; }
        dropped.push(...m.items.splice(i, 1)); }   // the user's newer word replaces the older note
      it.id = (Store.newId ? Store.newId() : now.toString(36) + Math.random().toString(36).slice(2, 7)); it.n = 1; it.sp = sp || '';
      m.items.push(it); added.push(it);
    });
    if(added.length || dropped.length){ while(m.items.length > MAX) m.items.splice(m.items.findIndex(x => x.kind === 'context') > -1 ? m.items.findIndex(x => x.kind === 'context') : 0, 1); save(); }
    return { added, dropped };
  }
  // the notes in force now; topic 'food' | 'gym' also includes 'all'
  function list(topic, now){ now = now || Date.now();
    return load().items.filter(x => live(x, now) && (!topic || x.topic === topic || x.topic === 'all')).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'profile' ? -1 : 1) || b.at - a.at); }
  function remove(id){ const m = load(), i = m.items.findIndex(x => x.id === id); if(i < 0) return null; const [g] = m.items.splice(i, 1); save(); return g; }
  function restore(items){ const m = load(); [].concat(items || []).forEach(it => { if(ok(it) && !m.items.some(x => x.id === it.id)){ const j = m.items.findIndex(x => x.key === it.key); if(j > -1) m.items.splice(j, 1); m.items.push(it); } }); save(); }
  function edit(id, text){ const m = load(), x = m.items.find(y => y.id === id), c = clean(text); if(!x || !safe(c)) return false; x.text = c; x.at = Date.now(); save(); return true; }
  function clear(){ mem = { v: 1, items: [], ledger: [] }; save(); }
  // decision history: a coach card action was applied / undone / dismissed (no text: which coach, which kind, which button)
  function decide(sp, act, i){ const m = load(); m.ledger.push({ at: Date.now(), sp: String(sp || ''), act, i: i | 0 }); if(m.ledger.length > LEDGER_MAX) m.ledger.splice(0, m.ledger.length - LEDGER_MAX); save(); }
  function ledger(sp, n){ return load().ledger.filter(x => !sp || x.sp === sp).slice(-(n || 20)); }
  // a portable copy of everything stored here (Settings › AI: copy / share) — the user's own notes and decisions, no AI text
  const exportAll = () => JSON.stringify({ app: 'food-track', kind: 'athlete-memory', v: 1, at: new Date().toISOString(), ...load() }, null, 1);
  return { observe, parse, list, remove, restore, edit, clear, decide, ledger, exportAll, version: () => ver, _reset(){ mem = null; ver++; } };
})();
