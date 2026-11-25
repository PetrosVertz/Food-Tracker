// Food Coach portion guide (Refinements #5, changes 24 + 25): typical portions of composed dishes, by country.
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// Only Greece for now. Another country = one more key in PORTIONS with the same shape; PORTION_HOME picks the one in use
// (the country in the profile comes in a later round).
//
// Where the numbers come from (nothing here is made up):
//  - "c25": Petros's change 25 profile gyro_pita_medium (pita 75, pork gyro 100, fries 60, sauce 30, vegetables 35 g)
//  - "c24": change 24 LATEST DECISIONS (minimum sensible weights)
//  - "gid": the built-in food list (js/data/foods.js / foods-more.js): its piece weight, or its values per 100 g
//  - "plate": the app's normal plate of a ready dish, 350 g (qaPortion in today.js)
// "?" in a note = uncertain, Petros may want to confirm it.
//
// Each dish:
//  id, en / el    name for the card
//  re             what the user may type (normalized text: lower case, no Greek accents, ς → σ; English, Greek and Greeklish)
//  parts          the usual parts: role (bread, meat, fries, veg, sauce, cheese, pasta, other), built-in food (gid) for the values
//                 per 100 g, grams for one normal portion, optional: an add-on (off unless the user names it)
//  g              no part list: the weight of one normal portion of the whole dish (the AI's parts are scaled up to it)
//  wrap           a wrap: its fries are the small fries inside, not a side (the fries minimum does not apply)
//  count          counted dishes ("2 tost", "3 slices"): the portion is per piece

const PORTION_HOME = 'GR';

// portion words (change 25). Factors multiply the whole meal, or one role only.
const PORTION_WORDS = [
  { re: '\\b(extra large|xl|xxl|huge|giant|very big|poli megal\\w*|γιγαντ\\w*|πολυ μεγαλ\\w*|τεραστι\\w*)\\b', f: 1.6, k: 'xl' },
  { re: '\\b(large|big|megal\\w*|μεγαλ\\w*|γεματ\\w*)\\b', f: 1.3, k: 'large' },
  { re: '\\b(small|little|mini|mikr\\w*|μικρ\\w*|λιγ\\w*)\\b', f: .75, k: 'small' },
  { re: '\\b(medium|normal|regular|kanonik\\w*|κανονικ\\w*|μεσαι\\w*)\\b', f: 1, k: 'normal' },
];
// one role only: double meat ×2 (change 25); "extra" ×1.5 (? change 25 gives no number for extra; 1.5 is the app's own choice)
const PORTION_ROLE_WORDS = [
  { re: '\\b(double|diplo\\w*|διπλ\\w*)\\s+(meat|kreas|κρεασ|gyro\\w*|γυρο\\w*|souvlak\\w*|σουβλακ\\w*|chicken|kotopoul\\w*|κοτοπουλ\\w*|pork|xoirin\\w*|χοιριν\\w*)', role: 'meat', f: 2 },
  { re: '\\b(extra|εξτρα|πολλ\\w*|polla|poli)\\s+(sauce|saltsa|σαλτσα|σωσ|tzatzik\\w*|τζατζικ\\w*|mayo\\w*|μαγιονεζ\\w*|ketchup|κετσαπ)', role: 'sauce', f: 1.5 },
  { re: '\\b(extra|εξτρα|πολλ\\w*|polles|poles)\\s+(fries|chips|patat\\w*|πατατ\\w*)', role: 'fries', f: 1.5 },
  { re: '\\b(extra|εξτρα|διπλ\\w*|diplo)\\s+(cheese|tyri|τυρι)', role: 'cheese', f: 1.5 },
];

