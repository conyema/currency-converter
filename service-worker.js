const staticCacheName = 'currency-converter-v3';

// Cache essential Wep App files
const filesToCache = [
  './',
  './index.html',
  './scripts/app.js',
  './scripts/idb.js',
  './styles/style.css',
  './manifest.json',
  './images/icons/icon-192x192.jpg',
  './images/icons/icon-256x256.jpg',
  './images/coinsm.png',
];

// Install service worker and cache essential files
self.addEventListener('install', event => {
  console.log('ServiceWorker Installing');
  event.waitUntil(
    caches.open(staticCacheName).then(cache => {
      console.log('ServiceWorker installed');
      return cache.addAll(filesToCache);
    }).catch(error => console.log('failed to cache: ' + error))
  );
});
// Activate service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('currency-converter-') &&
                 !staticCacheName.includes(cacheName);
        }).map(cacheName => {
          return caches.delete(cacheName);
          console.log(cacheName);
          console.log('SW activated');
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  let requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match('/index.html'));
      return;
    }
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
      self.skipWaiting();
  }
});


