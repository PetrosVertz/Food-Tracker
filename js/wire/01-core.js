// Wiring that runs at start-up, in order: state, event listeners, first render.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

const $ = id => document.getElementById(id);

// ======================= categories =======================
// [subId, English, Greek, emoji, keywords (no accents), options]  s = strong match, ml = measured in ml
const CATS = [
 ['dairy','Dairy','Γαλακτοκομικά','',[
  ['milk','Milk','Γάλα','','γαλα,milk,lait',{ml:1}],
  ['chocmilk','Chocolate milk','Σοκολατούχο γάλα','','σοκολατουχο,chocolate milk,κακαο,cacao drink',{ml:1,s:1}],
  ['yogurt','Yogurt','Γιαούρτι','','γιαουρτ,yogurt,yoghurt,skyr,στραγγιστο'],
  ['cheese','Cheese','Τυρί','','τυρ,φετα,feta,cheese,γκουντα,gouda,κασερι,ημισκληρο,μοτσαρελα,mozzarella,γραβιερα,cottage,κοτατζ,ανθοτυρο,μυζηθρα,παρμεζαν,parmesan,cheddar,τσενταρ,ricotta,edam,emmental,κεφαλοτυρ,κρεμα τυριου,philadelphia'],
  ['butter','Butter','Βούτυρο','','βουτυρο,butter,μαργαριν,margarine'],
  ['cream','Cream','Κρέμα γάλακτος','','κρεμα γαλακτοσ,cream,ανθογαλο,σαντιγι'],
 ]],
 ['eggs','Eggs','Αυγά','',[ ['egg','Eggs','Αυγά','','αυγ,egg,ασπραδ,egg white'] ]],
 ['meat','Meat','Κρέας','',[
  ['chicken','Chicken','Κοτόπουλο','','κοτοπουλ,chicken,στηθοσ,μπουτι,φτερουγ'],
  ['turkey','Turkey','Γαλοπούλα','','γαλοπουλ,turkey'],
  ['beef','Beef','Μοσχάρι','','μοσχαρ,beef,steak,μπριζολ,ριμπαι,ribeye'],
  ['pork','Pork','Χοιρινό','','χοιριν,pork,σπαλα,λαιμοσ'],
  ['mince','Mince','Κιμάς','','κιμα,mince,minced,burger,μπιφτεκ'],
  ['coldcuts','Cold cuts','Αλλαντικά','','ζαμπον,ham,μπεικον,bacon,παριζα,σαλαμι,salami,προσουτο,prosciutto,παστουρμα,αλλαντικ,γαλοπουλα καπνιστη'],
  ['sausage','Sausage','Λουκάνικα','','λουκανικ,sausage,hot dog,frankfurter'],
  ['lamb','Lamb & goat','Αρνί & κατσίκι','','αρνι,lamb,κατσικ,goat'],
 ]],
 ['fish','Fish & seafood','Ψάρια & θαλασσινά','',[
  ['tuna','Tuna','Τόνος','','τονο,tuna'], ['salmon','Salmon','Σολομός','','σολομ,salmon'],
  ['shrimp','Shrimp','Γαρίδες','','γαριδ,shrimp,prawn'], ['octopus','Octopus','Χταπόδι','','χταποδ,octopus'],
  ['squid','Squid','Καλαμάρι','','καλαμαρ,squid,σουπι'],
  ['fishgen','Fish','Ψάρι','','ψαρ,fish,βακαλα,μπακαλιαρ,cod,τσιπουρ,λαβρακ,sea bass,σαρδελ,sardine,γαυρ,σκουμπρ,mackerel,γλωσσα,πανγκασιουσ,pangasius'],
 ]],
 ['rice','Rice','Ρύζι','',[ ['rice','Rice','Ρύζι','','ρυζι,rice,basmati,μπασματι,jasmine,καρολινα,νυχακι,γλασσε,parboiled,risotto'] ]],
 ['pasta','Pasta','Ζυμαρικά','',[
  ['pasta','Pasta','Ζυμαρικά','','μακαρον,ζυμαρικ,pasta,spaghetti,σπαγγετ,πεννε,penne,κριθαρακ,orzo,χυλοπιτ,fusilli,βιδακ,ταλιατελ,tagliatelle,λαζανι,lasagn'],
  ['noodles','Noodles','Νουντλς','','noodle,νουντλ,ramen'],
 ]],
 ['bread','Bread & grains','Ψωμί & δημητριακά','',[
  ['bread','Bread','Ψωμί','','ψωμ,bread,τοστ,toast,φρυγανι,παξιμαδ,baguette,μπαγκετ,ψωμακ,bun'],
  ['wrap','Wraps & pitta','Τορτίγιες & πίτες','','tortilla,τορτιγ,wrap,αραβικη,pitta,pita bread,πιτεσ για σουβλακι,πιτα για σουβλακι'],
  ['oats','Oats','Βρώμη','','βρωμη,oat,porridge'],
  ['cereal','Cereal','Δημητριακά','','δημητριακ,cereal,corn flakes,κορν φλεικσ,granola,γκρανολα,μουσλι,muesli'],
  ['flour','Flour','Αλεύρι','','αλευρ,flour,σιμιγδαλ,semolina'],
  ['crackers','Crackers & rice cakes','Κράκερ & ρυζογκοφρέτες','','κρακερ,cracker,κριτσιν,ρυζογκοφρετ,rice cake,rice cakes,ρυζοκρακερ'],
 ]],
 ['veg','Vegetables','Λαχανικά','',[
  ['carrot','Carrot','Καρότο','','καροτ,carrot'], ['tomato','Tomato','Ντομάτα','','ντοματ,tomato,τοματ,πελτε,passata,πασατα'],
  ['potato','Potato','Πατάτα','','πατατ,potato'], ['sweetpotato','Sweet potato','Γλυκοπατάτα','','γλυκοπατατ,sweet potato'],
  ['cucumber','Cucumber & courgette','Αγγούρι & κολοκυθάκι','','αγγουρ,cucumber,κολοκυθακ,zucchini,courgette'],
  ['onion','Onion','Κρεμμύδι','','κρεμμυδ,onion,πρασ,leek'], ['garlic','Garlic','Σκόρδο','','σκορδ,garlic'],
  ['pepper','Pepper','Πιπεριά','','πιπεριεσ,πιπερια φλωρινησ,πιπερια κοκκινη,πιπερια πρασινη,bell pepper,peppers,red pepper,green pepper'],
  ['broccoli','Broccoli & cauliflower','Μπρόκολο & κουνουπίδι','','μπροκολ,broccoli,κουνουπιδ,cauliflower'],
  ['leafy','Leafy greens','Φυλλώδη','','μαρουλ,λαχαν,σπανακ,spinach,lettuce,ροκα,rocket,salad,σαλατα,cabbage,kale,μαιντανο,parsley,σελινο,celery'],
  ['corn','Sweetcorn','Καλαμπόκι','','καλαμποκ,sweetcorn,corn'], ['mushroom','Mushrooms','Μανιτάρια','','μανιταρ,mushroom'],
  ['eggplant','Aubergine','Μελιτζάνα','','μελιτζαν,aubergine,eggplant'],
  ['peas','Peas & green beans','Αρακάς & φασολάκια','','αρακα,peas,φασολακ,green beans'], ['avocado','Avocado','Αβοκάντο','','αβοκαντο,avocado'],
 ]],
 ['fruit','Fruit','Φρούτα','',[
  ['apple','Apple','Μήλο','','μηλο,μηλα,apple'], ['banana','Banana','Μπανάνα','','μπανανα,banana'],
  ['orange','Orange','Πορτοκάλι','','πορτοκαλ,orange,μανταριν,mandarin'], ['lemon','Lemon','Λεμόνι','','λεμον,lemon,lime'],
  ['grapes','Grapes','Σταφύλι','','σταφυλ,grape'], ['strawberry','Strawberries','Φράουλες','','φραουλ,strawberr'],
  ['watermelon','Watermelon & melon','Καρπούζι & πεπόνι','','καρπουζ,watermelon,πεπον,melon'],
  ['peach','Peach','Ροδάκινο','','ροδακιν,peach,νεκταριν,nectarine,βερικοκ,apricot'], ['pear','Pear','Αχλάδι','','αχλαδ,pear'],
  ['kiwi','Kiwi','Ακτινίδιο','','ακτινιδ,kiwi'], ['cherries','Cherries','Κεράσια','','κερασ,cherr,βυσσιν'],
  ['pineapple','Pineapple','Ανανάς','','ανανα,pineapple'], ['mango','Mango','Μάνγκο','','μανγκο,mango'],
  ['berries','Blueberries','Μύρτιλα','','μυρτιλ,blueberr,berries,βατομουρ'],
  ['dried','Dried fruit','Αποξηραμένα','','σταφιδ,raisin,χουρμα,dates,αποξηραμεν,dried'],
 ]],
 ['legumes','Legumes','Όσπρια','',[
  ['beans','Beans','Φασόλια','','φασολ,beans,γιγαντεσ'], ['lentils','Lentils','Φακές','','φακεσ,lentil'],
  ['chickpeas','Chickpeas','Ρεβύθια','','ρεβυθ,chickpea,hummus,χουμουσ'], ['fava','Fava','Φάβα','','φαβα,fava,split pea'],
 ]],
 ['nuts','Nuts & seeds','Ξηροί καρποί & σπόροι','',[
  ['pb','Peanut butter','Φυστικοβούτυρο','','φυστικοβουτυρο,φιστικοβουτυρο,peanut butter,βουτυρο φυστικιου,βουτυρο αραπικου',{s:1}],
  ['peanuts','Peanuts','Φιστίκια','','φιστικ,φυστικ,peanut,αραπικ'], ['almonds','Almonds','Αμύγδαλα','','αμυγδαλ,almond'],
  ['walnuts','Walnuts & other nuts','Καρύδια & άλλοι','','καρυδ,walnut,κασιου,cashew,φουντουκ,hazelnut,pistachio,ξηροι καρποι,nuts'],
  ['seeds','Seeds & tahini','Σπόροι & ταχίνι','','σουσαμ,ταχινι,tahini,chia,λιναρο,flax,ηλιοσπορ,sunflower seed,κολοκυθοσπορ'],
 ]],
 ['oils','Oils, sauces & spreads','Λάδια, σάλτσες & αλείμματα','',[
  ['oliveoil','Olive oil','Ελαιόλαδο','','ελαιολαδ,olive oil,παρθενο',{s:1}],
  ['oil','Other oil','Άλλο λάδι','','λαδι,oil,ηλιελαιο,sunflower oil'],
  ['honey','Honey','Μέλι','','μελι,honey'], ['jam','Jam','Μαρμελάδα','','μαρμελαδ,jam,κομποστα'],
  ['sauce','Sauces','Σάλτσες','','σαλτσ,sauce,κετσαπ,ketchup,μαγιονεζ,mayo,μουσταρδ,mustard,ντρεσινγκ,dressing,σογιασ,soy'],
  ['spread','Sweet spreads','Γλυκά αλείμματα','','nutella,πραλιν,merenda,μερεντα,spread',{s:1}],
  ['sugar','Sugar','Ζάχαρη','','ζαχαρη,sugar'],
  ['seasoning','Salt & spices','Αλάτι & μπαχαρικά','','αλατι,salt,πιπερι,black pepper,ριγανη,oregano,μπαχαρ,spice,κανελα,cinnamon,παπρικα,paprika,κυμινο,cumin'],
 ]],
 ['snacks','Sweets & snacks','Γλυκά & σνακ','',[
  ['chocolate','Chocolate','Σοκολάτα','','σοκολατ,chocolate'], ['biscuits','Biscuits','Μπισκότα','','μπισκοτ,biscuit,cookie,πτι μπερ'],
  ['crisps','Crisps','Πατατάκια','','πατατακ,chips,crisps,γαριδακ,ποπ κορν,popcorn',{s:1}], ['icecream','Ice cream','Παγωτό','','παγωτ,ice cream',{s:1}],
  ['cake','Cakes & pastries','Κέικ & αρτοσκευάσματα','','κεικ,cake,κρουασαν,croissant,τουρτα,donut,ντονατ,muffin,μαφιν'],
  ['candy','Sweets','Καραμέλες','','καραμελ,candy,gummy,ζελεδακ,λουκουμ'],
 ]],
 ['drinks','Drinks','Ροφήματα','',[
  ['juice','Juice','Χυμός','','χυμο,juice,smoothie',{ml:1,s:1}],
  ['soda','Soft drinks','Αναψυκτικά','','αναψυκτ,cola,coca,pepsi,sprite,fanta,λεμοναδ,πορτοκαλαδ,σοδα,soda,ενεργειακ,energy drink,monster,red bull',{ml:1,s:1}],
  ['coffee','Coffee & tea','Καφές & τσάι','','καφε,coffee,espresso,τσαι,tea,freddo,φρεντο,frappe,φραπε',{ml:1,s:1}],
  ['water','Water','Νερό','','νερο,water',{ml:1}],
  ['alcohol','Alcohol','Αλκοόλ','','μπυρα,beer,κρασι,wine,vodka,βοτκα,ουζο,τσιπουρο',{ml:1,s:1}],
 ]],
 ['supps','Supplements','Συμπληρώματα','',[
  ['whey','Protein powder','Πρωτεΐνη σε σκόνη','','whey,πρωτειν,protein powder,isolate,casein,καζειν',{s:1}],
  ['bar','Protein bar','Μπάρα πρωτεΐνης','','protein bar,μπαρα πρωτεινησ',{s:1}],
  ['creatine','Creatine & other','Κρεατίνη & άλλα','','creatine,κρεατιν,omega,ωμεγα,βιταμιν,vitamin,magnesium,μαγνησι,electrolyte'],
 ]],
 ['ready','Ready meals','Έτοιμα φαγητά','',[
  ['pizza','Pizza','Πίτσα','','πιτσα,pizza',{s:1}], ['souvlaki','Souvlaki & gyros','Σουβλάκι & γύρος','','σουβλακ,souvlaki,γυρο,gyros,kebab,κεμπαπ',{s:1}],
  ['pie','Pies','Πίτες','','τυροπιτ,σπανακοπιτ,κουλουρ,pie,μπουγατσ',{s:1}], ['sandwich','Sandwiches','Σάντουιτς','','σαντουιτσ,sandwich,club',{s:1}],
  ['meal','Ready meal','Έτοιμο φαγητό','','ετοιμο φαγητο,ready meal,μουσακα,παστιτσιο,γεμιστα'],
 ]],
 ['other','Other','Άλλο','',[]],
].map(([id,en,el,icon,subs]) => ({ id, en, el, icon,
  subs:[{ id:'general', en:'General', el:'Γενικά', icon, kw:[], opt:{} }, ...subs.map(([sid,sen,sel,si,kw,opt]) => ({ id:sid, en:sen, el:sel, icon:si, kw:kw.split(',').map(norm).filter(Boolean), opt:opt||{} }))]
}));

