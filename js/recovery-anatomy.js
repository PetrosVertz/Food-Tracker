// RECOVERY+ anatomy renderer: the approved male / female 2.5D figures (js/data/recovery-anatomy.js), drawn as live SVG regions.
// Used by RECOVERY+ (the page body and the small muscle pictures in its tiles) and, through raExerciseSVG() below, by the exercise
// pictures: picker cards, swap list (miniMap in gym.js) and exercise info. The custom exercise creator (tap muscles to choose them),
// the form figure and rank pictures keep anatomySVG() / gymBodySVG() in gym.js.
//
// recoveryAnatomySVG({
//   sex: 'm' | 'f'            (anything else: male),
//   view: 'front' | 'back' | 'both',
//   colorsByHead: { headId: css colour },  colorsByGroup: { group: css colour }   (head wins; missing = neutral graphite = unknown),
//   only: Set/array of head ids that may be coloured (thumbnails: one group), others stay neutral,
//   crop: [x, y, w, h] in sheet pixels (thumbnails) — only paths that touch the box are drawn,
//   idPrefix: unique per SVG on the page (gradient ids),  maxWidth, label (screen-reader text; none = aria-hidden)
// })
// Layers: (1) every region again, under the others, with a thick near-white stroke: the gaps between regions read as the artwork's fine
// white lines, and the body gets a thin light outline on dark cards; (2) the regions, each filled with its own soft radial gradient
// (lighter centre, darker edge = the ~20% depth of the artwork) in its recovery colour. Colours never cover the lines.
const RA_NEUTRAL = '#3a3a3d', RA_LINE = '#f1f1f1', RA_BODY = '#262628';
// hair, hands and feet are never coloured: drawn as the artwork's own tones, darkest first
const RA_TONES = ['#2b2b2e', '#424246', '#626267', '#97979c', '#e6e6e6'];
const RA_NON_MUSCLE = new Set(['skin', 'hair']);
const RA_HEADS = ['chest_upper', 'chest_mid', 'chest_lower', 'delt_front', 'delt_side', 'delt_rear', 'lats', 'upper_back', 'traps', 'lower_back',
  'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'abductors', 'adductors', 'calves'];
const RA_GROUP = { chest_upper: 'chest', chest_mid: 'chest', chest_lower: 'chest', delt_front: 'shoulders', delt_side: 'shoulders', delt_rear: 'shoulders',
  lats: 'back', upper_back: 'back', traps: 'back', lower_back: 'back', biceps: 'arms', triceps: 'arms', forearms: 'arms', abs: 'core', obliques: 'core',
  quads: 'quads', hamstrings: 'hamstrings', glutes: 'glutes', abductors: 'glutes', adductors: 'adductors', calves: 'calves' };

// bounding box of one path ("Mx y l dx dy … z", relative after the first point), cached
const _raBox = new Map();
function raPathBox(d){
  let b = _raBox.get(d); if(b) return b;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  d.split('z').forEach(sub => { const m = sub.match(/M(-?[\d.]+) (-?[\d.]+)l(.*)/); if(!m) return;
    let x = +m[1], y = +m[2]; const nums = (m[3].match(/-?\d*\.?\d+/g) || []).map(Number);
    const add = () => { if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }; add();
    for(let i = 0; i + 1 < nums.length; i += 2){ x += nums[i]; y += nums[i + 1]; add(); } });
  b = [x0, y0, x1, y1]; _raBox.set(d, b); return b;
}
const raSex = s => s === 'f' ? 'f' : 'm';
// the box around every path of one head (or group) on one figure, in sheet pixels: for thumbnail crops (from the drawn geometry itself)
function raHeadsBox(sex, fig, heads){
  const hs = new Set(heads), F = RA_DATA[raSex(sex)][fig]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  F.p.forEach(([id, d]) => { if(!hs.has(id)) return; const b = raPathBox(d); n++; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); });
  return n ? { box: [x0, y0, x1 - x0, y1 - y0], n, area: (x1 - x0) * (y1 - y0) } : null;
}
// thumbnail crop for a set of heads: the figure side that shows more of them; paired limbs show the right-hand one only (bigger to read)
function raCropFor(sex, heads){
  const S = raSex(sex), cand = ['f', 'b'].map(fig => { const F = RA_DATA[S][fig], hs = new Set(heads);
    const parts = F.p.filter(([id]) => hs.has(id)).map(([, d]) => raPathBox(d)); if(!parts.length) return null;
    const mid = F.box[0] + F.box[2] / 2, area = parts.reduce((a, b) => a + (b[2] - b[0]) * (b[3] - b[1]), 0);
    let use = parts; const right = parts.filter(b => b[0] >= mid - 4), left = parts.filter(b => b[2] <= mid + 4);
    if(right.length && left.length && right.length + left.length === parts.length) use = right;   // two limbs apart: one side only
    const x0 = Math.min(...use.map(b => b[0])), y0 = Math.min(...use.map(b => b[1])), x1 = Math.max(...use.map(b => b[2])), y1 = Math.max(...use.map(b => b[3]));
    return { fig, area, x0, y0, x1, y1 }; }).filter(Boolean);
  if(!cand.length) return null;
  const c = cand.sort((a, b) => b.area - a.area)[0], A = 1.5;   // about the tile picture's shape
  const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
  let w = Math.max(60, (c.x1 - c.x0) * 1.22), h = Math.max(60, (c.y1 - c.y0) * 1.22); w = Math.max(w, h * A); h = Math.max(h, w / A);
  return { fig: c.fig, box: [cx - w / 2, cy - h / 2, w, h] };
}
const raKey = c => String(c).replace(/[^a-z0-9]/gi, '').slice(0, 40) || 'n';
function raGrad(id, col){
  const mix = (p, w) => `color-mix(in srgb,${col} ${p}%,${w})`;
  return `<radialGradient id="${id}" cx=".44" cy=".38" r=".74" fx=".4" fy=".3"><stop offset="0" style="stop-color:${mix(80, '#fff')}"/><stop offset=".58" style="stop-color:${col}"/><stop offset="1" style="stop-color:${mix(64, '#000')}"/></radialGradient>`;
}
function recoveryAnatomySVG(o){
  o = o || {};
  const S = raSex(o.sex), D = RA_DATA[S], view = o.view === 'front' || o.view === 'back' ? o.view : 'both', P = String(o.idPrefix || 'ra').replace(/[^\w-]/g, '');
  const byHead = o.colorsByHead || {}, byGroup = o.colorsByGroup || {}, only = o.only ? new Set(o.only) : null;
  const figs = view === 'front' ? ['f'] : view === 'back' ? ['b'] : ['f', 'b'];
  const colOf = id => { if(RA_NON_MUSCLE.has(id) || (only && !only.has(id))) return RA_NEUTRAL;
    return byHead[id] || byGroup[RA_GROUP[id]] || RA_NEUTRAL; };
  let vb;
  if(o.crop) vb = o.crop;
  else { const bs = figs.map(f => D[f].box), x0 = Math.min(...bs.map(b => b[0])), y0 = Math.min(...bs.map(b => b[1])), x1 = Math.max(...bs.map(b => b[0] + b[2])), y1 = Math.max(...bs.map(b => b[1] + b[3]));
    vb = [x0, y0, x1 - x0, y1 - y0]; }
  const inBox = d => { if(!o.crop) return true; const b = raPathBox(d); return b[2] >= vb[0] && b[0] <= vb[0] + vb[2] && b[3] >= vb[1] && b[1] <= vb[1] + vb[3]; };
  const grads = new Map(), paths = [];
  figs.forEach(f => D[f].p.forEach(([id, d, par]) => { if(!inBox(d)) return; const col = colOf(id), k = raKey(col);
    if(par !== undefined && colOf(D[f].p[par][0]) === col) return;   // a split piece in the same colour as its parent: the parent already shows it, no seam
    if(!grads.has(k)) grads.set(k, raGrad(`${P}g${k}`, col));
    paths.push(`<path d="${d}" fill="url(#${P}g${k})" data-h="${id}"/>`); }));
  const a11y = o.label ? `role="img" aria-label="${String(o.label).replace(/[<>&"]/g, '')}"` : 'aria-hidden="true"';
  const size = o.crop ? `width="${o.w || '100%'}" height="${o.h || '100%'}" preserveAspectRatio="xMidYMid meet"` : `width="100%" style="max-width:${o.maxWidth || 360}px;display:block;margin:0 auto"`;
  const sil = figs.map(f => D[f].sil).join(''), hl = [0, 1, 2].map(i => figs.map(f => D[f].hl[i]).join(''));
  const wl = figs.map(f => D[f].wl).join(''), z = RA_TONES.map((c, i) => [c, figs.map(f => D[f].z[i]).join('')]);
  // 1 light outline (theme: --ra-edge; transparent in Light) · 2 body silhouette · 3 white lines (clipped to the body) + wide white areas · 4 regions · 5 hair / hands / feet tones · 6 highlights
  return `<svg class="ra-svg" viewBox="${vb.map(v => Math.round(v * 10) / 10).join(' ')}" ${size} ${a11y} focusable="false"><defs>${[...grads.values()].join('')}` +
    `<path id="${P}sil" d="${sil}"/><clipPath id="${P}clip"><use href="#${P}sil"/></clipPath></defs>` +
    `<use href="#${P}sil" fill="none" style="stroke:var(--ra-edge,${RA_LINE})" stroke-width="4" stroke-linejoin="round"/>` +
    `<use href="#${P}sil" fill="${RA_BODY}"/>` +
    `<g clip-path="url(#${P}clip)"><use href="#${P}body" stroke="${RA_LINE}" stroke-width="4.5" stroke-linejoin="round"/></g>` +
    `<path d="${wl}" fill="${RA_LINE}"/>` +
    `<g stroke="none"><g id="${P}body">${paths.join('')}</g></g>` +
    z.map(([c, d]) => `<path d="${d}" fill="${c}"/>`).join('') +
    `<g fill="#fff">${hl.map((d, i) => `<path d="${d}" fill-opacity="${[.05, .055, .06][i]}"/>`).join('')}</g></svg>`;
}

