// Built-in gym data: exercises, muscle heads, equipment, workout types.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ---------- muscles: groups → heads (used by the body map, recovery and suggestions) ----------
const GROUPS = {
  chest:['Chest','Στήθος','up','#ff6b8b'], shoulders:['Shoulders','Ώμοι','up','#ffb547'], back:['Back','Πλάτη','up','#5ab0ff'], arms:['Arms','Χέρια','up','#b388ff'], core:['Core','Κορμός','up','#59d38c'],
  quads:['Quads','Τετρακέφαλοι','low','#c6f432'], hamstrings:['Hamstrings','Οπίσθιοι μηριαίοι','low','#4dd0e1'], glutes:['Glutes','Γλουτοί','low','#ff8a65'], adductors:['Adductors','Προσαγωγοί','low','#f48fb1'], calves:['Calves','Γάμπες','low','#9ccc65'],
  cardio:['Cardio','Cardio','cardio','#90a4ae'], other:['Other','Άλλο','up','#8b949c'] };

const HEADS = {
  chest_upper:['Upper chest','Πάνω στήθος','chest'], chest_mid:['Mid chest','Μέσο στήθος','chest'], chest_lower:['Lower chest','Κάτω στήθος','chest'],
  delt_front:['Front delts','Πρόσθιοι δελτοειδείς','shoulders'], delt_side:['Side delts','Πλάγιοι δελτοειδείς','shoulders'], delt_rear:['Rear delts','Οπίσθιοι δελτοειδείς','shoulders'],
  lats:['Lats','Πλατύς ραχιαίος','back'], upper_back:['Upper back','Πάνω πλάτη','back'], traps:['Traps','Τραπεζοειδής','back'], lower_back:['Lower back','Μέση','back'],
  biceps:['Biceps','Δικέφαλοι','arms'], triceps:['Triceps','Τρικέφαλοι','arms'], forearms:['Forearms','Πήχεις','arms'],
  abs:['Abs','Κοιλιακοί','core'], obliques:['Obliques','Πλάγιοι κοιλιακοί','core'],
  quads:['Quads','Τετρακέφαλοι','quads'], hamstrings:['Hamstrings','Οπίσθιοι μηριαίοι','hamstrings'], glutes:['Glutes','Γλουτοί','glutes'], abductors:['Abductors (side glutes)','Απαγωγοί (πλάγιοι γλουτοί)','glutes'],
  adductors:['Adductors','Προσαγωγοί','adductors'], calves:['Calves','Γάμπες','calves'], cardio:['Cardio','Cardio','cardio'] };

const EQUIP = { barbell:['Barbell','Μπάρα'], dumbbell:['Dumbbells','Αλτήρες'], machine:['Machine','Μηχάνημα'], cable:['Cable','Καλώδιο'], bodyweight:['Bodyweight','Σωματικό βάρος'], kettlebell:['Kettlebell','Kettlebell'], band:['Band','Λάστιχο'] };

const LEGACY_HEAD = { chest:'chest_mid', back:'lats', shoulders:'delt_front', side_delts:'delt_side', rear_delts:'delt_rear', biceps:'biceps', triceps:'triceps', quads:'quads', hamstrings:'hamstrings', glutes:'glutes', calves:'calves', abs:'abs', cardio:'cardio' };

const EQ = { b:'barbell', d:'dumbbell', m:'machine', c:'cable', w:'bodyweight', k:'kettlebell', e:'band' };

