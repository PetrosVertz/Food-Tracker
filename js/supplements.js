// Supplements. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// Supplements: name + dose; a Take button logs the time (change it if you took it earlier); take it again later the same day
const takesOf = (d, id) => ((suppLog[d] || {}).takes || {})[id] || [];
function setTakes(d, id, arr){ const day = suppLog[d] = suppLog[d] || {}; day.takes = day.takes || {}; if(arr.length) day.takes[id] = arr; else delete day.takes[id]; Store.save('suppLog', suppLog); }
function todayProgress(){ const d = todayKey(); return { total: supps.length, done: supps.filter(s => takesOf(d, s.id).length).length }; }

function renderSupps(){
  const tp = todayProgress(), d = todayKey();
  $('sToday').textContent = `${t('todayLabel')} · ${new Date().toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`;
  $('sTodayN').textContent = tp.total ? t('todayTaken', { a: tp.done, b: tp.total }) : '';
  $('sProg').style.width = tp.total ? `${Math.round(tp.done / tp.total * 100)}%` : '0';
  if(!supps.length){ $('sList').innerHTML = `<div class="empty">${t('noSupps')}</div>`; return; }
  $('sList').innerHTML = supps.map(s => { const tk = takesOf(d, s.id);
    return `<div class="card supcard" data-sid="${s.id}"><div class="body">
      <div class="row"><div class="name"><span class="sic">${svgIcon('capsule', 18, 2)}</span>${esc(suppName(s))}</div><span class="rmeta">${fmt(s.dose)} ${esc(unitLabel(s.unit))}</span></div>
      <div class="takes">${tk.map((tm, i) => `<span class="take"><span>${svgIcon('check', 14, 2.4)}</span><input type="time" value="${tm}" data-tkt="${i}" aria-label="${t('logATime')}"><button data-tkx="${i}" aria-label="${t('logATakeRm')}">${svgIcon('x', 14, 2.4)}</button></span>`).join('')}
        <button class="btn small takebtn" data-take>${tk.length ? t('takeAgain') : t('takeIt')}</button></div></div></div>`; }).join('');
}

function openSupp(s){
  SU = { id: s ? s.id : null, qid: s ? s.qid || null : null, times: s ? [...s.times] : ['any'], often: s ? s.often : 'daily', icon: s ? s.icon || null : null };
  $('supTitle').textContent = s ? t('editSupp') : t('addSupp');
  $('supQuick').classList.toggle('hide', !!s);
  const have = new Set(supps.map(x => x.qid).filter(Boolean));
  $('supQuickList').innerHTML = QUICK.filter(q => !have.has(q.id)).map(q => `<button data-q="${q.id}">${esc(L(q))}</button>`).join('');
  $('supName').value = s ? suppName(s) : ''; $('supDose').value = s ? s.dose : ''; $('supNotes').value = s ? s.notes || '' : '';
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
