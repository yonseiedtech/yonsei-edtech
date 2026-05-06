/**
 * 대시보드 팝업 조율 (Sprint 1 → Sprint 2 마이그레이션 후 deprecate 예정)
 *
 * Sprint 2 부터 NotificationOrchestrator 로 일괄 통합.
 * 본 파일은 Sprint 1 시점에 만들어진 인터페이스의 back-compat 어댑터.
 * 신규 코드는 `notification-orchestrator.ts` 의 publishActiveModal / canShowNotification 를 직접 사용하세요.
 *
 * @deprecated Sprint 2 — notification-orchestrator.ts 사용
 */

import { publishActiveModal } from "./notification-orchestrator";

// Sprint 1 시점의 외부 키 — TodayTodosPopup 의 상태 broadcast 용
export const TODAY_POPUP_ACTIVE_KEY = "dashboard_today_popup_active";
export const TODAY_POPUP_ACTIVE_EVENT = "dashboard:today-popup-active";

/**
 * @deprecated Sprint 2 — publishActiveModal("today-todos" | null) 사용 권장.
 *
 * Sprint 1 호환성을 위해 두 가지를 동시 발행:
 *  - notification-orchestrator 의 active modal 키
 *  - Sprint 1 시점의 sessionStorage / window event (혹시 외부 구독자가 남아 있을 경우)
 */
export function publishTodayPopupActive(active: boolean): void {
  publishActiveModal(active ? "today-todos" : null);
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