// [id, English, Greek, equipment, movement pattern, "muscle:% ..."] — percentages are rough estimates of how much each muscle does the work
const LIB_RAW = [
 // chest
 ['bench','Bench press','Πιέσεις πάγκου','b','press_h','chest_mid:55 delt_front:20 triceps:25'],
 ['incline_bench','Incline bench press','Πιέσεις επικλινούς','b','press_h','chest_upper:55 delt_front:25 triceps:20'],
 ['decline_bench','Decline bench press','Πιέσεις αρνητικού πάγκου','b','press_h','chest_lower:60 triceps:25 delt_front:15'],
 ['db_bench','Dumbbell bench press','Πιέσεις με αλτήρες','d','press_h','chest_mid:60 delt_front:20 triceps:20'],
 ['incline_db','Incline dumbbell press','Επικλινείς πιέσεις με αλτήρες','d','press_h','chest_upper:60 delt_front:25 triceps:15'],
 ['decline_db','Decline dumbbell press','Αρνητικές πιέσεις με αλτήρες','d','press_h','chest_lower:60 triceps:25 delt_front:15'],
 ['machine_press','Chest press machine','Μηχάνημα πιέσεων στήθους','m','press_h','chest_mid:60 delt_front:20 triceps:20'],
 ['incline_machine','Incline chest press machine','Μηχάνημα επικλινών πιέσεων','m','press_h','chest_upper:60 delt_front:25 triceps:15'],
 ['smith_bench','Smith machine bench press','Πιέσεις στο Smith','m','press_h','chest_mid:55 delt_front:20 triceps:25'],
 ['smith_incline','Smith incline press','Επικλινείς πιέσεις στο Smith','m','press_h','chest_upper:55 delt_front:25 triceps:20'],
 ['floor_press','Floor press','Πιέσεις στο πάτωμα','b','press_h','chest_mid:45 triceps:40 delt_front:15'],
 ['cable_fly','Cable fly','Εκτάσεις στα καλώδια','c','fly','chest_mid:80 delt_front:20'],
 ['low_cable_fly','Low-to-high cable fly','Εκτάσεις καλωδίων από κάτω','c','fly','chest_upper:80 delt_front:20'],
 ['high_cable_fly','High-to-low cable fly','Εκτάσεις καλωδίων από πάνω','c','fly','chest_lower:85 delt_front:15'],
 ['pec_deck','Pec deck','Pec deck','m','fly','chest_mid:85 delt_front:15'],
 ['db_fly','Dumbbell fly','Εκτάσεις με αλτήρες','d','fly','chest_mid:80 delt_front:20'],
 ['incline_db_fly','Incline dumbbell fly','Επικλινείς εκτάσεις με αλτήρες','d','fly','chest_upper:80 delt_front:20'],
 ['pushup','Push-up','Κάμψεις','w','pushup','chest_mid:50 triceps:30 delt_front:20'],
 ['decline_pushup','Decline push-up','Κάμψεις με πόδια ψηλά','w','pushup','chest_upper:50 delt_front:30 triceps:20'],
 ['dips','Chest dips','Βυθίσεις στήθους','w','dip','chest_lower:55 triceps:30 delt_front:15'],
 ['machine_dip','Dip machine','Μηχάνημα βυθίσεων','m','dip','chest_lower:45 triceps:45 delt_front:10'],
 ['landmine_press','Landmine press','Πιέσεις landmine','b','press_v','chest_upper:45 delt_front:35 triceps:20'],
 ['svend_press','Plate squeeze press','Πιέσεις με δίσκο (Svend)','w','press_h','chest_mid:70 delt_front:20 triceps:10'],
 // shoulders
 ['ohp','Overhead press','Πιέσεις ώμων με μπάρα','b','press_v','delt_front:55 delt_side:15 triceps:30'],
 ['db_shoulder','Dumbbell shoulder press','Πιέσεις ώμων με αλτήρες','d','press_v','delt_front:55 delt_side:20 triceps:25'],
 ['arnold','Arnold press','Arnold press','d','press_v','delt_front:55 delt_side:25 triceps:20'],
 ['machine_shoulder','Shoulder press machine','Μηχάνημα πιέσεων ώμων','m','press_v','delt_front:55 delt_side:20 triceps:25'],
 ['smith_ohp','Smith shoulder press','Πιέσεις ώμων στο Smith','m','press_v','delt_front:55 delt_side:20 triceps:25'],
 ['push_press','Push press','Push press','b','press_v','delt_front:45 triceps:25 quads:15 delt_side:15'],
 ['z_press','Z press','Z press','b','press_v','delt_front:55 triceps:30 abs:15'],
 ['lateral_db','Lateral raise','Πλάγιες εκτάσεις','d','raise','delt_side:90 traps:10'],
 ['cable_lateral','Cable lateral raise','Πλάγιες στο καλώδιο','c','raise','delt_side:90 traps:10'],
 ['machine_lateral','Lateral raise machine','Μηχάνημα πλάγιων','m','raise','delt_side:95 traps:5'],
 ['lean_lateral','Lean-away lateral raise','Πλάγιες με κλίση','d','raise','delt_side:95 traps:5'],
 ['upright_row','Upright row','Κατακόρυφη κωπηλατική','b','raise','delt_side:50 traps:35 biceps:15'],
 ['cable_upright','Cable upright row','Κατακόρυφη κωπηλατική (καλώδιο)','c','raise','delt_side:50 traps:35 biceps:15'],
 ['front_raise','Front raise','Μπροστινές εκτάσεις','d','raise','delt_front:85 chest_upper:15'],
 ['cable_front_raise','Cable front raise','Μπροστινές στο καλώδιο','c','raise','delt_front:85 chest_upper:15'],
 ['face_pull','Face pull','Face pull','c','row','delt_rear:55 upper_back:30 traps:15'],
 ['reverse_fly','Reverse dumbbell fly','Ανάστροφες εκτάσεις','d','raise','delt_rear:70 upper_back:30'],
 ['reverse_pec','Reverse pec deck','Ανάστροφο pec deck','m','raise','delt_rear:75 upper_back:25'],
 ['cable_rear_fly','Cable rear delt fly','Οπίσθιοι στο καλώδιο','c','raise','delt_rear:75 upper_back:25'],
 ['band_pull_apart','Band pull-apart','Ανοίγματα με λάστιχο','e','raise','delt_rear:55 upper_back:45'],
 ['y_raise','Incline Y-raise','Y-raise σε πάγκο','d','raise','traps:50 delt_rear:30 delt_side:20'],
 // back
 ['deadlift','Deadlift','Άρσεις θανάτου','b','hinge','lower_back:30 glutes:25 hamstrings:25 quads:10 traps:10'],
 ['sumo_deadlift','Sumo deadlift','Sumo άρσεις θανάτου','b','hinge','glutes:30 quads:25 lower_back:20 adductors:15 hamstrings:10'],
 ['trap_bar_dl','Trap bar deadlift','Άρσεις με εξάγωνη μπάρα','b','hinge','quads:30 glutes:25 lower_back:20 hamstrings:15 traps:10'],
 ['rack_pull','Rack pull','Rack pull','b','hinge','lower_back:35 traps:30 glutes:20 hamstrings:15'],
 ['bb_row','Barbell row','Κωπηλατική με μπάρα','b','row','upper_back:35 lats:35 delt_rear:15 biceps:15'],
 ['pendlay_row','Pendlay row','Pendlay row','b','row','upper_back:40 lats:30 delt_rear:15 biceps:15'],
 ['tbar_row','T-bar row','Κωπηλατική T-bar','b','row','upper_back:40 lats:30 delt_rear:15 biceps:15'],
 ['db_row','One-arm dumbbell row','Κωπηλατική με αλτήρα','d','row','lats:50 upper_back:25 biceps:15 delt_rear:10'],
 ['chest_supported_row','Chest-supported row','Κωπηλατική με στήριξη στήθους','d','row','upper_back:45 lats:30 delt_rear:15 biceps:10'],
 ['seal_row','Seal row','Seal row','b','row','upper_back:45 lats:30 delt_rear:15 biceps:10'],
 ['seated_row','Seated cable row','Κωπηλατική καθιστή (καλώδιο)','c','row','lats:40 upper_back:35 biceps:15 delt_rear:10'],
 ['machine_row','Row machine','Μηχάνημα κωπηλατικής','m','row','upper_back:40 lats:35 biceps:15 delt_rear:10'],
 ['meadows_row','Meadows row','Meadows row','b','row','lats:50 upper_back:25 biceps:15 delt_rear:10'],
 ['inverted_row','Inverted row','Ανεστραμμένη κωπηλατική','w','row','upper_back:45 lats:30 biceps:15 delt_rear:10'],
 ['lat_pulldown','Lat pulldown','Έλξεις τροχαλίας','c','pulldown','lats:60 biceps:20 upper_back:15 delt_rear:5'],
 ['close_pulldown','Close-grip pulldown','Έλξεις τροχαλίας κλειστή λαβή','c','pulldown','lats:60 biceps:25 upper_back:15'],
 ['single_pulldown','Single-arm cable pulldown','Έλξεις τροχαλίας με ένα χέρι','c','pulldown','lats:70 biceps:20 upper_back:10'],
 ['straight_arm','Straight-arm pulldown','Έλξεις με τεντωμένα χέρια','c','pullover','lats:90 abs:10'],
 ['pullover_db','Dumbbell pullover','Pullover με αλτήρα','d','pullover','lats:60 chest_mid:30 triceps:10'],
 ['pullup','Pull-up','Έλξεις','w','pulldown','lats:60 biceps:20 upper_back:15 abs:5'],
 ['chinup','Chin-up','Έλξεις ανάποδη λαβή','w','pulldown','lats:50 biceps:35 upper_back:15'],
 ['assisted_pullup','Assisted pull-up machine','Υποβοηθούμενες έλξεις','m','pulldown','lats:60 biceps:20 upper_back:20'],
 ['hyperextension','Back extension','Εκτάσεις μέσης','m','hinge','lower_back:50 glutes:30 hamstrings:20'],
 ['good_morning','Good morning','Good morning','b','hinge','hamstrings:45 lower_back:35 glutes:20'],
 ['superman','Superman','Superman','w','core_stab','lower_back:70 glutes:30'],
 ['shrug_bb','Barbell shrug','Shrugs με μπάρα','b','shrug','traps:100'],
 ['shrug_db','Dumbbell shrug','Shrugs με αλτήρες','d','shrug','traps:100'],
 ['farmer','Farmer’s carry','Μεταφορά αγρότη','d','carry','forearms:35 traps:30 obliques:20 abs:15'],
 // arms
 ['bb_curl','Barbell curl','Κάμψεις με μπάρα','b','curl','biceps:85 forearms:15'],
 ['ez_curl','EZ-bar curl','Κάμψεις με EZ μπάρα','b','curl','biceps:85 forearms:15'],
 ['db_curl','Dumbbell curl','Κάμψεις με αλτήρες','d','curl','biceps:85 forearms:15'],
 ['hammer_curl','Hammer curl','Σφυριά','d','curl','biceps:55 forearms:45'],
 ['incline_curl','Incline dumbbell curl','Κάμψεις σε επικλινή πάγκο','d','curl','biceps:90 forearms:10'],
 ['concentration','Concentration curl','Κάμψεις συγκέντρωσης','d','curl','biceps:90 forearms:10'],
 ['spider_curl','Spider curl','Spider curl','d','curl','biceps:90 forearms:10'],
 ['cable_curl','Cable curl','Κάμψεις στο καλώδιο','c','curl','biceps:85 forearms:15'],
 ['bayesian_curl','Bayesian cable curl','Bayesian κάμψεις','c','curl','biceps:90 forearms:10'],
 ['rope_hammer','Rope hammer curl','Σφυριά με σχοινί','c','curl','biceps:55 forearms:45'],
 ['preacher','Preacher curl machine','Μηχάνημα Scott','m','curl','biceps:90 forearms:10'],
 ['ez_preacher','EZ-bar preacher curl','Scott με EZ μπάρα','b','curl','biceps:90 forearms:10'],
 ['reverse_curl','Reverse curl','Ανάστροφες κάμψεις','b','curl','forearms:60 biceps:40'],
 ['wrist_curl','Wrist curl','Κάμψεις καρπών','d','curl','forearms:100'],
 ['reverse_wrist','Reverse wrist curl','Ανάστροφες κάμψεις καρπών','d','curl','forearms:100'],
 ['pushdown','Triceps pushdown','Εκτάσεις τρικεφάλων (καλώδιο)','c','ext','triceps:100'],
 ['rope_pushdown','Rope pushdown','Εκτάσεις με σχοινί','c','ext','triceps:100'],
 ['overhead_cable','Overhead cable extension','Εκτάσεις πάνω από το κεφάλι (καλώδιο)','c','ext','triceps:100'],
 ['skullcrusher','Skull crusher','Skull crusher','b','ext','triceps:95 forearms:5'],
 ['db_overhead','Dumbbell overhead extension','Εκτάσεις πάνω από το κεφάλι (αλτήρας)','d','ext','triceps:100'],
 ['kickback','Triceps kickback','Kickback τρικεφάλων','d','ext','triceps:100'],
 ['jm_press','JM press','JM press','b','ext','triceps:80 chest_mid:20'],
 ['close_bench','Close-grip bench press','Πιέσεις κλειστής λαβής','b','press_h','triceps:50 chest_mid:35 delt_front:15'],
 ['tri_machine','Triceps machine','Μηχάνημα τρικεφάλων','m','ext','triceps:100'],
 ['bench_dips','Bench dips','Βυθίσεις σε πάγκο','w','dip','triceps:75 delt_front:15 chest_lower:10'],
 ['diamond_pushup','Diamond push-up','Κάμψεις διαμάντι','w','pushup','triceps:55 chest_mid:30 delt_front:15'],
 // core
 ['cable_crunch','Cable crunch','Κοιλιακοί στο καλώδιο','c','core_flex','abs:90 obliques:10'],
 ['crunch','Crunch','Κοιλιακοί','w','core_flex','abs:90 obliques:10'],
 ['ab_machine','Ab crunch machine','Μηχάνημα κοιλιακών','m','core_flex','abs:90 obliques:10'],
 ['decline_situp','Decline sit-up','Κοιλιακοί σε αρνητικό πάγκο','w','core_flex','abs:90 obliques:10'],
 ['leg_raise','Hanging leg raise','Ανυψώσεις ποδιών στο μονόζυγο','w','core_flex','abs:85 obliques:15'],
 ['knee_raise','Captain’s chair knee raise','Ανυψώσεις γονάτων','w','core_flex','abs:85 obliques:15'],
 ['ab_wheel','Ab wheel rollout','Ροδάκι κοιλιακών','w','core_stab','abs:80 obliques:10 lats:10'],
 ['plank','Plank','Σανίδα','w','core_stab','abs:70 obliques:30'],
 ['side_plank','Side plank','Πλάγια σανίδα','w','core_stab','obliques:80 abs:20'],
 ['dead_bug','Dead bug','Dead bug','w','core_stab','abs:85 obliques:15'],
 ['hollow_hold','Hollow hold','Hollow hold','w','core_stab','abs:90 obliques:10'],
 ['dragon_flag','Dragon flag','Dragon flag','w','core_flex','abs:90 obliques:10'],
 ['russian_twist','Russian twist','Ρώσικες περιστροφές','w','core_flex','obliques:70 abs:30'],
 ['woodchop','Cable woodchop','Woodchop στο καλώδιο','c','core_flex','obliques:75 abs:25'],
 ['pallof','Pallof press','Pallof press','c','core_stab','obliques:70 abs:30'],
 // quads
 ['squat','Back squat','Καθίσματα','b','squat','quads:50 glutes:30 adductors:10 lower_back:10'],
 ['front_squat','Front squat','Μπροστινά καθίσματα','b','squat','quads:65 glutes:20 abs:10 adductors:5'],
 ['zercher','Zercher squat','Zercher καθίσματα','b','squat','quads:55 glutes:25 upper_back:10 abs:10'],
 ['smith_squat','Smith machine squat','Καθίσματα στο Smith','m','squat','quads:60 glutes:30 adductors:10'],
 ['hack_squat','Hack squat','Hack squat','m','squat','quads:75 glutes:20 adductors:5'],
 ['pendulum_squat','Pendulum squat','Pendulum squat','m','squat','quads:80 glutes:15 adductors:5'],
 ['belt_squat','Belt squat','Belt squat','m','squat','quads:65 glutes:30 adductors:5'],
 ['leg_press','Leg press','Πρέσα ποδιών','m','squat','quads:65 glutes:25 adductors:10'],
 ['single_leg_press','Single-leg press','Πρέσα με ένα πόδι','m','squat','quads:65 glutes:30 adductors:5'],
 ['goblet','Goblet squat','Goblet squat','d','squat','quads:60 glutes:25 adductors:10 abs:5'],
 ['sissy_squat','Sissy squat','Sissy squat','w','squat','quads:100'],
 ['spanish_squat','Spanish squat','Ισπανικά καθίσματα','e','squat','quads:85 glutes:15'],
 ['wall_sit','Wall sit','Κάθισμα στον τοίχο','w','squat','quads:85 glutes:15'],
 ['bulgarian','Bulgarian split squat','Βουλγάρικα','d','lunge','quads:50 glutes:40 adductors:10'],
 ['lunges','Walking lunges','Προβολές','d','lunge','quads:50 glutes:40 adductors:10'],
 ['reverse_lunge','Reverse lunge','Ανάστροφες προβολές','d','lunge','glutes:45 quads:45 adductors:10'],
 ['step_up','Step-up','Ανεβάσματα σε πάγκο','d','lunge','quads:50 glutes:45 adductors:5'],
 ['leg_ext','Leg extension','Εκτάσεις ποδιών','m','legext','quads:100'],
 // hamstrings
 ['rdl','Romanian deadlift','Ρουμάνικες άρσεις','b','hinge','hamstrings:55 glutes:30 lower_back:15'],
 ['db_rdl','Dumbbell Romanian deadlift','Ρουμάνικες με αλτήρες','d','hinge','hamstrings:55 glutes:30 lower_back:15'],
 ['single_leg_rdl','Single-leg RDL','Ρουμάνικες με ένα πόδι','d','hinge','hamstrings:45 glutes:45 lower_back:10'],
 ['stiff_leg','Stiff-leg deadlift','Άρσεις με τεντωμένα πόδια','b','hinge','hamstrings:60 glutes:25 lower_back:15'],
 ['lying_curl','Lying leg curl','Κάμψεις ποδιών πρηνηδόν','m','legcurl','hamstrings:95 calves:5'],
 ['seated_curl','Seated leg curl','Κάμψεις ποδιών καθιστός','m','legcurl','hamstrings:100'],
 ['standing_curl','Standing single-leg curl','Κάμψεις ποδιού όρθιος','m','legcurl','hamstrings:100'],
 ['nordic','Nordic curl','Nordic curl','w','legcurl','hamstrings:100'],
 ['glute_ham_raise','Glute-ham raise','Glute-ham raise','m','legcurl','hamstrings:70 glutes:20 calves:10'],
 ['cable_pullthrough','Cable pull-through','Cable pull-through','c','hinge','glutes:55 hamstrings:45'],
 ['kb_swing','Kettlebell swing','Αιωρήσεις kettlebell','k','hinge','glutes:45 hamstrings:35 lower_back:20'],
 // glutes
 ['hip_thrust','Barbell hip thrust','Hip thrust με μπάρα','b','hip','glutes:75 hamstrings:15 quads:10'],
 ['machine_thrust','Hip thrust machine','Μηχάνημα hip thrust','m','hip','glutes:75 hamstrings:15 quads:10'],
 ['glute_bridge','Glute bridge','Γέφυρα γλουτών','w','hip','glutes:70 hamstrings:30'],
 ['frog_pump','Frog pump','Frog pump','w','hip','glutes:100'],
 ['glute_machine','Glute kickback machine','Μηχάνημα kickback γλουτών','m','hip','glutes:90 hamstrings:10'],
 ['cable_kickback','Cable kickback','Κλωτσιές στο καλώδιο','c','hip','glutes:90 hamstrings:10'],
 ['reverse_hyper','Reverse hyperextension','Ανάστροφες εκτάσεις','m','hip','glutes:50 hamstrings:30 lower_back:20'],
 ['hip_ext_45','45° hip extension','Εκτάσεις ισχίου 45°','m','hinge','glutes:55 hamstrings:30 lower_back:15'],
 ['abductor','Hip abductor machine','Μηχάνημα απαγωγών','m','hip','abductors:100'],
 ['cable_abduction','Cable hip abduction','Απαγωγή ισχίου στο καλώδιο','c','hip','abductors:100'],
 // adductors
 ['adductor','Hip adductor machine','Μηχάνημα προσαγωγών','m','hip','adductors:100'],
 ['cable_adduction','Cable hip adduction','Προσαγωγή ισχίου στο καλώδιο','c','hip','adductors:100'],
 ['copenhagen','Copenhagen plank','Copenhagen σανίδα','w','core_stab','adductors:70 obliques:30'],
 ['sumo_squat_db','Sumo dumbbell squat','Sumo καθίσματα με αλτήρα','d','squat','adductors:40 quads:35 glutes:25'],
 // calves
 ['standing_calf','Standing calf raise','Γάμπες όρθιος','m','calf','calves:100'],
 ['seated_calf','Seated calf raise','Γάμπες καθιστός','m','calf','calves:100'],
 ['db_calf','Dumbbell calf raise','Γάμπες με αλτήρες','d','calf','calves:100'],
 ['leg_press_calf','Calf press on leg press','Γάμπες στην πρέσα','m','calf','calves:100'],
 ['smith_calf','Smith calf raise','Γάμπες στο Smith','m','calf','calves:100'],
 ['donkey_calf','Donkey calf raise','Donkey γάμπες','m','calf','calves:100'],
 ['tibialis','Tibialis raise','Ανυψώσεις κνήμης (tibialis)','w','calf','calves:100'],
 // cardio
 ['treadmill','Treadmill','Διάδρομος','m','cardio','cardio:100'], ['incline_walk','Incline treadmill walk','Περπάτημα σε κλίση','m','cardio','cardio:100'],
 ['bike','Exercise bike','Ποδήλατο','m','cardio','cardio:100'], ['assault_bike','Air bike','Air bike','m','cardio','cardio:100'],
 ['rower','Rowing machine','Κωπηλατικό','m','cardio','cardio:100'], ['stairs','Stair climber','Σκαλοπάτια','m','cardio','cardio:100'],
 ['elliptical','Elliptical','Ελλειπτικό','m','cardio','cardio:100'], ['running','Outdoor run','Τρέξιμο έξω','w','cardio','cardio:100'],
 ['jump_rope','Jump rope','Σχοινάκι','w','cardio','cardio:100'], ['battle_ropes','Battle ropes','Battle ropes','w','cardio','cardio:100'],
 ['swimming','Swimming','Κολύμπι','w','cardio','cardio:100'], ['sled_push','Sled push','Σπρώξιμο έλκηθρου','m','cardio','cardio:100'],
];

