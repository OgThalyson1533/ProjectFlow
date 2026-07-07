const CACHE_NAME = 'pf-v10-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/app.css',
  './css/v4-styles.css',
  './js/app.js',
  './js/board.js',
  './js/diagram-engine-v9.js',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
