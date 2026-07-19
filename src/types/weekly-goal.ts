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

/**
 * 주차 마감 기록 (v6-H3) — 지난주 목표 판정 결과를 영속화해 연속·추세·회고를 축적한다.
 * 결정적 doc id `${userId}_${weekKey}` (1주 1건). weekly-digest cron 이 주차 종료 시점에
 * 잔디 원천 판정으로 upsert 하고, 회원은 회고(reflection) 한 줄을 사후 저장한다.
 */
export interface WeeklyGoalRecord {
  id: string;
  userId: string;
  /** 기록된 주의 월요일(로컬) YYYY-MM-DD */
  weekKey: string;
  /** 목표 일수 (판정 당시 target) */
  goal: number;
  /** 달성 일수 (해당 주 채널 활동 일수) */
  achieved: number;
  /** 목표 달성 여부 (achieved >= goal) */
  met: boolean;
  /** 회원이 남긴 회고 한 줄 (선택) */
  reflection?: string;
  createdAt: string;
  updatedAt: string;
}