const REST_BY_PATTERN = { press_h:150, press_v:150, row:120, pulldown:120, squat:180, hinge:180, lunge:120, dip:120, pushup:90, fly:90, pullover:90, curl:90, ext:90, legcurl:90, legext:90, hip:90, raise:60, shrug:60, calf:60, core_flex:60, core_stab:60, carry:90, cardio:0 };

// ---------- form cues and common mistakes, by movement type (+ specific notes for the big lifts) ----------
const CUES = {
  press_h:[['Shoulder blades pinched and down, slight arch, feet planted.','Ωμοπλάτες κλειστές και κάτω, ελαφριά καμάρα, πόδια σταθερά.'],['Lower to mid/lower chest, elbows ~45–70° from your body.','Κατέβασε στο μέσο/κάτω στήθος, αγκώνες ~45–70° από το σώμα.'],['Press up and slightly back toward your face.','Σπρώξε προς τα πάνω και λίγο πίσω προς το πρόσωπο.']],
  press_v:[['Squeeze glutes and abs so you don’t lean back.','Σφίξε γλουτούς και κοιλιακούς για να μη γέρνεις πίσω.'],['Bar path straight up; move your head out of the way, then under the bar.','Η μπάρα πάει ευθεία πάνω· κάνε το κεφάλι πίσω και μετά κάτω από την μπάρα.'],['Forearms vertical under the weight.','Πήχεις κάθετοι κάτω από το βάρος.']],
  fly:[['Soft bend in the elbows, fixed through the whole rep.','Ελαφριά κάμψη στους αγκώνες, σταθερή σε όλη την επανάληψη.'],['Think “hug a tree”: stretch wide, squeeze together.','Σκέψου «αγκαλιά δέντρου»: άνοιξε, μετά σφίξε στο κέντρο.']],
  row:[['Brace your back flat; pull with the elbows, not the hands.','Ίσια σφιχτή πλάτη· τράβα με τους αγκώνες, όχι με τα χέρια.'],['Pull to lower ribs/belly, pause and squeeze the shoulder blades.','Τράβα προς κάτω πλευρά/κοιλιά, κράτα και σφίξε τις ωμοπλάτες.']],
  pulldown:[['Chest up, lean back slightly, pull the bar to your upper chest.','Στήθος έξω, ελαφριά κλίση πίσω, φέρε τη μπάρα στο πάνω στήθος.'],['Lead with the elbows down to your sides.','Οδήγησε τους αγκώνες κάτω, στα πλευρά.'],['Full stretch at the top, control on the way up.','Πλήρες τέντωμα πάνω, έλεγχος στην επιστροφή.']],
  pullover:[['Arms almost straight, move only at the shoulders.','Χέρια σχεδόν τεντωμένα, κίνηση μόνο από τους ώμους.'],['Feel the lats stretch, then sweep down to your thighs.','Νιώσε το τέντωμα στους πλατείς, μετά φέρε κάτω στους μηρούς.']],
  curl:[['Elbows pinned at your sides.','Αγκώνες κολλημένοι στα πλευρά.'],['Full stretch at the bottom, squeeze at the top, slow down.','Πλήρες κατέβασμα, σφίξιμο πάνω, αργά κάτω.']],
  ext:[['Keep the upper arms still; only the forearms move.','Οι βραχίονες μένουν ακίνητοι· κινούνται μόνο οι πήχεις.'],['Lock out fully and squeeze the triceps.','Τέντωσε πλήρως και σφίξε τους τρικέφαλους.']],
  raise:[['Lead with the elbows, slight bend, stop around shoulder height.','Οδήγησε με τους αγκώνες, ελαφριά κάμψη, σταμάτα περίπου στο ύψος των ώμων.'],['Light weight, slow lowering, no swinging.','Ελαφρύ βάρος, αργό κατέβασμα, χωρίς φόρα.']],
  squat:[['Feet shoulder-width, knees track over the toes.','Πόδια στο πλάτος των ώμων, γόνατα στην κατεύθυνση των δαχτύλων.'],['Brace your core hard before each rep.','Σφίξε δυνατά τον κορμό πριν από κάθε επανάληψη.'],['Go as deep as you can with a neutral back; drive through mid-foot.','Κατέβα όσο βαθιά μπορείς με ίσια πλάτη· σπρώξε από το μέσο του πέλματος.']],
  hinge:[['Push your hips back; the bar or weight stays close to your legs.','Σπρώξε τη λεκάνη πίσω· το βάρος μένει κοντά στα πόδια.'],['Neutral spine, lats tight, chest proud.','Ουδέτερη σπονδυλική στήλη, σφιχτοί πλατείς, στήθος έξω.'],['Stand up by squeezing the glutes, not leaning back.','Σήκω σφίγγοντας τους γλουτούς, όχι γέρνοντας πίσω.']],
  lunge:[['Long enough step that the front heel stays down.','Αρκετά μεγάλο βήμα ώστε η μπροστινή φτέρνα να μένει κάτω.'],['Torso tall, front knee tracks over the toes.','Κορμός όρθιος, το μπροστινό γόνατο ακολουθεί τα δάχτυλα.']],
  legcurl:[['Hips pressed into the pad.','Λεκάνη κολλημένη στο μαξιλάρι.'],['Curl all the way, slow on the way back.','Λύγισε μέχρι τέρμα, αργά στην επιστροφή.']],
  legext:[['Line the knee up with the machine’s pivot.','Ευθυγράμμισε το γόνατο με τον άξονα του μηχανήματος.'],['Pause at the top, control down.','Κράτα πάνω, ελεγχόμενα κάτω.']],
  hip:[['Chin tucked, ribs down, push through the heels.','Πηγούνι μέσα, πλευρά κάτω, σπρώξε από τις φτέρνες.'],['Squeeze the glutes hard at the top for a second.','Σφίξε δυνατά τους γλουτούς πάνω για ένα δευτερόλεπτο.']],
  calf:[['Full stretch at the bottom, pause.','Πλήρες τέντωμα κάτω, παύση.'],['Rise as high as you can, slow on the way down.','Ανέβα όσο ψηλά μπορείς, αργά κάτω.']],
  core_flex:[['Curl the spine; bring ribs toward hips.','Λύγισε τη σπονδυλική στήλη· φέρε τα πλευρά προς τη λεκάνη.'],['Exhale hard at the top, no yanking the neck or swinging.','Βγάλε δυνατά τον αέρα πάνω, χωρίς τράβηγμα αυχένα ή φόρα.']],
  core_stab:[['Ribs down, glutes squeezed, straight line head to heels.','Πλευρά κάτω, σφιχτοί γλουτοί, ευθεία γραμμή από το κεφάλι ως τις φτέρνες.'],['Breathe slowly; stop when your form breaks.','Ανάπνεε αργά· σταμάτα όταν χαλάει η τεχνική.']],
  shrug:[['Straight up toward your ears, pause at the top.','Ευθεία πάνω προς τα αυτιά, παύση πάνω.'],['Don’t roll the shoulders.','Μη γυρίζεις τους ώμους.']],
  carry:[['Tall posture, shoulders back, short quick steps.','Όρθια στάση, ώμοι πίσω, μικρά γρήγορα βήματα.'],['Grip hard; don’t let the weights swing.','Κράτα σφιχτά· μην αφήνεις τα βάρη να ταλαντεύονται.']],
  dip:[['Lean forward slightly for chest, stay upright for triceps.','Γείρε λίγο μπροστά για στήθος, μείνε όρθιος για τρικέφαλους.'],['Go down until the upper arm is about parallel, shoulders down.','Κατέβα μέχρι ο βραχίονας να είναι περίπου παράλληλος, ώμοι κάτω.']],
  pushup:[['Hands under the shoulders, body in one straight line.','Χέρια κάτω από τους ώμους, σώμα σε ευθεία γραμμή.'],['Chest to the floor, elbows ~45°.','Στήθος ως το πάτωμα, αγκώνες ~45°.']],
  cardio:[['Warm up for 3–5 minutes before pushing the pace.','Ζέσταμα 3–5 λεπτά πριν ανεβάσεις ρυθμό.'],['Most sessions at a pace where you can still talk.','Οι περισσότερες προπονήσεις σε ρυθμό που μπορείς να μιλάς.']],
};

