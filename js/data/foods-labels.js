// Per 100 g from the manufacturer or the Greek retailer’s label transcription. Source references are kept with each SKU.
const LABEL_FOODS = [
  { gid: 'ion_caramel_50', en: 'ION Caramel Protein Bar', el: 'ION Μπάρα Πρωτεΐνης Καραμέλα',
    alias: 'ion caramel bar ion mpara karamela', brand: 'ION', barcode: '5201127092236',
    cat: 'supps', sub: 'bar', state: 'ready', unit: 'g', kcal: 493, protein: 20, carbs: 46.4, fat: 26,
    sugar: 41.2, satFat: 15.7, salt: 0.75, pieces: 'bar', piece: 50, usualPack: 50, packs: [50],
    labelUrl: 'https://ion.gr/el/products', barcodeUrl: 'https://pitsias.gr/sokolates/ion-mpara-proteinis-me-karamela-50gr' },
  { gid: 'misko_protein_penne_400', en: 'MISKO Protein Penne Rigate, dry', el: 'MISKO Πέννε Ριγκάτε Protein, ξηρές',
    alias: 'high protein pasta πέννες πρωτεΐνης', brand: 'MISKO', barcode: '5201010015946',
    cat: 'pasta', sub: 'pasta', state: 'uncooked', unit: 'g', kcal: 351, protein: 20, carbs: 61, fat: 2.2,
    fiber: 3.5, sugar: 1.9, satFat: 0.5, usualPack: 400, packs: [400], serving: 100,
    labelUrl: 'https://www.misko.gr/zymarika/penne-rigkate-protein/', barcodeUrl: 'https://www.miskocontest.gr/katharisarakosti' },
  { gid: 'mountain_farms_cranberry_105', en: 'Mikres Farmes tou Vounou Cranberry Oat Cereal Bar', el: 'Μικρές Φάρμες του Βουνού Μπάρα Δημητριακών με Κράνμπερι και Βρώμη',
    alias: 'cranberries mpara vromis kranmperi', brand: 'Μικρές Φάρμες του Βουνού',
    cat: 'supps', sub: 'bar', state: 'ready', unit: 'g', kcal: 425, protein: 5.3, carbs: 65, fat: 15,
    fiber: 5.3, sugar: 35, satFat: 6, salt: 0.11, pieces: 'bar', piece: 35, usualPack: 105, packs: [105],
    labelUrl: 'https://www.market-in.gr/el-gr/trofima-dhmhtriaka-dhmhtriaka-mpares/mikres-farmes-tou-vounou-mpara-dhmhtriakon-me-kranmperi-kai-traganes-nifades-vromhs-3x35-gr-' },
  { gid: 'nature_valley_honey_210', en: 'Nature Valley Crunchy Oats & Honey Cereal Bars', el: 'Nature Valley Crunchy Μπάρες Δημητριακών με Βρώμη και Μέλι',
    alias: 'nature valley vromi meli oat honey granola bar', brand: 'Nature Valley', barcode: '8410076600790',
    cat: 'supps', sub: 'bar', state: 'ready', unit: 'g', kcal: 467, protein: 8.7, carbs: 64.3, fat: 18.1,
    fiber: 6.4, sugar: 26.8, satFat: 2.2, salt: 0.85, pieces: 'bar', piece: 21, serving: 42, usualPack: 210, packs: [210],
    labelUrl: 'https://www.sklavenitis.gr/eidi-proinoy-rofimata/mpares-dimitriakon-mpares-proteinis-ryzogofretes/mpares-dimitriakon-xiron-karpon/nature-valley-crunchy-mpares-dimitriakon-me-vromi--meli-5x42gr-1594465/',
    barcodeUrl: 'https://www.savageandwhitten.com/product-detail?code=101081' }
];