const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

// 0.7.9.3: category icons from the icon sheet (32 grid, 1.2 stroke, currentColor). Shown small and muted next to a food.
const FOOD_ICON = {
  dairy: '<path d="M16.5 11H5.5V29"/><path d="M5.5 29L16.5 29"/><path d="M16.5 11L16.5 20.09M16.5 27.7L16.5 29"/><path d="M5.5 11L7.6 6.6H14.4L16.5 11"/><path d="M7.6 6.6V4.2H14.4V6.6"/><path d="M5.5 15.5L16.5 15.5"/><path d="M5.5 23.8L15.29 23.8"/><path d="M8 18.4H13.6"/><path d="M8 20.9H11.6"/><ellipse cx="20.6" cy="23.0" rx="4.1" ry="5.4" transform="rotate(28 20.6 23.0)"/><g transform="translate(20.6 23.0) rotate(28)"><path d="M-2.2 -0.6C-2.2 -2.2 -1.5 -3.3 -0.4 -3.7"/></g>',
  meat: '<g transform="translate(10 16.2) rotate(22)"><path d="M-0.5 -8.6C3.5 -9 5.7 -6 5 -3C4.6 -1 3.4 0.5 3.4 3C3.4 6.2 2 8.6 -0.6 8.6C-3.4 8.6 -4.7 6 -4.4 3C-4.2 0.6 -5.5 -1.5 -5.3 -4C-5 -7 -3.4 -8.4 -0.5 -8.6Z"/><path d="M-2.7 -5H2.6M-0.1 -5V2"/><circle cx="-2" cy="4.9" r=".45"/><circle cx="1.2" cy="5.6" r=".45"/></g><g transform="translate(23 15) rotate(35)"><path d="M-1.2 2.6C-3.6 1.4 -4.6 -1.6 -3.8 -4.4C-3 -7.4 3 -7.4 3.8 -4.4C4.6 -1.6 3.6 1.4 1.2 2.6"/><path d="M-1.2 2.6V6.4M1.2 2.6V6.4"/><path d="M-1.2 6.4A1.55 1.55 0 1 0 0 8.4A1.55 1.55 0 1 0 1.2 6.4"/><path d="M1.9 -4.6C2.5 -3.6 2.6 -2.4 2.2 -1.3"/></g>',
  fish: '<path d="M3 16C6.5 10 15.5 9 21.6 14.3L28.6 10C27.2 14 27.2 18 28.6 22L21.6 17.7C15.5 23 6.5 22 3 16Z"/><circle cx="7.8" cy="14.8" r=".9"/><path d="M11.3 11.9C12.7 14.5 12.7 17.5 11.3 20.1"/><path d="M15.4 14.2C16.6 15.3 16.6 16.9 15.4 18"/><path d="M18.4 14.6C19.3 15.5 19.3 16.7 18.4 17.6"/>',
  bread: '<path d="M6.8 25.5H25.2L26.2 18.6C29.6 17.6 29.6 12.6 26.6 10.2C22.4 6.8 9.6 6.8 5.4 10.2C2.4 12.6 2.4 17.6 5.8 18.6Z"/><path d="M10.4 15L12.8 11M15 15.4L17.4 11.4M19.6 15L22 11"/><path d="M5.6 13.6C6 12.2 6.9 11.2 8.2 10.6"/>',
  rice: '<path d="M3 15.5H29C29 21.5 23.5 26 16 26C8.5 26 3 21.5 3 15.5Z"/><path d="M11.8 26L11.2 28.8H20.8L20.2 26"/><path d="M5.4 15.5C6 10.6 10.6 8 16 8.2V15.5"/><path d="M7.6 13.4L8.6 12.9M10 10.9L11 10.5M10.8 13.5H11.9M13.2 9.9L14.1 9.6M13.5 12.2L14.4 12.7"/><path d="M26.6 15.5C27.2 11.6 24.2 8.4 20.8 8.8C18.2 9.1 17 11.6 18 13.2C19 14.8 21.6 14.4 21.7 12.7C21.8 11.5 20.4 11.2 20 12.1"/><path d="M24 15.5C24.4 13.6 23.8 12.2 22.8 11.4"/>',
  veg: '<g transform="translate(12.6 19.2) rotate(45)"><path d="M0 11.5C-1.5 6.5 -3.9 -1.5 -3.7 -5.6C-3.6 -8.2 3.6 -8.2 3.7 -5.6C3.9 -1.5 1.5 6.5 0 11.5Z"/><path d="M-3.4 -3H-1.2M3.2 0.2H1.2M-2.5 3.2H-0.9M1.9 5.8H0.7"/><g transform="translate(0 -7.6) rotate(-42) scale(0.85)"><path d="M0 0C-1.9 -3 -1.5 -6.3 0 -8.6C1.5 -6.3 1.9 -3 0 0Z"/></g><g transform="translate(0 -7.6) rotate(0) scale(1)"><path d="M0 0C-1.9 -3 -1.5 -6.3 0 -8.6C1.5 -6.3 1.9 -3 0 0Z"/></g><g transform="translate(0 -7.6) rotate(42) scale(0.85)"><path d="M0 0C-1.9 -3 -1.5 -6.3 0 -8.6C1.5 -6.3 1.9 -3 0 0Z"/></g></g>',
  fruit: '<path d="M4.6 9.4C3 18.4 9.4 27.6 20.4 27.6C23.2 27.6 25.6 26.6 27.2 24.8L26.4 23.6C20.6 24.6 12.6 21.4 9.2 8.4"/><path d="M4.6 9.4L4.2 6.6L7.4 5.6L9.2 8.4"/><path d="M22.6 11C21 9.4 17.4 9.7 17.2 13.4C17 16.9 19.4 19.8 21.3 19.8C22 19.8 22.2 19.5 22.6 19.5C23 19.5 23.2 19.8 23.9 19.8C25.8 19.8 28.2 16.9 28 13.4C27.8 9.7 24.2 9.4 22.6 11Z"/><path d="M22.6 11C22.5 9.6 22.9 8.4 23.7 7.6"/><path d="M23.9 8.4C24.6 6.4 26.4 5.6 28 5.9C27.8 7.8 26.2 9 23.9 8.4Z"/><path d="M19.1 13.6C19.2 12.6 19.7 11.9 20.5 11.6"/>',
  nuts: '<g transform="translate(16 16) rotate(25)"><path d="M0 -11.4C4.6 -11.4 5.8 -6.8 4.7 -3.6C4 -1.6 4 0.6 5 3C6.8 7.6 4.2 11.6 0 11.6C-4.2 11.6 -6.8 7.6 -5 3C-4 0.6 -4 -1.6 -4.7 -3.6C-5.8 -6.8 -4.6 -11.4 0 -11.4Z"/><path d="M-1.6 -8V-6.5M1.6 -6.4V-4.9M-0.2 -2.6V-1.2M-2.2 3.6V5.1M1.2 2.4V3.9M2.4 6.6V8.1M-0.6 7.6V9.1"/></g>',
  oil: '<path d="M13 3H19V6.4H13Z"/><path d="M13.6 6.4V9.4L9.6 14C9.2 14.5 9 15 9 15.6V27A2 2 0 0 0 11 29H21A2 2 0 0 0 23 27V15.6C23 15 22.8 14.5 22.4 14L18.4 9.4V6.4"/><path d="M9 17.2H23M9 25.6H23"/><path d="M16 18.8C17.3 20.4 18 21.4 18 22.3A2 2 0 0 1 14 22.3C14 21.4 14.7 20.4 16 18.8Z"/>',
  sweets: '<path d="M3.8 14.2H14.6L13.2 28.2H5.2Z"/><path d="M7.3 14.2L7.8 28.2M11.1 14.2L10.6 28.2"/><path d="M4.2 14.2C2.4 13 2.8 10.2 5 10C4.8 7.4 8 6.2 9.6 8C11 5.8 14.2 6.8 14.2 9.4C16.4 9.6 16.6 13 14.4 14.2"/><path d="M19.95 10.72L27.75 15.22"/><path d="M27.75 15.22L21.25 26.48"/><path d="M21.25 26.48L14.68 22.69"/><path d="M14.98 19.33L19.95 10.72"/><path d="M23.85 12.97L17.35 24.23"/><path d="M17.79 14.47L25.58 18.97"/><path d="M15.62 18.23L23.41 22.73"/><circle cx="24.79" cy="15.94" r=".45"/>',
  drink: '<path d="M8.5 8.4H23.5L21.6 28H10.4Z"/><path d="M9 13.4H18.2M20.6 13.4H23"/><rect x="-2.3" y="-2.3" width="4.6" height="4.6" rx=".5" transform="translate(13.6 19.6) rotate(20)"/><path d="M17.2 25L21.2 6.6C21.4 5.7 21.9 5.3 22.8 5.1L26.6 4.2"/><path d="M5.6 8.4A3.5 3.5 0 0 1 12.6 8.4M5.6 8.4H8.5M9.1 8.4V6.4"/>',
  meal: '<path d="M5 24A11 11 0 0 1 27 24"/><path d="M3 24H29"/><circle cx="16" cy="11.2" r="1.8"/><path d="M8.4 21A7.8 7.8 0 0 1 12.4 16.2"/><path d="M9.5 27.4H22.5"/>',
  caps: '<g transform="rotate(-45 16 16)"><rect x="4" y="11" width="24" height="10" rx="5"/><path d="M16 11v10"/></g>' };
