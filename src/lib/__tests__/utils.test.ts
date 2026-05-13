/**
 * utils.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * formatGeneration·formatEnrollment·formatDate·formatDistanceToNow는
 * 회원 프로필·게시판 전반에 표시되는 핵심 포맷 함수.
 * 오류 시 기수 표기·날짜 표시가 잘못 렌더링됨.
 */

import { describe, expect, it } from "vitest";
import {
  formatGeneration,
  formatEnrollment,
  formatDate,
  formatDistanceToNow,
} from "@/lib/utils";

// ── formatGeneration ──────────────────────────────────────────────────────────

describe("formatGeneration", () => {
  it("기수만 → 'N기'", () => {
    expect(formatGeneration(3)).toBe("3기");
    expect(formatGeneration(57)).toBe("57기");
  });

  it("기수 + 연도만 → 'N기 (YYYY 전반기)'", () => {
    expect(formatGeneration(3, 2024)).toBe("3기 (2024 전반기)");
  });

  it("enrollmentHalf=1 → 전반기", () => {
    expect(formatGeneration(5, 2025, 1)).toBe("5기 (2025 전반기)");
  });

  it("enrollmentHalf=2 → 후반기", () => {
    expect(formatGeneration(5, 2025, 2)).toBe("5기 (2025 후반기)");
  });

  it("enrollmentYear 없으면 반기 무시", () => {
    expect(formatGeneration(5, undefined, 2)).toBe("5기");
  });
});

// ── formatEnrollment ──────────────────────────────────────────────────────────

describe("formatEnrollment", () => {
  it("연도 없음 → 빈 문자열", () => {
    expect(formatEnrollment()).toBe("");
    expect(formatEnrollment(undefined)).toBe("");
  });

  it("연도만 → 'YYYY'", () => {
    expect(formatEnrollment(2024)).toBe("2024");
  });

  it("연도 + half=1 → 'YYYY 전반기'", () => {
    expect(formatEnrollment(2024, 1)).toBe("2024 전반기");
  });

  it("연도 + half=2 → 'YYYY 후반기'", () => {
    expect(formatEnrollment(2024, 2)).toBe("2024 후반기");
  });

  it("half=0 이나 undefined → 반기 없이 연도만", () => {
    expect(formatEnrollment(2024, 0)).toBe("2024");
    expect(formatEnrollment(2024, undefined)).toBe("2024");
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("유효한 ISO 문자열 → 한국 날짜 형식", () => {
    // 결과는 로케일에 따라 '2024. 01. 15.' 등으로 나올 수 있음
    const result = formatDate("2024-01-15T00:00:00Z");
    expect(result).toMatch(/2024/);
    expect(result).not.toBe("-");
  });

  it("Date 객체도 처리", () => {
    const d = new Date("2024-06-01T00:00:00Z");
    const result = formatDate(d);
    expect(result).toMatch(/2024/);
  });

  it("잘못된 문자열 → '-'", () => {
    expect(formatDate("not-a-date")).toBe("-");
    expect(formatDate("")).toBe("-");
  });
});

// ── formatDistanceToNow ───────────────────────────────────────────────────────

describe("formatDistanceToNow", () => {
  it("방금 (1분 미만) → '방금'", () => {
    const now = new Date(Date.now() - 30_000).toISOString(); // 30초 전
    expect(formatDistanceToNow(now)).toBe("방금");
  });

  it("N분 전 (1~59분)", () => {
    const t = new Date(Date.now() - 5 * 60_000).toISOString(); // 5분 전
    expect(formatDistanceToNow(t)).toBe("5분 전");
  });

  it("N시간 전 (1~23시간)", () => {
    const t = new Date(Date.now() - 3 * 3600_000).toISOString(); // 3시간 전
    expect(formatDistanceToNow(t)).toBe("3시간 전");
  });

  it("N일 전 (24시간 이상)", () => {
    const t = new Date(Date.now() - 2 * 86400_000).toISOString(); // 2일 전
    expect(formatDistanceToNow(t)).toBe("2일 전");
  });

  it("잘못된 날짜 → '-'", () => {
    expect(formatDistanceToNow("not-a-date")).toBe("-");
  });
});
