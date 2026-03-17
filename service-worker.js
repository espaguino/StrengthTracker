const CACHE = 'st-v21';
const BASE = '/StrengthTracker';
const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/css/styles.css`,
  `${BASE}/js/app.js`,
  `${BASE}/js/router.js`,
  `${BASE}/js/models.js`,
  `${BASE}/js/statsEngine.js`,
  `${BASE}/js/dataManager.js`,
  `${BASE}/js/views/home.js`,
  `${BASE}/js/views/workout.js`,
  `${BASE}/js/views/stats.js`,
  `${BASE}/js/views/templates.js`,
  `${BASE}/js/views/settings.js`,
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match(`${BASE}/index.html`)))
  );
});