const CAT_ICON = { dairy:'dairy', eggs:'dairy', meat:'meat', fish:'fish', bread:'bread', rice:'rice', pasta:'rice', veg:'veg', fruit:'fruit', legumes:'nuts', nuts:'nuts', oils:'oil', snacks:'sweets', drinks:'drink', ready:'meal', supps:'caps' };
const catIcon = (cat, s) => FOOD_ICON[CAT_ICON[cat]] ? `<svg class="cico" viewBox="0 0 32 32" width="${s || 16}" height="${s || 16}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FOOD_ICON[CAT_ICON[cat]]}</svg>` : '';

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
// 0.7.1: new installs start on Automatic + Lime; a device that already had settings keeps what it was showing (Dark)
if(!ui.theme){ ui.theme = { mode: Store.load('ui', null) ? 'dark' : 'auto', preset: 'lime' }; Store.save('ui', ui); }

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

const fmtSize = (n, unit) => unit === 'ml' ? (n >= 1000 ? `${r1(n/1000)} L` : `${r1(n)} ml`) : UN().f === 'oz' ? (n >= 453.6 ? `${r1(n / 453.592)} lb` : `${r1(n / OZ)} oz`) : (n >= 1000 ? `${r1(n/1000)} kg` : `${r1(n)} g`);

const fmtDate = iso => { try{ return new Date(iso).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day:'numeric', month:'short' }); }catch(e){ return ''; } };

const W = p => t(p === 'bar' ? 'foodBar' : p === 'slice' ? 'slice' : 'piece'), WS = p => t(p === 'bar' ? 'foodBars' : p === 'slice' ? 'slicesW' : 'piecesW');

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target === ov && ov.id !== 'ovLang') close(ov.id); });
  ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(ov.id)));
});
