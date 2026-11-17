// Refinements: windows remember what you typed for 3 minutes (the "draft memory").
// One shared module. open() and close() in ui.js call Draft.opened / Draft.closed, so every window gets it without its own code.
// Saved through Store as 'drafts' (this device only: never in backups, exports or sync).
//
//   When a window closes, the fields you changed (text, numbers, checkboxes, dropdowns, the .seg pills, plus a few lists kept in
//   JS, see EXTRA) are kept. Open the same window for the same item within DRAFT_MS and they come back. The timer starts at close.
//   Save / Add / Log / Done that commits, Delete and Discard (a .primary, .danger or [data-commit] button in the window) forget it.
//   Back arrow, Cancel, Close and a tap outside only start the timer.
//
// Small API, also for other features (the hub memory reuses it with its own keys):
//   Draft.put(key, value)   keep any JSON value under a key; the 3 minutes start now
//   Draft.get(key)          the value, or null when there is none or it is older than DRAFT_MS (then it is thrown away)
//   Draft.clear(key)        forget it now
//   Draft.commit(id)        a window's work was saved / finished / discarded in code: forget its draft when it closes
//   Draft.opened(id) / Draft.closed(id)   called by open() / close() only
const DRAFT_MS = 3 * 60 * 1000;   // how long a closed window keeps what you typed (one number to change)
const DRAFT_SEARCH = true;        // search boxes remember their text too (false = they always open empty)

