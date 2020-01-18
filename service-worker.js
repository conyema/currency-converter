const staticCacheName = 'currency-converter-v6';

// Cache essential Wep App files
const filesToCache = [
  './',
  './index.html',
  './scripts/app.js',
  './scripts/idb.js',
  './styles/style.css',
  './images/icons/favicon-32x32.png',
  './favicon.ico'
];

// Install service worker and cache essential files
self.addEventListener('install', event => {
  // console.log('ServiceWorker Installing');
  event.waitUntil(
    caches.open(staticCacheName).then(cache => {
      console.log('ServiceWorker installed');
      return cache.addAll(filesToCache);
    })
    .catch(error => console.log('failed to cache: ' + error))
  );
});

// Activate service worker and delete old cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('currency-converter-') && cacheName !== staticCacheName;
                //  !staticCacheName.includes(cacheName);
        }).map(cacheName => {
          console.log(cacheName);
          // console.log('SW activated');
          return caches.delete(cacheName);
        })
      );
    })
  );
});

/**  Activate Service Worker immediately  **/
self.skipWaiting();

self.addEventListener('fetch', event => {
  let requestUrl = new URL(event.request.url);

  // if (requestUrl.origin === location.origin) {
  //   if (requestUrl.pathname === './') {
  //     event.respondWith(caches.match('./index.html'));
  //     return;
  //   }
  // }

  if (requestUrl.pathname === './') {
    event.respondWith(caches.match('./index.html'));
    return;
  }

  // // if (requestUrl.port === '1337') {
  if (requestUrl.host.includes('apilayer.net')) {
    console.log('currency url');
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

// self.addEventListener('message', event => {
//   if (event.data.action === 'skipWaiting') {
//       self.skipWaiting();
//   }
// });