const MISTAKES = {
  press_h:[['Bouncing the bar off the chest.','Αναπήδηση της μπάρας στο στήθος.'],['Elbows flared to 90°, which stresses the shoulders.','Αγκώνες ανοιχτοί στις 90°, που επιβαρύνουν τους ώμους.'],['Butt lifting off the bench.','Η λεκάνη σηκώνεται από τον πάγκο.']],
  press_v:[['Leaning back into a standing incline press.','Γέρνεις πίσω και γίνεται επικλινής πίεση όρθιος.'],['Pressing in front of the face instead of overhead.','Σπρώχνεις μπροστά από το πρόσωπο αντί για πάνω από το κεφάλι.']],
  fly:[['Turning it into a press by bending the elbows more.','Το κάνεις πίεση λυγίζοντας περισσότερο τους αγκώνες.'],['Stretching too deep with heavy weight.','Πολύ βαθύ τέντωμα με βαρύ βάρος.']],
  row:[['Using momentum and jerking the torso.','Φόρα και τίναγμα του κορμού.'],['Rounding the lower back.','Καμπούριασμα της μέσης.'],['Shrugging instead of pulling with the back.','Σηκώνεις τους ώμους αντί να τραβάς με την πλάτη.']],
  pulldown:[['Leaning way back and turning it into a row.','Γέρνεις πολύ πίσω και γίνεται κωπηλατική.'],['Pulling behind the neck.','Τράβηγμα πίσω από τον αυχένα.'],['Short range: not letting the arms straighten.','Μισή κίνηση: δεν αφήνεις τα χέρια να τεντώσουν.']],
  pullover:[['Bending the elbows so the triceps take over.','Λυγίζεις τους αγκώνες και δουλεύουν οι τρικέφαλοι.']],
  curl:[['Swinging the body to lift the weight.','Κούνημα του σώματος για να ανέβει το βάρος.'],['Elbows drifting forward.','Οι αγκώνες φεύγουν μπροστά.']],
  ext:[['Elbows flaring out or moving.','Οι αγκώνες ανοίγουν ή κινούνται.'],['Half reps without a full lockout.','Μισές επαναλήψεις χωρίς πλήρες τέντωμα.']],
  raise:[['Too heavy: shrugging and swinging.','Πολύ βαρύ: σηκώνεις ώμους και παίρνεις φόρα.'],['Raising far above shoulder height.','Ανεβάζεις πολύ πάνω από το ύψος των ώμων.']],
  squat:[['Knees caving inward.','Τα γόνατα πέφτουν προς τα μέσα.'],['Heels lifting.','Οι φτέρνες σηκώνονται.'],['Hips shooting up first (good-morning squat).','Η λεκάνη ανεβαίνει πρώτη (good morning).']],
  hinge:[['Rounding the lower back.','Καμπούριασμα της μέσης.'],['Squatting it down instead of hinging.','Το κάνεις κάθισμα αντί για άρθρωση στο ισχίο.'],['Hyperextending the back at the top.','Υπερέκταση της μέσης στο τέλος.']],
  lunge:[['Front knee caving in.','Το μπροστινό γόνατο πέφτει μέσα.'],['Too short a step, heel lifts.','Πολύ μικρό βήμα, σηκώνεται η φτέρνα.']],
  legcurl:[['Hips lifting off the pad.','Η λεκάνη σηκώνεται από το μαξιλάρι.'],['Letting the weight drop.','Αφήνεις το βάρος να πέσει.']],
  legext:[['Kicking the weight up with momentum.','Κλωτσάς το βάρος με φόρα.']],
  hip:[['Arching the lower back instead of using the glutes.','Καμάρα στη μέση αντί για δουλειά των γλουτών.'],['Pushing through the toes.','Σπρώχνεις με τα δάχτυλα.']],
  calf:[['Bouncing with short reps.','Αναπηδήσεις με μισές επαναλήψεις.']],
  core_flex:[['Pulling on your neck.','Τραβάς τον αυχένα.'],['Swinging the legs (hip flexors do the work).','Κουνάς τα πόδια (δουλεύουν οι καμπτήρες ισχίου).']],
  core_stab:[['Hips sagging or piking.','Η λεκάνη πέφτει ή σηκώνεται πολύ.'],['Holding your breath.','Κρατάς την αναπνοή.']],
  shrug:[['Rolling the shoulders.','Περιστροφή των ώμων.'],['Bending the elbows.','Λύγισμα των αγκώνων.']],
  carry:[['Leaning to one side.','Γέρνεις στο πλάι.']],
  dip:[['Going too deep with shoulders rolling forward.','Πολύ βαθιά, με τους ώμους να γέρνουν μπροστά.'],['Shrugging up to the ears.','Ώμοι μέχρι τα αυτιά.']],
  pushup:[['Hips sagging.','Η λεκάνη πέφτει.'],['Half reps.','Μισές επαναλήψεις.']],
  cardio:[['Going all-out every session.','Στο φουλ σε κάθε προπόνηση.']],
};

