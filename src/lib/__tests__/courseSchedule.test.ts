/**
 * courseSchedule.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 자유 텍스트 schedule 파싱은 엣지 케이스가 다양하고,
 * 강의 시간표 렌더링 및 주차 계산에 직접 영향.
 * 교시→시각 변환 오류 시 수업 알림 시간이 잘못됨.
 */

import { describe, expect, it } from "vitest";
import {
  parseSchedule,
  fmtTimeRange,
  normalizePeriodSchedule,
  PERIOD_TIMES,
} from "@/lib/courseSchedule";

describe("parseSchedule — HH:MM 범위 파싱", () => {
  it("표준 형식 '월 18:30-21:00'", () => {
    const r = parseSchedule("월 18:30-21:00");
    expect(r.weekdays).toEqual([1]); // 월=1
    expect(r.startMin).toBe(18 * 60 + 30); // 1110
    expect(r.endMin).toBe(21 * 60);         // 1260
  });

  it("복수 요일 '월수 19:00~21:30'", () => {
    const r = parseSchedule("월수 19:00~21:30");
    expect(r.weekdays).toContain(1); // 월
    expect(r.weekdays).toContain(3); // 수
    expect(r.startMin).toBe(19 * 60);
    expect(r.endMin).toBe(21 * 60 + 30);
  });

  it("~ 구분자 지원", () => {
    const r = parseSchedule("화 18:30~21:00");
    expect(r.weekdays).toEqual([2]); // 화=2
    expect(r.startMin).toBe(18 * 60 + 30);
    expect(r.endMin).toBe(21 * 60);
  });

  it("공백이 있어도 파싱 성공 '화 18:30 - 21:00'", () => {
    const r = parseSchedule("화 18:30 - 21:00");
    expect(r.startMin).toBe(18 * 60 + 30);
    expect(r.endMin).toBe(21 * 60);
  });
});

describe("parseSchedule — 교시 폴백", () => {
  it("'목 1,2교시' → 1교시 시작 ~ 2교시 종료", () => {
    const r = parseSchedule("목 1,2교시");
    expect(r.weekdays).toContain(4); // 목=4
    expect(r.startMin).toBe(PERIOD_TIMES[1].start); // 18:20 = 1100
    expect(r.endMin).toBe(PERIOD_TIMES[2].end);     // 20:00 = 1200
  });

  it("'월 3·4교시' → 3교시 시작 ~ 4교시 종료", () => {
    const r = parseSchedule("월 3·4교시");
    expect(r.weekdays).toContain(1);
    expect(r.startMin).toBe(PERIOD_TIMES[3].start);
    expect(r.endMin).toBe(PERIOD_TIMES[4].end);
  });

  it("단일 교시 '수 2교시'", () => {
    const r = parseSchedule("수 2교시");
    expect(r.weekdays).toContain(3); // 수=3
    expect(r.startMin).toBe(PERIOD_TIMES[2].start);
    expect(r.endMin).toBe(PERIOD_TIMES[2].end);
  });
});

describe("parseSchedule — 빈/잘못된 입력", () => {
  it("undefined → 빈 결과", () => {
    const r = parseSchedule(undefined);
    expect(r.weekdays).toEqual([]);
    expect(r.startMin).toBeNull();
    expect(r.endMin).toBeNull();
  });

  it("빈 문자열 → 빈 결과", () => {
    const r = parseSchedule("");
    expect(r.weekdays).toEqual([]);
    expect(r.startMin).toBeNull();
    expect(r.endMin).toBeNull();
  });

  it("요일만 있고 시간 없으면 weekdays만 채워짐", () => {
    const r = parseSchedule("화목");
    expect(r.weekdays).toContain(2);
    expect(r.weekdays).toContain(4);
    expect(r.startMin).toBeNull();
    expect(r.endMin).toBeNull();
  });
});

describe("fmtTimeRange", () => {
  it("startMin/endMin 있으면 'HH:MM~HH:MM' 반환", () => {
    const label = fmtTimeRange({ weekdays: [1], startMin: 18 * 60 + 30, endMin: 21 * 60 });
    expect(label).toBe("18:30~21:00");
  });

  it("시간 없으면 빈 문자열", () => {
    expect(fmtTimeRange({ weekdays: [], startMin: null, endMin: null })).toBe("");
  });
});

describe("normalizePeriodSchedule", () => {
  it("교시 표기 → 'HH:MM~HH:MM' 정규화", () => {
    const result = normalizePeriodSchedule("월 3·4교시");
    expect(result).not.toBeNull();
    // 3교시 시작 20:10, 4교시 종료 21:50
    expect(result).toContain("20:10");
    expect(result).toContain("21:50");
  });

  it("이미 HH:MM 범위 있으면 null 반환 (변경 불필요)", () => {
    expect(normalizePeriodSchedule("월 18:30-21:00")).toBeNull();
  });

  it("교시 표기 없으면 null", () => {
    expect(normalizePeriodSchedule("월수 강의")).toBeNull();
  });

  it("undefined → null", () => {
    expect(normalizePeriodSchedule(undefined)).toBeNull();
  });
});
