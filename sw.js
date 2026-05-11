const CACHE_NAME = 'safedrive-v1';
const assets = [
  '/',
  '/index.php',
  '/css/style.css',
  '/js/main.js',
  '/js/detection.js',
  '/assets/image_866399.jpg',
  '/assets/alarm.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});