// hidden cooking oil per part, grams (change 25 ranges, midpoints): boiled 0, grilled 3-5, pan cooked 5-10, fried 10-20 absorbed.
// Added only to parts whose numbers came from the AI (the AI is told to leave the oil out); built-in cooked foods
// (fries, gyros, souvlaki…) already include their fat, so they get none. Scaled with the portion.
const PORTION_OIL = { boiled: 0, raw: 0, baked: 0, grilled: 4, pan: 7.5, fried: 15 };
const PORTION_OIL_GID = 'olive_oil';   // "Mediterranean restaurants: consider olive oil" (change 25)

const PORTIONS = {
  GR: {
    name: 'Greece',
    // minimum sensible weight of one normal portion of a part (change 24 B). Not applied when the user says small or writes grams.
    mins: [
      { re: '\\b(pita|pitta|πιτα)\\b(?!.*(gyro|γυρο|souvlak|σουβλακ|kebab|κεμπαπ))', g: 60, note: 'c24: about 60-70 g, the lower end' },
      { re: '(gyro|giro|γυρο)', role: 'meat', g: 80, note: 'c24' },
      { re: '(fries|chips|πατατεσ τηγαν|πατατεσ|patates)', role: 'fries', g: 100, side: true, note: 'c24: a fries portion as a side; not the fries inside a wrap' },
      { re: '(pizza|pitsa|πιτσα)', g: 100, per: 'slice', note: 'c24: one slice' },
    ],
    dishes: [
      { id: 'gyro_pita_pork', en: 'Pork Gyro Pita', el: 'Πίτα Γύρος Χοιρινό', wrap: true, count: true,
        re: '(gyro\\w*|giro\\w*|γυρο\\w*)(?!.*(kotopoul|κοτοπουλ|chicken))',
        need: '(pita|pitta|πιτα|wrap|τυλιχτ|tilixt)',
        parts: [
          { role: 'bread', gid: 'pita', g: 75, note: 'c25 (built-in pita piece is 90 g)' },
          { role: 'meat', gid: 'pork_gyros', g: 100, note: 'c25' },
          { role: 'fries', gid: 'fries', g: 60, note: 'c25' },
          { role: 'veg', gid: 'onion', g: 15, note: 'c25 vegetables 35 g: onion 15 (c25 example)' },
          { role: 'veg', gid: 'tomato', g: 20, note: 'c25 vegetables 35 g: the other 20 g, tomato ?' },
          { role: 'sauce', gid: 'tzatziki', g: 30, optional: true, note: 'c25; c24 says optional add-on' },
        ] },
      { id: 'gyro_pita_chicken', en: 'Chicken Gyro Pita', el: 'Πίτα Γύρος Κοτόπουλο', wrap: true, count: true,
        re: '(gyro\\w*|giro\\w*|γυρο\\w*).*(kotopoul\\w*|κοτοπουλ\\w*|chicken)|(kotopoul\\w*|κοτοπουλ\\w*|chicken).*(gyro\\w*|giro\\w*|γυρο\\w*)',
        need: '(pita|pitta|πιτα|wrap|τυλιχτ|tilixt)',
        parts: [
          { role: 'bread', gid: 'pita', g: 75, note: 'as the pork gyro pita (c25) ?' },
          { role: 'meat', gid: 'chicken_gyros', g: 100, note: 'as the pork gyro pita (c25) ?' },
          { role: 'fries', gid: 'fries', g: 60, note: 'as the pork gyro pita (c25) ?' },
          { role: 'veg', gid: 'onion', g: 15, note: '?' },
          { role: 'veg', gid: 'tomato', g: 20, note: '?' },
          { role: 'sauce', gid: 'tzatziki', g: 30, optional: true, note: '?' },
        ] },
      { id: 'souvlaki_pita', en: 'Souvlaki Pita', el: 'Πίτα Σουβλάκι', wrap: true, count: true, g: 300,
        re: '(souvlak\\w*|σουβλακ\\w*|kalamak\\w*|καλαμακ\\w*)', need: '(pita|pitta|πιτα|wrap|τυλιχτ|tilixt)', note: 'gid pita_souvlaki piece 300 g' },
      { id: 'kebab_pita', en: 'Kebab Pita', el: 'Πίτα Κεμπάπ', wrap: true, count: true, g: 250,
        re: '(kebab\\w*|κεμπαπ\\w*|doner|ντονερ)', need: '(pita|pitta|πιτα|wrap|τυλιχτ)', note: 'gid pita_kebab piece 250 g' },
      { id: 'falafel_pita', en: 'Falafel Pita', el: 'Πίτα Φαλάφελ', wrap: true, count: true, g: 250,
        re: '(falafel|φαλαφελ)', need: '(pita|pitta|πιτα|wrap)', note: 'gid falafel_wrap piece 250 g' },
      { id: 'gyros_plate', en: 'Gyros Plate', el: 'Μερίδα Γύρος', g: 350,
        re: '(gyro\\w*|giro\\w*|γυρο\\w*)', need: '(merida|μεριδα|plate|piato|πιατο|portion)', note: 'plate 350 g ? (gid gyros_merida has no portion weight)' },
      { id: 'souvlaki_plate', en: 'Souvlaki Plate', el: 'Μερίδα Σουβλάκι', g: 350,
        re: '(souvlak\\w*|σουβλακ\\w*|kalamak\\w*|καλαμακ\\w*)', need: '(merida|μεριδα|plate|piato|πιατο|portion)', note: 'plate 350 g ? (gid souvlaki_merida has no portion weight)' },
      { id: 'tost', en: 'Ham And Cheese Toastie', el: 'Τοστ Ζαμπόν Τυρί', count: true, g: 120,
        re: '\\b(tost|τοστ|toastie|toasty)\\b', note: 'gid toast_hc piece 120 g' },
      { id: 'pizza', en: 'Pizza', el: 'Πίτσα', count: true, g: 110, per: 'slice',
        re: '(pizza|pitsa|πιτσα)', note: 'gid pizza slice 110 g; per slice' },
      { id: 'pasta_mince', en: 'Spaghetti With Mince', el: 'Μακαρονάδα Με Κιμά', g: 350,
        re: '(makaron\\w*|μακαρον\\w*|spaghet\\w*|σπαγγετ\\w*|pasta|ζυμαρικ\\w*).*(kima|κιμα|mince|bolognese|μπολονεζ|(beef|meat|mince|kreat\\w*|κρεατ\\w*) sauce|σαλτσα κιμα)|(bolognese|μπολονεζ)', note: 'plate 350 g ? (gid makaronada_kima has no portion weight)' },
      { id: 'burger', en: 'Burger', el: 'Μπέργκερ', count: true, g: 200,
        re: '(burger|μπεργκερ|χαμπουργκερ|hamburger)', note: 'gid burger / cheeseburger piece 200 g (double_burger 280 g)' },
    ],
  },
};

