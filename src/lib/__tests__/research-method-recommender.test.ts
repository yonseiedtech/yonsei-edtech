/**
 * research-method-recommender.ts 단위 테스트 — 연구방법 추천 결정 로직(순수 함수).
 *
 * 목적(verify/understand/develop)과 후속 답에 따라 SEED_RESEARCH_METHODS 정식 명칭의
 * 후보 방법을 1~3개 반환하는지, 접근(kind)이 올바른지 검증한다.
 */

import { describe, expect, it } from "vitest";
import { recommendResearchMethods } from "@/lib/research-method-recommender";

describe("recommendResearchMethods", () => {
  it("검증 + 처치 + 무선할당 가능 → 실험연구(양적)를 최우선 추천한다", () => {
    const recs = recommendResearchMethods({
      goal: "verify",
      hasTreatment: true,
      canRandomize: true,
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
    expect(recs[0].methodName).toBe("실험연구");
    expect(recs[0].kind).toBe("quantitative");
    // 무선할당 불가 시 대안으로 준실험연구를 함께 제시
    expect(recs.some((r) => r.methodName === "준실험연구")).toBe(true);
  });

  it("검증 + 처치 + 무선할당 불가 → 준실험연구 단일 추천", () => {
    const recs = recommendResearchMethods({
      goal: "verify",
      hasTreatment: true,
      canRandomize: false,
    });
    expect(recs).toHaveLength(1);
    expect(recs[0].methodName).toBe("준실험연구");
    expect(recs[0].kind).toBe("quantitative");
  });

  it("개발 + 측정도구 → 측정도구 개발과 타당화(혼합)", () => {
    const recs = recommendResearchMethods({
      goal: "develop",
      developKind: "instrument",
    });
    expect(recs).toHaveLength(1);
    expect(recs[0].methodName).toBe("측정도구 개발과 타당화");
    expect(recs[0].kind).toBe("mixed");
  });

  it("이해 + 체험 초점 → 현상학(질적)", () => {
    const recs = recommendResearchMethods({
      goal: "understand",
      understandFocus: "experience",
    });
    expect(recs[0].methodName).toBe("현상학");
    expect(recs[0].kind).toBe("qualitative");
  });

  it("목적 미선택 → 빈 배열", () => {
    expect(recommendResearchMethods({})).toEqual([]);
    expect(recommendResearchMethods({ goal: "" })).toEqual([]);
  });
});
