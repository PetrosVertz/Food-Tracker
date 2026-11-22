// Share a saved workout as a QR code (0.7.7 gym-qr). No server: the whole workout is packed into the code itself.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// The QR picture is drawn by js/vendor/qrcode.js (qrcode-generator, MIT — licenses/qrcode-generator). Scanning goes through Phone.qrReader().

// ---------- the share code ----------
// Version 1 (never change it — old codes must keep importing; a new layout gets "GB2~" and its own branch in wkUnpack):
//   GB1~<type>~<name>~<exercises>~<own exercises>
//   exercises      ;-separated, each  ref,sets,reps,rest,flags
//                  ref   = built-in exercise id, or !k = the k-th own exercise listed at the end
//                  flags = a capital letter for the superset group (A, B …) and/or u = one side at a time
//   own exercises  ;-separated, each  name,muscle head,equipment,movement,rest[,muscles,heads,u]
//                  V27 adds three fields older apps simply ignore (they split on commas and read the first five):
//                  muscles = the creator's muscles joined by . (primary first) · heads joined by . · u = log each side
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
  const mine = ownList.map(c => { const v2 = Array.isArray(c.mus) && c.mus.length;
    return wkTrim([wkEsc(c.en || c.el || ''), c.h || '', c.e || '', c.p || '', c.rest ?? '', v2 ? c.mus.join('.') : '', v2 ? (c.heads || []).join('.') : '', v2 && c.uni ? 'u' : '']).join(','); });
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
  const own = mine ? mine.split(';').slice(0, 40).map(o => { const [en, h, e, p, rest, mus = '', heads = '', u = ''] = o.split(',');
    const ok = z => /^[a-z_]{2,20}$/.test(z), ms = mus.split('.').filter(ok).slice(0, 14), hs = heads.split('.').filter(ok).slice(0, 20);   // names checked again on import (cxRecord)
    return { en: wkUnesc(en).slice(0, 60), h: /^[a-z_]+$/.test(h || '') ? h : '', e: /^[a-z]+$/.test(e || '') ? e : '', p: /^[a-z_]+$/.test(p || '') ? p : '', rest: num(rest, 0, 600, 90),
      ...(ms.length ? { mus: [...new Set(ms)], heads: [...new Set(hs)], uni: u === 'u' } : {}) }; }) : [];
  const exercises = exs ? exs.split(';').slice(0, 40).map(x => { const [ref, sets, reps, rest, fl = ''] = x.split(','), o = { sets: num(sets, 1, 10, 3), reps: wkUnesc(reps).slice(0, 12) };
    if(/^!\d+$/.test(ref || '')){ const k = +ref.slice(1); if(!own[k]) return null; o.own = k; }
    else if(/^[a-z0-9_]+$/.test(ref || '')) o.exId = ref; else return null;
    if(rest !== undefined && rest !== '') o.rest = num(rest, 0, 600, 90);
    const g = fl.match(/[A-Z]/); if(g) o.ss = g[0]; if(fl.includes('u')) o.uni = true;
    return o; }).filter(Boolean) : [];
  if(!exercises.length) return null;
  return { name: wkUnesc(name).trim().slice(0, 60), type: wkUnesc(type), exercises, own };
}