const SPECIFIC = {
  bench:['Unrack with straight arms, then set your shoulder blades before you lower.','Ξεκρέμασε με τεντωμένα χέρια και μετά κλείδωσε τις ωμοπλάτες πριν κατεβάσεις.'],
  squat:['Bar on the upper back (not the neck). Use safety pins when training heavy.','Μπάρα στο πάνω μέρος της πλάτης (όχι στον αυχένα). Βάλε ασφάλειες όταν πας βαριά.'],
  deadlift:['Bar over mid-foot, shins touch the bar, pull the slack out before you lift.','Μπάρα πάνω από το μέσο του πέλματος, κνήμες στη μπάρα, «τέντωσε» τη μπάρα πριν σηκώσεις.'],
  rdl:['Knees soft and fixed; stop when the hamstrings are fully stretched, usually around mid-shin.','Γόνατα ελαφρώς λυγισμένα και σταθερά· σταμάτα όταν τεντώσουν οι οπίσθιοι, συνήθως στη μέση της κνήμης.'],
  ohp:['Start with the bar on your front delts, grip just outside the shoulders.','Ξεκίνα με τη μπάρα στους πρόσθιους δελτοειδείς, λαβή λίγο έξω από τους ώμους.'],
  pullup:['Start from a dead hang; chin over the bar without kicking.','Ξεκίνα από πλήρες κρέμασμα· πηγούνι πάνω από τη μπάρα χωρίς κλωτσιές.'],
  leg_press:['Don’t lock your knees at the top, and don’t let your lower back round off the pad at the bottom.','Μην κλειδώνεις τα γόνατα πάνω και μην αφήνεις τη μέση να ξεκολλάει κάτω.'],
  hip_thrust:['Bench under the shoulder blades; shins vertical at the top.','Πάγκος κάτω από τις ωμοπλάτες· κνήμες κάθετες στο πάνω σημείο.'],
  lateral_db:['Tilt slightly forward and raise the dumbbells out to the sides, pinkies level with thumbs.','Γείρε λίγο μπροστά και σήκωσε τους αλτήρες στα πλάγια, μικρό δάχτυλο στο ύψος του αντίχειρα.'],
  bb_row:['Torso around 30–45°, keep it still for the whole set.','Κορμός περίπου 30–45°, ακίνητος σε όλο το σετ.'],
  lat_pulldown:['Thighs locked under the pad, grip a bit wider than the shoulders.','Μηροί κλειδωμένοι κάτω από το μαξιλάρι, λαβή λίγο πιο ανοιχτή από τους ώμους.'],
  bulgarian:['Most of the weight on the front leg; lean forward a bit for more glutes.','Το μεγαλύτερο βάρος στο μπροστινό πόδι· γείρε λίγο μπροστά για περισσότερους γλουτούς.'],
  dips:['Stop if you feel a pinch at the front of the shoulder.','Σταμάτα αν νιώσεις τσίμπημα μπροστά στον ώμο.'],
  skullcrusher:['Lower toward the forehead or just behind the head; elbows point up.','Κατέβασε προς το μέτωπο ή λίγο πίσω από το κεφάλι· αγκώνες προς τα πάνω.'],
  face_pull:['Pull the rope toward your eyes and spread the ends apart.','Τράβα το σχοινί προς τα μάτια και άνοιξε τις άκρες.'],
};

