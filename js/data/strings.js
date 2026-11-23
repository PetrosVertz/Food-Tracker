// All app text in English + Greek (S table, t() reads it).
// Food Tracker · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.

// ======================= text in both languages =======================
const S = {
 tFridge:['Inventory','Απόθεμα'],
 tGroc:['Groceries','Ψώνια'], soon:['soon','σύντομα'],
 nFoods:['{n} foods','{n} τρόφιμα'], nFood:['1 food','1 τρόφιμο'], nMeals:['{n} meals','{n} φαγητά'], nMeal:['1 meal','1 φαγητό'],
 tabStore:['Store-Bought','Από το μαγαζί'], tabMeals:['Recipes','Συνταγές'],
 searchFoods:['Search food, brand or category…','Αναζήτηση τροφίμου, μάρκας ή κατηγορίας…'], searchMeals:['Search your meals…','Αναζήτηση φαγητών…'],
 addFood:['Add food','Προσθήκη τροφίμου'], addSub:['Barcode is fastest. If the product isn’t found, snap the label.','Το barcode είναι το πιο γρήγορο. Αν δεν βρεθεί, φωτογράφισε την ετικέτα.'],
 optScan:['Scan barcode<small>Live camera, looks it up on Open Food Facts</small>','Σάρωση barcode<small>Ζωντανή κάμερα, αναζήτηση στο Open Food Facts</small>'],
 optManual:['Type it in<small>Copy the numbers off the label</small>','Πληκτρολόγηση<small>Αντέγραψε τους αριθμούς από την ετικέτα</small>'],
 cancel:['Cancel','Άκυρο'], close:['Close','Κλείσιμο'], back:['Back','Πίσω'], save:['Save','Αποθήκευση'], skip:['Skip','Παράλειψη'], add:['Add','Προσθήκη'],
 delete:['Delete','Διαγραφή'], duplicate:['Duplicate','Αντίγραφο'], edit:['Edit','Επεξεργασία'],
 scanTitle:['Scan barcode','Σάρωση barcode'], scanSub:['Hold the phone 15–20 cm away with the barcode inside the box.','Κράτα το κινητό 15–20 εκ. μακριά, με το barcode μέσα στο πλαίσιο.'],
 light:['Light','Φως'],
 lookUp:['Look up','Αναζήτηση'],
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
 needKey:['Add an AI key in Settings › AI first, or type the label in.','Βάλε πρώτα ένα κλειδί AI στις Ρυθμίσεις › AI, ή πληκτρολόγησε την ετικέτα.'],
 readingLabel:['Reading the label…','Διαβάζω την ετικέτα…'], labelFail:['Couldn’t read it: {e}. Try a sharper, straight-on photo, or type it in.','Δεν διαβάστηκε: {e}. Δοκίμασε πιο καθαρή φωτογραφία ή πληκτρολόγησέ το.'],
 newFood:['New food','Νέο τρόφιμο'], editFood:['Edit food','Επεξεργασία τροφίμου'],
 checkLabel:['Check the numbers against the label, then save.','Έλεγξε τους αριθμούς με την ετικέτα και αποθήκευσε.'], changeAny:['Change anything, then save.','Άλλαξε ό,τι θέλεις και αποθήκευσε.'],
 copyOf:['Copy of an existing food: change the flavour or size, then save.','Αντίγραφο τροφίμου: άλλαξε γεύση ή μέγεθος και αποθήκευσε.'],
 foodType:['Food type','Είδος τροφίμου'], brand:['Brand','Μάρκα'], brandPh:['e.g. Μεβγάλ','π.χ. Μεβγάλ'], noBrand:['No brand','Χωρίς μάρκα'],
 product:['Product','Προϊόν'], productPh:['e.g. Greek yogurt 2%','π.χ. Γιαούρτι στραγγιστό 2%'],
 labelFor:['Label values are for the food when it’s…','Οι τιμές της ετικέτας είναι για το τρόφιμο…'],
 uncooked:['Uncooked','Ωμό'], cooked:['Cooked','Μαγειρεμένο'], ready:['Ready to eat','Έτοιμο'],
 stateHint:['Rice, pasta, oats and raw meat labels are almost always uncooked values.','Σε ρύζι, ζυμαρικά, βρώμη και ωμό κρέας, οι τιμές είναι σχεδόν πάντα για ωμό.'],
 measuredIn:['Measured in','Μετριέται σε'], grams:['Grams (g)','Γραμμάρια (g)'], millilitres:['Millilitres (ml)','Χιλιοστόλιτρα (ml)'],
 per100:['Per 100 {u}','Ανά 100 {u}'], protein:['Protein','Πρωτ.'], carbs:['Carbs','Υδατ.'], fat:['Fat','Λιπαρά'],
 sugar:['Sugar','Σάκχαρα'], satFat:['Sat. fat','Κορεσμ.'], salt:['Salt','Αλάτι'],
 packSizes:['Pack sizes you buy','Μεγέθη συσκευασίας που αγοράζεις'],
 packHint:['Add every size you buy (e.g. 1000 and 1500 ml milk). Tap the star on the one you usually get.','Πρόσθεσε κάθε μέγεθος που παίρνεις (π.χ. 1000 και 1500 ml γάλα). Πάτα το αστέρι σε αυτό που παίρνεις συνήθως.'],
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
 
 
 
 sameCode:['This barcode is already saved as “{n}”. Save another one anyway?','Αυτό το barcode υπάρχει ήδη ως «{n}». Αποθήκευση ξανά;'],
 sameName:['You already have “{n}”. Save a second one anyway?','Έχεις ήδη «{n}». Αποθήκευση δεύτερου;'],
 saved:['Saved {i}','Αποθηκεύτηκε {i}'], updated:['Updated','Ενημερώθηκε'], deleted:['Deleted {n}','Διαγράφηκε: {n}'], undo:['Undo','Αναίρεση'],
 noFoods:['<b>No foods yet</b>Tap Scan Food and scan your first barcode, or Add Food to type one in.','<b>Δεν έχεις τρόφιμα ακόμα</b>Πάτα «Προσθήκη» και σκάναρε το πρώτο barcode.'],
 nothingMatches:['Nothing matches “{q}”.','Τίποτα για «{q}».'], nothingHere:['Nothing here.','Τίποτα εδώ.'],
 all:['All','Όλα'], noType:['No Type','Χωρίς είδος'], sortRecent:['Sort: <b>Recent</b>','Ταξινόμηση: <b>Πρόσφατα</b>'], sortAZ:['Sort: <b>A–Z</b>','Ταξινόμηση: <b>Α–Ω</b>'],
 // cook
 cookMeal:['Cook a Meal','Μαγείρεψε'], editMeal:['Edit meal','Επεξεργασία φαγητού'], cookAgainT:['Cook Again','Ξανά μαγείρεμα'],
 mealNamePh:['e.g. Bolognese, chicken in the pan','π.χ. Μπολονέζ, κοτόπουλο στο τηγάνι'],
 suggestRecipe:['Suggest a Recipe','Πρότεινε συνταγή'], suggestHint:['Optional. Gets a full recipe with steps and fills in the ingredients.','Προαιρετικό. Φέρνει συνταγή με βήματα και συμπληρώνει τα υλικά.'],
 suggestNeedName:['Type what you’re making first','Γράψε πρώτα τι μαγειρεύεις'], thinking:['Writing a recipe…','Γράφω συνταγή…'],
 recipeFail:['Couldn’t get a recipe: {e}','Δεν βγήκε συνταγή: {e}'],
 ingredients:['Ingredients','Υλικά'], ingHint:['Weigh each one as it goes into the pot: raw meat, dry pasta and rice.','Ζύγισε κάθε υλικό όπως μπαίνει στην κατσαρόλα: ωμό κρέας, ξερά ζυμαρικά και ρύζι.'],
 addIngredient:['Add Ingredient','Προσθήκη υλικού'], chooseFood:['Choose food…','Διάλεξε τρόφιμο…'], from:['from {s}','από {s}'],
 rawTotal:['Raw total','Σύνολο ωμών'], finishedWeight:['Weigh the finished food','Ζύγισε το έτοιμο φαγητό'],
 finishedHint:['Cooking changes the weight (water boils off, pasta soaks it up), so this is what makes the numbers right.','Το μαγείρεμα αλλάζει το βάρος (εξατμίζεται νερό, τα ζυμαρικά το απορροφούν), γι’ αυτό αυτό κάνει τους αριθμούς σωστούς.'],
 potFull:['Pot + food (g)','Κατσαρόλα + φαγητό (g)'], potEmpty:['Empty pot (g)','Άδεια κατσαρόλα (g)'],
 resultPer100:['<b>Per 100 g cooked: {k} kcal</b> · P {p} · C {c} · F {f}','<b>Ανά 100 g μαγειρεμένο: {k} kcal</b> · P {p} · C {c} · F {f}'],
 noWeightYet:['Weigh the finished food for exact numbers. If you skip it, the raw total ({s}) is used, which can be off by a lot.','Ζύγισε το έτοιμο φαγητό για ακριβείς αριθμούς. Αν το παραλείψεις, χρησιμοποιείται το σύνολο των ωμών ({s}), που μπορεί να απέχει πολύ.'],
 foodWeight:['Finished food: {s}','Έτοιμο φαγητό: {s}'],
 saveMeal:['Save meal','Αποθήκευση'], needMealName:['Give the meal a name','Δώσε όνομα στο φαγητό'], needIng:['Add at least one ingredient','Πρόσθεσε τουλάχιστον ένα υλικό'],
 unsetIng:['Choose a food for every ingredient (orange ones)','Διάλεξε τρόφιμο για κάθε υλικό (τα πορτοκαλί)'], needGrams:['Some ingredients have no amount','Κάποια υλικά δεν έχουν ποσότητα'],
 potNegative:['The empty pot weighs more than the full one, check the numbers','Η άδεια κατσαρόλα ζυγίζει περισσότερο από τη γεμάτη, έλεγξε τους αριθμούς'],
 mealSaved:['Saved {n}','Αποθηκεύτηκε: {n}'], deleteMeal:['Delete “{n}”?','Διαγραφή «{n}»;'],
 noMeals:['<b>No meals yet</b>Pick one of the options above the next time you cook.','<b>Δεν έχεις φαγητά ακόμα</b>Διάλεξε μία από τις επιλογές πάνω την επόμενη φορά που μαγειρεύεις.'],
 recipeBadge:['recipe','συνταγή'], per100cooked:['per 100 g cooked','ανά 100 g μαγειρεμένο'],
 chooseIngredient:['Choose ingredient','Διάλεξε υλικό'], ingSearchPh:['Type a food, e.g. minced beef','Γράψε τρόφιμο, π.χ. κιμάς'],
 grpMine:['My foods','Τα τρόφιμά μου'], grpStd:['Standard foods','Βασικά τρόφιμα'], grpOnline:['Online · Open Food Facts','Online · Open Food Facts'],
 searching:['Searching online…','Αναζήτηση online…'], searchOnline:['Search Online for “{q}”','Αναζήτηση online για «{q}»'],
 onlineNone:['Nothing found online either. Add it as a new food from My foods.','Δεν βρέθηκε ούτε online. Πρόσθεσέ το ως νέο τρόφιμο από τα Τρόφιμά μου.'],
 onlineFail:['Online search failed (no internet?)','Η online αναζήτηση απέτυχε (χωρίς ίντερνετ;)'], typeToSearch:['Start typing to search.','Ξεκίνα να γράφεις για αναζήτηση.'],
 alsoSave:['Also save it to My foods for next time','Αποθήκευση και στα Τρόφιμά μου για την επόμενη φορά'], stdValues:['standard values','βασικές τιμές'],
 recipeIdea:['Recipe idea','Πρόταση συνταγής'], recipeIdeaSub:['Use it and it’s saved with this meal, with the ingredients filled in. Say no and the meal just keeps its ingredients.','Αν τη χρησιμοποιήσεις αποθηκεύεται με το φαγητό και συμπληρώνονται τα υλικά. Αλλιώς το φαγητό κρατάει μόνο τα υλικά του.'],
 noThanks:['No thanks','Όχι, ευχαριστώ'], useRecipe:['Use this recipe','Χρήση συνταγής'],
 serves:['Serves {n}','Μερίδες: {n}'], minutes:['{n} min','{n} λεπτά'], steps:['Steps','Βήματα'], recipeT:['Recipe','Συνταγή'],
 noRecipe:['No recipe saved for this meal.','Δεν υπάρχει αποθηκευμένη συνταγή.'],
 onMyPlate:['On my plate','Στο πιάτο μου'], cookAgain:['Cook Again','Ξανά μαγείρεμα'],
 mealMeta:['Cooked {d} · batch {s}','Μαγειρεύτηκε {d} · σύνολο {s}'], estimated:['≈ not weighed','≈ χωρίς ζύγισμα'],
 timesCooked:['cooked {n}×','μαγειρεύτηκε {n}×'],
 // settings
 settings:['Settings','Ρυθμίσεις'], language:['Language','Γλώσσα'],
 geminiKeyPh:['Paste your key here','Επικόλλησε το κλειδί εδώ'],
 getKey:['Get API Key','Πάρε κλειδί API'],
 getKeyHint:['Opens Google AI Studio. Sign in, tap “Create API key”, copy it and paste it above. Free, with a daily limit. It stays on this phone only.','Ανοίγει το Google AI Studio. Σύνδεση, «Create API key», αντιγραφή και επικόλληση από πάνω. Δωρεάν, με ημερήσιο όριο. Μένει μόνο σε αυτό το κινητό.'],
 geminiModel:['Gemini model','Μοντέλο Gemini'], saveSettings:['Save settings','Αποθήκευση ρυθμίσεων'], settingsSaved:['Settings saved','Οι ρυθμίσεις αποθηκεύτηκαν'],
 yourDataSub:['Copy for Claude, or move everything between phone and PC.','Αντιγραφή για το Claude, ή μεταφορά όλων μεταξύ κινητού και υπολογιστή.'],
 copyClaude:['Copy for Claude','Αντιγραφή για Claude'], download:['Download backup','Λήψη αντιγράφου'], import:['Import backup','Εισαγωγή αντιγράφου'],
 copied:['Copied, paste it to Claude','Αντιγράφηκε, επικόλλησέ το στο Claude'], nothingCopy:['Nothing to copy yet','Τίποτα για αντιγραφή ακόμα'],
 imported:['Imported: {a} new, {u} updated','Εισαγωγή: {a} νέα, {u} ενημερωμένα'], badBackup:['That file isn’t a Tracker backup','Αυτό δεν είναι αντίγραφο του Tracker'],
 saveFail:['Could not save on this device','Δεν έγινε αποθήκευση στη συσκευή'], lightNA:['Light not available','Δεν υπάρχει φως'],
 // v1.4
 cancelled:['Cancelled','Ακυρώθηκε'], timedOut:['took too long','άργησε πολύ'],
 allBusy:['Every Gemini model is busy or out of free uses right now ({e}). Try again later, or use “Add my own recipe”.','Όλα τα μοντέλα Gemini είναι απασχολημένα ή τελείωσαν οι δωρεάν χρήσεις ({e}). Δοκίμασε αργότερα ή χρησιμοποίησε «Δική μου συνταγή».'],
 keyBad:['The AI key was not accepted ({e}). Check it in Settings › AI.','Το κλειδί AI δεν έγινε δεκτό ({e}). Έλεγξέ το στις Ρυθμίσεις › AI.'],
 ownRecipe:['Add My Own Recipe','Δική μου συνταγή'], ownRecipeT:['Add my own recipe','Δική μου συνταγή'],
 ownRecipeSub:['Type it or paste it from anywhere (Claude, ChatGPT, a website). Amounts like “500 g mince” or “2 tbsp olive oil” are read automatically, no AI needed.','Γράψε ή επικόλλησέ τη από οπουδήποτε (Claude, ChatGPT, κάποιο site). Ποσότητες όπως «500 γρ. κιμάς» ή «2 κ.σ. ελαιόλαδο» διαβάζονται αυτόματα, χωρίς AI.'],
 ownPh:['Chicken in the pan\n\nIngredients\n600 g chicken breast\n1 onion\n2 tbsp olive oil\n\nSteps\n1. Cut the chicken into strips…','Κοτόπουλο στο τηγάνι\n\nΥλικά\n600 γρ. κοτόπουλο στήθος\n1 κρεμμύδι\n2 κ.σ. ελαιόλαδο\n\nΕκτέλεση\n1. Κόψε το κοτόπουλο σε λωρίδες…'],
 readRecipe:['Read recipe','Ανάγνωση συνταγής'], foundIng:['{n} ingredients','{n} υλικά'], foundSteps:['{n} steps','{n} βήματα'],
 noAmount:['no amount, add it after','χωρίς ποσότητα, βάλ’ τη μετά'], willPick:['you’ll pick the food','θα διαλέξεις τρόφιμο'],
 nothingFound:['Couldn’t find any ingredients or steps. Put each ingredient on its own line.','Δεν βρέθηκαν υλικά ή βήματα. Βάλε κάθε υλικό σε δική του γραμμή.'],
 ownTag:['your recipe','δική σου συνταγή'],
 // supplements
 tSupps:['My supplements','Τα συμπληρώματά μου'], nSupps:['{n} supplements','{n} συμπληρώματα'], nSupp:['1 supplement','1 συμπλήρωμα'],
 addSuppFab:['Add Supplement','Προσθήκη'], addSupp:['Add Supplement','Νέο συμπλήρωμα'], editSupp:['Edit Supplement','Επεξεργασία'],
 supQuickSub:['Pick a common one or type your own below.','Διάλεξε ένα συνηθισμένο ή γράψε το δικό σου από κάτω.'],
 supName:['Name','Όνομα'], supNamePh:['e.g. Magnesium bisglycinate','π.χ. Μαγνήσιο δισγλυκινικό'],
 supDose:['Dose each time','Δόση κάθε φορά'], supDoseHint:['Use the dose on your label or what your doctor told you.','Βάλε τη δόση της ετικέτας ή αυτή που σου είπε ο γιατρός.'],
 supWhen:['When do you take it?','Πότε το παίρνεις;'], supOften:['How often','Πόσο συχνά'],
 oftenDaily:['Every day','Κάθε μέρα'], oftenTraining:['Training days','Μέρες προπόνησης'], oftenNeeded:['When needed','Όταν χρειάζεται'],
 supLink:['Linked food (for macros)','Σύνδεση με τρόφιμο (για μακρο)'], supLinkNone:['— None —','— Κανένα —'],
 supLinkHint:['Link whey or anything with calories so its macros count later.','Σύνδεσε την πρωτεΐνη ή ό,τι έχει θερμίδες, για να μετράνε τα μακρο αργότερα.'],
 supNotesPh:['e.g. take with food','π.χ. με φαγητό'],
 supUsualTime:['Usual Time (optional)','Συνηθισμένη Ώρα (προαιρετικό)'], supUsualTimeHint:['The list is ordered by this time through the day.','Η λίστα ταξινομείται με αυτή την ώρα μέσα στη μέρα.'],
 supNeedName:['Give it a name','Δώσε όνομα'], supNeedDose:['Add the dose','Βάλε τη δόση'],
 todayLabel:['Today','Σήμερα'], todayTaken:['{a} of {b} taken','{a} από {b}'],
 noSupps:['<b>No supplements yet</b>Tap “Add supplement” to list what you take.','<b>Δεν έχεις συμπληρώματα ακόμα</b>Πάτα «Προσθήκη» για να βάλεις ό,τι παίρνεις.'],
 slot_morning:['Morning','Πρωί'], slot_breakfast:['With breakfast','Με το πρωινό'], slot_pre:['Pre-workout','Πριν την προπόνηση'], slot_post:['Post-workout','Μετά την προπόνηση'],
 slot_lunch:['With lunch','Με το μεσημεριανό'], slot_dinner:['With dinner','Με το βραδινό'], slot_bed:['Before bed','Πριν τον ύπνο'], slot_any:['Any time','Οποτεδήποτε'],
 // ---- v1.5 ----
 tToday:['My Food Log','Ημερολόγιο Φαγητού'], remaining:['{n} kcal left','απομένουν {n} kcal'], over:['{n} kcal over','{n} kcal πάνω'],
 gymDay:['Gym Day','Μέρα Γυμναστηρίου'], restDay:['Rest Day','Μέρα Ξεκούρασης'],
 wLegs:['Legs','Πόδια'], wUpper:['Upper','Πάνω σώμα'], wFull:['Full body','Όλο το σώμα'], wCardio:['Cardio','Αερόβια'], workoutAt:['Workout at','Ώρα προπόνησης'],
 carbTiming:['Carb timing','Κατανομή υδατανθράκων'], eaten:['Eaten','Έφαγα'], copyYesterday:['Same as Yesterday','Όπως χθες'],
 logFab:['Log Food','Καταγραφή'], logFood:['Log food','Καταγραφή φαγητού'], logSearchPh:['Search foods and meals…','Αναζήτηση τροφίμων και φαγητών…'],
 recent:['Recent','Πρόσφατα'], leftovers:['leftovers','περισσεύματα'],
 nothingLogged:['<b>Nothing logged yet</b>Tap Log Food after you eat. Search, then the plus button logs your usual amount in one tap.','<b>Δεν έχεις καταγράψει τίποτα</b>Πάτα Καταγραφή αφού φας. Ψάξε και το κουμπί συν καταγράφει τη συνηθισμένη ποσότητα με ένα πάτημα.'],
 ateAt:['Eaten at','Ώρα'], alsoLog:['Also Add to My Food Log','Πρόσθεσέ το και στο Ημερολόγιο Φαγητού'], takeFromFridge:['Take it out of the fridge ({s} there)','Βγάλ’ το από το ψυγείο (υπάρχουν {s})'],
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
 goal:['Goal','Στόχος'], gBulk:['Bulk','Όγκος'], gRecomp:['Recomp','Ανασύνθεση'], gCut:['Cut','Γράμμωση'], bodyweight:['Body Weight','Βάρος'],
 calcStart:['Calculate','Υπολογισμός'],
 gymDayTargets:['Gym Day','Μέρα Γυμναστηρίου'], restDayTargets:['Rest Day','Μέρα Ξεκούρασης'],
 tgMismatch:['{d}: macros add up to {n} kcal, not {k}.','{d}: τα μακρο βγάζουν {n} kcal, όχι {k}.'], tgOk:['Macros and calories match.','Τα μακρο ταιριάζουν με τις θερμίδες.'], targetsSaved:['Targets saved','Οι στόχοι αποθηκεύτηκαν'],
 // plan my day
 planning:['Planning…','Σχεδιάζω…'], planFail:['Couldn’t plan: {e}','Δεν έγινε το πλάνο: {e}'],
 planNeedTargets:['Set your targets first (Targets, at the top).','Βάλε πρώτα τους στόχους σου (Στόχοι, πάνω).'],
 planLogged:['Added {n} foods','Προστέθηκαν {n} τρόφιμα'], planUnmatched:['{n} not found in your foods, not logged','{n} δεν βρέθηκαν στα τρόφιμά σου, δεν καταγράφηκαν'], dropPlan:['Clear Plan','Διαγραφή πλάνου'],
 // fridge
 locFridge:['Fridge','Ψυγείο'], locFreezer:['Freezer','Κατάψυξη'], locCupboard:['Cupboard','Ντουλάπι'], searchFridge:['Search your inventory…','Αναζήτηση στο απόθεμα…'],
 emptyFridge:['<b>Your fridge is empty</b>Tap Scan Receipt after shopping, or Add Food. Ticked groceries can go straight in too.','<b>Το ψυγείο είναι άδειο</b>Σκάναρε ό,τι αγόρασες ή τσέκαρε από τη λίστα για ψώνια και βάλ’ τα μέσα.'],
 addFridgeHow:['Add to fridge','Προσθήκη στο ψυγείο'],
 howMuch:['How much','Πόσο'], whereKept:['Where','Πού'],
 expAuto:['Estimated for {w}. Change it to the date on the pack for a better warning.','Εκτίμηση για {w}. Βάλε την ημερομηνία της συσκευασίας για πιο σωστή ειδοποίηση.'],
 rebuyBelow:['Add to groceries when below','Στη λίστα για ψώνια όταν πέσει κάτω από'], autoGrocery:['Add to groceries automatically when it runs out','Αυτόματα στη λίστα όταν τελειώσει'],
 remove:['Remove','Αφαίρεση'], addedFridge:['In the {l}','Στο {l}'], removedItem:['Removed {n}','Αφαιρέθηκε: {n}'],
 left:['{a} left','απομένουν {a}'],
 useT:['Use {n}','Χρήση: {n}'], useSub:['How much did you use?','Πόσο χρησιμοποίησες;'], finishedIt:['Finished it','Τελείωσε'],
 usedToast:['Used {a} of {n}','Χρησιμοποιήθηκαν {a} από {n}'], finishedToast:['{n} is finished','Τελείωσε: {n}'], toList:['→ added to groceries','→ μπήκε στη λίστα'],
 alertSupps:['{n} supplements left for today','Απομένουν {n} συμπληρώματα για σήμερα'],
 fridgeSubOk:['{n} items','{n} προϊόντα'], fridgeSubEmpty:['Empty','Άδειο'],
 grocSub:['{n} to buy','{n} για αγορά'], grocSubEmpty:['Nothing to buy','Τίποτα για ψώνια'],
 // cooking + fridge
 uses:['uses {list}','με {list}'],
 takeIng:['Take the ingredients out of the fridge ({n} found)','Βγάλε τα υλικά από το ψυγείο (βρέθηκαν {n})'], leftoversIn:['Put the Leftovers in the Fridge','Βάλε τα περισσεύματα στο ψυγείο'],
 tookOut:['Took {n} ingredients out of the fridge','Βγήκαν {n} υλικά από το ψυγείο'],
 // groceries
 gAddPh:['Add item, e.g. milk','Πρόσθεσε, π.χ. γάλα'], share:['Share','Κοινοποίηση'],
 autoTag:['ran out','τελείωσε'], lowTag:['running low','λίγο απόμεινε'], bought:['Bought ({n})','Αγοράστηκαν ({n})'],
 clearBought:['Clear','Καθαρισμός'],
 listCopied:['List copied','Η λίστα αντιγράφηκε'], nothingToSend:['Nothing to send','Τίποτα για αποστολή'], addAsText:['Add “{q}”','Προσθήκη «{q}»'],
 // key guide
 testKey:['Test Key','Έλεγχος κλειδιού'], keyTesting:['Checking…','Έλεγχος…'], keyOk:['Key works: {n} models available.','Το κλειδί δουλεύει: {n} διαθέσιμα μοντέλα.'],
 keyFail:['That key didn’t work: {e}','Το κλειδί δεν δούλεψε: {e}'], keyEmpty:['Paste a key first','Επικόλλησε πρώτα ένα κλειδί'],
 keyGuideT:['How to get a free key (2 minutes)','Πώς παίρνεις δωρεάν κλειδί (2 λεπτά)'],
 keyNoNeed:['No key? Everything still works except label photos, recipe ideas and Plan my day.','Χωρίς κλειδί; Όλα δουλεύουν εκτός από φωτογραφίες ετικέτας, προτάσεις συνταγών και Σχεδίασε τη μέρα μου.'],
 u_mg:['mg','mg'], u_g:['g','g'], u_mcg:['mcg','mcg'], u_IU:['IU','IU'], u_ml:['ml','ml'],
};

