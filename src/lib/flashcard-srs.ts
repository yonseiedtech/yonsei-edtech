// ── 암기카드 간격반복 (SM-2 간소화 / Leitner 변형) ──
//
// 신규 의존성 없이 순수 함수로 구현. 복습 간격은 연속 정답(streak) 단계로 결정한다.
//   streak: 0(신규/직전 오답) → 1, 1 → 3, 2 → 7, 3 → 16, 4+ → 30(상한)
//
// 정답: streak += 1, intervalDays = STEPS[min(streak,4)], dueAt = today + interval, correctCount += 1
// 오답: streak = 0, intervalDays = 1, dueAt = today + 1
// 공통: reviewCount += 1, lastReviewedAt = now
//
// today(KST)는 기존 todayYmdKst() 헬퍼(Sprint 47 KST drift fix) 재사용 — 신규 날짜 유틸 금지.

import { todayYmdKst } from "./dday";
import type { Flashcard } from "@/types/flashcard";

/** streak(연속 정답) 단계 → 다음 복습 간격(일). index = min(streak, 4). */
export const SRS_INTERVAL_STEPS = [1, 3, 7, 16, 30] as const;

/** YYYY-MM-DD 에 days 일을 더한 YYYY-MM-DD (UTC 정오 기준 — DST 무관, KST 날짜 안전). */
export function addDaysYmd(ymd: string, days: number): string {
  // "YYYY-MM-DD" → UTC 정오로 파싱(타임존 경계 오프바이원 방지) 후 days 가산.
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  if (!y || !m || !d) return ymd;
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 복습 결과 후 갱신할 메타 필드(부분) */
export type FlashcardReviewMeta = Pick<
  Flashcard,
  "dueAt" | "streak" | "intervalDays" | "reviewCount" | "correctCount" | "lastReviewedAt"
>;

/**
 * 카드 한 장의 복습 결과로 다음 복습 메타를 계산(순수 함수).
 * @param card 현재 카드(복습 메타 포함)
 * @param correct 이번 복습에서 맞췄는지
 * @param now 기준 시각(테스트 주입용, 기본 현재)
 */
export function nextReview(
  card: Pick<Flashcard, "streak" | "reviewCount" | "correctCount">,
  correct: boolean,
  now: Date = new Date(),
): FlashcardReviewMeta {
  const today = todayYmdKst(now);
  const reviewCount = (card.reviewCount ?? 0) + 1;
  if (correct) {
    const streak = (card.streak ?? 0) + 1;
    const intervalDays = SRS_INTERVAL_STEPS[Math.min(streak, SRS_INTERVAL_STEPS.length - 1)];
    return {
      streak,
      intervalDays,
      dueAt: addDaysYmd(today, intervalDays),
      reviewCount,
      correctCount: (card.correctCount ?? 0) + 1,
      lastReviewedAt: now.toISOString(),
    };
  }
  // 오답 — 상자 리셋
  return {
    streak: 0,
    intervalDays: 1,
    dueAt: addDaysYmd(today, 1),
    reviewCount,
    correctCount: card.correctCount ?? 0,
    lastReviewedAt: now.toISOString(),
  };
}

/** 오늘(KST) 복습 대상인지 — dueAt <= today. (미학습 신규 카드는 dueAt=가입일이라 항상 대상) */
export function isDueToday(card: Pick<Flashcard, "dueAt">, now: Date = new Date()): boolean {
  const today = todayYmdKst(now);
  return (card.dueAt ?? "") <= today;
}
