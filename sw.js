// Keeps the app shell available offline. Network first, so updates show up straight away.
const CACHE = 'tracker-v0.7.10.7';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'icon-maskable-512.png',
  'css/base.css',
  'css/glass.css',
  'css/motion.css',
  'css/layout.css',
  'css/workout.css',
  'css/theme.css',
  'js/data/config.js',
  'js/platform/store.js',
  'js/platform/backup.js',
  'js/platform/phone.js',
  'js/platform/ai-provider.js',
  'js/platform/ai-usage.js',
  'js/platform/ai.js',
  'js/data/strings.js',
  'js/data/foods.js',
  'js/data/foods-more.js',
  'js/data/portions.js',
  'js/data/gym.js',
  'js/data/gym-anatomy.js',
  'js/data/recovery-anatomy.js',
  'js/data/rank-bench.js', 'js/data/rank-v04.js',
  'licenses/body-muscles/LICENSE.txt',
  'licenses/body-muscles/NOTICE.txt',
  'js/core.js',
  'js/draft.js', 'js/ui.js', 'js/coach.js',
  'js/food.js',
  'js/search.js', 'js/exsearch.js',
  'js/supplements.js',
  'js/food-coach.js',
  'js/today.js',
  'js/meal.js',
  'js/fridge.js',
  'js/shop.js',
  'js/receipt.js',
  'js/recovery-anatomy.js',
  'js/recovery-plus.js',
  'js/gym.js',
  'js/gym-intel.js',
  'js/streak.js',
  'js/vendor/qrcode.js',
  'js/gym-share.js', 'js/excustom.js', 'js/expick.js', 'js/excreate.js', 'js/progress.js', 'js/profile.js', 'js/rank-fx.js', 'js/rank-engine.js', 'js/rank-v04.js', 'js/know.js', 'js/athlete/events.js', 'js/athlete/memory.js', 'js/athlete/state.js', 'js/athlete/context.js', 'js/athlete/persona.js', 'js/athlete/supervisor.js',
  'js/wire/01-core.js',
  'js/wire/02-food.js',
  'js/wire/03-fridge-today.js',
  'js/wire/04-gym.js',
  'js/wire/05-nav-cook-gym.js',
  'js/wire/06-launcher-logging-shop.js',
  'js/wire/07-fridge-stack-motion.js',
  'js/wire/08-settings-boot.js',
  'js/wire/09-tabs-targets-recovery.js',
  'js/wire/10-workout.js',
  // 0.7.10.2 rank plates (rankIcon in gym.js): 15 ranks, large (36 px and up) and small
  'img/rank/large/bronze-III.svg', 'img/rank/large/bronze-II.svg', 'img/rank/large/bronze-I.svg',
  'img/rank/large/silver-III.svg', 'img/rank/large/silver-II.svg', 'img/rank/large/silver-I.svg',
  'img/rank/large/gold-III.svg', 'img/rank/large/gold-II.svg', 'img/rank/large/gold-I.svg',
  'img/rank/large/platinum-III.svg', 'img/rank/large/platinum-II.svg', 'img/rank/large/platinum-I.svg',
  'img/rank/large/diamond-III.svg', 'img/rank/large/diamond-II.svg', 'img/rank/large/diamond-I.svg',
  'img/rank/small/bronze-III.svg', 'img/rank/small/bronze-II.svg', 'img/rank/small/bronze-I.svg',
  'img/rank/small/silver-III.svg', 'img/rank/small/silver-II.svg', 'img/rank/small/silver-I.svg',
  'img/rank/small/gold-III.svg', 'img/rank/small/gold-II.svg', 'img/rank/small/gold-I.svg',
  'img/rank/small/platinum-III.svg', 'img/rank/small/platinum-II.svg', 'img/rank/small/platinum-I.svg',
  'img/rank/small/diamond-III.svg', 'img/rank/small/diamond-II.svg', 'img/rank/small/diamond-I.svg'];

// Update policy (V3 hardening, deliberate): a new version installs and takes over at once (skipWaiting + clients.claim). An open page is
// NOT reloaded: it keeps the code it already loaded, so a live workout carries on; the new version is used at the next start.
// Saved data lives in localStorage, never in this cache, so updates cannot touch it.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Only the app's own files in SHELL are cached, and only good answers (200): an error page or a 404 can never replace a working offline copy.
const BASE = new URL('./', self.location).href, SHELL_URLS = new Set(SHELL.map(p => new URL(p, BASE).href));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // the Inter font: cached the first time, so it works offline (the stylesheet answer is opaque, so it cannot be checked; errors are not kept)
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy))); } return r; }))); return; }
  if (url.origin !== location.origin) return; // never touch API calls
  const key = url.origin + url.pathname, shell = SHELL_URLS.has(key);
  e.respondWith(
    fetch(e.request).then(r => {
      if (shell && r.ok && r.type === 'basic') { const copy = r.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(key, copy))); }
      return r;
    }).catch(() => caches.match(shell ? key : e.request, { ignoreSearch: true }).then(hit => hit || (e.request.mode === 'navigate' ? caches.match(BASE) : hit)))
  );
});
