"use client";
/**
 * Dashboard Phase D-1/D-2 — localStorage 기반 위젯 레이아웃 헬퍼.
 *
 * - saveLayout: localStorage 에 저장 + storage 이벤트 발행 (탭 간 동기화).
 * - isWidgetVisible: layout 이 없으면 기본 true (모두 표시).
 * - getSortedWidgets: order asc 정렬된 위젯 목록 반환 (D-2).
 * - reorderWidget: 위아래 화살표 이동 시 order 재계산 (D-2).
 * - useDashboardLayout: useSyncExternalStore 로 반응형 구독 (SSR 안전).
 *
 * D-5 추가:
 * - loadLayoutFromFirestore: Firestore 에서 layout 읽기.
 * - saveLayoutWithSync: localStorage + Firestore 양쪽 저장.
 * - syncLayoutFromFirestore: 로그인 후 Firestore → localStorage 동기화 (최신 우선).
 */
import { useCallback, useSyncExternalStore } from "react";
import type {
  DashboardLayout,
  DashboardWidgetConfig,
  DashboardWidgetKey,
} from "@/types/dashboard-layout";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_VISIBLE_WIDGETS,
  DASHBOARD_WIDGET_KEYS,
  RETIRED_WIDGET_KEYS,
} from "@/types/dashboard-layout";

// ── D-3 알림 무음 헬퍼 ───────────────────────────────────────────────────────

const KEY_PREFIX = "yedu_dashboard_layout";

/**
 * snapshot 캐시 — userId 별 raw string 동일하면 parsed 동일 reference 반환.
 * useSyncExternalStore 가 reference 비교로 변경 감지하므로,
 * 같은 raw string 에서 매번 새 JSON.parse 객체를 만들면 무한 루프 유발.
 */
const SNAPSHOT_CACHE = new Map<string, { raw: string | null; parsed: DashboardLayout | null }>();

/** localStorage 에서 layout 읽기 (내부·외부 공용) — reference 안정화. */
function readLayout(userId: string): DashboardLayout | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`${KEY_PREFIX}.${userId}`);
  } catch {
    return null;
  }
  const cached = SNAPSHOT_CACHE.get(userId);
  if (cached && cached.raw === raw) {
    return cached.parsed;
  }
  let parsed: DashboardLayout | null = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw) as DashboardLayout;
    } catch {
      parsed = null;
    }
  }
  SNAPSHOT_CACHE.set(userId, { raw, parsed });
  return parsed;
}

/** D-5: localStorage layout 읽기 — syncLayoutFromFirestore 비교에 사용. */
export function readLayoutInternal(userId: string): DashboardLayout | null {
  return readLayout(userId);
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
  // 체감 스프린트: 저장 레이아웃 없는 사용자는 핵심 위젯 기본 세트만 노출.
  // 직접 저장한 레이아웃이 있으면 그대로 존중 (구버전 레이아웃의 미지 키는 기존처럼 표시).
  if (!layout) return DEFAULT_VISIBLE_WIDGETS.has(key);
  const cfg = layout.widgets.find((w) => w.key === key);
  return cfg ? cfg.visible : true;
}

/**
 * D-2: order asc 정렬된 위젯 목록 반환.
 * layout 이 없으면 DEFAULT_DASHBOARD_LAYOUT 위젯 반환.
 * layout 에 order 필드가 없는 구버전 항목은 DASHBOARD_WIDGET_KEYS 인덱스로 폴백.
 *
 * 마이그레이션: DASHBOARD_WIDGET_KEYS 에 신규 키가 추가됐는데 저장 레이아웃·프리셋에
 * 누락된 경우, 목록 끝에 자동 보충(기본 visible 값 적용)해 편집 모드에서 제어 가능하게 한다.
 * 이로써 신규 위젯 키 추가 시 모든 프리셋·기존 사용자 레이아웃을 일괄 수정할 필요가 없다.
 */
export function getSortedWidgets(
  layout: DashboardLayout | null,
): DashboardWidgetConfig[] {
  const source = layout ? layout.widgets : DEFAULT_DASHBOARD_LAYOUT.widgets;
  const present = new Set(source.map((w) => w.key));
  const missing: DashboardWidgetConfig[] = DASHBOARD_WIDGET_KEYS.filter(
    (key) => !present.has(key),
  ).map((key, i) => ({
    key,
    visible: DEFAULT_VISIBLE_WIDGETS.has(key),
    order: source.length + i,
  }));
  return [...source, ...missing]
    // 은퇴 위젯(본문 상단 승격·통합으로 렌더 노드가 없는 키)은 편집·설정 목록에서 제외.
    // 저장 레이아웃(base.widgets)에는 그대로 남아 있어 구버전 호환 유지.
    .filter((w) => !RETIRED_WIDGET_KEYS.includes(w.key))
    .map((w) => ({
      ...w,
      order: w.order ?? DASHBOARD_WIDGET_KEYS.indexOf(w.key),
    }))
    .sort((a, b) => a.order - b.order);
}

/**
 * D-2: 특정 위젯을 "up" 또는 "down" 방향으로 한 칸 이동.
 * order 값을 swap 하여 새 DashboardLayout 반환.
 * 이미 첫/끝 위치라면 원본 그대로 반환.
 */
