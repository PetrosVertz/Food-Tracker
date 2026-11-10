// All app text in English + Greek (S table, t() reads it).
// Food Tracker · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ======================= text in both languages =======================
const S = {
 homeHello:['What are we doing today?','Τι κάνουμε σήμερα;'],
 tScan:['Food tracker','Food tracker'], tScanSub:['Scan a barcode to add a food','Σκάναρε barcode για να προσθέσεις τρόφιμο'],
 tFoods:['My foods','Τα τρόφιμά μου'], tMeals:['Home-cooked','Σπιτικά φαγητά'],
 tFridge:['Fridge','Ψυγείο'], tFridgeSub:['What you have at home','Τι έχεις στο σπίτι'],
 tGroc:['Groceries','Ψώνια'], tGrocSub:['Your shopping list','Η λίστα για ψώνια'], soon:['soon','σύντομα'],
 nFoods:['{n} foods','{n} τρόφιμα'], nFood:['1 food','1 τρόφιμο'], nMeals:['{n} meals','{n} φαγητά'], nMeal:['1 meal','1 φαγητό'],
 myFoods:['My foods','Τα τρόφιμά μου'], tabStore:['Store-bought','Από το μαγαζί'], tabMeals:['Home-cooked','Σπιτικά'],
 searchFoods:['Search food, brand or category…','Αναζήτηση τροφίμου, μάρκας ή κατηγορίας…'], searchMeals:['Search your meals…','Αναζήτηση φαγητών…'],
 addFoodFab:['＋ Add food','＋ Προσθήκη'], cookFab:['🍳 Cook a meal','🍳 Μαγείρεψε'],
 addFood:['Add food','Προσθήκη τροφίμου'], addSub:['Barcode is fastest. If the product isn’t found, snap the label.','Το barcode είναι το πιο γρήγορο. Αν δεν βρεθεί, φωτογράφισε την ετικέτα.'],
 optScan:['Scan barcode<small>Live camera, looks it up on Open Food Facts</small>','Σάρωση barcode<small>Ζωντανή κάμερα, αναζήτηση στο Open Food Facts</small>'],
 optPhoto:['Photo of nutrition label<small>Read by Gemini (free key in settings)</small>','Φωτογραφία διατροφικής ετικέτας<small>Τη διαβάζει το Gemini (δωρεάν κλειδί στις ρυθμίσεις)</small>'],
 optManual:['Type it in<small>Copy the numbers off the label</small>','Πληκτρολόγηση<small>Αντέγραψε τους αριθμούς από την ετικέτα</small>'],
 cancel:['Cancel','Άκυρο'], close:['Close','Κλείσιμο'], back:['Back','Πίσω'], save:['Save','Αποθήκευση'], skip:['Skip','Παράλειψη'], add:['Add','Προσθήκη'],
 delete:['Delete','Διαγραφή'], duplicate:['Duplicate','Αντίγραφο'], edit:['Edit','Επεξεργασία'],
 scanTitle:['Scan barcode','Σάρωση barcode'], scanSub:['Hold the phone 15–20 cm away with the barcode inside the box.','Κράτα το κινητό 15–20 εκ. μακριά, με το barcode μέσα στο πλαίσιο.'],
 light:['🔦 Light','🔦 Φως'], scanPhoto:['📷 Scan from a photo instead','📷 Σάρωση από φωτογραφία'],
 typeCode:['Or type every number under the barcode','Ή γράψε όλους τους αριθμούς κάτω από το barcode'], lookUp:['Look up','Αναζήτηση'],
 noBarcodeLabel:['📷 Label photo','📷 Φωτό ετικέτας'], typeIt:['✎ Type it in','✎ Πληκτρολόγηση'],
 startingCam:['Starting camera…','Άνοιγμα κάμερας…'], lookingUp:['Looking up {c}…','Αναζήτηση {c}…'],
 camBlocked:['Camera permission was blocked. Allow it in your browser settings, or use a photo / type the number.','Η κάμερα μπλοκαρίστηκε. Επίτρεψέ την στις ρυθμίσεις του browser ή χρησιμοποίησε φωτογραφία / γράψε τον αριθμό.'],
 camHttps:['The camera only works on your https:// link. Type the number below instead.','Η κάμερα δουλεύει μόνο στο https:// link. Γράψε τον αριθμό από κάτω.'],
 camFail:['Couldn’t start the live scanner. Use “Scan from a photo” or type the number.','Δεν ξεκίνησε η σάρωση. Δοκίμασε «Σάρωση από φωτογραφία» ή γράψε τον αριθμό.'],
 readingPhoto:['Reading the barcode from the photo…','Διαβάζω το barcode από τη φωτογραφία…'],
 noCodeInPhoto:['No barcode found in that photo. Get closer and keep it sharp, or type the number.','Δεν βρέθηκε barcode. Πλησίασε και κράτα τη φωτογραφία καθαρή, ή γράψε τον αριθμό.'],
 photoFail:['Couldn’t read that photo. Type the number below instead.','Δεν διαβάστηκε η φωτογραφία. Γράψε τον αριθμό από κάτω.'],
 typeCodeFirst:['Type the numbers under the barcode first','Γράψε πρώτα τους αριθμούς του barcode'], codeShort:['Barcodes have 8 or 13 digits, keep going','Τα barcode έχουν 8 ή 13 ψηφία, συνέχισε'],
 codeInvalid:['That number doesn’t look like a valid barcode (a digit may be off). Look it up anyway?','Ο αριθμός δεν μοιάζει με σωστό barcode (ίσως λάθος ψηφίο). Αναζήτηση έτσι κι αλλιώς;'],
 alreadyHave:['Already in your foods','Υπάρχει ήδη στα τρόφιμά σου'],
 notInOFF:['not in Open Food Facts','δεν υπάρχει στο Open Food Facts'], noMacros:['found, but with no macros','βρέθηκε, αλλά χωρίς μακροθρεπτικά'], lookupFail:['lookup failed (no internet?)','η αναζήτηση απέτυχε (χωρίς ίντερνετ;)'],
 notFoundMsg:['Barcode {c}: {why}. Snap the nutrition label or type it in, and the barcode will be saved with it.','Barcode {c}: {why}. Φωτογράφισε την ετικέτα ή πληκτρολόγησέ το, και το barcode θα αποθηκευτεί μαζί.'],
 needKey:['Add your free Gemini key in Settings (⚙︎) first, or type the label in.','Βάλε πρώτα το δωρεάν κλειδί Gemini στις Ρυθμίσεις (⚙︎), ή πληκτρολόγησε την ετικέτα.'],
 readingLabel:['Reading the label…','Διαβάζω την ετικέτα…'], labelFail:['Couldn’t read it: {e}. Try a sharper, straight-on photo, or type it in.','Δεν διαβάστηκε: {e}. Δοκίμασε πιο καθαρή φωτογραφία ή πληκτρολόγησέ το.'],
 newFood:['New food','Νέο τρόφιμο'], editFood:['Edit food','Επεξεργασία τροφίμου'],
 checkLabel:['Check the numbers against the label, then save.','Έλεγξε τους αριθμούς με την ετικέτα και αποθήκευσε.'], changeAny:['Change anything, then save.','Άλλαξε ό,τι θέλεις και αποθήκευσε.'],
 copyOf:['Copy of an existing food: change the flavour or size, then save.','Αντίγραφο τροφίμου: άλλαξε γεύση ή μέγεθος και αποθήκευσε.'],
 foodType:['Food type','Είδος τροφίμου'], brand:['Brand','Μάρκα'], brandPh:['e.g. Μεβγάλ','π.χ. Μεβγάλ'], noBrand:['No brand','Χωρίς μάρκα'],
 product:['Product','Προϊόν'], productPh:['e.g. Greek yogurt 2%','π.χ. Γιαούρτι στραγγιστό 2%'],
 labelFor:['Label values are for the food when it’s…','Οι τιμές της ετικέτας είναι για το τρόφιμο…'],
 uncooked:['Uncooked','Ωμό'], cooked:['Cooked','Μαγειρεμένο'], ready:['Ready to eat','Έτοιμο'],
 stateHint:['Rice, pasta, oats and raw meat labels are almost always uncooked values.','Σε ρύζι, ζυμαρικά, βρώμη και ωμό κρέας, οι τιμές είναι σχεδόν πάντα για ωμό.'],
 measuredIn:['Measured in','Μετριέται σε'], grams:['grams (g)','γραμμάρια (g)'], millilitres:['millilitres (ml)','ml'],
 per100:['Per 100 {u}','Ανά 100 {u}'], protein:['Protein','Πρωτ.'], carbs:['Carbs','Υδατ.'], fat:['Fat','Λιπαρά'],
 fibre:['Fibre','Φυτ. ίνες'], sugar:['Sugar','Σάκχαρα'], satFat:['Sat. fat','Κορεσμ.'], salt:['Salt','Αλάτι'],
 packSizes:['Pack sizes you buy','Μεγέθη συσκευασίας που αγοράζεις'],
 packHint:['Add every size you buy (e.g. 1000 and 1500 ml milk). Tap ★ on the one you usually get.','Πρόσθεσε κάθε μέγεθος που παίρνεις (π.χ. 1000 και 1500 ml γάλα). Πάτα ★ σε αυτό που παίρνεις συνήθως.'],
 comesAs:['Comes as','Έρχεται σε'], whole:['Whole / loose','Ολόκληρο / χύμα'], slices:['Slices','Φέτες'], pieces:['Pieces','Τεμάχια'],
 slice:['slice','φέτα'], piece:['piece','τεμάχιο'], slicesW:['slices','φέτες'], piecesW:['pieces','τεμάχια'],
 oneWeighs:['One {w} weighs ({u})','Μία {w} ζυγίζει ({u})'], orCount:['Or: {ws} in the pack','Ή: {ws} στη συσκευασία'],
 weighOnePh:['weigh one','ζύγισε μία'], countPh:['count them','μέτρησέ τες'],
 everyCounts:['Every {w} counts as {s}.','Κάθε {w} μετράει {s}.'], usingEst:['Using the database estimate ({s}) until you weigh one.','Χρησιμοποιώ την εκτίμηση της βάσης ({s}) μέχρι να ζυγίσεις.'],
 weighOrCount:['Weigh one {w}, or count them and it divides the pack for you.','Ζύγισε μία {w}, ή μέτρησέ τες και διαιρείται η συσκευασία.'],
 addPackFirst:['Add the pack size above first, then it can divide.','Πρόσθεσε πρώτα το μέγεθος συσκευασίας για να γίνει η διαίρεση.'],
 showOnList:['Show on the main list','Εμφάνιση στη λίστα'], auto:['Auto','Αυτόματο'], perPack:['Per pack','Ανά συσκευασία'], perW:['Per {w}','Ανά {w}'],
 autoPicks:['Auto picks {x}','Το αυτόματο δείχνει {x}'], showing:['Showing {x}','Εμφανίζεται {x}'],
 becausePieces:[' because it comes in {ws}.',' επειδή έρχεται σε {ws}.'], becauseSmall:[' because the pack is {n} {u} or less.',' επειδή η συσκευασία είναι έως {n} {u}.'], becauseBig:[' for big packs and loose food.',' για μεγάλες συσκευασίες και χύμα.'],
 perWLabel:['per {w}','ανά {w}'], perPackLabel:['per pack','ανά συσκευασία'], per100Label:['per 100 {u}','ανά 100 {u}'],
 onePiece:['1 {w}','1 {w}'], wholePack:['Whole pack','Όλη η συσκευασία'],
 barcode:['Barcode','Barcode'], notes:['Notes','Σημειώσεις'], notesPh:['e.g. ‘only at Lidl’','π.χ. «μόνο στα Lidl»'],
 filledFrom:['Filled from {s}. Double-check before saving.','Συμπληρώθηκε από {s}. Έλεγξέ το πριν την αποθήκευση.'], lastUpdated:['Last updated {d}','Τελευταία αλλαγή {d}'],
 theLabelPhoto:['the label photo','τη φωτογραφία ετικέτας'],
 guessed:['Guessed from the name, tap to change','Μαντεύτηκε από το όνομα, πάτα για αλλαγή'], tapChange:['Tap to change','Πάτα για αλλαγή'],
 chooseType:['Choose food type','Διάλεξε είδος'], chooseTypeSub:['Dairy, meat, vegetables…','Γαλακτοκομικά, κρέας, λαχανικά…'],
 pickTypeSub:['Pick a category, then the closest match.','Διάλεξε κατηγορία και μετά το πιο κοντινό.'], allCats:['All categories','Όλες οι κατηγορίες'], general:['General','Γενικά'],
 noKcal:['No kcal? Macros add up to ~{n}. Tap to use that.','Χωρίς θερμίδες; Τα μακρο βγάζουν ~{n}. Πάτα για να το χρησιμοποιήσεις.'],
 kcalWarn:['Heads up: macros add up to ~{n} kcal but the label says {k}. Worth a second look.','Προσοχή: τα μακρο βγάζουν ~{n} kcal αλλά η ετικέτα γράφει {k}. Ξανακοίτα το.'],
 kcalOk:['Macros check out (~{n} kcal).','Τα μακρο ταιριάζουν (~{n} kcal).'],
 needName:['Give the product a name','Δώσε όνομα στο προϊόν'], needMacros:['Protein, carbs and fat are needed','Χρειάζονται πρωτεΐνη, υδατάνθρακες και λιπαρά'], numbersOff:['Some numbers look off','Κάποιοι αριθμοί δεν φαίνονται σωστοί'],
 typePack:['Type a pack size first','Γράψε πρώτα μέγεθος συσκευασίας'],
 almost:['Almost there','Σχεδόν έτοιμο'], almostSub:['Fill in what’s missing, then save.','Συμπλήρωσε ό,τι λείπει και αποθήκευσε.'], addBrand:['Add brand','Προσθήκη μάρκας'], brandName:['Brand name','Όνομα μάρκας'],
 pieceQ:['How much does one {w} weigh?','Πόσο ζυγίζει μία {w};'],
 pieceSub:['Optional. Weigh one {w}, or count them and it divides the pack, for a 100% accurate number. ','Προαιρετικό. Ζύγισε μία {w}, ή μέτρησέ τες για να διαιρεθεί η συσκευασία, για 100% ακρίβεια. '],
 pieceSkipEst:['Skip to use the database estimate ({s} per {w}).','Πάτα Παράλειψη για την εκτίμηση της βάσης ({s} ανά {w}).'], pieceSkipLater:['Skip to save without it and add it later.','Πάτα Παράλειψη για να το προσθέσεις αργότερα.'],
 weighOne:['⚖️ Weigh one','⚖️ Ζύγισε μία'], countThem:['🔢 Count them','🔢 Μέτρησέ τες'], inPack:['{Ws} in the pack','{Ws} στη συσκευασία'], wholePackU:['Whole pack ({u})','Όλη η συσκευασία ({u})'],
 notInPieces:['It doesn’t come in {ws}','Δεν έρχεται σε {ws}'], eachIs:['{a} ÷ {n} = <b>{s} each</b>','{a} ÷ {n} = <b>{s} η καθεμία</b>'],
 sameCode:['This barcode is already saved as “{n}”. Save another one anyway?','Αυτό το barcode υπάρχει ήδη ως «{n}». Αποθήκευση ξανά;'],
 sameName:['You already have “{n}”. Save a second one anyway?','Έχεις ήδη «{n}». Αποθήκευση δεύτερου;'],
 saved:['Saved {i}','Αποθηκεύτηκε {i}'], updated:['Updated','Ενημερώθηκε'], deleted:['Deleted {n}','Διαγράφηκε: {n}'], undo:['Undo','Αναίρεση'], scanNext:['Scan next','Επόμενο'],
 noFoods:['<b>No foods yet</b>Tap Scan Food and scan your first barcode, or ＋ Add Food to type one in.','<b>Δεν έχεις τρόφιμα ακόμα</b>Πάτα «Προσθήκη» και σκάναρε το πρώτο barcode.'],
 nothingMatches:['Nothing matches “{q}”.','Τίποτα για «{q}».'], nothingHere:['Nothing here.','Τίποτα εδώ.'],
 all:['All','Όλα'], noType:['❔ No type','❔ Χωρίς είδος'], sortRecent:['Sort: <b>Recent</b>','Ταξινόμηση: <b>Πρόσφατα</b>'], sortAZ:['Sort: <b>A–Z</b>','Ταξινόμηση: <b>Α–Ω</b>'],
 // cook
 cookMeal:['Cook a meal','Μαγείρεψε'], editMeal:['Edit meal','Επεξεργασία φαγητού'], cookAgainT:['Cook again','Ξανά μαγείρεμα'],
 mealName:['What are you making?','Τι μαγειρεύεις;'], mealNamePh:['e.g. Bolognese, chicken in the pan','π.χ. Μπολονέζ, κοτόπουλο στο τηγάνι'],
 suggestRecipe:['✨ Suggest a recipe','✨ Πρότεινε συνταγή'], suggestHint:['Optional. Gets a full recipe with steps and fills in the ingredients.','Προαιρετικό. Φέρνει συνταγή με βήματα και συμπληρώνει τα υλικά.'],
 suggestNeedName:['Type what you’re making first','Γράψε πρώτα τι μαγειρεύεις'], thinking:['Writing a recipe…','Γράφω συνταγή…'],
 recipeFail:['Couldn’t get a recipe: {e}','Δεν βγήκε συνταγή: {e}'],
 ingredients:['Ingredients','Υλικά'], ingHint:['Weigh each one as it goes into the pot: raw meat, dry pasta and rice.','Ζύγισε κάθε υλικό όπως μπαίνει στην κατσαρόλα: ωμό κρέας, ξερά ζυμαρικά και ρύζι.'],
 addIngredient:['＋ Add ingredient','＋ Προσθήκη υλικού'], chooseFood:['Choose food…','Διάλεξε τρόφιμο…'], from:['from {s}','από {s}'],
 rawTotal:['Raw total','Σύνολο ωμών'], finishedWeight:['Weigh the finished food','Ζύγισε το έτοιμο φαγητό'],
 finishedHint:['Cooking changes the weight (water boils off, pasta soaks it up), so this is what makes the numbers right.','Το μαγείρεμα αλλάζει το βάρος (εξατμίζεται νερό, τα ζυμαρικά το απορροφούν), γι’ αυτό αυτό κάνει τους αριθμούς σωστούς.'],
 potFull:['Pot + food (g)','Κατσαρόλα + φαγητό (g)'], potEmpty:['Empty pot (g)','Άδεια κατσαρόλα (g)'], orFoodOnly:['Or just the food (g)','Ή μόνο το φαγητό (g)'],
 resultPer100:['<b>Per 100 g cooked: {k} kcal</b> · P {p} · C {c} · F {f}','<b>Ανά 100 g μαγειρεμένο: {k} kcal</b> · P {p} · C {c} · F {f}'],
 noWeightYet:['Weigh the finished food for exact numbers. If you skip it, the raw total ({s}) is used, which can be off by a lot.','Ζύγισε το έτοιμο φαγητό για ακριβείς αριθμούς. Αν το παραλείψεις, χρησιμοποιείται το σύνολο των ωμών ({s}), που μπορεί να απέχει πολύ.'],
 foodWeight:['Finished food: {s}','Έτοιμο φαγητό: {s}'],
 saveMeal:['Save meal','Αποθήκευση'], needMealName:['Give the meal a name','Δώσε όνομα στο φαγητό'], needIng:['Add at least one ingredient','Πρόσθεσε τουλάχιστον ένα υλικό'],
 unsetIng:['Choose a food for every ingredient (orange ones)','Διάλεξε τρόφιμο για κάθε υλικό (τα πορτοκαλί)'], needGrams:['Some ingredients have no amount','Κάποια υλικά δεν έχουν ποσότητα'],
 potNegative:['The empty pot weighs more than the full one, check the numbers','Η άδεια κατσαρόλα ζυγίζει περισσότερο από τη γεμάτη, έλεγξε τους αριθμούς'],
 noWeightConfirm:['You didn’t weigh the finished food, so the numbers use the raw total and may be off. Save anyway?','Δεν ζύγισες το έτοιμο φαγητό, οπότε οι αριθμοί βγαίνουν από τα ωμά και ίσως απέχουν. Αποθήκευση;'],
 mealSaved:['Saved {n}','Αποθηκεύτηκε: {n}'], deleteMeal:['Delete “{n}”?','Διαγραφή «{n}»;'],
 noMeals:['<b>No meals yet</b>Tap “Cook a meal” the next time you cook.','<b>Δεν έχεις φαγητά ακόμα</b>Πάτα «Μαγείρεψε» την επόμενη φορά που μαγειρεύεις.'],
 recipeBadge:['📖 recipe','📖 συνταγή'], per100cooked:['per 100 g cooked','ανά 100 g μαγειρεμένο'],
 chooseIngredient:['Choose ingredient','Διάλεξε υλικό'], ingSearchPh:['Type a food, e.g. minced beef','Γράψε τρόφιμο, π.χ. κιμάς'],
 grpMine:['My foods','Τα τρόφιμά μου'], grpStd:['Standard foods','Βασικά τρόφιμα'], grpOnline:['Online · Open Food Facts','Online · Open Food Facts'],
 searching:['Searching online…','Αναζήτηση online…'], searchOnline:['🔎 Search online for “{q}”','🔎 Αναζήτηση online για «{q}»'],
 onlineNone:['Nothing found online either. Add it as a new food from My foods.','Δεν βρέθηκε ούτε online. Πρόσθεσέ το ως νέο τρόφιμο από τα Τρόφιμά μου.'],
 onlineFail:['Online search failed (no internet?)','Η online αναζήτηση απέτυχε (χωρίς ίντερνετ;)'], typeToSearch:['Start typing to search.','Ξεκίνα να γράφεις για αναζήτηση.'],
 alsoSave:['Also save it to My foods for next time','Αποθήκευση και στα Τρόφιμά μου για την επόμενη φορά'], stdValues:['standard values','βασικές τιμές'],
 recipeIdea:['Recipe idea','Πρόταση συνταγής'], recipeIdeaSub:['Use it and it’s saved with this meal, with the ingredients filled in. Say no and the meal just keeps its ingredients.','Αν τη χρησιμοποιήσεις αποθηκεύεται με το φαγητό και συμπληρώνονται τα υλικά. Αλλιώς το φαγητό κρατάει μόνο τα υλικά του.'],
 noThanks:['No thanks','Όχι, ευχαριστώ'], useRecipe:['Use this recipe','Χρήση συνταγής'],
 serves:['Serves {n}','Μερίδες: {n}'], minutes:['{n} min','{n} λεπτά'], steps:['Steps','Βήματα'], recipeT:['Recipe','Συνταγή'],
 noRecipe:['No recipe saved for this meal.','Δεν υπάρχει αποθηκευμένη συνταγή.'], addRecipeLater:['✨ Suggest a recipe','✨ Πρότεινε συνταγή'],
 onMyPlate:['On my plate','Στο πιάτο μου'], cookAgain:['🍳 Cook again','🍳 Ξανά μαγείρεμα'],
 mealMeta:['Cooked {d} · batch {s}','Μαγειρεύτηκε {d} · σύνολο {s}'], estimated:['≈ not weighed','≈ χωρίς ζύγισμα'],
 timesCooked:['cooked {n}×','μαγειρεύτηκε {n}×'],
 // settings
 settings:['Settings','Ρυθμίσεις'], settingsSub:['Everything is stored on this device only.','Όλα αποθηκεύονται μόνο σε αυτή τη συσκευή.'], language:['Language','Γλώσσα'],
 geminiKey:['Gemini API key (label photos and recipes)','Κλειδί Gemini API (ετικέτες και συνταγές)'], geminiKeyPh:['Paste your key here','Επικόλλησε το κλειδί εδώ'],
 getKey:['🔑 Get API key','🔑 Πάρε κλειδί API'],
 getKeyHint:['Opens Google AI Studio. Sign in, tap “Create API key”, copy it and paste it above. Free, with a daily limit. It stays on this phone only.','Ανοίγει το Google AI Studio. Σύνδεση, «Create API key», αντιγραφή και επικόλληση από πάνω. Δωρεάν, με ημερήσιο όριο. Μένει μόνο σε αυτό το κινητό.'],
 geminiModel:['Gemini model','Μοντέλο Gemini'], saveSettings:['Save settings','Αποθήκευση ρυθμίσεων'], settingsSaved:['Settings saved','Οι ρυθμίσεις αποθηκεύτηκαν'],
 yourData:['Your data','Τα δεδομένα σου'], yourDataSub:['Copy for Claude, or move everything between phone and PC.','Αντιγραφή για το Claude, ή μεταφορά όλων μεταξύ κινητού και υπολογιστή.'],
 copyClaude:['Copy for Claude','Αντιγραφή για Claude'], download:['Download backup','Λήψη αντιγράφου'], import:['Import backup','Εισαγωγή αντιγράφου'],
 copied:['Copied, paste it to Claude','Αντιγράφηκε, επικόλλησέ το στο Claude'], nothingCopy:['Nothing to copy yet','Τίποτα για αντιγραφή ακόμα'],
 imported:['Imported: {a} new, {u} updated','Εισαγωγή: {a} νέα, {u} ενημερωμένα'], badBackup:['That file isn’t a Tracker backup','Αυτό δεν είναι αντίγραφο του Tracker'],
 saveFail:['Could not save on this device','Δεν έγινε αποθήκευση στη συσκευή'], lightNA:['Light not available','Δεν υπάρχει φως'],
 comingSoon:['Coming in a later version','Έρχεται σε επόμενη έκδοση'],
 // v1.4
 backArrow:['← Back','← Πίσω'],
 tryingModel:['Trying model {i} of {n}…','Δοκιμή μοντέλου {i} από {n}…'], cancelRec:['✕ Cancel · model {i} of {n}','✕ Ακύρωση · μοντέλο {i} από {n}'],
 cancelled:['Cancelled','Ακυρώθηκε'], timedOut:['took too long','άργησε πολύ'],
 allBusy:['Every Gemini model is busy or out of free uses right now ({e}). Try again later, or use “Add my own recipe”.','Όλα τα μοντέλα Gemini είναι απασχολημένα ή τελείωσαν οι δωρεάν χρήσεις ({e}). Δοκίμασε αργότερα ή χρησιμοποίησε «Δική μου συνταγή».'],
 keyBad:['Google rejected the key: {e}. Check it in settings.','Η Google απέρριψε το κλειδί: {e}. Έλεγξέ το στις ρυθμίσεις.'],
 ownRecipe:['📝 Add my own recipe','📝 Δική μου συνταγή'], ownRecipeT:['Add my own recipe','Δική μου συνταγή'],
 ownRecipeSub:['Type it or paste it from anywhere (Claude, ChatGPT, a website). Amounts like “500 g mince” or “2 tbsp olive oil” are read automatically, no AI needed.','Γράψε ή επικόλλησέ τη από οπουδήποτε (Claude, ChatGPT, κάποιο site). Ποσότητες όπως «500 γρ. κιμάς» ή «2 κ.σ. ελαιόλαδο» διαβάζονται αυτόματα, χωρίς AI.'],
 ownPh:['Chicken in the pan\n\nIngredients\n600 g chicken breast\n1 onion\n2 tbsp olive oil\n\nSteps\n1. Cut the chicken into strips…','Κοτόπουλο στο τηγάνι\n\nΥλικά\n600 γρ. κοτόπουλο στήθος\n1 κρεμμύδι\n2 κ.σ. ελαιόλαδο\n\nΕκτέλεση\n1. Κόψε το κοτόπουλο σε λωρίδες…'],
 readRecipe:['Read recipe','Ανάγνωση συνταγής'], foundIng:['{n} ingredients','{n} υλικά'], foundSteps:['{n} steps','{n} βήματα'],
 noAmount:['no amount, add it after','χωρίς ποσότητα, βάλ’ τη μετά'], willPick:['you’ll pick the food','θα διαλέξεις τρόφιμο'],
 nothingFound:['Couldn’t find any ingredients or steps. Put each ingredient on its own line.','Δεν βρέθηκαν υλικά ή βήματα. Βάλε κάθε υλικό σε δική του γραμμή.'],
 ownTag:['your recipe','δική σου συνταγή'],
 // supplements
 tSupps:['My supplements','Τα συμπληρώματά μου'], nSupps:['{n} supplements','{n} συμπληρώματα'], nSupp:['1 supplement','1 συμπλήρωμα'],
 addSuppFab:['＋ Add supplement','＋ Προσθήκη'], addSupp:['Add supplement','Νέο συμπλήρωμα'], editSupp:['Edit supplement','Επεξεργασία'],
 supQuickSub:['Pick a common one or type your own below.','Διάλεξε ένα συνηθισμένο ή γράψε το δικό σου από κάτω.'],
 supName:['Name','Όνομα'], supNamePh:['e.g. Magnesium bisglycinate','π.χ. Μαγνήσιο δισγλυκινικό'],
 supDose:['Dose each time','Δόση κάθε φορά'], supDoseHint:['Use the dose on your label or what your doctor told you.','Βάλε τη δόση της ετικέτας ή αυτή που σου είπε ο γιατρός.'],
 supWhen:['When do you take it?','Πότε το παίρνεις;'], supOften:['How often','Πόσο συχνά'],
 oftenDaily:['Every day','Κάθε μέρα'], oftenTraining:['Training days','Μέρες προπόνησης'], oftenNeeded:['When needed','Όταν χρειάζεται'],
 supLink:['Linked food (for macros)','Σύνδεση με τρόφιμο (για μακρο)'], supLinkNone:['— None —','— Κανένα —'],
 supLinkHint:['Link whey or anything with calories so its macros count later.','Σύνδεσε την πρωτεΐνη ή ό,τι έχει θερμίδες, για να μετράνε τα μακρο αργότερα.'],
 supNotesPh:['e.g. take with food','π.χ. με φαγητό'],
 supNeedName:['Give it a name','Δώσε όνομα'], supNeedDose:['Add the dose','Βάλε τη δόση'], supNeedTime:['Pick when you take it','Διάλεξε πότε το παίρνεις'],
 todayLabel:['Today','Σήμερα'], todayTaken:['{a} of {b} taken','{a} από {b}'], allTaken:['All done today 💪','Όλα έτοιμα για σήμερα 💪'],
 noSupps:['<b>No supplements yet</b>Tap “Add supplement” to list what you take.','<b>Δεν έχεις συμπληρώματα ακόμα</b>Πάτα «Προσθήκη» για να βάλεις ό,τι παίρνεις.'],
 tagTraining:['training days','μέρες προπόνησης'], tagNeeded:['when needed','όταν χρειάζεται'],
 slot_morning:['Morning','Πρωί'], slot_breakfast:['With breakfast','Με το πρωινό'], slot_pre:['Pre-workout','Πριν την προπόνηση'], slot_post:['Post-workout','Μετά την προπόνηση'],
 slot_lunch:['With lunch','Με το μεσημεριανό'], slot_dinner:['With dinner','Με το βραδινό'], slot_bed:['Before bed','Πριν τον ύπνο'], slot_any:['Any time','Οποτεδήποτε'],
 // ---- v1.5 ----
 tToday:['Today’s food','Το φαγητό της μέρας'], remaining:['{n} kcal left','απομένουν {n} kcal'], over:['{n} kcal over','{n} kcal πάνω'], noTargets:['Set your targets 🎯','Βάλε τους στόχους σου 🎯'],
 gymDay:['Gym Day','Μέρα Γυμναστηρίου'], restDay:['Rest Day','Μέρα Ξεκούρασης'],
 wLegs:['Legs','Πόδια'], wUpper:['Upper','Πάνω σώμα'], wFull:['Full body','Όλο το σώμα'], wCardio:['Cardio','Cardio'], workoutAt:['Workout at','Ώρα προπόνησης'],
 carbTiming:['Carb timing','Κατανομή υδατανθράκων'], eaten:['Eaten','Έφαγα'], copyYesterday:['↺ Same as yesterday','↺ Όπως χθες'],
 todayD:['Today','Σήμερα'], yesterdayD:['Yesterday','Χθες'], tomorrowD:['Tomorrow','Αύριο'],
 logFab:['＋ Log food','＋ Καταγραφή'], logFood:['Log food','Καταγραφή φαγητού'], logSearchPh:['Search foods and meals…','Αναζήτηση τροφίμων και φαγητών…'],
 scanToLog:['Scan','Σάρωση'], recent:['Recent','Πρόσφατα'], inFridgeTag:['in fridge','στο ψυγείο'], leftovers:['leftovers','περισσεύματα'],
 nothingLogged:['<b>Nothing logged yet</b>Tap ＋ Log Food after you eat. Search, then ＋ logs your usual amount in one tap.','<b>Δεν έχεις καταγράψει τίποτα</b>Πάτα ＋ Καταγραφή αφού φας. Ψάξε και το ＋ καταγράφει τη συνηθισμένη ποσότητα με ένα πάτημα.'],
 ateAt:['Eaten at','Ώρα'], alsoLog:['Also add to Today’s food','Πρόσθεσέ το και στο φαγητό της μέρας'], takeFromFridge:['Take it out of the fridge ({s} there)','Βγάλ’ το από το ψυγείο (υπάρχουν {s})'],
 logged:['Logged {n}','Καταγράφηκε: {n}'], copiedDay:['Copied {n} items from yesterday','Αντιγράφηκαν {n} από χθες'], nothingYesterday:['Nothing logged yesterday','Δεν υπάρχει τίποτα από χθες'],
 needAmount:['Type an amount','Γράψε ποσότητα'],
 // windows
 winPre:['Pre-workout','Πριν την προπόνηση'], winPost:['Post-workout','Μετά την προπόνηση'], winMorning:['Morning','Πρωί'], winMidday:['Midday','Μεσημέρι'], winEvening:['Evening','Βράδυ'], winWorkout:['Workout','Προπόνηση'],
 winCarbs:['{a} / {b} g carbs','{a} / {b} g υδατ.'],
 tipLegsPre:['Big carb meal 2–3 h before; easy carbs (banana, rice cakes) 30–60 min before.','Γεύμα με αρκετούς υδατάνθρακες 2–3 ώρες πριν· κάτι εύπεπτο (μπανάνα, ρυζογκοφρέτες) 30–60′ πριν.'],
 tipLegsPost:['Refill: lots of carbs + 30–40 g protein within 2 h.','Αναπλήρωση: πολλοί υδατάνθρακες + 30–40 g πρωτεΐνη μέσα σε 2 ώρες.'],
 tipUpperPre:['Normal meal 2–3 h before, moderate carbs.','Κανονικό γεύμα 2–3 ώρες πριν, μέτριοι υδατάνθρακες.'], tipUpperPost:['Protein first, carbs moderate.','Πρωτεΐνη πρώτα, μέτριοι υδατάνθρακες.'],
 tipCardioPre:['Light and easy: small carb snack 1–2 h before. Drink ~500 ml water 2 h before.','Ελαφρύ: μικρό σνακ με υδατάνθρακες 1–2 ώρες πριν. Πιες ~500 ml νερό 2 ώρες πριν.'],
 tipCardioPost:['Rehydrate: ~500–750 ml water (more if you sweated a lot), then a normal meal.','Ενυδάτωση: ~500–750 ml νερό (περισσότερο αν ίδρωσες πολύ), μετά κανονικό γεύμα.'],
 tipCardioDuring:['Sip water during. Over ~60 min, add electrolytes.','Πίνε νερό κατά τη διάρκεια. Πάνω από ~60′, πρόσθεσε ηλεκτρολύτες.'],
 tipRest:['Carbs spread evenly; protein every 3–4 h.','Υδατάνθρακες μοιρασμένοι· πρωτεΐνη κάθε 3–4 ώρες.'], tipSpread:['Spread across your other meals.','Μοίρασέ τους στα υπόλοιπα γεύματα.'],
 // targets
 targetsT:['Daily targets','Ημερήσιοι στόχοι'], targetsSub:['Gym days and rest days get their own numbers. Same protein, fewer carbs on rest days is a common setup.','Οι μέρες γυμναστηρίου και ξεκούρασης έχουν δικούς τους στόχους. Συνήθως ίδια πρωτεΐνη, λιγότεροι υδατάνθρακες στην ξεκούραση.'],
 goal:['Goal','Στόχος'], gBulk:['Bulk','Όγκος'], gRecomp:['Recomp','Recomp'], gCut:['Cut','Γράμμωση'], bodyweight:['Body weight','Βάρος'],
 calcStart:['Calculate','Υπολογισμός'], calcHint:['Gives a starting point (protein ~2 g/kg). Adjust after 2 weeks based on the scale.','Δίνει ένα σημείο εκκίνησης (πρωτεΐνη ~2 g/kg). Προσάρμοσε μετά από 2 εβδομάδες ανάλογα με τη ζυγαριά.'],
 gymDayTargets:['Gym Day','Μέρα Γυμναστηρίου'], restDayTargets:['Rest Day','Μέρα Ξεκούρασης'],
 tgMismatch:['{d}: macros add up to {n} kcal, not {k}.','{d}: τα μακρο βγάζουν {n} kcal, όχι {k}.'], tgOk:['Macros and calories match.','Τα μακρο ταιριάζουν με τις θερμίδες.'], targetsSaved:['Targets saved','Οι στόχοι αποθηκεύτηκαν'],
 // plan my day
 planMyDay:['✨ Plan my day','✨ Σχεδίασε τη μέρα μου'], planning:['Planning…','Σχεδιάζω…'], planFail:['Couldn’t plan: {e}','Δεν έγινε το πλάνο: {e}'],
 planNeedTargets:['Set your targets first (🎯 at the top).','Βάλε πρώτα τους στόχους σου (🎯 πάνω).'], planT:['Plan for the day','Πλάνο ημέρας'], logThis:['Log this','Καταγραφή'],
 planLogged:['Logged {n} foods','Καταγράφηκαν {n} τρόφιμα'], planUnmatched:['{n} not found in your foods, not logged','{n} δεν βρέθηκαν στα τρόφιμά σου, δεν καταγράφηκαν'], dropPlan:['✕ Clear plan','✕ Διαγραφή πλάνου'],
 fromFridge:['fridge','ψυγείο'], // fridge
 locFridge:['Fridge','Ψυγείο'], locFreezer:['Freezer','Κατάψυξη'], locCupboard:['Cupboard','Ντουλάπι'], searchFridge:['Search the fridge…','Αναζήτηση στο ψυγείο…'],
 fridgeFab:['＋ Add to fridge','＋ Προσθήκη'], nItems:['{n} items','{n} προϊόντα'], nItem:['1 item','1 προϊόν'],
 emptyFridge:['<b>Your fridge is empty</b>Tap Scan Receipt after shopping, or ＋ Add Food. Ticked groceries can go straight in too.','<b>Το ψυγείο είναι άδειο</b>Σκάναρε ό,τι αγόρασες ή τσέκαρε από τη λίστα για ψώνια και βάλ’ τα μέσα.'],
 addFridgeHow:['Add to fridge','Προσθήκη στο ψυγείο'], optScanF:['Scan barcode<small>Fastest for packaged food</small>','Σάρωση barcode<small>Το πιο γρήγορο για συσκευασμένα</small>'],
 optPickF:['Pick from my foods<small>Or the standard list (loose meat, veg…)</small>','Από τα τρόφιμά μου<small>Ή από τα βασικά (χύμα κρέας, λαχανικά…)</small>'],
 howMuch:['How much','Πόσο'], whereKept:['Where','Πού'], expires:['Expires','Λήγει'], noExpiry:['No date','Χωρίς'],
 expAuto:['Estimated for {w}. Change it to the date on the pack for a better warning.','Εκτίμηση για {w}. Βάλε την ημερομηνία της συσκευασίας για πιο σωστή ειδοποίηση.'],
 rebuyBelow:['Add to groceries when below','Στη λίστα για ψώνια όταν πέσει κάτω από'], autoGrocery:['Add to groceries automatically when it runs out','Αυτόματα στη λίστα όταν τελειώσει'],
 remove:['Remove','Αφαίρεση'], addedFridge:['In the {l} {i}','Στο {l} {i}'], removedItem:['Removed {n}','Αφαιρέθηκε: {n}'],
 expToday:['expires today','λήγει σήμερα'], expTomorrow:['tomorrow','αύριο'], expIn:['{n} days','{n} μέρες'], expGone:['expired','έληξε'], expWeeks:['{n} wk','{n} εβδ.'], expDate:['{d}','{d}'],
 left:['{a} left','απομένουν {a}'], ofPack:['{a} of {b}','{a} από {b}'], piecesLeft:['{n} {ws}','{n} {ws}'],
 useBtn:['Use','Χρήση'], useT:['Use {n}','Χρήση: {n}'], useSub:['How much did you use?','Πόσο χρησιμοποίησες;'], finishedIt:['Finished it','Τελείωσε'],
 usedToast:['Used {a} of {n}','Χρησιμοποιήθηκαν {a} από {n}'], finishedToast:['{n} is finished','Τελείωσε: {n}'], toList:['→ added to groceries','→ μπήκε στη λίστα'],
 alertSupps:['💊 {n} supplements left for today','💊 Απομένουν {n} συμπληρώματα για σήμερα'],
 fridgeSubOk:['{n} items','{n} προϊόντα'], fridgeSubEmpty:['Empty','Άδειο'],
 grocSub:['{n} to buy','{n} για αγορά'], grocSubEmpty:['Nothing to buy','Τίποτα για ψώνια'],
 // cooking + fridge
 uses:['uses {list}','με {list}'],
 takeIng:['Take the ingredients out of the fridge ({n} found)','Βγάλε τα υλικά από το ψυγείο (βρέθηκαν {n})'], leftoversIn:['Put the leftovers in the fridge','Βάλε τα περισσεύματα στο ψυγείο'],
 tookOut:['Took {n} ingredients out of the fridge','Βγήκαν {n} υλικά από το ψυγείο'],
 // groceries
 gAddPh:['Add item, e.g. milk','Πρόσθεσε, π.χ. γάλα'], sendReminders:['📲 Send to Reminders','📲 Αποστολή στις Υπενθυμίσεις'], share:['Share','Κοινοποίηση'],
 sendHintIos:['First time? Set up the free “Tracker Groceries” shortcut once (1 minute).','Πρώτη φορά; Φτιάξε μία φορά το δωρεάν shortcut «Tracker Groceries» (1 λεπτό).'],
 sendHintAndroid:['Opens your share menu: pick Google Keep, Google Tasks or any list app.','Ανοίγει το μενού κοινοποίησης: διάλεξε Google Keep, Google Tasks ή άλλη εφαρμογή λίστας.'],
 autoTag:['ran out','τελείωσε'], lowTag:['running low','λίγο απόμεινε'], bought:['Bought ({n})','Αγοράστηκαν ({n})'],
 clearBought:['Clear','Καθαρισμός'], notFoodWarn:['{n} without a linked food were just cleared (no macros to track).','{n} χωρίς συνδεδεμένο τρόφιμο απλώς διαγράφηκαν (χωρίς μακρο).'],
 listCopied:['List copied','Η λίστα αντιγράφηκε'], nothingToSend:['Nothing to send','Τίποτα για αποστολή'], addAsText:['＋ Add “{q}”','＋ Προσθήκη «{q}»'],
 scTitle:['Send to Reminders (iPhone)','Αποστολή στις Υπενθυμίσεις (iPhone)'],
 scSub:['Apple doesn’t let websites write to Reminders directly, so a free Shortcut does it. You set it up once.','Η Apple δεν επιτρέπει σε sites να γράφουν στις Υπενθυμίσεις, οπότε το κάνει ένα δωρεάν Shortcut. Το φτιάχνεις μία φορά.'],
 scDoneLbl:['I’ve made the shortcut','Έφτιαξα το shortcut'], scTry:['Send now','Αποστολή τώρα'],
 // key guide
 testKey:['✓ Test key','✓ Έλεγχος κλειδιού'], keyTesting:['Checking…','Έλεγχος…'], keyOk:['✓ Key works: {n} models available.','✓ Το κλειδί δουλεύει: {n} διαθέσιμα μοντέλα.'],
 keyFail:['✗ That key didn’t work: {e}','✗ Το κλειδί δεν δούλεψε: {e}'], keyEmpty:['Paste a key first','Επικόλλησε πρώτα ένα κλειδί'],
 keyGuideT:['How to get a free key (2 minutes)','Πώς παίρνεις δωρεάν κλειδί (2 λεπτά)'],
 keyNoNeed:['No key? Everything still works except label photos, recipe ideas and Plan my day.','Χωρίς κλειδί; Όλα δουλεύουν εκτός από φωτογραφίες ετικέτας, προτάσεις συνταγών και Σχεδίασε τη μέρα μου.'],
 u_mg:['mg','mg'], u_g:['g','g'], u_mcg:['mcg','mcg'], u_IU:['IU','IU'], u_ml:['ml','ml'], u_caps:['capsules','κάψουλες'], u_tabs:['tablets','ταμπλέτες'], u_scoops:['scoops','μεζούρες'], u_drops:['drops','σταγόνες'],
};

