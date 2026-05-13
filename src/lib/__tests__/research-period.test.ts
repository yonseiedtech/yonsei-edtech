/**
 * research-period.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 연구 기간 필터는 마이페이지 내 연구 탭·관리 화면에서 논문 필터링에 사용.
 * 경계값(월 시작·종료·fallback) 오류 시 누락/초과 논문이 표시됨.
 */

import { describe, expect, it } from "vitest";
import {
  parseYearMonth,
  periodStartTs,
  periodEndTs,
  isPaperInPeriod,
  formatPeriodLabel,
} from "@/lib/research-period";

// ── parseYearMonth ────────────────────────────────────────────────────────────

describe("parseYearMonth", () => {
  it("정상 YYYY-MM → { year, month }", () => {
    expect(parseYearMonth("2026-05")).toEqual({ year: 2026, month: 5 });
    expect(parseYearMonth("2026-12")).toEqual({ year: 2026, month: 12 });
    expect(parseYearMonth("2026-1")).toEqual({ year: 2026, month: 1 });
  });

  it("undefined/null → null", () => {
    expect(parseYearMonth(undefined)).toBeNull();
    expect(parseYearMonth(null)).toBeNull();
    expect(parseYearMonth("")).toBeNull();
  });

  it("잘못된 형식 → null", () => {
    expect(parseYearMonth("2026")).toBeNull();
    expect(parseYearMonth("2026/05")).toBeNull();
    expect(parseYearMonth("abc-05")).toBeNull();
  });

  it("월 범위 초과(0, 13) → null", () => {
    expect(parseYearMonth("2026-00")).toBeNull();
    expect(parseYearMonth("2026-13")).toBeNull();
  });

  it("연도 범위 초과(< 1900, > 2100) → null", () => {
    expect(parseYearMonth("1800-01")).toBeNull();
    expect(parseYearMonth("2200-01")).toBeNull();
  });
});

// ── periodStartTs / periodEndTs ───────────────────────────────────────────────

describe("periodStartTs", () => {
  it("2026-05 → 2026-05-01 00:00 UTC ms", () => {
    const ts = periodStartTs("2026-05");
    expect(ts).toBe(Date.UTC(2026, 4, 1, 0, 0, 0));
  });

  it("null/undefined → null", () => {
    expect(periodStartTs(null)).toBeNull();
    expect(periodStartTs(undefined)).toBeNull();
  });
});

describe("periodEndTs", () => {
  it("2026-05 → 2026-06-01 00:00 UTC ms (exclusive)", () => {
    const ts = periodEndTs("2026-05");
    expect(ts).toBe(Date.UTC(2026, 5, 1, 0, 0, 0));
  });

  it("2026-12 → 2027-01-01 00:00 UTC (연말 처리)", () => {
    const ts = periodEndTs("2026-12");
    expect(ts).toBe(Date.UTC(2027, 0, 1, 0, 0, 0));
  });

  it("null → null", () => {
    expect(periodEndTs(null)).toBeNull();
  });
});

// ── isPaperInPeriod ───────────────────────────────────────────────────────────

describe("isPaperInPeriod", () => {
  it("start/end 모두 없음 → true (전체 기간)", () => {
    expect(isPaperInPeriod({ createdAt: "2026-05-01T00:00:00Z" })).toBe(true);
    expect(isPaperInPeriod({})).toBe(true);
  });

  it("createdAt이 기간 내 → true", () => {
    expect(
      isPaperInPeriod(
        { createdAt: "2026-05-15T00:00:00Z" },
        "2026-05",
        "2026-05",
      ),
    ).toBe(true);
  });

  it("createdAt이 start 이전 → false", () => {
    expect(
      isPaperInPeriod(
        { createdAt: "2026-04-30T23:59:59Z" },
        "2026-05",
        "2026-06",
      ),
    ).toBe(false);
  });

  it("createdAt이 end와 같거나 이후(exclusive) → false", () => {
    // periodEndTs("2026-05") = 2026-06-01 UTC → 정확히 그 시각은 제외
    expect(
      isPaperInPeriod(
        { createdAt: "2026-06-01T00:00:00Z" },
        "2026-05",
        "2026-05",
      ),
    ).toBe(false);
  });

  it("start만 있을 때: start 이전 → false, 이후 → true", () => {
    expect(
      isPaperInPeriod({ createdAt: "2026-04-01T00:00:00Z" }, "2026-05", null),
    ).toBe(false);
    expect(
      isPaperInPeriod({ createdAt: "2026-06-01T00:00:00Z" }, "2026-05", null),
    ).toBe(true);
  });

  it("end만 있을 때: end 이후 → false, 이전 → true", () => {
    expect(
      isPaperInPeriod({ createdAt: "2026-07-01T00:00:00Z" }, null, "2026-06"),
    ).toBe(false);
    expect(
      isPaperInPeriod({ createdAt: "2026-05-01T00:00:00Z" }, null, "2026-06"),
    ).toBe(true);
  });

  it("createdAt 없고 year만 있을 때 fallback (year → 1월 1일 UTC)", () => {
    // year=2026 → ts = 2026-01-01T00:00:00Z
    expect(
      isPaperInPeriod({ year: 2026 }, "2026-01", "2026-01"),
    ).toBe(true);
    expect(
      isPaperInPeriod({ year: 2026 }, "2026-02", "2026-12"),
    ).toBe(false); // 1월 1일은 2월 이전
  });

  it("createdAt도 year도 없음 → false (보수적 처리)", () => {
    expect(isPaperInPeriod({}, "2026-01", "2026-12")).toBe(false);
  });
});

// ── formatPeriodLabel ─────────────────────────────────────────────────────────

describe("formatPeriodLabel", () => {
  it("start+end 모두 있음 → 'YYYY.MM ~ YYYY.MM'", () => {
    expect(formatPeriodLabel("2026-01", "2026-06")).toBe("2026.01 ~ 2026.06");
  });

  it("start만 있음 → 'YYYY.MM ~ 현재'", () => {
    expect(formatPeriodLabel("2026-01", null)).toBe("2026.01 ~ 현재");
  });

  it("end만 있음 → '처음 ~ YYYY.MM'", () => {
    expect(formatPeriodLabel(null, "2026-06")).toBe("처음 ~ 2026.06");
  });

  it("둘 다 없음 → '전체 기간'", () => {
    expect(formatPeriodLabel(null, null)).toBe("전체 기간");
    expect(formatPeriodLabel(undefined, undefined)).toBe("전체 기간");
  });

  it("단자리 월 0 패딩", () => {
    expect(formatPeriodLabel("2026-1", "2026-9")).toBe("2026.01 ~ 2026.09");
  });
});
