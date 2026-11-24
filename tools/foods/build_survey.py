"""Compile selected generic preparations from the official October 2024 FNDDS JSON archive.
Run: python tools/foods/build_survey.py path/to/FoodData_Central_survey_food_json_2024-10-31.zip
The dictionary accepts only complete descriptions for which every qualifier is translated.
"""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = {}
def group(cat, sub, terms):
    for pair in terms.split('|'):
        en, el = pair.split('=')
        BASE[en] = (el, cat, sub)

group('meat','chicken','chicken breast=Στήθος κοτόπουλου|chicken thigh=Μπούτι κοτόπουλου|chicken drumstick=Κοπανάκι κοτόπουλου|chicken wing=Φτερούγα κοτόπουλου|chicken leg=Ολόκληρο μπούτι κοτόπουλου')
group('meat','turkey','turkey=Γαλοπούλα|ground turkey=Κιμάς γαλοπούλας')
group('meat','beef','beef=Μοσχάρι|ground beef=Μοσχαρίσιος κιμάς')
group('meat','pork','pork=Χοιρινό|pork chop=Χοιρινή μπριζόλα')
group('pasta','pasta','pasta=Ζυμαρικά|pasta with tomato-based sauce=Ζυμαρικά με κόκκινη σάλτσα|pasta with cream sauce=Ζυμαρικά με σάλτσα κρέμας|ravioli=Ραβιόλια|tortellini=Τορτελίνια|lasagna=Λαζάνια|macaroni or pasta salad=Μακαρονοσαλάτα')
group('rice','rice','rice=Ρύζι')
group('rice','general','bulgur=Πλιγούρι|quinoa=Κινόα|couscous=Κουσκούς|barley=Κριθάρι')
group('legumes','beans','black beans=Μαύρα φασόλια|pinto beans=Φασόλια πίντο|kidney beans=Φασόλια κίντνεϊ|lima beans=Φασόλια λίμα|white beans=Λευκά φασόλια|blackeyed peas=Μαυρομάτικα φασόλια|soybeans=Φασόλια σόγιας')
group('legumes','chickpeas','chickpeas=Ρεβίθια')
group('legumes','lentils','lentils=Φακές')
group('eggs','egg','egg=Αυγό|egg white=Ασπράδι αυγού|egg omelet or scrambled egg=Ομελέτα ή αυγά σκραμπλ|egg salad=Αυγοσαλάτα')
group('fish','fishgen','salmon=Σολομός|cod=Μπακαλιάρος|tilapia=Τιλάπια|trout=Πέστροφα|haddock=Εγκλεφίνος|tuna=Τόνος|sardines=Σαρδέλες|flounder=Πλευρονήκτης|catfish=Γατόψαρο|mackerel=Σκουμπρί')
group('fish','shrimp','shrimp=Γαρίδες')
group('veg','general','carrots=Καρότα|green beans=Φασολάκια|corn=Καλαμπόκι|green peas=Αρακάς|spinach=Σπανάκι|broccoli=Μπρόκολο|cabbage=Λάχανο|sweet potato=Γλυκοπατάτα|asparagus=Σπαράγγια|peppers=Πιπεριές|classic mixed vegetables=Κλασικό μείγμα λαχανικών|cauliflower=Κουνουπίδι|mushrooms=Μανιτάρια|summer squash=Καλοκαιρινά κολοκύθια|onions=Κρεμμύδια|tomatoes=Ντομάτες|beets=Παντζάρια|collards=Λαχανίδες τύπου collard|turnip greens=Φύλλα γογγυλιού|kale=Λαχανίδα κέιλ|okra=Μπάμιες|brussels sprouts=Λαχανάκια Βρυξελλών|eggplant=Μελιτζάνα|pumpkin=Κολοκύθα')
group('veg','potato','potato=Πατάτα|potato salad=Πατατοσαλάτα|potato salad with egg=Πατατοσαλάτα με αυγό')
group('ready','meal','pizza=Πίτσα|pizza with cheese=Πίτσα με τυρί|white pizza=Λευκή πίτσα|pizza with pepperoni=Πίτσα με πεπερόνι|tuna salad=Τονοσαλάτα|chicken or turkey salad=Σαλάτα κοτόπουλου ή γαλοπούλας|burrito=Μπουρίτο|taco=Τάκο|burrito bowl=Μπολ μπουρίτο|quesadilla=Κεσαδίγια|stew=Φαγητό κατσαρόλας|soup=Σούπα')
# Noun phrases after the food name keep preparation, ingredients and edible portion explicit in Greek.
TRANSLATIONS = """
cooked=μαγειρεμένο
no added fat=χωρίς πρόσθετο λίπος
fat added=με πρόσθετο λίπος
canned=κονσέρβας
fried=τηγάνισμα
with cheese=με τυρί
cheese=τυρί
frozen=κατεψυγμένο
white=λευκό
brown=καστανό
brown and wild=καστανό και άγριο
white and wild=λευκό και άγριο
plain=σκέτο
whole grain=ολικής άλεσης
reduced sodium=μειωμένο νάτριο
coated=με επικάλυψη
fresh=φρέσκο
baked=στον φούρνο
skin eaten=με την πέτσα
skin not eaten=χωρίς την πέτσα στο πιάτο
baked or broiled=στον φούρνο ή στο γκριλ
baked, broiled, or roasted with marinade=στον φούρνο ή στο γκριλ με μαρινάδα
baked, broiled, or roasted=στον φούρνο ή στο γκριλ
with meat=με κρέας
cooked with oil=με λάδι στο μαγείρεμα
cooked with butter or margarine=με βούτυρο ή μαργαρίνη στο μαγείρεμα
made with oil=με λάδι
made with butter=με βούτυρο
made with margarine=με μαργαρίνη
with corn=με καλαμπόκι
with peas=με αρακά
with carrots=με καρότα
with peas and carrots=με αρακά και καρότα
with beans=με φασόλια
with vegetables=με λαχανικά
and added vegetables=με επιπλέον λαχανικά
with chicken=με κοτόπουλο
and chicken=και κοτόπουλο
with beef=με μοσχάρι
with seafood=με θαλασσινά
with chicken or turkey=με κοτόπουλο ή γαλοπούλα
made with water=με νερό
no sauce=χωρίς σάλτσα
no dressing=χωρίς ντρέσινγκ
meatless=χωρίς κρέας
thin crust=με λεπτή ζύμη
medium crust=με ζύμη μέτριου πάχους
thick crust=με χοντρή ζύμη
home recipe=σπιτική συνταγή
roasted=ψητό
grilled=στη σχάρα
grilled without sauce=στη σχάρα χωρίς σάλτσα
grilled with sauce=στη σχάρα με σάλτσα
from frozen=από κατεψυγμένο
from fresh=από φρέσκο
from canned=από κονσέρβα
from raw=από ωμό
from dried=από αποξηραμένο
from pre-cooked=από προμαγειρεμένο
steak=μπριζόλα
scrambled=σκραμπλ
whole=ολόκληρο
fried egg=αυγό μάτι
drumstick and thigh=κοπανάκι και μηρός
rotisserie=σούβλας
stewed=μαγειρεμένο στην κατσαρόλα
sauteed=σοτέ
prepared skinless=παρασκευή χωρίς πέτσα
coating eaten=με την επικάλυψη
skin / coating eaten=με την πέτσα ή την επικάλυψη στο πιάτο
skin / coating not eaten=χωρίς την πέτσα ή την επικάλυψη στο πιάτο
breaded=παναρισμένο
boiled=βραστό
steamed=στον ατμό
mashed=σε πουρέ
peel eaten=με τη φλούδα
peel not eaten=χωρίς τη φλούδα
with gravy=με σάλτσα κρέατος
with tomato-based sauce=με σάλτσα ντομάτας
with tomato sauce=με κόκκινη σάλτσα
with cream sauce=με σάλτσα κρέμας
cheese-filled=με γέμιση τυριού
meat-filled=με γέμιση κρέατος
with meat sauce=με σάλτσα κιμά
without meat=χωρίς κρέας
with egg=με αυγό
with bacon=με μπέικον
with ham=με ζαμπόν
with sausage=με λουκάνικο
with ham or bacon=με ζαμπόν ή μπέικον
with meat and cheese=με κρέας και τυρί
with cheese and vegetables=με τυρί και λαχανικά
with meat and vegetables=με κρέας και λαχανικά
with meat, cheese, and vegetables=με κρέας, τυρί και λαχανικά
made with mayonnaise=με μαγιονέζα
made with light mayonnaise=με ελαφριά μαγιονέζα
made with animal fat or meat drippings=με ζωικό λίπος ή λίπος από ψητό κρέας
made with butter or margarine=με βούτυρο ή μαργαρίνη
french fries=τηγανητές πατάτες
pork=χοιρινό
beef=μοσχάρι
chicken=κοτόπουλο
vegetable=λαχανικών
chicken noodle=κοτόπουλο με νουντλς
minestrone=μινεστρόνε
lentil=φακές
split pea=σπασμένος αρακάς
tomato=ντομάτα
mushroom=μανιτάρι
vegetarian=χορτοφαγικό
"""
MOD = dict(row.split('=',1) for row in TRANSLATIONS.strip().splitlines())
KEYS = {1008:'kcal',1003:'protein',1005:'totalCarb',1004:'fat',1079:'fiber',1093:'sodium',1092:'potassium',2000:'sugar',1258:'satFat'}
def descriptors(rest):
    result = []
    while rest:
        term = next((t for t in sorted(MOD,key=len,reverse=True) if rest == t or rest.startswith(t+', ')), None)
        if not term: return []
        result.append(term)
        rest = rest[len(term):].removeprefix(', ')
    return result