// =====================================================================
// v1.6 — GYM · LIVE WORKOUTS · PROGRESS · PETS · SWIPE BACK
// =====================================================================
Object.assign(S, {
 tGym:['Gym','Γυμναστήριο'], gtPlan:['Week','Εβδομάδα'], gtWorkouts:['Workouts','Προπονήσεις'], gtProgress:['Progress','Πρόοδος'], gtLib:['Workouts','Προπονήσεις'], gtPlanner:['Planner','Πρόγραμμα'], gtPartner:['Partner','Συνεργάτης'],
 finish:['Finish','Τέλος'], addExercise:['＋ Add exercise','＋ Προσθήκη άσκησης'], discard:['Discard workout','Ακύρωση προπόνησης'], discardQ:['Throw away this workout?','Να πεταχτεί αυτή η προπόνηση;'],
 exSearchPh:['Search exercises…','Αναζήτηση ασκήσεων…'], createEx:['＋ Create “{q}”','＋ Δημιουργία «{q}»'],
 swapSub:['Same muscles, closest match first','Ίδιοι μύες, πιο κοντινό πρώτο'], swapT:['Swap {n}','Αλλαγή: {n}'], taken:['Taken','Πιασμένο'], swapped:['Swapped to {n}','Άλλαξε σε {n}'],
 workoutName:['Name','Όνομα'], workoutType:['Type (sets up Today’s food)','Τύπος (ρυθμίζει το φαγητό της μέρας)'], exercises:['Exercises','Ασκήσεις'],
 newWorkout:['New workout','Νέα προπόνηση'], editWorkout:['Edit workout','Επεξεργασία προπόνησης'], startWorkout:['Start a workout','Έναρξη προπόνησης'], emptyWorkout:['Empty workout','Κενή προπόνηση'],
 postMeal:['🍽️ Plan my post-workout meal','🍽️ Γεύμα μετά την προπόνηση'], done:['Done','Τέλος'],
 startToday:['▶ Start {n}','▶ Έναρξη: {n}'], startAny:['▶ Start a workout','▶ Έναρξη προπόνησης'], resume:['● Resume workout · {m} min','● Συνέχεια προπόνησης · {m}′'],
 restLbl:['Rest','Ξεκούραση'], restOver:['Go! Next set','Πάμε! Επόμενο σετ'], restDone:['Rest is over','Τέλος ξεκούρασης'],
 setLbl:['Set','Σετ'], repsLbl:['reps','επαν.'], kgLbl:['kg','kg'], minLbl:['min','λεπτά'], kmLbl:['km','km'], addSet:['＋ Set','＋ Σετ'], removeSet:['− Set','− Σετ'],
 lastTime:['Last time:','Την προηγούμενη:'], tryNext:['Try: {w} kg × {r}','Δοκίμασε: {w} kg × {r}'], firstTime:['First time: pick a weight you can do for {r} reps with 2 to spare.','Πρώτη φορά: διάλεξε βάρος για {r} επαναλήψεις αφήνοντας 2 «στην άκρη».'],
 comebackW:['Comeback {p}%: {w} kg × {r}','Επιστροφή {p}%: {w} kg × {r}'], warmupS:['Warm-up: {s}','Ζέσταμα: {s}'], addWarm:['＋ Add','＋ Προσθήκη'],
 restEdit:['rest {s} ▸','ξεκ. {s} ▸'], prToast:['🏆 New PR! {n} {w} × {r}','🏆 Νέο ρεκόρ! {n} {w} × {r}'], needSetVals:['Type the weight and reps','Γράψε βάρος και επαναλήψεις'],
 suppsNow:['Supplements today:','Συμπληρώματα σήμερα:'],
 smTitle:['💪 Workout done','💪 Η προπόνηση τελείωσε'], smDur:['minutes','λεπτά'], smVol:['kg volume','kg όγκος'], smSets:['sets','σετ'], smKcal:['kcal burned (est.)','kcal (εκτίμηση)'],
 smPRs:['Records','Ρεκόρ'], smNoPR:['No new records this time. Consistency beats records.','Χωρίς νέα ρεκόρ αυτή τη φορά. Η συνέπεια μετράει περισσότερο.'],
 smFood:['Your post-workout window is open until {t}: ~{c} g carbs + 30–40 g protein.','Το παράθυρο μετά την προπόνηση είναι ανοιχτό ως τις {t}: ~{c} g υδατ. + 30–40 g πρωτεΐνη.'],
 noSets:['Log at least one set first','Κατέγραψε πρώτα τουλάχιστον ένα σετ'], unfinished:['Some sets aren’t ticked. Finish anyway?','Κάποια σετ δεν έχουν τσεκαριστεί. Τέλος έτσι κι αλλιώς;'],
 restDayL:['Rest','Ξεκούραση'], planHint:['Set each weekday once. Today’s food picks it up automatically (gym or rest day, type and time).','Ρύθμισε κάθε μέρα μία φορά. Το φαγητό της μέρας το παίρνει αυτόματα (γυμναστήριο ή ξεκούραση, τύπος και ώρα).'],
 planSaved:['Week saved','Η εβδομάδα αποθηκεύτηκε'], newWorkoutBtn:['＋ New workout','＋ Νέα προπόνηση'], nEx:['{n} exercises','{n} ασκήσεις'], lastDone:['last {d}','τελευταία {d}'],
 progNone:['<b>No workouts yet</b>Finish your first workout and your progress shows up here.','<b>Δεν υπάρχουν προπονήσεις</b>Ολοκλήρωσε την πρώτη σου και η πρόοδος θα εμφανιστεί εδώ.'],
 progOverall:['Strength, last 4 weeks vs the 4 before','Δύναμη, τελευταίες 4 εβδομάδες vs τις 4 πριν'], progSinceStart:['since your first workout','από την πρώτη προπόνηση'],
 gCutHold:['💪 Holding strength on the cut. That’s the goal.','💪 Κρατάς τη δύναμη στη γράμμωση. Αυτός είναι ο στόχος.'],
 gCutDrop:['📉 Strength is dropping. Check protein, sleep, and don’t lose faster than ~0.5–1% body weight a week.','📉 Η δύναμη πέφτει. Έλεγξε πρωτεΐνη, ύπνο και μη χάνεις πάνω από ~0,5–1% του βάρους την εβδομάδα.'],
 gBulkUp:['📈 Building strength. The bulk is working.','📈 Χτίζεις δύναμη. Ο όγκος δουλεύει.'],
 gFlat:['➖ Flat. Add a rep, or 2.5 kg when you hit the top of your rep range.','➖ Σταθερά. Πρόσθεσε μία επανάληψη ή 2,5 kg όταν φτάνεις το πάνω όριο.'],
 gDown:['📉 Down a bit. Normal after a break or a bad week; keep showing up.','📉 Λίγο κάτω. Φυσιολογικό μετά από διάλειμμα ή κακή εβδομάδα· συνέχισε.'],
 best:['best e1RM','καλύτερο e1RM'], historyT:['Recent workouts','Πρόσφατες προπονήσεις'],
 breakT:['🔄 {n} days since your last workout','🔄 {n} μέρες από την τελευταία προπόνηση'],
 breakTxt:['Start at about {p}% of your old weights and add ~5% each session. You’ll be back to normal in about {s} sessions, with a lot less injury risk and soreness.','Ξεκίνα περίπου στο {p}% των παλιών κιλών και πρόσθετε ~5% κάθε φορά. Σε περίπου {s} προπονήσεις θα είσαι εκεί που ήσουν, με πολύ λιγότερο κίνδυνο τραυματισμού και πιάσιμο.'],
 cbActive:['🔄 Comeback: session {k}, aim for {p}% of your old weights','🔄 Επιστροφή: προπόνηση {k}, στόχος {p}% των παλιών κιλών'],
 lastTrained:['Coming back after a break? When did you last train?','Επιστρέφεις μετά από διάλειμμα; Πότε προπονήθηκες τελευταία;'],
 // pets
 petChoose:['Choose your partner','Διάλεξε τον σύντροφό σου'], petChooseSub:['It grows when you hit your goals. Pick one and give it a name.','Μεγαλώνει όταν πετυχαίνεις τους στόχους σου. Διάλεξε έναν και δώσ’ του όνομα.'],
 later:['Later','Αργότερα'], petNone:['Choose your partner 🥚','Διάλεξε σύντροφο 🥚'], petNoneSub:['A little creature that grows with your goals','Ένα πλασματάκι που μεγαλώνει με τους στόχους σου'],
 petLv:['Lv {l} · {x}/{n} 🍖 to next level','Επ. {l} · {x}/{n} 🍖 για το επόμενο'], petMood_happy:['happy','χαρούμενο'], petMood_ok:['hungry','πεινάει'], petMood_sleepy:['sleepy… feed it a goal','νυστάζει… τάισέ το έναν στόχο'],
 petFed:['🍖 {n} +{x}','🍖 {n} +{x}'], petEvolved:['✨ {a} evolved into {b}!','✨ Το {a} εξελίχθηκε σε {b}!'],
 petHow:['How to feed it','Πώς το ταΐζεις'], petToday:['Today','Σήμερα'],
 pfPR:['New PR in a workout (+1 each, max 3/day)','Νέο ρεκόρ σε προπόνηση (+1 το καθένα, έως 3/μέρα)'], pfWork:['Finish a workout','Ολοκλήρωσε προπόνηση'],
 pfKcal:['Calories within 7% of target','Θερμίδες εντός 7% του στόχου'], pfProt:['Hit your protein','Πέτυχε την πρωτεΐνη'], pfSupps:['All supplements taken','Όλα τα συμπληρώματα'],
 petFav:['Favourite: {f} (double food)','Αγαπημένο: {f} (διπλό φαγητό)'], petRename:['Name','Όνομα'], petStage:['Stage {s} of 3','Στάδιο {s} από 3'],
 petNext:['Evolves at level {l}','Εξελίσσεται στο επίπεδο {l}'], petMax:['Fully evolved','Πλήρως εξελιγμένο'],
});

