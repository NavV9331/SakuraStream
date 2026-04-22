const CACHE_NAME = "sakurastream-v1";

// Install event: skip waiting to activate immediately
self.addEventListener("install", event => {
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-first caching strategy
self.addEventListener("fetch", event => {
  // Only cache GET requests
  if (event.request.method !== "GET") return;

  // Exclude API calls and media streams from service worker cache 
  // to prevent consuming massive amounts of storage
  const url = new URL(event.request.url);
  if (
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.hostname.includes('iptv-org') ||
    url.hostname.includes('jiosaavn') ||
    url.hostname.includes('google') ||
    event.request.url.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses from our origin
        if (response && response.status === 200 && (response.type === "basic" || response.type === "cors")) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails (offline), return from cache
        return caches.match(event.request);
      })
  );
});