// =====================================================================
// v1.6 — GYM · LIVE WORKOUTS · PROGRESS
// =====================================================================
Object.assign(S, {
 tGym:['Gym','Γυμναστήριο'],
 finish:['Finish','Τέλος'], addExercise:['Add exercise','Προσθήκη άσκησης'],
 exAlso:['Also Called {n}','Αλλιώς {n}'],
 swapSub:['Same muscles, closest match first','Ίδιοι μύες, πιο κοντινό πρώτο'], swapT:['Swap {n}','Αλλαγή: {n}'], taken:['Taken','Πιασμένο'], swapped:['Swapped to {n}','Άλλαξε σε {n}'],
 workoutType:['Type (sets up My Food Log)','Τύπος (ρυθμίζει το Ημερολόγιο Φαγητού)'], exercises:['Exercises','Ασκήσεις'],
 newWorkout:['New workout','Νέα προπόνηση'], editWorkout:['Edit workout','Επεξεργασία προπόνησης'], emptyWorkout:['Empty workout','Κενή προπόνηση'],
 postMeal:['Plan my post-workout meal','Γεύμα μετά την προπόνηση'], done:['Done','Τέλος'],
 startToday:['Start {n}','Έναρξη: {n}'], startAny:['Start a Workout','Έναρξη προπόνησης'], resume:['Resume Workout · {m} min','Συνέχεια προπόνησης · {m}′'],
 restDone:['Rest is over','Τέλος ξεκούρασης'],
 setLbl:['Set','Σετ'], repsLbl:['reps','επαν.'], kgLbl:['kg','kg'], minLbl:['min','λεπτά'], kmLbl:['km','km'],
 warmupS:['Warm-up: {s}','Ζέσταμα: {s}'], addWarm:['Add','Προσθήκη'],
 needSetVals:['Type the weight and reps','Γράψε βάρος και επαναλήψεις'],
 suppsNow:['Supplements today:','Συμπληρώματα σήμερα:'],
 smTitle:['Workout Done','Η προπόνηση τελείωσε'], smDur:['minutes','λεπτά'], smVol:['kg volume','kg όγκος'], smSets:['sets','σετ'], smKcal:['kcal burned (est.)','kcal (εκτίμηση)'],
 smPRs:['Records','Ρεκόρ'], smNoPR:['No new records this time. Consistency beats records.','Χωρίς νέα ρεκόρ αυτή τη φορά. Η συνέπεια μετράει περισσότερο.'],
 smFood:['Your post-workout window is open until {t}: ~{c} g carbs + 30–40 g protein.','Το παράθυρο μετά την προπόνηση είναι ανοιχτό ως τις {t}: ~{c} g υδατ. + 30–40 g πρωτεΐνη.'],
 noSets:['Log at least one set first','Κατέγραψε πρώτα τουλάχιστον ένα σετ'],
 restDayL:['Rest','Ξεκούραση'],
 planSaved:['Week saved','Η εβδομάδα αποθηκεύτηκε'], nEx:['{n} exercises','{n} ασκήσεις'], lastDone:['last {d}','τελευταία {d}'],
 progNone:['<b>No workouts yet</b>Finish your first workout and your progress shows up here.','<b>Δεν υπάρχουν προπονήσεις</b>Ολοκλήρωσε την πρώτη σου και η πρόοδος θα εμφανιστεί εδώ.'],
 best:['best e1RM','καλύτερο e1RM'],
 breakT:['{n} days since your last workout','{n} μέρες από την τελευταία προπόνηση'],
 breakTxt:['Start at about {p}% of your old weights and add ~5% each session. You’ll be back to normal in about {s} sessions, with a lot less injury risk and soreness.','Ξεκίνα περίπου στο {p}% των παλιών κιλών και πρόσθετε ~5% κάθε φορά. Σε περίπου {s} προπονήσεις θα είσαι εκεί που ήσουν, με πολύ λιγότερο κίνδυνο τραυματισμού και πιάσιμο.'],
 cbActive:['Comeback: session {k}, aim for {p}% of your old weights','Επιστροφή: προπόνηση {k}, στόχος {p}% των παλιών κιλών'],
 lastTrained:['Coming back after a break? When did you last train?','Επιστρέφεις μετά από διάλειμμα; Πότε προπονήθηκες τελευταία;'],
 later:['Later','Αργότερα'],
});

// =====================================================================
// v1.7 — RECOVERY MAP · SORENESS · FRIDGE AUTO-ADD · STOCK BADGES
// =====================================================================
Object.assign(S, {
 nSets:['{n} sets','{n} σετ'],
 noExYet:['Tap Add Exercise to pick your first one.','Πάτα «Προσθήκη άσκησης» για να ξεκινήσεις.'],
 prW:['Weight record! {n} {w} kg × {r}','Ρεκόρ κιλών! {n} {w} kg × {r}'], prV:['Volume record! {n}: {v} kg moved','Ρεκόρ όγκου! {n}: {v} kg συνολικά'],
 prWLine:['Weight record','Ρεκόρ κιλών'], prVLine:['Volume record','Ρεκόρ όγκου'], prWas:['was {v}','ήταν {v}'],
 upper:['Upper','Πάνω σώμα'], lower:['Lower','Κάτω σώμα'],
 allMuscles:['All Muscles','Όλοι οι Μύες'], front:['Front','Μπροστά'], backSide:['Back','Πίσω'],
 musclesWorked:['Muscles worked','Μύες που δουλεύουν'], pctNote:['Rough estimates of how much each muscle does the work, not lab measurements.','Χοντρικές εκτιμήσεις του πόσο δουλεύει κάθε μυς, όχι μετρήσεις εργαστηρίου.'],
 howTo:['How to do it','Πώς γίνεται'], mistakesT:['Common mistakes','Συνηθισμένα λάθη'], bestW:['Heaviest','Πιο βαρύ'], bestV:['Best volume','Καλύτερος όγκος'], addThis:['Add exercise','Προσθήκη'],
 whatNext:['What Next?','Τι μετά;'], nxT:['What next?','Τι μετά;'], nxSub:['Muscles you haven’t hit yet, based on this session and your week.','Μύες που δεν έχεις δουλέψει ακόμα, με βάση αυτή την προπόνηση και την εβδομάδα.'],
 nxWhy:['{a} sets today · {b} this week','{a} σετ σήμερα · {b} αυτή την εβδομάδα'], nxNone:['You’ve covered everything for this workout. Nice.','Τα κάλυψες όλα για αυτή την προπόνηση. Ωραία.'],
 nxAI:['Ask for a smarter pick','Ζήτα καλύτερη επιλογή'], nxNoKey:['Add an AI key in Settings › AI for smarter AI picks.','Βάλε κλειδί AI στις Ρυθμίσεις › AI για πιο έξυπνες προτάσεις AI.'],
 recReady:['Ready','Έτοιμο'], recMid:['Recovering','Αναρρώνει'], recLow:['Needs Rest','Θέλει ξεκούραση'],
 recIn:['ready in ~{h} h','έτοιμο σε ~{h} ώρες'],
 recRestDay:['Rest day: {m} still recovering. Good call resting.','Μέρα ξεκούρασης: {m} ακόμα αναρρώνουν. Καλά κάνεις και ξεκουράζεσαι.'],
 notInFridge:['Not in fridge','Όχι στο ψυγείο'],
});

// =====================================================================
// 0.5.3 — FOOD TRACKY · TODAY · GYM BUDDY
// =====================================================================
Object.assign(S, {
 tabToday:['My Food Log','Ημερολόγιο Φαγητού'], tabGym:['Gym Buddy','Gym Buddy'],
 fibre:['Fibre','Φυτ. ίνες'], electrolytes:['Electrolytes','Ηλεκτρολύτες'], sodium:['Sodium','Νάτριο'], potassium:['Potassium','Κάλιο'],
 elecHigh:['high','υψηλό'], fibTarget:['Fibre target (g/day)','Στόχος φυτικών ινών (g/μέρα)'], potMg:['Potassium (mg)','Κάλιο (mg)'],
 raw:['Raw','Ωμό'], cookedS:['Cooked','Μαγειρ.'], tapChangeV:['tap to change','πάτα για αλλαγή'],
 cookHow:['How do you want to cook it?','Πώς θες να το φτιάξεις;'], cookSuggestSub:['Tell it what you fancy; it fits what’s left of your day.','Πες τι σου κάνει όρεξη· ταιριάζει με ό,τι σου μένει για σήμερα.'],
 cookOwnSub:['Add the ingredients yourself, raw or cooked.','Πρόσθεσε μόνος σου τα υλικά, ωμά ή μαγειρεμένα.'],
 pasteRecipe:['Paste a Recipe Instead','Επικόλληση συνταγής'],
 sgT:['What are you in the mood for?','Τι σου κάνει όρεξη;'],
 sgGo:['Get a Recipe','Φέρε συνταγή'], sgLeft:['Left today: {k} kcal · P {p} · C {c} · F {f}','Σου μένουν σήμερα: {k} kcal · P {p} · C {c} · F {f}'],
 sgNoTargets:['Set your Targets in My Food Log and recipes will fit your remaining macros.','Βάλε Στόχους στο Ημερολόγιο Φαγητού και οι συνταγές θα ταιριάζουν με τα μακρο που σου μένουν.'],
 sgPick:['Pick at least one, or type something','Διάλεξε τουλάχιστον ένα ή γράψε κάτι'],
 hubWeek:['Week planner','Εβδομάδα'], hubWeekSub:['Gym, work and rest days','Γυμναστήριο, δουλειά, ξεκούραση'], hubLib:['Workouts','Προπονήσεις'], hubLibSub:['{n} saved','{n} αποθηκευμένες'], hubLibSub1:['1 saved','1 αποθηκευμένη'],
 hubProg:['Progress','Πρόοδος'], hubProgSub:['Strength over time','Δύναμη στον χρόνο'], hubRec:['Recovery','Αποκατάσταση'],
 work:['Work','Δουλειά'], gym:['Gym','Γυμναστήριο'], addWork:['Add Work','Προσθήκη δουλειάς'], trained:['trained','έγινε'],
 libEmpty:['<b>No workouts yet</b>Build templates for quick workout logging.','<b>Δεν υπάρχουν προπονήσεις</b>Φτιάξε πρότυπα για γρήγορη καταγραφή.'],
 wPush:['Push','Ώθηση'], wPull:['Pull','Έλξη'], wLower:['Lower','Κάτω σώμα'], wChest:['Chest','Στήθος'], wBack:['Back','Πλάτη'], wShoulders:['Shoulders','Ώμοι'], wArms:['Arms','Χέρια'], wCore:['Core','Κορμός'], wGlutes:['Glutes','Γλουτοί'],

});

// ======================= 0.5.4 =======================
Object.assign(S, {
  ok_:['OK','OK'], tabFood:['Food Library','Βιβλιοθήκη Τροφίμων'], fridgeFab:['Add Shopping','Πρόσθεσε ψώνια'],
  suWelcome:['Welcome','Καλώς ήρθες'], suWelcomeSub:['A quick setup, only once. You can change everything later.','Γρήγορο στήσιμο, μόνο μία φορά. Όλα αλλάζουν αργότερα.'],
  suNext:['Next','Επόμενο'], suBack:['Back','Πίσω'], suSkip:['Skip','Παράλειψη'], suFinish:['Let\'s go','Πάμε'],
  suAbout:['About you','Για σένα'], suWeight:['Body weight','Βάρος σώματος'], suGoal:['Goal','Στόχος'],
  suWeek:['Your week','Η εβδομάδα σου'], suGymDays:['Which days do you train?','Ποιες μέρες γυμνάζεσαι;'], suGymTime:['Usual gym time','Συνήθης ώρα γυμναστηρίου'],
  suWorkQ:['Do you work?','Δουλεύεις;'], suWorkDays:['Work days','Μέρες δουλειάς'], suFrom:['From','Από'], suTo:['To','Έως'],
  suAi:['AI helper (optional)','Βοηθός AI (προαιρετικό)'], suAiSub:['A free Gemini key unlocks label photos, shopping photos, recipe ideas and Plan my day. Everything else works without it.','Ένα δωρεάν κλειδί Gemini ξεκλειδώνει φωτογραφίες ετικετών και ψωνιών, ιδέες συνταγών και το Πλάνο ημέρας. Όλα τα άλλα δουλεύουν χωρίς αυτό.'],
  suDone:['All set','Έτοιμο'], suDoneSub:['Gym days: {g} kcal · rest days: {r} kcal · protein {p} g. Change them anytime with Targets in My Food Log.','Μέρες γυμναστικής: {g} kcal · ξεκούρασης: {r} kcal · πρωτεΐνη {p} g. Αλλάζουν όποτε θες από τους Στόχους στο Ημερολόγιο Φαγητού.'],
  suNeedW:['Add your weight first','Βάλε πρώτα το βάρος σου'], suAgain:['Run the First Setup Again','Ξανά το αρχικό στήσιμο'],
  remGymNoT:['Gym Today','Γυμναστήριο σήμερα'], remSetT:['Tap to Set a Time','Πάτα για να βάλεις ώρα'], gymAny:['Gym','Γυμναστήριο'], gymAnyOpt:['Gym (any workout)','Γυμναστήριο (οποιαδήποτε)'],
  qaName:['What was it? (optional)','Τι ήταν; (προαιρετικό)'], qaDef:['Quick add','Γρήγορη καταγραφή'], qaTag:['quick add','γρήγορη καταγραφή'],
  usuals:['Your usuals','Τα συνηθισμένα σου'], grpOnline2:['Online','Online'], onlineSearching:['Searching online…','Ψάχνω online…'], onlineMore:['Search online for more','Ψάξε online για περισσότερα'],
  rawTag:['RAW','ΩΜΟ'], suUse:['What will you use the app for?','Για τι θα χρησιμοποιείς την εφαρμογή;'], useBoth:['Food + Gym','Φαγητό + Γυμναστήριο'], useGym:['Mainly Gym','Κυρίως Γυμναστήριο'], useGymOn:['Gym Buddy is now the first tab','Το Gym Buddy είναι πλέον η πρώτη καρτέλα'], useBothOn:['Today\'s Food is the first tab again','Το Σημερινό φαγητό είναι ξανά η πρώτη καρτέλα'], comboT:['Your Combos','Οι συνδυασμοί σου'], comboSave:['Save as combo','Αποθήκευση ως συνδυασμός'], comboPh:['Name, e.g. My breakfast','Όνομα, π.χ. Το πρωινό μου'], comboSub:['{n} foods · {k} kcal','{n} τρόφιμα · {k} kcal'], comboLogged:['Logged {n} · {k} kcal','Καταγράφηκε: {n} · {k} kcal'], comboDel:['Delete Combo','Διαγραφή συνδυασμού'], comboSaved:['Combo saved: {n}','Ο συνδυασμός αποθηκεύτηκε: {n}'], startEmpty:['Start Empty Workout','Κενή προπόνηση'], stToday:['planned today','προγραμματισμένη σήμερα'], stCustom:['Customize','Προσαρμογή'], stBody:['Body and Goals','Σώμα και στόχοι'], stAI:['AI','AI'], stData:['Your Data','Τα δεδομένα σου'], stAbout:['About','Σχετικά'], langName:['English','Ελληνικά'], unitsT:['Units','Μονάδες'], unitsSub:['kg · cm · g','kg · cm · g'], unW:['Body weight','Σωματικό βάρος'], unH:['Height','Ύψος'], unF:['Food','Φαγητό'], unNote:['Everything is saved in metric; only what you see and type changes. Lifting weights stay in kg.','Όλα αποθηκεύονται μετρικά· αλλάζει μόνο ό,τι βλέπεις και γράφεις. Τα βάρη στο γυμναστήριο μένουν σε kg.'], dailyTargets:['Daily Targets','Ημερήσιοι στόχοι'], pgLocked:['Unlocks after {n} workouts · {k} to go','Ξεκλειδώνει μετά από {n} προπονήσεις · απομένουν {k}'], ssMade:['Superset made · drag one out to unlink','Έγινε superset · σύρε ένα έξω για να το χωρίσεις'], readyTag:['READY','ΕΤΟΙΜΟ'], cookedTag:['COOKED','ΜΑΓΕΙΡ.'], fromFridge:['Also comes out of your fridge (you have {s})','Βγαίνει και από το ψυγείο (έχεις {s})'], takeOutT:['Take Out: {n}','Βγάλε: {n}'], takeOutSub:['For cooking, or it went off. Eating gets logged in My Food Log.','Για μαγείρεμα ή αν χάλασε. Ό,τι τρως καταγράφεται στο Ημερολόγιο Φαγητού.'],
  shopT:['Add shopping','Πρόσθεσε ψώνια'], shopSub:['Everything goes into the fridge. Pick the quickest way.','Όλα μπαίνουν στο ψυγείο. Διάλεξε τον πιο γρήγορο τρόπο.'],
  shopScan:['Scan Barcodes','Σάρωση barcode'], shopScanSub:['One by one, exact products','Ένα ένα, ακριβή προϊόντα'], shopSearch:['Search and Add','Αναζήτηση και προσθήκη'], shopSearchSub:['Type a food','Γράψε ένα τρόφιμο'],
  shopAdded:['Added {n} items to the fridge','Μπήκαν {n} προϊόντα στο ψυγείο'], shopNone:['Couldn\'t find any food in the photo.','Δεν βρήκα φαγητά στη φωτογραφία.'], shopFail:['Couldn\'t read it: {e}','Δεν διαβάστηκε: {e}'], shopPick:['tap to pick a food','πάτα για να διαλέξεις'], shopNew:['new','νέο'],
  scanNext:['Scan next','Επόμενο'], needKeyFirst:['This needs an AI key (Settings › AI).','Χρειάζεται κλειδί AI (Ρυθμίσεις › AI).'],
  formBtn:['Form','Τεχνική'], formT:['Correct Form','Σωστή τεχνική'], lwUsual:['Log usual amount','Καταγραφή της συνηθισμένης ποσότητας'], lwHour:['Usually at this time','Συνήθως αυτή την ώρα'], lwResults:['Results','Αποτελέσματα'], lwAmount:['Amount','Ποσότητα'], lwFill:['Fill My Macros','Γέμισε τα μακρο'], lwTitle:['Log Food','Καταγραφή'], themeT:['Theme','Θέμα'], thAppearance:['Appearance','Εμφάνιση'], thDark:['Dark','Σκούρο'], thLight:['Light','Ανοιχτό'], thAuto:['Automatic','Αυτόματο'], thColour:['Colour','Χρώμα'], thPreview:['Preview','Προεπισκόπηση'], thAutoNote:['Follows your iPhone','Ακολουθεί το iPhone σου'], thLightNote:['Light uses a soft grey, not pure white','Το ανοιχτό είναι απαλό γκρι, όχι κάτασπρο'], formPct:['Percentages','Ποσοστά'], formNext:['Not this one ›','Δεν είναι αυτό ›'], formLoading:['Loading the demo…','Φορτώνει η επίδειξη…'],
  formFail:['Couldn\'t load the demo (needs internet).','Δεν φόρτωσε η επίδειξη (θέλει ίντερνετ).'], formCredit:['Photos: free-exercise-db (public domain).','Φωτογραφίες: free-exercise-db (ελεύθερες).'], formNone:['No demo found for this one.','Δεν βρέθηκε επίδειξη γι\' αυτό.'],
  setsL:['Sets','Σετ'], restL:['Rest','Διάλειμμα'], typeChange:['Change','Αλλαγή'], otherWorkout:['Or Pick Another Workout','Ή διάλεξε άλλη προπόνηση'], tapNum:['Tap the set number for warm-up / drop / failure','Πάτα τον αριθμό του σετ για ζέσταμα / drop / αποτυχία'],
  wiT:['Weigh-in','Ζύγισμα'], wiSave:['Save','Αποθήκευση'], wiSaved:['Weight saved','Το βάρος αποθηκεύτηκε'],
  bkNever:['never','ποτέ'], bkDone:['Backup saved','Το αντίγραφο αποθηκεύτηκε'],
  potOther:['Weigh It in the Pot Instead','Ζύγισε με την κατσαρόλα'], cookedW:['Cooked Food Weight (g)','Βάρος μαγειρεμένου φαγητού (g)'],
});

Object.assign(S, {
  tabFridge: ['Kitchen', 'Κουζίνα'], 
  fibUse: ['Use it', 'Χρήση'],
});