// =====================================================================
// v1.7 — RECOVERY MAP · SORENESS · FRIDGE AUTO-ADD · STOCK BADGES
// =====================================================================
Object.assign(S, {
 tWarm:['Warm','Ζέστ.'], tWork:['Work','Κανον.'], tDrop:['Drop','Drop'], tFail:['Fail','Αποτ.'], typeLbl:['type','τύπος'],
 newSet:['＋ New set','＋ Νέο σετ'], endEx:['End exercise ✓','Τέλος άσκησης ✓'], endWorkout:['End workout','Τέλος προπόνησης'], nSets:['{n} sets','{n} σετ'],
 noExYet:['Tap ＋ Add Exercise to pick your first one.','Πάτα «Προσθήκη άσκησης» για να ξεκινήσεις.'],
 prW:['🏋️ Weight record! {n} {w} kg × {r}','🏋️ Ρεκόρ κιλών! {n} {w} kg × {r}'], prV:['📈 VOLUME RECORD! {n}: {v} kg moved','📈 ΡΕΚΟΡ ΟΓΚΟΥ! {n}: {v} kg συνολικά'],
 prWLine:['🏋️ Weight record','🏋️ Ρεκόρ κιλών'], prVLine:['📈 Volume record','📈 Ρεκόρ όγκου'], prWas:['was {v}','ήταν {v}'],
 upper:['Upper','Πάνω σώμα'], lower:['Lower','Κάτω σώμα'], bodyMode:['Body','Σώμα'], listMode:['List','Λίστα'], tapMuscle:['Tap a muscle','Πάτα έναν μυ'],
 allMuscles:['All muscles','Όλοι οι μύες'], front:['Front','Μπροστά'], backSide:['Back','Πίσω'],
 musclesWorked:['Muscles worked','Μύες που δουλεύουν'], pctNote:['Rough estimates of how much each muscle does the work, not lab measurements.','Χοντρικές εκτιμήσεις του πόσο δουλεύει κάθε μυς, όχι μετρήσεις εργαστηρίου.'],
 howTo:['How to do it','Πώς γίνεται'], mistakesT:['Common mistakes','Συνηθισμένα λάθη'], bestW:['Heaviest','Πιο βαρύ'], bestV:['Best volume','Καλύτερος όγκος'], addThis:['＋ Add exercise','＋ Προσθήκη'],
 whatNext:['💡 What next?','💡 Τι μετά;'], nxT:['What next?','Τι μετά;'], nxSub:['Muscles you haven’t hit yet, based on this session and your week.','Μύες που δεν έχεις δουλέψει ακόμα, με βάση αυτή την προπόνηση και την εβδομάδα.'],
 nxWhy:['{a} sets today · {b} this week','{a} σετ σήμερα · {b} αυτή την εβδομάδα'], nxNone:['You’ve covered everything for this workout. Nice.','Τα κάλυψες όλα για αυτή την προπόνηση. Ωραία.'],
 nxAI:['Ask for a smarter pick','Ζήτα καλύτερη επιλογή'], nxNoKey:['Add a Gemini key in settings for smarter AI picks.','Βάλε κλειδί Gemini στις ρυθμίσεις για πιο έξυπνες προτάσεις AI.'],
 gtRecovery:['Recovery','Αποκατάσταση'], recReady:['Ready','Έτοιμο'], recMid:['Recovering','Αναρρώνει'], recLow:['Needs Rest','Θέλει ξεκούραση'], recAgo:['trained {h} h ago','δούλεψε πριν {h} ώρες'], recDay1:['1 more day','1 μέρα ακόμα'], recDays:['{n} more days','{n} μέρες ακόμα'],
 recIn:['ready in ~{h} h','έτοιμο σε ~{h} ώρες'], recAllReady:['Everything is recovered. Good to go 💪','Όλα έχουν αναρρώσει. Πάμε 💪'],
 recHint:['Based on how many hard sets each muscle got and how long ago.','Με βάση πόσα δύσκολα σετ πήρε κάθε μυς και πόσο παλιά.'],
 recWarnTomorrow:['⚠️ Tomorrow is {w} at {t}, but {m} won’t be fully recovered (~{p}%). Consider swapping days or going lighter.','⚠️ Αύριο έχει {w} στις {t}, αλλά {m} δεν θα έχουν αναρρώσει πλήρως (~{p}%). Σκέψου να αλλάξεις μέρα ή να πας πιο ελαφριά.'],
 recWarnToday:['⚠️ {m} still recovering (~{p}%). Go lighter today or swap exercises.','⚠️ {m} ακόμα αναρρώνουν (~{p}%). Πήγαινε πιο ελαφριά σήμερα ή άλλαξε ασκήσεις.'],
 recRestDay:['😴 Rest day: {m} still recovering. Good call resting.','😴 Μέρα ξεκούρασης: {m} ακόμα αναρρώνουν. Καλά κάνεις και ξεκουράζεσαι.'],
 soreQ:['How sore is it?','Πόσο πιασμένος είναι;'], sore0:['Fresh','Φρέσκος'], sore1:['A little tight','Λίγο σφιχτός'], sore2:['Sore','Πιασμένος'], sore3:['Really sore','Πολύ πιασμένος'], sore4:['Dead','Νεκρός'],
 soreSaved:['Got it, recovery updated','Εντάξει, ενημερώθηκε η αποκατάσταση'], howSore:['😬 How sore are you?','😬 Πόσο πιασμένος είσαι;'],
 inFridgeToo:['Saved {i} · 🧊 in the fridge too','Αποθηκεύτηκε {i} · 🧊 και στο ψυγείο'], notInFridge:['Not in fridge','Όχι στο ψυγείο'],
});

