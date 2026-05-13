/**
 * semesterWeeks.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 학기 주차 계산은 수업 출결 마킹, 진도율 표시, "이번 주 수업" 강조에 사용.
 * 잘못된 개강일 추론 시 주차 번호가 1 오프셋 발생함.
 */

import { describe, expect, it } from "vitest";
import {
  inferSemesterStartDate,
  buildSemesterWeeks,
  isInWeek,
  findWeekForDate,
  getCalendarWeekRange,
  isCurrentCalendarWeek,
  findCurrentCalendarWeek,
  DEFAULT_TOTAL_WEEKS,
} from "@/lib/semesterWeeks";
import type { ParsedSchedule } from "@/lib/courseSchedule";

function mkSchedule(weekdays: number[]): ParsedSchedule {
  return { weekdays, periods: [], timeRange: null } as unknown as ParsedSchedule;
}

// ── inferSemesterStartDate ────────────────────────────────────────────────────

describe("inferSemesterStartDate", () => {
  it("2026 spring, 수요일(3) → 3월 첫째 수요일", () => {
    // 2026-03-01은 일요일(0), 수요일까지 diff=(3-0+7)%7=3 → 2026-03-04
    const result = inferSemesterStartDate(2026, "spring", [3]);
    expect(result).toBe("2026-03-04");
  });

  it("2026 fall, 월요일(1) → 9월 첫째 월요일", () => {
    // 2026-09-01은 화요일(2), 월요일까지 diff=(1-2+7)%7=6 → 2026-09-07
    const result = inferSemesterStartDate(2026, "fall", [1]);
    expect(result).toBe("2026-09-07");
  });

  it("여러 요일 → 가장 이른 요일의 첫 발생일", () => {
    // 2026 spring: 월(1)이 수(3)보다 먼저
    const result = inferSemesterStartDate(2026, "spring", [3, 1]);
    // 2026-03-01=일(0), 월요일: diff=(1-0+7)%7=1 → 2026-03-02
    // 수요일: diff=3 → 2026-03-04
    // 더 이른 것: 2026-03-02
    expect(result).toBe("2026-03-02");
  });

  it("weekdays 빈 배열 → 월요일(1) 폴백", () => {
    const result = inferSemesterStartDate(2026, "spring", []);
    // 2026-03-01=일, 월요일 diff=1 → 2026-03-02
    expect(result).toBe("2026-03-02");
  });
});

// ── buildSemesterWeeks ────────────────────────────────────────────────────────

describe("buildSemesterWeeks", () => {
  it("기본 15주 생성", () => {
    const weeks = buildSemesterWeeks({
      year: 2026,
      term: "spring",
      schedule: mkSchedule([3]),
    });
    expect(weeks).toHaveLength(DEFAULT_TOTAL_WEEKS);
    expect(weeks[0].weekNo).toBe(1);
    expect(weeks[14].weekNo).toBe(15);
  });

  it("totalWeeks=8 → 8주 생성", () => {
    const weeks = buildSemesterWeeks({
      year: 2026,
      term: "spring",
      schedule: mkSchedule([3]),
      totalWeeks: 8,
    });
    expect(weeks).toHaveLength(8);
  });

  it("semesterStartDate 명시 시 그 날짜부터 시작", () => {
    const weeks = buildSemesterWeeks({
      year: 2026,
      term: "spring",
      schedule: mkSchedule([3]),
      semesterStartDate: "2026-03-10",
      totalWeeks: 3,
    });
    expect(weeks[0].startDate).toBe("2026-03-10");
    expect(weeks[0].endDate).toBe("2026-03-16");
    expect(weeks[1].startDate).toBe("2026-03-17");
    expect(weeks[2].startDate).toBe("2026-03-24");
  });

  it("각 주차 startDate~endDate가 정확히 7일", () => {
    const weeks = buildSemesterWeeks({
      year: 2026,
      term: "spring",
      schedule: mkSchedule([3]),
      semesterStartDate: "2026-03-04",
      totalWeeks: 2,
    });
    // week1: 2026-03-04 ~ 2026-03-10
    expect(weeks[0].startDate).toBe("2026-03-04");
    expect(weeks[0].endDate).toBe("2026-03-10");
  });
});

