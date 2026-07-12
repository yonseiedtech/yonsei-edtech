/**
 * lesson-design.ts 단위 테스트 — 학습목표·과정안 조립 순수 함수.
 *
 * 규칙 활용("찾다"→"찾을 수 있다", "이해하다"→"이해할 수 있다"), 3요소 조립,
 * 과정안 표 텍스트(헤더·합계) 조립을 검증한다.
 */

import { describe, expect, it } from "vitest";
import {
  buildLessonPlanText,
  buildObjectiveSentence,
  toCanDoForm,
  type LearningObjective,
  type LessonPlanRow,
} from "@/lib/lesson-design";

function objective(overrides: Partial<LearningObjective> = {}): LearningObjective {
  return { id: "o1", condition: "", behavior: "", criterion: "", ...overrides };
}

function row(overrides: Partial<LessonPlanRow> = {}): LessonPlanRow {
  return { id: "r1", stage: "", activity: "", materials: "", minutes: "", ...overrides };
}

describe("toCanDoForm", () => {
  it("받침 있는 어간은 '을 수 있다'를 붙인다", () => {
    expect(toCanDoForm("찾다")).toBe("찾을 수 있다");
  });

  it("받침 없는 어간은 종성 ㄹ을 넣어 '할 수 있다'가 된다", () => {
    expect(toCanDoForm("이해하다")).toBe("이해할 수 있다");
  });

  it("ㄹ 받침 어간은 받침을 유지한다", () => {
    expect(toCanDoForm("만들다")).toBe("만들 수 있다");
  });

  it("이미 '수 있다'로 끝나면 그대로 둔다", () => {
    expect(toCanDoForm("설명할 수 있다")).toBe("설명할 수 있다");
  });
});

describe("buildObjectiveSentence", () => {
  it("조건·준거·행동 3요소를 한 문장으로 조립한다", () => {
    const s = buildObjectiveSentence(
      objective({ condition: "지도를 보고", behavior: "현재 위치를 찾다", criterion: "정확하게" }),
    );
    expect(s).toBe("지도를 보고, 현재 위치를 정확하게 찾을 수 있다.");
  });

  it("조건·준거가 비면 행동만으로 문장을 만든다", () => {
    const s = buildObjectiveSentence(objective({ behavior: "개념을 설명하다" }));
    expect(s).toBe("개념을 설명할 수 있다.");
  });

  it("수행 행동이 비면 빈 문자열을 반환한다", () => {
    expect(buildObjectiveSentence(objective({ condition: "혼자서", criterion: "빠르게" }))).toBe("");
  });
});

describe("buildLessonPlanText", () => {
  it("헤더·행·합계를 탭 구분 표로 조립한다", () => {
    const text = buildLessonPlanText(
      [
        row({ stage: "도입", activity: "동기 유발", materials: "PPT", minutes: "10" }),
        row({ id: "r2", stage: "전개", activity: "시범·연습", materials: "활동지", minutes: "30" }),
      ],
      { title: "분수의 덧셈", objective: "분수를 더할 수 있다." },
    );
    const lines = text.split("\n");
    expect(lines[0]).toBe("■ 주제: 분수의 덧셈");
    expect(lines[1]).toBe("■ 학습목표: 분수를 더할 수 있다.");
    expect(lines).toContain("단계\t교수학습 활동\t자료·유의점\t시간(분)");
    expect(lines).toContain("도입\t동기 유발\tPPT\t10");
    expect(lines[lines.length - 1]).toBe("\t\t합계\t40");
  });

  it("빈 칸은 '-'로 채운다", () => {
    const text = buildLessonPlanText([row({ stage: "정리" })]);
    expect(text).toContain("정리\t-\t-\t-");
  });
});
