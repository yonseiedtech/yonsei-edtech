/**
 * research-stats.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 연구 통계는 회원 마이페이지 + 관리자 대시보드에 동시 노출.
 * 연속 작성일(streak) 계산, 참여율 0 나누기 방어, 기간 필터 등 버그 가능성 높음.
 */

import { describe, expect, it } from "vitest";
import {
  computeLongestStreak,
  computeWritingDays,
  computeParticipationRate,
  computeReadingStats,
} from "@/lib/research-stats";
import type { WritingPaperHistory, ResearchPaper } from "@/types";

function mkHistory(dates: string[]): WritingPaperHistory[] {
  return dates.map((d, i) => ({
    id: `h_${i}`,
    userId: "u_test",
    paperId: "p_test",
    savedAt: `${d}T12:00:00.000Z`,
    charCount: 100,
    createdAt: `${d}T12:00:00.000Z`,
  }));
}

function mkPaper(partial: Partial<ResearchPaper> = {}): ResearchPaper {
  return {
    id: "p_1",
    title: "테스트 논문",
    isDraft: false,
    readStatus: "completed",
    createdAt: "2026-01-01T00:00:00.000Z",
    tags: [],
    ...partial,
  } as unknown as ResearchPaper;
}

describe("computeLongestStreak", () => {
  it("연속 3일 → streak 3", () => {
    const h = mkHistory(["2026-05-01", "2026-05-02", "2026-05-03"]);
    expect(computeLongestStreak(h)).toBe(3);
  });

  it("중간 1일 빠짐 → streak 1", () => {
    const h = mkHistory(["2026-05-01", "2026-05-03"]);
    expect(computeLongestStreak(h)).toBe(1);
  });

  it("같은 날짜 중복 입력 → streak 1 (unique days 기준)", () => {
    const h = mkHistory(["2026-05-01", "2026-05-01", "2026-05-01"]);
    expect(computeLongestStreak(h)).toBe(1);
  });

  it("빈 히스토리 → 0", () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it("연속 5일 + 2일 공백 후 3일 → streak 5", () => {
    const h = mkHistory([
      "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
      "2026-05-08", "2026-05-09", "2026-05-10",
    ]);
    expect(computeLongestStreak(h)).toBe(5);
  });
});

describe("computeWritingDays", () => {
  it("같은 날짜 3회 저장 → 1일", () => {
    const h = mkHistory(["2026-05-01", "2026-05-01", "2026-05-01"]);
    expect(computeWritingDays(h)).toBe(1);
  });

  it("서로 다른 날짜 3개 → 3일", () => {
    const h = mkHistory(["2026-05-01", "2026-05-02", "2026-05-03"]);
    expect(computeWritingDays(h)).toBe(3);
  });

  it("빈 히스토리 → 0", () => {
    expect(computeWritingDays([])).toBe(0);
  });

  it("기간 필터 — periodStart/periodEnd 밖 항목 제외", () => {
    const h = mkHistory(["2026-04-30", "2026-05-01", "2026-05-15", "2026-06-01"]);
    // periodStartTs("2026-05") = 2026-05-01 00:00 UTC (inclusive)
    // periodEndTs("2026-06")   = 2026-07-01 00:00 UTC (exclusive) → 6월 포함
    // 포함: 2026-05-01, 2026-05-15, 2026-06-01 = 3개
    // 제외: 2026-04-30 (start 이전)
    const count = computeWritingDays(h, {
      periodStart: "2026-05",
      periodEnd: "2026-06",
    });
    expect(count).toBe(3); // 2026-05-01, 2026-05-15, 2026-06-01
  });

  it("기간 필터 — periodEnd 직전 월까지만 포함 (7월 제외)", () => {
    const h = mkHistory(["2026-05-01", "2026-06-30", "2026-07-01"]);
    // periodEndTs("2026-07") = 2026-08-01 00:00 UTC → 7월까지 포함
    // periodEndTs("2026-06") = 2026-07-01 00:00 UTC → 6월까지 포함, 7월 제외
    const count = computeWritingDays(h, {
      periodStart: "2026-05",
      periodEnd: "2026-06",
    });
    expect(count).toBe(2); // 2026-05-01, 2026-06-30
  });
});

describe("computeParticipationRate", () => {
  it("빈 히스토리 → 0 (0 나누기 방어)", () => {
    expect(computeParticipationRate([])).toBe(0);
  });

  it("반환값이 0~100 사이", () => {
    const h = mkHistory(["2026-05-01", "2026-05-02"]);
    const rate = computeParticipationRate(h, {
      periodStart: "2026-05",
      periodEnd: "2026-06",
    });
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });
});

describe("computeReadingStats", () => {
  it("기간 필터 — periodStart/End 내 논문만 카운트", () => {
    const papers: ResearchPaper[] = [
      mkPaper({ id: "p1", createdAt: "2026-04-15T00:00:00Z", readStatus: "completed" }),
      mkPaper({ id: "p2", createdAt: "2026-05-01T00:00:00Z", readStatus: "completed" }),
      mkPaper({ id: "p3", createdAt: "2026-05-10T00:00:00Z", readStatus: "reading" }),
      mkPaper({ id: "p4", createdAt: "2026-06-01T00:00:00Z", readStatus: "to_read" }),
      mkPaper({ id: "p5", createdAt: "2026-05-20T00:00:00Z", readStatus: "to_read" }),
      mkPaper({ id: "p6", createdAt: "2026-07-01T00:00:00Z", readStatus: "to_read" }),
    ];
    const stats = computeReadingStats(papers, {
      periodStart: "2026-05",
      periodEnd: "2026-06",
    });
    // periodStartTs("2026-05") = 2026-05-01 00:00 UTC (inclusive)
    // periodEndTs("2026-06")   = 2026-07-01 00:00 UTC (exclusive)
    // 포함: p2(completed), p3(reading), p4(to_read), p5(to_read) = 4
    // 제외: p1(4월, start 이전), p6(7월, end 이후)
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(1);
    expect(stats.reading).toBe(1);
    expect(stats.toRead).toBe(2);
  });

  it("기간 필터 — 5월만 (periodEnd=2026-05 → 6월 제외)", () => {
    const papers: ResearchPaper[] = [
      mkPaper({ id: "p1", createdAt: "2026-05-01T00:00:00Z", readStatus: "completed" }),
      mkPaper({ id: "p2", createdAt: "2026-05-31T00:00:00Z", readStatus: "reading" }),
      mkPaper({ id: "p3", createdAt: "2026-06-01T00:00:00Z", readStatus: "to_read" }),
    ];
    const stats = computeReadingStats(papers, {
      periodStart: "2026-05",
      periodEnd: "2026-05",
    });
    // periodEndTs("2026-05") = 2026-06-01 00:00 UTC → p3(2026-06-01) 제외
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.reading).toBe(1);
  });

  it("isDraft=true 논문은 제외", () => {
    const papers: ResearchPaper[] = [
      mkPaper({ id: "p1", isDraft: true, readStatus: "completed" }),
      mkPaper({ id: "p2", isDraft: false, readStatus: "completed" }),
    ];
    const stats = computeReadingStats(papers);
    expect(stats.total).toBe(1);
    expect(stats.completed).toBe(1);
  });

  it("빈 배열 → 전부 0", () => {
    const stats = computeReadingStats([]);
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
    expect(stats.reading).toBe(0);
    expect(stats.toRead).toBe(0);
  });
});
