"use client";

import { useEffect } from "react";

/**
 * PWA 서비스워커(/sw.js) 등록 — 프로덕션 전용.
 *
 * 개발 모드에서는 등록하지 않는다(로컬 HMR/캐시 간섭 방지).
 * 등록 실패는 조용히 무시 — SW 미지원 브라우저·비HTTPS 환경에서도 앱은 정상 동작해야 한다.
 * Firebase 푸시용 SW(/firebase-messaging-sw.js)는 별도로 lib/push.ts 에서 등록된다.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 등록 실패는 무시 (오프라인 폴백만 담당하는 부가 기능) */
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
