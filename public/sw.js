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

  // 정적 자산만 캐시 우선 (해시된 번들·아이콘·이미지).
  // 주의: RSC 내비게이션 페이로드(?_rsc=)·기타 데이터 GET 을 캐시하면
  // 배포 후에도 낡은 페이지 데이터가 영구 서빙된다 — 명시적 정적 경로만 캐시하고
  // 나머지는 SW 개입 없이 네트워크로 통과시킨다.
  const url = new URL(request.url);
  const isStaticAsset =
    url.origin === self.location.origin &&
    !url.searchParams.has("_rsc") &&
    (url.pathname.startsWith("/_next/static/") ||
      /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/.test(url.pathname));

  if (!isStaticAsset) {
    return; // 네트워크 직행 (캐시 미개입)
  }

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