// =====================================================================
// 0.5.3 — FOOD TRACKY · TODAY · GYM BUDDY
// =====================================================================
Object.assign(S, {
 tabFood:['Food Tracker','Food Tracker'], tabToday:['Today','Σήμερα'], tabGym:['Gym Buddy','Gym Buddy'],
 homeHello:['Your food, fridge and shopping.','Το φαγητό, το ψυγείο και τα ψώνια σου.'],
 fibre:['Fibre','Φυτ. ίνες'], electrolytes:['Electrolytes','Ηλεκτρολύτες'], sodium:['Sodium','Νάτριο'], potassium:['Potassium','Κάλιο'],
 elecHint:['% of a daily guideline (sodium 2,300 mg, potassium 3,400 mg). Tap to see milligrams.','% μιας ημερήσιας οδηγίας (νάτριο 2.300 mg, κάλιο 3.400 mg). Πάτα για milligrams.'],
 elecHigh:['high','υψηλό'], fibTarget:['Fibre target (g/day)','Στόχος φυτικών ινών (g/μέρα)'], potMg:['Potassium (mg)','Κάλιο (mg)'],
 raw:['Raw','Ωμό'], cookedS:['Cooked','Μαγειρ.'], tapChangeV:['tap to change','πάτα για αλλαγή'],
 cookHow:['How do you want to cook it?','Πώς θες να το φτιάξεις;'], cookSuggest:['✨ Suggest a recipe','✨ Πρότεινέ μου συνταγή'], cookSuggestSub:['Tell it what you fancy; it fits what’s left of your day.','Πες τι σου κάνει όρεξη· ταιριάζει με ό,τι σου μένει για σήμερα.'],
 cookOwn:['📝 My own recipe','📝 Δική μου συνταγή'], cookOwnSub:['Add the ingredients yourself, raw or cooked.','Πρόσθεσε μόνος σου τα υλικά, ωμά ή μαγειρεμένα.'],
 pasteRecipe:['📋 Paste a recipe instead','📋 Επικόλληση συνταγής'],
 sgT:['What are you in the mood for?','Τι σου κάνει όρεξη;'], sgPh:['Type anything, e.g. spicy, Greek, one-pan','Γράψε οτιδήποτε, π.χ. πικάντικο, ελληνικό, σε ένα τηγάνι'],
 sgGo:['✨ Get a recipe','✨ Φέρε συνταγή'], sgLeft:['Left today: {k} kcal · P {p} · C {c} · F {f}','Σου μένουν σήμερα: {k} kcal · P {p} · C {c} · F {f}'],
 sgNoTargets:['Set your targets in Today 🎯 and recipes will fit your remaining macros.','Βάλε στόχους στο Σήμερα 🎯 και οι συνταγές θα ταιριάζουν με τα μακρο που σου μένουν.'],
 sgPick:['Pick at least one, or type something','Διάλεξε τουλάχιστον ένα ή γράψε κάτι'],
 hubWeek:['Week planner','Εβδομάδα'], hubWeekSub:['Gym, work and rest days','Γυμναστήριο, δουλειά, ξεκούραση'], hubLib:['Workouts','Προπονήσεις'], hubLibSub:['{n} saved','{n} αποθηκευμένες'], hubLibSub1:['1 saved','1 αποθηκευμένη'],
 hubProg:['Progress','Πρόοδος'], hubProgSub:['Strength over time','Δύναμη στον χρόνο'], hubRec:['Recovery','Αποκατάσταση'], hubRecSub:['What’s ready to train','Τι είναι έτοιμο για προπόνηση'],
 work:['Work','Δουλειά'], gym:['Gym','Γυμναστήριο'], addWork:['＋ Work','＋ Δουλειά'], trained:['trained','έγινε'],
 weekHint:['Set each weekday once. Today’s food and Plan my day use your gym and work times.','Ρύθμισε κάθε μέρα μία φορά. Το φαγητό της μέρας και το πλάνο χρησιμοποιούν τις ώρες γυμναστηρίου και δουλειάς.'],
 libEmpty:['<b>No workouts yet</b>Build templates for quick workout logging.','<b>Δεν υπάρχουν προπονήσεις</b>Φτιάξε πρότυπα για γρήγορη καταγραφή.'],
 wType:['What kind of workout?','Τι είδους προπόνηση;'], broSplit:['Bro split','Bro split'], broSub:['One muscle group per day','Μία μυϊκή ομάδα τη μέρα'],
 wPush:['Push','Push'], wPull:['Pull','Pull'], wLower:['Lower','Κάτω σώμα'], wChest:['Chest','Στήθος'], wBack:['Back','Πλάτη'], wShoulders:['Shoulders','Ώμοι'], wArms:['Arms','Χέρια'], wCore:['Core','Κορμός'], wGlutes:['Glutes','Γλουτοί'],
 allEquip:['All','Όλα'], eqWhat:['Equipment','Εξοπλισμός'],
});