// ---------- Ask first (Food Coach), table ASK_DISHES: a takeaway dish with no details gets one small card ----------
// Burger / crepe / pita / sandwich: "tick" cards: groups of ticks under a small title (Meat, Cheese, Veg, Sauces…); the base is always counted, each item is a tick
// (on = the usual one, so the card starts as a typical dish). A group with one: 1 is a single choice (the meat in a pita, the bread of a sandwich).
// Pizza: a "pick" card: one type (values per 100 g from the built-in foods) and a number of slices; "None of the above" = a general estimate.
// re / skip: what the user typed (normalized text: lower case, no Greek accents, ς → σ; English, Greek and Greeklish); a message that also says chicken, veggie, fish… goes the normal way (the AI).
// gid = the built-in food for the values per 100 g; g = grams of one normal portion; en / el = the name shown on the card; kw = words that name an item (a list = one point per match).
// The app does all the maths from these (no AI), so it also works offline. Numbers are typical, never a brand's menu: the coach says so on the card.

// Branded takeaway places and menu items: the user may name them ("McDonald's burger", "Big Mac", "Pizza Fan pepperoni"). The app has no brand's official numbers,
// so it still gives the estimate from typical ingredients and says so on the card (never a brand's figure as if it were real). dish: what the place is known for,
// so its name alone ("Everest", "Pizza Fan") opens that card.
const ASK_BRANDS = [
  { name: "McDonald's", re: '(mcdonald\\w*|mc donald\\w*|μακντοναλντ\\w*|μακ ντοναλντ\\w*)' }, { name: 'Burger King', dish: 'burger', re: '(burger king|μπεργκερ κινγκ)' },
  { name: "Goody's", re: '(goody\\w*|γκουντι\\w*)' }, { name: 'Everest', dish: 'sandwich', re: '(everest|εβερεστ)' }, { name: "Domino's", dish: 'pizza', re: '(domino\\w*|ντομινο\\w*)' },
  { name: 'Pizza Hut', dish: 'pizza', re: '(pizza hut|πιτσα χατ)' }, { name: 'Pizza Fan', dish: 'pizza', re: '(pizza fan|πιτσα φαν)' }, { name: 'Telepizza', dish: 'pizza', re: '(telepizza|τελεπιτσα)' },
  { name: "Papa John's", dish: 'pizza', re: '(papa john\\w*|παπα τζον\\w*)' }, { name: 'KFC', re: '(kfc)' }, { name: 'Crepaffair', dish: 'crepe', re: '(crepaffair|κρεπαφερ)' }
];
const ASK_DISHES = [
  { id: 'burger', kind: 'tick', en: 'Burger', el: 'Μπέργκερ', re: '\\b(burger|burgers|μπεργκερ|χαμπουργκερ|hamburger|cheeseburger|big mac|whopper)\\b',
    skip: '\\b(chicken|kotopoul\\w*|κοτοπουλ\\w*|veggie|vegan|vegetarian|fish|psari\\w*|ψαρ\\w*|bifteki|μπιφτεκ\\w*|sandwich|σαντουιτσ\\w*)\\b',
    named: [{ re: '(big mac|μπιγκ μακ)', name: 'Big Mac', brand: "McDonald's", on: ['Cheddar', 'Lettuce', 'Onion', 'Pickles', 'Mayo'] },   // two thin patties weigh about one normal patty
      { re: '(whopper|γουοπερ)', name: 'Whopper', brand: 'Burger King', on: ['Lettuce', 'Tomato', 'Onion', 'Pickles', 'Ketchup', 'Mayo'] },
      { re: '(cheeseburger|τσιζμπεργκερ)', name: 'Cheeseburger', brand: '', on: ['Cheddar', 'Onion', 'Pickles', 'Ketchup', 'Mustard'] }],
    base: [{ gid: 'bread_roll', g: 60, role: 'bread', en: 'Bun', el: 'Ψωμάκι' }, { gid: 'beef_burger_c', g: 90, role: 'meat', en: 'Beef Patty', el: 'Μπιφτέκι Μοσχαρίσιο' }],
    groups: [{ k: 'a', en: 'Meat', el: 'Κρέας', items: [{ gid: 'bacon_c', g: 16, role: 'meat', en: 'Bacon', el: 'Μπέικον' }, { gid: 'beef_burger_c', g: 90, role: 'meat', en: 'Double Patty', el: 'Διπλό Μπιφτέκι' }] },
      { k: 'b', en: 'Cheese', el: 'Τυρί', items: [{ gid: 'cheddar', g: 20, on: 1, role: 'cheese', en: 'Cheddar', el: 'Τσένταρ', kw: 'cheddar|cheese|tyri|τυρι|τσενταρ' }] },
      { k: 'c', en: 'Veg', el: 'Λαχανικά', items: [{ gid: 'lettuce', g: 10, on: 1, role: 'veg', en: 'Lettuce', el: 'Μαρούλι' }, { gid: 'tomato', g: 20, on: 1, role: 'veg', en: 'Tomato', el: 'Ντομάτα' },
        { gid: 'onion', g: 15, role: 'veg', en: 'Onion', el: 'Κρεμμύδι' }, { gid: 'sr_168558', g: 10, role: 'veg', en: 'Pickles', el: 'Αγγουράκια τουρσί' }] },
      { k: 'd', en: 'Sauces', el: 'Σάλτσες', items: [{ gid: 'ketchup', g: 15, on: 1, role: 'sauce', en: 'Ketchup', el: 'Κέτσαπ' }, { gid: 'mayo', g: 15, role: 'sauce', en: 'Mayo', el: 'Μαγιονέζα' },
        { gid: 'mustard', g: 5, role: 'sauce', en: 'Mustard', el: 'Μουστάρδα' }] }] },
  { id: 'pizza', kind: 'pick', en: 'Pizza', el: 'Πίτσα', re: '\\b(pizza|pizzas|pitsa|pitses|πιτσα|πιτσεσ)\\b', per: 'slice', slices: 3, whole: 8, cm: 28,   // a 28 cm pizza is cut in 8; about 75 g a slice (about 600 g in all), worked out from its size: other pizzas will need their own cm and slices
    options: [{ gid: 'pizza', g: 70, en: 'Margherita', el: 'Μαργαρίτα', kw: 'margherita|margarita|μαργαριτα' }, { gid: 'pizza_pepperoni', g: 75, en: 'Pepperoni', el: 'Πεπερόνι', kw: 'pepperoni|πεπερονι' },
      { gid: 'pizza_special', g: 80, en: 'Special', el: 'Σπέσιαλ', kw: 'special|σπεσιαλ' }, { gid: 'pizza_chicken', g: 80, en: 'Chicken', el: 'Κοτόπουλο', kw: 'chicken|κοτοπουλο' },
      { gid: 'pizza_veg', g: 75, en: 'Vegetarian', el: 'Λαχανικά', kw: 'veg\\w*|vegetarian|λαχανικα' }],
    general: { gid: 'pizza_special', g: 78 } },
  { id: 'crepe', kind: 'tick', en: 'Crepe', el: 'Κρέπα', re: '\\b(crepe|crepes|krepa|krepes|κρεπα|κρεπεσ)\\b', modes: ['savory', 'sweet'],
    base: [{ gid: 'pancakes', g: 90, role: 'bread', en: 'Crepe', el: 'Κρέπα' }],
    savory: [{ k: 'a', en: 'Meat', el: 'Κρέας', items: [{ gid: 'ham', g: 30, on: 1, role: 'meat', en: 'Ham', el: 'Ζαμπόν' }, { gid: 'chicken_breast_c', g: 60, role: 'meat', en: 'Chicken', el: 'Κοτόπουλο' },
        { gid: 'chicken_nuggets', g: 60, role: 'meat', en: 'Chicken Nuggets', el: 'Κοτομπουκιές' }, { gid: 'bacon_c', g: 16, role: 'meat', en: 'Bacon', el: 'Μπέικον' }, { gid: 'sausage_c', g: 60, role: 'meat', en: 'Sausage', el: 'Λουκάνικο' }] },
      { k: 'b', en: 'Cheese', el: 'Τυρί', items: [{ gid: 'gouda', g: 30, on: 1, role: 'cheese', en: 'Gouda', el: 'Γκούντα', kw: 'gouda|cheese|tyri|τυρι|γκουντα' }, { gid: 'mozzarella', g: 30, role: 'cheese', en: 'Mozzarella', el: 'Μοτσαρέλα' },
        { gid: 'feta', g: 30, role: 'cheese', en: 'Feta', el: 'Φέτα' }, { gid: 'cheddar', g: 20, role: 'cheese', en: 'Cheddar', el: 'Τσένταρ' }, { gid: 'cream_cheese', g: 20, role: 'cheese', en: 'Cream Cheese', el: 'Κρέμα τυριού' }] },
      { k: 'c', en: 'Veg', el: 'Λαχανικά', items: [{ gid: 'mushrooms_c', g: 30, role: 'veg', en: 'Mushrooms', el: 'Μανιτάρια' }, { gid: 'corn', g: 25, role: 'veg', en: 'Corn', el: 'Καλαμπόκι' }, { gid: 'tomato', g: 20, role: 'veg', en: 'Tomato', el: 'Ντομάτα' }] },
      { k: 'd', en: 'Extras', el: 'Επιπλέον', items: [{ gid: 'fries', g: 60, role: 'fries', en: 'Fries', el: 'Πατάτες τηγανητές' }, { gid: 'egg_c', g: 50, role: 'other', en: 'Egg', el: 'Αυγό' }] },
      { k: 'e', en: 'Sauces', el: 'Σάλτσες', items: [{ gid: 'mayo', g: 15, role: 'sauce', en: 'Mayo', el: 'Μαγιονέζα' }] }],
    sweet: [{ k: 'a', en: 'Spreads', el: 'Αλείμματα', items: [{ gid: 'nutella', g: 30, on: 1, role: 'sauce', en: 'Nutella', el: 'Nutella' }, { gid: 'honey', g: 15, role: 'sauce', en: 'Honey', el: 'Μέλι' },
        { gid: 'dark_choc', g: 15, role: 'sauce', en: 'Chocolate', el: 'Σοκολάτα' }] },
      { k: 'b', en: 'Fruit', el: 'Φρούτα', items: [{ gid: 'banana', g: 60, on: 1, role: 'veg', en: 'Banana', el: 'Μπανάνα' }, { gid: 'strawberry', g: 40, role: 'veg', en: 'Strawberries', el: 'Φράουλες' },
        { gid: 'pineapple', g: 40, role: 'veg', en: 'Pineapple', el: 'Ανανάς' }] },
      { k: 'c', en: 'Extras', el: 'Επιπλέον', items: [{ gid: 'whipped_cream', g: 20, role: 'other', en: 'Whipped Cream', el: 'Σαντιγί' }, { gid: 'ice_cream', g: 60, role: 'other', en: 'Ice Cream', el: 'Παγωτό' },
        { gid: 'hazelnuts', g: 15, role: 'other', en: 'Hazelnuts', el: 'Φουντούκια' }] }] },
  // Pita: the meat is ONE choice (one: 1). A message that names the meat (pork gyro, chicken souvlaki…) picks it.
  { id: 'pita', kind: 'tick', en: 'Pita', el: 'Πίτα', re: '\\b(pita|pitta|πιτα|gyro|gyros|giro|giros|γυρο|γυροσ|souvlaki|souvlakia|σουβλακι|σουβλακια|kalamaki|kalamakia|καλαμακι|καλαμακια|kebab|kebap|κεμπαπ|doner|ντονερ)\\b',
    skip: '\\b(merida|μεριδα|plate|piato|πιατο|portion|salad|σαλατα|box)\\b', titleFrom: 'a',
    base: [{ gid: 'pita', g: 75, role: 'bread', en: 'Pita Bread', el: 'Πίτα' }],
    groups: [{ k: 'a', one: 1, en: 'Meat', el: 'Κρέας', items: [
      { gid: 'pork_gyros', g: 100, on: 1, role: 'meat', en: 'Pork Gyro', el: 'Γύρος Χοιρινό', kw: ['(gyro\\w*|giro\\w*|γυρο\\w*)', '(pork|χοιριν\\w*|xoirin\\w*)'] },
      { gid: 'chicken_gyros', g: 100, role: 'meat', en: 'Chicken Gyro', el: 'Γύρος Κοτόπουλο', kw: ['(gyro\\w*|giro\\w*|γυρο\\w*)', '(chicken|κοτοπουλ\\w*|kotopoul\\w*)'] },
      { gid: 'pork_souvlaki', g: 100, role: 'meat', en: 'Pork Souvlaki', el: 'Σουβλάκι Χοιρινό', kw: ['(souvlak\\w*|σουβλακ\\w*|kalamak\\w*|καλαμακ\\w*)', '(pork|χοιριν\\w*|xoirin\\w*)'] },
      { gid: 'chicken_souvlaki', g: 100, role: 'meat', en: 'Chicken Souvlaki', el: 'Σουβλάκι Κοτόπουλο', kw: ['(souvlak\\w*|σουβλακ\\w*|kalamak\\w*|καλαμακ\\w*)', '(chicken|κοτοπουλ\\w*|kotopoul\\w*)'] },
      { gid: 'kebab_beef', g: 100, role: 'meat', en: 'Kebab', el: 'Κεμπάπ', kw: ['(kebab|kebap|κεμπαπ\\w*|doner|ντονερ)'] },
      { gid: 'bifteki', g: 100, role: 'meat', en: 'Bifteki', el: 'Μπιφτέκι', kw: ['(bifteki|μπιφτεκ\\w*)'] }] },
      { k: 'b', en: 'Veg', el: 'Λαχανικά', items: [{ gid: 'tomato', g: 20, on: 1, role: 'veg', en: 'Tomato', el: 'Ντομάτα' }, { gid: 'onion', g: 15, on: 1, role: 'veg', en: 'Onion', el: 'Κρεμμύδι' },
        { gid: 'lettuce', g: 10, role: 'veg', en: 'Lettuce', el: 'Μαρούλι' }, { gid: 'cabbage', g: 20, role: 'veg', en: 'Cabbage', el: 'Λάχανο' }, { gid: 'cucumber', g: 15, role: 'veg', en: 'Cucumber', el: 'Αγγούρι' },
        { gid: 'sr_168558', g: 10, role: 'veg', en: 'Pickles', el: 'Τουρσί' }, { gid: 'parsley', g: 5, role: 'veg', en: 'Parsley', el: 'Μαϊντανός' }] },
      { k: 'c', en: 'Cheese', el: 'Τυρί', items: [{ gid: 'feta', g: 20, role: 'cheese', en: 'Feta', el: 'Φέτα' }] },
      { k: 'd', en: 'Extras', el: 'Επιπλέον', items: [{ gid: 'fries', g: 60, on: 1, role: 'fries', en: 'Fries', el: 'Πατάτες' }] },
      { k: 'e', en: 'Sauces', el: 'Σάλτσες', items: [{ gid: 'tzatziki', g: 30, on: 1, role: 'sauce', en: 'Tzatziki', el: 'Τζατζίκι' }, { gid: 'ketchup', g: 10, role: 'sauce', en: 'Ketchup', el: 'Κέτσαπ' },
        { gid: 'mustard', g: 5, role: 'sauce', en: 'Mustard', el: 'Μουστάρδα' }] }] },
  // Sandwich (Everest-type takeaway): the bread is ONE choice (title = what it makes: Toast, Club Sandwich…), then ticks.
  { id: 'sandwich', kind: 'tick', en: 'Sandwich', el: 'Σάντουιτς', re: '\\b(sandwich|sandwiches|sandwitch|σαντουιτσ|σαντουιτς|τοστ|tost|toast|toasts|baguette|baguettes|μπαγκετα|panini|πανινι|club|κλαμπ)\\b',
    skip: '\\b(avocado|αβοκαντο|french|φρεντσ|peanut|φυστικοβουτυρο|beans|jam|μαρμελαδα)\\b', titleFrom: 'a',
    groups: [{ k: 'a', one: 1, en: 'Bread', el: 'Ψωμί', items: [
      { gid: 'baguette', g: 100, on: 1, role: 'bread', en: 'Baguette', el: 'Μπαγκέτα', title: ['Baguette Sandwich', 'Σάντουιτς Μπαγκέτα'], kw: ['(baguette|μπαγκετα)'] },
      { gid: 'bread_toast', g: 60, role: 'bread', en: 'Toast', el: 'Τοστ', title: ['Toast', 'Τοστ'], kw: ['(toast|toasts|tost|τοστ)'] },
      { gid: 'bread_toast', g: 90, role: 'bread', en: 'Club Sandwich', el: 'Κλαμπ Σάντουιτς', title: ['Club Sandwich', 'Κλαμπ Σάντουιτς'], kw: ['(club|κλαμπ)'] },
      { gid: 'croissant', g: 70, role: 'bread', en: 'Croissant', el: 'Κρουασάν', title: ['Croissant Sandwich', 'Σάντουιτς Κρουασάν'], kw: ['(croissant|κρουασαν)'] },
      { gid: 'tortilla', g: 60, role: 'bread', en: 'Wrap', el: 'Τορτίγια', title: ['Wrap', 'Τυλιχτό'], kw: ['(wrap|τυλιχτο|tortilla)'] }] },
      { k: 'b', en: 'Meat & Fish', el: 'Κρέας & Ψάρι', items: [{ gid: 'ham', g: 30, on: 1, role: 'meat', en: 'Ham', el: 'Ζαμπόν' }, { gid: 'turkey_slices', g: 30, role: 'meat', en: 'Turkey', el: 'Γαλοπούλα' },
        { gid: 'chicken_slices', g: 40, role: 'meat', en: 'Chicken', el: 'Κοτόπουλο' }, { gid: 'bacon_c', g: 16, role: 'meat', en: 'Bacon', el: 'Μπέικον' }, { gid: 'salami', g: 20, role: 'meat', en: 'Salami', el: 'Σαλάμι' },
        { gid: 'tuna_oil', g: 40, role: 'meat', en: 'Tuna', el: 'Τόνος' }] },
      { k: 'c', en: 'Cheese', el: 'Τυρί', items: [{ gid: 'gouda', g: 30, on: 1, role: 'cheese', en: 'Gouda', el: 'Γκούντα', kw: 'gouda|cheese|tyri|τυρι|γκουντα' }, { gid: 'kasseri', g: 30, role: 'cheese', en: 'Kasseri', el: 'Κασέρι' },
        { gid: 'cream_cheese', g: 20, role: 'cheese', en: 'Cream Cheese', el: 'Τυρί κρέμα' }] },
      { k: 'd', en: 'Veg', el: 'Λαχανικά', items: [{ gid: 'tomato', g: 20, on: 1, role: 'veg', en: 'Tomato', el: 'Ντομάτα' }, { gid: 'lettuce', g: 10, on: 1, role: 'veg', en: 'Lettuce', el: 'Μαρούλι' },
        { gid: 'cucumber', g: 15, role: 'veg', en: 'Cucumber', el: 'Αγγούρι' }, { gid: 'olives', g: 10, role: 'veg', en: 'Olives', el: 'Ελιές' }, { gid: 'corn', g: 20, role: 'veg', en: 'Corn', el: 'Καλαμπόκι' }] },
      { k: 'e', en: 'Extras', el: 'Επιπλέον', items: [{ gid: 'egg_c', g: 50, role: 'other', en: 'Egg', el: 'Αυγό' }] },
      { k: 'f', en: 'Sauces', el: 'Σάλτσες', items: [{ gid: 'mayo', g: 15, on: 1, role: 'sauce', en: 'Mayo', el: 'Μαγιονέζα' }, { gid: 'mustard', g: 5, role: 'sauce', en: 'Mustard', el: 'Μουστάρδα' },
        { gid: 'ketchup', g: 10, role: 'sauce', en: 'Ketchup', el: 'Κέτσαπ' }] }] }
];
