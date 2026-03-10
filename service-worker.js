const CACHE = 'st-v1';
const ASSETS = [
  '/StrengthTracker/',
  '/StrengthTracker/index.html',
  '/StrengthTracker/manifest.json',
  '/StrengthTracker/css/styles.css',
  '/StrengthTracker/js/app.js',
  '/StrengthTracker/js/router.js',
  '/StrengthTracker/js/models.js',
  '/StrengthTracker/js/statsEngine.js',
  '/StrengthTracker/js/dataManager.js',
  '/StrengthTracker/js/views/home.js',
  '/StrengthTracker/js/views/workout.js',
  '/StrengthTracker/js/views/stats.js',
  '/StrengthTracker/js/views/templates.js',
  '/StrengthTracker/js/views/settings.js',
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
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});
