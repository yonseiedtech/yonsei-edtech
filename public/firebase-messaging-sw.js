/* eslint-disable */
/**
 * Firebase Cloud Messaging Service Worker
 * Sprint 53 — Web Push 인프라
 *
 * 백그라운드 푸시 수신 + 표시.
 * 본 SW 는 PWA 캐시용 sw.js 와 별도(Firebase 가 정확히 이 파일명을 요구).
 */

// Firebase compat scripts (SW 환경에서 ESM 미지원)
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyA2Vuo9mN2DVCtBqmVQZaUGabG07RCHoUs",
  authDomain: "yonsei-edtech.firebaseapp.com",
  projectId: "yonsei-edtech",
  storageBucket: "yonsei-edtech.firebasestorage.app",
  messagingSenderId: "442267096511",
  appId: "1:442267096511:web:2cf9787d3994a8dce3fd0a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "연세교육공학회";
  const body = payload.notification?.body || "";
  const link = payload.data?.link || "/dashboard";
  const tag = payload.data?.tag || "yonsei-edtech";

  self.registration.showNotification(title, {
    body,
    icon: "/logo.png",
    badge: "/icon.svg",
    tag,
    data: { link },
    requireInteraction: false,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if (c.url.includes(link) && "focus" in c) return c.focus();
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(link);
        }
      }),
  );
});
