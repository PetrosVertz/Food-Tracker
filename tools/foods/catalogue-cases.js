// Run inside a disposable, freshly initialized app page (tools/foods/test.js).
async function foodCatalogueCases(){
  let checks = 0;
  function check(condition, description){
    if(!condition) throw Error(description);
    checks++;
  }
  const data = GEN;
  check(new Set(data.map(f => f.gid)).size === data.length, 'catalogue IDs must be unique');
  for(const f of data){
    check(f.en && f.el && CAT[f.cat]?.subs.some(s => s.id === f.sub), 'names/category: ' + f.gid);
    check([f.kcal, f.protein, f.carbs, f.fat].every(n => Number.isFinite(n) && n >= 0), 'nutrition: ' + f.gid);
    check(f.kcal <= 910 && Math.max(f.protein, f.carbs, f.fat) <= 101, 'per-100 range: ' + f.gid);
    if(f.fdc) check(f.unit === 'g' && f.fiber >= 0 && f.protein + f.carbs + f.fat + f.fiber <= 101, 'source basis: ' + f.gid);
  }
  for(const product of LABEL_FOODS.filter(f => f.barcode)) check(validGTIN(product.barcode), 'invalid product GTIN: ' + product.gid);
  const raw = GENBY.chicken_breast, roasted = GENBY.chicken_breast_c;
  check(raw.protein === 22.5 && roasted.protein === 31.02, 'chicken preparation');
  check(lwPer(logQState(logQGenInfo(raw), {qty:100,unit:'g'})).kcal === 120, 'raw chicken must log raw');
  check(GENBY.oats.measures.cup === 81 && GENBY.rice_cooked.measures.cup === 158, 'food-specific cup');
  check(!lwUnits(logQGenInfo(GENBY.cereal_bar)).some(u => u.k === 'cup'), 'cereal bar does not inherit a cereal cup');
  check(GENBY.chickpeas_c.carbs === 19.82, 'available carbohydrate excludes fibre only once');
  const product = {product_name:'Cereal bar', quantity:'6 x 35 g', serving_size:'1 bar (35 g)', nutriments:{
    'energy-kcal_100g':400, proteins_100g:10, carbohydrates_100g:60, fat_100g:12
  }};
  const scan = (changes={}) => offToFood({...product,...changes});
  const single = scan();
  check(single.pieces === 'bar' && single.piece === 35 && single.usualPack === 210, 'bar and multipack');
  check(scan({serving_size:'2 bars (70 g)'}).piece === 35, 'two-bar serving');
  check(scan({serving_size:'1/2 bar (17,5 g)'}).piece === 35, 'half-bar serving');
  check(scan({serving_size:'1 μπάρα (35 γρ)'}).piece === 35, 'Greek label');
  check(scan({serving_size:'70 g'}).piece == null, 'ambiguous serving stays a serving');
  check(scan({quantity:'35 g',serving_size:'35 g'}).piece === 35, 'single bar when one serving matches the packet');
  check(scan({quantity:'210 g',serving_size:'35 ml'}).piece == null && scan({quantity:'210 g',serving_size:'35 ml'}).serving == null, 'no volume-to-mass assumption');
  check(scan({serving_quantity:70,serving_quantity_unit:'g'}).piece == null, 'conflicting label metadata');
  check(scan({serving_size:'1 bar (35 g)',quantity:'6 bars of 35 g each'}).usualPack === 210, 'piece versus pack weight');
  check(scan({quantity:'5 x 42 g',serving_size:'2 bars (42 g)'}).piece === 21, 'inner packet is not one bar');
  check(scan({serving_size:null,quantity:'',product_name:'Bar'}).piece == null, 'unknown bar weight stays unknown');
  const photo = {name:'Cereal bar',unit:'g',packSize:210,quantityLabel:'6 x 35 g',servingLabel:'1 bar (35 g)'};
  photoPortions(photo);
  check(photo.piece===35 && photo.usualPack===210, 'photo label portion agrees with barcode rules');
  const plate = mealPortion({cookedWeight:840,recipe:{servings:3}});
  check(plate.k === 'serving' && plate.size===280, 'three weighed recipe servings');
  check(mealPortion({name:'Unweighed dinner',recipe:{servings:1}})===null, 'no generic plate weight');
  check(searchLocal('raw chicken breast',false).std.every(g => g.state !== 'cooked'), 'raw chicken search');
  const old = normFood({source:'openfoodfacts',pieces:'piece',serving:70,name:'Old bar',unit:'g'});
  check(foodPieceSize(old) == null, 'old serving-only barcode is not one piece');
  const savedOld = {...old, barcode:'5201127092236', pieces:'none', usualPack:50, serving:25};
  check(fInfo_(savedOld).piece===50 && savedOld.piece == null && fInfo_(savedOld).food.serving===25, 'older ION scan gains one bar on display only');
  check(barcodePortionsForView({...savedOld,updatedAt:'manual edit'}).pieces==='none', 'manual changes survive');
  const f = saveOnlineFood({...single,barcode:'demo-code'});
  openAmt({mode:'log',info:fInfo_(f)});
  check(num('amN') === 1 && num('amAmt') === 35 && AM.units[AM.u].k === 'pc', 'scanned bar opens as one');
  check($('amRes').textContent.includes('140 kcal'), 'label energy scaled by piece');
  close('ovAmt');
  LS.mine=[f]; LW.rows={};
  const st=lwState('m',0);
  check(st.n===1 && st.units[st.u].k==='pc' && lwCalc(st).g===35, 'saved bar opens as one');
  st.n=2;
  lwAdd(st);
  const logged=dayLog[curDay].at(-1);
  check(logged.amt===70 && logged.kcal===280, 'log/save scales once');
  check(foodPieceSize(saveOnlineFood({...single,barcode:'demo-code'})) === 35, 'rescan preserves saved portion');
  const labelled = GENBY.mountain_farms_cranberry_105;
  check(labelled.piece === 35 && labelled.usualPack === 105 && macrosFor(labelled,35).kcal === 149, 'Greek cereal bar label');
  scanCtx='log';
  await lookup('5201127092236');
  check(AM.info.food?.gid==='ion_caramel_50' && num('amAmt')===50 && AM.units[AM.u].k==='pc', 'ION offline barcode');
  check(macrosFor(AM.info.per,50).p === 10 && macrosFor(AM.info.per,50).kcal === 247,'ION label per bar');
  close('ovAmt');
  scanCtx='log';
  await lookup('8410076600790');
  const nvUnits = Object.fromEntries(AM.units.map(u => [u.k,u.size]));
  check(nvUnits.pc === 21 && nvUnits.serving === 42 && nvUnits.pack === 210, 'Nature Valley piece, serving and outer pack');
  close('ovAmt');
  const item=shopItem({code:'5201010015946'}); await shopLookup(item);
  check(item.gid==='misko_protein_penne_400' && item.size===400, 'grocery scanner uses offline label');
  check(searchLocal('πλευρωτους',false).std.some(g => g.gid === 'sr_168580'), 'Greek search without accents');
  check(searchLocal('oyster mushroom',false).std.some(g => g.gid === 'sr_168580'), 'English search');
  return checks;
}
