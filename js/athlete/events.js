// Athlete OS · events: what changed in the athlete's data, as small structured events. No AI call is ever made here.
// Food Track · Gym Buddy — plain browser script (no build step), loaded after the feature files and before wire/.
//
// Where events come from: Store.onChange (js/platform/store.js) tells us after every SUCCESSFUL save which records were added,
// changed or removed. MAP below turns that into domain events, so no feature file (gym.js, today.js …) has to emit anything:
// finishing a workout saves 'sessions' → 'workout.completed'; logging food saves 'dayLog' → 'nutrition.meal_logged'; and so on.
// The saved data stays the one source of truth; events only say "this changed" so caches can be dropped and the next coach
// request sees the new state.
//
// Event (schema v1)   { v: 1, id, type, at, name, key, src: 'save' | 'import' | 'app' }   + a few ids / dates for that type.
//                     Never food names, notes or message text (events are kept in memory and may be logged).
//   id      stable for the same change (type | record key | record fingerprint), so replaying a change is ignored (dedupe).
//   key     the Store record key: a session id, 'YYYY-MM-DD/entryId' for the diary, a date for weights and schedule, '_' for one-value names.
// Imports (Store.saveMany) become ONE 'data.imported' event per name, not one per record.
// Durable history is not kept here: Store's sync table (Store.meta().upd) already records when each record last changed.

const AthleteEvents = (() => {
  const V = 1, LOG_MAX = 200, SEEN_MAX = 2000;
  const subs = {}, log = [], seen = new Set(), seenQ = [];
  let n = 0, seq = 0;   // n = events delivered since start (tests and the debug view); seq = ids for app events

  // Store name → event type per kind of change (null = no event). '*' = the same type for every kind.
  const MAP = {
    sessions: { added: 'workout.completed', changed: 'workout.edited', removed: 'workout.deleted' },
    active: { '*': 'workout.live_changed' },
    gymPlan: { '*': 'workout.scheduled' },
    days: { '*': 'workout.rescheduled' },
    tpls: { '*': 'workout.templates_changed' }, exCustom: { '*': 'workout.templates_changed' },
    dayLog: { added: 'nutrition.meal_logged', changed: 'nutrition.meal_edited', removed: 'nutrition.meal_deleted' },
    foodFix: { added: 'nutrition.meal_corrected', changed: 'nutrition.meal_corrected', removed: null },
    targets: { '*': 'nutrition.targets_changed' },
    plans: { '*': 'nutrition.plan_changed' },
    weights: { '*': 'athlete.weight_updated' },
    profile: { '*': 'athlete.preference_updated' },
    fridge: { '*': 'kitchen.stock_changed' }, groc: { '*': 'kitchen.stock_changed' },
    foods: { '*': 'food.library_changed' }, meals: { '*': 'food.library_changed' },
    athleteMem: { '*': 'memory.updated' },
  };
  // device-only names that still matter to athlete state (no record diff exists for them)
  const PLAIN = { athleteMem: 'memory.updated', aiKnow: 'patterns.rebuilt' };

  function remember(id){ if(seen.has(id)) return false; seen.add(id); seenQ.push(id); if(seenQ.length > SEEN_MAX) seen.delete(seenQ.shift()); return true; }
  function deliver(ev){
    log.push(ev); if(log.length > LOG_MAX) log.shift(); n++;
    [...(subs[ev.type] || []), ...(subs['*'] || [])].forEach(f => { try{ f(ev); }catch(e){ console.warn('athlete event', ev.type, e); } });
  }
  // emit(type, data, opts) → the event, or null when this exact change was already handled (opts.id given and seen before)
  function emit(type, data, opts){
    opts = opts || {};
    const id = opts.id || `${type}|${Date.now().toString(36)}|${(++seq).toString(36)}`;
    if(!remember(id)) return null;
    const ev = Object.assign({ v: V, id, type, at: Date.now(), src: opts.src || 'app' }, data || {});
    deliver(ev); return ev;
  }
  function on(type, fn){ (subs[type] = subs[type] || []).push(fn); return () => { subs[type] = (subs[type] || []).filter(f => f !== fn); }; }

  // extra fields per type, from the record key only (no record contents)
  function detail(name, key){
    if(name === 'dayLog'){ const i = key.indexOf('/'); return { date: key.slice(0, i), entry: key.slice(i + 1) }; }
    if(name === 'weights' || name === 'days' || name === 'plans') return { date: key };
    if(name === 'sessions') return { session: key };
    return {};
  }

  // Store said: `name` was saved and these records changed
  function fromStore(name, ch, how){
    if(!MAP[name] && !PLAIN[name]) return;
    if(how === 'import'){
      const c = ch ? { added: ch.added.length, changed: ch.changed.length, removed: ch.removed.length } : {};
      if(ch && !c.added && !c.changed && !c.removed) return;
      emit('data.imported', { name, ...c }, { src: 'import' }); return;
    }
    if(!ch){ if(PLAIN[name]) emit(PLAIN[name], { name }, { src: how }); return; }
    const m = MAP[name];
    ['added', 'changed', 'removed'].forEach(kind => {
      const type = kind in m ? m[kind] : m['*']; if(!type) return;
      ch[kind].forEach(([key, f]) => emit(type, { name, key, change: kind, ...detail(name, key) }, { id: `${type}|${name}|${key}|${kind}|${f}`, src: how }));
    });
  }
  if(typeof Store !== 'undefined' && Store.onChange) Store.onChange(fromStore);

  // the last events (newest last), optionally one type or a type prefix ('workout.')
  const recent = (pre, max) => log.filter(e => !pre || e.type === pre || e.type.startsWith(pre)).slice(-(max || 50));
  return { V, on, emit, recent, fromStore, MAP, count: () => n };
})();