Object.assign(S, {
  savedTpls: ['Saved Workouts', 'Αποθηκευμένες προπονήσεις'], savedWorkouts: ['Saved workouts', 'Αποθηκευμένες προπονήσεις'], pastWorkouts: ['Past workouts', 'Προηγούμενες προπονήσεις'],
  noPast: ['Your finished workouts will show up here.', 'Οι προπονήσεις που τελειώνεις θα εμφανίζονται εδώ.'],
  saveTplT: ['Save this workout for later?', 'Αποθήκευση για επόμενη φορά;'], saveTplSub: ['Next time it\'s one tap to start it with the same exercises and sets.', 'Την επόμενη φορά ξεκινάει με ένα πάτημα, με τις ίδιες ασκήσεις και σετ.'],
  workoutName: ['Name', 'Όνομα'], saveTplYes: ['Save', 'Αποθήκευση'], saveTplNo: ['No thanks', 'Όχι, ευχαριστώ'], tplSavedT: ['Saved “{n}” to your workouts', 'Το «{n}» μπήκε στις προπονήσεις σου'],
  blNextT: ['What next?', 'Τι μετά;'], blLooks: ['Today looks like: {d}', 'Σήμερα μοιάζει με: {d}'], blBest: ['Best next', 'Το καλύτερο επόμενο'], blOr: ['Or', 'Ή'],
  blDone: ['You\'ve covered everything for this day. Good time to finish.','Τα κάλυψες όλα για σήμερα. Ώρα να τελειώσεις.'],
  blBuildT: ['Build a Workout','Φτιάξε προπόνηση'], blNeedEx: ['Add an exercise first so I can see what you\'re training. Or let me build a whole workout:', 'Πρόσθεσε πρώτα μια άσκηση για να δω τι δουλεύεις. Ή άσε με να φτιάξω ολόκληρη προπόνηση:'],
  blPick: ['What are you training today?', 'Τι γυμνάζεις σήμερα;'], blOrMuscle: ['Or one muscle group', 'Ή μία μυϊκή ομάδα'], blAccept: ['Accept · Add All','Αποδοχή · πρόσθεσέ τα'],
  blAdded: ['Added {n} exercises', 'Προστέθηκαν {n} ασκήσεις'], blNone: ['Couldn\'t find exercises for that.', 'Δεν βρέθηκαν ασκήσεις γι\' αυτό.'],
});

// ---------- 0.5.9 ----------
Object.assign(S, {
  tipCarbT: ['Carb timing means eating more of your carbs around your workout: some a few hours before for fuel, and more in the two hours after to refill your muscles. Your total for the day matters most; timing is a small extra edge. The sodium and potassium numbers are a rough guide, with a bit more sodium around training because you lose it in sweat.',
    'Κατανομή υδατανθράκων σημαίνει να τρως περισσότερους υδατάνθρακες γύρω από την προπόνηση: λίγους μερικές ώρες πριν για ενέργεια, και περισσότερους τις δύο ώρες μετά για να γεμίσουν ξανά οι μύες. Το σύνολο της μέρας μετράει πιο πολύ· η κατανομή είναι ένα μικρό έξτρα. Τα νούμερα για νάτριο και κάλιο είναι πρόχειρος οδηγός, με λίγο παραπάνω νάτριο γύρω από την προπόνηση γιατί το χάνεις με τον ιδρώτα.'],
  tipElec: ['Sodium and potassium help your muscles work and keep you hydrated. You lose sodium in sweat, so on gym days a bit more is fine. Most people get too little potassium: potatoes, bananas, yoghurt, beans and leafy greens are good sources. Tap the box to switch between % and mg.',
    'Το νάτριο και το κάλιο βοηθούν τους μύες να δουλεύουν και σε κρατούν ενυδατωμένο. Το νάτριο το χάνεις με τον ιδρώτα, οπότε τις μέρες γυμναστηρίου λίγο παραπάνω είναι οκ. Οι περισσότεροι παίρνουν λίγο κάλιο: πατάτες, μπανάνες, γιαούρτι, όσπρια και πράσινα φυλλώδη είναι καλές πηγές. Πάτα το κουτί για αλλαγή ανάμεσα σε % και mg.'],
  tipMacroSl: ['Calories stay fixed. Move one slider and the other two adjust, so protein, carbs and fat always add up to 100% of your calories.',
    'Οι θερμίδες μένουν ίδιες. Κουνάς ένα ρυθμιστικό και τα άλλα δύο προσαρμόζονται, ώστε πρωτεΐνη, υδατάνθρακες και λίπος να κάνουν πάντα το 100% των θερμίδων.'],
  qaSub: ['Type what you ate. It logs a normal plate\'s worth.', 'Γράψε τι έφαγες. Καταγράφεται μια κανονική μερίδα.'],
  qaPh: ['e.g. souvlaki pita, pasta bolognese', 'π.χ. πίτα σουβλάκι, μακαρονάδα με κιμά'],
  qaSmall: ['Small', 'Μικρή'], qaNormal: ['Normal', 'Κανονική'], qaBig: ['Big', 'Μεγάλη'], qaLog: ['Log it', 'Καταγραφή'],
  qaNeedTxt: ['Type what you ate', 'Γράψε τι έφαγες'], qaLogged: ['Logged {n} · {k} kcal', 'Καταγράφηκε {n} · {k} kcal'],
  qaNoKey: ['Not in the built-in foods. Mixed dishes need an AI key (Settings › AI), or search for it instead.', 'Δεν υπάρχει στα έτοιμα τρόφιμα. Τα σύνθετα φαγητά θέλουν κλειδί AI (Ρυθμίσεις › AI), ή κάνε αναζήτηση.'],
  qaThinking: ['Estimating…', 'Υπολογίζω…'], qaFail: ['Couldn\'t estimate it. Try other words, or search for it.', 'Δεν βγήκε εκτίμηση. Δοκίμασε άλλες λέξεις ή κάνε αναζήτηση.'],
  calcFrom: ['Calculate uses your latest weigh-in ({w} kg) and your goal.', 'Ο υπολογισμός χρησιμοποιεί το τελευταίο σου ζύγισμα ({w} kg) και τον στόχο σου.'],
  calcNeedW: ['Add your weight in Gym → Progress first.', 'Βάλε πρώτα το βάρος σου στο Γυμναστήριο → Πρόοδος.'],
});

// ---------- 0.6.0 ----------
Object.assign(S, {
  exDone: ['Done', 'Τέλος'], reopenEx: ['Reopen', 'Ξανά άνοιγμα'],
  wtTitle: ['Body weight', 'Σωματικό βάρος'], wtChart: ['Body weight chart', 'Γράφημα σωματικού βάρους'],
  wtSince: ['since {d}', 'από {d}'], wtNeed: ['Weigh in twice and your chart starts here.', 'Ζυγίσου δύο φορές και το γράφημα ξεκινά εδώ.'],
  pgStrength: ['Strength by muscle', 'Δύναμη ανά μυ'],
  pgNone: ['Nothing trained here yet.', 'Δεν έχεις γυμνάσει κάτι εδώ ακόμα.'],
});

// ---------- 0.6.1 ----------
Object.assign(S, {
  cantScan: ["Can't scan?", 'Δεν σκανάρει;'],
  createWorkout: ['Create a workout', 'Δημιούργησε προπόνηση'],
});

Object.assign(S, {
  aiThinking: ['Thinking…', 'Σκέφτομαι…'],
  coachStWeb: ['Searching the web…', 'Ψάχνω στο διαδίκτυο…'], coachStPhoto: ['Reading the photo…', 'Διαβάζω τη φωτογραφία…'],
  aiMany: ['{n} AI uses today. Free Gemini keys have a daily limit (a few hundred); if the AI stops answering, it resets tomorrow.', '{n} χρήσεις AI σήμερα. Τα δωρεάν κλειδιά Gemini έχουν ημερήσιο όριο (μερικές εκατοντάδες)· αν το AI σταματήσει να απαντά, ξεκινά ξανά αύριο.'],
  tryingModel: ['Thinking…', 'Σκέφτομαι…'], cancelRec: ['Cancel', 'Ακύρωση'],
  optPhoto: ['<span class="aiafter">Photo of Nutrition Label</span><small>Read by the AI (free Gemini key in Settings)</small>', '<span class="aiafter">Φωτογραφία διατροφικής ετικέτας</span><small>Τη διαβάζει το AI (δωρεάν κλειδί Gemini στις ρυθμίσεις)</small>'],
  geminiKey: ['Gemini API Key', 'Κλειδί Gemini API'],
  mealName: ['Recipe title', 'Τίτλος συνταγής'],
  sgPh: ['Give food name', 'Δώσε όνομα φαγητού'], sgIngT: ['Ingredients', 'Υλικά'], sgTimeT: ['Time available', 'Διαθέσιμος χρόνος'],
  sgQuick: ['Quick ≤20 min', 'Γρήγορο ≤20′'], sgMid: ['20–60 min', '20–60′'], sgLong: ['60+ min', '60+′'], sgAdult: ['One normal adult portion per serving.', 'Μία κανονική μερίδα ενήλικα ανά μερίδα.'],
  cWeighLink: ['Weighed the Cooked Food? (Optional)', 'Ζύγισες το μαγειρεμένο φαγητό; (προαιρετικό)'],
  cqDone: ['Added {n} ingredients. Check the amounts.', 'Μπήκαν {n} υλικά. Έλεγξε τις ποσότητες.'],
  cqFail: ["Couldn't read it. Try listing each ingredient with an amount.", 'Δεν διαβάστηκε. Γράψε κάθε υλικό με ποσότητα.'], cqNoKey: ['Write each ingredient with grams, or add an AI key (Settings › AI) for the AI.', 'Γράψε κάθε υλικό με γραμμάρια, ή βάλε κλειδί AI (Ρυθμίσεις › AI) για το AI.'],
});

// ---------- 0.6.2 ----------
Object.assign(S, {
  startWk: ['Start workout', 'Έναρξη προπόνησης'], entryDel: ['Deleted {n}', 'Διαγράφηκε: {n}'],
  suSex: ['Sex (calories and macros differ)', 'Φύλο (οι θερμίδες διαφέρουν)'], suMale: ['Male', 'Άνδρας'], suFemale: ['Female', 'Γυναίκα'], suHeight: ['Height', 'Ύψος'],
  shopCam: ['Take Photo', 'Βγάλε Φωτογραφία'], shopCamSub: ['Photograph your receipt or lay the items out on a table', 'Φωτογράφισε την απόδειξη ή άπλωσε τα προϊόντα σε τραπέζι'],
  scanSaved: ['Saved to Food Library too, so next time it\'s instant', 'Μπήκε και στη Βιβλιοθήκη Τροφίμων, την επόμενη φορά είναι άμεσο'],
  bkAskOld: ['Your data only lives on this phone. Last backup was {d} days ago. Back up now?', 'Τα δεδομένα σου είναι μόνο σε αυτό το κινητό. Τελευταίο αντίγραφο πριν {d} μέρες. Αντίγραφο τώρα;'],
  bkAskNever: ['Your data only lives on this phone and you haven\'t backed it up yet. Back up now?', 'Τα δεδομένα σου είναι μόνο σε αυτό το κινητό και δεν έχεις κρατήσει αντίγραφο. Αντίγραφο τώρα;'],
  bkYes: ['Back Up Now', 'Αντίγραφο τώρα'],
});

// ---------- 0.6.3 ----------
Object.assign(S, {
  advancedT: ['Advanced', 'Για προχωρημένους'], typeCode: ['Type every number under the barcode', 'Γράψε όλους τους αριθμούς κάτω από το barcode'],
  tpNamePh: ['Workout name, e.g. Push A', 'Όνομα προπόνησης, π.χ. Push A'], exRemoved: ['Removed {n}', 'Αφαιρέθηκε: {n}'],
  yourBody: ['Your body', 'Το σώμα σου'], bodySaved: ['Saved', 'Αποθηκεύτηκε'],
  recalcQ: ['Recalculate your daily targets from this?', 'Να ξαναϋπολογιστούν οι ημερήσιοι στόχοι σου;'], recalcYes: ['Recalculate', 'Υπολογισμός'], recalcNo: ['Keep mine', 'Κράτα τους δικούς μου'],
});

// ---------- 0.6.3.1 ----------
Object.assign(S, {
  tabSupps: ['Supplements', 'Συμπληρώματα'], takeIt: ['Take', 'Το πήρα'], takeAgain: ['+ Again', '+ Ξανά'],
  u_caps: ['C', 'C'], u_tabs: ['T', 'T'], u_scoops: ['S', 'S'], u_drops: ['D', 'D'],
  ul_caps: ['capsules', 'κάψουλες'], ul_tabs: ['tablets', 'ταμπλέτες'], ul_scoops: ['scoops', 'μεζούρες'], ul_drops: ['drops', 'σταγόνες'],
});

// ---------- 0.6.4 ----------
Object.assign(S, {
  addFoodFab: ['Add Food', 'Προσθήκη'], scanFoodFab: ['Scan Food', 'Σάρωση'],
  theItemPhoto: ['the item photo', 'τη φωτογραφία του προϊόντος'],
  itemFail: ["Couldn't recognise it. Try a clearer photo of the front, or the label.", 'Δεν αναγνωρίστηκε. Δοκίμασε πιο καθαρή φωτογραφία της μπροστινής πλευράς ή της ετικέτας.'],
});

// ---------- 0.6.5 ----------
Object.assign(S, {
  uniT: ['One side at a time (L / R sets)', 'Μία πλευρά τη φορά (σετ Α / Δ)'], setRemoved: ['Set removed', 'Το σετ αφαιρέθηκε'],
  aiBg: ['Working on it. Keep using the app; tap the bubble when it\'s ready.', 'Δουλεύει. Συνέχισε στην εφαρμογή· πάτα τη φούσκα όταν είναι έτοιμο.'],
  aiStill: ['Still thinking…', 'Ακόμα σκέφτεται…'], aiReady: ['Ready, tap to open', 'Έτοιμο, πάτα για άνοιγμα'],
  scanReceipt: ['Scan Receipt', 'Σάρωση απόδειξης'], addFridgeFab: ['Add Food', 'Προσθήκη'],
  frozen: ['Frozen', 'Κατεψυγμένο'], plate: ['plate', 'πιάτο'],
});

// ---------- 0.6.5.1 ----------
Object.assign(S, {
  qaT: ['Add takeaway', 'Φαγητό απ\' έξω'], allFoods: ['All foods', 'Όλα τα τρόφιμα'],
});


// ---------- 0.6.6 ----------
Object.assign(S, {
  realStartT: ['Use My Real Workout Start Time','Χρήση της πραγματικής ώρας έναρξης'],
});

// ---------- 0.6.7 ----------
Object.assign(S, {
  didYouMean: ['Did You Mean', 'Μήπως εννοείς'],
  uPacks: ['packs', 'συσκ.'], uPlates: ['plates', 'πιάτα'],
});

// ---------- 0.6.8 ----------
Object.assign(S, {
  superset: ['Superset', 'Υπερσετ'], ssHint: ['Hold an exercise and drop it on another to make a superset. Drop it past the top or bottom of the list to unlink it.', 'Κράτα μια άσκηση και άφησέ τη πάνω σε άλλη για υπερσετ. Άφησέ τη πέρα από την αρχή ή το τέλος της λίστας για να τη χωρίσεις.'], ssOut: ['Taken out of the superset', 'Βγήκε από το υπερσετ'], formPill: ['Form', 'Τεχνική'], swapPill: ['Swap', 'Αλλαγή'], newSetPill: ['+ New Set', '+ Νέο σετ'], endExPill: ['End Exercise', 'Τέλος άσκησης'],
  setDoneL: ['Set done', 'Σετ ολοκληρώθηκε'], markDoneL: ['Mark set done', 'Σημείωσε το σετ'], add15: ['Add 15 seconds', 'Πρόσθεσε 15 δευτερόλεπτα'], sub15: ['Subtract 15 seconds', 'Αφαίρεσε 15 δευτερόλεπτα'],
  discardBtn: ['Discard', 'Απόρριψη'], keepBtn: ['Keep', 'Κράτησέ τη'], endWorkoutPill: ['End Workout', 'Τέλος προπόνησης'], skipGym: ['Skip', 'Παράλειψη'], gymSkipped: ['Gym skipped today · rest-day calories', 'Χωρίς γυμναστήριο σήμερα · θερμίδες ημέρας ξεκούρασης'],
  gymSkippedT: ['Skipped: today uses your rest-day targets', 'Παράλειψη: σήμερα ισχύουν οι στόχοι ημέρας ξεκούρασης'],
  gymL: ['Gym', 'Γυμναστήριο'], restDayS: ['Rest', 'Ξεκούραση'], muUse: ['Muscle Usage {p}%', 'Χρήση μυός {p}%'], estNew: ['Based on your other exercises, try {w} kg for {r} reps', 'Με βάση τις άλλες σου ασκήσεις, δοκίμασε {w} kg για {r} επαναλήψεις'],
  autoEnded: ['Workout saved. It ended by itself at {t}, your last set.', 'Η προπόνηση αποθηκεύτηκε. Έληξε μόνη της στις {t}, στο τελευταίο σου σετ.'], aeQ: ['Finished Your Workout?', 'Τελείωσες την προπόνηση;'], aeFinish: ['Finish', 'Τέλος'], aeResume: ['Resume', 'Συνέχεια'],
  idleQ: ['Your workout has been open with no taps for {m} min. Go back to it?', 'Η προπόνηση είναι ανοιχτή χωρίς πάτημα εδώ και {m} λεπτά. Επιστροφή σε αυτή;'],
  idleBack: ['Back to Workout', 'Επιστροφή'], idleEnd: ['End It', 'Τέλος'], idleDiscarded: ['Workout discarded (nothing was ticked).', 'Η προπόνηση απορρίφθηκε (κανένα σετ).'], dropMore: ['Drop','Πτωτικό'], swapEx: ['Swap exercise', 'Αλλαγή άσκησης'],
});

