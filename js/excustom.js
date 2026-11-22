// Exercise Picker V27 · the shared muscle list (picker filters + custom exercise creator) and your own exercises: names, records, QR codes.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// Pure parts only (no screen): tools/expick-test.js runs this file in Node next to js/data/gym.js.

// ---------- the muscles you can pick (picker pills and the creator): name → the muscle heads it stands for (HEADS, js/data/gym.js) ----------
// Arms are three muscles here (biceps, triceps, forearms), like the V27 design; abductors is its own muscle only in the creator.
const EXM = { chest: ['chest_upper', 'chest_mid', 'chest_lower'], back: ['lats', 'upper_back', 'traps', 'lower_back'], shoulders: ['delt_front', 'delt_side', 'delt_rear'],
  biceps: ['biceps'], triceps: ['triceps'], forearms: ['forearms'], core: ['abs', 'obliques'],
  quads: ['quads'], hamstrings: ['hamstrings'], glutes: ['glutes', 'abductors'], adductors: ['adductors'], calves: ['calves'], abductors: ['abductors'], cardio: ['cardio'] };
const EXM_UP = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core'], EXM_LOW = ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'];
const CX_MUSCLES = [...EXM_UP, ...EXM_LOW, 'abductors'];   // the creator's muscle pills (V27 order)
const exmCol = k => (GROUPS[k] && GROUPS[k][3]) || HEAD_COL[k] || '#8b949c';   // the app's muscle colour (group colour, or the head's for arms)
const exmHeads = k => EXM[k] || [];
const exmHasHeads = k => exmHeads(k).length > 1;   // chest, back, shoulders, core, glutes offer the head step
const exmOfHead = h => h === 'abductors' ? 'glutes' : Object.keys(EXM).find(k => k !== 'abductors' && EXM[k].includes(h)) || null;
const exmRegion = k => EXM_UP.includes(k) ? 'up' : EXM_LOW.includes(k) || k === 'abductors' ? 'low' : k === 'cardio' ? 'cardio' : 'up';
// an exercise's own picker muscle: your exercise's first (primary) muscle, an arm exercise's head, else its group
const exmOf = x => x && Array.isArray(x.mus) && x.mus.length ? x.mus[0] : x && x.m === 'arms' ? x.h : (x && x.m) || 'other';
// how much of the work a muscle (or one head) does in a built-in exercise, from the library's own percentages. Your own exercises: null (unknown)
const exmUse = (x, k) => x.custom ? null : HEADS[k] && !EXM[k] ? +(x.mu[k] || 0) : exmHeads(k).reduce((a, h) => a + (+(x.mu || {})[h] || 0), 0);

