/**
 * stat-method-recommender.ts 단위 테스트 — 설계 조건 기반 통계방법 추천(순수 함수).
 *
 * 무선할당·사전 동질성 확보(사후 t/ANOVA), 비동등 집단(ANCOVA), 단일집단 사전-사후(대응 t),
 * 3집단 이상(ANOVA + 사후검정), 사후만(독립 t) 분기를 검증한다. 추천 name 은 통계 시드 명칭과 일치.
 */

import { describe, expect, it } from "vitest";
import {
  recommendStatMethods,
  buildDesignConditionSummary,
} from "@/lib/stat-method-recommender";

describe("recommendStatMethods", () => {
  it("2집단 + 사전검사 + 무선할당 + 사전 동질성 확보 → 사후 t-test", () => {
    const r = recommendStatMethods({
      groupCount: "2",
      hasPretest: true,
      randomAssignment: true,
      pretestEquivalence: "equivalent",
    });
    expect(r.recommended).toHaveLength(1);
    expect(r.recommended[0].name).toBe("t-test (독립/대응표본)");
    // 반복측정·혼합 ANOVA 대안 안내
    expect(r.cautions.some((c) => c.includes("혼합 ANOVA"))).toBe(true);
  });

  it("2집단 + 사전검사 + 사전 차이/불확실(준실험) → ANCOVA + 사전 통제 근거", () => {
    const r = recommendStatMethods({
      groupCount: "2",
      hasPretest: true,
      randomAssignment: false,
      pretestEquivalence: "different",
    });
    expect(r.recommended[0].name).toBe("ANCOVA (공분산분석)");
    expect(r.recommended[0].rationale).toContain("공변량");
    expect(r.cautions.some((c) => c.includes("사전 차이를 통계적으로 통제"))).toBe(true);
  });

  it("동질성 불확실(unknown 기본값)도 ANCOVA로 유도한다", () => {
    const r = recommendStatMethods({
      groupCount: "2",
      hasPretest: true,
      randomAssignment: true, // 무선할당했더라도 동질성 미확인이면 ANCOVA 권장
    });
    expect(r.recommended[0].name).toBe("ANCOVA (공분산분석)");
  });

  it("단일집단 사전-사후 → 대응표본 t-test + 내적타당도 한계", () => {
    const r = recommendStatMethods({ groupCount: "1", hasPretest: true });
    expect(r.recommended[0].name).toBe("t-test (독립/대응표본)");
    expect(r.cautions.some((c) => c.includes("내적타당도"))).toBe(true);
  });

  it("3집단 이상 + 사전검사 없음 → ANOVA + 사후검정 안내", () => {
    const r = recommendStatMethods({
      groupCount: "3plus",
      hasPretest: false,
      randomAssignment: true,
    });
    expect(r.recommended[0].name).toBe("ANOVA (일원분산분석)");
    expect(r.cautions.some((c) => c.includes("사후검정"))).toBe(true);
  });

  it("사후만 + 무선할당 없음 → 사전검사 추가·ANCOVA 권고", () => {
    const r = recommendStatMethods({
      groupCount: "2",
      hasPretest: false,
      randomAssignment: false,
    });
    expect(r.recommended[0].name).toBe("t-test (독립/대응표본)");
    expect(r.cautions.some((c) => c.includes("무선할당"))).toBe(true);
  });

  it("groupCount 미입력(집단 비교 아님) → 빈 결과", () => {
    expect(recommendStatMethods({})).toEqual({ recommended: [], cautions: [] });
  });

  it("buildDesignConditionSummary — 비동등 집단은 ANCOVA 문장을 만든다", () => {
    const s = buildDesignConditionSummary({
      groupCount: "2",
      hasPretest: true,
      randomAssignment: false,
      pretestEquivalence: "different",
    });
    expect(s).toContain("공변량");
    expect(s).toContain("ANCOVA");
  });
});
