// Gym → Progress (0.6.0): body weight chart, compact weigh-in, strength by muscle. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// Strength by Muscle (Refinements #7): one row per muscle with a trend line, from your estimated one rep max (e1rm).
// A muscle gets ONE reading per workout that trained it: each exercise working it (mu share >= SBM_MIN_SHARE) is compared with
// its own previous workout (best e1rm of its main sets: no warm-ups, drop sets or the other side of L/R), and the muscle's
// estimate moves by the share-weighted average of those changes. An exercise done for the first time only sets its own
// starting point, so a new exercise blends in and never makes the line jump. The first reading is fixed (index 1, in kg the
// share-weighted e1rm of that first workout), so the % (latest vs first) never moves when you add exercises.
// The colour is what is happening NOW: the estimate today vs SBM_WINDOW_DAYS ago, green / red past SBM_MIN_STEP_KG, else gray;
// gray too when the muscle was not trained in that window (not training is not getting weaker).
const SBM_WINDOW_DAYS = 14, SBM_MIN_STEP_KG = 0.5, SBM_MIN_SHARE = 15;
const SBM = { key: null };   // the muscle open in the bigger chart

// the rows: the app's muscle groups, with Arms and Core split into their own muscles (biceps, triceps, forearms, abs, obliques)
function sbmMuscles(){
  return Object.keys(GROUPS).filter(g => g !== 'cardio' && g !== 'other').flatMap(g => { const hs = Object.keys(HEADS).filter(h => HEADS[h][2] === g);
    return g === 'arms' || g === 'core' ? hs.map(h => ({ key: h, heads: [h] })) : [{ key: g, heads: hs }]; }).filter(m => m.heads.length);
}
function sbmSeries(heads){
  const ids = [...new Set(sessions.flatMap(s => s.exercises.map(x => x.exId)))].filter(id => exById(id) && !isCardio(id));
  const ex = [], byT = {};
  ids.forEach(id => { const mu = exById(id).mu || {}, share = heads.reduce((a, h) => a + (+mu[h] || 0), 0); if(share < SBM_MIN_SHARE) return;
    let n = 0; exHistory(id).forEach(h => { const e1 = Math.max(0, ...h.sets.filter(isMainSet).map(st => e1rm(+st.w, +st.r, id)));
      if(e1 > 0){ n++; (byT[h.start] = byT[h.start] || []).push({ id, e1, share }); } });
    if(n) ex.push({ id, share }); });
  const prev = {}, pts = []; let idx = null, base = 0;
  Object.keys(byT).sort().forEach(tk => { const row = byT[tk]; let ws = 0, ls = 0;
    row.forEach(r => { if(prev[r.id]){ ws += r.share; ls += r.share * Math.log(r.e1 / prev[r.id]); } });
    if(idx === null){ idx = 1; base = row.reduce((a, r) => a + r.e1 * r.share, 0) / row.reduce((a, r) => a + r.share, 0); pts.push({ t: tk, kg: base }); }
    else if(ws){ idx *= Math.exp(ls / ws); pts.push({ t: tk, kg: base * idx }); }
    row.forEach(r => { prev[r.id] = r.e1; }); });
  const lastT = Object.keys(byT).sort().pop() || null;
  return { pts, ex: ex.sort((a, b) => b.share - a.share), lastT };
}
function sbmStat(m){
  const s = sbmSeries(m.heads); if(!s.ex.length) return null;
  const p = s.pts, out = { ...m, ...s, name: ML(m.key) }; if(p.length < 2) return out;
  const now = Date.now(), win = SBM_WINDOW_DAYS * 864e5, last = p[p.length - 1];
  out.pct = (last.kg / p[0].kg - 1) * 100;
  const then = p.filter(x => new Date(x.t).getTime() <= now - win).pop() || p[0];
  const d = last.kg - then.kg, fresh = now - new Date(s.lastT).getTime() <= win;
  out.dir = !fresh ? 'flat' : d >= SBM_MIN_STEP_KG ? 'up' : d <= -SBM_MIN_STEP_KG ? 'down' : 'flat';
  return out;
}
// one decimal under 10 %, whole numbers from 10 %; always a sign
const sbmPct = p => { const a = Math.abs(p), v = a < 10 ? Math.round(a * 10) / 10 : Math.round(a); return `${p < 0 && v ? '−' : '+'}${fmt(v)}%`; };
// a smooth curve (Catmull-Rom as cubic Béziers) through the points, no dots, no axes
function sbmPath(p, W, H, pad){
  const t0 = new Date(p[0].t).getTime(), t1 = new Date(p[p.length - 1].t).getTime(), ks = p.map(x => x.kg);
  let lo = Math.min(...ks), hi = Math.max(...ks); if(hi - lo < 1e-6){ lo -= 1; hi += 1; }
  const P = p.map(x => [pad + (W - 2 * pad) * (t1 > t0 ? (new Date(x.t).getTime() - t0) / (t1 - t0) : .5), pad + (H - 2 * pad) * (1 - (x.kg - lo) / (hi - lo))]);
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for(let i = 0; i < P.length - 1; i++){ const a = P[i - 1] || P[i], b = P[i], c = P[i + 1], e = P[i + 2] || c;
    d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`; }
  return { d, lo, hi, P };
}
const sbmArrow = dir => gymIco(dir === 'down' ? 'arrDown' : 'arrUp', 14, 2.4);
function sbmRow(st){
  if(st.pct === undefined) return `<div class="sbmrow nodata"><span class="sbmn">${esc(st.name)}</span><span class="sbmnd">${t('sbmNoData')}</span></div>`;
  const pa = sbmPath(st.pts, 96, 30, 3);
  return `<button class="sbmrow ${st.dir}" type="button" data-sbm="${st.key}"><span class="sbmn">${esc(st.name)}</span>
    <svg class="sbmspark" viewBox="0 0 96 30" aria-hidden="true"><path d="${pa.d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <b class="sbmp">${st.pct < 0 ? sbmArrow('down') : sbmArrow('up')}${sbmPct(st.pct)}</b></button>`;
}
// the bigger chart for one muscle (the sheet ovSbm): the same line, the dates, and the exercises that feed it
function openSbm(key){
  const m = sbmMuscles().find(x => x.key === key), st = m && sbmStat(m); if(!st || st.pct === undefined) return; SBM.key = key;
  const W = 340, H = 170, L = 38, B = 22, T = 10, pa = sbmPath(st.pts, W - L, H - B - T, 6), loc = lang === 'el' ? 'el-GR' : 'en-GB';
  const yv = v => T + 6 + (H - B - T - 12) * (1 - (v - pa.lo) / (pa.hi - pa.lo));
  const ticks = [pa.hi, (pa.hi + pa.lo) / 2, pa.lo].map(v => `<text x="${L - 6}" y="${(yv(v) + 4).toFixed(1)}" text-anchor="end">${fmt(Math.round(bwOut(v)))}</text><line x1="${L}" x2="${W}" y1="${yv(v).toFixed(1)}" y2="${yv(v).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`).join('');
  const P = pa.P, xi = [...new Set([0, Math.round((P.length - 1) / 2), P.length - 1])];
  const xl = xi.map(i => `<text x="${(L + P[i][0]).toFixed(1)}" y="${H - 5}" text-anchor="${i === 0 ? 'start' : i === P.length - 1 ? 'end' : 'middle'}">${esc(new Date(st.pts[i].t).toLocaleDateString(loc, { day: 'numeric', month: 'short' }))}</text>`).join('');
  $('sbmT').textContent = st.name;
  $('sbmBody').innerHTML = `<div class="sbmbig ${st.dir}"><div class="sbmhead"><span><b>${fmt(Math.round(bwOut(st.pts[st.pts.length - 1].kg)))} ${bwU()}</b><small>${t('sbmEst')}</small></span><b class="sbmp">${st.pct < 0 ? sbmArrow('down') : sbmArrow('up')}${sbmPct(st.pct)}</b></div>
    <svg class="wtchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(st.name)}">${ticks}<g transform="translate(${L} ${T})"><path d="${pa.d}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>${xl}</svg></div>
    <h3 class="sect">${t('sbmFeeds')}</h3><div class="sbmex">${st.ex.map(x => `<div class="sbmexr"><span>${esc(exName(x.id))}</span><small>${Math.round(x.share)}%</small></div>`).join('')}</div>
    <p class="hint">${t('sbmHow')}</p>`;
  open('ovSbm');
}

function renderProgress(){
  const el = $('gProgV');
  if(!sessions.length){
    el.innerHTML = `<div class="empty" style="margin-top:10px">${t('progNone')}</div><label for="gLast" style="margin-top:14px">${t('lastTrained')}</label><input id="gLast" type="date" value="${profile.gymLast || ''}" max="${todayKey()}">`;
    return;
  }
  // 0.6.9: strength by muscle unlocks after 10 workouts — before that the numbers are just noise
  const PG_MIN = 10, n = sessions.length;
  if(n < PG_MIN){ el.innerHTML = `<h3 class="sect" style="margin-bottom:0"><span>${t('pgStrength')}</span></h3><div class="pglock">${t('pgLocked', { n: PG_MIN, k: PG_MIN - n })}</div>`; return; }
  const rows = sbmMuscles().map(sbmStat).filter(Boolean);   // never trained: not listed; trained once: "Not Enough Data Yet"
  el.innerHTML = `<h3 class="sect" style="margin-bottom:0"><span>${t('pgStrength')}</span></h3>` +
    (rows.length ? `<div class="sbmlist">${rows.map(sbmRow).join('')}</div>` : `<p class="hint">${t('pgNone')}</p>`);
}

// ---------- body weight chart: zooms out on its own (Refinements) ----------
// From the first weigh-in to the latest: up to BW_DAILY_DAYS = a point per day; up to BW_WEEKLY_DAYS = a point per week
// (the average of that week's weigh-ins, weeks start Monday); longer = a point per month (that month's average).
// A week or month with no weigh-ins simply has no point. The level follows the time span only, never the number of weigh-ins.
const BW_DAILY_DAYS = 28, BW_WEEKLY_DAYS = 183;
function weightPoints(){
  const pts = Object.entries(weights).filter(([, w]) => +w > 0).map(([d, w]) => ({ d, w: +w })).sort((a, b) => a.d.localeCompare(b.d));
  const span = pts.length ? (new Date(pts[pts.length - 1].d + 'T12:00:00') - new Date(pts[0].d + 'T12:00:00')) / 864e5 : 0;
  const level = span <= BW_DAILY_DAYS ? 'day' : span <= BW_WEEKLY_DAYS ? 'week' : 'month', loc = lang === 'el' ? 'el-GR' : 'en-GB';
  const dayLbl = d => new Date(d + 'T12:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  if(level === 'day') return { level, pts: pts.map(p => ({ k: p.d, w: p.w, lbl: dayLbl(p.d) })) };
  const key = d => { if(level === 'month') return d.slice(0, 7);
    const m = new Date(d + 'T12:00:00'); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m.toLocaleDateString('en-CA'); };   // week starts Monday
  const g = {}; pts.forEach(p => { const k = key(p.d); (g[k] = g[k] || []).push(p.w); });
  return { level, pts: Object.keys(g).sort().map(k => ({ k, w: g[k].reduce((a, b) => a + b, 0) / g[k].length,
    lbl: level === 'month' ? new Date(k + '-15T12:00:00').toLocaleDateString(loc, { month: 'short', year: '2-digit' }) : dayLbl(k) })) };
}
function weightChart(){
  const wp = weightPoints(), mode = wp.level, s = wp.pts.map(p => ({ ...p, w: bwOut(p.w) })), all = Object.entries(weights).filter(([, w]) => +w > 0).sort((a, b) => a[0].localeCompare(b[0])).map(([d, w]) => [d, bwOut(w)]);
  const seg = s.length >= 2 ? `<small class="wtlvl">${t({ day: 'wtLvl_day', week: 'wtLvl_week', month: 'wtLvl_month' }[mode])}</small>` : '';
  const last = all.length ? +all[all.length - 1][1] : null, firstW = all.length ? +all[0][1] : null;
  const head = `<div class="wthead"><span><b>${last !== null ? fmt(last) + ' ' + bwU() : '–'}</b>${all.length > 1 ? `<small class="${last - firstW > 0 ? 'up' : last - firstW < 0 ? 'down' : ''}">${last - firstW > 0 ? '+' : ''}${fmt(Math.round((last - firstW) * 10) / 10)} ${bwU()} ${t('wtSince', { d: fmtDate(all[0][0] + 'T12:00:00') })}</small>` : ''}</span>${seg}</div>`;
  if(s.length < 2) return head + `<div class="wtempty">${t('wtNeed')}</div>`;
  const W = 340, H = 150, L = 34, R = 8, T = 10, B = 22, ws = s.map(p => p.w);
  let lo = Math.min(...ws), hi = Math.max(...ws); if(hi - lo < 1){ const m = (hi + lo) / 2; lo = m - .5; hi = m + .5; } const pad = (hi - lo) * .12; lo -= pad; hi += pad;
  const x = i => L + (W - L - R) * (s.length === 1 ? .5 : i / (s.length - 1)), y = w => T + (H - T - B) * (1 - (w - lo) / (hi - lo));
  const line = s.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join('');
  let avg = '';
  if(mode === 'day' && s.length >= 5){   // faint 7-day average: daily weight jumps with water and food, this shows the real trend
    const a = s.map((p, i) => { const win = s.slice(Math.max(0, i - 6), i + 1); return win.reduce((q, z) => q + z.w, 0) / win.length; });
    avg = `<path d="${a.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(w).toFixed(1)}`).join('')}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 4" opacity=".55"/>`;
  }
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad].map(v => `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(Math.round(v * 10) / 10)}</text><line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>`).join('');
  const xi = [...new Set([0, Math.round((s.length - 1) / 2), s.length - 1])];
  const xl = xi.map(i => `<text x="${x(i)}" y="${H - 5}" text-anchor="${i === 0 ? 'start' : i === s.length - 1 ? 'end' : 'middle'}">${esc(s[i].lbl)}</text>`).join('');
  const dots = s.length <= 40 ? s.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.w).toFixed(1)}" r="3" fill="var(--accent)"/>`).join('') : '';
  return head + `<svg class="wtchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('wtChart')}">${ticks}${avg}<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}${xl}</svg>`;
}

// compact weigh-in under the chart
function drawWeigh(){
  const tk = todayKey(); $('wiU').textContent = bwU(); $('wiIn').value = weights[tk] ? bwOut(weights[tk]) : ''; $('wiIn').placeholder = bwOut((targets && targets.bw) || 75);
  const ch = $('gWChart'); if(ch) ch.innerHTML = weightChart();
  $('wiOut').innerHTML = '';   // 0.7.2: the weigh-in is just the title, the kg box and Save (no trend text or advice under it)
}