// ---------- Title Case for your own exercise names (stored that way, not only shown) ----------
// Every word starts with a capital, the rest lower case; a word starts after a space, hyphen, slash, bracket, dot or digit run
// (apostrophes stay inside the word: Farmer's). Greek and other scripts too.
const CX_WORD = /(^|[^\p{L}\p{M}\p{N}'’])(\p{L})/gu;
function cxTitle(s){ return String(s ?? '').toLocaleLowerCase().replace(CX_WORD, (m, a, b) => a + b.toLocaleUpperCase()); }
const cxClean = s => cxTitle(String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 60);
// the name box while typing: same rule, the caret stays where it was (not while an input method is still composing a character)
function cxTitleField(el){
  if(!el) return ''; const v = el.value, a = el.selectionStart ?? v.length, b = el.selectionEnd ?? a, out = cxTitle(v);
  if(out !== v){ el.value = out; try{ el.setSelectionRange(cxTitle(v.slice(0, a)).length, cxTitle(v.slice(0, b)).length); }catch(e){} }
  return out;
}

// ---------- your own exercise record (exCustom). Fields older versions read stay as they were; new ones are only added ----------
//   id, en, el, e (equipment), p (movement, for rest times), mu (head → share, see below), h (main head), m (its group), rest, custom: true
//   new (V27): mus = muscles you chose, the first is the primary one · heads = the heads you narrowed to (may be empty) · uni = log each side
//   mu of your own exercise is NOT a measured percentage: it only spreads the work over the muscles you chose (primary 60, the rest 40)
//   so recovery, Swap and suggestions treat them as worked. It is never shown as a number (est: true marks it).
const CX_PATTERN = { chest: 'press_h', back: 'row', shoulders: 'raise', biceps: 'curl', triceps: 'ext', forearms: 'curl', core: 'core_flex',
  quads: 'squat', hamstrings: 'legcurl', glutes: 'hip', adductors: 'hip', abductors: 'hip', calves: 'calf' };
function cxMu(mus, heads){
  const mu = {}, hs = new Set(heads || []), share = mus.length === 1 ? [100] : mus.map((m, i) => i ? 40 / (mus.length - 1) : 60);
  mus.forEach((m, i) => { const all = exmHeads(m), mine = all.filter(h => hs.has(h)), use = mine.length ? mine : all;
    use.forEach(h => { mu[h] = (mu[h] || 0) + share[i] / use.length; }); });
  Object.keys(mu).forEach(h => { mu[h] = Math.max(1, Math.round(mu[h])); });
  return mu;
}
// a checked, complete record from what the creator (or a QR code) gives: { name, mus, heads, e, uni }; null when something needed is missing
function cxRecord(o, id){
  const mus = [...new Set((o.mus || []).filter(m => CX_MUSCLES.includes(m)))].slice(0, CX_MUSCLES.length);
  const heads = [...new Set((o.heads || []).filter(h => HEADS[h] && mus.some(m => exmHeads(m).includes(h) && exmHeads(m).length > 1)))];
  const name = cxClean(o.name);
  if(!name || !mus.length || !EQUIP[o.e]) return null;
  const mu = cxMu(mus, heads), h = Object.entries(mu).sort((a, b) => b[1] - a[1])[0][0];
  return { id: id || null, en: name, el: name, e: o.e, p: CX_PATTERN[mus[0]] || 'press_h', mu, h, m: HEADS[h][2], rest: 90, custom: true, mus, heads, uni: !!o.uni, est: true };
}
// an older own exercise (one head, no muscles list): what it means in the new terms
function cxSpec(c){
  if(Array.isArray(c.mus) && c.mus.length) return { name: c.en || c.el || '', mus: c.mus, heads: c.heads || [], e: c.e, uni: !!c.uni };
  const m = exmOfHead(c.h) || 'chest';
  return { name: c.en || c.el || '', mus: [m], heads: exmHeads(m).length > 1 && c.h ? [c.h] : [], e: c.e, uni: !!c.uni };
}
// the same exercise = same name (any case, extra spaces) + same equipment, muscles, heads and side setting. Different details stay apart.
function cxSig(c){ const s = cxSpec(c); return [cxClean(s.name).toLocaleLowerCase(), s.e || '', s.uni ? 1 : 0, [...s.mus].sort().join('.'), [...s.heads].sort().join('.')].join('|'); }
// on load: names in Title Case in memory (the saved list is rewritten only by the next normal save, never silently here)
const cxRestore = list => (Array.isArray(list) ? list : []).filter(c => c && typeof c === 'object' && c.id).map(c => {
  const en = cxClean(c.en || c.el || ''), el = c.el && c.el !== c.en ? cxClean(c.el) : en; return en === c.en && el === c.el ? c : { ...c, en, el }; });

// ---------- one exercise as a QR code (offline, no personal data) ----------
//   GX1~<name>~<equipment>~<1 = each side>~<muscles, primary first, joined by .>~<heads joined by .>
//   % ~ ; , inside the name are written %25 %7E %3B %2C (as in workout codes). A later layout gets GX2 and its own branch here.
const CX_V = 'GX1', CX_MAX = 600;
const cxEsc = s => String(s ?? '').replace(/[%~;,]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
const cxUnesc = s => String(s ?? '').replace(/%(25|7E|3B|2C)/gi, (m, h) => String.fromCharCode(parseInt(h, 16)));
function cxPack(c){ const s = cxSpec(c); return [CX_V, cxEsc(cxClean(s.name)), s.e, s.uni ? 1 : 0, s.mus.join('.'), s.heads.join('.')].join('~'); }
// → { spec } · { newer: true } (a later app's code) · { error: key } (not one of ours, or broken). Nothing in it is ever run or shown as HTML.
function cxUnpack(str){
  const s = String(str ?? '').trim(), v = s.match(/^GX(\d+)~/);
  if(!v) return { error: 'cxBadCode' };
  if(+v[1] > 1) return { newer: true };
  if(s.length > CX_MAX) return { error: 'cxBadCode' };
  const f = s.split('~'); if(f.length !== 6) return { error: 'cxBadCode' };
  const name = cxClean(cxUnesc(f[1])), mus = f[4] ? f[4].split('.') : [], heads = f[5] ? f[5].split('.') : [];
  if(!name || !EQUIP[f[2]] || !/^[01]$/.test(f[3])) return { error: 'cxBadCode' };
  if(!mus.length || mus.length > CX_MUSCLES.length || new Set(mus).size !== mus.length || mus.some(m => !CX_MUSCLES.includes(m))) return { error: 'cxBadCode' };
  if(heads.length > 20 || new Set(heads).size !== heads.length || heads.some(h => !mus.some(m => exmHeads(m).length > 1 && exmHeads(m).includes(h)))) return { error: 'cxBadCode' };
  return { spec: { name, e: f[2], uni: f[3] === '1', mus, heads } };
}
// add to your list unless the same exercise is already there → { id, added }. list = exCustom; mk = new id
function cxAdopt(list, spec, mk){
  const sig = cxSig(spec), same = list.find(c => c && cxSig(c) === sig);
  if(same) return { id: same.id, added: false };
  const rec = cxRecord(spec, mk()); if(!rec) return null;
  list.push(rec); return { id: rec.id, added: true };
}
