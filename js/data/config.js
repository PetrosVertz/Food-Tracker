// App settings: version, storage keys, defaults and small lookup tables.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const VERSION = '0.7.4';

const DEFAULT_MODEL = 'gemini-flash-latest';

const KEY_URL = 'https://aistudio.google.com/apikey';

let lang = 'en';

let toastTimer;

let zTop = 10;

const STATE_KEY = { uncooked:'uncooked', cooked:'cooked', ready:'ready' };

// ======================= food form =======================
const F = { editingId:null, state:'ready', unit:'g', stateTouched:false, unitTouched:false, typeTouched:false, piecesTouched:false, cat:null, sub:null, noBrand:false, packs:[], usual:null, source:'', pieces:'none', display:'auto', serving:null, pieceSkipped:false, gid:null, fromScan:false, onSaved:null };

const NUM = { kcal:'fKcal', protein:'fP', carbs:'fC', fat:'fF', fiber:'fFib', sugar:'fSug', satFat:'fSat', salt:'fSalt' };

let M = { brandMode:null, cat:null, sub:null, needBrand:false, needType:false };

let PC = { mode:'weigh' };

// ======================= add flow =======================
let pendingBarcode = null;

let stream = null, scanLoop = null, scanOn = false, torchOn = false;


let ING = { cb:null, online:[], onlineQ:'', timer:null };

let lastLocal = { mine:[], std:[] };

// ======================= cook a meal =======================
let D = null;

// ---- recipe suggestion ----
let pendingRecipe = null, recCtl = null;

let OWN = null;

let openMealId = null;

let SU = { id:null, qid:null, times:[], often:'daily', icon:null };

// =====================================================================
// v1.5 — FRIDGE · GROCERIES · TODAY'S FOOD · PLAN MY DAY
// =====================================================================

let scanCtx = null;

// ---------- add / edit a fridge item ----------
let FA = null;

// ---------- amount sheet: "use from fridge" and "log to today" share it ----------
let AM = null;

let GS = { mine: [], std: [] };

// ---------- log search ----------
let LS = { meals: [], mine: [], std: [], recent: [], fr: [] };

const TG = { goal: 'bulk' };

// ---------- plan my day (Gemini, builds from the fridge first) ----------
let planCtl = null;

// ---------- key guide ----------
const KEY_STEPS = {
  en: ['Tap <b>Get API key</b> above.', 'Sign in with any Google account (Gmail works) and accept the terms.', 'Tap <b>Create API key</b>. If it asks for a project, the default one is fine.', 'Copy the key. It starts with <code>AIza</code>.', 'Paste it in the box above, tap <b>Save settings</b>, then <b>Test key</b>.'],
  el: ['Πάτα <b>Πάρε κλειδί API</b> από πάνω.', 'Συνδέσου με οποιονδήποτε λογαριασμό Google (και Gmail) και αποδέξου τους όρους.', 'Πάτα <b>Create API key</b>. Αν ζητήσει project, το προεπιλεγμένο είναι μια χαρά.', 'Αντέγραψε το κλειδί. Ξεκινάει με <code>AIza</code>.', 'Επικόλλησέ το στο κουτί από πάνω, πάτα <b>Αποθήκευση ρυθμίσεων</b> και μετά <b>Έλεγχος κλειδιού</b>.']
};

let _exc = null;

// ---------- rest timer (under the set) with a boxing-bell sound ----------
let REST = null, audioCtx = null;

// ---------- exercise picker: Upper / Lower → body map or list → muscle head → big tiles ----------
let PK = { cb: null, region: 'up', mode: 'map', group: null, head: null };

// ---------- 🚫 Taken → same muscle head, different equipment ----------
let SW = null;

let TP = null;

// ---------- fridge: a food you add for the first time goes straight into the fridge ----------
let lastAutoFridge = null;

let sgCtl = null;

const TAB_ROOT = { today: 'today', gym: 'gym', food: 'foods', fridge: 'fridge', settings: 'settings' };

let LOGON = { q: '', res: [], busy: false, timer: null };

// ---------- quick add ----------
let QA = null;

   // recovery reminders live only in Today now

// ---------- launcher, tab swipes ----------
const TABS3 = ['today', 'gym', 'food', 'fridge'];   // top → bottom on the side strip

// ---------- first-time setup ----------
let SUP = { step: 0 };

let SHOP = { items: [], scan: null, busy: false };   // 0.7: the review list (scanned packs or receipt lines) and the live scan

// ---------- gym: straight start on planned days ----------
let forcePick = false;

// ---------- correct-form demos (free-exercise-db, public domain; two photos flip like a GIF) ----------
const FEDB_URLS = ['https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json', 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'];

let FEDB = null, DEMO = { timer: null };


// ---------- in-app yes/no (instead of the phone's own pop-up) ----------
let ASK = null;

// ---------- in-app picker for every dropdown ----------
let PICKSEL = null;

const HAPTIC_SEL = '.rail button,[data-fg],[data-step],[data-ok],[data-plus],[data-minus],[data-addset],[data-endex],#amSave,#qaSave,#shopAddBtn,#tpSave,#wiSave,.sitem,.extile,.exrow,.eqchip,.hchip,.pickopt,#askYes,#gStart,#sesFinish,.btn.primary,.snum,.usebtn';

const KEYATTR = ['data-eid', 'data-fid', 'data-x', 'data-s', 'data-tid', 'data-gid', 'data-mid', 'data-sid', 'data-fkey'];
