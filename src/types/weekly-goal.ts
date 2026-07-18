// ─────────────────────────────────────────────────────────────
// weekly-goal.ts — 주간 학습 목표 도메인 타입 (v5-M1)
//
// 비활성 코칭(inactivity-coaching)이 "멈춘 습관 1건"만 제안하던 것을,
// 회원이 스스로 세우는 "이번 주 목표 → 잔디 자동 달성 판정 → 주말 회고"
// 루프로 확장한다. 목표는 결정적 doc id `${userId}_${weekKey}` 로 1주 1건 저장.
// ─────────────────────────────────────────────────────────────

/** 목표 채널 — 잔디 활동 일수로 판정 가능한 3종 */
export type WeeklyGoalChannel = "reading" | "flashcard" | "writing";

export interface WeeklyGoal {
  id: string;
  userId: string;
  /** 목표가 속한 주의 월요일(로컬) YYYY-MM-DD — weekKeyOf() 로 계산 */
  weekKey: string;
  channel: WeeklyGoalChannel;
  /** 목표 활동 일수 (예: 3일) */
  target: number;
  createdAt: string;
  updatedAt: string;
}
