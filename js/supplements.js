// Supplements. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// Supplements: name + dose; a Take button logs the time (change it if you took it earlier); take it again later the same day
const takesOf = (d, id) => ((suppLog[d] || {}).takes || {})[id] || [];
function setTakes(d, id, arr){ const day = suppLog[d] = suppLog[d] || {}; day.takes = day.takes || {}; if(arr.length){ day.takes[id] = arr; if(day.ans === 'no') delete day.ans; } else delete day.takes[id]; Store.save('suppLog', suppLog); }   // taking one after saying No takes the No back
// supplements in day order: by Usual Time, those without a time at the end (stable)
const suppsByTime = () => supps.map((s, i) => [s, i]).sort((a, b) => (a[0].usualTime || '99:99').localeCompare(b[0].usualTime || '99:99') || a[1] - b[1]).map(x => x[0]);
function todayProgress(){ const d = todayKey(); return { total: supps.length, done: supps.filter(s => takesOf(d, s.id).length).length }; }

// The daily question on the Supplements page: suppLog[day].ans = 'yes' | 'no' (optional; old days simply have none). Yes logs what is left today
// (same as the Supplements tile); No only records the answer and never deletes a take. The week is Monday to Sunday: a tick = yes, an X = no.
function suppMark(d){ const a = (suppLog[d] || {}).ans, st = suppDayState(d); return a === 'no' ? 'no' : st === 'done' || (a === 'yes' && st !== 'miss') ? 'yes' : ''; }
function suppAnswer(a){
  const d = todayKey(), day = suppLog[d] = suppLog[d] || {};
  if(a === 'no'){ if(day.ans === 'no') delete day.ans; else day.ans = 'no'; }
  else { const tm = nowHM(); fhSuppLeft().forEach(s => { day.takes = day.takes || {}; day.takes[s.id] = [...takesOf(d, s.id), tm].sort(); }); day.ans = 'yes'; }
  Store.save('suppLog', suppLog); Phone.haptic();
}
function renderSuppQ(){
  const box = $('suppQ'); if(!box) return;
  const d0 = todayKey(), ans = (suppLog[d0] || {}).ans, mark = suppMark(d0), wd = t('wdShort').split(' ');
  const dow = (new Date(d0 + 'T12:00:00').getDay() + 6) % 7;   // 0 = Monday
  const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(d0, i - dow), m = d <= d0 ? suppMark(d) : '', lbl = wd[(i + 1) % 7] || '';
    return `<span class="sqd ${m}${i === dow ? ' today' : ''}${d > d0 ? ' future' : ''}"${m ? ` title="${esc(t(m === 'yes' ? 'suppDayYes' : 'suppDayNo'))}"` : ''}><i>${m === 'yes' ? svgIcon('check', 16, 2.6) : m === 'no' ? svgIcon('x', 16, 2.6) : ''}</i><small>${esc(lbl)}</small></span>`; }).join('');
  setHTML(box, `${supps.length ? `<b class="sqq">${esc(t('fhSuppAsk'))}</b>
    <div class="sqbtns"><button type="button" class="pillbtn danger${ans === 'no' ? ' on' : ''}" data-sq="no" aria-pressed="${ans === 'no'}">${esc(t('suppNo'))}</button><button type="button" class="pillbtn primary${mark === 'yes' ? ' on' : ''}" data-sq="yes" aria-pressed="${mark === 'yes'}">${esc(t('suppYesT'))}</button></div>` : ''}
    <div class="sqweek">${week}</div>`);
}

function renderSupps(){
  renderSuppQ();
  const tp = todayProgress(), d = todayKey();
  $('sToday').textContent = `${t('todayLabel')} · ${new Date().toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`;
  $('sTodayN').textContent = tp.total ? t('todayTaken', { a: tp.done, b: tp.total }) : '';
  $('sProg').style.width = tp.total ? `${Math.round(tp.done / tp.total * 100)}%` : '0';
  if(!supps.length){ $('sList').innerHTML = `<div class="empty">${t('noSupps')}</div>`; return; }
  $('sList').innerHTML = suppsByTime().map(s => { const tk = takesOf(d, s.id);
    return `<div class="card supcard" data-sid="${s.id}"><div class="body">
      <div class="row supline"><div class="name"><span class="sic">${svgIcon('capsule', 18, 2)}</span><span class="supnm">${esc(suppName(s))}<small class="rmeta">${fmt(s.dose)} ${esc(unitLabel(s.unit))}</small></span></div><button class="btn small takebtn" data-take>${tk.length ? t('takeAgain') : t('takeIt')}</button></div>
      ${tk.length ? `<div class="takes">${tk.map((tm, i) => `<span class="take"><span>${svgIcon('check', 14, 2.4)}</span><input type="time" value="${tm}" data-tkt="${i}" aria-label="${t('logATime')}"><button data-tkx="${i}" aria-label="${t('logATakeRm')}">${svgIcon('x', 14, 2.4)}</button></span>`).join('')}</div>` : ''}</div></div>`; }).join('');
}

function openSupp(s){
  SU = { id: s ? s.id : null, qid: s ? s.qid || null : null, times: s ? [...s.times] : ['any'], often: s ? s.often : 'daily', icon: s ? s.icon || null : null };
  $('supTitle').textContent = s ? t('editSupp') : t('addSupp');
  $('supQuick').classList.toggle('hide', !!s);
  const have = new Set(supps.map(x => x.qid).filter(Boolean));
  $('supQuickList').innerHTML = QUICK.filter(q => !have.has(q.id)).map(q => `<button data-q="${q.id}">${esc(L(q))}</button>`).join('');
  $('supName').value = s ? suppName(s) : ''; $('supDose').value = s ? s.dose : ''; $('supNotes').value = s ? s.notes || '' : ''; $('supTime').value = s && s.usualTime || '';
  $('supUnit').innerHTML = SUNITS.map(u => { const long = t('ul_' + u); return `<option value="${u}">${esc(unitLabel(u))}${long && long !== 'ul_' + u ? ' · ' + esc(long) : ''}</option>`; }).join('');   // C = capsules, T = tablets, S = scoops, D = drops
  $('supUnit').value = s ? s.unit : 'mg';
  const opts = foods.slice().sort((a,b) => (b.cat === 'supps') - (a.cat === 'supps') || norm(foodName(a)).localeCompare(norm(foodName(b))));
  $('supFood').innerHTML = `<option value="">${t('supLinkNone')}</option>` + opts.map(f => `<option value="${f.id}">${esc(foodName(f))}${f.brand ? ' · ' + esc(f.brand) : ''}</option>`).join('');
  $('supFood').value = s && s.foodId ? s.foodId : '';
  $('supLinkHint').textContent = t('supLinkHint');
  drawSupTimes(); setSeg('#supOften', SU.often);
  $('supDel').classList.toggle('hide', !s);
  open('ovSupp');
}