// ---------- 0.7: shopping in, Groceries → fridge, Check My Foods ----------
Object.assign(S, {
  tickedIn: ['In the fridge: {n}', 'Στο ψυγείο: {n}'],
  unknownCode: ['Unknown product · {c}', 'Άγνωστο προϊόν · {c}'], lookingUp1: ['looking it up…', 'το ψάχνω…'], fromWeb: ['from the web — check', 'από το διαδίκτυο — έλεγξε'],
  packsL: ['Packs', 'Συσκευασίες'], packSizeL: ['Size of one pack', 'Μέγεθος μίας συσκευασίας'],
  wentIn: ['{n} went straight into the fridge', '{n} μπήκαν κατευθείαν στο ψυγείο'], allIn: ['<b>All in the fridge</b>Nothing left to check.', '<b>Όλα στο ψυγείο</b>Δεν έμεινε κάτι για έλεγχο.'],
  shopAddAll: ['Add All to Fridge ({n})', 'Όλα στο ψυγείο ({n})'], shopSkipped: ['{n} without a food skipped', '{n} χωρίς τρόφιμο παραλείφθηκαν'],
  scanBasket: ['{n} scanned', '{n} σαρωμένα'], scanDone: ['Done ({n})', 'Τέλος ({n})'], addedOne: ['Added', 'Προστέθηκε'],
  moreItemsQ: ['More items?', 'Κι άλλα προϊόντα;'], moreItems: ['More Items', 'Κι Άλλα'],
  shopReading: ['Reading the receipt…', 'Διαβάζω την απόδειξη…'], shopOffLook: ['Finding {n} products on Open Food Facts…', 'Ψάχνω {n} προϊόντα στο Open Food Facts…'],
  shopWebLook: ['Looking up {n} unknown items online…', 'Ψάχνω {n} άγνωστα προϊόντα στο διαδίκτυο…'],
  shopReview: ['Check Before Adding', 'Έλεγχος πριν την προσθήκη'], shopReviewSub: ['Tap an item to edit it, swipe left to remove it, roll the wheel for how many packs.', 'Πάτα ένα προϊόν για αλλαγή, σύρε αριστερά για διαγραφή, γύρνα τη ρόδα για το πόσα πήρες.'],
  emptyGroc: ['<b>Nothing to buy</b>Type above to add something. Tick things off in the store and they go straight into the fridge. What you run out of lands here by itself.', '<b>Τίποτα για ψώνια</b>Γράψε από πάνω για να προσθέσεις. Τσέκαρέ τα στο μαγαζί και μπαίνουν κατευθείαν στο ψυγείο. Ό,τι τελειώνει μπαίνει εδώ μόνο του.'],
  chkBtn: ['Check My Foods', 'Έλεγχος τροφίμων'], chkT: ['Check My Foods', 'Έλεγχος τροφίμων'],
  chkSub: ['Each food is checked against that exact product online. Only the ones that look off are shown — nothing changes unless you accept.', 'Κάθε τρόφιμο ελέγχεται με το ίδιο ακριβώς προϊόν στο διαδίκτυο. Βλέπεις μόνο όσα φαίνονται λάθος — τίποτα δεν αλλάζει αν δεν το δεχτείς.'],
  chkAsk: ['Check {n} foods online? That uses {b} AI requests.', 'Έλεγχος {n} τροφίμων; Θα γίνουν {b} αιτήματα AI.'], chkAsk1: ['Check {n} foods online? That uses 1 AI request.', 'Έλεγχος {n} τροφίμων; Θα γίνει 1 αίτημα AI.'], chkGo: ['Check', 'Έλεγχος'],
  chkAllDone: ['All your foods are already checked', 'Όλα τα τρόφιμά σου έχουν ελεγχθεί'], chkRunning: ['Checking {a}–{b} of {n}…', 'Έλεγχος {a}–{b} από {n}…'],
  chkErr: ['Stopped: {e}', 'Σταμάτησε: {e}'], chkOk: ['look right', 'σωστά'], chkOff: ['to review', 'για έλεγχο'], chkNf: ['not found online', 'δεν βρέθηκαν'],
  chkSrc: ['Source', 'Πηγή'], chkAccept: ['Accept', 'Αποδοχή'], chkKeep: ['Keep Mine', 'Κράτα τα δικά μου'], chkNothing: ['<b>Nothing to fix</b>Everything that was found online matches.', '<b>Τίποτα για διόρθωση</b>Ό,τι βρέθηκε συμφωνεί.'],
  inFridgeTag: ['in the fridge', 'στο ψυγείο'],
  chkTick: ['Checked against online sources', 'Ελέγχθηκε με πηγές στο διαδίκτυο'],
  // ==== branch: gym (new Gym Buddy text goes on the lines below) ====
  gymStartP: ['Workout', 'Προπόνηση'], gymResumeP: ['Resume Workout', 'Συνέχεια Προπόνησης'],
  gymBmCredit: ['Body shapes: Body Muscles by Ivan Vulović, Apache License 2.0 (shapes modified).', 'Σχήματα σώματος: Body Muscles του Ivan Vulović, άδεια Apache 2.0 (τροποποιημένα σχήματα).'],
  gymBmLic: ['Licence', 'Άδεια'],
  // 0.7.4.0.5: aria-labels, weekday names, AI button
  gStartL: ['Start', 'Έναρξη'], gInfoL: ['Exercise details', 'Λεπτομέρειες άσκησης'], gPlusL: ['More', 'Περισσότερα'], gMinusL: ['Less', 'Λιγότερα'],
  gThinking: ['Thinking…', 'Σκέφτομαι…'],
  wdShort: ['Sun Mon Tue Wed Thu Fri Sat', 'Κυρ Δευ Τρί Τετ Πέμ Παρ Σάβ'],
  wdFull: ['Sunday Monday Tuesday Wednesday Thursday Friday Saturday', 'Κυριακή Δευτέρα Τρίτη Τετάρτη Πέμπτη Παρασκευή Σάββατο'],
  // 0.7.4.3 Gym Coach
  gcStLook: ['Looking at your workouts…', 'Κοιτάζω τις προπονήσεις σου…'],
  gcImproved: ['Improved', 'Βελτιωμένη'], gcSaved: ['Saved: {n}', 'Αποθηκεύτηκε: {n}'],
  gcLiveHi: ['Snap a photo of a machine you\'re not sure about, and I\'ll help you use it. Or text me any questions about your workout.', 'Βγάλε φωτογραφία ένα μηχάνημα που δεν ξέρεις, και θα σε βοηθήσω να το χρησιμοποιήσεις. Ή γράψε μου ό,τι θες να ρωτήσεις για την προπόνησή σου.'],
  gcAddWk: ['Add to Workout', 'Προσθήκη στην προπόνηση'], gcAddedWk: ['Added: {n}', 'Προστέθηκε: {n}'],
  gcWFirst: ['First Time', 'Πρώτη φορά'], gcWEst: ['Start with about {w} kg × {r}, from your other lifts', 'Ξεκίνα με περίπου {w} kg × {r}, από τις άλλες ασκήσεις σου'],
  gcWLast: ['You\'ve done this: try {w} kg × {r} today', 'Το έχεις κάνει: δοκίμασε {w} kg × {r} σήμερα'],
  gcWNone: ['Start light: a weight you can lift 15 times with good form', 'Ξεκίνα ελαφριά: ένα βάρος που σηκώνεις 15 φορές σωστά'],
  gcStyleT: ['Intensity', 'Ένταση'],
  gsLow: ['Low Volume, High Intensity', 'Λίγος όγκος, υψηλή ένταση'], gsMid: ['In Between', 'Ενδιάμεσο'], gsHigh: ['High Volume, Lower Intensity', 'Πολύς όγκος, χαμηλότερη ένταση'],
  gsLowS: ['Low', 'Χαμηλό'], gsMidS: ['Medium', 'Μεσαίο'], gsHighS: ['High', 'Υψηλό'],
  gsSets: ['Sets per Muscle a Week', 'Σετ ανά μυ την εβδομάδα'], gsReps: ['Usual Reps', 'Συνήθεις επαναλήψεις'], gsFail: ['Sets to Failure', 'Σετ μέχρι αποτυχία'],
  gsFrom: ['Read from your last {n} workouts. Every suggestion fits it. Not right? Pick yours below.', 'Από τις τελευταίες {n} προπονήσεις σου. Κάθε πρόταση ταιριάζει σε αυτό. Δεν είναι σωστό; Διάλεξε το δικό σου παρακάτω.'],
  gsMine: ['You chose this. Every suggestion fits it.', 'Το διάλεξες εσύ. Κάθε πρόταση ταιριάζει σε αυτό.'],
  gsFew: ['Not enough workouts yet to tell. Pick the one that fits you.', 'Δεν υπάρχουν ακόμα αρκετές προπονήσεις για να φανεί. Διάλεξε αυτό που σου ταιριάζει.'],
  // 0.7.9 Gym Coach: editable workout cards, Intensity + Rep Range pickers
  gcSugW: ['Suggested Weight', 'Προτεινόμενο βάρος'], gcSugFirst: ['First-Time Estimate', 'Εκτίμηση για πρώτη φορά'],
  gcReplace: ['Replace', 'Αντικατάσταση'], gcAddBack: ['Add Back', 'Επαναφορά'],
  gcLiveAlready: ['A workout is already running. Finish it first, or Save this one for later.', 'Τρέχει ήδη μια προπόνηση. Τελείωσέ την πρώτα ή αποθήκευσε αυτή για αργότερα.'],
  gcRepRange: ['Rep Range', 'Εύρος επαναλήψεων'], gcRepsAuto: ['Auto: follows Intensity', 'Αυτόματο: ακολουθεί την ένταση'], gcRepsN: ['{r} reps on working sets', '{r} επαναλήψεις στα κύρια σετ'],
  // 0.7.9 leaderboards: real 1RMs only
  ormAdd: ['Add a 1RM', 'Προσθήκη 1RM'], ormSub: ['The most you lifted for one clean rep.', 'Το περισσότερο που σήκωσες για μία σωστή επανάληψη.'],
  ormLift: ['Lift', 'Άσκηση'], ormWeight: ['Weight (kg)', 'Βάρος (kg)'], ormDate: ['Date', 'Ημερομηνία'],
  ormBwHint: ['Pull-ups: enter only the weight you added. Your body weight ({bw} kg) is counted for you.', 'Έλξεις: γράψε μόνο το βάρος που πρόσθεσες. Το σωματικό σου βάρος ({bw} kg) μετράει αυτόματα.'],
  ormYours: ['Your Entries', 'Οι καταχωρήσεις σου'], ormManual: ['entered', 'καταχώρηση'],
  ormBad: ['Choose a lift, a weight and a date (not in the future).', 'Διάλεξε άσκηση, βάρος και ημερομηνία (όχι μελλοντική).'], ormSaved: ['1RM saved', 'Το 1RM αποθηκεύτηκε'],
  // 0.7.9 Leaderboard Attempt mode
  atTitle: ['Enable Leaderboard Attempt on Available Exercises', 'Προσπάθεια Κατάταξης στις Διαθέσιμες Ασκήσεις'], atSub: ['Adds a trophy button on leaderboard lifts: weight and a tick for each single.', 'Προσθέτει κουμπί κυπέλλου στις ασκήσεις της κατάταξης: κιλά και τικ για κάθε μονό.'],
  atBtn: ['Leaderboard Attempt', 'Προσπάθεια για κατάταξη'],
  atNew: ['New leaderboard 1RM: {n} {kg} kg', 'Νέο 1RM στην κατάταξη: {n} {kg} kg'],
  // ==== end gym ====
  // ==== branch: log (new Today & Logging text goes on the lines below) ====
  logTMeal: ['{n} meal', '{n} γεύμα'], logTMeals: ['{n} meals', '{n} γεύματα'], logTWater: ['{n} ml water', '{n} ml νερό'], logChipRm: ['Remove', 'Αφαίρεση'],
  calFood: ['Food', 'Φαγητό'], calWorkout: ['Workout', 'Προπόνηση'], calPickT: ['What Do You Want to Open?', 'Τι θέλεις να ανοίξεις;'], calExercises: ['Exercises', 'Ασκήσεις'], calNoSets: ['No sets recorded', 'Δεν καταγράφηκαν σετ'],
  logCalToday: ['Go to Today', 'Πήγαινε στο σήμερα'],
  logQFind: ['Finding…', 'Ψάχνω…'], logQSugg: ['Here are a few ideas to fill your macros.', 'Μερικές ιδέες για να συμπληρώσεις τα μακρο σου.'],
  planAddedOne: ['Added', 'Προστέθηκε'], planDropped: ['Suggestion removed', 'Η πρόταση αφαιρέθηκε'], logQGot: ['Got it, here\'s what I found.', 'Έγινε, να τι βρήκα.'],
  logQLogged: ['Added {n} foods · {k} kcal', 'Προστέθηκαν {n} τρόφιμα · {k} kcal'],
  logQStd: ['built-in', 'βασικό'], logQEst: ['estimate', 'εκτίμηση'],
  logQWebTag: ['FROM THE WEB', 'ΑΠΟ ΤΟ ΔΙΑΔΙΚΤΥΟ'], logQEstTag: ['AI ESTIMATE', 'ΕΚΤΙΜΗΣΗ AI'],
  logQDoubt: ['Rough estimate: tap to check the amount', 'Πρόχειρη εκτίμηση: πάτα για να ελέγξεις την ποσότητα'],
  logQAddSave: ['Add & Save', 'Προσθήκη & Αποθήκευση'], logQNoMeal: ['could not save it as a meal', 'δεν αποθηκεύτηκε ως γεύμα'],
  logQNameSub: ['The AI found “{n}”. What do you call it? Food Coach will know both names.', 'Το AI βρήκε «{n}». Πώς το λες εσύ; Ο Food Coach θα ξέρει και τα δύο ονόματα.'], logQNamePh: ['Your Name for This Meal', 'Το Δικό σου Όνομα'],
  logQFixNote: ['Add replaces what you logged a moment ago.', 'Η Προσθήκη θα αντικαταστήσει ό,τι κατέγραψες πριν λίγο.'],
  logQNone: ['Not found · tap to pick a food', 'Δεν βρέθηκε · πάτα για να διαλέξεις'],
  logQSwap: ['Swap Food', 'Αλλαγή τροφίμου'], logQSwapPh: ['Search foods', 'Αναζήτηση τροφίμων'], logQRm: ['Remove', 'Αφαίρεση'],
  logQNoMatch: ['Nothing matches “{q}”', 'Τίποτα για «{q}»'],
  logQFail: ['Couldn’t split that. Put commas between the foods and try again.', 'Δεν χωρίστηκε. Βάλε κόμματα ανάμεσα στα τρόφιμα και ξαναδοκίμασε.'],
  logQAIFail: ['The AI didn’t answer ({e}), so it was split at commas instead.', 'Το AI δεν απάντησε ({e}), οπότε χωρίστηκε στα κόμματα.'],
  logQNothing: ['Nothing to add yet', 'Δεν υπάρχει κάτι για προσθήκη'],
  logQOpen: ['Ask Food Coach: “{q}”', 'Ρώτα τον Κόουτς Διατροφής: «{q}»'], logQOpenSub: ['It finds each food and its macros', 'Βρίσκει κάθε τρόφιμο και τα μακρο του'],
  // 0.7.4.0.5: units, labels and screen-reader names that used to sit in the code
  logUSlice: ['Slice', 'Φέτα'], logUPiece: ['Piece', 'Τεμάχιο'], logUPack: ['Pack', 'Συσκευασία'], logUPlate: ['Plate', 'Πιάτο'],
  logUOz: ['Ounces', 'Ουγγιές'], logUMl: ['Millilitres', 'Χιλιοστόλιτρα'], logUG: ['Grams', 'Γραμμάρια'],
  logAll: ['All', 'Όλο'], logRestDay: ['Rest of Day', 'Υπόλοιπη μέρα'], logPlanFridge: ['fridge', 'ψυγείο'],
  logAInfo: ['Info', 'Πληροφορίες'], logALock: ['Lock', 'Κλείδωμα'], logATime: ['Time taken', 'Ώρα λήψης'], logATakeRm: ['Remove', 'Αφαίρεση'],
  logAPrevDay: ['Previous day', 'Προηγούμενη μέρα'], logANextDay: ['Next day', 'Επόμενη μέρα'],
  logAPrevMonth: ['Previous month', 'Προηγούμενος μήνας'], logANextMonth: ['Next month', 'Επόμενος μήνας'],
  logAAmount: ['Amount', 'Ποσότητα'], logAScan: ['Scan a barcode', 'Σάρωση barcode'], logATrack: ['Food Library', 'Βιβλιοθήκη Τροφίμων'],
  // ==== end log ====
  // ==== branch: foods (new My Foods & Search text goes on the lines below) ====
  cookSuggest: ['Suggest a Recipe', 'Πρότεινέ μου συνταγή'], cookOwn: ['My Own Recipe', 'Δική μου συνταγή'],
  foodsQrOpt: ['Quick Recipe', 'Γρήγορη συνταγή'], foodsQrOptSub: ['Type it, the chef builds the meal', 'Γράψ’ την, ο σεφ φτιάχνει το φαγητό'],
  foodsQrT: ['Quick Recipe', 'Γρήγορη συνταγή'], foodsQrGo: ['Build Meal', 'Φτιάξε το φαγητό'],
  foodsQrPh: ['e.g. 500 g chicken, 300 g rice, 2 tbsp olive oil, 1 onion, 3 portions', 'π.χ. 500 g κοτόπουλο, 300 g ρύζι, 2 κ.σ. ελαιόλαδο, 1 κρεμμύδι, 3 μερίδες'],
  scanItem: ['Photo of the Whole Item', 'Φωτογραφία του προϊόντος'], scanPhoto: ['Scan from a Photo', 'Σάρωση από φωτογραφία'],
  noBarcodeLabel: ['Label Photo', 'Φωτό ετικέτας'], typeIt: ['Type It', 'Πληκτρολόγηση'],
  inFridgeToo: ['Saved{i} · In the fridge too', 'Αποθηκεύτηκε{i} · Και στο ψυγείο'],
  logfClear: ['Clear Search', 'Καθαρισμός αναζήτησης'], packStarA: ['Usual Size', 'Συνηθισμένο μέγεθος'],
  // ==== end foods ====
  // ==== branch: shop (new Fridge & Groceries text goes on the lines below) ====
  shopFFrozenTag: ['FROZEN', 'ΚΑΤΕΨ.'], shopFCooked: ['Cooked', 'Μαγειρεμένο'], shopFRaw: ['Raw', 'Ωμό'], shopFReady: ['Ready', 'Έτοιμο'],
  shopFPack: ['1 Pack · {s}', '1 συσκευασία · {s}'], shopFToPacks: ['Count in Packs of {s}', 'Μέτρα σε συσκευασίες των {s}'],
  shopFPackSize: ['Pack Size', 'Μέγεθος συσκευασίας'], shopFAmount: ['Amount', 'Ποσότητα'],
  shopUnsure: ['Not Sure', 'Δεν είμαι σίγουρος'], shopEditT: ['Edit Item', 'Επεξεργασία'], shopEditFood: ['Which Food', 'Ποιο τρόφιμο'], shopEditTag: ['Tag', 'Ετικέτα'], shopEditCount: ['How Many Packs', 'Πόσες συσκευασίες'],
  // ==== end shop ====
  // ==== branch: shell (new App Shell & Settings text goes on the lines below) ====
  shSearchPh: ['Search Settings', 'Αναζήτηση ρυθμίσεων'],
  shNone: ['No setting matches', 'Καμία ρύθμιση δεν ταιριάζει'],
  shBackupNow: ['Back Up Now', 'Αντίγραφο τώρα'],
  shLast: ['Last: {d}', 'Τελευταίο: {d}'],
  shSex: ['Sex', 'Φύλο'],
  // 0.7.4.3 the shared coach chat (Food Coach + Gym Coach)
  coachFood: ['Food Coach', 'Κόουτς Διατροφής'], coachGym: ['Gym Coach', 'Κόουτς Γυμναστηρίου'],
  coachFoodHi: ['Tell me everything you ate, with the amounts if you know them, and I\'ll find the calories and macros for each food. Or ask me what to eat next, and I\'ll help you hit your macros.', 'Πες μου ό,τι έφαγες, με τις ποσότητες αν τις ξέρεις, και θα βρω τις θερμίδες και τα μακροθρεπτικά για κάθε τρόφιμο. Ή ρώτα με τι να φας μετά, και θα σε βοηθήσω να πιάσεις τους στόχους σου.'],
  coachGymHi: ['I\'m your Gym Coach, here to help with your workouts. I can suggest a full workout, or look at one of yours and help you get more out of it.', 'Είμαι ο Κόουτς Γυμναστηρίου σου, εδώ για να βοηθήσω με τις προπονήσεις σου. Μπορώ να σου προτείνω μια ολόκληρη προπόνηση ή να δω μία δική σου και να σε βοηθήσω να βγάλεις περισσότερα από αυτήν.'],
  coachPh: ['Message', 'Μήνυμα'], coachSend: ['Send', 'Αποστολή'], coachPhoto: ['Take a Photo', 'Τράβηξε φωτογραφία'],
  coachBubA: ['Open {n}', 'Άνοιγμα: {n}'],
  coachFail: ['Couldn\'t answer just now ({e}). Try again in a moment.', 'Δεν μπόρεσα να απαντήσω τώρα ({e}). Δοκίμασε ξανά σε λίγο.'],
  aiNeedKey: ['This needs an AI key.', 'Χρειάζεται κλειδί AI.'], aiKeyGo: ['Add Key', 'Βάλε κλειδί'],
  // ==== end shell ====
});

// ---------- Title Case on every English title and label (Greek stays normal Greek). Runs LAST, so it sees the final value of every key. ----------
const TITLE_SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'per', 'vs', 'from', 'as', 'but', 'nor', 'g', 'kg', 'ml', 'mg', 'kcal', 'min', 'h', 'est.', 'x']);
function titleCase(str){
  let first = true;
  return str.replace(/[A-Za-zÀ-ÿ’'.]+(?:-[A-Za-zÀ-ÿ’'.]+)*/g, w => {
    const lw = w.toLowerCase(), keep = !first && TITLE_SMALL.has(lw); first = false;
    if(keep || /[A-Z]/.test(w.slice(1))) return keep ? lw : w;   // small words stay small, API / AI stay as they are
    return w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-');
  });
}
[
  'add', 'addBrand', 'addExercise', 'addFood', 'addIngredient', 'addSuppFab', 'addThis', 'all', 'almost', 'ateAt', 'auto', 'back',
  'barcode', 'bestV', 'blBest', 'blOr', 'bodyMode', 'brand', 'calcStart', 'cancel', 'carbTiming', 'carbs', 'chooseIngredient', 'close',
  'comesAs', 'cookAgain', 'cookOwn', 'cookSuggest', 'cooked', 'copyClaude', 'copyYesterday', 'countThem', 'delete', 'discard', 'done', 'download',
  'duplicate', 'eaten', 'edit', 'emptyWorkout', 'endWorkout', 'exercises', 'expires', 'extrasT', 'fat', 'fibre', 'finishedIt', 'finishedWeight',
  'foodType', 'formNext', 'gBulk', 'gCut', 'gRecomp', 'geminiKey', 'geminiModel', 'getKey', 'goal', 'grpMine', 'grpOnline', 'grpOnline2', 'grpStd',
  'gtPlan', 'gtProgress', 'gtRecovery', 'gtWorkouts', 'gymDay', 'gymDayTargets', 'historyT', 'howMuch', 'howTo', 'hubLib', 'hubProg', 'hubProgSub',
  'hubRec', 'hubWeek', 'hubWeekSub', 'import', 'ingredients', 'language', 'later', 'light', 'listMode', 'locCupboard', 'locFreezer', 'locFridge',
  'logFood', 'lookUp', 'lower', 'measuredIn', 'mistakesT', 'musclesWorked', 'noBarcodeLabel', 'noBrand', 'noExpiry', 'noThanks', 'notes',
  'oftenDaily', 'oftenNeeded', 'oftenTraining', 'onMyPlate', 'orFoodOnly', 'ownRecipe', 'ownRecipeT', 'packSizes', 'pastWorkouts', 'pasteRecipe',
  'perPack', 'pieces', 'postMeal', 'potEmpty', 'potFull', 'potMg', 'product', 'protein', 'qaBig', 'qaBtn', 'qaLog',
  'qaMore', 'qaNormal', 'qaSmall', 'qaT', 'readRecipe', 'ready', 'rebuyBelow', 'recMid', 'recipeIdea', 'recipeT', 'remove', 'restDay',
  'restDayTargets', 'restL', 'salt', 'satFat', 'save', 'saveMeal', 'saveSettings', 'saveTplNo', 'saveTplYes', 'savedTpls', 'savedWorkouts',
  'scTitle', 'scTry', 'scanPhoto', 'scanTitle', 'scanToLog', 'sendReminders', 'setsL', 'settings', 'sgGo', 'share', 'shopPhoto', 'shopReceipt',
  'shopReview', 'shopScan', 'shopSearch', 'shopT', 'showOnList', 'skip', 'slices', 'smPRs', 'smTitle', 'steps', 'suAbout', 'suAgain', 'suAi',
  'suDone', 'suWeek', 'suWelcome', 'sugar', 'suggestRecipe', 'supDose', 'supLink', 'supName', 'supOften', 'tFoods', 'tFridge', 'tGroc', 'tGym',
  'tMeals', 'tScan', 'tSupps', 'tToday', 'tabFood', 'tabFridge', 'tabGym', 'tabMeals', 'tabStore', 'tabToday', 'targetsT', 'testKey', 'typeIt',
  'uncooked', 'upper', 'useRecipe', 'useUpT', 'usuals', 'wArms', 'wBack', 'wCardio', 'wChest', 'wCore', 'wFull', 'wGlutes', 'wLegs', 'wLower',
  'wPull', 'wPush', 'wShoulders', 'wUpper', 'weighOne', 'whereKept', 'whole', 'wiSave', 'wiT', 'winEvening', 'winMidday', 'winMorning', 'winPost',
  'winPre', 'winWorkout', 'workoutAt', 'workoutName', 'workoutType', 'planMyDay', 'logFab', 'fridgeFab', 'addFoodFab',
  'shopFab', 'exDone', 'reopenEx', 'wtTitle', 'pgStrength', 'endEx', 'newSet', 'addYesterday',
  'createWorkout', 'mealName', 'sgIngT', 'sgTimeT', 'cqT', 'cqGo', 'aiThinking', 'startWk', 'suMale', 'suFemale', 'suHeight', 'bkYes', 'yourBody',
  'recalcYes', 'recalcNo', 'tabSupps', 'scanFoodFab', 'scanReceipt', 'allFoods'
].forEach(k => { if(S[k]) S[k][0] = titleCase(S[k][0]); });

// 0.7.4.2: Food Preferences (setup step + Settings bar)
Object.assign(S, {
  stFoodPrefs: ['Food Preferences', 'Διατροφικές προτιμήσεις'], fpSub: ['Tell the AI what to leave out of its suggestions.', 'Πες στο AI τι να αποκλείει από τις προτάσεις του.'],
  fpAllergies: ['Allergies', 'Αλλεργίες'], fpAvoid: ['Foods You Don\'t Eat', 'Τρόφιμα που δεν τρως'],
  fpOtherPh: ['Anything else, separated by commas', 'Κάτι άλλο, χωρισμένο με κόμμα'],
  fpWarn: ['AI suggestions may contain errors. If you have allergies or dietary restrictions, always check labels and ingredients before eating.', 'Οι προτάσεις του AI μπορεί να έχουν λάθη. Αν έχεις αλλεργίες ή διατροφικούς περιορισμούς, έλεγχε πάντα τις ετικέτες και τα συστατικά πριν φας.'],
  fpSaved: ['Food preferences saved', 'Οι διατροφικές προτιμήσεις αποθηκεύτηκαν'],
  fpA_peanuts: ['Peanuts', 'Φιστίκια'], fpA_tree_nuts: ['Tree Nuts', 'Ξηροί καρποί'], fpA_milk: ['Milk', 'Γάλα'], fpA_eggs: ['Eggs', 'Αυγά'], fpA_fish: ['Fish', 'Ψάρι'],
  fpA_shellfish: ['Shellfish', 'Οστρακοειδή'], fpA_soy: ['Soy', 'Σόγια'], fpA_gluten: ['Gluten', 'Γλουτένη'], fpA_sesame: ['Sesame', 'Σουσάμι'],
  fpD_vegetarian: ['Vegetarian', 'Χορτοφαγία'], fpD_vegan: ['Vegan', 'Βίγκαν'], fpD_pescatarian: ['Pescatarian', 'Πεσκετάριαν'], fpD_pork: ['Pork', 'Χοιρινό'],
  fpD_beef: ['Beef', 'Μοσχάρι'], fpD_lamb: ['Lamb', 'Αρνί'], fpD_alcohol: ['Alcohol', 'Αλκοόλ'], fpD_mushrooms: ['Mushrooms', 'Μανιτάρια'],
});

// 0.7.4.3 fridge-a: not food, table photo, verified tags
Object.assign(S, {
  notFoodT: ['Not food, skipped ({n})', 'Όχι τρόφιμα, παραλείφθηκαν ({n})'], rescue: ['Add Anyway', 'Πρόσθεσέ το'],
  tableT: ['Want it more accurate?', 'Θες πιο ακριβές αποτέλεσμα;'],
  tableSub: ["Lay your shopping out on a table and snap one photo. I'll combine it with your receipt to get exactly what you bought and how much.", 'Άπλωσε τα ψώνια σε ένα τραπέζι και βγάλε μία φωτογραφία. Θα την συνδυάσω με την απόδειξη για να βρω ακριβώς τι αγόρασες και πόσο.'],
  tableTake: ['Take Photo', 'Βγάλε Φωτογραφία'], tableReading: ['Reading your table photo…', 'Διαβάζω τη φωτογραφία του τραπεζιού…'],
  shopTable: ['Table Photo', 'Φωτογραφία Τραπεζιού'],
  shopCodeLook: ['Looking up {n} barcodes…', 'Ψάχνω {n} barcode…'], verBarcode: ['Verified from barcode', 'Επαληθεύτηκε από barcode'], verPhoto: ['Verified from grocery photo', 'Επαληθεύτηκε από φωτογραφία'],
  notFoodToast: ['{n} is not food, so it was skipped.', 'Το «{n}» δεν είναι τρόφιμο, παραλείφθηκε.'],
});

