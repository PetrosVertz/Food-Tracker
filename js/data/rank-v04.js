// Athlete Rank v0.4 benchmark set (data only; the engine is js/rank-v04.js). Versioned: a season freezes the version it started with.
// Sourced = the four anchor lifts' curves in js/data/rank-bench.js (GymStreak CC BY 4.0 + OpenPowerlifting public domain; sex- and
// body-weight-sensitive). Everything else is PROVISIONAL: a stated ratio to a sourced anchor, or a rep table written for this app,
// with its assumption next to it. No proprietary table and no made-up "observed percentiles": replace a provisional row when real data exists.
const RANK04 = {
  version: '0.4.0', reviewed: '2026-11-22',
  sources: {
    anchors: { name: 'RANK_BENCH 1.0.0 (GymStreak 2026 CC BY 4.0; OpenPowerlifting 2026-11-14, public domain)', file: 'js/data/rank-bench.js', licence: 'CC BY 4.0 / public domain' },
    provisional: { name: 'Food Track v0.4 provisional ratios and rep tables', licence: 'app data', note: 'design values checked against the brief\'s sanity cases; not observed percentiles' },
  },
  // the reference lifter's weight at a rep count, as a share of their reference max (reference side only: the user's sets are never turned into a max).
  // upper = presses, pulls, arm work; lower = squat / hinge / lunge (legs keep a larger share at higher reps). Past 20 reps no further credit.
  repTable: {
    upper: [[1, 1], [2, .95], [3, .93], [4, .9], [5, .87], [6, .85], [7, .83], [8, .8], [9, .77], [10, .75], [12, .7], [15, .65], [20, .58]],
    lower: [[1, 1], [2, .955], [3, .93], [4, .905], [5, .88], [6, .86], [8, .82], [10, .77], [12, .73], [15, .68], [20, .61]],
  },
  // equipment that competes, and what the others are (reason codes shown on the card: rankNa_*)
  engines: { b: 'barbell', d: 'dumbbell', k: 'kettlebell', w: 'bodyweight' },
  excluded: { m: 'machine_cable', c: 'machine_cable', e: 'other_equipment' },
  // provisional load rows: id → [anchor, factor, table, protocol]; protocol: bar (weight on the bar) · per_hand (each dumbbell / bell; a pair
  // uses the heavier side when they differ) · single (one dumbbell / bell held with both hands, its own weight). factor × the anchor's target.
  load: {
    // barbell presses (bench / ohp anchors)
    bench: ['bench', 1, 'upper', 'bar', 'sourced'], incline_bench: ['bench', .85, 'upper', 'bar'], decline_bench: ['bench', 1, 'upper', 'bar'], floor_press: ['bench', .9, 'upper', 'bar'],
    close_bench: ['bench', .9, 'upper', 'bar'], reverse_grip_bench: ['bench', .9, 'upper', 'bar'], guillotine_press: ['bench', .7, 'upper', 'bar'],
    ohp: ['ohp', 1, 'upper', 'bar', 'sourced'], push_press: ['ohp', 1.2, 'upper', 'bar'], z_press: ['ohp', .85, 'upper', 'bar'],
    // barbell legs (squat / deadlift anchors)
    squat: ['squat', 1, 'lower', 'bar', 'sourced'], front_squat: ['squat', .8, 'lower', 'bar'], zercher: ['squat', .75, 'lower', 'bar'], safety_bar_squat: ['squat', .9, 'lower', 'bar'],
    box_squat: ['squat', .95, 'lower', 'bar'], pause_squat: ['squat', .85, 'lower', 'bar'], hack_squat_bb: ['squat', .7, 'lower', 'bar'], hip_thrust: ['squat', 1.25, 'lower', 'bar'],
    deadlift: ['deadlift', 1, 'lower', 'bar', 'sourced'], sumo_deadlift: ['deadlift', 1, 'lower', 'bar'], trap_bar_dl: ['deadlift', 1.05, 'lower', 'bar'], rack_pull: ['deadlift', 1.15, 'lower', 'bar'],
    deficit_deadlift: ['deadlift', .9, 'lower', 'bar'], snatch_grip_dl: ['deadlift', .8, 'lower', 'bar'], rdl: ['deadlift', .75, 'lower', 'bar'], good_morning: ['deadlift', .5, 'lower', 'bar'], shrug_bb: ['deadlift', .9, 'upper', 'bar'],
    // barbell back and arms (ratios to bench)
    bb_row: ['bench', .8, 'upper', 'bar'], pendlay_row: ['bench', .75, 'upper', 'bar'], underhand_bb_row: ['bench', .8, 'upper', 'bar'], tbar_row: ['bench', .9, 'upper', 'bar'], seal_row: ['bench', .65, 'upper', 'bar'],
    bb_curl: ['bench', .45, 'upper', 'bar'], ez_curl: ['bench', .43, 'upper', 'bar'], ez_preacher: ['bench', .38, 'upper', 'bar'], reverse_curl: ['bench', .33, 'upper', 'bar'], drag_curl: ['bench', .38, 'upper', 'bar'],
    skullcrusher: ['bench', .4, 'upper', 'bar'], jm_press: ['bench', .55, 'upper', 'bar'], ez_overhead: ['bench', .35, 'upper', 'bar'], upright_row: ['bench', .45, 'upper', 'bar'],
    // dumbbells (per hand)
    db_bench: ['bench', .4, 'upper', 'per_hand'], incline_db: ['bench', .34, 'upper', 'per_hand'], decline_db: ['bench', .4, 'upper', 'per_hand'], hex_press: ['bench', .3, 'upper', 'per_hand'],
    db_fly: ['bench', .22, 'upper', 'per_hand'], incline_db_fly: ['bench', .2, 'upper', 'per_hand'], pullover_db: ['bench', .3, 'upper', 'single'],
    db_shoulder: ['ohp', .4, 'upper', 'per_hand'], seated_db_press: ['ohp', .42, 'upper', 'per_hand'], arnold: ['ohp', .35, 'upper', 'per_hand'], single_arm_db_press: ['ohp', .4, 'upper', 'per_hand'],
    lateral_db: ['ohp', .25, 'upper', 'per_hand'], seated_lateral: ['ohp', .23, 'upper', 'per_hand'], front_raise: ['ohp', .28, 'upper', 'per_hand'], reverse_fly: ['ohp', .2, 'upper', 'per_hand'],
    db_row: ['bench', .4, 'upper', 'per_hand'], chest_supported_row: ['bench', .33, 'upper', 'per_hand'], kroc_row: ['bench', .45, 'upper', 'per_hand'], helms_row: ['bench', .33, 'upper', 'per_hand'],
    db_curl: ['bench', .2, 'upper', 'per_hand'], hammer_curl: ['bench', .22, 'upper', 'per_hand'], incline_curl: ['bench', .17, 'upper', 'per_hand'], concentration: ['bench', .17, 'upper', 'per_hand'],
    spider_curl: ['bench', .16, 'upper', 'per_hand'], zottman: ['bench', .18, 'upper', 'per_hand'], db_overhead: ['bench', .35, 'upper', 'single'], kickback: ['bench', .1, 'upper', 'per_hand'],
    tate_press: ['bench', .15, 'upper', 'per_hand'], db_skullcrusher: ['bench', .17, 'upper', 'per_hand'],
    goblet: ['squat', .45, 'lower', 'single'], sumo_squat_db: ['squat', .45, 'lower', 'single'], bulgarian: ['squat', .3, 'lower', 'per_hand'], lunges: ['squat', .3, 'lower', 'per_hand'],
    reverse_lunge: ['squat', .3, 'lower', 'per_hand'], step_up: ['squat', .28, 'lower', 'per_hand'], db_deadlift: ['deadlift', .35, 'lower', 'per_hand'], db_rdl: ['deadlift', .3, 'lower', 'per_hand'],
    single_leg_rdl: ['deadlift', .22, 'lower', 'per_hand'], shrug_db: ['deadlift', .4, 'upper', 'per_hand'],
    // kettlebells (one bell unless named)
    kb_press: ['ohp', .45, 'upper', 'per_hand'], kb_row: ['bench', .4, 'upper', 'per_hand'], kb_deadlift: ['deadlift', .45, 'lower', 'single'], sumo_squat_kb: ['squat', .45, 'lower', 'single'],
  },
  // a female curve the open data does not have: the female bench curve × the male ohp / bench ratio at the same level (provisional)
  derived: { 'ohp:f': { from: 'bench', ratioOf: ['ohp', 'bench'], sex: 'm' } },
  // bodyweight: reps needed for each level (Bronze III … Diamond I) at the reference body weight (m 70 kg, f 60 kg) with no added weight. A heavier lifter
  // needs fewer: reps × (ref / bw)^k. share = the part of body weight moved (for added-weight targets, worked out on the reference side only).
  // Design check (brief): a 70 kg man doing 9 strict pull-ups = mid-Silver (Silver II).
  bw: {
    pullup: { m: [1, 2, 4, 6, 8, 11, 13, 15, 17, 19, 22, 25, 28, 31, 35], f: [1, 2, 3, 4, 5, 6, 8, 9, 11, 13, 15, 17, 19, 22, 25], k: 1, share: 1 },
    dips: { m: [2, 4, 7, 10, 13, 16, 19, 22, 25, 28, 32, 36, 40, 45, 50], f: [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 20, 23, 26, 30, 34], k: 1, share: .95 },
    pushup: { m: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 57, 64, 72, 80, 90], f: [2, 5, 8, 12, 15, 19, 23, 27, 31, 35, 40, 45, 51, 57, 65], k: .5, share: .65 },
    inverted_row: { m: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 34, 38, 42, 46, 50], f: [2, 4, 6, 8, 10, 12, 15, 18, 21, 24, 27, 30, 34, 38, 42], k: .7, share: .6 },
  },
  // timed holds (dead hang, plank, ...): a SEPARATE rank on time. Seconds needed for each level (Bronze III … Diamond I) at the reference body weight with no
  // extra weight; a heavier lifter needs less (× (ref / bw)^k). A belt / plate adds kg: share = the part of body weight that is held, ep = how fast
  // time falls as the load rises (a bigger ep = a flatter curve; the same Epley-style conversion the rep tables use, with time in seconds). PROVISIONAL
  // design values written for this app (no published percentile table exists for these holds); replace a row when real data does.
  holdBw: (() => { const f = (a, x) => a.map(v => Math.max(1, Math.round(v * x)));
    const T = { deadhang: [8, 15, 20, 30, 40, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240], flexhang: [3, 5, 8, 12, 16, 20, 25, 30, 36, 42, 50, 60, 70, 80, 90],
      plank: [15, 25, 35, 45, 60, 75, 90, 110, 130, 160, 200, 250, 300, 420, 600], sideplank: [10, 15, 20, 30, 40, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240],
      hollow: [10, 15, 20, 30, 40, 50, 60, 75, 90, 105, 120, 150, 180, 210, 240], lsit: [3, 5, 8, 12, 16, 20, 25, 30, 40, 50, 60, 75, 90, 105, 120],
      wallsit: [20, 30, 45, 60, 75, 90, 110, 130, 150, 180, 210, 240, 300, 360, 420] };
    const P = { deadhang: [.8, .7, 1, 60], flexhang: [.6, 1, 1, 30], plank: [.9, .3, .6, 60], sideplank: [.9, .3, .5, 60], hollow: [.9, .4, .6, 60], lsit: [.8, .8, .8, 45], wallsit: [.9, .2, .5, 60] };
    return Object.fromEntries(Object.keys(T).map(k => [k, { m: T[k], f: f(T[k], P[k][0]), k: P[k][1], share: P[k][2], ep: P[k][3], hold: true }])); })(),
  // hold id → [table, time multiplier] (more time needed when the variation is easier)
  holdVar: { dead_hang: ['deadhang', 1], active_hang: ['deadhang', .7], towel_hang: ['deadhang', .55], flexed_arm_hang: ['flexhang', 1], plank: ['plank', 1], reverse_plank: ['plank', .8],
    side_plank: ['sideplank', 1], hollow_hold: ['hollow', 1], lsit: ['lsit', 1], tuck_lsit: ['lsit', 1.8], wall_sit: ['wallsit', 1] },
  // bodyweight variations: [base table, reps multiplier] (more reps needed when easier)
  bwVar: { pullup: ['pullup', 1], chinup: ['pullup', 1.1], wide_pullup: ['pullup', .85], neutral_pullup: ['pullup', 1.05], dips: ['dips', 1], dip_bar_triceps: ['dips', 1],
    pushup: ['pushup', 1], decline_pushup: ['pushup', .85], diamond_pushup: ['pushup', .8], close_pushup: ['pushup', .85], deficit_pushup: ['pushup', .9], incline_pushup: ['pushup', 1.4],
    inverted_row: ['inverted_row', 1] },
  refBw: { m: 70, f: 60 },
  // seasons: two a year, UTC (Jan 1 and Jul 1, 00:00 UTC). A benchmark-only drop at a new season is limited to `protect` levels for an established lifter.
  season: { protect: 2 },
  // ids that look rankable but are not (reason): ballistic / timed / unclear load protocols, and the user's own assisted variants
  prOnly: { kb_swing: 'protocol', kb_two_hand_swing: 'protocol', kb_snatch: 'protocol', kb_clean: 'protocol', farmer: 'protocol', suitcase_carry: 'protocol', kb_carry: 'protocol',
    landmine_press: 'protocol', hk_landmine_press: 'protocol', meadows_row: 'protocol', bb_wrist_curl: 'protocol', wrist_curl: 'protocol', reverse_wrist: 'protocol' },
};