def generate(archive):
    if hashlib.sha256(archive.read_bytes()).hexdigest() != 'dfb06ae7ddc397ccd570b91c14b75438ab2ba39f64f22d321f61d4a52a77f3eb':
        raise ValueError('Expected the official October 2024 JSON release')
    with zipfile.ZipFile(archive) as z:
        source = json.load(z.open('surveyDownload.json'))['SurveyFoods']
    result, seen = [], set()
    for food in source:
        desc = food['description']
        base, _, rest = desc.lower().partition(', ')
        if base not in BASE: continue
        mods = descriptors(rest)
        if not mods or all(t in {'raw','fresh','cooked','boiled','plain','no added fat','roasted','grilled','whole','white','brown','baked','frozen'} for t in mods): continue
        el,cat,sub = BASE[base]
        n = {KEYS[x['nutrient']['id']]: x['amount'] for x in food['foodNutrients'] if x['nutrient']['id'] in KEYS and x.get('amount') is not None}
        if any(k not in n for k in ('kcal','totalCarb','protein','fat','fiber')): continue
        n['carbs'] = round(n.pop('totalCarb')-n['fiber'],2)
        if min(n.values()) < 0 or n['protein']+n['carbs']+n['fiber']+n['fat']>101 or n['kcal']>910: continue
        signature = (base, n['kcal'],n['carbs'],n['protein'],n['fat'],n['fiber'])
        if signature in seen: continue
        seen.add(signature)
        if 'sodium' in n:n['salt']=round(n.pop('sodium')*.0025,5)
        id=food['fdcId']
        state='cooked' if cat in {'meat','fish','rice','pasta','eggs','legumes'} or any(re.search('cooked|stewed|mashed|boiled|fried|steamed|baked|roasted|grilled|sauteed|fat added',m) for m in mods) else 'ready'
        item=dict(gid=f'fndds_{id}',fdc=id,en=desc,el=el+' · '+', '.join(MOD[m] for m in mods),cat=cat,sub=sub,state=state,unit='g',**n)
        measures={}
        for p in food.get('foodPortions',[]):
            unit={'1 cup':'cup','1 tablespoon':'tbsp','1 teaspoon':'tsp','1 cup, diced':'cupDiced','1 cup, chopped':'cupChopped','1 cup, sliced':'cupSliced'}.get(p.get('portionDescription','').lower())
            if unit and p.get('gramWeight',0)>0:measures[unit]=p['gramWeight']
        if measures:item['measures']=measures
        result.append(item)
    out=ROOT/'js/data/foods-survey.js'
    out.write_text('// USDA FNDDS 2021–2023, per 100 g edible portion. Generated by tools/foods/build_survey.py.\nconst SURVEY_FOODS = [\n  '+',\n  '.join(json.dumps(row,ensure_ascii=False,separators=(',',':')) for row in result)+'\n];\n',encoding='utf8')
    print(len(result),'generic preparations')
if __name__=='__main__':
    generate(Path(sys.argv[1]))
