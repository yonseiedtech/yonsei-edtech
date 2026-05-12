/**
 * interview-target.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 디딤판 학기별 로드맵에서 본인 학기 자동 강조 로직의 핵심 함수.
 * 회귀 시 영향: 모든 디딤판 사용자에게 잘못된 학기 카드가 강조됨.
 */

import { describe, expect, it } from "vitest";
import {
  getUserCumulativeSemesterCount,
  getUserEntryYear,
  getUserEntrySemester,
} from "@/lib/interview-target";
import type { User } from "@/types";

// Helper: 최소 필드 User 객체 생성
function mkUser(partial: Partial<User>): User {
  return {
    id: "u1",
    name: "테스트",
    email: "t@y.ac.kr",
    role: "member" as const,
    approved: true,
    ...partial,
  } as User;
}

describe("getUserEntryYear", () => {
  it("entryYear 필드를 우선 사용한다", () => {
    const user = mkUser({ entryYear: 2024 } as Partial<User>);
    expect(getUserEntryYear(user)).toBe(2024);
  });

  it("entryYear 없으면 studentId 앞 4자리에서 추출한다", () => {
    const user = mkUser({ studentId: "202312345" });
    expect(getUserEntryYear(user)).toBe(2023);
  });

  it("studentId 앞 4자리가 1980~2100 밖이면 null", () => {
    const user = mkUser({ studentId: "999912345" });
    expect(getUserEntryYear(user)).toBeNull();
  });

  it("entryYear도 studentId도 없으면 null", () => {
    const user = mkUser({});
    expect(getUserEntryYear(user)).toBeNull();
  });

  it("entryYear가 1900 이하면 무시하고 studentId fallback", () => {
    const user = mkUser({
      entryYear: 1800,
      studentId: "201500001",
    } as Partial<User>);
    expect(getUserEntryYear(user)).toBe(2015);
  });
});

describe("getUserEntrySemester", () => {
  it("entrySemester = 'second' 이면 'second' 반환", () => {
    const user = mkUser({ entrySemester: "second" } as Partial<User>);
    expect(getUserEntrySemester(user)).toBe("second");
  });

  it("그 외에는 항상 'first' 폴백 (잘못된 값 포함)", () => {
    expect(
      getUserEntrySemester(mkUser({ entrySemester: "first" } as Partial<User>)),
    ).toBe("first");
    expect(getUserEntrySemester(mkUser({}))).toBe("first");
    expect(
      getUserEntrySemester(
        mkUser({ entrySemester: "invalid" } as unknown as Partial<User>),
      ),
    ).toBe("first");
  });
});

describe("getUserCumulativeSemesterCount", () => {
  // 학기 구분: 3~8월 = 1학기, 9~2월 = 2학기

  it("entryYear가 없으면 null", () => {
    expect(getUserCumulativeSemesterCount(mkUser({}))).toBeNull();
  });

  it("동일 연도 동일 학기 입학 = 1학기차", () => {
    const user = mkUser({
      entryYear: 2026,
      entrySemester: "first",
    } as Partial<User>);
    const now = new Date("2026-04-15"); // 1학기
    expect(getUserCumulativeSemesterCount(user, now)).toBe(1);
  });

  it("2026-03 1학기 입학 → 2026-10 = 2학기차", () => {
    const user = mkUser({
      entryYear: 2026,
      entrySemester: "first",
    } as Partial<User>);
    const now = new Date("2026-10-15");
    expect(getUserCumulativeSemesterCount(user, now)).toBe(2);
  });

  it("2025-03 1학기 입학 → 2027-04 = 5학기차 (학년차 2 * 2 + 1)", () => {
    // 함수 정의: yearDiff*2 + 학기 보정 + 1 (1-indexed)
    // 1학기→1학기, yearDiff=2: 2*2 + 0 + 1 = 5
    const user = mkUser({
      entryYear: 2025,
      entrySemester: "first",
    } as Partial<User>);
    const now = new Date("2027-04-15");
    expect(getUserCumulativeSemesterCount(user, now)).toBe(5);
  });

  it("2024-03 1학기 입학 → 2026-10 = 6학기차 (디펜스 학기)", () => {
    const user = mkUser({
      entryYear: 2024,
      entrySemester: "first",
    } as Partial<User>);
    const now = new Date("2026-10-15");
    expect(getUserCumulativeSemesterCount(user, now)).toBe(6);
  });

  it("9월 입학(second) → 익년 3월 1학기 = 3학기차 (함수 정의)", () => {
    // 함수 정의: second→first 보정 -1+1 = 0, yearDiff=1: 1*2 + 0 + 1 = 3
    const user = mkUser({
      entryYear: 2025,
      entrySemester: "second",
    } as Partial<User>);
    const now = new Date("2026-03-15");
    expect(getUserCumulativeSemesterCount(user, now)).toBe(3);
  });

  it("studentId 만으로 입학연도 추정 (2024-1 → 2026-1 = 5학기차)", () => {
    // yearDiff=2: 2*2 + 0 + 1 = 5
    const user = mkUser({
      studentId: "202412345",
      entrySemester: "first",
    } as Partial<User>);
    const now = new Date("2026-04-15");
    expect(getUserCumulativeSemesterCount(user, now)).toBe(5);
  });

  it("입학 직후 (같은 학기) = 1학기차로 강제", () => {
    const user = mkUser({
      entryYear: 2026,
      entrySemester: "second",
    } as Partial<User>);
    const now = new Date("2026-10-15"); // 2학기
    expect(getUserCumulativeSemesterCount(user, now)).toBe(1);
  });
});
