// Gym → Progress (0.6.0): body weight chart, compact weigh-in, strength by muscle. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// Strength = volume per working set: weight × reps added up, divided by the number of sets (warm-ups don't count).
// More sets don't inflate it; more weight or more reps do. Each exercise is compared only with its own first workout,
// then a muscle averages its exercises, weighted by how much each exercise works that muscle.

const PG = { open: {} };   // which folds are open (upper, lower, a group, a head)

function setLoad(s){ const w = +s.w || 0, r = +s.r || 0; return w > 0 ? w * r : r; }   // bodyweight moves count reps
function exVps(exId){   // [{ start, vps, n }] per workout, oldest first
  return exHistory(exId).map(h => ({ start: h.start, n: h.sets.length, vps: h.sets.reduce((a, s) => a + setLoad(s), 0) / h.sets.length })).filter(x => x.vps > 0);
}
function exChange(exId){   // % change of volume per set: first workout vs the average of the last two
  const v = exVps(exId); if(v.length < 2) return { pct: null, n: v.length, last: v.length ? v[v.length - 1].start : null };
  const now = v.slice(-2).reduce((a, x) => a + x.vps, 0) / Math.min(2, v.length);
  return { pct: (now / v[0].vps - 1) * 100, n: v.length, last: v[v.length - 1].start };
}
function muscleStats(heads){   // heads: list of head keys → { pct, setsWk, ex: [{ id, pct, n }] }
  const now = Date.now(), MONTH = 28 * 864e5;
  const ids = [...new Set(sessions.flatMap(s => s.exercises.map(x => x.exId)))].filter(id => !isCardio(id) && exById(id));
  let wSum = 0, pSum = 0, sets = 0; const ex = [];
  const first = sessions.length ? Math.min(...sessions.map(s => new Date(s.start).getTime())) : now;
  const weeks = Math.max(1, Math.min(28, (now - first) / 864e5 + 1) / 7);
  ids.forEach(id => {
    const mu = exById(id).mu || {}, share = heads.reduce((a, h) => a + (mu[h] || 0), 0);
    if(share < 15) return;
    const c = exChange(id), recent = c.last && now - new Date(c.last) <= MONTH;
    // sets in the last 4 weeks: a full set when it's a main muscle of the move, half when it helps
    sessions.forEach(s => { if(now - new Date(s.start) > MONTH) return; s.exercises.filter(x => x.exId === id).forEach(x => {
      sets += x.sets.filter(st => st.done && st.type !== 'W').length * (share >= 40 ? 1 : share >= 20 ? .5 : 0); }); });
    if(c.pct !== null){ wSum += share; pSum += c.pct * share; }
    if(recent) ex.push({ id, pct: c.pct, n: c.n, share });
  });
  ex.sort((a, b) => b.share - a.share);
  return { pct: wSum ? pSum / wSum : null, setsWk: sets / weeks, ex, any: ex.length > 0 || wSum > 0 };
}

const pctTxt = p => p === null ? '–' : `${p > 0 ? '+' : ''}${Math.round(p)}%`;
const pctCls = p => p === null ? 'flat' : p >= 1 ? 'up' : p <= -1 ? 'down' : 'flat';

function renderProgress(){
  const el = $('gProgV');
  if(!sessions.length){
    el.innerHTML = `<div class="empty" style="margin-top:10px">${t('progNone')}</div><label for="gLast" style="margin-top:14px">${t('lastTrained')}</label><input id="gLast" type="date" value="${ui.gymLast || ''}" max="${todayKey()}">`;
    return;
  }
  const headsOf = g => Object.keys(HEADS).filter(h => HEADS[h][2] === g);
  const exRows = st => st.ex.length ? `<div class="pgex">${st.ex.map(x => `<div class="pgexr"><span>${esc(exName(x.id))}</span><b class="pct ${pctCls(x.pct)}">${x.pct === null ? `<small>${t('pgOnce')}</small>` : pctTxt(x.pct)}</b></div>`).join('')}</div>`
    : `<div class="pgex"><div class="pgexr"><span class="rmeta">${t('pgNoMonth')}</span></div></div>`;
  const row = (key, label, st, sub, lvl) => { const op = !!PG.open[key];
    return `<button class="pgrow l${lvl} ${op ? 'open' : ''}" data-pg="${key}"><span class="pgn">${esc(label)}<small>${t('pgSets', { n: fmt(Math.round(st.setsWk * 10) / 10) })}</small></span><b class="pct ${pctCls(st.pct)}">${pctTxt(st.pct)}</b><i>›</i></button>` +
      (op ? `<div class="pgsub">${sub()}</div>` : ''); };
  const half = side => Object.keys(GROUPS).filter(g => GROUPS[g][2] === side).map(g => { const hs = headsOf(g); if(!hs.length) return '';
    const st = muscleStats(hs); if(!st.any) return '';
    const sub = hs.length > 1 ? () => hs.map(h => { const sh = muscleStats([h]); return sh.any ? row('h:' + h, HEADS[h][lang === 'el' ? 1 : 0], sh, () => exRows(sh), 2) : ''; }).join('') + exRows(st) : () => exRows(st);
    return row('g:' + g, GROUPS[g][lang === 'el' ? 1 : 0], st, sub, 1); }).join('');
  const fold = (side, label) => { const body = half(side), op = !!PG.open[side];
    return `<button class="foldh ${op ? 'open' : ''}" data-pg="${side}"><b>${label}</b><i>▾</i></button>${op ? `<div class="foldb pglist">${body || `<p class="hint">${t('pgNone')}</p>`}</div>` : ''}`; };
  el.innerHTML = `<h3 class="sect" style="margin-bottom:0"><span>${t('pgStrength')}</span> <button class="ibtn" type="button" data-tip="tipPgVol" aria-label="Info">ⓘ</button></h3>` +
    fold('up', t('pgUpper')) + fold('low', t('pgLower'));
}