// ======================= 0.5.4 =======================
Object.assign(S, {
  ok_:['OK','OK'], tabFood:['Food Tracker','Food Tracker'], useBtn:['Take out','Βγάλε'], fridgeFab:['＋ Add shopping','＋ Πρόσθεσε ψώνια'],
  hiMorning:['Good morning','Καλημέρα'], hiDay:['Hey','Γεια'], hiEvening:['Good evening','Καλησπέρα'], launchSub:['What are we doing?','Τι κάνουμε;'],
  lFoodSub:['{n} foods · {f} in the fridge','{n} τρόφιμα · {f} στο ψυγείο'], lTodaySub:['{a} / {b} kcal','{a} / {b} kcal'], lTodayNo:['{a} kcal so far','{a} kcal μέχρι τώρα'],
  lGymPlan:['{n} today · {t}','{n} σήμερα · {t}'], lGymRest:['Rest day 😴','Μέρα ξεκούρασης 😴'], lGymNone:['Nothing planned today','Τίποτα για σήμερα'], lGymDone:['Trained today ✓','Προπόνηση σήμερα ✓'],
  suWelcome:['Welcome 👋','Καλώς ήρθες 👋'], suWelcomeSub:['A quick setup, only once. You can change everything later.','Γρήγορο στήσιμο, μόνο μία φορά. Όλα αλλάζουν αργότερα.'],
  suNext:['Next','Επόμενο'], suBack:['Back','Πίσω'], suSkip:['Skip','Παράλειψη'], suFinish:['Let\'s go','Πάμε'],
  suAbout:['About you','Για σένα'], suWeight:['Body weight','Βάρος σώματος'], suGoal:['Goal','Στόχος'],
  suWeek:['Your week','Η εβδομάδα σου'], suGymDays:['Which days do you train?','Ποιες μέρες γυμνάζεσαι;'], suGymTime:['Usual gym time','Συνήθης ώρα γυμναστηρίου'],
  suWorkQ:['Do you work?','Δουλεύεις;'], suWorkDays:['Work days','Μέρες δουλειάς'], suFrom:['From','Από'], suTo:['To','Έως'],
  suAi:['AI helper (optional)','Βοηθός AI (προαιρετικό)'], suAiSub:['A free Gemini key unlocks label photos, shopping photos, recipe ideas and Plan my day. Everything else works without it.','Ένα δωρεάν κλειδί Gemini ξεκλειδώνει φωτογραφίες ετικετών και ψωνιών, ιδέες συνταγών και το Πλάνο ημέρας. Όλα τα άλλα δουλεύουν χωρίς αυτό.'],
  suDone:['All set','Έτοιμο'], suDoneSub:['Gym days: {g} kcal · rest days: {r} kcal · protein {p} g. Change them anytime with 🎯 in Today.','Μέρες γυμναστικής: {g} kcal · ξεκούρασης: {r} kcal · πρωτεΐνη {p} g. Αλλάζουν όποτε θες από το 🎯 στο Σήμερα.'],
  suNeedW:['Add your weight first','Βάλε πρώτα το βάρος σου'], suAgain:['↺ Run the first setup again','↺ Ξανά το αρχικό στήσιμο'],
  remGym:['{n} today at {t}','{n} σήμερα στις {t}'], remGymNoT:['{n} today','{n} σήμερα'], remSetT:['Tap to set a time','Πάτα για να βάλεις ώρα'], remWork:['💼 Work {a}–{b}','💼 Δουλειά {a}–{b}'], gymAny:['Gym','Γυμναστήριο'], gymAnyOpt:['Gym (any workout)','Γυμναστήριο (οποιαδήποτε)'],
  qaBtn:['⚡ Quick add (eating out)','⚡ Γρήγορη καταγραφή (έξω)'], qaT:['Quick add','Γρήγορη καταγραφή'], qaSub:['Don\'t know the exact food? Put rough numbers.','Δεν ξέρεις ακριβώς το φαγητό; Βάλε περίπου νούμερα.'],
  qaName:['What was it? (optional)','Τι ήταν; (προαιρετικό)'], qaDef:['Quick add','Γρήγορη καταγραφή'], qaMore:['Carbs and fat (optional)','Υδατάνθρακες και λίπος (προαιρετικά)'], qaNeed:['Add the calories','Βάλε τις θερμίδες'], qaTag:['⚡ quick add','⚡ γρήγορη καταγραφή'],
  usuals:['Your usuals','Τα συνηθισμένα σου'], lastAmt:['last: {a}','τελευταία: {a}'], quickLogged:['Logged {a} {n}','Καταγράφηκε {a} {n}'], grpOnline2:['🌐 Online','🌐 Online'], onlineSearching:['Searching online…','Ψάχνω online…'], onlineMore:['Search online for more','Ψάξε online για περισσότερα'],
  rawTag:['RAW','ΩΜΟ'], suUse:['What will you use the app for?','Για τι θα χρησιμοποιείς την εφαρμογή;'], useBoth:['Food + Gym','Φαγητό + Γυμναστήριο'], useGym:['Mainly Gym','Κυρίως Γυμναστήριο'], useGymOn:['Gym Buddy is now the first tab','Το Gym Buddy είναι πλέον η πρώτη καρτέλα'], useBothOn:['Today\'s Food is the first tab again','Το Σημερινό φαγητό είναι ξανά η πρώτη καρτέλα'], comboT:['Your Combos','Οι συνδυασμοί σου'], comboSave:['Save as combo','Αποθήκευση ως συνδυασμός'], comboPh:['Name, e.g. My breakfast','Όνομα, π.χ. Το πρωινό μου'], comboSub:['{n} foods · {k} kcal','{n} τρόφιμα · {k} kcal'], comboLogged:['Logged {n} · {k} kcal','Καταγράφηκε: {n} · {k} kcal'], comboDel:['Delete combo','Διαγραφή συνδυασμού'], comboSaved:['Combo saved: {n}','Ο συνδυασμός αποθηκεύτηκε: {n}'], startEmpty:['Start Empty Workout','Κενή προπόνηση'], stToday:['planned today','προγραμματισμένη σήμερα'], stCustom:['Customize','Προσαρμογή'], stCustomSub:['Theme · Language · Units','Θέμα · Γλώσσα · Μονάδες'], stBody:['Body and Goals','Σώμα και στόχοι'], stBodySub:['Sex, height, weight, targets','Φύλο, ύψος, βάρος, στόχοι'], stAI:['AI','AI'], stAISub:['Gemini key and model','Κλειδί και μοντέλο Gemini'], stData:['Your Data','Τα δεδομένα σου'], stDataSub:['Back up, import, copy to Claude','Αντίγραφο, εισαγωγή, αντιγραφή για Claude'], stAbout:['About','Σχετικά'], stAboutSub:['Version, setup','Έκδοση, ρύθμιση'], langName:['English','Ελληνικά'], unitsT:['Units','Μονάδες'], unitsSub:['kg · cm · g','kg · cm · g'], unW:['Body weight','Σωματικό βάρος'], unH:['Height','Ύψος'], unF:['Food','Φαγητό'], unNote:['Everything is saved in metric; only what you see and type changes. Lifting weights stay in kg.','Όλα αποθηκεύονται μετρικά· αλλάζει μόνο ό,τι βλέπεις και γράφεις. Τα βάρη στο γυμναστήριο μένουν σε kg.'], dailyTargets:['Daily Targets','Ημερήσιοι στόχοι'], pgLocked:['Unlocks after {n} workouts · {k} to go','Ξεκλειδώνει μετά από {n} προπονήσεις · απομένουν {k}'], ssMade:['Superset made · drag one out to unlink','Έγινε superset · σύρε ένα έξω για να το χωρίσεις'], readyTag:['READY','ΕΤΟΙΜΟ'], cookedTag:['COOKED','ΜΑΓΕΙΡ.'], fromFridge:['🧊 Also comes out of your fridge (you have {s})','🧊 Βγαίνει και από το ψυγείο (έχεις {s})'], takeOutT:['Take out: {n}','Βγάλε: {n}'], takeOutSub:['For cooking, or it went off. Eating gets logged in Today.','Για μαγείρεμα ή αν χάλασε. Ό,τι τρως καταγράφεται στο Σήμερα.'],
  shopT:['Add shopping','Πρόσθεσε ψώνια'], shopSub:['Everything goes into the fridge. Pick the quickest way.','Όλα μπαίνουν στο ψυγείο. Διάλεξε τον πιο γρήγορο τρόπο.'],
  shopPhoto:['📸 Photo of the shopping','📸 Φωτογραφία των ψωνιών'], shopPhotoSub:['Lay it all on the table, one photo','Άπλωσέ τα στο τραπέζι, μία φωτογραφία'],
  shopReceipt:['🧾 Photo of the receipt','🧾 Φωτογραφία της απόδειξης'], shopReceiptSub:['Most accurate for amounts','Πιο ακριβές για ποσότητες'],
  shopScan:['▥ Scan barcodes','▥ Σάρωση barcode'], shopScanSub:['One by one, exact products','Ένα ένα, ακριβή προϊόντα'], shopSearch:['🔍 Search and add','🔍 Αναζήτηση και προσθήκη'], shopSearchSub:['Type a food','Γράψε ένα τρόφιμο'],
  shopAdd:['Add {n} to fridge','Πρόσθεσε {n} στο ψυγείο'], shopAdded:['Added {n} items to the fridge','Μπήκαν {n} προϊόντα στο ψυγείο'], shopNone:['Couldn\'t find any food in the photo.','Δεν βρήκα φαγητά στη φωτογραφία.'], shopFail:['Couldn\'t read it: {e}','Δεν διαβάστηκε: {e}'], shopPick:['tap to pick a food','πάτα για να διαλέξεις'], shopNew:['new','νέο'],
  scanNextQ:['Added. Scan the next one?','Μπήκε. Σάρωση του επόμενου;'], scanNext:['Scan next','Επόμενο'], needKeyFirst:['This needs a free Gemini key (settings).','Χρειάζεται δωρεάν κλειδί Gemini (ρυθμίσεις).'],
  formBtn:['▶ Form','▶ Τεχνική'], formT:['Correct form','Σωστή τεχνική'], lwUsual:['Log usual amount','Καταγραφή της συνηθισμένης ποσότητας'], lwHour:['Usually at this time','Συνήθως αυτή την ώρα'], lwResults:['Results','Αποτελέσματα'], lwAmount:['Amount','Ποσότητα'], lwTake:['Add Takeaway','Φαγητό απ\' έξω'], lwFill:['Fill My Macros','Γέμισε τα μακρο'], lwTrack:['Food Tracker','Food Tracker'], lwTitle:['Log Food','Καταγραφή'], themeT:['Theme','Θέμα'], thAppearance:['Appearance','Εμφάνιση'], thDark:['Dark','Σκούρο'], thLight:['Light','Ανοιχτό'], thAuto:['Automatic','Αυτόματο'], thColour:['Colour','Χρώμα'], thPreview:['Preview','Προεπισκόπηση'], thAutoNote:['Follows your iPhone','Ακολουθεί το iPhone σου'], thLightNote:['Light uses a soft grey, not pure white','Το ανοιχτό είναι απαλό γκρι, όχι κάτασπρο'], formPct:['Percentages','Ποσοστά'], formZoomHint:['Pinch to zoom · double-tap to reset','Τσίμπημα για ζουμ · διπλό πάτημα για επαναφορά'], formPhoto:['Photo {a} of {b}','Φωτογραφία {a} από {b}'], formNext:['Not this one ›','Δεν είναι αυτό ›'], formLoading:['Loading the demo…','Φορτώνει η επίδειξη…'],
  formFail:['Couldn\'t load the demo (needs internet).','Δεν φόρτωσε η επίδειξη (θέλει ίντερνετ).'], formCredit:['Photos: free-exercise-db (public domain). Steps in English.','Φωτογραφίες: free-exercise-db (ελεύθερες). Βήματα στα αγγλικά.'], formNone:['No demo found for this one.','Δεν βρέθηκε επίδειξη γι\' αυτό.'],
  setsL:['Sets','Σετ'], repsL:['Reps','Επαναλήψεις'], restL:['Rest','Διάλειμμα'], typeChange:['change','αλλαγή'], otherWorkout:['or pick another workout','ή διάλεξε άλλη προπόνηση'], tapNum:['Tap the set number for warm-up / drop / failure','Πάτα τον αριθμό του σετ για ζέσταμα / drop / αποτυχία'],
  wiT:['Weigh-in','Ζύγισμα'], wiSave:['Save','Αποθήκευση'], wiSaved:['Weight saved','Το βάρος αποθηκεύτηκε'], wiRate:['{r} kg/week over the last {d} days','{r} kg/εβδομάδα τις τελευταίες {d} μέρες'],
  wiNeed:['Weigh in a few times a week (same time, morning). The trend shows after a week.','Ζυγίσου μερικές φορές την εβδομάδα (ίδια ώρα, πρωί). Η τάση φαίνεται μετά από μια εβδομάδα.'],
  wiOk:['On track 👍','Είσαι στον στόχο 👍'], wiSlowBulk:['Gaining slower than a lean bulk (+0.25–0.5% a week).','Παίρνεις πιο αργά από ένα καθαρό bulk (+0,25–0,5% την εβδομάδα).'], wiFastBulk:['Gaining faster than a lean bulk, so some of it is fat.','Παίρνεις πιο γρήγορα από ένα καθαρό bulk, άρα ένα μέρος είναι λίπος.'],
  wiSlowCut:['Losing slower than planned (−0.5–1% a week).','Χάνεις πιο αργά από το πλάνο (−0,5–1% την εβδομάδα).'], wiFastCut:['Losing fast, so you might lose muscle too.','Χάνεις γρήγορα, μπορεί να χάνεις και μυ.'], wiRecomp:['A recomp should keep weight about the same.','Στο recomp το βάρος μένει περίπου ίδιο.'],
  wiApply:['Apply {d} kcal','Εφάρμοσε {d} kcal'], wiApplied:['Targets changed by {d} kcal','Οι στόχοι άλλαξαν κατά {d} kcal'],
  bkT:['💾 Back up your data (1 tap)','💾 Αντίγραφο των δεδομένων (1 πάτημα)'], bkSub:['Last backup: {d}. Save it to iCloud Drive / Files.','Τελευταίο: {d}. Αποθήκευσέ το στο iCloud Drive / Αρχεία.'], bkNever:['never','ποτέ'], bkDone:['Backup saved','Το αντίγραφο αποθηκεύτηκε'],
  potOther:['Weigh it in the pot instead ›','Ζύγισε με την κατσαρόλα ›'], cookedW:['Cooked food weight (g)','Βάρος μαγειρεμένου φαγητού (g)'],
});