// ── isInWeek ──────────────────────────────────────────────────────────────────

describe("isInWeek", () => {
  const week = { weekNo: 1, startDate: "2026-03-04", endDate: "2026-03-10" };

  it("범위 내 날짜 → true", () => {
    expect(isInWeek(week, "2026-03-07")).toBe(true);
    expect(isInWeek(week, "2026-03-04")).toBe(true); // 시작일 포함
    expect(isInWeek(week, "2026-03-10")).toBe(true); // 종료일 포함
  });

  it("범위 밖 날짜 → false", () => {
    expect(isInWeek(week, "2026-03-03")).toBe(false);
    expect(isInWeek(week, "2026-03-11")).toBe(false);
  });
});

// ── findWeekForDate ───────────────────────────────────────────────────────────

describe("findWeekForDate", () => {
  const weeks = buildSemesterWeeks({
    year: 2026,
    term: "spring",
    schedule: mkSchedule([3]),
    semesterStartDate: "2026-03-04",
    totalWeeks: 3,
  });

  it("1주차 날짜 → weekNo=1", () => {
    expect(findWeekForDate(weeks, "2026-03-05")?.weekNo).toBe(1);
  });

  it("2주차 날짜 → weekNo=2", () => {
    expect(findWeekForDate(weeks, "2026-03-11")?.weekNo).toBe(2);
  });

  it("학기 범위 밖 → null", () => {
    expect(findWeekForDate(weeks, "2026-04-30")).toBeNull();
  });
});

// ── getCalendarWeekRange ──────────────────────────────────────────────────────

describe("getCalendarWeekRange", () => {
  it("수요일(2026-05-13) → 해당 주 월~일", () => {
    // 2026-05-13은 수요일 → 월: 2026-05-11, 일: 2026-05-17
    const result = getCalendarWeekRange("2026-05-13");
    expect(result.mondayYmd).toBe("2026-05-11");
    expect(result.sundayYmd).toBe("2026-05-17");
  });

  it("월요일 → 자기 자신이 mondayYmd", () => {
    const result = getCalendarWeekRange("2026-05-11");
    expect(result.mondayYmd).toBe("2026-05-11");
    expect(result.sundayYmd).toBe("2026-05-17");
  });

  it("일요일 → 해당 주 일요일", () => {
    const result = getCalendarWeekRange("2026-05-17");
    expect(result.mondayYmd).toBe("2026-05-11");
    expect(result.sundayYmd).toBe("2026-05-17");
  });
});

// ── isCurrentCalendarWeek / findCurrentCalendarWeek ───────────────────────────

describe("isCurrentCalendarWeek", () => {
  const week = { weekNo: 7, startDate: "2026-05-13", endDate: "2026-05-19" };

  it("startDate가 오늘 달력 주 안 → true", () => {
    // 오늘이 수요일 2026-05-13 → 달력 주: 월 05-11 ~ 일 05-17
    // week.startDate = 05-13 (목요일) — 달력 주 안에 포함
    expect(isCurrentCalendarWeek(week, "2026-05-13")).toBe(true);
  });

  it("startDate가 오늘 달력 주 밖 → false", () => {
    // 오늘이 2026-04-01이면 달력 주: 03-30~04-05 → 05-13은 밖
    expect(isCurrentCalendarWeek(week, "2026-04-01")).toBe(false);
  });
});

describe("findCurrentCalendarWeek", () => {
  const weeks = buildSemesterWeeks({
    year: 2026,
    term: "spring",
    schedule: mkSchedule([3]), // 수요일
    semesterStartDate: "2026-03-04",
  });

  it("오늘이 3주차 달력 주 → weekNo=3 반환", () => {
    // weeks[2].startDate = 2026-03-18(수)
    // 달력 주: 2026-03-16(월) ~ 2026-03-22(일) → 03-18 포함
    const result = findCurrentCalendarWeek(weeks, "2026-03-16");
    expect(result?.weekNo).toBe(3);
  });

  it("학기 외 날짜 → null", () => {
    expect(findCurrentCalendarWeek(weeks, "2027-01-01")).toBeNull();
  });
});