// ---------- the QR picture: square modules on white with the standard 4-module quiet border ----------
function wkQRSvg(text){
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(), m = 4, d = [];
  for(let r = 0; r < n; r++) for(let c = 0; c < n; c++) if(q.isDark(r, c)) d.push(`M${c + m} ${r + m}h1v1h-1z`);
  return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="${esc(t('wqShowL'))}"><rect width="100%" height="100%" fill="var(--qr-paper)"/><path d="${d.join('')}" fill="var(--qr-ink)"/></svg>`;
}

// your own exercises travel inside the code (the other phone doesn't have them)
const wkOwn = id => { const c = exCustom.find(x => x.id === id); return c ? normEx(c) : null; };

// full-screen QR of one saved workout; the screen stays on while it shows
function openWkQR(tp){
  if(!tp) return;
  $('wqName').textContent = tp.name; $('wqMeta').textContent = t('nEx', { n: tp.exercises.length });
  $('wqSun').innerHTML = gymIco('sun', 18, 2);
  try{ $('wqCode').innerHTML = wkQRSvg(wkPack(tp, wkOwn)); }catch(e){ $('wqCode').innerHTML = `<p class="hint">${esc(t('wqTooBig'))}</p>`; }   // too much for one QR: say so, never crash
  open('ovWkQR'); Phone.keepScreenOn(true);
}

// ---------- Scan a Workout: camera (or a photo) → code → saved workout → Start / Not Now ----------
let WKS = { on: false, loop: 0, stream: null, msg: '' };
// mode 'exercise' (the creator's QR button): the same scanner, titled for one exercise; it reads workout codes too
async function startWkScan(mode){
  stopWkScan(); WKS.msg = null; WKS.mode = mode === 'exercise' ? 'exercise' : 'workout';
  const sh = $('ovWkScan').querySelector('.sheet'); sh.querySelector('h2').textContent = t(WKS.mode === 'exercise' ? 'cxScanT' : 'wsT'); sh.querySelector('.sub').textContent = t(WKS.mode === 'exercise' ? 'cxScanSub' : 'wsSub');
  open('ovWkScan'); wsStatus(t('startingCam'));
  if(!Phone.hasCamera()) return wsStatus(t('wsCamFail'), true);
  try{
    const [det, s] = await Promise.all([Phone.qrReader().catch(e => { e.reader = true; throw e; }), Phone.camera()]);
    if(!$('ovWkScan').classList.contains('open')){ s.getTracks().forEach(tr => tr.stop()); return; }
    WKS.stream = s; const v = $('wsVideo'); v.srcObject = s; await v.play().catch(() => {});
    wsStatus(''); WKS.on = true;
    const tick = async () => {
      if(!WKS.on) return;
      if(!$('ovWkScan').classList.contains('open')) return stopWkScan();
      try{ if(v.readyState >= 2){ const res = await det.detect(v); for(const r of res) if(wkScanned(r.rawValue)) return; } }catch(e){}
      WKS.loop = setTimeout(tick, 120);
    };
    tick();
  }catch(e){
    wsStatus(e && e.reader ? t('wsNoReader') : e && e.name === 'NotAllowedError' ? t('wsCamBlocked') : location.protocol !== 'https:' ? t('wsCamHttps') : t('wsCamFail'), true);
  }
}
function stopWkScan(){ WKS.on = false; clearTimeout(WKS.loop); if(WKS.stream){ WKS.stream.getTracks().forEach(tr => tr.stop()); WKS.stream = null; } const v = $('wsVideo'); if(v) v.srcObject = null; }
function wsStatus(msg, bad){ if(WKS.msg === msg) return; WKS.msg = msg; status($('wsStatus'), msg, bad); }

// a photo of the code (a screenshot someone sent, or when the live camera won't start)
async function wkScanPhoto(file){
  if(!file) return;
  let det; try{ det = await Phone.qrReader(); }catch(e){ return wsStatus(t('wsNoReader'), true); }
  try{ const bmp = await createImageBitmap(file), res = await det.detect(bmp);
    if(!res.some(r => wkScanned(r.rawValue))) wsStatus(t(res.length ? 'wsNotWk' : 'wsNoCode'), true); }
  catch(e){ wsStatus(t('wsNoCode'), true); }
}

// true when this text was a workout (the scan stops); otherwise shows why and keeps looking
function wkScanned(text){
  if(/^GX\d+~/.test(String(text || '').trim())){   // V27: one custom exercise
    const x = cxUnpack(text);
    if(x.newer){ wsStatus(t('wsNewer'), true); return false; }
    if(x.error){ wsStatus(t(x.error), true); return false; }
    stopWkScan(); Phone.vibrate(60); close('ovWkScan'); setTimeout(() => cxScanned(x.spec), 250); return true;
  }
  const d = wkUnpack(text);
  if(!d){ wsStatus(t('wsNotWk'), true); return false; }
  if(d.newer){ wsStatus(t('wsNewer'), true); return false; }
  stopWkScan(); Phone.vibrate(60); close('ovWkScan');
  setTimeout(() => wkImport(d), 250);
  return true;
}

// turn a scanned code into a saved workout (your own exercises are matched by name, or added), then offer to start it
async function wkImport(d){
  // V27: names in Title Case; an own exercise you already have (same name AND same muscles, equipment, sides) is reused, never doubled
  let added = 0;
  const ownIds = d.own.map(o => {
    const h = HEADS[o.h] ? o.h : 'chest_mid', en = cxClean(o.en) || t('wsOwnEx');
    if(o.mus){ const r = cxAdopt(exCustom, { name: en, mus: o.mus, heads: o.heads, e: EQUIP[o.e] ? o.e : 'machine', uni: o.uni }, () => 'c_' + uid());
      if(r){ if(r.added){ added++; const c = exCustom[exCustom.length - 1]; c.rest = o.rest; } return r.id; } }
    const same = exCustom.find(c => !(Array.isArray(c.mus) && c.mus.length) && norm(c.en || '') === norm(en) && (c.h || '') === h);
    if(same) return same.id;
    const x = { id: 'c_' + uid(), en, el: en, e: EQUIP[o.e] ? o.e : 'machine', p: o.p || 'press_h', mu: { [h]: 100 }, h, m: HEADS[h][2], rest: o.rest, custom: true };
    exCustom.push(x); added++; return x.id;
  });
  if(added) saveG('custom');
  const groups = {};
  const exercises = d.exercises.map(e => { const exId = e.own != null ? ownIds[e.own] : e.exId;
    return { exId, sets: e.sets, reps: e.reps, rest: e.rest ?? exById(exId).rest, ...(e.ss ? { ss: groups[e.ss] || (groups[e.ss] = uid()) } : {}), ...(e.uni ? { uni: true } : {}) }; });
  normalizeSS(exercises);
  const type = /^[a-z_]+$/.test(d.type || '') ? d.type : inferType(exercises);
  const tpl = { id: uid(), name: d.name || typeLabel_(type), type, exercises };
  // the same workout scanned twice is kept once
  const code = wkPack(tpl, wkOwn), have = tpls.find(x => x.name === tpl.name && wkPack(x, wkOwn).split('~').slice(3).join('~') === code.split('~').slice(3).join('~'));
  const tp = have || tpl;
  if(!have){ tpls.push(tpl); saveG('tpl'); }
  LIBF.saved = true; renderAll(); Phone.haptic();
  if(await ask(t(have ? 'wsHaveQ' : 'wsSavedQ', { n: tp.name }), t('wsStart'), t('wsNotNow'))){ if(active) return openSession(); startSession(tp); }
}