// ---------- an exercise on the RECOVERY+ figure (Petros: the picker, swap list and exercise info use the new figures) ----------
// mu: { headId: share 0-100 }. Each worked head in its own muscle colour (colours: { headId: hex }), stronger = works more; the rest
// stays the figure's neutral graphite. o.thumb: one side (the one that shows more of the work) and one half (upper / lower body), cut
// to the card picture's shape (w:h = o.aspect, default .9). Otherwise front and back side by side.
function raMix(hex, p){ const a = String(hex || '').replace('#', ''), b = RA_NEUTRAL.slice(1); if(a.length !== 6) return hex || RA_NEUTRAL;
  const c = i => Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p)).toString(16).padStart(2, '0');
  return '#' + c(0) + c(2) + c(4); }
function raExerciseCols(mu, colours){ const v = Object.entries(mu || {}).filter(([h, n]) => RA_GROUP[h] && +n > 0), max = Math.max(1, ...v.map(([, n]) => +n)), o = {};
  v.forEach(([h, n]) => { o[h] = raMix((colours || {})[h] || '#c6f432', .42 + .58 * Math.min(1, +n / max)); }); return o; }
const RA_LOW = new Set(['quads', 'hamstrings', 'glutes', 'abductors', 'adductors', 'calves']);
function raExerciseSVG(mu, o){
  o = o || {}; const S = raSex(o.sex), cols = raExerciseCols(mu, o.colours), P = o.idPrefix || 'rx';
  if(!o.thumb) return recoveryAnatomySVG({ sex: S, view: 'both', colorsByHead: cols, idPrefix: P, maxWidth: o.maxWidth || 340, label: o.label });
  const D = RA_DATA[S], ids = f => new Set(D[f].p.map(([id]) => id)), w = (f, set) => Object.entries(mu || {}).reduce((a, [h, n]) => a + (set.has(h) ? +n || 0 : 0), 0);
  const F = ids('f'), B = ids('b'), fig = w('f', F) >= w('b', B) ? 'f' : 'b';
  let lo = 0, up = 0; Object.entries(mu || {}).forEach(([h, n]) => { if(RA_LOW.has(h)) lo += +n || 0; else if(RA_GROUP[h]) up += +n || 0; });
  const [bx, by, bw, bh] = D[fig].box, half = lo > up ? [by + bh * .43, bh * .57] : [by, bh * .5], A = o.aspect || .9;
  let cw = bw * 1.04, ch = half[1]; if(cw / ch < A) cw = ch * A; else ch = cw / A;
  const cx = bx + bw / 2, cy = half[0] + half[1] / 2;
  return recoveryAnatomySVG({ sex: S, view: fig === 'f' ? 'front' : 'back', colorsByHead: cols, crop: [cx - cw / 2, cy - ch / 2, cw, ch], idPrefix: P, w: o.w, h: o.h });
}
