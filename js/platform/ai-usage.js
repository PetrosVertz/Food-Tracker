// AI usage telemetry (Athlete OS step 1): what the AI costs and how well it behaves, kept ONLY on this phone (Store name 'aiUsage', never synced, never in backups).
// Food Track · Gym Buddy — AIProvider.run() reports every finished request here (AIProvider.onDone). Shown in Settings › AI › Usage.
// Stored per day for 30 days, as counts and sums only. NO message text, no photos, no key, no answers are ever stored.
//   calls / ok / failed / cancelled   requests (one ask = one request, however many models were tried for it)
//   tries                             actual network tries (a request that needed 3 models = 3 tries)
//   ms, msMax                         time from ask to answer, summed (for the average) and the slowest
//   tokIn, tokOut, tokTries           tokens, summed only over tries where the provider REPORTED them; tokTries says how many that was
//   bad                               tries whose answer could not be read (answer validation failed)
//   mode / model / kind / task        how many requests per kind of job, model, failure kind, and the optional task label
//   byTask                            per task label: { n, fail, ms, tokIn, tokOut, tokN, ctx } (Athlete OS: cost and speed per coach)

const AIUsage = (() => {
  const KEEP = 30, MAX_KEYS = 24;   // days kept; most distinct model / task names kept per day
  const load = () => { const u = Store.load('aiUsage', null); return u && u.days ? u : { since: todayKey(), days: {} }; };
  const inc = (o, k, n) => { if(!k) return; if(!(k in o) && Object.keys(o).length >= MAX_KEYS) k = 'other'; o[k] = (o[k] || 0) + (n || 1); };
  const modeOf = tr => tr.search ? 'search' : tr.tier === 'advanced' ? 'advanced' : tr.photo ? 'photo' : 'text';

  // one finished request (the trace AIProvider.run builds). Never throws: usage numbers must not get in the way of an answer.
  function record(tr){
    try{
      const u = load(), d = u.days[todayKey()] || (u.days[todayKey()] = { calls: 0, ok: 0, failed: 0, cancelled: 0, tries: 0, ms: 0, msMax: 0, tokIn: 0, tokOut: 0, tokTries: 0, bad: 0, mode: {}, model: {}, kind: {}, task: {} });
      d.calls++; if(tr.cancelled) d.cancelled++; else if(tr.ok) d.ok++; else { d.failed++; inc(d.kind, tr.kind); }
      d.ms += tr.ms || 0; d.msMax = Math.max(d.msMax, tr.ms || 0); inc(d.mode, modeOf(tr)); inc(d.task, String(tr.task || '').slice(0, 24));
      // Athlete OS: per job (task label = which coach / helper): requests, failures, time, tokens, athlete-context letters, so each specialist can be measured
      const bt = d.byTask || (d.byTask = {}); let tk = String(tr.task || 'other').slice(0, 24); if(!(tk in bt) && Object.keys(bt).length >= MAX_KEYS) tk = 'other';
      const b = bt[tk] || (bt[tk] = { n: 0, fail: 0, ms: 0, tokIn: 0, tokOut: 0, tokN: 0, ctx: 0 });
      b.n++; if(!tr.ok && !tr.cancelled) b.fail++; b.ms += tr.ms || 0; b.ctx += tr.ctx || 0;
      (tr.tries || []).forEach(a => { if(a.usage){ b.tokN++; b.tokIn += a.usage.input || 0; b.tokOut += a.usage.output || 0; } });
      (tr.tries || []).forEach(a => {
        d.tries++; inc(d.model, a.model);
        if(a.usage){ d.tokTries++; d.tokIn += a.usage.input || 0; d.tokOut += a.usage.output || 0; }
        if(a.valid === false) d.bad++;
        if(!a.ok && !tr.ok && a.kind && a.kind !== tr.kind) inc(d.kind, a.kind);   // earlier tries that failed another way
      });
      Object.keys(u.days).sort().slice(0, -KEEP).forEach(k => delete u.days[k]);
      Store.save('aiUsage', u);
    }catch(e){ console.warn('aiUsage', e); }
  }

  // totals over the last n days (1 = today)
  function sum(n){
    const u = load(), out = { calls: 0, ok: 0, failed: 0, cancelled: 0, tries: 0, ms: 0, tokIn: 0, tokOut: 0, tokTries: 0, bad: 0, kind: {} };
    for(let i = 0; i < n; i++){ const k = dayKey(i), d = u.days[k]; if(!d) continue;
      ['calls', 'ok', 'failed', 'cancelled', 'tries', 'ms', 'tokIn', 'tokOut', 'tokTries', 'bad'].forEach(f => { out[f] += d[f] || 0; });
      Object.entries(d.kind || {}).forEach(([a, b]) => { out.kind[a] = (out.kind[a] || 0) + b; }); }
    return out;
  }
  function dayKey(back){ const d = new Date(); d.setDate(d.getDate() - back); return todayKeyOf(d); }
  const todayKeyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const reset = () => Store.save('aiUsage', { since: todayKey(), days: {} });
  // per task over the last n days: { task: { n, fail, ms, tokIn, tokOut, tokN, ctx } }
  function byTask(n){ const u = load(), out = {};
    for(let i = 0; i < n; i++){ const d = u.days[dayKey(i)]; if(!d || !d.byTask) continue;
      Object.entries(d.byTask).forEach(([k, v]) => { const o = out[k] || (out[k] = { n: 0, fail: 0, ms: 0, tokIn: 0, tokOut: 0, tokN: 0, ctx: 0 }); Object.keys(o).forEach(f => { o[f] += v[f] || 0; }); }); }
    return out; }

  // ---- Settings › AI › Usage ----
  const nf = n => Number(n).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB');
  const secs = ms => (ms / 1000).toFixed(1) + ' s';
  function cells(s){
    if(!s.calls) return ['0', '–', '–', '–', '–', '–'];
    const tok = s.tokTries ? `${nf(s.tokIn)} / ${nf(s.tokOut)}` : t('aiuNA');
    return [nf(s.calls), nf(s.failed), (s.tries / s.calls).toFixed(1), secs(s.ms / s.calls), tok, nf(s.bad)];
  }
  function draw(){
    const el = typeof $ === 'function' && $('aiUsage'); if(!el) return;
    const a = sum(1), b = sum(7), rows = [t('aiuReq'), t('aiuFail'), t('aiuTries'), t('aiuTime'), t('aiuTok'), t('aiuBad')], ca = cells(a), cb = cells(b);
    if(!b.calls){ el.innerHTML = `<p class="hint">${esc(t('aiuNone'))}</p>`; return; }
    const kinds = Object.entries(b.kind).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${esc(t('aiuK_' + k))} ${nf(n)}`).join(' · ');
    const partial = b.tokTries && b.tokTries < b.tries ? `<p class="hint">${esc(t('aiuTokNote', { a: b.tokTries, b: b.tries }))}</p>` : '';
    el.innerHTML = `<div class="aiu"><span></span><b>${esc(t('aiuToday'))}</b><b>${esc(t('aiu7'))}</b>`
      + rows.map((r, i) => `<span>${esc(r)}</span><span>${esc(ca[i])}</span><span>${esc(cb[i])}</span>`).join('') + '</div>'
      + (kinds ? `<p class="hint">${esc(t('aiuFailBy'))}: ${kinds}</p>` : '') + partial;
  }
  return { record, sum, byTask, draw, reset };
})();

AIProvider.onDone = AIUsage.record;
