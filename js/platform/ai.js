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
    const parts = [{ text: prompt }]; if(imageB64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageB64 } });
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
    + '<g id="rFaceIdle"><ellipse cx="44" cy="100" rx="10" ry="12.5" fill="#0f1113"/><ellipse cx="76" cy="100" rx="10" ry="12.5" fill="#0f1113"/><circle cx="47.5" cy="94.5" r="3.4" fill="#ffffff"/><circle cx="79.5" cy="94.5" r="3.4" fill="#ffffff"/>'
    + '<path d="M53 117 Q60 124 67 117" fill="none" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/></g>'
    + '<g id="rFaceA"><ellipse cx="42" cy="99" rx="10" ry="12.5" fill="#0f1113"/><ellipse cx="74" cy="99" rx="10" ry="12.5" fill="#0f1113"/><circle cx="39" cy="92.5" r="3.4" fill="#ffffff"/><circle cx="71" cy="92.5" r="3.4" fill="#ffffff"/>'
    + '<path d="M53 120 Q59 118 66 115.5" fill="none" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/></g>'
    + '<g id="rFaceB"><ellipse cx="46" cy="99" rx="10" ry="12.5" fill="#0f1113"/><ellipse cx="78" cy="99" rx="10" ry="12.5" fill="#0f1113"/><circle cx="49" cy="92.5" r="3.4" fill="#ffffff"/><circle cx="81" cy="92.5" r="3.4" fill="#ffffff"/>'
    + '<path d="M54 115.5 Q61 118 67 120" fill="none" stroke="#0f1113" stroke-width="4" stroke-linecap="round"/></g>';
  function robotDefs(){ if($('rRobotDefs')) return; const d = document.createElement('div'); d.id = 'rRobotDefs';
    d.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${ROBOT_DEFS}</defs></svg>`; document.body.appendChild(d); }
  // the robot as an <svg>: kind 'chef' | 'gym'; think = the two glancing looks + sway (Reduce Motion shows the idle face)
  function robot(kind, size, think){ robotDefs(); const base = kind === 'gym' ? 'rGymBase' : 'rChefBase', w = size || 40, h = Math.round(w * 146 / 120);
    const face = think ? '<use class="rfa" href="#rFaceA"/><use class="rfb" href="#rFaceB"/><use class="rfi" href="#rFaceIdle"/>' : '<use href="#rFaceIdle"/>';
    return `<svg class="robot" width="${w}" height="${h}" viewBox="0 -6 120 146" aria-hidden="true"><g${think ? ' class="rtilt"' : ''}><use href="#${base}"/>${face}</g></svg>`; }
  const OK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function bubble(st){ let b = $('aiBub');
    if(st === 'hide'){ if(b) b.remove(); return; }
    if(!b){ b = document.createElement('button'); b.id = 'aiBub'; b.type = 'button'; b.className = 'aibub'; document.body.appendChild(b);
      b.addEventListener('click', e => { if(e.target.closest('[data-aix]')){ B.ctls.forEach(c => c.abort()); return; }
        if(b.classList.contains('ready')){ const ids = B.show; bubble('hide'); ids.forEach(id => { if($(id) && !$(id).classList.contains('open')) open(id); }); } else toast(t('aiStill')); }); }
    const run = st === 'run';
    b.className = 'aibub ' + st + ' r' + B.robot;
    b.innerHTML = (run ? '<span class="rglow"></span>' : '') + `<span class="rcore">${robot(B.robot, 40, run)}</span>` + (run ? '<i data-aix aria-label="Cancel">✕</i>' : `<b class="rok">${OK_SVG}</b>`);
    b.setAttribute('aria-label', run ? t('aiThinking') : t('aiReady')); if(st === 'ready') haptic(); }
  // the "AI" pill that replaces ✨ on AI buttons; label() turns a '✨ Text' string into 'Text <AI>' (html = the string is already markup)
  const badge = () => '<span class="aibadge">AI</span>';
  function label(s, html){ s = String(s ?? ''); if(!s.includes('✨')) return html ? s : esc(s);
    const plain = s.replace(/✨\s?/g, '').trim(); if(!html) return `${esc(plain)} ${badge()}`;
    const i = plain.indexOf('<'); return i > 0 ? `${plain.slice(0, i).trim()} ${badge()}${plain.slice(i)}` : `${plain} ${badge()}`; }

  async function ask(prompt, img, onTry, outer, opts){
    count();
    if(opts && opts.quiet) return call(prompt, img, onTry, outer, opts);   // background jobs (recovery check) stay invisible
    const ctl = new AbortController(); if(outer){ if(outer.aborted) ctl.abort(); else outer.addEventListener('abort', () => ctl.abort()); }
    if(!B.jobs){ B.was = [...document.querySelectorAll('.overlay.open')].map(o => o.id).filter(id => id !== 'ovAsk'); B.pending = []; B.closed = []; B.was.forEach(id => close(id)); toast(t('aiBg')); }
    B.robot = opts && opts.robot === 'gym' || (!(opts && opts.robot) && location.hash.startsWith('#gym')) ? 'gym' : 'chef';
    B.jobs++; B.ctls.push(ctl); bubble('run'); let ok = false;
    try{ const r = await call(prompt, img, onTry, ctl.signal, opts); ok = true; return r; }
    finally{ B.jobs--; B.ctls = B.ctls.filter(c => c !== ctl);
      if(!B.jobs){ B.defer = true; setTimeout(() => { B.defer = false;
        if(!ok){ bubble('hide'); B.was.forEach(id => { if($(id) && !$(id).classList.contains('open')) open(id); }); return; }   // failed or cancelled: put things back
        B.show = [...new Set([...B.was.filter(id => !B.closed.includes(id)), ...B.pending])];
        if(!B.show.length){ bubble('hide'); return; } bubble('ready'); }, 0); } }
  }

  // Settings → Test key: how many Gemini models this key can use (saves the key if it works)
  async function testKey(k){
    const r = await fetchT(`${GAPI}?pageSize=200`, { headers: { 'x-goog-api-key': k } }, 12000);
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `HTTP ${r.status}`);
    if(k !== settings.geminiKey){ settings.geminiKey = k; Store.save('settings', settings); Store.save('models', null); }
    return (j.models || []).filter(m => /^models\/gemini/.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent')).length;
  }

  return {
    ask, hasKey: () => !!key(), listModels, bestModels, testKey, busy: () => B.jobs > 0, robot, badge, label,
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
