// ---------- 0.7.4.3 Coach chat: ONE chat window that Food Coach (chef robot) and Gym Coach (sweatband robot) share ----------
// Looks like the Claude app's chat: a big round box pinned at the bottom that grows with the text, a round accent send button,
// your messages as bubbles on the right, the robot's answers as plain text on the left with its small face, results as cards.
// Back (the arrow, the phone's back or a left-to-right swipe) shrinks the chat into that robot's bubble; tap the bubble to carry on.
//
// Other parts use it like this:
//   Coach.setup(id, { kind, title, first, placeholder, camera, send })   once, to say how that coach answers (all optional)
//     kind  'chef' | 'gym' (the robot; ids starting with 'gym' default to the gym robot)
//     title / first / placeholder   text or a function returning text (the window title, the opening message, the box hint)
//     camera   true → a big camera button inside the chat box; the photo comes to send() as img (base64 JPEG)
//     send(text, chat, img)   answers one message; without it the coach just talks (a short AI conversation)
//   Coach.open(id, first)     opens that chat, or reopens it where you left it; first = the opening message (optional)
//   Coach.minimize(id)        puts that chat on screen as its robot bubble without opening it
//   Coach.dismiss(id)         ends that chat (its bubble goes, the coach pill comes back)
//   Coach.has(id)             true while that chat's bubble is on screen
// The chat object given to send():
//   chat.say(text)            the robot answers with plain text
//   chat.cards(list)          the robot answers with result cards; returns the cards so you can change them later
//   chat.update(card, patch)  change a card (e.g. { done: 'Added', dim: false }) and redraw it
//   chat.status(text)         changes the robot's "working" line while it thinks: Thinking… / Searching your foods… / Searching the web… / Reading the photo… (t('coachSt…'))
//   chat.ask(prompt, img, o)  the AI call for this chat (gemini, quiet: the chat shows its own typing dots; Back cancels nothing)
//   chat.transcript()         the last few messages as plain lines, to put in a prompt (kept short to save AI use)
//   chat.history()            the same as a list: [{ who: 'me' | 'bot', text }]
// A card: { title, sub, tag, tagKind, body (html), dim (greyed until added), actions: [{ label, primary, run(card, chat) }], done (text once handled), undo() }
const Coach = (() => {
  const CH = {}, CFG = {}, KEEP = 8, CUT = 280;   // the AI only ever sees the last KEEP messages, each cut to CUT letters
  let cur = null, shrinking = false;
  const val = v => typeof v === 'function' ? v() : v;
  const rmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const kindOf = id => (CFG[id] && CFG[id].kind) || (/^gym/.test(id) ? 'gym' : 'chef');
  const cfg = id => CFG[id] || {};
  const title = id => val(cfg(id).title) || t(kindOf(id) === 'gym' ? 'coachGym' : 'coachFood');
  const firstMsg = id => val(cfg(id).first) || t(kindOf(id) === 'gym' ? 'coachGymHi' : 'coachFoodHi');
  const chat = id => CH[id] || (CH[id] = { id, msgs: [], ctl: null, draft: '', img: null });
  const has = id => !!$('cb-' + id);

  // ---- the chat object handed to send() ----
  function api(c){
    const push = m => { c.msgs.push(m); draw(); return m; };
    return {
      id: c.id,
      say: text => { push({ who: 'bot', text: String(text || '') }); },
      cards: list => { const cs = (list || []).map(x => ({ ...x, cid: uid() })); push({ who: 'bot', cards: cs }); return cs; },
      status: text => { const w = c.work; if(!w) return; w.status = String(text || ''); const el = cur === c.id && document.querySelector('#coachList .cwork .cst'); if(el) el.textContent = w.status; },
      update(card, patch){ Object.assign(card, patch || {}); draw(); },
      ask: (prompt, img, o) => { c.ctl = c.ctl || new AbortController(); return gemini(prompt, img, null, c.ctl.signal, { quiet: true, ...(o || {}) }); },
      history: () => hist(c),
      transcript: () => hist(c).map(h => `${h.who === 'me' ? 'User' : 'Coach'}: ${h.text}`).join('\n'),
    };
  }
  function hist(c){
    return c.msgs.filter(m => !m.work).slice(-KEEP).map(m => ({ who: m.who, text: (m.text || (m.cards || []).map(x => [x.title, x.sub].filter(Boolean).join(' · ')).join('; ') || (m.img ? '[photo]' : '')).slice(0, CUT) }));
  }

  // without a send() of its own: a short, friendly AI conversation in the coach's role
  async function talk(text, ch, img){
    const gym = kindOf(ch.id) === 'gym';
    const role = gym ? 'You are Gym Coach, a friendly, practical strength coach inside a workout-tracking app.' : 'You are Food Coach, a friendly, practical nutrition coach inside a food-tracking app for someone who lifts weights.';
    const r = await ch.ask(`${role} Answer the user's last message in ${lang === 'el' ? 'Greek' : 'English'}, briefly (at most 120 words), plain text with no markdown.${AI.dietRules()}
Conversation so far:
${ch.transcript()}
${img ? 'The user also sent the attached photo.' : ''}
Return ONLY JSON: {"reply": string}`, img);
    ch.say((r && r.reply) || t('coachFail', { e: '?' }));
  }

  // ---- drawing ----
  const face = (k, s) => `<span class="cav" aria-hidden="true">${AI.robot(k, s || 26)}</span>`;
  function cardHtml(x){
    const tag = x.tag ? ` <span class="ctag ${esc(x.tagKind || '')}">${esc(x.tag)}</span>` : '';
    const acts = x.done ? `<div class="ccdone">${svgIcon('check', 16, 2.6)}<span>${esc(x.done)}</span>${x.undo ? `<button type="button" class="ccundo" data-cundo>${t('undo')}</button>` : ''}</div>`
      : (x.actions || []).length ? `<div class="ccacts">${x.actions.map((a, i) => `<button type="button" class="ccbtn${a.primary ? ' pri' : ''}" data-ca="${i}">${esc(a.label)}</button>`).join('')}</div>` : '';
    return `<div class="ccard${x.dim && !x.done ? ' dim' : ''}${x.done ? ' done' : ''}" data-cid="${x.cid}">
      ${x.title || x.sub ? `<div class="cchead"><b>${esc(x.title || '')}${tag}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</div>` : ''}${x.body || ''}${acts}</div>`;
  }
  function msgHtml(m, prev, k){
    if(m.who === 'me') return `<div class="cmsg me"><div class="cme">${m.img ? `<img class="cimg" src="data:image/jpeg;base64,${m.img}" alt="">` : ''}${m.text ? `<span>${esc(m.text)}</span>` : ''}</div></div>`;
    const lead = !prev || prev.who !== 'bot' ? face(k) : '<span class="cav"></span>';
    if(m.work) return `<div class="cmsg bot"><span class="cav" aria-hidden="true">${AI.robot(k, 26, true)}</span><div class="ctext cwork" role="status"><span class="cst">${esc(m.status || t('aiThinking'))}</span></div></div>`;
    if(m.cards) return `<div class="cmsg bot">${lead}<div class="ccards">${m.cards.map(cardHtml).join('')}</div></div>`;
    return `<div class="cmsg bot">${lead}<div class="ctext">${esc(m.text)}</div></div>`;
  }
  function draw(){
    if(!cur) return; const c = CH[cur], el = $('coachList'); if(!c || !el) return;
    const k = kindOf(cur), stick = el.scrollHeight - el.scrollTop - el.clientHeight < 80 || !el.childElementCount;
    el.innerHTML = c.msgs.map((m, i) => msgHtml(m, c.msgs[i - 1], k)).join('');
    if(stick) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }
  function head(){ const k = kindOf(cur); $('coachT').textContent = title(cur); $('coachFace').innerHTML = AI.robot(k, 28);
    const f = cfg(cur), ph = val(f.placeholder) || t('coachPh'); $('coachIn').placeholder = ph; $('coachIn').setAttribute('aria-label', ph);
    $('coachCam').classList.toggle('hide', !f.camera); $('coachForm').classList.toggle('cam', !!f.camera); }

  // ---- the box: grows with the text up to about 6 lines; send is dimmed until there is something to send ----
  function grow(){ const ta = $('coachIn'); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 6 * 21 + 22) + 'px';
    $('coachSend').disabled = !ta.value.trim() && !(cur && CH[cur] && CH[cur].img); }
  function fit(){ const ov = $('ovCoach'), vv = window.visualViewport; if(!ov || !vv) return;   // the box stays above the keyboard
    ov.style.setProperty('--cvh', vv.height + 'px'); ov.style.setProperty('--cvt', vv.offsetTop + 'px'); ov.classList.toggle('kb', vv.height < window.innerHeight * .8); }
  function preview(){ const c = cur && CH[cur], p = $('coachPrev');
    p.innerHTML = c && c.img ? `<span class="cpimg"><img src="data:image/jpeg;base64,${c.img}" alt=""><button type="button" data-cpx aria-label="${esc(t('remove'))}">${svgIcon('x', 14, 2.6)}</button></span>` : '';
    p.classList.toggle('hide', !(c && c.img)); grow(); }

  async function send(){
    if(!cur) return; const id = cur, c = CH[id], ta = $('coachIn'), text = ta.value.trim(), img = c.img;
    if(!text && !img) return;
    if(c.busy){ toast(t('aiStill')); return; }
    ta.value = ''; c.draft = ''; c.img = null; preview();
    c.msgs.push({ who: 'me', text, img }); const w = { who: 'bot', work: true, status: t(img ? 'coachStPhoto' : 'aiThinking') }; c.work = w; c.msgs.push(w); c.busy = true; draw();
    const ch = api(c), f = cfg(id);
    try{ await (f.send || talk)(text, ch, img); }
    catch(err){ if(!(err && err.cancelled)) ch.say(t('coachFail', { e: (err && err.message) || '?' })); }
    finally{ c.busy = false; c.ctl = null; c.work = null; const i = c.msgs.indexOf(w); if(i > -1) c.msgs.splice(i, 1);
      if(cur === id) draw(); else { const b = $('cb-' + id); if(b) b.classList.add('new'); } }   // answered while shrunk: a dot on the bubble
  }

  // ---- open / shrink into the bubble / dismiss ----
  function open_(id, first){
    const c = chat(id);
    if(!c.msgs.length || (first && c.msgs.length === 1 && c.msgs[0].first)) c.msgs = [{ who: 'bot', text: first || firstMsg(id), first: true }];
    const b = $('cb-' + id); if(b) b.remove();
    const ov = $('ovCoach'); clearTimeout(ov._sk); ov.classList.remove('shrink');
    if(cur && cur !== id) keep();
    cur = id; head(); $('coachIn').value = c.draft || ''; preview(); draw();
    open('ovCoach'); fit(); pillSync();
    requestAnimationFrame(() => { const el = $('coachList'); el.scrollTop = el.scrollHeight; });
  }
  function keep(){ const c = cur && CH[cur]; if(c) c.draft = $('coachIn').value; }
  // close() calls this whenever the chat window closes (Back, the phone's back, the edge swipe, opening Settings…): the chat becomes its bubble
  function closed(){ if(!cur) return; const id = cur, ov = $('ovCoach'); keep(); cur = null; shrinking = false; clearTimeout(ov._sk); ov._sk = setTimeout(() => ov.classList.remove('shrink'), 260); bubble(id); pillSync(); }
  function minimize(id){
    if(id && id !== cur){ chat(id); if(!CH[id].msgs.length) CH[id].msgs = [{ who: 'bot', text: firstMsg(id), first: true }]; bubble(id); pillSync(); return; }
    if(!cur || shrinking) return;
    const ov = $('ovCoach'), sh = ov.querySelector('.sheet');
    if(rmo()){ close('ovCoach'); return; }
    // shrink toward where the bubble will sit
    const b = bubble(cur); b.classList.add('pre'); const r = b.getBoundingClientRect(), s = sh.getBoundingClientRect();
    sh.style.transformOrigin = `${r.left + r.width / 2 - s.left}px ${r.top + r.height / 2 - s.top}px`;
    shrinking = true; ov.classList.add('shrink'); Phone.haptic();
    setTimeout(() => { sh.style.transformOrigin = ''; if(shrinking) close('ovCoach'); b.classList.remove('pre'); }, 240);
  }
  function bubble(id){
    let b = $('cb-' + id); if(b) return b; const k = kindOf(id);
    b = document.createElement('button'); b.type = 'button'; b.id = 'cb-' + id; b.className = 'aibub coachbub r' + k; b.dataset.coach = id;
    b.innerHTML = `<span class="rcore">${AI.robot(k, 40)}</span>`; b.setAttribute('aria-label', t('coachBubA', { n: title(id) }));
    document.body.appendChild(b);
    b.addEventListener('click', () => { if(b._dragged){ b._dragged = false; return; } Phone.haptic(); open_(id); });
    AI.drag(b, () => dismiss(id), 'coachBub_' + id);
    return b;
  }
  function dismiss(id){
    const c = CH[id]; if(c && c.ctl) c.ctl.abort(); delete CH[id];
    const b = $('cb-' + id); if(b) b.remove();
    if(cur === id){ cur = null; close('ovCoach'); }
    pillSync();
  }

  // ---- the coach pills beside the main button (Food Coach next to Log Food, Gym Coach next to Create a Workout) ----
  // the pills show the robot's face instead of the AI badge: a robot face means a chat, the AI badge means a one-tap AI action
  const PILLS = [['chef', 'today'], ['gym', 'gymlib']];   // [chat id, the main button's data-action it sits beside]
  function pills(){ PILLS.forEach(([id]) => { if($('cp-' + id)) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'cp-' + id; b.className = 'coachpill hide'; b.dataset.coachPill = id;
    b.innerHTML = `<span class="cpface" aria-hidden="true">${AI.robot(kindOf(id), 24)}</span><span class="cpl"></span>`;
    b.addEventListener('click', () => { Phone.haptic(); open_(id); }); document.body.appendChild(b); }); }
  let pq = 0; const pillSync = () => { cancelAnimationFrame(pq); pq = requestAnimationFrame(pillPlace); };
  function pillPlace(){
    const f = $('fab'); if(!f) return; let shown = null;
    PILLS.forEach(([id, act]) => { const b = $('cp-' + id); if(!b) return;
      const on = !f.classList.contains('hide') && f.dataset.action === act && cur !== id && !has(id);   // while its bubble is out, the pill steps aside
      b.classList.toggle('hide', !on); if(on){ shown = b; b.querySelector('.cpl').textContent = title(id); } });
    document.body.classList.remove('has-coachpill'); if(!shown) return;
    // the main button and the pill sit centred together: the button's right edge moves in by the pill's width
    const cs = getComputedStyle(f), L = parseFloat(cs.left) || 0, R = parseFloat(cs.right) || 0, W = document.documentElement.clientWidth, cpr = R + shown.offsetWidth + 10;
    document.body.style.setProperty('--cpr', cpr + 'px'); document.body.classList.add('has-coachpill');
    const fr = f.getBoundingClientRect(), right = (L + W - cpr) / 2 + f.offsetWidth / 2;
    shown.style.left = (right + 10) + 'px'; shown.style.top = (fr.top + (fr.height - shown.offsetHeight) / 2) + 'px'; shown.style.zIndex = cs.zIndex;
  }

  // ---- wiring (called once from wire/08) ----
  function init(){
    pills(); const mo = new MutationObserver(pillSync);
    mo.observe($('fab'), { attributes: true, attributeFilter: ['class', 'data-action'], childList: true, characterData: true, subtree: true });
    addEventListener('resize', pillSync); addEventListener('hashchange', pillSync); setTimeout(pillSync, 300);
    $('coachBack').innerHTML = BACK_SVG;
    $('coachBack').addEventListener('click', () => minimize());
    $('coachForm').addEventListener('submit', e => { e.preventDefault(); send(); });
    $('coachIn').addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && !e.isComposing && !matchMedia('(pointer: coarse)').matches){ e.preventDefault(); send(); } });
    $('coachIn').addEventListener('input', grow);
    $('coachCam').innerHTML = svgIcon('camera', 24, 2);
    $('coachCam').addEventListener('click', () => { $('coachFile').value = ''; $('coachFile').click(); });
    $('coachFile').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; if(!f || !cur) return;
      try{ CH[cur].img = await shrink(f, 1600, .85); preview(); }catch(x){ toast(t('coachFail', { e: x.message })); } });
    $('coachPrev').addEventListener('click', e => { if(e.target.closest('[data-cpx]') && cur){ CH[cur].img = null; preview(); } });
    $('coachList').addEventListener('click', e => {
      const el = e.target.closest('[data-cid]'); if(!el || !cur) return; const c = CH[cur];
      const card = c.msgs.flatMap(m => m.cards || []).find(x => x.cid === el.dataset.cid); if(!card) return;
      if(e.target.closest('[data-cundo]')){ const u = card.undo; card.done = ''; card.undo = null; draw(); if(u) u(); return; }
      const a = e.target.closest('[data-ca]'); if(!a) return; const act = (card.actions || [])[+a.dataset.ca]; if(!act || !act.run) return;
      Phone.haptic(); Promise.resolve(act.run(card, api(c))).catch(err => api(c).say(t('coachFail', { e: err.message })));
    });
    // a left-to-right swipe anywhere on the chat shrinks it into the bubble (not while selecting text in the box)
    let sx = null, sy = 0, st = 0; const sh = $('ovCoach').querySelector('.sheet');
    sh.addEventListener('touchstart', e => { const p = e.touches[0]; if(e.touches.length > 1 || e.target.closest('textarea,input,.ccacts')){ sx = null; return; } sx = p.clientX; sy = p.clientY; st = Date.now(); }, { passive: true });
    sh.addEventListener('touchend', e => { if(sx === null) return; const p = e.changedTouches[0], dx = p.clientX - sx, dy = Math.abs(p.clientY - sy); sx = null;
      if(dx > 80 && dy < dx * .6 && Date.now() - st < 700) minimize(); }, { passive: true });
    if(window.visualViewport){
      visualViewport.addEventListener('resize', () => { if(!$('ovCoach').classList.contains('open')) return; fit(); const l = $('coachList'); l.scrollTop = l.scrollHeight; });
      visualViewport.addEventListener('scroll', () => { if($('ovCoach').classList.contains('open')) fit(); });
    }
  }

  return { setup(id, o){ CFG[id] = { ...(CFG[id] || {}), ...(o || {}) }; }, open: open_, minimize, dismiss, has, closed, init, pillSync, isOpen: () => !!cur };
})();
