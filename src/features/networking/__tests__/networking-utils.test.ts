import { describe, it, expect } from "vitest";
import {
  buildCandidateSlots,
  tallyAvailability,
  countRespondersByDate,
  responderKey,
} from "../networking-utils";

describe("countRespondersByDate — 손실 없는 날짜별 응답자 집계", () => {
  const periodDates = new Set(["2026-07-25", "2026-07-26"]);

  it("candidateSlots 에 없는 시각(제거된 시간대)도 날짜로 집계한다", () => {
    // 회원 A: 후보 시각(18:00), 게스트 B: 제거된 시각(15:00) — 둘 다 7/25
    const responses = [
      { userId: "u1", availableSlots: ["2026-07-25|18:00"] },
      { studentId: "s2", guestName: "게스트", availableSlots: ["2026-07-25|15:00"] },
    ];
    const byDate = countRespondersByDate(responses, periodDates);
    // 시간대는 달라도 '그 날 가능한 서로 다른 응답자'는 2명 — 응답이 누락되지 않아야 한다
    expect(byDate["2026-07-25"]).toBe(2);
  });

  it("같은 응답자가 한 날짜에 여러 슬롯을 골라도 1명으로 센다", () => {
    const responses = [
      { userId: "u1", availableSlots: ["2026-07-25|11:30", "2026-07-25|12:00", "2026-07-25|18:00"] },
    ];
    expect(countRespondersByDate(responses, periodDates)["2026-07-25"]).toBe(1);
  });

  it("기간 밖 날짜는 무시한다", () => {
    const responses = [{ userId: "u1", availableSlots: ["2026-08-01|18:00"] }];
    expect(countRespondersByDate(responses, periodDates)["2026-08-01"]).toBeUndefined();
  });

  it("responderKey — 회원은 userId, 게스트는 studentId 우선", () => {
    expect(responderKey({ userId: "u1", studentId: "s1" })).toBe("u:u1");
    expect(responderKey({ studentId: "s1", guestName: "게스트" })).toBe("g:s1");
    expect(responderKey({ guestName: "게스트" })).toBe("n:게스트");
  });
});

describe("tallyAvailability — 슬롯별 집계(비교 대조)", () => {
  it("candidateSlots 에 없는 슬롯은 슬롯 집계에서 제외된다(설계상)", () => {
    const candidate = buildCandidateSlots("2026-07-25", "2026-07-25", ["18:00"]);
    const tallies = tallyAvailability(
      [
        { userName: "A", availableSlots: ["2026-07-25|18:00"] },
        { userName: "B", availableSlots: ["2026-07-25|15:00"] }, // 후보에 없음 → 슬롯 집계 제외
      ] as never,
      candidate,
    );
    const slot1800 = tallies.find((t) => t.slot === "2026-07-25|18:00");
    expect(slot1800?.count).toBe(1); // 슬롯 단위로는 1 (이래서 헤드라인은 countRespondersByDate 사용)
  });
});
