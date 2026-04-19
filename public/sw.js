const CACHE_NAME = "yonsei-edtech-v3";
const STATIC_ASSETS = ["/icon.svg", "/logo-text.png", "/yonsei-emblem.svg", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || request.url.includes("/api/")) {
    return;
  }

  const isHTML =
    request.mode === "navigate" ||
    request.headers.get("Accept")?.includes("text/html");

  // HTML 문서: 네트워크 우선, 실패 시 캐시 폴백 (항상 최신 페이지 우선)
  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match("/offline")))
    );
    return;
  }

  // 정적 자산: 캐시 우선, 네트워크 폴백
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
