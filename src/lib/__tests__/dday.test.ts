/**
 * dday.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * D-day 계산은 세미나 마감, 수강신청, 논문 심사 등 전체 시스템에서 참조.
 * 경계값(오늘/미래/지남)·dueTime 처리·KST 날짜 오프셋을 검증.
 */

import { describe, expect, it } from "vitest";
import {
  formatDday,
  isDueToday,
  todayYmdLocal,
  todayYmdKst,
} from "@/lib/dday";

/** 특정 날짜·시간의 Date 객체 생성 (로컬 시간 기준) */
function mkDate(y: number, m: number, d: number, h = 12, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0);
}

describe("formatDday", () => {
  it("미래 날짜 → kind=future, label=D-N", () => {
    const now = mkDate(2026, 5, 1);
    const result = formatDday("2026-05-10", undefined, now);
    expect(result?.kind).toBe("future");
    expect(result?.diffDays).toBe(9);
    expect(result?.label).toBe("D-9");
  });

  it("내일 → D-1", () => {
    const now = mkDate(2026, 5, 1, 9, 0);
    const result = formatDday("2026-05-02", undefined, now);
    expect(result?.kind).toBe("future");
    expect(result?.label).toBe("D-1");
  });

  it("오늘 마감(dueTime 없음) → D-day + 분 표시", () => {
    // 23:59 마감 기준, 현재 12:00 → 약 11시간 59분 남음
    const now = mkDate(2026, 5, 13, 12, 0);
    const result = formatDday("2026-05-13", undefined, now);
    expect(result?.kind).toBe("today");
    expect(result?.diffDays).toBe(0);
    expect(result?.label).toContain("D-day");
    expect(result?.remainingMinutes).toBeGreaterThan(0);
  });

  it("오늘 마감(dueTime=18:00) → 잔여 시간 정확히 계산", () => {
    const now = mkDate(2026, 5, 13, 15, 30); // 15:30
    const result = formatDday("2026-05-13", "18:00", now);
    expect(result?.kind).toBe("today");
    // 18:00 - 15:30 = 2시간 30분 = 150분
    expect(result?.remainingMinutes).toBe(150);
    expect(result?.label).toContain("2시간 30분 남음");
  });

  it("오늘 마감 시간 이미 지남 → '마감 임박' 라벨", () => {
    const now = mkDate(2026, 5, 13, 19, 0); // 19:00, 마감은 18:00
    const result = formatDday("2026-05-13", "18:00", now);
    expect(result?.kind).toBe("today");
    expect(result?.label).toContain("마감 임박");
    expect(result?.remainingMinutes).toBe(0);
  });

  it("과거 날짜 → kind=past, label=D+N", () => {
    const now = mkDate(2026, 5, 13);
    const result = formatDday("2026-05-10", undefined, now);
    expect(result?.kind).toBe("past");
    expect(result?.diffDays).toBe(-3);
    expect(result?.label).toBe("D+3 · 지남");
  });

  it("어제 → D+1 · 지남", () => {
    const now = mkDate(2026, 5, 13, 9, 0);
    const result = formatDday("2026-05-12", undefined, now);
    expect(result?.kind).toBe("past");
    expect(result?.label).toBe("D+1 · 지남");
  });

  it("잘못된 날짜 형식 → null 반환", () => {
    const now = mkDate(2026, 5, 13);
    expect(formatDday("", undefined, now)).toBeNull();
    expect(formatDday("20260513", undefined, now)).toBeNull();
    expect(formatDday("2026/05/13", undefined, now)).toBeNull();
  });

  it("dueTime 범위 초과(25:99) → 23:59 clamp 후 계산", () => {
    const now = mkDate(2026, 5, 13, 12, 0);
    const result = formatDday("2026-05-13", "25:99", now);
    // clamp 후 23:59 기준
    expect(result?.kind).toBe("today");
    expect(result?.remainingMinutes).toBeGreaterThan(0);
  });

  it("잔여 1분 미만 → 마감 임박 처리", () => {
    const now = mkDate(2026, 5, 13, 23, 59);
    const result = formatDday("2026-05-13", "23:59", now);
    expect(result?.kind).toBe("today");
    // 정확히 0분이거나 -로 떨어지면 임박
    expect(result?.label).toContain("D-day");
  });
});

describe("isDueToday", () => {
  it("오늘 날짜 → true", () => {
    const now = mkDate(2026, 5, 13, 10, 0);
    expect(isDueToday("2026-05-13", now)).toBe(true);
  });

  it("어제 날짜 → false", () => {
    const now = mkDate(2026, 5, 13);
    expect(isDueToday("2026-05-12", now)).toBe(false);
  });

  it("내일 날짜 → false", () => {
    const now = mkDate(2026, 5, 13);
    expect(isDueToday("2026-05-14", now)).toBe(false);
  });

  it("undefined → false", () => {
    expect(isDueToday(undefined)).toBe(false);
  });

  it("null → false", () => {
    expect(isDueToday(null)).toBe(false);
  });

  it("빈 문자열 → false", () => {
    expect(isDueToday("")).toBe(false);
  });
});

describe("todayYmdLocal", () => {
  it("YYYY-MM-DD 형식 반환", () => {
    const now = mkDate(2026, 5, 13);
    const result = todayYmdLocal(now);
    expect(result).toBe("2026-05-13");
  });

  it("단자리 월/일 0 패딩", () => {
    const now = mkDate(2026, 1, 3);
    const result = todayYmdLocal(now);
    expect(result).toBe("2026-01-03");
  });
});

describe("todayYmdKst", () => {
  it("KST 날짜를 YYYY-MM-DD 형식으로 반환", () => {
    // 2026-05-13 01:00 KST = 2026-05-12 16:00 UTC
    // UTC 기준 Date 객체 생성
    const utcDate = new Date("2026-05-13T01:00:00+09:00");
    const result = todayYmdKst(utcDate);
    expect(result).toBe("2026-05-13");
  });

  it("UTC 자정 직전(KST 오전 8:59) → KST 날짜 기준", () => {
    // 2026-05-12 23:59 UTC = 2026-05-13 08:59 KST
    const utcDate = new Date("2026-05-12T23:59:00Z");
    const result = todayYmdKst(utcDate);
    expect(result).toBe("2026-05-13");
  });
});
