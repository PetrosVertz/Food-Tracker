#!/usr/bin/env node
// Nearby takeaway (js/nearby.js): the 20 km rule, without the network.  Run: node tools/nearby-test.js   (tools/check.js runs it too)
const fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let fails = 0; const ok = m => console.log('ok    ' + m), fail = m => { fails++; console.log('FAIL  ' + m); };
const check = (c, m) => c ? ok(m) : fail(m);

function load(ui, calls){
  const ctx = { console, ui, saveUI(){ calls.saved++; }, Phone: { locate: async o => calls.pos }, fetchT: async url => { calls.urls.push(url); return calls.resp; } };
  vm.createContext(ctx);
  vm.runInContext(read('js/data/portions.js') + '\n' + read('js/nearby.js') + '\n;this.N = Nearby; this.B = ASK_BRANDS;', ctx);
  return ctx;
}
const el = (name, lat, lon, extra) => ({ type: 'node', lat, lon, tags: { amenity: 'fast_food', name, ...(extra || {}) } });
const home = { lat: 37.98, lon: 23.73 };   // Athens

{
  const calls = { saved: 0, urls: [] }, c = load({}, calls), N = c.N;
  const q = N.query(home.lat, home.lon, c.B);
  check(/around:20000,37.98,23.73/.test(q) && /Domino/.test(q) && /Ντόμινο/.test(q) && /\[out:json\]/.test(q), 'query: 20 km round the rounded position, every chain by its Latin and Greek name');
  check(c.B.every(b => b.osm && b.osm.length > 3), 'every chain in ASK_BRANDS has its OpenStreetMap names (' + c.B.length + ')');
  const f = N.found([el('Pizza Fan', 37.99, 23.74), el('Pizza Fan', 38.0, 23.8), el('Domino\'s Pizza', 38.6, 23.73), el('Everest', 37.97, 23.72, { amenity: 'cafe' }),
    el('Everest Street Bar', 37.97, 23.72, { amenity: 'bar' }), { type: 'way', center: { lat: 37.9, lon: 23.7 }, tags: { amenity: 'fast_food', name: 'Γκούντις' } }, { tags: { amenity: 'fast_food' } }], c.B, home.lat, home.lon);
  check(f['Pizza Fan'] && f['Pizza Fan'].n === 2 && f['Pizza Fan'].km < 3, 'found: two Pizza Fan shops, the nearest about 1.5 km');
  check(!f["Domino's"], 'found: a Domino\'s 70 km away does not count, even if the server returned it');
  check(f.Everest && f.Everest.n === 1, 'found: a cafe named Everest counts, a bar named Everest Street does not');
  check(f["Goody's"] && f["Goody's"].n === 1, 'found: a shop with only the Greek name (Γκούντις) counts');
  check(Object.keys(f).length === 3, 'found: nothing else (' + Object.keys(f).join(', ') + ')');
}
{
  const day = 864e5, now = Date.now(), calls = { saved: 0, urls: [] };
  const t = u => { const c = load(u, calls); return c.N; };
  check(t({}).has('Pizza Fan') === null, 'has: nothing known (off) = null, so everything is offered as before');
  check(t({ nearby: { on: false } }).has('Pizza Fan') === null, 'has: switched off = null');
  check(t({ nearby: { on: true } }).has('Pizza Fan') === null, 'has: switched on but no answer yet = null');
  const u = { nearby: { on: true, at: now - 2 * day, brands: { 'Pizza Fan': { n: 2, km: 1.5 } } } };
  check(t(u).has('Pizza Fan') === true && t(u).has("Domino's") === false, 'has: a chain in the answer = true, a chain not in it = false (never offered)');
  check(t({ nearby: { on: true, at: now - 40 * day, brands: { 'Pizza Fan': { n: 1 } } } }).has("Domino's") === null, 'has: an answer older than 30 days is not trusted (null)');
}
(async () => {
  const day = 864e5;
  // refresh: asks the position quietly, one request, keeps only the answer; permission denied / network failure keep the last answer
  let calls = { saved: 0, urls: [], pos: home, resp: { ok: true, json: async () => ({ elements: [el('Pizza Fan', 37.99, 23.74)] }) } }, ui = { nearby: { on: true } }, c = load(ui, calls);
  await c.N.refresh({ force: true });
  check(calls.urls.length === 1 && /overpass/.test(calls.urls[0]) && ui.nearby.brands['Pizza Fan'] && ui.nearby.lat === 37.98 && calls.saved === 1, 'refresh: one request, the answer saved');
  await c.N.refresh();
  check(calls.urls.length === 1, 'refresh: a recent answer is not asked for again');
  ui.nearby.at -= 8 * day; calls.pos = { err: 'ask' }; await c.N.refresh();
  check(calls.urls.length === 1 && !ui.nearby.err, 'refresh: when the position is not allowed yet it stays quiet (no question, no request)');
  calls.pos = { err: 'denied' }; await c.N.refresh({ force: true });
  check(ui.nearby.err === 'denied' && ui.nearby.brands['Pizza Fan'], 'refresh: denied is remembered, the last answer stays');
  calls.pos = home; calls.resp = { ok: false, status: 504 }; await c.N.refresh({ force: true });
  check(ui.nearby.err === 'network' && ui.nearby.brands['Pizza Fan'] && c.N.has('Pizza Fan') === true, 'refresh: a failed request keeps the last answer');
  c.N.set(false); check(JSON.stringify(ui.nearby) === '{"on":false}', 'switching off forgets the position and the answer');
  console.log(fails ? `\n${fails} nearby problem(s).` : '\nAll nearby cases pass.'); process.exit(fails ? 1 : 0);
})();
