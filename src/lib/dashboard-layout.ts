"use client";
/**
 * Dashboard Phase D-1 — localStorage 기반 위젯 레이아웃 헬퍼.
 *
 * - saveLayout: localStorage 에 저장 + storage 이벤트 발행 (탭 간 동기화).
 * - isWidgetVisible: layout 이 없으면 기본 true (모두 표시).
 * - useDashboardLayout: useSyncExternalStore 로 반응형 구독 (SSR 안전).
 */
import { useCallback, useSyncExternalStore } from "react";
import type { DashboardLayout, DashboardWidgetKey } from "@/types/dashboard-layout";

const KEY_PREFIX = "yedu_dashboard_layout";

function readLayout(userId: string): DashboardLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${KEY_PREFIX}.${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardLayout;
  } catch {
    return null;
  }
}

export function saveLayout(userId: string, layout: DashboardLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${KEY_PREFIX}.${userId}`,
      JSON.stringify(layout),
    );
    window.dispatchEvent(
      new StorageEvent("storage", { key: `${KEY_PREFIX}.${userId}` }),
    );
  } catch {
    // ignore — quota exceeded 등
  }
}

export function isWidgetVisible(
  layout: DashboardLayout | null,
  key: DashboardWidgetKey,
): boolean {
  if (!layout) return true;
  const cfg = layout.widgets.find((w) => w.key === key);
  return cfg ? cfg.visible : true;
}

/**
 * useSyncExternalStore 로 layout 구독 — 탭 간 동기화 + SSR 안전.
 *
 * 서버 스냅샷은 null(기본값 = 모두 표시)로 반환하므로 hydration 불일치 없음.
 */
export function useDashboardLayout(userId: string | undefined) {
  const fullKey = userId ? `${KEY_PREFIX}.${userId}` : null;

  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined" || !fullKey) return () => {};
      const onStorage = (e: StorageEvent) => {
        if (e.key === fullKey || e.key === null) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
    [fullKey],
  );

  const getSnapshot = useCallback(() => {
    if (!userId) return null;
    return readLayout(userId);
  }, [userId]);

  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
