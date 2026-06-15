/**
 * flashcard-srs.ts 단위 테스트 — SM-2 간소화 간격반복 순수 함수.
 *
 * 간격 단계(1/3/7/16/30)·정답 시 streak 증가·오답 시 리셋·dueAt 가산·
 * reviewCount/correctCount 누적·날짜 오프셋(addDaysYmd)을 검증.
 */

import { describe, expect, it } from "vitest";
import {
  SRS_INTERVAL_STEPS,
  addDaysYmd,
  isDueToday,
  nextReview,
} from "@/lib/flashcard-srs";

// KST 정오 고정 시각 — todayYmdKst 가 2026-06-15 를 반환하도록.
const NOW = new Date("2026-06-15T03:00:00.000Z"); // 12:00 KST

describe("addDaysYmd", () => {
  it("일수를 더한다", () => {
    expect(addDaysYmd("2026-06-15", 1)).toBe("2026-06-16");
    expect(addDaysYmd("2026-06-15", 7)).toBe("2026-06-22");
    expect(addDaysYmd("2026-06-15", 30)).toBe("2026-07-15");
  });
  it("월·연 경계를 넘는다", () => {
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysYmd("2026-02-28", 1)).toBe("2026-03-01");
  });
  it("0일 가산은 그대로", () => {
    expect(addDaysYmd("2026-06-15", 0)).toBe("2026-06-15");
  });
});

describe("nextReview — 정답", () => {
  it("신규(streak 0) 정답 → streak 1, interval 3", () => {
    const r = nextReview({ streak: 0, reviewCount: 0, correctCount: 0 }, true, NOW);
    expect(r.streak).toBe(1);
    expect(r.intervalDays).toBe(SRS_INTERVAL_STEPS[1]); // 3
    expect(r.dueAt).toBe("2026-06-18");
    expect(r.reviewCount).toBe(1);
    expect(r.correctCount).toBe(1);
    expect(r.lastReviewedAt).toBe(NOW.toISOString());
  });

  it("연속 정답이 단계를 따라 간격을 늘린다", () => {
    // streak 1 → 2 (interval 7)
    const r2 = nextReview({ streak: 1, reviewCount: 1, correctCount: 1 }, true, NOW);
    expect(r2.streak).toBe(2);
    expect(r2.intervalDays).toBe(7);
    expect(r2.dueAt).toBe("2026-06-22");
    // streak 2 → 3 (interval 16)
    const r3 = nextReview({ streak: 2, reviewCount: 2, correctCount: 2 }, true, NOW);
    expect(r3.intervalDays).toBe(16);
    // streak 3 → 4 (interval 30)
    const r4 = nextReview({ streak: 3, reviewCount: 3, correctCount: 3 }, true, NOW);
    expect(r4.intervalDays).toBe(30);
  });

  it("interval 은 30 상한", () => {
    const r = nextReview({ streak: 10, reviewCount: 10, correctCount: 10 }, true, NOW);
    expect(r.streak).toBe(11);
    expect(r.intervalDays).toBe(30);
    expect(r.dueAt).toBe("2026-07-15");
  });
});

describe("nextReview — 오답", () => {
  it("오답 → streak 0 리셋, interval 1, correctCount 불변", () => {
    const r = nextReview({ streak: 4, reviewCount: 5, correctCount: 4 }, false, NOW);
    expect(r.streak).toBe(0);
    expect(r.intervalDays).toBe(1);
    expect(r.dueAt).toBe("2026-06-16");
    expect(r.reviewCount).toBe(6); // 증가
    expect(r.correctCount).toBe(4); // 불변
    expect(r.lastReviewedAt).toBe(NOW.toISOString());
  });
});

describe("isDueToday", () => {
  it("dueAt 이 오늘 이전/오늘이면 복습 대상", () => {
    expect(isDueToday({ dueAt: "2026-06-15" }, NOW)).toBe(true);
    expect(isDueToday({ dueAt: "2026-06-10" }, NOW)).toBe(true);
  });
  it("dueAt 이 미래면 대상 아님", () => {
    expect(isDueToday({ dueAt: "2026-06-20" }, NOW)).toBe(false);
  });
});
