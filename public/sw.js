/* Veylo offline cache keeps the app available after the first visit. */
const CACHE = 'veylo-cache-v1';
const ROOT = new URL('./', self.location.href).href;
const CORE = [
  ROOT,
  new URL('index.html', ROOT).href,
  new URL('manifest.webmanifest', ROOT).href,
  new URL('icons/icon-192.png', ROOT).href,
  new URL('icons/icon-512.png', ROOT).href,
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) =>
      hit ||
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(new URL('index.html', ROOT).href))
    )
  );
});
