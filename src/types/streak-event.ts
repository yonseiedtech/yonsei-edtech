// ────────────────────────────────────────────────────────────
// streak-event.ts — 학습 잔디 외부 가산점 이벤트 (P1)
//
// LearningStreak 의 기본 점수원(세미나 출석/회고/과제 등)은 각 도메인 컬렉션에서
// 직접 계산하지만, 시작하기 체크리스트 항목 완료·배지 부여 같은 "도메인 외부"
// 이벤트는 별도의 streak_events 컬렉션에 누적 저장한다.
//
// 멱등성:
//  - doc id = `${userId}__${type}__${refId}` (deterministic)
//  - dataApi.upsert(merge:true) 로 같은 (userId,type,refId) 재호출 시 중복 가산 X
// ────────────────────────────────────────────────────────────

/** 가산점 이벤트 종류. 새 타입은 LearningStreak.tsx 합산 로직과 함께 추가. */
export type StreakEventType =
  | "onboarding-checklist"          // 체크리스트 1항목 완료 (+5)
  | "onboarding-badge"              // 마일스톤 배지 부여 (+5/+10/+20)
  | "collab-research-join"          // 공동 연구팀 참여 (+3, Phase 1)
  | "collab-chapter-edit"           // 챕터 편집 1일 (+2, Phase 2 day-bucketed)
  | "collab-meeting"                // 회의 기록 (+3, Phase 2)
  | "collab-milestone"              // 마일스톤 완료 (+5, Phase 2)
  | "research-journal-publish"      // 연구지 출판 (+10, Phase 3)
  | "flashcard-study";              // 암기카드 학습 1일 (+2, day-bucketed refId=ymd)

export interface StreakEvent {
  /** `${userId}__${type}__${refId}` */
  id: string;
  userId: string;
  type: StreakEventType;
  /** 항목별 식별자 (체크리스트는 completionType, 배지는 badgeId). 같은 (userId,type,refId) 1회만 가산. */
  refId: string;
  points: number;
  /** YYYY-MM-DD (로컬) — LearningStreak 그리드 합산용 */
  ymd: string;
  /** ISO — 클라이언트 생성 시각 */
  occurredAt: string;
  createdAt?: string;
  updatedAt?: string;
}
