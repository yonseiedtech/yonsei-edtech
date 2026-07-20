/**
 * whats-new 공유 메타 — SemesterKickoffBanner · whats-new/page.tsx 양쪽 재사용
 *
 * 새 기능 추가 시:
 *   1. src/app/whats-new/page.tsx FEATURES 배열에 항목 추가
 *   2. 아래 WHATS_NEW_ADDED_DATES에 addedAt 날짜(ISO) 동일하게 추가
 */

/** localStorage 키 — whats-new 페이지 dismiss 여부 */
export const WHATS_NEW_DISMISSED_KEY = "yonsei_whats_new_dismissed_v2";

/** 이 일 수 이내에 추가된 기능을 NEW로 표시 */
export const NEW_THRESHOLD_DAYS = 60;

/**
 * 신기능 addedAt 날짜 목록 (ISO yyyy-MM-dd)
 * whats-new/page.tsx FEATURES[].addedAt 값과 동기화 유지
 */
export const WHATS_NEW_ADDED_DATES: readonly string[] = [
  "2026-07-21", // curriculum-wizard — 스터디 교수설계 마법사
  "2026-07-17", // newcomer-onboarding — 신입 온보딩 강화
  "2026-07-16", // seminar-live — 세미나 라이브
  "2026-07-10", // hackathon-2026 — 에듀테크 해커톤 2026
  "2026-06-15", // kudos-recognition — 동료 인정 Kudos
  "2026-06-12", // reading-apa-doi — DOI 자동 채움·APA 인용
  "2026-06-12", // scholar-seminal-works — 대표 학자·원전 링크
  "2026-06-12", // research-design-profile — 연구 설계 프로파일
  "2026-06-03", // research-journey-v2 — 연구 여정 대개편
  "2026-06-03", // literature-matrix — 문헌 리뷰 매트릭스
  "2026-06-03", // research-model-wizard — 연구모형 마법사
  "2026-06-03", // design-studio — 디자인 스튜디오
  "2026-06-03", // finders — 통계·연구방법 파인더
  "2026-06-03", // stat-model-diagrams — 통계방법 다이어그램
  "2026-06-03", // archive-foundation-expansion — 아카이브 대확장
  "2026-06-03", // thesis-journey-suite — 논문 여정
  "2026-05-15", // dashboard-phase-d — 대시보드 개인화
  "2026-05-15", // onboarding-checklist — 시작하기 체크리스트
  "2026-05-15", // notification-center — 알림센터
  "2026-05-15", // archive-enhanced — 아카이브 강화
  "2026-05-15", // external-activity-status — 대외 학술대회 상태
];

/** 현재 기준 NEW(60일 이내) 신기능 수 */
export function countNewFeatures(): number {
  const thresholdMs = NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return WHATS_NEW_ADDED_DATES.filter((d) => now - new Date(d).getTime() <= thresholdMs).length;
}

/**
 * whats-new 페이지를 아직 열람·dismiss 하지 않았는가
 * (WHATS_NEW_DISMISSED_KEY가 "true"로 설정되지 않은 상태)
 */
export function isWhatsNewUnread(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(WHATS_NEW_DISMISSED_KEY) !== "true";
  } catch {
    return true;
  }
}
