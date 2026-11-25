// Nearby takeaway: which chains have a shop within 20 km of you. (feature; globals: Nearby)
// Food Track · Gym Buddy — plain browser script (no build step). All files share one global scope; load order is set in index.html.
//
// Off until the person switches it on (Settings › Nearby Takeaway). Then the phone's position (Phone.locate: rounded to about 1 km) goes to
// OpenStreetMap's public Overpass service in ONE request that asks for the chains in ASK_BRANDS (js/data/portions.js) within 20 km. Only the answer is kept,
// on this phone: ui.nearby = { on, at, lat, lon, brands: { 'Domino's': { n: shops, km: nearest } }, err }. Never in a backup, never sent anywhere else.
// Nearby.has(name): true = a shop within 20 km, false = none within 20 km, null = not known (off, no position yet, or the answer is older than 30 days).
const Nearby = (() => {
  const KM = 20, REFRESH = 7 * 864e5, USE = 30 * 864e5, URL = 'https://overpass-api.de/api/interpreter';
  const kinds = '^(fast_food|restaurant|cafe|food_court)$';
  const esc = s => String(s).replace(/"/g, '\\"');

  // ---- pure (tools/nearby-test.js) ----
  function query(lat, lon, list){
    const rx = esc(list.map(b => b.osm).join('|')), around = `(around:${KM * 1000},${lat},${lon})`;
    return `[out:json][timeout:20];(nwr["amenity"~"${kinds}"]["name"~"${rx}",i]${around};nwr["amenity"~"${kinds}"]["brand"~"${rx}",i]${around};);out tags center 400;`;
  }
  const dist = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, dl = (c - a) * r, dn = (d - b) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  // elements from Overpass → { chain: { n, km } } for the chains with a shop within KM (the shop's own position is checked too, never only the server's word)
  function found(elements, list, lat, lon){
    const out = {};
    (elements || []).forEach(el => { const t = el.tags || {}, hay = [t.name, t['name:en'], t['name:el'], t.brand, t['brand:en'], t['brand:el'], t.operator].filter(Boolean).join(' ');
      if(!hay || !/^(fast_food|restaurant|cafe|food_court)$/.test(t.amenity || '')) return;
      const c = el.center || (el.lat != null ? { lat: el.lat, lon: el.lon } : null), km = c && lat != null ? dist(lat, lon, c.lat, c.lon) : null;
      if(km !== null && km > KM + .5) return;
      list.forEach(b => { if(new RegExp(b.osm, 'i').test(hay)){ const o = out[b.name] = out[b.name] || { n: 0, km: km === null ? null : Math.round(km * 10) / 10 };
        o.n++; if(km !== null && (o.km === null || km < o.km)) o.km = Math.round(km * 10) / 10; } }); });
    return out;
  }

  // ---- on the phone ----
  const state = () => (typeof ui !== 'undefined' && ui.nearby) || null;
  const chains = () => typeof ASK_BRANDS !== 'undefined' ? ASK_BRANDS : [];
  function has(name){ const s = state(); if(!s || !s.on || !s.brands || !s.at || Date.now() - s.at > USE) return null; return !!s.brands[name]; }
  const found_ = () => { const s = state(); return s && s.brands ? Object.keys(s.brands) : []; };
  // quiet: only when the position is already allowed (never opens the permission question by itself); force: ask now (the person just tapped)
  async function refresh(o){
    const s = state(); if(!s || !s.on) return null;
    if(!(o && o.force) && s.at && s.lat != null && Date.now() - s.at < REFRESH) return s;
    const p = await Phone.locate({ quiet: !(o && o.force) });
    if(p.err){ if(p.err !== 'ask'){ s.err = p.err; saveUI(); } return s; }
    try{
      const r = await fetchT(URL + '?data=' + encodeURIComponent(query(p.lat, p.lon, chains())), {}, 25000);
      if(!r.ok) throw new Error('http ' + r.status);
      const j = await r.json(); s.brands = found(j.elements, chains(), p.lat, p.lon); s.lat = p.lat; s.lon = p.lon; s.at = Date.now(); delete s.err;
    }catch(e){ s.err = 'network'; }
    saveUI(); return s;
  }
  function set(on){ if(on){ ui.nearby = { ...(ui.nearby || {}), on: true }; } else if(ui.nearby){ ui.nearby = { on: false }; } saveUI(); }   // off forgets the position and the answer
  return { KM, query, found, has, found_, refresh, set, state };
})();
