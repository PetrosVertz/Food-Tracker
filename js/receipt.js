// Receipt camera (0.7.4.3): a scanner-style camera for receipts. A tall receipt-shaped guide frame, auto-capture once the picture is
// steady and sharp (a shutter too), then a clean-up on a canvas: find the receipt's edges, straighten it, greyscale, even out the
// lighting, boost contrast and sharpen. Retake / Add Next Part / Use; long receipts go in parts, top to bottom, read as one receipt.
// The photo of the whole items (Add › Camera) is not this: it keeps the phone's own camera. (functions only; wired in wire/07)

const Rcpt = (() => {
  const R = { stream: null, track: null, timer: 0, parts: [], torch: false, prev: null, still: 0, since: 0, armed: true, busy: false };
  const STEADY = 4, SHARP_OK = .38, BLURRY = .3;   // motion between frames (0–255) / sharpness ratio for auto-capture / too blurry to read

  // ---------- image maths (plain arrays, no libraries) ----------
  const grey = (d, n) => { const g = new Float32Array(n); for(let i = 0, j = 0; i < n; i++, j += 4) g[i] = .299 * d[j] + .587 * d[j + 1] + .114 * d[j + 2]; return g; };
  // box blur with radius r (two passes along x then y, running sums)
  function blur(g, w, h, r){
    const t = new Float32Array(g.length), o = new Float32Array(g.length), k = 2 * r + 1;
    for(let y = 0; y < h; y++){ const row = y * w; let s = 0;
      for(let x = -r; x <= r; x++) s += g[row + Math.min(w - 1, Math.max(0, x))];
      for(let x = 0; x < w; x++){ t[row + x] = s / k; s += g[row + Math.min(w - 1, x + r + 1)] - g[row + Math.max(0, x - r)]; } }
    for(let x = 0; x < w; x++){ let s = 0;
      for(let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for(let y = 0; y < h; y++){ o[y * w + x] = s / k; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
    return o;
  }
  // sharpness: how steep the edges of the print are against their own contrast (about .5 crisp, lower = blurrier; the
  // same whatever the text size), and how much of the picture has print at all (0–1)
  function sharpness(g, w, h){
    const mx = new Float32Array(g.length), mn = new Float32Array(g.length), r = 2;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let hi = 0, lo = 255;
      for(let i = -r; i <= r; i++){ const v = g[y * w + Math.min(w - 1, Math.max(0, x + i))]; if(v > hi) hi = v; if(v < lo) lo = v; }
      mx[y * w + x] = hi; mn[y * w + x] = lo; }
    const hist = new Uint32Array(101); let n = 0;
    for(let y = 1; y < h - 1; y++) for(let x = 1; x < w - 1; x++){ let hi = 0, lo = 255;
      for(let j = -r; j <= r; j++){ const yy = Math.min(h - 1, Math.max(0, y + j)) * w + x; if(mx[yy] > hi) hi = mx[yy]; if(mn[yy] < lo) lo = mn[yy]; }
      const range = hi - lo; if(range < 40) continue; const p = y * w + x;
      const gr = Math.max(Math.abs(g[p + 1] - g[p - 1]), Math.abs(g[p + w] - g[p - w])) / 2;
      hist[Math.min(100, Math.round(gr / range * 100))]++; n++; }
    if(n < 50) return { ratio: 0, detail: n / (w * h) };
    let acc = 0, ratio = 0; for(let i = 100; i >= 0; i--){ acc += hist[i]; if(acc >= n * .05){ ratio = i / 100; break; } }   // the steepest 5 %
    return { ratio, detail: n / (w * h) };
  }
  function otsu(g){
    const hist = new Float64Array(256); g.forEach(v => hist[Math.max(0, Math.min(255, v | 0))]++);
    let sum = 0; for(let i = 0; i < 256; i++) sum += i * hist[i];
    let wB = 0, sB = 0, best = 0, thr = 128;
    for(let i = 0; i < 256; i++){ wB += hist[i]; if(!wB) continue; const wF = g.length - wB; if(!wF) break; sB += i * hist[i];
      const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if(v > best){ best = v; thr = i; } }
    return thr;
  }
  // the receipt: the biggest bright shape in the middle of the picture, its holes (the print) filled in, then its four corners
  function findQuad(g, w, h){
    const s = blur(g, w, h, 1), thr = otsu(s), n = w * h, lab = new Int32Array(n), stack = new Int32Array(n);
    const bright = i => s[i] > thr; let id = 0, pick = 0, pickScore = 0;
    for(let i = 0; i < n; i++){ if(lab[i] || !bright(i)) continue; id++; let sp = 0, area = 0, mid = 0; stack[sp++] = i; lab[i] = id;
      while(sp){ const p = stack[--sp], x = p % w, y = (p / w) | 0; area++;
        if(x > w * .3 && x < w * .7 && y > h * .3 && y < h * .7) mid++;
        if(x > 0 && !lab[p - 1] && bright(p - 1)){ lab[p - 1] = id; stack[sp++] = p - 1; }
        if(x < w - 1 && !lab[p + 1] && bright(p + 1)){ lab[p + 1] = id; stack[sp++] = p + 1; }
        if(y > 0 && !lab[p - w] && bright(p - w)){ lab[p - w] = id; stack[sp++] = p - w; }
        if(y < h - 1 && !lab[p + w] && bright(p + w)){ lab[p + w] = id; stack[sp++] = p + w; } }
      const score = mid * 4 + area; if(score > pickScore){ pickScore = score; pick = id; } }
    if(!pick) return null;
    // fill the holes: everything the outside can't reach without crossing the receipt belongs to it
    const out = new Uint8Array(n); let sp = 0;
    const push = p => { if(!out[p] && lab[p] !== pick){ out[p] = 1; stack[sp++] = p; } };
    for(let x = 0; x < w; x++){ push(x); push((h - 1) * w + x); } for(let y = 0; y < h; y++){ push(y * w); push(y * w + w - 1); }
    while(sp){ const p = stack[--sp], x = p % w, y = (p / w) | 0;
      if(x > 0) push(p - 1); if(x < w - 1) push(p + 1); if(y > 0) push(p - w); if(y < h - 1) push(p + w); }
    let area = 0, tl = [0, 0, 1e9], tr = [0, 0, -1e9], br = [0, 0, -1e9], bl = [0, 0, 1e9], edge = [0, 0, 0, 0];
    for(let p = 0; p < n; p++){ if(out[p]) continue; const x = p % w, y = (p / w) | 0; area++;
      if(x + y < tl[2]) tl = [x, y, x + y]; if(x + y > br[2]) br = [x, y, x + y]; if(x - y > tr[2]) tr = [x, y, x - y]; if(x - y < bl[2]) bl = [x, y, x - y];
      if(y === 0) edge[0]++; if(y === h - 1) edge[1]++; if(x === 0) edge[2]++; if(x === w - 1) edge[3]++; }
    if(area < n * .06) return null;   // nothing receipt-sized
    if(edge[0] > w * .6 && edge[1] > w * .6 && edge[2] > h * .6 && edge[3] > h * .6) return null;   // a bright table: no edges to find
    const q = [tl, tr, br, bl].map(c => [c[0] + .5, c[1] + .5]), qa = polyArea(q);
    if(qa < n * .06 || area / qa < .8 || !convex(q)) return null;   // not a clean four-sided shape
    // a little outwards, so curled corners aren't cut off
    const cx = q.reduce((a, c) => a + c[0], 0) / 4, cy = q.reduce((a, c) => a + c[1], 0) / 4;
    return q.map(([x, y]) => [Math.max(0, Math.min(w, cx + (x - cx) * 1.015)), Math.max(0, Math.min(h, cy + (y - cy) * 1.015))]);
  }
  const polyArea = q => Math.abs(q.reduce((a, c, i) => { const d = q[(i + 1) % q.length]; return a + c[0] * d[1] - d[0] * c[1]; }, 0)) / 2;
  const convex = q => { let sign = 0; for(let i = 0; i < 4; i++){ const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if(Math.abs(z) < 1e-6) return false; if(sign && Math.sign(z) !== sign) return false; sign = Math.sign(z); } return true; };
  // straighten: the unit square onto the four corners (top-left, top-right, bottom-right, bottom-left), sampled smoothly
  function warp(g, w, h, q){
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q, len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let W = Math.round(Math.max(len(q[0], q[1]), len(q[3], q[2]))), H = Math.round(Math.max(len(q[0], q[3]), len(q[1], q[2])));
    const cap = Math.min(1, Math.sqrt(16e6 / (W * H)), 6000 / H); W = Math.max(8, Math.round(W * cap)); H = Math.max(8, Math.round(H * cap));
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    let a, b, c = x0, d, e, f = y0, G = 0, Hh = 0;
    if(Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9){ a = x1 - x0; b = x2 - x1; d = y1 - y0; e = y2 - y1; }
    else { const den = dx1 * dy2 - dx2 * dy1; G = (dx3 * dy2 - dx2 * dy3) / den; Hh = (dx1 * dy3 - dx3 * dy1) / den;
      a = x1 - x0 + G * x1; b = x3 - x0 + Hh * x3; d = y1 - y0 + G * y1; e = y3 - y0 + Hh * y3; }
    const o = new Float32Array(W * H);
    for(let Y = 0; Y < H; Y++){ const v = (Y + .5) / H;
      for(let X = 0; X < W; X++){ const u = (X + .5) / W, z = G * u + Hh * v + 1;
        let sx = (a * u + b * v + c) / z - .5, sy = (d * u + e * v + f) / z - .5;
        sx = Math.max(0, Math.min(w - 1.001, sx)); sy = Math.max(0, Math.min(h - 1.001, sy));
        const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy, p = iy * w + ix;
        o[Y * W + X] = (g[p] * (1 - fx) + g[p + 1] * fx) * (1 - fy) + (g[p + w] * (1 - fx) + g[p + w + 1] * fx) * fy; } }
    return { g: o, w: W, h: H };
  }
  // even lighting (divide by the paper's own brightness, measured in blocks), sharpen, then dark print on white
  function enhance(g, w, h){
    const B = Math.max(12, Math.round(Math.min(w, h * .6) / 40)), gw = Math.ceil(w / B), gh = Math.ceil(h / B);
    let grid = new Float32Array(gw * gh);
    for(let by = 0; by < gh; by++) for(let bx = 0; bx < gw; bx++){ let m = 0;
      for(let y = by * B, ye = Math.min(h, y + B); y < ye; y += 2) for(let x = bx * B, xe = Math.min(w, x + B); x < xe; x += 2){ const v = g[y * w + x]; if(v > m) m = v; }
      grid[by * gw + bx] = m; }
    const dil = new Float32Array(grid.length);   // a block that is all print (a big logo) takes its neighbours' paper
    for(let y = 0; y < gh; y++) for(let x = 0; x < gw; x++){ let m = 0;
      for(let j = -1; j <= 1; j++) for(let i = -1; i <= 1; i++){ const X = x + i, Y = y + j; if(X >= 0 && Y >= 0 && X < gw && Y < gh) m = Math.max(m, grid[Y * gw + X]); }
      dil[y * gw + x] = m; }
    grid = blur(blur(dil, gw, gh, 1), gw, gh, 1);
    const n = new Float32Array(w * h);
    for(let y = 0; y < h; y++){ const gy = Math.max(0, Math.min(gh - 1.001, (y + .5) / B - .5)), iy = gy | 0, fy = gy - iy, iy2 = Math.min(gh - 1, iy + 1);
      for(let x = 0; x < w; x++){ const gx = Math.max(0, Math.min(gw - 1.001, (x + .5) / B - .5)), ix = gx | 0, fx = gx - ix, ix2 = Math.min(gw - 1, ix + 1);
        const bg = (grid[iy * gw + ix] * (1 - fx) + grid[iy * gw + ix2] * fx) * (1 - fy) + (grid[iy2 * gw + ix] * (1 - fx) + grid[iy2 * gw + ix2] * fx) * fy;
        n[y * w + x] = bg < 25 ? 1 : Math.min(1.1, g[y * w + x] / bg); } }
    const r = Math.max(1, Math.round(w / 900)), bl = blur(n, w, h, r);
    const hist = new Uint32Array(256); for(let i = 0; i < n.length; i++) hist[Math.max(0, Math.min(255, (n[i] * 200) | 0))]++;
    let acc = 0, lo = 0; for(let i = 0; i < 256; i++){ acc += hist[i]; if(acc > n.length * .005){ lo = i / 200; break; } }
    lo = Math.min(lo, .45); const hi = .86, out = new Uint8ClampedArray(w * h);
    for(let i = 0; i < n.length; i++){ const s = n[i] + 1.2 * (n[i] - bl[i]); let v = (s - lo) / (hi - lo); v = v <= 0 ? 0 : v >= 1 ? 1 : Math.pow(v, 1.7); out[i] = v * 255; }
    return out;
  }
  // the whole clean-up: src = a canvas with the photo, guide = where the frame was (in photo pixels), or null for the whole photo
  function clean(src, guide){
    const SW = src.width, SH = src.height, gd = guide || { x: 0, y: 0, w: SW, h: SH };
    // look for the receipt a bit beyond the frame
    const ax = Math.max(0, gd.x - gd.w * .25), ay = Math.max(0, gd.y - gd.h * .12), aw = Math.min(SW, gd.x + gd.w * 1.25) - ax, ah = Math.min(SH, gd.y + gd.h * 1.12) - ay;
    const k = 420 / Math.max(aw, ah), sw = Math.max(8, Math.round(aw * k)), sh = Math.max(8, Math.round(ah * k));
    const sc = document.createElement('canvas'); sc.width = sw; sc.height = sh; const sx = sc.getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, ax, ay, aw, ah, 0, 0, sw, sh);
    const sq = findQuad(grey(sx.getImageData(0, 0, sw, sh).data, sw * sh), sw, sh);
    const q = sq ? sq.map(([x, y]) => [ax + x / k, ay + y / k]) : [[gd.x, gd.y], [gd.x + gd.w, gd.y], [gd.x + gd.w, gd.y + gd.h], [gd.x, gd.y + gd.h]];
    // only the part of the photo the receipt covers is read at full size
    const bx = Math.max(0, Math.floor(Math.min(...q.map(p => p[0])))), by = Math.max(0, Math.floor(Math.min(...q.map(p => p[1]))));
    const bw = Math.min(SW, Math.ceil(Math.max(...q.map(p => p[0])))) - bx, bh = Math.min(SH, Math.ceil(Math.max(...q.map(p => p[1])))) - by;
    const g = grey(src.getContext('2d', { willReadFrequently: true }).getImageData(bx, by, bw, bh).data, bw * bh);
    const st = warp(g, bw, bh, q.map(([x, y]) => [x - bx, y - by]));
    const sh_ = sharpness(st.g, st.w, st.h), px = enhance(st.g, st.w, st.h);
    const c = document.createElement('canvas'); c.width = st.w; c.height = st.h; const cx = c.getContext('2d'), im = cx.createImageData(st.w, st.h);
    for(let i = 0, j = 0; i < px.length; i++, j += 4){ im.data[j] = im.data[j + 1] = im.data[j + 2] = px[i]; im.data[j + 3] = 255; }
    cx.putImageData(im, 0, 0);
    return { canvas: c, found: !!sq, sharp: sh_.ratio, detail: sh_.detail, blurry: sh_.ratio < BLURRY || sh_.detail < .07 };
  }

  // ---------- the camera ----------
  const $v = () => $('rcptVideo');
  // where the guide frame sits in the video's own pixels (the video fills the screen, cropped at the sides)
  function guideRect(){
    const v = $v(), vr = v.getBoundingClientRect(), gr = $('rcptGuide').getBoundingClientRect(), vw = v.videoWidth, vh = v.videoHeight;
    const s = Math.max(vr.width / vw, vr.height / vh), ox = (vr.width - vw * s) / 2, oy = (vr.height - vh * s) / 2;
    const x = Math.max(0, (gr.left - vr.left - ox) / s), y = Math.max(0, (gr.top - vr.top - oy) / s);
    return { x, y, w: Math.min(vw - x, gr.width / s), h: Math.min(vh - y, gr.height / s) };
  }
  function hint(k){ const el = $('rcptHint'); const s = k ? t(k) : ''; if(el.textContent !== s) el.textContent = s; el.classList.toggle('show', !!s); }
  const mini = document.createElement('canvas'), crop = document.createElement('canvas');
  function tick(){
    if(!R.stream) return; R.timer = setTimeout(tick, 120);
    const v = $v(); if(v.readyState < 2 || !v.videoWidth || R.busy || !$('rcptView').classList.contains('hide')) return;
    const gd = guideRect();
    // motion and light: a small copy of what's inside the frame
    mini.width = 64; mini.height = Math.max(8, Math.round(64 * gd.h / gd.w)); const mx = mini.getContext('2d', { willReadFrequently: true });
    mx.drawImage(v, gd.x, gd.y, gd.w, gd.h, 0, 0, mini.width, mini.height);
    const m = grey(mx.getImageData(0, 0, mini.width, mini.height).data, mini.width * mini.height);
    let diff = 99, light = 0; m.forEach(x => { light += x; }); light /= m.length;
    if(R.prev && R.prev.length === m.length){ diff = 0; for(let i = 0; i < m.length; i++) diff += Math.abs(m[i] - R.prev[i]); diff /= m.length; }
    R.prev = m;
    // sharpness: the middle of the frame at full size
    const cw = Math.round(Math.min(400, gd.w * .8)), ch = Math.round(Math.min(300, gd.h * .4));
    crop.width = cw; crop.height = ch; const cx = crop.getContext('2d', { willReadFrequently: true });
    cx.drawImage(v, gd.x + (gd.w - cw) / 2, gd.y + (gd.h - ch) / 2, cw, ch, 0, 0, cw, ch);
    const sh = sharpness(grey(cx.getImageData(0, 0, cw, ch).data, cw * ch), cw, ch), now = Date.now();
    if(diff > STEADY){ R.still = 0; R.since = 0; R.armed = true; hint('rcptHold'); return; }
    if(!R.still) R.still = now; if(!R.since) R.since = now;
    const sharp = sh.ratio >= SHARP_OK && sh.detail > .05;
    if(sharp && R.armed && now - R.still > 600){ R.armed = false; shoot(); return; }
    if(!sharp && now - R.since > 2500) hint(light < 70 ? 'rcptLight' : 'rcptCloser'); else hint('rcptHold');
  }
  async function start(){
    $('rcptCam').classList.remove('hide'); $('rcptView').classList.add('hide'); $('ovRcpt').classList.remove('viewing'); $('rcptTorch').classList.add('hide');
    R.prev = null; R.still = R.since = 0; R.armed = true; R.torch = false; $('rcptTorch').classList.remove('on'); drawPartTag();
    if(R.stream){ hint('rcptHold'); clearTimeout(R.timer); tick(); return; }
    hint('startingCam');
    if(!Phone.hasCamera()){ camFail(); return; }
    try{
      const s = await Phone.camera(true);
      if(!$('ovRcpt').classList.contains('open')){ s.getTracks().forEach(tr => tr.stop()); return; }
      R.stream = s; R.track = s.getVideoTracks()[0]; const v = $v(); v.srcObject = s; await v.play().catch(() => {});
      const caps = R.track.getCapabilities ? R.track.getCapabilities() : {};
      try{ if(caps.focusMode && caps.focusMode.includes('continuous')) await R.track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); }catch(e){}
      if(caps.torch) $('rcptTorch').classList.remove('hide');
      hint('rcptHold'); tick();
    }catch(e){ camFail(); }
  }
  // no camera here: the shutter opens the phone's own camera app instead (the photo is still cleaned up)
  function camFail(){ stop(); hint('rcptNoCam'); }
  function stop(){ clearTimeout(R.timer); if(R.stream){ R.stream.getTracks().forEach(tr => tr.stop()); R.stream = null; R.track = null; } const v = $v(); if(v) v.srcObject = null; }
  async function torch(){
    if(!R.track) return; R.torch = !R.torch;
    try{ await R.track.applyConstraints({ advanced: [{ torch: R.torch }] }); $('rcptTorch').classList.toggle('on', R.torch); Phone.haptic(); }catch(e){ R.torch = false; toast(t('lightNA')); }
  }
  // take the picture: the whole video frame at full size, then the clean-up
  function shoot(){
    const v = $v(); if(!R.stream){ $('rcptFile').value = ''; $('rcptFile').click(); return; }
    if(R.busy || !v.videoWidth) return; R.busy = true; Phone.haptic();
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0);
    const gd = guideRect(); $('rcptCam').classList.add('flash'); setTimeout(() => $('rcptCam').classList.remove('flash'), 250);
    setTimeout(() => process(c, gd), 30);
  }
  function process(c, gd){
    let r; try{ r = clean(c, gd); }catch(e){ R.busy = false; toast(t('rcptFail')); return; }
    R.busy = false; R.parts.push(r); view();
  }
  function fromFile(file){
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, 4032 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      process(c, null); };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t('rcptFail')); }; img.src = url;
  }
  function drawPartTag(){ const n = R.parts.length; $('rcptPart').textContent = n ? t('rcptPartN', { n: n + 1 }) : ''; $('rcptPart').classList.toggle('hide', !n); }
  // the cleaned scan: every part top to bottom, Retake (the last part) / Add Next Part / Use
  function view(){
    clearTimeout(R.timer); hint(''); $('rcptCam').classList.add('hide'); $('rcptView').classList.remove('hide'); $('ovRcpt').classList.add('viewing');
    const box = $('rcptImg'); box.innerHTML = '';
    R.parts.forEach(p => { p.canvas.className = 'rcptscan'; box.appendChild(p.canvas); });
    box.scrollTop = box.scrollHeight;
    const last = R.parts[R.parts.length - 1], n = R.parts.length;
    $('rcptCount').textContent = n > 1 ? t('rcptParts', { n }) : '';
    status($('rcptStatus'), last.blurry ? t('rcptBlurry') : !last.found ? t('rcptNoEdges') : '', last.blurry);
    $('rcptUse').disabled = last.blurry; $('rcptRetake').classList.toggle('primary', last.blurry);
  }
  function retake(){ R.parts.pop(); start(); }
  function next(){ start(); }
  // send every part, full size, as one receipt
  function use(){
    const imgs = R.parts.map(p => p.canvas.toDataURL('image/jpeg', .92).split(',')[1]); if(!imgs.length) return;
    R.parts = []; close('ovRcpt'); shopPhoto({ imgs });
  }
  function begin(){ R.parts = []; open('ovRcpt'); start(); }
  return { begin, start, stop, shoot, torch, retake, next, use, fromFile, clean, sharpness, active: () => !!R.stream };
})();
