/**
 * 대시보드 알림/팝업 동시 노출 조율 (dashboard-quickwins Sprint 67)
 *
 * 단순 시작 — TodayTodosPopup 만 시그널을 발행하고 PushPermissionPrompt 가 구독.
 * 향후 P1 단계에서 NotificationOrchestrator 로 확장 (운영 알림, 일반 토스트 등 통합 우선순위 큐).
 *
 * 분석 근거: docs/03-analysis/dashboard-uiux-synthesis.md §1 C4
 */

export const TODAY_POPUP_ACTIVE_KEY = "dashboard_today_popup_active";
export const TODAY_POPUP_ACTIVE_EVENT = "dashboard:today-popup-active";

/** TodayTodosPopup open 상태를 sessionStorage + window event 로 발행 */
export function publishTodayPopupActive(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    window.sessionStorage.setItem(TODAY_POPUP_ACTIVE_KEY, "1");
  } else {
    window.sessionStorage.removeItem(TODAY_POPUP_ACTIVE_KEY);
  }
  window.dispatchEvent(
    new CustomEvent(TODAY_POPUP_ACTIVE_EVENT, { detail: { active } }),
  );
}