Object.assign(S, {
  tabFridge: ['Fridge', 'Ψυγείο'],
  fibSug: ['Suggested: {g} g', 'Προτείνεται: {g} g'], fibCutX: [' (more on a cut keeps you full)', ' (στη γράμμωση το παραπάνω σε κρατάει χορτάτο)'], fibUse: ['Use it', 'Χρήση'],
  recEstT: ['Recovery estimate', 'Εκτίμηση αποκατάστασης'], recAIwait: ['The AI is checking your sets…', 'Το AI ελέγχει τα σετ σου…'],
  recOffline: ['From your sets, failure sets and heavy lowering moves. Add a Gemini key for an AI check.', 'Από τα σετ, τα σετ μέχρι αποτυχία και τις βαριές εκκεντρικές. Βάλε κλειδί Gemini για έλεγχο AI.'],
  recAIFail: ['Couldn\'t reach the AI, so this is the built-in estimate.', 'Δεν απάντησε το AI, άρα αυτή είναι η ενσωματωμένη εκτίμηση.'], recAIdone: ['Checked by AI', 'Ελέγχθηκε από AI'], recReadyChip: ['ready ✓', 'έτοιμο ✓'], recEstSub: ['Hours until you can train it hard again', 'Ώρες μέχρι να το ξαναδουλέψεις δυνατά'],
});

Object.assign(S, {
  savedTpls: ['Saved Workouts', 'Αποθηκευμένες προπονήσεις'], savedWorkouts: ['Saved workouts', 'Αποθηκευμένες προπονήσεις'], pastWorkouts: ['Past workouts', 'Προηγούμενες προπονήσεις'],
  noPast: ['Your finished workouts will show up here.', 'Οι προπονήσεις που τελειώνεις θα εμφανίζονται εδώ.'],
  saveTplT: ['Save this workout for later?', 'Αποθήκευση για επόμενη φορά;'], saveTplSub: ['Next time it\'s one tap to start it with the same exercises and sets.', 'Την επόμενη φορά ξεκινάει με ένα πάτημα, με τις ίδιες ασκήσεις και σετ.'],
  workoutName: ['Name', 'Όνομα'], saveTplYes: ['Save', 'Αποθήκευση'], saveTplNo: ['No thanks', 'Όχι, ευχαριστώ'], tplSavedT: ['Saved “{n}” to your workouts', 'Το «{n}» μπήκε στις προπονήσεις σου'],
  lastSetL: ['last time {w} × {r}', 'την προηγούμενη {w} × {r}'],
  blNextT: ['What next?', 'Τι μετά;'], blLooks: ['Today looks like: {d}', 'Σήμερα μοιάζει με: {d}'], blBest: ['Best next', 'Το καλύτερο επόμενο'], blOr: ['Or', 'Ή'],
  blDone: ['You\'ve covered everything for this day. Good time to finish 💪', 'Τα κάλυψες όλα για σήμερα. Ώρα να τελειώσεις 💪'],
  blBuildT: ['Build a workout', 'Φτιάξε προπόνηση'], blNeedEx: ['Add an exercise first so I can see what you\'re training. Or let me build a whole workout:', 'Πρόσθεσε πρώτα μια άσκηση για να δω τι δουλεύεις. Ή άσε με να φτιάξω ολόκληρη προπόνηση:'],
  blPick: ['What are you training today?', 'Τι γυμνάζεις σήμερα;'], blOrMuscle: ['Or one muscle group', 'Ή μία μυϊκή ομάδα'], blAccept: ['Accept · add all', 'Αποδοχή · πρόσθεσέ τα'],
  blAdded: ['Added {n} exercises', 'Προστέθηκαν {n} ασκήσεις'], blNone: ['Couldn\'t find exercises for that.', 'Δεν βρέθηκαν ασκήσεις γι\' αυτό.'],
});

// ---------- 0.5.9 ----------
Object.assign(S, {
  extrasT: ['Extras · Fibre, Sodium, Potassium', 'Επιπλέον · Φυτικές ίνες, νάτριο, κάλιο'],
  winElec: ['Sodium ~{na} mg · Potassium ~{k} mg', 'Νάτριο ~{na} mg · Κάλιο ~{k} mg'],
  tipCarbT: ['Carb timing means eating more of your carbs around your workout: some a few hours before for fuel, and more in the two hours after to refill your muscles. Your total for the day matters most; timing is a small extra edge. The sodium and potassium numbers are a rough guide, with a bit more sodium around training because you lose it in sweat.',
    'Κατανομή υδατανθράκων σημαίνει να τρως περισσότερους υδατάνθρακες γύρω από την προπόνηση: λίγους μερικές ώρες πριν για ενέργεια, και περισσότερους τις δύο ώρες μετά για να γεμίσουν ξανά οι μύες. Το σύνολο της μέρας μετράει πιο πολύ· η κατανομή είναι ένα μικρό έξτρα. Τα νούμερα για νάτριο και κάλιο είναι πρόχειρος οδηγός, με λίγο παραπάνω νάτριο γύρω από την προπόνηση γιατί το χάνεις με τον ιδρώτα.'],
  tipElec: ['Sodium and potassium help your muscles work and keep you hydrated. You lose sodium in sweat, so on gym days a bit more is fine. Most people get too little potassium: potatoes, bananas, yoghurt, beans and leafy greens are good sources. Tap the box to switch between % and mg.',
    'Το νάτριο και το κάλιο βοηθούν τους μύες να δουλεύουν και σε κρατούν ενυδατωμένο. Το νάτριο το χάνεις με τον ιδρώτα, οπότε τις μέρες γυμναστηρίου λίγο παραπάνω είναι οκ. Οι περισσότεροι παίρνουν λίγο κάλιο: πατάτες, μπανάνες, γιαούρτι, όσπρια και πράσινα φυλλώδη είναι καλές πηγές. Πάτα το κουτί για αλλαγή ανάμεσα σε % και mg.'],
  tipMacroSl: ['Calories stay fixed. Move one slider and the other two adjust, so protein, carbs and fat always add up to 100% of your calories.',
    'Οι θερμίδες μένουν ίδιες. Κουνάς ένα ρυθμιστικό και τα άλλα δύο προσαρμόζονται, ώστε πρωτεΐνη, υδατάνθρακες και λίπος να κάνουν πάντα το 100% των θερμίδων.'],
  qaBtn: ['⚡ Quick add', '⚡ Γρήγορη καταγραφή'],
  qaSub: ['Type what you ate. It logs a normal plate\'s worth.', 'Γράψε τι έφαγες. Καταγράφεται μια κανονική μερίδα.'],
  qaPh: ['e.g. souvlaki pita, pasta bolognese', 'π.χ. πίτα σουβλάκι, μακαρονάδα με κιμά'],
  qaSmall: ['Small', 'Μικρή'], qaNormal: ['Normal', 'Κανονική'], qaBig: ['Big', 'Μεγάλη'], qaLog: ['Log it', 'Καταγραφή'],
  qaNeedTxt: ['Type what you ate', 'Γράψε τι έφαγες'], qaLogged: ['Logged {n} · {k} kcal', 'Καταγράφηκε {n} · {k} kcal'],
  qaNoKey: ['Not in the built-in foods. Mixed dishes need the free Gemini key (settings), or search for it instead.', 'Δεν υπάρχει στα έτοιμα τρόφιμα. Τα σύνθετα φαγητά θέλουν το δωρεάν κλειδί Gemini (ρυθμίσεις), ή κάνε αναζήτηση.'],
  qaThinking: ['Estimating…', 'Υπολογίζω…'], qaFail: ['Couldn\'t estimate it. Try other words, or search for it.', 'Δεν βγήκε εκτίμηση. Δοκίμασε άλλες λέξεις ή κάνε αναζήτηση.'],
  calcFrom: ['Calculate uses your latest weigh-in ({w} kg) and your goal.', 'Ο υπολογισμός χρησιμοποιεί το τελευταίο σου ζύγισμα ({w} kg) και τον στόχο σου.'],
  calcNeedW: ['Add your weight in Gym → Progress first.', 'Βάλε πρώτα το βάρος σου στο Γυμναστήριο → Πρόοδος.'],
});

