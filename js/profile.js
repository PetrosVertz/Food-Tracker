// Profile tab (0.7.7): your circle, Share a Workout, streak, latest PR, leaderboards, stats. Settings opens from the gear (index.html).
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
// Everything here is this phone's own data. Friends, live status and friend boards need accounts (0.8+): only their spaces are drawn.

// The board lifts: one leaderboard row each (lbl = string key of the muscle it stands for). Petros may still change this list.
const BOARD_LIFTS = [
  { id: 'bench', lbl: 'pfMChest' }, { id: 'ohp', lbl: 'pfMShoulders' }, { id: 'pullup', lbl: 'pfMBack' }, { id: 'bb_row', lbl: 'pfMUpperBack' },
  { id: 'squat', lbl: 'pfMQuads' }, { id: 'rdl', lbl: 'pfMHams' }, { id: 'hip_thrust', lbl: 'pfMGlutes' }, { id: 'bb_curl', lbl: 'pfMArms' },
  { id: 'deadlift', lbl: 'pfMBonus', bonus: true },
];

// Best estimated 1RM of one exercise: finished working sets (no warm-ups) with 12 reps or fewer
function bestE1(exId){
  let best = 0;
  sessions.forEach(s => s.exercises.forEach(x => { if(x.exId !== exId) return;
    x.sets.forEach(st => { if(!st.done || st.type === 'W' || st.w === '' || st.r === '' || +st.r > 12) return; const v = e1rm(+st.w, +st.r, exId); if(v > best) best = v; }); }));
  return best;
}

// ---------- profileData(): everything the Profile page shows, in one place ----------
// Gym branches fill in their slot here (streak from gym-streak, tier from gym-tiers); the page markup (renderProfile) stays as it is.
//   streak : { n, color? }               — workouts in the current streak (0 until gym-streak)
//   tierOf : (exId, e1) => null | { label, tier, n, color? }   (0.7.9: drawn as the rank emblem, rankIcon in gym.js)   — the tier badge for a board row (gym-tiers); tierNeed: body weight or sex missing
function profileData(){
  const me = Account.current(), today = todayKey();
  const streak = gymStreak();                              // gym-streak (gym.js)
  // gym-tiers: Bronze 3 … Diamond 1 from tierFor() (gym.js); colour = the tier's theme-aware colour (workout.css --tier-*)
  const tierOf = (exId, e1) => { const tf = tierFor(exId, e1); return tf && tf.label ? { label: tf.label, tier: tf.tier, n: tf.n, color: `var(--tier-${tf.tier})` } : null; };
  // PRs saved with each finished workout (weight PRs carry weight × reps; volume PRs are counted too)
  const prs = sessions.flatMap(s => (s.prs || []).map(p => ({ ...p, date: s.date, start: s.start })));
  const latestPR = prs.filter(p => p.kind === 'w').sort((a, b) => b.start.localeCompare(a.start))[0] || null;
  const wts = Object.entries(weights || {}).filter(([, w]) => +w > 0).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([d, w]) => ({ d, w: +w }));
  return {
    initial: pfInitial(), photo: pfPhoto(),   // 0.7.9: Settings › Photo and Name (ui.js)
    live: !!active, trainedToday: sessions.some(s => s.date === today),
    streak, latestPR, prCount: prs.length,
    tierNeed: !tierBody(),                                // no body weight or sex yet: one line asking for them, no tiers
    boards: BOARD_LIFTS.map(b => { const e1 = bestE1(b.id); return { ...b, e1, tier: e1 ? tierOf(b.id, e1) : null }; }),
    weights: wts,
    totals: {
      workouts: sessions.length,
      sets: sessions.reduce((a, s) => a + s.exercises.reduce((n, x) => n + x.sets.filter(st => st.done && isMainSet(st)).length, 0), 0),
      volume: Math.round(sessions.reduce((a, s) => a + (+s.vol || 0), 0)),
      foodDays: Object.keys(dayLog || {}).filter(d => (dayLog[d] || []).length).length,
    },
  };
}

