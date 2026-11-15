// ---------- 0.7.4.3 Coach chat: ONE chat window that Food Coach (chef robot) and Gym Coach (sweatband robot) share ----------
// Looks like the Claude app's chat: a big round box pinned at the bottom that grows with the text, a round accent send button,
// your messages as bubbles on the right, the robot's answers as plain text on the left with its small face, results as cards.
// 0.7.9.2: the chat is a small floating window, not a whole page. Tapping a coach bubble leaves the bubble where it is; the window grows out
// of it (scale from the bubble, transform + opacity only) on a layer above the page and below the bubble, its corner tucked under the bubble.
// Back (the arrow, the phone's back), a tap on the dimmed page or a swipe down shrinks it back into the bubble; tap the bubble to carry on.
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
//   chat.ask(prompt, img, o)  the AI call for this chat (gemini, quiet: the chat shows its own thinking dots, AI.dots; Back cancels nothing)
//   chat.transcript()         the last few messages as plain lines, to put in a prompt (kept short to save AI use)
//   chat.history()            the same as a list: [{ who: 'me' | 'bot', text }]
// A card: { title, sub, tag, tagKind, body (html), dim (greyed until added), actions: [{ label, primary, run(card, chat) }], done (text once handled), undo() }
const Coach = (() => {
  const CH = {}, CFG = {}, KEEP = 8, CUT = 280;   // the AI only ever sees the last KEEP messages, each cut to CUT letters
  let cur = null, anc = null;   // anc: what the open window hangs from (its bubble, or the header robot that opened it)
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
      status: text => { const w = c.work; if(!w) return; w.status = String(text || ''); const el = cur === c.id && document.querySelector('#coachList .cwork .cst'); if(el) el.textContent = AI.untail(w.status); },
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
    const r = await ch.ask(`${role} Answer the user's last message in ${lang === 'el' ? 'Greek' : 'English'}, briefly (at most 120 words), plain text with no markdown.${AI.dietRules()}${AI.knows(gym ? 'gym' : 'food')}
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
    if(m.work) return `<div class="cmsg bot"><span class="cav" aria-hidden="true">${AI.robot(k, 26, true)}</span><div class="ctext cwork" role="status"><span class="cst">${esc(AI.untail(m.status || t('aiThinking')))}</span>${AI.dots()}</div></div>`;
    if(m.cards) return `<div class="cmsg bot">${lead}<div class="ccards">${m.cards.map(cardHtml).join('')}</div></div>`;
    return `<div class="cmsg bot">${lead}<div class="ctext">${esc(m.text)}</div></div>`;
  }
  function draw(){
    if(!cur) return; const c = CH[cur], el = $('coachList'); if(!c || !el) return;
    const k = kindOf(cur), stick = el.scrollHeight - el.scrollTop - el.clientHeight < 80 || !el.childElementCount;
    el.innerHTML = c.msgs.map((m, i) => msgHtml(m, c.msgs[i - 1], k)).join('');
    if(stick) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }
  function head(){ $('coachT').textContent = title(cur);   // 0.7.9.2: no robot face in the title (it is the bubble, and beside its answers)
    const f = cfg(cur), ph = val(f.placeholder) || t('coachPh'); $('coachIn').placeholder = ph; $('coachIn').setAttribute('aria-label', ph);
    $('coachCam').classList.toggle('hide', !f.camera); $('coachForm').classList.toggle('cam', !!f.camera); }

  // ---- the box: grows with the text up to about 6 lines; send is dimmed until there is something to send ----
  function grow(){ const ta = $('coachIn'); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 6 * 21 + 22) + 'px';
    $('coachSend').disabled = !ta.value.trim() && !(cur && CH[cur] && CH[cur].img); }
  function fit(){ const ov = $('ovCoach'), vv = window.visualViewport; if(!ov) return; if(!vv){ lay(); return; }   // the box stays above the keyboard
    ov.style.setProperty('--cvh', vv.height + 'px'); ov.style.setProperty('--cvt', vv.offsetTop + 'px'); ov.classList.toggle('kb', vv.height < window.innerHeight * .8); lay(); }
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
  // 0.7.8: chats reached only from a header robot (live workout, Start Workout window) never make a floating bubble; the window hangs from that robot
  const NOBUB = id => id === 'gymlive' || id === 'gymstart';
  function open_(id, first){
    const c = chat(id), ov = $('ovCoach'), sh = ov.querySelector('.sheet'), again = ov.classList.contains('open');
    if(!c.msgs.length || (first && c.msgs.length === 1 && c.msgs[0].first)) c.msgs = [{ who: 'bot', text: first || firstMsg(id), first: true }];
    if(cur && cur !== id){ keep(); const ob = $('cb-' + cur); if(ob) ob._home = false; }
    // the bubble stays exactly where it is (opened from a pill: it appears at its own spot) and holds still while its chat is open
    const b = NOBUB(id) ? null : bubble(id); if(b){ b._home = true; b.classList.remove('new'); }
    anc = b || [...document.querySelectorAll('.sescoach')].find(e => e.getClientRects().length) || null;
    cur = id; head(); $('coachIn').value = c.draft || ''; preview(); draw();
    sh.getAnimations().forEach(a => a.cancel()); sh.style.transform = '';
    if(!again) open('ovCoach'); fit(); pillSync();
    requestAnimationFrame(() => { const el = $('coachList'); el.scrollTop = c.end === false ? c.sy : el.scrollHeight; });   // back where you left off (bottom unless you had scrolled up)
  }
  function keep(){ const c = cur && CH[cur]; if(c) c.draft = $('coachIn').value; }
  // close() calls this whenever the chat window closes (Back, the phone's back, a tap outside, the swipe, opening Settings…); the bubble just stays
  function closed(){ if(!cur) return; const id = cur; keep(); cur = null; anc = null;
    if(!NOBUB(id)){ bubble(id)._home = false; } pillSync(); }
  // Back: shrink into the bubble (theme.css #ovCoach.closing = coachShrink toward the bubble)
  function minimize(id){
    if(id && NOBUB(id)) return;
    if(id && id !== cur){ chat(id); if(!CH[id].msgs.length) CH[id].msgs = [{ who: 'bot', text: firstMsg(id), first: true }]; bubble(id); pillSync(); return; }
    if(!cur) return; Phone.haptic(); close('ovCoach');
  }
  // ---- where the window sits (0.7.9.2) ----
  // Rounded, a margin all round, at most 560 wide. Always BELOW the bubble: its top corner on the bubble's side sits under the bubble's centre
  // (the bubble's own spot is near the top right, theme.css .coachbub). A bubble dragged low still opens a usable window (at least HMIN tall)
  // that then starts a little above it, with the bubble resting on its side.
  // The overlay already matches the visible screen above the keyboard (fit), so with the keyboard up the window shrinks to stay fully in view.
  let saP = null;   // a hidden probe that reads the phone's safe areas (notch / home bar)
  const safe = () => { if(!saP){ saP = document.createElement('div'); saP.setAttribute('aria-hidden', 'true');
    saP.style.cssText = 'position:fixed;left:0;top:0;width:env(safe-area-inset-bottom);height:env(safe-area-inset-top);visibility:hidden;pointer-events:none'; document.body.appendChild(saP); }
    return { t: saP.offsetHeight, b: saP.offsetWidth }; };
  const M = 12, WMAX = 560, HMIN = 320;
  function lay(){ const ov = $('ovCoach'), sh = ov && ov.querySelector('.sheet'); if(!sh || !cur) return;
    const W = ov.clientWidth, H = ov.clientHeight, sa = safe(), kb = ov.classList.contains('kb'), y0 = (kb ? 0 : sa.t) + M, y1 = H - (kb ? 0 : sa.b) - M, oy = ov.getBoundingClientRect().top;
    const w = Math.min(W - 2 * M, WMAX); let x, top, bot, side = 'r', ax = W - M - 34, ay = y0;
    if(anc && anc.isConnected && anc.getClientRects().length){ const r = anc.getBoundingClientRect(); ax = r.left + r.width / 2; ay = r.top + r.height / 2 - oy; }
    side = ax < W / 2 ? 'l' : 'r';
    x = side === 'r' ? Math.min(W - M, ax + 34) - w : Math.max(M, ax - 34); x = Math.max(M, Math.min(W - M - w, x));
    top = Math.max(y0, Math.min(ay, y1 - HMIN)); bot = y1;   // hang from the bubble (or the header robot), down to the bottom margin
    sh.style.left = x + 'px'; sh.style.top = top + 'px'; sh.style.width = w + 'px'; sh.style.height = (bot - top) + 'px';
    sh.style.transformOrigin = `${(ax - x).toFixed(1)}px ${(ay - top).toFixed(1)}px`;   // grows from / shrinks into the bubble's centre
    sh.classList.toggle('al', side === 'l'); sh.classList.toggle('nb', !anc || NOBUB(cur)); }
  function bubble(id){
    let b = $('cb-' + id); if(b) return b; const k = kindOf(id);
    b = document.createElement('button'); b.type = 'button'; b.id = 'cb-' + id; b.className = 'aibub coachbub r' + k; b.dataset.coach = id;
    b.dataset.area = k === 'gym' ? 'gym' : 'food';   // 0.7.9.2: shows only in its coach's area (ai.js areaSync)
    b.innerHTML = `<span class="rcore">${AI.robot(k, 40)}</span>`; b.setAttribute('aria-label', t('coachBubA', { n: title(id) }));
    document.body.appendChild(b);
    b.addEventListener('click', () => { if(b._dragged){ b._dragged = false; return; } Phone.haptic();
      if(cur === id) minimize(); else open_(id); });   // 0.7.9.2: the bubble never moves; tap it again to put the chat away
    AI.drag(b, () => dismiss(id), 'coachBub_' + id); AI.areaSync();
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
  // 0.7.9.1: when the pill comes back (its bubble went in the bin) or steps aside, it rises like on a tab switch (ui.js pillsIn) and
  // the main button slides over by a transform (FLIP: measured before and after, then animated back from the old spot), never by layout
  function pillPlace(){
    const f = $('fab'); if(!f) return; let shown = null;
    const was = PILLS.map(([id]) => $('cp-' + id)).find(b => b && !b.classList.contains('hide')) || null;
    const anim = !rmo() && !document.body.classList.contains('pillswap') && !f.classList.contains('hide') && f.getClientRects().length > 0, f0 = anim ? f.getBoundingClientRect().left : 0;
    PILLS.forEach(([id, act]) => { const b = $('cp-' + id); if(!b) return;
      const on = !f.classList.contains('hide') && f.dataset.action === act && cur !== id && !has(id);   // while its bubble is out, the pill steps aside
      b.classList.toggle('hide', !on); if(on){ shown = b; b.querySelector('.cpl').textContent = title(id); } });
    document.body.classList.remove('has-coachpill');
    const slide = () => { if(!anim || shown === was) return; const dx = f0 - f.getBoundingClientRect().left;
      if(Math.abs(dx) > .5) f.animate([{ transform: `translate3d(${dx}px,0,0)` }, { transform: 'translate3d(0,0,0)' }], { duration: PILL_IN, easing: PILL_EASE }); };
    if(!shown){ slide(); return; }
    // the main button and the pill sit centred together: the button's right edge moves in by the pill's width
    const cs = getComputedStyle(f), L = parseFloat(cs.left) || 0, R = parseFloat(cs.right) || 0, W = document.documentElement.clientWidth, cpr = R + shown.offsetWidth + 10;
    document.body.style.setProperty('--cpr', cpr + 'px'); document.body.classList.add('has-coachpill');
    const fr = f.getBoundingClientRect(), right = (L + W - cpr) / 2 + f.offsetWidth / 2;
    shown.style.left = (right + 10) + 'px'; shown.style.top = (fr.top + (fr.height - shown.offsetHeight) / 2) + 'px'; shown.style.zIndex = cs.zIndex;
    if(anim && shown !== was) pillsIn([shown]);   // the pill rises into place
    slide();
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
    $('coachList').addEventListener('scroll', e => { const l = e.target, c = cur && CH[cur]; if(!c || !$('ovCoach').classList.contains('open')) return; c.sy = l.scrollTop; c.end = l.scrollHeight - l.scrollTop - l.clientHeight < 80; }, { passive: true });   // remembered for the next open
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
    // 0.7.9.2: swipe the window down (from its title row, or from the messages when they are scrolled to the top) and it follows the
    // finger 1:1 (transform only); let go past a quarter of its height (or flick) and it shrinks from there into its bubble, else it springs back
    const sh = $('ovCoach').querySelector('.sheet'); let chH = 0;
    const cdy = s => s.dy >= 0 ? s.dy : rubber(s.dy, 40);
    dragger(sh, { axis: 'y', slop: 10,
      item: e => { if(!cur || e.target.closest('textarea,input,.ccacts,.cpimg,.cbar')) return null; const l = $('coachList');
        return e.target.closest('.chead') || (l.contains(e.target) && l.scrollTop <= 0) ? sh : null; },
      claim: (dx, dy) => dy > 0,
      start: () => { chH = sh.offsetHeight; sh.getAnimations().forEach(a => a.cancel()); },   // the finished grow no longer holds it
      move: s => { sh.style.transform = `translate3d(0,${cdy(s).toFixed(1)}px,0)`; },
      end: (s, ok) => { const y = cdy(s); sh.style.transform = '';
        if(ok && (y > chH / 4 || (s.vy > .5 && y > 40))){ Phone.haptic();
          if(!rmo()) sh.animate([{ transform: `translate3d(0,${y}px,0)`, opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
          close('ovCoach'); return; }
        springTo(sh, { y }, { y: 0 }, { y: s.vy }); } });
    if(window.visualViewport){
      visualViewport.addEventListener('resize', () => { if(!$('ovCoach').classList.contains('open')) return; fit(); const l = $('coachList'); l.scrollTop = l.scrollHeight; });
      addEventListener('resize', () => { if($('ovCoach').classList.contains('open')) fit(); });
      visualViewport.addEventListener('scroll', () => { if($('ovCoach').classList.contains('open')) fit(); });
    }
  }

  return { setup(id, o){ CFG[id] = { ...(CFG[id] || {}), ...(o || {}) }; }, open: open_, minimize, dismiss, has, closed, init, pillSync, isOpen: () => !!cur };
})();
