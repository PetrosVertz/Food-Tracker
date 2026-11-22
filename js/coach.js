// ---------- 0.7.4.3 Coach chat: ONE chat window that Food Coach (chef robot) and Gym Coach (sweatband robot) share ----------
// Looks like the Claude app's chat: a big round box pinned at the bottom that grows with the text, a round accent send button,
// your messages as bubbles on the right, the robot's answers as plain text on the left with its small face, results as cards.
// Refinements (changes 13 + 18): one component for Food Coach and Gym Coach. Pill → robot bubble; tapping the bubble glides it to the top
// right and the chat opens as a big panel hanging from that corner (transform + opacity only); Back (the arrow, the phone's back), a tap on
// the dimmed page or on the bubble shrinks it back and the bubble glides home. Drag the bubble onto its pill's spot to turn it back into the pill.
//
// Other parts use it like this:
//   Coach.setup(id, { kind, title, first, placeholder, camera, send })   once, to say how that coach answers (all optional)
//     kind  'chef' | 'gym' (the robot; ids starting with 'gym' default to the gym robot)
//     title / first / placeholder   text or a function returning text (the window title, the opening message, the box hint)
//     camera   true → a big camera button inside the chat box; the photo comes to send() as img (base64 JPEG)
//     send(text, chat, img)   answers one message; without it the coach just talks (a short AI conversation)
//     starters   a list of short questions (or a function returning one) shown as chips under the opening message until you write; a tap sends it
//     persist    { load(id, chat) → saved messages | null, save(id, messages | null) }: the chat survives a restart (the coach owns where it is kept;
//                restored cards come back as plain text, without buttons). Without it the chat lives until the app closes, as before.
//   Coach.open(id, first)     opens that chat, or reopens it where you left it; first = the opening message (optional)
//                             (a third argument, a rect, is where the bubble starts from: the pill's face; coach.js only)
//   Coach.minimize(id)        puts that chat on screen as its robot bubble without opening it
//   Coach.dismiss(id)         ends that chat and forgets it (its bubble goes, the coach pill comes back)
//   Coach.has(id)             true while that chat's bubble is on screen
//   Coach.post(id, text, cards)   the coach says something without an AI call (a local hint); shown when that chat is open, kept otherwise
// The chat object given to send():
//   chat.say(text)            the robot answers with plain text
//   chat.cards(list)          the robot answers with result cards; returns the cards so you can change them later
//   chat.update(card, patch)  change a card (e.g. { done: 'Added', dim: false }) and redraw it
//   chat.status(text)         changes the robot's "working" line while it thinks: Thinking… / Searching your foods… / Searching the web… / Reading the photo… (t('coachSt…'))
//   chat.ask(prompt, img, o)  the AI call for this chat (gemini, quiet: the chat shows its own thinking dots, AI.dots; Back cancels nothing)
//   chat.transcript()         the last few messages as plain lines, to put in a prompt (kept short to save AI use)
//   chat.history()            the same as a list: [{ who: 'me' | 'bot', text }]
// A card: { title, sub, tag, tagKind, cls (extra class for its look), body (html), dim (greyed until added), actions: [{ label, primary, off(), run(card, chat) }], done (text once handled), undo() }
//   off()  Food Coach 2.0: true → that button is shown disabled (e.g. Add while a row has no food)
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
  // by: the coach that answers when a question was handed over (Supervisor.handoff): its id for its own logic, prompt, context and answer
  // check; the messages still go into this chat (c), marked with that coach
  function api(c, by){
    const push = m => { if(by) m.by = by; c.msgs.push(m); draw(); return m; }, sid = by || c.id;
    return {
      id: sid,
      say: text => { push({ who: 'bot', text: String(text || '') }); },
      cards: list => { const cs = (list || []).map(x => ({ ...x, cid: uid() })); push({ who: 'bot', cards: cs }); return cs; },
      status: text => { const w = c.work; if(!w) return; w.status = String(text || ''); const el = cur === c.id && document.querySelector('#coachList .cwork .cst'); if(el) el.textContent = AI.untail(w.status); },
      update(card, patch){ Object.assign(card, patch || {}); draw(); keepMsgs(c.id); },
      // Athlete OS: through the Supervisor (this coach's context, answer check, per-coach numbers); still one gemini() request per message
      ask: (prompt, img, o) => { c.ctl = c.ctl || new AbortController();
        return typeof Supervisor !== 'undefined' ? Supervisor.ask(sid, prompt, img, { quiet: true, ...(o || {}), signal: c.ctl.signal }) : gemini(prompt, img, null, c.ctl.signal, { quiet: true, ...(o || {}) }); },
      history: () => hist(c),
      transcript: () => older(c) + hist(c).map(h => `${h.who === 'me' ? 'User' : 'Coach'}: ${h.text}`).join('\n'),
    };
  }
  // Athlete OS continuity: messages older than the last KEEP are not sent in full; the user's last few older ones go as one short line
  function older(c){ const ms = c.msgs.filter(m => !m.work), old = ms.slice(0, Math.max(0, ms.length - KEEP)).filter(m => m.who === 'me' && m.text).slice(-4);
    return old.length ? `(Earlier in this chat the user said: ${old.map(m => '"' + m.text.replace(/\s+/g, ' ').slice(0, 70) + '"').join('; ')})\n` : ''; }
  // the coach's own persistence (cfg.persist), never for a chat that is still answering
  function keepMsgs(id){ const p = cfg(id).persist, c = CH[id]; if(!p || !c) return; try{ p.save(id, c.msgs.filter(m => !m.work)); }catch(e){ console.warn('coach persist', e); } }
  function hist(c){
    return c.msgs.filter(m => !m.work).slice(-KEEP).map(m => ({ who: m.who, text: (m.text || (m.cards || []).map(x => [x.title, x.sub].filter(Boolean).join(' · ')).join('; ') || (m.img ? '[photo]' : '')).slice(0, CUT) }));
  }

  // without a send() of its own: a short, friendly AI conversation in the coach's role
  async function talk(text, ch, img){
    const gym = kindOf(ch.id) === 'gym';
    const role = gym ? 'Here you are Gym Coach, in the workout tracker.' : 'Here you are Food Coach, in the food tracker, for someone who lifts weights.';
    const r = await ch.ask(`${AI.voice(gym ? 'gym' : 'chef')}${role} Answer the user's last message in ${lang === 'el' ? 'Greek' : 'English'}, briefly (at most ${AI.words(120)} words), plain text with no markdown.${AI.dietRules()}${AI.knows(gym ? 'gym' : 'food', ch.id)}
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
      : (x.actions || []).length ? `<div class="ccacts">${x.actions.map((a, i) => `<button type="button" class="ccbtn${a.primary ? ' pri' : ''}" data-ca="${i}"${a.off && a.off() ? ' disabled' : ''}>${esc(a.label)}</button>`).join('')}</div>` : '';
    return `<div class="ccard${x.cls ? ' ' + esc(x.cls) : ''}${x.dim && !x.done ? ' dim' : ''}${x.done ? ' done' : ''}" data-cid="${x.cid}">
      ${x.title || x.sub ? `<div class="cchead"><b>${esc(x.title || '')}${tag}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</div>` : ''}${x.body || ''}${acts}</div>`;
  }
  function msgHtml(m, prev, k){
    const by = m.by && kindOf(m.by) !== k ? m.by : null; if(by){ k = kindOf(by); prev = prev && prev.by === m.by ? prev : null; }   // a handed-over answer: that coach's face and name
    const from = by ? `<small class="cby">${esc(title(by))}</small>` : '';
    if(m.who === 'me') return `<div class="cmsg me"><div class="cme">${m.img ? `<img class="cimg" src="data:image/jpeg;base64,${m.img}" alt="">` : ''}${m.text ? `<span>${esc(m.text)}</span>` : ''}</div></div>`;
    const lead = !prev || prev.who !== 'bot' || (prev.by || null) !== (m.by || null) ? face(k) : '<span class="cav"></span>';
    if(m.work) return `<div class="cmsg bot"><span class="cav" aria-hidden="true">${AI.robot(k, 26, true)}</span><div class="ctext cwork" role="status"><span class="cst">${esc(AI.untail(m.status || t('aiThinking')))}</span>${AI.dots()}</div></div>`;
    if(m.cards) return `<div class="cmsg bot${by ? ' byother' : ''}">${lead}<div class="ccards">${from}${m.cards.map(cardHtml).join('')}</div></div>`;
    const st = m.first ? starters(m) : '';
    return `<div class="cmsg bot${by ? ' byother' : ''}">${lead}<div class="ctext">${from}${esc(m.text)}</div></div>${st}`;
  }
  // 0.7.9.6: the opening message's suggestion chips (cfg.starters), only while nothing has been written yet
  function starters(m){ const c = cur && CH[cur]; if(!c || c.msgs.length !== 1 || c.msgs[0] !== m) return '';
    const l = val(cfg(cur).starters) || []; if(!l.length) return '';
    return `<div class="cstart">${l.map(s => `<button type="button" class="cschip" data-cst="${esc(s)}">${esc(s)}</button>`).join('')}</div>`; }
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
    // Athlete OS: this coach is now answering this message (its context follows it); a fact the user stated about themselves is remembered (rules, no AI)
    const mem = text && typeof Supervisor !== 'undefined' ? Supervisor.begin(id, text) : null;
    if(mem && (mem.added.length || mem.dropped.length)) toast(t(mem.added.length ? 'memSaved' : 'memForgot'), t('undo'), () => { mem.added.forEach(x => AthleteMemory.remove(x.id)); AthleteMemory.restore(mem.dropped); });
    // a clear question for the other coach (no photo: photos stay with the coach that reads them) is answered by that coach, here in this chat
    const to = text && !img && typeof Supervisor !== 'undefined' && Supervisor.handoff ? Supervisor.handoff(text, id, k => !!(CFG[k] && CFG[k].send)) : null;
    if(to){ w.status = t('coachHandoff', { n: title(to) }); draw(); }
    const ch = api(c, to), f = cfg(to || id);
    try{ await (f.send || talk)(text, ch, img); }
    catch(err){ if(!(err && err.cancelled)) ch.say(AI.friendly(err)); }   // Food Coach 2.0: plain words, never the provider's error text
    finally{ if(typeof Supervisor !== 'undefined') Supervisor.end(); c.busy = false; c.ctl = null; c.work = null; const i = c.msgs.indexOf(w); if(i > -1) c.msgs.splice(i, 1);
      if(cur === id) draw(); else { const b = $('cb-' + id); if(b) b.classList.add('new'); } keepMsgs(id); }   // answered while shrunk: a dot on the bubble
  }

  // ---- open / shrink into the bubble (Refinements, change 13) ----
  // ONE component for both coaches: Food Coach (pill beside Log Food) and Gym Coach (pill beside Create a Workout) behave the same.
  // Tap the pill: it turns into the robot bubble. Tap the bubble (wherever it rests): it glides to a fixed spot at the top right and the
  // chat opens as a big panel hanging from that corner; the panel starts growing about half way through the glide (one movement).
  // Closing is the reverse: the panel shrinks first and the bubble glides back to exactly where it rested as the panel finishes.
  // Only transform and opacity move; the resting spot is its left/top (ai.js place), so nothing extra is saved. Reduce Motion: a fade, the bubble jumps.
  // Chats opened from a header robot (live workout, Start Workout window) never make a bubble: the window hangs from that robot, as before.
  const HEAD = id => id === 'gymlive' || id === 'gymstart';
  const GLIDE = 300, LAG = 130, SPRING = 'cubic-bezier(.3,1.3,.6,1)';   // the glide; the panel starts LAG ms in (theme.css --cgd)
  const tr = (x, y, s) => `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)${s != null ? ` scale(${s})` : ''}`;
  let spot = null;   // the bubble's top-left at the top right corner while its chat is open (set by lay)
  function open_(id, first, from){
    const c = chat(id), ov = $('ovCoach'), sh = ov.querySelector('.sheet'), again = ov.classList.contains('open');
    if(!c.msgs.length && cfg(id).persist){ try{ const m = cfg(id).persist.load(id, api(c)); if(Array.isArray(m) && m.length) c.msgs = m; }catch(e){ console.warn('coach persist', e); } }   // back after a restart (Food Coach 2.0: load gets the chat, for its cards)
    if(!c.msgs.length || (first && c.msgs.length === 1 && c.msgs[0].first)) c.msgs = [{ who: 'bot', text: first || firstMsg(id), first: true }];
    if(cur && cur !== id){ keep(); const ob = $('cb-' + cur); if(ob){ ob._home = false; glide(ob, false); } }   // the other coach's bubble goes back to its spot
    const b = HEAD(id) ? null : bubble(id); if(b){ b._home = true; b.classList.remove('new'); }
    anc = HEAD(id) ? [...document.querySelectorAll('.sescoach')].find(e => e.getClientRects().length) || null : null;
    cur = id; head(); $('coachIn').value = c.draft || ''; preview(); draw();
    sh.getAnimations().forEach(a => a.cancel()); sh.style.transform = '';
    sh.style.setProperty('--cgd', b && !again && !rmo() ? LAG + 'ms' : '0ms');   // the panel grows out of the bubble half way through its glide
    if(!again) open('ovCoach'); fit(); if(b) glide(b, true, from); pillSync();
    requestAnimationFrame(() => { const el = $('coachList'); el.scrollTop = c.end === false ? c.sy : el.scrollHeight; });   // back where you left off (bottom unless you had scrolled up)
  }
  // the bubble's glide: up = to the top right spot (from = a rect it starts from, e.g. the pill's face), else back to its resting spot.
  // The end state is set as its transform; the animation only carries it there with the spring.
  function glide(b, up, from){
    const r = b.getBoundingClientRect(), w = b.offsetWidth, bx = b.offsetLeft, by = b.offsetTop;
    b.getAnimations().forEach(a => a.cancel()); b._up = up;
    const to = up && spot ? { x: spot.x - bx, y: spot.y - by } : { x: 0, y: 0 };
    const f = from ? { x: from.left + from.width / 2 - w / 2 - bx, y: from.top + from.height / 2 - w / 2 - by, s: Math.min(1, from.width / w) } : { x: r.left - bx, y: r.top - by, s: 1 };
    b.style.transition = 'none'; b.style.transform = up ? tr(to.x, to.y) : '';
    if(rmo() || (Math.hypot(to.x - f.x, to.y - f.y) < 1 && f.s === 1)) return;
    b.animate([{ transform: tr(f.x, f.y, f.s) }, { transform: tr(to.x, to.y, 1) }], { duration: GLIDE, easing: SPRING });
  }
  function keep(){ const c = cur && CH[cur]; if(c) c.draft = $('coachIn').value; }
  // close() calls this whenever the chat window closes (Back, the phone's back, a tap outside, tapping the bubble, opening Settings…):
  // the panel shrinks into the bubble's corner (theme.css #ovCoach.closing) and the bubble glides home as it finishes
  function closed(){ if(!cur) return; const id = cur; keep(); cur = null; anc = null;
    const b = !HEAD(id) && $('cb-' + id); if(b){ b._home = false; setTimeout(() => { if(!b._home && b.isConnected) glide(b, false); }, rmo() ? 0 : 100); }
    pillSync(); }
  // Back: shrink into the bubble
  function minimize(id){
    if(id && HEAD(id)) return;
    if(id && id !== cur){ chat(id); if(!CH[id].msgs.length) CH[id].msgs = [{ who: 'bot', text: firstMsg(id), first: true }]; bubble(id); pillSync(); return; }
    if(!cur) return; Phone.haptic(); close('ovCoach');
  }
  // ---- where the window sits ----
  // Rounded, a margin all round, at most 560 wide. A bubble's chat always hangs from the top right spot: the panel's top right corner sits under
  // the bubble's centre and it reaches down to the bottom margin. A header robot's chat hangs from that robot (on its side), as before.
  // The overlay already matches the visible screen above the keyboard (fit), so with the keyboard up the panel shrinks to stay fully in view,
  // and the bubble moves with its corner.
  let saP = null;   // a hidden probe that reads the phone's safe areas (notch / home bar)
  const safe = () => { if(!saP){ saP = document.createElement('div'); saP.setAttribute('aria-hidden', 'true');
    saP.style.cssText = 'position:fixed;left:0;top:0;width:env(safe-area-inset-bottom);height:calc(env(safe-area-inset-top) + var(--topgap,12px));visibility:hidden;pointer-events:none'; document.body.appendChild(saP); }
    return { t: saP.offsetHeight, b: saP.offsetWidth }; };
  const M = 12, WMAX = 560, HMIN = 320;
  function lay(){ const ov = $('ovCoach'), sh = ov && ov.querySelector('.sheet'); if(!sh || !cur) return;
    const W = ov.clientWidth, H = ov.clientHeight, sa = safe(), kb = ov.classList.contains('kb'), y0 = (kb ? 0 : sa.t) + M, y1 = H - (kb ? 0 : sa.b) - M, oy = ov.getBoundingClientRect().top;
    const w = Math.min(W - 2 * M, WMAX), b = !HEAD(cur) && $('cb-' + cur); let x, top, side = 'r', ax = W - M - 34, ay = y0;
    if(b){ const bw = b.offsetWidth || 60; spot = { x: W - M - bw, y: oy + y0 }; ax = spot.x + bw / 2; ay = y0 + bw / 2;   // the fixed top right spot
      if(b._up && !b.getAnimations().length) b.style.transform = tr(spot.x - b.offsetLeft, spot.y - b.offsetTop); }   // the keyboard moved the corner: the bubble stays on it
    else if(anc && anc.isConnected && anc.getClientRects().length){ const r = anc.getBoundingClientRect(); ax = r.left + r.width / 2; ay = r.top + r.height / 2 - oy; side = ax < W / 2 ? 'l' : 'r'; }
    x = side === 'r' ? Math.min(W - M, ax + 34) - w : Math.max(M, ax - 34); x = Math.max(M, Math.min(W - M - w, x));
    top = Math.max(y0, Math.min(ay, y1 - HMIN));   // hang from the bubble (or the header robot), down to the bottom margin
    sh.style.left = x + 'px'; sh.style.top = top + 'px'; sh.style.width = w + 'px'; sh.style.height = (y1 - top) + 'px';
    sh.style.transformOrigin = `${(ax - x).toFixed(1)}px ${(ay - top).toFixed(1)}px`;   // grows from / shrinks into the bubble's centre
    sh.classList.toggle('al', side === 'l'); sh.classList.toggle('nb', !b); }
  function bubble(id){
    let b = $('cb-' + id); if(b) return b; const k = kindOf(id);
    b = document.createElement('button'); b.type = 'button'; b.id = 'cb-' + id; b.className = 'aibub coachbub r' + k; b.dataset.coach = id;
    b.dataset.area = k === 'gym' ? 'gym' : 'food';   // shows only in its coach's area (ai.js areaSync)
    b.innerHTML = `<span class="rcore">${AI.robot(k, 40)}</span>`; b.setAttribute('aria-label', t('coachBubA', { n: title(id) }));
    document.body.appendChild(b);
    b.addEventListener('click', () => { if(b._dragged){ b._dragged = false; return; } Phone.haptic();
      if(cur === id) minimize(); else open_(id); });   // tap it again to put the chat away
    // no trash bin (change 18): drag it near its pill's spot and a ghost pill shows; let go there and it turns back into the pill
    AI.drag(b, null, 'coachBub_' + id, { start: () => ghostStart(id), move: ghostMove, end: (p, s) => ghostEnd(b, p, s) }); AI.areaSync();
    return b;
  }
  function dismiss(id){
    const c = CH[id]; if(c && c.ctl) c.ctl.abort(); delete CH[id];
    const p = cfg(id).persist; if(p) try{ p.save(id, null); }catch(e){}
    const b = $('cb-' + id); if(b) b.remove();
    if(cur === id){ cur = null; close('ovCoach'); }
    pillSync();
  }

  // ---- drag the bubble back into its pill (Refinements, change 18) ----
  // While the bubble is dragged on the page where its pill lives, a quiet ghost pill (the frosted look of change 12) marks the pill's spot: it fades
  // in when the bubble comes within reach (and the main button slides aside to make room, by a transform) and out when it moves away.
  // Let go close to it: the bubble springs into the pill's face and fades as the pill fades back in, exactly as before it was pressed.
  // The chat itself is kept: tapping the pill again carries on where you left off. Let go anywhere else: the bubble stays where it was dropped.
  // Layout is read once when the drag starts; while moving only transform / opacity / a class change.
  const REACH = 140, SNAP = 40;   // px from the ghost's edge: it shows / you can let go there
  let gh = null;
  function ghostAt(id){ const p = $('cp-' + id), f = $('fab'), pl = PILLS.find(x => x[0] === id);
    return p && f && pl && !f.classList.contains('hide') && f.dataset.action === pl[1] && f.getClientRects().length ? { p, f } : null; }
  function ghostStart(id){ ghostDrop(); const at = ghostAt(id); if(!at) return; const { p, f } = at;
    const g = document.createElement('div'); g.className = 'coachpill cghost'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = p.innerHTML; g.querySelector('.cpl').textContent = title(id);
    document.body.appendChild(g);
    // where pillPlace() will put the pill: the main button and the pill sit centred together
    const cs = getComputedStyle(f), L = parseFloat(cs.left) || 0, R = parseFloat(cs.right) || 0, W = document.documentElement.clientWidth, pw = g.offsetWidth, ph = g.offsetHeight, fr = f.getBoundingClientRect();
    const right = (L + W - (R + pw + 10)) / 2 + f.offsetWidth / 2, x = right + 10, y = fr.top + (fr.height - ph) / 2;
    g.style.left = x + 'px'; g.style.top = y + 'px'; g.style.zIndex = cs.zIndex;
    gh = { id, g, f, r: { x, y, w: pw, h: ph }, fdx: right - fr.right, on: false, hot: false }; }
  function ghostMove(cx, cy){ if(!gh) return; const r = gh.r;   // cx / cy: the bubble's centre
    const d = Math.hypot(Math.max(r.x - cx, 0, cx - r.x - r.w), Math.max(r.y - cy, 0, cy - r.y - r.h)), on = d < REACH, hot = d < SNAP;
    if(on !== gh.on){ gh.on = on; gh.g.classList.toggle('on', on); gh.f.style.transform = on ? `translate3d(${gh.fdx.toFixed(1)}px,0,0)` : ''; }
    if(hot !== gh.hot){ gh.hot = hot; gh.g.classList.toggle('hot', hot); if(hot) Phone.haptic(); } }
  function ghostDrop(){ if(!gh) return; const g = gh; gh = null; g.f.style.transform = ''; g.g.classList.remove('on', 'hot'); setTimeout(() => g.g.remove(), 250); }
  function ghostEnd(b, p, s){ if(!gh) return false; if(!gh.hot || !s){ ghostDrop(); return false; }
    const g = gh, id = g.id; gh = null; Phone.haptic();
    b.id = ''; b.classList.add('gone'); b._home = true;   // no longer this coach's bubble: has() is false, so the pill comes back
    // the main button already sits where the pill needs it (by its transform), so the layout change underneath is invisible
    noRise = true; pillPlace(); noRise = false; g.f.style.transition = 'none'; g.f.style.transform = ''; g.f.offsetWidth; g.f.style.transition = '';
    const pill = $('cp-' + id), fc = pill.querySelector('.cpface').getBoundingClientRect(), w = b.offsetWidth;
    pill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: rmo() ? 120 : 220, delay: rmo() ? 0 : 90, easing: 'ease-out', fill: 'backwards' });
    g.g.remove();
    const to = { x: fc.left + fc.width / 2 - w / 2 - b.offsetLeft, y: fc.top + fc.height / 2 - w / 2 - b.offsetTop, s: fc.width / w };
    const a = rmo() ? b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
      : springTo(b, { x: p.x, y: p.y }, to, { x: s.vx, y: s.vy }, { k: 320, damp: .9, fill: 'forwards', op: [1, 0] });
    const fin = () => b.remove(); a.finished.then(fin, fin);
    return true; }

  // ---- the coach pills beside the main button (Food Coach next to Log Food, Gym Coach next to Create a Workout) ----
  // the pills show the robot's face instead of the AI badge: a robot face means a chat, the AI badge means a one-tap AI action
  const PILLS = [['chef', 'today'], ['gym', 'gymlib']];   // [chat id, the main button's data-action it sits beside]
  function pills(){ PILLS.forEach(([id]) => { if($('cp-' + id)) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'cp-' + id; b.className = 'coachpill hide'; b.dataset.coachPill = id;
    b.innerHTML = `<span class="cpface" aria-hidden="true">${AI.robot(kindOf(id), 24)}</span><span class="cpl"></span>`;
    b.addEventListener('click', () => { Phone.haptic(); open_(id, null, b.querySelector('.cpface').getBoundingClientRect()); }); document.body.appendChild(b); }); }   // the pill turns into the bubble: it starts from the pill's face
  let pq = 0, noRise = false; const pillSync = () => { cancelAnimationFrame(pq); pq = requestAnimationFrame(pillPlace); };
  // 0.7.9.1: when the pill comes back or steps aside, it rises like on a tab switch (ui.js pillsIn) and
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
    if(anim && shown !== was && !noRise) pillsIn([shown]);   // the pill rises into place (not when a bubble is landing in it: it fades in under the bubble, ghostEnd)
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
      const sc = e.target.closest('[data-cst]'); if(sc && cur){ Phone.haptic(); $('coachIn').value = sc.dataset.cst; send(); return; }
      const el = e.target.closest('[data-cid]'); if(!el || !cur) return; const c = CH[cur];
      const card = c.msgs.flatMap(m => m.cards || []).find(x => x.cid === el.dataset.cid); if(!card) return;
      const id = cur;
      if(e.target.closest('[data-cundo]')){ const u = card.undo; card.done = ''; card.undo = null; draw(); if(u) u(); if(typeof Supervisor !== 'undefined') Supervisor.decide(cur, 'undo', 0); keepMsgs(id); return; }
      const a = e.target.closest('[data-ca]'); if(!a || a.disabled) return; const act = (card.actions || [])[+a.dataset.ca]; if(!act || !act.run || (act.off && act.off())) return;   // Food Coach 2.0: an action that is off does nothing
      Phone.haptic(); if(typeof Supervisor !== 'undefined') Supervisor.decide(cur, act.primary ? 'apply' : 'other', +a.dataset.ca);   // decision ledger (no text)
      Promise.resolve(act.run(card, api(c))).catch(err => api(c).say(AI.friendly(err))).finally(() => keepMsgs(id));
    });
    if(window.visualViewport){
      visualViewport.addEventListener('resize', () => { if(!$('ovCoach').classList.contains('open')) return; fit(); const l = $('coachList'); l.scrollTop = l.scrollHeight; });
      addEventListener('resize', () => { if($('ovCoach').classList.contains('open')) fit(); });
      visualViewport.addEventListener('scroll', () => { if($('ovCoach').classList.contains('open')) fit(); });
    }
  }

  // a local message (no AI): text and/or cards from the coach, e.g. a quiet hint found by plain rules
  function post(id, text, cards){ const c = chat(id);
    if(!c.msgs.length){ const p = cfg(id).persist; try{ const m = p && p.load(id, api(c)); if(Array.isArray(m) && m.length) c.msgs = m; }catch(e){} if(!c.msgs.length) c.msgs = [{ who: 'bot', text: firstMsg(id), first: true }]; }
    if(text) c.msgs.push({ who: 'bot', text: String(text) });
    if(cards && cards.length) c.msgs.push({ who: 'bot', cards: cards.map(x => ({ ...x, cid: uid() })) });
    if(cur === id) draw(); keepMsgs(id); }
  return { setup(id, o){ CFG[id] = { ...(CFG[id] || {}), ...(o || {}) }; }, open: open_, minimize, dismiss, has, closed, init, pillSync, post, isOpen: () => !!cur };
})();