// 0.7.4.3 fridge-b: the receipt camera
Object.assign(S, {
  rcptHold: ['Hold steady', 'Κράτα σταθερά'], rcptCloser: ['Move closer', 'Πλησίασε'], rcptLight: ['More light', 'Χρειάζεται περισσότερο φως'],
  rcptNoCam: ['Can\'t open the camera here. Tap the button to take a photo.', 'Δεν ανοίγει η κάμερα εδώ. Πάτα το κουμπί για να βγάλεις φωτογραφία.'],
  rcptShoot: ['Take Photo', 'Λήψη φωτογραφίας'], rcptPartN: ['Part {n}', 'Μέρος {n}'], rcptParts: ['{n} Parts', '{n} μέρη'],
  rcptCheckT: ['Check the Scan', 'Έλεγξε τη σάρωση'], rcptRetake: ['Retake', 'Ξανά'], rcptNext: ['Add Next Part', 'Επόμενο μέρος'], rcptUse: ['Use', 'Χρήση'],
  rcptBlurry: ['Too blurry to read. Retake it a little closer, holding steady.', 'Πολύ θολή για να διαβαστεί. Ξαναβγάλ\' την λίγο πιο κοντά, κρατώντας σταθερά.'],
  rcptNoEdges: ['Couldn\'t find the receipt\'s edges, so the frame was used. Retake on a darker surface if text is cut off.', 'Δεν βρέθηκαν οι άκρες της απόδειξης, οπότε κρατήθηκε το πλαίσιο. Αν κόπηκε κείμενο, ξαναβγάλ\' την σε πιο σκούρα επιφάνεια.'],
  rcptUnreadable: ['The receipt is too blurry to read. Please retake it.', 'Η απόδειξη είναι πολύ θολή για να διαβαστεί. Βγάλε τη ξανά.'],
  formWrong: ['Wrong Photo?', 'Λάθος Φωτογραφία;'],
  rcptFail: ['Couldn\'t process the photo. Try again.', 'Δεν ήταν δυνατή η επεξεργασία της φωτογραφίας. Δοκίμασε ξανά.'],
});

// ---------- 0.7.7: Exercise Settings ----------
Object.assign(S, {
  exSettings: ['Exercise Settings', 'Ρυθμίσεις Άσκησης'],
  exsUni: ['Unilateral Set Finishing', 'Ολοκλήρωση Σετ Μίας Πλευράς'], exsUniS: ['One tick finishes both the left and the right set.', 'Ένα τικ ολοκληρώνει και το αριστερό και το δεξί σετ.'],
  exsMarks: ['Hide Set Markers', 'Απόκρυψη Σημάτων Γύρων'], exsMarksS: ['Choose which markers are offered on sets.', 'Διάλεξε ποια σήματα προσφέρονται στα σετ.'], mkW: ['Warm-Up', 'Προθέρμανση'], mkD: ['Drop Set', 'Drop Set'], mkF: ['Failure', 'Αποτυχία'],
  exsExtras: ['Extras For Each Set', 'Πρόσθετα Κάθε Γύρου'],
  halfReps: ['Half Reps', 'Μισές Επαναλήψεις'], exsHalfS: ['Adds a Half Reps box under each set.', 'Προσθέτει ένα πλαίσιο μισών επαναλήψεων κάτω από κάθε γύρο.'],
  negReps: ['Negatives', 'Αρνητικές'], exsNegS: ['Adds a Negatives box under each set.', 'Προσθέτει ένα πλαίσιο αρνητικών κάτω από κάθε γύρο.'],
  exsRir: ['Reps In Reserve', 'Εφεδρικές Επαναλήψεις'], exsRirS: ['Adds a 0 to 5 choice under each set.', 'Προσθέτει επιλογή 0 έως 5 κάτω από κάθε γύρο.'], rirL: ['RIR', 'RIR'],
});

// ---------- 0.7.7: cardio cards ----------
Object.assign(S, {
  cardTime: ['Time (min)', 'Χρόνος (λεπτά)'], cardDist: ['Distance (km)', 'Απόσταση (km)'], cardCal: ['Calories', 'Θερμίδες'], cardLvl: ['Level', 'Επίπεδο'],
  needCardio: ['Enter the time first.', 'Βάλε πρώτα τον χρόνο.'],
  prT: ['New Record! {n}: {v} min', 'Νέο Ρεκόρ! {n}: {v} λεπτά'], prD: ['New Record! {n}: {v} km', 'Νέο Ρεκόρ! {n}: {v} km'],
  prTLine: ['Longest Time', 'Μεγαλύτερος Χρόνος'], prDLine: ['Longest Distance', 'Μεγαλύτερη Απόσταση'],
});

// ---------- 0.7.7: recovery ----------
Object.assign(S, {
});

// ---------- 0.7.7: sounds ----------
Object.assign(S, {
  exsSoundH: ['Sounds', 'Ήχοι'], exsSound: ['Workout Sounds', 'Ήχοι Προπόνησης'],
  exsSoundS: ['A boxing bell when the rest ends and a soft tone when the workout is finished. A silent phone stays silent.', 'Καμπάνα του μποξ όταν τελειώνει η ξεκούραση και απαλός ήχος στο τέλος της προπόνησης. Σε σίγαση το κινητό δεν παίζει ήχο.'],
});

// 0.7.7 shell: Profile tab (Settings now opens from the gear on Profile)
Object.assign(S, {
  tabProfile: ['Social Hub', 'Κοινωνικό Κέντρο'],
  pfYou: ['You', 'Εσύ'], pfShare: ['Share a Workout', 'Μοιράσου μια Προπόνηση'],
  frzSkipBtn: ['Skip', 'Παράλειψη'], frzGoBtn: ['Go to Gym', 'Πήγαινε στο Γυμναστήριο'],
  pfStreak: ['Workout Streak', 'Σερί Προπονήσεων'], pfHighRank: ['Highest Ranked Exercises', 'Ασκήσεις Με Την Υψηλότερη Κατάταξη'], pfNoRank: ['Finish a workout to get your first rank.', 'Ολοκλήρωσε μια προπόνηση για την πρώτη σου κατάταξη.'],
  rkCustomize: ['Customize', 'Προσαρμογή'], rkReset: ['Reset to Automatic', 'Επαναφορά σε Αυτόματο'], rkTitle: ['Choose 3 Exercises', 'Διάλεξε 3 Ασκήσεις'],
  rkSub: ['Every exercise you have done, with the rank you hold in it.', 'Κάθε άσκηση που έχεις κάνει, με την κατάταξη που κατέχεις.'],
  rkPicked: ['{n} of 3 chosen', '{n} από 3 επιλεγμένες'], rkMax: ['Pick up to 3. Tap one to remove it first.', 'Έως 3. Πάτα μία για να την αφαιρέσεις πρώτα.'], rkNone: ['No exercises found.', 'Δεν βρέθηκαν ασκήσεις.'],
  rkSearch: ['Search Exercises', 'Αναζήτηση Ασκήσεων'],
  pfBoards: ['Leaderboards', 'Κατατάξεις'], pfBoardsSub: ['Friends ranked by their heaviest tested single. Only singles lifted with the trophy on, or added as a 1RM, count.', 'Οι φίλοι κατά το βαρύτερο δοκιμασμένο μονό τους. Μετράνε μόνο μονά με το τρόπαιο ανοιχτό ή όσα πρόσθεσες ως 1RM.'],
  pfStats: ['Stats', 'Στατιστικά'],
});

// ---------- 0.7.7 gym-tiers: Bronze 3 … Diamond 1 per exercise ----------
Object.assign(S, {
  tier_bronze: ['Bronze', 'Χάλκινο'], tier_silver: ['Silver', 'Ασημένιο'], tier_gold: ['Gold', 'Χρυσό'], tier_platinum: ['Platinum', 'Πλατινένιο'], tier_diamond: ['Diamond', 'Διαμαντένιο'],
  tierGap: ['{kg} kg to {tier} (estimated 1RM)', 'Ακόμα {kg} kg για {tier} (εκτιμώμενο 1RM)'], tierTop: ['Top level reached', 'Ανώτατο επίπεδο'], tierGapKg: ['+{kg} kg', '+{kg} kg'],
  tierNeedBody: ['Add Body Weight and Sex for Tiers', 'Πρόσθεσε Βάρος και Φύλο για Επίπεδα'],
});

// ---------- 0.7.7 gym-qr: share a saved workout as a QR code ----------
Object.assign(S, {
  wqShowL: ['Show QR Code', 'Εμφάνιση Κωδικού QR'],
  wqHint: ['Turn your screen brightness up so it scans easily.', 'Ανέβασε τη φωτεινότητα της οθόνης για να σκανάρεται εύκολα.'],
  wsT: ['Scan a Workout', 'Σκανάρισμα Προπόνησης'],
  wsSub: ['Point the camera at the workout QR code on the other phone.', 'Στρέψε την κάμερα στον κωδικό QR της προπόνησης στο άλλο κινητό.'],
  wsPhoto: ['Choose a Photo', 'Επιλογή Φωτογραφίας'],
  wsNotWk: ['This QR code isn’t a workout.', 'Αυτός ο κωδικός QR δεν είναι προπόνηση.'],
  wsNoCode: ['No QR code found in this photo.', 'Δεν βρέθηκε κωδικός QR σε αυτή τη φωτογραφία.'],
  wsNewer: ['This workout comes from a newer version of the app. Update the app, then scan again.', 'Αυτή η προπόνηση είναι από νεότερη έκδοση της εφαρμογής. Ενημέρωσε την εφαρμογή και σκάναρε ξανά.'],
  wsCamBlocked: ['Camera permission was blocked. Allow it in your phone’s settings, or choose a photo of the code.', 'Η κάμερα μπλοκαρίστηκε. Επίτρεψέ τη στις ρυθμίσεις του κινητού ή διάλεξε φωτογραφία του κωδικού.'],
  wsCamHttps: ['The camera only works on your https:// link. Choose a photo of the code instead.', 'Η κάμερα δουλεύει μόνο στο https:// link. Διάλεξε φωτογραφία του κωδικού.'],
  wsCamFail: ['Couldn’t start the camera. Choose a photo of the code instead.', 'Δεν άνοιξε η κάμερα. Διάλεξε φωτογραφία του κωδικού.'],
  wsNoReader: ['Couldn’t load the QR reader. Check your internet connection and try again.', 'Δεν φόρτωσε ο αναγνώστης QR. Έλεγξε τη σύνδεση στο ίντερνετ και δοκίμασε ξανά.'],
  wsSavedQ: ['Saved “{n}”. Start it now?', 'Αποθηκεύτηκε το «{n}». Να ξεκινήσει τώρα;'],
  wsHaveQ: ['You already have “{n}”. Start it now?', 'Έχεις ήδη το «{n}». Να ξεκινήσει τώρα;'],
  wsStart: ['Start', 'Έναρξη'], wsNotNow: ['Not Now', 'Όχι Τώρα'],
  wsOwnEx: ['Shared Exercise', 'Κοινή Άσκηση'],
  wqHow: ['On the other phone, open Food Track · Gym Buddy: Gym › Workouts › Scan a Workout.', 'Στο άλλο κινητό άνοιξε το Food Track · Gym Buddy: Γυμναστήριο › Προπονήσεις › Σκανάρισμα Προπόνησης.'],
});

// ---------- 0.7.9 shell: tab names, Settings › Tabs ----------
Object.assign(S, {
  stTabs: ['Tabs', 'Καρτέλες'],
  kitchenSw: ['Inventory', 'Απόθεμα'],
  kitchenSwSub: ['Inventory and Groceries in the Food Library. Turned off, they stay there greyed out and nothing goes into your inventory.', 'Απόθεμα και Ψώνια στη Βιβλιοθήκη Τροφίμων. Όταν είναι κλειστό, μένουν εκεί γκριζαρισμένα και τίποτα δεν μπαίνει στο απόθεμά σου.'],
  invOff: ['Off in Settings', 'Κλειστό στις Ρυθμίσεις'], invOffT: ['Turn on Inventory in Settings › Tabs', 'Άνοιξε το Απόθεμα στις Ρυθμίσεις › Καρτέλες'],
  tabsOrderSub: ['Mainly gym work puts Gym Buddy first.', 'Κυρίως γυμναστήριο: το Gym Buddy μπαίνει πρώτο.'],
});

// ---------- 0.7.9 shell: profile photo ----------
Object.assign(S, {
  stProfile: ['Photo and Name', 'Φωτογραφία και Όνομα'],
  phTake: ['Take Photo', 'Λήψη Φωτογραφίας'], phChoose: ['Choose Photo', 'Επιλογή Φωτογραφίας'], phRemove: ['Remove Photo', 'Αφαίρεση Φωτογραφίας'],
  phUse: ['Use Photo', 'Χρήση Φωτογραφίας'], phDrag: ['Pinch to zoom, drag to move. Double-tap to reset.', 'Τσίμπησε για ζουμ, σύρε για να τη μετακινήσεις. Διπλό πάτημα για επαναφορά.'],
  phName: ['Name', 'Όνομα'], phNamePh: ['Your first name (optional)', 'Το μικρό σου όνομα (προαιρετικό)'],
  phNameSub: ['With no photo, its first letter shows on Social Hub and in the bottom bar.', 'Χωρίς φωτογραφία, το πρώτο του γράμμα φαίνεται στο Κοινωνικό Κέντρο και στην κάτω μπάρα.'],
  eiMore: ['Muscles and Steps', 'Μύες και Βήματα'],
  phSaved: ['Profile photo saved', 'Η φωτογραφία προφίλ αποθηκεύτηκε'], phBad: ['Couldn’t open that photo.', 'Δεν άνοιξε αυτή η φωτογραφία.'],
});

// ---------- 0.7.9 ai: what the AI knows (Settings › AI) ----------
Object.assign(S, {
  aiKnowT: ['What AI Knows', 'Τι Ξέρει το AI'],
  aiKnowSub: ['The AI learns from your food and workout logs on this phone, so its suggestions fit you. Nothing leaves the phone except inside the AI requests you already make.', 'Το AI μαθαίνει από τα γεύματα και τις προπονήσεις που καταγράφεις σε αυτό το κινητό, ώστε οι προτάσεις του να σου ταιριάζουν. Τίποτα δεν φεύγει από το κινητό, εκτός από τα αιτήματα AI που ήδη κάνεις.'],
  aiKnowReset: ['Reset What AI Knows', 'Επαναφορά Όσων Ξέρει το AI'],
  aiKnowAsk: ['Forget everything the AI has learned from your logs? It starts learning again from tomorrow. Your logs stay as they are.', 'Να ξεχάσει το AI ό,τι έμαθε από τις καταγραφές σου; Θα αρχίσει να μαθαίνει ξανά από αύριο. Οι καταγραφές σου μένουν ως έχουν.'],
  aiKnowYes: ['Reset', 'Επαναφορά'],
  aiKnowDone: ['The AI has forgotten what it learned', 'Το AI ξέχασε όσα είχε μάθει'],
});
Object.assign(S, {
  exsRank: ['Rank Badge', 'Σήμα Κατάταξης'], exsRankS: ['Your rank for this lift on the card. Tap it to see how far the next rank is.', 'Η κατάταξή σου στην άσκηση, πάνω στην κάρτα. Πάτα το για να δεις πόσο απέχει η επόμενη.'],
  exsWarn: ['Warning on Sore Muscles', 'Προειδοποίηση για Πονεμένους Μυς'], exsWarnS: ['A red warning on the exercise card while its muscle is still recovering.', 'Κόκκινη προειδοποίηση στην κάρτα όσο ο μυς αναρρώνει ακόμα.'],
  soreBubH: ['about {h} h left', 'περίπου {h} ώρες ακόμα'],
});
Object.assign(S, {
  exsUniPill: ['Unilateral Pill', 'Κουμπί Μίας Πλευράς'], exsUniPillS: ['Shows the L | R pill on exercise cards.', 'Εμφανίζει το κουμπί L | R στις κάρτες ασκήσεων.'],
  exsFormPill: ['Form Pill', 'Κουμπί Τεχνικής'], exsFormPillS: ['Shows the Form pill on exercise cards.', 'Εμφανίζει το κουμπί Τεχνικής στις κάρτες ασκήσεων.'],
  exsSwapPill: ['Swap Pill', 'Κουμπί Αλλαγής'], exsSwapPillS: ['Shows the Swap pill and the swap button on exercise cards.', 'Εμφανίζει το κουμπί Αλλαγής στις κάρτες ασκήσεων.'],
  gcAskW: ['Suggest a Workout', 'Πρότεινε μια Προπόνηση'], gcAskImp: ['Improve One of My Workouts', 'Βελτίωσε μια Προπόνησή μου'],
  gcAskSets: ['How Many Sets per Week?', 'Πόσα Σετ την Εβδομάδα;'],

  exsTips: ['Tips', 'Συμβουλές'], exsTipsS: ['Shows a suggestion like "Try 7 kg for 8 reps", based on your other exercises.', 'Εμφανίζει πρόταση όπως «Δοκίμασε 7 kg για 8 επαναλήψεις», με βάση τις άλλες ασκήσεις σου.'],
});
Object.assign(S, {   // Athlete OS step 1: Settings › AI › Usage
  aiuT: ['Usage', 'Χρήση'],
  aiuSub: ['How much the AI is used on this phone: counts, time and tokens. Kept only here. No messages, photos or answers are saved.', 'Πόσο χρησιμοποιείται το AI σε αυτό το κινητό: πλήθος, χρόνος και tokens. Μένουν μόνο εδώ. Δεν αποθηκεύονται μηνύματα, φωτογραφίες ή απαντήσεις.'],
  aiuToday: ['Today', 'Σήμερα'], aiu7: ['Last 7 Days', 'Τελευταίες 7 Ημέρες'],
  aiuReq: ['Requests', 'Αιτήματα'], aiuFail: ['Failed', 'Αποτυχημένα'], aiuTries: ['Tries per Request', 'Προσπάθειες ανά αίτημα'],
  aiuTime: ['Average Time', 'Μέσος χρόνος'], aiuTok: ['Tokens In / Out', 'Tokens Εισόδου / Εξόδου'], aiuBad: ['Unreadable Answers', 'Μη αναγνώσιμες απαντήσεις'],
  aiuNA: ['Unavailable', 'Μη διαθέσιμο'], aiuNone: ['No AI requests in the last 7 days.', 'Κανένα αίτημα AI τις τελευταίες 7 ημέρες.'],
  aiuTokNote: ['Tokens are counted only when Google reports them: {a} of {b} tries.', 'Τα tokens μετρώνται μόνο όταν τα δίνει η Google: {a} από {b} προσπάθειες.'],
  aiuFailBy: ['Failures', 'Αποτυχίες'],
  aiuK_auth: ['Bad Key', 'Λάθος κλειδί'], aiuK_rate: ['Rate Limit', 'Όριο χρήσης'], aiuK_overloaded: ['Busy', 'Φόρτωση'], aiuK_timeout: ['Timeout', 'Λήξη χρόνου'],
  aiuK_network: ['Offline', 'Χωρίς σύνδεση'], aiuK_bad_output: ['Unreadable', 'Μη αναγνώσιμο'], aiuK_cancelled: ['Cancelled', 'Ακυρώθηκε'], aiuK_unsupported: ['Not Built', 'Δεν υπάρχει'], aiuK_other: ['Other', 'Άλλο'],
  aiuReset: ['Reset Usage', 'Επαναφορά Χρήσης'], aiuAsk: ['Clear the AI usage numbers on this phone? Nothing else changes.', 'Να σβηστούν τα στοιχεία χρήσης του AI σε αυτό το κινητό; Τίποτα άλλο δεν αλλάζει.'],
  aiuYes: ['Clear', 'Καθαρισμός'], aiuDone: ['AI usage cleared', 'Τα στοιχεία χρήσης καθαρίστηκαν'],
});

