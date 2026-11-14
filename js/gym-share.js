// Share a saved workout as a QR code (0.7.7 gym-qr). No server: the whole workout is packed into the code itself.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// The QR picture is drawn by js/vendor/qrcode.js (qrcode-generator, MIT — licenses/qrcode-generator). Scanning goes through Phone.qrReader().

// ---------- the share code ----------
// Version 1 (never change it — old codes must keep importing; a new layout gets "GB2~" and its own branch in wkUnpack):
//   GB1~<type>~<name>~<exercises>~<own exercises>
//   exercises      ;-separated, each  ref,sets,reps,rest,flags
//                  ref   = built-in exercise id, or !k = the k-th own exercise listed at the end
//                  flags = a capital letter for the superset group (A, B …) and/or u = one side at a time
//   own exercises  ;-separated, each  name,muscle head,equipment,movement,rest
// The characters % ~ ; , inside names and reps are written as %25 %7E %3B %2C. Empty trailing fields are left out.
const WK_V = 'GB1';
const wkEsc = s => String(s ?? '').replace(/[%~;,]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
const wkUnesc = s => String(s ?? '').replace(/%(25|7E|3B|2C)/gi, (m, h) => String.fromCharCode(parseInt(h, 16)));
const wkTrim = a => { while(a.length && (a[a.length - 1] === '' || a[a.length - 1] == null)) a.pop(); return a; };

// tpl = a saved workout; own(id) = that exercise's record when it is one of your own exercises (else null)
function wkPack(tpl, own){
  const ownList = [], ownIdx = new Map(), groups = [];
  const ex = (tpl.exercises || []).map(e => {
    let ref = e.exId; const c = own ? own(e.exId) : null;
    if(c){ if(!ownIdx.has(e.exId)){ ownIdx.set(e.exId, ownList.length); ownList.push(c); } ref = '!' + ownIdx.get(e.exId); }
    let fl = ''; if(e.ss){ if(!groups.includes(e.ss)) groups.push(e.ss); fl += String.fromCharCode(65 + groups.indexOf(e.ss) % 26); } if(e.uni) fl += 'u';
    return wkTrim([ref, e.sets || 3, wkEsc(e.reps), e.rest ?? '', fl]).join(',');
  });
  const mine = ownList.map(c => wkTrim([wkEsc(c.en || c.el || ''), c.h || '', c.e || '', c.p || '', c.rest ?? '']).join(','));
  return wkTrim([WK_V, wkEsc(tpl.type || ''), wkEsc(String(tpl.name || '').slice(0, 60)), ex.join(';'), mine.join(';')]).join('~');
}

// → { name, type, exercises: [{ exId | own, sets, reps, rest, ss (group letter), uni }], own: [{ en, h, e, p, rest }] }
//   { newer: true } for a code from a later app version, null when it isn't a workout code at all
function wkUnpack(str){
  const s = String(str || '').trim(), v = s.match(/^GB(\d+)~/);
  if(!v) return null;
  if(+v[1] > 1) return { newer: true };
  const [, type, name, exs = '', mine = ''] = s.split('~');
  const num = (x, lo, hi, d) => { const n = parseInt(x, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const own = mine ? mine.split(';').slice(0, 40).map(o => { const [en, h, e, p, rest] = o.split(',');
    return { en: wkUnesc(en).slice(0, 60), h: /^[a-z_]+$/.test(h || '') ? h : '', e: /^[a-z]+$/.test(e || '') ? e : '', p: /^[a-z_]+$/.test(p || '') ? p : '', rest: num(rest, 0, 600, 90) }; }) : [];
  const exercises = exs ? exs.split(';').slice(0, 40).map(x => { const [ref, sets, reps, rest, fl = ''] = x.split(','), o = { sets: num(sets, 1, 10, 3), reps: wkUnesc(reps).slice(0, 12) };
    if(/^!\d+$/.test(ref || '')){ const k = +ref.slice(1); if(!own[k]) return null; o.own = k; }
    else if(/^[a-z0-9_]+$/.test(ref || '')) o.exId = ref; else return null;
    if(rest !== undefined && rest !== '') o.rest = num(rest, 0, 600, 90);
    const g = fl.match(/[A-Z]/); if(g) o.ss = g[0]; if(fl.includes('u')) o.uni = true;
    return o; }).filter(Boolean) : [];
  if(!exercises.length) return null;
  return { name: wkUnesc(name).trim().slice(0, 60), type: wkUnesc(type), exercises, own };
}