const Draft = (() => {
  // never remembered: live or dangerous after 3 minutes (live workout, timers, camera and barcode scans, scan results, AI chat),
  // windows with nothing typed in them, and settings that apply the moment you tap them (nothing to lose)
  const SKIP = new Set(['ovSession', 'ovSx', 'ovExSet', 'ovNext', 'ovSummary', 'ovRankFx', 'ovStart', 'ovScan', 'ovShop', 'ovShopRev', 'ovRcpt', 'ovTable', 'ovWkScan', 'ovWkQR',
    'ovCoach', 'ovAsk', 'ovSetup', 'ovLang', 'ovPick', 'ovBulb', 'ovSLang', 'ovSUnits', 'ovTheme', 'ovSTabs', 'ovSData', 'ovSAbout', 'ovSCustom', 'ovAdd']);
  // windows that only remember their search box (the exercise picker menu itself stays exactly as it is)
  const SEARCH_ONLY = new Set(['ovExPick']);
  // which item a window is open for, so editing food A never gets food B's draft (new items: '')
  const id_ = x => x && x.id || '';
  const ITEM = {
    ovForm: () => F.editingId || '',
    ovAmt: () => AM ? [AM.mode, AM.info && (id_(AM.info.meal) || id_(AM.info.food) || AM.info.name), id_(AM.entry), id_(AM.item)].join('/') : '',
    ovFAdd: () => FA ? [FA.mode, id_(FA.food), id_(FA.item)].join('/') : '',
    ovSupp: () => SU && SU.id || '',
    ovTpl: () => TP && TP.id || '',
    ovCook: () => D ? [D.mode, D.id || ''].join('/') : '',
    ovQuick: () => QA && QA.id || '',
  };
  // what a window keeps in JS rather than in its fields (lists you added to)
  const EXTRA = {
    ovTpl: { get: () => TP && TP.exercises, set: v => { TP.exercises = v; drawTpl(); } },
    ovCook: { get: () => D && D.rows, set: v => { D.rows = v; drawRows(); } },
    ovSupp: { get: () => SU && SU.times, set: v => { SU.times = v; drawSupTimes(); } },
    ovForm: { get: () => ({ packs: F.packs, usual: F.usual }), set: v => { F.packs = v.packs; F.usual = v.usual; drawPacks(); } },
  };
  const COMMIT = '.primary:not([data-close]),.danger,[data-commit]', COMMIT_GAP = 1500;
  const commitAt = {};

  // ---------- storage: { key: { at: time it was kept, v: value } } ----------
  let all = null;
  const mem = () => all || (all = Store.load('drafts', {}) || {});
  const flush = () => Store.save('drafts', Object.keys(all).length ? all : undefined);
  const purge = () => { const now = Date.now(); let gone = false; Object.keys(mem()).forEach(k => { const d = all[k]; if(!d || !(now - d.at < DRAFT_MS)){ delete all[k]; gone = true; } }); if(gone) flush(); };
  const put = (k, v) => { mem()[k] = { at: Date.now(), v }; flush(); };
  const get = k => { purge(); const d = all[k]; return d ? d.v : null; };
  const clear = k => { if(mem()[k]){ delete all[k]; flush(); } };

  // ---------- reading and writing a window's fields ----------
  const isSearch = f => f.type === 'search' || f.classList.contains('search');
  const fields = (ov, only) => [...ov.querySelectorAll('input[id],textarea[id],select[id],[data-draft]')].filter(f =>
    f.matches('input,textarea,select') && !['file', 'password', 'hidden', 'button', 'submit'].includes(f.type) && !f.disabled && (isSearch(f) ? DRAFT_SEARCH : !only));
  const segs = (ov, only) => only ? [] : [...ov.querySelectorAll('.seg[id]')];
  const fkey = f => f.id || f.dataset.draft;
  function read(ov){
    const only = SEARCH_ONLY.has(ov.id), o = { f: {}, s: {} };
    fields(ov, only).forEach(f => { o.f[fkey(f)] = f.type === 'checkbox' || f.type === 'radio' ? !!f.checked : f.value; });
    segs(ov, only).forEach(s => { const b = s.querySelector('button.on'); o.s[s.id] = b ? b.dataset.v : null; });
    const x = !only && EXTRA[ov.id]; if(x){ try{ const v = x.get(); if(v !== undefined && v !== null) o.x = JSON.parse(JSON.stringify(v)); }catch(e){} }
    return o;
  }
  // the window as its opener filled it (time and date boxes and search text left out: they change on their own), plus the item it is for
  const hash = s => { let h = 5381; for(let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
  function keyOf(ov, base){
    const f = {}; Object.entries(base.f).forEach(([k, v]) => { const el = ov.querySelector('#' + CSS.escape(k)); if(el && (isSearch(el) || el.type === 'time' || el.type === 'date')) return; f[k] = v; });
    let item = ''; try{ item = ITEM[ov.id] ? ITEM[ov.id]() : ''; }catch(e){}
    return 'w:' + ov.id + '|' + item + '|' + hash(JSON.stringify([f, base.s, base.x]));
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fire = (el, ...types) => types.forEach(ty => el.dispatchEvent(new Event(ty, { bubbles: true })));
  function apply(ov, d){
    if(d.x !== undefined && EXTRA[ov.id]) try{ EXTRA[ov.id].set(JSON.parse(JSON.stringify(d.x))); }catch(e){ console.warn('draft', ov.id, e); }
    Object.entries(d.s || {}).forEach(([id, v]) => { const s = ov.querySelector('#' + CSS.escape(id)); if(!s || v == null) return;
      const b = [...s.querySelectorAll('button')].find(b => b.dataset.v === v); if(b && !b.classList.contains('on')) b.click(); });
    const order = f => f.tagName === 'SELECT' ? 0 : f.type === 'checkbox' || f.type === 'radio' ? 1 : 2;   // units and switches first, then the numbers typed in them
    Object.entries(d.f || {}).map(([k, v]) => [ov.querySelector('#' + CSS.escape(k)) || ov.querySelector(`[data-draft="${CSS.escape(k)}"]`), v]).filter(([el]) => el)
      .sort((a, b) => order(a[0]) - order(b[0])).forEach(([el, v]) => {
        if(el.type === 'checkbox' || el.type === 'radio'){ if(el.checked !== v){ el.checked = v; fire(el, 'change'); } return; }
        if(el.value === v) return; el.value = v;
        if(el.tagName === 'SELECT'){ fire(el, 'change'); if(typeof syncSel === 'function') syncSel(el); } else fire(el, 'input', 'change'); });
  }

  // ---------- the hooks in open() and close() ----------
  function opened(id){
    const ov = document.getElementById(id); if(!ov || SKIP.has(id)) return;
    ov._draft = null; delete commitAt[id];
    queueMicrotask(() => {   // after the opener has finished filling the window
      if(!ov.classList.contains('open')) return;
      const base = read(ov), key = keyOf(ov, base); ov._draft = { key, base };
      const d = get(key); if(!d) return;
      try{ apply(ov, d); }catch(e){ console.warn('draft', id, e); }
    });
  }
  function closed(id){
    const ov = document.getElementById(id), s = ov && ov._draft; if(!s) return; ov._draft = null;
    if(Date.now() - (commitAt[id] || 0) < COMMIT_GAP){ delete commitAt[id]; clear(s.key); return; }   // saved, finished or discarded
    const cur = read(ov), d = { f: {}, s: {} };   // keep only what you changed
    Object.entries(cur.f).forEach(([k, v]) => { if(s.base.f[k] !== v) d.f[k] = v; });
    Object.entries(cur.s).forEach(([k, v]) => { if(s.base.s[k] !== v) d.s[k] = v; });
    if(cur.x !== undefined && !same(cur.x, s.base.x)) d.x = cur.x;
    if(!Object.keys(d.f).length && !Object.keys(d.s).length && d.x === undefined) clear(s.key); else put(s.key, d);
  }
  // a tap on Save / Add / Log / Delete / Discard inside a window marks it as committed for a moment; if the window closes now, its draft goes
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'), ov = b && b.closest('.overlay');
    if(ov && b.matches(COMMIT)) commitAt[ov.id] = Date.now(); }, true);

  purge();   // old drafts go when the app starts
  return { put, get, clear, commit: id => { commitAt[id] = Date.now() + 864e5; }, opened, closed, MS: DRAFT_MS };
})();
