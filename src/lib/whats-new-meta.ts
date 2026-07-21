/**
 * whats-new 공유 메타 — SemesterKickoffBanner · whats-new/page.tsx 양쪽 재사용
 *
 * 새 기능 추가 시 (단일 소스 — L3-v13):
 *   1. 아래 FEATURE_DATES 맵에 id: "YYYY-MM-DD" 추가 (WHATS_NEW_ADDED_DATES 자동 갱신)
 *   2. src/app/whats-new/page.tsx FEATURES 배열에 항목 추가 (addedAt: FEATURE_DATES["id"])
 *
 * WHATS_NEW_ADDED_DATES 는 FEATURE_DATES 에서 자동 생성 — 별도 수동 갱신 불필요.
 */

/** localStorage 키 — whats-new 페이지 dismiss 여부 */
export const WHATS_NEW_DISMISSED_KEY = "yonsei_whats_new_dismissed_v2";

/** 이 일 수 이내에 추가된 기능을 NEW로 표시 */
export const NEW_THRESHOLD_DAYS = 60;

/**
 * 신기능 id → addedAt 날짜 단일 소스 (ISO yyyy-MM-dd).
 * whats-new/page.tsx 의 Feature.addedAt 은 이 값을 참조 — 이중 관리 제거.
 * 새 기능 추가 시 여기에만 추가하면 WHATS_NEW_ADDED_DATES 자동 갱신됨.
 */
export const FEATURE_DATES: Record<string, string> = {
  "curriculum-wizard":           "2026-07-21", // 스터디 교수설계 마법사
  "newcomer-onboarding":         "2026-07-17", // 신입 온보딩 강화
  "seminar-live":                "2026-07-16", // 세미나 라이브
  "hackathon-2026":              "2026-07-10", // 에듀테크 해커톤 2026
  "kudos-recognition":           "2026-06-15", // 동료 인정 Kudos
  "reading-apa-doi":             "2026-06-12", // DOI 자동 채움·APA 인용
  "scholar-seminal-works":       "2026-06-12", // 학자 원전 링크
  "research-design-profile":     "2026-06-12", // 졸업생 논문 연구 설계 프로파일
  "research-journey-v2":         "2026-06-03", // 연구 여정 대개편
  "literature-matrix":           "2026-06-03", // 문헌 리뷰 매트릭스
  "research-model-wizard":       "2026-06-03", // 연구모형 마법사
  "design-studio":               "2026-06-03", // 디자인 스튜디오
  "finders":                     "2026-06-03", // 통계·연구방법 파인더
  "stat-model-diagrams":         "2026-06-03", // 통계방법 다이어그램
  "archive-foundation-expansion":"2026-06-03", // 아카이브 대확장
  "thesis-journey-suite":        "2026-06-03", // 논문 여정
  "dashboard-phase-d":           "2026-05-15", // 대시보드 개인화
  "onboarding-checklist":        "2026-05-15", // 시작하기 체크리스트
  "notification-center":         "2026-05-15", // 알림센터
  "archive-enhanced":            "2026-05-15", // 아카이브 강화
  "external-activity-status":    "2026-05-15", // 대외 학술대회 상태
};

/**
 * 신기능 addedAt 날짜 목록 — FEATURE_DATES 에서 자동 생성 (수동 유지 불필요).
 * SemesterKickoffBanner 등 countNewFeatures() 사용처가 여전히 이 상수를 참조.
 */
export const WHATS_NEW_ADDED_DATES: readonly string[] = Object.values(FEATURE_DATES);

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
