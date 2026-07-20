/**
 * semester.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 학기 계산은 10+ 모듈이 의존하는 핵심 유틸. 1-2월 경계, 연도 넘김 등에서
 * 오류 시 전체 데이터 집계가 왜곡된다.
 */

import { describe, expect, it } from "vitest";
import {
  cohortKeyOf,
  effectiveSemesterStart,
  formatSemester,
  inferCurrentSemester,
  monthRangeDays,
  previousSemesterRange,
  semesterRange,
} from "@/lib/semester";

describe("formatSemester", () => {
  it("year+semester 양쪽 있으면 '2026년 전기' 형식", () => {
    expect(formatSemester(2026, "first")).toBe("2026년 전기");
    expect(formatSemester(2026, "second")).toBe("2026년 후기");
  });

  it("year 만 있으면 연도만", () => {
    expect(formatSemester(2026, null)).toBe("2026년");
  });

  it("semester 만 있으면 학기 라벨만", () => {
    expect(formatSemester(null, "first")).toBe("전기");
  });

  it("둘 다 없으면 빈 문자열", () => {
    expect(formatSemester(null, null)).toBe("");
    expect(formatSemester(undefined, undefined)).toBe("");
  });
});

describe("inferCurrentSemester", () => {
  it("3월~8월은 전기", () => {
    expect(inferCurrentSemester(new Date("2026-03-01"))).toEqual({
      year: 2026,
      semester: "first",
    });
    expect(inferCurrentSemester(new Date("2026-08-31"))).toEqual({
      year: 2026,
      semester: "first",
    });
  });

  it("9월~12월은 그 해 후기", () => {
    expect(inferCurrentSemester(new Date("2026-09-01"))).toEqual({
      year: 2026,
      semester: "second",
    });
    expect(inferCurrentSemester(new Date("2026-12-31"))).toEqual({
      year: 2026,
      semester: "second",
    });
  });

  it("1월~2월은 작년 후기 (학기 경계 핵심 케이스)", () => {
    expect(inferCurrentSemester(new Date("2026-01-15"))).toEqual({
      year: 2025,
      semester: "second",
    });
    expect(inferCurrentSemester(new Date("2026-02-28"))).toEqual({
      year: 2025,
      semester: "second",
    });
  });
});

describe("semesterRange", () => {
  it("전기 = YYYY-03 ~ YYYY-08", () => {
    const r = semesterRange(2026, "first");
    expect(r.from).toBe("2026-03");
    expect(r.to).toBe("2026-08");
    expect(r.label).toContain("26-1학기");
  });

  it("후기 = YYYY-09 ~ (YYYY+1)-02 (연도 넘김)", () => {
    const r = semesterRange(2026, "second");
    expect(r.from).toBe("2026-09");
    expect(r.to).toBe("2027-02");
    expect(r.label).toContain("26-2학기");
  });
});

describe("previousSemesterRange", () => {
  it("전기 → 작년 후기", () => {
    const r = previousSemesterRange(new Date("2026-04-15"));
    expect(r.from).toBe("2025-09");
    expect(r.to).toBe("2026-02");
  });

  it("후기 → 같은 해 전기", () => {
    const r = previousSemesterRange(new Date("2026-10-15"));
    expect(r.from).toBe("2026-03");
    expect(r.to).toBe("2026-08");
  });

  it("1~2월(작년 후기) → 작년 전기", () => {
    const r = previousSemesterRange(new Date("2026-01-20"));
    // inferCurrentSemester(2026-01) = {2025, second} → previous = same year first = 2025 first
    expect(r.from).toBe("2025-03");
    expect(r.to).toBe("2025-08");
  });
});

