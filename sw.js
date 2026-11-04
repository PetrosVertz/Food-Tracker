// Keeps the app shell available offline. Network first, so updates show up straight away.
const CACHE = 'tracker-v0.6.5';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'icon-maskable-512.png',
  'css/base.css',
  'css/glass.css',
  'css/motion.css',
  'css/layout.css',
  'css/workout.css',
  'js/data/config.js',
  'js/data/strings.js',
  'js/data/foods.js',
  'js/data/gym.js',
  'js/core.js',
  'js/ui.js',
  'js/food.js',
  'js/supplements.js',
  'js/today.js',
  'js/fridge.js',
  'js/gym.js', 'js/progress.js',
  'js/wire/01-core.js',
  'js/wire/02-food.js',
  'js/wire/03-fridge-today.js',
  'js/wire/04-gym.js',
  'js/wire/05-nav-cook-gym.js',
  'js/wire/06-launcher-logging-shop.js',
  'js/wire/07-fridge-stack-motion.js',
  'js/wire/08-settings-boot.js',
  'js/wire/09-tabs-targets-recovery.js',
  'js/wire/10-workout.js', 'js/wire/11-v059.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never touch API calls
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
