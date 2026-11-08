// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const $ = id => document.getElementById(id);

// ======================= categories =======================
// [subId, English, Greek, emoji, keywords (no accents), options]  s = strong match, ml = measured in ml
const CATS = [
 ['dairy','Dairy','Γαλακτοκομικά','🥛',[
  ['milk','Milk','Γάλα','🥛','γαλα,milk,lait',{ml:1}],
  ['chocmilk','Chocolate milk','Σοκολατούχο γάλα','🍫','σοκολατουχο,chocolate milk,κακαο,cacao drink',{ml:1,s:1}],
  ['yogurt','Yogurt','Γιαούρτι','🥣','γιαουρτ,yogurt,yoghurt,skyr,στραγγιστο'],
  ['cheese','Cheese','Τυρί','🧀','τυρ,φετα,feta,cheese,γκουντα,gouda,κασερι,ημισκληρο,μοτσαρελα,mozzarella,γραβιερα,cottage,κοτατζ,ανθοτυρο,μυζηθρα,παρμεζαν,parmesan,cheddar,τσενταρ,ricotta,edam,emmental,κεφαλοτυρ,κρεμα τυριου,philadelphia'],
  ['butter','Butter','Βούτυρο','🧈','βουτυρο,butter,μαργαριν,margarine'],
  ['cream','Cream','Κρέμα γάλακτος','🍦','κρεμα γαλακτοσ,cream,ανθογαλο,σαντιγι'],
 ]],
 ['eggs','Eggs','Αυγά','🥚',[ ['egg','Eggs','Αυγά','🥚','αυγ,egg,ασπραδ,egg white'] ]],
 ['meat','Meat','Κρέας','🥩',[
  ['chicken','Chicken','Κοτόπουλο','🍗','κοτοπουλ,chicken,στηθοσ,μπουτι,φτερουγ'],
  ['turkey','Turkey','Γαλοπούλα','🦃','γαλοπουλ,turkey'],
  ['beef','Beef','Μοσχάρι','🥩','μοσχαρ,beef,steak,μπριζολ,ριμπαι,ribeye'],
  ['pork','Pork','Χοιρινό','🐖','χοιριν,pork,σπαλα,λαιμοσ'],
  ['mince','Mince','Κιμάς','🍔','κιμα,mince,minced,burger,μπιφτεκ'],
  ['coldcuts','Cold cuts','Αλλαντικά','🥓','ζαμπον,ham,μπεικον,bacon,παριζα,σαλαμι,salami,προσουτο,prosciutto,παστουρμα,αλλαντικ,γαλοπουλα καπνιστη'],
  ['sausage','Sausage','Λουκάνικα','🌭','λουκανικ,sausage,hot dog,frankfurter'],
  ['lamb','Lamb & goat','Αρνί & κατσίκι','🍖','αρνι,lamb,κατσικ,goat'],
 ]],
 ['fish','Fish & seafood','Ψάρια & θαλασσινά','🐟',[
  ['tuna','Tuna','Τόνος','🥫','τονο,tuna'], ['salmon','Salmon','Σολομός','🍣','σολομ,salmon'],
  ['shrimp','Shrimp','Γαρίδες','🦐','γαριδ,shrimp,prawn'], ['octopus','Octopus','Χταπόδι','🐙','χταποδ,octopus'],
  ['squid','Squid','Καλαμάρι','🦑','καλαμαρ,squid,σουπι'],
  ['fishgen','Fish','Ψάρι','🐟','ψαρ,fish,βακαλα,μπακαλιαρ,cod,τσιπουρ,λαβρακ,sea bass,σαρδελ,sardine,γαυρ,σκουμπρ,mackerel,γλωσσα,πανγκασιουσ,pangasius'],
 ]],
 ['rice','Rice','Ρύζι','🍚',[ ['rice','Rice','Ρύζι','🍚','ρυζι,rice,basmati,μπασματι,jasmine,καρολινα,νυχακι,γλασσε,parboiled,risotto'] ]],
 ['pasta','Pasta','Ζυμαρικά','🍝',[
  ['pasta','Pasta','Ζυμαρικά','🍝','μακαρον,ζυμαρικ,pasta,spaghetti,σπαγγετ,πεννε,penne,κριθαρακ,orzo,χυλοπιτ,fusilli,βιδακ,ταλιατελ,tagliatelle,λαζανι,lasagn'],
  ['noodles','Noodles','Νουντλς','🍜','noodle,νουντλ,ramen'],
 ]],
 ['bread','Bread & grains','Ψωμί & δημητριακά','🍞',[
  ['bread','Bread','Ψωμί','🍞','ψωμ,bread,τοστ,toast,φρυγανι,παξιμαδ,baguette,μπαγκετ,ψωμακ,bun'],
  ['wrap','Wraps & pitta','Τορτίγιες & πίτες','🫓','tortilla,τορτιγ,wrap,αραβικη,pitta,pita bread,πιτεσ για σουβλακι,πιτα για σουβλακι'],
  ['oats','Oats','Βρώμη','🥣','βρωμη,oat,porridge'],
  ['cereal','Cereal','Δημητριακά','🥣','δημητριακ,cereal,corn flakes,κορν φλεικσ,granola,γκρανολα,μουσλι,muesli'],
  ['flour','Flour','Αλεύρι','🌾','αλευρ,flour,σιμιγδαλ,semolina'],
  ['crackers','Crackers & rice cakes','Κράκερ & ρυζογκοφρέτες','🍘','κρακερ,cracker,κριτσιν,ρυζογκοφρετ,rice cake,rice cakes,ρυζοκρακερ'],
 ]],
 ['veg','Vegetables','Λαχανικά','🧺',[
  ['carrot','Carrot','Καρότο','🥕','καροτ,carrot'], ['tomato','Tomato','Ντομάτα','🍅','ντοματ,tomato,τοματ,πελτε,passata,πασατα'],
  ['potato','Potato','Πατάτα','🥔','πατατ,potato'], ['sweetpotato','Sweet potato','Γλυκοπατάτα','🍠','γλυκοπατατ,sweet potato'],
  ['cucumber','Cucumber & courgette','Αγγούρι & κολοκυθάκι','🥒','αγγουρ,cucumber,κολοκυθακ,zucchini,courgette'],
  ['onion','Onion','Κρεμμύδι','🧅','κρεμμυδ,onion,πρασ,leek'], ['garlic','Garlic','Σκόρδο','🧄','σκορδ,garlic'],
  ['pepper','Pepper','Πιπεριά','🫑','πιπεριεσ,πιπερια φλωρινησ,πιπερια κοκκινη,πιπερια πρασινη,bell pepper,peppers,red pepper,green pepper'],
  ['broccoli','Broccoli & cauliflower','Μπρόκολο & κουνουπίδι','🥦','μπροκολ,broccoli,κουνουπιδ,cauliflower'],
  ['leafy','Leafy greens','Φυλλώδη','🥬','μαρουλ,λαχαν,σπανακ,spinach,lettuce,ροκα,rocket,salad,σαλατα,cabbage,kale,μαιντανο,parsley,σελινο,celery'],
  ['corn','Sweetcorn','Καλαμπόκι','🌽','καλαμποκ,sweetcorn,corn'], ['mushroom','Mushrooms','Μανιτάρια','🍄','μανιταρ,mushroom'],
  ['eggplant','Aubergine','Μελιτζάνα','🍆','μελιτζαν,aubergine,eggplant'],
  ['peas','Peas & green beans','Αρακάς & φασολάκια','🫛','αρακα,peas,φασολακ,green beans'], ['avocado','Avocado','Αβοκάντο','🥑','αβοκαντο,avocado'],
 ]],
 ['fruit','Fruit','Φρούτα','🍎',[
  ['apple','Apple','Μήλο','🍎','μηλο,μηλα,apple'], ['banana','Banana','Μπανάνα','🍌','μπανανα,banana'],
  ['orange','Orange','Πορτοκάλι','🍊','πορτοκαλ,orange,μανταριν,mandarin'], ['lemon','Lemon','Λεμόνι','🍋','λεμον,lemon,lime'],
  ['grapes','Grapes','Σταφύλι','🍇','σταφυλ,grape'], ['strawberry','Strawberries','Φράουλες','🍓','φραουλ,strawberr'],
  ['watermelon','Watermelon & melon','Καρπούζι & πεπόνι','🍉','καρπουζ,watermelon,πεπον,melon'],
  ['peach','Peach','Ροδάκινο','🍑','ροδακιν,peach,νεκταριν,nectarine,βερικοκ,apricot'], ['pear','Pear','Αχλάδι','🍐','αχλαδ,pear'],
  ['kiwi','Kiwi','Ακτινίδιο','🥝','ακτινιδ,kiwi'], ['cherries','Cherries','Κεράσια','🍒','κερασ,cherr,βυσσιν'],
  ['pineapple','Pineapple','Ανανάς','🍍','ανανα,pineapple'], ['mango','Mango','Μάνγκο','🥭','μανγκο,mango'],
  ['berries','Blueberries','Μύρτιλα','🫐','μυρτιλ,blueberr,berries,βατομουρ'],
  ['dried','Dried fruit','Αποξηραμένα','🍇','σταφιδ,raisin,χουρμα,dates,αποξηραμεν,dried'],
 ]],
 ['legumes','Legumes','Όσπρια','🫘',[
  ['beans','Beans','Φασόλια','🫘','φασολ,beans,γιγαντεσ'], ['lentils','Lentils','Φακές','🫘','φακεσ,lentil'],
  ['chickpeas','Chickpeas','Ρεβύθια','🫘','ρεβυθ,chickpea,hummus,χουμουσ'], ['fava','Fava','Φάβα','🫘','φαβα,fava,split pea'],
 ]],
 ['nuts','Nuts & seeds','Ξηροί καρποί & σπόροι','🥜',[
  ['pb','Peanut butter','Φυστικοβούτυρο','🥜','φυστικοβουτυρο,φιστικοβουτυρο,peanut butter,βουτυρο φυστικιου,βουτυρο αραπικου',{s:1}],
  ['peanuts','Peanuts','Φιστίκια','🥜','φιστικ,φυστικ,peanut,αραπικ'], ['almonds','Almonds','Αμύγδαλα','🌰','αμυγδαλ,almond'],
  ['walnuts','Walnuts & other nuts','Καρύδια & άλλοι','🌰','καρυδ,walnut,κασιου,cashew,φουντουκ,hazelnut,pistachio,ξηροι καρποι,nuts'],
  ['seeds','Seeds & tahini','Σπόροι & ταχίνι','🌻','σουσαμ,ταχινι,tahini,chia,λιναρο,flax,ηλιοσπορ,sunflower seed,κολοκυθοσπορ'],
 ]],
 ['oils','Oils, sauces & spreads','Λάδια, σάλτσες & αλείμματα','🫒',[
  ['oliveoil','Olive oil','Ελαιόλαδο','🫒','ελαιολαδ,olive oil,παρθενο',{s:1}],
  ['oil','Other oil','Άλλο λάδι','🫗','λαδι,oil,ηλιελαιο,sunflower oil'],
  ['honey','Honey','Μέλι','🍯','μελι,honey'], ['jam','Jam','Μαρμελάδα','🫙','μαρμελαδ,jam,κομποστα'],
  ['sauce','Sauces','Σάλτσες','🥫','σαλτσ,sauce,κετσαπ,ketchup,μαγιονεζ,mayo,μουσταρδ,mustard,ντρεσινγκ,dressing,σογιασ,soy'],
  ['spread','Sweet spreads','Γλυκά αλείμματα','🍫','nutella,πραλιν,merenda,μερεντα,spread',{s:1}],
  ['sugar','Sugar','Ζάχαρη','🍬','ζαχαρη,sugar'],
  ['seasoning','Salt & spices','Αλάτι & μπαχαρικά','🧂','αλατι,salt,πιπερι,black pepper,ριγανη,oregano,μπαχαρ,spice,κανελα,cinnamon,παπρικα,paprika,κυμινο,cumin'],
 ]],
 ['snacks','Sweets & snacks','Γλυκά & σνακ','🍫',[
  ['chocolate','Chocolate','Σοκολάτα','🍫','σοκολατ,chocolate'], ['biscuits','Biscuits','Μπισκότα','🍪','μπισκοτ,biscuit,cookie,πτι μπερ'],
  ['crisps','Crisps','Πατατάκια','🍟','πατατακ,chips,crisps,γαριδακ,ποπ κορν,popcorn',{s:1}], ['icecream','Ice cream','Παγωτό','🍨','παγωτ,ice cream',{s:1}],
  ['cake','Cakes & pastries','Κέικ & αρτοσκευάσματα','🥐','κεικ,cake,κρουασαν,croissant,τουρτα,donut,ντονατ,muffin,μαφιν'],
  ['candy','Sweets','Καραμέλες','🍬','καραμελ,candy,gummy,ζελεδακ,λουκουμ'],
 ]],
 ['drinks','Drinks','Ροφήματα','🥤',[
  ['juice','Juice','Χυμός','🧃','χυμο,juice,smoothie',{ml:1,s:1}],
  ['soda','Soft drinks','Αναψυκτικά','🥤','αναψυκτ,cola,coca,pepsi,sprite,fanta,λεμοναδ,πορτοκαλαδ,σοδα,soda,ενεργειακ,energy drink,monster,red bull',{ml:1,s:1}],
  ['coffee','Coffee & tea','Καφές & τσάι','☕','καφε,coffee,espresso,τσαι,tea,freddo,φρεντο,frappe,φραπε',{ml:1,s:1}],
  ['water','Water','Νερό','💧','νερο,water',{ml:1}],
  ['alcohol','Alcohol','Αλκοόλ','🍺','μπυρα,beer,κρασι,wine,vodka,βοτκα,ουζο,τσιπουρο',{ml:1,s:1}],
 ]],
 ['supps','Supplements','Συμπληρώματα','💪',[
  ['whey','Protein powder','Πρωτεΐνη σε σκόνη','💪','whey,πρωτειν,protein powder,isolate,casein,καζειν',{s:1}],
  ['bar','Protein bar','Μπάρα πρωτεΐνης','🍫','protein bar,μπαρα πρωτεινησ',{s:1}],
  ['creatine','Creatine & other','Κρεατίνη & άλλα','💊','creatine,κρεατιν,omega,ωμεγα,βιταμιν,vitamin,magnesium,μαγνησι,electrolyte'],
 ]],
 ['ready','Ready meals','Έτοιμα φαγητά','🍱',[
  ['pizza','Pizza','Πίτσα','🍕','πιτσα,pizza',{s:1}], ['souvlaki','Souvlaki & gyros','Σουβλάκι & γύρος','🥙','σουβλακ,souvlaki,γυρο,gyros,kebab,κεμπαπ',{s:1}],
  ['pie','Pies','Πίτες','🥧','τυροπιτ,σπανακοπιτ,κουλουρ,pie,μπουγατσ',{s:1}], ['sandwich','Sandwiches','Σάντουιτς','🥪','σαντουιτσ,sandwich,club',{s:1}],
  ['meal','Ready meal','Έτοιμο φαγητό','🍱','ετοιμο φαγητο,ready meal,μουσακα,παστιτσιο,γεμιστα'],
 ]],
 ['other','Other','Άλλο','📦',[]],
].map(([id,en,el,icon,subs]) => ({ id, en, el, icon,
  subs:[{ id:'general', en:'General', el:'Γενικά', icon, kw:[], opt:{} }, ...subs.map(([sid,sen,sel,si,kw,opt]) => ({ id:sid, en:sen, el:sel, icon:si, kw:kw.split(',').map(norm).filter(Boolean), opt:opt||{} }))]
}));

