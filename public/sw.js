const CACHE_NAME = "yonsei-edtech-v1";
const STATIC_ASSETS = ["/", "/icon.svg", "/logo-text.png", "/yonsei-emblem.svg"];

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

  // API 및 POST 요청은 네트워크 우선
  if (request.method !== "GET" || request.url.includes("/api/")) {
    return;
  }

  // 정적 자산: 캐시 우선, 네트워크 폴백
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // 오프라인 폴백: HTML 요청이면 메인 페이지 반환
          if (request.headers.get("Accept")?.includes("text/html")) {
            return caches.match("/");
          }
        });
    })
  );
});