const GKEY = { custom: 'exCustom', tpl: 'tpls', plan: 'gymPlan', ses: 'sessions', act: 'active', cb: 'comeback', pet: 'pet' };   // short names → Store names

// ---------- pets (original starters, three evolution stages each) ----------
const PETS = {
  embrik: { names: ['Embrik', 'Embrak', 'Pyrobell'], fav: 'pr', col: '#ff8a2a', trait: ['Ember kettlebell · strength. Loves PRs.', 'Πυρωμένο kettlebell · δύναμη. Λατρεύει τα ρεκόρ.'] },
  tidepup: { names: ['Tidepup', 'Tidehound', 'Tsunamutt'], fav: 'kcal', col: '#4aa8ff', trait: ['Water pup · consistency. Loves hitting macros.', 'Κουτάβι του νερού · συνέπεια. Λατρεύει τα μακρο.'] },
  mossling: { names: ['Mossling', 'Mossbear', 'Grovekeeper'], fav: 'supps', col: '#7aa24a', trait: ['Moss bear · recovery. Loves supplements and rest.', 'Αρκουδάκι από βρύα · αποκατάσταση. Λατρεύει τα συμπληρώματα και την ξεκούραση.'] },
};

const FAV_KEY = { pr: 'pfPR', kcal: 'pfKcal', supps: 'pfSupps' };

const SORE = ['😎', '🙂', '😬', '😵', '💀'];

