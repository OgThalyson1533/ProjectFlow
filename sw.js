const CACHE_NAME = 'pf-v10-cache-v4';
const urlsToCache = [
  './',
  './index.html',
  './css/app.css',
  './css/v4-styles.css',
  './js/app.js',
  './js/board.js',
  './js/diagram-engine-v9.js',
  './js/notifications.js',
  './icon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
