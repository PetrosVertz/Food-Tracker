# Exercise inventory — Left / Right default, load unit, rep unit

341 built-in exercises · 75 open paired · 29 flagged AMBIGUOUS (equipment setup cannot be told from the catalog; a labelled default is used and the load chip changes it).

Generated from `js/data/gym-lat.js` (the code is the source; `node tools/lat-test.js` checks every built-in ID is covered). Mode P = opens as Left / Right rows, C = one row.

| ID | Exercise | Equip | Mode | Load meaning | n | Reps count | 2nd field | Together/alternating | Ambiguity / note |
|---|---|---|---|---|---|---|---|---|---|
| bench | Bench press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| incline_bench | Incline bench press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| decline_bench | Decline bench press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_bench | Dumbbell bench press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| incline_db | Incline dumbbell press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| decline_db | Decline dumbbell press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| machine_press | Chest press machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| incline_machine | Incline chest press machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| smith_bench | Smith machine bench press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| smith_incline | Smith incline press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| floor_press | Floor press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| cable_fly | Cable fly | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| low_cable_fly | Low-to-high cable fly | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| high_cable_fly | High-to-low cable fly | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| pec_deck | Pec deck | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| db_fly | Dumbbell fly | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| incline_db_fly | Incline dumbbell fly | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| pushup | Push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| decline_pushup | Decline push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| dips | Chest dips | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| machine_dip | Dip machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| landmine_press | Landmine press | barbell | P | bar | 1 | side | reps |  | Landmine: weight is the plates on the bar end; one arm at a time. Barbell equipment but the L | R control must exist |
| svend_press | Plate squeeze press | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| guillotine_press | Guillotine press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| deficit_pushup | Deficit push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| iso_chest_press | Plate-Loaded Chest Press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| iso_incline_press | Plate-Loaded Incline Press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| cable_press | Standing cable chest press | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| cable_crossover | Cable crossover | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| single_arm_cable_fly | Single-arm cable fly | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| decline_cable_fly | Decline cable fly | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| pec_deck_single | Single-arm pec deck | machine | P | stack | 1 | side | reps |  | Machine one limb at a time: stack weight; reps per side |
| incline_pushup | Incline push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| archer_pushup | Archer push-up | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| band_chest_press | Band chest press | band | C | band | 1 | both | reps |  | Band |
| band_chest_fly | Band chest fly | band | C | band | 1 | both | reps |  | Band |
| reverse_grip_bench | Reverse-grip bench press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| hex_press | Hex press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| dumbbell_squeeze_press | Dumbbell squeeze press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| ohp | Overhead press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_shoulder | Dumbbell shoulder press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| arnold | Arnold press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| machine_shoulder | Shoulder press machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| smith_ohp | Smith shoulder press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| push_press | Push press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| z_press | Z press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| lateral_db | Lateral raise | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| cable_lateral | Cable lateral raise | cable | P | stack | 1 | side | reps |  | **AMBIGUOUS: assumes one handle per side; with two handles at once use compact and the dual-stack label** |
| machine_lateral | Lateral raise machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| lean_lateral | Lean-away lateral raise | dumbbell | P | hand | 1 | side | reps |  | One bell, one arm braced; reps per side |
| upright_row | Upright row | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| cable_upright | Cable upright row | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| front_raise | Front raise | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| cable_front_raise | Cable front raise | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS: bar or single handle; type the stack weight. A single handle worked one side at a time can use Left / Right** |
| face_pull | Face pull | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| reverse_fly | Reverse dumbbell fly | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| reverse_pec | Reverse pec deck | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| cable_rear_fly | Cable rear delt fly | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| band_pull_apart | Band pull-apart | band | C | band | 1 | both | reps |  | Band |
| y_raise | Incline Y-raise | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| cuban_press | Cuban press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| lu_raise | Lu raise | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| cable_y_raise | Cable Y-raise | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| hk_landmine_press | Half-kneeling landmine press | barbell | P | bar | 1 | side | reps |  | Landmine: weight is the plates on the bar end; one arm at a time. Barbell equipment but the L | R control must exist |
| btb_cable_lateral | Behind-the-back cable lateral raise | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| single_arm_cable_lateral | Single-arm cable lateral raise | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| seated_lateral | Seated dumbbell lateral raise | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| seated_db_press | Seated dumbbell shoulder press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| single_arm_db_press | Single-arm dumbbell press | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| kb_press | Kettlebell shoulder press | kettlebell | P | hand | 1 | side | reps |  | One kettlebell, one side at a time |
| band_face_pull | Band face pull | band | C | band | 1 | both | reps |  | Band |
| rope_face_pull_high | High face pull | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| prone_y_raise | Prone Y-raise | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| bent_over_lateral | Bent-over lateral raise | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| band_lateral | Band lateral raise | band | C | band | 1 | both | reps |  | Band |
| pike_pushup | Pike push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| handstand_pushup | Handstand push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| plate_front_raise | Plate front raise | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| bb_front_raise | Barbell front raise | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| machine_rear_delt_single | Single-arm rear delt machine | machine | P | stack | 1 | side | reps |  | Machine one limb at a time: stack weight; reps per side |
| deadlift | Deadlift | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| sumo_deadlift | Sumo deadlift | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| trap_bar_dl | Trap bar deadlift | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| rack_pull | Rack pull | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| bb_row | Barbell row | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| pendlay_row | Pendlay row | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| tbar_row | T-bar row | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_row | One-arm dumbbell row | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| chest_supported_row | Chest-supported row | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| seal_row | Seal row | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| seated_row | Seated cable row | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| machine_row | Row machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| meadows_row | Meadows row | barbell | P | bar | 1 | side | reps |  | Landmine: weight is the plates on the bar end; one arm at a time. Barbell equipment but the L | R control must exist |
| inverted_row | Inverted row | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| lat_pulldown | Lat pulldown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| close_pulldown | Close-grip pulldown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| single_pulldown | Single-arm cable pulldown | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| straight_arm | Straight-arm pulldown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| pullover_db | Dumbbell pullover | dumbbell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| pullup | Pull-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| chinup | Chin-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| assisted_pullup | Assisted pull-up machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| hyperextension | Back extension | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| good_morning | Good morning | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| superman | Superman | bodyweight | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| shrug_bb | Barbell shrug | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| shrug_db | Dumbbell shrug | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| farmer | Farmer’s carry | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| kroc_row | Kroc row | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| tbar_chest_supported | Chest-supported T-bar row | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| single_arm_cable_row | Single-arm cable row | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| iso_row | Plate-Loaded Row | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| iso_pulldown | Plate-Loaded Pulldown | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| wide_pulldown | Wide-grip pulldown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| reverse_grip_pulldown | Reverse-grip pulldown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| neutral_pulldown | Neutral-grip pulldown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| wide_pullup | Wide-grip pull-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| neutral_pullup | Neutral-grip pull-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| band_pulldown | Band pulldown | band | C | band | 1 | both | reps |  | Band |
| band_row | Band row | band | C | band | 1 | both | reps |  | Band |
| high_row | High row machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| underhand_bb_row | Underhand barbell row | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| smith_row | Smith machine row | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| helms_row | Helms row | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| cable_shrug | Cable shrug | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| machine_shrug | Shrug machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| smith_shrug | Smith machine shrug | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| deficit_deadlift | Deficit deadlift | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| snatch_grip_dl | Snatch-grip deadlift | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_deadlift | Dumbbell deadlift | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| lat_prayer | Kneeling cable lat prayer | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| machine_pullover | Pullover machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| bench_back_ext | Bench back extension | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| bird_dog | Bird dog | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| bb_curl | Barbell curl | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| ez_curl | EZ-bar curl | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_curl | Dumbbell curl | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| hammer_curl | Hammer curl | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| incline_curl | Incline dumbbell curl | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| concentration | Concentration curl | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| spider_curl | Spider curl | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| cable_curl | Cable curl | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS: bar or single handle; type the stack weight. A single handle worked one side at a time can use Left / Right** |
| bayesian_curl | Bayesian cable curl | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| rope_hammer | Rope hammer curl | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| preacher | Preacher curl machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| ez_preacher | EZ-bar preacher curl | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| reverse_curl | Reverse curl | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| wrist_curl | Wrist curl | dumbbell | C | hand | 1 | both | reps |  | **AMBIGUOUS: one implement assumed; can also be done one side at a time (use Left / Right)** |
| reverse_wrist | Reverse wrist curl | dumbbell | C | hand | 1 | both | reps |  | **AMBIGUOUS: one implement assumed; can also be done one side at a time (use Left / Right)** |
| pushdown | Triceps pushdown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| rope_pushdown | Rope pushdown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| overhead_cable | Overhead cable extension | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| skullcrusher | Skull crusher | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_overhead | Dumbbell overhead extension | dumbbell | C | hand | 1 | both | reps |  | **AMBIGUOUS: one implement assumed; can also be done one side at a time (use Left / Right)** |
| kickback | Triceps kickback | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| jm_press | JM press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| close_bench | Close-grip bench press | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| tri_machine | Triceps machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| bench_dips | Bench dips | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| diamond_pushup | Diamond push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| zottman | Zottman curl | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| drag_curl | Drag curl | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| cross_body_hammer | Cross-body hammer curl | dumbbell | P | hand | 1 | side | reps |  | Alternating: one bell works at a time; reps per side |
| preacher_db | Dumbbell preacher curl | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| seated_db_curl | Seated dumbbell curl | dumbbell | P | hand | 2 | both | reps | asks | Can be simultaneous (2 bells, reps together) or alternating (reps per side): compact mode asks which |
| alt_db_curl | Alternating dumbbell curl | dumbbell | P | hand | 1 | side | reps |  | Alternating: one bell works at a time; reps per side |
| high_cable_curl | High cable curl | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| lying_cable_curl | Lying cable curl | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| reverse_cable_curl | Reverse cable curl | cable | C | stack | 1 | both | reps |  | **AMBIGUOUS dual handles: type the stack weight shown on the machine (not per handle, not doubled)** |
| band_curl | Band curl | band | C | band | 1 | both | reps |  | Band |
| biceps_machine | Biceps curl machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| tate_press | Tate press | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| cross_body_ext | Cross-body triceps extension | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| single_arm_pushdown | Single-arm cable pushdown | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| reverse_pushdown | Reverse-grip pushdown | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| ez_overhead | EZ-bar overhead extension | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_skullcrusher | Dumbbell skull crusher | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| band_pushdown | Band pushdown | band | C | band | 1 | both | reps |  | Band |
| band_overhead_ext | Band overhead extension | band | C | band | 1 | both | reps |  | Band |
| smith_close_bench | Smith close-grip bench press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| dip_bar_triceps | Triceps dips | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| close_pushup | Close-grip push-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| bodyweight_tri_ext | Bodyweight triceps extension | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| wrist_roller | Wrist roller | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| cable_wrist_curl | Cable wrist curl | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| bb_wrist_curl | Barbell wrist curl | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| plate_pinch | Plate pinch hold | bodyweight | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| dead_hang | Dead hang | bodyweight | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| cable_crunch | Cable crunch | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| crunch | Crunch | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| ab_machine | Ab crunch machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| decline_situp | Decline sit-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| leg_raise | Hanging leg raise | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| knee_raise | Captain’s chair knee raise | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| ab_wheel | Ab wheel rollout | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| plank | Plank | bodyweight | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| side_plank | Side plank | bodyweight | P | bw | 1 | side | sec |  | Side hold per side; time is kept in the reps field as before |
| dead_bug | Dead bug | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| hollow_hold | Hollow hold | bodyweight | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| dragon_flag | Dragon flag | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| russian_twist | Russian twist | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| woodchop | Cable woodchop | cable | P | stack | 1 | side | reps |  | Single cable handle; reps per side |
| pallof | Pallof press | cable | P | stack | 1 | side | reps |  | Single cable handle; reps per side |
| lsit | L-sit | bodyweight | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| hanging_knee_raise | Hanging knee raise | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| toes_to_bar | Toes-to-bar | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| kneeling_cable_crunch | Kneeling cable crunch | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| oblique_cable_crunch | Cable oblique crunch | cable | P | stack | 1 | side | reps |  | Single cable handle; reps per side |
| bicycle_crunch | Bicycle crunch | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| reverse_crunch | Reverse crunch | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| mountain_climber | Mountain climber | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| bear_crawl | Bear crawl | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| pallof_hold | Pallof hold | cable | P | stack | 1 | side | sec |  | Hold per side; time is kept in the reps field as before |
| suitcase_carry | Suitcase carry | dumbbell | P | hand | 1 | side | reps |  | One bell in one hand; the reps field keeps its existing meaning |
| landmine_twist | Landmine twist | barbell | C | bar | 1 | both | reps |  | Continuous alternating twist: reps are the total; weight is the bar end plates |
| side_bend | Dumbbell side bend | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| v_up | V-up | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| plank_shoulder_tap | Plank shoulder tap | bodyweight | C | bw | 1 | both | reps |  | Continuous alternating drill: reps are the natural total across both sides |
| ab_wheel_standing | Standing ab wheel rollout | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| squat | Back squat | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| front_squat | Front squat | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| zercher | Zercher squat | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| smith_squat | Smith machine squat | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| hack_squat | Hack squat | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| pendulum_squat | Pendulum squat | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| belt_squat | Belt squat | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| leg_press | Leg press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| single_leg_press | Single-leg press | machine | P | stack | 1 | side | reps |  | Machine one limb at a time: stack weight; reps per side |
| goblet | Goblet squat | dumbbell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| sissy_squat | Sissy squat | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| spanish_squat | Spanish squat | band | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| wall_sit | Wall sit | bodyweight | C | bw | 1 | both | sec |  | Hold; time is kept in the reps field as before |
| bulgarian | Bulgarian split squat | dumbbell | P | hand | 2 | side | reps |  | **AMBIGUOUS: one working leg with 1 or 2 bells; default 2 bells, change with the load chip. Weight typed is per bell; reps per leg** |
| lunges | Walking lunges | dumbbell | P | hand | 2 | side | reps |  | **AMBIGUOUS: one working leg with 1 or 2 bells; default 2 bells, change with the load chip. Weight typed is per bell; reps per leg** |
| reverse_lunge | Reverse lunge | dumbbell | P | hand | 2 | side | reps |  | **AMBIGUOUS: one working leg with 1 or 2 bells; default 2 bells, change with the load chip. Weight typed is per bell; reps per leg** |
| step_up | Step-up | dumbbell | P | hand | 2 | side | reps |  | **AMBIGUOUS: one working leg with 1 or 2 bells; default 2 bells, change with the load chip. Weight typed is per bell; reps per leg** |
| leg_ext | Leg extension | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| hack_squat_bb | Barbell hack squat | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| reverse_hack | Reverse hack squat | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| safety_bar_squat | Safety bar squat | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| box_squat | Box squat | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| pause_squat | Pause squat | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| cossack | Cossack squat | bodyweight | P | bw | 1 | side | reps |  | Bodyweight (added weight / assistance as before); reps per side |
| step_down | Step-down | bodyweight | P | bw | 1 | side | reps |  | Bodyweight (added weight / assistance as before); reps per side |
| lateral_lunge | Lateral lunge | dumbbell | P | hand | 2 | side | reps |  | **AMBIGUOUS: one working leg with 1 or 2 bells; default 2 bells, change with the load chip. Weight typed is per bell; reps per leg** |
| curtsy_lunge | Curtsy lunge | dumbbell | P | hand | 2 | side | reps |  | **AMBIGUOUS: one working leg with 1 or 2 bells; default 2 bells, change with the load chip. Weight typed is per bell; reps per leg** |
| smith_split_squat | Smith machine split squat | machine | P | bar | 1 | side | reps |  | Shared Smith bar: weight is the bar total; reps per leg |
| front_foot_split | Front-foot elevated split squat | dumbbell | P | hand | 2 | side | reps |  | **AMBIGUOUS: one working leg with 1 or 2 bells; default 2 bells, change with the load chip. Weight typed is per bell; reps per leg** |
| pistol_squat | Pistol squat | bodyweight | P | bw | 1 | side | reps |  | Bodyweight (added weight / assistance as before); reps per side |
| jump_squat | Jump squat | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| box_jump | Box jump | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| sled_leg_press_45 | 45° leg press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| horizontal_leg_press | Horizontal leg press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| single_leg_ext | Single-leg extension | machine | P | stack | 1 | side | reps |  | Machine one limb at a time: stack weight; reps per side |
| reverse_nordic | Reverse Nordic | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| jefferson_curl | Jefferson curl | dumbbell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| smith_rdl | Smith machine Romanian deadlift | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| sl_lying_curl | Single-leg lying curl | machine | P | stack | 1 | side | reps |  | Machine one limb at a time: stack weight; reps per side |
| band_leg_curl | Band leg curl | band | C | band | 1 | both | reps |  | Band |
| swiss_ball_curl | Stability-ball leg curl | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| slider_curl | Slider leg curl | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| single_leg_hip_thrust | Single-leg hip thrust | bodyweight | P | bw | 1 | side | reps |  | Bodyweight (added weight / assistance as before); reps per side |
| db_hip_thrust | Dumbbell hip thrust | dumbbell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| smith_hip_thrust | Smith machine hip thrust | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| banded_glute_bridge | Banded glute bridge | band | C | band | 1 | both | reps |  | Band |
| donkey_kick | Donkey kick | bodyweight | P | bw | 1 | side | reps |  | Bodyweight (added weight / assistance as before); reps per side |
| fire_hydrant | Fire hydrant | bodyweight | P | bw | 1 | side | reps |  | Bodyweight (added weight / assistance as before); reps per side |
| banded_lateral_walk | Banded lateral walk | band | C | band | 1 | both | reps |  | Steps each direction counted as one total |
| clamshell | Clamshell | band | P | band | 1 | side | reps |  | Band; reps per side |
| band_hip_abduction | Standing band hip abduction | band | P | band | 1 | side | reps |  | Band; reps per side |
| band_adduction | Band hip adduction | band | P | band | 1 | side | reps |  | Band; reps per side |
| sumo_squat_kb | Sumo kettlebell squat | kettlebell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| rdl | Romanian deadlift | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| db_rdl | Dumbbell Romanian deadlift | dumbbell | C | hand | 2 | both | reps |  | Two dumbbells moved together: weight is per hand |
| single_leg_rdl | Single-leg RDL | dumbbell | P | hand | 1 | side | reps |  | One dumbbell; reps per side |
| stiff_leg | Stiff-leg deadlift | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| lying_curl | Lying leg curl | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| seated_curl | Seated leg curl | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| standing_curl | Standing single-leg curl | machine | P | stack | 1 | side | reps |  | Machine one limb at a time: stack weight; reps per side |
| nordic | Nordic curl | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| glute_ham_raise | Glute-ham raise | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| cable_pullthrough | Cable pull-through | cable | C | stack | 1 | both | reps |  | Cable stack (one attachment, both arms) |
| kb_swing | Kettlebell swing | kettlebell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| hip_thrust | Barbell hip thrust | barbell | C | bar | 1 | both | reps |  | Shared bar: weight is the bar total |
| machine_thrust | Hip thrust machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| glute_bridge | Glute bridge | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| frog_pump | Frog pump | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| glute_machine | Glute kickback machine | machine | P | stack | 1 | side | reps |  | Machine one limb at a time: stack weight; reps per side |
| cable_kickback | Cable kickback | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| reverse_hyper | Reverse hyperextension | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| hip_ext_45 | 45° hip extension | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| abductor | Hip abductor machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| cable_abduction | Cable hip abduction | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| adductor | Hip adductor machine | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| cable_adduction | Cable hip adduction | cable | P | stack | 1 | side | reps |  | Single cable handle worked one side at a time: weight is the stack per side |
| copenhagen | Copenhagen plank | bodyweight | P | bw | 1 | side | sec |  | Side hold per side; time is kept in the reps field as before |
| sumo_squat_db | Sumo dumbbell squat | dumbbell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| standing_calf | Standing calf raise | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| seated_calf | Seated calf raise | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| db_calf | Dumbbell calf raise | dumbbell | C | hand | 1 | both | reps |  | **AMBIGUOUS: one implement assumed; can also be done one side at a time (use Left / Right)** |
| leg_press_calf | Calf press on leg press | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| smith_calf | Smith calf raise | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| donkey_calf | Donkey calf raise | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| tibialis | Tibialis raise | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| single_leg_calf | Single-leg calf raise | bodyweight | P | bw | 1 | side | reps |  | Bodyweight (added weight / assistance as before); reps per side |
| bw_calf | Bodyweight calf raise | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| smith_seated_calf | Seated calf raise (plate-loaded) | machine | C | stack | 1 | both | reps |  | Machine stack / plates as shown on the machine |
| band_calf | Band calf raise | band | C | band | 1 | both | reps |  | Band |
| calf_jump | Calf jump | bodyweight | C | bw | 1 | both | reps |  | Bodyweight (added weight / assistance as before) |
| kb_tgu | Turkish get-up | kettlebell | P | hand | 1 | side | reps |  | One kettlebell, one side at a time |
| kb_snatch | Kettlebell snatch | kettlebell | P | hand | 1 | side | reps |  | One kettlebell, one side at a time |
| kb_clean | Kettlebell clean | kettlebell | P | hand | 1 | side | reps |  | One kettlebell, one side at a time |
| kb_windmill | Kettlebell windmill | kettlebell | P | hand | 1 | side | reps |  | One kettlebell, one side at a time |
| kb_goblet_lunge | Kettlebell goblet lunge | kettlebell | P | hand | 1 | side | reps |  | One goblet bell; reps per leg |
| kb_row | Kettlebell row | kettlebell | P | hand | 1 | side | reps |  | One kettlebell, one side at a time |
| kb_halo | Kettlebell halo | kettlebell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| kb_deadlift | Kettlebell deadlift | kettlebell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| kb_carry | Kettlebell carry | kettlebell | C | hand | 1 | both | reps |  | **AMBIGUOUS: one implement assumed; can also be done one side at a time (use Left / Right)** |
| kb_two_hand_swing | American kettlebell swing | kettlebell | C | hand | 1 | both | reps |  | One implement held with both hands: weight is that implement |
| ski_erg | Ski erg | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| spin_bike | Spin bike | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| recumbent_bike | Recumbent bike | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| sled_pull | Sled pull | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| cycling_outdoor | Outdoor cycling | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| hiking | Hiking | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| walking | Walking | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| burpee | Burpee | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| jumping_jacks | Jumping jacks | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| sprint_intervals | Sprint intervals | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| treadmill | Treadmill | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| incline_walk | Incline treadmill walk | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| bike | Exercise bike | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| assault_bike | Air bike | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| rower | Rowing machine | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| stairs | Stair climber | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| elliptical | Elliptical | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| running | Outdoor run | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| jump_rope | Jump rope | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| battle_ropes | Battle ropes | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| swimming | Swimming | bodyweight | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
| sled_push | Sled push | machine | C | none | 1 | both | min |  | Cardio keeps its own time / distance fields |