// small line chart of the latest weigh-ins (theme colours, no labels inside)
function pfWeightChart(pts){
  if(pts.length < 2) return '';
  const W = 300, H = 72, P = 6, ws = pts.map(p => p.w), lo = Math.min(...ws), hi = Math.max(...ws), span = hi - lo || 1;
  const xy = pts.map((p, i) => [P + i * (W - 2 * P) / (pts.length - 1), H - P - (p.w - lo) / span * (H - 2 * P)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(''), [lx, ly] = xy[xy.length - 1];
  return `<svg class="pfchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${line}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5" fill="currentColor"/></svg>`;
}

function renderProfile(){
  const box = $('pfBody'); if(!box) return;
  const d = profileData(), kg = v => `${fmt(Math.round(v * 2) / 2)} kg`, num = n => Number(n).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB');
  const ring = d.live ? 'live' : d.trainedToday ? 'today' : '';
  const circles = `<div class="pfcircles" role="list">
      <div class="pfme ${ring}" role="listitem"><button class="pfav" type="button" data-pfphoto aria-label="${esc(t('stProfile'))}">${d.photo ? `<img class="avimg" src="${d.photo}" alt="">` : d.initial ? esc(d.initial) : svgIcon('user', 34, 1.8)}</button><small>${esc(t('pfYou'))}</small></div>
      <div class="pffr" role="listitem"><span class="pfav">${svgIcon('users', 22, 1.8)}</span><small>${esc(t('pfFriendsSoon'))}</small></div>
    </div>`;
  const pr = d.latestPR ? `<b class="pfbig">${esc(exName(d.latestPR.exId))}</b><span class="pfline">${kg(d.latestPR.w)} × ${d.latestPR.r} · ${esc(fmtDate(d.latestPR.date + 'T12:00:00'))}</span>`
    : `<span class="pfline">${esc(t('pfNoPR'))}</span>`;
  const rows = d.boards.map(b => `<div class="pfrow${b.bonus ? ' bonus' : ''}"><span class="pfrn"><b>${esc(exName(b.id))}</b><small>${esc(t(b.lbl))}</small></span>
      ${b.tier ? `<span class="pftier rk tr-${b.tier.tier}" role="img" aria-label="${esc(b.tier.label)}" title="${esc(b.tier.label)}">${rankIcon(b.tier.tier, b.tier.n, 30)}</span>` : ''}<span class="pfrv">${b.e1 ? kg(b.e1) : '–'}</span></div>`).join('');
  const w = d.weights, wl = w.length ? w[w.length - 1].w : null, wd = w.length > 1 ? Math.round((wl - w[0].w) * 10) / 10 : null;
  const wCard = `<div class="pfcard pfwt"><div class="pfhead"><span>${esc(t('pfWeight'))}</span>${wl ? `<b>${bwOut(wl)} ${bwU()}${wd ? ` <small>${wd > 0 ? '+' : '−'}${bwOut(Math.abs(wd))}</small>` : ''}</b>` : ''}</div>
      ${w.length > 1 ? pfWeightChart(w) : `<span class="pfline">${esc(t('pfNoWeight'))}</span>`}</div>`;
  const stat = (v, k) => `<div><b>${v}</b><small>${esc(t(k))}</small></div>`;
  box.innerHTML = circles
    + `<button class="btn pfshare" type="button" id="pfShare">${svgIcon('share', 18, 2.2)}<span>${esc(t('pfShare'))}</span></button>`
    + `<div class="pfduo"><div class="pfcard pfstreak"><span class="pfic">${flameIcon(d.streak.n, 26)}</span><b class="pfnum">${d.streak.n}</b><small>${esc(t('pfStreak'))}</small></div>
        <div class="pfcard pfpr"><small class="pflab">${svgIcon('medal', 16, 2)}${esc(t('pfLatestPR'))}</small>${pr}</div></div>`
    + `<h3 class="pfh">${svgIcon('podium', 18, 2)}<span>${esc(t('pfBoards'))}</span></h3><p class="pfsub">${esc(t('pfBoardsSub'))}</p>${d.tierNeed ? `<button class="tierneed pfneed" type="button" data-tierbody>${esc(t('tierNeedBody'))}</button>` : ''}<div class="pfcard pfboards">${rows}</div>`
    + `<h3 class="pfh">${svgIcon('progress', 18, 2)}<span>${esc(t('pfStats'))}</span></h3>`
    + wCard
    + `<div class="pfstats">${stat(num(d.prCount), 'pfPRs')}${stat(num(d.totals.workouts), 'pfWorkouts')}${stat(num(d.totals.sets), 'pfSets')}${stat(`${num(d.totals.volume)} <small>kg</small>`, 'pfVolume')}${stat(num(d.totals.foodDays), 'pfFoodDays')}</div>`;
}
