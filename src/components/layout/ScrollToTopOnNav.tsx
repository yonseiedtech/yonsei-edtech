"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 페이지 이동 시(pathname 변경) 항상 화면 최상단으로 스크롤한다.
 * Next.js App Router는 기본적으로 페이지 이동 시 스크롤 위치를 복원하지만,
 * 일부 케이스(해시·동적 라우트·prefetch 후 push)에서 애매한 위치로 머무는 경우가 있어
 * 보강 차원에서 명시적으로 0,0으로 이동시킨다.
 */
export default function ScrollToTopOnNav() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
