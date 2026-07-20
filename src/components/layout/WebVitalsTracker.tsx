"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initWebVitals } from "@/lib/web-vitals-tracker";

/**
 * H6 성능 계측 — LCP/CLS/INP 기준선 수집 컴포넌트.
 * 마운트 시 1회만 초기화 (SPA 라우트 변경에도 재등록 없음 — 세션Storage 가드).
 * 런타임 성능 영향 없음 (requestIdleCallback/setTimeout + 10% 샘플링).
 */
export default function WebVitalsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    initWebVitals(pathname);
    // mount 1회만 — 의도적 빈 deps (web-vitals 옵저버는 페이지 로드당 1회 등록)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