// Sore / Recovering / Ready follow the theme (red / amber / accent; green in the warm presets). Read from the CSS variables
// each time so the map, legend and rows always match the chosen theme.
const cssVar = (n, fb) => { try{ return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb; }catch(e){ return fb; } };
const REC_COL = { get ok(){ return cssVar('--t-ready', '#c6f432'); }, get mid(){ return cssVar('--t-mid', '#e8b04a'); }, get low(){ return cssVar('--t-sore', '#ff6b5c'); } };

// ---------- anatomical body figure (front + back), drawn as real muscle shapes, mirrored left/right ----------
const HEAD_COL = { chest_upper:'#ff8fab', chest_mid:'#ff5c8a', chest_lower:'#d63a6a', delt_front:'#ffc46b', delt_side:'#ffa53a', delt_rear:'#e07b00',
  traps:'#8fd0ff', upper_back:'#4aa3ff', lats:'#2f7fe0', lower_back:'#2a62b8', biceps:'#c9a6ff', triceps:'#9b6dff', forearms:'#7a55d6',
  abs:'#7be3a3', obliques:'#3fc77d', quads:'#d4f53c', hamstrings:'#4dd0e1', glutes:'#ff8a65', abductors:'#ffb199', adductors:'#f48fb1', calves:'#9ccc65', cardio:'#90a4ae' };

const ANAT_HEAD_GROUP = { chest_upper:'chest', chest_mid:'chest', chest_lower:'chest', delt_front:'shoulders', delt_side:'shoulders', delt_rear:'shoulders',
  traps:'back', upper_back:'back', lats:'back', lower_back:'back', biceps:'arms', triceps:'arms', forearms:'arms', abs:'core', obliques:'core',
  quads:'quads', hamstrings:'hamstrings', glutes:'glutes', abductors:'glutes', adductors:'adductors', calves:'calves' };

// left half only (x < 100); the right half is mirrored
const ANAT_SKIN = [
  'M100 74 L76.6 76 C59.4 78 45.3 84 37.2 96 C30.2 108 33.2 122 41.4 132 C42.4 150 52.9 170 65.4 188 C66.4 198 72 206 75.2 212 L100 216 Z',
  'M44.8 96 C33.8 104 26.3 120 29.3 136 C30.7 152 33.6 172 37.4 190 C32.9 208 27.7 224 27.8 236 C31.3 246 40.6 250 50.3 246 C54.6 234 60.3 216 64.4 200 C66.9 180 66.3 160 65.2 140 C63.4 120 58.4 104 44.8 96 Z',
  'M76 206 C61.6 230 56.3 262 58.6 296 C61 314 66.1 330 65.8 346 C66.4 370 70.5 394 75.6 410 L91.9 412 C92.7 396 93.3 372 93 350 C94.7 330 95.6 312 95.4 298 C96.5 276 97.7 252 98.9 230 L100 216 Z' ];

const ANAT_SKIN_ELL = [[37.9, 254, 9.7, 13], [83, 417, 11.6, 6]];

const ANAT = {
  f: [
    ['traps', 'M100 66 C93.5 68 84.2 72 71.3 78 C78.1 80 85.4 80 92.8 78 C96.5 76 98.9 74 100 72 Z'],
    ['delt_side', 'M68.4 80 C52.9 82 40.1 90 36.6 104 C35.7 114 39.9 122 47.2 128 C49.5 116 53.3 104 59.9 94 C62.6 88 65.2 84 68.4 80 Z'],
    ['delt_front', 'M70.8 80 C62.7 86 54.7 98 52.2 112 C49.8 120 50.3 126 50.8 130 C60.4 128 64.4 120 67.8 110 C72.3 100 77.5 90 82.6 84 C79.1 81 75.7 80 70.8 80 Z'],
    ['chest_upper', 'M100 80 C92.7 80 85.3 81 82.6 84 C77.5 90 72.3 98 70.1 106 C79.9 102 89.9 100 100 100 Z'],
    ['chest_mid', 'M100 100 C89.9 100 79.9 102 70.1 106 C68 114 68.4 120 71.1 126 C80.8 128 90.4 128 100 126 Z'],
    ['chest_lower', 'M100 126 C90.4 128 80.8 128 71.1 126 C74 132 81.4 138 90.8 140 C95.4 140 98.8 139 100 138 Z'],
    ['triceps', 'M47.2 128 C40.5 136 39.3 150 42.9 164 C46.3 172 50 176 56 178 C52.1 166 48.6 150 51.5 134 Z'],
    ['biceps', 'M54.1 130 C49 138 48.6 150 51.2 162 C53.4 172 58.8 178 64.7 178 C66.2 170 66.2 158 65.5 146 C65 138 63 132 57.1 128 Z'],
    ['forearms', 'M55.1 180 C48.1 190 41.8 206 35.9 222 C33.1 232 37.4 238 43.8 240 C51.1 228 59.7 212 64.6 198 C66.2 190 66.5 184 64.9 180 Z'],
    ['lats', 'M71.2 128 C67.3 136 66.2 146 68.4 156 C71.5 154 75.5 150 77.4 146 C77 140 76.5 134 75 130 Z'],
    ['obliques', 'M75.1 132 C77.1 142 77.9 152 74.3 160 C73.1 170 74.4 182 78.5 192 C82.2 198 86.1 202 88 204 L86.4 144 C83.8 138 80 134 75.1 132 Z'],
    ['abs', 'M86.9 143 Q86.8 141 89.1 141 L98.9 141 L98.9 156 L87.5 156 Z'],
    ['abs', 'M87.6 158 L98.9 158 L99 173 L88.3 173 Z'],
    ['abs', 'M88.3 175 L99 175 L99 189 L88.8 189 Z'],
    ['abs', 'M88.8 191 L99 191 L99 214 C94.8 214 90.9 208 88.6 200 Z'],
    ['abductors', 'M76.4 196 C70.1 204 65.6 214 62.7 224 C67.8 220 72.9 214 77.8 208 C80.1 204 81.2 200 80.3 196 Z'],
    ['quads', 'M62.4 226 C56.3 246 54 268 56.3 292 C59.7 304 65.3 314 70.1 318 C67.8 296 70.1 270 74.7 246 C75.8 236 75.4 228 72 220 Z'],
    ['quads', 'M79.8 208 C73.2 228 72.4 256 74.7 282 C77 296 82.1 304 86.6 306 C89.7 288 90.8 262 88.5 236 C88.1 222 85.5 212 79.8 208 Z'],
    ['quads', 'M86.2 276 C81.6 288 82 302 86.9 312 C91.4 316 95.6 312 96.6 304 C96.5 294 93.1 284 86.2 276 Z'],
    ['adductors', 'M89.6 214 C86.7 226 88.5 242 92 256 C94.2 264 96.5 270 97.7 272 L98.9 222 C96.8 218 93.7 215 89.6 214 Z'],
    ['calves', 'M69.3 330 C60.9 348 62.1 372 67.4 396 C70 402 75.3 404 78.2 400 C79.2 378 77.9 354 78.4 334 Z'],
    ['calves', 'M84.4 326 C78.7 342 78.3 362 82.6 382 C86.1 388 92.5 388 94.6 382 C96.6 362 95.5 342 92.7 328 Z'],
  ],
  b: [
    ['upper_back', 'M91.2 104 C84.9 96 77.5 90 70 92 C64.7 100 63.5 110 65.9 120 C75.8 124 85.5 126 95.2 128 Z'],
    ['traps', 'M100 60 C93.7 64 84.6 70 68.9 78 C75.2 84 85 92 91.2 104 C95.1 112 98.8 120 100 124 Z'],
    ['delt_rear', 'M68.4 80 C52.9 82 40.1 90 36.6 104 C37.4 114 43.3 122 50.3 126 C52.7 114 55.3 102 64.9 94 C70 90 75.1 86 80.1 84 C76.7 81 73.2 80 68.4 80 Z'],
    ['lats', 'M66 122 C65.8 136 66.9 152 72.9 168 C78.1 180 86.4 188 94.1 192 L96.8 164 C96.7 152 96.5 140 95.2 130 C85.6 128 75.9 126 66 122 Z'],
    ['lower_back', 'M93.8 172 C92.1 182 92.1 194 94 204 L100 207 L100 142 C97.8 152 95.7 162 93.8 172 Z'],
    ['triceps', 'M50.3 126 C41.8 134 40.4 148 45.3 162 C49.1 172 56 178 62.9 178 C64.8 166 64.9 152 63.8 140 C62 132 57.1 128 50.3 126 Z'],
    ['forearms', 'M55.1 180 C48.1 190 41.8 206 35.9 222 C33.1 232 37.4 238 43.8 240 C51.1 228 59.7 212 64.6 198 C66.2 190 66.5 184 64.9 180 Z'],
    ['abductors', 'M78.3 196 C72.2 202 69.4 210 70.2 218 C77.1 214 85.8 208 92 204 C88.1 199 84.2 196 78.3 196 Z'],
    ['glutes', 'M70.5 216 C63.9 230 65.5 248 74.7 258 C83.9 264 95.4 262 100 256 L100 208 C93.9 208 83.7 210 70.5 216 Z'],
    ['hamstrings', 'M65.5 262 C60.9 282 61.9 304 68.4 322 C72.7 328 77.1 326 78.6 318 C78.4 300 78.2 282 75.8 266 Z'],
    ['hamstrings', 'M78.2 264 C78.2 284 80.9 304 85.1 320 C89.6 326 93.7 324 95.7 316 C95.4 298 94.2 280 92 266 Z'],
    ['calves', 'M72.2 332 C65.8 346 65.7 362 71.3 376 C76.1 382 82.6 382 84.6 376 C84 362 84 346 82.7 334 Z'],
    ['calves', 'M85 332 C83.9 348 84.1 364 86.8 378 C91.4 384 95.7 382 97.8 376 C98.9 362 97.7 346 93.5 334 Z'],
    ['calves', 'M73.8 380 C74.4 390 79.2 400 85.7 406 C89.8 408 93.8 404 95.8 396 C95.7 390 94.6 384 92.4 380 Z'],
  ],
};

