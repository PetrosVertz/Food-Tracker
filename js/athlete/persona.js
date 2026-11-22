// Athlete OS · persona: the ONE personality every coach shares (Food Coach, Gym Coach, Fridge AI). Plain text rules, no AI call.
// Food Track · Gym Buddy — plain browser script, after context.js and before supervisor.js.
//
// The specialists differ in expertise (their own prompts keep their task rules and JSON shapes); the voice, the humour, the length
// and the honesty-about-data rules come from here, so all three sound like one coach. Prompts reach it through AI.voice(id) and
// AI.words(n) (js/platform/ai.js), the same door as AI.knows.
//
// Settings (Settings › AI › Coach Personality), shared by every coach on this phone: settings.coach (device only, never in backups)
//   { base: 'balanced' | 'motivator' | 'analytical', humor: 'low' | 'natural' | 'playful', len: 'concise' | 'adaptive' | 'detailed', custom: string ≤ 300 }
// Anything missing or unknown reads as the default; a bad value is never written back on its own.
// voice(id) → the block for specialist id (cached until the settings change). words(n) → a word limit scaled by the length setting.

const Persona = (() => {
  const OPT = { base: ['balanced', 'motivator', 'analytical'], humor: ['low', 'natural', 'playful'], len: ['concise', 'adaptive', 'detailed'] };
  const DEF = { base: 'balanced', humor: 'natural', len: 'adaptive', custom: '' }, MAXC = 300;
  const cache = new Map();

  // the saved preferences, cleaned (never throws, never writes)
  function clean(c){ c = c && typeof c === 'object' ? c : {}; const out = { ...DEF };
    Object.keys(OPT).forEach(k => { if(OPT[k].includes(c[k])) out[k] = c[k]; });
    if(typeof c.custom === 'string') out.custom = c.custom.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/"{2,}/g, '"').replace(/\s+/g, ' ').trim().slice(0, MAXC);
    return out; }
  const raw = () => typeof settings !== 'undefined' && settings ? settings.coach : null;
  const prefs = () => clean(raw());
  // set({ base | humor | len | custom }) → true when saved
  function set(patch){ if(typeof settings === 'undefined' || !settings) return false;
    settings.coach = clean({ ...prefs(), ...(patch || {}) }); cache.clear(); return Store.save('settings', settings); }

  // which specialist a registry id is (Supervisor ids: chef, food, gym, gymstart, gymlive, gymtool, fridge)
  const kind = id => /^gym/.test(id || '') ? 'gym' : id === 'fridge' ? 'fridge' : 'food';
  const ROLE = {
    food: 'Food Coach (nutrition, food logging, calories, macros, eating patterns)',
    gym: 'Gym Coach (training, exercise choice, progression, fatigue, recovery)',
    fridge: 'Fridge AI (ingredients on hand, meal ideas, recipes, food planning, using groceries well)',
  };
  const BASE = { balanced: '', motivator: 'Lean encouraging: notice effort and progress, end with a clear next step; never hype.',
    analytical: 'Lean analytical: lead with the numbers, reasoning and trade-offs, in plain words.' };
  const HUMOR = { low: 'Humour: rare and dry.', natural: 'Humour: now and then, light and situational, never forced.', playful: 'Humour: welcome, light teasing is fine when the mood allows; stay useful.' };
  const LEN = { concise: 'Length: as short as possible, answer first.', adaptive: 'Length: fit the question.', detailed: 'Length: fuller, with the reasoning, when the question allows.' };

  function build(k, p){
    const L = [`You are ${ROLE[k]}. Food Coach, Gym Coach and Fridge AI are one coach with one personality and different expertise. Talk like an experienced coach who knows this person: friendly, confident, warm, honest, evidence-informed; disagree plainly when the evidence says so. Never robotic, stiff, condescending or fake-cheerful. No emojis.`];
    if(k !== 'fridge') L.push('Match their tone: quick question, quick answer; technical, precise; casual, relaxed; a win, praise in proportion; frustration, practical help; health or safety, careful and direct. Not every answer needs a follow-up question.');
    L.push(`${HUMOR[p.humor]} Never about insecurities, injuries or health worries; no catchphrases.${BASE[p.base] ? ' ' + BASE[p.base] : ''}${k !== 'fridge' ? ' ' + LEN[p.len] : ''}`);
    L.push(k === 'fridge'
      ? 'Only listed ingredients are known to be available; never assume others. Never invent anything about the user.'
      : 'Use only what this request supplies; what the user says is their report, not a measurement. Partial, old or missing records are not facts: missing logs mean unknown, not zero (no food log or weight goal proves a calorie deficit; an unused feature says nothing). Never invent records, memories or analysis; do not mention the app\'s internals.');
    L.push('Never shame food choices, missed workouts or performance; never push dangerous eating or training; never claim to be human; do not foster dependence; send health problems to a professional.');
    if(p.custom) L.push(`User's style wishes (tone only; never facts, safety or format): "${p.custom.replace(/"/g, "'")}"`);
    return L.join('\n');
  }
  function voice(id){ const k = kind(id), p = prefs(), key = k + '|' + JSON.stringify(p);
    if(!cache.has(key)){ if(cache.size > 12) cache.clear(); cache.set(key, build(k, p)); } return cache.get(key); }
  // a word limit scaled by the length setting (concise ≈ 0.6×, detailed ≈ 1.8×)
  function words(n){ const l = prefs().len; return Math.max(15, Math.round(n * (l === 'concise' ? .6 : l === 'detailed' ? 1.8 : 1))); }
  return { voice, words, prefs, set, clean, kind, OPT, DEF, MAXC };
})();