// ---------- body weight chart: Day / Week / Month ----------
function weightSeries(mode){
  const pts = Object.entries(weights).filter(([, w]) => +w > 0).map(([d, w]) => ({ d, w: +w })).sort((a, b) => a.d.localeCompare(b.d));
  if(mode === 'day') return pts.slice(-31).map(p => ({ k: p.d, w: p.w, lbl: new Date(p.d + 'T12:00:00').toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' }) }));
  const key = d => { const x = new Date(d + 'T12:00:00'); if(mode === 'month') return d.slice(0, 7);
    const m = new Date(x); m.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return m.toISOString().slice(0, 10); };   // week starts Monday
  const g = {}; pts.forEach(p => { const k = key(p.d); (g[k] = g[k] || []).push(p.w); });
  return Object.keys(g).sort().slice(mode === 'week' ? -26 : -24).map(k => ({ k, w: g[k].reduce((a, b) => a + b, 0) / g[k].length,
    lbl: mode === 'month' ? new Date(k + '-15T12:00:00').toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { month: 'short', year: '2-digit' }) : new Date(k + 'T12:00:00').toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' }) }));
}
function weightChart(){
  const mode = ui.wtMode || 'day', s = weightSeries(mode), all = Object.entries(weights).filter(([, w]) => +w > 0).sort((a, b) => a[0].localeCompare(b[0]));
  const seg = `<div class="seg wtseg">${['day', 'week', 'month'].map(m => `<button data-wt="${m}" class="${m === mode ? 'on' : ''}">${t('wt_' + m)}</button>`).join('')}</div>`;
  const last = all.length ? +all[all.length - 1][1] : null, firstW = all.length ? +all[0][1] : null;
  const head = `<div class="wthead"><span><b>${last !== null ? fmt(last) + ' kg' : '–'}</b>${all.length > 1 ? `<small class="${last - firstW > 0 ? 'up' : last - firstW < 0 ? 'down' : ''}">${last - firstW > 0 ? '+' : ''}${fmt(Math.round((last - firstW) * 10) / 10)} kg ${t('wtSince', { d: fmtDate(all[0][0] + 'T12:00:00') })}</small>` : ''}</span>${seg}</div>`;
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
  const tr = weightTrend(), tk = todayKey(); $('wiIn').value = weights[tk] || ''; $('wiIn').placeholder = (targets && targets.bw) || '75';
  const ch = $('gWChart'); if(ch) ch.innerHTML = weightChart();
  if(!tr){ $('wiOut').innerHTML = `<p class="hint" style="margin:6px 0 0">${t('wiNeed')}</p>`; return; }
  const a = weighAdvice(tr), sg = (tr.perWeek >= 0 ? '+' : '') + tr.perWeek.toFixed(2);
  $('wiOut').innerHTML = `<p class="hint" style="margin:6px 0 0">${t('wiRate', { r: sg, d: tr.days })} · ${a.msg}</p>${a.d && targets ? `<button class="btn small" id="wiApply">${t('wiApply', { d: (a.d > 0 ? '+' : '') + a.d })}</button>` : ''}`;
  const ap = $('wiApply'); if(ap) ap.onclick = () => { ['gym', 'rest'].forEach(k => { if(targets[k]){ targets[k].k = Math.round((targets[k].k + a.d) / 50) * 50; targets[k].c = Math.max(0, Math.round((targets[k].c + a.d / 4) / 5) * 5); } });
    store(TGKEY, targets); renderAll(); drawWeigh(); toast(t('wiApplied', { d: (a.d > 0 ? '+' : '') + a.d })); };
}
