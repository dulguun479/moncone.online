const CACHE_NAME = "moncone-cache-v1";
const ASSETS_TO_CACHE = ["/", "/manifest.json", "/icon.svg"];

// Install event - Cache core static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - Network-first with cache fallback for HTML, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Exclude Supabase API and API server requests from caching
  if (url.pathname.startsWith("/api") || request.url.includes("supabase.co")) {
    return;
  }

  // Handle standard GET requests only
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // If the request was successful, clone and store it in cache
        if (response.status === 200 && request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no cache, return a simple offline message for HTML requests
          if (request.headers.get("accept")?.includes("text/html")) {
            return new Response(
              "<html><body style='background:#13101c;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'><h2>Сүлжээний алдаа</h2><p>Интернэт холболтоо шалгаад дахин оролдоно уу.</p></body></html>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } },
            );
          }
        });
      }),
  );
});
