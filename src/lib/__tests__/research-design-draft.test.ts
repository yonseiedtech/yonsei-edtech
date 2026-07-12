/**
 * research-design-draft.ts 단위 테스트 — 연구방법 초안 조립 순수 함수.
 *
 * 빈 설계·양적(대상+도구+분석)·효과분석(프로그램 개발 섹션)·질적(질적 도구) 케이스를
 * 검증한다. 아웃라인 골격(1. 연구 대상 / 2. 연구 도구 / 3. 연구 절차 / 4. 자료 수집·분석)은
 * 항상 유지된다.
 */

import { describe, expect, it } from "vitest";
import { buildResearchMethodDraft } from "@/lib/research-design-draft";
import type { ResearchDesign } from "@/types/research-design";
import { EMPTY_PARTICIPANTS } from "@/types/research-design";

function makeDesign(overrides: Partial<ResearchDesign> = {}): ResearchDesign {
  return {
    id: "d1",
    userId: "u1",
    approach: "",
    participants: { ...EMPTY_PARTICIPANTS },
    procedureSteps: [],
    instruments: [],
    dataCollection: "",
    dataAnalysis: "",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildResearchMethodDraft", () => {
  it("빈 설계도 4개 아웃라인 골격을 유지한다", () => {
    const md = buildResearchMethodDraft(makeDesign());
    expect(md).toContain("## III. 연구방법");
    expect(md).toContain("### 1. 연구 대상");
    expect(md).toContain("### 2. 연구 도구");
    expect(md).toContain("### 3. 연구 절차");
    expect(md).toContain("### 4. 자료 수집·분석");
    // 비어 있는 섹션은 작성 전 플레이스홀더로 표시
    expect(md).toContain("_(작성 전)_");
  });

  it("null 입력도 골격을 반환한다", () => {
    const md = buildResearchMethodDraft(null);
    expect(md).toContain("## III. 연구방법");
    expect(md).toContain("### 4. 자료 수집·분석");
  });

  it("양적 설계 — 대상·도구·절차·분석을 조립한다", () => {
    const md = buildResearchMethodDraft(
      makeDesign({
        approach: "quantitative",
        methodName: "준실험연구",
        participants: {
          population: "서울 중학교 2학년",
          sampleSize: "120명",
          samplingMethod: "편의표집",
          sizeRationale: "검정력 .80, 중간 효과크기",
          protection: "학부모 동의·익명화",
        },
        procedureSteps: [
          { step: "사전검사", detail: "동질성 확인" },
          { step: "처치", detail: "8주 플립러닝" },
        ],
        instruments: [
          { id: "i1", measurementId: "m1", name: "자기주도성 척도", plan: "20문항·α=.88" },
        ],
        dataCollection: "사전-사후 검사",
        dataAnalysis: "ANCOVA로 처치효과 검증",
      }),
    );
    expect(md).toContain("접근: 양적 연구 · 준실험연구");
    expect(md).toContain("- 모집단: 서울 중학교 2학년");
    expect(md).toContain("- 표본 크기: 120명");
    expect(md).toContain("- 자기주도성 척도: 20문항·α=.88");
    expect(md).toContain("1. 사전검사 — 동질성 확인");
    expect(md).toContain("2. 처치 — 8주 플립러닝");
    expect(md).toContain("- 자료 분석: ANCOVA로 처치효과 검증");
    // 양적 설계이므로 작성 전 플레이스홀더가 없어야 한다
    expect(md).not.toContain("_(작성 전)_");
  });

  it("효과분석 설계 — 프로그램 개발 섹션(ADDIE)을 포함한다", () => {
    const md = buildResearchMethodDraft(
      makeDesign({
        approach: "mixed",
        programDesign: {
          enabled: true,
          overview: "AI 튜터 활용 협력학습 프로그램",
          sessions: "주 1회 8회기",
          addieChecked: ["analysis", "design", "evaluation"],
        },
        procedureSteps: [{ step: "요구분석", detail: "" }],
      }),
    );
    expect(md).toContain("#### 프로그램 개발 설계");
    expect(md).toContain("- 프로그램 개요: AI 튜터 활용 협력학습 프로그램");
    expect(md).toContain("- 회기 구성: 주 1회 8회기");
    expect(md).toContain("- ADDIE 단계: 분석 (Analysis), 설계 (Design), 평가 (Evaluation)");
  });

  it("선택한 통계방법을 자료 수집·분석 절에 반영한다", () => {
    const md = buildResearchMethodDraft(
      makeDesign({
        approach: "quantitative",
        dataAnalysis: "가설별 통계 검증",
        selectedStatMethods: ["ANCOVA (공분산분석)", "다중회귀분석"],
      }),
    );
    expect(md).toContain("- 통계 분석 방법: ANCOVA (공분산분석), 다중회귀분석");
  });

  it("질적 설계 — 질적 도구(면담 프로토콜)를 반영한다", () => {
    const md = buildResearchMethodDraft(
      makeDesign({
        approach: "qualitative",
        qualInstruments: "반구조화 면담 프로토콜 12문항, 델파이 패널 8인",
        instruments: [],
      }),
    );
    expect(md).toContain("- 질적 도구: 반구조화 면담 프로토콜 12문항, 델파이 패널 8인");
  });
});