// ---------- 0.5.9: Title Case on every English title and label (Greek stays normal Greek) ----------
const TITLE_SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'per', 'vs', 'from', 'as', 'but', 'nor', 'g', 'kg', 'ml', 'mg', 'kcal', 'min', 'h', 'est.', 'x']);
function titleCase(str){
  let first = true;
  return str.replace(/[A-Za-zÀ-ÿ’'.]+(?:-[A-Za-zÀ-ÿ’'.]+)*/g, w => {
    const lw = w.toLowerCase(), keep = !first && TITLE_SMALL.has(lw); first = false;
    if(keep || /[A-Z]/.test(w.slice(1))) return keep ? lw : w;   // small words stay small, API / AI stay as they are
    return w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-');
  });
}
['add', 'addBrand', 'addExercise', 'addFood', 'addIngredient', 'addSuppFab', 'addThis', 'all', 'almost', 'ateAt', 'auto', 'back', 'backArrow', 'barcode', 'bestV', 'bkT', 'blBest', 'blOr', 'bodyMode', 'brand', 'calcStart', 'cancel', 'carbTiming', 'carbs', 'chooseIngredient', 'close', 'comesAs', 'cookAgain', 'cookOwn', 'cookSuggest', 'cooked', 'copyClaude', 'copyYesterday', 'countThem', 'delete', 'discard', 'done', 'download', 'duplicate', 'eaten', 'edit', 'emptyWorkout', 'endWorkout', 'exercises', 'expires', 'extrasT', 'fat', 'fibre', 'finishedIt', 'finishedWeight', 'foodType', 'formNext', 'gBulk', 'gCut', 'gRecomp', 'geminiKey', 'geminiModel', 'getKey', 'goal', 'grpMine', 'grpOnline', 'grpOnline2', 'grpStd', 'gtPlan', 'gtProgress', 'gtRecovery', 'gtWorkouts', 'gymDay', 'gymDayTargets', 'historyT', 'howMuch', 'howTo', 'hubLib', 'hubProg', 'hubProgSub', 'hubRec', 'hubWeek', 'hubWeekSub', 'import', 'ingredients', 'language', 'later', 'light', 'listMode', 'locCupboard', 'locFreezer', 'locFridge', 'logFood', 'lookUp', 'lower', 'measuredIn', 'mistakesT', 'musclesWorked', 'noBarcodeLabel', 'noBrand', 'noExpiry', 'noThanks', 'notes', 'oftenDaily', 'oftenNeeded', 'oftenTraining', 'onMyPlate', 'orFoodOnly', 'ownRecipe', 'ownRecipeT', 'packSizes', 'pastWorkouts', 'pasteRecipe', 'perPack', 'petChoose', 'petHow', 'pieces', 'planT', 'postMeal', 'potEmpty', 'potFull', 'potMg', 'product', 'protein', 'qaBig', 'qaBtn', 'qaLog', 'qaMore', 'qaNormal', 'qaSmall', 'qaT', 'readRecipe', 'ready', 'rebuyBelow', 'recEstT', 'recMid', 'recipeIdea', 'recipeT', 'remove', 'restDay', 'restDayTargets', 'restL', 'salt', 'satFat', 'save', 'saveMeal', 'saveSettings', 'saveTplNo', 'saveTplYes', 'savedTpls', 'savedWorkouts', 'scTitle', 'scTry', 'scanPhoto', 'scanTitle', 'scanToLog', 'sendReminders', 'setsL', 'settings', 'sgGo', 'share', 'shopPhoto', 'shopReceipt', 'shopReview', 'shopScan', 'shopSearch', 'shopT', 'showOnList', 'skip', 'slices', 'smPRs', 'smTitle', 'steps', 'suAbout', 'suAgain', 'suAi', 'suDone', 'suWeek', 'suWelcome', 'sugar', 'suggestRecipe', 'supDose', 'supLink', 'supName', 'supOften', 'tFoods', 'tFridge', 'tGroc', 'tGym', 'tMeals', 'tScan', 'tSupps', 'tToday', 'tabFood', 'tabFridge', 'tabGym', 'tabMeals', 'tabStore', 'tabToday', 'targetsT', 'testKey', 'typeIt', 'uncooked', 'upper', 'useRecipe', 'useUpT', 'usuals', 'wArms', 'wBack', 'wCardio', 'wChest', 'wCore', 'wFull', 'wGlutes', 'wLegs', 'wLower', 'wPull', 'wPush', 'wShoulders', 'wUpper', 'weighOne', 'whereKept', 'whole', 'wiSave', 'wiT', 'winEvening', 'winMidday', 'winMorning', 'winPost', 'winPre', 'winWorkout', 'workoutAt', 'workoutName', 'workoutType', 'yourData', 'planMyDay', 'logFab', 'fridgeFab', 'cookFab', 'addFoodFab', 'shopFab'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.0 ----------
Object.assign(S, {
  exDone: ['Done', 'Τέλος'], reopenEx: ['Reopen', 'Ξανά άνοιγμα'],
  wtTitle: ['Body weight', 'Σωματικό βάρος'], wtChart: ['Body weight chart', 'Γράφημα σωματικού βάρους'], wt_day: ['Day', 'Μέρα'], wt_week: ['Week', 'Εβδομάδα'], wt_month: ['Month', 'Μήνας'],
  wtSince: ['since {d}', 'από {d}'], wtNeed: ['Weigh in twice and your chart starts here.', 'Ζυγίσου δύο φορές και το γράφημα ξεκινά εδώ.'],
  pgStrength: ['Strength by muscle', 'Δύναμη ανά μυ'], pgUpper: ['Upper body', 'Πάνω σώμα'], pgLower: ['Lower body', 'Κάτω σώμα'],
  pgSets: ['~{n} sets a week', '~{n} σετ την εβδομάδα'], pgOnce: ['1 workout', '1 προπόνηση'], pgNoMonth: ['Nothing for this in the past month.', 'Τίποτα τον τελευταίο μήνα.'],
  pgNone: ['Nothing trained here yet.', 'Δεν έχεις γυμνάσει κάτι εδώ ακόμα.'],
  tipPgVol: ['The % is how much total weight you move per working set (weight × reps, warm-ups left out), compared with your first workout. Doing more sets doesn\'t inflate it; more weight or more reps does. Each exercise is compared only with itself, then a muscle averages its exercises. The grey line is your average sets per week over the last 4 weeks (half a set when the muscle only helps).',
    'Το % δείχνει πόσο συνολικό βάρος κινείς ανά σετ εργασίας (κιλά × επαναλήψεις, χωρίς τα σετ προθέρμανσης), σε σχέση με την πρώτη σου προπόνηση. Τα περισσότερα σετ δεν το φουσκώνουν· τα περισσότερα κιλά ή επαναλήψεις ναι. Κάθε άσκηση συγκρίνεται μόνο με τον εαυτό της και μετά ο μυς βγάζει μέσο όρο. Η γκρι γραμμή είναι τα σετ ανά εβδομάδα τις τελευταίες 4 εβδομάδες (μισό σετ όταν ο μυς απλώς βοηθάει).'],
});
['exDone', 'reopenEx', 'wtTitle', 'wt_day', 'wt_week', 'wt_month', 'pgStrength', 'pgUpper', 'pgLower', 'discard', 'endWorkout', 'endEx', 'newSet'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.1 ----------
Object.assign(S, {
  addFoodFab: ['▥ Add food', '▥ Προσθήκη'], cantScan: ["Can't scan?", 'Δεν σκανάρει;'], addYesterday: ["↺ Add yesterday's food", '↺ Πρόσθεσε το χθεσινό φαγητό'],
  createWorkout: ['Create a workout', 'Δημιούργησε προπόνηση'],
});
['addFoodFab', 'addYesterday', 'createWorkout'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

Object.assign(S, {
  aiThinking: ['Thinking…', 'Σκέφτομαι…'], aiSlow: ['This can take up to a minute. Free AI models are often busy, so it tries a few.', 'Μπορεί να πάρει έως ένα λεπτό. Τα δωρεάν μοντέλα AI είναι συχνά απασχολημένα, οπότε δοκιμάζει μερικά.'],
  aiMany: ['{n} AI uses today. Free Gemini keys have a daily limit (a few hundred); if the AI stops answering, it resets tomorrow.', '{n} χρήσεις AI σήμερα. Τα δωρεάν κλειδιά Gemini έχουν ημερήσιο όριο (μερικές εκατοντάδες)· αν το AI σταματήσει να απαντά, ξεκινά ξανά αύριο.'],
  tryingModel: ['Thinking…', 'Σκέφτομαι…'], cancelRec: ['✕ Cancel', '✕ Ακύρωση'],
  noBarcodeLabel: ['📷 ✨ Label photo', '📷 ✨ Φωτό ετικέτας'], shopPhoto: ['📸 ✨ Photo of the shopping', '📸 ✨ Φωτογραφία των ψωνιών'], shopReceipt: ['🧾 ✨ Photo of the receipt', '🧾 ✨ Φωτογραφία της απόδειξης'],
  optPhoto: ['✨ Photo of nutrition label<small>Read by the AI (free Gemini key in settings)</small>', '✨ Φωτογραφία διατροφικής ετικέτας<small>Τη διαβάζει το AI (δωρεάν κλειδί Gemini στις ρυθμίσεις)</small>'],
  geminiKey: ['Gemini API key (AI = uses it)', 'Κλειδί Gemini API (AI = το χρησιμοποιεί)'],
  mealName: ['Recipe title', 'Τίτλος συνταγής'],
  sgPh: ['Give food name', 'Δώσε όνομα φαγητού'], sgIngT: ['Ingredients', 'Υλικά'], sgTimeT: ['Time available', 'Διαθέσιμος χρόνος'],
  sgQuick: ['Quick ≤20 min', 'Γρήγορο ≤20′'], sgMid: ['20–60 min', '20–60′'], sgLong: ['60+ min', '60+′'], sgAdult: ['One normal adult portion per serving.', 'Μία κανονική μερίδα ενήλικα ανά μερίδα.'],
  cWeighLink: ['⚖️ Weighed the cooked food? (optional)', '⚖️ Ζύγισες το μαγειρεμένο φαγητό; (προαιρετικό)'],
  cqT: ['⚡ Quick add', '⚡ Γρήγορη προσθήκη'], cqPh: ['Write the recipe however you like, e.g. 500 g chicken, 300 g rice, 2 tbsp olive oil, 1 onion', 'Γράψε τη συνταγή όπως θες, π.χ. 500 g κοτόπουλο, 300 g ρύζι, 2 κ.σ. ελαιόλαδο, 1 κρεμμύδι'],
  cqGo: ['✨ Work it out', '✨ Υπολόγισέ το'], cqDone: ['Added {n} ingredients. Check the amounts.', 'Μπήκαν {n} υλικά. Έλεγξε τις ποσότητες.'],
  cqFail: ["Couldn't read it. Try listing each ingredient with an amount.", 'Δεν διαβάστηκε. Γράψε κάθε υλικό με ποσότητα.'], cqNoKey: ['Write each ingredient with grams, or add a free Gemini key (settings) for the AI.', 'Γράψε κάθε υλικό με γραμμάρια, ή βάλε δωρεάν κλειδί Gemini (ρυθμίσεις) για το AI.'],
});
['mealName', 'sgIngT', 'sgTimeT', 'cqT', 'cqGo', 'aiThinking'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.2 ----------
Object.assign(S, {
  advancedT: ['Advanced · Fibre, Electrolytes, Carb Timing', 'Για προχωρημένους · Ίνες, ηλεκτρολύτες, υδατάνθρακες'],
  startWk: ['Start workout', 'Έναρξη προπόνησης'], entryDel: ['Deleted {n}', 'Διαγράφηκε: {n}'],
  usualHour: ['Usually this hour you have:', 'Συνήθως αυτή την ώρα τρως:'],
  suSex: ['Sex (calories and macros differ)', 'Φύλο (οι θερμίδες διαφέρουν)'], suMale: ['Male', 'Άνδρας'], suFemale: ['Female', 'Γυναίκα'], suHeight: ['Height', 'Ύψος'],
  shopCam: ['📷 ✨ Camera', '📷 ✨ Κάμερα'], shopCamSub: ['Lay all the items out and take a picture, or picture the receipt (more accurate)', 'Άπλωσε όλα τα προϊόντα και βγάλε φωτογραφία, ή φωτογράφισε την απόδειξη (πιο ακριβές)'],
  scanSaved: ['Saved to Food Tracker too, so next time it\'s instant', 'Μπήκε και στο Food Tracker, την επόμενη φορά είναι άμεσο'],
  bkAskOld: ['Your data only lives on this phone. Last backup was {d} days ago. Back up now?', 'Τα δεδομένα σου είναι μόνο σε αυτό το κινητό. Τελευταίο αντίγραφο πριν {d} μέρες. Αντίγραφο τώρα;'],
  bkAskNever: ['Your data only lives on this phone and you haven\'t backed it up yet. Back up now?', 'Τα δεδομένα σου είναι μόνο σε αυτό το κινητό και δεν έχεις κρατήσει αντίγραφο. Αντίγραφο τώρα;'],
  bkYes: ['Back up', 'Αντίγραφο'],
});
['startWk', 'suMale', 'suFemale', 'suHeight', 'bkYes'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.3 ----------
Object.assign(S, {
  advancedT: ['Advanced', 'Για προχωρημένους'], typeCode: ['Type every number under the barcode', 'Γράψε όλους τους αριθμούς κάτω από το barcode'],
  tpNamePh: ['Workout name, e.g. Push A', 'Όνομα προπόνησης, π.χ. Push A'], exRemoved: ['Removed {n}', 'Αφαιρέθηκε: {n}'],
  yourBody: ['Your body', 'Το σώμα σου'], bodySaved: ['Saved', 'Αποθηκεύτηκε'],
  recalcQ: ['Recalculate your daily targets from this?', 'Να ξαναϋπολογιστούν οι ημερήσιοι στόχοι σου;'], recalcYes: ['Recalculate', 'Υπολογισμός'], recalcNo: ['Keep mine', 'Κράτα τους δικούς μου'],
});
['yourBody', 'recalcYes', 'recalcNo'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.3.1 ----------
Object.assign(S, {
  tabSupps: ['Supplements', 'Συμπληρώματα'], takeIt: ['Take', 'Το πήρα'], takeAgain: ['+ Again', '+ Ξανά'],
  u_caps: ['C', 'C'], u_tabs: ['T', 'T'], u_scoops: ['S', 'S'], u_drops: ['D', 'D'],
  ul_caps: ['capsules', 'κάψουλες'], ul_tabs: ['tablets', 'ταμπλέτες'], ul_scoops: ['scoops', 'μεζούρες'], ul_drops: ['drops', 'σταγόνες'],
});
['tabSupps'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.4 ----------
Object.assign(S, {
  addFoodFab: ['＋ Add Food', '＋ Προσθήκη'], scanFoodFab: ['Scan Food', 'Σάρωση'],
  scanItem: ['📸 ✨ Photo of the whole item', '📸 ✨ Φωτογραφία του προϊόντος'], theItemPhoto: ['the item photo', 'τη φωτογραφία του προϊόντος'],
  itemFail: ["Couldn't recognise it. Try a clearer photo of the front, or the label.", 'Δεν αναγνωρίστηκε. Δοκίμασε πιο καθαρή φωτογραφία της μπροστινής πλευράς ή της ετικέτας.'],
});
['addFoodFab', 'scanFoodFab'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.5 ----------
Object.assign(S, {
  uniT: ['One side at a time (L / R sets)', 'Μία πλευρά τη φορά (σετ Α / Δ)'], setRemoved: ['Set removed', 'Το σετ αφαιρέθηκε'],
  aiBg: ['Working on it. Keep using the app; tap the bubble when it\'s ready.', 'Δουλεύει. Συνέχισε στην εφαρμογή· πάτα τη φούσκα όταν είναι έτοιμο.'],
  aiStill: ['Still thinking…', 'Ακόμα σκέφτεται…'], aiReady: ['Ready, tap to open', 'Έτοιμο, πάτα για άνοιγμα'],
  scanReceipt: ['Scan Receipt', 'Σάρωση απόδειξης'], addFridgeFab: ['＋ Add Food', '＋ Προσθήκη'],
  frozen: ['Frozen', 'Κατεψυγμένο'], frozenTip: ['Frozen', 'Κατεψυγμένο'], plate: ['plate', 'πιάτο'],
});
['scanReceipt'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// ---------- 0.6.5.1 ----------
Object.assign(S, {
  planMyDay: ['✨ Fill my food', '✨ Συμπλήρωσε τα υπόλοιπα'], planT: ['Fill my food', 'Συμπλήρωσε τα υπόλοιπα'],
  qaBtn: ['🥡 Add takeaway', '🥡 Φαγητό απ\' έξω'], qaT: ['Add takeaway', 'Φαγητό απ\' έξω'], allFoods: ['All foods', 'Όλα τα τρόφιμα'],
});
['planMyDay', 'planT', 'qaBtn', 'qaT', 'allFoods'].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

Object.assign(S, { ateBtn: ['Ate', 'Το έφαγα'] });

// ---------- 0.6.6 ----------
Object.assign(S, {
  realStartT: ['Use my real workout start time', 'Χρήση της πραγματικής ώρας έναρξης'],
});

// ---------- 0.6.7 ----------
Object.assign(S, {
  didYouMean: ['Did you mean', 'Μήπως εννοείς'], addAsTakeaway: ['Add “{q}” as Takeaway', 'Πρόσθεσε «{q}» ως φαγητό απ\' έξω'],
  takeawaySub: ['✨ The AI estimates it', '✨ Το υπολογίζει η AI'], checkVals: ['check the numbers', 'έλεγξε τις τιμές'],
  uPacks: ['packs', 'συσκ.'], uPlates: ['plates', 'πιάτα'],
});

// ---------- 0.6.8 ----------
Object.assign(S, {
  superset: ['Superset', 'Υπερσετ'], formPill: ['Form', 'Τεχνική'], swapPill: ['Swap', 'Αλλαγή'], newSetPill: ['+ New Set', '+ Νέο σετ'], endExPill: ['End Exercise', 'Τέλος άσκησης'],
  setDoneL: ['Set done', 'Σετ ολοκληρώθηκε'], markDoneL: ['Mark set done', 'Σημείωσε το σετ'], add15: ['Add 15 seconds', 'Πρόσθεσε 15 δευτερόλεπτα'], sub15: ['Subtract 15 seconds', 'Αφαίρεσε 15 δευτερόλεπτα'],
  discardQ2: ['Discard this workout?', 'Απόρριψη αυτής της προπόνησης;'], discardBtn: ['Discard', 'Απόρριψη'], keepBtn: ['Keep', 'Κράτησέ τη'], endWorkoutPill: ['End Workout', 'Τέλος προπόνησης'], skipGym: ['Skip', 'Παράλειψη'], gymSkipped: ['Gym skipped today · rest-day calories', 'Χωρίς γυμναστήριο σήμερα · θερμίδες ημέρας ξεκούρασης'],
  gymSkippedT: ['Skipped: today uses your rest-day targets', 'Παράλειψη: σήμερα ισχύουν οι στόχοι ημέρας ξεκούρασης'], weekHintSimple: ['Tap Gym or Rest for each day.', 'Πάτα Γυμναστήριο ή Ξεκούραση για κάθε μέρα.'],
  gymL: ['Gym', 'Γυμναστήριο'], restDayS: ['Rest', 'Ξεκούραση'], muUse: ['Muscle Usage {p}%', 'Χρήση μυός {p}%'], sortByMu: ['Sort by muscle usage', 'Ταξινόμηση κατά χρήση μυός'], estNew: ['Based on your other exercises, try {w} kg for {r} reps', 'Με βάση τις άλλες σου ασκήσεις, δοκίμασε {w} kg για {r} επαναλήψεις'],
  autoEnded: ['Workout saved. It ended by itself at {t} (no taps for 15 min).', 'Η προπόνηση αποθηκεύτηκε. Έληξε μόνη της στις {t} (15 λεπτά χωρίς πάτημα).'],
  idleQ: ['Your workout has been open with no taps for {m} min. Go back to it?', 'Η προπόνηση είναι ανοιχτή χωρίς πάτημα εδώ και {m} λεπτά. Επιστροφή σε αυτή;'],
  idleBack: ['Back to workout', 'Επιστροφή'], idleEnd: ['End it', 'Τέλος'], idleDiscarded: ['Workout discarded (nothing was ticked).', 'Η προπόνηση απορρίφθηκε (κανένα σετ).'], dropMore: ['＋ Drop', '＋ Drop'], swapEx: ['Swap exercise', 'Αλλαγή άσκησης'],
});

// ---------- 0.7: shopping in, Groceries → fridge, Check My Foods ----------
Object.assign(S, {
  fixPack: ['set the pack size', 'όρισε τη συσκευασία'], tickedIn: ['In the fridge: {n}', 'Στο ψυγείο: {n}'],
  unknownCode: ['Unknown product · {c}', 'Άγνωστο προϊόν · {c}'], lookingUp1: ['looking it up…', 'το ψάχνω…'], fromWeb: ['from the web — check', 'από το διαδίκτυο — έλεγξε'],
  packsL: ['Packs', 'Συσκευασίες'], packSizeL: ['Size of one pack', 'Μέγεθος μίας συσκευασίας'],
  wentIn: ['{n} went straight into the fridge', '{n} μπήκαν κατευθείαν στο ψυγείο'], allIn: ['<b>All in the fridge</b>Nothing left to check.', '<b>Όλα στο ψυγείο</b>Δεν έμεινε κάτι για έλεγχο.'],
  shopAddAll: ['Add All to Fridge ({n})', 'Όλα στο ψυγείο ({n})'], shopSkipped: ['{n} without a food skipped', '{n} χωρίς τρόφιμο παραλείφθηκαν'],
  scanBasket: ['{n} scanned', '{n} σαρωμένα'], scanDone: ['Done ({n})', 'Τέλος ({n})'], addedOne: ['Added', 'Προστέθηκε'],
  moreItemsQ: ['More items?', 'Κι άλλα προϊόντα;'], moreItems: ['More Items', 'Κι Άλλα'],
  shopReading: ['Reading the receipt…', 'Διαβάζω την απόδειξη…'], shopOffLook: ['Finding {n} products on Open Food Facts…', 'Ψάχνω {n} προϊόντα στο Open Food Facts…'],
  shopWebLook: ['✨ Looking up {n} unknown items online…', '✨ Ψάχνω {n} άγνωστα προϊόντα στο διαδίκτυο…'],
  shopReview: ['Check Before Adding', 'Έλεγχος πριν την προσθήκη'], shopReviewSub: ['Tap a name to change it, untick anything wrong, roll the wheel for how many packs.', 'Πάτα ένα όνομα για αλλαγή, ξετσέκαρε ό,τι είναι λάθος, γύρνα τη ρόδα για το πόσα πήρες.'],
  emptyGroc: ['<b>Nothing to buy</b>Type above to add something. Tick things off in the store and they go straight into the fridge. What you run out of lands here by itself.', '<b>Τίποτα για ψώνια</b>Γράψε από πάνω για να προσθέσεις. Τσέκαρέ τα στο μαγαζί και μπαίνουν κατευθείαν στο ψυγείο. Ό,τι τελειώνει μπαίνει εδώ μόνο του.'],
  chkBtn: ['✨ Check My Foods', '✨ Έλεγχος τροφίμων'], chkT: ['Check My Foods', 'Έλεγχος τροφίμων'],
  chkSub: ['Each food is checked against that exact product online. Only the ones that look off are shown — nothing changes unless you accept.', 'Κάθε τρόφιμο ελέγχεται με το ίδιο ακριβώς προϊόν στο διαδίκτυο. Βλέπεις μόνο όσα φαίνονται λάθος — τίποτα δεν αλλάζει αν δεν το δεχτείς.'],
  chkAsk: ['Check {n} foods online? That uses {b} AI requests.', 'Έλεγχος {n} τροφίμων; Θα γίνουν {b} αιτήματα AI.'], chkAsk1: ['Check {n} foods online? That uses 1 AI request.', 'Έλεγχος {n} τροφίμων; Θα γίνει 1 αίτημα AI.'], chkGo: ['Check', 'Έλεγχος'],
  chkAllDone: ['All your foods are already checked ✓', 'Όλα τα τρόφιμά σου έχουν ελεγχθεί ✓'], chkRunning: ['✨ Checking {a}–{b} of {n}…', '✨ Έλεγχος {a}–{b} από {n}…'],
  chkErr: ['Stopped: {e}', 'Σταμάτησε: {e}'], chkOk: ['look right', 'σωστά'], chkOff: ['to review', 'για έλεγχο'], chkNf: ['not found online', 'δεν βρέθηκαν'],
  chkSrc: ['Source', 'Πηγή'], chkAccept: ['Accept', 'Αποδοχή'], chkKeep: ['Keep Mine', 'Κράτα τα δικά μου'], chkNothing: ['<b>Nothing to fix</b>Everything that was found online matches.', '<b>Τίποτα για διόρθωση</b>Ό,τι βρέθηκε συμφωνεί.'],
  inFridgeTag: ['in the fridge', 'στο ψυγείο'],
  chkTick: ['Checked against online sources', 'Ελέγχθηκε με πηγές στο διαδίκτυο'],
  // ==== branch: gym (new Gym Buddy text goes on the lines below) ====
  // ==== end gym ====
  // ==== branch: log (new Today & Logging text goes on the lines below) ====
  logQT: ['Quick Log', 'Quick Log'],
  logQPh: ['What did you eat?', 'Τι έφαγες;'],
  logQHi: ['Type everything you ate, with amounts if you know them. The AI splits it into foods, then each one is found: your foods first, then the built-in list, then online.', 'Γράψε ό,τι έφαγες, με ποσότητες αν τις ξέρεις. Το AI το χωρίζει σε τρόφιμα και μετά βρίσκεται το καθένα: πρώτα τα δικά σου, μετά η βασική λίστα, μετά online.'],
  logQEx: ['e.g. 200g Fage yogurt, 4 scrambled eggs, 100g chicken breast, 210g Domino\'s margarita', 'π.χ. 200g γιαούρτι Fage, 4 αυγά ομελέτα, 100g στήθος κοτόπουλο, 210g μαργαρίτα Domino\'s'],
  logQNoKey: ['No Gemini key, so it gets split at commas and “and”. A free key in Settings splits it much better.', 'Χωρίς κλειδί Gemini χωρίζεται στα κόμματα και στο «και». Με δωρεάν κλειδί στις Ρυθμίσεις χωρίζεται πολύ καλύτερα.'],
  logQWork: ['Splitting it up…', 'Το χωρίζω…'], logQFind: ['Finding…', 'Ψάχνω…'],
  logQAll: ['Log All', 'Καταγραφή όλων'], logQTotal: ['Total', 'Σύνολο'],
  logQLogged: ['Logged {n} foods · {k} kcal', 'Καταγράφηκαν {n} τρόφιμα · {k} kcal'], logQDone: ['Logged', 'Καταγράφηκε'],
  logQNew: ['{n} new estimated foods saved', '{n} νέα τρόφιμα με εκτίμηση αποθηκεύτηκαν'],
  logQStd: ['built-in', 'βασικό'], logQOnl: ['online', 'online'], logQEst: ['estimate', 'εκτίμηση'],
  logQNone: ['Not found · tap to pick a food', 'Δεν βρέθηκε · πάτα για να διαλέξεις'],
  logQSwap: ['Swap Food', 'Αλλαγή τροφίμου'], logQSwapPh: ['Search foods', 'Αναζήτηση τροφίμων'], logQRm: ['Remove', 'Αφαίρεση'],
  logQNoMatch: ['Nothing matches “{q}”', 'Τίποτα για «{q}»'],
  logQFail: ['Couldn’t split that. Put commas between the foods and try again.', 'Δεν χωρίστηκε. Βάλε κόμματα ανάμεσα στα τρόφιμα και ξαναδοκίμασε.'],
  logQAIFail: ['The AI didn’t answer ({e}), so it was split at commas instead.', 'Το AI δεν απάντησε ({e}), οπότε χωρίστηκε στα κόμματα.'],
  logQNothing: ['Nothing to log yet', 'Δεν υπάρχει κάτι για καταγραφή'],
  logQOpen: ['Quick Log “{q}”', 'Quick Log «{q}»'], logQOpenSub: ['The AI splits it and finds each food', 'Το AI το χωρίζει και βρίσκει κάθε τρόφιμο'],
  logQSend: ['Send', 'Αποστολή'],
  // ==== end log ====
  // ==== branch: foods (new My Foods & Search text goes on the lines below) ====
  // ==== end foods ====
  // ==== branch: shop (new Fridge & Groceries text goes on the lines below) ====
  // ==== end shop ====
  // ==== branch: shell (new App Shell & Settings text goes on the lines below) ====
  // ==== end shell ====
});