// ---------- 0.7.10 Social Hub: Stats (training facts; title stt_<id>, subtitle sts_<id>) ----------
Object.assign(S, {
  stt_workouts: ['Total Workouts', 'Σύνολο Προπονήσεων'], sts_workouts: ['All finished workouts.', 'Όλες οι προπονήσεις.'],
  stt_sets: ['Total Sets', 'Σύνολο Σετ'], sts_sets: ['Working sets only.', 'Μόνο σετ εργασίας.'],
  stt_kg: ['Total Lifted', 'Συνολικά Κιλά'], sts_kg: ['Total kg moved.', 'Συνολικά κιλά.'],
  stt_streak: ['Longest Streak', 'Μεγαλύτερο Σερί'], sts_streak: ['Workouts in a row.', 'Προπονήσεις στη σειρά.'],
  stt_bestWeek: ['Best Week', 'Καλύτερη Εβδομάδα'], sts_bestWeek: ['Workouts in one week.', 'Σε μία εβδομάδα.'],
  stt_favEx: ['Favourite Exercise', 'Αγαπημένη Άσκηση'], sts_favEx: ['Done in {n} sets.', 'Σε {n} σετ.'],
  stt_favMuscle: ['Favourite Muscle', 'Αγαπημένος Μυς'], sts_favMuscle: ['Trained in {n} sets.', 'Σε {n} σετ.'],
  stt_heaviest: ['Heaviest Lift', 'Βαρύτερο Σήκωμα'], sts_heaviest: ['On {n}.', '{n}.'],
  stt_longest: ['Longest Workout', 'Μεγαλύτερη Προπόνηση σε Διάρκεια'], sts_longest: ['Your longest workout.', 'Η πιο μεγάλη σου.'],
  stt_earliest: ['Earliest Workout', 'Πιο Πρωινή Προπόνηση'], sts_earliest: ['Your earliest start.', 'Η πιο πρωινή έναρξη.'],
  stt_latest: ['Latest Workout', 'Πιο Βραδινή Προπόνηση'], sts_latest: ['Your latest start.', 'Η πιο αργή έναρξη.'],
  stt_weekday: ['Favourite Day', 'Αγαπημένη Μέρα'], sts_weekday: ['{n} workouts on it.', '{n} προπονήσεις.'],
  stt_hours: ['Time Training', 'Χρόνος Προπόνησης'], sts_hours: ['All your time training.', 'Συνολικός χρόνος.'],
  stt_prs: ['Records Set', 'Ρεκόρ'], sts_prs: ['From your workouts.', 'Από τις προπονήσεις.'],
  stt_bestDay: ['Heaviest Day', 'Βαρύτερη Μέρα'], sts_bdBag: ['{n} cement bags, {d}.', '{n} σακιά, {d}.'], sts_bdCar: ['{n} cars, {d}.', '{n} αυτοκίνητα, {d}.'], sts_bdEl: ['{n} elephants, {d}.', '{n} ελέφαντες, {d}.'], sts_bdWhale: ['{n} blue whales, {d}.', '{n} φάλαινες, {d}.'],
  stt_mountain: ['Mountain Climbed', 'Βουνό που Ανέβηκες'], sts_mountain: ['Times up Everest.', 'Φορές το Έβερεστ.'],
  stt_luckyDay: ['Lucky Weekday', 'Τυχερή Μέρα'], sts_luckyDay: ['{n} records that day.', '{n} ρεκόρ σε αυτήν.'],
  stt_night: ['Midnight Iron', 'Σίδερα τα Μεσάνυχτα'], sts_night: ['Started after 9 pm.', 'Μετά τις 9 μ.μ.'],
  stt_dawn: ['Dawn Patrol', 'Πρωινή Περίπολος'], sts_dawn: ['Started before 7 am.', 'Πριν τις 7 π.μ.'],
  stt_couch: ['Couch Potato', 'Καναπές'], sts_couch: ['{a} to {b}.', '{a} έως {b}.'], stUnitDay: ['day', 'μέρα'], stUnitDays: ['days', 'μέρες'], stUnitReps: ['reps', 'επαν.'],
  stt_nextRank: ['Closest to Ranking Up', 'Κοντά σε Νέα Βαθμίδα'], sts_nextRank: ['{n}', '{n}'],
  stt_ratio: ['Strongest for Your Weight', 'Δύναμη για το Βάρος σου'], sts_ratio: ['Times your body weight, on {n}.', 'Φορές το σωματικό σου βάρος, στην άσκηση {n}.'],
  stt_repKing: ['Rep King', 'Βασιλιάς Επαναλήψεων'], sts_repKing: ['On {n}.', '{n}.'],
  stt_big3: ['Big Three Total', 'Σύνολο Big Three'], sts_big3: ['Best estimated 1RMs.', 'Εκτιμώμενα 1RM.'], sts_big3Bw: ['{n} times your body weight.', '{n} φορές το σωματικό σου βάρος.'],
  stt_explorer: ['Exercise Explorer', 'Εξερευνητής Ασκήσεων'], sts_explorer: ['Newest: {n}.', 'Νέα: {n}.'],
  stt_loyal: ['Loyalty', 'Πίστη'], sts_loyal: ['{n} months in a row.', '{n} μήνες στη σειρά.'],
  sts_kgEl: ['About {n} elephants.', 'Περίπου {n} ελέφαντες.'], sts_kgCar: ['About {n} cars.', 'Περίπου {n} αυτοκίνητα.'], sts_kgBag: ['{n} bags of cement.', '{n} σακιά τσιμέντο.'],
  stPin: ['Pin This Stat', 'Καρφίτσωμα Στατιστικού'], stUnpin: ['Unpin This Stat', 'Ξεκαρφίτσωμα Στατιστικού'],
  stShuffle: ['Shuffle Stats', 'Ανακάτεμα Στατιστικών'], stEmpty: ['Finish a workout to see your stats.', 'Ολοκλήρωσε μια προπόνηση για να δεις τα στατιστικά σου.'],
});
Object.assign(S, {   // 0.7.10.2 Rank Up / Rank Changed windows (js/rank-fx.js)
  rfxUp: ['Rank Up', 'Άνοδος Κατάταξης'], rfxStep: ['Step Up', 'Ένα Σκαλί Πάνω'], rfxDown: ['Rank Changed', 'Η Κατάταξη Άλλαξε'],
  rfxDownMsg: ['Your {ex} rank is now {rank}. Train it to win it back.', 'Η κατάταξή σου στο {ex} είναι τώρα {rank}. Προπονήσου για να την ξανακερδίσεις.'],
  rfxNice: ['Nice', 'Τέλεια'], rfxGotIt: ['Got It', 'Εντάξει'],
  sxClear: ['Clear', 'Καθαρισμός'],
});
Object.assign(S, {   // 0.7.10.7 Settings › Theme › Status Bar
  thBar: ['Status Bar', 'Γραμμή Κατάστασης'], thBarClear: ['Transparent', 'Διάφανη'], thBarSolid: ['Solid', 'Συμπαγής'],
  thBarNote: ['Takes effect the next time you open the app. If nothing changes, remove the icon and add it again.', 'Ισχύει την επόμενη φορά που θα ανοίξεις την εφαρμογή. Αν δεν αλλάξει τίποτα, αφαίρεσε το εικονίδιο και πρόσθεσέ το ξανά.'],
});
Object.assign(S, {   // Refinements: live workout bottom card, Exercise Settings tabs, Workout Done
  holdEnd: ['Hold To End Workout', 'Κράτα Για Τέλος Προπόνησης'], holdDiscard: ['Hold To Discard', 'Κράτα Για Απόρριψη'],
  sxHalf: ['Half Reps', 'Μισές'], sxNeg: ['Negatives', 'Αρνητικές'],   // the short titles beside the circles on a set
  swipeAdd: ['Swipe To Add Exercise', 'Σύρε Για Νέα Άσκηση'], swipeNext: ['Swipe For Next Exercise', 'Σύρε Για Επόμενη Άσκηση'], smSaveTpl: ['Save As Workout', 'Αποθήκευση Ως Προπόνηση'],
  exsTabSocial: ['Social', 'Κοινωνικά'], exsTabButtons: ['Buttons', 'Κουμπιά'], exsTabSets: ['Sets', 'Σετ'], exsTabAlerts: ['Alerts', 'Ειδοποιήσεις'],
  // Petros: Exercise Settings for all exercises or each on its own, sections like the main Settings page, Machine (Coming Soon)
  exsTabMachine: ['Machine', 'Μηχάνημα'], exsMachT: ['Machine Position Reminders', 'Υπενθύμιση Θέσεων Μηχανήματος'], exsMachS: ['Remembers where you set the seat and levers on each machine.', 'Θυμάται πού έβαλες το κάθισμα και τους μοχλούς σε κάθε μηχάνημα.'],
  exsSecSocialS: ['Ranks and leaderboards', 'Κατατάξεις και πίνακες'], exsSecButtonsS: ['The buttons on the card', 'Τα κουμπιά στην κάρτα'], exsSecSetsS: ['Sides, markers, half reps, negatives, reps in reserve', 'Πλευρές, σημάδια, μισές επαναλήψεις, αρνητικές, RIR'], exsSecAlertsS: ['Warnings, tips and sounds', 'Προειδοποιήσεις, συμβουλές και ήχοι'],
  exsModeT: ['Settings Set Individually', 'Ρυθμίσεις ανά Άσκηση'], exsModeOnS: ['On: {n} keeps its own settings. Turn off for the same settings on every exercise.', 'Ναι: η άσκηση {n} κρατά δικές της ρυθμίσεις. Κλείσ’ το για ίδιες ρυθμίσεις σε όλες.'],
  exsModeOnNo: ['On: each exercise keeps its own settings. Here you set the starting ones.', 'Ναι: κάθε άσκηση κρατά δικές της ρυθμίσεις. Εδώ ορίζεις τις αρχικές.'], exsModeOffS: ['Off: every exercise uses the same settings.', 'Όχι: όλες οι ασκήσεις έχουν τις ίδιες ρυθμίσεις.'],
  exsShared: ['Same for All Exercises', 'Ίδιο για Όλες τις Ασκήσεις'],
  exsAskQ: ['How do you want to keep your exercise settings?', 'Πώς θες να κρατάς τις ρυθμίσεις των ασκήσεων;'],
  exsAskAll: ['Same for All Exercises', 'Ίδιες για Όλες τις Ασκήσεις'], exsAskAllS: ['Set them once, every exercise uses them.', 'Τις ορίζεις μία φορά, ισχύουν για όλες.'],
  exsAskEach: ['Individual per Exercise', 'Ξεχωριστές ανά Άσκηση'], exsAskEachS: ['Each exercise remembers its own. Ranks, leaderboards, tips and sounds stay the same for all.', 'Κάθε άσκηση θυμάται τις δικές της. Κατατάξεις, πίνακες, συμβουλές και ήχοι μένουν ίδια για όλες.'],
  exsAskNote: ['You can change this any time at the top of Exercise Settings.', 'Μπορείς να το αλλάξεις όποτε θες, πάνω στις Ρυθμίσεις Άσκησης.'],
});
Object.assign(S, {   // Refinements #2: the Gym Buddy carousel; carSoon = a Coming Soon pill or tile
  carSoon: ['Coming Soon', 'Σύντομα'],
});
Object.assign(S, {   // Refinements #4: the Food Library hub
  fhFoods: ['Foods', 'Τρόφιμα'],
  nRecipes: ['{n} Recipes', '{n} Συνταγές'], nRecipe1: ['1 Recipe', '1 Συνταγή'], nSupps: ['{n} Supplements', '{n} Συμπληρώματα'], nSupp1: ['1 Supplement', '1 Συμπλήρωμα'],
});
Object.assign(S, {   // Refinements #5 · Food Coach complex meals: one card (js/meal.js)
  mealOil: ['Cooking Oil', 'Λάδι Μαγειρέματος'],
  mealSize_small: ['Small Portion', 'Μικρή Μερίδα'], mealSize_normal: ['Normal Portion', 'Κανονική Μερίδα'], mealSize_large: ['Large Portion', 'Μεγάλη Μερίδα'], mealSize_xl: ['Extra Large Portion', 'Πολύ Μεγάλη Μερίδα'],
  mealSz_small: ['Small', 'Μικρή'], mealSz_normal: ['Normal', 'Κανονική'], mealSz_large: ['Large', 'Μεγάλη'], mealSizeL: ['Portion Size', 'Μέγεθος Μερίδας'],
  mealConf_high: ['Confidence: High', 'Βεβαιότητα: Υψηλή'], mealConf_medium: ['Confidence: Medium', 'Βεβαιότητα: Μέτρια'], mealConf_low: ['Confidence: Low', 'Βεβαιότητα: Χαμηλή'],
  mealWhy: ['Main Uncertainty: {w}', 'Αβέβαιο: {w}'], mealAnd: [' and ', ' και '],
  mealWhy_portion: ['portion size', 'μέγεθος μερίδας'], mealWhy_oil: ['oil', 'λάδι'], mealWhy_sauce: ['sauces', 'σάλτσες'],
  mealRange: ['{s}: about {k} kcal', '{s}: περίπου {k} kcal'], mealGramsL: ['Grams of {n}', 'Γραμμάρια για {n}'],
  mealLogged: ['Added {n} · {k} kcal', 'Προστέθηκε: {n} · {k} kcal'],
});
Object.assign(S, {   // Refinements #7: the body weight chart picks its own level (Progress)
  wtLvl_day: ['Daily', 'Ημερήσια'], wtLvl_week: ['Weekly Average', 'Μέσος Όρος Εβδομάδας'], wtLvl_month: ['Monthly Average', 'Μέσος Όρος Μήνα'],
});
Object.assign(S, {   // Refinements #7: Strength by Muscle rows with a trend line (Progress)
  sbmNoData: ['Not Enough Data Yet', 'Δεν Υπάρχουν Ακόμα Αρκετά Δεδομένα'], sbmEst: ['Estimated Strength', 'Εκτιμώμενη Δύναμη'],
  sbmFeeds: ['Exercises In This Line', 'Ασκήσεις Σε Αυτή Τη Γραμμή'],
  sbmHow: ['From your estimated one rep max on each exercise, weighted by how much it works this muscle. The % is the change since your first reading. Green or red is the last two weeks; gray means no change, or no workout for this muscle in two weeks.',
    'Από την εκτιμώμενη μέγιστη επανάληψη σε κάθε άσκηση, ανάλογα με το πόσο δουλεύει αυτόν τον μυ. Το % είναι η αλλαγή από την πρώτη μέτρηση. Πράσινο ή κόκκινο δείχνει τις δύο τελευταίες εβδομάδες· γκρι σημαίνει καμία αλλαγή ή καμία προπόνηση για αυτόν τον μυ σε δύο εβδομάδες.'],
});
Object.assign(S, {   // Refinements #8: the Social Hub leaderboard (one rep max only, friends)
  lbNoneYet: ['No One Rep Maxes Yet', 'Δεν Υπάρχουν Ακόμα Μέγιστα'], lbNoneSub: ['Lift a single with the trophy on, or add a 1RM, and the board starts.', 'Σήκωσε ένα μονό με το τρόπαιο ανοιχτό ή πρόσθεσε ένα 1RM και ο πίνακας ξεκινά.'],
  lbNoFriends: ['Friends join this board once accounts arrive. For now it shows you.', 'Οι φίλοι μπαίνουν εδώ μόλις έρθουν οι λογαριασμοί. Για τώρα δείχνει εσένα.'],
  lbJoin: ['Tick One Rep Max On A Set To Join', 'Σημείωσε Μέγιστη Επανάληψη Σε Ένα Σετ Για Να Μπεις'],
  lbJoinHow: ['Turn on Leaderboard Attempt in Exercise Settings, then tap the trophy on the lift.', 'Άνοιξε την Προσπάθεια Κατάταξης στις Ρυθμίσεις Ασκήσεων και πάτα το τρόπαιο στην άσκηση.'],
});
Object.assign(S, {   // Refinements #8: the Social Hub profile
  pfRankMore: ['Train more lifts to fill the empty slots.', 'Κάνε περισσότερες ασκήσεις για να γεμίσουν τα κενά.'],
});
Object.assign(S, {   // Refinements #8: Workout Done (rank ups, the Gym Coach's recovery line) and the Rank Up screens
  rfxNext: ['Next', 'Επόμενο'], smRankUp1: ['Rank Up', 'Άνοδος Κατάταξης'], smRankUps: ['Rank Ups', 'Άνοδοι Κατάταξης'],
});
Object.assign(S, {   // Refinements #7: Recovery tiles
  recAllReady: ['All Muscles Ready', 'Όλοι Οι Μύες Έτοιμοι'], recHrs: ['h', 'ώρ.'],
});
Object.assign(S, {   // V3 hardening: backups and saved data that could not be read
  backupTooNew: ['This backup is from a newer app version. Update the app first, then import it.', 'Αυτό το αντίγραφο είναι από νεότερη έκδοση της εφαρμογής. Ενημέρωσέ την πρώτα και μετά κάνε εισαγωγή.'],
  dataProblem: ['Some saved data could not be read. It is kept safe and included in your next backup.', 'Κάποια αποθηκευμένα δεδομένα δεν διαβάστηκαν. Φυλάσσονται και μπαίνουν στο επόμενο αντίγραφο ασφαλείας.'],
  timeFmtT: ['Time Format', 'Μορφή Ώρας'], tmSys: ['System Default', 'Προεπιλογή Συστήματος'], tm12: ['12-hour', '12ωρη'], tm24: ['24-hour', '24ωρη'],
  tmNote: ['System Default follows your phone. Saved times never change, only how they are shown.', 'Η προεπιλογή ακολουθεί το κινητό σου. Οι αποθηκευμένες ώρες δεν αλλάζουν, μόνο ο τρόπος εμφάνισης.'],
  importUndone: ['The last import was interrupted, so it was undone. Your data is as it was before.', 'Η τελευταία εισαγωγή διακόπηκε και αναιρέθηκε. Τα δεδομένα σου είναι όπως πριν.'],
});

Object.assign(S, {   // Athlete OS: what the coaches remember (Settings › AI › What AI Knows) and the coach chat toasts
  memT: ['What You Told the Coaches', 'Όσα Είπες στους Coach'],
  memSub: ['When you tell a coach something about yourself (a food you avoid, a sore shoulder, when you train), it is kept here so every coach knows. Short-term notes end by themselves. Only you can see them; delete any one.', 'Όταν λες σε έναν coach κάτι για σένα (ένα φαγητό που αποφεύγεις, έναν πονεμένο ώμο, πότε γυμνάζεσαι), κρατιέται εδώ ώστε να το ξέρουν όλοι οι coach. Οι προσωρινές σημειώσεις λήγουν μόνες τους. Τις βλέπεις μόνο εσύ· σβήσε όποια θέλεις.'],
  memNone: ['Nothing yet. Tell a coach something like "I don\'t eat mushrooms" or "my shoulder hurts".', 'Τίποτα ακόμη. Πες σε έναν coach κάτι όπως «δεν τρώω μανιτάρια» ή «με πονάει ο ώμος».'],
  memKeep: ['Kept until you delete it', 'Μένει μέχρι να το σβήσεις'],
  memUntil: ['Until {d}', 'Μέχρι {d}'],
  memDel: ['Delete', 'Διαγραφή'],
  memDeleted: ['Deleted', 'Διαγράφηκε'],
  memCopy: ['Copy as Text', 'Αντιγραφή ως Κείμενο'],
  memCopied: ['Copied', 'Αντιγράφηκε'],
  memSaved: ['Remembered for all coaches', 'Το θυμούνται πλέον όλοι οι coach'],
  memForgot: ['Updated what the coaches remember', 'Ενημερώθηκε τι θυμούνται οι coach'],
  aiBadAnswer: ['The AI answer could not be used. Try again.', 'Η απάντηση του AI δεν ήταν χρήσιμη. Δοκίμασε ξανά.'],
});

Object.assign(S, {   // ==== branch: gym — Gym Coach intelligence (js/gym-intel.js): proposals, quiet hints, answers from your log when the AI is out of reach
  gcAskDeb: ['How Did My Last Workout Go?', 'Πώς Πήγε η Τελευταία Προπόνηση;'],
  gciProposed: ['Proposed', 'Πρόταση'], gciApply: ['Apply', 'Εφαρμογή'], gciNotNow: ['Not Now', 'Όχι Τώρα'],
  gciApplied: ['Applied to this workout', 'Εφαρμόστηκε σε αυτή την προπόνηση'], gciKept: ['Kept as it was', 'Έμεινε όπως ήταν'],
  gciStale: ['The workout changed since, so nothing was applied', 'Η προπόνηση άλλαξε στο μεταξύ, οπότε δεν εφαρμόστηκε τίποτα'],
  gciOpW: ['Sets still to do: {b} kg (now {a})', 'Σετ που απομένουν: {b} kg (τώρα {a})'], gciOpR: ['Sets still to do: {b} reps (now {a})', 'Σετ που απομένουν: {b} επαναλήψεις (τώρα {a})'],
  gciOpW0: ['Sets still to do: {b} kg', 'Σετ που απομένουν: {b} kg'], gciOpR0: ['Sets still to do: {b} reps', 'Σετ που απομένουν: {b} επαναλήψεις'],
  gciOpS: ['Working sets: {b} (now {a})', 'Σετ εργασίας: {b} (τώρα {a})'], gciOpSwap: ['Swap for {n}', 'Αντικατάσταση με {n}'],
  gciOpAfter: ['Add {n} right after it', 'Προσθήκη {n} αμέσως μετά'], gciOpAdd: ['Add {n} to this workout', 'Προσθήκη {n} σε αυτή την προπόνηση'],
  gciNUp: ['That was {r} reps on {n}, more than last time. If it felt solid, {w} kg for the rest could be the right step.', 'Έκανες {r} επαναλήψεις στο {n}, περισσότερες από την προηγούμενη φορά. Αν ένιωσες σίγουρος, τα {w} kg για τα υπόλοιπα σετ μπορεί να είναι το σωστό βήμα.'],
  gciNDrop: ['Your reps on {n} dropped more than usual between sets. A slightly lighter {w} kg for the rest would keep the sets useful. Or stop here, that is fine too.', 'Οι επαναλήψεις στο {n} έπεσαν περισσότερο από το συνηθισμένο ανάμεσα στα σετ. Λίγο ελαφρύτερα, {w} kg, για τα υπόλοιπα θα κρατήσουν τα σετ χρήσιμα. Ή σταμάτα εδώ, είναι κι αυτό εντάξει.'],
  gciNVol: ['{g} already has about {n} hard sets today and there is more planned for it. Worth keeping the rest short if it starts to feel like junk volume.', 'Οι {g} έχουν ήδη περίπου {n} δύσκολα σετ σήμερα και έχεις κι άλλα για αυτούς. Αν αρχίσουν να μοιάζουν άσκοπα, κράτα τα υπόλοιπα σύντομα.'],
  gciOffline: ['I can\'t reach the AI right now, but from your log:', 'Δεν μπορώ να συνδεθώ με το AI αυτή τη στιγμή, αλλά από το ιστορικό σου:'],
  gciLStart: ['first time on {n}, so start around {w} kg × {r} and adjust from there.', 'πρώτη φορά στο {n}, οπότε ξεκίνα γύρω στα {w} kg × {r} και προσάρμοσε από εκεί.'],
  gciLStartN: ['first time on {n}: pick a weight you could do about 15 times with clean form.', 'πρώτη φορά στο {n}: διάλεξε ένα βάρος που θα σήκωνες περίπου 15 φορές σωστά.'],
  gciLBack: ['it has been a while since {n}. Start around {w} kg and build back up.', 'έχει περάσει καιρός από το {n}. Ξεκίνα γύρω στα {w} kg και ανέβα σιγά σιγά.'],
  gciLUp: ['you have been hitting the top of your range on {n}. I\'d try {w} kg next.', 'πιάνεις το πάνω όριο των επαναλήψεων στο {n}. Θα δοκίμαζα {w} kg.'],
  gciLCons: ['stay at {w} kg on {n} and get more of your sets to {r} reps before going up.', 'μείνε στα {w} kg στο {n} και φέρε περισσότερα σετ στις {r} επαναλήψεις πριν ανέβεις.'],
  gciLReps: ['stay at {w} kg on {n} and aim for {r} reps.', 'μείνε στα {w} kg στο {n} και στόχευσε σε {r} επαναλήψεις.'],
  gciLRepeat: ['your last {n} session looks like an off day. Repeat {w} kg before moving on.', 'η τελευταία φορά στο {n} μοιάζει με κακή μέρα. Επανάλαβε τα {w} kg πριν προχωρήσεις.'],
  gciLHold: ['{n} has dipped for a couple of sessions. Hold {w} kg and keep the reps clean.', 'το {n} έπεσε λίγο δύο φορές στη σειρά. Κράτα τα {w} kg και καθαρές επαναλήψεις.'],
  gciLLight: ['{n} has been below your rep range lately. Try {w} kg and build the reps back up.', 'στο {n} είσαι κάτω από το εύρος επαναλήψεων τελευταία. Δοκίμασε {w} kg και χτίσε ξανά τις επαναλήψεις.'],
  gciLHarder: ['you are at the top of your range on {n}. Add a little weight or a harder version.', 'είσαι στο πάνω όριο στο {n}. Πρόσθεσε λίγο βάρος ή μια πιο δύσκολη παραλλαγή.'],
  gciLNext: ['{n} is next in your plan.', 'επόμενο στο πρόγραμμά σου είναι το {n}.'],
});
Object.assign(S, {   // Food Coach 2.0: plain-words AI errors (every coach), offline answers, corrections and quick answers
  aiErrKey: ['The AI key isn’t working. Check it in Settings › AI.', 'Το κλειδί AI δεν λειτουργεί. Έλεγξέ το στις Ρυθμίσεις › AI.'],
  aiErrLimit: ['The AI limit for this key is used up for now. Try again a little later.', 'Το όριο AI για αυτό το κλειδί εξαντλήθηκε προς το παρόν. Δοκίμασε ξανά λίγο αργότερα.'],
  aiErrOffline: ['No connection right now. Try again when you’re back online.', 'Δεν υπάρχει σύνδεση αυτή τη στιγμή. Δοκίμασε ξανά όταν συνδεθείς.'],
  aiErrBusy: ['The AI is busy right now. Try again in a moment.', 'Το AI είναι απασχολημένο τώρα. Δοκίμασε ξανά σε λίγο.'],
  aiErrOther: ['Something went wrong on the AI side. Try again in a moment.', 'Κάτι πήγε στραβά με το AI. Δοκίμασε ξανά σε λίγο.'],
  logQOffline: ['I can’t reach the AI right now, so I matched what I could from your foods and the built-in list. Check the rows before adding.', 'Δεν μπορώ να φτάσω το AI τώρα, οπότε ταίριαξα ό,τι μπόρεσα από τα τρόφιμά σου και τη λίστα της εφαρμογής. Έλεγξε τις γραμμές πριν τις προσθέσεις.'],
  logQLocalOnly: ['Here’s what I matched from your foods and the built-in list. Check the rows before adding.', 'Να τι ταίριαξα από τα τρόφιμά σου και τη λίστα της εφαρμογής. Έλεγξε τις γραμμές πριν τις προσθέσεις.'],
  logQSame: ['That list is already up there. Change it there, or tap Add.', 'Αυτή η λίστα είναι ήδη πιο πάνω. Άλλαξέ την εκεί ή πάτα Προσθήκη.'],
  logQFixed: ['Done, I changed the list above.', 'Έγινε, άλλαξα τη λίστα πιο πάνω.'],
  logQFixedNew: ['Here’s the corrected list. Add replaces the one you added before.', 'Να η διορθωμένη λίστα. Η Προσθήκη αντικαθιστά αυτήν που πρόσθεσες πριν.'],
  logQPickRows: ['Pick a food for the rows marked Not Found, or remove them, to add the list.', 'Διάλεξε τρόφιμο για τις γραμμές που λένε Δεν βρέθηκε, ή αφαίρεσέ τες, για να προσθέσεις τη λίστα.'],
  logQChecking: ['Checking the label…', 'Ελέγχω την ετικέτα…'],
  logQClose: ['Closest match, not this exact brand', 'Το πιο κοντινό, όχι αυτή η μάρκα ακριβώς'],
  logQStatedOff: ['You said {v} g protein: check the amount or pick your product', 'Είπες {v} γρ πρωτεΐνη: έλεγξε την ποσότητα ή διάλεξε το προϊόν σου'],
  logQThanks: ['Anytime. Tell me whenever you eat something.', 'Παρακαλώ. Πες μου όποτε φας κάτι.'],
  logQHi: ['Hey! Tell me what you ate, or ask me anything about food.', 'Γεια! Πες μου τι έφαγες ή ρώτα με ό,τι θες για το φαγητό.'],
  logQN_p: ['protein', 'πρωτεΐνη'], logQN_c: ['carbs', 'υδατάνθρακες'], logQN_f: ['fat', 'λιπαρά'],
  logQAnsLast: ['That list comes to {v}.', 'Αυτή η λίστα κάνει {v}.'],
  logQAnsMiss: ['Rows marked Not Found aren’t counted.', 'Οι γραμμές που λένε Δεν βρέθηκε δεν μετράνε.'],
  logQAnsToday: ['Logged so far today: {v}{of}. Only what you’ve logged counts here.', 'Καταγεγραμμένα σήμερα μέχρι τώρα: {v}{of}. Μετράει μόνο ό,τι έχεις καταγράψει.'],
  logQOf: [' of your {t} target', ' από τον στόχο των {t}'],
});

