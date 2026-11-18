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