// muscle-fibre detail lines, purely decorative
const ANAT_FIBRES = {
  f: 'M97.5 88 C90 89 82.5 92 77.4 98 M97.5 110 C87.6 110 79 112 73 116 M96.3 120 C87.8 121 79.3 121 73.3 122 M60.1 88 C57.3 96 56 104 55.5 112 M82.6 222 C79.3 244 79.3 266 81.6 290 M65.5 240 C63.2 258 63.2 276 65.5 296 M55.8 140 C56.2 150 58.2 160 61.5 170',
  b: 'M88.5 140 C84.4 150 82.8 160 83.6 172 M76.3 132 C75 144 76.1 156 79.2 168 M87.1 220 C79.9 228 74.7 238 74.7 248 M67.8 274 C66.7 290 67.7 306 71.1 318 M86.2 274 C86.2 290 87.7 304 90.3 316 M52.2 98 C50.5 104 49 112 48.1 120',
};

// ---------- workout types ----------
const WTYPES = [['upper','💪','wUpper'],['lower','🦵','wLower'],['full','🏋️','wFull'],['push','🫸','wPush'],['pull','🫷','wPull'],['legs','🦵','wLegs'],['cardio','🏃','wCardio'],['bro','🧱','broSplit']];

const BRO = [['chest','wChest'],['back','wBack'],['shoulders','wShoulders'],['arms','wArms'],['core','wCore'],['glutes','wGlutes']];

// which muscle heads each workout type is about (for "What next?")
const TYPE_HEADS = {
  push: ['chest_upper','chest_mid','chest_lower','delt_front','delt_side','triceps'], pull: ['lats','upper_back','traps','delt_rear','biceps','forearms'],
  chest: ['chest_upper','chest_mid','chest_lower'], back: ['lats','upper_back','traps','lower_back'], shoulders: ['delt_front','delt_side','delt_rear'],
  arms: ['biceps','triceps','forearms'], core: ['abs','obliques'], glutes: ['glutes','abductors','hamstrings'] };

// ---------- Gym Buddy hub ----------
const GSEC = { 'gym-week': 'plan', 'gym-lib': 'tpl', 'gym-prog': 'prog', 'gym-rec': 'rec' };

// ---------- exercise picker: real body figure, muscle colours, equipment bubbles ----------
const EQ_COL = { barbell:'#ff5c5c', dumbbell:'#5ab0ff', machine:'#b388ff', cable:'#4dd0e1', bodyweight:'#59d38c', kettlebell:'#ffb547', band:'#f48fb1' };

const EQ_ORDER = ['barbell','dumbbell','machine','cable','bodyweight','kettlebell','band'];

const EQ_ICON = {   // 0.6.8: a different shape for each, not just a colour
  barbell: '<path d="M1 12H23"/><rect x="3.5" y="6" width="3" height="12" rx="1"/><rect x="17.5" y="6" width="3" height="12" rx="1"/>',
  dumbbell: '<path d="M9 12H15"/><path d="M4.5 8.5L6.5 7L8.5 8.5V15.5L6.5 17L4.5 15.5Z"/><path d="M15.5 8.5L17.5 7L19.5 8.5V15.5L17.5 17L15.5 15.5Z"/>',
  machine: '<rect x="14" y="3" width="6" height="18" rx="1"/><path d="M14 8H20M14 13H20M3 16H11M5 16V21M10 9V16M5 9H10"/>',
  cable: '<path d="M4 3H20"/><circle cx="12" cy="7" r="2.6"/><path d="M12 9.6V17.5M8.5 17.5H15.5M8.5 21H15.5"/>',
  bodyweight: '<circle cx="12" cy="4.5" r="2.2"/><path d="M12 7.5V15M12 15L8 21M12 15L16 21M6 10H18"/>',
  kettlebell: '<path d="M8.5 9C8.5 4.5 15.5 4.5 15.5 9"/><circle cx="12" cy="15" r="6"/>',
  band: '<path d="M3 16C7 6 17 6 21 16M3 16C7 11 17 11 21 16"/>' };

const SYN = { db: 'dumbbell', dumbbells: 'dumbbell', bb: 'barbell', ohp: 'overhead press', 'pull-up': 'pullup', 'pull-ups': 'pullup', 'chin-up': 'chinup', pullups: 'pullup', rdl: 'romanian deadlift', 'push-up': 'pushup', 'push-ups': 'pushup', pushups: 'pushup', 'sit-up': 'situp', flyes: 'fly', flye: 'fly', flies: 'fly', raises: 'raise', curls: 'curl', presses: 'press', rows: 'row', extensions: 'extension', 'skull': 'skullcrusher', lunges: 'lunge', squats: 'squat', dips: 'dip', 'kickbacks': 'kickback', 'pulldown': 'pulldown', 'pull-down': 'pulldown' };

const EQ_FE = { barbell: 'barbell', dumbbell: 'dumbbell', machine: 'machine', cable: 'cable', bodyweight: 'body only', kettlebell: 'kettlebells', band: 'bands' };