Object.assign(S, {   // ==== Athlete OS · persona: Settings › AI › Coach Personality (js/athlete/persona.js; one setting for Food Coach, Gym Coach and Fridge AI)
  perT: ['Coach Personality', 'Προσωπικότητα Coach'],
  perSub: ['One personality for Food Coach, Gym Coach and Fridge AI. It changes how they talk, never the facts or safety.', 'Μία προσωπικότητα για Food Coach, Gym Coach και Fridge AI. Αλλάζει το πώς μιλάνε, ποτέ τα στοιχεία ή την ασφάλεια.'],
  perBase: ['Style', 'Ύφος'], perBal: ['Balanced', 'Ισορροπημένο'], perMot: ['Motivator', 'Ενθαρρυντικό'], perAna: ['Analytical', 'Αναλυτικό'],
  perHumor: ['Humor', 'Χιούμορ'], perLow: ['Low', 'Λίγο'], perNat: ['Natural', 'Φυσικό'], perPlay: ['Playful', 'Παιχνιδιάρικο'],
  perLen: ['Answer Length', 'Μήκος Απαντήσεων'], perCon: ['Concise', 'Σύντομες'], perAda: ['Adaptive', 'Ανάλογα'], perDet: ['Detailed', 'Αναλυτικές'],
  perCustomT: ['Your Own Instructions', 'Δικές σου Οδηγίες'], perCustomPh: ['Optional, e.g. Skip the small talk, keep it British', 'Προαιρετικά, π.χ. Χωρίς πολλές κουβέντες, μίλα μου στον ενικό'],
  perSaved: ['Coach personality saved', 'Η προσωπικότητα του coach αποθηκεύτηκε'],
});

Object.assign(S, {   // ==== branch: gym — Changes #12 / #13: Stats pins + daily rotation, weekly workout streak, Streak Savers, Consistency Challenge (js/streak.js, js/profile.js)
  stPinsSub: ['Pin up to {m} stats ({n} pinned). The others change every 24 hours.', 'Καρφίτσωσε έως {m} στατιστικά ({n} καρφιτσωμένα). Τα υπόλοιπα αλλάζουν κάθε 24 ώρες.'],
  stPinsFull: ['{n} of {m} pinned. The others change every 24 hours.', '{n} από {m} καρφιτσωμένα. Τα υπόλοιπα αλλάζουν κάθε 24 ώρες.'],
  stPinFull: ['You can pin {n} stats. Replace "{a}" with "{b}"?', 'Μπορείς να καρφιτσώσεις {n} στατιστικά. Να αντικατασταθεί το «{a}» με το «{b}»;'],
  stPinReplace: ['Replace', 'Αντικατάσταση'],
  stt_streak: ['Longest Streak', 'Μεγαλύτερο Σερί'], sts_streak: ['Best weekly streak, in workouts.', 'Το καλύτερο εβδομαδιαίο σερί, σε προπονήσεις.'],
  stkAria: ['Workout Streak: {n}. Streak Savers: {s}', 'Σερί Προπονήσεων: {n}. Σωσίβια Σερί: {s}'],
  stkStOn: ['Active', 'Ενεργό'], stkStMet: ['Goal Met', 'Στόχος Επετεύχθη'], stkStSaver: ['Saver Ready', 'Σωσίβιο Έτοιμο'], stkStOff: ['Off', 'Ανενεργό'],
  stkStReset: ['Reset', 'Μηδενίστηκε'], stkStMissed: ['Next Week', 'Την Άλλη Εβδομάδα'],
  stkOne: ['One more workout this week keeps your streak alive.', 'Μία ακόμα προπόνηση αυτή την εβδομάδα κρατάει το σερί σου ζωντανό.'],
  stkOneNew: ['One more workout this week reaches your weekly goal.', 'Μία ακόμα προπόνηση αυτή την εβδομάδα και πιάνεις τον εβδομαδιαίο στόχο.'],
  stkLast: ["Today's your last chance to reach your weekly goal and keep your streak.", 'Σήμερα είναι η τελευταία σου ευκαιρία να πιάσεις τον εβδομαδιαίο στόχο και να κρατήσεις το σερί.'],
  stkLastNew: ["Today's your last chance to reach this week's goal.", 'Σήμερα είναι η τελευταία σου ευκαιρία να πιάσεις τον στόχο της εβδομάδας.'],
  stkSaver: ["You're one workout short, but your Streak Saver can protect your progress.", 'Σου λείπει μία προπόνηση, αλλά το Σωσίβιο Σερί μπορεί να προστατέψει την πρόοδό σου.'],
  stkSaverNeed: ['Do {n} more this week and your Streak Saver can protect your streak.', 'Κάνε {n} ακόμα αυτή την εβδομάδα και το Σωσίβιο Σερί μπορεί να προστατέψει το σερί σου.'],
  stkSaverBonus: ['Finish the Consistency Challenge this week and its Streak Saver can protect your streak.', 'Ολοκλήρωσε το Challenge Συνέπειας αυτή την εβδομάδα και το Σωσίβιό του μπορεί να προστατέψει το σερί σου.'],
  stkLost: ['Your streak has reset. A new one starts with your next successful training week.', 'Το σερί σου μηδενίστηκε. Ένα νέο ξεκινά με την επόμενη επιτυχημένη εβδομάδα προπόνησης.'],
  stkMissed: ["This week's goal is out of reach. Your streak starts with your next successful week.", 'Ο στόχος αυτής της εβδομάδας δεν πιάνεται πια. Το σερί σου ξεκινά με την επόμενη επιτυχημένη εβδομάδα.'],
  stkMet: ['Weekly goal reached. Every extra workout this week adds to your streak.', 'Ο εβδομαδιαίος στόχος επετεύχθη. Κάθε επιπλέον προπόνηση αυτή την εβδομάδα προστίθεται στο σερί σου.'],
  stkOff: ['Streak tracking is off: your planner has only Rest Days this week.', 'Το σερί είναι ανενεργό: ο πλάνος σου έχει μόνο Ημέρες Ξεκούρασης αυτή την εβδομάδα.'],
  stkOffNext: ['Streak tracking is off this week. It starts again on Monday with your planner\'s Gym Days.', 'Το σερί είναι ανενεργό αυτή την εβδομάδα. Ξεκινά ξανά τη Δευτέρα με τις Ημέρες Γυμναστηρίου του πλάνου σου.'],
  stkOn: ['{n} more workouts this week, {d} days left.', '{n} ακόμα προπονήσεις αυτή την εβδομάδα, απομένουν {d} μέρες.'],
  stkSavedT: ['Your Streak Saver protected your streak last week.', 'Το Σωσίβιο Σερί προστάτεψε το σερί σου την προηγούμενη εβδομάδα.'],
  stkMore: ['Details', 'Λεπτομέρειες'],
  stkWeek: ['This Week', 'Αυτή την Εβδομάδα'], stkWeekOf: ['{d} of {t} workouts', '{d} από {t} προπονήσεις'],
  stkWeekNeed: ['{n} to go · {d} days left', 'Απομένουν {n} · {d} μέρες ακόμα'], stkWeekNeed1: ['{n} to go · last day', 'Απομένουν {n} · τελευταία μέρα'], stkWeekDone: ['Goal reached', 'Ο στόχος επετεύχθη'],
  stkWeekNext: ['From Monday: {n} a week', 'Από Δευτέρα: {n} την εβδομάδα'],
  stkSavers: ['Streak Savers', 'Σωσίβια Σερί'], stkSaverN: ['{n} of 2 available', '{n} από 2 διαθέσιμα'],
  stkSaverExp: ['unused ones expire {d}', 'όσα δεν χρησιμοποιηθούν λήγουν {d}'], stkSaverNone: ['a new one arrives {d}', 'ένα νέο έρχεται {d}'],
  stkBest: ['Personal Best', 'Προσωπικό Ρεκόρ'],
  stkChal: ['Consistency Challenge', 'Challenge Συνέπειας'], stkChalN: ['{n}/{m} workouts', '{n}/{m} προπονήσεις'],
  stkChalSub: ['Complete 10 workouts across two consecutive calendar weeks to unlock an extra Streak Saver.', 'Ολοκλήρωσε 10 προπονήσεις σε δύο συνεχόμενες ημερολογιακές εβδομάδες για ένα επιπλέον Σωσίβιο Σερί.'],
  stkChalPair: ['Weeks {a} to {b}', 'Εβδομάδες {a} έως {b}'], stkChalEarned: ['Earned', 'Κερδήθηκε'],
  stkChalEarnedSub: ['Extra Streak Saver earned on {d}. A new challenge opens next month.', 'Το επιπλέον Σωσίβιο Σερί κερδήθηκε στις {d}. Νέο challenge τον επόμενο μήνα.'],
  stkHow: ['How Streaks Work', 'Πώς Λειτουργεί το Σερί'],
  stkHow1: ['Your weekly planner sets the goal: one workout for every Gym Day.', 'Ο εβδομαδιαίος πλάνος ορίζει τον στόχο: μία προπόνηση για κάθε Ημέρα Γυμναστηρίου.'],
  stkHow2: ['Train on any days you like, Monday to Sunday. Which days does not matter.', 'Προπονήσου όποιες μέρες θέλεις, Δευτέρα έως Κυριακή. Δεν έχει σημασία ποιες.'],
  stkHow3: ['Only one finished workout per day counts.', 'Μετράει μόνο μία ολοκληρωμένη προπόνηση τη μέρα.'],
  stkHow4: ['Reach the goal and every workout that week, extras too, is added to your streak.', 'Πιάσε τον στόχο και κάθε προπόνηση της εβδομάδας, και οι επιπλέον, προστίθεται στο σερί σου.'],
  stkHow5: ['Miss the weekly goal and your streak resets.', 'Αν χάσεις τον εβδομαδιαίο στόχο, το σερί μηδενίζεται.'],
  stkHow6: ['Miss it by just one workout and a Streak Saver protects your streak by itself (that week adds no points).', 'Αν σου λείψει μόνο μία προπόνηση, ένα Σωσίβιο Σερί προστατεύει αυτόματα το σερί σου (εκείνη η εβδομάδα δεν προσθέτει πόντους).'],
  stkHow7: ['You get one Streak Saver every month, and can earn one more with the Consistency Challenge.', 'Παίρνεις ένα Σωσίβιο Σερί κάθε μήνα και μπορείς να κερδίσεις ένα ακόμα με το Challenge Συνέπειας.'],
  stkHow8: ['Unused Streak Savers expire at the end of their month.', 'Τα Σωσίβια που δεν χρησιμοποιήθηκαν λήγουν στο τέλος του μήνα τους.'],
  stkHow9: ['A planner with only Rest Days turns the streak off. It is kept, not lost.', 'Ένας πλάνος μόνο με Ημέρες Ξεκούρασης απενεργοποιεί το σερί. Κρατιέται, δεν χάνεται.'],
  stkHow10: ['Planner changes count from the next Monday.', 'Οι αλλαγές στον πλάνο ισχύουν από την επόμενη Δευτέρα.'],
  stkIntro: ['Streaks are now weekly. Tap the flame to see how they work.', 'Το σερί είναι πλέον εβδομαδιαίο. Πάτα τη φλόγα για να δεις πώς λειτουργεί.'],
  stkIntroBtn: ['See How', 'Δες Πώς'],
  stkPlanNext: ["Saved. This week's goal stays at {n} workouts; your new goal of {m} starts Monday.", 'Αποθηκεύτηκε. Ο στόχος αυτής της εβδομάδας μένει {n} προπονήσεις· ο νέος στόχος των {m} ξεκινά τη Δευτέρα.'],
  stkPlanOff: ["Saved. Streak tracking turns off from Monday (only Rest Days). This week's goal stays at {n}.", 'Αποθηκεύτηκε. Το σερί απενεργοποιείται από τη Δευτέρα (μόνο Ημέρες Ξεκούρασης). Ο στόχος αυτής της εβδομάδας μένει {n}.'],
  stkPlanOn: ['Saved. Streak tracking starts Monday with a goal of {m} workouts a week.', 'Αποθηκεύτηκε. Το σερί ξεκινά τη Δευτέρα με στόχο {m} προπονήσεις την εβδομάδα.'],
  stkCOne: ['1 more workout keeps your streak.', '1 ακόμα προπόνηση κρατάει το σερί.'], stkCLast: ['Last chance today for your streak.', 'Σήμερα η τελευταία ευκαιρία για το σερί.'],
  stkCSaver: ['A Streak Saver can cover this week.', 'Ένα Σωσίβιο Σερί καλύπτει αυτή την εβδομάδα.'], stkCLost: ['Streak reset. A new one starts next week.', 'Το σερί μηδενίστηκε. Νέο ξεκινά την άλλη εβδομάδα.'],
  stkSkipLast: ["Today is your last chance to reach this week's goal. Skip anyway?", 'Σήμερα είναι η τελευταία ευκαιρία για τον στόχο της εβδομάδας. Παράλειψη ούτως ή άλλως;'],
});

// RECOVERY+ (the Recovery page, its tiles, insight and Advanced details; Today's line; the live workout's sore-muscle bubble)
Object.assign(S, {
  hubRec: ['RECOVERY+', 'RECOVERY+'],
  recFigAria: ['Recovery body map. Muscles still recovering: {m}.', 'Χάρτης αποκατάστασης. Μύες που ακόμα αναρρώνουν: {m}.'],
  recNoneShort: ['none', 'κανένας'],
  recNextT: ['Next Workout', 'Επόμενη Προπόνηση'], recNoPlanT: ['No Workout Planned', 'Καμία Προγραμματισμένη Προπόνηση'],
  recNextWhen: ['{d} at {t}', '{d} στις {t}'], recDayToday: ['Today', 'Σήμερα'], recDayTomorrow: ['Tomorrow', 'Αύριο'],
  recAsProceed: ['The muscles this workout uses look ready. Train as planned.', 'Οι μύες που δουλεύει αυτή η προπόνηση φαίνονται έτοιμοι. Προπονήσου όπως το σχεδίασες.'],
  recAsMonitor: ['{m} may still be a little tired. Train as planned and see how those sets feel.', '{m}: ίσως ακόμα λίγο κουρασμένοι. Προπονήσου κανονικά και δες πώς νιώθεις σε αυτά τα σετ.'],
  recAsReduce: ['{m} may still be recovering. You can train as planned, or do fewer hard sets for them if they feel unusually heavy.', '{m}: ίσως ακόμα αναρρώνουν. Μπορείς να προπονηθείς κανονικά ή να κάνεις λιγότερα δύσκολα σετ γι’ αυτούς αν νιώθεις ασυνήθιστα βαριά.'],
  recAsAlt: ['{m} likely need more rest. Consider a different exercise or lighter sets for them today. Your call.', '{m}: μάλλον θέλουν κι άλλη ξεκούραση. Σκέψου άλλη άσκηση ή πιο ελαφριά σετ γι’ αυτούς σήμερα. Εσύ αποφασίζεις.'],
  recAsRest: ['Most of this workout uses muscles that likely need more rest ({m}). An extra rest day or a lighter session are options. Your call.', 'Το μεγαλύτερο μέρος αυτής της προπόνησης δουλεύει μύες που μάλλον θέλουν ξεκούραση ({m}). Μια μέρα ξεκούρασης ακόμα ή πιο ελαφριά προπόνηση είναι επιλογές. Εσύ αποφασίζεις.'],
  recAsListFat: ['This workout has no exercise list. Still recovering: {m}.', 'Αυτή η προπόνηση δεν έχει λίστα ασκήσεων. Ακόμα αναρρώνουν: {m}.'],
  recAsListOk: ['This workout has no exercise list. Your logged muscles look ready.', 'Αυτή η προπόνηση δεν έχει λίστα ασκήσεων. Οι μύες από τις προπονήσεις σου φαίνονται έτοιμοι.'],
  recAsNoHistory: ['Recovery estimates will appear as you log workouts.', 'Οι εκτιμήσεις αποκατάστασης θα εμφανιστούν όσο καταγράφεις προπονήσεις.'],
  recLimited: ['Based on limited workout history.', 'Με βάση λίγες καταγεγραμμένες προπονήσεις.'],
  recSumRec: ['Still recovering: {m}.', 'Ακόμα αναρρώνουν: {m}.'], recSumReady: ['Every muscle from your logged workouts looks ready.', 'Όλοι οι μύες από τις προπονήσεις σου φαίνονται έτοιμοι.'],
  recStale: ['No workouts logged in the last 3 weeks, so RECOVERY+ can’t be sure.', 'Καμία προπόνηση τις τελευταίες 3 εβδομάδες, οπότε το RECOVERY+ δεν μπορεί να είναι σίγουρο.'],
  recAdvice: ['Suggestions only. Nothing in your plan changes.', 'Μόνο προτάσεις. Τίποτα στο πρόγραμμά σου δεν αλλάζει.'],
  recUnknown: ['Unknown', 'Άγνωστο'], recUnknownKey: ['Grey = no workout data yet', 'Γκρι = δεν υπάρχουν ακόμα δεδομένα'],
  recWatchT: ['Muscles To Watch', 'Μύες Που Θέλουν Προσοχή'], recInsightT: ['RECOVERY+ Insight', 'Συμβουλή RECOVERY+'],
  recDetailsT: ['Details', 'Λεπτομέρειες'], recContextT: ['How RECOVERY+ Decided', 'Πώς Αποφάσισε Το RECOVERY+'],
  recHint2: ['Colours and hours come from your logged sets and how long ago you did them. Estimates, not medical advice.', 'Τα χρώματα και οι ώρες βγαίνουν από τα σετ που κατέγραψες και πόσο παλιά τα έκανες. Εκτιμήσεις, όχι ιατρική συμβουλή.'],
  recCLow: ['Low', 'Χαμηλή'], recCMod: ['Moderate', 'Μέτρια'], recCHigh: ['High', 'Υψηλή'],
  recDSets: ['{n} hard sets this week', '{n} δύσκολα σετ αυτή την εβδομάδα'],
  recDEx: ['From: {e}', 'Από: {e}'],
  recDRir: ['Reps in reserve logged on {a} of {b} sets', 'Επαναλήψεις σε απόθεμα σε {a} από {b} σετ'],
  recDRirNone: ['No reps in reserve logged, so normal effort is assumed', 'Δεν καταγράφηκαν επαναλήψεις σε απόθεμα, οπότε θεωρείται κανονική προσπάθεια'],
  recDFail: ['{n} sets to failure', '{n} σετ μέχρι αποτυχία'], recDDrop: ['{n} drop sets', '{n} drop sets'],
  recDRange: ['Ready in about {a} to {b} h', 'Έτοιμοι σε περίπου {a} έως {b} ώρες'], recDConf: ['Confidence: {c}', 'Βεβαιότητα: {c}'],
  recDTrend: ['{e}: strength {s} over the last 4 weeks', '{e}: δύναμη {s} τις τελευταίες 4 εβδομάδες'],
  recDTrendNone: ['Not enough repeat workouts for a strength trend yet', 'Δεν υπάρχουν ακόμα αρκετές επαναλήψεις για τάση δύναμης'],
  recDUnmapped: ['A custom exercise without muscles was left out', 'Μια δική σου άσκηση χωρίς μύες δεν μετρήθηκε'],
  recPersFast: ['Adjusted to your history: you tend to recover a bit faster', 'Προσαρμοσμένο στο ιστορικό σου: συνήθως αναρρώνεις λίγο πιο γρήγορα'],
  recPersSlow: ['Adjusted to your history: you tend to need a bit longer', 'Προσαρμοσμένο στο ιστορικό σου: συνήθως χρειάζεσαι λίγο περισσότερο'],
  recWhyRow: ['{m}: about {h} h to ready, main mover in {n} planned exercises.', '{m}: περίπου {h} ώρες ως έτοιμοι, κύριος μυς σε {n} προγραμματισμένες ασκήσεις.'],
  recWhyNone: ['The planned exercises’ muscles look ready.', 'Οι μύες των προγραμματισμένων ασκήσεων φαίνονται έτοιμοι.'],
  recWhyNoPlan: ['No planned workout to compare with.', 'Δεν υπάρχει προγραμματισμένη προπόνηση για σύγκριση.'],
  recCtxWhy: ['Why This Suggestion', 'Γιατί Αυτή Η Πρόταση'], recCtxSleep: ['Sleep', 'Ύπνος'], recCtxFood: ['Food', 'Φαγητό'], recCtxData: ['Data', 'Δεδομένα'],
  recCtxRule: ['Sleep, food and your goal never change muscle colours or hours.', 'Ο ύπνος, το φαγητό και ο στόχος σου δεν αλλάζουν ποτέ τα χρώματα ή τις ώρες των μυών.'],
  recDataN: ['{n} workouts logged, last on {d}.', '{n} καταγεγραμμένες προπονήσεις, η τελευταία στις {d}.'],
  recOff: ['Not used (switched off below).', 'Δεν χρησιμοποιείται (κλειστό παρακάτω).'],
  recSleepNone: ['No sleep data is connected, so nothing is assumed.', 'Δεν υπάρχουν συνδεδεμένα δεδομένα ύπνου, οπότε δεν υποθέτουμε τίποτα.'],
  recSleepOk: ['Recent sleep looks usual ({h} h on average).', 'Ο πρόσφατος ύπνος φαίνεται συνηθισμένος ({h} ώρες κατά μέσο όρο).'],
  recSleepShort: ['Recent nights were shorter than usual ({h} h on average).', 'Οι τελευταίες νύχτες ήταν πιο σύντομες από ό,τι συνήθως ({h} ώρες κατά μέσο όρο).'],
  recSleepSingle: ['Last night was short ({h} h). One night is only a small signal.', 'Χθες κοιμήθηκες λίγο ({h} ώρες). Μία νύχτα είναι μόνο μικρή ένδειξη.'],
  recFoodUnknown: ['Not enough finished food days to judge. Missing logs never count as not eating.', 'Δεν υπάρχουν αρκετές ολοκληρωμένες μέρες φαγητού για κρίση. Ό,τι λείπει δεν μετράει ποτέ ως νηστεία.'],
  recFoodProteinOk: ['Logged protein reached your target on most logged days.', 'Η καταγεγραμμένη πρωτεΐνη έφτασε τον στόχο σου τις περισσότερες μέρες.'],
  recFoodProteinGap: ['Logged protein was below your target on most finished days.', 'Η καταγεγραμμένη πρωτεΐνη ήταν κάτω από τον στόχο σου τις περισσότερες ολοκληρωμένες μέρες.'],
  recFoodCov: ['Food logged on {a} of the last {w} days; {b} marked as finished.', 'Φαγητό καταγράφηκε {a} από τις τελευταίες {w} μέρες· {b} σημειώθηκαν ολοκληρωμένες.'],
  recSince: ['since {d}', 'από {d}'],
  recEnergyOk: ['Calories on finished days match your target.', 'Οι θερμίδες στις ολοκληρωμένες μέρες ταιριάζουν με τον στόχο σου.'],
  recEnergyLow: ['Calories on finished days were below your target.', 'Οι θερμίδες στις ολοκληρωμένες μέρες ήταν κάτω από τον στόχο σου.'],
  recEnergyHigh: ['Calories on finished days were above your target.', 'Οι θερμίδες στις ολοκληρωμένες μέρες ήταν πάνω από τον στόχο σου.'],
  recEnergyUnknown: ['Calories vs target: unknown, as no day is marked finished.', 'Θερμίδες σε σχέση με τον στόχο: άγνωστο, καμία μέρα δεν είναι σημειωμένη ολοκληρωμένη.'],
  recUseFood: ['Use Food Data', 'Χρήση Δεδομένων Φαγητού'], recUseSleep: ['Use Sleep Data', 'Χρήση Δεδομένων Ύπνου'],
  recI_sleep_short: ['Your recent sleep has been shorter than usual. Hard sets may feel tougher today; adjust effort if needed.', 'Τελευταία κοιμάσαι λιγότερο από ό,τι συνήθως. Τα δύσκολα σετ ίσως φανούν πιο βαριά σήμερα· προσάρμοσε την προσπάθεια αν χρειαστεί.'],
  recI_cut_energy_low: ['You’re cutting, and on your finished food days you ate well below even your cut target. If training feels flat, the Food Coach can help.', 'Κάνεις γράμμωση και στις ολοκληρωμένες μέρες έφαγες αρκετά κάτω ακόμα και από τον στόχο σου. Αν η προπόνηση δεν πάει καλά, ο Food Coach μπορεί να βοηθήσει.'],
  recI_energy_low: ['On your finished food days, calories were well below your target. If training feels flat, the Food Coach can help.', 'Στις ολοκληρωμένες μέρες οι θερμίδες ήταν αρκετά κάτω από τον στόχο σου. Αν η προπόνηση δεν πάει καλά, ο Food Coach μπορεί να βοηθήσει.'],
  recI_protein_gap: ['Your recorded protein has been below your target on several finished days. Consistency may help your training.', 'Η καταγεγραμμένη πρωτεΐνη ήταν κάτω από τον στόχο σου σε αρκετές ολοκληρωμένες μέρες. Η σταθερότητα βοηθά την προπόνηση.'],
  recI_bulk_low: ['Your finished food days are below your gaining target. That could make muscle growth harder over time.', 'Οι ολοκληρωμένες μέρες σου είναι κάτω από τον στόχο όγκου. Αυτό μπορεί να δυσκολέψει την αύξηση μυών με τον καιρό.'],
  recI_carbs_turnaround: ['Big session recently and another one soon: some extra carbs before then may help you train well. Optional.', 'Μεγάλη προπόνηση πρόσφατα και άλλη σύντομα: λίγοι παραπάνω υδατάνθρακες ως τότε ίσως βοηθήσουν. Προαιρετικό.'],
  recI_cut_ok: ['You’re cutting, so eating below maintenance is expected. Your protein looks on track; no recovery change is needed based on food alone.', 'Κάνεις γράμμωση, οπότε τρως λιγότερο από τη συντήρηση. Η πρωτεΐνη σου είναι εντάξει· δεν χρειάζεται αλλαγή μόνο λόγω φαγητού.'],
  recI_recomp_ok: ['Your logged protein has been consistent. Nothing in your food suggests changing today’s workout.', 'Η καταγεγραμμένη πρωτεΐνη σου είναι σταθερή. Τίποτα στο φαγητό σου δεν δείχνει αλλαγή στη σημερινή προπόνηση.'],
  recWarnNext: ['Tomorrow: {w} at {t}. {m} may still be recovering. Train as planned, or go lighter on those sets.', 'Αύριο: {w} στις {t}. {m}: ίσως ακόμα αναρρώνουν. Προπονήσου κανονικά ή πιο ελαφριά σε αυτά τα σετ.'],
  soreBub2: ['{m} may still be recovering', '{m}: ίσως ακόμα αναρρώνουν'],
});

