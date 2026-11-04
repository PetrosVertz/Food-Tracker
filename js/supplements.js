// Supplements. (functions only)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

function renderSupps(){
  const tp = todayProgress();
  $('sToday').textContent = `${t('todayLabel')} · ${new Date().toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday:'long', day:'numeric', month:'short' })}`;
  $('sTodayN').textContent = tp.total ? (tp.done === tp.total ? t('allTaken') : t('todayTaken', { a: tp.done, b: tp.total })) : '';
  $('sProg').style.width = tp.total ? `${Math.round(tp.done / tp.total * 100)}%` : '0';
  if(!supps.length){ $('sList').innerHTML = `<div class="empty">${t('noSupps')}</div>`; return; }
  const day = suppLog[todayKey()] || {};
  const order = s => Math.min(...s.times.map(x => SLOTS.indexOf(x)));
  $('sList').innerHTML = supps.slice().sort((a,b) => order(a) - order(b)).map(s => `<div class="card" data-sid="${s.id}">
      <div class="ficon">${suppIcon(s)}</div>
      <div class="body">
        <div class="row"><div class="name">${esc(suppName(s))}</div>${s.often !== 'daily' ? `<span class="tag">${t(s.often === 'training' ? 'tagTraining' : 'tagNeeded')}</span>` : ''}</div>
        <div class="rmeta">${fmt(s.dose)} ${esc(unitLabel(s.unit))}${doseMacros(s)}${s.notes ? ' · ' + esc(s.notes) : ''}</div>
        <div class="slots">${s.times.map(sl => `<button class="slot ${day[`${s.id}|${sl}`] ? 'taken' : ''}" data-slot="${sl}">${day[`${s.id}|${sl}`] ? '✓ ' : ''}${t('slot_' + sl)}</button>`).join('')}</div>
      </div></div>`).join('');
}

function openSupp(s){
  SU = { id: s ? s.id : null, qid: s ? s.qid || null : null, times: s ? [...s.times] : [], often: s ? s.often : 'daily', icon: s ? s.icon || null : null };
  $('supTitle').textContent = s ? t('editSupp') : t('addSupp');
  $('supQuick').classList.toggle('hide', !!s);
  const have = new Set(supps.map(x => x.qid).filter(Boolean));
  $('supQuickList').innerHTML = QUICK.filter(q => !have.has(q.id)).map(q => `<button data-q="${q.id}">${q.icon} ${esc(L(q))}</button>`).join('');
  $('supName').value = s ? suppName(s) : ''; $('supDose').value = s ? s.dose : ''; $('supNotes').value = s ? s.notes || '' : '';
  $('supUnit').innerHTML = SUNITS.map(u => `<option value="${u}">${esc(unitLabel(u))}</option>`).join(''); $('supUnit').value = s ? s.unit : 'mg';
  const opts = foods.slice().sort((a,b) => (b.cat === 'supps') - (a.cat === 'supps') || norm(foodName(a)).localeCompare(norm(foodName(b))));
  $('supFood').innerHTML = `<option value="">${t('supLinkNone')}</option>` + opts.map(f => `<option value="${f.id}">${iconOf(f) || ''} ${esc(foodName(f))}${f.brand ? ' · ' + esc(f.brand) : ''}</option>`).join('');
  $('supFood').value = s && s.foodId ? s.foodId : '';
  $('supLinkHint').textContent = t('supLinkHint');
  drawSupTimes(); setSeg('#supOften', SU.often);
  $('supDel').classList.toggle('hide', !s);
  open('ovSupp');
}