describe("cohortKeyOf — C-5 8월 가입 코호트 보정", () => {
  it("enrollmentYear + Half 명시 입력 → createdAt 무시, 폴백 보정 없음", () => {
    // 8월 가입이라도 enrollmentYear/Half 있으면 그대로
    expect(cohortKeyOf({ enrollmentYear: 2026, enrollmentHalf: 1, createdAt: "2026-08-15T00:00:00Z" })).toBe("2026-1");
    expect(cohortKeyOf({ enrollmentYear: 2026, enrollmentHalf: 2, createdAt: "2026-08-15T00:00:00Z" })).toBe("2026-2");
  });

  it("8월 가입(createdAt 폴백) → 다음 학기(후기) 코호트로 보정", () => {
    // 8/2 = 9/1 기준 30일 전 → 경계값 포함
    expect(cohortKeyOf({ createdAt: "2026-08-02T00:00:00Z" })).toBe("2026-2");
    // 8/15 = 17일 전
    expect(cohortKeyOf({ createdAt: "2026-08-15T00:00:00Z" })).toBe("2026-2");
    // 8/31 = 1일 전
    expect(cohortKeyOf({ createdAt: "2026-08-31T00:00:00Z" })).toBe("2026-2");
  });

  it("8/1 가입(31일 전) → 보정 없음, 전기 유지", () => {
    expect(cohortKeyOf({ createdAt: "2026-08-01T00:00:00Z" })).toBe("2026-1");
    expect(cohortKeyOf({ createdAt: "2026-07-15T00:00:00Z" })).toBe("2026-1");
  });

  it("일반 전기 가입 → 전기 코호트", () => {
    expect(cohortKeyOf({ createdAt: "2026-04-01T00:00:00Z" })).toBe("2026-1");
    expect(cohortKeyOf({ createdAt: "2026-03-01T00:00:00Z" })).toBe("2026-1");
  });

  it("일반 후기 가입 → 후기 코호트 (보정 불필요)", () => {
    expect(cohortKeyOf({ createdAt: "2026-09-15T00:00:00Z" })).toBe("2026-2");
    expect(cohortKeyOf({ createdAt: "2026-10-01T00:00:00Z" })).toBe("2026-2");
  });

  it("createdAt 없거나 null → null", () => {
    expect(cohortKeyOf({})).toBeNull();
    expect(cohortKeyOf({ createdAt: null })).toBeNull();
  });
});

describe("effectiveSemesterStart — C-1 실개강일 우선·관례일 폴백", () => {
  it("entries 없으면 관례일 반환", () => {
    expect(effectiveSemesterStart(2026, "first", [])).toBe("2026-03-01");
    expect(effectiveSemesterStart(2026, "second", [])).toBe("2026-09-01");
  });

  it("해당 학기 entries 있으면 실개강일 반환", () => {
    const entries = [{ year: 2026, semester: "second" as const, semesterStart: "2026-09-02" }];
    expect(effectiveSemesterStart(2026, "second", entries)).toBe("2026-09-02");
  });

  it("다른 학기 entries 있어도 해당 없으면 관례일 폴백", () => {
    const entries = [{ year: 2026, semester: "first" as const, semesterStart: "2026-03-04" }];
    expect(effectiveSemesterStart(2026, "second", entries)).toBe("2026-09-01");
  });

  it("entries 기본값(생략) → 관례일 반환", () => {
    expect(effectiveSemesterStart(2026, "first")).toBe("2026-03-01");
  });
});

describe("monthRangeDays", () => {
  it("같은 달 1개월 = 28~31일 (UTC 기준)", () => {
    // 2026-03 → endExclusive=2026-04-01, start=2026-03-01 = 31일
    expect(monthRangeDays("2026-03", "2026-03")).toBe(31);
  });

  it("3개월 범위", () => {
    // 2026-03~05 → start=2026-03-01, endExclusive=2026-06-01 = 92일
    expect(monthRangeDays("2026-03", "2026-05")).toBe(92);
  });

  it("연도 넘김 (후기 범위)", () => {
    // 2026-09 ~ 2027-02 (6개월) = 181일 (sep30 + oct31 + nov30 + dec31 + jan31 + feb28)
    expect(monthRangeDays("2026-09", "2027-02")).toBe(181);
  });

  it("역순(to < from) = 0", () => {
    expect(monthRangeDays("2026-05", "2026-03")).toBe(0);
  });

  it("잘못된 입력 = 0", () => {
    expect(monthRangeDays(null, null)).toBe(0);
    expect(monthRangeDays("invalid", "2026-03")).toBe(0);
    expect(monthRangeDays("2026-03", undefined)).toBe(0);
  });
});
