// Exercise search (Refinements change 16): every box that searches exercises uses this. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// Same ideas as the food search (js/search.js) and its helpers (Search.stem, Search.wordScore, Search.dist, STOP):
// any word order, plurals, typos ("pec duck"), words written together or apart ("pullup", "lat pull down"), other names (ALSO in
// data/gym.js = the exact same exercise), close neighbours (EX_NEAR = a different exercise people confuse it with), short words
// (EX_WORDS: db = dumbbell), Greek with or without accents, upper case, and Greeklish ("roumanikes").
//
//   ExSearch.query(text, options) → { items, dym }
//     options: list (the exercises, EX()), lang ('en' | 'el', which name is shown), sessions (habits: recent and frequent first),
//              ids (a Set: search only these), near / similar (false = leave those levels out), max (default 60)
//     items: [{ id, x, level, reason, q, ranges, via, viaRanges }] best first, as ONE list:
//       level 1 'exact'   the name or an exact other name (also written together / apart, other word order, plurals)
//       level 2 'close'   starts with what you typed, or after fixing typos and spacing
//       level 3 'near'    the same movement under another common name (EX_NEAR)
//       level 4 'muscle'  found by its muscle or equipment ("chest", "αλτήρες")
//       level 5 'similar' same main muscles and movement as the best match (the Swap sheet's muscle match)
//     ranges: [[from, to]] letters of the shown name (x[lang]) that matched, for bold; via: the other name it matched through
//       ("also called …"), with its own viaRanges. dym: true when nothing matched and items are the closest "Did You Mean" guesses.
//   ExSearch.mark(text, ranges)  the text as safe HTML with the matched letters in <em class="exm">
// It reads only what it is given; the index is built once per exercise list and kept.
const ExSearch = (() => {
  // ---------- words ----------
  const GR = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'ks', ο: 'o', π: 'p', ρ: 'r', σ: 's', τ: 't', υ: 'y', φ: 'f', χ: 'x', ψ: 'ps', ω: 'o' };
  const greekRe = /[α-ω]/, latinRe = /^[a-z0-9]+$/;
  // one spelling for Greeklish, whichever way it was typed ("ou"/"u", "ei"/"i", "mp"/"b", "th", "ch"/"x"/"h", "ks"/"x", doubled letters)
  const canon = w => w.replace(/th/g, '8').replace(/ch|kh|ks|h/g, 'x').replace(/ph/g, 'f').replace(/o[uy]/g, 'u').replace(/ai/g, 'e').replace(/[eoy]i/g, 'i')
    .replace(/mp/g, 'b').replace(/nt/g, 'd').replace(/g[kg]/g, 'g').replace(/[yw]/g, (c) => c === 'y' ? 'i' : 'o').replace(/c/g, 'k').replace(/(.)\1+/g, '$1');
  const greeklish = w => canon([...w].map(c => GR[c] || c).join(''));
  // Greek words: the ending dropped, so "κάμψη" and "κάμψεις" meet; English: the food search's plural rule
  const grStem = w => { const m = w.length >= 5 && w.match(/^(.{3,}?)(εισ|εσ|οσ|ου|ων|ια|ησ|ασ|α|η|ι|ο|ε|σ)$/); return m ? m[1] : w; };
  const prep = n => { const s = latinRe.test(n) ? Search.stem(n) : greekRe.test(n) ? grStem(n) : n; return EX_WORDS[n] || EX_WORDS[s] || s; };
  // a text → its words (with where each sits in the text, for bold), the words without spaces, and the words as a set
  function mk(text, kind){
    const spans = [], re = /[\p{L}\p{N}]+/gu; let m;
    while((m = re.exec(text))){ const n = norm(m[0]); if(!n || STOP.has(n)) continue;
      spans.push({ n, s: prep(n), g: greekRe.test(n) ? greeklish(n) : null, a: m.index, b: m.index + m[0].length }); }
    const cmap = []; spans.forEach(w => { for(let i = 0; i < w.n.length; i++) cmap.push([w.a + Math.min(i, w.b - w.a - 1), w]); });
    return { text, kind, w: spans, c: spans.map(w => w.n).join(''), cmap, set: spans.map(w => w.s).sort().join(' '), gr: spans.some(w => w.g), gc: spans.map(w => w.g || w.n).join('') };
  }

  // ---------- the index: built once per exercise list ----------
  let IDX = null, IDXL = null, IDXN = -1, NEAR = null;
  const unit = mu => { const e = Object.entries(mu || {}), l = Math.sqrt(e.reduce((a, [, v]) => a + v * v, 0)) || 1; return Object.fromEntries(e.map(([k, v]) => [k, v / l])); };
  function index(list){
    if(IDX && IDXL === list && IDXN === list.length) return IDX;
    if(!NEAR){ NEAR = {}; Object.entries(typeof EX_NEAR_RAW === 'object' ? EX_NEAR_RAW : {}).forEach(([a, v]) => v.split(/\s+/).filter(Boolean).forEach(b => {
      (NEAR[a] = NEAR[a] || []).includes(b) || NEAR[a].push(b); (NEAR[b] = NEAR[b] || []).includes(a) || NEAR[b].push(a); })); }
    IDX = list.map((x, i) => {
      const names = [], seen = new Set(), add = (tx, kind) => { if(!tx) return; const r = mk(String(tx), kind); if(!r.c || seen.has(kind[0] === 'a' ? r.c : kind + r.c)) return; seen.add(r.c); names.push(r); };
      add(x.en, 'en'); add(x.el, 'el'); (x.al || []).forEach(a => add(a, 'al'));
      // muscle and equipment words, each with how much this exercise uses that muscle
      const extra = [];
      Object.entries(x.mu || {}).forEach(([h, pct]) => { const hd = HEADS[h], g = hd && GROUPS[hd[2]]; [hd && hd[0], hd && hd[1], g && g[0], g && g[1]].forEach(tx => tx && mk(tx).w.forEach(w => extra.push({ w, pct }))); });
      (EQUIP[x.e] || []).forEach(tx => mk(tx).w.forEach(w => extra.push({ w, pct: 100 })));
      return { x, i, names, extra, u: unit(x.mu), card: x.m === 'cardio' };
    });
    IDXL = list; IDXN = list.length; return IDX;
  }

  // ---------- matching one name ----------
  // one typed word against one word of a name: 1 the same, .9 still typing, .75/.6 a typo, Greeklish a little less
  function wsc(t, w){
    const c = t.memo && t.memo.get(w.n); if(c !== undefined) return c;
    let s = Math.max(t.s === w.s ? 1 : 0, Search.wordScore(t.s, w.s), Search.wordScore(t.n, w.n) * .98);
    if(s < 1 && t.lat && w.g) s = Math.max(s, (t.g === w.g ? 1 : Search.wordScore(t.g, w.g)) * .92);
    if(t.memo) t.memo.set(w.n, s);   // the same word ("press", "αλτήρες") comes back in many exercises: worked out once per search
    return s;
  }
  // how well the typed text matches one name: { q 0..1, exact, how ('c' = by the letters without spaces, 'w' = word by word), hits }
  function match(Q, nm){
    if(Q.c === nm.c) return { q: 1, exact: true, how: 'c' };   // letter for letter (spaces and hyphens aside)
    if(Q.set === nm.set && Q.w.length) return { q: .95, exact: true, how: 'w' };   // other word order, plurals, Greek endings, db = dumbbell
    if(Q.lat && nm.gr && Q.g === nm.gc) return { q: .95, exact: true, how: 'g' };
    let best = { q: 0 };
    // word by word: every typed word finds a word of the name (one may be missing in a long search)
    let miss = 0, sum = 0, first = 0; const hits = [], used = new Set();
    Q.w.forEach((t, k) => { let bs = 0, bw = null; nm.w.forEach(w => { const s = wsc(t, w); if(s > bs){ bs = s; bw = w; } });
      if(bs < .5){ miss++; return; } sum += bs; hits.push([t, bw, bs]); used.add(bw); if(k === 0 && bw === nm.w[0]) first = .03; });
    if(Q.w.length && !(miss && (Q.w.length < 3 || miss > 1))){
      const avg = sum / Q.w.length, cover = used.size / nm.w.length;
      best = { q: Math.min(.99, avg * (1 - .25 * miss) * (.8 + .2 * cover) + first), how: 'w', hits };
    }
    // the letters without spaces: "benchpr" → "bench press", "pecduck" → "pec deck"
    if(Q.c.length >= 4 && Q.c[0] === nm.c[0]){
      let cq = 0, cl = 0;
      if(nm.c.startsWith(Q.c)){ cq = .92 * (.85 + .15 * Q.c.length / nm.c.length); cl = Q.c.length; }
      else { const al = Q.c.length >= 9 ? 2 : Q.c.length >= 5 ? 1 : 0;
        if(al && Search.dist(Q.c, nm.c, al) <= al){ cq = .84; cl = -1; }
        else if(Q.c.length >= 5 && nm.c.length > Q.c.length && Search.dist(Q.c, nm.c.slice(0, Q.c.length), 1) <= 1){ cq = .7; cl = -2; } }
      if(cq > best.q) best = { q: cq, how: 'c', cl };
    }
    return best;
  }

  // ---------- which letters to show in bold ----------
  function ranges(Q, nm, m){
    if(!m || !m.q) return [];
    const out = [];
    if(m.how === 'c'){
      const n = m.exact || m.cl > 0 ? Math.min(m.exact ? nm.c.length : m.cl, nm.cmap.length) : m.cl === -2 ? Math.min(Q.c.length, nm.cmap.length) : nm.cmap.length;
      const ws = new Set(); for(let i = 0; i < n; i++) ws.add(nm.cmap[i][1]);
      if(m.exact || m.cl > 0){ for(let i = 0; i < n; i++){ const p = nm.cmap[i][0]; out.push([p, p + 1]); } }
      else ws.forEach(w => out.push([w.a, w.b]));
    } else if(m.how === 'w' && m.hits){
      m.hits.forEach(([t, w, s]) => out.push(s < 1 && w.n.startsWith(t.n) ? [w.a, w.a + Math.min(t.n.length, w.b - w.a)] : [w.a, w.b]));
    } else nm.w.forEach(w => out.push([w.a, w.b]));
    out.sort((a, b) => a[0] - b[0]); const mg = [];
    out.forEach(r => { const l = mg[mg.length - 1]; if(l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else mg.push(r.slice()); });
    return mg;
  }
  const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function mark(text, rs){
    text = String(text || ''); if(!rs || !rs.length) return escH(text);
    let h = '', at = 0; rs.forEach(([a, b]) => { if(a < at) a = at; if(b <= a) return; h += escH(text.slice(at, a)) + '<em class="exm">' + escH(text.slice(a, b)) + '</em>'; at = b; });
    return h + escH(text.slice(at));
  }

  // ---------- habits: what you train often and lately goes first among equals ----------
  let habAt = 0, habOf = null, hab = {};
  function habits(sessions){
    if(habOf === sessions && Date.now() - habAt < 6e4) return hab;
    const now = Date.now(), h = {};
    (sessions || []).forEach(s => { const age = (now - new Date(s.start || s.date || 0).getTime()) / 864e5; if(!(age >= 0 && age <= 120)) return;
      const w = 1 + (age <= 14 ? 1 : 0); new Set((s.exercises || []).map(e => e.exId)).forEach(id => { h[id] = (h[id] || 0) + w; }); });
    hab = h; habOf = sessions; habAt = now; return h;
  }

  // ---------- the search ----------
  function query(text, o){
    o = o || {};
    const list = o.list || [], lang = o.lang === 'el' ? 'el' : 'en', max = o.max || 60, idx = index(list), only = o.ids;
    const Q = mk(text || ''); Q.lat = Q.w.length && Q.w.every(w => latinRe.test(w.n)); Q.g = Q.lat ? canon(Q.c) : '';
    Q.w.forEach(w => { w.lat = latinRe.test(w.n); w.g = w.lat ? canon(w.n) : null; w.memo = new Map(); });
    if(!Q.c) return { items: [], dym: false };
    const H = habits(o.sessions), hit = new Map();
    const put = (e, level, reason, q, nm, m) => { const p = hit.get(e.x.id); if(p && (p.level < level || (p.level === level && p.q >= q))) return; hit.set(e.x.id, { e, level, reason, q, nm, m }); };
    const live = idx.filter(e => !only || only.has(e.x.id));
    // 1 and 2: the names
    live.forEach(e => { let b = null;
      e.names.forEach(nm => { const m = match(Q, nm); if(!m.q) return; const q = m.q * (nm.kind === 'al' ? .97 : 1); if(!b || q > b.q) b = { q, nm, m }; });
      if(b && b.m.exact) put(e, 1, 'exact', b.q, b.nm, b.m); else if(b && b.q >= .45) put(e, 2, 'close', b.q, b.nm, b.m); });
    const byQ = [...hit.values()].sort((a, b) => a.level - b.level || b.q - a.q), strong = byQ.filter(r => r.level === 1 || r.q >= .8).slice(0, 3);
    // 3: close neighbours of the best matches
    if(o.near !== false) strong.forEach(r => (NEAR[r.e.x.id] || []).forEach(id => { const e = live.find(z => z.x.id === id); if(e && !hit.has(id)) put(e, 3, 'near', r.q * .95); }));
    // 4: by muscle or equipment (every typed word is a word of the name, a muscle or the equipment, and at least one is not in the name)
    live.forEach(e => { if(hit.has(e.x.id)) return; let pct = 100, any = false;
      for(const t of Q.w){ let inName = e.names.some(nm => nm.w.some(w => wsc(t, w) >= .7)), bp = 0;
        e.extra.forEach(z => { if(z.pct > bp && wsc(t, z.w) >= .7) bp = z.pct; });
        if(bp){ any = true; pct = Math.min(pct, bp); } else if(!inName){ pct = 0; break; } }
      if(any && pct > 0) put(e, 4, 'muscle', pct / 100); });
    // 5: similar to the best match: same main muscles (the Swap sheet's muscle match), same kind of movement
    if(o.similar !== false && strong.length){
      const par = strong.slice(0, 2).map(r => r.e), sims = [];
      live.forEach(e => { if(hit.has(e.x.id)) return; let b = 0;
        par.forEach(p => { if(p.card !== e.card) return; let d = 0; for(const k in p.u) d += p.u[k] * (e.u[k] || 0); const s = d * (p.x.p === e.x.p ? 1 : .75); if(s > b) b = s; });
        if(b >= .75) sims.push([e, b]); });
      sims.sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([e, s]) => put(e, 5, 'similar', s));
    }
    let rows = [...hit.values()], dym = false;
    // nothing at all: the closest few names, as "Did You Mean"
    if(!rows.length && Q.c.length >= 3){
      const cand = [];
      live.forEach(e => { let bd = 99; e.names.forEach(nm => { const L = Math.max(2, Math.round(Q.c.length * .4));
        const d = Math.min(Search.dist(Q.c, nm.c, L), nm.c.length > Q.c.length ? Search.dist(Q.c, nm.c.slice(0, Q.c.length), L) : 99); if(d <= L && d < bd) bd = d; });
        if(bd < 99) cand.push([e, bd]); });
      cand.sort((a, b) => a[1] - b[1] || a[0].i - b[0].i).slice(0, 4).forEach(([e, d]) => put(e, 6, 'dym', 1 / (1 + d)));
      rows = [...hit.values()]; dym = rows.length > 0;
    }
    const hb = r => H[r.e.x.id] || 0, len = r => String(r.e.x[lang] || r.e.x.en || '').length;
    rows.sort((a, b) => a.level - b.level || Math.round(b.q * 10) - Math.round(a.q * 10) || hb(b) - hb(a) || b.q - a.q || len(a) - len(b) || a.e.i - b.e.i);
    const items = rows.slice(0, max).map(r => {
      const x = r.e.x, shown = r.e.names.find(nm => nm.kind === lang) || mk(x[lang] || x.en || '', lang);
      const sm = match(Q, shown), it = { id: x.id, x, level: r.level, reason: r.reason, q: r.q, ranges: r.level <= 2 ? ranges(Q, shown, sm) : [], via: null, viaRanges: [] };
      if(r.nm && r.nm !== shown && r.q > (sm.q || 0) * (r.nm.kind === 'al' ? .97 : 1) + 1e-6){ it.via = r.nm.text; it.viaRanges = ranges(Q, r.nm, r.m); }
      return it; });
    return { items, dym };
  }

  return { query, mark, greeklish, canon };
})();