export function reorderWidget(
  layout: DashboardLayout | null,
  key: DashboardWidgetKey,
  direction: "up" | "down",
): DashboardLayout {
  const sorted = getSortedWidgets(layout);
  const currentIdx = sorted.findIndex((w) => w.key === key);
  if (currentIdx === -1) return layout ?? { ...DEFAULT_DASHBOARD_LAYOUT };

  const swapIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) {
    return layout ?? { ...DEFAULT_DASHBOARD_LAYOUT };
  }

  // swap order values
  const newSorted = sorted.map((w) => ({ ...w }));
  const tempOrder = newSorted[currentIdx].order;
  newSorted[currentIdx].order = newSorted[swapIdx].order;
  newSorted[swapIdx].order = tempOrder;

  // rebuild widgets array preserving non-sorted keys
  const base = layout ?? DEFAULT_DASHBOARD_LAYOUT;
  const orderMap = new Map(newSorted.map((w) => [w.key, w.order]));
  const widgets: DashboardWidgetConfig[] = base.widgets.map((w) => ({
    ...w,
    order: orderMap.has(w.key) ? (orderMap.get(w.key) as number) : w.order ?? DASHBOARD_WIDGET_KEYS.indexOf(w.key),
  }));

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    widgets,
  };
}

/**
 * D-3: 특정 위젯의 알림 무음 여부 반환.
 * layout 이 없거나 cfg 가 없으면 false (알림 켜짐).
 */
export function isWidgetMuted(
  layout: DashboardLayout | null,
  key: DashboardWidgetKey,
): boolean {
  if (!layout) return false;
  const cfg = layout.widgets.find((w) => w.key === key);
  return cfg?.mutedNotifications === true;
}

/**
 * D-3: 특정 위젯의 mutedNotifications 를 설정한 새 DashboardLayout 반환.
 * layout 이 null 이면 DEFAULT_DASHBOARD_LAYOUT 을 기반으로 생성.
 */
export function setWidgetMuted(
  layout: DashboardLayout | null,
  key: DashboardWidgetKey,
  muted: boolean,
): DashboardLayout {
  const base = layout ?? DEFAULT_DASHBOARD_LAYOUT;
  // 해당 key 가 base.widgets 에 없으면 추가
  const exists = base.widgets.some((w) => w.key === key);
  const widgets: DashboardWidgetConfig[] = exists
    ? base.widgets.map((w) =>
        w.key === key ? { ...w, mutedNotifications: muted } : { ...w },
      )
    : [
        ...base.widgets.map((w) => ({ ...w })),
        {
          key,
          visible: true,
          order: base.widgets.length,
          mutedNotifications: muted,
        },
      ];
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    widgets,
  };
}

/**
 * D-3b: 특정 위젯의 알림 무음 여부를 반응형으로 반환하는 훅.
 * useDashboardLayout 위에서 isWidgetMuted 결과를 구독한다.
 */
export function useIsWidgetMuted(
  userId: string | undefined,
  key: DashboardWidgetKey,
): boolean {
  const layout = useDashboardLayout(userId);
  return isWidgetMuted(layout, key);
}

// ── D-5 Firestore 동기화 헬퍼 ────────────────────────────────────────────────

/**
 * D-5: Firestore 에서 dashboardLayout 읽기.
 * 실패 시 null 반환 (silent) — UI 차단하지 않음.
 */
export async function loadLayoutFromFirestore(
  uid: string,
): Promise<DashboardLayout | null> {
  try {
    const { profilesApi } = await import("@/lib/bkend");
    const profile = await profilesApi.get(uid);
    return (profile as { dashboardLayout?: DashboardLayout })?.dashboardLayout ?? null;
  } catch {
    return null;
  }
}

/**
 * D-5: localStorage 즉시 저장 + Firestore 비동기 백업.
 * Firestore 실패 시 console.error 로그만 남기고 UI 는 계속 동작.
 */
export async function saveLayoutWithSync(
  uid: string,
  layout: DashboardLayout,
): Promise<void> {
  // 1) localStorage 즉시 저장 — UI 반응성 보장
  saveLayout(uid, layout);
  // 2) Firestore 비동기 백업 — 실패 silent
  try {
    const { profilesApi } = await import("@/lib/bkend");
    await profilesApi.update(uid, { dashboardLayout: layout });
  } catch (err) {
    console.error("[dashboard-layout] firestore sync failed", err);
  }
}

/**
 * D-5: 로그인 후 Firestore → localStorage 동기화 (마스터).
 * Firestore 의 updatedAt 이 localStorage 보다 최신이면 localStorage 를 덮어씀.
 * 충돌 해결: latest wins (updatedAt 비교). 한쪽만 있으면 그쪽 사용.
 */
export async function syncLayoutFromFirestore(uid: string): Promise<void> {
  const remote = await loadLayoutFromFirestore(uid);
  if (!remote) return;
  const local = readLayoutInternal(uid);
  if (!local || remote.updatedAt > (local.updatedAt ?? "")) {
    saveLayout(uid, remote);
  }
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