const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

const L = o => o ? (lang === 'el' ? o.el : o.en) : '';

const GEN = GEN_RAW.map(([id,en,el,alias,cat,sub,unit,state,kcal,protein,carbs,fat,pieces,piece]) => ({
  gid:id, en, el, alias, cat, sub, unit, state, kcal, protein, carbs, fat, pieces: pieces || 'none', piece: piece || null,
  hay: norm(`${en} ${el} ${alias} ${subOf(cat,sub).en} ${subOf(cat,sub).el} ${(subOf(cat,sub).kw||[]).join(' ')}`)
}));

const GENBY = Object.fromEntries(GEN.map(g => [g.gid, g]));

let foods = Store.load('foods', []).map(normFood);

let meals = Store.load('meals', []);

let supps = Store.load('supps', []);

let suppLog = Store.load('suppLog', {});

const saveSupps = () => Store.save('supps', supps);

let settings = Object.assign({ geminiKey:'', model:DEFAULT_MODEL }, Store.load('settings', {}));

let ui = Object.assign({ sort:'recent', cat:'all', lang:null }, Store.load('ui', {}));

lang = ui.lang || 'en';

const saveFoods = () => Store.save('foods', foods);

const saveMeals = () => Store.save('meals', meals);

const saveUI = () => Store.save('ui', ui);

// body + gym habits (synced data; device-only things stay in ui)
let profile = Store.load('profile', {});

const saveProfile = () => Store.save('profile', profile);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

// a food saved from the standard list shows its name in whichever language you use
const foodName = f => (f.gid && GENBY[f.gid]) ? L(GENBY[f.gid]) : f.name;

// ======================= helpers =======================
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const r1 = n => Math.round(n*10)/10;

const fmt = n => (n === null || n === undefined || n === '' || isNaN(n)) ? '–' : String(r1(n));

const fmtSize = (n, unit) => unit === 'ml' ? (n >= 1000 ? `${r1(n/1000)} L` : `${r1(n)} ml`) : (n >= 1000 ? `${r1(n/1000)} kg` : `${r1(n)} g`);

const fmtDate = iso => { try{ return new Date(iso).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day:'numeric', month:'short' }); }catch(e){ return ''; } };

const W = p => t(p === 'slice' ? 'slice' : 'piece'), WS = p => t(p === 'slice' ? 'slicesW' : 'piecesW');

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target === ov && ov.id !== 'ovLang') close(ov.id); });
  ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(ov.id)));
});
