// AI in one place: which models, the key, the call, the daily use counter, and the robot bubble that lets you keep using the app.
// Food Track · Gym Buddy — today it calls Gemini with the user's own key; to run it on our own server later, change call() only.
// Callers use gemini(prompt, imageB64, onTry, signal, { quiet, best, search }) and get the parsed JSON back (or an error with .cancelled).
// best: the strongest model the key allows first (Pro before Flash; receipts). search: Gemini looks things up with Google Search (web lookups, Check My Foods).

const AI = (() => {
  const GAPI = 'https://generativelanguage.googleapis.com/v1beta/models', TIMEOUT = 30000;
  const key = () => settings.geminiKey || '';

  // Free Gemini models get overloaded, so we try every model the key can use, each for at most 30 s, until one answers.
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
  const cancelled = () => Object.assign(new Error(t('cancelled')), { cancelled: true });

  // the one network call
  async function call(prompt, imageB64, onTry, outer, opts){
    opts = opts || {};
    const parts = [{ text: prompt }]; [].concat(imageB64 || []).forEach(d => parts.push({ inline_data: { mime_type: 'image/jpeg', data: d } }));   // one photo, or several (a long receipt in parts)
    const all = await listModels();
    const chain = opts.best ? [...new Set([...bestModels(all).slice(0, 4), settings.model || DEFAULT_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest'])].slice(0, 7)
      : [...new Set([settings.model || DEFAULT_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest', ...all])].slice(0, 10);
    // Google Search can't be combined with the JSON-only answer mode, so with search the JSON is cut out of the text instead
    const gen = opts.search ? { temperature: 0 } : { responseMimeType: 'application/json', temperature: imageB64 || opts.best ? 0 : 0.6 };
    const body = JSON.stringify({ contents: [{ parts }], generationConfig: gen, ...(opts.search ? { tools: [{ google_search: {} }] } : {}) });
    let lastErr = null;
    for(let i = 0; i < chain.length; i++){
      if(outer && outer.aborted) throw cancelled();
      if(onTry) onTry(i + 1, chain.length, chain[i]);
      try{
        const r = await fetchT(`${GAPI}/${encodeURIComponent(chain[i])}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() }, body
        }, opts.best || opts.search ? 60000 : TIMEOUT, outer);
        let j = null; try{ j = await r.json(); }catch(e){}
        if(!r.ok){
          const msg = (j && j.error && j.error.message) || `HTTP ${r.status}`;
          // a bad key won't work on any model, so stop right away; everything else → next model
          if(r.status === 401 || /api key not valid|api_key_invalid|denied access/i.test(msg)) throw Object.assign(new Error(t('keyBad', { e: msg.replace(/\.\s*$/, '') })), { fatal: true });
          lastErr = new Error(msg.length > 90 ? msg.slice(0, 90) + '…' : msg); continue;
        }
        const txt = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        try{ return JSON.parse(txt.replace(/^\s*```(json)?|```\s*$/g, '').trim()); }catch(e){}
        try{ const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if(a !== -1 && b > a) return JSON.parse(txt.slice(a, b + 1)); }catch(e){}   // search answers wrap the JSON in text
        lastErr = new Error('unreadable answer'); continue;
      }catch(e){
        if(e.fatal) throw e;
        if(outer && outer.aborted) throw cancelled();
        lastErr = e && e.name === 'AbortError' ? new Error(t('timedOut')) : e;
      }
    }
    throw new Error(t('allBusy', { e: lastErr ? lastErr.message : '?' }));
  }

  // daily use counter (a gentle warning past 100)
  function count(){ const d = todayKey(); if(!ui.ai || ui.ai.d !== d) ui.ai = { d, n: 0 }; ui.ai.n++; saveUI();
    const n = ui.ai.n; if(n === 100 || (n > 100 && n % 25 === 0)) setTimeout(() => toast(t('aiMany', { n })), 400); }

  // 0.7.1 robot bubble: the window that asked closes while the AI works; tap the bubble when it's ready to bring it back with the answer.
  // Chef robot = food jobs, the same robot with a lime sweatband = gym jobs (opts.robot, else Gym Buddy pages). Drawings from the "Robots and anatomy" canvas (v2).
  const B = { jobs: 0, was: [], pending: [], closed: [], ctls: [], defer: false, show: [], robot: 'chef' };
  const ROBOT_DEFS = '<g id="rEars"><rect x="9" y="84" width="11" height="22" rx="5" fill="#cfd3d7" stroke="#0f1113" stroke-width="4"/><rect x="100" y="84" width="11" height="22" rx="5" fill="#cfd3d7" stroke="#0f1113" stroke-width="4"/></g>'
    + '<g id="rChefBase"><use href="#rEars"/><rect x="18" y="62" width="84" height="72" rx="30" fill="#eef0f2" stroke="#0f1113" stroke-width="4"/>'
    + '<path d="M31 51 C15 50 10 30 24 23 C21 6 41 -4 54 6 C61 -5 81 -4 86 8 C101 4 112 22 101 35 C108 44 100 53 89 51 Z" fill="#ffffff" stroke="#0f1113" stroke-width="4" stroke-linejoin="round"/>'
    + '<path d="M44 30 Q47 38 45 46 M60 24 Q62 34 60 46 M76 30 Q73 38 75 46" fill="none" stroke="#0f1113" stroke-width="2.5" stroke-linecap="round" opacity=".28"/>'
    + '<rect x="29" y="45" width="62" height="21" rx="5" fill="#ffffff" stroke="#0f1113" stroke-width="4"/>'
    + '<path d="M39.5 49 V62 M49.5 49 V62 M60 49 V62 M70.5 49 V62 M80.5 49 V62" stroke="#0f1113" stroke-width="2.5" stroke-linecap="round" opacity=".35"/></g>'
    + '<clipPath id="rHeadClip"><rect x="18" y="62" width="84" height="72" rx="30"/></clipPath>'
    + '<g id="rGymBase"><line x1="60" y1="62" x2="60" y2="44" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="39" r="6.5" fill="#c6f432" stroke="#0f1113" stroke-width="4"/>'
    + '<use href="#rEars"/><rect x="18" y="62" width="84" height="72" rx="30" fill="#eef0f2"/>'
    + '<g clip-path="url(#rHeadClip)"><rect x="10" y="71" width="100" height="15" fill="#c6f432"/><line x1="10" y1="71" x2="110" y2="71" stroke="#0f1113" stroke-width="3.5"/><line x1="10" y1="86" x2="110" y2="86" stroke="#0f1113" stroke-width="3.5"/>'
    + '<path d="M27 78.5 H40 M80 78.5 H93" stroke="#0f1113" stroke-width="2.5" stroke-linecap="round" opacity=".4"/></g>'
    + '<rect x="18" y="62" width="84" height="72" rx="30" fill="none" stroke="#0f1113" stroke-width="4"/>'
    + '<path d="M109 56 C104 63 104 68 109 69.5 C114 68 114 63 109 56 Z" fill="#5aa9f0" stroke="#0f1113" stroke-width="3" stroke-linejoin="round"/></g>'
    + '<g id="rTourBase"><line x1="60" y1="62" x2="60" y2="44" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="39" r="6.5" fill="#c6f432" stroke="#0f1113" stroke-width="4"/><use href="#rEars"/><rect x="18" y="62" width="84" height="72" rx="30" fill="#eef0f2" stroke="#0f1113" stroke-width="4"/></g>'
    + '<g id="rClerkBase"><line x1="60" y1="46" x2="60" y2="30" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="24" r="6.5" fill="#c6f432" stroke="#0f1113" stroke-width="4"/><use href="#rEars"/><rect x="18" y="62" width="84" height="72" rx="30" fill="#eef0f2" stroke="#0f1113" stroke-width="4"/>'
    + '<path d="M26 71 L31 49 Q60 38 89 49 L94 71 Z" fill="#ffffff" fill-opacity=".35" stroke="#0f1113" stroke-width="4" stroke-linejoin="round"/><path d="M60 42 V63" stroke="#0f1113" stroke-width="2.5" stroke-linecap="round" opacity=".3"/>'
    + '<rect x="22" y="62" width="76" height="12" rx="4" fill="#59d38c" fill-opacity=".9" stroke="#0f1113" stroke-width="4"/>'
    + '<g transform="rotate(6 30 128)"><rect x="16" y="119" width="28" height="17" rx="4.5" fill="#ffffff" stroke="#0f1113" stroke-width="3.5"/><rect x="20.5" y="123.5" width="12" height="3" rx="1.5" fill="#0f1113" opacity=".55"/><rect x="20.5" y="129" width="19" height="3.5" rx="1.5" fill="#c6f432"/></g></g>'
    + '<g id="rFaceIdle"><ellipse cx="44" cy="100" rx="10" ry="12.5" fill="#0f1113"/><ellipse cx="76" cy="100" rx="10" ry="12.5" fill="#0f1113"/><circle cx="47.5" cy="94.5" r="3.4" fill="#ffffff"/><circle cx="79.5" cy="94.5" r="3.4" fill="#ffffff"/>'
    + '<path d="M53 117 Q60 124 67 117" fill="none" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/></g>'
    + '<g id="rFaceX"><path d="M37 93 L51 107 M51 93 L37 107 M69 93 L83 107 M83 93 L69 107" stroke="#0f1113" stroke-width="5.5" stroke-linecap="round"/>'
    + '<path d="M53 120 Q60 115 67 120" fill="none" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/></g>';
  // 0.7.3 thinking face, drawn inline so CSS can move its parts: the eyes glide up-left ↔ up-right, the glints lead the look and the mouth tilts one way, then the other (in step with the sway)
  const FACE_T = '<g class="rft"><g class="reye"><ellipse cx="44" cy="100" rx="10" ry="12.5" fill="#0f1113"/><ellipse cx="76" cy="100" rx="10" ry="12.5" fill="#0f1113"/>'
    + '<g class="rgl"><circle cx="44" cy="93.5" r="3.4" fill="#ffffff"/><circle cx="76" cy="93.5" r="3.4" fill="#ffffff"/></g></g>'
    + '<path class="rmo" d="M53 117.75 Q60 118.6 67 117.75" fill="none" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/></g>';
  // 0.7.4.3 idle face drawn inline (same as #rFaceIdle) so the eyes (.rlook) can glance toward a tap on the screen
  const FACE_I = '<g class="rfi0"><g class="rlook"><ellipse cx="44" cy="100" rx="10" ry="12.5" fill="#0f1113"/><ellipse cx="76" cy="100" rx="10" ry="12.5" fill="#0f1113"/><circle cx="47.5" cy="94.5" r="3.4" fill="#ffffff"/><circle cx="79.5" cy="94.5" r="3.4" fill="#ffffff"/></g>'
    + '<path d="M53 117 Q60 124 67 117" fill="none" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/></g>';
  // robot bubbles: tap anywhere and the eyes glance that way (a small, smooth move), then drift back to the middle; off with Reduce Motion
  document.addEventListener('pointerdown', e => {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.aibub .rlook').forEach(g => { const b = g.closest('.aibub'); if(b.contains(e.target) || b.classList.contains('drag')) return;
      const r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 140);
      g.style.transition = 'transform .28s cubic-bezier(.2,.8,.3,1)'; g.style.transform = `translate(${(dx / d * 5 * k).toFixed(2)}px,${(dy / d * 4 * k).toFixed(2)}px)`;
      clearTimeout(g._t); g._t = setTimeout(() => { g.style.transition = 'transform .8s ease-in-out'; g.style.transform = ''; }, 1100); });
  }, { capture: true, passive: true });
  function robotDefs(){ if($('rRobotDefs')) return; const d = document.createElement('div'); d.id = 'rRobotDefs';
    d.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${ROBOT_DEFS}</defs></svg>`; document.body.appendChild(d); }
  // the robot as an <svg>: kind 'chef' | 'gym' | 'fridge' | 'tour'; think = gliding eyes + sway (Reduce Motion shows the idle face); every robot also carries the X-eyes face for the trash drag
  function robot(kind, size, think){ robotDefs(); const base = { gym: 'rGymBase', fridge: 'rClerkBase', tour: 'rTourBase' }[kind] || 'rChefBase', w = size || 40, h = Math.round(w * 146 / 120);
    const face = (think ? FACE_T + '<use class="rfi" href="#rFaceIdle"/>' : FACE_I) + '<use class="rfx" href="#rFaceX"/>';
    return `<svg class="robot" width="${w}" height="${h}" viewBox="0 -6 120 146" aria-hidden="true"><g${think ? ' class="rtilt"' : ''}><use href="#${base}"/>${face}</g></svg>`; }
  const OK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function bubble(st){ let b = $('aiBub');
    if(st === 'hide'){ if(b) b.remove(); bubTrash(false); return; }
    if(!b){ b = document.createElement('button'); b.id = 'aiBub'; b.type = 'button'; b.className = 'aibub'; document.body.appendChild(b);
      b.addEventListener('click', () => { if(b._dragged){ b._dragged = false; return; }
        if(b.classList.contains('ready')){ const ids = B.show; bubble('hide'); ids.forEach(id => { if($(id) && !$(id).classList.contains('open')) open(id); }); } else toast(t('aiStill')); });
      drag(b, () => { if(B.jobs){ B.drop = true; B.ctls.forEach(c => c.abort()); } B.show = []; bubble('hide'); }, 'aiBub'); }
    const run = st === 'run';
    b.className = 'aibub ' + st + ' r' + B.robot;
    b.innerHTML = (run ? '<span class="rglow"></span>' : '') + `<span class="rcore">${robot(B.robot, 40, run)}</span>` + (run ? '' : `<b class="rok">${OK_SVG}</b>`);
    b.setAttribute('aria-label', run ? t('aiThinking') : t('aiReady')); if(st === 'ready') Phone.haptic(); }

  // 0.7.3: any robot bubble can be dragged up and down; let go and it snaps to the nearest side (left / right edge) and remembers the spot (ui[key]).
  // Dragging shows a faint trash circle at the bottom centre: over it the bubble glows red and the robot's eyes turn to X's; let go there and onGone() runs.
  const EDGE = 14, BSZ = 64, rmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function bubTrash(on){ let tr = $('aiTrash');
    if(!tr){ if(!on) return; tr = document.createElement('div'); tr.id = 'aiTrash'; tr.className = 'aitrash'; tr.setAttribute('aria-hidden', 'true');
      tr.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M18 7l-.9 12.1a2 2 0 0 1-2 1.9H8.9a2 2 0 0 1-2-1.9L6 7M10 11v6M14 11v6"/></svg>';
      document.body.appendChild(tr); tr.getBoundingClientRect(); }
    tr.classList.toggle('show', on); if(!on) tr.classList.remove('hot'); return tr; }
  function bubLimits(){ const H = innerHeight, hd = document.querySelector('section.page:not(.hide)>header'), rail = $('rail');
    const top = (hd ? hd.getBoundingClientRect().bottom : 60) + 6, rt = rail && rail.getClientRects().length ? rail.getBoundingClientRect().top : H - 24;
    return { top, bot: Math.max(top, rt - BSZ - 12) }; }
  function place(el, key){ const p = typeof ui !== 'undefined' && ui[key]; if(!p){ ['left', 'top', 'right', 'bottom'].forEach(k => el.style.removeProperty(k)); return; }
    const L = bubLimits(), y = Math.min(L.bot, Math.max(L.top, p.y * innerHeight));
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.top = y + 'px'; el.style.left = (p.s === 'l' ? EDGE : innerWidth - BSZ - EDGE) + 'px'; }
  // 0.7.9.1: on the shared drag helper (ui.js dragger): the bubble follows the finger 1:1 as a transform (its left/top stay put while
  // moving), rubber-bands past the screen edges, then springs to its side carrying the finger's speed. Dropped on the trash: it shrinks
  // and fades into the circle, the circle closes, then onGone() runs (the coach pill rises back, coach.js).
  function drag(el, onGone, key){ let base = null, tc = null, tr = null, hot = false;
    place(el, key); addEventListener('resize', () => { if(el.isConnected && !el._home) place(el, key); });
    const pos = s => { const W = innerWidth - el.offsetWidth, H = innerHeight - el.offsetWidth, L = base.x + s.ox + s.dx, T = base.y + s.oy + s.dy;   // where the finger puts it, edges rubber-banded
      const x = L < 0 ? rubber(L, 80) : L > W ? W + rubber(L - W, 80) : L, y = T < 0 ? rubber(T, 80) : T > H ? H + rubber(T - H, 80) : T;
      return { x: x - base.x, y: y - base.y }; };
    dragger(el, { slop: 8,
      item: () => el._home || el.classList.contains('pre') || el.classList.contains('gone') ? null : el,
      start: s => { const r = el.getBoundingClientRect(); el.getAnimations().forEach(a => a.cancel());
        base = { x: el.offsetLeft, y: el.offsetTop }; s.ox = r.left - base.x; s.oy = r.top - base.y;   // a glide still under way carries on from where it is
        el.style.transition = 'none'; el.style.willChange = 'transform'; el.classList.add('drag'); tr = bubTrash(true); hot = false;
        const t = tr.getBoundingClientRect(); tc = { x: t.left + t.width / 2, y: t.top + t.height / 2 }; },
      move: s => { const p = pos(s), w = el.offsetWidth; el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
        const h = Math.hypot(base.x + p.x + w / 2 - tc.x, base.y + p.y + w / 2 - tc.y) < 56;
        if(h !== hot){ hot = h; el.classList.toggle('kill', h); tr.classList.toggle('hot', h); if(h) Phone.haptic(); } },
      end: (s, ok) => { const p = pos(s), w = el.offsetWidth; el.classList.remove('drag'); el.style.willChange = '';
        el._dragged = true; setTimeout(() => { el._dragged = false; }, 60);
        if(hot && ok){ el.classList.add('gone'); Phone.haptic(); tr.classList.remove('hot');
          const to = { x: tc.x - w / 2 - base.x, y: tc.y - w / 2 - base.y, s: .25 };
          springTo(el, { x: p.x, y: p.y }, to, null, { k: 320, damp: 1, fill: 'forwards', op: [1, 0] });
          setTimeout(() => bubTrash(false), rmo() ? 0 : 200); setTimeout(onGone, rmo() ? 0 : 380); return; }   // into the bin, the bin closes, then the pill comes back
        bubTrash(false); el.classList.remove('kill');
        const L = bubLimits(), side = base.x + p.x + w / 2 < innerWidth / 2 ? 'l' : 'r', y = Math.min(L.bot, Math.max(L.top, base.y + p.y));
        if(typeof ui !== 'undefined'){ ui[key] = { s: side, y: y / innerHeight }; saveUI(); }
        const from = { x: base.x + p.x, y: base.y + p.y }; el.style.transform = ''; place(el, key);   // its new spot, in one layout change...
        const nb = { x: el.offsetLeft, y: el.offsetTop };
        springTo(el, { x: from.x - nb.x, y: from.y - nb.y }, { x: 0, y: 0 }, { x: s.vx, y: s.vy }, { damp: .8 })   // ...and the spring carries it there from under the finger
          .finished.then(() => { el.style.transition = ''; }, () => {}); } });
  }

  // the "AI" pill that replaces ✨ on AI buttons; label() turns a '✨ Text' string into 'Text <AI>' (html = the string is already markup)
  const badge = () => '<span class="aibadge">AI</span>';
  // 0.7.9.1 one rule: a control that OPENS A CHAT shows that helper's face (chef = Food Coach, gym = Gym Coach, fridge = Kitchen); a one-tap AI job keeps badge()
  const face = (kind, size) => `<span class="aiface" aria-hidden="true">${robot(kind, size || 20)}</span>`;
  function label(s, html){ s = String(s ?? ''); if(!s.includes('✨')) return html ? s : esc(s);
    const plain = s.replace(/✨\s?/g, '').trim(); if(!html) return `${esc(plain)} ${badge()}`;
    const i = plain.indexOf('<'); return i > 0 ? `${plain.slice(0, i).trim()} ${badge()}${plain.slice(i)}` : `${plain} ${badge()}`; }

  // Food Preferences (profile.foodPrefs) as one rule for every prompt that suggests food; '' when nothing is set
  function dietRules(){
    const fp = (typeof profile !== 'undefined' && profile.foodPrefs) || {}, extra = s => String(s || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
    const al = [...(fp.allergies || []).map(k => t('fpA_' + k)), ...extra(fp.allergyText)], av = [...(fp.avoid || []).map(k => t('fpD_' + k)), ...extra(fp.avoidText)];
    if(!al.length && !av.length) return '';
    return '\nFood rules (strict, never break them): ' + (al.length ? `the user is ALLERGIC to: ${al.join(', ')}; never suggest or include these or anything made with them. ` : '') + (av.length ? `The user does not eat / avoids: ${av.join(', ')}; never suggest or include these.` : '');
  }

  // 0.7.9 what the app has learned from the user's own logs (js/know.js, rebuilt once a day on the phone), for coach and suggestion prompts.
  // topic 'food' | 'gym': that part in full, the other in one line; '' when nothing is learned yet. Never shown on screen.
  function knows(topic){
    const k = Store.load('aiKnow', null); if(!k) return '';
    const parts = [k.body, topic === 'gym' ? k.gym : k.food, topic === 'gym' ? k.foodShort : k.gymShort].filter(Boolean);
    if(!parts.length) return '';
    return '\nWhat the app has learned about this user from their own logs (use it quietly so suggestions fit them; do not list it back or ask about what it already says; what they ask for now comes first): ' + parts.join(' ');
  }

  async function ask(prompt, img, onTry, outer, opts){
    count();
    if(opts && opts.quiet) return call(prompt, img, onTry, outer, opts);   // background jobs (recovery check) stay invisible
    const ctl = new AbortController(); if(outer){ if(outer.aborted) ctl.abort(); else outer.addEventListener('abort', () => ctl.abort()); }
    if(!B.jobs){ B.drop = false; B.was = [...document.querySelectorAll('.overlay.open')].map(o => o.id).filter(id => id !== 'ovAsk'); B.pending = []; B.closed = []; B.was.forEach(id => close(id)); toast(t('aiBg')); }
    B.robot = (opts && opts.robot) || (location.hash.startsWith('#gym') ? 'gym' : 'chef');
    B.jobs++; B.ctls.push(ctl); bubble('run'); let ok = false;
    try{ const r = await call(prompt, img, onTry, ctl.signal, opts); ok = true; return r; }
    finally{ B.jobs--; B.ctls = B.ctls.filter(c => c !== ctl);
      if(!B.jobs){ B.defer = true; setTimeout(() => { B.defer = false;
        if(!ok || B.drop){ bubble('hide'); if(B.drop){ B.drop = false; return; } B.was.forEach(id => { if($(id) && !$(id).classList.contains('open')) open(id); }); return; }   // failed or cancelled: put things back
        B.show = [...new Set([...B.was.filter(id => !B.closed.includes(id)), ...B.pending])];
        if(!B.show.length){ bubble('hide'); return; } bubble('ready'); }, 0); } }
  }

  // Settings → Test key: how many Gemini models this key can use (saves the key if it works)
  async function testKey(k){
    const r = await fetchT(`${GAPI}?pageSize=200`, { headers: { 'x-goog-api-key': k } }, 12000);
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `HTTP ${r.status}`);
    if(k !== settings.geminiKey){ settings.geminiKey = k; Store.save('settings', settings); Store.save('models', null); aiGate(); }
    return (j.models || []).filter(m => /^models\/gemini/.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent')).length;
  }

  return {
    ask, dietRules, knows, hasKey: () => !!key(), listModels, bestModels, testKey, busy: () => B.jobs > 0, robot, badge, face, label, drag,
    // while an answer is landing, windows it opens wait behind the bubble (called by open/close)
    holdOpen(id){ if(!B.defer) return false; B.pending.push(id); return true; },
    noteClose(id){ if(B.defer) B.closed.push(id); },
  };
})();

const gemini = AI.ask;

// photos for the AI: at most 1600 px, JPEG (receipts: up to 3072 px at high quality, so small print stays sharp)
function shrink(file, max, q){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, (max || 1600) / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q || 0.85).split(',')[1]); };
    img.onerror = () => rej(new Error('photo')); img.src = url;
  });
}
