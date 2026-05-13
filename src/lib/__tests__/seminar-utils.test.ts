/**
 * seminar-utils.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 세미나 상태(upcoming/ongoing/completed/cancelled)는 홈·세미나 목록·관리 화면에서
 * 실시간으로 참조됨. 경계값 오류 시 "진행 중" 상태가 잘못 표시됨.
 */

import { describe, expect, it } from "vitest";
import { formatKST, getComputedStatus } from "@/lib/seminar-utils";
import type { Seminar } from "@/types";

type SeminarInput = Pick<Seminar, "status" | "date" | "time">;

function mkSeminar(partial: Partial<SeminarInput> = {}): SeminarInput {
  return {
    status: "upcoming",
    date: "2026-05-20",
    time: "19:00",
    ...partial,
  };
}

// ── formatKST ────────────────────────────────────────────────────────────────

describe("formatKST", () => {
  it("UTC ISO → KST MM/DD HH:mm 형식 변환", () => {
    // 2026-05-13T10:00:00Z = KST 2026-05-13 19:00
    expect(formatKST("2026-05-13T10:00:00Z")).toBe("05/13 19:00");
  });

  it("UTC 자정(00:00Z) → KST 09:00", () => {
    // 2026-05-13T00:00:00Z = KST 2026-05-13 09:00
    expect(formatKST("2026-05-13T00:00:00Z")).toBe("05/13 09:00");
  });

  it("UTC 전날 15:00Z → KST 다음날 00:00", () => {
    // 2026-05-12T15:00:00Z = KST 2026-05-13 00:00
    expect(formatKST("2026-05-12T15:00:00Z")).toBe("05/13 00:00");
  });

  it("월/일 0 패딩 — 1월 1일 01:00 UTC → KST", () => {
    // 2026-01-01T01:00:00Z = KST 01/01 10:00
    expect(formatKST("2026-01-01T01:00:00Z")).toBe("01/01 10:00");
  });
});

// ── getComputedStatus ─────────────────────────────────────────────────────────

describe("getComputedStatus", () => {
  it("status=cancelled → cancelled 유지 (날짜 무관)", () => {
    const past = mkSeminar({ status: "cancelled", date: "2026-01-01", time: "10:00" });
    const now = new Date("2026-05-13T12:00:00+09:00");
    expect(getComputedStatus(past, now)).toBe("cancelled");
  });

  it("status=draft → draft 유지", () => {
    const s = mkSeminar({ status: "draft", date: "2026-01-01" });
    const now = new Date("2026-05-13T12:00:00+09:00");
    expect(getComputedStatus(s, now)).toBe("draft");
  });

  it("현재 시각이 시작 전 → upcoming", () => {
    // 세미나: 2026-05-20 19:00 KST
    // 현재:   2026-05-20 18:00 KST
    const s = mkSeminar({ date: "2026-05-20", time: "19:00" });
    const now = new Date("2026-05-20T09:00:00Z"); // UTC = KST 18:00
    expect(getComputedStatus(s, now)).toBe("upcoming");
  });

  it("현재 시각이 시작 후~종료 전(2시간 이내) → ongoing", () => {
    // 세미나: 2026-05-20 19:00 KST, 종료: 21:00 KST
    // 현재:   2026-05-20 19:30 KST = UTC 10:30
    const s = mkSeminar({ date: "2026-05-20", time: "19:00" });
    const now = new Date("2026-05-20T10:30:00Z"); // KST 19:30
    expect(getComputedStatus(s, now)).toBe("ongoing");
  });

  it("현재 시각이 종료 후(2시간 경과) → completed", () => {
    // 세미나: 2026-05-20 19:00 KST, 종료: 21:00 KST
    // 현재:   2026-05-20 21:01 KST = UTC 12:01
    const s = mkSeminar({ date: "2026-05-20", time: "19:00" });
    const now = new Date("2026-05-20T12:01:00Z"); // KST 21:01
    expect(getComputedStatus(s, now)).toBe("completed");
  });

  it("정확히 시작 시각 → ongoing", () => {
    // 2026-05-20 19:00 KST = UTC 10:00
    const s = mkSeminar({ date: "2026-05-20", time: "19:00" });
    const now = new Date("2026-05-20T10:00:00Z");
    expect(getComputedStatus(s, now)).toBe("ongoing");
  });

  it("정확히 종료 시각(2시간 후) → completed", () => {
    // 2026-05-20 21:00 KST = UTC 12:00
    const s = mkSeminar({ date: "2026-05-20", time: "19:00" });
    const now = new Date("2026-05-20T12:00:00Z");
    expect(getComputedStatus(s, now)).toBe("completed");
  });

  it("time 미지정(빈 문자열) → 00:00 기준 처리", () => {
    const s = mkSeminar({ date: "2026-05-20", time: "" });
    // 시작: 2026-05-20 00:00 KST = UTC 2026-05-19T15:00:00Z
    // 종료: 2026-05-20 02:00 KST = UTC 2026-05-19T17:00:00Z
    // 현재: 2026-05-20 01:00 KST = UTC 2026-05-19T16:00:00Z → ongoing
    const now = new Date("2026-05-19T16:00:00Z");
    expect(getComputedStatus(s, now)).toBe("ongoing");
  });

  it("과거 날짜 완료 세미나 → completed", () => {
    const s = mkSeminar({ date: "2026-01-10", time: "14:00" });
    const now = new Date("2026-05-13T00:00:00Z");
    expect(getComputedStatus(s, now)).toBe("completed");
  });
});
