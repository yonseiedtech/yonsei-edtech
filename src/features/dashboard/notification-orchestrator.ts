/**
 * NotificationOrchestrator (dashboard-persona-redesign Sprint 2 / F4)
 *
 * 목적:
 *  - 자동 노출되는 알림(모달·배너) 의 동시 노출 충돌 방지.
 *  - 우선순위 큐: 더 높은 우선순위 modal 이 active 면 다른 modal/배너는 대기.
 *  - 사용자가 modal 을 닫으면 자동으로 다음 우선순위 알림이 evaluate 된다.
 *
 * Sprint 1 의 `popup-coordination.ts` 는 단일 페어(TodayTodosPopup ↔ PushPermissionPrompt)만
 * 처리했으나, Sprint 2 부터는 다음 4종을 일괄 조율한다:
 *
 *   modal slot (배타적 — 동시에 1개만):
 *     undergrad-info   priority 1  (최우선 — 회원 가입 직후 학부 정보 미입력 안내)
 *     site-popup       priority 2  (사이트 운영 팝업 — 공지 등)
 *     today-todos      priority 3  (오늘의 할 일 자동 팝업)
 *
 *   banner slot:
 *     push-permission  priority 100 (modal 이 활성화된 상태에서는 노출 안 함)
 *
 * 분석 근거: docs/03-analysis/dashboard-uiux-synthesis.md §3 ★J
 */

export type ModalNotificationKey = "undergrad-info" | "site-popup" | "today-todos";
export type BannerNotificationKey = "push-permission";
export type NotificationKey = ModalNotificationKey | BannerNotificationKey;

const PRIORITY: Record<NotificationKey, number> = {
  "undergrad-info": 1,
  "site-popup": 2,
  "today-todos": 3,
  "push-permission": 100,
};

const MODAL_KEYS: readonly ModalNotificationKey[] = [
  "undergrad-info",
  "site-popup",
  "today-todos",
];

const STORAGE_KEY = "notification_active_modal";
const EVENT = "notification:active-modal-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isModalKey(value: string | null): value is ModalNotificationKey {
  return value !== null && (MODAL_KEYS as readonly string[]).includes(value);
}

/** 모달 슬롯의 현재 점유자 — 없으면 null */
export function getActiveModal(): ModalNotificationKey | null {
  if (!isBrowser()) return null;
  const v = window.sessionStorage.getItem(STORAGE_KEY);
  return isModalKey(v) ? v : null;
}

/** 모달 슬롯 점유 발행 — open 시 자기 키로, close 시 null 로 호출 */
export function publishActiveModal(key: ModalNotificationKey | null): void {
  if (!isBrowser()) return;
  if (key) {
    window.sessionStorage.setItem(STORAGE_KEY, key);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { active: key } }),
  );
}

/**
 * 내 키가 지금 노출 가능한지.
 * - modal: 더 높은 우선순위(=숫자 더 작음) modal 이 active 가 아니면 OK
 * - banner: 어떤 modal 도 active 가 아니면 OK
 */
export function canShowNotification(myKey: NotificationKey): boolean {
  const active = getActiveModal();
  if (!active) return true;
  if (myKey === active) return true;
  if (myKey === "push-permission") return false;
  return PRIORITY[myKey] < PRIORITY[active];
}

/** 모달 슬롯 변경 구독 — 내 키가 보류 중이라면 active 가 풀린 시점에 재평가 */
export function subscribeActiveModalChange(
  callback: (active: ModalNotificationKey | null) => void,
): () => void {
  if (!isBrowser()) return () => undefined;
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ active: ModalNotificationKey | null }>).detail;
    callback(detail?.active ?? null);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
