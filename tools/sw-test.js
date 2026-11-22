#!/usr/bin/env node
// Service worker (sw.js) offline + update rules, in a fake browser: no real network, no Playwright. Run: node tools/sw-test.js
// (The app only registers the worker on https, so a localhost browser run cannot exercise it; this drives its event handlers directly.)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
let fails = 0, passes = 0;
const check = (c, m) => { if (c) { passes++; console.log('ok    ' + m); } else { fails++; console.log('FAIL  ' + m); } };
const BASE = 'https://example.github.io/Food-Tracker/';

class Res {
  constructor(body, status, type) { this.body = body; this.status = status; this.type = type || 'basic'; this.ok = status >= 200 && status < 300; }
  clone() { return new Res(this.body, this.status, this.type); }
}
function world() {
  const stores = new Map(); let net = url => new Res('net:' + url, 200);
  const keyOf = (r, ignoreSearch) => { const u = new URL(typeof r === 'string' ? r : r.url, BASE); return ignoreSearch ? u.origin + u.pathname : u.href; };
  const cache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return { put: async (r, res) => { m.set(keyOf(r), res); }, match: async (r, o) => m.get(keyOf(r, o && o.ignoreSearch)) || (o && o.ignoreSearch ? [...m].find(([k]) => k.split('?')[0] === keyOf(r, true))?.[1] : undefined),
      addAll: async list => { for (const p of list) { const r = await net(new URL(p, BASE).href); if (!r.ok) throw new Error('addAll ' + p); m.set(new URL(p, BASE).href, r); } } };
  };
  const caches = { open: async n => cache(n), keys: async () => [...stores.keys()], delete: async n => stores.delete(n),
    match: async (r, o) => { for (const n of stores.keys()) { const hit = await cache(n).match(r, o); if (hit) return hit; } } };
  const handlers = {}; const flags = {};
  const self = { addEventListener: (t, f) => { handlers[t] = f; }, location: new URL(BASE + 'sw.js'), skipWaiting: () => { flags.skip = true; }, clients: { claim: () => { flags.claim = true; } } };
  const c = { self, caches, URL, Promise, Set, Map, location: { origin: new URL(BASE).origin }, fetch: async r => net(typeof r === 'string' ? r : r.url) };
  vm.createContext(c); vm.runInContext(SRC, c);
  const fire = async (type, req) => { let resp, waits = []; const e = { request: req, respondWith: p => { resp = p; }, waitUntil: p => waits.push(p) };
    handlers[type](e); await Promise.all(waits); const out = resp ? await resp : undefined; await Promise.all(waits); return { handled: !!resp, res: out }; };
  return { fire, stores, flags, setNet: f => { net = f; }, CACHE: vm.runInContext('CACHE', c) };
}
const get = (url, mode) => ({ url: new URL(url, BASE).href, method: 'GET', mode: mode || 'no-cors' });

(async () => {
  const w = world();
  await w.fire('install', {}); await w.fire('activate', {});
  check(w.stores.has(w.CACHE) && w.flags.skip && w.flags.claim, 'install: every SHELL file cached; new version takes over (skipWaiting + claim, by design)');
  const appJs = BASE + 'js/today.js';
  // online: a newer file replaces the cached one
  w.setNet(u => new Res('v2:' + u, 200));
  let r = await w.fire('fetch', get('js/today.js'));
  check(r.res.body === 'v2:' + appJs && (await w.stores.get(w.CACHE).get(appJs)).body === 'v2:' + appJs, 'online: network first, the cached copy is refreshed');
  // a broken deploy (404 / 500) must never replace the working offline copy
  w.setNet(u => new Res('error page', 404));
  await w.fire('fetch', get('js/today.js'));
  check(w.stores.get(w.CACHE).get(appJs).body === 'v2:' + appJs, 'a 404 answer does not replace the cached app file');
  w.setNet(u => new Res('oops', 500)); await w.fire('fetch', get('js/today.js?x=1'));
  check(w.stores.get(w.CACHE).get(appJs).body === 'v2:' + appJs, 'a 500 answer (even with ?query) does not replace the cached app file');
  // files that are not part of the app are not cached (no private or one-off answers kept)
  w.setNet(u => new Res('private', 200)); await w.fire('fetch', get('my-backup.json'));
  check(!w.stores.get(w.CACHE).has(BASE + 'my-backup.json'), 'a same-site file outside SHELL is not cached');
  // offline: app files and the start page come from the cache
  w.setNet(() => { throw new TypeError('offline'); });
  r = await w.fire('fetch', get('js/today.js?v=3'));
  check(r.res && r.res.body === 'v2:' + appJs, 'offline: app file served from cache (query ignored)');
  r = await w.fire('fetch', get(BASE + '?from=homescreen', 'navigate'));
  check(r.res && r.res.ok, 'offline: opening the app (with a query) gives the cached start page');
  // other sites (AI, food databases) are never touched; nor are POSTs
  r = await w.fire('fetch', get('https://generativelanguage.googleapis.com/v1beta/models'));
  check(!r.handled, 'AI and other sites: never intercepted or cached');
  r = await w.fire('fetch', { url: BASE + 'js/today.js', method: 'POST' });
  check(!r.handled, 'POST requests: never intercepted');
  // update: activating a new version removes old caches only
  w.stores.set('tracker-v0.0.1', new Map()); await w.fire('activate', {});
  check(!w.stores.has('tracker-v0.0.1') && w.stores.has(w.CACHE), 'update: old version caches removed, current kept');
  console.log(fails ? `\n${fails} service worker problem(s), ${passes} ok.` : `\nAll ${passes} service worker checks passed.`);
  process.exit(fails ? 1 : 0);
})();