Object.assign(S, {   // ==== Exercise Picker V27 (js/expick.js) + Create Custom Exercise (js/excreate.js, js/excustom.js). Titles and buttons in Title Case, help in sentence case
  pkTitle: ['Add Exercise', 'Προσθήκη Άσκησης'], pkReset: ['Reset Filters', 'Επαναφορά Φίλτρων'], pkRegionL: ['Body Region', 'Περιοχή Σώματος'],
  pkUp: ['Upper', 'Πάνω'], pkLow: ['Lower', 'Κάτω'], allMuscles: ['All Muscles', 'Όλοι οι Μύες'], pkAbd: ['Abductors', 'Απαγωγοί'], pkOther: ['Other', 'Άλλο'],
  pkChoose: ['Choose Muscle', 'Επίλεξε Μυ'], pkChooseArea: ['Choose Area', 'Επίλεξε Περιοχή'], pkChooseEq: ['Choose Equipment', 'Επίλεξε Εξοπλισμό'],
  pkEqGo: ['Equipment', 'Εξοπλισμός'], pkOptional: ['Optional', 'Προαιρετικό'], pkFilters: ['Filters', 'Φίλτρα'], pkPrev: ['Previous Filter', 'Προηγούμενο Φίλτρο'],
  pkChange: ['Change {n}', 'Αλλαγή: {n}'],
  pkExercises: ['Exercises', 'Ασκήσεις'], pkSearchRes: ['Search Results', 'Αποτελέσματα'], pkByMuscle: ['Exercises By Muscle', 'Ασκήσεις Ανά Μυ'],
  pkCount: ['{n} Exercises', '{n} Ασκήσεις'], pkCount1: ['1 Exercise', '1 Άσκηση'],
  pkBest: ['Best Match First', 'Καλύτερη Αντιστοιχία Πρώτα'], pkHigh: ['Highest Usage First', 'Μεγαλύτερη Χρήση Πρώτα'], pkUsageFirst: ['Muscle Usage First', 'Χρήση Μυός Πρώτα'],
  pkMostSets: ['Most Logged Sets First', 'Περισσότερα Σετ Πρώτα'], pkDiscover: ['Discover Exercises', 'Ανακάλυψε Ασκήσεις'],
  pkCustom: ['Custom', 'Δική σου'], pkCustomL: ['Custom exercise', 'Δική σου άσκηση'], pkInfoL: ['Details of {n}', 'Λεπτομέρειες: {n}'], pkAddL: ['Add {n}', 'Προσθήκη: {n}'],
  pkNoMatch: ['No Matching Exercises', 'Καμία Άσκηση Δεν Ταιριάζει'], pkNoMatchSub: ['Try another muscle, equipment type, or search.', 'Δοκίμασε άλλο μυ, εξοπλισμό ή αναζήτηση.'],
  pkMore: ['Show More · {n} Remaining', 'Περισσότερες · {n} Ακόμα'],
  pkCreate: ['Create Custom Exercise', 'Δημιουργία Δικής σου Άσκησης'], pkCreateSub: ['Not in the library? Create your own.', 'Δεν υπάρχει στη λίστα; Φτιάξε τη δική σου.'],
  pkSel1: ['1 Selected', '1 Επιλεγμένη'], pkSelN: ['{n} Selected', '{n} Επιλεγμένες'], pkSelAdd: ['Add ({n})', 'Προσθήκη ({n})'], pkSelCancel: ['Cancel Selection', 'Ακύρωση Επιλογής'],
  pkHold: ['Hold an Exercise to Select Several', 'Κράτα Πατημένη μια Άσκηση για Πολλές Μαζί'], tpKgNote: ['Weights are added when you do this exercise in a workout.', 'Τα κιλά μπαίνουν όταν κάνεις την άσκηση σε προπόνηση.'], pkHave: ['Already In This Workout', 'Υπάρχει Ήδη στην Προπόνηση'],
  pkSearchPh: ['Search Exercises…', 'Αναζήτηση Ασκήσεων…'], pkClear: ['Clear Search', 'Καθαρισμός Αναζήτησης'],
  cxLib: ['Exercise Library', 'Βιβλιοθήκη Ασκήσεων'], cxImportL: ['Import Exercise QR', 'Εισαγωγή Άσκησης από QR'],
  cxName: ['Exercise Name', 'Όνομα Άσκησης'], cxRequired: ['Required', 'Υποχρεωτικό'], cxNamePh: ['e.g. Single-Arm Cable Press', 'π.χ. Πιέσεις Καλωδίου Με Ένα Χέρι'],
  cxMusT: ['Muscles Used', 'Μύες που Δουλεύουν'], cxMusSub: ['Select on map or below', 'Επίλεξε στον χάρτη ή από κάτω'],
  cxZoomIn: ['Zoom In', 'Μεγέθυνση'], cxZoomOut: ['Zoom Out', 'Σμίκρυνση'], cxReset: ['Reset', 'Επαναφορά'],
  cxMapHint: ['Tap a muscle · Hold for multiple · Pinch to zoom', 'Πάτα έναν μυ · Κράτα για πολλούς · Τσίμπημα για ζουμ'],
  cxMapTap: ['Tap a muscle to select', 'Πάτα έναν μυ για επιλογή'], cxMapMany: ['Tap the map to add muscles', 'Πάτα στον χάρτη για να προσθέσεις μυς'],
  cxChooseMany: ['Choose Muscles', 'Επίλεξε Μυς'], cxChooseHead: ['Choose {n} Head', 'Επίλεξε Κεφαλή: {n}'], cxComplete: ['Selection Complete', 'Η Επιλογή Ολοκληρώθηκε'],
  cxHoldMany: ['Hold for multiple', 'Κράτα για πολλά'], cxTapToggle: ['Tap to add or remove', 'Πάτα για προσθήκη ή αφαίρεση'],
  cxMus1: ['1 muscle selected', '1 μυς επιλεγμένος'], cxMusN: ['{n} muscles selected', '{n} μύες επιλεγμένοι'],
  cxHead1: ['1 head selected', '1 κεφαλή επιλεγμένη'], cxHeadN: ['{n} heads selected', '{n} κεφαλές επιλεγμένες'], cxAllHeads: ['All heads', 'Όλες οι κεφαλές'],
  cxSingle: ['Single mode', 'Ένα τη φορά'], cxOf: ['{i} of {n}', '{i} από {n}'], cxOfL: ['Muscle {i} of {n}', 'Μυς {i} από {n}'],
  cxChMus: ['Change Muscle', 'Αλλαγή Μυός'], cxChHead: ['Change Head', 'Αλλαγή Κεφαλής'], cxChEq: ['Change Equipment', 'Αλλαγή Εξοπλισμού'],
  cxNoMus: ['No muscles selected', 'Δεν επιλέχθηκαν μύες'], cxPrimary: ['Primary', 'Κύριος'], cxSecondary: ['Secondary', 'Δευτερεύων'],
  cxMakePri: ['Make {n} the primary muscle', 'Κάνε τον μυ {n} κύριο'], cxRemove: ['Remove {n}', 'Αφαίρεση: {n}'],
  cxMoveT: ['Movement Options', 'Επιλογές Κίνησης'], cxUniT: ['Track Each Side', 'Κάθε Πλευρά Χωριστά'], cxUniSub: ['Log left and right separately', 'Καταγραφή αριστερά και δεξιά χωριστά'],
  cxIntelT: ['Exercise Intelligence', 'Έξυπνες Λειτουργίες'], cxAuto: ['Automatic', 'Αυτόματα'],
  cxNoRank: ['Ranking Unavailable', 'Χωρίς Κατάταξη'], cxNoRankSub: ['Custom exercises aren’t ranked.', 'Οι δικές σου ασκήσεις δεν κατατάσσονται.'],
  cxRecT: ['RECOVERY+ · Provisional', 'RECOVERY+ · Προσωρινή'], cxRecSub: ['Conservative estimates from selected muscles and logged sets. Unknown stays unknown.', 'Συντηρητική εκτίμηση από τους μυς που διάλεξες και τα σετ σου. Ό,τι δεν είναι γνωστό μένει άγνωστο.'],
  cxShareHint: ['Share by QR · Custom exercises transfer with workout templates.', 'Κοινοποίηση με QR · Οι δικές σου ασκήσεις μεταφέρονται μαζί με τις προπονήσεις.'],
  cxSave: ['Create & Add Exercise', 'Δημιουργία & Προσθήκη'],
  cxNeedName: ['Enter an exercise name.', 'Γράψε όνομα άσκησης.'], cxNeedMus: ['Select at least one muscle on the map or from the pills.', 'Επίλεξε τουλάχιστον έναν μυ στον χάρτη ή από τις επιλογές.'],
  cxNeedEq: ['Choose equipment to create the exercise.', 'Επίλεξε εξοπλισμό για να δημιουργηθεί η άσκηση.'],
  cxReused: ['You already have this exercise: reused it', 'Την έχεις ήδη: χρησιμοποιήθηκε αυτή'],
  cxEachSide: ['Each Side', 'Κάθε Πλευρά'], cxBothSides: ['Both Sides', 'Και οι Δύο Πλευρές'],
  cxShareQR: ['Share Exercise QR', 'Κοινοποίηση Άσκησης με QR'], cxShareMeta: ['Exercise details only · No personal data', 'Μόνο η άσκηση · Χωρίς προσωπικά στοιχεία'],
  cxScanT: ['Scan an Exercise', 'Σάρωση Άσκησης'], cxScanSub: ['Point the camera at an exercise or workout QR code.', 'Στόχευσε την κάμερα σε QR άσκησης ή προπόνησης.'],
  cxBadCode: ['This isn’t a valid exercise code.', 'Αυτός δεν είναι έγκυρος κωδικός άσκησης.'],
  cxImported: ['{n} imported', 'Εισήχθη: {n}'], cxHaveIt: ['You already have {n}', 'Έχεις ήδη: {n}'],
  wqTooBig: ['This workout is too big for one QR code. Remove a few exercises and try again.', 'Αυτή η προπόνηση είναι πολύ μεγάλη για ένα QR. Αφαίρεσε μερικές ασκήσεις και δοκίμασε ξανά.'],
});

Object.assign(S, {   // Settings › AI › AI Provider (wire/08 drawAiProv): each provider keeps its own key and models
  aiProvT: ['AI Provider', 'Πάροχος AI'], provGemini: ['Gemini', 'Gemini'], provAnthropic: ['Claude', 'Claude'], provOpenai: ['OpenAI', 'OpenAI'], provOpenrouter: ['OpenRouter', 'OpenRouter'],
  aiKeyFor: ['{p} API Key', 'Κλειδί API {p}'], aiModelFor: ['{p} Model', 'Μοντέλο {p}'],
  aiModelAdv: ['Model for Hard Jobs (Optional)', 'Μοντέλο για Δύσκολες Δουλειές (Προαιρετικό)'], aiModelAdvPh: ['The strongest your key allows', 'Το πιο δυνατό που επιτρέπει το κλειδί σου'],
  aiProvInUse: ['{p} is in use.', 'Σε χρήση: {p}.'], aiProvSaveToUse: ['Tap Save Settings to use {p}. Until then {q} stays in use.', 'Πάτησε Αποθήκευση ρυθμίσεων για να χρησιμοποιηθεί το {p}. Μέχρι τότε μένει σε χρήση το {q}.'],
  aiProvPaid: ['{p} charges your own account for each request. The key stays on this phone and is never put in backups.', 'Το {p} χρεώνει τον δικό σου λογαριασμό για κάθε αίτημα. Το κλειδί μένει σε αυτό το τηλέφωνο και δεν μπαίνει ποτέ σε αντίγραφα ασφαλείας.'],
  aiProvNoSearch: ['Web look-ups (Check My Foods, branded foods, unknown barcodes) need Gemini; everything else works.', 'Οι αναζητήσεις στο διαδίκτυο (Έλεγχος τροφίμων, επώνυμα τρόφιμα, άγνωστα barcode) θέλουν Gemini· όλα τα άλλα δουλεύουν.'],
  aiErrNoSearch: ['{p} can’t look things up on the web here. Choose Gemini in Settings › AI for this.', 'Το {p} δεν μπορεί να ψάξει στο διαδίκτυο εδώ. Διάλεξε Gemini στις Ρυθμίσεις › AI για αυτό.'],
  aiErrNoPhoto: ['{p} can’t read photos here. Choose another provider in Settings › AI for this.', 'Το {p} δεν μπορεί να διαβάσει φωτογραφίες εδώ. Διάλεξε άλλον πάροχο στις Ρυθμίσεις › AI για αυτό.'],
  keyOk1: ['Key works.', 'Το κλειδί δουλεύει.'],
  aiErrNoKey: ['This needs an AI key. Add one in Settings › AI.', 'Χρειάζεται κλειδί AI. Πρόσθεσέ το στις Ρυθμίσεις › AI.'],
  aiErrModel: ['That AI model isn’t available for this key. Check the model name in Settings › AI, or leave it empty for the default.', 'Αυτό το μοντέλο AI δεν είναι διαθέσιμο για αυτό το κλειδί. Έλεγξε το όνομα στις Ρυθμίσεις › AI, ή άφησέ το κενό για το προεπιλεγμένο.'],
});

Object.assign(S, {   // Food Coach: one AI request per message (today.js logQAnswer / logQSuggest)
  logQSuggOff: ['Meal ideas need the AI, and it can’t be reached right now. Try again in a moment.', 'Οι ιδέες για γεύματα θέλουν το AI, που δεν είναι διαθέσιμο τώρα. Δοκίμασε ξανά σε λίγο.'],
  logQSuggSpent: ['Ask me “What should I eat?” and I’ll suggest meals that fit what’s left today.', 'Ρώτα με «Τι να φάω;» και θα σου προτείνω γεύματα που χωράνε σε ό,τι απομένει σήμερα.'],
});

Object.assign(S, {   // Athlete OS handoff (coach.js): a clear question for the other coach is answered by it in the same chat
  coachHandoff: ['{n} is answering', 'Απαντά: {n}'],
});

Object.assign(S, {   // Settings › AI › What You Told the Coaches: edit a note (wire/08 drawAiMem / memSave)
  memEditL: ['Edit Note', 'Επεξεργασία Σημείωσης'], memEdited: ['Note updated', 'Η σημείωση ενημερώθηκε'],
  memEditEmpty: ['Write something, or delete the note instead.', 'Γράψε κάτι, ή διάγραψε τη σημείωση.'],
  memEditBad: ['That can’t be kept as a note. Write a plain fact about you, like “My left knee hurts on squats”.', 'Αυτό δεν μπορεί να κρατηθεί ως σημείωση. Γράψε ένα απλό γεγονός για σένα, π.χ. «Με πονάει το αριστερό γόνατο στα squat».'],
  memEditGone: ['That note was deleted meanwhile.', 'Η σημείωση διαγράφηκε στο μεταξύ.'],
});

Object.assign(S, {   // Athlete Rank v0.4 (gym.js rankNaBadge / showRankNa / rankNextTxt)
  rankNaT: ['Ranking not available', 'Η κατάταξη δεν είναι διαθέσιμη'],
  rankNaMachine: ['This exercise can still be tracked for workouts, personal records, and progress, but competitive ranking is unavailable because machine and cable resistance varies between equipment and gyms.',
    'Αυτή η άσκηση καταγράφεται κανονικά στις προπονήσεις, στα ρεκόρ και στην πρόοδό σου, αλλά δεν έχει κατάταξη, γιατί η αντίσταση στα μηχανήματα και στις τροχαλίες διαφέρει από μηχάνημα σε μηχάνημα και από γυμναστήριο σε γυμναστήριο.'],
  rankNaOther: ['This exercise can still be tracked for workouts, personal records, and progress, but competitive ranking is unavailable because this equipment’s resistance can’t be compared fairly between people.',
    'Αυτή η άσκηση καταγράφεται κανονικά στις προπονήσεις, στα ρεκόρ και στην πρόοδό σου, αλλά δεν έχει κατάταξη, γιατί η αντίσταση αυτού του εξοπλισμού δεν συγκρίνεται δίκαια ανάμεσα σε ανθρώπους.'],
  rankNaData: ['There isn’t enough reliable benchmark data to rank this exercise yet. It can still be tracked for workouts, personal records, and progress.',
    'Δεν υπάρχουν ακόμα αρκετά αξιόπιστα δεδομένα αναφοράς για να έχει κατάταξη αυτή η άσκηση. Καταγράφεται κανονικά στις προπονήσεις, στα ρεκόρ και στην πρόοδό σου.'],
  rankNaProtocol: ['This exercise is measured in a way that can’t be compared fairly (speed, time or an uneven load), so it has no ranking. It can still be tracked for workouts, personal records, and progress.',
    'Αυτή η άσκηση μετριέται με τρόπο που δεν συγκρίνεται δίκαια (ταχύτητα, χρόνος ή άνιση φόρτιση), οπότε δεν έχει κατάταξη. Καταγράφεται κανονικά στις προπονήσεις, στα ρεκόρ και στην πρόοδό σου.'],
  rankNaAssist: ['Assisted sets are tracked for personal records and progress, but they are not ranked.', 'Τα υποβοηθούμενα σετ καταγράφονται για ρεκόρ και πρόοδο, αλλά δεν έχουν κατάταξη.'],
  tierNextSet: ['{w} kg × {r} reps', '{w} kg × {r} επαναλήψεις'], tierNextReps: ['{r} strict reps', '{r} καθαρές επαναλήψεις'], tierNextAdd: ['+{a} kg × {r} reps', '+{a} kg × {r} επαναλήψεις'],
  tierNextBeat: ['Beat your best set to move up', 'Ξεπέρασε το καλύτερο σετ σου για να ανέβεις'], tierGap2: ['{what} for {tier}', '{what} για {tier}'],
  rankProt: ['Protected this season: new benchmarks lowered this rank by at most two levels.', 'Προστατεύεται αυτή τη σεζόν: τα νέα δεδομένα αναφοράς χαμήλωσαν αυτή την κατάταξη το πολύ κατά δύο επίπεδα.'],
});

Object.assign(S, {   // Social Hub: the Friends spot next to your picture (friends need accounts, 0.8+)
  pfFriendsSoon: ['Friends Soon', 'Φίλοι Σύντομα'],
});

Object.assign(S, {   // Food Library: the My Meals Coming Soon tile and pill (not built yet)
  tabMyMeals: ['My Meals', 'Τα Γεύματά Μου'],
});

Object.assign(S, {   // Beta profiler (js/profiler.js)
  stBeta: ['User Profile (Beta)', 'Προφίλ Χρήστη (Beta)'],
  betaSub: ['This pre-release build quietly keeps a profile of how you use the app and how your training goes. Nothing is sent anywhere. Tap Export and send the file to the developer.', 'Αυτή η δοκιμαστική έκδοση κρατά διακριτικά ένα προφίλ για το πώς χρησιμοποιείς την εφαρμογή και πώς πάει η προπόνησή σου. Τίποτα δεν στέλνεται πουθενά. Πάτα Εξαγωγή και στείλε το αρχείο στον δημιουργό.'],
  betaExport: ['Export Profile', 'Εξαγωγή Προφίλ'],
  betaDone: ['Profile file ready.', 'Το αρχείο προφίλ είναι έτοιμο.'],
});

Object.assign(S, {   // Left / Right and the load convention beside the weight (js/gym-lat.js, gym.js › cvChip)
  cvT: ['How To Count This Exercise', 'Πώς Μετράς Αυτή Την Άσκηση'],
  cvHand: ['Per Hand', 'Ανά Χέρι'], cvHand2: ['Per Bell · 2 Bells', 'Ανά Αλτήρα · 2 Αλτήρες'], cvOne: ['One Bell', 'Ένας Αλτήρας'], cvTotal: ['Total Of Both Bells', 'Σύνολο Των Δύο Αλτήρων'],
  cvBar: ['Bar Total', 'Σύνολο Μπάρας'], cvStack: ['Stack', 'Στοίβα'], cvStackSide: ['Stack Per Side', 'Στοίβα Ανά Πλευρά'],
  cvRepsSide: ['Reps Each Side', 'Επαναλήψεις Ανά Πλευρά'], cvRepsBoth: ['Reps Together', 'Επαναλήψεις Μαζί'],
  cvPick: ['Choose How To Count', 'Διάλεξε Πώς Μετράς'], cvPickFirst: ['Choose how this is counted before the first set.', 'Διάλεξε πώς μετριέται πριν το πρώτο σετ.'],
  cvLocked: ['This can only change before the first finished set.', 'Αυτό αλλάζει μόνο πριν το πρώτο ολοκληρωμένο σετ.'],
  oneSideL: ['Left Only', 'Μόνο Αριστερά'], oneSideR: ['Right Only', 'Μόνο Δεξιά'], bothSides: ['Both Sides', 'Και Οι Δύο Πλευρές'],
});
